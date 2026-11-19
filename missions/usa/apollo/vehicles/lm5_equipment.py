"""Eagle's landing equipment, in inches above the deployed pad plane. See lm-5.md."""

import math

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, frame, group, interior, mark_shells, prof


def point(x, y, z):
    return Vector((x, y, z)) * IN


def box(mesh, centre, size):
    mesh.box(point(*size), Matrix.Translation(point(*centre)))


def tube(mesh, a, b, radius):
    mesh.tube(point(*a), point(*b), radius * IN, segs=12)


def ladder(hinge, silver, dark, prefix="LM5", *, flag_on_ladder=True):
    """The tube and covered plaque travel with the ladder. AS11-40-5900."""
    carrier, straps, cover = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # Coordinates relative to the +X deployment hinge. Brackets sit by the left rail.
    if flag_on_ladder:
        a, b = (18, -9.6, -23), (39, -9.6, -67)
        tube(carrier, a, b, 1.8)
        for t in (0.14, 0.85):
            x, y, z = (lo + t * (hi - lo) for lo, hi in zip(a, b))
            tube(straps, (x, y, z), (x, -6.9, z), 1.0)
        carrier.build(f"{prefix}_FlagContainer", silver, group("FlagKit", hinge))
        straps.build(f"{prefix}_FlagBrackets", dark, hinge)
    # A thin curved cover around the primary strut, behind the rungs.
    for j in range(8):
        angles = [math.radians(45 + 90 * k / 8) for k in (j, j + 1)]
        verts = [point(x + 4 * math.sin(a), 6 * math.cos(a), z) for x, z in [(30, -65), (36, -77)] for a in angles]
        cover.add(verts, [(0, 1, 3, 2)])
    cover.build(f"{prefix}_PlaqueCover", silver, group("CommemorativePlaque", hinge), smooth=False)


def deflectors(parent, alloy, dark, prefix="LM5"):
    """Four truss-mounted shields beneath the downward jets, AS11-44-6574 and Grumman LV-9."""
    for sx, sy in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
        radial = Vector((sx, sy, 0)).normalized()
        tangent = Vector((-sy, sx, 0)).normalized()

        def vertex(r, w, z):
            return radial * r + tangent * w + Vector((0, 0, z))

        sheet, stays = MeshBuilder(), MeshBuilder()
        rows = [(88, 7, 155), (94, 11, 151), (103, 11, 141), (109, 8, 132)]
        for side in (-1, 1):
            for (r0, w0, z0), (r1, w1, z1) in zip(rows, rows[1:]):
                sheet.add(
                    [vertex(r0, 0, z0) * IN, vertex(r1, 0, z1) * IN, vertex(r1, side * w1, z1 + 1.8) * IN, vertex(r0, side * w0, z0 + 1.8) * IN],
                    [(0, 1, 2, 3)],
                )
            for anchor in ((80, side * 14, 121), (79, side * 17, 105)):
                tube(stays, vertex(*anchor), vertex(95, side * (7 if anchor[2] == 121 else 10), 149), 0.53)
        sheet.build(f"{prefix}_PlumeShield_{sx}_{sy}", dark, parent, smooth=False)
        stays.build(f"{prefix}_PlumeTruss_{sx}_{sy}", alloy, parent)


def mesa_contents(bay, alloy, ivory, dark):
    """Westinghouse camera on its carrier and the two strapped-in sample return containers."""
    camera, lens, bracket = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # Westinghouse body, Apollo 11 press kit p. 77. Bracket geometry is estimated.
    box(camera, (-12, 8, 105), (10.6, 6.5, 3.4))
    lens.lathe(prof([(1.35, 0), (1.35, 0.9), (1.06, 1.1), (1.06, 2.5), (0, 2.5)]), 24, matrix=frame(point(-6.65, 8, 105), (1, 0, 0)))
    for x in (-16, -8):
        tube(bracket, (x, 14, 115), (x, 8, 103), 0.45)
        tube(bracket, (x, 8, 103), (x, 5, 115), 0.38)
    box(bracket, (-12, 8, 103.15), (9.6, 6.0, 0.6))
    camera.build("LM5_LunarTVBody", ivory, bay)
    lens.build("LM5_LunarTVLens", dark, bay)
    bracket.build("LM5_TVCameraCarrier", alloy, bay)

    sample_cases(bay, alloy, dark)


