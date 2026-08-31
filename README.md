# 学生向けライブクイズアプリ

## 概要

学生向けイベント内で一度だけ開催する、約100人規模のライブクイズ大会用Webアプリケーション。

司会者がAdmin画面から問題を1問ずつ進行し、参加者はスマートフォンからリアルタイムで回答する。ログイン機能は設けず、ニックネームとサーバー発行の参加者IDで参加者を識別する。

汎用的なクイズサービスではなく、1つのイベント・1つのクイズ大会に特化したシンプルなシステムとして実装する。

## 現在の実装状況

ローカルで動作するMVPを実装済み。

詳細な検証結果、未完了事項、今後の優先手順は [STATUS.md](STATUS.md) を参照する。

- Reactによる参加者・Admin・投影画面
- HonoによるWorker API
- 1個のSQLite-backed Durable Object
- Hibernation WebSocket APIによるリアルタイム同期
- サーバー側の採点、自動締め切り、二重回答防止
- 参加者トークンによる再接続
- Adminパスワード認証と署名付きCookie
- ランキングとCSV出力
- Adminパスワード再入力によるデータリセット
- Vitest単体・Workers統合テスト
- Playwrightによるクイズ全進行E2Eテスト
- k6による100人WebSocket負荷テストシナリオ

サンプル問題は [src/worker/questions.ts](src/worker/questions.ts) に入っているため、本番前に実際の問題へ差し替える。

## ローカル起動

必要環境：Node.js 20以降、npm。

```bash
npm install
cp .dev.vars.example .dev.vars
```

`.dev.vars` の `ADMIN_PASSWORD` と `ADMIN_SESSION_SECRET` を変更する。セッションSecretには32文字以上のランダムな文字列を使用する。

```bash
npm run dev
```

起動後のURL：

- 参加者：`http://localhost:5173/quiz`
- Admin：`http://localhost:5173/admin`
- 投影画面：`http://localhost:5173/screen`

## 開発時の確認コマンド

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run check:worker
```

`check:worker` は `wrangler deploy --dry-run` を使う。成果物をローカル生成するだけで、Cloudflareへデプロイしない。

k6がインストールされている環境では、ローカルサーバーとAdmin画面を起動して問題を進行しながら次を実行する。

```bash
k6 run -e BASE_URL=http://127.0.0.1:5173 -e VUS=100 load/k6-quiz.js
```

## 目的

- 約100人が同時に参加できる
- 司会者が問題の公開、締め切り、正解発表を操作できる
- 参加者へ問題や結果をリアルタイム配信できる
- 回答を正確に保存し、最終ランキングを確認できる
- 会場のスクリーンに問題やランキングを表示できる
- 本番前に100人以上を想定した負荷試験を実行できる

## 対象範囲

### 実装するもの

- 参加者画面
- Admin画面
- 会場スクリーン用画面
- ニックネームによる参加
- 問題のライブ進行
- 回答受付、締め切り、採点
- 正解発表
- リアルタイムランキング
- 切断後の再接続と状態復元
- 結果のCSV出力
- テストデータのリセット
- 100人規模の負荷試験

### 実装しないもの

- 参加者のユーザー登録・ログイン
- 複数イベント対応
- イベント作成画面
- 問題編集画面
- 過去大会の管理
- 汎用的な権限管理
- 高度な分析機能

## 技術構成

| 領域 | 技術 |
| --- | --- |
| フロントエンド | React + Vite |
| APIルーティング | Hono |
| ホスティング・API | Cloudflare Workers + Static Assets |
| リアルタイム通信 | WebSocket |
| 状態管理・永続化 | SQLite-backed Durable Object |
| 単体・結合テスト | Vitest + Cloudflare Workersテスト環境 |
| E2Eテスト | Playwright |
| 負荷テスト | k6 |

D1、KV、R2、Queues、Agents SDKは初期構成では使用しない。

## システム構成

```text
参加者画面 /quiz ───┐
Admin画面  /admin ───┼─ WebSocket ─→ Durable Object
投影画面   /screen ──┘                main-quiz-room
                                        ├─ 現在の問題と進行状態
                                        ├─ 参加者
                                        ├─ 回答・得点
                                        └─ ランキング
