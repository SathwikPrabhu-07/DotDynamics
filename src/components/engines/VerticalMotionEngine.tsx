import { useRef, useEffect, useState } from "react";
import type { SimState } from "./types";

// ── Physics Model ──────────────────────────────────────────────
// Vertical motion under uniform gravity:
//   y(t) = v₀t − ½gt²
//   v(t) = v₀ − gt

interface VerticalMotionProps {
    /** Initial upward velocity (m/s) */
    initialVelocity: number;
    /** Gravitational acceleration (m/s²) */
    gravity: number;
    /** Simulation state — drives all control logic */
    simState: SimState;
    /** Called when ball returns to ground */
    onComplete?: () => void;
    /** Called every rendered frame with live computed values */
    onFrame?: (values: FrameData) => void;
    /** Ball radius in px */
    ballRadius?: number;
    /** Ball color hex */
    ballColor?: string;
    /** Show velocity arrow overlay */
    showVelocityArrow?: boolean;
    /** Show background grid */
    showGrid?: boolean;
    /** Show trajectory trail dots */
    showTrail?: boolean;
}

export interface FrameData {
    time: number;
    height: number;
    velocity: number;
    maxHeight: number;
}

// ── Pure physics functions ─────────────────────────────────────
const computeHeight = (v0: number, g: number, t: number) =>
    v0 * t - 0.5 * g * t * t;

const computeVelocity = (v0: number, g: number, t: number) =>
    v0 - g * t;

const computeMaxHeight = (v0: number, g: number) =>
    (v0 * v0) / (2 * g);

const computeFlightTime = (v0: number, g: number) =>
    (2 * v0) / g;

