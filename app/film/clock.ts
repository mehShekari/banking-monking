// One clock for the film, in sequence seconds. GSAP writes it (intro + scroll),
// the 3D scene reads it every frame and hands it to Theatre.
//   v:       scroll speed, 0 (still) … 1 (flicking), written by the ScrollTrigger.
//   covered: true while the end credits cover the screen; the scene skips rendering.
export const clock = { t: 0, v: 0, covered: false };

// The lens, shared by every particle shader: points away from the focus distance
// grow into soft bokeh. A full-screen depth-of-field pass cost ~3x the frame on
// integrated GPUs; blurring only the particles keeps the look for almost nothing.
export const lens = { uFocus: { value: 4 }, uBokeh: { value: 0 } };

/** Smoothed scroll speed for shaders (0…1), written by the scene every frame. */
export const motion = { uVel: { value: 0 } };

/** GLSL: circle of confusion for a view-space depth (needs uFocus, uBokeh). */
export const cocGLSL = /* glsl */ `
uniform float uFocus, uBokeh;
float coc(float depth) { return clamp(abs(depth - uFocus) * uBokeh * 0.28, 0.0, 1.6); }`;

/**
 * GLSL: a point sprite's alpha, from a soft dot (coc 0) to a six-bladed aperture
 * with a faint rim, the shape a real lens gives out-of-focus highlights.
 */
export const bokehGLSL = /* glsl */ `
float hexDist(vec2 p) {
  const float c = 0.9553, s = 0.2955; // ~17° blade rotation
  p = abs(vec2(c * p.x - s * p.y, s * p.x + c * p.y));
  return max(p.x * 0.866025 + p.y * 0.5, p.y);
}
float bokehAlpha(vec2 pc, float c) {
  vec2 q = pc - 0.5;
  float dot_ = smoothstep(0.5, 0.0, length(q));
  float h = hexDist(q);
  float disc = smoothstep(0.45, 0.40, h) * (0.75 + 0.25 * smoothstep(0.26, 0.43, h));
  float k = clamp(c, 0.0, 1.0);
  return mix(dot_, disc, k) / (1.0 + c * c * 1.5);
}`;

/**
 * GLSL: streak a point sprite vertically with scroll speed. Multiply gl_PointSize by
 * streakSize(uVel); in the fragment shader sample with streakCoord(gl_PointCoord, uVel).
 */
export const streakGLSL = /* glsl */ `
uniform float uVel;
float streakSize(float v) { return 1.0 + v * 1.2; }
vec2 streakCoord(vec2 pc, float v) { return vec2((pc.x - 0.5) * streakSize(v) + 0.5, pc.y); }`;
