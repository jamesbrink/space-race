"""What lies on the ground round the stand: the paving, the service structure's rails and the transfer table's pit,
the flume and skimming basin, the cableway to the blockhouse, the floodlights, the signal at the ramp's head and the
fire nozzles.

  Apron        the paving round the stand and ramp: OpenStreetMap's outline of what survives (way 1264624138), derived
  Tracks       the service structure's two rails at the ground, from beside the stand north to the pit
  TablePit     the transfer table's pit, its two rails (OSM ways 1264975420 and 1264975421, taken 4 ft north:
               site.py), the copings along it where it leaves the paving, the steps down into it
  Flume        "a ditch lined with poured concrete which extended from under the Launch Stand north beyond the access
               road to a collection pond lined with poured concrete" (HAER FL-8-7, p. 22): its plan is OSM's (way
               1264624137), its depths are estimated
  Cableway     the line of the cable tray from the stand toward the blockhouse (HAER, p. 21: "Tunnels and a cable
               tray"; OSM way 1264975418): drawn as a covered trench level with the ground. Estimated
  Floodlights  steel poles of three lamps: two at the ramp's head (NASA GPN-2000-000998, KSC-62PC-0011), four on the
               paving (NASA KSC-63PC-0034: their places read off it, estimated). About 45 ft tall
  Signal       the three-light signal on its pole at the ramp's head, west side (the same photographs)
  FireNozzles  "The four nozzles ... were remotely controlled from the blockhouse in such a manner that water or
               fire-smothering foam could be directed to any area inside the" complex (Results of the First United
               States Manned Orbital Space Flight, p. 48, Figures 4-5 and 4-10): four monitors on posts. Their places
               round the stand are estimated

The land itself (the clearing, the roads, where it is let down for the pit, the flume and the basin) is the Cape's:
../ground.ts.
"""

from __future__ import annotations

from mathutils import Matrix

from srlib import FT

from .site import (
    APRON,
    FOOTING,
    GROUND,
    PIT,
    PIT_DEPTH,
    RAIL_TOP,
    RAIL_X,
    STAND_S,
    TABLE_EAST,
    TABLE_TRACKS,
    TABLE_WEST,
    P,
    Parts,
    beam,
    box,
    fine,
    ftp,
    lamp_head,
    osm,
    rail,
    slab,
)

PIT_FLOOR = APRON - PIT_DEPTH
# The flume, as OSM has it: a fan from the pit's north wall narrowing to a ditch 15 ft wide, which runs 490 ft north to
# the basin, 110 ft by 193. How deep each is, is not in anything read (estimated).
FAN = (20.0, osm(0, 115.0)[1])  # half its width at the pit, and where it has narrowed to the ditch
DITCH = (7.5, osm(0, 604.0)[1], 5.0)  # half its width, where it reaches the basin, its depth
BASIN = (-58.0, 57.0, osm(0, 797.0)[1], 7.0)  # west, east, north, depth
WATER = 3.5  # how far under the paving's level the basin's water lay (estimated: a skimming basin stands part full)
APRON_N = osm(0, 96.0)[1]  # the paving's north edge
# what the land is let down for (../ground.ts `SUNK` quotes these, in feet in this frame): the pit, the fan, the ditch, the basin
SUNK = [
    (TABLE_WEST, PIT[0], TABLE_EAST, PIT[1], PIT_DEPTH),
    (-FAN[0], PIT[1], FAN[0], FAN[1], PIT_DEPTH),
    (-DITCH[0], FAN[1], DITCH[0], DITCH[1], DITCH[2]),
    (BASIN[0], DITCH[1], BASIN[1], BASIN[2], BASIN[3]),
]
POLE = 45.0
# Floodlight poles: (x, y, where it looks)
POLES = [
    (-15.6, STAND_S - 3.0, (0.3, 1.0)),  # the two at the ramp's head, either side of it, looking at the stand
    (15.6, STAND_S - 3.0, (-0.3, 1.0)),
    (-88.0, 12.0, (1.0, -0.1)),  # on the paving west of the stand
    (-70.0, -92.0, (0.9, 0.6)),
    (78.0, -30.0, (-1.0, 0.3)),  # and east of it
    (96.0, 14.0, (-1.0, -0.1)),
]


def fan_x(y: float) -> float:
    """Half the fan's width at y."""
    return FAN[0] + (DITCH[0] - FAN[0]) * (y - PIT[1]) / (FAN[1] - PIT[1])


def apron(parts: Parts) -> None:
    """The paving. Its edges along the pit and the fan are their walls: it goes down past their floors."""
    g = "Apron"
    parts.node(g, None, (0.0, 0.0, APRON))
    s, n = PIT[0] + 14.0, PIT[1] + 14.0  # the pit's walls, as OSM counts (its frame is 14 ft south of the site's)
    fx = fan_x(APRON_N)
    main = [
        (-149, 96),
        (-150, -121),
        (-47, -122),
        (-47, -343),
        (-14, -393),
        (52, -391),
        (109, -363),
        (38, -357),
        (41, -260),
        (45, -159),
        (80, -103),
        (153, -104),
        (151, 26),
        (151, s),
        (TABLE_WEST, s),
        (TABLE_WEST, n),
        (-FAN[0], n),
        (-fx, 96),
        (-49, 97),
    ]
    slab(parts(g, "concrete"), [osm(x, y) for x, y in main], GROUND - FOOTING, APRON)
    east = [(FAN[0], n), (150, n), (150, 95), (45, 94), (fx, 96)]
    slab(parts(g, "concrete/north"), [osm(x, y) for x, y in east], GROUND - FOOTING, APRON)


