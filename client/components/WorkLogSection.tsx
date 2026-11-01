
"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/lib/Axiosinstance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface WorkLog {
  id: string;
  issueId: string;
  workDate: string;
  durationHours: number;
  description: string;
}

interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  oldDescription?: string;
  newDescription?: string;
  oldDuration: number;
  newDuration: number;
  performedAt: string;
}

export default function WorkLogSection({
  issueId,
  sprintId,
}: {
  issueId: string;
  sprintId?: string;
}) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState(0);
  const [sprintTotal, setSprintTotal] = useState(0);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditLogId, setAuditLogId] = useState<string | null>(null);

  const today = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-");

  const loadLogs = async () => {
    try {
      const response = await axiosInstance.get(
        `/api/worklogs/issue/${issueId}`
      );
      setLogs(response.data);

      const totalResponse = await axiosInstance.get(
        `/api/worklogs/issue/${issueId}/total`
      );
      setTotal(totalResponse.data);

      if (sprintId) {
        const sprintResponse = await axiosInstance.get(
          `/api/worklogs/sprint/${sprintId}/total`
        );
        setSprintTotal(sprintResponse.data);
      }
    } catch {
      setError("Unable to load work logs.");
    }
  };

  useEffect(() => {
    loadLogs();
  }, [issueId, sprintId]);

  const resetForm = () => {
    setDate("");
    setDuration("");
    setDescription("");
    setEditingId(null);
  };

  const saveLog = async () => {
    setError("");

    if (
      !date ||
      date > today ||
      !Number.isFinite(Number(duration)) ||
      Number(duration) <= 0 ||
      !description.trim()
    ) {
      setError("Enter a valid date, positive duration and description.");
      return;
    }

    try {
      const payload = {
        issueId,
        workDate: date,
        durationHours: Number(duration),
        description: description.trim(),
      };

      if (editingId) {
        if (!window.confirm("Are you sure you want to update this work log?")) {
          return;
        }
        await axiosInstance.put(`/api/worklogs/${editingId}`, payload);
      } else {
        await axiosInstance.post("/api/worklogs", payload);
      }

      resetForm();
      await loadLogs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to save work log.");
    }
  };

  const startEdit = (log: WorkLog) => {
    setEditingId(log.id);
    setDate(log.workDate);
    setDuration(String(log.durationHours));
    setDescription(log.description);
  };

  const deleteLog = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this work log?")) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/worklogs/${id}`);
      if (auditLogId === id) {
        setAuditLogId(null);
        setAudit([]);
      }
      await loadLogs();
    } catch {
      setError("Unable to delete work log.");
    }
  };

  const showAudit = async (id: string) => {
    try {
      const response = await axiosInstance.get(`/api/worklogs/${id}/audit`);
      setAudit(response.data);
      setAuditLogId(id);
    } catch {
      setError("Unable to load audit history.");
    }
  };

  return (
    <section className="mt-6 space-y-4 border-t pt-5">
      <h3 className="text-lg font-semibold">Time Tracking & Work Logs</h3>

      <div className="rounded-lg bg-gray-100 p-3 text-sm">
        <p>Task Total: <strong>{Number(total).toFixed(2)} hours</strong></p>
        {sprintId && (
          <p>Sprint Total: <strong>{Number(sprintTotal).toFixed(2)} hours</strong></p>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">
          {editingId ? "Edit Work Log" : "Log New Work"}
        </h4>

        <Input
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Input
          type="number"
          min="0.01"
          step="0.25"
          placeholder="Duration in hours"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <Textarea
          placeholder="Describe the work performed"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex gap-2">
          <Button onClick={saveLog}>
            {editingId ? "Update Work Log" : "Log Work"}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        <h4 className="font-medium">Logged Work ({logs.length})</h4>

        {logs.map((log) => (
          <div key={log.id} className="rounded-lg border p-3">
            <p className="font-medium">{log.durationHours} hours</p>
            <p className="text-sm text-gray-500">{log.workDate}</p>
            <p className="text-sm">{log.description}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => startEdit(log)}>
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => showAudit(log.id)}>
                Audit History
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteLog(log.id)}
              >
                Delete
              </Button>
            </div>

            {auditLogId === log.id && (
              <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3">
                <div className="flex justify-between">
                  <h5 className="text-sm font-semibold">Audit History</h5>
                  <button
                    className="text-xs underline"
                    onClick={() => setAuditLogId(null)}
                  >
                    Close
                  </button>
                </div>

                {audit.length === 0 ? (
                  <p className="text-xs text-gray-500">No audit entries found.</p>
                ) : (
                  audit.map((entry) => (
                    <div key={entry.id} className="border-t pt-2 text-xs">
                      <p>
                        <strong>{entry.action}</strong> by {entry.performedBy || "Unknown"}
                      </p>
                      <p>{new Date(entry.performedAt).toLocaleString()}</p>
                      {entry.action === "UPDATE" && (
                        <p>
                          Duration: {entry.oldDuration} → {entry.newDuration} hours
                        </p>
                      )}
                      {entry.oldDescription && (
                        <p>Previous: {entry.oldDescription}</p>
                      )}
                      {entry.newDescription && (
                        <p>Updated: {entry.newDescription}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}

        {logs.length === 0 && (
          <p className="text-sm text-gray-500">No work logs yet.</p>
        )}
      </div>
    </section>
  );
}
