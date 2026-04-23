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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardCheck, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Pending: "border-amber-200 text-amber-700 bg-amber-50",
  Approved: "border-emerald-200 text-emerald-700 bg-emerald-50",
  Rejected: "border-red-200 text-red-700 bg-red-50",
};

export default function AdmissionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, branchQuery, branchParam } = useBranch();
  const [addOpen, setAddOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("_all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({ status: "Pending", admissionDate: format(new Date(), "yyyy-MM-dd"), branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ["/api/admissions", selectedBranchId, filterStatus],
    queryFn: () => {
      let url = `/api/admissions${branchQuery}`;
      if (filterStatus !== "_all") url += `${branchQuery ? "&" : "?"}status=${filterStatus}`;
      return apiFetch(url);
    },
  });
  const { data: classes = [] } = useQuery({ queryKey: ["/api/classes"], queryFn: () => apiFetch("/api/classes") });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/admissions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admissions"] }); toast({ title: "Admission added" }); setAddOpen(false); setForm({ status: "Pending", admissionDate: format(new Date(), "yyyy-MM-dd"), branchId: selectedBranchId ?? null }); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => fetch(`/api/admissions/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admissions"] }); toast({ title: "Status updated" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/admissions/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admissions"] }); toast({ title: "Deleted" }); },
  });

  const filtered = admissions.filter((a: any) =>
    !search || (a.applicationNo || a.classApplied || "").toLowerCase().includes(search.toLowerCase())
  );

  const pending = admissions.filter((a: any) => a.status === "Pending").length;
  const approved = admissions.filter((a: any) => a.status === "Approved").length;
  const rejected = admissions.filter((a: any) => a.status === "Rejected").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-primary" />Student Admissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage admission enquiries and applications</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />New Admission</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 border bg-amber-50 border-amber-200 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500" />
          <div><p className="text-2xl font-bold text-amber-700">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
        </div>
        <div className="rounded-2xl p-4 border bg-emerald-50 border-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
          <div><p className="text-2xl font-bold text-emerald-700">{approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
        </div>
        <div className="rounded-2xl p-4 border bg-red-50 border-red-200 flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500" />
          <div><p className="text-2xl font-bold text-red-700">{rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {["_all", "Pending", "Approved", "Rejected"].map(s => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" className="rounded-xl h-8 text-xs" onClick={() => setFilterStatus(s)}>{s === "_all" ? "All" : s}</Button>
        ))}
        <Input placeholder="Search by application no or class..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl h-8 text-xs w-60 ml-auto" />
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["App. No", "Class Applied", "Date", "Status", "Remarks", "Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No admissions found</td></tr>
              : filtered.map((a: any) => (
                <tr key={a.id} className="border-t border-border/40 hover:bg-accent/20">
                  <td className="px-4 py-2.5 font-medium">{a.applicationNo || `ADM-${a.id}`}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.classApplied || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.admissionDate ? format(new Date(a.admissionDate), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-2.5"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{a.remarks || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {a.status === "Pending" && <>
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg text-emerald-700 border-emerald-200" onClick={() => updateStatus.mutate({ id: a.id, status: "Approved" })}>Approve</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg text-red-700 border-red-200" onClick={() => updateStatus.mutate({ id: a.id, status: "Rejected" })}>Reject</Button>
                      </>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(a.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>New Admission</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Application No</Label><Input value={form.applicationNo || ""} onChange={e => set("applicationNo", e.target.value)} placeholder="Auto-generated if empty" className="rounded-xl h-9" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Class Applied *</Label>
              <Select value={form.classApplied || "_"} onValueChange={v => set("classApplied", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select</SelectItem>{classes.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Admission Date</Label><Input type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Remarks</Label><Input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} placeholder="Additional notes..." className="rounded-xl h-9" /></div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.classApplied}>{createMutation.isPending ? "Saving..." : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
