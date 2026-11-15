"""What stood round the flame pit's rim: the nine observation positions, the heap of spoil from the pit, the
cable conduit and the old cable tray from the bunker to the launching structure, and the floodlight tower west of
the platform.

Nodes: ObservationPosts (with a child for each position, `ObservationPost_A` to `_I`), SpoilHeap, CableConduit,
FloodlightTower.

All of it is from the CIA's reading of the U-2's photographs (HTA/JR-4/58, PIC/JR-2/60 and its Figure 5,
PIC/JR-2/61). A position's place is scaled off Figure 5, a line drawing: good to some ten metres. On the pit's
south side the drawing's rim lies 10 to 30 m outside today's mapped rim, which is the pit model's, so the
positions there stand back from the modelled rim by that much; on the north side they are on it, and are set
8 m outside it so that they stand on the land. No photograph of any of them has been read: every form is ours.
"""

from __future__ import annotations

import math

import sitelib
import srlib

from . import platform, relief
from .place import FOOTING, ROAD_HALF, ridge, to_road, toward_pad, turned
from .site import FT, GROUND, PLATFORM, P, Parts, Welded, beam, box, fine, lattice, stood

# ---- the nine positions (HTA/JR-4/58: "at least nine instrumentation and observation positions ... around the rim
# of the pit. These positions face toward the launching structure and are generally heavily earth-covered. Six
# positions (items a through f) are relatively small and probably house cameras or instruments. The remaining
# three are large observation-type bunkers"). Each: its letter, where Figure 5 has it (m east and north), its
# breadth and depth (m, estimated: the small ones are a few millimetres across on the drawing).
POSTS = [
    ("A", (1.4, -106.8), 3.2, 3.0),
    ("B", (65.8, -121.0), 3.2, 3.0),
    ("C", (147.4, 56.4), 3.2, 3.0),
    ("D", (37.2, 93.6), 3.2, 3.0),
    ("E", (22.3, 88.4), 3.2, 3.0),
    ("F", (-11.4, 106.5), 3.2, 3.0),
    # g: "the largest ... is served by a covered personnel passageway from the road, and is located along the rim of
    # the pit at a point 300 feet south of the launching structure"
    ("G", (20.0, -94.0), 9.0, 5.0),
    # h: "a long linear bunker ... situated southeast of the launching structure": 41 m long on the drawing
    ("H", (131.7, -66.7), 41.0, 3.6),
    # i: "a smaller position ... located at the eastern end of the pit": on the drawing inside the rim's tip, where
    # the pit's floor comes up to the land; set here east of the road round the tip, looking up the pit (estimated)
    ("I", (251.5, 1.4), 4.5, 3.6),
]
H_HEADING = math.degrees(math.atan2(37.3, -17.2))  # the long bunker's face: square to its length, toward the pit
POST_HEIGHT = 2.3  # a position's roof over the ground, m (estimated)
CLEAR = 8.0  # how far outside the modelled rim a position's middle is kept, m

# ---- the spoil: "a large pile some 800 feet to the northeast" (HTA/JR-4/58), a "spoil bank" on Figure 5, and
# standing today. Its outline is Figure 5's, fitted to the heap's extent on today's imagery (it lies 181 to 381 m
# east); its height is what SRTM read in 2000: 114 m at its top against 105 to 107 m round it. The U-2's photograph of
# July 1959 (NPIC/B-24/61 Figure 1, a high-contrast print at some 2.7 px a metre as scanned) has it as a rounded white
# mass from 200 to 384 m east and 45 to 313 m north, bare and burnt out to white, so that nothing of its top or its
# faces can be read; along its west side a dark band 30 to 40 m broad with a scalloped inner edge, some five bays in
# 230 m. The CORONA frames of 7 December 1960 and 30 May 1962 (4 m a pixel as kept) show its ground as paler and
# mottled, and no more. So: the outline with its corners rounded and the lobes' breadth (some 50 m) are from the
# photographs; that there are lobes all the way round, their depth, the face's slope, the gullies and the level top
# are estimated: what earth tipped from trucks four years before looks like, drawn clean.
HEAP = [(181.0, 266.0), (225.4, 287.4), (314.3, 292.0), (372.1, 279.0), (381.0, 213.1), (372.1, 137.9), (339.9, 90.6),
        (288.8, 72.0), (238.8, 96.1), (203.2, 143.5), (181.0, 202.0)]  # fmt: skip
