// client/src/pages/automation-help.tsx — REPLACE
import { useState } from "react";
import {
  ExternalLink, Mail, MessageSquare, Phone, ChevronDown, ChevronUp,
  HelpCircle, HeadphonesIcon, ArrowRight, CheckCircle2, AlertCircle,
  BookOpen, Zap, Shield, CreditCard, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StepImage({ alt, description }: { alt: string; description: string }) {
  return (
    <div className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-6 gap-2 my-3">
      <BookOpen className="w-5 h-5 text-muted-foreground" />
      <p className="text-xs font-medium text-muted-foreground">{alt}</p>
      <p className="text-xs text-muted-foreground/70 text-center px-4">{description}</p>
    </div>
  );
}

function Section({ title, icon, color, badge, children, defaultOpen = false, important = false }: {
  title: string; icon: React.ReactNode; color: string; badge?: string;
  children: React.ReactNode; defaultOpen?: boolean; important?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`rounded-2xl overflow-hidden ${important ? "border-amber-300" : "border-border/50"}`}>
      <button className="w-full" onClick={() => setOpen(!open)}>
        <CardHeader className={`pb-3 hover:bg-muted/30 transition-colors ${important ? "bg-amber-50/50" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${color}`}>
                {icon}
              </div>
              <div className="text-left">
                <CardTitle className="text-base">{title}</CardTitle>
                {badge && <Badge variant="outline" className="text-xs mt-0.5">{badge}</Badge>}
              </div>
            </div>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-sm font-semibold">{title}</p>
        <div className="text-xs text-muted-foreground space-y-1">{children}</div>
      </div>
    </div>
  );
}

function LinkBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium mt-1">
      <ExternalLink className="w-3 h-3" /> {children}
    </a>
  );
}

