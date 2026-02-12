import React from "react";
import type { SimulationRecorder } from "./useSimulationRecorder";
import type { RecordedRun } from "./types";

interface ComparePanelProps {
    recorder: SimulationRecorder;
    savedRuns: RecordedRun[];
    currentParams: Record<string, number>;
    onRunsChange: () => void; // signal parent to re-read savedRuns
}

const ComparePanel: React.FC<ComparePanelProps> = ({
    recorder,
    savedRuns,
    currentParams,
    onRunsChange,
}) => {
    const handleSave = () => {
        const frames = recorder.getFrames();
        if (frames.length === 0) return;
        recorder.saveRun(undefined, { ...currentParams });
        onRunsChange();
    };

    const handleRemove = (id: number) => {
        recorder.removeSavedRun(id);
        onRunsChange();
    };

    const handleClearAll = () => {
        recorder.clearSavedRuns();
        onRunsChange();
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Compare Runs
                </h4>
                {savedRuns.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="text-[10px] text-red-500 hover:text-red-600 font-medium cursor-pointer"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
          text-[11px] font-medium border border-dashed border-slate-300 text-slate-600
          hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer"
            >
                <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                Save Current Run
            </button>

            {savedRuns.length > 0 && (
                <div className="space-y-1">
                    {savedRuns.map((run) => (
                        <div
                            key={run.id}
                            className="flex items-center justify-between rounded-md bg-slate-50 border border-slate-100 px-2.5 py-1.5"
                        >
                            <div className="min-w-0">
                                <span className="text-[11px] font-semibold text-slate-700">
                                    {run.label}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1.5">
                                    ({run.frames.length} pts)
                                </span>
                            </div>
                            <button
                                onClick={() => handleRemove(run.id)}
                                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors cursor-pointer ml-2 shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {savedRuns.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-1">
                    Run a simulation, then save it to compare with other runs.
                </p>
            )}
        </div>
    );
};

export default ComparePanel;
