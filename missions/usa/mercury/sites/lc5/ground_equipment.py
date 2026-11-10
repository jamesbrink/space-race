"""What else stood on the pad at liftoff, the floodlights and the camera towers.

None of these positions is documented. TM X-53107's countdown says the LOX topping trailer and the
LN2 trailers stayed through liftoff (T-60 s "LOX topping Off"; secured after the launch); MR-3
photographs (S61-01927, S61-02407/08) and MR-4's (S63-02651) show two white enclosures near the
launcher, one with a horizontal tank on top, a low box painted in orange and black chevrons, tripod
cameras, lattice camera towers, and floodlight poles with a crossarm carrying two lamps. All are
placed off the rails' corridor and off the hatch side, where the cherry picker stood; all estimated.
"""

from __future__ import annotations

import math

from mathutils import Vector

from srlib import FT

from .site import P, Parts, axes, beam, box, fine, lamp_head, lattice, obox

FLOOD_POLES = ((-95.0, -62.0), (-95.0, 62.0), (-62.0, -97.0), (62.0, -97.0), (95.0, -70.0), (95.0, 66.0))
FLOOD_HEIGHT = 40.0
CAMERA_TOWERS = ((-72.0, -38.0, 62.0), (-58.0, 78.0, 50.0))  # x, y, height
TRIPODS = ((-40.0, -30.0), (-45.0, 25.0), (30.0, -45.0), (-25.0, -55.0))


