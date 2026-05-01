import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, GraduationCap, Users } from "lucide-react";
import { ForgotPasswordDialog } from "@/components/password-dialogs";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-[hsl(220,25%,12%)] to-slate-800 p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              Zalgo Edutech Classes
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Institute Management System
            </p>
          </div>
        </div>

        <Card className="shadow-2xl border-white/10 bg-white/5 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">Sign In</CardTitle>
            <CardDescription className="text-white/50">
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/70 text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-white/70 text-sm">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-primary/80 hover:text-primary transition-colors"
                    data-testid="link-forgot-password"
                  >
                    Forgot Password?
                  </button>
                </div>
                <PasswordInput
                  id="password"
                  data-testid="input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-primary"
                  buttonClassName="text-white/60 hover:text-white"
                />
              </div>
              <Button
                type="submit"
                data-testid="button-login"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>
            <p className="text-center text-sm text-white/40 mt-3">
              New here?{" "}
              <a href="/register" className="text-primary/80 hover:text-primary transition-colors">
                Create an account
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Parent Portal Link */}
        <a
          href="/parent/login"
          className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white/90 text-sm"
        >
          <Users className="w-4 h-4" />
          Parent Portal Login
        </a>

        <p className="text-center text-xs text-white/30 mt-4">
          Powered by Zalgo Infotech &bull; v2.0
        </p>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}
