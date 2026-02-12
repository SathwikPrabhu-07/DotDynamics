import React, { useRef, useEffect, useCallback } from "react";
import {
    RecordedFrame,
    RecordedRun,
    CurveKey,
    CURVE_COLORS,
    CURVE_LABELS,
    CURVE_UNITS,
    getFrameValue,
} from "./types";

// ── Constants ──────────────────────────────────────────────────
const PAD = { top: 32, right: 24, bottom: 40, left: 56 };
const GRID_COLOR = "#e2e8f0";
const AXIS_COLOR = "#94a3b8";
const MARKER_COLOR = "#334155";
const FONT_TICK = "10px 'Inter', 'Space Grotesk', monospace";
const FONT_LABEL = "bold 11px 'Inter', 'Space Grotesk', sans-serif";
const FONT_LEGEND = "11px 'Inter', 'Space Grotesk', sans-serif";
const BG_COLOR = "#ffffff";

// ── Helpers ────────────────────────────────────────────────────
function niceStep(range: number, targetTicks: number): number {
    if (range <= 0) return 1;
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step: number;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    return step * mag;
}

function formatNum(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1000) return n.toFixed(0);
    if (abs >= 100) return n.toFixed(0);
    if (abs >= 10) return n.toFixed(1);
    if (abs >= 1) return n.toFixed(2);
    return n.toFixed(3);
}

// ── Props ──────────────────────────────────────────────────────
interface AdvancedGraphProps {
    frames: RecordedFrame[];
    currentTime: number;
    activeCurves: Set<CurveKey>;
    savedRuns?: RecordedRun[];
    height?: number;
}

