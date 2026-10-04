"use client";

// The card, built from the artwork until the real glTF arrives. To swap it in:
// load the model here, keep the group/face/edge refs on `rig`, and the
// timeline, circuit nodes and network keep working unchanged.

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three/webgpu";
import {
  abs,
  attribute,
  clamp,
  color,
  cos,
  dot,
  exp,
  floor,
  float,
  fract,
  fwidth,
  instancedBufferAttribute,
  length,
  materialColor,
  max,
  mix,
  modelViewMatrix,
  positionGeometry,
  pow,
  rand,
  screenDPR,
  select,
  sin,
  smoothstep,
  step,
  texture,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
  diffuseColor,
} from "three/tsl";
import type { Node } from "three/webgpu";
import { SDF_SPREAD } from "./sdf";
import { makeCardU, makeNetworkU, type CardU, type NetworkU } from "./tsl";

export const CARD_W = 1;
export const CARD_H = 2868 / 1764;
const T = 0.016;
const BEVEL = 0.0035;
// Measured off the artwork: corner radius ≈110 px of a 1755 px wide card.
export const RADIUS = 0.063;
export const FACE_Z = T / 2 + BEVEL + 0.0004;
// One list so every useLoader call shares the same cached textures.
export const CARD_TEXTURES = [
  "/images/card-front.webp",
  "/images/card-back.webp",
  "/images/circuit-mask.png",
  "/images/name-sdf.png",
];
// Front artwork's opaque pixel box (right/bottom edges exclusive); the face UVs map onto it.
export const FRONT_BOX = { w: 1764, h: 2868, x0: 5, x1: 1760, y0: 5, y1: 2864 };

export type Rig = {
  card: THREE.Group | null;
  faces: THREE.MeshPhysicalNodeMaterial[];
  edge: THREE.MeshPhysicalNodeMaterial | null;
  uniforms: CardU;
  network: NetworkU;
};

export function createRig(): Rig {
  return { card: null, faces: [], edge: null, uniforms: makeCardU(), network: makeNetworkU() };
}

