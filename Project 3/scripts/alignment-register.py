"""Estimate the image shift between a nadir splat screenshot and the reference.

Usage (from Project 3/):
    uv run --with numpy --with pillow python scripts/alignment-register.py results/alignment/<name>

Reads <name>-splat.png and <name>-reference.png (same nadir camera, written by
alignment-check.mjs shots). Pixels where the two images differ are the splat's
footprint. Inside that footprint's bounding box, the normalised cross-correlation
(NCC) of the two gradient-magnitude images is maximised over integer shifts: the
best (dx, dy) in pixels maps the reference onto the splat (a feature at reference
pixel p appears at p + (dx, dy) in the splat image). Gradients are used instead of colours because the
splat and the aerial imagery were captured at different times and with different
cameras: edges agree better than colours do. Elevated objects are displaced
differently in the two images (relief displacement), so this is an estimate of
the dominant ground offset, not a per-feature measurement.

Prints the shift, its NCC and the NCC at zero shift. A best NCC barely above the
zero-shift NCC means the images do not pin down a clear offset.
"""

import sys

import numpy as np
from PIL import Image

DIFF_THRESHOLD = 30  # grey levels: smaller differences count as "same image"
MARGIN = 20  # pixels ignored at the border of the footprint box
MAX_SHIFT = 80  # pixels searched in each direction
# The panel and the credit line are drawn on top of both screenshots.
UI_BOXES = [(0, 0, 330, 100), (0, 860, 1600, 900)]


def load_grey(path):
    return np.asarray(Image.open(path).convert("L"), dtype=np.float64)


def gradient_magnitude(image):
    gy, gx = np.gradient(image)
    return np.hypot(gx, gy)


def footprint_box(splat, reference):
    differs = np.abs(splat - reference) > DIFF_THRESHOLD
    for x0, y0, x1, y1 in UI_BOXES:
        differs[y0:y1, x0:x1] = False
    ys, xs = np.nonzero(differs)
    if len(xs) == 0:
        raise SystemExit("The images are identical: no splat footprint found.")
    # Robust bounds: ignore isolated differing pixels (floaters, noise).
    x0, x1 = np.percentile(xs, [2, 98]).astype(int)
    y0, y1 = np.percentile(ys, [2, 98]).astype(int)
    return x0 + MARGIN, y0 + MARGIN, x1 - MARGIN, y1 - MARGIN


def ncc(a, b, dx, dy):
    """Normalised cross-correlation of b(x, y) with a(x - dx, y - dy) on their overlap."""
    h, w = a.shape
    a_part = a[max(0, -dy) : h - max(0, dy), max(0, -dx) : w - max(0, dx)]
    b_part = b[max(0, dy) : h - max(0, -dy), max(0, dx) : w - max(0, -dx)]
    a_part = a_part - a_part.mean()
    b_part = b_part - b_part.mean()
    return float((a_part * b_part).sum() / np.sqrt((a_part**2).sum() * (b_part**2).sum()))


def best_shift(a, b, max_shift):
    """Integer shift (dx, dy) within +-max_shift that maximises the NCC of b with a."""
    best = (0, 0, ncc(a, b, 0, 0))
    for dy in range(-max_shift, max_shift + 1):
        for dx in range(-max_shift, max_shift + 1):
            score = ncc(a, b, dx, dy)
            if score > best[2]:
                best = (dx, dy, score)
    return best


def main():
    base = sys.argv[1]
    splat = load_grey(f"{base}-splat.png")
    reference = load_grey(f"{base}-reference.png")
    x0, y0, x1, y1 = footprint_box(splat, reference)
    a = gradient_magnitude(reference[y0:y1, x0:x1])
    b = gradient_magnitude(splat[y0:y1, x0:x1])
    # Coarse search on 4x downsampled images, then a +-4 px search at full resolution.
    coarse_dx, coarse_dy, _ = best_shift(a[::4, ::4], b[::4, ::4], MAX_SHIFT // 4)
    dx, dy, score = coarse_dx * 4, coarse_dy * 4, None
    fine = [(ddx, ddy) for ddy in range(-4, 5) for ddx in range(-4, 5)]
    dx, dy, score = max(
        ((dx + ddx, dy + ddy, ncc(a, b, dx + ddx, dy + ddy)) for ddx, ddy in fine),
        key=lambda item: item[2],
    )
    print(f"box {x0},{y0}-{x1},{y1}")
    print(f"dx {dx} dy {dy} ncc {score:.3f} (ncc at zero shift {ncc(a, b, 0, 0):.3f})")


if __name__ == "__main__":
    main()
