import { apiFetch } from "@/lib/queryClient";
// client/src/pages/exams.tsx
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
import { Plus, Search, Trash2, FileText, Eye, Edit3, Trophy, TrendingUp, Users, CheckCircle, XCircle, Printer } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";

export default function ExamsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [resultsExam, setResultsExam] = useState<any>(null);
  const [viewExam, setViewExam] = useState<any>(null);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ examType: "Written", branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: exams = [], isLoading } = useQuery({ queryKey: ["/api/exams", selectedBranchId], queryFn: () => apiFetch(`/api/exams${branchQuery}`) });
  const { data: classes = [] } = useQuery({ queryKey: ["/api/classes"], queryFn: () => apiFetch("/api/classes") });
  const { data: subjects = [] } = useQuery({ queryKey: ["/api/classes/subjects/all"], queryFn: () => apiFetch("/api/classes/subjects/all") });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/exams", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, classId: data.classId ? Number(data.classId) : null, subjectId: data.subjectId ? Number(data.subjectId) : null, totalMarks: Number(data.totalMarks), passingMarks: Number(data.passingMarks) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/exams"] }); toast({ title: "Exam created" }); setAddOpen(false); setForm({ examType: "Written" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/exams/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/exams"] }); toast({ title: "Deleted" }); },
  });

  const filtered = exams.filter((e: any) => !search || e.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" />Examinations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage exams and results</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Create Exam</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exams..." className="pl-9 rounded-xl" />
      </div>

      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div>
      : filtered.length === 0 ? <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50"><FileText className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No exams scheduled yet</p></div>
      : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Exam Name","Type","Class","Subject","Date","Total Marks","Passing","Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => {
                const cls = classes.find((c: any) => c.id === e.classId);
                const subj = subjects.find((s: any) => s.id === e.subjectId);
                return (
                  <tr key={e.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{e.examType}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{cls?.name || "All"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{subj?.name || "All"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.date || "—"}</td>
                    <td className="px-4 py-3 font-medium">{e.totalMarks}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.passingMarks || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => setViewExam(e)}>
                          <Eye className="w-3 h-3" />View
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => setResultsExam(e)}>
                          <Edit3 className="w-3 h-3" />Enter
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { if (await confirm({ title: "Delete Exam", description: "This will permanently delete the exam and all its results.", confirmLabel: "Delete", variant: "destructive" })) deleteMutation.mutate(e.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Exam Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Create Exam</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Exam Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Unit Test 1, Half Yearly..." className="rounded-xl h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Exam Type</Label>
                <Select value={form.examType} onValueChange={v => set("examType", v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Written","Practical","Oral","Online"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Class</Label>
                <Select value={form.classId || "_"} onValueChange={v => set("classId", v === "_" ? null : v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="_">All Classes</SelectItem>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subject</Label>
                <Select value={form.subjectId || "_"} onValueChange={v => set("subjectId", v === "_" ? null : v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="_">All Subjects</SelectItem>{subjects.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.date || ""} onChange={e => set("date", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Total Marks *</Label><Input type="number" value={form.totalMarks || ""} onChange={e => set("totalMarks", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Passing Marks</Label><Input type="number" value={form.passingMarks || ""} onChange={e => set("passingMarks", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Start Time</Label><Input type="time" value={form.startTime || ""} onChange={e => set("startTime", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">End Time</Label><Input type="time" value={form.endTime || ""} onChange={e => set("endTime", e.target.value)} className="rounded-xl h-9" /></div>
              <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} className="col-span-2" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name || !form.totalMarks}>
                {createMutation.isPending ? "Creating..." : "Create Exam"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {resultsExam && <ResultsDialog exam={resultsExam} onClose={() => setResultsExam(null)} />}
      {viewExam && <ViewResultsDialog exam={viewExam} classes={classes} subjects={subjects} onClose={() => setViewExam(null)} onEdit={() => { setResultsExam(viewExam); setViewExam(null); }} />}
      {ConfirmDialog}
    </div>
  );
}

// ── Enter Results Dialog ────────────────────────────────────────────────────────
function ResultsDialog({ exam, onClose }: { exam: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [results, setResults] = useState<Record<number, any>>({});

  const { data: students = [] } = useQuery({
    queryKey: ["/api/students", exam.classId],
    queryFn: () => fetch(`/api/students${exam.classId ? `?classId=${exam.classId}` : ""}`, { credentials: "include" }).then(r => r.json()),
  });
  useQuery({
    queryKey: ["/api/exams/results", exam.id],
    queryFn: async () => {
      const data = await fetch(`/api/exams/${exam.id}/results`, { credentials: "include" }).then(r => r.json());
      const map: Record<number, any> = {};
      data.forEach((r: any) => { map[r.studentId] = r; });
      setResults(map);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const records = students.map((s: any) => ({
        studentId: s.id,
        marksObtained: results[s.id]?.marksObtained ?? null,
        isAbsent: results[s.id]?.isAbsent || false,
        grade: results[s.id]?.grade || "",
        remarks: results[s.id]?.remarks || "",
      }));
      return fetch(`/api/exams/${exam.id}/results/bulk`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ results: records }) }).then(r => r.json());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/exams"] }); toast({ title: "Results saved" }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2"><Edit3 className="w-4 h-4" />Enter Results — {exam.name} <span className="text-muted-foreground font-normal text-sm">(Total: {exam.totalMarks})</span></DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[55vh] px-6 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {["#","Student","Marks / "+exam.totalMarks,"Grade","Absent","Remarks"].map(h => <th key={h} className="text-left py-2 text-xs font-semibold text-muted-foreground pr-3">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {students.map((s: any, i: number) => (
                <tr key={s.id} className="border-b border-border/40 hover:bg-accent/10">
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium text-sm">
                    <div>{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.admissionNo}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <Input type="number" className="h-8 rounded-lg w-20" placeholder="—"
                      value={results[s.id]?.marksObtained ?? ""}
                      onChange={e => setResults(p => ({ ...p, [s.id]: { ...p[s.id], marksObtained: e.target.value ? Number(e.target.value) : null } }))}
                      disabled={results[s.id]?.isAbsent}
                      min={0} max={exam.totalMarks} />
                  </td>
                  <td className="py-2 pr-3">
                    <Input className="h-8 rounded-lg w-16" placeholder="A+"
                      value={results[s.id]?.grade || ""}
                      onChange={e => setResults(p => ({ ...p, [s.id]: { ...p[s.id], grade: e.target.value } }))} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={results[s.id]?.isAbsent || false}
                      onChange={e => setResults(p => ({ ...p, [s.id]: { ...p[s.id], isAbsent: e.target.checked, marksObtained: null } }))}
                      className="w-4 h-4 rounded" />
                  </td>
                  <td className="py-2">
                    <Input className="h-8 rounded-lg" placeholder="Remarks"
                      value={results[s.id]?.remarks || ""}
                      onChange={e => setResults(p => ({ ...p, [s.id]: { ...p[s.id], remarks: e.target.value } }))} />
                  </td>
                </tr>
              ))}
              {students.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No students found for this class</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save Results"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── View Results Dialog ─────────────────────────────────────────────────────────
function ViewResultsDialog({ exam, classes, subjects, onClose, onEdit }: { exam: any; classes: any[]; subjects: any[]; onClose: () => void; onEdit: () => void }) {
  const [search, setSearch] = useState("");

  const { data: students = [] } = useQuery({
    queryKey: ["/api/students", exam.classId],
    queryFn: () => fetch(`/api/students${exam.classId ? `?classId=${exam.classId}` : ""}`, { credentials: "include" }).then(r => r.json()),
  });
  const { data: rawResults = [], isLoading } = useQuery({
    queryKey: ["/api/exams/results/view", exam.id],
    queryFn: () => fetch(`/api/exams/${exam.id}/results`, { credentials: "include" }).then(r => r.json()),
  });

  const cls = classes.find((c: any) => c.id === exam.classId);
  const subj = subjects.find((s: any) => s.id === exam.subjectId);

  // Merge results with student info and calculate ranks
  const rows = students.map((s: any) => {
    const r = rawResults.find((x: any) => x.studentId === s.id);
    const marks = r?.marksObtained ?? null;
    const pct = marks != null ? Math.round((marks / exam.totalMarks) * 100) : null;
    const passed = exam.passingMarks ? (marks != null && marks >= exam.passingMarks) : null;
    return { ...s, result: r, marks, pct, passed, isAbsent: r?.isAbsent || false, grade: r?.grade || "", remarks: r?.remarks || "" };
  }).sort((a: any, b: any) => {
    if (a.isAbsent && !b.isAbsent) return 1;
    if (!a.isAbsent && b.isAbsent) return -1;
    if (b.marks == null && a.marks != null) return -1;
    if (a.marks == null && b.marks != null) return 1;
    return (b.marks ?? 0) - (a.marks ?? 0);
  }).map((row: any, i: number) => ({ ...row, rank: (!row.isAbsent && row.marks != null) ? i + 1 : null }));

  const filteredRows = rows.filter((r: any) => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.admissionNo?.includes(search));

  // Stats
  const appeared = rows.filter((r: any) => !r.isAbsent && r.marks != null);
  const absentCount = rows.filter((r: any) => r.isAbsent).length;
  const passedCount = appeared.filter((r: any) => r.passed).length;
  const failedCount = appeared.filter((r: any) => r.passed === false).length;
  const avgMarks = appeared.length ? Math.round(appeared.reduce((s: any, r: any) => s + r.marks, 0) / appeared.length) : 0;
  const highestMarks = appeared.length ? Math.max(...appeared.map((r: any) => r.marks)) : 0;
  const passPercent = appeared.length ? Math.round((passedCount / appeared.length) * 100) : 0;
  const noResult = rows.filter((r: any) => !r.isAbsent && r.marks == null).length;

  const handlePrint = () => window.print();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl p-0">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" />{exam.name}</h2>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {cls && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{cls.name}</span>}
                {subj && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{subj.name}</span>}
                <span className="text-xs text-muted-foreground">Total Marks: <b>{exam.totalMarks}</b></span>
                {exam.passingMarks && <span className="text-xs text-muted-foreground">Passing: <b>{exam.passingMarks}</b></span>}
                {exam.date && <span className="text-xs text-muted-foreground">Date: <b>{exam.date}</b></span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1" onClick={handlePrint}>
                <Printer className="w-3.5 h-3.5" />Print
              </Button>
              <Button size="sm" className="h-8 text-xs rounded-lg gap-1" onClick={onEdit}>
                <Edit3 className="w-3.5 h-3.5" />Edit Results
              </Button>
            </div>
          </div>

          {/* Stats row */}
          {appeared.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              <div className="bg-card rounded-xl border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><Users className="w-3.5 h-3.5 text-blue-500" /></div>
                <p className="text-lg font-bold text-blue-600">{appeared.length}</p>
                <p className="text-xs text-muted-foreground">Appeared</p>
              </div>
              <div className="bg-card rounded-xl border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /></div>
                <p className="text-lg font-bold text-emerald-600">{passedCount}</p>
                <p className="text-xs text-muted-foreground">Passed ({passPercent}%)</p>
              </div>
              <div className="bg-card rounded-xl border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><XCircle className="w-3.5 h-3.5 text-red-500" /></div>
                <p className="text-lg font-bold text-red-600">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="bg-card rounded-xl border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><TrendingUp className="w-3.5 h-3.5 text-amber-500" /></div>
                <p className="text-lg font-bold text-amber-600">{avgMarks}</p>
                <p className="text-xs text-muted-foreground">Class Avg</p>
              </div>
              <div className="bg-card rounded-xl border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1"><Trophy className="w-3.5 h-3.5 text-purple-500" /></div>
                <p className="text-lg font-bold text-purple-600">{highestMarks}</p>
                <p className="text-xs text-muted-foreground">Highest</p>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="pl-8 h-8 rounded-lg text-xs" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 340px)" }}>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading results...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {["Rank","Student","Adm. No","Marks","Percentage","Grade","Status","Remarks"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    {noResult > 0 ? "Results not entered yet. Click 'Edit Results' to add marks." : "No students found."}
                  </td></tr>
                ) : filteredRows.map((row: any, i: number) => {
                  const isTopper = row.rank === 1;
                  return (
                    <tr key={row.id} className={`border-t border-border/40 hover:bg-accent/20 ${isTopper ? "bg-amber-50/50" : ""}`}>
                      <td className="px-4 py-2.5">
                        {row.rank ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${row.rank === 1 ? "bg-amber-100 text-amber-700" : row.rank === 2 ? "bg-slate-100 text-slate-600" : row.rank === 3 ? "bg-orange-100 text-orange-600" : "text-muted-foreground"}`}>
                            {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-sm">{row.name}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{row.admissionNo}</td>
                      <td className="px-4 py-2.5">
                        {row.isAbsent ? (
                          <span className="text-xs text-muted-foreground">Absent</span>
                        ) : row.marks != null ? (
                          <span className="font-semibold">{row.marks}<span className="text-xs text-muted-foreground font-normal">/{exam.totalMarks}</span></span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.pct != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5 hidden sm:block">
                              <div className={`h-1.5 rounded-full ${row.pct >= 75 ? "bg-emerald-500" : row.pct >= 35 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${row.pct}%` }} />
                            </div>
                            <span className="text-sm font-medium">{row.pct}%</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.grade ? <Badge variant="outline" className="text-xs font-semibold">{row.grade}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {row.isAbsent ? (
                          <Badge variant="outline" className="text-xs border-slate-200 text-slate-500 bg-slate-50">Absent</Badge>
                        ) : row.marks == null ? (
                          <Badge variant="outline" className="text-xs border-slate-200 text-slate-400">Pending</Badge>
                        ) : exam.passingMarks ? (
                          row.passed
                            ? <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">Pass</Badge>
                            : <Badge variant="outline" className="text-xs border-red-200 text-red-700 bg-red-50">Fail</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-32 truncate">{row.remarks || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/20 flex items-center justify-between">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Total Students: <b className="text-foreground">{rows.length}</b></span>
            {absentCount > 0 && <span>Absent: <b className="text-slate-600">{absentCount}</b></span>}
            {noResult > 0 && <span>Results Pending: <b className="text-amber-600">{noResult}</b></span>}
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
