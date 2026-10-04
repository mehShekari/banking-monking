"use client";

// Act one, "Chosen": a field of faint talent; one point is selected, travels to where the
// card will be and stretches into the blade of light that becomes the card's edge (the card
// grows along it: see bladeAt). Above it, the three partners descend as one braid of light
// and cinch into the point. As the card arrives, a shockwave runs out through the field.
// In the finale the field returns around the card and gathers to the visitor's pointer.

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  clamp,
  cos,
  distance,
  dot,
  exp,
  fract,
  instancedBufferAttribute,
  instancedDynamicBufferAttribute,
  length,
  mix,
  modelViewMatrix,
  select,
  sin,
  smoothstep,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { CARD_H } from "@/modules/film/constants/card";
import { live } from "../live";
import { values } from "../theatre";
import { ADDITIVE, bokehAlpha, bokehScale, coc, makeTalentU, motion, SIGNAL, streakSize } from "../tsl";


const COUNT = 12000;
// The field held 2500 points; keep its density feel at the higher count.
const DENSITY = Math.sqrt(2500 / COUNT);
const TRAIL = 24;
const START = new THREE.Vector3(1.6, 0.75, -1.4);
const HEAD = 0.18;
const YOU = 0.12;
// The braid: one bundle per partner (Daneshmand, Bank Sina, Green Bank).
const BUNDLES = 3;
const STRANDS = 20;
const PER_STRAND = 150;
const BRAID = BUNDLES * STRANDS * PER_STRAND;
const TAU = Math.PI * 2;

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Where the chosen point is at choreography value c: it lands on the card (`target`). */
function chosenAt(c: number, target: THREE.Vector3, out: THREE.Vector3) {
  if (c <= 0.3) return out.copy(START);
  if (c <= 0.8) return out.lerpVectors(START, target, easeInOut((c - 0.3) / 0.5));
  return out.copy(target);
}

/**
 * How far the landed point has stretched into the blade, 0…1 (c 0.8 → 1). The card grows
 * along the same stretch, so the light becomes its edge instead of the card appearing.
 */
export const bladeAt = (c: number) => (c > 0.8 ? easeInOut(Math.min(1, (c - 0.8) / 0.2)) : 0);

/** The arrival shockwave: how far its ring has run out through the field (world units). */
const RING_REACH = 7;

const inst1 = (a: Float32Array) => instancedBufferAttribute<"float">(new THREE.InstancedBufferAttribute(a, 1), "float");
const inst3 = (a: Float32Array) => instancedBufferAttribute<"vec3">(new THREE.InstancedBufferAttribute(a, 3), "vec3");
/** gl_PointCoord had y down; sprite uv has y up. */
const pointCoord = () => vec2(uv().x, uv().y.oneMinus());
const additive = { ...ADDITIVE, fog: false };

