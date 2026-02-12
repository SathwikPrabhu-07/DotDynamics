import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Save, BarChart3, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VerticalMotionEngine from "@/components/engines/VerticalMotionEngine";
import ProjectileMotionEngine from "@/components/engines/ProjectileMotionEngine";
import CircularMotionEngine from "@/components/engines/CircularMotionEngine";
import ForceInteractionEngine from "@/components/engines/ForceInteractionEngine";
import SimpleHarmonicMotionEngine from "@/components/engines/SimpleHarmonicMotionEngine";
import PulleyEngine from "@/components/engines/PulleyEngine";
import PendulumEngine from "@/components/engines/PendulumEngine";
import RotationalDynamicsEngine from "@/components/engines/RotationalDynamicsEngine";
import RayOpticsEngine from "@/components/engines/RayOpticsEngine";

import EnergyOverlay from "@/components/engines/energy/EnergyOverlay";
import { calculateEnergy } from "@/components/engines/energy/EnergyUtils";
import type { SimState } from "@/components/engines/types";

import { useSimulationRecorder } from "@/components/engines/analysis/useSimulationRecorder";
import AnalysisPanel from "@/components/engines/analysis/AnalysisPanel";
import type { RecordedFrame } from "@/components/engines/analysis/types";

// ── Types ──────────────────────────────────────────────────────
interface AdjustableParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

interface AnalyzeResponse {
  problem_class: string;
  problem_label: string;
  parameters: Record<string, number>;
  adjustable_parameters: AdjustableParam[];
  relationships: string[];
  suggested_visual_template: string;
  visual_primitives: string[];
}

// ── Constants ──────────────────────────────────────────────────
const API_URL = "http://localhost:5000/analyze";

const DEFAULT_PARAMS: Record<string, number> = {
  gravity: 9.8, mass: 1, angle: 45, velocity: 20,
};

const DEFAULT_SLIDERS: AdjustableParam[] = [
  { label: "Gravity (m/s²)", key: "gravity", min: 0, max: 20, step: 0.1 },
  { label: "Mass (kg)", key: "mass", min: 0.1, max: 100, step: 0.1 },
  { label: "Angle (°)", key: "angle", min: 0, max: 90, step: 1 },
  { label: "Velocity (m/s)", key: "velocity", min: 0, max: 100, step: 0.5 },
];

const VERTICAL_CLASSES = ["kinematics_vertical_motion"];
const PROJECTILE_CLASSES = ["projectile_motion"];
const CIRCULAR_CLASSES = ["circular_motion"];
const FORCE_CLASSES = ["dynamics_force_interaction", "force_interaction"];
const SHM_CLASSES = ["simple_harmonic_motion", "oscillations", "wave_motion_basic"];
const PULLEY_CLASSES = ["pulley_system"];
const PENDULUM_CLASSES = ["simple_pendulum"];
const ROTATIONAL_CLASSES = ["rotational_dynamics"];
const RAY_OPTICS_CLASSES = ["ray_optics"];

