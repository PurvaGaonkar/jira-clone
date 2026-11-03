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

  if (!token || !projectId) {
    console.warn("WebSocket not started: missing token or projectId", {
      hasToken: !!token,
      projectId,
    });
    return () => {};
  }

  // Close any previous connection.
  if (client) {
    void client.deactivate();
    client = null;
  }

  const stompClient = new Client({
    webSocketFactory: () => {
      console.log("Creating WebSocket connection to /ws");
      return new SockJS("http://localhost:8080/ws");
    },

    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },

    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      console.log("WebSocket connected successfully");
      console.log("WebSocket subscription projectId:", projectId);

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

            console.log("Realtime issue event received:", event.action);

            onEvent(event);
          } catch (error) {
            console.error("Invalid realtime event:", error);
          }
        }
      );

      console.log(
        `Subscribed to /topic/projects/${projectId}/issues`
      );
    },

    onStompError: (frame) => {
      console.error(
        "STOMP error:",
        frame.headers.message,
        frame.body
      );
    },

    onWebSocketError: (error) => {
  console.error("WebSocket transport failed:", {
    error,
    readyState: stompClient.webSocket?.readyState,
    connected: stompClient.connected,
    url: stompClient.webSocket?.url,
  });
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