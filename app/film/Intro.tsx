"use client";

// Act one, "Chosen": a field of faint talent; one point is selected, travels to
// the centre and stretches into the blade of light that is the card's edge. Above
// it, the three partners descend as one braid of light and cinch into the point.
// In the finale the field returns around the card and gathers to the visitor's pointer.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARD_H } from "./Card";
import { bokehGLSL, cocGLSL, lens, motion, streakGLSL } from "./clock";

export type TalentU = {
  uTalent: { value: number };
  uChosen: { value: number };
  uTime: { value: number };
  /** 0→1 the braid descends, 1→2 it cinches into the point and dissolves. */
  uStreams: { value: number };
  /** z offset for the talent field only (finale: END_Z). */
  uFieldZ: { value: number };
  /** World-space pointer on the card's depth plane. */
  uCursor: { value: THREE.Vector3 };
  uCursorOn: { value: number };
};

const COUNT = 2500;
const TRAIL = 24;
const START = new THREE.Vector3(1.6, 0.75, -1.4);
const HEAD = 0.18;
const YOU = 0.12;
// The braid: one bundle per partner (Daneshmand, Bank Sina, Green Bank).
const BUNDLES = 3;
const STRANDS = 20;
const PER_STRAND = 150;
const BRAID = BUNDLES * STRANDS * PER_STRAND;

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Where the chosen point is, and how bright, at choreography value c. */
function chosenAt(c: number, out: THREE.Vector3) {
  if (c <= 0.3) return out.copy(START);
  if (c <= 0.8) return out.lerpVectors(START, new THREE.Vector3(), easeInOut((c - 0.3) / 0.5));
  return out.set(0, 0, 0);
}

const fieldVert = /* glsl */ `
${cocGLSL}
${streakGLSL}
uniform float uTime, uTalent, uChosenOn, uFieldZ, uCursorOn;
uniform vec3 uChosenPos, uCursor;
attribute float aSeed;
varying float vA;
varying float vC;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.07 + aSeed * 40.0) * 0.2;
  p.y += cos(uTime * 0.05 + aSeed * 31.0) * 0.15;
  p.z += uFieldZ;
  // The visitor's pointer: nearby talent drifts toward it, circling a little.
  vec3 rel = p - uCursor;
  float pull = uCursorOn * exp(-dot(rel, rel) / 0.5);
  p = mix(p, uCursor, pull * 0.4);
  p.xy += vec2(-rel.y, rel.x) * pull * (0.25 + 0.15 * sin(uTime * 0.9 + aSeed * 6.2832));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = distance(p, uChosenPos);
  float near = 1.0 + 2.0 * exp(-d * d / 1.44) * uChosenOn;
  vC = coc(-mv.z);
  gl_PointSize = (0.8 + aSeed * 1.8) * 26.0 / -mv.z * (0.8 + 0.2 * near) * (1.0 + vC * 2.5) * streakSize(uVel);
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) * 2.0 + aSeed * 90.0);
  vA = (0.15 + aSeed * 0.35) * twinkle * near * uTalent * (1.0 + 2.5 * pull);
}`;
const fieldFrag = /* glsl */ `
${bokehGLSL}
${streakGLSL}
varying float vA;
varying float vC;
void main() {
  float a = bokehAlpha(streakCoord(gl_PointCoord, uVel), vC);
  gl_FragColor = vec4(vec3(0.72, 0.84, 1.0) * 1.2, a * vA);
}`;

