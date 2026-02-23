import { useRef, useEffect, useState } from "react";
import type { SimState } from "./types";

// ── Physics Model ──────────────────────────────────────────────
// Projectile motion under uniform gravity:
//   vx = v₀ cos(θ)           vy = v₀ sin(θ)
//   x(t) = vx · t            y(t) = h₀ + vy · t − ½gt²
//   Range = v₀² sin(2θ) / g  MaxH = h₀ + vy² / (2g)
//
// IMPORTANT: Canvas uses a UNIFORM scale (1m horizontal = 1m vertical)
// so the visual trajectory angle matches the physics angle exactly.

interface ProjectileMotionProps {
    /** Launch speed (m/s) */
    initialVelocity: number;
    /** Launch angle (degrees) */
    angle: number;
    /** Gravitational acceleration (m/s²) */
    gravity: number;
    /** Initial height above ground (m) */
    initialHeight?: number;
    /** Simulation state machine */
    simState: SimState;
    /** Called when projectile hits the ground */
    onComplete?: () => void;
    /** Called every rendered frame */
    onFrame?: (values: ProjectileFrameData) => void;
    /** Ball radius px */
    ballRadius?: number;
    /** Ball color hex */
    ballColor?: string;
    /** Show velocity decomposition arrows */
    showVelocityArrows?: boolean;
    /** Show background grid */
    showGrid?: boolean;
    /** Show trajectory trail */
    showTrail?: boolean;
    /** Show launch angle arc */
    showAngleIndicator?: boolean;
}

export interface ProjectileFrameData {
    time: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    speed: number;
    maxHeight: number;
    range: number;
}

// ── Pure physics ───────────────────────────────────────────────
const DEG_TO_RAD = Math.PI / 180;

const physics = {
    vx: (v0: number, angleDeg: number) => v0 * Math.cos(angleDeg * DEG_TO_RAD),
    vy: (v0: number, angleDeg: number) => v0 * Math.sin(angleDeg * DEG_TO_RAD),

    posX: (vx: number, t: number) => vx * t,
    posY: (vy: number, g: number, t: number, h0: number) =>
        h0 + vy * t - 0.5 * g * t * t,

    velY: (vy0: number, g: number, t: number) => vy0 - g * t,

    maxHeight: (vy0: number, g: number, h0: number) =>
        h0 + (vy0 * vy0) / (2 * g),

    /** Time when y = 0 (quadratic formula, positive root) */
    flightTime: (vy0: number, g: number, h0: number) => {
        // -0.5g t² + vy0 t + h0 = 0
        const a = -0.5 * g;
        const b = vy0;
        const c = h0;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return 0;
        return (-b - Math.sqrt(disc)) / (2 * a);
    },

    range: (vx: number, flightTime: number) => vx * flightTime,
};

// ── Drawing helpers ────────────────────────────────────────────

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

