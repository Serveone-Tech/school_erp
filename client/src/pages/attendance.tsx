import { apiFetch } from "@/lib/queryClient";
// client/src/pages/attendance.tsx
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserCheck, Save, CalendarDays, BarChart3, X } from "lucide-react";
import { format } from "date-fns";

const STATUS_OPTIONS = ["Present", "Absent", "Late", "Half Day", "Holiday"];
const STATUS_COLORS: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Absent: "bg-red-100 text-red-700 border-red-200",
  Late: "bg-amber-100 text-amber-700 border-amber-200",
  "Half Day": "bg-blue-100 text-blue-700 border-blue-200",
  Holiday: "bg-purple-100 text-purple-700 border-purple-200",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function AttendanceDetailModal({ student, onClose }: { student: any; onClose: () => void }) {
  if (!student) return null;
  const pct = student.totalDays > 0 ? Math.round(((student.Present + student.Late * 0.5) / student.totalDays) * 100) : 0;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            {student.name} — Monthly Detail
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2 text-center">
            {["Present","Absent","Late","Half Day","Holiday"].map(s => (
              <div key={s} className={`rounded-xl p-2 border text-xs ${STATUS_COLORS[s]}`}>
                <p className="text-lg font-bold">{student[s] || 0}</p>
                <p className="font-medium leading-tight">{s}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Attendance %</p>
              <p className="text-xl font-bold text-primary">{pct}%</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs text-muted-foreground">Total Days Marked</p>
              <p className="text-xl font-bold">{student.totalDays}</p>
            </div>
          </div>
          {student.records?.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border/50">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Day</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {student.records.map((r: any) => (
                    <tr key={r.id} className="border-t border-border/30">
                      <td className="px-3 py-1.5 font-medium">{r.date}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{format(new Date(r.date + "T00:00:00"), "EEE")}</td>
                      <td className="px-3 py-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${STATUS_COLORS[r.status] || ""}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AttendancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  // Mark tab state
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("_all");
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Report tab state
  const [rptClass, setRptClass] = useState<string>("");
  const [rptSection, setRptSection] = useState<string>("_all");
  const [rptMonth, setRptMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [rptYear, setRptYear] = useState<string>(String(new Date().getFullYear()));
  const [detailStudent, setDetailStudent] = useState<any>(null);
  const { selectedBranchId, branchParam, branchQuery } = useBranch();

  const { data: classesRaw } = useQuery({ queryKey: ["/api/classes"], queryFn: () => apiFetch("/api/classes") });
  const classes = Array.isArray(classesRaw) ? classesRaw : [];

  // Mark tab queries
  const { data: sectionsRaw } = useQuery({
    queryKey: ["/api/classes/sections", selectedClass],
    enabled: !!selectedClass,
    queryFn: () => apiFetch(`/api/classes/${selectedClass}/sections`),
  });
  const { data: studentsRaw } = useQuery({
    queryKey: ["/api/students", selectedClass, selectedSection, selectedBranchId],
    enabled: !!selectedClass,
    queryFn: () => {
      let url = `/api/students?classId=${selectedClass}`;
      if (selectedSection && selectedSection !== "_all") url += `&sectionId=${selectedSection}`;
      if (selectedBranchId) url += `&branchId=${selectedBranchId}`;
      return apiFetch(url);
    },
  });
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const students = Array.isArray(studentsRaw) ? studentsRaw : [];

  useQuery({
    queryKey: ["/api/attendance", selectedDate, selectedClass, selectedSection, selectedBranchId],
    enabled: !!selectedClass && !!selectedDate,
    queryFn: async () => {
      let url = `/api/attendance?date=${selectedDate}&classId=${selectedClass}`;
      if (selectedSection && selectedSection !== "_all") url += `&sectionId=${selectedSection}`;
      if (selectedBranchId) url += `&branchId=${selectedBranchId}`;
      const data = await apiFetch(url);
      const arr = Array.isArray(data) ? data : [];
      const map: Record<number, string> = {};
      arr.forEach((a: any) => { map[a.studentId] = a.status; });
      setAttendance(map);
      return arr;
    },
  });

  // Report tab queries
  const { data: rptSectionsRaw } = useQuery({
    queryKey: ["/api/classes/sections", rptClass],
    enabled: !!rptClass,
    queryFn: () => apiFetch(`/api/classes/${rptClass}/sections`),
  });
  const rptSections = Array.isArray(rptSectionsRaw) ? rptSectionsRaw : [];

  const { data: reportDataRaw, isLoading: rptLoading } = useQuery({
    queryKey: ["/api/attendance/report", rptClass, rptSection, rptMonth, rptYear, selectedBranchId],
    enabled: !!rptClass,
    queryFn: () => {
      let url = `/api/attendance/report?classId=${rptClass}&month=${rptMonth}&year=${rptYear}`;
      if (rptSection && rptSection !== "_all") url += `&sectionId=${rptSection}`;
      if (selectedBranchId) url += `&branchId=${selectedBranchId}`;
      return apiFetch(url);
    },
  });
  const reportData = Array.isArray(reportDataRaw) ? reportDataRaw : [];

  const markAll = (status: string) => {
    const map: Record<number, string> = {};
    students.forEach((s: any) => { map[s.id] = status; });
    setAttendance(map);
  };

  const saveAttendance = async () => {
    if (!selectedClass) { toast({ title: "Please select a class", variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const records = students.map((s: any) => ({
        studentId: s.id, date: selectedDate, status: attendance[s.id] || "Absent",
        classId: Number(selectedClass),
        sectionId: selectedSection && selectedSection !== "_all" ? Number(selectedSection) : null,
        branchId: selectedBranchId ?? null,
      }));
      const r = await fetch("/api/attendance/bulk", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ records }) });
      if (r.ok) { qc.invalidateQueries({ queryKey: ["/api/attendance"] }); toast({ title: `Attendance saved for ${records.length} students` }); }
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const presentCount = Object.values(attendance).filter(s => s === "Present").length;
  const absentCount = Object.values(attendance).filter(s => s === "Absent").length;
  const lateCount = Object.values(attendance).filter(s => s === "Late").length;

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="w-6 h-6 text-primary" />Attendance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mark and view student attendance</p>
      </div>

      <Tabs defaultValue="mark">
        <TabsList className="h-9">
          <TabsTrigger value="mark" className="text-xs gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Mark Attendance</TabsTrigger>
          <TabsTrigger value="report" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Attendance Report</TabsTrigger>
        </TabsList>

        {/* ── MARK TAB ── */}
        <TabsContent value="mark" className="mt-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="rounded-xl h-9" max={today} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Class *</Label>
                <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection("_all"); setAttendance({}); }}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Section</Label>
                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Sections</SelectItem>
                    {sections.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>Section {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full rounded-xl gap-1.5" onClick={saveAttendance} disabled={isSaving || !selectedClass}>
                  <Save className="w-4 h-4" />{isSaving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </div>
          </div>

          {selectedClass && students.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
                  <p className="text-xs text-emerald-600 font-medium">Present</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{absentCount}</p>
                  <p className="text-xs text-red-600 font-medium">Absent</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{lateCount}</p>
                  <p className="text-xs text-amber-600 font-medium">Late</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Mark All:</span>
                {STATUS_OPTIONS.map(s => (
                  <Button key={s} variant="outline" size="sm" className={`h-7 text-xs rounded-lg ${STATUS_COLORS[s]}`} onClick={() => markAll(s)}>{s}</Button>
                ))}
              </div>
            </>
          )}

          {!selectedClass ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Select a class to mark attendance</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">No students in this class</div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/40">
                <p className="text-sm font-semibold">{students.length} Students — {format(new Date(selectedDate + "T00:00:00"), "dd MMM yyyy, EEEE")}</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-10">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Student Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Roll No</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, idx: number) => {
                    const status = attendance[s.id] || "Present";
                    return (
                      <tr key={s.id} className="border-t border-border/40 hover:bg-accent/10">
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.rollNo || "—"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            {STATUS_OPTIONS.map(opt => (
                              <button key={opt} onClick={() => setAttendance(prev => ({ ...prev, [s.id]: opt }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${status === opt ? STATUS_COLORS[opt] + " font-bold" : "border-border/40 text-muted-foreground hover:bg-accent/30"}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border/40 flex justify-end">
                <Button onClick={saveAttendance} disabled={isSaving} className="gap-1.5 rounded-xl">
                  <Save className="w-4 h-4" />{isSaving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── REPORT TAB ── */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Class *</Label>
                <Select value={rptClass} onValueChange={v => { setRptClass(v); setRptSection("_all"); }}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Section</Label>
                <Select value={rptSection} onValueChange={setRptSection} disabled={!rptClass}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All Sections</SelectItem>
                    {rptSections.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>Section {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Month</Label>
                <Select value={rptMonth} onValueChange={setRptMonth}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Select value={rptYear} onValueChange={setRptYear}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {!rptClass ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Select a class to view attendance report</p>
            </div>
          ) : rptLoading ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">Loading report...</div>
          ) : reportData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">No attendance data for this month</div>
          ) : (
            <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between">
                <p className="text-sm font-semibold">{reportData.length} Students — {MONTHS[Number(rptMonth)-1]} {rptYear}</p>
                <p className="text-xs text-muted-foreground">Click a row to see day-by-day detail</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Roll</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-emerald-700">P</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-red-700">A</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-amber-700">L</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-blue-700">HD</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Days</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((s: any, idx: number) => {
                    const pct = s.totalDays > 0 ? Math.round(((s.Present + s.Late * 0.5) / s.totalDays) * 100) : 0;
                    const pctColor = pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600";
                    return (
                      <tr key={s.studentId} className="border-t border-border/40 hover:bg-accent/20 cursor-pointer" onClick={() => setDetailStudent(s)}>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{s.name}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{s.rollNo || "—"}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-700">{s.Present}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-red-700">{s.Absent}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-amber-700">{s.Late}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-blue-700">{s["Half Day"]}</td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">{s.totalDays}</td>
                        <td className={`px-3 py-2.5 text-center font-bold ${pctColor}`}>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-border/40 flex gap-4 text-xs text-muted-foreground">
                <span><span className="font-semibold text-emerald-700">P</span> = Present</span>
                <span><span className="font-semibold text-red-700">A</span> = Absent</span>
                <span><span className="font-semibold text-amber-700">L</span> = Late</span>
                <span><span className="font-semibold text-blue-700">HD</span> = Half Day</span>
                <span>% = Present + Late×0.5 / Total Days</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {detailStudent && <AttendanceDetailModal student={detailStudent} onClose={() => setDetailStudent(null)} />}
    </div>
  );
}
