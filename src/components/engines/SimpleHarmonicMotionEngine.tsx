import React, { useRef, useEffect, useCallback, useState } from "react";
import type { SimState } from "./types";

// ── Physics Model ──────────────────────────────────────────────
// Simple Harmonic Motion (Mass-Spring):
//   F = -kx
//   a = - (k/m) x
//   omega = sqrt(k/m)
//   x(t) = A * cos(omega * t)   (Assuming start at max amplitude)
//   v(t) = -A * omega * sin(omega * t)
//   a(t) = -A * omega^2 * cos(omega * t)
//   Period T = 2 * PI * sqrt(m/k)

interface SHMProps {
    mass?: number;               // kg, default 1
    k?: number;                  // N/m, default 10
    amplitude?: number;          // m, default 2
    simState: SimState;
    onFrame?: (data: SHMFrameData) => void;
    onComplete?: () => void;

    // Visual toggles
    showVectors?: boolean;
    showEnergy?: boolean; // Potential vs Kinetic? (Future)
}

export interface SHMFrameData {
    time: number;
    displacement: number; // x
    velocity: number;     // v
    acceleration: number; // a
    forces: {
        restoring: number; // -kx
    };
    energy: {
        potential: number; // 0.5 k x^2
        kinetic: number;   // 0.5 m v^2
        total: number;
    };
}

// ── Helpers ────────────────────────────────────────────────────
function calculateSHM(t: number, m: number, k: number, A: number) {
    const omega = Math.sqrt(k / m);
    const x = A * Math.cos(omega * t);
    const v = -A * omega * Math.sin(omega * t);
    const a = -A * omega * omega * Math.cos(omega * t);

    const F = -k * x;
    const PE = 0.5 * k * x * x;
    const KE = 0.5 * m * v * v;

    return { x, v, a, F, PE, KE, omega };
}

