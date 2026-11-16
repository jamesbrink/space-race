"""The rest of Complex 19, round the stand: the flume and its skimming basin, the blockhouse and the cableway to
it, the two propellant holding areas with their transfer lines, the roads, the buildings, the fence.

What stood there is documented, by Martin's diagram of the complex (NASA's *Project Gemini*, 1966, p. 40; the same
drawing is in Martin's press handbook, p. 7-5) and the handbook's chapter 7, which also gives the distances and the
sizes quoted below. Where each thing lay is measured off present-day imagery of what is left of it (Esri World
Imagery) in the stand's frame, and agrees with the handbook's distances to a few tens of feet; the forms are read off
the handbook's aerial photograph (p. 7-4), S65-49568 and S65-21520, and are estimated: ../lc-19.md.

Everything here stands on the land, 28 ft under the deck (site.GROUND), with its paving 12 cm over it and its
footings below. The land is level in the viewer, so the flume and the basin, which were cut and banked, are built
standing on it: a floor between two kerbs.
"""

from __future__ import annotations

import math

from mathutils import Matrix

from srlib import FT

from .site import (
    APRON,
    BASIN,
    BLOCKHOUSE,
    CABLEWAY_AT,
    DECK_NORTH,
    DECK_Y,
    DECONTAMINATION,
    FOOTING,
    FUEL_AREA,
    GROUND,
    OXIDIZER_AREA,
    PAVED,
    RAMP_FOOT,
    STAND_Y,
    P,
    Parts,
    beam,
    box,
    building,
    flat_roof,
    hull,
    obox,
    ring,
    slab,
    stood,
    wall_door,
)

HB = "Martin's press handbook, ch. 7"
# the perimeter road's middle line, clockwise from the north (measured off imagery: each point to some 15 ft)
LOOP = [
    (-436, 16), (-372, 253), (-345, 415), (-220, 464), (-16, 416), (128, 382), (292, 290), (425, 131), (511, 20),
    (579, -90), (500, -230), (320, -480), (160, -660), (73, -737), (-20, -800), (-133, -719), (-250, -470), (-360, -200),
]  # fmt: skip
ROAD_HALF = 9.0
WALL = 1.0  # the cableway's walls (documented)
ANNEX = (105.0, STAND_Y[1] + 1.5, 220.0, STAND_Y[1] + 31.5)  # the long low building under the stand's east wall (S65-49568)


def strip(mb, pts, half: float, z0: float, z1: float, closed: bool = False) -> None:
    """Paving along a line of points (x, y): `half` either side of it, mitred, from z0 to z1. `closed`: a ring."""
    n = len(pts)
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a = pts[(i - 1) % n] if closed else pts[max(i - 1, 0)]
        b = pts[(i + 1) % n] if closed else pts[min(i + 1, n - 1)]
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        nx, ny = -(b[1] - a[1]) / d, (b[0] - a[0]) / d
        left.append((x + nx * half, y + ny * half))
        right.append((x - nx * half, y - ny * half))
    loops = [[(rx, ry, z0), (rx, ry, z1), (lx, ly, z1), (lx, ly, z0)] for (lx, ly), (rx, ry) in zip(left, right)]
    if closed:
        loops.append(loops[0])
    hull(mb, loops, caps=(not closed, not closed))


