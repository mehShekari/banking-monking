// The whole film as data: one Theatre sequence, in seconds.
// 0 → INTRO_END autoplays on load; INTRO_END → LENGTH is scrubbed by scroll.
// Edit here, or open the page with ?studio in dev, retime in Theatre Studio,
// export the JSON and pass it to getProject() in Scene.tsx instead of buildState().
//
// Acts: Chosen (0–4.2) · Emerge (4.2–11.8) · The Path (11.8–29.8, with the achievement hold) ·
// The Doors (29.8–37.8) · Impact (37.8–42.2). `tracks` is authored on the original 40 s grid;
// `insertHold` then opens 2.2 s at 27.6 for the achievement beat, and the v2 props are keyed on
// the final grid.

import { EMERGE_HOLD, STAGES, stageTime } from "./path";

export const INTRO_END = 4.2;
/** Where the achievement beat is inserted, and how long it holds. */
const HOLD_AT = 27.6;
const HOLD = 2.2;
/** Authoring grid length before the emergence hold (the v3 film). */
const LENGTH_V3 = 40 + HOLD;
export const LENGTH = LENGTH_V3 + EMERGE_HOLD;
/** stageTime on the authoring grid (before the emergence hold). */
const stageAt = (k: number) => stageTime(k) - EMERGE_HOLD;
/** Where the doors stand, and where the card waits beyond them. */
export const DOORS_Z = [-2.2, -5, -7.8, -10.6];
const END_Z = -17.2;

type Key = [time: number, value: number];
type Tracks = Record<string, Record<string, Key[]>>;

const PI = Math.PI;

// The pulse rests 0.5 s on every stage node, then travels to the next.
const pathKeys: Key[] = [[0, 0]];
STAGES.forEach((st, k) => pathKeys.push([stageAt(k), st.s], [stageAt(k) + 0.5, st.s]));

