"use client";

import React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axiosInstance from "@/lib/Axiosinstance";
import { useAuth } from "@/lib/AuthContext";

export default function Page() {
  const router = useRouter();
  // const currentUser = {
  //   id: "user-1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   role: "ADMIN",
  //   group: "Engineering",
  //   avatar: "https://i.pravatar.cc/150?u=john",
  //   createdAt: new Date().toISOString(),
  // };
  const [projectData, setProjectData] = useState({ name: "", key: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  if (!user) {
    router.push("/login");
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;

    if (name === "key") {
      value = value.toUpperCase().replace(/[^A-Z]/g, "");
    }

    setProjectData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!projectData.name.trim()) {
        setError("Project name is required");
        setIsLoading(false);
        return;
      }

      if (!projectData.key.trim()) {
        setError("Project key is required");
        setIsLoading(false);
        return;
      }

      if (projectData.key.length > 5) {
        setError("Project key must be 5 characters or less");
        setIsLoading(false);
        return;
      }
      await axiosInstance.post("/api/projects", {
        name: projectData.name,
        key: projectData.key,
        ownerId: user.id,
      });

      router.push("/");
    } catch (err) {
      setError("Failed to create project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#172B4D]">
          Create a new project
        </h1>
        <p className="text-[#5E6C84] text-sm mt-2">
          Set up a new project to start managing your work
        </p>
      </div>

      <div className="max-w-md">
        <Card className="border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Project details</CardTitle>
            <CardDescription>
              Provide basic information about your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProject} className="space-y-4">
              {error && (
                <div className="flex gap-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#6B778C]">
                  Project name
                </label>
                <Input
                  type="text"
                  name="name"
                  placeholder="e.g., Platform Services"
                  required
                  className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
                  value={projectData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-[#6B778C]">
                  Project key
                </label>
                <Input
                  type="text"
                  name="key"
                  placeholder="e.g., PS"
                  maxLength={5}
                  required
                  className="h-10 border-[#DFE1E6] focus-visible:ring-[#0052CC]"
                  value={projectData.key}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-[#6B778C]">
                  Used for issue keys (e.g., {projectData.key || "PS"}-1).
                  Letters only, max 5 characters.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]"
                >
                  {isLoading ? "Creating..." : "Create project"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
