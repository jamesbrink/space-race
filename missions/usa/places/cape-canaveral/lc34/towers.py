"""The fixed umbilical tower, its crew walkway and the mobile service structure."""

from math import pi

from sitelib import beam, box, fine, handrail, lamp_head, lattice, stair_rails, stairs, truss
from srlib import FT

from .site import CREW_LEVEL, SERVICE_HALF, SERVICE_PARK, SERVICE_TOP, TOWER_HALF, TOWER_TOP, TOWER_X, deck, footing, pipe, rails

TOWER_FLOORS = (27, 58, 89, 120, 151, 182, CREW_LEVEL, 234)
SERVICE_FLOORS = (29, 63, 95, 127, 159, 191, 223, 253, 277, 294)


def frame(mb, east, west, south, north, heights, column, brace, faces=(0, 1, 2, 3)):
    corners = [(west, south), (east, south), (east, north), (west, north)]
    lattice(mb, lambda i, z: (*corners[i], z), heights, column, brace, faces)


def cage(parts, parent, name, xa, xb, ya, yb, stops, opening):
    z = stops[0]
    parts.node(
        name,
        parent,
        ((xa + xb) / 2, (ya + yb) / 2, z),
        lift=1,
        stops=[(h - z) * FT for h in stops],
        stop_names=["Apron" if h == 0 else f"{h}-foot level" for h in stops],
    )
    deck(parts(name, "deck"), xa, xb, ya, yb, z)
    deck(parts(name, "steel"), xa - 0.08, xb + 0.08, ya - 0.07, yb + 0.07, z + 7.6)
    rails(parts(name, "galv"), xa + 0.1, xb - 0.1, ya + 0.1, yb - 0.1, z, open_side=opening)
    for x in (xa + 0.25, xb - 0.25):
        for y in (ya + 0.25, yb - 0.25):
            beam(parts(name, "red"), (x, y, z + 0.2), (x, y, z + 7.3), 0.28)
    members = parts(parent, "galv")
    for x in (xa - 0.31, xb + 0.31):
        y = (ya + yb) / 2
        beam(members, (x, y, z + 0.3), (x, y, stops[-1] + 8), 0.24)


def umbilical_tower(parts):
    node = "Umbilical_Tower"
    parts.node(node)
    x0, x1 = TOWER_X - TOWER_HALF, TOWER_X + TOWER_HALF
    for x in (x0, x1):
        for y in (-12, 12):
            footing(parts(node, "concrete"), x, y, 4.6)
    for base, top in [(0.25, 27), *zip(TOWER_FLOORS, TOWER_FLOORS[1:]), (234, TOWER_TOP - 0.31)]:
        key = "red"
        mid = (base + top) / 2
        faces = (1, 2) if base == CREW_LEVEL else (1, 2, 3)
        frame(parts(node, key), x1, x0, -12, 12, (base, mid, top), 0.98, 0.50, faces=faces)
        if base == CREW_LEVEL:
            for ya, yb in ((-12, -4.1), (4.1, 12)):
                beam(parts(node, key), (x0, ya, base + 0.28), (x0, yb, top - 0.28), 0.5)
        # Leave the elevator face open; its braces terminate to either side of the car.
        for xa, xb in ((x0, 40.6), (49.4, x1)):
            beam(parts(node, key), (xa, -12, base + 0.1), (xb, -12, top - 0.1), 0.40)
    for z in TOWER_FLOORS:
        steel = parts(node, "deck")
        deck(steel, x0 + 0.1, x1 - 0.1, -11.4, 11.4, z)
        if z == CREW_LEVEL:
            deck(steel, 29.06, x0 + 0.065, -3.15, 3.15, z + 0.025)
        deck(steel, 41, 49, -13, -11.45, z)
        if z != CREW_LEVEL:
            rails(parts(node, "galv"), x0 + 0.18, x1 - 0.18, -11.15, 10.9, z, open_side=0)
    cage(parts, node, "Tower_Lift", 41.1, 48.9, -19.0, -13.05, (0, *TOWER_FLOORS), 2)
    # The post-fire escape wire was a separate route from the elevator. Its photographed sag is approximated.
    points = [(34, -10, CREW_LEVEL), (183, -243, 167), (343, -486, 116), (505, -729, 72), (667, -972, 13)]
    for a, b in zip(points, points[1:]):
        pipe(parts(node, "steel/wire"), a, b, 0.075, 6)
    deck(parts(node, "deck/escape"), x0 - 3.1, x0, 4.0, 10.7, CREW_LEVEL)
    handrail(parts(node, "galv/escape"), [(x0, 10.65, CREW_LEVEL), (x0 - 3.04, 10.65, CREW_LEVEL)])
    parts.mark(node, "lamp", lens_out=1)
    if fine():
        for x in (55, 56.1, 56.8):
            for y in (8.6, 9.45):
                pipe(parts(node, "galv/pipes"), (x, y, 0.4), (x, y, 222.4), 0.19, 8)
        for z in (27, 89, 151, 220, 234):
            box(parts(node, "white/cabinets"), (50.2, 8.1, z + 0.31), (53.5, 10.7, z + 5.3))
            lamp_head(parts(node, "steel/flood"), parts(node, "lamp"), (34, -10.9, z + 6.8), (-1, 0, -0.5), size=1.15)
    # Small service jib and aviation beacons at the top, from the 42a plate.
    for y in (-6.25, -3.9):
        beam(parts(node, "steel"), (45, y, 238.9), (58.7, y, 239.3), 0.54)
        beam(parts(node, "steel"), (44.7, y, 238.65), (51.7, y, 234.15), 0.42)
    for x in (x0 + 0.5, x1 - 0.5):
        for y in (-11.5, 11.5):
            pipe(parts(node, "bulb"), (x, y, 239.39), (x, y, TOWER_TOP), 0.25, 8)
    for i, z in enumerate((99, 124, 167), 1):
        service_arm(parts, node, i, z)


