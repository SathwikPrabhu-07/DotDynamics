import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Save, BarChart3 } from "lucide-react";

const Simulation = () => {
  const [problem, setProblem] = useState("");
  const [playing, setPlaying] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [params, setParams] = useState({ gravity: 9.8, mass: 1, angle: 45, velocity: 20 });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 h-[calc(100vh-8rem)]">
      {/* Left panel */}
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">Problem Input</h2>
        <Textarea
          placeholder="Describe your physics problem... e.g. 'A ball is thrown at 45° with initial velocity 20 m/s'"
          className="flex-1 min-h-[160px] resize-none"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
        />
        <Button className="w-full gap-2">
          <Play className="h-4 w-4" /> Visualize
        </Button>
        <Button variant="outline" className="w-full gap-2">
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>

      {/* Center - Canvas */}
      <div className="flex flex-col gap-4">
        <div className="flex-1 rounded-lg border bg-card shadow-card flex items-center justify-center min-h-[300px]">
          <div className="text-center text-muted-foreground">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Play className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-medium">Simulation Canvas</p>
            <p className="text-xs mt-1">Describe a problem and click Visualize</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Graph preview */}
        {showGraph && (
          <div className="rounded-lg border bg-card p-4 shadow-card h-40 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Height vs Time graph will appear here</p>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-col gap-5">
        <h2 className="font-heading text-lg font-semibold text-foreground">Parameters</h2>

        {[
          { label: "Gravity (m/s²)", key: "gravity" as const, min: 0, max: 20, step: 0.1 },
          { label: "Mass (kg)", key: "mass" as const, min: 0.1, max: 100, step: 0.1 },
          { label: "Angle (°)", key: "angle" as const, min: 0, max: 90, step: 1 },
          { label: "Velocity (m/s)", key: "velocity" as const, min: 0, max: 100, step: 0.5 },
        ].map((p) => (
          <div key={p.key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-medium text-foreground tabular-nums">{params[p.key]}</span>
            </div>
            <Slider
              min={p.min}
              max={p.max}
              step={p.step}
              value={[params[p.key]]}
              onValueChange={([v]) => setParams((prev) => ({ ...prev, [p.key]: v }))}
            />
          </div>
        ))}

        <div className="pt-2">
          <Button
            variant={showGraph ? "default" : "outline"}
            size="sm"
            className="w-full gap-2"
            onClick={() => setShowGraph(!showGraph)}
          >
            <BarChart3 className="h-4 w-4" /> {showGraph ? "Hide" : "Show"} Graph
          </Button>
        </div>

        <div className="mt-auto rounded-lg border bg-muted/50 p-4">
          <h3 className="text-xs font-semibold text-foreground mb-2">Live Values</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Time: 0.00 s</p>
            <p>Height: 0.00 m</p>
            <p>Range: 0.00 m</p>
            <p>KE: 0.00 J</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
