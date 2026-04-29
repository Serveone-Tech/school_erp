import { apiFetch } from "@/lib/queryClient";
// client/src/pages/homework.tsx
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
import { Plus, Search, Trash2, ClipboardList, CalendarDays, BookOpen } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { format, isPast } from "date-fns";


export default function HomeworkPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ assignedDate: format(new Date(), "yyyy-MM-dd"), dueDate: "", branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: homeworkList = [], isLoading } = useQuery({ queryKey: ["/api/homework", selectedBranchId], queryFn: () => apiFetch(`/api/homework${branchQuery}`) });
  const { data: classes = [] } = useQuery({ queryKey: ["/api/classes"], queryFn: () => apiFetch("/api/classes") });
  const { data: subjects = [] } = useQuery({ queryKey: ["/api/classes/subjects/all"], queryFn: () => apiFetch("/api/classes/subjects/all") });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/homework", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/homework"] }); toast({ title: "Homework assigned" }); setAddOpen(false); setForm({ assignedDate: format(new Date(), "yyyy-MM-dd"), dueDate: "" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/homework/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/homework"] }); toast({ title: "Deleted" }); },
  });

  const filtered = homeworkList.filter((h: any) => {
    const matchSearch = !search || h.title?.toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === "all" || String(h.classId) === classFilter;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" />Homework</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} assignments</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Assign Homework</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search homework..." className="pl-9 rounded-xl" />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-36 rounded-xl h-9"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div>
      : filtered.length === 0 ? <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No homework assigned yet</p></div>
      : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h: any) => {
            const cls = classes.find((c: any) => c.id === h.classId);
            const subj = subjects.find((s: any) => s.id === h.subjectId);
            const overdue = h.dueDate && isPast(new Date(h.dueDate));
            return (
              <div key={h.id} className={`bg-card rounded-2xl border shadow-sm p-4 space-y-3 ${overdue ? "border-red-200" : "border-border/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm line-clamp-2">{h.title}</p>
                    {h.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.description}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={async () => { if (await confirm({ title: "Delete Homework", description: "This assignment will be permanently removed.", confirmLabel: "Delete", variant: "destructive" })) deleteMutation.mutate(h.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cls && <Badge variant="outline" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />{cls.name}</Badge>}
                  {subj && <Badge variant="outline" className="text-xs">{subj.name}</Badge>}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />Assigned: {h.assignedDate}</span>
                  <span className={`font-medium ${overdue ? "text-red-600" : ""}`}>Due: {h.dueDate || "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Assign Homework</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="Homework title" className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><textarea value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Describe the homework..." className="w-full rounded-xl border border-border px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-primary" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Class *</Label>
                <Select value={form.classId || "_"} onValueChange={v => set("classId", v === "_" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent><SelectItem value="_">Select</SelectItem>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Select value={form.subjectId || "_"} onValueChange={v => set("subjectId", v === "_" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent><SelectItem value="_">Select</SelectItem>{subjects.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Assigned Date</Label><Input type="date" value={form.assignedDate} onChange={e => set("assignedDate", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Due Date *</Label><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} className="rounded-xl h-9" /></div>
              <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} className="col-span-2" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate({ ...form, classId: form.classId ? Number(form.classId) : null, subjectId: form.subjectId ? Number(form.subjectId) : null })} disabled={createMutation.isPending || !form.title || !form.classId || !form.dueDate}>
                {createMutation.isPending ? "Saving..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
