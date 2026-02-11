import { Link } from "react-router-dom";
import { ArrowRight, Brain, Play, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    title: "AI Understanding",
    description: "Describe any physics problem in plain language. Our AI interprets it and sets up the simulation automatically.",
  },
  {
    icon: Play,
    title: "Interactive Simulation",
    description: "Watch physics come alive with real-time 2D simulations. Observe motion, forces, and energy in action.",
  },
  {
    icon: SlidersHorizontal,
    title: "Real-time Parameter Control",
    description: "Adjust gravity, mass, velocity and more with live sliders. See how changes affect the outcome instantly.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <span className="font-heading text-xl font-bold text-foreground tracking-tight">
            Dot<span className="text-accent">Dynamics</span>
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
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight max-w-3xl mx-auto animate-fade-in">
          Visualize Physics.<br />
          <span className="text-accent">Instantly.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Type a physics problem. Watch it simulate. Adjust parameters in real time. Learning has never been this intuitive.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
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
              className="rounded-lg border bg-card p-8 shadow-card animate-fade-in"
              style={{ animationDelay: `${0.15 * (i + 1)}s` }}
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-accent/10">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-heading text-sm font-semibold text-muted-foreground">
            Dot<span className="text-accent">Dynamics</span>
          </span>
          <p className="text-xs text-muted-foreground">© 2026 DotDynamics. Built for learners.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
