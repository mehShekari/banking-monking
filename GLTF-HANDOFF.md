# glTF hand-off: models for the film

This is a hand-off only. **No code, `PRODUCT.md`, or other existing file was changed.** Everything listed below is a new file in `public/gltf/`. Wiring them into `app/film` is up to you. The snippets are suggestions; they have been tested in a standalone three r0.186.1 page (WebGPU renderer, the project's own `node_modules`) but **not inside the app**.

## Files to use (v2: optimized, two quality levels)

| File | Size | Tris | Draw calls | For |
| --- | --- | --- | --- | --- |
| `path_stations_hi.glb` | 1.1 MB | 23.3 k | 68 | desktop / good GPUs: per-part reveal clips, baked normal + AO |
| `path_stations_lo.glb` | 0.4 MB | 23.3 k | **21** | weak devices: one mesh per station, AO only, no clips |
| `card_layers_hi.glb` | 1.3 MB | 10.5 k | 14 | desktop: normal + ORM + clearcoat |
| `card_layers_lo.glb` | 0.46 MB | 10.5 k | 14 | weak devices: ≤1024 textures, no normal maps, no clearcoat |
| `basis/basis_transcoder.js` + `.wasm` | 571 KB | | | KTX2 decoder (copied from `three/examples/jsm/libs/basis`) |

- **Weak device downloads:** ~0.9 MB of models + 0.57 MB of decoder.
- **Strong device downloads:** ~2.4 MB of models + the same decoder.

**How they are optimized (all four):**
- Geometry is meshopt-compressed and quantized (`EXT_meshopt_compression`, `KHR_mesh_quantization`).
- Textures are KTX2 / Basis (`KHR_texture_basisu`), so they stay compressed on the GPU too. A PNG/WebP image is decoded to full RGBA in VRAM; KTX2 uses about 4–8× less VRAM. That matters more on weak GPUs than the download size does.
- Detail (bevel highlights, engraved grooves, coin reeding, chip pins) is baked from a ~320 k-tri high-poly model into normal/AO maps. The meshes themselves stay low-poly.

**Old files, now superseded.** You can delete them if nothing uses them:
- `path_stations.gltf` / `.bin` (v1 stations)
- `card_layers.gltf` / `.bin` + `textures/`
- `bank_card.gltf` / `.bin`

Sources (Blender 5.2, rebuildable headless): `C:\Users\shekari\Documents\bank_card\`
- `scripts/build_stations2.py`: stations, hi + lo, bake
- `scripts/merge_lo.py`: lo station merge
- `scripts/pack_card.py`: card packing
- `tools/gltfpack.exe`: meshoptimizer v1.3

---

## 1. Loader setup (required: KTX2 + meshopt)

The `.glb` files need both decoders. `GLTFLoader` alone will throw on them.

```ts
import * as THREE from "three/webgpu";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

let ktx2: KTX2Loader | null = null;
/** call once with the (already initialised) WebGPURenderer */
export function makeGLTFLoader(renderer: THREE.WebGPURenderer) {
  ktx2 ??= new KTX2Loader().setTranscoderPath("/gltf/basis/").detectSupport(renderer);
  return new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
}
```

With R3F's `useLoader`, pass the extension callback:

```ts
const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
const gltf = useLoader(GLTFLoader, url, (loader) => {
  ktx2 ??= new KTX2Loader().setTranscoderPath("/gltf/basis/").detectSupport(gl);
  loader.setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
});
```

`detectSupport` must run after `await renderer.init()`. That is already the case inside the Canvas, because `Card.tsx` and `Emergence.tsx` get `gl` the same way.

## 2. Choosing hi / lo

This is a suggestion. Use whatever quality signal the app already has, if there is one.

```ts
export function isLowEnd(renderer?: THREE.WebGPURenderer) {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  const cores = n.hardwareConcurrency ?? 8;
  const mem = n.deviceMemory ?? 8;                       // Chrome/Android only
  const coarse = matchMedia("(pointer: coarse)").matches; // phones / tablets
  const webgl = renderer && !(renderer.backend as any).isWebGPUBackend; // WebGL2 fallback
  return mem <= 4 || cores <= 4 || (coarse && devicePixelRatio > 2.5) || !!webgl;
}
const tier = isLowEnd(gl) ? "lo" : "hi";
const url = `/gltf/path_stations_${tier}.glb`;   // same for card_layers_${tier}.glb
```

Both variants of a model have **the same node names, the same root transforms, and the same materials** (`Metal`, `Chrome`, `Glow` for the stations). Code that only touches roots and materials works with either.

---

## 3. Stations («از دانش، تا اثر»)

The same order and count as `STAGES` in `path.ts`.

| Root node | Stage | Emblem (v2) |
| --- | --- | --- |
| `Stage0_Talent` | استعداد | faceted crystal seed, glowing girdle ring, 3 shards |
| `Stage1_Research` | پژوهش | nucleus, 3 grooved orbit rings with electrons |
| `Stage2_Technology` | فناوری | chip package: chamfered lid, engraved traces, pins on 4 sides, glowing die |
| `Stage3_Capital` | سرمایه | 3 rising stacks of reeded discs + a thick stepped growth bar with a glowing inlay and arrowhead. No currency sign and no numbers. |
| `Stage4_Market` | بازار | hub, 6 nodes, hexagon link |
| `Stage5_Business` | کسب‌وکار | stepped tower: chamfered tiers, lit window strips, beacon |
| `Stage6_Impact` | اثر | drop + 3 ripples |

**Shared structure**
- Each emblem is about 0.9 units wide, centred on its root and facing +Z. Units match the card: card width = 1.
- In the file, the roots sit in a preview row (x = −4.5 … 4.5). **Set `position` yourself when you place them.**
- Materials:
  - `Metal`: navy, clearcoat on hi only.
  - `Chrome`: satin.
  - `Glow`: emissive linear `(0.30, 0.58, 0.95)` ≈ sRGB `#95c9fa`, strength 1, toned down for the film's bloom. Raise `emissiveIntensity` on the shared `Glow` material if it reads too dim in the app.

### hi: per-part reveal
- Seven clips, `Reveal_0` … `Reveal_6`, each exactly **1.0 s**. Use `action.time = progress` (0..1).
- Only the children are keyed; the root is never keyed.
- **Rest pose = the start of the reveal** (parts hidden or scaled to ~0). Set `time = 1` to get the finished emblem.

### lo: whole-station reveal
- No clips. Each station is one mesh (3 primitives, one per material) in its finished pose.
- Reveal it by scaling or fading the root.

```tsx
// app/film/Stations.tsx (suggestion)
const SCALE = 0.085, LIFT = 0.07, REVEAL = 0.8;
const ease = (p: number) => 1 - Math.pow(1 - p, 3);

export function Stations({ tier }: { tier: "hi" | "lo" }) {
  const gl = useThree((s) => s.gl) as unknown as THREE.WebGPURenderer;
  const gltf = useLoader(GLTFLoader, `/gltf/path_stations_${tier}.glb`, (l) => {
    ktx2 ??= new KTX2Loader().setTranscoderPath("/gltf/basis/").detectSupport(gl);
    l.setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  });
  const { roots, actions, mixer } = useMemo(() => {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const roots = gltf.scene.children.filter((o) => /^Stage\d_/.test(o.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    roots.forEach((o, k) => { const [x, y] = STAGES[k].pos; o.position.set(x, y, FACE_Z + LIFT); });
    const actions = [...gltf.animations].sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => { const a = mixer.clipAction(c); a.play(); a.paused = true; return a; });
    return { roots, actions, mixer };
  }, [gltf]);

  useFrame(() => {
    roots.forEach((o, k) => {
      const p = THREE.MathUtils.clamp((clock.t - stageTime(k)) / REVEAL, 0, 1);
      o.visible = p > 0;
      if (actions.length) { o.scale.setScalar(SCALE); actions[k].time = p * 0.9999; }   // hi
      else o.scale.setScalar(SCALE * ease(p));                                          // lo
    });
    if (actions.length) mixer.update(0);   // apply poses; scrubbing backwards works too
  });
  return <primitive object={gltf.scene} />;
}
```

## 4. Layered card

- **Nodes:** `CardFront`, `CardCore`, `CardBack`, `Trace0..5`.
- **Clip:** `Film`, 32 s. Same in hi and lo.
- **Materials:** the same values as `Card.tsx`.
- **Textures:** baked; glTF UV convention, `flipY = false`.

| Old film time (s) | Motion |
| --- | --- |
| 0 – 2.9 | assembly: plates fly in, core scales up, traces drop into the grooves |
| 12.7 – 15.2 | traces lift band by band |
| 16.3 – 20.4 | anatomy: layers open, hold, close |
| 25.6 – 29.4 | network: traces lift slightly, then return |

> **The timeline changed after this clip was made.** `storyboard.ts` now has `INTRO_END = 4.2`, `EMERGE_HOLD = 2.6`, and `LENGTH = 44.8`, so `mixer.setTime(clock.t)` no longer lines up. Either remap time piecewise (`[filmTime, clipTime]` pairs → `action.time = clipTime(clock.t); mixer.update(0)`), or tell me the new beat times and I'll re-key the clip so `setTime(clock.t)` works directly.

Other notes:
- Parent the card into the existing card group to keep `rig.faces` / `rig.edge`.
- `alphaTest` is not needed; the corners are real geometry.
- If the TSL circuit-glow shader goes on the glTF front, set `flipY = false` on `circuit-mask`. This is not tested.

---

## Checks done (standalone, not in the app)

- **WebGPU load:** all four `.glb` files load and render with `WebGPURenderer` (WebGPU backend) + `KTX2Loader` + `MeshoptDecoder` from the project's three r0.186.1. No errors.
  - `card_layers_hi`: 1 clip, 9 texture slots.
  - `card_layers_lo`: 1 clip, 7 texture slots.
  - `path_stations_hi`: 7 clips.
  - `path_stations_lo`: 0 clips.
- **hi vs lo stations:** rendered side by side. Every station keeps all its parts, with the same silhouette and bounds. lo loses only the normal-map highlights.
- **Texture budget:** chosen by close-up comparison.
  - Card: ETC1S at 2048 looked the same as UASTC at 2048, at half the size.
  - Stations: normals at 1024 vs 2048 differ only slightly in groove sharpness, and they are small on screen.
- **Not measured:** real frame time on a weak phone, and how the models look under the app's own bloom and env. Check both once wired in.

## Things to watch

- **Draw calls:** hi stations = 68. If all seven are visible at once on a mid-range GPU, prefer lo (21).
- **Bloom:** if emblems flare, lower `emissiveIntensity` on the shared `Glow` material (one line).
- **Env light:** the navy `Metal` relies on the scene env (`scene.environment`). Under very dark env the emblems read mostly by their glow parts.
- **Content rules (`PRODUCT.md`):** no logos, numbers, or currency symbols, and nothing that implies credit or BNPL is available today.
- **Untouched:** `PRODUCT.md`, `app/`, and the other agent's work in progress (`git status` shows `Card.tsx`, `Scene.tsx`, `storyboard.ts`, `tsl.ts` modified by them) were not edited.
