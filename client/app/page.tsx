
"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Circle,
  Clock3,
  FolderKanban,
  Plus,
  ListTodo,
} from "lucide-react";

import KanbanBoard from "@/components/KanbanBoard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";

const normalizeStatus = (status: unknown) => {
  const value = String(status ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (["TO_DO", "TODO", "OPEN", "BACKLOG", "NEW"].includes(value)) return "TODO";
  if (["INPROGRESS", "IN_PROGRESS", "IN_REVIEW", "REVIEW"].includes(value)) return "IN_PROGRESS";
  if (["DONE", "COMPLETE", "COMPLETED", "CLOSED", "RESOLVED"].includes(value)) return "DONE";

  return value;
};

export default function Home() {
  const router = useRouter();
  const { user, selectedProject } = useAuth();

  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIssues = useCallback(async () => {
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

      setIssues(data.filter(Boolean));
    } catch (error) {
      console.error("Dashboard issue loading failed:", error);
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    void fetchIssues();
  }, [fetchIssues]);

  const total = issues.length;
  const todo = issues.filter((issue) => normalizeStatus(issue.status) === "TODO").length;
  const inProgress = issues.filter((issue) => normalizeStatus(issue.status) === "IN_PROGRESS").length;
  const completed = issues.filter((issue) => normalizeStatus(issue.status) === "DONE").length;

  const stats = [
    {
      label: "Total issues",
      value: total,
      icon: <ListTodo className="h-5 w-5" />,
      color: "text-blue-600",
      background: "bg-blue-50",
    },
    {
      label: "To do",
      value: todo,
      icon: <Circle className="h-5 w-5" />,
      color: "text-slate-600",
      background: "bg-slate-100",
    },
    {
      label: "In progress",
      value: inProgress,
      icon: <Clock3 className="h-5 w-5" />,
      color: "text-amber-600",
      background: "bg-amber-50",
    },
    {
      label: "Completed",
      value: completed,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-emerald-600",
      background: "bg-emerald-50",
    },
  ];

  return (
    <div className="min-h-full space-y-7 p-5 md:p-8">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Workspace overview
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your team's work and project progress.
          </p>
        </div>

        <Button
          onClick={() => router.push("/create-project")}
          className="h-10 gap-2 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </section>

      {/* Project information */}
      <section className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Current project
          </p>
          <h2 className="truncate text-sm font-semibold text-slate-800">
            {selectedProject?.name || "No project selected"}
          </h2>
        </div>
        {selectedProject?.key && (
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {selectedProject.key}
          </span>
        )}
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Project overview
          </h2>
          <span className="text-xs text-slate-400">
            {loading ? "Updating..." : "Live project data"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  {stat.label}
                </span>
                <div className={`rounded-lg p-2 ${stat.background} ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {loading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Kanban board */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">
                Task board
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Manage and track issues across different stages.
            </p>
          </div>
        </div>

        <div className="min-h-[480px] rounded-xl border border-slate-200 bg-white p-4 md:p-5">
          <Suspense
            fallback={
              <div className="flex h-40 items-center justify-center text-sm text-slate-500">
                Loading board...
              </div>
            }
          >
            <KanbanBoard />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
