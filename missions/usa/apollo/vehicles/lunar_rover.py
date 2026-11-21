"""Deployed Apollo lunar roving vehicle. Inches, +X forward, +Y left, Z from the ground. See lunar-rovers.md."""

from math import cos, pi, radians, sin, tau

from mathutils import Matrix

from lm5_equipment import box, point, tube
from lrv_deploy import assemble, deployment_runs
from lrv_wheels import build_wheels
from rover_equipment import equipment
from srlib import IN, MeshBuilder, frame, group, load_font, mark_shells, material, prof, text_mesh


def chassis(m):
    """The three hinged frames, each its own group: the centre (`RoverChassis`) and the two ends (`RoverForeChassis`,
    `RoverAftChassis`), which `assemble` hangs on their hinges."""
    part = group("RoverChassis")
    ends = {1: group("RoverForeChassis"), -1: group("RoverAftChassis")}
    rails, deck, fasteners, latches = (MeshBuilder() for _ in range(4))
    # Three hinged frames. The crew stands on the beaded aluminium floor of the centre section.
    # The underframe's low edge is the published loaded 14 in ground clearance.
    for y in (-24.25, 24.25):
        box(rails, (0, y, 15.5), (53.5, 1.5, 3))
    for x in (-26.2, -12.1, 12.7, 26.2):
        box(rails, (x, 0, 15.6), (1.1, 47.0, 2.72))
    for y in (-12.1, 12.1):
        box(deck, (0, y, 17.26), (52.0, 23.96, 0.46))
        for dx in range(-22, 25, 4):
            tube(rails, (dx, y - 11.18, 17.6), (dx, y + 11.18, 17.6), 0.19)
    for fore in (1, -1):
        end = MeshBuilder()
        for y in (-16.35, 16.35):
            box(end, (fore * 41.55, y, 19.9), (29.8, 1.3, 3.2))
            tube(end, (fore * 27, y, 15.3), (fore * 47, y, 19.0), 0.74)
            for offset in (-0.95, 0.95):
                tube(fasteners, (fore * 26.85, y + offset - 0.30, 18.16), (fore * 26.85, y + offset + 0.30, 18.16), 0.84)
            tube(latches, (fore * 26.85, y - 1.48, 18.16), (fore * 26.85, y + 1.48, 18.16), 0.36)
        for x in (29.75, 45.0, 55.6):
            box(end, (fore * x, 0, 19.90), (1.25, 31.4, 3.2))
        for sy in (1, -1):
            tube(end, (fore * 30, sy * 15.85, 18.85), (fore * 54, -sy * 15.85, 19.63), 0.53)
        end.build("LRV_" + ("Fore" if fore > 0 else "Aft") + "Frame", m["alloy"], ends[fore])
    for mesh, tag, mat in (
        (rails, "StructuralFrames", "alloy"),
        (deck, "BeadedFloor", "deck"),
        (fasteners, "ChassisHinges", "hardware"),
        (latches, "HingePins", "ochre"),
    ):
        mesh.build("LRV_" + tag, m[mat], part)


def underseat_bags(seat, mission, m):
    """Fabric stowage under the folded fabric seats. Apollo 16 added dust flaps (MSC-07230 §A.3.2)."""
    bags = group("LRV_UnderseatBags", seat)
    canvas, binding, lids, straps = (MeshBuilder() for _ in range(4))
    for cy in (-14, 14):

        def rim(z, half_x, half_y):
            corners = []
            for cx, dy, start in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
                for angle in (start, start + 45, start + 90):
                    a = radians(angle)
                    corners.append(point(-10.5 + cx * (half_x - 1.15) + 1.15 * cos(a), cy + dy * (half_y - 1.15) + 1.15 * sin(a), z))
            return corners

        rings = [rim(18.06, 6.2, 7.9), rim(19.28, 6.95, 8.55), rim(22.47, 6.78, 8.42), rim(22.59, 6.49, 8.13)]
        for a, b in zip(rings, rings[1:]):
            canvas.add(a + b, [(i, (i + 1) % 12, (i + 1) % 12 + 12, i + 12) for i in range(12)])
        canvas.add(rings[0], [tuple(range(12))])
        for i in range(12):
            binding.tube(rings[-1][i], rings[-1][(i + 1) % 12], 0.17 * IN, caps=False)
        if mission >= 16:
            # Close the dust cover around the mouth. Subdued edge folds show that it is fabric.
            lip = rim(22.82, 6.86, 8.48)
            crown = rim(22.98, 6.1, 7.85)
            lids.add(lip + crown, [(i, (i + 1) % 12, (i + 1) % 12 + 12, i + 12) for i in range(12)] + [tuple(range(12, 24))])
            for y in (-4.8, 4.8):
                straps.ribbon([point(-4.12, cy + y, 23.11), point(-3.47, cy + y, 22.89), point(-3.47, cy + y, 21.88)], (0, 1, 0), 0.85 * IN)
    canvas.build("LRV_UnderseatStowage", m["web"], bags)
    binding.build("LRV_BagSeams", m["belt"], bags)
    if mission >= 16:
        lids.build("LRV_StowageDustCovers", m["ivory"], bags)
        straps.build("LRV_StowageTabs", m["belt"], bags)


