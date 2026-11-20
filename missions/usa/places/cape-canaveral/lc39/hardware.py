"""Apollo-era Launch Complex 39. Dimensions in feet from the hardstand top."""

from math import cos, pi, sin

from mathutils import Matrix

from lc39.night_launch import skylab_floods, vent_disconnect, xenon_banks  # noqa: E402
from lc39.saturn_ib_launcher import launch_pedestal, pedestal_accessories, service_lines  # noqa: E402
from sitelib import P, Parts, beam, box, fine, handrail, hull, lattice, obox, plate, stair_rails, stairs, truss, use  # noqa: E402
from srlib import FT, material  # noqa: E402

DECK = 22 + 25
# Tower levels above the launcher deck. Floor widths and structural sections are reconstructed.
LEVELS = [0, 30, 60, *range(80, 361, 20)]
CORNERS = [(60, -15), (100, -15), (100, 15), (60, 15)]


def hardstand(parts, pad, ecs_room):
    # North-south trench runs under the engine opening. Model zero is the hardstand top.
    parts.node("Hardstand")
    for side in (-1, 1):
        a, b = sorted((side * 29, side * 180))
        box(parts("Hardstand", "concrete"), (-170, a, -42), (280, b, 0))
        # Estimated sloping shoulders of the raised hardstand.
        inner, outer = side * 179.92, side * 320
        outline = [(inner, 0), (outer, -42), (inner, -42)]
        if side > 0:
            outline.reverse()
        if side > 0 and ecs_room:
            # The pad ECS room opens onto the west apron (SA-510 manual, §VIII).
            # Cut its frontage out of the pad fill, so a walker can reach the wall.
            soil = parts("Hardstand", "earth")
            front = 265
            crest = -42 * (front - inner) / (outer - inner)
            for left, right, caps in ((-169.9, 64, (True, False)), (160, 279.9, (False, True))):
                hull(soil, [[(x, y, z) for y, z in outline] for x in (left, right)], caps)
            cut = [(inner, -42), (front, -42), (front, crest), (inner, 0)]
            hull(soil, [[(x, y, z) for y, z in cut] for x in (64, 160)], (False, False))
            for left, right in ((64, 64.7), (159.3, 160)):
                wing = [(front, -42), (outer, -42), (front, crest)]
                hull(parts("Hardstand", "concrete"), [[(x, y, z) for y, z in wing] for x in (left, right)])
        else:
            hull(parts("Hardstand", "earth"), [[(x, y, z) for y, z in outline] for x in (-169.9, 279.9)])
    # Crawlerway climbs at five percent from the south; the trench opens north.
    hull(parts("Hardstand", "concrete"), [[(-1010, y, -42), (-170, y, 0), (-170, y, -42)] for y in (-85, 85)])
    parts.node("Water_Valve_Pit")
    y = 120 if pad == "A" else -120
    box(parts("Water_Valve_Pit", "steel"), (-35, y - 4, -0.6), (-23, y + 4, 0.14))
    for x in (-32, -27):
        beam(parts("Water_Valve_Pit", "rail"), (x, y - 3, 0.22), (x, y + 3, 0.22), 0.11)
    if pad == "A":
        parts.node("Substation")
        box(parts("Substation", "concrete"), (-24, 445, -42.8), (24, 494, -41.1))
        for x in (-14, 0, 14):
            box(parts("Substation", "steel"), (x - 3, 463, -41), (x + 3, 473, -33.1))
            for i in range(3):
                beam(parts("Substation", "brick"), (x - 2 + i * 2, 465, -33.1), (x - 2 + i * 2, 465, -30), 0.7)
    parts.node("Storage_Spheres")
    # Nominal capacities are internal. The jackets and supports are photographic approximations.
    for x, y, radius in ((1025, 1025, 33), (1025, -1025, 32.5)):
        z = -42 + 6 + radius
        profile = [(radius * sin(pi * i / 24) * FT, -radius * cos(pi * i / 24) * FT) for i in range(25)]
        parts("Storage_Spheres", "white", True).lathe(profile, 48, matrix=Matrix.Translation(P(x, y, z)))
        for i in range(8):
            a = i * pi / 4
            px, py = x + radius * 0.62 * cos(a), y + radius * 0.62 * sin(a)
            beam(parts("Storage_Spheres", "steel"), (px, py, -42), (px, py, z - radius * 0.77), 1.2)
    parts.node("Flame_Deflector")
    profile = [(-60, -42), (-36, -38), (-17, -25), (-5, -7), (0, -1), (5, -7), (17, -25), (36, -38), (60, -42)]
    hull(parts("Flame_Deflector", "brick"), [[(x, y, z) for x, z in profile] for y in (-28.4, 28.4)])


