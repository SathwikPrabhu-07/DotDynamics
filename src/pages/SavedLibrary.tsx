import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getUserSimulations, deleteSimulation, type SimulationDoc } from "@/services/firestoreService";
import { useToast } from "@/hooks/use-toast";

const SavedLibrary = () => {
  const [search, setSearch] = useState("");
  const [simulations, setSimulations] = useState<SimulationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSimulations = async () => {
    setLoading(true);
    try {
      const data = await getUserSimulations();
      setSimulations(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load saved simulations";
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
      toast({ title: "Deleted", description: "Simulation removed from library." });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const filtered = simulations.filter(
    (s) =>
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.problem.toLowerCase().includes(search.toLowerCase()) ||
      s.problem_class.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Saved Simulations</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search saved simulations..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card">
          <div className="px-5 py-16 text-center">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {simulations.length === 0 ? "No saved simulations yet." : "No results match your search."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Run a simulation and save it to build your library.
            </p>
            {simulations.length === 0 && (
              <Link to="/simulation">
                <Button variant="outline" size="sm" className="mt-4">
                  Start a Simulation
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((sim) => (
            <div
              key={sim.id}
              className="rounded-lg border bg-card shadow-card p-5 flex flex-col gap-2 relative group"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-sm font-semibold text-foreground truncate flex-1">
                  {sim.title || sim.problem.slice(0, 60)}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-7 w-7"
                  onClick={() => handleDelete(sim.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold w-fit">
                {sim.problem_label || sim.problem_class.replace(/_/g, " ")}
              </span>
              <p className="text-xs text-muted-foreground line-clamp-2">{sim.problem}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-auto">
                {sim.createdAt?.toDate
                  ? sim.createdAt.toDate().toLocaleString()
                  : "Just now"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedLibrary;
