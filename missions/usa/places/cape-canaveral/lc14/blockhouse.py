"""The blockhouse and what stood by it: "approximately 750' west of the Launch Stand and Ramp" (HAER FL-8-7, p. 24;
OpenStreetMap has its dome's middle 808 ft off on 286 deg, which is where it is built).

Documented (HAER, pp. 24 and 25): "The 12-sided, dome-shaped portion of the building consisted of three different
layers. The inner dome was constructed of reinforced concrete, poured 10'-6" thick at the base surrounded by 40' of
sand. A retaining wall around the base held the sand in place. At the apex of the dome, the inside dome was reinforced
concrete poured 5'-6" thick, covered by approximately 7' of sand. The earthen fill was covered with a four inch thick
layer of gunite-concrete"; "an interior floor-space diameter of approximately 60'"; "A special blast proof door";
"Two oval-shaped air intake and exhaust openings in the northeast wall"; "Four periscopes"; "An escape hatch led from
the Control Room to the lower of two connected observation platforms on the east side of the Blockhouse roof"; "The
dome ... extended to cover a breezeway on the west side of the building which separated the domed area from a
one-story rectangular extension of the Blockhouse called the Equipment Shelter ... constructed of concrete-block and
wood frame clad with corrugated asbestos cement and topped by a flat roof". Derived: the dome's foot is 60/2 + 10.5 +
40 = 80.5 ft from its middle, which is OSM's outline (way 685951471, an arc of 80 ft). The Ready Building "had 4,320
square feet", "wood frame, clad with corrugated asbestos cement, and topped by a flat roof" (p. 25); the Sentry
House "small, wood frame", "surfaced with aluminum and asbestos cement siding" (p. 26); the Subcable Hut and Vault,
315 square feet of concrete block, "immediately west of the Blockhouse" (p. 26).

Estimated: every height (the retaining wall's, the dome's apex, the shelter's and the buildings' eaves), the dome's
curve, where the periscopes, the platforms and the door stand. The insides are not built: the control room's
consoles are in two figures of the Results and no plan has been read, so the blast door is built shut and every
window dark (docs/agents/rendering.md: a building whose inside is not recorded is not offered empty).

  Blockhouse      the dome, its retaining wall, the periscopes, the two platforms and their stair, the vents
  EquipmentShelter the shelter west of it and the breezeway's roof between
  ReadyBuilding, SentryHouse, CableHut
"""

from __future__ import annotations

import math

from srlib import FT

from .site import APRON, FOOTING, GROUND, P, Parts, beam, box, building, flat_roof, handrail, osm, solid, stair_rails, stairs

CENTRE = osm(-809.5, 17.0)  # the dome's middle (OSM way 685951471: the arc's centre, from its eastmost point and the radius)
FOOT_R = 80.5  # 30 ft of room, 10 ft 6 in of concrete, 40 ft of sand
WALL = 9.0  # the retaining wall's height (estimated: NASA KSC-63PC-0033)
APEX = 35.0  # the gunite's top over the ground: a room some 22 ft high under 5 ft 6 in of concrete and 7 ft of sand (estimated)
# Twelve-sided, of which eight sides stand: OSM's outline is an arc of 245 degrees, cut off on the west by a straight wall
# 43 ft from the middle, where the breezeway and the Equipment Shelter are. The corners are put every 30 degrees from 120
# degrees one side of the line to the pad to 120 the other, which puts that wall 40 ft from the middle.
FIRST, SIDES = -120.0, 8
APOTHEM = FOOT_R * math.cos(math.radians(15.0))
CUT = FOOT_R * math.cos(math.radians(120.0))  # the west wall, from the middle
# the dome's profile over the wall: (distance from the middle, height), from its foot to its top
CURVE = [(FOOT_R - 1.0, WALL), (72.0, 14.5), (60.0, 21.5), (45.0, 27.5), (28.0, 32.0), (12.0, 34.4), (0.0, APEX)]
EAST = 15.0  # the side the platforms are on: the first face north of the line to the pad


def at(r: float, bearing: float, z: float) -> tuple[float, float, float]:
    """A place on the dome: `r` out from its middle on `bearing` (degrees from +X toward +Y), `z` over the ground."""
    a = math.radians(bearing)
    return (CENTRE[0] + r * math.cos(a), CENTRE[1] + r * math.sin(a), APRON + z)


def height(r: float) -> float:
    """The dome's surface over the ground at r from its middle."""
    for (r0, z0), (r1, z1) in zip(CURVE, CURVE[1:]):
        if r1 <= r <= r0:
            return z0 + (z1 - z0) * (r0 - r) / (r0 - r1)
    return WALL


