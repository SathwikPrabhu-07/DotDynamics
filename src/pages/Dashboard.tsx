import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BarChart3, BookOpen, Zap } from "lucide-react";

const stats = [
  { label: "Simulations Run", value: "0", icon: Zap },
  { label: "Problems Saved", value: "0", icon: BookOpen },
  { label: "Hours Spent", value: "0", icon: Clock },
  { label: "Topics Covered", value: "0", icon: BarChart3 },
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

      {/* Recent — empty state */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Problems</h2>
        <div className="rounded-lg border bg-card shadow-card">
          <div className="px-5 py-12 text-center">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No simulations yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new problem to see it here.</p>
            <Link to="/simulation">
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Plus className="h-3.5 w-3.5" /> New Simulation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
