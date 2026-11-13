"""The launching platform and the flame pit under it.

The platform is a slab 135 ft square with a round hole in its middle, standing out over the wide end
of the pit on four concrete pylons and resting along its west side on an abutment, where the tracks
come on at grade (PIC/JR-2/60 and PIC/JR-2/61 Figure 1: plan and front elevation, measured off U-2
photography of 1957 to 1959). Its north-east corner is carried 10 ft further out over the pit, for
one of the two tall masts (HTA/JR-4/58); its south-east corner is cut off. The pit is the hollow the
engines fired into: pear-shaped, its wide end under the platform and its point to the east, where its
floor comes back up to the steppe.

The pit's outline is today's (OpenStreetMap way 172441917, `flame_trench`), which agrees with the
880 by 550 ft the interpreters measured in 1957, with the cut that ran north from its rim toward the
bunker in 1959 put back (PIC/JR-2/60 Figure 5). Its section is not published. It is drawn from the
CIA's plan and front elevation: under the platform a slot between retaining walls 110 ft apart, its
floor 43 m down (site.PIT_DEPTH), with the flame deflector in it; east of the platform the pit's base,
60 ft wide between two trenches that run 60 ft to the sump, whose face stands 10 ft over them; outside
the slot two terraces up to the rim; and from the sump the floor climbing east to the pit's point, with
the road that came down it. See ../site-1.md.
"""

from __future__ import annotations

import math

from mathutils import geometry

from .site import (
    FENCE_IN,
    FT,
    GAUGE,
    GROUND,
    OPENING_R,
    PIT_DEPTH,
    PLATFORM,
    PLATFORM_T,
    PYLON_GAP,
    PYLON_LONG,
    PYLON_T,
    PYLON_Y,
    RAIL_TOP,
    P,
    Parts,
    box,
    fine,
    handrail,
)

# The pit's rim, metres east and north of the rocket's axis (OpenStreetMap, clockwise from the north-west corner). The
# six points from (-13.5, 78) to (4.5, 82) are not today's: they are the cut that ran north from the rim in 1959, which
# the old cable tray and the new conduit came out beside (PIC/JR-2/60 Figure 5, scaled: good to some five metres). It is
# filled today. Keep in step with src/viewer/tyuratam.ts (RIM).
RIM = [
    (-18, 59), (-15, 65.5), (-13.5, 78), (-10, 93), (-4.5, 108), (0, 114), (3.5, 108), (5, 96), (4.5, 82), (18, 89.5),
    (29.5, 92.5), (44, 91), (148.5, 62.5), (229.5, 24.5), (237.5, 16),
    (239, 1.5), (239, -10.5), (234.5, -15.5), (194.5, -21), (166, -31.5), (138.5, -51), (105, -69.5), (76, -83),
    (65, -92), (62.5, -92), (58.5, -86), (35, -86.5), (1.5, -85.5), (-10, -81.5), (-17, -74), (-24, -52), (-26, -23),
]  # fmt: skip
HALF = PLATFORM / 2
# The north-east corner's lip: 10 ft out over the pit (HTA/JR-4/58), and 8 ft along the north edge, its end rounded
# (the second scaled off PIC/JR-2/61 Figure 1: estimated)
LIP = (10.0 * FT, 8.0 * FT)
CHAMFER = 10.0 * FT  # the south-east corner, cut off this far along each edge (scaled off Figure 1; Figure 2 draws it too: estimated)
ABUTMENT = 25.0 * FT  # east-west, under the platform's west edge (PIC/JR-2/60)
# The section (estimated from PIC/JR-2/61 Figure 1, front elevation, and HTA/JR-4/58's "two terrace levels"): the
# sides fall 1 in 1 from the rim to an upper terrace 15 m down, 8 m wide, then to the lower terrace 30 m down.
TERRACES = [(0.0, 0.0), (15.0, 15.0), (23.0, 15.0), (38.0, 30.0)]  # (metres in from the rim, metres down)
LOWER = 30.0
ROUND = 3  # metres over which each break of the section is eased, either way (estimated)
# The slot: between retaining walls 110 ft apart (Figure 1 dimensions it across the pit base, both trenches and both
# shelves), from the abutment to where the floor has climbed to the lower terrace.
SLOT = 110.0 * FT / 2  # a retaining wall's inner face
WALL = 1.0  # its thickness, m (the CIA's figure is redacted: estimated)
# The pit base: "60 feet wide ... flanked by two concrete trenches ... 60 feet long and separated by a distance of at
# least 60 feet, [which] extend from the base of the launching structure to the two end compartments" of the sump
# (PIC/JR-2/60). A trench's outer side is on the line of the pylons' inner faces (PIC/JR-2/61: the north-east pylon's
# south side "appears to nearly coincide with the north side of the northernmost of the two trenches"), which makes it
# 17.5 ft wide (derived); its depth is redacted (estimated: Figure 1 draws it about as deep as it is wide).
PIT_BASE = 60.0 * FT
TRENCH_OUT = PYLON_Y - PYLON_T / 2
TRENCH_DEPTH = 15.0 * FT
SLOT_END = HALF + 60.0 * FT  # the sump's face
# The sump: 75 ft from west to east (PIC/JR-2/60), as wide as the slot (110 ft: Figure 1); its face "rises vertically
# from the top of the trenches for at least 10 feet" and its roof has an "upward slope from west to east" whose angle is
# redacted: the floor's own climb is taken for it.
SUMP = (75.0 * FT, 10.0 * FT)
SUMP_END = SLOT_END + SUMP[0]
CLIMB = 4.84  # the floor rises 1 m in this many east of the sump's face, so as to come up to the land at the pit's point (estimated)
WALL_END = SLOT_END + (PIT_DEPTH - SUMP[1] - LOWER) * CLIMB  # where the floor has come up to the lower terrace
DEEPEST = PIT_DEPTH + 0.5
# The road "from the raised eastern terminus ... to the base of the pit near the foot of the launching structure"
# (HTA/JR-4/58): down the middle of the floor, as far as the sump's roof. Its width and its surface are estimated.
ROAD_HALF = 3.0
# The flame deflector. Nobody photographed it from above: it is under the platform. A scale model of the pad as it was
# in 1957 (photographed by A. Zak, RussianSpaceWeb) has a curved chute from the back wall under the opening, down and out
# to the pit's floor between the two sides; the CIA saw "a curved flame deflector plate" being built in the same place at
# the second pad in 1959 and "no evidence to indicate it will protrude beyond the front of the launching structure". So:
# an arc from the abutment's face, DEFLECTOR_TOP under the deck (estimated, off the model), to the pit base at the
# platform's east edge, where it lies level; as wide as the slot.
DEFLECTOR_TOP = 16.0
DEFLECTOR_R = ((2 * HALF) ** 2 + (PIT_DEPTH - DEFLECTOR_TOP) ** 2) / (2 * (PIT_DEPTH - DEFLECTOR_TOP))  # the arc's radius (derived)
SKIRT, SKIRT_DOWN = 8.0, 0.25  # the skirt under the land outside the rim: its breadth and how far under the land, m
CELL = 2.0  # the pit's ground mesh, m (twice as coarse at a lower level of detail)
# A flangeway beside each running rail on the slab, on the gauge side: m wide from the rail's inner face, and deep
# (estimated: the usual; a wheel's flange is some 30 mm deep)
FLANGEWAY = (0.06, 0.045)


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