def tracks(parts: Parts) -> None:
    g = "Tracks"
    parts.node(g, None, (0.0, 0.0, APRON))
    rails = parts(g, "rail", True)
    for s in (-1, 1):
        rail(rails, [(s * RAIL_X, -19.0, RAIL_TOP), (s * RAIL_X, PIT[0], RAIL_TOP)])
        box(parts(g, "grey/stops"), (s * RAIL_X - 0.5, -20.2, APRON), (s * RAIL_X + 0.5, -19.0, APRON + 1.6))  # the buffer at the rail's end


def pit(parts: Parts) -> None:
    g = "TablePit"
    parts.node(g, None, (0.0, PIT[0], APRON))
    conc, rails = parts(g, "concrete"), parts(g, "rail", True)
    x0, x1 = TABLE_WEST, TABLE_EAST
    box(conc, (x0 - 1.0, PIT[0] - 1.0, PIT_FLOOR - 1.5), (x1 + 1.0, PIT[1] + 1.0, PIT_FLOOR))  # the floor
    # copings along both sides where the pit runs out of the paving, east of it, and across its east end: 4 ft of
    # concrete at the paving's level, whose inner faces are the pit's walls
    cop = parts(g, "concrete/copings")
    box(cop, (osm(151, 0)[0], PIT[0] - 4.0, GROUND - FOOTING), (x1, PIT[0], APRON))
    box(cop, (osm(150, 0)[0], PIT[1], GROUND - FOOTING), (x1, PIT[1] + 4.0, APRON))
    box(cop, (x1, PIT[0] - 4.0, GROUND - FOOTING), (x1 + 4.0, PIT[1] + 4.0, APRON))
    for yt in TABLE_TRACKS:
        rail(rails, [(x0 + 0.5, yt, PIT_FLOOR + 0.5), (x1 - 0.5, yt, PIT_FLOOR + 0.5)])
    # steps down into it: at its west end, beside where the table stands at the stand, and by the parking area, on both walls
    steps = parts(g, "concrete/steps")
    for x in (x0 + 4.0, 62.0, 240.0, 360.0):
        for wall_y, into in ((PIT[0], 1), (PIT[1], -1)):
            for k in range(3):
                ya, yb = sorted((wall_y, wall_y + into * 1.1 * (3 - k)))
                box(steps, (x - 2.0, ya, PIT_FLOOR + 0.75 * k), (x + 2.0, yb, PIT_FLOOR + 0.75 * (k + 1)))


def flume(parts: Parts) -> None:
    g = "Flume"
    parts.node(g, None, (0.0, PIT[1], APRON))
    conc = parts(g, "concrete")
    hw, y_n = FAN
    dw, y_b, dd = DITCH
    # the fan: its floor falling from the pit's to the ditch's; its walls are the paving's edge, then a coping each side
    f0, f1 = PIT_FLOOR, APRON - dd
    conc.add([tuple(P(-hw, PIT[1], f0)), tuple(P(hw, PIT[1], f0)), tuple(P(dw, y_n, f1)), tuple(P(-dw, y_n, f1))], [(0, 1, 2, 3)])
    fx = fan_x(APRON_N)
    for s in (-1, 1):
        out = [(s * fx, APRON_N), (s * (fx + 6.0), APRON_N), (s * (dw + 6.0), y_n), (s * dw, y_n)]  # (6 ft: over where the land is let down in steps)
        slab(parts(g, "concrete/copings"), out if s > 0 else out[::-1], f1 - 1.0, APRON)
    # the ditch, and the basin at its end
    box(conc, (-dw, y_n, f1 - 1.0), (dw, y_b, f1))
    for s in (-1, 1):
        xa, xb = sorted((s * dw, s * (dw + 3.0)))
        box(parts(g, "concrete/ditch"), (xa, y_n, f1 - 1.0), (xb, y_b - 3.0, APRON))
    bw, be, bn, bd = BASIN
    box(conc, (bw, y_b, APRON - bd - 1.0), (be, bn, APRON - bd))
    lining = parts(g, "concrete/basin")
    box(lining, (bw - 3.0, y_b - 3.0, APRON - bd - 1.0), (bw, bn + 3.0, APRON))
    box(lining, (be, y_b - 3.0, APRON - bd - 1.0), (be + 3.0, bn + 3.0, APRON))
    box(lining, (bw, bn, APRON - bd - 1.0), (be, bn + 3.0, APRON))
    box(lining, (bw, y_b - 3.0, APRON - bd - 1.0), (-dw, y_b, APRON))
    box(lining, (dw, y_b - 3.0, APRON - bd - 1.0), (be, y_b, APRON))
    parts(g, "water").add(
        [tuple(P(bw, y_b, APRON - WATER)), tuple(P(be, y_b, APRON - WATER)), tuple(P(be, bn, APRON - WATER)), tuple(P(bw, bn, APRON - WATER))],
        [(0, 1, 2, 3)],
    )


