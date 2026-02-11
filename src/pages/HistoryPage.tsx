import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const mockHistory = [
  { id: 1, title: "Projectile at 60°", subject: "Mechanics", date: "Feb 10, 2026" },
  { id: 2, title: "Spring Oscillation", subject: "Oscillations", date: "Feb 9, 2026" },
  { id: 3, title: "Inclined Plane Friction", subject: "Mechanics", date: "Feb 8, 2026" },
  { id: 4, title: "Circular Motion", subject: "Dynamics", date: "Feb 7, 2026" },
  { id: 5, title: "Wave Interference", subject: "Waves", date: "Feb 6, 2026" },
];

const HistoryPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = mockHistory.filter((h) => {
    const matchSearch = h.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || h.subject === filter;
    return matchSearch && matchFilter;
  });

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

      <div className="rounded-lg border bg-card shadow-card divide-y">
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No results found.</div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.subject} · {item.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/simulation">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
