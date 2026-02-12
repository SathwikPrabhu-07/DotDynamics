import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export type TransitionType =
    | "rocket"
    | "freefall"
    | "rotate"
    | "lightbeam"
    | "wave";

/** Map route paths to physics-themed animations */
function getTransitionType(path: string): TransitionType {
    if (path.startsWith("/simulation")) return "rocket";
    if (path.startsWith("/history")) return "freefall";
    // Could be extended with query params for specific engines
    return "wave";
}

export interface PageTransitionState {
    active: boolean;
    type: TransitionType;
}

/**
 * Detects route changes and triggers a short overlay animation.
 * Returns the transition state so the overlay can render the right effect.
 */
export function usePageTransition(): PageTransitionState {
    const { pathname } = useLocation();
    const prevPath = useRef(pathname);
    const [state, setState] = useState<PageTransitionState>({
        active: false,
        type: "wave",
    });

    useEffect(() => {
        if (prevPath.current === pathname) return;
        prevPath.current = pathname;

        // Check reduced-motion preference
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const type = getTransitionType(pathname);
        setState({ active: true, type });

        const timer = setTimeout(() => {
            setState({ active: false, type });
        }, 600); // animation duration

        return () => clearTimeout(timer);
    }, [pathname]);

    return state;
}