def ecs_room_front(parts):
    """West pad-fill ECS room, exterior only. Room footprint documented, frontage and ductwork estimated."""
    name = "ECS_Room"
    parts.node(name)
    # Concrete retaining face and an exposed work apron at the foot of the slope.
    box(parts(name, "concrete"), (64.01, 265.02, -42), (159.99, 266.0, -25.53))
    box(parts(name, "concrete/apron"), (64.72, 266.02, -42.5), (159.28, 323.0, -41.84))
    # Framed service leaves and hardware on the exposed face.
    for x in (75, 80.05):
        box(parts(name, "steel"), (x, 266.02, -41.82), (x + 5.0, 266.19, -32.52))
        beam(parts(name, "rail"), (x + 2.1, 266.29, -38.2), (x + 3.3, 266.29, -38.2), 0.15)
    box(parts(name, "deck"), (74.65, 266.0, -32.48), (85.4, 266.65, -31.94))

    # AS-510 FER §3.6.1 identifies ducts and the wall-anchored remote air
    # plenum. Profiles, connections, quantity and mounting positions are estimates.
    node = "ECS_Air_Plenum"
    parts.node(node, name, (116, 267, -34))
    box(parts(node, "deck"), (109, 266.04, -38.6), (123, 268.5, -30.2))
    for height in (-38.8, -30.16):
        box(parts(node, "steel"), (108.55, 266.0, height), (123.45, 266.36, height + 0.34))
        for x in (109, 115.9, 122.9):
            parts(node, "rail", True).tube(P(x, 266.38, height + 0.17), P(x, 266.53, height + 0.17), 0.12 * FT)
    for x in (112, 120):
        duct = parts(node, "rail", True)
        # Quarter-round duct elbows turn through the retaining wall. Cross sections
        # travel continuously around the bend, including where a walker sees underneath.
        duct.tube(P(x, 268, -30.2), P(x, 268, -29.1), 0.72 * FT, caps=False)
        bends = []
        for step in range(9):
            angle = step * pi / 16
            ring = []
            for k in range(20):
                phase = 2 * pi * k / 20
                radius = 1.45 + 0.72 * sin(phase)
                ring.append((x + 0.72 * cos(phase), 266.55 + radius * cos(angle), -29.1 + radius * sin(angle)))
            bends.append(ring)
        hull(duct, bends, (False, False))
        duct.tube(P(x, 266.55, -27.65), P(x, 265.98, -27.65), 0.72 * FT, caps=False)
        duct.tube(P(x, 268, -29.8), P(x, 268, -29.59), 0.79 * FT)
        duct.tube(P(x, 266.0, -27.65), P(x, 266.17, -27.65), 0.88 * FT)
    # Removable access covers and their perimeter fasteners break up the broad
    # side of the sheet-metal enclosure. Their layout is reconstructed.
    for x in (112.6, 119.4):
        box(parts(node, "steel"), (x - 2.75, 268.52, -37.5), (x + 2.75, 268.68, -31.25))
        box(parts(node, "deck"), (x - 2.54, 268.70, -37.30), (x + 2.54, 268.81, -31.45))
        for dx in (-2.23, 2.23):
            for z in (-36.98, -34.36, -31.77):
                parts(node, "rail", True).tube(P(x + dx, 268.82, z), P(x + dx, 268.94, z), 0.12 * FT, segs=6)
        for dx in (-0.58, 0.58):
            beam(parts(node, "rail"), (x + dx, 268.82, -34.36), (x + dx, 269.13, -34.36), 0.13)
        beam(parts(node, "rail"), (x - 0.62, 269.13, -34.36), (x + 0.62, 269.13, -34.36), 0.16)


def base(parts):
    parts.node("Pad_Pedestals")
    for x in (-31, 36, 104):
        for y in (-62, 62):
            box(parts("Pad_Pedestals", "steel"), (x - 3, y - 3, 0), (x + 3, y + 3, 22))
            # Middle east support braced in both directions, northeast to the east and middle west to the north.
            if y < 0 and x in (36, 104):
                beam(parts("Pad_Pedestals", "steel"), (x, y, 17), (x, y - 9, 0), 1.8)
            if x == 36:
                beam(parts("Pad_Pedestals", "steel"), (x, y, 17), (x + 9, y, 0), 1.8)
    for x in (-25, 25):
        for y in (-31, 31):
            box(parts("Pad_Pedestals", "steel"), (x - 1.4, y - 1.4, 0), (x + 1.4, y + 1.4, 14))
            box(parts("Pad_Pedestals", "deck"), (x - 1, y - 1, 14), (x + 1, y + 1, 22))
    parts.node("Launcher_Base")
    # A single perimeter with an open exhaust well. The four pieces meet edge to edge.
    for xa, xb, ya, yb in ((-40, -22.5, -67.5, 67.5), (22.5, 120, -67.5, 67.5), (-22.5, 22.5, -67.5, -22.5), (-22.5, 22.5, 22.5, 67.5)):
        box(parts("Launcher_Base", "steel"), (xa, ya, 22), (xb, yb, DECK))
    if fine():
        handrail(
            parts("Launcher_Base", "rail"),
            [(107.4, 67.1, DECK), (-39.6, 67.1, DECK), (-39.6, -67.1, DECK), (119.6, -67.1, DECK), (119.6, 67.1, DECK), (112.6, 67.1, DECK)],
        )


