import React from "react";
import { EnergyState } from "./types";

interface EnergyBarProps {
    energy: EnergyState;
}

const EnergyBar: React.FC<EnergyBarProps> = ({ energy }) => {
    const { ke, pe, total } = energy;
    const max = Math.max(total, 100); // Baseline scale

    const getPercent = (val: number) => Math.min(100, Math.max(0, (val / max) * 100));

    return (
        <div className="space-y-2 font-mono text-xs w-full">
            {/* Kinetic Energy */}
            <div className="flex items-center gap-2">
                <span className="w-8 text-right text-green-600 font-bold">KE</span>
                <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden relative border border-gray-200">
                    <div
                        className="h-full bg-green-500 transition-all duration-100 ease-linear"
                        style={{ width: `${getPercent(ke)}%` }}
                    />
                </div>
                <span className="w-16 text-right tabular-nums">{ke.toFixed(1)} J</span>
            </div>

            {/* Potential Energy */}
            <div className="flex items-center gap-2">
                <span className="w-8 text-right text-blue-600 font-bold">PE</span>
                <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden relative border border-gray-200">
                    <div
                        className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                        style={{ width: `${getPercent(pe)}%` }}
                    />
                </div>
                <span className="w-16 text-right tabular-nums">{pe.toFixed(1)} J</span>
            </div>

            {/* Total Energy */}
            <div className="flex items-center gap-2">
                <span className="w-8 text-right text-orange-600 font-bold">TE</span>
                <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden relative border border-gray-200">
                    <div
                        className="h-full bg-orange-500 transition-all duration-100 ease-linear"
                        style={{ width: `${getPercent(total)}%` }}
                    />
                </div>
                <span className="w-16 text-right tabular-nums">{total.toFixed(1)} J</span>
            </div>
        </div>
    );
};

export default EnergyBar;
