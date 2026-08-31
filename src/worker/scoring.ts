export type ScoreRow = {
  participantId: string;
  displayId: string;
  nickname: string;
  correctCount: number;
  score: number;
  totalResponseTimeMs: number;
};

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

export function scoreAnswer(isCorrect: boolean): number {
  return isCorrect ? 1_000 : 0;
}
