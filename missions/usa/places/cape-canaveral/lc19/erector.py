"""The complete vehicle erector: the 138 ft steel tower, hinged at the deck, that carried each stage up from its
trailer, stood round the vehicle as its service structure with the white room at its top, and was laid flat on the
deck before launch. "The service tower at Complex 19 was simply laid down as if on a gigantic hinge" (the NHL
nomination); it weighed 140 tons and was raised and lowered by a 150 hp motor and winch in the stand's second floor
(Martin's press handbook, ch. 7; SP-4203).

Built standing, round the vehicle, with its platforms down and the white room shut: the pose it had while the crew
went aboard. Every moving piece is its own node with its origin on its hinge or its guide:

  Erector                          the whole of it: origin on the hinge line at the deck, south of the vehicle
  Erector_Platform_<n>_East/West   the two leaves of each work platform (levels 1 to 5) and of each white room floor
                                   (levels 6 to 8), each hinged along its outer edge: folded up before the erector moves
  Erector_NorthDoor_<1..4>         the white room's roll-up door, "down the entire north side", as four sliding lengths
  Erector_Lift_East                the express elevator: the deck to three levels of the white room; it carried the crew
  Erector_Lift_West                the service elevator: the deck to the five work platforms
  Erector_WhiteRoom_Door           the door from the express elevator's landing into the crew's level

What is documented (the handbook, pp. 7-10 and 7-13) is the height, a plan of 18.5 by 25 ft, the white room's size
and its four levels' heights, the bridge crane's level, the two elevators, which side each is on and what each
serves, that there were stairs, nine hydraulic work platforms, and the north door. Where each member, stair and
floor is, is read off photographs (S65-20641 and the handbook's p. 7-15 for the south face, S65-49568 for the east,
S65-20994 for the foot) and is estimated: ../lc-19.md.

Local frame: the site's. The south face is at x = HINGE[0] and the open north side toward the umbilical tower's
booms; nothing of the erector is south of the hinge line, so that laid down nothing of it is under the deck.
"""

from __future__ import annotations

import math

import interiors
from srlib import FT

from .site import (
    BRIDGE_CRANE,
    CREW_FLOOR,
    ERECTOR_DEPTH,
    ERECTOR_HALF,
    ERECTOR_TOP,
    HINGE,
    ROOM_HALF,
    ROOM_LEVELS,
    WHITE_ROOM,
    WORK_LEVELS,
    P,
    Parts,
    beam,
    box,
    door,
    ear_clip,
    fine,
    handrail,
    lamp_head,
    stair_rails,
    stairs,
)

XS = HINGE[0]  # the south face
XN = XS - ERECTOR_DEPTH  # the body's north edge
RN = XS - 2 * ROOM_HALF[0]  # the white room's north wall
W = ERECTOR_HALF
BASE = 3.0  # the floor at the erector's foot, which the crew's ramp comes up to (S65-20994: estimated)
COL = 1.5  # a corner column's side
STRUT_PIN = 6.5  # the two great struts' heads, either side of the middle
FLOOR_T = 0.25
SOUTH_WALK = 5.3  # the fixed floor along the south face is this deep; its inner edge clears the vehicle by 14 in
SLOT = 6.0  # half the slot the vehicle stands in: the fixed side floors begin here, and the leaves hinge here
# what each level's leaves close round, as a radius from the vehicle's axis: the launch vehicle with a hand's room,
# the adapter, the cabin at the hatches, the re-entry control section
VEHICLE_R = 5.3
ROOM_R = (5.3, 3.6, 2.3)
LEVELS = (*WORK_LEVELS, *ROOM_LEVELS[:3])  # the eight levels whose floors open; the white room's top level is whole
# the two elevators, outside the east and west faces by the south corners (the handbook: which side each is on)
CAR_X = (XS - 6.0, XS - 0.5)
CAR_W = 5.5
EAST_STOPS = [("Deck", BASE), *((f"White room, {round(z)} ft level", z) for z in ROOM_LEVELS[:3])]
WEST_STOPS = [("Deck", BASE), *((f"Work platform {k + 1}, {round(z)} ft", z) for k, z in enumerate(WORK_LEVELS))]
# the stair tower, outside the west face north of the service elevator: two lanes, a landing at each end
STAIR_LANE = 3.0
STAIR_X = (XS - 6.9, XN)  # the south landings' south edge, the mid landings' north edge
LANDING = 3.0
STAIR_STOPS = (BASE, 14.0, 25.0, *WORK_LEVELS, *ROOM_LEVELS)
WEST_OPEN = STAIR_X[0] - LANDING - 0.4  # the west face is braced and curtained as far south as this: beyond are the stairs and the elevator
EAST_OPEN = CAR_X[0] - 0.6  # and the east face as far as the express elevator
ROOF = ERECTOR_TOP - 0.5
DOOR_HEAD = ROOM_LEVELS[3] + 8.0  # the north door's head: its lengths stack behind the header over it
DOOR_LENGTHS = 4
ROOM_NORTH = RN + 1.7  # the white room's floors stop short of the door's lengths


