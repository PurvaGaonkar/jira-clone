
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
  login: (user: User, token: string) => void;
  logout: () => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("sessionToken");
      const storedProject = localStorage.getItem("selectedProject");

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("sessionToken");
      }

      if (storedProject) {
        setSelectedProject(JSON.parse(storedProject));
      }
    } catch (error) {
      console.error("Failed to restore authentication:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("sessionToken");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem("sessionToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("sessionToken");
  };

  const handleSelectProject = (project: Project | null) => {
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
        isAuthenticated: isLoaded && !!user,
        login,
        logout,
        selectedProject,
        setSelectedProject: handleSelectProject,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
};
