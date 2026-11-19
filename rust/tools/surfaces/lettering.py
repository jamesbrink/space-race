"""Transfer the existing curved glyphs to pigment. The small name uses separately drawn brush strokes."""

import bpy
import numpy as np

from .noise import ease

# Paths run left to right, baseline at zero. Slightly uneven widths and baselines are estimated
# from the recovery photographs. This is a drawing of the name, not a traced historical alphabet.
STROKES = {
    "F": [[(0.1, 0), (0.13, 0.99), (0.9, 1)], [(0.13, 0.52), (0.75, 0.54)]],
    "R": [[(0.10, 0), (0.12, 0.98), (0.64, 0.99), (0.87, 0.84), (0.85, 0.64), (0.64, 0.51), (0.14, 0.49)], [(0.48, 0.51), (0.95, 0.01)]],
    "E": [[(0.93, 0.98), (0.11, 1), (0.09, 0.02), (0.92, 0.03)], [(0.14, 0.51), (0.75, 0.51)]],
    "D": [[(0.09, 0.02), (0.11, 0.99), (0.53, 1), (0.82, 0.84), (0.94, 0.56), (0.88, 0.29), (0.67, 0.08), (0.09, 0.02)]],
    "O": [
        [
            (0.10, 0.70),
            (0.21, 0.91),
            (0.48, 1),
            (0.76, 0.9),
            (0.91, 0.65),
            (0.88, 0.31),
            (0.72, 0.09),
            (0.44, 0.01),
            (0.18, 0.13),
            (0.08, 0.40),
            (0.10, 0.70),
        ]
    ],
    "M": [[(0.06, 0.03), (0.09, 0.99), (0.51, 0.43), (0.92, 1), (0.95, 0)]],
    "7": [[(0.06, 0.97), (0.94, 1), (0.60, 0.56), (0.31, 0.01)]],
}


def cylinder(points, limits):
    u = np.arctan2(points[:, 1], points[:, 0]) / (2 * np.pi) % 1
    return np.column_stack((u, (points[:, 2] - limits[0]) / (limits[1] - limits[0])))


def letters(name, tile, limits, hand=False):
    """Rasterize the projected type at its authored position. Bake ink into the metal's PBR maps."""
    mesh = bpy.data.objects[name].data
    verts = np.array([v.co[:] for v in mesh.vertices])
    uv = cylinder(verts, limits)
    pixels = uv * [tile.w, -tile.h] + [0, tile.h]
    mask = np.zeros((tile.h, tile.w), dtype=np.float32)
    mesh.calc_loop_triangles()
    for tri in mesh.loop_triangles:
        ids = list(tri.vertices)
        if hand and verts[ids[0], 2] < 0.60:
            continue
        a, b, c = pixels[ids]
        x0, y0 = np.maximum(0, np.floor(np.minimum(np.minimum(a, b), c))).astype(int)
        x1, y1 = np.minimum([tile.w, tile.h], np.ceil(np.maximum(np.maximum(a, b), c))).astype(int)
        if x1 <= x0 or y1 <= y0:
            continue
        y, x = np.ogrid[y0:y1, x0:x1]
        edges = [(q[0] - p[0]) * (y + 0.5 - p[1]) - (q[1] - p[1]) * (x + 0.5 - p[0]) for p, q in ((a, b), (b, c), (c, a))]
        inside = (np.minimum.reduce(edges) >= 0) | (np.maximum.reduce(edges) <= 0)
        np.maximum(mask[y0:y1, x0:x1], inside, out=mask[y0:y1, x0:x1])
    if hand:
        # Extents come from the photographs' two lines already laid out on the mesh.
        for word, region in (("FREEDOM", (verts[:, 2] > 0.38) & (verts[:, 2] < 0.55)), ("7", verts[:, 2] < 0.38)):
            pts = pixels[region]
            brush(mask, word, pts.min(axis=0), pts.max(axis=0))
    return mask


def brush(mask, word, lo, hi):
    cell, height = (hi[0] - lo[0]) / len(word), hi[1] - lo[1]
    for i, letter in enumerate(word):
        for path in STROKES[letter]:
            pts = [(lo[0] + (i + x * 0.91) * cell, hi[1] - (y * 0.91 + 0.025 * np.sin(i * 1.4)) * height) for x, y in path]
            for (ax, ay), (bx, by) in zip(pts, pts[1:]):
                radius = max(1, height * 0.065)
                x0, x1 = int(min(ax, bx) - radius - 1), int(max(ax, bx) + radius + 2)
                y0, y1 = int(min(ay, by) - radius - 1), int(max(ay, by) + radius + 2)
                y, x = np.ogrid[y0:y1, x0:x1]
                dx, dy = bx - ax, by - ay
                t = np.clip(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
                coverage = ease(radius + 0.5 - np.hypot(x - ax - dx * t, y - ay - dy * t))
                np.maximum(mask[y0:y1, x0:x1], coverage, out=mask[y0:y1, x0:x1])