def leaf_outline(side: int, north: float, radius: float) -> list[tuple[float, float]]:
    """One leaf of a level's floor: the half of the slot on `side` (+1 east) from the fixed south walk to `north`,
    less the vehicle. Anticlockwise from above, its hinge edge (y = side * SLOT) first."""
    south = XS - SOUTH_WALK - 0.05
    pts = [(north, SLOT), (north, 0.04)]
    if radius > 0:
        n = 10
        pts.append((-radius, 0.04))
        pts += [(-radius * math.cos(math.pi * k / n), radius * math.sin(math.pi * k / n)) for k in range(1, n)]
        pts.append((radius, 0.04))
    pts += [(south, 0.04), (south, SLOT)]
    return [(x, side * y) for x, y in (pts if side > 0 else pts[::-1])]


def floor_plate(mb, outline, z: float, t: float = FLOOR_T) -> None:
    """A floor over any simple outline, its top at z."""
    tris = ear_clip(list(outline))
    top = [tuple(P(x, y, z)) for x, y in outline]
    bot = [tuple(P(x, y, z - t)) for x, y in outline]
    mb.add(top, tris)
    mb.add(bot, [tri[::-1] for tri in tris])
    k = len(outline)
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def level_floor(parts: Parts, n: int, z: float, north: float, radius: float, mat: str = "reddeck") -> None:
    """A level: the fixed floor along the south face and down each side, and its two leaves across the slot."""
    g = "Erector"
    floor = parts(g, mat)
    inner = XS - SOUTH_WALK
    box(floor, (inner, -W + 0.3, z - FLOOR_T), (XS - 0.3, W - 0.3, z))
    for s in (-1, 1):
        ya, yb = sorted((s * SLOT, s * (W - 0.3)))
        box(floor, (north, ya, z - FLOOR_T), (inner, yb, z))
        name = f"Erector_Platform_{n}_{'East' if s > 0 else 'West'}"
        parts.node(name, g, ((north + inner) / 2, s * SLOT, z - FLOOR_T / 2), leaf=1)
        floor_plate(parts(name, "roomfloor" if mat == "roomfloor" else "deck"), leaf_outline(s, north, radius), z - 0.03, FLOOR_T - 0.06)
        if fine():  # the two hydraulic struts under it, from the side floor's edge
            for x in (north + 1.2, inner - 0.6):
                beam(parts(name, "galv", True), (x, s * (SLOT - 0.3), z - FLOOR_T - 0.05), (x, s * 4.2, z - FLOOR_T - 0.05), 0.2)


