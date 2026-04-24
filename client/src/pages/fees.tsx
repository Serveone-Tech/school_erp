import { apiFetch } from "@/lib/queryClient";
// client/src/pages/fees.tsx
import { useState, useEffect } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, CreditCard, IndianRupee, TrendingUp, Receipt, Trash2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { format } from "date-fns";

const MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"];
const PAYMENT_MODES = ["Cash","Online","Cheque","DD","UPI","NEFT"];

export default function FeesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [tab, setTab] = useState("payments");
  const [search, setSearch] = useState("");
  const [addPayOpen, setAddPayOpen] = useState(false);
  const [addStructOpen, setAddStructOpen] = useState(false);
  const { selectedBranchId, branchQuery } = useBranch();

  const { data: payments = [], isLoading } = useQuery({ queryKey: ["/api/fees/payments", selectedBranchId], queryFn: () => apiFetch(`/api/fees/payments${branchQuery}`) });
  const { data: structures = [] } = useQuery({ queryKey: ["/api/fees/structure", selectedBranchId], queryFn: () => apiFetch(`/api/fees/structure${branchQuery}`) });
  const { data: classes = [] } = useQuery({ queryKey: ["/api/classes"], queryFn: () => apiFetch("/api/classes") });
  const { data: students = [] } = useQuery({ queryKey: ["/api/students", selectedBranchId], queryFn: () => apiFetch(`/api/students${branchQuery}`) });

  const totalCollected = payments.reduce((sum: number, p: any) => sum + (p.netAmount || 0), 0);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayCollected = payments.filter((p: any) => p.paymentDate?.startsWith(todayStr)).reduce((sum: number, p: any) => sum + (p.netAmount || 0), 0);

  const deleteStructure = useMutation({
    mutationFn: (id: number) => fetch(`/api/fees/structure/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/fees/structure"] }); toast({ title: "Fee structure deleted" }); },
  });

  const filteredPayments = payments.filter((p: any) => {
    const student = students.find((s: any) => s.id === p.studentId);
    return !search || student?.name?.toLowerCase().includes(search.toLowerCase()) || p.receiptNo?.includes(search);
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" />Fee Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Collect and track student fees</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><IndianRupee className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Collected</p><p className="font-bold text-lg">₹{totalCollected.toLocaleString("en-IN")}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Today's Collection</p><p className="font-bold text-lg">₹{todayCollected.toLocaleString("en-IN")}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Receipt className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Receipts</p><p className="font-bold text-lg">{payments.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="payments" className="text-xs">Fee Payments</TabsTrigger>
            <TabsTrigger value="structure" className="text-xs">Fee Structure</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {tab === "payments" && <Button onClick={() => setAddPayOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Collect Fee</Button>}
            {tab === "structure" && <Button onClick={() => setAddStructOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Structure</Button>}
          </div>
        </div>

        {/* ── Fee Payments Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="payments" className="space-y-3 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student or receipt no..." className="pl-9 rounded-xl" />
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Receipt No","Student","Fee Type","Month","Amount","Discount","Net","Mode","Date","Status"].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {isLoading ? <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                : filteredPayments.length === 0 ? <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No payments recorded</td></tr>
                : filteredPayments.map((p: any) => {
                  const student = students.find((s: any) => s.id === p.studentId);
                  const struct = structures.find((s: any) => s.id === p.feeStructureId);
                  return (
                    <tr key={p.id} className="border-t border-border/40 hover:bg-accent/20">
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{p.receiptNo}</td>
                      <td className="px-3 py-2.5 font-medium">{student?.name || "—"}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{struct?.name || "—"}</Badge></td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.month || "—"}</td>
                      <td className="px-3 py-2.5">₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5 text-emerald-600">{p.discount ? `₹${p.discount}` : "—"}</td>
                      <td className="px-3 py-2.5 font-semibold">₹{(p.netAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{p.paymentMode}</Badge></td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.paymentDate ? format(new Date(p.paymentDate), "dd MMM yyyy") : "—"}</td>
                      <td className="px-3 py-2.5"><Badge variant="outline" className={p.status === "Paid" ? "text-xs border-emerald-200 text-emerald-700 bg-emerald-50" : "text-xs border-amber-200 text-amber-700"}>{p.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Fee Structure Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="structure" className="mt-4">
          {structures.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No fee structures defined</p>
              <p className="text-sm mt-1">Add structures like Tuition Fee, Library Fee, etc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map((s: any) => {
                const cls = classes.find((c: any) => c.id === s.classId);
                return (
                  <div key={s.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cls?.name || "All Classes"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg font-bold text-primary">₹{s.amount.toLocaleString("en-IN")}</span>
                        <Badge variant="outline" className="text-xs">{s.frequency}</Badge>
                      </div>
                      {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
                      onClick={async () => { if (await confirm({ title: "Delete Fee Structure", description: `Remove "${s.name}"? Existing payment records will not be affected.`, confirmLabel: "Delete", variant: "destructive" })) deleteStructure.mutate(s.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {addPayOpen && (
        <CollectFeeDialog
          students={students}
          structures={structures}
          classes={classes}
          branchId={selectedBranchId}
          onClose={() => setAddPayOpen(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ["/api/fees/payments"] }); qc.invalidateQueries({ queryKey: ["/api/transactions"] }); setAddPayOpen(false); }}
        />
      )}

      <Dialog open={addStructOpen} onOpenChange={setAddStructOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Fee Structure</DialogTitle></DialogHeader>
          <AddStructureForm classes={classes} onClose={() => setAddStructOpen(false)} onSuccess={() => { qc.invalidateQueries({ queryKey: ["/api/fees/structure"] }); setAddStructOpen(false); }} />
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}

// ── Add Fee Structure Form ─────────────────────────────────────────────────────
function AddStructureForm({ classes, onClose, onSuccess }: { classes: any[]; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ frequency: "Monthly" });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: any) => fetch("/api/fees/structure", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, classId: data.classId ? Number(data.classId) : null, amount: Number(data.amount) }) }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Fee structure added" }); onSuccess(); },
    onError: () => toast({ title: "Failed to add", variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label className="text-xs">Fee Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Tuition Fee, Library Fee, Sports Fee..." className="rounded-xl h-9" /></div>
      <div className="space-y-1.5">
        <Label className="text-xs">Applicable Class</Label>
        <Select value={form.classId || "_"} onValueChange={v => set("classId", v === "_" ? null : v)}>
          <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent><SelectItem value="_">All Classes</SelectItem>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Amount (₹) *</Label><Input type="number" value={form.amount || ""} onChange={e => set("amount", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Frequency</Label>
          <Select value={form.frequency} onValueChange={v => set("frequency", v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{["Monthly","Quarterly","Half-Yearly","Annual","One-time"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label className="text-xs">Description (optional)</Label><Input value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="e.g. Per month tuition charges" className="rounded-xl h-9" /></div>
      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name || !form.amount}>
          {mutation.isPending ? "Saving..." : "Add Structure"}
        </Button>
      </div>
    </div>
  );
}

// ── Collect Fee Dialog ─────────────────────────────────────────────────────────
function CollectFeeDialog({ students, structures, classes, branchId, onClose, onSuccess }: { students: any[]; structures: any[]; classes: any[]; branchId: number | null; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    paymentMode: "Cash",
    status: "Paid",
    branchId: branchId ?? null,
    discount: 0,
    fine: 0,
  });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Remaining fee query — fires when student + structure selected
  const { data: remaining, isFetching: remainingLoading } = useQuery({
    queryKey: ["/api/fees/remaining", form.studentId, form.feeStructureId, form.month],
    queryFn: () => {
      const params = new URLSearchParams({ studentId: form.studentId, feeStructureId: form.feeStructureId });
      if (form.month) params.set("month", form.month);
      return apiFetch(`/api/fees/remaining?${params}`);
    },
    enabled: !!(form.studentId && form.feeStructureId),
  });

  // Selected structure
  const selectedStruct = structures.find((s: any) => s.id === Number(form.feeStructureId));

  // When structure is selected → auto-fill amount with remaining or structure amount
  useEffect(() => {
    if (!selectedStruct) return;
    if (remaining != null) {
      set("amount", remaining.remaining > 0 ? remaining.remaining : selectedStruct.amount);
    } else {
      set("amount", selectedStruct.amount);
    }
  }, [remaining, selectedStruct?.id]);

  // Filter structures by student's class
  const student = students.find((s: any) => s.id === Number(form.studentId));
  const relevantStructures = structures.filter((s: any) =>
    !s.classId || s.classId === student?.classId || !student
  );

  const netAmount = (Number(form.amount) || 0) - (Number(form.discount) || 0) + (Number(form.fine) || 0);

  const mutation = useMutation({
    mutationFn: (data: any) => fetch("/api/fees/payments", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        studentId: Number(data.studentId),
        feeStructureId: data.feeStructureId ? Number(data.feeStructureId) : null,
        feeStructureName: selectedStruct?.name,
        amount: Number(data.amount),
        discount: Number(data.discount || 0),
        fine: Number(data.fine || 0),
      }),
    }).then(async r => { if (!r.ok) throw new Error((await r.json()).message); return r.json(); }),
    onSuccess: () => { toast({ title: "Fee collected successfully" }); onSuccess(); },
    onError: (e: any) => toast({ title: e.message || "Failed", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader><DialogTitle>Collect Fee</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">

          {/* Student */}
          <div className="space-y-1.5">
            <Label className="text-xs">Student *</Label>
            <Select value={form.studentId || "_"} onValueChange={v => { set("studentId", v === "_" ? "" : v); set("feeStructureId", ""); set("amount", ""); }}>
              <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Student" /></SelectTrigger>
              <SelectContent className="max-h-52">
                {students.map((s: any) => {
                  const cls = classes.find((c: any) => c.id === s.classId);
                  return <SelectItem key={s.id} value={String(s.id)}>{s.name} — {cls?.name || "No Class"} ({s.admissionNo})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Fee Structure */}
          <div className="space-y-1.5">
            <Label className="text-xs">Fee Type / Structure *</Label>
            <Select value={form.feeStructureId || "_"} onValueChange={v => { set("feeStructureId", v === "_" ? "" : v); set("amount", ""); }}>
              <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Fee Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select Fee Type</SelectItem>
                {relevantStructures.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} — ₹{s.amount.toLocaleString("en-IN")} / {s.frequency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Remaining info box */}
          {form.studentId && form.feeStructureId && (
            <div className={`rounded-xl p-3 text-xs flex items-start gap-2 ${remainingLoading ? "bg-muted" : remaining?.remaining === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-blue-50 border border-blue-200"}`}>
              {remainingLoading ? (
                <><Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><span className="text-muted-foreground">Calculating remaining balance...</span></>
              ) : remaining?.remaining === 0 ? (
                <><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><span className="text-emerald-700">Fee fully paid. Already paid: <b>₹{remaining.totalPaid.toLocaleString("en-IN")}</b>{form.month ? ` for ${form.month}` : ""}.</span></>
              ) : remaining ? (
                <><AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" /><span className="text-blue-700">
                  Structure amount: <b>₹{remaining.structureAmount.toLocaleString("en-IN")}</b>
                  {remaining.totalPaid > 0 && <> · Already paid: <b>₹{remaining.totalPaid.toLocaleString("en-IN")}</b></>}
                  {remaining.totalPaid > 0 && <> · <b className="text-blue-800">Remaining: ₹{remaining.remaining.toLocaleString("en-IN")}</b></>}
                </span></>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Month */}
            <div className="space-y-1.5">
              <Label className="text-xs">Month</Label>
              <Select value={form.month || "_"} onValueChange={v => set("month", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Month" /></SelectTrigger>
                <SelectContent><SelectItem value="_">— No Month —</SelectItem>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" value={form.amount || ""} onChange={e => set("amount", e.target.value)} className="rounded-xl h-9" placeholder="Auto-filled" />
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label className="text-xs">Discount (₹)</Label>
              <Input type="number" value={form.discount || ""} onChange={e => set("discount", e.target.value)} className="rounded-xl h-9" placeholder="0" />
            </div>

            {/* Fine */}
            <div className="space-y-1.5">
              <Label className="text-xs">Fine / Late Fee (₹)</Label>
              <Input type="number" value={form.fine || ""} onChange={e => set("fine", e.target.value)} className="rounded-xl h-9" placeholder="0" />
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={v => set("paymentMode", v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" value={form.paymentDate} onChange={e => set("paymentDate", e.target.value)} className="rounded-xl h-9" />
            </div>
          </div>

          {/* Net Amount preview */}
          {form.amount && (
            <div className="bg-muted/50 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Net Payable</span>
              <span className="text-base font-bold text-primary">₹{netAmount.toLocaleString("en-IN")}</span>
            </div>
          )}

          <div className="space-y-1.5"><Label className="text-xs">Remark</Label><Input value={form.remark || ""} onChange={e => set("remark", e.target.value)} className="rounded-xl h-9" placeholder="Optional note" /></div>
          <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.studentId || !form.feeStructureId || !form.amount}>
              {mutation.isPending ? "Collecting..." : "Collect Fee"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
