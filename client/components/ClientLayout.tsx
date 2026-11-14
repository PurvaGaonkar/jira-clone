
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Sidebar from "./Sidebar";

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const publicPages = ["/login", "/setup-project"];
    const isPublic = publicPages.includes(pathname);

    if (!isAuthenticated && !isPublic) {
      router.replace("/login");
    } else if (isAuthenticated && pathname === "/login") {
      router.replace("/");
    }

    setIsReady(true);
  }, [isAuthenticated, pathname, router]);

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  const isAuthPage = ["/login", "/setup-project"].includes(pathname);

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FA] text-slate-800">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default ClientLayout;
