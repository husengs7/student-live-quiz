import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const COOKIE_NAME = "quiz_admin";
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function importHmacKey(secret: string, usage: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage,
  );
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string, secret: string): Promise<boolean> {
  try {
    const key = await importHmacKey(secret, ["verify"]);
    return crypto.subtle.verify("HMAC", key, base64UrlToBuffer(signature), encoder.encode(value));
  } catch {
    return false;
  }
}

export async function verifyPassword(candidate: string, expected: string): Promise<boolean> {
  if (!candidate || !expected) return false;
  const message = encoder.encode("student-live-quiz-admin-login");
  const expectedKey = await importHmacKey(expected, ["sign"]);
  const candidateKey = await importHmacKey(candidate, ["verify"]);
  const expectedSignature = await crypto.subtle.sign("HMAC", expectedKey, message);
  return crypto.subtle.verify("HMAC", candidateKey, expectedSignature, message);
}

export async function createAdminSession(c: Context<{ Bindings: Env }>): Promise<void> {
  const env = c.env;
  if (!env.ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const expiresAt = Date.now() + 12 * 60 * 60 * 1_000;
  const payload = String(expiresAt);
  const signature = await sign(payload, env.ADMIN_SESSION_SECRET);
  setCookie(c, COOKIE_NAME, `${payload}.${signature}`, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Strict",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function isAdmin(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const env = c.env;
  const value = getCookie(c, COOKIE_NAME);
  if (!value || !env.ADMIN_SESSION_SECRET) return false;
  const separator = value.indexOf(".");
  if (separator < 1) return false;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return verifySignature(payload, signature, env.ADMIN_SESSION_SECRET);
}

export function clearAdminSession(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}

export function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD;
}
