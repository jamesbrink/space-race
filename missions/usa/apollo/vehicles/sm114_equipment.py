"""CSM-114 sector I orbital experiments. Mounting stations in inches, estimated from Apollo 17 Press Kit pp. 56b–c."""

import math

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, group, mark_shells


def sounder_pallet(groups, point, box, pipe, alloy, white, black, glass, foil):
    # Plate 56b is an outward-facing front elevation: UV at left, radiometer at centre, recorder at right.
    radar = MeshBuilder()
    box(radar, 63, -14, 875.5, (11, 16, 10))
    for t in (-21, -7):
        box(radar, 63.5, t, 870.2, (13.5, 2.1, 0.75))
    radar.build("SM114_CSARTransceiver", white, groups["LunarSounder"], smooth=False)
    bolts, cables = MeshBuilder(), MeshBuilder()
    for t in (-20.7, -7.3):
        for z in (872, 879):
            pipe(bolts, (68.6, t, z), (69.15, t, z), 0.56)
    for t in (-17, -13, -9):
        pipe(cables, (57, t, 877), (54, t, 877), 0.34)
        pipe(cables, (54, t, 877), (54, t, 883), 0.34)
    bolts.build("SM114_CSARFasteners", alloy, groups["LunarSounder"])
    cables.build("SM114_CSARCoax", black, groups["LunarSounder"])
    boxes, cassette, handle = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(boxes, 60.5, 16, 855.2, (15, 15, 19))
    box(cassette, 68.7, 16, 855.4, (1.15, 12, 15))
    for t in (12, 20):
        pipe(handle, (69.4, t, 860.7), (71.2, t, 861.4), 0.43)
    pipe(handle, (71.2, 12, 861.4), (71.2, 20, 861.4), 0.43)
    for t in (10.5, 21.5):
        box(handle, 69.58, t, 849, (0.45, 0.53, 3.2))
    boxes.build("SM114_RecorderFilmTransport", foil, groups["LunarSounder"], smooth=False)
    cassette.build("SM114_RecorderRemovableCassette", white, groups["LunarSounder"], smooth=False)
    handle.build("SM114_RecorderEVAGripAndLatches", alloy, groups["LunarSounder"])

    # Press kit p. 59 gives the boresight 18° right and 23° forward. Figure A-16
    # in JSC-07904 locates the Ebert mirror, grating and photomultiplier about that axis.
    yaw, pitch = math.radians(18), math.radians(23)
    outward = Vector((math.cos(pitch) * math.cos(yaw), math.cos(pitch) * math.sin(yaw), math.sin(pitch)))
    across = Vector((-math.sin(yaw), math.cos(yaw), 0))
    up = outward.cross(across)

    def uvpoint(d, t, h):
        return point(*(Vector((65, -14, 858.7)) + outward * d + across * t + up * h))

    def uvbox(mesh, d, t, h, dims):
        corners = [uvpoint(d + dx * dims[0] / 2, t + dy * dims[1] / 2, h + dz * dims[2] / 2) for dz in (-1, 1) for dy in (-1, 1) for dx in (-1, 1)]
        mesh.add(corners, [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (1, 3, 7, 5), (3, 2, 6, 7), (2, 0, 4, 6)])

    casing, baffle, slit, mirrors, sensor, mechanism = (MeshBuilder() for _ in range(6))
    # Open-ended box with an internal optical bench. Slit and grating dimensions are published.
    for side in (-1, 1):
        uvbox(casing, -9.4, side * 3.5, 1.7, (19.6, 0.18, 7.6))
        uvbox(casing, -9.4, 0, 1.7 + side * 3.86, (19.6, 6.79, 0.18))
    uvbox(casing, -19.34, 0, 1.7, (0.2, 7.1, 7.9))

    # The deep rectangular horn opens outward in steps, with dark internal knife edges.
    def corners(d, width, height):
        return [uvpoint(d, w * width / 2, h * height / 2) for w, h in [(-1, -1), (1, -1), (1, 1), (-1, 1)]]

    sections = [(0.5, 3, 0.6), (2.3, 5, 1.6), (5.2, 7, 3.0)]
    for (d0, w0, h0), (d1, w1, h1) in zip(sections, sections[1:]):
        baffle.add(corners(d0, w0, h0) + corners(d1, w1, h1), [(i, (i + 1) % 4, (i + 1) % 4 + 4, i + 4) for i in range(4)])
    for idx in range(1, 5):
        d = 1.0 + idx * 0.73
        width, height = 2.8 + d * 0.83, 0.35 + d * 0.51
        baffle.add(
            corners(d, width, height) + corners(d + 0.04, width - 0.33, height - 0.16), [(i, (i + 1) % 4, (i + 1) % 4 + 4, i + 4) for i in range(4)]
        )
    # A 0.5 x 6 cm slit in the front plate, separate from the baffle opening.
    slit_width, slit_height = 6 / 2.54, 0.5 / 2.54
    for sign in (-1, 1):
        uvbox(slit, 0.22, 0, sign * (0.65 + slit_height / 2), (0.24, 5.1, 1.3))
        uvbox(slit, 0.22, sign * (slit_width / 2 + 0.25), 0, (0.24, 0.5, slit_height))
    # Slight cylindrical curvature reads the Ebert mirror in the isolated view.
    mirrors.grid(lambda t, h: uvpoint(-18.9 + (h / 5) ** 2 * 0.42, t, h), [-2.85, 2.85], [-1.6, 0, 1.7, 3.4, 5])
    size = 10 / 2.54
    grating = [
        uvpoint(-3.1 + h * 0.24, t, 1.7 + h) for t, h in [(-size / 2, -size / 2), (size / 2, -size / 2), (size / 2, size / 2), (-size / 2, size / 2)]
    ]
    mirrors.add(grating, [(0, 1, 2, 3)])
    uvbox(mechanism, -3.4, -2.75, 1.7, (2.9, 0.8, 3.7))
    mechanism.tube(uvpoint(-3.1, -2.65, 1.7), uvpoint(-3.1, 2.8, 1.7), 0.18 * IN, segs=12)
    sensor.tube(uvpoint(-0.45, 0, 3.7), uvpoint(1.55, 0, 3.7), 0.93 * IN, segs=20)
    uvbox(sensor, 2.5, 0, 3.7, (1.9, 2.8, 2.6))
    casing.build("SM114_UVEbertEnclosure", white, groups["FarUltraviolet"], smooth=False)
    mark_shells(["SM114_UVEbertEnclosure"])
    baffle.build("SM114_UVSteppedEntranceHorn", black, groups["FarUltraviolet"], smooth=False)
    slit.build("SM114_UVEntranceSlit", alloy, groups["UVOptics"], smooth=False)
    mirrors.build("SM114_UVEbertMirrorAndGrating", glass, groups["UVOptics"], smooth=False)
    mechanism.build("SM114_UVGratingDrive", alloy, groups["UVOptics"])
    sensor.build("SM114_UVPhotomultiplierAndProcessor", black, groups["UVOptics"])

    # Figure A-17: the motor turns the tilted scan mirror in front of the collecting optics.
    thermal, window, trim, motor, telescope = (MeshBuilder() for _ in range(5))
    box(thermal, 58.4, 0.8, 856.8, (9.2, 8.8, 14.7))
    for side in (-1, 1):
        box(thermal, 65.1, 0.8 + side * 4.5, 852, (8.6, 0.55, 9.1))
    for t in (-3.5, 4.9):
        pipe(trim, (66.8, t - 0.3, 849.2), (66.8, t + 0.3, 849.2), 1.22)
    # The scan mirror is a disk tilted across the aperture. The drive shaft runs athwart the optical path.
    pipe(window, (65.6, 0.8, 848.4), (66.4, 0.8, 849.2), 3)
    pipe(motor, (66.8, 2.95, 849.2), (66.8, 5.95, 849.2), 1.06)
    pipe(telescope, (63.6, 0.8, 851), (63.6, 0.8, 858.6), 2.32)
    pipe(trim, (63.6, 0.8, 850.4), (63.6, 0.8, 851.3), 2.61)
    pipe(motor, (63.6, 0.8, 858.8), (63.6, 0.8, 861.6), 0.81)
    thermal.build("SM114_IRProcessorAndShrouds", white, groups["InfraredRadiometer"], smooth=False)
    mark_shells(["SM114_IRProcessorAndShrouds"])
    trim.build("SM114_IRScannerBearingsAndOpticalRing", alloy, groups["IROptics"])
    window.build("SM114_IRScanningMirror", glass, groups["IROptics"])
    telescope.build("SM114_IRCollectingTelescope", black, groups["IROptics"])
    motor.build("SM114_IRMirrorMotorAndBolometer", alloy, groups["IROptics"])
    # High-frequency elements coil in opposite dispensers. The VHF element is folded flat under the aft shield.
    drums, mouths = MeshBuilder(), MeshBuilder()
    for sign in (-1, 1):
        pipe(drums, (sign * 59.5, sign * 18.2, 835.4), (sign * 67.1, sign * 20.5, 835.4), 3.95)
        pipe(mouths, (sign * 67.3, sign * 20.6, 835.4), (sign * 70.1, sign * 21.4, 835.4), 1.28)
    drums.build("SM114_HFDipoleReels", white, groups["SounderAntennas"])
    mouths.build("SM114_HFDipoleExitGuides", black, groups["SounderAntennas"])
    # Local +X points out of the vehicle. Keep the stated 274 cm boom and seven elements.
    # The estimated hinge and launch clocking put the complete folded assembly inside the adapter.
    hinge = group("SM114_YagiHinge", groups["SounderAntennas"])
    hinge.location = point(43, -52, 832)
    hinge.rotation_euler.z = math.radians(40)
    boom, insulators = MeshBuilder(), MeshBuilder()
    length = 274 / 2.54
    along = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    boom.tube(along(0, 0, 0), along(0, length, 0), 0.5 * IN, segs=16)
    for i in range(7):
        t = 5 + i * (length - 8) / 6
        half = 12 - i * 0.95
        boom.tube(along(-half, t, 0.88), along(half, t, 0.88), 0.24 * IN, segs=12)
        insulators.box(along(1.8, 1.1, 1.15), Matrix.Translation(along(0, t, 0.58)))
    boom.build("SM114_YagiBoomAndSevenElements", alloy, hinge)
    insulators.build("SM114_YagiInsulatingBlocks", black, hinge, smooth=False)
