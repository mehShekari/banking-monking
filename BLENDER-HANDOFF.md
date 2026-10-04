# Blender hand-off: station emblems, v3

This is what to change in `path_stations` so the file carries the look the site now builds in code. Everything here is optional: the site already looks right with the current `path_stations_lo.glb`. Doing it in Blender moves the look into the model and gives better highlights than code can.

## What the site does now (commit `ce21698`)

The emblems read too close to the card (navy on navy). The site now separates them like this:

| | Card | Emblems |
| --- | --- | --- |
| Value | near-black navy | light: satin porcelain body, polished silver |
| Light | quiet key + env | a small light rides the path's head and lights **only** the emblems |
| Edge | none | cool Fresnel rim (code) |
| Depth | flat | a soft contact shadow on the card under each emblem (code) |
| Colour | navy, blue circuit | blue only on the `Glow` parts |

The materials are replaced in code (`app/film/Stations.tsx`, `LOOK`):

| Material | Base colour | Metallic | Roughness |
| --- | --- | --- | --- |
| `Metal` | `#c3cad6` | 0.25 | 0.50 |
| `Chrome` | `#f1f4f8` | 1.00 | 0.22 |
| `Glow` | unchanged (emissive `#95c9fa`) | | |

## 1. Put those values into the file

Set `Metal` and `Chrome` to the table above. Keep the three material names exactly (`Metal`, `Chrome`, `Glow`); the code finds parts by name.

`Metal` is now mostly non-metallic on purpose. A metal mirrors the scene, which is dark navy, so it sank into the card whatever its colour.

## 2. Bevel the silhouette edges (the biggest visual win)

The lo meshes have hard edges, so the rim light and the head light have almost nothing to catch.

- **Bevel** the outer edges only, not every edge. Width about 1.5–2 % of the emblem (0.015–0.02 units on the 0.9-unit emblem), 2 segments.
- Then use **Weighted Normal** (modifier, "Keep Sharp") so the flat faces stay flat and only the bevels catch light.
- Bake AO again after bevelling. On a light material AO shows much more than it did on navy, so check it doesn't turn grey and dirty. Lower its strength if it does.

## 3. Rules that keep loading fast

The `hi` file is **no longer used**: its 68 meshes with clearcoat and normal maps took about **75 s** of shader compile before the film could start. `lo` takes about 1.5 s. So:

- **One mesh per station**, split only by material (≤ 3 primitives each, ≤ 21 draw calls total), as `lo` is now.
- **No clearcoat, no sheen, no transmission.** Each extra material feature is a heavier shader to compile.
- A normal map is fine if you want the engraved detail back. Bake it onto the lo mesh and keep it ≤ 1024.
- Keep around ≤ 25 k triangles and ≤ 0.5 MB for the file.
- Same export pipeline as v2: meshopt + KTX2 (`gltfpack`), the same node names (`Stage0_Talent` … `Stage6_Impact`), each emblem about 0.9 units wide, centred on its root and facing +Z.

Per-part reveal clips are not needed. The site grows each station from its root.

## 4. Testing it

1. Replace `public/gltf/path_stations_lo.glb`.
2. Run `pnpm build` then `pnpm start`, and open `http://localhost:3000/`.
3. Load time: in DevTools → Performance, the `film-ready` mark shows when the film can start. It should stay under about 5 s on a cold load.
4. Look at the Path close-ups (stage «بازار» is a good test): the emblem should read as a separate silver object, the card should stay dark.

When the file carries these values, tell me and I'll remove the material override in `Stations.tsx`, so the model is the single source of truth.
