"use client";

// The achievement recap: the seven stage nodes lift off the card into a constellation,
// joined stage to stage by dotted links of light flowing upward. Child of the card group,
// like PathTrace. Everything moves in the vertex shaders; the CPU only toggles visibility.

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FACE_Z } from "./Card";
import { STAGES } from "./path";
import { GLOW, type PathU } from "./PathTrace";

const NODE_HALF = 0.05;
const DOT_HALF = 0.012;
const DOTS = 40;
const LINE_SEG = 24;

const onCard = (k: number) => [STAGES[k].pos[0], STAGES[k].pos[1], FACE_Z + 0.0015];
const lifted = (k: number) => [STAGES[k].pos[0] * 1.6, STAGES[k].pos[1] * 1.6, FACE_Z + 0.08 + 0.05 * k];

type Item = Record<string, number[]>;

// One vertex per item, or with `half` one camera-facing quad per item (corner offset in aC).
function geometry(items: Item[], half?: number) {
  const per = half ? 4 : 1;
  const g = new THREE.BufferGeometry();
  for (const name of Object.keys(items[0])) {
    const size = items[0][name].length;
    const arr = new Float32Array(items.length * per * size);
    items.forEach((it, i) => {
      for (let c = 0; c < per; c++) arr.set(it[name], (i * per + c) * size);
    });
    g.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  if (half) {
    const corner: number[] = [];
    const idx: number[] = [];
    items.forEach((_, i) => {
      corner.push(-half, -half, half, -half, half, half, -half, half);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    });
    g.setAttribute("aC", new THREE.Float32BufferAttribute(corner, 2));
    g.setIndex(idx);
  }
  return g;
}

// Link k→k+1 at arc parameter t: both ends on-card and lifted.
const linkItem = (k: number, t: number): Item => ({
  position: onCard(k),
  aB0: onCard(k + 1),
  aA1: lifted(k),
  aB1: lifted(k + 1),
  aK: [k],
  aT: [t],
});

const links = STAGES.slice(1).map((_, k) => k);

const common = /* glsl */ `
uniform float uLift, uTime;
attribute vec3 aA1;
attribute float aK;
varying float vA;
// Bottom stage lifts first.
float lk(float k) { return smoothstep(k * 0.06, k * 0.06 + 0.6, uLift); }
// A node's place: from the card face to its lifted spot, bobbing gently once up.
vec3 node(vec3 p0, vec3 p1, float k) {
  float l = lk(k);
  return mix(p0, p1, l) + l * vec3(0.004 * sin(uTime * 0.8 + k * 2.3), 0.01 * sin(uTime * 1.1 + k * 1.7), 0.0);
}`;

const linkChunk = /* glsl */ `
attribute vec3 aB0;
attribute vec3 aB1;
attribute float aT;
// Point t along link k→k+1, on a slight arch toward the viewer.
vec3 link(float t, float la) {
  vec3 p = mix(node(position, aA1, aK), node(aB0, aB1, aK + 1.0), t);
  p.z += 0.2 * t * (1.0 - t) * la;
  return p;
}`;

const billboard = /* glsl */ `
attribute vec2 aC;
varying vec2 vC;
vec4 billboard(vec3 p) {
  vC = aC;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  mv.xy += aC;
  return projectionMatrix * mv;
}`;

const nodeVert = /* glsl */ `
${common}
${billboard}
void main() {
  // Hand-off: the on-card node fades by (1 - uLift) as this one takes its light.
  vA = uLift;
  gl_Position = billboard(node(position, aA1, aK));
}`;
const nodeFrag = /* glsl */ `
varying vec2 vC;
varying float vA;
void main() {
  float r = length(vC);
  float aa = max(fwidth(r), 0.0005);
  float core = 1.0 - smoothstep(0.008, 0.008 + aa, r);
  float ring = smoothstep(0.027 - aa, 0.027, r) * (1.0 - smoothstep(0.03, 0.03 + aa, r));
  float halo = exp(-r * r * 2500.0);
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * (core * 6.0 + ring * 2.5 + halo * 1.5), vA);
}`;

const dotVert = /* glsl */ `
${common}
${linkChunk}
${billboard}
void main() {
  float t = fract(aT + uTime * 0.35);
  float la = min(lk(aK), lk(aK + 1.0));
  vA = la * smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.9, 1.0, t));
  gl_Position = billboard(link(t, la));
}`;
const dotFrag = /* glsl */ `
varying vec2 vC;
varying float vA;
void main() {
  float r = length(vC) * ${(1 / DOT_HALF).toFixed(3)};
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * 3.0, exp(-r * r * 9.0) * vA);
}`;

const lineVert = /* glsl */ `
${common}
${linkChunk}
void main() {
  float la = min(lk(aK), lk(aK + 1.0));
  vA = la * 0.12;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(link(aT, la), 1.0);
}`;
const lineFrag = /* glsl */ `
varying float vA;
void main() { gl_FragColor = vec4(0.45, 0.78, 1.0, vA); }`;

export function Constellation({ u }: { u: PathU }) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(() => {
    const mat = (vertexShader: string, fragmentShader: string) =>
      new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: u, ...GLOW });
    return {
      nodes: geometry(STAGES.map((_, k) => ({ position: onCard(k), aA1: lifted(k), aK: [k] })), NODE_HALF),
      // Evenly spaced seeds: a dotted line that flows.
      dots: geometry(links.flatMap((k) => Array.from({ length: DOTS }, (_, i) => linkItem(k, i / DOTS))), DOT_HALF),
      lines: geometry(
        links.flatMap((k) =>
          Array.from({ length: LINE_SEG }, (_, i) => [linkItem(k, i / LINE_SEG), linkItem(k, (i + 1) / LINE_SEG)]).flat(),
        ),
      ),
      nodeMat: mat(nodeVert, nodeFrag),
      dotMat: mat(dotVert, dotFrag),
      lineMat: mat(lineVert, lineFrag),
    };
  }, [u]);

  useEffect(
    () => () => {
      for (const d of Object.values(parts)) d.dispose();
    },
    [parts],
  );

  useFrame(() => {
    if (group.current) group.current.visible = u.uLift.value > 0.001;
  });

  return (
    <group ref={group} visible={false}>
      <lineSegments geometry={parts.lines} material={parts.lineMat} frustumCulled={false} renderOrder={5} />
      <mesh geometry={parts.dots} material={parts.dotMat} frustumCulled={false} renderOrder={6} />
      <mesh geometry={parts.nodes} material={parts.nodeMat} frustumCulled={false} renderOrder={7} />
    </group>
  );
}
