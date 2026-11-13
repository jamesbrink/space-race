"""The launching platform and the flame pit under it.

The platform is a slab 135 ft square with a round hole in its middle, standing out over the wide end
of the pit on four concrete pylons and resting along its west side on an abutment, where the tracks
come on at grade (PIC/JR-2/60 and PIC/JR-2/61 Figure 1: plan and front elevation, measured off U-2
photography of 1957 to 1959). Its north-east corner is carried 10 ft further out over the pit, for
one of the two tall masts (HTA/JR-4/58). The pit is the hollow the engines fired into: pear-shaped,
its wide end under the platform and its point to the east, where its floor comes back up to the steppe.

The pit's outline is today's (OpenStreetMap way 172441917, `flame_trench`), which agrees with the
880 by 550 ft the interpreters measured in 1957. Its section is not published. It is drawn from the
CIA's front elevation: under the platform a slot between retaining walls on the pylons' lines, its
floor 43 m down (site.PIT_DEPTH); outside the slot two terraces up to the rim; east of the platform
the floor climbing to the pit's point, as the road into it did. See ../site-1.md.
"""

from __future__ import annotations

import math

from .site import (
    FENCE_IN,
    FT,
    GROUND,
    OPENING_R,
    PIT_DEPTH,
    PLATFORM,
    PLATFORM_T,
    PYLON_GAP,
    PYLON_LONG,
    PYLON_T,
    PYLON_Y,
    P,
    Parts,
    box,
    fine,
    handrail,
)

# The pit's rim, metres east and north of the rocket's axis (OpenStreetMap, clockwise from the north-west corner).
RIM = [
    (-18, 59), (-15, 65.5), (-6, 76), (18, 89.5), (29.5, 92.5), (44, 91), (148.5, 62.5), (229.5, 24.5), (237.5, 16),
    (239, 1.5), (239, -10.5), (234.5, -15.5), (194.5, -21), (166, -31.5), (138.5, -51), (105, -69.5), (76, -83),
    (65, -92), (62.5, -92), (58.5, -86), (35, -86.5), (1.5, -85.5), (-10, -81.5), (-17, -74), (-24, -52), (-26, -23),
]  # fmt: skip
HALF = PLATFORM / 2
LIP = (10.0 * FT, 16.0 * FT)  # the north-east corner's lip: out over the pit, and along the north edge (the second estimated)
ABUTMENT = 25.0 * FT  # east-west, under the platform's west edge (PIC/JR-2/60)
# The section (estimated from PIC/JR-2/61 Figure 1, front elevation, and HTA/JR-4/58's "two terrace levels"): the
# sides fall 1 in 1 from the rim to an upper terrace 15 m down, 8 m wide, then to the lower terrace 30 m down. The slot
# between the retaining walls runs from the abutment to 60 ft past the platform (the "pit base" of Figure 1's plan) at
# the full depth, and the floor then climbs east at 1 in 4.5 to the pit's point.
TERRACES = [(0.0, 0.0), (15.0, 15.0), (23.0, 15.0), (38.0, 30.0)]  # (metres in from the rim, metres down)
LOWER = 30.0
SLOT = PYLON_Y - PYLON_T / 2 + 0.3  # the retaining wall's inner face, 0.3 m behind the pylons' inner faces
WALL = 1.0  # its thickness
SLOT_END = HALF + 60.0 * FT
CLIMB = 4.5  # the floor rises 1 m in this many east of SLOT_END
WALL_END = SLOT_END + (PIT_DEPTH - LOWER) * CLIMB  # where the floor has come up to the lower terrace
DEEPEST = PIT_DEPTH + 0.5
SKIRT, SKIRT_DOWN = 8.0, 0.25  # the skirt under the land outside the rim: its breadth and how far under the land, m
CELL = 2.0  # the pit's ground mesh, m (twice as coarse at a lower level of detail)


