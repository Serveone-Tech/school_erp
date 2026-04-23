import { apiFetch } from "@/lib/queryClient";
// client/src/pages/visitors.tsx
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
import { Plus, Search, Eye, LogOut } from "lucide-react";
import { format } from "date-fns";


export default function VisitorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { selectedBranchId, branchParam } = useBranch();
  const [form, setForm] = useState<any>({ date: today, inTime: format(new Date(), "HH:mm"), status: "In", branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: visitors = [], isLoading } = useQuery({ queryKey: ["/api/visitors", date, selectedBranchId], queryFn: () => apiFetch(`/api/visitors?date=${date}${branchParam}`) });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/visitors", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/visitors"] }); toast({ title: "Visitor logged" }); setAddOpen(false); setForm({ date: today, inTime: format(new Date(), "HH:mm"), status: "In" }); },
  });
  const checkoutMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/visitors/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Out", outTime: format(new Date(), "HH:mm") }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/visitors"] }); toast({ title: "Checked out" }); },
  });

  const filtered = visitors.filter((v: any) => !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.phone?.includes(search));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="w-6 h-6 text-primary" />Visitors Management</h1><p className="text-sm text-muted-foreground mt-0.5">{visitors.filter((v: any) => v.status === "In").length} visitors currently inside</p></div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Log Visitor</Button>
      </div>
      <div className="flex items-center gap-3">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl h-9 w-44" max={today} />
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search visitors..." className="pl-9 rounded-xl" />
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Name","Phone","Purpose","Person to Meet","In Time","Out Time","Status","Action"].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No visitors for this date</td></tr>
            : filtered.map((v: any) => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-accent/20">
                <td className="px-3 py-2.5 font-medium">{v.name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{v.phone || "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{v.purpose || "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{v.personToMeet || "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{v.inTime || "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{v.outTime || "—"}</td>
                <td className="px-3 py-2.5"><Badge variant="outline" className={v.status === "In" ? "border-emerald-200 text-emerald-700 bg-emerald-50 text-xs" : "text-xs"}>{v.status}</Badge></td>
                <td className="px-3 py-2.5">{v.status === "In" && <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => checkoutMutation.mutate(v.id)}><LogOut className="w-3 h-3" />Check Out</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Log Visitor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Visitor Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
              <div className="space-y-1.5"><Label className="text-xs">ID Proof</Label><Input value={form.idProof || ""} onChange={e => set("idProof", e.target.value)} placeholder="Aadhar, DL..." className="rounded-xl h-9" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Purpose of Visit</Label><Input value={form.purpose || ""} onChange={e => set("purpose", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Person to Meet</Label><Input value={form.personToMeet || ""} onChange={e => set("personToMeet", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">In Time</Label><Input type="time" value={form.inTime} onChange={e => set("inTime", e.target.value)} className="rounded-xl h-9" /></div>
            </div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name}>{createMutation.isPending ? "Logging..." : "Log Visitor"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
