"""Launch Complex 5, Cape Canaveral, as configured for Mercury-Redstone at about T-55 minutes:
service structure withdrawn to the edge of the pad, cherry picker's cab at the capsule hatch.

Dimensions are feet. The origin is the pad centre at ground level; +X is the side the capsule
hatch faces, and the service structure's rails run along X. See ./lc-5.md: almost nothing here
is a published dimension. The layout follows NASA TM X-53107 Figures 7-5 to 7-8; sizes are
scaled off those photographs against the 83.38 ft vehicle.

Top-level nodes: Hardstand  LaunchPedestal  UmbilicalMast  ServiceStructure  CherryPicker  Floodlights
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from srlib import FT, TAU, MeshBuilder, group, material

PEDESTAL_TOP = 6.0        # the vehicle's fin trailing edges rest here
HARDSTAND = 204.0         # square, side: Figure 7-6 scaled on the 535 ft between pads 5 and 6; pad 6's is given as 203 ft
RAIL_GAUGE = 28.0
# How far the concrete and track bed go down. The viewer's ground is half a metre under the pad
# surface (two parallel surfaces centimetres apart flicker at a distance), so they must go deeper.
FOOTING = 3.0
STRUCTURE_X = -78.0       # service structure centre at the edge of the pad (T-55 min)
LAUNCH_POSITION_X = -195.0   # where it is driven to by remote control at T-8:45 (scaled off Figure 7-6)
STRUCTURE_TOP = 118.0     # top of the tower, under the crane
HATCH_HEIGHT = 68.4       # capsule hatch centre above ground, vehicle on the pedestal
LEVELS = (22.0, 42.0, 62.5, 79.0, 94.0)   # work platforms; the third is the white room
CHERRY_REACH = 125.0      # documented: the mobile tower could reach 125 ft


def P(x: float, y: float, z: float) -> Vector:
    return Vector((x, y, z)) * FT


def materials() -> dict:
    m = material
    return {
        "concrete": m("concrete", (0.46, 0.45, 0.42), 0.0, 0.9),
        "joint": m("concrete-joint", (0.07, 0.07, 0.065), 0.0, 1.0),
        "ballast": m("ballast-gravel", (0.22, 0.21, 0.19), 0.0, 1.0),
        "rail": m("steel-rail", (0.30, 0.25, 0.21), 1.0, 0.55),
        "red": m("paint-structure-red", (0.42, 0.045, 0.03), 0.0, 0.55),
        "white": m("paint-structure-white", (0.78, 0.78, 0.75), 0.0, 0.5),
        "grey": m("paint-structure-grey", (0.25, 0.27, 0.28), 0.1, 0.6),
        "deck": m("galvanised-deck", (0.42, 0.43, 0.44), 0.9, 0.6),
        "scorched": m("steel-scorched", (0.085, 0.075, 0.07), 0.8, 0.7),
        "glass": m("glass", (0.02, 0.03, 0.04), 0.0, 0.05),
        "tyre": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "yellow": m("paint-vehicle-yellow", (0.62, 0.42, 0.03), 0.0, 0.5),
        "lamp": m("lamp", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.6),
        "cable": m("cable", (0.03, 0.03, 0.03), 0.0, 0.7),
    }


# ------------------------------------------------------------------------ helpers


def box(mb: MeshBuilder, lo, hi) -> None:
    """Axis-aligned box from corner to corner, feet."""
    lo, hi = Vector(lo), Vector(hi)
    mb.box(tuple((hi - lo) * FT), Matrix.Translation((lo + hi) / 2 * FT))


def beam(mb: MeshBuilder, a, b, width: float) -> None:
    """A square steel member between two points, feet."""
    mb.tube(P(*a), P(*b), width / math.sqrt(2) * FT, 4, caps=True)


def lattice(mb: MeshBuilder, corner, levels, col: float, brace: float, faces=(0, 1, 2, 3)) -> None:
    """A four-legged truss tower. corner(i, z) gives leg i's position at height z."""
    for i in range(4):
        beam(mb, corner(i, levels[0]), corner(i, levels[-1]), col)
    for z0, z1 in zip(levels, levels[1:]):
        for i in faces:
            j = (i + 1) % 4
            beam(mb, corner(i, z1), corner(j, z1), brace)
            beam(mb, corner(i, z0), corner(j, z1), brace * 0.8)
            beam(mb, corner(j, z0), corner(i, z1), brace * 0.8)


