"use client";

// The card's face, assembled from the chosen light (Card.form): ~12k points sampled off
// the artwork leave the braid's helix and land on their own pixel, circuit first, while
// the face resolves underneath. Card-local: render inside <Card>. All motion is in the
// vertex shader.

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARD_H, CARD_TEXTURES, CARD_W, FACE_Z, FRONT_BOX, readPixels } from "./Card";
import { bokehGLSL, cocGLSL, lens } from "./clock";

const COUNT = 12000;
const SW = 220;
const SH = 358;

const vert = /* glsl */ `
${cocGLSL}
uniform float uForm, uTime;
attribute vec3 aStart;
attribute vec3 aColor;
attribute float aOrder;
attribute float aSeed;
varying vec3 vCol;
varying float vA;
varying float vC;
void main() {
  float k = smoothstep(0.0, 1.0, clamp((uForm * 1.3 - aOrder) / 0.35, 0.0, 1.0));
  // The helix keeps turning while points wait their turn, so flights curve in.
  float a = uTime * 0.6;
  vec3 s = vec3(aStart.x * cos(a) - aStart.z * sin(a), aStart.y, aStart.x * sin(a) + aStart.z * cos(a));
  vec3 swirl = 0.06 * vec3(sin(uTime * 1.7 + aSeed * 61.0), cos(uTime * 1.3 + aSeed * 37.0), sin(uTime * 1.1 + aSeed * 23.0));
  vec3 p = mix(s, position, k) + swirl * (1.0 - k);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vC = coc(-mv.z);
  gl_PointSize = (0.7 + 0.6 * aSeed) * 12.0 / -mv.z * (1.0 + vC * 2.5);
  vCol = mix(aColor * 1.6, vec3(0.45, 0.78, 1.0), 1.0 - k);
  vA = 0.85 * (1.0 - smoothstep(0.6, 1.0, k)) * smoothstep(0.0, 0.06, uForm) * (1.0 - smoothstep(0.94, 0.999, uForm));
}`;

const frag = /* glsl */ `
${bokehGLSL}
varying vec3 vCol;
varying float vA;
varying float vC;
void main() {
  gl_FragColor = vec4(vCol, bokehAlpha(gl_PointCoord, vC) * vA);
}`;

export function Assemble({ u }: { u: { uForm: { value: number }; uTime: { value: number } } }) {
  const [front, , mask] = useLoader(THREE.TextureLoader, CARD_TEXTURES);
  const points = useRef<THREE.Points>(null);

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
    const N = Math.max(COUNT, traces.length);
    const face = new Float32Array(N * 3);
    const start = new Float32Array(N * 3);
    const color = new Float32Array(N * 3);
    const order = new Float32Array(N);
    const seed = new Float32Array(N);
    const c = new THREE.Color();
    const B = FRONT_BOX;
    for (let j = 0; j < N; j++) {
      const isTrace = j < traces.length;
      const i = isTrace ? traces[j] : metal[Math.floor(Math.random() * metal.length)];
      // Artwork pixel (jittered inside its sample cell) → face position, inverse of Card's face UVs.
      const ix = (((i % SW) + Math.random()) / SW) * B.w;
      const iy = ((Math.floor(i / SW) + Math.random()) / SH) * B.h;
      face.set([((ix - B.x0) / (B.x1 - B.x0) - 0.5) * CARD_W, ((B.y1 - iy) / (B.y1 - B.y0) - 0.5) * CARD_H, FACE_Z + 0.003], j * 3);
      c.setRGB(art[i * 4] / 255, art[i * 4 + 1] / 255, art[i * 4 + 2] / 255, THREE.SRGBColorSpace);
      color.set([c.r, c.g, c.b], j * 3);
      order[j] = isTrace ? Math.random() * 0.35 : 0.3 + Math.random() * 0.7;
      seed[j] = Math.random();
      // The triple braid continues as a helix wrapped around the card, trailing up above it.
      const y = -CARD_H / 2 + Math.random() * (CARD_H + 1.6);
      const ang = ((j % 3) * Math.PI * 2) / 3 + y * 2.4 + (seed[j] - 0.5) * 0.5;
      const r = 0.9 + (Math.random() - 0.5) * 0.12;
      start.set([Math.cos(ang) * r, y, Math.sin(ang) * r], j * 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(face, 3));
    geo.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    geo.setAttribute("aOrder", new THREE.BufferAttribute(order, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uForm: u.uForm, uTime: u.uTime, ...lens },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, mat };
  }, [front, mask, u]);

  useEffect(
    () => () => {
      parts.geo.dispose();
      parts.mat.dispose();
    },
    [parts],
  );

  useFrame(() => {
    if (points.current) points.current.visible = u.uForm.value > 0.001 && u.uForm.value < 0.999;
  });

  return <points ref={points} geometry={parts.geo} material={parts.mat} frustumCulled={false} />;
}
