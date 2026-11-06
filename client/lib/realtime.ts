import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface IssueEvent {
  eventId: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  issue: any;
  timestamp: number;
}

let client: Client | null = null;
const seenEvents = new Set<string>();

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080/ws";

export function connectRealtime(
  projectId: string,
  onEvent: (event: IssueEvent) => void
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("sessionToken")
      : null;

  if (!token || !projectId) {
    console.warn("WebSocket not started: missing token or projectId");
    return () => {};
  }

  if (client) {
    void client.deactivate();
    client = null;
  }

  const stompClient = new Client({
    webSocketFactory: () => {
      console.log("Connecting WebSocket:", WS_URL);
      return new SockJS(WS_URL);
    },

    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },

    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log("WebSocket connected successfully");

      stompClient.subscribe(
        `/topic/projects/${projectId}/issues`,
        (message: IMessage) => {
          try {
            const event: IssueEvent = JSON.parse(message.body);

            if (!event.eventId || seenEvents.has(event.eventId)) {
              return;
            }

            seenEvents.add(event.eventId);

            if (seenEvents.size > 500) {
              const oldest = seenEvents.values().next().value;

              if (oldest) {
                seenEvents.delete(oldest);
              }
            }

            onEvent(event);
          } catch (error) {
            console.error("Invalid realtime event:", error);
          }
        }
      );
    },

    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers.message, frame.body);
    },

    onWebSocketError: (error) => {
      console.error("WebSocket transport failed:", error);
    },

    onWebSocketClose: (event) => {
      console.warn("WebSocket closed:", event.code, event.reason);
    },
  });

  client = stompClient;
  stompClient.activate();

  return () => {
    if (client === stompClient) {
      client = null;
    }

    void stompClient.deactivate();
  };
}