def sample_cases(bay, alloy, dark, prefix="LM5", stations=((-12, 75), (12, 75))):
    cases, lids, hardware, seals = (MeshBuilder() for _ in range(4))
    for x, z in stations:
        # Two hinged lids with the two latches on their forward edge, S69-31076/31080.
        box(cases, (x, 9, z), (18, 11.5, 11))
        box(seals, (x, 9, z + 5.65), (17.85, 11.35, 0.6))
        box(lids, (x, 9, z + 6.46), (18.2, 11.7, 1.32))
        for dx in (-6, 6):
            tube(hardware, (x + dx - 1, 14.85, z + 5.8), (x + dx + 1, 14.85, z + 5.8), 0.45)
            box(hardware, (x + dx, 2.95, z + 5), (1.3, 0.44, 2.0))
            tube(hardware, (x + dx - 0.7, 2.65, z + 4.25), (x + dx + 0.7, 2.65, z + 4.25), 0.23)
        for dx in (-2.8, 2.8):
            tube(hardware, (x + dx, 3.25, z + 1.6), (x + dx, 2.0, z + 0.7), 0.32)
        tube(hardware, (x - 2.8, 2.0, z + 0.7), (x + 2.8, 2.0, z + 0.7), 0.33)
    sample = group("SampleContainers", bay)
    cases.build(f"{prefix}_SampleReturnBoxes", alloy, sample)
    lids.build(f"{prefix}_ContainerLids", alloy, sample)
    seals.build(f"{prefix}_ContainerLidSeals", dark, sample)
    hardware.build(f"{prefix}_ContainerFittings", alloy, sample)


def science_contents(bay, alloy, ivory, dark):
    """Facing the bay: seismic left, reflector right. Press kit pp. 146, 148, 150; AS11-40-5927."""
    seismic, reflector = group("SeismicPackage", bay), group("ReflectorPackage", bay)
    seismic.location = point(-12.5, 10, 69.5)
    reflector.location = point(12.5, 10, 69.5)
    for pallet in (seismic, reflector):
        rails = MeshBuilder()
        box(rails, (0, 0, 0.85), (21.5, 17, 1.7))
        for x in (-10.1, 10.1):
            box(rails, (x, 0, 2.1), (0.8, 16.3, 1.2))
            tube(rails, (x, -8.2, 2), (x, -8.2, 4.5), 0.47)
        rails.build(f"LM5_{pallet.name}Pallet", alloy, pallet)
    sensor, folded, panels, framebars = (MeshBuilder() for _ in range(4))
    sensor.lathe(prof([(0, 2.2), (5.4, 2.2), (6.25, 4.1), (6.25, 16.5), (5.8, 17.8), (4.3, 19.3), (0, 19.7)]), 28)
    for side in (-1, 1):
        box(folded, (side * 8.0, 0, 10.5), (0.55, 15.4, 16.4))
        for y in (-7.6, 7.6):
            box(framebars, (side * 8.0, y, 11), (0.9, 0.65, 17))
        for y in (-3.8, 3.8):
            box(panels, (side * 8.6, y, 10.7), (0.13, 7.25, 15))
        tube(framebars, (side * 6.2, -7.6, 2.6), (side * 6.2, -7.6, 16), 0.45)
    tube(framebars, (-2.0, -7.6, 2.5), (-2.0, -7.6, 17.8), 0.34)
    sensor.build("LM5_PassiveSeismicPackage", ivory, seismic)
    folded.build("LM5_FoldedSolarWings", alloy, seismic)
    panels.build("LM5_FoldedSolarPanelFaces", dark, seismic)
    framebars.build("LM5_SeismicPanelFrames", alloy, seismic)

    tray, cover, fittings = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(tray, (0, 0, 5.8), (18.1, 14.8, 4.0))
    box(cover, (0, 0, 7.96), (17.9, 14.6, 0.6))
    for x in (-8.1, 8.1):
        tube(fittings, (x, 6.5, 2.0), (x, 6.5, 16.7), 0.44)
        tube(fittings, (x, 6.5, 16.7), (x * 0.82, 6.5, 18.4), 0.44)
        tube(fittings, (x, -5.7, 2.2), (x, -4.8, 4.4), 0.70)
    tube(fittings, (-6.64, 6.5, 18.4), (6.64, 6.5, 18.4), 0.44)
    tube(fittings, (0, -8.2, 2.0), (0, -7.6, 13.5), 0.48)
    tube(fittings, (0, -7.6, 13.5), (-2.4, -7.6, 13.5), 0.54)
    tray.build("LM5_RetroreflectorPackage", alloy, reflector)
    cover.build("LM5_ReflectorCover", ivory, reflector)
    fittings.build("LM5_ReflectorAlignmentHardware", alloy, reflector)


