import { Hono } from "hono";
import { clearAdminSession, createAdminSession, getAdminPassword, isAdmin, verifyPassword } from "./auth";
import { QuizRoom } from "./quiz-room";

const app = new Hono<{ Bindings: Env }>();

function room(env: Env) {
  return env.QUIZ_ROOM.getByName("main-quiz-room");
}

app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "same-origin");
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.post("/api/join", async (c) => {
  const request = new Request("https://quiz-room/join", {
    method: "POST",
    headers: { "Content-Type": c.req.header("Content-Type") ?? "application/json" },
    body: c.req.raw.body,
  });
  return room(c.env).fetch(request);
});

app.post("/api/admin/login", async (c) => {
  const expected = getAdminPassword(c.env);
  if (!expected) return c.json({ error: "Admin password is not configured" }, 503);
  let body: { password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  if (typeof body.password !== "string" || !(await verifyPassword(body.password, expected))) {
    return c.json({ error: "パスワードが正しくありません" }, 401);
  }
  await createAdminSession(c);
  return c.json({ ok: true });
});

app.post("/api/admin/logout", (c) => {
  clearAdminSession(c);
  return c.json({ ok: true });
});

app.get("/api/admin/session", async (c) => c.json({ authenticated: await isAdmin(c) }));

app.get("/api/admin/export", async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
  return room(c.env).fetch(
    new Request("https://quiz-room/export", { headers: { "X-Admin-Authorized": "1" } }),
  );
});

app.post("/api/admin/reset", async (c) => {
  if (!(await isAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
  let body: { password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }
  const expected = getAdminPassword(c.env);
  if (typeof body.password !== "string" || !expected || !(await verifyPassword(body.password, expected))) {
    return c.json({ error: "Adminパスワードが正しくありません" }, 401);
  }
  return room(c.env).fetch(
    new Request("https://quiz-room/admin-reset", {
      method: "POST",
      headers: { "X-Admin-Authorized": "1" },
    }),
  );
});

app.post("/api/dev/reset", async (c) => {
  const hostname = new URL(c.req.url).hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "[::1]") {
    return c.json({ error: "Development reset is only available on localhost" }, 404);
  }
  return room(c.env).fetch(
    new Request("https://quiz-room/dev-reset", {
      method: "POST",
      headers: { "X-Dev-Reset-Authorized": "1" },
    }),
  );
});

app.get("/api/ws", async (c) => {
  const url = new URL(c.req.url);
  const headers = new Headers(c.req.raw.headers);
  if (url.searchParams.get("role") === "admin") {
    if (!(await isAdmin(c))) return c.json({ error: "Unauthorized" }, 401);
    headers.set("X-Admin-Authorized", "1");
  }
  const target = new URL("https://quiz-room/ws");
  target.search = url.search;
  return room(c.env).fetch(new Request(target, { headers }));
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export { QuizRoom };
export default app;