def dome(parts: Parts) -> None:
    g = "Blockhouse"
    parts.node(g, None, (CENTRE[0], CENTRE[1], APRON))
    wall, shell = parts(g, "bunker"), parts(g, "gunite")
    low = GROUND - FOOTING - APRON

    def vert(r: float, k: int, z: float) -> tuple:
        return tuple(P(*at(r, FIRST + 30.0 * k, z)))

    for k in range(SIDES):  # the retaining wall and its coping, a side at a time, and the gunite over the sand
        wall.add([vert(FOOT_R, k, low), vert(FOOT_R, k + 1, low), vert(FOOT_R, k + 1, WALL + 1.2), vert(FOOT_R, k, WALL + 1.2)], [(0, 1, 2, 3)])
        wall.add(
            [vert(FOOT_R, k, WALL + 1.2), vert(FOOT_R, k + 1, WALL + 1.2), vert(FOOT_R - 1.0, k + 1, WALL + 1.2), vert(FOOT_R - 1.0, k, WALL + 1.2)],
            [(0, 1, 2, 3)],
        )
        wall.add(
            [vert(FOOT_R - 1.0, k, WALL + 1.2), vert(FOOT_R - 1.0, k + 1, WALL + 1.2), vert(FOOT_R - 1.0, k + 1, WALL), vert(FOOT_R - 1.0, k, WALL)],
            [(0, 1, 2, 3)],
        )
        for (r0, z0), (r1, z1) in zip(CURVE, CURVE[1:]):
            if r1 > 0:
                shell.add([vert(r0, k, z0), vert(r0, k + 1, z0), vert(r1, k + 1, z1), vert(r1, k, z1)], [(0, 1, 2, 3)])
            else:
                shell.add([vert(r0, k, z0), vert(r0, k + 1, z0), vert(0.0, 0, z1)], [(0, 1, 2)])
    # the west wall, where the dome is cut off: a concrete wall as high as the dome it closes, and a parapet over it
    xw = CENTRE[0] + CUT
    half = FOOT_R * math.sin(math.radians(120.0))
    ys = [half * (2 * i / 16 - 1) for i in range(17)]
    crest = [(y, max(WALL + 1.2, height(min(math.hypot(CUT, y), FOOT_R - 1.0))) + 1.5) for y in ys]
    loops = []
    for x in (xw - 2.0, xw + 0.3):
        loops.append(
            [(x, CENTRE[1] - half, GROUND - FOOTING), (x, CENTRE[1] + half, GROUND - FOOTING)]
            + [(x, CENTRE[1] + y, APRON + z) for y, z in crest[::-1]]
        )
    solid(parts(g, "bunker/west"), loops)


