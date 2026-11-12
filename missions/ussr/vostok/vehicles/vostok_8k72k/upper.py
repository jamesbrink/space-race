"""What stands on the core: the open lattice the third stage fires through, Block E with the
adapter the spacecraft sits on, and the fairing in two halves. Stations are heights above the
main nozzles' exits, mm (common.py)."""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix

from srlib import TAU, bore, deg, frame, group, interior

from .common import (
    BLOCK_E_R,
    BLOCK_E_TOP,
    CORE_R_TOP,
    CORE_TOP,
    FAIRING_CYL,
    FAIRING_R,
    FAIRING_TIP_R,
    LENGTH,
    TRUSS_TOP,
    Local,
    V,
    at,
    core_frame,
    hang,
    pivot,
)

SHELLS = (
    "BlockE_Skin",
    "BlockE_InnerWall",
    "BlockE_Stringers",
    "BlockE_Base",
    "BlockE_Fittings",
    "Fairing_Left_Skin",
    "Fairing_Left_Wall",
    "Fairing_Left_Fittings",
    "Fairing_Left_Coaming",
    "Fairing_Right_Skin",
    "Fairing_Right_Wall",
    "Fairing_Right_Fittings",
)
E_SKIRT = TRUSS_TOP + 150.0  # where Block E's cylinder begins, above its base shield
E_EXIT = TRUSS_TOP - 600.0  # the RD-0109's nozzle hangs into the lattice
E_EXIT_R = 330.0
# the RD-0109's chamber, outside: (radius, station)
E_BELL = [
    (E_EXIT_R, E_EXIT),
    (318, E_EXIT + 150),
    (270, E_EXIT + 410),
    (200, E_EXIT + 650),
    (120, E_EXIT + 840),
    (62, E_EXIT + 950),
    (72, E_EXIT + 990),
]
E_HEAD = [(122, E_EXIT + 1050), (150, E_EXIT + 1110), (150, E_EXIT + 1330), (110, E_EXIT + 1390), (0, E_EXIT + 1410)]
FAIRING_WALL = 22.0
OPENING_R = 575.0  # the round opening over hatch No. 1
OGIVE = 14  # straight pieces in the nose's arc


def build_interstage(X: Matrix, M: dict) -> None:
    """The lattice: Block E lights while the core is still burning, and its fire leaves between the struts."""
    g = group("Interstage")
    truss, cone = Local(X), Local(X)
    z0, z1 = CORE_TOP, TRUSS_TOP
    r = CORE_R_TOP - 40
    for z in (z0 + 30, z1 - 30):  # a ring at each end
        truss.lathe([(r - 45, z - 30), (r + 40, z - 30), (r + 40, z + 30), (r - 45, z + 30), (r - 45, z - 30)], 72)
    n = 12
    for i in range(n):
        a0 = TAU * i / n
        for k in (-0.5, 0.5):
            a1 = a0 + TAU * k / n
            truss.tube((r * math.cos(a0), r * math.sin(a0), z0 + 40), (r * math.cos(a1), r * math.sin(a1), z1 - 40), 32, 10, caps=False)
        truss.box((150, 110, 120), at(r * math.cos(a0), r * math.sin(a0), z0 + 95) @ Matrix.Rotation(a0, 4, "Z"))  # each foot
        a1 = a0 + TAU * 0.5 / n
        truss.box((150, 110, 120), at(r * math.cos(a1), r * math.sin(a1), z1 - 95) @ Matrix.Rotation(a1, 4, "Z"))
    # the deflector on the core's top turns the upper engine's fire out through the lattice
    cone.lathe([(CORE_R_TOP - 20, z0 + 2), (1130, z0 + 60), (420, z0 + 380), (120, z0 + 455), (0, z0 + 465)], 72)
    truss.build("Interstage_Lattice", M["alu"], g, sharp_angle=35)
    cone.build("Interstage_Deflector", M["deflector"], g, sharp_angle=30)


