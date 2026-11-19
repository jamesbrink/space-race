"""J-mission sector I science pallet in launch stowage. Inches, see csm-112.md and csm-113.md."""

import math

from mathutils import Matrix, Vector

from service_tanks import HYDROGEN_DIAMETER, _ball
from srlib import IN, MeshBuilder, interior, material

SECTOR = Matrix.Rotation(math.radians(40), 4, "Z")


def build(groups, origin_xa, *, spacecraft):
    alloy = material("apollo-sim-machined-alloy", (0.64, 0.65, 0.62), metallic=0.70, roughness=0.38)
    white = material("apollo-sim-thermal-white", (0.84, 0.82, 0.75), roughness=0.65)
    black = material("apollo-sim-instrument-black", (0.063, 0.068, 0.069), metallic=0.27)
    foil = material("apollo-sim-insulation", (0.48, 0.34, 0.16), metallic=0.73, roughness=0.48)
    glass = material("apollo-sim-optical-glass", (0.036, 0.075, 0.10), metallic=0.43, roughness=0.24)
    cells = material("apollo-subsatellite-solar-cells", (0.072, 0.097, 0.16), metallic=0.55, roughness=0.31)

    blanket = material("apollo-sim-camera-blanket", (0.68, 0.31, 0.082), metallic=0.63, roughness=0.45)

    def point(r, t, xa):
        return SECTOR @ Vector((r, t, xa - origin_xa)) * IN

    def box(mesh, r, t, xa, dims):
        mesh.box(Vector(dims) * IN, Matrix.Translation(point(r, t, xa)) @ SECTOR)

    def pipe(mesh, start, end, radius, sides=16):
        mesh.tube(point(*start), point(*end), radius * IN, segs=sides)

    def shelf(xa):
        # Sandwich sheet cut to fit the sector walls and follow the curved skin.
        angle = math.radians(23)
        inner = 57 if xa == 932 else 44
        edge = [
            (r * math.cos(a), r * math.sin(a))
            for r, steps in ((73.7, range(-8, 9)), (inner, range(8, -9, -1)))
            for a in [angle * k / 8 for k in steps]
        ]
        n = len(edge)
        slab = MeshBuilder()
        vertices = [point(r, t, xa + h) for h in (0, 0.72) for r, t in edge]
        faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        for i in range(16):
            faces.extend([(n - 1 - i, n - 2 - i, i + 1, i), (i + n, i + 1 + n, 2 * n - 2 - i, 2 * n - 1 - i)])
        slab.add(vertices, faces)
        slab.build(f"SM{spacecraft}_SIMSandwichShelf{xa}", alloy, groups["SIMBay"], smooth=False)

    for xa in (841, 869, 932, 955):
        shelf(xa)

    # Pallet backplane keeps the cryogenic plumbing behind the orbital experiments.
    liners, stiffeners, routes = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for bottom, top, radius in ((842, 868.5, 34), (870, 932, 56.2), (933, 954.5, 57)):
        width = 2 * radius * math.tan(math.radians(23))
        # The container penetrates the pallet: leave its launch channel open.
        if bottom == 870 and spacecraft != 114:
            box(liners, radius, 0, (889 + top) / 2, (0.45, width, top - 889))
            box(liners, radius, 8, (bottom + 889) / 2, (0.45, 22, 889 - bottom))
        else:
            box(liners, radius, 0, (bottom + top) / 2, (0.45, width, top - bottom))
        for hand in (-1, 1):
            for z in range(int(bottom) + 3, int(top) - 2, 7):
                r1, r2 = radius + 0.8, 68.0
                pipe(stiffeners, (r1, hand * (r1 * 0.438), z), (r2, hand * (r2 * 0.438), z), 0.45)
    for side in (-1, 1):
        for t_off in (0, 0.85):
            zpath = [
                (64, side * (26 + t_off), 844),
                (64, side * (26 + t_off), 862),
                (62, side * (25 + t_off), 866),
                (62, side * (25 + t_off), 927),
                (63, side * (26 + t_off), 931),
                (64, side * (26 + t_off), 949),
            ]
            for a, b in zip(zpath, zpath[1:]):
                pipe(routes, a, b, 0.31)
    liners.build(f"SM{spacecraft}_InstrumentPalletLiners", white, groups["SIMBay"], smooth=False)
    stiffeners.build(f"SM{spacecraft}_PalletSideStiffeners", alloy, groups["SIMBay"])
    routes.build(f"SM{spacecraft}_SideHarnesses", black, groups["SIMBay"])

    # EVA handholds straddle the cut line and stay with the spacecraft.
    handrails = MeshBuilder()
    for angle in (13.1, 66.9):
        a = math.radians(angle - 40)
        for bottom, top in ((847, 875), (883, 914), (922, 951), (958, 978)):
            rail = [(r * math.cos(a), r * math.sin(a), z) for r, z in ((76.8, bottom), (78.5, bottom + 1.5), (78.5, top - 1.5), (76.8, top))]
            for start, end in zip(rail, rail[1:]):
                pipe(handrails, start, end, 0.45)
    handrails.build(f"SM{spacecraft}_EVAHandrails", alloy, groups["SIMBay"])

    # Clipped corners and rounded upper shoulders of the subsatellite launch container.
    def container_point(r, t, xa):
        # Toe the launcher inward behind its mouth to fit between the converging radial beams.
        a = math.radians(-12)
        dr, dt = r - 68, t + 14
        return point(68 + dr * math.cos(a) - dt * math.sin(a), -14 + dr * math.sin(a) + dt * math.cos(a), xa)

    def housing(mesh, r0, r1, t0, z0, outline, open_front=False, transform=container_point):
        n = len(outline)
        verts = [transform(r, t0 + t, z0 + z) for r in (r0, r1) for t, z in outline]
        faces = [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        faces.append(tuple(reversed(range(n))))
        if not open_front:
            faces.append(tuple(range(n, 2 * n)))
        mesh.add(verts, faces)

    if spacecraft != 114:
        compartment, handle = MeshBuilder(), MeshBuilder()
        outline = [(-9, 0), (9, 0), (9, 13), (6, 18), (-6, 18), (-9, 13)]
        housing(compartment, 36.2, 68, -14, 870, outline, open_front=True)
        housing(compartment, 68.1, 68.6, -14, 870, outline)
        for t in (-18, -14, -10):
            handle.tube(container_point(68.85, t, 872), container_point(68.85, t, 882), 0.48 * IN)
        compartment.build(f"SM{spacecraft}_SubsatelliteContainer", black, groups["SIMBay"], smooth=False)
        handle.build(f"SM{spacecraft}_SubsatelliteContainerRibs", alloy, groups["SIMBay"])

    # Reconstruct the EVA foot restraint beside the panoramic camera.
    rest = MeshBuilder()
    outline = [(-3, 0), (3, 0), (4.4, 1.5), (3.2, 5.5), (4.2, 10.5), (2.8, 12), (-2.8, 12), (-4.2, 10.5), (-3.2, 5.5), (-4.4, 1.5)]
    housing(rest, 65, 66.2, -17, 897, outline, transform=point)
    rest.build(f"SM{spacecraft}_EVAFootRestraint", black, groups["SIMBay"], smooth=False)
    fittings = MeshBuilder()
    for z in (899, 907):
        pipe(fittings, (57, -17, z), (65, -17, z), 0.85)
    fittings.build(f"SM{spacecraft}_FootRestraintBrackets", alloy, groups["SIMBay"])

    # Shallow creases on the panoramic camera's thermal wrap, based on S71-2250-X.
    # The two removable-faced white panels interrupt the gold perimeter.
    wrap = MeshBuilder()
    for side in (-1, 1):
        for row in range(13):
            z = 870.5 + row * 3.2
            corners = [(67.3, side * 12.5, z), (67.0, side * 9.8, z), (67.5, side * 9.8, z + 3.2), (67.3, side * 12.5, z + 3.2)]
            verts = [point(r, 9 + t, h) for r, t, h in corners] + [point(67.9 + (row % 3) * 0.18, 9 + side * 11.2, z + 1.4)]
            wrap.add(verts, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)] if side == -1 else [(4, 1, 0), (4, 2, 1), (4, 3, 2), (4, 0, 3)])
    for z in (870.8, 892.3, 911.5):
        box(wrap, 67.35, 9, z, (0.55, 20.1, 1.25))
    wrap.build(f"SM{spacecraft}_PanoramicThermalWrap", blanket, groups["SIMCameras"], smooth=False)
    # Optical head, cassette and scanning-camera installation, fig. A-1.
    equip, body, optics, trim = (MeshBuilder() for _ in range(4))
    box(body, 62, -4, 943.3, (13, 18, 16))
    pipe(trim, (68.6, -4, 943.3), (69.4, -4, 943.3), 5.7)
    pipe(optics, (69.5, -4, 943.3), (69.7, -4, 943.3), 4.25)
    box(equip, 62, 12, 944, (14, 12.5, 14))
    pipe(trim, (65, 12.4, 951), (68, 12.4, 951), 0.7)
    pipe(equip, (54, -19, 938), (68, -19, 938), 3.2)
    pipe(optics, (68.1, -19, 938), (68.4, -19, 938), 2.5)
    box(equip, 59.5, 9, 901.1, (12.5, 22, 54))
    box(body, 67, 9, 905.5, (3.5, 19.2, 23.8))
    pipe(equip, (65.7, 9, 921), (68.8, 9, 921), 5.1)
    pipe(trim, (68.8, 9, 921), (69.6, 9, 921), 5.2)
    pipe(optics, (69.7, 9, 921), (70, 9, 921), 3.95)
    box(body, 66.6, 9, 881.5, (4.2, 19.2, 16.9))
    for t in (4, 14):
        pipe(trim, (68.9, t, 891), (70.2, t, 892), 0.45)
    pipe(trim, (70.2, 4, 892), (70.2, 14, 892), 0.45)
    for side in (-1, 1):
        t = 9 + side * 9
        for z in (874.2, 889.2, 895.0, 915.8):
            pipe(trim, (68.9, t, z), (69.24, t, z), 0.65)
        # Scanning barrel with its outboard yoke, baffles and trunnion.
        pipe(trim, (61, t + side * 2.3, 912), (61, t + side * 2.3, 926), 0.85)
        pipe(trim, (61, t + side * 2.3, 925.5), (66, t + side * 2.3, 925.5), 0.85)
        pipe(trim, (67.7, side * 7 - 4, 948), (68.6, side * 7 - 4, 948), 0.55)
        pipe(trim, (69, 12.4 + side * 4.5, 947.5), (70.4, 12.4 + side * 4.5, 948.7), 0.45)
    pipe(trim, (70.4, 7.9, 948.7), (70.4, 16.9, 948.7), 0.45)
    equip.build(f"SM{spacecraft}_SIMCameraHousingsAndCassettes", white, groups["SIMCameras"], smooth=False)
    body.build(f"SM{spacecraft}_SIMCameraPanels", white, groups["SIMCameras"], smooth=False)
    optics.build(f"SM{spacecraft}_CameraOpticalPorts", glass, groups["SIMCameras"])
    trim.build(f"SM{spacecraft}_CameraBezelsAndEVAHandles", black, groups["SIMCameras"])

    if interior():
        hydro = groups["ReserveHydrogen"]
        centre = point(39, 0, 929) / IN
        _ball(f"SM{spacecraft}_HydrogenThreeVacuumJacket", HYDROGEN_DIAMETER, centre, foil, hydro)
        pipework = MeshBuilder()
        pipe(pipework, (39, 0, 944.8), (39, 0, 946.9), 1)
        pipe(pipework, (39, 0, 946.9), (48, 0, 946.9), 0.45)
        pipework.build(f"SM{spacecraft}_HydrogenOutlet", alloy, hydro)

    if spacecraft == 114:
        from sm114_equipment import sounder_pallet

        sounder_pallet(groups, point, box, pipe, alloy, white, black, glass, foil)
        return

    # Heads and inboard reel drives; launch view keeps both booms retracted.
    ends, instruments, drives = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for t, z in ((-13, 855), (16, 859)):
        box(drives, 50, t, z, (10, 9, 10))
        pipe(instruments, (55.2, t, z), (62, t, z), 3.3)
    pipe(ends, (62.1, -13, 855), (69, -13, 855), 4.4)
    for r in (63.3, 65, 66.7, 68.4):
        pipe(instruments, (r, -13, 855), (r + 0.45, -13, 855), 4.55)
    box(ends, 65.5, 16, 859, (7, 8, 8))
    box(drives, 61, 8, 847.4, (11, 14, 8.8))
    for t, z in ((4, 848.8), (10, 848.8), (4, 845.5), (10, 845.5)):
        pipe(ends, (66.6, t, z), (67, t, z), 1.1)
    ends.build(f"SM{spacecraft}_SpectrometerHeadsAndDetectors", black, groups["SIMBooms"])
    instruments.build(f"SM{spacecraft}_StowedBoomSleeves", alloy, groups["SIMBooms"])
    drives.build(f"SM{spacecraft}_BoomDrivesAndXRayAlphaHousing", white, groups["SIMBooms"], smooth=False)

    if spacecraft == 113:
        # MR appendix A.1 and §9.12: position switches, guide shoes and tapered pins
        # on the retraction mechanism. Local stations and dimensions are estimates.
        switches, lugs, wiring = MeshBuilder(), MeshBuilder(), MeshBuilder()
        for t, z in ((-13, 855), (16, 859)):
            side = -1 if t < 0 else 1
            box(switches, 56.4, t + side * 3.55, z - 1.0, (2.0, 1.0, 1.6))
            for r, offset in ((55.7, 4.8), (57.2, 5.5)):
                pipe(wiring, (r, t + side * 4, z - 0.8), (r, t + side * offset, z - 1.85), 0.15)
                pipe(wiring, (r, t + side * offset, z - 1.85), (51, t + side * offset, z - 1.85), 0.15)
        for dz in (-3.1, 3.1):
            z, t = 855 + dz, -16.9
            box(lugs, 59.2, t, z, (1.25, 1.25, 1.35))
            pipe(lugs, (59.9, t, z), (62.7, t, z), 0.35)
            pipe(lugs, (58.0, t, z), (58.6, t, z), 0.22)
        switches.build("SM113_BoomPositionSwitches", black, groups["SIMBooms"], smooth=False)
        lugs.build("SM113_GammaGuidePinsAndShoes", alloy, groups["SIMBooms"])
        wiring.build("SM113_PositionTelemetryLeads", black, groups["SIMBooms"])

    if not interior():
        return
    # Press kit orbital science and p. 136. The flight specification gives the envelope, not its panel seams.
    prism, satellite = MeshBuilder(), MeshBuilder()
    corners = [(7 * math.cos(math.tau * i / 6), 7 * math.sin(math.tau * i / 6)) for i in range(6)]
    housing(prism, 37.8, 67.8, -14, 878.7, corners)
    prism.build(f"SM{spacecraft}_30InchSubsatellite", alloy, groups["Subsatellite"], smooth=False)
    for i, (t, z) in enumerate(corners):
        nt, nz = corners[(i + 1) % 6]
        # Figure A-12 shows banks of cells separated by small gaps on six faces.
        tt, zz = (t + nt) / 2, (z + nz) / 2
        for row in range(6):
            for a in range(5):
                lo = 38.35 + row * 4.85 + a * 0.92
                for b in range(4):
                    w = -0.46 + b * 0.23
                    uv = ((lo, w), (lo + 0.86, w), (lo + 0.86, w + 0.213), (lo, w + 0.213))
                    verts = [container_point(r, -14 + (tt + (t - nt) * u) * 1.018, 878.7 + (zz + (z - nz) * u) * 1.018) for r, u in uv]
                    satellite.add(verts, [(0, 1, 2, 3)])
    satellite.build(f"SM{spacecraft}_SubsatelliteSolarPanels", cells, groups["Subsatellite"], smooth=False)
    booms = MeshBuilder()
    for a in (0, 120, 240):
        angle = math.radians(a)
        t, z = -14 + 7.43 * math.cos(angle), 878.7 + 7.43 * math.sin(angle)
        booms.tube(container_point(38.3, t, z), container_point(66.1, t, z), 0.23 * IN)
        booms.tube(container_point(64.9, t, z), container_point(66.1, t, z), 0.46 * IN)
    booms.build(f"SM{spacecraft}_ThreeFoldedSubsatelliteBooms", alloy, groups["Subsatellite"])