def handrail(mb: MeshBuilder, pts, height: float = 3.5) -> None:
    """Posts and two rails along a polyline of deck-level points."""
    for seg, (a, b) in enumerate(zip(pts, pts[1:])):
        a, b = Vector(a), Vector(b)
        n = max(1, round((b - a).length / 5.0))
        for k in range(1 if seg else 0, n + 1):   # a corner post belongs to the run before it
            p = a + (b - a) * k / n
            beam(mb, p, p + Vector((0, 0, height)), 0.16)
        for h in (height, height * 0.5):
            beam(mb, a + Vector((0, 0, h)), b + Vector((0, 0, h)), 0.13)


def wheel(mb: MeshBuilder, centre, radius: float, width: float, axis=(0, 1, 0)) -> None:
    c, ax = Vector(centre), Vector(axis).normalized()
    mb.tube((c - ax * width / 2) * FT, (c + ax * width / 2) * FT, radius * FT, 20)


# -------------------------------------------------------------------------- parts


def build_hardstand(M) -> None:
    g = group("Hardstand")
    slabs, joints, steel, gravel, rails = (MeshBuilder() for _ in range(5))
    n, half = 10, HARDSTAND / 2
    size = HARDSTAND / n
    for i in range(n):
        for j in range(n):
            x0, y0 = -half + i * size, -half + j * size
            box(slabs, (x0 + 0.06, y0 + 0.06, -FOOTING), (x0 + size - 0.06, y0 + size - 0.06, 0.0))
    box(joints, (-half, -half, -FOOTING - 0.1), (half, half, -0.12))
    # steel blast plate under the pedestal, scorched by the launches before this one
    box(steel, (-9, -9, 0.0), (9, 9, 0.12))
    # the service structure's track: two rails on a ballasted bed running off the hardstand
    for y in (-RAIL_GAUGE / 2, RAIL_GAUGE / 2):
        box(gravel, (-232, y - 3.0, -FOOTING), (-half - 0.2, y + 3.0, -0.05))
        box(rails, (-230, y - 0.12, 0.0), (22, y + 0.12, 0.5))
        box(rails, (-229.8, y - 0.3, 0.0), (21.8, y + 0.3, 0.08))   # foot, ending short of the web
        for k in range(27):   # ties, off the hardstand
            x = -half - 2.0 - k * 4.7
            box(gravel, (x - 0.4, y - 2.6, -0.2), (x + 0.4, y + 2.6, 0.02))
    slabs.build("Hardstand_Slabs", M["concrete"], g, smooth=False)
    joints.build("Hardstand_Joints", M["joint"], g, smooth=False)
    steel.build("Hardstand_BlastPlate", M["scorched"], g, smooth=False)
    gravel.build("Hardstand_TrackBed", M["ballast"], g, smooth=False)
    rails.build("Hardstand_Rails", M["rail"], g, smooth=False)


