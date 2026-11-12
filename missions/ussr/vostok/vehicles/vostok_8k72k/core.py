"""Block A, the core: the second stage, which lights on the ground with the boosters and burns on
after they have gone. Stations are heights above the main nozzles' exits, mm (common.py)."""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from srlib import TAU, deg, frame, group, interior

from . import engines
from .common import (
    BOOSTER_AZ,
    BOOSTER_LENGTH,
    BOOSTER_TIP_H,
    BOOSTER_TIP_R,
    CHAMBER_AT,
    CORE_BAY,
    CORE_FUEL,
    CORE_LOX,
    CORE_NECK,
    CORE_R_TAIL,
    CORE_TAPER,
    CORE_TOP,
    FROST_EDGE,
    MM,
    NOZZLES,
    Local,
    at,
    booster_frame,
    core_frame,
    core_r,
    fin,
    frost_edge,
    frost_foot,
)

SHELLS = ("Core_Skin", "Core_Frost", "Core_TailShield", "Core_InnerWall", "Core_Fittings", "Core_Fasteners", "CoreEngine_Fairings")
STEER_R = 1270.0  # the steering chambers from the axis, in line with the boosters: as far out as the boosters' tails leave room
# each one's fairing: its outer face from the axis at its foot and at its top (it leans with the booster's tail, 40 mm off),
# half its width, and the stations of its top on the skin and on that face
HOUSING = (1395.0, 1320.0, 200.0, 2300.0, 1750.0)
TUNNEL_R = 160.0  # the oxygen's pipe down through the fuel tank, in its lagging
KNEES = (NOZZLES, CORE_TAPER, BOOSTER_TIP_H, CORE_NECK, CORE_TOP)


def slope(h: float) -> float:
    """How far the skin leans out from the axis going up, radians."""
    return math.atan2(core_r(h + 1) - core_r(h - 1), 2.0)


def on_skin(az: float, h: float, off: float = 0.0) -> Matrix:
    """A frame on the skin (in the core's own millimetres turned to metres): +Z out along the normal, +Y up the slope."""
    a = slope(h)
    n = Vector((math.cos(a) * math.cos(az), math.cos(a) * math.sin(az), -math.sin(a)))
    r = core_r(h)
    return frame((Vector((r * math.cos(az), r * math.sin(az), h)) + n * off) * MM, n)


def runs(h0: float, h1: float):
    """A stretch of skin cut at the knees, so that each piece lies along one straight side."""
    cuts = [h0, *[k for k in KNEES if h0 < k < h1], h1]
    return list(zip(cuts, cuts[1:]))


def strip(mb: Local, az: float, h0: float, h1: float, width: float, proud: float, sunk: float = 10.0) -> None:
    """Something long laid up the skin: a duct, a weld."""
    for a, b in runs(h0, h1):
        length = math.hypot(b - a, core_r(b) - core_r(a))
        mb.box((width, length + 2 * sunk, proud + sunk), on_skin(az, (a + b) / 2, (proud - sunk) / 2))


def welds(mb: Local, az: float, h0: float, h1: float, bands) -> None:
    """A lengthwise weld from h0 to h1, broken at each frame (a station and its half width) so that it never lies on one."""
    a = h0
    for h, half in sorted(bands):
        if h0 < h < h1:
            strip(mb, az, a, h - half - 40, 24, 3, 4)
            a = h + half + 40
    strip(mb, az, a, h1, 24, 3, 4)


def housing(mb: Local, r_in: float, r_foot: float, r_out: float, half: float, z0: float, z1: float, z_top: float, wall: float = 14.0) -> None:
    """A fairing over a steering chamber, in axes whose +X is out from the core: a flat-sided box down the tail,
    sloped in to the skin at its top and open below, where the chamber hangs. It has an inside, which is seen from under."""

    def shell(rf: float, ro: float, w: float, top: float, peak: float, out: bool) -> None:
        a = [(r_in, -w, z0), (rf, -w, z0), (ro, -w, top), (r_in, -w, peak)]  # the side at -Y, and the one at +Y
        b = [(x, w, z) for x, _y, z in a]
        faces = [a, b[::-1], [a[1], b[1], b[2], a[2]], [a[2], b[2], b[3], a[3]]]  # sides, outer face, sloped top
        for face in faces:
            mb.mb.add(face if out else face[::-1], [(0, 1, 2, 3)], None, mb.x @ Matrix.Scale(MM, 4))

    shell(r_foot, r_out, half, z1, z_top, True)
    shell(r_foot - wall, r_out - wall, half - wall, z1 - wall, z_top - 2 * wall, False)
    lip = [(r_in, -half), (r_foot, -half), (r_foot, half), (r_in, half)]  # the open end's edge
    inner = [(r_in, -half + wall), (r_foot - wall, -half + wall), (r_foot - wall, half - wall), (r_in, half - wall)]
    for i in range(3):
        quad = [(*lip[i], z0), (*inner[i], z0), (*inner[i + 1], z0), (*lip[i + 1], z0)]
        mb.mb.add(quad, [(0, 1, 2, 3)], None, mb.x @ Matrix.Scale(MM, 4))


