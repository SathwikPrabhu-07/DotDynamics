export type ProblemClass =
    | "kinematics_vertical_motion"
    | "projectile_motion"
    | "circular_motion"
    | "dynamics_force_interaction"
    | "simple_harmonic_motion"
    | "wave_motion_basic"
    | "force_interaction"
    | "oscillations"
    | "pulley_system"
    | "simple_pendulum"
    | "rotational_dynamics"
    | "ray_optics";

export interface EnergyState {
    ke: number;
    pe: number;
    total: number;
}

export interface MotionParams {
    mass?: number;
    gravity?: number;
    initial_velocity?: number;
    initial_height?: number;
    velocity?: number; // current v
    height?: number; // current h (or displacement x for SHM)
    k?: number; // spring constant
    spring_constant?: number;
    amplitude?: number;
    moment_of_inertia?: number;
    torque_applied?: number;
    angular_velocity?: number;
}

export interface SimulationValues {
    time: number;
    height: number;    // y position or x displacement
    velocity: number;  // v
    maxHeight: number; // Amplitude or Max Height
}
