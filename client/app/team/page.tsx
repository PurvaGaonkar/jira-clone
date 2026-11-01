"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/Axiosinstance";
import { Mail, Trash2, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";

const page = () => {
  const { selectedProject, setSelectedProject } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fetchMembers = async () => {
    if (!selectedProject?.id) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/api/projects/${selectedProject?.id}`,
      );
      setTeamMembers(res.data.members || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMembers();
  }, [selectedProject]);
  // const teamMembers = [
  //   {
  //     id: "user-1",
  //     name: "John Doe",
  //     email: "john@example.com",
  //     role: "ADMIN",
  //     group: "Engineering",
  //     avatar: "https://i.pravatar.cc/150?u=john",
  //     createdAt: new Date().toISOString(),
  //   },
  //   {
  //     id: "user-2",
  //     name: "Jane Smith",
  //     email: "jane@example.com",
  //     role: "MEMBER",
  //     group: "Design",
  //     avatar: "https://i.pravatar.cc/150?u=jane",
  //     createdAt: new Date().toISOString(),
  //   },
  // ];

  const handleAddmember = async () => {
    if (!selectedProject) return;
    const name = prompt("Enter member name:");
    if (!name) return;

    const email =
      prompt("Enter member email:") ||
      `${name.toLowerCase().replace(" ", ".")}@example.com`;

    const group =
      prompt("Enter group (Engineering / Design / Admin):") || "Engineering";
    const password = email.split("@")[0] + "@123";
    const avatar = `https://i.pravatar.cc/150?u=${email}`;
    try {
      setLoading(true);
      const res = await axiosInstance.post("/api/users/signup", {
        name: name,
        email: email,
        password: password,
        role: "MEMBER",
        group: group,
        avatar: avatar,
      });
      const newuser = res.data;
      const updatedmemberids = Array.from(
        new Set([...(selectedProject.memberIds || []), newuser.id]),
      );
      await axiosInstance.put(`/api/projects/${selectedProject.id}`, {
        name: selectedProject.name,
        description: selectedProject.description,
        memberIds: updatedmemberids,
      });
      setSelectedProject({ ...selectedProject, memberIds: updatedmemberids });
      await fetchMembers();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteMember = async (userid: string, name: string) => {
    if (!selectedProject) return;
    if (!confirm(`Remove ${name} from project?`)) return;
    try {
      setLoading(true);
      const updatedmemberids = selectedProject?.memberIds?.filter(
        (id: string) => id !== userid,
      );
      await axiosInstance.put(`/api/projects/${selectedProject.id}`, {
        name: selectedProject.name,
        description: selectedProject.description,
        memberIds: updatedmemberids,
      });
      setSelectedProject({ ...selectedProject, memberIds: updatedmemberids });
      await fetchMembers();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  const groupMap = new Map<string, any[]>();
  teamMembers.forEach((member: any) => {
    if (!groupMap.has(member.group)) {
      groupMap.set(member.group, []);
    }
    groupMap.get(member.group)?.push(member);
  });
  const groups = Array.from(groupMap.keys());
  const filteredMembers = selectedGroup
    ? teamMembers.filter((member: any) => member.group === selectedGroup)
    : teamMembers;
  return (
    <div className="p-8 h-full flex flex-col bg-[#F4F5F7] relative">
      {/* Loader */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
          <p className="text-sm text-[#6B778C]">Updating team…</p>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#172B4D]">Team Management</h1>
          <p className="text-[#5E6C84] text-sm mt-1">
            {teamMembers.length} team members
          </p>
        </div>
        <Button
          className="bg-[#0052CC] text-white hover:bg-[#0747A6]"
          onClick={handleAddmember}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </header>

      {/* Group Filter */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={selectedGroup === null ? "default" : "outline"}
          onClick={() => setSelectedGroup(null)}
          className={selectedGroup === null ? "bg-[#0052CC] text-white" : ""}
        >
          All Members
        </Button>
        {groups.map((group) => (
          <Button
            key={group}
            variant={selectedGroup === group ? "default" : "outline"}
            onClick={() => setSelectedGroup(group)}
            className={selectedGroup === group ? "bg-[#0052CC] text-white" : ""}
          >
            {group}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 rounded-lg border bg-white overflow-y-auto">
        <Table>
          <TableHeader className="bg-[#F4F5F7] sticky top-0">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Group</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold">{member.name}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {member.email}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      className={
                        member.role === "ADMIN"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="bg-[#EBECF0]">
                      {member.group}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDeleteMember(member.id, member.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No members found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default page;
