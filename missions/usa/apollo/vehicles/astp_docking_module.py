"""ASTP DM-2 in its launch cradle (JSC-10607 appendix A; press kit pp. 76–83)."""

import math

from mathutils import Matrix, Vector

from srlib import IN, TAU, MeshBuilder, group, interior, lathe_obj, mark_shells, material

# The contemporary launch schematic places the Soyuz end over the SLA support truss.
# The truss height is read from the illustration; the interface-to-interface span is documented.
SOYUZ_END = 1747 * IN
APOLLO_END = SOYUZ_END + 3.15
BORE = 1.42 / 2
WALL = 0.0158
OUTSIDE = BORE + WALL
BARREL_AFT = SOYUZ_END + 0.26
CONE_START = APOLLO_END - 0.84
TUNNEL = 0.41


def at(radius, angle, z):
    return Vector((radius * math.cos(angle), radius * math.sin(angle), z))


def box(mesh, dimensions, radius, angle, z):
    pose = Matrix.Translation(at(radius, angle, z)) @ Matrix.Rotation(angle, 4, "Z")
    mesh.box(dimensions, pose)


def hatch(mesh, handles, z, direction):
    # Both pressure doors open into DM-2. Each carries a central latch drive and relief valve.
    mesh.lathe([(0, z), (0.39, z), (0.39, z + direction * 0.037), (0.12, z + direction * 0.067), (0, z + direction * 0.067)])
    for i in range(3):
        angle = i * TAU / 3
        a = at(0.10, angle, z + direction * 0.073)
        b = at(0.28, angle, z + direction * 0.073)
        handles.tube(a, b, 0.018)
        handles.tube(b, at(0.28, angle, z + direction * 0.135), 0.016)


def hull(parent, nickel, lining):
    surface = lathe_obj(
        "DM2_MultilayerBlanket",
        [
            (OUTSIDE, BARREL_AFT),
            (OUTSIDE + 0.010, BARREL_AFT + 0.025),
            (OUTSIDE + 0.010, CONE_START),
            (0.46, APOLLO_END - 0.21),
            (0.46, APOLLO_END - 0.055),
        ],
        nickel,
        parent,
    )
    mark_shells([surface.name])
    vessel_mesh = MeshBuilder()
    vessel_mesh.lathe(
        [
            (TUNNEL, APOLLO_END - 0.052),
            (TUNNEL, APOLLO_END - 0.20),
            (BORE, CONE_START - 0.005),
            (BORE, BARREL_AFT + 0.02),
            (0.42, BARREL_AFT + 0.014),
        ],
        segs=96,
        flip=True,
    )
    vessel = vessel_mesh.build("DM2_PressureVessel", lining, parent)
    mark_shells([vessel.name])
    flange = [(TUNNEL, APOLLO_END - 0.051), (0.466, APOLLO_END - 0.051), (0.466, APOLLO_END), (TUNNEL, APOLLO_END)]
    lathe_obj("DM2_ApolloDockingFlange", flange, nickel, parent)
    if interior():
        # Removable Apollo drogue and the hatch on the Soyuz end have different faces.
        drogue_z = APOLLO_END - 0.073
        drogue = [(0.402, drogue_z), (0.19, drogue_z - 0.27), (0.061, drogue_z - 0.314), (0.061, drogue_z - 0.334)]
        cone = MeshBuilder()
        cone.lathe(drogue, segs=64, flip=True)
        cone.build("DM2_Drogue", nickel, parent)


