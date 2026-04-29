import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  RefreshCw,
  Building2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

function usePlans() {
  return useQuery({
    queryKey: ["/api/plans"],
    queryFn: async () => {
      const res = await fetch("/api/plans", { credentials: "include" });
      return res.json();
    },
    staleTime: 0,
  });
}

function useAllSubscriptions() {
  return useQuery({
    queryKey: ["/api/plans/admin/subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/plans/admin/subscriptions", {
        credentials: "include",
      });
      return res.json();
    },
    staleTime: 0,
  });
}

function useAllPayments() {
  return useQuery({
    queryKey: ["/api/plans/admin/payments"],
    queryFn: async () => {
      const res = await fetch("/api/plans/admin/payments", { credentials: "include" });
      return res.json();
    },
    staleTime: 0,
  });
}

function useAllUsers() {
  return useQuery({
    queryKey: ["/api/plans/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/plans/admin/users", { credentials: "include" });
      return res.json();
    },
    staleTime: 0,
  });
}

const emptyPlan = {
  name: "",
  slug: "",
  description: "",
  monthlyPrice: 0,
  yearlyPrice: 0,
  validityDays: "",
  features: "",
  maxStudents: 50,
  maxBranches: 1,
  maxStaff: 5,
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
};

export default function SuperAdminDashboard() {
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: subscriptions = [], isLoading: subsLoading } = useAllSubscriptions();
  const { data: payments = [], isLoading: paymentsLoading } = useAllPayments();
  const { data: allUsers = [], isLoading: usersLoading } = useAllUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [planModal, setPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [form, setForm] = useState(emptyPlan);
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({ planId: "", billingCycle: "monthly", durationDays: 30 });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
    queryClient.invalidateQueries({ queryKey: ["/api/plans/admin/subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/plans/admin/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/plans/admin/users"] });
  };

  const overrideMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/plans/admin/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Override failed");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Subscription overridden successfully" });
      setOverrideModal(false);
      setOverrideTarget(null);
    },
    onError: () => toast({ title: "Override failed", variant: "destructive" }),
  });

  const createPlanMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Plan created successfully" });
      setPlanModal(false);
      setForm(emptyPlan);
    },
    onError: () =>
      toast({ title: "Failed to create plan", variant: "destructive" }),
  });

  const updatePlanMut = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Plan updated" });
      setPlanModal(false);
      setEditingPlan(null);
      setForm(emptyPlan);
    },
  });

  const deletePlanMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/plans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Plan deleted" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      monthlyPrice: Number(form.monthlyPrice),
      yearlyPrice: Number(form.yearlyPrice),
      validityDays: form.validityDays ? Number(form.validityDays) : null,
      maxStudents: Number(form.maxStudents),
      maxBranches: Number(form.maxBranches),
      maxStaff: Number(form.maxStaff),
      sortOrder: Number(form.sortOrder),
      features:
        typeof form.features === "string"
          ? form.features.split("\n").filter(Boolean)
          : form.features,
    };
    if (editingPlan) {
      updatePlanMut.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMut.mutate(data);
    }
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      ...plan,
      features: Array.isArray(plan.features)
        ? plan.features.join("\n")
        : plan.features || "",
      validityDays: plan.validityDays || "",
    });
    setPlanModal(true);
  };

  const set = (k: string) => (e: any) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  // Stats
  const activeSubsCount = subscriptions.filter((s: any) => s.subscription?.status === "active").length;
  const totalRevenue = payments.filter((p: any) => p.payment?.status === "captured").reduce((sum: number, p: any) => sum + (p.payment?.amount || 0) / 100, 0);
  const totalRegistered = Array.isArray(allUsers) ? allUsers.length : 0;

  const statusBadge = (status: string) => {
    if (status === "active")
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {status}
        </Badge>
      );
    if (status === "expired")
      return <Badge variant="destructive">{status}</Badge>;
    if (status === "cancelled")
      return <Badge variant="secondary">{status}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> SuperAdmin Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage plans, subscriptions and payments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Total Plans
          </p>
          <p className="text-3xl font-bold text-foreground mt-1">
            {plans.length}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <p className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">
            Active Subscribers
          </p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">
            {activeSubsCount}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-blue-200 bg-blue-50/30 shadow-sm">
          <p className="text-xs text-blue-700 uppercase tracking-wider font-semibold">
            Total Payments
          </p>
          <p className="text-3xl font-bold text-blue-700 mt-1">
            {payments.length}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-purple-200 bg-purple-50/30 shadow-sm">
          <p className="text-xs text-purple-700 uppercase tracking-wider font-semibold">Total Revenue</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">₹{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-orange-200 bg-orange-50/30 shadow-sm">
          <p className="text-xs text-orange-700 uppercase tracking-wider font-semibold">Registered Users</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{totalRegistered}</p>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* ── Plans Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-end">
            <Button
              className="rounded-xl gap-2"
              onClick={() => {
                setEditingPlan(null);
                setForm(emptyPlan);
                setPlanModal(true);
              }}
            >
              <Plus className="w-4 h-4" /> Add Plan
            </Button>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Monthly Price</TableHead>
                  <TableHead>Yearly Price</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {plan.slug}
                        </p>
                        {plan.isFeatured && (
                          <Badge className="text-[10px] mt-0.5 bg-primary/10 text-primary">
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {plan.monthlyPrice === 0
                        ? "Free"
                        : `₹${plan.monthlyPrice}`}
                    </TableCell>
                    <TableCell className="font-medium">
                      {plan.yearlyPrice === 0 ? "—" : `₹${plan.yearlyPrice}`}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {plan.validityDays
                        ? `${plan.validityDays} days`
                        : "Subscription"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{plan.maxStudents} students</div>
                      <div>{plan.maxStaff} teachers</div>
                      <div>{plan.maxBranches} branches</div>
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openEdit(plan)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => deletePlanMut.mutate(plan.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Subscriptions Tab ──────────────────────────────────────────────── */}
        <TabsContent value="subscriptions">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auto-Renew</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No subscriptions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((item: any) => (
                    <TableRow key={item.subscription?.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{item.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.user?.email}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.plan?.name}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {item.subscription?.billingCycle}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.subscription?.startDate
                          ? format(
                              new Date(item.subscription.startDate),
                              "dd MMM yyyy",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.subscription?.endDate
                          ? format(
                              new Date(item.subscription.endDate),
                              "dd MMM yyyy",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {statusBadge(item.subscription?.status)}
                      </TableCell>
                      <TableCell>
                        {item.subscription?.autoRenew ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Payments Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="payments">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Razorpay ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No payments yet
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((item: any) => (
                    <TableRow key={item.payment?.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{item.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.user?.email}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {item.plan?.name}
                      </TableCell>
                      <TableCell className="font-bold text-emerald-600">
                        ₹
                        {((item.payment?.amount || 0) / 100).toLocaleString(
                          "en-IN",
                        )}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {item.payment?.billingCycle}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                        {item.payment?.razorpayPaymentId || "—"}
                      </TableCell>
                      <TableCell>
                        {item.payment?.status === "captured" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Paid
                          </Badge>
                        ) : item.payment?.status === "failed" ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.payment?.paidAt
                          ? format(new Date(item.payment.paidAt), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        {/* ── Users Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="users">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Onboarded</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : !Array.isArray(allUsers) || allUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No registered users yet</TableCell></TableRow>
                ) : (
                  allUsers.map((item: any) => (
                    <TableRow key={item.user?.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{item.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{item.user?.email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.org?.logo ? (
                            <img src={item.org.logo} alt={item.org.name} className="w-7 h-7 rounded object-contain bg-muted" />
                          ) : (
                            <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-sm">{item.org?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{item.plan?.name || <span className="text-muted-foreground">No Plan</span>}</TableCell>
                      <TableCell>
                        {item.subscription?.status ? statusBadge(item.subscription.status) : <Badge variant="outline" className="text-muted-foreground">None</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.subscription?.endDate ? format(new Date(item.subscription.endDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {item.user?.isOnboarded ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="rounded-lg h-7 text-xs" onClick={() => {
                          setOverrideTarget(item.user);
                          setOverrideForm({ planId: "", billingCycle: "monthly", durationDays: 30 });
                          setOverrideModal(true);
                        }}>
                          Override
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Override Modal ──────────────────────────────────────────────────── */}
      <Dialog open={overrideModal} onOpenChange={setOverrideModal}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Override Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">Assigning plan for <strong>{overrideTarget?.name}</strong></p>
            <div className="space-y-1">
              <Label className="text-xs">Plan *</Label>
              <select
                value={overrideForm.planId}
                onChange={e => setOverrideForm(f => ({ ...f, planId: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a plan</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Billing Cycle</Label>
              <select
                value={overrideForm.billingCycle}
                onChange={e => setOverrideForm(f => ({ ...f, billingCycle: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration (days)</Label>
              <Input
                type="number"
                value={overrideForm.durationDays}
                onChange={e => setOverrideForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                min={1}
                className="rounded-lg"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOverrideModal(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!overrideForm.planId || overrideMut.isPending}
                onClick={() => overrideMut.mutate({ userId: overrideTarget?.id, planId: Number(overrideForm.planId), billingCycle: overrideForm.billingCycle, durationDays: overrideForm.durationDays })}
              >
                {overrideMut.isPending ? "Applying..." : "Apply Override"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Plan Create/Edit Modal ─────────────────────────────────────────── */}
      <Dialog open={planModal} onOpenChange={setPlanModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Create New Plan"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Plan Name *</Label>
                <Input
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Pro Plan"
                  required
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={set("slug")}
                  placeholder="pro"
                  required
                  className="rounded-lg"
                  disabled={!!editingPlan}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monthly Price (₹)</Label>
                <Input
                  type="number"
                  value={form.monthlyPrice}
                  onChange={set("monthlyPrice")}
                  min="0"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Yearly Price (₹)</Label>
                <Input
                  type="number"
                  value={form.yearlyPrice}
                  onChange={set("yearlyPrice")}
                  min="0"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Validity Days (leave empty for subscription)
                </Label>
                <Input
                  type="number"
                  value={form.validityDays}
                  onChange={set("validityDays")}
                  placeholder="20"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={set("sortOrder")}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Students</Label>
                <Input
                  type="number"
                  value={form.maxStudents}
                  onChange={set("maxStudents")}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Teachers</Label>
                <Input
                  type="number"
                  value={form.maxStaff}
                  onChange={set("maxStaff")}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Branches</Label>
                <Input
                  type="number"
                  value={form.maxBranches}
                  onChange={set("maxBranches")}
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={form.description}
                onChange={set("description")}
                placeholder="Plan description..."
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Features (one per line)</Label>
              <textarea
                value={
                  typeof form.features === "string"
                    ? form.features
                    : (form.features as any[]).join("\n")
                }
                onChange={set("features")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                placeholder={
                  "Unlimited Students\nFee Management\nReport Cards\nWhatsApp Notifications"
                }
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={set("isActive")}
                  className="rounded"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={set("isFeatured")}
                  className="rounded"
                />
                Featured (Most Popular)
              </label>
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={createPlanMut.isPending || updatePlanMut.isPending}
            >
              {createPlanMut.isPending || updatePlanMut.isPending
                ? "Saving..."
                : editingPlan
                  ? "Update Plan"
                  : "Create Plan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
