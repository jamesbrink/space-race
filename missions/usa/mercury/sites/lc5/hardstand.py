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
    GROUND,
    HARDSTAND,
    RAIL_PAIR_X,
    RAIL_TOP,
    TRACK_BACK,
    TRACK_END,
    TRENCH_END,
    TRENCH_TO,
    P,
    Parts,
    box,
    fine,
    obox,
)

SLAB = 20.0  # slab pitch, both ways (estimated from 6100884)
APRON = (HARDSTAND / 2, HARDSTAND / 2 + 60.0, 14.0)  # x from, x to, half width: Figure 7-6's stub, 28 ft wide
RAMP = 14.0  # the ramp off the apron's end, down to the road: 1.5 ft in 14 (estimated)
SCALE_PLATE = 6.5  # half the side of the square plate under the launcher (estimated: ring 10 ft, plate a third wider)


def rails_x() -> list[float]:
    return [s * RAIL_PAIR_X + d * GAUGE / 2 for s in (-1, 1) for d in (-1, 1)]


def field(parts: Parts, node: str, cy: float = 0.0, inset: float = 0.0) -> None:
    """A pad's square of slabs and the joints between them, its middle at (0, cy). The joints are
    one dark slab under the gaps; `inset` keeps its sides that far inside the slabs' outer faces
    (a pad seen from another pad away cannot have two faces 18 mm apart)."""
    slabs, joints = parts(node, "concrete"), parts(node, "joint")
    half = HARDSTAND / 2
    n = round(HARDSTAND / SLAB)
    for i in range(n):
        for j in range(n):
            x0, y0 = -half + i * SLAB, cy - half + j * SLAB
            box(slabs, (x0 + 0.06, y0 + 0.06, -FOOTING), (x0 + SLAB - 0.06, y0 + SLAB - 0.06, 0.0))
    box(joints, (-half + inset, cy - half + inset, -FOOTING - 0.1), (half - inset, cy + half - inset, -0.12))


def burns(parts: Parts, node: str, cy: float = 0.0, lift: float = 0.0) -> None:
    """What the launches before this one left: concrete burnt dark under the launcher, stained round it.
    Each patch is its own mesh a few millimetres proud of the slabs, so nothing is coplanar. `lift`
    raises them further: seen from a pad away, a few millimetres are not enough to keep them apart."""
    joints = parts(node, "joint")
    inner: list = []
    for mat, radius, top, phase in (("scorch", 13.5, 0.04, 2.1), ("stain", 23.0, 0.02, 0.4)):
        mb = parts(node, mat)
        rim = []
        for k in range(48):
            a = TAU * k / 48
            r = radius * (1 + 0.1 * math.sin(3 * a + phase) + 0.06 * math.sin(7 * a + 2 * phase) + 0.03 * math.sin(13 * a))
            rim.append((r * math.cos(a), cy + r * math.sin(a)))
        top += lift
        if lift and inner:  # a ring round the burn, not a disc under it: two discs 6 mm apart fight at a distance
            verts = [tuple(P(0.94 * x, cy + 0.94 * (y - cy), top)) for x, y in inner] + [tuple(P(x, y, top)) for x, y in rim]
            mb.add(verts, [(k, 48 + k, 48 + (k + 1) % 48, (k + 1) % 48) for k in range(48)])
        else:
            mb.add([tuple(P(0, cy, top))] + [tuple(P(x, y, top)) for x, y in rim], [(0, 1 + k, 1 + (k + 1) % 48) for k in range(48)])
        inner = rim
    for lo, hi in ((9.0, 19.9), (-19.9, -9.0)):  # the slab joints still show through the staining
        box(joints, (lo, cy - 0.06, -0.12), (hi, cy + 0.06, 0.05 + 2 * lift))
        box(joints, (-0.06, cy + lo, -0.12), (0.06, cy + hi, 0.05 + 2 * lift))


def scale_plate(parts: Parts, node: str, cy: float = 0.0) -> None:
    """The scale plate the launcher stands on: the vehicle was weighed before and after each loading."""
    plate = parts(node, "scorched")
    s = SCALE_PLATE
    box(plate, (-s, cy - s, -0.3), (s, cy + s, 0.15))
    if fine():
        for k in range(12):  # its hold-down bolts round the edge
            t = -s + 0.5 + k * (2 * s - 1.0) / 11
            for x, y in ((t, -s + 0.35), (t, s - 0.35), (-s + 0.35, t), (s - 0.35, t)):
                plate.disc(P(x, cy + y, 0.15), (0, 0, 1), 0.09 * 0.3048, 0.06 * 0.3048, 6)


def trench_run(end, to, cy: float = 0.0) -> tuple:
    """The cable trench's line from its end on a pad toward the blockhouse: its direction, and how
    far along it the pad's edge is."""
    dx, dy = to[0] - end[0], to[1] - end[1]
    length = math.hypot(dx, dy)
    ux, uy = dx / length, dy / length
    half = HARDSTAND / 2
    edge = min((half - end[0]) / ux if ux > 0 else 1e9, (half + end[1] - cy) / -uy if uy < 0 else 1e9, (half - end[1] + cy) / uy if uy > 0 else 1e9)
    return ux, uy, edge, length


def trench(parts: Parts, node: str, end, to, cy: float = 0.0, lift: float = 0.0) -> None:
    """The trench's steel covers across a pad, from the pit at its end to the pad's edge."""
    covers = parts(node, "deck")
    ex, ey = end
    ux, uy, edge, _ = trench_run(end, to, cy)
    k = 0
    while (k + 1) * 2.6 < edge - 1.5:
        c = (ex + ux * (k + 0.5) * 2.6, ey + uy * (k + 0.5) * 2.6, -0.1 + lift / 2)
        obox(covers, c, (ux, uy, 0), (0, 0, 1), (2.5, 3.0, 0.32 + lift))
        k += 1
    obox(covers, (ex - ux * 3.2, ey - uy * 3.2, -0.1 + lift / 2), (ux, uy, 0), (0, 0, 1), (9.0, 6.0, 0.34 + lift))  # the pit at its end


def build(parts: Parts) -> None:
    parts.node("Hardstand")
    slabs, joints = parts("Hardstand", "concrete"), parts("Hardstand", "joint")
    half = HARDSTAND / 2
    field(parts, "Hardstand")
    # the apron to the hatch side's road, slabs the same way
    x0a, x1a, wa = APRON
    for i in range(round((x1a - x0a) / SLAB)):
        for j in (-1, 0):
            xa, ya = x0a + i * SLAB, j * wa
            box(slabs, (xa + 0.06, ya + 0.06, -FOOTING), (xa + SLAB - 0.06, ya + wa - 0.06, 0.0))
    box(joints, (x0a + 0.01, -wa, -FOOTING - 0.1), (x1a, wa, -0.12))
    # and a ramp off its end, down to the shell road: the pad stands a foot and a half above the ground
    ramp = parts("Hardstand", "concrete/ramp")
    xr, zr = x1a + 0.02, GROUND - 0.3
    v = [P(xr, -wa, -0.02), P(xr + RAMP, -wa, zr), P(xr + RAMP, wa, zr), P(xr, wa, -0.02), P(xr, -wa, zr), P(xr, wa, zr)]
    ramp.add([tuple(q) for q in v], [(0, 1, 2, 3), (0, 4, 1), (3, 2, 5)])

    burns(parts, "Hardstand")

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

    scale_plate(parts, "Hardstand")
    # the cable trench from the blockhouse, under steel covers, to its end on the pad (Figure 7-6)
    trench(parts, "Hardstand", TRENCH_END, TRENCH_TO)

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
