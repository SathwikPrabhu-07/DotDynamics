import { useRef, useLayoutEffect, useState, type RefObject } from 'react';
import {
    motion,
    useScroll,
    useSpring,
    useTransform,
    useMotionValue,
    useVelocity,
    useAnimationFrame,
} from 'motion/react';
import './ScrollVelocity.css';

/* ── Helpers ── */

function useElementWidth(ref: RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);

    useLayoutEffect(() => {
        function updateWidth() {
            if (ref.current) {
                setWidth(ref.current.offsetWidth);
            }
        }
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [ref]);

    return width;
}

function wrap(min: number, max: number, v: number): number {
    const range = max - min;
    const mod = (((v - min) % range) + range) % range;
    return mod + min;
}

/* ── Types ── */

interface VelocityMapping {
    input: [number, number];
    output: [number, number];
}

interface ScrollVelocityProps {
    scrollContainerRef?: RefObject<HTMLElement>;
    texts?: string[];
    velocity?: number;
    className?: string;
    damping?: number;
    stiffness?: number;
    numCopies?: number;
    velocityMapping?: VelocityMapping;
    parallaxClassName?: string;
    scrollerClassName?: string;
    parallaxStyle?: React.CSSProperties;
    scrollerStyle?: React.CSSProperties;
}

interface VelocityTextProps {
    children: React.ReactNode;
    baseVelocity: number;
    scrollContainerRef?: RefObject<HTMLElement>;
    className?: string;
    damping?: number;
    stiffness?: number;
    numCopies?: number;
    velocityMapping?: VelocityMapping;
    parallaxClassName?: string;
    scrollerClassName?: string;
    parallaxStyle?: React.CSSProperties;
    scrollerStyle?: React.CSSProperties;
}

/* ── Inner marquee row ── */

function VelocityText({
    children,
    baseVelocity,
    scrollContainerRef,
    className = '',
    damping: _damping = 50,
    stiffness: _stiffness = 400,
    numCopies = 6,
    velocityMapping: _velocityMapping,
    parallaxClassName = 'sv-parallax',
    scrollerClassName = 'sv-scroller',
    parallaxStyle,
    scrollerStyle,
}: VelocityTextProps) {
    const baseX = useMotionValue(0);
    const scrollOptions = scrollContainerRef ? { container: scrollContainerRef } : {};
    const { scrollY } = useScroll(scrollOptions);
    const scrollVelocity = useVelocity(scrollY);
    const smoothVelocity = useSpring(scrollVelocity, {
        damping: _damping,
        stiffness: _stiffness,
    });

    const mapping = _velocityMapping ?? { input: [0, 1000], output: [0, 5] };
    const velocityFactor = useTransform(
        smoothVelocity,
        mapping.input,
        mapping.output,
        { clamp: false }
    );

    const copyRef = useRef<HTMLSpanElement>(null);
    const copyWidth = useElementWidth(copyRef);

    const x = useTransform(baseX, (v) => {
        if (copyWidth === 0) return '0px';
        return `${wrap(-copyWidth, 0, v)}px`;
    });

    const directionFactor = useRef(1);

    useAnimationFrame((_t, delta) => {
        let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

        if (velocityFactor.get() < 0) {
            directionFactor.current = -1;
        } else if (velocityFactor.get() > 0) {
            directionFactor.current = 1;
        }

        moveBy += directionFactor.current * moveBy * velocityFactor.get();
        baseX.set(baseX.get() + moveBy);
    });

    const spans: React.ReactNode[] = [];
    for (let i = 0; i < numCopies; i++) {
        spans.push(
            <span className={className} key={i} ref={i === 0 ? copyRef : null}>
                {children}
            </span>
        );
    }

    return (
        <div className={parallaxClassName} style={parallaxStyle}>
            <motion.div className={scrollerClassName} style={{ x, ...scrollerStyle }}>
                {spans}
            </motion.div>
        </div>
    );
}

/* ── Main component ── */

export const ScrollVelocity: React.FC<ScrollVelocityProps> = ({
    scrollContainerRef,
    texts = [],
    velocity = 100,
    className = '',
    damping = 50,
    stiffness = 400,
    numCopies = 6,
    velocityMapping,
    parallaxClassName = 'sv-parallax',
    scrollerClassName = 'sv-scroller',
    parallaxStyle,
    scrollerStyle,
}) => {
    return (
        <section className="sv-section">
            {texts.map((text, index) => (
                <VelocityText
                    key={index}
                    className={className}
                    baseVelocity={index % 2 !== 0 ? -velocity : velocity}
                    scrollContainerRef={scrollContainerRef}
                    damping={damping}
                    stiffness={stiffness}
                    numCopies={numCopies}
                    velocityMapping={velocityMapping}
                    parallaxClassName={parallaxClassName}
                    scrollerClassName={scrollerClassName}
                    parallaxStyle={parallaxStyle}
                    scrollerStyle={scrollerStyle}
                >
                    {text}&nbsp;
                </VelocityText>
            ))}
        </section>
    );
};

export default ScrollVelocity;
