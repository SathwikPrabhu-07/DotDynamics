import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  History,
  Bookmark,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "New Simulation", icon: Plus, to: "/simulation" },
  { label: "History", icon: History, to: "/history" },
  { label: "Saved Simulations", icon: Bookmark, to: "/saved" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

interface Props {
  children: ReactNode;
}

const AppLayout = ({ children }: Props) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="font-heading text-lg font-bold tracking-tight text-sidebar-foreground">
            Dot<span className="text-sidebar-primary">Dynamics</span>
          </Link>
          <button className="lg:hidden text-sidebar-foreground" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
            U
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
