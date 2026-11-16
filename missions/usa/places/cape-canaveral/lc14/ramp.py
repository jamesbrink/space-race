"""The ramp to the stand, and what stood under and beside it. HAER FL-8-7, pp. 20 and 21 (documented): eleven bays,
"approximately 24' wide"; the southernmost "approximately 170' long ... constructed on earthen fill paved with concrete
slabs", the rest "supported by a steel frame topped by a concrete slab with a balustrade along the edges constructed of
1-1/2 in standard pipe rail"; "Utilizing canvas screen and corrugated asbestos cement siding, the area under the Ramp was
enclosed with two different levels" of rooms; "The concrete-block Launch Pad Building, which was approximately 57' x
20', extended under the Ramp approximately 6' south of the Launch Stand"; "A small Compressor Room, approximately 20' x
10', was located on the east side of the Ramp approximately 155' north of the southeast corner"; the Propellant
Transfer Unit's enclosure, "approximately 40' x 40'", concrete block under a flat roof, "immediately east of the Launch
Pad Building", built "around 1961 for the Mercury program".

  Ramp              the fill, the deck on its steel, the enclosure under it, the pipe rail, the stair down its west side
  LaunchPadBuilding its two ends, standing out from under the ramp
  PTU               the propellant transfer unit's enclosure
  CompressorRoom

None of the rooms' insides is recorded ("Access to facility interiors ... was not possible": HAER, p. 20): every door is
built shut and every window dark. How the deck rises is site.py's (`ramp_z`); heights of the buildings, the doors'
places and the stair are read off NASA GPN-2000-000609 (May 1963): estimated.
"""

from __future__ import annotations

from .site import (
    APRON,
    FOOTING,
    GROUND,
    RAMP_BAY,
    RAMP_FILL,
    RAMP_FOOT,
    RAMP_KNEE,
    RAMP_W,
    STAND_S,
    Parts,
    beam,
    box,
    building,
    fine,
    flat_roof,
    handrail,
    osm,
    ramp_z,
    ring,
    solid,
    stair_rails,
    stairs,
    stood,
)

HALF = RAMP_W / 2
SLAB = 1.0
FILL_END = RAMP_FOOT + RAMP_FILL  # where the fill gives way to steel
BAYS = [FILL_END + RAMP_BAY * k for k in range(11)]  # the ten bays on steel: their lines, south to north
BATTER = 1.0  # the fill's sides: one out for one up (estimated)
STAIR_TOP = STAND_S - 34.0  # the stair down the west side leaves the deck here (estimated off the aerial)


def fill(parts: Parts) -> None:
    """The southernmost bay: earth between battered sides paved in concrete, the roadway on top."""
    g = "Ramp"
    paved = parts(g, "concrete/fill")
    n = 10
    loops = []
    for k in range(n + 1):
        y = RAMP_FOOT + 0.5 + (RAMP_FILL - 0.5) * k / n
        top = ramp_z(y) - 0.6  # under the roadway's slab, whose edge stands over the paved batter
        out = HALF + 0.8 + BATTER * max(0.0, top - APRON)
        loops.append(
            [
                (-out, y, GROUND - FOOTING),
                (out, y, GROUND - FOOTING),
                (out, y, APRON - 0.3),
                (HALF + 0.8, y, top),
                (-HALF - 0.8, y, top),
                (-out, y, APRON - 0.3),
            ]
        )
    solid(paved, loops)
    # the fill's head: a concrete wall across, down to the ground, where the steel begins
    box(
        parts(g, "concrete/abutment"),
        (-HALF - 0.8 - BATTER * (ramp_z(FILL_END) - APRON), FILL_END, GROUND - FOOTING),
        (HALF + 0.8 + BATTER * (ramp_z(FILL_END) - APRON), FILL_END + 1.5, ramp_z(FILL_END) - SLAB - 0.05),
    )


def deck(parts: Parts) -> None:
    """The roadway: one slab from the foot of the fill to the stand, level over its northern six bays, and a kerb each side."""
    g = "Ramp"
    road = parts(g, "concrete")
    stations = [RAMP_FOOT] + [RAMP_FOOT + (RAMP_KNEE - RAMP_FOOT) * k / 12 for k in range(1, 13)] + [STAND_S]
    loops = []
    for y in stations:
        z = ramp_z(y)
        loops.append([(-HALF, y, z - SLAB), (HALF, y, z - SLAB), (HALF, y, z), (-HALF, y, z)])
    solid(road, loops)
    kerb = parts(g, "concrete/kerbs")
    for s in (-1, 1):
        x0, x1 = sorted((s * (HALF - 0.75), s * (HALF + 0.25)))  # a coping, a hand over the slab's edge
        loops = []
        for y in stations[1:]:
            z = ramp_z(y)
            loops.append([(x0, y, z - 0.35), (x1, y, z - 0.35), (x1, y, z + 0.5), (x0, y, z + 0.5)])
        solid(kerb, loops)


