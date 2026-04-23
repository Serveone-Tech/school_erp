import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ShieldCheck, MessageSquare } from "lucide-react";

// ── Change Password (for logged-in users) ──────────────────────────────────
interface ChangePasswordProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordProps) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Change Password
          </DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cp-current">Current Password</Label>
            <Input
              id="cp-current"
              type="password"
              data-testid="input-current-password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New Password</Label>
            <Input
              id="cp-new"
              type="password"
              data-testid="input-new-password"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm New Password</Label>
            <Input
              id="cp-confirm"
              type="password"
              data-testid="input-confirm-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-change-password">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Update Password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Forgot Password / OTP Flow (3 steps) ───────────────────────────────────
type Step = "email" | "otp" | "newpass";

interface ForgotPasswordProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setStep("email"); setEmail(""); setOtp(""); setResetToken(""); setNewPass(""); setConfirmPass("");
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({
        title: "OTP Sent",
        description: "A 6-digit OTP has been sent (check server console in dev mode).",
      });
      setStep("otp");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResetToken(data.resetToken);
      setStep("newpass");
    } catch (err: any) {
      toast({ title: "Invalid OTP", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password-with-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Password reset!", description: "You can now log in with your new password." });
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    email: "Forgot Password",
    otp: "Enter OTP",
    newpass: "Set New Password",
  };

  const stepDescs: Record<Step, string> = {
    email: "Enter your registered email to receive a one-time password.",
    otp: `A 6-digit OTP was sent to ${email}. Enter it below.`,
    newpass: "OTP verified! Choose your new password.",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "email" && <MessageSquare className="w-5 h-5 text-primary" />}
            {step === "otp" && <ShieldCheck className="w-5 h-5 text-primary" />}
            {step === "newpass" && <KeyRound className="w-5 h-5 text-primary" />}
            {stepTitles[step]}
          </DialogTitle>
          <DialogDescription>{stepDescs[step]}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mt-1 mb-3">
          {(["email", "otp", "newpass"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s === step ? "bg-primary" : i < (["email", "otp", "newpass"] as Step[]).indexOf(step) ? "bg-primary/40" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "email" && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Registered Email</Label>
              <Input
                id="fp-email"
                type="email"
                data-testid="input-forgot-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@badamsingh.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-send-otp">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send OTP
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-otp">6-Digit OTP</Label>
              <Input
                id="fp-otp"
                type="text"
                data-testid="input-otp"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                placeholder="000000"
                className="text-center text-xl tracking-[0.5em] font-mono"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || otp.length < 6} data-testid="button-verify-otp">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify OTP
            </Button>
            <Button variant="ghost" type="button" className="w-full text-xs text-muted-foreground" onClick={() => setStep("email")}>
              &larr; Back
            </Button>
          </form>
        )}

        {step === "newpass" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-newpass">New Password</Label>
              <Input
                id="fp-newpass"
                type="password"
                data-testid="input-reset-new-password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">Confirm Password</Label>
              <Input
                id="fp-confirm"
                type="password"
                data-testid="input-reset-confirm-password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-reset-password">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
