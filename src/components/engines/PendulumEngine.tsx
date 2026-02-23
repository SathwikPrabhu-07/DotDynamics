import { useRef, useEffect, useState } from "react";
import type { SimState } from "./types";

// ── Types ──────────────────────────────────────────────────────
export interface PendulumFrameData {
    time: number;
    theta: number;          // angular displacement (rad)
    angularVelocity: number; // dθ/dt (rad/s)
    x: number;              // bob x position (m)
    y: number;              // bob y below pivot (m, positive down)
    velocity: number;       // linear speed (m/s)
    ke: number;
    pe: number;
    totalEnergy: number;
}

interface PendulumEngineProps {
    length: number;         // string length (m)
    gravity: number;        // g (m/s²)
    theta0: number;         // initial angular displacement (degrees)
    mass: number;           // bob mass (kg)
    simState: SimState;
    onComplete?: () => void;
    onFrame?: (values: PendulumFrameData) => void;
}

// ── Pure physics (small-angle approximation) ───────────────────
const computeOmega = (g: number, L: number) => Math.sqrt(g / L);

const computeTheta = (theta0: number, omega: number, t: number) =>
    theta0 * Math.cos(omega * t);

const computeAngularVelocity = (theta0: number, omega: number, t: number) =>
    -theta0 * omega * Math.sin(omega * t);

const thetaToXY = (theta: number, L: number) => ({
    x: L * Math.sin(theta),
    y: L * Math.cos(theta),
});

const computePeriod = (g: number, L: number) => 2 * Math.PI * Math.sqrt(L / g);

// ── Color helpers ──────────────────────────────────────────────
function lighten(hex: string, n: number) {
    const c = parseInt(hex.replace("#", ""), 16);
    return `rgb(${Math.min(255, (c >> 16) + n)},${Math.min(255, ((c >> 8) & 0xff) + n)},${Math.min(255, (c & 0xff) + n)})`;
}
function darken(hex: string, n: number) {
    const c = parseInt(hex.replace("#", ""), 16);
    return `rgb(${Math.max(0, (c >> 16) - n)},${Math.max(0, ((c >> 8) & 0xff) - n)},${Math.max(0, (c & 0xff) - n)})`;
}

// ── Drawing helpers (pure functions — no closure state) ────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#f8fafc");
    bg.addColorStop(1, "#f1f5f9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
}

function drawPivot(ctx: CanvasRenderingContext2D, px: number, py: number) {
    ctx.save();
    ctx.fillStyle = "rgba(100,116,139,0.4)";
    ctx.fillRect(px - 40, py - 10, 80, 8);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#475569";
    ctx.fill();
    ctx.restore();
}

function drawString(
    ctx: CanvasRenderingContext2D, px: number, py: number, bx: number, by: number,
) {
    ctx.save();
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
}

function drawBob(
    ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string,
) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, lighten(color, 40));
    g.addColorStop(0.7, color);
    g.addColorStop(1, darken(color, 30));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();
    ctx.restore();
}

