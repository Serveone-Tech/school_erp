// client/src/pages/onboarding.tsx
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, CheckCircle2, Upload, X } from "lucide-react";

export default function OnboardingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>({ type: "school", boardAffiliation: "CBSE" });
  const [logoPreview, setLogoPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast({ title: "Logo must be under 500KB", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      set("logo", base64);
    };
    reader.readAsDataURL(file);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const r = await fetch("/api/auth/organization", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!r.ok) throw new Error("Failed to save organization");
      await fetch("/api/auth/onboard", { method: "POST", credentials: "include" });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/organization"] });
      toast({ title: "Setup complete! Choose your plan." });
      window.location.href = "/pricing";
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome to School ERP</h1>
          <p className="text-sm text-muted-foreground mt-2">Let's set up your school in a few steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-center mb-4">School Information</h2>

            {/* Logo upload */}
            <div className="space-y-1.5">
              <Label className="text-xs">School Logo</Label>
              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    <button onClick={() => { setLogoPreview(""); set("logo", ""); }} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Logo
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">PNG, JPG up to 500KB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">School Name *</Label>
              <Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Delhi Public School" className="rounded-xl h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => set("type", v)}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="school">School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="coaching">Coaching</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Board</Label>
                <Select value={form.boardAffiliation} onValueChange={v => set("boardAffiliation", v)}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>{["CBSE","ICSE","State Board","IB","NIOS"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Principal Name</Label><Input value={form.principalName || ""} onChange={e => set("principalName", e.target.value)} className="rounded-xl h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Established Year</Label><Input value={form.establishedYear || ""} onChange={e => set("establishedYear", e.target.value)} placeholder="2005" className="rounded-xl h-10" /></div>
            </div>
            <Button className="w-full mt-2 rounded-xl h-11" onClick={() => { if (!form.name) { toast({ title: "School name required", variant: "destructive" }); return; } setStep(2); }}>
              Continue →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-center mb-4">Contact Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="rounded-xl h-10" type="tel" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="rounded-xl h-10" type="email" /></div>
              <div className="col-span-2 space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} className="rounded-xl h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="rounded-xl h-10" /></div>
              <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={e => set("state", e.target.value)} className="rounded-xl h-10" /></div>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setStep(1)}>← Back</Button>
              <Button className="flex-1 rounded-xl h-11" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Setting up..." : "Continue to Pricing →"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
