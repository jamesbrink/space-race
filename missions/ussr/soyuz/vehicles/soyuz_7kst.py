"""Soyuz-T (7K-ST) exterior after Portree Fig. 1-28 and Vasilyev Figs. 2 and 5, in millimetres."""

import math

import bpy
from mathutils import Matrix

import soyuz_7kok
import soyuz_station
import srlib
from soyuz_7kok import BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, box, metres, polar, rod, surface
from srlib import MeshBuilder, frame, group, interior, mark_shells

LENGTH = 6980  # NASA RP-1357, §1.12.1; taken to include the probe.
SOLAR_SPAN = 10600  # NASA RP-1357, §1.12.1.
SERVICE_RADIUS = 1360  # Half the maximum diameter in the same table.
WING_ROOT = 1160
LEAF_SPAN = (SOLAR_SPAN / 2 - WING_ROOT) / 4
WING_CHORD = 1290  # Visual reconstruction from Vasilyev Fig. 2.


def orbital_module(paints):
    module = group("OrbitalModule")
    profile = [
        (378, 4530),
        (550, 4595),
        (738, 4732),
        (898, 4910),
        (1010, 5140),
        (1076, 5390),
        (1100, 5615),
        (1099, 5750),
        (1084, 5930),
        (1034, 6080),
        (945, 6225),
        (818, 6335),
        (647, 6437),
        (530, 6463),
        (500, 6510),
    ]
    skin = soyuz_7kok.insulation(module, "SoyuzT_BO_Blankets", profile, paints, 18)
    neck = surface(module, "SoyuzT_TransferNeck", paints["alloy"], [(367, 4455), (390, 4496), (380, 4535), (402, 4550)])
    cuff = surface(module, "SoyuzT_BO_Tunnel", paints["tape"], [(492, 6496), (513, 6515), (511, 6553), (486, 6570)])
    mark_shells([neck.name, cuff.name])
    soyuz_7kok.port(module, skin, "SoyuzT_BO_Hatch", BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, 1098, 0, 320, paints, hatch=True)
    soyuz_7kok.port(module, skin, "SoyuzT_BO_Window", 34, 6075, 1031, 21, 102, paints)

    # The same internal-transfer probe and its collar sit on the shorter T-series room.
    soyuz_station.docking_unit(paints)
    for name in ("DockingCollar", "DockingProbe"):
        bpy.data.objects[name].location.z += (LENGTH - soyuz_station.PROBE_TIP) * soyuz_7kok.MM

    stalk, heads, traces = (MeshBuilder() for _ in range(3))
    for az in (30, 147, 239):
        start = polar(776, az, 6387)
        end = polar(922, az, 6575)
        rod(stalk, start, end, 12, 14)
        rod(stalk, polar(823, az - 6, 6345), end, 9)
        pose = frame(metres(end), (0, 0, 1))
        heads.lathe([(0.022, 0), (0.049, 0.025), (0.054, 0.054), (0.041, 0.058), (0, 0.058)], 32, matrix=pose)
        rod(traces, polar(765, az, 6440), polar(945, az, 6651), 4, 8)
    # Small off-axis approach-system reflector, seen next to the pressure tunnel in both references.
    tip = polar(1055, 203, 6620)
    rod(stalk, polar(650, 203, 6430), polar(877, 203, 6600), 16)
    rod(stalk, polar(877, 203, 6600), tip, 12)
    heads.lathe(
        [(0.039, -0.029), (0.086, -0.012), (0.101, 0.018), (0.098, 0.023), (0.05, 0.008), (0, 0.002)],
        44,
        matrix=frame(metres(tip), (-0.09, -0.12, 0.99)),
    )
    for mesh, name, paint in ((stalk, "Supports", "alloy"), (heads, "Reflectors", "white"), (traces, "Elements", "foil")):
        mesh.build("SoyuzT_ForwardAerial" + name, paints[paint], module)

    if interior():
        lockers, faces, pulls = (MeshBuilder() for _ in range(3))
        for x in (-1, 1):
            box(lockers, (685 * x, 5, 5540), (329, 975, 410))
            for y in (-308, 0, 308):
                box(faces, (516 * x, y, 5540), (8, 270, 371))
                rod(pulls, (491 * x, y - 54, 5640), (491 * x, y + 54, 5640), 9)
        lockers.build("SoyuzT_BO_Lockers", paints["white"], module)
        faces.build("SoyuzT_BO_LockerDoors", paints["back"], module)
        pulls.build("SoyuzT_BO_LockerPulls", paints["alloy"], module)


