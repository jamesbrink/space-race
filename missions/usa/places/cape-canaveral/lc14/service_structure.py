"""The service structure: the red tower that stood over the stand and the vehicle until it was rolled away.

What is documented (HAER FL-8-7, pp. 22 and 27; the NHL nomination has 145 ft for its height): it "consisted of 14
movable decks of steel framework trapezoidal in shape which rose 154'-8""; "an inverted U-shaped, rigid box truss
frame design"; "mounted on rails which moved it to a rail-mounted transfer table"; for Mercury, "changes to the
configuration of the top of the gantry to accommodate the escape rocket tower" and "a 'white room' in the upper two
decks". Of the white room (Results of the First United States Manned Orbital Space Flight, pp. 47 and 48, Figures 4-6
and 4-7): sliding doors, a roof that folds and a floor that "also can be folded in a manner similar to that of the
roof", all "necessary to allow opening of the white room so that the service tower can be moved away from the flight
vehicle". It was driven by a diesel engine (NASA SP-45, of Mercury-Atlas 9's count).

Everything else is scaled off photographs, in feet off the Atlas's 10 ft tank, and is estimated (../lc-14.md, "The
service structure", says which photograph gives which figure): two legs standing on rails at the ground either side
of the 60 ft stand, some 72 ft over their outer faces and 30 ft deep, joined above the stand's deck and tapering to a
head 48 ft by 13; between them a slot open to the south, the full height of the vehicle, into which seven levels of
hinged leaves fold down round it, two a level (the fourteen movable decks, as read here); the white room at the
capsule, its doors two bright panels on the south face; over it a box girder head and the hoist's frame, a crane
reaching south. Stairs climb the west leg's outer side and on up inside the west tower (the photographs have stairs
zigzagging up both outer faces); the lift is put on the east leg's outer face (there was a passenger lift: where it
ran is not in anything read).

Built in the service position, round the vehicle, every leaf down and the white room shut. Local frame: the site's,
the node's origin on the vehicle's axis at the deck.
"""

from __future__ import annotations

import math

from mathutils import Matrix

import interiors
import sitelib
from srlib import FT

from .site import (
    APRON,
    DECK,
    RAIL_TOP,
    RAIL_X,
    SHIELD_Z,
    STRUCTURE_TOP,
    P,
    Parts,
    axle_cap,
    beam,
    box,
    box_girder,
    door,
    ear_clip,
    fine,
    ftp,
    handrail,
    rail_clamp,
    stairs,
)
from .stand import GANGWAY

NAME = "ServiceStructure"  # the part: the structure and the transfer table under it, carried east as one
G = "ServiceStructure_Tower"  # the structure itself, which rolls north on to the table: everything here is drawn on it
D0, D1 = 15.0, 6.5  # half its depth along the stand at the rails and at the head (NASA GPN-2000-000609, KSC-63PC-0034)
XO0, XO1 = 36.0, 24.0  # its outer faces from the middle, at the foot and at the head (NASA GPN-2000-000998)
TAPER = 125.0  # where the legs end under the head, above the rails
TUNNEL = 32.0  # the underside of the trusses that join the legs to the towers: 10 ft over the stand's deck
LEG_IN = 31.6  # the legs' inner faces, clear of the stand's side
SLOT = 9.0  # half the slot the vehicle stands in
WHITE = DECK + SHIELD_Z - 0.6  # the white room's floor: at the capsule's foot
LEVELS = [42.0 + (WHITE - 42.0) * k / 6 for k in range(7)]  # the seven levels of leaves, above the rails
ROOF = WHITE + 11.0  # the white room's roof
STAIR_LEVELS = [*LEVELS, ROOF + 0.3]  # where the west tower's stair lands: every level, and the white room's roof
GROUND_RISES = [0.0, 11.0, DECK, 32.0, LEVELS[0]]  # the ground stair's landings: the second level with the stand's deck
HEAD = (128.0, 136.0)  # the box girder head: clear of the escape tower's tip by 2.7 ft
TOP_DECK = STRUCTURE_TOP - 3.5  # the top deck: the published height is taken to its rail
WHEEL_R = 1.5
TRUCK_Y = (-10.0, 10.0)
AXLE = 2.4
# the white room in plan: between the two towers' inner partitions
ROOM_X = 18.0
DOOR_W, DOOR_H = 10.0, 15.0  # each sliding door: two bright panels about 10 ft by 15 (NASA GPN-2000-000609; KSC-LOD-62-475)
# the stair from the ground to the first level, on the west leg's outer side: its well's middle, along the stand
STAIR_Y = (GANGWAY[0] + GANGWAY[1]) / 2 - 5.0
STAIR_X = (XO0 + 0.3, XO0 + 6.5)
CAR = 5.0  # the lift's car, square


def H(h: float) -> float:
    """A height above the rails, in the site's frame."""
    return APRON + h


def d(h: float) -> float:
    return D0 - (D0 - D1) * min(max(h, 0.0), TAPER) / TAPER


def xo(h: float) -> float:
    return XO0 if h <= TUNNEL else XO0 - (XO0 - XO1) * (min(h, TAPER) - TUNNEL) / (TAPER - TUNNEL)


def sbox(mb, s: int, xa: float, xb: float, ya: float, yb: float, ha: float, hb: float) -> None:
    """A box on side s (-1 west, +1 east), its x span given unsigned, its heights above the rails."""
    x0, x1 = sorted((s * xa, s * xb))
    box(mb, (x0, ya, H(ha)), (x1, yb, H(hb)))


