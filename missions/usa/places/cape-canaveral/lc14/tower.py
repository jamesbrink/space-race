"""The umbilical and emergency egress tower: the red four-legged tower on the stand's deck south-east of the vehicle.

What is documented: an "Umbilical Mast" that "rose 84'-6" above the Launch Stand", "ten levels of steel framing", "an
open truss steel structure" (HAER FL-8-7, p. 22); among the Mercury modifications "the construction of an emergency
egress tower", which "provided the astronaut with a means to evacuate the spacecraft by way of a platform which
extended to the door of the spacecraft" (p. 27); and of that platform: "When retracted, the platform is rotated in
the vertical plane about the opposite end and locked in the vertical position ... held in the vertical position during
the entire countdown and, if needed, it is lowered to the extended position in about 30 seconds by means of remote
control from the blockhouse" (Results of the First United States Manned Orbital Space Flight, p. 48, Figure 4-8).
NASA's captions call the platform the bascule.

The photographs show one tower, not two: by 22 January 1962 a tapered tower stood where the straight banded mast of
September 1961 had (NASA KSC-LOD-62-475 against the Atlas negatives of MA-4), carrying both the capsule's umbilical on a
gooseneck boom and the bascule. It is built so: the mast's documented height and ten levels are taken for it
(assumed), and everything else is scaled off the photographs named beside each figure (../lc-14.md, "The umbilical and
egress tower"): estimated.

  EgressTower           the tower, its stair, its two platforms
  EgressTower_Bascule   the gangway and its caged end platform, origin on its hinge; built stowed, upright
  EgressTower_Boom      the gooseneck that carries the capsule's umbilical, origin on its post; built over the capsule
"""

from __future__ import annotations

import math

from srlib import FT

from .site import HATCH_Z, SHIELD_Z, P, Parts, beam, box, fine, handrail, lamp_head, stair_rails, stairs, turned

TOP = 84.5  # the top platform's floor above the deck: the mast's 84 ft 6 in (HAER, p. 22), assumed for this tower
MID = 48.7  # the gallery half way up: 53/92 of the height (NASA KSC-62PC-0011, the liftoff from due south)
# In plan (NASA KSC-62PC-0011, GPN-2000-000998, KSC-63PC-0034; each 3 ft either way): the faces toward the vehicle stand
# upright, the west one 9 ft east of the vehicle's axis and the north one 22 ft south of it; the tower is 9 ft square
# from the gallery up, and below it the east and south faces spread to 18 ft at the deck.
WEST, NORTH = 9.0, -22.0
SHAFT = 9.0
SPREAD = 18.0
LEVELS = [MID * k / 5 for k in range(6)] + [MID + (TOP - MID) * k / 5 for k in range(1, 6)]  # ten levels of framing
# The stair: a switchback in a well in the tower's north-west corner, the same at every level: two half flights a level,
# the level's own landing at the well's south end and the half landing at its north (NASA KSC-LOD-62-475 has flights
# zigzagging inside the tower all the way up; which way round they ran is ours).
WELL_X = (WEST + 0.55, WEST + 6.25)  # across: the two flights side by side
FLIGHT_Y = (NORTH - 6.3, NORTH - 2.5)  # along: between the two landings
# The bascule (NASA S62-00380, from under it; KSC-62PC-0011, stowed): a gangway of open treads rising from its hinge
# beside the tower's west face to a level platform, caged in net, at the capsule's south side beside the hatch's
# southern edge. About 30 ft long in all.
HINGE_LEVEL = 8  # it leaves from the tower's eighth level: 15 ft under the top
BASCULE_X = (2.4, 6.2)  # the gangway, across
HINGE_Y = NORTH - SHAFT
CAGE = (-1.2, 8.3, 7.0, 7.5)  # the end platform: from, to (across); its length; the cage's height
SILL = HATCH_Z - 1.1  # the hatch's sill: the end platform's floor when lowered
END_Y = -3.4  # how near the vehicle's axis the platform's end comes: a foot off the capsule's skin
STOW = 90.0 - math.degrees(math.atan2(SILL - LEVELS[HINGE_LEVEL], END_Y - CAGE[2] - HINGE_Y))  # what it turns through from lowered to upright


def corner(i: int, z: float) -> tuple[float, float, float]:
    """Leg i at height z over the deck: 0 north-west (upright), 1 north-east, 2 south-east, 3 south-west."""
    w = SHAFT if z >= MID else SPREAD - (SPREAD - SHAFT) * z / MID
    return (WEST + (w if i in (1, 2) else 0.0), NORTH - (w if i in (2, 3) else 0.0), z)


