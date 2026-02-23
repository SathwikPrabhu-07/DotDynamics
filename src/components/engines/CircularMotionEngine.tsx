import { useRef, useEffect, useCallback, useState } from "react";
import type { SimState } from "./types";

// ── Physics Model ──────────────────────────────────────────────
// Uniform circular motion:
//   θ(t) = ω · t            (angular displacement, rad)
//   x(t) = r · cos(θ)       y(t) = r · sin(θ)
//   v = r · ω               (tangential speed)
//   a_c = r · ω²            (centripetal acceleration)
//   T = 2π / ω              (period)
//
// Animation runs indefinitely — no ground collision.

interface CircularMotionProps {
    /** Orbit radius (m) */
    radius: number;
    /** Angular velocity (rad/s). If 0, computed from velocity/radius. */
    angularVelocity?: number;
    /** Tangential speed (m/s). Used when angularVelocity is not provided. */
    velocity?: number;
    /** Mass of the object (kg) — for force display */
    mass?: number;
    /** Simulation state machine */
    simState: SimState;
    /** Called every rendered frame */
    onFrame?: (values: CircularFrameData) => void;
    /** Ball radius px */
    ballRadius?: number;
    /** Ball color hex */
    ballColor?: string;
    /** Show radius line */
    showRadiusLine?: boolean;
    /** Show velocity arrow (tangent) */
    showVelocityArrow?: boolean;
    /** Show centripetal acceleration arrow */
    showCentripetalArrow?: boolean;
    /** Show angle arc at center */
    showAngleIndicator?: boolean;
    /** Show orbit trail */
    showOrbitPath?: boolean;
}

export interface CircularFrameData {
    time: number;
    angle: number;          // rad
    angleDeg: number;       // deg
    x: number;              // m
    y: number;              // m
    tangentialSpeed: number; // m/s
    centripetalAccel: number;// m/s²
    period: number;         // s
    revolutions: number;
}

// ── Pure physics ───────────────────────────────────────────────
const TAU = 2 * Math.PI;

function circularPhysics(radius: number, omega: number, t: number) {
    const theta = omega * t;
    return {
        theta,
        thetaDeg: (theta * 180) / Math.PI,
        x: radius * Math.cos(theta),
        y: radius * Math.sin(theta),
        tangentialSpeed: radius * omega,
        centripetalAccel: radius * omega * omega,
        period: omega > 0 ? TAU / omega : Infinity,
        revolutions: theta / TAU,
    };
}

// ── Drawing helpers ────────────────────────────────────────────

function drawOrbitPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rPx: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(139,92,246,0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawCenterDot(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    // Crosshair
    const L = 8;
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(cx - L, cy); ctx.lineTo(cx + L, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - L); ctx.lineTo(cx, cy + L); ctx.stroke();
    // Dot
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fill();
    ctx.restore();
}

function drawRadiusLine(ctx: CanvasRenderingContext2D, cx: number, cy: number, bx: number, by: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(100,116,139,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawAngleArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, theta: number) {
    // Normalize to [0, 2π]
    const normTheta = ((theta % TAU) + TAU) % TAU;
    if (normTheta < 0.01) return;
    const r = 25;
    ctx.save();
    ctx.strokeStyle = "rgba(234,179,8,0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    // Canvas: 0 = east, positive = clockwise. Physics: positive theta = counter-clockwise.
    // We draw from 0 to -normTheta (counter-clockwise in canvas).
    ctx.arc(cx, cy, r, 0, -normTheta, true);
    ctx.stroke();
    // Label
    const mid = -normTheta / 2;
    const deg = ((normTheta * 180) / Math.PI) % 360;
    ctx.fillStyle = "rgba(234,179,8,0.8)";
    ctx.font = "bold 10px Inter";
    ctx.textAlign = "center";
    ctx.fillText(`${deg.toFixed(0)}°`, cx + (r + 14) * Math.cos(mid), cy + (r + 14) * Math.sin(mid) + 3);
    ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU);
    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, lighten(color, 40));
    g.addColorStop(0.7, color);
    g.addColorStop(1, darken(color, 30));
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
    ctx.restore();
}

