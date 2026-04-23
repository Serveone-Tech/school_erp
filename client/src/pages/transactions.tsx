import { apiFetch } from "@/lib/queryClient";
// client/src/pages/transactions.tsx
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { format } from "date-fns";

const INCOME_CATS = ["Donation","Grant","Rental Income","Other Income"];
const EXPENSE_CATS = ["Salary","Maintenance","Stationery","Utilities","Transport","Events","IT","Furniture","Other Expense"];

export default function TransactionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ type: "Income", date: format(new Date(), "yyyy-MM-dd"), branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: txns = [], isLoading } = useQuery({ queryKey: ["/api/transactions", selectedBranchId], queryFn: () => apiFetch(`/api/transactions${branchQuery}`) });

  const totalIncome = txns.filter((t: any) => t.type === "Income").reduce((s: number, t: any) => s + (t.amount || 0), 0);
  const totalExpense = txns.filter((t: any) => t.type === "Expense").reduce((s: number, t: any) => s + (t.amount || 0), 0);

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/transactions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, amount: Number(data.amount) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/transactions"] }); toast({ title: "Transaction added" }); setAddOpen(false); setForm({ type: "Income", date: format(new Date(), "yyyy-MM-dd") }); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><IndianRupee className="w-6 h-6 text-primary" />Income / Expense</h1><p className="text-sm text-muted-foreground mt-0.5">Track school finances</p></div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Transaction</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Income</p><p className="font-bold">₹{totalIncome.toLocaleString("en-IN")}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Expense</p><p className="font-bold">₹{totalExpense.toLocaleString("en-IN")}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalIncome - totalExpense >= 0 ? "bg-blue-50" : "bg-red-50"}`}><IndianRupee className={`w-5 h-5 ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-red-600"}`} /></div>
            <div><p className="text-xs text-muted-foreground">Net Balance</p><p className={`font-bold ${totalIncome - totalExpense >= 0 ? "text-blue-600" : "text-red-600"}`}>₹{(totalIncome - totalExpense).toLocaleString("en-IN")}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Date","Type","Category","Description","Amount"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            : txns.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No transactions</td></tr>
            : txns.map((t: any) => (
              <tr key={t.id} className="border-t border-border/40 hover:bg-accent/20">
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.date ? format(new Date(t.date), "dd MMM yyyy") : "—"}</td>
                <td className="px-4 py-2.5"><Badge variant="outline" className={`text-xs ${t.type === "Income" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"}`}>{t.type}</Badge></td>
                <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{t.category}</Badge></td>
                <td className="px-4 py-2.5 text-muted-foreground">{t.description || "—"}</td>
                <td className={`px-4 py-2.5 font-semibold ${t.type === "Income" ? "text-emerald-600" : "text-red-600"}`}>{t.type === "Income" ? "+" : "-"}₹{(t.amount || 0).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Type *</Label>
              <Select value={form.type} onValueChange={v => { set("type", v); set("category", ""); }}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Income">Income</SelectItem><SelectItem value="Expense">Expense</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category *</Label>
              <Select value={form.category || "_"} onValueChange={v => set("category", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select</SelectItem>{(form.type === "Income" ? INCOME_CATS : EXPENSE_CATS).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Amount (₹) *</Label><Input type="number" value={form.amount || ""} onChange={e => set("amount", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={form.description || ""} onChange={e => set("description", e.target.value)} className="rounded-xl h-9" /></div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.category || !form.amount}>{createMutation.isPending ? "Saving..." : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
