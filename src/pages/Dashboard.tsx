import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BarChart3, BookOpen, Zap } from "lucide-react";

const recentProblems = [
  { id: 1, title: "Projectile Motion - 45°", subject: "Mechanics", date: "Feb 10, 2026" },
  { id: 2, title: "Free Fall with Air Resistance", subject: "Mechanics", date: "Feb 9, 2026" },
  { id: 3, title: "Simple Pendulum Period", subject: "Oscillations", date: "Feb 8, 2026" },
];

const stats = [
  { label: "Simulations Run", value: "24", icon: Zap },
  { label: "Problems Saved", value: "12", icon: BookOpen },
  { label: "Hours Spent", value: "8.5", icon: Clock },
  { label: "Topics Covered", value: "6", icon: BarChart3 },
];

const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Welcome back!</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ready to explore some physics?</p>
      </div>

      <Link to="/simulation">
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Start New Problem
        </Button>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10">
                <s.icon className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold font-heading text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Problems</h2>
        <div className="rounded-lg border bg-card shadow-card divide-y">
          {recentProblems.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.subject} · {p.date}</p>
              </div>
              <Link to="/simulation">
                <Button variant="ghost" size="sm">Open</Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
