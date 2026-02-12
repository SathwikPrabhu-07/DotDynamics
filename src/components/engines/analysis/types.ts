// ── Analysis Module Types ──────────────────────────────────────

/** Per-frame data captured from any simulation engine */
export interface RecordedFrame {
    time: number;
    positionX: number;
    positionY: number;
    velocity: number;
    velocityX: number;
    velocityY: number;
    acceleration: number;
    ke: number;
    pe: number;
    totalEnergy: number;
    displacement: number;
    height: number;
}

/** A saved simulation run for comparison */
export interface RecordedRun {
    id: number;
    label: string;
    params: Record<string, number>;
    frames: RecordedFrame[];
}

/** Selectable curve types for graph overlay */
export type CurveKey =
    | "position"
    | "velocity"
    | "acceleration"
    | "ke"
    | "pe"
    | "totalEnergy";

/** Consistent color scheme for each curve type */
export const CURVE_COLORS: Record<CurveKey, string> = {
    position: "#3b82f6",     // blue
    velocity: "#22c55e",     // green
    acceleration: "#f97316", // orange
    ke: "#14b8a6",           // teal
    pe: "#a855f7",           // purple
    totalEnergy: "#ef4444",  // red
};

/** Human-readable labels */
export const CURVE_LABELS: Record<CurveKey, string> = {
    position: "Displacement",
    velocity: "Velocity",
    acceleration: "Acceleration",
    ke: "Kinetic Energy",
    pe: "Potential Energy",
    totalEnergy: "Total Energy",
};

/** Units for axis labels */
export const CURVE_UNITS: Record<CurveKey, string> = {
    position: "m",
    velocity: "m/s",
    acceleration: "m/s²",
    ke: "J",
    pe: "J",
    totalEnergy: "J",
};

/** All available curve keys */
export const ALL_CURVE_KEYS: CurveKey[] = [
    "position",
    "velocity",
    "acceleration",
    "ke",
    "pe",
    "totalEnergy",
];

/** Extract the numeric value from a frame for a given curve key */
export function getFrameValue(frame: RecordedFrame, key: CurveKey): number {
    switch (key) {
        case "position":
            return frame.displacement;
        case "velocity":
            return frame.velocity;
        case "acceleration":
            return frame.acceleration;
        case "ke":
            return frame.ke;
        case "pe":
            return frame.pe;
        case "totalEnergy":
            return frame.totalEnergy;
    }
}
