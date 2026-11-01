
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
import { AlertCircle, ArrowRight, FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const Page = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = isSignUp
        ? await axiosInstance.post("/api/users/signup", {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: "USER",
            avatar: "https://i.pravatar.cc/150?u=john",
          })
        : await axiosInstance.post("/api/users/login", {
            email: formData.email,
            password: formData.password,
          });

      const data = response.data?.data ?? response.data;

      const token = data?.sessionToken ?? data?.token;
      const user = data?.user ?? data;

      if (!token) {
        console.error("Authentication response:", response.data);
        throw new Error(
          "The server did not return a session token. Check the backend login response."
        );
      }

      if (!user?.id) {
        console.error("Authentication response:", response.data);
        throw new Error("User details were not returned by the server.");
      }

      login(user, token);

      router.replace(isSignUp ? "/setup-project" : "/");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          "Something went wrong. Please try again."
      );

      console.error("Authentication error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <FolderKanban className="h-6 w-6 text-blue-600" />
          </div>

          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </CardTitle>

          <CardDescription>
            {isSignUp
              ? "Sign up to get started with your Jira workspace."
              : "Log in to continue to your Jira workspace."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {String(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "Please wait..."
                : isSignUp
                  ? "Create Account"
                  : "Login"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            {isSignUp
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="font-medium text-blue-600 hover:underline"
            >
              {isSignUp ? "Login" : "Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Page;
