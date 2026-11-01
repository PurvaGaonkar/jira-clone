"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  group?: string;
  phone?: string;
  active?: boolean;
  createdAt?: any;
};
export type Project = {
  id: string;
  name: string;
  key?: string;
  ownerId?: string;
  memberIds?: string[];
  description?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  selectedProject: Project | null;
  setSelectedProject: (Project: Project | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // Load user from localStorage on first load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedproject = localStorage.getItem("selectedProject");
    if (storedproject) {
      setSelectedProject(JSON.parse(storedproject));
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };
  const handleslecteproject = (project: Project | null) => {
    setSelectedProject(project);
    if (project) {
      localStorage.setItem("selectedProject", JSON.stringify(project));
    } else {
      localStorage.removeItem("selectedProject");
    }
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        selectedProject,
        setSelectedProject: handleslecteproject,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
