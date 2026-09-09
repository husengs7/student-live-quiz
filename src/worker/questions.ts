export type Question = {
  id: number;
  text: string;
  choices: string[];
  correctChoice: number;
  timeLimitSeconds: number;
};

// correctChoice は0始まり（最初の選択肢が0）。このファイルはWorkerにのみ含まれる。
export const questions: Question[] = [
  {
    id: 1,
    text: "HTTPステータスコード『418』が表すものは？",
    choices: ["認証が必要", "私はティーポット", "サーバーが休憩中", "コーヒー切れ"],
    correctChoice: 1,
    timeLimitSeconds: 15,
  },
  {
    id: 2,
    text: "コードの問題を、物や人に順番に説明しながら自己解決する手法は？",
    choices: ["モブプログラミング", "ラバーダック・デバッグ", "ブルーグリーンデプロイ", "ゼロトラスト"],
    correctChoice: 1,
    timeLimitSeconds: 15,
  },
  {
    id: 3,
    text: "【理不尽問題】金曜日の17:59、本番デプロイボタンが光っています。正しい操作は？",
    choices: ["勢いよく押す", "2回押して確実にする", "月曜日の自分に託す", "隣の人に押してもらう"],
    correctChoice: 2,
    timeLimitSeconds: 12,
  },
  {
    id: 4,
    text: "10億秒は、およそ何年？",
    choices: ["3.2年", "31.7年", "317年", "3,170年"],
    correctChoice: 1,
    timeLimitSeconds: 15,
  },
  {
    id: 5,
    text: "【理不尽問題】3時間直らなかったバグが、先輩を呼んだ瞬間に消えました。原因は？",
    choices: ["キャッシュ", "競合状態", "先輩の圧", "宇宙線"],
    correctChoice: 2,
    timeLimitSeconds: 12,
  },
  {
    id: 6,
    text: "DNSの正式名称は？",
    choices: ["Digital Network Service", "Domain Name System", "Data Naming Standard", "Distributed Node Server"],
    correctChoice: 1,
    timeLimitSeconds: 15,
  },
  {
    id: 7,
    text: "【最終・理不尽問題】動かないコードを6時間調べました。結局いちばんありそうな原因は？",
    choices: ["1文字のタイプミス", "古いキャッシュ", "環境変数の設定漏れ", "全部ありえる"],
    correctChoice: 3,
    timeLimitSeconds: 12,
  },
];