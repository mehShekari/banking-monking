import * as THREE from "three/webgpu";
import { Fn, If, dot, floor, fract, min, mix, pass, renderOutput, sin, smoothstep, step, texture, uniform, uv, vec2, vec3, vec4 } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { smaa } from "three/examples/jsm/tsl/display/SMAANode.js";
import { SIGNAL, motion } from "./tsl";

const hash = (p: THREE.Node<"vec2">) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));

/**
 * The post chain: scene → bloom (half resolution) → fracture → tone map + sRGB → SMAA.
 *
 * No MSAA: 4x multisampling on a half-float target cost 2-3x the whole frame on integrated GPUs
 * (measured: 54 → 165 fps on the doors). SMAA at the end smooths edges for a fraction.
 *
 * Act transitions: for a beat the picture fractures along the card's own circuit. Blocks slide
 * only along their trace direction (never diagonal noise), the cracks light up blue, and colour
 * splits along the crack. The same pass adds a faint vertical split at scroll speed.
 */
export function createPost(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera, mask: THREE.Texture) {
  const scenePass = pass(scene, camera);
  const sceneTex = scenePass.getTextureNode("output");
  // Bloom at half resolution: it is a blur, nobody sees the difference, and it costs a quarter.
  const bloomPass = bloom(sceneTex, 0.6, 0.55, 0.82).setResolutionScale(0.5);
  // r186 runtime name (its @types call it getTexture).
  const bloomTex = (bloomPass as unknown as { getTextureNode(): THREE.TextureNode }).getTextureNode();
  const u = { shift: uniform(0), time: uniform(0), aspect: uniform(1) };
  const col = (q: THREE.Node<"vec2">) => sceneTex.sample(q).rgb.add(bloomTex.sample(q).rgb);
  const fracture = Fn(() => {
    const vUv = uv();
    const out = col(vUv).toVar();
    // Between transitions and at rest: just the bloomed frame, none of the fracture math.
    If(u.shift.greaterThan(0.01).or(motion.vel.greaterThan(0.15)), () => {
      const g = vec2(u.aspect, 1).mul(11);
      const cell = floor(vUv.mul(g));
      const tick = floor(u.time.mul(18));
      const hit = step(u.shift.mul(-0.5).add(1), hash(cell.add(tick.mul(0.37))));
      const horiz = step(0.5, hash(cell.mul(1.7).add(3.1)));
      const dir = mix(vec2(0, 1), vec2(1, 0), horiz);
      const q = vUv.add(dir.mul(hash(cell.add(tick).add(9)).sub(0.5).mul(0.06).mul(u.shift).mul(hit)));
      const ca = dir.mul(u.shift.mul(0.007).mul(hit.add(0.3))).add(vec2(0, 0.0012).mul(motion.vel));
      const c = vec3(col(q.add(ca)).r, col(q).g, col(q.sub(ca)).b);
      const f = fract(vUv.mul(g));
      const border = hit.mul(smoothstep(0, 0.035, min(min(f.x, f.x.oneMinus()), min(f.y, f.y.oneMinus()))).oneMinus());
      const m = texture(mask, fract(vUv.mul(vec2(u.aspect, 1)).mul(0.85).add(vec2(0.12, 0.3)))).r;
      out.assign(c.add(SIGNAL().mul(border.mul(0.9).add(m.mul(0.55))).mul(u.shift)));
    });
    return vec4(out, 1);
  });
  const pipeline = new THREE.RenderPipeline(renderer);
  // Tone mapping and sRGB before SMAA, as the WebGL chain had it (OutputPass → SMAAPass):
  // edge detection on display values finds the edges in this dark film.
  pipeline.outputColorTransform = false;
  const aa = smaa(renderOutput(fracture(), THREE.NeutralToneMapping, THREE.SRGBColorSpace));
  pipeline.outputNode = aa;
  const dispose = () => {
    pipeline.dispose();
    scenePass.dispose();
    bloomPass.dispose();
    aa.dispose();
  };
  return { pipeline, scenePass, bloom: bloomPass, u, dispose };
}

export type Post = ReturnType<typeof createPost>;
