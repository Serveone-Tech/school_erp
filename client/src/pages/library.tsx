import { apiFetch } from "@/lib/queryClient";
// client/src/pages/library.tsx
import { useState } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, BookMarked, RotateCcw } from "lucide-react";
import { useCurrency } from "@/contexts/currency";
import { format } from "date-fns";


export default function LibraryPage() {
  const currency = useCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("books");
  const [search, setSearch] = useState("");
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ totalCopies: 1, branchId: selectedBranchId ?? null });
  const [issueForm, setIssueForm] = useState<any>({ issueDate: format(new Date(), "yyyy-MM-dd") });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const setI = (k: string, v: any) => setIssueForm((p: any) => ({ ...p, [k]: v }));

  const { data: books = [], isLoading: booksLoading } = useQuery({ queryKey: ["/api/library/books", selectedBranchId], queryFn: () => apiFetch(`/api/library/books${branchQuery}`) });
  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ["/api/library/issues", selectedBranchId], queryFn: () => apiFetch(`/api/library/issues${branchQuery}`) });
  const { data: students = [] } = useQuery({ queryKey: ["/api/students", selectedBranchId], queryFn: () => apiFetch(`/api/students${branchQuery}`) });

  const createBook = useMutation({
    mutationFn: (data: any) => fetch("/api/library/books", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, totalCopies: Number(data.totalCopies || 1), price: Number(data.price || 0) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/library/books"] }); toast({ title: "Book added" }); setAddBookOpen(false); setForm({ totalCopies: 1 }); },
  });

  const issueBook = useMutation({
    mutationFn: (data: any) => fetch("/api/library/issues", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, bookId: Number(data.bookId), studentId: data.studentId ? Number(data.studentId) : null }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/library/issues"] }); qc.invalidateQueries({ queryKey: ["/api/library/books"] }); toast({ title: "Book issued" }); setIssueOpen(false); setIssueForm({ issueDate: format(new Date(), "yyyy-MM-dd") }); },
  });

  const returnBook = useMutation({
    mutationFn: (id: number) => fetch(`/api/library/issues/${id}/return`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/library/issues"] }); qc.invalidateQueries({ queryKey: ["/api/library/books"] }); toast({ title: "Book returned" }); },
  });

  const filteredBooks = books.filter((b: any) => !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.isbn?.includes(search) || b.author?.toLowerCase().includes(search.toLowerCase()));
  const filteredIssues = issues.filter((i: any) => i.status === "Issued");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><BookMarked className="w-6 h-6 text-primary" />Library</h1><p className="text-sm text-muted-foreground mt-0.5">{books.length} books in collection</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIssueOpen(true)} className="gap-1.5 rounded-xl">Issue Book</Button>
          <Button onClick={() => setAddBookOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Book</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="books" className="text-xs">Books ({books.length})</TabsTrigger>
          <TabsTrigger value="issued" className="text-xs">Currently Issued ({filteredIssues.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-3 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, author, ISBN..." className="pl-9 rounded-xl" />
          </div>
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Title","Author","ISBN","Category","Total","Available","Rack","Action"].map(h => <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {booksLoading ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                : filteredBooks.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No books found</td></tr>
                : filteredBooks.map((b: any) => (
                  <tr key={b.id} className="border-t border-border/40 hover:bg-accent/20">
                    <td className="px-3 py-2.5 font-medium max-w-[200px] truncate">{b.title}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{b.author || "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{b.isbn || "—"}</td>
                    <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{b.category || "General"}</Badge></td>
                    <td className="px-3 py-2.5 text-center">{b.totalCopies}</td>
                    <td className="px-3 py-2.5 text-center"><span className={`font-semibold ${(b.availableCopies || 0) === 0 ? "text-red-500" : "text-emerald-600"}`}>{b.availableCopies || 0}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{b.rackNo || "—"}</td>
                    <td className="px-3 py-2.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" disabled={(b.availableCopies || 0) === 0}
                        onClick={() => { setIssueForm({ issueDate: format(new Date(), "yyyy-MM-dd"), bookId: String(b.id) }); setIssueOpen(true); }}>
                        Issue
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="issued" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{["Book","Issued To","Issue Date","Due Date","Status","Action"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {issuesLoading ? <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
                : filteredIssues.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No books currently issued</td></tr>
                : filteredIssues.map((iss: any) => {
                  const book = books.find((b: any) => b.id === iss.bookId);
                  const student = students.find((s: any) => s.id === iss.studentId);
                  const overdue = iss.dueDate && new Date(iss.dueDate) < new Date();
                  return (
                    <tr key={iss.id} className="border-t border-border/40 hover:bg-accent/20">
                      <td className="px-4 py-2.5 font-medium">{book?.title || "Unknown"}</td>
                      <td className="px-4 py-2.5">{student?.name || "Staff"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{iss.issueDate}</td>
                      <td className="px-4 py-2.5 text-xs"><span className={overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>{iss.dueDate}</span></td>
                      <td className="px-4 py-2.5"><Badge variant="outline" className={overdue ? "border-red-200 text-red-700 bg-red-50 text-xs" : "text-xs"}>{overdue ? "Overdue" : "Issued"}</Badge></td>
                      <td className="px-4 py-2.5">
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => returnBook.mutate(iss.id)} disabled={returnBook.isPending}>
                          <RotateCcw className="w-3 h-3" />Return
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Book Dialog */}
      <Dialog open={addBookOpen} onOpenChange={setAddBookOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Add Book</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title || ""} onChange={e => set("title", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Author</Label><Input value={form.author || ""} onChange={e => set("author", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">ISBN</Label><Input value={form.isbn || ""} onChange={e => set("isbn", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Publisher</Label><Input value={form.publisher || ""} onChange={e => set("publisher", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Category</Label><Input value={form.category || ""} onChange={e => set("category", e.target.value)} placeholder="Science, Fiction..." className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Total Copies *</Label><Input type="number" value={form.totalCopies} onChange={e => set("totalCopies", Number(e.target.value))} className="rounded-xl h-9" min="1" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Rack No.</Label><Input value={form.rackNo || ""} onChange={e => set("rackNo", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Price ({currency.symbol})</Label><Input type="number" value={form.price || ""} onChange={e => set("price", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Language</Label><Input value={form.language || "English"} onChange={e => set("language", e.target.value)} className="rounded-xl h-9" /></div>
              <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} className="col-span-2" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddBookOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createBook.mutate(form)} disabled={createBook.isPending || !form.title}>{createBook.isPending ? "Adding..." : "Add Book"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Issue Book Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Book *</Label>
              <Select value={issueForm.bookId || "_"} onValueChange={v => setI("bookId", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Book" /></SelectTrigger>
                <SelectContent>{books.filter((b: any) => (b.availableCopies || 0) > 0).map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Issue To (Student)</Label>
              <Select value={issueForm.studentId || "_"} onValueChange={v => setI("studentId", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select Student</SelectItem>{students.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Issue Date</Label><Input type="date" value={issueForm.issueDate} onChange={e => setI("issueDate", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Due Date *</Label><Input type="date" value={issueForm.dueDate || ""} onChange={e => setI("dueDate", e.target.value)} className="rounded-xl h-9" /></div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => issueBook.mutate(issueForm)} disabled={issueBook.isPending || !issueForm.bookId || !issueForm.dueDate}>{issueBook.isPending ? "Issuing..." : "Issue Book"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
