"""What stands on the core of an 11A57: the lattice, Block I with its RD-0108 and the aft section it
sheds, the adapter the spacecraft sits on, and the fairing in two halves. Stations are heights above
the main nozzles' exits, mm; `s` is a height above the lattice's top, where Block I begins.

See ../voskhod-11a57.md for what each number rests on. The stage's own length and diameter, the adapter's
and the fairing's lengths are published figures; every station inside the stage is estimated, chosen so
that its tanks hold the propellant it is documented to carry.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix

from srlib import TAU, bore, deg, frame, group, interior
from vostok_8k72k import upper as vostok_upper
from vostok_8k72k.common import CORE_TOP, FAIRING_R, FROST_EDGE, TRUSS_TOP, Local, V, at, core_frame, frost_foot, hang, pivot

# ------------------------------------------------------------------ dimensions (mm)

LATTICE_TOP = TRUSS_TOP  # the lattice is taken as the 8K72K's, 1,260 mm, ending 28,750 up: no figure for the 11A57's was found
UPPER = 16665.0  # from the core's top to the fairing's tip, with a Voskhod (Zak)
LENGTH = CORE_TOP + UPPER  # 44,155
BLOCK_I = 6745.0  # the stage without its adapter
BLOCK_I_R = 1330.0  # 2.66 m
ADAPTER = 2305.0  # 9,050 with the adapter (Brügge), less the stage
BLOCK_I_TOP = LATTICE_TOP + BLOCK_I + ADAPTER  # 37,800: the spacecraft's frame rests here
FAIRING = LENGTH - BLOCK_I_TOP  # 6,355: what is left
FAIRING_CONE = deg(22.0)  # the nose is a straight cone: its side from the axis, off OKB-1's general drawings (21.5 to 22.8)
FAIRING_TIP_R = 290.0  # and ends in a rounded cap
FAIRING_NOSE = (FAIRING_R - FAIRING_TIP_R * math.cos(FAIRING_CONE)) / math.tan(FAIRING_CONE) + FAIRING_TIP_R * (1 - math.sin(FAIRING_CONE))  # 2,857
FAIRING_CYL = FAIRING - FAIRING_NOSE  # 3,498: the cylinder, from the fairing's foot
SPACECRAFT_SEAT = 1200.0  # the station of the spacecraft that rests on the adapter: the aft face of its frame, as a Vostok's
BASE_Z = SPACECRAFT_SEAT - BLOCK_I_TOP  # the nozzle exits, in the spacecraft's stations

# Block I, in heights above the lattice's top
AFT_TOP = 1950.0  # the aft section, which is shed in three pieces once the stage is alight
LOX = (1050.0, 1950.0, 3350.0, 4250.0)  # the oxygen tank: lower pole, where its cylinder begins and ends, upper pole
FUEL = (4550.0, 5450.0, 5860.0, 6745.0)  # the kerosene tank, above it
TANK_R = 1300.0
AFT_PIECES = 3
AFT_AZ = [deg(60.0 + 120.0 * i) for i in range(AFT_PIECES)]  # the middle of each piece; where the cuts lay is not known to us
# RD-0108: four fixed chambers and four steering nozzles
E_EXIT = -150.0  # the main nozzles hang this far into the lattice
E_EXIT_R = 375.0
E_AT = 455.0  # each chamber from the axis along both of the stage's axes: on the diagonals
E_BELL = [(E_EXIT_R, 0), (366, 90), (338, 260), (292, 450), (232, 630), (160, 790), (92, 890), (58, 930), (66, 962), (104, 1000)]
E_HEAD = [(104, 1150), (84, 1196), (0, 1210)]
STEER_R = 1085.0  # the steering nozzles from the axis
STEER_BELL = [(72, 0), (66, 60), (48, 170), (26, 250), (30, 272), (46, 290), (46, 370), (0, 384)]
WALL = 18.0
CONE_PIECES = 14  # straight pieces along the cone, as the 8K72K's ogive has: the builder's fittings are placed by them
BLISTER = (860.0, 2300.0, 1150.0, 620.0)  # half its width; how far it runs toward the nose and toward the foot; how far it stands out

SHELLS = (
    "BlockI_Skin",
    "BlockI_Frost",
    "BlockI_InnerWall",
    "BlockI_Stringers",
    "BlockI_Fittings",
    "BlockI_Base",
    *(f"AftSection_{i + 1}_{part}" for i in range(AFT_PIECES) for part in ("Skin", "Wall")),
    "Fairing_Left_Skin",
    "Fairing_Left_Wall",
    "Fairing_Left_Fittings",
    "Fairing_Left_Coaming",
    "Fairing_Right_Skin",
    "Fairing_Right_Wall",
    "Fairing_Right_Fittings",
)


def S(s: float) -> float:
    """A height above the lattice's top as a station of the vehicle."""
    return LATTICE_TOP + s


