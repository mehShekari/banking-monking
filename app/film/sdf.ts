// Written by scripts/make-sdf.py. The distance fields' encoding:
//   v = 0.5 - d / (2 * SDF_SPREAD), d in artwork px, positive outside the shape.
export const SDF_SPREAD = 12;
/** Artwork size the fields are stored at (px). */
export const SDF_SIZE = [1764, 2868] as const;
