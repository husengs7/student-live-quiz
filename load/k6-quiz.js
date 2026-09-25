import { check, fail, sleep } from "k6";
import http from "k6/http";
import { WebSocket } from "k6/websockets";
import { Counter } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:5173";
const wsBaseUrl = baseUrl.replace(/^http/, "ws");
const participantCount = Number(__ENV.VUS || 100);
const questionCount = Number(__ENV.QUESTIONS || 10);
const participantSockets = new Counter("participant_sockets");
const answersSent = new Counter("answers_sent");

export const options = {
  scenarios: {
    admin: {
      executor: "per-vu-iterations",
      exec: "runAdmin",
      vus: 1,
      iterations: 1,
      maxDuration: "3m",
    },
    participants: {
      executor: "per-vu-iterations",
      exec: "runParticipant",
      startTime: "2s",
      vus: participantCount,
      iterations: 1,
      maxDuration: "3m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
    participant_sockets: [`count==${participantCount}`],
    answers_sent: [`count==${participantCount * questionCount}`],
  },
};

export async function runParticipant() {
  const join = http.post(`${baseUrl}/api/join`, JSON.stringify({ nickname: `load-${__VU}` }), {
    headers: { "Content-Type": "application/json" },
  });
  if (!check(join, { "join succeeds": (response) => response.status === 201 })) fail(`join failed: ${join.status}`);
  const session = join.json();
  const url = `${wsBaseUrl}/api/ws?role=participant&participantId=${session.participantId}&token=${session.token}`;
  const socket = new WebSocket(url);
  let answeredQuestion = null;

  socket.addEventListener("open", () => participantSockets.add(1));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "snapshot" && message.phase === "question_open" && message.question && answeredQuestion !== message.question.id) {
      answeredQuestion = message.question.id;
      const delay = 200 + ((__VU * 97) % 1_800);
      setTimeout(() => {
        socket.send(JSON.stringify({ type: "answer", choice: __VU % message.question.choices.length }));
        answersSent.add(1);
      }, delay);
    }
    if (message.type === "snapshot" && message.phase === "finished") socket.close();
  });
  socket.addEventListener("error", (event) => console.error(`websocket error: ${event.error}`));
  await new Promise((resolve) => {
    const timeout = setTimeout(() => { socket.close(); resolve(); }, 120_000);
    socket.addEventListener("close", () => { clearTimeout(timeout); resolve(); });
  });
  sleep(0.1);
}

export async function runAdmin() {
  if (!__ENV.ADMIN_PASSWORD) fail("ADMIN_PASSWORD is required");
  const login = http.post(`${baseUrl}/api/admin/login`, JSON.stringify({ password: __ENV.ADMIN_PASSWORD }), {
    headers: { "Content-Type": "application/json" },
  });
  if (!check(login, { "admin login succeeds": (response) => response.status === 200 })) fail(`admin login failed: ${login.status}`);
  const reset = http.post(`${baseUrl}/api/admin/reset`, JSON.stringify({ password: __ENV.ADMIN_PASSWORD }), {
    headers: { "Content-Type": "application/json" },
  });
  if (!check(reset, { "initial reset succeeds": (response) => response.status === 200 })) fail(`reset failed: ${reset.status}`);

  const socket = new WebSocket(`${wsBaseUrl}/api/ws?role=admin`, [], { jar: http.cookieJar() });
  let handledState = "";
  let started = false;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => { socket.close(); resolve(); }, 170_000);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type !== "snapshot") return;
      if (!started && message.phase === "waiting" && message.participantCount >= participantCount) {
        started = true;
        socket.send(JSON.stringify({ type: "admin_action", action: "start" }));
        return;
      }
      const state = `${message.phase}:${message.questionNumber}`;
      if (state === handledState) return;
      handledState = state;
      if (message.phase === "question_open") {
        setTimeout(() => socket.send(JSON.stringify({ type: "admin_action", action: "close" })), 3_000);
      } else if (message.phase === "question_closed") {
        setTimeout(() => socket.send(JSON.stringify({ type: "admin_action", action: "reveal" })), 250);
      } else if (message.phase === "answer_revealed") {
        const action = message.questionNumber < message.totalQuestions ? "next" : "finish";
        setTimeout(() => socket.send(JSON.stringify({ type: "admin_action", action })), 250);
      } else if (message.phase === "finished") {
        check(message, {
          "all participants retained": (snapshot) => snapshot.participantCount === participantCount,
          "ranking contains all participants": (snapshot) => snapshot.ranking.length === participantCount,
        });
        socket.close();
      }
    });
    socket.addEventListener("close", () => { clearTimeout(timeout); resolve(); });
    socket.addEventListener("error", () => { clearTimeout(timeout); resolve(); });
  });
}
