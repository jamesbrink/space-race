"""Early 7K-OK(A) in launch configuration. Stations in mm from the aft end.
See the flight's spacecraft.md for the sources of the envelopes and the estimated fittings.
"""

import math

import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import MeshBuilder, bore, frame, group, mark_shells, material

MM = 0.001
BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION = -90, 5740  # degrees in the XY plane, mm above the spacecraft aft
DESCENT = [(500, 2320), (970, 2420), (1095, 2540), (1100, 2710), (1070, 2990), (985, 3400), (870, 3770), (695, 4080), (470, 4300), (380, 4480)]


def metres(p):
    return Vector(p) * MM


def polar(radius, degrees, z):
    angle = math.radians(degrees)
    return (radius * math.cos(angle), radius * math.sin(angle), z)


def surface(parent, name, paint, profile, transform=None, sides=96):
    mesh = MeshBuilder()
    mesh.lathe([(r * MM, z * MM) for r, z in profile], sides, matrix=transform)
    return mesh.build(name, paint, parent)


def rod(mesh, a, b, radius, sides=12):
    mesh.tube(metres(a), metres(b), radius * MM, sides)


def box(mesh, centre, size):
    mesh.box(metres(size), Matrix.Translation(metres(centre)))


def palette():
    return {
        "quilt": material("soyuz-green-glass-cloth", (0.095, 0.143, 0.084), roughness=0.88),
        "tape": material("soyuz-bound-seams", (0.15, 0.19, 0.118), roughness=0.78),
        "alloy": material("soyuz-machined-alloy", (0.58, 0.62, 0.63), 0.67, 0.32),
        "white": material("soyuz-radiator-enamel", (0.72, 0.73, 0.69), 0.18, 0.42),
        "dark": material("soyuz-seals", (0.038, 0.041, 0.039), 0.08, 0.72),
        "foil": material("soyuz-attachment-finish", (0.38, 0.31, 0.18), 0.55, 0.47),
        "glass": material("glass-soyuz-window", (0.14, 0.23, 0.27), 0.22, 0.14, alpha=0.30, double_sided=True),
        "cells": material("soyuz-silicon", (0.024, 0.041, 0.092), 0.37, 0.33),
        "back": material("soyuz-array-substrate", (0.23, 0.22, 0.19), 0.4, 0.50),
    }


def insulation(parent, name, profile, paints, panels):
    """Rounded stitched gores. Each bay rises gently off its seams, on the same mesh at every level."""
    mesh = MeshBuilder()
    slices = max(3, round(8 * srlib.DETAIL))
    angles = [math.tau * i / (slices * panels) for i in range(slices * panels)]
    rings = []
    for (ra, za), (rb, zb) in zip(profile, profile[1:]):
        for t in (0, 0.5):
            rings.append((ra + (rb - ra) * t, za + (zb - za) * t))
    rings.append(profile[-1])

    def quilt(angle, row):
        radius, z = rings[row]
        swell = (4 + 3 * (row % 2)) * math.sin(angle * panels / 2) ** 2
        radius = (radius - swell) * MM
        return (radius * math.cos(angle), radius * math.sin(angle), z * MM)

    mesh.grid(quilt, angles, range(len(rings)), closed_u=True)
    obj = mesh.build(name, paints["quilt"], parent)
    mark_shells([obj.name])
    return obj


def port(parent, skin, name, az, z, r, tilt, clear, paints, hatch=False):
    out = Vector(polar(math.cos(math.radians(tilt)), az, math.sin(math.radians(tilt))))
    base = frame(metres(polar(r, az, z)), out)
    bpy.context.view_layer.update()
    bore([skin.name], base, (clear + 10) * MM, 0.26)
    rim = surface(
        parent,
        name + "Ring",
        paints["alloy"],
        [(clear + 32, -46), (clear + 43, 7), (clear + 24, 17), (clear, 17), (clear, -46)],
        base,
        56,
    )
    pane = surface(parent, name + "Face", paints["tape" if hatch else "glass"], [(clear + 2, 5), (0, 5)], base, 56)
    bolts = MeshBuilder()
    for i in range(16 if hatch else 12):
        a = math.tau * i / (16 if hatch else 12)
        p = base @ metres(((clear + 12) * math.cos(a), (clear + 12) * math.sin(a), 18))
        bolts.disc(p, out, 0.005, 0.006)
    shells = [rim.name, pane.name]
    if bolts.verts:
        shells.append(bolts.build(name + "Bolts", paints["foil"], parent).name)
    if hatch:
        latch = MeshBuilder()
        for sign in (-1, 1):
            latch.box((0.15, 0.055, 0.042), base @ Matrix.Translation((0, sign * 0.25, 0.022)))
        shells.append(latch.build(name + "Dogs", paints["alloy"], parent).name)
    mark_shells(shells)


