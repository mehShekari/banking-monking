"use client";

// The card born from light (Card.form 0→1, ~6 s of scroll). Sparks spill off the blade's
// rim, pour into a curl-noise current wrapped around the card, then land on their own
// artwork pixel: the circuit first (outward from the name), then the rest, while the face
// resolves underneath. Card-local: render inside <Card>.
//
// Scrub-safe: every particle's position is a closed-form function of uForm and its seed,
// so scrolling backwards replays the same frames. A compute kernel evaluates it once per
// frame, only inside the emergence window; the sprites just read the result.

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  atan,
  clamp,
  cos,
  exp,
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
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { CARD_H, CARD_W } from "@/modules/film/constants/card";
import { CARD_TEXTURES, FACE_Z, FRONT_BOX, RADIUS, readPixels, roundedRect } from "./Card";
import { live } from "../live";
import { values } from "../theatre";
import { ADDITIVE, bokehAlpha, bokehScale, coc, makeEmergeU, quality } from "../tsl";

const SW = 220;
const SH = 358;
// The name's baseline on the face (uv.y), where the circuit pulses start; traces land outward from it.
const NAME_Y = 0.575;

export function Emergence() {
  const u = useMemo(makeEmergeU, []);
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const [front, , mask] = useLoader(THREE.TextureLoader, CARD_TEXTURES);
  const sprite = useRef<THREE.Sprite>(null);

  const parts = useMemo(() => {
    const art = readPixels(front.image as HTMLImageElement, SW, SH);
    const trace = readPixels(mask.image as HTMLImageElement, SW, SH);
    // Every trace pixel (thin at this size, so all of them), the metal fills the rest.
    const traces: number[] = [];
    const metal: number[] = [];
    for (let i = 0; i < SW * SH; i++) {
      if (art[i * 4 + 3] < 128) continue;
      (trace[i * 4] > 60 ? traces : metal).push(i);
    }
    const isGPU = (gl.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend === true;
    // Phones get half the WebGPU budget: same look at their size, half the overdraw.
    const small = typeof window !== "undefined" && window.matchMedia("(pointer: coarse), (max-width: 820px)").matches;
    const N = Math.max(isGPU ? (small ? 65536 : 131072) : 32768, traces.length);

    // Spawn points on the blade's rim: the card outline, with its outward normal.
    const rimPts = roundedRect(CARD_W, CARD_H, RADIUS).getSpacedPoints(2048);
    rimPts.pop(); // closed shape: the last point repeats the first

    const tgt = new Float32Array(N * 4); // face position, order
    const col = new Float32Array(N * 4); // linear artwork colour, seed
    const rim = new Float32Array(N * 4); // rim xy, outward normal xy
    const c = new THREE.Color();
    const B = FRONT_BOX;
    for (let j = 0; j < N; j++) {
      const isTrace = j < traces.length;
      const i = isTrace ? traces[j] : metal[Math.floor(Math.random() * metal.length)];
      // Artwork pixel (jittered inside its sample cell) → face position, inverse of Card's face UVs.
      const ix = (((i % SW) + Math.random()) / SW) * B.w;
      const iy = ((Math.floor(i / SW) + Math.random()) / SH) * B.h;
      const ty = (B.y1 - iy) / (B.y1 - B.y0);
      const order = isTrace
        ? Math.min(0.35, (Math.abs(ty - NAME_Y) / NAME_Y) * 0.3 + Math.random() * 0.05)
        : 0.3 + Math.random() * 0.7;
      tgt.set([((ix - B.x0) / (B.x1 - B.x0) - 0.5) * CARD_W, (ty - 0.5) * CARD_H, FACE_Z + 0.003, order], j * 4);
      c.setRGB(art[i * 4] / 255, art[i * 4 + 1] / 255, art[i * 4 + 2] / 255, THREE.SRGBColorSpace);
      col.set([c.r, c.g, c.b, Math.random()], j * 4);
      const k = Math.floor(Math.random() * rimPts.length);
      const a = rimPts[(k + rimPts.length - 1) % rimPts.length];
      const b = rimPts[(k + 1) % rimPts.length];
      const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      // Counter-clockwise outline: outward normal is the tangent turned clockwise.
      rim.set([rimPts[k].x, rimPts[k].y, (b.y - a.y) / tl, -(b.x - a.x) / tl], j * 4);
    }

    const tgtB = instancedArray(tgt, "vec4");
    const colB = instancedArray(col, "vec4");
    const rimB = instancedArray(rim, "vec4");
    const posB = instancedArray(N, "vec4"); // position, light
    const mixB = instancedArray(N, "float"); // light → artwork colour

    const kernel = Fn(() => {
      const i = instanceIndex;
      const T = tgtB.element(i);
      const R = rimB.element(i);
      const f = u.uForm;
      // Four independent per-particle randoms (float seeds keep the WGSL types unmixed).
      const fi = i.toFloat().mul(4);
      const h1 = hash(fi);
      const h2 = hash(fi.add(1));
      const h3 = hash(fi.add(2));
      const h4 = hash(fi.add(3));

      // Ignition: born on the rim within the first 9% and spilling outward like sparks off a cut.
      const born = h1.mul(0.09);
      const s = max(f.sub(born), 0);
      const side = select(h2.greaterThan(0.5), 1, -1);
      const dir = normalize(vec3(R.zw.mul(h3.add(0.6)), h4.mul(0.9).add(0.15).mul(side)));
      const spill = exp(s.mul(-28)).oneMinus().mul(h3.mul(0.18).add(0.06));
      const p0 = vec3(R.xy, h2.sub(0.5).mul(0.016)).add(dir.mul(spill));

      // The pour: the spill joins a current orbiting the card's vertical axis, folded by noise.
      const e = smoothstep(0.03, 0.25, s);
      const r = mix(vec2(p0.x, p0.z).length(), h3.mul(0.45).add(0.55), e);
      const th = atan(p0.z, p0.x).add(h4.mul(10).add(12).mul(max(s.sub(0.03), 0)).mul(e));
      const flow = vec3(cos(th).mul(r), p0.y, sin(th).mul(r));
      const f1 = flow.add(mx_noise_vec3(flow.mul(1.3).add(vec3(0, s.mul(-2.5), s.mul(1.2)))).mul(e.mul(0.22)));
      const f2 = f1.add(mx_noise_vec3(f1.mul(3.1).add(vec3(s.mul(3), 0, 7.3))).mul(e.mul(0.07)));

      // Landing: circuit (order < 0.35) over 0.45–0.75, the rest over 0.75–0.93, each on a
      // light spring (ease-out-back, ~5% overshoot in the face plane, none in depth).
      const order = T.w;
      const circuit = order.lessThan(0.35);
      const ls = select(circuit, order.div(0.35).mul(0.2).add(0.45), order.sub(0.3).div(0.7).mul(0.1).add(0.75));
      const dur = select(circuit, 0.1, 0.08);
      const x = clamp(f.sub(ls).div(dur), 0, 1).sub(1);
      const k = x.mul(x).mul(x.mul(2.2).add(1.2)).add(1);
      const pxy = mix(f2.xy, T.xy, k);
      const pz = mix(f2.z, T.z, min(k, 1));

      // Light: a spark flare at birth, a short hold on the pixel, then fade; all gone by 1.
      const lit = smoothstep(0, 0.012, f.sub(born))
        .mul(exp(s.mul(-40)).mul(2.5).add(1))
        .mul(smoothstep(0.02, 0.07, f.sub(ls.add(dur))).oneMinus())
        .mul(smoothstep(0.93, 0.999, f).oneMinus());

      posB.element(i).assign(vec4(pxy, pz, lit));
      mixB.element(i).assign(smoothstep(0.3, 1, x.add(1)));
    })().compute(N);

    // The look: tiny light motes with lens bokeh, blue-white in flight, artwork colour on landing.
    const P = posB.toAttribute();
    const C = colB.toAttribute();
    const cm = mixB.toAttribute();
    const cc = varying(coc(modelViewMatrix.mul(vec4(P.xyz, 1)).z.negate()));
    // 131k additive motes would blow out where Assemble's 12k did not; dim with the count.
    const alpha = 0.85 * Math.sqrt(12000 / N);
    const shimmer = sin(u.uTime.mul(6).add(C.w.mul(40))).mul(0.15).add(0.85);
    const mat = new THREE.SpriteNodeMaterial(ADDITIVE);
    mat.positionNode = P.xyz;
    mat.scaleNode = C.w.mul(0.006).add(0.006).mul(bokehScale(cc));
    mat.colorNode = mix(vec3(0.6, 0.82, 1.0).mul(shimmer.mul(1.6)), C.xyz.mul(1.4), cm);
    mat.opacityNode = bokehAlpha(uv(), cc).mul(P.w).mul(alpha);
    const s = new THREE.Sprite(mat);
    s.count = N;
    s.userData.full = N;
    s.frustumCulled = false;
    s.visible = false;
    return { kernel, mat, sprite: s };
  }, [front, mask, u, gl]);

  useEffect(() => {
    // Compile the kernel behind the loader, not on the first emergence frame.
    void gl.computeAsync(parts.kernel);
    return () => {
      parts.kernel.dispose();
      parts.mat.dispose();
    };
  }, [parts, gl]);

  useFrame(() => {
    u.uForm.value = values("Card").form;
    u.uTime.value = live.t;
    const f = u.uForm.value;
    const on = f > 0.001 && f < 0.999;
    const sp = sprite.current;
    if (sp) {
      sp.visible = on;
      // Draw fewer motes when the governor asks (the kernel still updates all of them).
      sp.count = Math.max(1, Math.floor((sp.userData.full as number) * quality.particles));
    }
    if (on) gl.compute(parts.kernel);
  });

  return <primitive ref={sprite} object={parts.sprite} />;
}
