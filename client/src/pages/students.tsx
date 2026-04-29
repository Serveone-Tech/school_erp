// client/src/pages/students.tsx
import { useState, useEffect, useRef } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Trash2, MoreHorizontal, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

function useClasses() {
  return useQuery({ queryKey: ["/api/classes"], queryFn: async () => { const r = await fetch("/api/classes", { credentials: "include" }); return r.json(); } });
}
function useSections(classId?: number) {
  return useQuery({ queryKey: ["/api/classes/sections", classId], enabled: !!classId, queryFn: async () => { const r = await fetch(`/api/classes/${classId}/sections`, { credentials: "include" }); return r.json(); } });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="col-span-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border/40 first:border-t-0 first:pt-0">{children}</p>;
}

function AddStudentForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: classes = [] } = useClasses();
  const { selectedBranchId } = useBranch();
  const [form, setForm] = useState<any>({
    admissionNo: `ADM-${Date.now()}`, rollNo: "", name: "", phone: "", email: "",
    gender: "", dob: "", classId: "", sectionId: "",
    admissionDate: format(new Date(), "yyyy-MM-dd"), admissionType: "New", previousSchool: "",
    fatherName: "", fatherPhone: "", fatherEmail: "", fatherOccupation: "",
    motherName: "", motherPhone: "", motherEmail: "", motherOccupation: "",
    guardianName: "", guardianPhone: "", guardianRelation: "",
    address: "", city: "", state: "", pinCode: "", country: "India",
    bloodGroup: "", allergies: "", medicalConditions: "",
    category: "", religion: "", nationality: "Indian", aadharNo: "",
    status: "Active", branchId: selectedBranchId ?? null,
  });
  const { data: sections = [] } = useSections(form.classId ? Number(form.classId) : undefined);
  const rollNoManuallyEdited = useRef(false);

  const { data: classSectionStudents = [], isFetching: fetchingRollNo } = useQuery({
    queryKey: ["/api/students/for-rollno", form.classId, form.sectionId],
    enabled: !!form.classId,
    staleTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams({ classId: form.classId });
      if (form.sectionId) params.set("sectionId", form.sectionId);
      const r = await fetch(`/api/students?${params}`, { credentials: "include" });
      return r.json();
    },
  });

  useEffect(() => {
    if (fetchingRollNo || rollNoManuallyEdited.current) return;
    const nums = (classSectionStudents as any[])
      .map((s: any) => s.rollNo)
      .filter((r: any) => r && /^\d+$/.test(String(r)))
      .map(Number);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setForm((f: any) => ({ ...f, rollNo: String(next) }));
  }, [fetchingRollNo, classSectionStudents]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/students", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/students"] }); toast({ title: "Student added" }); onClose(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">

        {/* ── Basic Info ── */}
        <SectionTitle>Basic Information</SectionTitle>
        <div className="space-y-1.5"><Label className="text-xs">Admission No *</Label><Input value={form.admissionNo} onChange={e => set("admissionNo", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Roll No.</Label><Input value={form.rollNo} onChange={e => { rollNoManuallyEdited.current = true; set("rollNo", e.target.value); }} disabled={fetchingRollNo && !rollNoManuallyEdited.current} placeholder={fetchingRollNo ? "Generating..." : "Auto"} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Gender</Label>
          <Select value={form.gender || "_"} onValueChange={v => set("gender", v === "_" ? "" : v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => set("email", e.target.value)} className="rounded-xl h-9" type="email" /></div>

        {/* ── Academic ── */}
        <SectionTitle>Academic Details</SectionTitle>
        <div className="space-y-1.5">
          <Label className="text-xs">Class *</Label>
          <Select value={form.classId || "_"} onValueChange={v => { set("classId", v === "_" ? "" : v); set("sectionId", ""); rollNoManuallyEdited.current = false; }}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent><SelectItem value="_">Select Class</SelectItem>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Section</Label>
          <Select value={form.sectionId || "_"} onValueChange={v => { set("sectionId", v === "_" ? "" : v); rollNoManuallyEdited.current = false; }}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Section" /></SelectTrigger>
            <SelectContent><SelectItem value="_">Select Section</SelectItem>{sections.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Admission Date</Label><Input type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Admission Type</Label>
          <Select value={form.admissionType || "New"} onValueChange={v => set("admissionType", v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Transfer">Transfer</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5"><Label className="text-xs">Previous School</Label><Input value={form.previousSchool} onChange={e => set("previousSchool", e.target.value)} className="rounded-xl h-9" placeholder="Previous school name (if transfer)" /></div>

        {/* ── Parents / Guardian ── */}
        <SectionTitle>Parents / Guardian</SectionTitle>
        <div className="space-y-1.5"><Label className="text-xs">Father's Name</Label><Input value={form.fatherName} onChange={e => set("fatherName", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Father's Phone</Label><Input value={form.fatherPhone} onChange={e => set("fatherPhone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Father's Email</Label><Input value={form.fatherEmail} onChange={e => set("fatherEmail", e.target.value)} className="rounded-xl h-9" type="email" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Father's Occupation</Label><Input value={form.fatherOccupation} onChange={e => set("fatherOccupation", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Mother's Name</Label><Input value={form.motherName} onChange={e => set("motherName", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Mother's Phone</Label><Input value={form.motherPhone} onChange={e => set("motherPhone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Mother's Email</Label><Input value={form.motherEmail} onChange={e => set("motherEmail", e.target.value)} className="rounded-xl h-9" type="email" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Mother's Occupation</Label><Input value={form.motherOccupation} onChange={e => set("motherOccupation", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Guardian Name</Label><Input value={form.guardianName} onChange={e => set("guardianName", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Guardian Phone</Label><Input value={form.guardianPhone} onChange={e => set("guardianPhone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Guardian Relation</Label><Input value={form.guardianRelation} onChange={e => set("guardianRelation", e.target.value)} className="rounded-xl h-9" placeholder="e.g. Uncle, Grandparent" /></div>

        {/* ── Address ── */}
        <SectionTitle>Address</SectionTitle>
        <div className="col-span-2 space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city} onChange={e => set("city", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state} onChange={e => set("state", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Pin Code</Label><Input value={form.pinCode} onChange={e => set("pinCode", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Country</Label><Input value={form.country} onChange={e => set("country", e.target.value)} className="rounded-xl h-9" /></div>

        {/* ── Medical & Other ── */}
        <SectionTitle>Medical & Other</SectionTitle>
        <div className="space-y-1.5">
          <Label className="text-xs">Blood Group</Label>
          <Select value={form.bloodGroup || "_"} onValueChange={v => set("bloodGroup", v === "_" ? "" : v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={form.category || "_"} onValueChange={v => set("category", v === "_" ? "" : v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["General","SC","ST","OBC","EWS"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Religion</Label><Input value={form.religion} onChange={e => set("religion", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Nationality</Label><Input value={form.nationality} onChange={e => set("nationality", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Aadhar No.</Label><Input value={form.aadharNo} onChange={e => set("aadharNo", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="col-span-2 space-y-1.5"><Label className="text-xs">Allergies</Label><Input value={form.allergies} onChange={e => set("allergies", e.target.value)} className="rounded-xl h-9" placeholder="e.g. Peanuts, Dust (if any)" /></div>
        <div className="col-span-2 space-y-1.5"><Label className="text-xs">Medical Conditions</Label><Input value={form.medicalConditions} onChange={e => set("medicalConditions", e.target.value)} className="rounded-xl h-9" placeholder="e.g. Asthma, Diabetes (if any)" /></div>
        <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={() => mutation.mutate({ ...form, classId: form.classId ? Number(form.classId) : null, sectionId: form.sectionId ? Number(form.sectionId) : null })} disabled={mutation.isPending || !form.name}>
          {mutation.isPending ? "Adding..." : "Add Student"}
        </Button>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const { selectedBranchId, branchQuery } = useBranch();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["/api/students", selectedBranchId],
    queryFn: async () => { const r = await fetch(`/api/students${branchQuery}`, { credentials: "include" }); return r.json(); },
  });
  const { data: classes = [] } = useClasses();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await fetch(`/api/students/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/students"] }); toast({ title: "Student deleted" }); },
  });

  const filtered = students.filter((s: any) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.admissionNo?.includes(search) || s.phone?.includes(search);
    const matchClass = classFilter === "all" || String(s.classId) === classFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" />Students</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} students found</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" /> Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, admission no, phone..." className="pl-9 rounded-xl" />
        </div>
        <Select value={classFilter} onValueChange={v => { setClassFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 rounded-xl h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32 rounded-xl h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="TC">TC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Admission No", "Name", "Class/Section", "Father's Name", "Phone", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No students found</td></tr>
              ) : paginated.map((s: any) => {
                const cls = classes.find((c: any) => c.id === s.classId);
                return (
                  <tr key={s.id} className="border-t border-border/40 hover:bg-accent/20 cursor-pointer" onClick={() => navigate(`/students/${s.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.admissionNo}</td>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cls?.name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.fatherName || "—"}</td>
                    <td className="px-4 py-3">{s.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={s.status === "Active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => navigate(`/students/${s.id}`)}><Eye className="w-4 h-4 mr-2" />View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={async () => { if (await confirm({ title: "Delete Student", description: `Remove ${s.name} from the system? All their records will be deleted.`, confirmLabel: "Delete", variant: "destructive" })) deleteMutation.mutate(s.id); }} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground">Showing {Math.min((page-1)*perPage+1, filtered.length)} to {Math.min(page*perPage, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" disabled={page === 1} onClick={() => setPage(p => p-1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
            <span className="text-xs font-medium">{page} / {totalPages || 1}</span>
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" disabled={page >= totalPages} onClick={() => setPage(p => p+1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
          <AddStudentForm onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