def service_arm(parts, tower, i, z):
    node = f"Service_Arm_{i}"
    parts.node(node, tower, (33, 0, z))
    truss(parts(node, "red"), lambda i, x: (x, (-1.55, 1.55, 1.55, -1.55)[i], z + (-1.65, -1.65, 1.65, 1.65)[i]), (33, 26, 18, 11.8), 0.36, 0.22)
    deck(parts(node, "deck"), 12.3, 32.8, -1.47, 1.47, z - 0.8)
    box(parts(node, "plate"), (10.7, -1.7, z - 1.4), (12.1, 1.7, z + 1.6))
    for y in (-0.85, -0.28, 0.45):
        pipe(parts(node, "galv/pipes"), (11.2, y, z + 1.02), (32.7, y, z + 1.02), 0.13, 8)
    box(parts(node, "red"), (33.13, -1.86, z - 2.08), (33.94, 1.86, z + 2.08))


def white_room(parts):
    parent = "White_Room"
    node = "White_Room_Pivot"
    parts.node(parent)
    pivot = parts.node(node, parent, (29, 0, CREW_LEVEL))
    pivot.rotation_euler.z = pi / 2  # rest pose at liftoff; apply −90° in the viewer to reach the hatch
    z = CREW_LEVEL
    # The elevator stopped at 220 ft. That datum sits above the modeled hatch sill.
    # A short flight within the swing arm connects the tower deck to the estimated white-room floor.
    landing = z - 7
    parts.node("White_Room_Deck", node, (5.7, 0, landing))
    deck(parts("White_Room_Deck", "deck"), 5.7, 10.85, -3.15, 3.15, landing)
    deck(parts("White_Room_Deck", "deck"), 22.15, 28.86, -3.15, 3.15, z)
    stairs(parts("White_Room_Deck", "deck/stairs"), (10.85, 0, landing), (22.15, 0, z), 6.28)
    stair_rails(parts(node, "galv/stairs"), (10.85, 0, landing), (22.15, 0, z), 6.28)
    deck(parts(node, "white"), 5.62, 28.75, -3.67, 3.67, z + 7.65, thick=0.23)
    for y in (-3.62, 3.62):
        # Gallery plate shows a tubular frame and thin wall panels, with a wider box at the hatch.
        box(parts(node, "white"), (5.62, y - 0.13, landing - 0.06), (15.8, y + 0.13, z + 7.41))
        box(parts(node, "white"), (15.86, y - 0.11, z + 4.46), (28.72, y + 0.11, z + 7.39))
        for x in (16.3, 21.4, 24.4, 27.9):
            beam(parts(node, "galv/supports"), (x, y, z + 0.15), (x, y, z + 7.37), 0.18)
        handrail(parts(node, "galv"), [(22.34, y + (0.11 if y < 0 else -0.11), z), (28.8, y + (0.11 if y < 0 else -0.11), z)])
        for xa, xb in zip((7, 13, 19, 25), (13, 19, 25, 28.84)):
            beam(parts(node, "steel"), (xa, y, z - 2.7), (xb, y, z - 0.31), 0.36)
    parts.node("Light_White_Room", node, (9.6, 0, landing + 6.6), intensity=1.8, reach=8.1)
    for x in (10, 20, 28):
        box(parts(node, "white/lamp"), (x - 0.55, -0.22, z + 7.17), (x + 0.55, 0.22, z + 7.33))
    # Fire equipment was installed after Apollo 1. Its precise housing positions are unverified.
    box(parts(node, "red"), (8.4, 2.05, landing + 2.1), (9.6, 3.48, landing + 4.5))
    pipe(parts(node, "galv"), (10.5, 2.95, z + 6.55), (27.8, 2.95, z + 6.55), 0.14, 8)


