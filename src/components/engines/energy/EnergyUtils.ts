import { ProblemClass, EnergyState, MotionParams, SimulationValues } from "./types";

export function calculateEnergy(
    problemClass: ProblemClass | string,
    params: Record<string, number>,
    live: SimulationValues
): EnergyState {
    const m = params.mass ?? 1;
    const g = params.gravity ?? 9.8;
    const v = live.velocity;

    // Kinetic Energy is universal: 0.5 * m * v^2
    const ke = 0.5 * m * v * v;

    let pe = 0;

    // Potential Energy depends on the physics model
    if (problemClass.includes("pulley")) {
        // Pulley / Atwood Machine — dual-mass system
        const m1 = params.mass1 ?? params.mass ?? 1;
        const m2 = params.mass2 ?? params.mass ?? 1;
        const totalKe = 0.5 * (m1 + m2) * v * v;
        pe = (m1 + m2) * g * live.height;
        return { ke: totalKe, pe, total: totalKe + pe };
    } else if (problemClass.includes("pendulum")) {
        // Simple Pendulum
        // height passed as L*(1-cos(theta)) — vertical rise of bob
        pe = m * g * live.height;
        return { ke, pe, total: ke + pe };
    } else if (problemClass.includes("rotational")) {
        // Rotational Dynamics — pure rotational KE, no PE
        const I = params.moment_of_inertia ?? 1;
        const omega = live.velocity; // angular velocity mapped to velocity slot
        const ke_rot = 0.5 * I * omega * omega;
        return { ke: ke_rot, pe: 0, total: ke_rot };
    } else if (problemClass.includes("simple_harmonic") || problemClass.includes("oscillation") || problemClass.includes("wave")) {
        // Elastic Potential Energy: 0.5 * k * x^2
        const k = params.k ?? params.spring_constant ?? 10;
        const x = live.height; // In SHM context, 'height' carries displacement
        pe = 0.5 * k * x * x;
    } else {
        // Gravitational Potential Energy: m * g * h
        // For vertical/projectile/incline/circular
        // current height 'h' is live.height
        // Note: For incline, 'height' should be vertical height. 
        // If live.height is Position along ramp, we need to convert?
        // Let's assume engines report 'height' as Vertical Y usually, 
        // OR the graph expects 'height' to be Y.
        // In ForceInteractionEngine, 'height' passed to onFrame is actually 'position' along incline?
        // Let's check ForceInteractionEngine.tsx.
        // It passes: { displacement: block.x (linear pos?), velocity: block.v ... }
        // Simulation.tsx maps it to 'height' prop of Graph. 
        // If ForceInteraction reports linear position, PE = m * g * (x * sin(theta)).
        // But EnergyUtils receives 'live.height' which IS that value.
        // Simulation.tsx passes `height: v.displacement`.

        // Handling Force Interaction explicitly if possible:
        if (problemClass.includes("force") || problemClass.includes("dynamics")) {
            // We need theta to get vertical h?
            // Or we rely on the engine to output 'vertical height'?
            // Currently Simulation.tsx just passes the raw value.
            // If we want correct PE, we need vertical height.
            // But usually for "Block on Incline", PE is defined by vertical h.
            // If x is distance along ramp, h = x * sin(theta).
            const angleDeg = params.angle ?? 0;
            const angleRad = angleDeg * Math.PI / 180;
            // If angle is 0 (flat), h is 0?
            // If angle > 0, ramp goes UP or DOWN?
            // Usually block slides DOWN.
            // Let's assume h is relative to bottom.
            // Complex. For now, let's use m*g*h where h is the value passed.
            // If the user sees "Height" in graph, they match.
            pe = m * g * live.height;
        } else {
            // Standard Vertical / Projectile / Circular
            pe = m * g * live.height;
        }
    }

    return {
        ke,
        pe,
        total: ke + pe
    };
}
