import { apiFetch } from "@/lib/queryClient";
// client/src/pages/classes.tsx
import { useState } from "react";
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
import { Plus, Trash2, BookOpen, Users, ChevronDown, ChevronRight, Pencil } from "lucide-react";

const apiPost = (path: string, data: any) => fetch(path, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json());
const apiPut = (path: string, data: any) => fetch(path, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json());
const apiDelete = (path: string) => fetch(path, { method: "DELETE", credentials: "include" });

function FormDialog({ open, onClose, title, fields, onSave, loading }: any) {
  const [form, setForm] = useState<any>({});
  const handleSave = () => { onSave(form); setForm({}); };
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setForm({}); onClose(); } }}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f: any) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              {f.type === "select" ? (
                <Select value={form[f.key] || "_"} onValueChange={v => setForm((p: any) => ({ ...p, [f.key]: v === "_" ? null : v }))}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder={f.placeholder} /></SelectTrigger>
                  <SelectContent>{f.options?.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input type={f.type || "text"} value={form[f.key] || ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="rounded-xl h-9" />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ClassesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("classes");
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [dialogs, setDialogs] = useState({ addClass: false, addSection: false, addSubject: false, addYear: false });
  const [sectionClassId, setSectionClassId] = useState<number | null>(null);
  const [classSections, setClassSections] = useState<Record<number, any[]>>({});
  const { selectedBranchId, branchQuery } = useBranch();
  const [classForm, setClassForm] = useState<any>({ branchId: selectedBranchId ?? null });
  const setC = (k: string, v: any) => setClassForm((p: any) => ({ ...p, [k]: v }));
  const [editSection, setEditSection] = useState<any>(null);
  const [editSectionForm, setEditSectionForm] = useState<any>({});
  const setES = (k: string, v: any) => setEditSectionForm((p: any) => ({ ...p, [k]: v }));

  const open = (d: string) => setDialogs(p => ({ ...p, [d]: true }));
  const close = (d: string) => setDialogs(p => ({ ...p, [d]: false }));

  const { data: classes = [] } = useQuery({ queryKey: ["/api/classes", selectedBranchId], queryFn: () => apiFetch(`/api/classes${branchQuery}`) });
  const { data: subjects = [] } = useQuery({ queryKey: ["/api/classes/subjects/all"], queryFn: () => apiFetch("/api/classes/subjects/all") });
  const { data: academicYears = [] } = useQuery({ queryKey: ["/api/classes/academic-years"], queryFn: () => apiFetch("/api/classes/academic-years") });

  const loadSections = async (classId: number) => {
    if (classSections[classId]) return;
    const data = await apiFetch(`/api/classes/${classId}/sections`);
    setClassSections(prev => ({ ...prev, [classId]: Array.isArray(data) ? data : [] }));
  };

  const toggleClass = (classId: number) => {
    if (expandedClass === classId) { setExpandedClass(null); }
    else { setExpandedClass(classId); loadSections(classId); }
  };

  const removeClass = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/classes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/classes"] }); toast({ title: "Class deleted" }); },
  });

  const addClass = useMutation({
    mutationFn: (data: any) => apiPost("/api/classes", { ...data, numericOrder: data.numericOrder ? Number(data.numericOrder) : null, branchId: data.branchId ?? null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/classes"] }); toast({ title: "Class added" }); close("addClass"); setClassForm({ branchId: selectedBranchId ?? null }); },
  });

  const addSection = useMutation({
    mutationFn: (data: any) => apiPost(`/api/classes/${sectionClassId}/sections`, { ...data, classId: sectionClassId, capacity: Number(data.capacity) || 40 }),
    onSuccess: () => {
      if (sectionClassId) { setClassSections(p => ({ ...p, [sectionClassId]: undefined as any })); loadSections(sectionClassId); }
      toast({ title: "Section added" }); close("addSection");
    },
  });

  const addSubject = useMutation({
    mutationFn: (data: any) => apiPost("/api/classes/subjects", { ...data, classId: data.classId ? Number(data.classId) : null, isElective: data.isElective === "true" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/classes/subjects/all"] }); toast({ title: "Subject added" }); close("addSubject"); },
  });

  const addYear = useMutation({
    mutationFn: (data: any) => apiPost("/api/classes/academic-years", { ...data, startDate: new Date(data.startDate).toISOString(), endDate: new Date(data.endDate).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/classes/academic-years"] }); toast({ title: "Academic year added" }); close("addYear"); },
  });

  const updateSection = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiPut(`/api/classes/sections/${id}`, { ...data, capacity: Number(data.capacity) || 40 }),
    onSuccess: (_res, { id }) => {
      const classId = Object.keys(classSections).find(cid => classSections[Number(cid)]?.some((s: any) => s.id === id));
      if (classId) { setClassSections(p => ({ ...p, [classId]: undefined as any })); loadSections(Number(classId)); }
      toast({ title: "Section updated" }); setEditSection(null);
    },
  });

  const deleteSection = useMutation({
    mutationFn: (id: number) => apiDelete(`/api/classes/sections/${id}`),
    onSuccess: (_res, id) => {
      const classId = Object.keys(classSections).find(cid => classSections[Number(cid)]?.some((s: any) => s.id === id));
      if (classId) { setClassSections(p => ({ ...p, [classId]: p[Number(classId)]?.filter((s: any) => s.id !== id) })); }
      toast({ title: "Section deleted" });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" />Classes & Sections</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage classes, sections, subjects and academic years</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="classes" className="text-xs">Classes & Sections</TabsTrigger>
          <TabsTrigger value="subjects" className="text-xs">Subjects</TabsTrigger>
          <TabsTrigger value="years" className="text-xs">Academic Years</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => open("addClass")} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Class</Button>
          </div>
          {classes.length === 0 && <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">No classes yet. Click "Add Class" to get started.</div>}
          <div className="space-y-2">
            {classes.map((cls: any) => (
              <div key={cls.id} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-accent/20 transition-colors" onClick={() => toggleClass(cls.id)}>
                  <div className="flex items-center gap-3">
                    {expandedClass === cls.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <p className="font-semibold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{(classSections[cls.id] || []).length} section(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1"
                      onClick={() => { setSectionClassId(cls.id); open("addSection"); }}>
                      <Plus className="w-3 h-3" />Add Section
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm(`Delete ${cls.name}?`)) removeClass.mutate(cls.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {expandedClass === cls.id && (
                  <div className="px-5 pb-4 border-t border-border/40 bg-muted/20">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 pb-2">Sections</p>
                    {!(classSections[cls.id]?.length) ? (
                      <p className="text-xs text-muted-foreground py-2 italic">No sections added yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(classSections[cls.id] || []).map((sec: any) => (
                          <div key={sec.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-border/40 shadow-sm">
                            <Users className="w-3.5 h-3.5 text-primary" />
                            <span className="text-sm font-medium">Section {sec.name}</span>
                            <Badge variant="outline" className="text-[10px]">{sec.capacity || 40} seats</Badge>
                            <button className="ml-1 text-muted-foreground hover:text-primary transition-colors" onClick={() => { setEditSection(sec); setEditSectionForm({ name: sec.name, capacity: sec.capacity || 40 }); }}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => { if (confirm(`Delete Section ${sec.name}?`)) deleteSection.mutate(sec.id); }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => open("addSubject")} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Subject</Button>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Subject Name", "Code", "For Class", "Type", "Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? <tr><td colSpan={5} className="text-center py-16 text-muted-foreground">No subjects yet</td></tr>
                  : subjects.map((s: any) => {
                    const cls = classes.find((c: any) => c.id === s.classId);
                    return (
                      <tr key={s.id} className="border-t border-border/40 hover:bg-accent/20">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.code || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cls?.name || "All Classes"}</td>
                        <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{s.isElective ? "Elective" : "Core"}</Badge></td>
                        <td className="px-4 py-3"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="years" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => open("addYear")} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Academic Year</Button>
          </div>
          {academicYears.length === 0 && <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">No academic years added yet</div>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {academicYears.map((y: any) => (
              <Card key={y.id} className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-xl text-primary">{y.name}</p>
                    {y.isCurrent && <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">Current</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">Start: {y.startDate?.split("T")[0]}</p>
                  <p className="text-xs text-muted-foreground">End: {y.endDate?.split("T")[0]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogs.addClass} onOpenChange={v => { if (!v) { close("addClass"); setClassForm({ branchId: selectedBranchId ?? null }); } }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Class</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Class Name *</Label><Input value={classForm.name || ""} onChange={e => setC("name", e.target.value)} placeholder="e.g. Class 1, Class 10" className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Sort Order</Label><Input type="number" value={classForm.numericOrder || ""} onChange={e => setC("numericOrder", e.target.value)} placeholder="1" className="rounded-xl h-9" /></div>
            <BranchSelectField value={classForm.branchId} onChange={v => setC("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { close("addClass"); setClassForm({ branchId: selectedBranchId ?? null }); }}>Cancel</Button>
              <Button className="flex-1" onClick={() => addClass.mutate(classForm)} disabled={addClass.isPending || !classForm.name}>{addClass.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialog open={dialogs.addSection} onClose={() => close("addSection")} title="Add Section"
        fields={[{ key: "name", label: "Section Name *", placeholder: "A, B, C" }, { key: "capacity", label: "Capacity (seats)", placeholder: "40" }]}
        onSave={(d: any) => addSection.mutate(d)} loading={addSection.isPending} />

      {/* Edit Section Dialog */}
      <Dialog open={!!editSection} onOpenChange={v => { if (!v) setEditSection(null); }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Edit Section {editSection?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Section Name *</Label><Input value={editSectionForm.name || ""} onChange={e => setES("name", e.target.value)} placeholder="A, B, C" className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Capacity (seats)</Label><Input type="number" value={editSectionForm.capacity || ""} onChange={e => setES("capacity", e.target.value)} placeholder="40" className="rounded-xl h-9" /></div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditSection(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => updateSection.mutate({ id: editSection.id, data: editSectionForm })} disabled={updateSection.isPending || !editSectionForm.name}>{updateSection.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialog open={dialogs.addSubject} onClose={() => close("addSubject")} title="Add Subject"
        fields={[
          { key: "name", label: "Subject Name *", placeholder: "Mathematics" },
          { key: "code", label: "Subject Code", placeholder: "MATH01" },
          { key: "classId", label: "For Class", type: "select", placeholder: "All Classes", options: [{ value: "_", label: "All Classes" }, ...classes.map((c: any) => ({ value: String(c.id), label: c.name }))] },
          { key: "isElective", label: "Type", type: "select", options: [{ value: "false", label: "Core Subject" }, { value: "true", label: "Elective" }] },
        ]}
        onSave={(d: any) => addSubject.mutate(d)} loading={addSubject.isPending} />

      <FormDialog open={dialogs.addYear} onClose={() => close("addYear")} title="Add Academic Year"
        fields={[{ key: "name", label: "Year Name *", placeholder: "2024-25" }, { key: "startDate", label: "Start Date *", type: "date" }, { key: "endDate", label: "End Date *", type: "date" }]}
        onSave={(d: any) => addYear.mutate(d)} loading={addYear.isPending} />
    </div>
  );
}