function InfoBox({ type, children }: { type: "warning" | "info" | "success" | "error"; children: React.ReactNode }) {
  const styles = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };
  const icons = {
    warning: <AlertCircle className="w-4 h-4 shrink-0" />,
    info: <Info className="w-4 h-4 shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 shrink-0" />,
  };
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${styles[type]}`}>
      {icons[type]} <span>{children}</span>
    </div>
  );
}

export default function AutomationHelpPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Automation Setup Guide
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Complete step-by-step guide for Email, SMS and WhatsApp automation — works globally in 180+ countries.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Mail className="w-4 h-4" />, label: "Email", service: "SendGrid (Free/Paid)", cost: "Free: 100/day | Paid: $19.95/mo", color: "text-blue-600 bg-blue-50" },
          { icon: <MessageSquare className="w-4 h-4" />, label: "SMS", service: "Twilio (Paid)", cost: "~$1/mo number + $0.008/SMS", color: "text-green-600 bg-green-50" },
          { icon: <Phone className="w-4 h-4" />, label: "WhatsApp", service: "Twilio (Meta Verified)", cost: "~$0.005/message", color: "text-emerald-600 bg-emerald-50" },
        ].map((item) => (
          <div key={item.label} className="p-3 bg-white rounded-xl border border-border/50 space-y-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.service}</p>
            <p className="text-xs text-primary font-medium">{item.cost}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1: Twilio Account (Common for SMS + WhatsApp)
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="Step 1: Create Twilio Account (for SMS & WhatsApp)"
        icon={<Zap className="w-5 h-5" />} color="text-purple-600 bg-purple-50 border-purple-200"
        badge="Required for SMS & WhatsApp" defaultOpen={true}>
        <div className="space-y-0">
          <Step number={1} title="Go to Twilio website">
            <p>Open your browser and go to Twilio.</p>
            <LinkBtn href="https://www.twilio.com/try-twilio">twilio.com/try-twilio — Sign Up Free</LinkBtn>
            <StepImage alt="Twilio Homepage" description="Click 'Sign Up for Free' button" />
          </Step>
          <Step number={2} title="Fill registration form">
            <p>Enter your First Name, Last Name, Email and Password.</p>
            <p>Verify your email address from the confirmation email.</p>
          </Step>
          <Step number={3} title="Phone verification">
            <p>Enter your mobile number with country code: <strong>+91XXXXXXXXXX</strong></p>
            <p>Enter the OTP received on your phone.</p>
          </Step>
          <Step number={4} title="You're in — Free trial credits">
            <InfoBox type="success">You get $15 free trial credits. Trial account can only send SMS to verified numbers only.</InfoBox>
            <InfoBox type="warning">To send SMS to any number (students/leads), you MUST upgrade to a paid account. See SMS section below.</InfoBox>
          </Step>
          <Step number={5} title="Get Account SID & Auth Token">
            <p>After login, go to Console Dashboard.</p>
            <LinkBtn href="https://console.twilio.com">console.twilio.com</LinkBtn>
            <p className="mt-1">Find <strong>"Account Info"</strong> section — copy:</p>
            <p>• <strong>Account SID</strong> (starts with AC...)</p>
            <p>• <strong>Auth Token</strong> — click "Show" to reveal, then copy</p>
            <InfoBox type="error">Never share your Auth Token with anyone!</InfoBox>
            <StepImage alt="Twilio Console" description="Account SID and Auth Token location in Console Dashboard" />
          </Step>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: SMS Setup + Paid Account
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="Step 2: SMS Setup — Paid Account Required"
        icon={<MessageSquare className="w-5 h-5" />} color="text-green-600 bg-green-50 border-green-200"
        badge="Upgrade to paid for full SMS" important={true}>
        <div className="space-y-0">
          <InfoBox type="warning">
            Trial account SMS works ONLY to verified phone numbers. To send SMS to any student or lead, upgrade to paid account.
          </InfoBox>

          <Step number={1} title="Upgrade to Paid Account">
            <p>Go to Twilio Console → Billing → Upgrade Account</p>
            <LinkBtn href="https://console.twilio.com/us1/billing/upgrade">Upgrade Twilio Account</LinkBtn>
            <p className="mt-1">Add a credit/debit card. Minimum recharge: $20</p>
            <p>Pay-as-you-go: No monthly fee, pay only for what you use.</p>
            <StepImage alt="Twilio Billing Upgrade" description="Billing page with Add Credit Card option" />
          </Step>

          <Step number={2} title="Buy a Phone Number for SMS">
            <p>Go to: Phone Numbers → Manage → Buy a Number</p>
            <LinkBtn href="https://console.twilio.com/us1/develop/phone-numbers/manage/search">Buy Phone Number</LinkBtn>
            <p className="mt-1">Select your country (e.g. India +91)</p>
            <p>Make sure <strong>SMS capability</strong> is checked.</p>
            <p>Click Search → Select a number → Buy (~$1/month)</p>
            <StepImage alt="Buy Phone Number" description="Search page with country filter and SMS capability checkbox" />
          </Step>

          <Step number={3} title="Copy your Phone Number">
            <p>Go to Phone Numbers → Manage → Active Numbers</p>
            <p>Copy the number in format: <strong>+91XXXXXXXXXX</strong></p>
            <p>Paste it in Automation → SMS → Twilio Phone Number field.</p>
            <InfoBox type="info">Make sure there are NO spaces in the number. Example: +919244213326 ✅ (not +91 92442 13326 ❌)</InfoBox>
          </Step>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3: WhatsApp — Meta Business Verification
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="Step 3: WhatsApp — Meta Business Verification Required"
        icon={<Phone className="w-5 h-5" />} color="text-emerald-600 bg-emerald-50 border-emerald-200"
        badge="Meta approval needed — 2 to 7 days" important={true}>
        <div className="space-y-0">
          <InfoBox type="warning">
            WhatsApp Business API requires Meta (Facebook) to verify your business before you can send messages to anyone without them joining a sandbox. This is a one-time process.
          </InfoBox>

          <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-800 mb-2">📋 Two Phases:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[10px] font-bold text-amber-700">1</div>
                <p className="text-xs text-blue-700"><strong>Testing (Sandbox):</strong> Works immediately, but recipient must join sandbox first</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px] font-bold text-emerald-700">2</div>
                <p className="text-xs text-blue-700"><strong>Production:</strong> After Meta approval, messages go to anyone directly</p>
              </div>
            </div>
          </div>

          {/* Phase 1: Sandbox Testing */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 my-3">
            <p className="text-sm font-semibold text-amber-800 mb-2">📱 Phase 1: Sandbox Testing (Right Now)</p>
            <Step number={1} title="Go to WhatsApp Sandbox in Twilio">
              <p>Messaging → Try it out → Send a WhatsApp message</p>
              <LinkBtn href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn">Open WhatsApp Sandbox</LinkBtn>
              <StepImage alt="WhatsApp Sandbox" description="Twilio sandbox page showing sandbox number and join keyword" />
            </Step>
            <Step number={2} title="Note the Sandbox Number and Keyword">
              <p>You will see a sandbox number like: <strong>+1 415 523 8886</strong></p>
              <p>And a join keyword like: <strong>join narrow-kitten</strong></p>
            </Step>
            <Step number={3} title="Recipient must join sandbox first">
              <p>For testing — each recipient must send this message from their WhatsApp:</p>
              <div className="bg-white border rounded-lg px-3 py-2 mt-1 font-mono text-xs">join [your-keyword]</div>
              <p className="mt-1">Send to: <strong>+1 415 523 8886</strong></p>
              <InfoBox type="warning">This is a limitation of sandbox only. After Meta approval, no one needs to join — messages go directly.</InfoBox>
            </Step>
            <Step number={4} title="Enter in App — Automation Settings">
              <p>WhatsApp Number field mein daalo: <strong>whatsapp:+14155238886</strong></p>
              <p>(Note: whatsapp: prefix zaroori hai)</p>
            </Step>
          </div>

          {/* Phase 2: Meta Production Approval */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 my-3">
            <p className="text-sm font-semibold text-emerald-800 mb-2">✅ Phase 2: Meta Production Approval (For Real Use)</p>

            <Step number={1} title="Create Meta Business Account">
              <p>You need a Facebook Business Manager account.</p>
              <LinkBtn href="https://business.facebook.com">business.facebook.com — Create Account</LinkBtn>
              <p className="mt-1">Go through verification — add business details, website, etc.</p>
              <StepImage alt="Meta Business Manager" description="Meta Business Manager account creation page" />
            </Step>

            <Step number={2} title="Apply for WhatsApp Business API via Twilio">
              <p>Go to Twilio Console → Messaging → Senders → WhatsApp Senders</p>
              <LinkBtn href="https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders">WhatsApp Senders in Twilio</LinkBtn>
              <p className="mt-1">Click <strong>"Request Access"</strong></p>
              <StepImage alt="Twilio WhatsApp Senders" description="WhatsApp Senders page with Request Access button" />
            </Step>

            <Step number={3} title="Fill the WhatsApp Business Profile">
              <p>You will need to provide:</p>
              <p>• Business Name (as registered)</p>
              <p>• Business Category (Education)</p>
              <p>• Website URL</p>
              <p>• WhatsApp Business phone number (your actual number)</p>
              <p>• Display Name (shown to recipients)</p>
              <p>• Business Description</p>
              <StepImage alt="WhatsApp Business Profile" description="WhatsApp business profile form in Twilio" />
            </Step>

            <Step number={4} title="Meta Verification — 2 to 7 days">
              <p>After submission, Meta reviews your application.</p>
              <p>You will receive email updates from both Twilio and Meta.</p>
              <InfoBox type="info">During review, keep using Sandbox for testing. Once approved, update your WhatsApp Number in Automation Settings to your approved business number.</InfoBox>
            </Step>

            <Step number={5} title="After Approval — Update Settings">
              <p>Your approved WhatsApp Business number will appear in Twilio Console.</p>
              <p>Format: <strong>whatsapp:+91XXXXXXXXXX</strong> (your business number)</p>
              <p>Update it in Automation → WhatsApp → WhatsApp Number field.</p>
              <InfoBox type="success">After this, messages go directly to any WhatsApp number — no sandbox joining needed!</InfoBox>
            </Step>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4: Email Setup + Spam Fix
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="Step 4: Email Setup — SendGrid + Inbox Delivery"
        icon={<Mail className="w-5 h-5" />} color="text-blue-600 bg-blue-50 border-blue-200"
        badge="Free plan available" important={true}>
        <div className="space-y-0">
          <Step number={1} title="Create SendGrid Account">
            <LinkBtn href="https://signup.sendgrid.com">signup.sendgrid.com — Create Free Account</LinkBtn>
            <p className="mt-1">Free plan: 100 emails/day forever.</p>
            <p>Paid plan ($19.95/month): 50,000 emails/month — for high volume institutes.</p>
          </Step>

          <Step number={2} title="Create API Key">
            <p>Settings → API Keys → Create API Key</p>
            <LinkBtn href="https://app.sendgrid.com/settings/api_keys">Open SendGrid API Keys</LinkBtn>
            <p className="mt-1">Name: <strong>Zalgo ERP</strong> → Full Access → Create & View</p>
            <InfoBox type="error">API key is shown ONLY ONCE — copy it immediately and save it safely!</InfoBox>
            <StepImage alt="SendGrid API Key" description="API key creation page — copy before closing!" />
          </Step>

          <Step number={3} title="Verify Sender Email (Basic — may go to spam)">
            <p>Settings → Sender Authentication → Single Sender Verification</p>
            <LinkBtn href="https://app.sendgrid.com/settings/sender_auth">Sender Authentication</LinkBtn>
            <p className="mt-1">Add your email → verify from confirmation email.</p>
            <InfoBox type="warning">Single sender verification may cause emails to land in spam. For inbox delivery, do Domain Authentication below.</InfoBox>
          </Step>

          {/* Domain Auth - Most Important */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 my-3">
            <p className="text-sm font-semibold text-emerald-800 mb-1 flex items-center gap-1">
              <Shield className="w-4 h-4" /> Domain Authentication — Inbox Delivery (Highly Recommended)
            </p>
            <p className="text-xs text-emerald-700 mb-3">This is the #1 fix to ensure emails land in inbox, not spam. One-time setup.</p>

            <Step number={4} title="Start Domain Authentication">
              <p>Settings → Sender Authentication → Authenticate Your Domain</p>
              <LinkBtn href="https://app.sendgrid.com/settings/sender_auth/domain/create">Start Domain Authentication</LinkBtn>
              <StepImage alt="Domain Authentication" description="Domain authentication start page in SendGrid" />
            </Step>

            <Step number={5} title="Enter your domain">
              <p>Enter your domain (e.g. <strong>zalgostore.com</strong> or <strong>yourinstitute.com</strong>)</p>
              <p>Select your DNS provider (GoDaddy, Hostinger, Namecheap, etc.)</p>
              <p>Click <strong>Next</strong></p>
            </Step>

            <Step number={6} title="Add DNS records to your domain">
              <p>SendGrid will show you 3-5 DNS records (CNAME type).</p>
              <p>Go to your domain provider → DNS Settings → Add each record.</p>
              <InfoBox type="info">
                Each DNS provider has different interface but process is same — add the CNAME records SendGrid shows you.
              </InfoBox>
              <StepImage alt="DNS Records" description="SendGrid shows DNS records to add to your domain provider" />
            </Step>

            <Step number={7} title="Verify Domain">
              <p>Come back to SendGrid → Click <strong>"Verify"</strong></p>
              <p>DNS propagation can take 15 minutes to 48 hours.</p>
              <InfoBox type="success">Once verified, your emails will land in inbox with your domain branding!</InfoBox>
            </Step>
          </div>

          <Step number={8} title="Enter in App — Automation Settings">
            <p>Go to Automation → Channel Setup → Email</p>
            <p>• <strong>SendGrid API Key:</strong> Paste the SG.xxx key</p>
            <p>• <strong>From Email:</strong> The email you verified (e.g. info@yourdomain.com)</p>
            <p>• <strong>From Name:</strong> Your institute name</p>
          </Step>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5: Enter Credentials in App
      ══════════════════════════════════════════════════════════════════ */}
      <Section title="Step 5: Enter Everything in the App"
        icon={<CheckCircle2 className="w-5 h-5" />} color="text-primary bg-primary/10 border-primary/30"
        badge="Final step">
        <div className="space-y-0">
          <Step number={1} title="Go to Automation → Channel Setup">
            <p>In sidebar: Automation → Channel Setup tab</p>
          </Step>
          <Step number={2} title="Email credentials">
            <p>• SendGrid API Key (SG.xxxxx)</p>
            <p>• From Email (your verified email)</p>
            <p>• From Name (your institute name)</p>
            <p>Toggle ON → Save Email Settings</p>
          </Step>
          <Step number={3} title="SMS credentials">
            <p>• Account SID (ACxxxxx from Twilio Console)</p>
            <p>• Auth Token (from Twilio Console)</p>
            <p>• Twilio Phone Number (e.g. +919244213326 — no spaces!)</p>
            <p>Toggle ON → Save SMS Settings</p>
          </Step>
          <Step number={4} title="WhatsApp credentials">
            <p>• Account SID (same as SMS)</p>
            <p>• Auth Token (same as SMS)</p>
            <p>• WhatsApp Number: <strong>whatsapp:+14155238886</strong> (sandbox) or your approved business number</p>
            <p>Toggle ON → Save WhatsApp Settings</p>
          </Step>
          <Step number={5} title="Set up Automation Triggers">
            <p>Go to Automation Triggers tab</p>
            <p>Enable triggers (e.g. New Enquiry Added)</p>
            <p>Select channels (Email / SMS / WhatsApp)</p>
            <p>Customize message template</p>
            <p>Click <strong>Save Trigger</strong></p>
          </Step>
          <Step number={6} title="Test with Manual Send">
            <p>Go to Send Manual Message tab</p>
            <p>Send a test message to yourself to verify everything works.</p>
          </Step>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6: Summary — What's needed
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" /> Quick Summary — What You Need
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                channel: "Email", icon: "📧",
                free: "Yes — 100 emails/day free",
                paid: "$19.95/month for 50,000 emails",
                required: "SendGrid account + Domain Authentication for inbox delivery",
                color: "border-blue-200 bg-blue-50",
              },
              {
                channel: "SMS", icon: "💬",
                free: "No — Trial only sends to verified numbers",
                paid: "~$1/month phone number + $0.008/SMS",
                required: "Twilio paid account + buy phone number",
                color: "border-green-200 bg-green-50",
              },
              {
                channel: "WhatsApp", icon: "📱",
                free: "Yes — Sandbox for testing (recipient must join)",
                paid: "~$0.005/message after Meta approval",
                required: "Meta Business verification (2-7 days) for production",
                color: "border-emerald-200 bg-emerald-50",
              },
            ].map((item) => (
              <div key={item.channel} className={`rounded-xl border p-3 ${item.color}`}>
                <p className="text-sm font-semibold mb-1">{item.icon} {item.channel}</p>
                <div className="space-y-0.5 text-xs">
                  <p><span className="text-emerald-700 font-medium">Free:</span> {item.free}</p>
                  <p><span className="text-primary font-medium">Paid:</span> {item.paid}</p>
                  <p><span className="text-muted-foreground font-medium">Required:</span> {item.required}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          Support Section
      ══════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-slate-50 to-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HeadphonesIcon className="w-5 h-5 text-primary" /> Need Help? Contact Support
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Stuck anywhere? Our team will help you set up everything.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="mailto:support@zalgostore.com"
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold">Email</p>
                <p className="text-xs text-primary">support@zalgostore.com</p>
              </div>
            </a>
            <a href="https://wa.me/917470889548?text=Hi%2C%20I%20need%20help%20with%20automation%20setup"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold">WhatsApp</p>
                <p className="text-xs text-primary">+91 7470889548</p>
              </div>
            </a>
            <a href="tel:+917470889548"
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:bg-muted/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <HeadphonesIcon className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold">Call Us</p>
                <p className="text-xs text-primary">+91 7470889548</p>
              </div>
            </a>
          </div>
          <InfoBox type="info">Support hours: Monday–Saturday, 10 AM – 6 PM IST. WhatsApp is the fastest way to reach us.</InfoBox>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Links — All Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "Twilio Sign Up (Free)", url: "https://www.twilio.com/try-twilio" },
              { label: "Twilio Console", url: "https://console.twilio.com" },
              { label: "Twilio — Upgrade to Paid", url: "https://console.twilio.com/us1/billing/upgrade" },
              { label: "Twilio — Buy Phone Number", url: "https://console.twilio.com/us1/develop/phone-numbers/manage/search" },
              { label: "Twilio — WhatsApp Senders", url: "https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders" },
              { label: "WhatsApp Sandbox Testing", url: "https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn" },
              { label: "SendGrid Sign Up (Free)", url: "https://signup.sendgrid.com" },
              { label: "SendGrid — API Keys", url: "https://app.sendgrid.com/settings/api_keys" },
              { label: "SendGrid — Domain Authentication", url: "https://app.sendgrid.com/settings/sender_auth/domain/create" },
              { label: "Meta Business Manager", url: "https://business.facebook.com" },
            ].map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border hover:bg-muted/30 transition-colors text-xs">
                <span className="font-medium">{link.label}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center pb-4">
        <a href="/automation">
          <Button className="gap-2">
            <Zap className="w-4 h-4" /> Go to Automation Setup
            <ArrowRight className="w-4 h-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}
