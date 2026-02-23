import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Clock, Trash2, Loader2, Eye, Atom } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUserSimulations, deleteSimulation, type SimulationDoc } from "@/services/firestoreService";
import { useToast } from "@/hooks/use-toast";

const HistoryPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [simulations, setSimulations] = useState<SimulationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchSimulations = async () => {
    setLoading(true);
    try {
      const data = await getUserSimulations();
      setSimulations(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load history";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteSimulation(id);
      setSimulations((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Deleted", description: "Simulation removed from history." });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

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

  // Filter & search
  const filtered = simulations.filter((s) => {
    const matchesSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.problem.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" || s.problem_class.toLowerCase().includes(filter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  /** Format parameter key for display */
  const formatParamKey = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">History</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search problems..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="kinematics">Kinematics</SelectItem>
            <SelectItem value="projectile">Projectile</SelectItem>
            <SelectItem value="circular">Circular Motion</SelectItem>
            <SelectItem value="harmonic">SHM</SelectItem>
            <SelectItem value="force">Forces</SelectItem>
            <SelectItem value="pendulum">Pendulum</SelectItem>
            <SelectItem value="pulley">Pulley</SelectItem>
            <SelectItem value="rotational">Rotational</SelectItem>
            <SelectItem value="ray_optics">Ray Optics</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card">
          <div className="px-5 py-12 text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {simulations.length === 0 ? "No history yet." : "No results match your search."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Your simulation history will appear here.</p>
            {simulations.length === 0 && (
              <Link to="/simulation">
                <Button variant="outline" size="sm" className="mt-4">
                  Run Your First Simulation
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sim) => (
            <div
              key={sim.id}
              className="rounded-lg border bg-card shadow-card p-5 transition-all hover:border-accent/30 hover:shadow-lg"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Atom className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-sm font-semibold text-foreground truncate">
                      {sim.problem_label || sim.problem_class.replace(/_/g, " ")}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {sim.createdAt?.toDate
                        ? `Saved on ${sim.createdAt.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} at ${sim.createdAt.toDate().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                        : "Just now"}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-accent/10 text-accent px-2.5 py-1 rounded-full font-semibold whitespace-nowrap shrink-0">
                  {sim.problem_class.replace(/_/g, " ")}
                </span>
              </div>

              {/* Problem text */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3 pl-[46px]">
                {sim.problem}
              </p>

              {/* Parameters */}
              {sim.parameters && Object.keys(sim.parameters).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 pl-[46px]">
                  {Object.entries(sim.parameters).slice(0, 6).map(([key, val]) => (
                    <span
                      key={key}
                      className="text-[10px] bg-muted/50 text-muted-foreground px-2 py-0.5 rounded-md font-mono"
                    >
                      {formatParamKey(key)}: {typeof val === "number" ? val.toFixed(2) : val}
                    </span>
                  ))}
                  {Object.keys(sim.parameters).length > 6 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{Object.keys(sim.parameters).length - 6} more
                    </span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pl-[46px]">
                <Button
                  size="sm"
                  className="gap-1.5 h-8 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => handleView(sim)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive transition-all hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => handleDelete(sim.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