def frame(parts: Parts) -> None:
    g = "EgressTower"
    red = parts(g, "orange")
    # the legs: each one member from the deck to the gallery and one from there to over the top platform, where it
    # is the rail's corner post (a member's end is never level with a floor: docs/agents/rendering.md, "No flicker")
    for i in range(4):
        beam(red, corner(i, -0.1), corner(i, MID + 0.35), 0.8)
        beam(red, corner(i, MID - 0.6), corner(i, TOP + 3.6), 0.6)
    for k, (z0, z1) in enumerate(zip(LEVELS, LEVELS[1:])):
        for i in range(4):
            j = (i + 1) % 4
            beam(red, corner(i, z1), corner(j, z1), 0.45)
            # an X on the east and south faces; one diagonal on the west, but where the tower is entered from the deck
            # and at the level the bascule is boarded from; the north face, where the half landings stand, has none
            if i in (1, 2):
                beam(red, corner(i, z0), corner(j, z1), 0.34)
                beam(red, corner(j, z0), corner(i, z1), 0.34)
            elif i == 3 and k not in (0, HINGE_LEVEL):
                beam(red, corner(i, z0), corner(j, z1), 0.34)
    for i in range(4):  # its feet on the deck
        x, y, _ = corner(i, 0.0)
        box(parts(g, "grey/feet"), (x - 1.0, y - 1.0, 0.0), (x + 1.0, y + 1.0, 0.25))


def width(z: float) -> float:
    return SHAFT if z >= MID else SPREAD - (SPREAD - SHAFT) * z / MID


def stair(parts: Parts) -> None:
    """Two half flights a level: from the level's landing north to the half landing, and back south to the next
    level's; and what floor each level has beside the well."""
    g = "EgressTower"
    st, rail, deck = parts(g, "orange/stair"), parts(g, "orange/stairrail"), parts(g, "deck")
    (xa, xb), (ys, yn) = WELL_X, FLIGHT_Y
    xm = (xa + xb) / 2
    for z0, z1 in zip(LEVELS, LEVELS[1:]):
        zm = (z0 + z1) / 2
        stairs(st, (xa + 1.35, ys, z0), (xa + 1.35, yn, zm), 2.6)
        stairs(st, (xb - 1.35, yn, zm), (xb - 1.35, ys, z1), 2.6)
        box(deck, (xa - 0.1, yn, zm - 0.2), (xb + 0.1, NORTH - 0.35, zm))  # the half landing
        beam(st, (xm, ys, z0 + 3.2), (xm, yn, zm + 3.2), 0.12)  # the rail between the two flights
        beam(st, (xm, yn, zm + 3.2), (xm, ys, z1 + 3.2), 0.12)
        handrail(rail, [(xa, NORTH - 0.5, zm), (xb, NORTH - 0.5, zm)], 3.2)
        # the level's landing across the well's south end, and below the gallery the floor east and south of it
        w = width(z1)
        if z1 < TOP - 0.1 and abs(z1 - MID) > 0.1:
            box(deck, (WEST + 0.3, NORTH - min(w, SHAFT) + 0.3, z1 - 0.2), (WEST + min(w, SHAFT) - 0.3, ys, z1))