def tower(parts, crane_parked, pedestal_bridge=False):
    parts.node("Umbilical_Tower")
    frame = parts("Umbilical_Tower", "red")
    for lo, hi in zip(LEVELS, [*LEVELS[1:], 380]):
        open_landing = lo == 320 or (pedestal_bridge and lo == 120)
        lattice(frame, lambda i, z: (*CORNERS[i], z), [DECK + lo, DECK + hi], 1.15, 0.55, faces=(0, 1, 2) if open_landing else (0, 1, 2, 3))
    for z in LEVELS[1:]:
        box(parts("Umbilical_Tower", "deck"), (59.3, -15.7, DECK + z + 0.58), (100.7, 15.7, DECK + z + 0.85))
        if fine():
            handrail(
                parts("Umbilical_Tower", "rail"),
                [(59.6, -15.4, DECK + z + 0.85), (100.4, -15.4, DECK + z + 0.85), (100.4, 15.4, DECK + z + 0.85), (81.2, 15.4, DECK + z + 0.85)],
            )
    # Access stairs to the deck; one of the tower elevator cars is exposed for walking.
    stairs(parts("Launcher_Base", "deck/stair"), (42, 88, 0), (107.5, 88, DECK), 5)
    stair_rails(parts("Launcher_Base", "rail/stair"), (42, 88, 0), (107.5, 88, DECK), 5)
    box(parts("Launcher_Base", "deck/landing"), (107.5, 66.9, DECK - 0.36), (112.5, 91, DECK + 0.08))
    lift = "Tower_Lift"
    parts.node(lift, "Umbilical_Tower", (77, 20, DECK))
    box(parts(lift, "deck"), (73, 15.8, DECK + 0.03), (81, 24, DECK + 0.3))
    for x in (73.2, 80.8):
        for y in (16, 23.8):
            beam(parts(lift, "red"), (x, y, DECK + 0.3), (x, y, DECK + 7.8), 0.32)
    box(parts(lift, "steel"), (72.95, 15.75, DECK + 7.8), (81.05, 24.05, DECK + 8.25))
    # Enclosed twin elevator shaft inside the open lattice.
    box(parts("Umbilical_Tower", "steel"), (79, -5, DECK + 0.02), (88, 6, DECK + 348))
    parts.node("Hammerhead_Crane", origin=(80, 0, 0) if crane_parked else (0, 0, 0))
    if crane_parked:
        parts.nodes["Hammerhead_Crane"][0].rotation_euler.z = pi / 2
    crane = parts("Hammerhead_Crane", "red")
    box(crane, (76, -5, DECK + 360), (84, 5, DECK + 386))
    truss(crane, lambda i, x: (x, (-3, 3, 3, -3)[i], DECK + (387, 387, 398, 398)[i]), range(-5, 124, 8), 0.63, 0.38)
    beam(parts("Hammerhead_Crane", "steel"), (-4, 0, DECK + 387), (-4, 0, DECK + 376), 0.25)


def purge_console(parts):
    """AS-511 FER §3.4.3 locates the LH2 purge console on level 200; its case and fittings are estimates."""
    name = "LH2_Purge_Console"
    # Local +Y faces the operator. Stand the reconstructed cabinet on the south side of level 200,
    # leaving the central aisle free between its working face and the lift.
    cabinet = parts.node(name)
    cabinet.location = P(71, -5, DECK + 200 + 0.85)
    cabinet.rotation_euler.z = 112 * pi / 180
    case = parts(name, "steel")
    trim = parts(name, "rail", True)
    panel = parts(name, "deck")
    # Two channel feet carry the cabinet above the tower floor.
    for x in (-1.65, 1.65):
        box(panel, (x - 0.3, -1.45, 0), (x + 0.3, 0.68, 0.18))
        box(case, (x - 0.15, -1.17, 0.18), (x + 0.15, 0.4, 0.48))
    box(case, (-2.25, -1.28, 0.48), (2.25, 0.54, 5.22))
    box(panel, (-2.38, -1.36, 5.22), (2.38, 0.65, 5.36))
    # Raised instrument plate, bezels and pointers. Layout, number and scales unrecorded.
    box(panel, (-2.11, 0.55, 2.42), (2.11, 0.61, 5.03))
    dial = parts(name, "white", True)
    linkage = parts(name, "steel/control")
    for x, slope in ((-1.01, 1), (0.99, -1)):
        z = 4.16
        trim.tube(P(x, 0.61, z), P(x, 0.74, z), 0.47 * FT)
        dial.tube(P(x, 0.74, z), P(x, 0.76, z), 0.395 * FT)
        beam(linkage, (x - 0.045 * slope, 0.79, z - 0.04), (x + 0.2 * slope, 0.79, z + 0.21), 0.04)
        for tick in range(7):
            theta = (-135 + 45 * tick) * pi / 180
            beam(linkage, (x + 0.29 * sin(theta), 0.79, z + 0.29 * cos(theta)), (x + 0.34 * sin(theta), 0.79, z + 0.34 * cos(theta)), 0.03)
        trim.tube(P(x, 0.62, 3.00), P(x, 0.9, 3.00), 0.15 * FT)
        beam(linkage, (x - 0.27, 0.93, 2.96), (x + 0.27, 0.93, 3.04), 0.1)
    # Cable entry below the electrical terminal strip, visible through its open-front guard.
    box(panel, (-1.95, 0.55, 0.83), (1.95, 0.71, 2.14))
    box(case, (-1.98, 0.71, 2.13), (1.98, 1.05, 2.23))
    box(linkage, (-1.38, 0.72, 1.32), (1.38, 0.87, 1.77))
    for i in range(6):
        x = -1.12 + i * 0.45
        trim.tube(P(x, 0.87, 1.56), P(x, 0.94, 1.56), 0.079 * FT, segs=8)
        beam(linkage, (x, 0.79, 1.32), (x, 0.79, 0.99), 0.062)
    # Conduit entries and unions on the case flank.
    for y in (-0.85, -0.01):
        trim.tube(P(2.25, y, 1.3), P(2.71, y, 1.3), 0.15 * FT)
        trim.tube(P(2.35, y, 1.3), P(2.52, y, 1.3), 0.22 * FT, segs=6)
        trim.tube(P(2.71, y, 1.3), P(2.71, y, 0.05), 0.135 * FT)