def cine_camera(parent, paints):
    """Dark-bodied camera seen in Soyuz 3's broadcast; dimensions and launch stowage are illustrative."""
    body, fittings, grip = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(body, (-620, 42, 5812), (122, 194, 132))
    box(body, (-626, 69, 5915), (94, 133, 73))
    box(body, (-669, -34, 5874), (38, 70, 64))
    lens = frame(metres((-620, -54, 5821)), (0, -1, 0))
    body.lathe([(0.044, 0), (0.046, 0.060), (0.052, 0.068), (0.054, 0.092), (0.043, 0.092), (0.043, 0.064)], 36, matrix=lens)
    fittings.lathe([(0.049, 0.018), (0.051, 0.020), (0.051, 0.035), (0.048, 0.040)], 32, matrix=lens)
    fittings.lathe([(0, 0.073), (0.040, 0.073)], 32, matrix=lens)
    for x in (-650, -594):
        rod(grip, (x, 103, 5966), (x, 162, 5966), 8)
    rod(grip, (-650, 162, 5966), (-594, 162, 5966), 8)
    # Fabric restraints lay over the camera bay for the launch display.
    grip.ribbon([metres(p) for p in ((-692, 67, 5741), (-674, 67, 5882), (-582, 67, 5882), (-550, 67, 5741))], (0, 1, 0), 0.022)
    body.build("BO_CineCamera", paints["dark"], parent)
    fittings.build("BO_CineCameraLens", paints["alloy"], parent)
    grip.build("BO_CineCameraRestraints", paints["back"], parent)


