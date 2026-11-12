"""The service structure: the Noble Co. "Missile Service Stand" built for Redstone in 1953 and
dedicated to pad 5 for Mercury. "A reclining type single-mast structure with cantilevered access
platforms capable of encircling the missile. An 'A' frame mast, as the backbone supporting the
cantilevered access work platforms, towered 140 feet above the launch pad. The mast was supported by
a large structural steel base, mounted on railway tracks and capable of moving under its own power"
(Corps of Engineers history, quoted in the NHL nomination 84003872, p. 3). Four motorised rail
trucks; four of its five platforms adjustable to any level (the museum, on its LC-26 twin). For
Mercury: remote control from the blockhouse, a white room on level 3 (Feb-May 1961), a shelter on
level 4 and a deflector against the escape rocket (TM X-53107 4.8.9, 7.5.1).

Built at T-55 min: rolled back to the edge of the pad with every platform open, as the countdown
leaves them (TM X-53107, T-85 to T-60: "Open platform No. 2 ... 4 ... 3 ... 1"; T-55 "Move structure
to edge of pad"). Each platform is two halves that part sideways (Hammack: the white room
"separated down the middle when the service structure was opened"; S61-03158, Hammack Fig. 23).

Local frame: the node's origin is the point on the track's centre line where the vehicle's axis
stands when the structure is round it; the mast is behind it (+Y) and the platforms reach forward
past it. Sizes are scaled off photographs (see ../lc-5.md); only the height is published.
"""

from __future__ import annotations

import math

from mathutils import Matrix

import interiors
import sitelib
import srlib
from srlib import FT

from .site import (
    GAUGE,
    LEVELS,
    MAST_NOTCH,
    RAIL_PAIR_X,
    RAIL_TOP,
    STRUCTURE_TOP,
    P,
    Parts,
    axes,
    axle_cap,
    beam,
    box,
    box_girder,
    door,
    ear_clip,
    fine,
    ftp,
    handrail,
    rail_clamp,
    ring,
    stair_rails,
    stairs,
    stood,
    wall_door,
    window,
)

Y0 = 0.0  # built in its service position, round the vehicle
MAST_Y = 12.0  # the mast's centre plane, behind the vehicle station
LEG = 1.5  # half the side of each leg's square section
LEG_FOOT_X, LEG_TOP_X = 10.5, 3.0  # each leg's centre line at the base and at the head: the A
BASE_Z = 9.0  # the base's deck, where the legs stand
MAST_TOP = STRUCTURE_TOP - 9.0  # the mast's head, under the crane
DECK_X, DECK_FRONT, DECK_BACK = 13.5, -12.0, 10.0  # a platform half: out to 13.5 ft, from 12 ft in front of the vehicle back to the mast
# Levels 1 and 2 reach wider than the white room: 1.43 and 1.37 times its width in Hammack Fig. 22 (S-61-1930)
WIDTH = {1: 18.5, 2: 17.5, 3: DECK_X, 4: DECK_X}
CABIN_IN = 7.5  # level 2's cabins stand on the outer part of each half; the middle, round the booster, is open
NOTCH = {1: 3.6, 2: 3.6, 3: 3.7, 4: 2.4}  # the cut each pair of halves closes round: booster 2.92 ft, capsule 3.1 ft, tower
TRUCK_Y = (-10.0, 26.0)  # the rail trucks' centres
AXLE = 2.6  # each truck's two axles, either side of its centre
WHEEL_R = 1.5
SIDE_X = (7.6, 13.4)  # the base's two side girders, one over each pair of rails
# Getting up it (see ../lc-5.md, "Getting about on foot", for what each rests on). The lift is an
# open mesh cage that runs up the outboard face of the hatch side's leg, boarded from the pad
# (FHSU F19_051, "Emergency Egress Exercise for MR-4"; NASA 61-MR4-45). Ladders climb the legs in
# stages between small landings (FHSU F19_004), and a last one goes up the head of the mast to the
# crane. A deck between the legs joins the two halves of each level behind the vehicle.
PIT_FRONT = 10.0
CAR_W, CAR_Y, CAR_H = 4.0, (10.6, 13.5), 7.2  # the lift's car: across, its front and back, its height
PAD_STOP = (14.7, 2.3)  # at the pad the car stands outboard of the base: its inner face, and its floor two steps up
TOP_LEVEL = 112.0  # the landing under the crane: the lift's top stop, and the foot of the last ladder
LADDER_PLANE = 14.4  # the leg ladders stand this far back (y), the climber behind them facing the leg
LANDING_BACK = 18.2
CRANE_LADDER = (4.5, 9.0)


def L(x: float, y: float, z: float) -> tuple:
    """Structure-local feet to site feet."""
    return (x, y + Y0, z)


def lbox(mb, lo, hi) -> None:
    box(mb, L(*lo), L(*hi))


def sbox(mb, s: int, xa: float, xb: float, ya: float, yb: float, za: float, zb: float) -> None:
    """A box on side s, its x span given unsigned."""
    x0, x1 = sorted((s * xa, s * xb))
    lbox(mb, (x0, ya, za), (x1, yb, zb))


def lbeam(mb, a, b, w: float) -> None:
    beam(mb, L(*a), L(*b), w)


def leg_x(z: float) -> float:
    return LEG_FOOT_X + (LEG_TOP_X - LEG_FOOT_X) * (z - BASE_Z) / (MAST_TOP - BASE_Z)


# ------------------------------------------------------------------- platform halves