def seats(mission, m):
    part = group("RoverSeats")
    underseat_bags(part, mission, m)
    rails, cloth, web, belt, buckles = (MeshBuilder() for _ in range(5))
    for side, role in ((1, "Driver"), (-1, "Passenger")):
        cy = side * 14
        for y in (cy - 9.6, cy + 9.6):
            # Seat back opens on the rear cross-tube; the two side rails are the occupied seat outline.
            tube(rails, (-21.0, y, 23.6), (0.9, y, 24.3), 0.52)
            tube(rails, (-20.0, y, 23.8), (-24.5, y, 44.2), 0.53)
            tube(rails, (-18.6, y, 18), (-19.5, y, 23.9), 0.52)
            tube(rails, (-2, y, 17.85), (-0.15, y, 24.0), 0.48)
            tube(rails, (5, y, 17.82), (17.2, y, 21.85), 0.41)
        for x, z in ((0.9, 24.3), (-20.3, 23.85), (-24.5, 44.25), (17.2, 21.85)):
            tube(rails, (x, cy - 9.6, z), (x, cy + 9.6, z), 0.48)
        # Open-backed web seats: broad horizontal straps cross narrower uprights.
        for z in (27.6, 32.2, 36.8, 41.4):
            x = -20.2 - (z - 24) * 0.22
            web.ribbon([point(x, cy - 9.34, z), point(x - 0.65, cy, z), point(x, cy + 9.34, z)], (-0.215, 0, 0.977), 2.3 * IN)
        for dy in (-6.6, 0, 6.6):
            cloth.ribbon([point(-21.32, cy + dy, 24.2), point(-23.41, cy + dy, 33.6), point(-25.40, cy + dy, 44.18)], (0, 1, 0), 1.55 * IN)
        for dy in (-6.5, -2.15, 2.15, 6.5):
            cloth.ribbon([point(-20.5, cy + dy, 23.96), point(-11, cy + dy, 23.35), point(0.72, cy + dy, 24.34)], (0, 1, 0), 4.05 * IN)
        for x in (11.75, 14.85):
            tube(rails, (x, cy - 8, 20.2 + (x - 12) * 0.33), (x, cy + 8, 20.2 + (x - 12) * 0.33), 0.35)
        # Outboard handhold and below-floor step for a suited crew member climbing aboard.
        y = side * 24.25
        for x in (-8, 3.4):
            tube(rails, (x, y, 17.7), (x, y, 25.1), 0.46)
        tube(rails, (-8, y, 25.1), (3.4, y, 25.1), 0.5)
        for x in (-3.0, 5.9):
            tube(rails, (x, y, 15.4), (x, side * 27.85, 12.4), 0.40)
        tube(rails, (-3.0, side * 27.85, 12.4), (5.9, side * 27.85, 12.4), 0.4)
        # The unoccupied Velcro restraint lies over the webbing. Leave its buckle and free end visible.
        belt.ribbon(
            [point(-14.3, cy - 9.7, 24.2), point(-10.3, cy - 3, 24.28), point(-7.8, cy + 2.6, 24.42), point(-11, cy + 9.6, 24.18)],
            (1, 0, 0),
            1.45 * IN,
        )
        box(buckles, (-7.8, cy + 2.45, 24.60), (1.95, 1.70, 0.26))
        if mission >= 16:
            # Over-centre tightening lever on the revised restraint (MSC-07230 A.3.2e).
            for y in (cy + 1.97, cy + 2.93):
                tube(buckles, (-8.24, y, 24.6), (-7.42, y, 25.02), 0.105)
            tube(buckles, (-7.42, cy + 1.97, 25.02), (-7.42, cy + 2.93, 25.02), 0.15)
        # (where a figure sits, to the vehicle contract: at the hips, facing the node's -Y; tools/blender/vehicles.py)
        hip = group("LRV_" + role + "Hip", part, seat=1)
        hip.location = point(-10, cy, 24)
        hip.rotation_euler.z = pi / 2
        eye = group("LRV_" + role + "Eye", part)
        eye.location = point(-10, cy, 54)
        eye.rotation_euler.z = pi / 2
    # where the driver stands to get on: on the ground outboard of his seat, between the wheels (estimated)
    group("LRV_Stand_Driver", part, stand=1).location = point(-8, 40, 0)
    for mesh, tag, mat in (
        (rails, "FoldingSeatFrames", "alloy"),
        (cloth, "SeatSlings", "ivory"),
        (web, "SeatBackWebbing", "web"),
        (belt, "SeatBelts", "belt"),
        (buckles, "SeatBuckles", "hardware"),
    ):
        mesh.build("LRV_" + tag, m[mat], part, smooth=mat == "alloy")


