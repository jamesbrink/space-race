"""The ground between the pads and the blockhouse: the track on to pad 6 and its turnout, the
concrete road beside it, the covered cable trenches with a walk alongside, the cable racks and the
scaffold stair north of pad 5, and the pole line along the road behind the blockhouse.

Nearly all of it is read off four photographs of July 1961, eleven weeks after MR-3 (FHSU Project
Mercury collection: F16_017, looking down the track at pad 5 from pad 6's gantry; F16_016, the
blockhouse from the same place; F16_015, pad 5 from the blockhouse roof; F19_008, the turnout, the
racks and the stair from the ground). So every size and place here is estimated; what is
documented is only that these things were there in July. The road's line, and the trenches', agree
with what OpenStreetMap maps today.

Paving stands at the pad's level, a foot and a half above the viewer's ground, as the pad does; in
life the road, the walks and the trench covers were flush with the grass.
"""

from __future__ import annotations

import math

from mathutils import Vector

import srlib
from srlib import FT

from . import hardstand
from .blockhouse import S
from .pad6 import TRENCH6_END, TRENCH6_TO
from .site import (
    FOOTING,
    GAUGE,
    GROUND,
    HARDSTAND,
    PAD6,
    RAIL_PAIR_X,
    RAIL_TOP,
    TRACK_BACK,
    TRENCH_END,
    TRENCH_TO,
    P,
    Parts,
    beam,
    box,
    fine,
    obox,
    slab,
    solid,
    stair_rails,
    stairs,
    stood,
    timber_pole,
)

ROAD_X = (-50.0, -30.0)  # the concrete road from pad 5 to pad 6, east of the rails: about 20 ft wide (F16_017; OSM way 577612542)
TRACK_NORTH = PAD6[1] - 180.0  # how far the track is modelled beyond pad 6, toward Complex 26
STRIPS = (PAD6[1] + HARDSTAND / 2, PAD6[1] + HARDSTAND / 2 + 75.0)  # concrete laid between and beside the rails, nearest pad 6
FAR_RAIL = RAIL_TOP + 0.12  # these rails are seen from far off: they stand an inch and a half proud of what is laid round them, not 9 mm
SPUR_Y, SPUR_R, SPUR_ARC = -185.0, 250.0, 62.0  # the turnout: where it leaves, its radius, how many degrees are modelled


def track(parts: Parts) -> None:
    g = "Track"
    parts.node(g)
    rails, ties, gravel, conc = parts(g, "rail"), parts(g, "tie"), parts(g, "ballast"), parts(g, "concrete")
    half = HARDSTAND / 2
    p6a, p6b = PAD6[1] + half, PAD6[1] - half
    for x in hardstand.rails_x():
        box(rails, (x - 0.12, TRACK_NORTH, -0.45), (x + 0.12, TRACK_BACK, FAR_RAIL))
    for y0, y1 in ((p6a + 0.05, TRACK_BACK - 3.0), (TRACK_NORTH - 3.0, p6b - 0.05)):
        box(gravel, (-RAIL_PAIR_X - 6.0, y0, -FOOTING), (RAIL_PAIR_X + 6.0, y1, -0.75))
        y = y0 + 1.2
        while y < y1 - 1.0:
            if not STRIPS[0] <= y <= STRIPS[1]:
                for sx in (-1, 1):
                    box(ties, (sx * RAIL_PAIR_X - 4.25, y - 0.38, -0.95), (sx * RAIL_PAIR_X + 4.25, y + 0.38, -0.46))
            y += 2.0
    for sx in (-1, 1):  # the concrete laid in the track by pad 6, the rails standing just proud of it
        box(conc, (sx * RAIL_PAIR_X - 5.6, STRIPS[0] + 0.02, -FOOTING), (sx * RAIL_PAIR_X + 5.6, STRIPS[1], -0.02))
    box(ties, (-RAIL_PAIR_X - 4.5, TRACK_NORTH - 1.2, -0.95), (RAIL_PAIR_X + 4.5, TRACK_NORTH - 0.2, 2.2))  # the stop at the end of what is modelled

    # the turnout: both pairs curve away east, north of pad 5 (F16_017, F19_008). No frogs or blades.
    main = hardstand.rails_x()
    step = math.radians(0.75 if fine() else 1.5)
    n = round(math.radians(SPUR_ARC) / step)
    bed = parts(g, "ballast/spur")
    for xp in (-RAIL_PAIR_X, RAIL_PAIR_X):
        cx = xp - SPUR_R

        def at(theta: float, off: float, cx=cx):
            return cx + (SPUR_R + off) * math.cos(theta), SPUR_Y - (SPUR_R + off) * math.sin(theta)

        for d in (-1, 1):
            off = d * GAUGE / 2
            run: list = []
            for k in range(n + 1):
                t = k * step
                x, _ = at(t, off)
                x2, _ = at(t + step, off)
                # the rail starts where it has left its own main rail, and breaks where it crosses another at a fine angle
                clear = at(0.0, off)[0] - x > 0.3 and not (
                    t < math.radians(16) and any(min(x, x2) - 0.3 < m < max(x, x2) + 0.3 for m in main if abs(m - at(0.0, off)[0]) > 0.5)
                )
                if clear:
                    run.append([(*at(t, off + a), z) for a, z in ((-0.12, -0.5), (0.12, -0.5), (0.12, FAR_RAIL - 0.02), (-0.12, FAR_RAIL - 0.02))])
                elif len(run) > 1:
                    solid(rails, run)
                    run = []
                else:
                    run = []
            if len(run) > 1:
                solid(rails, run)
        first = math.radians(6.0)
        loops = [
            [(*at(first + k * step, a), z) for a, z in ((-6.5, -FOOTING), (6.5, -FOOTING), (6.5, -0.95), (-6.5, -0.95))]
            for k in range(round((math.radians(SPUR_ARC + 1.0) - first) / step) + 1)
        ]
        solid(bed, loops)
        t = math.radians(15.5)
        while t < math.radians(SPUR_ARC):
            x, y = at(t, 0.0)
            obox(ties, (x, y, -0.725), (math.cos(t), -math.sin(t), 0), (0, 0, 1), (8.5, 0.76, 0.49))
            t += 2.0 / SPUR_R
        x, y = at(math.radians(SPUR_ARC), 0.0)
        obox(ties, (x, y, 0.4), (math.cos(t), -math.sin(t), 0), (0, 0, 1), (9.0, 1.0, 2.6))