/** The card's outline (counter-clockwise), centred on the origin. */
export function roundedRect(w: number, h: number, r: number) {
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

// Value noise on a lattice of `rand` (the GLSL era's formNoise, 1:1).
const formNoise = (p: Node<"vec2">) => {
  const i = floor(p);
  const f0 = fract(p);
  const f = f0.mul(f0).mul(f0.mul(-2).add(3));
  return mix(
    mix(rand(i), rand(i.add(vec2(1, 0))), f.x),
    mix(rand(i.add(vec2(0, 1))), rand(i.add(1)), f.x),
    f.y,
  );
};

// The artwork's calligraphy white (sRGB #e7e7e8, measured inside the letters).
const LETTER = () => color(0xe7e7e8);

// Brushed-metal face with: a resolve from light (uForm, both faces), a travelling light
// sweep (both faces), and on the front the living circuit, the calligraphy written by
// light (from its distance field), micro brushed streaks and the path head's light pool.
function faceNodes(mat: THREE.MeshPhysicalNodeMaterial, U: CardU, mask: THREE.Texture, nameSdf: THREE.Texture, front: boolean) {
  const fuv = uv();
  const m = texture(mask, fuv).r;

  // Built from light: the face resolves through a noise field (traces first), a thin light on the edge.
  // Coarse cells: the face resolves in clumps along the circuit, not as grain.
  const noise = formNoise(fuv.mul(vec2(16, 26)));
  const f = front ? mix(noise, m.oneMinus(), 0.6) : noise;
  const thr = U.uForm.mul(1.12).sub(0.06);
  const forming = U.uForm.lessThan(0.999);
  mat.maskNode = forming.not().or(f.lessThanEqual(thr));
  const edgeLight = select(forming, vec3(0.45, 0.78, 1.0).mul(smoothstep(0, 0.02, thr.sub(f)).oneMinus().mul(2.2)), vec3(0));

  const dir = vec2(cos(U.uSweepAngle), sin(U.uSweepAngle));
  const s = dot(fuv.sub(0.5), dir).add(0.5);
  const c = mix(-0.4, 1.4, fract(U.uSweep));
  const a = s.sub(c).div(0.026);
  const b = s.sub(c).add(0.08).div(0.14);
  const band = exp(a.mul(a).negate()).mul(1.05).add(exp(b.mul(b).negate()).mul(0.3));
  let emissive: Node<"vec3"> = edgeLight.add(
    vec3(0.78, 0.88, 1.0).mul(band.mul(diffuseColor.b.add(0.35)).mul(front ? 1.0 : 0.4)),
  );

  if (front) {
    // Calligraphy: d in artwork px (+ outside); the edge is antialiased by its own derivative,
    // so letters stay razor sharp at any zoom.
    const nd = float(0.5).sub(texture(nameSdf, fuv).r).mul(2 * SDF_SPREAD);
    const naa = max(fwidth(nd), 0.01);
    const nm = smoothstep(naa.negate(), naa, nd).oneMinus();

    // Albedo: the artwork, its letters replaced by the crisp white up close (uDetail). (A
    // procedural brushed-metal layer was tried and cut: it cost ~15% of the card frames for a
    // texture the artwork already carries.)
    mat.colorNode = mix(materialColor.rgb, LETTER(), nm.mul(U.uDetail));

    // The path head's soft pool of light on the metal (card-local units, so it stays round).
    const hd = length(positionGeometry.xy.sub(U.uHeadUv.sub(0.5).mul(vec2(CARD_W, CARD_H)))).div(0.05);
    emissive = emissive.add(vec3(0.45, 0.78, 1.0).mul(U.uHeadOn.mul(0.14).mul(exp(hd.mul(hd).negate()))));

    const col = floor(fuv.x.mul(110));
    const h = fract(sin(col.mul(12.9898).add(4.1)).mul(43758.5453));
    // Holding the card charges it: every trace on, brighter, faster.
    const on = max(smoothstep(h.mul(0.7), h.mul(0.7).add(0.3), U.uGlow), U.uCharge);
    const d = abs(fuv.y.sub(0.575));
    const p = fract(d.mul(2.6).sub(U.uTime.mul(U.uCharge.mul(0.9).add(0.3))).add(h.mul(0.75)));
    const pulse = pow(p, 16);
    const g = max(U.uGlow, U.uCharge).mul(U.uCharge.mul(2.5).add(1));
    emissive = emissive.add(
      vec3(0.38, 0.72, 1.0).mul(m.mul(on.mul(pulse.mul(5).add(0.35)).mul(g).add(U.uCharge.mul(0.15)))),
    );
    // The name is written by light right to left (Persian reading order), then glows by uNameGlow.
    const xw = mix(1.08, -0.08, U.uIgnite);
    const written = smoothstep(xw.sub(0.015), xw.add(0.015), fuv.x);
    const lx = fuv.x.sub(xw).div(0.012);
    const lead = exp(lx.mul(lx).negate()).mul(step(U.uIgnite, 0.999));
    emissive = emissive.add(vec3(0.85, 0.93, 1.0).mul(nm.mul(written.mul(U.uNameGlow).mul(0.8).add(lead.mul(3)))));
  }
  mat.emissiveNode = emissive;
}

/** RGBA bytes of an image drawn at w×h. */
export function readPixels(img: CanvasImageSource, w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

// The network's motion: each point leaves its trace for the shell (aNet) as uMix rises.
function netMotion(N: NetworkU, card: Node<"vec3">, net: Node<"vec3">, delay: Node<"float">) {
  const m0 = clamp(N.uMix.mul(1.6).sub(delay.mul(0.6)), 0, 1);
  const m = m0.mul(m0).mul(m0.mul(-2).add(3));
  const a = N.uTime.mul(0.12);
  const rot = vec3(net.x.mul(cos(a)).sub(net.z.mul(sin(a))), net.y, net.x.mul(sin(a)).add(net.z.mul(cos(a))));
  const wobble = vec3(
    sin(N.uTime.mul(0.7).add(delay.mul(21))),
    cos(N.uTime.mul(0.5).add(delay.mul(13))),
    sin(N.uTime.mul(0.4).add(delay.mul(7))),
  );
  const p = mix(card, rot, m).add(wobble.mul(m.mul(0.05)));
  const alpha = smoothstep(0, 0.1, N.uMix).mul(m.mul(0.65).add(0.35));
  return { p, m, alpha };
}

// Points sampled on the real traces; on the finale burst they leave the card for a shell around it.

function buildNetwork(mask: THREE.Texture, N: NetworkU) {
  const img = mask.image as HTMLImageElement;
  const w = 240;
  const h = Math.round((w * img.height) / img.width);
  const px = readPixels(img, w, h);
  const hits: number[] = [];
  for (let i = 0; i < w * h; i++) if (px[i * 4] > 120) hits.push(i);

  const count = Math.min(1400, hits.length);
  const card = new Float32Array(count * 3);
  const net = new Float32Array(count * 3);
  const delay = new Float32Array(count);
  for (let i = 0; i < count; i++) {
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
  for (let i = 0; i < count; i++) {
    let b1 = -1, b2 = -1, d1 = 0.3, d2 = 0.3;
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const d = Math.hypot(net[i * 3] - net[j * 3], net[i * 3 + 1] - net[j * 3 + 1], net[i * 3 + 2] - net[j * 3 + 2]);
      if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = j; } else if (d < d2) { d2 = d; b2 = j; }
    }
    if (b1 > i) seg.push(i, b1);
    if (b2 > i) seg.push(i, b2);
  }

  // Points: one instanced sprite, sized in pixels like the GLSL era's gl_PointSize.
  const pv = netMotion(
    N,
    instancedBufferAttribute(new THREE.InstancedBufferAttribute(card, 3), "vec3"),
    instancedBufferAttribute(new THREE.InstancedBufferAttribute(net, 3), "vec3"),
    instancedBufferAttribute(new THREE.InstancedBufferAttribute(delay, 1), "float"),
  );
  const pointMat = new THREE.PointsNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  pointMat.sizeAttenuation = false;
  pointMat.positionNode = pv.p;
  // uSize carries the pixel ratio already; the material multiplies by it again.
  const depth = modelViewMatrix.mul(vec4(pv.p, 1)).z.negate();
  pointMat.sizeNode = N.uSize.mul(pv.m.add(0.5)).div(depth).div(screenDPR);
  pointMat.colorNode = vec3(0.45, 0.78, 1.0).mul(1.17);
  pointMat.opacityNode = smoothstep(0.5, 0, length(uv().sub(0.5))).mul(varying(pv.alpha)).mul(0.8);
  const points = new THREE.Sprite(pointMat);
  points.count = count;
  points.frustumCulled = false;

  const lines = new THREE.BufferGeometry();
  const pick = (src: Float32Array, size: number) => {
    const out = new Float32Array(seg.length * size);
    seg.forEach((v, i) => out.set(src.subarray(v * size, v * size + size), i * size));
    return out;
  };
  lines.setAttribute("position", new THREE.BufferAttribute(pick(card, 3), 3));
  lines.setAttribute("aNet", new THREE.BufferAttribute(pick(net, 3), 3));
  lines.setAttribute("aDelay", new THREE.BufferAttribute(pick(delay, 1), 1));
  const lv = netMotion(N, positionGeometry, attribute("aNet", "vec3"), attribute("aDelay", "float"));
  const lineMat = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  lineMat.positionNode = lv.p;
  lineMat.colorNode = vec3(0.45, 0.78, 1.0).mul(1.4);
  lineMat.opacityNode = varying(lv.alpha).mul(0.3);
  return { points, pointMat, lines, lineMat };
}

// Face geometry with UVs mapped onto the artwork's opaque box (the PNGs carry a few px of transparent margin),
// so faces can be fully opaque: no alpha-cut edges.
function faceGeometry(shape: THREE.Shape, img: { w: number; h: number; x0: number; x1: number; y0: number; y1: number }) {
  const g = new THREE.ShapeGeometry(shape, 48);
  const pos = g.attributes.position;
  const uvs = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const tx = pos.getX(i) / CARD_W + 0.5;
    const ty = pos.getY(i) / CARD_H + 0.5;
    uvs.setXY(i, (img.x0 + tx * (img.x1 - img.x0)) / img.w, (img.h - img.y1 + ty * (img.y1 - img.y0)) / img.h);
  }
  return g;
}

