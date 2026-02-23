import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BarChart3, BookOpen, Zap, Loader2, Eye } from "lucide-react";
import { getUserSimulations, type SimulationDoc } from "@/services/firestoreService";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const [simulations, setSimulations] = useState<SimulationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getUserSimulations();
        setSimulations(data);
      } catch {
        // silently fail — stats will show 0
      } finally {
        setLoading(false);
      }
    };
    if (user) fetch();
    else setLoading(false);
  }, [user]);

  // ── Compute stats from Firestore data ──────────────────────
  const simulationsRun = simulations.length;
  const problemsSaved = simulations.length;

  // Estimate hours: assume ~5 minutes per simulation
  const hoursSpent = Math.round((simulations.length * 5) / 60 * 10) / 10;

  // Unique problem classes = topics covered
  const topicsCovered = new Set(simulations.map((s) => s.problem_class)).size;

  const stats = [
    { label: "Simulations Run", value: simulationsRun, icon: Zap },
    { label: "Problems Saved", value: problemsSaved, icon: BookOpen },
    { label: "Hours Spent", value: hoursSpent, icon: Clock },
    { label: "Topics Covered", value: topicsCovered, icon: BarChart3 },
  ];

  // Recent 5 simulations
  const recent = simulations.slice(0, 5);

  const handleView = (sim: SimulationDoc) => {
    navigate("/simulation", {
      state: {
        problem: sim.problem,
        problem_class: sim.problem_class,
        problem_label: sim.problem_label,
        parameters: sim.parameters,
      },
    });
  };

  /** Format parameter key for display */
  const formatClass = (cls: string) =>
    cls.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ""}!
        </h1>
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
                <p className="text-2xl font-bold font-heading text-foreground">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : s.value}
                </p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Problems */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Recent Problems</h2>
        <div className="rounded-lg border bg-card shadow-card">
          {loading ? (
            <div className="px-5 py-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : recent.length === 0 ? (
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
          ) : (
            <div className="divide-y divide-border">
              {recent.map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {sim.title || sim.problem.slice(0, 60)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
                        {formatClass(sim.problem_class)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {sim.createdAt?.toDate
                          ? sim.createdAt.toDate().toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                          : "Just now"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-accent"
                    onClick={() => handleView(sim)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              ))}

              {simulations.length > 5 && (
                <div className="px-5 py-3 text-center">
                  <Link to="/history">
                    <Button variant="ghost" size="sm" className="text-xs text-accent">
                      View All History →
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
