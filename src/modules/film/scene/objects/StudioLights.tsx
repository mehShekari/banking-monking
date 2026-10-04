"use client";

// The studio around the card: a softbox and a strip (area lights), a rim spot behind, and a
// side key. They travel with the card; in the finale the softbox follows the cursor across
// the metal.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three/webgpu";
import { values } from "../theatre";
import { live } from "../live";
import type { Rig } from "./Card";

/** Overall light level for the card lights; one knob for "too bright / too dark". */
const LIGHT = 0.65;

export function StudioLights({ rig }: { rig: Rig }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const box = useRef<THREE.RectAreaLight>(null);
  const strip = useRef<THREE.RectAreaLight>(null);

  useFrame(() => {
    const L = values("Light");
    const C = values("Camera");
    const { sx, sy } = live.pointer;
    // The key light is a side fill, not a spotlight: half strength keeps the metal from going flat-blue.
    if (key.current) key.current.intensity = L.key * LIGHT * 0.5;
    const c = rig.card?.position;
    if (!c) return;
    // Area lights cost half the frame in the macro path shot (measured 39 → 77 fps without
    // them); there the card fills the screen and the studio env carries the reflections.
    const areaK = 1 - THREE.MathUtils.smoothstep(C.follow, 0.4, 0.9);
    if (box.current) {
      box.current.position.set(c.x - 2.4 + sx * 1.6 * live.interact, c.y + 1.2 - sy * 0.8 * live.interact, c.z + 2.6);
      box.current.lookAt(c);
      box.current.intensity = L.area * LIGHT * areaK;
      box.current.visible = areaK > 0.01;
    }
    if (strip.current) {
      strip.current.position.set(c.x + 2.6, c.y + 0.3, c.z + 0.8);
      strip.current.lookAt(c);
      strip.current.intensity = L.area * 0.6 * LIGHT * areaK;
      strip.current.visible = areaK > 0.01;
    }
    if (rim.current) {
      rim.current.position.set(c.x + 1.5, c.y + 3.5, c.z - 3.5);
      rim.current.target.position.copy(c);
      rim.current.target.updateMatrixWorld();
      rim.current.intensity = L.rim * 30 * LIGHT;
    }
  });

  return (
    <>
      <directionalLight ref={key} position={[-2.5, 2.5, 4]} color="#e6eeff" intensity={0} />
      <rectAreaLight ref={box} width={2.2} height={3.2} color="#eef4ff" intensity={0} />
      <rectAreaLight ref={strip} width={0.35} height={3.6} color="#9fc4ff" intensity={0} />
      <spotLight ref={rim} angle={0.5} penumbra={1} color="#9fc4ff" intensity={0} decay={1.6} />
    </>
  );
}
