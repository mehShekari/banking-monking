import * as THREE from "three/webgpu";
import { restingHands } from "./hands";

/**
 * The scene's per-frame shared state, in the same spirit as `clock`. The director (Film.tsx,
 * useFrame priority -1) writes it; the scene's objects read it in their own frames (priority 0),
 * so each object drives its own uniforms without the director knowing its insides.
 */
export const live = {
  /** Seconds since the scene started (the shaders' time). */
  t: 0,
  /** Narrow screens (aspect < 0.8) reframe the camera and the finale. */
  portrait: false,
  /** Finale interaction gate, 0…1 (Theatre Final.interact). */
  interact: 0,
  /** The pointer: raw NDC, smoothed NDC, and drag state. Written by usePointer and the director. */
  pointer: { x: 0, y: 0, sx: 0, sy: 0, down: false, moved: false, downX: 0, lastX: 0, downAt: 0, active: false },
  /** The pointer is over a CTA (the gateway). */
  ctaHover: false,
  /** The finale's hands (spin, charge, burst) and this frame's burst envelope. */
  hands: restingHands(),
  burst: 0,
  burstStarted: false,
  /** The pointer as a point of light on the card's plane, and how present it is (0…1). */
  cursor: new THREE.Vector3(),
  cursorOn: 0,
  /** Smoothed scroll speed, 0…1. */
  vel: 0,
  /** The finale formations' station cycle (one station per ~4.6 s). */
  formCycle: 0,
  /** Shaders are compiled and the film has started. */
  ready: false,
};
