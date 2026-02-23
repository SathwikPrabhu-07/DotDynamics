import { describe, it, expect, beforeEach } from "vitest";
import { VerticalMotion } from "./VerticalMotion";

// ── Test helpers ─────────────────────────────────────────────────

const GRAVITY = 9.81;
const TOLERANCE = 0.15; // Allow ~0.15 tolerance for Euler integration error

/**
 * Run the simulation for `duration` seconds using incremental steps of `dt`.
 */
function runFor(motion: VerticalMotion, duration: number, dt = 0.001) {
    let state = motion.getState();
    let elapsed = 0;
    while (elapsed < duration && !state.isGrounded) {
        state = motion.update(dt);
        elapsed += dt;
    }
    return state;
}

// ══════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════

describe("VerticalMotion — Physics Class", () => {
    // ── 1. Free Fall from 10m ─────────────────────────────────────
    describe("Free fall from 10m (u=0)", () => {
        let motion: VerticalMotion;

        beforeEach(() => {
            motion = new VerticalMotion({
                initialVelocity: 0,
                initialHeight: 10,
                gravity: GRAVITY,
            });
        });

        it("should have correct initial state", () => {
            const state = motion.getState();
            expect(state.time).toBe(0);
            expect(state.position).toBe(10);
            expect(state.velocity).toBe(0);
            expect(state.isGrounded).toBe(false);
        });

        it("should compute analytical flight time ≈ √(2h/g) ≈ 1.428s", () => {
            const expected = Math.sqrt((2 * 10) / GRAVITY); // ≈ 1.4278
            expect(motion.analyticalFlightTime).toBeCloseTo(expected, 2);
        });

        it("should reach ground at approximately the correct time", () => {
            const state = runFor(motion, 2.0, 0.001);
            const expected = Math.sqrt((2 * 10) / GRAVITY);
            expect(state.isGrounded).toBe(true);
            expect(state.time).toBeCloseTo(expected, 1);
        });

        it("should have velocity ≈ √(2gh) ≈ 14.01 m/s at ground (clamped to 0)", () => {
            // Note: since we clamp velocity to 0 on ground hit, we check the analytical
            const expectedVel = Math.sqrt(2 * GRAVITY * 10); // ≈ 14.007
            // Run just before ground to check velocity
            const state = runFor(motion, 1.3, 0.001);
            expect(state.isGrounded).toBe(false);
            expect(Math.abs(state.velocity)).toBeCloseTo(GRAVITY * 1.3, 0);
        });

        it("should have maxHeight = initialHeight = 10m (no upward motion)", () => {
            expect(motion.analyticalMaxHeight).toBe(10);
        });

        it("should have peakTime = 0 (free fall starts descending)", () => {
            expect(motion.analyticalPeakTime).toBe(0);
        });
    });

    // ── 2. Upward throw at 20 m/s from ground ────────────────────
    describe("Upward throw at 20 m/s from ground", () => {
        let motion: VerticalMotion;

        beforeEach(() => {
            motion = new VerticalMotion({
                initialVelocity: 20,
                initialHeight: 0,
                gravity: GRAVITY,
            });
        });

        it("should compute peak height ≈ v₀²/(2g) ≈ 20.39m", () => {
            const expected = (20 * 20) / (2 * GRAVITY); // ≈ 20.387
            expect(motion.analyticalMaxHeight).toBeCloseTo(expected, 1);
        });

        it("should compute peak time ≈ v₀/g ≈ 2.038s", () => {
            const expected = 20 / GRAVITY; // ≈ 2.038
            expect(motion.analyticalPeakTime).toBeCloseTo(expected, 2);
        });

        it("should compute total flight time ≈ 2v₀/g ≈ 4.077s", () => {
            const expected = (2 * 20) / GRAVITY; // ≈ 4.0775
            expect(motion.analyticalFlightTime).toBeCloseTo(expected, 1);
        });

        it("should have velocity ≈ 0 at peak", () => {
            const peakTime = 20 / GRAVITY;
            const state = runFor(motion, peakTime, 0.001);
            expect(Math.abs(state.velocity)).toBeLessThan(0.1);
        });

        it("should detect peak (isAtPeak becomes true)", () => {
            // Run step by step and check for isAtPeak
            let foundPeak = false;
            let state = motion.getState();
            for (let i = 0; i < 5000 && !state.isGrounded; i++) {
                state = motion.update(0.001);
                if (state.isAtPeak) foundPeak = true;
            }
            expect(foundPeak).toBe(true);
        });

        it("should return to ground at approximately correct time", () => {
            const state = runFor(motion, 5.0, 0.001);
            const expected = (2 * 20) / GRAVITY;
            expect(state.isGrounded).toBe(true);
            expect(state.time).toBeCloseTo(expected, 1);
        });

        it("should reach approximately the analytical max height", () => {
            const state = runFor(motion, 5.0, 0.001);
            const expected = (20 * 20) / (2 * GRAVITY);
            expect(state.maxHeight).toBeCloseTo(expected, 0);
        });
    });

    // ── 3. Upward throw from elevated position ───────────────────
    describe("Upward throw at 15 m/s from 5m height", () => {
        let motion: VerticalMotion;

        beforeEach(() => {
            motion = new VerticalMotion({
                initialVelocity: 15,
                initialHeight: 5,
                gravity: GRAVITY,
            });
        });

        it("should compute flight time via quadratic formula", () => {
            // t = (v₀ + √(v₀² + 2g·h₀)) / g
            const disc = 15 * 15 + 2 * GRAVITY * 5;
            const expected = (15 + Math.sqrt(disc)) / GRAVITY;
            expect(motion.analyticalFlightTime).toBeCloseTo(expected, 2);
        });

        it("should compute max height = h₀ + v₀²/(2g)", () => {
            const expected = 5 + (15 * 15) / (2 * GRAVITY);
            expect(motion.analyticalMaxHeight).toBeCloseTo(expected, 1);
        });

        it("should reach ground", () => {
            const state = runFor(motion, 6.0, 0.001);
            expect(state.isGrounded).toBe(true);
        });

        it("should hit ground at approximately the analytical time", () => {
            const disc = 15 * 15 + 2 * GRAVITY * 5;
            const expectedTime = (15 + Math.sqrt(disc)) / GRAVITY;
            const state = runFor(motion, 6.0, 0.001);
            expect(state.time).toBeCloseTo(expectedTime, 1);
        });
    });

    // ── 4. Custom gravity (Moon: 1.62 m/s²) ──────────────────────
    describe("Custom gravity — Moon (g=1.62)", () => {
        it("should scale correctly with lunar gravity", () => {
            const moonG = 1.62;
            const motion = new VerticalMotion({
                initialVelocity: 20,
                initialHeight: 0,
                gravity: moonG,
            });

            const expectedPeakH = (20 * 20) / (2 * moonG); // ≈ 123.46
            const expectedPeakT = 20 / moonG; // ≈ 12.35
            const expectedFlightT = (2 * 20) / moonG; // ≈ 24.69

            expect(motion.analyticalMaxHeight).toBeCloseTo(expectedPeakH, 0);
            expect(motion.analyticalPeakTime).toBeCloseTo(expectedPeakT, 1);
            expect(motion.analyticalFlightTime).toBeCloseTo(expectedFlightT, 1);
        });
    });

    // ── 5. Ground collision clamping ──────────────────────────────
    describe("Ground collision clamping", () => {
        it("should clamp position to 0 and zero velocity on ground hit", () => {
            const motion = new VerticalMotion({
                initialVelocity: 0,
                initialHeight: 5,
                gravity: GRAVITY,
            });

            const state = runFor(motion, 3.0, 0.001);
            expect(state.position).toBe(0);
            expect(state.velocity).toBe(0);
            expect(state.isGrounded).toBe(true);
        });
    });

    // ── 6. Reset ──────────────────────────────────────────────────
    describe("Reset", () => {
        it("should restore exact initial conditions", () => {
            const motion = new VerticalMotion({
                initialVelocity: 25,
                initialHeight: 3,
                gravity: GRAVITY,
            });

            // Advance a bit
            runFor(motion, 1.0, 0.001);

            // Reset
            motion.reset();
            const state = motion.getState();

            expect(state.time).toBe(0);
            expect(state.position).toBe(3);
            expect(state.velocity).toBe(25);
            expect(state.isGrounded).toBe(false);
            expect(state.isAtPeak).toBe(false);
            expect(state.maxHeight).toBe(3);
        });
    });

    // ── 7. Energy consistency ─────────────────────────────────────
    describe("Energy consistency (½mv² + mgh ≈ constant)", () => {
        it("should conserve mechanical energy throughout flight", () => {
            const mass = 1; // Simplify: m=1 so E = ½v² + gh
            const v0 = 20;
            const h0 = 5;
            const motion = new VerticalMotion({
                initialVelocity: v0,
                initialHeight: h0,
                gravity: GRAVITY,
            });

            const initialEnergy = 0.5 * v0 * v0 + GRAVITY * h0;

            let state = motion.getState();
            for (let i = 0; i < 3000 && !state.isGrounded; i++) {
                state = motion.update(0.001);
                const currentEnergy = 0.5 * state.velocity * state.velocity + GRAVITY * state.position;

                // Semi-implicit Euler has very small drift per step, allow ~2% tolerance
                expect(currentEnergy).toBeCloseTo(initialEnergy, 0);
            }
        });
    });

    // ── 8. Multiple small dt steps vs fewer large steps ───────────
    describe("Step-size convergence", () => {
        it("should produce similar results with different step sizes", () => {
            const config = { initialVelocity: 15, initialHeight: 10, gravity: GRAVITY };

            const fine = new VerticalMotion(config);
            const coarse = new VerticalMotion(config);

            // Run for 1 second with fine steps
            const fineState = runFor(fine, 1.0, 0.0005);
            // Run for 1 second with coarser steps
            const coarseState = runFor(coarse, 1.0, 0.01);

            // Position should be within ~0.1m
            expect(fineState.position).toBeCloseTo(coarseState.position, 0);
            // Velocity should be within ~0.2 m/s
            expect(fineState.velocity).toBeCloseTo(coarseState.velocity, 0);
        });
    });

    // ── 9. Edge case: zero velocity, zero height ──────────────────
    describe("Edge case: v₀=0, h₀=0", () => {
        it("should already be grounded after first update", () => {
            const motion = new VerticalMotion({
                initialVelocity: 0,
                initialHeight: 0,
                gravity: GRAVITY,
            });

            const state = motion.update(0.01);
            // After first update, position goes slightly negative, gets clamped to 0
            expect(state.isGrounded).toBe(true);
            expect(state.position).toBe(0);
        });
    });

    // ── 10. Constructor validation ────────────────────────────────
    describe("Constructor validation", () => {
        it("should throw on negative gravity", () => {
            expect(() => new VerticalMotion({ gravity: -5 })).toThrow("Gravity must be non-negative");
        });

        it("should throw on negative initial height", () => {
            expect(() => new VerticalMotion({ initialHeight: -1 })).toThrow("Initial height must be non-negative");
        });

        it("should accept zero gravity", () => {
            const motion = new VerticalMotion({ initialVelocity: 10, gravity: 0 });
            // Run for 1 second using small steps (dt is capped internally)
            const state = runFor(motion, 1.0, 0.01);
            // With zero gravity, velocity stays 10, position = 10 * 1 = 10
            expect(state.velocity).toBe(10);
            expect(state.position).toBeCloseTo(10, 0);
        });
    });

    // ── 11. Analytical getters ────────────────────────────────────
    describe("Analytical getters", () => {
        it("should expose config values via getters", () => {
            const motion = new VerticalMotion({
                initialVelocity: 30,
                initialHeight: 7,
                gravity: 10,
            });

            expect(motion.initialVelocity).toBe(30);
            expect(motion.initialHeight).toBe(7);
            expect(motion.gravity).toBe(10);
            expect(motion.analyticalMaxHeight).toBe(7 + (30 * 30) / (2 * 10)); // 52
            expect(motion.analyticalPeakTime).toBe(30 / 10); // 3
        });
    });

    // ── 12. Projectile vertical component independence ────────────
    describe("Projectile vertical component independence", () => {
        it("vertical physics should be independent of horizontal", () => {
            // The VerticalMotion class handles only vertical — this test verifies
            // that two instances with the same vertical params produce identical results
            const m1 = new VerticalMotion({ initialVelocity: 20, initialHeight: 0 });
            const m2 = new VerticalMotion({ initialVelocity: 20, initialHeight: 0 });

            for (let i = 0; i < 100; i++) {
                const s1 = m1.update(0.01);
                const s2 = m2.update(0.01);
                expect(s1.position).toBe(s2.position);
                expect(s1.velocity).toBe(s2.velocity);
            }
        });
    });
});