def notched_half(mb, s: int, z0: float, z1: float, notches, x_in: float = 0.06, X: float = DECK_X) -> None:
    """One half of a platform's deck or roof: x from the split to DECK_X on side s, with semicircles
    cut from its inner edge where the vehicle (and the capsule's cable mast) stand. `notches` are
    (y, radius) along the split."""
    n = 10 if fine() else 6
    yf, yb = DECK_FRONT, DECK_BACK
    outline = [(x_in, yf), (X, yf), (X, yb), (x_in, yb)]
    for yc, r in sorted(notches, reverse=True):  # down the split, top first, each arc bulging outward
        outline += [(x_in + r * math.cos(a), yc + r * math.sin(a)) for a in (math.pi / 2 - math.pi * k / n for k in range(n + 1))]
    tris = ear_clip(outline)

    def v(x, y, z):
        return tuple(P(*L(s * x, y, z)))

    top = [v(x, y, z1) for x, y in outline]
    bot = [v(x, y, z0) for x, y in outline]
    up = [t if s > 0 else t[::-1] for t in tris]
    mb.add(top, up)
    mb.add(bot, [t[::-1] for t in up])
    for a, b in zip(outline, outline[1:] + outline[:1]):
        quad = [v(*a, z0), v(*b, z0), v(*b, z1), v(*a, z1)]
        mb.add(quad[::-1] if s < 0 else quad, [(0, 1, 2, 3)])


def wall(panel, glass, s: int, plane: str, at: float, span, z0: float, z1: float, windows=(), sill=0.0, head=0.0, t=0.25) -> None:
    """A wall of a half's cabin, built round its windows, with a pane in each.
    plane "x": the outer wall, its outer face at x = s*at, running along y over `span`.
    plane "y": a front or back wall from y = at to at + t, running along x over `span` (unsigned)."""

    def b(mb, a0, a1, c0, c1, w0, w1):  # along, height, across
        if plane == "x":
            sbox(mb, s, w0, w1, a0, a1, c0, c1)
        else:
            sbox(mb, s, a0, a1, w0, w1, c0, c1)

    w0, w1 = (at - t, at) if plane == "x" else (at, at + t)
    a0, a1 = span
    if not windows:
        b(panel, a0, a1, z0, z1, w0, w1)
        return
    b(panel, a0, a1, z0, sill, w0, w1)
    b(panel, a0, a1, head, z1, w0, w1)
    edges = [a0] + [e for w in windows for e in w] + [a1]
    for p0, p1 in zip(edges[0::2], edges[1::2]):
        b(panel, p0, p1, sill, head, w0, w1)
    mid = (w0 + w1) / 2
    for p0, p1 in windows:
        b(glass, p0, p1, sill, head, mid - 0.02, mid + 0.02)


def frames(mb, s: int, plane: str, at: float, posts, z0: float, z1: float, t=0.25) -> None:
    """White uprights standing a little proud of a wall on both faces."""
    for p in posts:
        if plane == "x":
            sbox(mb, s, at - t - 0.07, at + 0.07, p - 0.12, p + 0.12, z0 + 0.05, z1 - 0.05)
        else:
            sbox(mb, s, p - 0.12, p + 0.12, at - 0.07, at + t + 0.07, z0 + 0.05, z1 - 0.05)


def back_wall(parts: Parts, name: str, skin, s: int, x0: float, X: float, zf: float, h: float) -> None:
    """The wall of an enclosed level toward the mast, from x0 out to the level's side. On the hatch
    side it has the door from the lift in it, where the car stops: its own node, hinged on its
    outer edge, opening into the room."""
    y0, y1 = DECK_BACK - 0.25, DECK_BACK
    if s < 0:
        sbox(skin, s, x0, X - 0.25, y0, y1, zf, zf + h)
        return
    a = car_x(zf) + 0.5
    b = a + 3.0
    sbox(skin, s, x0, a, y0, y1, zf, zf + h)
    sbox(skin, s, a, b, y0, y1, zf + 6.8, zf + h)
    sbox(skin, s, b, X - 0.25, y0, y1, zf, zf + h)
    door(parts, f"{name}_LiftDoor", name, L(b - 0.02, DECK_BACK - 0.125, zf), (-1, 0), 2.96, 6.75, swing=100.0, mat="white")


