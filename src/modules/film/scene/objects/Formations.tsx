"use client";

// The finale's particle stations: the path's seven emblems (path_stations_*.glb) rebuilt as
// dust beside the card. Each formation dwells on a station, then rebuilds itself into the
// next from the bottom up. The pointer scatters it like disturbed dust; a spring glides it
// home. Hold-to-charge spirals it into the card, the burst throws it out again.
// World space: render at the scene root.
//
// The physics is stateful (a spring), so the entrance is not: rendered position is a
// closed-form blend from a point on the card face to the spring state, which keeps scrubbing
// safe, and the state resets to the targets whenever the formation (re)appears.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import {
  clamp,
  cos,
  floor,
  Fn,
  hash,
  instanceIndex,
  instancedArray,
  max,
  min,
  mix,
  modelViewMatrix,
  mx_noise_vec3,
  normalize,
  select,
  sin,
  smoothstep,
  uniform,
  uv,
  varying,
  vec3,
  vec4,
} from "three/tsl";
import { CARD_H, CARD_W } from "@/modules/film/constants/card";
import { FACE_Z, type Rig } from "./Card";
import { useStationsGLTF } from "./Stations";
import { live } from "../live";
import { values } from "../theatre";
import { ADDITIVE, bokehAlpha, bokehScale, coc, makeFormU, quality, SIGNAL } from "../tsl";

const STATIONS = 7;

/** Formation centres relative to the card: A right, B left; portrait shows only A, above. */
export const FORM_OFFSETS = {
  sides: [
    [1.2, 0.05, -0.2],
    [-1.2, 0.05, -0.2],
  ],
  portrait: [0, 1.2, -0.3],
} as const;
/** Formation height (a station's longest side) in world units. */
const SCALE = { side: 0.8, portrait: 0.5 };

/** The station a formation shows at this cycle position (B runs three stations ahead). */
export function formStage(cycle: number, side: 0 | 1): number {
  return (((Math.floor(cycle + side * 3) % STATIONS) + STATIONS) % STATIONS);
}

// Physics tuning (per second). Spring: ω = √K ≈ 4.7, critical damping 2ω ≈ 9.4; C a little
// under it, so the return glides with a whisper of overshoot.
const K = 22;
const C = 7.6;
const R = 0.35; // hover radius (world, measured in the screen-facing xy plane)
const IMPULSE = 30; // hover push (acceleration at the cursor's centre)
const SWIRL = 6; // noise swirl inside the hover radius
const BURST = 9; // outward push at burst peak
const ALPHA = 0.65;

const GLOW = SIGNAL().mul(1.3);
const CHROME = vec3(0.82, 0.88, 0.95).mul(0.6);
const METAL = vec3(0.32, 0.42, 0.6).mul(0.45);

/**
 * Area-weighted surface samples, N per station, each station centred in its own unit box
 * (longest side 1). Layout: station k's points at [k*N, (k+1)*N), vec4 = xyz + material tag
 * (0 Glow, 1 Chrome, 2 Metal).
 */
function sampleStations(gltf: { scene: THREE.Object3D }, N: number) {
  const root = gltf.scene.clone(true); // the lo file: finished pose, no clips
  root.updateMatrixWorld(true);

  const stations = root.children.filter((o) => /^Stage\d_/.test(o.name)).sort((a, b) => a.name.localeCompare(b.name));
  const out = new Float32Array(STATIONS * N * 4);
  const tag: Record<string, number> = { Glow: 0, Chrome: 1, Metal: 2 };
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();

  stations.forEach((g, k) => {
    // Relative to the station root, so its preview-row placement drops out.
    const inv = g.matrixWorld.clone().invert();
    const tris: number[] = []; // 9 floats per triangle
    const tags: number[] = [];
    const cum: number[] = [];
    let total = 0;
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      m.multiplyMatrices(inv, mesh.matrixWorld);
      const pos = mesh.geometry.getAttribute("position");
      const idx = mesh.geometry.getIndex();
      const t = tag[(mesh.material as THREE.Material).name] ?? 2;
      const count = idx ? idx.count : pos.count;
      for (let i = 0; i + 2 < count; i += 3) {
        const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
        a.fromBufferAttribute(pos, i0).applyMatrix4(m);
        b.fromBufferAttribute(pos, i1).applyMatrix4(m);
        c.fromBufferAttribute(pos, i2).applyMatrix4(m);
        const area = p.subVectors(b, a).cross(q.subVectors(c, a)).length() / 2;
        if (area <= 0) continue;
        total += area;
        cum.push(total);
        tris.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        tags.push(t);
      }
    });

    const box = new THREE.Box3();
    const base = k * N * 4;
    for (let j = 0; j < N; j++) {
      // Binary search the cumulative area for a triangle, then a uniform point inside it.
      const r = Math.random() * total;
      let lo = 0;
      let hi = cum.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      let u1 = Math.random();
      let u2 = Math.random();
      if (u1 + u2 > 1) {
        u1 = 1 - u1;
        u2 = 1 - u2;
      }
      const o = lo * 9;
      for (let d = 0; d < 3; d++) {
        out[base + j * 4 + d] = tris[o + d] + (tris[o + 3 + d] - tris[o + d]) * u1 + (tris[o + 6 + d] - tris[o + d]) * u2;
      }
      out[base + j * 4 + 3] = tags[lo];
      box.expandByPoint(p.fromArray(out, base + j * 4));
    }
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const s = 1 / Math.max(size.x, size.y, size.z, 1e-6);
    for (let j = 0; j < N; j++) {
      const at = base + j * 4;
      out[at] = (out[at] - centre.x) * s;
      out[at + 1] = (out[at + 1] - centre.y) * s;
      out[at + 2] = (out[at + 2] - centre.z) * s;
    }
  });
  return out;
}