```

Durable Objectは `main-quiz-room` という固定名の1インスタンスだけを使用する。全参加者とAdminの操作を同じDurable Objectで処理し、回答受付や状態遷移の整合性を保つ。

WebSocketにはDurable ObjectsのHibernation APIを使用し、切断時には再接続できるようにする。

## 画面

### 参加者画面 `/quiz`

1. ニックネームを入力して参加
2. クイズ開始まで待機
3. 公開された問題と選択肢を表示
4. 選択肢を1つ回答
5. 回答済み状態を表示
6. 締め切り後に正解を表示
7. 最終結果と自分の順位を表示

### Admin画面 `/admin`

- Admin認証
- 現在の参加人数を確認
- クイズ開始
- 問題を公開
- 回答数をリアルタイム確認
- 回答を締め切る
- 正解と回答分布を公開
- 次の問題へ進む
- 最終ランキングを表示
- 結果をCSVでダウンロード
- 参加者と回答データをリセット

### 投影画面 `/screen`

- 開始前の案内
- 問題と選択肢
- 残り時間
- 現在の回答人数
- 正解と回答分布
- 上位ランキング

投影画面にはAdmin操作や未公開の正解情報を表示しない。

## クイズの状態遷移

```text
WAITING
  ↓ Adminが開始・問題を公開
QUESTION_OPEN
  ↓ 制限時間終了、またはAdminが締め切り
QUESTION_CLOSED
  ↓ Adminが正解を公開
ANSWER_REVEALED
  ↓ Adminが次の問題を公開
QUESTION_OPEN
  ↓ 全問題終了
FINISHED
```

サーバーは現在の状態に応じて操作を制限する。

- 回答は `QUESTION_OPEN` の間だけ受け付ける
- 参加者1人につき、1問に1回だけ回答できる
- 問題公開前および締め切り後の回答を拒否する
- 状態遷移はAdminだけが実行できる
- 回答時刻と締め切りはサーバー時刻を基準に判定する

## 問題データ

問題は管理画面から編集せず、リポジトリ内のJSONまたはTypeScriptで管理する。

```ts
export const questions = [
  {
    id: 1,
    text: "問題文",
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    correctChoice: 1,
    timeLimitSeconds: 15,
  },
];
```

正解データを参加者向けのJavaScriptへ含めない。正解はWorker側だけで参照し、公開時に初めて参加者へ送信する。

## 参加者の識別

1. 参加者がニックネームを送信する
2. サーバーが暗号学的に安全なランダム参加者IDとトークンを発行する
3. ブラウザはトークンをCookieに保存する
4. 再接続時にトークンを検証し、同じ参加者として復元する

ニックネームは重複を許可し、Admin画面では参加番号も表示する。

```text
ゆうき #047
ゆうき #012
```

## データ設計

Durable Object内のSQLiteに参加者と回答を保存する。

```sql
CREATE TABLE participants (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  joined_at INTEGER NOT NULL
);

CREATE TABLE answers (
  participant_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  selected_choice INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  is_correct INTEGER NOT NULL,
  score INTEGER NOT NULL,
  PRIMARY KEY (participant_id, question_id)
);
```

現在の進行状態として、最低限次を永続化する。

```ts
type QuizPhase =
  | "waiting"
  | "question_open"
  | "question_closed"
  | "answer_revealed"
  | "finished";

