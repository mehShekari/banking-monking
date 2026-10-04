// One clock for the film, in sequence seconds. GSAP writes it (intro + scroll),
// the 3D scene reads it every frame and hands it to Theatre.
//   v:       scroll speed, 0 (still) … 1 (flicking), written by the ScrollTrigger.
//   covered: true while the end credits cover the screen; the scene skips rendering.
// Shader-side helpers (lens, motion, bokeh) live in ./tsl.
export const clock = { t: 0, v: 0, covered: false };
