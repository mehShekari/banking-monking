"use client";

import { getProject, type ISheetObject } from "@theatre/core";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Assemble } from "./Assemble";
import { Card, FACE_Z, createRig } from "./Card";
import { bokehGLSL, clock, cocGLSL, lens, motion, streakGLSL } from "./clock";
import { Constellation } from "./Constellation";
import { finale } from "./copy";
import { DOOR_H, Doors } from "./Doors";
import { Talent, type TalentU } from "./Intro";
import { PathTrace, type PathU } from "./PathTrace";
import { STAGES, pointAt, stageTime } from "./path";
import { sound } from "./sound";
import { DOORS_Z, buildState, defaults } from "./storyboard";

RectAreaLightUniformsLib.init();

const SHEET = "Film";
const studioMode =
  process.env.NODE_ENV === "development" && typeof window !== "undefined" && window.location.search.includes("studio");

if (studioMode) import("@theatre/studio").then((m) => m.default.initialize());

const sheet = getProject("Pazhoohesh-Yar Film", { state: buildState(SHEET) }).sheet(SHEET);
const obj = Object.fromEntries(Object.entries(defaults).map(([k, props]) => [k, sheet.object(k, props)])) as Record<
  string,
  ISheetObject<Record<string, number>>
>;
const v = (o: string) => obj[o].value as Record<string, number>;

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
    const pmrem = new THREE.PMREMGenerator(gl);
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

const dustVert = /* glsl */ `
${cocGLSL}
${streakGLSL}
uniform float uTime;
attribute float aSeed;
varying float vA;
varying float vC;
void main() {
  vec3 p = position;
  p.y += mod(uTime * (0.03 + aSeed * 0.04) + aSeed * 10.0, 10.0) - 5.0;
  p.x += sin(uTime * 0.2 + aSeed * 30.0) * 0.15;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vC = coc(-mv.z);
  gl_PointSize = (1.0 + aSeed * 2.5) * 22.0 / -mv.z * (1.0 + vC * 2.5) * streakSize(uVel);
  vA = 0.25 + aSeed * 0.75;
}`;
const dustFrag = /* glsl */ `
${bokehGLSL}
${streakGLSL}
uniform float uOpacity;
varying float vA;
varying float vC;
void main() {
  float a = bokehAlpha(streakCoord(gl_PointCoord, uVel), vC);
  gl_FragColor = vec4(vec3(0.75, 0.85, 1.0), a * vA * uOpacity * 0.5);
}`;