def flume(parts: Parts) -> None:
    """The flume: "553 feet long", it carried the engines' flame and "25,000 gallons of water per minute" from the
    flame bucket north to the skimming basin, which holds half a million gallons (the handbook, pp. 7-2 and 7-10)."""
    g = "Flume"
    parts.node(g, None, (DECK_NORTH - 100.0, 12.0, GROUND), label="Flume")
    conc, kerb = parts(g, "concrete"), parts(g, "concrete/kerbs")
    y0, y1 = DECK_Y[0] - 2.0, DECK_Y[1] + 2.0
    x0 = DECK_NORTH - 4.0
    # the apron under the ducts' mouths: as wide as the stand, widening, then drawn in to the channel
    apron = [(x0, y0), (x0 - 95.0, y0 - 15.0), (x0 - 195.0, 1.0), (x0 - 195.0, 23.0), (x0 - 95.0, y1 + 4.0), (x0, y1)]
    slab(conc, apron[::-1], FOOTING, APRON, bottom=False)
    for a, b in ((apron[0], apron[1]), (apron[1], apron[2]), (apron[3], apron[4]), (apron[4], apron[5])):
        strip(kerb, [a, b], 0.75, FOOTING, APRON + 3.0)
    # the channel to the basin, and the basin: a floor, kerbs, water standing in it
    xc = x0 - 195.0
    box(conc, (BASIN[1], 1.75, FOOTING), (xc, 22.25, PAVED))
    for y in (1.0, 23.0):
        box(kerb, (BASIN[1], y - 0.75, FOOTING), (xc, y + 0.75, GROUND + 3.0))
    bx0, bx1, by0, by1 = BASIN
    box(conc, (bx0, by0, FOOTING), (bx1, by1, GROUND + 0.2))
    for xa, ya, xb, yb in (
        (bx0 - 1.0, by0 - 1.0, bx1, by0),
        (bx0 - 1.0, by1, bx1, by1 + 1.0),
        (bx0 - 1.0, by0, bx0, by1),
        (bx1, by0 - 1.0, bx1 + 1.0, 0.25),
        (bx1, 23.75, bx1 + 1.0, by1 + 1.0),
    ):
        box(kerb, (xa, ya, FOOTING), (xb, yb, GROUND + 4.0))
    box(parts(g, "water"), (bx0 + 0.3, by0 + 0.3, GROUND + 0.5), (bx1 - 0.3, by1 - 0.3, GROUND + 2.6))


def roads(parts: Parts) -> None:
    """The roads: the loop round the complex, the road to the ramp's foot, the roads to the two holding areas ("modify
    south road to accommodate fuel and oxidizer holding areas": Martin's list of the changes for Gemini) and the one
    from the stand's foot north-west. Their lines are what is on the ground today; their surface, crushed shell, is
    the Cape's usual one and is not read of these."""
    g = "Roads"
    parts.node(g, None, (0.0, 0.0, GROUND), label="Roads")
    shell = parts(g, "shell")
    strip(shell, LOOP, ROAD_HALF, FOOTING, PAVED + 0.34, closed=True)
    for line, half in (
        ([(RAMP_FOOT - 2.0, 12.0), (505.0, 14.0)], 14.0),  # from the ramp's foot to the loop
        ([(149.0, 129.0), (260.0, 134.0), (366.0, 141.0), (418.0, 136.0)], 7.5),  # past the oxidizer holding area
        ([(60.0, STAND_Y[1] + 34.0), (20.0, 150.0), (13.0, 404.0)], 7.5),  # east, toward the fuel holding area
        ([(60.0, STAND_Y[1] + 34.0), (149.0, 129.0)], 7.5),
        ([(-42.0, -70.0), (-289.0, -334.0)], 7.5),  # from the stand's foot north-west to the loop
        ([(20.0, STAND_Y[0] - 30.0), (-42.0, -70.0)], 7.5),
        ([(-436.0, 16.0), (-560.0, -22.0)], 6.0),  # the road north along the flume: "a new road ... for delivery of the LH2"
    ):
        strip(shell, line, half, FOOTING, PAVED + 0.17)
    # hardstanding at the stand's foot, both sides (the handbook's aerial view: pale ground with vehicles on it)
    for ya, yb in ((STAND_Y[0] - 62.0, STAND_Y[0] - 1.0), (STAND_Y[1] + 33.0, STAND_Y[1] + 62.0)):
        box(shell, (0.0, ya, FOOTING), (105.0, yb, PAVED))


