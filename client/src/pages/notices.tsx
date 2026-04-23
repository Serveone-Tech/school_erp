import { apiFetch } from "@/lib/queryClient";
// client/src/pages/notices.tsx
import { useState } from "react";
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
import { Plus, Search, Trash2, Bell, Calendar } from "lucide-react";
import { format } from "date-fns";

const AUDIENCES = ["All","Students","Staff","Parents","Teachers"];

export default function NoticesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { selectedBranchId, branchQuery } = useBranch();
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [viewNotice, setViewNotice] = useState<any>(null);
  const [form, setForm] = useState<any>({ targetAudience: "All", isPublished: true, branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: notices = [], isLoading } = useQuery({ queryKey: ["/api/notices", selectedBranchId], queryFn: () => apiFetch(`/api/notices${branchQuery}`) });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/notices", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/notices"] }); toast({ title: "Notice posted" }); setAddOpen(false); setForm({ targetAudience: "All", isPublished: true }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/notices/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/notices"] }); toast({ title: "Notice deleted" }); },
  });

  const filtered = notices.filter((n: any) => {
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase());
    const matchAudience = audienceFilter === "all" || n.targetAudience === audienceFilter;
    return matchSearch && matchAudience;
  });

  const audienceColor: Record<string, string> = {
    All: "border-blue-200 text-blue-700 bg-blue-50",
    Students: "border-emerald-200 text-emerald-700 bg-emerald-50",
    Staff: "border-purple-200 text-purple-700 bg-purple-50",
    Parents: "border-amber-200 text-amber-700 bg-amber-50",
    Teachers: "border-indigo-200 text-indigo-700 bg-indigo-50",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6 text-primary" />Notice Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} notices</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Post Notice</Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notices..." className="pl-9 rounded-xl" />
        </div>
        <Select value={audienceFilter} onValueChange={setAudienceFilter}>
          <SelectTrigger className="w-36 rounded-xl h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Audiences</SelectItem>
            {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div>
      : filtered.length === 0 ? <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50"><Bell className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No notices posted yet</p></div>
      : (
        <div className="space-y-3">
          {filtered.map((n: any) => (
            <div key={n.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 cursor-pointer" onClick={() => setViewNotice(n)}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="font-semibold text-base">{n.title}</p>
                    <Badge variant="outline" className={`text-xs ${audienceColor[n.targetAudience] || ""}`}>{n.targetAudience}</Badge>
                    {!n.isPublished && <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">Draft</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{n.content}</p>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{n.publishDate ? format(new Date(n.publishDate), "dd MMM yyyy, hh:mm a") : "—"}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => { if (confirm("Delete notice?")) deleteMutation.mutate(n.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Notice Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Post Notice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="Notice title" className="rounded-xl h-9" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content *</Label>
              <textarea value={form.content || ""} onChange={e => set("content", e.target.value)} placeholder="Notice content..." className="w-full rounded-xl border border-border px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Audience</Label>
                <Select value={form.targetAudience} onValueChange={v => set("targetAudience", v)}>
                  <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.expiryDate || ""} onChange={e => set("expiryDate", e.target.value)} className="rounded-xl h-9" /></div>
              <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate({ ...form, publishDate: new Date().toISOString(), expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null })} disabled={createMutation.isPending || !form.title || !form.content}>
                {createMutation.isPending ? "Posting..." : "Post Notice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Notice Dialog */}
      {viewNotice && (
        <Dialog open onOpenChange={() => setViewNotice(null)}>
          <DialogContent className="rounded-2xl max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{viewNotice.title}</DialogTitle>
                <Badge variant="outline" className={`text-xs ${audienceColor[viewNotice.targetAudience] || ""}`}>{viewNotice.targetAudience}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{viewNotice.publishDate ? format(new Date(viewNotice.publishDate), "dd MMM yyyy, hh:mm a") : ""}</p>
            </DialogHeader>
            <p className="text-sm text-foreground whitespace-pre-wrap">{viewNotice.content}</p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
