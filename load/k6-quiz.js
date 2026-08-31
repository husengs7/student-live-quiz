import { check, fail, sleep } from "k6";
import http from "k6/http";
import { WebSocket } from "k6/websockets";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:5173";
const wsBaseUrl = baseUrl.replace(/^http/, "ws");

export const options = {
  scenarios: {
    participants: {
      executor: "per-vu-iterations",
      vus: Number(__ENV.VUS || 100),
      iterations: 1,
      maxDuration: "3m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
};

export default async function () {
  const join = http.post(`${baseUrl}/api/join`, JSON.stringify({ nickname: `load-${__VU}` }), {
    headers: { "Content-Type": "application/json" },
  });
  if (!check(join, { "join succeeds": (response) => response.status === 201 })) fail(`join failed: ${join.status}`);
  const session = join.json();
  const url = `${wsBaseUrl}/api/ws?role=participant&participantId=${session.participantId}&token=${session.token}`;
  const socket = new WebSocket(url);
  let answeredQuestion = null;

  socket.addEventListener("open", () => check(true, { "websocket connected": (value) => value }));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "snapshot" && message.phase === "question_open" && message.question && answeredQuestion !== message.question.id) {
      answeredQuestion = message.question.id;
      const delay = 200 + ((__VU * 97) % 1_800);
      setTimeout(() => socket.send(JSON.stringify({ type: "answer", choice: __VU % message.question.choices.length })), delay);
    }
    if (message.type === "snapshot" && message.phase === "finished") socket.close();
  });
  socket.addEventListener("error", (event) => console.error(`websocket error: ${event.error}`));
  await new Promise((resolve) => {
    socket.addEventListener("close", resolve);
    setTimeout(() => { socket.close(); resolve(); }, 120_000);
  });
  sleep(0.1);
}
