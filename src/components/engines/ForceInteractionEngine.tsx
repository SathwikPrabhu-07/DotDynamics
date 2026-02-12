import React, { useRef, useEffect, useCallback, useState } from "react";
import type { SimState } from "./types";

// ── Physics Model ──────────────────────────────────────────────
// Block on incline:
//   F_parallel = m · g · sin(θ)
//   F_normal   = m · g · cos(θ)
//   F_friction = μ · F_normal
//   F_net      = F_parallel - F_friction
//   a          = F_net / m
//   x(t)       = 0.5 · a · t²
//   v(t)       = a · t
//
// Animation stops when block reaches end of incline.

interface ForceInteractionProps {
    angle?: number;              // Incline angle (degrees), default 30
    mass?: number;               // Block mass (kg), default 2
    frictionCoefficient?: number;// Kinetic friction (0-1), default 0
    gravity?: number;            // Gravity (m/s²), default 9.8
    simState: SimState;          // Animation state
    onFrame?: (data: ForceFrameData) => void;
    onComplete?: () => void;

    // Visual toggles
    showVectors?: boolean;
    showComponents?: boolean;

    // Incline length in meters
    inclineLength?: number;      // Default 10m
}

export interface ForceFrameData {
    time: number;
    displacement: number;        // distance along incline (m)
    velocity: number;            // speed along incline (m/s)
    acceleration: number;        // net accel (m/s²)
    forces: {
        weight: number;          // N
        normal: number;          // N
        friction: number;        // N
        parallel: number;        // N (gravity component)
        net: number;             // N
    };
}

// ── Helpers ────────────────────────────────────────────────────
function toRad(deg: number) { return deg * Math.PI / 180; }
function toDeg(rad: number) { return rad * 180 / Math.PI; }

function calculateForces(m: number, g: number, thetaRad: number, mu: number) {
    const weight = m * g;
    const normal = weight * Math.cos(thetaRad);
    const parallel = weight * Math.sin(thetaRad);
    // Kinetic friction only opposes motion. Max static friction is usually higher, 
    // but for simplicity we assume kinetic model once moving or if parallel > friction.
    // Actually, if parallel <= max static friction, a = 0.
    // We'll treat mu as kinetic friction coefficient.
    // If parallel < friction, block shouldn't move.

    // Let's assume static friction coeff is same as kinetic for this sim simplicity
    // or just clamp acceleration to 0 if negative.
    const maxFriction = mu * normal;
    const friction = Math.min(parallel, maxFriction); // Static friction matches parallel force up to max

    const net = parallel - friction;
    const accel = net / m;

    return { weight, normal, friction, parallel, net, accel };
}