// Three bundles twist round a vertical axis that ends on the chosen point. Each
// bundle is 20 fibres winding round its centre; particles flow down their fibre.
const braidVert = /* glsl */ `
${cocGLSL}
uniform float uTime, uStreams;
uniform vec3 uChosenPos;
attribute float aBundle, aStrand, aU, aJit;
varying float vA;
varying float vC;
varying vec3 vCol;
const float TAU = 6.2831853;
void main() {
  float u = fract(aU + uTime * 0.04 * (0.5 + aJit));
  float reveal = smoothstep(aBundle * 0.18, aBundle * 0.18 + 0.64, clamp(uStreams, 0.0, 1.0));
  if (u > reveal) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  float d = clamp(uStreams - 1.0, 0.0, 1.0);
  float fade = 1.0 - smoothstep(0.3, 1.0, d);
  float cinch = (1.0 - smoothstep(0.85, 1.0, u)) * (1.0 - smoothstep(0.0, 0.5, d));
  float ang = TAU * aBundle / 3.0 + u * 2.5 * TAU + uTime * 0.4;
  vec3 radial = vec3(cos(ang), 0.0, sin(ang));
  float sa = aStrand * TAU + u * 4.0 * TAU;
  float sr = 0.05 * (0.4 + 0.6 * fract(aStrand * 7.31));
  vec3 p = uChosenPos + vec3(0.0, 4.5 * (1.0 - u) * fade, 0.0)
         + cinch * (0.5 * radial + sr * (cos(sa) * radial + vec3(0.0, sin(sa), 0.0)));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vC = coc(-mv.z);
  gl_PointSize = (0.6 + 0.6 * aJit) * 18.0 / -mv.z * (1.0 + vC * 2.5);
  float h = (reveal - u) / 0.03;
  vA = 0.5 * (1.0 + 2.0 * exp(-h * h)) * smoothstep(0.0, 0.06, u) * fade;
  vCol = (aBundle < 0.5 ? vec3(0.85, 0.92, 1.0) : aBundle < 1.5 ? vec3(0.45, 0.78, 1.0) : vec3(0.32, 0.55, 1.0)) * 1.5;
}`;
const braidFrag = /* glsl */ `
${bokehGLSL}
varying float vA;
varying float vC;
varying vec3 vCol;
void main() {
  gl_FragColor = vec4(vCol, bokehAlpha(gl_PointCoord, vC) * vA);
}`;

