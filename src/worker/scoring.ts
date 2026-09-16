export type ScoreRow = {
  participantId: string;
  displayId: string;
  nickname: string;
  correctCount: number;
  score: number;
  totalResponseTimeMs: number;
};

export const POINTS_PER_REMAINING_SECOND = 100;

export function rankScores(rows: ScoreRow[]) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.score - a.score ||
      b.correctCount - a.correctCount ||
      a.totalResponseTimeMs - b.totalResponseTimeMs ||
      a.displayId.localeCompare(b.displayId),
  );

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function scoreAnswer(
  isCorrect: boolean,
  responseTimeMs: number,
  timeLimitSeconds: number,
): number {
  if (!isCorrect || timeLimitSeconds <= 0) return 0;

  const remainingSeconds = Math.max(
    1,
    Math.ceil(timeLimitSeconds - Math.max(0, responseTimeMs) / 1_000),
  );
  return remainingSeconds * POINTS_PER_REMAINING_SECOND;
}
