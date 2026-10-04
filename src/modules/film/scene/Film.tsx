"use client";

// The director. Once per frame, before anything else (priority -1): moves the sheet to the film
// clock, steps the finale's hands, places the card and the camera, and publishes what the
// scene's objects share (live.ts). Each object then drives its own uniforms; the render loop
// draws last (priority 1).

import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three/webgpu";
import { clock } from "@/modules/film/timeline/clock";
import { pointAt } from "@/modules/film/timeline/path";
import { stepHands } from "./hands";
import { live } from "./live";
import { createPost } from "./post";
import { syncSheet, values } from "./theatre";
import { lens, motion } from "./tsl";
import { useDomAnchors } from "./useDomAnchors";
import { usePointer } from "./usePointer";
import { useQualityGovernor } from "./useQualityGovernor";
import { useRenderLoop } from "./useRenderLoop";
import { useSoundCues } from "./useSoundCues";
import { useStudioEnvironment } from "./useStudioEnvironment";
import { Atmosphere } from "./objects/Atmosphere";
import { Card, FACE_Z, createRig } from "./objects/Card";
import { Doors } from "./objects/Doors";
import { Emergence } from "./objects/Emergence";
import { Formations } from "./objects/Formations";
import { Path } from "./objects/Path";
import { StudioLights } from "./objects/StudioLights";
import { Talent } from "./objects/Talent";