def steel(parts: Parts) -> None:
    """The frame under the ten northern bays: a bent at each bay line, a girder under each edge, and the southern
    four bays, where the deck is still climbing, left open and braced."""
    g = "Ramp"
    frame = parts(g, "grey/frame")
    for y in BAYS:
        top = ramp_z(y) - SLAB
        for s in (-1, 1):
            x = s * (HALF - 1.0)
            box(frame, (x - 0.5, y - 0.5, GROUND - FOOTING), (x + 0.5, y + 0.5, top - 1.4))
        box(frame, (-HALF + 0.6, y - 0.4, top - 1.4), (HALF - 0.6, y + 0.4, top))
    for s in (-1, 1):
        x = s * (HALF - 1.0)
        # the girder under the deck's edge: one length up the slope and one along the level, lapped at the knee
        beam(frame, (x, BAYS[0] + 0.7, ramp_z(BAYS[0] + 0.7) - SLAB - 0.7), (x, RAMP_KNEE + 0.7, ramp_z(RAMP_KNEE + 0.7) - SLAB - 0.7 + 0.064), 1.1)
        beam(frame, (x, RAMP_KNEE - 0.7, -SLAB - 0.7), (x, STAND_S - 0.8, -SLAB - 0.7), 1.1)
        for ya, yb in zip(BAYS, BAYS[1:]):
            if yb <= RAMP_KNEE + 0.1:  # an open bay: one diagonal
                beam(frame, (x, ya, APRON + 0.4), (x, yb, ramp_z(yb) - SLAB - 1.3), 0.45)


def enclosure(parts: Parts) -> None:
    """The rooms under the level six bays, on two levels: corrugated asbestos cement between the frame's columns, doors
    and windows at the ground on both sides (the aerial of May 1963 has yellow doors along the west side) and a row
    of small lights to the upper level, all shut and dark."""
    g = "Ramp"
    y0, y1 = RAMP_KNEE, STAND_S
    walls = ring([(-HALF + 0.3, y0), (HALF - 0.3, y0), (HALF - 0.3, y1 - 0.3), (-HALF + 0.3, y1 - 0.3)], 0.25)
    top = -SLAB - 0.02
    skin, doors, dark = parts(g, "asbestos"), parts(g, "yellow/doors"), parts(g, "void/windows")
    for i, w in enumerate(walls):
        if i not in (1, 3):
            w.build(skin, APRON, top)
            continue
        bay = w.length / 6
        opens = []
        for k in range(6):  # a door in every other bay and a strip of windows in the rest; between bays, the upper level's lights
            s0 = (k + 0.5) * bay
            opens.append((s0 - 2.2, s0 + 2.2, 0.0, 7.6, doors) if k % 2 == 0 else (s0 - 4.0, s0 + 4.0, 5.2, 8.4, dark))
            if k < 5:
                opens.append((s0 + bay / 2 - 2.5, s0 + bay / 2 + 2.5, 14.0, 17.0, dark))
        w.build(skin, APRON, top, [(a, b, APRON + c, APRON + d) for a, b, c, d, _ in opens])
        for a, b, c, d, mb in opens:
            w.box(mb, a, b, 0.07, 0.19, APRON + c, APRON + d)
        if fine():  # the frame's columns stand a hand proud of the siding
            for k in range(7):
                s0 = min(max(k * bay, 0.6), w.length - 0.6)
                w.box(parts(g, "grey/pilasters"), s0 - 0.5, s0 + 0.5, -0.15, 0.0, APRON, top)
    box(parts(g, "concrete/floor"), (-HALF + 0.6, y0 + 0.3, GROUND - 0.5), (HALF - 0.6, y1 - 0.6, APRON + 0.05))


def stair(parts: Parts) -> None:
    """The stair down the west side from the deck to the paving, in two flights with a landing half way (NASA
    GPN-2000-000609: a long flight down the west face south of the Launch Pad Building, descending south)."""
    g = "Ramp"
    st, rail = parts(g, "grey/stair"), parts(g, "galv/stairrail")
    x = -HALF - 2.6
    mid = APRON / 2
    # a landing at the deck's edge, the first flight down to the half landing, the second to the ground
    box(parts(g, "deck/landings"), (-HALF - 4.4, STAIR_TOP - 4.0, -0.25), (-HALF - 0.02, STAIR_TOP, 0.0))
    stairs(st, (x, STAIR_TOP - 4.0 - 17.0, mid), (x, STAIR_TOP - 4.0, 0.0), 3.4)
    stair_rails(rail, (x, STAIR_TOP - 21.0, mid), (x, STAIR_TOP - 4.0, 0.0), 3.4, 3.0)
    box(parts(g, "deck/landings"), (-HALF - 4.4, STAIR_TOP - 25.5, mid - 0.25), (-HALF - 0.6, STAIR_TOP - 21.0, mid))
    stairs(st, (x, STAIR_TOP - 25.5 - 17.0, APRON), (x, STAIR_TOP - 25.5, mid), 3.4)
    stair_rails(rail, (x, STAIR_TOP - 42.5, APRON), (x, STAIR_TOP - 25.5, mid), 3.4, 3.0)
    for y in (STAIR_TOP - 3.8, STAIR_TOP - 0.3, STAIR_TOP - 25.3, STAIR_TOP - 21.2):  # the landings' posts
        z = -0.25 if y > STAIR_TOP - 10 else mid - 0.25
        beam(st, (-HALF - 4.1, y, GROUND - 1.0), (-HALF - 4.1, y, z), 0.45)
    handrail(rail, [(-HALF - 4.2, STAIR_TOP - 0.15, 0.0), (-HALF - 0.9, STAIR_TOP - 0.15, 0.0)], 3.0)
    handrail(rail, [(-HALF - 4.25, STAIR_TOP - 21.2, mid), (-HALF - 4.25, STAIR_TOP - 25.3, mid)], 3.0)