def orbit(paints, *, broadcast_room=False):
    module = group("OrbitalModule")
    # Two hemispheres on a 300 mm belt. Their ideal poles lie at 4480 and 6980.
    lower = [(1100 * math.cos(math.radians(a)), 5580 + 1100 * math.sin(math.radians(a))) for a in range(-70, 1, 5)]
    upper = [(1100 * math.cos(math.radians(a)), 5880 + 1100 * math.sin(math.radians(a))) for a in range(0, 46, 5)]
    skin = insulation(module, "BO_Gores", lower + upper, paints, 16)
    collar = surface(module, "BO_TransferNeck", paints["alloy"], [(369, 4455), (390, 4495), (384, 4552), (373, 4565)])
    mark_shells([collar.name])
    port(module, skin, "BO_SideHatch", BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, 1098, 0, 320, paints, hatch=True)
    for az in (20, 150):
        port(module, skin, "BO_Window" + str(az), az, 5940, 1095, 4, 110, paints)
    rails = MeshBuilder()
    for az in (-122, -59, 110):
        for z in (5420, 5910):
            rod(rails, polar(1035, az, z), polar(1155, az, z), 15)
        rod(rails, polar(1155, az, 5410), polar(1155, az, 5920), 14)
    mark_shells([rails.build("BO_Handholds", paints["alloy"], module).name])
    if srlib.interior():
        # Balashova's early cabin arrangement: a cushioned stowage bench opposite a sideboard.
        # These fit the cutaway's pressure volume; individual locker dimensions are reconstructed.
        bench, lockers, fronts, handles = (MeshBuilder() for _ in range(4))
        box(bench, (-618, 0, 5540), (400, 1020, 280))
        for y in (-318, 0, 318):
            box(bench, (-600, y, 5710), (390, 306, 50))
            box(lockers, (665, y, 5690), (325, 312, 740))
            for z in (5480, 5810):
                box(fronts, (494, y, z), (13, 285, 290))
                rod(handles, (478, y - 49, z + 55), (478, y + 49, z + 55), 9)
        bench.build("BO_StowageBench", paints["tape"], module)
        lockers.build("BO_Sideboard", paints["white"], module)
        # Beregovoy remembered a sideboard finished to resemble mahogany and a separate worktable.
        finish = material("soyuz-mahogany-finish", (0.23, 0.095, 0.047), roughness=0.61) if broadcast_room else paints["back"]
        fronts.build("BO_LockerFronts", finish, module)
        handles.build("BO_LockerPulls", paints["alloy"], module)
        if broadcast_room:
            desk = MeshBuilder()
            box(desk, (413, -390, 5390), (271, 330, 28))
            for y in (-525, -255):
                rod(desk, (522, y, 5240), (329, y, 5379), 13)
            desk.build("BO_Worktable", finish, module)
            cine_camera(module, paints)
    probe = group("DockingProbe")
    surface(probe, "SSVP_ClosedCompartment", paints["foil"], [(777, 6656), (773, 6690), (539, 6920), (548, 6952), (548, 6978), (0, 6978)])
    surface(probe, "SSVP_Face", paints["alloy"], [(537, 6968), (557, 6968), (557, 6980), (510, 6980), (510, 6970)])
    surface(
        probe,
        "SSVP_Probe",
        paints["alloy"],
        [(107, 6972), (107, 7040), (74, 7072), (58, 7082), (46, 7240), (31, 7250), (22, 7532), (37, 7552), (31, 7580), (8, 7600), (0, 7600)],
    )
    braces = MeshBuilder()
    for i in range(6):
        rod(braces, polar(340, i * 60, 6982), polar(85, i * 60, 7070), 12)
    braces.build("SSVP_ProbeStays", paints["foil"], probe)
    igla = group("Igla")
    boom = group("IglaBoom", igla)
    boom.location = metres((0, 1162, 5680))
    bearings = MeshBuilder()
    for x in (-70, 70):
        rod(bearings, (x, 1085, 5630), (x, 1162, 5680), 16)
    bearings.build("Igla_Bearings", paints["foil"], igla)
    aerial = MeshBuilder()

    # Tapered triangular lattice and receiver on the boom shown in the GCTC section.
    def corner(i, z):
        radius = 81 - 45 * z / 1000
        return polar(radius, 90 + 120 * (i % 3), z)

    for i in range(3):
        rod(aerial, corner(i, 0), corner(i, 1000), 10)
        for step in range(5):
            rod(aerial, corner(i, step * 200), corner(i + 1, (step + 1) * 200), 6)
        rod(aerial, corner(i, 1000), corner(i + 1, 1000), 8)
    aerial.build("Igla_Truss", paints["alloy"], boom)
    surface(boom, "Igla_AerialHead", paints["white"], [(38, 0), (100, 25), (108, 42), (88, 37), (24, 16)], frame(metres((0, 0, 995)), (0, 1, 0.24)))
    pins = MeshBuilder()
    rod(pins, (-80, -8, 0), (80, -8, 0), 26)
    pins.build("Igla_HingePin", paints["foil"], boom)


def rendezvous_lights(paints):
    """The upper steady and lower flashing pairs from Kamanin's 29 October 1968 diary."""
    node = group("RendezvousLights")
    housing, lens, mount = MeshBuilder(), MeshBuilder(), MeshBuilder()
    glazing = material("soyuz-signal-lens", (0.76, 0.72, 0.61), 0.08, 0.19)
    # Exact stations are unknown; all four need a direct line of sight from the target ahead.
    for az in (45, 135, 225, 315):
        axis = polar(0.28, az, 0.96)
        on_hull = metres(polar(880, az, 6570))
        face = frame(on_hull, axis)
        bracket = frame(on_hull, polar(0.85, az, 0.52))
        mount.box((0.144, 0.126, 0.066), bracket)
        housing.lathe([(0.047, -0.017), (0.057, 0), (0.053, 0.083), (0.050, 0.092), (0.042, 0.092)], 32, matrix=face)
        lens.lathe([(0.042, 0.088), (0.039, 0.099), (0.024, 0.103), (0, 0.105)], 28, matrix=face)
    mark_shells(
        [
            housing.build("BO_SignalLampBodies", paints["dark"], node).name,
            lens.build("BO_SignalLampLenses", glazing, node).name,
            mount.build("BO_SignalLampBrackets", paints["alloy"], node).name,
        ]
    )


def infrared_vertical(paints):
    """GCTC's 7K-OK cutaway callout 14. The short sideways housing is reproduced by eye."""
    node = group("InfraredVertical")
    sensor = frame(metres((0, -1050, 1230)), (0, -1, -0.16))
    surface(node, "PAO_InfraredVerticalMount", paints["white"], [(154, -28), (152, 6), (120, 49), (103, 54)], sensor, 36)
    surface(node, "PAO_InfraredVerticalHousing", paints["dark"], [(105, 52), (99, 75), (75, 228), (69, 239), (52, 239), (52, 215)], sensor, 36)
    optics = material("soyuz-infrared-optic", (0.19, 0.10, 0.072), 0.37, 0.2)
    surface(node, "PAO_InfraredVerticalOptic", optics, [(51, 219), (42, 225), (0, 226)], sensor, 36)