function drawTangentialVelocity(
    ctx: CanvasRenderingContext2D,
    bx: number, by: number,
    theta: number,
    speed: number,
    scale: number,
) {
    if (speed < 0.1) return;
    // Tangent direction: perpendicular to radius, in direction of motion
    // radius direction = (cos θ, -sin θ) in canvas coords
    // tangent (CCW) = (sin θ, cos θ) in canvas coords
    const len = Math.min(speed * scale * 0.6, 70);
    const tx = Math.sin(theta);   // canvas: tangent x
    const ty = Math.cos(theta);   // canvas: tangent y (note: no negation because canvas Y is flipped)
    const endX = bx + tx * len;
    const endY = by + ty * len;

    ctx.save();
    ctx.strokeStyle = "rgba(34,197,94,0.7)";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(endX, endY); ctx.stroke();
    // Arrowhead
    const headLen = 8;
    const angle = Math.atan2(endY - by, endX - bx);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fill();
    // Label
    ctx.font = "bold 10px Inter"; ctx.textAlign = "left";
    ctx.fillText(`v ${speed.toFixed(1)} m/s`, endX + 6, endY - 4);
    ctx.restore();
}

function drawCentripetalArrow(
    ctx: CanvasRenderingContext2D,
    bx: number, by: number,
    cx: number, cy: number,
    accel: number,
    scale: number,
) {
    if (accel < 0.01) return;
    // Direction: from ball toward center
    const dx = cx - bx; const dy = cy - by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const nx = dx / dist; const ny = dy / dist;
    const len = Math.min(accel * scale * 0.3, 50);
    const endX = bx + nx * len;
    const endY = by + ny * len;

    ctx.save();
    ctx.strokeStyle = "rgba(239,68,68,0.6)";
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(endX, endY); ctx.stroke();
    const angle = Math.atan2(ny, nx);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - 7 * Math.cos(angle - 0.4), endY - 7 * Math.sin(angle - 0.4));
    ctx.lineTo(endX - 7 * Math.cos(angle + 0.4), endY - 7 * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fill();
    ctx.font = "bold 10px Inter"; ctx.textAlign = "left";
    ctx.fillText(`ac ${accel.toFixed(1)} m/s²`, endX + 6, endY + 4);
    ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, cw: number, ch: number, cx: number, cy: number, rPx: number, rWorld: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.25)";

    const scale = rPx / rWorld;
    const step = niceStep(rWorld, 2);

    for (let m = step; m <= rWorld * 1.4; m += step) {
        const px = m * scale;
        // Horizontal lines
        if (cy - px > 10) {
            ctx.beginPath(); ctx.moveTo(0, cy - px); ctx.lineTo(cw, cy - px); ctx.stroke();
            ctx.setLineDash([]); ctx.textAlign = "right";
            ctx.fillText(`${m.toFixed(0)} m`, cx - rPx - 8, cy - px + 3);
            ctx.setLineDash([4, 4]);
        }
        if (cy + px < ch - 10) {
            ctx.beginPath(); ctx.moveTo(0, cy + px); ctx.lineTo(cw, cy + px); ctx.stroke();
        }
        // Vertical lines
        if (cx + px < cw - 10) {
            ctx.beginPath(); ctx.moveTo(cx + px, 0); ctx.lineTo(cx + px, ch); ctx.stroke();
            ctx.setLineDash([]); ctx.textAlign = "center";
            ctx.fillText(`${m.toFixed(0)}`, cx + px, cy + rPx + 18);
            ctx.setLineDash([4, 4]);
        }
        if (cx - px > 10) {
            ctx.beginPath(); ctx.moveTo(cx - px, 0); ctx.lineTo(cx - px, ch); ctx.stroke();
        }
    }
    ctx.restore();
}

