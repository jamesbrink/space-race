"""The buildings and propellant areas around the launch apron, in their October 1968 forms."""

from math import cos, hypot, pi, sin

from mathutils import Matrix

from sitelib import beam, box, door, fine, handrail, hull, lamp_head, obox, slab, stair_rails, stairs
from srlib import FT

from .site import GROUND, P, circle, deck, footing, image_at, pipe, rails

BLOCKHOUSE = image_at((339, 905))
LOX = image_at((648, 304))
RP1 = image_at((605, 632))
LH2 = image_at((656, 804))
OSB = image_at((223, 1018))
ROAD = [
    (428, 32),
    (487, 184),
    (484, 252),
    (433, 325),
    (357, 450),
    (270, 590),
    (159, 802),
    (147, 855),
    (171, 900),
    (274, 967),
    (342, 1012),
    (403, 1011),
    (684, 879),
    (824, 815),
    (943, 755),
]


def road_strip(mb, pixels, width, height):
    points = [image_at(xy) for xy in pixels]
    loops = []
    for i, (x, y) in enumerate(points):
        a, b = points[max(i - 1, 0)], points[min(len(points) - 1, i + 1)]
        d = hypot(b[0] - a[0], b[1] - a[1])
        dx, dy = (b[1] - a[1]) / d * width / 2, -(b[0] - a[0]) / d * width / 2
        loops.append([(x - dx, y - dy, GROUND - 0.3), (x - dx, y - dy, height), (x + dx, y + dy, height), (x + dx, y + dy, GROUND - 0.3)])
    hull(mb, loops)


def roads(parts):
    node = "Roads"
    parts.node(node)
    for i, pixels in enumerate(
        [
            ROAD,
            [(480, 243), (519, 299), (547, 337), (551, 407)],
            [(438, 315), (482, 303), (522, 310), (649, 376), (766, 445), (858, 507), (891, 536)],
            [(277, 598), (334, 634), (367, 674)],
            [(348, 700), (458, 576), (471, 554)],
            [(693, 875), (701, 830), (681, 773), (638, 659), (606, 577), (600, 568)],
        ]
    ):
        road_strip(parts(node, "asphalt"), pixels, 17.0 if i == 0 else 13.0, -0.17 + i * 0.015)
    # The rails run through this concrete rectangle to the MSS parked position.
    deck(parts(node, "concrete"), -655, -496, -78, 78, -0.05, thick=0.82)
    # Sleepers under the four rail heads, only on the grade beyond the circular concrete mat.
    if fine():
        for x in range(-648, -200, 6):
            for y in (-56, 56):
                box(parts(node, "steel/ties"), (x - 0.38, y - 4.25, -0.28), (x + 0.38, y + 4.25, -0.035))
    ax, ay = BLOCKHOUSE
    # The cable route follows the narrow diagonal line still visible on satellite imagery.
    road_strip(parts(node, "concrete/cableway"), [(365, 885), (481, 624), (505, 577)], 3.4, -0.041)
    x, y = image_at((873, 538))
    footing(parts(node, "concrete/egress"), x, y, 8.0, 0.1)
    for side in (-1, 1):
        beam(parts(node, "steel/egress"), (665, -972 + side * 3, 0), (667, -972, 13), 0.61)
    # Burn pond and low retaining curb near the launch apron, seen in the press-kit plan.
    x, y = image_at((591, 618))
    deck(parts(node, "water"), x - 13.6, x + 13.6, y - 17.6, y + 17.6, -0.09)
    for p in (-1, 1):
        box(parts(node, "concrete/pond"), (x - 15, y + p * 19 - 1.22, -0.42), (x + 15, y + p * 19 + 1.22, 0.81))
        box(parts(node, "concrete/pond"), (x + p * 15.4 - 1.12, y - 17.77, -0.42), (x + p * 15.4 + 1.12, y + 17.77, 0.81))