def sbeam(mb, s: int, a, b, w: float) -> None:
    beam(mb, (s * a[0], a[1], H(a[2])), (s * b[0], b[1], H(b[2])), w)


def cross(mb, s: int, a, b, w: float) -> None:
    """An X between two posts: a and b are (x, y, h) of one diagonal's ends."""
    sbeam(mb, s, a, b, w)
    sbeam(mb, s, (a[0], a[1], b[2]), (b[0], b[1], a[2]), w)


# ------------------------------------------------------------------- the base


def wheel(parts: Parts, k: int, s: int, y: float) -> None:
    """One flanged wheel on its rail: its own node, origin on its axle, which lies along X."""
    name = f"{NAME}_Wheel_{k}"
    zc = RAIL_TOP + WHEEL_R
    parts.node(name, G, (s * RAIL_X, y, zc))
    tread = [
        (0, -0.42),
        (1.24, -0.42),
        (1.24, -0.32),
        (WHEEL_R, -0.24),
        (WHEEL_R, 0.16),
        (1.62, 0.2),
        (1.62, 0.28),
        (1.4, 0.3),
        (0.5, 0.18),
        (0.42, 0.42),
        (0, 0.42),
    ]
    steel = parts(name, "grey", True)
    steel.lathe(ftp(tread), sitelib.wheel_sides(32), matrix=sitelib.axes((s * RAIL_X, y, zc), (0, 1, 0), (-s, 0, 0)))
    steel.tube(P(s * RAIL_X - 1.3, y, zc), P(s * RAIL_X + 1.3, y, zc), 0.25 * FT, 12)


def base(parts: Parts) -> None:
    """Each leg's sill girder on two rail trucks, two wheels a truck on the one rail; the diesel's house on the west sill."""
    red, dark, grey = parts(G, "orange/base"), parts(G, "chassis", True), parts(G, "grey", True)
    k = 0
    for s in (-1, 1):
        xg0, xg1 = sorted((s * (RAIL_X - 1.6), s * (RAIL_X + 1.6)))
        box_girder(red, xg0, xg1, -D0, D0, H(3.4), H(6.0), splices=(0.0,))
        for yt in TRUCK_Y:
            for xa, xb in ((RAIL_X - 1.25, RAIL_X - 0.85), (RAIL_X + 0.85, RAIL_X + 1.25)):  # side frames, either side of the wheels
                sbox(dark, s, xa, xb, yt - 4.2, yt + 4.2, 0.9, 3.0)
            sbox(dark, s, RAIL_X - 1.25, RAIL_X + 1.25, yt - 0.9, yt + 0.9, 3.0, 3.39)  # bolster
            for ya in (yt - AXLE, yt + AXLE):
                k += 1
                wheel(parts, k, s, ya)
                for xa, out in ((RAIL_X - 1.05, -1), (RAIL_X + 1.05, 1)):
                    sbox(dark, s, xa - 0.18, xa + 0.18, ya - 0.5, ya + 0.5, 1.05, 2.0)
                    axle_cap(grey, (s * (xa + out * 0.17), ya, RAIL_TOP + WHEEL_R), (s * out, 0, 0))
            for ye in (yt - 4.6, yt + 4.6):
                rail_clamp(dark, s * RAIL_X, ye, RAIL_TOP)
    # the diesel that drove it (NASA SP-45): a housing on the west sill's north end, its exhaust up the leg. Its place is ours.
    sbox(grey, -1, RAIL_X - 2.4, RAIL_X + 2.4, D0 - 8.5, D0 - 1.0, 6.0, 12.5)
    parts(G, "black/exhaust", True).tube(P(-RAIL_X - 1.6, D0 - 2.0, H(12.5)), P(-RAIL_X - 1.6, D0 - 2.0, H(17.5)), 0.3 * FT, 10)
    if fine():
        for y in (D0 - 7.0, D0 - 4.75, D0 - 2.5):
            sbox(parts(G, "black/louvres"), -1, RAIL_X + 2.4, RAIL_X + 2.5, y - 0.9, y + 0.9, 7.5, 11.0)


# ------------------------------------------------------------------- the frame


def open_panel(s: int, face: str, storey: float, where: str) -> bool:
    """Which braced panels are left as a portal, because something goes through them: the gangway to the stand's
    deck and the bridge from the ground stair (west leg and tower, north end), the lift's landings (east, middle)."""
    if face == "outer" and where == "middle":
        return True  # the middle bay of each outer face is clear at every storey: the lift on the east, a look-out on the west
    if s < 0 and where == "north" and face in ("outer", "inner") and 19.0 <= storey < TUNNEL:
        return True  # the gangway
    # and the bridge from the ground stair on to the first level
    return s < 0 and where == "north" and face == "outer" and abs(storey - LEVELS[0]) < 0.1