const base: Tracks = {
  Camera: {
    x: [[0, 0], [4.2, 0.4], [8.2, 0], [27.6, 0], [31, 0.25], [33.4, -0.2], [35.6, 0], [40, 0]],
    y: [[0, 0], [8.2, 0], [26.6, 0], [27.6, 0.05], [35.6, -0.72], [40, -0.72]],
    z: [[0, 6], [4.2, 5.7], [8.2, 4.6], [11.8, 4.3], [27.6, 4.4], [29.2, 4.6], [35.6, END_Z + 6.2], [40, END_Z + 6.3]],
    tx: [[0, 0], [40, 0]],
    ty: [[0, 0], [27.6, 0], [35.6, -0.7], [40, -0.7]],
    tz: [[0, 0], [29.2, 0], [35.6, END_Z], [40, END_Z]],
    fov: [[0, 30], [11.8, 30], [12.8, 24], [26.6, 24], [27.6, 32], [29.2, 34], [32, 42], [35.6, 31], [40, 31]],
    roll: [[0, 0], [29.2, 0], [31.4, 0.06], [33.4, -0.05], [35.6, 0], [40, 0]],
    frame: [[0, 0], [3.2, 0], [3.8, 0.7], [5.6, 0.7], [6.6, 0], [8.4, 0], [9, 1], [11.2, 1], [11.8, 0], [26.4, 0], [27, 0.8], [28.4, 0.8], [29.2, 0], [40, 0]],
    follow: [[0, 0], [11.8, 0], [12.7, 1], [26.4, 1], [27.6, 0], [40, 0]],
  },
  Card: {
    x: [[0, 0], [40, 0]],
    y: [[0, 0], [40, 0]],
    z: [[0, -0.4], [4.2, -0.6], [8.2, 0], [28.6, 0], [31.6, END_Z], [40, END_Z]],
    rx: [[0, 0.06], [4.2, 0.1], [8.2, 0], [27.6, 0], [35.6, 0], [37.4, 0.05], [40, 0.05]],
    ry: [[0, PI / 2], [4.2, PI / 2 - 0.05], [6.4, 0.5], [8.2, 0], [11, -0.1], [11.8, 0], [27.6, 0], [28.6, PI / 2], [35.4, PI / 2], [37.4, -0.12], [40, -0.14]],
    rz: [[0, 0], [6.4, -0.06], [8.2, 0], [40, 0]],
  },
  Light: {
    key: [[0, 0], [4.2, 0], [8.2, 1.4], [27.6, 1.4], [29.2, 0.6], [35.6, 0.6], [37.4, 1.4], [40, 1.4]],
    area: [[0, 0], [4.2, 0], [8.2, 6], [12.8, 4], [26.6, 4], [27.6, 6], [29.2, 2], [35.6, 2], [37.4, 4.5], [40, 4.5]],
    rim: [[0, 0], [4.2, 1.2], [8.2, 2], [27.6, 2], [29.2, 3], [35.6, 3], [37.4, 2.2], [40, 2.2]],
    edge: [[0, 0], [2.9, 0], [3.5, 3.4], [4.2, 3], [5.4, 0.6], [6.6, 0.1], [27.6, 0.1], [28.6, 3.4], [34.8, 3.4], [36.2, 0.15], [37.6, 0.25], [40, 0.25]],
    beam: [[0, 0], [2, 0], [4.2, 0.3], [8.2, 0.7], [12.8, 0.1], [26.6, 0.1], [27.6, 0.5], [29.2, 0.2], [35.6, 0.2], [37.4, 0.8], [40, 0.8]],
    env: [[0, 0], [4.2, 0.08], [8.2, 0.9], [40, 0.9]],
    // After the last pass the band stays parked off the face (1.0): no resting streak in the finale.
    sweep: [[0, 0], [8.6, 0], [11, 1], [40, 1]],
    sweepAngle: [[0, 0.35], [40, 0.35]],
  },
  Path: {
    progress: [...pathKeys, [40, 1]],
    alpha: [[0, 0], [11.8, 0], [12.5, 1], [27.6, 1], [28.4, 0], [36, 0], [37.6, 0.7], [40, 0.7]],
  },
  Circuit: {
    glow: [[0, 0], [11.8, 0], [12.8, 0.08], [stageAt(6), 0.28], [26.4, 1], [27.6, 1], [28.6, 0.15], [36, 0.15], [37.6, 0.4], [40, 0.4]],
  },
  Intro: {
    talent: [[0, 0], [0.3, 0], [1.5, 1], [2.2, 1], [3.3, 0.22], [4.2, 0.15], [8.2, 0.05], [37.2, 0.05], [38.6, 0.3], [40, 0.3]],
    chosen: [[0, 0], [1.6, 0], [2.1, 0.3], [3.0, 0.8], [3.6, 1], [40, 1]],
  },
  Doors: {
    alpha: [[0, 0], [27.6, 0], [28.8, 1], [40, 1]],
  },
  Final: {
    interact: [[0, 0], [37.2, 0], [38, 1], [40, 1]],
    // The particle stations stream out of the card and assemble beside it.
    form: [[0, 0], [37.8, 0], [39.0, 1], [40, 1]],
  },
  Atmos: {
    dust: [[0, 0], [0.4, 0], [2.6, 0.6], [8.2, 1], [29.2, 1], [35.6, 0.7], [40, 0.4]],
    haze: [[0, 0], [1.6, 0.3], [8.2, 0.9], [27.6, 0.9], [32, 1.3], [37.4, 1], [40, 1]],
    bloom: [[0, 0.6], [3.5, 0.85], [8.2, 0.5], [12.8, 0.55], [26.6, 0.7], [29.2, 0.5], [35.6, 0.5], [37.4, 0.5], [40, 0.5]],
    exposure: [[0, 1], [40, 1]],
    // Act transitions: short chromatic/displacement pulses where one act hands over to the next.
    shift: [[0, 0], [3.35, 0], [3.55, 0.55], [3.85, 0], [11.7, 0], [12.0, 0.6], [12.4, 0], [28.0, 0], [28.35, 1], [28.8, 0], [35.5, 0], [35.8, 0.7], [36.2, 0], [40, 0]],
    // Depth of field (aperture scale): shallow on the macro path, off while the doors fly by.
    dof: [[0, 0.4], [4.2, 0.4], [8.2, 0.5], [12.8, 0.55], [26.6, 0.55], [27.6, 0.4], [28.6, 0], [35.6, 0], [37.4, 0.2], [40, 0.2]],
  },
};

