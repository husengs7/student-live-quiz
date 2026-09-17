# 現在のアーキテクチャ

## 全体構成図

```mermaid
flowchart LR
  subgraph Clients[利用端末]
    P[参加者スマートフォン<br/>/quiz]
    A[司会者端末<br/>/admin]
    S[会場投影端末<br/>/screen]
  end

  subgraph CF[Cloudflare]
    W[Cloudflare Worker<br/>Hono API]
    AS[Static Assets<br/>React + Vite<br/>HTML / CSS / JavaScript / 問題画像]

    subgraph DO[Durable Object: main-quiz-room]
      Q[QuizRoom<br/>進行制御・回答受付・採点<br/>スナップショット配信]
      WS[Hibernation WebSocket<br/>接続管理・リアルタイム同期]
      SQL[(Durable Object SQLite<br/>参加者・回答・進行状態)]
      AL[Alarm<br/>30秒後の自動締切]
    end

    SEC[Cloudflare Secrets<br/>ADMIN_PASSWORD<br/>ADMIN_SESSION_SECRET]
  end

  SRC[Worker内の問題データ<br/>questions.ts<br/>問題・選択肢・正解・制限時間]

  P -->|HTTPS: 参加・セッション確認| W
  A -->|HTTPS: ログイン・CSV・リセット| W
  S -->|静的ファイル取得| AS
  P -->|静的ファイル取得| AS
  A -->|静的ファイル取得| AS

  P <-->|WSS: 回答・個人用状態| W
  A <-->|WSS: 進行操作・管理用状態| W
  S <-->|WSS: 問題・集計・ランキング| W

  W -->|同一オリジンの /api/*| Q
  W --> AS
  W -->|Admin認証| SEC
  Q <--> WS
  Q <--> SQL
  Q <--> AL
  SRC --> Q
```

## リクエストの流れ

```mermaid
sequenceDiagram
  participant Admin as 司会者 /admin
  participant Worker as Cloudflare Worker
  participant Room as QuizRoom Durable Object
  participant DB as DO SQLite
  participant User as 参加者 /quiz
  participant Screen as 投影 /screen

  User->>Worker: POST /api/join（ニックネーム）
  Worker->>Room: /joinへ転送
  Room->>DB: 参加者IDとトークンのハッシュを保存
  Room-->>User: 参加者ID・トークン・参加番号
  User->>Worker: WebSocket接続（参加者情報付き）
  Worker->>Room: /wsへ接続

  Admin->>Worker: Adminパスワードでログイン
  Worker-->>Admin: 署名付きHttpOnly Cookie
  Admin->>Worker: 認証Cookie付きWebSocket接続
  Worker->>Room: 認証済みAdminとして接続
  Screen->>Worker: 投影用WebSocket接続
  Worker->>Room: screenとして接続

  Admin->>Room: 問題開始
  Room->>DB: 進行状態と締切時刻を保存
  Room-->>User: 公開用の問題情報
  Room-->>Screen: 公開用の問題情報
  User->>Room: 選択した回答を送信
  Room->>Room: サーバー側で正誤判定・得点計算
  Room->>DB: 回答・応答時間・得点を保存
  Room-->>Admin: 回答数・分布・ランキングを更新
  Room-->>Screen: 投影用状態を更新
  Room-->>User: 個人用状態を更新
```

## コンポーネントの役割

| コンポーネント | 現在の役割 |
| --- | --- |
| Reactクライアント | `/quiz`、`/admin`、`/screen` の3画面を提供 |
| Cloudflare Worker / Hono | APIルーティング、Admin認証、Static Assets配信、Durable Objectへの中継 |
| `QuizRoom` Durable Object | 1大会の状態を1か所で直列に処理し、回答・進行の競合を防止 |
| Hibernation WebSocket | 各端末へ状態をリアルタイム配信し、切断時はクライアントが再接続 |
| Durable Object SQLite | `participants`、`answers`、`quiz_state` を永続化 |
| Durable Object Alarm | 問題開始時に締切時刻を登録し、制限時間後に自動締切 |
| `questions.ts` | 問題、選択肢、正解、制限時間をWorker側に保持 |
| Cloudflare Secrets | AdminパスワードとCookie署名鍵をGitHub外で管理 |

## セキュリティと公開範囲

- ブラウザへ送る問題データには、正解発表前の `correctChoice` を含めない。
- 正誤判定と得点計算はDurable Object内で行う。
- Admin APIとAdmin WebSocketは署名付きHttpOnly Cookieで認証する。
- 参加者トークンはブラウザのローカルストレージに保存し、サーバー側にはSHA-256ハッシュを保存する。
- 投影画面には操作権限を与えず、公開可能な状態だけを配信する。
- リセット時はSQLite内の参加者・回答を削除し、接続中の参加者へセッション削除を通知する。

## 現在使用していないサービス

D1、KV、R2、Queuesは使用していません。問題画像はStatic Assets、イベント状態と回答は1個のSQLite-backed Durable Objectで管理しています。

## ローカル開発時

ローカルではViteとCloudflare開発環境を `npm run dev` で起動します。スマートフォンから確認するときだけngrokを手前に置きます。

```mermaid
flowchart LR
  Phone[スマートフォン] -->|HTTPS| NG[ngrok]
  NG -->|HTTP localhost:5173| DEV[Vite + ローカルWorker環境]
  PC[開発PCのブラウザ] -->|HTTP localhost:5173| DEV
  DEV --> LDO[ローカルDurable Object / SQLite]
```
