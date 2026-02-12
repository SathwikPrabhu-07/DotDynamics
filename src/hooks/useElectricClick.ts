import { useEffect } from "react";

/**
 * Attaches a global click listener that creates an electric burst effect
 * on any <button>, <a>, or [role="button"] element.
 *
 * The effect is a short-lived absolutely positioned div with CSS animation,
 * automatically cleaned up after the animation completes.
 *
 * Non-invasive: uses pointer-events: none, doesn't block click handlers,
 * and skips if prefers-reduced-motion is set.
 */
export function useElectricClick() {
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

        function handleClick(e: MouseEvent) {
            if (mq.matches) return;

            const target = e.target as HTMLElement;
            const clickable = target.closest("button, a, [role='button']");
            if (!clickable) return;

            // Don't double-fire on elements that already have btn-energy burst
            if (clickable.classList.contains("btn-energy") || clickable.classList.contains("btn-lavender")) return;

            const rect = clickable.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const spark = document.createElement("div");
            spark.className = "electric-spark";
            spark.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        pointer-events: none;
        z-index: 9999;
      `;

            // Ensure parent has position context
            const parent = clickable as HTMLElement;
            const pos = window.getComputedStyle(parent).position;
            if (pos === "static") parent.style.position = "relative";
            parent.style.overflow = "hidden";

            parent.appendChild(spark);

            // Auto-remove after animation
            spark.addEventListener("animationend", () => spark.remove(), { once: true });
            // Fallback removal
            setTimeout(() => spark.remove(), 500);
        }

        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, []);
}
