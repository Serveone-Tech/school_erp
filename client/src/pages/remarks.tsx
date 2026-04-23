import { apiFetch } from "@/lib/queryClient";
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";

const REMARK_TYPES = ["General", "Behaviour", "Academic", "Health"];
const TYPE_COLORS: Record<string, string> = {
  General: "border-blue-200 text-blue-700 bg-blue-50",
  Behaviour: "border-amber-200 text-amber-700 bg-amber-50",
  Academic: "border-emerald-200 text-emerald-700 bg-emerald-50",
  Health: "border-red-200 text-red-700 bg-red-50",
};

export default function RemarksPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, branchQuery } = useBranch();
  const [addOpen, setAddOpen] = useState(false);
  const [filterStudent, setFilterStudent] = useState("");
  const [form, setForm] = useState<any>({ date: format(new Date(), "yyyy-MM-dd"), remarkType: "General", branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: remarks = [], isLoading } = useQuery({
    queryKey: ["/api/remarks", selectedBranchId],
    queryFn: () => apiFetch(`/api/remarks${branchQuery}`),
  });
  const { data: students = [] } = useQuery({
    queryKey: ["/api/students", selectedBranchId],
    queryFn: () => apiFetch(`/api/students${branchQuery}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/remarks", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, studentId: Number(data.studentId) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/remarks"] }); toast({ title: "Remark added" }); setAddOpen(false); setForm({ date: format(new Date(), "yyyy-MM-dd"), remarkType: "General", branchId: selectedBranchId ?? null }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/remarks/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/remarks"] }); toast({ title: "Remark deleted" }); },
  });

  const filtered = remarks.filter((r: any) => {
    if (!filterStudent) return true;
    const s = students.find((st: any) => st.id === r.studentId);
    return s?.name?.toLowerCase().includes(filterStudent.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6 text-primary" />Student Daily Remarks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Daily behaviour, academic and health remarks</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Remark</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search by student name..." value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="rounded-xl h-9 max-w-xs" />
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Date", "Student", "Type", "Remark", "Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No remarks found</td></tr>
              : filtered.map((r: any) => {
                const student = students.find((s: any) => s.id === r.studentId);
                return (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-2.5 font-medium">{student?.name || `Student #${r.studentId}`}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className={`text-xs ${TYPE_COLORS[r.remarkType] || ""}`}>{r.remarkType}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-xs">{r.remark}</td>
                    <td className="px-4 py-2.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this remark?")) deleteMutation.mutate(r.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Remark</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Student *</Label>
              <Select value={form.studentId || "_"} onValueChange={v => set("studentId", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remark Type</Label>
              <Select value={form.remarkType} onValueChange={v => set("remarkType", v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{REMARK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Remark *</Label><Textarea value={form.remark || ""} onChange={e => set("remark", e.target.value)} placeholder="Enter remark..." className="rounded-xl text-sm" rows={3} /></div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.studentId || !form.remark}>{createMutation.isPending ? "Saving..." : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
