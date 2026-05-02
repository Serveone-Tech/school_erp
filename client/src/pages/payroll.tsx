import { apiFetch } from "@/lib/queryClient";
// client/src/pages/payroll.tsx
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, CalendarDays, TrendingDown, Info } from "lucide-react";
import { useCurrency } from "@/contexts/currency";
import { format, getDaysInMonth, parseISO, startOfMonth, endOfMonth } from "date-fns";

const MONTHS = ["2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10","2024-11","2024-12","2025-01","2025-02","2025-03","2025-04","2025-05","2025-06","2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01","2026-02","2026-03","2026-04","2026-05","2026-06"];

/** Count calendar days between two date strings (inclusive) */
function calcDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const f = new Date(from), t = new Date(to);
  if (isNaN(f.getTime()) || isNaN(t.getTime()) || t < f) return 0;
  return Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
}

/** Count how many approved leave days for a staff fall inside a given month */
function calcLeaveDaysInMonth(leaves: any[], staffId: number, month: string): number {
  if (!staffId || !month) return 0;
  const mStart = startOfMonth(parseISO(month + "-01"));
  const mEnd = endOfMonth(mStart);

  return leaves
    .filter((l: any) => l.staffId === staffId && l.status === "Approved" && l.fromDate && l.toDate)
    .reduce((total: number, l: any) => {
      const lFrom = new Date(l.fromDate);
      const lTo = new Date(l.toDate);
      // Clamp to month boundaries
      const clampFrom = lFrom < mStart ? mStart : lFrom;
      const clampTo = lTo > mEnd ? mEnd : lTo;
      if (clampTo < clampFrom) return total;
      return total + Math.round((clampTo.getTime() - clampFrom.getTime()) / 86400000) + 1;
    }, 0);
}