def descent(paints):
    node = group("DescentModule")
    skin = insulation(node, "SA_Insulation", DESCENT, paints, 15)
    shield = surface(node, "SA_Shield", paints["dark"], [(0, 2320), (490, 2320), (817, 2360), (980, 2410), (1020, 2450), (1014, 2470)])
    lip = surface(node, "SA_SeparationBand", paints["alloy"], [(1085, 2512), (1110, 2533), (1112, 2550), (1109, 2556)])
    crown = surface(node, "SA_TransferHatch", paints["alloy"], [(369, 4460), (386, 4470), (386, 4480), (0, 4480)])
    mark_shells([shield.name, lip.name, crown.name])
    for az in (0, 180):
        port(node, skin, "SA_Port" + str(az), az, 3400, 981, 12, 104, paints)
    # Oval covers for the two independent parachute containers on the shoulder.
    for az, wide in ((58, 240), (122, 181)):
        plane = frame(metres(polar(844, az, 3820)), polar(0.90, az, 0.44))
        plane = plane @ Matrix.Diagonal((1, 0.65, 1, 1))
        lid = surface(node, "SA_Parachute" + str(az), paints["tape"], [(wide + 24, -65), (wide + 24, 5), (wide, 17), (0, 19)], plane)
        mark_shells([lid.name])
    # Vzor: optical hood on the forward-facing side of the return capsule.
    base = frame(metres((0, -810, 3870)), (0, -0.91, 0.42))
    hood = surface(node, "SA_Vzor", paints["alloy"], [(125, -85), (130, 35), (96, 87), (96, 93), (74, 93), (74, 64), (0, 64)], base, 48)
    mark_shells([hood.name])


def service(paints):
    module = group("ServiceModule")
    surface(
        module, "PAO_AftSkirt", paints["quilt"], [(0, 181), (1300, 181), (1360, 223), (1360, 298), (1280, 408), (1040, 630), (1020, 660), (0, 660)]
    )
    surface(module, "PAO_Radiator", paints["white"], [(1025, 622), (1048, 650), (1048, 1635), (1037, 1660), (0, 1660)])
    fins = MeshBuilder()
    for i in range(64 if srlib.DETAIL >= 0.5 else 32):
        az = 360 * i / (64 if srlib.DETAIL >= 0.5 else 32)
        rod(fins, polar(1049, az, 665), polar(1049, az, 1620), 10, 8)
    fins.build("PAO_RadiatorFlutes", paints["white"], module)
    for i, z in enumerate((654, 1140, 1630)):
        surface(module, "PAO_Header" + str(i), paints["alloy"], [(1046, z - 12), (1076, z - 9), (1076, z + 9), (1047, z + 13)])
    surface(module, "PAO_EquipmentBelt", paints["tape"], [(1000, 1646), (1040, 1663), (1040, 1965), (960, 2000), (0, 2000)])
    struts = MeshBuilder()
    for i in range(12):
        az = i * 30
        rod(struts, polar(1006, az, 1950), polar(979, az + 13, 2433), 25)
        rod(struts, polar(980, az + 13, 2418), polar(1006, az + 30, 1962), 16)
    struts.build("PAO_AdapterTruss", paints["alloy"], module)
    # The early equipment torus wrapped around the central propulsion installation.
    torus = [(835 + 184 * math.cos(a * math.tau / 32), 240 + 177 * math.sin(a * math.tau / 32)) for a in range(33)]
    surface(module, "PAO_AftEquipmentTorus", paints["foil"], torus)
    # A single main outlet and the two smaller backup outlets, distinguished on the aft face.
    for i, (x, y, radius) in enumerate(((0, -180, 230), (-200, 200, 128), (200, 200, 128))):
        transform = Matrix.Translation(metres((x, y, 0)))
        bell = [(radius * f, z) for f, z in ((1, 0), (1, 8), (0.88, 48), (0.6, 135), (0.36, 216), (0.29, 214), (0.50, 130), (0.78, 50), (0.94, 3))]
        surface(module, "KTDU_Bell" + str(i), paints["dark"], bell, transform)
    fittings = MeshBuilder()
    for az in (45, 135, 225, 315):
        for shift in (-6, 6):
            p = polar(1210, az + shift, 335)
            out = polar(0.7, az + shift, -0.71)
            fittings.lathe([(0.025, 0), (0.035, 0.036), (0.041, 0.053), (0.033, 0.054), (0.021, 0.022)], 24, matrix=frame(metres(p), out))
    fittings.build("PAO_JetOutlets", paints["alloy"], module)