function drawGrid(
    ctx: CanvasRenderingContext2D,
    originX: number, groundY: number,
    plotW: number, plotH: number,
    worldMaxX: number, worldMaxY: number,
    scale: number,
) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.3)";

    // Horizontal (height) grid lines
    const hStep = niceStep(worldMaxY, 4);
    for (let m = hStep; m <= worldMaxY * 1.1; m += hStep) {
        const y = groundY - m * scale;
        if (y < 15) break;
        ctx.beginPath(); ctx.moveTo(originX, y); ctx.lineTo(originX + plotW, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = "right";
        ctx.fillText(`${m.toFixed(0)} m`, originX - 4, y + 3);
        ctx.setLineDash([4, 4]);
    }

    // Vertical (distance) grid lines
    const xStep = niceStep(worldMaxX, 5);
    for (let m = xStep; m <= worldMaxX * 1.1; m += xStep) {
        const x = originX + m * scale;
        if (x > originX + plotW + 5) break;
        ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, groundY - plotH); ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = "center";
        ctx.fillText(`${m.toFixed(0)}`, x, groundY + 14);
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

function drawTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], color: string) {
    if (trail.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([]);
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawVelocityArrows(
    ctx: CanvasRenderingContext2D,
    bx: number, by: number,
    vxWorld: number, vyWorld: number,
    uniformScale: number,
) {
    const maxLen = 60;
    const factor = uniformScale * 0.15;

    // vx arrow (horizontal, green)
    const vxLen = Math.min(Math.abs(vxWorld) * factor, maxLen);
    if (vxLen > 2) {
        ctx.save();
        ctx.strokeStyle = "rgba(34,197,94,0.7)"; ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + vxLen, by); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx + vxLen, by);
        ctx.lineTo(bx + vxLen - 6, by - 4);
        ctx.lineTo(bx + vxLen - 6, by + 4);
        ctx.closePath(); ctx.fill();
        ctx.font = "bold 10px Inter"; ctx.textAlign = "left";
        ctx.fillText(`vx ${Math.abs(vxWorld).toFixed(1)}`, bx + vxLen + 4, by + 3);
        ctx.restore();
    }

    // vy arrow (vertical — blue when rising, red when falling)
    const vyLen = Math.min(Math.abs(vyWorld) * factor, maxLen);
    const dir = vyWorld > 0 ? -1 : 1; // canvas Y inverted: positive vy → arrow goes UP (negative canvas Y)
    if (vyLen > 2) {
        ctx.save();
        ctx.strokeStyle = vyWorld > 0 ? "rgba(59,130,246,0.7)" : "rgba(239,68,68,0.7)";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + dir * vyLen); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by + dir * vyLen);
        ctx.lineTo(bx - 4, by + dir * (vyLen - 6));
        ctx.lineTo(bx + 4, by + dir * (vyLen - 6));
        ctx.closePath(); ctx.fill();
        ctx.font = "bold 10px Inter"; ctx.textAlign = "left";
        ctx.fillText(`vy ${Math.abs(vyWorld).toFixed(1)}`, bx + 6, by + dir * vyLen / 2 + 3);
        ctx.restore();
    }
}

function drawAngleArc(
    ctx: CanvasRenderingContext2D,
    ox: number, oy: number,
    angleDeg: number,
    scale: number,
    vx0: number, vy0: number,
) {
    const angleRad = angleDeg * DEG_TO_RAD;

    // Draw launch direction line (uses uniform scale, so angle is visually accurate)
    const lineLen = 50;
    const endX = ox + lineLen * Math.cos(angleRad);
    const endY = oy - lineLen * Math.sin(angleRad); // canvas Y inverted
    ctx.save();
    ctx.strokeStyle = "rgba(168,85,247,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(endX, endY); ctx.stroke();
    ctx.setLineDash([]);

    // Draw arc from 0° to θ
    const r = 30;
    ctx.strokeStyle = "rgba(168,85,247,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Canvas arc: 0 rad = east, negative angles go counter-clockwise visually
    // But canvas Y is inverted, so to go "upward" we use negative angles
    ctx.arc(ox, oy, r, 0, -angleRad, true);
    ctx.stroke();

    // Label
    const midAngle = angleRad / 2;
    ctx.fillStyle = "rgba(168,85,247,0.8)";
    ctx.font = "bold 11px Inter";
    ctx.textAlign = "center";
    ctx.fillText(
        `${angleDeg.toFixed(0)}°`,
        ox + (r + 14) * Math.cos(midAngle),
        oy - (r + 14) * Math.sin(midAngle) + 3, // canvas Y inverted → subtract
    );
    ctx.restore();
}

