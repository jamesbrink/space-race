"""Apollo-era Launch Complex 39. Dimensions in feet from the hardstand top."""

from math import cos, pi, sin

from mathutils import Matrix

from sitelib import P, Parts, beam, box, fine, handrail, hull, lattice, obox, stair_rails, stairs, truss, use  # noqa: E402
from srlib import FT, material  # noqa: E402

DECK = 22 + 25
# Tower levels above the launcher deck. Floor widths and structural sections are reconstructed.
LEVELS = [0, 30, 60, *range(80, 361, 20)]
CORNERS = [(60, -15), (100, -15), (100, 15), (60, 15)]


def hardstand(parts, pad):
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


def tower(parts):
    parts.node("Umbilical_Tower")
    frame = parts("Umbilical_Tower", "red")
    for lo, hi in zip(LEVELS, [*LEVELS[1:], 380]):
        lattice(frame, lambda i, z: (*CORNERS[i], z), [DECK + lo, DECK + hi], 1.15, 0.55, faces=(0, 1, 2) if lo == 320 else (0, 1, 2, 3))
    for z in LEVELS[1:]:
        box(parts("Umbilical_Tower", "deck"), (59.3, -15.7, DECK + z + 0.58), (100.7, 15.7, DECK + z + 0.85))
        if fine():
            handrail(
                parts("Umbilical_Tower", "rail"),
                [(59.6, -15.4, DECK + z + 0.85), (100.4, -15.4, DECK + z + 0.85), (100.4, 15.4, DECK + z + 0.85), (81.2, 15.4, DECK + z + 0.85)],
            )
    # Access stairs to the deck; one of the tower elevator cars is exposed for walking.
    stairs(parts("Launcher_Base", "deck/stair"), (42, 88, 0), (110, 88, DECK), 5)
    stair_rails(parts("Launcher_Base", "rail/stair"), (42, 88, 0), (110, 88, DECK), 5)
    box(parts("Launcher_Base", "deck/landing"), (107.5, 66.9, DECK - 0.36), (112.5, 91, DECK + 0.08))
    lift = "Tower_Lift"
    stops = [0, *[v + 0.85 for v in LEVELS if 0 < v <= 340]]
    parts.node(
        lift,
        "Umbilical_Tower",
        (77, 20, DECK),
        lift=1,
        stops=[v * FT for v in stops],
        stop_names=["Deck" if v == 0 else f"Level {int(v)}" for v in stops],
    )
    box(parts(lift, "deck"), (73, 15.8, DECK + 0.03), (81, 24, DECK + 0.3))
    for x in (73.2, 80.8):
        for y in (16, 23.8):
            beam(parts(lift, "red"), (x, y, DECK + 0.3), (x, y, DECK + 7.8), 0.32)
    box(parts(lift, "steel"), (72.95, 15.75, DECK + 7.8), (81.05, 24.05, DECK + 8.25))
    # Enclosed twin elevator shaft inside the open lattice.
    box(parts("Umbilical_Tower", "steel"), (79, -5, DECK + 0.02), (88, 6, DECK + 348))
    parts.node("Hammerhead_Crane")
    crane = parts("Hammerhead_Crane", "red")
    box(crane, (76, -5, DECK + 360), (84, 5, DECK + 386))
    truss(crane, lambda i, x: (x, (-3, 3, 3, -3)[i], DECK + (387, 387, 398, 398)[i]), range(-5, 124, 8), 0.63, 0.38)
    beam(parts("Hammerhead_Crane", "steel"), (-4, 0, DECK + 387), (-4, 0, DECK + 376), 0.25)


def arms(parts):
    # Service envelopes approximated from the Saturn V flight manual, section VIII.
    for i, (level, tip) in enumerate(
        ((68, 16.65), (132, 16.65), (150, 16.65), (175, 16.65), (215, 16.65), (245, 10.9), (276, 10.9), (304, 6.5), (320, 8)), 1
    ):
        name = f"Service_Arm_{i}"
        z = DECK + level
        parts.node(name, origin=(60, 0, z))
        if i == 9:
            # The arm leaves level 320. The lower hatch sill on the flown CSM exhibits is 326.4 ft
            # above the engine exits. The rise and its stair arrangement are reconstructed.
            floor = parts(name, "deck")
            truss(parts(name, "red"), lambda k, x: (x, (-3, 3, 3, -3)[k], z + (0, 0, 8.4, 8.4)[k]), [30, 45, 60], 0.39, 0.22)
            box(floor, (30, -2.8, z + 0.19), (59.95, 2.8, z + 0.44))
            stairs(floor, (30, 0, z + 0.44), (12, 0, z + 6.4), 5.5)
            stair_rails(parts(name, "rail"), (30, 0, z + 0.44), (12, 0, z + 6.4), 5.5)
            box(floor, (4.65, -3, z + 6.06), (12, 3, z + 6.4))
            room = parts(name, "white")
            for y in (-3.1, 2.9):
                box(room, (4.65, y, z + 6.45), (12, y + 0.2, z + 14.1))
            box(room, (4.65, -3.15, z + 14.1), (12, 3.15, z + 14.37))
        else:
            truss(parts(name, "red"), lambda k, x: (x, (-2, 2, 2, -2)[k], z + (0, 0, 5, 5)[k]), [tip, (tip + 60) / 2, 60], 0.39, 0.22)
            box(parts(name, "deck"), (tip, -1.89, z + 0.2), (59.95, 1.89, z + 0.44))


def build(pad):
    use(FT)
    parts = Parts(
        {
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
    hardstand(parts, pad)
    base(parts)
    parts.node("Holddown_Arms")
    for i in range(4):
        theta = pi / 4 + i * pi / 2
        u = (cos(theta), sin(theta), 0)
        for radius, z, size in ((34, 1.4, (8, 5, 2.8)), (32, 7.5, (4, 4, 10)), (17, 18.7, (2.4, 3.2, 1.2))):
            obox(parts("Holddown_Arms", "steel"), (radius * u[0], radius * u[1], DECK + z), u, (0, 0, 1), size)
        beam(parts("Holddown_Arms", "steel"), (32 * u[0], 32 * u[1], DECK + 12), (17 * u[0], 17 * u[1], DECK + 18.6), 2.4)
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
    tower(parts)
    arms(parts)
    parts.build()
    return "Mobile launcher: 160 by 135 ft base, 445 ft to crane on pad pedestals"
