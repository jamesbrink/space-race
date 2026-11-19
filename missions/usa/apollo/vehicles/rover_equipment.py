"""Deployed J-mission rover equipment. Inches in the rover frame: +X forward, +Y left, +Z up. See lunar-rovers.md."""

import math

from mathutils import Matrix

from lm5_equipment import box, point, tube
from srlib import DETAIL, IN, MeshBuilder, frame, group, material, prof


def relay(alloy, gold, ivory, dark):
    unit = group("RoverLCRU")
    unit.location.x = 1.4 * IN
    body, radiator, harness, knobs = (MeshBuilder() for _ in range(4))
    # 22 by 16 by 6 in, with the radiator/controls on the upright forward face.
    box(body, (58, 0, 22.2), (6, 22, 16))
    for y in (-7.3, -2.8, 1.7):
        for z in (21.2, 25.2):
            box(radiator, (61.02, y, z), (0.18, 4.10, 3.72))
    box(harness, (61.06, 7.8, 22), (0.24, 4.5, 11))
    for z in (19.6, 22.5, 25.4):
        tube(knobs, (61.11, 7.5, z), (61.85, 7.5, z), 0.42)
    for y in (-9.1, 9.1):
        tube(harness, (53.05, y, 21.15), (55, y, 15.2), 0.52)
        tube(harness, (55, y, 15.2), (58, y, 14), 0.4)
    # Insulated blanket folded back from the mirror grids; crew set the exposed area by hand.
    box(body, (61.6, -3, 28.6), (1.1, 15.5, 2.5))
    tube(knobs, (54.8, -10, 25.2), (53, -11.7, 27.5), 0.36)
    tube(knobs, (53, -11.7, 27.5), (53, -15.1, 29), 0.35)
    body.build("LRV_RelayBlanketAndEnclosure", gold, unit)
    radiator.build("LRV_RadiatingMirrors", alloy, unit)
    harness.build("LRV_RelayMountAndControls", ivory, unit)
    knobs.build("LRV_RelaySwitchesAndCable", dark, unit)


def television(alloy, ivory, dark):
    unit = group("RoverTV")
    case, lens, mount, glass = (MeshBuilder() for _ in range(4))
    # RCA camera's whole envelope including its lens is 18 × 6.7 × 10 in.
    x, y = 53.7, -13.3
    box(case, (x - 1.65, y, 47.2), (14.7, 6.7, 8.3))
    for dy in (-2.6, 2.6):
        tube(case, (x - 4.6, y + dy, 51.4), (x + 1.8, y + dy, 51.4), 0.25)
    camera_axis = frame(point(x + 5.7, y, 46.4), (1, 0, 0))
    lens.lathe(prof([(0, 0), (2.45, 0), (2.45, 1.1), (2.65, 1.35), (2.75, 3.3), (2.3, 3.3), (2.15, 2.76)]), 36, matrix=camera_axis)
    glass.lathe(prof([(0, 2.74), (2.16, 2.74)]), 32, matrix=camera_axis)
    # The television control unit, azimuth bearing and tilt yoke stay below the camera.
    box(case, (x, y, 25.5), (8.4, 5.3, 7.9))
    tube(mount, (x, y, 29.35), (x, y, 39.8), 1.28)
    tube(mount, (x, y, 38.7), (x, y, 39.9), 2.18)
    for dy in (-3.7, 3.7):
        tube(mount, (x, y, 39.8), (x, y + dy, 40.8), 0.51)
        tube(mount, (x, y + dy, 40.8), (x, y + dy, 45.3), 0.51)
        tube(mount, (x, y + dy, 45.3), (x, y + dy * 0.88, 45.3), 0.92)
    for yoff in (-1.6, 0, 1.6):
        tube(lens, (x + 4.10, y + yoff, 26.5), (x + 4.58, y + yoff, 26.5), 0.34)
    case.build("LRV_RCAColourCameraAndTCU", ivory, unit)
    mount.build("LRV_TelevisionPanTilt", alloy, unit)
    lens.build("LRV_TelevisionLensHood", dark, unit)
    glass.build("LRV_TelevisionOptics", material("lrv-coated-optics", (0.052, 0.10, 0.15), metallic=0.65, roughness=0.18), unit)


