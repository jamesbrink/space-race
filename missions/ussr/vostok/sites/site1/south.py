"""What stood south of the tracks' embankment and outside the south fence: the buildings, tanks, tents and yard that
one vertical photograph shows and a CIA report numbers.

The source is NPIC/B-24/61, "Search for underground entrances, Launch Area of Launch Complex A" (9 September 1961;
CIA-RDP78T04751A000200010027-4). Its Figure 1 is a vertical U-2 photograph of July 1959 with twelve items numbered,
and its text describes each from the photographs of August 1957 and July 1959: what stood in both, what had been
added, what had gone. Nothing later than July 1959 shows this ground before the flight, so all of it is **documented
for 1959 and assumed for April 1961**.

Where each stands is measured off the figure's native scan (0.445 m a pixel, fixed by two of the model's own roads
and checked against the spacing of the double fence, which measures 47.6 m against the documented 160 ft): good to
some ten metres. The sizes of items 3, 6 and 12 are the report's; the others' are redacted, and are read off the
print (a dithered half-tone on which a building 41 m long is 130 px): good to a few metres, estimated. Every wall,
door, window, roof pitch and colour is estimated: "one storey", "gable roof", "light construction and possibly
tar-paper-roofed" is all the report says of any of them. Their insides are not recorded: doors shut, windows dark.

  1   a one-storey gable-roofed building south of the embankment, "light construction ... tar-paper-roofed, with no vents"
  2   one "similar to those used for food or grain storage", a shallow gable, "five extensions spaced 10 feet apart on each side"
  3   a possible pump house on a pipe line: one storey, flat roof, 20 by 15 ft
  4, 5  each "a structure or 2 horizontal tanks", 35 ft apart, at the ends of two pipes from the embankment
  6   outside the fence, "possibly a vehicle shed or storage building": gable roof, 135 by 35 ft, long axis east and
      west, a flat-roofed extension 40 by 20 ft square to it at its east end
  7   outside the fence, a one-storey gable-roofed building with "a mast or tower ... along the south side"
  11  six ribbed tents in a staggered line (added after 1957; "not permanent")
  12  a solid-fenced area 325 by 130 ft, dark objects in its north-west corner (added after 1957)
Items 8, 9 and 10 had gone by 1959 and are not built.

Nodes: SouthBuilding_1, SouthStore_2, PumpHut_3, SouthTanks (4 and 5), VehicleShed_6, SouthBuilding_7, Tents_11,
FencedYard_12. See ../site-1.md, "South of the embankment".
"""

from __future__ import annotations

import math

from mathutils import Matrix

import sitelib

from .place import FLOOR, FOOTING
from .site import FT, GROUND, P, Parts, beam, box, fine, profile, stood

SEEN = dict(
    confidence="documented",
    source="NPIC/B-24/61 (9 September 1961), Figure 1 and text: the U-2's photographs of August 1957 and July 1959; assumed for 1961",
)
# Each building: its middle (m east, north), its length east to west and its breadth, the eave over the ground, m
ITEM_1 = ((-170.0, -66.0), 29.0, 9.5, 3.2)
ITEM_2 = ((-161.0, -96.0), 29.0, 9.0, 3.0)
ITEM_3 = ((-117.0, -139.0), 20.0 * FT, 15.0 * FT, 2.6)
TANKS = ((-163.5, -151.0), (-174.2, -151.0))  # items 4 and 5, 35 ft apart about where the print has the pair
ITEM_6 = ((-92.0, -257.0), 135.0 * FT, 35.0 * FT, 3.6)
ITEM_6_WING = (40.0 * FT, 20.0 * FT, 3.0)  # north to south, east to west, its roof: at the shed's east end, square to it
ITEM_7 = ((-100.0, -283.0), 30.0, 8.0, 3.0)
TENTS = [(-98.0 + (2.5 if k % 2 else -2.5), -318.0 - 5.8 * k) for k in range(6)]  # a staggered line, north to south
TENT = (12.0, 4.6, 1.5, 2.9)  # long, broad, the wall and the ridge over the ground, m (estimated off the print)
YARD = ((-120.0, -470.0), 130.0 * FT, 325.0 * FT, 2.2)  # its middle; east to west, north to south; the fence's height
PITCH = 0.42  # a gable roof's rise for each metre of half-span (estimated: a light roof under tar paper)


def _named(parts: Parts, node: str, label: str, about: str) -> None:
    parts.node(node, label=label, about=about + " Its place is good to ten metres; documented for 1959, assumed for 1961.")


