
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
  HIGH: "bg-red-50 text-red-700 border-red-100",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-100",
  LOW: "bg-green-50 text-green-700 border-green-100",
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
      className={`rounded-lg border border-gray-200 bg-white
        px-4 py-3.5 shadow-sm transition-all duration-150
        ${overlay
          ? "border-blue-300 shadow-lg"
          : "hover:border-gray-300 hover:shadow-md cursor-pointer"
        }`}
    >
      <p className="mb-3 break-words text-sm font-medium leading-5 text-gray-800">
        {issue.title}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-gray-500">
          {issue.key}
        </span>

        <Badge
          className={`shrink-0 border text-[11px] font-medium
            ${priorityColors[issue.priority] ||
            "bg-gray-50 text-gray-600 border-gray-200"}`}
        >
          {issue.priority || "MEDIUM"}
        </Badge>
      </div>

      {assignee && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2.5">
          <Avatar className="h-6 w-6">
            <AvatarImage src={assignee.avatar} />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
              {assignee.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <span className="truncate text-xs text-gray-500">
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
