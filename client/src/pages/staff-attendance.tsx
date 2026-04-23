import { apiFetch } from "@/lib/queryClient";
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserCheck, Save } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["Present", "Absent", "Late", "Half Day", "Leave"];
const STATUS_COLORS: Record<string, string> = {
  Present: "bg-emerald-500 text-white border-emerald-500",
  Absent: "bg-red-500 text-white border-red-500",
  Late: "bg-amber-500 text-white border-amber-500",
  "Half Day": "bg-blue-500 text-white border-blue-500",
  Leave: "bg-purple-500 text-white border-purple-500",
};

export default function StaffAttendancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, branchQuery, branchParam } = useBranch();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: staffList = [] } = useQuery({
    queryKey: ["/api/staff", selectedBranchId],
    queryFn: () => apiFetch(`/api/staff${branchQuery}`),
  });

  const { data: existing = [] } = useQuery({
    queryKey: ["/api/staff-attendance", selectedDate, selectedBranchId],
    queryFn: () => apiFetch(`/api/staff-attendance?date=${selectedDate}${branchParam}`),
    select: (data: any[]) => {
      const map: Record<number, string> = {};
      data.forEach((r: any) => { map[r.staffId] = r.status; });
      return map;
    },
  });

  const merged = { ...existing, ...attendance };

  const markAll = (status: string) => {
    const next: Record<number, string> = {};
    staffList.forEach((s: any) => { next[s.id] = status; });
    setAttendance(next);
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    try {
      const records = staffList.map((s: any) => ({
        staffId: s.id,
        date: selectedDate,
        status: merged[s.id] || "Present",
        branchId: selectedBranchId ?? null,
      }));
      const r = await fetch("/api/staff-attendance/bulk", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (r.ok) {
        qc.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
        toast({ title: `Attendance saved for ${records.length} staff` });
        setAttendance({});
      }
    } catch { toast({ title: "Failed to save", variant: "destructive" }); }
    finally { setIsSaving(false); }
  };

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = staffList.filter((st: any) => (merged[st.id] || "Present") === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCheck className="w-6 h-6 text-primary" />Staff Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mark daily staff attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <Input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setAttendance({}); }} className="rounded-xl h-9 w-44" />
          <Button onClick={saveAttendance} disabled={isSaving || !staffList.length} className="gap-1.5 rounded-xl shadow-md shadow-primary/20">
            <Save className="w-4 h-4" />{isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {STATUSES.map(s => (
          <div key={s} className={`rounded-2xl p-3 text-center border ${s === "Present" ? "bg-emerald-50 border-emerald-200" : s === "Absent" ? "bg-red-50 border-red-200" : s === "Late" ? "bg-amber-50 border-amber-200" : s === "Half Day" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"}`}>
            <p className="text-2xl font-bold">{counts[s] || 0}</p>
            <p className="text-xs text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      {/* Mark All */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Mark All:</span>
        {STATUSES.map(s => (
          <Button key={s} variant="outline" size="sm" className="rounded-xl h-8 text-xs" onClick={() => markAll(s)}>{s}</Button>
        ))}
      </div>

      {staffList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">No staff found for selected branch</div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["#", "Staff Name", "Role", "Present", "Absent", "Late", "Half Day", "Leave"].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s: any, i: number) => {
                const current = merged[s.id] || "Present";
                return (
                  <tr key={s.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{s.name}</td>
                    <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{s.role || "Staff"}</Badge></td>
                    {STATUSES.map(status => (
                      <td key={status} className="px-3 py-2.5">
                        <button
                          onClick={() => setAttendance(p => ({ ...p, [s.id]: status }))}
                          className={`w-8 h-8 rounded-lg text-xs font-medium border transition-all ${current === status ? STATUS_COLORS[status] : "border-border/40 text-muted-foreground hover:border-primary/40"}`}
                        >
                          {status === "Half Day" ? "H" : status[0]}
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
