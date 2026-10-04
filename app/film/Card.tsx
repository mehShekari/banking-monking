"use client";

// The card, built from the artwork until the real glTF arrives. To swap it in:
// load the model here, keep the group/face/edge refs on `rig`, and the
// timeline, circuit shader and network keep working unchanged.

import { useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";

export const CARD_W = 1;
export const CARD_H = 2868 / 1764;
const T = 0.016;
const BEVEL = 0.0035;
// Measured off the artwork: corner radius ≈110 px of a 1755 px wide card.
const RADIUS = 0.063;
export const FACE_Z = T / 2 + BEVEL + 0.0004;
// One list so every useLoader call shares the same cached textures.
export const CARD_TEXTURES = [
  "/images/card-front.webp",
  "/images/card-back.webp",
  "/images/circuit-mask.png",
  "/images/name-mask.png",
];
// Front artwork's opaque pixel box (right/bottom edges exclusive); the face UVs map onto it.
export const FRONT_BOX = { w: 1764, h: 2868, x0: 5, x1: 1760, y0: 5, y1: 2864 };

export type Rig = {
  card: THREE.Group | null;
  faces: THREE.MeshPhysicalMaterial[];
  edge: THREE.MeshStandardMaterial | null;
  uniforms: {
    uTime: { value: number };
    uGlow: { value: number };
    uSweep: { value: number };
    uSweepAngle: { value: number };
    uCharge: { value: number };
    uForm: { value: number };
    uIgnite: { value: number };
    uNameGlow: { value: number };
  };
  network: { uMix: { value: number }; uTime: { value: number }; uSize: { value: number } };
};

export function createRig(): Rig {
  return {
    card: null,
    faces: [],
    edge: null,
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uSweep: { value: 0 },
      uSweepAngle: { value: 0.35 },
      uCharge: { value: 0 },
      uForm: { value: 0 },
      uIgnite: { value: 0 },
      uNameGlow: { value: 0 },
    },
    network: { uMix: { value: 0 }, uTime: { value: 0 }, uSize: { value: 28 } },
  };
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Brushed-metal face with: a resolve from light (uForm, both faces), a travelling light
// sweep (both faces), and on the front the living circuit and the calligraphy written
// by light, both read from masks traced off the artwork.
function patchFace(mat: THREE.MeshPhysicalMaterial, rig: Rig, mask: THREE.Texture, name: THREE.Texture, front: boolean) {
  // Both faces share this onBeforeCompile source; keep their programs apart.
  mat.customProgramCacheKey = () => (front ? "card-face-front" : "card-face-back");
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, rig.uniforms, { uMask: { value: mask }, uName: { value: name } });
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uMask, uName;
uniform float uTime, uGlow, uSweep, uSweepAngle, uCharge, uForm, uIgnite, uNameGlow;
float formNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), f.x), mix(rand(i + vec2(0.0, 1.0)), rand(i + 1.0), f.x), f.y);
}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
{
  vec2 uv = vMapUv;
  // Built from light: the face resolves through a noise field (traces first), a thin light on the edge.
  if (uForm < 0.999) {
    float f = ${front ? "mix(formNoise(uv * vec2(40.0, 65.0)), 1.0 - texture2D(uMask, uv).r, 0.6)" : "formNoise(uv * vec2(40.0, 65.0))"};
    float thr = uForm * 1.12 - 0.06;
    if (f > thr) discard;
    totalEmissiveRadiance += vec3(0.45, 0.78, 1.0) * 2.2 * (1.0 - smoothstep(0.0, 0.02, thr - f));
  }
  vec2 dir = vec2(cos(uSweepAngle), sin(uSweepAngle));
  float s = dot(uv - 0.5, dir) + 0.5;
  float c = mix(-0.4, 1.4, fract(uSweep));
  float band = exp(-pow((s - c) / 0.026, 2.0)) * 1.05 + exp(-pow((s - c + 0.08) / 0.14, 2.0)) * 0.3;
  totalEmissiveRadiance += vec3(0.78, 0.88, 1.0) * band * (0.35 + diffuseColor.b) * ${front ? "1.0" : "0.4"};
  ${
    front
      ? `float m = texture2D(uMask, uv).r;
  float col = floor(uv.x * 110.0);
  float h = fract(sin(col * 12.9898 + 4.1) * 43758.5453);
  // Holding the card charges it: every trace on, brighter, faster.
  float on = max(smoothstep(h * 0.7, h * 0.7 + 0.3, uGlow), uCharge);
  float d = abs(uv.y - 0.575);
  float p = fract(d * 2.6 - uTime * (0.3 + 0.9 * uCharge) + h * 0.75);
  float pulse = pow(p, 16.0);
  float g = max(uGlow, uCharge) * (1.0 + 2.5 * uCharge);
  totalEmissiveRadiance += vec3(0.38, 0.72, 1.0) * m * (on * (0.35 + pulse * 5.0) * g + 0.15 * uCharge);
  // The name is written by light right to left (Persian reading order), then glows by uNameGlow.
  float nm = texture2D(uName, uv).r;
  float xw = mix(1.08, -0.08, uIgnite);
  float written = smoothstep(xw - 0.015, xw + 0.015, uv.x);
  float lx = (uv.x - xw) / 0.012;
  float lead = exp(-lx * lx) * step(uIgnite, 0.999);
  totalEmissiveRadiance += vec3(0.85, 0.93, 1.0) * nm * (written * uNameGlow * 0.8 + lead * 3.0);`
      : ""
  }
}`,
      );
  };
}

const netVert = /* glsl */ `
attribute vec3 aNet;
attribute float aDelay;
uniform float uMix, uTime, uSize;
varying float vA;
void main() {
  float m = clamp(uMix * 1.6 - aDelay * 0.6, 0.0, 1.0);
  m = m * m * (3.0 - 2.0 * m);
  float a = uTime * 0.12;
  vec3 net = vec3(aNet.x * cos(a) - aNet.z * sin(a), aNet.y, aNet.x * sin(a) + aNet.z * cos(a));
  vec3 p = mix(position, net, m);
  p += m * 0.05 * vec3(sin(uTime * 0.7 + aDelay * 21.0), cos(uTime * 0.5 + aDelay * 13.0), sin(uTime * 0.4 + aDelay * 7.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.5 + m) / -mv.z;
  vA = smoothstep(0.0, 0.1, uMix) * (0.35 + 0.65 * m);
}`;

const pointFrag = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * 1.17, a * vA * 0.8);
}`;

const lineFrag = /* glsl */ `
varying float vA;
void main() { gl_FragColor = vec4(vec3(0.45, 0.78, 1.0) * 1.4, vA * 0.3); }`;

/** RGBA bytes of an image drawn at w×h. */
export function readPixels(img: CanvasImageSource, w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

// Points sampled on the real traces; on the finale burst they leave the card for a shell around it.

function buildNetwork(mask: THREE.Texture) {
  const img = mask.image as HTMLImageElement;
  const w = 240;
  const h = Math.round((w * img.height) / img.width);
  const px = readPixels(img, w, h);
  const hits: number[] = [];
  for (let i = 0; i < w * h; i++) if (px[i * 4] > 120) hits.push(i);

  const N = Math.min(1400, hits.length);
  const card = new Float32Array(N * 3);
  const net = new Float32Array(N * 3);
  const delay = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const k = hits[Math.floor(Math.random() * hits.length)];
    const x = ((k % w) / w - 0.5) * CARD_W;
    const y = (0.5 - Math.floor(k / w) / h) * CARD_H;
    card.set([x, y, FACE_Z + 0.002], i * 3);
    // Mostly a random direction, lightly biased toward where the trace sat.
    const u = Math.random() * 2 - 1;
    const th = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(1 - u * u);
    const d = new THREE.Vector3(rr * Math.cos(th) + x * 0.5, u + y * 0.35, rr * Math.sin(th)).normalize();
    d.multiplyScalar(1.45 + Math.random() * 0.45);
    net.set([d.x, d.y, d.z], i * 3);
    delay[i] = Math.random();
  }

  // Two nearest neighbours on the shell, short links only.
  const seg: number[] = [];
  for (let i = 0; i < N; i++) {
    let b1 = -1, b2 = -1, d1 = 0.3, d2 = 0.3;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const d = Math.hypot(net[i * 3] - net[j * 3], net[i * 3 + 1] - net[j * 3 + 1], net[i * 3 + 2] - net[j * 3 + 2]);
      if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = j; } else if (d < d2) { d2 = d; b2 = j; }
    }
    if (b1 > i) seg.push(i, b1);
    if (b2 > i) seg.push(i, b2);
  }

  const points = new THREE.BufferGeometry();
  points.setAttribute("position", new THREE.BufferAttribute(card, 3));
  points.setAttribute("aNet", new THREE.BufferAttribute(net, 3));
  points.setAttribute("aDelay", new THREE.BufferAttribute(delay, 1));

  const lines = new THREE.BufferGeometry();
  const pick = (src: Float32Array, size: number) => {
    const out = new Float32Array(seg.length * size);
    seg.forEach((v, i) => out.set(src.subarray(v * size, v * size + size), i * size));
    return out;
  };
  lines.setAttribute("position", new THREE.BufferAttribute(pick(card, 3), 3));
  lines.setAttribute("aNet", new THREE.BufferAttribute(pick(net, 3), 3));
  lines.setAttribute("aDelay", new THREE.BufferAttribute(pick(delay, 1), 1));
  return { points, lines };
}