// ── Component ──────────────────────────────────────────────────
const Simulation = () => {
  const { toast } = useToast();

  // Input
  const [problem, setProblem] = useState("");

  // ── Simulation state machine ─────────────────────────────
  const [simState, setSimState] = useState<SimState>("idle");

  // UI flags
  const [showGraph, setShowGraph] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data from API
  const [simulationData, setSimulationData] = useState<AnalyzeResponse | null>(null);
  const [params, setParams] = useState<Record<string, number>>({ ...DEFAULT_PARAMS });
  const [sliders, setSliders] = useState<AdjustableParam[]>([...DEFAULT_SLIDERS]);

  // Live values from engine
  const [liveValues, setLiveValues] = useState({ time: 0, height: 0, velocity: 0, maxHeight: 0 });

  // Graph reset key — increment to clear graph buffer
  const [resetKey, setResetKey] = useState(0);

  // ── Analysis recorder ────────────────────────────────────
  const recorder = useSimulationRecorder();

  // Computed — engine routing
  const isVerticalMotion = simulationData
    ? VERTICAL_CLASSES.includes(simulationData.problem_class)
    : false;
  const isProjectileMotion = simulationData
    ? PROJECTILE_CLASSES.includes(simulationData.problem_class)
    : false;
  const isCircularMotion = simulationData
    ? CIRCULAR_CLASSES.includes(simulationData.problem_class)
    : false;
  const isForceInteraction = simulationData
    ? FORCE_CLASSES.includes(simulationData.problem_class)
    : false;
  const isSHM = simulationData
    ? SHM_CLASSES.includes(simulationData.problem_class)
    : false;
  const isPulley = simulationData
    ? PULLEY_CLASSES.includes(simulationData.problem_class)
    : false;
  const isPendulum = simulationData
    ? PENDULUM_CLASSES.includes(simulationData.problem_class)
    : false;
  const isRotational = simulationData
    ? ROTATIONAL_CLASSES.includes(simulationData.problem_class)
    : false;
  const isRayOptics = simulationData
    ? RAY_OPTICS_CLASSES.includes(simulationData.problem_class)
    : false;
  const hasEngine = isVerticalMotion || isProjectileMotion || isCircularMotion || isForceInteraction || isSHM || isPulley || isPendulum || isRotational || isRayOptics;

  // ══════════════════════════════════════════════════════════
  // CONTROL ACTIONS
  // ══════════════════════════════════════════════════════════

  /** Analyze → enters playing state */
  const handleVisualize = async () => {
    const trimmed = problem.trim();
    if (!trimmed) {
      toast({ title: "Empty Problem", description: "Please describe a physics problem first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    setSimState("idle"); // reset engine before new analysis

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ problem: trimmed }),
      });

      if (!response.ok) {
        let msg = `Server error: ${response.status}`;
        try { const e = await response.json(); msg = e.error || msg; } catch { }
        throw new Error(msg);
      }

      const data: AnalyzeResponse = JSON.parse(await response.text());

      setSimulationData({ ...data });
      setParams({ ...data.parameters });
      setSliders(data.adjustable_parameters?.length > 0 ? [...data.adjustable_parameters] : [...DEFAULT_SLIDERS]);
      setResetKey((k) => k + 1); // clear graph for new problem

      toast({ title: `✅ ${data.problem_label}`, description: `Class: ${data.problem_class.replace(/_/g, " ")}` });

      // Auto-play after a brief pause so React has time to commit state
      setTimeout(() => setSimState("playing"), 100);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast({ title: "Analysis Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /** Play: idle/paused → playing */
  const handlePlay = () => {
    if (simState === "idle" || simState === "paused") {
      setSimState("playing");
    }
  };

  /** Pause: playing → paused */
  const handlePause = () => {
    if (simState === "playing") {
      setSimState("paused");
    }
  };

  /** Replay: completed → reset time to 0, clear graph, play again */
  const handleReplay = () => {
    setSimState("idle"); // reset engine
    setResetKey((k) => k + 1); // clear graph
    setLiveValues({ time: 0, height: 0, velocity: 0, maxHeight: 0 });
    recorder.reset(); // clear analysis recorder
    // Idle → playing after a tick so engine processes the idle reset first
    setTimeout(() => setSimState("playing"), 50);
  };

  /** Reset: ANY → idle, clear everything */
  const handleReset = () => {
    setSimState("idle");
    setSimulationData(null);
    setError(null);
    setParams({ ...DEFAULT_PARAMS });
    setSliders([...DEFAULT_SLIDERS]);
    setLiveValues({ time: 0, height: 0, velocity: 0, maxHeight: 0 });
    setResetKey((k) => k + 1);
    recorder.reset(); // clear analysis recorder
  };

  // ── Dynamic parameter sync — clear recorder + graph on param change ──
  const prevParamsRef = useRef(JSON.stringify(params));
  useEffect(() => {
    const serialized = JSON.stringify(params);
    if (serialized === prevParamsRef.current) return; // skip initial mount
    prevParamsRef.current = serialized;

    // Only clear if there's an active engine (avoid clearing on handleReset)
    if (hasEngine && simState !== "idle") {
      recorder.reset();
      setResetKey((k) => k + 1);
      setLiveValues({ time: 0, height: 0, velocity: 0, maxHeight: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /** Save */
  const handleSave = () => {
    if (!simulationData) {
      toast({ title: "Nothing to save", description: "Visualize a problem first.", variant: "destructive" });
      return;
    }
    const saved = JSON.parse(localStorage.getItem("dotdynamics_saved") || "[]");
    saved.push({
      id: Date.now(),
      title: problem.slice(0, 60),
      problem,
      problem_class: simulationData.problem_class,
      problem_label: simulationData.problem_label,
      parameters: params,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem("dotdynamics_saved", JSON.stringify(saved));
    toast({ title: "Saved!", description: `"${problem.slice(0, 40)}..." saved to library.` });
  };

  // ── Engine callbacks ───────────────────────────────────────
  const handleEngineFrame = useCallback((values: { time: number; height: number; velocity: number; maxHeight: number }) => {
    setLiveValues(values);
  }, []);

  /**
   * Build a RecordedFrame from engine frame data + computed energy.
   * Called inside each engine's onFrame adapter below.
   */
  const recordAnalysisFrame = useCallback(
    (
      time: number,
      posX: number,
      posY: number,
      vel: number,
      velX: number,
      velY: number,
      accel: number,
      displacement: number,
      height: number,
      problemClass: string,
      engineParams: Record<string, number>,
    ) => {
      const energy = calculateEnergy(problemClass, engineParams, {
        time,
        height,
        velocity: vel,
        maxHeight: 0,
      });
      const frame: RecordedFrame = {
        time,
        positionX: posX,
        positionY: posY,
        velocity: vel,
        velocityX: velX,
        velocityY: velY,
        acceleration: accel,
        ke: energy.ke,
        pe: energy.pe,
        totalEnergy: energy.total,
        displacement,
        height,
      };
      recorder.recordFrame(frame);
    },
    [recorder]
  );

  const handleEngineComplete = useCallback(() => {
    setSimState("completed");
  }, []);

  // ── Computed energy values (Replaced by EnergyOverlay) ──
  // Kept here if needed for other logic, but removed from render


  const totalFlightTime = (() => {
    const v0 = params.initial_velocity ?? params.velocity ?? 20;
    const gv = params.gravity ?? 9.8;
    if (isCircularMotion) {
      return Math.max(10, liveValues.time + 2);
    }
    if (isRotational) {
      // Continuous rotation — dynamic time window
      return Math.max(10, liveValues.time + 2);
    }
    if (isForceInteraction) {
      return Math.max(5, liveValues.time + 2);
    }
    if (isProjectileMotion) {
      const angleRad = (params.angle ?? 45) * (Math.PI / 180);
      const vy0 = v0 * Math.sin(angleRad);
      return (2 * vy0) / gv;
    }
    return (2 * v0) / gv; // vertical motion
  })();

  // ── Button state logic ─────────────────────────────────────
  const canPlay = hasEngine && (simState === "idle" || simState === "paused");
  const canPause = simState === "playing";
  const canReplay = simState === "completed";
  const showPlayPause = simState !== "completed";

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="container mx-auto p-4 flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 min-h-0 overflow-hidden">

      {/* ═══ LEFT — Problem Input ═══ */}
      <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
        <h2 className="font-heading text-lg font-semibold text-foreground">Problem Input</h2>

        <Textarea
          placeholder="e.g. A ball is thrown upward with initial velocity 25 m/s"
          className="flex-1 min-h-[160px] resize-none"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          disabled={loading}
        />

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <Button className="w-full gap-2" onClick={handleVisualize} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {loading ? "Analyzing..." : "Visualize"}
        </Button>

        <Button variant="outline" className="w-full gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" /> Save
        </Button>

        {/* Physics info when data loaded */}
        {simulationData && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">
                {simulationData.problem_label}
              </span>
              {/* State badge */}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${simState === "playing" ? "bg-green-100 text-green-700" :
                simState === "paused" ? "bg-yellow-100 text-yellow-700" :
                  simState === "completed" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-500"
                }`}>
                {simState.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1">
              {simulationData.relationships.map((r, i) => (
                <p key={i} className="text-[11px] text-muted-foreground font-mono">{r}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ CENTER — Simulation Canvas + Controls ═══ */}
      <div className="flex flex-col gap-3 h-full min-h-0 min-w-0">
        <div className="flex-[2] basis-0 min-h-0 rounded-lg border bg-card shadow-card overflow-hidden relative">
          {isVerticalMotion ? (
            <VerticalMotionEngine
              initialVelocity={params.initial_velocity ?? params.velocity ?? 20}
              gravity={params.gravity ?? 9.8}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame(v);
                const pc = simulationData?.problem_class || "kinematics_vertical_motion";
                recordAnalysisFrame(v.time, 0, v.height, v.velocity, 0, v.velocity, -(params.gravity ?? 9.8), v.height, v.height, pc, params);
              }}
              onComplete={handleEngineComplete}
              showVelocityArrow={true}
              showGrid={true}
              showTrail={true}
              ballColor="#6366f1"
            />
          ) : isProjectileMotion ? (
            <ProjectileMotionEngine
              initialVelocity={params.initial_velocity ?? params.velocity ?? 20}
              angle={params.angle ?? 45}
              gravity={params.gravity ?? 9.8}
              initialHeight={params.initial_height ?? 0}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame({ time: v.time, height: v.y, velocity: v.speed, maxHeight: v.maxHeight });
                const pc = simulationData?.problem_class || "projectile_motion";
                const g = params.gravity ?? 9.8;
                const ay = -g;
                recordAnalysisFrame(v.time, v.x, v.y, v.speed, v.vx, v.vy, ay, v.x, v.y, pc, params);
              }}
              onComplete={handleEngineComplete}
              showVelocityArrows={true}
              showGrid={true}
              showTrail={true}
              showAngleIndicator={true}
              ballColor="#8b5cf6"
            />
          ) : isCircularMotion ? (
            <CircularMotionEngine
              radius={params.radius ?? 5}
              angularVelocity={params.angular_velocity}
              velocity={params.velocity ?? params.initial_velocity}
              mass={params.mass ?? 1}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame({ time: v.time, height: v.angle, velocity: v.tangentialSpeed, maxHeight: Math.max(10, v.angle * 1.2) });
                const pc = simulationData?.problem_class || "circular_motion";
                recordAnalysisFrame(v.time, v.x, v.y, v.tangentialSpeed, 0, 0, v.centripetalAccel, v.angle, v.y, pc, params);
              }}
              showRadiusLine={true}
              showVelocityArrow={true}
              showCentripetalArrow={true}
              showAngleIndicator={true}
              showOrbitPath={true}
              ballColor="#0ea5e9"
            />
          ) : isForceInteraction ? (
            <ForceInteractionEngine
              angle={params.angle ?? 30}
              mass={params.mass ?? 2}
              frictionCoefficient={params.friction_coefficient ?? 0}
              gravity={params.gravity ?? 9.8}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame({ time: v.time, height: v.displacement, velocity: v.velocity, maxHeight: 10 });
                const pc = simulationData?.problem_class || "dynamics_force_interaction";
                const angleDeg = params.angle ?? 30;
                const angleRad = angleDeg * Math.PI / 180;
                const vertH = v.displacement * Math.sin(angleRad);
                recordAnalysisFrame(v.time, v.displacement, vertH, v.velocity, 0, 0, v.acceleration, v.displacement, vertH, pc, params);
              }}
              onComplete={handleEngineComplete}
              showVectors={true}
              showComponents={true}
              inclineLength={10}
            />
          ) : isSHM ? (
            <SimpleHarmonicMotionEngine
              mass={params.mass ?? 1}
              k={params.k ?? params.spring_constant ?? 10}
              amplitude={params.amplitude ?? 2}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame({
                  time: v.time,
                  height: v.displacement,
                  velocity: v.velocity,
                  maxHeight: params.amplitude ?? 2
                });
                const pc = simulationData?.problem_class || "simple_harmonic_motion";
                recordAnalysisFrame(v.time, v.displacement, 0, v.velocity, 0, 0, v.acceleration, v.displacement, v.displacement, pc, params);
              }}
              onComplete={handleEngineComplete}
              showVectors={true}
            />
          ) : isPulley ? (
            <PulleyEngine
              mass1={params.mass1 ?? 3}
              mass2={params.mass2 ?? 5}
              gravity={params.gravity ?? 9.8}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame({
                  time: v.time,
                  height: (v.h1 + v.h2) / 2,
                  velocity: v.velocity,
                  maxHeight: 10,
                });
                const pc = simulationData?.problem_class || "pulley_system";
                recordAnalysisFrame(
                  v.time,
                  v.displacement,
                  (v.h1 + v.h2) / 2,
                  v.velocity,
                  0,
                  v.velocity,
                  v.acceleration,
                  v.displacement,
                  (v.h1 + v.h2) / 2,
                  pc,
                  params,
                );
              }}
              onComplete={handleEngineComplete}
            />
          ) : isPendulum ? (
            <PendulumEngine
              length={params.length ?? 2}
              gravity={params.gravity ?? 9.8}
              theta0={params.theta0 ?? 15}
              mass={params.mass ?? 1}
              simState={simState}
              onFrame={(v) => {
                const heightRise = (params.length ?? 2) * (1 - Math.cos(v.theta));
                handleEngineFrame({
                  time: v.time,
                  height: heightRise,
                  velocity: v.velocity,
                  maxHeight: (params.length ?? 2) * 2,
                });
                const pc = simulationData?.problem_class || "simple_pendulum";
                recordAnalysisFrame(
                  v.time,
                  v.x,
                  heightRise,
                  v.velocity,
                  0,
                  v.velocity,
                  0,
                  v.x,
                  heightRise,
                  pc,
                  params,
                );
              }}
              onComplete={handleEngineComplete}
            />
          ) : isRotational ? (
            <RotationalDynamicsEngine
              shape={(["disk", "sphere", "square"] as const)[Math.round(params.shape ?? 0)] ?? "disk"}
              mass={params.mass ?? 2}
              size={params.radius ?? 0.5}
              torque={params.torque ?? 5}
              initialAngularVelocity={params.initial_angular_velocity ?? 0}
              simState={simState}
              onFrame={(v) => {
                handleEngineFrame({
                  time: v.time,
                  height: v.theta,
                  velocity: v.omega,
                  maxHeight: Math.abs(v.theta) + 1,
                });
                const pc = simulationData?.problem_class || "rotational_dynamics";
                recordAnalysisFrame(
                  v.time,
                  v.theta,
                  0,
                  v.omega,
                  0,
                  0,
                  v.alpha,
                  v.theta,
                  0,
                  pc,
                  { ...params, moment_of_inertia: v.momentOfInertia },
                );
              }}
              onComplete={handleEngineComplete}
              showTorqueArrow={true}
              showAngleArc={true}
              showOmegaIndicator={true}
            />
          ) : isRayOptics ? (
            <RayOpticsEngine
              opticsMode={(["plane", "concave_mirror", "convex_mirror", "convex_lens", "concave_lens"] as const)[Math.round(params.optics_mode ?? 0)] ?? "plane"}
              focalLength={params.focal_length ?? 15}
              objectDistance={params.object_distance ?? 25}
              objectHeight={params.object_height ?? 4}
              simState={simState}
              showNormals={true}
              showAngleArcs={true}
              showConstructionLines={true}
              onFrame={(v) => {
                handleEngineFrame({
                  time: 0,
                  height: v.v,
                  velocity: v.magnification,
                  maxHeight: Math.abs(v.v) + 10,
                });
              }}
            />
          ) : simulationData ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center w-full max-w-md">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full">
                  <Play className="h-4 w-4" />
                  <span className="text-sm font-semibold">{simulationData.problem_label}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 font-mono">{simulationData.problem_class}</p>
                <p className="text-xs text-muted-foreground">
                  Engine for this physics class is coming soon.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <Play className="h-6 w-6 text-accent" />
                </div>
                <p className="text-sm font-medium">Simulation Canvas</p>
                <p className="text-xs mt-1">Describe a problem and click Visualize</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Media-style transport controls ── */}
        <div className="flex items-center justify-center gap-3">
          {/* Play / Pause / Replay — main action */}
          {canReplay ? (
            <Button variant="default" size="icon" onClick={handleReplay} title="Replay">
              <RefreshCw className="h-4 w-4" />
            </Button>
          ) : showPlayPause ? (
            canPause ? (
              <Button variant="default" size="icon" onClick={handlePause} title="Pause">
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlay}
                disabled={!canPlay}
                title="Play"
              >
                <Play className="h-4 w-4" />
              </Button>
            )
          ) : null}

          {/* Reset — always available */}
          <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Advanced Analysis Panel ── */}
        {showAnalysis && hasEngine && (
          <div className="min-h-0 overflow-hidden relative">
            <AnalysisPanel
              recorder={recorder}
              currentTime={liveValues.time}
              maxTime={totalFlightTime}
              simState={simState}
              currentParams={params}
            />
          </div>
        )}
      </div>

      {/* ═══ RIGHT — Parameters & Live Values ═══ */}
      <div className="flex flex-col gap-5 h-full min-h-0 overflow-y-auto pr-2">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Parameters
          {simulationData && (
            <span className="ml-2 text-xs font-normal text-accent">({sliders.length})</span>
          )}
        </h2>

        {sliders.map((slider) => (
          <div key={slider.key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{slider.label}</span>
              <span className="font-medium text-foreground tabular-nums">
                {(params[slider.key] ?? 0).toFixed(slider.step < 1 ? 1 : 0)}
              </span>
            </div>
            <Slider
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={[params[slider.key] ?? slider.min]}
              onValueChange={([val]) => setParams((prev) => ({ ...prev, [slider.key]: val }))}
            />
          </div>
        ))}

        {/* Analysis toggle */}
        <div className="pt-2">
          <Button
            variant={showAnalysis ? "default" : "outline"}
            size="sm"
            className="w-full gap-2"
            onClick={() => setShowAnalysis(!showAnalysis)}
          >
            <BarChart3 className="h-4 w-4" /> {showAnalysis ? "Hide" : "Show"} Analysis
          </Button>
        </div>

        {/* Live Values */}
        <div className="mt-auto rounded-lg border bg-muted/50 p-4">
          <h3 className="text-xs font-semibold text-foreground mb-2">
            Live Values
            {simState === "playing" && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            {simState === "completed" && <span className="ml-2 text-[10px] text-blue-600 font-medium">DONE</span>}
          </h3>
          <div className="space-y-1 text-xs text-muted-foreground font-mono">
            <div className="flex justify-between"><span>Time</span><span className="tabular-nums">{liveValues.time.toFixed(2)} s</span></div>
            <div className="flex justify-between"><span>{isSHM ? "Displacement" : "Height"}</span><span className="tabular-nums">{liveValues.height.toFixed(2)} m</span></div>
            <div className="flex justify-between">
              <span>Velocity</span>
              <span className={`tabular-nums ${liveValues.velocity < 0 ? "text-red-500" : "text-green-600"}`}>
                {liveValues.velocity.toFixed(2)} m/s
              </span>
            </div>
            <div className="flex justify-between"><span>{isSHM ? "Amplitude" : "Max Height"}</span><span className="tabular-nums">{liveValues.maxHeight.toFixed(2)} m</span></div>

            <hr className="border-border my-1" />

            {/* Universal Energy System */}
            <div className="mt-2">
              <EnergyOverlay
                problemClass={simulationData?.problem_class || "kinematics_vertical_motion"}
                params={params}
                liveValues={liveValues}
                simState={simState}
                showGraph={true}
                resetKey={resetKey}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Simulation;
