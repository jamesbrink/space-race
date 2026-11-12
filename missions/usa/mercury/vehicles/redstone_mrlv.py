"""The Mercury-Redstone Launch Vehicle (MRLV): one stage, one Rocketdyne A-7.

Shared by the flights that rode it (MR-3, MR-4); a flight's model/vehicle.py imports this module and
calls build(). Dimensions are inches. Stations here are measured up from the booster's base
(the fin trailing edges); `base_z` places that base in the flight's own coordinates.

See ./redstone-mrlv.md for what each number rests on. Section lengths and the 70 in diameter
are from NASA TM X-53107, Figure 4-1; the fins, engine and paint are read off its figures and
photographs.

Top-level nodes: RedstoneAdapter  RedstoneAftUnit  RedstoneCenterUnit  RedstoneTailUnit  RedstoneEngine
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from srlib import IN, TAU, MeshBuilder, Surf, arc_profile, deg, frame, group, interior, lettering, material, prof

BODY_R = 35.0  # 70 in diameter
# Base to the spacecraft's plane of maximum diameter. Derived: the vehicle is 83.38 ft (1000.56 in)
# tall (TM X-53107, 4.1) and the escape tower's tip is 284.55 in above that plane (SEDR 104,
# Figure 1-3). Hammack & Heberlig's Figure 17 draws 710.27 in instead; its own total is 4.5 in
# short of the 83.38 ft its Figure 18 gives, so the booster's report is followed here.
LENGTH = 716.0
S_TAIL = 111.24  # top of the tail unit: 9.27 ft (TM X-53107, Figure 4-1)
S_TANK = S_TAIL + 450.0  # top of the centre unit: 37.50 ft; alcohol tank 18.8 ft over LOX tank 16.83 ft
S_AFT = 708.0  # top of the booster, 59.00 ft (Figure 4-1). The aft section is drawn as 139.64 in,
# which leaves 7.1 in: the 7.08 in the aft unit was stretched for Mercury (4.8.2.2).
AFT_LOWER = 42.16  # aft unit proper: nitrogen spheres, antennas, receivers
INSTRUMENT = 53.66  # pressurised instrument compartment, above it; ballast section above that
ADAPTER_TOP_R = 36.6  # just inside the capsule's 74.5 in heat shield
FIN_SPAN = 152.0  # across the air rudders' tips (Hammack & Heberlig, Figure 17)
FIN_ROOT, FIN_TIP = 100.0, 38.0  # chords
NOZZLE_EXIT_R = 16.5

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "Adapter_Skin",
    "Adapter_Structure",
    "Adapter_ClampRing",
    "AftUnit_SkinWhite",
    "AftUnit_SkinBlack",
    "AftUnit_Antennas",
    "AftUnit_AccessDoors",
    "AftUnit_Fasteners",
    "AftUnit_Bulkheads",
    "AftUnit_InstrumentCompartment",
    "CenterUnit_Tanks",
    "CenterUnit_Band",
    "CenterUnit_Frost",
    "CenterUnit_InnerWall",
    "AftUnit_InnerWall",
    "CenterUnit_Fasteners",
    "CenterUnit_Conduits",
    "CenterUnit_TankDomes",
    "CenterUnit_Lettering",
    "TailUnit_SkinWhite",
    "TailUnit_SkinBlack",
    "TailUnit_ShieldsAndDoors",
    "TailUnit_Fasteners",
    "TailUnit_Structure",
    "TailUnit_FinsWhite",
    "TailUnit_FinsBlack",
    "TailUnit_AirRudders",  # or the fin on the cut stands in front of the engine
    "Engine_CoolingJacket",
    "Engine_ChamberWall",
    "Engine_ChamberLiner",
)


def materials() -> dict:
    m = material
    return {
        "white": m("paint-booster-white", (0.80, 0.80, 0.78), 0.0, 0.42),
        "black": m("paint-booster-black", (0.018, 0.018, 0.02), 0.0, 0.5),
        "red": m("paint-booster-red", (0.45, 0.02, 0.015), 0.0, 0.5, double_sided=True),
        "inner": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "alu": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        # the inside of a skin: unpolished, and what the cutaway shows most of
        "frost": m("frost-lox", (0.90, 0.93, 0.96), 0.0, 0.95),
        "wall": m("aluminium-inner", (0.50, 0.51, 0.50), 0.9, 0.7),
        # sheet fittings on the outside: weathered, or they mirror the sky and read as glass
        "sheet": m("aluminium-sheet", (0.56, 0.57, 0.57), 0.9, 0.66),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "engine": m("engine-steel", (0.30, 0.29, 0.28), 1.0, 0.42, double_sided=True),
        "graphite": m("graphite", (0.03, 0.03, 0.032), 0.3, 0.6),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        # what a cutaway shows
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "ballast": m("ballast-steel", (0.34, 0.33, 0.31), 0.9, 0.62),
        "liner": m("chamber-liner", (0.34, 0.24, 0.18), 1.0, 0.45, double_sided=True),
    }


def _reuse(mats: dict) -> dict:
    """Use the caller's materials where the names match, so the GLB has one of each."""
    import bpy

    out = {}
    for key, mat in mats.items():
        base = mat.name.split(".")[0]
        first = bpy.data.materials.get(base)
        if first is not None and first is not mat:
            bpy.data.materials.remove(mat)
            mat = first
        out[key] = mat
    return out


