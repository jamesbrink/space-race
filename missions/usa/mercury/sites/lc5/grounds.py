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

import sitelib
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


RAMP = (-305.0, -340.0)  # where the rails rise from pad 5's height to FAR_RAIL: on ballast, past the turnout, short of the concrete
FROG_REACH, CROSSING_REACH = 5.0, 3.0  # each casting either way from its crossing, along each rail (estimated: a No. 5 frog is 10 to 12 ft)
BLADE, THROW = 15.0, 4.75  # switch points: tip to heel, ft; how far the open one stands off its stock rail, in (estimated: the usual)
GUARD = 11.0  # guard rails opposite each turnout frog, ft


def top_at(y: float) -> float:
    """The rails' head height along the track: pad 5's at first, rising over 35 ft of ballast to FAR_RAIL."""
    if y >= RAMP[0]:
        return RAIL_TOP
    if y <= RAMP[1]:
        return FAR_RAIL
    return RAIL_TOP + (FAR_RAIL - RAIL_TOP) * (RAMP[0] - y) / (RAMP[0] - RAMP[1])


def spur(xp: float, theta: float, off: float) -> tuple[float, float]:
    """A point on the turnout's curve leaving the pair whose centre line is at x = xp: `off` across
    it (+ outward), `theta` radians round from where it leaves the main line."""
    cx = xp - SPUR_R
    return cx + (SPUR_R + off) * math.cos(theta), SPUR_Y - (SPUR_R + off) * math.sin(theta)


def keep(lo: float, hi: float, cuts) -> list[tuple[float, float]]:
    return sitelib.free(lo, hi, cuts)


