import { useEffect } from "react";
import type { QuizSnapshot } from "../../shared/protocol";
import { QuestionCard, Shell } from "../components";

const step = Math.min(3, Math.max(1, Number(new URLSearchParams(window.location.search).get("step")) || 1));

export function TutorialDemoPage() {
  useEffect(() => {
    document.documentElement.classList.add("participant-mode", "tutorial-demo-mode");
    return () => document.documentElement.classList.remove("participant-mode", "tutorial-demo-mode");
  }, []);

  const snapshot: QuizSnapshot = {
    type: "snapshot",
    phase: "question_open",
    questionNumber: 1,
    totalQuestions: 10,
    question: {
      id: 0,
      text: "HTTPステータスコード『404』の意味はどれ？",
      choices: ["Not Found", "Forbidden", "Bad Request", "I'm a teapot"],
      timeLimitSeconds: 30,
    },
    closesAt: Date.now() + (step === 3 ? 24_000 : 30_000),
    participantCount: 100,
    answerCount: step === 3 ? 1 : 0,
    answerDistribution: null,
    correctChoice: null,
    tutorialSlideIndex: null,
    ranking: [],
    me: { participantId: "demo", selectedChoice: step === 3 ? 0 : null, score: 0, rank: null },
  };

  return (
    <Shell>
      <div className="toolbar"><span>デモ参加者 <small>#0001</small></span></div>
      <QuestionCard snapshot={snapshot} draftChoice={step === 2 ? 0 : null} interactive={step < 3} />
      {step < 3 && <div className={`answer-submit ${step === 2 ? "tutorial-demo__focus" : ""}`}><p>選択中の回答は、時間切れになると自動で送信されます。</p><button className="button button--primary button--large" disabled={step === 1}>この回答で送信</button></div>}
      {step === 3 && <div className="success tutorial-demo__focus">回答を受け付けました</div>}
    </Shell>
  );
}
