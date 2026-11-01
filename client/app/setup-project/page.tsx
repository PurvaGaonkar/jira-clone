"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { AlertCircle, ArrowRight, Car, FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const page = () => {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    key: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  // const currentProject = {
  //   id: "proj-1",
  //   name: "Platform Services",
  //   key: "PS",
  //   ownerId: "user-1",
  //   memberIds: ["user-1", "user-2"],
  //   createdAt: new Date().toISOString(),
  //   description: "Core platform infrastructure and services",
  // };
  // const currentUser = {
  //   id: "user-1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   role: "ADMIN",
  //   group: "Engineering",
  //   avatar: "https://i.pravatar.cc/150?u=john",
  //   createdAt: new Date().toISOString(),
  // };
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setError("");
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate inputs
      if (!formData.name.trim()) {
        setError("Project name is required");
        setIsLoading(false);
        return;
      }

      if (!formData.key.trim()) {
        setError("Project key is required");
        setIsLoading(false);
        return;
      }
      await axiosInstance.post("/api/projects", {
        name: formData.name,
        key: formData.key,
        ownerId: user?.id,
      });
      // Redirect to board
      router.push("/");
    } catch (err) {
      setError("Failed to create project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleskip = () => {
    router.push("/");
  };

  if (user === null) {
    router.push("/login");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-[#0052CC] text-white">
            <FolderKanban className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#172B4D]">
              Create your first project
            </h1>
            <p className="text-sm text-[#6B778C] mt-2">Welcome, {user?.name}!</p>
          </div>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">Set up your project</CardTitle>
            <CardDescription>
              Give your project a name and key to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  value={formData.name}
                  onChange={handleChange}
                />
                <p className="text-xs text-[#6B778C]">
                  This is the display name for your project
                </p>
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
                  value={formData.key}
                  onChange={handleChange}
                />
                <p className="text-xs text-[#6B778C]">
                  Used for issue keys (e.g., {formData.key || "PS"}-1). Letters
                  only, max 5 characters.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0052CC] text-white hover:bg-[#0747A6]"
                >
                  {isLoading ? "Creating project..." : "Create project"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleskip}
                  disabled={isLoading}
                  className="w-full bg-transparent"
                >
                  Skip for now
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
          <p className="text-sm text-blue-700">
            You can create additional projects anytime from the Projects page
            after you get started.
          </p>
        </div>
      </div>
    </div>
  );
};

export default page;