def blockhouse(parts: Parts) -> None:
    """The blockhouse: a dome of reinforced concrete "about 156 feet in diameter and 50 feet high", its walls "40
    feet thick at the base", under sand; two floors, 75 and 64 ft across; one door, "sliding steel, 9 feet tall, 10
    feet wide, 2 feet thick", 20 tons (the handbook, pp. 7-3 and 7-7). What is inside is not built: the door is shut."""
    g = "Blockhouse"
    bx, by = BLOCKHOUSE
    parts.node(g, None, (bx, by, GROUND), label="Blockhouse")
    at = Matrix.Translation(P(bx, by, GROUND))
    dome = [(92.0, -1.0), (78.0, 3.0), (60.0, 21.0), (40.0, 37.0), (22.0, 46.0), (9.0, 49.5), (0.0, 50.0)]
    parts(g, "sand", True).lathe([(r * FT, z * FT) for r, z in dome], 40, matrix=at)
    conc = parts(g, "white")
    # what shows of the concrete: a cap at the crown with its vents and periscope, and the entrance, on the side away from the stand
    parts(g, "concrete", True).lathe([(10.5 * FT, 48.6 * FT), (10.5 * FT, 50.6 * FT), (0.0, 50.9 * FT)], 20, matrix=at)
    for dx, dy in ((4.0, 3.0), (-5.0, 2.0), (1.0, -5.5)):
        box(parts(g, "galv", True), (bx + dx - 0.6, by + dy - 0.6, GROUND + 50.5), (bx + dx + 0.6, by + dy + 0.6, GROUND + 53.0))
    # the entrance: a concrete portal 44 ft out of the dome's foot on the west, the door in its face
    y_face = by - 96.0
    outline = [(bx - 9.0, y_face), (bx + 9.0, y_face), (bx + 9.0, by - 60.0), (bx - 9.0, by - 60.0)]
    walls = ring(outline, 2.0)
    for i, w in enumerate(walls):
        w.build(conc, FOOTING, GROUND + 13.0, [(4.0, 14.0, PAVED, PAVED + 9.0)] if i == 0 else [])
    box(conc, (bx - 9.5, y_face - 0.5, GROUND + 13.0), (bx + 9.5, by - 60.0, GROUND + 14.5))
    box(parts(g, "concrete/apron"), (bx - 30.0, y_face - 40.0, FOOTING), (bx + 30.0, y_face - 0.02, PAVED))
    wall_door(parts, f"{g}_Door", g, walls[0], 4.0, 14.0, PAVED, PAVED + 9.0, depth=1.2, thick=2.0, mat="blast", fittings="lever", works=False)
    box(parts(g, "concrete/floor"), (bx - 7.0, y_face + 2.0, FOOTING), (bx + 7.0, by - 62.05, PAVED))
    box(conc, (bx - 7.0, y_face + 5.0, PAVED), (bx + 7.0, y_face + 5.6, GROUND + 13.0))  # the lobby's back wall: nothing behind it is built

    # the cableway: "200 yards", 8 ft wide and 10 ft high inside, 1 ft walls: a concrete duct on the land from the
    # dome's east foot to the stand's west wall
    c = "Cableway"
    a, b = (bx + 6.0, by + 76.0), (CABLEWAY_AT, STAND_Y[0] - 0.1)
    parts.node(c, None, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, GROUND), label="Cableway")
    strip(parts(c, "concrete"), [a, b], 4.0 + WALL, FOOTING, GROUND + 10.0 + WALL)


