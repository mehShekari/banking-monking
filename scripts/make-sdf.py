"""Signed distance field for the card's calligraphy (and, later, its circuit).

The macro Path shot magnifies the card ~1.8x past its 1764 px artwork, so raster masks blur.
A distance field sampled bilinearly reconstructs edges far sharper than its own resolution,
so the shader can draw crisp traces and letters at any zoom.

  python scripts/make-sdf.py

Reads  public/images/final app front.png   (1764x2868, the card artwork)
Writes public/images/name-sdf.png       (8-bit, artwork size)
       src/modules/film/scene/sdf.ts                      (the spread, so the shader decodes distance exactly)

Encoding: v = 0.5 - d / (2 * SPREAD), d in artwork pixels, positive outside the shape.
"""

import numpy as np
from PIL import Image, ImageFilter

SRC = "public/images/final app front.png"
SPREAD = 12.0  # artwork px either side of the edge
UP = 2  # masks are thresholded at 2x so curves are smooth before the distance step


def circuit_mask(a):
    """Engraved traces: thin dark ridges, found with a difference of Gaussians on luminance.

    A local-contrast mask (the old circuit-mask.png rule) breaks thin traces into dashes at
    full resolution; a DoG tuned to the trace width keeps them continuous, rings included.
    """
    rgb, alpha = a[..., :3], a[..., 3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    L = Image.fromarray(lum.clip(0, 255).astype(np.uint8))
    blur = lambda s: np.asarray(L.filter(ImageFilter.GaussianBlur(s))).astype(np.float32)
    dog = blur(4) - blur(1.0)  # positive on a thin dark line
    m = np.clip((dog - 5) / 4, 0, 1)
    bright = (lum > 120) | ((rgb[..., 2] - rgb[..., 0] > 90) & (lum > 90))
    near = np.asarray(Image.fromarray(bright.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(21))) > 0
    m[near] = 0  # the calligraphy, the pale panel and the logos are not traces
    solid = np.asarray(Image.fromarray((alpha > 250).astype(np.uint8) * 255).filter(ImageFilter.MinFilter(61)))
    m[solid == 0] = 0
    img = Image.fromarray(((m > 0.5) * 255).astype(np.uint8))
    # The engraving is drawn as twin edge lines (light rim + shadow rim). A closing merges each
    # pair into one solid groove; an opening then drops the brushed-metal specks.
    img = img.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    img = img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(0.8))) / 255.0


def name_mask(a):
    """The white calligraphy «پژوهشیار / دانشمند» (same rule as name-mask.png)."""
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    mx = a[..., :3].max(-1)
    sat = (mx - a[..., :3].min(-1)) / np.maximum(mx, 1)
    m = (lum > 165) & (sat < 0.25) & (b - r < 40) & (al >= 250)
    box = np.zeros_like(m)
    box[1180:1860, 420:1630] = True  # the calligraphy block, measured on the artwork
    return np.asarray(Image.fromarray((m & box).astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(1))) / 255.0


def edt2(inside, R):
    """Squared distance to the nearest `inside` pixel, exact within R px (separable, windowed)."""
    H, W = inside.shape
    big = np.float32(R * R * 4)
    g = np.where(inside, 0, big).astype(np.float32)
    col = g.copy()
    for dy in range(1, R + 1):  # vertical pass
        d2 = np.float32(dy * dy)
        col[:-dy] = np.minimum(col[:-dy], g[dy:] + d2)
        col[dy:] = np.minimum(col[dy:], g[:-dy] + d2)
    out = col.copy()
    for dx in range(1, R + 1):  # horizontal pass over the column minima
        d2 = np.float32(dx * dx)
        out[:, :-dx] = np.minimum(out[:, :-dx], col[:, dx:] + d2)
        out[:, dx:] = np.minimum(out[:, dx:], col[:, :-dx] + d2)
    return out


def sdf(soft, thresh, w, h):
    up = np.asarray(Image.fromarray((soft * 255).astype(np.uint8)).resize((w * UP, h * UP), Image.LANCZOS)) / 255.0
    inside = up >= thresh
    R = int(SPREAD * UP) + 2
    d_out = np.sqrt(edt2(inside, R))  # outside: distance to the shape
    d_in = np.sqrt(edt2(~inside, R))  # inside: distance to the background
    d = np.where(inside, -(d_in - 0.5), d_out - 0.5) / UP  # signed, artwork px, edge at 0
    # Average 2x2 back down to artwork size: a box filter on a distance is still a distance.
    d = d.reshape(h, UP, w, UP).mean(axis=(1, 3))
    v = np.clip(0.5 - d / (2 * SPREAD), 0, 1)
    return Image.fromarray(np.round(v * 255).astype(np.uint8), "L")


def main():
    a = np.asarray(Image.open(SRC).convert("RGBA")).astype(np.float32)
    h, w = a.shape[:2]
    # The circuit is NOT shipped as a distance field yet: the artwork's engraving is soft and
    # low-contrast, and raster extraction breaks traces into dashes (circuit_mask is kept for
    # when a vector source of the circuit arrives; render it to a mask and feed it to sdf()).
    sdf(name_mask(a), 0.5, w, h).save("public/images/name-sdf.png", optimize=True)
    with open("src/modules/film/scene/sdf.ts", "w", encoding="utf8") as f:
        f.write(
            "// Written by scripts/make-sdf.py. The distance fields' encoding:\n"
            "//   v = 0.5 - d / (2 * SDF_SPREAD), d in artwork px, positive outside the shape.\n"
            f"export const SDF_SPREAD = {SPREAD:g};\n"
            f"/** Artwork size the fields are stored at (px). */\nexport const SDF_SIZE = [{w}, {h}] as const;\n"
        )
    print("ok", w, h)


if __name__ == "__main__":
    main()