/** Shift every key from `at` on by `dur`; a key exactly at `at` is held through the gap. */
function insertHold(src: Tracks, at: number, dur: number): Tracks {
  const out: Tracks = {};
  for (const [obj, props] of Object.entries(src)) {
    out[obj] = {};
    for (const [p, keys] of Object.entries(props)) {
      out[obj][p] = keys.flatMap(([t, v]): Key[] => (t < at ? [[t, v]] : t === at ? [[t, v], [t + dur, v]] : [[t + dur, v]]));
    }
  }
  return out;
}

const v3: Tracks = insertHold(base, HOLD_AT, HOLD);

// v2/v3 props, keyed on the 42.2 s authoring grid.
Object.assign(v3.Intro, {
  // The partners' braid: 0→1 descends onto the chosen talent, 1→2 cinches and dissolves.
  streams: [[0, 0], [0.9, 0], [3.0, 1], [3.6, 2], [LENGTH_V3, 2]],
  // The talent field moves to the card for the finale (while it is at its dimmest).
  fieldZ: [[0, 0], [37.8, 0], [37.85, END_Z - 1.5], [LENGTH_V3, END_Z - 1.5]],
});
Object.assign(v3.Card, {
  // The face is assembled from light while the card turns out of the blade.
  form: [[0, 0], [4.0, 0], [7.4, 1], [LENGTH_V3, 1]],
  // The calligraphy is written by light (0→1), then glows by nameGlow.
  ignite: [[0, 0], [6.9, 0], [8.8, 1], [LENGTH_V3, 1]],
  nameGlow: [[0, 0], [6.9, 0], [7.8, 1], [9.6, 0.22], [11.5, 0.22], [12.0, 1.3], [12.9, 0.22], [25.4, 0.22], [26.1, 0.9], [27.0, 0.22], [39.4, 0.22], [40.6, 0.3], [LENGTH_V3, 0.3]],
});
Object.assign(v3.Path, {
  // Achievement recap: a wave runs the whole path, then the nodes lift into a constellation.
  recap: [[0, -0.2], [25.9, -0.2], [26.9, 1.2], [LENGTH_V3, 1.2]],
  lift: [[0, 0], [26.8, 0], [27.9, 1], [29.0, 1], [29.8, 0], [LENGTH_V3, 0]],
});