def _banded(mb_a: MeshBuilder, mb_b: MeshBuilder, r: float, z0: float, z1: float, phase: float, count: int = 4) -> None:
    """Roll pattern: `count` panels round the body, alternating, so a camera can read the vehicle's roll."""
    arc = TAU / count
    for q in range(count):
        mb = mb_a if q % 2 == 0 else mb_b
        mb.lathe(prof([(r, z0), (r, z1)]), max(2, 96 // count), arc=(phase + q * arc, phase + (q + 1) * arc))


def _rivet_ring(mb: MeshBuilder, r: float, z: float, count: int = 96) -> None:
    for i in range(count):
        t = TAU * i / count
        mb.disc(Vector((r * math.cos(t), r * math.sin(t), z)) * IN, (math.cos(t), math.sin(t), 0), 0.3 * IN, 0.08 * IN)


def _rivet_lines(mb: MeshBuilder, r: float, z0: float, z1: float, count: int, pitch: float = 3.0) -> None:
    """Rivet rows up the skin, one per stringer underneath (the aft and tail units have them)."""
    n = max(2, int((z1 - z0) / pitch))
    for i in range(count):
        t = TAU * (i + 0.5) / count
        c, s = math.cos(t), math.sin(t)
        for k in range(n + 1):
            z = z0 + (z1 - z0) * k / n
            mb.disc(Vector((r * c, r * s, z)) * IN, (c, s, 0), 0.24 * IN, 0.07 * IN)


def _prism(mb: MeshBuilder, outline, thick_root: float, thick_tip: float, r_root: float, r_tip: float, matrix: Matrix) -> None:
    """A fin: `outline` is (r, z) points in the fin's plane; thickness tapers from root to tip."""

    def half(r: float) -> float:
        k = (r - r_root) / (r_tip - r_root)
        return (thick_root + (thick_tip - thick_root) * k) / 2

    n = len(outline)
    verts, faces = [], []
    for side in (1, -1):
        base = len(verts)
        verts += [(r * IN, side * half(r) * IN, z * IN) for r, z in outline]
        idx = list(range(base, base + n))
        faces.append(tuple(idx if side == -1 else reversed(idx)))
    for i in range(n):  # edge faces, own verts so they shade flat
        j = (i + 1) % n
        base = len(verts)
        (r0, z0), (r1, z1) = outline[i], outline[j]
        verts += [
            (r0 * IN, half(r0) * IN, z0 * IN),
            (r1 * IN, half(r1) * IN, z1 * IN),
            (r1 * IN, -half(r1) * IN, z1 * IN),
            (r0 * IN, -half(r0) * IN, z0 * IN),
        ]
        faces.append((base, base + 1, base + 2, base + 3))
    mb.add(verts, faces, None, matrix)


def _offset(pts, d: float) -> list:
    """An anticlockwise (r, z) outline moved outward by d at every side, mitred; negative d moves it in."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        la, lb = math.hypot(p1[0] - p0[0], p1[1] - p0[1]), math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        n1 = ((p1[1] - p0[1]) / la, -(p1[0] - p0[0]) / la)
        n2 = ((p2[1] - p1[1]) / lb, -(p2[0] - p1[0]) / lb)
        k = d / (1.0 + n1[0] * n2[0] + n1[1] * n2[1])
        out.append((p1[0] + (n1[0] + n2[0]) * k, p1[1] + (n1[1] + n2[1]) * k))
    return out


def _fin(mb: MeshBuilder, outline, thick_root: float, thick_tip: float, r_root: float, r_tip: float, matrix: Matrix, *, rivets=None, rows=()) -> None:
    """A fin or an air rudder: `outline` is (r, z) points in its plane, anticlockwise; its thickness
    tapers from root to tip and every edge is rounded, from the mid-plane at the outline to the flat
    faces 1.2 in inside it. `rows` are rows of flush fasteners on both faces, each ((r, z), (r, z),
    pitch): where the skin is riveted to a spar, a rib or the root fitting (estimated: the usual
    layout, read off no drawing). Inches."""
    k = (thick_tip - thick_root) / 2 / (r_tip - r_root)

    def half(r: float) -> float:
        return thick_root / 2 + k * (r - r_root)

    rings = [(0.0, 0.0), (0.12, 0.55), (0.45, 0.88), (1.2, 1.0)]  # inset, share of the half thickness
    loops = [_offset(outline, -d) for d, _ in rings]
    n = len(outline)
    verts, faces = [(r * IN, 0.0, z * IN) for r, z in loops[0]], []
    rows_of = {}
    for side in (1, -1):
        prev = list(range(n))
        for (_, share), loop in zip(rings[1:], loops[1:]):
            base = len(verts)
            verts += [(r * IN, side * share * half(r) * IN, z * IN) for r, z in loop]
            cur = list(range(base, base + n))
            for i in range(n):
                j = (i + 1) % n
                faces.append((cur[i], cur[j], prev[j], prev[i]) if side > 0 else (prev[i], prev[j], cur[j], cur[i]))
            prev = cur
        rows_of[side] = prev
        faces.append(tuple(reversed(prev)) if side > 0 else tuple(prev))
    mb.add(verts, faces, None, matrix)
    if rivets is None:
        return
    rot = matrix.to_3x3()
    for side in (1, -1):
        normal = rot @ Vector((-k * side, side, 0.0)).normalized()
        for (r0, z0), (r1, z1), pitch in rows:
            count = max(1, round(math.hypot(r1 - r0, z1 - z0) / pitch))
            for q in range(count + 1):
                r, z = r0 + (r1 - r0) * q / count, z0 + (z1 - z0) * q / count
                at = matrix @ Vector((r * IN, side * (half(r) - 0.01) * IN, z * IN))
                rivets.disc(at, normal, 0.2 * IN, 0.09 * IN)  # their heads stand 2 mm proud: closer, and the face would fight them


def build(base_z: float, font=None, clamp_covers: str = "boxes") -> None:
    """Build the booster with its base at station `base_z` (inches) of the flight's frame.
    `clamp_covers`: the fairings over the clamp ring's three explosive bolts. "boxes": the rectangular ones flown
    through MR-3; "streamlined": the rounded ones MR-4 carried (Results of the Second U.S. Manned Suborbital Space
    Flight, p. 4 and Figure 2-2: "a more streamlined shape ... to reduce buffeting"; their size is read off the figure)."""
    M = _reuse(materials())
    up = lambda s: base_z + s  # noqa: E731
    body = Surf(BODY_R, 0.0, 0.0)

    # ------------------------------------------------------------------ adapter
    g = group("RedstoneAdapter")
    skin = MeshBuilder()
    skin.lathe(prof([(BODY_R, up(S_AFT)), (ADAPTER_TOP_R, up(LENGTH - 1.2))]), 128)
    skin.build("Adapter_Skin", M["white"], g, sharp_angle=None)
    inner = MeshBuilder()
    inner.lathe(prof([(BODY_R - 0.3, up(S_AFT)), (ADAPTER_TOP_R - 0.3, up(LENGTH - 1.2))]), 96, flip=True)
    for i in range(24):  # stringers added for the Mercury capsule's weight
        t = TAU * i / 24
        a = Vector((math.cos(t), math.sin(t), 0))
        inner.tube(
            (a * (BODY_R - 1.2) + Vector((0, 0, up(S_AFT + 0.5)))) * IN,
            (a * (ADAPTER_TOP_R - 1.2) + Vector((0, 0, up(LENGTH - 1.4)))) * IN,
            0.55 * IN,
            6,
            caps=False,
        )
    inner.build("Adapter_Structure", M["inner"], g)
    ring = MeshBuilder()  # Marman clamp ring: released by explosive bolts at separation
    ring.lathe(
        prof(
            [
                (ADAPTER_TOP_R, up(LENGTH - 1.2)),
                (ADAPTER_TOP_R + 0.9, up(LENGTH - 1.2)),
                (ADAPTER_TOP_R + 0.9, up(LENGTH - 0.1)),
                (ADAPTER_TOP_R - 0.3, up(LENGTH - 0.1)),
            ]
        ),
        128,
    )
    for i in range(3):
        t = TAU * (i + 0.5) / 3 + deg(30)
        a = (math.cos(t), math.sin(t), 0)
        if clamp_covers == "streamlined":
            # half an egg lying on the skin, taller than wide, its upper part reaching over the capsule's rim
            at = frame(Vector(a) * (ADAPTER_TOP_R + 0.2) * IN + Vector((0, 0, up(LENGTH + 0.4) * IN)), a)
            us = [math.pi * i / 10 for i in range(11)]
            vs = [math.pi * j / 12 for j in range(13)]
            ring.grid(
                lambda u, v: Vector(
                    (
                        2.4 * IN * math.sin(v) * math.cos(u),
                        -(4.6 if v > math.pi / 2 else 3.4) * IN * math.cos(v),
                        1.7 * IN * math.sin(v) * math.sin(u),
                    )
                ),
                us,
                vs,
                matrix=at,
                flip=True,
            )
            continue
        ring.box(
            (2.6 * IN, 4.5 * IN, 2.2 * IN),
            frame(Vector(a) * (ADAPTER_TOP_R + 1.3) * IN + Vector((0, 0, up(LENGTH - 0.7) * IN)), a) @ Matrix.Rotation(math.pi / 2, 4, "Y"),
        )
    ring.build("Adapter_ClampRing", M["steel"], g, sharp_angle=30)

    # ----------------------------------------------------------------- aft unit
    # Instrument compartment (LEV-3 autopilot, abort sensing) above a ballast section. On the
    # missile this unit left with the warhead; on the MRLV it is bolted to the tanks for good.
    g = group("RedstoneAftUnit")
    white, black, rivets = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # Roll pattern, read off the liftoff photograph (MR-3 Postlaunch Report, Figure 3.2-1): narrow
    # upright stripes the height of the unit, with a row of checks at top and bottom where the
    # colours swap. Sixteen stripes is a count from that photograph, not a drawing.
    stripes, check = 16, 14.0
    _banded(black, white, BODY_R, up(S_TANK), up(S_TANK + check), 0.0, stripes)
    _banded(white, black, BODY_R, up(S_TANK + check), up(S_AFT - check), 0.0, stripes)
    _banded(black, white, BODY_R, up(S_AFT - check), up(S_AFT), 0.0, stripes)
    for s in (S_TANK + 1.5, S_TANK + AFT_LOWER, S_TANK + AFT_LOWER + INSTRUMENT, S_AFT - 1.5):
        _rivet_ring(rivets, BODY_R, up(s))
    doors = MeshBuilder()
    for t in (deg(90), deg(270)):  # instrument compartment access doors
        doors.box((16 * IN, 22 * IN, 0.25 * IN), body.frame(t, up(S_TANK + AFT_LOWER + INSTRUMENT / 2), 0.0))
    for t in (deg(0), deg(180)):
        doors.box((12 * IN, 12 * IN, 0.25 * IN), body.frame(t, up(S_TANK + 21), 0.0))
    caps = MeshBuilder()
    caps.lathe(prof([(0, up(S_TANK + 0.3)), (BODY_R - 0.2, up(S_TANK + 0.3))]), 64, flip=True)
    # no bulkhead at the top: the capsule's retropack hangs down into the ballast section
    white.build("AftUnit_SkinWhite", M["white"], g, sharp_angle=None)
    black.build("AftUnit_SkinBlack", M["black"], g, sharp_angle=None)
    _rivet_lines(rivets, BODY_R, up(S_TANK + 4), up(S_AFT - 4), 24)
    antennas = MeshBuilder()
    for i in range(4):  # telemetry and command antennas on the aft unit proper
        f = body.frame(deg(22.5 + 90 * i), up(S_TANK + AFT_LOWER * 0.5))
        antennas.box((1.0 * IN, 9.0 * IN, 5.0 * IN), f @ Matrix.Translation((0, 0, 2.0 * IN)))
        antennas.box((4.0 * IN, 12.0 * IN, 0.5 * IN), f)
    antennas.build("AftUnit_Antennas", M["sheet"], g, smooth=False)
    doors.build("AftUnit_AccessDoors", M["white"], g, smooth=False)
    rivets.build("AftUnit_Fasteners", M["bolt"], g)
    caps.build("AftUnit_Bulkheads", M["inner"], g)
    # the skin's inner face, standing off it: fittings sunk through the skin end behind this
    wall = MeshBuilder()
    wall.lathe(prof([(BODY_R - 0.9, up(S_TANK + 0.3)), (BODY_R - 0.9, up(S_AFT))]), 96, flip=True)
    wall.build("AftUnit_InnerWall", M["wall"], g, sharp_angle=None)
    if interior():
        z0, z1 = S_TANK + AFT_LOWER, S_TANK + AFT_LOWER + INSTRUMENT
        can = MeshBuilder()  # the pressurised instrument compartment: a drum inside the skin
        can.lathe(
            prof([(0.0, up(z0 + 1.0)), (30.0, up(z0 + 1.0)), (31.5, up(z0 + 3.0)), (31.5, up(z1 - 3.0)), (30.0, up(z1 - 1.0)), (0.0, up(z1 - 1.0))]),
            96,
        )
        can.build("AftUnit_InstrumentCompartment", M["inner"], g, sharp_angle=30)
        gear, ballast, spheres = MeshBuilder(), MeshBuilder(), MeshBuilder()
        gear.lathe(prof([(0.0, up(z0 + 20.0)), (29.0, up(z0 + 20.0)), (29.0, up(z0 + 21.0)), (0.0, up(z0 + 21.0))]), 48)  # equipment shelf
        # LEV-3 autopilot, abort sensing, telemetry, batteries: representative boxes on the shelf and floor
        for x, y, zb, sx, sy, sz in (
            (-12, -10, 21, 14, 12, 13),
            (10, -12, 21, 10, 10, 9),
            (12, 10, 21, 12, 14, 16),
            (-12, 12, 21, 9, 9, 10),
            (-10, 0, 3, 16, 20, 9),
            (12, -4, 3, 12, 14, 12),
            (0, 16, 3, 10, 8, 7),
        ):
            gear.box((sx * IN, sy * IN, sz * IN), Matrix.Translation(Vector((x, y, up(z0 + zb + sz / 2))) * IN))
        # ballast: a steel ring high in the section, below where the retropack reaches
        ballast.lathe(
            prof([(22.0, up(S_AFT - 36.0)), (32.0, up(S_AFT - 36.0)), (32.0, up(S_AFT - 21.0)), (22.0, up(S_AFT - 21.0)), (22.0, up(S_AFT - 36.0))]),
            64,
        )
        for i in range(4):  # nitrogen for pressurising the tanks, in spheres round the aft unit
            t = deg(45 + 90 * i)
            spheres.lathe(
                prof(arc_profile(0, 0, 8.5, -90, 90, 12)),
                24,
                matrix=Matrix.Translation(Vector((19 * math.cos(t), 19 * math.sin(t), up(S_TANK + 22))) * IN),
            )
        gear.build("AftUnit_Equipment", M["equipment"], g, sharp_angle=35)
        ballast.build("AftUnit_Ballast", M["ballast"], g, sharp_angle=35)
        spheres.build("AftUnit_NitrogenSpheres", M["alu"], g)

    # -------------------------------------------------------------- centre unit
    # Alcohol tank above, liquid oxygen below; the tank walls are the airframe.
    g = group("RedstoneCenterUnit")
    skin, rivets, fit = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # a dark band round the tanks, 59% of the way up them in the liftoff photograph
    band0, band1 = S_TAIL + 261.0, S_TAIL + 269.0
    # Frost: on launch morning the oxygen tank's wall, at -183 C, is white with ice from the humid
    # Cape air between its two domes. The alcohol tank above it stays bare paint.
    frost0, frost1 = S_TAIL + 16.0, S_TAIL + 16.83 * 12 - 8.0
    skin.lathe(prof([(BODY_R, up(S_TAIL)), (BODY_R, up(frost0))]), 128)
    skin.lathe(prof([(BODY_R, up(frost1)), (BODY_R, up(band0))]), 128)
    frost = MeshBuilder()
    frost.lathe(prof([(BODY_R, up(frost0)), (BODY_R, up(frost1))]), 128)
    frost.build("CenterUnit_Frost", M["frost"], g, sharp_angle=None)
    skin.lathe(prof([(BODY_R, up(band1)), (BODY_R, up(S_TANK))]), 128)
    band = MeshBuilder()
    band.lathe(prof([(BODY_R, up(band0)), (BODY_R, up(band1))]), 128)
    band.build("CenterUnit_Band", M["black"], g, sharp_angle=None)
    wall = MeshBuilder()  # the tank wall's inner face: the conduits' and ports' roots end behind it
    wall.lathe(prof([(BODY_R - 0.8, up(S_TAIL)), (BODY_R - 0.8, up(S_TANK))]), 96, flip=True)
    wall.build("CenterUnit_InnerWall", M["wall"], g, sharp_angle=None)
    for s in range(int(S_TAIL) + 2, int(S_TANK), 47):  # skin rings
        _rivet_ring(rivets, BODY_R, up(s), 72)
    _rivet_ring(rivets, BODY_R, up(S_TANK - 2), 72)
    dome = 14.0
    caps = MeshBuilder()
    top = [((BODY_R - 1.3) * math.cos(a), up(S_TANK - dome - 0.5) + dome * math.sin(a)) for a in (math.pi / 2 * i / 10 for i in range(11))]
    caps.lathe(prof(top), 64)
    bot = [((BODY_R - 1.3) * math.sin(a), up(S_TAIL + dome + 0.5) - dome * math.cos(a)) for a in (math.pi / 2 * i / 10 for i in range(11))]
    caps.lathe(prof(bot), 64)
    s_mid = S_TAIL + 16.83 * 12 + 9.0  # the bulkhead the two tanks share
    mid = [((BODY_R - 1.3) * math.cos(a), up(s_mid) + dome * math.sin(a)) for a in (math.pi / 2 * i / 10 for i in range(11))]
    caps.lathe(prof(mid), 64)
    for z in (S_TANK - dome - 0.5, S_TAIL + dome + 0.5, s_mid):  # each dome's rim, welded to the wall
        caps.lathe(prof([(BODY_R - 1.5, up(z)), (BODY_R - 0.6, up(z))]), 64)
    if interior():  # the alcohol's feed line runs down the middle of the oxygen tank, lagged with glass wool
        feed = MeshBuilder()
        feed.tube((0, 0, up(S_TAIL + 1.0) * IN), (0, 0, up(s_mid + dome - 1.0) * IN), 3.6 * IN, 24)
        feed.lathe(
            prof([(3.6, up(s_mid + dome - 1.0)), (7.0, up(s_mid + dome + 1.5)), (7.0, up(s_mid + dome + 2.5)), (0.0, up(s_mid + dome + 2.5))]), 24
        )
        feed.build("CenterUnit_FuelFeedLine", M["alu"], g)
    # external conduit carrying wiring and pressurisation lines past the tanks
    for t in (deg(45), deg(225)):
        fit.box((5.0 * IN, (S_TANK - S_TAIL + 30) * IN, 2.4 * IN), body.frame(t, up((S_TANK + S_TAIL) / 2), 1.0))
    for t, s in ((deg(135), S_TAIL + 180), (deg(315), S_TAIL + 420)):  # LOX and alcohol fill and vent
        f = body.frame(t, up(s))
        fit.lathe(prof([(3.2, -0.2), (3.2, 0.5), (2.4, 0.5), (2.3, 0.2), (0, 0.2)]), 28, matrix=f)
    paint = MeshBuilder()
    word = "UNITED STATES"
    pitch = 25.0
    for t in (deg(90), deg(270)):  # stacked upright, one letter under the next
        for i, ch in enumerate(word):
            if ch == " ":
                continue
            s = S_TAIL + 225 + (len(word) - 1) * pitch / 2 - i * pitch
            # scale by height: lettering() fits width, so size narrow letters down
            width = {"I": 5.0, "T": 16.0, "E": 15.0, "S": 16.5}.get(ch, 17.5)
            lettering(paint, body, ch, width, t, up(s), False, font)
    for i in range(6):  # longitudinal welds: each tank barrel is rolled from sheet
        # in two lengths, stopping short of the ring weld between the tanks: the two welds would
        # otherwise lie in each other's surface at a coarse level of detail
        for s0, s1 in ((S_TAIL + 3, s_mid - 9.0 - 1.6), (s_mid - 9.0 + 1.6, S_TANK - 3)):
            fit.box((1.1 * IN, (s1 - s0) * IN, 0.5 * IN), body.frame(deg(15 + 60 * i), up((s0 + s1) / 2), -0.12))
    for s in (S_TAIL + 16.83 * 12,):  # the common bulkhead between the tanks shows as a ring weld
        fit.lathe(prof([(BODY_R - 0.1, up(s - 0.9)), (BODY_R + 0.22, up(s - 0.5)), (BODY_R + 0.22, up(s + 0.5)), (BODY_R - 0.1, up(s + 0.9))]), 128)
    skin.build("CenterUnit_Tanks", M["white"], g, sharp_angle=None)
    rivets.build("CenterUnit_Fasteners", M["bolt"], g)
    fit.build("CenterUnit_Conduits", M["white"], g, smooth=True, sharp_angle=30)
    caps.build("CenterUnit_TankDomes", M["alu"], g)
    paint.build("CenterUnit_Lettering", M["red"], g, smooth=False)

    # ---------------------------------------------------------------- tail unit
    g = group("RedstoneTailUnit")
    white, black, rivets = MeshBuilder(), MeshBuilder(), MeshBuilder()
    _banded(white, black, BODY_R, up(8), up(S_TAIL), deg(0))
    white.lathe(prof([(BODY_R - 1.5, up(0)), (BODY_R, up(8))]), 128)
    for s in (10, S_TAIL - 2):
        _rivet_ring(rivets, BODY_R, up(s))
    inner = MeshBuilder()
    inner.lathe(prof([(BODY_R - 1.6, up(0)), (BODY_R - 1.6, up(S_TAIL))]), 64, flip=True)  # inside the fin roots
    inner.lathe(prof([(BODY_R - 1.6, up(S_TAIL - 0.4)), (0, up(S_TAIL - 0.4))]), 64, flip=True)
    inner.lathe(prof([(NOZZLE_EXIT_R + 2.0, up(6)), (BODY_R - 0.4, up(6))]), 64)  # base heat shield
    fins_w, fins_b, rudders = MeshBuilder(), MeshBuilder(), MeshBuilder()
    tip_r = FIN_SPAN / 2
    for i in range(4):
        rot = Matrix.Rotation(deg(45 + 90 * i), 4, "Z") @ Matrix.Translation((0, 0, base_z * IN))
        fin = [
            (BODY_R - 1.2, 0),
            (tip_r - 15, 0),
            (tip_r - 15, 34),
            (tip_r, 34),
            (tip_r, FIN_TIP),
            (BODY_R - 1.2, FIN_ROOT),
        ]  # roots buried in the skin
        # Rows of fasteners where the skins meet the root fitting, a spar along the leading edge, a rib over
        # the rudder's bay and the edge of that bay; the rudders' own along their inboard edge (estimated)
        lead = Vector((BODY_R - 1.2 - tip_r, FIN_ROOT - FIN_TIP)).normalized()
        inward = Vector((-lead.y, lead.x))  # into the fin from its leading edge
        spar = [Vector((tip_r, FIN_TIP)) + lead * t + inward * 9.0 for t in (9.0, 55.0)]
        rows = [
            ((BODY_R + 2.5, 3.0), (BODY_R + 2.5, FIN_ROOT - 6.0), 3.5),
            (tuple(spar[0]), tuple(spar[1]), 3.5),
            ((BODY_R + 3.0, 36.5), (tip_r - 16.5, 36.5), 3.5),
            ((tip_r - 17.0, 3.0), (tip_r - 17.0, 33.0), 3.5),
            ((BODY_R + 3.0, 2.5), (tip_r - 17.0, 2.5), 3.5),
        ]
        _fin(fins_w if i % 2 == 0 else fins_b, fin, 4.2, 1.6, BODY_R, tip_r, rot, rivets=rivets, rows=rows)
        # air rudder at each tip: steers once the air is thick enough to bite. Each turns on a shaft across
        # the gap from the fin, its bearing boss on either face (where the shaft is is estimated)
        rudder = [(tip_r - 14.5, 0), (tip_r, 0), (tip_r, 33.5), (tip_r - 14.5, 33.5)]
        _fin(rudders, rudder, 1.9, 1.5, tip_r - 14.5, tip_r, rot, rivets=rivets, rows=[((tip_r - 12.5, 2.0), (tip_r - 12.5, 31.5), 3.5)])
        rudders.tube(rot @ Vector(((tip_r - 16.0) * IN, 0, 24.0 * IN)), rot @ Vector(((tip_r - 12.0) * IN, 0, 24.0 * IN)), 0.6 * IN, 12)
        for side in (1, -1):
            hub = rot @ Vector(((tip_r - 9.0) * IN, side * 0.85 * IN, 24.0 * IN))
            rudders.lathe(prof([(0.0, 0.0), (1.3, 0.0), (1.1, 0.35), (0.0, 0.4)]), 16, matrix=frame(hub, rot.to_3x3() @ Vector((0, side, 0))))
    white.build("TailUnit_SkinWhite", M["white"], g, sharp_angle=None)
    black.build("TailUnit_SkinBlack", M["black"], g, sharp_angle=None)
    fins_w.build("TailUnit_FinsWhite", M["white"], g, sharp_angle=50)  # flat faces, rounded edges
    fins_b.build("TailUnit_FinsBlack", M["black"], g, sharp_angle=50)
    rudders.build("TailUnit_AirRudders", M["sheet"], g, sharp_angle=50)
    _rivet_lines(rivets, BODY_R, up(14), up(S_TAIL - 5), 24)
    shields = MeshBuilder()
    for i in range(4):  # stainless shields on the fin roots, added for the longer burn
        rot = Matrix.Rotation(deg(45 + 90 * i), 4, "Z") @ Matrix.Translation((0, 0, base_z * IN))
        _prism(shields, [(BODY_R - 0.6, 0.6), (BODY_R + 15, 0.6), (BODY_R + 15, 20), (BODY_R - 0.6, 30)], 5.0, 4.3, BODY_R, BODY_R + 15, rot)
    for t in (deg(0), deg(180)):  # engine bay access doors
        shields.box((20 * IN, 26 * IN, 0.5 * IN), body.frame(t, up(S_TAIL - 34), 0.0))
    shields.build("TailUnit_ShieldsAndDoors", M["sheet"], g, smooth=False)
    rivets.build("TailUnit_Fasteners", M["bolt"], g)
    inner.build("TailUnit_Structure", M["inner"], g)

    # ------------------------------------------------------------------- engine
    # Rocketdyne A-7: 78,000 lbf at sea level on 75% ethyl alcohol and liquid oxygen, pumps
    # driven by steam from hydrogen peroxide. It does not gimbal: four graphite vanes in the
    # exhaust steer the vehicle.
    g = group("RedstoneEngine")
    eu = lambda s: up(s * 0.8)  # noqa: E731  engine stations, drawn for a taller bay and scaled to this one
    eng = MeshBuilder()
    bell = [(11.5, 118), (11.5, 96), (10.5, 88), (7.6, 78), (8.6, 70), (11.2, 52), (13.6, 34), (15.4, 16), (NOZZLE_EXIT_R, 2)]
    wall = MeshBuilder()
    wall.lathe(prof([(r, eu(s)) for r, s in reversed(bell)]), 64)  # outer wall, walked upward
    wall.lathe(prof([(0, eu(119.5)), (6, eu(121)), (11.5, eu(118))][::-1]), 64, flip=True)  # injector dome
    wall.build("Engine_ChamberWall", M["engine"], g, sharp_angle=35)
    for s in range(17, 70, 9):  # stiffening hoops on the double-walled chamber, between the two manifolds
        r = next(r0 + (r1 - r0) * (s - s0) / (s1 - s0) for (r0, s0), (r1, s1) in zip(bell, bell[1:]) if s1 <= s <= s0)
        eng.lathe(prof([(r + 0.1, eu(s - 0.7)), (r + 0.8, eu(s)), (r + 0.1, eu(s + 0.7))]), 48)
    # turbopump and peroxide tank beside the chamber; thrust frame up to the tank
    eng.tube((20 * IN, 4 * IN, eu(84) * IN), (20 * IN, 4 * IN, eu(116) * IN), 6.5 * IN, 24)
    eng.lathe(prof(arc_profile(0, 0, 8.0, -90, 90, 12)), 24, matrix=Matrix.Translation((-21.5 * IN, -3 * IN, eu(104) * IN)))
    eng.tube((20 * IN, 4 * IN, eu(100) * IN), (9 * IN, 2 * IN, eu(112) * IN), 2.2 * IN, 12)
    for i in range(4):
        t = deg(45 + 90 * i)
        a = Vector((math.cos(t), math.sin(t), 0))
        eng.tube((a * 10.5 + Vector((0, 0, eu(116)))) * IN, (a * 30 + Vector((0, 0, up(S_TAIL - 1)))) * IN, 1.3 * IN, 10)
    # the chamber is double-walled and cooled by its own fuel: the outer wall is ribbed lengthwise
    ribs = MeshBuilder()
    stations = [float(s) for s in range(4, 78, 2)]

    def bell_r(s: float) -> float:
        return next(r0 + (r1 - r0) * (s - s0) / (s1 - s0) for (r0, s0), (r1, s1) in zip(bell, bell[1:]) if s1 <= s <= s0)

    nrib = 72
    ribs.grid(
        lambda u, s: (
            (bell_r(s) + 0.12 + 0.2 * max(0.0, math.cos(u * nrib))) * math.cos(u) * IN,
            (bell_r(s) + 0.12 + 0.2 * max(0.0, math.cos(u * nrib))) * math.sin(u) * IN,
            eu(s) * IN,
        ),
        [TAU * i / (nrib * 4) for i in range(nrib * 4)],
        stations,
        closed_u=True,
    )
    ribs.build("Engine_CoolingJacket", M["engine"], g, sharp_angle=None)
    pipes = MeshBuilder()
    r1 = lambda rr: (rr * IN, rr * IN)  # noqa: E731
    # alcohol arrives down the axis (its line runs through the oxygen tank); oxygen round the side
    pipes.tube((0, 0, eu(121) * IN), (0, 0, up(S_TAIL - 1) * IN), 3.2 * IN, 20)
    pipes.loft(
        [Vector((20, 4, eu(111))) * IN, Vector((23, 6, eu(126))) * IN, Vector((24, 8, up(S_TAIL - 6))) * IN, Vector((24, 8, up(S_TAIL - 1))) * IN],
        [r1(2.6)] * 4,
        16,
        ref=(1, 0, 0),
    )
    # pump discharge to the fuel manifold at the nozzle exit, where the coolant starts its trip up the wall
    pipes.loft(
        [Vector((20, 4, eu(89))) * IN, Vector((21.5, 5, eu(60))) * IN, Vector((20.5, 4, eu(22))) * IN, Vector((18.0, 3, eu(8))) * IN],
        [r1(2.0)] * 4,
        16,
        ref=(1, 0, 0),
    )
    for s, extra in ((6, 0.75), (74, 0.6)):  # sunk a little way into the wall
        rr = bell_r(s) + extra
        pipes.lathe(prof([(rr + 1.0 * math.cos(a), eu(s) + 1.0 * math.sin(a)) for a in (TAU * k / 12 for k in range(13))][::-1]), 64)
    # steam from the peroxide gas generator leaves through a duct to the base
    pipes.loft(
        [Vector((-21.5, -3, eu(96))) * IN, Vector((-24, -6, eu(70))) * IN, Vector((-25, -8, eu(30))) * IN, Vector((-25, -8, up(7))) * IN],
        [r1(1.9)] * 4,
        14,
        ref=(1, 0, 0),
    )
    for sx in (-1, 1):  # air bottles for the valves
        pipes.lathe(prof(arc_profile(0, 0, 4.6, -90, 90, 10)), 20, matrix=Matrix.Translation((sx * 6 * IN, 24 * IN, eu(120) * IN)))
    pipes.build("Engine_Plumbing", M["alu"], g, sharp_angle=40)
    eng.build("Engine_A7", M["engine"], g, sharp_angle=35)
    if interior():  # inside the chamber: the hot wall, and the injector the propellants arrive through
        liner, inj = MeshBuilder(), MeshBuilder()
        liner.lathe(prof([(r - 1.0, eu(s)) for r, s in bell]), 64)
        inj.lathe(prof([(11.0, eu(117.2)), (0.0, eu(117.2))]), 48, flip=True)
        for rr in (2.0, 4.2, 6.4, 8.6, 10.4):  # rings of orifices, shown as ridges
            inj.lathe(prof([(rr + 0.35, eu(117.2)), (rr + 0.35, eu(116.6)), (rr - 0.35, eu(116.6)), (rr - 0.35, eu(117.2))]), 48)
        liner.build("Engine_ChamberLiner", M["liner"], g, sharp_angle=None)
        inj.build("Engine_Injector", M["steel"], g)
    vanes = MeshBuilder()
    arms = MeshBuilder()
    for i in range(4):
        rot = Matrix.Rotation(deg(45 + 90 * i), 4, "Z") @ Matrix.Translation((0, 0, base_z * IN))
        _prism(vanes, [(6.5, 0.2), (15.0, 0.2), (15.0, 6.5), (11.5, 11.0), (6.5, 11.0)], 1.5, 1.5, 6.5, 15.0, rot)
        a = Vector((math.cos(deg(45 + 90 * i)), math.sin(deg(45 + 90 * i)), 0))
        arms.tube(
            (a * 15.0 + Vector((0, 0, up(5)))) * IN, (a * (BODY_R - 1.25) + Vector((0, 0, up(5)))) * IN, 1.1 * IN, 10
        )  # ends between the inner wall and the skin
    vanes.build("Engine_JetVanes", M["graphite"], g, smooth=False)
    arms.build("Engine_VaneShafts", M["steel"], g)