def frame(parts: Parts) -> None:
    """The body under the white room: four columns, girts and bracing on three faces, the two great struts at its foot."""
    g = "Erector"
    red = parts(g, "red", True)
    corners = [(XS - COL / 2, -W + COL / 2), (XS - COL / 2, W - COL / 2), (XN + COL / 2, W - COL / 2), (XN + COL / 2, -W + COL / 2)]
    for k, (x, y) in enumerate(corners):  # the south pair stand on the hinge, the north pair come down to their locks on the deck
        box(red, (x - COL / 2, y - COL / 2, HINGE[1] - 0.75 if k < 2 else 0.4), (x + COL / 2, y + COL / 2, WHITE_ROOM[0]))
    # (the top girt just under the white room: 7 ft clear over the fifth platform, so that a tall man steps out of the
    # service elevator on to it. Where the girts are is read off photographs)
    girts = [14.0, 25.0, *WORK_LEVELS, WHITE_ROOM[0] + 0.3]
    for z in girts:
        beam(red, (XS - 0.5, -W + COL, z - 0.9), (XS - 0.5, W - COL, z - 0.9), 0.9)  # south
        for s in (-1, 1):
            beam(red, (XN + COL, s * (W - 0.5), z - 0.9), (XS - COL, s * (W - 0.5), z - 0.9), 0.8)
    for za, zb in zip(girts[1:], girts[2:]):  # one diagonal a bay on each closed face, alternating
        k = girts.index(za)
        a, b = (-1, 1) if k % 2 else (1, -1)
        beam(red, (XS - 0.5, a * (W - COL), za - 0.5), (XS - 0.5, b * (W - COL), zb - 1.3), 0.55)
        for s, x_to in ((-1, WEST_OPEN), (1, EAST_OPEN)):
            xa, xb = (XN + COL, x_to) if k % 2 else (x_to, XN + COL)
            beam(red, (xa, s * (W - 0.5), za - 0.5), (xb, s * (W - 0.5), zb - 1.3), 0.5)
            beam(red, (x_to, s * (W - 0.5), za - 0.9), (x_to, s * (W - 0.5), zb - 0.9), 0.45)  # the post the bracing stops at
    # the foot: two box struts raking in from the south corners to pins 25 ft up, the open bay between them the way
    # in under the first platform (S65-20994), and a sill across the hinge line
    for s in (-1, 1):
        a, b = (XS - 1.25, s * (W - 1.3), HINGE[1] + 0.2), (XS - 1.25, s * STRUT_PIN, 25.6)
        beam(red, a, b, 1.9)
        box(red, (XS - 2.3, s * STRUT_PIN - 1.5, 24.6), (XS - 0.05, s * STRUT_PIN + 1.5, 27.6))  # the pin's housing
        if fine():
            parts(g, "black", True).tube(P(XS - 2.4, s * STRUT_PIN, 26.1), P(XS - 0.02, s * STRUT_PIN, 26.1), 0.5 * FT, 10)
        # the hinge: the south column's foot is a lug on the pin, which the stand's pedestal carries (stand.py)
        box(parts(g, "black", True), (XS - 1.35, s * (W - COL / 2) - 0.6, HINGE[1] - 0.8), (XS - 0.15, s * (W - COL / 2) + 0.6, HINGE[1] + 0.8))


def curtains(parts: Parts) -> None:
    """The weather curtains: canvas in panels between the girts, on the south face in two columns and down the east
    and west faces north of the elevators (S65-20641; "opening and closing of curtains at the various levels of the
    erector" kept the second stage's temperature: SP-121, p. 138). The north side's, which "had to be left open because
    of umbilical lines" on the first two vehicles and were then altered (the Launch Systems Final Report, II.C), are
    not built."""
    g = "Erector"
    cloth = parts(g, "curtain")
    rows = [25.0, *WORK_LEVELS, WHITE_ROOM[0] + 0.3]
    for za, zb in zip(rows, rows[1:]):
        lo, hi = za + 0.3, zb - 1.9
        for ya, yb in ((-W + COL + 0.2, -0.15), (0.15, W - COL - 0.2)):
            x = XS - 1.15
            cloth.add([tuple(P(x, ya, lo)), tuple(P(x, yb, lo)), tuple(P(x, yb, hi)), tuple(P(x, ya, hi))], [(0, 1, 2, 3)])
        for s, x_to in ((-1, WEST_OPEN - 0.3), (1, EAST_OPEN - 0.3)):
            y = s * (W - 1.05)
            cloth.add(
                [tuple(P(XN + COL + 0.2, y, lo)), tuple(P(x_to, y, lo)), tuple(P(x_to, y, hi)), tuple(P(XN + COL + 0.2, y, hi))], [(0, 1, 2, 3)]
            )