def _profile(d: float) -> float:
    for (d0, z0), (d1, z1) in zip(TERRACES, TERRACES[1:]):
        if d <= d1:
            return z0 + (z1 - z0) * (d - d0) / (d1 - d0)
    return LOWER


def _terraced(d: float) -> float:
    """How far down the side is `d` metres in from the rim: the profile with its breaks eased over ROUND metres either way
    (a slope worked in earth and gunite has no knife edge, and an edge eased over a few cells is not drawn as teeth where
    the grid crosses it aslant), and never deeper than the side's own 1 in 1 from the rim."""
    k = [i / 2 for i in range(-2 * ROUND, 2 * ROUND + 1)]
    return max(0.0, min(d, sum(_profile(d + o) for o in k) / len(k)))


def floor_depth(x: float) -> float:
    """How far under the deck the pit's floor is along its middle: the pit base as far as the sump's face, then the
    sump's roof and the floor beyond it, climbing east."""
    return PIT_DEPTH if x <= SLOT_END else max(0.0, PIT_DEPTH - SUMP[1] - (x - SLOT_END) / CLIMB)


def deflector_z(x: float) -> float:
    """The flame deflector's surface, metres from the deck: an arc that lies level on the pit base at the platform's
    east edge and has climbed to DEFLECTOR_TOP under the deck at the abutment's face."""
    run = max(0.0, min(HALF - x, DEFLECTOR_R - 0.01))
    return GROUND - PIT_DEPTH + DEFLECTOR_R - math.sqrt(DEFLECTOR_R**2 - run**2)


def in_slot(x: float, y: float) -> bool:
    return abs(y) <= SLOT and -HALF <= x <= WALL_END


def in_trench(x: float, y: float) -> bool:
    return HALF < x < SLOT_END and PIT_BASE / 2 < abs(y) < TRENCH_OUT


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


