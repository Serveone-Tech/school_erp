// client/src/pages/automation.tsx — REPLACE COMPLETELY
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Zap, Mail, MessageSquare, Phone, CheckCircle2, AlertCircle,
  ExternalLink, HelpCircle, Settings, Send, ChevronRight,
  BookOpen, HeadphonesIcon, ArrowRight, Eye, EyeOff, Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ── Types ─────────────────────────────────────────────────────────────────────
type Channel = "email" | "sms" | "whatsapp";

interface ChannelConfig {
  enabled: boolean;
  // Email (Twilio SendGrid)
  sendgridApiKey?: string;
  fromEmail?: string;
  fromName?: string;
  // SMS (Twilio)
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  // WhatsApp (Twilio)
  twilioWhatsappNumber?: string; // format: whatsapp:+91XXXXXXXXXX
}

interface AutomationCredentials {
  email?: ChannelConfig & { enabled: boolean };
  sms?: ChannelConfig & { enabled: boolean };
  whatsapp?: ChannelConfig & { enabled: boolean };
}

// ── Help Guide Content ────────────────────────────────────────────────────────
const HELP_STEPS = {
  twilio_account: {
    title: "Step 1: Create a Twilio Account",
    steps: [
      "Go to twilio.com/try-twilio",
      'Click "Sign Up" and create a free account',
      "Verify your email address",
      "Complete phone verification",
      "You will get free trial credits ($15)",
    ],
    link: "https://www.twilio.com/try-twilio",
    linkText: "Open Twilio Sign Up",
  },
  account_sid: {
    title: "Step 2: Get Account SID & Auth Token",
    steps: [
      "After login, go to Twilio Console Dashboard",
      'Look for "Account Info" section on the right side',
      "Copy your Account SID (starts with AC...)",
      'Click "Show" next to Auth Token and copy it',
      "Paste both in the fields below",
    ],
    link: "https://console.twilio.com",
    linkText: "Open Twilio Console",
  },
  phone_number: {
    title: "Step 3: Get a Phone Number (for SMS)",
    steps: [
      "In Twilio Console, click Phone Numbers > Manage > Buy a Number",
      "Select India (+91) and search for available numbers",
      "Select SMS capability and buy a number",
      "Copy the phone number (format: +91XXXXXXXXXX)",
      "Paste it in the SMS Phone Number field",
    ],
    link: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
    linkText: "Buy Twilio Phone Number",
  },
  whatsapp_setup: {
    title: "Step 3: Enable WhatsApp (Twilio Sandbox)",
    steps: [
      "In Twilio Console, go to Messaging > Try it out > Send a WhatsApp message",
      "You will see a Sandbox number (format: +1 415 523 8886)",
      "Copy this number",
      "For production: You need a WhatsApp Business Account linked to Twilio",
      "For testing: Use the sandbox number provided",
    ],
    link: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn",
    linkText: "Open WhatsApp Sandbox",
  },
  sendgrid: {
    title: "Step 3: Setup Email (SendGrid)",
    steps: [
      "Go to sendgrid.com and create a free account",
      "Go to Settings > API Keys > Create API Key",
      'Name it "Zalgo ERP" and give Full Access',
      "Copy the API Key (starts with SG...)",
      "Also verify your sender email in Settings > Sender Authentication",
    ],
    link: "https://app.sendgrid.com/settings/api_keys",
    linkText: "Open SendGrid API Keys",
  },
};