def white_room(parts: Parts) -> None:
    """The white room: an aluminium box 50 ft high on the erector's top, 25 ft square, with four floors. Its south,
    east and west walls and its roof are whole; its north side is the roll-up door."""
    g = "Erector"
    red, white = parts(g, "red", True), parts(g, "room")
    z0, z1 = WHITE_ROOM
    t = 0.4
    # the three walls, each built round its doorways: the express elevator's stops on the east, the stairs' on the west
    # (each sill a little under its floor, so that the wall and the floor are not one face)
    east = [(CAR_X[0] + 0.7, CAR_X[1] - 0.7, z - 0.05, z + 6.7) for z in ROOM_LEVELS[:3]]
    west = [(STAIR_X[0] - LANDING + 0.2, STAIR_X[0] - 0.2, z - 0.05, z + 6.7) for z in ROOM_LEVELS]
    for s, holes in ((-1, west), (1, east)):
        y = s * W
        ya, yb = sorted((y, y - s * t))
        at = z0
        for xa, xb, lo, hi in sorted(holes, key=lambda h: h[2]):
            box(red, (RN, ya, at), (XS, yb, lo))
            box(red, (RN, ya, lo), (xa, yb, hi))
            box(red, (xb, ya, lo), (XS, yb, hi))
            at = hi
        box(red, (RN, ya, at), (XS, yb, z1))
        # its lining, white, a hand's breadth inside
        yl = y - s * (t + 0.15)
        at = z0 + 0.3
        for xa, xb, lo, hi in sorted(holes, key=lambda h: h[2]):
            for x0, x1, za, zb in ((RN + 0.2, XS - t - 0.2, at, lo), (RN + 0.2, xa, lo, hi), (xb, XS - t - 0.2, lo, hi)):
                q = [P(x0, yl, za), P(x1, yl, za), P(x1, yl, zb), P(x0, yl, zb)]
                white.add([tuple(v) for v in (q if s > 0 else q[::-1])], [(0, 1, 2, 3)])
            at = hi
        q = [P(RN + 0.2, yl, at), P(XS - t - 0.2, yl, at), P(XS - t - 0.2, yl, z1 - 6.5), P(RN + 0.2, yl, z1 - 6.5)]
        white.add([tuple(v) for v in (q if s > 0 else q[::-1])], [(0, 1, 2, 3)])
    box(red, (XS - t, -W + t, z0), (XS, W - t, z1))  # the south wall, which carries the door's tracks (the handbook)
    q = [
        P(XS - t - 0.15, W - t - 0.2, z0 + 0.3),
        P(XS - t - 0.15, -W + t + 0.2, z0 + 0.3),
        P(XS - t - 0.15, -W + t + 0.2, z1 - 6.5),
        P(XS - t - 0.15, W - t - 0.2, z1 - 6.5),
    ]
    white.add([tuple(v) for v in q], [(0, 1, 2, 3)])
    # its skin: "an all-aluminum stressed-skin construction" (the handbook), built as plain walls with a rib every four
    # feet where no doorway is and a band at each floor on the south wall (S65-49568 and S65-20641: ribs and bands show;
    # their spacing is estimated), and the small window high in the south wall of S65-20641
    x = RN + 2.0
    while x < XS - 1.0:
        for s, (xa, xb) in ((-1, (STAIR_X[0] - LANDING - 0.3, STAIR_X[0] + 0.3)), (1, (CAR_X[0] + 0.2, CAR_X[1] - 0.2))):
            if not xa < x < xb:
                ya, yb = sorted((s * (W - 0.05), s * (W + 0.18)))
                box(red, (x - 0.12, ya, z0 + 0.05), (x + 0.12, yb, z1 - 0.7))
        x += 4.0
    y = -W + 2.5
    while y < W - 1.0:
        if abs(y) > 2.0:
            box(red, (XS - 0.05, y - 0.12, z0 + 0.05), (XS + 0.18, y + 0.12, z1 - 0.7))
        y += 4.0
    for z in ROOM_LEVELS:
        box(red, (XS - 0.05, -W + 0.3, z - 0.75), (XS + 0.24, W - 0.3, z - 0.35))
    box(parts(g, "frame"), (XS - 0.03, -1.6, 126.4), (XS + 0.28, 1.6, 129.6))
    q = [P(XS + 0.3, -1.35, 126.65), P(XS + 0.3, 1.35, 126.65), P(XS + 0.3, 1.35, 129.35), P(XS + 0.3, -1.35, 129.35)]
    parts(g, "void").add([tuple(v) for v in q], [(0, 1, 2, 3)])
    # its floor frame at the foot, its roof (a door for the stages to come in by: not worked), the header over the north door
    for s in (-1, 1):
        box(red, (RN, s * W - (t if s > 0 else 0), z0 - 0.9), (XN, s * W + (0 if s > 0 else t), z0))
    box(red, (RN, -W, ROOF), (XS, W, ERECTOR_TOP))
    box(red, (RN, -W + t, DOOR_HEAD), (RN + t, W - t, ROOF))
    # the top level: a whole floor, the bridge crane's rails over it and the crane across them
    box(parts(g, "roomfloor"), (ROOM_NORTH, -W + t + 0.05, ROOM_LEVELS[3] - FLOOR_T), (XS - t - 0.05, W - t - 0.05, ROOM_LEVELS[3]))
    for s in (-1, 1):
        box(red, (RN + 0.5, s * (W - 2.2) - 0.35, BRIDGE_CRANE - 0.8), (XS - t, s * (W - 2.2) + 0.35, BRIDGE_CRANE))
    grey = parts(g, "grey", True)
    box(grey, (-1.0, -W + 1.9, BRIDGE_CRANE + 0.02), (1.0, W - 1.9, BRIDGE_CRANE + 1.8))
    box(grey, (-1.4, -1.4, BRIDGE_CRANE - 2.2), (1.4, 1.4, BRIDGE_CRANE))  # the hoist's trolley, over the spacecraft
    # a lamp over each of the three floors the crew's elevator serves, and a light for the viewer where each is
    # (strengths in fittings: estimated). Three, which is as many rooms as the viewer lights at once (lamps.ts): with a
    # fourth, which three were lit from across the pad went by where the eye had been. The top level, under the crane,
    # has none of its own.
    for k in range(3):
        head = ROOM_LEVELS[k + 1] - FLOOR_T - 0.3
        box(parts(g, "lamp-room"), (XS - 4.5, -3.0, head - 0.2), (XS - 3.5, 3.0, head))
        parts.node(f"Light_WhiteRoom{k + 1}", g, (XS - 6.0, 0.0, head - 1.5), intensity=1.6 * interiors.FITTING, reach=9.0)