def legs(parts: Parts) -> None:
    """The legs under the trusses: box trusses 4.4 ft thick from the sills to 32 ft, in two storeys."""
    red = parts(G, "orange")
    tiers = [6.0, 19.0, TUNNEL]
    for s in (-1, 1):
        for x in (LEG_IN, XO0):  # each post one member from the sill to the truss
            for y_sign in (-1, 1):
                sbeam(red, s, (x, y_sign * d(5.6), 5.6), (x, y_sign * d(TUNNEL + 0.4), TUNNEL + 0.4), 1.1)
                sbeam(red, s, (x, y_sign * 4.0, 5.6), (x, y_sign * 4.0, TUNNEL + 0.3), 0.7)
        for h0, h1 in zip(tiers, tiers[1:]):
            for x, face in ((LEG_IN, "inner"), (XO0, "outer")):
                sbeam(red, s, (x, -d(h1), h1), (x, d(h1), h1), 0.8)
                for where, ya, yb in (("south", -1.0, -4.0), ("middle", -4.0, 4.0), ("north", 4.0, 1.0)):
                    if open_panel(s, face, h0, where):
                        continue
                    a = ya * d(h0) if abs(ya) == 1.0 else ya
                    b = yb * d(h1) if abs(yb) == 1.0 else yb
                    a1 = ya * d(h1) if abs(ya) == 1.0 else ya
                    b0 = yb * d(h0) if abs(yb) == 1.0 else yb
                    sbeam(red, s, (x, a, h0), (x, b, h1), 0.45)
                    sbeam(red, s, (x, b0, h0), (x, a1, h1), 0.45)
            for y_sign in (-1, 1):  # the legs' ends: ties and an X across their thickness
                sbeam(red, s, (LEG_IN, y_sign * d(h1), h1), (XO0, y_sign * d(h1), h1), 0.6)
                sbeam(red, s, (LEG_IN, y_sign * d(h0), h0), (XO0, y_sign * d(h1), h1), 0.4)


def trusses(parts: Parts) -> None:
    """From each leg in to the slot, over the stand's deck: the truss on each face that carries the tower's inner
    columns, between 32 ft and the first level."""
    red = parts(G, "orange")
    h0, h1 = TUNNEL, LEVELS[0]
    xs = [SLOT, 16.5, 24.0, LEG_IN]
    for s in (-1, 1):
        for y_sign in (-1, 1):
            y0, y1 = y_sign * d(h0), y_sign * d(h1)
            sbeam(red, s, (SLOT, y0, h0), (LEG_IN, y0, h0), 1.0)
            sbeam(red, s, (SLOT, y1, h1), (xo(h1), y1, h1), 0.9)
            for x in xs[1:-1]:
                sbeam(red, s, (x, y0, h0), (x, y1, h1), 0.7)
            for xa, xb in zip(xs, xs[1:]):
                sbeam(red, s, (xa, y1, h1), (xb, y0, h0), 0.5)
        for x in xs[:-1]:  # ties from face to face under the first level's floor
            sbeam(red, s, (x, -d(h0), h0), (x, d(h0), h0), 0.6)
        cross(red, s, (XO0, -d(h0), h0), (xo(h1), -4.0, h1), 0.45)
        if s > 0:
            cross(red, s, (XO0, d(h0), h0), (xo(h1), 4.0, h1), 0.45)


def towers(parts: Parts) -> None:
    """The two towers from the first level to the head: four columns each, a frame at every level, an X a storey on
    the outer face's end bays and on the north and south faces. The face on the slot is open: the leaves hinge there."""
    red = parts(G, "orange")
    storeys = [*LEVELS, ROOF, 120.0, TAPER]
    for s in (-1, 1):
        for y_sign in (-1, 1):  # each column one member: the outer ones from the legs' heads, the inner from the trusses
            sbeam(red, s, (XO0, y_sign * d(TUNNEL), TUNNEL), (xo(TAPER - 0.4), y_sign * d(TAPER - 0.4), TAPER - 0.4), 1.0)
            sbeam(red, s, (SLOT, y_sign * d(TUNNEL + 0.4), TUNNEL + 0.4), (SLOT, y_sign * d(TAPER - 0.4), TAPER - 0.4), 1.0)
            sbeam(red, s, (xo(LEVELS[0] - 0.4), y_sign * 3.0, LEVELS[0] - 0.4), (xo(TAPER - 0.4), y_sign * 3.0, TAPER - 0.4), 0.6)
        for h0, h1 in zip(storeys, storeys[1:]):
            for y_sign in (-1, 1):
                # the north and south faces. The white room's are clad: no X behind its siding
                sbeam(red, s, (SLOT, y_sign * d(h1), h1), (xo(h1), y_sign * d(h1), h1), 0.7)
                if not (abs(h0 - WHITE) < 0.1):
                    cross(red, s, (SLOT, y_sign * d(h0), h0), (xo(h1), y_sign * d(h1), h1), 0.4)
            sbeam(red, s, (xo(h1), -d(h1), h1), (xo(h1), d(h1), h1), 0.7)
            for where, sign in (("south", -1), ("north", 1)):
                if open_panel(s, "outer", h0, where):
                    continue
                cross(red, s, (xo(h0), sign * d(h0), h0), (xo(h1), sign * 3.0, h1), 0.4)
    # across the slot's north side: a tie between the towers under each level's bridge, and a deep one at the head
    for h in (*LEVELS, ROOF, 120.0):
        beam(red, (-SLOT, d(h), H(h - 0.5)), (SLOT, d(h), H(h - 0.5)), 0.8)
    # the dark screen behind the vehicle's head, from under the white room up to the head (NASA GPN-2000-000998)
    hb = LEVELS[5] + 1.0
    box(parts(G, "black/screen"), (-SLOT + 0.6, d(hb) - 0.25, H(hb)), (SLOT - 0.6, d(hb) - 0.1, H(WHITE - 0.6)))
    box(parts(G, "black/screen"), (-SLOT + 0.6, d(ROOF) - 0.5, H(ROOF + 0.6)), (SLOT - 0.6, d(ROOF) - 0.35, H(HEAD[0] - 0.2)))