def fittings(parts: Parts) -> None:
    g = "Blockhouse"
    steel, dark = parts(g, "grey/fittings", True), parts(g, "void/vents")
    # four periscopes through the dome on the side toward the pad: a tube and a head (their places are estimated)
    for bearing in (-24.0, -8.0, 8.0, 24.0):
        r = 36.0
        foot = at(r, bearing, height(r) - 1.5)
        head = (foot[0], foot[1], APRON + height(r) + 6.5)
        steel.tube(P(*foot), P(*head), 0.5 * FT, 10)
        box(parts(g, "grey/heads"), (head[0] - 0.8, head[1] - 0.7, head[2]), (head[0] + 0.8, head[1] + 0.7, head[2] + 1.6))
        box(parts(g, "glass/periscopes"), (head[0] + 0.8, head[1] - 0.5, head[2] + 0.3), (head[0] + 0.86, head[1] + 0.5, head[2] + 1.3))
    # the two observation platforms on the east side of the roof, the lower by the escape hatch, joined by a stair
    deck, rail, st = parts(g, "deck"), parts(g, "galv/rails"), parts(g, "grey/stair")
    lo, hi = at(63.0, EAST, height(60.0) + 0.4), at(46.0, EAST, height(45.0) + 0.8)
    for c, w in ((lo, 5.0), (hi, 4.0)):
        box(deck, (c[0] - w, c[1] - 5.0, c[2] - 0.3), (c[0] + w, c[1] + 5.0, c[2]))
        for dx in (-w + 0.3, w - 0.3):
            for dy in (-4.6, 4.6):
                beam(steel, (c[0] + dx, c[1] + dy, c[2] - 0.3), (c[0] + dx, c[1] + dy, c[2] - 10.0), 0.3)
    handrail(
        rail,
        [
            (lo[0] + 4.85, lo[1] - 1.8, lo[2]),
            (lo[0] + 4.85, lo[1] - 4.85, lo[2]),
            (lo[0] - 4.85, lo[1] - 4.85, lo[2]),
            (lo[0] - 4.85, lo[1] - 1.8, lo[2]),
        ],
        3.5,
    )
    handrail(
        rail,
        [
            (lo[0] + 4.85, lo[1] + 1.8, lo[2]),
            (lo[0] + 4.85, lo[1] + 4.85, lo[2]),
            (lo[0] - 4.85, lo[1] + 4.85, lo[2]),
            (lo[0] - 4.85, lo[1] + 1.8, lo[2]),
        ],
        3.5,
    )
    handrail(
        rail,
        [
            (hi[0] + 3.85, hi[1] + 1.8, hi[2]),
            (hi[0] + 3.85, hi[1] + 4.85, hi[2]),
            (hi[0] - 3.85, hi[1] + 4.85, hi[2]),
            (hi[0] - 3.85, hi[1] - 4.85, hi[2]),
            (hi[0] + 3.85, hi[1] - 4.85, hi[2]),
            (hi[0] + 3.85, hi[1] - 1.8, hi[2]),
        ],
        3.5,
    )
    stairs(st, (lo[0] - 5.0, lo[1], lo[2]), (hi[0] + 4.0, hi[1], hi[2]), 3.0)
    stair_rails(rail, (lo[0] - 5.0, lo[1], lo[2]), (hi[0] + 4.0, hi[1], hi[2]), 3.0, 3.0)
    box(parts(g, "blast/hatch"), (lo[0] - 1.5, lo[1] + 2.2, lo[2]), (lo[0] + 1.5, lo[1] + 4.4, lo[2] + 0.35))  # the escape hatch's cover
    # a ladder from the ground up the retaining wall and a flight up the dome to the lower platform (estimated: how
    # the platforms were reached from outside is not in anything read)
    a = math.radians(EAST)
    out = (math.cos(a), math.sin(a))
    foot = at(APOTHEM + 0.5, EAST, 0.0)
    parts.ladder(g, "wall", foot, (foot[0], foot[1], APRON + WALL + 1.2), face=(-out[0], -out[1], 0), mat="galv")
    top = at(APOTHEM - 1.6, EAST, WALL + 1.2)
    box(deck, (top[0] - 1.6, top[1] - 1.8, top[2] - 0.25), (top[0] + 1.3, top[1] + 1.8, top[2]))
    stairs(st, (top[0] - 1.6, top[1], top[2]), (lo[0] + 5.0, lo[1], lo[2]), 3.0)
    stair_rails(rail, (top[0] - 1.6, top[1], top[2]), (lo[0] + 5.0, lo[1], lo[2]), 3.0, 3.0)
    # the two oval openings for air in the north-east of the wall: dark ovals in steel rims, standing proud of it
    fb = math.radians(45.0)
    nx, ny, tx, ty = math.cos(fb), math.sin(fb), -math.sin(fb), math.cos(fb)
    for off in (-5.0, 5.0):
        c = (CENTRE[0] + nx * (APOTHEM + 0.15) + tx * off, CENTRE[1] + ny * (APOTHEM + 0.15) + ty * off, APRON + 5.0)
        n = 14
        rim = [
            (c[0] + tx * 2.2 * math.cos(math.tau * i / n), c[1] + ty * 2.2 * math.cos(math.tau * i / n), c[2] + 1.3 * math.sin(math.tau * i / n))
            for i in range(n)
        ]
        dark.add([tuple(P(*c))] + [tuple(P(*q)) for q in rim], [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)])
        for q0, q1 in zip(rim, rim[1:] + rim[:1]):
            beam(steel, q0, q1, 0.18)