def north_door(parts: Parts) -> None:
    """The roll-up door "down the entire north side" of the white room, opened before the erector was lowered so that
    the room came away from the spacecraft. Built as four lengths that slide up behind the header, one behind the
    other: a rolling door's drum is not modelled."""
    g = "Erector"
    z0 = WHITE_ROOM[0]
    h = (DOOR_HEAD - z0) / DOOR_LENGTHS
    for k in range(DOOR_LENGTHS):
        node = f"Erector_NorthDoor_{k + 1}"
        x = RN + 0.5 + 0.3 * (DOOR_LENGTHS - 1 - k)
        za = z0 + k * h
        parts.node(node, g, (x, 0.0, za), rise=round((DOOR_LENGTHS - k) * h * FT, 3))
        box(parts(node, "room"), (x - 0.1, -W + 0.45, za), (x + 0.1, W - 0.45, za + h - 0.02))
        if fine():  # the door's slats
            for j in range(1, int(h)):
                box(parts(node, "galv"), (x - 0.14, -W + 0.5, za + j - 0.03), (x - 0.1, W - 0.5, za + j + 0.03))


def lift(parts: Parts, side: int, stops: list[tuple[str, float]]) -> None:
    """An elevator: an open cage in an angle frame on four guides up the outside of the face, by the south corner."""
    g = "Erector"
    name = f"Erector_Lift_{'East' if side > 0 else 'West'}"
    x0, x1 = CAR_X
    ya, yb = sorted((side * (W + 0.35), side * (W + 0.35 + CAR_W)))
    zf, top = stops[0][1], stops[-1][1]
    parts.node(
        name,
        g,
        ((x0 + x1) / 2, (ya + yb) / 2, zf),
        lift=1,
        stops=[round((z - zf) * FT, 3) for _, z in stops],
        stop_names=[n for n, _ in stops],
    )
    frame, floor, panel = parts(name, "red", True), parts(name, "deck"), parts(name, "mesh")
    h = 7.4
    box(floor, (x0, ya, zf - 0.2), (x1, yb, zf))
    box(frame, (x0 - 0.05, ya - 0.05, zf + h), (x1 + 0.05, yb + 0.05, zf + h + 0.15))
    for x in (x0 + 0.08, x1 - 0.08):
        for y in (ya + 0.08, yb - 0.08):
            beam(frame, (x, y, zf), (x, y, zf + h), 0.16)
    out = yb - 0.08 if side > 0 else ya + 0.08  # the cage is open toward the erector
    for a, b in (((x0 + 0.08, ya), (x0 + 0.08, yb)), ((x1 - 0.08, ya), (x1 - 0.08, yb)), ((x0, out), (x1, out))):
        q = [P(*a, zf + 0.1), P(*b, zf + 0.1), P(*b, zf + h - 0.1), P(*a, zf + h - 0.1)]
        panel.add([tuple(v) for v in q], [(0, 1, 2, 3)])
    # the guides, tied back to the face at every girt, and a sill at each stop
    red = parts(g, "red", True)
    for x in (x0 - 0.35, x1 + 0.35):
        for y in (ya + 0.3, yb - 0.3):
            beam(red, (x, y, 1.0), (x, y, top + h + 2.5), 0.3)
    for z in [zz for zz in (14.0, 25.0, *WORK_LEVELS, WHITE_ROOM[0] + 1.0, *(v - 1.2 for v in ROOM_LEVELS)) if zz < top + h + 2.5]:
        for x in (x0 - 0.35, x1 + 0.35):
            beam(red, (x, side * (W - 0.2), z - 1.2), (x, side * (W + 0.5 + CAR_W), z - 1.2), 0.25)
    beam(red, (x0 - 0.35, side * (W + 0.35 + CAR_W - 0.3), top + h + 2.3), (x1 + 0.35, side * (W + 0.35 + CAR_W - 0.3), top + h + 2.3), 0.3)
    sills = parts(g, "reddeck/sills")
    for _, z in stops:
        yi, yo = sorted((side * (W - 1.3), side * (W + 0.3)))
        box(sills, (x0 + 0.3, yi, z - 0.2), (x1 - 0.3, yo, z - 0.02))


