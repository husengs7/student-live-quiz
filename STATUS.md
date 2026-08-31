#  実装状況と今後のステップ

最終更新：2026-08-31

## 現在の状態

学生向けイベントで一度だけ実施するライブクイズ大会のローカルMVPが完成している。

参加者の入室から、司会者による問題公開、回答、締め切り、正解発表、ランキング表示、クイズ終了まで、一連の進行をローカル環境で実行できる。

CloudflareへのデプロイおよびGitHubへのpushは、まだ行っていない。

## 実装済み

### 参加者画面 `/quiz`

- ニックネームによる参加
- サーバー発行の参加者IDとトークンによる識別
- クイズ開始までの待機表示
- 問題と選択肢のリアルタイム表示
- 回答送信と回答済み表示
- 締め切り、正解発表の表示
- 最終順位と得点の表示
- WebSocket切断後の自動再接続
- ブラウザ更新後の参加者情報復元

### Admin画面 `/admin`

- パスワードログイン
- 署名付きHttpOnly Cookieによるセッション管理
- 参加人数と回答人数の確認
- 問題開始、回答締め切り、正解発表
- 次の問題への進行とクイズ終了
- リアルタイムランキング
- 結果のCSV出力
- Adminパスワード再入力による全データリセット
- ローカル開発時に限り、参加者リザルト画面から実行できる開発用リセット

### 投影画面 `/screen`

- 開始前画面と参加人数表示
- 問題、選択肢、残り時間、回答人数の表示
- 締め切り、正解、回答分布の表示
- 最終ランキング表示

### サーバー

- Cloudflare WorkersとHonoによるAPI
- 1個のSQLite-backed Durable Object
- Durable Objects Hibernation WebSocket API
- SQLiteへの参加者、回答、進行状態の保存
- サーバー時刻を基準にした回答時間判定
- Alarmによる回答の自動締め切り
- 1参加者・1問題につき1回答の一意制約
- サーバー側での正誤判定と採点
- 得点、正解数、合計回答時間によるランキング
- 正解データを参加者向けJavaScriptへ含めない構成
- 最大300人の参加受付制限

### テスト

- Vitestによる採点ロジックの単体テスト
- Cloudflare Vitest PluginによるWorkerとDurable Objectの統合テスト
- Playwrightによるクイズ全進行のE2Eテスト
- k6によるWebSocket負荷試験シナリオ

## 検証結果

| 確認項目 | 結果 | 備考 |
| --- | --- | --- |
| TypeScript型検査 | 成功 | `npm run typecheck` |
| Vitest | 成功 | 2ファイル、6テスト |
| Playwright E2E | 成功 | 参加から最終結果まで |
| Vite本番ビルド | 成功 | `npm run build` |
| Wrangler dry-run | 成功 | 実際のデプロイなし |
| k6負荷試験 | 未実行 | シナリオ作成済み、k6本体が未導入 |
| Cloudflareデプロイ | 未実施 | 意図的に未実施 |
| 実会場Wi-Fi試験 | 未実施 | 会場環境で実施が必要 |

ビルド時にAdmin用Secretが未設定という警告が出るが、これは `.dev.vars` をまだ作成していないためである。実行前に設定する。

## 現在の問題データ

[src/worker/questions.ts](src/worker/questions.ts) に動作確認用のサンプル問題が3問入っている。

本番前に以下を確定し、実際の問題へ差し替える必要がある。

- 問題文
- 選択肢
- 正解
- 制限時間
- 問題数
- 表記ゆれや誤字

`correctChoice` は0始まりで指定する。

```ts
{
  id: 1,
  text: "問題文",
  choices: ["A", "B", "C", "D"],
  correctChoice: 0,
  timeLimitSeconds: 15,
}
```

## ローカルで確認する手順

```bash
cd /Users/husensan/student-live-quiz
cp .dev.vars.example .dev.vars
```

`.dev.vars` を編集する。

```text
ADMIN_PASSWORD=司会者が使用するパスワード
ADMIN_SESSION_SECRET=32文字以上のランダムな文字列
```

起動する。

```bash
npm run dev
```

確認用URL：

- 参加者：`http://localhost:5173/quiz`
- Admin：`http://localhost:5173/admin`
- 投影画面：`http://localhost:5173/screen`

## これからのステップ

### 優先度1：クイズ内容とルールの確定

- 本番用の問題と選択肢を用意する
- 正解を複数人で確認する
- 1問あたりの制限時間と全体の問題数を決める
- 得点ルールを確定する
- 同点時に合計回答時間を使用することを参加者へ説明する
- ニックネームに関するルールを決める

現状は正解1問につき1,000点で、同点の場合は正解した問題の合計回答時間が短い参加者を上位にする。

### 優先度2：ローカルリハーサル

