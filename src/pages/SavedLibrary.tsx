import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const SavedLibrary = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Saved Simulations</h1>

      <div className="rounded-lg border bg-card shadow-card">
        <div className="px-5 py-16 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No saved simulations yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run a simulation and save it to build your library.
          </p>
          <Link to="/simulation">
            <Button variant="outline" size="sm" className="mt-4">
              Start a Simulation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SavedLibrary;