def _inside(x: float, y: float) -> bool:
    odd = False
    for (ax, ay), (bx, by) in zip(RIM, RIM[1:] + RIM[:1]):
        if (ay > y) != (by > y) and x < ax + (bx - ax) * (y - ay) / (by - ay):
            odd = not odd
    return odd


def to_rim(x: float, y: float) -> float:
    """How far a point is inside the rim, m (negative outside it)."""
    best = 1e9
    for (ax, ay), (bx, by) in zip(RIM, RIM[1:] + RIM[:1]):
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        best = min(best, math.hypot(x - ax - t * dx, y - ay - t * dy))
    return best if _inside(x, y) else -best


def _terraced(d: float) -> float:
    for (d0, z0), (d1, z1) in zip(TERRACES, TERRACES[1:]):
        if d <= d1:
            return z0 + (z1 - z0) * (d - d0) / (d1 - d0)
    return LOWER


def floor_depth(x: float) -> float:
    return PIT_DEPTH if x <= SLOT_END else max(0.0, PIT_DEPTH - (x - SLOT_END) / CLIMB)


def in_slot(x: float, y: float) -> bool:
    return abs(y) <= SLOT and -HALF <= x <= WALL_END


def pit_z(x: float, y: float) -> float:
    """The pit's surface, metres from the deck. At the rim it is the land's own height (GROUND). Outside it a skirt runs
    on under the land, a hand's breadth below it for SKIRT metres and then down into the ground: the land is cut away a
    little inside the rim (viewer/tyuratam.ts: OVERLAP), and a line of sight that passes under the land's cut edge, out
    of the pit, meets this and not the sky."""
    d = to_rim(x, y)
    if in_slot(x, y):
        return GROUND - floor_depth(x)
    if d < 0:
        return GROUND - SKIRT_DOWN - min(1.25, max(0.0, -d - SKIRT))
    return GROUND - min(_terraced(d), floor_depth(x))


def _lines(lo: float, hi: float, extra, cell: float) -> list[float]:
    """A grid's lines every `cell` metres from lo to hi, with the given ones put in (the walls' faces, so that no cell's slope
    shows outside a wall) and any line within 0.5 m of one of those taken out."""
    keep = sorted(e for e in extra if lo < e < hi)
    base = [lo + cell * i for i in range(int((hi - lo) / cell) + 1)]
    return sorted([v for v in base if all(abs(v - e) > 0.5 for e in keep)] + keep)


