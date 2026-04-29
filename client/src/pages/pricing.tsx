import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Zap,
  Shield,
  Star,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useCurrency, useExchangeRate } from "@/contexts/currency";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function usePlans() {
  return useQuery({
    queryKey: ["/api/plans"],
    queryFn: async () => {
      const res = await fetch("/api/plans", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load plans");
      return res.json();
    },
    staleTime: 0,
  });
}

function useSubStatus() {
  return useQuery({
    queryKey: ["/api/plans/subscription/status"],
    queryFn: async () => {
      const res = await fetch("/api/plans/subscription/status", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 0,
  });
}

export default function PricingPage() {
  const { data: plans = [], isLoading } = usePlans();
  const { data: subStatus } = useSubStatus();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [autoRenew, setAutoRenew] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const currency = useCurrency();
  // Plan prices are stored in INR — convert to the admin's selected currency
  const { data: exchangeRate = 1 } = useExchangeRate("INR", currency.code);

  const activePlans = (plans as any[]).filter((p: any) => p.isActive);
  const usedFreeTrial = subStatus?.usedFreeTrial === true;
  const isExpired = subStatus?.status === "expired";
  const isNone = !subStatus || subStatus.status === "none";

  const isFreeDisabled = (plan: any) =>
    plan.monthlyPrice === 0 && plan.yearlyPrice === 0 && usedFreeTrial;

  const handleSelectPlan = async (plan: any) => {
    if (isFreeDisabled(plan)) {
      toast({ title: "Free trial already used. Please choose a paid plan.", variant: "destructive" });
      return;
    }
    if (plan.monthlyPrice === 0 && plan.yearlyPrice === 0) {
      await activateFreePlan(plan.id);
      return;
    }
    setProcessingPlanId(plan.id);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast({ title: "Payment gateway failed to load. Check internet connection.", variant: "destructive" });
        return;
      }
      if (autoRenew && (billingCycle === "monthly" || billingCycle === "yearly")) {
        await startAutoSubscription(plan);
      } else {
        await startOneTimePayment(plan);
      }
    } finally {
      setProcessingPlanId(null);
    }
  };

  const activateFreePlan = async (planId: number) => {
    setProcessingPlanId(planId);
    try {
      const res = await fetch("/api/plans/subscription/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle: "monthly", autoRenew: false }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.message || "Failed to activate free plan", variant: "destructive" });
        return;
      }
      if (data.success) {
        toast({ title: "Free plan activated! Welcome." });
        window.location.href = "/";
      } else {
        toast({ title: "Activation failed. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setProcessingPlanId(null);
    }
  };

  const startOneTimePayment = async (plan: any) => {
    const res = await fetch("/api/plans/subscription/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, billingCycle, autoRenew: false }),
      credentials: "include",
    });
    const orderData = await res.json();
    if (!orderData.orderId) {
      toast({ title: orderData.message || "Failed to create payment order", variant: "destructive" });
      return;
    }
    const rzp = new (window as any).Razorpay({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "School ERP",
      description: `${orderData.planName} - ${billingCycle}`,
      order_id: orderData.orderId,
      prefill: { name: user?.name || "", email: user?.email || "" },
      theme: { color: "#0f766e" },
      handler: async (response: any) => {
        const verifyRes = await fetch("/api/plans/subscription/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            planId: plan.id, billingCycle, autoRenew: false,
          }),
          credentials: "include",
        });
        const result = await verifyRes.json();
        if (result.success) {
          toast({ title: "Payment successful! Plan activated." });
          window.location.href = "/";
        } else {
          toast({ title: "Payment verification failed", variant: "destructive" });
        }
      },
      modal: { ondismiss: () => setProcessingPlanId(null) },
    });
    rzp.open();
  };

  const startAutoSubscription = async (plan: any) => {
    const res = await fetch("/api/plans/subscription/auto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: plan.id, billingCycle }),
      credentials: "include",
    });
    const subData = await res.json();
    if (!subData.subscriptionId) return startOneTimePayment(plan);
    const rzp = new (window as any).Razorpay({
      key: subData.keyId,
      subscription_id: subData.subscriptionId,
      name: "School ERP",
      description: `${subData.planName} - ${billingCycle} Auto-renewal`,
      prefill: { name: user?.name || "", email: user?.email || "" },
      theme: { color: "#0f766e" },
      handler: async (response: any) => {
        const verifyRes = await fetch("/api/plans/subscription/verify-auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpaySubscriptionId: response.razorpay_subscription_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            planId: plan.id, billingCycle,
          }),
          credentials: "include",
        });
        const result = await verifyRes.json();
        if (result.success) {
          toast({ title: "Auto-renewal subscription activated!" });
          window.location.href = "/";
        } else {
          toast({ title: "Payment verification failed", variant: "destructive" });
        }
      },
      modal: { ondismiss: () => setProcessingPlanId(null) },
    });
    rzp.open();
  };

  const getPlanIcon = (slug: string) => {
    if (slug === "free") return <Zap className="w-6 h-6" />;
    if (slug === "basic") return <Shield className="w-6 h-6" />;
    return <Star className="w-6 h-6" />;
  };

  const getPlanPrice = (plan: any) => {
    if (plan.monthlyPrice === 0 && plan.yearlyPrice === 0) return "Free";
    const priceInr = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    const converted = Math.round(priceInr * exchangeRate);
    return currency.format(converted);
  };

  const getSavings = (plan: any) => {
    if (!plan.monthlyPrice || !plan.yearlyPrice) return null;
    const monthlyTotal = plan.monthlyPrice * 12;
    const savings = monthlyTotal - plan.yearlyPrice;
    if (savings <= 0) return null;
    return Math.round((savings / monthlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
      <div className="max-w-5xl w-full space-y-8">

        {/* Expiry / No-subscription banner */}
        {isExpired && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-red-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Your subscription has expired</p>
              <p className="text-sm text-red-600 mt-0.5">
                Your <strong>{subStatus?.plan?.name}</strong> plan has ended. Choose a new plan to continue accessing the platform.
              </p>
            </div>
          </div>
        )}
        {!isExpired && isNone && usedFreeTrial && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-amber-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Free trial already used</p>
              <p className="text-sm text-amber-600 mt-0.5">You've already used your free trial. Please choose a paid plan to continue.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            <Zap className="w-4 h-4" /> Choose Your Plan
          </div>
          <h1 className="text-4xl font-bold text-foreground">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Start free, scale as you grow. No hidden fees.</p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className={`relative w-12 h-6 rounded-full transition-colors ${billingCycle === "yearly" ? "bg-primary" : "bg-muted"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${billingCycle === "yearly" ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">Save up to 20%</span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" id="autoRenew" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} className="rounded" />
            <label htmlFor="autoRenew">Enable auto-renewal (credit card auto-debit)</label>
          </div>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : activePlans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border">
            <p className="font-medium">No plans available yet. Please contact support.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activePlans.map((plan: any) => {
              const savings = getSavings(plan);
              const isFeatured = plan.isFeatured;
              const isProcessing = processingPlanId === plan.id;
              const isFree = plan.monthlyPrice === 0 && plan.yearlyPrice === 0;
              const disabled = isFreeDisabled(plan);

              return (
                <div key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col gap-5 transition-all ${
                    disabled ? "border-border bg-muted/30 opacity-70"
                    : isFeatured ? "border-primary bg-primary/5 shadow-xl shadow-primary/20 scale-105"
                    : "border-border bg-card shadow-sm hover:shadow-md"
                  }`}
                >
                  {isFeatured && !disabled && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">Most Popular</span>
                    </div>
                  )}
                  {disabled && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-muted-foreground text-white text-xs font-bold px-4 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <Lock className="w-3 h-3" /> Trial Used
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${disabled ? "bg-muted text-muted-foreground" : isFeatured ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>
                      {getPlanIcon(plan.slug)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                      {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-foreground">{getPlanPrice(plan)}</span>
                      {!isFree && <span className="text-muted-foreground text-sm">/{billingCycle === "yearly" ? "year" : "month"}</span>}
                    </div>
                    {!isFree && currency.code !== "INR" && (
                      <p className="text-xs text-muted-foreground mt-0.5">≈ approx. converted from ₹{billingCycle === "yearly" ? plan.yearlyPrice?.toLocaleString("en-IN") : plan.monthlyPrice?.toLocaleString("en-IN")}</p>
                    )}
                    {isFree && plan.validityDays && (
                      <p className="text-xs text-muted-foreground mt-1">Valid for {plan.validityDays} days</p>
                    )}
                    {billingCycle === "yearly" && savings && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">Save {savings}% vs monthly</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/50">
                    <div className="text-center"><p className="font-bold text-foreground text-sm">{plan.maxStudents > 0 ? plan.maxStudents : "∞"}</p><p className="text-xs text-muted-foreground">Students</p></div>
                    <div className="text-center"><p className="font-bold text-foreground text-sm">{plan.maxStaff > 0 ? plan.maxStaff : "∞"}</p><p className="text-xs text-muted-foreground">Teachers</p></div>
                    <div className="text-center"><p className="font-bold text-foreground text-sm">{plan.maxBranches > 0 ? plan.maxBranches : "∞"}</p><p className="text-xs text-muted-foreground">Branches</p></div>
                  </div>

                  <div className="flex-1 space-y-2">
                    {(plan.features || []).map((feature: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full rounded-xl gap-2 ${isFeatured && !disabled ? "" : "variant-outline"}`}
                    variant={isFeatured && !disabled ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isProcessing || disabled}
                  >
                    {isProcessing ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : disabled ? (
                      <><Lock className="w-4 h-4" /> Trial Already Used</>
                    ) : (
                      <>{isFree ? "Get Started Free" : `Subscribe ${billingCycle === "yearly" ? "Yearly" : "Monthly"}`} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </Button>

                  {autoRenew && !isFree && (
                    <p className="text-xs text-center text-muted-foreground">Auto-renews. Cancel anytime.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Secured by Razorpay. Supports UPI, Credit/Debit Cards, Net Banking. All prices are inclusive of GST.
        </p>
      </div>
    </div>
  );
}
