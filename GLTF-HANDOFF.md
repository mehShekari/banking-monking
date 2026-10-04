# glTF hand-off: models for the film

This is a hand-off only. **No code, `PRODUCT.md`, or other existing file was changed.** Everything listed below is a new file in `public/gltf/`. Wiring them into `app/film` is up to you; the snippets below are suggestions and have not been run inside the app.

| File | Size | What |
| --- | --- | --- |
| `public/gltf/path_stations.gltf` + `.bin` | 142 KB + 668 KB | Seven abstract emblems, one per path stage («از دانش، تا اثر») |
| `public/gltf/card_layers.gltf` + `.bin` + `textures/*.webp` | ~1.5 MB total | Layered card (front / core / back / raised traces) with a `Film` clip |

Sources (Blender 5.2, rebuildable headless): `C:\Users\shekari\Documents\bank_card\`
`scripts/build_stations.py` → `path_stations.blend`, `scripts/build_layers.py` + `scripts/prep_layers.py` → `card_layers.blend`.
Preview sheet: `stations_preview.png`.

---

## 1. `path_stations.gltf`: the seven stages

Based on `docs/` (the talent → research → … → impact chain) and on `copy.ts` / `path.ts`: same order and same count as `STAGES`.

| Root node | Stage | Emblem | Clip |
| --- | --- | --- | --- |
| `Stage0_Talent` | استعداد | crystal seed, glowing core, ring, 3 shards | `Reveal_0` |
| `Stage1_Research` | پژوهش | nucleus with 3 orbits + electrons | `Reveal_1` |
| `Stage2_Technology` | فناوری | chip die, glowing heart, pins on 4 sides | `Reveal_2` |
| `Stage3_Capital` | سرمایه | 3 rising disc stacks + rising line (abstract, no currency sign or number) | `Reveal_3` |
| `Stage4_Market` | بازار | hub → 6 nodes, hexagon link | `Reveal_4` |
| `Stage5_Business` | کسب‌وکار | stepped tower, lit windows, beacon | `Reveal_5` |
| `Stage6_Impact` | اثر | drop + 3 ripples | `Reveal_6` |

**Structure**

- Seven root nodes in scene order. Each emblem is about 0.9 units wide, centred on its root, facing +Z (the camera). Units match the card: card width = 1.
- In the file, the roots sit in a preview row (x = −4.5 … 4.5, step 1.5). **Reset `position` when you place them.**
- **Clips:** each `Reveal_k` is exactly **1.0 s** long, so `action.time = progress` (0..1). It only animates the children; the root is never keyed, so you can position, rotate, and scale the root freely. Rest pose = fully assembled, so if you never play a clip you get the finished emblem.
- **Materials (shared by all 7):**
  - `Metal`: navy `#081040`, metal 1, roughness 0.34, clearcoat 0.4 (same family as the card body)
  - `Chrome`: light satin metal
  - `Glow`: emissive `#73c7ff` (= PathTrace `BLUE`), `KHR_materials_emissive_strength` 4

  Reduce `emissiveIntensity` if the bloom is too strong (see notes).
- **No textures:** geometry + 3 materials only, so very cheap.

**Suggested wiring** (a new component, e.g. `app/film/Stations.tsx`, rendered inside the card group in `Scene.tsx` next to `<PathTrace/>`):

```tsx
import { useLoader, useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three/webgpu";
import { useMemo } from "react";
import { clock } from "./clock";
import { STAGES, stageTime } from "./path";
import { FACE_Z } from "./Card";

const SCALE = 0.085;   // emblem ≈ 0.08 card widths
const LIFT = 0.07;     // how far it floats off the face
const REVEAL = 0.8;    // s, from the moment the pulse reaches the node

export function Stations() {
  const gltf = useLoader(GLTFLoader, "/gltf/path_stations.gltf");
  const { roots, actions, mixer } = useMemo(() => {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const roots = gltf.scene.children.filter(o => /^Stage\d_/.test(o.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    roots.forEach((o, k) => {
      const [x, y] = STAGES[k].pos;
      o.position.set(x, y, FACE_Z + LIFT);
      o.scale.setScalar(SCALE);
    });
    const actions = gltf.animations
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => { const a = mixer.clipAction(c); a.play(); a.paused = true; return a; });
    return { roots, actions, mixer };
  }, [gltf]);

  useFrame(() => {
    roots.forEach((o, k) => {
      const p = THREE.MathUtils.clamp((clock.t - stageTime(k)) / REVEAL, 0, 1);
      o.visible = p > 0;
      actions[k].time = p * 0.9999;           // clips are 1 s long
    });
    mixer.update(0);                           // apply the poses; scrubs backwards too
  });

  return <primitive object={gltf.scene} />;
}
```