// ── Component ──────────────────────────────────────────────────
const SimpleHarmonicMotionEngine: React.FC<SHMProps> = ({
    mass = 1,
    k = 10,
    amplitude = 2,
    simState,
    onFrame,
    onComplete,
    showVectors = true,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafId = useRef(0);
    const prevTs = useRef(0);
    const simTime = useRef(0);
    const [dims, setDims] = useState({ w: 800, h: 400 });

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

    // ── Physics Refs ─────────────────────────────────────────
    const paramsRef = useRef({ mass, k, amplitude, showVectors, onFrame, onComplete });
    useEffect(() => {
        paramsRef.current = { mass, k, amplitude, showVectors, onFrame, onComplete };
    }, [mass, k, amplitude, showVectors, onFrame, onComplete]);

    // ── Draw Helper: Spring ──────────────────────────────────
    const drawSpring = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, coils: number, width: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        // Angle? We assume horizontal for this engine, but generic is better.
        // Let's stick to horizontal drawing logic for simplicity in SHM.

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        // Number of segments
        const segs = coils * 2;
        const stepX = len / segs;

        for (let i = 1; i <= segs; i++) {
            const cx = x1 + i * stepX;
            // Alternating y offset
            const cy = y1 + ((i % 2 === 0) ? 0 : (i % 4 === 1 ? width : -width));
            // Actually nice zigzag is: up, down, up, down.
            // i=0 (0), i=1 (up), i=2 (0), i=3 (down), i=4 (0)
            // Let's use sine wave approx or linear zigzag
            const offset = (i % 2 === 0) ? 0 : (width * ((i % 4 === 1) ? 1 : -1));
            // Wait, standard zigzag:
            // 0 -> 1 (up) -> 2 (down) -> 3 (up) ...
            // Let's just do:
            // mid points are displaced.
            // X positions: 0, 1/N, 2/N...
            // Y positions: 0, W, -W, W, -W...
        }

        // Better Spring:
        // x1,y1 -> start
        // 10px straight
        // coils
        // 10px straight -> x2,y2

        const pad = 10;
        if (len < pad * 2) {
            ctx.lineTo(x2, y2);
            ctx.stroke();
            return;
        }

        const springL = len - pad * 2;
        const coilStep = springL / coils;

        ctx.lineTo(x1 + pad, y1);

        for (let i = 0; i < coils; i++) {
            // Each coil has a peak and a trough?
            // Usually / \ / \
            // One coil = / \
            // pt1: x + step/4, y + w
            // pt2: x + 3*step/4, y - w
            // pt3: x + step, y

            const sx = x1 + pad + i * coilStep;

            ctx.lineTo(sx + coilStep * 0.25, y1 + width);
            ctx.lineTo(sx + coilStep * 0.75, y1 - width);
            ctx.lineTo(sx + coilStep, y1);
        }

        ctx.lineTo(x2, y2);
        ctx.stroke();
    };

    // ── Draw Helper: Arrow ───────────────────────────────────
    const drawArrow = (ctx: CanvasRenderingContext2D, sx: number, sy: number, length: number, color: string, label: string) => {
        if (Math.abs(length) < 5) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;
        const endX = sx + length;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(endX, sy);
        ctx.stroke();

        // Head
        const headLen = 6;
        const dir = length > 0 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(endX, sy);
        ctx.lineTo(endX - headLen * dir, sy - headLen);
        ctx.lineTo(endX - headLen * dir, sy + headLen);
        ctx.fill();

        // Label
        ctx.font = "11px Inter";
        ctx.textAlign = "center";
        ctx.fillText(label, sx + length / 2, sy - 8);
        ctx.restore();
    };


    // ── Render ───────────────────────────────────────────────
    const renderFrame = useCallback((t: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { mass, k, amplitude, showVectors, onFrame, onComplete } = paramsRef.current;
        const res = calculateSHM(t, mass, k, amplitude);
        const { x, v, F } = res;

        // Auto-complete (SHM is infinite, so no auto-complete usually. Button to stop.)
        // But we report frame
        onFrame?.({
            time: t,
            displacement: x,
            velocity: v,
            acceleration: res.a,
            forces: { restoring: F },
            energy: { potential: res.PE, kinetic: res.KE, total: res.PE + res.KE }
        });

        const dpr = window.devicePixelRatio || 1;
        // Don't modify context transform naively if reusing?
        // Let's set it
        canvas.width = dims.w * dpr;
        canvas.height = dims.h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Restore default
        const cw = dims.w;
        const ch = dims.h;

        // Clear
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, cw, ch);

        // ── Layout ──
        // Wall on Left (x=50)
        // Equilibrium position (x=Center or specific?)
        // Let's center equilibrium at cw / 2.
        // But amplitude can be large.
        // Scale so Amplitude fills ~40% of width.

        const eqX = cw / 2;
        const groundY = ch / 2 + 50;
        const wallX = 60;

        // Scale: Max pixels for Amplitude
        const maxPx = Math.min(cw / 2 - 80, 300); // Leave room for wall and sides
        const visualScale = maxPx / Math.max(amplitude, 0.1);

        const blockX = eqX + x * visualScale;
        const blockY = ch / 2;
        const blockSize = 50;

        // Draw Wall
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(wallX - 10, groundY - 100, 10, 120);
        // Hatches
        ctx.beginPath();
        ctx.strokeStyle = "#94a3b8";
        for (let i = 0; i < 120; i += 10) {
            ctx.moveTo(wallX - 10, groundY - 100 + i);
            ctx.lineTo(wallX, groundY - 100 + i + 10);
        }
        ctx.stroke();

        // Draw Floor
        ctx.beginPath();
        ctx.strokeStyle = "#e2e8f0";
        ctx.moveTo(wallX, groundY + 20); // slightly below
        ctx.lineTo(cw, groundY + 20);
        ctx.stroke();

        // Draw Equilibrium Line (dashed)
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "#94a3b8";
        ctx.moveTo(eqX, groundY - 80);
        ctx.lineTo(eqX, groundY + 40);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px Inter";
        ctx.textAlign = "center";
        ctx.fillText("x = 0", eqX, groundY + 50);

        // Draw Spring
        ctx.save();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2;
        drawSpring(ctx, wallX, blockY, blockX - blockSize / 2, blockY, 12, 10);
        ctx.restore();

        // Draw Block
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(blockX - blockSize / 2, blockY - blockSize / 2, blockSize, blockSize);
        // Mass label
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Inter";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${mass} kg`, blockX, blockY);

        // Draw Vectors
        if (showVectors) {
            // Velocity (Green)
            const vScale = 0.5; // Visual scaling factor
            drawArrow(ctx, blockX, blockY - blockSize / 2 - 10, v * visualScale * 0.2, "#10b981", "v");

            // Force (Red)
            // F = -kx. Points towards equilibrium.
            drawArrow(ctx, blockX, blockY + blockSize / 2 + 10, F * 0.1, "#ef4444", "F");
        }

        // HUD
        ctx.font = "12px monospace";
        ctx.fillStyle = "#334155";
        ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)}s`, 10, 20);
        ctx.fillText(`x = ${x.toFixed(2)}m`, 10, 35);
        ctx.fillText(`T = ${(Math.PI * 2 * Math.sqrt(mass / k)).toFixed(2)}s`, 10, 50);

    }, [dims]);

    // ── Animation Loop ───────────────────────────────────────
    const startLoop = useCallback(() => {
        if (rafId.current) cancelAnimationFrame(rafId.current);
        const tick = (ts: number) => {
            if (prevTs.current === 0) prevTs.current = ts;
            const dt = Math.min((ts - prevTs.current) / 1000, 0.05);
            prevTs.current = ts;
            simTime.current += dt;
            renderFrame(simTime.current);
            rafId.current = requestAnimationFrame(tick);
        };
        rafId.current = requestAnimationFrame(tick);
    }, [renderFrame]);

    const stopLoop = useCallback(() => {
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = 0;
        prevTs.current = 0;
    }, []);

    useEffect(() => {
        if (simState === "playing") startLoop();
        else stopLoop();

        if (simState === "idle") {
            simTime.current = 0;
            renderFrame(0);
        }

    }, [simState, startLoop, stopLoop, renderFrame]);

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
    }, [mass, k, amplitude]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={containerRef} className="w-full h-full relative">
            <canvas ref={canvasRef} style={{ width: dims.w, height: dims.h }} />
        </div>
    );
};

export default SimpleHarmonicMotionEngine;