def track(parts: Parts) -> None:
    """The four rails on to pad 6 and beyond, and the turnout carrying both pairs away east: for each
    pair a switch (points set for the main line, a ground throw beside it), a frog where the curve
    crosses the main line, and a guard rail opposite it; where the +X pair's curve crosses the -X
    pair's main rails, a frog at each of the four crossings. Rails are flat-bottomed (sitelib.rail),
    on plates spiked to sleepers. That the turnout was there is documented (F16_017, F19_008); its
    parts are the ordinary practice of the period and every size is estimated."""
    g = "Track"
    parts.node(g)
    rails, ties, gravel, conc = parts(g, "rail", True), parts(g, "tie"), parts(g, "ballast"), parts(g, "concrete")
    fittings = parts(g, "rail/fittings")
    spikes = parts(g, "rail/spikes") if srlib.DETAIL >= 1.0 else None
    body, heads, gear = parts(g, "rail/castings"), parts(g, "rail/frogs"), parts(g, "chassis/switches")
    i = sitelib.inch()
    hh, H, plate = sitelib.RAIL_HEAD * i / 2, sitelib.RAIL_HEIGHT * i, sitelib.PLATE[2] * i
    half = HARDSTAND / 2
    p6a, p6b = PAD6[1] + half, PAD6[1] - half
    step = math.radians(0.75 if fine() else 1.5)
    main = hardstand.rails_x()
    paths: list = []  # every running rail's line, for the plates under it

    def line(x: float, y0: float, y1: float) -> list:
        ys = [y0] + [y for y in RAMP if y1 < y < y0] + [y1]
        return [(x, y, top_at(y)) for y in ys]

    def arc(xp: float, off: float, t0: float, t1: float, lift: float = 0.0) -> list:
        n = max(1, math.ceil((t1 - t0) / (2 * step)))  # a rail's chords 6.5 ft long: a quarter inch off the curve at most
        return [(*spur(xp, t0 + (t1 - t0) * k / n, off), RAIL_TOP + lift) for k in range(n + 1)]

    # ---- where the castings are: each pair's turnout frog, and the diamond's four
    cuts = {x: [] for x in main}
    arc_cuts = {(xp, d): [] for xp in (-RAIL_PAIR_X, RAIL_PAIR_X) for d in (-1, 1)}
    castings = []
    tf = math.acos((SPUR_R - GAUGE / 2) / (SPUR_R + GAUGE / 2))  # the curve's outer rail crossing the main line's inner one
    for xp in (-RAIL_PAIR_X, RAIL_PAIR_X):
        o = spur(xp, tf, GAUGE / 2)
        castings.append((o, (0, -1), 1, (-math.sin(tf), -math.cos(tf)), -1, (FROG_REACH, FROG_REACH), True))
        cuts[xp - GAUGE / 2].append((o[1] - FROG_REACH, o[1] + FROG_REACH))
        arc_cuts[(xp, 1)].append((tf - FROG_REACH / (SPUR_R + GAUGE / 2), tf + FROG_REACH / (SPUR_R + GAUGE / 2)))
    for d in (-1, 1):  # the +X pair's curve over the -X pair's main rails
        off = d * GAUGE / 2
        for x in (-RAIL_PAIR_X - GAUGE / 2, -RAIL_PAIR_X + GAUGE / 2):
            t = math.acos((x - (RAIL_PAIR_X - SPUR_R)) / (SPUR_R + off))
            o = spur(RAIL_PAIR_X, t, off)
            gauge_main = 1 if x < -RAIL_PAIR_X else -1
            castings.append((o, (0, -1), gauge_main, (-math.sin(t), -math.cos(t)), -d, (CROSSING_REACH, CROSSING_REACH), False))
            cuts[x].append((o[1] - CROSSING_REACH, o[1] + CROSSING_REACH))
            arc_cuts[(RAIL_PAIR_X, d)].append((t - CROSSING_REACH / (SPUR_R + off), t + CROSSING_REACH / (SPUR_R + off)))
    for o, da, ga, db, gb, reach, wings in castings:
        sitelib.frog(body, heads, o, da, ga, db, gb, RAIL_TOP, reach, wings=wings)

    # ---- the main line: the -X rail of each pair is the straight route's, from the switch's heel on
    for x in main:
        inner = any(abs(x - (xp - GAUGE / 2)) < 0.01 for xp in (-RAIL_PAIR_X, RAIL_PAIR_X))
        start = SPUR_Y - BLADE if inner else TRACK_BACK
        for y1, y0 in keep(TRACK_NORTH, start, cuts[x]):
            paths.append(line(x, y0, y1))
    # ---- each turnout
    ends, guards = [], []
    for xp in (-RAIL_PAIR_X, RAIL_PAIR_X):
        xa, xb = xp - GAUGE / 2, xp + GAUGE / 2
        arc_end = math.radians(SPUR_ARC)
        # the -X stock rail runs on into the curve's inner rail
        pieces = keep(0.0, arc_end, arc_cuts[(xp, -1)])
        for k, (t0, t1) in enumerate(pieces):
            run = arc(xp, -GAUGE / 2, t0, t1)
            paths.append(([(xa, TRACK_BACK, RAIL_TOP), (xa, SPUR_Y + 0.5, RAIL_TOP)] if k == 0 else []) + run)
        # the curve's outer rail from the switch's heel (its closure rail) on past the frog
        tb = BLADE / (SPUR_R + GAUGE / 2)
        for t0, t1 in keep(tb, arc_end, arc_cuts[(xp, 1)]):
            paths.append(arc(xp, GAUGE / 2, t0, t1))
        # the switch points, set for the main line: the straight one closed against the curving stock rail, the curved one open
        n = round(BLADE / 0.5)
        straight, curved, planes = [], [], []
        for k in range(n + 1):
            u = BLADE * k / n
            plane = max(0.0, 1.0 - u / 6.0)
            e = (sitelib.RAIL_WEB / 2 + (sitelib.RAIL_HEAD / 2 - sitelib.RAIL_WEB / 2) * (1.0 - plane)) * i  # its head toward the stock rail
            y = SPUR_Y - u
            stock = spur(xp, math.asin(u / (SPUR_R - GAUGE / 2)), -GAUGE / 2)[0]
            straight.append((max(xa, stock + hh + e + 0.03 * i), y, RAIL_TOP + 0.1 * i))
            t = u / (SPUR_R + GAUGE / 2)
            cx, cy = spur(xp, t, GAUGE / 2)
            curved.append((min(cx, xb - hh - e - 0.03 * i) - THROW * i * (1.0 - u / BLADE), cy, RAIL_TOP + 0.1 * i))
            planes.append(plane)
        sitelib.rail(rails, straight, plane=planes, side=-1, foot_cut=True)
        sitelib.rail(rails, curved, plane=planes, side=1, foot_cut=True)
        ends.append((xp, straight, curved))
        # guard rails opposite the frog, a flangeway off the running rail's gauge side, ends flared; their foot is
        # cut back on the running rail's side, as they share its plates
        _, yf = spur(xp, tf, GAUGE / 2)
        gx = xb - (sitelib.RAIL_HEAD + sitelib.FLANGEWAY) * i
        ys = (GUARD / 2, GUARD / 2 - 1.5, 1.5 - GUARD / 2, -GUARD / 2)
        guards.append(([(gx - 2 * i * (k in (0, 3)), yf + y, RAIL_TOP) for k, y in enumerate(ys)], 1))
        off = -GAUGE / 2 + (sitelib.RAIL_HEAD + sitelib.FLANGEWAY) * i
        ga = [tf + y / SPUR_R for y in (-GUARD / 2, 1.5 - GUARD / 2, GUARD / 2 - 1.5, GUARD / 2)]
        guards.append(([(*spur(xp, t, off + 2 * i * (k in (0, 3))), RAIL_TOP) for k, t in enumerate(ga)], -1))
    for path in paths:
        sitelib.rail(rails, path)
    for path, side in guards:
        sitelib.rail(rails, path, side=side, foot_cut=True)

    # ---- sleepers: plain ones under each pair; long ones through each turnout, out under the curve's
    # inner rail and, at the points, under the ground throw; on round the curve its own
    tie_top = RAIL_TOP - H - plate
    zone = (SPUR_Y - SPUR_R * math.sin(math.radians(15.5)), SPUR_Y + 1.5)  # through the switch and the frog to where the curve's own sleepers begin
    sleepers, slides = [], []
    for y0, y1 in ((p6a + 0.05, TRACK_BACK - 3.0), (TRACK_NORTH - 3.0, p6b - 0.05)):
        box(gravel, (-RAIL_PAIR_X - 6.0, y0, -FOOTING), (RAIL_PAIR_X + 6.0, y1, -0.75))
        y = y0 + 1.2
        while y < y1 - 1.0:
            if not STRIPS[0] <= y <= STRIPS[1]:
                top = top_at(y) - H - plate
                for sx in (-1, 1):
                    xp = sx * RAIL_PAIR_X
                    if zone[0] <= y <= zone[1]:
                        u = SPUR_Y - y
                        x0 = xp - GAUGE / 2 - 1.9
                        if u > 0:
                            x0 = min(x0, spur(xp, math.asin(min(1.0, u / (SPUR_R - GAUGE / 2))), -GAUGE / 2)[0] - 1.9)
                        x1 = xp + GAUGE / 2 + (4.6 if 0.0 < u < 4.0 else 1.9)
                        box(ties, (x0, y - 0.38, top - 0.49), (x1, y + 0.38, top))
                        (slides if 0 < u < BLADE else sleepers).append((((x0 + x1) / 2, y), (1, 0), (x1 - x0) / 2, top))
                    else:
                        box(ties, (xp - 4.25, y - 0.38, top - 0.49), (xp + 4.25, y + 0.38, top))
                        sleepers.append(((xp, y), (1, 0), 4.25, top))
            y += 2.0
    for xp in (-RAIL_PAIR_X, RAIL_PAIR_X):
        t = math.radians(15.5)
        while t < math.radians(SPUR_ARC):
            x, y = spur(xp, t, 0.0)
            obox(ties, (x, y, tie_top - 0.02 - 0.245), (math.cos(t), -math.sin(t), 0), (0, 0, 1), (8.5, 0.76, 0.49))
            sleepers.append(((x, y), (math.cos(t), -math.sin(t)), 4.25, tie_top - 0.02))
            t += 2.0 / SPUR_R
    if fine():
        sitelib.ties_and_plates(fittings, spikes, sleepers, paths + [g for g, _ in guards])
        # under the points, one slide plate under each stock rail and its switch rail together
        for (cx, y), _, _, _ in slides:
            for xp, straight, curved in ends:
                if abs(cx - xp) > 12.0:
                    continue
                u = SPUR_Y - y
                k = round(u / 0.5)
                stock_in = spur(xp, math.asin(u / (SPUR_R - GAUGE / 2)), -GAUGE / 2)[0]
                for xs, xbl in ((stock_in, straight[k][0]), (xp + GAUGE / 2, curved[k][0])):
                    lo, hi = sorted((xs, xbl))
                    box(fittings, (lo - 6.5 * i, y - 3.9 * i, RAIL_TOP - H - plate - 0.5 * i), (hi + 6.5 * i, y + 3.9 * i, RAIL_TOP - H + 0.1 * i))
        y = TRACK_BACK - 20.0
        while y > TRACK_NORTH:  # rail joints every 39 ft, on the plain track
            if not (zone[0] - 3 < y < zone[1] + 3 or STRIPS[0] - 2 < y < STRIPS[1] + 2 or p6b - 2 < y < p6a + 2):
                for x in main:
                    if not any(lo - 2 < y < hi + 2 for lo, hi in cuts[x]):
                        hardstand.fishplate(fittings, x, y, top_at(y))
            y -= 39.0
    # ---- the points' rods and the ground throw that works them, on the +X side at the tips
    for xp, straight, curved in ends:
        base = RAIL_TOP + 0.1 * i - H
        for k in (4, 8):  # two rods tying the switch rails together, between the sleepers
            y = straight[k][1]
            box(gear, (straight[k][0], y - 0.4 * i, base + 1.6 * i), (curved[k][0], y + 0.4 * i, base + 3.4 * i))
        y = straight[4][1]
        xs = xp + GAUGE / 2
        box(gear, (curved[4][0], y - 0.5 * i, base - 1.6 * i), (xs + 3.0, y + 0.5 * i, base - 0.5 * i))  # the throw rod, under the stock rail
        top = tie_top
        box(gear, (xs + 2.6, y - 1.0, top - 0.05), (xs + 4.2, y + 1.1, top + 0.35))  # the stand's base on the long sleepers
        box(gear, (xs + 3.0, y - 0.35, top + 0.35), (xs + 3.8, y + 0.25, top + 1.05))  # its housing
        beam(gear, (xs + 3.4, y + 0.2, top + 0.85), (xs + 3.4, y + 2.9, top + 0.55), 0.12)  # the throw lever, lying along the track
        if fine():
            gear.tube(P(xs + 3.4, y - 0.05, top + 1.05), P(xs + 3.4, y - 0.05, top + 3.6), 0.06 * FT, 8)  # the spindle
            parts(g, "signred/target", True).lathe(
                [(0.0, 0.0), (0.55 * FT, 0.0), (0.55 * FT, 0.05 * FT), (0.0, 0.05 * FT)],
                20,
                matrix=sitelib.axes((xs + 3.4, y - 0.05, top + 3.1), (1, 0, 0), (0, 1, 0)),
            )
    box(ties, (-RAIL_PAIR_X - 4.5, TRACK_NORTH - 1.2, -0.95), (RAIL_PAIR_X + 4.5, TRACK_NORTH - 0.2, 2.2))  # the stop at the end of what is modelled
    for sx in (-1, 1):  # the concrete laid in the track by pad 6, the rails standing just proud of it
        box(conc, (sx * RAIL_PAIR_X - 5.6, STRIPS[0] + 0.02, -FOOTING), (sx * RAIL_PAIR_X + 5.6, STRIPS[1], -0.02))
    bed = parts(g, "ballast/spur")
    for xp in (-RAIL_PAIR_X, RAIL_PAIR_X):
        first = math.radians(6.0)
        loops = [
            [(*spur(xp, first + k * step, a), z) for a, z in ((-6.5, -FOOTING), (6.5, -FOOTING), (6.5, -0.95), (-6.5, -0.95))]
            for k in range(round((math.radians(SPUR_ARC + 1.0) - first) / step) + 1)
        ]
        solid(bed, loops)
        t = math.radians(SPUR_ARC)
        x, y = spur(xp, t, 0.0)
        obox(ties, (x, y, 0.4), (math.cos(t), -math.sin(t), 0), (0, 0, 1), (9.0, 1.0, 2.6))