def build(parts: Parts) -> None:
    parts.node("Platform")
    deck, edge = parts("Platform", "concrete"), parts("Platform", "concrete/pylons")
    # the slab: a square with the round hole through it
    n = 64
    ring, square = [], []
    for k in range(n):
        a = math.tau * k / n
        c, s = math.cos(a), math.sin(a)
        ring.append((OPENING_R * c, OPENING_R * s))
        f = HALF / max(abs(c), abs(s))
        square.append((f * c, f * s))
    z0, z1 = -PLATFORM_T, 0.0
    for k in range(n):
        j = (k + 1) % n
        a, b, c, d = ring[k], ring[j], square[j], square[k]
        # (round the hole anticlockwise, then out to the edge: the top's corners in that order go round clockwise from above)
        deck.add([P(*a, z1), P(*b, z1), P(*c, z1), P(*d, z1)], [(3, 2, 1, 0)])
        deck.add([P(*a, z0), P(*b, z0), P(*c, z0), P(*d, z0)], [(0, 1, 2, 3)])
        deck.add([P(*a, z0), P(*b, z0), P(*b, z1), P(*a, z1)], [(3, 2, 1, 0)])  # the hole's wall
        deck.add([P(*d, z0), P(*c, z0), P(*c, z1), P(*d, z1)], [(0, 1, 2, 3)])  # the slab's edge
    # the lip at the north-east corner, butted to the slab's edge, that one of the two tall masts stands on
    box(deck, (HALF, HALF - LIP[1], z0), (HALF + LIP[0], HALF, z1))
    # the four pylons, two under each side, down through the pit's floor; their tops are in the slab
    for sy in (-1, 1):
        for sx in (-1, 1):
            x0 = sx * PYLON_GAP / 2
            x1 = x0 + sx * PYLON_LONG
            y = sy * PYLON_Y
            box(edge, (min(x0, x1), y - PYLON_T / 2, -DEEPEST), (max(x0, x1), y + PYLON_T / 2, z0 + 0.5))
    # the abutment the platform's west side rests on, faced in concrete down to the pit's floor
    box(edge, (-HALF - ABUTMENT, -HALF, -DEEPEST), (-HALF, HALF, -0.03))
    # the retaining walls either side of the slot: up into the slab under the platform, to the lower terrace beyond it
    for s in (-1, 1):
        y0, y1 = sorted((s * SLOT, s * (SLOT + WALL)))
        box(edge, (-HALF + 0.01, y0, -DEEPEST + 0.2), (HALF - 0.01, y1, z0 + 0.4))
        box(edge, (HALF + 0.01, y0, -DEEPEST + 0.2), (WALL_END, y1, GROUND - LOWER + 0.15))
    # the low fence on the three sides that overhang, set in 15 ft (PIC/JR-2/61): posts and two rails
    rail = parts("Platform", "galv")
    f = HALF - FENCE_IN
    handrail(rail, [(-HALF, f, 0.0), (f, f, 0.0), (f, -f, 0.0), (-HALF, -f, 0.0)], height=1.1, post=0.05, rail=0.04)

    # the pit: its own ground, from just outside the rim to the floor
    parts.node("FlamePit")
    lining, scorch, earth = parts("FlamePit", "lining", True), parts("FlamePit", "scorch", True), parts("FlamePit", "earth", True)
    cell = CELL if fine() else 2 * CELL
    xs = _lines(-40.0, 248.0, [-HALF - 0.3, -HALF, WALL_END], cell)
    ys = _lines(-104.0, 104.0, [-SLOT - WALL, -SLOT, SLOT, SLOT + WALL], cell)
    z = [[pit_z(x, y) for y in ys] for x in xs]
    # (a cell is left out only if it lies wholly outside the skirt: all its corners further out than its own breadth)
    out = [[to_rim(x, y) < -SKIRT - 1.5 * cell for y in ys] for x in xs]
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            if out[i][j] and out[i + 1][j] and out[i + 1][j + 1] and out[i][j + 1]:
                continue  # wholly outside the rim: the land's
            zz = (z[i][j], z[i + 1][j], z[i + 1][j + 1], z[i][j + 1])
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            # concrete where the interpreters and the 1957 photograph show it: the slot and the gunited west part;
            # blackened along the slot the flame ran down; bare clay beyond
            if in_slot(cx, cy) and cx < 150.0:
                mb = scorch
            elif cx < 70.0:
                mb = lining
            else:
                mb = earth
            # each cell is cut along whichever diagonal lies nearer the ground at its middle, so that a terrace's edge
            # crossing the grid aslant is followed and not drawn as a row of teeth
            mid = pit_z(cx, cy)
            along_02 = abs((zz[0] + zz[2]) / 2 - mid) <= abs((zz[1] + zz[3]) / 2 - mid)
            mb.add(
                [P(xs[i], ys[j], zz[0]), P(xs[i + 1], ys[j], zz[1]), P(xs[i + 1], ys[j + 1], zz[2]), P(xs[i], ys[j + 1], zz[3])],
                [(0, 1, 2), (0, 2, 3)] if along_02 else [(0, 1, 3), (1, 2, 3)],
            )


def summary() -> str:
    return f"platform {PLATFORM:.2f} m square ({PLATFORM / FT:.0f} ft), hole {OPENING_R * 2:.2f} m, pit {PIT_DEPTH:.0f} m deep"
