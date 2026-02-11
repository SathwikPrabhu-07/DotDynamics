import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";
import { Link } from "react-router-dom";

const savedItems = [
  { id: 1, title: "Projectile Motion 45°", subject: "Mechanics", lastEdited: "Feb 10, 2026" },
  { id: 2, title: "Spring-Mass System", subject: "Oscillations", lastEdited: "Feb 9, 2026" },
  { id: 3, title: "Free Fall Comparison", subject: "Mechanics", lastEdited: "Feb 8, 2026" },
  { id: 4, title: "Simple Pendulum", subject: "Oscillations", lastEdited: "Feb 7, 2026" },
  { id: 5, title: "Elastic Collision", subject: "Dynamics", lastEdited: "Feb 5, 2026" },
  { id: 6, title: "Atwood Machine", subject: "Mechanics", lastEdited: "Feb 4, 2026" },
];

const SavedLibrary = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-foreground">Saved Simulations</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {savedItems.map((item) => (
          <div key={item.id} className="rounded-lg border bg-card shadow-card overflow-hidden">
            {/* Thumbnail placeholder */}
            <div className="h-32 bg-muted flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-accent/15 flex items-center justify-center">
                <span className="text-accent text-xs font-bold">{item.subject[0]}</span>
              </div>
            </div>
            <div className="p-4">
              <Link to="/simulation" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                {item.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-1">{item.subject} · {item.lastEdited}</p>
              <div className="flex items-center gap-2 mt-3">
                <Button variant="outline" size="sm" className="gap-1.5 flex-1 text-xs">
                  <Copy className="h-3 w-3" /> Duplicate
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 flex-1 text-xs">
                  <Share2 className="h-3 w-3" /> Share
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedLibrary;