def band(mb: Local, s: float, half: float, proud: float, r: float = BLOCK_I_R, arc: tuple[float, float] | None = None) -> None:
    """A frame showing through the skin: a raised ring whose edges are sunk into it."""
    kw = {"arc": arc} if arc else {}
    mb.lathe([(r - 3, S(s) - half - proud), (r + proud, S(s) - half), (r + proud, S(s) + half), (r - 3, S(s) + half + proud)], 96, **kw)


def dome(mb: Local, s: float, depth: float, up: bool, r: float = TANK_R, n: int = 10) -> None:
    """A tank's end: half an ellipsoid, bulging up or down from the frame at `s`."""
    sign = 1 if up else -1
    pts = [(r * math.cos(a), S(s) + sign * depth * math.sin(a)) for a in (math.pi / 2 * k / n for k in range(n + 1))]
    mb.lathe(pts if up else pts[::-1], 64)


def build_aft_section(X: Matrix, M: dict) -> None:
    """The stage's tail: a skirt round the engine that joins it to the lattice. Once the stage is alight and away it is
    let go in three pieces, each pushed off sideways by springs."""
    g = group("AftSection")
    r = BLOCK_I_R
    gap = deg(0.35)  # each piece's edge stands this far back from the cut
    for i, mid in enumerate(AFT_AZ):
        node = pivot(f"AftSection_{i + 1}", g, X @ V(r * math.cos(mid), r * math.sin(mid), S(0)))
        skin, wall = Local(X), Local(X)
        arc = (mid - TAU / 6 + gap, mid + TAU / 6 - gap)
        skin.lathe([(r, S(0)), (r, S(AFT_TOP - 8))], 32, arc=arc)
        wall.lathe([(r - WALL, S(0)), (r - WALL, S(AFT_TOP - 8))], 32, arc=arc, flip=True)
        for s in (0, AFT_TOP - 8):  # its upper and lower edges
            skin.lathe([(r - WALL, S(s)), (r, S(s))], 32, arc=arc, flip=s == 0)
        for a, sign in ((arc[0], 1), (arc[1], -1)):  # the cut edges
            c, sn = math.cos(a), math.sin(a)
            skin.grid(
                lambda u, v, c=c, sn=sn: ((r - WALL * u) * c, (r - WALL * u) * sn, S(v * (AFT_TOP - 8))),
                [0.0, 1.0],
                [0.0, 1.0],
                flip=sign > 0,
            )
        for s, half in ((70, 30), (AFT_TOP - 90, 26)):  # a frame at each end
            band(skin, s, half, 8, arc=(arc[0] + deg(1.5), arc[1] - deg(1.5)))
        for k in (-0.55, 0.0, 0.55):  # stiffeners up each piece, and the lock that holds it to the stage
            a = mid + k * TAU / 6
            # (each stands on the skin and is sunk 3 mm into it: clear of the inner wall however coarsely the arc is drawn)
            out = (math.cos(a), math.sin(a), 0)
            skin.box((60, AFT_TOP - 420, 26), frame(V((r + 10) * out[0], (r + 10) * out[1], S(AFT_TOP / 2)), out))
            skin.box((150, 120, 40), frame(V((r + 17) * out[0], (r + 17) * out[1], S(AFT_TOP - 90)), out))
        hang(skin.build(f"AftSection_{i + 1}_Skin", M["lacquer"], None, sharp_angle=30), node)
        hang(wall.build(f"AftSection_{i + 1}_Wall", M["wall"], None, sharp_angle=30), node)


