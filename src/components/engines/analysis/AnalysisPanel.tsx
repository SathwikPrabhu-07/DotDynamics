import React, { useState, useCallback } from "react";
import type { SimulationRecorder } from "./useSimulationRecorder";
import type { RecordedRun, CurveKey } from "./types";
import AdvancedGraph from "./AdvancedGraph";
import CurveToggle from "./CurveToggle";
import TimeScrubber from "./TimeScrubber";
import ComparePanel from "./ComparePanel";
import { exportCSV } from "./exportCSV";

interface AnalysisPanelProps {
    recorder: SimulationRecorder;
    currentTime: number;
    maxTime: number;
    simState: string;
    currentParams: Record<string, number>;
    onTimeSeek?: (time: number) => void;
}

/**
 * AnalysisPanel — orchestrates the full analysis layer.
 * Single import point for Simulation.tsx.
 */
const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
    recorder,
    currentTime,
    maxTime,
    simState,
    currentParams,
    onTimeSeek,
}) => {
    // Active curves (default: position + velocity)
    const [activeCurves, setActiveCurves] = useState<Set<CurveKey>>(
        () => new Set<CurveKey>(["position", "velocity"])
    );

    // Force re-render when saved runs change (since they're in refs)
    const [runsVersion, setRunsVersion] = useState(0);

    const handleToggle = useCallback((key: CurveKey) => {
        setActiveCurves((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const handleRunsChange = useCallback(() => {
        setRunsVersion((v) => v + 1);
    }, []);

    const handleExport = useCallback(() => {
        const frames = recorder.getFrames();
        exportCSV(frames);
    }, [recorder]);

    const handleTimeChange = useCallback(
        (t: number) => {
            onTimeSeek?.(t);
        },
        [onTimeSeek]
    );

    // Read live data from refs
    const frames = recorder.getFrames();
    const savedRuns: RecordedRun[] = recorder.getSavedRuns();
    // Force dependency on runsVersion to re-read after save
    void runsVersion;

    const hasData = frames.length > 0;

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                    </svg>
                    Analysis
                </h3>
                <button
                    onClick={handleExport}
                    disabled={!hasData}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium
            border border-slate-200 text-slate-600 hover:bg-slate-50
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors cursor-pointer"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Curve Toggles */}
            <CurveToggle activeCurves={activeCurves} onToggle={handleToggle} />

            {/* Graph */}
            <div className="rounded-lg border border-slate-100 bg-white overflow-hidden">
                <AdvancedGraph
                    frames={frames}
                    currentTime={currentTime}
                    activeCurves={activeCurves}
                    savedRuns={savedRuns}
                    height={240}
                />
            </div>

            {/* Time Scrubber */}
            <TimeScrubber
                currentTime={currentTime}
                maxTime={maxTime}
                isPlaying={simState === "playing"}
                onTimeChange={handleTimeChange}
                disabled={!hasData}
            />

            {/* Compare Panel */}
            <ComparePanel
                recorder={recorder}
                savedRuns={savedRuns}
                currentParams={currentParams}
                onRunsChange={handleRunsChange}
            />
        </div>
    );
};

export default AnalysisPanel;
