import { useMemo, useState, type FormEvent } from "react";
import type { QuizSnapshot } from "../../shared/protocol";
import { ConnectionBadge, PhaseLabel, QuestionCard, Ranking, Shell } from "../components";
import { useQuizSocket } from "../useQuizSocket";

type ParticipantSession = { participantId: string; token: string; displayId: string; nickname: string };
const STORAGE_KEY = "student-quiz-participant";

function loadSession(): ParticipantSession | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as ParticipantSession | null;
  } catch {
    return null;
  }
}

export function ParticipantPage() {
  const [session, setSession] = useState<ParticipantSession | null>(loadSession);
  const query = useMemo(() => session
    ? new URLSearchParams({ role: "participant", participantId: session.participantId, token: session.token })
    : null, [session]);
  const socket = useQuizSocket(query);

  async function resetForDevelopment() {
    const response = await fetch("/api/dev/reset", { method: "POST" });
    if (!response.ok) {
      socket.setMessage("リセットできませんでした。ローカル環境で実行してください。");
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  if (!session) return <JoinForm onJoined={setSession} />;
  const snapshot = socket.snapshot;
  return (
    <Shell>
      <div className="toolbar">
        <span>{session.nickname} <small>#{session.displayId}</small></span>
        <ConnectionBadge state={socket.connectionState} />
      </div>
      {socket.message && <div className="alert">{socket.message}</div>}
      {!snapshot && <WaitingCopy title="接続しています" body="クイズ会場へ接続しています。" />}
      {snapshot?.phase === "waiting" && <WaitingCopy title="まもなく開始します" body={`現在 ${snapshot.participantCount}人が参加しています。司会者の案内をお待ちください。`} />}
      {snapshot?.question && snapshot.phase !== "finished" && (
        <>
          <div className="toolbar"><PhaseLabel phase={snapshot.phase} /><span>{snapshot.answerCount}人回答</span></div>
          <QuestionCard snapshot={snapshot} interactive onAnswer={(choice) => socket.send({ type: "answer", choice })} />
          {snapshot.me?.selectedChoice !== null && snapshot.phase === "question_open" && <div className="success">回答を受け付けました</div>}
          {snapshot.phase === "question_closed" && <p className="center muted">正解発表をお待ちください。</p>}
        </>
      )}
      {snapshot?.phase === "finished" && (
        <section className="panel">
          <p className="eyebrow">FINAL RESULT</p>
          <h1>おつかれさまでした！</h1>
          <div className="my-result"><span>あなたの順位</span><strong>{snapshot.me?.rank ?? "—"}<small>位</small></strong><b>{snapshot.me?.score.toLocaleString()} pt</b></div>
          <Ranking entries={snapshot.ranking} highlightId={session.participantId} limit={10} />
          {import.meta.env.DEV && (
            <div className="dev-tools">
              <p>開発中のみ表示されています。参加者と回答を削除して最初からやり直します。</p>
              <button className="button button--danger" onClick={() => void resetForDevelopment()}>
                開発用：クイズをリセット
              </button>
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}

function JoinForm({ onJoined }: { onJoined: (session: ParticipantSession) => void }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname }) });
      const result = await response.json() as ParticipantSession & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "参加できませんでした");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      onJoined(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "参加できませんでした");
    } finally { setLoading(false); }
  }
  return (
    <Shell>
      <section className="panel join-panel">
        <p className="eyebrow">JOIN THE QUIZ</p><h1>クイズに参加</h1>
        <p className="muted">ランキングに表示するニックネームを入力してください。</p>
        <form onSubmit={submit}>
          <label>ニックネーム<input autoFocus maxLength={20} required value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="例：ゆうき" /></label>
          {error && <div className="alert">{error}</div>}
          <button className="button button--primary button--large" disabled={loading}>{loading ? "参加しています…" : "参加する"}</button>
        </form>
      </section>
    </Shell>
  );
}

function WaitingCopy({ title, body }: { title: string; body: string }) {
  return <section className="waiting"><div className="pulse" /><p className="eyebrow">PLEASE WAIT</p><h1>{title}</h1><p>{body}</p></section>;
}
