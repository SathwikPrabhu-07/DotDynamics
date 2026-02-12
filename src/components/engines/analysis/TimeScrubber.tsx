import React from "react";

interface TimeScrubberProps {
    currentTime: number;
    maxTime: number;
    isPlaying: boolean;
    onTimeChange: (time: number) => void;
    disabled?: boolean;
}

const TimeScrubber: React.FC<TimeScrubberProps> = ({
    currentTime,
    maxTime,
    isPlaying,
    onTimeChange,
    disabled = false,
}) => {
    const safeMax = Math.max(maxTime, 0.1);

    return (
        <div className="flex items-center gap-3 px-1">
            {/* Time label */}
            <span className="text-[11px] font-mono text-slate-500 tabular-nums w-14 text-right shrink-0">
                {currentTime.toFixed(2)}s
            </span>

            {/* Slider track */}
            <div className="relative flex-1 h-6 flex items-center">
                <input
                    type="range"
                    min={0}
                    max={safeMax}
                    step={0.01}
                    value={Math.min(currentTime, safeMax)}
                    onChange={(e) => onTimeChange(parseFloat(e.target.value))}
                    disabled={disabled}
                    className="
            w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-slate-200 outline-none
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-indigo-500
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:w-3.5
            [&::-moz-range-thumb]:h-3.5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-indigo-500
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-white
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            disabled:opacity-40
            disabled:cursor-not-allowed
          "
                    style={{
                        background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(currentTime / safeMax) * 100}%, #e2e8f0 ${(currentTime / safeMax) * 100}%, #e2e8f0 100%)`,
                    }}
                />
            </div>

            {/* Max time label */}
            <span className="text-[11px] font-mono text-slate-400 tabular-nums w-14 shrink-0">
                {safeMax.toFixed(2)}s
            </span>

            {/* Playing indicator */}
            {isPlaying && (
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            )}
        </div>
    );
};

export default TimeScrubber;