def build(parts: Parts) -> None:
    parts.node("GroundEquipment")
    white, dark, tank, stripe, black = (
        parts("GroundEquipment", "trailer"),
        parts("GroundEquipment", "chassis", True),
        parts("GroundEquipment", "trailer/tank", True),
        parts("GroundEquipment", "orange"),
        parts("GroundEquipment", "black"),
    )
    # the LOX topping unit: a horizontal insulated tank on a white enclosure, on a trailer's wheels
    x0, y0 = -30.0, -26.0
    box(white, (x0 - 4.0, y0 - 11.0, 1.6), (x0 + 4.0, y0 + 11.0, 8.0))
    box(dark, (x0 - 3.2, y0 - 10.0, 1.0), (x0 + 3.2, y0 + 10.0, 1.62))
    tank.lathe(
        [
            (0, 0),
            (1.6 * FT, 0.3 * FT),
            (2.6 * FT, 1.3 * FT),
            (2.75 * FT, 2.5 * FT),
            (2.75 * FT, 16.5 * FT),
            (2.6 * FT, 17.7 * FT),
            (1.6 * FT, 18.7 * FT),
            (0, 19.0 * FT),
        ],
        24,
        matrix=axes((x0, y0 - 9.5, 10.85), (1, 0, 0), (0, 1, 0)),
    )
    for dy in (-6.0, 6.0):  # saddles
        box(white, (x0 - 2.2, y0 + dy - 0.4, 8.0), (x0 + 2.2, y0 + dy + 0.4, 9.1))
    for side in (-1, 1):
        for dy in (-6.5, -3.5):
            dark.tube(P(x0 + side * 3.3, y0 + dy, 1.4), P(x0 + side * 3.95, y0 + dy, 1.4), 1.4 * FT, 16)
    box(dark, (x0 - 0.5, y0 + 11.0, 0.9), (x0 + 0.5, y0 + 15.0, 1.3))  # drawbar
    if fine():
        for k in range(3):  # louvres and a door on the enclosure
            box(black, (x0 - 4.05, y0 - 8.0 + k * 3.0, 4.0), (x0 - 3.9, y0 - 6.0 + k * 3.0, 6.5))
        box(black, (x0 + 3.9, y0 + 2.0, 1.8), (x0 + 4.05, y0 + 5.0, 7.0))

    # a second, smaller enclosure: LN2 or the peroxide unit (estimated)
    x1, y1 = -24.0, 22.0
    box(white, (x1 - 4.0, y1 - 5.5, 1.6), (x1 + 4.0, y1 + 5.5, 7.5))
    box(dark, (x1 - 3.2, y1 - 4.5, 1.0), (x1 + 3.2, y1 + 4.5, 1.62))
    for side in (-1, 1):
        dark.tube(P(x1 + side * 3.3, y1 - 2.0, 1.4), P(x1 + side * 3.95, y1 - 2.0, 1.4), 1.4 * FT, 16)
    tank.lathe(
        [(0, 0), (1.3 * FT, 0), (1.3 * FT, 4.0 * FT), (0.9 * FT, 4.6 * FT), (0, 4.8 * FT)],
        20,
        matrix=axes((x1 + 1.5, y1 + 2.0, 7.5), (1, 0, 0), (0, 0, 1)),
    )

    # the low box painted in chevrons, 15 to 20 ft from the launcher
    sx, sy = -20.0, 8.0  # clear of the service structure's base
    box(black, (sx - 4.5, sy - 2.0, 0.0), (sx + 4.5, sy + 2.0, 3.0))
    n = 6
    for k in range(n):  # orange chevrons on the long faces, a few millimetres proud of the black
        for face in (-1, 1):
            yy = sy + face * 2.02
            xa = sx - 4.5 + k * 9.0 / n
            pts = [(xa, 0.05), (xa + 0.7, 0.05), (xa + 0.7 + 0.75, 1.5), (xa + 0.7, 2.95), (xa, 2.95), (xa + 0.75, 1.5)]
            verts = [tuple(P(px, yy, pz)) for px, pz in pts]
            stripe.add(verts, [(0, 1, 2, 5), (5, 2, 3, 4)] if face < 0 else [(0, 5, 2, 1), (5, 4, 3, 2)])

    # tripod cameras round the pad (TM X-53107 7.5.5.3: twenty fixed cameras near the pad)
    for tx, ty in TRIPODS:
        for k in range(3):
            a = math.tau * k / 3
            beam(dark, (tx + 1.2 * math.cos(a), ty + 1.2 * math.sin(a), 0.0), (tx, ty, 4.2), 0.12)
        aim = Vector((-tx, -ty, 8.0)).normalized()
        obox(black, (tx, ty, 4.75), (aim.x, aim.y, aim.z), (0, 0, 1) if abs(aim.z) < 0.9 else (1, 0, 0), (1.4, 0.7, 0.9))

    # camera towers: narrow galvanised lattices with a platform at the top
    parts.node("CameraTowers")
    galv, deck = parts("CameraTowers", "galv"), parts("CameraTowers", "deck")
    for cx, cy, h in CAMERA_TOWERS:
        w = 2.5

        def corner(i: int, z: float, cx=cx, cy=cy, w=w):
            return (cx + w * (1 if i in (0, 3) else -1), cy + w * (1 if i < 2 else -1), z)

        levels = [0.3 + k * (h - 0.3) / round(h / 7) for k in range(round(h / 7) + 1)]
        lattice(galv, corner, levels, 0.28, 0.16)
        for z in (h * 0.55, h):
            box(deck, (cx - w - 0.6, cy - w - 0.6, z - 0.2), (cx + w + 0.6, cy + w + 0.6, z))
        box(black, (cx - 0.7, cy - 0.5, h), (cx + 0.7, cy + 0.5, h + 1.0))  # the camera
        for i in range(4):
            px, py, _ = corner(i, 0)
            box(galv, (px - 0.6, py - 0.6, -FOOT_DEPTH), (px + 0.6, py + 0.6, 0.3))

    # floodlights: poles with a crossarm and two lamps, aimed at the vehicle
    parts.node("Floodlights")
    poles, lamps = parts("Floodlights", "grey", True), parts("Floodlights", "lamp", True)
    for x, y in FLOOD_POLES:
        poles.tube(P(x, y, -FOOT_DEPTH), P(x, y, FLOOD_HEIGHT), 0.42 * FT, 10)
        box(poles, (x - 1.0, y - 1.0, -FOOT_DEPTH), (x + 1.0, y + 1.0, 0.5))
        aim = Vector((-x, -y, 0)).normalized()
        side = Vector((-aim.y, aim.x, 0))
        bar = Vector((x, y, FLOOD_HEIGHT + 0.4))
        beam(poles, tuple(bar - side * 3.0), tuple(bar + side * 3.0), 0.35)
        for k in (-2.2, 2.2):
            beam(poles, tuple(bar + side * k), tuple(bar + side * k + Vector((0, 0, 0.6))), 0.2)
            lamp_head(poles, lamps, bar + side * k + Vector((0, 0, 1.2)), aim + Vector((0, 0, -0.35)), 1.1)


FOOT_DEPTH = 2.5
