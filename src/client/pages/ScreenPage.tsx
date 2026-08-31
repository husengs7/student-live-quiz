import { useMemo } from "react";
import { Metric, PhaseLabel, QuestionCard, Ranking, Shell } from "../components";
import { useQuizSocket } from "../useQuizSocket";

export function ScreenPage() {
  const query = useMemo(() => new URLSearchParams({ role: "screen" }), []);
  const { snapshot } = useQuizSocket(query);
  return <Shell wide>{!snapshot || snapshot.phase === "waiting" ? <section className="screen-wait"><p className="eyebrow">FINDY STUDENT EVENT</p><h1>LIVE QUIZ</h1><p>スマートフォンからQRコードを読み取って参加してください</p>{snapshot && <strong>{snapshot.participantCount}<small>人参加中</small></strong>}</section> : snapshot.phase === "finished" ? <section className="screen-result"><p className="eyebrow">FINAL RANKING</p><h1>結果発表</h1><Ranking entries={snapshot.ranking} limit={10} /></section> : <><div className="toolbar"><PhaseLabel phase={snapshot.phase} /><div className="metrics metrics--inline"><Metric label="参加者" value={snapshot.participantCount} /><Metric label="回答" value={snapshot.answerCount} /></div></div>{snapshot.question && <QuestionCard snapshot={snapshot} />}{snapshot.phase === "question_closed" && <p className="screen-message">回答を締め切りました</p>}</>}</Shell>;
}
