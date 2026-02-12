/**
 * Simulation state machine.
 *
 * Transitions:
 *   idle ──▶ playing       (Visualize / Play)
 *   playing ──▶ paused     (Pause)
 *   playing ──▶ completed  (ball hits ground)
 *   paused ──▶ playing     (Play / Resume)
 *   completed ──▶ playing  (Replay — resets time to 0)
 *   ANY ──▶ idle           (Reset)
 */
export type SimState = "idle" | "playing" | "paused" | "completed";