def holding_area(parts: Parts, node: str, label: str, at: tuple[float, float], heading: float, line_to: tuple[float, float]) -> None:
    """A propellant holding area: a tank "45 feet long, 9 feet in diameter" (20,000 gallons) under a roof of fourteen
    concrete slabs, "22 feet by 3 feet 9 inches by 21 inches", behind an earth revetment "24 feet thick, 54 feet long,
    12 feet tall" (the handbook, p. 7-14). How many tanks each held is not said: one is built. The transfer line goes
    to the stand on a pipe trestle. `heading`: which way the open side faces, degrees from +X toward +Y."""
    cx, cy = at
    parts.node(node, None, (cx, cy, GROUND), label=label)
    c, s = math.cos(math.radians(heading)), math.sin(math.radians(heading))

    def q(u: float, v: float, z: float = 0.0) -> tuple[float, float, float]:
        """A point in the area's own frame: u toward its open side, v along the tank."""
        return (cx + c * u - s * v, cy + s * u + c * v, GROUND + z)

    # the revetment behind the tank, and the slab it stands on
    earth = parts(node, "earth", True)
    loops = [[q(-39.0, v, -1.0), q(-27.0, v, 12.0), q(-21.0, v, 12.0), q(-15.0, v, -1.0)] for v in (-27.0, 27.0)]
    hull(earth, loops)
    conc = parts(node, "concrete")
    corners = [q(-14.0, -27.0)[:2], q(16.0, -27.0)[:2], q(16.0, 27.0)[:2], q(-14.0, 27.0)[:2]]
    slab(conc, corners, FOOTING, PAVED)
    # the roof: fourteen slabs side by side on a beam along each edge, on eight columns
    roof = parts(node, "concrete/roof")
    for k in range(14):
        v = -26.25 + 3.75 * k + 1.875
        obox(roof, q(0.0, v, 16.0 + 0.875), (c, s, 0.0), (0, 0, 1), (22.0, 3.69, 1.75))
    for u in (-9.5, 9.5):
        obox(conc, q(u, 0.0, 14.4), (-s, c, 0.0), (0, 0, 1), (52.5, 1.2, 1.4))
        for v in (-24.0, -8.0, 8.0, 24.0):
            obox(conc, q(u, v, 6.9), (c, s, 0.0), (0, 0, 1), (1.2, 1.2, 13.8))
    # the tank on two saddles: 9 ft across, 45 ft long, its ends dished
    tank = parts(node, "tank", True)
    m = Matrix.Translation(P(*q(0.0, -22.5, 6.2))) @ Matrix.Rotation(math.radians(heading), 4, "Z") @ Matrix.Rotation(-math.pi / 2, 4, "X")
    tank.lathe(
        [(0.0, -1.6 * FT), (2.8 * FT, -1.0 * FT), (4.5 * FT, 0.6 * FT), (4.5 * FT, 44.4 * FT), (2.8 * FT, 46.0 * FT), (0.0, 46.6 * FT)], 24, matrix=m
    )
    for v in (-13.0, 13.0):
        obox(conc, q(0.0, v, 1.3), (c, s, 0.0), (0, 0, 1), (7.0, 1.6, 2.6))
    # the transfer line: two pipes on T-posts from the tank's end to the stand
    pipe, steel = parts(node, "pipe", True), parts(node, "galv", True)
    start = q(6.0, 25.0)
    d = math.hypot(line_to[0] - start[0], line_to[1] - start[1])
    ux, uy = (line_to[0] - start[0]) / d, (line_to[1] - start[1]) / d
    for off in (-0.7, 0.7):
        a = (start[0] - uy * off, start[1] + ux * off, GROUND + 7.0)
        b = (line_to[0] - uy * off, line_to[1] + ux * off, GROUND + 7.0)
        pipe.tube(P(*a), P(*b), 0.33 * FT, 10)
    k = 0
    while k * 22.0 <= d:
        x, y = start[0] + ux * k * 22.0, start[1] + uy * k * 22.0
        beam(steel, (x, y, FOOTING), (x, y, GROUND + 6.5), 0.4)
        beam(steel, (x - uy * 1.4, y + ux * 1.4, GROUND + 6.5), (x + uy * 1.4, y - ux * 1.4, GROUND + 6.5), 0.35)
        k += 1
    pipe.tube(P(*q(2.0, 22.0, 6.2)), P(start[0], start[1], GROUND + 7.0), 0.33 * FT, 10)


def door_at(s: float) -> tuple:
    """A shut door in a building's wall, 3.5 ft wide, from the paving."""
    return (s, s + 3.5, PAVED, PAVED + 7.0, "shut")


def light_at(s: float, up: float = 0.0) -> tuple:
    """A dark window in a building's wall, 6 ft wide."""
    return (s, s + 6.0, GROUND + 4.0 + up, GROUND + 7.5 + up, "blind")