export function Film({ onReady }: { onReady: () => void }) {
  const three = useThree();
  const { scene, camera } = three;
  // R3F types the renderer as WebGLRenderer; FilmCanvas hands it a WebGPURenderer.
  const gl = three.gl as unknown as THREE.WebGPURenderer;
  const rig = useMemo(createRig, []);
  const tmp = useMemo(
    () => ({ target: new THREE.Vector3(), pos: new THREE.Vector3(), head: new THREE.Vector3(), v: new THREE.Vector3(), xy: [0, 0] as [number, number], vel: 0 }),
    [],
  );

  const circuitMask = useLoader(THREE.TextureLoader, "/images/circuit-mask.png");
  const post = useMemo(() => createPost(gl, scene, camera, circuitMask), [gl, scene, camera, circuitMask]);
  useEffect(() => post.dispose, [post]);

  useStudioEnvironment();
  usePointer();
  const gov = useQualityGovernor();
  useSoundCues();
  useDomAnchors(rig);
  useRenderLoop(post, () => !!rig.card, onReady);

  // Profiling hook, only with ?debug in the URL: lets DevTools reach into the scene.
  useEffect(() => {
    if (!window.location.search.includes("debug")) return;
    (window as unknown as { __film?: unknown }).__film = { scene, gl, rig, post, gov };
  }, [scene, gl, rig, post, gov]);

  useFrame((state, dt) => {
    syncSheet();
    const C = values("Camera");
    const K = values("Card");
    const A = values("Atmos");
    const P = values("Path");
    const F = values("Final");
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const aspect = width / height;
    const p = live.pointer;
    const card = rig.card;
    live.t = state.clock.elapsedTime;
    live.interact = F.interact;
    live.portrait = aspect < 0.8;

    // Finale hands: inertia, spring home when idle, hold to charge, release a burst at full charge.
    const holding = p.down && !p.moved && performance.now() - p.downAt > 220 && F.interact > 0.5;
    const burst = stepHands(live.hands, dt, { dragging: p.down, holding, active: F.interact >= 0.5 });
    if (burst.started) p.down = false;
    live.burst = burst.mix;
    live.burstStarted = burst.started;
    const charge = live.hands.charge;
    gl.domElement.style.cursor = F.interact > 0.5 ? (p.down && p.moved ? "grabbing" : "grab") : "";

    // The card: keyed, with a slow float, the visitor's spin, and a swell as it charges.
    if (card) {
      card.visible = clock.t >= 2.85;
      card.position.set(K.x, K.y + Math.sin(live.t * 0.6) * 0.012, K.z);
      card.rotation.set(K.rx, K.ry + live.hands.spin, K.rz);
      card.scale.setScalar(1 + charge * 0.02);
      card.updateMatrixWorld();
    }

    // Camera: keyed shot, blended into a tracking shot on the path head.
    tmp.target.set(C.tx, C.ty, C.tz);
    tmp.pos.set(C.x, C.y, C.z);
    if (C.follow > 0 && card) {
      // Orbit the path head in card space, looking a little ahead along the arc (all authored
      // in Theatre: fDist, fYaw, fPitch, fLead, fRoll).
      pointAt(P.progress + C.fLead, tmp.xy);
      tmp.head.set(tmp.xy[0], tmp.xy[1], FACE_Z);
      const d = C.fDist * (live.portrait ? 1.3 : 1);
      const cp = Math.cos(C.fPitch);
      tmp.v.set(Math.sin(C.fYaw) * cp, Math.sin(C.fPitch), Math.cos(C.fYaw) * cp).multiplyScalar(d).add(tmp.head);
      tmp.head.applyMatrix4(card.matrixWorld);
      tmp.v.applyMatrix4(card.matrixWorld);
      tmp.target.lerp(tmp.head, C.follow);
      tmp.pos.lerp(tmp.v, C.follow);
    }
    // Portrait screens: pull back along the line of sight.
    const back = live.portrait ? 1 + (0.8 - aspect) * 1.1 : 1;
    tmp.pos.sub(tmp.target).multiplyScalar(back).add(tmp.target);
    // Caption beats: slide the card aside (desktop) or up (portrait) to give the words room.
    const fx = live.portrait ? 0 : 0.62 * C.frame;
    const fy = live.portrait ? -0.42 * C.frame : 0;
    tmp.target.x += fx;
    tmp.target.y += fy;
    tmp.pos.x += fx;
    tmp.pos.y += fy;
    // Pointer parallax (calmer in the finale), and a tremor while charging.
    p.sx += (p.x - p.sx) * Math.min(1, dt * 2.5);
    p.sy += (p.y - p.sy) * Math.min(1, dt * 2.5);
    const sway = 1 - F.interact * 0.7;
    tmp.pos.x += p.sx * 0.08 * sway + Math.sin(live.t * 37) * 0.003 * charge;
    tmp.pos.y -= p.sy * 0.06 * sway + Math.cos(live.t * 41) * 0.003 * charge;
    cam.position.copy(tmp.pos);
    cam.lookAt(tmp.target);
    cam.rotateZ(C.roll + C.fRoll * C.follow);
    if (cam.fov !== C.fov) {
      cam.fov = C.fov;
      cam.updateProjectionMatrix();
    }

    // "You are the chosen one": in the finale the pointer is a point of light on the card's plane.
    live.cursorOn += ((p.active ? F.interact : 0) - live.cursorOn) * Math.min(1, dt * 4);
    if (live.cursorOn > 0.001) {
      tmp.v.set(p.sx, -p.sy, 0.5).unproject(cam).sub(cam.position).normalize();
      const k = (K.z - cam.position.z) / (tmp.v.z || -1);
      live.cursor.copy(cam.position).addScaledVector(tmp.v, k);
    }

    // Scroll speed, smoothed: the particle streaks and a faint colour split. No full-frame
    // trail: smearing the card while it moves read as blur.
    tmp.vel += (clock.v - tmp.vel) * Math.min(1, dt * (clock.v > tmp.vel ? 8 : 3));
    live.vel = motion.vel.value = tmp.vel < 0.004 ? 0 : tmp.vel;

    post.u.shift.value = A.shift;
    post.u.time.value = live.t;
    post.u.aspect.value = aspect;
    // Less bloom while the camera rides the path: the head should glow, not the whole frame.
    post.bloom.strength.value = A.bloom * 0.7 * (1 - 0.4 * C.follow) + charge * 0.45 + live.burst * 0.3;
    // Focus sits on what the shot is about: the path head, or the card.
    lens.focus.value = cam.position.distanceTo(tmp.target);
    lens.bokeh.value = A.dof;
    gl.toneMappingExposure = A.exposure;
  }, -1);

  return (
    <>
      {/* Neutral tone mapping subtracts an offset set by the darkest channel; this input lands on
          the approved navy #0f1d4d on screen (solved for the offset, then measured). */}
      <color attach="background" args={["#2e3558"]} />
      <StudioLights rig={rig} />
      <Atmosphere rig={rig} />
      <Talent />
      <Formations rig={rig} />
      <Doors />
      <Card rig={rig}>
        <Emergence />
        <Path />
      </Card>
    </>
  );
}