def stair_tower(parts: Parts) -> None:
    """The stairs: "complete with elevators and stairs" is all that is said of them (the handbook). Built as a
    switchback outside the west face, north of the service elevator, a landing at each level and one between: that
    side and that form are ours, chosen clear of the umbilical tower. Estimated."""
    g = "Erector"
    steps, rails, red = parts(g, "reddeck/stairs"), parts(g, "red/stairrails", True), parts(g, "red", True)
    ys = -W - 0.3  # the tower's inner edge, against the face
    lane = [ys - STAIR_LANE / 2, ys - STAIR_LANE * 1.5 - 0.6]  # each lane's walking line: the inner, the outer
    yo = ys - 2 * STAIR_LANE - 0.7
    xa, xb = STAIR_X[0] - LANDING, STAIR_X[1] + LANDING  # the flights run between these
    for za, zb in zip(STAIR_STOPS, STAIR_STOPS[1:]):
        zm = (za + zb) / 2
        stairs(steps, (xa, lane[0], za), (xb, lane[0], zm), STAIR_LANE)
        stairs(steps, (xb, lane[1], zm), (xa, lane[1], zb), STAIR_LANE)
        stair_rails(rails, (xa, lane[0], za), (xb, lane[0], zm), STAIR_LANE, 3.3)
        stair_rails(rails, (xb, lane[1], zm), (xa, lane[1], zb), STAIR_LANE, 3.3)
        box(steps, (STAIR_X[1], yo, zm - 0.22), (xb, ys, zm))  # the landing between
        handrail(rails, [(xb - 0.4, yo + 0.25, zm), (STAIR_X[1] + 0.15, yo + 0.25, zm), (STAIR_X[1] + 0.15, ys - 0.2, zm)], 3.5)
    for z in STAIR_STOPS:  # a landing at each level, across both lanes, and through the face on to the floor
        box(steps, (xa, yo, z - 0.22), (STAIR_X[0], -W + 0.3, z))
        handrail(rails, [(xa + 0.4, yo + 0.25, z), (STAIR_X[0] - 0.15, yo + 0.25, z), (STAIR_X[0] - 0.15, ys - 0.5, z)], 3.5)
    for x in STAIR_X:  # the two posts the landings hang on, tied to the face at every level
        beam(red, (x, yo, 1.0), (x, yo, STAIR_STOPS[-1] + 4.0), 0.35)
    for z in STAIR_STOPS:
        for x in (STAIR_X[0], STAIR_X[1]):
            beam(red, (x, yo, z - 0.45), (x, -W + 0.3, z - 0.45), 0.3)


