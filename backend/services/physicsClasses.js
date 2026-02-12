/**
 * Physics class definitions for DotDynamics.
 * Each class has: keywords for matching, default parameters,
 * adjustable parameter definitions, and visual template mappings.
 */

const physicsClasses = {
  kinematics_vertical_motion: {
    label: "Kinematics – Vertical Motion",
    keywords: [
      "thrown upward", "thrown up", "falls down", "dropped", "free fall",
      "freefall", "vertical", "upward", "downward", "falls from",
      "thrown vertically", "height", "drop", "falling", "thrown straight up"
    ],
    defaultParams: {
      gravity: 9.8,
      initial_velocity: 0,
      initial_height: 0,
      mass: 1,
      angle: 90
    },
    adjustableParameters: [
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 },
      { key: "initial_velocity", label: "Initial Velocity (m/s)", min: 0, max: 100, step: 0.5 },
      { key: "initial_height", label: "Initial Height (m)", min: 0, max: 500, step: 1 },
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 }
    ],
    relationships: [
      "h = h₀ + v₀t - ½gt²",
      "v = v₀ - gt",
      "v² = v₀² - 2g(h - h₀)"
    ],
    visual_template: "vertical_trajectory",
    visual_primitives: ["dot", "trajectory_line", "ground_plane", "velocity_arrow"]
  },

  kinematics_horizontal_motion: {
    label: "Kinematics – Horizontal Motion",
    keywords: [
      "moves horizontally", "horizontal", "slides", "constant velocity",
      "uniform motion", "along the ground", "on a surface", "straight line",
      "travels along", "moves along", "constant speed", "linear motion"
    ],
    defaultParams: {
      velocity: 10,
      acceleration: 0,
      initial_position: 0,
      mass: 1,
      friction: 0
    },
    adjustableParameters: [
      { key: "velocity", label: "Velocity (m/s)", min: 0, max: 100, step: 0.5 },
      { key: "acceleration", label: "Acceleration (m/s²)", min: -10, max: 10, step: 0.1 },
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 },
      { key: "friction", label: "Friction Coefficient", min: 0, max: 1, step: 0.01 }
    ],
    relationships: [
      "x = x₀ + v₀t + ½at²",
      "v = v₀ + at",
      "v² = v₀² + 2a(x - x₀)"
    ],
    visual_template: "horizontal_trajectory",
    visual_primitives: ["dot", "trajectory_line", "ground_plane", "velocity_arrow"]
  },

  projectile_motion: {
    label: "Projectile Motion",
    keywords: [
      "projectile", "thrown at angle", "launched at", "fired at",
      "angle", "trajectory", "parabolic", "cannon", "launched from",
      "thrown at", "kicked", "hit at an angle", "thrown with",
      "ball is thrown at", "launched with"
    ],
    defaultParams: {
      gravity: 9.8,
      initial_velocity: 20,
      angle: 45,
      initial_height: 0,
      mass: 1
    },
    adjustableParameters: [
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 },
      { key: "initial_velocity", label: "Initial Velocity (m/s)", min: 0, max: 100, step: 0.5 },
      { key: "angle", label: "Launch Angle (°)", min: 0, max: 90, step: 1 },
      { key: "initial_height", label: "Initial Height (m)", min: 0, max: 100, step: 1 },
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 }
    ],
    relationships: [
      "x = v₀ cos(θ) · t",
      "y = v₀ sin(θ) · t - ½gt²",
      "R = v₀² sin(2θ) / g",
      "T = 2v₀ sin(θ) / g",
      "H = v₀² sin²(θ) / (2g)"
    ],
    visual_template: "parabolic_trajectory",
    visual_primitives: ["dot", "trajectory_arc", "ground_plane", "velocity_arrow", "angle_indicator"]
  },

  force_interaction: {
    label: "Force Interaction",
    keywords: [
      "force", "newton", "push", "pull", "tension", "friction",
      "net force", "applied force", "normal", "incline", "inclined plane",
      "ramp", "weight", "F = ma", "acceleration due to force"
    ],
    defaultParams: {
      mass: 5,
      applied_force: 10,
      friction: 0.2,
      angle: 0,
      gravity: 9.8
    },
    adjustableParameters: [
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 },
      { key: "applied_force", label: "Applied Force (N)", min: 0, max: 500, step: 1 },
      { key: "friction", label: "Friction Coefficient", min: 0, max: 1, step: 0.01 },
      { key: "angle", label: "Incline Angle (°)", min: 0, max: 90, step: 1 },
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 }
    ],
    relationships: [
      "F_net = ma",
      "f = μN",
      "N = mg cos(θ)",
      "a = (F - f) / m"
    ],
    visual_template: "force_diagram",
    visual_primitives: ["dot", "force_arrow", "ground_plane", "normal_arrow", "friction_arrow"]
  },

  energy_conservation: {
    label: "Energy Conservation",
    keywords: [
      "energy", "kinetic", "potential", "conservation",
      "work", "joule", "KE", "PE", "spring", "elastic",
      "roller coaster", "work-energy", "height to velocity"
    ],
    defaultParams: {
      mass: 2,
      height: 10,
      velocity: 0,
      gravity: 9.8,
      spring_constant: 0
    },
    adjustableParameters: [
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 },
      { key: "height", label: "Height (m)", min: 0, max: 200, step: 1 },
      { key: "velocity", label: "Initial Velocity (m/s)", min: 0, max: 100, step: 0.5 },
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 },
      { key: "spring_constant", label: "Spring Constant (N/m)", min: 0, max: 500, step: 1 }
    ],
    relationships: [
      "KE = ½mv²",
      "PE = mgh",
      "E_total = KE + PE",
      "ΔKE = -ΔPE (conservative)"
    ],
    visual_template: "energy_bar_chart",
    visual_primitives: ["dot", "height_marker", "energy_bars", "ground_plane"]
  },

  circular_motion: {
    label: "Circular Motion",
    keywords: [
      "circular", "orbit", "revolve", "centripetal", "centrifugal",
      "radius", "angular", "rpm", "rotates", "spinning",
      "merry-go-round", "satellite", "circular path", "loop"
    ],
    defaultParams: {
      mass: 1,
      radius: 5,
      velocity: 10,
      gravity: 9.8,
      angular_velocity: 2
    },
    adjustableParameters: [
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 },
      { key: "radius", label: "Radius (m)", min: 0.5, max: 50, step: 0.5 },
      { key: "velocity", label: "Tangential Velocity (m/s)", min: 0, max: 100, step: 0.5 },
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 }
    ],
    relationships: [
      "F_c = mv²/r",
      "a_c = v²/r",
      "ω = v/r",
      "T = 2πr/v"
    ],
    visual_template: "circular_path",
    visual_primitives: ["dot", "circle_path", "radius_line", "centripetal_arrow", "velocity_arrow"]
  },

  fluid_flow_conceptual: {
    label: "Fluid Flow (Conceptual)",
    keywords: [
      "fluid", "water flow", "pipe", "bernoulli", "pressure",
      "flow rate", "viscosity", "buoyancy", "archimedes",
      "density", "submerged", "floats", "sinks", "hydraulic"
    ],
    defaultParams: {
      fluid_density: 1000,
      velocity: 2,
      pipe_area: 0.01,
      pressure: 101325,
      object_density: 500
    },
    adjustableParameters: [
      { key: "fluid_density", label: "Fluid Density (kg/m³)", min: 100, max: 13600, step: 100 },
      { key: "velocity", label: "Flow Velocity (m/s)", min: 0, max: 20, step: 0.1 },
      { key: "pipe_area", label: "Pipe Area (m²)", min: 0.001, max: 1, step: 0.001 },
      { key: "pressure", label: "Pressure (Pa)", min: 0, max: 200000, step: 1000 }
    ],
    relationships: [
      "A₁v₁ = A₂v₂ (Continuity)",
      "P + ½ρv² + ρgh = const (Bernoulli)",
      "F_b = ρVg (Buoyancy)"
    ],
    visual_template: "fluid_flow",
    visual_primitives: ["pipe_shape", "flow_arrows", "pressure_indicator", "dot"]
  },

  wave_motion_basic: {
    label: "Wave Motion (Basic)",
    keywords: [
      "wave", "frequency", "wavelength", "amplitude", "oscillation",
      "sound", "vibration", "hertz", "period", "harmonic",
      "transverse", "longitudinal", "standing wave", "resonance"
    ],
    defaultParams: {
      amplitude: 1,
      frequency: 2,
      wavelength: 5,
      velocity: 10,
      phase: 0
    },
    adjustableParameters: [
      { key: "amplitude", label: "Amplitude (m)", min: 0.1, max: 10, step: 0.1 },
      { key: "frequency", label: "Frequency (Hz)", min: 0.1, max: 20, step: 0.1 },
      { key: "wavelength", label: "Wavelength (m)", min: 0.5, max: 20, step: 0.5 },
      { key: "velocity", label: "Wave Speed (m/s)", min: 0.5, max: 100, step: 0.5 }
    ],
    relationships: [
      "v = fλ",
      "T = 1/f",
      "y = A sin(kx - ωt + φ)",
      "k = 2π/λ, ω = 2πf"
    ],
    visual_template: "wave_pattern",
    visual_primitives: ["wave_curve", "dot", "amplitude_marker", "wavelength_marker"]
  },

  simple_harmonic_motion: {
    label: "Simple Harmonic Motion",
    keywords: [
      "spring", "mass spring", "oscillation", "oscillates", "simple harmonic",
      "SHM", "amplitude", "spring constant", "period", "frequency", "restoring force",
      "equilibrium", "Hooke's law", "stiffness", "vibrate"
    ],
    defaultParams: {
      mass: 1,
      spring_constant: 10,
      amplitude: 2,
      phase: 0
    },
    adjustableParameters: [
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 100, step: 0.1 },
      { key: "spring_constant", label: "Spring Constant (N/m)", min: 1, max: 500, step: 1 },
      { key: "amplitude", label: "Amplitude (m)", min: 0.1, max: 10, step: 0.1 }
    ],
    relationships: [
      "F = -kx",
      "T = 2π√(m/k)",
      "ω = √(k/m)",
      "x(t) = A cos(ωt + φ)"
    ],
    visual_template: "mass_spring_system",
    visual_primitives: ["spring_coil", "mass_block", "wall", "equilibrium_line", "vectors"]
  },

  pulley_system: {
    label: "Pulley System – Atwood Machine",
    keywords: [
      "pulley", "atwood", "atwood machine", "two masses", "string over",
      "rope over", "connected by a string", "connected by rope",
      "hanging masses", "two blocks", "massless pulley", "frictionless pulley",
      "mass on each side", "over a pulley", "light string"
    ],
    defaultParams: {
      mass1: 3,
      mass2: 5,
      gravity: 9.8
    },
    adjustableParameters: [
      { key: "mass1", label: "Mass m₁ (kg)", min: 0.1, max: 50, step: 0.1 },
      { key: "mass2", label: "Mass m₂ (kg)", min: 0.1, max: 50, step: 0.1 },
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 }
    ],
    relationships: [
      "a = (m₂ - m₁)g / (m₁ + m₂)",
      "T = 2m₁m₂g / (m₁ + m₂)",
      "v = at",
      "s = ½at²"
    ],
    visual_template: "atwood_machine",
    visual_primitives: ["pulley_wheel", "rope", "mass_block", "mass_block", "velocity_arrow"]
  },

  simple_pendulum: {
    label: "Simple Pendulum",
    keywords: [
      "pendulum", "simple pendulum", "bob", "string length",
      "suspended", "oscillates", "angular displacement",
      "swing", "swings", "hanging", "pendulum bob"
    ],
    defaultParams: {
      length: 2,
      theta0: 15,
      mass: 1,
      gravity: 9.8
    },
    adjustableParameters: [
      { key: "length", label: "String Length (m)", min: 0.5, max: 10, step: 0.1 },
      { key: "theta0", label: "Initial Angle (°)", min: 1, max: 30, step: 1 },
      { key: "mass", label: "Bob Mass (kg)", min: 0.1, max: 20, step: 0.1 },
      { key: "gravity", label: "Gravity (m/s²)", min: 0, max: 25, step: 0.1 }
    ],
    relationships: [
      "T = 2π√(L/g)",
      "θ(t) = θ₀ cos(ωt)",
      "ω = √(g/L)",
      "KE = ½mL²ω̇²",
      "PE = mgL(1 - cosθ)"
    ],
    visual_template: "pendulum_swing",
    visual_primitives: ["pivot", "string_line", "bob_circle", "angle_arc", "trail"]
  },

  rotational_dynamics: {
    label: "Rotational Dynamics — Rigid Body",
    keywords: [
      "torque", "moment of inertia", "angular acceleration", "rotational",
      "rotating", "rigid body", "flywheel", "disk rotates", "angular velocity",
      "angular momentum", "rotational kinetic", "constant torque",
      "spinning disk", "rotational motion", "turning", "revolving disk",
      "rotating wheel", "shaft", "rotational inertia"
    ],
    defaultParams: {
      mass: 2,
      radius: 0.5,
      shape: 0,
      torque: 5,
      initial_angular_velocity: 0
    },
    adjustableParameters: [
      { key: "shape", label: "Shape (0=Disk 1=Sphere 2=Square)", min: 0, max: 2, step: 1 },
      { key: "mass", label: "Mass (kg)", min: 0.1, max: 50, step: 0.1 },
      { key: "radius", label: "Radius / Half-side (m)", min: 0.1, max: 5, step: 0.05 },
      { key: "torque", label: "Torque (N·m)", min: -50, max: 50, step: 0.5 },
      { key: "initial_angular_velocity", label: "Initial ω (rad/s)", min: -20, max: 20, step: 0.5 }
    ],
    relationships: [
      "α = τ / I",
      "ω(t) = ω₀ + αt",
      "θ(t) = ω₀t + ½αt²",
      "KE = ½Iω²",
      "I_disk = ½mr²",
      "I_sphere = ⅖mr²",
      "I_square = ⅙m(2r)²"
    ],
    visual_template: "rotating_disk",
    visual_primitives: ["disk", "radial_marker", "pivot", "torque_arrow", "angle_arc"]
  },

  ray_optics: {
    label: "Ray Optics — Mirrors & Lenses",
    keywords: [
      "mirror", "reflection", "concave mirror", "convex mirror", "plane mirror",
      "focal length", "ray", "optics", "image formation", "object distance",
      "curved mirror", "spherical mirror", "center of curvature", "real image",
      "virtual image", "magnification", "concave", "convex", "reflecting surface",
      "mirror equation", "ray diagram", "image distance", "focal point",
      "lens", "convex lens", "concave lens", "converging lens", "diverging lens",
      "refraction", "biconvex", "biconcave", "thin lens", "lens equation",
      "optical center", "power of lens", "diopter"
    ],
    defaultParams: {
      optics_mode: 0,
      focal_length: 15,
      object_distance: 25,
      object_height: 4
    },
    adjustableParameters: [
      { key: "optics_mode", label: "Mode (0=Plane 1=Concave Mirror 2=Convex Mirror 3=Convex Lens 4=Concave Lens)", min: 0, max: 4, step: 1 },
      { key: "focal_length", label: "Focal Length (cm)", min: 5, max: 50, step: 0.5 },
      { key: "object_distance", label: "Object Distance (cm)", min: 3, max: 60, step: 0.5 },
      { key: "object_height", label: "Object Height (cm)", min: 1, max: 10, step: 0.5 }
    ],
    relationships: [
      "Mirror: 1/f = 1/v + 1/u",
      "Lens: 1/f = 1/v − 1/u",
      "m = hᵢ/hₒ",
      "R = 2f",
      "θᵢ = θᵣ (Law of Reflection)"
    ],
    visual_template: "ray_diagram",
    visual_primitives: ["mirror_surface", "lens_surface", "rays", "focus_point", "object_arrow", "image_arrow"]
  }
};

module.exports = { physicsClasses };