def arms(parts, detailed, skylab=False, side_hinge=False):
    # Service envelopes approximated from the Saturn V flight manual, section VIII.
    for i, (level, tip) in enumerate(
        ((68, 16.65), (132, 16.65), (150, 16.65), (175, 16.65), (215, 16.65), (245, 10.9), (276, 10.9), (304, 6.5), (320, 8)), 1
    ):
        # Leave the steel frame outside the stage skin through its whole swing.
        # These tips include room for the coarse collision cells on both assets.
        if detailed:
            tip = (18.4, 18.4, 18.4, 18.4, 18.4, 12.65, 12.65, 9.8, 8)[i - 1]
        if skylab and i < 5:
            continue
        if skylab and i == 5:
            tip -= 68 / 12  # S-IB forward arm 1A is the extended S-IC forward arm.
        name = "Service_Arm_1A" if skylab and i == 5 else f"Service_Arm_{i}"
        z = DECK + level
        # An outboard bearing keeps the parked truss clear of both tower columns.
        # For the recorded 180-degree sweep the crew arm's hinge lies outside the tower's side face.
        hy = -21.5 if side_hinge and i == 9 else 0
        parts.node(name, origin=(55, hy, z))
        if hy:
            beam(parts("Umbilical_Tower", "steel"), (55, hy, z - 1.65), (60.5, -15.5, z - 1.65), 1.3)
        else:
            box(parts("Umbilical_Tower", "steel"), (54.5, -1.5, z - 1.4), (60.5, 1.5, z - 0.45))
        if i == 9:
            # The arm leaves level 320. The lower hatch sill on the flown CSM exhibits is 326.4 ft
            # above the engine exits. The rise and its stair arrangement are reconstructed.
            floor = parts(name, "deck")
            if hy:
                # The stationary walkway passes outside the tower corner upright and enters the open front
                # of level 320. Its final tread stays below the moving heel for the whole 180-degree sweep.
                stationary = parts("Umbilical_Tower", "deck")
                box(stationary, (53, -16, z - 0.80), (58, -5.5, z - 0.40))
                hull(
                    stationary,
                    [
                        [(x, y, z + h + up) for x, y, up in ((58, -10.5, 0), (59.3, -10.5, 1.24), (59.3, -5.5, 1.24), (58, -5.5, 0))]
                        for h in (-0.80, -0.40)
                    ],
                )
                hull(
                    stationary,
                    [[(x, y, z + h) for x, y in ((53, -16), (55, -24.4), (60.5, -24.4), (60.5, -20.5), (58, -16))] for h in (-0.80, -0.40)],
                )
            else:
                box(parts("Umbilical_Tower", "deck"), (55, -2.8, z - 0.35), (59.4, 2.8, z + 0.03))
            # The spans run back from the top of the stairs to the side-mounted pivot.
            truss(parts(name, "red"), lambda k, x: (x, (-3, 3, 3, -3)[k] + hy * (x - 30) / 25, z + (0, 0, 8.4, 8.4)[k]), [30, 42.5, 55], 0.39, 0.22)
            if hy:
                hull(
                    floor,
                    [[(x, y + hy * (x - 30) / 25, z + h) for x, y in ((30, -2.8), (54.95, -2.8), (54.95, 2.8), (30, 2.8))] for h in (0.19, 0.44)],
                )
            else:
                box(floor, (30, -2.8, z + 0.19), (54.95, 2.8, z + 0.44))
            # On the detailed launchers the landing sits one step below the opening leaves.
            landing = 5.97 if detailed else 6.4
            stairs(floor, (30, 0, z + 0.44), (12, 0, z + landing), 5.5)
            stair_rails(parts(name, "rail"), (30, 0, z + 0.44), (12, 0, z + landing), 5.5)
            # The two open hatch leaves occupy the positive-y side of the vestibule.
            sill = 6.14 if detailed else 4.65
            # Keep the underside clear after both GLBs are quantized into collision boxes.
            thickness = 0.32 if detailed else 0.34
            if skylab:
                thickness = 0.30  # 6 mm relief beneath the floor for SA-206's solid cells.
            if hy:
                # The closeout crew takes up the panels between white room and spacecraft
                # (SL-III MC1/1). Model the removable threshold stowed on edge in the vestibule.
                edge = 10.6
                parts.node("White_Room_Bridgeplate", name, origin=(edge, 0, z + landing))
                box(parts("White_Room_Bridgeplate", "deck"), (sill, -2.65, z + landing - 0.22), (edge - 0.03, 2.65, z + landing))
                sill = edge
            box(floor, (sill, -3, z + landing - thickness), (12, 5.9, z + landing))
            room = parts(name, "white")
            for y in (-3.1, 5.7):
                box(room, (sill, y, z + landing + 0.05), (12, y + 0.2, z + 14.1))
            box(room, (sill, -3.15, z + 14.1), (12, 5.95, z + 14.37))
        else:
            truss(parts(name, "red"), lambda k, x: (x, (-2, 2, 2, -2)[k], z + (0, 0, 5, 5)[k]), [tip, (tip + 55) / 2, 55], 0.39, 0.22)
            box(parts(name, "deck"), (tip, -1.89, z + 0.2), (54.95, 1.89, z + 0.44))


