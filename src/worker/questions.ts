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
    text: "Findy StudentでGitHubを連携することで使えて、自分のエンジニアとしての頑張りを可視化してくれるサービスの名前は？",
    imageUrl: "/question-images/Gemini_Generated_Image_kiky2ukiky2ukiky.jpeg",
    imageAlt: "Findy StudentのGitHub連携とエンジニア向けプロフィール機能の紹介",
    choices: ["Github日記", "GitHub通信簿", "コミット通信簿", "コミット日記"],
    correctChoice: 2,
    timeLimitSeconds: 30,
  },
  {
    id: 2,
    text: "修正したコードを実行したのに『全く挙動が変わらない』とき、一番最初に疑うべき明確な原因はどれ？",
    choices: ["PCのCPUがオーバーヒートしている", "保存（Ctrl + S / Cmd + S）をしていないファイルを実行している", "プログラムが自我を持ち始めている", "プログラミング言語のバグ"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 3,
    text: "Gitで事故を起こした際、コミット履歴や作業状態を過去の特定時点へ強力に巻き戻せる（元に戻せる）救世主的なコマンドはどれ？",
    choices: ["git destroy", "git reflog", "git pray", "git forgive"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 4,
    text: "『プログラマーが数えられる唯一の数』と言われるほど、配列（Array）の最初の要素を指定するインデックス（添字）番号として正しいものはどれ？",
    choices: ["0", "1", "-1", "null"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 5,
    text: "プログラミング言語『Java』のロゴを描くとき、カップから立ち上る『湯気（スチーム）』の線は何本描くのが正解？",
    imageUrl: "/question-images/Gemini_Generated_Image_9768t89768t89768.jpeg",
    imageAlt: "Javaのロゴをモチーフにした青いカップと湯気",
    choices: ["2本", "3本", "4本", "5本"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 6,
    text: "次のモダンなプログラミング言語の中で、発表された歴史が最も古い言語はどれ？",
    choices: ["TypeScript", "Go", "Rust", "Swift"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 7,
    text: "Docker（ドッカー）の公式ロゴに登場するクジラ（Moby Dock）が、背中に背負っているコンテナの数は全部で何個？",
    choices: ["7個", "9個", "12個", "15個"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 8,
    text: "昔のインターネット（ダイヤルアップ接続）で、夜23時から翌朝8時まで通信料が定額になり、ネット廃人を大量に生み出したNTTの伝説のサービス名はどれ？",
    choices: ["テレホーダイ", "ネットホーダイ", "ナイトホーダイ", "ギガホーダイ"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 9,
    text: "2020年に発生し、GmailやYouTubeなど世界中のGoogleサービスが一斉ダウンした大規模障害。その拍子抜けする主な原因はどれ？",
    choices: ["データセンターの電源コードに足を引っ掛けた", "内部の認証システムの『ストレージ空き容量』が満杯（0）になった", "サーバーのクロック（時計）が1秒ズレた", "自動アップデートのボタンを押し間違えた"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 10,
    text: "プログラム実行時に発生する『無限ループ』に陥ったとき、ターミナル上で処理を強制終了させる標準的なショートカットキーはどれ？",
    choices: ["Ctrl + C（Macも Ctrl + C）", "Ctrl + Z", "Ctrl + Alt + Delete", "Esc + Enter"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 11,
    text: "コードの書き方を巡って世界中で『不毛な戦争（タブ派 vs スペース派）』が起きているプログラミングの要素はどれ？",
    choices: ["インデント（字下げ）", "改行コード", "変数名", "コメントアウト"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 12,
    text: "HTTPステータスコード『418』の定義として、エイプリルフールのジョークRFC（RFC 2324）で定められた正しい意味はどれ？",
    choices: ["I'm a coffee machine（私はコーヒーマシンです）", "I'm a teapot（私はティーポットです）", "I'm a toaster（私はトースターです）", "I'm a microwave（私は電子レンジです）"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
  {
    id: 13,
    text: "プログラムの不具合を意味する『バグ（Bug）』の語源として、実際にコンピューターの中に挟まって障害を起こした実在の生き物はどれ？",
    choices: ["蛾（ガ）", "ゴキブリ", "クモ", "アリ"],
    correctChoice: 0,
    timeLimitSeconds: 30,
  },
  {
    id: 14,
    text: "天才プログラマーのテリー・A・デイヴィス氏が『神からの啓示を受けた』として、コンパイラやプログラミング言語（HolyC）までたった1人で約10年かけて自作した、解像度640x480・16色固定の伝説の自作OSはどれ？",
    choices: ["GodOS", "HolyOS", "TempleOS", "ChurchOS"],
    correctChoice: 2,
    timeLimitSeconds: 30,
  },
  {
    id: 15,
    text: "先輩エンジニアから『ここにバグがあるよ！』と指摘されて怒られてしまいました。しかし、ある一言を返した途端、先輩はぱったり怒らなくなりました。その魔法のような一言とはどれ？",
    choices: ["『でも、ローカル環境では動きました！』", "『それ、仕様（仕様通り）です。』", "『Qiitaの記事にはこう書いてありました！』", "『昨日までは動いていたんです！』"],
    correctChoice: 1,
    timeLimitSeconds: 30,
  },
];
