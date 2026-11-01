
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

const typeIcons: Record<string, string> = {
  BUG: "🐛",
  TASK: "✓",
  STORY: "📖",
  SUBTASK: "↳",
};

const IssueModel = ({ issue, isOpen, onClose }: any) => {
  const { user } = useAuth();

  const [assignee, setAssignee] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [localIssue, setLocalIssue] = useState<any>(null);

  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDescription, setSubtaskDescription] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  const [projectIssues, setProjectIssues] = useState<any[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [dependencyLoading, setDependencyLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !issue?.id) return;

    setLocalIssue(issue);
    setCommentText("");
    setSubtaskTitle("");
    setSubtaskDescription("");
    setError("");
    setSelectedDependencies(issue.dependsOnIssueIds || []);
  }, [isOpen, issue?.id]);

  // FETCH ASSIGNEE
  useEffect(() => {
    if (!localIssue?.assigneeId) {
      setAssignee(null);
      return;
    }

    const fetchAssignee = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/users/${localIssue.assigneeId}`
        );
        setAssignee(res.data);
      } catch (err) {
        console.error("Failed to load assignee", err);
      }
    };

    fetchAssignee();
  }, [localIssue?.assigneeId]);

  // FETCH SUBTASKS AND PROJECT ISSUES
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

          setSubtasks(Array.isArray(subtaskRes.data) ? subtaskRes.data : []);
        } else {
          setSubtasks([]);
        }
      } catch (err) {
        console.error("Failed to load related issues", err);
      }
    };

    fetchRelatedIssues();
  }, [isOpen, localIssue?.id, localIssue?.projectId, localIssue?.type]);

  // SAVE COMMENT
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
      setError(err.response?.data?.message || "Failed to save comment");
      console.error("Failed to save comment", err);
    } finally {
      setLoading(false);
    }
  };

  // CREATE SUBTASK
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
      setError(err.response?.data?.message || "Failed to create subtask");
    } finally {
      setSubtaskLoading(false);
    }
  };

  // UPDATE SUBTASK STATUS
  const updateSubtaskStatus = async (subtask: any, status: string) => {
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
      setError(err.response?.data?.message || "Failed to update subtask");
    }
  };

  // TOGGLE DEPENDENCY
  const toggleDependency = (dependencyId: string) => {
    setSelectedDependencies((prev) =>
      prev.includes(dependencyId)
        ? prev.filter((id) => id !== dependencyId)
        : [...prev, dependencyId]
    );
  };

  // SAVE DEPENDENCIES
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
        <DialogContent>
          <div className="p-8 text-center">Loading issue...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-sm font-semibold text-[#5E6C84]">
            {localIssue?.title ?? "Loading issue..."}
          </DialogTitle>
        </DialogHeader>

        {!localIssue ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#6B778C]">
            Loading issue...
          </div>
        ) : (
          <div className="flex flex-col md:flex-row">
            {/* MAIN CONTENT */}
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-semibold mb-4">
                {localIssue.title}
              </h2>

              <h3 className="text-sm font-semibold mb-2">
                Description
              </h3>

              <p className="text-sm text-[#42526E] mb-8">
                {localIssue.description || "No description"}
              </p>

              {error && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* SUBTASK SECTION */}
              {localIssue.type !== "SUBTASK" && (
                <section className="mb-8">
                  <h3 className="text-sm font-semibold mb-3">
                    Subtasks ({subtasks.length})
                  </h3>

                  <div className="space-y-2 mb-4">
                    {subtasks.length > 0 ? (
                      subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center justify-between gap-3 rounded-md border p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {subtask.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {subtask.key || subtask.id}
                            </p>
                          </div>

                          <select
                            value={subtask.status || "TODO"}
                            onChange={(e) =>
                              updateSubtaskStatus(subtask, e.target.value)
                            }
                            className="rounded-md border p-2 text-xs"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No subtasks created yet.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border p-3">
                    <h4 className="text-sm font-semibold">
                      Create Subtask
                    </h4>

                    <input
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      placeholder="Subtask title"
                      className="w-full rounded-md border p-2 text-sm"
                    />

                    <Textarea
                      value={subtaskDescription}
                      onChange={(e) =>
                        setSubtaskDescription(e.target.value)
                      }
                      placeholder="Subtask description"
                    />

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={createSubtask}
                        disabled={!subtaskTitle.trim() || subtaskLoading}
                      >
                        {subtaskLoading ? "Creating..." : "Create Subtask"}
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* DEPENDENCY SECTION */}
              <section className="mb-8">
                <h3 className="text-sm font-semibold mb-3">
                  Task Dependencies
                </h3>

                <p className="text-xs text-gray-500 mb-3">
                  Select tasks that must be completed before this task can start.
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
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
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDependencies.includes(item.id)}
                            onChange={() => toggleDependency(item.id)}
                          />
                          <span>
                            {item.key || item.id} - {item.title}
                          </span>
                        </label>
                      ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No other tasks available in this project.
                    </p>
                  )}
                </div>

                <div className="flex justify-end mt-3">
                  <Button
                    size="sm"
                    onClick={saveDependencies}
                    disabled={dependencyLoading}
                  >
                    {dependencyLoading ? "Saving..." : "Save Dependencies"}
                  </Button>
                </div>
              </section>

              {/* TIME TRACKING AND WORK LOGS */}
              <WorkLogSection
                issueId={localIssue.id}
                sprintId={localIssue.sprintId}
              />

              {/* COMMENTS */}
              <h3 className="text-sm font-semibold mb-4">
                Comments ({localIssue.comments?.length || 0})
              </h3>

              <div className="space-y-4 mb-6">
                {localIssue.comments?.length > 0 ? (
                  localIssue.comments.map(
                    (comment: string, index: number) => (
                      <div
                        key={index}
                        className="rounded-md border border-[#DFE1E6] bg-[#F4F5F7] p-3"
                      >
                        <p className="text-sm text-[#172B4D] whitespace-pre-wrap">
                          {comment}
                        </p>
                      </div>
                    )
                  )
                ) : (
                  <p className="text-sm text-[#6B778C] italic">
                    No comments yet
                  </p>
                )}
              </div>

              {/* ADD COMMENT */}
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />

                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      className="bg-[#0052CC] text-white"
                      disabled={!commentText.trim() || loading}
                      onClick={saveComment}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* SIDEBAR */}
            <div className="w-full md:w-[280px] p-6 border-l">
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase mb-1">
                    Status
                  </h3>
                  <Badge>{localIssue.status}</Badge>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase mb-1">
                    Type
                  </h3>
                  <span>
                    {typeIcons[localIssue.type] || "✓"} {localIssue.type}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase mb-1">
                    Priority
                  </h3>
                  <Badge>
                    {priorityLabels[localIssue.priority] || localIssue.priority}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase mb-1">
                    Assignee
                  </h3>

                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback>
                          {assignee.name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <span className="text-sm">{assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm italic">Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IssueModel;