def build_block_i(X: Matrix, M: dict) -> None:
    """The third stage: the kerosene tank over the oxygen tank, each two domes and a cylinder, an instrument bay between
    them, the four-chamber engine under a cone on the lower tank, and above them the adapter the spacecraft's frame
    rests on."""
    g = group("BlockI")
    skin, frost, wall, ribs, fit, base, bell, liner, steel, bolts = (Local(X) for _ in range(10))
    r = BLOCK_I_R
    top = BLOCK_I_TOP
    lox0, lox1 = LOX[1], LOX[3]  # (the frost is drawn to the tank's upper pole: its upper dome stands inside the skin)
    # the oxygen tank's wall is the stage's skin and is white with frost; the rest is painted
    frost_foot(skin, frost, lambda _h: r, S(lox0), 1.9)
    frost.lathe([(r, S(lox0) + FROST_EDGE), (r, S(lox1))], 96)
    skin.lathe([(r, S(lox1)), (r, top - 6)], 96)
    skin.lathe([(r, top - 6), (r - 130, top - 6)], 96)  # the ledge the spacecraft's frame stands on
    skin.lathe([(r - WALL, S(AFT_TOP)), (r, S(AFT_TOP))], 96, flip=True)  # the edge the aft section leaves
    wall.lathe([(r - WALL, S(AFT_TOP)), (r - WALL, top - 40), (r - 130, top - 40), (r - 130, top - 6)], 96, flip=True)
    band(frost, lox0 + FROST_EDGE + 60, 16, 6)
    band(frost, lox1 - 50, 20, 6)
    for s, half, proud in ((lox1 + 50, 20, 6), (FUEL[1] - 40, 20, 6), (FUEL[2] + 40, 20, 6), (BLOCK_I - 30, 30, 9), (BLOCK_I + ADAPTER - 60, 34, 10)):
        band(skin, s, half, proud)
    band(skin, AFT_TOP + 45, 26, 8)
    # the instrument bay between the tanks: six hatches, and a seventh for the oxygen tank's valve
    bay = (lox1 + FUEL[1]) / 2
    for i in range(6):
        a = deg(30 + 60 * i)
        fit.box((520, 460, 24), frame(V(r * math.cos(a), r * math.sin(a), S(bay)), (math.cos(a), math.sin(a), 0)))
        for dx in (-225, 225):
            for dz in (-195, 195):
                bolts.disc(
                    (r * math.cos(a) - dx * math.sin(a) + 12 * math.cos(a), r * math.sin(a) + dx * math.cos(a) + 12 * math.sin(a), S(bay) + dz),
                    (math.cos(a), math.sin(a), 0),
                    10,
                    5,
                )
    fit.box((260, 240, 24), frame(V(r * math.cos(deg(60)), r * math.sin(deg(60)), S(lox1 + 320)), (math.cos(deg(60)), math.sin(deg(60)), 0)))
    # two ducts carry cables and lines past the tanks, as on the core
    for a in (deg(45), deg(225)):
        c, sn = math.cos(a), math.sin(a)
        for s0, s1, mb in ((lox0 + FROST_EDGE + 110, lox1 - 100, frost), (lox1 + 110, bay - 300, fit), (bay + 300, BLOCK_I - 90, fit)):
            mb.box((150, s1 - s0, 80), frame(V((r + 28) * c, (r + 28) * sn, S((s0 + s1) / 2)), (c, sn, 0)))
    # the adapter: stringers up its length, and four spring pushers on the ledge
    for i in range(60):
        a = TAU * (i + 0.5) / 60
        ribs.box((22, ADAPTER - 330, 30), frame(V(r * math.cos(a), r * math.sin(a), S(BLOCK_I + ADAPTER / 2 - 15)), (math.cos(a), math.sin(a), 0)))
    for i in range(4):
        a = TAU * i / 4 + deg(22.5)
        fit.box((90, 120, 150), at((r - 60) * math.cos(a), (r - 60) * math.sin(a), top - 90) @ Matrix.Rotation(a, 4, "Z"))
    for s in (AFT_TOP + 45, BLOCK_I - 30, BLOCK_I + ADAPTER - 60):
        for i in range(72):
            a = TAU * (i + 0.5) / 72
            bolts.disc(((r + 9) * math.cos(a), (r + 9) * math.sin(a), S(s)), (math.cos(a), math.sin(a), 0), 9, 5)
    # under the engine: a shield with a hole for each chamber, dark with its coating
    centres = [(sx * E_AT, sy * E_AT) for sx in (1, -1) for sy in (1, -1)]
    base.plate(r - WALL - 24, S(E_EXIT + 330), 322, centres)
    # RD-0108: four chambers that do not turn
    for cx, cy in centres:
        m = at(cx, cy, S(E_EXIT))
        bell.lathe(E_BELL + E_HEAD, 40, m)
        bell.lathe([(E_EXIT_R - 9, 0), (E_EXIT_R, 0)], 40, m)
        liner.lathe([(rr - 9, z) for rr, z in E_BELL] + [(95, 1000), (95, 1140), (0, 1140)], 40, m, flip=True)
        for z in (30, 300, 560):
            rr = next(r0 + (r1 - r0) * (z - z0) / (z1 - z0) for (r0, z0), (r1, z1) in zip(E_BELL, E_BELL[1:]) if z0 <= z <= z1)
            bell.lathe([(rr - 2, z - 16), (rr + 8, z - 7), (rr + 8, z + 7), (rr - 2, z + 16)], 40, m)
    # It is steered by four small nozzles between the chambers, each on trunnions so that it swings round the stage,
    # burning the turbine's spent gas. They are drawn in line with the boosters; which stood where is not known to us.
    for i in range(4):
        a = TAU * i / 4
        c, sn = math.cos(a), math.sin(a)
        turn = Matrix.Rotation(a, 4, "Z")
        m = at(STEER_R * c, STEER_R * sn, S(E_EXIT + 250))
        steel.lathe(STEER_BELL, 16, m)
        steel.lathe([(66, 0), (60, 60), (42, 170), (0, 170)], 16, m, flip=True)
        steel.tube(((STEER_R - 90) * c, (STEER_R - 90) * sn, S(E_EXIT + 560)), ((STEER_R + 90) * c, (STEER_R + 90) * sn, S(E_EXIT + 560)), 16, 8)
        for k in (-1, 1):
            steel.box((18, 50, 130), at((STEER_R + k * 78) * c, (STEER_R + k * 78) * sn, S(E_EXIT + 600)) @ turn)
        steel.box((190, 110, 60), at(STEER_R * c, STEER_R * sn, S(E_EXIT + 690)) @ turn)
        steel.loft(
            [
                (150 * c, 150 * sn, S(E_EXIT + 1000)),
                (420 * c, 420 * sn, S(E_EXIT + 900)),
                (860 * c, 860 * sn, S(E_EXIT + 760)),
                (STEER_R * c, STEER_R * sn, S(E_EXIT + 710)),
            ],
            [(30, 30)] * 4,
            12,
            ref=(0, 0, 1),
        )
    skin.build("BlockI_Skin", M["lacquer"], g, sharp_angle=30)
    frost.build("BlockI_Frost", M["frost"], g, sharp_angle=30)
    wall.build("BlockI_InnerWall", M["wall"], g, sharp_angle=30)
    ribs.build("BlockI_Stringers", M["lacquer"], g, smooth=False)
    fit.build("BlockI_Fittings", M["lacquer"], g, smooth=False)
    bolts.build("BlockI_Fasteners", M["bolt"], g)
    base.build("BlockI_Base", M["dark"], g, sharp_angle=None)
    bell.build("RD0108_Bells", M["bell"], g, sharp_angle=35)
    liner.build("RD0108_Liners", M["liner"], g, sharp_angle=35)
    steel.build("RD0108_Steering", M["steel"], g, sharp_angle=35)
    if interior():
        tanks, gear, pump, cone = (Local(X) for _ in range(4))
        for lo, a, b, hi in (LOX, FUEL):
            dome(tanks, a, a - lo, False)
            tanks.lathe([(TANK_R, S(a)), (TANK_R, S(b))], 64)
            dome(tanks, b, hi - b, True)
        # the cone on the lower tank's ring that carries the engine, and the frame the chambers hang in
        cone.lathe([(TANK_R - 20, S(LOX[1] - 30)), (760, S(E_EXIT + 1215))], 48)
        cone.lathe([(760, S(E_EXIT + 1215)), (760, S(E_EXIT + 1175)), (700, S(E_EXIT + 1175))], 48)
        # the turbopump between the chambers, its gas generator, and the pipes to each chamber's head
        pump.lathe([(0, -230), (120, -230), (120, 230), (0, 230)], 20, frame(V(0, 0, S(E_EXIT + 900)), (1, 0, 0)))
        pump.ball((0, 210, S(E_EXIT + 1060)), 90, 16, 8)
        for cx, cy in centres:
            pump.loft(
                [(cx * 0.2, cy * 0.2, S(E_EXIT + 980)), (cx * 0.6, cy * 0.6, S(E_EXIT + 1110)), (cx, cy, S(E_EXIT + 1200))],
                [(34, 34)] * 3,
                10,
                ref=(0, 0, 1),
            )
        # five bottles of gas in the instrument bay, and the stage's instruments round its wall
        for i in range(5):
            a = TAU * i / 5 + deg(12)
            gear.ball((880 * math.cos(a), 880 * math.sin(a), S((LOX[3] + FUEL[0]) / 2)), 250, 20, 10)
        for i in range(10):
            a = TAU * i / 10 + deg(30)
            gear.box((200, 300, 280 + 60 * (i % 2)), at(1140 * math.cos(a), 1140 * math.sin(a), S(BLOCK_I + 420)) @ Matrix.Rotation(a, 4, "Z"))
        tanks.build("BlockI_Tanks", M["tank"], g, sharp_angle=None)
        cone.build("BlockI_EngineCone", M["inner"], g, sharp_angle=30)
        pump.build("RD0108_Turbopump", M["engine"], g, sharp_angle=35)
        gear.build("BlockI_Instruments", M["equipment"], g, sharp_angle=35)