def gas_storage(parent, nickel, silver, straps):
    covers, tanks, handles, feeds = (MeshBuilder() for _ in range(4))
    for angle in (-1.14, 1.14):
        for height in (0.58, 1.63):
            centre = at(0.93, angle, SOYUZ_END + height)
            profile = [(0.277 * math.sin(i * math.pi / 20), -0.277 * math.cos(i * math.pi / 20)) for i in range(21)]
            pose = Matrix.Translation(centre)
            if interior():
                tanks.lathe(profile, 40, matrix=pose)
            feeds.tube(centre + Vector((0, 0, 0.28)), centre + Vector((0, 0, 0.39)), 0.033)
            feeds.tube(centre + Vector((0, 0, 0.39)), at(0.74, angle, centre.z + 0.39), 0.027)
        # AST-32-2691 shows angular, foil-covered jackets over the paired spheres.
        # The lids have chamfered corners and the low sides overlap the curved blanket.
        cross = [(-0.26, -0.34), (0.23, -0.34), (0.30, -0.27), (0.30, 0.27), (0.23, 0.34), (-0.26, 0.34)]
        pose = Matrix.Translation(at(0.94, angle, SOYUZ_END + 0.225)) @ Matrix.Rotation(angle, 4, "Z")
        points = [(x, y, z) for z in (0, 1.77) for x, y in cross]
        faces = [tuple(range(5, -1, -1)), tuple(range(6, 12))]
        faces.extend((i, (i + 1) % 6, (i + 1) % 6 + 6, i + 6) for i in range(6))
        covers.add(points, faces, matrix=pose)
        # Truss between end bands for each oxygen/nitrogen pair.
        for delta in (-0.16, 0.16):
            a, b = angle + delta, angle - delta
            handles.tube(at(0.77, a, SOYUZ_END + 0.34), at(0.89, b, SOYUZ_END + 1.88), 0.029)
            handles.tube(at(0.75, a, SOYUZ_END + 1.87), at(0.89, b, SOYUZ_END + 0.42), 0.023)
    cover = covers.build("DM2_OxygenAndNitrogenCovers", silver, parent, smooth=False)
    mark_shells([cover.name])
    if interior():
        tanks.build("DM2_GasSpheres", nickel, parent)
    handles.build("DM2_BottleSupports", straps, parent)
    feeds.build("DM2_GasPlumbing", nickel, parent)


def apas(parent, nickel, dark):
    rim = [(0.41, 0.23), (0.67, 0.23), (0.69, 0.12), (0.66, 0), (0.41, 0), (0.41, 0.23)]
    lathe_obj("DS5_StructuralRing", [(r, SOYUZ_END + z) for r, z in rim], nickel, parent)
    lathe_obj("DS5_PressureSeal", [(0.425, SOYUZ_END - 0.011), (0.453, SOYUZ_END - 0.011)], dark, parent)
    petals, attenuators, catches = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for i in range(3):
        a = TAU * i / 3
        points = [
            at(0.68, a - 0.37, SOYUZ_END + 0.065),
            at(0.68, a + 0.37, SOYUZ_END + 0.065),
            at(0.87, a + 0.27, SOYUZ_END - 0.085),
            at(0.91, a + 0.14, SOYUZ_END - 0.145),
            at(0.91, a - 0.14, SOYUZ_END - 0.145),
            at(0.87, a - 0.27, SOYUZ_END - 0.085),
        ]
        petals.add(
            points + [v + Vector((0, 0, 0.027)) for v in points],
            [(5, 4, 3, 2, 1, 0), (6, 7, 8, 9, 10, 11)] + [(j, (j + 1) % 6, (j + 1) % 6 + 6, j + 6) for j in range(6)],
        )
        for side in (-1, 1):
            root = at(0.64, a + side * 0.30, SOYUZ_END + 0.22)
            tip = at(0.71, a + side * 0.47, SOYUZ_END + 0.065)
            attenuators.tube(root, root.lerp(tip, 0.61), 0.029)
            attenuators.tube(root.lerp(tip, 0.60), tip, 0.014)
        box(catches, (0.07, 0.056, 0.068), 0.61, a, SOYUZ_END - 0.025)
    for i in range(8):
        box(catches, (0.052, 0.052, 0.070), 0.536, i * TAU / 8 + 0.12, SOYUZ_END + 0.018)
    petals.build("DS5_ThreeGuidePetals", nickel, parent, smooth=False)
    attenuators.build("DS5_SixAttenuators", nickel, parent)
    catches.build("DS5_CaptureAndStructuralLatches", dark, parent, smooth=False)


def equipment(parent, nickel, white, dark, green):
    boxes, controls, grips, glass = (MeshBuilder() for _ in range(4))
    # The equipment bay occupies an arc opposite the tank supports. The airlock keeps an open axial passage.
    for i, (width, z, length) in enumerate(((0.53, 0.62, 0.40), (0.47, 1.17, 0.55), (0.45, 1.73, 0.39))):
        a = math.pi + 0.08
        box(boxes, (0.21, width, length), 0.546, a, SOYUZ_END + z)
        box(controls, (0.025, width - 0.025, length - 0.032), 0.427, a, SOYUZ_END + z)
        for j in range(3):
            z1 = SOYUZ_END + z + (j - 1) * 0.078
            box(glass, (0.015, 0.095, 0.037), 0.404, a + 0.20, z1)
            box(grips, (0.039, 0.046, 0.027), 0.397, a - 0.12 - 0.06 * i, z1)
    for a in (0.49, -0.64):
        box(boxes, (0.21, 0.34, 0.37), 0.55, a, SOYUZ_END + 0.92)
        for z in (0.72, 1.38, 1.91):
            left = at(0.66, a - 0.12, SOYUZ_END + z)
            right = at(0.66, a + 0.12, SOYUZ_END + z)
            grips.tube(left, right, 0.018)
    boxes.build("DM2_SystemsAndStowage", white, parent, smooth=False)
    controls.build("DM2_BilingualControls", dark, parent, smooth=False)
    grips.build("DM2_HandlesAndSwitches", nickel, parent)
    glass.build("DM2_Displays", green, parent, smooth=False)


