"""Blocks B, V, G and D: the four strap-on boosters, the first stage. Each is a cone on a short
cylinder, pushing up on the core through a ball at its tip and tied to it at the foot.

Stations `s` are millimetres up the block's own axis from the middle of its tail's rim; +X is away
from the core. The block is built in the scene's axes and hung on a node whose origin is the middle
of its tip ball, which is what it swings about when it leaves.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

from srlib import TAU, deg, frame, group, interior

from . import engines
from .common import (
    BOOSTER_BAY,
    BOOSTER_CYL,
    BOOSTER_FUEL,
    BOOSTER_LENGTH,
    BOOSTER_LOX,
    BOOSTER_R,
    CHAMBER_AT,
    CORE_R_TAIL,
    FROST_EDGE,
    MM,
    NOZZLES,
    RUDDER_SPAN,
    Local,
    V,
    at,
    booster_frame,
    booster_r,
    core_frame,
    fin,
    frost_edge,
    frost_foot,
    hang,
    pivot,
    scalloped,
    segs,
)

SHELL_PARTS = ("Skin", "Frost", "Shield", "InnerWall", "Fittings", "Fasteners", "Rudder", "SteeringFairings")
CONE = math.atan2(BOOSTER_R, BOOSTER_LENGTH - BOOSTER_CYL)  # the cone's half angle, 5.63 degrees
NOSE = 19050.0  # where the cone ends in the neck that carries the ball
STEER_AT = (1500.0, 24.0)  # each steering chamber: from the block's axis, and degrees either side of the rudder
TAIL_SHIELD = 2700.0  # the polished steel on the side toward the core reaches this far up
SHIELD_RIM = 160.0  # and this far all the way round, at the rim


def shells(letter: str) -> tuple:
    return tuple(f"Booster_{letter}_{p}" for p in SHELL_PARTS)


def on_skin(az: float, s: float, off: float = 0.0) -> Matrix:
    """A frame on the block's skin, in its own axes: +Z out along the normal, +Y up the slope."""
    a = CONE if s > BOOSTER_CYL else 0.0
    n = Vector((math.cos(a) * math.cos(az), math.cos(a) * math.sin(az), math.sin(a)))
    r = booster_r(s)
    return frame((Vector((r * math.cos(az), r * math.sin(az), s)) + n * off) * MM, n)


def strip(mb: Local, az: float, s0: float, s1: float, width: float, proud: float, sunk: float = 10.0) -> None:
    cuts = [s0, *([BOOSTER_CYL] if s0 < BOOSTER_CYL < s1 else []), s1]
    for a, b in zip(cuts, cuts[1:]):
        length = math.hypot(b - a, booster_r(b) - booster_r(a))
        mb.box((width, length + 2 * sunk, proud + sunk), on_skin(az, (a + b) / 2, (proud - sunk) / 2))


def welds(mb: Local, az: float, s0: float, s1: float, bands) -> None:
    """A lengthwise weld from s0 to s1, broken at each frame (a station and its half width)."""
    a = s0
    for s, half in sorted(bands):
        if s0 < s < s1:
            strip(mb, az, a, s - half - 40, 22, 3, 4)
            a = s + half + 40
    strip(mb, az, a, s1, 22, 3, 4)


def pod(mb: Local, p0, p1, radius: float, nose: float, segs: int = 20) -> None:
    """A fairing: a bullet lying along the line p0 to p1, its nose buried in the skin at p0."""
    length = (Vector(p1) - Vector(p0)).length
    pts = [(0.0, 0.0), (radius * 0.45, nose * 0.3), (radius * 0.82, nose * 0.68), (radius, nose), (radius, length), (0.0, length)]
    mb.lathe(pts, segs, frame(Vector(p0) * MM, Vector(p1) - Vector(p0)))


def shield_top(az: float) -> float:
    """How far up the tail the polished steel reaches at an azimuth of the block: to the top of the tail facing
    the core, falling away in a curve to a strip at the rim on the far side."""
    phi = abs(math.remainder(az - math.pi, TAU))
    t = min(1.0, max(0.0, (phi - deg(35)) / deg(90)))
    return SHIELD_RIM + (TAIL_SHIELD - 60 - SHIELD_RIM) * (0.5 + 0.5 * math.cos(math.pi * t))