def batteries(mission, m):
    part = group("RoverBatteries")
    cases, connectors, loom = (MeshBuilder() for _ in range(3))
    for number, y in ((1, 7.0), (2, -7.0)):
        box(cases, (39.5, y, 24.65), (20.5, 12.65, 6.25))
        radiator = MeshBuilder()
        for x in (31.9, 36.9, 41.9, 46.9):
            for dy in (-2.9, 2.9):
                box(radiator, (x, y + dy, 27.88), (4.66, 5.49, 0.14))
        radiator.build(f"LRV_BatteryRadiator_{number}", m["mirror"], part)
        lid = group(f"LRV_BatteryCover_{number}", part)
        cover = MeshBuilder()
        box(cover, (39.5, y, 28.29), (20.86, 13.10, 0.46))
        if mission >= 16:
            # The second flight added reflective tape and hook-and-loop closure to the covers.
            tape = MeshBuilder()
            # Subdivide the top skin so the silver tape is part of the surface it covers.
            cover.faces.pop(1)  # top quad of the box above
            edges = (-6.55, -5.06, -4.24, 4.24, 5.06, 6.55)
            for j, (y0, y1) in enumerate(zip(edges, edges[1:])):
                for i, (x0, x1) in enumerate(((29.07, 30.75), (30.75, 48.25), (48.25, 49.93))):
                    skin = tape if i == 1 and j in (1, 3) else cover
                    skin.add([point(x0, y + y0, 28.52), point(x1, y + y0, 28.52), point(x1, y + y1, 28.52), point(x0, y + y1, 28.52)], [(0, 1, 2, 3)])
            mark_shells([tape.build(f"LRV_ReflectiveLidStrips_{number}", m["mirror"], lid, smooth=False).name])
        for x in (32.2, 46.8):
            tube(connectors, (x, y + 5.9, 28.62), (x + 1.2, y + 5.9, 28.62), 0.17)
        mark_shells([cover.build(f"LRV_BatteryDustLid_{number}", m["ivory"], lid, smooth=False).name])
        for dy in (-2.9, 2.9):
            tube(connectors, (29.25, y + dy, 24.25), (28.40, y + dy, 24.25), 0.70)
            tube(loom, (28.38, y + dy, 24.25), (27.2, y + dy, 24.25), 0.29)
            tube(loom, (27.2, y + dy, 24.25), (26.30, y + dy, 22.05), 0.29)
    cases.build("LRV_SilverZincBatteryCases", m["alloy"], part)
    connectors.build("LRV_BatterySocketsAndLatches", m["hardware"], part)
    loom.build("LRV_BatteryHarness", m["rubber"], part)
    nav = group("RoverNavigation")
    cases, flanges, fins = (MeshBuilder() for _ in range(3))
    # Signal processor, directional gyro and drive electronics are packed into the forward chassis.
    for y in (-13.05, 0, 13.05):
        box(cases, (26.75, y, 21.45), (4.4, 6.1, 4.55))
        box(flanges, (26.75, y, 19.12), (5.4, 6.55, 0.34))
        for dy in (-2.12, -0.7, 0.7, 2.12):
            box(fins, (26.75, y + dy, 23.83), (4.0, 0.20, 0.26))
        tube(flanges, (24.6, y, 21.2), (23.9, y, 21.2), 0.56)
    cases.build("LRV_NavigationAndDriveElectronics", m["gold"], nav)
    flanges.build("LRV_ElectronicsMounts", m["hardware"], nav)
    fins.build("LRV_ElectronicsRibs", m["alloy"], nav)


