import { describe, expect, it } from "vitest";
import { rankScores, scoreAnswer } from "../../src/worker/scoring";

describe("scoreAnswer", () => {
  it("30秒問題では残り1秒につき100点を与える", () => {
    expect(scoreAnswer(true, 0, 30)).toBe(3_000);
    expect(scoreAnswer(true, 1_000, 30)).toBe(2_900);
    expect(scoreAnswer(true, 10_000, 30)).toBe(2_000);
    expect(scoreAnswer(true, 29_000, 30)).toBe(100);
  });

  it("1秒未満の端数は画面のカウントダウンと同じく切り上げる", () => {
    expect(scoreAnswer(true, 10_001, 30)).toBe(2_000);
    expect(scoreAnswer(true, 29_999, 30)).toBe(100);
  });

  it("不正解は回答時間にかかわらず0点にする", () => {
    expect(scoreAnswer(false, 0, 30)).toBe(0);
    expect(scoreAnswer(false, 20_000, 30)).toBe(0);
  });

  it("制限時間を変更しても同じ計算規則を使う", () => {
    expect(scoreAnswer(true, 0, 15)).toBe(1_500);
    expect(scoreAnswer(true, 10_000, 15)).toBe(500);
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