export function Card({ rig, children }: { rig: Rig; children?: ReactNode }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const scene = useThree((s) => s.scene);
  const [front, back, mask, nameSdf] = useLoader(THREE.TextureLoader, CARD_TEXTURES);

  const parts = useMemo(() => {
    const maxAniso = gl.getMaxAnisotropy();
    front.colorSpace = back.colorSpace = THREE.SRGBColorSpace;
    // The calligraphy's distance field: linear data, filtered like the artwork.
    nameSdf.colorSpace = THREE.NoColorSpace;
    for (const t of [front, back, nameSdf]) {
      t.anisotropy = maxAniso;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.needsUpdate = true;
    }
    mask.colorSpace = THREE.NoColorSpace;

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
      const m = new THREE.MeshPhysicalNodeMaterial({
        map,
        metalness: isFront ? 0.35 : 0.12,
        roughness: isFront ? 0.36 : 0.6,
        clearcoat: isFront ? 0.6 : 0,
        clearcoatRoughness: 0.22,
        anisotropy: isFront ? 0.7 : 0.25,
        anisotropyRotation: Math.PI / 2,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      faceNodes(m, rig.uniforms, mask, nameSdf, isFront);
      return m;
    };
    const frontMat = faceMat(front, true);
    const backMat = faceMat(back, false);
    // Caps and edge are the card's own brushed navy metal: they catch light, never read as a black outline.
    const metal = { color: "#1b2747", metalness: 1, roughness: 0.3, anisotropy: 0.5, anisotropyRotation: Math.PI / 2 };
    const capMat = new THREE.MeshPhysicalNodeMaterial(metal);
    const edgeMat = new THREE.MeshPhysicalNodeMaterial({ ...metal, emissive: "#dce8ff", emissiveIntensity: 0 });
    rig.faces = [frontMat, backMat];
    rig.edge = edgeMat;

    return { body, frontFace, backFace, frontMat, backMat, capMat, edgeMat, net: buildNetwork(mask, rig.network) };
  }, [front, back, mask, nameSdf, rig, gl]);

  // Node materials only honour envMapIntensity (which Scene animates) when envMap is their own,
  // so hand them the scene's environment once it exists (WebGLRenderer did this implicitly).
  useFrame(() => {
    const env = scene.environment;
    if (!env || parts.frontMat.envMap === env) return;
    for (const m of [parts.frontMat, parts.backMat, parts.capMat, parts.edgeMat]) {
      m.envMap = env;
      m.needsUpdate = true;
    }
  });

  useEffect(
    () => () => {
      for (const g of [parts.body, parts.frontFace, parts.backFace, parts.net.lines]) g.dispose();
      for (const m of [parts.frontMat, parts.backMat, parts.capMat, parts.edgeMat, parts.net.pointMat, parts.net.lineMat]) m.dispose();
    },
    [parts],
  );

  return (
    <group ref={(g) => void (rig.card = g)}>
      <mesh geometry={parts.body} material={[parts.capMat, parts.edgeMat]} />
      <mesh geometry={parts.frontFace} material={parts.frontMat} position-z={FACE_Z} />
      <mesh geometry={parts.backFace} material={parts.backMat} position-z={-FACE_Z} rotation-y={Math.PI} />
      <primitive object={parts.net.points} />
      <lineSegments geometry={parts.net.lines} material={parts.net.lineMat} frustumCulled={false} />
      {children}
    </group>
  );
}