def igla(paints):
    node = group("Igla")
    boom = group("IglaBoom", node)
    boom.location = metres((0, 1080, 5555))
    mounts, truss, head, wiring = (MeshBuilder() for _ in range(4))
    for x in (-78, 78):
        rod(mounts, (x, 1068, 5465), (x, 1095, 5555), 22, 18)
    rod(truss, (-104, 12, 0), (104, 12, 0), 23, 24)

    def corner(index, z):
        return polar(90 - 53 * z / 1540, 90 + 120 * (index % 3), -z)

    for side in range(3):
        rod(truss, corner(side, 16), corner(side, 1534), 10)
        for z in range(30, 1281, 250):
            rod(truss, corner(side, z), corner(side + 1, z + 250), 7)
    end = frame(metres((0, 21, -1544)), (0, -0.36, -0.93))
    head.lathe([(0.034, -0.018), (0.056, 0), (0.109, 0.018), (0.117, 0.034), (0.11, 0.039), (0.071, 0.020), (0, 0.012)], 52, matrix=end)
    rod(wiring, (0, 0, -92), (0, 0, -1530), 5, 12)
    wiring.disc(end @ metres((0, 0, 35)), end.to_3x3() @ metres((0, 0, 1)), 0.014, 0.014, 24)
    mounts.build("SoyuzT_IglaHinge", paints["foil"], node)
    truss.build("SoyuzT_IglaTruss", paints["alloy"], boom)
    head.build("SoyuzT_IglaReflector", paints["white"], boom)
    wiring.build("SoyuzT_IglaCablingAndFeed", paints["dark"], boom)


def service_module(paints):
    module = group("ServiceModule")
    insulation = [(1360, 210), (1360, 260), (1327, 345), (1164, 462), (1045, 555)]
    soyuz_7kok.insulation(module, "SoyuzT_PAOSkirt", insulation, paints, 18)
    surface(module, "SoyuzT_PAORim", paints["alloy"], [(1309, 148), (1345, 149), (1360, 164), (1360, 208)])
    surface(module, "SoyuzT_Radiator", paints["white"], [(1044, 560), (1060, 620), (1060, 1638), (1047, 1682), (1021, 1682)])
    soyuz_7kok.insulation(module, "SoyuzT_InstrumentSection", [(1060, 1685), (1066, 1730), (1072, 1960), (1090, 2255), (1080, 2454)], paints, 16)
    surface(module, "SoyuzT_PAOHousingCrown", paints["tape"], [(1080, 2457), (1084, 2462), (1082, 2476), (1012, 2482)])
    # The cabin separates here, leaving the sealed instrument bay's bulkhead visible.
    surface(module, "SoyuzT_InstrumentBulkhead", paints["alloy"], [(1081, 2442), (1012, 2412), (885, 2378), (618, 2352), (0, 2352)])
    surface(module, "SoyuzT_InstrumentAccessPlate", paints["tape"], [(359, 2351), (352, 2360), (318, 2365), (0, 2365)], sides=64)
    blocks, pins = MeshBuilder(), MeshBuilder()
    for az in (18, 108, 198, 288):
        pose = Matrix.Translation(metres(polar(758, az, 2376))) @ Matrix.Rotation(math.radians(az), 4, "Z")
        blocks.box(metres((125, 160, 22)), pose)
        for offset in (-37, 37):
            plug = pose @ Matrix.Translation(metres((0, offset, 14)))
            pins.lathe([(0.021, 0), (0.024, 0.006), (0.023, 0.019), (0.015, 0.023), (0, 0.023)], 20, matrix=plug)
    blocks.build("SoyuzT_BulkheadMounts", paints["back"], module)
    pins.build("SoyuzT_BulkheadConnectors", paints["foil"], module)
    fins, rails, clamps = (MeshBuilder() for _ in range(3))
    count = 72 if srlib.DETAIL >= 0.5 else 36
    for i in range(count):
        az = i * 360 / count
        rod(fins, polar(1062, az, 642), polar(1062, az, 1118), 9, 8)
        rod(fins, polar(1062, az, 1150), polar(1062, az, 1623), 9, 8)
    for z in (626, 1134, 1640):
        surface(module, f"SoyuzT_RadiatorHeader{z}", paints["alloy"], [(1057, z - 13), (1076, z - 10), (1076, z + 10), (1060, z + 14)])
    for az in range(18, 360, 30):
        rod(rails, polar(1078, az, 1676), polar(1100, az, 2384), 17, 14)
        pose = frame(metres(polar(1090, az, 2250)), polar(1, az, 0))
        clamps.box(metres((65, 94, 35)), pose)
    for az in (85, 263):
        tip = polar(1352, az, 488)
        rod(rails, polar(1255, az, 392), tip, 15, 22)
        pose = frame(metres(tip), polar(0.95, az, -0.31))
        clamps.lathe([(0.032, -0.012), (0.045, 0), (0.053, 0.026), (0.034, 0.038), (0, 0.035)], 24, matrix=pose)
    fins.build("SoyuzT_RadiatorChannels", paints["white"], module)
    rails.build("SoyuzT_ServiceFittings", paints["foil"], module)
    clamps.build("SoyuzT_ServiceBrackets", paints["alloy"], module)
    propulsion(paints)