// ── Channel Setup Card ────────────────────────────────────────────────────────
function ChannelSetupCard({
  channel,
  config,
  onSave,
  isSaving,
}: {
  channel: Channel;
  config: ChannelConfig & { enabled: boolean };
  onSave: (config: ChannelConfig & { enabled: boolean }) => void;
  isSaving: boolean;
}) {
  const [local, setLocal] = useState({ ...config });
  const [showHelp, setShowHelp] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const { toast } = useToast();

  const icons = { email: Mail, sms: MessageSquare, whatsapp: Phone };
  const labels = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };
  const colors = {
    email: "text-blue-600 bg-blue-50 border-blue-200",
    sms: "text-green-600 bg-green-50 border-green-200",
    whatsapp: "text-emerald-600 bg-emerald-50 border-emerald-200",
  };

  const Icon = icons[channel];
  const isConfigured = channel === "email"
    ? !!(local.sendgridApiKey && local.fromEmail)
    : channel === "sms"
    ? !!(local.twilioAccountSid && local.twilioAuthToken && local.twilioPhoneNumber)
    : !!(local.twilioAccountSid && local.twilioAuthToken && local.twilioWhatsappNumber);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocal((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[channel]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{labels[channel]}</CardTitle>
              <CardDescription className="text-xs">
                {channel === "email" ? "Via SendGrid" : "Via Twilio"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isConfigured && (
              <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 bg-emerald-50">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
              </Badge>
            )}
            <Switch
              checked={local.enabled}
              onCheckedChange={(v) => setLocal((f) => ({ ...f, enabled: v }))}
            />
          </div>
        </div>
      </CardHeader>

      {local.enabled && (
        <CardContent className="space-y-4 pt-0">
          {/* Help Banner */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => setShowHelp(true)}
          >
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 font-medium">
              Don't know how to get credentials? Click here for step-by-step guide
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-600 ml-auto shrink-0" />
          </div>

          {/* Email Fields */}
          {channel === "email" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">SendGrid API Key *</Label>
                <div className="relative">
                  <Input
                    type={showTokens ? "text" : "password"}
                    value={local.sendgridApiKey || ""}
                    onChange={set("sendgridApiKey")}
                    placeholder="SG.xxxxxxxxxxxxxxxxxx"
                    className="rounded-xl pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTokens(!showTokens)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">From Email *</Label>
                  <Input
                    type="email"
                    value={local.fromEmail || ""}
                    onChange={set("fromEmail")}
                    placeholder="you@yourdomain.com"
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">From Name</Label>
                  <Input
                    value={local.fromName || ""}
                    onChange={set("fromName")}
                    placeholder="Your Institute Name"
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SMS Fields */}
          {channel === "sms" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Account SID *</Label>
                  <div className="relative">
                    <Input
                      type={showTokens ? "text" : "password"}
                      value={local.twilioAccountSid || ""}
                      onChange={set("twilioAccountSid")}
                      placeholder="ACxxxxxxxxxxxxxxxx"
                      className="rounded-xl font-mono text-xs pr-10"
                    />
                    <button type="button" onClick={() => setShowTokens(!showTokens)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Auth Token *</Label>
                  <Input
                    type={showTokens ? "text" : "password"}
                    value={local.twilioAuthToken || ""}
                    onChange={set("twilioAuthToken")}
                    placeholder="xxxxxxxxxxxxxxxx"
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Twilio Phone Number *</Label>
                <Input
                  value={local.twilioPhoneNumber || ""}
                  onChange={set("twilioPhoneNumber")}
                  placeholder="+91XXXXXXXXXX"
                  className="rounded-xl text-xs"
                />
                <p className="text-xs text-muted-foreground">Must include country code (e.g. +91 for India)</p>
              </div>
            </div>
          )}

          {/* WhatsApp Fields */}
          {channel === "whatsapp" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Account SID *</Label>
                  <div className="relative">
                    <Input
                      type={showTokens ? "text" : "password"}
                      value={local.twilioAccountSid || ""}
                      onChange={set("twilioAccountSid")}
                      placeholder="ACxxxxxxxxxxxxxxxx"
                      className="rounded-xl font-mono text-xs pr-10"
                    />
                    <button type="button" onClick={() => setShowTokens(!showTokens)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Auth Token *</Label>
                  <Input
                    type={showTokens ? "text" : "password"}
                    value={local.twilioAuthToken || ""}
                    onChange={set("twilioAuthToken")}
                    placeholder="xxxxxxxxxxxxxxxx"
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">WhatsApp Number *</Label>
                <Input
                  value={local.twilioWhatsappNumber || ""}
                  onChange={set("twilioWhatsappNumber")}
                  placeholder="whatsapp:+14155238886"
                  className="rounded-xl text-xs font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: whatsapp:+[number] — Use Twilio sandbox number for testing
                </p>
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={() => onSave(local)}
            disabled={isSaving || !isConfigured}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Save {labels[channel]} Settings
          </Button>
        </CardContent>
      )}

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Setup Guide — {labels[channel]}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to get your credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Step 1: Twilio Account */}
            <StepCard step={HELP_STEPS.twilio_account} number={1} />

            {/* Step 2: Account SID */}
            <StepCard step={HELP_STEPS.account_sid} number={2} />

            {/* Step 3: Channel specific */}
            {channel === "email" && <StepCard step={HELP_STEPS.sendgrid} number={3} />}
            {channel === "sms" && <StepCard step={HELP_STEPS.phone_number} number={3} />}
            {channel === "whatsapp" && <StepCard step={HELP_STEPS.whatsapp_setup} number={3} />}

            {/* Support */}
            <div className="rounded-xl bg-muted/50 border p-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <HeadphonesIcon className="w-4 h-4 text-primary" />
                Still need help? Contact Support
              </p>
              <div className="space-y-2">
                <a href="mailto:support@zalgostore.com"
                  className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <Mail className="w-3.5 h-3.5" /> support@zalgostore.com
                </a>
                <a href="https://wa.me/917470889548"
                  className="flex items-center gap-2 text-xs text-primary hover:underline" target="_blank">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp: +91 7470889548
                </a>
                <a href="tel:+917470889548"
                  className="flex items-center gap-2 text-xs text-primary hover:underline">
                  <Phone className="w-3.5 h-3.5" /> Call: +91 7470889548
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StepCard({ step, number }: { step: typeof HELP_STEPS.twilio_account; number: number }) {
  return (
    <div className="rounded-xl border border-border/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <p className="text-sm font-semibold">{step.title}</p>
      </div>
      <ol className="space-y-1 pl-8">
        {step.steps.map((s, i) => (
          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
            <span className="shrink-0 text-primary font-medium">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ol>
      <a href={step.link} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium pl-8">
        <ExternalLink className="w-3 h-3" /> {step.linkText}
      </a>
    </div>
  );
}

// ── Trigger Config ────────────────────────────────────────────────────────────
const TRIGGERS = [
  {
    id: "new_lead",
    label: "New Enquiry Added",
    description: "Send welcome message when a new lead/enquiry is created",
    icon: "👋",
    recipient: "Lead's phone/email",
  },
  {
    id: "lead_converted",
    label: "Lead Converted to Student",
    description: "Send congratulations when enquiry becomes a student",
    icon: "🎓",
    recipient: "Student's phone/email",
  },
  {
    id: "fee_due",
    label: "Fee Payment Reminder",
    description: "Remind student when fee installment is due (3 days before)",
    icon: "💰",
    recipient: "Student's phone/email",
  },
  {
    id: "fee_overdue",
    label: "Fee Overdue Alert",
    description: "Alert when fee installment is past due date",
    icon: "⚠️",
    recipient: "Student + Parent",
  },
  {
    id: "birthday",
    label: "Birthday Wish",
    description: "Auto wish students on their birthday",
    icon: "🎂",
    recipient: "Student's phone/email",
  },
];

function TriggerRow({
  trigger,
  channels,
  config,
  onSave,
}: {
  trigger: typeof TRIGGERS[0];
  channels: { email: boolean; sms: boolean; whatsapp: boolean };
  config: { enabled: boolean; channels: string[]; template: string };
  onSave: (data: typeof config) => void;
}) {
  const [local, setLocal] = useState(config);
  const [expanded, setExpanded] = useState(false);

  const toggleChannel = (ch: string) => {
    setLocal((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));
  };

  return (
    <div className={`rounded-xl border transition-all ${local.enabled ? "border-primary/30 bg-primary/5" : "border-border/50"}`}>
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl shrink-0">{trigger.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{trigger.label}</p>
          <p className="text-xs text-muted-foreground">{trigger.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">→ {trigger.recipient}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {local.enabled && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline font-medium">
              {expanded ? "▲ Close" : "▼ Configure"}
            </button>
          )}
          <Switch
            checked={local.enabled}
            onCheckedChange={(v) => {
              setLocal((f) => ({ ...f, enabled: v }));
              // Auto-expand when enabling so user can configure channels
              if (v) setExpanded(true);
            }}
          />
        </div>
      </div>

      {local.enabled && expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {/* Channel selection */}
          <div>
            <Label className="text-xs mb-2 block">Send via (select channels)</Label>
            <div className="flex gap-2 flex-wrap">
              {channels.email && (
                <button
                  onClick={() => toggleChannel("email")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    local.channels.includes("email")
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
              )}
              {channels.sms && (
                <button
                  onClick={() => toggleChannel("sms")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    local.channels.includes("sms")
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> SMS
                </button>
              )}
              {channels.whatsapp && (
                <button
                  onClick={() => toggleChannel("whatsapp")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    local.channels.includes("whatsapp")
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> WhatsApp
                </button>
              )}
              {!channels.email && !channels.sms && !channels.whatsapp && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  ⚠️ No channels configured yet. Go to Setup tab first.
                </p>
              )}
            </div>
          </div>

          {/* Message template */}
          <div className="space-y-1.5">
            <Label className="text-xs">Message Template</Label>
            <Textarea
              value={local.template}
              onChange={(e) => setLocal((f) => ({ ...f, template: e.target.value }))}
              placeholder="Hello {name}, ..."
              className="text-xs min-h-[80px] rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Variables: {"{name}"} {"{phone}"} {"{course}"} {"{amount}"} {"{due_date}"}
            </p>
          </div>

          {local.enabled && local.channels.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              ⚠️ Please select at least one channel above before saving.
            </div>
          )}

          <Button
            size="sm"
            onClick={() => onSave(local)}
            disabled={local.enabled && local.channels.length === 0}
            className="gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Save Trigger
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [savingChannel, setSavingChannel] = useState<Channel | null>(null);

  // Fetch saved credentials
  const { data: credentials, isLoading } = useQuery<AutomationCredentials>({
    queryKey: ["/api/automation/credentials"],
    queryFn: async () => {
      const res = await fetch("/api/automation/credentials", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
  });

  // Fetch saved triggers
  const { data: triggers = {} } = useQuery<Record<string, any>>({
    queryKey: ["/api/automation/triggers"],
    queryFn: async () => {
      const res = await fetch("/api/automation/triggers", { credentials: "include" });
      if (!res.ok) return {};
      return res.json();
    },
  });

  const saveCredentialsMut = useMutation({
    mutationFn: async ({ channel, config }: { channel: Channel; config: ChannelConfig & { enabled: boolean } }) => {
      const res = await fetch("/api/automation/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channel, config }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: (_, { channel }) => {
      toast({ title: `${channel} settings saved successfully` });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/credentials"] });
      setSavingChannel(null);
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
      setSavingChannel(null);
    },
  });

  const saveTriggerMut = useMutation({
    mutationFn: async ({ triggerId, config }: { triggerId: string; config: any }) => {
      const res = await fetch("/api/automation/triggers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ triggerId, config }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Trigger saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/triggers"] });
    },
    onError: () => toast({ title: "Failed to save trigger", variant: "destructive" }),
  });

  const handleSaveChannel = (channel: Channel, config: ChannelConfig & { enabled: boolean }) => {
    setSavingChannel(channel);
    saveCredentialsMut.mutate({ channel, config });
  };

  const configuredChannels = {
    email: !!(credentials?.email?.enabled && credentials?.email?.sendgridApiKey),
    sms: !!(credentials?.sms?.enabled && credentials?.sms?.twilioAccountSid),
    whatsapp: !!(credentials?.whatsapp?.enabled && credentials?.whatsapp?.twilioAccountSid),
  };

  const configuredCount = Object.values(configuredChannels).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" /> Automation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automatically send messages to students, leads and parents via Email, SMS and WhatsApp.
        </p>
      </div>

      {/* Status bar */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        configuredCount > 0
          ? "bg-emerald-50 border-emerald-200"
          : "bg-amber-50 border-amber-200"
      }`}>
        {configuredCount > 0 ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-medium ${configuredCount > 0 ? "text-emerald-700" : "text-amber-700"}`}>
            {configuredCount > 0
              ? `${configuredCount} channel${configuredCount > 1 ? "s" : ""} configured — Automation is ready`
              : "No channels configured yet — Set up at least one channel to start automation"}
          </p>
          <p className={`text-xs mt-0.5 ${configuredCount > 0 ? "text-emerald-600" : "text-amber-600"}`}>
            Active: {[
              configuredChannels.email && "Email",
              configuredChannels.sms && "SMS",
              configuredChannels.whatsapp && "WhatsApp",
            ].filter(Boolean).join(", ") || "None"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="setup">
        <TabsList className="h-9">
          <TabsTrigger value="setup" className="text-xs gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Channel Setup
          </TabsTrigger>
          <TabsTrigger value="triggers" className="text-xs gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Automation Triggers
          </TabsTrigger>
          <TabsTrigger value="send" className="text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" /> Send Manual Message
          </TabsTrigger>
        </TabsList>

        {/* Channel Setup Tab */}
        <TabsContent value="setup" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Configure which channels you want to use. Each channel requires separate credentials from Twilio (SMS/WhatsApp) or SendGrid (Email).
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <ChannelSetupCard
                channel="email"
                config={credentials?.email || { enabled: false }}
                onSave={(config) => handleSaveChannel("email", config)}
                isSaving={savingChannel === "email"}
              />
              <ChannelSetupCard
                channel="sms"
                config={credentials?.sms || { enabled: false }}
                onSave={(config) => handleSaveChannel("sms", config)}
                isSaving={savingChannel === "sms"}
              />
              <ChannelSetupCard
                channel="whatsapp"
                config={credentials?.whatsapp || { enabled: false }}
                onSave={(config) => handleSaveChannel("whatsapp", config)}
                isSaving={savingChannel === "whatsapp"}
              />
            </>
          )}
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4 mt-4">
          {configuredCount === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Please configure at least one channel in the Setup tab before enabling triggers.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Set up automatic messages that trigger based on events in your institute.
          </p>
          <div className="space-y-3">
            {TRIGGERS.map((trigger) => (
              <TriggerRow
                key={trigger.id}
                trigger={trigger}
                channels={configuredChannels}
                config={triggers[trigger.id] || { enabled: false, channels: [], template: getDefaultTemplate(trigger.id) }}
                onSave={(config) => saveTriggerMut.mutate({ triggerId: trigger.id, config })}
              />
            ))}
          </div>
        </TabsContent>

        {/* Manual Send Tab */}
        <TabsContent value="send" className="mt-4">
          <ManualSendForm channels={configuredChannels} credentials={credentials || {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Manual Send Form ──────────────────────────────────────────────────────────
function ManualSendForm({
  channels,
  credentials,
}: {
  channels: { email: boolean; sms: boolean; whatsapp: boolean };
  credentials: AutomationCredentials;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    channel: "" as Channel | "",
    to: "",
    subject: "",
    message: "",
  });

  const mut = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/automation/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent successfully" });
      setForm({ channel: "", to: "", subject: "", message: "" });
    },
    onError: (e: any) => toast({ title: e.message || "Failed to send", variant: "destructive" }),
  });

  const hasAny = channels.email || channels.sms || channels.whatsapp;

  if (!hasAny) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">No channels configured</p>
        <p className="text-sm">Go to Channel Setup tab to configure Email, SMS or WhatsApp.</p>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Send a Message</CardTitle>
        <CardDescription className="text-xs">Send a one-time message via any configured channel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel Select */}
        <div className="flex gap-2">
          {channels.email && (
            <button
              onClick={() => setForm((f) => ({ ...f, channel: "email" }))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                form.channel === "email" ? "bg-blue-50 border-blue-300 text-blue-700" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
          )}
          {channels.sms && (
            <button
              onClick={() => setForm((f) => ({ ...f, channel: "sms" }))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                form.channel === "sms" ? "bg-green-50 border-green-300 text-green-700" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> SMS
            </button>
          )}
          {channels.whatsapp && (
            <button
              onClick={() => setForm((f) => ({ ...f, channel: "whatsapp" }))}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                form.channel === "whatsapp" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Phone className="w-4 h-4" /> WhatsApp
            </button>
          )}
        </div>

        {form.channel && (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm">
                {form.channel === "email" ? "To Email" : "To Phone Number"}
              </Label>
              <Input
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                placeholder={form.channel === "email" ? "student@example.com" : "+91XXXXXXXXXX"}
                className="rounded-xl"
              />
            </div>

            {form.channel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Message subject"
                  className="rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Message</Label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Type your message here..."
                className="rounded-xl min-h-[100px]"
              />
            </div>

            <Button
              className="w-full gap-2"
              disabled={mut.isPending || !form.to || !form.message}
              onClick={() => mut.mutate(form)}
            >
              {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {mut.isPending ? "Sending..." : "Send Message"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getDefaultTemplate(triggerId: string): string {
  const templates: Record<string, string> = {
    new_lead: "Hello {name}, thank you for your enquiry about {course}. We will contact you soon. - {institute_name}",
    lead_converted: "Congratulations {name}! You are now enrolled at {institute_name}. Welcome to the family! 🎓",
    fee_due: "Dear {name}, your fee installment of ₹{amount} is due on {due_date}. Please pay on time. - {institute_name}",
    fee_overdue: "Dear {name}, your fee installment of ₹{amount} is overdue. Please contact us immediately. - {institute_name}",
    birthday: "Happy Birthday {name}! 🎂 Wishing you a wonderful day. With love, {institute_name}",
  };
  return templates[triggerId] || "Hello {name}, this is a message from {institute_name}.";
}
