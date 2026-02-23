import { useRef, useEffect, useState } from "react";
import type { SimState } from "./types";

// ── Shape Types ────────────────────────────────────────────────
export type RotationalShape = "disk" | "sphere" | "square";

// ── Moment of Inertia Module ───────────────────────────────────
/**
 * Compute moment of inertia for common rigid body shapes
 * rotating about their center of mass.
 *
 *  Disk:    I = ½ m r²     (solid cylinder / thin disk)
 *  Sphere:  I = ⅖ m r²     (solid sphere)
 *  Square:  I = ⅙ m a²     (thin square plate, side = a = 2r)
 */
const momentOfInertiaFor = {
    disk: (mass: number, size: number) => 0.5 * mass * size * size,
    sphere: (mass: number, size: number) => (2 / 5) * mass * size * size,
    square: (mass: number, size: number) => {
        const a = size * 2; // side length = diameter
        return (1 / 6) * mass * a * a;
    },
};

export function computeMoI(shape: RotationalShape, mass: number, size: number): number {
    return momentOfInertiaFor[shape](mass, size);
}

// ── Physics Model ──────────────────────────────────────────────
const physics = {
    /** Angular acceleration: α = τ / I */
    alpha: (torque: number, I: number) => torque / I,

    /** Angular velocity: ω(t) = ω₀ + α·t */
    omega: (omega0: number, alpha: number, t: number) => omega0 + alpha * t,

    /** Angular displacement: θ(t) = ω₀·t + ½·α·t² */
    theta: (omega0: number, alpha: number, t: number) => omega0 * t + 0.5 * alpha * t * t,

    /** Rotational kinetic energy: KE = ½·I·ω² */
    kineticEnergy: (I: number, omega: number) => 0.5 * I * omega * omega,
};

// ── Drawing Helpers ────────────────────────────────────────────

function drawGrid(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    diskR: number
) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let r = diskR * 0.5; r <= diskR * 1.6; r += diskR * 0.5) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    const extent = diskR * 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - extent, cy); ctx.lineTo(cx + extent, cy);
    ctx.moveTo(cx, cy - extent); ctx.lineTo(cx, cy + extent);
    ctx.stroke();
    ctx.restore();
}

// ── Shape-specific drawing ─────────────────────────────────────

function drawShapeDisk(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number,
    _theta: number,
    color: string
) {
    ctx.save();
    // Outer glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    // Radial gradient fill
    const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, "#e0e7ff");
    grad.addColorStop(0.6, "#c7d2fe");
    grad.addColorStop(1, "#a5b4fc");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Edge ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner ring
    ctx.strokeStyle = "rgba(99,102,241,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
}

