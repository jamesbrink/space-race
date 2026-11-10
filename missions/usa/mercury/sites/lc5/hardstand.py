"""The hardstand: a 200 ft square of concrete slabs with four rails let into it, the painted circle,
the steel scale plate the launcher stands on, the cable trench's covers, the apron on the hatch
side, and the track running off it each way on ballast.

Sources: OpenStreetMap's outline of the pad (sides 195 to 202 ft, along 25/115 deg true); NASA TM
X-53107 Figure 7-6 (circle, apron, trench, the structure's launch position); colour photograph
6100884 (four rails, slab joints, the painted arc). The scale plate is the museum's caption at pad 6.
"""

from __future__ import annotations

import math

from srlib import TAU

from .site import (
    CIRCLE_R,
    FOOTING,
    GAUGE,
    HARDSTAND,
    RAIL_PAIR_X,
    RAIL_TOP,
    TRACK_BACK,
    TRACK_END,
    P,
    Parts,
    box,
    fine,
    obox,
)

SLAB = 20.0  # slab pitch, both ways (estimated from 6100884)
APRON = (HARDSTAND / 2, HARDSTAND / 2 + 60.0, 14.0)  # x from, x to, half width: Figure 7-6's stub, 28 ft wide
SCALE_PLATE = 6.5  # half the side of the square plate under the launcher (estimated: ring 10 ft, plate a third wider)
TRENCH_END = (51.0, -8.5)  # where the cable trench from the blockhouse meets the pad: Figure 7-6
BLOCKHOUSE = (211.0, -280.0)  # the blockhouse's middle, from OpenStreetMap: 351 ft at 348 deg true


def rails_x() -> list[float]:
    return [s * RAIL_PAIR_X + d * GAUGE / 2 for s in (-1, 1) for d in (-1, 1)]