const trailVert = /* glsl */ `
attribute float aA;
varying float vA;
void main() {
  vA = aA;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = 60.0 * (0.4 + aA) / -mv.z;
}`;
const trailFrag = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(vec3(0.6, 0.85, 1.0) * 3.0, exp(-r * r * 5.0) * vA);
}`;

const headVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const headFrag = /* glsl */ `
uniform float uBright;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float glow = exp(-r * r * 5.0) + 0.8 * exp(-r * r * 40.0);
  gl_FragColor = vec4(vec3(0.75, 0.9, 1.0) * 5.0, glow * uBright * (1.0 - smoothstep(0.85, 1.0, r)));
}`;

export function Talent({ u }: { u: TalentU }) {
  const camera = useThree((s) => s.camera);
  const head = useRef<THREE.Mesh>(null);
  const you = useRef<THREE.Mesh>(null);
  const trailPoints = useRef<THREE.Points>(null);
  const braidPoints = useRef<THREE.Points>(null);

  const parts = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      p.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, -8 + Math.random() * 11], i * 3);
      seed[i] = Math.random();
    }
    const field = new THREE.BufferGeometry();
    field.setAttribute("position", new THREE.BufferAttribute(p, 3));
    field.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    const trail = new THREE.BufferGeometry();
    trail.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    trail.setAttribute("aA", new THREE.BufferAttribute(new Float32Array(TRAIL), 1));

    // Positions are computed in the shader, so the braid has no position attribute.
    const bundle = new Float32Array(BRAID);
    const strand = new Float32Array(BRAID);
    const along = new Float32Array(BRAID);
    const jit = new Float32Array(BRAID);
    for (let i = 0, k = 0; k < BUNDLES; k++) {
      for (let s = 0; s < STRANDS; s++) {
        const strandSeed = Math.random();
        for (let j = 0; j < PER_STRAND; j++, i++) {
          bundle[i] = k;
          strand[i] = strandSeed;
          along[i] = (j + Math.random()) / PER_STRAND;
          jit[i] = Math.random();
        }
      }
    }
    const braid = new THREE.BufferGeometry();
    braid.setAttribute("aBundle", new THREE.BufferAttribute(bundle, 1));
    braid.setAttribute("aStrand", new THREE.BufferAttribute(strand, 1));
    braid.setAttribute("aU", new THREE.BufferAttribute(along, 1));
    braid.setAttribute("aJit", new THREE.BufferAttribute(jit, 1));
    braid.setDrawRange(0, BRAID);

    const fieldUniforms = {
      uTime: u.uTime,
      uTalent: u.uTalent,
      uFieldZ: u.uFieldZ,
      uCursor: u.uCursor,
      uCursorOn: u.uCursorOn,
      uChosenOn: { value: 0 },
      uChosenPos: { value: new THREE.Vector3() },
      ...lens,
      ...motion,
    };
    const braidUniforms = {
      uTime: u.uTime,
      uStreams: u.uStreams,
      uChosenPos: fieldUniforms.uChosenPos,
      ...lens,
    };
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false };
    const glow = () =>
      new THREE.ShaderMaterial({ vertexShader: headVert, fragmentShader: headFrag, uniforms: { uBright: { value: 0 } }, ...additive });
    return {
      field,
      trail,
      braid,
      quad: new THREE.PlaneGeometry(1, 1),
      fieldUniforms,
      fieldMat: new THREE.ShaderMaterial({ vertexShader: fieldVert, fragmentShader: fieldFrag, uniforms: fieldUniforms, ...additive }),
      braidMat: new THREE.ShaderMaterial({ vertexShader: braidVert, fragmentShader: braidFrag, uniforms: braidUniforms, ...additive }),
      trailMat: new THREE.ShaderMaterial({ vertexShader: trailVert, fragmentShader: trailFrag, ...additive }),
      headMat: glow(),
      youMat: glow(),
    };
  }, [u]);

  useEffect(
    () => () => {
      for (const d of [
        parts.field,
        parts.trail,
        parts.braid,
        parts.quad,
        parts.fieldMat,
        parts.braidMat,
        parts.trailMat,
        parts.headMat,
        parts.youMat,
      ])
        d.dispose();
    },
    [parts],
  );

  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const c = u.uChosen.value;
    const live = c > 0.001 && c < 0.999;
    const bright = c <= 0.3 ? easeInOut(c / 0.3) : c <= 0.8 ? 1 : 1 - (c - 0.8) / 0.2;

    chosenAt(c, tmp);
    parts.fieldUniforms.uChosenPos.value.copy(tmp);
    parts.fieldUniforms.uChosenOn.value = live ? bright : 0;

    const h = head.current;
    if (h) {
      h.visible = live;
      h.position.copy(tmp);
      h.quaternion.copy(camera.quaternion);
      const k = c > 0.8 ? easeInOut((c - 0.8) / 0.2) : 0;
      h.scale.set(THREE.MathUtils.lerp(HEAD, 0.025, k), THREE.MathUtils.lerp(HEAD, CARD_H, k), 1);
      parts.headMat.uniforms.uBright.value = bright;
    }

    const s = u.uStreams.value;
    if (braidPoints.current) braidPoints.current.visible = s > 0.001 && s < 1.999;

    // "You": a soft point of light breathing at the visitor's pointer.
    const y = you.current;
    if (y) {
      const on = u.uCursorOn.value;
      const breath = Math.sin(u.uTime.value * 1.7);
      y.visible = on > 0.001;
      y.position.copy(u.uCursor.value);
      y.quaternion.copy(camera.quaternion);
      y.scale.setScalar(YOU * (1 + 0.08 * breath));
      parts.youMat.uniforms.uBright.value = on * (0.5 + 0.1 * breath);
    }

    // Trail: ghosts at earlier points of the journey, only while travelling.
    const pos = parts.trail.attributes.position as THREE.BufferAttribute;
    const alpha = parts.trail.attributes.aA as THREE.BufferAttribute;
    const fade = c < 0.3 ? 0 : 1 - THREE.MathUtils.clamp((c - 0.8) / 0.08, 0, 1);
    for (let j = 0; j < TRAIL; j++) {
      const cj = Math.max(0.3, c - (j + 1) * 0.008);
      chosenAt(cj, tmp);
      pos.setXYZ(j, tmp.x, tmp.y, tmp.z);
      alpha.setX(j, (1 - j / TRAIL) * 0.6 * fade);
    }
    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    if (trailPoints.current) trailPoints.current.visible = live && fade > 0;
  });

  return (
    <>
      <points geometry={parts.field} material={parts.fieldMat} frustumCulled={false} />
      <points ref={braidPoints} geometry={parts.braid} material={parts.braidMat} frustumCulled={false} visible={false} />
      <points ref={trailPoints} geometry={parts.trail} material={parts.trailMat} frustumCulled={false} />
      <mesh ref={head} geometry={parts.quad} material={parts.headMat} frustumCulled={false} />
      <mesh ref={you} geometry={parts.quad} material={parts.youMat} frustumCulled={false} visible={false} />
    </>
  );
}
