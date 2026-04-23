import { apiFetch } from "@/lib/queryClient";
// client/src/pages/staff-view.tsx
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, User, Phone, MapPin, Edit2, Save, X, GraduationCap } from "lucide-react";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return <div className="flex flex-col gap-0.5"><span className="text-xs text-muted-foreground">{label}</span><span className="text-sm font-medium">{value || "—"}</span></div>;
}

const DESIGNATIONS = ["Teacher","Principal","Vice Principal","Librarian","Accountant","Clerk","Lab Assistant","Peon","Driver","Guard","Sports Teacher","Music Teacher","Art Teacher"];

export default function StaffViewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: member, isLoading } = useQuery({
    queryKey: ["/api/staff", id],
    queryFn: async () => {
      const s = await apiFetch(`/api/staff/${id}`);
      setForm(s);
      return s;
    },
  });
  const { data: payrolls = [] } = useQuery({ queryKey: ["/api/payroll", id], queryFn: () => apiFetch("/api/payroll") });
  const memberPayrolls = payrolls.filter((p: any) => p.staffId === Number(id));

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetch(`/api/staff/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, salary: data.salary ? Number(data.salary) : null }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/staff", id] }); toast({ title: "Staff updated" }); setEditing(false); },
  });

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  if (!member) return <div className="text-center py-16 text-muted-foreground">Staff member not found</div>;

  const initials = member.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => navigate("/staff")}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex-1"><h1 className="text-xl font-bold">{member.name}</h1><p className="text-xs text-muted-foreground">{member.designation} {member.department ? `· ${member.department}` : ""}</p></div>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)} className="gap-1.5 rounded-xl h-8 text-xs"><Edit2 className="w-3.5 h-3.5" />Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={() => { setEditing(false); setForm(member); }}><X className="w-3.5 h-3.5" />Cancel</Button>
            <Button size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}><Save className="w-3.5 h-3.5" />{updateMutation.isPending ? "Saving..." : "Save"}</Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl flex-shrink-0">{initials}</div>
        <div className="flex-1">
          <p className="font-bold text-lg">{member.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">{member.designation}</Badge>
            {member.department && <Badge variant="outline" className="text-xs">{member.department}</Badge>}
            <Badge variant="outline" className={`text-xs ${member.status === "Active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}`}>{member.status}</Badge>
          </div>
        </div>
        {member.salary && <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">Monthly Salary</p><p className="text-lg font-bold text-primary">₹{member.salary.toLocaleString("en-IN")}</p></div>}
      </div>

      <Tabs defaultValue="details">
        <TabsList className="h-9">
          <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
          <TabsTrigger value="bank" className="text-xs">Bank & Docs</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-primary" />Personal Info</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Employee ID</Label><Input value={form.employeeId || ""} onChange={e => set("employeeId", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Gender</Label><Select value={form.gender || "_"} onValueChange={v => set("gender", v === "_" ? "" : v)}><SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.dob || ""} onChange={e => set("dob", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Designation</Label><Select value={form.designation || "_"} onValueChange={v => set("designation", v)}><SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1.5"><Label className="text-xs">Department</Label><Input value={form.department || ""} onChange={e => set("department", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Qualification</Label><Input value={form.qualification || ""} onChange={e => set("qualification", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Joining Date</Label><Input type="date" value={form.joiningDate || ""} onChange={e => set("joiningDate", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Experience</Label><Input value={form.experience || ""} onChange={e => set("experience", e.target.value)} className="rounded-xl h-8 text-xs" placeholder="2 years" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Salary (₹)</Label><Input type="number" value={form.salary || ""} onChange={e => set("salary", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Status</Label><Select value={form.status || "Active"} onValueChange={v => set("status", v)}><SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Employee ID" value={member.employeeId} />
                    <InfoRow label="Gender" value={member.gender} />
                    <InfoRow label="Date of Birth" value={member.dob} />
                    <InfoRow label="Qualification" value={member.qualification} />
                    <InfoRow label="Experience" value={member.experience} />
                    <InfoRow label="Joining Date" value={member.joiningDate} />
                    <InfoRow label="Status" value={member.status} />
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />Contact</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Alternate Phone</Label><Input value={form.alternatePhone || ""} onChange={e => set("alternatePhone", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="col-span-2 space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={e => set("state", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Phone" value={member.phone} />
                    <InfoRow label="Alternate Phone" value={member.alternatePhone} />
                    <InfoRow label="Email" value={member.email} />
                    <div className="col-span-2"><InfoRow label="Address" value={member.address} /></div>
                    <InfoRow label="City" value={member.city} />
                    <InfoRow label="State" value={member.state} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Bank & Document Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {editing ? (
                <>
                  <div className="space-y-1.5"><Label className="text-xs">Bank Account No.</Label><Input value={form.bankAccount || ""} onChange={e => set("bankAccount", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Bank Name</Label><Input value={form.bankName || ""} onChange={e => set("bankName", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">IFSC Code</Label><Input value={form.ifscCode || ""} onChange={e => set("ifscCode", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Aadhar No.</Label><Input value={form.aadharNo || ""} onChange={e => set("aadharNo", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">PAN No.</Label><Input value={form.panNo || ""} onChange={e => set("panNo", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                </>
              ) : (
                <>
                  <InfoRow label="Bank Account No." value={member.bankAccount} />
                  <InfoRow label="Bank Name" value={member.bankName} />
                  <InfoRow label="IFSC Code" value={member.ifscCode} />
                  <InfoRow label="Aadhar No." value={member.aadharNo} />
                  <InfoRow label="PAN No." value={member.panNo} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Month","Basic","Allowances","Deductions","Net","Status"].map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {memberPayrolls.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No payroll records</td></tr>
                : memberPayrolls.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-4 py-2.5 font-medium">{p.month}</td>
                    <td className="px-4 py-2.5">₹{(p.basicSalary || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-emerald-600">+₹{(p.allowances || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 text-red-600">-₹{(p.deductions || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5 font-bold">₹{(p.netSalary || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className={`text-xs ${p.status === "Paid" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}`}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
