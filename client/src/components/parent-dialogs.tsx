import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { useParentAuth } from "@/contexts/parent-auth";

// ── Change Password ───────────────────────────────────────────────────────────
interface ChangePasswordProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ParentChangePasswordDialog({ open, onOpenChange }: ChangePasswordProps) {
  const { changePassword } = useParentAuth();
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
      await changePassword(current, next);
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
            <PasswordInput id="cp-current" value={current} onChange={e => setCurrent(e.target.value)} required placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">New Password</Label>
            <PasswordInput id="cp-new" value={next} onChange={e => setNext(e.target.value)} required placeholder="••••••••" minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirm New Password</Label>
            <PasswordInput id="cp-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Forgot Password ───────────────────────────────────────────────────────────
type ForgotStep = "email" | "otp" | "reset" | "done";

interface ForgotPasswordProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ParentForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetAll = () => {
    setStep("email"); setEmail(""); setOtp(""); setResetToken("");
    setNewPassword(""); setConfirmPassword("");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/parent/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep("otp");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/parent/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResetToken(data.resetToken);
      setStep("reset");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/parent/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep("done");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAll(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 mt-2">
            <DialogDescription>Enter your registered email to receive an OTP.</DialogDescription>
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="father@email.com" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Send OTP
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4 mt-2">
            <DialogDescription>Enter the 6-digit OTP sent to {email}</DialogDescription>
            <div className="space-y-1.5">
              <Label htmlFor="fp-otp">OTP</Label>
              <Input id="fp-otp" type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} placeholder="123456" className="text-center text-xl tracking-widest" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Verify OTP
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetSubmit} className="space-y-4 mt-2">
            <DialogDescription>Choose your new password.</DialogDescription>
            <div className="space-y-1.5">
              <Label htmlFor="fp-new">New Password</Label>
              <PasswordInput id="fp-new" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">Confirm Password</Label>
              <PasswordInput id="fp-confirm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Reset Password
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 mt-2">
            <ShieldCheck className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold">Password reset successfully!</p>
            <p className="text-sm text-muted-foreground">You can now log in with your new password.</p>
            <Button className="w-full" onClick={() => { resetAll(); onOpenChange(false); }}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
