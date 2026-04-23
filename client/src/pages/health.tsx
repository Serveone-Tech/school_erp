import { apiFetch } from "@/lib/queryClient";
// client/src/pages/health.tsx
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
import { Plus, Search, Heart } from "lucide-react";
import { format } from "date-fns";


export default function HealthPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ date: format(new Date(), "yyyy-MM-dd"), branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: records = [], isLoading } = useQuery({ queryKey: ["/api/health", selectedBranchId], queryFn: () => apiFetch(`/api/health${branchQuery}`) });
  const { data: students = [] } = useQuery({ queryKey: ["/api/students", selectedBranchId], queryFn: () => apiFetch(`/api/students${branchQuery}`) });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/health", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, studentId: Number(data.studentId), referredToHospital: data.referredToHospital === "true" }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/health"] }); toast({ title: "Health record added" }); setAddOpen(false); setForm({ date: format(new Date(), "yyyy-MM-dd") }); },
  });

  const filtered = records.filter((r: any) => {
    const student = students.find((s: any) => s.id === r.studentId);
    return !search || student?.name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-primary" />Health Records</h1><p className="text-sm text-muted-foreground mt-0.5">Student health and infirmary</p></div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Record</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by student..." className="pl-9 rounded-xl" />
      </div>
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Date","Student","Complaint","Diagnosis","Treatment","Medicine","Doctor","Referred"].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No health records</td></tr>
            : filtered.map((r: any) => {
              const student = students.find((s: any) => s.id === r.studentId);
              return (
                <tr key={r.id} className="border-t border-border/40 hover:bg-accent/20">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.date}</td>
                  <td className="px-3 py-2.5 font-medium">{student?.name || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.complaint || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.diagnosis || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.treatment || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.medicineGiven || "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.doctorName || "—"}</td>
                  <td className="px-3 py-2.5">{r.referredToHospital ? <Badge className="text-xs bg-red-500 hover:bg-red-500">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Add Health Record</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Student *</Label><Select value={form.studentId || "_"} onValueChange={v => set("studentId", v === "_" ? "" : v)}><SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="_">Select</SelectItem>{students.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Complaint</Label><Input value={form.complaint || ""} onChange={e => set("complaint", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Diagnosis</Label><Input value={form.diagnosis || ""} onChange={e => set("diagnosis", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Treatment</Label><Input value={form.treatment || ""} onChange={e => set("treatment", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Medicine Given</Label><Input value={form.medicineGiven || ""} onChange={e => set("medicineGiven", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Doctor Name</Label><Input value={form.doctorName || ""} onChange={e => set("doctorName", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Height</Label><Input value={form.height || ""} onChange={e => set("height", e.target.value)} placeholder="cm" className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Weight</Label><Input value={form.weight || ""} onChange={e => set("weight", e.target.value)} placeholder="kg" className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Referred to Hospital?</Label><Select value={form.referredToHospital || "false"} onValueChange={v => set("referredToHospital", v)}><SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="false">No</SelectItem><SelectItem value="true">Yes</SelectItem></SelectContent></Select></div>
              <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            </div>
            <div className="flex gap-2 pt-1"><Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button><Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.studentId}>{createMutation.isPending ? "Saving..." : "Save Record"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