def fairing_profile() -> list:
    """(radius, station) up the fairing's outside, as vostok_8k72k.upper.fairing_profile lists an ogive's: the foot,
    then the cone from the shoulder to where it meets the cap, then the cap."""
    foot, tip = BLOCK_I_TOP, LENGTH
    shoulder, centre = foot + FAIRING_CYL, tip - FAIRING_TIP_R
    a = FAIRING_CONE
    end = (FAIRING_TIP_R * math.cos(a), centre + FAIRING_TIP_R * math.sin(a))
    pts = [(FAIRING_R, foot)]
    pts += [(FAIRING_R + (end[0] - FAIRING_R) * k / CONE_PIECES, shoulder + (end[1] - shoulder) * k / CONE_PIECES) for k in range(CONE_PIECES + 1)]
    pts += [(FAIRING_TIP_R * math.cos(t), centre + FAIRING_TIP_R * math.sin(t)) for t in (a + (math.pi / 2 - a) * k / 6 for k in range(1, 7))]
    pts[-1] = (0.0, tip)
    return pts


def build_blister(X: Matrix, M: dict, az: float, h: float) -> None:
    """What covers the folded airlock where it stands out through the fairing's wall: a hole in the half that carries
    it, and over the hole a faired blister, longer toward the nose. It leaves with its half of the fairing."""
    half, fore, aft, proud = BLISTER
    c, sn = math.cos(az), math.sin(az)
    node = bpy.data.objects["Fairing_Right"]
    bpy.context.view_layer.update()
    hole = X @ frame(V(FAIRING_R * c, FAIRING_R * sn, h), (c, sn, 0))
    bore(["Fairing_Right_Skin", "Fairing_Right_Wall"], hole, (half - 50) * 0.001, 0.3)
    shell = Local(X)

    def point(u: float, v: float, off: float):
        """`u` across (-1 to 1), `v` along (-1 at its foot to 1 at its nose end); `off` inward of the outer surface."""
        along = v * (fore if v > 0 else aft)
        # a rounded section, fullest low down where the airlock's own end lies, drawn out to a point toward the nose
        full = (1 - v * v) ** (0.5 if v < 0 else 0.62)
        w = half * full
        lift = (proud - off) * full ** (1.0 if v > 0 else 0.8) * (1 - u**4) ** 0.5  # (flat across its top, steep at its sides)
        a = az + math.asin(max(-1.0, min(1.0, u * w / FAIRING_R)))
        rr = FAIRING_R - 14 + lift
        return (rr * math.cos(a), rr * math.sin(a), h + along)

    us = [math.sin(math.pi / 2 * k / 12) for k in range(-12, 13)]
    vs = [math.sin(math.pi / 2 * k / 20) for k in range(-20, 21)]
    shell.grid(lambda u, v: point(u, v, 0.0), us, vs)
    shell.grid(lambda u, v: point(u, v, 16.0), us, vs, flip=True)
    hang(shell.build("Fairing_Right_Blister", M["pale"], None, sharp_angle=40), node)


def build(base_z: float, M: dict, hatch_az: float, hatch_h: float, blister: tuple[float, float] | None = None) -> None:
    X = core_frame(base_z)
    assert LATTICE_TOP > CORE_TOP
    vostok_upper.build_interstage(X, M, LATTICE_TOP)  # the lattice and the deflector are the 8K72K's, to this vehicle's station
    build_aft_section(X, M)
    build_block_i(X, M)
    vostok_upper.build_fairing(X, M, hatch_az, hatch_h, foot=BLOCK_I_TOP, tip=LENGTH, cyl=FAIRING_CYL, profile=fairing_profile())
    if blister:
        build_blister(X, M, *blister)
