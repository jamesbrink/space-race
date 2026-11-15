"""Launch Complex 17: the Air Force's two Thor pads north-east of Complex 5/6, in May 1961 the Thor-Delta pad
(17A) and the Thor-Able-Star pad (17B). One node, `LC17`.

Frame: the origin is pad 17B's centre (its launch deck's seaward edge); +Y runs to pad 17A, 024 degrees true; +X is
114 degrees. Feet. Each pad's deck faces east and its tower rolls away west. ../cape.md has every figure's source
and confidence; in short:

  documented  at each pad a launcher building 50 by 59 ft and 28 ft high, a steel deck 50 ft wide carried 38 ft out
              from its east side over a flame deflector 33 ft wide, a flume 230 ft long; a service tower on rails
              58 ft apart that rolled 400 ft west; the blockhouse 88 ft 9 in by 43 ft 6 in and 18 ft 10 in high with
              an annexe 43 by 18 ft behind (HAER FL-8-5)
  derived     the tower's height in 1961, 118 ft 10 in: HAER's 133 ft 4 in of 1969 less the 14 ft 6 in added in
              1968. The museum says 112 ft; the two are not reconciled (cape.md). Where things stand (OpenStreetMap)
  estimated   the tower's length along its rails (80 ft, off one photograph: weak), its eight levels, its colour
              (red in 1963; dark in the photographs of January 1961), the umbilical mast (78 ft), and that each
              tower stood at its pad on the day
"""

from __future__ import annotations

import math

from .site import FOOTING, GROUND, Parts, apron, at, beam, lattice, obox, park, stood, wedge_blockhouse

NODE = "LC17"
HEADING = 24.0
PAD_A = (0.0, 524.0)
EAST = (math.sin(math.radians(90.0 - HEADING)), math.cos(math.radians(90.0 - HEADING)))  # the way each deck faces
NORTH = (-EAST[1], EAST[0])
TURN = math.degrees(math.atan2(EAST[1], EAST[0]))  # a pad's own +X (east), anticlockwise from the frame's
TOWER = (118.83, 58.0, 80.0)  # tall (derived), across its rails (documented), along them (estimated)
BUILDING = (50.0, 59.0, 28.0)  # the launcher building: wide (north to south), long, high (documented)


def pad(parts: Parts, centre) -> None:
    cx, cy = centre

    def w(e: float, n: float, z: float = 0.0):
        """A point e feet east and n feet north of the deck's seaward edge."""
        return (cx + EAST[0] * e + NORTH[0] * n, cy + EAST[1] * e + NORTH[1] * n, z)

    wide, long, high = BUILDING
    apron(parts, NODE, w(-70.0, 0.0)[:2], (260.0, 150.0), TURN)
    concrete, steel = parts(NODE, "bunker"), parts(NODE, "grey")
    # the launcher building, its east wall 38 ft behind the deck's edge
    mid = (GROUND - FOOTING + high) / 2
    obox(concrete, w(-38.0 - long / 2, 0.0, mid), (*EAST, 0), (0, 0, 1), (long, wide, high - GROUND + FOOTING))
    # the launch deck, level with the roof, carried out over the deflector on two frames
    obox(parts(NODE, "deck"), w(-19.0, 0.0, high - 0.75), (*EAST, 0), (0, 0, 1), (38.0, wide, 1.5))
    for n in (-wide / 2 + 2.0, wide / 2 - 2.0):
        beam(steel, w(-2.0, n, 0.0), w(-2.0, n, high - 1.5), 2.0)
        beam(steel, w(-36.0, n, 6.0), w(-2.0, n, high - 1.5), 1.2)
    # the flame deflector under it, turning the jet east (a parabola in the record; three flats here)
    black = parts(NODE, "black")
    profile = [(-34.0, 24.0), (-24.0, 13.0), (-10.0, 5.0), (8.0, 1.0)]
    for (e0, z0), (e1, z1) in zip(profile, profile[1:]):
        a = w((e0 + e1) / 2, 0.0, (z0 + z1) / 2)
        run = math.hypot(e1 - e0, z1 - z0)
        along = (EAST[0] * (e1 - e0) / run, EAST[1] * (e1 - e0) / run, (z1 - z0) / run)
        obox(black, a, along, (-along[2] * EAST[0], -along[2] * EAST[1], math.hypot(along[0], along[1])), (run, 33.0, 0.8))
    # the flume, 230 ft of concrete trough running east (its walls 4 ft high: estimated)
    obox(parts(NODE, "concrete"), w(115.0, 0.0, (GROUND - FOOTING) / 2), (*EAST, 0), (0, 0, 1), (230.0, 40.0, -GROUND + FOOTING))
    for n in (-19.0, 19.0):
        obox(concrete, w(115.0, n, 2.0), (*EAST, 0), (0, 0, 1), (230.0, 2.0, 4.0))
    # the umbilical mast at the deck's south-east corner: a slender lattice (estimated: 78 ft above the deck)
    mx, my, _ = w(-5.0, -wide / 2 + 4.0)
    lattice(
        steel,
        lambda i, z: (mx + 2.0 * (1 if i in (0, 3) else -1), my + 2.0 * (1 if i < 2 else -1), z),
        [high + 13.0 * k for k in range(7)],
        0.5,
        0.25,
    )


