"""The launch stand: the northernmost bay of the stand and ramp, "approximately 60' wide x 78' long", a steel frame
under a concrete slab 22 ft over the ground, "with a balustrade along the edges constructed of 1-1/2 in standard pipe
rail" (HAER FL-8-7, p. 20). On it the Atlas's launcher, whose "two steel arms ... attached to the base of the launch
vehicle" and "released through air pressure when sufficient thrust built"; under it the flame bucket, turning the
exhaust north into the flume; and the water: "deluge and spray systems ... released approximately 30,000 gallons of
water per minute during engine operation" (the same page).

  LaunchStand     the deck, its steel frame and the two pylons under the launcher, the pipe rail, the huts on the deck
  Launcher        the launcher's frame round the opening, its work platform, and `Launcher_Arm_1`/`_2`, each on its hinge
  FlameDeflector  the bucket under the opening and its side walls

Only the stand's size and height are published. Its frame, the opening, the launcher and the bucket are scaled off the
photographs named beside each (../lc-14.md, "The stand"), in feet off the Atlas's 10 ft tank: estimated.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from srlib import FT

from .site import (
    APRON,
    FOOTING,
    GROUND,
    LAUNCHER_TOP,
    RAMP_W,
    STAND_N,
    STAND_S,
    STAND_W,
    P,
    Parts,
    beam,
    box,
    fine,
    ftp,
    handrail,
    obox,
    ring,
    stair_rails,
    stairs,
    window,
)

HALF = STAND_W / 2
SLAB = 1.0  # the deck's slab (estimated)
# The opening in the deck under the engines: the booster engines hang in it (NASA GPN-2000-000998; S62-00380 from
# below). Estimated: 18 ft along the pitch axis, on which the two boosters lie 5 ft either side of the vehicle's, and 14 ft across.
OPEN_X, OPEN_Y = 9.0, 7.0
# The frame: columns down both long sides and across each end, a row either side of the opening (HAER Figure 7, the
# stand as steel in 1956: bents some 15 ft apart, braced, and two tapering pylons flanking the opening). Estimated.
BENTS = [STAND_S + 0.9 + (STAND_N - STAND_S - 1.8) * k / 5 for k in range(6)]
COL = 1.2
PYLON_X = OPEN_X + 4.5
# The huts on the deck beside the launcher (NASA GPN-2000-000609: two, south of the vehicle on the west half of the
# deck, each about 8 ft square under a flat roof, windows all round). What they held is not in anything read.
HUTS = ((-22.0, -26.0), (-22.0, -38.0))
HUT = 8.0
GANGWAY = (6.6, 11.4)  # where the deck's west rail is open for the service structure's gangway, along the stand (service_structure.py)


def deck(parts: Parts) -> None:
    g = "LaunchStand"
    slabs = parts(g, "concrete")
    # the slab in four pieces round the opening, and a steel curb round the opening's edge
    box(slabs, (-HALF, STAND_S, -SLAB), (HALF, -OPEN_Y, 0.0))
    box(slabs, (-HALF, OPEN_Y, -SLAB), (HALF, STAND_N, 0.0))
    box(slabs, (-HALF, -OPEN_Y, -SLAB), (-OPEN_X, OPEN_Y, 0.0))
    box(slabs, (OPEN_X, -OPEN_Y, -SLAB), (HALF, OPEN_Y, 0.0))
    steel = parts(g, "grey", True)
    for x0, x1, y0, y1 in (
        (-OPEN_X - 0.4, OPEN_X + 0.4, -OPEN_Y - 0.4, -OPEN_Y + 0.02),
        (-OPEN_X - 0.4, OPEN_X + 0.4, OPEN_Y - 0.02, OPEN_Y + 0.4),
        (-OPEN_X - 0.4, -OPEN_X + 0.02, -OPEN_Y + 0.02, OPEN_Y - 0.02),
        (OPEN_X - 0.02, OPEN_X + 0.4, -OPEN_Y + 0.02, OPEN_Y - 0.02),
    ):
        box(steel, (x0, y0, -SLAB - 0.6), (x1, y1, 0.08))


def frame(parts: Parts) -> None:
    """The steel under the deck: bents of columns with a girt half way up and the end bays braced, the deck's
    girders, and the two tapering pylons the launcher stands on."""
    g = "LaunchStand"
    steel = parts(g, "grey/frame")
    foot_z, head_z, mid_z = GROUND - FOOTING, -SLAB - 1.6, APRON + 10.5
    xs = (-HALF + 0.9, HALF - 0.9)
    for y in BENTS:
        for x in xs:
            box(steel, (x - COL / 2, y - COL / 2, foot_z), (x + COL / 2, y + COL / 2, head_z))
        inner = [x for x in (-PYLON_X - 6.0, PYLON_X + 6.0) if abs(y) > OPEN_Y + 2.0] + ([0.0] if abs(y) > OPEN_Y + 12.0 else [])
        for x in inner:
            box(steel, (x - COL / 2, y - COL / 2, foot_z), (x + COL / 2, y + COL / 2, head_z))
        # the cross girder under the deck, in two lengths where the bucket is
        if abs(y) > OPEN_Y + 2.0:
            box(steel, (-HALF + 0.2, y - 0.45, head_z), (HALF - 0.2, y + 0.45, -SLAB))
        else:
            for s in (-1, 1):
                x0, x1 = sorted((s * (OPEN_X + 0.6), s * (HALF - 0.2)))
                box(steel, (x0, y - 0.45, head_z), (x1, y + 0.45, -SLAB))
    for x in xs:  # along each side: the girder under the deck's edge, a girt half way up, and an X in each end bay
        box(steel, (x - 0.4, BENTS[0], head_z + 0.02), (x + 0.4, BENTS[-1], -SLAB - 0.02))
        beam(steel, (x, BENTS[0], mid_z), (x, BENTS[-1], mid_z), 0.7)
        for ya, yb in ((BENTS[0], BENTS[1]), (BENTS[-2], BENTS[-1])):
            for za, zb in ((APRON + 0.5, mid_z), (mid_z, head_z)):
                beam(steel, (x, ya, za), (x, yb, zb), 0.5)
                beam(steel, (x, yb, za), (x, ya, zb), 0.5)
    # the pylons: tapering steel boxes either side of the opening, from the ground to the launcher's feet
    for s in (-1, 1):
        lo = [(s * (PYLON_X - 4.0), -5.5), (s * (PYLON_X + 4.0), -5.5), (s * (PYLON_X + 4.0), 5.5), (s * (PYLON_X - 4.0), 5.5)]
        hi = [(s * (PYLON_X - 2.2), -3.2), (s * (PYLON_X + 2.2), -3.2), (s * (PYLON_X + 2.2), 3.2), (s * (PYLON_X - 2.2), 3.2)]
        if s < 0:
            lo, hi = lo[::-1], hi[::-1]
        za, zb = GROUND - FOOTING, -SLAB - 0.62
        verts = [tuple(P(x, y, za)) for x, y in lo] + [tuple(P(x, y, zb)) for x, y in hi]
        parts(g, "grey/pylons").add(verts, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)])


def rails_and_huts(parts: Parts) -> None:
    g = "LaunchStand"
    rail = parts(g, "galv/rail")
    e = HALF - 0.35
    # the pipe rail round the deck, open where the ramp comes on at the south end
    # (and on the west side where the service structure's gangway comes on to the deck: service_structure.GANGWAY_Y)
    handrail(rail, [(-RAMP_W / 2 - 0.3, STAND_S + 0.35, 0), (-e, STAND_S + 0.35, 0), (-e, GANGWAY[0], 0)])
    handrail(
        rail, [(-e, GANGWAY[1], 0), (-e, STAND_N - 0.35, 0), (e, STAND_N - 0.35, 0), (e, STAND_S + 0.35, 0), (RAMP_W / 2 + 0.3, STAND_S + 0.35, 0)]
    )
    for k, (x, y) in enumerate(HUTS, 1):
        walls = ring([(x, y), (x + HUT, y), (x + HUT, y + HUT), (x, y + HUT)], 0.25)
        skin = parts(g, f"white/hut{k}")
        for i, w in enumerate(walls):
            if i == 1:  # the side toward the launcher: the door, built shut (what the hut held is not recorded)
                w.build(skin, 0.0, 8.2, [(2.6, 5.4, 0.0, 6.8)])
                w.box(parts(g, f"grey/hut{k}door"), 2.6, 5.4, 0.08, 0.2, 0.0, 6.8)
            else:
                w.build(skin, 0.0, 8.2, [(1.4, 6.6, 3.4, 6.6)])
                window(parts, g, w, 1.4, 6.6, 3.4, 6.6, mullions=[4.0], pane="void")
        box(parts(g, "aluminium/hutroofs"), (x - 0.5, y - 0.5, 8.2), (x + HUT + 0.5, y + HUT + 0.5, 8.55))


def deluge(parts: Parts) -> None:
    """The water: a main up the stand's west face to a ring round the opening under the deck, with its spray heads
    looking in at the bucket (HAER, p. 20: that there were deluge and spray systems; their form here is estimated
    from NASA GPN-2000-000609, whose west face is a gallery of large pipes)."""
    g = "LaunchStand"
    pipe = parts(g, "pipe", True)
    r = 0.55 * FT
    z = -SLAB - 3.2
    x0, x1, y0, y1 = -OPEN_X - 2.6, OPEN_X + 2.6, -OPEN_Y - 2.6, OPEN_Y + 2.6
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    for (xa, ya), (xb, yb) in zip(corners, corners[1:] + corners[:1]):
        pipe.tube(P(xa, ya, z), P(xb, yb, z), r, 12)
    # its main: south under the deck, clear of where the service structure's leg stands, and down the stand's south-west
    # corner to the ground
    ys = STAND_S + 3.0
    pipe.tube(P(x0, y0, z), P(x0, ys, z), r, 12)
    pipe.tube(P(x0, ys, z), P(-HALF + 3.0, ys, z), r, 12)
    pipe.tube(P(-HALF + 3.0, ys, z), P(-HALF + 3.0, ys, APRON + 0.8), r, 12)
    # the gallery on the west face: three lines the length of the stand, one over another on brackets (what each
    # carried is not read), inside the line the service structure's leg passes on
    for dz, rr in ((-4.0, 0.5), (-5.6, 0.4), (-7.0, 0.3)):
        pipe.tube(P(-HALF - 0.6, STAND_S, dz), P(-HALF - 0.6, STAND_N - 2.0, dz), rr * FT, 10)
    for y in BENTS:
        box(parts(g, "grey/brackets"), (-HALF - 1.0, y - 0.15, -7.6), (-HALF + 0.31, y + 0.15, -7.35))
    if fine():
        heads = parts(g, "grey/sprayheads", True)
        for i in range(-2, 3):
            for y, n in ((y0, (0, 1, -0.35)), (y1, (0, -1, -0.35))):
                heads.lathe(ftp([(0.0, 0.0), (0.18, 0.0), (0.3, 0.7), (0.0, 0.7)]), 8, matrix=_aim(P(i * 3.4, y, z), n))


def _aim(at, direction) -> Matrix:
    return Matrix.Translation(at) @ Vector((0, 0, 1)).rotation_difference(Vector(direction).normalized()).to_matrix().to_4x4()


def deflector(parts: Parts) -> None:
    """The flame bucket: a curved steel plate under the opening that turns the exhaust north, out under the stand's
    north edge into the flume, between two side walls. Its curve is ours: nothing read draws it."""
    g = "FlameDeflector"
    parts.node(g, None, (0.0, 0.0, 0.0))
    plate_, walls = parts(g, "scorched", True), parts(g, "scorched/walls")
    w = OPEN_X + 1.6
    ys = [-OPEN_Y - 2.0 + (STAND_N + 0.4 + OPEN_Y + 2.0) * k / 14 for k in range(15)]
    xs = [-w, w]

    def z_at(y: float) -> float:
        t = (y - ys[0]) / (ys[-1] - ys[0])
        return -SLAB - 2.2 + (APRON + 2.0 + SLAB + 2.2) * (1.0 - (1.0 - t) ** 2.6)

    def surf(x: float, y: float, off: float):
        return tuple(P(x, y, z_at(y) + off))

    plate_.grid(lambda x, y: surf(x, y, 0.15), xs, ys, flip=False)
    plate_.grid(lambda x, y: surf(x, y, -0.15), xs, ys, flip=True)
    for s in (-1, 1):  # the side walls, from the plate up to the deck's girders, as far north as the stand goes
        x0, x1 = sorted((s * w, s * (w + 0.5)))
        for ya, yb in zip(ys, ys[1:]):
            if ya >= STAND_N - 0.5:
                break
            box(walls, (x0, ya, min(z_at(ya), z_at(yb)) - 0.4), (x1, yb, -SLAB - 1.7))
    # the back wall, behind the plate's head
    box(walls, (-w, ys[0] - 0.5, z_at(ys[0]) - 0.4), (w, ys[0], -SLAB - 1.7))


def launcher(parts: Parts) -> None:
    """The Atlas's launcher: a steel frame round the opening on the two pylons, four posts the booster section's
    longerons rest on, the work platform round the vehicle's foot with its rail, and the two hold-down arms, each an
    A-frame on a hinge on the frame that falls back from the vehicle as it is released. The arms' places (fore and aft
    of the vehicle, on the stand's long axis, between the two pods) and their form are read off NASA GPN-2000-000998
    (from the ramp: an A-frame square in front of the vehicle) and the photograph of 23 January 1962 (from the side:
    the platform and its rail). Estimated throughout; the documented part is that there were two arms and how they let go."""
    g = "Launcher"
    parts.node(g, None, (0.0, 0.0, 0.0))
    steel, deckp, rail = parts(g, "grey", True), parts(g, "deck"), parts(g, "galv/rail")
    fx, fy = OPEN_X + 3.0, OPEN_Y + 2.4
    # the base frame: box girders on the deck round the opening
    for x0, x1, y0, y1 in (
        (-fx, fx, -fy, -OPEN_Y - 0.6),
        (-fx, fx, OPEN_Y + 0.6, fy),
        (-fx, -OPEN_X - 0.6, -OPEN_Y - 0.6, OPEN_Y + 0.6),
        (OPEN_X + 0.6, fx, -OPEN_Y - 0.6, OPEN_Y + 0.6),
    ):
        box(steel, (x0, y0, 0.0), (x1, y1, 1.5))
    # four posts leaning in to the booster section's foot, a rest on each (the vehicle's weight)
    for sx in (-1, 1):
        for sy in (-1, 1):
            top = (sx * 3.9, sy * 3.9, LAUNCHER_TOP + 1.2)
            beam(steel, (sx * (OPEN_X + 1.8), sy * (OPEN_Y + 1.5), 1.2), top, 0.9)
            obox(steel, (top[0], top[1], top[2] + 0.25), (sx, sy, 0), (0, 0, 1), (1.4, 1.0, 0.5))
    # the work platform: a gallery round the vehicle's foot at the engines' level, railed outside, open fore and aft
    # where the arms stand through it
    zp, a, b, gap = LAUNCHER_TOP - 0.2, 6.2, 8.8, 4.6
    for x0, x1, y0, y1 in ((-b, -a, -b, b), (a, b, -b, b), (-a, -gap, -b, -a), (gap, a, -b, -a), (-a, -gap, a, b), (gap, a, a, b)):
        box(deckp, (x0, y0, zp - 0.25), (x1, y1, zp))
    for sx in (-1, 1):
        for sy in (-1, 1):
            beam(steel, (sx * (b - 0.6), sy * (OPEN_Y + 1.5), 1.2), (sx * (b - 0.6), sy * (OPEN_Y + 1.5), zp - 0.26), 0.5)
    r = b - 0.2
    handrail(rail, [(-r, -b + 3.6, zp), (-r, r, zp), (-gap, r, zp)])
    handrail(rail, [(gap, r, zp), (r, r, zp), (r, -r, zp), (gap, -r, zp)])
    handrail(rail, [(-gap, -r, zp), (-r, -r, zp)])
    # steps up to it from the deck, on the west side at its south end
    stairs(steel, (-b - 6.2, -b + 1.9, 0.0), (-b, -b + 1.9, zp), 2.6)
    stair_rails(rail, (-b - 6.2, -b + 1.9, 0.0), (-b, -b + 1.9, zp), 2.6, 3.0)
    # the two arms
    for k, sy in enumerate((-1, 1), 1):
        name = f"Launcher_Arm_{k}"
        hinge = (0.0, sy * (OPEN_Y + 1.5), 2.1)
        parts.node(name, g, hinge)
        arm = parts(name, "black", True)
        head = (0.0, sy * 5.5, LAUNCHER_TOP + 3.4)
        for sx in (-1, 1):
            beam(arm, (sx * 3.4, hinge[1], hinge[2]), head, 0.85)
        beam(arm, (-3.9, hinge[1], hinge[2]), (3.9, hinge[1], hinge[2]), 0.7)
        mid = ((hinge[1] + head[1]) / 2, (hinge[2] + head[2]) / 2)
        beam(arm, (-1.7, mid[0], mid[1]), (1.7, mid[0], mid[1]), 0.5)
        obox(arm, (0.0, sy * 5.15, LAUNCHER_TOP + 3.4), (1, 0, 0), (0, 0, 1), (1.6, 1.3, 1.1))  # the head that holds the fitting
        # its cylinder, from the deck behind the frame up to the arm's back
        parts(name, "chrome/ram", True).tube(P(0.0, sy * (fy + 3.2), 0.6), P(0.0, mid[0] + sy * 0.5, mid[1]), 0.22 * FT, 10)
        ya, yb = sorted((hinge[1] - 0.7, hinge[1] + 0.7))
        box(steel, (-4.3, ya, 1.2), (4.3, yb, 1.75))  # its bearing blocks, on the frame


def build(parts: Parts) -> None:
    parts.node("LaunchStand", None, (0.0, 0.0, 0.0))
    deck(parts)
    frame(parts)
    rails_and_huts(parts)
    deluge(parts)
    deflector(parts)
    launcher(parts)


def arm_fall() -> float:
    """How far each hold-down arm falls back from the vehicle, degrees about its hinge: clear of the booster engines' fairings (estimated)."""
    return math.degrees(math.atan2(4.0, LAUNCHER_TOP + 1.5))
