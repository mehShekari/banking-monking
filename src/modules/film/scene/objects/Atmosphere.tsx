"use client";

// The air of the set: 900 motes drifting up through it, a soft glow behind the card and a
// volumetric beam from above. The glow and the beam travel with the card.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { instancedBufferAttribute, mod, modelViewMatrix, pow, sin, smoothstep, uniform, uv, varying, vec2, vec3, vec4 } from "three/tsl";
import { values } from "../theatre";
import { live } from "../live";
import { ADDITIVE, bokehAlpha, bokehScale, coc, motion, streakSize, type Float } from "../tsl";
import type { Rig } from "./Card";

const MOTES = 900;

function dustSprite(u: { uTime: Float; uOpacity: Float; uPx: Float }) {
  const d = new Float32Array(MOTES * 4); // xyz, seed
  for (let i = 0; i < MOTES; i++) {
    d.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, 4 - Math.random() * 26, Math.random()], i * 4);
  }
  const a = instancedBufferAttribute<"vec4">(new THREE.InstancedBufferAttribute(d, 4), "vec4");
  const seed = a.w;
  const p = vec3(
    a.x.add(sin(u.uTime.mul(0.2).add(seed.mul(30))).mul(0.15)),
    a.y.add(mod(u.uTime.mul(seed.mul(0.04).add(0.03)).add(seed.mul(10)), 10).sub(5)),
    a.z,
  );
  const c = varying(coc(modelViewMatrix.mul(vec4(p, 1)).z.negate()));
  // The old point's footprint: (1 + seed·2.5)·22 px at 1/depth (uPx: world size of one
  // drawing-buffer pixel at depth 1), grown by the bokeh, and streaked with scroll speed
  // (the GLSL kept the width and stretched the height by streakSize).
  const size = seed.mul(2.5).add(1).mul(22).mul(u.uPx).mul(bokehScale(c));
  const m = new THREE.SpriteNodeMaterial(ADDITIVE);
  m.positionNode = p;
  m.scaleNode = vec2(size, size.mul(streakSize(motion.vel)));
  m.colorNode = vec3(0.75, 0.85, 1);
  m.opacityNode = bokehAlpha(uv(), c).mul(seed.mul(0.75).add(0.25)).mul(u.uOpacity).mul(0.5);
  const s = new THREE.Sprite(m);
  s.count = MOTES;
  s.frustumCulled = false;
  return s;
}

function hazeMaterial(uHaze: Float) {
  const m = new THREE.MeshBasicNodeMaterial(ADDITIVE);
  const d = uv().sub(vec2(0.5, 0.55)).mul(vec2(1, 1.3)).length();
  m.colorNode = vec3(0.021, 0.042, 0.105).mul(smoothstep(0.6, 0, d)).mul(uHaze);
  return m;
}

function beamMaterial(uBeam: Float) {
  const m = new THREE.MeshBasicNodeMaterial({ ...ADDITIVE, side: THREE.DoubleSide });
  const y = uv().y;
  const along = smoothstep(0, 0.9, y).mul(smoothstep(1, 0.75, y));
  const across = pow(sin(uv().x.mul(Math.PI)), 6);
  m.colorNode = vec3(0.6, 0.75, 1).mul(along).mul(across).mul(uBeam).mul(0.22);
  return m;
}

export function Atmosphere({ rig }: { rig: Rig }) {
  const gl = useThree((s) => s.gl);
  const haze = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  const parts = useMemo(() => {
    const u = { uTime: uniform(0), uOpacity: uniform(0), uPx: uniform(0), uHaze: uniform(0), uBeam: uniform(0) };
    return { u, dust: dustSprite(u), hazeMat: hazeMaterial(u.uHaze), beamMat: beamMaterial(u.uBeam) };
  }, []);
  useEffect(
    () => () => {
      parts.dust.material.dispose();
      parts.hazeMat.dispose();
      parts.beamMat.dispose();
    },
    [parts],
  );

  useFrame((state) => {
    const A = values("Atmos");
    const { u } = parts;
    const cam = state.camera as THREE.PerspectiveCamera;
    u.uTime.value = live.t;
    u.uOpacity.value = A.dust;
    // World size of one drawing-buffer pixel at depth 1 (the old points were sized in pixels).
    u.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / (state.size.height * gl.getPixelRatio());
    u.uHaze.value = A.haze * 0.6;
    u.uBeam.value = values("Light").beam * 0.5;
    const c = rig.card?.position;
    if (!c) return;
    haze.current?.position.set(c.x, c.y, c.z - 7);
    beam.current?.position.set(c.x - 0.6, c.y + 3.2, c.z - 1.2);
  });

  return (
    <>
      <mesh ref={haze} scale={[26, 18, 1]}>
        <planeGeometry />
        <primitive object={parts.hazeMat} attach="material" />
      </mesh>
      <mesh ref={beam} rotation={[0, 0, -0.22]}>
        <cylinderGeometry args={[0.25, 1.6, 7, 48, 1, true]} />
        <primitive object={parts.beamMat} attach="material" />
      </mesh>
      <primitive object={parts.dust} />
    </>
  );
}
