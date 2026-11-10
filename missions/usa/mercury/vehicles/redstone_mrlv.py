"""The Mercury-Redstone Launch Vehicle (MRLV): one stage, one Rocketdyne A-7.

Shared by the flights that rode it (MR-3, MR-4); a flight's build.py imports this module and
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

from srlib import IN, TAU, MeshBuilder, Surf, arc_profile, deg, frame, group, lettering, material, prof

BODY_R = 35.0            # 70 in diameter
LENGTH = 716.5           # base to the spacecraft's heat-shield plane: 59.7 ft
S_TAIL = 111.24          # top of the tail unit: 9.27 ft (TM X-53107, Figure 4-1)
S_TANK = S_TAIL + 450.0  # top of the centre unit: 37.50 ft; alcohol tank 18.8 ft over LOX tank 16.83 ft
S_AFT = 708.0            # X-axis station zero, 59.00 ft up: top of the aft section; the adapter runs on to LENGTH
AFT_LOWER = 42.16        # aft unit proper: nitrogen spheres, antennas, receivers
INSTRUMENT = 53.66       # pressurised instrument compartment, above it; ballast section above that
ADAPTER_TOP_R = 36.6     # just inside the capsule's 74.5 in heat shield
FIN_SPAN = 152.0         # tip to tip
FIN_ROOT, FIN_TIP = 100.0, 38.0   # chords
NOZZLE_EXIT_R = 16.5


def materials() -> dict:
    m = material
    return {
        "white": m("paint-booster-white", (0.80, 0.80, 0.78), 0.0, 0.42),
        "black": m("paint-booster-black", (0.018, 0.018, 0.02), 0.0, 0.5),
        "red": m("paint-booster-red", (0.45, 0.02, 0.015), 0.0, 0.5, double_sided=True),
        "inner": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "alu": m("aluminium", (0.78, 0.78, 0.77), 1.0, 0.32),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "engine": m("engine-steel", (0.30, 0.29, 0.28), 1.0, 0.42, double_sided=True),
        "graphite": m("graphite", (0.03, 0.03, 0.032), 0.3, 0.6),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
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


def _quartered(mb_a: MeshBuilder, mb_b: MeshBuilder, r: float, z0: float, z1: float, phase: float, off=0.0) -> None:
    """Roll pattern: four quadrants, alternating, so a camera can read the vehicle's roll."""
    for q in range(4):
        mb = mb_a if q % 2 == 0 else mb_b
        mb.lathe(prof([(r + off, z0), (r + off, z1)]), 24, arc=(phase + q * TAU / 4, phase + (q + 1) * TAU / 4))


def _rivet_ring(mb: MeshBuilder, r: float, z: float, count: int = 96) -> None:
    for i in range(count):
        t = TAU * i / count
        mb.disc(Vector((r * math.cos(t), r * math.sin(t), z)) * IN, (math.cos(t), math.sin(t), 0), 0.3 * IN, 0.08 * IN)


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
    for i in range(n):   # edge faces, own verts so they shade flat
        j = (i + 1) % n
        base = len(verts)
        (r0, z0), (r1, z1) = outline[i], outline[j]
        verts += [(r0 * IN, half(r0) * IN, z0 * IN), (r1 * IN, half(r1) * IN, z1 * IN),
                  (r1 * IN, -half(r1) * IN, z1 * IN), (r0 * IN, -half(r0) * IN, z0 * IN)]
        faces.append((base, base + 1, base + 2, base + 3))
    mb.add(verts, faces, None, matrix)


