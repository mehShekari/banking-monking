// Shared TSL nodes for every film material (WebGPU renderer; TSL also compiles to WebGL2).
// Scene writes the uniforms' `.value` every frame; materials only read them.
import type { Node } from "three/webgpu";
import { abs, clamp, length, max, mix, smoothstep, uniform, vec2 } from "three/tsl";

// The lens: sprites away from the focus distance grow into soft bokeh. Blurring only the
// particles keeps a depth-of-field look for almost nothing; a full-screen DOF pass cost
// ~3x the frame on integrated GPUs.
export const lens = { focus: uniform(4), bokeh: uniform(0) };

/** Smoothed scroll speed (0…1), for the sprite streaks and the fracture's colour split. */
export const motion = { vel: uniform(0) };

/** Circle of confusion for a view-space depth (positive distance in front of the camera). */
export const coc = (depth: Node<"float">) => clamp(abs(depth.sub(lens.focus)).mul(lens.bokeh).mul(0.28), 0, 1.6);

/** How much a sprite grows with its circle of confusion. */
export const bokehScale = (c: Node<"float">) => c.mul(2.5).add(1);

/**
 * A sprite's alpha, from a soft dot (coc 0) to a six-bladed aperture with a faint rim,
 * the shape a real lens gives out-of-focus highlights. `uv` is the sprite's 0..1 uv.
 */
export const bokehAlpha = (uv: Node<"vec2">, c: Node<"float">) => {
  const q = uv.sub(0.5);
  const dot = smoothstep(0.5, 0, length(q));
  // Hexagon distance with a ~17° blade rotation.
  const r = abs(vec2(q.x.mul(0.9553).sub(q.y.mul(0.2955)), q.x.mul(0.2955).add(q.y.mul(0.9553))));
  const h = max(r.x.mul(0.866025).add(r.y.mul(0.5)), r.y);
  const disc = smoothstep(0.45, 0.4, h).mul(smoothstep(0.26, 0.43, h).mul(0.25).add(0.75));
  return mix(dot, disc, clamp(c, 0, 1)).div(c.mul(c).mul(1.5).add(1));
};

/** Vertical streak with scroll speed: a sprite's scale is (1/s, s) where s = streakSize. */
export const streakSize = (v: Node<"float">) => v.mul(1.2).add(1);
