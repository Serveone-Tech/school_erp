import { apiFetch } from "@/lib/queryClient";
// client/src/pages/timetable.tsx
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Calendar } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TimetablePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("_all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<any>({ dayOfWeek: 1 });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const { selectedBranchId, branchQuery } = useBranch();

  const { data: classesRaw } = useQuery({
    queryKey: ["/api/classes", selectedBranchId],
    queryFn: () => apiFetch(`/api/classes${branchQuery}`),
  });
  const { data: sectionsRaw } = useQuery({
    queryKey: ["/api/classes/sections", selectedClass],
    enabled: !!selectedClass,
    queryFn: () => apiFetch(`/api/classes/${selectedClass}/sections`),
  });
  const { data: subjectsRaw } = useQuery({
    queryKey: ["/api/classes/subjects/all"],
    queryFn: () => apiFetch("/api/classes/subjects/all"),
  });
  const { data: staffRaw } = useQuery({
    queryKey: ["/api/staff", selectedBranchId],
    queryFn: () => apiFetch(`/api/staff${branchQuery}`),
  });

  const classes = Array.isArray(classesRaw) ? classesRaw : [];
  const sections = Array.isArray(sectionsRaw) ? sectionsRaw : [];
  const subjects = Array.isArray(subjectsRaw) ? subjectsRaw : [];
  const staffList = Array.isArray(staffRaw) ? staffRaw : [];

  // Timetable data
  const { data: periodsRaw } = useQuery({
    queryKey: ["/api/timetable", selectedClass, selectedSection, selectedBranchId],
    enabled: !!selectedClass,
    queryFn: () => {
      let url = `/api/timetable?classId=${selectedClass}`;
      if (selectedSection && selectedSection !== "_all") url += `&sectionId=${selectedSection}`;
      if (selectedBranchId) url += `&branchId=${selectedBranchId}`;
      return apiFetch(url);
    },
  });
  const periods = Array.isArray(periodsRaw) ? periodsRaw : [];

  const createPeriod = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/timetable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          classId: Number(selectedClass),
          sectionId: selectedSection && selectedSection !== "_all" ? Number(selectedSection) : null,
          subjectId: data.subjectId ? Number(data.subjectId) : null,
          staffId: data.staffId ? Number(data.staffId) : null,
          dayOfWeek: Number(data.dayOfWeek),
          branchId: form.branchId ?? selectedBranchId ?? null,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/timetable"] });
      toast({ title: "Period added" });
      setAddOpen(false);
      setForm({ dayOfWeek: 1 });
    },
  });

  // Group periods by day
  const byDay: Record<number, any[]> = {};
  DAYS.forEach((_, i) => {
    byDay[i + 1] = [];
  });
  (periods as any[]).forEach((p) => {
    if (byDay[p.dayOfWeek]) byDay[p.dayOfWeek].push(p);
  });
  DAYS.forEach((_, i) => {
    byDay[i + 1].sort((a, b) => a.startTime?.localeCompare(b.startTime));
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Timetable
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Class schedules and period management
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={selectedClass}
          onValueChange={(v) => {
            setSelectedClass(v);
            setSelectedSection("_all");
          }}
        >
          <SelectTrigger className="w-40 rounded-xl h-9">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedSection}
          onValueChange={setSelectedSection}
          disabled={!selectedClass}
        >
          <SelectTrigger className="w-36 rounded-xl h-9">
            <SelectValue placeholder="All Sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Sections</SelectItem>
            {sections.map((s: any) => (
              <SelectItem key={s.id} value={String(s.id)}>
                Section {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClass && (
          <Button
            onClick={() => setAddOpen(true)}
            className="gap-1.5 rounded-xl shadow-md shadow-primary/20 ml-auto"
          >
            <Plus className="w-4 h-4" />
            Add Period
          </Button>
        )}
      </div>

      {!selectedClass ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Select a class to view timetable</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((day, idx) => (
            <div
              key={day}
              className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 bg-primary/5 border-b border-border/40">
                <p className="font-semibold text-sm">{day}</p>
              </div>
              <div className="p-3 space-y-2 min-h-[100px]">
                {byDay[idx + 1].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No periods scheduled
                  </p>
                ) : (
                  byDay[idx + 1].map((p: any) => {
                    const subj = subjects.find(
                      (s: any) => s.id === p.subjectId,
                    );
                    const teacher = staffList.find(
                      (s: any) => s.id === p.staffId,
                    );
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/30"
                      >
                        <div className="text-xs text-muted-foreground min-w-[80px]">
                          {p.startTime} - {p.endTime}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold">
                            {subj?.name || p.name}
                          </p>
                          {teacher && (
                            <p className="text-[10px] text-muted-foreground">
                              {teacher.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Period Name *</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Period 1, Lunch Break..."
                className="rounded-xl h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Day *</Label>
              <Select
                value={String(form.dayOfWeek)}
                onValueChange={(v) => set("dayOfWeek", Number(v))}
              >
                <SelectTrigger className="rounded-xl h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={d} value={String(i + 1)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time *</Label>
                <Input
                  type="time"
                  value={form.startTime || ""}
                  onChange={(e) => set("startTime", e.target.value)}
                  className="rounded-xl h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time *</Label>
                <Input
                  type="time"
                  value={form.endTime || ""}
                  onChange={(e) => set("endTime", e.target.value)}
                  className="rounded-xl h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Subject</Label>
              <Select
                value={form.subjectId || "_"}
                onValueChange={(v) => set("subjectId", v === "_" ? null : v)}
              >
                <SelectTrigger className="rounded-xl h-9">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">No Subject (Break)</SelectItem>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teacher</Label>
              <Select
                value={form.staffId || "_"}
                onValueChange={(v) => set("staffId", v === "_" ? null : v)}
              >
                <SelectTrigger className="rounded-xl h-9">
                  <SelectValue placeholder="Assign Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">No Teacher</SelectItem>
                  {staffList.map((s: any) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <BranchSelectField value={form.branchId ?? selectedBranchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => createPeriod.mutate(form)}
                disabled={
                  createPeriod.isPending || !form.name || !form.startTime
                }
              >
                {createPeriod.isPending ? "Saving..." : "Add Period"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
