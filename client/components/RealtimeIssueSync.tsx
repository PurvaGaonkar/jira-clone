
"use client";

import { useEffect } from "react";
import { connectRealtime, IssueEvent } from "@/lib/realtime";

interface RealtimeIssueSyncProps {
  projectId: string;
  onIssueEvent: (event: IssueEvent) => void;
}

export default function RealtimeIssueSync({
  projectId,
  onIssueEvent,
}: RealtimeIssueSyncProps) {
  useEffect(() => {
    if (!projectId) return;

    const disconnect = connectRealtime(projectId, onIssueEvent);

    return () => disconnect();
  }, [projectId, onIssueEvent]);

  return null;
}