def build_pedestal(M) -> None:
    """The launcher: a ring on four legs over a flame deflector. Nothing holds the vehicle down;
    it stands on the ring under its own weight and leaves when thrust exceeds it."""
    g = group("LaunchPedestal")
    ring, frame, defl = MeshBuilder(), MeshBuilder(), MeshBuilder()
    z1 = PEDESTAL_TOP
    prof = [(1.95, z1 - 0.8), (3.7, z1 - 0.8), (3.7, z1 - 0.02), (1.95, z1 - 0.02), (1.95, z1 - 0.8)]
    ring.lathe([(r * FT, z * FT) for r, z in prof], 64)
    for i in range(4):
        t = TAU * i / 4
        c, s = math.cos(t), math.sin(t)
        beam(frame, (3.2 * c, 3.2 * s, z1 - 0.7), (5.6 * c, 5.6 * s, 0.25), 0.7)
        box(frame, (5.6 * c - 0.9, 5.6 * s - 0.9, 0.12), (5.6 * c + 0.9, 5.6 * s + 0.9, 0.3))
        t2 = TAU * (i + 1) / 4
        beam(frame, (4.4 * c, 4.4 * s, 2.7), (4.4 * math.cos(t2), 4.4 * math.sin(t2), 2.7), 0.35)
        # the four pads the tail's ring frame sits on, under the fin roots
        tf = t + TAU / 8
        box(ring, (3.0 * math.cos(tf) - 0.35, 3.0 * math.sin(tf) - 0.35, z1 - 0.4), (3.0 * math.cos(tf) + 0.35, 3.0 * math.sin(tf) + 0.35, z1))
    # four-sided deflector: splits the exhaust sideways, away from the legs
    apex, base, h = Vector((0, 0, 3.6)), 2.9, 0.14
    corners = [Vector((base * math.cos(TAU * (i + 0.5) / 4), base * math.sin(TAU * (i + 0.5) / 4), h)) for i in range(4)]
    for i in range(4):
        a, b = corners[i], corners[(i + 1) % 4]
        defl.add([tuple(a * FT), tuple(b * FT), tuple(apex * FT)], [(0, 1, 2)])
    ring.build("Pedestal_Ring", M["grey"], g, sharp_angle=30)
    frame.build("Pedestal_Legs", M["grey"], g, smooth=False)
    defl.build("Pedestal_FlameDeflector", M["scorched"], g, smooth=False)


def build_umbilical_mast(M) -> None:
    """Cable mast No. 2, carrying the capsule's umbilical. (No. 1, for the booster, is not modelled.)
    The umbilical dropped at about T-35 s and the boom fell away just before ignition."""
    g = group("UmbilicalMast")
    mast, cable = MeshBuilder(), MeshBuilder()
    cy, top, w = -11.0, 66.0, 0.75
    corner = lambda i, z: (-1.5 + w * (1 if i in (0, 3) else -1), cy + w * (1 if i < 2 else -1), z)   # noqa: E731
    lattice(mast, corner, [0.3 + k * (top - 0.3) / 12 for k in range(13)], 0.22, 0.14)
    box(mast, (-3.2, cy - 1.7, 0.0), (0.2, cy + 1.7, 0.3))
    beam(mast, (-1.5, cy, top - 0.6), (-1.5, -3.4, top - 0.6), 0.3)       # arm to the capsule
    # the umbilical drooping from the arm to the receptacle low on the capsule's cone
    path = [(-1.5, -3.6, top - 0.7), (-1.2, -3.3, top - 1.6), (-0.6, -3.15, top - 1.4), (-0.1, -3.05, top - 0.75)]
    cable.loft([P(*p) for p in path], [(0.11 * FT, 0.11 * FT)] * len(path), 8, ref=(1, 0, 0))
    mast.build("Mast_Truss", M["grey"], g, smooth=False)
    cable.build("Mast_Umbilical", M["cable"], g)