export function Formations({ rig }: { rig: Rig }) {
  const u = useMemo(makeFormU, []);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const gltf = useStationsGLTF();

  const parts = useMemo(() => {
    const isGPU = (gl.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;
    const N = isGPU ? 20000 : 6000;
    // One target set shared by both formations; particle i always lands on point i of a
    // station, so a morph is every particle flying from its old spot to its new one.
    // PBO: the WebGL2 fallback reads storage at the vertex index only; random access needs a texture.
    const tgtB = instancedArray(sampleStations(gltf, N), "vec4").setPBO(true);
    const dt = uniform(0);

    const formation = (side: 0 | 1) => {
      const posB = instancedArray(N, "vec4"); // position, material tag
      const velB = instancedArray(N, "vec3");
      // Seed, and an independent spawn point on the card face (uv).
      const seeds = new Float32Array(N * 4);
      for (let i = 0; i < N * 4; i++) seeds[i] = Math.random();
      const seedB = instancedArray(seeds, "vec4");
      // Per-formation values the CPU knows exactly (cycle, placement); written in useFrame.
      const U = {
        base0: uniform(0, "uint"),
        base1: uniform(0, "uint"),
        morph: uniform(0),
        centre: uniform(new THREE.Vector3()),
        scale: uniform(SCALE.side),
        reset: uniform(1),
      };

      const kernel = Fn(() => {
        const i = instanceIndex;
        const T0 = tgtB.element(U.base0.add(i));
        const T1 = tgtB.element(U.base1.add(i));
        const P = posB.element(i);
        const V = velB.element(i);
        const time = u.uTime;

        // Rebuilt from the bottom up: low points leave first.
        const h = clamp(T0.y.add(0.5), 0, 1);
        const mk = clamp(U.morph.mul(1.6).sub(h.mul(0.6)), 0, 1);
        const local = mix(T0.xyz, T1.xyz, mk).mul(U.scale);
        // Alive at rest: slow breathing, and a gentle yaw sway about the vertical axis.
        const breathe = mx_noise_vec3(local.mul(2.5).add(vec3(0, time.mul(0.25), time.mul(0.15)))).mul(0.01);
        // The side is baked in as a literal on purpose: the WebGL2 fallback caches compute
        // programs by source, so two identical kernels would share the first one's buffers.
        const yaw = sin(time.mul(0.3).add(side)).mul(0.25);
        const cy = cos(yaw);
        const sy = sin(yaw);
        const home = vec3(local.x.mul(cy).add(local.z.mul(sy)), local.y, local.z.mul(cy).sub(local.x.mul(sy)))
          .add(breathe)
          .add(U.centre);

        // Charge: spiral in toward the card (a tight halo is left, the card hides the rest).
        const c2 = u.uCharge.mul(u.uCharge);
        const off = home.sub(u.uCard);
        const cs = cos(c2.mul(5));
        const sn = sin(c2.mul(5));
        const spun = vec3(off.x.mul(cs).sub(off.y.mul(sn)), off.x.mul(sn).add(off.y.mul(cs)), off.z);
        const target = u.uCard.add(spun.mul(c2.mul(-0.94).add(1)));

        // Spring.
        const acc = target.sub(P.xyz).mul(K).sub(V.mul(C)).toVar();

        // Hover scatter: distance in the screen-facing plane (the cursor lives on the card's
        // depth plane), push outward with a per-particle direction jitter that re-rolls 4×/s,
        // plus a noise swirl, so it disperses like disturbed dust rather than a clean ring.
        const dxy = vec3(P.x.sub(u.uCursor.x), P.y.sub(u.uCursor.y), 0);
        const dist = dxy.length();
        const fall = clamp(dist.div(R).oneMinus(), 0, 1);
        const w = fall.mul(fall).mul(u.uCursorOn);
        const fi = i.toFloat().mul(3).add(floor(time.mul(4)).mul(3));
        const jit = normalize(vec3(hash(fi), hash(fi.add(1)), hash(fi.add(2))).sub(0.5).add(1e-4)).mul(0.6);
        const push = normalize(dxy.div(max(dist, 1e-4)).add(jit));
        const swirl = mx_noise_vec3(P.xyz.mul(7).add(vec3(0, 0, time.mul(0.8))));
        acc.addAssign(push.mul(IMPULSE).add(swirl.mul(SWIRL)).mul(w));

        // Burst: thrown outward from the card.
        const out = normalize(P.xyz.sub(u.uCard).add(vec3(0, 0, 1e-4)));
        acc.addAssign(out.mul(u.uBurst.mul(BURST).mul(seedB.element(i).x.mul(0.8).add(0.6))));

        const v1 = V.add(acc.mul(dt));
        const p1 = P.xyz.add(v1.mul(dt));
        // (Re)appearing: start at rest on the targets, never with stale motion.
        const reset = U.reset.greaterThan(0.5).or(u.uForm.lessThan(0.02));
        P.assign(vec4(select(reset, target, p1), select(mk.lessThan(0.5), T0.w, T1.w)));
        V.assign(select(reset, vec3(0), v1));
      })().compute(N);

      // Entrance: stream out of the card face (a point picked by seed), staggered by seed.
      const P = posB.toAttribute();
      const S4 = seedB.toAttribute();
      const S = S4.x;
      const e = varying(smoothstep(S.mul(0.4), S.mul(0.4).add(0.6), u.uForm));
      const spawn = u.uCard.add(
        vec3(S4.y.sub(0.5).mul(CARD_W), S4.z.sub(0.5).mul(CARD_H * 0.98), FACE_Z + 0.01),
      );
      const wp = mix(spawn, P.xyz, e);
      const cc = varying(coc(modelViewMatrix.mul(vec4(wp, 1)).z.negate()));
      // Scattered dust sparkles: brighter with speed.
      const spark = varying(min(velB.toAttribute().length().mul(0.8), 1.2).add(1));
      const tag = varying(P.w);
      const mat = new THREE.SpriteNodeMaterial(ADDITIVE);
      mat.positionNode = wp;
      mat.scaleNode = S.mul(0.002).add(0.0035).mul(bokehScale(cc));
      mat.colorNode = select(tag.lessThan(0.5), GLOW, select(tag.lessThan(1.5), CHROME, METAL)).mul(spark);
      mat.opacityNode = bokehAlpha(uv(), cc).mul(e).mul(ALPHA);
      const sprite = new THREE.Sprite(mat);
      sprite.count = N;
      sprite.frustumCulled = false;
      sprite.visible = false;
      return { side, U, kernel, mat, sprite, was: false };
    };

    return { N, dt, forms: [formation(0), formation(1)] };
  }, [gltf, gl, u]);

  useEffect(() => {
    // Compile the kernels behind the loader, not on the finale's first frame.
    for (const f of parts.forms) void gl.computeAsync(f.kernel);
    return () => {
      for (const f of parts.forms) {
        f.kernel.dispose();
        f.mat.dispose();
      }
    };
  }, [parts, gl]);

  useFrame((_, delta) => {
    // One station every ~4.6 s; held on «اثر» for reduced motion, and no scatter.
    const F = values("Final");
    live.formCycle = reduced ? 6 : F.form > 0.5 ? live.formCycle + delta / 4.6 : 0;
    u.uForm.value = F.form;
    u.uTime.value = live.t;
    u.uCycle.value = live.formCycle;
    if (rig.card) u.uCard.value.copy(rig.card.position);
    u.uCursor.value.copy(live.cursor);
    u.uCursorOn.value = reduced ? 0 : live.cursorOn;
    u.uCharge.value = live.hands.charge;
    u.uBurst.value = live.burst;
    u.uPortrait.value = live.portrait ? 1 : 0;
    const form = u.uForm.value;
    const portrait = u.uPortrait.value > 0.5;
    const { N, forms } = parts;
    parts.dt.value = Math.min(delta, 1 / 30);
    for (const f of forms) {
      const on = form > 0.001 && !(portrait && f.side === 1);
      f.sprite.visible = on;
      f.sprite.count = on ? Math.max(1, Math.floor(N * quality.particles)) : 0;
      if (!on) {
        f.was = false;
        continue;
      }
      const s = u.uCycle.value + f.side * 3;
      const k = formStage(u.uCycle.value, f.side);
      f.U.base0.value = k * N;
      f.U.base1.value = ((k + 1) % STATIONS) * N;
      f.U.morph.value = THREE.MathUtils.smoothstep(s - Math.floor(s), 0.7, 1);
      const o = portrait ? FORM_OFFSETS.portrait : FORM_OFFSETS.sides[f.side];
      f.U.centre.value.set(o[0], o[1], o[2]).add(u.uCard.value);
      f.U.scale.value = portrait ? SCALE.portrait : SCALE.side;
      f.U.reset.value = f.was ? 0 : 1;
      f.was = true;
      gl.compute(f.kernel);
    }
  });

  return (
    <>
      <primitive object={parts.forms[0].sprite} />
      <primitive object={parts.forms[1].sprite} />
    </>
  );
}