- `.dev.vars` を作成する
- Admin、参加者、投影画面を別ウィンドウで開く
- 全問題を最初から最後まで進行する
- 誤操作しやすい箇所を確認する
- 自動締め切りと手動締め切りを両方試す
- ブラウザ更新後に参加者が復帰できることを確認する
- CSVをExcelやGoogleスプレッドシートで開いて確認する
- リセット後に参加者と回答が消えることを確認する

### 優先度3：負荷試験

k6をインストールし、まず100人、その後200〜300人で実行する。

```bash
k6 run \
  -e BASE_URL=http://127.0.0.1:5173 \
  -e VUS=100 \
  load/k6-quiz.js
```

負荷試験中は、Admin画面から実際に問題を進行する。

確認項目：

- 100本のWebSocket接続が維持される
- 問題公開後に全参加者へ通知される
- 一斉回答でエラーや回答欠落が発生しない
- 二重回答と締め切り後の回答が保存されない
- Admin画面が操作可能な状態を維持する
- ランキングが正しく集計される

負荷試験終了後は必ずデータをリセットする。

### 優先度4：UIと当日運用の調整

- イベント名、ロゴ、配色を本番用に変更する
- スマートフォン実機で文字サイズとボタンサイズを確認する
- 会場スクリーンの解像度で投影画面を確認する
- 参加用URLのQRコードを用意する
- 司会進行用の操作手順書を作る
- 誤操作時とアプリ障害時の代替進行を決める

### 優先度5：Cloudflare公開準備

デプロイすることが決まった後に実施する。

- Cloudflareアカウントと対象ドメインを確認する
- Worker名を確認する
- `ADMIN_PASSWORD` と `ADMIN_SESSION_SECRET` をWorkers Secretとして登録する
- `npm run check:worker` を再実行する
- ユーザーの承認後にCloudflareへデプロイする
- 本番URLで参加者、Admin、投影画面を確認する
- 本番環境で少人数のリハーサルを実施する

現時点ではデプロイ操作を行わない。

### 優先度6：会場ネットワークでの最終リハーサル

- 会場Wi-Fiへ複数端末を接続する
- QRコードから本番URLを開く
- iPhone、Androidの両方で回答する
- Wi-Fi切断と再接続を試す
- 投影端末をスリープしない設定にする
- Admin端末への通知や自動ロックを無効化する
- イベント終了後のCSV保存方法を確認する

## 本番前の最低限チェックリスト

- [ ] サンプル問題を本番問題へ差し替えた
- [ ] 全問題の正解を複数人で確認した
- [ ] 得点と同点ルールを確定した
- [ ] AdminパスワードとセッションSecretを設定した
- [ ] ローカルで全問題を通してリハーサルした
- [ ] `npm run typecheck` が成功した
- [ ] `npm test` が成功した
- [ ] `npm run test:e2e` が成功した
- [ ] `npm run build` が成功した
- [ ] k6で100人負荷試験を実行した
- [ ] 参加用QRコードを用意した
- [ ] スマートフォン実機で確認した
- [ ] 会場スクリーンと会場Wi-Fiで確認した
- [ ] CSVの保存先を決めた
- [ ] 障害時の代替進行を決めた
- [ ] 本番開始直前にテストデータをリセットした

## 主なファイル

| ファイル | 役割 |
| --- | --- |
| [README.md](README.md) | プロジェクト全体の設計と起動方法 |
| [src/worker/questions.ts](src/worker/questions.ts) | 本番用問題データ |
| [src/worker/quiz-room.ts](src/worker/quiz-room.ts) | Durable Object、回答受付、進行、集計 |
| [src/worker/auth.ts](src/worker/auth.ts) | Admin認証 |
| [src/client/pages/ParticipantPage.tsx](src/client/pages/ParticipantPage.tsx) | 参加者画面 |
| [src/client/pages/AdminPage.tsx](src/client/pages/AdminPage.tsx) | Admin画面 |
| [src/client/pages/ScreenPage.tsx](src/client/pages/ScreenPage.tsx) | 投影画面 |
| [tests/integration/worker.test.ts](tests/integration/worker.test.ts) | Workers統合テスト |
| [tests/e2e/join.spec.ts](tests/e2e/join.spec.ts) | クイズ全進行E2Eテスト |
| [load/k6-quiz.js](load/k6-quiz.js) | 100人規模の負荷試験 |

## 現時点の注意事項

- k6本体はローカル環境へ未インストールのため、負荷試験はまだ実行していない
- サンプル問題のままなので、そのまま本番では使用しない
- `.dev.vars` はGit管理対象外であり、各環境で作成する必要がある
- Admin認証用Secretをソースコードや `wrangler.jsonc` に直接記載しない
- Cloudflareへデプロイする前に、必ずユーザーの承認を得る
- リザルト画面の開発用リセットはVite開発時だけ表示され、APIもlocalhost以外では使用できない
- このアプリは単一イベント専用であり、複数大会対応は目的に含めない
