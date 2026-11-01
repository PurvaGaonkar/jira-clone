
"use client";

import React, { useEffect, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import axiosInstance from "@/lib/Axiosinstance";

interface KanbanCardProps {
  issue: any;
  isOverlay?: boolean;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-green-100 text-green-800",
};

const issueTypeColors: Record<string, string> = {
  BUG: "bg-red-500",
  TASK: "bg-blue-500",
  STORY: "bg-purple-500",
};

const CardContent = ({
  issue,
  onClick,
  overlay = false,
}: {
  issue: any;
  onClick?: () => void;
  overlay?: boolean;
}) => {
  const [assignee, setAssignee] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (!issue?.assigneeId || overlay) {
      setAssignee(null);
      return;
    }

    const fetchAssignee = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/users/${issue.assigneeId}`
        );

        if (!cancelled) {
          setAssignee(res.data);
        }
      } catch (err) {
        console.error("Failed to load assignee:", err);
      }
    };

    fetchAssignee();

    return () => {
      cancelled = true;
    };
  }, [issue?.assigneeId, overlay]);

  return (
    <div
      onClick={onClick}
      className={`rounded border bg-white p-3 shadow-sm transition-colors ${
        overlay
          ? "shadow-lg border-[#0052CC]"
          : "hover:bg-[#F4F5F7] cursor-pointer"
      }`}
    >
      <p className="text-sm font-medium text-[#172B4D] mb-3 leading-tight">
        {issue.title}
      </p>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`h-4 w-4 rounded ${
              issueTypeColors[issue.type] || "bg-gray-400"
            }`}
          />

          <span className="text-[11px] font-bold text-[#5E6C84]">
            {issue.key}
          </span>
        </div>

        <Badge
          className={`text-xs ${
            priorityColors[issue.priority] || "bg-gray-100 text-gray-800"
          }`}
        >
          {issue.priority}
        </Badge>
      </div>

      {assignee && (
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={assignee.avatar} />

            <AvatarFallback>
              {assignee.name?.[0]}
            </AvatarFallback>
          </Avatar>

          <span className="text-[10px] text-[#626F86]">
            {assignee.name}
          </span>
        </div>
      )}
    </div>
  );
};

const SortableKanbanCard = ({
  issue,
  onClick,
}: {
  issue: any;
  onClick?: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <CardContent issue={issue} />
    </div>
  );
};

const KanbanCard = ({
  issue,
  isOverlay = false,
  onClick,
}: KanbanCardProps) => {
  if (isOverlay) {
    return <CardContent issue={issue} overlay />;
  }

  return (
    <SortableKanbanCard
      issue={issue}
      onClick={onClick}
    />
  );
};

export default KanbanCard;
