import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/auth";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      // Auto-login by re-fetching user state (session is already set by register endpoint)
      await login(form.email, form.password);
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[hsl(220,25%,12%)] to-slate-800 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-sm text-white/50 mt-1">Start managing your school today</p>
          </div>
        </div>

        <Card className="shadow-2xl border-white/10 bg-white/5 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">Register</CardTitle>
            <CardDescription className="text-white/50">Fill in your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-white/70 text-sm">Full Name</Label>
                <Input id="name" value={form.name} onChange={set("name")} placeholder="Your Name" required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@school.com" required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-white/70 text-sm">Confirm Password</Label>
                <Input id="confirm" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-semibold mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
            <p className="text-center text-sm text-white/40 mt-4">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-primary/80 hover:text-primary transition-colors">
                Sign In
              </button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/30 mt-6">Powered by Zalgo Infotech &bull; v2.0</p>
      </div>
    </div>
  );
}