// ── Component ──────────────────────────────────────────────────
const AdvancedGraph: React.FC<AdvancedGraphProps> = ({
    frames,
    currentTime,
    activeCurves,
    savedRuns = [],
    height = 260,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const sizeRef = useRef({ w: 600, h: height });

    // ── Resize observer ──────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                if (width > 0) {
                    sizeRef.current = { w: width, h: height };
                }
            }
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, [height]);

    // ── Draw function ────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const { w, h } = sizeRef.current;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        const plotW = w - PAD.left - PAD.right;
        const plotH = h - PAD.top - PAD.bottom;

        if (plotW < 20 || plotH < 20) return;

        // Compute X range
        let maxTime = 1;
        if (frames.length > 0) maxTime = Math.max(maxTime, frames[frames.length - 1].time * 1.05);
        savedRuns.forEach((run) => {
            if (run.frames.length > 0)
                maxTime = Math.max(maxTime, run.frames[run.frames.length - 1].time * 1.05);
        });

        // Compute Y range across all active curves
        let minY = 0;
        let maxY = 1;
        const activeKeys = Array.from(activeCurves);

        const updateRange = (f: RecordedFrame) => {
            for (const key of activeKeys) {
                const v = getFrameValue(f, key);
                if (v < minY) minY = v;
                if (v > maxY) maxY = v;
            }
        };

        frames.forEach(updateRange);
        savedRuns.forEach((run) => run.frames.forEach(updateRange));

        // Add padding to Y range
        const yRange = maxY - minY || 1;
        maxY += yRange * 0.1;
        if (minY < 0) minY -= yRange * 0.05;
        else minY = Math.min(0, minY); // Keep 0 in view

        // Map functions
        const mapX = (t: number) => PAD.left + (t / maxTime) * plotW;
        const mapY = (v: number) => PAD.top + plotH - ((v - minY) / (maxY - minY)) * plotH;

        // ── Grid ─────────────────────────────────────────────
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;

        // X gridlines
        const xStep = niceStep(maxTime, 6);
        for (let t = 0; t <= maxTime; t += xStep) {
            const x = mapX(t);
            ctx.beginPath();
            ctx.moveTo(x, PAD.top);
            ctx.lineTo(x, PAD.top + plotH);
            ctx.stroke();
        }

        // Y gridlines
        const yStep = niceStep(maxY - minY, 5);
        const yStart = Math.ceil(minY / yStep) * yStep;
        for (let v = yStart; v <= maxY; v += yStep) {
            const y = mapY(v);
            ctx.beginPath();
            ctx.moveTo(PAD.left, y);
            ctx.lineTo(PAD.left + plotW, y);
            ctx.stroke();
        }

        // ── Axes ─────────────────────────────────────────────
        ctx.strokeStyle = AXIS_COLOR;
        ctx.lineWidth = 1;
        // X axis
        ctx.beginPath();
        ctx.moveTo(PAD.left, PAD.top + plotH);
        ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
        ctx.stroke();
        // Y axis
        ctx.beginPath();
        ctx.moveTo(PAD.left, PAD.top);
        ctx.lineTo(PAD.left, PAD.top + plotH);
        ctx.stroke();

        // ── Tick labels ──────────────────────────────────────
        ctx.fillStyle = AXIS_COLOR;
        ctx.font = FONT_TICK;

        // X ticks
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        for (let t = 0; t <= maxTime; t += xStep) {
            const x = mapX(t);
            ctx.fillText(`${formatNum(t)}`, x, PAD.top + plotH + 4);
        }

        // Y ticks
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let v = yStart; v <= maxY; v += yStep) {
            const y = mapY(v);
            ctx.fillText(`${formatNum(v)}`, PAD.left - 6, y);
        }

        // ── Axis labels ──────────────────────────────────────
        ctx.fillStyle = "#475569";
        ctx.font = FONT_LABEL;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("Time (s)", PAD.left + plotW / 2, h - 14);

        // Y label (rotated)
        if (activeKeys.length === 1) {
            ctx.save();
            const yLabelText = `${CURVE_LABELS[activeKeys[0]]} (${CURVE_UNITS[activeKeys[0]]})`;
            ctx.translate(14, PAD.top + plotH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textBaseline = "middle";
            ctx.fillText(yLabelText, 0, 0);
            ctx.restore();
        } else if (activeKeys.length > 1) {
            ctx.save();
            ctx.translate(14, PAD.top + plotH / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textBaseline = "middle";
            ctx.fillText("Value", 0, 0);
            ctx.restore();
        }

        // ── Draw helper ──────────────────────────────────────
        const drawCurve = (
            data: RecordedFrame[],
            key: CurveKey,
            color: string,
            lineWidth: number,
            dash: number[] = []
        ) => {
            if (data.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash(dash);
            let started = false;
            for (let i = 0; i < data.length; i++) {
                const x = mapX(data[i].time);
                const y = mapY(getFrameValue(data[i], key));
                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);
        };

        // ── Saved runs (dashed) ──────────────────────────────
        savedRuns.forEach((run) => {
            for (const key of activeKeys) {
                drawCurve(run.frames, key, CURVE_COLORS[key] + "99", 1.5, [6, 3]);
            }
        });

        // ── Current run (solid) ──────────────────────────────
        for (const key of activeKeys) {
            drawCurve(frames, key, CURVE_COLORS[key], 2);
        }

        // ── Time marker ──────────────────────────────────────
        if (frames.length > 0 && currentTime > 0) {
            const mx = mapX(currentTime);
            if (mx >= PAD.left && mx <= PAD.left + plotW) {
                // Vertical line
                ctx.strokeStyle = MARKER_COLOR;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(mx, PAD.top);
                ctx.lineTo(mx, PAD.top + plotH);
                ctx.stroke();
                ctx.setLineDash([]);

                // Dots on each curve at currentTime
                // Find closest frame
                let closest = frames[0];
                let minDiff = Math.abs(frames[0].time - currentTime);
                for (let i = 1; i < frames.length; i++) {
                    const diff = Math.abs(frames[i].time - currentTime);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = frames[i];
                    }
                }

                for (const key of activeKeys) {
                    const val = getFrameValue(closest, key);
                    const dy = mapY(val);
                    ctx.beginPath();
                    ctx.arc(mx, dy, 4, 0, Math.PI * 2);
                    ctx.fillStyle = CURVE_COLORS[key];
                    ctx.fill();
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }
        }

        // ── Legend ────────────────────────────────────────────
        if (activeKeys.length > 0) {
            ctx.font = FONT_LEGEND;
            const legendX = PAD.left + 8;
            let legendY = PAD.top + 4;
            const lineH = 16;

            // Current run label
            for (const key of activeKeys) {
                ctx.fillStyle = CURVE_COLORS[key];
                ctx.fillRect(legendX, legendY + 3, 12, 3);
                ctx.fillStyle = "#334155";
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                ctx.fillText(CURVE_LABELS[key], legendX + 18, legendY);
                legendY += lineH;
            }

            // Saved runs
            savedRuns.forEach((run) => {
                ctx.fillStyle = AXIS_COLOR;
                ctx.setLineDash([4, 2]);
                ctx.strokeStyle = AXIS_COLOR;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(legendX, legendY + 5);
                ctx.lineTo(legendX + 12, legendY + 5);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = "#64748b";
                ctx.fillText(run.label, legendX + 18, legendY);
                legendY += lineH;
            });
        }
    }, [frames, currentTime, activeCurves, savedRuns]);

    // ── Animation loop ───────────────────────────────────────
    useEffect(() => {
        const tick = () => {
            draw();
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [draw]);

    return (
        <div ref={containerRef} className="w-full" style={{ height }}>
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                style={{ imageRendering: "auto" }}
            />
        </div>
    );
};

export default AdvancedGraph;
