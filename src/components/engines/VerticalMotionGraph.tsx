import { useRef, useEffect, useCallback, useState } from "react";

// ── Types ──────────────────────────────────────────────────────
interface DataPoint {
    t: number;
    h: number;
}

interface VerticalMotionGraphProps {
    /** Current simulation time (s) */
    time: number;
    /** Current height (m) */
    height: number;
    /** Whether the simulation is actively running */
    isPlaying: boolean;
    /** Max expected height — used for Y-axis scaling */
    maxHeight: number;
    /** Total flight time — used for X-axis scaling */
    totalTime: number;
    /** Reset signal — increment to clear the graph */
    resetKey?: number;
    /** Label for the Y axis */
    yLabel?: string;
    /** Label for the X axis */
    xLabel?: string;
}

// ── Drawing constants ──────────────────────────────────────────
const PADDING = { top: 24, right: 20, bottom: 36, left: 50 };
const CURVE_COLOR = "#6366f1";
const CURSOR_COLOR = "#ef4444";
const GRID_COLOR = "rgba(0, 0, 0, 0.06)";
const AXIS_COLOR = "rgba(0, 0, 0, 0.25)";
const LABEL_COLOR = "rgba(0, 0, 0, 0.45)";
const FONT = "11px Inter, system-ui, sans-serif";
const TITLE_FONT = "bold 12px 'Space Grotesk', Inter, sans-serif";

// ── Helpers ────────────────────────────────────────────────────

/** Compute nice grid step for an axis range */
function niceStep(range: number, targetTicks: number): number {
    const rough = range / targetTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let nice: number;
    if (norm <= 1.5) nice = 1;
    else if (norm <= 3) nice = 2;
    else if (norm <= 7) nice = 5;
    else nice = 10;
    return nice * mag;
}

/** Draw axes, gridlines, and labels */
function drawAxesAndGrid(
    ctx: CanvasRenderingContext2D,
    plotW: number,
    plotH: number,
    maxT: number,
    maxH: number,
    xLabel: string,
    yLabel: string
) {
    const x0 = PADDING.left;
    const y0 = PADDING.top;
    const x1 = x0 + plotW;
    const y1 = y0 + plotH;

    // ── Grid lines ──
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal gridlines (height axis)
    const hStep = niceStep(maxH, 5);
    for (let h = hStep; h <= maxH; h += hStep) {
        const y = y1 - (h / maxH) * plotH;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
    }

    // Vertical gridlines (time axis)
    const tStep = niceStep(maxT, 6);
    for (let t = tStep; t <= maxT; t += tStep) {
        const x = x0 + (t / maxT) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
    }
    ctx.restore();

    // ── Axes ──
    ctx.save();
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);

    // Y axis
    ctx.beginPath();
    ctx.moveTo(x0, y0 - 4);
    ctx.lineTo(x0, y1);
    ctx.stroke();

    // X axis
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x1 + 4, y1);
    ctx.stroke();
    ctx.restore();

    // ── Labels ──
    ctx.save();
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // X-axis tick labels
    for (let t = 0; t <= maxT; t += tStep) {
        const x = x0 + (t / maxT) * plotW;
        ctx.fillText(t.toFixed(1), x, y1 + 6);
    }

    // X-axis title
    ctx.font = TITLE_FONT;
    ctx.fillText(xLabel, x0 + plotW / 2, y1 + 22);

    // Y-axis tick labels
    ctx.font = FONT;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let h = 0; h <= maxH; h += hStep) {
        const y = y1 - (h / maxH) * plotH;
        ctx.fillText(h.toFixed(1), x0 - 6, y);
    }

    // Y-axis title (rotated)
    ctx.save();
    ctx.font = TITLE_FONT;
    ctx.textAlign = "center";
    ctx.translate(14, y0 + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    ctx.restore();
}

/** Draw the smooth data curve */
function drawCurve(
    ctx: CanvasRenderingContext2D,
    points: DataPoint[],
    plotW: number,
    plotH: number,
    maxT: number,
    maxH: number
) {
    if (points.length < 2) return;

    const x0 = PADDING.left;
    const y1 = PADDING.top + plotH;

    ctx.save();
    ctx.strokeStyle = CURVE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash([]);

    // Gradient fill under curve
    const gradient = ctx.createLinearGradient(0, PADDING.top, 0, y1);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.15)");
    gradient.addColorStop(1, "rgba(99, 102, 241, 0.02)");

    // Build path
    ctx.beginPath();
    const firstX = x0 + (points[0].t / maxT) * plotW;
    const firstY = y1 - (points[0].h / maxH) * plotH;
    ctx.moveTo(firstX, firstY);

    for (let i = 1; i < points.length; i++) {
        const px = x0 + (points[i].t / maxT) * plotW;
        const py = y1 - (points[i].h / maxH) * plotH;

        // Smooth curve using quadratic bezier
        if (i < points.length - 1) {
            const nextX = x0 + (points[i + 1].t / maxT) * plotW;
            const nextY = y1 - (points[i + 1].h / maxH) * plotH;
            const cpX = px;
            const cpY = py;
            const endX = (px + nextX) / 2;
            const endY = (py + nextY) / 2;
            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        } else {
            ctx.lineTo(px, py);
        }
    }

    // Stroke the curve
    ctx.stroke();

    // Fill under curve
    const lastPt = points[points.length - 1];
    const lastX = x0 + (lastPt.t / maxT) * plotW;
    ctx.lineTo(lastX, y1);
    ctx.lineTo(firstX, y1);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
}