def build_block_e(X: Matrix, M: dict) -> None:
    """The third stage: two ring tanks one above the other with the engine in the hole, and above
    them the adapter the spacecraft's frame rests on."""
    g = group("BlockE")
    skin, wall, ribs, base, fit, bell, liner, steel, pod = (Local(X) for _ in range(9))
    top = BLOCK_E_TOP
    skin.lathe([(BLOCK_E_R, E_SKIRT), (BLOCK_E_R, top - 6)], 96)
    skin.lathe([(BLOCK_E_R, top - 6), (BLOCK_E_R - 150, top - 6)], 96)  # the ledge the spacecraft's frame stands on
    wall.lathe([(BLOCK_E_R - 16, E_SKIRT), (BLOCK_E_R - 16, top - 40), (BLOCK_E_R - 150, top - 40), (BLOCK_E_R - 150, top - 6)], 96, flip=True)
    for z, half in ((E_SKIRT + 30, 26), (TRUSS_TOP + 960, 18), (TRUSS_TOP + 1960, 22), (top - 50, 30)):
        skin.lathe([(BLOCK_E_R - 3, z - half - 8), (BLOCK_E_R + 8, z - half), (BLOCK_E_R + 8, z + half), (BLOCK_E_R - 3, z + half + 8)], 96)
    for i in range(48):  # stringers on the adapter
        a = TAU * (i + 0.5) / 48
        ribs.box((22, 900, 30), frame(V(BLOCK_E_R * math.cos(a), BLOCK_E_R * math.sin(a), TRUSS_TOP + 2460), (math.cos(a), math.sin(a), 0)))
    for a, z in ((deg(20), TRUSS_TOP + 520), (deg(200), TRUSS_TOP + 520), (deg(110), TRUSS_TOP + 1450), (deg(290), TRUSS_TOP + 1450)):
        fit.box((420, 380, 30), frame(V(BLOCK_E_R * math.cos(a), BLOCK_E_R * math.sin(a), z), (math.cos(a), math.sin(a), 0)))
    for i in range(4):  # the spacecraft is pushed off by four spring pushers on the ledge
        a = TAU * i / 4 + deg(22.5)
        fit.box((90, 120, 150), at((BLOCK_E_R - 70) * math.cos(a), (BLOCK_E_R - 70) * math.sin(a), top - 90) @ Matrix.Rotation(a, 4, "Z"))
    # the base: a dished shield round the nozzle, dark with its coating
    hole = 215.0
    base.lathe([(hole, TRUSS_TOP + 40), (700, TRUSS_TOP + 20), (BLOCK_E_R - 60, TRUSS_TOP + 90), (BLOCK_E_R, E_SKIRT)], 96)
    # RD-0109: one chamber, which does not turn
    bell.lathe(E_BELL + E_HEAD, 48)
    bell.lathe([(E_EXIT_R - 10, E_EXIT), (E_EXIT_R, E_EXIT)], 48)
    liner.lathe([(r - 10, z) for r, z in E_BELL] + [(112, E_EXIT + 1050), (112, E_EXIT + 1300), (0, E_EXIT + 1300)], 48, flip=True)
    for z in (E_EXIT + 20, E_EXIT + 300, E_EXIT + 560):
        r = next(r0 + (r1 - r0) * (z - z0) / (z1 - z0) for (r0, z0), (r1, z1) in zip(E_BELL, E_BELL[1:]) if z0 <= z <= z1)
        bell.lathe([(r - 2, z - 18), (r + 9, z - 8), (r + 9, z + 8), (r - 2, z + 18)], 48)
    # It is steered by the turbine's spent gas, piped across the base to eight small nozzles at the rim (Minakov):
    # four fixed to the outside of the stage, for pitch and yaw, and four that turn, for roll. Which stood at which
    # azimuth is not known to us: the fixed ones are drawn in line with the boosters and the turning ones between.
    for i in range(8):
        a = TAU * i / 8
        c, s = math.cos(a), math.sin(a)
        fixed = i % 2 == 0
        reach = 1372 if fixed else 1345
        steel.loft(
            [
                (180 * c, 180 * s, TRUSS_TOP + 190),
                (330 * c, 330 * s, TRUSS_TOP - 20),
                (760 * c, 760 * s, TRUSS_TOP - 30),
                (1200 * c, 1200 * s, TRUSS_TOP + 40),
                ((reach - 10) * c, (reach - 10) * s, TRUSS_TOP + 60),
            ],
            [(34, 34)] * 5,
            12,
            ref=(0, 0, 1),
        )
        m = at(reach * c, reach * s, TRUSS_TOP - 60)
        steel.lathe([(52, 0), (46, 50), (26, 110), (30, 130), (48, 150), (48, 230), (0, 245)], 16, m)
        steel.lathe([(46, 0), (40, 50), (20, 110), (0, 110)], 16, m, flip=True)
        turn = Matrix.Rotation(a, 4, "Z")
        if fixed:  # under a square fairing on the skin, its top sloped to the air
            pod.box((170, 190, 300), at(1365 * c, 1365 * s, TRUSS_TOP + 290) @ turn)
            pod.box((170, 190, 150), at(1335 * c, 1335 * s, TRUSS_TOP + 440) @ turn @ Matrix.Rotation(deg(-32), 4, "Y"))
        else:  # in a fork on a bracket at the rim, on trunnions that lie along the radius, so that it swings round the stage
            steel.box((120, 90, 60), at(1300 * c, 1300 * s, TRUSS_TOP + 190) @ turn)
            steel.tube(((reach - 85) * c, (reach - 85) * s, TRUSS_TOP + 130), ((reach + 85) * c, (reach + 85) * s, TRUSS_TOP + 130), 15, 8)
            for k in (-1, 1):
                steel.box((18, 46, 120), at((reach + k * 76) * c, (reach + k * 76) * s, TRUSS_TOP + 170) @ turn)
    skin.build("BlockE_Skin", M["pale"], g, sharp_angle=30)
    wall.build("BlockE_InnerWall", M["wall"], g, sharp_angle=30)
    ribs.build("BlockE_Stringers", M["pale"], g, smooth=False)
    base.build("BlockE_Base", M["dark"], g, sharp_angle=None)
    fit.build("BlockE_Fittings", M["pale"], g, smooth=False)
    bell.build("RD0109_Bell", M["bell"], g, sharp_angle=35)
    liner.build("RD0109_Liner", M["liner"], g, sharp_angle=35)
    steel.build("BlockE_Steering", M["steel"], g, sharp_angle=35)
    pod.build("BlockE_SteeringFairings", M["pale"], g, smooth=False)
    if interior():
        tanks, gear, pump = Local(X), Local(X), Local(X)
        tanks.torus(800, 460, 380, TRUSS_TOP + 560, 64, 28, power=3.0)  # the lower ring, drawn as the fuel's
        tanks.torus(800, 460, 480, TRUSS_TOP + 1440, 64, 28, power=3.0)  # the upper, drawn as the oxygen's
        tanks.lathe([(1150, TRUSS_TOP + 820), (1150, TRUSS_TOP + 1080)], 64)  # the cylinder that joins them
        # the turbopump and gas generator beside the chamber's head
        pump.lathe([(0, -170), (95, -170), (95, 170), (0, 170)], 16, frame(V(0, 215, E_EXIT + 1330), (1, 0, 0)))
        pump.ball((150, -160, E_EXIT + 1420), 85, 16, 8)
        pump.tube((0, 0, E_EXIT + 1400), (0, 150, E_EXIT + 1380), 40, 10)
        # the radio compartment, moved up here from the core: boxes round the adapter's wall
        for i in range(10):
            a = TAU * i / 10 + deg(8)
            gear.box((200, 330, 300 + 60 * (i % 2)), at(1120 * math.cos(a), 1120 * math.sin(a), TRUSS_TOP + 2380) @ Matrix.Rotation(a, 4, "Z"))
        tanks.build("BlockE_Tanks", M["tank"], g, sharp_angle=None)
        pump.build("RD0109_Turbopump", M["engine"], g, sharp_angle=35)
        gear.build("BlockE_Instruments", M["equipment"], g, sharp_angle=35)