export function Talent() {
  const u = useMemo(makeTalentU, []);
  const camera = useThree((s) => s.camera);
  const head = useRef<THREE.Mesh>(null);
  const you = useRef<THREE.Mesh>(null);
  const trailSprite = useRef<THREE.Sprite>(null);
  const braidSprite = useRef<THREE.Sprite>(null);

  const parts = useMemo(() => {
    // World size of one drawing-buffer pixel at unit depth: points were sized
    // `k / depth` pixels, which is a fixed world size of k * uPx.
    const uPx = uniform(0);
    const uChosenOn = uniform(0);
    const uChosenPos = uniform(new THREE.Vector3());
    const uPulse = uniform(0);

    // ── Field ──
    const p0 = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      p0.set([(Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, -8 + Math.random() * 11], i * 3);
      seeds[i] = Math.random();
    }
    const seed = inst1(seeds);
    const still = inst3(p0).add(
      vec3(sin(u.uTime.mul(0.07).add(seed.mul(40))).mul(0.2), cos(u.uTime.mul(0.05).add(seed.mul(31))).mul(0.15), u.uFieldZ),
    );
    // The card's arrival: a ring runs out from it across the frame (measured in the screen
    // plane, so it reads as a ring, not a scattered shell), pushing the talent aside and
    // lighting it as it passes; then the field settles back.
    const fromCard = vec3(still.x.sub(uChosenPos.x), still.y.sub(uChosenPos.y), 0);
    const reach = length(fromCard);
    const front = reach.sub(uPulse.mul(RING_REACH)).div(0.55);
    const ring = exp(front.mul(front).negate()).mul(uPulse.oneMinus()).mul(smoothstep(0, 0.04, uPulse));
    const drift = still.add(fromCard.div(reach.add(1e-3)).mul(ring.mul(0.9)));
    // The visitor's pointer: nearby talent drifts toward it, circling a little.
    const rel = drift.sub(u.uCursor);
    const pull = u.uCursorOn.mul(exp(dot(rel, rel).div(-0.5)));
    const swirl = pull.mul(sin(u.uTime.mul(0.9).add(seed.mul(6.2832))).mul(0.15).add(0.25));
    const fieldPos = mix(drift, u.uCursor, pull.mul(0.4)).add(vec3(rel.y.negate().mul(swirl), rel.x.mul(swirl), 0));
    const fieldDepth = modelViewMatrix.mul(vec4(fieldPos, 1)).z.negate();
    const d = distance(fieldPos, uChosenPos);
    const near = exp(d.mul(d).div(-1.44)).mul(uChosenOn).mul(2).add(1);
    const fieldC = varying(coc(fieldDepth));
    const fieldSize = seed.mul(1.8).add(0.8).mul(26).mul(uPx).mul(near.mul(0.2).add(0.8)).mul(bokehScale(fieldC)).mul(ring.mul(0.8).add(1));
    const twinkle = sin(u.uTime.mul(seed.add(0.6)).mul(2).add(seed.mul(90))).mul(0.45).add(0.55);
    const fieldA = varying(
      // The ring lights talent on its own: the field is at its dimmest when the card arrives.
      seed.mul(0.35).add(0.15).mul(twinkle).mul(near).mul(u.uTalent.add(ring.mul(1.3))).mul(pull.mul(2.5).add(1)).mul(DENSITY),
    );
    const fieldMat = new THREE.SpriteNodeMaterial(additive);
    fieldMat.positionNode = fieldPos;
    // Streaks: the old point grew by s and its dot was squeezed back by s in x.
    fieldMat.scaleNode = vec2(fieldSize, fieldSize.mul(streakSize(motion.vel)));
    fieldMat.colorNode = vec3(0.72, 0.84, 1.0).mul(1.2);
    fieldMat.opacityNode = bokehAlpha(pointCoord(), fieldC).mul(fieldA);

    // ── Braid ── three bundles twist round a vertical axis that ends on the chosen
    // point; each bundle is 20 fibres winding round its centre; particles flow down.
    const bundles = new Float32Array(BRAID);
    const strands = new Float32Array(BRAID);
    const along = new Float32Array(BRAID);
    const jits = new Float32Array(BRAID);
    for (let i = 0, k = 0; k < BUNDLES; k++) {
      for (let s = 0; s < STRANDS; s++) {
        const strandSeed = Math.random();
        for (let j = 0; j < PER_STRAND; j++, i++) {
          bundles[i] = k;
          strands[i] = strandSeed;
          along[i] = (j + Math.random()) / PER_STRAND;
          jits[i] = Math.random();
        }
      }
    }
    const bundle = inst1(bundles);
    const strand = inst1(strands);
    const jit = inst1(jits);
    const bu = fract(inst1(along).add(u.uTime.mul(0.04).mul(jit.add(0.5))));
    const reveal = smoothstep(bundle.mul(0.18), bundle.mul(0.18).add(0.64), clamp(u.uStreams, 0, 1));
    const bd = clamp(u.uStreams.sub(1), 0, 1);
    const fade = smoothstep(0.3, 1, bd).oneMinus();
    const cinch = smoothstep(0.85, 1, bu).oneMinus().mul(smoothstep(0, 0.5, bd).oneMinus());
    const ang = bundle.mul(TAU / 3).add(bu.mul(2.5 * TAU)).add(u.uTime.mul(0.4));
    const radial = vec3(cos(ang), 0, sin(ang));
    const sa = strand.mul(TAU).add(bu.mul(4 * TAU));
    const sr = fract(strand.mul(7.31)).mul(0.6).add(0.4).mul(0.05);
    const braidPos = vec3(uChosenPos)
      .add(vec3(0, bu.oneMinus().mul(fade).mul(4.5), 0))
      .add(radial.mul(0.5).add(radial.mul(cos(sa)).add(vec3(0, sin(sa), 0)).mul(sr)).mul(cinch));
    const braidC = varying(coc(modelViewMatrix.mul(vec4(braidPos, 1)).z.negate()));
    const braidSize = jit.mul(0.6).add(0.6).mul(18).mul(uPx).mul(bokehScale(braidC));
    const h = reveal.sub(bu).div(0.03);
    const braidA = varying(exp(h.mul(h).negate()).mul(2).add(1).mul(0.5).mul(smoothstep(0, 0.06, bu)).mul(fade));
    const braidCol = varying(
      select(
        bundle.lessThan(0.5),
        vec3(0.85, 0.92, 1.0),
        select(bundle.lessThan(1.5), SIGNAL(), vec3(0.32, 0.55, 1.0)),
      ).mul(1.5),
    );
    const braidMat = new THREE.SpriteNodeMaterial(additive);
    braidMat.positionNode = braidPos;
    // Not yet revealed: a zero-size sprite draws nothing.
    braidMat.scaleNode = select(bu.greaterThan(reveal), vec2(0, 0), vec2(braidSize, braidSize));
    braidMat.colorNode = braidCol;
    braidMat.opacityNode = bokehAlpha(pointCoord(), braidC).mul(braidA);

    // ── Trail ── ghosts at earlier points of the journey (CPU-written each frame).
    const trailPos = new THREE.InstancedBufferAttribute(new Float32Array(TRAIL * 3), 3);
    const trailA = new THREE.InstancedBufferAttribute(new Float32Array(TRAIL), 1);
    const ta = instancedDynamicBufferAttribute<"float">(trailA, "float");
    const trailMat = new THREE.SpriteNodeMaterial(additive);
    trailMat.positionNode = instancedDynamicBufferAttribute<"vec3">(trailPos, "vec3");
    trailMat.scaleNode = vec2(ta.add(0.4).mul(60).mul(uPx));
    trailMat.colorNode = vec3(0.6, 0.85, 1.0).mul(3);
    const tr = length(uv().sub(0.5)).mul(2);
    trailMat.opacityNode = exp(tr.mul(tr).mul(-5)).mul(ta);

    // ── Head and "you" ── camera-facing quads (billboarded on the CPU).
    const glow = () => {
      const bright = uniform(0);
      const r = length(uv().sub(0.5)).mul(2);
      const r2 = r.mul(r);
      const m = new THREE.MeshBasicNodeMaterial(additive);
      m.colorNode = vec3(0.75, 0.9, 1.0).mul(5);
      m.opacityNode = exp(r2.mul(-5))
        .add(exp(r2.mul(-40)).mul(0.8))
        .mul(bright)
        .mul(smoothstep(0.85, 1, r).oneMinus());
      return { m, bright };
    };
    const headGlow = glow();
    const youGlow = glow();

    return {
      uPx,
      uChosenOn,
      uChosenPos,
      uPulse,
      trailPos,
      trailA,
      fieldMat,
      braidMat,
      trailMat,
      headGlow,
      youGlow,
      // Own geometries per sprite, so disposing them frees their instanced node buffers.
      fieldQuad: new THREE.PlaneGeometry(1, 1),
      braidQuad: new THREE.PlaneGeometry(1, 1),
      trailQuad: new THREE.PlaneGeometry(1, 1),
      quad: new THREE.PlaneGeometry(1, 1),
    };
  }, [u]);

  useEffect(
    () => () => {
      for (const d of [
        parts.fieldQuad,
        parts.braidQuad,
        parts.trailQuad,
        parts.quad,
        parts.fieldMat,
        parts.braidMat,
        parts.trailMat,
        parts.headGlow.m,
        parts.youGlow.m,
      ])
        d.dispose();
    },
    [parts],
  );

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const I = values("Intro");
    const K = values("Card");
    // The point lands where the card is (it sits behind the origin), so blade and edge coincide.
    target.set(K.x, K.y, K.z);
    parts.uPulse.value = I.pulse;
    u.uTalent.value = I.talent;
    u.uChosen.value = I.chosen;
    u.uStreams.value = I.streams;
    u.uFieldZ.value = I.fieldZ;
    u.uTime.value = live.t;
    // "You are the chosen one": in the finale the pointer is a point of light on the card's plane.
    u.uCursorOn.value = live.cursorOn;
    u.uCursor.value.copy(live.cursor);

    const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
    parts.uPx.value = (2 * Math.tan((fov * Math.PI) / 360)) / (state.size.height * state.viewport.dpr);

    const c = u.uChosen.value;
    const flying = c > 0.001 && c < 0.999;
    const bright = c <= 0.3 ? easeInOut(c / 0.3) : c <= 0.8 ? 1 : 1 - (c - 0.8) / 0.2;

    chosenAt(c, target, tmp);
    parts.uChosenPos.value.copy(tmp);
    parts.uChosenOn.value = flying ? bright : 0;

    const h = head.current;
    if (h) {
      h.visible = flying;
      h.position.copy(tmp);
      h.quaternion.copy(camera.quaternion);
      const k = bladeAt(c);
      h.scale.set(THREE.MathUtils.lerp(HEAD, 0.025, k), THREE.MathUtils.lerp(HEAD, CARD_H, k), 1);
      parts.headGlow.bright.value = bright;
    }

    const s = u.uStreams.value;
    if (braidSprite.current) braidSprite.current.visible = s > 0.001 && s < 1.999;

    // "You": a soft point of light breathing at the visitor's pointer.
    const y = you.current;
    if (y) {
      const on = u.uCursorOn.value;
      const breath = Math.sin(u.uTime.value * 1.7);
      y.visible = on > 0.001;
      y.position.copy(u.uCursor.value);
      y.quaternion.copy(camera.quaternion);
      y.scale.setScalar(YOU * (1 + 0.08 * breath));
      parts.youGlow.bright.value = on * (0.5 + 0.1 * breath);
    }

    // Trail: ghosts at earlier points of the journey, only while travelling.
    const fade = c < 0.3 ? 0 : 1 - THREE.MathUtils.clamp((c - 0.8) / 0.08, 0, 1);
    const trailOn = flying && fade > 0;
    if (trailSprite.current) trailSprite.current.visible = trailOn;
    if (!trailOn) return;
    for (let j = 0; j < TRAIL; j++) {
      const cj = Math.max(0.3, c - (j + 1) * 0.008);
      chosenAt(cj, target, tmp);
      parts.trailPos.setXYZ(j, tmp.x, tmp.y, tmp.z);
      parts.trailA.setX(j, (1 - j / TRAIL) * 0.6 * fade);
    }
    parts.trailPos.needsUpdate = true;
    parts.trailA.needsUpdate = true;
  });

  return (
    <>
      <sprite args={[parts.fieldMat]} geometry={parts.fieldQuad} count={COUNT} frustumCulled={false} />
      <sprite
        ref={braidSprite}
        args={[parts.braidMat]}
        geometry={parts.braidQuad}
        count={BRAID}
        frustumCulled={false}
        visible={false}
      />
      <sprite
        ref={trailSprite}
        args={[parts.trailMat]}
        geometry={parts.trailQuad}
        count={TRAIL}
        frustumCulled={false}
        visible={false}
      />
      <mesh ref={head} geometry={parts.quad} material={parts.headGlow.m} frustumCulled={false} />
      <mesh ref={you} geometry={parts.quad} material={parts.youGlow.m} frustumCulled={false} visible={false} />
    </>
  );
}
