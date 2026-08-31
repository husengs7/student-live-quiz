import { Shell } from "../components";

export function HomePage() {
  return (
    <Shell>
      <section className="hero">
        <p className="eyebrow">STUDENT EVENT</p>
        <h1>知識とひらめきで、<br />一番を目指そう。</h1>
        <p>司会者の案内に合わせて、ライブクイズに参加してください。</p>
        <a className="button button--primary button--large" href="/quiz">クイズに参加する</a>
      </section>
    </Shell>
  );
}
