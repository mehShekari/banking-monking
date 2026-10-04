/** Hermite smoothstep from edge `a` to edge `b`; reversed edges (a > b) give a falling ramp. */
export function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
