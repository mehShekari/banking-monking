"use client";

// The path's seven stations (public/gltf/path_stations_lo.glb, see GLTF-HANDOFF.md): one emblem
// per stage — talent crystal, research atom, technology die, capital stacks, market hub,
// business tower, impact ripple. Real geometry, so they stay sharp at macro distance where the
// card's raster artwork cannot. Each floats just off the card at its node and grows from its
// root as the pulse arrives, scrubbed by the film clock (backwards too). Only the current
// station glows; the ones behind dim, so the eye always knows where the path is.
//
// Separation from the card is built, not tinted: the card is near-black navy metal, so the
// emblems are its opposite in value (pale satin porcelain, polished silver), a cool Fresnel rim
// draws every silhouette whatever the light, and a soft contact shadow, offset away from the
// key light, grounds each one on the face and quiets the card art behind it. The pulse's head
// carries a small light that only the emblems see (their own lightsNode; the card keeps its
// quiet lighting), so each emblem is lit by the path arriving at it. Blue stays reserved
// for the Glow parts, the only saturated thing in the emblem.
//
// Card-local child of the card group.
//
// Only the lo file ships: hi's 68 meshes with clearcoat and normal maps took ~75 s to warm up
// (shader compile) against ~1.5 s for lo, and at this size only the normal-map glints differ.

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import { abs, color, dot, float, length, lights, normalView, positionViewDirection, pow, smoothstep, uv, vec3 } from "three/tsl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { FACE_Z } from "./Card";
import { clock } from "@/modules/film/timeline/clock";
import { STAGES, pointAt, stageTime } from "@/modules/film/timeline/path";
import type { PathU } from "@/modules/film/scene/tsl";

let ktx2: KTX2Loader | null = null;

/** The stations glTF (KTX2 textures, meshopt geometry). Shared by Stations and Formations: one download. */
export function useStationsGLTF() {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  return useLoader(GLTFLoader, "/gltf/path_stations_lo.glb", (loader) => {
    ktx2 ??= new KTX2Loader().setTranscoderPath("/gltf/basis/").detectSupport(gl);
    loader.setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  });
}

/** An emblem's reach from its node, halo ring included (card units): stage labels clear it. */
export const EMBLEM_R = 0.08;
/** Values from GLTF-HANDOFF.md: emblem ≈ 0.085 card widths, floating 0.07 off the face. */
const SCALE = 0.085;
const LIFT = 0.07;
/** Reveal length from the moment the pulse reaches the node (s). */
const REVEAL = 0.8;
/** Glow emissive strength: the active station, and the ones already passed. */
const GLOW_ON = 1.6;
const GLOW_PAST = 0.45;

/** The emblem's own materials: a value family the card does not use. */
const LOOK = {
  // Satin, mostly dielectric: a metal would only mirror the dark scene and sink into the card.
  Metal: { color: "#c3cad6", metalness: 0.25, roughness: 0.5, rim: 0.9, fill: 0.05 },
  Chrome: { color: "#f1f4f8", metalness: 1, roughness: 0.22, rim: 1.1, fill: 0.08 },
} as const;
/** Cool white Fresnel rim: brightest at grazing angles, i.e. along the silhouette. */
const rim = (k: number) =>
  vec3(0.78, 0.88, 1.0).mul(pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 3).mul(k));

function surface(src: THREE.MeshStandardMaterial, look: (typeof LOOK)[keyof typeof LOOK], light: THREE.PointLight) {
  const m = new THREE.MeshStandardNodeMaterial({
    name: src.name,
    color: look.color,
    metalness: look.metalness,
    roughness: look.roughness,
    aoMap: src.aoMap,
    aoMapIntensity: src.aoMapIntensity,
  });
  // A little self-fill so the body never drops to black, plus the silhouette rim.
  m.emissiveNode = color(look.color).mul(look.fill).add(rim(look.rim));
  m.lightsNode = lights([light]); // the head light only; env still reflects
  return m;
}

/** The head light: card units, in front of the emblems so it rakes across them as it passes. */
const HEAD_LIGHT = { intensity: 0.05, distance: 0.35, z: FACE_Z + LIFT + 0.05 };
const head: [number, number] = [0, 0];

/** Contact shadow: a soft dark pool on the face under each emblem (card units). */
const SHADOW_SIZE = 0.14;
const SHADOW_OFFSET = [0.006, -0.008] as const; // away from the key light (upper left)

export function Stations({ u }: { u: PathU }) {
  const gltf = useStationsGLTF();

  const parts = useMemo(() => {
    const root = gltf.scene.clone(true);
    const shared = new Map<string, THREE.Material>();
    const shadowMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
    shadowMat.colorNode = vec3(0.0, 0.008, 0.03);
    const fall = smoothstep(0, 0.5, length(uv().sub(0.5))).oneMinus();
    shadowMat.opacityNode = fall.mul(fall).mul(0.7);
    const shadowGeo = new THREE.PlaneGeometry(SHADOW_SIZE, SHADOW_SIZE);
    // Not in the scene graph, so no other material sees it; placed in world space each frame.
    const light = new THREE.PointLight("#e4eeff", 0, HEAD_LIGHT.distance, 2);
    const stations = root.children
      .filter((o) => /^Stage\d_/.test(o.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g, k) => {
        const [x, y] = STAGES[k].pos;
        g.position.set(x, y, FACE_Z + LIFT); // reset the preview-row placement
        g.rotation.set(0, 0, 0);
        // Each station gets its own Glow material, so it can dim on its own once passed.
        let glow: THREE.MeshStandardMaterial | undefined;
        g.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.name === "Glow") m.material = glow ??= mat.clone();
          else if (mat.name in LOOK) {
            if (!shared.has(mat.name)) shared.set(mat.name, surface(mat, LOOK[mat.name as keyof typeof LOOK], light));
            m.material = shared.get(mat.name)!;
          }
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.position.set(x + SHADOW_OFFSET[0], y + SHADOW_OFFSET[1], FACE_Z + 0.001);
        shadow.renderOrder = -1;
        root.add(shadow);
        return { g, glow, shadow };
      });
    return { root, stations, shared, shadowMat, shadowGeo, light };
  }, [gltf]);

  useEffect(
    () => () => {
      parts.stations.forEach((s) => s.glow?.dispose());
      parts.shared.forEach((m) => m.dispose());
      parts.shadowMat.dispose();
      parts.shadowGeo.dispose();
    },
    [parts],
  );

  useFrame(() => {
    const t = clock.t;
    const show = u.uAlpha.value * (1 - u.uLift.value);
    parts.light.intensity = HEAD_LIGHT.intensity * show;
    parts.root.visible = show > 0.001;
    if (!parts.root.visible) return;
    pointAt(u.uHead.value, head);
    parts.light.position.set(head[0], head[1], HEAD_LIGHT.z).applyMatrix4(parts.root.matrixWorld);
    parts.light.updateMatrixWorld();
    parts.stations.forEach(({ g, glow, shadow }, k) => {
      const p = THREE.MathUtils.clamp((t - stageTime(k)) / REVEAL, 0, 1);
      const grow = show * (1 - (1 - p) ** 3);
      g.visible = shadow.visible = p > 0;
      g.scale.setScalar(SCALE * grow);
      shadow.scale.setScalar(Math.max(grow, 1e-3));
      if (glow) {
        const active = k === STAGES.length - 1 || t < stageTime(k + 1);
        glow.emissiveIntensity = active ? GLOW_ON : GLOW_PAST;
      }
    });
  });

  return <primitive object={parts.root} />;
}