def exterior(parent, nickel, dark, white):
    aerials, panels, optics = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for i, a in enumerate((-0.14, 2.78, 3.57)):
        z = SOYUZ_END + 0.69 + i * 0.34
        aerials.tube(at(0.735, a, z), at(0.78, a, z + 0.36), 0.012, segs=12)
        box(panels, (0.082, 0.062, 0.085), 0.752, a, z)
    for a, z in ((math.pi, 1.76), (3.64, 1.35), (2.53, 0.98)):
        box(panels, (0.11, 0.20, 0.22), 0.779, a, SOYUZ_END + z)
        box(optics, (0.021, 0.093, 0.089), 0.85, a, SOYUZ_END + z)
    # The circular Soyuz periscope target stands off the shell (JSC-10607 fig. A-4).
    a = 0.05
    z = SOYUZ_END + 0.41
    aerials.tube(at(0.738, a, z), at(0.99, a, z), 0.024)
    panels.lathe(
        [(r, depth) for r, depth in [(0, 0), (0.113, 0), (0.119, 0.012), (0.113, 0.024), (0, 0.024)]],
        segs=48,
        matrix=Matrix.Translation(at(1.0, a, z)) @ Matrix.Rotation(math.pi / 2, 4, "Y"),
    )
    aerials.build("DM2_ThreeStowedAerials", nickel, parent)
    panels.build("DM2_ExperimentAndVentHousings", white, parent, smooth=False)
    optics.build("DM2_SpectrometerAndDopplerFaces", dark, parent, smooth=False)


def cradle(parent, nickel, dark):
    braces, pads = MeshBuilder(), MeshBuilder()
    for i in range(3):
        a = i * TAU / 3 + math.pi / 6
        outer = at(2.9, a, SOYUZ_END - 0.48)
        inner = at(0.81, a, SOYUZ_END + 0.22)
        for d in (-0.18, 0.18):
            braces.tube(at(2.9, a + d, SOYUZ_END - 0.33), inner, 0.049)
            braces.tube(at(1.65, a + d / 2, SOYUZ_END - 0.43), inner, 0.042)
        braces.tube(outer, at(0.81, a, SOYUZ_END + 0.04), 0.039)
        box(pads, (0.17, 0.25, 0.13), 0.85, a, SOYUZ_END + 0.28)
    braces.build("SLA18_ThreePointLaunchTruss", nickel, parent)
    pads.build("SLA18_DockingModuleReleaseFittings", dark, parent, smooth=False)


def build():
    nickel = material("astp-dm-nickel", (0.58, 0.60, 0.60), metallic=0.67, roughness=0.39)
    silver = material("astp-dm-inconel", (0.69, 0.67, 0.60), metallic=0.48, roughness=0.57)
    white = material("astp-dm-liner", (0.79, 0.79, 0.71), roughness=0.73)
    dark = material("astp-dm-controls", (0.082, 0.096, 0.104), roughness=0.56)
    green = material("astp-dm-display", (0.24, 0.35, 0.30), roughness=0.4)
    dm = group("DockingModule")
    hull(dm, silver, white)
    mix = group("DockingModuleGasSupply")
    gas_storage(mix, nickel, silver, dark)
    docking = group("CompatibleDockingSystem")
    apas(docking, nickel, dark)
    exterior(group("DockingModuleExperiments"), nickel, dark, silver)
    cabin = group("DockingModuleInterior")
    if interior():
        doors, handles = MeshBuilder(), MeshBuilder()
        hatch(doors, handles, BARREL_AFT + 0.09, 1)
        hatch(doors, handles, APOLLO_END - 0.41, -1)
        doors.build("DM2_TwoPressureHatches", white, cabin)
        handles.build("DM2_HatchHandles", nickel, cabin)
        equipment(cabin, nickel, white, dark, green)
    cradle(group("DockingModuleCradle"), nickel, dark)