def fairing_profile() -> list:
    """(radius, station) up the fairing's outside: a cylinder, then an ogive, which leaves the cylinder without a
    corner and runs into a rounded tip. Points 1 to 1 + OGIVE are the ogive's."""
    foot, tip = BLOCK_E_TOP, LENGTH
    centre = tip - FAIRING_TIP_R
    shoulder = foot + FAIRING_CYL
    rise = centre - shoulder
    # the arc's centre is level with the shoulder, and its radius is the one that touches the tip's sphere from inside
    rho = (FAIRING_R**2 + rise**2 - FAIRING_TIP_R**2) / (2 * (FAIRING_R - FAIRING_TIP_R))
    end = math.atan2(rise, rho - FAIRING_R)  # where arc and sphere meet, as an angle at either's centre
    pts = [(FAIRING_R, foot)]
    pts += [(FAIRING_R - rho + rho * math.cos(t), shoulder + rho * math.sin(t)) for t in (end * k / OGIVE for k in range(OGIVE + 1))]
    pts += [(FAIRING_TIP_R * math.cos(t), centre + FAIRING_TIP_R * math.sin(t)) for t in (end + (math.pi / 2 - end) * k / 6 for k in range(1, 7))]
    pts[-1] = (0.0, tip)
    return pts


def build_fairing(X: Matrix, M: dict, hatch_az: float, hatch_h: float) -> None:
    """Two halves that part along the plane square to the hatch. The round opening over hatch No. 1 is
    how the pilot went aboard and how his seat would have left on the pad; `hatch_h` is its centre's station."""
    g = group("Fairing")
    prof_out = fairing_profile()
    prof_in = [(max(0.0, r - FAIRING_WALL), z if r > 1 else z - FAIRING_WALL) for r, z in prof_out]
    foot = BLOCK_E_TOP
    for side, mid in (("Left", hatch_az), ("Right", hatch_az + math.pi)):
        arc = (mid - math.pi / 2, mid + math.pi / 2)
        node = pivot(f"Fairing_{side}", g, X @ V(FAIRING_R * math.cos(mid), FAIRING_R * math.sin(mid), foot))
        skin, wall, fit = Local(X), Local(X), Local(X)
        skin.lathe(prof_out, 48, arc=arc)
        wall.lathe(prof_in, 48, arc=arc, flip=True)
        skin.lathe([(FAIRING_R - FAIRING_WALL, foot), (FAIRING_R, foot)], 48, arc=arc)  # the foot's edge
        for a, sign in ((arc[0], 1), (arc[1], -1)):  # the cut edges, and a flange along each
            c, s = math.cos(a), math.sin(a)
            n = len(prof_out) - 1
            skin.grid(
                lambda u, v, c=c, s=s: (
                    (prof_out[int(v)][0] * (1 - u) + prof_in[int(v)][0] * u) * c,
                    (prof_out[int(v)][0] * (1 - u) + prof_in[int(v)][0] * u) * s,
                    prof_out[int(v)][1] * (1 - u) + prof_in[int(v)][1] * u,
                ),
                [0.0, 1.0],
                list(range(n + 1)),
                flip=sign > 0,
            )
            (r0, z0), z1 = prof_out[0], prof_out[1][1]
            aside = Matrix.Translation(V(-s * 45 * sign, c * 45 * sign, 0))  # each half's flange lies on its own side of the cut
            fit.box(
                (70, z1 - z0 - 80, 46), aside @ frame(V((r0 + 11) * c, (r0 + 11) * s, (z0 + z1) / 2), (c, s, 0))
            )  # (sunk 12 mm: short of the inner wall)
            for k in (2, 5, 8, 11):  # and up the nose in short lengths, each along a chord of the arc
                (ra, za), (rb, zb) = prof_out[k], prof_out[k + 2]
                lean = math.atan2(ra - rb, zb - za)
                r, z = (ra + rb) / 2 + 11 * math.cos(lean), (za + zb) / 2 + 11 * math.sin(lean)
                fit.box(
                    (70, math.hypot(rb - ra, zb - za) * 0.8, 46),
                    aside @ frame(V(r * c, r * s, z), (math.cos(lean) * c, math.cos(lean) * s, math.sin(lean))),
                )
        for z in (foot + 60, foot + FAIRING_CYL - 40):  # frames at the foot and the shoulder
            skin.lathe(
                [(FAIRING_R - 3, z - 34), (FAIRING_R + 9, z - 24), (FAIRING_R + 9, z + 24), (FAIRING_R - 3, z + 34)],
                48,
                arc=(arc[0] + deg(3), arc[1] - deg(3)),
            )
        for k, z in ((-0.55, foot + 700), (0.6, foot + 1500), (0.3, foot + 2600)):
            a = mid + k * math.pi / 2 * (1 if side == "Left" else 0.8)
            fit.box((300, 260, 24), frame(V(FAIRING_R * math.cos(a), FAIRING_R * math.sin(a), z), (math.cos(a), math.sin(a), 0)))
        parts = [
            skin.build(f"Fairing_{side}_Skin", M["pale"], None, sharp_angle=30),
            wall.build(f"Fairing_{side}_Wall", M["wall"], None, sharp_angle=30),
            fit.build(f"Fairing_{side}_Fittings", M["pale"], None, smooth=False),
        ]
        if side == "Left":
            bpy.context.view_layer.update()
            c, s = math.cos(mid), math.sin(mid)
            hole = X @ frame(V(FAIRING_R * c, FAIRING_R * s, hatch_h), (c, s, 0))
            bore([f"Fairing_{side}_Skin", f"Fairing_{side}_Wall"], hole, OPENING_R * 0.001, 0.3)
            rim = Local(X)
            # the coaming: a rolled edge round the opening, standing through both skins
            path = []
            for k in range(41):
                t = TAU * k / 40
                a = mid + math.asin(OPENING_R * math.cos(t) / FAIRING_R)
                path.append(((FAIRING_R - 8) * math.cos(a), (FAIRING_R - 8) * math.sin(a), hatch_h + OPENING_R * math.sin(t)))
            rim.loft(path, [(34, 34)] * len(path), 10, ref=(c, s, 0), resample=1, caps=(False, False))
            parts.append(rim.build(f"Fairing_{side}_Coaming", M["alu"], None, sharp_angle=None))
        for obj in parts:
            hang(obj, node)


def build(base_z: float, M: dict, hatch_az: float, hatch_h: float) -> None:
    X = core_frame(base_z)
    build_interstage(X, M)
    build_block_e(X, M)
    build_fairing(X, M, hatch_az, hatch_h)
