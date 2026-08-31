export type Question = {
  id: number;
  text: string;
  choices: string[];
  correctChoice: number;
  timeLimitSeconds: number;
};

// 本番前にこのファイルを実際の問題へ差し替える。
// correctChoice は0始まり（最初の選択肢が0）。このファイルはWorkerにのみ含まれる。
export const questions: Question[] = [
  {
    id: 1,
    text: "Findyのサービスが支援している領域は？",
    choices: ["エンジニアのキャリア", "農業", "不動産", "旅行予約"],
    correctChoice: 0,
    timeLimitSeconds: 15,
  },
  {
    id: 2,
    text: "Webブラウザとサーバーで双方向通信を行う技術は？",
    choices: ["CSV", "WebSocket", "JPEG", "DNSSEC"],
    correctChoice: 1,
    timeLimitSeconds: 15,
  },
  {
    id: 3,
    text: "このクイズの同点時の順位判定は？",
    choices: ["参加順", "ニックネーム順", "合計回答時間", "ランダム"],
    correctChoice: 2,
    timeLimitSeconds: 15,
  },
];