def floor_with_hole(mb, s: int, x0: float, x1: float, y0: float, y1: float, h: float, hole=None, t: float = 0.3) -> None:
    """A floor on side s from x0 to x1 (unsigned) and y0 to y1 at height h, less a rectangular hole (xa, xb, ya, yb)."""
    if hole is None:
        sbox(mb, s, x0, x1, y0, y1, h - t, h)
        return
    xa, xb, ya, yb = hole
    if xa > x0:
        sbox(mb, s, x0, xa, y0, y1, h - t, h)
    if xb < x1:
        sbox(mb, s, xb, x1, y0, y1, h - t, h)
    if ya > y0:
        sbox(mb, s, max(xa, x0), min(xb, x1), y0, ya, h - t, h)
    if yb < y1:
        sbox(mb, s, max(xa, x0), min(xb, x1), yb, y1, h - t, h)


def well(k: int = 0) -> tuple[float, float]:
    """The west tower's stair well, the same at every level so that the flights stand one over another: its two sides
    across, measured from the middle. It is as far out as the tower's face at the top level lets it be."""
    x = xo(LEVELS[6]) - 2.1  # (clear of the outer face's members where they lean in over the top flight)
    return (x - 6.0, x)


def floors(parts: Parts) -> None:
    """Each level's fixed floor: each tower's from the slot's edge to its outer face, the bridge across the slot's
    north side, and their rails. The west tower's has the stair's well in it."""
    deck, rail = parts(G, "deck"), parts(G, "white/rails")
    for k, h in enumerate(LEVELS):
        dd = d(h) - 0.35
        x1 = xo(h) - 0.35
        room = k == 6
        for s in (-1, 1):
            hole = None
            if s < 0 and k > 0:
                wa, wb = well(k - 1)
                hole = (wa - 0.2, wb + 0.2, -5.4, 2.6)
            floor_with_hole(deck, s, SLOT + 0.25, x1, -dd, dd, h, hole)
            if room:
                continue
            # rails: along the south face, and from it back along the slot as far as the leaves reach
            ys = leaf_reach(h)
            handrail(rail, [(s * (SLOT + 0.45), -ys - 0.2, H(h)), (s * (SLOT + 0.45), -dd + 0.15, H(h)), (s * (x1 - 0.15), -dd + 0.15, H(h))], 3.5)
            # along the outer face, but for its middle bay on the east (the lift) and where the ground stair's bridge lands
            runs = [(-dd + 0.15, -3.0), (3.0, dd - 0.15)] if s > 0 else ([(-dd + 0.15, GANGWAY[0] - 0.3)] if k == 0 else [(-dd + 0.15, dd - 0.15)])
            for ya, yb in runs:
                handrail(rail, [(s * (x1 - 0.15), ya, H(h)), (s * (x1 - 0.15), yb, H(h))], 3.5)
        # the bridge between the towers, behind the vehicle
        box(deck, (-SLOT - 0.2, dd - 3.2, H(h - 0.3)), (SLOT + 0.2, dd, H(h)))
        if not room:
            handrail(rail, [(-xo(h) + 0.5, dd - 0.15, H(h)), (xo(h) - 0.5, dd - 0.15, H(h))], 3.5)


def leaf_reach(h: float) -> float:
    """How far fore and aft of the vehicle a level's leaves reach: to the bridge behind it."""
    return d(h) - 3.55


def notch(level: int, y: float) -> float:
    """How far from the vehicle's axis a leaf's inner edge stands at y: the split between the two, the hole round
    the tank (or the adapter, or the capsule), and on the tank's levels the two pods on the pitch axis."""
    r = (5.5, 5.5, 5.5, 5.5, 5.5, 4.6, 3.6)[level]
    x = 0.06
    if abs(y) < r:
        x = max(x, math.sqrt(r * r - y * y))
    if level < 5 and abs(y) < 2.3:
        x = max(x, 7.3)
    return x


def leaf(parts: Parts, level: int, s: int) -> None:
    """One leaf of a level: a deck hinged along the slot's edge, built down, its inner edge cut round the vehicle."""
    h = LEVELS[level]
    name = f"{NAME}_Platform{level + 1}_{'Left' if s < 0 else 'Right'}"
    parts.node(name, G, (s * SLOT, 0.0, H(h)))
    ys = leaf_reach(h)
    n_arc = 16 if fine() else 9
    r = (5.5, 5.5, 5.5, 5.5, 5.5, 4.6, 3.6)[level]
    marks = {-ys, ys} | {r * math.cos(math.pi * i / n_arc) for i in range(n_arc + 1)}
    if level < 5:
        marks |= {-2.3 - 1e-3, -2.3 + 1e-3, 2.3 - 1e-3, 2.3 + 1e-3}
    cuts = []
    for y in sorted(marks):
        if not cuts or y - cuts[-1] > 5e-4:
            cuts.append(y)
    edge = [(notch(level, y), y) for y in cuts if -ys <= y <= ys]
    slim = [p for i, p in enumerate(edge) if i in (0, len(edge) - 1) or p[0] > 0.06 or edge[i - 1][0] > 0.06 or edge[i + 1][0] > 0.06]
    outline = [(SLOT - 0.2, ys), (SLOT - 0.2, -ys)] + slim
    tris = ear_clip([(x, y) for x, y in outline][::-1])
    deck = parts(name, "deck")

    def v(x: float, y: float, z: float) -> tuple:
        return tuple(P(s * x, y, H(z)))

    pts = outline[::-1]
    top = [v(x, y, h) for x, y in pts]
    bot = [v(x, y, h - 0.3) for x, y in pts]
    up = [t if s > 0 else t[::-1] for t in tris]
    deck.add(top, up)
    deck.add(bot, [t[::-1] for t in up])
    for a, b in zip(pts, pts[1:] + pts[:1]):
        quad = [v(*a, h - 0.3), v(*b, h - 0.3), v(*b, h), v(*a, h)]
        deck.add(quad if s > 0 else quad[::-1], [(0, 1, 2, 3)])
    red = parts(name, "orange")
    for y in (-ys + 0.5, ys - 0.5):  # its two edge beams, and the hinge's tube along the slot
        sbox(red, s, max(0.4, notch(level, abs(y) - 0.25) + 0.15), SLOT - 0.3, y - 0.25, y + 0.25, h - 1.0, h - 0.31)
    red.tube(P(s * (SLOT - 0.05), -ys, H(h - 0.5)), P(s * (SLOT - 0.05), ys, H(h - 0.5)), 0.18 * FT, 8)


