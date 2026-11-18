"""Soyuz 16, 7K-TM No. 73 with its test ring, and Soyuz-U. Stations in millimetres."""

from __future__ import annotations

import math
import sys
from pathlib import Path

from mathutils import Matrix

_root = next(path for path in Path(__file__).resolve().parents if (path / "tools" / "blender").is_dir())
sys.path.insert(0, str(_root / "tools" / "blender"))
sys.path.insert(0, str(_root / "missions" / "ussr" / "voskhod" / "crew"))
for _programme in ("vostok", "voskhod", "soyuz"):
    sys.path.insert(0, str(_root / "missions" / "ussr" / _programme / "vehicles"))

import sokol_k  # noqa: E402
import soyuz_7kok  # noqa: E402
import soyuz_11a511  # noqa: E402
import soyuz_cabin  # noqa: E402
import srlib  # noqa: E402
from flight_suit import Wearer  # noqa: E402
from soyuz_7kok import BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, MM, box, metres, polar, rod, surface  # noqa: E402
from soyuz_station import orbital_module  # noqa: E402
from srlib import MeshBuilder, frame, group, interior, mark_shells, material, run  # noqa: E402

APAS_FAIRING_SHOULDER = 43635  # Estimated Soyuz-U shroud shoulder, extended over the projecting APAS guides.
LAUNCH_HEIGHT = 49300  # Assumed from NASA's caption for the ASTP reference stack, S75-32339.
APAS_TIP = 7480  # Adopted from Portree §1.9.1; guide tip datum estimated.
TEST_RING_TIP = 7600  # Estimated reconstruction; no dimensioned drawing of the Soyuz 16 test fixture.
SOLAR_SPAN = 8370  # Portree §1.9.1.
WING_ROOT = 1215
WING_LEAVES = (760, 990, SOLAR_SPAN / 2 - WING_ROOT - 1750)
WING_CHORD = 1760
COMMANDER = Wearer("Filipchenko", breadth=0.98)
ENGINEER = Wearer("Rukavishnikov", breadth=0.96)