def platform(parts: Parts, n: int, s: int) -> None:
    """One half of a work platform, built closed round the vehicle. Its node's origin is on the
    vehicle's axis at the floor: the half opens by sliding out along X."""
    name = f"ServiceStructure_Platform{n}_{'Left' if s < 0 else 'Right'}"
    zf, X = LEVELS[n], WIDTH[n]
    parts.node(name, "ServiceStructure", L(0.0, 0.0, zf))
    red, deck, white, glass = parts(name, "red"), parts(name, "deck"), parts(name, "white"), parts(name, "glass")
    rails, fit = parts(name, "white/rails"), parts(name, "grey/fittings")
    r = NOTCH[n]
    holes = [(0.0, r), MAST_NOTCH] if n < 3 else [(0.0, r)]
    notched_half(deck, s, zf - 0.45, zf, holes, X=X)
    if n < 4:  # level 4's deck sits on the white room's roof
        under = parts(name, "yellow") if n == 3 else red  # the white room's underside showed yellow (6100884)
        for x in (4.6, 9.0, X - 0.3):  # joists, front to back
            sbox(under, s, x - 0.3, x + 0.3, DECK_FRONT + 0.1, DECK_BACK - 0.7, zf - 1.5, zf - 0.46)
        for y in (DECK_FRONT + 0.6, -6.0):  # and across
            sbox(under, s, 0.3, X - 0.05, y - 0.3, y + 0.3, zf - 1.2, zf - 0.47)
        sbox(red, s, 0.3, X - 0.05, DECK_BACK - 0.68, DECK_BACK - 0.02, zf - 1.6, zf - 0.47)  # the shoe it slides on

    if n == 1:  # an open deck, railed round its outer and front edges
        handrail(rails, [L(s * 1.0, DECK_FRONT + 0.25, zf), L(s * (X - 0.25), DECK_FRONT + 0.25, zf), L(s * (X - 0.25), DECK_BACK - 0.4, zf)])
    elif n == 2:  # a cabin on the outer part, the middle open and railed
        h, sill, head = 8.0, 3.2, 6.4
        wall(red, glass, s, "x", X, (DECK_FRONT, DECK_BACK), zf, zf + h, [(-9.0, -5.6), (-3.4, 0.0), (2.2, 5.6)], zf + sill, zf + head)
        wall(red, glass, s, "y", DECK_FRONT, (CABIN_IN, X - 0.25), zf, zf + h, [(10.0, 15.0)], zf + sill, zf + head)
        back_wall(parts, name, red, s, CABIN_IN, X, zf, h)
        for y0, y1 in ((DECK_FRONT + 0.25, -3.0), (0.0, DECK_BACK - 0.25)):  # the inner wall, round its doorway
            sbox(red, s, CABIN_IN, CABIN_IN + 0.25, y0, y1, zf, zf + h)
        sbox(red, s, CABIN_IN, CABIN_IN + 0.25, -3.0, 0.0, zf + 6.8, zf + h)
        door(parts, f"{name}_Door", name, L(s * (CABIN_IN + 0.125), -0.02, zf), (0, -1), 2.96, 6.75, swing=s * 100.0, mat="white")  # into the cabin
        notched_half(red, s, zf + h, zf + h + 0.35, [], x_in=CABIN_IN - 0.1, X=X + 0.2)  # the cabin's roof
        if fine():  # the cabin's steel frame showing on its panels: an upright at each window's edge, rails at sill and head
            frames(white, s, "x", X, [DECK_FRONT + 0.35, -9.0, -5.6, -3.4, 0.0, 2.2, 5.6, DECK_BACK - 0.35], zf, zf + h)
            frames(white, s, "y", DECK_FRONT, [CABIN_IN + 0.3, 10.0, 15.0, X - 0.4], zf, zf + h)
            for zz in (zf + sill - 0.16, zf + head + 0.03):
                sbox(white, s, X - 0.3, X + 0.05, DECK_FRONT + 0.5, DECK_BACK - 0.5, zz, zz + 0.13)
                sbox(white, s, CABIN_IN + 0.45, X - 0.55, DECK_FRONT - 0.05, DECK_FRONT + 0.3, zz, zz + 0.13)
        handrail(rails, [L(s * 1.0, DECK_FRONT + 0.25, zf), L(s * (CABIN_IN - 0.3), DECK_FRONT + 0.25, zf)])
        if s < 0:  # a bench along the back wall, seen through the windows (the hatch side's has the lift's door)
            sbox(fit, s, CABIN_IN + 3.0, X - 0.5, DECK_BACK - 1.6, DECK_BACK - 0.35, zf, zf + 3.0)
        sbox(fit, s, X - 2.4, X - 0.35, DECK_FRONT + 2.0, DECK_FRONT + 4.5, zf, zf + 5.5)  # a cabinet
    elif n == 3:  # the white room: blue-green panels in a white frame, round the capsule
        if s < 0:  # recorded once; a flight before the white room would need level 3 as an open deck, which is not built
            stood("White room on level 3", since="1961-02", confidence="documented", source="TM X-53107 7.5.1.2: built February to May 1961")
        h, sill, head = LEVELS[4] - LEVELS[3] - 0.85, 3.4, 8.2  # its roof stands just under level 4's deck
        skin = parts(name, "panel")
        side_w = [(-10.0, -7.0), (-6.0, -3.0), (-1.5, 1.5), (3.0, 6.0)]
        front_w = [(1.2, 5.6), (7.4, 11.8)]
        wall(skin, glass, s, "x", X, (DECK_FRONT, DECK_BACK), zf, zf + h, side_w, zf + sill, zf + head)
        wall(skin, glass, s, "y", DECK_FRONT, (0.06, X - 0.25), zf, zf + h, front_w, zf + sill, zf + head)
        back_wall(parts, name, skin, s, 0.06, X, zf, h)
        notched_half(white, s, zf + h, zf + h + 0.35, holes)
        frames(white, s, "x", X, [DECK_FRONT + 0.35] + [e for w in side_w for e in w] + [DECK_BACK - 0.35], zf, zf + h)
        frames(white, s, "y", DECK_FRONT, [e for w in front_w for e in w] + [X - 0.4], zf, zf + h)
        for zz in (zf + sill - 0.16, zf + head + 0.03):
            sbox(white, s, X - 0.3, X + 0.05, DECK_FRONT + 0.5, DECK_BACK - 0.5, zz, zz + 0.13)
        # inside: a bench along the back wall, a cabinet, a cable tray (TM X-53107 7.5.1.8)
        if s < 0:
            sbox(fit, s, 6.0, 12.6, DECK_BACK - 1.6, DECK_BACK - 0.35, zf, zf + 3.0)
        sbox(fit, s, 11.0, 13.1, DECK_FRONT + 2.0, DECK_FRONT + 4.5, zf, zf + 5.5)
        sbox(fit, s, 2.0, 12.8, DECK_BACK - 0.95, DECK_BACK - 0.35, zf + h - 1.2, zf + h - 0.9)
    else:  # level 4: the shelter round the escape tower, with the deflector inside, and a railed roof
        h = 9.0
        wall(red, glass, s, "x", X, (DECK_FRONT, DECK_BACK), zf, zf + h, [(-8.0, -4.5), (-2.5, 1.0), (3.0, 6.5)], zf + 4.0, zf + 7.5)
        wall(red, glass, s, "y", DECK_FRONT, (0.06, X - 0.25), zf, zf + h, [(5.0, 10.5)], zf + 4.0, zf + 7.5)
        back_wall(parts, name, red, s, 0.06, X, zf, h)
        notched_half(red, s, zf + h, zf + h + 0.35, [(0.0, NOTCH[4])])  # the roof: the tower's tip stands through it
        if fine():
            frames(white, s, "x", X, [DECK_FRONT + 0.35, -8.0, -4.5, -2.5, 1.0, 3.0, 6.5, DECK_BACK - 0.35], zf, zf + h)
            frames(white, s, "y", DECK_FRONT, [0.5, 5.0, 10.5, X - 0.4], zf, zf + h)
            for zz in (zf + 4.0 - 0.16, zf + 7.5 + 0.03):
                sbox(white, s, X - 0.3, X + 0.05, DECK_FRONT + 0.5, DECK_BACK - 0.5, zz, zz + 0.13)
                sbox(white, s, 0.65, X - 0.55, DECK_FRONT - 0.05, DECK_FRONT + 0.3, zz, zz + 0.13)
        handrail(
            rails,
            [
                L(s * 1.0, DECK_FRONT + 0.25, zf + h + 0.35),
                L(s * (X - 0.25), DECK_FRONT + 0.25, zf + h + 0.35),
                L(s * (X - 0.25), DECK_BACK - 0.4, zf + h + 0.35),
            ],
        )
        # the deflector (TM X-53107 7.5.1.3, Figure 7-9): a curved plate turning a blast outward
        steel = parts(name, "scorched")
        xs = [2.4 + 6.6 * k / 8 for k in range(9)]
        ys = [-7.0 + 14.0 * k / 6 for k in range(7)]

        def surf(x, y, off):
            return tuple(P(*L(s * x, y, zf + 5.2 + 2.6 * ((x - 2.4) / 6.6) ** 1.6 + off)))

        steel.grid(lambda x, y: surf(x, y, 0.06), xs, ys, flip=s < 0)
        steel.grid(lambda x, y: surf(x, y, -0.06), xs, ys, flip=s > 0)
        for x in (2.8, 8.6):
            for y0 in (-6.8, 6.4):
                sbox(red, s, x - 0.2, x + 0.2, y0, y0 + 0.4, zf, zf + 5.1 + 2.6 * ((x - 2.4) / 6.6) ** 1.6)
        if s < 0:
            sbox(fit, s, 9.5, 13.1, DECK_BACK - 1.6, DECK_BACK - 0.35, zf, zf + 3.0)