Placement is a creative choice. The suggestion above floats each emblem just above its node on the card, so it pops up when the pulse arrives (`stageTime(k)`). Alternatives:

- Place the emblems at the DOM stage titles (`data-anchor="stage-k"`).
- Use them large, one per beat, along the camera route.

Either way, the only thing the model needs is `time = progress`.

---

## 2. `card_layers.gltf`: the layered card (from the previous round)

**Nodes:** `CardFront`, `CardCore`, `CardBack`, `Trace0..5` (6 circuit bands, right → left).

**Clip:** one clip, `Film`, length 32 s. The 32 s length is the old `LENGTH` — **read the important note below.**

| Old film time (s) | Motion |
| --- | --- |
| 0 – 2.9 | assembly: plates fly in from ±0.85, core scales up, traces drop into grooves |
| 12.7 – 15.2 | traces lift from the grooves band by band |
| 16.3 – 20.4 | anatomy: layers open, hold, close |
| 25.6 – 29.4 | network: traces lift slightly with the points and return |

- **Textures** (`textures/*.webp`, glTF convention, so `flipY = false`): front/back `color`, `orm` (AO + roughness + metal), `normal`, plus `core_emissive`.
- **Materials:** values copied from `Card.tsx`.

> **Important: the timeline changed after this clip was made.**
> `storyboard.ts` now has `INTRO_END = 4.2`, `EMERGE_HOLD = 2.6`, and `LENGTH = 44.8`, so `mixer.setTime(clock.t)` **will no longer line up**. Remap time instead of driving the clip with `clock.t` directly:
>
> ```ts
> // [filmTime, clipTime] pairs. Fill the film side from the current storyboard.
> const MAP: [number, number][] = [
>   [0, 0], [4.0, 2.9],          // assembly inside the autoplay intro
>   [/* traces up start */ 0, 12.7], [/* end */ 0, 15.2],
>   [/* anatomy open */ 0, 16.3], [/* close */ 0, 20.4],
>   [/* network */ 0, 25.6], [/* end */ 0, 29.4],
> ];
> const clipTime = (t: number) => { /* piecewise-linear lerp over MAP */ };
> action.time = clipTime(clock.t); mixer.update(0);
> ```
>
> Or tell me the new beat times and I'll re-key the clip in Blender so `setTime(clock.t)` works directly.

**Integration notes** (unchanged from `Documents/bank_card/INTEGRATION.md`):

- Keep `rig.faces` / `rig.edge` by parenting the glTF into the existing card group.
- `alphaTest` is not needed; the rounded corners are real geometry.
- If the TSL circuit-glow shader is applied to the glTF front, set `circuit-mask` `flipY = false` (glTF UV convention). Not tested in the app.

---

## Checks done

- Both files load with three r0.186.1 (the project's own `node_modules`) in a standalone viewer, with no errors.
  - `path_stations`: 7 roots, 7 clips of 1.0 s each.
  - `card_layers`: `Film` clip, 32 s.
- The emblems were rendered at progress 0.5 and 1.0.
  - All seven read as intended.
  - `Capital` and `Business` are the darkest; they rely on env light, because `Metal` is navy.
- Not tested inside `localhost:3001`, since no app code was touched.

## Things to watch

- **Bloom:** `Glow` emissive strength 4 is tuned for a bloom threshold around 0.85–0.9. If the film's bloom pass makes the small emblems flare, set `material.emissiveIntensity` around 1.5–2 on the `Glow` material after loading. This needs a single change, because the material is shared.
- **Draw calls:** `path_stations` has 90 small meshes. If performance on mobile matters, merge per material per station (`BufferGeometryUtils.mergeGeometries`). That keeps 3 draws per station, but you lose per-part reveal animation.
- **Content rules:** consistent with `PRODUCT.md`: no logos, numbers, or currency symbols, and nothing that implies credit or BNPL is available today.
- **Untouched:** `PRODUCT.md`, `app/`, and the other agent's untracked files (`app/film/sdf.ts`, `public/images/*-sdf.png`, `scripts/`) were not modified.
