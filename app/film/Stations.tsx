"use client";

// The path's seven stations (public/gltf/path_stations.gltf, see GLTF-HANDOFF.md): one emblem
// per stage — talent crystal, research atom, technology die, capital stacks, market hub,
// business tower, impact ripple. Real geometry, so they stay sharp at macro distance where the
// card's raster artwork cannot. Each floats just off the card at its node and plays its own
// 1 s "Reveal_k" clip, scrubbed by the film clock (backwards too). Only the current station
// glows; the ones behind dim, so the eye always knows where the path is.
// Card-local child of the card group.

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FACE_Z } from "./Card";
import { clock } from "./clock";
import { STAGES, stageTime } from "./path";
import type { PathU } from "./tsl";

const URL = "/gltf/path_stations.gltf";
/** Values from GLTF-HANDOFF.md: emblem ≈ 0.085 card widths, floating 0.07 off the face. */
const SCALE = 0.085;
const LIFT = 0.07;
/** Reveal length from the moment the pulse reaches the node (s). Clips are exactly 1 s. */
const REVEAL = 0.8;
/** Glow emissive strength: the active station, and the ones already passed. */
const GLOW_ON = 1.6;
const GLOW_PAST = 0.45;

export function Stations({ u }: { u: PathU }) {
  const gltf = useLoader(GLTFLoader, URL);

  const parts = useMemo(() => {
    const root = gltf.scene.clone(true);
    const mixer = new THREE.AnimationMixer(root);
    const stations = root.children
      .filter((o) => /^Stage\d_/.test(o.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g, k) => {
        const [x, y] = STAGES[k].pos;
        g.position.set(x, y, FACE_Z + LIFT); // reset the preview-row placement
        g.rotation.set(0, 0, 0);
        g.scale.setScalar(SCALE);
        // Each station gets its own Glow material, so it can dim on its own once passed.
        const glow: THREE.MeshStandardMaterial[] = [];
        g.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.frustumCulled = false;
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.name === "Glow") {
            const own = glow[0] ?? mat.clone();
            if (!glow[0]) glow.push(own);
            m.material = own;
          }
        });
        const clip = gltf.animations.find((a) => a.name === `Reveal_${k}`);
        const action = clip ? mixer.clipAction(clip) : null;
        return { g, action, glow: glow[0] };
      });
    return { root, mixer, stations };
  }, [gltf]);

  // Actions start in the effect (not the memo), so React's dev double-mount, which runs this
  // cleanup once, can't leave them stopped.
  useEffect(() => {
    for (const { action } of parts.stations) {
      action?.play();
      if (action) action.paused = true;
    }
    return () => {
      parts.mixer.stopAllAction();
      parts.stations.forEach((s) => s.glow?.dispose());
    };
  }, [parts]);

  useFrame(() => {
    const t = clock.t;
    const show = u.uAlpha.value * (1 - u.uLift.value);
    parts.root.visible = show > 0.001;
    if (!parts.root.visible) return;
    parts.stations.forEach(({ g, action, glow }, k) => {
      const p = THREE.MathUtils.clamp((t - stageTime(k)) / REVEAL, 0, 1);
      g.visible = p > 0;
      g.scale.setScalar(SCALE * show);
      if (action) action.time = p * 0.9999;
      if (glow) {
        const active = k === STAGES.length - 1 || t < stageTime(k + 1);
        glow.emissiveIntensity = active ? GLOW_ON : GLOW_PAST;
      }
    });
    parts.mixer.update(0); // apply the poses; scrubs backwards too
  });

  return <primitive object={parts.root} />;
}
