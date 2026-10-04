"use client";

// The doors: the card's own circuit, enlarged into card-shaped gates that split
// and swing open as the card (a blade of light) passes through them.

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { abs, fract, max, positionView, pow, smoothstep, texture, uniform, uv, vec3 } from "three/tsl";
import { CARD_H } from "@/modules/film/constants/card";
import { DOORS_Z } from "@/modules/film/timeline/storyboard";
import { live } from "../live";
import { values } from "../theatre";
import { type DoorsU, makeDoorsU, SIGNAL } from "../tsl";

const DOOR_W = 2.4;
export const DOOR_H = DOOR_W * CARD_H;
const R = 0.063 * DOOR_W;
const LINE = 0.012;

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

// Fades with view depth: out in the distance, and just before the camera passes through.
const depthFade = () => {
  const depth = positionView.z.negate();
  return smoothstep(9, 18, depth).oneMinus().mul(smoothstep(0.8, 3.6, depth));
};

function panelMaterial(mask: THREE.Texture, u: DoorsU, uOpen: THREE.UniformNode<"float", number>) {
  const vUv = uv();
  const m = texture(mask, vUv).r;
  const blue = SIGNAL();
  const pulse = pow(fract(abs(vUv.y.sub(0.575)).mul(1.6).sub(u.uTime.mul(0.28)).add(vUv.x.mul(0.15))), 14);
  const inner = smoothstep(0, 0.02, abs(vUv.x.sub(0.5))).oneMinus();
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  mat.colorNode = vec3(0.02, 0.05, 0.13)
    .add(blue.mul(m).mul(pulse.mul(3.5).add(1.3)))
    .add(blue.mul(inner).mul(uOpen.mul(3).add(0.4)));
  mat.opacityNode = max(m.mul(0.6).add(0.22), inner.mul(uOpen.mul(0.6).add(0.4)))
    .mul(u.uAlpha)
    .mul(depthFade());
  return mat;
}

function outlineMaterial(u: DoorsU) {
  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  mat.colorNode = vec3(0.5, 0.8, 1.0).mul(1.2);
  mat.opacityNode = u.uAlpha.mul(depthFade());
  return mat;
}

export function Doors() {
  const u = useMemo(makeDoorsU, []);
  const mask = useLoader(THREE.TextureLoader, "/images/circuit-mask.png");
  const hinges = useRef<(THREE.Group | null)[]>([]);

  const { left, right, outline, opens, panels, outlineMat } = useMemo(() => {
    const opens = DOORS_Z.map(() => uniform(0));
    return {
      left: halfGeometry(-1),
      right: halfGeometry(1),
      outline: outlineGeometry(),
      opens,
      panels: opens.map((o) => panelMaterial(mask, u, o)),
      outlineMat: outlineMaterial(u),
    };
  }, [mask, u]);

  useEffect(
    () => () => {
      for (const d of [left, right, outline, outlineMat, ...panels]) d.dispose();
    },
    [left, right, outline, outlineMat, panels],
  );

  useFrame(() => {
    u.uAlpha.value = values("Doors").alpha;
    u.uCardZ.value = values("Card").z;
    u.uTime.value = live.t;
    const visible = u.uAlpha.value > 0.001;
    DOORS_Z.forEach((z, k) => {
      // 0 while the card is 1.2 in front of the door, 1 once it is 0.6 past it.
      const k01 = THREE.MathUtils.clamp((z + 1.2 - u.uCardZ.value) / 1.8, 0, 1);
      const open = k01 * k01 * (3 - 2 * k01);
      opens[k].value = open;
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