def platforms(parts: Parts) -> None:
    g = "EgressTower"
    deck, rail, red = parts(g, "deck/platforms"), parts(g, "orange/rails"), parts(g, "orange")
    xb, ys = WELL_X[1], FLIGHT_Y[0]
    e, s0 = WEST + SHAFT, NORTH - SHAFT  # the shaft's east and south faces
    # the gallery at mid height: the tower's floor but for the well, carried out 4.5 ft east and south, railed
    x1, y0 = e + 4.5, s0 - 4.5
    box(deck, (WEST + 0.3, y0, MID - 0.2), (x1, ys, MID))
    box(deck, (xb + 0.5, ys, MID - 0.2), (x1, NORTH - 0.3, MID))
    handrail(rail, [(x1 - 0.15, NORTH - 0.4, MID), (x1 - 0.15, y0 + 0.15, MID), (WEST + 0.4, y0 + 0.15, MID)], 3.5)
    for dy in (-1.0, -SHAFT - 3.5):  # its knees back to the legs
        beam(red, (x1 - 0.4, NORTH + dy, MID - 0.3), (e, NORTH + dy, MID - 5.0), 0.3)
    # a floodlight on the gallery, turned on the vehicle (NASA S62-00380 has one beside a man on the tower)
    parts.mark(g, "lamp/flood", lens_out=1)
    at = (WEST + 1.2, y0 + 0.9)
    beam(parts(g, "grey/lampstand"), (*at, MID), (*at, MID + 4.6), 0.2)
    lamp_head(parts(g, "grey/lamphead", True), parts(g, "lamp/flood", True), (*at, MID + 5.3), (-0.3, 0.75, 0.55), 0.8)
    # the top platform: the tower's floor but for the well, carried 15 ft out east on two cantilevers, railed
    x1 = e + 15.0
    box(deck, (WEST + 0.3, s0, TOP - 0.2), (x1, ys, TOP))
    box(deck, (xb + 0.5, ys, TOP - 0.2), (x1, NORTH - 0.3, TOP))
    handrail(
        rail,
        [
            (xb + 0.65, NORTH - 0.45, TOP),
            (x1 - 0.15, NORTH - 0.45, TOP),
            (x1 - 0.15, s0 + 0.15, TOP),
            (WEST + 0.45, s0 + 0.15, TOP),
            (WEST + 0.45, ys - 0.2, TOP),
        ],
        3.5,
    )
    handrail(rail, [(xb + 0.65, NORTH - 1.4, TOP), (xb + 0.65, ys + 0.3, TOP)], 3.5)
    for dy in (-0.5, -SHAFT + 0.5):
        beam(red, (e, NORTH + dy, TOP - 0.5), (x1 - 0.3, NORTH + dy, TOP - 0.5), 0.5)
        beam(red, (x1 - 1.0, NORTH + dy, TOP - 0.6), (e, NORTH + dy, TOP - 9.0), 0.34)
    # where the bascule is boarded: out through the west face from its level's landing, and a stage south of the hinge
    zb = LEVELS[HINGE_LEVEL]
    box(deck, (BASCULE_X[1] + 0.25, s0 + 0.1, zb - 0.2), (WEST + 0.3, ys, zb))
    box(deck, (BASCULE_X[0] - 0.3, s0 - 3.4, zb - 0.2), (WEST + 0.3, s0 - 0.25, zb))
    handrail(rail, [(BASCULE_X[1] + 0.4, s0 + 0.3, zb), (BASCULE_X[1] + 0.4, ys - 0.15, zb), (WEST - 0.35, ys - 0.15, zb)], 3.5)
    handrail(
        rail,
        [(BASCULE_X[0] - 0.15, s0 - 0.4, zb), (BASCULE_X[0] - 0.15, s0 - 3.25, zb), (WEST + 0.15, s0 - 3.25, zb), (WEST + 0.15, s0 - 0.55, zb)],
        3.5,
    )
    for x in (BASCULE_X[0], WEST - 0.2):
        beam(red, (x, s0 - 3.2, zb - 0.4), (x, ys, zb - 0.4), 0.4)
    beam(red, (BASCULE_X[0], s0 - 3.0, zb - 0.6), (WEST, s0, zb - 6.0), 0.3)
    beam(red, (BASCULE_X[0], s0 - 0.3, zb - 0.45), (WEST, s0 - 0.3, zb - 0.45), 0.4)