def wing(side, sign, paints):
    """Four estimated leaves per wing. Nested hinges are vertical and fold against the equipment section."""
    root = group("Solar" + side)
    parent = root
    width = 750
    height = 2140
    for index in range(4):
        hinge = group(f"Solar{side}Leaf{index + 1}", parent)
        direction = 1 if index % 2 == 0 else -1
        hinge.location = metres((sign * 1185, -375, 420) if index == 0 else (sign * 45, -direction * width, 0))
        frame_mesh, cells, backing, ribs = (MeshBuilder() for _ in range(4))
        box(backing, (0, direction * width / 2, height / 2), (16, width - 12, height - 16))
        for z in (25, height - 25):
            box(frame_mesh, (0, direction * width / 2, z), (25, width - 4, 26))
        for y in (15, width - 15):
            box(frame_mesh, (0, direction * y, height / 2), (28, 18, height - 96))
        for z in (height / 3, 2 * height / 3):
            box(ribs, (-sign * 11, direction * width / 2, z), (8, width - 45, 18))
        # The near level resolves individual strings, grouped into larger fields at gallery distance.
        cols, rows = (12, 32) if srlib.DETAIL >= 0.75 else (4, 10) if srlib.DETAIL >= 0.35 else (2, 4)
        cw, ch = (width - 50) / cols, (height - 90) / rows
        face = sign * direction
        for col in range(cols):
            for row in range(rows):
                y = direction * (25 + (col + 0.5) * cw)
                z = 45 + (row + 0.5) * ch
                # A cell has one visible face; its substrate carries the back.
                x = face * 10 * MM
                y0, y1 = (y - cw / 2 + 1.8) * MM, (y + cw / 2 - 1.8) * MM
                z0, z1 = (z - ch / 2 + 2) * MM, (z + ch / 2 - 2) * MM
                cells.add([(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)], [(0, 1, 2, 3) if face == 1 else (3, 2, 1, 0)])
        for mesh, suffix, paint in ((frame_mesh, "Frame", "alloy"), (cells, "Cells", "cells"), (backing, "Backing", "back"), (ribs, "Ribs", "foil")):
            mesh.build(hinge.name + suffix, paints[paint], hinge, smooth=False)
        parent = hinge
    # Grahn's early ship illustration: a U-shaped telemetry aerial at the aft tip and
    # a long shortwave element pointing forward. The nested slide illustrates payout.
    ends = MeshBuilder()
    for y in (-716, -550):
        rod(ends, (sign * 18, y, 25), (sign * 18, y, -108), 7)
    rod(ends, (sign * 18, -716, -108), (sign * 18, -550, -108), 7)
    rod(ends, (sign * 24, -704, 95), (sign * 24, -704, height - 10), 13)
    ends.build("Solar" + side + "AntennaMounts", paints["alloy"], parent)
    whip = group("Solar" + side + "Whip", parent)
    mast = MeshBuilder()
    rod(mast, (sign * 24, -704, 165), (sign * 24, -704, height + 8), 6)
    mast.build("Solar" + side + "ShortwaveElement", paints["alloy"], whip)
    yoke = MeshBuilder()
    for z in (790, 1940):
        rod(yoke, (sign * 995, 0, z), (sign * 1185, -375, z + 80), 28)
        rod(yoke, (sign * 980, -240, z + 250), (sign * 1185, -375, z + 80), 18)
    yoke.build("Solar" + side + "Yoke", paints["alloy"], root)


def build(pilot=None, *, october_1968=False):
    import soyuz_cabin

    paints = palette()
    service(paints)
    descent(paints)
    orbit(paints, broadcast_room=october_1968)
    if october_1968:
        rendezvous_lights(paints)
        infrared_vertical(paints)
    wing("Left", -1, paints)
    wing("Right", 1, paints)
    soyuz_cabin.build(pilot, hand_controls=october_1968)
    return "7.600 m aft end to probe tip, 6.980 m body, 2.720 m aft skirt"