# ------------------------------------------------------------------- getting up it


def ground_stair(parts: Parts) -> None:
    """From the paving to the first level, on the west leg's outer side: four switchbacks.
    From the landing at the deck's height a gangway goes in through the leg to the stand's deck (NASA's photograph of 8 September
    1962 has a stair with landings up the west leg's foot; the gangway is ours: how the deck was reached from the
    structure is not in anything read)."""
    st, rail, deck, red = parts(G, "grey/stair"), parts(G, "white/stairrail"), parts(G, "deck"), parts(G, "orange")
    xa, xb = STAIR_X
    y0 = STAIR_Y
    ys, yn = y0 - 2.6, y0 + 2.6
    rises = GROUND_RISES
    for x in (xa + 0.1, xb - 0.1):
        for y in (ys - 2.5, yn + 4.7):
            sbeam(red, -1, (x, y, 0.8), (x, y, LEVELS[0] + 3.5), 0.5)
    for h0, h1 in zip(rises, rises[1:]):
        hm = (h0 + h1) / 2
        stairs(st, (-(xb - 1.5), yn, H(h0)), (-(xb - 1.5), ys, H(hm)), 2.8)
        stairs(st, (-(xa + 1.5), ys, H(hm)), (-(xa + 1.5), yn, H(h1)), 2.8)
        sbox(deck, -1, xa, xb, ys - 2.6, ys, hm - 0.25, hm)
        sbox(deck, -1, xa, xb, yn, yn + 4.8, h1 - 0.25, h1)
        handrail(rail, [(-xa, ys - 2.45, H(hm)), (-xb + 0.15, ys - 2.45, H(hm)), (-xb + 0.15, ys - 0.1, H(hm))], 3.3)
        handrail(rail, [(-xb + 0.15, yn + 0.1, H(h1)), (-xb + 0.15, yn + 4.65, H(h1)), (-xa - 0.1, yn + 4.65, H(h1))], 3.3)
        m = -(xa + xb) / 2
        beam(st, (m, yn, H(h0 + 3.2)), (m, ys, H(hm + 3.2)), 0.12)
        beam(st, (m, ys, H(hm + 3.2)), (m, yn, H(h1 + 3.2)), 0.12)
    # the gangway to the stand's deck, from the landing at its level, through the leg
    hg = rises[2]
    sbox(deck, -1, 30.25, xa, GANGWAY[0] + 0.3, GANGWAY[1] - 0.3, hg - 0.25, hg)
    for y in (GANGWAY[0] + 0.45, GANGWAY[1] - 0.45):
        handrail(rail, [(-30.4, y, H(hg)), (-xa, y, H(hg))], 3.3)
    # the bridge on to the first level
    sbox(deck, -1, xo(LEVELS[0]) - 0.33, xa, GANGWAY[0] + 0.3, GANGWAY[1] - 0.3, LEVELS[0] - 0.25, LEVELS[0])


def tower_stair(parts: Parts) -> None:
    """Inside the west tower from level to level: two half flights, the level's landing at the well's north end. The
    first is the one nearer the vehicle, so a flight comes up on the well's outer side: at the roof that is clear of
    the ladder to the head."""
    st, rail, deck = parts(G, "grey/stair"), parts(G, "white/stairrail"), parts(G, "deck")
    for k, (h0, h1) in enumerate(zip(STAIR_LEVELS, STAIR_LEVELS[1:])):
        wa, wb = well(k)
        hm = (h0 + h1) / 2
        stairs(st, (-(wa + 1.45), 2.6, H(h0)), (-(wa + 1.45), -2.6, H(hm)), 2.7)
        stairs(st, (-(wb - 1.45), -2.6, H(hm)), (-(wb - 1.45), 2.6, H(h1)), 2.7)
        sbox(deck, -1, wa, wb, -5.2, -2.6, hm - 0.25, hm)
        handrail(rail, [(-wa, -5.05, H(hm)), (-wb, -5.05, H(hm))], 3.3)
        m = -(wa + wb) / 2
        beam(st, (m, 2.6, H(h0 + 3.2)), (m, -2.6, H(hm + 3.2)), 0.12)
        beam(st, (m, -2.6, H(hm + 3.2)), (m, 2.6, H(h1 + 3.2)), 0.12)
        # a rail round the well at the upper floor, open at its north end where the flight comes up
        handrail(rail, [(-wa + 0.35, 2.4, H(h1)), (-wa + 0.35, -5.6, H(h1)), (-wb - 0.3, -5.6, H(h1)), (-wb - 0.3, 2.4, H(h1))], 3.2)


