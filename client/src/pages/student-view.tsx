import { apiFetch } from "@/lib/queryClient";
// client/src/pages/student-view.tsx
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, User, Phone, GraduationCap, Edit2, Save, X, Users } from "lucide-react";
import { useCurrency } from "@/contexts/currency";
// User, Phone used in CardTitles
import { format } from "date-fns";


function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function StudentViewPage() {
  const currency = useCurrency();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: student, isLoading } = useQuery({
    queryKey: ["/api/students", id],
    queryFn: async () => {
      const s = await apiFetch(`/api/students/${id}`);
      setForm(s);
      return s;
    },
  });
  const { data: classes = [] } = useQuery({ queryKey: ["/api/classes"], queryFn: () => apiFetch("/api/classes") });
  const { data: sections = [] } = useQuery({
    queryKey: ["/api/classes/sections", form.classId],
    enabled: !!form.classId,
    queryFn: () => apiFetch(`/api/classes/${form.classId}/sections`),
  });
  const { data: payments = [] } = useQuery({ queryKey: ["/api/fees/payments", id], queryFn: () => apiFetch(`/api/fees/payments?studentId=${id}`) });
  const { data: healthRecords = [] } = useQuery({ queryKey: ["/api/health", id], queryFn: () => apiFetch(`/api/health?studentId=${id}`) });

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetch(`/api/students/${id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, classId: data.classId ? Number(data.classId) : null, sectionId: data.sectionId ? Number(data.sectionId) : null }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/students", id] }); toast({ title: "Student updated" }); setEditing(false); },
  });

  if (isLoading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  if (!student) return <div className="text-center py-16 text-muted-foreground">Student not found</div>;

  const cls = classes.find((c: any) => c.id === student.classId);
  const totalPaid = payments.reduce((s: number, p: any) => s + (p.netAmount || 0), 0);
  const initials = student.name?.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => navigate("/students")}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{student.name}</h1>
          <p className="text-xs text-muted-foreground">Admission No: {student.admissionNo}</p>
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)} className="gap-1.5 rounded-xl h-8 text-xs"><Edit2 className="w-3.5 h-3.5" />Edit</Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={() => { setEditing(false); setForm(student); }}><X className="w-3.5 h-3.5" />Cancel</Button>
            <Button size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}><Save className="w-3.5 h-3.5" />{updateMutation.isPending ? "Saving..." : "Save"}</Button>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg">{student.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {cls && <Badge variant="outline" className="text-xs">{cls.name}</Badge>}
            {sections.find((s: any) => s.id === student.sectionId) && <Badge variant="outline" className="text-xs">Section {sections.find((s: any) => s.id === student.sectionId)?.name}</Badge>}
            <Badge variant="outline" className={`text-xs ${student.status === "Active" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}`}>{student.status}</Badge>
            {student.rollNo && <span className="text-xs text-muted-foreground">Roll No: {student.rollNo}</span>}
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Admitted</p>
          <p className="text-sm font-medium">{student.admissionDate || "—"}</p>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="h-9">
          <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
          <TabsTrigger value="family" className="text-xs">Family</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs">Fee History</TabsTrigger>
          <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4 text-primary" />Personal Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Gender</Label>
                      <Select value={form.gender || "_"} onValueChange={v => set("gender", v === "_" ? "" : v)}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Male","Female","Other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.dob || ""} onChange={e => set("dob", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Blood Group</Label>
                      <Select value={form.bloodGroup || "_"} onValueChange={v => set("bloodGroup", v === "_" ? "" : v)}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Aadhar No.</Label><Input value={form.aadharNo || ""} onChange={e => set("aadharNo", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                      <Select value={form.category || "_"} onValueChange={v => set("category", v === "_" ? "" : v)}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["General","SC","ST","OBC","EWS"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Religion</Label><Input value={form.religion || ""} onChange={e => set("religion", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Gender" value={student.gender} />
                    <InfoRow label="Date of Birth" value={student.dob} />
                    <InfoRow label="Blood Group" value={student.bloodGroup} />
                    <InfoRow label="Aadhar No." value={student.aadharNo} />
                    <InfoRow label="Category" value={student.category} />
                    <InfoRow label="Religion" value={student.religion} />
                    <InfoRow label="Nationality" value={student.nationality} />
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
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="col-span-2 space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={e => set("state", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Pin Code</Label><Input value={form.pinCode || ""} onChange={e => set("pinCode", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Country</Label><Input value={form.country || ""} onChange={e => set("country", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Phone" value={student.phone} />
                    <InfoRow label="Email" value={student.email} />
                    <InfoRow label="Address" value={student.address} />
                    <InfoRow label="City" value={student.city} />
                    <InfoRow label="State" value={student.state} />
                    <InfoRow label="Pin Code" value={student.pinCode} />
                    <InfoRow label="Country" value={student.country} />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50 shadow-sm md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary" />Academic</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Class</Label>
                      <Select value={form.classId ? String(form.classId) : "_"} onValueChange={v => { set("classId", v === "_" ? null : Number(v)); set("sectionId", null); }}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent><SelectItem value="_">No Class</SelectItem>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Section</Label>
                      <Select value={form.sectionId ? String(form.sectionId) : "_"} onValueChange={v => set("sectionId", v === "_" ? null : Number(v))}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue placeholder="Select Section" /></SelectTrigger>
                        <SelectContent><SelectItem value="_">No Section</SelectItem>{sections.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Roll No.</Label><Input value={form.rollNo || ""} onChange={e => set("rollNo", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Admission Date</Label><Input type="date" value={form.admissionDate || ""} onChange={e => set("admissionDate", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Admission Type</Label>
                      <Select value={form.admissionType || "New"} onValueChange={v => set("admissionType", v)}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Transfer">Transfer</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                      <Select value={form.status || "Active"} onValueChange={v => set("status", v)}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem><SelectItem value="TC">TC</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 md:col-span-3 space-y-1.5"><Label className="text-xs">Previous School</Label><Input value={form.previousSchool || ""} onChange={e => set("previousSchool", e.target.value)} className="rounded-xl h-8 text-xs" placeholder="Previous school name (if transfer)" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Blood Group</Label>
                      <Select value={form.bloodGroup || "_"} onValueChange={v => set("bloodGroup", v === "_" ? "" : v)}>
                        <SelectTrigger className="rounded-xl h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 space-y-1.5"><Label className="text-xs">Allergies</Label><Input value={form.allergies || ""} onChange={e => set("allergies", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="col-span-1 space-y-1.5"><Label className="text-xs">Medical Conditions</Label><Input value={form.medicalConditions || ""} onChange={e => set("medicalConditions", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Class" value={cls?.name} />
                    <InfoRow label="Section" value={sections.find((s: any) => s.id === student.sectionId)?.name} />
                    <InfoRow label="Roll No." value={student.rollNo} />
                    <InfoRow label="Admission Type" value={student.admissionType} />
                    <InfoRow label="Admission Date" value={student.admissionDate} />
                    <InfoRow label="Status" value={student.status} />
                    <InfoRow label="Previous School" value={student.previousSchool} />
                    <InfoRow label="Blood Group" value={student.bloodGroup} />
                    <InfoRow label="Allergies" value={student.allergies} />
                    <InfoRow label="Medical Conditions" value={student.medicalConditions} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="family" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Father's Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.fatherName || ""} onChange={e => set("fatherName", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.fatherPhone || ""} onChange={e => set("fatherPhone", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.fatherEmail || ""} onChange={e => set("fatherEmail", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Occupation</Label><Input value={form.fatherOccupation || ""} onChange={e => set("fatherOccupation", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Name" value={student.fatherName} />
                    <InfoRow label="Phone" value={student.fatherPhone} />
                    <InfoRow label="Email" value={student.fatherEmail} />
                    <InfoRow label="Occupation" value={student.fatherOccupation} />
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Mother's Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.motherName || ""} onChange={e => set("motherName", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.motherPhone || ""} onChange={e => set("motherPhone", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.motherEmail || ""} onChange={e => set("motherEmail", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Occupation</Label><Input value={form.motherOccupation || ""} onChange={e => set("motherOccupation", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Name" value={student.motherName} />
                    <InfoRow label="Phone" value={student.motherPhone} />
                    <InfoRow label="Email" value={student.motherEmail} />
                    <InfoRow label="Occupation" value={student.motherOccupation} />
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/50 shadow-sm md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Guardian Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                {editing ? (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Guardian Name</Label><Input value={form.guardianName || ""} onChange={e => set("guardianName", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Guardian Phone</Label><Input value={form.guardianPhone || ""} onChange={e => set("guardianPhone", e.target.value)} className="rounded-xl h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Relation</Label><Input value={form.guardianRelation || ""} onChange={e => set("guardianRelation", e.target.value)} className="rounded-xl h-8 text-xs" placeholder="e.g. Uncle, Grandparent" /></div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Guardian Name" value={student.guardianName} />
                    <InfoRow label="Guardian Phone" value={student.guardianPhone} />
                    <InfoRow label="Relation" value={student.guardianRelation} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between">
              <p className="text-sm font-semibold">Fee Payment History</p>
              <Badge className="bg-emerald-500 hover:bg-emerald-500">Total: {currency.format(totalPaid)}</Badge>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Receipt No","Month","Amount","Discount","Net","Mode","Date","Status"].map(h => <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {payments.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No fee payments</td></tr>
                : payments.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-3 py-2 font-mono text-xs">{p.receiptNo}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.month || "—"}</td>
                    <td className="px-3 py-2">{currency.format(p.amount || 0)}</td>
                    <td className="px-3 py-2 text-green-600">{p.discount ? currency.format(p.discount) : "—"}</td>
                    <td className="px-3 py-2 font-semibold">{currency.format(p.netAmount || 0)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.paymentMode}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{p.paymentDate ? format(new Date(p.paymentDate), "dd MMM yyyy") : "—"}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={`text-xs ${p.status === "Paid" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : ""}`}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Date","Complaint","Diagnosis","Treatment","Doctor","Referred"].map(h => <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {healthRecords.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No health records</td></tr>
                : healthRecords.map((r: any) => (
                  <tr key={r.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2">{r.complaint || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.diagnosis || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.treatment || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.doctorName || "—"}</td>
                    <td className="px-3 py-2">{r.referredToHospital ? <Badge className="text-xs bg-red-500 hover:bg-red-500">Yes</Badge> : <span className="text-xs text-muted-foreground">No</span>}</td>
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
