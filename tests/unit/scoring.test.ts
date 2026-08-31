import { describe, expect, it } from "vitest";
import { rankScores, scoreAnswer } from "../../src/worker/scoring";

describe("scoreAnswer", () => {
  it("正解に1000点、不正解に0点を与える", () => {
    expect(scoreAnswer(true)).toBe(1_000);
    expect(scoreAnswer(false)).toBe(0);
  });
});

describe("rankScores", () => {
  it("得点を優先し、同点なら正解問題の合計回答時間で並べる", () => {
    const result = rankScores([
      { participantId: "slow", displayId: "002", nickname: "slow", correctCount: 2, score: 2_000, totalResponseTimeMs: 8_000 },
      { participantId: "fast", displayId: "001", nickname: "fast", correctCount: 2, score: 2_000, totalResponseTimeMs: 3_000 },
      { participantId: "one", displayId: "003", nickname: "one", correctCount: 1, score: 1_000, totalResponseTimeMs: 1_000 },
    ]);
    expect(result.map((entry) => entry.participantId)).toEqual(["fast", "slow", "one"]);
    expect(result.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it("入力配列を変更しない", () => {
    const rows = [
      { participantId: "b", displayId: "002", nickname: "b", correctCount: 0, score: 0, totalResponseTimeMs: 0 },
      { participantId: "a", displayId: "001", nickname: "a", correctCount: 1, score: 1_000, totalResponseTimeMs: 1_000 },
    ];
    rankScores(rows);
    expect(rows[0].participantId).toBe("b");
  });
});