# ------------------------------------------------------------------------ the rest


def wheelset(parts: Parts, k: int, sx: int, yc: float) -> None:
    """One axle of a rail truck and its two flanged wheels on one pair of rails: its own node,
    origin on the axle, which runs along X."""
    name = f"ServiceStructure_Wheel_{k}"
    zc = RAIL_TOP + WHEEL_R
    parts.node(name, "ServiceStructure", L(sx * RAIL_PAIR_X, yc, zc))
    steel = parts(name, "grey", True)
    # tread, flange on the gauge side, web, hub: (radius, across) with "across" toward the pair's middle
    tread = [
        (0, -0.42),
        (1.24, -0.42),
        (1.24, -0.32),
        (WHEEL_R, -0.24),
        (WHEEL_R, 0.16),
        (1.62, 0.2),
        (1.62, 0.28),
        (1.4, 0.3),
        (0.5, 0.18),
        (0.42, 0.42),
        (0, 0.42),
    ]
    for d in (-1, 1):
        x = sx * RAIL_PAIR_X + d * GAUGE / 2
        inward = -d  # toward the pair's middle: the flange runs inside the rail
        steel.lathe(ftp(tread), 32, matrix=axes(L(x, yc, zc), (0, 1, 0), (inward, 0, 0)))
    steel.tube(P(*L(sx * RAIL_PAIR_X - 3.45, yc, zc)), P(*L(sx * RAIL_PAIR_X + 3.45, yc, zc)), 0.25 * FT, 12)


def car_x(z: float) -> float:
    """The inner face of the lift's car when its floor is at height z: it rides the leg's outboard face."""
    return leg_x(max(z, BASE_Z)) + LEG + 0.4


def lift_stops() -> list[tuple[str, float, float]]:
    """The lift's stops: name, the car's inner face (x), its floor (z)."""
    return [("Pad", *PAD_STOP)] + [(f"Level {n}", car_x(z), z) for n, z in LEVELS.items()] + [("Crane", car_x(TOP_LEVEL), TOP_LEVEL)]


