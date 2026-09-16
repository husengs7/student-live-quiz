import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ConnectionBadge, Metric, PhaseLabel, QuestionCard, Ranking, Shell } from "../components";
import { useQuizSocket } from "../useQuizSocket";

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    document.documentElement.classList.add("admin-mode");
    return () => document.documentElement.classList.remove("admin-mode");
  }, []);
  useEffect(() => {
    void fetch("/api/admin/session")
      .then((response) => response.json() as Promise<{ authenticated: boolean }>)
      .then((value) => setAuthenticated(value.authenticated));
  }, []);
  if (authenticated === null) return <Shell><p>認証状態を確認しています…</p></Shell>;
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;
  return <Dashboard onLogout={() => setAuthenticated(false)} />;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error ?? "ログインできませんでした"); return; }
    onLogin();
  }
  return <Shell><section className="panel join-panel"><p className="eyebrow">ADMIN</p><h1>司会者ログイン</h1><form onSubmit={submit}><label>パスワード<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <div className="alert">{error}</div>}<button className="button button--primary">ログイン</button></form></section></Shell>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const query = useMemo(() => new URLSearchParams({ role: "admin" }), []);
  const socket = useQuizSocket(query);
  const snapshot = socket.snapshot;
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); onLogout(); }
  async function resetQuiz() {
    setResetting(true);
    socket.setMessage(null);
    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        socket.setMessage(result.error ?? "リセットできませんでした");
        return;
      }
      setResetPassword("");
    } finally {
      setResetting(false);
    }
  }
  return (
    <Shell wide>
      <div className="toolbar"><div><h1 className="admin-title">Quiz Control</h1>{snapshot && <PhaseLabel phase={snapshot.phase} />}</div><div className="toolbar__actions"><ConnectionBadge state={socket.connectionState} /><a className="button button--ghost" href="/screen" target="_blank">投影画面</a><button className="button button--ghost" onClick={logout}>ログアウト</button></div></div>
      {socket.message && <div className="alert">{socket.message}</div>}
      {snapshot && <>
        <div className="admin-grid">
          <div><AdminControls snapshot={snapshot} send={socket.send} />{snapshot.question && <QuestionCard snapshot={snapshot} />}</div>
          <div>
            <section className="panel status-panel">
              <h2>進行状況</h2>
              <div className="metrics status-metrics"><Metric label="参加者" value={`${snapshot.participantCount}人`} /><Metric label="回答" value={`${snapshot.answerCount}人`} /><Metric label="問題" value={`${Math.max(0, snapshot.questionNumber)} / ${snapshot.totalQuestions}`} /></div>
            </section>
            <section className="panel"><div className="section-title"><h2>ランキング</h2><a href="/api/admin/export" className="button button--ghost">CSV</a></div><Ranking entries={snapshot.ranking} limit={20} /></section>
          </div>
        </div>
        <details className="danger-zone"><summary>データのリセット</summary><p>参加者と回答をすべて削除します。確認のためAdminパスワードを再入力してください。</p><div className="inline"><input type="password" autoComplete="current-password" aria-label="リセット確認用Adminパスワード" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Adminパスワード" /><button className="button button--danger" disabled={!resetPassword || resetting} onClick={() => void resetQuiz()}>{resetting ? "リセット中…" : "リセット"}</button></div></details>
      </>}
    </Shell>
  );
}

function AdminControls({ snapshot, send }: { snapshot: NonNullable<ReturnType<typeof useQuizSocket>["snapshot"]>; send: ReturnType<typeof useQuizSocket>["send"] }) {
  const action = (value: "start" | "close" | "reveal" | "next" | "finish") => send({ type: "admin_action", action: value });
  return <section className="panel control-panel"><p className="eyebrow">CONTROLS</p><h2>進行操作</h2><div className="control-buttons">{snapshot.phase === "waiting" && <button className="button button--primary" onClick={() => action("start")}>第1問を開始</button>}{snapshot.phase === "question_open" && <button className="button button--warning" onClick={() => action("close")}>緊急締切</button>}{snapshot.phase === "question_closed" && <button className="button button--primary" onClick={() => action("reveal")}>正解を発表</button>}{snapshot.phase === "answer_revealed" && snapshot.questionNumber < snapshot.totalQuestions && <button className="button button--primary" onClick={() => action("next")}>次の問題へ</button>}{snapshot.phase === "answer_revealed" && <button className="button button--ghost" onClick={() => action("finish")}>クイズを終了</button>}</div></section>;
}
