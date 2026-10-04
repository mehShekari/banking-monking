import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three/webgpu";
import { stages } from "@/modules/film/constants/copy";
import { DOORS_Z } from "@/modules/film/timeline/storyboard";
import { STAGES } from "@/modules/film/timeline/path";
import { live } from "./live";
import { smooth } from "./smooth";
import { values } from "./theatre";
import { FACE_Z, type Rig } from "./objects/Card";
import { DOOR_H } from "./objects/Doors";
import { EMBLEM_R } from "./objects/Stations";
import { FORM_OFFSETS, formStage } from "./objects/Formations";

/** The page's `[data-anchor="<kind>-<k>"]` elements, in k order. */
const pick = (kind: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-anchor^="${kind}-"]`)).sort(
    (a, b) => +a.dataset.anchor!.split("-")[1] - +b.dataset.anchor!.split("-")[1],
  );

/**
 * DOM labels that ride the 3D scene: stage titles on their nodes on the card, door titles in
 * their doorways, the finale formations' captions. After every object has moved (priority 0.5).
 */
export function useDomAnchors(rig: Rig) {
  const anchors = useRef<{ stage: HTMLElement[]; door: HTMLElement[]; form: HTMLElement[] }>({ stage: [], door: [], form: [] });
  const labelW = useRef<number[]>([]);
  const formLabel = useRef<number[]>([-1, -1]);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3() }), []);
  useEffect(() => {
    anchors.current = { stage: pick("stage"), door: pick("door"), form: pick("form") };
  }, []);

  useFrame(({ camera, size }) => {
    const card = rig.card;
    const { width: W, height: H } = size;
    const toScreen = (p: THREE.Vector3) => `translate3d(${((p.x + 1) / 2) * W}px, ${((1 - p.y) / 2) * H}px, 0)`;
    camera.updateMatrixWorld();

    if (card) {
      anchors.current.stage.forEach((el, k) => {
        const s = STAGES[k];
        if (!s) return;
        v.a.set(s.pos[0], s.pos[1], FACE_Z).applyMatrix4(card.matrixWorld).project(camera);
        // Clear the emblem: the gap to the node is its on-screen reach, so in the macro shot,
        // where an emblem is hundreds of pixels wide, the title still sits beside it, not on it.
        v.b.set(s.pos[0] + EMBLEM_R, s.pos[1], FACE_Z).applyMatrix4(card.matrixWorld).project(camera);
        const gap = Math.max(96, Math.hypot((v.b.x - v.a.x) * W, (v.b.y - v.a.y) * H) / 2 + 28);
        el.style.setProperty("--gap", `${gap.toFixed(0)}px`);
        // Keep the whole title on screen: it runs away from its node, toward the side it names,
        // and the rail owns the inline-end (left) edge.
        const label = el.firstElementChild as HTMLElement;
        if (!labelW.current[k]) {
          const cs = getComputedStyle(label);
          labelW.current[k] = label.offsetWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        }
        const w = labelW.current[k] + gap;
        const left = el.dataset.side === "left";
        const x = THREE.MathUtils.clamp(((v.a.x + 1) / 2) * W, left ? w + 56 : 16, W - (left ? 16 : w + 16));
        el.style.transform = `translate3d(${x}px, ${((1 - v.a.y) / 2) * H}px, 0)`;
      });
    }

    const doorsAlpha = values("Doors").alpha;
    anchors.current.door.forEach((el, k) => {
      const z = DOORS_Z[k];
      const dz = camera.position.z - z;
      // Over the doorway, inside the frame, so it stays on screen as the camera nears.
      el.style.transform = toScreen(v.a.set(0, DOOR_H * 0.3, z).project(camera));
      el.style.opacity = String(dz <= 0 ? 0 : smooth(10, 6.5, dz) * smooth(1.2, 3, dz) * doorsAlpha);
    });

    // Formation captions: the stage each particle station shows, under it (above it in portrait,
    // where the card sits below); hidden while it morphs.
    const form = values("Final").form;
    const { portrait, formCycle } = live;
    anchors.current.form.forEach((el, side) => {
      const off = portrait ? FORM_OFFSETS.portrait : FORM_OFFSETS.sides[side];
      const on = form * (portrait && side === 1 ? 0 : 1);
      if (on < 0.01 || !card) {
        el.style.opacity = "0";
        return;
      }
      const cyc = formCycle + (side === 1 ? 3 : 0);
      const f = cyc - Math.floor(cyc);
      const k = formStage(formCycle + (f > 0.85 ? 0.2 : 0), side as 0 | 1);
      if (formLabel.current[side] !== k) {
        formLabel.current[side] = k;
        (el.firstElementChild as HTMLElement).textContent = stages[k].title;
      }
      const vis = f < 0.85 ? 1 - smooth(0.62, 0.7, f) : smooth(0.92, 1, f);
      const c = card.position;
      el.style.transform = toScreen(v.a.set(c.x + off[0], c.y + off[1] + (portrait ? 0.34 : -0.52), c.z + off[2]).project(camera));
      el.style.opacity = String(on * (reduced ? 1 : vis));
    });
  }, 0.5);
}