HEAP_HEIGHT = 9.0  # m (estimated: SRTM's 8 m, and a 30 m grid rounds a heap's top off)
HEAP_SUNK = 0.4  # its mesh's edge lies this far under the land, so the land covers the join
# The face: earth tipped over a brow lies at its angle of repose, 1 in 1.5 or so, its foot eased where what slid has
# gathered (HEAP_TOE, m in from the edge) and its brow rounded by four winters (HEAP_BROW, m). All estimated.
HEAP_SLOPE = 1.5
HEAP_TOE, HEAP_TOE_SLOPE, HEAP_BROW = 3.0, 0.15, 4.0
# The top, where the trucks ran: nearly level, with a slow swell of this much either way, m, and falling HEAP_CROWN
# m from its middle to its brow over the last so many metres (estimated: a top is tipped from its middle outward)
HEAP_SWELL = 0.35
HEAP_CROWN = (1.2, 40.0)
# The lobes: one to each tipping place along the brow, HEAP_LOBES of them round the heap (its edge is some 690 m, so
# some 50 m each, as the U-2 has along the west side; here 29 to 67 m), each bay between two of them bitten
# HEAP_BAY m back from the outline, more or less, and on the east side, which the U-2 has nearly straight along its
# ditch, HEAP_BAY_EAST of that (estimated).
HEAP_LOBES = 14
HEAP_BAY = (6.0, 2.5)
HEAP_BAY_EAST = 0.3
# The gullies: rain runs off the top where two lobes meet, and cuts there (m deep, and this far either side of the
# bay's line, m); a lesser rill down each flank of a lobe. Estimated: a bare clay bank four springs old has them.
HEAP_GULLY, HEAP_RILL = (1.0, 2.5), (0.5, 2.0)

# ---- the conduit: "a new probable cable conduit and passageway ... becomes visible at a point on the edge of the
# pit ... makes two turns and connects with the launching structure at a point about 80 feet above the base of the pit
# or about 60 feet below the top of the launching platform. It is supported by several small vertical pillars whereas
# the old cable tray is unsupported" (PIC/JR-2/60). Its line is Figure 5's, which today's concrete channel on the
# same slope follows within a few metres.
CONDUIT = [(8.0, 92.0), (8.0, 84.0), (8.0, 67.0), (-5.0, 58.0), (-7.0, 17.0)]
CONDUIT_SIZE = (2.0, 2.2)  # wide and high, m (estimated: the CIA's diameter is redacted; a passageway is walked through)
CONDUIT_END = 60.0 * FT  # below the platform's top, where it meets the structure (PIC/JR-2/60)
# The old tray: "a connecting cable tray or personnel passageway ... extending some 200 feet across the open pit"
# (HTA/JR-4/58), straight, from the north rim to the platform's north edge (Figure 5).
TRAY = [(12.9, 90.0), (11.4, PLATFORM / 2 - 0.3)]
TRAY_R = 0.45  # m (estimated: redacted)

# ---- the tower: "a possible third collimation tower 60 feet high ... approximately 400 feet west of the servicing
# tower" (HTA/JR-4/58); it "probably supports floodlights" (PIC/JR-2/61).
TOWER = (-400.0 * FT, 10.4)  # between the centre track and the spur north of it (its place across the tracks estimated)
TOWER_HEIGHT = 60.0 * FT


def _inside(poly, x: float, y: float) -> float:
    """How far inside a polygon a point is, m (negative outside)."""
    best, odd = 1e9, False
    for (ax, ay), (bx, by) in zip(poly, poly[1:] + poly[:1]):
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        best = min(best, math.hypot(x - ax - t * dx, y - ay - t * dy))
        if (ay > y) != (by > y) and x < ax + (bx - ax) * (y - ay) / (by - ay):
            odd = not odd
    return best if odd else -best