def controls(m):
    part = group("RoverConsole")
    base, post, armrest = (MeshBuilder() for _ in range(3))
    box(base, (6.5, 0, 18.16), (8.6, 4.4, 1.15))
    for y in (-1.25, 1.25):
        tube(post, (3.4, y, 18.22), (5.75, y, 32), 0.55)
        tube(post, (9.6, y, 18.22), (5.75, y, 32), 0.55)
        tube(post, (5.75, y, 31.8), (9.2, y, 35.9), 0.53)
    box(base, (-2.4, 0, 30.35), (8.2, 3.0, 1.25))
    box(armrest, (-8.6, 0, 30.65), (5.7, 3.15, 1.72))
    tube(post, (-8.6, 0, 29.75), (-8.15, 0, 18.45), 0.48)
    base.build("LRV_ControlPostBase", m["ivory"], part)
    post.build("LRV_ControlPostStruts", m["alloy"], part)
    armrest.build("LRV_Armrest", m["rubber"], part)
    controller = group("LRV_HandController", part)
    controller.location = point(-1.9, 0, 31.1)
    lever, grip = (MeshBuilder() for _ in range(2))
    tube(lever, (0, 0, -0.31), (0, 0, 3.8), 0.50)
    fit = frame(point(0, -2.15, 3.85), (0, 1, 0))
    grip.lathe(prof([(0, 0), (0.67, 0), (0.77, 0.33), (0.65, 1.03), (0.65, 3.25), (0.78, 3.9), (0.68, 4.3), (0, 4.3)]), 28, matrix=fit)
    lever.build("LRV_ControllerStick", m["hardware"], controller)
    grip.build("LRV_TGrip", m["rubber"], controller)
    # The 10 by 12 inch instrument face is a small sloped desk viewed from the two seats.
    panel = group("LRV_InstrumentFace", part)
    slope = radians(49)
    panel.matrix_local = Matrix(((0, cos(slope), -sin(slope), 8.0 * IN), (-1, 0, 0, 0), (0, sin(slope), cos(slope), 35.8 * IN), (0, 0, 0, 1)))
    case, plate, dials, marks, bright, hand = (MeshBuilder() for _ in range(6))
    box(case, (0, 0, -0.90), (10.45, 12.45, 1.8))
    box(plate, (0, 0, 0.11), (10, 12, 0.22))
    box(case, (0, 6.42, -0.26), (6.0, 1.4, 0.75))
    box(plate, (-5.95, 3.15, 0.20), (1.42, 2.55, 0.40))
    for y in (2.35, 2.78, 3.21, 3.64, 4.07):
        box(marks, (-5.95, y, 0.44), (0.48, 0.07, 0.055))
    # Layered bezels, compass card, bearing/range counters, speed dial and moving-coil meters.
    for x, y, r in ((-2.6, 3.05, 1.61), (2.78, 4.02, 0.7)):
        tr = Matrix.Translation(point(x, y, 0.22))
        bright.lathe(prof([(r - 0.15, 0), (r, 0), (r, 0.19), (r - 0.09, 0.25), (r - 0.15, 0.21)]), 48, matrix=tr)
        dials.lathe(prof([(0, 0.13), (r - 0.14, 0.13)]), 48, matrix=tr)
        for i in range(28 if r > 1 else 12):
            a = tau * i / (28 if r > 1 else 12)
            tube(marks, (x + (r - 0.24) * sin(a), y + (r - 0.24) * cos(a), 0.41), (x + (r - 0.36) * sin(a), y + (r - 0.36) * cos(a), 0.41), 0.024)
        tube(hand, (x, y, 0.45), (x - r * 0.22, y + r * 0.54, 0.45), 0.040)
    for x in (-1.76, -0.60, 1.87, 3.00):
        box(dials, (x, -1.13, 0.28), (0.74, 2.55, 0.12))
        for i in range(7):
            box(marks, (x - 0.12, -2.05 + i * 0.30, 0.39), (0.21, 0.04, 0.05))
        box(bright, (x, -0.77, 0.41), (0.52, 0.10, 0.08))
    for x, y in ((-3.20, 3.10), (-3.38, 2.20), (-2.25, 2.20)):
        box(dials, (x, y, 0.46), (0.92, 0.45, 0.11))
    # Sun-shadow device parked at the centre of the face and guards over power/steering switches.
    box(bright, (0.32, 2.9, 0.31), (0.75, 4.35, 0.18))
    tube(hand, (0.31, 4.11, 0.41), (0.32, 4.11, 0.79), 0.13)
    for x in (-3.55, -1.72, 0.05, 1.81, 3.57):
        for y in (-4.84, -3.48):
            bright.lathe(prof([(0.15, 0), (0.21, 0.06), (0.19, 0.16), (0.12, 0.16)]), 14, matrix=Matrix.Translation(point(x, y, 0.22)))
            tube(hand, (x, y, 0.32), (x + 0.11, y + 0.15, 0.74), 0.064)
    for x in (-1.99, 2.47):
        box(marks, (x, -2.86, 0.26), (4.0, 0.035, 0.045))
    # High-contrast silk-screen legends read from the April flight-kit elevation on p. 112.
    font = load_font()
    for legend, x, y, h in (
        ("HEADING", -3.68, 4.83, 0.31),
        ("SPEED", 2.22, 5.06, 0.29),
        ("POWER / TEMP", -1.8, 0.56, 0.32),
        ("STEERING", -4.37, -2.98, 0.24),
        ("DRIVE POWER", -1.81, -2.98, 0.24),
        ("DRIVE ENABLE", 1.7, -2.98, 0.24),
        ("BEARING", -3.66, 3.40, 0.17),
        ("RANGE", -2.68, 2.48, 0.17),
        ("N", -2.70, 4.14, 0.26),
        ("PITCH", -6.52, 1.60, 0.21),
    ):
        verts, faces = text_mesh(legend, h * IN, font, cuts=0)
        marks.add(verts, faces, matrix=Matrix.Translation(point(x, y, 0.49)))
    for mesh, tag, mat in (
        (case, "ConsoleHousing", "alloy"),
        (plate, "ConsoleFace", "panel"),
        (dials, "Instruments", "dial"),
        (marks, "Legends", "ink"),
        (bright, "BezelsAndGuards", "hardware"),
        (hand, "SwitchesAndPointers", "rubber"),
    ):
        mesh.build("LRV_" + tag, m[mat], panel, smooth=False)