def bascule(parts: Parts) -> None:
    """Built lowered, then turned upright about its hinge, as it stood through the count."""
    g = "EgressTower_Bascule"
    zb = LEVELS[HINGE_LEVEL]
    hinge = ((BASCULE_X[0] + BASCULE_X[1]) / 2, HINGE_Y, zb - 0.1)
    parts.node(g, "EgressTower", hinge)
    red, tread, net, rail = parts(g, "orange"), parts(g, "deck/treads"), parts(g, "mesh"), parts(g, "orange/rails")
    xm = hinge[0]
    y_end = END_Y - CAGE[2]  # where the gangway meets the level platform
    foot, top = (xm, HINGE_Y, zb), (xm, y_end, SILL)
    w = BASCULE_X[1] - BASCULE_X[0]
    stairs(tread, foot, top, w - 0.5, rise=0.6)
    stair_rails(rail, foot, top, w - 0.5, 3.4)
    for s in (-1, 1):  # its two stringer girders, under the treads
        x = xm + s * (w / 2 - 0.1)
        beam(red, (x, HINGE_Y, zb - 0.9), (x, y_end, SILL - 0.9), 0.7)
    # the level platform at its end and the cage on it: four posts, a top frame, an X in each side, net all round but
    # toward the hatch and toward the gangway
    xa, xb, length, h = CAGE
    box(parts(g, "deck/platform"), (xa, y_end, SILL - 0.25), (xb, END_Y, SILL))
    box(red, (xa + 0.1, y_end + 0.1, SILL - 1.0), (xb - 0.1, END_Y - 0.1, SILL - 0.26))
    for x in (xa + 0.15, xb - 0.15):
        for y in (y_end + 0.15, END_Y - 0.15):
            beam(red, (x, y, SILL), (x, y, SILL + h), 0.22)
        beam(red, (x, y_end + 0.15, SILL + h), (x, END_Y - 0.15, SILL + h), 0.2)
        beam(red, (x, y_end + 0.15, SILL), (x, END_Y - 0.15, SILL + h), 0.14)
        beam(red, (x, END_Y - 0.15, SILL), (x, y_end + 0.15, SILL + h), 0.14)
    for y in (y_end + 0.15, END_Y - 0.15):
        beam(red, (xa + 0.15, y, SILL + h), (xb - 0.15, y, SILL + h), 0.2)
    # net: the east side, the far end east of the hatch, and the south side east of the gangway
    quads = [
        [(xb - 0.15, y_end + 0.15, SILL), (xb - 0.15, END_Y - 0.15, SILL), (xb - 0.15, END_Y - 0.15, SILL + h), (xb - 0.15, y_end + 0.15, SILL + h)],
        [(xb - 0.15, END_Y - 0.15, SILL), (xa + 4.0, END_Y - 0.15, SILL), (xa + 4.0, END_Y - 0.15, SILL + h), (xb - 0.15, END_Y - 0.15, SILL + h)],
        [(xa + 0.15, END_Y - 0.15, SILL), (xa + 0.15, y_end + 0.15, SILL), (xa + 0.15, y_end + 0.15, SILL + h), (xa + 0.15, END_Y - 0.15, SILL + h)],
    ]
    for q in quads:
        net.add([tuple(P(*v)) for v in q], [(0, 1, 2, 3)])
    beam(red, (BASCULE_X[0] - 0.2, HINGE_Y, zb - 0.1), (BASCULE_X[1] + 0.2, HINGE_Y, zb - 0.1), 0.5)  # the hinge's shaft
    turned(parts, g, hinge, "X", STOW)


def boom(parts: Parts) -> None:
    """The capsule's umbilical: a post up the tower's north-west leg and a gooseneck from its head out over the
    capsule, the hose hanging from it in a loop to the capsule's foot on the tower's side (NASA KSC-LOD-62-475, 22
    January 1962). Its own node, origin on the post: it is gone from over the capsule in the photographs of the liftoff."""
    g = "EgressTower_Boom"
    post = (WEST - 1.2, NORTH + 1.2, TOP - 14.0)
    parts.node(g, "EgressTower", post)
    pipe, hose = parts(g, "grey/boom", True), parts(g, "cable/hose", True)
    head = (post[0], post[1], TOP + 9.0)
    pipe.tube(P(*post), P(*head), 0.3 * FT, 10)
    tip = (4.4, -10.2, TOP + 10.0)  # short of the white room's doors, over which it stands while the structure is there
    n = 12
    path = []
    for k in range(n + 1):
        t = k / n
        path.append(
            (head[0] + (tip[0] - head[0]) * t, head[1] + (tip[1] - head[1]) * t, head[2] + (tip[2] - head[2]) * t + 5.0 * math.sin(math.pi * t))
        )
    for a, b in zip(path, path[1:]):
        pipe.tube(P(*a), P(*b), 0.22 * FT, 8)
    # the hose: down from the tip in a loop outside where the white room's doors come, and in under the room's floor to
    # the plug at the capsule's foot, on the side toward the tower
    plug = (2.3, -2.3, SHIELD_Z - 0.9)
    low = (3.6, -9.4, SHIELD_Z - 4.5)
    sag = [
        (
            tip[0] + (low[0] - tip[0]) * k / 8,
            tip[1] + (low[1] - tip[1]) * k / 8 - 1.2 * math.sin(math.pi * k / 8),
            tip[2] + (low[2] - tip[2]) * (k / 8) ** 1.3,
        )
        for k in range(9)
    ]
    sag += [
        (
            low[0] + (plug[0] - low[0]) * k / 6,
            low[1] + (plug[1] - low[1]) * k / 6,
            low[2] + (plug[2] - low[2]) * (k / 6) ** 2 - 1.0 * math.sin(math.pi * k / 6),
        )
        for k in range(1, 7)
    ]
    for a, b in zip(sag, sag[1:]):
        hose.tube(P(*a), P(*b), 0.12 * FT, 8)
    if fine():  # the post's clamps to the leg
        for z in (TOP - 12.0, TOP - 4.0, TOP - 0.6):
            beam(parts("EgressTower", "grey/clamps"), (post[0], post[1], z), (WEST, NORTH, z), 0.2)


def build(parts: Parts) -> None:
    parts.node("EgressTower", None, (WEST, NORTH, 0.0))
    frame(parts)
    stair(parts)
    platforms(parts)
    bascule(parts)
    boom(parts)
