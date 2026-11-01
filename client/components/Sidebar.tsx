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
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Input } from "./ui/input";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import CreateIssuemodel from "./CreateIssuemodel";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";

const Sidebar = () => {
  const router = useRouter();
  const { user, logout, selectedProject, setSelectedProject } = useAuth();
  const [project, setProject] = useState([]);
  const [loading, setloading] = useState(false);
  const [showprojectmenu, setShowprojectmenu] = useState(false);
  const [showcreateissuemodel, setShowcreateissuemodel] = useState(false);
  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get("/api/projects");
        const userProjects = res.data.filter(
          (project: any) =>
            project.ownerId === user.id || project.memberIds?.includes(user.id),
        );
        setProject(userProjects);
        if (!selectedProject && userProjects.length > 0) {
          setSelectedProject(userProjects[0]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setloading(false);
      }
    };
    fetchProjects();
  }, [user]);
  // const currentProject = {
  //   id: "proj-1",
  //   name: "Platform Services",
  //   key: "PS",
  //   ownerId: "user-1",
  //   memberIds: ["user-1", "user-2"],
  //   createdAt: new Date().toISOString(),
  //   description: "Core platform infrastructure and services",
  // };
  // const allProjects: any = [
  //   {
  //     id: "proj-1",
  //     name: "Platform Services",
  //     key: "PS",
  //     ownerId: "user-1",
  //     memberIds: ["user-1", "user-2"],
  //     createdAt: new Date().toISOString(),
  //     description: "Core platform infrastructure and services",
  //   },
  // ];
  // const currentUser = {
  //   id: "user-1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   role: "ADMIN",
  //   group: "Engineering",
  //   avatar: "https://i.pravatar.cc/150?u=john",
  //   createdAt: new Date().toISOString(),
  // };
  if (loading) {
    return (
      <div className="flex h-screen w-64 items-center justify-center border-r bg-[#F4F5F7]">
        <span className="text-sm text-[#6B778C]">Loading projects…</span>
      </div>
    );
  }

  const redirectproject = () => {
    router.push("/create-project");
  };
  const HandleLogout = () => {
    logout();
    router.push("/login");
  };
  return (
    <div className="flex h-screen w-64 flex-col border-r bg-[#F4F5F7] text-[#42526E]">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 pt-6">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0052CC] text-white">
          <FolderKanban className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight text-[#172B4D]">
          Jira Clone
        </span>
      </div>

      {/* Project Selector */}
      {selectedProject && (
        <div className="px-2 py-3 border-b">
          <div className="relative">
            <button
              onClick={() => setShowprojectmenu(!showprojectmenu)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded bg-white border border-[#DFE1E6] hover:border-[#0052CC] transition-colors text-sm"
            >
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="flex-1 text-left truncate font-medium text-[#172B4D]">
                {selectedProject?.name}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showprojectmenu ? "rotate-180" : ""}`}
              />
            </button>
            {showprojectmenu && (
              <div className="absolute top-10 left-2 right-2 bg-white border border-[#DFE1E6] rounded shadow-lg z-50">
                {project.map((project: any) => (
                  <button
                    key={project.id}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#EBECF0] text-[#42526E]"
                    }`}
                  >
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    {project.name}
                  </button>
                ))}
                <div className="border-t px-3 py-2">
                  <button
                    onClick={redirectproject}
                    className="w-full text-left text-sm flex items-center gap-2 text-[#0052CC] hover:bg-[#EBECF0] py-1.5 px-1"
                  >
                    <Plus className="h-4 w-4" />
                    Create project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <div className="mb-6 px-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="bg-white pl-8 h-9 focus-visible:ring-[#0052CC]"
            />
          </div>
        </div>

        <nav className="space-y-1">
          <NavItem
            href="/"
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Kanban Board"
          />
          <NavItem
            href="/backlog"
            icon={<ListTodo className="h-4 w-4" />}
            label="Backlog"
          />
          <NavItem
            href="/projects"
            icon={<FolderKanban className="h-4 w-4" />}
            label="Projects"
          />
          <NavItem
            href="/team"
            icon={<Users className="h-4 w-4" />}
            label="Team"
          />
          <NavItem
            href="/profile"
            icon={<Settings className="h-4 w-4" />}
            label="Profile"
          />
        </nav>
      </div>
      <div className="border-t p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-2 px-2 py-2 rounded bg-white">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {user?.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#172B4D] truncate">
                {user?.name}
              </p>
              <p className="text-xs text-[#6B778C] truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <Button
          className="w-full justify-start gap-2 bg-[#0052CC] text-white hover:bg-[#0747A6]"
          onClick={() => setShowcreateissuemodel(true)}
        >
          <Plus className="h-4 w-4" />
          Create Issue
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-[#42526E] hover:bg-[#EBECF0]"
          onClick={HandleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
      <CreateIssuemodel
        isOpen={showcreateissuemodel}
        onClose={() => setShowcreateissuemodel(false)}
      />
    </div>
  );
};

export default Sidebar;
function NavItem({ href, icon, label, active }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#DEEBFF] text-[#0052CC]"
          : "hover:bg-[#EBECF0] text-[#42526E]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
