// node src/modules/film/scene/hands.check.mjs
import assert from "node:assert/strict";
import { BURST_S, restingHands, stepHands } from "./hands.ts";

const dt = 1 / 60;
const run = (h, s, input) => {
  let out;
  for (let t = 0; t < s; t += dt) out = stepHands(h, dt, input);
  return out;
};

// Holding charges to full in 1.5 s, then releases a burst and empties the charge.
const h = restingHands();
let started = 0;
for (let t = 0; t < 1.6; t += dt) if (stepHands(h, dt, { dragging: true, holding: true, active: true }).started) started++;
assert.equal(started, 1, "one burst per full charge");
assert.equal(h.charge > 0 && h.charge < 0.2, true, "charge restarts after the burst");

// The burst envelope rises and falls back to 0 within BURST_S.
const mid = run(h, BURST_S / 2 - 0.1, { dragging: false, holding: false, active: true });
assert.ok(mid.mix > 0.9, "burst peaks mid-way");
const end = run(h, BURST_S, { dragging: false, holding: false, active: true });
assert.equal(end.mix, 0, "burst over");

// Left alone, a spin settles on the nearest whole turn; outside the finale it decays to 0.
const s = { ...restingHands(), spin: 6.5 };
run(s, 6, { dragging: false, holding: false, active: true });
assert.ok(Math.abs(s.spin - Math.PI * 2) < 1e-3, "settles to one full turn");
const off = { ...restingHands(), spin: 2, charge: 0.5 };
run(off, 3, { dragging: false, holding: false, active: false });
assert.ok(Math.abs(off.spin) < 1e-3 && off.charge === 0, "inactive: no spin, no charge");

console.log("hands.check: ok");