// The Path's camera: while Camera.follow is on, the camera orbits the path head in card space —
// fDist from the face, fYaw/fPitch around it (pitch < 0 sits below, looking up the trace),
// fLead looks ahead along the arc, fRoll tilts. One distinct shot per stage (authoring grid).
{
  const [t0, t1, t2, t3, t4, t5, t6] = STAGES.map((_, k) => stageAt(k));
  Object.assign(v3.Camera, {
    // 0 low road · 1 overhead map · 2 raking light · 3 pull back · 4 dutch track · 5 orbit · 6 rise
    fDist: [[0, 1.45], [11.8, 1.45], [t0 - 0.4, 0.55], [t0 + 1.2, 0.5], [t1, 0.95], [t1 + 1.4, 0.9], [t2, 0.75], [t2 + 1.4, 0.7], [t3, 1.4], [t3 + 1.4, 1.35], [t4, 0.8], [t4 + 1.4, 0.85], [t5, 0.9], [t5 + 1.4, 0.95], [t6, 1.2], [26.4, 1.45], [LENGTH_V3, 1.45]],
    fPitch: [[0, -0.16], [11.8, -0.16], [t0 - 0.4, -0.55], [t0 + 1.2, -0.5], [t1, -0.02], [t1 + 1.4, 0], [t2, -0.16], [t2 + 1.4, -0.12], [t3, -0.12], [t3 + 1.4, -0.1], [t4, -0.2], [t4 + 1.4, -0.22], [t5, -0.25], [t5 + 1.4, -0.15], [t6, -0.05], [26.4, -0.16], [LENGTH_V3, -0.16]],
    fYaw: [[0, 0.07], [11.8, 0.07], [t0 - 0.4, 0.1], [t1, 0], [t2, 0.5], [t2 + 1.4, 0.42], [t3, 0.15], [t4, -0.25], [t4 + 1.4, -0.1], [t5, -0.6], [t5 + 1.6, 0.2], [t6, 0], [26.4, 0.07], [LENGTH_V3, 0.07]],
    fLead: [[0, 0], [11.8, 0], [t0, 0.02], [t3, 0], [t4, 0.04], [t4 + 1.4, 0.03], [t5, 0.01], [t6, 0], [LENGTH_V3, 0]],
    fRoll: [[0, 0], [t4 - 0.3, 0], [t4, 0.08], [t4 + 1.6, 0.06], [t5, 0], [LENGTH_V3, 0]],
    // Lens: macro 20 on the low road, 30 for the breath at «سرمایه».
    fov: [
      ...v3.Camera.fov.filter(([t]) => t < 12 || t > 26.5),
      [12.8, 22], [t0 + 1.2, 20], [t1, 24], [t2, 21], [t3, 30], [t3 + 1.4, 29], [t4, 24], [t5, 23], [t6, 26], [26.4, 24],
    ].sort((x, y) => x[0] - y[0]),
  });
}

// The emergence: open 2.6 s at 4.2 (the card holds edge-on as a blade while light pours out of
// it), then the face assembles over ~6 s (Card.form 4.0 → 10.0 on the final grid).
const tracks: Tracks = insertHold(v3, 4.2, EMERGE_HOLD);
// A slow dolly toward the blade through the pour.
tracks.Camera.z = tracks.Camera.z.map(([t, v]): Key => (t === 4.2 + EMERGE_HOLD ? [t, 5.25] : [t, v]));
// Light pours: a stronger edge and beam while the blade is held.
tracks.Light.edge = tracks.Light.edge.map(([t, v]): Key => (t === 4.2 + EMERGE_HOLD ? [t, 2.2] : [t, v]));

/** Initial value per prop: the first keyframe. */
export const defaults = Object.fromEntries(
  Object.entries(tracks).map(([obj, props]) => [
    obj,
    Object.fromEntries(Object.entries(props).map(([p, keys]) => [p, keys[0][1]])),
  ]),
) as Record<string, Record<string, number>>;

// Theatre 0.7 project state ("definitionVersion" 0.4.0). Every key eases in-out.
export function buildState(sheetId: string) {
  const tracksByObject: Record<string, unknown> = {};
  for (const [obj, props] of Object.entries(tracks)) {
    const trackData: Record<string, unknown> = {};
    const trackIdByPropPath: Record<string, string> = {};
    for (const [prop, keys] of Object.entries(props)) {
      const id = `${obj}-${prop}`;
      trackIdByPropPath[JSON.stringify([prop])] = id;
      trackData[id] = {
        type: "BasicKeyframedTrack",
        __debugName: `${obj}:${prop}`,
        keyframes: keys.map(([position, value], i) => ({
          id: `${id}-${i}`,
          position,
          value,
          connectedRight: true,
          handles: [0.5, 1, 0.5, 0],
          type: "bezier",
        })),
      };
    }
    tracksByObject[obj] = { trackData, trackIdByPropPath };
  }
  return {
    sheetsById: {
      [sheetId]: {
        staticOverrides: { byObject: {} },
        sequence: { subUnitsPerUnit: 30, length: LENGTH, type: "PositionalSequence", tracksByObject },
      },
    },
    definitionVersion: "0.4.0",
    revisionHistory: [],
  };
}