type QuizState = {
  phase: QuizPhase;
  currentQuestionIndex: number;
  openedAt: number | null;
  closesAt: number | null;
};
```

重要な状態はメモリだけに保持せず、Durable ObjectのSQLiteへ保存する。

## 採点とランキング

基本ルールは次のとおりとする。

- 正解数または固定点を最優先する
- 同点の場合のみ、合計回答時間が短い参加者を上位にする
- 回答時間は問題公開からサーバーが回答を受信するまでの時間とする

例：正解1問につき1,000点。同点の場合は合計回答時間の短い順。

通信環境や端末性能による差を抑えるため、回答速度に応じて毎問の得点を大きく変える方式は採用しない。

## Admin認証

参加者にログインは要求しないが、Adminの操作とAPIは必ず保護する。

初期案：

- AdminパスワードをCloudflare Workers Secretに保存
- 認証成功後、署名付きのHttpOnly・Secure Cookieを発行
- `/api/admin/*` とAdmin用WebSocket接続の両方で権限を検証
- URLを知っているだけではAdmin操作できないようにする

社内のCloudflare Access環境を容易に利用できる場合は、Google WorkspaceアカウントによるAccess認証へ置き換えてもよい。

## セキュリティ・整合性

- 回答の締め切りをクライアント側だけで判定しない
- クライアントが送信した得点や正誤情報を信用しない
- SQLiteの主キー制約でも二重回答を防止する
- Admin APIをサーバー側で認可する
- ニックネームの長さ、文字種、HTML表示を検証する
- トークン生成には `crypto.randomUUID()` または `crypto.getRandomValues()` を使用する
- 秘密情報をソースコードやWrangler設定へ直接記載しない
- 回答受付後に保存を完了してから成功を返す
- WebSocket切断後にHTTPまたはWebSocketで現在状態を再取得できるようにする

## テスト方針

### Vitest

- 採点
- 状態遷移
- 二重回答の拒否
- 問題公開前・締め切り後の回答拒否
- ランキングの並び順
- SQLiteへの保存
- Durable Object再起動後の状態復元

### Playwright

- ニックネーム入力から参加まで
- Adminによる問題公開
- 参加者による回答
- 締め切りと正解発表
- 次の問題への遷移
- 最終ランキングの表示
- 切断・再接続後の復帰

### k6負荷試験

実際の大会進行を模したWebSocketシナリオを作成する。

1. 100人が一定時間内に参加する
2. 100本のWebSocket接続を維持する
3. Adminが問題を公開する
4. 全参加者が問題通知を受信する
5. 各参加者が1〜3秒のランダムな待ち時間後に回答する
6. 一部の参加者は意図的に二重回答する
7. Adminが回答を締め切る
8. 正解とランキングを配信する
9. 10〜20問分を繰り返す
10. 一部の参加者を切断・再接続させる

負荷レベル：

| テスト | 人数 | 目的 |
| --- | ---: | --- |
| Smoke | 1〜3人 | スクリプトと基本動作の確認 |
| Normal | 100人 | 本番相当の確認 |
| Spike | 100人 | ほぼ同時の一斉回答を確認 |
| Stress | 200〜300人 | 本番人数を超える余裕を確認 |

合格基準の初期案：

- WebSocket接続成功率100%
- 問題通知の99%が1秒以内に到着
- 回答受付のシステムエラー率1%未満
- 回答処理時間のp95が500ms未満
- 二重回答が保存されない
- 締め切り後の回答が保存されない
- 最終ランキングが保存済み回答と一致する

負荷試験は本番データを投入する前に実施する。負荷試験後にデータを削除できるリセット機能を用意し、誤操作防止の確認を必須にする。

## 実装順序

1. React、Vite、Hono、Workersのプロジェクトを構築
2. 問題データをコードで用意
3. Durable ObjectとSQLiteスキーマを実装
4. 状態遷移と回答受付を実装
5. Admin画面から問題を進められるようにする
6. 参加者画面とWebSocket通信を実装
7. 投影画面を実装
8. 採点、ランキング、CSV出力を実装
9. 再接続と状態復元を実装
10. Admin認証を実装
11. VitestとPlaywrightを追加
12. k6で100人・200人の負荷試験を実行
13. 会場環境でリハーサル

## 当日の運用確認

- 会場Wi-Fiで参加者用URLへアクセスできる
- QRコードから参加できる
- Admin用端末と投影用端末を分ける
- 問題、選択肢、正解を事前確認する
- 本番前にテストデータをリセットする
- CSVをダウンロードできる
- ブラウザ更新後も参加者が復帰できる
- Wi-Fi切断後も再接続できる
- Admin操作を誤った場合の進行方法を決めておく
- 必要に応じて紙やスライドによる代替手段を用意する

## 将来対応しない前提

このプロジェクトは単一イベント専用であり、再利用可能なSaaSや複数大会対応システムへの発展を初期設計の目的としない。追加機能よりも、本番当日の安定性、操作の分かりやすさ、データの正確性を優先する。