def holddowns(parts):
    parts.node("Holddown_Arms")
    # At positions I to IV, east, north, west and south of the opening, as articulated_holddowns places them.
    for i in range(4):
        theta = -pi / 2 + i * pi / 2
        u = (cos(theta), sin(theta), 0)
        for radius, z, size in ((34, 1.4, (8, 5, 2.8)), (32, 7.5, (4, 4, 10)), (17, 18.7, (2.4, 3.2, 1.2))):
            obox(parts("Holddown_Arms", "steel"), (radius * u[0], radius * u[1], DECK + z), u, (0, 0, 1), size)
        beam(parts("Holddown_Arms", "steel"), (32 * u[0], 32 * u[1], DECK + 12), (17 * u[0], 17 * u[1], DECK + 18.6), 2.4)


def articulated_holddowns(parts):
    """Apollo 11 Press Kit, Mobile Launcher; MSFC-MAN-504 fig. 8-7; SP-4204 ch. 13."""
    parts.node("Holddown_Arms")
    # Pad X is north, Y west. Positions I to IV begin in the east and progress counterclockwise.
    for i, (ux, uy) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0)), 1):

        def point(radius, width, height, ux=ux, uy=uy):
            return (ux * radius - uy * width, uy * radius + ux * width, DECK + height)

        axis = (ux, uy, 0)
        steel = parts("Holddown_Arms", "steel")
        # Cantilever support girder reaches in from the rim of the deck opening.
        for w in (-1.85, 1.85):
            beam(steel, point(24.8, w, 0.45), point(24.8, w, 9.6), 0.85)
            beam(steel, point(24.8, w, 1.2), point(18.2, w, 9.6), 0.7)
        obox(steel, point(21.3, 0, 9.72), axis, (0, 0, 1), (9, 6, 0.5))
        # Open-sided casting, with room for the linkage to collapse.
        for w in (-2.55, 2.55):
            profile = [(17.1, 9.99), (25.45, 9.99), (21.5, 17.9), (18.3, 18.7)]
            hull(steel, [[point(r, side, z) for r, z in reversed(profile)] for side in (w - 0.26, w + 0.26)])
            beam(steel, point(17.05, w, 19.0), point(18.6, w, 15.1), 0.48)
        obox(steel, point(17.8, 0, 18.93), axis, (0, 0, 1), (3.55, 5.5, 0.48))
        # Contact plane equals the stack exhibit's S-IC lower rim, STA 118.3.
        obox(parts("Holddown_Arms", "deck"), point(16.3, 0, 19.3016667), axis, (0, 0, 1), (1.3, 2.75, 0.28))
        link = f"Holddown_Link_{i}"
        pivot = point(19.12, 0, 17.85)
        parts.node(link, "Holddown_Arms", pivot)
        lever = parts(link, "deck")
        for w in (-0.69, 0.69):
            profile = [(18.48, 17.62), (19.2, 17.05), (22.87, 17.3), (23.12, 18.05), (19.72, 19.1), (18.55, 18.97)]
            hull(lever, [[point(r, side, z) for r, z in reversed(profile)] for side in (w - 0.23, w + 0.23)])
        beam(lever, point(18.9, -1.09, 18.28), point(18.9, 1.09, 18.28), 0.49)
        # The adjustable head bears on the vehicle lug's upper shoulder. Its pad follows
        # the lug taper (5 to 1.5 in outboard over an 8.5 in rise above the sole).
        head = [(16.755, 20.042), (16.898, 19.695), (17.29, 19.74), (18.62, 18.20), (19.20, 18.85), (17.67, 20.62), (16.80, 20.64)]
        # Leave 0.002 ft radial seating clearance so the two independently exported solids meet without crossing.
        hull(lever, [[point(r + 0.002, w, z) for r, z in reversed(head)] for w in (-0.56, 0.56)])
        # The steel visor is open on its underside. The two side cheeks turn about a horizontal shaft.
        hood = f"Holddown_Hood_{i}"
        centre, radius, height = 21.12, 4.03, 16.82
        parts.node(hood, "Holddown_Arms", point(centre, 0, height))
        visor = parts(hood, "steel")
        visor_shell(visor, point, centre, radius, height, 2.17)