def buildings(parts: Parts) -> None:
    """The buildings whose insides are not recorded: each a plain block with its doors shut and its windows dark."""
    g = "DecontaminationBuilding"
    dx, dy = DECONTAMINATION
    rect = (dx - 30.0, dy - 25.0, dx + 30.0, dy + 25.0)
    parts.node(g, None, (dx, dy, GROUND), label="Personnel decontamination building")
    building(
        parts, g, "decon", rect, GROUND + 11.0,
        {0: [door_at(8.0), light_at(30.0)], 2: [light_at(20.0), door_at(44.0)]},
        floor=PAVED, footing=FOOTING, mat="block",
    )  # fmt: skip
    flat_roof(parts, g, "decon", rect, GROUND + 11.0)

    a = "SupportBuilding"
    parts.node(a, None, ((ANNEX[0] + ANNEX[2]) / 2, (ANNEX[1] + ANNEX[3]) / 2, GROUND), label="Support building")
    building(
        parts, a, "annex", ANNEX, GROUND + 13.0,
        {2: [door_at(12.0), light_at(40.0, 0.5), door_at(70.0), light_at(96.0, 0.5)]},
        floor=PAVED, footing=FOOTING, mat="white",
    )  # fmt: skip
    flat_roof(parts, a, "annex", ANNEX, GROUND + 13.0, mat="white")

    if stood(
        "Air conditioning shed",
        since="1963",
        confidence="documented",
        source="Martin's diagram of the complex (Project Gemini, 1966, p. 40): 'Air Conditioning Shed', west of the stand; "
        "'an air-conditioning facility' among the facilities new for Gemini (Martin's paper, p. 76)",
    ):
        s = "AirConditioningShed"
        rect = (22.0, STAND_Y[0] - 52.0, 52.0, STAND_Y[0] - 28.0)
        parts.node(s, None, ((rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2, GROUND), label="Air conditioning shed")
        building(
            parts,
            s,
            "shed",
            rect,
            GROUND + 12.0,
            {1: [(9.0, 15.0, PAVED, PAVED + 8.0, "shut")]},
            floor=PAVED,
            footing=FOOTING,
            mat="corrugated",
            wall=0.3,
        )
        flat_roof(parts, s, "shed", rect, GROUND + 12.0, mat="corrugated")
        for y in (rect[1] + 6.0, rect[3] - 6.0):  # its two ducts up to the deck, toward the erector's foot
            parts(s, "pipe", True).tube(P(37.0, y, GROUND + 12.5), P(37.0, y, GROUND + 19.0), 1.0 * FT, 12)
            parts(s, "pipe", True).tube(P(37.0, y, GROUND + 19.0), P(37.0, STAND_Y[0] + 0.2, -3.0), 1.0 * FT, 12)


def perimeter(parts: Parts) -> None:
    """The fence: chain link round the complex, outside the loop road (Martin's diagram draws it; its line there is
    followed loosely: 45 ft outside the road). Its gates are not built: it is open where the west road leaves."""
    g = "Fence"
    parts.node(g, None, (0.0, 0.0, GROUND), label="Perimeter fence")
    n = len(LOOP)
    out = []
    cxm, cym = sum(p[0] for p in LOOP) / n, sum(p[1] for p in LOOP) / n
    for x, y in LOOP:
        d = math.hypot(x - cxm, y - cym)
        out.append((x + (x - cxm) / d * 45.0, y + (y - cym) / d * 45.0))
    gate = min(range(n), key=lambda i: out[i][1])  # the westernmost corner: the gate's gap
    line = out[gate + 1 :] + out[:gate]
    # (sitelib.fence stands a post at both ends of every side, which is two at each corner of an open line: so, here)
    mesh, galv = parts(g, "mesh"), parts(g, "galv", True)
    height = 7.0
    for i, ((ax, ay), (bx, by)) in enumerate(zip(line, line[1:])):
        n = max(1, round(math.hypot(bx - ax, by - ay) / 10.0))
        for k in range(0 if i == 0 else 1, n + 1):
            x, y = ax + (bx - ax) * k / n, ay + (by - ay) * k / n
            galv.tube(P(x, y, GROUND - 1.0), P(x, y, GROUND + height + 0.2), 0.09 * FT, 6)
        beam(galv, (ax, ay, GROUND + height - 0.06 * (i % 2)), (bx, by, GROUND + height - 0.06 * (i % 2)), 0.1)
        q = [P(ax, ay, GROUND + 0.2), P(bx, by, GROUND + 0.2), P(bx, by, GROUND + height - 0.1), P(ax, ay, GROUND + height - 0.1)]
        mesh.add([tuple(v) for v in q], [(0, 1, 2, 3)])


def build(parts: Parts) -> None:
    flume(parts)
    roads(parts)
    blockhouse(parts)
    stand_east, stand_west = (40.0, STAND_Y[1] + 1.0), (70.0, STAND_Y[1] + 1.0)
    holding_area(parts, "FuelHoldingArea", "Fuel holding area", FUEL_AREA, 250.0, stand_east)
    holding_area(parts, "OxidizerHoldingArea", "Oxidizer holding area", OXIDIZER_AREA, 215.0, stand_west)
    buildings(parts)
    perimeter(parts)
