"""Pad 6: the other half of the complex, 520 ft up the track from pad 5. Tactical Redstones were
still flying from it in 1961 (9 March, 18 May, and the last on 27 June), from a launch ring like pad
5's, under a service structure of its own: a square-topped portal gantry on the same rails (the
museum's "Redstone in square top gantry, 8 March 1961, Pad 6"; FHSU F19_008, July 1961).

Documented: that the pad, the ring and its scale plate, and the gantry were there. Derived: the
pad's place and size (OpenStreetMap: 199.7 by 199.2 ft, square to the rails, its centre 519 ft from
pad 5's). Estimated: everything about the gantry's size and form, scaled off the two photographs,
and where it stood on 5 May, which is not recorded: it is parked at the pad's south edge, where the
July photographs have it. Whether a missile stood on the ring that morning is not known; none is modelled.
"""

from __future__ import annotations

from mathutils import Vector

from srlib import FT

from . import hardstand, launcher
from .blockhouse import NOSE, S
from .site import GAUGE, PAD6, RAIL_PAIR_X, RAIL_TOP, TRENCH_END, P, Parts, beam, box, fine, handrail, lattice, timber_pole, truss

TRENCH6_END = (TRENCH_END[0], PAD6[1] - TRENCH_END[1])  # pad 5's, mirrored about the blockhouse's axis
TRENCH6_TO = S(NOSE - 2.1, -NOSE + 2.1)  # the pad 6 firing room's corner

# This pad is only ever seen from 100 m and more, where faces a few millimetres apart cannot be
# told apart in depth. So what lies flat on its slabs stands this much further off them than on pad 5.
FAR = 0.07
GANTRY_Y = PAD6[1] + 78.0  # parked at the pad's south edge (estimated)
GANTRY_TOP = 98.0  # 8 March 1961 photograph: 1.42 times the 69 ft missile inside it
LEG_X, LEG = 14.0, 3.6  # each leg's centre line and half its side: the legs stand outside the rails so a finned missile passes between
HEAD = 6.5  # the depth of the truss across the top
BOX = (9.0, 8.0, 47.0, 84.0)  # the work enclosure hung between the legs: half width, half depth, floor, roof


def build(parts: Parts) -> None:
    g = "Pad6"
    parts.node(g)
    cy = PAD6[1]
    hardstand.field(parts, g, cy, inset=0.6)
    hardstand.burns(parts, g, cy, lift=FAR)
    hardstand.scale_plate(parts, g, cy)
    hardstand.trench(parts, g, TRENCH6_END, TRENCH6_TO, cy, lift=FAR)
    launcher.build(parts, "Pad6Launcher")
    parts.shift("Pad6Launcher", (0.0, cy, 0.0))
    for x, y in ((-104.0, -70.0), (-104.0, 70.0), (104.0, -70.0), (104.0, 70.0)):
        timber_pole(parts, g, x, cy + y, 38.0, lamps=3, aim=(-x, -y, 0))
    gantry(parts)


