import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RainbowBorder } from "@/components/ui/rainbow-borders-button";
import { signUpWithEmail } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const SignUp = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(form.email, form.password, form.name);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-up failed";
      toast({ title: "Sign Up Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <RainbowBorder>
        <div className="w-full max-w-md bg-background rounded-[14px] px-12 py-14">
          <div className="mb-10 text-center">
            <Link to="/" className="font-heading text-3xl font-bold text-foreground tracking-tight">
              <span className="brand-dot">Dot</span><span className="brand-dynamics" style={{ animation: "none" }}>Dynamics</span>
            </Link>
            <p className="mt-3 text-base text-muted-foreground">Create your account</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input id="name" placeholder="Your name" className="h-12 text-base" value={form.name} onChange={update("name")} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" className="h-12 text-base" value={form.email} onChange={update("email")} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" className="h-12 text-base" value={form.password} onChange={update("password")} required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium">Confirm Password</Label>
              <Input id="confirm" type="password" placeholder="••••••••" className="h-12 text-base" value={form.confirm} onChange={update("confirm")} required disabled={loading} />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-accent hover:underline">Sign In</Link>
            </p>
          </form>
        </div>
      </RainbowBorder>
    </div>
  );
};

export default SignUp;
