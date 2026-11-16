"""What stood on the deck beside the erector: the complete vehicle umbilical tower with its seven booms and the
lines they carried to the vehicle, the second-stage test position (its stand, its umbilical tower, its erector laid
down), the spacecraft hoisting crane, and the camera tower west of the deck.

Documented (Martin's press handbook, p. 7-13): the umbilical tower is "triangular", 102 ft high, with 14 ft sides;
its booms are 14 to 18 ft long, at the 25, 43, 54 and 71 ft levels for the first stage, the 80 and 90 ft levels for
the second and one at 99 ft for the spacecraft; they carried 28 umbilicals to the vehicle and 3 to the spacecraft.
Where the tower stood and how it was braced, and everything of the other three, is read off photographs and is
estimated: ../lc-19.md.

The lines are the moving pieces: `UmbilicalTower_Line_<n>`, each a node with its origin on its boom's tip, built
plugged into the vehicle. At liftoff they were released and fell to hang from the booms, which stayed where they
were (S65-29636, the tower in the smoke of Gemini IV's liftoff: the booms level, the lines hanging).
"""

from __future__ import annotations

import math

from mathutils import Vector

from srlib import FT

from .site import (
    BOOMS,
    CRANE,
    CRANE_TOP,
    DECK_Y,
    FOOTING,
    GROUND,
    INSTRUMENT_TOWER,
    STAGE2_STAND,
    STAGE2_TOWER,
    STAGE2_TOWER_TOP,
    UT,
    UT_SIDE,
    UT_TOP,
    P,
    Parts,
    beam,
    box,
    ear_clip,
    fine,
    handrail,
    lamp_head,
    lattice,
    obox,
    ring_rail,
)
from .stand import STAGE2_OPENING, a_frames

TO_VEHICLE = math.atan2(-UT[1], -UT[0])  # the way from the tower's middle to the vehicle's axis
REACH = math.hypot(*UT)  # and how far
SKIN = {25.0: 5.0, 43.0: 5.0, 54.0: 5.0, 71.0: 5.0, 80.0: 5.0, 90.0: 5.0, 99.0: 4.4}  # the vehicle's radius at each boom's level
BOOM_LENGTH = {99.0: 18.0}  # the spacecraft's boom is the long one; the rest 14 ft (documented as a range: which is which is estimated)
SECOND_ERECTOR = (4.0, 66.0, 12.0, 13.0)  # the second-stage erector as it lies: its hinge's x, its length, its width, its depth
SECOND_ERECTOR_Y = 30.5  # its west side, clear of the vehicle erector's elevator as that lies beside it


def ut_point(along: float, across: float, z: float) -> tuple[float, float, float]:
    """A point by the umbilical tower: `along` toward the vehicle from its middle, `across` to the left of that."""
    c, s = math.cos(TO_VEHICLE), math.sin(TO_VEHICLE)
    return (UT[0] + c * along - s * across, UT[1] + s * along + c * across, z)


