import { getProject, types, type ISheetObject } from "@theatre/core";
import { clock } from "@/modules/film/timeline/clock";
import exported from "@/modules/film/timeline/film-state.json";
import { INTRO_END, LENGTH, buildState, defaults } from "@/modules/film/timeline/storyboard";

// The film's one Theatre sheet. Every animated value in the scene is a prop on one of its
// objects (Camera, Card, Light, Atmos, Path, Final, …), read once per frame through `values`.

const SHEET = "Film";

/** Theatre Studio, dev only: `?studio` in the URL. */
export const studioMode =
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

const objects = Object.fromEntries(
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

/** The current values of one sheet object, e.g. `values("Camera").fov`. */
export const values = (name: string) => objects[name].value as Record<string, number>;

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

/** Move the sheet to the film clock (two-way with Studio). Once per frame, before any read. */
export function syncSheet() {
  if (studioMode) syncStudio();
  else sheet.sequence.position = clock.t;
}