def propulsion(paints):
    """Single main chamber, perimeter DPO outlets and plumbing visible in Vasilyev figs. 2 and 5."""
    pod = group("CombinedPropulsion")
    surface(pod, "KTDU426_AftDeck", paints["alloy"], [(424, 327), (1140, 326), (1292, 229), (1308, 154)])
    surface(pod, "KTDU426_EngineMount", paints["alloy"], [(155, 241), (222, 244), (259, 275), (256, 322), (424, 322)])
    bell_profile = [
        (240, 0),
        (247, 7),
        (246, 19),
        (217, 52),
        (159, 131),
        (110, 228),
        (156, 262),
        (130, 259),
        (91, 225),
        (143, 127),
        (202, 49),
        (231, 8),
        (233, 0),
    ]
    surface(pod, "KTDU426_MainBell", paints["dark"], bell_profile, sides=88)
    surface(pod, "KTDU426_NozzleLiner", paints["foil"], [(229, 20), (198, 58), (150, 126), (103, 212), (81, 251), (0, 251)], sides=72)
    spheres, rails, lines, fittings, jets = (MeshBuilder() for _ in range(5))
    for az in (0, 90, 180, 270):
        # Four external spheres in the cutaway of the propulsion unit; sizes read by eye.
        pose = frame(metres(polar(889, az, 243)), (0, 0, 1))
        profile = [(math.sin(math.pi * i / 18) * 0.188, -0.202 * math.cos(math.pi * i / 18)) for i in range(19)]
        spheres.lathe(profile, 36, matrix=pose)
        rails.lathe([(0.182, -0.033), (0.194, -0.027), (0.194, 0.026), (0.182, 0.033)], 36, matrix=pose)
        rod(rails, polar(1040, az - 4, 226), polar(1129, az - 10, 308), 16, 14)
        for shift in (-1, 1):
            path = [
                polar(882, az + 4 * shift, 109),
                polar(756, az + 12 * shift, 125),
                polar(642, az + 16 * shift, 185),
                polar(430, az + 19 * shift, 208),
                polar(290, az + 20 * shift, 256),
            ]
            for a, b in zip(path, path[1:]):
                rod(lines, a, b, 8.5, 12)
            fittings.disc(metres(path[0]), (0, 0, -1), 0.024, 0.020, 18)
    for az in (45, 135, 225, 315):
        pose = frame(metres(polar(1261, az, 245)), polar(0.84, az, -0.54))
        fittings.box(metres((153, 173, 84)), pose)
        for tangent, radial, axial in ((-42, 43, 0), (42, -43, 0), (0, 0, -57)):
            local = pose @ Matrix.Translation(metres((tangent, radial, 35)))
            local @= Matrix.Rotation(math.radians(axial), 4, "X")
            jets.lathe([(0.027, -0.008), (0.033, 0.027), (0.045, 0.052), (0.041, 0.059), (0.033, 0.053), (0.021, 0.015)], 24, matrix=local)
    for mesh, label, paint in (
        (spheres, "PressurantSpheres", "white"),
        (rails, "SphereBandsAndBrackets", "alloy"),
        (lines, "PropellantLines", "foil"),
        (fittings, "ManifoldsAndJetMounts", "alloy"),
        (jets, "DPOOutlets", "dark"),
    ):
        mesh.build(f"KTDU426_{label}", paints[paint], pod)


