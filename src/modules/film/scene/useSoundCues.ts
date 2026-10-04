import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three/webgpu";
import { sound } from "@/modules/film/audio/sound";
import { finale } from "@/modules/film/constants/copy";
import { clock } from "@/modules/film/timeline/clock";
import { STAGES, stageTime } from "@/modules/film/timeline/path";
import { DOORS_Z } from "@/modules/film/timeline/storyboard";
import { live } from "./live";
import { values } from "./theatre";

/** The film's sound cues (no-ops unless the visitor turned sound on). Events fire on forward crossings only. */
export function useSoundCues() {
  const prev = useRef({ t: 0, z: 0 });

  useFrame(() => {
    const pv = prev.current;
    const t0 = pv.t;
    const t1 = clock.t;
    const z = values("Card").z;
    const glow = values("Circuit").glow;
    const charge = live.hands.charge;
    const crossed = (at: number) => t1 > t0 && t1 - t0 < 1.5 && t0 < at && at <= t1;
    if (crossed(1.6)) sound.chosen();
    if (crossed(3.0)) sound.merge();
    STAGES.forEach((_, k) => crossed(stageTime(k)) && sound.node(k));
    DOORS_Z.forEach((d) => pv.z > d && z <= d && pv.z - z < 4 && sound.door());
    if (crossed(finale.at)) sound.finale();
    if (live.burstStarted) sound.burst();
    sound.charge(live.interact > 0.5 ? charge : 0);
    sound.intensity(THREE.MathUtils.clamp(0.25 + glow * 0.35 + live.vel * 0.3 + charge * 0.5 + values("Doors").alpha * 0.2, 0, 1));
    pv.t = t1;
    pv.z = z;
  });
}