def antennas(alloy, gold, dark):
    antenna = group("RoverHighGain")
    ribs, mesh, pole, feed = (MeshBuilder() for _ in range(4))
    mast = (53, 16.4, 58)
    tube(pole, (53, 16.4, 21.3), (53, 16.4, 42), 0.76)
    tube(pole, (53, 16.4, 42), (53, 16.4, 57.5), 0.56)
    for z in (28.3, 40.5, 52.3):
        tube(feed, (53, 16.4, z), (53, 16.4, z + 0.7), 0.88)
    tube(pole, (53, 16.4, 21.3), (52.0, 16.4, 21.3), 0.53)
    # Dish in its own local frame, with the opening elevated. Section profiles are estimated.
    orient = frame(point(*mast), (0.55, 0.20, 0.81))
    radius = 18

    def p(r, theta, dz=0):
        return orient @ point(r * math.cos(theta), r * math.sin(theta), 7 * (r / radius) ** 2 + dz)

    sectors = 12
    samples = 36 if DETAIL > 0.5 else 24
    angles = [math.tau * i / samples for i in range(samples)]
    mesh.grid(lambda angle, r: p(r, angle, -0.34), angles, [0.1, 4.5, 9, 13.5, radius], closed_u=True, flip=True)
    for i in range(sectors):
        theta = math.tau * i / sectors
        for r1, r2 in ((0.6, 4.5), (4.5, 9), (9, 13.5), (13.5, radius)):
            ribs.tube(p(r1, theta), p(r2, theta), 0.11 * IN, 6)
    for r in (9.2, 14.0, radius):
        for i, theta in enumerate(angles):
            ribs.tube(p(r, theta), p(r, angles[(i + 1) % samples]), 0.065 * IN, 6)
    ribs.tube(orient @ point(0, 0, 0), orient @ point(0, 0, 14.25), 0.45 * IN, 12)
    feed.lathe(prof([(0, 12.9), (0.9, 12.9), (1.25, 13.7), (1.25, 14.85), (0, 14.85)]), 24, matrix=orient)
    # Optical alignment telescope below the reflector, parallel to the radio axis.
    feed.tube(orient @ point(-5, 0, -7.8), orient @ point(-5, 0, 0.45), 0.6 * IN, 16)
    ribs.tube(orient @ point(0, 0, -2), orient @ point(-5, 0, -2), 0.29 * IN, 12)
    pole.build("LRV_DishMastAndCollars", alloy, antenna)
    ribs.build("LRV_ReflectorRibs", gold, antenna)
    mesh.build(
        "LRV_ReflectorMesh", material("lrv-gold-wire-mesh", (0.54, 0.38, 0.16), metallic=0.3, roughness=0.66, alpha=0.60, double_sided=True), antenna
    )
    feed.build("LRV_FeedAndAlignmentSight", dark, antenna)

    low = group("RoverLowGain")
    stem, coil, caps = MeshBuilder(), MeshBuilder(), MeshBuilder()
    tube(stem, (13, 5.2, 24.2), (13, 5.2, 47.2), 0.50)
    tube(stem, (13, 5.2, 47.2), (16, 5.2, 51.4), 0.42)
    helix = frame(point(16, 5.2, 51.4), (0.53, 0.33, 0.79))
    for end in (0, 7.8):
        caps.lathe(prof([(0, end), (2.7, end), (2.7, end + 0.34), (0, end + 0.34)]), 24, matrix=helix)

    def tip(t):
        return helix @ point(2.4 * math.cos(6 * math.pi * t), 2.4 * math.sin(6 * math.pi * t), 0.34 + 7.45 * t)

    for i in range(48):
        coil.tube(tip(i / 48), tip((i + 1) / 48), 0.14 * IN, 6)
    coil.tube(helix @ point(0, 0, 0), helix @ point(0, 0, 8), 0.34 * IN, 12)
    stem.build("LRV_LowGainPointingMast", alloy, low)
    coil.build("LRV_LowGainHelix", gold, low)
    caps.build("LRV_LowGainEndPlates", dark, low)


def carrier(alloy, dark):
    rack = group("RoverToolCarrier")
    rails, mounts = MeshBuilder(), MeshBuilder()
    for y in (-14.4, 14.4):
        tube(rails, (-54, y, 21.5), (-54, y, 47), 0.57)
        tube(rails, (-54, y, 21.6), (-30, y, 21.6), 0.45)
        tube(rails, (-54, y, 46), (-34, y, 21.8), 0.42)
    for z in (22.4, 30.2, 40.5, 46.9):
        tube(rails, (-54, -14.4, z), (-54, 14.4, z), 0.52)
    for y in (-12, -4, 4, 12):
        box(mounts, (-54.7, y, 30.2), (1.3, 1.45, 2))
        box(mounts, (-54.7, y, 40.5), (1.3, 1.45, 1.2))
    rails.build("LRV_AftPalletAndHandToolRack", alloy, rack)
    mounts.build("LRV_ToolClips", dark, rack)


