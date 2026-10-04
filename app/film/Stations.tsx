"use client";

// The path's seven stations (public/gltf/path_stations_lo.glb, see GLTF-HANDOFF.md): one emblem
// per stage — talent crystal, research atom, technology die, capital stacks, market hub,
// business tower, impact ripple. Real geometry, so they stay sharp at macro distance where the
// card's raster artwork cannot. Each floats just off the card at its node and grows from its
// root as the pulse arrives, scrubbed by the film clock (backwards too). Only the current
// station glows; the ones behind dim, so the eye always knows where the path is.
// Card-local child of the card group.
//
// Only the lo file ships: hi's 68 meshes with clearcoat and normal maps took ~75 s to warm up
// (shader compile) against ~1.5 s for lo, and at this size only the normal-map glints differ.

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { FACE_Z } from "./Card";
import { clock } from "./clock";
import { STAGES, stageTime } from "./path";
import type { PathU } from "./tsl";

let ktx2: KTX2Loader | null = null;

/** The stations glTF (KTX2 textures, meshopt geometry). Shared by Stations and Formations: one download. */
export function useStationsGLTF() {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  return useLoader(GLTFLoader, "/gltf/path_stations_lo.glb", (loader) => {
    ktx2 ??= new KTX2Loader().setTranscoderPath("/gltf/basis/").detectSupport(gl);
    loader.setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  });
}

/** Values from GLTF-HANDOFF.md: emblem ≈ 0.085 card widths, floating 0.07 off the face. */
const SCALE = 0.085;
const LIFT = 0.07;
/** Reveal length from the moment the pulse reaches the node (s). */
const REVEAL = 0.8;
/** Glow emissive strength: the active station, and the ones already passed. */
const GLOW_ON = 1.6;
const GLOW_PAST = 0.45;

export function Stations({ u }: { u: PathU }) {
  const gltf = useStationsGLTF();

  const parts = useMemo(() => {
    const root = gltf.scene.clone(true);
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
        });
        return { g, glow };
      });
    return { root, stations };
  }, [gltf]);

  useEffect(() => () => parts.stations.forEach((s) => s.glow?.dispose()), [parts]);

  useFrame(() => {
    const t = clock.t;
    const show = u.uAlpha.value * (1 - u.uLift.value);
    parts.root.visible = show > 0.001;
    if (!parts.root.visible) return;
    parts.stations.forEach(({ g, glow }, k) => {
      const p = THREE.MathUtils.clamp((t - stageTime(k)) / REVEAL, 0, 1);
      g.visible = p > 0;
      g.scale.setScalar(SCALE * show * (1 - (1 - p) ** 3));
      if (glow) {
        const active = k === STAGES.length - 1 || t < stageTime(k + 1);
        glow.emissiveIntensity = active ? GLOW_ON : GLOW_PAST;
      }
    });
  });

  return <primitive object={parts.root} />;
}