function niceStep(range: number, ticks: number): number {
    if (range <= 0) return 1;
    const rough = range / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    if (norm <= 1.5) return mag;
    if (norm <= 3) return 2 * mag;
    if (norm <= 7) return 5 * mag;
    return 10 * mag;
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
// CircularMotionEngine
// ══════════════════════════════════════════════════════════════
const CircularMotionEngine: React.FC<CircularMotionProps> = ({
    radius,
    angularVelocity,
    velocity,
    mass = 1,
    simState,
    onFrame,
    ballRadius = 14,
    ballColor = "#0ea5e9",
    showRadiusLine = true,
    showVelocityArrow = true,
    showCentripetalArrow = true,
    showAngleIndicator = true,
    showOrbitPath = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef(0);
    const prevTs = useRef(0);
    const simTime = useRef(0);
    const [dims, setDims] = useState({ w: 600, h: 400 });

    // Derived: resolve omega (needed for initial render and effects)
    const omega = angularVelocity ?? (velocity && radius > 0 ? velocity / radius : 1);

    // ── Physics Refs (to avoid stale closures in RAF) ──────────
    const paramsRef = useRef({
        radius,
        omega: angularVelocity ?? (velocity && radius > 0 ? velocity / radius : 1),
        mass,
        ballRadius,
        ballColor,
        showRadiusLine,
        showVelocityArrow,
        showCentripetalArrow,
        showAngleIndicator,
        showOrbitPath,
        onFrame
    });

    // Update refs when props change
    useEffect(() => {
        const computedOmega = angularVelocity ?? (velocity && radius > 0 ? velocity / radius : 1);
        paramsRef.current = {
            radius,
            omega: computedOmega,
            mass,
            ballRadius,
            ballColor,
            showRadiusLine,
            showVelocityArrow,
            showCentripetalArrow,
            showAngleIndicator,
            showOrbitPath,
            onFrame
        };
    }, [radius, angularVelocity, velocity, mass, ballRadius, ballColor, showRadiusLine, showVelocityArrow, showCentripetalArrow, showAngleIndicator, showOrbitPath, onFrame]);

    // ── Render one frame ─────────────────────────────────────
    const renderFrame = useCallback((t: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Read latest params
        const {
            radius: r,
            omega: w,
            mass: m,
            ballRadius: br,
            ballColor: bc,
            showRadiusLine: sRad,
            showVelocityArrow: sVel,
            showCentripetalArrow: sAcc,
            showAngleIndicator: sAng,
            showOrbitPath: sPath,
            onFrame: cb
        } = paramsRef.current;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        // Center of canvas
        const centerX = cw / 2;
        const centerY = ch / 2;

        // Scale: fit the orbit with padding
        const maxDim = Math.min(cw, ch);
        const padding = 90; // px for HUD + arrows
        const rPx = Math.max((maxDim - padding) / 2, 30); // orbit radius in pixels
        // Visual scale: px per meter. NOTE: changing r changes scale, so orbit looks same size.
        // But velocity calculation below uses real r.
        const scale = rPx / Math.max(r, 0.01);

        // Physics
        const state = circularPhysics(r, w, t);

        // World → canvas  (Y inverted: physics +y is up, canvas +y is down)
        const ballCX = centerX + state.x * scale;
        const ballCY = centerY - state.y * scale;

        // ── Clear + background
        ctx.clearRect(0, 0, cw, ch);
        const bg = ctx.createLinearGradient(0, 0, 0, ch);
        bg.addColorStop(0, "#f8fafc"); bg.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

        // ── Grid
        drawGrid(ctx, cw, ch, centerX, centerY, rPx, r);

        // ── Orbit path
        if (sPath) drawOrbitPath(ctx, centerX, centerY, rPx);

        // ── Center crosshair
        drawCenterDot(ctx, centerX, centerY);

        // ── Angle arc
        if (sAng) drawAngleArc(ctx, centerX, centerY, state.theta);

        // ── Radius line
        if (sRad) drawRadiusLine(ctx, centerX, centerY, ballCX, ballCY);

        // ── Ball
        drawBall(ctx, ballCX, ballCY, br, bc);

        // ── Tangential velocity arrow
        if (sVel) {
            drawTangentialVelocity(ctx, ballCX, ballCY, state.theta, state.tangentialSpeed, scale);
        }

        // ── Centripetal acceleration arrow
        if (sAcc) {
            drawCentripetalArrow(ctx, ballCX, ballCY, centerX, centerY, state.centripetalAccel, scale);
        }

        // ── HUD
        ctx.save();
        ctx.font = "12px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)} s`, 10, 18);
        ctx.fillText(`θ = ${state.thetaDeg.toFixed(1)}°`, 10, 34);
        ctx.fillText(`v = ${state.tangentialSpeed.toFixed(2)} m/s`, 10, 50);
        ctx.fillText(`ac = ${state.centripetalAccel.toFixed(2)} m/s²`, 10, 66);
        ctx.fillText(`rev = ${state.revolutions.toFixed(2)}`, 10, 82);
        ctx.restore();

        // ── Info corner (period, radius)
        ctx.save();
        ctx.font = "11px Inter"; ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.textAlign = "right";
        ctx.fillText(`r = ${r.toFixed(1)} m`, cw - 10, 18);
        ctx.fillText(`ω = ${w.toFixed(2)} rad/s`, cw - 10, 34);
        ctx.fillText(`T = ${state.period.toFixed(2)} s`, cw - 10, 50);
        ctx.fillText(`Fc = ${(m * state.centripetalAccel).toFixed(2)} N`, cw - 10, 66);
        ctx.restore();

        cb?.({
            time: t,
            angle: state.theta,
            angleDeg: state.thetaDeg,
            x: state.x,
            y: state.y,
            tangentialSpeed: state.tangentialSpeed,
            centripetalAccel: state.centripetalAccel,
            period: state.period,
            revolutions: state.revolutions,
        });
    }, []);

    // ── Stop / Start loop ────────────────────────────────────
    const stopLoop = useCallback(() => {
        if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
        prevTs.current = 0;
    }, []);

    const startLoop = useCallback(() => {
        stopLoop();

        const tick = (ts: number) => {
            if (prevTs.current === 0) prevTs.current = ts;
            const dt = Math.min((ts - prevTs.current) / 1000, 0.05);
            prevTs.current = ts;
            simTime.current += dt;

            renderFrame(simTime.current);
            rafId.current = requestAnimationFrame(tick);
        };

        rafId.current = requestAnimationFrame(tick);
    }, [renderFrame, stopLoop]);

    // ══════════════════════════════════════════════════════════
    // STATE MACHINE
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        switch (simState) {
            case "idle":
                stopLoop();
                simTime.current = 0;
                renderFrame(0);
                onFrame?.({
                    time: 0, angle: 0, angleDeg: 0,
                    x: radius, y: 0,
                    tangentialSpeed: radius * omega,
                    centripetalAccel: radius * omega * omega,
                    period: omega > 0 ? TAU / omega : Infinity,
                    revolutions: 0,
                });
                break;
            case "playing":
                startLoop();
                break;
            case "paused":
                stopLoop();
                renderFrame(simTime.current);
                break;
            case "completed":
                // Circular motion doesn't naturally complete,
                // but keep for API consistency
                stopLoop();
                // Re-render the final frame so canvas is NOT blank
                renderFrame(simTime.current);
                break;
        }
        return () => stopLoop();
    }, [simState]);

    // Dynamic parameter synchronization — handle ALL states
    useEffect(() => {
        if (simState === "idle") {
            simTime.current = 0;
            renderFrame(0);
        } else if (simState === "playing") {
            // Reset time and restart loop with fresh params from refs
            stopLoop();
            simTime.current = 0;
            startLoop();
        } else if (simState === "paused") {
            renderFrame(simTime.current);
        }
    }, [radius, omega]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Redraw on canvas resize (dims change clears canvas) ──
    useEffect(() => {
        if (simState === "idle") {
            renderFrame(0);
        } else if (simState === "paused" || simState === "completed") {
            renderFrame(simTime.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dims]);

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

export default CircularMotionEngine;