def lift(parts: Parts) -> None:
    """The passenger lift: an open cage up the east leg's outer face, boarded from the paving. Its own node, built at
    the ground; its stops are the seven levels."""
    car = f"{NAME}_Lift"
    xi, h0 = XO0 + 2.8, 0.6  # at the ground it stands off the leg, to be walked into from between the two
    stops = [("Ground", xi, h0)] + [(f"Level {k + 1}", xo(h) + 0.45, h) for k, h in enumerate(LEVELS)]
    parts.node(
        car,
        G,
        (xi + CAR / 2, 0.0, H(h0)),
        lift=1,
        stops=[[round((x - xi) * FT, 3), round((h - h0) * FT, 3)] for _, x, h in stops],
        stop_names=[n for n, _, _ in stops],
    )
    frame, floor, panel = parts(car, "grey"), parts(car, "deck"), parts(car, "mesh")
    box(floor, (xi, -CAR / 2, H(h0 - 0.18)), (xi + CAR, CAR / 2, H(h0)))
    box(frame, (xi - 0.05, -CAR / 2 - 0.05, H(h0 + 7.4)), (xi + CAR + 0.05, CAR / 2 + 0.05, H(h0 + 7.52)))
    for x in (xi + 0.07, xi + CAR - 0.07):
        for y in (-CAR / 2 + 0.07, CAR / 2 - 0.07):
            beam(frame, (x, y, H(h0)), (x, y, H(h0 + 7.4)), 0.14)
    for a, b in (
        ((xi + 0.07, -CAR / 2), (xi + CAR - 0.07, -CAR / 2)),
        ((xi + 0.07, CAR / 2), (xi + CAR - 0.07, CAR / 2)),
        ((xi + CAR - 0.07, -CAR / 2), (xi + CAR - 0.07, CAR / 2)),
    ):
        quad = [P(*a, H(h0 + 0.1)), P(*b, H(h0 + 0.1)), P(*b, H(h0 + 7.3)), P(*a, H(h0 + 7.3))]
        panel.add([tuple(q) for q in quad], [(0, 1, 2, 3)])
        beam(frame, (*a, H(h0 + 3.5)), (*b, H(h0 + 3.5)), 0.1)
    deck, grey = parts(G, "deck"), parts(G, "grey", True)
    # a step up to it from the paving, riding with the structure; its guides up the leg; a sill at each level
    box(deck, (XO0 + 0.3, -2.3, H(0.05)), (xi - 0.05, 2.3, H(0.3)))
    for y in (-2.2, 2.2):
        beam(grey, (XO0 + 0.25, y, H(6.0)), (XO0 + 0.25, y, H(TUNNEL)), 0.3)
        beam(grey, (XO0 + 0.25, y, H(TUNNEL)), (xo(TAPER) + 0.25, y, H(TAPER)), 0.3)
    for _, x, h in stops[1:]:
        box(deck, (x - 0.78, -2.6, H(h - 0.2)), (x - 0.05, 2.6, H(h)))


# ------------------------------------------------------------------- the white room