def work_lights(parts: Parts) -> None:
    """The lamps the night photographs show: deep dome reflectors hung under the lowest platform,
    three each side of the vehicle and one behind it, shining down on the booster (S61-03158,
    KSC-61-4457; FHSU F20_010 to F20_014 for MR-4): documented that they were there, their places
    estimated. And a lamp in each enclosed level, the office and the white room, whose windows the
    photographs show lit: each a fitting and a `Light_` empty for the viewer. TM X-53107 7.5.1.8:
    "Additional lights were provided in the shelter house and on the structure level"."""
    dome = ftp([(0.12, 0.0), (0.2, -0.5), (0.75, -1.2)])
    lens = ftp([(0.72, -1.17), (0.0, -1.17)])
    hung = [("ServiceStructure", (0.0, 10.6))]
    for s in (-1, 1):
        hung += [(f"ServiceStructure_Platform1_{'Left' if s < 0 else 'Right'}", (s * x, y)) for x, y in ((6.0, -8.0), (9.5, -1.0), (6.0, 6.0))]
    for node, (x, y) in hung:
        c = Matrix.Translation(P(*L(x, y, LEVELS[1] - 1.7)))
        parts(node, "grey/shades", True).lathe(dome, 12, matrix=c)
        parts(node, "lamp", True).lathe(lens, 12, matrix=c)
    # (strengths in fittings, as interiors.ceiling_light: each of these rooms had a lamp or two; estimated)
    rooms = [("Office", "ServiceStructure", (0.0, 25.0, 17.2), 0.8, 5.0)]
    for n, zr in ((2, 7.4), (3, 9.6), (4, 8.4)):
        for s in (-1, 1):
            side = "Left" if s < 0 else "Right"
            rooms.append((f"Level{n}{side}", f"ServiceStructure_Platform{n}_{side}", (s * (10.5 if n == 2 else 7.0), -1.0, LEVELS[n] + zr), 0.9, 6.0))
    for room, node, at, intensity, reach in rooms:
        lbox(parts(node, "lamp-room"), (at[0] - 1.5, at[1] - 0.25, at[2] - 0.12), (at[0] + 1.5, at[1] + 0.25, at[2]))
        parts.node(f"Light_{room}", node, L(at[0], at[1], at[2] - 2.0), intensity=intensity, reach=reach)


def access(parts: Parts) -> None:
    """How people went up: the lift, the decks between the legs, the ladders and their landings."""
    g = "ServiceStructure"
    deck, white, grey = parts(g, "deck"), parts(g, "white"), parts(g, "grey", True)
    y0, y1 = CAR_Y

    # ---- the lift: an open cage of mesh panels in an angle frame, its own node, built at the pad
    car = "ServiceStructure_Lift"
    stops = lift_stops()
    xi, zf = PAD_STOP
    parts.node(car, g, L(xi + CAR_W / 2, (y0 + y1) / 2, zf), lift=1, stops=[[round((x - xi) * FT, 3), round((z - zf) * FT, 3)] for _, x, z in stops])
    frame, floor, panel = parts(car, "grey"), parts(car, "deck"), parts(car, "mesh")
    lbox(floor, (xi, y0, zf - 0.18), (xi + CAR_W, y1, zf))
    lbox(frame, (xi - 0.05, y0 - 0.05, zf + CAR_H), (xi + CAR_W + 0.05, y1 + 0.05, zf + CAR_H + 0.12))
    for x in (xi + 0.07, xi + CAR_W - 0.07):
        for y in (y0 + 0.07, y1 - 0.07):
            lbeam(frame, (x, y, zf), (x, y, zf + CAR_H), 0.14)
        lbeam(frame, (x, y0 + 0.14, zf + 3.5), (x, y1 - 0.14, zf + 3.5), 0.1)
    lbeam(frame, (xi + 0.14, y1 - 0.07, zf + 3.5), (xi + CAR_W - 0.14, y1 - 0.07, zf + 3.5), 0.1)
    for a, b in (((xi + 0.07, y0), (xi + 0.07, y1)), ((xi + CAR_W - 0.07, y0), (xi + CAR_W - 0.07, y1)), ((xi, y1 - 0.07), (xi + CAR_W, y1 - 0.07))):
        quad = [P(*L(*a, zf + 0.1)), P(*L(*b, zf + 0.1)), P(*L(*b, zf + CAR_H - 0.1)), P(*L(*a, zf + CAR_H - 0.1))]
        panel.add([tuple(v) for v in quad], [(0, 1, 2, 3)])
    # steps up to it from the pad, and from the track bed when the structure has rolled off the slab:
    # at the service position the lower two are inside the hardstand
    for k, top in enumerate((-0.75, -0.05, 0.77, 1.53)):
        lbox(deck, (xi, y0 - 4.05 + k, -1.6), (xi + CAR_W, y0 - 3.05 + k if k < 3 else y0 - 0.05, top))
    # its guides up the leg, both sides (the pad 6 side's lift is not built: see lc-5.md)
    for sx in (-1, 1):
        for y in (y0 + 0.5, y1 - 0.5):
            for za, zb in zip(range(10, int(TOP_LEVEL) + 8, 14), range(24, int(TOP_LEVEL) + 22, 14)):
                zb = min(zb, TOP_LEVEL + 9.0)
                lbeam(grey, (sx * (car_x(za) - 0.2), y, za), (sx * (car_x(zb) - 0.2), y, zb), 0.16)
    # a sill at each stop from the car to the level
    for _, x, z in stops[1:]:
        lbox(deck, (x, DECK_BACK + 0.02, z - 0.2), (x + CAR_W, y0 - 0.05, z))

    # ---- at each level a deck between the legs, joining the halves behind the vehicle, and behind the
    # hatch side's leg a landing for the ladders. Each ladder run stands on one landing and comes up
    # through a gap in the next, beside the floor it steps off on to.
    floors = [BASE_Z + 0.3, *LEVELS.values(), TOP_LEVEL]
    arrive = leg_x(floors[1]) + 3.25  # where the first run stands, on the base's deck
    for k, zf in enumerate(floors[1:], 1):
        lx = leg_x(zf)
        w = lx - LEG - 0.05
        lbox(deck, (-w, DECK_BACK + 0.03, zf - 0.3), (w, LANDING_BACK, zf))
        lbox(deck, (w, 16.2, zf - 0.3), (lx + 4.2, LANDING_BACK, zf))
        for xa, xb in ((w, arrive - 0.9), (arrive + 0.9, lx + 4.2)):
            if xb - xa > 0.3:
                lbox(deck, (xa, MAST_Y + LEG + 0.15, zf - 0.3), (xb, 16.2, zf))
        handrail(
            white,
            [L(-w + 0.1, MAST_Y + LEG + 0.2, zf), L(-w + 0.1, LANDING_BACK - 0.1, zf), L(lx + 4.1, LANDING_BACK - 0.1, zf), L(lx + 4.1, 16.3, zf)],
            3.5,
        )
        parts.ladder(g, f"leg{k}", L(arrive, LADDER_PLANE, floors[k - 1]), L(arrive, LADDER_PLANE, zf), face=(0, -1, 0))
        for z in range(int(floors[k - 1]) + 6, int(zf) - 2, 10):  # its stand-offs to the leg
            to = min(max(arrive, leg_x(z) - 0.8), leg_x(z) + 0.8)
            for dx in (-0.74, 0.74):
                lbeam(white, (arrive + dx, LADDER_PLANE, z), (to + dx * 0.6, MAST_Y + LEG - 0.1, z), 0.1)
        arrive = lx - 0.6 if arrive > lx + 1.3 else arrive + 2.6  # the next run stands on the floored side

    # ---- under the crane: the deck runs forward past the legs to the lift's top stop, and the last
    # ladder climbs from it beside the crane's girder to a step off on to the walkway
    zt, wt = TOP_LEVEL, leg_x(TOP_LEVEL) - LEG - 0.05
    xo = car_x(zt) + CAR_W + 0.1
    lbox(deck, (-wt, 7.6, zt - 0.3), (wt, DECK_BACK + 0.03, zt))
    lbox(deck, (wt, 7.6, zt - 0.3), (xo, y0 - 0.05, zt - 0.2))
    handrail(white, [L(-wt + 0.1, DECK_BACK, zt), L(-wt + 0.1, 7.7, zt), L(xo - 0.1, 7.7, zt), L(xo - 0.1, y0 - 0.2, zt)], 3.5)
    zw = MAST_TOP + 5.5 + 0.6  # the crane's walkway
    lbox(deck, (3.6, CRANE_LADDER[1] - 1.6, zw - 0.3), (4.3, CRANE_LADDER[1] + 1.6, zw))
    parts.ladder(g, "crane", L(*CRANE_LADDER, zt - 0.2), L(*CRANE_LADDER, zw), face=(-1, 0, 0))