export default function PayrollPage() {
  const currency = useCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, branchQuery } = useBranch();
  const [tab, setTab] = useState("payroll");
  const [addOpen, setAddOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [form, setForm] = useState<any>({ month: format(new Date(), "yyyy-MM"), status: "Pending", branchId: selectedBranchId ?? null });
  const [leaveForm, setLeaveForm] = useState<any>({ status: "Pending", branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const setL = (k: string, v: any) => setLeaveForm((p: any) => ({ ...p, [k]: v }));

  const { data: payrolls = [] } = useQuery({ queryKey: ["/api/payroll", selectedBranchId], queryFn: () => apiFetch(`/api/payroll${branchQuery}`) });
  const { data: leaves = [] } = useQuery({ queryKey: ["/api/payroll/leave", selectedBranchId], queryFn: () => apiFetch(`/api/payroll/leave${branchQuery}`) });
  const { data: staffList = [] } = useQuery({ queryKey: ["/api/staff", selectedBranchId], queryFn: () => apiFetch(`/api/staff${branchQuery}`) });

  // ── Sync branchId from global branch selector ─────────────────────────────
  useEffect(() => {
    setForm((p: any) => ({ ...p, branchId: selectedBranchId ?? null }));
    setLeaveForm((p: any) => ({ ...p, branchId: selectedBranchId ?? null }));
  }, [selectedBranchId]);

  // ── Auto-fill salary when staff is selected ───────────────────────────────
  useEffect(() => {
    if (!form.staffId) return;
    const staff = staffList.find((s: any) => s.id === Number(form.staffId));
    if (staff?.salary) set("basicSalary", staff.salary);
  }, [form.staffId, staffList]);

  // ── Leave deduction calculation ────────────────────────────────────────────
  const salaryCalc = useMemo(() => {
    const basic = Number(form.basicSalary) || 0;
    const allowances = Number(form.allowances) || 0;
    const manualDeductions = Number(form.deductions) || 0;
    const month = form.month;
    const staffId = Number(form.staffId) || 0;

    if (!basic || !month || !staffId) return null;

    const workingDays = getDaysInMonth(parseISO(month + "-01"));
    const leaveDays = calcLeaveDaysInMonth(leaves, staffId, month);
    const perDaySalary = basic / workingDays;
    const leaveDeduction = Math.round(perDaySalary * leaveDays);
    const presentDays = workingDays - leaveDays;
    const netSalary = basic + allowances - manualDeductions - leaveDeduction;

    return { workingDays, leaveDays, perDaySalary, leaveDeduction, presentDays, netSalary };
  }, [form.basicSalary, form.allowances, form.deductions, form.month, form.staffId, leaves]);

  // ── Auto-calculate days in leave form ─────────────────────────────────────
  const leaveDays = calcDays(leaveForm.fromDate, leaveForm.toDate);

  const createPayroll = useMutation({
    mutationFn: (data: any) => {
      const calc = salaryCalc;
      const payload = {
        ...data,
        staffId: Number(data.staffId),
        basicSalary: Number(data.basicSalary),
        allowances: Number(data.allowances || 0),
        deductions: Number(data.deductions || 0),
        netSalary: calc ? calc.netSalary : Number(data.basicSalary) + Number(data.allowances || 0) - Number(data.deductions || 0),
        workingDays: calc?.workingDays ?? null,
        presentDays: calc?.presentDays ?? null,
        leaveDays: calc?.leaveDays ?? 0,
      };
      return fetch("/api/payroll", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payroll"] }); toast({ title: "Payroll generated" }); setAddOpen(false); setForm({ month: format(new Date(), "yyyy-MM"), status: "Pending" }); },
  });

  const createLeave = useMutation({
    mutationFn: (data: any) => fetch("/api/payroll/leave", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, staffId: Number(data.staffId), days: calcDays(data.fromDate, data.toDate) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payroll/leave"] }); toast({ title: "Leave request added" }); setLeaveOpen(false); setLeaveForm({ status: "Pending" }); },
  });

  const updateLeave = useMutation({
    mutationFn: ({ id, status }: any) => fetch(`/api/payroll/leave/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payroll/leave"] }); toast({ title: "Leave updated" }); },
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => fetch(`/api/payroll/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Paid" }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/payroll"] }); toast({ title: "Marked as Paid" }); },
  });

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="w-6 h-6 text-primary" />Staff Payroll</h1><p className="text-sm text-muted-foreground mt-0.5">Manage salaries and leave</p></div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList className="h-9"><TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger><TabsTrigger value="leave" className="text-xs">Leave Requests</TabsTrigger></TabsList>
          <div className="flex gap-2">
            {tab === "payroll" && <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Generate Payslip</Button>}
            {tab === "leave" && <Button onClick={() => setLeaveOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Leave</Button>}
          </div>
        </div>

        <TabsContent value="payroll" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Staff","Month","Basic","Allowances","Deductions","Leave Days","Net Salary","Status","Action"].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {payrolls.length === 0 ? <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No payroll records</td></tr>
                : payrolls.map((p: any) => {
                  const s = staffList.find((st: any) => st.id === p.staffId);
                  return (
                    <tr key={p.id} className="border-t border-border/40 hover:bg-accent/20">
                      <td className="px-3 py-2.5 font-medium">{s?.name || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.month}</td>
                      <td className="px-3 py-2.5">{currency.format(p.basicSalary || 0)}</td>
                      <td className="px-3 py-2.5 text-emerald-600">+{currency.format(p.allowances || 0)}</td>
                      <td className="px-3 py-2.5 text-red-600">-{currency.format(p.deductions || 0)}</td>
                      <td className="px-3 py-2.5 text-center">{p.leaveDays > 0 ? <Badge variant="outline" className="text-xs text-orange-700 border-orange-200 bg-orange-50">{p.leaveDays}d</Badge> : <span className="text-muted-foreground">0</span>}</td>
                      <td className="px-3 py-2.5 font-bold">{currency.format(p.netSalary || 0)}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={p.status === "Paid" ? "border-emerald-200 text-emerald-700 bg-emerald-50 text-xs" : "text-xs"}>{p.status}</Badge></td>
                      <td className="px-3 py-2.5">{p.status === "Pending" && <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg text-emerald-700 border-emerald-200" onClick={() => markPaid.mutate(p.id)}>Mark Paid</Button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Staff","Leave Type","From","To","Days","Reason","Status","Action"].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {leaves.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No leave requests</td></tr>
                : leaves.map((l: any) => {
                  const s = staffList.find((st: any) => st.id === l.staffId);
                  return (
                    <tr key={l.id} className="border-t border-border/40 hover:bg-accent/20">
                      <td className="px-3 py-2.5 font-medium">{s?.name || "—"}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{l.leaveType}</Badge></td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{l.fromDate}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{l.toDate}</td>
                      <td className="px-3 py-2.5 text-center font-medium">{l.days ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[150px] truncate">{l.reason || "—"}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={`text-xs ${l.status === "Approved" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : l.status === "Rejected" ? "border-red-200 text-red-700 bg-red-50" : ""}`}>{l.status}</Badge></td>
                      <td className="px-3 py-2.5">{l.status === "Pending" && <div className="flex gap-1"><Button variant="outline" size="sm" className="h-7 text-xs rounded-lg text-emerald-700 border-emerald-200" onClick={() => updateLeave.mutate({ id: l.id, status: "Approved" })}>Approve</Button><Button variant="outline" size="sm" className="h-7 text-xs rounded-lg text-red-700 border-red-200" onClick={() => updateLeave.mutate({ id: l.id, status: "Rejected" })}>Reject</Button></div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Generate Payslip Dialog ─────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Generate Payslip</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Staff *</Label>
              <Select value={form.staffId || "_"} onValueChange={v => set("staffId", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select</SelectItem>{staffList.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Month *</Label>
              <Select value={form.month} onValueChange={v => set("month", v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5"><Label className="text-xs">Basic ({currency.symbol}) *</Label><Input type="number" value={form.basicSalary || ""} onChange={e => set("basicSalary", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Allowances</Label><Input type="number" value={form.allowances || ""} onChange={e => set("allowances", e.target.value)} className="rounded-xl h-9" placeholder="0" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Deductions</Label><Input type="number" value={form.deductions || ""} onChange={e => set("deductions", e.target.value)} className="rounded-xl h-9" placeholder="0" /></div>
            </div>

            {/* ── Salary Breakdown ── */}
            {salaryCalc && (
              <div className="rounded-xl bg-muted/60 border border-border/50 p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Salary Breakdown</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Working Days (month)</span><span className="font-medium">{salaryCalc.workingDays} days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Approved Leave Days</span><span className={`font-medium ${salaryCalc.leaveDays > 0 ? "text-orange-600" : ""}`}>{salaryCalc.leaveDays} days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Present Days</span><span className="font-medium text-emerald-600">{salaryCalc.presentDays} days</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Per Day Salary</span><span className="font-medium">{currency.format(Math.round(salaryCalc.perDaySalary))}</span></div>
                {salaryCalc.leaveDays > 0 && (
                  <div className="flex justify-between text-red-600"><span className="flex items-center gap-1"><TrendingDown className="w-3 h-3" />Leave Deduction</span><span className="font-medium">-{currency.format(salaryCalc.leaveDeduction)}</span></div>
                )}
                <div className="border-t border-border/60 pt-1.5 flex justify-between font-bold"><span>Net Salary</span><span className="text-primary">{currency.format(salaryCalc.netSalary)}</span></div>
              </div>
            )}

            {form.staffId && form.month && !form.basicSalary && (
              <p className="text-xs text-amber-600 flex items-center gap-1"><Info className="w-3.5 h-3.5" />Enter basic salary to see breakdown</p>
            )}

            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createPayroll.mutate(form)} disabled={createPayroll.isPending || !form.staffId || !form.basicSalary}>{createPayroll.isPending ? "Saving..." : "Generate"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Leave Dialog ────────────────────────────────────────────────── */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Staff *</Label>
              <Select value={leaveForm.staffId || "_"} onValueChange={v => setL("staffId", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select</SelectItem>{staffList.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Leave Type *</Label>
              <Select value={leaveForm.leaveType || "_"} onValueChange={v => setL("leaveType", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>{["Sick","Casual","Annual","Maternity","Paternity","Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">From Date *</Label><Input type="date" value={leaveForm.fromDate || ""} onChange={e => setL("fromDate", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">To Date *</Label><Input type="date" value={leaveForm.toDate || ""} onChange={e => setL("toDate", e.target.value)} className="rounded-xl h-9" /></div>
            </div>

            {/* ── Days Preview ── */}
            {leaveDays > 0 && (
              <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-orange-700 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Total Leave Days</span>
                <span className="font-bold text-orange-700">{leaveDays} {leaveDays === 1 ? "day" : "days"}</span>
              </div>
            )}

            <div className="space-y-1.5"><Label className="text-xs">Reason</Label><Input value={leaveForm.reason || ""} onChange={e => setL("reason", e.target.value)} className="rounded-xl h-9" /></div>
            <BranchSelectField value={leaveForm.branchId} onChange={v => setL("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setLeaveOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createLeave.mutate(leaveForm)} disabled={createLeave.isPending || !leaveForm.staffId || !leaveForm.leaveType || !leaveForm.fromDate || !leaveForm.toDate}>{createLeave.isPending ? "Saving..." : "Add Leave"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