def build(parts: Parts) -> None:
    parts.node("Hardstand")
    slabs, joints = parts("Hardstand", "concrete"), parts("Hardstand", "joint")
    half = HARDSTAND / 2
    n = round(HARDSTAND / SLAB)
    for i in range(n):
        for j in range(n):
            x0, y0 = -half + i * SLAB, -half + j * SLAB
            box(slabs, (x0 + 0.06, y0 + 0.06, -FOOTING), (x0 + SLAB - 0.06, y0 + SLAB - 0.06, 0.0))
    box(joints, (-half, -half, -FOOTING - 0.1), (half, half, -0.12))
    # the apron to the hatch side's road, slabs the same way
    x0a, x1a, wa = APRON
    for i in range(round((x1a - x0a) / SLAB)):
        for j in (-1, 0):
            xa, ya = x0a + i * SLAB, j * wa
            box(slabs, (xa + 0.06, ya + 0.06, -FOOTING), (xa + SLAB - 0.06, ya + wa - 0.06, 0.0))
    box(joints, (x0a + 0.01, -wa, -FOOTING - 0.1), (x1a, wa, -0.12))

    # what the launches before this one left: concrete burnt dark under the launcher, stained round it.
    # Each patch is its own mesh a few millimetres proud of the slabs, so nothing is coplanar.
    for mat, radius, top, phase in (("stain", 23.0, 0.02, 0.4), ("scorch", 13.5, 0.04, 2.1)):
        mb = parts("Hardstand", mat)
        rim = []
        for k in range(48):
            a = TAU * k / 48
            r = radius * (1 + 0.1 * math.sin(3 * a + phase) + 0.06 * math.sin(7 * a + 2 * phase) + 0.03 * math.sin(13 * a))
            rim.append((r * math.cos(a), r * math.sin(a)))
        mb.add([tuple(P(0, 0, top))] + [tuple(P(x, y, top)) for x, y in rim], [(0, 1 + k, 1 + (k + 1) % 48) for k in range(48)])
    for lo, hi in ((9.0, 19.9), (-19.9, -9.0)):  # the slab joints still show through the staining
        box(joints, (lo, -0.06, -0.12), (hi, 0.06, 0.05))
        box(joints, (-0.06, lo, -0.12), (0.06, hi, 0.05))

    # the painted circle, 121 ft across, a line 6 in wide
    paint = parts("Hardstand", "paint")
    segs = 160 if fine() else 96
    for k in range(segs):
        a0, a1 = TAU * k / segs, TAU * (k + 1) / segs
        ring = [
            P((CIRCLE_R - 0.25) * math.cos(a0), (CIRCLE_R - 0.25) * math.sin(a0), 0.012),
            P((CIRCLE_R + 0.25) * math.cos(a0), (CIRCLE_R + 0.25) * math.sin(a0), 0.012),
            P((CIRCLE_R + 0.25) * math.cos(a1), (CIRCLE_R + 0.25) * math.sin(a1), 0.012),
            P((CIRCLE_R - 0.25) * math.cos(a1), (CIRCLE_R - 0.25) * math.sin(a1), 0.012),
        ]
        paint.add([tuple(v) for v in ring], [(0, 1, 2, 3)])

    # the scale plate the launcher stands on: the vehicle was weighed before and after each loading
    plate = parts("Hardstand", "scorched")
    s = SCALE_PLATE
    box(plate, (-s, -s, -0.3), (s, s, 0.15))
    if fine():
        for k in range(12):  # its hold-down bolts round the edge
            t = -s + 0.5 + k * (2 * s - 1.0) / 11
            for x, y in ((t, -s + 0.35), (t, s - 0.35), (-s + 0.35, t), (s - 0.35, t)):
                plate.disc(P(x, y, 0.15), (0, 0, 1), 0.09 * 0.3048, 0.06 * 0.3048, 6)

    # the cable trench from the blockhouse, under steel covers, to its end on the pad (Figure 7-6)
    covers = parts("Hardstand", "deck")
    ex, ey = TRENCH_END
    dx, dy = BLOCKHOUSE[0] - ex, BLOCKHOUSE[1] - ey
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    run = min((half - ex) / ux, (half + ey) / -uy) - 1.5
    k = 0
    while (k + 1) * 2.6 < run:
        c = (ex + ux * (k + 0.5) * 2.6, ey + uy * (k + 0.5) * 2.6, -0.1)
        obox(covers, c, (ux, uy, 0), (0, 0, 1), (2.5, 3.0, 0.32))
        k += 1
    obox(covers, (ex - ux * 3.2, ey - uy * 3.2, -0.1), (ux, uy, 0), (0, 0, 1), (9.0, 6.0, 0.34))  # the pit at its end

    # four rails let into the slabs, through the pad and on along the track
    rails, ties, gravel = parts("Hardstand", "rail"), parts("Hardstand", "tie"), parts("Hardstand", "ballast")
    for x in rails_x():
        box(rails, (x - 0.12, TRACK_BACK, -0.45), (x + 0.12, TRACK_END, RAIL_TOP))
    for y0, y1 in ((half + 0.05, TRACK_END + 3.0), (TRACK_BACK - 3.0, -half - 0.05)):
        box(gravel, (-RAIL_PAIR_X - 6.0, y0, -FOOTING), (RAIL_PAIR_X + 6.0, y1, -0.75))
        y = y0 + 1.2
        while y < y1 - 1.0:  # sleepers under each pair, 2 ft apart
            for sx in (-1, 1):
                box(ties, (sx * RAIL_PAIR_X - 4.25, y - 0.38, -0.95), (sx * RAIL_PAIR_X + 4.25, y + 0.38, -0.46))
            y += 2.0
    if fine():  # rail joints: fishplates every 39 ft
        y = TRACK_BACK + 20.0
        while y < TRACK_END:
            for x in rails_x():
                for side in (-1, 1):
                    box(rails, (x + side * 0.12, y - 1.0, -0.4), (x + side * 0.2, y + 1.0, -0.05))
            y += 39.0