/** Draw the current-position cursor dot */
function drawCursor(
    ctx: CanvasRenderingContext2D,
    point: DataPoint,
    plotW: number,
    plotH: number,
    maxT: number,
    maxH: number
) {
    const x0 = PADDING.left;
    const y1 = PADDING.top + plotH;

    const cx = x0 + (point.t / maxT) * plotW;
    const cy = y1 - (point.h / maxH) * plotH;

    // Dashed crosshair lines
    ctx.save();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical
    ctx.beginPath();
    ctx.moveTo(cx, PADDING.top);
    ctx.lineTo(cx, y1);
    ctx.stroke();

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(x0, cy);
    ctx.lineTo(x0 + plotW, cy);
    ctx.stroke();
    ctx.restore();

    // Outer glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = CURSOR_COLOR;
    ctx.fill();

    // White center
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.restore();

    // Value tooltip
    ctx.save();
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    const label = `(${point.t.toFixed(2)}s, ${point.h.toFixed(2)}m)`;
    const tooltipX = cx + 10;
    const tooltipY = cy - 8;
    ctx.fillText(label, tooltipX, tooltipY);
    ctx.restore();
}

// ══════════════════════════════════════════════════════════════
// VerticalMotionGraph Component
// ══════════════════════════════════════════════════════════════
const VerticalMotionGraph: React.FC<VerticalMotionGraphProps> = ({
    time,
    height,
    isPlaying,
    maxHeight,
    totalTime,
    resetKey = 0,
    yLabel = "Height (m)",
    xLabel = "Time (s)",
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pointsRef = useRef<DataPoint[]>([]);
    const lastAppendedTimeRef = useRef(-1);
    const [dimensions, setDimensions] = useState({ width: 400, height: 180 });

    // ── Resize observer ──────────────────────────────────────
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            const { width, height: h } = entries[0].contentRect;
            if (width > 0 && h > 0) {
                setDimensions({ width: Math.floor(width), height: Math.floor(h) });
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // ── Clear data on reset ──────────────────────────────────
    useEffect(() => {
        pointsRef.current = [];
        lastAppendedTimeRef.current = -1;
    }, [resetKey]);

    // ── Append new point + redraw ────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;

        // Append point (avoid duplicates — only if time advanced)
        if (time > lastAppendedTimeRef.current + 0.01) {
            pointsRef.current.push({ t: time, h: Math.max(0, height) });
            lastAppendedTimeRef.current = time;

            // Cap array
            if (pointsRef.current.length > 2000) {
                pointsRef.current = pointsRef.current.slice(-2000);
            }
        }

        // Axis ranges — use at least 1 to avoid division by zero
        const axisMaxH = Math.max(maxHeight * 1.15, 1);
        const axisMaxT = Math.max(totalTime * 1.05, 1);
        const plotW = cw - PADDING.left - PADDING.right;
        const plotH = ch - PADDING.top - PADDING.bottom;

        // ── Clear ──
        ctx.clearRect(0, 0, cw, ch);

        // ── Background ──
        ctx.fillStyle = "#fafafa";
        ctx.fillRect(0, 0, cw, ch);

        // ── Axes & grid ──
        drawAxesAndGrid(ctx, plotW, plotH, axisMaxT, axisMaxH, xLabel, yLabel);

        // ── Curve ──
        drawCurve(ctx, pointsRef.current, plotW, plotH, axisMaxT, axisMaxH);

        // ── Cursor ──
        if (pointsRef.current.length > 0) {
            const lastPt = pointsRef.current[pointsRef.current.length - 1];
            drawCursor(ctx, lastPt, plotW, plotH, axisMaxT, axisMaxH);
        }
    }, [time, height, maxHeight, totalTime]);

    // ── Redraw whenever values change ────────────────────────
    useEffect(() => {
        draw();
    }, [draw, time, height, dimensions]);

    // ── Canvas sizing for HiDPI ──────────────────────────────
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative"
            style={{ minHeight: 140 }}
        >
            <canvas
                ref={canvasRef}
                width={dimensions.width * dpr}
                height={dimensions.height * dpr}
                style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    display: "block",
                    borderRadius: "0.5rem",
                }}
            />
        </div>
    );
};

export default VerticalMotionGraph;
