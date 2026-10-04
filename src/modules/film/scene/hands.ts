// The finale's hands: drag spins the card with inertia and springs it home when left alone;
// press-and-hold charges it, and a full charge releases a 2.2 s burst. Pure: state in, state out.

export type Hands = { spin: number; vel: number; idle: number; charge: number; burst: number };

export const BURST_S = 2.2;
const TAU = Math.PI * 2;

export const restingHands = (): Hands => ({ spin: 0, vel: 0, idle: 0, charge: 0, burst: -1 });

/**
 * Advance the hands by `dt`. `dragging` = the pointer is down (spin follows it elsewhere),
 * `holding` = down and still long enough to charge, `active` = the finale accepts input.
 * Returns the burst's envelope (0 → 1 → 0 over BURST_S) and whether it started this frame.
 */
export function stepHands(h: Hands, dt: number, input: { dragging: boolean; holding: boolean; active: boolean }) {
  if (!input.dragging) {
    h.spin += h.vel * dt;
    h.vel *= Math.exp(-3 * dt);
    h.idle += dt;
    // Left alone: settle to the nearest whole turn.
    if (h.idle > 1.4) h.spin += (Math.round(h.spin / TAU) * TAU - h.spin) * Math.min(1, dt * 2.2);
  }
  h.charge = Math.min(1, Math.max(0, h.charge + (input.holding ? dt / 1.5 : -dt * 1.4)));
  let started = false;
  if (h.charge >= 1 && h.burst < 0) {
    h.burst = 0;
    h.charge = 0;
    started = true;
  }
  let mix = 0;
  if (h.burst >= 0) {
    h.burst += dt;
    mix = Math.sin(Math.PI * Math.min(h.burst / BURST_S, 1));
    if (h.burst > BURST_S) h.burst = -1;
  }
  if (!input.active) {
    h.spin *= Math.exp(-4 * dt);
    h.charge = 0;
  }
  return { mix, started };
}
