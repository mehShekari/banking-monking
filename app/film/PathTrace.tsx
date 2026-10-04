"use client";

// The lit trace: a pulse climbing the card's circuit through the seven stages.
// Child of the card group, so everything here is in card-local coordinates.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  abs,
  attribute,
  clamp,
  exp,
  float,
  fract,
  fwidth,
  length,
  max,
  mix,
  select,
  sin,
  smoothstep,
  uv,
  vec3,
} from "three/tsl";
import { FACE_Z } from "./Card";
import { PATH, PATH_S, STAGES, pointAt } from "./path";
import type { PathU } from "./tsl";

export type { PathU } from "./tsl";

type F = THREE.Node<"float">;

/** Additive glow over the card face (node-material options); shared with Constellation. */
export const GLOW = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  fog: false,
};

const Z = FACE_Z + 0.0012;
const HALF = 0.0034;
const NODE_HALF = 0.05;
const BLUE = () => vec3(0.45, 0.78, 1.0);

// Ribbon: one strip with mitred joins, so corners never overlap or gap.
function buildRibbon() {
  const n = PATH.length;
  const pos = new Float32Array(n * 2 * 3);
  const s = new Float32Array(n * 2);
  const x = new Float32Array(n * 2);
  const idx: number[] = [];
  const dir = (a: [number, number], b: [number, number]) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  for (let i = 0; i < n; i++) {
    const dPrev = i > 0 ? dir(PATH[i - 1], PATH[i]) : dir(PATH[0], PATH[1]);
    const dNext = i < n - 1 ? dir(PATH[i], PATH[i + 1]) : dPrev;
    const nPrev = [-dPrev[1], dPrev[0]];
    const nNext = [-dNext[1], dNext[0]];
    let mx = nPrev[0] + nNext[0];
    let my = nPrev[1] + nNext[1];
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml;
    my /= ml;
    const scale = HALF / Math.max(0.35, mx * nPrev[0] + my * nPrev[1]);
    const [px, py] = PATH[i];
    pos.set([px + mx * scale, py + my * scale, Z, px - mx * scale, py - my * scale, Z], i * 6);
    s.set([PATH_S[i], PATH_S[i]], i * 2);
    x.set([1, -1], i * 2);
    if (i < n - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aS", new THREE.BufferAttribute(s, 1));
  g.setAttribute("aX", new THREE.BufferAttribute(x, 1));
  g.setIndex(idx);
  return g;
}

// Nodes: one quad per stage, ring + core + arrival flash drawn in the material.
function buildNodes() {
  const pos: number[] = [];
  const local: number[] = [];
  const s: number[] = [];
  const idx: number[] = [];
  STAGES.forEach((st, k) => {
    const [cx, cy] = st.pos;
    for (const [lx, ly] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pos.push(cx + lx * NODE_HALF, cy + ly * NODE_HALF, Z + 0.0003);
      local.push(lx * NODE_HALF, ly * NODE_HALF);
      s.push(st.s);
    }
    const a = k * 4;
    idx.push(a, a + 1, a + 2, a, a + 2, a + 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aL", new THREE.Float32BufferAttribute(local, 2));
  g.setAttribute("aS", new THREE.Float32BufferAttribute(s, 1));
  g.setIndex(idx);
  return g;
}

// Lit up to uHead (with the recap wave riding it); dim dashed "allocated" stretch up to uAhead.
function ribbonMaterial(u: PathU) {
  const vS = attribute<"float">("aS", "float");
  const vX = attribute<"float">("aX", "float");
  const front = max(u.uHead, u.uAhead);
  const across = smoothstep(0.45, 1, abs(vX)).oneMinus();
  const tip = smoothstep(u.uHead.sub(0.003), u.uHead, vS).oneMinus();
  const w = vS.sub(u.uRecap).div(0.02);
  const lit = tip.mul(
    exp(u.uHead.sub(vS).mul(-35))
      .mul(7)
      .add(1.2)
      .add(exp(w.mul(w).negate()).mul(6)),
  );
  const dash = smoothstep(0.4, 0.6, fract(vS.mul(260))).oneMinus();
  const ahead = dash.mul(0.42).add(exp(front.sub(vS).mul(-300)).mul(6));
  const b = select(vS.lessThanEqual(u.uHead), lit, ahead).mul(u.uLift.mul(0.55).oneMinus());
  const m = new THREE.MeshBasicNodeMaterial(GLOW);
  m.maskNode = vS.lessThanEqual(front); // discard beyond the front
  m.colorNode = BLUE().mul(b);
  m.opacityNode = across.mul(u.uAlpha);
  return m;
}

function nodeMaterial(u: PathU) {
  const vL = attribute<"vec2">("aL", "vec2");
  const vS = attribute<"float">("aS", "float");
  const r = length(vL);
  const aa = max(fwidth(r), 0.0005);
  const band = (a: F, b: F) =>
    smoothstep(a.sub(aa), a, r).mul(smoothstep(b, aa.add(b), r).oneMinus());
  // Expanding ring as a front (the pulse head, or the recap wave) passes this node.
  const flash = (h: F) => {
    const f = clamp(h.sub(vS).div(0.08), 0, 1);
    const fr = mix(0.012, 0.048, f);
    return smoothstep(vS.sub(0.002), vS, h).mul(f.oneMinus()).mul(band(fr.sub(0.003), fr));
  };
  const lit = smoothstep(vS.sub(0.002), vS, u.uHead);
  const shape = band(float(0.008), float(0.012)).add(smoothstep(0.004, aa.add(0.004), r).oneMinus());
  const fl = flash(u.uHead).add(flash(u.uRecap));
  const m = new THREE.MeshBasicNodeMaterial(GLOW);
  m.colorNode = BLUE().mul(shape.mul(mix(0.6, 3.5, lit)).add(fl.mul(5)));
  m.opacityNode = shape.mul(mix(0.25, 1, lit)).add(fl).mul(u.uAlpha).mul(u.uLift.oneMinus());
  return m;
}

function headMaterial(u: PathU) {
  const r = length(uv().sub(0.5)).mul(2);
  const r2 = r.mul(r);
  const glow = exp(r2.mul(-6)).add(exp(r2.mul(-40)).mul(0.6));
  const flicker = sin(u.uTime.mul(23)).mul(sin(u.uTime.mul(7.3))).mul(0.12).add(0.88);
  const end = smoothstep(0.995, 1, u.uHead).mul(0.6).oneMinus();
  const m = new THREE.MeshBasicNodeMaterial(GLOW);
  m.colorNode = vec3(0.6, 0.85, 1.0).mul(6);
  m.opacityNode = glow
    .mul(flicker)
    .mul(end)
    .mul(u.uAlpha)
    .mul(u.uLift.mul(0.55).oneMinus())
    .mul(smoothstep(0.9, 1, r).oneMinus());
  return m;
}

export function PathTrace({ u }: { u: PathU }) {
  const head = useRef<THREE.Mesh>(null);
  const { ribbon, nodes, sprite, ribbonMat, nodeMat, headMat } = useMemo(
    () => ({
      ribbon: buildRibbon(),
      nodes: buildNodes(),
      sprite: new THREE.PlaneGeometry(0.06, 0.06),
      ribbonMat: ribbonMaterial(u),
      nodeMat: nodeMaterial(u),
      headMat: headMaterial(u),
    }),
    [u],
  );

  useEffect(
    () => () => {
      for (const d of [ribbon, nodes, sprite, ribbonMat, nodeMat, headMat]) d.dispose();
    },
    [ribbon, nodes, sprite, ribbonMat, nodeMat, headMat],
  );

  const tmp = useMemo<[number, number]>(() => [0, 0], []);
  useFrame(() => {
    if (!head.current) return;
    pointAt(u.uHead.value, tmp);
    head.current.position.set(tmp[0], tmp[1], Z + 0.0006);
    head.current.visible = u.uAlpha.value > 0.001;
  });

  return (
    <>
      <mesh geometry={ribbon} material={ribbonMat} frustumCulled={false} renderOrder={2} />
      <mesh geometry={nodes} material={nodeMat} frustumCulled={false} renderOrder={3} />
      <mesh ref={head} geometry={sprite} material={headMat} frustumCulled={false} renderOrder={4} />
    </>
  );
}
