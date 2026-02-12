import React from "react";
import {
    CurveKey,
    CURVE_COLORS,
    CURVE_LABELS,
    ALL_CURVE_KEYS,
} from "./types";

interface CurveToggleProps {
    activeCurves: Set<CurveKey>;
    onToggle: (key: CurveKey) => void;
}

const CurveToggle: React.FC<CurveToggleProps> = ({ activeCurves, onToggle }) => {
    return (
        <div className="flex flex-wrap gap-1.5">
            {ALL_CURVE_KEYS.map((key) => {
                const active = activeCurves.has(key);
                const color = CURVE_COLORS[key];
                return (
                    <button
                        key={key}
                        onClick={() => onToggle(key)}
                        className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
              transition-all duration-150 border cursor-pointer select-none
              ${active
                                ? "border-transparent text-white shadow-sm"
                                : "border-slate-200 text-slate-500 bg-white hover:bg-slate-50"
                            }
            `}
                        style={active ? { backgroundColor: color } : {}}
                    >
                        <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: active ? "#fff" : color }}
                        />
                        {CURVE_LABELS[key]}
                    </button>
                );
            })}
        </div>
    );
};

export default CurveToggle;
