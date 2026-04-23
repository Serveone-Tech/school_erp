// client/src/pages/staff.tsx
import { useState } from "react";
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
import { Plus, Search, Eye, Trash2, MoreHorizontal, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DESIGNATIONS = ["Teacher","Principal","Vice Principal","Librarian","Accountant","Clerk","Lab Assistant","Peon","Driver","Guard","Sports Teacher","Music Teacher","Art Teacher"];

function AddStaffForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId } = useBranch();
  const [form, setForm] = useState<any>({ status: "Active", designation: "Teacher", branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/staff", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error((await r.json()).message);
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/staff"] }); toast({ title: "Staff added successfully" }); onClose(); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-xs">Full Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Employee ID</Label><Input value={form.employeeId || ""} onChange={e => set("employeeId", e.target.value)} className="rounded-xl h-9" placeholder="EMP001" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Phone *</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="rounded-xl h-9" type="email" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Designation *</Label>
          <Select value={form.designation} onValueChange={v => set("designation", v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Department</Label><Input value={form.department || ""} onChange={e => set("department", e.target.value)} className="rounded-xl h-9" placeholder="Science, Arts..." /></div>
        <div className="space-y-1.5"><Label className="text-xs">Qualification</Label><Input value={form.qualification || ""} onChange={e => set("qualification", e.target.value)} className="rounded-xl h-9" placeholder="B.Ed, M.Sc..." /></div>
        <div className="space-y-1.5"><Label className="text-xs">Experience</Label><Input value={form.experience || ""} onChange={e => set("experience", e.target.value)} className="rounded-xl h-9" placeholder="2 years" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.dob || ""} onChange={e => set("dob", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Joining Date</Label><Input type="date" value={form.joiningDate || ""} onChange={e => set("joiningDate", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Gender</Label>
          <Select value={form.gender || "_"} onValueChange={v => set("gender", v === "_" ? "" : v)}>
            <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Salary (₹)</Label><Input type="number" value={form.salary || ""} onChange={e => set("salary", Number(e.target.value))} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Alternate Phone</Label><Input value={form.alternatePhone || ""} onChange={e => set("alternatePhone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
        <div className="col-span-2 space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={e => set("state", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Aadhar No.</Label><Input value={form.aadharNo || ""} onChange={e => set("aadharNo", e.target.value)} className="rounded-xl h-9" /></div>
        <div className="space-y-1.5"><Label className="text-xs">PAN No.</Label><Input value={form.panNo || ""} onChange={e => set("panNo", e.target.value)} className="rounded-xl h-9" /></div>
        <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.name || !form.phone}>
          {mutation.isPending ? "Adding..." : "Add Staff"}
        </Button>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [desigFilter, setDesigFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 25;
  const { selectedBranchId, branchQuery } = useBranch();

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["/api/staff", selectedBranchId],
    queryFn: async () => { const r = await fetch(`/api/staff${branchQuery}`, { credentials: "include" }); return r.json(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/staff/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/staff"] }); toast({ title: "Staff deleted" }); },
  });

  const filtered = staffList.filter((s: any) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search) || s.employeeId?.includes(search);
    const matchDesig = desigFilter === "all" || s.designation === desigFilter;
    return matchSearch && matchDesig;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-primary" />Staff</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} staff members</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Staff</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, phone, employee ID..." className="pl-9 rounded-xl" />
        </div>
        <Select value={desigFilter} onValueChange={v => { setDesigFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40 rounded-xl h-9"><SelectValue placeholder="Designation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Designations</SelectItem>
            {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Employee ID","Name","Designation","Department","Phone","Status",""].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            : paginated.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No staff found</td></tr>
            : paginated.map((s: any) => (
              <tr key={s.id} className="border-t border-border/40 hover:bg-accent/20 cursor-pointer" onClick={() => navigate(`/staff/${s.id}`)}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.employeeId || "—"}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{s.designation}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{s.department || "—"}</td>
                <td className="px-4 py-3">{s.phone}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={s.status === "Active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700"}>{s.status}</Badge></td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => navigate(`/staff/${s.id}`)}><Eye className="w-4 h-4 mr-2" />View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(s.id); }} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader>
          <AddStaffForm onClose={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