def white_room(parts: Parts) -> None:
    """The room round the capsule on the top level: bright corrugated siding on the towers' faces, a partition in each
    tower with a door to the stair and to the lift, the two sliding doors across the slot's south side, the roof's two
    leaves over the slot. The floor's two leaves are the top level's (leaf())."""
    h0, h1 = WHITE, ROOF
    dd = d(h0) - 0.35
    skin, inner = parts(G, "aluminium/whiteroom"), parts(G, "white/whiteroom")
    for s in (-1, 1):
        x1 = xo(h0) - 0.35
        sbox(skin, s, SLOT + 1.2, x1, -dd - 0.3, -dd - 0.05, h0, h1)  # the south face, either side of the doors
        sbox(skin, s, SLOT + 0.2, x1, dd + 0.05, dd + 0.3, h0, h1)  # the north face
        # the partition in each tower, round its door (3 ft by 6 ft 9 in, hinged on its south edge, opening out of the
        # room): toward the north end, where the floor outside it is whole
        for ya, yb in ((-dd - 0.05, 3.0), (6.0, dd + 0.05)):
            sbox(inner, s, ROOM_X, ROOM_X + 0.25, ya, yb, h0, h1)
        sbox(inner, s, ROOM_X, ROOM_X + 0.25, 3.0, 6.0, h0 + 6.8, h1)
        side = "Left" if s < 0 else "Right"
        door(parts, f"{NAME}_WhiteRoomDoor_{side}", G, (s * (ROOM_X + 0.125), 3.02, H(h0)), (0, 1), 2.96, 6.75, swing=-s * 100.0, mat="white")
        if s > 0:  # the east tower's outer face, round the lift's landing, and its part of the roof
            sbox(skin, s, x1 - 0.25, x1, -dd - 0.05, -3.0, h0, h1)
            sbox(skin, s, x1 - 0.25, x1, 3.0, dd + 0.05, h0, h1)
            sbox(skin, s, x1 - 0.25, x1, -3.0, 3.0, h0 + 7.6, h1)
            sbox(skin, s, SLOT + 0.2, xo(h1) - 0.2, -dd - 0.3, dd + 0.3, h1, h1 + 0.3)
        else:  # the west tower's: whole, and its roof with the stair's well in it, railed: the way on up to the head
            sbox(skin, s, x1 - 0.25, x1, -dd - 0.05, dd + 0.05, h0, h1)
            wa, wb = well(6)
            xr = xo(h1) - 0.2
            floor_with_hole(skin, s, SLOT + 0.2, xr, -dd - 0.3, dd + 0.3, h1 + 0.3, (wa - 0.2, wb + 0.2, -5.4, 2.6))
            handrail(
                parts(G, "white/rails"),
                [(-SLOT - 0.4, -dd, H(h1 + 0.3)), (-xr + 0.2, -dd, H(h1 + 0.3)), (-xr + 0.2, dd, H(h1 + 0.3)), (-SLOT - 0.4, dd, H(h1 + 0.3))],
                3.5,
            )
    # across the slot's north side, behind the capsule: the room's back wall
    box(inner, (-SLOT - 0.2, dd + 0.05, H(h0)), (SLOT + 0.2, dd + 0.3, H(h1)))
    # the sliding doors: two panels hung on a track over the south face, closed across the slot
    track_y = -dd - 0.55
    for s in (-1, 1):
        name = f"{NAME}_SlidingDoor_{'Left' if s < 0 else 'Right'}"
        parts.node(name, G, (s * DOOR_W / 2, track_y, H(h0)))
        panel = parts(name, "aluminium")
        sbox(panel, s, 0.03, DOOR_W, track_y - 0.12, track_y + 0.12, h0 - 0.6, h0 - 0.6 + DOOR_H)
        if fine():
            for k in range(1, 5):  # its ribs, standing proud of its face
                x = DOOR_W * k / 5
                sbox(parts(name, "white/ribs"), s, x - 0.1, x + 0.1, track_y - 0.2, track_y - 0.12, h0 - 0.5, h0 - 0.7 + DOOR_H)
    box(parts(G, "grey/doortrack"), (-2 * DOOR_W - 0.5, track_y - 0.3, H(h0 - 0.6 + DOOR_H)), (2 * DOOR_W + 0.5, track_y + 0.3, H(h0 - 0.2 + DOOR_H)))
    # the roof's two leaves over the slot, hinged on the towers, cut round the escape tower
    for s in (-1, 1):
        name = f"{NAME}_Roof_{'Left' if s < 0 else 'Right'}"
        parts.node(name, G, (s * SLOT, 0.0, H(h1)))
        mb = parts(name, "aluminium")
        r = 2.6
        sbox(mb, s, 0.05, SLOT + 0.15, r, dd + 0.25, h1 + 0.02, h1 + 0.28)
        sbox(mb, s, 0.05, SLOT + 0.15, -dd - 0.25, -r, h1 + 0.02, h1 + 0.28)
        sbox(mb, s, r, SLOT + 0.15, -r, r, h1 + 0.02, h1 + 0.28)
    # what was in it (estimated: Figure 4-7 shows a bare room of framing round the capsule): a bench and a cabinet in the
    # east half, lamps overhead
    fit = parts(G, "grey/fittings")
    sbox(fit, 1, SLOT + 3.0, SLOT + 8.5, dd - 4.9, dd - 3.5, h0, h0 + 3.0)
    sbox(fit, -1, SLOT + 5.0, SLOT + 7.2, -dd + 0.3, -dd + 2.3, h0, h0 + 5.6)
    for s in (-1, 1):
        at = (s * (SLOT + 4.5), 0.0, H(h1 - 0.14))
        box(parts(G, "lamp-room"), (at[0] - 1.5, -0.25, H(h1 - 0.14)), (at[0] + 1.5, 0.25, H(h1) - 0.004))
        parts.node(f"Light_WhiteRoom{'Left' if s < 0 else 'Right'}", G, (at[0], 0.0, H(h1 - 2.0)), intensity=0.8 * interiors.FITTING, reach=7.0)


# ------------------------------------------------------------------- the head


