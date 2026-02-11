import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SignUp = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = "/dashboard";
  };

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="font-heading text-2xl font-bold text-foreground tracking-tight">
            Dot<span className="text-accent">Dynamics</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" value={form.name} onChange={update("name")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={update("email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={update("password")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input id="confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={update("confirm")} required />
          </div>
          <Button type="submit" className="w-full">Create Account</Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
