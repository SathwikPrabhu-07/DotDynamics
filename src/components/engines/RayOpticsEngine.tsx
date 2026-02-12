import { useRef, useEffect, useState } from "react";
import type { SimState } from "./types";

// ── Optics Mode Types ──────────────────────────────────────────
export type OpticsMode =
    | "plane"
    | "concave_mirror"
    | "convex_mirror"
    | "convex_lens"
    | "concave_lens";

// ── Optics Geometry Module (pure functions) ────────────────────

const optics = {
    /**
     * Mirror equation: 1/f = 1/v + 1/u
     * Sign convention: u = -|u| (real object), f +ve concave, -ve convex
     */
    mirrorEquation(f: number, u: number): { v: number; m: number; imageType: "real" | "virtual" | "none" } {
        if (Math.abs(u) < 0.001) return { v: Infinity, m: Infinity, imageType: "none" };
        const uSigned = -Math.abs(u);
        const denom = (1 / f) - (1 / uSigned);
        if (Math.abs(denom) < 1e-9) return { v: Infinity, m: Infinity, imageType: "none" };
        const v = 1 / denom;
        const m = -v / uSigned;
        return { v, m, imageType: v < 0 ? "virtual" : "real" };
    },

    /**
     * Lens equation: 1/f = 1/v - 1/u
     * Sign convention: u = -|u| (real object on left)
     *   Convex lens: f > 0,  Concave lens: f < 0
     *   v > 0 → real image (right side), v < 0 → virtual (left side)
     */
    lensEquation(f: number, u: number): { v: number; m: number; imageType: "real" | "virtual" | "none" } {
        if (Math.abs(u) < 0.001) return { v: Infinity, m: Infinity, imageType: "none" };
        const uSigned = -Math.abs(u);
        // 1/v = 1/f + 1/u  (from 1/f = 1/v - 1/u → 1/v = 1/f + 1/u)
        const denom = (1 / f) + (1 / uSigned);
        if (Math.abs(denom) < 1e-9) return { v: Infinity, m: Infinity, imageType: "none" };
        const v = 1 / denom;
        const m = v / uSigned;
        return { v, m, imageType: v > 0 ? "real" : "virtual" };
    },

    /** Plane mirror: virtual, same size, same distance behind */
    planeMirror(u: number): { v: number; m: number; imageType: "virtual" } {
        return { v: -u, m: 1, imageType: "virtual" };
    },
};

// ── Color Constants ────────────────────────────────────────────
const COLORS = {
    incident: "#3b82f6",     // blue
    reflected: "#ef4444",    // red  (also refracted for lenses)
    refracted: "#ef4444",    // red
    virtualRay: "#ef4444",   // red (dashed)
    normal: "#94a3b8",       // gray
    axis: "#64748b",         // slate
    object: "#6366f1",       // indigo
    image: "#22c55e",        // green
    focus: "#eab308",        // yellow
    mirror: "#1e293b",       // dark slate
    lens: "#7c3aed",         // violet for lens
    construction: "#d1d5db", // light gray
    graphLine: "#6366f1",
    graphGrid: "#e2e8f0",
};

// ── Drawing Helpers ────────────────────────────────────────────

