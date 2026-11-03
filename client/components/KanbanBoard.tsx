
"use client";

import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import IssueModel from "./IssueModel";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";

const STATUS_COLUMNS = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

const normalizeStatus = (status: unknown): string => {
  const value = String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (["TO_DO", "OPEN", "BACKLOG", "NEW"].includes(value)) {
    return "TODO";
  }

  if (
    ["INPROGRESS", "IN_PROGRESS", "IN_REVIEW", "REVIEW"].includes(value)
  ) {
    return "IN_PROGRESS";
  }

  if (["COMPLETE", "COMPLETED", "CLOSED", "RESOLVED"].includes(value)) {
    return "DONE";
  }

  return value;
};

const KanbanBoard = () => {
  const { selectedProject } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("search") ?? "").toLowerCase();

  const [issues, setIssues] = useState<any[]>([]);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const fetchIssues = useCallback(async () => {
    if (!selectedProject?.id) {
      setIssues([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError("");

      const res = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`
      );

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.content)
          ? res.data.content
          : [];

      const validIssues = data
        .filter((item: any) => item != null)
        .map((item: any) => ({
          ...item,
          status: normalizeStatus(item.status),
        }));

      console.log("Kanban project:", selectedProject.id);
      console.log("Kanban issues received:", validIssues);

      setIssues(validIssues);
    } catch (err) {
      console.error("Failed to load issues:", err);
      setIssues([]);
      setLoadError("Unable to load issues. Please check the backend.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    void fetchIssues();
  }, [fetchIssues]);

  const onDragStart = (event: DragStartEvent) => {
    const issue = issues.find(
      (item) => String(item.id) === String(event.active.id)
    );

    setActiveIssue(issue || null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveIssue(null);

    const { active, over } = event;

    if (!over) return;

    const issueId = String(active.id);

    const issue = issues.find(
      (item) => String(item.id) === issueId
    );

    if (!issue) return;

    const targetId = String(over.id);

    let newStatus = STATUS_COLUMNS.find(
      (column) => column.id === targetId
    )?.id;

    if (!newStatus) {
      const targetIssue = issues.find(
        (item) => String(item.id) === targetId
      );

      newStatus = targetIssue?.status;
    }

    if (!newStatus || issue.status === newStatus) return;

    const updatedIssue = {
      ...issue,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    setIssues((prev) =>
      prev.map((item) =>
        String(item.id) === issueId ? updatedIssue : item
      )
    );

    try {
      await axiosInstance.put(`/api/issues/${issueId}`, {
        title: updatedIssue.title,
        description: updatedIssue.description,
        type: updatedIssue.type,
        priority: updatedIssue.priority,
        status: updatedIssue.status,
        projectId: updatedIssue.projectId,
        reporterId: updatedIssue.reporterId,
        assigneeId: updatedIssue.assigneeId,
        sprintId: updatedIssue.sprintId ?? null,
        order: updatedIssue.order ?? 0,
        comments: updatedIssue.comments ?? [],
        updatedAt: updatedIssue.updatedAt,
      });

      await fetchIssues();
    } catch (err) {
      console.error("Failed to update issue:", err);

      setIssues((prev) =>
        prev.map((item) =>
          String(item.id) === issueId ? issue : item
        )
      );
    }
  };

  if (!selectedProject?.id) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Select a project to view the board
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
          Loading board…
        </div>
      ) : (
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
          {loadError && (
            <div className="absolute rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => void fetchIssues()}
              >
                Retry
              </button>
            </div>
          )}

          {STATUS_COLUMNS.map((column) => {
            const columnIssues = issues
              .filter(
                (item) => normalizeStatus(item.status) === column.id
              )
              .filter((item) => {
                const title = String(item?.title ?? "").toLowerCase();
                const key = String(item?.key ?? "").toLowerCase();

                return (
                  title.includes(searchQuery) ||
                  key.includes(searchQuery)
                );
              })
              .sort(
                (a, b) => (a.order ?? 0) - (b.order ?? 0)
              );

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                issues={columnIssues}
                onIssueClick={setSelectedIssue}
              />
            );
          })}
        </div>
      )}

      <IssueModel
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
      />

      {isMounted &&
        !loading &&
        createPortal(
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: { opacity: "0.5" },
                },
              }),
            }}
          >
            {activeIssue ? (
              <KanbanCard issue={activeIssue} isOverlay />
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
};

export default KanbanBoard;