def build_service_structure(M) -> None:
    """The gantry: built for Redstone and Jupiter, it rolls on rails under its own power and
    serves pads 5 and 6. For Mercury it gained a remote control, an enclosed, air-conditioned
    white room at capsule level (level 3), and a blast deflector against the escape rocket."""
    g = group("ServiceStructure")
    red, white, deck, glass, dark = (MeshBuilder() for _ in range(5))
    cx = STRUCTURE_X
    half_y = RAIL_GAUGE / 2

    def corner(i: int, z: float):
        # legs splay from the rails to a narrow tower by 58 ft, then run straight up
        k = min(1.0, max(0.0, (z - 3.0) / 55.0))
        hx, hy = 13.0 + (5.0 - 13.0) * k, half_y + (6.5 - half_y) * k
        return (cx + hx * (1 if i in (0, 3) else -1), hy * (1 if i < 2 else -1), z)

    levels = [3.0, 14.0, 26.0, 38.0, 48.0, 58.0, 70.0, 82.0, 94.0, 106.0, STRUCTURE_TOP]
    lattice(red, corner, levels, 1.1, 0.5)
    # bogies on the rails
    for sy in (-1, 1):
        for sx in (-1, 1):
            bx, by = cx + sx * 13.0, sy * half_y
            box(dark, (bx - 4.0, by - 1.1, 1.2), (bx + 4.0, by + 1.1, 3.2))
            for dx in (-2.4, 2.4):
                wheel(dark, (bx + dx, by, 1.5), 1.0, 0.7)
        box(red, (cx - 14.0, sy * half_y - 0.9, 2.8), (cx + 14.0, sy * half_y + 0.9, 4.4))
    for sx in (-1, 1):
        box(red, (cx + sx * 13.0 - 0.8, -half_y, 3.1), (cx + sx * 13.0 + 0.8, half_y, 4.3))

    # work platforms reach out over the pad from the tower's front face
    reach = 21.0
    for n, z in enumerate(LEVELS):
        x0 = corner(0, z)[0] - 0.4
        hy = 10.5 if n != 2 else 11.5
        box(deck, (x0, -hy, z - 0.45), (x0 + reach, hy, z))
        for y in (-hy + 0.6, 0.0, hy - 0.6):   # cantilever beams and their struts back to the tower
            box(red, (x0 - 3.0, y - 0.35, z - 1.6), (x0 + reach - 0.5, y + 0.35, z - 0.5))
            beam(red, (x0 + reach - 3.0, y, z - 1.2), (x0 - 0.2, y, z - 11.0), 0.45)
        if n != 2:
            handrail(white, [(x0 + 0.3, -hy + 0.3, z), (x0 + reach - 0.3, -hy + 0.3, z), (x0 + reach - 0.3, hy - 0.3, z), (x0 + 0.3, hy - 0.3, z)])
    # level 3 white room: wind panels and windows round the capsule's work area
    z = LEVELS[2]
    x0 = corner(0, z)[0] - 0.4
    xa, xb, hy, zt = x0 + 1.0, x0 + reach - 0.6, 10.9, z + 12.0
    for y0, y1 in ((-hy, -hy + 0.35), (hy - 0.35, hy)):
        box(white, (xa, y0, z + 0.02), (xb, y1, zt))
    box(white, (xa, -hy + 0.4, z + 0.02), (xa + 0.35, hy - 0.4, zt))
    box(white, (xa - 0.3, -hy - 0.3, zt - 0.15), (xb + 0.3, hy + 0.3, zt + 0.5))               # roof, lapping the walls
    for sy in (-1, 1):   # the open front is closed by two leaves that part round the capsule
        box(white, (xb - 0.4, sy * 3.2, z + 0.02), (xb - 0.05, sy * (hy - 0.4), zt))
        for k in range(4):   # a band of windows down each side
            xw = xa + 2.0 + k * 4.4
            box(glass, (xw, sy * (hy + 0.04) - 0.03, z + 4.5), (xw + 3.4, sy * (hy + 0.04) + 0.03, z + 8.5))
    # elevator up the back face, and the hammerhead crane on top
    ex = corner(1, 60)[0] - 4.8
    lattice(red, lambda i, zz: (ex + 2.6 * (1 if i in (0, 3) else -1), 3.0 * (1 if i < 2 else -1), zz),
            [4.5 + k * 11.0 for k in range(10)], 0.4, 0.25)
    box(white, (ex - 2.2, -2.6, 30.0), (ex + 2.2, 2.6, 38.5))
    zc = STRUCTURE_TOP
    box(red, (cx - 7.0, -7.5, zc), (cx + 7.0, 7.5, zc + 1.2))
    jib = lambda i, x: (x, 2.2 * (1 if i < 2 else -1), zc + 1.2 + (5.0 if i in (0, 3) else 0.0))   # noqa: E731
    xs = [cx - 20.0 + k * 6.0 for k in range(11)]
    for i in range(4):
        beam(red, jib(i, xs[0]), jib(i, xs[-1]), 0.5)
    for xa_, xb_ in zip(xs, xs[1:]):
        for i in range(4):
            j = (i + 1) % 4
            beam(red, jib(i, xb_), jib(j, xb_), 0.3)
            beam(red, jib(i, xa_), jib(j, xb_), 0.26)
    box(white, (cx - 16.0, -3.4, zc + 1.4), (cx - 8.0, 3.4, zc + 8.4))                          # machinery house
    box(dark, (xs[-2] - 1.5, -1.6, zc - 0.1), (xs[-2] + 1.5, 1.6, zc + 1.0))                    # trolley
    beam(dark, (xs[-2], 0, zc - 0.1), (xs[-2], 0, zc - 14.0), 0.1)
    box(dark, (xs[-2] - 0.5, -0.5, zc - 15.6), (xs[-2] + 0.5, 0.5, zc - 14.0))

    red.build("Structure_Frame", M["red"], g, smooth=False)
    white.build("Structure_WhiteRoomAndRails", M["white"], g, smooth=False)
    deck.build("Structure_Decks", M["deck"], g, smooth=False)
    glass.build("Structure_Windows", M["glass"], g, smooth=False)
    dark.build("Structure_RunningGear", M["grey"], g, sharp_angle=30)


