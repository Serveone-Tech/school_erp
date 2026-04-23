// ─── subscription-banner.tsx ──────────────────────────────────────────────────
// App.tsx ya Layout mein include karo — plan expiry warning dikhata hai

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth";

function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["/api/plans/subscription/status"],
    queryFn: async () => {
      const res = await fetch("/api/plans/subscription/status", {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000, // 1 min cache
    refetchInterval: 300000, // check every 5 min
  });
}

export function SubscriptionBanner() {
  const { data: subStatus } = useSubscriptionStatus();
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  if (!subStatus || user?.role === "superadmin") return null;
  if (dismissed) return null;
  if (subStatus.status !== "expiring_soon") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <p className="text-sm font-medium">
          Your subscription expires in{" "}
          <strong>{subStatus.daysLeft} days</strong>. Renew now to avoid
          interruption.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-white text-amber-600 hover:bg-white/90 rounded-lg h-7 text-xs gap-1"
          onClick={() => navigate("/pricing")}
        >
          <CreditCard className="w-3.5 h-3.5" /> Renew Now
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-amber-600 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Expiry popup modal ───────────────────────────────────────────────────────
export function ExpiryPopup() {
  const { data: subStatus } = useSubscriptionStatus();
  const [show, setShow] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (subStatus?.status === "expiring_soon" && subStatus.daysLeft <= 3) {
      // Show once per session
      const key = `expiry_popup_shown_${new Date().toDateString()}`;
      if (!sessionStorage.getItem(key)) {
        setShow(true);
        sessionStorage.setItem(key, "1");
      }
    }
  }, [subStatus]);

  if (!show || user?.role === "superadmin") return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-amber-200 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Plan Expiring Soon!
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            Your <strong>{subStatus?.plan?.name}</strong> plan expires in{" "}
            <strong className="text-amber-600">
              {subStatus?.daysLeft} days
            </strong>
            . Renew now to keep access to all features.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => setShow(false)}
          >
            Remind Later
          </Button>
          <Button
            className="flex-1 rounded-xl gap-2"
            onClick={() => {
              setShow(false);
              navigate("/pricing");
            }}
          >
            <CreditCard className="w-4 h-4" /> Renew Now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Subscription guard — redirect expired users to pricing ──────────────────
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: subStatus, isLoading } = useSubscriptionStatus();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [location] = useLocation() as any;

  // SuperAdmin bypass
  if (user?.role === "superadmin") return <>{children}</>;

  // Don't block pricing page
  if (location === "/pricing" || location === "/login") return <>{children}</>;

  if (isLoading) return <>{children}</>;

  if (
    !subStatus ||
    subStatus.status === "expired" ||
    subStatus.status === "none"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 text-center space-y-6 p-8 bg-card rounded-2xl border shadow-lg">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <CreditCard className="w-10 h-10 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {subStatus?.status === "expired"
                ? "Subscription Expired"
                : "No Active Subscription"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {subStatus?.status === "expired"
                ? "Your subscription has expired. Please renew to continue using the platform."
                : "Please subscribe to a plan to access the platform."}
            </p>
          </div>
          <Button
            size="lg"
            className="w-full rounded-xl gap-2"
            onClick={() => navigate("/pricing")}
          >
            <CreditCard className="w-5 h-5" />
            {subStatus?.status === "expired"
              ? "Renew Subscription"
              : "View Plans"}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
