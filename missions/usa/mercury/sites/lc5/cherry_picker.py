"""The mobile aerial tower, the "cherry picker" (TM X-53107 7.3.3.1, p. 7-38): it could reach 125
ft; its cab stood at the capsule hatch from T-55 min, once the service structure had rolled back;
it could be worked from the ground at the rear of the truck, from the cab, or from the blockhouse,
whose pushbuttons "actuated a programmed descent away and down from the MERCURY-REDSTONE vehicle".
It stood about 65 ft from the launcher (This New Ocean p. 329: MR-BD's stand-in truck), on the
hatch side (Figure 7-6). At liftoff the truck was still there, boom up, its cab lowered to the pad
beside it (S61-01927, S61-02408, 6100884).

An International Harvester R-series truck carrying a turntable at its tail, a lattice mast raised
by two rams, and a lattice jib hinged at the mast's head with the cab hung at its tip. Mast and
jib are sized so the jib alone can lower the cab to the pad on the vehicle's side of the truck,
as the liftoff photographs show it; only the 125 ft reach is published.

Moving parts, each a node with its origin on its pivot (see ../lc-5.md for the angles):
  CherryPicker_Mast          the mast, on the turntable's pin; carries
    CherryPicker_Jib         the jib, on the pin at the mast's head; carries
      CherryPicker_Cab       the cab, on its hanger pin, so it can be kept level
  CherryPicker_Outrigger_n   the four outriggers, on their hinges at the body
  CherryPicker_Wheel_n, CherryPicker_SteerWheel_n   the road wheels, on their hubs
Truck coordinates below: X forward from the rear axle (the truck faces +X, away from the pad),
Y to the driver's left, Z up from the ground.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from srlib import FT, TAU

from .site import HATCH_Z, P, Parts, arch, axes, beam, box, fine, ftp, hull, plate, truss

REAR_AXLE = (71.5, 0.0)  # where the rear axle's middle stands
WHEELBASE = 16.5
TRACK = 6.5  # between the centres of the front wheels, and of the rear dual pairs
TYRE_R = 1.73  # a 10.00-20 truck tyre, 41.5 in across
PIVOT = (-4.5, 7.0)  # the mast's foot pin: behind the rear axle, and above the ground
MAST = 70.0  # foot pin to the head's pin
JIB = 72.0  # head pin to the cab's hanger pin
DECK_Z = 4.5
CAB = Vector((6.6, 0.0, HATCH_Z + 1.2))  # the cab's middle, its open side 1.5 ft off the capsule at the hatch
HANG = CAB + Vector((3.3, 0.0, 2.3))  # the hanger pin, above the cab's back wall
CAB_GROUND = 0.25  # the cab's floor on the pad when lowered


def pose() -> dict:
    """The pins in the T-55 pose (site feet), and the angles of the stow, all about the Y axis."""
    ax, ty = REAR_AXLE
    pin = Vector((ax + PIVOT[0], ty, PIVOT[1]))
    span = HANG - pin
    along = (MAST**2 - JIB**2 + span.length_squared) / (2 * span.length)
    off = math.sqrt(MAST**2 - along**2)
    elbow = pin + span.normalized() * along + Vector((span.z, 0, -span.x)).normalized() * off  # the higher of the two
    # lowering: the jib alone turns until the cab's floor is on the pad (hanger pin 5.8 ft above the floor)
    drop = elbow.z - (CAB_GROUND + 5.8)
    reach = math.sqrt(JIB**2 - drop**2)
    hang_down = Vector((elbow.x - reach, 0.0, CAB_GROUND + 5.8))

    def ang(v):
        return math.atan2(v.z, v.x)

    jib_lower = ang(hang_down - elbow) - ang(HANG - elbow)  # anticlockwise in the XZ plane
    # standing by, clear of the service structure: the cab swung away and down, its near side 16 ft
    # off the vehicle's axis (the platforms reach 13.5 ft, the level-2 walkway 14.5 ft)
    hang_x = 16.0 + 5.5
    standby = math.acos((hang_x - elbow.x) / JIB)
    hang_standby = elbow + Vector((math.cos(standby), 0.0, -math.sin(standby))) * JIB
    jib_standby = ang(hang_standby - elbow) - ang(HANG - elbow)
    # stow: the mast lies forward on the rest frame over the truck's bumper, the jib folded back on top of it
    rest = Vector((ax + 20.45, ty, 12.4))
    mast_rest = ang(rest - pin)
    mast_lower = mast_rest - ang(elbow - pin)
    jib_world = mast_rest + math.pi - math.radians(4.5)  # back along the mast, lying a little above it
    jib_fold = jib_world - (ang(hang_down - elbow) + mast_lower)
    return {
        "pin": pin,
        "elbow": elbow,
        "hang_down": hang_down,
        "jib_lower": jib_lower,
        "hang_standby": hang_standby,
        "jib_standby": jib_standby,
        "mast_lower": mast_lower,
        "jib_fold": jib_fold,
    }


def road_wheel(parts: Parts, name: str, hub, side: int, dual: bool) -> None:
    """One road wheel, or one dual pair, as its own node: origin at the hub centre, axle along
    local Y, so the viewer can spin it about its axle and turn the steered ones about the vertical."""
    parts.node(name, "CherryPicker", hub)
    tyre, rim = parts(name, "tyre", True), parts(name, "grey", True)
    R, hw, rb = TYRE_R, 0.46, 0.92  # tread radius, half the section width, bead seat radius
    out = Matrix.Translation(P(*hub)) @ Matrix.Rotation(-side * math.pi / 2, 4, "X")  # the lathe's +Z becomes outboard
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


def build(parts: Parts) -> dict:
    ax, ty = REAR_AXLE
    wb, R, half_track = WHEELBASE, TYRE_R, TRACK / 2
    g = "CherryPicker"
    parts.node(g, None, (ax, ty, 0.0))
    body, shell, chassis, trim = parts(g, "yellow"), parts(g, "yellow/cab", True), parts(g, "chassis", True), parts(g, "grey", True)
    lamps, light, metal, glass, void = (
        parts(g, "lamp", True),
        parts(g, "white", True),
        parts(g, "deck", True),
        parts(g, "glass"),
        parts(g, "chassis/lines"),
    )

    def T(x: float, y: float, z: float):
        return (ax + x, ty + y, z)

    def tb(mb, lo, hi) -> None:
        box(mb, T(*lo), T(*hi))

    def tbeam(mb, a, b, width: float) -> None:
        beam(mb, T(*a), T(*b), width)

    def ttube(mb, a, b, radius: float, segs: int = 12) -> None:
        mb.tube(P(*T(*a)), P(*T(*b)), radius * FT, segs)

    def tplate(mb, pts, thickness: float) -> None:
        plate(mb, [T(*p) for p in pts], thickness)

    def tarch(*a) -> list:
        return [T(*p) for p in arch(*a)]

    # ---- running gear: each wheel its own node, so the truck can be driven
    road_wheel(parts, "CherryPicker_SteerWheel_1", T(wb, half_track, R), 1, False)
    road_wheel(parts, "CherryPicker_SteerWheel_2", T(wb, -half_track, R), -1, False)
    road_wheel(parts, "CherryPicker_Wheel_1", T(0, half_track, R), 1, True)
    road_wheel(parts, "CherryPicker_Wheel_2", T(0, -half_track, R), -1, True)

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
    tb(body, (-8.0, -4.0, 3.75), (10.4, 4.0, DECK_Z))
    tb(body, (-8.0, -4.0, 2.3), (-2.4, 4.0, 3.75))  # tail box
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 3.55, sy * 4.0))
        tb(body, (2.5, y0, 2.65), (6.9, y1, 3.75))  # locker
        tb(body, (6.9, y0, 2.3), (9.6, y1, 3.75))  # the forward outriggers hinge on this
        tb(trim, (2.9, sy * 4.0 - 0.03 * (sy < 0), 2.85), (6.5, sy * 4.0 + 0.03 * (sy > 0), 3.55))  # locker door
        tb(chassis, (-2.35, y0, 3.5), (2.45, y1, 3.75))  # the dark arch over the rear wheels
    tb(body, (10.4, -3.6, 3.75), (10.75, 3.6, 7.2))  # headboard behind the cab
    # on the bed: hydraulic tank, the valve bank the tower is worked from, gas bottles
    tb(body, (6.2, -3.5, DECK_Z), (9.8, -0.8, 6.5))
    ttube(metal, (7.0, -2.2, 6.5), (7.0, -2.2, 6.75), 0.22, 10)
    tb(trim, (3.2, -3.7, DECK_Z), (5.4, -2.9, 5.9))
    for k in range(5):
        tbeam(trim, (3.5 + k * 0.4, -3.3, 5.9), (3.5 + k * 0.4, -3.55, 6.45), 0.07)
    dome = [(0, 0), (0.25, 0.04), (0.4, 0.2), (0.45, 0.45), (0.45, 4.35), (0.4, 4.6), (0.25, 4.76), (0, 4.8)]
    for y in (3.3, 2.3, 1.3):
        light.lathe(ftp(dome), 16, matrix=axes(T(2.6, y, DECK_Z + 0.52), (0, 1, 0), (1, 0, 0)))
        for x in (3.6, 6.4):
            tb(trim, (x - 0.12, y - 0.4, DECK_Z), (x + 0.12, y + 0.4, DECK_Z + 0.2))
    # the control station at the rear of the transporter (documented), reached from the ground
    tb(trim, (-8.35, 1.2, 3.3), (-8.0, 3.4, 4.9))
    for k in range(4):
        tbeam(trim, (-8.35, 1.6 + k * 0.45, 4.4), (-8.75, 1.6 + k * 0.45, 4.75), 0.07)

    # ---- the truck's cab, bonnet and wings, after the International R-series
    # the cab below the waist: a hollow shell (floor, firewall, doors) with what the windows show inside
    seat, inner = parts(g, "chassis/seat", True), parts(g, "grey/inside", True)
    tb(shell, (11.0, -3.2, 3.35), (15.8, 3.2, 3.6))  # floor pan
    tb(shell, (15.45, -3.2, 3.6), (15.8, 3.2, 6.1))  # firewall under the screen
    tb(shell, (11.0, -3.2, 3.6), (11.2, 3.2, 6.1))  # back wall
    for sy in (-1, 1):  # doors, with their inner panels
        y0, y1 = sorted((sy * 2.95, sy * 3.2))
        tb(shell, (11.2, y0, 3.6), (15.45, y1, 6.1))
        y0, y1 = sorted((sy * 2.85, sy * 2.95))
        tb(inner, (11.6, y0, 4.0), (15.2, y1, 5.9))
    tb(inner, (11.2, -2.95, 3.6), (15.45, 2.95, 3.68))  # floor mat
    tb(seat, (11.4, -2.8, 4.6), (12.9, 2.8, 5.3))  # bench seat
    tb(seat, (11.25, -2.8, 5.3), (11.7, 2.8, 7.3))  # its back
    tb(inner, (11.6, -2.6, 3.68), (12.7, 2.6, 4.6))  # seat box
    tb(inner, (14.85, -2.95, 5.35), (15.45, 2.95, 6.12))  # dashboard
    for k in range(3):  # its dials
        inner.disc(P(*T(14.84, 1.0 + k * 0.45, 5.85)), (-1, 0, 0), 0.16 * FT, 0.03 * FT, 12)
    ttube(seat, (15.2, 1.45, 4.6), (14.15, 1.45, 6.45), 0.11, 10)  # steering column
    seat.lathe(
        ftp([(0.72, -0.05), (0.85, -0.05), (0.85, 0.05), (0.72, 0.05), (0.72, -0.05)]),
        28,
        matrix=axes(T(14.12, 1.45, 6.5), (0, 1, 0), (-0.85, 0, 0.52)),
    )
    for a in (0.0, 2.1, 4.2):  # its spokes
        c, s_ = math.cos(a), math.sin(a)
        w = Vector((-0.85, 0, 0.52)).normalized()
        e1, e2 = Vector((0, 1, 0)), w.cross(Vector((0, 1, 0)))
        hub = Vector(T(14.12, 1.45, 6.5))
        beam(seat, tuple(hub), tuple(hub + (e1 * c + e2 * s_) * 0.75), 0.06)
    ttube(seat, (14.6, -1.2, 3.68), (14.1, -1.2, 5.2), 0.06, 8)  # gear lever
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
            tb(void, (x, yo[0], 3.7), (x + 0.05, yo[1], 6.1))  # door shut lines
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
    tb(inner, (11.2, -2.95, 8.1), (14.6, 2.95, 8.24))  # headlining
    tb(shell, (17.9, -2.5, 2.9), (19.9, 2.5, 3.4))  # apron under the grille
    for k in range(5):  # grille: five slots under the badge, bars below
        y = (k - 2) * 0.36
        tb(void, (19.5, y - 0.11, 4.3), (19.64, y + 0.11, 4.95))
    tb(void, (19.5, -1.55, 3.5), (19.63, 1.55, 4.1))
    for z in (3.68, 3.9):
        tb(shell, (19.55, -1.6, z), (19.68, 1.6, z + 0.09))
    tb(metal, (19.52, -0.16, 5.02), (19.66, 0.16, 5.2))
    tb(body, (19.95, -4.0, 2.0), (20.3, 4.0, 2.85))  # bumper
    tb(light, (20.3, -0.55, 2.2), (20.34, 0.55, 2.65))  # number plate
    # the frame on the bumper that the lowered mast rests in for the road
    for sy in (-1, 1):
        y0, y1 = sorted((sy * 1.95, sy * 2.25))
        tb(body, (20.3, y0, 2.0), (20.6, y1, 10.0))
        tbeam(body, (20.45, sy * 2.1, 9.9), (20.45, sy * 2.55, 10.9), 0.24)
        tbeam(body, (20.45, sy * 1.95, 3.1), (20.45, sy * 0.1, 9.05), 0.2)
    tb(body, (20.32, -1.95, 9.0), (20.58, 1.95, 9.3))

    # ---- outriggers: four legs that swing down and out, each driven by a ram. Each leg is its own
    # node, its origin on its hinge pin, which runs along the truck (X).
    k = 0
    for xh, fore in ((8.25, 1), (-5.2, -1)):
        for sy in (-1, 1):
            k += 1
            name = f"CherryPicker_Outrigger_{k}"
            H, F = Vector(T(xh, sy * 3.9, 3.2)), Vector(T(xh + fore * 2.6, sy * 10.4, 0.42))
            parts.node(name, g, tuple(H))
            leg, rod = parts(name, "yellow"), parts(name, "deck", True)
            d = (F - H).normalized()
            s = Vector((0, 0, 1)).cross(d).normalized()
            t = d.cross(s)

            def loop(c, a, b, s=s, t=t):
                return [c + s * a - t * b, c + s * a + t * b, c - s * a + t * b, c - s * a - t * b]

            hull(leg, [loop(H, 0.5, 0.75), loop(F, 0.38, 0.24)])
            flat = Vector((d.x, d.y, 0)).normalized()
            leg.box((3.0 * FT, 1.15 * FT, 0.2 * FT), axes(F - flat * 0.5 + Vector((0, 0, 0.1 - F.z)), flat, (0, 0, 1)))  # skid
            top, low = Vector(T(xh + fore * 0.2, sy * 4.0, 5.0)), H + d * ((F - H).length * 0.78) + t * 0.55
            tb(body, (xh + fore * 0.2 - 0.3, sy * 4.0 - 0.3 * (sy < 0), 3.9), (xh + fore * 0.2 + 0.3, sy * 4.0 + 0.3 * (sy > 0), 5.3))
            mid = top + (low - top) * 0.6
            light.tube(top * FT, mid * FT, 0.3 * FT, 14)  # the ram's barrel, on the body
            rod.tube(mid * FT, low * FT, 0.13 * FT, 10)  # its rod, on the leg
            ttube(trim, (xh - 0.6, sy * 3.9, 3.2), (xh + 0.6, sy * 3.9, 3.2), 0.16, 10)  # the hinge pin

    # ---- turntable at the tail, the mast's foot, its two rams, the winch
    px, pz = PIVOT
    trim.lathe(ftp([(0, 0), (2.7, 0), (2.7, 0.3), (0, 0.3)]), 40, matrix=Matrix.Translation(P(*T(px, 0, DECK_Z))))  # slew ring
    if fine():
        for k in range(24):
            a = TAU * k / 24
            trim.disc(P(*T(px + 2.55 * math.cos(a), 2.55 * math.sin(a), DECK_Z + 0.3)), (0, 0, 1), 0.07 * FT, 0.08 * FT, 6)
    body.lathe(ftp([(2.4, 0.2), (2.4, 1.2), (0, 1.2)]), 40, matrix=Matrix.Translation(P(*T(px, 0, DECK_Z))))
    tb(body, (px - 2.9, -2.2, DECK_Z + 1.2), (px + 3.1, 2.2, DECK_Z + 1.4))
    cheek = [(-1.7, DECK_Z + 1.4), (1.7, DECK_Z + 1.4), (0.95, pz + 0.3), (0.5, pz + 0.75), (-0.5, pz + 0.75), (-0.95, pz + 0.3)]
    for sy in (-1, 1):
        plate(body, [T(px + x, sy * 1.75, z) for x, z in cheek], 0.25)
    ttube(metal, (px, -2.05, pz), (px, 2.05, pz), 0.28, 14)
    ttube(trim, (px - 2.1, -1.5, DECK_Z + 2.0), (px - 2.1, 1.5, DECK_Z + 2.0), 0.55, 16)  # winch
    for y in (-1.6, 1.5):
        tb(trim, (px - 2.7, y, DECK_Z + 1.4), (px - 1.5, y + 0.1, DECK_Z + 2.7))

    # ---- the mast: its own node on the foot pin
    q = pose()
    pin, elbow = q["pin"], q["elbow"]
    parts.node("CherryPicker_Mast", g, tuple(pin))
    boom, cable, mlight, mmetal = (
        parts("CherryPicker_Mast", "yellow"),
        parts("CherryPicker_Mast", "cable", True),
        parts("CherryPicker_Mast", "white", True),
        parts("CherryPicker_Mast", "deck", True),
    )
    side = Vector((0, 1, 0))
    u = (elbow - pin).normalized()
    v = Vector((u.z, 0, -u.x))  # across the mast, toward the truck's nose

    def mast(i: int, s: float):
        wide = 1.3 - 0.2 * s / MAST
        deep = 0.45 + 1.05 * min(1.0, (s - 1.0) / 6.0) - 0.4 * max(0.0, (s - 7.0) / MAST)
        return tuple(pin + u * s + side * wide * (1 if i < 2 else -1) + v * deep * (1 if i in (0, 3) else -1))

    head = MAST - 10.0
    truss(boom, mast, [1.0, 7.0, *[7.0 + (head - 7.0) * k / 10 for k in range(1, 11)]], 0.36, 0.2)
    for sy in (-1, 1):  # the head: two plates carrying the jib's pin and its sheaves
        plate(
            boom,
            [
                tuple(pin + u * s + v * w + side * sy * 1.25)
                for s, w in ((head - 0.5, -1.1), (head - 0.5, 1.1), (MAST + 0.4, 0.95), (MAST + 1.2, 0.0), (MAST + 0.4, -0.95))
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
        # the hoist line down the back of the mast to its foot
        cable.tube((elbow - v * 1.82 + side * sy * 1.75) * FT, (pin + u * 2.0 - v * 1.0 + side * sy * 1.2) * FT, 0.045 * FT, 6)
    # rams that raise the mast: barrel pinned to the turntable (on the truck), rod to a cross-beam on the mast
    rs = 13.0
    beam(boom, tuple(pin + u * rs + v * 2.2 - side * 1.5), tuple(pin + u * rs + v * 2.2 + side * 1.5), 0.3)
    for i in (0, 3):
        beam(boom, mast(i, rs), tuple(pin + u * rs + v * 2.2 + side * (1.3 if i == 0 else -1.3)), 0.24)
    for sy in (-1, 1):
        foot, top = Vector(T(px + 2.5, sy * 0.95, DECK_Z + 1.5)), pin + u * rs + v * 2.2 + side * sy * 0.95
        mid = foot + (top - foot) * 0.62
        light.tube(foot * FT, mid * FT, 0.42 * FT, 16)
        mmetal.tube(mid * FT, top * FT, 0.2 * FT, 12)
        tb(body, (px + 2.2, sy * 0.95 - 0.3, DECK_Z + 1.4), (px + 2.8, sy * 0.95 + 0.3, DECK_Z + 1.75))
    mmetal.tube((pin - side * 1.85) * FT, (pin + side * 1.85) * FT, 0.32 * FT, 14)  # the mast's foot on its pin
    del mlight

    # ---- the jib: its own node on the pin at the mast's head
    parts.node("CherryPicker_Jib", "CherryPicker_Mast", tuple(elbow))
    jboom, jcable = parts("CherryPicker_Jib", "yellow"), parts("CherryPicker_Jib", "cable", True)
    jboom.tube((elbow - side * 2.0) * FT, (elbow + side * 2.0) * FT, 0.25 * FT, 12)  # the pin
    w = (HANG - elbow).normalized()
    n = Vector((-w.z, 0, w.x))
    n = n if n.z > 0 else -n

    def jib(i: int, s: float):
        k = s / JIB
        return tuple(elbow + w * s + side * (0.85 - 0.25 * k) * (1 if i < 2 else -1) + n * (1.1 - 0.5 * k) * (1 if i in (0, 3) else -1))

    stations = [2.6 + (JIB - 4.4) * k / 14 for k in range(15)]
    truss(jboom, jib, stations, 0.26, 0.15)
    for i in range(4):  # the chords run in to the pins at each end
        sy = 1 if i < 2 else -1
        beam(jboom, jib(i, stations[0]), tuple(elbow + side * sy * 0.85), 0.26)
        beam(jboom, jib(i, stations[-1]), tuple(HANG + side * sy * 0.6), 0.26)
    for sy in (-1, 1):  # the line along the jib that keeps the cab level
        jcable.tube((elbow + n * 1.82 + side * sy * 1.75) * FT, (HANG + n * 0.92 + side * sy * 1.3) * FT, 0.045 * FT, 6)

    # ---- the cab: its own node on the hanger pin, an open-fronted box the pilot steps into from the hatch
    parts.node("CherryPicker_Cab", "CherryPicker_Jib", tuple(HANG))
    cab, cmetal, cdark, ctrim = (
        parts("CherryPicker_Cab", "yellow"),
        parts("CherryPicker_Cab", "deck"),
        parts("CherryPicker_Cab", "chassis"),
        parts("CherryPicker_Cab", "grey"),
    )
    cglass, blue, pinm = parts("CherryPicker_Cab", "glass"), parts("CherryPicker_Cab", "blue", True), parts("CherryPicker_Cab", "yellow/pin", True)
    c = CAB
    box(cab, (c.x - 2.2, c.y - 2.4, c.z - 3.5), (c.x + 2.2, c.y + 2.4, c.z - 3.2))  # floor
    box(cab, (c.x - 2.2, c.y - 2.4, c.z + 3.3), (c.x + 2.2, c.y + 2.4, c.z + 3.6))  # roof
    box(cab, (c.x + 1.95, c.y - 2.4, c.z - 3.2), (c.x + 2.2, c.y + 2.4, c.z + 3.3))  # back wall
    box(cmetal, (c.x - 2.1, c.y - 2.1, c.z - 3.2), (c.x + 1.9, c.y + 2.1, c.z - 3.15))  # tread plate
    box(cmetal, (c.x - 2.9, c.y - 1.6, c.z - 3.48), (c.x - 2.2, c.y + 1.6, c.z - 3.38))  # sill plate toward the hatch
    for sy in (-1, 1):
        y0, y1 = sorted((c.y + sy * 2.16, c.y + sy * 2.4))
        box(cab, (c.x - 0.8, y0, c.z - 3.2), (c.x + 1.95, y1, c.z + 0.2))  # side: panel below, window above
        box(cab, (c.x - 0.8, y0, c.z + 2.9), (c.x + 1.95, y1, c.z + 3.3))
        box(cab, (c.x - 0.8, y0, c.z + 0.2), (c.x - 0.6, y1, c.z + 2.9))
        box(cglass, (c.x - 0.6, c.y + sy * 2.28 - 0.02, c.z + 0.2), (c.x + 1.95, c.y + sy * 2.28 + 0.02, c.z + 2.9))
        y0, y1 = sorted((c.y + sy * 2.1, c.y + sy * 2.46))
        for x0, x1 in ((c.x - 2.26, c.x - 1.96), (c.x + 1.9, c.x + 2.26)):  # corner posts, standing proud
            box(cab, (x0, y0, c.z - 3.56), (x1, y1, c.z + 3.66))
        y0, y1 = sorted((c.y + sy * 2.3, c.y + sy * 2.45))
        box(cab, (c.x - 1.96, y0, c.z + 3.25), (c.x + 1.9, y1, c.z + 3.65))  # roof edge
        box(cdark, (c.x - 1.96, y0, c.z - 3.55), (c.x + 1.9, y1, c.z - 2.8))  # toe board
        for h in (1.75, 3.5):  # rails across the open part of each side
            beam(cdark, (c.x - 1.96, c.y + sy * 2.3, c.z - 3.2 + h), (c.x - 0.8, c.y + sy * 2.3, c.z - 3.2 + h), 0.13)
        blue.lathe(ftp([(0.62, 0.0), (0.62, 0.04), (0.0, 0.04)]), 24, matrix=axes((c.x + 0.6, c.y + sy * 2.4, c.z - 1.5), (1, 0, 0), (0, sy, 0)))
        # hanger: two plates off the back wall to the pin at the jib's tip
        y0, y1 = sorted((c.y + sy * 0.95, c.y + sy * 1.1))
        box(cab, (c.x + 2.26, y0, c.z + 1.3), (HANG.x + 0.6, y1, c.z + 3.3))
        pinm.lathe(ftp([(0, -0.08), (0.95, -0.08), (0.95, 0.08), (0, 0.08)]), 28, matrix=axes(tuple(HANG + side * sy * 1.3), (1, 0, 0), side * sy))
    box(cab, (c.x + 2.1, c.y - 2.1, c.z + 3.25), (c.x + 2.25, c.y + 2.1, c.z + 3.65))
    box(cab, (c.x - 2.25, c.y - 2.1, c.z + 3.25), (c.x - 2.1, c.y + 2.1, c.z + 3.65))
    box(cdark, (c.x + 2.1, c.y - 2.1, c.z - 3.55), (c.x + 2.25, c.y + 2.1, c.z - 2.8))
    pinm.tube((HANG - side * 1.45) * FT, (HANG + side * 1.45) * FT, 0.2 * FT, 12)
    beam(cdark, (c.x + 1.75, c.y - 1.9, c.z + 0.3), (c.x + 1.75, c.y + 1.9, c.z + 0.3), 0.12)  # grab rail
    for y in (-1.9, 1.9):
        beam(cdark, (c.x + 1.75, c.y + y, c.z + 0.3), (c.x + 1.97, c.y + y, c.z + 0.3), 0.1)
    box(ctrim, (c.x + 1.6, c.y + 0.7, c.z + 0.8), (c.x + 1.95, c.y + 1.7, c.z + 1.8))  # the push-button box for the programmed descent
    return q