def surface_bays(mesa, science, skin, alloy, amber, dark, ivory, *, mesa_load=mesa_contents, prefix="LM5"):
    # Quad IV faces forward/right in the LM axes, Quad II diagonally opposite.
    # Local x is along each bay face; y runs into the bay. The cabinet envelopes
    # and supports are estimated from the closed and open mission photographs.
    for owner, sign in ((mesa, 1), (science, -1)):
        if owner is None:
            continue
        bay = group(f"{prefix}_QuadIV" if sign == 1 else f"{prefix}_QuadII", owner)
        bay.location = point(sign * 58.5, -sign * 58.5, 0)
        bay.rotation_euler.z = math.radians(45 if sign == 1 else 225)
        closure = group(f"{prefix}_MESAClosure" if sign == 1 else f"{prefix}_SEQClosure", skin)
        closure.location = bay.location
        closure.rotation_euler = bay.rotation_euler
        framebars, door = MeshBuilder(), MeshBuilder()
        for x in (-27, 27):
            tube(framebars, (x, 1.2, 66), (x, 1.2, 117), 0.85)
            box(framebars, (x, 5.1, 91.5), (1.1, 5, 46))
        for z in (66, 117):
            tube(framebars, (-27, 1.2, z), (27, 1.2, z), 0.85)
        # MESA's flag is already on the outer wrap. Its rack sits inside.
        # AS11-40-5927: the left door swung on vertical hinges; the right door lifted.
        for x in (-13.4, 13.4):
            box(door, (x, -0.12, 92), (26.3, 0.4, 48))
        mark_shells([door.build(f"{owner.name}_BlanketDoors", amber if sign == -1 else dark, closure).name])
        if sign == -1:
            hinges = MeshBuilder()
            for z in (74, 108):
                tube(hinges, (-26.9, -0.45, z - 1.4), (-26.9, -0.45, z + 1.4), 0.42)
            for x in (6.0, 21.5):
                tube(hinges, (x - 1.4, -0.45, 116.3), (x + 1.4, -0.45, 116.3), 0.42)
            mark_shells([hinges.build("LM5_SEQDoorHinges", alloy, closure).name])
            tube(framebars, (0, 2, 66), (0, 2, 117), 0.65)
        if not interior():
            framebars.build(f"{owner.name}_Frame", alloy, bay)
            continue
        rack = framebars
        for z in (69, 115.2):
            box(rack, (0, 10, z), (51, 17, 0.9))
        for x in (-24, 24):
            tube(rack, (x, 16, 69), (x, 16, 113), 0.85)
        rack.build(f"{owner.name}_Rack", alloy, bay)
        if sign == 1:
            mesa_load(bay, alloy, ivory, dark)
        else:
            science_contents(bay, alloy, ivory, dark)


def pilot_camera(parent, alloy, dark, ivory):
    """Maurer 16-mm camera at Aldrin's forward window. AS11-36-5389. Envelope estimated."""
    if not interior():
        return
    camera = group("LM5_PilotWindowCamera", parent)
    camera.location = point(68, -32, 202)
    body, magazine, mount, lens = (MeshBuilder() for _ in range(4))
    box(body, (-1.7, 0, 0), (4.8, 2.6, 3.1))
    box(magazine, (-2.2, 0, 2.75), (5.9, 2.55, 2.25))
    for y in (-1.7, 1.7):
        tube(mount, (-2, y, -1), (-2, y, -3.1), 0.22)
    tube(mount, (-2, -1.7, -3), (3, -4.8, -4), 0.30)
    lens.lathe(prof([(0.72, 0), (0.72, 0.8), (0.60, 0.92), (0.60, 2.1), (0, 2.1)]), 24, matrix=frame(point(0.76, 0, 0), (1, 0, -0.20)))
    body.build("LM5_DataCameraBody", alloy, camera)
    magazine.build("LM5_FilmMagazine", ivory, camera)
    mount.build("LM5_CameraBracket", dark, camera)
    lens.build("LM5_DataCameraLens", dark, camera)