def build_cherry_picker(M) -> None:
    """The mobile aerial tower: once the structure rolled back, its cab stood at the hatch so
    the pilot could step out and be swung clear. It could reach 125 ft, and could be lowered
    by remote control from the blockhouse. It left for its launch position in the last minutes of
    the count: T-4 min by one section of the report, T-2:30 by the MR-4 countdown."""
    g = group("CherryPicker")
    body, boom, tyres, cab, glass = (MeshBuilder() for _ in range(5))
    tx, ty = 46.0, -6.0
    box(body, (tx - 16.0, ty - 4.2, 3.4), (tx + 14.0, ty + 4.2, 5.0))                           # carrier deck
    box(body, (tx + 14.0, ty - 4.2, 3.4), (tx + 21.0, ty + 4.2, 9.6))                           # driver's cab
    box(glass, (tx + 21.0, ty - 3.4, 6.6), (tx + 21.06, ty + 3.4, 9.0))
    box(body, (tx - 8.0, ty - 3.6, 5.0), (tx + 2.0, ty + 3.6, 9.5))                             # turntable house
    for dx in (-12.0, -7.0, 9.0, 17.0):
        for sy in (-1, 1):
            wheel(tyres, (tx + dx, ty + sy * 3.9, 1.9), 1.9, 1.3)
    for dx in (-15.0, 12.0):   # outriggers
        for sy in (-1, 1):
            y0, y1 = sorted((ty + sy * 4.2, ty + sy * 9.0))
            box(body, (tx + dx - 0.5, y0, 3.3), (tx + dx + 0.5, y1, 4.1))
            beam(body, (tx + dx, ty + sy * 8.6, 3.4), (tx + dx, ty + sy * 8.6, 0.2), 0.5)
            box(body, (tx + dx - 1.2, ty + sy * 8.6 - 1.2, 0.0), (tx + dx + 1.2, ty + sy * 8.6 + 1.2, 0.22))
    # mast: a lattice column, leaning slightly toward the vehicle
    base = Vector((tx - 3.0, ty, 9.5))
    top = Vector((tx - 9.0, ty, 96.0))
    def col(i: int, z: float):
        k = (z - base.z) / (top.z - base.z)
        c = base + (top - base) * k
        w = 2.0 - 0.6 * k
        return (c.x + w * (1 if i in (0, 3) else -1), c.y + w * (1 if i < 2 else -1), z)
    lattice(boom, col, [base.z + k * (top.z - base.z) / 12 for k in range(13)], 0.4, 0.22)
    # jib: from the mast head down to the cab at the hatch
    cab_c = Vector((6.6, 0.0, HATCH_HEIGHT + 1.2))
    head, tip = top + Vector((0, 0, -1.0)), cab_c + Vector((2.0, 0.0, 6.0))
    def jb(i: int, k: float):
        c = head + (tip - head) * k
        w = 1.5 - 0.5 * k
        return (c.x, c.y + w * (1 if i < 2 else -1), c.z + w * (1 if i in (0, 3) else -1))
    steps = [k / 9 for k in range(10)]
    for i in range(4):
        beam(boom, jb(i, 0), jb(i, 1), 0.3)
    for k0, k1 in zip(steps, steps[1:]):
        for i in range(4):
            j = (i + 1) % 4
            beam(boom, jb(i, k1), jb(j, k1), 0.18)
            beam(boom, jb(i, k0), jb(j, k1), 0.16)
    beam(boom, tuple(tip), tuple(cab_c + Vector((0, 0, 3.6))), 0.35)
    # the cab: an open-sided box the pilot steps into from the hatch
    c = cab_c
    box(cab, (c.x - 2.2, c.y - 2.4, c.z - 3.5), (c.x + 2.2, c.y + 2.4, c.z - 3.2))               # floor
    box(cab, (c.x - 2.2, c.y - 2.4, c.z + 3.3), (c.x + 2.2, c.y + 2.4, c.z + 3.6))               # roof
    box(cab, (c.x + 1.95, c.y - 2.4, c.z - 3.2), (c.x + 2.2, c.y + 2.4, c.z + 3.3))              # back wall
    for sy in (-1, 1):
        box(cab, (c.x - 0.6, c.y + sy * 2.4 - 0.12, c.z - 3.2), (c.x + 1.95, c.y + sy * 2.4 + 0.12, c.z + 3.3))
        beam(cab, (c.x - 2.1, c.y + sy * 2.3, c.z - 3.2), (c.x - 2.1, c.y + sy * 2.3, c.z + 3.3), 0.2)
    body.build("CherryPicker_Carrier", M["yellow"], g, smooth=False)
    boom.build("CherryPicker_Boom", M["yellow"], g, smooth=False)
    tyres.build("CherryPicker_Tyres", M["tyre"], g, sharp_angle=30)
    cab.build("CherryPicker_Cab", M["white"], g, smooth=False)
    glass.build("CherryPicker_Windscreen", M["glass"], g, smooth=False)