def balustrade(parts: Parts) -> None:
    g = "Ramp"
    rail = parts(g, "galv/rail")
    for s in (-1, 1):
        x = s * (HALF - 0.4)
        ys = [RAMP_FOOT + 6.0] + [RAMP_FOOT + (RAMP_KNEE - RAMP_FOOT) * k / 6 for k in range(1, 7)]
        pts = [(x, y, ramp_z(y) + 0.5) for y in ys]
        if s < 0:  # open at the stair's head
            handrail(rail, pts + [(x, STAIR_TOP - 4.2, 0.5)], 3.0)
            handrail(rail, [(x, STAIR_TOP + 0.2, 0.5), (x, STAND_S - 0.6, 0.5)], 3.0)
        else:
            handrail(rail, pts + [(x, STAND_S - 0.6, 0.5)], 3.0)


def buildings(parts: Parts) -> None:
    # the Launch Pad Building: 57 by 20 ft, across under the ramp 6 ft south of the stand; its ends stand out either side
    y1 = STAND_S - 6.0
    y0 = y1 - 20.0
    x0, x1 = osm(-39.0, 0)[0], osm(-39.0, 0)[0] + 57.0
    g = "LaunchPadBuilding"
    parts.node(g, None, (0.0, 0.0, 0.0))
    eave = APRON + 12.0
    building(
        parts,
        g,
        "west",
        (x0, y0, -HALF - 0.31, y1),
        eave,
        {
            3: [(7.0, 10.2, APRON, APRON + 7.0, "shut")],
            0: [(8.0, 14.0, APRON + 3.4, APRON + 6.8, "blind")],
            2: [(8.0, 14.0, APRON + 3.4, APRON + 6.8, "blind")],
        },
        floor=APRON + 0.05,
        footing=GROUND - FOOTING,
    )
    flat_roof(parts, g, "west", (x0, y0, -HALF - 0.31, y1), eave)
    building(
        parts,
        g,
        "east",
        (HALF + 0.31, y0, x1, y1),
        eave,
        {1: [(7.0, 10.2, APRON, APRON + 7.0, "shut")]},
        floor=APRON + 0.05,
        footing=GROUND - FOOTING,
    )
    flat_roof(parts, g, "east", (HALF + 0.31, y0, x1, y1), eave)
    ptu(parts)
    # the compressor room: 20 by 10 ft at the toe of the fill's east side, 155 ft north of the ramp's south-east corner
    g = "CompressorRoom"
    parts.node(g, None, (0.0, 0.0, 0.0))
    yc = RAMP_FOOT + 155.0
    out = HALF + 0.8 + BATTER * (ramp_z(yc + 10.0) - APRON) + 1.0
    rect = (out, yc - 10.0, out + 10.0, yc + 10.0)
    building(parts, g, "room", rect, APRON + 9.0, {1: [(8.4, 11.6, APRON, APRON + 7.0, "shut")]}, floor=APRON + 0.05, footing=GROUND - FOOTING)
    flat_roof(parts, g, "room", rect, APRON + 9.0)


def ptu(parts: Parts) -> None:
    """The PTU's enclosure, east of the Launch Pad Building: 40 ft square (OSM has its outline 43 by 39 ft: way
    1264624135's east arm)."""
    if not stood(
        "Propellant Transfer Unit enclosure",
        since="1961",
        confidence="documented",
        source="HAER FL-8-7, p. 21: 'Constructed around 1961 for the Mercury program'. The NHL nomination lists it with the works of 1963 to 1965",
    ):
        return
    g = "PTU"
    parts.node(g, None, (0.0, 0.0, 0.0))
    px, py = osm(29.0, -85.0)
    rect = (px, py, px + 40.0, py + 40.0)
    eave = APRON + 14.0
    building(
        parts,
        g,
        "ptu",
        rect,
        eave,
        {
            0: [(16.0, 24.0, APRON, APRON + 9.0, "shut")],
            3: [(6.0, 9.2, APRON, APRON + 7.0, "shut")],
            1: [(10.0, 18.0, APRON + 5.0, APRON + 8.0, "blind"), (24.0, 32.0, APRON + 5.0, APRON + 8.0, "blind")],
        },
        floor=APRON + 0.05,
        footing=GROUND - FOOTING,
    )
    flat_roof(parts, g, "ptu", rect, eave)


def build(parts: Parts) -> None:
    parts.node("Ramp", None, (0.0, 0.0, 0.0))
    fill(parts)
    deck(parts)
    steel(parts)
    enclosure(parts)
    stair(parts)
    balustrade(parts)
    buildings(parts)
