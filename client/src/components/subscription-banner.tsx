import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, X, CreditCard, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";

function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["/api/plans/subscription/status"],
    queryFn: async () => {
      const res = await fetch("/api/plans/subscription/status", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
    refetchInterval: 300000,
  });
}

// ── Top warning bar — shown when plan is expiring soon ────────────────────────
export function SubscriptionBanner() {
  const { data: subStatus } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  if (!subStatus || user?.role === "superadmin") return null;
  if (dismissed) return null;
  if (subStatus.status !== "expiring_soon") return null;

  const d = subStatus.daysLeft as number;
  const bgColor = d <= 1 ? "bg-red-600" : d <= 3 ? "bg-orange-500" : "bg-amber-500";
  const dayLabel = d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;

  return (
    <div className={`${bgColor} text-white px-4 py-2.5 flex items-center justify-between shadow-sm`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <p className="text-sm font-medium">
          Your <strong>{subStatus.plan?.name}</strong> expires <strong>{dayLabel}</strong>. Renew now to avoid interruption.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-white text-inherit hover:bg-white/90 rounded-lg h-7 text-xs gap-1 font-semibold"
          style={{ color: d <= 1 ? "#dc2626" : d <= 3 ? "#ea580c" : "#d97706" }}
          onClick={() => navigate("/pricing")}
        >
          <CreditCard className="w-3.5 h-3.5" /> Renew Now
        </Button>
        <button onClick={() => setDismissed(true)} className="p-1 hover:bg-black/20 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Session popup — shown once per day when ≤5 days remain ───────────────────
export function ExpiryPopup() {
  const { data: subStatus } = useSubscriptionStatus();
  const [show, setShow] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (subStatus?.status === "expiring_soon") {
      const key = `expiry_popup_shown_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        setShow(true);
        sessionStorage.setItem(key, "1");
      }
    }
  }, [subStatus]);

  if (!show || user?.role === "superadmin") return null;

  const d = subStatus?.daysLeft as number;
  const dayLabel = d <= 0 ? "today" : d === 1 ? "1 day" : `${d} days`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-amber-200 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Plan Expiring Soon!</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Your <strong>{subStatus?.plan?.name}</strong> expires in{" "}
            <strong className="text-amber-600">{dayLabel}</strong>.
            Renew now to keep access to all features.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShow(false)}>
            Remind Later
          </Button>
          <Button className="flex-1 rounded-xl gap-2" onClick={() => { setShow(false); navigate("/pricing"); }}>
            <CreditCard className="w-4 h-4" /> Renew Now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Plan expired full-screen block ────────────────────────────────────────────
export function PlanExpiredScreen() {
  const [, navigate] = useLocation();
  const { logout, plan } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-background to-background p-4">
      <div className="max-w-md w-full text-center space-y-6 p-10 bg-card rounded-2xl border border-red-100 shadow-2xl">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your Plan Has Expired</h2>
          {plan && (
            <p className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wide">
              {plan.name}
            </p>
          )}
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Your subscription has expired and access to the platform has been suspended.
            Please renew your plan to restore full access to all features.
          </p>
        </div>
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => navigate("/pricing")}
          >
            <CreditCard className="w-5 h-5" />
            Renew Plan Now
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Subscription guard (legacy — kept for compatibility) ─────────────────────
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: subStatus, isLoading } = useSubscriptionStatus();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [location] = useLocation() as any;

  if (user?.role === "superadmin") return <>{children}</>;
  if (location === "/pricing" || location === "/login") return <>{children}</>;
  if (isLoading) return <>{children}</>;

  if (!subStatus || subStatus.status === "expired" || subStatus.status === "none") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 text-center space-y-6 p-8 bg-card rounded-2xl border shadow-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {subStatus?.status === "expired" ? "Subscription Expired" : "No Active Subscription"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {subStatus?.status === "expired"
                ? "Your subscription has expired. Please renew to continue using the platform."
                : "Please subscribe to a plan to access the platform."}
            </p>
          </div>
          <Button size="lg" className="w-full rounded-xl gap-2" onClick={() => navigate("/pricing")}>
            <CreditCard className="w-5 h-5" />
            {subStatus?.status === "expired" ? "Renew Subscription" : "View Plans"}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