def _flat(mb, outline, holes, z: float, up: bool) -> None:
    """A level face over an outline with holes in it (each a list of (x, y)), facing up or down."""
    loops = [[P(x, y, z) for x, y in loop] for loop in (outline, *holes)]
    verts = [v for loop in loops for v in loop]
    for a, b, c in geometry.tessellate_polygon(loops):
        n = (verts[b] - verts[a]).cross(verts[c] - verts[a]).z
        if abs(n) < 1e-12:
            continue
        mb.add([verts[a], verts[b], verts[c]], [(0, 1, 2) if (n > 0) == up else (0, 2, 1)])


def flangeways(tracks) -> list[tuple[float, float, float, float]]:
    """The groove beside each running rail where it lies in the slab: (x0, x1, y0, y1). `tracks` are (the track's middle
    line y, where its rails end), as deck.py lays them; each rail's groove is on its gauge side and reaches 4 mm under
    the rail's head, which hides its edge."""
    out = []
    for y, x_end in tracks:
        for s in (-1, 1):
            face = y + s * GAUGE / 2
            lo, hi = sorted((face - s * FLANGEWAY[0], face + s * 0.004))
            out.append((-HALF + 0.03, x_end - 0.02, lo, hi))
    return out


def build(parts: Parts, tracks=()) -> None:
    """The platform and the pit. `tracks`: the tracks whose rails lie in the slab (see flangeways)."""
    parts.node("Platform")
    deck, edge = parts("Platform", "concrete"), parts("Platform", "concrete/pylons")
    # the slab: a square with its south-east corner cut off and the round hole through it; in its top, the flangeways
    n = 64
    ring = [(OPENING_R * math.cos(math.tau * k / n), OPENING_R * math.sin(math.tau * k / n)) for k in range(n)]
    outline = [(-HALF, -HALF), (HALF - CHAMFER, -HALF), (HALF, -HALF + CHAMFER), (HALF, HALF), (-HALF, HALF)]
    z0, z1 = -PLATFORM_T, 0.0
    grooves = flangeways(tracks)
    _flat(deck, outline, [ring, *[[(xa, ya), (xb, ya), (xb, yb), (xa, yb)] for xa, xb, ya, yb in grooves]], z1, True)
    _flat(deck, outline, [ring], z0, False)
    for xa, xb, ya, yb in grooves:  # a groove's floor and its four sides
        zf = -FLANGEWAY[1]
        deck.add([P(xa, ya, zf), P(xb, ya, zf), P(xb, yb, zf), P(xa, yb, zf)], [(0, 1, 2, 3)])
        for (ax, ay), (bx, by) in (((xa, yb), (xb, yb)), ((xb, yb), (xb, ya)), ((xb, ya), (xa, ya)), ((xa, ya), (xa, yb))):
            deck.add([P(ax, ay, zf), P(bx, by, zf), P(bx, by, z1), P(ax, ay, z1)], [(0, 1, 2, 3)])
    for k in range(n):
        a, b = ring[k], ring[(k + 1) % n]
        deck.add([P(*a, z0), P(*b, z0), P(*b, z1), P(*a, z1)], [(3, 2, 1, 0)])  # the hole's wall
    for a, b in zip(outline, outline[1:] + outline[:1]):
        deck.add([P(*a, z0), P(*b, z0), P(*b, z1), P(*a, z1)], [(0, 1, 2, 3)])  # the slab's edge
    # the lip at the north-east corner, butted to the slab's edge, that one of the two tall masts stands on: its end rounded
    r = LIP[1] / 2
    cx, cy = HALF + LIP[0] - r, HALF - r
    end = [(cx + r * math.cos(a), cy + r * math.sin(a)) for a in (math.pi * (-0.5 + k / 8) for k in range(9))]
    lip = [(HALF, HALF - LIP[1]), *end, (HALF, HALF)]
    _flat(deck, lip, [], z1, True)
    _flat(deck, lip, [], z0, False)
    for a, b in zip(lip, lip[1:]):
        deck.add([P(*a, z0), P(*b, z0), P(*b, z1), P(*a, z1)], [(0, 1, 2, 3)])
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
    road = parts("FlamePit", "road", True)
    cell = CELL if fine() else 2 * CELL
    xs = _lines(-40.0, 248.0, [-HALF - 0.3, -HALF, HALF, SLOT_END, SUMP_END, WALL_END], cell)
    ys = _lines(-104.0, 126.0, [s * v for s in (-1, 1) for v in (SLOT + WALL, SLOT, TRENCH_OUT, PIT_BASE / 2, ROAD_HALF)], cell)
    z = [[pit_z(x, y) for y in ys] for x in xs]
    # (a cell is left out only if it lies wholly outside the skirt: all its corners further out than its own breadth)
    out = [[to_rim(x, y) < -SKIRT - 1.5 * cell for y in ys] for x in xs]
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            if out[i][j] and out[i + 1][j] and out[i + 1][j + 1] and out[i][j + 1]:
                continue  # wholly outside the rim: the land's
            zz = (z[i][j], z[i + 1][j], z[i + 1][j + 1], z[i][j + 1])
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            # what is built of its own below: the deflector, the two trenches, the sump
            if abs(cy) < SLOT and (-HALF < cx < HALF or SLOT_END < cx < SUMP_END):
                continue
            if in_trench(cx, cy):
                continue
            # the road down the middle of the floor; concrete where the interpreters and the 1957 photograph show it: the
            # slot and the gunited west part; blackened along the slot the flame ran down; bare clay beyond
            if abs(cy) < ROAD_HALF and cx > SUMP_END:
                mb = road
            elif in_slot(cx, cy):
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
    base = GROUND - PIT_DEPTH
    # the two trenches beside the pit base: each a floor and three sides, and at its east end the dark of the sump's end
    # compartment, which it runs on into (what was in the sump is not recorded)
    conc, dark = parts("FlamePit", "lining/trenches"), parts("FlamePit", "void")
    zt = base - TRENCH_DEPTH
    for s in (-1, 1):
        ya, yb = sorted((s * PIT_BASE / 2, s * TRENCH_OUT))
        conc.add([P(HALF, ya, zt), P(SLOT_END, ya, zt), P(SLOT_END, yb, zt), P(HALF, yb, zt)], [(0, 1, 2, 3)])
        conc.add([P(HALF, ya, zt), P(HALF, yb, zt), P(HALF, yb, base), P(HALF, ya, base)], [(0, 1, 2, 3)])
        conc.add([P(HALF, ya, zt), P(SLOT_END, ya, zt), P(SLOT_END, ya, base), P(HALF, ya, base)], [(3, 2, 1, 0)])
        conc.add([P(HALF, yb, zt), P(SLOT_END, yb, zt), P(SLOT_END, yb, base), P(HALF, yb, base)], [(0, 1, 2, 3)])
        dark.add([P(SLOT_END, ya, zt), P(SLOT_END, yb, zt), P(SLOT_END, yb, base), P(SLOT_END, ya, base)], [(3, 2, 1, 0)])
        # a ladder out of each, on its side by the pit base (not recorded: a way out of a trench three men deep)
        x = SLOT_END - 2.0
        parts.ladder(
            "FlamePit",
            f"trench_{'north' if s > 0 else 'south'}",
            (x, s * (PIT_BASE / 2 + 0.1), zt),
            (x, s * (PIT_BASE / 2 + 0.1), base),
            face=(0, -s, 0),
            mat="galv",
        )
    # the sump: its face over the pit base and the trenches, and its roof, which is the floor from there on
    sump = parts("FlamePit", "scorch/sump")
    half = SLOT + 0.3
    top = base + SUMP[1]
    sump.add([P(SLOT_END, -half, base), P(SLOT_END, half, base), P(SLOT_END, half, top), P(SLOT_END, -half, top)], [(3, 2, 1, 0)])
    far = GROUND - floor_depth(SUMP_END)
    sump.add([P(SLOT_END, -half, top), P(SUMP_END, -half, far), P(SUMP_END, half, far), P(SLOT_END, half, top)], [(0, 1, 2, 3)])
    # the ladder up its face, on the south shelf, out of the flame's way (not recorded: the way from the road's end to the pit base)
    y = -(TRENCH_OUT + SLOT) / 2
    parts.ladder("FlamePit", "sump", (SLOT_END - 0.1, y, base), (SLOT_END - 0.1, y, top), face=(1, 0, 0), mat="galv")

    # the flame deflector: the chute under the opening, from the abutment's face to the pit base, wall to wall
    parts.node("FlameDeflector")
    chute = parts("FlameDeflector", "scorch", True)
    step = 1.0 if fine() else 2.5
    count = round((2 * HALF + 0.3) / step)
    xc = [-HALF - 0.3 + (2 * HALF + 0.3) * k / count for k in range(count + 1)]
    for xa, xb in zip(xc, xc[1:]):
        za, zb = deflector_z(xa), deflector_z(xb)
        chute.add([P(xa, -half, za), P(xb, -half, zb), P(xb, half, zb), P(xa, half, za)], [(0, 1, 2, 3)])


def summary() -> str:
    return (
        f"platform {PLATFORM:.2f} m square ({PLATFORM / FT:.0f} ft), hole {OPENING_R * 2:.2f} m, pit {PIT_DEPTH:.0f} m deep, "
        f"deflector from {DEFLECTOR_TOP:.0f} m under the deck on an arc of {DEFLECTOR_R:.1f} m, "
        f"trenches {(TRENCH_OUT - PIT_BASE / 2) / FT:.1f} ft wide, "
        f"sump's face {SUMP[1] / FT:.0f} ft, rails {RAIL_TOP * 1000:.0f} mm proud"
    )
