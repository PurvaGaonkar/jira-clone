
"use client";

import {
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import CreateIssuemodel from "./CreateIssuemodel";
import NotificationBell from "./NotificationBell";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";

const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const { user, logout, selectedProject, setSelectedProject } = useAuth();

  const [project, setProject] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showprojectmenu, setShowprojectmenu] = useState(false);
  const [showcreateissuemodel, setShowcreateissuemodel] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      setLoading(true);

      try {
        const res = await axiosInstance.get("/api/projects");

        const userProjects = res.data.filter(
          (item: any) =>
            item.ownerId === user.id ||
            (Array.isArray(item.memberIds) &&
              item.memberIds.includes(user.id))
        );

        setProject(userProjects);

        if (!selectedProject && userProjects.length > 0) {
          setSelectedProject(userProjects[0]);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
            Jira Clone
          </h1>
          <p className="text-[11px] text-slate-400">
            Project workspace
          </p>
        </div>
      </div>

      {/* Project selector */}
      <div className="px-4 py-5">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[1.2px] text-slate-400">
          Current project
        </p>

        {loading ? (
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowprojectmenu(!showprojectmenu)}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm hover:border-blue-300"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
              <span className="flex-1 truncate text-left font-medium text-slate-700">
                {selectedProject?.name || "Select a project"}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showprojectmenu && (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                {project.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedProject(item);
                      setShowprojectmenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      selectedProject?.id === item.id
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-600"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}

                <div className="mt-1 border-t border-slate-100 p-2">
                  <button
                    onClick={() => {
                      setShowprojectmenu(false);
                      router.push("/create-project");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4" />
                    Create project
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4">
        <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-slate-400">
          Workspace
        </p>

        <div className="mb-5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search..."
              className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 text-sm"
            />
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem
            href="/"
            icon={<LayoutDashboard />}
            label="Kanban Board"
            active={pathname === "/"}
          />
          <NavItem
            href="/backlog"
            icon={<ListTodo />}
            label="Backlog"
            active={pathname === "/backlog"}
          />
          <NavItem
            href="/projects"
            icon={<FolderKanban />}
            label="Projects"
            active={pathname === "/projects"}
          />
          <NavItem
            href="/team"
            icon={<Users />}
            label="Team"
            active={pathname === "/team"}
          />
          <NavItem
            href="/profile"
            icon={<Settings />}
            label="Profile"
            active={pathname === "/profile"}
          />
        </nav>
      </div>

      {/* User section */}
      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex items-center justify-between px-2">
          <span className="text-xs font-semibold text-slate-600">
            Notifications
          </span>
          <NotificationBell />
        </div>

        {user && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-blue-100 text-sm font-semibold text-blue-700">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <Button
          className="mb-2 h-10 w-full justify-start gap-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => setShowcreateissuemodel(true)}
        >
          <Plus className="h-4 w-4" />
          Create Issue
        </Button>

        <Button
          variant="ghost"
          className="h-9 w-full justify-start gap-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>

      <CreateIssuemodel
        isOpen={showcreateissuemodel}
        onClose={() => setShowcreateissuemodel(false)}
      />
    </aside>
  );
};

export default Sidebar;

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {icon}
      </span>
      {label}
    </Link>
  );
}
