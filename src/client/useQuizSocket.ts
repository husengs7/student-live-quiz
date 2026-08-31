import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, QuizSnapshot, ServerMessage } from "../shared/protocol";

type ConnectionState = "connecting" | "connected" | "disconnected";

export function useQuizSocket(query: URLSearchParams | null) {
  const [snapshot, setSnapshot] = useState<QuizSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [message, setMessage] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    let retryTimer: number | undefined;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      setConnectionState("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/api/ws?${query.toString()}`);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        attempt = 0;
        setConnectionState("connected");
      });
      socket.addEventListener("message", (event) => {
        const incoming = JSON.parse(String(event.data)) as ServerMessage;
        if (incoming.type === "snapshot") {
          setSnapshot(incoming);
          setMessage(null);
        } else {
          setMessage(incoming.message);
        }
      });
      socket.addEventListener("close", () => {
        if (cancelled) return;
        setConnectionState("disconnected");
        const delay = Math.min(1_000 * 2 ** attempt, 10_000);
        attempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      });
      socket.addEventListener("error", () => socket.close());
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, [query?.toString()]);

  const send = useCallback((outgoing: ClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setMessage("サーバーへ再接続中です。少し待ってから再度お試しください。");
      return false;
    }
    socketRef.current.send(JSON.stringify(outgoing));
    return true;
  }, []);

  return { snapshot, connectionState, message, setMessage, send };
}