def umbilical_tower(parts: Parts) -> None:
    g = "UmbilicalTower"
    parts.node(g, None, (UT[0], UT[1], 0.0), label="Umbilical tower")
    red, floor, rails = parts(g, "red", True), parts(g, "reddeck"), parts(g, "red/rails", True)
    r = UT_SIDE / math.sqrt(3)  # the legs stand this far from the middle: one behind, two toward the vehicle
    inr = r / 2  # and the front face this far
    legs = [ut_point(r * math.cos(a), r * math.sin(a), 0.0)[:2] for a in (math.radians(60), math.radians(180), math.radians(300))]
    for x, y in legs:
        box(red, (x - 0.55, y - 0.55, FOOTING), (x + 0.55, y + 0.55, UT_TOP))
    panels = [GROUND + 1.0, -14.0, 0.0, *[z for z in (12.5, *BOOMS, UT_TOP) if z > 0]]
    panels = sorted({*panels, 34.0, 62.5})
    for za, zb in zip(panels, panels[1:]):
        for k in range(3):
            (ax, ay), (bx, by) = legs[k], legs[(k + 1) % 3]
            beam(red, (ax, ay, zb - 0.5 - 0.14 * k), (bx, by, zb - 0.5 - 0.14 * k), 0.5)
            if (k != 2 or zb <= 0) and zb - za > 5.0:  # the face toward the vehicle is left open over the deck: the booms and their lines are there
                a, b = ((ax, ay), (bx, by)) if panels.index(za) % 2 else ((bx, by), (ax, ay))
                beam(red, (*a, za - 0.3 - 0.2 * k), (*b, zb - 0.9 - 0.2 * k), 0.35)
    # a floor at the deck and at each boom, a ladder between them up alternate back faces, the head's platform
    stops = [0.0, *BOOMS, UT_TOP]
    margin = 0.9

    def plate_at(z: float, notch: int | None) -> None:
        """The triangular floor at z, with the gap the ladder below comes up through on back face `notch`."""
        tri = [
            ut_point((r - 2 * margin) * math.cos(a), (r - 2 * margin) * math.sin(a), z)[:2]
            for a in (math.radians(60), math.radians(180), math.radians(300))
        ]
        outline = list(tri)
        if notch is not None:
            a, b = Vector(tri[notch]), Vector(tri[(notch + 1) % 3])
            u = (b - a).normalized()
            n = Vector((-u.y, u.x))  # into the tower (the triangle runs anticlockwise)
            mid = (a + b) / 2
            hole = [mid - u * 1.3, mid - u * 1.3 + n * 2.3, mid + u * 1.3 + n * 2.3, mid + u * 1.3]
            outline = [*outline[: notch + 1], *[tuple(v) for v in hole], *outline[notch + 1 :]]
        tris = ear_clip(outline)
        top = [tuple(P(x, y, z)) for x, y in outline]
        bot = [tuple(P(x, y, z - 0.2)) for x, y in outline]
        floor.add(top, tris)
        floor.add(bot, [t[::-1] for t in tris])
        k = len(outline)
        for i in range(k):
            j = (i + 1) % k
            floor.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])

    for k, (za, zb) in enumerate(zip(stops, stops[1:])):
        face = k % 2  # the two back faces in turn
        tri = [
            ut_point((r - 2 * margin) * math.cos(a), (r - 2 * margin) * math.sin(a), 0.0)[:2]
            for a in (math.radians(60), math.radians(180), math.radians(300))
        ]
        a, b = Vector(tri[face]), Vector(tri[(face + 1) % 3])
        u = (b - a).normalized()
        n = Vector((-u.y, u.x))
        at = (a + b) / 2 + n * 0.75
        parts.ladder(g, f"run{k + 1}", (at.x, at.y, za), (at.x, at.y, zb), face=(-n.x, -n.y, 0.0), mat="red")
        plate_at(zb, face)
    # the foot's floor, where the tower stands off the deck's west edge
    west = DECK_Y[0]
    box(floor, (UT[0] - 9.0, UT[1] - 9.5, -0.25), (UT[0] + 9.0, west, 0.0))
    handrail(
        rails, [(UT[0] + 8.9, west - 0.1, 0.0), (UT[0] + 8.9, UT[1] - 9.4, 0.0), (UT[0] - 8.9, UT[1] - 9.4, 0.0), (UT[0] - 8.9, west - 0.1, 0.0)]
    )
    for x in (UT[0] - 8.5, UT[0] + 8.5):  # and what carries it: a bracket to the stand's steel
        beam(red, (x, UT[1] - 9.0, -0.5), (x, west + 1.0, -6.0), 0.4)
    # the head: a rail round it, the mast with its lamp, the hoist beam out over the spacecraft's nose (S65-43447)
    head = [
        ut_point((r - margin) * math.cos(a), (r - margin) * math.sin(a), UT_TOP) for a in (math.radians(60), math.radians(180), math.radians(300))
    ]
    ring_rail(rails, head)
    mast = ut_point(-1.5, 0.0, UT_TOP)
    parts(g, "galv", True).tube(P(*mast), P(mast[0], mast[1], UT_TOP + 22.0), 0.12 * FT, 6)
    box(parts(g, "lamp-red"), (mast[0] - 0.25, mast[1] - 0.25, UT_TOP + 7.0), (mast[0] + 0.25, mast[1] + 0.25, UT_TOP + 7.6))
    # the tall pipe up its back, turned over at the head (S65-20641: an aluminium stack, taken for a vent)
    pipe = parts(g, "pipe", True)
    back = ut_point(-r - 1.3, 0.0, 0.0)
    pipe.tube(P(back[0], back[1], GROUND), P(back[0], back[1], UT_TOP - 4.0), 0.75 * FT, 12)
    over = ut_point(-r + 1.2, 0.0, UT_TOP - 1.6)
    pipe.tube(P(back[0], back[1], UT_TOP - 4.2), P(*over), 0.75 * FT, 12)
    # the booms, and at each tip the lines to the vehicle
    cable = "cable"
    for n, z in enumerate(BOOMS, 1):
        length = BOOM_LENGTH.get(z, 14.0)
        for across in (-1.4, 1.4):  # two chords from the front face, braced, with a grating between
            beam(red, ut_point(inr - 0.3, across * 2.2, z + 1.4), ut_point(inr + length, across, z + 1.4), 0.5)
            beam(red, ut_point(inr - 0.3, across * 2.2, z - 3.0), ut_point(inr + length * 0.7, across, z + 1.1), 0.3)
        beam(red, ut_point(inr + length, -1.4, z + 1.4), ut_point(inr + length, 1.4, z + 1.4), 0.5)
        mid = ut_point(inr + length / 2, 0.0, z + 1.75)
        obox(floor, mid, (math.cos(TO_VEHICLE), math.sin(TO_VEHICLE), 0.0), (0, 0, 1), (length - 0.6, 2.1, 0.15))
        tip = ut_point(inr + length, 0.0, z + 1.4)
        line = f"UmbilicalTower_Line_{n}"
        parts.node(line, g, tip, line=1)
        hoses = parts(line, cable, True)
        gap = REACH - SKIN[z] - (inr + length)  # from the boom's tip to the vehicle's skin
        for k, across in enumerate((-0.9, 0.0, 0.9) if fine() else (0.0,)):
            sag = 2.2 + 0.5 * k
            pts = [ut_point(inr + length + gap * t, across, z + 1.2 - sag * 4 * t * (1 - t) - 2.0 * t) for t in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
            for a, b in zip(pts, pts[1:]):
                hoses.tube(P(*a), P(*b), (0.28 if across == 0 else 0.2) * FT, 8)
            plug = parts(line, "galv", True)
            plug.tube(P(*pts[-1]), P(*ut_point(inr + length + gap + 0.25, across, z - 0.8)), 0.3 * FT, 8)
        # the lines' run back along the boom and down the tower
        for across in (-0.5, 0.5):
            parts(g, cable, True).tube(P(*ut_point(inr - 0.2, across, z + 1.95)), P(*ut_point(inr + length - 0.2, across, z + 1.95)), 0.22 * FT, 6)
    for across in (-0.9, 0.9):
        parts(g, cable, True).tube(P(*ut_point(inr - 0.45, across, 1.0)), P(*ut_point(inr - 0.45, across, BOOMS[-1] + 1.9)), 0.3 * FT, 6)
    # floodlights on the tower's faces (documented by photograph that it carried lamps at every level; their places estimated)
    parts.mark(g, "lamp", lens_out=1)
    for z in BOOMS[1::2]:
        q = ut_point(inr + 0.5, 3.5, z + 6.0)
        lamp_head(red, parts(g, "lamp"), q, (math.cos(TO_VEHICLE), math.sin(TO_VEHICLE), -0.5), 0.6)


def second_stage(parts: Parts) -> None:
    """The second-stage test position: "a smaller structure used only for checkout or static firings" (SP-4203), where a
    second stage could be stood and fired alone. Its stand over its own flame duct, its umbilical tower, and its erector,
    which lay lowered on the deck beside the vehicle's on every Gemini launch day (Martin's diagram of the complex)."""
    g = "Stage2Stand"
    parts.node(g, None, (STAGE2_STAND[0], STAGE2_STAND[1], 0.0), label="Second-stage test stand")
    grey = parts(g, "grey", True)
    a_frames(grey, parts(g, "black", True), STAGE2_STAND, 4.6, 12.0, (STAGE2_OPENING[0] + 1.5, STAGE2_OPENING[1] + 1.4))
    grey.lathe(
        [(5.3 * FT, 11.4 * FT), (6.6 * FT, 11.4 * FT), (6.6 * FT, 12.6 * FT), (5.3 * FT, 12.6 * FT), (5.3 * FT, 11.4 * FT)],
        24,
        matrix=_at(STAGE2_STAND),
    )

    t = "Stage2UmbilicalTower"
    tx, ty = STAGE2_TOWER
    parts.node(t, None, (tx, ty, 0.0), label="Second-stage umbilical tower")
    red, floor, rails = parts(t, "red", True), parts(t, "reddeck"), parts(t, "red/rails", True)
    h = 3.5
    corner = lambda i, z: (tx + (h if i in (1, 2) else -h), ty + (h if i in (2, 3) else -h), z)  # noqa: E731
    levels = [0.0, 10.5, 21.0, 31.5, STAGE2_TOWER_TOP]
    lattice(red, corner, levels, 0.55, 0.35, faces=(0, 1, 3))  # open toward the stand, east
    for k, (za, zb) in enumerate(zip(levels, levels[1:])):
        hole = (tx - h + 0.5, ty - 1.2, tx - h + 2.8, ty + 1.2) if k % 2 == 0 else (tx + h - 2.8, ty - 1.2, tx + h - 0.5, ty + 1.2)
        for xa, ya, xb, yb in (
            (tx - h + 0.4, ty - h + 0.4, tx + h - 0.4, hole[1]),
            (tx - h + 0.4, hole[3], tx + h - 0.4, ty + h - 0.4),
            (tx - h + 0.4, hole[1], hole[0], hole[3]),
            (hole[2], hole[1], tx + h - 0.4, hole[3]),
        ):
            if xb - xa > 0.05 and yb - ya > 0.05:
                box(floor, (xa, ya, zb - 0.2), (xb, yb, zb))
        lx = (hole[0] + hole[2]) / 2
        face = (-1.0, 0.0, 0.0) if k % 2 == 0 else (1.0, 0.0, 0.0)
        parts.ladder(t, f"run{k + 1}", (lx - face[0] * 0.75, ty, za), (lx - face[0] * 0.75, ty, zb), face=face, mat="red")
    ring_rail(rails, [corner(i, STAGE2_TOWER_TOP) for i in (0, 1, 2, 3)])
    for z in (21.0, 31.5):  # its two booms, toward the stand (their heights estimated: S65-43447)
        for dy in (-1.2, 1.2):
            beam(red, (tx + 1.0 + dy, ty + h, z + 1.2), (STAGE2_STAND[0] + 2.0 + dy, STAGE2_STAND[1] - 7.5, z + 1.2), 0.45)
        parts(t, "cable", True).tube(
            P(STAGE2_STAND[0] + 2.0, STAGE2_STAND[1] - 7.5, z + 1.0), P(STAGE2_STAND[0] + 2.0, STAGE2_STAND[1] - 7.5, z - 7.0), 0.3 * FT, 8
        )

    e = "Stage2Erector"
    hx, length, wide, deep = SECOND_ERECTOR
    y0 = SECOND_ERECTOR_Y
    parts.node(e, None, (hx, y0 + wide / 2, 1.0), label="Second-stage erector")
    red = parts(e, "red", True)
    chord = lambda i, s: (hx + s, y0 + (wide if i in (1, 2) else 0.0), 1.0 + (deep if i in (2, 3) else 0.0))  # noqa: E731
    stations = [length * k / 6 for k in range(7)]
    for s0, s1 in zip(stations, stations[1:]):
        for i in range(4):
            beam(red, chord(i, s0), chord(i, s1), 0.8)
    for n, s in enumerate(stations):
        for i in (0, 1, 3):  # its open side is up as it lies
            beam(red, chord(i, s), chord((i + 1) % 4, s), 0.5)
        if n < len(stations) - 1:
            for i, j in ((0, 1), (1, 2), (3, 0)):
                a, b = (i, j) if n % 2 else (j, i)
                beam(red, chord(a, s), chord(b, stations[n + 1]), 0.4)
    for s in stations[1:-1:2]:  # its work platforms, on edge as it lies
        box(parts(e, "reddeck"), (hx + s - 0.1, y0 + 0.6, 1.6), (hx + s + 0.1, y0 + wide - 0.6, 1.0 + deep * 0.6))
    for y in (y0 + 1.0, y0 + wide - 1.0):  # the cradles it rests in
        for s in (length * 0.45, length * 0.92):
            box(parts(e, "grey", True), (hx + s - 0.8, y - 0.8, 0.0), (hx + s + 0.8, y + 0.8, 0.62))
        box(parts(e, "black", True), (hx - 0.5, y - 0.5, 0.0), (hx + 0.5, y + 0.5, 1.45))  # its hinge lugs


def _at(xy: tuple[float, float]):
    from mathutils import Matrix  # noqa: PLC0415

    return Matrix.Translation(P(xy[0], xy[1], 0.0))


def crane(parts: Parts) -> None:
    """The spacecraft hoisting crane: the spacecraft came to the foot of the stand's north-west side on its dolly and
    was lifted "28 feet from the ground to the deck" by a 5-ton crane on the north side of the stand (the handbook)."""
    g = "HoistingCrane"
    cx, cy = CRANE
    parts.node(g, None, (cx, cy, 0.0), label="Spacecraft hoisting crane")
    red = parts(g, "red", True)
    h, ring = 3.0, CRANE_TOP - 9.0
    corner = lambda i, z: (cx + (h if i in (1, 2) else -h) * (1 - 0.35 * z / ring), cy + (h if i in (2, 3) else -h) * (1 - 0.35 * z / ring), z)  # noqa: E731
    lattice(red, corner, [0.0, 8.0, 16.0, 24.0, ring], 0.5, 0.3)
    box(red, (cx - 2.6, cy - 2.6, ring), (cx + 2.6, cy + 2.6, ring + 1.2))  # the slewing ring's deck
    ring_rail(
        parts(g, "red/rails", True),
        [(cx - 2.5, cy - 2.5, ring + 1.2), (cx + 2.5, cy - 2.5, ring + 1.2), (cx + 2.5, cy + 2.5, ring + 1.2), (cx - 2.5, cy + 2.5, ring + 1.2)],
    )
    box(red, (cx - 0.5, cy - 0.5, ring + 1.2), (cx + 0.5, cy + 0.5, CRANE_TOP))
    # the jib, out north over the flume's apron, and its counter-jib (S65-49568: 21 ft and 12 ft)
    jz = ring + 5.5
    for dy in (-0.9, 0.9):
        beam(red, (cx + 12.0, cy + dy, jz), (cx - 21.0, cy + dy, jz), 0.45)
        beam(red, (cx, cy + dy * 0.4, CRANE_TOP - 0.2), (cx - 20.0, cy + dy, jz + 0.2), 0.25)
        beam(red, (cx, cy + dy * 0.4, CRANE_TOP - 0.2), (cx + 11.5, cy + dy, jz + 0.2), 0.25)
    for x in (cx - 21.0, cx - 14.0, cx - 7.0, cx + 6.0, cx + 12.0):
        beam(red, (x, cy - 0.9, jz), (x, cy + 0.9, jz), 0.3)
    box(parts(g, "grey", True), (cx + 8.5, cy - 1.3, jz - 2.4), (cx + 12.0, cy + 1.3, jz - 0.25))  # the counterweight
    parts(g, "cable", True).tube(P(cx - 19.0, cy, jz - 0.3), P(cx - 19.0, cy, jz - 6.0), 0.05 * FT, 6)
    box(parts(g, "black", True), (cx - 19.3, cy - 0.3, jz - 7.2), (cx - 18.7, cy + 0.3, jz - 6.0))  # the hook block


def camera_tower(parts: Parts) -> None:
    """A lattice tower with a platform, standing on the land west of the deck and reaching 25 ft over it (S65-21881,
    where it carries a lamp and what is taken for a camera's housing): estimated throughout."""
    g = "CameraTower"
    cx, cy = INSTRUMENT_TOWER
    parts.node(g, None, (cx, cy, GROUND), label="Camera tower")
    grey, floor = parts(g, "galv", True), parts(g, "deck")
    h, top = 3.0, 21.0
    corner = lambda i, z: (cx + (h if i in (1, 2) else -h), cy + (h if i in (2, 3) else -h), z)  # noqa: E731
    mid = (GROUND + top) / 2
    lattice(grey, corner, [FOOTING, GROUND + 1.0, GROUND + 12.5, mid, mid + 12.0, top - 0.3], 0.4, 0.25)
    for z, hole_x in ((mid, cx - h + 1.6), (top, cx + h - 1.6)):
        box(floor, (cx - h - 1.5, cy - h - 1.5, z - 0.2), (cx + h + 1.5, cy - 1.2, z))
        box(floor, (cx - h - 1.5, cy + 1.2, z - 0.2), (cx + h + 1.5, cy + h + 1.5, z))
        xa, xb = (hole_x + 1.2, cx + h + 1.5) if hole_x < cx else (cx - h - 1.5, hole_x - 1.2)
        box(floor, (xa, cy - 1.2, z - 0.2), (xb, cy + 1.2, z))
        ring_rail(
            grey, [(cx - h - 1.4, cy - h - 1.4, z), (cx + h + 1.4, cy - h - 1.4, z), (cx + h + 1.4, cy + h + 1.4, z), (cx - h - 1.4, cy + h + 1.4, z)]
        )
    parts.ladder(g, "run1", (cx - h + 0.4, cy, GROUND + 0.4), (cx - h + 0.4, cy, mid), face=(-1.0, 0.0, 0.0), mat="galv")
    parts.ladder(g, "run2", (cx + h - 0.4, cy, mid), (cx + h - 0.4, cy, top), face=(1.0, 0.0, 0.0), mat="galv")
    box(parts(g, "grey", True), (cx - 1.0, cy - h - 1.2, top + 2.6), (cx + 1.4, cy - h + 0.2, top + 4.4))  # the camera's housing, toward the vehicle
    beam(grey, (cx, cy - h - 0.5, top), (cx, cy - h - 0.5, top + 2.6), 0.3)
    parts.mark(g, "lamp", lens_out=1)
    lamp_head(grey, parts(g, "lamp"), (cx + h + 1.0, cy + h + 1.0, top + 4.2), (-0.8, 0.5, -0.5), 0.7)
    beam(grey, (cx + h + 1.0, cy + h + 1.0, top), (cx + h + 1.0, cy + h + 1.0, top + 3.6), 0.25)