def gantry(parts: Parts) -> None:
    g = "Pad6Gantry"
    parts.node(g)
    red, white, dark, deck = parts(g, "red"), parts(g, "white"), parts(g, "chassis", True), parts(g, "deck")
    gy = GANTRY_Y
    z0, z1 = 7.0, GANTRY_TOP - HEAD
    bays = 12 if fine() else 6
    levels = [z0 + (z1 - z0) * k / bays for k in range(bays + 1)]
    for sx in (-1, 1):

        def corner(i: int, z: float, sx=sx):
            return (sx * LEG_X + LEG * (1 if i in (0, 3) else -1), gy + LEG * (1 if i < 2 else -1), z)

        lattice(red, corner, levels, 0.7, 0.36)
        # the truck under it: a girder along the rails on two bogies, with the drive's cabinets on top
        x0, x1 = sorted((sx * 6.5, sx * 19.5))
        box(red, (x0, gy - 14.0, 3.0), (x1, gy + 14.0, 7.0))
        for y in (gy - 9.0, gy + 9.0):
            box(dark, (x0 + 0.4, y - 4.0, 0.9), (x1 - 0.4, y + 4.0, 3.02))
            for ya in (y - 2.4, y + 2.4):
                for d in (-1, 1):
                    xr = sx * RAIL_PAIR_X + d * GAUGE / 2
                    dark.tube(P(xr - 0.2, ya, RAIL_TOP + 1.4), P(xr + 0.2, ya, RAIL_TOP + 1.4), 1.4 * FT, 20)
        for y in (gy - 12.0, gy + 12.0):  # machinery cabinets fore and aft of the leg
            ya, yb = sorted((y - 2.0, y + 2.0))
            box(parts(g, "grey"), (x0 + 1.0, ya, 7.0), (x1 - 1.0, yb, 12.5))
        # raking stays from the girder's ends up to the leg (F19_008)
        for sy in (-1, 1):
            for dx in (-LEG, LEG):
                beam(red, (sx * LEG_X + dx, gy + sy * 13.5, 7.0), (sx * LEG_X + dx, gy + sy * LEG, 34.0), 0.5)
        # a ladder up the outside of each leg
        lx = sx * (LEG_X + LEG + 0.5)
        for dy in (-0.75, 0.75):
            beam(white, (lx, gy + dy, 7.0), (lx, gy + dy, GANTRY_TOP + 3.0), 0.12)
        step = 1.0 if fine() else 3.0
        for n in range(int((GANTRY_TOP - 8.0) / step)):
            beam(white, (lx, gy - 0.75, 8.0 + n * step), (lx, gy + 0.75, 8.0 + n * step), 0.07)

    # the square top: a box truss across the two legs, a walkway on it, the hoist under it
    def head(i: int, s: float):
        return (s, gy + LEG * (1 if i in (0, 3) else -1), GANTRY_TOP if i < 2 else z1 + 0.7)

    span = LEG_X + LEG
    truss(red, head, [-span + 2 * span * n / 8 for n in range(9)], 0.7, 0.36)
    box(deck, (-span, gy - LEG - 0.4, GANTRY_TOP + 0.35), (span, gy + LEG + 0.4, GANTRY_TOP + 0.6))
    c = [
        (-span + 0.2, gy - LEG - 0.2),
        (span - 0.2, gy - LEG - 0.2),
        (span - 0.2, gy + LEG + 0.2),
        (-span + 0.2, gy + LEG + 0.2),
        (-span + 0.2, gy - LEG + 2.4),
    ]
    handrail(white, [(x, y, GANTRY_TOP + 0.6) for x, y in c], 3.3)
    box(dark, (-2.5, gy - 2.0, z1 - 2.2), (2.5, gy + 2.0, z1 + 0.3))  # the trolley
    for dx in (-0.5, 0.5):
        beam(dark, (dx, gy, BOX[3] + 3.4), (dx, gy, z1 - 2.2), 0.07)
    box(dark, (-0.9, gy - 0.6, BOX[3] + 1.5), (0.9, gy + 0.6, BOX[3] + 3.5))  # the hook block
    for x in (-span + 1.0, span - 1.0):  # whips on the corners
        dark.tube(P(x, gy, GANTRY_TOP + 0.6), P(x, gy, GANTRY_TOP + 11.0), 0.04 * FT, 6)

    # the work enclosure: three storeys of white panels in a frame, hung between the legs, with an
    # open railed deck under it
    hw, hd, zb, zt = BOX
    storey = (zt - zb) / 3
    panel = parts(g, "trailer")
    for n in range(3):
        za = zb + n * storey
        box(panel, (-hw, gy - hd, za + 0.5), (hw, gy + hd, za + storey - 0.12))
        box(deck, (-hw - 0.5, gy - hd - 0.5, za - 0.12), (hw + 0.5, gy + hd + 0.5, za + 0.5))  # its floor, standing out as a band
        for sx in (-1, 1):  # the arms it hangs from
            for y in (gy - LEG, gy + LEG):
                beam(red, (sx * hw, y, za + 0.2), (sx * (LEG_X - LEG), y, za + 0.2), 0.5)
    box(deck, (-hw - 0.5, gy - hd - 0.5, zt - 0.12), (hw + 0.5, gy + hd + 0.5, zt + 0.3))
    if fine():  # the panels' frame: uprights and a rail at mid height on each face, proud of the skin
        for n in range(3):
            za, zc = zb + n * storey + 0.5, zb + (n + 1) * storey - 0.12
            for sy in (-1, 1):
                ya, yb = sorted((gy + sy * hd, gy + sy * (hd + 0.22)))
                for x in (-hw + 0.15, -hw / 2, 0.0, hw / 2, hw - 0.15):
                    box(white, (x - 0.15, ya, za + 0.02), (x + 0.15, yb, zc - 0.02))
                box(white, (-hw + 0.3, ya, (za + zc) / 2 - 0.12), (hw - 0.3, yb, (za + zc) / 2 + 0.12))
            for sx in (-1, 1):
                xa, xb = sorted((sx * hw, sx * (hw + 0.22)))
                for y in (gy - hd + 0.15, gy, gy + hd - 0.15):
                    box(white, (xa, y - 0.15, za + 0.02), (xb, y + 0.15, zc - 0.02))
    # the door in the lowest storey's south face, and a lamp over it
    box(dark, (-1.5, gy + hd - 0.1, zb + 0.5), (1.5, gy + hd + 0.3, zb + 7.3))
    low = zb - 8.0
    box(deck, (-hw - 2.0, gy - hd - 2.0, low - 0.4), (hw + 2.0, gy + hd + 2.0, low))
    c = [(-hw - 1.8, gy - hd - 1.8), (hw + 1.8, gy - hd - 1.8), (hw + 1.8, gy + hd + 1.8), (-hw - 1.8, gy + hd + 1.8), (-hw - 1.8, gy - hd + 1.0)]
    handrail(white, [(x, y, low) for x, y in c], 3.5)
    for sx in (-1, 1):
        for y in (gy - LEG, gy + LEG):
            beam(red, (sx * (hw + 2.0), y, low - 0.2), (sx * (LEG_X - LEG), y, low - 0.2), 0.5)
    # the umbilical hanging in a loop under the deck (F19_008)
    cable = parts(g, "cable", True)
    path = [
        Vector((-4.0, gy, low - 0.4)),
        Vector((-3.4, gy, low - 7.0)),
        Vector((0.0, gy, low - 10.5)),
        Vector((3.4, gy, low - 7.0)),
        Vector((4.0, gy, low - 0.4)),
    ]
    cable.loft([p * FT for p in path], [(0.2 * FT, 0.2 * FT)] * len(path), 8, ref=(0, 1, 0))
