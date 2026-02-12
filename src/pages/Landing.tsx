import { Link } from "react-router-dom";
import { ArrowRight, Brain, Play, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    title: "AI Understanding",
    desc: "Describe any physics problem in plain language. Our AI interprets it and sets up the simulation automatically.",
    badge: "lavender" as const,
  },
  {
    icon: Play,
    title: "Interactive Simulation",
    desc: "Watch physics come alive with real-time 2D simulations. Observe motion, forces, and energy in action.",
    badge: "gold" as const,
  },
  {
    icon: SlidersHorizontal,
    title: "Real-time Controls",
    desc: "Adjust gravity, mass, velocity and more with live sliders. See how changes affect the outcome instantly.",
    badge: "lavender" as const,
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background bg-animated">
      {/* Nav */}
      <nav className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50"
        style={{ background: "rgba(15,15,20,0.7)" }}>
        <div className="container flex h-16 items-center justify-between">
          <span className="font-heading text-xl tracking-tight">
            <span className="brand-dot">Dot</span><span className="brand-dynamics">Dynamics</span>
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-24 md:py-32 text-center">
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight max-w-3xl mx-auto animate-fade-in">
          Visualize Physics.<br />
          <span
            className="inline-block"
            style={{
              background: "linear-gradient(135deg, var(--lavender) 0%, var(--gold-mid) 60%, var(--gold-end) 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Instantly.
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in"
          style={{ animationDelay: "0.1s" }}>
          Type a physics problem. Watch it simulate. Adjust parameters in real time.
          Learning has never been this intuitive.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 animate-fade-in"
          style={{ animationDelay: "0.2s" }}>
          <Link to="/signup">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">Sign In</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass-card relative p-8 animate-fade-in"
              style={{ animationDelay: `${0.15 * (i + 1)}s` }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center ${f.badge === "gold" ? "icon-badge-gold" : "icon-badge-lavender"
                }`}>
                <f.icon
                  className="h-5 w-5"
                  style={{ color: f.badge === "gold" ? "var(--gold-mid)" : "var(--lavender)" }}
                />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 backdrop-blur-sm"
        style={{ background: "rgba(15,15,20,0.5)" }}>
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-heading text-sm font-semibold">
            <span className="brand-dot">Dot</span>
            <span className="brand-dynamics" style={{ animation: "none" }}>Dynamics</span>
          </span>
          <p className="text-xs text-muted-foreground">© 2026 DotDynamics. Built for learners.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