def tower(parts: Parts, centre) -> None:
    """A service tower standing over its launcher building: an open frame of eight levels on four trucks, a deck at
    each level, the top deck wider on raking brackets, a bridge crane on it."""
    cx, cy = centre
    tall, across, along = TOWER
    red, deck = parts(NODE, "red"), parts(NODE, "deck/tower")
    mid_e = -38.0 - BUILDING[1] / 2 + 12.0  # over the building and the deck's inner end

    def w(e: float, n: float, z: float):
        return (cx + EAST[0] * (mid_e + e) + NORTH[0] * n, cy + EAST[1] * (mid_e + e) + NORTH[1] * n, z)

    levels = [0.5, 34.0] + [34.0 + (tall - 34.0) * k / 7 for k in range(1, 8)]

    def corner(i: int, z: float):
        return w(along / 2 * (1 if i in (0, 3) else -1), across / 2 * (1 if i < 2 else -1), z)

    lattice(red, corner, levels, 1.6, 0.7)
    for z in levels[1:]:  # a column at the middle of each long side, above the portal, and the deck at each level
        obox(deck, w(0.0, 0.0, z - 0.3), (*EAST, 0), (0, 0, 1), (along - 2.0, across - 2.0, 0.5))
    for n in (-across / 2, across / 2):
        beam(red, w(0.0, n, 34.0), w(0.0, n, tall), 1.2)
    # the top deck, 1.3 times as wide, on raking brackets; the bridge crane across it
    obox(deck, w(0.0, 0.0, tall + 0.3), (*EAST, 0), (0, 0, 1), (along + 4.0, across * 1.3, 0.6))
    for e in (-along / 2, 0.0, along / 2):
        for s in (-1, 1):
            beam(red, w(e, s * across / 2, tall - 12.0), w(e, s * across * 0.64, tall), 0.8)
    for e in (-12.0, 12.0):
        beam(red, w(e, -across * 0.6, tall + 8.0), w(e, across * 0.6, tall + 8.0), 2.0)
        for s in (-1, 1):
            beam(red, w(e, s * across * 0.55, tall + 0.6), w(e, s * across * 0.55, tall + 8.0), 1.0)
    obox(parts(NODE, "grey"), w(0.0, 6.0, tall + 6.5), (*EAST, 0), (0, 0, 1), (26.0, 8.0, 5.0))  # the hoist's trolley
    for i in range(4):  # the trucks
        x, y, _ = corner(i, 0.0)
        obox(parts(NODE, "grey"), (x, y, 2.0), (*EAST, 0), (0, 0, 1), (12.0, 5.0, 4.0))


def build(parts: Parts) -> None:
    parts.node(NODE, label="Launch Complex 17")
    stood(
        "Complex 17: two pads, each with its launcher building, deck, deflector, flume and umbilical mast; the blockhouse",
        since="1957-04",
        confidence="documented",
        source="the museum: 17B accepted September 1956, 17A April 1957; HAER FL-8-5 pp. 44-64",
    )
    for centre in ((0.0, 0.0), PAD_A):
        pad(parts, centre)
        if stood(
            "A service tower at its pad",
            since="1957",
            confidence="estimated",
            source="one a pad (HAER FL-8-5 p. 27); both at their pads on 19 January 1961 (the museum's photographs); 5 May is not recorded",
        ):
            tower(parts, centre)
    # the blockhouse: 88 ft 9 in overall with its 18 ft annexe, 43 ft 6 in wide, its point to the south-east (documented)
    bx, by = at(567.0, 323.0, HEADING)
    wedge_blockhouse(parts, NODE, (bx + 40.0, by), 0.0, 43.5, 70.75, 14.5, 18.83, annexe=18.0, annexe_height=9.17, ports=((-7.0, 1.5), (3.0, 7.5)))
    park(parts, NODE, 4)