def band(mb: Local, s: float, half: float, proud: float, segs: int = 96, arc=(0.0, TAU)) -> None:
    r = booster_r(s)
    mb.lathe([(r - 3, s - half - proud), (r + proud, s - half), (r + proud, s + half), (r - 3, s + half + proud)], segs, arc=arc)


def dome(mb: Local, s: float, r: float, depth: float, up: bool, segs: int = 48, n: int = 8) -> None:
    sign = 1 if up else -1
    pts = [(r * math.cos(a), s + sign * depth * math.sin(a)) for a in (math.pi / 2 * k / n for k in range(n + 1))]
    mb.lathe(pts if up else pts[::-1], segs)


def build(base_z: float, M: dict, letter: str, az_deg: float) -> None:
    X = booster_frame(base_z, az_deg)
    name = f"Booster_{letter}"
    node = pivot(name, None, X @ V(0, 0, BOOSTER_LENGTH))
    skin, frost, shield, wall, fit, bolts, steel, rudder, fair = (Local(X) for _ in range(9))
    lox0, lox1 = BOOSTER_LOX
    # the tail: lacquer outside, polished steel over asbestos on the side that faces the core's fire
    us = [TAU * i / segs(96) for i in range(segs(96))]
    ring = lambda az, s: (BOOSTER_R * math.cos(az), BOOSTER_R * math.sin(az), s)  # noqa: E731
    shield.grid(lambda u, v: ring(u, v * shield_top(u)), us, [0.0, 1.0], closed_u=True)
    skin.grid(lambda u, v: ring(u, shield_top(u) + v * (TAIL_SHIELD - shield_top(u))), us, [0.0, 1.0], closed_u=True)
    # (the frame at the top of the engine bay shows through both: where the steel's edge crosses it)
    cross = deg(35) + deg(90) * math.acos(2 * (BOOSTER_BAY - SHIELD_RIM) / (TAIL_SHIELD - 60 - SHIELD_RIM) - 1) / math.pi
    out, inn = (-math.pi + cross, math.pi - cross), (math.pi - cross, math.pi + cross)
    skin.lathe([(BOOSTER_R, TAIL_SHIELD), (BOOSTER_R, lox0)], 96)
    turn = deg(az_deg) + 0.9  # the frost's edge is uneven, and each block shows a different stretch of it
    frost_foot(skin, frost, booster_r, lox0, turn)
    frost.lathe([(booster_r(lox0 + FROST_EDGE), lox0 + FROST_EDGE), (booster_r(lox1), lox1)], 96)
    skin.lathe([(booster_r(lox1), lox1), (booster_r(NOSE), NOSE)], 96)
    wall.lathe([(BOOSTER_R - 18, 0), (BOOSTER_R - 18, BOOSTER_CYL), (booster_r(lox1 + 300) - 18, lox1 + 300)], 96, flip=True)
    shield.lathe([(BOOSTER_R - 20, 0), (BOOSTER_R, 0)], 96)  # the tail's rim
    band(shield, 40, 30, 8)
    band(skin, BOOSTER_BAY, 22, 6, 58, out)
    band(shield, BOOSTER_BAY, 22, 6, 38, inn)
    # where the tail joins the tank section a doubler goes round, its lower edge cut in scallops (the Kaluga vehicle)
    scalloped(skin, BOOSTER_R, TAIL_SHIELD - 40, TAIL_SHIELD + 52, 48, 105, 6)
    on_lacquer = ((BOOSTER_FUEL[1], 22, 6), (lox0 - 40, 30, 8), (lox1 + 30, 20, 5))
    for s, half, proud in on_lacquer:
        band(skin, s, half, proud)
    rings = (7900, 10200, 12500, 14800)  # the oxygen tank's ring welds
    for s in rings:
        band(frost, s, 12, 6)
    frames = [(s, half + proud) for s, half, proud in on_lacquer] + [(s, 18) for s in rings]
    # the nose: a neck and the ball that carries the block's thrust into the core
    steel.lathe([(booster_r(NOSE) + 4, NOSE - 60), (52, NOSE + 30), (40, NOSE + 60), (40, BOOSTER_LENGTH - 60)], 24)
    steel.ball((0, 0, BOOSTER_LENGTH), 84, 24, 12)
    # On the pad the whole vehicle hangs from the launch system's four arms by a fitting on each block's nose cone
    # (RKK Energia's history: by the blocks' «силовые головки»). Where on the cone, and its form, are estimated.
    for k in (-1, 1):
        steel.box((50, 220, 150), on_skin(0.0, lox1 + 620, 20) @ Matrix.Translation(V(k * 105, 0, 0)))
    steel.tube(
        tuple(on_skin(0.0, lox1 + 620, 60).translation / MM + Vector((0, -150, 0))),
        tuple(on_skin(0.0, lox1 + 620, 60).translation / MM + Vector((0, 150, 0))),
        34,
        12,
    )
    # lengthwise welds, a duct up the side, and two small fairings by the nose (the oxygen tank's vents)
    for i in range(6):
        a = deg(30 + 60 * i)
        welds(skin, a, TAIL_SHIELD + 80, lox0 - 90, frames)
        welds(frost, a, lox0 + FROST_EDGE + 20, lox1 - 60, frames)
    for a in (deg(120), deg(-120)):
        strip(fit, a, TAIL_SHIELD + 80, lox0 - 80, 150, 70)
        strip(fit, a, lox0 + 60, lox0 + frost_edge(a, turn) - 30, 150, 70)
        strip(frost, a, lox0 + frost_edge(a, turn) + 30, 15600, 150, 70)
    for a in (deg(90), deg(-90)):
        c, sn = math.cos(a), math.sin(a)
        pod(
            fair,
            ((booster_r(17250) - 30) * c, (booster_r(17250) - 30) * sn, 17250),
            ((booster_r(16300) + 30) * c, (booster_r(16300) + 30) * sn, 16300),
            62,
            420,
            12,
        )
    for k in (-1, 1):  # under the engine bay's frame, small fairings nose up and a round port between them (the Kaluga vehicle)
        for a in (deg(k * 62), deg(k * 95)):
            c, sn = math.cos(a), math.sin(a)
            top, foot = BOOSTER_BAY - 70, BOOSTER_BAY - 430
            pod(fair, ((BOOSTER_R - 30) * c, (BOOSTER_R - 30) * sn, top), ((BOOSTER_R + 40) * c, (BOOSTER_R + 40) * sn, foot), 78, 250, 12)
        a = deg(k * 78)
        fit.disc(((BOOSTER_R - 4) * math.cos(a), (BOOSTER_R - 4) * math.sin(a), BOOSTER_BAY - 240), (math.cos(a), math.sin(a), 0), 80, 14, 20)
    for a in (deg(40), deg(-40)):  # hatches into the engine bay
        fit.box((520, 600, 20), on_skin(a, 1050, -2))
    fit.box((420, 280, 20), on_skin(deg(60), (BOOSTER_FUEL[1] + lox0) / 2 - 20, -2))  # and between the tanks
    for s in (110, BOOSTER_BAY, TAIL_SHIELD + 30, lox0 - 40):
        for i in range(84):
            a = TAU * (i + 0.5) / 84
            bolts.disc(((BOOSTER_R + 5) * math.cos(a), (BOOSTER_R + 5) * math.sin(a), s), (math.cos(a), math.sin(a), 0), 9, 5)
    # the air rudder: one triangle on the outer side, which steers while the air is thick enough to bite
    tip = BOOSTER_R + RUDDER_SPAN
    fin(rudder, [(BOOSTER_R + 26, 130), (tip, 130), (tip, 330), (BOOSTER_R + 26, 1650)], 86, 26, BOOSTER_R, tip, Matrix.Identity(4))
    fin(
        fit,
        [(BOOSTER_R - 60, 90), (BOOSTER_R + 150, 90), (BOOSTER_R + 150, 700), (BOOSTER_R - 60, 1150)],
        130,
        110,
        BOOSTER_R,
        BOOSTER_R + 150,
        Matrix.Identity(4),
    )
    rudder.tube((BOOSTER_R + 100, 0, 420), (BOOSTER_R + 240, 0, 420), 30, 12)  # its shaft
    # each steering chamber hangs in the open on an outrigger, either side of the rudder, under a small fairing on the skin
    reach, spread = STEER_AT
    steer = []
    for k in (-1, 1):
        a = deg(k * spread)
        c, sn = math.cos(a), math.sin(a)
        steer.append((reach * c, reach * sn, a))
        pod(fair, ((BOOSTER_R - 45) * c, (BOOSTER_R - 45) * sn, 1280), ((BOOSTER_R + 80) * c, (BOOSTER_R + 80) * sn, 345), 112, 400, 14)
        end = ((reach + 168) * c, (reach + 168) * sn, 310)  # the outer end of the yoke's bar (engines.py)
        for j in (-1, 1):
            b = a + j * deg(7)
            steel.tube(end, ((BOOSTER_R - 12) * math.cos(b), (BOOSTER_R - 12) * math.sin(b), 880), 24, 8, caps=False)
        steel.box((120, 300, 150), on_skin(a, 330, 30))  # the bracket the yoke hangs from
    # the base: a shield with a hole for each chamber
    shield.plate(BOOSTER_R - 12, 45, 292, [(sx * CHAMBER_AT, sy * CHAMBER_AT) for sx in (-1, 1) for sy in (-1, 1)])
    # two ties at the foot, to locks on the core, which take the sideways loads and are let go to release the block
    T = Local(core_frame(base_z) @ Matrix.Rotation(deg(az_deg), 4, "Z"))
    T.mb = steel.mb
    for k in (-1, 1):
        T.tube((2780 - BOOSTER_R + 40, k * 520, NOZZLES + 900), (CORE_R_TAIL - 65, k * 330, NOZZLES + 900), 34, 12)
        T.box((70, 150, 150), at(2780 - BOOSTER_R - 20, k * 520, NOZZLES + 900))
    meshes = [
        skin.build(f"{name}_Skin", M["lacquer"], None, sharp_angle=30),
        frost.build(f"{name}_Frost", M["frost"], None, sharp_angle=30),
        shield.build(f"{name}_Shield", M["shield"], None, sharp_angle=30),
        wall.build(f"{name}_InnerWall", M["wall"], None, sharp_angle=None),
        fit.build(f"{name}_Fittings", M["lacquer"], None, smooth=False),
        bolts.build(f"{name}_Fasteners", M["bolt"], None),
        steel.build(f"{name}_TipAndTies", M["steel"], None, sharp_angle=35),
        rudder.build(f"{name}_Rudder", M["pale"], None, smooth=False),
        fair.build(f"{name}_SteeringFairings", M["lacquer"], None, sharp_angle=None),
    ]
    if interior():
        tanks, pipes = Local(X), Local(X)
        inset = 30.0
        for (s0, s1), deep in ((BOOSTER_FUEL, 0.25), (BOOSTER_LOX, 0.3)):
            for s, up in ((s0, False), (s1, True)):
                r = booster_r(s) - inset
                dome(tanks, s, r, r * deep, up)
                tanks.lathe([(r - 30, s), (r + inset - 19, s)], 48)
        pipes.tube((0, 0, BOOSTER_FUEL[0] - 420), (0, 0, lox0 - 330), 150, 20)  # the oxygen's pipe, through the fuel tank
        tanks.torus(860, 300, 200, 1985, 48)  # hydrogen peroxide
        tanks.torus(900, 250, 95, 2300, 48)  # liquid nitrogen
        meshes += [tanks.build(f"{name}_Tanks", M["tank"], None, sharp_angle=None), pipes.build(f"{name}_FeedPipe", M["pipe"], None, sharp_angle=40)]
    e = group(f"{name}_Engine", None)  # the RD-107, built in the block's axes below its rim
    engines.build(X @ at(0, 0, -NOZZLES), e, M, f"RD107_{letter}", steer, BOOSTER_FUEL[0] + NOZZLES)
    meshes += list(e.children)
    for obj in meshes:
        hang(obj, node)
    bpy.data.objects.remove(e)
