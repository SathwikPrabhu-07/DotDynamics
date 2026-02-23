/**
 * VerticalMotion — Pure physics class for vertical motion under uniform gravity.
 *
 * Kinematic equations:
 *   v = u + at
 *   s = ut + ½at²
 *   v² = u² + 2as
 *
 * Uses incremental semi-implicit Euler integration per frame:
 *   velocity += acceleration * deltaTime
 *   position += velocity * deltaTime
 *
 * Supports: free fall, upward throw, elevated release, ground collision, peak detection.
 */

// ── Public types ──────────────────────────────────────────────────

export interface VerticalMotionState {
  /** Elapsed simulation time (s) */
  time: number;
  /** Current height above ground (m), clamped to >= 0 */
  position: number;
  /** Current vertical velocity (m/s), positive = upward */
  velocity: number;
  /** Constant acceleration = -g (m/s²) */
  acceleration: number;
  /** Maximum height reached so far (m) */
  maxHeight: number;
  /** Analytical time to reach peak from start: v₀/g (s) */
  peakTime: number;
  /** Analytical total flight time via quadratic root (s) */
  flightTime: number;
  /** True if the peak was crossed during the latest update */
  isAtPeak: boolean;
  /** True if the object has hit the ground (position <= 0 after launch) */
  isGrounded: boolean;
}

export interface VerticalMotionConfig {
  /** Initial upward velocity (m/s). Default 0 (free fall). */
  initialVelocity?: number;
  /** Initial height above ground (m). Default 0. */
  initialHeight?: number;
  /** Gravitational acceleration magnitude (m/s²). Default 9.81. */
  gravity?: number;
  /** Enable debug logging to console. Default false. */
  debug?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────

const DEFAULT_GRAVITY = 9.81;
const DT_CAP = 0.05; // Cap deltaTime to prevent spiral-of-death at low FPS

// ── Helper: solve quadratic for flight time ───────────────────────
/**
 * Solve  h₀ + v₀·t − ½g·t² = 0  for the positive root.
 *
 *   ½g·t² − v₀·t − h₀ = 0
 *   a = ½g,  b = -v₀,  c = -h₀
 *   t = ( v₀ + √(v₀² + 2g·h₀) ) / g
 *
 * Returns 0 if discriminant < 0 or g <= 0.
 */
function computeFlightTime(v0: number, h0: number, g: number): number {
  if (g <= 0) return Infinity;
  const discriminant = v0 * v0 + 2 * g * h0;
  if (discriminant < 0) return 0;
  return (v0 + Math.sqrt(discriminant)) / g;
}

/**
 * Analytical peak height: h₀ + v₀² / (2g)
 * Only valid when v₀ > 0 (upward throw); for free fall, peak = h₀.
 */
function computeMaxHeight(v0: number, h0: number, g: number): number {
  if (g <= 0) return Infinity;
  if (v0 <= 0) return h0; // Already descending or at rest
  return h0 + (v0 * v0) / (2 * g);
}

/**
 * Analytical time to peak: v₀ / g
 * Returns 0 if v₀ <= 0 (free fall — peak is at t=0).
 */
function computePeakTime(v0: number, g: number): number {
  if (v0 <= 0 || g <= 0) return 0;
  return v0 / g;
}

// ── Main class ────────────────────────────────────────────────────

export class VerticalMotion {
  // Config (immutable after construction)
  private readonly _initialVelocity: number;
  private readonly _initialHeight: number;
  private readonly _gravity: number;
  private readonly _debug: boolean;

  // Pre-computed analytical values
  private readonly _analyticalMaxHeight: number;
  private readonly _analyticalPeakTime: number;
  private readonly _analyticalFlightTime: number;

  // Simulation state (mutable)
  private _time: number;
  private _position: number;
  private _velocity: number;
  private _maxHeight: number;
  private _isAtPeak: boolean;
  private _isGrounded: boolean;
  private _hasLaunched: boolean; // Prevents immediate ground-check at t=0 when h0=0