function drawAngleArc(
    ctx: CanvasRenderingContext2D, px: number, py: number, theta: number, arcR: number,
) {
    if (Math.abs(theta) < 0.001) return;
    ctx.save();
    ctx.strokeStyle = "rgba(100,116,139,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + arcR + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    const startAngle = Math.PI / 2;
    const endAngle = Math.PI / 2 - theta;
    ctx.strokeStyle = "rgba(234,179,8,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (theta > 0) ctx.arc(px, py, arcR, endAngle, startAngle, false);
    else ctx.arc(px, py, arcR, startAngle, endAngle, false);
    ctx.stroke();
    const thetaDeg = (theta * 180) / Math.PI;
    const labelAngle = (startAngle + endAngle) / 2;
    ctx.fillStyle = "rgba(234,179,8,0.9)";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.abs(thetaDeg).toFixed(1)}°`,
        px + Math.cos(labelAngle) * (arcR + 14),
        py + Math.sin(labelAngle) * (arcR + 14));
    ctx.restore();
}

function drawTrail(
    ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], color: string,
) {
    if (trail.length < 2) return;
    ctx.save();
    for (let i = 0; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.35;
        ctx.beginPath();
        ctx.arc(trail[i].x, trail[i].y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
    }
    ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// PendulumEngine — Simple Pendulum
// ══════════════════════════════════════════════════════════════
//
// LIFECYCLE DESIGN:
//
//   ┌──────────┐   simState change   ┌──────────────┐
//   │  Props   │ ──────────────────▶ │  State       │
//   │  change  │                     │  Machine     │
//   └──────────┘                     │  useEffect   │
//        │                           └──────┬───────┘
//        │                                  │
//        ▼                                  ▼
//   ┌──────────────┐                ┌──────────────┐
//   │ Param-change │                │  startSim /  │
//   │ useEffect    │                │  stopSim     │
//   └──────────────┘                └──────────────┘
//        │                                  │
//        │  if playing: reset + restart     │
//        │  if idle: render t=0             ▼
//        │  if paused: render current    ┌──────────┐
//        └─────────────────────────────▶ │ RAF loop │
//                                        │ reads    │
//                                        │ from     │
//                                        │ REFS     │
//                                        └──────────┘
//
// All physics params are mirrored into refs so the RAF tick
// function always reads the latest values — no stale closures.
// ══════════════════════════════════════════════════════════════

const PendulumEngine: React.FC<PendulumEngineProps> = ({
    length,
    gravity,
    theta0: theta0Deg,
    mass,
    simState,
    onComplete,
    onFrame,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Ref mirrors for physics props (prevent stale closures) ──
    const lengthRef = useRef(length);
    const gravityRef = useRef(gravity);
    const theta0DegRef = useRef(theta0Deg);
    const massRef = useRef(mass);
    const onFrameRef = useRef(onFrame);
    const onCompleteRef = useRef(onComplete);
    const simStateRef = useRef(simState);

    // Update refs on every render — always fresh values
    lengthRef.current = length;
    gravityRef.current = gravity;
    theta0DegRef.current = theta0Deg;
    massRef.current = mass;
    onFrameRef.current = onFrame;
    onCompleteRef.current = onComplete;
    simStateRef.current = simState;

    // ── Animation refs ──────────────────────────────────────────
    const rafId = useRef<number>(0);
    const prevTimestamp = useRef<number>(0);
    const simTime = useRef<number>(0);
    const trail = useRef<{ x: number; y: number }[]>([]);
    const trailCounter = useRef(0);

    const [dims, setDims] = useState({ w: 600, h: 400 });

    const BOB_R = 16;
    const BOB_COLOR = "#8b5cf6";

    // ── Resize observer ──────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0) setDims({ w: Math.floor(width), h: Math.floor(height) });
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // ── Core functions — read from refs, zero closure deps ──────

    /** Compute full physics frame from refs at time t */
    function buildFrame(t: number): PendulumFrameData {
        const L = lengthRef.current;
        const g = gravityRef.current;
        const th0 = (theta0DegRef.current * Math.PI) / 180;
        const m = massRef.current;
        const omega = computeOmega(g, L);
        const theta = computeTheta(th0, omega, t);
        const angVel = computeAngularVelocity(th0, omega, t);
        const { x, y } = thetaToXY(theta, L);
        const linearVel = Math.abs(L * angVel);
        const ke = 0.5 * m * linearVel * linearVel;
        const heightAboveLowest = L * (1 - Math.cos(theta));
        const pe = m * g * heightAboveLowest;
        return { time: t, theta, angularVelocity: angVel, x, y, velocity: linearVel, ke, pe, totalEnergy: ke + pe };
    }

    /** Render a single frame to canvas at simulation time t */
    function renderFrame(t: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const L = lengthRef.current;
        const g = gravityRef.current;
        const m = massRef.current;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        const frame = buildFrame(t);

        const pivotX = cw / 2;
        const pivotY = ch * 0.15;
        const availableH = ch * 0.7;
        const scale = availableH / (L * 1.15);

        const bobX = pivotX + frame.x * scale;
        const bobY = pivotY + frame.y * scale;

        ctx.clearRect(0, 0, cw, ch);
        drawBackground(ctx, cw, ch);

        drawTrail(ctx, trail.current, BOB_COLOR);

        const arcR = Math.min(40, L * scale * 0.3);
        drawAngleArc(ctx, pivotX, pivotY, frame.theta, arcR);
        drawString(ctx, pivotX, pivotY, bobX, bobY);
        drawPivot(ctx, pivotX, pivotY);
        drawBob(ctx, bobX, bobY, BOB_R, BOB_COLOR);

        // HUD
        ctx.save();
        ctx.font = "12px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)} s`, 10, 20);
        ctx.fillText(`θ = ${((frame.theta * 180) / Math.PI).toFixed(1)}°`, 10, 36);
        ctx.fillText(`ω = ${frame.angularVelocity.toFixed(2)} rad/s`, 10, 52);
        ctx.fillText(`v = ${frame.velocity.toFixed(2)} m/s`, 10, 68);
        ctx.textAlign = "right";
        const period = computePeriod(g, L);
        ctx.fillText(`T = ${period.toFixed(2)} s`, cw - 10, 20);
        ctx.fillText(`L = ${L.toFixed(1)} m`, cw - 10, 36);
        ctx.fillText(`m = ${m.toFixed(1)} kg`, cw - 10, 52);
        ctx.restore();

        // Energy mini-bar
        ctx.save();
        const barY = ch - 30;
        const barMaxW = cw * 0.4;
        const total = frame.totalEnergy > 0 ? frame.totalEnergy : 1;
        ctx.fillStyle = "rgba(239,68,68,0.6)";
        ctx.fillRect(10, barY, (frame.ke / total) * barMaxW, 6);
        ctx.fillStyle = "rgba(59,130,246,0.6)";
        ctx.fillRect(10 + (frame.ke / total) * barMaxW, barY, (frame.pe / total) * barMaxW, 6);
        ctx.font = "10px Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.textAlign = "left";
        ctx.fillText(`KE: ${frame.ke.toFixed(1)} J  PE: ${frame.pe.toFixed(1)} J`, 10, barY + 18);
        ctx.restore();

        onFrameRef.current?.(frame);
    }

    // ── Centralized lifecycle controls ──────────────────────────

    /** Cancel current RAF loop — guaranteed single loop */
    function stopSim() {
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = 0;
        }
        prevTimestamp.current = 0;
    }

    /** Reset all simulation state to initial conditions */
    function resetSim() {
        stopSim();
        simTime.current = 0;
        trail.current = [];
        trailCounter.current = 0;
    }

    /** Start the RAF loop — reads all values from REFS, never stale */
    function startSim() {
        stopSim(); // prevent double loops

        const tick = (timestamp: number) => {
            if (prevTimestamp.current === 0) prevTimestamp.current = timestamp;
            const deltaMs = timestamp - prevTimestamp.current;
            prevTimestamp.current = timestamp;
            const deltaSec = Math.min(deltaMs / 1000, 0.05);

            simTime.current += deltaSec;
            const t = simTime.current;

            // Record trail (reads from refs — always fresh params)
            trailCounter.current++;
            if (trailCounter.current % 3 === 0) {
                const canvas = canvasRef.current;
                if (canvas) {
                    const L = lengthRef.current;
                    const g = gravityRef.current;
                    const th0 = (theta0DegRef.current * Math.PI) / 180;
                    const dpr = window.devicePixelRatio || 1;
                    const cw = canvas.width / dpr;
                    const ch = canvas.height / dpr;
                    const pivotX = cw / 2;
                    const pivotY = ch * 0.15;
                    const scale = (ch * 0.7) / (L * 1.15);
                    const omega = computeOmega(g, L);
                    const theta = computeTheta(th0, omega, t);
                    const pos = thetaToXY(theta, L);
                    trail.current.push({ x: pivotX + pos.x * scale, y: pivotY + pos.y * scale });
                    if (trail.current.length > 300) trail.current = trail.current.slice(-300);
                }
            }

            renderFrame(t);
            rafId.current = requestAnimationFrame(tick);
        };

        rafId.current = requestAnimationFrame(tick);
    }

    // ══════════════════════════════════════════════════════════
    // STATE MACHINE — drives start/stop based on simState
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        switch (simState) {
            case "idle":
                resetSim();
                renderFrame(0);
                break;

            case "playing":
                startSim();
                break;

            case "paused":
                stopSim();
                renderFrame(simTime.current);
                break;

            case "completed":
                stopSim();
                // Re-render the final frame so canvas is NOT blank
                renderFrame(simTime.current);
                break;
        }

        return () => stopSim();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simState]);

    // ══════════════════════════════════════════════════════════
    // DYNAMIC PARAMETER SYNCHRONIZATION
    // ══════════════════════════════════════════════════════════
    // When physics props change:
    //   idle    → reset to t=0, render static frame
    //   playing → reset time, clear trail, restart RAF loop
    //   paused  → re-render current frame with new params (no auto-start)
    useEffect(() => {
        const state = simStateRef.current;
        if (state === "idle") {
            resetSim();
            renderFrame(0);
        } else if (state === "playing") {
            // Cancel current loop → reset → restart with fresh params
            resetSim();
            startSim();
        } else if (state === "paused") {
            // Just re-render; do NOT auto-start
            trail.current = [];
            renderFrame(simTime.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [length, gravity, theta0Deg, mass]);

    // ── Redraw on canvas resize (dims change clears canvas) ──
    useEffect(() => {
        const state = simStateRef.current;
        if (state === "idle") {
            renderFrame(0);
        } else if (state === "paused" || state === "completed") {
            renderFrame(simTime.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dims]);

    // ── Canvas sizing ────────────────────────────────────────
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    return (
        <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: 200 }}>
            <canvas
                ref={canvasRef}
                width={dims.w * dpr}
                height={dims.h * dpr}
                style={{ width: dims.w, height: dims.h, display: "block", borderRadius: "0.5rem" }}
            />
        </div>
    );
};

export default PendulumEngine;
