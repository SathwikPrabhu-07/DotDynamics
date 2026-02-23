import React from "react";
import { Link } from "react-router-dom";
import "./Logo.css";

// ── Types ──────────────────────────────────────────────────────
type LogoVariant = "full" | "icon";
type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
    /** "full" = full wordmark with graphic + text; "icon" = round badge only */
    variant?: LogoVariant;
    /** sm=32px | md=40px | lg=48px (auto-scales to 32px on mobile) */
    size?: LogoSize;
    /** Route to navigate to on click. Pass null to render a plain img (no link). */
    to?: string | null;
    className?: string;
    /** Alt text override */
    alt?: string;
}

// ── Asset map ─────────────────────────────────────────────────
const LOGO_SRCS: Record<LogoVariant, string> = {
    full: "/logo/logo-full.svg",
    icon: "/logo/logo-icon.svg",
};

const ALT_TEXT: Record<LogoVariant, string> = {
    full: "DotDynamics — Interactive Physics Simulations",
    icon: "DotDynamics",
};

// ── Component ─────────────────────────────────────────────────
const Logo: React.FC<LogoProps> = ({
    variant = "full",
    size = "md",
    to = "/",
    className = "",
    alt,
}) => {
    const src = LOGO_SRCS[variant];
    const altStr = alt ?? ALT_TEXT[variant];
    const cls = `logo logo--${size} ${className}`.trim();

    const img = (
        <img
            src={src}
            alt={altStr}
            width={variant === "full" ? 210 : 40}
            height={size === "lg" ? 48 : size === "md" ? 40 : 32}
            // Preload eagerly since it appears in the initial viewport
            loading="eager"
            decoding="async"
        />
    );

    if (to === null) {
        return <span className={cls}>{img}</span>;
    }

    return (
        <Link to={to} className={cls} aria-label={altStr}>
            {img}
        </Link>
    );
};

export default Logo;
