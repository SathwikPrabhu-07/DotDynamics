import React, { useRef, useEffect } from "react";
import { EnergyState } from "./types";

interface EnergyGraphProps {
    time: number;
    energy: EnergyState;
    running: boolean;
    resetKey?: number;
}

const EnergyGraph: React.FC<EnergyGraphProps> = ({ time, energy, running, resetKey }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<{ t: number; ke: number; pe: number; total: number }[]>([]);
    const reqRef = useRef(0);

    // Reset history on resetKey change
    useEffect(() => {
        historyRef.current = [];
    }, [resetKey]);

    // Push data
    useEffect(() => {
        if (!running) return;
        historyRef.current.push({ t: time, ...energy });
        if (historyRef.current.length > 500) historyRef.current.shift(); // Limit buffer
    }, [time, energy, running]);

    // Drawing Loop
    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const data = historyRef.current;
        if (data.length < 2) return;

        // Auto-scale Y
        let maxY = 0;
        data.forEach(d => maxY = Math.max(maxY, d.total * 1.2));
        maxY = Math.max(maxY, 100);

        // Scale X (time window ~ 10s or 5s?)
        // Let's explicitly show the last N seconds
        const timeWindow = 10;
        const now = data[data.length - 1].t;
        const minTime = Math.max(0, now - timeWindow);
        // But if history is just array, we map t -> x.

        // Only verify 't' logic. If simulation resets t=0, history should clear.
        // If history has old t, unexpected.
        // We rely on resetKey.

        const mapX = (t: number) => {
            // Map [minTime, now] -> [0, width]
            // If total time < timeWindow, map [0, timeWindow] -> [0, width]
            const range = Math.max(now, timeWindow);
            // Better: scrolling window.
            // If t < timeWindow, x = (t / timeWindow) * width.
            // If t > timeWindow, x = ((t - (now - timeWindow)) / timeWindow) * width.

            const startT = Math.max(0, now - timeWindow);
            return ((t - startT) / timeWindow) * width;
        };

        const mapY = (e: number) => height - (e / maxY) * height;

        // Helper to draw line
        const drawLine = (key: 'ke' | 'pe' | 'total', color: string) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            let first = true;
            data.forEach(d => {
                const x = mapX(d.t);
                if (x < 0) return; // outside window
                const y = mapY(d[key]);
                if (first) { ctx.moveTo(x, y); first = false; }
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        drawLine('ke', '#22c55e'); // Green
        drawLine('pe', '#3b82f6'); // Blue
        drawLine('total', '#f97316'); // Orange

        // Draw Axis / Grid
        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${maxY.toFixed(0)}J`, width - 5, 10);
        ctx.fillText("0J", width - 5, height - 2);
    };

    // Animation Loop
    useEffect(() => {
        const tick = () => {
            draw();
            reqRef.current = requestAnimationFrame(tick);
        };
        reqRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(reqRef.current);
    }, []);

    return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default EnergyGraph;