def band(mb: Local, h: float, half: float, proud: float, segs: int = 96) -> None:
    """A frame showing through the skin: a raised ring whose edges are sunk into it."""
    r = core_r(h)
    mb.lathe([(r - 3, h - half - proud), (r + proud, h - half), (r + proud, h + half), (r - 3, h + half + proud)], segs)


def dome(mb: Local, h: float, r: float, depth: float, up: bool, segs: int = 64, n: int = 10) -> None:
    """A tank's end: part of an ellipsoid, bulging up or down from the frame at `h`."""
    sign = 1 if up else -1
    pts = [(r * math.cos(a), h + sign * depth * math.sin(a)) for a in (math.pi / 2 * k / n for k in range(n + 1))]
    mb.lathe(pts if up else pts[::-1], segs)


def build(base_z: float, M: dict) -> None:
    X = core_frame(base_z)
    g = group("CoreStage")
    skin, frost, shield, wall, fit, bolts, steel, bracket = (Local(X) for _ in range(8))
    lox0, lox1 = CORE_LOX
    shield_top = 1500.0  # the tail's lower part is under polished steel over asbestos
    skin.lathe([(core_r(h), h) for h in (shield_top, CORE_TAPER, lox0)], 96)
    skin.lathe([(core_r(h), h) for h in (lox1, CORE_NECK, CORE_TOP)], 96)
    frost_foot(skin, frost, core_r, lox0, 0.0)  # the frost's edge is uneven
    frost.lathe([(core_r(h), h) for h in (lox0 + FROST_EDGE, BOOSTER_TIP_H, lox1)], 96)
    shield.lathe([(CORE_R_TAIL, NOZZLES), (CORE_R_TAIL, shield_top)], 96)
    wall.lathe([(core_r(h) - 20, h) for h in (NOZZLES, CORE_TAPER, BOOSTER_TIP_H, CORE_NECK, CORE_TOP)], 96, flip=True)
    # frames where the tanks' ends and the bays meet the skin, and the heavy one the boosters push on
    on_lacquer = (
        (CORE_BAY, 26, 7),
        (CORE_FUEL[0], 22, 6),
        (9800, 14, 6),
        (CORE_FUEL[1], 22, 6),
        (lox0 + 40, 22, 6),
        (CORE_NECK, 22, 6),
        (CORE_TOP - 40, 36, 10),
    )
    on_frost = ((17500, 14, 6), (BOOSTER_TIP_H, 60, 16), (22000, 14, 6), (24000, 14, 6), (lox1 - 40, 22, 6))
    for h, half, proud in on_lacquer:
        band(skin, h, half, proud)
    for h, half, proud in on_frost:
        band(frost, h, half, proud)
    frames = [(h, half + proud) for h, half, proud in (*on_lacquer, *on_frost)]
    band(shield, shield_top - 30, 22, 6)
    shield.lathe([(CORE_R_TAIL - 22, NOZZLES), (CORE_R_TAIL, NOZZLES)], 96)  # the tail's rim
    # lengthwise welds, and two ducts carrying cables and lines past the tanks, between the boosters
    for i in range(6):
        az = deg(15 + 60 * i)
        welds(skin, az, shield_top + 40, lox0 - 30, frames)
        welds(frost, az, lox0 + FROST_EDGE + 20, lox1 - 110, frames)
        welds(skin, az, lox1 + 30, CORE_TOP - 120, frames)
    for az in (deg(45), deg(135)):
        strip(fit, az, 1700, lox0 - 60, 170, 85)
        strip(fit, az, lox1 + 60, CORE_TOP - 120, 170, 85)
        strip(fit, az, lox0 + 80, lox0 + frost_edge(az, 0.0) - 30, 170, 85)
        strip(frost, az, lox0 + frost_edge(az, 0.0) + 30, lox1 - 80, 170, 85)
    # hatches into the engine bay and the instrument bay
    for az in (deg(225), deg(315)):
        fit.box((560, 640, 20), on_skin(az, 2550, -2))
    for az in (deg(20), deg(170), deg(260)):
        fit.box((480, 440, 20), on_skin(az, CORE_NECK + 520, -2))
    for h in (NOZZLES + 60, shield_top - 30, CORE_BAY, lox1 + 30, CORE_TOP - 40):
        for i in range(72):
            a = TAU * (i + 0.5) / 72
            r = core_r(h) + (16 if h == CORE_TOP - 40 else 6)
            bolts.disc((r * math.cos(a), r * math.sin(a), h), (math.cos(a), math.sin(a), 0), 9, 5)
    # the bracket each booster's tip ball pushes up into: a cup on an arm from the frame
    for az in BOOSTER_AZ.values():
        cup = Local(booster_frame(base_z, az))
        cup.mb = steel.mb
        top = BOOSTER_LENGTH
        cup.lathe([(118, top - 40), (128, top + 70), (70, top + 132), (0, top + 140)], 24)
        cup.lathe([(100, top - 40), (100, top + 40), (50, top + 96), (0, top + 100)], 24, flip=True)
        cup.lathe([(100, top - 40), (118, top - 40)], 24)
        arm = Local(X @ Matrix.Rotation(deg(az), 4, "Z"))
        arm.mb = bracket.mb
        r, h, reach = core_r(BOOSTER_TIP_H), BOOSTER_TIP_H, BOOSTER_TIP_R + 150
        arm.box((70, 460, 520), at(r + 20, 0, h + 10))  # its foot, on the frame
        arm.box((reach - r + 20, 300, 44), at((reach + r) / 2 - 10, 0, h + 236))  # the plate over the cup
        for k in (-1, 1):  # two webs carrying the plate's load down into the frame
            fin(
                arm,
                [(r - 12, h - 250), (r + 60, h - 250), (reach, h + 120), (reach, h + 214), (r - 12, h + 214)],
                30,
                30,
                r,
                reach,
                at(0, k * 118, 0),
            )
    # the base: a shield with a hole for each chamber
    shield.plate(CORE_R_TAIL - 12, NOZZLES + 45, 292, [(sx * CHAMBER_AT, sy * CHAMBER_AT) for sx in (-1, 1) for sy in (-1, 1)])
    skin.build("Core_Skin", M["lacquer"], g, sharp_angle=30)
    frost.build("Core_Frost", M["frost"], g, sharp_angle=30)
    shield.build("Core_TailShield", M["shield"], g, sharp_angle=30)
    wall.build("Core_InnerWall", M["wall"], g, sharp_angle=None)
    fit.build("Core_Fittings", M["lacquer"], g, smooth=False)
    bolts.build("Core_Fasteners", M["bolt"], g)
    steel.build("Core_Cups", M["steel"], g, sharp_angle=35)
    bracket.build("Core_Brackets", M["pale"], g, smooth=False)
    if interior():
        tanks, pipes, gear = Local(X), Local(X), Local(X)
        inset = 34.0
        for (h0, h1), deep in ((CORE_FUEL, 0.30), (CORE_LOX, 0.32)):
            for h, up in ((h0, False), (h1, True)):
                r = core_r(h) - inset
                dome(tanks, h, r, r * deep, up)
                tanks.lathe([(r - 40, h), (r + inset - 21, h)], 64)  # each end's frame, out to the wall
        # the oxygen comes down a lagged pipe through the middle of the fuel tank
        pipes.tube((0, 0, CORE_BAY - 420), (0, 0, CORE_LOX[0] - 300), TUNNEL_R, 24)
        # hydrogen peroxide for the turbopump and liquid nitrogen to pressurise the tanks, in rings round the pipe
        tanks.torus(640, 330, 310, 4130, 48)
        tanks.torus(700, 220, 150, 4870, 48)
        # instruments under the lattice: representative
        gear.lathe([(0, lox1 + 620), (1180, lox1 + 620), (1180, lox1 + 650), (0, lox1 + 650)], 32)
        for i in range(7):
            a = TAU * i / 7
            gear.box((330, 420, 380 + 90 * (i % 3)), at(820 * math.cos(a), 820 * math.sin(a), lox1 + 850 + 45 * (i % 3)) @ Matrix.Rotation(a, 4, "Z"))
        tanks.build("Core_Tanks", M["tank"], g, sharp_angle=None)
        pipes.build("Core_FeedPipe", M["pipe"], g, sharp_angle=40)
        gear.build("Core_Instruments", M["equipment"], g, sharp_angle=35)

    # ---------------------------------------------------------------- RD-108
    e = group("CoreEngine")
    # each steering chamber's trunnions lie across the line to its booster, whose tail is 36 mm from the fairing's face
    steer = [(STEER_R * math.cos(deg(az)), STEER_R * math.sin(deg(az)), deg(az) + math.pi / 2) for az in BOOSTER_AZ.values()]
    engines.build(X, e, M, "RD108", steer, CORE_BAY)
    fair = Local(X)
    r_foot, r_out, half, z_top, z1 = HOUSING
    for az in BOOSTER_AZ.values():  # each hangs under a square fairing on the tail, open below
        box = Local(X @ Matrix.Rotation(deg(az), 4, "Z"))
        box.mb = fair.mb
        housing(box, CORE_R_TAIL - 65, r_foot, r_out, half, NOZZLES + 50, z1, z_top)
    fair.build("CoreEngine_Fairings", M["shield"], e, smooth=False)
