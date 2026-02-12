import React, { useMemo } from "react";
import { calculateEnergy } from "./EnergyUtils";
import { MotionParams, SimulationValues } from "./types";
import EnergyBar from "./EnergyBar";
import EnergyGraph from "./EnergyGraph";

interface EnergyOverlayProps {
    problemClass: string;
    params: Record<string, number>;
    liveValues: SimulationValues;
    simState: string; // 'idle', 'playing', 'paused', 'completed'
    showGraph?: boolean;
    resetKey?: number;
}

const EnergyOverlay: React.FC<EnergyOverlayProps> = ({
    problemClass,
    params,
    liveValues,
    simState,
    showGraph = true,
    resetKey
}) => {
    // 1. Calculate Energy
    const energy = useMemo(() => {
        return calculateEnergy(problemClass, params, liveValues);
    }, [problemClass, params, liveValues]);

    return (
        <div className="flex flex-col gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Energy System</h3>

            {/* Bars */}
            <div className="mb-2">
                <EnergyBar energy={energy} />
            </div>

            {/* Graph */}
            {showGraph && (
                <div className="h-24 w-full bg-slate-50 rounded border border-slate-100 overflow-hidden relative">
                    <EnergyGraph
                        time={liveValues.time}
                        energy={energy}
                        running={simState === "playing"}
                        resetKey={resetKey}
                    />
                </div>
            )}
        </div>
    );
};

export default EnergyOverlay;
