import { useRef, useEffect, useState } from "react";
import type { SimState } from "./types";

// ── Types ──────────────────────────────────────────────────────
export interface PulleyFrameData {
    time: number;
    h1: number;
    h2: number;
    velocity: number;
    acceleration: number;
    tension: number;
    displacement: number;
    ke1: number;
    ke2: number;
    pe1: number;
    pe2: number;
    totalEnergy: number;
}

interface PulleyEngineProps {
    mass1: number;
    mass2: number;
    gravity: number;
    simState: SimState;
    onComplete?: () => void;
    onFrame?: (values: PulleyFrameData) => void;
}

// ── Pure physics ───────────────────────────────────────────────
const computeAcceleration = (m1: number, m2: number, g: number) =>
    ((m2 - m1) * g) / (m1 + m2);

const computeTension = (m1: number, m2: number, g: number) =>
    (2 * m1 * m2 * g) / (m1 + m2);

const computeVelocity = (a: number, t: number) => a * t;

const computeDisplacement = (a: number, t: number) => 0.5 * a * t * t;

const computeFlightTime = (a: number, h0: number) => {
    if (Math.abs(a) < 1e-9) return Infinity;
    return Math.sqrt((2 * h0) / Math.abs(a));
};

// ── Color helpers ──────────────────────────────────────────────
function lighten(hex: string, n: number) {
    const c = parseInt(hex.replace("#", ""), 16);
    return `rgb(${Math.min(255, (c >> 16) + n)},${Math.min(255, ((c >> 8) & 0xff) + n)},${Math.min(255, (c & 0xff) + n)})`;
}
function darken(hex: string, n: number) {
    const c = parseInt(hex.replace("#", ""), 16);
    return `rgb(${Math.max(0, (c >> 16) - n)},${Math.max(0, ((c >> 8) & 0xff) - n)},${Math.max(0, (c & 0xff) - n)})`;
}

// ── Drawing helpers ────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#f8fafc");
    bg.addColorStop(1, "#f1f5f9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, groundY: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(100,116,139,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    ctx.strokeStyle = "rgba(100,116,139,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + 8, groundY + 10);
        ctx.stroke();
    }
    ctx.restore();
}

function drawGrid(
    ctx: CanvasRenderingContext2D, w: number, _h: number, groundY: number, scale: number, maxH: number,
) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const step = maxH > 50 ? 10 : maxH > 20 ? 5 : maxH > 5 ? 2 : 1;
    for (let m = step; m <= maxH * 1.1; m += step) {
        const y = groundY - m * scale;
        if (y < 20) break;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${m} m`, 8, y - 4);
        ctx.setLineDash([4, 4]);
    }
    ctx.restore();
}

function drawPulleyWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.save();
    ctx.fillStyle = "rgba(100,116,139,0.4)";
    ctx.fillRect(cx - r * 1.4, cy - r - 14, r * 2.8, 8);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#475569";
    ctx.fill();
    ctx.strokeStyle = "rgba(71,85,105,0.4)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * (r - 5), cy + Math.sin(angle) * (r - 5));
        ctx.stroke();
    }
    ctx.restore();
}

function drawRope(
    ctx: CanvasRenderingContext2D, pulleyCx: number, pulleyCy: number, pulleyR: number,
    leftX: number, leftMassY: number, rightX: number, rightMassY: number,
) {
    ctx.save();
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(leftX, leftMassY);
    ctx.lineTo(pulleyCx - pulleyR + 2, pulleyCy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pulleyCx, pulleyCy, pulleyR - 2, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pulleyCx + pulleyR - 2, pulleyCy);
    ctx.lineTo(rightX, rightMassY);
    ctx.stroke();
    ctx.restore();
}

function drawMassBlock(
    ctx: CanvasRenderingContext2D, cx: number, topY: number,
    blockW: number, blockH: number, color: string, label: string, massKg: number,
) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(cx - blockW / 2 + 3, topY + 3, blockW, blockH);
    const grad = ctx.createLinearGradient(cx - blockW / 2, topY, cx + blockW / 2, topY + blockH);
    grad.addColorStop(0, lighten(color, 30));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, darken(color, 20));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(cx - blockW / 2, topY, blockW, blockH, 4);
    ctx.fill();
    ctx.strokeStyle = darken(color, 40);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - blockW / 2, topY, blockW, blockH, 4);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, topY + blockH * 0.38);
    ctx.font = "11px Inter, sans-serif";
    ctx.fillText(`${massKg.toFixed(1)} kg`, cx, topY + blockH * 0.68);
    ctx.restore();
}

function drawVelocityArrow(
    ctx: CanvasRenderingContext2D, x: number, y: number, vel: number, goingUp: boolean, scale: number,
) {
    if (Math.abs(vel) < 0.05) return;
    ctx.save();
    const len = Math.min(Math.abs(vel) * scale * 0.4, 60);
    const dir = goingUp ? -1 : 1;
    const endY = y + dir * len;
    ctx.strokeStyle = goingUp ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, endY);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(x, endY);
    ctx.lineTo(x - 5, endY - dir * 8);
    ctx.lineTo(x + 5, endY - dir * 8);
    ctx.closePath();
    ctx.fill();
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${Math.abs(vel).toFixed(1)} m/s`, x + 10, (y + endY) / 2 + 4);
    ctx.restore();
}

