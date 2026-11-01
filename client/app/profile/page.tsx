
"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import {
  Mail, Save, Upload, Lock, ShieldAlert, Loader2,
} from "lucide-react";

const Page = () => {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [avatar, setAvatar] = useState(user?.avatar || "");

  if (!user) {
    return <div className="p-6">User not found. Please log in again.</div>;
  }

  const saveProfile = async () => {
    try {
      setLoading(true);
      setMessage("");

      await axiosInstance.put(`/api/users/${user.id}`, {
        name,
        phone,
        group: user.group,
      });

      setMessage("Profile updated successfully.");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image must be smaller than 2 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setMessage("");

      const response = await axiosInstance.post(
        "/api/users/profile/avatar",
        formData
      );

      setAvatar(response.data.avatar);
      setMessage("Profile picture updated successfully.");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Image upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const requestEmailChange = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await axiosInstance.post(
        "/api/users/email-change/request",
        { email }
      );

      setMessage(response.data.message);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Email verification request failed.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await axiosInstance.post(
        "/api/users/password/change",
        { currentPassword, newPassword }
      );

      setMessage(response.data.message);
      localStorage.removeItem("sessionToken");
      setTimeout(() => router.push("/login"), 1200);
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Password update failed.");
    } finally {
      setLoading(false);
    }
  };

  const deactivateAccount = async () => {
    const password = window.prompt(
      "Enter your current password to deactivate your account:"
    );

    if (!password) return;

    const confirmed = window.confirm(
      "Are you sure? You will no longer be able to log in."
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await axiosInstance.post("/api/users/deactivate", { password });

      localStorage.removeItem("sessionToken");
      router.push("/login");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Account deactivation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-[#F4F5F7] p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-[#172B4D]">
          Profile Settings
        </h1>
        <p className="text-[#5E6C84]">
          Manage your personal information and account security.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-md border bg-white p-3 text-sm text-[#172B4D]">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>About You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <Avatar className="mb-4 h-24 w-24">
                <AvatarImage src={avatar || "/placeholder.svg"} />
                <AvatarFallback>{name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>

              <h2 className="text-xl font-semibold">{name}</h2>
              <Badge className="mt-2">{user.role}</Badge>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => uploadAvatar(e.target.files?.[0])}
              />

              <Button
                className="mt-5 w-full bg-[#0052CC] text-white"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Profile Picture
              </Button>

              <div className="mt-5 w-full space-y-3 border-t pt-4 text-sm">
                <p className="flex items-center gap-2 break-all">
                  <Mail className="h-4 w-4" /> {user.email}
                </p>
                <p>Group: {user.group || "Not assigned"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={requestEmailChange}
                  disabled={loading || email === user.email}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Request Email Verification
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Role</label>
                  <Input disabled value={user.role || ""} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Team</label>
                  <Input disabled value={user.group || ""} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Change Password
              </CardTitle>
              <CardDescription>
                Verify your current password before setting a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                At least 8 characters, including uppercase, lowercase, number
                and special character.
              </p>
              <Button onClick={changePassword} disabled={loading}>
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="h-5 w-5" /> Deactivate Account
              </CardTitle>
              <CardDescription>
                Deactivation blocks login. Your historical tasks and work logs
                remain preserved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={deactivateAccount}
                disabled={loading}
              >
                Deactivate My Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg bg-white p-3 shadow">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Please wait...</span>
        </div>
      )}
    </div>
  );
};

export default Page;