def geology(mission, alloy, ivory, dark):
    root = group("RoverGeology")
    tools, grips, basket, scoop = (MeshBuilder() for _ in range(4))
    # Stowed upright on the folding rear carrier. The rake is ten inches from heel to socket.
    x = -55.8
    for y in (-10.2, 12):
        tube(tools, (x, y, 25), (x, y, 52), 0.30)
    for off in (-0.55, 0.55):
        tube(tools, (x, -10.2, 52), (x, -10.2 + off, 54.1), 0.13)
        tube(tools, (x, -10.2 + off, 54.1), (x + 0.9, -10.2 + off, 55.5), 0.14)
    tube(grips, (x, -10.2, 23.5), (x, -10.2, 28.4), 0.62)
    tube(tools, (x, 12, 52), (x - 1.7, 12, 55), 0.36)
    tube(tools, (x - 1.7, 12, 55), (x - 1.7, 8.7, 55), 0.36)
    # Geological hammer and the articulated scoop.
    tube(tools, (x, -6.4, 28), (x, -6.4, 43), 0.41)
    box(grips, (x, -6.4, 43.3), (4.9, 1.6, 1.7))
    tube(tools, (x, 7.7, 28), (x, 7.7, 44.2), 0.36)
    scoop.grid(lambda y, t: point(x - 2.55 * t, 7.7 + y, 44.2 + 4 * t + 0.7 * (y / 1.8) ** 2), [-1.8, 0, 1.8], [0, 0.5, 1], flip=True)
    for y in (5.9, 9.5):
        tube(tools, (x, y, 44.8), (x - 2.55, y, 48.9), 0.13)
    # Rake basket, visible between the two carrier bars.
    tube(tools, (x, -2.2, 27), (x, -2.2, 37), 0.42)
    for i in range(11):
        y = -4.7 + 0.50 * i
        tube(basket, (x, y, 37.2), (x - 2.6, y, 41.1), 0.11)
        tube(basket, (x - 2.6, y, 41.1), (x - 2.6, y, 43.8), 0.11)
    for zz in (41.1, 43.8):
        tube(basket, (x - 2.6, -4.7, zz), (x - 2.6, 0.3, zz), 0.11)
    tools.build("LRV_TongsScoopAndToolHandles", alloy, root)
    grips.build("LRV_HammerHeadAndGrips", dark, root)
    basket.build("LRV_SamplingRakeBasket", alloy, root)
    scoop.build("LRV_AdjustableScoop", ivory, root)
    # A 30-inch soil probe with an independent recording drum. Folded gnomon beside it.
    root = group("RoverSoilTools")
    probe, drum, scales = MeshBuilder(), MeshBuilder(), MeshBuilder()
    if mission != 17:
        x, y = -51, 11.5
        tube(probe, (x, y, 22.1), (x, y, 52.1), 0.28)
        tube(drum, (x, y, 52.1), (x, y, 58), 1.32)
        tube(probe, (x, y, 58), (x, y, 59.9), 0.50)
    for dy in (-0.9, 0.9):
        tube(probe, (-49, 6 + dy, 25), (-49, 6, 42), 0.19)
    tube(probe, (-49, 6, 25), (-49, 6, 53), 0.32)
    for i in range(6):
        tube(scales, (-49, 6, 42 + i * 1.8), (-49, 6, 42.8 + i * 1.8), 0.41)
    probe.build("LRV_PenetrometerAndGnomon", alloy, root)
    if mission != 17:
        drum.build("LRV_PenetrometerRecordingDrum", ivory, root)
    scales.build("LRV_GnomonReferenceMarks", dark, root)


