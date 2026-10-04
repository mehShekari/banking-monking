"use client";

// The lit trace: a pulse climbing the card's circuit through the seven stages.
// Child of the card group, so everything here is in card-local coordinates.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FACE_Z } from "./Card";
import { PATH, PATH_S, STAGES, pointAt } from "./path";

type Num = { value: number };
/** Shared with Constellation; Scene writes it every frame. */
export type PathU = {
  uHead: Num;
  uAlpha: Num;
  uTime: Num;
  /** Arc fraction the next stage is pre-lit to (staged funding); ≤ uHead means none. */
  uAhead: Num;
  /** Position of the achievement wave along the arc, -0.2…1.2. */
  uRecap: Num;
  /** Constellation lift, 0…1. */
  uLift: Num;
};

/** Additive glow over the card face; shared with Constellation. */
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

// Nodes: one quad per stage, ring + core + arrival flash drawn in the shader.
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

const ribbonVert = /* glsl */ `
attribute float aS;
attribute float aX;
varying float vS;
varying float vX;
void main() {
  vS = aS;
  vX = aX;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// Lit up to uHead (with the recap wave riding it); dim dashed "allocated" stretch up to uAhead.
const ribbonFrag = /* glsl */ `
uniform float uHead, uAlpha, uAhead, uRecap, uLift;
varying float vS;
varying float vX;
void main() {
  float front = max(uHead, uAhead);
  if (vS > front) discard;
  float across = 1.0 - smoothstep(0.45, 1.0, abs(vX));
  float b;
  if (vS <= uHead) {
    float tip = smoothstep(uHead, uHead - 0.003, vS);
    float w = (vS - uRecap) / 0.02;
    b = tip * (1.2 + 7.0 * exp(-(uHead - vS) * 35.0) + 6.0 * exp(-w * w));
  } else {
    float dash = 1.0 - smoothstep(0.4, 0.6, fract(vS * 260.0));
    b = 0.42 * dash + 6.0 * exp(-(front - vS) * 300.0);
  }
  b *= 1.0 - 0.55 * uLift;
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * b, across * uAlpha);
}`;

const nodeVert = /* glsl */ `
attribute vec2 aL;
attribute float aS;
varying vec2 vL;
varying float vS;
void main() {
  vL = aL;
  vS = aS;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const nodeFrag = /* glsl */ `
uniform float uHead, uAlpha, uRecap, uLift;
varying vec2 vL;
varying float vS;
float band(float r, float a, float b, float aa) {
  return smoothstep(a - aa, a, r) * (1.0 - smoothstep(b, b + aa, r));
}
// Expanding ring as a front (the pulse head, or the recap wave) passes this node.
float flash(float h, float r, float aa) {
  float f = clamp((h - vS) / 0.08, 0.0, 1.0);
  float fr = mix(0.012, 0.048, f);
  return smoothstep(vS - 0.002, vS, h) * (1.0 - f) * band(r, fr - 0.003, fr, aa);
}
void main() {
  float r = length(vL);
  float aa = max(fwidth(r), 0.0005);
  float lit = smoothstep(vS - 0.002, vS, uHead);
  float shape = band(r, 0.008, 0.012, aa) + 1.0 - smoothstep(0.004, 0.004 + aa, r);
  float fl = flash(uHead, r, aa) + flash(uRecap, r, aa);
  float b = shape * mix(0.6, 3.5, lit) + fl * 5.0;
  float a = (shape * mix(0.25, 1.0, lit) + fl) * uAlpha * (1.0 - uLift);
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * b, a);
}`;

const headFrag = /* glsl */ `
uniform float uHead, uAlpha, uTime, uLift;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float glow = exp(-r * r * 6.0) + 0.6 * exp(-r * r * 40.0);
  float flicker = 0.88 + 0.12 * sin(uTime * 23.0) * sin(uTime * 7.3);
  float end = 1.0 - 0.6 * smoothstep(0.995, 1.0, uHead);
  gl_FragColor = vec4(vec3(0.6, 0.85, 1.0) * 6.0, glow * flicker * end * uAlpha * (1.0 - 0.55 * uLift) * (1.0 - smoothstep(0.9, 1.0, r)));
}`;
const uvVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function PathTrace({ u }: { u: PathU }) {
  const head = useRef<THREE.Mesh>(null);
  const { ribbon, nodes, sprite, ribbonMat, nodeMat, headMat } = useMemo(
    () => ({
      ribbon: buildRibbon(),
      nodes: buildNodes(),
      sprite: new THREE.PlaneGeometry(0.06, 0.06),
      ribbonMat: new THREE.ShaderMaterial({ vertexShader: ribbonVert, fragmentShader: ribbonFrag, uniforms: u, ...GLOW }),
      nodeMat: new THREE.ShaderMaterial({ vertexShader: nodeVert, fragmentShader: nodeFrag, uniforms: u, ...GLOW }),
      headMat: new THREE.ShaderMaterial({ vertexShader: uvVert, fragmentShader: headFrag, uniforms: u, ...GLOW }),
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
