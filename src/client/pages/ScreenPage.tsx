import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { Metric, PhaseLabel, QuestionCard, Ranking, Shell } from "../components";
import { useQuizSocket } from "../useQuizSocket";

function JoinQrCode() {
  const participantUrl = useMemo(() => new URL("/quiz", window.location.origin).toString(), []);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(participantUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
      color: { dark: "#101322", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrCodeUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [participantUrl]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(participantUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="join-qr">
      <div className="join-qr__image">
        {qrCodeUrl ? <img src={qrCodeUrl} alt={`クイズ参加用QRコード: ${participantUrl}`} /> : <span>QRコードを生成中...</span>}
      </div>
      <div className="join-qr__details">
        <p>スマートフォンで読み取って参加</p>
        <a href={participantUrl}>{participantUrl}</a>
        <button className="button button--ghost" type="button" onClick={copyUrl}>
          {copied ? "コピーしました" : "参加URLをコピー"}
        </button>
      </div>
    </div>
  );
}

export function ScreenPage() {
  const query = useMemo(() => new URLSearchParams({ role: "screen" }), []);
  const { snapshot } = useQuizSocket(query);
  useEffect(() => {
    document.documentElement.classList.add("screen-mode");
    return () => document.documentElement.classList.remove("screen-mode");
  }, []);
  const tutorialSlide = snapshot?.tutorialSlideIndex ?? null;
  return <Shell wide>{tutorialSlide !== null ? <TutorialSlides slideIndex={tutorialSlide} /> : !snapshot || snapshot.phase === "waiting" ? <section className="screen-wait"><p className="eyebrow">FINDY STUDENT EVENT</p><h1>LIVE QUIZ</h1><JoinQrCode />{snapshot && <strong>{snapshot.participantCount}<small>人参加中</small></strong>}</section> : snapshot.phase === "finished" ? <section className="screen-result"><p className="eyebrow">FINAL RANKING</p><h1>結果発表</h1><Ranking entries={snapshot.ranking} limit={10} /></section> : <><div className="toolbar"><PhaseLabel phase={snapshot.phase} /><div className="metrics metrics--inline"><Metric label="参加者" value={snapshot.participantCount} /><Metric label="回答" value={snapshot.answerCount} /></div></div>{snapshot.question && <QuestionCard snapshot={snapshot} />}{snapshot.phase === "question_closed" && <p className="screen-message">回答を締め切りました</p>}</>}</Shell>;
}

const tutorialSlides = [
  { number: "01", title: "回答を選ぼう", body: "スマートフォンで4つの選択肢から、正解だと思うものをタップします。", note: "選んだだけでは、まだ送信されません" },
  { number: "02", title: "回答を送信しよう", body: "選択肢を確認してから「この回答で送信」ボタンを押します。", note: "送信した回答は変更できません" },
  { number: "03", title: "早い正解ほど高得点！", body: "各問題の制限時間は30秒。残り時間が多いほど得点が高くなります。", note: "選択中なら時間切れ直前に自動送信されます" },
];

function TutorialSlides({ slideIndex }: { slideIndex: number }) {
  const slide = tutorialSlides[slideIndex];
  return (
    <section className="tutorial-slide" key={slideIndex}>
      <p className="eyebrow">HOW TO PLAY</p>
      <div className="tutorial-slide__number">{slide.number}</div>
      <h1>{slide.title}</h1>
      <p className="tutorial-slide__body">{slide.body}</p>
      <p className="tutorial-slide__note">{slide.note}</p>
      <div className="tutorial-slide__dots" aria-label={`${tutorialSlides.length}枚中${slideIndex + 1}枚目`}>
        {tutorialSlides.map((_, index) => <span className={index === slideIndex ? "is-active" : ""} key={index} />)}
      </div>
    </section>
  );
}
