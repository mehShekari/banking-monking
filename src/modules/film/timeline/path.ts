// "The Path": a lit trace climbing the card's real circuit, through seven stages.
// Points are measured on the circuit mask (882×1434 px), from the bottom cluster,
// round the name's inline-end side, up to the emblem at the top.

import { CARD_H } from "@/modules/film/constants/card";

const MASK_W = 882;
const MASK_H = 1434;

/** Polyline in mask pixels; `stage` marks a node. Orthogonal runs with 45° chamfers, like the engraving. */
const RAW: { p: [number, number]; stage?: number }[] = [
  { p: [527, 1228], stage: 0 },
  { p: [527, 1150] },
  { p: [497, 1120] },
  { p: [435, 1120], stage: 1 },
  { p: [435, 960] },
  { p: [405, 930] },
  { p: [250, 930] },
  { p: [250, 640] },
  { p: [283, 607] },
  { p: [283, 463], stage: 2 },
  { p: [283, 400] },
  { p: [313, 370] },
  { p: [407, 370] },
  { p: [437, 340] },
  { p: [437, 328], stage: 3 },
  { p: [437, 300] },
  { p: [467, 270] },
  { p: [657, 270], stage: 4 },
  { p: [657, 215] },
  { p: [687, 185], stage: 5 },
  { p: [770, 185], stage: 6 },
];

/** Card-local coordinates (card is 1 wide, centred). */
export const PATH = RAW.map(({ p }) => [p[0] / MASK_W - 0.5, (0.5 - p[1] / MASK_H) * CARD_H] as [number, number]);

const seg = PATH.slice(1).map((b, i) => Math.hypot(b[0] - PATH[i][0], b[1] - PATH[i][1]));
const total = seg.reduce((a, b) => a + b, 0);
/** Arc-length fraction at every point. */
export const PATH_S = PATH.map((_, i) => seg.slice(0, i).reduce((a, b) => a + b, 0) / total);

/** Each stage node: its card-local position and arc fraction. */
export const STAGES = RAW.flatMap((r, i) => (r.stage === undefined ? [] : [{ pos: PATH[i], s: PATH_S[i] }]));

/** The emergence hold: 2.6 s opened at 4.2 so the card is born from light over ~6 s. */
export const EMERGE_HOLD = 2.6;

/** Sequence timing (final film grid): the pulse rests on each node, then travels to the next. */
const PATH_START = 12 + EMERGE_HOLD;
const STAGE_GAP = 2.1;
export const stageTime = (k: number) => PATH_START + 0.6 + k * STAGE_GAP;

/** Point on the path at arc fraction s. */
export function pointAt(s: number, out: [number, number] = [0, 0]) {
  const t = Math.min(Math.max(s, 0), 1);
  let i = 1;
  while (i < PATH_S.length - 1 && PATH_S[i] < t) i++;
  const a = PATH[i - 1];
  const b = PATH[i];
  const k = (t - PATH_S[i - 1]) / (PATH_S[i] - PATH_S[i - 1] || 1);
  out[0] = a[0] + (b[0] - a[0]) * k;
  out[1] = a[1] + (b[1] - a[1]) * k;
  return out;
}
