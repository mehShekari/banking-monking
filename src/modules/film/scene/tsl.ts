// Shared TSL nodes for every film material (WebGPU renderer; TSL also compiles to WebGL2).
// Each scene object writes its uniforms' `.value` every frame; materials only read them.
import { AdditiveBlending, Vector2, Vector3, type Node } from "three/webgpu";
import { abs, clamp, length, max, mix, smoothstep, uniform, vec2, vec3 } from "three/tsl";

export type Float = Node<"float">;

/** The film's one saturated colour: the circuit's signal blue (linear). */
export const SIGNAL = () => vec3(0.45, 0.78, 1.0);

/** Material options for light that adds up: glows, sprites, beams. */
export const ADDITIVE = { transparent: true, depthWrite: false, blending: AdditiveBlending } as const;

// The lens: sprites away from the focus distance grow into soft bokeh. Blurring only the
// particles keeps a depth-of-field look for almost nothing; a full-screen DOF pass cost
// ~3x the frame on integrated GPUs.
export const lens = { focus: uniform(4), bokeh: uniform(0) };

/** Particle budget, 0.25…1. The scene's quality governor lowers it as its last step. */
export const quality = { particles: 1 };

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
  const dot = smoothstep(0, 0.5, length(q)).oneMinus();
  // Hexagon distance with a ~17° blade rotation.
  const r = abs(vec2(q.x.mul(0.9553).sub(q.y.mul(0.2955)), q.x.mul(0.2955).add(q.y.mul(0.9553))));
  const h = max(r.x.mul(0.866025).add(r.y.mul(0.5)), r.y);
  const disc = smoothstep(0.4, 0.45, h).oneMinus().mul(smoothstep(0.26, 0.43, h).mul(0.25).add(0.75));
  return mix(dot, disc, clamp(c, 0, 1)).div(c.mul(c).mul(1.5).add(1));
};

/** Vertical streak with scroll speed: a sprite's scale is (1, s) where s = streakSize (as in the GLSL era). */
export const streakSize = (v: Node<"float">) => v.mul(1.2).add(1);

// ── Uniform contracts ─────────────────────────────────────────────────────────
// Each object creates its own set (useMemo), writes `.value` every frame, and builds its node
// materials from these exact uniform nodes. Same names as the GLSL era.

/** The path trace and the constellation (one shared object). */
export const makePathU = () => ({
  uHead: uniform(0),
  uAlpha: uniform(0),
  uTime: uniform(0),
  uAhead: uniform(0),
  uRecap: uniform(-1),
  uLift: uniform(0),
});
export type PathU = ReturnType<typeof makePathU>;

/** Act one: the talent field, the partners' braid, the chosen point, the finale cursor. */
export const makeTalentU = () => ({
  uTalent: uniform(0),
  uChosen: uniform(0),
  uTime: uniform(0),
  uStreams: uniform(0),
  uFieldZ: uniform(0),
  uCursor: uniform(new Vector3()),
  uCursorOn: uniform(0),
});
export type TalentU = ReturnType<typeof makeTalentU>;

/** The doors. */
export const makeDoorsU = () => ({ uAlpha: uniform(0), uCardZ: uniform(0), uTime: uniform(0) });
export type DoorsU = ReturnType<typeof makeDoorsU>;

/** The emergence (card-local child of the card group). */
export const makeEmergeU = () => ({ uForm: uniform(0), uTime: uniform(0) });
export type EmergeU = ReturnType<typeof makeEmergeU>;

/** The card's own uniforms (rig.uniforms / rig.network in Card.tsx). */
export const makeCardU = () => ({
  uTime: uniform(0),
  uGlow: uniform(0),
  uSweep: uniform(0),
  uSweepAngle: uniform(0.35),
  uCharge: uniform(0),
  uForm: uniform(0),
  uIgnite: uniform(0),
  uNameGlow: uniform(0),
  /** 0…1: how close the macro camera is (Camera.follow). Gates micro detail that only reads up close. */
  uDetail: uniform(0),
  /** The path head on the card face, in face uv (0..1): a soft pool of light on the metal. */
  uHeadUv: uniform(new Vector2(0.5, 0.5)),
  /** 0…1: strength of that light pool (the path's alpha, or the finale cursor). */
  uHeadOn: uniform(0),
  /** Radius of the light pool in card units: small for the path head, wide for the cursor. */
  uHeadR: uniform(0.05),
});
export const makeNetworkU = () => ({ uMix: uniform(0), uTime: uniform(0), uSize: uniform(28) });
export type CardU = ReturnType<typeof makeCardU>;
export type NetworkU = ReturnType<typeof makeNetworkU>;

/** The finale's particle stations (Formations.tsx), world space. */
export const makeFormU = () => ({
  /** 0…1: the entrance (particles stream out of the card and assemble); scrubbed. */
  uForm: uniform(0),
  uTime: uniform(0),
  /** Station cycle position in stations (0…7, wraps): k = floor, morph = fract past the dwell. */
  uCycle: uniform(0),
  /** World-space centre of the card (where the entrance streams from, where the charge pulls to). */
  uCard: uniform(new Vector3()),
  /** The pointer on the card's depth plane, and how present it is (0…1). */
  uCursor: uniform(new Vector3()),
  uCursorOn: uniform(0),
  /** Hold-to-charge 0…1, and the burst envelope 0…1 after release. */
  uCharge: uniform(0),
  uBurst: uniform(0),
  /** 1 on portrait screens: one formation above the card instead of two beside it. */
  uPortrait: uniform(0),
});
export type FormU = ReturnType<typeof makeFormU>;
