import { DurableObject } from "cloudflare:workers";
import type {
  ClientMessage,
  QuizPhase,
  QuizSnapshot,
  RankingEntry,
  ServerMessage,
} from "../shared/protocol";
import { questions } from "./questions";
import { rankScores, scoreAnswer, type ScoreRow } from "./scoring";

type ConnectionAttachment = {
  role: "participant" | "admin" | "screen";
  participantId?: string;
};

type StateRow = {
  phase: QuizPhase;
  current_question_index: number;
  opened_at: number | null;
  closes_at: number | null;
};

type ParticipantRow = {
  id: string;
  display_id: string;
  nickname: string;
  token_hash: string;
  joined_at: number;
};

type AnswerRow = {
  participant_id: string;
  question_id: number;
  selected_choice: number;
  received_at: number;
  response_time_ms: number;
  is_correct: number;
  score: number;
};

const ROOM_NAME = "main-quiz-room";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const nickname = value.trim().replace(/\s+/g, " ");
  if (nickname.length < 1 || nickname.length > 20) return null;
  return nickname;
}

export class QuizRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS participants (
          id TEXT PRIMARY KEY,
          display_id TEXT NOT NULL UNIQUE,
          nickname TEXT NOT NULL,
          token_hash TEXT NOT NULL,
          joined_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS answers (
          participant_id TEXT NOT NULL,
          question_id INTEGER NOT NULL,
          selected_choice INTEGER NOT NULL,
          received_at INTEGER NOT NULL,
          response_time_ms INTEGER NOT NULL,
          is_correct INTEGER NOT NULL,
          score INTEGER NOT NULL,
          PRIMARY KEY (participant_id, question_id),
          FOREIGN KEY (participant_id) REFERENCES participants(id)
        );
        CREATE TABLE IF NOT EXISTS quiz_state (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          phase TEXT NOT NULL,
          current_question_index INTEGER NOT NULL,
          opened_at INTEGER,
          closes_at INTEGER
        );
        INSERT OR IGNORE INTO quiz_state
          (singleton, phase, current_question_index, opened_at, closes_at)
          VALUES (1, 'waiting', -1, NULL, NULL);
      `);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/join") return this.join(request);
    if (request.method === "POST" && url.pathname === "/participant-session") return this.validateParticipantSession(request);
    if (request.method === "GET" && url.pathname === "/ws") return this.connectWebSocket(request);
    if (request.method === "GET" && url.pathname === "/export") {
      if (request.headers.get("X-Admin-Authorized") !== "1") return json({ error: "Unauthorized" }, 401);
      return this.exportCsv();
    }
    if (request.method === "POST" && url.pathname === "/admin-reset") {
      if (request.headers.get("X-Admin-Authorized") !== "1") return json({ error: "Unauthorized" }, 401);
      await this.reset();
      this.broadcastSnapshots();
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  }

  private async join(request: Request): Promise<Response> {
    let body: { nickname?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const nickname = normalizeNickname(body.nickname);
    if (!nickname) return json({ error: "ニックネームは1〜20文字で入力してください" }, 400);

    const participantCount = this.ctx.storage.sql
      .exec<{ count: number }>("SELECT COUNT(*) AS count FROM participants")
      .one().count;
    if (participantCount >= 300) return json({ error: "参加人数が上限に達しました" }, 409);

    const participantId = crypto.randomUUID();
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const tokenHash = await sha256(token);
    const displayId = String(participantCount + 1).padStart(3, "0");
    this.ctx.storage.sql.exec(
      "INSERT INTO participants (id, display_id, nickname, token_hash, joined_at) VALUES (?, ?, ?, ?, ?)",
      participantId,
      displayId,
      nickname,
      tokenHash,
      Date.now(),
    );
    this.broadcastSnapshots();
    return json({ participantId, token, displayId, nickname }, 201);
  }

  private async validateParticipantSession(request: Request): Promise<Response> {
    let body: { participantId?: unknown; token?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (typeof body.participantId !== "string" || typeof body.token !== "string") {
      return json({ valid: false });
    }
    const participant = this.getParticipant(body.participantId);
    const valid = Boolean(participant && (await sha256(body.token)) === participant.token_hash);
    return json({ valid });
  }

  private async connectWebSocket(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json({ error: "WebSocket upgrade required" }, 426);
    }
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    let attachment: ConnectionAttachment;

    if (role === "admin") {
      if (request.headers.get("X-Admin-Authorized") !== "1") return json({ error: "Unauthorized" }, 401);
      attachment = { role: "admin" };
    } else if (role === "screen") {
      attachment = { role: "screen" };
    } else if (role === "participant") {
      const participantId = url.searchParams.get("participantId") ?? "";
      const token = url.searchParams.get("token") ?? "";
      const participant = this.getParticipant(participantId);
      if (!participant || (await sha256(token)) !== participant.token_hash) {
        return json({ error: "参加者情報を確認できません" }, 401);
      }
      attachment = { role: "participant", participantId };
    } else {
      return json({ error: "Invalid role" }, 400);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(this.createSnapshot(attachment)));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(webSocket: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const attachment = webSocket.deserializeAttachment() as ConnectionAttachment | null;
    if (!attachment || typeof message !== "string") return;
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message) as ClientMessage;
    } catch {
      this.send(webSocket, { type: "error", message: "メッセージを読み取れませんでした" });
      return;
    }

    try {
      if (parsed.type === "answer" && attachment.role === "participant" && attachment.participantId) {
        this.acceptAnswer(attachment.participantId, parsed.choice);
      } else if (parsed.type === "admin_action" && attachment.role === "admin") {
        await this.applyAdminAction(parsed.action);
      } else {
        throw new Error("この操作は許可されていません");
      }
      this.broadcastSnapshots();
    } catch (error) {
      this.send(webSocket, {
        type: "error",
        message: error instanceof Error ? error.message : "操作に失敗しました",
      });
    }
  }

  webSocketClose(webSocket: WebSocket, code: number, reason: string): void {
    webSocket.close(code, reason);
  }

  async alarm(): Promise<void> {
    const state = this.getState();
    if (state.phase === "question_open" && state.closes_at && Date.now() >= state.closes_at) {
      this.setState("question_closed", state.current_question_index, state.opened_at, state.closes_at);
      this.broadcastSnapshots();
    }
  }

  private getState(): StateRow {
    return this.ctx.storage.sql
      .exec<StateRow>(
        "SELECT phase, current_question_index, opened_at, closes_at FROM quiz_state WHERE singleton = 1",
      )
      .one();
  }

  private setState(
    phase: QuizPhase,
    questionIndex: number,
    openedAt: number | null,
    closesAt: number | null,
  ): void {
    this.ctx.storage.sql.exec(
      "UPDATE quiz_state SET phase = ?, current_question_index = ?, opened_at = ?, closes_at = ? WHERE singleton = 1",
      phase,
      questionIndex,
      openedAt,
      closesAt,
    );
  }

  private getParticipant(id: string): ParticipantRow | null {
    return (
      this.ctx.storage.sql
        .exec<ParticipantRow>(
          "SELECT id, display_id, nickname, token_hash, joined_at FROM participants WHERE id = ?",
          id,
        )
        .toArray()[0] ?? null
    );
  }

  private acceptAnswer(participantId: string, choice: number): void {
    const state = this.getState();
    const question = questions[state.current_question_index];
    const now = Date.now();
    if (state.phase !== "question_open" || !question || !state.opened_at || !state.closes_at) {
      throw new Error("現在は回答を受け付けていません");
    }
    if (now > state.closes_at) {
      this.setState("question_closed", state.current_question_index, state.opened_at, state.closes_at);
      throw new Error("回答時間が終了しました");
    }
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.choices.length) {
      throw new Error("選択肢が正しくありません");
    }
    const isCorrect = choice === question.correctChoice;
    try {
      this.ctx.storage.sql.exec(
        `INSERT INTO answers
          (participant_id, question_id, selected_choice, received_at, response_time_ms, is_correct, score)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
        participantId,
        question.id,
        choice,
        now,
        Math.max(0, now - state.opened_at),
        isCorrect ? 1 : 0,
        scoreAnswer(isCorrect),
      );
    } catch {
      throw new Error("この問題には回答済みです");
    }
  }

  private async applyAdminAction(action: "start" | "close" | "reveal" | "next" | "finish") {
    const state = this.getState();
    if (action === "start") {
      if (state.phase !== "waiting") throw new Error("開始できる状態ではありません");
      await this.openQuestion(0);
      return;
    }
    if (action === "close") {
      if (state.phase !== "question_open") throw new Error("回答受付中ではありません");
      await this.ctx.storage.deleteAlarm();
      this.setState("question_closed", state.current_question_index, state.opened_at, state.closes_at);
      return;
    }
    if (action === "reveal") {
      if (state.phase !== "question_closed") throw new Error("正解発表できる状態ではありません");
      this.setState("answer_revealed", state.current_question_index, state.opened_at, state.closes_at);
      return;
    }
    if (action === "next") {
      if (state.phase !== "answer_revealed") throw new Error("次の問題へ進める状態ではありません");
      const next = state.current_question_index + 1;
      if (next >= questions.length) throw new Error("すべての問題が終了しています");
      await this.openQuestion(next);
      return;
    }
    if (action === "finish") {
      if (state.phase === "question_open") throw new Error("先に回答を締め切ってください");
      await this.ctx.storage.deleteAlarm();
      this.setState("finished", state.current_question_index, state.opened_at, state.closes_at);
    }
  }

  private async openQuestion(index: number): Promise<void> {
    const question = questions[index];
    if (!question) throw new Error("問題が見つかりません");
    const openedAt = Date.now();
    const closesAt = openedAt + question.timeLimitSeconds * 1_000;
    this.setState("question_open", index, openedAt, closesAt);
    await this.ctx.storage.setAlarm(closesAt);
  }

  private async reset(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    this.ctx.storage.sql.exec("DELETE FROM answers; DELETE FROM participants;");
    this.setState("waiting", -1, null, null);
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
      if (attachment?.role === "participant") {
        this.send(socket, { type: "session_reset" });
        socket.close(1000, "Quiz data was reset");
      }
    }
  }

  private getRanking(): RankingEntry[] {
    const rows = this.ctx.storage.sql
      .exec<ScoreRow>(`
        SELECT
          p.id AS participantId,
          p.display_id AS displayId,
          p.nickname AS nickname,
          COALESCE(SUM(a.is_correct), 0) AS correctCount,
          COALESCE(SUM(a.score), 0) AS score,
          COALESCE(SUM(CASE WHEN a.is_correct = 1 THEN a.response_time_ms ELSE 0 END), 0) AS totalResponseTimeMs
        FROM participants p
        LEFT JOIN answers a ON a.participant_id = p.id
        GROUP BY p.id, p.display_id, p.nickname
      `)
      .toArray();
    return rankScores(rows);
  }

  private createSnapshot(attachment: ConnectionAttachment): QuizSnapshot {
    const state = this.getState();
    const question = questions[state.current_question_index] ?? null;
    const answers = question
      ? this.ctx.storage.sql
          .exec<AnswerRow>(
            `SELECT participant_id, question_id, selected_choice, received_at,
              response_time_ms, is_correct, score FROM answers WHERE question_id = ?`,
            question.id,
          )
          .toArray()
      : [];
    const ranking = this.getRanking();
    const participantCount = this.ctx.storage.sql
      .exec<{ count: number }>("SELECT COUNT(*) AS count FROM participants")
      .one().count;
    const revealDetails = state.phase === "answer_revealed" || state.phase === "finished";
    const distribution = question
      ? question.choices.map((_, choice) => answers.filter((answer) => answer.selected_choice === choice).length)
      : null;
    const ownAnswer = attachment.participantId
      ? answers.find((answer) => answer.participant_id === attachment.participantId)
      : null;
    const ownRanking = attachment.participantId
      ? ranking.find((entry) => entry.participantId === attachment.participantId)
      : null;

    return {
      type: "snapshot",
      phase: state.phase,
      questionNumber: state.current_question_index + 1,
      totalQuestions: questions.length,
      question: question
        ? {
            id: question.id,
            text: question.text,
            choices: question.choices,
            timeLimitSeconds: question.timeLimitSeconds,
          }
        : null,
      closesAt: state.closes_at,
      participantCount,
      answerCount: answers.length,
      answerDistribution: attachment.role === "admin" || revealDetails ? distribution : null,
      correctChoice: attachment.role === "admin" || revealDetails ? question?.correctChoice ?? null : null,
      ranking: attachment.role === "admin" || state.phase === "finished" ? ranking : ranking.slice(0, 5),
      me: attachment.participantId
        ? {
            participantId: attachment.participantId,
            selectedChoice: ownAnswer?.selected_choice ?? null,
            score: ownRanking?.score ?? 0,
            rank: ownRanking?.rank ?? null,
          }
        : null,
    };
  }

  private broadcastSnapshots(): void {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      const attachment = socket.deserializeAttachment() as ConnectionAttachment | null;
      if (!attachment) continue;
      this.send(socket, this.createSnapshot(attachment));
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(JSON.stringify({ event: "websocket_send_failed", room: ROOM_NAME, error: String(error) }));
    }
  }

  private exportCsv(): Response {
    const ranking = this.getRanking();
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = [
      ["rank", "participant_id", "display_id", "nickname", "correct_count", "score", "total_response_time_ms"],
      ...ranking.map((entry) => [
        entry.rank,
        entry.participantId,
        entry.displayId,
        entry.nickname,
        entry.correctCount,
        entry.score,
        entry.totalResponseTimeMs,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(escape).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="quiz-results.csv"',
        "Cache-Control": "no-store",
      },
    });
  }
}