// ── Drawing helpers ────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, _h: number, groundY: number, scale: number, maxH: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const step = maxH > 50 ? 10 : maxH > 20 ? 5 : maxH > 5 ? 2 : 1;
    for (let m = step; m <= maxH * 1.1; m += step) {
        const y = groundY - m * scale;
        if (y < 20) break;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${m} m`, 8, y - 4);
        ctx.setLineDash([4, 4]);
    }
    ctx.restore();
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, groundY: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(100,116,139,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
    ctx.strokeStyle = "rgba(100,116,139,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 12) {
        ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 8, groundY + 10); ctx.stroke();
    }
    ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, lighten(color, 40));
    g.addColorStop(0.7, color);
    g.addColorStop(1, darken(color, 30));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
    ctx.restore();
}

function drawVelocityArrow(ctx: CanvasRenderingContext2D, x: number, y: number, vel: number, scale: number) {
    if (Math.abs(vel) < 0.1) return;
    ctx.save();
    const len = Math.min(Math.abs(vel) * scale * 0.3, 80);
    const dir = vel > 0 ? -1 : 1;
    const endY = y + dir * len;
    ctx.strokeStyle = vel > 0 ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)";
    ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, endY); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.moveTo(x, endY); ctx.lineTo(x - 5, endY - dir * 8); ctx.lineTo(x + 5, endY - dir * 8); ctx.closePath(); ctx.fill();
    ctx.font = "bold 11px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`${Math.abs(vel).toFixed(1)} m/s`, x + 12, (y + endY) / 2 + 4);
    ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], color: string) {
    if (trail.length < 2) return;
    ctx.save();
    for (let i = 0; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.4;
        ctx.beginPath(); ctx.arc(trail[i].x, trail[i].y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
    }
    ctx.restore();
}

function drawMaxHeightLine(ctx: CanvasRenderingContext2D, w: number, y: number, maxH: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(234,179,8,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(234,179,8,0.7)";
    ctx.font = "11px Inter, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(`max: ${maxH.toFixed(1)} m`, w - 10, y - 6);
    ctx.restore();
}

function lighten(hex: string, n: number) {
    const c = parseInt(hex.replace("#", ""), 16);
    return `rgb(${Math.min(255, (c >> 16) + n)},${Math.min(255, ((c >> 8) & 0xff) + n)},${Math.min(255, (c & 0xff) + n)})`;
}
function darken(hex: string, n: number) {
    const c = parseInt(hex.replace("#", ""), 16);
    return `rgb(${Math.max(0, (c >> 16) - n)},${Math.max(0, ((c >> 8) & 0xff) - n)},${Math.max(0, (c & 0xff) - n)})`;
}

// ══════════════════════════════════════════════════════════════
// VerticalMotionEngine
// ══════════════════════════════════════════════════════════════
const VerticalMotionEngine: React.FC<VerticalMotionProps> = ({
    initialVelocity,
    gravity,
    simState,
    onComplete,
    onFrame,
    ballRadius = 14,
    ballColor = "#6366f1",
    showVelocityArrow = true,
    showGrid = true,
    showTrail = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Ref mirrors for physics props (prevent stale closures) ──
    const v0Ref = useRef(initialVelocity);
    const gravityRef = useRef(gravity);
    const onFrameRef = useRef(onFrame);
    const onCompleteRef = useRef(onComplete);
    const simStateRef = useRef(simState);
    const ballRadiusRef = useRef(ballRadius);
    const ballColorRef = useRef(ballColor);
    const showVelocityArrowRef = useRef(showVelocityArrow);
    const showGridRef = useRef(showGrid);
    const showTrailRef = useRef(showTrail);

    // Update refs every render — always fresh
    v0Ref.current = initialVelocity;
    gravityRef.current = gravity;
    onFrameRef.current = onFrame;
    onCompleteRef.current = onComplete;
    simStateRef.current = simState;
    ballRadiusRef.current = ballRadius;
    ballColorRef.current = ballColor;
    showVelocityArrowRef.current = showVelocityArrow;
    showGridRef.current = showGrid;
    showTrailRef.current = showTrail;

    // ── Animation refs (never cause re-renders) ──────────────
    const rafId = useRef<number>(0);
    const prevTimestamp = useRef<number>(0);
    const simTime = useRef<number>(0);
    const trail = useRef<{ x: number; y: number }[]>([]);
    const trailCounter = useRef(0);
    const completeFired = useRef(false);

    const [dims, setDims] = useState({ w: 600, h: 400 });

    // ── Resize observer ──────────────────────────────────────
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

    // ── Core functions — read from refs, zero stale closures ──

    function renderFrame(t: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const v0 = v0Ref.current;
        const g = gravityRef.current;
        const bRadius = ballRadiusRef.current;
        const bColor = ballColorRef.current;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        const groundY = ch - 40;
        const maxH = computeMaxHeight(v0, g);
        const usable = groundY - 50;
        const scale = maxH > 0 ? usable / (maxH * 1.15) : 1;
        const ballX = cw / 2;

        const h = Math.max(0, computeHeight(v0, g, t));
        const v = computeVelocity(v0, g, t);
        const ballY = groundY - h * scale;

        // Clear
        ctx.clearRect(0, 0, cw, ch);

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, ch);
        bg.addColorStop(0, "#f8fafc"); bg.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

        if (showGridRef.current) drawGrid(ctx, cw, ch, groundY, scale, maxH);
        if (maxH > 0) drawMaxHeightLine(ctx, cw, groundY - maxH * scale, maxH);
        drawGround(ctx, cw, groundY);
        if (showTrailRef.current) drawTrail(ctx, trail.current, bColor);
        drawBall(ctx, ballX, ballY, bRadius, bColor);
        if (showVelocityArrowRef.current) drawVelocityArrow(ctx, ballX + bRadius + 6, ballY, v, scale);

        // HUD
        ctx.save();
        ctx.font = "12px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)} s`, 10, 20);
        ctx.fillText(`h = ${h.toFixed(2)} m`, 10, 36);
        ctx.fillText(`v = ${v.toFixed(2)} m/s`, 10, 52);
        ctx.restore();

        onFrameRef.current?.({ time: t, height: h, velocity: v, maxHeight: maxH });
    }

    // ── Centralized lifecycle controls ──────────────────────────

    function stopSim() {
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = 0;
        }
        prevTimestamp.current = 0;
    }

    function resetSim() {
        stopSim();
        simTime.current = 0;
        trail.current = [];
        trailCounter.current = 0;
        completeFired.current = false;
    }

    function startSim() {
        stopSim();

        const tick = (timestamp: number) => {
            if (prevTimestamp.current === 0) prevTimestamp.current = timestamp;

            const deltaMs = timestamp - prevTimestamp.current;
            prevTimestamp.current = timestamp;
            const deltaSec = Math.min(deltaMs / 1000, 0.05);

            simTime.current += deltaSec;
            const t = simTime.current;

            // Flight time from current params (read refs)
            const flightTime = computeFlightTime(v0Ref.current, gravityRef.current);

            // Record trail
            trailCounter.current++;
            if (trailCounter.current % 3 === 0) {
                const canvas = canvasRef.current;
                if (canvas) {
                    const v0 = v0Ref.current;
                    const g = gravityRef.current;
                    const dpr = window.devicePixelRatio || 1;
                    const cw = canvas.width / dpr;
                    const ch = canvas.height / dpr;
                    const groundY = ch - 40;
                    const maxH = computeMaxHeight(v0, g);
                    const usable = groundY - 50;
                    const scale = maxH > 0 ? usable / (maxH * 1.15) : 1;
                    const h = Math.max(0, computeHeight(v0, g, t));
                    trail.current.push({ x: cw / 2, y: groundY - h * scale });
                    if (trail.current.length > 200) trail.current = trail.current.slice(-200);
                }
            }

            // Ground collision → completed
            if (t >= flightTime && flightTime > 0) {
                simTime.current = flightTime;
                renderFrame(flightTime);
                if (!completeFired.current) {
                    completeFired.current = true;
                    onCompleteRef.current?.();
                }
                rafId.current = 0;
                return;
            }

            renderFrame(t);
            rafId.current = requestAnimationFrame(tick);
        };

        rafId.current = requestAnimationFrame(tick);
    }

    // ══════════════════════════════════════════════════════════
    // STATE MACHINE — the only useEffect that drives everything
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        switch (simState) {
            case "idle":
                resetSim();
                renderFrame(0);
                onFrameRef.current?.({ time: 0, height: 0, velocity: v0Ref.current, maxHeight: computeMaxHeight(v0Ref.current, gravityRef.current) });
                break;
            case "playing":
                completeFired.current = false;
                startSim();
                break;
            case "paused":
                stopSim();
                renderFrame(simTime.current);
                break;
            case "completed":
                stopSim();
                break;
        }
        return () => stopSim();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simState]);

    // ══════════════════════════════════════════════════════════
    // DYNAMIC PARAMETER SYNCHRONIZATION
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        const state = simStateRef.current;
        if (state === "idle") {
            resetSim();
            renderFrame(0);
        } else if (state === "playing") {
            resetSim();
            startSim();
        } else if (state === "paused") {
            renderFrame(simTime.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialVelocity, gravity]);

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

export default VerticalMotionEngine;
