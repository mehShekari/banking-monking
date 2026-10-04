"use client";

// The path on the card: the trace, its constellation, and the seven stations, sharing one set
// of uniforms. Card-local child of the card group.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { sound } from "@/modules/film/audio/sound";
import { clock } from "@/modules/film/timeline/clock";
import { STAGES, stageTime } from "@/modules/film/timeline/path";
import { live } from "../live";
import { smooth } from "../smooth";
import { values } from "../theatre";
import { makePathU } from "../tsl";
import { Constellation } from "./Constellation";
import { PathTrace } from "./PathTrace";
import { Stations } from "./Stations";

/** Seconds for the gateway's wave to run the whole path. */
const WAVE_S = 1.1;

export function Path() {
  const u = useMemo(makePathU, []);
  /** The CTA's answer: one light wave along the path, 0…1 while it runs, -1 at rest. */
  const wave = useRef({ t: -1, was: false });

  useFrame((_, dt) => {
    const P = values("Path");
    u.uHead.value = P.progress;
    u.uAlpha.value = P.alpha;
    u.uTime.value = live.t;
    u.uRecap.value = P.recap;
    u.uLift.value = P.lift;

    // Hovering the gateway: the path answers with one wave, start to «اثر», each node flashing
    // as it passes (and pinging, if sound is on). Edge-triggered; a run always finishes.
    const w = wave.current;
    if (live.ctaHover && !w.was && live.interact > 0.5 && w.t < 0) w.t = 0;
    w.was = live.ctaHover;
    if (w.t >= 0) {
      const from = w.t;
      w.t = Math.min(1, w.t + dt / WAVE_S);
      const s0 = THREE.MathUtils.lerp(-0.2, 1.2, smooth(0, 1, from));
      const s1 = THREE.MathUtils.lerp(-0.2, 1.2, smooth(0, 1, w.t));
      STAGES.forEach((st, k) => st.s > s0 && st.s <= s1 && sound.node(k));
      u.uRecap.value = s1;
      if (w.t >= 1) w.t = -1;
    }

    // Staged funding: while the pulse rests on stage k, the road to k+1 is pre-lit.
    let ahead = 0;
    for (let k = 0; k < STAGES.length - 1; k++) {
      if (clock.t >= stageTime(k) && clock.t < stageTime(k + 1)) {
        ahead = THREE.MathUtils.lerp(STAGES[k].s, STAGES[k + 1].s, THREE.MathUtils.clamp((clock.t - stageTime(k)) / 0.5, 0, 1));
      }
    }
    u.uAhead.value = ahead;
  }, -0.5); // after the director (-1), before the trace, constellation and stations read (0)

  return (
    <>
      <PathTrace u={u} />
      <Constellation u={u} />
      <Stations u={u} />
    </>
  );
}