def _smooth(a: float, b: float, x: float) -> float:
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


HEAP_FACE_RISE = HEAP_HEIGHT - HEAP_SWELL - HEAP_CROWN[0] + HEAP_SUNK  # what the face climbs, from its sunk edge to the brow
# how far in from its edge the face reaches the top, m (derived from the slope, the foot and the brow)
HEAP_FACE = HEAP_TOE + HEAP_BROW + (HEAP_FACE_RISE - HEAP_TOE * (1 / HEAP_SLOPE + HEAP_TOE_SLOPE) / 2 - HEAP_BROW / HEAP_SLOPE / 2) * HEAP_SLOPE


def _face(t: float) -> float:
    """The face's section: how much of its rise it has made `t` metres in from its edge, 0 to 1. A foot that steepens
    over HEAP_TOE, a straight fall at 1 in HEAP_SLOPE, a brow rounded over HEAP_BROW."""
    m, m0 = 1 / HEAP_SLOPE, HEAP_TOE_SLOPE
    t = min(max(t, 0.0), HEAP_FACE)
    if t < HEAP_TOE:
        h = m0 * t + (m - m0) * t * t / (2 * HEAP_TOE)
    else:
        h = HEAP_TOE * (m + m0) / 2 + m * (min(t, HEAP_FACE - HEAP_BROW) - HEAP_TOE)
        if t > HEAP_FACE - HEAP_BROW:
            u = t - (HEAP_FACE - HEAP_BROW)
            h += m * u - m * u * u / (2 * HEAP_BROW)
    return h / HEAP_FACE_RISE


def _heap_top(x: float, y: float, t: float) -> float:
    """The top's height over the land, m, `t` metres in from the heap's edge: nearly level, with a slow swell (tipped
    earth is not a table), and falling a little to its brow."""
    crown = HEAP_CROWN[0] * (1.0 - _smooth(HEAP_FACE - HEAP_BROW, HEAP_FACE + HEAP_CROWN[1], t))
    return HEAP_HEIGHT - crown - HEAP_SWELL * (1.0 - math.sin(x * 0.045 + 1.3) * math.sin(y * 0.038 + 0.4))