def build(base_z: float, font=None) -> None:
    """Build the booster with its base at station `base_z` (inches) of the flight's frame."""
    M = _reuse(materials())
    up = lambda s: base_z + s   # noqa: E731
    body = Surf(BODY_R, 0.0, 0.0)

    # ------------------------------------------------------------------ adapter
    g = group("RedstoneAdapter")
    skin = MeshBuilder()
    skin.lathe(prof([(BODY_R, up(S_AFT)), (ADAPTER_TOP_R, up(LENGTH - 1.2))]), 128)
    skin.build("Adapter_Skin", M["white"], g, sharp_angle=None)
    inner = MeshBuilder()
    inner.lathe(prof([(BODY_R - 0.3, up(S_AFT)), (ADAPTER_TOP_R - 0.3, up(LENGTH - 1.2))]), 96, flip=True)
    for i in range(24):   # stringers added for the Mercury capsule's weight
        t = TAU * i / 24
        a = Vector((math.cos(t), math.sin(t), 0))
        inner.tube((a * (BODY_R - 0.9) + Vector((0, 0, up(S_AFT + 1)))) * IN,
                   (a * (ADAPTER_TOP_R - 0.9) + Vector((0, 0, up(LENGTH - 2)))) * IN, 0.55 * IN, 6, caps=False)
    inner.build("Adapter_Structure", M["inner"], g)
    ring = MeshBuilder()   # Marman clamp ring: released by explosive bolts at separation
    ring.lathe(prof([(ADAPTER_TOP_R, up(LENGTH - 1.2)), (ADAPTER_TOP_R + 0.9, up(LENGTH - 1.2)),
                     (ADAPTER_TOP_R + 0.9, up(LENGTH - 0.1)), (ADAPTER_TOP_R - 0.3, up(LENGTH - 0.1))]), 128)
    for i in range(3):
        t = TAU * (i + 0.5) / 3 + deg(30)
        a = (math.cos(t), math.sin(t), 0)
        ring.box((2.6 * IN, 4.5 * IN, 2.2 * IN), frame(Vector(a) * (ADAPTER_TOP_R + 1.3) * IN + Vector((0, 0, up(LENGTH - 0.7) * IN)), a)
                 @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    ring.build("Adapter_ClampRing", M["steel"], g, sharp_angle=30)

    # ----------------------------------------------------------------- aft unit
    # Instrument compartment (LEV-3 autopilot, abort sensing) above a ballast section. On the
    # missile this unit left with the warhead; on the MRLV it is bolted to the tanks for good.
    g = group("RedstoneAftUnit")
    white, black, rivets = MeshBuilder(), MeshBuilder(), MeshBuilder()
    white.lathe(prof([(BODY_R, up(S_TANK)), (BODY_R, up(S_TANK + AFT_LOWER))]), 128)
    _quartered(white, black, BODY_R, up(S_TANK + AFT_LOWER), up(S_AFT), deg(45))
    for s in (S_TANK + 1.5, S_TANK + AFT_LOWER, S_TANK + AFT_LOWER + INSTRUMENT, S_AFT - 1.5):
        _rivet_ring(rivets, BODY_R, up(s))
    doors = MeshBuilder()
    for t in (deg(90), deg(270)):   # instrument compartment access doors, on the white quadrants
        doors.box((16 * IN, 22 * IN, 0.25 * IN), body.frame(t, up(S_TANK + AFT_LOWER + INSTRUMENT / 2), 0.0))
    for t in (deg(0), deg(180)):
        doors.box((12 * IN, 12 * IN, 0.25 * IN), body.frame(t, up(S_TANK + 21), 0.0))
    caps = MeshBuilder()
    caps.lathe(prof([(0, up(S_TANK + 0.3)), (BODY_R - 0.2, up(S_TANK + 0.3))]), 64, flip=True)
    caps.lathe(prof([(BODY_R - 0.2, up(S_AFT - 0.3)), (0, up(S_AFT - 0.3))]), 64, flip=True)
    white.build("AftUnit_SkinWhite", M["white"], g, sharp_angle=None)
    black.build("AftUnit_SkinBlack", M["black"], g, sharp_angle=None)
    doors.build("AftUnit_AccessDoors", M["white"], g, smooth=False)
    rivets.build("AftUnit_Fasteners", M["bolt"], g)
    caps.build("AftUnit_Bulkheads", M["inner"], g)

    # -------------------------------------------------------------- centre unit
    # Alcohol tank above, liquid oxygen below; the tank walls are the airframe.
    g = group("RedstoneCenterUnit")
    skin, rivets, fit = MeshBuilder(), MeshBuilder(), MeshBuilder()
    skin.lathe(prof([(BODY_R, up(S_TAIL)), (BODY_R, up(S_TANK))]), 128)
    for s in range(int(S_TAIL) + 2, int(S_TANK), 47):   # skin rings
        _rivet_ring(rivets, BODY_R, up(s), 72)
    _rivet_ring(rivets, BODY_R, up(S_TANK - 2), 72)
    dome = 14.0
    caps = MeshBuilder()
    top = [((BODY_R - 0.3) * math.cos(a), up(S_TANK - dome - 0.5) + dome * math.sin(a)) for a in (math.pi / 2 * i / 10 for i in range(11))]
    caps.lathe(prof(top), 64)
    bot = [((BODY_R - 0.3) * math.sin(a), up(S_TAIL + dome + 0.5) - dome * math.cos(a)) for a in (math.pi / 2 * i / 10 for i in range(11))]
    caps.lathe(prof(bot), 64)
    # external conduit carrying wiring and pressurisation lines past the tanks
    for t in (deg(45), deg(225)):
        fit.box((5.0 * IN, (S_TANK - S_TAIL + 30) * IN, 2.4 * IN), body.frame(t, up((S_TANK + S_TAIL) / 2), 1.0))
    for t, s in ((deg(135), S_TAIL + 180), (deg(315), S_TAIL + 420)):   # LOX and alcohol fill and vent
        f = body.frame(t, up(s))
        fit.lathe(prof([(3.2, -0.2), (3.2, 0.5), (2.4, 0.5), (2.3, 0.2), (0, 0.2)]), 28, matrix=f)
    paint = MeshBuilder()
    word = "UNITED STATES"
    pitch = 25.0
    for t in (deg(90), deg(270)):   # stacked upright, one letter under the next
        for i, ch in enumerate(word):
            if ch == " ":
                continue
            s = S_TAIL + 225 + (len(word) - 1) * pitch / 2 - i * pitch
            # scale by height: lettering() fits width, so size narrow letters down
            width = {"I": 5.0, "T": 16.0, "E": 15.0, "S": 16.5}.get(ch, 17.5)
            lettering(paint, body, ch, width, t, up(s), False, font)
    skin.build("CenterUnit_Tanks", M["white"], g, sharp_angle=None)
    rivets.build("CenterUnit_Fasteners", M["bolt"], g)
    fit.build("CenterUnit_Conduits", M["white"], g, smooth=True, sharp_angle=30)
    caps.build("CenterUnit_TankDomes", M["alu"], g)
    paint.build("CenterUnit_Lettering", M["red"], g, smooth=False)

    # ---------------------------------------------------------------- tail unit
    g = group("RedstoneTailUnit")
    white, black, rivets = MeshBuilder(), MeshBuilder(), MeshBuilder()
    _quartered(white, black, BODY_R, up(8), up(S_TAIL), deg(0))
    white.lathe(prof([(BODY_R - 1.5, up(0)), (BODY_R, up(8))]), 128)
    for s in (10, S_TAIL - 2):
        _rivet_ring(rivets, BODY_R, up(s))
    inner = MeshBuilder()
    inner.lathe(prof([(BODY_R - 0.4, up(0)), (BODY_R - 0.4, up(S_TAIL))]), 64, flip=True)
    inner.lathe(prof([(BODY_R - 0.4, up(S_TAIL - 0.4)), (0, up(S_TAIL - 0.4))]), 64, flip=True)
    inner.lathe(prof([(NOZZLE_EXIT_R + 2.0, up(6)), (BODY_R - 0.4, up(6))]), 64)       # base heat shield
    fins_w, fins_b, rudders = MeshBuilder(), MeshBuilder(), MeshBuilder()
    tip_r = FIN_SPAN / 2
    for i in range(4):
        rot = Matrix.Rotation(deg(45 + 90 * i), 4, "Z") @ Matrix.Translation((0, 0, base_z * IN))
        fin = [(BODY_R - 1.2, 0), (tip_r - 15, 0), (tip_r - 15, 34), (tip_r, 34), (tip_r, FIN_TIP), (BODY_R - 1.2, FIN_ROOT)]   # roots buried in the skin
        _prism(fins_w if i % 2 == 0 else fins_b, fin, 4.2, 1.6, BODY_R, tip_r, rot)
        # air rudder at each tip: steers once the air is thick enough to bite
        _prism(rudders, [(tip_r - 14.5, 0), (tip_r, 0), (tip_r, 33.5), (tip_r - 14.5, 33.5)], 1.9, 1.5, tip_r - 14.5, tip_r, rot)
    white.build("TailUnit_SkinWhite", M["white"], g, sharp_angle=None)
    black.build("TailUnit_SkinBlack", M["black"], g, sharp_angle=None)
    fins_w.build("TailUnit_FinsWhite", M["white"], g, smooth=False)
    fins_b.build("TailUnit_FinsBlack", M["black"], g, smooth=False)
    rudders.build("TailUnit_AirRudders", M["alu"], g, smooth=False)
    rivets.build("TailUnit_Fasteners", M["bolt"], g)
    inner.build("TailUnit_Structure", M["inner"], g)

    # ------------------------------------------------------------------- engine
    # Rocketdyne A-7: 78,000 lbf at sea level on 75% ethyl alcohol and liquid oxygen, pumps
    # driven by steam from hydrogen peroxide. It does not gimbal: four graphite vanes in the
    # exhaust steer the vehicle.
    g = group("RedstoneEngine")
    eng = MeshBuilder()
    bell = [(11.5, 118), (11.5, 96), (10.5, 88), (7.6, 78), (8.6, 70), (11.2, 52), (13.6, 34), (15.4, 16), (NOZZLE_EXIT_R, 2)]
    eng.lathe(prof([(r, eu(s)) for r, s in reversed(bell)]), 64)                 # outer wall, walked upward
    eng.lathe(prof([(0, eu(119.5)), (6, eu(121)), (11.5, eu(118))][::-1]), 64, flip=True)   # injector dome
    for s in range(8, 76, 9):   # stiffening hoops on the double-walled chamber
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
    eng.build("Engine_A7", M["engine"], g, sharp_angle=35)
    vanes = MeshBuilder()
    arms = MeshBuilder()
    for i in range(4):
        rot = Matrix.Rotation(deg(45 + 90 * i), 4, "Z") @ Matrix.Translation((0, 0, base_z * IN))
        _prism(vanes, [(6.5, 0.2), (15.0, 0.2), (15.0, 6.5), (11.5, 11.0), (6.5, 11.0)], 1.5, 1.5, 6.5, 15.0, rot)
        a = Vector((math.cos(deg(45 + 90 * i)), math.sin(deg(45 + 90 * i)), 0))
        arms.tube((a * 15.0 + Vector((0, 0, up(5)))) * IN, (a * (BODY_R - 2) + Vector((0, 0, up(5)))) * IN, 1.1 * IN, 10)
    vanes.build("Engine_JetVanes", M["graphite"], g, smooth=False)
    arms.build("Engine_VaneShafts", M["steel"], g)