// Face geometry with UVs mapped onto the artwork's opaque box (the PNGs carry a few px of transparent margin),
// so faces can be fully opaque: no alpha-cut edges.
function faceGeometry(shape: THREE.Shape, img: { w: number; h: number; x0: number; x1: number; y0: number; y1: number }) {
  const g = new THREE.ShapeGeometry(shape, 48);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const tx = pos.getX(i) / CARD_W + 0.5;
    const ty = pos.getY(i) / CARD_H + 0.5;
    uv.setXY(i, (img.x0 + tx * (img.x1 - img.x0)) / img.w, (img.h - img.y1 + ty * (img.y1 - img.y0)) / img.h);
  }
  return g;
}

export function Card({ rig, children }: { rig: Rig; children?: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const [front, back, mask, name] = useLoader(THREE.TextureLoader, CARD_TEXTURES);

  const parts = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    for (const t of [front, back]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
    }
    mask.colorSpace = THREE.NoColorSpace;
    name.colorSpace = THREE.NoColorSpace;

    const shape = roundedRect(CARD_W, CARD_H, RADIUS);
    const body = new THREE.ExtrudeGeometry(shape, {
      depth: T,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 4,
      curveSegments: 48,
    });
    body.translate(0, 0, -T / 2);

    // Opaque pixel boxes measured off the PNGs (right/bottom edges exclusive).
    const frontFace = faceGeometry(shape, FRONT_BOX);
    const backFace = faceGeometry(shape, { w: 1764, h: 2853, x0: 4, x1: 1762, y0: 4, y1: 2851 });

    const faceMat = (map: THREE.Texture, isFront: boolean) => {
      const m = new THREE.MeshPhysicalMaterial({
        map,
        metalness: isFront ? 0.35 : 0.12,
        roughness: isFront ? 0.36 : 0.6,
        clearcoat: isFront ? 0.6 : 0,
        clearcoatRoughness: 0.22,
        anisotropy: isFront ? 0.7 : 0.25,
        anisotropyRotation: Math.PI / 2,
        emissive: "#000000",
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      patchFace(m, rig, mask, name, isFront);
      return m;
    };
    const frontMat = faceMat(front, true);
    const backMat = faceMat(back, false);
    // Caps and edge are the card's own brushed navy metal: they catch light, never read as a black outline.
    const metal = { color: "#1b2747", metalness: 1, roughness: 0.3, anisotropy: 0.5, anisotropyRotation: Math.PI / 2 };
    const capMat = new THREE.MeshPhysicalMaterial(metal);
    const edgeMat = new THREE.MeshPhysicalMaterial({ ...metal, emissive: "#dce8ff", emissiveIntensity: 0 });
    rig.faces = [frontMat, backMat];
    rig.edge = edgeMat;

    const net = buildNetwork(mask);
    const netUniforms = rig.network;
    const pointMat = new THREE.ShaderMaterial({
      vertexShader: netVert,
      fragmentShader: pointFrag,
      uniforms: netUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lineMat = new THREE.ShaderMaterial({
      vertexShader: netVert,
      fragmentShader: lineFrag,
      uniforms: netUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { body, frontFace, backFace, frontMat, backMat, capMat, edgeMat, net, pointMat, lineMat };
  }, [front, back, mask, name, rig, gl]);

  useEffect(
    () => () => {
      for (const g of [parts.body, parts.frontFace, parts.backFace, parts.net.points, parts.net.lines]) g.dispose();
      for (const m of [parts.frontMat, parts.backMat, parts.capMat, parts.edgeMat, parts.pointMat, parts.lineMat]) m.dispose();
    },
    [parts],
  );

  return (
    <group ref={(g) => void (rig.card = g)}>
      <mesh geometry={parts.body} material={[parts.capMat, parts.edgeMat]} />
      <mesh geometry={parts.frontFace} material={parts.frontMat} position-z={FACE_Z} />
      <mesh geometry={parts.backFace} material={parts.backMat} position-z={-FACE_Z} rotation-y={Math.PI} />
      <points geometry={parts.net.points} material={parts.pointMat} frustumCulled={false} />
      <lineSegments geometry={parts.net.lines} material={parts.lineMat} frustumCulled={false} />
      {children}
    </group>
  );
}