def build_floodlights(M) -> None:
    g = group("Floodlights")
    poles, lamps = MeshBuilder(), MeshBuilder()
    for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        x, y = sx * 88.0, sy * 88.0
        poles.tube(P(x, y, 0), P(x, y, 44), 0.42 * FT, 10)
        box(poles, (x - 1.0, y - 1.0, 0.0), (x + 1.0, y + 1.0, 0.5))
        aim = Vector((-x, -y, 0)).normalized()
        side = Vector((-aim.y, aim.x, 0))
        bar = Vector((x, y, 44.4))
        beam(poles, tuple(bar - side * 4.0), tuple(bar + side * 4.0), 0.35)
        for k in (-3, -1, 1, 3):
            c = bar + side * k + Vector((0, 0, 0.9))
            m = Matrix.Translation(c * FT) @ Vector((0, 0, 1)).rotation_difference((aim + Vector((0, 0, -0.45))).normalized()).to_matrix().to_4x4()
            poles.lathe([(0.25 * FT, -0.7 * FT), (0.85 * FT, 0.0)], 14, matrix=m)
            lamps.lathe([(0.82 * FT, -0.03 * FT), (0.0, -0.03 * FT)], 14, matrix=m, flip=True)
    poles.build("Floodlights_Poles", M["grey"], g, sharp_angle=30)
    lamps.build("Floodlights_Lamps", M["lamp"], g)


def build() -> None:
    M = materials()
    build_hardstand(M)
    build_pedestal(M)
    build_umbilical_mast(M)
    build_service_structure(M)
    build_cherry_picker(M)
    build_floodlights(M)