def tail_masts(parts):
    parts.node("Tail_Service_Masts")
    # Fig. 8-7 shows two masts west of the opening and one east.
    for x, y in ((9, 25), (-9, 25), (9, -25)):
        sign = 1 if y > 0 else -1
        mb = parts("Tail_Service_Masts", "steel")
        box(mb, (x - 2, y - 2.4, DECK), (x + 2, y + 2.4, DECK + 1.1))
        for dx in (-1.55, 1.55):
            beam(mb, (x + dx, y + sign * 1.8, DECK + 1), (x + dx, y - sign * 0.5, DECK + 20), 0.55)
            beam(mb, (x + dx, y - sign * 1.8, DECK + 1), (x + dx, y - sign * 0.5, DECK + 20), 0.55)
        beam(mb, (x, y, DECK + 20), (x, sign * 15, DECK + 23), 1.9)


def visor_shell(mesh, point, centre, radius, height, half_width):
    """One curved quadrant of steel, open on its underside with cheeks at the bearing."""
    angles = [i * pi / 12 for i in range(7)]

    def arc(rad, angle, width):
        return point(centre + rad * cos(angle), width, height + rad * sin(angle))

    loop = [(radius, a) for a in angles] + [(radius - 0.19, a) for a in reversed(angles)]
    hull(mesh, [[arc(rad, a, w) for rad, a in reversed(loop)] for w in (-half_width, half_width)])
    for w in (-half_width - 0.08, half_width + 0.08):
        outline = [point(centre, w, height), *[arc(radius - 0.10, a, w) for a in angles]]
        plate(mesh, outline, 0.12)


def articulated_tail_masts(parts, rp1_valve=False):
    """Starboard and port masts from MSFC-MAN-504 fig. 8-7; local hinge geometry estimated."""
    parts.node("Tail_Service_Masts")
    steel = parts("Tail_Service_Masts", "steel")
    for label, angle in (("1_2", -78), ("3_2", 78), ("3_4", 102)):
        ux, uy = cos(angle * pi / 180), sin(angle * pi / 180)
        axis = (ux, uy, 0)

        def point(radius, width, height, ux=ux, uy=uy):
            return (ux * radius - uy * width, uy * radius + ux * width, DECK + height)

        centre, pivot_height = 28.6, 22.6
        obox(steel, point(centre, 0, 0.54), axis, (0, 0, 1), (6.8, 5.8, 1.08))
        for dr in (-2.5, 2.5):
            for w in (-2.25, 2.25):
                beam(steel, point(centre + dr, w, 1.07), point(centre + dr * 0.77, w, 31.7), 0.38)
            for lo, hi in ((1.1, 11.8), (11.8, 21.05), (23.8, 28.4), (28.4, 31.65)):
                beam(steel, point(centre + dr * 0.83, -2.23, lo), point(centre + dr * 0.83, 2.23, hi), 0.24)
        for z in (11.8, 21.05, 28.4, 31.7):
            for w in (-2.25, 2.25):
                beam(steel, point(centre - 2.01, w, z), point(centre + 2.01, w, z), 0.29)
        boom = f"Tail_Boom_{label}"
        parts.node(boom, "Tail_Service_Masts", point(centre, 0, pivot_height))
        moving = parts(boom, "deck")
        obox(moving, point(26.7, 0, pivot_height), axis, (0, 0, 1), (17.7, 2.0, 1.38))
        obox(moving, point(33.8, 0, pivot_height), axis, (0, 0, 1), (4.3, 2.6, 1.68))
        # The carrier withdraws into the rotating boom's end as the boom rises.
        carrier = f"Tail_Carrier_{label}"
        parts.node(carrier, boom, point(17.35, 0, pivot_height))
        obox(parts(carrier, "steel"), point(17.67, 0, pivot_height), axis, (0, 0, 1), (2.28, 2.38, 1.99))
        hood_height = 33.7
        visor_shell(steel, point, centre, 2.81, hood_height, 2.29)
        for w in (-2.19, 2.19):
            beam(steel, point(centre, w, 31.4), point(centre, w, hood_height), 0.4)
        hood = f"Tail_Visor_{label}"
        parts.node(hood, "Tail_Service_Masts", point(centre, 0, hood_height))
        visor_shell(parts(hood, "deck"), point, centre, 2.48, hood_height, 1.97)

        if rp1_valve and label == "1_2":
            mast_fuel_valve(parts, point, boom, centre, pivot_height)


