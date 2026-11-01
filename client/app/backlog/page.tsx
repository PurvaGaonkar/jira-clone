
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Share2,
  Play,
  CheckCircle,
  ArrowRight,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

type Issue = {
  id: string;
  key?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  projectId?: string;
  sprintId?: string | null;
  assignee?: {
    avatar?: string | null;
  } | null;
};

type Sprint = {
  id: string;
  name?: string | null;
  status?: string;
  goal?: string;
};

const Page = () => {
  const { selectedProject, user } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!selectedProject?.id) {
      setIssues([]);
      setSprints([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [issuesRes, sprintRes] = await Promise.all([
        axiosInstance.get(`/api/issues/project/${selectedProject.id}`),
        axiosInstance.get(`/api/sprints/project/${selectedProject.id}`),
      ]);

      const issueData = Array.isArray(issuesRes.data)
        ? issuesRes.data
        : Array.isArray(issuesRes.data?.content)
          ? issuesRes.data.content
          : [];

      const sprintData = Array.isArray(sprintRes.data)
        ? sprintRes.data
        : [];

      setIssues(issueData);
      setSprints(sprintData);
    } catch (err) {
      console.error("Failed to load backlog:", err);
      setError("Unable to load backlog data. Please check the backend.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activeSprint = sprints.find(
    (sprint) => sprint.status?.toUpperCase() === "ACTIVE"
  ) ?? null;

  const plannedSprint = sprints.find(
    (sprint) => sprint.status?.toUpperCase() === "PLANNED"
  ) ?? null;

  const sprintIssues = activeSprint
    ? issues.filter((issue) => issue.sprintId === activeSprint.id)
    : [];

  const backlogIssues = issues.filter((issue) => !issue.sprintId);

  const handleAction = async (
    action: () => Promise<unknown>,
    successMessage?: string
  ) => {
    try {
      setError("");
      await action();
      await fetchData();
      if (successMessage) console.log(successMessage);
    } catch (err) {
      console.error(err);
      setError("The operation failed. Please try again.");
    }
  };

  const createIssue = async () => {
    if (!newTitle.trim() || !selectedProject?.id || !user?.id) {
      setError("Enter an issue title and make sure a project and user are selected.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      await axiosInstance.post("/api/issues", {
        title: newTitle.trim(),
        projectId: selectedProject.id,
        status: "TODO",
        priority: "MEDIUM",
        type: "TASK",
        reporterId: user.id,
        sprintId: null,
      });

      setNewTitle("");
      setIsCreating(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      setError("Unable to create the issue.");
    } finally {
      setCreating(false);
    }
  };

  const createSprint = async () => {
    if (!sprintName.trim() || !selectedProject?.id) {
      setError("Enter a sprint name.");
      return;
    }

    await handleAction(async () => {
      await axiosInstance.post("/api/sprints", {
        name: sprintName.trim(),
        goal: sprintGoal.trim(),
        projectId: selectedProject.id,
        status: "PLANNED",
      });

      setSprintName("");
      setSprintGoal("");
      setShowSprintForm(false);
    });
  };

  const startSprint = async (sprintId: string) => {
    await handleAction(() =>
      axiosInstance.put(`/api/sprints/${sprintId}/start`)
    );
  };

  const completeSprint = async (sprintId: string) => {
    if (!window.confirm("Are you sure you want to complete this sprint?")) {
      return;
    }

    await handleAction(() =>
      axiosInstance.put(`/api/sprints/${sprintId}/complete`)
    );
  };

  const addToSprint = async (issueId: string) => {
    if (!activeSprint) {
      setError("Start a sprint before assigning issues.");
      return;
    }

    await handleAction(() =>
      axiosInstance.put(
        `/api/sprints/${activeSprint.id}/issues/${issueId}`
      )
    );
  };

  const removeFromSprint = async (issueId: string) => {
    if (!activeSprint) return;

    await handleAction(() =>
      axiosInstance.delete(
        `/api/sprints/${activeSprint.id}/issues/${issueId}`
      )
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6B778C]">
        Loading backlog...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
          <span>Projects</span>
          <ChevronRight className="h-4 w-4" />
          <span>{selectedProject?.name ?? "No project selected"}</span>
          <ChevronRight className="h-4 w-4" />
          <span>Backlog</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#172B4D]">
            Backlog
          </h1>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSprintForm(!showSprintForm)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Sprint
            </Button>

            <Button variant="ghost" size="icon" aria-label="Share backlog">
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="More backlog options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void fetchData()}
          >
            Retry
          </button>
        </div>
      )}

      {!selectedProject?.id ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#5E6C84]">
          Select a project to view its backlog.
        </div>
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto pr-2">

          {showSprintForm && (
            <section className="rounded-md border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Create a new sprint</h2>
                <button onClick={() => setShowSprintForm(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <input
                className="mb-3 w-full rounded border p-2 text-sm"
                placeholder="Sprint name"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
              />

              <textarea
                className="mb-3 w-full rounded border p-2 text-sm"
                placeholder="Sprint goal (optional)"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
              />

              <Button onClick={() => void createSprint()}>
                Create Sprint
              </Button>
            </section>
          )}

          {activeSprint && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <SectionHeader
                    title={activeSprint.name ?? "Active Sprint"}
                    count={sprintIssues.length}
                  />
                  <span className="ml-2 text-xs font-semibold text-green-700">
                    ACTIVE
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void completeSprint(activeSprint.id)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Sprint
                </Button>
              </div>

              <div className="divide-y rounded-b-md border border-t-0">
                {sprintIssues.map((issue) => (
                  <BacklogItem
                    key={issue.id}
                    issue={issue}
                    actionLabel="Remove"
                    onAction={() => void removeFromSprint(issue.id)}
                  />
                ))}

                {sprintIssues.length === 0 && (
                  <p className="p-3 text-sm text-[#6B778C]">
                    No issues in this sprint. Add issues from the backlog below.
                  </p>
                )}
              </div>
            </section>
          )}

          {!activeSprint && plannedSprint && (
            <section className="rounded-md border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">
                    {plannedSprint.name ?? "Planned Sprint"}
                  </h2>
                  <p className="text-xs text-[#6B778C]">
                    {plannedSprint.goal ?? "No sprint goal"}
                  </p>
                  <span className="text-xs text-orange-600">PLANNED</span>
                </div>

                <Button
                  size="sm"
                  onClick={() => void startSprint(plannedSprint.id)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Sprint
                </Button>
              </div>
            </section>
          )}

          {!activeSprint && !plannedSprint && (
            <p className="rounded-md border bg-white p-4 text-sm text-[#6B778C]">
              No sprint created yet. Use Create Sprint to get started.
            </p>
          )}

          <section>
            <SectionHeader
              title="Backlog"
              count={backlogIssues.length}
            />

            <div className="divide-y rounded-b-md border border-t-0">
              {backlogIssues.map((issue) => (
                <BacklogItem
                  key={issue.id}
                  issue={issue}
                  actionLabel={activeSprint ? "Add to Sprint" : undefined}
                  onAction={
                    activeSprint
                      ? () => void addToSprint(issue.id)
                      : undefined
                  }
                />
              ))}

              {isCreating ? (
                <form
                  className="p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createIssue();
                  }}
                >
                  <input
                    autoFocus
                    aria-label="New issue title"
                    placeholder="Enter issue title..."
                    className="w-full rounded border-2 border-[#0052CC] p-2 text-sm outline-none"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                  />

                  <div className="mt-2 flex gap-2">
                    <Button type="submit" size="sm" disabled={creating}>
                      {creating ? "Creating..." : "Create issue"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewTitle("");
                        setIsCreating(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <CreateIssueRow onClick={() => setIsCreating(true)} />
              )}

              {backlogIssues.length === 0 && !isCreating && (
                <p className="p-4 text-center text-sm text-[#6B778C]">
                  No backlog issues yet. Create an issue to get started.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({
  title,
  count,
}: {
  title: string;
  count: number;
}) => (
  <div className="flex items-center justify-between rounded-t-md border-b bg-[#F4F5F7] p-3">
    <div className="flex items-center gap-2">
      <ChevronDown className="h-4 w-4" />
      <span className="font-semibold">{title}</span>
      <span className="ml-2 text-xs text-[#5E6C84]">
        {count} issues
      </span>
    </div>
  </div>
);

const CreateIssueRow = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    className="flex w-full cursor-pointer items-center gap-2 p-3 text-left text-sm text-[#5E6C84] hover:bg-[#F4F5F7]"
    onClick={onClick}
  >
    <Plus className="h-4 w-4" />
    Create issue
  </button>
);

const BacklogItem = ({
  issue,
  actionLabel,
  onAction,
}: {
  issue: Issue;
  actionLabel?: string;
  onAction?: () => void;
}) => {
  const priorityMap: Record<string, string> = {
    HIGH: "text-red-500",
    MEDIUM: "text-orange-500",
    LOW: "text-blue-500",
  };

  const priorityColor =
    priorityMap[issue.priority ?? ""] ?? "text-gray-500";

  return (
    <div className="group flex items-center justify-between gap-3 p-3 hover:bg-[#F4F5F7]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-4 w-4 shrink-0 rounded bg-blue-500" />

        <span className="text-sm text-[#5E6C84]">
          {issue.key ?? "New issue"}
        </span>

        <span className="truncate">
          {issue.title ?? "Untitled issue"}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className={`text-xs font-bold ${priorityColor}`}>
          {issue.priority ?? "UNSET"}
        </span>

        <Avatar className="h-6 w-6">
          <AvatarImage src={issue.assignee?.avatar ?? undefined} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>

        {actionLabel && onAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
          >
            {actionLabel === "Remove" ? (
              <X className="mr-1 h-3 w-3" />
            ) : (
              <ArrowRight className="mr-1 h-3 w-3" />
            )}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Page;