function Dust({ uniforms }: { uniforms: Record<string, { value: number }> }) {
  const geo = useMemo(() => {
    const n = 900;
    const p = new Float32Array(n * 3);
    const s = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 10, 4 - Math.random() * 26], i * 3);
      s[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        vertexShader={dustVert}
        fragmentShader={dustFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Soft light from behind the card, plus a volumetric beam from above; both travel with the card.
const hazeFrag = /* glsl */ `
uniform float uHaze;
varying vec2 vUv;
void main() {
  float d = length((vUv - vec2(0.5, 0.55)) * vec2(1.0, 1.3));
  gl_FragColor = vec4(vec3(0.06, 0.12, 0.3) * smoothstep(0.6, 0.0, d) * uHaze, 1.0);
}`;
const beamFrag = /* glsl */ `
uniform float uBeam;
varying vec2 vUv;
void main() {
  float along = smoothstep(0.0, 0.9, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
  float across = pow(sin(vUv.x * 3.14159), 6.0);
  gl_FragColor = vec4(vec3(0.6, 0.75, 1.0) * along * across * uBeam * 0.22, 1.0);
}`;
// Act transitions: for a beat the picture fractures along the card's own circuit. Blocks
// slide only along their trace direction (never diagonal noise), the cracks light up blue,
// and colour splits along the crack. The same pass adds a faint vertical split at scroll speed.
const FractureShader = {
  uniforms: {
    tDiffuse: { value: null },
    uMask: { value: null as THREE.Texture | null },
    uShift: { value: 0 },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uVel: { value: 0 },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse, uMask;
uniform float uShift, uTime, uAspect, uVel;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 g = vec2(uAspect, 1.0) * 11.0;
  vec2 cell = floor(vUv * g);
  float tick = floor(uTime * 18.0);
  float hit = step(1.0 - 0.5 * uShift, hash(cell + tick * 0.37));
  float horiz = step(0.5, hash(cell * 1.7 + 3.1));
  vec2 dir = mix(vec2(0.0, 1.0), vec2(1.0, 0.0), horiz);
  vec2 uv = vUv + dir * (hash(cell + tick + 9.0) - 0.5) * 0.06 * uShift * hit;
  vec2 ca = dir * 0.007 * uShift * (0.3 + hit) + vec2(0.0, 0.0012) * uVel;
  vec3 c = vec3(texture2D(tDiffuse, uv + ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - ca).b);
  vec2 f = fract(vUv * g);
  float border = hit * (1.0 - smoothstep(0.0, 0.035, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y))));
  float m = texture2D(uMask, fract(vUv * vec2(uAspect, 1.0) * 0.85 + vec2(0.12, 0.3))).r;
  c += vec3(0.45, 0.78, 1.0) * (border * 0.9 + m * 0.55) * uShift;
  gl_FragColor = vec4(c, 1.0);
}`,
};

const uvVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function Film({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera, size } = useThree();
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
      dust: { uTime: { value: 0 }, uOpacity: { value: 0 }, ...lens, ...motion },
      haze: { uHaze: { value: 0 } },
      beam: { uBeam: { value: 0 } },
      path: {
        uHead: { value: 0 },
        uAlpha: { value: 0 },
        uTime: { value: 0 },
        uAhead: { value: 0 },
        uRecap: { value: -1 },
        uLift: { value: 0 },
      } satisfies PathU,
      doors: { uAlpha: { value: 0 }, uCardZ: { value: 0 }, uTime: { value: 0 } },
      talent: {
        uTalent: { value: 0 },
        uChosen: { value: 0 },
        uTime: { value: 0 },
        uStreams: { value: 0 },
        uFieldZ: { value: 0 },
        uCursor: { value: new THREE.Vector3() },
        uCursorOn: { value: 0 },
      } satisfies TalentU,
      assemble: { uForm: { value: 0 }, uTime: { value: 0 } },
    }),
    [],
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

  const composer = useMemo(() => {
    // No MSAA: 4x multisampling on a half-float target cost 2-3x the whole frame on integrated
    // GPUs (measured: 54 → 165 fps on the doors). SMAA at the end smooths edges for a fraction.
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    // Bloom at half resolution: it is a blur, nobody sees the difference, and it costs a quarter.
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.82);
    const fullSize = bloomPass.setSize.bind(bloomPass);
    bloomPass.setSize = (w: number, h: number) => fullSize(Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 2)));
    c.addPass(bloomPass);
    c.addPass(new ShaderPass(FractureShader));
    c.addPass(new OutputPass());
    c.addPass(new SMAAPass());
    return c;
  }, [gl, scene, camera]);
  const bloom = composer.passes[1] as UnrealBloomPass;
  const shift = composer.passes[2] as ShaderPass;
  const circuitMask = useLoader(THREE.TextureLoader, "/images/circuit-mask.png");
  useEffect(() => {
    shift.uniforms.uMask.value = circuitMask;
  }, [shift, circuitMask]);

  const dpr = useThree((s) => s.viewport.dpr);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, dpr, size]);

  // Adaptive quality: hold ~60 fps by stepping the render scale down ~15% at a time on weak
  // GPUs, back up when there's headroom. DPR is capped at 1.5: above that nobody sees the
  // difference, and 2 would be 1.8x the pixels.
  const gov = useRef({ t: 0, n: 0, warm: 0, cool: 0, good: 0, step: 0 });
  const ladder = useMemo(() => {
    const top = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio, 1.5);
    return [1, 0.85, 0.72, 0.6].map((k) => Math.max(0.6, top * k)).filter((v, i, a) => i === 0 || v < a[i - 1] - 0.01);
  }, []);
  useEffect(() => () => composer.dispose(), [composer]);

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
    (window as unknown as { __film?: unknown }).__film = { scene, gl, rig, composer, gov, lights: { key, rim, box, strip } };
  }, [scene, gl, rig, composer]);

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
        if (fps < 45 && g.step < ladder.length - 1 && g.cool <= 0) {
          g.step++;
          g.cool = 2.5;
          setDpr(ladder[g.step]);
        } else if (g.good >= 4 && g.step > 0 && g.cool <= 0) {
          g.step--;
          g.cool = 4;
          g.good = 0;
          setDpr(ladder[g.step]);
        }
      }
    }
    if (!studioMode) sheet.sequence.position = clock.t;
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
      pointAt(P.progress, tmp.xy);
      tmp.head.set(tmp.xy[0], tmp.xy[1], FACE_Z).applyMatrix4(card.matrixWorld);
      tmp.v.set(0.1, -0.24, portrait ? 1.9 : 1.45).add(tmp.head);
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
    cam.rotateZ(C.roll);
    if (cam.fov !== C.fov) {
      cam.fov = C.fov;
      cam.updateProjectionMatrix();
    }

    // Lights travel with the card; in the finale the softbox follows the cursor across the metal.
    if (card) {
      const c = card.position;
      if (box.current) {
        box.current.position.set(c.x - 2.4 + p.sx * 1.6 * F.interact, c.y + 1.2 - p.sy * 0.8 * F.interact, c.z + 2.6);
        box.current.lookAt(c);
        box.current.intensity = L.area * LIGHT;
      }
      if (strip.current) {
        strip.current.position.set(c.x + 2.6, c.y + 0.3, c.z + 0.8);
        strip.current.lookAt(c);
        strip.current.intensity = L.area * 0.6 * LIGHT;
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
    if (key.current) key.current.intensity = L.key * LIGHT;

    rig.uniforms.uTime.value = t;
    rig.uniforms.uGlow.value = v("Circuit").glow;
    rig.uniforms.uCharge.value = h.charge;
    rig.uniforms.uForm.value = K.form;
    rig.uniforms.uIgnite.value = K.ignite;
    rig.uniforms.uNameGlow.value = K.nameGlow;
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
    motion.uVel.value = vel;
    shift.uniforms.uShift.value = A.shift;
    shift.uniforms.uTime.value = t;
    shift.uniforms.uAspect.value = size.width / size.height;
    shift.uniforms.uVel.value = vel;
    shift.enabled = A.shift > 0.01 || vel > 0.15;
    rig.network.uTime.value = t;
    rig.network.uSize.value = 22 * gl.getPixelRatio();
    if (rig.faces[0]) rig.faces[0].envMapIntensity = L.env;
    if (rig.faces[1]) rig.faces[1].envMapIntensity = L.env * 0.5;
    if (rig.edge) {
      rig.edge.emissiveIntensity = L.edge * 0.6 + h.charge * 2.5;
      rig.edge.envMapIntensity = L.env * 1.4;
    }

    live.dust.uTime.value = t;
    live.dust.uOpacity.value = A.dust;
    live.haze.uHaze.value = A.haze * 0.6;
    live.beam.uBeam.value = L.beam * 0.5;
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
    live.assemble.uForm.value = K.form;
    live.assemble.uTime.value = t;
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
    bloom.strength = A.bloom * 0.7 + h.charge * 0.45 + burstMix * 0.3;
    // Focus sits on what the shot is about: the path head, or the card.
    lens.uFocus.value = cam.position.distanceTo(tmp.target);
    lens.uBokeh.value = A.dof;
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

  useFrame((_, dt) => {
    // The end credits cover the screen: nothing to show, nothing to render.
    if (clock.covered && ready.current) return;
    composer.render(dt);
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
      shift.enabled = true;
      gl.compileAsync(scene, camera)
        .catch(() => {})
        .then(() => {
          for (const o of hidden) o.visible = false;
          composer.render(0); // also compiles the post passes (fracture is on for this frame)
          ready.current = true;
          onReady();
        });
    }
  }, 1);

  return (
    <>
      {/* Neutral tone mapping subtracts a dark offset from this; on screen it lands near --void (#111c3d). */}
      <color attach="background" args={["#30354c"]} />
      <directionalLight ref={key} position={[-2.5, 2.5, 4]} color="#e6eeff" intensity={0} />
      <rectAreaLight ref={box} width={2.2} height={3.2} color="#eef4ff" intensity={0} />
      <rectAreaLight ref={strip} width={0.35} height={3.6} color="#9fc4ff" intensity={0} />
      <spotLight ref={rim} angle={0.5} penumbra={1} color="#9fc4ff" intensity={0} decay={1.6} />
      <mesh ref={haze} scale={[26, 18, 1]}>
        <planeGeometry />
        <shaderMaterial
          vertexShader={uvVert}
          fragmentShader={hazeFrag}
          uniforms={live.haze}
          depthWrite={false}
          transparent
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={beam} rotation={[0, 0, -0.22]}>
        <cylinderGeometry args={[0.25, 1.6, 7, 48, 1, true]} />
        <shaderMaterial
          vertexShader={uvVert}
          fragmentShader={beamFrag}
          uniforms={live.beam}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Dust uniforms={live.dust} />
      <Talent u={live.talent} />
      <Doors u={live.doors} />
      <Card rig={rig}>
        <Assemble u={live.assemble} />
        <PathTrace u={live.path} />
        <Constellation u={live.path} />
      </Card>
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
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
