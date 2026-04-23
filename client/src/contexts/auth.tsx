import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { hasPerm, type PermAction } from "@/lib/permissions";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  branchId: number | null;
  isActive: boolean;
  isOnboarded: boolean;
  adminId: number | null;
}

type SubscriptionStatus = "none" | "active" | "expired" | "expiring_soon";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  subscriptionStatus: SubscriptionStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Admin always returns true. Others check permissions array. */
  hasPermission: (module: string, action: PermAction) => boolean;
  /** True if the user can see the module (has at least read permission) */
  canAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("none");

  const fetchSubscriptionStatus = useCallback(async (u: AuthUser) => {
    if (u.role === "superadmin") { setSubscriptionStatus("active"); return; }
    try {
      const res = await fetch("/api/plans/subscription/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionStatus(data.status || "none");
      } else {
        setSubscriptionStatus("none");
      }
    } catch {
      setSubscriptionStatus("none");
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        await fetchSubscriptionStatus(data);
      } else {
        setUser(null);
        setSubscriptionStatus("none");
      }
    } catch {
      setUser(null);
      setSubscriptionStatus("none");
    } finally {
      setIsLoading(false);
    }
  }, [fetchSubscriptionStatus]);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Login failed");
    }
    const data = await res.json();
    setUser(data.user);
    queryClient.clear();
    await fetchSubscriptionStatus(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setSubscriptionStatus("none");
    queryClient.clear();
  };

  const hasPermission = useCallback((module: string, action: PermAction): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return hasPerm(user.permissions ?? [], module, action);
  }, [user]);

  const canAccess = useCallback((module: string): boolean => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return hasPerm(user.permissions ?? [], module, "read");
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, subscriptionStatus, login, logout, hasPermission, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
