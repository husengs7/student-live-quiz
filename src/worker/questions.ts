export type Question = {
  id: number;
  text: string;
  /** public/ 以下のパス（例: /question-images/sample.png）または https URL */
  imageUrl?: string;
  imageAlt?: string;
  choices: string[];
  correctChoice: number;
  timeLimitSeconds: number;
};

// correctChoice は0始まり（最初の選択肢が0）。このファイルはWorkerにのみ含まれる。
// 画像を表示する問題には imageUrl と imageAlt を追加する。
// 例: imageUrl: "/question-images/q1.png", imageAlt: "問題に使用する図",
export const questions: Question[] = [
  {
    id: 1,
    text: "HTTPステータスコード『418』が表すものは？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["認証が必要", "私はティーポット", "サーバーが休憩中", "コーヒー切れ"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 2,
    text: "コードの問題を、物や人に順番に説明しながら自己解決する手法は？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["モブプログラミング", "ラバーダック・デバッグ", "ブルーグリーンデプロイ", "ゼロトラスト"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 3,
    text: "【理不尽問題】金曜日の17:59、本番デプロイボタンが光っています。正しい操作は？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["勢いよく押す", "2回押して確実にする", "月曜日の自分に託す", "隣の人に押してもらう"],
    correctChoice: 2,
    timeLimitSeconds: 30,
  },
  {
    id: 4,
    text: "10億秒は、およそ何年？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["3.2年", "31.7年", "317年", "3,170年"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 5,
    text: "【理不尽問題】3時間直らなかったバグが、先輩を呼んだ瞬間に消えました。原因は？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["キャッシュ", "競合状態", "先輩の圧", "宇宙線"],
    correctChoice: 2,
    timeLimitSeconds: 30,
  },
  {
    id: 6,
    text: "DNSの正式名称は？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["Digital Network Service", "Domain Name System", "Data Naming Standard", "Distributed Node Server"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 7,
    text: "【最終・理不尽問題】動かないコードを6時間調べました。結局いちばんありそうな原因は？",
    imageUrl: "/question-images/demo-question.svg",
    imageAlt: "問題画像のデモ表示",
    choices: ["1文字のタイプミス", "古いキャッシュ", "環境変数の設定漏れ", "全部ありえる"],
    correctChoice: 3,
    timeLimitSeconds: 30,
  },
];
