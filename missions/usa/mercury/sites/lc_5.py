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

import srlib
from srlib import FT, TAU, MeshBuilder, group, material

PEDESTAL_TOP = 6.0  # the vehicle's fin trailing edges rest here
HARDSTAND = 204.0  # square, side: Figure 7-6 scaled on the 535 ft between pads 5 and 6; pad 6's is given as 203 ft
RAIL_GAUGE = 28.0
# How far the concrete and track bed go down. The viewer's ground is half a metre under the pad
# surface (two parallel surfaces centimetres apart flicker at a distance), so they must go deeper.
FOOTING = 3.0
STRUCTURE_X = -78.0  # service structure centre at the edge of the pad (T-55 min)
LAUNCH_POSITION_X = -195.0  # where it is driven to by remote control at T-8:45 (scaled off Figure 7-6)
STRUCTURE_TOP = 118.0  # top of the tower, under the crane
HATCH_HEIGHT = 68.4  # capsule hatch centre above ground, vehicle on the pedestal
LEVELS = (22.0, 42.0, 62.5, 79.0, 94.0)  # work platforms; the third is the white room
CHERRY_REACH = 125.0  # documented: the mobile tower could reach 125 ft
# The mobile aerial tower's carrier. Every size is read off photographs (see lc-5.md); none is published.
PICKER_REAR_AXLE = (56.0, 0.0)  # where the rear axle's centre stands on the hardstand; the truck faces +X, away from the pad
PICKER_WHEELBASE = 16.5
PICKER_TRACK = 6.5  # between the centres of the front wheels, and of the rear dual pairs
PICKER_TYRE_RADIUS = 1.73  # a 10.00-20 truck tyre, 41.5 in across
PICKER_PIVOT = (-4.5, 7.0)  # the mast's foot pin: ahead of the rear axle (negative is behind it), and above the ground
PICKER_MAST = 70.0  # foot pin to elbow
PICKER_JIB = 52.0  # elbow to the cab's hanger pin
DECK_CUTOUT = 80.0 / 12  # width of the U cut in each work platform: the 70 in booster and a hand's clearance


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
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),  # the viewer makes this transparent
        "void": m("window-void", (0.004, 0.004, 0.005), 0.0, 0.95),
        "tyre": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "yellow": m("paint-vehicle-yellow", (0.62, 0.42, 0.03), 0.0, 0.5),
        "lamp": m("lamp", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.6),
        "cable": m("cable", (0.03, 0.03, 0.03), 0.0, 0.7),
        "chassis": m("steel-chassis", (0.05, 0.05, 0.055), 0.3, 0.7),
        "scorch": m("concrete-scorched", (0.13, 0.12, 0.115), 0.0, 1.0),
        "stain": m("concrete-stained", (0.27, 0.26, 0.24), 0.0, 0.95),
        "green": m("paint-panel-green", (0.13, 0.42, 0.36), 0.0, 0.45),
        "blue": m("paint-insignia-blue", (0.03, 0.09, 0.35), 0.0, 0.5),
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
    for z0, z1 in zip(levels, levels[1:]):
        for i in range(4):  # a leg is drawn level by level, so it follows a tower that changes slope
            beam(mb, corner(i, z0), corner(i, z1), col)
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
        for k in range(1 if seg else 0, n + 1):  # a corner post belongs to the run before it
            p = a + (b - a) * k / n
            beam(mb, p, p + Vector((0, 0, height)), 0.16)
        for h in (height, height * 0.5):
            beam(mb, a + Vector((0, 0, h)), b + Vector((0, 0, h)), 0.13)


def axes(origin, x_axis, z_axis) -> Matrix:
    """A frame at `origin` (feet) with local X and Z along the given directions; Y completes it."""
    x, z = Vector(x_axis).normalized(), Vector(z_axis).normalized()
    m = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    m.translation = Vector(origin) * FT
    return m


def ftp(points) -> list:
    """A lathe profile given in feet."""
    return [(r * FT, z * FT) for r, z in points]


def obox(mb: MeshBuilder, centre, x_axis, z_axis, size) -> None:
    """A box of `size` (feet, along its own X, Y, Z) turned to the given axes."""
    mb.box(tuple(v * FT for v in size), axes(centre, x_axis, z_axis))


def plate(mb: MeshBuilder, pts, thickness: float) -> None:
    """A flat plate: a convex polygon (feet, any plane), given thickness about that plane."""
    pts = [Vector(p) for p in pts]
    n = Vector((0, 0, 0))
    for a, b in zip(pts, pts[1:] + pts[:1]):
        n += a.cross(b)
    h = n.normalized() * thickness / 2
    k = len(pts)
    top, bot = [tuple((p + h) * FT) for p in pts], [tuple((p - h) * FT) for p in pts]
    mb.add(top, [tuple(range(k))])
    mb.add(bot, [tuple(reversed(range(k)))])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def hull(mb: MeshBuilder, loops, caps=(True, True)) -> None:
    """A skin over a row of loops (feet), each with the same number of points and running
    anticlockwise seen from the far end. The ends are closed flat."""
    k = len(loops[0])
    verts = [tuple(Vector(p) * FT) for loop in loops for p in loop]
    faces = []
    for s in range(len(loops) - 1):
        for i in range(k):
            j = (i + 1) % k
            faces.append((s * k + i, s * k + j, (s + 1) * k + j, (s + 1) * k + i))
    mb.add(verts, faces)
    if caps[0]:
        mb.add(verts[:k], [tuple(reversed(range(k)))])
    if caps[1]:
        mb.add(verts[-k:], [tuple(range(k))])


def arch(x: float, w: float, zb: float, zt: float, r: float, n: int = 4) -> list:
    """A loop for hull(): flat sides and bottom, the two top corners rounded to radius r; at station x."""
    pts = [(x, w, zb)]
    for cy, a0 in ((w - r, 0.0), (-w + r, math.pi / 2)):
        pts += [(x, cy + r * math.cos(a0 + math.pi / 2 * k / n), zt - r + r * math.sin(a0 + math.pi / 2 * k / n)) for k in range(n + 1)]
    return [*pts, (x, -w, zb)]


def truss(mb: MeshBuilder, corner, stations, chord: float, brace: float) -> None:
    """A four-chord box truss with a frame at each station and one diagonal a bay on each face,
    alternating: the zigzag of the mobile tower's mast and jib. corner(i, s) places chord i."""
    for s0, s1 in zip(stations, stations[1:]):
        for i in range(4):
            beam(mb, corner(i, s0), corner(i, s1), chord)
    for s in stations:
        for i in range(4):
            beam(mb, corner(i, s), corner((i + 1) % 4, s), brace)
    for n, (s0, s1) in enumerate(zip(stations, stations[1:])):
        for i in range(4):
            a, b = (i, (i + 1) % 4) if n % 2 == 0 else ((i + 1) % 4, i)
            beam(mb, corner(a, s0), corner(b, s1), brace * 0.85)


