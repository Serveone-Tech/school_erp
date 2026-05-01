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

interface PlanLimits {
  maxStudents: number;
  maxStaff: number;
  maxBranches: number;
  maxUsers: number;
  allowedModules: string[];
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  subscriptionStatus: SubscriptionStatus;
  plan: PlanLimits | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Admin always returns true. Others check permissions array. */
  hasPermission: (module: string, action: PermAction) => boolean;
  /** True if the user can see the module (has at least read permission) */
  canAccess: (module: string) => boolean;
  /** True if module is included in the active plan (or no plan restriction) */
  planAllows: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("none");
  const [plan, setPlan] = useState<PlanLimits | null>(null);

  const fetchSubscriptionStatus = useCallback(async (u: AuthUser) => {
    if (u.role === "superadmin") { setSubscriptionStatus("active"); setPlan(null); return; }
    try {
      const res = await fetch("/api/plans/subscription/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionStatus(data.status || "none");
        if (data.plan) {
          setPlan({
            maxStudents: data.plan.maxStudents ?? 0,
            maxStaff: data.plan.maxStaff ?? 0,
            maxBranches: data.plan.maxBranches ?? 0,
            maxUsers: data.plan.maxUsers ?? 0,
            allowedModules: data.plan.allowedModules ?? [],
            name: data.plan.name ?? "",
          });
        } else {
          setPlan(null);
        }
      } else {
        setSubscriptionStatus("none");
        setPlan(null);
      }
    } catch {
      setSubscriptionStatus("none");
      setPlan(null);
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
    setPlan(null);
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

  // Returns true if the plan allows this module (empty allowedModules = all allowed)
  const planAllows = useCallback((module: string): boolean => {
    if (!plan || plan.allowedModules.length === 0) return true;
    return plan.allowedModules.includes(module);
  }, [plan]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, subscriptionStatus, plan, login, logout, hasPermission, canAccess, planAllows }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