  constructor(config: VerticalMotionConfig = {}) {
    const {
      initialVelocity = 0,
      initialHeight = 0,
      gravity = DEFAULT_GRAVITY,
      debug = false,
    } = config;

    // Validate inputs
    if (gravity < 0) {
      throw new Error(`Gravity must be non-negative, got ${gravity}`);
    }
    if (initialHeight < 0) {
      throw new Error(`Initial height must be non-negative, got ${initialHeight}`);
    }

    this._initialVelocity = initialVelocity;
    this._initialHeight = initialHeight;
    this._gravity = gravity;
    this._debug = debug;

    // Pre-compute analytical reference values
    this._analyticalMaxHeight = computeMaxHeight(initialVelocity, initialHeight, gravity);
    this._analyticalPeakTime = computePeakTime(initialVelocity, gravity);
    this._analyticalFlightTime = computeFlightTime(initialVelocity, initialHeight, gravity);

    // Initialize simulation state
    this._time = 0;
    this._position = initialHeight;
    this._velocity = initialVelocity;
    this._maxHeight = initialHeight;
    this._isAtPeak = false;
    this._isGrounded = false;
    this._hasLaunched = false;

    if (this._debug) {
      console.log("[VerticalMotion] Created:", {
        v0: initialVelocity,
        h0: initialHeight,
        g: gravity,
        analyticalMaxH: this._analyticalMaxHeight,
        analyticalPeakT: this._analyticalPeakTime,
        analyticalFlightT: this._analyticalFlightTime,
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────

  /**
   * Advance the simulation by `deltaTime` seconds.
   * Uses semi-implicit Euler: update velocity first, then position.
   */
  update(deltaTime: number): VerticalMotionState {
    if (this._isGrounded) {
      return this.getState();
    }

    // Cap delta time to prevent instability
    const dt = Math.min(Math.max(deltaTime, 0), DT_CAP);
    if (dt === 0) return this.getState();

    // Mark as launched after first update
    this._hasLaunched = true;

    // Store previous velocity for peak detection
    const prevVelocity = this._velocity;

    // Semi-implicit Euler integration
    // 1. Update velocity: v = v + a*dt  (acceleration = -g)
    const acceleration = -this._gravity;
    this._velocity += acceleration * dt;

    // 2. Update position: pos = pos + v*dt (using updated velocity)
    this._position += this._velocity * dt;

    // 3. Advance time
    this._time += dt;

    // ── Peak detection ──
    // Peak occurs when velocity crosses zero from positive to negative
    this._isAtPeak = prevVelocity > 0 && this._velocity <= 0;

    // Track max height
    if (this._position > this._maxHeight) {
      this._maxHeight = this._position;
    }

    // ── Ground collision detection ──
    if (this._position <= 0 && this._hasLaunched) {
      // Clamp to ground
      this._position = 0;
      this._velocity = 0;
      this._isGrounded = true;

      if (this._debug) {
        console.log(`[VerticalMotion] Ground hit at t=${this._time.toFixed(4)}s`);
      }
    }

    if (this._debug) {
      console.log(
        `[VerticalMotion] t=${this._time.toFixed(4)}  h=${this._position.toFixed(4)}  ` +
        `v=${this._velocity.toFixed(4)}  peak=${this._isAtPeak}  grounded=${this._isGrounded}`
      );
    }

    return this.getState();
  }

  /**
   * Return the current simulation state (read-only snapshot).
   */
  getState(): VerticalMotionState {
    return {
      time: this._time,
      position: this._position,
      velocity: this._velocity,
      acceleration: -this._gravity,
      maxHeight: this._maxHeight,
      peakTime: this._analyticalPeakTime,
      flightTime: this._analyticalFlightTime,
      isAtPeak: this._isAtPeak,
      isGrounded: this._isGrounded,
    };
  }

  /**
   * Reset the simulation to initial conditions.
   */
  reset(): void {
    this._time = 0;
    this._position = this._initialHeight;
    this._velocity = this._initialVelocity;
    this._maxHeight = this._initialHeight;
    this._isAtPeak = false;
    this._isGrounded = false;
    this._hasLaunched = false;

    if (this._debug) {
      console.log("[VerticalMotion] Reset to initial state");
    }
  }

  // ── Getters for analytical reference values ─────────────────

  get initialVelocity(): number { return this._initialVelocity; }
  get initialHeight(): number { return this._initialHeight; }
  get gravity(): number { return this._gravity; }
  get analyticalMaxHeight(): number { return this._analyticalMaxHeight; }
  get analyticalPeakTime(): number { return this._analyticalPeakTime; }
  get analyticalFlightTime(): number { return this._analyticalFlightTime; }
}