// ── Component ──────────────────────────────────────────────────
const ForceInteractionEngine: React.FC<ForceInteractionProps> = ({
    angle = 30,
    mass = 2,
    frictionCoefficient = 0,
    gravity = 9.8,
    simState,
    onFrame,
    onComplete,
    showVectors = true,
    showComponents = true,
    inclineLength = 10,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef(0);
    const prevTs = useRef(0);
    const simTime = useRef(0);
    const [dims, setDims] = useState({ w: 800, h: 500 });

    // ── Resize Observer ──────────────────────────────────────
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

    // ── Physics Refs (avoid stale closures) ──────────────────
    const paramsRef = useRef({
        angle, mass, mu: frictionCoefficient, g: gravity,
        inclineLength, showVectors, showComponents, onFrame, onComplete
    });

    useEffect(() => {
        paramsRef.current = {
            angle, mass, mu: frictionCoefficient, g: gravity,
            inclineLength, showVectors, showComponents, onFrame, onComplete
        };
    }, [angle, mass, frictionCoefficient, gravity, inclineLength, showVectors, showComponents, onFrame, onComplete]);

    // ── Draw Arrow Helper ────────────────────────────────────
    const drawArrow = useCallback((
        ctx: CanvasRenderingContext2D,
        sx: number, sy: number,
        ex: number, ey: number,
        color: string,
        label: string,
        labelColor: string = color
    ) => {
        const headLen = 8;
        const angle = Math.atan2(ey - sy, ex - sx);

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.fill();

        // Label
        if (label) {
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.fillStyle = labelColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // Place label slightly off midpoint
            const mx = (sx + ex) / 2;
            const my = (sy + ey) / 2;
            // Offset perpendicular to line
            const perpX = Math.cos(angle - Math.PI / 2);
            const perpY = Math.sin(angle - Math.PI / 2);
            ctx.fillText(label, mx + perpX * 12, my + perpY * 12);
        }
        ctx.restore();
    }, []);

    // ── Render Frame ─────────────────────────────────────────
    const renderFrame = useCallback((t: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const {
            angle: deg, mass: m, mu, g, inclineLength: L,
            showVectors, showComponents, onFrame: reportOnFrame, onComplete: reportComplete
        } = paramsRef.current;

        const theta = toRad(deg);
        const { net, accel, weight, normal, friction, parallel } = calculateForces(m, g, theta, mu);

        // Physics State
        // Clamp time if reached end?
        // x = 0.5 * a * t^2
        let x = 0.5 * accel * t * t;
        let v = accel * t;
        let reachedEnd = false;

        if (x >= L) {
            x = L;
            // Time to reach L: t = sqrt(2L/a)
            const finalT = Math.sqrt(2 * L / Math.max(accel, 1e-9));
            if (t > finalT && accel > 0) {
                v = accel * finalT;
                // Ideally we should snap t, but for animation smoothness we just clamp x
                reachedEnd = true;
            } else if (accel <= 0) {
                // Should not happen if x reached L
            }
        }

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        // Clear
        ctx.clearRect(0, 0, cw, ch);
        const bg = ctx.createLinearGradient(0, 0, 0, ch);
        bg.addColorStop(0, "#f8fafc"); bg.addColorStop(1, "#e2e8f0");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, cw, ch);

        // ── Layout ──
        // Margin
        const margin = 60;
        // Incline drawing area
        const drawW = cw - margin * 2;
        const drawH = ch - margin * 2;

        // Scale
        // We want to fit Length L on screen.
        // Incline horizontal projection = L * cos(theta)
        // Incline vertical projection = L * sin(theta)
        // But we draw the triangle.

        // Let's fix the start point at top-left-ish
        // Actually bottom-left of the incline is at bottom-left of canvas margin.

        const groundY = ch - margin;
        const groundX = margin;

        // Determine scale to fit L within drawW / drawH
        // Max width needed: L * cos(theta) + block_padding
        // Max height needed: L * sin(theta) + block_padding
        const safetyFactor = 0.8;
        const reqW = L * Math.cos(theta);
        const reqH = L * Math.sin(theta);

        // Prevent div/0
        const scaleW = drawW / Math.max(reqW, 1);
        const scaleH = drawH / Math.max(reqH, 1);
        const scale = Math.min(scaleW, scaleH) * safetyFactor;

        const wPx = L * Math.cos(theta) * scale;
        const hPx = L * Math.sin(theta) * scale;

        // Incline Triangle coordinates
        // Tip (top): (groundX, groundY - hPx) ?? No this is a backward incline "/"
        // Usually incline goes down-right "\".
        // Top-left: (groundX, groundY - hPx)
        // Bottom-right: (groundX + wPx, groundY)
        // Bottom-left: (groundX, groundY)

        const topX = groundX;
        const topY = groundY - hPx;
        const BotX = groundX + wPx; // This is the run
        // Wait, if theta is 0, TopY = GroundY. Flat line.
        // If theta is 90, wPx = 0. Vertical wall.

        // Draw Incline
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.lineTo(BotX, groundY);
        ctx.lineTo(topX, groundY);
        ctx.closePath();
        ctx.fillStyle = "#cbd5e1";
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.stroke();

        // Draw Angle Arc
        // Draw Angle Arc
        if (deg > 5) {
            const arcR = 40;
            ctx.beginPath();
            ctx.moveTo(BotX, groundY); // Center
            // Arc from PI (Left) to PI + theta (Up-Left)
            // Canvas Y is positive down, so Up is negative Y.
            // PI is (-1, 0). PI+theta is (-cos, -sin).
            ctx.arc(BotX, groundY, arcR, Math.PI, Math.PI + theta, false);
            ctx.closePath();

            ctx.fillStyle = "rgba(100, 116, 139, 0.2)"; // Transparent slate
            ctx.fill();
            ctx.strokeStyle = "#64748b";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label Position
            // Midpoint angle = PI + theta/2
            const midAngle = Math.PI + theta / 2;
            const labelR = arcR + 15;
            const lx = BotX + labelR * Math.cos(midAngle);
            const ly = groundY + labelR * Math.sin(midAngle);

            ctx.fillStyle = "#475569";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${deg.toFixed(0)}°`, lx, ly);
        }

        // ── Draw Block (rotated)
        const blockSize = 40; // px
        // Position along incline (hypotenuse)
        const distPx = x * scale;

        // Calculate Block Center in Canvas Coords
        // Start at TopX, TopY.
        // Move distPx along vector (BotX - TopX, groundY - TopY).
        // Vector V = (wPx, hPx). Normalized? No length L*scale.
        // Direction vector u = (cos(-alpha), sin(-alpha))?
        // Let's use rotation transform.

        ctx.save();
        // Translate to start of incline (TopX, TopY)
        ctx.translate(topX, topY);
        // Rotate by theta (downward to the right).
        // Angle of incline relative to horizontal right:
        // dy = hPx, dx = wPx. Slope is positive Y (down) / positive X (right).
        // angle = atan2(hPx, wPx) = theta.
        ctx.rotate(theta);

        // Draw Block at (distPx, -blockSize/2)
        // Because Y is perpendicular normal. Incline surface is Y=0.
        // Block sits ON TOP, so Y negative (up in canvas rotated frame? No wait).
        // Rotated frame: X along incline. Y perpendicular (down-right).
        // If we rotate by theta (positive), Y axis points into the incline.
        // So "Up" from incline is negative Y.

        const bx = distPx;
        const by = -blockSize / 2;

        ctx.fillStyle = "#3b82f6"; // Blue block
        ctx.fillRect(bx - blockSize / 2, by - blockSize / 2, blockSize, blockSize);

        // Center dot
        ctx.fillStyle = "white";
        ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();

        // ── Draw Vectors (Force Arrows)
        if (showVectors) {
            const forceScale = 0.5; // pixels per Newton (heuristic)

            // 1. Friction (Opposite to velocity, i.e., -X)
            // Starts at bottom of block contact? Or center? Center is cleaner.
            if (friction > 0.01) {
                drawArrow(ctx, bx, by, bx - friction * forceScale * 5, by, "#ef4444", "f");
            }

            // 2. Parallel Gravity Component (Down incline, +X)
            if (showComponents && parallel > 0.01) {
                drawArrow(ctx, bx, by, bx + parallel * forceScale * 5, by, "#f59e0b", "mg sinθ");
            }

            // 3. Normal Force (Perpendicular up, -Y)
            drawArrow(ctx, bx, by, bx, by - normal * forceScale * 5, "#8b5cf6", "N");

            // 4. Weight (Straight down in world coords)
            // In rotated frame: angle -theta relative to current Y?
            // Gravity is vertical. Current Y is normal to incline. Current X is parallel.
            // Angle of gravity vector in rotated frame is (PI/2 - theta) + theta = PI/2?
            // Rotated frame is tilted by theta. Gravity is theta relative to Normal.
            // Gx = mg sin theta (Parallel)
            // Gy = mg cos theta (Into plane, +Y)
            // So vector is (Gx, Gy).

            if (showComponents) {
                // Draw Gy (Normal component of weight)
                // Down into the plane (+Y)
                drawArrow(ctx, bx, by, bx, by + normal * forceScale * 5, "#f59e0b", "mg cosθ", "rgba(0,0,0,0.5)");
            } else {
                // Draw full mg vector
                // (mg sin theta, mg cos theta)
                drawArrow(ctx, bx, by, bx + parallel * forceScale * 5, by + normal * forceScale * 5, "#10b981", "mg");
            }
        }

        ctx.restore();

        // ── HUD ──
        ctx.font = "12px monospace";
        ctx.fillStyle = "#334155";
        ctx.textAlign = "left";
        ctx.fillText(`t  = ${t.toFixed(2)} s`, 10, 20);
        ctx.fillText(`x  = ${x.toFixed(2)} m`, 10, 35);
        ctx.fillText(`v  = ${v.toFixed(2)} m/s`, 10, 50);
        ctx.fillText(`a  = ${accel.toFixed(2)} m/s²`, 10, 65);

        ctx.textAlign = "right";
        ctx.fillText(`F_net = ${net.toFixed(1)} N`, cw - 10, 20);
        ctx.fillText(`μ_k   = ${mu.toFixed(2)}`, cw - 10, 35);

        // Report state
        reportOnFrame?.({
            time: t,
            displacement: x,
            velocity: v,
            acceleration: accel,
            forces: { weight, normal, friction, parallel, net }
        });

        // Stop if end
        if (reachedEnd && simState === "playing") {
            reportComplete?.();
        }

    }, []);

    // ── Animation Loop ───────────────────────────────────────
    const stopLoop = useCallback(() => {
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = 0;
        prevTs.current = 0;
    }, []);

    const startLoop = useCallback(() => {
        stopLoop();
        const tick = (ts: number) => {
            if (prevTs.current === 0) prevTs.current = ts;
            const dt = Math.min((ts - prevTs.current) / 1000, 0.05);
            prevTs.current = ts;

            // Check if done
            const { inclineLength, mass, g, angle, mu } = paramsRef.current;
            const theta = toRad(angle);
            const { accel } = calculateForces(mass, g, theta, mu);
            const x = 0.5 * accel * simTime.current * simTime.current;

            if (x < inclineLength) {
                simTime.current += dt;
                renderFrame(simTime.current);
                rafId.current = requestAnimationFrame(tick);
            } else {
                // Final frame
                renderFrame(simTime.current); // Allow last render? Or better, calc final time.
                // Actually logic inside renderFrame handles clamping.
                // Just continue one more frame to ensure clamped render.
                simTime.current += dt;
                renderFrame(simTime.current);
                paramsRef.current.onComplete?.();
                stopLoop();
            }
        };
        rafId.current = requestAnimationFrame(tick);
    }, [renderFrame, stopLoop]);

    // ── State Machine ────────────────────────────────────────
    useEffect(() => {
        if (simState === "idle") {
            stopLoop();
            simTime.current = 0;
            renderFrame(0);
        } else if (simState === "playing") {
            startLoop();
        } else if (simState === "paused") {
            stopLoop();
        }
        return stopLoop;
    }, [simState, startLoop, renderFrame, stopLoop]);

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
    }, [angle, mass, frictionCoefficient, gravity, inclineLength]); // eslint-disable-line react-hooks/exhaustive-deps

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    return (
        <div ref={containerRef} className="w-full h-full relative">
            <canvas
                ref={canvasRef}
                width={dims.w * dpr}
                height={dims.h * dpr}
                style={{ width: dims.w, height: dims.h, display: "block", borderRadius: "0.5rem" }}
            />
        </div>
    );
};

export default ForceInteractionEngine;
