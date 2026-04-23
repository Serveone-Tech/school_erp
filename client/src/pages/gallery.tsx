import { apiFetch } from "@/lib/queryClient";
import { useState, useRef } from "react";
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
import { Plus, Image as ImageIcon, Trash2, X, Cloud, CloudOff, CheckCircle2, AlertCircle, Upload, ExternalLink, Phone, Mail, MessageCircle, ChevronRight, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["Sports", "Annual Day", "Classroom", "Science Fair", "Cultural", "Trip", "Graduation", "Other"];

// ── Cloudinary Setup Wizard ────────────────────────────────────────────────────

function CloudinarySetupPage({ onConnected }: { onConnected: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ cloudName: "", apiKey: "", apiSecret: "" });
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.cloudName || !form.apiKey || !form.apiSecret) {
      toast({ title: "All three fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/gallery/cloudinary-config", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: data.message || "Connection failed", variant: "destructive" }); return; }
      toast({ title: "Cloudinary connected successfully!" });
      onConnected();
    } catch { toast({ title: "Network error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
          <Cloud className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold">Connect Your Cloudinary Account</h2>
        <p className="text-sm text-muted-foreground">
          Cloudinary stores your school photos and videos securely in the cloud. Connect your free account to start uploading.
        </p>
      </div>

      {/* Step-by-step Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> How to Get Your Cloudinary Credentials
        </h3>
        <ol className="space-y-3 text-sm text-blue-900">
          {[
            <>Go to <a href="https://cloudinary.com" target="_blank" rel="noreferrer" className="underline font-medium inline-flex items-center gap-0.5">cloudinary.com <ExternalLink className="w-3 h-3" /></a> and click <strong>Sign Up Free</strong> (no credit card needed)</>,
            <>After sign-up, you will be taken to your <strong>Dashboard</strong>. Look for the <strong>"Product Environment Credentials"</strong> section.</>,
            <>Copy your <strong>Cloud Name</strong> — it looks like: <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">dxxxxxxxx</code></>,
            <>Copy your <strong>API Key</strong> — it is a long number like: <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">123456789012345</code></>,
            <>Click <strong>Reveal</strong> next to API Secret and copy your <strong>API Secret</strong></>,
            <>Paste all three values below and click <strong>Connect Cloudinary</strong></>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Credentials Form */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold">Enter Your Cloudinary Credentials</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cloud Name *</Label>
            <Input value={form.cloudName} onChange={e => set("cloudName", e.target.value)} placeholder="e.g. dxxxxxxxxx" className="rounded-xl h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API Key *</Label>
            <Input value={form.apiKey} onChange={e => set("apiKey", e.target.value)} placeholder="e.g. 123456789012345" className="rounded-xl h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API Secret *</Label>
            <div className="relative">
              <Input type={showSecret ? "text" : "password"} value={form.apiSecret} onChange={e => set("apiSecret", e.target.value)} placeholder="Your API Secret" className="rounded-xl h-9 font-mono pr-10" />
              <button type="button" onClick={() => setShowSecret(p => !p)} className="absolute right-3 top-2 text-muted-foreground hover:text-foreground">
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Your credentials are encrypted with AES-256 before being stored — they are never stored in plain text.</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl gap-2">
          <Cloud className="w-4 h-4" />
          {saving ? "Connecting & Verifying..." : "Connect Cloudinary"}
        </Button>
      </div>

      {/* Need Help */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Need Help Setting This Up?
        </h3>
        <p className="text-sm text-amber-900">Our support team can help you connect Cloudinary. Reach out through any of the channels below:</p>
        <div className="grid gap-2">
          <a href="tel:+917000000000" className="flex items-center gap-3 text-sm text-amber-900 hover:text-amber-700">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="font-medium">Call / WhatsApp</p>
              <p className="text-xs text-amber-700">+91 70000 00000</p>
            </div>
          </a>
          <a href="https://wa.me/917000000000" target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-amber-900 hover:text-amber-700">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="font-medium">WhatsApp Chat</p>
              <p className="text-xs text-amber-700">Click to open WhatsApp</p>
            </div>
          </a>
          <a href="mailto:zalgoedutech@gmail.com" className="flex items-center gap-3 text-sm text-amber-900 hover:text-amber-700">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="font-medium">Email Support</p>
              <p className="text-xs text-amber-700">zalgoedutech@gmail.com</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Gallery Page ─────────────────────────────────────────────────────────

export default function GalleryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { selectedBranchId, branchQuery } = useBranch();
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [filterCat, setFilterCat] = useState("_all");
  const [form, setForm] = useState<any>({ date: format(new Date(), "yyyy-MM-dd"), branchId: selectedBranchId ?? null });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: cloudStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/gallery/cloudinary-status"],
    queryFn: () => apiFetch("/api/gallery/cloudinary-status"),
  });

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["/api/gallery", selectedBranchId, filterCat],
    queryFn: () => {
      let url = `/api/gallery${branchQuery}`;
      if (filterCat !== "_all") url += `${branchQuery ? "&" : "?"}category=${filterCat}`;
      return apiFetch(url);
    },
    enabled: cloudStatus?.configured === true,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/gallery", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/gallery"] }); toast({ title: "Image saved" }); setAddOpen(false); setForm({ date: format(new Date(), "yyyy-MM-dd"), branchId: selectedBranchId ?? null }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/gallery/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/gallery"] }); toast({ title: "Image deleted" }); },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => fetch("/api/gallery/cloudinary-config", { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/gallery/cloudinary-status"] }); toast({ title: "Cloudinary disconnected" }); },
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/gallery/upload", { method: "POST", credentials: "include", body: fd });
      const data = await r.json();
      if (!r.ok) { toast({ title: data.message || "Upload failed", variant: "destructive" }); return; }
      set("imageUrl", data.url);
      set("title", form.title || file.name.replace(/\.[^.]+$/, ""));
      toast({ title: "File uploaded to Cloudinary" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  if (cloudStatus === undefined) {
    return <div className="flex items-center justify-center py-32 text-muted-foreground">Loading...</div>;
  }

  if (!cloudStatus?.configured) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="w-6 h-6 text-primary" />Student Image Gallery</h1>
          <p className="text-sm text-muted-foreground mt-0.5">School events, activities and memories</p>
        </div>
        <CloudinarySetupPage onConnected={() => { refetchStatus(); qc.invalidateQueries({ queryKey: ["/api/gallery/cloudinary-status"] }); }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="w-6 h-6 text-primary" />Student Image Gallery</h1>
          <p className="text-sm text-muted-foreground mt-0.5">School events, activities and memories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs text-emerald-700 border-emerald-200 bg-emerald-50" disabled>
            <CheckCircle2 className="w-3.5 h-3.5" />Cloudinary Connected
          </Button>
          <Button variant="ghost" size="sm" className="rounded-xl text-xs text-destructive" onClick={() => { if (confirm("Disconnect Cloudinary? You won't be able to upload new images.")) disconnectMutation.mutate(); }}>
            <CloudOff className="w-3.5 h-3.5 mr-1" />Disconnect
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Image</Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filterCat === "_all" ? "default" : "outline"} size="sm" className="rounded-xl h-8 text-xs" onClick={() => setFilterCat("_all")}>All</Button>
        {CATEGORIES.map(c => (
          <Button key={c} variant={filterCat === c ? "default" : "outline"} size="sm" className="rounded-xl h-8 text-xs" onClick={() => setFilterCat(c)}>{c}</Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No images found. Click "Add Image" to upload.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((img: any) => (
            <div key={img.id} className="group relative rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-card cursor-pointer" onClick={() => setPreview(img)}>
              <div className="aspect-square bg-muted/50">
                <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image"; }} />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{img.title}</p>
                {img.category && <Badge variant="outline" className="text-[10px] mt-0.5">{img.category}</Badge>}
              </div>
              <button
                className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={e => { e.stopPropagation(); if (confirm("Delete image?")) deleteMutation.mutate(img.id); }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Image Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Add Image</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Title *</Label><Input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="Annual Sports Day 2024" className="rounded-xl h-9" /></div>

            {/* Upload Area */}
            <div className="space-y-1.5">
              <Label className="text-xs">Photo / Video *</Label>
              {form.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border/50">
                  <img src={form.imageUrl} alt="preview" className="w-full h-36 object-cover" onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/400x200?text=Preview"; }} />
                  <button onClick={() => set("imageUrl", "")} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40"}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <div className="space-y-1"><Upload className="w-8 h-8 mx-auto text-primary animate-bounce" /><p className="text-xs text-muted-foreground">Uploading to Cloudinary...</p></div>
                  ) : (
                    <div className="space-y-1"><Upload className="w-8 h-8 mx-auto text-muted-foreground/50" /><p className="text-xs font-medium">Click to upload or drag & drop</p><p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, MP4 — max 20MB</p></div>
                  )}
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category || "_"} onValueChange={v => set("category", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent><SelectItem value="_">No Category</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={form.description || ""} onChange={e => set("description", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e => set("date", e.target.value)} className="rounded-xl h-9" /></div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.title || !form.imageUrl || uploading}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-2xl w-full bg-card rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img src={preview.imageUrl} alt={preview.title} className="w-full object-contain max-h-[60vh]" />
            <div className="p-4">
              <p className="font-semibold">{preview.title}</p>
              {preview.description && <p className="text-sm text-muted-foreground mt-1">{preview.description}</p>}
              <div className="flex gap-2 mt-2">{preview.category && <Badge variant="outline">{preview.category}</Badge>}{preview.date && <Badge variant="outline">{preview.date}</Badge>}</div>
            </div>
            <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center" onClick={() => setPreview(null)}><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
