# glTF hand-off: the path stations

The film uses **one** model: `public/gltf/path_stations_lo.glb`, the seven path-station emblems. This file records how it is built, how the app loads it, and what was removed.

For changing the emblems' look in Blender, see `BLENDER-HANDOFF.md`.

## What ships

| File | Size | Tris | Draw calls | Contents |
| --- | --- | --- | --- | --- |
| `path_stations_lo.glb` | 0.4 MB | 23.3 k | 21 | one mesh per station (3 primitives, one per material), finished pose, AO only, no clips |
| `basis/basis_transcoder.js` + `.wasm` | 571 KB | | | KTX2 decoder (copied from `three/examples/jsm/libs/basis`) |

**How it is optimized:**
- Geometry is meshopt-compressed and quantized (`EXT_meshopt_compression`, `KHR_mesh_quantization`).
- Textures are KTX2 / Basis (`KHR_texture_basisu`), so they stay compressed on the GPU too.

**Sources** (Blender 5.2, rebuildable headless): `C:\Users\shekari\Documents\bank_card\`
- `scripts/build_stations2.py`: stations, hi + lo, bake
- `scripts/merge_lo.py`: lo station merge
- `scripts/pack_card.py`: card packing
- `tools/gltfpack.exe`: meshoptimizer v1.3

## Removed

These were built but are not in the repo any more. Rebuild them from the sources above if they are ever needed.

- **`path_stations_hi.glb`** (68 draw calls, per-part `Reveal_k` clips, normal maps, clearcoat). Measured in the app, its shader warm-up took about **75 s** on a cold load against about 1.5 s for `lo`. At the size the emblems appear on screen, only the normal-map glints differ.
- **`card_layers_hi.glb` / `card_layers_lo.glb`** (the layered card with a 32 s `Film` clip). They were never wired in: the card is built procedurally in `Card.tsx`, and the clip was keyed to an older timeline.
- **The v1 files** (`path_stations.gltf`, `card_layers.gltf`, `bank_card.gltf` with their `.bin` and `textures/`).

## How the app uses it

- **Loader:** `src/modules/film/scene/objects/Stations.tsx`, `useStationsGLTF()`. It is a `GLTFLoader` with `KTX2Loader` (transcoder at `/gltf/basis/`) and `MeshoptDecoder`. `GLTFLoader` alone throws on this file. `detectSupport` runs inside the Canvas, after `renderer.init()`.
- **The path** (`Stations.tsx`): each station sits at its node on the card, 0.07 off the face, scaled to 0.085 card widths. It grows from its root as the pulse arrives (0.8 s, scrubbed both ways). Only the current station glows.
- **The finale** (`Formations.tsx`): the same file, sampled by surface area into particles that morph from station to station. It is one download, shared through `useLoader`'s cache.

## The stations

The same order and count as `STAGES` in `src/modules/film/timeline/path.ts`.

| Root node | Stage | Emblem |
| --- | --- | --- |
| `Stage0_Talent` | استعداد | faceted crystal seed, glowing girdle ring, 3 shards |
| `Stage1_Research` | پژوهش | nucleus, 3 grooved orbit rings with electrons |
| `Stage2_Technology` | فناوری | chip package: chamfered lid, engraved traces, pins on 4 sides, glowing die |
| `Stage3_Capital` | سرمایه | 3 rising stacks of reeded discs + a stepped growth bar with a glowing inlay and arrowhead. No currency sign and no numbers. |
| `Stage4_Market` | بازار | hub, 6 nodes, hexagon link |
| `Stage5_Business` | کسب‌وکار | stepped tower: chamfered tiers, lit window strips, beacon |
| `Stage6_Impact` | اثر | drop + 3 ripples |

**Shared structure:**
- Each emblem is about 0.9 units wide, centred on its root and facing +Z.
- In the file, the roots sit in a preview row (x = −4.5 … 4.5). The app sets each root's position itself.
- Each mesh carries its dequantization transform on the mesh node, so sample in world space (as `Formations.tsx` does).

**Materials** (`Metal`, `Chrome`, `Glow`): the app finds parts by these names. `Metal` and `Chrome` are replaced in code by light satin materials with a rim light (see `BLENDER-HANDOFF.md`). `Glow` keeps its emissive `#95c9fa`, and each station gets its own copy so it can dim once passed.

## Things to watch

- **Shader warm-up is the real cost, not the download.** Before adding material features (clearcoat, sheen, transmission) or splitting meshes, measure the `film-ready` mark in DevTools on a cold load.
- **Content rules (`PRODUCT.md`):** no logos, numbers, or currency symbols, and nothing that implies credit or BNPL is available today.