def build(parts: Parts) -> None:
    parts.node("ServiceStructure", None, L(0.0, 0.0, 0.0))
    g = "ServiceStructure"
    red, grey, deck, white, dark = parts(g, "red"), parts(g, "grey", True), parts(g, "deck"), parts(g, "white"), parts(g, "chassis", True)

    # ---- the base: a girder over each pair of rails on two trucks, joined behind the vehicle
    k = 0
    for sx in (-1, 1):
        xg0, xg1 = sorted((sx * SIDE_X[0], sx * SIDE_X[1]))
        box_girder(red, xg0, xg1, -16.0 + Y0, 32.0 + Y0, 3.4, 9.0, splices=(8.0 + Y0,))
        for yt in TRUCK_Y:
            for xa, xb in ((SIDE_X[0] - 0.65, SIDE_X[0] - 0.25), (SIDE_X[1] + 0.45, SIDE_X[1] + 0.85)):  # side frames, outside the wheels
                sbox(dark, sx, xa, xb, yt - 4.6, yt + 4.6, 0.9, 3.0)
            sbox(dark, sx, SIDE_X[0] - 0.65, SIDE_X[1] + 0.85, yt - 0.9, yt + 0.9, 3.0, 3.39)  # bolster
            sbox(grey, sx, 9.2, 11.8, yt - 0.85, yt + 0.85, 0.9, 2.95)  # traction motor
            for ya in (yt - AXLE, yt + AXLE):
                k += 1
                wheelset(parts, k, sx, ya)
                for xa, out in ((SIDE_X[0] - 0.45, -1), (SIDE_X[1] + 0.65, 1)):  # axle boxes, on the side frames, and their caps
                    sbox(dark, sx, xa - 0.18, xa + 0.18, ya - 0.5, ya + 0.5, 1.05, 2.0)
                    axle_cap(grey, L(sx * (xa + out * 0.17), ya, RAIL_TOP + WHEEL_R), (sx * out, 0, 0))
            for ye in (yt - 5.0, yt + 5.0):  # rail clamps at the truck's ends
                for d in (-1, 1):
                    rail_clamp(dark, sx * RAIL_PAIR_X + d * GAUGE / 2, ye + Y0, RAIL_TOP)
    for y0, y1 in ((20.0, 23.0), (29.0, 32.0)):  # cross girders, behind the vehicle
        lbox(red, (-SIDE_X[0] - 0.4, y0, 3.7), (SIDE_X[0] + 0.4, y1, 8.7))
    # the office and utility room on the base, behind the vehicle (Noble's plans: "office at the base")
    # Its walls are built round a door and windows: the front's look at the vehicle (estimated; the
    # photographs show a lit room here at night, S61-03158).
    office = ring([L(-7.4, 18.5, 0)[:2], L(7.4, 18.5, 0)[:2], L(7.4, 32.0, 0)[:2], L(-7.4, 32.0, 0)[:2]], 0.3)
    skin = parts(g, "grey/office")
    office[0].build(skin, 9.0, 17.6, [(1.4, 4.6, 12.4, 15.6), (5.8, 9.0, 9.3, 16.0), (10.2, 13.4, 12.4, 15.6)])
    office[1].build(skin, 9.0, 17.6, [(3.5, 9.5, 12.4, 15.6)])
    office[2].build(skin, 9.0, 17.6)
    office[3].build(skin, 9.0, 17.6, [(4.0, 10.0, 12.4, 15.6)])
    window(parts, g, office[0], 1.4, 4.6, 12.4, 15.6)
    window(parts, g, office[0], 10.2, 13.4, 12.4, 15.6)
    window(parts, g, office[1], 3.5, 9.5, 12.4, 15.6, mullions=[6.5])
    window(parts, g, office[3], 4.0, 10.0, 12.4, 15.6, mullions=[7.0])
    lbox(grey, (-7.9, 18.0, 17.6), (7.9, 32.5, 18.1))
    lbox(deck, (-7.1, 18.8, 9.0), (7.1, 31.7, 9.32))  # its floor
    wall_door(parts, "ServiceStructure_OfficeDoor", g, office[0], 5.8, 9.0, 9.3, 16.0, opens="in", mat="white")
    if fine():
        for y in (18.5, 25.2, 31.9):  # ribs on its sides
            for sx in (-1, 1):
                sbox(grey, sx, 7.39, 7.5, y - 0.12, y + 0.12, 9.0, 17.6)
    # what was in it: a desk with its chair and telephone, lockers, a filing cabinet, an intercom panel
    # by the door, a clock. Of the period's kind (tools/blender/interiors.py), none of it from a photograph.
    interiors.desk(parts, g, interiors.at(L(-3.8, 29.1, 9.32), 90.0))
    interiors.chair(parts, g, interiors.at(L(-3.6, 27.9, 9.32), 95.0))
    interiors.lockers(parts, g, interiors.at(L(4.6, 30.15, 9.32), 90.0), 3)
    interiors.cabinet(parts, g, interiors.at(L(4.75, 20.4, 9.32), 0.0))
    interiors.panel(
        parts,
        g,
        sitelib.axes_local(L(-7.08, 19.3, 11.6), (0, 1, 0), (0, 0, 1)),
        2.0,
        2.6,
        [("lamps", "gar"), ("switches", 4), ("buttons", 3), ("label", "PAD  BLOCKHOUSE  LEVELS")],
        title="INTERCOM",
        font=srlib.load_font(),
        seed=11,
    )
    interiors.clock(parts, g, axes(L(-3.8, 31.68, 15.3), (1, 0, 0), (0, -1, 0)))
    # the stairs up to the base's deck from the pad, at the back on the hatch side (the photographs
    # show a flight here; where it stood on the base is estimated)
    # (NASA 61-MR4-45: a straight flight at the outboard end of the base, descending away from the
    # vehicle). Its foot is 9 in under the pad's surface: inside the hardstand while the structure
    # stands on it, and on the track's ballast once it has rolled back, so the first step is never
    # more than a riser either way.
    foot, top = L(10.5, 46.6, -0.75), L(10.5, 32.0, 9.3)
    stairs(dark, foot, top, 3.0)
    stair_rails(white, L(10.5, 45.5, 0.0), top, 3.0, 3.2)
    lbox(deck, (-7.42, PIT_FRONT, 9.0), (7.42, 18.0, 9.3))  # the deck before the lift, between the legs
    handrail(white, [L(-7.2, PIT_FRONT + 0.2, 9.3), L(7.2, PIT_FRONT + 0.2, 9.3)], 3.5)
    lbox(deck, (-SIDE_X[1], 18.0, 9.0), (-7.42, 32.0, 9.3))
    lbox(deck, (7.42, 18.0, 9.0), (SIDE_X[1], 32.0, 9.3))
    for sx in (-1, 1):  # the decks over the girders, where the legs stand
        sbox(deck, sx, SIDE_X[0], SIDE_X[1], -16.0, 17.98, 9.0, 9.3)
        handrail(white, [L(sx * (SIDE_X[1] - 0.2), -15.8, 9.3), L(sx * (SIDE_X[1] - 0.2), 31.8, 9.3)], 3.5)

    # ---- the A-frame mast: two lattice legs leaning in to the head, tied and braced between
    bays = 15
    zs = [BASE_Z + 0.3 + (MAST_TOP - BASE_Z - 0.3) * i / bays for i in range(bays + 1)]
    for sx in (-1, 1):

        def corner(i: int, z: float, sx=sx):
            return L(sx * leg_x(z) + LEG * (1 if i in (0, 3) else -1), MAST_Y + LEG * (1 if i < 2 else -1), z)

        for z0, z1 in zip(zs, zs[1:]):
            for i in range(4):
                beam(red, corner(i, z0), corner(i, z1), 0.75)
            for i in range(4):
                j = (i + 1) % 4
                beam(red, corner(i, z1), corner(j, z1), 0.36)
                beam(red, corner(i, z0), corner(j, z1), 0.3)
        sbox(red, sx, leg_x(BASE_Z) - 2.2, leg_x(BASE_Z) + 2.2, MAST_Y - 2.2, MAST_Y + 2.2, 9.3, 10.0)  # the leg's shoe and hinge
        dark.tube(P(*L(sx * (leg_x(BASE_Z) - 2.4), MAST_Y, 10.6)), P(*L(sx * (leg_x(BASE_Z) + 2.4), MAST_Y, 10.6)), 0.4 * FT, 12)

    def way_clear(za: float, zb: float) -> bool:
        """Whether a member across the A between two heights leaves every level's way from the lift to its platform open."""
        return all(zb < zf - 0.7 or za > zf + 7.0 for zf in (*LEVELS.values(), TOP_LEVEL))

    for i, z in enumerate(zs[2:-1:2]):  # ties across the A, and an X between each pair, where no way through is wanted
        for yy in (MAST_Y - LEG, MAST_Y + LEG):
            a, b = L(-(leg_x(z) - LEG), yy, z), L(leg_x(z) - LEG, yy, z)
            if way_clear(z - 0.3, z + 0.3):
                beam(red, a, b, 0.4)
            z2 = zs[min(len(zs) - 1, zs.index(z) + 2)]
            if i % 2 == 0 and z + 16.0 < MAST_TOP and way_clear(z, z2):
                beam(red, a, L(leg_x(z2) - LEG, yy, z2), 0.32)
                beam(red, b, L(-(leg_x(z2) - LEG), yy, z2), 0.32)
    # the brackets the platforms slide on, across the mast's front under each level
    for zf in LEVELS.values():
        lbox(red, (-DECK_X + 0.2, DECK_BACK + 0.02, zf - 1.6), (DECK_X - 0.2, MAST_Y - LEG + 0.4, zf - 0.6))  # level 4's sits on level 3
        # and a knee under the pad 6 side's end, back to the leg (the lift runs where the other would be)
        lbeam(red, (-(DECK_X - 1.0), DECK_BACK + 0.5, zf - 1.6), (-(leg_x(zf - 9.0) + LEG), MAST_Y - LEG, zf - 9.0), 0.4)

    access(parts)

    # ---- the hammerhead crane on the head: a girder fore and aft, two trolleys and their hooks
    zc0, zc1 = MAST_TOP, MAST_TOP + 5.5
    lbox(red, (-LEG_TOP_X - LEG - 0.6, MAST_Y - LEG - 0.6, MAST_TOP - 1.5), (LEG_TOP_X + LEG + 0.6, MAST_Y + LEG + 0.6, MAST_TOP))
    jy = [-14.0 + 42.0 * i / 14 for i in range(15)]

    def jib(i: int, y: float):
        return L(2.8 * (1 if i in (0, 3) else -1), y, zc1 if i < 2 else zc0 + 0.02)

    for y0, y1 in zip(jy, jy[1:]):
        for i in range(4):
            beam(red, jib(i, y0), jib(i, y1), 0.55)
        for i in range(4):
            j = (i + 1) % 4
            beam(red, jib(i, y1), jib(j, y1), 0.3)
            beam(red, jib(i, y0), jib(j, y1), 0.26)
    lbox(deck, (-3.6, jy[0], zc1 + 0.3), (3.6, jy[-1], zc1 + 0.6))  # the walkway on top
    handrail(  # open on the hatch side where the ladder comes up
        white,
        [L(3.4, CRANE_LADDER[1] - 1.7, zc1 + 0.6), L(3.4, jy[0] + 0.2, zc1 + 0.6), L(-3.4, jy[0] + 0.2, zc1 + 0.6), L(-3.4, jy[-1] - 0.2, zc1 + 0.6)],
        2.9,
    )
    handrail(white, [L(3.4, jy[-1] - 0.2, zc1 + 0.6), L(3.4, CRANE_LADDER[1] + 1.7, zc1 + 0.6)], 2.9)
    lbeam(white, (-3.4, jy[-1] - 0.2, zc1 + 0.6 + 2.9), (3.4, jy[-1] - 0.2, zc1 + 0.6 + 2.9), 0.13)
    lbeam(white, (-3.4, jy[-1] - 0.2, zc1 + 0.6 + 1.45), (3.4, jy[-1] - 0.2, zc1 + 0.6 + 1.45), 0.13)

    for bx in (-3.0, 3.0):  # red obstruction lights at the crane's ends (estimated: the usual practice; no photograph shows their colour)
        for by in (jy[0] + 0.6, jy[-1] - 0.6):
            red_lamp = parts(g, "lamp-red", True)
            red_lamp.lathe(ftp([(0.0, 0.0), (0.3, 0.0), (0.3, 0.7), (0.0, 0.9)]), 10, matrix=Matrix.Translation(P(*L(bx, by, zc1 + 0.6 + 2.95))))
    lbox(grey, (-3.4, 16.0, zc0 - 6.0), (3.4, 26.0, zc0 - 0.02))  # hoist machinery under the girder's tail
    for yt in (-8.0, -3.0):  # the dual travelling trolleys and hoists
        lbox(dark, (-2.0, yt - 1.4, zc0 - 1.2), (2.0, yt + 1.4, zc0 - 0.02))
        for dx in (-0.5, 0.5):
            lbeam(dark, (dx, yt, zc0 - 1.2), (dx, yt, zc0 - 16.0), 0.06)
        lbox(dark, (-0.8, yt - 0.6, zc0 - 18.0), (0.8, yt + 0.6, zc0 - 16.0))
        dark.lathe(
            ftp([(0, 0), (0.15, 0.0), (0.15, -1.0), (0.5, -1.4), (0.5, -1.6), (0.3, -1.8), (0, -1.8)]),
            10,
            matrix=Matrix.Translation(P(*L(0.0, yt, zc0 - 18.05))),
        )

    # ---- the platforms, each in two halves
    for n in LEVELS:
        for s in (-1, 1):
            platform(parts, n, s)
    work_lights(parts)