function drawArrow(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    color: string,
    headLen = 8,
    lineWidth = 2,
    dashed = false
) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    if (dashed) ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawDashedLine(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    color: string,
    lineWidth = 1.5
) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    color: string,
    align: CanvasTextAlign = "center",
    fontSize = 11
) {
    ctx.save();
    ctx.font = `bold ${fontSize}px 'Space Grotesk', Inter, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawAngleArc(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    startAngle: number, endAngle: number,
    radius: number,
    color: string,
    label?: string
) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, startAngle > endAngle);
    ctx.stroke();
    if (label) {
        const mid = (startAngle + endAngle) / 2;
        ctx.font = "10px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx + (radius + 12) * Math.cos(mid), cy + (radius + 12) * Math.sin(mid));
    }
    ctx.restore();
}

function drawObjectArrow(
    ctx: CanvasRenderingContext2D,
    x: number, axisY: number,
    height: number, color: string, label: string
) {
    drawArrow(ctx, x, axisY, x, axisY - height, color, 8, 2.5);
    drawLabel(ctx, label, x, axisY + 14, color, "center", 11);
}

function drawPoint(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    color: string,
    label: string,
    labelOffsetY = 16
) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, label, x, y + labelOffsetY, color, "center", 10);
}

// ── Mirror Surface Drawing ─────────────────────────────────────

function drawPlaneMirror(ctx: CanvasRenderingContext2D, poleX: number, axisY: number, mirrorHalfH: number) {
    ctx.save();
    ctx.strokeStyle = COLORS.mirror;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(poleX, axisY - mirrorHalfH);
    ctx.lineTo(poleX, axisY + mirrorHalfH);
    ctx.stroke();
    ctx.strokeStyle = "rgba(30,41,59,0.3)";
    ctx.lineWidth = 1;
    for (let y = axisY - mirrorHalfH; y <= axisY + mirrorHalfH; y += 8) {
        ctx.beginPath();
        ctx.moveTo(poleX + 2, y);
        ctx.lineTo(poleX + 10, y - 6);
        ctx.stroke();
    }
    ctx.restore();
}

function drawCurvedMirror(
    ctx: CanvasRenderingContext2D,
    poleX: number, axisY: number, R: number, mirrorHalfH: number, isConcave: boolean
) {
    ctx.save();
    const arcCenterX = isConcave ? poleX - R : poleX + R;
    const halfAngle = Math.asin(Math.min(mirrorHalfH / R, 0.95));
    ctx.strokeStyle = COLORS.mirror;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (isConcave) ctx.arc(arcCenterX, axisY, R, -halfAngle, halfAngle);
    else ctx.arc(arcCenterX, axisY, R, Math.PI - halfAngle, Math.PI + halfAngle);
    ctx.stroke();
    ctx.strokeStyle = "rgba(30,41,59,0.25)";
    ctx.lineWidth = 1;
    const steps = 12;
    for (let i = -steps; i <= steps; i++) {
        const a = (i / steps) * halfAngle;
        let sx: number, sy: number, ex: number, ey: number;
        if (isConcave) {
            sx = arcCenterX + R * Math.cos(a);
            sy = axisY + R * Math.sin(a);
            ex = sx + 8 * Math.cos(a);
            ey = sy + 8 * Math.sin(a);
        } else {
            sx = arcCenterX + R * Math.cos(Math.PI + a);
            sy = axisY + R * Math.sin(Math.PI + a);
            ex = sx - 8 * Math.cos(a);
            ey = sy - 8 * Math.sin(a);
        }
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    ctx.restore();
}

// ── Lens Surface Drawing ───────────────────────────────────────

function drawConvexLens(ctx: CanvasRenderingContext2D, centerX: number, axisY: number, halfH: number) {
    ctx.save();
    const bulge = halfH * 0.35;

    // Gradient fill
    const grad = ctx.createLinearGradient(centerX - bulge, axisY, centerX + bulge, axisY);
    grad.addColorStop(0, "rgba(124,58,237,0.08)");
    grad.addColorStop(0.5, "rgba(124,58,237,0.18)");
    grad.addColorStop(1, "rgba(124,58,237,0.08)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    // Left convex surface
    ctx.moveTo(centerX, axisY - halfH);
    ctx.quadraticCurveTo(centerX - bulge, axisY, centerX, axisY + halfH);
    // Right convex surface
    ctx.quadraticCurveTo(centerX + bulge, axisY, centerX, axisY - halfH);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = COLORS.lens;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, axisY - halfH);
    ctx.quadraticCurveTo(centerX - bulge, axisY, centerX, axisY + halfH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, axisY - halfH);
    ctx.quadraticCurveTo(centerX + bulge, axisY, centerX, axisY + halfH);
    ctx.stroke();

    // Top/bottom arrowheads (converging indicator)
    const arrowLen = 6;
    ctx.fillStyle = COLORS.lens;
    // Top
    ctx.beginPath();
    ctx.moveTo(centerX, axisY - halfH);
    ctx.lineTo(centerX - arrowLen, axisY - halfH + arrowLen);
    ctx.lineTo(centerX + arrowLen, axisY - halfH + arrowLen);
    ctx.closePath();
    ctx.fill();
    // Bottom
    ctx.beginPath();
    ctx.moveTo(centerX, axisY + halfH);
    ctx.lineTo(centerX - arrowLen, axisY + halfH - arrowLen);
    ctx.lineTo(centerX + arrowLen, axisY + halfH - arrowLen);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawConcaveLens(ctx: CanvasRenderingContext2D, centerX: number, axisY: number, halfH: number) {
    ctx.save();
    const indent = halfH * 0.25;
    const edgeW = halfH * 0.12;

    // Fill
    const grad = ctx.createLinearGradient(centerX - edgeW - indent, axisY, centerX + edgeW + indent, axisY);
    grad.addColorStop(0, "rgba(124,58,237,0.12)");
    grad.addColorStop(0.5, "rgba(124,58,237,0.04)");
    grad.addColorStop(1, "rgba(124,58,237,0.12)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(centerX - edgeW, axisY - halfH);
    ctx.quadraticCurveTo(centerX + indent, axisY, centerX - edgeW, axisY + halfH);
    ctx.lineTo(centerX + edgeW, axisY + halfH);
    ctx.quadraticCurveTo(centerX - indent, axisY, centerX + edgeW, axisY - halfH);
    ctx.closePath();
    ctx.fill();

    // Left concave surface
    ctx.strokeStyle = COLORS.lens;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - edgeW, axisY - halfH);
    ctx.quadraticCurveTo(centerX + indent, axisY, centerX - edgeW, axisY + halfH);
    ctx.stroke();

    // Right concave surface
    ctx.beginPath();
    ctx.moveTo(centerX + edgeW, axisY - halfH);
    ctx.quadraticCurveTo(centerX - indent, axisY, centerX + edgeW, axisY + halfH);
    ctx.stroke();

    // Top/bottom edges
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - edgeW, axisY - halfH);
    ctx.lineTo(centerX + edgeW, axisY - halfH);
    ctx.moveTo(centerX - edgeW, axisY + halfH);
    ctx.lineTo(centerX + edgeW, axisY + halfH);
    ctx.stroke();

    // Diverging arrows (outward pointing)
    const arrowLen = 6;
    ctx.fillStyle = COLORS.lens;
    // Top left
    ctx.beginPath();
    ctx.moveTo(centerX - edgeW, axisY - halfH);
    ctx.lineTo(centerX - edgeW + arrowLen, axisY - halfH + arrowLen);
    ctx.lineTo(centerX - edgeW - arrowLen, axisY - halfH + arrowLen);
    ctx.closePath(); ctx.fill();
    // Top right
    ctx.beginPath();
    ctx.moveTo(centerX + edgeW, axisY - halfH);
    ctx.lineTo(centerX + edgeW + arrowLen, axisY - halfH + arrowLen);
    ctx.lineTo(centerX + edgeW - arrowLen, axisY - halfH + arrowLen);
    ctx.closePath(); ctx.fill();

    ctx.restore();
}

// ── Mini Graph ─────────────────────────────────────────────────

function drawMiniGraph(
    ctx: CanvasRenderingContext2D,
    gx: number, gy: number, gw: number, gh: number,
    f: number, currentU: number,
    mode: OpticsMode
) {
    ctx.save();
    ctx.fillStyle = "rgba(248,250,252,0.92)";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, gh, 6);
    ctx.fill();
    ctx.stroke();

    const pad = 28;
    const plotX = gx + pad;
    const plotY = gy + pad - 4;
    const plotW = gw - pad * 1.8;
    const plotH = gh - pad * 1.8;

    const isLens = mode === "convex_lens" || mode === "concave_lens";
    const title = isLens ? "v vs u (Lens Equation)" : "v vs u (Mirror Equation)";
    ctx.font = "bold 10px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.fillText(title, gx + gw / 2, gy + 14);

    if (mode === "plane") {
        ctx.strokeStyle = COLORS.graphLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plotX, plotY + plotH);
        ctx.lineTo(plotX + plotW, plotY);
        ctx.stroke();
        ctx.font = "9px 'Space Grotesk', Inter, sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("v = -u (always virtual)", gx + gw / 2, gy + gh - 6);
        ctx.restore();
        return;
    }

    // Grid
    ctx.strokeStyle = COLORS.graphGrid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        const x = plotX + (plotW * i) / 4;
        const y = plotY + (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x, plotY); ctx.lineTo(x, plotY + plotH);
        ctx.moveTo(plotX, y); ctx.lineTo(plotX + plotW, y);
        ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotX, plotY + plotH); ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.moveTo(plotX, plotY); ctx.lineTo(plotX, plotY + plotH);
    ctx.stroke();
    ctx.font = "9px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("u", plotX + plotW + 10, plotY + plotH + 2);
    ctx.textAlign = "right";
    ctx.fillText("v", plotX - 6, plotY - 2);

    const uMax = Math.abs(f) * 5;
    const vRange = Math.abs(f) * 5;
    const toScreenX = (u: number) => plotX + (u / uMax) * plotW;
    const toScreenY = (v: number) => plotY + plotH - ((v + vRange) / (2 * vRange)) * plotH;

    // Zero line
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(plotX, toScreenY(0));
    ctx.lineTo(plotX + plotW, toScreenY(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve
    const equationFn = isLens ? optics.lensEquation : optics.mirrorEquation;
    ctx.strokeStyle = COLORS.graphLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= plotW; px += 1) {
        const u = (px / plotW) * uMax;
        if (u < 0.5) continue;
        const { v } = equationFn(f, u);
        if (!isFinite(v) || Math.abs(v) > vRange * 2) { started = false; continue; }
        const sx = toScreenX(u);
        const sy = toScreenY(v);
        if (sy < plotY || sy > plotY + plotH) { started = false; continue; }
        if (!started) { ctx.moveTo(sx, sy); started = true; }
        else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Current point
    if (currentU > 0) {
        const result = equationFn(f, currentU);
        if (isFinite(result.v) && Math.abs(result.v) < vRange * 2) {
            const mx = toScreenX(currentU);
            const my = toScreenY(result.v);
            if (my >= plotY && my <= plotY + plotH) {
                ctx.fillStyle = "#ef4444";
                ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
            }
        }
    }

    ctx.font = "9px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText(`f = ${f.toFixed(1)} cm`, gx + gw / 2, gy + gh - 6);
    ctx.restore();
}

// ── Shared background + axis ───────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number, axisY: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, "#f8fafc");
    bg.addColorStop(1, "#f1f5f9");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // Optical axis
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, axisY);
    ctx.lineTo(cw - 20, axisY);
    ctx.stroke();
    ctx.setLineDash([]);
}

// ══════════════════════════════════════════════════════════════
// RENDER FUNCTIONS  — ONE PER MODE
// ══════════════════════════════════════════════════════════════

function renderPlaneMirror(
    ctx: CanvasRenderingContext2D, cw: number, ch: number,
    objectDist: number, objectHeight: number,
    showNormals: boolean, showAngles: boolean, showConstruction: boolean
) {
    const axisY = ch * 0.55;
    const poleX = cw * 0.55;
    const scale = Math.min(cw, ch) / 80;
    const mirrorHalfH = ch * 0.35;
    drawBackground(ctx, cw, ch, axisY);
    drawPlaneMirror(ctx, poleX, axisY, mirrorHalfH);
    drawLabel(ctx, "P", poleX, axisY + 16, COLORS.mirror, "center", 10);

    const objX = poleX - objectDist * scale;
    const objH = objectHeight * scale;
    drawObjectArrow(ctx, objX, axisY, objH, COLORS.object, "Object");

    const result = optics.planeMirror(objectDist);
    const imgX = poleX + objectDist * scale;
    drawObjectArrow(ctx, imgX, axisY, objH, COLORS.image, "Image (virtual)");

    const hitY = axisY - objH * 0.3;
    drawArrow(ctx, objX, axisY - objH, poleX, hitY, COLORS.incident, 7, 2);

    if (showNormals) {
        drawDashedLine(ctx, poleX, hitY - 25, poleX, hitY + 25, COLORS.normal, 1);
        drawLabel(ctx, "N", poleX + 3, hitY - 30, COLORS.normal, "left", 9);
    }

    const reflectedEndX = poleX + (poleX - objX) * 0.8;
    const reflectedEndY = hitY - (axisY - objH - hitY) * 0.8;
    drawArrow(ctx, poleX, hitY, reflectedEndX, reflectedEndY, COLORS.reflected, 7, 2);
    drawArrow(ctx, objX, axisY, poleX, axisY, COLORS.incident, 6, 1.5);
    drawArrow(ctx, poleX, axisY, poleX - (poleX - objX) * 0.3, axisY, COLORS.reflected, 6, 1.5);

    if (showConstruction) {
        drawDashedLine(ctx, poleX, hitY, imgX, axisY - objH, COLORS.virtualRay, 1.5);
        drawDashedLine(ctx, poleX, axisY, imgX, axisY, COLORS.virtualRay, 1.5);
    }

    if (showAngles) {
        const normalAngle = Math.PI;
        const iAngle = Math.atan2((axisY - objH) - hitY, objX - poleX);
        const incAngleDeg = Math.abs(iAngle - normalAngle) * 180 / Math.PI;
        drawAngleArc(ctx, poleX, hitY, normalAngle, iAngle, 20, COLORS.incident, `θᵢ=${incAngleDeg.toFixed(0)}°`);
    }

    // HUD
    ctx.save();
    ctx.font = "11px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.textAlign = "left";
    ctx.fillText(`Plane Mirror`, 10, 18);
    ctx.fillText(`u = ${objectDist.toFixed(1)} cm`, 10, 34);
    ctx.fillText(`v = ${Math.abs(result.v).toFixed(1)} cm (virtual)`, 10, 50);
    ctx.fillText(`m = ${result.m.toFixed(2)} (erect, same size)`, 10, 66);
    ctx.restore();

    drawMiniGraph(ctx, cw - 190, ch - 160, 178, 148, 0, objectDist, "plane");
}

function renderCurvedMirror(
    ctx: CanvasRenderingContext2D, cw: number, ch: number,
    f: number, objectDist: number, objectHeight: number,
    isConcave: boolean,
    showNormals: boolean, _showAngles: boolean, showConstruction: boolean
) {
    const axisY = ch * 0.55;
    const poleX = cw * 0.6;
    const scale = Math.min(cw, ch) / 90;
    const R = Math.abs(f) * 2;
    const mirrorHalfH = ch * 0.32;
    const fSigned = isConcave ? Math.abs(f) : -Math.abs(f);
    const focalX = poleX - fSigned * scale;
    const centerX = poleX - fSigned * 2 * scale;

    drawBackground(ctx, cw, ch, axisY);
    drawCurvedMirror(ctx, poleX, axisY, R * scale, mirrorHalfH, isConcave);
    drawPoint(ctx, poleX, axisY, COLORS.mirror, "P");
    drawPoint(ctx, focalX, axisY, COLORS.focus, "F");
    drawPoint(ctx, centerX, axisY, COLORS.focus, "C");

    const objX = poleX - objectDist * scale;
    const objH = objectHeight * scale;
    if (objX > 30 && objX < cw - 30) drawObjectArrow(ctx, objX, axisY, objH, COLORS.object, "Object");

    const result = optics.mirrorEquation(fSigned, objectDist);
    const v = result.v;
    const m = result.m;
    const imgH = Math.abs(m) * objH;
    const isVirtual = result.imageType === "virtual";
    const imgX = isFinite(v) ? poleX - v * scale : -999;

    // Principal rays
    if (objX > 30) {
        const hitY1 = axisY - objH;
        drawArrow(ctx, objX, axisY - objH, poleX, hitY1, COLORS.incident, 6, 2);
        if (isConcave) {
            const dx = focalX - poleX, dy = axisY - hitY1;
            drawArrow(ctx, poleX, hitY1, poleX + dx * 2.5, hitY1 + dy * 2.5, COLORS.reflected, 6, 2);
        } else {
            const dx = poleX - focalX, dy = hitY1 - axisY;
            drawArrow(ctx, poleX, hitY1, poleX - dx * 0.6, hitY1 - dy * 2, COLORS.reflected, 6, 2);
            if (showConstruction) drawDashedLine(ctx, poleX, hitY1, focalX, axisY, COLORS.virtualRay, 1.5);
        }

        if (isConcave) {
            const hitY2 = (axisY - objH) + objH * Math.abs((poleX - objX) / (focalX - objX + 0.001)) * 0.5;
            drawArrow(ctx, objX, axisY - objH, poleX, hitY2, COLORS.incident, 6, 1.5);
            drawArrow(ctx, poleX, hitY2, poleX - cw * 0.3, hitY2, COLORS.reflected, 6, 1.5);
        } else {
            const hitY2 = axisY - objH * 0.5;
            drawArrow(ctx, objX, axisY - objH, poleX, hitY2, COLORS.incident, 6, 1.5);
            drawArrow(ctx, poleX, hitY2, 20, hitY2, COLORS.reflected, 6, 1.5);
            if (showConstruction) drawDashedLine(ctx, poleX, hitY2, focalX, axisY, COLORS.virtualRay, 1.5);
        }
    }

    if (isFinite(v) && Math.abs(v) < 200 && imgX > 10 && imgX < cw - 10) {
        const imgDir = m > 0 ? 1 : -1;
        drawObjectArrow(ctx, imgX, axisY, imgH * imgDir, COLORS.image, isVirtual ? "Image (virtual)" : "Image (real)");
    }

    if (showNormals) drawDashedLine(ctx, poleX - 20, axisY, poleX + 20, axisY, COLORS.normal, 1);

    // HUD
    ctx.save();
    ctx.font = "11px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.textAlign = "left";
    ctx.fillText(`${isConcave ? "Concave" : "Convex"} Mirror`, 10, 18);
    ctx.fillText(`f = ${fSigned.toFixed(1)} cm   R = ${(fSigned * 2).toFixed(1)} cm`, 10, 34);
    ctx.fillText(`u = ${objectDist.toFixed(1)} cm`, 10, 50);
    if (isFinite(v)) {
        ctx.fillText(`v = ${v.toFixed(1)} cm (${result.imageType})`, 10, 66);
        ctx.fillText(`m = ${m.toFixed(2)} (${m > 0 ? "erect" : "inverted"}, ${Math.abs(m) > 1 ? "magnified" : Math.abs(m) < 1 ? "diminished" : "same size"})`, 10, 82);
    } else {
        ctx.fillText(`v = ∞ (image at infinity)`, 10, 66);
    }
    ctx.restore();
    ctx.save();
    ctx.font = "10px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.textAlign = "left";
    ctx.fillText("1/f = 1/v + 1/u", 10, ch - 22);
    ctx.fillText("m = -v/u = hᵢ/hₒ", 10, ch - 8);
    ctx.restore();

    drawMiniGraph(ctx, cw - 190, ch - 160, 178, 148, fSigned, objectDist, isConcave ? "concave_mirror" : "convex_mirror");
}

// ══════════════════════════════════════════════════════════════
// LENS RENDERERS
// ══════════════════════════════════════════════════════════════

function renderLens(
    ctx: CanvasRenderingContext2D, cw: number, ch: number,
    f: number, objectDist: number, objectHeight: number,
    isConvex: boolean,
    showNormals: boolean, _showAngles: boolean, showConstruction: boolean
) {
    const axisY = ch * 0.55;
    const lensX = cw * 0.5;     // lens at center
    const scale = Math.min(cw, ch) / 90;
    const lensHalfH = ch * 0.34;

    const fSigned = isConvex ? Math.abs(f) : -Math.abs(f);
    // F₁ on same side as object (left), F₂ on other side (right) for convex
    const f1X = lensX - Math.abs(fSigned) * scale;  // left focus
    const f2X = lensX + Math.abs(fSigned) * scale;  // right focus
    const twoF1X = lensX - 2 * Math.abs(fSigned) * scale;
    const twoF2X = lensX + 2 * Math.abs(fSigned) * scale;

    drawBackground(ctx, cw, ch, axisY);

    // Draw lens
    if (isConvex) drawConvexLens(ctx, lensX, axisY, lensHalfH);
    else drawConcaveLens(ctx, lensX, axisY, lensHalfH);

    // Optical center
    drawPoint(ctx, lensX, axisY, COLORS.lens, "O");

    // Focal points
    if (isConvex) {
        drawPoint(ctx, f1X, axisY, COLORS.focus, "F₁", -16);
        drawPoint(ctx, f2X, axisY, COLORS.focus, "F₂", -16);
    } else {
        // Concave lens: virtual foci — F₁ on right, F₂ on left (sign convention)
        drawPoint(ctx, f2X, axisY, COLORS.focus, "F₁", -16);
        drawPoint(ctx, f1X, axisY, COLORS.focus, "F₂", -16);
    }

    // 2F points
    if (twoF1X > 30) drawPoint(ctx, twoF1X, axisY, "#a3a3a3", "2F₁", -16);
    if (twoF2X < cw - 30) drawPoint(ctx, twoF2X, axisY, "#a3a3a3", "2F₂", -16);

    // Object arrow (always on left of lens)
    const objX = lensX - objectDist * scale;
    const objH = objectHeight * scale;
    if (objX > 20 && objX < lensX - 10) {
        drawObjectArrow(ctx, objX, axisY, objH, COLORS.object, "Object");
    }

    // Lens equation
    const result = optics.lensEquation(fSigned, objectDist);
    const v = result.v;
    const m = result.m;
    const imgH = Math.abs(m) * objH;
    const isVirtual = result.imageType === "virtual";

    // Image position: v > 0 → right of lens, v < 0 → left of lens (virtual)
    const imgX = isFinite(v) ? lensX + v * scale : -999;

    // ── Principal Rays for Lenses ──

    const objTipX = objX;
    const objTipY = axisY - objH;

    if (objX > 20) {
        if (isConvex) {
            // ── CONVEX LENS RAYS ──

            // Ray 1: Parallel to axis → refracts through F₂
            drawArrow(ctx, objTipX, objTipY, lensX, objTipY, COLORS.incident, 6, 2);
            if (objectDist > Math.abs(fSigned)) {
                // Real image: ray goes through F₂ and beyond
                const slope2 = (axisY - objTipY) / (f2X - lensX + 0.001);
                const extX = lensX + (cw - lensX) * 0.7;
                const extY = objTipY + slope2 * (extX - lensX);
                drawArrow(ctx, lensX, objTipY, extX, extY, COLORS.refracted, 6, 2);
            } else {
                // Virtual image: ray diverges, extension through F₂
                const slope = (objTipY - axisY) / (lensX - f2X + 0.001);
                const extX = lensX + (cw - lensX) * 0.6;
                const extY = objTipY + slope * (extX - lensX);
                drawArrow(ctx, lensX, objTipY, extX, extY, COLORS.refracted, 6, 2);
                if (showConstruction) {
                    // Backward virtual extension
                    const vExtX = lensX - (lensX - objX) * 0.5;
                    const vExtY = objTipY - slope * (lensX - vExtX);
                    drawDashedLine(ctx, lensX, objTipY, vExtX, vExtY, COLORS.virtualRay, 1.5);
                }
            }

            // Ray 2: Through optical center → straight line
            const extFactor = 0.6;
            const dx2 = lensX - objTipX;
            const dy2 = axisY - objTipY;
            // Continue past lens
            drawArrow(ctx, objTipX, objTipY, lensX, axisY - objH + dy2 * (dx2 / (dx2 + 0.001)), COLORS.incident, 5, 1.5);
            const centEndX = lensX + dx2 * extFactor;
            const centEndY = axisY + (axisY - objTipY) * (centEndX - lensX) / (lensX - objTipX + 0.001) * -1;
            // Straight through center
            drawArrow(ctx, objTipX, objTipY, centEndX, objTipY + (centEndY - objTipY), COLORS.incident, 5, 1.5);
            const realCentEndX = lensX + (cw - lensX) * 0.5;
            const slopeC = (objTipY - axisY) / (objTipX - lensX + 0.001);
            const realCentEndY = axisY + slopeC * (realCentEndX - lensX);
            drawArrow(ctx, lensX, axisY, realCentEndX, realCentEndY, COLORS.refracted, 5, 1.5);

            // Ray 3: Through F₁ → refracts parallel
            if (f1X > 30) {
                const slopeF = (objTipY - axisY) / (objTipX - f1X + 0.001);
                const hitLensY = axisY + slopeF * (lensX - f1X);
                drawArrow(ctx, objTipX, objTipY, lensX, hitLensY, COLORS.incident, 5, 1.5);
                // Refracts parallel to axis
                drawArrow(ctx, lensX, hitLensY, lensX + (cw - lensX) * 0.7, hitLensY, COLORS.refracted, 5, 1.5);
            }

        } else {
            // ── CONCAVE LENS RAYS ──

            // Ray 1: Parallel to axis → diverges, appears from F₁ (left focus)
            drawArrow(ctx, objTipX, objTipY, lensX, objTipY, COLORS.incident, 6, 2);
            // Diverging ray
            const slopeDiv = (objTipY - axisY) / (lensX - f1X + 0.001);
            const divEndX = lensX + (cw - lensX) * 0.6;
            const divEndY = objTipY - slopeDiv * (divEndX - lensX);
            drawArrow(ctx, lensX, objTipY, divEndX, divEndY, COLORS.refracted, 6, 2);
            if (showConstruction) {
                // Virtual extension backward through F₁
                drawDashedLine(ctx, lensX, objTipY, f1X, axisY, COLORS.virtualRay, 1.5);
            }

            // Ray 2: Through optical center → straight
            const centerEndX = lensX + (cw - lensX) * 0.5;
            const slopeC = (objTipY - axisY) / (objTipX - lensX + 0.001);
            const centerEndY = axisY + slopeC * (centerEndX - lensX);
            drawArrow(ctx, objTipX, objTipY, lensX, axisY, COLORS.incident, 5, 1.5);
            drawArrow(ctx, lensX, axisY, centerEndX, centerEndY, COLORS.refracted, 5, 1.5);

            // Ray 3: Directed toward F₂ (right focus) → refracts parallel
            const hitLensY3 = axisY - objH * 0.6;
            drawArrow(ctx, objTipX, objTipY, lensX, hitLensY3, COLORS.incident, 5, 1.5);
            drawArrow(ctx, lensX, hitLensY3, lensX + (cw - lensX) * 0.6, hitLensY3, COLORS.refracted, 5, 1.5);
            if (showConstruction) {
                drawDashedLine(ctx, lensX, hitLensY3, f2X, axisY, COLORS.virtualRay, 1.5);
            }
        }
    }

    // Image arrow
    if (isFinite(v) && Math.abs(v) < 200) {
        if (isVirtual && imgX > 10 && imgX < cw - 10) {
            // Virtual image: same side as object, erect
            const imgDir = m > 0 ? 1 : -1;
            drawObjectArrow(ctx, imgX, axisY, imgH * imgDir, COLORS.image, "Image (virtual)");
            // Connect virtual extensions to image tip
            if (showConstruction) {
                drawDashedLine(ctx, lensX, objTipY, imgX, axisY - imgH * imgDir, COLORS.virtualRay, 1);
            }
        } else if (!isVirtual && imgX > 10 && imgX < cw - 10) {
            // Real image: other side, inverted
            const imgDir = m > 0 ? 1 : -1;
            drawObjectArrow(ctx, imgX, axisY, imgH * imgDir, COLORS.image, "Image (real)");
        }
    }

    // Normal line at lens center
    if (showNormals) drawDashedLine(ctx, lensX - 15, axisY, lensX + 15, axisY, COLORS.normal, 1);

    // ── HUD ──
    ctx.save();
    ctx.font = "11px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.textAlign = "left";
    ctx.fillText(`${isConvex ? "Convex" : "Concave"} Lens (${isConvex ? "Converging" : "Diverging"})`, 10, 18);
    ctx.fillText(`f = ${fSigned.toFixed(1)} cm`, 10, 34);
    ctx.fillText(`u = ${objectDist.toFixed(1)} cm`, 10, 50);
    if (isFinite(v)) {
        ctx.fillText(`v = ${v.toFixed(1)} cm (${result.imageType})`, 10, 66);
        ctx.fillText(`m = ${m.toFixed(2)} (${m > 0 ? "erect" : "inverted"}, ${Math.abs(m) > 1 ? "magnified" : Math.abs(m) < 1 ? "diminished" : "same size"})`, 10, 82);
    } else {
        ctx.fillText(`v = ∞ (image at infinity)`, 10, 66);
    }
    ctx.restore();

    // Formula
    ctx.save();
    ctx.font = "10px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.textAlign = "left";
    ctx.fillText("1/f = 1/v − 1/u  (Lens equation)", 10, ch - 22);
    ctx.fillText("m = v/u = hᵢ/hₒ", 10, ch - 8);
    ctx.restore();

    // Mode badge
    ctx.save();
    ctx.font = "bold 11px 'Space Grotesk', Inter, sans-serif";
    ctx.fillStyle = COLORS.lens;
    ctx.textAlign = "right";
    ctx.fillText(isConvex ? "Convex Lens" : "Concave Lens", cw - 10, 18);
    ctx.restore();

    drawMiniGraph(ctx, cw - 190, ch - 160, 178, 148, fSigned, objectDist, isConvex ? "convex_lens" : "concave_lens");
}

// ── Props ──────────────────────────────────────────────────────

interface RayOpticsProps {
    opticsMode: OpticsMode;
    focalLength: number;
    objectDistance: number;
    objectHeight: number;
    simState: SimState;
    showNormals?: boolean;
    showAngleArcs?: boolean;
    showConstructionLines?: boolean;
    onFrame?: (vals: {
        u: number;
        v: number;
        f: number;
        magnification: number;
        imageType: "real" | "virtual" | "none";
    }) => void;
}

// ══════════════════════════════════════════════════════════════
// RayOpticsEngine
// ══════════════════════════════════════════════════════════════
const RayOpticsEngine: React.FC<RayOpticsProps> = ({
    opticsMode,
    focalLength,
    objectDistance,
    objectHeight,
    simState,
    showNormals = true,
    showAngleArcs = false,
    showConstructionLines = true,
    onFrame,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 600, h: 400 });

    const modeRef = useRef(opticsMode);
    const focalRef = useRef(focalLength);
    const objDistRef = useRef(objectDistance);
    const objHeightRef = useRef(objectHeight);
    const showNormalsRef = useRef(showNormals);
    const showAnglesRef = useRef(showAngleArcs);
    const showConstructionRef = useRef(showConstructionLines);
    const onFrameRef = useRef(onFrame);

    modeRef.current = opticsMode;
    focalRef.current = focalLength;
    objDistRef.current = objectDistance;
    objHeightRef.current = objectHeight;
    showNormalsRef.current = showNormals;
    showAnglesRef.current = showAngleArcs;
    showConstructionRef.current = showConstructionLines;
    onFrameRef.current = onFrame;

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

    function renderScene() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = canvas.width / dpr;
        const ch = canvas.height / dpr;
        ctx.clearRect(0, 0, cw, ch);

        const mode = modeRef.current;
        const f = focalRef.current;
        const u = objDistRef.current;
        const h = objHeightRef.current;
        const sn = showNormalsRef.current;
        const sa = showAnglesRef.current;
        const sc = showConstructionRef.current;

        switch (mode) {
            case "plane":
                renderPlaneMirror(ctx, cw, ch, u, h, sn, sa, sc);
                break;
            case "concave_mirror":
                renderCurvedMirror(ctx, cw, ch, f, u, h, true, sn, sa, sc);
                break;
            case "convex_mirror":
                renderCurvedMirror(ctx, cw, ch, f, u, h, false, sn, sa, sc);
                break;
            case "convex_lens":
                renderLens(ctx, cw, ch, f, u, h, true, sn, sa, sc);
                break;
            case "concave_lens":
                renderLens(ctx, cw, ch, f, u, h, false, sn, sa, sc);
                break;
        }

        // Fire onFrame
        let result;
        if (mode === "plane") {
            result = optics.planeMirror(u);
        } else if (mode === "convex_lens" || mode === "concave_lens") {
            const fS = mode === "convex_lens" ? Math.abs(f) : -Math.abs(f);
            result = optics.lensEquation(fS, u);
        } else {
            const fS = mode === "concave_mirror" ? Math.abs(f) : -Math.abs(f);
            result = optics.mirrorEquation(fS, u);
        }

        onFrameRef.current?.({
            u,
            v: result.v,
            f: mode === "plane" ? Infinity : f,
            magnification: result.m,
            imageType: result.imageType,
        });
    }

    useEffect(() => {
        renderScene();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opticsMode, focalLength, objectDistance, objectHeight,
        showNormals, showAngleArcs, showConstructionLines,
        dims, simState]);

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

export default RayOpticsEngine;