def saddle_release(m):
    """The saddle release cable's handle on the left rear side of the forward frame (LS006-002-2H section 1.9.3.5): pulled
    up, it lets the saddle go and the rover is free of its LM. Its shape and its place are estimated."""
    node = group("LRV_SaddleRelease")
    node.location = point(30.0, 17.6, 21.6)
    handle, cable = MeshBuilder(), MeshBuilder()
    tube(handle, (0, -1.3, 1.25), (0, 1.3, 1.25), 0.24)
    tube(cable, (0, 0, -0.4), (0, 0, 1.25), 0.1)
    handle.build("LRV_SaddleReleaseHandle", m["ochre"], node)
    cable.build("LRV_SaddleReleaseCable", m["hardware"], node)


def build(mission):
    m = {
        name: material("lrv-" + name, color, metal, rough, double_sided=name in ("titanium", "amber", "ivory", "web", "belt"))
        for name, color, metal, rough in (
            ("alloy", (0.57, 0.58, 0.56), 0.67, 0.43),
            ("hardware", (0.37, 0.39, 0.41), 0.70, 0.4),
            ("titanium", (0.60, 0.61, 0.59), 0.66, 0.52),
            ("wire", (0.22, 0.23, 0.23), 0.61, 0.51),
            ("dark", (0.16, 0.17, 0.17), 0.49, 0.52),
            ("rubber", (0.036, 0.041, 0.04), 0.05, 0.72),
            ("amber", (0.67, 0.255, 0.065), 0.17, 0.51),
            ("ochre", (0.49, 0.30, 0.14), 0.42, 0.57),
            ("deck", (0.64, 0.65, 0.62), 0.48, 0.54),
            ("ivory", (0.83, 0.82, 0.75), 0.09, 0.76),
            ("web", (0.74, 0.72, 0.64), 0.06, 0.85),
            ("belt", (0.28, 0.27, 0.245), 0.03, 0.83),
            ("mirror", (0.44, 0.49, 0.53), 0.83, 0.28),
            ("gold", (0.57, 0.43, 0.19), 0.46, 0.55),
            ("panel", (0.65, 0.665, 0.61), 0.16, 0.57),
            ("dial", (0.14, 0.155, 0.15), 0.11, 0.49),
            ("ink", (0.035, 0.042, 0.037), 0.01, 0.7),
        )
    }
    chassis(m)
    build_wheels(m, mission)
    seats(mission, m)
    batteries(mission, m)
    controls(m)
    saddle_release(m)
    equipment(mission)
    # one node to the vehicle contract, hung on the hinges the deployment moves (lrv_deploy.py)
    assemble()
    deployment_runs()
    return f"LRV-{mission - 14}: 90 in wheelbase, 72 in track, 32.19 in wire wheels and 14 in loaded chassis clearance"
