import { usePageTransition, type TransitionType } from "@/hooks/usePageTransition";
import { useElectricClick } from "@/hooks/useElectricClick";

/* ─── SVG Animations per route type ─── */

function RocketAnim() {
    return (
        <svg viewBox="0 0 200 400" className="transition-svg transition-svg--rocket">
            {/* Flame trail */}
            <ellipse cx="100" cy="310" rx="12" ry="40" fill="url(#flameGrad)" opacity="0.8" />
            <ellipse cx="100" cy="320" rx="8" ry="25" fill="var(--gold-mid)" opacity="0.6" />
            {/* Rocket body */}
            <rect x="88" y="160" width="24" height="70" rx="4" fill="hsl(240,6%,85%)" />
            {/* Nose cone */}
            <polygon points="100,130 88,160 112,160" fill="var(--gold-mid)" />
            {/* Fins */}
            <polygon points="88,220 78,240 88,230" fill="var(--lavender)" opacity="0.7" />
            <polygon points="112,220 122,240 112,230" fill="var(--lavender)" opacity="0.7" />
            <defs>
                <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold-start)" />
                    <stop offset="100%" stopColor="transparent" />
                </linearGradient>
            </defs>
        </svg>
    );
}

function FreefallAnim() {
    return (
        <svg viewBox="0 0 300 300" className="transition-svg transition-svg--freefall">
            {[0, 1, 2, 3, 4].map((i) => (
                <circle
                    key={i}
                    cx={60 + i * 48}
                    cy={30}
                    r={6 + i * 2}
                    fill={i % 2 === 0 ? "var(--gold-mid)" : "var(--lavender)"}
                    opacity={0.7}
                    className="freefall-particle"
                    style={{ animationDelay: `${i * 0.06}s` }}
                />
            ))}
        </svg>
    );
}

function WaveAnim() {
    return (
        <div className="transition-wave">
            <div className="transition-wave__ring transition-wave__ring--1" />
            <div className="transition-wave__ring transition-wave__ring--2" />
            <div className="transition-wave__ring transition-wave__ring--3" />
        </div>
    );
}

const ANIM_MAP: Record<TransitionType, () => JSX.Element> = {
    rocket: RocketAnim,
    freefall: FreefallAnim,
    rotate: WaveAnim,     // uses wave fallback
    lightbeam: WaveAnim,  // uses wave fallback
    wave: WaveAnim,
};

/**
 * Global animation layer. Mount once inside <BrowserRouter>.
 * Renders page-transition overlays and initialises electric click effects.
 * Zero impact on routing or simulation logic.
 */
export function TransitionOverlay() {
    useElectricClick();
    const { active, type } = usePageTransition();

    if (!active) return null;

    const AnimComponent = ANIM_MAP[type];

    return (
        <div className="transition-overlay" aria-hidden="true">
            <AnimComponent />
        </div>
    );
}