def head(parts: Parts) -> None:
    """The box girder that joins the two towers over the escape tower, the hoist's frame on it, the top deck and its
    rail, and the crane's girder reaching south over the vehicle (NASA GPN-2000-000609: a red box some 40 ft by 30,
    a pyramid of framing over it, a boom overhanging south)."""
    red, deck, white, dark = parts(G, "orange"), parts(G, "deck"), parts(G, "white/rails"), parts(G, "chassis", True)
    y0, y1 = -17.0, 13.0
    box(parts(G, "orange/head"), (-20.0, y0, H(HEAD[0])), (20.0, y1, H(HEAD[1])))
    for s in (-1, 1):  # the towers' heads into it
        for y_sign in (-1, 1):
            sbeam(red, s, (xo(TAPER), y_sign * d(TAPER), TAPER - 0.8), (xo(TAPER), y_sign * d(TAPER), HEAD[0] + 0.5), 0.9)
            sbeam(red, s, (SLOT, y_sign * d(TAPER), TAPER - 0.8), (SLOT, y_sign * d(TAPER), HEAD[0] + 0.5), 0.9)
            sbeam(red, s, (xo(TAPER), y_sign * d(TAPER), TAPER), (19.0, y_sign * (11.5 if y_sign > 0 else 15.5), HEAD[0] + 0.3), 0.5)
    if fine():  # the girder's stiffeners
        for x in (-15.0, -10.0, -5.0, 0.0, 5.0, 10.0, 15.0):
            for y in (y0 - 0.12, y1 + 0.0):
                box(red, (x - 0.15, y, H(HEAD[0] + 0.3)), (x + 0.15, y + 0.12, H(HEAD[1] - 0.3)))
    # the crown: a lattice on the head up to the top deck
    hx, hy = 11.0, 9.0
    levels = [HEAD[1], (HEAD[1] + TOP_DECK) / 2, TOP_DECK - 0.4]

    def corner(i: int, h: float):
        return ((hx if i in (0, 3) else -hx), (hy if i < 2 else -hy), H(h))

    sitelib.lattice(red, corner, levels, 0.8, 0.45)
    box(deck, (-hx - 1.0, -hy - 1.0, H(TOP_DECK - 0.4)), (hx + 1.0, hy + 1.0, H(TOP_DECK)))
    # its rail, open on the west side where the ladder comes up
    handrail(
        white,
        [
            (-hx - 0.8, 1.6, H(TOP_DECK)),
            (-hx - 0.8, hy + 0.8, H(TOP_DECK)),
            (hx + 0.8, hy + 0.8, H(TOP_DECK)),
            (hx + 0.8, -hy - 0.8, H(TOP_DECK)),
            (-hx - 0.8, -hy - 0.8, H(TOP_DECK)),
            (-hx - 0.8, -1.6, H(TOP_DECK)),
        ],
        3.5,
    )
    # and the head's own top, railed the same way, open where its ladder comes up
    handrail(
        white,
        [
            (-19.7, 5.4, H(HEAD[1])),
            (-19.7, y1 - 0.3, H(HEAD[1])),
            (19.7, y1 - 0.3, H(HEAD[1])),
            (19.7, y0 + 0.3, H(HEAD[1])),
            (-19.7, y0 + 0.3, H(HEAD[1])),
            (-19.7, 2.0, H(HEAD[1])),
        ],
        3.5,
    )
    # the hoist's frame over the top deck, and the crane's girder under it, out over the vehicle
    apex = TOP_DECK + 9.5
    for sx in (-1, 1):
        for sy in (-1, 1):
            beam(red, (sx * 6.0, sy * 5.0, H(TOP_DECK)), (0.0, sy * 1.2, H(apex)), 0.5)
    beam(red, (0.0, -1.2, H(apex)), (0.0, 1.2, H(apex)), 0.6)
    hb = (HEAD[1] + TOP_DECK) / 2 + 1.0
    jy = [hy + 2.0 - (hy + 2.0 + 26.0) * i / 10 for i in range(11)]

    def jib(i: int, y: float):
        return (1.6 * (1 if i in (0, 3) else -1), y, H(hb + (1.6 if i < 2 else -1.6)))

    sitelib.truss(red, jib, jy, 0.45, 0.26)
    for yt in (-22.0, -3.0):  # the trolley and its hook, and a spare
        box(dark, (-1.2, yt - 1.0, H(hb - 2.5)), (1.2, yt + 1.0, H(hb - 1.75)))
    for dx in (-0.4, 0.4):
        beam(dark, (dx, -3.0, H(hb - 2.5)), (dx, -3.0, H(hb - 6.0)), 0.06)
    box(dark, (-0.6, -3.5, H(hb - 7.2)), (0.6, -2.5, H(hb - 6.0)))
    for bx in (-hx, hx):  # red obstruction lights at the top deck's corners (estimated: the usual practice)
        for by in (-hy, hy):
            parts(G, "lamp-red", True).lathe(
                ftp([(0.0, 0.0), (0.3, 0.0), (0.3, 0.7), (0.0, 0.9)]), 10, matrix=Matrix.Translation(P(bx, by, H(TOP_DECK + 3.55)))
            )
    # the way on up: a ladder from the white room's roof, in the west tower, up the head's west face to its top, and
    # one from there up the crown to the top deck (estimated: the photographs do not show how the head was reached).
    # It stands a foot and a half off the girder's face on a column from the roof to a landing at the girder's top:
    # the column keeps a man off the ladder's back, and the landing is what he steps off on to
    parts.ladder(G, "head", (-21.5, 3.7, H(ROOF + 0.3)), (-21.5, 3.7, H(HEAD[1])), face=(1, 0, 0), mat="white")
    box(red, (-21.05, 2.7, H(ROOF + 0.2)), (-19.9, 4.7, H(HEAD[1] - 0.1)))
    box(deck, (-21.25, 2.2, H(HEAD[1] - 0.2)), (-20.0, 5.2, H(HEAD[1])))
    for h in (ROOF + 4.0, ROOF + 9.0, ROOF + 14.0, 132.0):
        beam(red, (-21.5, 3.7, H(h)), (-20.95, 3.7, H(h)), 0.12)
    parts.ladder(G, "crown", (-hx - 1.6, 0.0, H(HEAD[1])), (-hx - 1.6, 0.0, H(TOP_DECK)), face=(1, 0, 0), mat="white")


def work_lights(parts: Parts) -> None:
    """Deep dome reflectors hung under the levels, shining on the vehicle: the photographs of January 1962 have rows
    of them down the slot's sides (NASA KSC-LOD-62-475). Documented that they were there; their places are estimated."""
    dome = ftp([(0.12, 0.0), (0.2, -0.5), (0.75, -1.2)])
    lens = ftp([(0.72, -1.17), (0.0, -1.17)])
    for k in (1, 3, 5):
        h = LEVELS[k]
        for s in (-1, 1):
            for y in (-0.55 * d(h), 0.55 * d(h)):
                c = Matrix.Translation(P(s * (SLOT + 1.6), y, H(h - 0.5)))
                parts(G, "grey/shades", True).lathe(dome, 12, matrix=c)
                parts(G, "lamp", True).lathe(lens, 12, matrix=c)


def build(parts: Parts) -> None:
    parts.node(NAME, None, (0.0, 0.0, 0.0))
    parts.node(G, NAME, (0.0, 0.0, 0.0))
    base(parts)
    legs(parts)
    trusses(parts)
    towers(parts)
    floors(parts)
    for level in range(7):
        for s in (-1, 1):
            leaf(parts, level, s)
    ground_stair(parts)
    tower_stair(parts)
    lift(parts)
    white_room(parts)
    head(parts)
    work_lights(parts)
