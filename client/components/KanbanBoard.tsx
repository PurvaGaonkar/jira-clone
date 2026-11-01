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
import React, { useEffect, useState } from "react";
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

const KanbanBoard = () => {
  const { selectedProject } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search")?.toLowerCase() || "";

  const [issues, setIssues] = useState<any[]>([]);
  const [activeIssue, setActiveIssue] = useState<any | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
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

  const fetchIssues = async () => {
    if (!selectedProject?.id) {
      setIssues([]);
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.get(
        `/api/issues/project/${selectedProject.id}`
      );

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.content)
          ? res.data.content
          : [];

      setIssues(data);
    } catch (err) {
      console.error("Failed to load issues:", err);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedProject?.id]);

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

    // Dropping on a column
    let newStatus = STATUS_COLUMNS.find(
      (column) => column.id === targetId
    )?.id;

    // Dropping on another issue card
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

    // Optimistic UI update
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
    } catch (err) {
      console.error("Failed to update issue:", err);

      // Restore previous data if backend update fails
      setIssues((prev) =>
        prev.map((item) =>
          String(item.id) === issueId ? issue : item
        )
      );
    }
  };

  if (!selectedProject) {
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
        <div className="flex h-full gap-4 pb-4">
          {STATUS_COLUMNS.map((column) => {
            const columnIssues = issues
              .filter((item) => item.status === column.id)
              .filter(
                (item) =>
                  item?.title?.toLowerCase().includes(searchQuery) ||
                  item?.key?.toLowerCase().includes(searchQuery)
              )
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
