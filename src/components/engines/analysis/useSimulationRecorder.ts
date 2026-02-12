import { useRef, useCallback } from "react";
import type { RecordedFrame, RecordedRun } from "./types";

const MAX_FRAMES = 3000;
const MIN_TIME_DELTA = 0.016; // ~60fps cap

/**
 * useSimulationRecorder
 *
 * Ref-based data capture hook. Stores per-frame simulation data
 * without triggering React re-renders. Supports saving snapshots
 * for compare-mode overlays.
 */
export function useSimulationRecorder() {
    const framesRef = useRef<RecordedFrame[]>([]);
    const lastTimeRef = useRef(-1);
    const savedRunsRef = useRef<RecordedRun[]>([]);
    const runCounterRef = useRef(0);

    /** Record a single frame (deduplicates by time delta) */
    const recordFrame = useCallback((frame: RecordedFrame) => {
        const last = lastTimeRef.current;
        if (last >= 0 && frame.time - last < MIN_TIME_DELTA) return;

        framesRef.current.push(frame);
        lastTimeRef.current = frame.time;

        // Cap buffer
        if (framesRef.current.length > MAX_FRAMES) {
            // Downsample: keep every 2nd frame from the oldest half
            const half = Math.floor(MAX_FRAMES / 2);
            const old = framesRef.current.slice(0, half);
            const recent = framesRef.current.slice(half);
            const downsampled = old.filter((_, i) => i % 2 === 0);
            framesRef.current = [...downsampled, ...recent];
        }
    }, []);

    /** Reset the recording buffer */
    const reset = useCallback(() => {
        framesRef.current = [];
        lastTimeRef.current = -1;
    }, []);

    /** Get a snapshot of current frames */
    const getFrames = useCallback((): RecordedFrame[] => {
        return framesRef.current;
    }, []);

    /** Get frame count without copying */
    const getFrameCount = useCallback((): number => {
        return framesRef.current.length;
    }, []);

    /** Save the current run for comparison */
    const saveRun = useCallback(
        (label?: string, params?: Record<string, number>) => {
            runCounterRef.current += 1;
            const run: RecordedRun = {
                id: Date.now(),
                label: label || `Run ${String.fromCharCode(64 + runCounterRef.current)}`, // A, B, C...
                params: params || {},
                frames: [...framesRef.current],
            };
            savedRunsRef.current = [...savedRunsRef.current, run];
            return run;
        },
        []
    );

    /** Get saved runs */
    const getSavedRuns = useCallback((): RecordedRun[] => {
        return savedRunsRef.current;
    }, []);

    /** Remove a saved run by id */
    const removeSavedRun = useCallback((id: number) => {
        savedRunsRef.current = savedRunsRef.current.filter((r) => r.id !== id);
    }, []);

    /** Clear all saved runs */
    const clearSavedRuns = useCallback(() => {
        savedRunsRef.current = [];
        runCounterRef.current = 0;
    }, []);

    return {
        recordFrame,
        reset,
        getFrames,
        getFrameCount,
        saveRun,
        getSavedRuns,
        removeSavedRun,
        clearSavedRuns,
    };
}

export type SimulationRecorder = ReturnType<typeof useSimulationRecorder>;