function drawTensionLabel(ctx: CanvasRenderingContext2D, cx: number, cy: number, tension: number) {
    ctx.save();
    const text = `T = ${tension.toFixed(1)} N`;
    ctx.font = "bold 12px Inter, sans-serif";
    const metrics = ctx.measureText(text);
    const pad = 6;
    const bw = metrics.width + pad * 2;
    const bh = 20;
    ctx.fillStyle = "rgba(249,115,22,0.12)";
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(249,115,22,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 4);
    ctx.stroke();
    ctx.fillStyle = "#c2410c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, cx, cy);
    ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// PulleyEngine — Atwood Machine
// ══════════════════════════════════════════════════════════════

const INITIAL_HEIGHT = 8;
const BLOCK_W = 50;
const BLOCK_H = 44;
const PULLEY_R = 22;

const PulleyEngine: React.FC<PulleyEngineProps> = ({
    mass1,
    mass2,
    gravity,
    simState,
    onComplete,
    onFrame,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Ref mirrors for physics props (prevent stale closures) ──
    const mass1Ref = useRef(mass1);
    const mass2Ref = useRef(mass2);
    const gravityRef = useRef(gravity);
    const onFrameRef = useRef(onFrame);
    const onCompleteRef = useRef(onComplete);
    const simStateRef = useRef(simState);

    mass1Ref.current = mass1;
    mass2Ref.current = mass2;
    gravityRef.current = gravity;
    onFrameRef.current = onFrame;
    onCompleteRef.current = onComplete;
    simStateRef.current = simState;

    // ── Animation refs ──────────────────────────────────────────
    const rafId = useRef<number>(0);
    const prevTimestamp = useRef<number>(0);
    const simTime = useRef<number>(0);
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

    function buildFrame(t: number): PulleyFrameData {
        const m1 = mass1Ref.current;
        const m2 = mass2Ref.current;
        const g = gravityRef.current;
        const a = computeAcceleration(m1, m2, g);
        const T = computeTension(m1, m2, g);
        const v = computeVelocity(a, t);
        const s = computeDisplacement(a, t);
        const h1 = INITIAL_HEIGHT + s;
        const h2 = INITIAL_HEIGHT - s;
        const ke1 = 0.5 * m1 * v * v;
        const ke2 = 0.5 * m2 * v * v;
        const pe1 = m1 * g * h1;
        const pe2 = m2 * g * h2;
        return {
            time: t, h1, h2, velocity: Math.abs(v), acceleration: Math.abs(a),
            tension: T, displacement: Math.abs(s), ke1, ke2, pe1, pe2,
            totalEnergy: ke1 + ke2 + pe1 + pe2,
        };
    }

    function renderFrame(t: number) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const m1 = mass1Ref.current;
        const m2 = mass2Ref.current;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        const groundY = ch - 40;
        const maxDisplayH = INITIAL_HEIGHT * 1.25;
        const usable = groundY - 80;
        const scale = usable / maxDisplayH;

        const frame = buildFrame(t);

        const pulleyCx = cw / 2;
        const pulleyCy = 50;
        const leftX = pulleyCx - cw * 0.2;
        const rightX = pulleyCx + cw * 0.2;
        const m1BlockTop = groundY - frame.h1 * scale;
        const m2BlockTop = groundY - frame.h2 * scale;

        ctx.clearRect(0, 0, cw, ch);
        drawBackground(ctx, cw, ch);
        drawGrid(ctx, cw, ch, groundY, scale, maxDisplayH);
        drawGround(ctx, cw, groundY);
        drawRope(ctx, pulleyCx, pulleyCy, PULLEY_R, leftX, m1BlockTop, rightX, m2BlockTop);
        drawPulleyWheel(ctx, pulleyCx, pulleyCy, PULLEY_R);
        drawMassBlock(ctx, leftX, m1BlockTop, BLOCK_W, BLOCK_H, "#6366f1", "m₁", m1);
        drawMassBlock(ctx, rightX, m2BlockTop, BLOCK_W, BLOCK_H, "#ec4899", "m₂", m2);

        const m1GoingUp = m2 > m1;
        drawVelocityArrow(ctx, leftX + BLOCK_W / 2 + 8, m1BlockTop + BLOCK_H / 2, frame.velocity, m1GoingUp, scale);
        drawVelocityArrow(ctx, rightX + BLOCK_W / 2 + 8, m2BlockTop + BLOCK_H / 2, frame.velocity, !m1GoingUp, scale);
        drawTensionLabel(ctx, pulleyCx, pulleyCy + PULLEY_R + 18, frame.tension);

        // HUD
        ctx.save();
        ctx.font = "12px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.textAlign = "left";
        ctx.fillText(`t = ${t.toFixed(2)} s`, 10, 20);
        ctx.fillText(`a = ${frame.acceleration.toFixed(2)} m/s²`, 10, 36);
        ctx.fillText(`v = ${frame.velocity.toFixed(2)} m/s`, 10, 52);
        ctx.textAlign = "right";
        ctx.fillText(`h₁ = ${frame.h1.toFixed(2)} m`, cw - 10, 20);
        ctx.fillText(`h₂ = ${frame.h2.toFixed(2)} m`, cw - 10, 36);
        ctx.fillText(`s = ${frame.displacement.toFixed(2)} m`, cw - 10, 52);
        ctx.restore();

        // Energy mini-bar
        ctx.save();
        const barY = groundY + 14;
        const barMaxW = cw * 0.4;
        const initial = frame.totalEnergy > 0 ? frame.totalEnergy : 1;
        ctx.fillStyle = "rgba(239,68,68,0.6)";
        ctx.fillRect(10, barY, ((frame.ke1 + frame.ke2) / initial) * barMaxW, 6);
        ctx.fillStyle = "rgba(59,130,246,0.6)";
        ctx.fillRect(10 + ((frame.ke1 + frame.ke2) / initial) * barMaxW, barY, ((frame.pe1 + frame.pe2) / initial) * barMaxW, 6);
        ctx.font = "10px Inter, sans-serif";
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.textAlign = "left";
        ctx.fillText(`KE: ${(frame.ke1 + frame.ke2).toFixed(1)} J  PE: ${(frame.pe1 + frame.pe2).toFixed(1)} J`, 10, barY + 18);
        ctx.restore();

        onFrameRef.current?.(frame);
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

            // Flight time from current params (read from refs)
            const a = computeAcceleration(mass1Ref.current, mass2Ref.current, gravityRef.current);
            const flightTime = computeFlightTime(a, INITIAL_HEIGHT);

            if (t >= flightTime && flightTime < Infinity) {
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
    // STATE MACHINE
    // ══════════════════════════════════════════════════════════
    useEffect(() => {
        switch (simState) {
            case "idle":
                resetSim();
                renderFrame(0);
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
    }, [mass1, mass2, gravity]);

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

export default PulleyEngine;