def road(parts: Parts) -> None:
    g = "Road"
    parts.node(g)
    conc, joints, paint = parts(g, "concrete"), parts(g, "joint"), parts(g, "black/lettering")
    half = HARDSTAND / 2
    y0, y1 = PAD6[1] + half, -half
    x0, x1 = ROAD_X
    slab(joints, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], GROUND - 0.75, -0.14, spread=2.4)  # (its foot in the sand, clear of the rails)
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
            if n == 0 and y == sy:  # the way in: the end the first flight starts from is open to the ground
                continue
            beam(tube, (sx, y, z + 3.4), (sx + w, y, z + 3.4), 0.13)
            beam(tube, (sx, y, z - 0.05), (sx + w, y, z - 0.05), 0.13)
        if n == 0:
            continue
        # the landing at this level: the end the flight below arrives at, full width
        end = sy + d if n % 2 else sy
        y0, y1 = sorted((end, end + (-2.4 if n % 2 else 2.4)))
        if n == lifts:  # the top is boarded over, but for the well the last flight comes up through
            box(board, (sx + 0.1, sy, z - 0.16), (sx + w - 0.1, sy + 2.4, z))
            box(board, (sx + 0.1, sy + 2.4, z - 0.16), (sx + w - 2.55, sy + d, z))
            beam(tube, (sx + w - 2.5, sy + 2.5, z + 3.4), (sx + w - 2.5, sy + d, z + 3.4), 0.13)  # a rail along the well
            for y in (sy + 2.5, sy + 7.0, sy + d - 0.1):
                beam(tube, (sx + w - 2.5, y, z), (sx + w - 2.5, y, z + 3.4), 0.13)
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
        seen = "Seen north of pad 5 in July 1961 and assumed for May; its size is estimated."
        for mat, label in (("chassis", "Cable racks"), ("cable", "Cable racks"), ("galv", "Scaffold stair"), ("plank", "Scaffold stair")):
            parts.mark("Yard", mat, label=label, about=seen)
    poles(parts)
