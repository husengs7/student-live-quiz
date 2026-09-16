import { useEffect, useState, type ReactNode } from "react";
import type { QuizPhase, QuizSnapshot, RankingEntry } from "../shared/protocol";

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className={wide ? "shell shell--wide" : "shell"}>
      <header className="brand" aria-label="Findy Student Quiz">
        <img
          className="brand__logo"
          src="/question-images/findy-student_logo_RGB_findy-student_logo_RGB-color-yoko.png"
          alt="Findy Student"
        />
        <small>LIVE</small>
      </header>
      {children}
    </main>
  );
}

export function ConnectionBadge({ state }: { state: "connecting" | "connected" | "disconnected" }) {
  const label = state === "connected" ? "接続中" : state === "connecting" ? "接続しています" : "再接続中";
  return <span className={`connection connection--${state}`}>{label}</span>;
}

export function PhaseLabel({ phase }: { phase: QuizPhase }) {
  const labels: Record<QuizPhase, string> = {
    waiting: "開始前",
    question_open: "回答受付中",
    question_closed: "回答締切",
    answer_revealed: "正解発表",
    finished: "終了",
  };
  return <span className={`phase phase--${phase}`}>{labels[phase]}</span>;
}

export function Countdown({ closesAt, active }: { closesAt: number | null; active: boolean }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => setRemaining(active && closesAt ? Math.max(0, closesAt - Date.now()) : 0);
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [active, closesAt]);
  return <strong className="countdown">{active ? `${Math.ceil(remaining / 1_000)}秒` : "—"}</strong>;
}

export function QuestionCard({
  snapshot,
  onSelect,
  draftChoice,
  interactive,
}: {
  snapshot: QuizSnapshot;
  onSelect?: (choice: number) => void;
  draftChoice?: number | null;
  interactive?: boolean;
}) {
  const question = snapshot.question;
  if (!question) return null;
  return (
    <section className="question-card">
      <div className="question-card__meta">
        <span>QUESTION {snapshot.questionNumber} / {snapshot.totalQuestions}</span>
        <Countdown closesAt={snapshot.closesAt} active={snapshot.phase === "question_open"} />
      </div>
      <h1>{question.text}</h1>
      {question.imageUrl && (
        <figure className="question-card__image">
          <img src={question.imageUrl} alt={question.imageAlt ?? "問題の参考画像"} />
        </figure>
      )}
      <div className="choices">
        {question.choices.map((choice, index) => {
          const submittedChoice = snapshot.me?.selectedChoice;
          const selected = submittedChoice === index || (submittedChoice == null && draftChoice === index);
          const correct = snapshot.correctChoice === index;
          const wrongSelected = selected && snapshot.correctChoice !== null && !correct;
          return (
            <button
              className={`choice ${selected ? "choice--selected" : ""} ${correct ? "choice--correct" : ""} ${wrongSelected ? "choice--wrong" : ""}`}
              disabled={!interactive || snapshot.phase !== "question_open" || snapshot.me?.selectedChoice !== null}
              key={choice}
              onClick={() => onSelect?.(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              {choice}
              {snapshot.answerDistribution && <em>{snapshot.answerDistribution[index]}人</em>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Ranking({ entries, highlightId, limit }: { entries: RankingEntry[]; highlightId?: string; limit?: number }) {
  const visible = typeof limit === "number" ? entries.slice(0, limit) : entries;
  return (
    <div className="ranking">
      {visible.length === 0 && <p className="muted">ランキングはまだありません。</p>}
      {visible.map((entry) => (
        <div className={`ranking__row ${entry.participantId === highlightId ? "ranking__row--me" : ""}`} key={entry.participantId}>
          <strong className="ranking__rank">{entry.rank}</strong>
          <span className="ranking__name">{entry.nickname} <small>#{entry.displayId}</small></span>
          <span><b>{entry.score.toLocaleString()}</b> pt</span>
        </div>
      ))}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