def samples(mission, ivory, dark):
    root = group("RoverSamples")
    bags, straps = MeshBuilder(), MeshBuilder()
    # A15 loading transcript at 121:08:52 locates bag 4 on the right of the hand tool carrier.
    positions = ((-46.8, -19.25), (-46.8, 19.25)) if mission == 15 else ((-39, 11.8), (-46, -12.5))
    if mission == 17:
        positions = ((-61.1, 10.9), (-48.1, -1.8))
    for x, y in positions:
        # The flexible specimen bag has a narrower base and a rolled mouth; creasing is estimated.
        mat = Matrix.Translation(point(x, y, 25.9 if mission == 17 else 21.6)) @ Matrix.Diagonal((1, 0.64, 1, 1))
        bags.lathe(
            prof([(0, 0), (3.4, 0), (4.6, 2), (4.95, 11), (4.4, 14), (4.85, 14.8), (4.85, 15.4), (3.85, 15.4), (3.7, 13.8), (0, 13.8)]),
            16,
            matrix=mat,
        )
        dz = 4.3 if mission == 17 else 0
        for dy in (-1.25, 1.25):
            tube(straps, (x - 3.5, y + dy, 36.5 + dz), (x - 1.8, y + dy, 39.1 + dz), 0.24)
            tube(straps, (x - 1.8, y + dy, 39.1 + dz), (x + 1.8, y + dy, 39.1 + dz), 0.24)
            tube(straps, (x + 1.8, y + dy, 39.1 + dz), (x + 3.5, y + dy, 36.5 + dz), 0.24)
    bags.build("LRV_SampleCollectionBags", ivory, root)
    straps.build("LRV_SampleBagHandles", dark, root)


def camera(alloy, ivory, dark):
    root = group("RoverCameras")
    body, glass, bracket = MeshBuilder(), MeshBuilder(), MeshBuilder()
    x, y, z = 13.6, -8.35, 40.1
    box(body, (x, y, z), (6.6, 3.8, 4.5))
    box(body, (x - 1.35, y - 2.2, z + 0.9), (4.4, 0.8, 3.9))
    tube(bracket, (x, y, 24.7), (x, y, 37.7), 0.40)
    tube(bracket, (x - 2.2, y, 37.75), (x + 2.3, y, 37.75), 0.57)
    tube(bracket, (x + 3.20, y, z), (x + 5.44, y, z), 1.13)
    tube(glass, (x + 5.34, y, z), (x + 5.55, y, z), 0.91)
    body.build("LRV_SixteenMillimeterCameraAndMagazine", ivory, root)
    bracket.build("LRV_MaurerCameraBracketAndLens", alloy, root)
    glass.build("LRV_MaurerCameraGlass", dark, root)


def magnetometer(alloy, ivory, dark):
    root = group("RoverScience")
    meter, cable, sensor, dials = (MeshBuilder() for _ in range(4))
    # The readout remained on the rover while the sensor tripod went away on a 50-ft lead.
    x, y = -40.3, 0.3
    box(meter, (x, y, 28.1), (7, 7.5, 8.6))
    for z in (26.5, 28.8, 31.1):
        box(dials, (x - 3.55, y, z), (0.22, 4, 1.21))
    spool = frame(point(x + 1.1, y, 34.1), (0, 1, 0))
    cable.lathe(prof([(0, -2), (2.15, -2), (2.15, -1.6), (1.6, -1.6), (1.6, 1.6), (2.15, 1.6), (2.15, 2), (0, 2)]), 28, matrix=spool)
    for dy in (-1.3, 0, 1.3):
        tube(sensor, (-33.8, -4.2 + dy, 22), (-33.8, -4.2 + 0.55 * dy, 40.6), 0.23)
    box(meter, (-33.8, -4.2, 41.6), (2.4, 2.5, 2.7))
    meter.build("LRV_MagnetometerReadoutAndSensor", ivory, root)
    dials.build("LRV_ThreeMagneticFieldReadouts", dark, root)
    cable.build("LRV_MagnetometerCableReel", dark, root)
    sensor.build("LRV_FoldedSensorTripod", alloy, root)


def equipment(mission):
    alloy = material("lrv-payload-alloy", (0.67, 0.68, 0.65), metallic=0.76, roughness=0.4)
    ivory = material("lrv-payload-thermal-fabric", (0.82, 0.80, 0.68), roughness=0.88, double_sided=True)
    gold = material("lrv-communications-foil", (0.60, 0.45, 0.22), metallic=0.54, roughness=0.48)
    dark = material("lrv-payload-fittings", (0.095, 0.106, 0.10), metallic=0.33, roughness=0.63)
    relay(alloy, gold, ivory, dark)
    television(alloy, ivory, dark)
    antennas(alloy, gold, dark)
    carrier(alloy, dark)
    geology(mission, alloy, ivory, dark)
    samples(mission, ivory, dark)
    if mission != 17:
        camera(alloy, ivory, dark)
    if mission == 16:
        magnetometer(alloy, ivory, dark)
    if mission == 17:
        from lrv3_equipment import payload

        payload(alloy, ivory, dark)
