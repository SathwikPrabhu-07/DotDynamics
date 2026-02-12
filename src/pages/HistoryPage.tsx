import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HistoryPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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
            <SelectItem value="Mechanics">Mechanics</SelectItem>
            <SelectItem value="Oscillations">Oscillations</SelectItem>
            <SelectItem value="Dynamics">Dynamics</SelectItem>
            <SelectItem value="Waves">Waves</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card shadow-card">
        <div className="px-5 py-12 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No history yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Your simulation history will appear here.</p>
          <Link to="/simulation">
            <Button variant="outline" size="sm" className="mt-4">
              Run Your First Simulation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