def gabled(
    parts: Parts, node: str, key: str, at, length: float, breadth: float, eave: float, openings: dict, *, wall: str = "plaster", roof: str = "tar"
) -> tuple:
    """A one-storey building under a gable roof, its ridge east and west: walls with their openings, the gables above
    the end walls, two slopes oversailing the walls all round, a ridge board. Returns its rectangle."""
    cx, cy = at
    x0, y0, x1, y1 = cx - length / 2, cy - breadth / 2, cx + length / 2, cy + breadth / 2
    top = GROUND + eave
    sitelib.building(parts, node, key, (x0, y0, x1, y1), top, openings, floor=FLOOR, footing=-FOOTING, mat=wall, wall=0.3)
    rise = breadth / 2 * PITCH
    skin, cover = parts(node, f"{wall}/{key}gables"), parts(node, f"{roof}/{key}roof")
    for x, s in ((x0, 1), (x1, -1)):  # each gable: a wall's thickness of triangle over the end wall
        xa, xb = sorted((x, x + s * 0.3))
        sitelib.solid(skin, [[(xe, y0, top - 0.02), (xe, y1, top - 0.02), (xe, cy, top + rise - 0.02)] for xe in (xa, xb)])
    over, thick = 0.45, 0.09
    for s in (-1, 1):  # each slope: a slab from beyond the eave up to the ridge
        ye = cy + s * (breadth / 2 + over)
        ze = top - over * PITCH
        loops = [[(x, ye, ze), (x, cy, top + rise), (x, cy, top + rise + thick), (x, ye, ze + thick)] for x in (x0 - over, x1 + over)]
        sitelib.solid(cover, loops)
    box(cover, (x0 - over, cy - 0.09, top + rise + thick - 0.02), (x1 + over, cy + 0.09, top + rise + thick + 0.07))
    return x0, y0, x1, y1


def _door(a: float, w: float = 1.2, h: float = 2.1):
    return (a, a + w, FLOOR, FLOOR + h, "shut")


def _win(a: float, w: float = 1.2):
    return (a, a + w, FLOOR + 1.0, FLOOR + 2.0, "blind")


def inside_the_fence(parts: Parts) -> None:
    if stood("Gable-roofed building south of the embankment (item 1)", since="1957", **SEEN):
        g = "SouthBuilding_1"
        _named(
            parts,
            g,
            "Building south of the embankment",
            "One storey under a gable roof, 'light construction and possibly tar-paper-roofed, with no vents' (CIA, 1961, of the "
            "photographs of 1957 and 1959). Its size is read off the print (the figure is redacted); its walls, doors and windows are "
            "estimated.",
        )
        at, length, breadth, eave = ITEM_1
        gabled(parts, g, "one", at, length, breadth, eave, {2: [_door(4.0), _door(22.0)], 0: [_win(3 + 4.6 * k) for k in range(6)]})
    if stood("Store with five extensions a side, south of the embankment (item 2)", since="1957", **SEEN):
        g = "SouthStore_2"
        _named(
            parts,
            g,
            "Store south of the embankment",
            "'Similar to those used for food or grain storage': one storey, a shallow gable, 'five extensions spaced 10 feet apart on each "
            "side' (CIA, 1961). The extensions are drawn as buttresses; what they were is not said.",
        )
        at, length, breadth, eave = ITEM_2
        x0, y0, x1, y1 = gabled(parts, g, "two", at, length, breadth, eave, {1: [_door(3.0, 2.4, 2.4)], 3: [_door(3.0, 2.4, 2.4)]})
        ribs = parts(g, "plaster/extensions")
        pitch = 10.0 * FT + 1.6  # ten feet between extensions 1.6 m broad (their breadth estimated)
        first = at[0] - 2 * pitch
        for k in range(5):
            xc = first + k * pitch
            for s in (-1, 1):
                ya = y1 if s > 0 else y0
                sitelib.solid(
                    ribs,
                    [
                        [
                            (x, ya - s * 0.05, -FOOTING),
                            (x, ya + s * 1.5, -FOOTING),
                            (x, ya + s * 1.5, GROUND + 1.2),
                            (x, ya + s * 0.25, GROUND + eave - 0.4),
                            (x, ya - s * 0.05, GROUND + eave - 0.4),
                        ]
                        for x in (xc - 0.8, xc + 0.8)
                    ],
                )
    if stood("Possible pump house on a pipe line (item 3)", since="1957", **SEEN):
        g = "PumpHut_3"
        _named(
            parts,
            g,
            "Pump hut",
            "'A possible pump house' on a pipe line: one storey, a flat roof, 20 by 15 ft (CIA, 1961: the one building here whose size is "
            "not redacted).",
        )
        (cx, cy), length, breadth, eave = ITEM_3
        rect = (cx - length / 2, cy - breadth / 2, cx + length / 2, cy + breadth / 2)
        sitelib.building(
            parts, g, "pump", rect, GROUND + eave, {2: [_door(2.2, 1.0, 2.0)], 0: [_win(2.3)]}, floor=FLOOR, footing=-FOOTING, mat="plaster", wall=0.3
        )
        sitelib.flat_roof(parts, g, "pump", rect, GROUND + eave, over=0.3, mat="plaster")
    if stood("Two pairs of horizontal tanks between the fences (items 4 and 5)", since="1957", **SEEN):
        g = "SouthTanks"
        _named(
            parts,
            g,
            "Horizontal tanks",
            "Two things 35 ft apart at the ends of two pipes from the embankment, each 'a structure or 2 horizontal tanks' (CIA, 1961). "
            "They are drawn as pairs of tanks on cradles; their size is redacted and estimated.",
        )
        tank, conc = parts(g, "tank", True), parts(g, "concrete/cradles")
        r, long_ = 1.1, 6.0
        head = [(0.0, 0.0), (r * 0.6, 0.06), (r * 0.9, 0.25), (r, 0.6)]
        prof = head + [(q, long_ - z) for q, z in reversed(head)]

        lie = Matrix.Rotation(math.radians(-90), 4, "X")
        for cx, cy in TANKS:
            for dx in (-1.35, 1.35):
                tank.lathe(profile(prof), 16 if fine() else 10, matrix=Matrix.Translation(P(cx + dx, cy - long_ / 2, GROUND + 0.5 + r)) @ lie)
                for t in (0.22, 0.78):
                    y = cy - long_ / 2 + long_ * t
                    box(conc, (cx + dx - r * 0.8, y - 0.2, -FOOTING), (cx + dx + r * 0.8, y + 0.2, GROUND + 0.5 + r * 0.45))
            beam(parts(g, "grey/pipes"), (cx, cy + long_ / 2 + 0.1, GROUND + 0.5 + r), (cx, cy + long_ / 2 + 1.6, GROUND + 0.2), 0.14)