def mast_fuel_valve(parts, point, boom, centre, pivot_height):
    """RP-1 mast cutoff A18651, AS-509 evaluation §3.4.1. External fittings and routing are estimated."""
    node = "RP1_Mast_Cutoff"
    radius, side, height = centre + 1.05, -1.52, 10.1
    parts.node(node, "Tail_Service_Masts", point(radius, side, height))
    pipe = parts("Tail_Service_Masts", "deck/fuel_riser", True)
    flanges = parts(node, "deck/valve_flanges", True)
    valve = parts(node, "steel/valve_body", True)
    bolts = parts(node, "steel/flange_bolts", True)

    def tube(mesh, a, b, r):
        mesh.tube(P(*point(*a)), P(*point(*b)), r * FT)

    # A deck penetration, a flanged valve body and a pneumatic actuator on the side.
    tube(pipe, (radius, side, 1.04), (radius, side, pivot_height - 0.23), 0.32)
    tube(pipe, (radius, side, 1.12), (radius, side, 1.28), 0.52)
    for z in (height - 0.92, height - 0.58, height + 0.60, height + 0.94):
        tube(flanges, (radius, side, z - 0.08), (radius, side, z + 0.08), 0.52)
    tube(valve, (radius, side, height - 0.71), (radius, side, height + 0.75), 0.54)
    for z in (height - 0.92, height + 0.94):
        for i in range(8):
            a = i * pi / 4
            r, w = radius + 0.43 * cos(a), side + 0.43 * sin(a)
            tube(bolts, (r, w, z - 0.13), (r, w, z + 0.14), 0.055)
    tube(valve, (radius, side - 0.27, height), (radius, side - 1.04, height), 0.29)
    tube(flanges, (radius, side - 0.85, height), (radius, side - 1.62, height), 0.54)
    tube(valve, (radius, side - 1.55, height), (radius, side - 1.73, height), 0.59)
    for i in range(8):
        a = i * pi / 4
        r, z = radius + 0.47 * cos(a), height + 0.47 * sin(a)
        tube(bolts, (r, side - 1.68, z), (r, side - 1.79, z), 0.05)
    # The earlier flight's evaluation identifies the gas that controlled this valve.
    control = parts(node, "rail/pneumatic_line", True)
    tube(control, (radius, side - 1.27, height + 0.42), (radius, side - 1.27, height + 0.86), 0.09)
    tube(control, (radius, side - 1.27, height + 0.80), (radius + 0.76, side - 1.27, height + 0.9), 0.055)
    tube(control, (radius + 0.73, side - 1.27, height + 0.9), (radius + 0.94, side - 1.27, height - 0.90), 0.055)
    # The fixed pipe terminates at the trunnion. The delivery pipe rides on the boom
    # and meets the sliding carrier within the original steel umbilical envelope.
    tube(pipe, (radius, side, pivot_height - 0.29), (centre, side, pivot_height), 0.32)
    tube(pipe, (centre, side - 0.32, pivot_height), (centre, -1.18, pivot_height), 0.48)
    moving = parts(boom, "deck/delivery_pipe", True)
    tube(moving, (centre + 0.18, -1.17, pivot_height), (17.15, -1.17, pivot_height), 0.26)
    for r in (19.8, 23.6, 27.0):
        tube(moving, (r - 0.08, -1.17, pivot_height), (r + 0.08, -1.17, pivot_height), 0.36)
        beam(parts(boom, "steel/pipe_clamps"), point(r, -0.85, pivot_height + 0.3), point(r, -1.17, pivot_height + 0.3), 0.16)


def quench_valve(parts):
    """AS-507 flight evaluation §3.6.1 identifies the Industrial Water System valve on arm 2.
    Its dimensions, local mounting and discharge header are reconstructed.
    """
    z = DECK + 132
    name = "Arm2_Quench_Valve"
    parts.node(name, "Service_Arm_2", (47, 2.55, z + 2.3))
    water = parts(name, "steel", True)
    y, level = 2.55, z + 2.30
    header = parts("Service_Arm_2", "steel/quench_header", True)
    header.tube(P(21.2, y, level), P(52.0, y, level), 0.19 * FT)
    # The valve body interrupts the sprinkler header near the tower end of the arm.
    water.tube(P(45.8, y, level), P(48.2, y, level), 0.42 * FT)
    for x in (45.7, 48.35):
        water.tube(P(x - 0.08, y, level), P(x + 0.08, y, level), 0.62 * FT)
    bonnet = parts(name, "deck", True)
    bonnet.tube(P(46.95, y, level + 0.30), P(46.95, y, level + 1.09), 0.28 * FT)
    bonnet.tube(P(46.95, y, level + 0.99), P(46.95, y, level + 1.64), 0.51 * FT)
    for x in (22, 29, 36, 43):
        header.tube(P(x, y, level - 0.08), P(x, y, level - 0.65), 0.1 * FT)
    for x in (22.7, 34.7, 49.7):
        beam(parts("Service_Arm_2", "deck/quench_brackets"), (x, 1.8, z + 0.58), (x, y, level - 0.08), 0.17)