def shelter(parts: Parts) -> None:
    """The Equipment Shelter (OSM: 56 by 85 ft) and the breezeway between it and the dome's west wall, under a roof
    carried over from the one to the other; the blast door in that wall, shut."""
    g = "EquipmentShelter"
    x0, x1 = osm(-928.0, 0)[0], osm(-872.0, 0)[0]
    y0, y1 = osm(0, -27.0)[1], osm(0, 58.0)[1]
    parts.node(g, None, (x0, y0, APRON))
    eave = APRON + 12.0
    opens = {
        3: [
            (10.0, 13.2, APRON, APRON + 7.0, "shut"),
            (30.0, 38.0, APRON + 3.4, APRON + 6.8, "blind"),
            (52.0, 60.0, APRON + 3.4, APRON + 6.8, "blind"),
        ],
        1: [(40.0, 43.2, APRON, APRON + 7.0, "shut")],
        0: [(20.0, 28.0, APRON + 3.4, APRON + 6.8, "blind")],
        2: [(20.0, 28.0, APRON + 3.4, APRON + 6.8, "blind")],
    }
    building(parts, g, "shelter", (x0, y0, x1, y1), eave, opens, floor=APRON + 0.05, footing=GROUND - FOOTING, mat="asbestos")
    flat_roof(parts, g, "shelter", (x0, y0, x1, y1), eave, mat="asbestos")
    # the breezeway: a slab from over the shelter's roof to the dome's west wall, over a paved way through
    xw = CENTRE[0] + CUT - 2.0
    box(parts(g, "bunker/breezeway"), (x1 - 3.0, y0 + 14.0, eave + 0.8), (xw + 0.3, y1 - 14.0, eave + 2.0))
    box(parts(g, "concrete/paving"), (x1 + 0.9, y0 + 10.0, GROUND - 1.0), (xw - 0.3, y1 - 10.0, APRON))
    # the blast door: a steel leaf in a concrete portal in the west wall, shut
    g = "Blockhouse"
    box(parts(g, "bunker/portal"), (xw - 1.2, CENTRE[1] - 4.5, GROUND - FOOTING), (xw + 0.2, CENTRE[1] + 4.5, APRON + 9.6))
    box(parts(g, "blast"), (xw - 1.5, CENTRE[1] - 2.2, APRON + 0.02), (xw - 1.2, CENTRE[1] + 2.2, APRON + 7.4))
    for dz in (1.6, 3.8, 6.0):
        box(parts(g, "grey/dogs"), (xw - 1.65, CENTRE[1] + 1.5, APRON + dz), (xw - 1.5, CENTRE[1] + 2.0, APRON + dz + 0.3))


def outbuildings(parts: Parts) -> None:
    # the Ready Building: 4,320 sq ft (HAER), taken as 36 by 120 ft along the outline OSM has of its ruin (49 by 111 ft)
    g = "ReadyBuilding"
    x0, y0 = osm(-855.0, -256.5)
    parts.node(g, None, (x0, y0, APRON))
    rect = (x0, y0, x0 + 36.0, y0 + 120.0)
    eave = APRON + 11.0
    side = [(8.0 + 14.0 * k, 14.0 + 14.0 * k, APRON + 3.2, APRON + 7.0, "blind") for k in range(8)]
    doors = [(57.0, 60.2, APRON, APRON + 7.0, "shut")]
    opens = {
        1: sorted(side[:4] + doors + side[4:]),
        3: side,
        0: [(16.0, 19.2, APRON, APRON + 7.0, "shut")],
        2: [(14.0, 22.0, APRON + 3.2, APRON + 7.0, "blind")],
    }
    opens[1] = [o for o in opens[1] if not (o[4] == "blind" and o[0] < 60.2 and o[1] > 57.0)]
    building(parts, g, "ready", rect, eave, opens, floor=APRON + 0.05, footing=GROUND - FOOTING, mat="asbestos")
    flat_roof(parts, g, "ready", rect, eave, mat="asbestos")
    # the Sentry House, between the blockhouse and the Ready Building (OSM has the present one, moved there in 1998, at this
    # place: the original's is taken to be the same): 6 by 8 ft
    g = "SentryHouse"
    x0, y0 = osm(-864.0, -105.0)
    parts.node(g, None, (x0, y0, APRON))
    rect = (x0, y0, x0 + 8.0, y0 + 6.0)
    building(
        parts,
        g,
        "sentry",
        rect,
        APRON + 7.6,
        {
            0: [(2.5, 5.5, APRON, APRON + 6.6, "shut")],
            1: [(1.2, 4.8, APRON + 3.0, APRON + 6.2, "blind")],
            3: [(1.2, 4.8, APRON + 3.0, APRON + 6.2, "blind")],
            2: [(2.0, 6.0, APRON + 3.0, APRON + 6.2, "blind")],
        },
        floor=APRON + 0.05,
        footing=GROUND - FOOTING,
        mat="white",
        wall=0.3,
    )
    flat_roof(parts, g, "sentry", rect, APRON + 7.6, mat="white")
    # the Subcable Hut and Vault: 315 sq ft of concrete block, west of the blockhouse (OSM's "Telephone Tip Shack")
    g = "CableHut"
    x0, y0 = osm(-962.0, 41.0)
    parts.node(g, None, (x0, y0, APRON))
    rect = (x0, y0, x0 + 15.0, y0 + 21.0)
    building(parts, g, "hut", rect, APRON + 9.0, {1: [(9.0, 12.2, APRON, APRON + 7.0, "shut")]}, floor=APRON + 0.05, footing=GROUND - FOOTING)
    flat_roof(parts, g, "hut", rect, APRON + 9.0)


def build(parts: Parts) -> None:
    dome(parts)
    fittings(parts)
    shelter(parts)
    outbuildings(parts)