def outside_the_fence(parts: Parts) -> None:
    if stood("Vehicle shed or store outside the south fence (item 6)", since="1957", **SEEN):
        g = "VehicleShed_6"
        _named(
            parts,
            g,
            "Vehicle shed",
            "'Possibly a vehicle shed or storage building' outside the south fence: one storey, a gable roof, 135 by 35 ft with its long "
            "axis east and west, and a low flat-roofed extension 40 by 20 ft square to it at its east end (CIA, 1961: measured). Its doors "
            "are drawn as a shed's, along the north side; that is estimated.",
        )
        at, length, breadth, eave = ITEM_6
        doors = [(2.0 + 5.6 * k, 2.0 + 5.6 * k + 3.6, FLOOR, FLOOR + 3.0, "shut") for k in range(7)]
        x0, y0, x1, y1 = gabled(parts, g, "shed", at, length, breadth, eave, {2: doors})
        ns, ew, top = ITEM_6_WING
        rect = (x1 + 0.02, y1 - ns + 2.0, x1 + 0.02 + ew, y1 + 2.0)
        sitelib.building(
            parts, g, "wing", rect, GROUND + top, {1: [_door(3.0), _win(6.5), _win(9.0)]}, floor=FLOOR, footing=-FOOTING, mat="plaster", wall=0.3
        )
        sitelib.flat_roof(parts, g, "wing", rect, GROUND + top, over=0.3, mat="plaster")
    if stood("Gable-roofed building with a mast, outside the south fence (item 7)", since="1957", **SEEN):
        g = "SouthBuilding_7"
        _named(
            parts,
            g,
            "Building with a mast",
            "One storey under a gable roof outside the south fence, with 'a mast or tower ... along the south side' (CIA, 1961). Its size "
            "is read off the print; the mast's height is not given and is estimated.",
        )
        at, length, breadth, eave = ITEM_7
        x0, y0, x1, y1 = gabled(
            parts, g, "seven", at, length, breadth, eave, {2: [_door(5.0), _door(21.0)], 0: [_win(4 + 5.0 * k) for k in range(5)]}
        )
        pole = parts(g, "timber/mast", True)
        mx, my = at[0] + 6.0, y0 - 1.6
        pole.lathe(
            profile([(0.0, -FOOTING), (0.13, -FOOTING), (0.07, GROUND + 12.0), (0.0, GROUND + 12.0)]), 8, matrix=Matrix.Translation(P(mx, my, 0.0))
        )
        wire = parts(g, "wire/stays")
        for dx, dy in ((4.0, -2.5), (-4.0, -2.5), (0.0, 3.0)):
            beam(wire, (mx, my, GROUND + 10.5), (mx + dx, my + dy, GROUND + (eave if dy > 0 else 0.0)), 0.02)
    if stood("Six tents in a staggered line (item 11)", since="1959-07", **SEEN):
        g = "Tents_11"
        _named(
            parts,
            g,
            "Tents",
            "Six ribbed tents in a staggered line south of the two buildings, added between the photographs of 1957 and 1959 and 'not "
            "permanent' (CIA, 1961): whether they still stood in April 1961 is assumed. Their size is read off the print.",
        )
        canvas, wood = parts(g, "canvas", True), parts(g, "timber/poles")
        long_, broad, wall, ridge = TENT
        for cx, cy in TENTS:
            xa, xb = cx - long_ / 2, cx + long_ / 2
            loops = [
                [
                    (x, cy - broad / 2, -0.3),
                    (x, cy - broad / 2, GROUND + wall),
                    (x, cy, GROUND + ridge),
                    (x, cy + broad / 2, GROUND + wall),
                    (x, cy + broad / 2, -0.3),
                ]
                for x in (xa, xb)
            ]
            sitelib.solid(canvas, loops)
            n = 4 if fine() else 0
            for k in range(1, n):  # its ribs: a batten over the canvas at each frame
                x = xa + long_ * k / n
                for s in (-1, 1):
                    beam(wood, (x, cy + s * (broad / 2 + 0.02), GROUND + wall + 0.02), (x, cy + s * 0.03, GROUND + ridge + 0.04), 0.05)
            for x in (xa - 0.9, xb + 0.9):  # a pole and a guy at each end
                beam(wood, (x + (0.9 if x < cx else -0.9), cy, GROUND + ridge), (x, cy, -0.2), 0.03)
    if stood("Solid-fenced yard south of the tents (item 12)", since="1959-07", **SEEN):
        g = "FencedYard_12"
        _named(
            parts,
            g,
            "Fenced yard",
            "A solid-fenced area 325 by 130 ft, added between the photographs of 1957 and 1959, with dark objects in its north-west corner "
            "(CIA, 1961). Its place is good to thirty metres. What it held is not said: the fence alone is built, as boards on posts, "
            "which is estimated.",
        )
        (cx, cy), ew, ns, h = YARD
        boards, posts = parts(g, "plank/fence"), parts(g, "timber/posts")
        x0, y0, x1, y1 = cx - ew / 2, cy - ns / 2, cx + ew / 2, cy + ns / 2
        gate = (cx - 2.0, cx + 2.0)  # a gap in the north side for a gate (estimated)
        runs = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (gate[1], y1)), ((gate[0], y1), (x0, y1)), ((x0, y1), (x0, y0))]
        stand = set()  # (a corner's post is one post, whichever runs meet there)
        for (ax, ay), (bx, by) in runs:
            length = math.hypot(bx - ax, by - ay)
            ux, uy = (bx - ax) / length, (by - ay) / length
            nx, ny = -uy * 0.02, ux * 0.02
            sitelib.solid(
                boards,
                [
                    [
                        (px - nx, py - ny, GROUND - 0.2),
                        (px + nx, py + ny, GROUND - 0.2),
                        (px + nx, py + ny, GROUND + h),
                        (px - nx, py - ny, GROUND + h),
                    ]
                    for px, py in ((ax, ay), (bx, by))
                ],
            )
            n = max(1, round(length / 3.0))
            stand |= {(round(ax + ux * length * k / n, 3), round(ay + uy * length * k / n, 3)) for k in range(n + 1)}
        for px, py in sorted(stand):
            box(posts, (px - 0.07, py - 0.07, -FOOTING), (px + 0.07, py + 0.07, GROUND + h + 0.15))


def build(parts: Parts) -> None:
    inside_the_fence(parts)
    outside_the_fence(parts)


def summary() -> str:
    return (
        f"south of the embankment: buildings {ITEM_1[1]:.0f} and {ITEM_2[1]:.0f} m, pump hut {ITEM_3[1]:.1f} by {ITEM_3[2]:.1f} m, "
        f"shed {ITEM_6[1]:.1f} by {ITEM_6[2]:.1f} m, six tents, yard {YARD[2]:.0f} by {YARD[1]:.0f} m"
    )