def apas(paints):
    """Annular APAS-75 unit based on the ASTP press kit and Portree Fig. 1-22."""
    collar = group("ApasCollar")
    shell = surface(
        collar,
        "APAS_StructuralRing",
        paints["alloy"],
        [(507, 6970), (582, 6990), (651, 7040), (672, 7152), (670, 7240), (648, 7256), (505, 7256), (480, 7228), (480, 6994)],
    )
    pressure_hatch = surface(
        collar,
        "APAS_PressureHatch",
        paints["white"],
        [(479, 7100), (459, 7111), (417, 7118), (390, 7137), (265, 7150), (0, 7150)],
    )
    seals = surface(collar, "APAS_PressureSeals", paints["dark"], [(515, 7256), (517, 7263), (527, 7266), (534, 7263), (536, 7256)])
    mark_shells([shell.name, pressure_hatch.name, seals.name])
    hooks, bolts, pushers, latch_housings = (MeshBuilder() for _ in range(4))
    for i in range(8):
        az = 22.5 + i * 45
        pose = Matrix.Translation(metres(polar(603, az, 7257))) @ Matrix.Rotation(math.radians(az), 4, "Z")
        latch_housings.box(metres((69, 90, 13)), pose)
        hooks.box(metres((35, 45, 24)), pose @ Matrix.Translation(metres((0, 0, 11))))
        for theta in (-6, 6):
            bolts.disc(metres(polar(567, az + theta, 7257)), (0, 0, 1), 0.010, 0.007)
    for az in (4, 94, 184, 274):
        rod(pushers, polar(642, az, 7238), polar(642, az, 7291), 13, 20)
    for mesh, name, paint in (
        (hooks, "APAS_StructuralHooks", "alloy"),
        (bolts, "APAS_CaseFasteners", "foil"),
        (pushers, "APAS_SpringPushrods", "alloy"),
        (latch_housings, "APAS_LatchRecesses", "dark"),
    ):
        mark_shells([mesh.build(name, paints[paint], collar).name])

    capture = group("ApasCaptureRing")
    surface(capture, "APAS_GuideRing", paints["alloy"], [(501, 7259), (558, 7267), (586, 7290), (582, 7318), (514, 7318), (500, 7303), (501, 7259)])
    supports, petals, cams = (MeshBuilder() for _ in range(3))
    for az in (0, 120, 240):
        # Spades lean outward. Their three wide faces leave open sectors for the opposing guides.
        guide_outline = [(552, -104, 7307), (558, 104, 7307), (698, 188, 7401), (767, 100, APAS_TIP), (773, -95, APAS_TIP), (703, -188, 7399)]
        pose = Matrix.Rotation(math.radians(az), 4, "Z")
        points = [metres((r + skin, tangent, z - skin / 2)) for skin in (0, 17) for r, tangent, z in guide_outline]
        n = len(guide_outline)
        petals.add(
            points, [tuple(reversed(range(n))), tuple(range(n, n * 2)), *[(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]], matrix=pose
        )
        catch = Matrix.Translation(metres(polar(540, az + 60, 7315))) @ Matrix.Rotation(math.radians(az + 60), 4, "Z")
        cams.box(metres((73, 50, 38)), catch)
        cams.box(metres((42, 28, 22)), catch @ Matrix.Translation(metres((-14, 0, 21))))
        for theta in (-15, 15):
            rod(supports, polar(630, az + theta, 7134), polar(563, az + theta, 7284), 15, 18)
    petals.build("APAS_ThreeSpadeGuides", paints["alloy"], capture, smooth=False)
    cams.build("APAS_CaptureLatches", paints["dark"], capture)
    supports.build("APAS_AttenuatorEnds", paints["foil"], capture)

    # Equivalent Apollo-side interface, fitted only to the rehearsal ship. Profile reconstructed.
    test = group("TestDockingRing")
    surface(
        test,
        "TestRing_OuterFrame",
        paints["fixture"],
        [(648, 7392), (698, 7406), (725, 7440), (725, 7555), (703, 7576), (595, 7576), (576, 7552), (576, 7458), (608, 7425)],
    )
    surface(test, "TestRing_ContactRail", paints["alloy"], [(656, 7577), (661, 7591), (667, 7600), (685, 7600), (691, 7591), (693, 7577)])
    legs, shoe, pins, fasteners = (MeshBuilder() for _ in range(4))
    for az in (60, 180, 300):
        pose = Matrix.Translation(metres(polar(622, az, 7456))) @ Matrix.Rotation(math.radians(az), 4, "Z")
        shoe.box(metres((130, 130, 58)), pose)
        for shift in (-8, 8):
            rod(legs, polar(553, az + shift, 7308), polar(681, az + shift, 7470), 18, 18)
            pins.disc(metres(polar(719, az + shift, 7478)), polar(1, az + shift, 0), 0.022, 0.026, 20)
    for i in range(24):
        p = metres(polar(618, i * 15, 7578))
        fasteners.disc(p, (0, 0, 1), 0.010, 0.007)
    for mesh, name, paint in (
        (legs, "TestRing_BreakawayStruts", "alloy"),
        (shoe, "TestRing_ReactionShoes", "fixture"),
        (pins, "TestRing_SeparationFasteners", "foil"),
        (fasteners, "TestRing_FaceFasteners", "foil"),
    ):
        mesh.build(name, paints[paint], test)


def array(side, sign, paints):
    """Three unequal leaves on each wing, scaled to the ASTP span from the Apollo flight photo."""
    root = group("Solar" + side)
    parent = root
    yoke = MeshBuilder()
    root_y, root_z = -360, 527
    for z in (653, 2050):
        rod(yoke, (sign * 1035, 0, z), (sign * WING_ROOT, root_y, z), 23)
        rod(yoke, (sign * 1025, -205, z + 112), (sign * WING_ROOT, root_y, z), 14)
    yoke.build(root.name + "_RootYoke", paints["alloy"], root)

    for i, width in enumerate(WING_LEAVES):
        direction = (-1) ** i
        leaf = group(f"Solar{side}Leaf{i + 1}", parent)
        leaf.location = metres((sign * WING_ROOT, root_y, root_z) if i == 0 else (sign * 31, -direction * WING_LEAVES[i - 1], 0))
        skin, rim, cells, ribs, pins = (MeshBuilder() for _ in range(5))
        depth, height = 12, WING_CHORD
        # Each edge ends at the neighbouring hinge; the outer tip is the span datum.
        box(skin, (0, direction * (width + 9) / 2, height / 2), (depth, width - 16, height - 28))
        for z in (15, height - 15):
            box(rim, (0, direction * width / 2, z), (22, width - 7, 23))
        for y in (12, width - 11):
            box(rim, (0, direction * y, height / 2), (25, 22, height - 57))
        front = direction * sign
        for z in (height / 3, height * 2 / 3):
            box(ribs, (-front * 8.5, direction * width / 2, z), (6, width - 47, 18))
        for z in (80, height - 80):
            rod(pins, (0, 0, z - 26), (0, 0, z + 26), 10, 16)
        cols, rows = (round(width / 60), 26) if srlib.DETAIL >= 0.75 else (6, 12) if srlib.DETAIL >= 0.35 else (3, 6)
        cw, ch = (width - 54) / cols, (height - 67) / rows
        for col in range(cols):
            y = direction * (27 + (col + 0.5) * cw)
            for row in range(rows):
                z = 33.5 + (row + 0.5) * ch
                x = front * 8.5
                y0, y1 = y - cw / 2 + 2, y + cw / 2 - 2
                z0, z1 = z - ch / 2 + 2, z + ch / 2 - 2
                cells.add(
                    [metres((x, y0, z0)), metres((x, y1, z0)), metres((x, y1, z1)), metres((x, y0, z1))],
                    [(0, 1, 2, 3) if front == 1 else (3, 2, 1, 0)],
                )
        for mesh, suffix, paint in (
            (skin, "Substrate", "back"),
            (rim, "Frame", "white"),
            (ribs, "BackBraces", "foil"),
            (pins, "HingePins", "alloy"),
            (cells, "CellStrings", "cells"),
        ):
            mesh.build(leaf.name + "_" + suffix, paints[paint], leaf, smooth=False)
        parent = leaf


def rendezvous(paints):
    """Optical targets and radio fittings as laid out in NASA's ASTP vehicle drawings."""
    targets = group("RendezvousTarget")
    brackets, plates, marks = (MeshBuilder() for _ in range(3))
    for az in (-43, 137):
        pose = frame(metres(polar(1124, az, 6250)), polar(0.95, az, 0.31))
        plates.lathe([(0.130, -0.012), (0.139, -0.004), (0.137, 0.010), (0, 0.010)], 48, matrix=pose)
        marks.box(metres((7, 176, 4)), pose @ Matrix.Translation(metres((0, 0, 14))))
        for side in (-1, 1):
            marks.box(metres((84, 7, 4)), pose @ Matrix.Translation(metres((side * 46, 0, 14))))
        for side in (-1, 1):
            brackets.tube(pose @ metres((side * 97, 0, -12)), pose @ metres((side * 135, 0, -97)), 0.013, 16)
    brackets.build("ASTP_BackupTargetsSupports", paints["alloy"], targets)
    plates.build("ASTP_BackupTargetsDiscs", paints["white"], targets)
    marks.build("ASTP_BackupTargetsReticles", paints["dark"], targets)
    primary = group("RendezvousTargetMast", targets)
    primary.location = metres((0, -650, 6690))
    stalk, head, detail = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for x in (-27, 27):
        rod(stalk, (x, 0, 0), (x * 0.58, 0, 502), 9, 14)
    for z in (78, 205, 335, 470):
        rod(stalk, (-20, 0, z), (20, 0, z), 7, 12)
    pole = frame(metres((0, -7, 507)), (0, 0.03, 1))
    head.lathe([(0.063, 0), (0.075, 0.011), (0.075, 0.024), (0, 0.024)], 36, matrix=pole)
    for x, y in ((0, -38), (0, 38), (-38, 0), (38, 0)):
        detail.disc(pole @ metres((x, y, 26)), (0, 0, 1), 0.008, 0.005, 14)
    stalk.build("ASTP_PrimaryTargetStalk", paints["foil"], primary)
    head.build("ASTP_PrimaryTargetFace", paints["white"], primary)
    detail.build("ASTP_PrimaryTargetMarks", paints["dark"], primary)

    radio = group("VhfAntennas")
    housings, ceramic, whips = (MeshBuilder() for _ in range(3))
    for az in (44, 210):
        foot = polar(994, az, 6211)
        root = polar(1101, az, 6312)
        tip = polar(1249, az, 7310)
        rod(housings, foot, root, 27, 22)
        insulator = tuple((a * 0.93 + b * 0.07) for a, b in zip(root, tip))
        rod(ceramic, root, insulator, 15, 24)
        rod(whips, insulator, tip, 5, 12)
    for az in (88, 268):
        base = frame(metres(polar(815, az, 6540)), polar(0.70, az, 0.71))
        surface(radio, f"ASTP_RendezvousBeacon_{az}", paints["white"], [(42, -27), (58, 0), (58, 29), (44, 43), (0, 43)], base, 32)
    housings.build("ASTP_VHFRadioSupports", paints["alloy"], radio)
    ceramic.build("ASTP_VHFInsulators", paints["white"], radio)
    whips.build("ASTP_VHFElements", paints["alloy"], radio)


def life_support(paints):
    """Illustrative pressure-management and ventilation fittings in the vacated couch bay."""
    equipment = group("LifeSupport", lineup_enclosed=True)
    if not interior():
        return equipment
    rack, cylinders, collars, lines = (MeshBuilder() for _ in range(4))
    for x in (425, 690):
        for y in (-310, 267):
            rod(rack, (x, y, 2480), (x, y, 2636), 20)
        rod(rack, (x, -368, 2636), (x, 329, 2636), 19)
    for y in (-300, 261):
        rod(rack, (383, y, 2648), (725, y, 2648), 16)
    for x, radius in ((467, 58), (624, 65)):
        cylinder = frame(metres((x, -312, 2743)), (0, 1, 0))
        cylinders.lathe(
            [
                (r * MM, z * MM)
                for r, z in (
                    (0, 0),
                    (radius - 21, 11),
                    (radius - 4, 43),
                    (radius, 76),
                    (radius, 459),
                    (radius - 13, 493),
                    (28, 518),
                )
            ],
            36,
            matrix=cylinder,
        )
        for y in (-165, 73):
            band = frame(metres((x, y, 2743)), (0, 1, 0))
            collars.lathe([(r * MM, z * MM) for r, z in ((radius - 2, -16), (radius + 5, -15), (radius + 5, 15), (radius - 2, 16))], 32, matrix=band)
            rod(rack, (x, y, 2648), (x, y, 2743 - radius), 14)
        rod(collars, (x, 204, 2743), (x, 238, 2743), 17, 20)
        path = [(x, 238, 2743), (x, 289, 2753), (x, 322, 2816), (x - 19, 298, 2867)]
        for a, b in zip(path, path[1:]):
            rod(lines, a, b, 10)
    box(rack, (544, 282, 2892), (255, 117, 71))
    for x in (476, 544, 612):
        pose = frame(metres((x, 217, 2894)), (0, -1, 0))
        collars.lathe([(0.023, 0), (0.023, 0.009), (0.018, 0.009)], 32, matrix=pose)
        lines.disc(pose @ metres((0, 0, 3)), (0, -1, 0), 0.017, 0.003, 32)
    rack.build("LifeSupport_FrameAndManifold", paints["alloy"], equipment)
    cylinders.build("LifeSupport_GasStorage", paints["white"], equipment)
    collars.build("LifeSupport_ValvesAndClamps", paints["foil"], equipment)
    lines.build("LifeSupport_LinesAndDials", paints["dark"], equipment)
    return equipment


def build() -> str:
    paints = soyuz_7kok.palette()
    paints.update(
        quilt=material("soyuz-astp-green-blanket", (0.058, 0.122, 0.091), roughness=0.86),
        tape=material("soyuz-astp-green-bindings", (0.104, 0.163, 0.116), roughness=0.76),
        fixture=material("soyuz-astp-test-fixture", (0.38, 0.40, 0.38), metallic=0.58, roughness=0.47),
    )
    service = soyuz_7kok.service(paints, aft_torus=False)
    soyuz_7kok.insulation(service, "ASTP_TransferFrameBlankets", [(1058, 1668), (1060, 1702), (1060, 1944), (1033, 2195), (1019, 2390)], paints, 16)
    surface(service, "ASTP_UpperRadiatorBand", paints["white"], [(1040, 2045), (1072, 2060), (1048, 2295), (1039, 2314), (1002, 2314)])
    soyuz_7kok.descent(paints)
    orbital_module(paints)
    apas(paints)
    rendezvous(paints)
    soyuz_7kok.infrared_vertical(paints)
    array("Left", -1, paints)
    array("Right", 1, paints)
    soyuz_cabin.build(
        COMMANDER,
        port=ENGINEER,
        hand_controls=True,
        seated_figure=sokol_k.build_seated,
        omitted_couch="Starboard",
        extra_equipment=lambda: life_support(paints),
    )
    launcher = soyuz_11a511.build(
        BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, exposed_tower=True, height=LAUNCH_HEIGHT, fairing_shoulder=APAS_FAIRING_SHOULDER
    )
    return f"{launcher}; {TEST_RING_TIP * MM:.3f} m aft end to test ring, {SOLAR_SPAN * MM:.3f} m across deployed arrays"


if __name__ == "__main__":
    mid = (soyuz_11a511.BASE_Z + LAUNCH_HEIGHT / 2) * MM
    run(
        "soyuz-16 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )
