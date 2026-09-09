import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("quiz worker", () => {
  it("health endpoint responds", async () => {
    const response = await exports.default.fetch("http://example.com/api/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("creates a participant without returning the token hash", async () => {
    const response = await exports.default.fetch("http://example.com/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "テスト参加者" }),
    });
    expect(response.status).toBe(201);
    const participant = await response.json<{
      participantId: string;
      token: string;
      displayId: string;
      nickname: string;
      token_hash?: string;
    }>();
    expect(participant.nickname).toBe("テスト参加者");
    expect(participant.participantId).toBeTruthy();
    expect(participant.token.length).toBeGreaterThan(32);
    expect(participant.token_hash).toBeUndefined();

    const validResponse = await exports.default.fetch("http://example.com/api/participant/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.participantId, token: participant.token }),
    });
    await expect(validResponse.json()).resolves.toEqual({ valid: true });

    const invalidResponse = await exports.default.fetch("http://example.com/api/participant/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: participant.participantId, token: "invalid-token" }),
    });
    await expect(invalidResponse.json()).resolves.toEqual({ valid: false });

  });

  it("rejects an invalid nickname", async () => {
    const response = await exports.default.fetch("http://example.com/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: "" }),
    });
    expect(response.status).toBe(400);
  });

  it("does not expose a participant-side reset endpoint", async () => {
    const response = await exports.default.fetch("http://localhost/api/dev/reset", { method: "POST" });
    expect(response.status).toBe(404);
  });
});