def intertank_carrier(parts):
    """SA-508 Flight Manual, figs. 4-13 and 8-8. Ground-side routing and carrier dimensions estimated."""
    z = DECK + 68
    parent = "Service_Arm_1"
    name = "Intertank_LOX_Carrier"
    parts.node(name, parent, (22, 0, z + 2.5))
    # The two six-inch stage lines terminate at the intertank. The pipe jackets,
    # collars and mounting are reconstructed on the ground side of that interface.
    pipes = parts(parent, "steel/fill_and_drain", True)
    fittings = parts(name, "deck", True)
    frame = parts(name, "steel")
    for y in (-0.78, 0.78):
        pipes.tube(P(24.4, y, z + 2.4), P(53.2, y, z + 2.4), 0.35 * FT)
        for x in (30, 42, 51):
            pipes.tube(P(x, y, z + 2.4), P(x + 0.26, y, z + 2.4), 0.43 * FT)
        fittings.tube(P(19.45, y, z + 2.4), P(24.5, y, z + 2.4), 0.31 * FT)
        for x in (19.50, 20.12, 24.15):
            fittings.tube(P(x, y, z + 2.4), P(x + 0.20, y, z + 2.4), 0.49 * FT)
        # The parallel links carry the plate. Keep the nose behind the truss tip.
        for x in (20.6, 23.1):
            beam(frame, (x, y, z + 0.56), (x + 0.64, y, z + 1.95), 0.22)
        beam(frame, (20.50, y, z + 0.65), (23.28, y, z + 0.65), 0.20)
        beam(frame, (21.05, y, z + 1.89), (23.90, y, z + 1.89), 0.23)
    # A common carrier frame holds both couplings between its upper and lower rails.
    for height in (1.81, 2.99):
        box(frame, (19.81, -1.43, z + height - 0.07), (20.08, 1.43, z + height + 0.07))
    for y in (-1.36, 0, 1.36):
        box(frame, (19.82, y - 0.07, z + 1.88), (20.07, y + 0.07, z + 2.92))
    for x in (21.24, 23.74):
        fittings.tube(P(x, -0.98, z + 1.94), P(x, 0.98, z + 1.94), 0.15 * FT)
    for y in (-0.78, 0.78):
        beam(frame, (19.96, y, z + 1.81), (21.24, y, z + 1.94), 0.20)
    for x in (30, 42, 51):
        for y in (-0.78, 0.78):
            beam(parts(parent, "deck/pipe_support"), (x + 0.12, y, z + 0.48), (x + 0.12, y, z + 2.11), 0.19)


def build(
    pad,
    *,
    detailed=False,
    arm2_quench=False,
    intertank_lox=False,
    rp1_valve=False,
    ecs_room=False,
    level200_purge=False,
    night_launch=False,
    skylab=False,
    side_hinge=False,
    pad_b_floodlights=False,
):
    use(FT)
    parts = Parts(
        {
            **(
                {
                    "xenon": material("lamp-flood-xenon", (0.91, 0.94, 1.0), 0.02, 0.13),
                    "mirror": material("chrome-reflector", (0.88, 0.89, 0.9), 0.95, 0.13),
                }
                if night_launch or pad_b_floodlights
                else {}
            ),
            "concrete": material("concrete-hardstand", (0.55, 0.53, 0.49), 0, 0.91),
            "earth": material("earth-sand", (0.4, 0.35, 0.27), 0, 0.95),
            "brick": material("ceramic-flame-chute", (0.36, 0.28, 0.23), 0.05, 0.89),
            "steel": material("steel-launcher", (0.23, 0.25, 0.26), 0.5, 0.64),
            "red": material("tower-red", (0.54, 0.075, 0.033), 0.21, 0.62),
            "deck": material("galvanised-deck", (0.34, 0.35, 0.35), 0.42, 0.65),
            "rail": material("galvanised-steel", (0.53, 0.55, 0.56), 0.5, 0.55),
            "white": material("paint-room-white", (0.85, 0.84, 0.81), 0.13, 0.62),
        }
    )
    hardstand(parts, pad, ecs_room)
    if ecs_room:
        ecs_room_front(parts)
    base(parts)
    if skylab:
        launch_pedestal(parts, DECK)
        pedestal_accessories(parts, DECK)
    elif detailed:
        articulated_holddowns(parts)
        articulated_tail_masts(parts, rp1_valve)
    else:
        holddowns(parts)
        tail_masts(parts)
    tower(parts, detailed, pedestal_bridge=skylab)
    arms(parts, detailed, skylab, side_hinge)
    if skylab:
        service_lines(parts, DECK)
    if pad_b_floodlights:
        skylab_floods(parts)
    if level200_purge:
        purge_console(parts)
    if arm2_quench:
        quench_valve(parts)
    if intertank_lox:
        intertank_carrier(parts)
    if night_launch:
        xenon_banks(parts)
        vent_disconnect(parts)
    parts.build()
    return "Mobile launcher: 160 by 135 ft base, 445 ft to crane on pad pedestals"
