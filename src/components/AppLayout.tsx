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
    <div className="flex min-h-screen bg-background bg-animated">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border/30 transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
        style={{
          background: "linear-gradient(180deg, hsl(240 6% 9%) 0%, hsl(240 6% 7%) 100%)",
        }}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-border/20">
          <Link to="/dashboard" className="font-heading text-lg tracking-tight">
            <span className="brand-dot">Dot</span><span className="brand-dynamics">Dynamics</span>
          </Link>
          <button className="lg:hidden text-muted-foreground hover:text-foreground transition-colors" onClick={() => setOpen(false)}>
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${active
                    ? "nav-link-active"
                    : "nav-link-idle"
                  }`}
              >
                <item.icon className="h-4 w-4" style={active ? { color: "var(--gold-start)" } : undefined} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/20">
          <Link
            to="/"
            className="nav-link-idle flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-16 items-center gap-4 border-b border-border/30 bg-card/40 backdrop-blur-md px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold pulse-gold"
            style={{
              background: "linear-gradient(135deg, var(--gold-start), var(--gold-end))",
              color: "#0f0f12",
            }}
          >
            U
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 section-enter">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