def deck_plate(mb: MeshBuilder, x0: float, x1: float, half: float, z0: float, z1: float, cut: float, depth: float) -> None:
    """A work platform from x0 to x1, `half` wide each side, with a U cut `cut` wide and `depth`
    deep in its x1 edge: the platforms encircled the vehicle."""
    r = cut / 2
    xc = x1 - depth + r
    n = 10 if fine() else 6
    arc = [(xc + r * math.cos(a), r * math.sin(a)) for a in (-math.pi / 2 - math.pi * k / n for k in range(n + 1))]
    lower = [(x1, -half), (x1, -r), *arc[: n // 2 + 1], (x0, 0.0)]  # fanned from the corner (x0, -half)
    upper = [(x0, 0.0), *arc[n // 2 :], (x1, r), (x1, half)]  # fanned from (x0, half)
    for corner, ring in (((x0, -half), lower), ((x0, half), upper)):
        for a, b in zip(ring, ring[1:]):
            mb.add([tuple(P(*corner, z1)), tuple(P(*a, z1)), tuple(P(*b, z1))], [(0, 1, 2)])
            mb.add([tuple(P(*corner, z0)), tuple(P(*b, z0)), tuple(P(*a, z0))], [(0, 1, 2)])
    outline = [(x0, -half), (x1, -half), (x1, -r), *arc, (x1, r), (x1, half), (x0, half)]
    for a, b in zip(outline, outline[1:] + outline[:1]):
        mb.add([tuple(P(*a, z0)), tuple(P(*b, z0)), tuple(P(*b, z1)), tuple(P(*a, z1))], [(0, 1, 2, 3)])


def fine() -> bool:
    """Whether to build what only a close look shows: tread lugs, bolts, ribs."""
    return srlib.DETAIL >= 0.5


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
        box(rails, (-229.8, y - 0.3, 0.0), (21.8, y + 0.3, 0.08))  # foot, ending short of the web
        for k in range(27):  # ties, off the hardstand
            x = -half - 2.0 - k * 4.7
            box(gravel, (x - 0.4, y - 2.6, -0.2), (x + 0.4, y + 2.6, 0.02))
    # what the launches before this one left: concrete burnt dark under the pedestal and stained
    # round it. Each patch is its own mesh a few millimetres proud of the slabs, so nothing is coplanar.
    scorch, stain, covers = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for mb, radius, top, phase in ((stain, 23.0, 0.02, 0.4), (scorch, 13.5, 0.04, 2.1)):
        rim = []
        for k in range(48):
            a = TAU * k / 48
            r = radius * (1 + 0.1 * math.sin(3 * a + phase) + 0.06 * math.sin(7 * a + 2 * phase) + 0.03 * math.sin(13 * a))
            rim.append((r * math.cos(a), r * math.sin(a)))
        mb.add([(0, 0, top * FT)] + [tuple(P(x, y, top)) for x, y in rim], [(0, 1 + k, 1 + (k + 1) % 48) for k in range(48)])
        for k in range(48):
            (x0, y0), (x1, y1) = rim[k], rim[(k + 1) % 48]
            mb.add([tuple(P(x0, y0, -0.1)), tuple(P(x1, y1, -0.1)), tuple(P(x1, y1, top)), tuple(P(x0, y0, top))], [(0, 1, 2, 3)])
    for lo, hi in ((9.0, 20.5), (-20.5, -9.0)):  # the slab joints still show through the staining
        box(joints, (lo, -0.06, -0.12), (hi, 0.06, 0.05))
        box(joints, (-0.06, lo, -0.12), (0.06, hi, 0.05))
    # cable trench from the mast's foot to the edge of the pad, under steel covers
    for k in range(34):
        y = -13.4 - k * 2.6
        box(covers, (-2.9, y - 2.5, -0.3), (-0.1, y, 0.06))
        if fine():
            for x in (-2.6, -0.4):
                covers.disc(P(x, y - 1.25, 0.06), (0, 0, 1), 0.07 * FT, 0.03 * FT, 6)
    scorch.build("Hardstand_Scorch", M["scorch"], g, smooth=False)
    stain.build("Hardstand_Stain", M["stain"], g, smooth=False)
    covers.build("Hardstand_TrenchCovers", M["deck"], g, smooth=False)
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
    # the ring is a channel rolled into a circle, stiffened by ribs between its flanges
    prof = [(1.95, z1 - 0.8), (3.85, z1 - 0.8), (3.85, z1 - 0.68), (3.7, z1 - 0.68), (3.7, z1 - 0.14), (3.85, z1 - 0.14), (3.85, z1 - 0.02)]
    ring.lathe(ftp([*prof, (1.95, z1 - 0.02), (1.95, z1 - 0.8)]), 64)
    if fine():
        for k in range(24):
            a = TAU * (k + 0.5) / 24
            radial = (math.cos(a), math.sin(a), 0)
            obox(ring, (3.72 * radial[0], 3.72 * radial[1], z1 - 0.41), radial, (0, 0, 1), (0.22, 0.07, 0.54))
    top_z, foot_z = z1 - 0.7, 0.3
    for i in range(4):
        t = TAU * i / 4
        c, s = math.cos(t), math.sin(t)
        # each leg is an H-section: two flanges and a web, with gussets under the ring and at the foot
        a, b = Vector((3.2 * c, 3.2 * s, top_z)), Vector((5.6 * c, 5.6 * s, foot_z))
        d, tang = (b - a).normalized(), Vector((-s, c, 0))
        n = d.cross(tang)
        length = (b - a).length
        for off in (-0.32, 0.32):
            obox(frame, (a + b) / 2 + n * off, d, n, (length, 0.78, 0.08))
        obox(frame, (a + b) / 2, d, tang, (length, 0.56, 0.08))

        def leg(z: float, off: float, c=c, s=s):  # a point on the leg's centre line at height z, moved off radially
            r = 3.2 + 2.4 * (top_z - z) / (top_z - foot_z) + off
            return (r * c, r * s, z)

        plate(frame, [leg(z1 - 0.8, -0.4), (2.25 * c, 2.25 * s, z1 - 0.8), leg(z1 - 2.6, -0.42)], 0.1)
        plate(frame, [leg(z1 - 0.8, 0.42), leg(z1 - 0.8, 0.9), leg(z1 - 1.9, 0.42)], 0.1)
        for sign in (-1, 1):
            base = Vector((5.6 * c, 5.6 * s, 0.3))
            plate(frame, [tuple(base + tang * sign * 0.8), tuple(base + tang * sign * 0.4), tuple(Vector(leg(1.4, 0.0)) + tang * sign * 0.4)], 0.1)
        box(frame, (5.6 * c - 0.95, 5.6 * s - 0.95, 0.12), (5.6 * c + 0.95, 5.6 * s + 0.95, 0.3))
        for dx in (-0.75, 0.75):
            for dy in (-0.75, 0.75):
                frame.disc(P(5.6 * c + dx, 5.6 * s + dy, 0.3), (0, 0, 1), 0.09 * FT, 0.1 * FT, 6)
        t2 = TAU * (i + 1) / 4
        frame.tube(P(4.4 * c, 4.4 * s, 2.7), P(4.4 * math.cos(t2), 4.4 * math.sin(t2), 2.7), 0.16 * FT, 10)
        # the four pads the tail's ring frame sits on, under the fin roots
        tf = t + TAU / 8
        box(ring, (3.0 * math.cos(tf) - 0.35, 3.0 * math.sin(tf) - 0.35, z1 - 0.4), (3.0 * math.cos(tf) + 0.35, 3.0 * math.sin(tf) + 0.35, z1))
    # the deflector: a flared cone of twelve plates welded along ribs, which turns the jet outward all round
    gores = 12
    cone = [(3.25, 0.06), (3.25, 0.32), (2.85, 0.48), (2.0, 0.98), (1.1, 2.02), (0.3, 3.36), (0.0, 3.5)]
    us = [TAU * k / gores for k in range(gores)]
    defl.grid(lambda u, j: tuple(P(cone[j][0] * math.cos(u), cone[j][0] * math.sin(u), cone[j][1])), us, range(len(cone)), closed_u=True)
    for u in us:  # a rib down each seam, standing proud of the plates
        radial, tang = Vector((math.cos(u), math.sin(u), 0)), Vector((-math.sin(u), math.cos(u), 0))
        outer = [
            radial * (r + 0.09 * min(1.0, r / 1.1)) + Vector((0, 0, z + 0.1 * min(1.0, r / 1.1))) for r, z in cone[1:-1]
        ]  # fading out at the tip
        inner = [radial * max(0.0, r - 0.25) + Vector((0, 0, z - 0.3)) for r, z in cone[1:-1]]
        for k in range(len(outer) - 1):
            for sign in (-1, 1):
                quad = [inner[k], outer[k], outer[k + 1], inner[k + 1]]
                quad = [tuple((q + tang * sign * 0.05) * FT) for q in (quad if sign < 0 else reversed(quad))]
                defl.add(quad, [(0, 1, 2, 3)])
            defl.add(
                [tuple((q + tang * e) * FT) for q, e in ((outer[k], -0.05), (outer[k], 0.05), (outer[k + 1], 0.05), (outer[k + 1], -0.05))],
                [(0, 1, 2, 3)],
            )
    # the girth seam where the upper and lower plates meet
    band = [(1.864, 1.06), (1.94, 1.126), (1.744, 1.353), (1.668, 1.287)]
    defl.grid(lambda u, j: tuple(P(band[j][0] * math.cos(u), band[j][0] * math.sin(u), band[j][1])), us, range(len(band)), closed_u=True)
    ring.build("Pedestal_Ring", M["grey"], g, sharp_angle=30)
    frame.build("Pedestal_Legs", M["grey"], g, sharp_angle=30)
    defl.build("Pedestal_FlameDeflector", M["scorched"], g, smooth=False)


def build_umbilical_mast(M) -> None:
    """Cable mast No. 2, carrying the capsule's umbilical. (No. 1, for the booster, is not modelled.)
    The umbilical dropped at about T-35 s and the boom fell away just before ignition."""
    g = group("UmbilicalMast")
    mast, cable = MeshBuilder(), MeshBuilder()
    cy, top, w = -11.0, 68.0, 0.75
    plug = (0.0, -2.92, PEDESTAL_TOP + (716.0 + 8.0) / 12)  # the capsule's umbilical receptacle
    corner = lambda i, z: (-1.5 + w * (1 if i in (0, 3) else -1), cy + w * (1 if i < 2 else -1), z)  # noqa: E731
    lattice(mast, corner, [0.3 + k * (top - 0.3) / 12 for k in range(13)], 0.22, 0.14)
    box(mast, (-3.2, cy - 1.7, 0.0), (0.2, cy + 1.7, 0.3))
    beam(mast, (-1.5, cy, top - 0.6), (-1.5, -3.5, top - 0.6), 0.3)  # arm to the capsule
    # the umbilical drooping from the arm to the receptacle low on the capsule's cone
    path = [(-1.5, -3.6, top - 0.7), (-1.3, -4.6, plug[2] - 1.9), (-0.5, -4.1, plug[2] - 1.4), (-0.05, -3.4, plug[2] - 0.25), plug]
    cable.loft([P(*p) for p in path], [(0.11 * FT, 0.11 * FT)] * len(path), 8, ref=(1, 0, 0))
    mast.build("Mast_Truss", M["grey"], g, smooth=False)
    cable.build("Mast_Umbilical", M["cable"], g)


def build_service_structure(M) -> None:
    """The gantry: built for Redstone and Jupiter, it rolls on rails under its own power and
    serves pads 5 and 6. For Mercury it gained a remote control, an enclosed, air-conditioned
    white room at capsule level (level 3), and a blast deflector against the escape rocket."""
    g = group("ServiceStructure")
    red, white, deck, glass, dark, void, green, duct, lamps = (MeshBuilder() for _ in range(9))
    cx = STRUCTURE_X
    half_y = RAIL_GAUGE / 2

    def corner(i: int, z: float):
        # legs splay from the rails to a narrow tower by 58 ft, then run straight up
        k = min(1.0, max(0.0, (z - 3.0) / 55.0))
        hx, hy = 13.0 + (5.0 - 13.0) * k, half_y + (6.5 - half_y) * k
        return (cx + hx * (1 if i in (0, 3) else -1), hy * (1 if i < 2 else -1), z)

    levels = [3.0, 14.0, 26.0, 38.0, 48.0, 58.0, 70.0, 82.0, 95.5, 106.0, STRUCTURE_TOP]  # none at a deck's height
    lattice(red, corner, levels, 1.1, 0.5)
    for z in levels[1:]:  # a gusset plate in each face at every node, where the braces meet the leg
        for i in range(4):
            node, below, above = Vector(corner(i, z)), Vector(corner(i, z - 2.4)), Vector(corner(i, min(z + 2.4, STRUCTURE_TOP)))
            e = (above - below).normalized() * 0.5
            for j in ((i + 1) % 4, (i - 1) % 4):
                h = (Vector(corner(j, z)) - node).normalized() * 2.6
                plate(red, [below, node + h - e, node + h + e, above], 0.1)
    # bogies on the rails: two flanged wheels in axle boxes under a bolster, a traction motor between them
    tread = [(0, -0.36), (1.18, -0.36), (1.18, -0.27), (1.0, -0.16), (0.98, 0.3), (0.86, 0.3), (0.82, 0.18), (0.4, 0.14), (0.36, 0.34), (0, 0.34)]
    for sy in (-1, 1):
        for sx in (-1, 1):
            bx, by = cx + sx * 13.0, sy * half_y
            box(dark, (bx - 4.0, by - 1.15, 2.75), (bx + 4.0, by + 1.15, 3.25))
            for dx in (-2.4, 2.4):
                dark.lathe(ftp(tread), 32, matrix=axes((bx + dx, by, 1.5), (1, 0, 0), (0, sy, 0)))  # flange inside the gauge
                dark.tube(P(bx + dx, by - 0.75, 1.5), P(bx + dx, by + 0.75, 1.5), 0.18 * FT, 8)
                for s2 in (-1, 1):
                    y0, y1 = sorted((by + s2 * 0.55, by + s2 * 0.75))
                    box(dark, (bx + dx - 0.55, y0, 0.95), (bx + dx + 0.55, y1, 2.75))
                    y0, y1 = sorted((by + s2 * 0.75, by + s2 * 1.0))
                    box(dark, (bx + dx - 0.4, y0, 1.1), (bx + dx + 0.4, y1, 1.9))
                    dark.lathe(ftp([(0.28, 0.0), (0.28, 0.12), (0.0, 0.12)]), 12, matrix=axes((bx + dx, by + s2 * 1.0, 1.5), (1, 0, 0), (0, s2, 0)))
            dark.tube(P(bx - 0.9, by, 1.8), P(bx + 0.9, by, 1.8), 0.6 * FT, 16)
            for x0, x1 in ((bx - 1.15, bx - 0.9), (bx + 0.9, bx + 1.15)):
                box(dark, (x0, by - 0.5, 1.2), (x1, by + 0.5, 2.75))
        box(red, (cx - 14.0, sy * half_y - 0.9, 2.8), (cx + 14.0, sy * half_y + 0.9, 4.4))
    for sx in (-1, 1):
        box(red, (cx + sx * 13.0 - 0.8, -half_y, 3.1), (cx + sx * 13.0 + 0.8, half_y, 4.3))

    # work platforms reach out over the pad from the tower's front face, each cut in a U to take the vehicle
    reach = 21.0
    slot_r, slot_depth = DECK_CUTOUT / 2, 8.5
    # steep stairs up the side of the platforms: one flight a level, stacked, landing to landing
    lane_in, lane_out = -11.84, -14.4  # the two stringers
    land_a, land_b = (cx + 11.2, cx + 13.6), (cx + 22.8, cx + 25.4)  # foot and head landings, the same at every level
    for n, z in enumerate(LEVELS):
        x0 = corner(0, z)[0] - 0.4
        xf = x0 + reach
        hy = 10.5 if n != 2 else 11.5
        deck_plate(deck, x0, xf, hy, z - 0.45, z, DECK_CUTOUT, slot_depth)
        for y in (-hy + 0.6, -4.5, 4.5, hy - 0.6):  # cantilever beams and their struts back to the tower
            if n == 3:  # no struts under the level above the white room: they would run through it
                box(red, (x0 - 3.0, y - 0.35, z - 2.6), (x0 + reach - 0.5, y + 0.35, z - 0.5))
                continue
            box(red, (x0 - 3.0, y - 0.35, z - 1.6), (x0 + reach - 0.5, y + 0.35, z - 0.5))
            beam(red, (x0 + reach - 3.0, y, z - 1.2), (x0 - 0.2, y, z - 11.0), 0.45)
        gaps = [gap for gap, there in ((land_b, n > 0), (land_a, n < len(LEVELS) - 1)) if there]
        for x_lo, x_hi in gaps:  # a landing outside the platform's edge, on two joists
            box(deck, (x_lo, lane_out - 0.1, z - 0.45), (x_hi, -hy, z))
            for x in (x_lo + 0.4, x_hi - 0.4):
                box(red, (x - 0.2, lane_out, z - 1.1), (x + 0.2, -hy + 0.25, z - 0.52))
        if n > 0:
            handrail(white, [(land_b[0], lane_out, z), (land_b[1] - 0.15, lane_out, z), (land_b[1] - 0.15, -hy - 0.3, z)])
        if n < len(LEVELS) - 1:
            handrail(white, [(land_a[1], lane_out, z), (land_a[0] + 0.15, lane_out, z), (land_a[0] + 0.15, -hy - 0.3, z)])
        if n != 2:
            # the rail follows the platform's edge round the U, and breaks at the landings
            back = xf - slot_depth
            rail = [(x0 + 0.3, hy - 0.3), (xf - 0.3, hy - 0.3), (xf - 0.3, slot_r + 0.5), (back + 1.2, slot_r + 0.5), (back - 0.5, 1.6)]
            rail += [(x, -y) for x, y in reversed(rail[1:])]
            cur, pieces = xf - 0.3, []
            for x_lo, x_hi in gaps:
                if cur > x_hi + 0.5:
                    pieces.append((cur, x_hi))
                cur = min(cur, x_lo)
            if cur > x0 + 0.8:
                pieces.append((cur, x0 + 0.3))
            if pieces and pieces[0][0] == xf - 0.3:
                rail.append((pieces.pop(0)[1], -hy + 0.3))
            handrail(white, [(x, y, z) for x, y in rail])
            for x_hi, x_lo in pieces:
                handrail(white, [(x_hi, -hy + 0.3, z), (x_lo, -hy + 0.3, z)])
    for za, zb in zip(LEVELS, LEVELS[1:]):
        xa, xb = land_a[1], land_b[0]
        steps = round((zb - za) / 0.8)
        for y in (lane_in, lane_out):
            plate(white, [(xa, y, za - 0.7), (xb, y, zb - 0.7), (xb, y, zb + 0.05), (xa, y, za + 0.05)], 0.12)
            for h in (1.75, 3.5):
                beam(white, (xa, y, za + h), (xb, y, zb + h), 0.13)
        for x, z in ((xa, za), (xb, zb)):
            beam(white, (x, lane_in, z), (x, lane_in, z + 3.5), 0.16)
        for k in range(1, steps):
            x, z = xa + (xb - xa) * k / steps, za + (zb - za) * k / steps
            box(deck, (x - 0.33, lane_out + 0.06, z - 0.08), (x + 0.33, lane_in - 0.06, z))

    # level 3 white room: an enclosure of green panels in a light frame round the capsule's work area
    z = LEVELS[2]
    x0 = corner(0, z)[0] - 0.4
    xa, xb, hy, zt = x0 + 1.7, x0 + reach - 0.6, 10.9, z + 12.0  # the back wall stands clear of the tower's legs
    sill, head = z + 4.5, z + 8.5
    doors = [(land_a[0] + 0.2, land_a[1] - 0.2), (land_b[0] + 0.1, land_b[0] + 2.0)]  # onto the two landings
    windows = {
        1: [(xa + 1.6 + k * 4.4, xa + 5.0 + k * 4.4) for k in range(4)],
        -1: [(land_a[1] + 0.8 + k * 4.2, land_a[1] + 4.0 + k * 4.2) for k in range(2)],
    }
    for sy, panes in windows.items():
        # each side wall is built round its window openings, so the glass is really a window
        y0, y1 = sorted((sy * hy, sy * (hy - 0.35)))
        posts = [xa] + [x for pane in panes for x in pane] + [xb]
        box(green, (xa, y0, z + 0.02), (xb, y1, sill))
        box(green, (xa, y0, head), (xb, y1, zt))
        for p0, p1 in zip(posts[0::2], posts[1::2]):
            box(green, (p0, y0, sill), (p1, y1, head))
        for p0, p1 in panes:
            box(glass, (p0, (y0 + y1) / 2 - 0.03, sill), (p1, (y0 + y1) / 2 + 0.03, head))
        # the frame the panels are set in: uprights standing a little prouder than the rails
        y0, y1 = sorted((sy * (hy - 0.05), sy * (hy + 0.08)))
        for p in posts + ([x for door in doors for x in door] if sy < 0 else []):
            box(white, (p - 0.1, y0, z + 0.06), (p + 0.1, y1, zt - 0.06))
        y0, y1 = sorted((sy * (hy - 0.03), sy * (hy + 0.05)))
        for b0, b1 in ((z + 0.04, z + 0.3), (sill - 0.16, sill - 0.02), (head + 0.02, head + 0.16), (zt - 0.5, zt - 0.2)):
            box(white, (xa, y0, b0), (xb, y1, b1))
    for d0, d1 in doors:
        box(white, (d0 + 0.1, -hy - 0.11, z + 0.06), (d1 - 0.1, -hy + 0.1, z + 7.0))  # door leaf
        box(dark, (d0 + 0.15, -hy - 0.13, z + 0.1), (d1 - 0.15, -hy + 0.05, z + 0.9))  # kick plate
        box(void, (d0 + 0.5, -hy - 0.13, z + 4.7), (d1 - 0.5, -hy + 0.05, z + 6.3))  # its window
        box(dark, (d1 - 0.45, -hy - 0.2, z + 3.4), (d1 - 0.25, -hy + 0.05, z + 3.6))  # handle
    box(green, (xa, -hy + 0.4, z + 0.02), (xa + 0.35, hy - 0.4, zt))
    for y in (-7.2, -3.6, 3.6, 7.2):
        box(white, (xa - 0.08, y - 0.1, z + 0.06), (xa + 0.1, y + 0.1, zt - 0.06))
    box(white, (xa - 0.05, -hy + 0.4, z + 5.9), (xa + 0.08, hy - 0.4, z + 6.1))
    box(white, (xa - 0.3, -hy - 0.3, zt - 0.15), (xb + 0.3, hy + 0.3, zt + 0.5))  # roof, lapping the walls
    for sy in (-1, 1):  # the open front is closed by two leaves that part round the capsule
        y0, y1 = sorted((sy * 3.5, sy * (hy - 0.4)))
        box(green, (xb - 0.4, y0, z + 0.02), (xb - 0.05, y1, zt))
        y0, y1 = sorted((sy * 3.45, sy * 3.7))
        box(white, (xb - 0.1, y0, z + 0.06), (xb + 0.03, y1, zt - 0.06))
    # air conditioning: the unit on a machinery deck across the base, its duct up inside the tower to the room's back wall
    box(deck, (cx - 12.2, -5.0, 3.9), (cx + 12.2, 5.0, 4.3))
    box(dark, (cx + 1.8, -2.6, 4.3), (cx + 7.2, 2.6, 8.6))
    for k in range(5):
        box(void, (cx + 7.1, -2.0, 5.0 + k * 0.6), (cx + 7.24, 2.0, 5.35 + k * 0.6))
    dx = cx + 3.8
    path = [(dx, 0, 8.6), (dx, 0, 30.0), (dx, 0, 50.0), (dx, 0, z + 0.3), (dx + 0.25, 0, z + 2.4), (dx + 1.2, 0, z + 3.35), (xa + 0.2, 0, z + 3.5)]
    duct.loft([P(*p) for p in path], [(0.6 * FT, 0.6 * FT)] * len(path), 16)
    for k in range(7):  # flanged joints
        duct.tube(P(dx, 0, 12.0 + k * 8.0 - 0.08), P(dx, 0, 12.0 + k * 8.0 + 0.08), 0.7 * FT, 16)
    # elevator up the back face, and the hammerhead crane on top
    ex = corner(1, 60)[0] - 4.8
    lattice(
        red, lambda i, zz: (ex + 2.6 * (1 if i in (0, 3) else -1), 3.0 * (1 if i < 2 else -1), zz), [4.5 + k * 11.0 for k in range(10)], 0.4, 0.25
    )
    box(white, (ex - 2.2, -2.6, 30.0), (ex + 2.2, 2.6, 38.5))
    # a caged ladder up one leg, for when the elevator is not running
    lx, ly = corner(0, 60)[0] - 1.9, corner(0, 60)[1] + 1.4  # on the tower's side face, behind the white room
    for dy in (-0.75, 0.75):
        beam(white, (lx, ly + dy, 58.5), (lx, ly + dy, STRUCTURE_TOP - 0.5), 0.14)
    for k in range(int((STRUCTURE_TOP - 60) / 1.0)):
        beam(white, (lx, ly - 0.75, 59.0 + k), (lx, ly + 0.75, 59.0 + k), 0.09)
    for k in range(int((STRUCTURE_TOP - 66) / 4.0)):  # safety hoops
        zh = 66.0 + k * 4.0
        hoop = [(lx - 1.25 * math.sin(a), ly + 1.25 * math.cos(a), zh) for a in (math.pi * i / 6 for i in range(7))]
        for p0, p1 in zip(hoop, hoop[1:]):
            beam(white, p0, p1, 0.09)
    # work lights under each platform, and the obstruction beacon on the crane
    for zl in LEVELS:
        x0 = corner(0, zl)[0] - 0.4
        for y in (-7.0, 7.0):
            lamps.lathe([(0.45 * FT, 0.0), (0.0, 0.0)], 12, matrix=Matrix.Translation(P(x0 + 9.0, y, zl - 1.7)), flip=True)
            dark.lathe([(0.2 * FT, 0.45 * FT), (0.5 * FT, 0.0)], 12, matrix=Matrix.Translation(P(x0 + 9.0, y, zl - 1.7)))
    lamps.lathe(
        [(0.0, 0.0), (0.45 * FT, 0.0), (0.45 * FT, 1.0 * FT), (0.0, 1.25 * FT)],
        12,
        matrix=Matrix.Translation(P(cx - 12.0, 0.0, STRUCTURE_TOP + 8.45)),
    )
    zc = STRUCTURE_TOP
    box(red, (cx - 7.0, -7.5, zc), (cx + 7.0, 7.5, zc + 1.2))
    jib = lambda i, x: (x, 2.2 * (1 if i < 2 else -1), zc + 1.2 + (5.0 if i in (0, 3) else 0.0))  # noqa: E731
    xs = [cx - 20.0 + k * 6.0 for k in range(11)]
    for i in range(4):
        beam(red, jib(i, xs[0]), jib(i, xs[-1]), 0.5)
    for xa_, xb_ in zip(xs, xs[1:]):
        for i in range(4):
            j = (i + 1) % 4
            beam(red, jib(i, xb_), jib(j, xb_), 0.3)
            beam(red, jib(i, xa_), jib(j, xb_), 0.26)
    box(white, (cx - 16.0, -3.4, zc + 1.4), (cx - 8.0, 3.4, zc + 8.4))  # machinery house
    for sy in (-1, 1):  # the crane driver's windows: glass over a dark interior
        y0, y1 = sorted((sy * 3.3, sy * 3.56))
        box(void, (cx - 14.5, y0, zc + 4.6), (cx - 9.5, y1, zc + 7.4))
        y0, y1 = sorted((sy * 3.62, sy * 3.66))
        box(glass, (cx - 14.5, y0, zc + 4.6), (cx - 9.5, y1, zc + 7.4))
    box(dark, (xs[-2] - 1.5, -1.6, zc - 0.1), (xs[-2] + 1.5, 1.6, zc + 1.0))  # trolley
    beam(dark, (xs[-2], 0, zc - 0.1), (xs[-2], 0, zc - 14.0), 0.1)
    box(dark, (xs[-2] - 0.5, -0.5, zc - 15.6), (xs[-2] + 0.5, 0.5, zc - 14.0))

    red.build("Structure_Frame", M["red"], g, smooth=False)
    white.build("Structure_WhiteRoomAndRails", M["white"], g, smooth=False)
    green.build("Structure_WhiteRoomPanels", M["green"], g, smooth=False)
    deck.build("Structure_Decks", M["deck"], g, smooth=False)
    duct.build("Structure_AirDuct", M["deck"], g)
    lamps.build("Structure_Lights", M["lamp"], g)
    glass.build("Structure_Windows", M["glass"], g, smooth=False)
    void.build("Structure_WindowWells", M["void"], g, smooth=False)
    dark.build("Structure_RunningGear", M["grey"], g, sharp_angle=30)


def road_wheel(name: str, parent, M, hub, side: int, dual: bool) -> None:
    """One road wheel, or one dual pair, as its own node: origin at the hub centre, axle along
    local Y, so the viewer can spin it about its axle and turn the steered ones about the vertical."""
    node = group(name, parent)
    node.location = P(*hub)
    tyre, rim = MeshBuilder(), MeshBuilder()
    R, hw, rb = PICKER_TYRE_RADIUS, 0.46, 0.92  # tread radius, half the section width, bead seat radius
    out = Matrix.Rotation(-side * math.pi / 2, 4, "X")  # the lathe's +Z becomes outboard
    skin = [(rb, -0.36), (1.15, -0.45), (1.45, -0.46), (1.62, -0.42), (1.71, -0.33), (R, -0.2), (R, -0.07), (R - 0.04, -0.05)]
    skin += [(r, -z) for r, z in reversed(skin)]  # one groove down the middle, the same shoulder each side
    offsets = (-0.5, 0.5) if dual else (0.0,)
    for off in offsets:
        m = out @ Matrix.Translation((0, 0, off * FT))
        tyre.lathe(ftp(skin), 32, matrix=m)
        if fine():  # shoulder lugs, staggered side to side
            for k in range(36):
                for sz in (-1, 1):
                    a = TAU * (k + (0.5 if sz > 0 else 0.0)) / 36
                    lug = m @ Matrix.Rotation(a, 4, "Z") @ Matrix.Translation((1.675 * FT, 0, sz * 0.385 * FT))
                    tyre.box((0.1 * FT, 0.15 * FT, 0.17 * FT), lug)
    zo, zi = offsets[-1], offsets[0] - hw + 0.08
    if dual:  # the outer wheel of a pair is dished inward, and the axle's hub stands out of it
        face = [(rb - 0.14, zo + 0.22), (0.72, zo - 0.28), (0.5, zo - 0.28), (0.45, zo + 0.25), (0.2, zo + 0.3), (0, zo + 0.3)]
        nut_r, nut_z = 0.61, zo - 0.28
    else:
        face = [(rb - 0.14, zo + 0.22), (0.62, zo + 0.10), (0.55, zo + 0.30), (0.30, zo + 0.30), (0.27, zo + 0.52), (0, zo + 0.55)]
        nut_r, nut_z = 0.43, zo + 0.30
    rim.lathe(ftp([(0, zi), (rb + 0.04, zi), (rb + 0.04, zo + 0.40), (rb - 0.08, zo + 0.40), *face]), 32, matrix=out)
    axle = out.to_3x3() @ Vector((0, 0, 1))
    for k in range(10):
        a = TAU * k / 10
        rim.disc(out @ (Vector((nut_r * math.cos(a), nut_r * math.sin(a), nut_z)) * FT), axle, 0.055 * FT, 0.07 * FT, 6)
    tyre.build(f"{name}_Tyre", M["tyre"], node, sharp_angle=30)
    rim.build(f"{name}_Rim", M["grey"], node, sharp_angle=30)


def build_cherry_picker(M) -> None:
    """The mobile aerial tower: once the structure rolled back, its cab stood at the hatch so
    the pilot could step out and be swung clear. It could reach 125 ft, and could be lowered
    by remote control from the blockhouse. It left for its launch position in the last minutes of
    the count: T-4 min by one section of the report, T-2:30 by the MR-4 countdown.

    An International Harvester R-series truck carrying a turntable at its tail, a lattice mast
    raised by two rams, and a lattice jib hinged at the mast's head with the cab at its tip.
    Modelled from the photographs listed in lc-5.md. Truck coordinates below: X forward from the
    rear axle, Y to the driver's left, Z up from the ground."""
    g = group("CherryPicker")
    ax, ty = PICKER_REAR_AXLE
    wb, R, half_track = PICKER_WHEELBASE, PICKER_TYRE_RADIUS, PICKER_TRACK / 2
    body, shell, chassis, trim, boom, cab = (MeshBuilder() for _ in range(6))
    glass, void, lamps, light, metal, cable, blue = (MeshBuilder() for _ in range(7))

    def T(x: float, y: float, z: float):
        return (ax + x, ty + y, z)

    def tb(mb: MeshBuilder, lo, hi) -> None:
        box(mb, T(*lo), T(*hi))

    def tbeam(mb: MeshBuilder, a, b, width: float) -> None:
        beam(mb, T(*a), T(*b), width)

    def ttube(mb: MeshBuilder, a, b, radius: float, segs: int = 12) -> None:
        mb.tube(P(*T(*a)), P(*T(*b)), radius * FT, segs)

    def tplate(mb: MeshBuilder, pts, thickness: float) -> None:
        plate(mb, [T(*p) for p in pts], thickness)

    def tarch(*a) -> list:
        return [T(*p) for p in arch(*a)]

    # ---- running gear: each wheel its own node, so the truck can be driven
    road_wheel("CherryPicker_SteerWheel_1", g, M, T(wb, half_track, R), 1, False)
    road_wheel("CherryPicker_SteerWheel_2", g, M, T(wb, -half_track, R), -1, False)
    road_wheel("CherryPicker_Wheel_1", g, M, T(0, half_track, R), 1, True)
    road_wheel("CherryPicker_Wheel_2", g, M, T(0, -half_track, R), -1, True)

    # ---- chassis: ladder frame, axles, springs, driveline, tank
    for sy in (-1, 1):
        tb(chassis, (-7.9, sy * 1.4 - 0.15, 2.55), (19.6, sy * 1.4 + 0.15, 3.35))
        tb(chassis, (14.5, sy * 1.75 - 0.12, 2.0), (18.5, sy * 1.75 + 0.12, 2.2))  # front spring
        tb(chassis, (15.5, sy * 1.75 - 0.12, 1.9), (17.5, sy * 1.75 + 0.12, 2.0))
        tb(chassis, (-2.4, sy * 1.75 - 0.14, 2.1), (2.4, sy * 1.75 + 0.14, 2.4))  # rear spring
        tb(chassis, (-1.3, sy * 1.75 - 0.14, 1.95), (1.3, sy * 1.75 + 0.14, 2.1))
        for x in (14.5, 18.5, -2.4, 2.4):  # spring hangers
            tb(chassis, (x - 0.12, sy * 1.75 - 0.1, 2.15), (x + 0.12, sy * 1.75 + 0.1, 2.75))
        tb(chassis, (11.6, sy * 3.0 - 0.9 * (sy < 0), 2.5), (14.1, sy * 3.0 + 0.9 * (sy > 0), 2.62))  # cab step
        for x in (11.9, 13.8):
            tb(chassis, (x - 0.06, sy * 3.3 - 0.06, 2.62), (x + 0.06, sy * 3.3 + 0.06, 3.5))
    for x in (-7.6, -3.2, 3.0, 8.0, 12.0, 19.0):  # cross-members
        tb(chassis, (x - 0.12, -1.25, 2.7), (x + 0.12, 1.25, 3.2))
    ttube(chassis, (wb, -half_track + 0.2, R), (wb, half_track - 0.2, R), 0.2, 10)  # front axle beam
    ttube(chassis, (wb - 0.9, -2.7, R - 0.25), (wb - 0.9, 2.7, R - 0.25), 0.07, 8)  # tie rod
    ttube(chassis, (0, -half_track + 0.3, R), (0, half_track - 0.3, R), 0.36, 14)  # rear axle housing
    chassis.lathe(
        ftp([(0, -0.75), (0.6, -0.75), (0.82, -0.4), (0.82, 0.3), (0.45, 0.9), (0.25, 1.7), (0, 1.7)]),
        16,
        matrix=axes(T(0, 0, R), (0, 1, 0), (1, 0, 0)),
    )  # differential
    ttube(chassis, (1.7, 0, R + 0.05), (9.6, 0, 2.7), 0.14, 10)  # propeller shaft
    tb(chassis, (9.6, -0.7, 2.2), (12.2, 0.7, 3.3))  # gearbox
    tb(chassis, (13.4, -1.0, 2.25), (18.8, 1.0, 3.3))  # engine sump, seen under the bonnet
    ttube(chassis, (6.4, -2.75, 2.75), (10.2, -2.75, 2.75), 0.78, 20)  # fuel tank
    for x in (7.2, 9.4):
        ttube(chassis, (x - 0.07, -2.75, 2.75), (x + 0.07, -2.75, 2.75), 0.82, 20)  # its straps
        tb(chassis, (x - 0.1, -2.75, 3.3), (x + 0.1, -1.55, 3.45))
    ttube(metal, (8.3, -3.2, 3.3), (8.3, -3.45, 3.62), 0.14, 10)  # filler
    ttube(chassis, (4.0, 2.4, 2.5), (9.5, 2.4, 2.5), 0.42, 14)  # silencer
    ttube(chassis, (-1.0, 2.4, 2.75), (4.0, 2.4, 2.5), 0.12, 8)

    # ---- body: a flat bed with lockers under it, and the box at the tail the turntable stands on
    deck_z = 4.5
    tb(body, (-8.0, -4.0, 3.75), (10.4, 4.0, deck_z))
    tb(body, (-8.0, -4.0, 2.3), (-2.4, 4.0, 3.75))  # tail box
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 3.55, sy * 4.0))
        tb(body, (2.5, y0, 2.65), (6.9, y1, 3.75))  # locker
        tb(body, (6.9, y0, 2.3), (9.6, y1, 3.75))  # the forward outriggers hinge on this
        tb(trim, (2.9, sy * 4.0 - 0.03 * (sy < 0), 2.85), (6.5, sy * 4.0 + 0.03 * (sy > 0), 3.55))  # locker door
        tb(chassis, (-2.35, y0, 3.5), (2.45, y1, 3.75))  # the dark arch over the rear wheels
    tb(body, (10.4, -3.6, 3.75), (10.75, 3.6, 7.2))  # headboard behind the cab
    # on the bed: hydraulic tank, the valve bank the tower is worked from, gas bottles, a hose reel
    tb(body, (6.2, -3.5, deck_z), (9.8, -0.8, 6.5))
    ttube(metal, (7.0, -2.2, 6.5), (7.0, -2.2, 6.75), 0.22, 10)
    tb(trim, (3.2, -3.7, deck_z), (5.4, -2.9, 5.9))
    for k in range(5):
        tbeam(trim, (3.5 + k * 0.4, -3.3, 5.9), (3.5 + k * 0.4, -3.55, 6.45), 0.07)
    dome = [(0, 0), (0.25, 0.04), (0.4, 0.2), (0.45, 0.45), (0.45, 4.35), (0.4, 4.6), (0.25, 4.76), (0, 4.8)]
    for y in (3.3, 2.3, 1.3):
        light.lathe(ftp(dome), 16, matrix=axes(T(2.6, y, deck_z + 0.52), (0, 1, 0), (1, 0, 0)))
        for x in (3.6, 6.4):
            tb(trim, (x - 0.12, y - 0.4, deck_z), (x + 0.12, y + 0.4, deck_z + 0.2))
    ttube(trim, (0.4, -1.3, 5.75), (0.4, 1.3, 5.75), 0.95, 20)  # hose reel
    for y in (-1.38, 1.3):
        ttube(trim, (0.4, y, 5.75), (0.4, y + 0.08, 5.75), 1.15, 20)
        tb(trim, (0.25, y, deck_z), (0.55, y + 0.08, 5.75))
    # the control station at the rear of the transporter (documented), reached from the ground
    tb(trim, (-8.35, 1.2, 3.3), (-8.0, 3.4, 4.9))
    for k in range(4):
        tbeam(trim, (-8.35, 1.6 + k * 0.45, 4.4), (-8.75, 1.6 + k * 0.45, 4.75), 0.07)

    # ---- the truck's cab, bonnet and wings, after the International R-series
    tb(shell, (11.0, -3.2, 3.35), (15.8, 3.2, 6.1))  # cab below the waist
    hull(
        shell,
        [
            tarch(10.9, 3.1, 8.25, 8.5, 0.22),
            tarch(11.3, 3.25, 8.25, 8.68, 0.4),
            tarch(14.3, 3.25, 8.25, 8.68, 0.4),
            tarch(15.0, 3.1, 8.25, 8.45, 0.18),
        ],
    )
    hull(
        shell,
        [tarch(15.7, 2.7, 3.4, 6.0, 1.0), tarch(17.6, 2.35, 3.4, 5.85, 0.95), tarch(19.2, 1.95, 3.4, 5.55, 0.8), tarch(19.6, 1.8, 3.4, 5.3, 0.7)],
    )
    tb(shell, (11.0, -3.2, 6.1), (11.2, 3.2, 6.8))  # rear wall round its window
    tb(shell, (11.0, -3.2, 7.9), (11.2, 3.2, 8.25))
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 1.6, sy * 3.2))
        tb(shell, (11.0, y0, 6.8), (11.2, y1, 7.9))
        y0, y1 = sorted((sy * 2.9, sy * 3.2))
        tb(shell, (11.2, y0, 6.1), (11.55, y1, 8.25))  # rear corner post
        tb(shell, (13.9, sy * 3.2 - 0.12 * (sy > 0), 6.1), (14.0, sy * 3.2 + 0.12 * (sy < 0), 8.25))  # quarter-light post
        tplate(shell, [(15.45, sy * 3.05, 6.1), (15.8, sy * 3.05, 6.1), (14.85, sy * 3.05, 8.25), (14.5, sy * 3.05, 8.25)], 0.3)  # screen pillar
        tplate(glass, [(11.55, sy * 3.12, 6.1), (15.45, sy * 3.12, 6.1), (14.5, sy * 3.12, 8.25), (11.55, sy * 3.12, 8.25)], 0.04)
        # door: its shut lines, handle, and a mirror on an arm
        yo = sorted((sy * 3.17, sy * 3.23))
        for x in (11.75, 15.3):
            tb(void, (x, yo[0], 3.7), (x + 0.05, yo[1], 6.1))
        tb(void, (11.8, yo[0], 3.7), (15.3, yo[1], 3.75))
        tb(metal, (11.95, sy * 3.2 - 0.1 * (sy < 0), 5.5), (12.4, sy * 3.2 + 0.1 * (sy > 0), 5.6))
        tbeam(chassis, (15.2, sy * 3.2, 6.5), (15.5, sy * 4.3, 6.9), 0.08)
        ttube(chassis, (15.46, sy * 4.3, 7.05), (15.56, sy * 4.3, 7.05), 0.36, 16)
        ttube(metal, (15.4, sy * 4.3, 7.05), (15.46, sy * 4.3, 7.05), 0.32, 16)
        # wing: up over the wheel, level forward to the headlight, then down to the bumper
        crown, nose_x, nose_r = R + 2.35, 19.0, 0.9
        path = [
            (wb + 2.35 * math.cos(a), R + 2.35 * math.sin(a), math.cos(a), math.sin(a)) for a in (math.radians(175 - 85 * k / 8) for k in range(9))
        ]
        path += [
            (nose_x + nose_r * math.cos(a), crown - nose_r + nose_r * math.sin(a), math.cos(a), math.sin(a))
            for a in (math.radians(90 - 15 * k) for k in range(7))
        ]
        path.append((nose_x + nose_r, 2.6, 1.0, 0.0))
        skin = [
            (-0.85, 0.0),
            (0.6, 0.0),
            (0.85, -0.2),
            (0.85, -0.75),
            (0.75, -0.75),
            (0.75, -0.25),
            (0.55, -0.1),
            (-0.85, -0.1),
        ]  # across, and in from the skin
        skin = skin if sy < 0 else skin[::-1]
        hull(shell, [[T(x + nx * b, sy * (half_track + a), z + nz * b) for a, b in skin] for x, z, nx, nz in path])
        ttube(shell, (19.2, sy * 3.15, 3.55), (19.86, sy * 3.15, 3.55), 0.46, 20)
        ttube(metal, (19.86, sy * 3.15, 3.55), (19.98, sy * 3.15, 3.55), 0.46, 20)
        ttube(lamps, (19.98, sy * 3.15, 3.55), (20.02, sy * 3.15, 3.55), 0.38, 20)
    tplate(glass, [(15.62, -2.9, 6.1), (15.62, 2.9, 6.1), (14.67, 2.9, 8.25), (14.67, -2.9, 8.25)], 0.04)  # windscreen
    tb(glass, (11.08, -1.6, 6.8), (11.12, 1.6, 7.9))
    tplate(void, [(11.35, 0, 6.02), (15.3, 0, 6.02), (14.4, 0, 8.2), (11.35, 0, 8.2)], 5.8)  # the unlit inside, seen through the glass
    tb(shell, (17.9, -2.5, 2.9), (19.9, 2.5, 3.4))  # apron under the grille
    # grille: five slots under the badge, bars below
    for k in range(5):
        y = (k - 2) * 0.36
        tb(void, (19.5, y - 0.11, 4.3), (19.64, y + 0.11, 4.95))
    tb(void, (19.5, -1.55, 3.5), (19.63, 1.55, 4.1))
    for z in (3.68, 3.9):
        tb(shell, (19.55, -1.6, z), (19.68, 1.6, z + 0.09))
    tb(metal, (19.52, -0.16, 5.02), (19.66, 0.16, 5.2))
    tb(body, (19.95, -4.0, 2.0), (20.3, 4.0, 2.85))  # bumper
    tb(light, (20.3, -0.55, 2.2), (20.34, 0.55, 2.65))  # number plate
    # the frame on the bumper that the folded jib rests in for the road
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 1.95, sy * 2.25))
        tb(body, (20.3, y0, 2.0), (20.6, y1, 10.0))
        tbeam(body, (20.45, sy * 2.1, 9.9), (20.45, sy * 2.55, 10.9), 0.24)
        tbeam(body, (20.45, sy * 1.95, 3.1), (20.45, sy * 0.1, 9.05), 0.2)
    tb(body, (20.32, -1.95, 9.0), (20.58, 1.95, 9.3))

    # ---- outriggers: four legs that swing down and out, each driven by a ram
    for xh, fore in ((8.25, 1), (-5.2, -1)):
        for sy in (-1, 1):
            H, F = Vector(T(xh, sy * 3.9, 3.2)), Vector(T(xh + fore * 2.6, sy * 10.4, 0.42))
            d = (F - H).normalized()
            s = Vector((0, 0, 1)).cross(d).normalized()
            t = d.cross(s)

            def loop(c, a, b, s=s, t=t):
                return [c + s * a - t * b, c + s * a + t * b, c - s * a + t * b, c - s * a - t * b]

            hull(body, [loop(H, 0.5, 0.75), loop(F, 0.38, 0.24)])
            flat = Vector((d.x, d.y, 0)).normalized()
            body.box((3.0 * FT, 1.15 * FT, 0.2 * FT), axes(F - flat * 0.5 + Vector((0, 0, 0.1 - F.z)), flat, (0, 0, 1)))  # skid
            top, low = Vector(T(xh + fore * 0.2, sy * 4.0, 5.0)), H + d * ((F - H).length * 0.78) + t * 0.55
            tb(body, (xh + fore * 0.2 - 0.3, sy * 4.0 - 0.3 * (sy < 0), 3.9), (xh + fore * 0.2 + 0.3, sy * 4.0 + 0.3 * (sy > 0), 5.3))
            mid = top + (low - top) * 0.6
            light.tube(top * FT, mid * FT, 0.3 * FT, 14)
            metal.tube(mid * FT, low * FT, 0.13 * FT, 10)

    # ---- turntable at the tail, the mast's foot, its two rams, the winch
    px, pz = PICKER_PIVOT
    trim.lathe(ftp([(0, 0), (2.7, 0), (2.7, 0.3), (0, 0.3)]), 40, matrix=Matrix.Translation(P(*T(px, 0, deck_z))))  # slew ring
    if fine():
        for k in range(24):
            a = TAU * k / 24
            trim.disc(P(*T(px + 2.55 * math.cos(a), 2.55 * math.sin(a), deck_z + 0.3)), (0, 0, 1), 0.07 * FT, 0.08 * FT, 6)
    body.lathe(ftp([(2.4, 0.2), (2.4, 1.2), (0, 1.2)]), 40, matrix=Matrix.Translation(P(*T(px, 0, deck_z))))
    tb(body, (px - 2.9, -2.2, deck_z + 1.2), (px + 3.1, 2.2, deck_z + 1.4))
    cheek = [(-1.7, deck_z + 1.4), (1.7, deck_z + 1.4), (0.95, pz + 0.3), (0.5, pz + 0.75), (-0.5, pz + 0.75), (-0.95, pz + 0.3)]
    for sy in (-1, 1):
        plate(body, [T(px + x, sy * 1.75, z) for x, z in cheek], 0.25)
    ttube(metal, (px, -2.05, pz), (px, 2.05, pz), 0.28, 14)
    ttube(trim, (px - 2.1, -1.5, deck_z + 2.0), (px - 2.1, 1.5, deck_z + 2.0), 0.55, 16)  # winch
    for y in (-1.6, 1.5):
        tb(trim, (px - 2.7, y, deck_z + 1.4), (px - 1.5, y + 0.1, deck_z + 2.7))

    # mast and jib: the pin at the mast's foot, the elbow, and the cab's hanger pin fix the pose
    cab_c = Vector((6.6, 0.0, HATCH_HEIGHT + 1.2))
    pin = Vector(T(px, 0, pz))
    hang = cab_c + Vector((3.3, 0, 2.3))
    span = hang - pin
    along = (PICKER_MAST**2 - PICKER_JIB**2 + span.length_squared) / (2 * span.length)
    off = math.sqrt(PICKER_MAST**2 - along**2)
    elbow = pin + span.normalized() * along + Vector((span.z, 0, -span.x)).normalized() * off  # the higher of the two solutions
    side = Vector((0, 1, 0))
    u = (elbow - pin).normalized()
    v = Vector((u.z, 0, -u.x))  # across the mast, toward the truck's nose

    def mast(i: int, s: float):
        wide = 1.3 - 0.2 * s / PICKER_MAST
        deep = 0.45 + 1.05 * min(1.0, (s - 1.0) / 6.0) - 0.4 * max(0.0, (s - 7.0) / PICKER_MAST)
        return tuple(pin + u * s + side * wide * (1 if i < 2 else -1) + v * deep * (1 if i in (0, 3) else -1))

    head = PICKER_MAST - 10.0
    truss(boom, mast, [1.0, 7.0, *[7.0 + (head - 7.0) * k / 10 for k in range(1, 11)]], 0.36, 0.2)
    for sy in (-1, 1):  # the head: two plates carrying the elbow pin and its sheaves
        plate(
            boom,
            [
                tuple(pin + u * s + v * w + side * sy * 1.25)
                for s, w in ((head - 0.5, -1.1), (head - 0.5, 1.1), (PICKER_MAST + 0.4, 0.95), (PICKER_MAST + 1.2, 0.0), (PICKER_MAST + 0.4, -0.95))
            ],
            0.2,
        )
        centre = elbow + side * sy * 1.75  # a spoked sheave: grooved rim, hub, six spokes
        boom.lathe(
            ftp([(1.62, -0.14), (1.9, -0.14), (1.78, 0.0), (1.9, 0.14), (1.62, 0.14), (1.62, -0.14)]), 32, matrix=axes(tuple(centre), u, side * sy)
        )
        boom.lathe(ftp([(0, -0.2), (0.4, -0.2), (0.4, 0.2), (0, 0.2)]), 16, matrix=axes(tuple(centre), u, side * sy))
        for k in range(6):
            spoke = u * math.cos(TAU * k / 6) + v * math.sin(TAU * k / 6)
            beam(boom, tuple(centre + spoke * 0.3), tuple(centre + spoke * 1.68), 0.16)
        # hoist line down the back of the mast to the winch, and the line along the jib that keeps the cab level
        cable.tube((elbow - v * 1.82 + side * sy * 1.75) * FT, P(*T(px - 2.1, sy * 1.2, deck_z + 2.5)), 0.045 * FT, 6)
    boom.tube((elbow - side * 2.0) * FT, (elbow + side * 2.0) * FT, 0.25 * FT, 12)
    # rams that raise the mast: barrel pinned to the turntable, rod to a cross-beam on the mast
    rs = 13.0
    beam(boom, tuple(pin + u * rs + v * 2.2 - side * 1.5), tuple(pin + u * rs + v * 2.2 + side * 1.5), 0.3)
    for i in (0, 3):
        beam(boom, mast(i, rs), tuple(pin + u * rs + v * 2.2 + side * (1.3 if i == 0 else -1.3)), 0.24)
    for sy in (-1, 1):
        foot, top = Vector(T(px + 2.5, sy * 0.95, deck_z + 1.5)), pin + u * rs + v * 2.2 + side * sy * 0.95
        mid = foot + (top - foot) * 0.62
        light.tube(foot * FT, mid * FT, 0.42 * FT, 16)
        metal.tube(mid * FT, top * FT, 0.2 * FT, 12)
        tb(body, (px + 2.2, sy * 0.95 - 0.3, deck_z + 1.4), (px + 2.8, sy * 0.95 + 0.3, deck_z + 1.75))

    w = (hang - elbow).normalized()
    n = Vector((-w.z, 0, w.x))
    n = n if n.z > 0 else -n

    def jib(i: int, s: float):
        k = s / PICKER_JIB
        return tuple(elbow + w * s + side * (0.85 - 0.25 * k) * (1 if i < 2 else -1) + n * (1.1 - 0.5 * k) * (1 if i in (0, 3) else -1))

    stations = [2.6 + (PICKER_JIB - 4.4) * k / 12 for k in range(13)]
    truss(boom, jib, stations, 0.26, 0.15)
    for i in range(4):  # the chords run in to the pins at each end
        sy = 1 if i < 2 else -1
        beam(boom, jib(i, stations[0]), tuple(elbow + side * sy * 0.85), 0.26)
        beam(boom, jib(i, stations[-1]), tuple(hang + side * sy * 0.6), 0.26)
    for sy in (-1, 1):
        cable.tube((elbow + n * 1.82 + side * sy * 1.75) * FT, (hang + n * 0.92 + side * sy * 1.3) * FT, 0.045 * FT, 6)

    # ---- the cab at the jib's tip: an open-fronted box the pilot steps into from the hatch
    c = cab_c
    box(cab, (c.x - 2.2, c.y - 2.4, c.z - 3.5), (c.x + 2.2, c.y + 2.4, c.z - 3.2))  # floor
    box(cab, (c.x - 2.2, c.y - 2.4, c.z + 3.3), (c.x + 2.2, c.y + 2.4, c.z + 3.6))  # roof
    box(cab, (c.x + 1.95, c.y - 2.4, c.z - 3.2), (c.x + 2.2, c.y + 2.4, c.z + 3.3))  # back wall
    box(metal, (c.x - 2.1, c.y - 2.1, c.z - 3.2), (c.x + 1.9, c.y + 2.1, c.z - 3.15))  # tread plate
    box(metal, (c.x - 2.9, c.y - 1.6, c.z - 3.48), (c.x - 2.2, c.y + 1.6, c.z - 3.38))  # sill plate toward the hatch
    for sy in (-1, 1):
        y0, y1 = sorted((c.y + sy * 2.16, c.y + sy * 2.4))
        box(cab, (c.x - 0.8, y0, c.z - 3.2), (c.x + 1.95, y1, c.z + 0.2))  # side: panel below, window above
        box(cab, (c.x - 0.8, y0, c.z + 2.9), (c.x + 1.95, y1, c.z + 3.3))
        box(cab, (c.x - 0.8, y0, c.z + 0.2), (c.x - 0.6, y1, c.z + 2.9))
        box(glass, (c.x - 0.6, c.y + sy * 2.28 - 0.02, c.z + 0.2), (c.x + 1.95, c.y + sy * 2.28 + 0.02, c.z + 2.9))
        y0, y1 = sorted((c.y + sy * 2.1, c.y + sy * 2.46))
        for x0, x1 in ((c.x - 2.26, c.x - 1.96), (c.x + 1.9, c.x + 2.26)):  # corner posts, standing proud
            box(cab, (x0, y0, c.z - 3.56), (x1, y1, c.z + 3.66))
        y0, y1 = sorted((c.y + sy * 2.3, c.y + sy * 2.45))
        box(cab, (c.x - 1.96, y0, c.z + 3.25), (c.x + 1.9, y1, c.z + 3.65))  # roof edge
        box(chassis, (c.x - 1.96, y0, c.z - 3.55), (c.x + 1.9, y1, c.z - 2.8))  # toe board
        for h in (1.75, 3.5):  # rails across the open part of each side
            beam(chassis, (c.x - 1.96, c.y + sy * 2.3, c.z - 3.2 + h), (c.x - 0.8, c.y + sy * 2.3, c.z - 3.2 + h), 0.13)
        blue.lathe(ftp([(0.62, 0.0), (0.62, 0.04), (0.0, 0.04)]), 24, matrix=axes((c.x + 0.6, c.y + sy * 2.4, c.z - 1.5), (1, 0, 0), (0, sy, 0)))
        # hanger: two plates off the back wall to the pin at the jib's tip
        y0, y1 = sorted((c.y + sy * 0.95, c.y + sy * 1.1))
        box(cab, (c.x + 2.26, y0, c.z + 1.3), (hang.x + 0.6, y1, c.z + 3.3))
        boom.lathe(ftp([(0, -0.08), (0.95, -0.08), (0.95, 0.08), (0, 0.08)]), 28, matrix=axes(tuple(hang + side * sy * 1.3), (1, 0, 0), side * sy))
    box(cab, (c.x + 2.1, c.y - 2.1, c.z + 3.25), (c.x + 2.25, c.y + 2.1, c.z + 3.65))
    box(cab, (c.x - 2.25, c.y - 2.1, c.z + 3.25), (c.x - 2.1, c.y + 2.1, c.z + 3.65))
    box(chassis, (c.x + 2.1, c.y - 2.1, c.z - 3.55), (c.x + 2.25, c.y + 2.1, c.z - 2.8))
    boom.tube((hang - side * 1.45) * FT, (hang + side * 1.45) * FT, 0.2 * FT, 12)
    beam(chassis, (c.x + 1.75, c.y - 1.9, c.z + 0.3), (c.x + 1.75, c.y + 1.9, c.z + 0.3), 0.12)  # grab rail
    for y in (-1.9, 1.9):
        beam(chassis, (c.x + 1.75, c.y + y, c.z + 0.3), (c.x + 1.97, c.y + y, c.z + 0.3), 0.1)
    box(trim, (c.x + 1.6, c.y + 0.7, c.z + 0.8), (c.x + 1.95, c.y + 1.7, c.z + 1.8))  # the push-button box for the programmed descent

    body.build("CherryPicker_Carrier", M["yellow"], g, smooth=False)
    shell.build("CherryPicker_TruckCab", M["yellow"], g, sharp_angle=35)
    chassis.build("CherryPicker_Chassis", M["chassis"], g, sharp_angle=30)
    trim.build("CherryPicker_RunningGear", M["grey"], g, sharp_angle=30)
    lamps.build("CherryPicker_Headlights", M["lamp"], g)
    boom.build("CherryPicker_Boom", M["yellow"], g, sharp_angle=30)
    light.build("CherryPicker_Cylinders", M["white"], g, sharp_angle=30)
    metal.build("CherryPicker_Brightwork", M["deck"], g, sharp_angle=30)
    cable.build("CherryPicker_Cables", M["cable"], g)
    cab.build("CherryPicker_Cab", M["yellow"], g, smooth=False)
    blue.build("CherryPicker_Insignia", M["blue"], g)
    glass.build("CherryPicker_Windows", M["glass"], g, smooth=False)
    void.build("CherryPicker_WindowWells", M["void"], g, smooth=False)


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
