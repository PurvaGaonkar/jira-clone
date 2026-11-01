
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

export function connectRealtime(
  projectId: string,
  onEvent: (event: IssueEvent) => void
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("sessionToken")
      : null;

  if (!token || !projectId) return () => {};

  client?.deactivate();

  const stompClient = new Client({
    webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      stompClient.subscribe(
        `/topic/projects/${projectId}/issues`,
        (message: IMessage) => {
          try {
            const event: IssueEvent = JSON.parse(message.body);

            if (!event.eventId || seenEvents.has(event.eventId)) return;

            seenEvents.add(event.eventId);

            if (seenEvents.size > 500) {
              const oldest = seenEvents.values().next().value;
              if (oldest) seenEvents.delete(oldest);
            }

            onEvent(event);
          } catch (error) {
            console.error("Invalid realtime event:", error);
          }
        }
      );
    },

    onStompError: (frame) => {
      console.error("WebSocket error:", frame.headers.message);
    },

    onWebSocketError: (error) => {
      console.error("WebSocket connection error:", error);
    },
  });

  client = stompClient;
  stompClient.activate();

  return () => {
    if (client === stompClient) {
      client = null;
    }
    stompClient.deactivate();
  };
}