def _heap_edge(per_lobe: int) -> list[tuple]:
    """The heap's edge as stations round it, `per_lobe` to a lobe, the first of each in the bay between two lobes:
    (x, y, the way in as a unit nx, ny, how far the edge is bitten back there, how far round its lobe it is from
    0 to 1, the lobe's breadth). The outline is HEAP with its corners rounded (cut four times, as a spline's)."""
    pts = HEAP
    for _ in range(4):
        pts = [
            q
            for a, b in zip(pts, pts[1:] + pts[:1])
            for q in ((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        ]
    run = [0.0]
    for a, b in zip(pts, pts[1:] + pts[:1]):
        run.append(run[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = run[-1]

    def at(s: float) -> tuple[float, float]:
        s %= total
        k = max(i for i in range(len(pts)) if run[i] <= s)
        a, b = pts[k], pts[(k + 1) % len(pts)]
        f = (s - run[k]) / (run[k + 1] - run[k])
        return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f

    # the lobes are not all one breadth: where each bay falls round the edge is drawn out and closed up
    where = lambda q: total * (q + 0.016 * math.sin(math.tau * 3 * q + 1.0) + 0.008 * math.sin(math.tau * 5 * q + 2.2))  # noqa: E731
    count = HEAP_LOBES * per_lobe
    stations = []
    for k in range(count):
        s = where(k / count)
        (x, y), (ax, ay), (bx, by) = at(s), at(s - 4.0), at(s + 4.0)
        n = math.hypot(bx - ax, by - ay)
        stations.append((x, y, (by - ay) / n, -(bx - ax) / n))  # (the outline runs clockwise from above, so the way in is to its right)
    # each bay's depth: deeper on the side that faces west (the way in there is east)
    bay = [
        (HEAP_BAY[0] + HEAP_BAY[1] * math.sin(2.4 * j + 0.7))
        * (HEAP_BAY_EAST + (1.0 - HEAP_BAY_EAST) * _smooth(-0.5, 0.5, stations[j * per_lobe][2]))
        for j in range(HEAP_LOBES)
    ]
    out = []
    for k, (x, y, nx, ny) in enumerate(stations):
        lobe, f = divmod(k, per_lobe)
        f /= per_lobe
        deep = bay[lobe] * (1 - f) + bay[(lobe + 1) % HEAP_LOBES] * f
        breadth = where((lobe + 1) / HEAP_LOBES) - where(lobe / HEAP_LOBES)
        nose = f ** (1.0 + 0.3 * math.sin(1.7 * lobe + 0.3))  # (a lobe's nose is not in its middle)
        out.append((x, y, nx, ny, deep * (1.0 - math.sin(math.pi * nose) ** 0.75), f, breadth))
    return out


def _heap_at(x: float, y: float, t: float, f: float, breadth: float, rills: bool = True) -> float:
    """The heap's surface over the land, m, at a point `t` metres in from its edge and `f` of the way round its lobe:
    under the land by HEAP_SUNK at the edge and on down outside it."""
    if t <= 0:
        return -HEAP_SUNK - min(1.5, -t * 0.3)
    h = -HEAP_SUNK + (_heap_top(x, y, t) + HEAP_SUNK) * _face(t)
    # (a gully dies out at the foot, and on the top)
    down = _smooth(1.0, 4.0, t) * (1.0 - _smooth(HEAP_FACE - HEAP_BROW, HEAP_FACE + 1.5, t))
    off = min(f, 1.0 - f) * breadth  # metres from the bay's line
    h -= HEAP_GULLY[0] * max(0.0, 1.0 - off / HEAP_GULLY[1]) * down
    if rills:
        off = min(abs(f - 0.3), abs(f - 0.7)) * breadth
        h -= HEAP_RILL[0] * max(0.0, 1.0 - off / HEAP_RILL[1]) * down
    return h


_EDGE: list[tuple] = []


def heap_height(x: float, y: float) -> float:
    """The spoil heap's height over the land at a point, m (0 off it)."""
    if not _EDGE:
        _EDGE.extend(_heap_edge(20))
    best, odd = (1e9, 0, 0.0), False
    for k, (a, b) in enumerate(zip(_EDGE, _EDGE[1:] + _EDGE[:1])):
        dx, dy = b[0] - a[0], b[1] - a[1]
        u = max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)))
        best = min(best, (math.hypot(x - a[0] - u * dx, y - a[1] - u * dy), k, u))
        if (a[1] > y) != (b[1] > y) and x < a[0] + dx * (y - a[1]) / dy:
            odd = not odd
    if not odd:
        return 0.0
    d, k, u = best
    a, b = _EDGE[k], _EDGE[(k + 1) % len(_EDGE)]
    f = a[5] + ((b[5] or 1.0) - a[5]) * u
    return max(0.0, _heap_at(x, y, d - (a[4] + (b[4] - a[4]) * u), f, a[6]))


def ground(x: float, y: float) -> float:
    """The ground's height where a fence post or a pole stands: the land's, or the heap's on it."""
    return GROUND + heap_height(x, y)


def outside(x: float, y: float, clear: float = CLEAR) -> tuple[float, float]:
    """A point moved straight out from the pit's rim until it is `clear` metres outside it (if it is not already)."""
    for _ in range(200):
        d = platform.to_rim(x, y)
        if d <= -clear:
            break
        gx = (platform.to_rim(x + 0.5, y) - platform.to_rim(x - 0.5, y)) or 1e-6
        gy = platform.to_rim(x, y + 0.5) - platform.to_rim(x, y - 0.5)
        k = math.hypot(gx, gy)
        x, y = x - gx / k * 0.5, y - gy / k * 0.5
    return x, y


def posts(parts: Parts) -> None:
    top = "ObservationPosts"
    parts.node(top)
    for letter, (px, py), wide, deep in POSTS:
        at = outside(px, py)
        heading = H_HEADING if letter == "H" else toward_pad(*at)
        big = letter in "GHI"
        g = f"ObservationPost_{letter}"
        parts.node(
            g,
            top,
            (at[0], at[1], 0.0),
            label=f"Observation bunker {letter.lower()}" if big else f"Instrument position {letter.lower()}",
            about=(
                "One of nine earth-covered positions the CIA's interpreters counted round the pit in 1957 and again in 1959, facing "
                "the launching structure: "
                + ("an observation bunker" if big else "small, for cameras or instruments")
                + ". Its place is scaled off their drawing; its form is estimated, and its inside is not recorded."
            ),
        )
        conc, earth, dark = parts(g, "concrete"), parts(g, "earth", True), parts(g, "void")
        hw, hd = wide / 2, deep / 2
        ring = [turned(at, heading, x, y) for x, y in ((-hd, -hw), (hd, -hw), (hd, hw), (-hd, hw))]
        walls = sitelib.ring(ring, 0.45)
        roof = GROUND + POST_HEIGHT
        # the slits in the face toward the structure (wall 1), each backed by the dark inside
        n = max(1, round(wide / 7.0))
        span = (wide - 1.2) / n
        slits = [(0.6 + k * span + 0.25, 0.6 + (k + 1) * span - 0.25, GROUND + 1.3, GROUND + 1.62) for k in range(n)]
        door = (hw - 0.45, hw + 0.45, GROUND + 0.05, GROUND + 1.9)
        for i, w in enumerate(walls):
            w.build(conc, -FOOTING, roof, slits if i == 1 else [door] if i == 3 else [])
        for s0, s1, lo, hi in slits:
            walls[1].box(dark, s0 - 0.05, s1 + 0.05, 0.3, 0.4, lo - 0.05, hi + 0.05)
            walls[1].box(conc, s0 - 0.12, s1 + 0.12, -0.25, 0.1, hi + 0.06, hi + 0.2)  # a hood over the slit
        sitelib.wall_door(parts, f"{g}_Door", g, walls[3], *door, depth=0.12, fittings="none", works=False)
        obj = parts.nodes[f"{g}_Door"][0]
        obj["label"], obj["about"] = (
            "Door, kept shut",
            "What stood in this position is not recorded, so its inside is not drawn and its door stays shut.",
        )
        sitelib.slab(conc, sitelib.offset_poly(ring, 0.2), roof, roof + 0.3, bottom=True)
        # earth over the roof and banked against both ends: the face and the door's side are left clear
        cover = [turned(at, heading, x, y) for x, y in ((-hd + 0.5, -hw + 0.3), (hd - 0.9, -hw + 0.3), (hd - 0.9, hw - 0.3), (-hd + 0.5, hw - 0.3))]
        sitelib.slab(earth, cover, roof + 0.25, roof + 0.75, spread=0.6, soft=True)
        for s in (-1, 1):
            ridge(earth, at, heading, -hd + 0.1, hd - 0.1, s * (hw + 0.02), s, roof + 0.1)
        if letter == "G":  # the covered passageway from the road: a low concrete duct under a ridge of earth, a door at the road
            passage(parts, g, at, heading, hd)


def passage(parts: Parts, g: str, at, heading: float, hd: float) -> None:
    """Observation bunker g's covered way: from its back to the road round the pit."""
    length = 0.0
    while to_road(*turned(at, heading, -hd - length - 1.5, 0.0)) > ROAD_HALF + 2.0 and length < 60.0:
        length += 0.5
    conc, earth = parts(g, "concrete/passage"), parts(g, "earth/passage", True)
    xa, xb, hw, top = -hd - length, -hd + 0.02, 1.1, GROUND + 2.0
    ring = [turned(at, heading, x, y) for x, y in ((xa, -hw), (xb, -hw), (xb, hw), (xa, hw))]
    walls = sitelib.ring(ring, 0.3)
    door = (hw - 0.45, hw + 0.45, GROUND + 0.05, GROUND + 1.85)
    for i, w in enumerate(walls):
        if i != 1:  # (its far end is the bunker's back wall)
            w.build(conc, -FOOTING, top, [door] if i == 3 else [])
    sitelib.slab(conc, sitelib.offset_poly(ring, 0.1), top, top + 0.25, bottom=True)
    sitelib.wall_door(parts, f"{g}_PassageDoor", g, walls[3], *door, depth=0.1, fittings="none", works=False)
    obj = parts.nodes[f"{g}_PassageDoor"][0]
    obj["label"], obj["about"] = (
        "Door to the covered way, kept shut",
        "The covered passageway from the road to observation bunker g. Its inside is not drawn.",
    )
    for s in (-1, 1):
        ridge(earth, at, heading, xa + 0.3, xb - 0.2, s * (hw + 0.02), s, top - 0.05, run=1.3)
    cover = [turned(at, heading, x, y) for x, y in ((xa + 1.2, -hw + 0.2), (xb - 0.6, -hw + 0.2), (xb - 0.6, hw - 0.2), (xa + 1.2, hw - 0.2))]
    sitelib.slab(earth, cover, top + 0.2, top + 0.6, spread=0.5, soft=True)


def heap(parts: Parts) -> None:
    g = "SpoilHeap"
    parts.node(
        g,
        label="Spoil heap",
        about=(
            "Earth dug from the flame pit in 1955 and 1956 and tipped here, north-east of it; the rest went into the railway's "
            "embankment. It is on the CIA's drawings of 1957 and 1959 and stands today. Its outline is theirs, fitted to today's "
            "imagery and to the U-2's photograph of July 1959, which has scallops some 50 m apart along its west side; its height "
            "(9 m) is estimated from the height SRTM read in 2000. The lobes round the rest of it, the slope of its face, its "
            "gullies and its level top are estimated: no photograph read is close enough to show them."
        ),
    )
    earth = Welded(parts(g, "earth", True))
    # Its mesh follows its form: a station every 2.5 m or so round the edge (5 m at a lower level of detail), and from
    # each a line up the face, so that a gully is a line of the mesh and not a row of teeth across a square grid.
    per_lobe = 20 if fine() else 10
    edge = _heap_edge(per_lobe)
    brow = HEAP_FACE
    rows = [-5.0, 0.0, 1.2, 2.4, 3.6, 5.5, 7.5, 9.5, brow - 3.6, brow - 2.4, brow - 1.2, brow, brow + 1.5, brow + 4.0]
    rings = (0.85, 0.7, 0.5, 0.25)  # and on over the top toward its middle, by these shares of the way
    if not fine():
        rows, rings = [-5.0, 0.0, 2.4, 5.5, 9.5, brow - 2.4, brow, brow + 4.0], (0.7, 0.4)
    n = len(edge)
    cx, cy = sum(e[0] for e in edge) / n, sum(e[1] for e in edge) / n
    grid = []  # each station's points, from outside the edge to the top's middle
    for x, y, nx, ny, bite, f, breadth in edge:
        line = [(x + nx * (bite + t), y + ny * (bite + t), t) for t in rows]
        ix, iy, it = line[-1]
        line += [(cx + (ix - cx) * u, cy + (iy - cy) * u, it + math.hypot(ix - cx, iy - cy) * (1 - u)) for u in rings]
        grid.append([P(px, py, GROUND + _heap_at(px, py, t, f, breadth, fine())) for px, py, t in line])
    for k in range(n):
        k1 = (k + 1) % n
        last = len(grid[k]) - 1
        for r in range(last):
            # (clockwise round the edge and inward: the face is up)
            earth.add(
                [(k, r), (k, r + 1), (k1, r + 1), (k1, r)],
                [grid[k][r], grid[k][r + 1], grid[k1][r + 1], grid[k1][r]],
                [(0, 1, 2), (0, 2, 3)] if r % 2 else [(0, 1, 3), (1, 2, 3)],
            )
        earth.add([(k, last), "middle", (k1, last)], [grid[k][last], P(cx, cy, GROUND + _heap_top(cx, cy, 1e3)), grid[k1][last]], [(0, 1, 2)])


def _along(line, step: float) -> list[tuple[float, float, float]]:
    """Points along a polyline every `step` metres or so, its corners among them: (x, y, distance along)."""
    out, s = [], 0.0
    for (ax, ay), (bx, by) in zip(line, line[1:]):
        length = math.hypot(bx - ax, by - ay)
        n = max(1, round(length / step))
        for k in range(n):
            out.append((ax + (bx - ax) * k / n, ay + (by - ay) * k / n, s + length * k / n))
        s += length
    out.append((*line[-1], s))
    return out


def conduit(parts: Parts) -> None:
    g = "CableConduit"
    parts.node(
        g,
        label="Cable conduit to the bunker",
        about=(
            "The covered way for cables and men from the command bunker to the launching structure, built between the photographs of "
            "1957 and 1959: it comes out of the pit's north rim, turns twice and crosses to the structure on small piers. Beside it "
            "the older tray, a straight span from the rim to the platform. Their lines are the CIA's; their sections, and the level "
            "the conduit arrives at against the pit's estimated terraces, are ours."
        ),
    )
    conc, steel = parts(g, "concrete/conduit"), parts(g, "dark/tray", True)
    w, h = CONDUIT_SIZE
    pts = _along(CONDUIT, 3.0)
    total = pts[-1][2]
    # It falls evenly from under the land at its north end to where it meets the structure: 60 ft under the platform's
    # top, or just over the pit's modelled ground there if that is higher (the terraces' levels are estimated).
    ex, ey = CONDUIT[-1]
    end = max(-CONDUIT_END - h / 2, platform.pit_z(ex, ey + 2.0) + 0.6)
    start = GROUND + relief.ground(*CONDUIT[0]) - 0.5 - h  # (the land at the north rim lies some 8 m under the deck's level)
    loops, under = [], []
    for k, (x, y, s) in enumerate(pts):
        a, b = pts[max(0, k - 1)], pts[min(len(pts) - 1, k + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        n = math.hypot(tx, ty)
        tx, ty = tx / n, ty / n
        # at a corner the section lies on the bisector, wider by the turn, so the walls stay w apart
        if 0 < k < len(pts) - 1:
            d0 = (x - a[0], y - a[1])
            d1 = (b[0] - x, b[1] - y)
            cos = (d0[0] * d1[0] + d0[1] * d1[1]) / (math.hypot(*d0) * math.hypot(*d1))
            wide = w / 2 / math.sqrt((1 + max(-0.9, min(1.0, cos))) / 2)
        else:
            wide = w / 2
        zb = start + (end - start) * s / total
        loops.append(
            [
                (x - ty * wide, y + tx * wide, zb),
                (x + ty * wide, y - tx * wide, zb),
                (x + ty * wide, y - tx * wide, zb + h),
                (x - ty * wide, y + tx * wide, zb + h),
            ]
        )
        under.append((x, y, zb))
    sitelib.solid(conc, loops)
    piers = parts(g, "concrete/piers")
    last = -1e9
    for x, y, zb in under:  # a pier wherever the ground has fallen away under it, every 9 m or so
        s = math.hypot(x - under[0][0], y - under[0][1])
        gz = platform.pit_z(x, y)
        if zb - gz > 0.8 and abs(s - last) > 8.0 and y > 22.0:
            box(piers, (x - 0.3, y - 0.3, gz - 0.6), (x + 0.3, y + 0.3, zb + 0.05))
            last = s
    # the old tray: one straight span, unsupported, from under the land at the rim to the platform's north edge
    (ax, ay), (bx, by) = TRAY
    az = GROUND + relief.ground(ax, ay) - 0.5 - TRAY_R
    steel.tube(P(ax, ay, az), P(bx, by, -1.5), TRAY_R, 16)
    if fine():  # its joints: a band every 6 m
        n = int(math.hypot(bx - ax, by - ay) / 6.0)
        for k in range(1, n):
            t = k / n
            c = (ax + (bx - ax) * t, ay + (by - ay) * t, az + (-1.5 - az) * t)
            d = (bx - ax, by - ay, -1.5 - az)
            steel.lathe(
                [(TRAY_R - 0.02, -0.06), (TRAY_R + 0.03, -0.06), (TRAY_R + 0.03, 0.06), (TRAY_R - 0.02, 0.06)], 16, matrix=srlib.frame(P(*c), d)
            )


def tower(parts: Parts) -> None:
    g = "FloodlightTower"
    parts.node(
        g,
        label="Floodlight tower",
        about=(
            "A tower 60 ft high, 400 ft west of the rocket: the CIA first took it for a collimation tower in line with the pad "
            "(1958) and then for a floodlight tower (1961). Its height and distance are theirs; its form, and where it stood "
            "between the tracks, are estimated."
        ),
    )
    x, y = TOWER
    steel, lamps = parts(g, "dark/tower"), parts(g, "lamp/floods", True)
    parts.mark(g, "lamp/floods", lens_out=1)
    base, crown, top = 1.3, 0.55, GROUND + TOWER_HEIGHT - 1.4

    def corner(i: int, z: float):
        half = base + (crown - base) * (z - GROUND) / (top - GROUND)
        sx, sy = ((1, 1), (-1, 1), (-1, -1), (1, -1))[i]
        return (x + sx * half, y + sy * half, z)

    n = 7 if fine() else 4
    levels = [GROUND + (top - GROUND) * (1 - (1 - k / n) ** 1.25) for k in range(n + 1)]
    lattice(steel, corner, levels, 0.12, 0.07)
    for i in range(4):  # footings
        cx, cy, _ = corner(i, GROUND)
        box(parts(g, "concrete/footings"), (cx - 0.35, cy - 0.35, -FOOTING), (cx + 0.35, cy + 0.35, GROUND + 0.25))
    # the head: a deck with a rail, and the floods on a bar toward the pad
    deck = parts(g, "deck")
    box(deck, (x - 1.0, y - 1.0, top), (x + 1.0, y + 1.0, top + 0.06))
    sitelib.handrail(
        parts(g, "dark/rail"),
        [
            (x - 0.95, y - 0.5, top + 0.06),
            (x - 0.95, y - 0.95, top + 0.06),
            (x + 0.95, y - 0.95, top + 0.06),
            (x + 0.95, y + 0.95, top + 0.06),
            (x - 0.95, y + 0.95, top + 0.06),
            (x - 0.95, y + 0.5, top + 0.06),
        ],
        height=1.1,
        post=0.04,
        rail=0.035,
    )
    beam(steel, (x + 0.9, y - 1.3, top + 1.3), (x + 0.9, y + 1.3, top + 1.3), 0.07)
    for dy in (-1.1, -0.37, 0.37, 1.1):
        sitelib.lamp_head(steel, lamps, (x + 1.05, y + dy, top + 1.3), (1.0, -dy * 0.12, -0.22), 0.3)
    for dy in (-1.3, 1.3):
        beam(steel, (x + 0.9, y + dy, top + 0.06), (x + 0.9, y + dy, top + 1.3), 0.06)
    # the ladder up its west side, to the gap in the rail
    parts.ladder(g, "up", (x - base - 0.12, y, GROUND), (x - crown - 0.5, y, top + 0.06), face=(1, 0, 0), mat="dark")


def build(parts: Parts) -> None:
    if stood(
        "Observation positions round the pit (nine)",
        since="1957",
        confidence="documented",
        source="HTA/JR-4/58 (August 1957); 'remain unchanged' in PIC/JR-2/60 (1959), the last photographs before the flight",
    ):
        posts(parts)
    if stood("Spoil heap north-east of the pit", since="1957", confidence="documented", source="HTA/JR-4/58 and PIC/JR-2/60 Figure 5; stands today"):
        heap(parts)
    if stood(
        "Cable conduit from the bunker to the launching structure",
        since="1959",
        confidence="documented",
        source="PIC/JR-2/60: built between the photographs of 1957 and 1959; today's channel follows its line",
    ):
        conduit(parts)
    if stood(
        "Floodlight tower west of the platform", since="1957", confidence="documented", source="HTA/JR-4/58; on Figure 5 of PIC/JR-2/60; PIC/JR-2/61"
    ):
        tower(parts)


def summary() -> str:
    return f"spoil heap {HEAP_HEIGHT:.0f} m, floodlight tower {TOWER_HEIGHT:.1f} m at {-TOWER[0]:.0f} m west, nine positions round the rim"
