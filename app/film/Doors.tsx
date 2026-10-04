"use client";

// The doors: the card's own circuit, enlarged into card-shaped gates that split
// and swing open as the card (a blade of light) passes through them.

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CARD_H } from "./Card";
import { DOORS_Z } from "./storyboard";

export const DOOR_W = 2.4;
export const DOOR_H = DOOR_W * CARD_H;
const R = 0.063 * DOOR_W;
const LINE = 0.012;

type U = { uAlpha: { value: number }; uCardZ: { value: number }; uTime: { value: number } };

/** A rounded rect from x0..x1, rounding only the corners on the sides listed. */
function halfShape(x0: number, x1: number, roundLeft: boolean, roundRight: boolean, h: number, r: number) {
  const y0 = -h / 2;
  const y1 = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + (roundLeft ? r : 0), y0);
  s.lineTo(x1 - (roundRight ? r : 0), y0);
  if (roundRight) s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - (roundRight ? r : 0));
  if (roundRight) s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + (roundLeft ? r : 0), y1);
  if (roundLeft) s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + (roundLeft ? r : 0));
  if (roundLeft) s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/** Half panel in hinge space: the outer (hinged) edge sits at x = 0. UVs span the full door. */
function halfGeometry(side: -1 | 1) {
  const w = DOOR_W / 2;
  // left half spans [0, w] from its hinge; right half spans [-w, 0]
  const g = new THREE.ShapeGeometry(side < 0 ? halfShape(0, w, true, false, DOOR_H, R) : halfShape(-w, 0, false, true, DOOR_H, R), 24);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const doorX = p.getX(i) + (side < 0 ? -w : w);
    uv.setXY(i, doorX / DOOR_W + 0.5, p.getY(i) / DOOR_H + 0.5);
  }
  return g;
}

function outlineGeometry() {
  const outer = halfShape(-DOOR_W / 2, DOOR_W / 2, true, true, DOOR_H, R);
  const inner = halfShape(-DOOR_W / 2 + LINE, DOOR_W / 2 - LINE, true, true, DOOR_H - LINE * 2, R - LINE);
  outer.holes.push(new THREE.Path(inner.getPoints(24).reverse()));
  return new THREE.ShapeGeometry(outer, 24);
}

const vert = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const panelFrag = /* glsl */ `
uniform sampler2D uMask;
uniform float uAlpha, uTime, uOpen;
varying vec2 vUv;
varying float vDepth;
void main() {
  float m = texture2D(uMask, vUv).r;
  vec3 blue = vec3(0.45, 0.78, 1.0);
  float pulse = pow(fract(abs(vUv.y - 0.575) * 1.6 - uTime * 0.28 + vUv.x * 0.15), 14.0);
  vec3 col = vec3(0.02, 0.05, 0.13) + blue * m * (1.3 + pulse * 3.5);
  float a = 0.22 + m * 0.6;
  float inner = 1.0 - smoothstep(0.0, 0.02, abs(vUv.x - 0.5));
  col += blue * inner * (0.4 + 3.0 * uOpen);
  a = max(a, inner * (0.4 + 0.6 * uOpen));
  float fade = (1.0 - smoothstep(9.0, 18.0, vDepth)) * smoothstep(0.8, 3.6, vDepth);
  gl_FragColor = vec4(col, a * uAlpha * fade);
}`;

const outlineFrag = /* glsl */ `
uniform float uAlpha;
varying float vDepth;
void main() {
  float fade = (1.0 - smoothstep(9.0, 18.0, vDepth)) * smoothstep(0.8, 3.6, vDepth);
  gl_FragColor = vec4(vec3(0.5, 0.8, 1.0) * 1.2, uAlpha * fade);
}`;

export function Doors({ u }: { u: U }) {
  const mask = useLoader(THREE.TextureLoader, "/images/circuit-mask.png");
  const hinges = useRef<(THREE.Group | null)[]>([]);

  const { left, right, outline, panels, outlineMat } = useMemo(() => {
    const panels = DOORS_Z.map(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: vert,
          fragmentShader: panelFrag,
          uniforms: { uMask: { value: mask }, uAlpha: u.uAlpha, uTime: u.uTime, uOpen: { value: 0 } },
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
    );
    const outlineMat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: outlineFrag,
      uniforms: { uAlpha: u.uAlpha },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    return { left: halfGeometry(-1), right: halfGeometry(1), outline: outlineGeometry(), panels, outlineMat };
  }, [mask, u]);

  useEffect(
    () => () => {
      for (const d of [left, right, outline, outlineMat, ...panels]) d.dispose();
    },
    [left, right, outline, outlineMat, panels],
  );

  useFrame(() => {
    const visible = u.uAlpha.value > 0.001;
    DOORS_Z.forEach((z, k) => {
      // 0 while the card is 1.2 in front of the door, 1 once it is 0.6 past it.
      const k01 = THREE.MathUtils.clamp((z + 1.2 - u.uCardZ.value) / 1.8, 0, 1);
      const open = k01 * k01 * (3 - 2 * k01);
      panels[k].uniforms.uOpen.value = open;
      const l = hinges.current[k * 2];
      const r = hinges.current[k * 2 + 1];
      if (l && r) {
        l.position.x = -DOOR_W / 2 - open * DOOR_W * 0.55;
        r.position.x = DOOR_W / 2 + open * DOOR_W * 0.55;
        l.rotation.y = 0.55 * open;
        r.rotation.y = -0.55 * open;
        l.visible = r.visible = visible;
      }
    });
  });

  return (
    <>
      {DOORS_Z.map((z, k) => (
        <group key={z} position-z={z}>
          <group ref={(g) => void (hinges.current[k * 2] = g)} position-x={-DOOR_W / 2}>
            <mesh geometry={left} material={panels[k]} frustumCulled={false} />
          </group>
          <group ref={(g) => void (hinges.current[k * 2 + 1] = g)} position-x={DOOR_W / 2}>
            <mesh geometry={right} material={panels[k]} frustumCulled={false} />
          </group>
          <mesh geometry={outline} material={outlineMat} frustumCulled={false} />
        </group>
      ))}
    </>
  );
}
