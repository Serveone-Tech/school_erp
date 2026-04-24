import { apiFetch } from "@/lib/queryClient";
import { useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";
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
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import {
  Plus, ClipboardCheck, Trash2, CheckCircle, XCircle, Clock,
  UserCheck, User, Phone, Mail, GraduationCap, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  Pending:  "border-amber-200 text-amber-700 bg-amber-50",
  Approved: "border-emerald-200 text-emerald-700 bg-emerald-50",
  Rejected: "border-red-200 text-red-700 bg-red-50",
};

const EMPTY_FORM = {
  applicantName: "",
  gender: "",
  dob: "",
  phone: "",
  email: "",
  address: "",
  fatherName: "",
  motherName: "",
  fatherPhone: "",
  fatherEmail: "",
  classApplied: "",
  admissionDate: format(new Date(), "yyyy-MM-dd"),
  remarks: "",
  status: "Pending",
  branchId: null as number | null,
};

export default function AdmissionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { confirm, ConfirmDialog } = useConfirm();
  const { selectedBranchId, branchQuery } = useBranch();
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("_all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM, branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const { data: admissions = [], isLoading } = useQuery({
    queryKey: ["/api/admissions", selectedBranchId, filterStatus],
    queryFn: () => {
      let url = `/api/admissions${branchQuery}`;
      if (filterStatus !== "_all") url += `${branchQuery ? "&" : "?"}status=${filterStatus}`;
      return apiFetch(url);
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
    queryFn: () => apiFetch("/api/classes"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/admissions", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admissions"] });
      toast({ title: "Admission application added" });
      setAddOpen(false);
      setForm({ ...EMPTY_FORM, branchId: selectedBranchId ?? null });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) =>
      fetch(`/api/admissions/${id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admissions"] });
      if (detailOpen) setDetailOpen((p: any) => ({ ...p, status: updateStatus.variables?.status }));
      toast({ title: "Status updated" });
    },
  });

  const admitMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admissions/${id}/admit`, {
        method: "POST", credentials: "include",
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admissions"] });
      toast({ title: "Student admitted!", description: `Record created: ${data.student.admissionNo}` });
      setDetailOpen(null);
      navigate(`/students/${data.student.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admissions/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admissions"] });
      setDetailOpen(null);
      toast({ title: "Deleted" });
    },
  });

  const filtered = (admissions as any[]).filter((a: any) =>
    !search ||
    a.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
    a.applicationNo?.toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search) ||
    a.fatherName?.toLowerCase().includes(search.toLowerCase())
  );

  const pending  = (admissions as any[]).filter((a: any) => a.status === "Pending").length;
  const approved = (admissions as any[]).filter((a: any) => a.status === "Approved").length;
  const rejected = (admissions as any[]).filter((a: any) => a.status === "Rejected").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />Admissions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track admission enquiries — approve to create a student record
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" />New Application
        </Button>
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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {["_all", "Pending", "Approved", "Rejected"].map(s => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm"
            className="rounded-xl h-8 text-xs" onClick={() => setFilterStatus(s)}>
            {s === "_all" ? "All" : s}
          </Button>
        ))}
        <Input
          placeholder="Search by name, phone, father..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-xl h-8 text-xs w-64 ml-auto"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Applicant", "Class Applied", "Contact", "Date", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              : filtered.length === 0
              ? <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No applications found</td></tr>
              : filtered.map((a: any) => (
                <tr key={a.id} className="border-t border-border/40 hover:bg-accent/20 cursor-pointer" onClick={() => setDetailOpen(a)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{a.applicantName || "—"}</p>
                        {a.fatherName && <p className="text-xs text-muted-foreground">Father: {a.fatherName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {a.classApplied || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</div>}
                    {a.email && <div className="flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{a.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {a.admissionDate ? format(new Date(a.admissionDate), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status] || ""}`}>
                      {a.status}
                    </Badge>
                    {a.studentId && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px]">Admitted</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── New Application Dialog ────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Admission Application</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground border-b pb-2 font-medium">Applicant Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Applicant Name *</Label>
                <Input value={form.applicantName} onChange={e => set("applicantName", e.target.value)} placeholder="Full name" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Select value={form.gender || "_"} onValueChange={v => set("gender", v === "_" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Select</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Contact number" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="Email address" className="rounded-xl h-9" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-b pb-2 font-medium">Parent / Guardian</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Father's Name</Label>
                <Input value={form.fatherName} onChange={e => set("fatherName", e.target.value)} placeholder="Father's full name" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Father's Phone</Label>
                <Input value={form.fatherPhone} onChange={e => set("fatherPhone", e.target.value)} placeholder="Father's number" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mother's Name</Label>
                <Input value={form.motherName} onChange={e => set("motherName", e.target.value)} placeholder="Mother's full name" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Father's Email</Label>
                <Input type="email" value={form.fatherEmail} onChange={e => set("fatherEmail", e.target.value)} placeholder="Father's email (parent portal access)" className="rounded-xl h-9" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              Login credentials will be emailed to the father when this application is admitted as a student.
            </p>

            <p className="text-xs text-muted-foreground border-b pb-2 font-medium">Academic</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Class Applied *</Label>
                <Select value={form.classApplied || "_"} onValueChange={v => set("classApplied", v === "_" ? "" : v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Select</SelectItem>
                    {(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Application Date</Label>
                <Input type="date" value={form.admissionDate} onChange={e => set("admissionDate", e.target.value)} className="rounded-xl h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Home address" className="rounded-xl h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Textarea value={form.remarks} onChange={e => set("remarks", e.target.value)} placeholder="Additional notes..." className="rounded-xl min-h-[70px] text-sm" />
            </div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.applicantName || !form.classApplied}
              >
                {createMutation.isPending ? "Saving..." : "Submit Application"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail / Action Dialog ────────────────────────────────────────── */}
      {detailOpen && (
        <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                {detailOpen.applicantName || "Application"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`${STATUS_COLORS[detailOpen.status] || ""}`}>
                  {detailOpen.status}
                </Badge>
              </div>
              {detailOpen.studentId && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-emerald-700 text-xs">
                  <UserCheck className="w-4 h-4 flex-shrink-0" />
                  Student record already created.
                  <button className="underline ml-auto font-medium" onClick={() => { setDetailOpen(null); navigate(`/students/${detailOpen.studentId}`); }}>View</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border rounded-xl p-3 bg-muted/30">
                {[
                  ["Class Applied", detailOpen.classApplied],
                  ["Gender", detailOpen.gender],
                  ["Date of Birth", detailOpen.dob],
                  ["Phone", detailOpen.phone],
                  ["Email", detailOpen.email],
                  ["Father's Name", detailOpen.fatherName],
                  ["Father's Phone", detailOpen.fatherPhone],
                  ["Father's Email", detailOpen.fatherEmail],
                  ["Mother's Name", detailOpen.motherName],
                  ["Address", detailOpen.address],
                  ["Remarks", detailOpen.remarks],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              {detailOpen.status === "Pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 rounded-xl text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => updateStatus.mutate({ id: detailOpen.id, status: "Approved" })}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="flex-1 rounded-xl text-red-700 border-red-200 hover:bg-red-50"
                    onClick={() => updateStatus.mutate({ id: detailOpen.id, status: "Rejected" })}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              )}

              {detailOpen.status === "Approved" && !detailOpen.studentId && (
                <Button
                  className="w-full rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => admitMutation.mutate(detailOpen.id)}
                  disabled={admitMutation.isPending}
                >
                  <UserCheck className="w-4 h-4" />
                  {admitMutation.isPending ? "Creating student record..." : "Admit as Student"}
                </Button>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  variant="ghost" size="sm"
                  className="text-destructive hover:text-destructive rounded-xl text-xs gap-1"
                  onClick={async () => { if (await confirm({ title: "Delete Application", description: "This admission application will be permanently deleted.", confirmLabel: "Delete", variant: "destructive" })) deleteMutation.mutate(detailOpen.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Application
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {ConfirmDialog}
    </div>
  );
}
