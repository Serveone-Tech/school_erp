import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Present: "bg-green-100 text-green-700 border-green-200",
  Absent: "bg-red-100 text-red-700 border-red-200",
  Late: "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Half Day": "bg-orange-100 text-orange-700 border-orange-200",
  Holiday: "bg-gray-100 text-gray-500 border-gray-200",
};

function getYearMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ParentAttendancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = getYearMonth(currentDate);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/parent/attendance", month],
    queryFn: async () => {
      const res = await fetch(`/api/parent/attendance?month=${month}`, { credentials: "include" });
      return res.json();
    },
  });

  const records: any[] = data?.records ?? [];
  const summary = data?.summary ?? { total: 0, present: 0, absent: 0, late: 0, halfDay: 0 };

  // Build a map of date → record
  const dateMap = new Map<string, any>(records.map((r: any) => [r.date, r]));

  // Calendar grid
  const year = currentDate.getFullYear();
  const mon = currentDate.getMonth();
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, mon - 1, 1));
  const nextMonth = () => {
    const next = new Date(year, mon + 1, 1);
    if (next <= new Date()) setCurrentDate(next);
  };

  const isNextDisabled = getYearMonth(new Date(year, mon + 1, 1)) > getYearMonth(new Date());

  const attPct = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-green-600" /> Attendance
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium w-28 text-center">
            {currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} disabled={isNextDisabled}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total", val: summary.total, cls: "text-gray-700" },
          { label: "Present", val: summary.present, cls: "text-green-600" },
          { label: "Absent", val: summary.absent, cls: "text-red-500" },
          { label: "Late", val: summary.late, cls: "text-yellow-600" },
          { label: "Half Day", val: summary.halfDay, cls: "text-orange-500" },
        ].map(item => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-3 pb-3">
              <p className={`text-xl font-bold ${item.cls}`}>{item.val}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {attPct !== null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${attPct >= 75 ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${attPct}%` }}
            />
          </div>
          <span className={`text-sm font-semibold ${attPct >= 75 ? "text-green-600" : "text-red-500"}`}>
            {attPct}%
          </span>
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const record = dateMap.get(dateStr);
                  const isToday = dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <div key={day} title={record?.status ?? undefined} className={`
                      aspect-square flex flex-col items-center justify-center rounded-md text-xs border
                      ${isToday ? "ring-2 ring-primary" : ""}
                      ${record ? STATUS_COLORS[record.status] ?? "bg-gray-50 border-gray-200" : "bg-gray-50 border-transparent"}
                    `}>
                      <span className="font-medium">{day}</span>
                      {record && (
                        <span className="text-[8px] leading-none">{record.status.slice(0, 2)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, cls]) => (
          <span key={status} className={`px-2 py-0.5 rounded border ${cls}`}>{status}</span>
        ))}
      </div>

      {/* List view */}
      {records.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Day-wise Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-72 overflow-y-auto">
              {records.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-muted-foreground">{r.date}</span>
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                    {r.status}
                  </Badge>
                  {r.remark && <span className="text-xs text-muted-foreground truncate max-w-24">{r.remark}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
