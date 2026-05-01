import { apiFetch } from "@/lib/queryClient";
// client/src/pages/organization.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Save, Mail, CheckCircle2, AlertCircle, Trash2, Loader2, BookOpen, ShieldCheck, Key, Settings2, FlaskConical, ArrowRight, ExternalLink } from "lucide-react";

// ── Email Setup Guide Dialog ──────────────────────────────────────────────────
function EmailSetupGuide({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const steps = [
    {
      icon: ShieldCheck,
      color: "text-blue-600",
      bg: "bg-blue-50",
      title: "Enable 2-Step Verification on your Google Account",
      description: "Google requires 2-Step Verification to be turned on before you can create an App Password.",
      actions: [
        { label: "Go to your Google Account", note: "myaccount.google.com" },
        { label: 'Click "Security" in the left sidebar' },
        { label: 'Under "How you sign in to Google", click "2-Step Verification"' },
        { label: 'Click "Get started" and follow the on-screen steps to enable it' },
      ],
      warning: "If 2-Step Verification is already on, skip to Step 2.",
    },
    {
      icon: Key,
      color: "text-purple-600",
      bg: "bg-purple-50",
      title: "Generate a Gmail App Password",
      description: "An App Password is a special 16-character password that lets this ERP send emails on your behalf — without exposing your real Gmail password.",
      actions: [
        { label: "Go to your Google Account → Security" },
        { label: 'Search for "App passwords" in the search bar at the top, or find it under 2-Step Verification' },
        { label: 'In the "App name" field, type anything — e.g. "School ERP"' },
        { label: 'Click "Create"' },
        { label: 'Copy the 16-character password shown (e.g. abcd efgh ijkl mnop)' },
      ],
      note: "This password is shown only once. Copy it immediately before closing the dialog.",
    },
    {
      icon: Settings2,
      color: "text-green-600",
      bg: "bg-green-50",
      title: 'Fill in the "Email SMTP Configuration" card below',
      description: "Now paste your credentials into the form on this page.",
      actions: [
        { label: "Gmail Address — enter the Gmail you just set up the App Password for" },
        { label: "Gmail App Password — paste the 16-character code (spaces are fine)" },
        { label: 'From Name — type your school name (e.g. "Delhi Public School"). This appears as the sender name in emails.' },
      ],
    },
    {
      icon: FlaskConical,
      color: "text-orange-600",
      bg: "bg-orange-50",
      title: 'Click "Connect & Verify"',
      description: "The system will test your credentials by connecting to Gmail's SMTP server. If the test passes, your config is saved (encrypted). You'll see a green Connected badge.",
      actions: [
        { label: "A live test is run before anything is saved — if credentials are wrong, nothing is stored" },
        { label: "Credentials are encrypted with AES-256 before being stored in the database" },
        { label: "From now on, all parent portal welcome emails will be sent from your school's Gmail" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-5 h-5 text-primary" /> Gmail SMTP Setup Guide
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Follow these steps to connect your school's Gmail account so parents receive login credentials and OTP emails.
          </p>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Step connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-5 top-11 bottom-0 w-px bg-border" style={{ height: "calc(100% - 2.5rem)" }} />
              )}

              <div className="flex gap-4">
                {/* Step icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${step.bg}`}>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <p className="font-semibold text-sm mb-1">{step.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{step.description}</p>

                  <div className="space-y-2">
                    {step.actions.map((action: any, j: number) => (
                      <div key={j} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-[9px] font-bold text-muted-foreground">{j + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-foreground">{action.label}</p>
                          {action.note && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{action.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {step.warning && (
                    <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-800">{step.warning}</p>
                    </div>
                  )}
                  {step.note && (
                    <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-800">{step.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* FAQ section */}
          <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Common Questions</p>
            {[
              {
                q: "Can I use any Gmail account?",
                a: "Yes — a dedicated Gmail created just for your school (e.g. admissions@yourschool.com) is recommended so personal emails stay private.",
              },
              {
                q: "What if I see 'App passwords' option is missing?",
                a: "This happens when 2-Step Verification is not yet enabled. Complete Step 1 first, then refresh the page and try again.",
              },
              {
                q: "Is my password stored securely?",
                a: "Yes. Your App Password is encrypted using AES-256 before being saved to the database. It is never stored in plain text.",
              },
              {
                q: "What emails does this send?",
                a: "Parent portal welcome emails (with login credentials) when a student is enrolled, and OTP emails when a parent uses Forgot Password.",
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-xs font-semibold">{q}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={() => onOpenChange(false)} className="rounded-xl">
              Got it, let me set it up <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function OrganizationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Email SMTP config state
  const [emailForm, setEmailForm] = useState({ emailUser: "", emailPass: "", emailFromName: "" });
  const setE = (k: string, v: string) => setEmailForm(p => ({ ...p, [k]: v }));
  const [guideOpen, setGuideOpen] = useState(false);

  const { data: org } = useQuery({ queryKey: ["/api/auth/organization"], queryFn: () => apiFetch("/api/auth/organization").catch(() => null) });

  useEffect(() => { if (org) setForm(org); }, [org]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/auth/organization", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/auth/organization"] }); toast({ title: "Organization settings saved" }); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  // Email config queries/mutations
  const { data: emailStatus, isLoading: emailStatusLoading } = useQuery<any>({
    queryKey: ["/api/gallery/email-status"],
    queryFn: () => apiFetch("/api/gallery/email-status"),
  });

  const saveEmailMutation = useMutation({
    mutationFn: () => fetch("/api/gallery/email-config", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailForm),
    }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }),
    onSuccess: (d) => { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/gallery/email-status"] }); setEmailForm(p => ({ ...p, emailPass: "" })); },
    onError: (err: any) => toast({ title: err.message, variant: "destructive" }),
  });

  const removeEmailMutation = useMutation({
    mutationFn: () => fetch("/api/gallery/email-config", { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Email config removed" }); qc.invalidateQueries({ queryKey: ["/api/gallery/email-status"] }); setEmailForm({ emailUser: "", emailPass: "", emailFromName: "" }); },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  useEffect(() => {
    if (emailStatus?.configured) {
      setEmailForm(p => ({ ...p, emailUser: emailStatus.emailUser ?? "", emailFromName: emailStatus.fromName ?? "" }));
    }
  }, [emailStatus]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" />Organization Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your school's information</p>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm">School Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">School Name *</Label><Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Delhi Public School" className="rounded-xl h-9" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.type || "school"} onValueChange={v => set("type", v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="school">School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="institute">Institute</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Board Affiliation</Label>
              <Select value={form.boardAffiliation || "_"} onValueChange={v => set("boardAffiliation", v === "_" ? "" : v)}>
                <SelectTrigger className="rounded-xl h-9"><SelectValue placeholder="Select Board" /></SelectTrigger>
                <SelectContent><SelectItem value="_">Select Board</SelectItem>{["CBSE","ICSE","IB","State Board","NIOS","Other"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Principal Name</Label><Input value={form.principalName || ""} onChange={e => set("principalName", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Established Year</Label><Input value={form.establishedYear || ""} onChange={e => set("establishedYear", e.target.value)} placeholder="2005" className="rounded-xl h-9" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs">Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="rounded-xl h-9" type="email" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Website</Label><Input value={form.website || ""} onChange={e => set("website", e.target.value)} placeholder="https://..." className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Pincode</Label><Input value={form.pincode || ""} onChange={e => set("pincode", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address || ""} onChange={e => set("address", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">City</Label><Input value={form.city || ""} onChange={e => set("city", e.target.value)} className="rounded-xl h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">State</Label><Input value={form.state || ""} onChange={e => set("state", e.target.value)} className="rounded-xl h-9" /></div>
          </div>
        </CardContent>
      </Card>

      <EmailSetupGuide open={guideOpen} onOpenChange={setGuideOpen} />

      {/* Email SMTP Config Card */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Email SMTP Configuration
              {emailStatusLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              ) : emailStatus?.configured && emailStatus?.verified ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-1 flex items-center">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] gap-1 flex items-center text-muted-foreground">
                  <AlertCircle className="w-3 h-3" /> Not configured
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGuideOpen(true)}
              className="gap-1.5 text-xs h-7 px-2.5 text-primary hover:text-primary rounded-lg flex-shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" /> How to set this up?
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure your school's Gmail to send parent portal credentials and OTP emails. Use a Gmail App Password — not your regular password.{" "}
            <button onClick={() => setGuideOpen(true)} className="text-primary underline underline-offset-2 hover:no-underline">
              View setup guide
            </button>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Gmail Address *</Label>
              <Input value={emailForm.emailUser} onChange={e => setE("emailUser", e.target.value)} placeholder="yourschool@gmail.com" className="rounded-xl h-9" type="email" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Gmail App Password *</Label>
              <PasswordInput value={emailForm.emailPass} onChange={e => setE("emailPass", e.target.value)} placeholder={emailStatus?.configured ? "Leave blank to keep existing" : "xxxx xxxx xxxx xxxx"} className="rounded-xl h-9" />
              <p className="text-[11px] text-muted-foreground">
                Generate from: Google Account → Security → 2-Step Verification → App Passwords
              </p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">From Name (shown in email)</Label>
              <Input value={emailForm.emailFromName} onChange={e => setE("emailFromName", e.target.value)} placeholder="e.g. Delhi Public School" className="rounded-xl h-9" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={() => saveEmailMutation.mutate()}
              disabled={saveEmailMutation.isPending || !emailForm.emailUser || (!emailForm.emailPass && !emailStatus?.configured)}
              className="gap-1.5 rounded-xl"
              size="sm"
            >
              {saveEmailMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {saveEmailMutation.isPending ? "Verifying…" : emailStatus?.configured ? "Update Config" : "Connect & Verify"}
            </Button>
            {emailStatus?.configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEmailMutation.mutate()}
                disabled={removeEmailMutation.isPending}
                className="gap-1.5 rounded-xl text-destructive border-destructive/40 hover:bg-destructive/5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name} className="gap-1.5 rounded-xl shadow-md shadow-primary/20 px-8">
          <Save className="w-4 h-4" />{saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