def top_ladder(parts: Parts) -> None:
    """From the white room's top level to the bridge crane's rail: a ladder against the south wall (ours)."""
    top = BRIDGE_CRANE + 0.1
    parts.ladder("Erector", "crane", (XS - 1.3, -W + 3.9, ROOM_LEVELS[3]), (XS - 1.3, -W + 3.9, top), face=(1, 0, 0), mat="galv")
    box(parts("Erector", "reddeck"), (XS - 3.8, -W + 0.5, top - 0.2), (XS - 0.45, -W + 3.1, top))


def build(parts: Parts) -> None:
    g = "Erector"
    parts.node(g, None, (HINGE[0], 0.0, HINGE[1]), label="Launch vehicle erector")
    frame(parts)
    curtains(parts)
    white_room(parts)
    north_door(parts)
    # the foot's floor: a pad in each south corner, where the elevators' cars stand; the middle is open over the
    # thrust mount (S65-20994). On the west a walk from its pad to the foot of the stairs.
    floor, rails = parts(g, "reddeck"), parts(g, "red/rails", True)
    for s in (-1, 1):
        ya, yb = sorted((s * 5.8, s * (W - 0.3)))
        box(floor, (XS - SOUTH_WALK, ya, BASE - FLOOR_T), (XS - 0.8, yb, BASE))
        handrail(
            rails,
            [(XS - 0.9, s * 5.95, BASE), (XS - SOUTH_WALK + 0.15, s * 5.95, BASE), (XS - SOUTH_WALK + 0.15, s * (W - 2.0 if s > 0 else 10.4), BASE)],
            3.5,
        )
    box(floor, (STAIR_X[0] - 1.6, -W + 0.3, BASE - FLOOR_T), (XS - SOUTH_WALK, -W + 1.9, BASE))
    handrail(rails, [(STAIR_X[0] - 1.5, -W + 2.0, BASE), (XS - SOUTH_WALK, -W + 2.0, BASE)], 3.5)
    for n, z in enumerate(LEVELS, 1):
        room = n > len(WORK_LEVELS)
        level_floor(
            parts, n, z, ROOM_NORTH if room else XN, ROOM_R[n - len(WORK_LEVELS) - 1] if room else VEHICLE_R, "roomfloor" if room else "reddeck"
        )
        if not room:  # a rail across the open north end of each side floor
            for s in (-1, 1):
                handrail(rails, [(XN + 0.15, s * (SLOT + 0.2), z), (XN + 0.15, s * (W - 1.7), z)], 3.5)
    lift(parts, 1, EAST_STOPS)
    lift(parts, -1, WEST_STOPS)
    stair_tower(parts)
    top_ladder(parts)
    # the door from the express elevator's landing into the crew's level
    door(
        parts, "Erector_WhiteRoom_Door", g, (CAR_X[0] + 0.72, W - 0.2, CREW_FLOOR), (1, 0), CAR_X[1] - CAR_X[0] - 1.44, 6.65,
        swing=-95.0, mat="room", fittings="lever", sign="WHITE ROOM",
    )  # fmt: skip
    # work lamps along the head of the south face, which is the erector's end as it lies (S65-21881)
    parts.mark(g, "lamp", lens_out=1)
    for y in (-9.0, -3.0, 3.0, 9.0):
        lamp_head(parts(g, "red", True), parts(g, "lamp"), (XS - 0.9, y, ERECTOR_TOP + 0.9), (0.5, 0.0, 0.85), 0.7)