def cableway(parts: Parts) -> None:
    """One strip of covers 5 ft wide along the tray's line, mitred at its bends."""
    g = "Cableway"
    parts.node(g, None, (0.0, 0.0, APRON))
    line = [osm(x, y) for x, y in ((-701, -89), (-442, -90), (-421, -67), (-374, -68), (-350, -89), (-150, -89))]
    left, right = [], []
    for i, (x, y) in enumerate(line):
        ax, ay = line[max(i - 1, 0)]
        bx, by = line[min(i + 1, len(line) - 1)]
        dx, dy = bx - ax, by - ay
        length = (dx * dx + dy * dy) ** 0.5
        nx, ny = -dy / length * 2.5, dx / length * 2.5
        left.append((x + nx, y + ny))
        right.append((x - nx, y - ny))
    slab(parts(g, "concrete"), right + left[::-1], GROUND - 1.5, APRON)


def flood_pole(parts: Parts, node: str, x: float, y: float, base: float, aim) -> None:
    """A steel pole of three floodlights on a crossarm, with climbing pegs up it (NASA GPN-2000-000998)."""
    steel, lamps = parts(node, "galv/poles", True), parts(node, "lamp/floods", True)
    top = base + POLE
    steel.lathe(
        ftp([(0.0, base - FOOTING), (0.55, base - FOOTING), (0.55, base + 0.4), (0.42, base + 0.4), (0.28, top), (0.0, top)]),
        12,
        matrix=Matrix.Translation(P(x, y, 0.0)),
    )
    ax, ay = aim
    n = (ax * ax + ay * ay) ** 0.5
    ax, ay = ax / n, ay / n
    sx, sy = -ay, ax
    beam(steel, (x - sx * 3.2, y - sy * 3.2, top - 0.6), (x + sx * 3.2, y + sy * 3.2, top - 0.6), 0.3)
    for k in (-1, 0, 1):
        c = (x + sx * 2.8 * k, y + sy * 2.8 * k, top + 0.75)
        beam(steel, (c[0], c[1], top - 0.45), c, 0.16)
        lamp_head(steel, lamps, c, (ax, ay, -0.42), 0.85)
    if fine():
        for i in range(int(POLE / 1.5) - 6):
            z = base + 8.0 + 1.5 * i
            s = 1 if i % 2 else -1
            beam(steel, (x, y, z), (x + sx * s * 0.9, y + sy * s * 0.9, z), 0.07)


def lights(parts: Parts) -> None:
    g = "Floodlights"
    parts.node(g, None, (0.0, 0.0, APRON))
    parts.mark(g, "lamp/floods", lens_out=1)
    for x, y, aim in POLES:
        flood_pole(parts, g, x, y, APRON, aim)
    # the signal at the ramp's head: three lights in a black housing on a pole, looking down the ramp
    g = "Signal"
    x, y = -13.6, STAND_S - 1.2
    parts.node(g, None, (x, y, APRON))
    parts(g, "galv/pole", True).tube(P(x, y, GROUND - 1.0), P(x, y, 11.0), 0.25 * FT, 10)
    box(parts(g, "black/housing"), (x - 0.55, y - 0.5, 11.0), (x + 0.55, y + 0.5, 14.6))
    for k, mat in enumerate(("lamp-signal-red", "lamp-amber", "lamp-signal-green")):
        parts(g, mat, True).lathe(
            ftp([(0.0, 0.0), (0.38, 0.0), (0.3, 0.12), (0.0, 0.16)]),
            12,
            matrix=Matrix.Translation(P(x, y - 0.5, 13.9 - 1.15 * k)) @ Matrix.Rotation(1.5708, 4, "X"),
        )
    # the four fire nozzles: a monitor on a post at each quarter of the stand
    g = "FireNozzles"
    parts.node(g, None, (0.0, 0.0, APRON))
    red = parts(g, "signred/monitors", True)
    for qx, qy in ((-52.0, -40.0), (-52.0, 20.0), (52.0, -52.0), (52.0, 20.0)):
        red.tube(P(qx, qy, GROUND - 1.0), P(qx, qy, APRON + 5.0), 0.3 * FT, 10)
        n = (qx * qx + qy * qy) ** 0.5
        ux, uy = -qx / n, -qy / n
        red.tube(P(qx, qy, APRON + 5.0), P(qx + ux * 3.2, qy + uy * 3.2, APRON + 6.4), 0.2 * FT, 10)
        red.tube(P(qx + ux * 3.2, qy + uy * 3.2, APRON + 6.4), P(qx + ux * 4.0, qy + uy * 4.0, APRON + 6.75), 0.12 * FT, 10)


def build(parts: Parts) -> None:
    apron(parts)
    tracks(parts)
    pit(parts)
    flume(parts)
    cableway(parts)
    lights(parts)