function drawMaxHeightLine(ctx: CanvasRenderingContext2D, x0: number, w: number, y: number, maxH: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(234,179,8,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(234,179,8,0.6)";
    ctx.font = "10px Inter"; ctx.textAlign = "right";
    ctx.fillText(`max: ${maxH.toFixed(1)} m`, x0 + w - 4, y - 4);
    ctx.restore();
}

function drawRangeLine(ctx: CanvasRenderingContext2D, x: number, groundY: number, range: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(16,185,129,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(x, groundY - 3); ctx.lineTo(x, groundY - 20); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "rgba(16,185,129,0.6)";
    ctx.font = "10px Inter"; ctx.textAlign = "center";
    ctx.fillText(`R: ${range.toFixed(1)} m`, x, groundY - 24);
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
// ProjectileMotionEngine
// ══════════════════════════════════════════════════════════════
const ProjectileMotionEngine: React.FC<ProjectileMotionProps> = ({
    initialVelocity,
    angle,
    gravity,
    initialHeight = 0,
    simState,
    onComplete,
    onFrame,
    ballRadius = 12,
    ballColor = "#8b5cf6",
    showVelocityArrows = true,
    showGrid = true,
    showTrail = true,
    showAngleIndicator = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef(0);
    const prevTs = useRef(0);
    const simTime = useRef(0);
    const trail = useRef<{ x: number; y: number }[]>([]);
    const trailCounter = useRef(0);
    const completeFired = useRef(false);
    const [dims, setDims] = useState({ w: 600, h: 400 });

    // ── Ref mirrors for physics props (prevent stale closures) ──
    const v0Ref = useRef(initialVelocity);
    const angleRef = useRef(angle);
    const gravityRef = useRef(gravity);
    const h0Ref = useRef(initialHeight);
    const onFrameRef = useRef(onFrame);
    const onCompleteRef = useRef(onComplete);
    const simStateRef = useRef(simState);
    const ballRadiusRef = useRef(ballRadius);
    const ballColorRef = useRef(ballColor);
    const showVelocityArrowsRef = useRef(showVelocityArrows);
    const showGridRef = useRef(showGrid);
    const showTrailRef = useRef(showTrail);
    const showAngleIndicatorRef = useRef(showAngleIndicator);

    // Update refs every render — always fresh
    v0Ref.current = initialVelocity;
    angleRef.current = angle;
    gravityRef.current = gravity;
    h0Ref.current = initialHeight;
    onFrameRef.current = onFrame;
    onCompleteRef.current = onComplete;
    simStateRef.current = simState;
    ballRadiusRef.current = ballRadius;
    ballColorRef.current = ballColor;
    showVelocityArrowsRef.current = showVelocityArrows;
    showGridRef.current = showGrid;
    showTrailRef.current = showTrail;
    showAngleIndicatorRef.current = showAngleIndicator;

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

    // ── Core functions — read from refs, zero stale closures ──

    function renderFrame(t: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const v0 = v0Ref.current;
        const ang = angleRef.current;
        const g = gravityRef.current;
        const h0 = h0Ref.current;
        const bRadius = ballRadiusRef.current;
        const bColor = ballColorRef.current;

        const vx0 = physics.vx(v0, ang);
        const vy0 = physics.vy(v0, ang);
        const totalFlight = physics.flightTime(vy0, g, h0);
        const maxH = physics.maxHeight(vy0, g, h0);
        const totalRange = physics.range(vx0, totalFlight);

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        // Layout
        const margin = { top: 30, right: 30, bottom: 40, left: 55 };
        const groundY = ch - margin.bottom;
        const originX = margin.left;
        const plotW = cw - margin.left - margin.right;
        const plotH = groundY - margin.top;

        // UNIFORM SCALE
        const worldMaxX = Math.max(totalRange * 1.1, 0.1);
        const worldMaxY = Math.max(maxH * 1.15, 0.1);
        const scaleByX = plotW / worldMaxX;
        const scaleByY = plotH / worldMaxY;
        const scale = Math.min(scaleByX, scaleByY);

        // Current physics state
        const curX = physics.posX(vx0, t);
        const curY = Math.max(0, physics.posY(vy0, g, t, h0));
        const curVy = physics.velY(vy0, g, t);

        // World → canvas
        const ballCX = originX + curX * scale;
        const ballCY = groundY - curY * scale;

        // Clear + background
        ctx.clearRect(0, 0, cw, ch);
        const bg = ctx.createLinearGradient(0, 0, 0, ch);
        bg.addColorStop(0, "#f8fafc"); bg.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);

        // Grid
        if (showGridRef.current) drawGrid(ctx, originX, groundY, plotW, plotH, worldMaxX, worldMaxY, scale);

        // Max height line
        if (maxH > 0) {
            const mhY = groundY - maxH * scale;
            if (mhY >= margin.top - 5) drawMaxHeightLine(ctx, originX, plotW, mhY, maxH);
        }

        // Range mark
        if (totalRange > 0) {
            const rangeX = originX + totalRange * scale;
            if (rangeX <= originX + plotW + 5) drawRangeLine(ctx, rangeX, groundY, totalRange);
        }

        // Ground
        drawGround(ctx, cw, groundY);

        // Y-axis line
        ctx.save();
        ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 1.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(originX, margin.top - 5); ctx.lineTo(originX, groundY); ctx.stroke();
        ctx.restore();

        // Angle indicator
        if (showAngleIndicatorRef.current && ang > 0 && ang < 90) {
            drawAngleArc(ctx, originX, groundY, ang, scale, vx0, vy0);
        }

        // Trail
        if (showTrailRef.current) drawTrail(ctx, trail.current, bColor);

        // Ball
        drawBall(ctx, ballCX, ballCY, bRadius, bColor);

        // Velocity arrows
        if (showVelocityArrowsRef.current) {
            drawVelocityArrows(ctx, ballCX, ballCY, vx0, curVy, scale);
        }

        // HUD
        ctx.save();
        ctx.font = "12px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)} s`, 10, 18);
        ctx.fillText(`x = ${curX.toFixed(2)} m`, 10, 34);
        ctx.fillText(`y = ${curY.toFixed(2)} m`, 10, 50);
        const speed = Math.sqrt(vx0 * vx0 + curVy * curVy);
        ctx.fillText(`v = ${speed.toFixed(2)} m/s`, 10, 66);
        ctx.restore();

        // Axis labels
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.font = "bold 11px Inter";
        ctx.textAlign = "center";
        ctx.fillText("Distance (m)", originX + plotW / 2, ch - 4);
        ctx.save();
        ctx.translate(12, margin.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("Height (m)", 0, 0);
        ctx.restore();
        ctx.restore();

        // Fire callback
        onFrameRef.current?.({
            time: t, x: curX, y: curY, vx: vx0, vy: curVy,
            speed, maxHeight: maxH, range: totalRange,
        });
    }

    // ── Centralized lifecycle controls ──────────────────────────

    function stopSim() {
        if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = 0; }
        prevTs.current = 0;
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

        const tick = (ts: number) => {
            if (prevTs.current === 0) prevTs.current = ts;
            const dt = Math.min((ts - prevTs.current) / 1000, 0.05);
            prevTs.current = ts;
            simTime.current += dt;
            const t = simTime.current;

            // Compute flight time from refs (always fresh)
            const vx0 = physics.vx(v0Ref.current, angleRef.current);
            const vy0 = physics.vy(v0Ref.current, angleRef.current);
            const totalFlight = physics.flightTime(vy0, gravityRef.current, h0Ref.current);
            const totalRange = physics.range(vx0, totalFlight);
            const maxH = physics.maxHeight(vy0, gravityRef.current, h0Ref.current);

            // Record trail every 2 frames
            trailCounter.current++;
            if (trailCounter.current % 2 === 0) {
                const canvas = canvasRef.current;
                if (canvas) {
                    const dpr = window.devicePixelRatio || 1;
                    const cw = canvas.width / dpr;
                    const ch = canvas.height / dpr;
                    const originX = 55;
                    const groundY = ch - 40;
                    const plotW = cw - 55 - 30;
                    const plotH = groundY - 30;
                    const worldMaxX = Math.max(totalRange * 1.1, 0.1);
                    const worldMaxY = Math.max(maxH * 1.15, 0.1);
                    const s = Math.min(plotW / worldMaxX, plotH / worldMaxY);
                    const cx = physics.posX(vx0, t);
                    const cy = Math.max(0, physics.posY(vy0, gravityRef.current, t, h0Ref.current));
                    trail.current.push({ x: originX + cx * s, y: groundY - cy * s });
                    if (trail.current.length > 500) trail.current = trail.current.slice(-500);
                }
            }

            // Ground collision
            if (t >= totalFlight && totalFlight > 0) {
                simTime.current = totalFlight;
                renderFrame(totalFlight);
                if (!completeFired.current) { completeFired.current = true; onCompleteRef.current?.(); }
                rafId.current = 0;
                return;
            }

            renderFrame(t);
            rafId.current = requestAnimationFrame(tick);
        };

        rafId.current = requestAnimationFrame(tick);
    }

    // ══════════════════════════════════════════════════════════
    // STATE MACHINE
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        switch (simState) {
            case "idle": {
                resetSim();
                renderFrame(0);
                const vx0 = physics.vx(v0Ref.current, angleRef.current);
                const vy0 = physics.vy(v0Ref.current, angleRef.current);
                const maxH = physics.maxHeight(vy0, gravityRef.current, h0Ref.current);
                const totalRange = physics.range(vx0, physics.flightTime(vy0, gravityRef.current, h0Ref.current));
                onFrameRef.current?.({
                    time: 0, x: 0, y: h0Ref.current, vx: vx0, vy: vy0,
                    speed: v0Ref.current, maxHeight: maxH, range: totalRange,
                });
                break;
            }
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
    }, [initialVelocity, angle, gravity, initialHeight]);

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

export default ProjectileMotionEngine;