function drawShapeSphere(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number,
    _theta: number,
    color: string
) {
    ctx.save();
    // Outer glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;

    // Main sphere body
    const bodyGrad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.05,
        cx, cy, radius
    );
    bodyGrad.addColorStop(0, "#fef3c7");   // warm highlight
    bodyGrad.addColorStop(0.3, "#fbbf24"); // gold
    bodyGrad.addColorStop(0.7, "#f59e0b"); // amber
    bodyGrad.addColorStop(1, "#d97706");   // dark amber edge
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Edge ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specular highlight — top-left
    const specGrad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.35, 0,
        cx - radius * 0.3, cy - radius * 0.35, radius * 0.45
    );
    specGrad.addColorStop(0, "rgba(255,255,255,0.7)");
    specGrad.addColorStop(0.5, "rgba(255,255,255,0.2)");
    specGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(cx - radius * 0.15, cy - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Equator latitude line (rotates with theta — gives 3D rotation feel)
    ctx.strokeStyle = "rgba(120,53,15,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.95, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

function drawShapeSquare(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number,
    theta: number,
    color: string
) {
    const side = radius * 1.6; // side length slightly smaller than diameter
    const half = side / 2;

    ctx.save();
    ctx.translate(cx, cy);
    // Canvas positive rotation is CW; physics positive θ is CCW
    ctx.rotate(-theta);

    // Outer glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;

    // Rounded rect fill
    const grad = ctx.createLinearGradient(-half, -half, half, half);
    grad.addColorStop(0, "#d1fae5");   // light emerald
    grad.addColorStop(0.5, "#6ee7b7"); // emerald
    grad.addColorStop(1, "#34d399");   // deep emerald
    ctx.fillStyle = grad;

    const cornerR = 8;
    ctx.beginPath();
    ctx.moveTo(-half + cornerR, -half);
    ctx.lineTo(half - cornerR, -half);
    ctx.quadraticCurveTo(half, -half, half, -half + cornerR);
    ctx.lineTo(half, half - cornerR);
    ctx.quadraticCurveTo(half, half, half - cornerR, half);
    ctx.lineTo(-half + cornerR, half);
    ctx.quadraticCurveTo(-half, half, -half, half - cornerR);
    ctx.lineTo(-half, -half + cornerR);
    ctx.quadraticCurveTo(-half, -half, -half + cornerR, -half);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner detail — diagonal cross
    ctx.strokeStyle = "rgba(5,150,105,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-half * 0.7, -half * 0.7); ctx.lineTo(half * 0.7, half * 0.7);
    ctx.moveTo(half * 0.7, -half * 0.7); ctx.lineTo(-half * 0.7, half * 0.7);
    ctx.stroke();

    ctx.restore();
}

// Dispatch shape drawing
function drawBody(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number,
    theta: number,
    color: string,
    shape: RotationalShape
) {
    switch (shape) {
        case "disk":
            drawShapeDisk(ctx, cx, cy, radius, theta, color);
            break;
        case "sphere":
            drawShapeSphere(ctx, cx, cy, radius, theta, color);
            break;
        case "square":
            drawShapeSquare(ctx, cx, cy, radius, theta, color);
            break;
    }
}

function drawRadialMarker(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number, theta: number,
    color: string
) {
    ctx.save();
    const endX = cx + radius * Math.cos(theta);
    const endY = cy - radius * Math.sin(theta);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(endX, endY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPivot(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.save();
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTorqueArrow(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number,
    torque: number,
    color: string
) {
    if (Math.abs(torque) < 0.01) return;

    ctx.save();
    const arcR = radius * 1.25;
    const dir = torque > 0 ? 1 : -1;
    const startAngle = -Math.PI / 4;
    const sweep = dir * Math.PI * 1.2;
    const endAngle = startAngle + sweep;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, arcR, startAngle, endAngle, dir < 0);
    ctx.stroke();
    ctx.setLineDash([]);

    const tipX = cx + arcR * Math.cos(endAngle);
    const tipY = cy + arcR * Math.sin(endAngle);
    const tangent = endAngle + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const aLen = 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + aLen * Math.cos(tangent + 0.4), tipY + aLen * Math.sin(tangent + 0.4));
    ctx.lineTo(tipX + aLen * Math.cos(tangent - 0.4), tipY + aLen * Math.sin(tangent - 0.4));
    ctx.closePath();
    ctx.fill();

    ctx.font = "bold 11px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(`τ = ${Math.abs(torque).toFixed(1)} N·m`, cx, cy - arcR - 10);

    ctx.restore();
}

function drawAngleArc(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    thetaRad: number,
    diskR: number
) {
    const arcR = diskR * 0.4;
    const displayTheta = thetaRad % (2 * Math.PI);

    if (Math.abs(displayTheta) < 0.01) return;

    ctx.save();
    ctx.fillStyle = "rgba(99,102,241,0.12)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    if (displayTheta > 0) {
        ctx.arc(cx, cy, arcR, 0, -displayTheta, true);
    } else {
        ctx.arc(cx, cy, arcR, 0, -displayTheta, false);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(99,102,241,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    if (displayTheta > 0) {
        ctx.arc(cx, cy, arcR, 0, -displayTheta, true);
    } else {
        ctx.arc(cx, cy, arcR, 0, -displayTheta, false);
    }
    ctx.stroke();

    const mid = -displayTheta / 2;
    const labelR = arcR + 14;
    const labelX = cx + labelR * Math.cos(mid);
    const labelY = cy + labelR * Math.sin(mid);
    ctx.font = "11px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "rgba(99,102,241,0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const degrees = ((thetaRad * 180) / Math.PI) % 360;
    ctx.fillText(`${degrees.toFixed(1)}°`, labelX, labelY);

    ctx.restore();
}

function drawOmegaIndicator(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    diskR: number,
    omega: number
) {
    if (Math.abs(omega) < 0.01) return;

    ctx.save();
    const r = diskR + 25;
    const dir = omega > 0 ? 1 : -1;
    const startA = Math.PI * 0.9;
    const endA = startA + dir * Math.PI * 0.5;

    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA, dir < 0);
    ctx.stroke();

    const tipX = cx + r * Math.cos(endA);
    const tipY = cy + r * Math.sin(endA);
    const tangent = endA + (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const aLen = 7;
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + aLen * Math.cos(tangent + 0.4), tipY + aLen * Math.sin(tangent + 0.4));
    ctx.lineTo(tipX + aLen * Math.cos(tangent - 0.4), tipY + aLen * Math.sin(tangent - 0.4));
    ctx.closePath();
    ctx.fill();

    ctx.font = "10px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "#22c55e";
    ctx.textAlign = "center";
    ctx.fillText(`ω = ${omega.toFixed(2)} rad/s`, cx, cy + r + 16);

    ctx.restore();
}

// Shape label for HUD
const SHAPE_LABELS: Record<RotationalShape, string> = {
    disk: "Disk (½mr²)",
    sphere: "Sphere (⅖mr²)",
    square: "Square (⅙m·(2r)²)",
};

const SHAPE_MARKER_COLORS: Record<RotationalShape, string> = {
    disk: "#6366f1",
    sphere: "#92400e",
    square: "#059669",
};

// ── Props ──────────────────────────────────────────────────────

interface RotationalDynamicsProps {
    shape: RotationalShape;
    mass: number;
    size: number; // radius for disk/sphere, half-side for square
    torque: number;
    initialAngularVelocity: number;
    simState: SimState;
    onComplete?: () => void;
    onFrame?: (vals: {
        time: number;
        theta: number;
        omega: number;
        alpha: number;
        ke_rot: number;
        momentOfInertia: number;
    }) => void;
    showGrid?: boolean;
    showTorqueArrow?: boolean;
    showAngleArc?: boolean;
    showOmegaIndicator?: boolean;
}

// ══════════════════════════════════════════════════════════════
// RotationalDynamicsEngine
// ══════════════════════════════════════════════════════════════
const RotationalDynamicsEngine: React.FC<RotationalDynamicsProps> = ({
    shape,
    mass,
    size,
    torque,
    initialAngularVelocity,
    simState,
    onComplete,
    onFrame,
    showGrid: showGridProp = true,
    showTorqueArrow: showTorqueArrowProp = true,
    showAngleArc: showAngleArcProp = true,
    showOmegaIndicator: showOmegaIndicatorProp = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef(0);
    const prevTs = useRef(0);
    const simTime = useRef(0);
    const [dims, setDims] = useState({ w: 600, h: 400 });

    // ── Ref mirrors for all props (prevent stale closures) ──
    const shapeRef = useRef(shape);
    const massRef = useRef(mass);
    const sizeRef = useRef(size);
    const torqueRef = useRef(torque);
    const omega0Ref = useRef(initialAngularVelocity);
    const onFrameRef = useRef(onFrame);
    const onCompleteRef = useRef(onComplete);
    const simStateRef = useRef(simState);
    const showGridRef = useRef(showGridProp);
    const showTorqueArrowRef = useRef(showTorqueArrowProp);
    const showAngleArcRef = useRef(showAngleArcProp);
    const showOmegaIndicatorRef = useRef(showOmegaIndicatorProp);

    // Update refs every render — always fresh
    shapeRef.current = shape;
    massRef.current = mass;
    sizeRef.current = size;
    torqueRef.current = torque;
    omega0Ref.current = initialAngularVelocity;
    onFrameRef.current = onFrame;
    onCompleteRef.current = onComplete;
    simStateRef.current = simState;
    showGridRef.current = showGridProp;
    showTorqueArrowRef.current = showTorqueArrowProp;
    showAngleArcRef.current = showAngleArcProp;
    showOmegaIndicatorRef.current = showOmegaIndicatorProp;

    // Resize
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

    // ── Core render function — reads from refs exclusively ──

    function renderFrame(t: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const curShape = shapeRef.current;
        const curMass = massRef.current;
        const curSize = sizeRef.current;
        const tau = torqueRef.current;
        const w0 = omega0Ref.current;

        // Compute MoI from shape
        const I = computeMoI(curShape, curMass, curSize);

        const alpha = physics.alpha(tau, I);
        const omega = physics.omega(w0, alpha, t);
        const theta = physics.theta(w0, alpha, t);
        const ke = physics.kineticEnergy(I, omega);

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        // Body sizing — responsive
        const cx = cw / 2;
        const cy = ch / 2;
        const bodyR = Math.min(cw, ch) * 0.3;

        // ── Clear + background
        ctx.clearRect(0, 0, cw, ch);
        const bg = ctx.createLinearGradient(0, 0, 0, ch);
        bg.addColorStop(0, "#f8fafc");
        bg.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, cw, ch);

        // Grid
        if (showGridRef.current) drawGrid(ctx, cx, cy, bodyR);

        // Torque arrow
        if (showTorqueArrowRef.current) {
            drawTorqueArrow(ctx, cx, cy, bodyR, tau, "#f97316");
        }

        // Angle arc
        if (showAngleArcRef.current) {
            drawAngleArc(ctx, cx, cy, theta, bodyR);
        }

        // Shape body (disk / sphere / square)
        const markerColor = SHAPE_MARKER_COLORS[curShape];
        drawBody(ctx, cx, cy, bodyR, theta, markerColor, curShape);

        // Radial marker (rotates with theta)
        drawRadialMarker(ctx, cx, cy, bodyR, theta, markerColor);

        // Pivot
        drawPivot(ctx, cx, cy);

        // Omega indicator
        if (showOmegaIndicatorRef.current) {
            drawOmegaIndicator(ctx, cx, cy, bodyR, omega);
        }

        // ── HUD (top-left)
        ctx.save();
        ctx.font = "12px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)} s`, 10, 18);
        const thetaDeg = ((theta * 180) / Math.PI);
        ctx.fillText(`θ = ${thetaDeg.toFixed(1)}° (${theta.toFixed(2)} rad)`, 10, 34);
        ctx.fillText(`ω = ${omega.toFixed(2)} rad/s`, 10, 50);
        ctx.fillText(`α = ${alpha.toFixed(2)} rad/s²`, 10, 66);
        ctx.fillText(`KE = ${ke.toFixed(2)} J`, 10, 82);
        ctx.restore();

        // ── Params HUD (bottom-left)
        ctx.save();
        ctx.font = "10px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.textAlign = "left";
        ctx.fillText(`Shape: ${SHAPE_LABELS[curShape]}`, 10, ch - 50);
        ctx.fillText(`I = ${I.toFixed(3)} kg·m²`, 10, ch - 36);
        ctx.fillText(`τ = ${tau.toFixed(2)} N·m`, 10, ch - 22);
        ctx.fillText(`ω₀ = ${w0.toFixed(2)} rad/s  m = ${curMass.toFixed(1)} kg  r = ${curSize.toFixed(2)} m`, 10, ch - 8);
        ctx.restore();

        // ── Shape badge (top-right)
        ctx.save();
        ctx.font = "bold 11px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = markerColor;
        ctx.textAlign = "right";
        ctx.fillText(curShape.charAt(0).toUpperCase() + curShape.slice(1), cw - 10, 18);
        ctx.restore();

        // Fire callback
        onFrameRef.current?.({
            time: t,
            theta,
            omega,
            alpha,
            ke_rot: ke,
            momentOfInertia: I,
        });
    }

    // ── Centralized lifecycle controls ──────────────────────

    function stopSim() {
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = 0;
        }
        prevTs.current = 0;
    }

    function resetSim() {
        stopSim();
        simTime.current = 0;
    }

    function startSim() {
        stopSim();

        const tick = (ts: number) => {
            if (prevTs.current === 0) prevTs.current = ts;
            const dt = Math.min((ts - prevTs.current) / 1000, 0.05);
            prevTs.current = ts;
            simTime.current += dt;

            renderFrame(simTime.current);
            rafId.current = requestAnimationFrame(tick);
        };

        rafId.current = requestAnimationFrame(tick);
    }

    // ══════════════════════════════════════════════════════════
    // STATE MACHINE
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
    // Watches shape, mass, size, torque, ω₀
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
    }, [shape, mass, size, torque, initialAngularVelocity]);

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

export default RotationalDynamicsEngine;
