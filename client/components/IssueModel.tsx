
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import WorkLogSection from "./WorkLogSection";

const priorityLabels: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const priorityStyles: Record<string, string> = {
  HIGH: "bg-red-50 text-red-700 border-red-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  LOW: "bg-green-50 text-green-700 border-green-200",
};

const statusStyles: Record<string, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
};

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
    {children}
  </section>
);

const IssueModel = ({
  issue,
  isOpen,
  onClose,
  onIssueDeleted,
}: any) => {
  const { user } = useAuth();

  const [assignee, setAssignee] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [localIssue, setLocalIssue] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  const [projectIssues, setProjectIssues] = useState<any[]>([]);
  const [selectedDependencies, setSelectedDependencies] =
    useState<string[]>([]);
  const [dependencyLoading, setDependencyLoading] = useState(false);

  const [error, setError] = useState("");

  // Initialize issue
  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    setLocalIssue(issue);
    setCommentText("");
    setSubtaskTitle("");
    setSubtaskDescription("");
    setError("");
    setSelectedDependencies(issue.dependsOnIssueIds || []);
    setDeleteLoading(false);
  }, [isOpen, issue?.id]);

  // Fetch assignee
  useEffect(() => {
    if (!localIssue?.assigneeId) {
      setAssignee(null);
      return;
    }

    let cancelled = false;

    const fetchAssignee = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/users/${localIssue.assigneeId}`
        );

        if (!cancelled) setAssignee(res.data);
      } catch (err) {
        console.error("Failed to load assignee", err);
      }
    };

    fetchAssignee();

    return () => {
      cancelled = true;
    };
  }, [localIssue?.assigneeId]);

  // Fetch subtasks and project issues
  useEffect(() => {
    if (!isOpen || !localIssue?.id) return;

    const fetchRelatedIssues = async () => {
      try {
        const projectRes = await axiosInstance.get(
          `/api/issues/project/${localIssue.projectId}`
        );

        const issues = Array.isArray(projectRes.data)
          ? projectRes.data
          : projectRes.data?.content || [];

        setProjectIssues(issues);

        if (localIssue.type !== "SUBTASK") {
          const subtaskRes = await axiosInstance.get(
            `/api/issues/${localIssue.id}/subtasks`
          );

          setSubtasks(
            Array.isArray(subtaskRes.data) ? subtaskRes.data : []
          );
        } else {
          setSubtasks([]);
        }
      } catch (err) {
        console.error("Failed to load related issues", err);
      }
    };

    fetchRelatedIssues();
  }, [
    isOpen,
    localIssue?.id,
    localIssue?.projectId,
    localIssue?.type,
  ]);

  // Delete issue
  const deleteIssue = async () => {
    if (!localIssue?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${localIssue.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      setError("");

      await axiosInstance.delete(`/api/issues/${localIssue.id}`);

      onIssueDeleted?.(String(localIssue.id));
      onClose();
    } catch (err: any) {
      const responseData = err.response?.data;

      setError(
        responseData?.message ||
          (typeof responseData === "string" ? responseData : "") ||
          "Failed to delete issue. Delete its subtasks first if it has any."
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Save comment
  const saveComment = async () => {
    if (!commentText.trim() || !user || !localIssue) return;

    try {
      setLoading(true);
      setError("");

      const updatedComments = [
        ...(localIssue.comments || []),
        commentText,
      ];

      await axiosInstance.put(`/api/issues/${localIssue.id}`, {
        title: localIssue.title,
        description: localIssue.description,
        type: localIssue.type,
        priority: localIssue.priority,
        status: localIssue.status,
        projectId: localIssue.projectId,
        reporterId: localIssue.reporterId,
        assigneeId: localIssue.assigneeId,
        sprintId: localIssue.sprintId ?? null,
        parentIssueId: localIssue.parentIssueId ?? null,
        dependsOnIssueIds: localIssue.dependsOnIssueIds || [],
        order: localIssue.order ?? 0,
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });

      setLocalIssue((prev: any) => ({
        ...prev,
        comments: updatedComments,
      }));

      setCommentText("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to save comment"
      );
      console.error("Failed to save comment", err);
    } finally {
      setLoading(false);
    }
  };

  // Create subtask
  const createSubtask = async () => {
    if (!subtaskTitle.trim() || !localIssue) return;

    try {
      setSubtaskLoading(true);
      setError("");

      const res = await axiosInstance.post(
        `/api/issues/${localIssue.id}/subtasks`,
        {
          title: subtaskTitle,
          description: subtaskDescription,
          status: "TODO",
          priority: "MEDIUM",
          reporterId: user?.id || null,
          assigneeId: null,
          order: 0,
        }
      );

      setSubtasks((prev) => [...prev, res.data]);
      setSubtaskTitle("");
      setSubtaskDescription("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to create subtask"
      );
    } finally {
      setSubtaskLoading(false);
    }
  };

  // Update subtask status
  const updateSubtaskStatus = async (
    subtask: any,
    status: string
  ) => {
    try {
      setError("");

      await axiosInstance.put(`/api/issues/${subtask.id}`, {
        ...subtask,
        status,
      });

      setSubtasks((prev) =>
        prev.map((item) =>
          item.id === subtask.id ? { ...item, status } : item
        )
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update subtask"
      );
    }
  };

  // Toggle dependency
  const toggleDependency = (dependencyId: string) => {
    setSelectedDependencies((prev) =>
      prev.includes(dependencyId)
        ? prev.filter((id) => id !== dependencyId)
        : [...prev, dependencyId]
    );
  };

  // Save dependencies
  const saveDependencies = async () => {
    if (!localIssue) return;

    try {
      setDependencyLoading(true);
      setError("");

      const res = await axiosInstance.put(
        `/api/issues/${localIssue.id}/dependencies`,
        selectedDependencies
      );

      setLocalIssue((prev: any) => ({
        ...prev,
        dependsOnIssueIds:
          res.data?.dependsOnIssueIds || selectedDependencies,
      }));
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to update dependencies. Check for circular dependencies."
      );
    } finally {
      setDependencyLoading(false);
    }
  };

  if (!localIssue && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="p-8 text-center text-sm text-gray-500">
            Loading task...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex flex-col w-[95vw] !max-w-[1100px] max-h-[92vh]
        overflow-hidden p-0 gap-0 rounded-xl border border-gray-200 shadow-xl"
      >
        {!localIssue ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Loading task...
          </div>
        ) : (
          <>
            {/* HEADER */}
            <DialogHeader className="shrink-0 border-b border-gray-200 bg-gray-50/80 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500">
                  {localIssue.key || "TASK"}
                </span>

                <Badge
                  className={`border-0 text-xs ${
                    statusStyles[localIssue.status] ||
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {localIssue.status?.replace("_", " ") || "TODO"}
                </Badge>

                <Badge
                  className={`border text-xs ${
                    priorityStyles[localIssue.priority] ||
                    "bg-gray-50 text-gray-600"
                  }`}
                >
                  {priorityLabels[localIssue.priority] ||
                    localIssue.priority}
                </Badge>
              </div>

              <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900">
                {localIssue.title}
              </DialogTitle>
            </DialogHeader>

            {/* SCROLLABLE BODY */}
            <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px]">
              {/* MAIN COLUMN */}
              <div className="min-w-0 space-y-4 p-5 md:p-6">
                {/* Description */}
                <Section title="Description">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                    {localIssue.description || "No description provided."}
                  </p>
                </Section>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Subtasks */}
                {localIssue.type !== "SUBTASK" && (
                  <Section
                    title={`Subtasks (${subtasks.length})`}
                    subtitle="Break this task into smaller tasks."
                  >
                    {subtasks.length > 0 ? (
                      <div className="mb-4 space-y-2">
                        {subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-sm font-medium text-gray-700">
                                {subtask.title}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                {subtask.key || subtask.id}
                              </p>
                            </div>

                            <select
                              value={subtask.status || "TODO"}
                              onChange={(e) =>
                                updateSubtaskStatus(
                                  subtask,
                                  e.target.value
                                )
                              }
                              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">
                                In Progress
                              </option>
                              <option value="DONE">Done</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-400">
                        No subtasks created yet.
                      </p>
                    )}

                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <h4 className="mb-3 text-xs font-semibold text-gray-700">
                        Create a subtask
                      </h4>

                      <input
                        value={subtaskTitle}
                        onChange={(e) =>
                          setSubtaskTitle(e.target.value)
                        }
                        placeholder="Subtask title"
                        className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                      />

                      <Textarea
                        value={subtaskDescription}
                        onChange={(e) =>
                          setSubtaskDescription(e.target.value)
                        }
                        placeholder="Description (optional)"
                        className="bg-white"
                      />

                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          onClick={createSubtask}
                          disabled={
                            !subtaskTitle.trim() || subtaskLoading
                          }
                        >
                          {subtaskLoading
                            ? "Creating..."
                            : "Create Subtask"}
                        </Button>
                      </div>
                    </div>
                  </Section>
                )}

                {/* Dependencies */}
                <Section
                  title="Dependencies"
                  subtitle="Tasks that must be completed before this task can start."
                >
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
                    {projectIssues.filter(
                      (item) =>
                        item.id !== localIssue.id &&
                        item.type !== "SUBTASK" &&
                        !item.parentIssueId
                    ).length > 0 ? (
                      projectIssues
                        .filter(
                          (item) =>
                            item.id !== localIssue.id &&
                            item.type !== "SUBTASK" &&
                            !item.parentIssueId
                        )
                        .map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDependencies.includes(
                                item.id
                              )}
                              onChange={() =>
                                toggleDependency(item.id)
                              }
                              className="mt-1 accent-blue-600"
                            />

                            <span className="min-w-0 text-sm text-gray-600">
                              <span className="font-medium text-gray-500">
                                {item.key || item.id}
                              </span>
                              <span className="ml-1 break-words">
                                {item.title}
                              </span>
                            </span>
                          </label>
                        ))
                    ) : (
                      <p className="p-3 text-sm text-gray-400">
                        No other tasks available.
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={saveDependencies}
                      disabled={dependencyLoading}
                    >
                      {dependencyLoading
                        ? "Saving..."
                        : "Save Dependencies"}
                    </Button>
                  </div>
                </Section>

                {/* Work Logs */}
                <Section title="Time Tracking">
                  <WorkLogSection
                    issueId={localIssue.id}
                    sprintId={localIssue.sprintId}
                  />
                </Section>

                {/* Comments */}
                <Section
                  title={`Comments (${localIssue.comments?.length || 0})`}
                >
                  <div className="space-y-3">
                    {localIssue.comments?.length > 0 ? (
                      localIssue.comments.map(
                        (comment: string, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-5 text-gray-600">
                              {comment}
                            </p>
                          </div>
                        )
                      )
                    ) : (
                      <p className="text-sm text-gray-400">
                        No comments yet.
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-start gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-blue-50 text-blue-700 text-xs">
                        ME
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <Textarea
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) =>
                          setCommentText(e.target.value)
                        }
                        className="min-h-[90px]"
                      />

                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          disabled={!commentText.trim() || loading}
                          onClick={saveComment}
                        >
                          {loading ? "Saving..." : "Add Comment"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Section>
              </div>

              {/* SIDEBAR */}
              <aside className="border-t border-gray-200 bg-gray-50 p-5 md:border-l md:border-t-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Task Properties
                    </h3>

                    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                      <div>
                        <p className="mb-1 text-xs text-gray-400">
                          Status
                        </p>
                        <Badge
                          className={`border-0 ${
                            statusStyles[localIssue.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {localIssue.status?.replace("_", " ")}
                        </Badge>
                      </div>

                      <div>
                        <p className="mb-1 text-xs text-gray-400">
                          Priority
                        </p>
                        <Badge
                          className={`border ${
                            priorityStyles[localIssue.priority] ||
                            "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {priorityLabels[localIssue.priority] ||
                            localIssue.priority}
                        </Badge>
                      </div>

                      {/* Assignee */}
                      <div>
                        <p className="mb-1 text-xs text-gray-400">
                          Assignee
                        </p>

                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={assignee.avatar} />
                              <AvatarFallback className="bg-gray-100 text-xs">
                                {assignee.name?.[0]?.toUpperCase() ||
                                  "U"}
                              </AvatarFallback>
                            </Avatar>

                            <span className="break-words text-sm text-gray-700">
                              {assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {/* Task ID */}
                      <div>
                        <p className="mb-1 text-xs text-gray-400">
                          Task ID
                        </p>
                        <p className="break-all text-xs text-gray-600">
                          {localIssue.key || localIssue.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="rounded-xl border border-red-100 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Danger Zone
                    </h3>

                    <p className="mt-1 mb-3 text-xs leading-5 text-gray-400">
                      Deleting this task cannot be undone.
                    </p>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={deleteIssue}
                      disabled={deleteLoading}
                    >
                      {deleteLoading ? "Deleting..." : "Delete Task"}
                    </Button>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IssueModel;