def service_structure(parts):
    node = "Service_Structure"
    parts.node(node, origin=(SERVICE_PARK, 0, 0))
    x0, x1 = SERVICE_PARK - SERVICE_HALF[0], SERVICE_PARK + SERVICE_HALF[0]
    y0, y1 = -SERVICE_HALF[1], SERVICE_HALF[1]
    steel = parts(node, "steel")
    for south, north in ((y0 + 1.05, y0 + 35), (y1 - 35, y1 - 1.05)):
        # A clear central opening, a tall working facade and enclosed end leg elevator/stair shafts.
        tiers = (5.3, 29, 63, 95, 127, 159, 191, 223, 253, 277, 294, SERVICE_TOP - 2.3)
        for a, b in zip(tiers, tiers[1:]):
            frame(steel, x1 - 0.65, x0 + 0.65, south, north, (a, (a + b) / 2, b), 1.23, 0.70, faces=(0, 1, 2))
        for z in (4.8, *SERVICE_FLOORS):
            deck(parts(node, "deck"), x0 + 1.61, x1 - 1.6, south + 0.22, north - 0.23, z, thick=0.55)
            for yy in (south + 1.24, north - 1.22):
                if (yy < 0 and yy - south < 2) or (yy > 0 and north - yy < 2):
                    for xa, xb in (
                        (x0 + 2.25, SERVICE_PARK - 19.45),
                        (SERVICE_PARK - 12.55, SERVICE_PARK + 12.55),
                        (SERVICE_PARK + 19.45, x1 - 2.25),
                    ):
                        handrail(parts(node, "galv"), [(xa, yy, z), (xb, yy, z)])
                else:
                    handrail(parts(node, "galv"), [(x0 + 2.25, yy, z), (x1 - 2.25, yy, z)])
            for cx in (SERVICE_PARK - 16, SERVICE_PARK + 16):
                lo, hi = (south - 0.09, south + 0.17) if south < 0 else (north - 0.18, north + 0.09)
                deck(parts(node, "deck/sills"), cx - 3.24, cx + 3.24, lo, hi, z - 0.017, thick=0.23)
        # Hydraulic work platforms stowed inside the inverted U at the park site.
        away = south < 0
        front = north if away else south
        for i, z in enumerate(SERVICE_FLOORS[1:]):
            lo, hi = sorted((front, front + (4.2 if away else -4.2)))
            xa, xb = x0 + 4 + i % 2 * 2, x1 - 4
            deck(parts(node, "steel/platforms"), xa, xb, lo, hi, z - 0.24, thick=1.42)
            for x in (xa + 1, xb - 1):
                box(parts(node, "white/platforms"), (x - 0.60, lo, z - 0.12), (x + 0.6, hi, z + 6.8))
            if fine():
                for x in (xa + 1.6, xa + 11.6, xb - 3):
                    beam(steel, (x, front, z - 0.72), (x, (south + north) / 2, z - 10), 0.55)
        for k in range(2):
            cx = SERVICE_PARK + (-16 if k == 0 else 16)
            # Two cages per leg. Their sill enters the end of the working floor.
            lift_edge = south if away else north
            ya, yb = sorted((lift_edge, lift_edge + (-7 if away else 7)))
            cage(
                parts,
                node,
                f"Service_Lift_{'N' if not away else 'S'}{k + 1}",
                cx - 3.3,
                cx + 3.3,
                ya,
                yb,
                (0, 4.8, *SERVICE_FLOORS),
                2 if away else 0,
            )
        f = (x0 - 8, (south + north) / 2, 0)
        t = (x0 + 1, (south + north) / 2, 4.8)
        stairs(parts(node, "deck/stairs"), f, t, 5.0)
        stair_rails(parts(node, "galv"), f, t, 5.0)
        box(parts(node, "steel/base"), (x0 + 1.2, south + 0.3, 0.43), (x1 - 1.1, north - 0.3, 4.21))
    # High bridge carries the hoist; sloping struts narrow to the crane crown in the 1965 aerial.
    deck(parts(node, "steel/roof"), x0 + 0.17, x1 - 0.17, -29.65, 29.65, 294.041, thick=1.16)
    deck(parts(node, "steel/roof"), x0 + 12.5, x1 - 12.5, -37.5, 37.5, SERVICE_TOP, thick=0.72)
    for y in (-48.2, -29.2, -10, 10, 29.2, 48.2):
        top_y = max(-36.5, min(36.5, y))
        for e in (-1, 1):
            beam(parts(node, "steel/roof"), (SERVICE_PARK + e * 32.7, y, 294.25), (SERVICE_PARK + e * 21.9, top_y, 309.6), 0.68)
    parts.ladder(node, "crane", (x0 + 11.8, 18, 294), (x0 + 11.8, 18, SERVICE_TOP), face=(1, 0, 0), mat="galv")
    truss(
        parts(node, "steel/bridge"),
        lambda i, y: ((x0 + 1, x1 - 1, x1 - 1, x0 + 1)[i], y, (294.5, 294.5, 308.22, 308.22)[i]),
        (-63, -45, -30, -15, 0, 15, 30, 45, 63),
        0.87,
        0.48,
    )
    for cx in (SERVICE_PARK - 16, SERVICE_PARK + 17):
        pipe(parts(node, "steel/cranes"), (cx, -20, 306.8), (cx, 20, 306.8), 0.55)
        for y in (-17, 16):
            pipe(parts(node, "steel/cranes"), (cx, y, 306.1), (cx, y, 287.5), 0.13, 8)
            box(parts(node, "yellow"), (cx - 0.9, y - 0.65, 286.4), (cx + 0.9, y + 0.65, 288))
    for truck, (cx, y) in enumerate(((x0 + 8, -56), (x1 - 8, -56), (x0 + 8, 56), (x1 - 8, 56))):
        box(parts(node, "steel/trucks"), (cx - 9.5, y - 4.7, 1.9), (cx + 9.5, y + 4.7, 5.18))
        for axle in range(6):
            x = cx + (axle - 2.5) * 3.22
            for side in range(2):
                wy = y + (side * 2 - 1) * 3
                wheel = f"Service_Wheel_{truck * 12 + axle * 2 + side}"
                parts.node(wheel, node, (x, wy, 1.71))
                pipe(parts(wheel, "steel"), (x, wy - 0.50, 1.71), (x, wy + 0.50, 1.71), 1.50, 18)
                if fine():
                    pipe(parts(wheel, "galv"), (x, wy - 0.58, 1.71), (x, wy + 0.58, 1.71), 0.56, 12)