def solar_array(side, sign, paints):
    root = group(f"Solar{side}")
    parent = root
    root_y, root_z = -LEAF_SPAN / 2, 728
    yoke, cables = MeshBuilder(), MeshBuilder()
    for z in (834, 1842):
        rod(yoke, (sign * 1027, 0, z), (sign * WING_ROOT, root_y, z), 23)
        rod(yoke, (sign * 1030, -256, z + 100), (sign * WING_ROOT, root_y, z), 14)
        rod(cables, (sign * 1064, -155, z + 35), (sign * WING_ROOT, root_y, z + 33), 8)
    yoke.build(f"Solar{side}_RootYoke", paints["alloy"], root)
    cables.build(f"Solar{side}_Cabling", paints["dark"], root)

    for index in range(4):
        direction = (-1) ** index
        leaf = group(f"Solar{side}Leaf{index + 1}", parent)
        leaf.location = metres((sign * WING_ROOT, root_y, root_z) if index == 0 else (sign * 36, -direction * LEAF_SPAN, 0))
        skin, rim, cells, ribs, hinges = (MeshBuilder() for _ in range(5))
        span, chord = LEAF_SPAN, WING_CHORD
        box(skin, (0, direction * span / 2, chord / 2), (12, span - 16, chord - 28))
        for z in (15, chord - 15):
            box(rim, (0, direction * span / 2, z), (24, span - 7, 24))
        for y in (13, span - 13):
            box(rim, (0, direction * y, chord / 2), (24, 23, chord - 56))
        front = direction * sign
        for z in (chord / 3, chord * 2 / 3):
            box(ribs, (-front * 9, direction * span / 2, z), (6, span - 53, 18))
        for z in (62, chord - 62):
            rod(hinges, (0, 0, z - 25), (0, 0, z + 25), 10, 16)
        cols, rows = (17, 21) if srlib.DETAIL >= 0.75 else (6, 9) if srlib.DETAIL >= 0.35 else (3, 5)
        w, h = (span - 56) / cols, (chord - 66) / rows
        for col in range(cols):
            y = direction * (28 + (col + 0.5) * w)
            for row in range(rows):
                z = 33 + (row + 0.5) * h
                x, y0, y1 = front * 8.8, y - w / 2 + 2, y + w / 2 - 2
                z0, z1 = z - h / 2 + 2, z + h / 2 - 2
                cells.add([metres(p) for p in ((x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1))], [(0, 1, 2, 3) if front > 0 else (3, 2, 1, 0)])
        if index == 3:
            for z in (60, chord - 60):
                rod(hinges, (0, -span + 68, z), (0, -span + 5, z), 12)
                rod(hinges, (-26, -span + 14, z), (26, -span + 14, z), 5)
        for mesh, label, paint in (
            (skin, "Substrate", "back"),
            (rim, "Frame", "alloy"),
            (ribs, "BackBraces", "foil"),
            (hinges, "Hinges", "foil"),
            (cells, "CellStrings", "cells"),
        ):
            mesh.build(f"{leaf.name}_{label}", paints[paint], leaf, smooth=False)
        parent = leaf