def road(parts: Parts) -> None:
    g = "Road"
    parts.node(g)
    conc, joints, paint = parts(g, "concrete"), parts(g, "joint"), parts(g, "black/lettering")
    half = HARDSTAND / 2
    y0, y1 = PAD6[1] + half, -half
    x0, x1 = ROAD_X
    slab(joints, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], GROUND - 0.6, -0.14, spread=2.4)
    y = y0
    while y < y1 - 1.0:
        box(conc, (x0 + 0.06, y + 0.06, -FOOTING), (x1 - 0.06, min(y + 20.0, y1) - 0.06, -0.02))
        y += 20.0
    # NO SMOKING, painted across it for whoever drives toward pad 5 (F16_017)
    font = srlib.load_font()
    verts, faces = srlib.text_mesh("NO SMOKING", 3.4, font, cuts=0)
    xs = [v[0] for v in verts]
    mid = (max(xs) + min(xs)) / 2
    cx, cy = (x0 + x1) / 2, -258.0
    paint.add([tuple(P(cx + vx - mid, cy + vy, -0.02 + 0.05)) for vx, vy, _ in verts], faces)


def causeway(parts: Parts, node: str, end, to, cy: float) -> None:
    """A cable trench from a pad's edge to the blockhouse: steel covers on a concrete trench, and
    a concrete walk beside it."""
    conc, covers = parts(node, "concrete/trench"), parts(node, "deck")
    ux, uy, edge, length = hardstand.trench_run(end, to, cy)
    side = (-uy, ux) if cy == 0.0 else (uy, -ux)  # the walk on the trench's outer side, away from the other trench
    a = Vector((end[0] + ux * (edge - 3.0), end[1] + uy * (edge - 3.0)))
    b = Vector((to[0] + ux * 1.0, to[1] + uy * 1.0))
    c = (a + b) / 2 + Vector(side) * 2.2
    obox(
        conc, (c.x, c.y, (-FOOTING - 0.1) / 2), (ux, uy, 0), (0, 0, 1), ((b - a).length, 8.6, FOOTING - 0.1)
    )  # its top an inch under the pad's and the walk's, which it runs in under
    k = math.ceil((edge + 0.3) / 2.6)
    while (k + 1) * 2.6 < length - 0.2:
        obox(covers, (end[0] + ux * (k + 0.5) * 2.6, end[1] + uy * (k + 0.5) * 2.6, -0.08), (ux, uy, 0), (0, 0, 1), (2.5, 3.0, 0.36))
        k += 1


def racks(parts: Parts) -> None:
    """Two open steel racks hung with cables and hoses, and a scaffold stair tower, on the grass
    north of pad 5 and east of the road (F16_017, F19_008)."""
    g = "Yard"
    parts.node(g)
    steel, cable = parts(g, "chassis"), parts(g, "cable", True)
    for x0, y0 in ((-92.0, -128.0), (-104.0, -168.0)):
        length, height, foot = 25.0, 15.0, 8.0
        for x in (x0, x0 + length):  # an end frame: a post, a raking strut either side, a foot
            beam(steel, (x, y0, GROUND - 0.4), (x, y0, height), 0.4)
            beam(steel, (x, y0 - foot / 2, GROUND + 0.3), (x, y0 + foot / 2, GROUND + 0.3), 0.4)
            for s in (-1, 1):
                beam(steel, (x, y0 + s * foot / 2, GROUND + 0.3), (x, y0, height * 0.72), 0.28)
            for k in range(4):  # the arms
                z = height - k * 3.0
                beam(steel, (x, y0 - 2.6, z), (x, y0 + 2.6, z), 0.26)
        for k in range(4):
            z = height - k * 3.0
            for dy in (-2.4, 0.0, 2.4):
                beam(steel, (x0, y0 + dy, z + 0.12), (x0 + length, y0 + dy, z + 0.12), 0.2)
        beam(steel, (x0, y0, GROUND + 0.5), (x0 + length, y0, GROUND + 0.5), 0.3)
        if fine():  # what hangs on them
            for k in range(3):
                z = height - k * 3.0 + 0.3
                for j in range(5):
                    xa = x0 + 1.5 + j * 4.7
                    dy = (-2.4, 0.0, 2.4)[(j + k) % 3]
                    sag = 1.6 + 0.5 * ((j * 7 + k * 3) % 4)
                    path = [
                        P(xa, y0 + dy, z - 0.2),
                        P(xa + 0.1, y0 + dy + 0.35, z + 0.1),
                        P(xa + 1.0, y0 + dy + 0.5, z - sag),
                        P(xa + 2.0, y0 + dy + 0.35, z + 0.1),
                        P(xa + 2.1, y0 + dy, z - 0.2),
                    ]
                    cable.loft(path, [(0.09 * FT, 0.09 * FT)] * len(path), 6, ref=(1, 0, 0), resample=3)

    # the stair tower: tube scaffold, a flight to each lift, a boarded landing at every turn
    sx, sy, w, d, lift, lifts = -150.0, -146.0, 5.0, 12.0, 6.5, 6
    tube, board = parts(g, "galv", True), parts(g, "plank")
    top = lifts * lift
    for x in (sx, sx + w):
        for y in (sy, sy + d):
            tube.tube(P(x, y, GROUND - 0.5), P(x, y, top + GROUND + 3.6), 0.08 * FT, 6)
    for n in range(lifts + 1):
        z = GROUND + n * lift
        for x in (sx, sx + w):
            beam(tube, (x, sy, z + 3.4), (x, sy + d, z + 3.4), 0.13)
            if n < lifts:
                a, b = (sy, sy + d) if n % 2 else (sy + d, sy)
                beam(tube, (x, a, z + 0.2), (x, b, z + lift), 0.11)
        for y in (sy, sy + d):
            beam(tube, (sx, y, z + 3.4), (sx + w, y, z + 3.4), 0.13)
            beam(tube, (sx, y, z - 0.05), (sx + w, y, z - 0.05), 0.13)
        if n == 0:
            continue
        # the landing at this level: the end the flight below arrives at, full width
        end = sy + d if n % 2 else sy
        y0, y1 = sorted((end, end + (-2.4 if n % 2 else 2.4)))
        if n == lifts:  # the top is boarded over
            box(board, (sx + 0.1, sy, z - 0.16), (sx + w - 0.1, sy + d, z))
        else:
            box(board, (sx + 0.1, y0, z - 0.16), (sx + w - 0.1, y1, z))
    for n in range(lifts):  # each flight climbs one way along the tower, the next comes back beside it
        z = GROUND + n * lift
        going = 1 if n % 2 == 0 else -1
        ya, yb = (sy + 2.4, sy + d - 2.4) if going > 0 else (sy + d - 2.4, sy + 2.4)
        x = sx + (1.3 if n % 2 == 0 else w - 1.3)
        stairs(tube, (x, ya, z), (x, yb, z + lift), 2.2, rise=0.65)
        stair_rails(tube, (x, ya, z), (x, yb, z + lift), 2.2, 3.0)


def poles(parts: Parts) -> None:
    """The pole line along the road behind the blockhouse, and the taller pole by the hut (F16_016)."""
    g = "Poles"
    parts.node(g)
    for y in range(150, -701, -121):
        timber_pole(parts, g, 362.0, float(y), 34.0, aim=(0, 1, 0), arm=7.0)
    timber_pole(parts, g, *S(134.0, 92.0), 46.0, lamps=2, aim=(-1, -1, 0))


def build(parts: Parts) -> None:
    track(parts)
    road(parts)
    parts.node("CableTrenches")
    causeway(parts, "CableTrenches", TRENCH_END, TRENCH_TO, 0.0)
    causeway(parts, "CableTrenches", TRENCH6_END, TRENCH6_TO, PAD6[1])
    if stood(
        "Cable racks and the scaffold stair north of pad 5",
        confidence="estimated",
        source="FHSU F16_017 and F19_008, July 1961; whether they stood in May is not known",
    ):
        racks(parts)
    poles(parts)
