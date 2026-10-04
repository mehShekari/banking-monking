import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three/webgpu";
import { pointAt } from "@/modules/film/timeline/path";
import { live } from "../live";
import { smooth } from "../smooth";
import { values } from "../theatre";
import { CARD_H, CARD_W } from "@/modules/film/constants/card";
import type { Rig } from "./Card";

/** The card's uniforms and material levels, every frame, from the sheet and the finale's hands. */
export function useCardDrive(rig: Rig) {
  const gl = useThree((s) => s.gl);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), xy: [0, 0] as [number, number] }), []);

  useFrame(() => {
    const C = values("Camera");
    const K = values("Card");
    const L = values("Light");
    const P = values("Path");
    const u = rig.uniforms;
    const charge = live.hands.charge;
    u.uTime.value = live.t;
    u.uGlow.value = values("Circuit").glow;
    u.uCharge.value = charge;
    u.uForm.value = K.form;
    u.uIgnite.value = K.ignite;
    u.uNameGlow.value = K.nameGlow;
    u.uDetail.value = C.follow;
    u.uSweep.value = L.sweep;
    u.uSweepAngle.value = L.sweepAngle;

    // A soft pool of light on the metal: under the path head on the path, under the cursor in
    // the finale (the pointer unprojected onto the face, in card-local units). No light band.
    pointAt(P.progress, tmp.xy);
    u.uHeadUv.value.set(tmp.xy[0] / CARD_W + 0.5, tmp.xy[1] / CARD_H + 0.5);
    u.uHeadOn.value = P.alpha * C.follow * 0.45;
    u.uHeadR.value = 0.05;
    if (live.interact > 0.01 && rig.card && live.cursorOn > 0.001) {
      const v = rig.card.worldToLocal(tmp.v.copy(live.cursor));
      const over = smooth(0.62, 0.5, Math.abs(v.x)) * smooth(0.95, 0.8, Math.abs(v.y));
      u.uHeadUv.value.set(v.x / CARD_W + 0.5, v.y / CARD_H + 0.5);
      u.uHeadOn.value = 0.35 * live.interact * live.cursorOn * over;
      u.uHeadR.value = 0.16;
    }

    // The network is the burst's; a hover is answered by the path.
    rig.network.uMix.value = live.burst;
    rig.network.uTime.value = live.t;
    rig.network.uSize.value = 22 * gl.getPixelRatio();

    const areaK = 1 - THREE.MathUtils.smoothstep(C.follow, 0.4, 0.9);
    if (rig.faces[0]) rig.faces[0].envMapIntensity = L.env * (1 + 0.1 * (1 - areaK));
    if (rig.faces[1]) rig.faces[1].envMapIntensity = L.env * 0.5;
    if (rig.edge) {
      rig.edge.emissiveIntensity = L.edge * 0.6 + charge * 2.5;
      rig.edge.envMapIntensity = L.env * 1.4;
    }
  });
}
