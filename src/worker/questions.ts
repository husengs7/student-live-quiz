export type Question = {
  id: number;
  text: string;
  /** public/ 以下のパス（例: /question-images/sample.png）または https URL */
  imageUrl?: string;
  imageAlt?: string;
  imageUrlB?: string;
  imageAltB?: string;
  answerImageUrl?: string;
  answerImageAlt?: string;
  choices: string[];
  correctChoice: number;
  timeLimitSeconds: number;
};

// correctChoice は0始まり（最初の選択肢が0）。このファイルはWorkerにのみ含まれる。
// 出題画像には imageUrl、正解発表時だけ表示する画像には answerImageUrl を指定する。
// 例: answerImageUrl: "/question-images/q1-answer.png", answerImageAlt: "正解の解説画像",
export const questions: Question[] = [
  {
    id: 1,
    text: "Findy StudentでGitHubを連携することで使えて、自分のエンジニアとしての頑張りを可視化してくれるサービスの名前は？",
    imageUrl: "/question-images/Gemini_Generated_Image_kiky2ukiky2ukiky.jpeg",
    imageAlt: "Findy StudentのGitHub連携とエンジニア向けプロフィール機能の紹介",
    answerImageUrl: "/question-images/コミット通信簿正解画像.png",
    answerImageAlt: "Findy Studentのコミット通信簿ベータ版を紹介する画像",
    choices: ["Github日記", "GitHub通信簿", "コミット通信簿", "コミット日記"],
    correctChoice: 2,
    timeLimitSeconds: 30,
  },
  {
    id: 2,
    text: "GitHubの公式マスコット『Octocat（オクトキャット / モナ）』の触手は、全部で何本？",
    imageUrl: "/question-images/onqktponqktponqk.jpeg",
    imageAlt: "GitHubの公式マスコットOctocat",
    answerImageUrl: "/question-images/github-octocat.jpg",
    answerImageAlt: "5本の触手が見えるGitHubの公式マスコットOctocat",
    choices: ["4本", "5本", "8本", "10本"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 3,
    text: "バージョン管理ツール『Git』という言葉の、英語のスラング（俗語）としての本来の意味はどれ？",
    imageUrl: "/question-images/git-logo.png",
    imageAlt: "Gitのロゴ",
    choices: ["『まぬけ』", "『すばやい』", "『秘密の』", "『つながり』"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 4,
    text: "スクリーンに表示されている2枚の画像は、一方がGemini、もう一方がChatGPTによって生成されています。Geminiが生成した画像はどちらでしょう？",
    imageUrl: "/question-images/chatgpt-messy-server-cables.png",
    imageAlt: "ChatGPTが生成した配線が乱雑なサーバー背面の画像",
    imageUrlB: "/question-images/Gemini_Generated_Image_rg4cw9rg4cw9rg4c.jpeg",
    imageAltB: "Geminiが生成した配線が乱雑なサーバー背面の画像",
    choices: ["写真 A", "写真 B"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 5,
    text: "Dockerのロゴに登場するクジラ（Moby Dock）が、背中に背負っているコンテナの数は全部で何個？",
    imageUrl: "/question-images/dockerimage.jpeg",
    imageAlt: "Dockerのクジラのロゴ",
    choices: ["7個", "9個", "12個", "15個"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 6,
    text: "次のうち実在しない、小型コンピューターはどれ？",
    choices: ["ラズベリーパイ（Raspberry Pi）", "オレンジパイ（Orange Pi）", "バナナパイ（Banana Pi）", "ストロベリーパイ（Strawberry Pi）"],
    correctChoice: 3,
    timeLimitSeconds: 30,
  },
  {
    id: 7,
    text: "1985年に世界で初めて登録された、人類史上最古の『.com』ドメインはどれ？",
    choices: ["bbn.com", "symbolics.com", "think.com", "dec.com"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 8,
    text: "HTTPステータスコード『418』の正しい意味はどれ？",
    choices: ["I'm a teapot", "Not Found", "Forbidden", "Bad Request"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 9,
    text: "プログラムの不具合を意味する『バグ』の語源として、実際にコンピューターの中に挟まって障害を起こした生き物はどれ？",
    choices: ["蛾", "ゴキブリ", "クモ", "アリ"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 10,
    text: "プログラミング言語『Python』の名称の由来となったものはどれ？",
    choices: ["開発者のペットだったニシキヘビの名前", "イギリスの伝説的なコメディ番組『空飛ぶモンティ・パイソン』", "ギリシャ神話に登場する巨大な蛇の神", "初めてプログラムを動かした研究室のコードネーム"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
];
