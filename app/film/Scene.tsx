"use client";

import { getProject, types, type ISheetObject } from "@theatre/core";
import { Canvas, extend, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import {
  Fn,
  If,
  dot,
  floor,
  fract,
  instancedBufferAttribute,
  min,
  mix,
  mod,
  modelViewMatrix,
  pass,
  pow,
  renderOutput,
  sin,
  smoothstep,
  step,
  texture,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { smaa } from "three/examples/jsm/tsl/display/SMAANode.js";
import { RectAreaLightTexturesLib } from "three/examples/jsm/lights/RectAreaLightTexturesLib.js";
import { CARD_H, CARD_W, Card, FACE_Z, createRig } from "./Card";
import { clock } from "./clock";
import { Constellation } from "./Constellation";
import { finale } from "./copy";
import { DOOR_H, Doors } from "./Doors";
import { Emergence } from "./Emergence";
import { Talent } from "./Intro";
import { PathTrace } from "./PathTrace";
import { STAGES, pointAt, stageTime } from "./path";
import { sound } from "./sound";
import { DOORS_Z, INTRO_END, LENGTH, buildState, defaults } from "./storyboard";
import { Stations } from "./Stations";
import exported from "./film-state.json";
import { bokehAlpha, bokehScale, coc, lens, makeDoorsU, makeEmergeU, makePathU, makeTalentU, motion, streakSize, quality } from "./tsl";

// Node materials (and the rest of three/webgpu) as JSX elements.
extend(THREE as unknown as Parameters<typeof extend>[0]);
// Rect area lights on the node renderer need the LTC tables handed over once.
THREE.RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init() as unknown as Parameters<typeof THREE.RectAreaLightNode.setLTC>[0]);

const SHEET = "Film";
const studioMode =
  process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.search.includes("studio");

if (studioMode) import("@theatre/studio").then((m) => m.default.initialize());

// The timeline: a Theatre Studio export in film-state.json wins (see docs/studio.md); with
// none (the file holds `null`), it is built from the keys in storyboard.ts.
const state = exported && typeof exported === "object" ? (exported as object) : buildState(SHEET);
const sheet = getProject("Pazhoohesh-Yar Film", { state }).sheet(SHEET);

// Slider ranges for Studio: the props worth dragging by hand get sensible bounds.
const RANGES: Record<string, Record<string, [number, number]>> = {
  Camera: {
    fDist: [0.2, 3], fYaw: [-1.6, 1.6], fPitch: [-1.3, 1.3], fLead: [-0.1, 0.15], fRoll: [-0.4, 0.4],
    fov: [12, 60], follow: [0, 1], frame: [0, 1], roll: [-0.4, 0.4],
  },
};
const obj = Object.fromEntries(
  Object.entries(defaults).map(([k, props]) => [
    k,
    sheet.object(
      k,
      Object.fromEntries(
        Object.entries(props).map(([p, val]) => {
          const r = RANGES[k]?.[p];
          return [p, r ? types.number(val, { range: r, nudgeMultiplier: (r[1] - r[0]) / 200 }) : val];
        }),
      ),
    ),
  ]),
) as unknown as Record<string, ISheetObject<Record<string, number>>>;
const v = (o: string) => obj[o].value as Record<string, number>;

// Studio ↔ page. Dragging the Studio playhead scrolls the page there (so captions, labels and
// sound follow through the normal scroll path); scrolling moves the playhead. Whichever moved
// last leads for a moment, so the two never fight.
const studioSync = { seq: -1, lead: 0 };
function syncStudio() {
  const seq = sheet.sequence.position;
  const now = performance.now();
  if (studioSync.seq >= 0 && Math.abs(seq - studioSync.seq) > 1e-4 && Math.abs(seq - clock.t) > 0.05) {
    studioSync.lead = now + 1600; // Studio moved the playhead
    const track = document.querySelector<HTMLElement>("[data-track]");
    if (track && seq >= INTRO_END) {
      const range = track.offsetHeight - window.innerHeight;
      window.scrollTo(0, ((seq - INTRO_END) / (LENGTH - INTRO_END)) * range);
    }
  } else if (now > studioSync.lead) {
    sheet.sequence.position = clock.t;
  }
  studioSync.seq = sheet.sequence.position;
}

/** Overall light level for the card lights; one knob for "too bright / too dark". */
const LIGHT = 0.65;

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// A dark product studio: softboxes and a dim floor bounce for the brushed metal to reflect.
function useStudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const env = new THREE.Scene();
    env.background = new THREE.Color("#010205");
    const box = (w: number, h: number, color: string, pos: [number, number, number]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
      m.position.set(...pos);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(1.2, 9, "#dfe9ff", [-5, 1, 2]);
    box(8, 0.8, "#ffffff", [0, 5, -1]);
    box(1, 7, "#6a90da", [5, 0, -3]);
    box(5, 3, "#2a3c66", [0, 0.5, 7]);
    box(12, 12, "#0c1430", [0, -6, 0]);
    const pmrem = new THREE.PMREMGenerator(gl as unknown as THREE.WebGPURenderer);
    const tex = pmrem.fromScene(env, 0.02).texture;
    scene.environment = tex;
    return () => {
      env.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
}

type F = THREE.UniformNode<"float", number>;

// 900 motes drifting up through the whole set, as instanced sprites (WebGPU has no point size).
function Dust({ u }: { u: { uTime: F; uOpacity: F; uPx: F } }) {
  const sprite = useMemo(() => {
    const n = 900;
    const d = new Float32Array(n * 4); // xyz, seed
    for (let i = 0; i < n; i++) {
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
    const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    m.positionNode = p;
    m.scaleNode = vec2(size, size.mul(streakSize(motion.vel)));
    m.colorNode = vec3(0.75, 0.85, 1);
    m.opacityNode = bokehAlpha(uv(), c).mul(seed.mul(0.75).add(0.25)).mul(u.uOpacity).mul(0.5);
    const s = new THREE.Sprite(m);
    s.count = n;
    s.frustumCulled = false;
    return s;
  }, [u]);
  useEffect(() => () => sprite.material.dispose(), [sprite]);
  return <primitive object={sprite} />;
}

// Soft light from behind the card, plus a volumetric beam from above; both travel with the card.
const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
function hazeMaterial(uHaze: F) {
  const m = new THREE.MeshBasicNodeMaterial(additive);
  const d = uv().sub(vec2(0.5, 0.55)).mul(vec2(1, 1.3)).length();
  m.colorNode = vec3(0.021, 0.042, 0.105).mul(smoothstep(0.6, 0, d)).mul(uHaze);
  return m;
}
function beamMaterial(uBeam: F) {
  const m = new THREE.MeshBasicNodeMaterial({ ...additive, side: THREE.DoubleSide });
  const y = uv().y;
  const along = smoothstep(0, 0.9, y).mul(smoothstep(1, 0.75, y));
  const across = pow(sin(uv().x.mul(Math.PI)), 6);
  m.colorNode = vec3(0.6, 0.75, 1).mul(along).mul(across).mul(uBeam).mul(0.22);
  return m;
}

const hash = (p: THREE.Node<"vec2">) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));

// The post chain: scene → bloom (half resolution) → fracture → tone map + sRGB → SMAA.
// No MSAA: 4x multisampling on a half-float target cost 2-3x the whole frame on integrated
// GPUs (measured: 54 → 165 fps on the doors). SMAA at the end smooths edges for a fraction.
// Act transitions: for a beat the picture fractures along the card's own circuit. Blocks
// slide only along their trace direction (never diagonal noise), the cracks light up blue,
// and colour splits along the crack. The same pass adds a faint vertical split at scroll speed.
function createPost(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera, mask: THREE.Texture) {
  const scenePass = pass(scene, camera);
  const sceneTex = scenePass.getTextureNode("output");
  // Bloom at half resolution: it is a blur, nobody sees the difference, and it costs a quarter.
  const bloomPass = bloom(sceneTex, 0.6, 0.55, 0.82).setResolutionScale(0.5);
  // r186 runtime name (its @types call it getTexture).
  const bloomTex = (bloomPass as unknown as { getTextureNode(): THREE.TextureNode }).getTextureNode();
  const u = { shift: uniform(0), time: uniform(0), aspect: uniform(1) };
  const col = (q: THREE.Node<"vec2">) => sceneTex.sample(q).rgb.add(bloomTex.sample(q).rgb);
  const fracture = Fn(() => {
    const vUv = uv();
    const out = col(vUv).toVar();
    // Between transitions and at rest: just the bloomed frame, none of the fracture math.
    If(u.shift.greaterThan(0.01).or(motion.vel.greaterThan(0.15)), () => {
      const g = vec2(u.aspect, 1).mul(11);
      const cell = floor(vUv.mul(g));
      const tick = floor(u.time.mul(18));
      const hit = step(u.shift.mul(-0.5).add(1), hash(cell.add(tick.mul(0.37))));
      const horiz = step(0.5, hash(cell.mul(1.7).add(3.1)));
      const dir = mix(vec2(0, 1), vec2(1, 0), horiz);
      const q = vUv.add(dir.mul(hash(cell.add(tick).add(9)).sub(0.5).mul(0.06).mul(u.shift).mul(hit)));
      const ca = dir.mul(u.shift.mul(0.007).mul(hit.add(0.3))).add(vec2(0, 0.0012).mul(motion.vel));
      const c = vec3(col(q.add(ca)).r, col(q).g, col(q.sub(ca)).b);
      const f = fract(vUv.mul(g));
      const border = hit.mul(smoothstep(0, 0.035, min(min(f.x, f.x.oneMinus()), min(f.y, f.y.oneMinus()))).oneMinus());
      const m = texture(mask, fract(vUv.mul(vec2(u.aspect, 1)).mul(0.85).add(vec2(0.12, 0.3)))).r;
      out.assign(c.add(vec3(0.45, 0.78, 1).mul(border.mul(0.9).add(m.mul(0.55))).mul(u.shift)));
    });
    return vec4(out, 1);
  });
  const pipeline = new THREE.RenderPipeline(renderer);
  // Tone mapping and sRGB before SMAA, as the WebGL chain had it (OutputPass → SMAAPass):
  // edge detection on display values finds the edges in this dark film.
  pipeline.outputColorTransform = false;
  const aa = smaa(renderOutput(fracture(), THREE.NeutralToneMapping, THREE.SRGBColorSpace));
  pipeline.outputNode = aa;
  const dispose = () => {
    pipeline.dispose();
    scenePass.dispose();
    bloomPass.dispose();
    aa.dispose();
  };
  return { pipeline, scenePass, bloom: bloomPass, u, dispose };
}

function Film({ onReady }: { onReady: () => void }) {
  const three = useThree();
  const { scene, camera, size } = three;
  // R3F types the renderer as WebGLRenderer; the Canvas below hands it a WebGPURenderer.
  const gl = three.gl as unknown as THREE.WebGPURenderer;
  const cam = camera as THREE.PerspectiveCamera;
  const rig = useMemo(createRig, []);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const box = useRef<THREE.RectAreaLight>(null);
  const strip = useRef<THREE.RectAreaLight>(null);
  const haze = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);

  const live = useMemo(
    () => ({
      dust: { uTime: uniform(0), uOpacity: uniform(0), uPx: uniform(0) },
      haze: uniform(0),
      beam: uniform(0),
      path: makePathU(),
      doors: makeDoorsU(),
      talent: makeTalentU(),
      emerge: makeEmergeU(),
    }),
    [],
  );
  const hazeMat = useMemo(() => hazeMaterial(live.haze), [live]);
  const beamMat = useMemo(() => beamMaterial(live.beam), [live]);
  useEffect(
    () => () => {
      hazeMat.dispose();
      beamMat.dispose();
    },
    [hazeMat, beamMat],
  );
  const tmp = useMemo(
    () => ({
      target: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      head: new THREE.Vector3(),
      v: new THREE.Vector3(),
      ray: new THREE.Vector3(),
      xy: [0, 0] as [number, number],
    }),
    [],
  );

  // Pointer: parallax everywhere; in the finale, drag spins the card and press-and-hold charges it.
  const ptr = useRef({ x: 0, y: 0, sx: 0, sy: 0, down: false, moved: false, downX: 0, lastX: 0, downAt: 0, active: false });
  const hands = useRef({ spin: 0, vel: 0, idle: 0, charge: 0, burst: -1 });
  const interact = useRef(0);
  const ctaHover = useRef(false);
  const hover = useRef(0);

  useStudioEnvironment();

  const circuitMask = useLoader(THREE.TextureLoader, "/images/circuit-mask.png");
  const post = useMemo(() => createPost(gl, scene, camera, circuitMask), [gl, scene, camera, circuitMask]);
  useEffect(() => post.dispose, [post]);
  const setDpr = useThree((s) => s.setDpr);

  // Adaptive quality: hold ~60 fps by stepping the render scale down ~15% at a time on weak
  // GPUs, back up when there's headroom. DPR is capped at 1.5: above that nobody sees the
  // difference, and 2 would be 1.8x the pixels.
  const gov = useRef({ t: 0, n: 0, warm: 0, cool: 0, good: 0, step: 0 });
  const ladder = useMemo(() => {
    const top = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, 1.5);
    return [1, 0.85, 0.72, 0.6].map((k) => Math.max(0.6, top * k)).filter((v, i, a) => i === 0 || v < a[i - 1] - 0.01);
  }, []);

  const anchors = useRef<{ stage: HTMLElement[]; door: HTMLElement[] }>({ stage: [], door: [] });
  const labelW = useRef<number[]>([]);
  useEffect(() => {
    const pick = (p: string) =>
      Array.from(document.querySelectorAll<HTMLElement>(`[data-anchor^="${p}-"]`)).sort(
        (a, b) => +a.dataset.anchor!.split("-")[1] - +b.dataset.anchor!.split("-")[1],
      );
    anchors.current = { stage: pick("stage"), door: pick("door") };
  }, []);

  useEffect(() => {
    const p = ptr.current;
    const move = (e: PointerEvent) => {
      p.active = e.pointerType !== "touch" || p.down;
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!p.down) return;
      if (Math.abs(e.clientX - p.downX) > 6) p.moved = true;
      if (p.moved) {
        const d = (e.clientX - p.lastX) * 0.009;
        hands.current.spin += d;
        hands.current.vel = d * 60;
      }
      p.lastX = e.clientX;
    };
    const down = (e: PointerEvent) => {
      if (interact.current < 0.5 || (e.target as Element).closest("a, button, .end-credits")) return;
      p.active = true;
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = (e.clientY / window.innerHeight) * 2 - 1;
      Object.assign(p, { down: true, moved: false, downX: e.clientX, lastX: e.clientX, downAt: performance.now() });
      hands.current.idle = 0;
    };
    const up = (e: PointerEvent) => {
      p.down = false;
      if (e.pointerType === "touch") p.active = false;
    };
    const leave = () => (p.active = false);
    const over = (e: PointerEvent) => (ctaHover.current = !!(e.target as Element).closest?.(".finale .cta"));
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerover", over);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  // Profiling hook, only with ?debug in the URL: lets DevTools toggle parts of the scene.
  useEffect(() => {
    if (!window.location.search.includes("debug")) return;
    (window as unknown as { __film?: unknown }).__film = { scene, gl, rig, post, gov, lights: { key, rim, box, strip } };
  }, [scene, gl, rig, post]);

  const ready = useRef(false);
  const warming = useRef(false);
  const prev = useRef({ t: 0, z: 0, vel: 0 });
  const cursorOn = useRef(0);
  useFrame((state, dt) => {
    const g = gov.current;
    g.warm += dt;
    if (g.warm > 3 && !document.hidden) {
      g.t += dt;
      g.n++;
      g.cool -= dt;
      if (g.t >= 1) {
        const fps = g.n / g.t;
        g.t = 0;
        g.n = 0;
        g.good = fps > 58 ? g.good + 1 : 0;
        // Steps: halve the particle budget first (cheapest to lose), then lower the render scale.
        const steps = ladder.length + 1;
        const apply = () => {
          quality.particles = g.step >= 1 ? 0.5 : 1;
          setDpr(ladder[Math.max(0, g.step - 1)]);
        };
        if (fps < 45 && g.step < steps - 1 && g.cool <= 0) {
          g.step++;
          g.cool = 2.5;
          apply();
        } else if (g.good >= 4 && g.step > 0 && g.cool <= 0) {
          g.step--;
          g.cool = 4;
          g.good = 0;
          apply();
        }
      }
    }
    if (!studioMode) sheet.sequence.position = clock.t;
    else syncStudio();
    const C = v("Camera");
    const K = v("Card");
    const L = v("Light");
    const A = v("Atmos");
    const P = v("Path");
    const F = v("Final");
    const t = state.clock.elapsedTime;
    const p = ptr.current;
    const h = hands.current;
    const card = rig.card;
    interact.current = F.interact;

    // Finale hands: inertia, spring home when idle, hold to charge, release a burst at full charge.
    if (!p.down) {
      h.spin += h.vel * dt;
      h.vel *= Math.exp(-3 * dt);
      h.idle += dt;
      if (h.idle > 1.4) h.spin += (Math.round(h.spin / (Math.PI * 2)) * Math.PI * 2 - h.spin) * Math.min(1, dt * 2.2);
    }
    const holding = p.down && !p.moved && performance.now() - p.downAt > 220 && F.interact > 0.5;
    h.charge = THREE.MathUtils.clamp(h.charge + (holding ? dt / 1.5 : -dt * 1.4), 0, 1);
    if (h.charge >= 1 && h.burst < 0) {
      h.burst = 0;
      h.charge = 0;
      p.down = false;
    }
    let burstMix = 0;
    if (h.burst >= 0) {
      h.burst += dt;
      burstMix = Math.sin(Math.PI * Math.min(h.burst / 2.2, 1));
      if (h.burst > 2.2) h.burst = -1;
    }
    if (F.interact < 0.5) {
      h.spin *= Math.exp(-4 * dt);
      h.charge = 0;
    }
    gl.domElement.style.cursor = F.interact > 0.5 ? (p.down && p.moved ? "grabbing" : "grab") : "";

    // The card.
    const I = v("Intro");
    if (card) {
      card.visible = clock.t >= 2.85;
      card.position.set(K.x, K.y + Math.sin(t * 0.6) * 0.012, K.z);
      card.rotation.set(K.rx, K.ry + h.spin, K.rz);
      card.scale.setScalar(1 + h.charge * 0.02);
      card.updateMatrixWorld();
    }

    // Camera: keyed shot, blended into a tracking shot on the path head.
    const aspect = size.width / size.height;
    const portrait = aspect < 0.8;
    tmp.target.set(C.tx, C.ty, C.tz);
    tmp.pos.set(C.x, C.y, C.z);
    if (C.follow > 0 && card) {
      // Orbit the path head in card space, looking a little ahead along the arc (all authored
      // in Theatre: fDist, fYaw, fPitch, fLead, fRoll).
      pointAt(P.progress + C.fLead, tmp.xy);
      tmp.head.set(tmp.xy[0], tmp.xy[1], FACE_Z);
      const d = C.fDist * (portrait ? 1.3 : 1);
      const cp = Math.cos(C.fPitch);
      tmp.v.set(Math.sin(C.fYaw) * cp, Math.sin(C.fPitch), Math.cos(C.fYaw) * cp).multiplyScalar(d).add(tmp.head);
      tmp.head.applyMatrix4(card.matrixWorld);
      tmp.v.applyMatrix4(card.matrixWorld);
      tmp.target.lerp(tmp.head, C.follow);
      tmp.pos.lerp(tmp.v, C.follow);
    }
    // Portrait screens: pull back along the line of sight.
    const back = portrait ? 1 + (0.8 - aspect) * 1.1 : 1;
    tmp.pos.sub(tmp.target).multiplyScalar(back).add(tmp.target);
    // Caption beats: slide the card aside (desktop) or up (portrait) to give the words room.
    const fx = portrait ? 0 : 0.62 * C.frame;
    const fy = portrait ? -0.42 * C.frame : 0;
    tmp.target.x += fx;
    tmp.target.y += fy;
    tmp.pos.x += fx;
    tmp.pos.y += fy;
    p.sx += (p.x - p.sx) * Math.min(1, dt * 2.5);
    p.sy += (p.y - p.sy) * Math.min(1, dt * 2.5);
    const sway = 1 - F.interact * 0.7;
    tmp.pos.x += p.sx * 0.08 * sway + Math.sin(t * 37) * 0.003 * h.charge;
    tmp.pos.y -= p.sy * 0.06 * sway + Math.cos(t * 41) * 0.003 * h.charge;
    cam.position.copy(tmp.pos);
    cam.lookAt(tmp.target);
    cam.rotateZ(C.roll + C.fRoll * C.follow);
    if (cam.fov !== C.fov) {
      cam.fov = C.fov;
      cam.updateProjectionMatrix();
    }

    const areaK = 1 - THREE.MathUtils.smoothstep(C.follow, 0.4, 0.9);
    // Lights travel with the card; in the finale the softbox follows the cursor across the metal.
    if (card) {
      const c = card.position;
      if (box.current) {
        box.current.position.set(c.x - 2.4 + p.sx * 1.6 * F.interact, c.y + 1.2 - p.sy * 0.8 * F.interact, c.z + 2.6);
        box.current.lookAt(c);
        // Area lights cost half the frame in the macro path shot (measured 39 → 77 fps without
        // them); there the card fills the screen and the studio env carries the reflections.
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
      haze.current?.position.set(c.x, c.y, c.z - 7);
      beam.current?.position.set(c.x - 0.6, c.y + 3.2, c.z - 1.2);
    }
    // The key light is a side fill, not a spotlight: half strength keeps the metal from going flat-blue.
    if (key.current) key.current.intensity = L.key * LIGHT * 0.5;

    rig.uniforms.uTime.value = t;
    rig.uniforms.uGlow.value = v("Circuit").glow;
    rig.uniforms.uCharge.value = h.charge;
    rig.uniforms.uForm.value = K.form;
    rig.uniforms.uIgnite.value = K.ignite;
    rig.uniforms.uNameGlow.value = K.nameGlow;
    rig.uniforms.uDetail.value = C.follow;
    pointAt(P.progress, tmp.xy);
    rig.uniforms.uHeadUv.value.set(tmp.xy[0] / CARD_W + 0.5, tmp.xy[1] / CARD_H + 0.5);
    rig.uniforms.uHeadOn.value = P.alpha * C.follow;
    // The light sweep: keyed through the film, then held by the cursor in the finale.
    // Band centre c ∈ [0,1] across the face ↔ sweep phase (c + 0.4) / 1.8 (see the face shader).
    const cursorSweep = 1 + (THREE.MathUtils.clamp((p.sx + 1) / 2, 0.08, 0.92) + 0.4) / 1.8;
    rig.uniforms.uSweep.value = THREE.MathUtils.lerp(L.sweep, cursorSweep, F.interact);
    rig.uniforms.uSweepAngle.value = L.sweepAngle;
    // Hovering the CTA gathers the card's network around it (after igloo.inc's link particles).
    hover.current += ((ctaHover.current ? 0.75 : 0) - hover.current) * Math.min(1, dt * 3);
    rig.network.uMix.value = Math.max(burstMix, hover.current * F.interact);
    // Scroll speed: smoothed for the particle streaks and a faint colour split. No full-frame trail:
    // smearing the card while it moves read as blur.
    const pv = prev.current;
    pv.vel += (clock.v - pv.vel) * Math.min(1, dt * (clock.v > pv.vel ? 8 : 3));
    const vel = pv.vel < 0.004 ? 0 : pv.vel;
    motion.vel.value = vel;
    post.u.shift.value = A.shift;
    post.u.time.value = t;
    post.u.aspect.value = size.width / size.height;
    rig.network.uTime.value = t;
    rig.network.uSize.value = 22 * gl.getPixelRatio();
    if (rig.faces[0]) rig.faces[0].envMapIntensity = L.env * (1 + 0.1 * (1 - areaK));
    if (rig.faces[1]) rig.faces[1].envMapIntensity = L.env * 0.5;
    if (rig.edge) {
      rig.edge.emissiveIntensity = L.edge * 0.6 + h.charge * 2.5;
      rig.edge.envMapIntensity = L.env * 1.4;
    }

    live.dust.uTime.value = t;
    live.dust.uOpacity.value = A.dust;
    // World size of one drawing-buffer pixel at depth 1 (the old points were sized in pixels).
    live.dust.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)) / (size.height * gl.getPixelRatio());
    live.haze.value = A.haze * 0.6;
    live.beam.value = L.beam * 0.5;
    live.path.uHead.value = P.progress;
    live.path.uAlpha.value = P.alpha;
    live.path.uTime.value = t;
    live.path.uRecap.value = P.recap;
    live.path.uLift.value = P.lift;
    // Staged funding: while the pulse rests on stage k, the road to k+1 is pre-lit.
    let ahead = 0;
    for (let k = 0; k < STAGES.length - 1; k++) {
      if (clock.t >= stageTime(k) && clock.t < stageTime(k + 1)) {
        ahead = THREE.MathUtils.lerp(STAGES[k].s, STAGES[k + 1].s, THREE.MathUtils.clamp((clock.t - stageTime(k)) / 0.5, 0, 1));
      }
    }
    live.path.uAhead.value = ahead;
    live.emerge.uForm.value = K.form;
    live.emerge.uTime.value = t;
    live.doors.uAlpha.value = v("Doors").alpha;
    live.doors.uCardZ.value = K.z;
    live.doors.uTime.value = t;
    live.talent.uTalent.value = I.talent;
    live.talent.uChosen.value = I.chosen;
    live.talent.uTime.value = t;
    live.talent.uStreams.value = I.streams;
    live.talent.uFieldZ.value = I.fieldZ;
    // "You are the chosen one": in the finale the pointer is a point of light on the card's plane.
    cursorOn.current += ((p.active ? F.interact : 0) - cursorOn.current) * Math.min(1, dt * 4);
    live.talent.uCursorOn.value = cursorOn.current;
    if (cursorOn.current > 0.001) {
      tmp.ray.set(p.sx, -p.sy, 0.5).unproject(cam).sub(cam.position).normalize();
      const k = (K.z - cam.position.z) / (tmp.ray.z || -1);
      live.talent.uCursor.value.copy(cam.position).addScaledVector(tmp.ray, k);
    }
    // Less bloom while the camera rides the path: the head should glow, not the whole frame.
    post.bloom.strength.value = A.bloom * 0.7 * (1 - 0.4 * C.follow) + h.charge * 0.45 + burstMix * 0.3;
    // Focus sits on what the shot is about: the path head, or the card.
    lens.focus.value = cam.position.distanceTo(tmp.target);
    lens.bokeh.value = A.dof;
    gl.toneMappingExposure = A.exposure;

    // Sound (no-ops unless the visitor turned it on): events fire on forward crossings only.
    const t0 = pv.t;
    const t1 = clock.t;
    const crossed = (at: number) => t1 > t0 && t1 - t0 < 1.5 && t0 < at && at <= t1;
    if (crossed(1.6)) sound.chosen();
    if (crossed(3.0)) sound.merge();
    STAGES.forEach((_, k) => crossed(stageTime(k)) && sound.node(k));
    DOORS_Z.forEach((z) => pv.z > z && K.z <= z && pv.z - K.z < 4 && sound.door());
    if (crossed(finale.at)) sound.finale();
    if (h.burst >= 0 && h.burst <= dt + 1e-4) sound.burst();
    sound.charge(F.interact > 0.5 ? h.charge : 0);
    sound.intensity(THREE.MathUtils.clamp(0.25 + v("Circuit").glow * 0.35 + vel * 0.3 + h.charge * 0.5 + live.doors.uAlpha.value * 0.2, 0, 1));
    pv.t = t1;
    pv.z = K.z;

    // DOM anchors: stage titles ride their nodes on the card, door titles ride the doors.
    cam.updateMatrixWorld();
    const W = size.width;
    const H = size.height;
    if (card) {
      anchors.current.stage.forEach((el, k) => {
        const s = STAGES[k];
        if (!s) return;
        tmp.v.set(s.pos[0], s.pos[1], FACE_Z).applyMatrix4(card.matrixWorld).project(cam);
        // Keep the whole title on screen: it runs away from its node, toward the side it names,
        // and the rail owns the inline-end (left) edge.
        const w = (labelW.current[k] ||= (el.firstElementChild as HTMLElement).offsetWidth);
        const left = el.dataset.side === "left";
        const x = THREE.MathUtils.clamp(((tmp.v.x + 1) / 2) * W, left ? w + 56 : 16, W - (left ? 16 : w + 16));
        el.style.transform = `translate3d(${x}px, ${((1 - tmp.v.y) / 2) * H}px, 0)`;
      });
    }
    anchors.current.door.forEach((el, k) => {
      const z = DOORS_Z[k];
      const dz = cam.position.z - z;
      // Over the doorway, inside the frame, so it stays on screen as the camera nears.
      tmp.v.set(0, DOOR_H * 0.3, z).project(cam);
      el.style.transform = `translate3d(${((tmp.v.x + 1) / 2) * W}px, ${((1 - tmp.v.y) / 2) * H}px, 0)`;
      el.style.opacity = String(dz <= 0 ? 0 : smooth(10, 6.5, dz) * smooth(1.2, 3, dz) * live.doors.uAlpha.value);
    });
  }, -1);

  useFrame(() => {
    // The end credits cover the screen: nothing to show, nothing to render.
    if (clock.covered && ready.current) return;
    post.pipeline.render();
    if (!ready.current && rig.card && !warming.current) {
      // Shader warm-up behind the loading screen: every program compiles now, in parallel where
      // the driver allows, instead of hitching the first time a door or the constellation appears.
      warming.current = true;
      const hidden: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
      // Compiled for the scene pass target (half-float), which is where the scene is drawn.
      post.scenePass
        .compileAsync(gl)
        .catch(() => {})
        .then(() => {
          for (const o of hidden) o.visible = false;
          post.pipeline.render(); // also compiles the post chain (the fracture branch is in the same shader)
          ready.current = true;
          onReady();
        });
    }
  }, 1);

  return (
    <>
      {/* Neutral tone mapping subtracts an offset set by the darkest channel; this input lands on
          the approved navy #0f1d4d on screen (solved for the offset, then measured). */}
      <color attach="background" args={["#2e3558"]} />
      <directionalLight ref={key} position={[-2.5, 2.5, 4]} color="#e6eeff" intensity={0} />
      <rectAreaLight ref={box} width={2.2} height={3.2} color="#eef4ff" intensity={0} />
      <rectAreaLight ref={strip} width={0.35} height={3.6} color="#9fc4ff" intensity={0} />
      <spotLight ref={rim} angle={0.5} penumbra={1} color="#9fc4ff" intensity={0} decay={1.6} />
      <mesh ref={haze} scale={[26, 18, 1]}>
        <planeGeometry />
        <primitive object={hazeMat} attach="material" />
      </mesh>
      <mesh ref={beam} rotation={[0, 0, -0.22]}>
        <cylinderGeometry args={[0.25, 1.6, 7, 48, 1, true]} />
        <primitive object={beamMat} attach="material" />
      </mesh>
      <Dust u={live.dust} />
      <Talent u={live.talent} />
      <Doors u={live.doors} />
      <Card rig={rig}>
        <Emergence u={live.emerge} />
        <PathTrace u={live.path} />
        <Constellation u={live.path} />
        <Stations u={live.path} />
      </Card>
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={async (props) => {
        // WebGPU where the browser has it, WebGL2 otherwise (automatic); ?webgl forces the fallback.
        // No MSAA (see createPost): SMAA in the post chain smooths the edges.
        const r = new THREE.WebGPURenderer({
          ...(props as object),
          antialias: false,
          powerPreference: "high-performance",
          forceWebGL: window.location.search.includes("webgl"),
        });
        await r.init();
        return r;
      }}
      camera={{ fov: 30, near: 0.05, far: 80, position: [0, 0, 6] }}
      onCreated={({ gl }) => {
        // Neutral keeps the artwork's colours and the navy ground true; ACES shifted both.
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Film onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
