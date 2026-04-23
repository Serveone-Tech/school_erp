import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

export interface ParentStudent {
  id: number;
  name: string;
  admissionNo: string;
  classId: number | null;
  sectionId: number | null;
  profilePicture: string | null;
  fatherName: string | null;
  className?: string | null;
  sectionName?: string | null;
}

export interface ParentUser {
  id: number;
  email: string;
  fatherName: string | null;
  studentIds: number[];
  isActive: boolean;
  adminId: number;
  lastLoginAt: string | null;
}

interface ParentAuthContextType {
  parent: ParentUser | null;
  activeStudent: ParentStudent | null;
  activeStudentId: number | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchChild: (studentId: number) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refetchMe: () => Promise<void>;
}

const ParentAuthContext = createContext<ParentAuthContextType | null>(null);

export function ParentAuthProvider({ children }: { children: React.ReactNode }) {
  const [parent, setParent] = useState<ParentUser | null>(null);
  const [activeStudent, setActiveStudent] = useState<ParentStudent | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setParent(data.parent);
        setActiveStudent(data.activeStudent);
        setActiveStudentId(data.activeStudentId ?? null);
      } else {
        setParent(null);
        setActiveStudent(null);
        setActiveStudentId(null);
      }
    } catch {
      setParent(null);
      setActiveStudent(null);
      setActiveStudentId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/parent/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Login failed");
    }
    queryClient.clear();
    await fetchMe();
  };

  const logout = async () => {
    await fetch("/api/parent/logout", { method: "POST", credentials: "include" });
    setParent(null);
    setActiveStudent(null);
    setActiveStudentId(null);
    queryClient.clear();
  };

  const switchChild = async (studentId: number) => {
    const res = await fetch("/api/parent/switch-child", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ studentId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to switch child");
    }
    queryClient.clear();
    await fetchMe();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch("/api/parent/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to change password");
    }
  };

  return (
    <ParentAuthContext.Provider value={{
      parent, activeStudent, activeStudentId, isLoading,
      login, logout, switchChild, changePassword, refetchMe: fetchMe,
    }}>
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  const ctx = useContext(ParentAuthContext);
  if (!ctx) throw new Error("useParentAuth must be used inside ParentAuthProvider");
  return ctx;
}