def floods(parts):
    node = "Floodlights"
    parts.node(node)
    for i, (x, y) in enumerate(((-116, -105), (-96, 101), (134, -79), (148, 71))):
        pole = f"Apron_Flood_{i + 1}"
        parts.node(pole, node, (x, y, 0))
        footing(parts(pole, "concrete"), x, y, 2.1, top=0.23)
        pipe(parts(pole, "timber"), (x, y, 0.14), (x, y, 28.8), 0.43, 12)
        beam(parts(pole, "steel"), (x, y - 2.7, 26.4), (x, y + 2.7, 26.4), 0.23)
        for out in (-2.2, 0, 2.2):
            lamp_head(parts(pole, "steel"), parts(pole, "apron_lamp"), (x, y + out, 27.4), (-x, -y, 112), size=0.83)
        parts.mark(pole, "apron_lamp", lens_out=1, candela=270_000, spread=58)


def blockhouse(parts):
    node = "Blockhouse"
    x, y = BLOCKHOUSE
    parts.node(node, origin=(x, y, 0))
    dome = parts(node, "concrete", True)
    at = Matrix.Translation(P(x, y, 0))
    # South-west entrance tunnel opens into a shell with two reachable storeys.
    entry = pi
    entry_half = 0.078
    outer = [(50, -0.65), (50, 2.4), (47, 11), (44, 20), (35, 29), (22, 35), (7, 37.2), (0, 37.25)]
    inner = [(42, 0.35), (41.7, 7), (37, 16), (31, 24), (24, 28), (13, 29.7), (0, 30.25)]
    dome.lathe([(r * FT, z * FT) for r, z in outer], 96, matrix=at, arc=(entry + entry_half, entry + 2 * pi - entry_half))
    dome.lathe([(r * FT, z * FT) for r, z in inner], 96, matrix=at, arc=(entry + entry_half, entry + 2 * pi - entry_half), flip=True)
    dome.lathe([(r * FT, z * FT) for r, z in outer[2:]], 14, matrix=at, arc=(entry - entry_half, entry + entry_half))
    upper_inner = [(41, 9), *inner[2:]]
    dome.lathe([(r * FT, z * FT) for r, z in upper_inner], 14, matrix=at, arc=(entry - entry_half, entry + entry_half), flip=True)
    slab(parts(node, "deck"), circle(41.8, 80, x, y), -0.33, 0.41)
    # The stair arrives through a gap at the west edge of the upper floor.
    deck(parts(node, "deck/up"), x - 16.0, x + 22.0, y - 17.8, y + 17.8, 12.5, 0.66)
    deck(parts(node, "deck/up"), x - 25.0, x - 16.04, y - 17.75, y - 5.8, 12.5, 0.66)
    deck(parts(node, "deck/up"), x - 25.0, x - 16.04, y + 5.8, y + 17.75, 12.5, 0.66)
    f, t = (x - 35.7, y, 0.41), (x - 16.02, y, 12.5)
    stairs(parts(node, "steel/stairs"), f, t, 4.5)
    stair_rails(parts(node, "galv"), f, t, 4.5)
    rails(parts(node, "galv/up"), x - 15.72, x + 21.65, y - 17.55, y + 17.55, 12.5, open_side=3)
    deck(parts(node, "concrete/tunnel"), x - 78, x - 40.6, y - 5.4, y + 5.4, 0.405)
    deck(parts(node, "concrete/tunnel"), x - 69, x - 40.5, y - 5.4, y + 5.4, 10.8, thick=2.15)
    for s in (-1, 1):
        a, b = sorted((y + s * 3.5, y + s * 5.3))
        box(parts(node, "concrete/tunnel"), (x - 69, a, 0.44), (x - 40.3, b, 8.62))
    door(parts, "Blockhouse_Door", node, (x - 67.9, y - 3.37, 0.43), (0, 1, 0), 6.66, 8, swing=96, fittings="lever")
    # Individual control benches and bays make the two storeys legible up close.
    for z, rows, depth in ((0.41, (-16, 13), 24), (12.5, (-12, -3, 8, 14), 16)):
        for row in rows:
            for i in range(-depth // 2, depth // 2, 4):
                obox(parts(node, "steel/consoles"), (x + i, y + row, z + 1.43), (1, 0, 0), (0, 0, 1), (3.87, 1.65, 2.84))
                obox(parts(node, "galv/consoles"), (x + i, y + row + 0.24, z + 3.01), (1, 0, 0), (0, -0.46, 1), (3.79, 1.48, 0.33))
                if fine():
                    for u in (-0.92, -0.52, -0.12, 0.26, 0.66, 1.10):
                        box(parts(node, "black/controls"), (x + i + u, y + row - 0.32, z + 3.14), (x + i + u + 0.15, y + row - 0.21, z + 3.26))
            box(parts(node, "lamp/interior"), (x - depth / 2, y + row - 0.2, z + 8.86), (x + depth / 2, y + row + 0.2, z + 9.1))
    for i, (cx, cy, cz) in enumerate(((-22, 5, 8), (14, -12, 8), (-6, 1, 20), (16, 14, 20))):
        parts.node(f"Light_Blockhouse_{i}", node, (x + cx, y + cy, cz), reach=10, intensity=4.8)
    # Roof observation deck and exterior stairs are visible in the HAER photography.
    deck(parts(node, "deck/observation"), x - 13, x + 11, y - 17, y + 10, 37.53)
    rails(parts(node, "galv/observation"), x - 12.84, x + 10.86, y - 16.86, y + 9.86, 37.53, open_side=3)
    # Switchbacks reach the observation deck clear of the concrete dome.
    for a, b in (
        ((x - 79, y + 7.6, 0), (x - 58, y + 7.6, 12.5)),
        ((x - 57, y + 9.95, 12.5), (x - 57, y + 27.0, 25)),
        ((x - 54.6, y + 27.0, 25), (x - 35.4, y + 27.0, 37.53)),
    ):
        stairs(parts(node, "steel/roof_stairs"), a, b, 4.2)
        stair_rails(parts(node, "galv/roof_stairs"), a, b, 4.2)
    deck(parts(node, "deck/roofsill"), x - 58.25, x - 54.79, y + 5.43, y + 9.99, 12.5)
    deck(parts(node, "deck/roofsill"), x - 59.12, x - 54.58, y + 26.73, y + 29.18, 25)
    deck(parts(node, "deck/roofsill"), x - 35.5, x - 13.05, y + 24.85, y + 29.14, 37.53)
    deck(parts(node, "deck/roofsill"), x - 17.65, x - 13.032, y + 7.47, y + 24.79, 37.551)
    handrail(parts(node, "galv/roofsill"), [(x - 35.6, y + 29.1, 37.53), (x - 13.19, y + 29.1, 37.53), (x - 13.19, y + 10.3, 37.55)])
    handrail(parts(node, "galv/roofsill"), [(x - 35.7, y + 24.87, 37.53), (x - 17.6, y + 24.87, 37.53), (x - 17.6, y + 7.51, 37.55)])
    for k in range(3):
        z = 38.4 + 1.24 * k
        pipe(parts(node, "galv/periscope"), (x + 7.5, y - 6.8 + k * 2.1, 37.55), (x + 7.5, y - 6.8 + k * 2.1, z + 0.5), 0.46, 10)
        pipe(parts(node, "galv/periscope"), (x + 7.58, y - 6.8 + k * 2.1, z + 0.15), (x + 9, y - 6.8 + k * 2.1, z + 0.15), 0.42, 10)


def sphere(parts, node, center, diameter):
    x, y, z = center
    radii = [(diameter / 2 * sin(pi * i / 20), -diameter / 2 * cos(pi * i / 20)) for i in range(21)]
    parts(node, "tank", True).lathe([(r * FT, h * FT) for r, h in radii], 48, matrix=Matrix.Translation(P(x, y, z)))
    for a, b in circle(diameter * 0.32, 4, x, y):
        footing(parts(node, "concrete"), a, b, 3.55, top=0.65)
        beam(parts(node, "steel"), (a, b, 0.63), (a, b, z - diameter * 0.31), 1.1)
        beam(parts(node, "steel"), (a, b, 0.95), (x + (a - x) * 0.69, y + (b - y) * 0.69, z - diameter * 0.36), 0.41)
    pipe(parts(node, "galv"), (x, y, z + diameter / 2 - 0.21), (x, y, z + diameter / 2 + 3.3), 0.42, 8)


def tank(parts, node, xy, length, diameter):
    x, y = xy
    z = diameter / 2 + 2.25
    pipe(parts(node, "tank", True), (x - length / 2, y, z), (x + length / 2, y, z), diameter / 2, 40)
    for a in (-0.33, 0.33):
        s = x + length * a
        box(parts(node, "concrete"), (s - 1.3, y - diameter * 0.36, -0.31), (s + 1.3, y + diameter * 0.36, 3.95))
    pipe(parts(node, "galv"), (x, y, z + diameter / 2 - 0.03), (x, y, z + diameter / 2 + 2.2), 0.47, 12)


def propellant(parts):
    node = "Propellant_Areas"
    parts.node(node)
    for name, xy, diameter in (("LOX_Storage", LOX, 41.25), ("Hydrogen_Storage", LH2, 38), ("RP1_Storage", RP1, None)):
        x, y = xy
        parts.node(name, node, (x, y, 0))
        deck(parts(name, "concrete"), x - 39, x + 39, y - 28, y + 28, -0.11, thick=0.7)
        if diameter:
            sphere(parts, name, (x - 9, y, diameter / 2 + 4.3), diameter)
            if name == "LOX_Storage":
                tank(parts, name, (x + 24, y), 23, 11)
        else:
            for s in (-1, 1):
                tank(parts, name, (x, y + s * 9.1), 41, 11)
        if fine():
            for i in range(3):
                py = y - 17.75 + i * 3.0
                pipe(parts(name, "galv"), (x - 38.7, py, 1.75), (x - 0.3, py, 1.75), 0.36 - i * 0.064, 10)
                pipe(parts(name, "galv"), (x - 38.6, py, 1.75), (x - 38.6, py, 0.17), 0.36 - i * 0.064, 10)
    for name, xy in (("Gaseous_Nitrogen", image_at((672, 449))), ("High_Pressure_Hydrogen", image_at((685, 683)))):
        x, y = xy
        parts.node(name, node, (x, y, 0))
        deck(parts(name, "concrete"), x - 22, x + 22, y - 9, y + 9, 0.08)
        for p in range(3):
            yy = y - 4.8 + p * 4.8
            pipe(parts(name, "steel"), (x - 18.6, yy, 2.15), (x + 18.6, yy, 2.15), 1.16, 16)
        for u in (-11.5, 11.5):
            box(parts(name, "concrete/stands"), (x + u - 0.8, y - 6.7, 0.10), (x + u + 0.8, y + 6.7, 1.35))


def operations(parts):
    node = "Operations_Support"
    x, y = OSB
    parts.node(node, origin=(x, y, 0))
    # HAER FL-8-AN, photos 1–4 and sheet 2, shows the single-storey roof and attached wing.
    for k, (xa, xb, ya, yb, h) in enumerate(
        [
            (x - 89, x + 70, y - 45, y + 46, 15),
            (x + 73, x + 121, y - 14, y + 34, 13),
        ]
    ):
        deck(parts(node, "concrete"), xa - 4.5, xb + 4.5, ya - 3, yb + 3, 0.12)
        box(parts(node, "white"), (xa, ya, 0.15), (xb, yb, h - 0.4))
        deck(parts(node, "asphalt"), xa - 0.31, xb + 0.31, ya - 0.31, yb + 0.31, h, thick=0.63)
        for n in range(1, 7 if k == 0 else 3):
            u = xa + n * (xb - xa) / (7 if k == 0 else 3)
            box(parts(node, "steel"), (u - 2.1, ya - 0.22, 3.62), (u + 2.1, ya - 0.04, 9.15))
            box(parts(node, "glass"), (u - 1.76, ya - 0.27, 3.9), (u + 1.76, ya - 0.23, 8.86))
