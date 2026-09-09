export type QuizPhase =
  | "waiting"
  | "question_open"
  | "question_closed"
  | "answer_revealed"
  | "finished";

export type PublicQuestion = {
  id: number;
  text: string;
  choices: string[];
  timeLimitSeconds: number;
};

export type RankingEntry = {
  participantId: string;
  displayId: string;
  nickname: string;
  correctCount: number;
  score: number;
  totalResponseTimeMs: number;
  rank: number;
};

export type QuizSnapshot = {
  type: "snapshot";
  phase: QuizPhase;
  questionNumber: number;
  totalQuestions: number;
  question: PublicQuestion | null;
  closesAt: number | null;
  participantCount: number;
  answerCount: number;
  answerDistribution: number[] | null;
  correctChoice: number | null;
  ranking: RankingEntry[];
  me: {
    participantId: string;
    selectedChoice: number | null;
    score: number;
    rank: number | null;
  } | null;
};

export type ClientMessage =
  | { type: "answer"; choice: number }
  | { type: "admin_action"; action: "start" | "close" | "reveal" | "next" | "finish" };

export type ServerMessage =
  | QuizSnapshot
  | { type: "session_reset" }
  | { type: "error"; message: string }
  | { type: "notice"; message: string };
