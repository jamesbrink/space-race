"""The double security fence round the launch area, the light poles inside it and the guard towers.

HTA/JR-4/58 (the photographs of August 1957): the area "is enclosed by two parallel security fences situated 160
feet apart"; "just inside the outer fence line and parallel to it is a series of light poles, spaced 120 feet
apart and probably used for night security. Guard towers are located at the four corners of the installation and
at intervals along the outer fence." Its line drawing and Figure 5 of PIC/JR-2/60 (1959) dimension the outer fence
2,925 by 1,622 ft and mark six towers: the corners, and one on each long side west of its middle.

Where it is. The fence has gone, but its line has not: today's imagery shows its south and east sides as tracks
191 m south and 435 m east of the rocket, its north side 305 m north, and the map's military area takes its west
side 484 m west, where the security building still stands "along the fence line". North to south that is the
CIA's 1,622 ft to within 2 m. East to west it is 919 m against their 2,925 ft (891.5 m): the map is taken, and
the difference recorded (site-1.md).

Estimated: what the fence was (timber posts and seven strands of barbed wire, as the range's fences of those years
are described; no close photograph of this one has been read), the poles' height and lamps, the towers' form, and
that the gates stood open: where the road and the centre track cross the two fences a gap is left between taller
posts, and no leaf is modelled.

Nodes: OuterFenceNorth/East/South/West, InnerFenceNorth/East/South/West, LightPolesNorth/East/South/West,
GuardTowers (with a child for each tower). A side is a piece of its own so that the viewer draws the far ones coarse.
"""

from __future__ import annotations

import math

import srlib

from . import buildings, rim
from .place import FOOTING, clear_of_ways, lamp_pole
from .site import FT, P, Parts, beam, box, fine, obox, stood

SOUTH, EAST, WEST = -191.0, 435.0, -484.0  # the outer fence's sides, m from the rocket (today's imagery and map)
NORTH = SOUTH + 1622.0 * FT  # the CIA's breadth north to south
BETWEEN = 160.0 * FT  # the inner fence inside the outer (HTA/JR-4/58)
POLES_IN, POLES_APART = 25.0 * FT, 120.0 * FT  # the light poles: inside the outer fence (read off the 1958 drawing), and apart (text)
TOWER_WEST = -95.0  # the two towers on the long sides: m east of the rocket (scaled off Figure 5)
POST, POST_APART, STRANDS = 2.3, 3.0, 7  # a fence post's height and spacing, m, and the strands of wire (all estimated)
CHUNK = 460.0  # a mesh of fence is no longer than this, m: the exporter's quantisation is by the mesh (under 2 mm at this)


def _rect(inset: float) -> list[tuple[str, tuple[float, float], tuple[float, float]]]:
    w, e, s, n = WEST + inset, EAST - inset, SOUTH + inset, NORTH - inset
    return [("North", (e, n), (w, n)), ("West", (w, n), (w, s)), ("South", (w, s), (e, s)), ("East", (e, s), (e, n))]


def _in_building(x: float, y: float) -> bool:
    x0, y0, x1, y1 = buildings.SECURITY
    return x0 - 1.5 < x < x1 + 1.5 and y0 - 1.5 < y < y1 + 1.5


def fence(parts: Parts, name: str, inset: float) -> None:
    pitch = POST_APART if fine() else 2 * POST_APART
    for side, a, b in _rect(inset):
        g = f"{name}Fence{side}"
        parts.node(g)
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ux, uy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
        n = round(length / pitch)
        # every post's place, the ground there, and whether it may stand (not in a road or on a track)
        at = [(a[0] + ux * length * k / n, a[1] + uy * length * k / n) for k in range(n + 1)]
        ok = [clear_of_ways(x, y, 1.0) for x, y in at]
        zs = [rim.ground(x, y) for x, y in at]
        for k, (x, y) in enumerate(at[:-1]):  # (the far corner's post is the next side's first)
            if not ok[k]:
                continue
            c = int(length * k / n / CHUNK)
            gate = not ok[k - 1] or not ok[min(n, k + 1)]  # the post beside a way through: taller and stouter
            t, h = (0.2, POST + 0.7) if gate else (0.12, POST)
            box(parts(g, f"timber/{c}"), (x - t / 2, y - t / 2, zs[k] - FOOTING), (x + t / 2, y + t / 2, zs[k] + h))
            if gate or k == 0:  # a strut either way along the fence, taking the wire's pull
                for s in (-1, 1):
                    obox_strut(parts(g, f"timber/{c}"), (x, y, zs[k]), (ux * s, uy * s), h)
        if srlib.DETAIL < 1.0:
            continue  # the wire is drawn only close to: a centimetre of wire is nothing at a hundred metres
        wire = lambda k: parts(g, f"wire/{int(length * k / n / CHUNK)}", True)  # noqa: E731
        k = 0
        while k < n:
            if not (ok[k] and ok[k + 1]):
                k += 1
                continue
            # a run of posts on level ground is strung with one length of wire a strand; on the heap, post to post
            j = k + 1
            while (
                j < n
                and ok[j + 1]
                and abs(zs[j + 1] - zs[k]) < 1e-6
                and abs(zs[j] - zs[k]) < 1e-6
                and int(length * j / n / CHUNK) == int(length * k / n / CHUNK)
            ):
                j += 1
            for s in range(STRANDS):
                h = 0.25 + (POST - 0.4) * s / (STRANDS - 1)
                wire(k).tube(P(*at[k], zs[k] + h), P(*at[j], zs[j] + h), 0.005, 4, caps=False)
            k = j


def obox_strut(mb, foot, along, height: float) -> None:
    """A raking strut from the ground a way along the fence up to a post, two thirds of the way up it."""
    x, y, z = foot
    beam(mb, (x + along[0] * 1.5, y + along[1] * 1.5, z - 0.3), (x + along[0] * 0.05, y + along[1] * 0.05, z + height * 0.66), 0.09)


def poles(parts: Parts) -> None:
    for side, a, b in _rect(POLES_IN):
        g = f"LightPoles{side}"
        parts.node(g)
        length = math.hypot(b[0] - a[0], b[1] - a[1])
        ux, uy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
        n = int(length / POLES_APART)
        for k in range(n):  # from each corner, 120 ft apart; the last gap of a side is what is left
            x, y = a[0] + ux * POLES_APART * k, a[1] + uy * POLES_APART * k
            if not clear_of_ways(x, y, 2.0) or _in_building(x, y):
                continue
            # the lamp hangs out toward the outer fence: (ux, uy) turned a quarter to the right is outward on this ring
            lamp_pole(parts, g, x, y, (uy, -ux), ground=rim.ground(x, y))


def towers(parts: Parts) -> None:
    top = "GuardTowers"
    parts.node(top)
    w, e, s, n = WEST + 4.0, EAST - 4.0, SOUTH + 4.0, NORTH - 4.0
    places = [("NW", w, n), ("NE", e, n), ("SE", e, s), ("SW", w, s), ("N", TOWER_WEST, n), ("S", TOWER_WEST, s)]
    for key, x, y in places:
        g = f"GuardTower_{key}"
        parts.node(
            g,
            top,
            (x, y, 0.0),
            label="Guard tower",
            about=(
                "One of six on the outer fence: the four corners and one on each long side (CIA, from photographs of 1957 and 1959). "
                "Its place is theirs; its form is estimated, a timber tower of the kind every Soviet range fence had."
            ),
        )
        wood, board, roof = parts(g, "timber"), parts(g, "plank"), parts(g, "tar")
        z0 = rim.ground(x, y)
        half, floor, eave = 1.1, z0 + 6.0, z0 + 8.1
        legs = [(sx, sy) for sx, sy in ((1, 1), (-1, 1), (-1, -1), (1, -1))]

        def leg(i: int, z: float):
            splay = 0.5 * max(0.0, (floor - z) / (floor - z0))
            return (x + legs[i][0] * (half + splay), y + legs[i][1] * (half + splay), z)

        for i in range(4):
            beam(wood, leg(i, z0 - FOOTING), leg(i, floor - 0.03), 0.18)
            beam(wood, leg(i, floor - 0.03), leg(i, eave), 0.14)
            j = (i + 1) % 4
            for za, zb in ((z0 + 0.4, z0 + 3.0), (z0 + 3.0, floor - 0.2)):  # two tiers of cross bracing a face
                beam(wood, leg(i, za), leg(j, zb), 0.08)
                beam(wood, leg(j, za), leg(i, zb), 0.08)
                beam(wood, leg(i, zb), leg(j, zb), 0.09)
        # the floor, boarded; a boarded breast to the cabin on three sides and beside the way in; the roof
        box(board, (x - half - 0.25, y - half - 0.25, floor - 0.06), (x + half + 0.25, y + half + 0.25, floor))
        # the ladder is on the side toward the middle of the area
        dx = 1.0 if x < (WEST + EAST) / 2 else -1.0
        for sx, sy in ((0, 1), (0, -1), (-dx, 0)):
            cx, cy = x + sx * (half + 0.06), y + sy * (half + 0.06)
            obox(board, (cx, cy, floor + 0.55), (sy, -sx, 0) if sx == 0 else (0, 1, 0), (0, 0, 1), (2 * half + 0.3, 0.03, 1.1))
        for s2 in (-1, 1):  # beside the gap the ladder comes up to
            obox(board, (x + dx * (half + 0.06), y + s2 * (half / 2 + 0.26), floor + 0.55), (0, 1, 0), (0, 0, 1), (half - 0.4, 0.03, 1.1))
        peak = eave + 0.75
        r = half + 0.55
        c = [(x + r, y + r, eave), (x - r, y + r, eave), (x - r, y - r, eave), (x + r, y - r, eave)]
        roof.add([P(*p) for p in c] + [P(x, y, peak)], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)])
        board.add([P(px, py, pz - 0.04) for px, py, pz in c], [(3, 2, 1, 0)])
        parts.ladder(g, "up", (x + dx * (half + 0.72), y, z0), (x + dx * (half + 0.3), y, floor), face=(-dx, 0, 0), mat="timber", width=0.5)


def build(parts: Parts) -> None:
    since = dict(since="1957", confidence="documented")
    if stood(
        "Double security fence", **since, source="HTA/JR-4/58: two fences 160 ft apart; on Figure 5 of PIC/JR-2/60; its line is on today's imagery"
    ):
        fence(parts, "Outer", 0.0)
        fence(parts, "Inner", BETWEEN)
    if stood("Light poles inside the outer fence", **since, source="HTA/JR-4/58: 120 ft apart; on Figure 5 of PIC/JR-2/60"):
        poles(parts)
    if stood(
        "Guard towers on the outer fence (six)",
        **since,
        source="HTA/JR-4/58: at the four corners and at intervals; six on its drawing and on Figure 5",
    ):
        towers(parts)


def summary() -> str:
    return f"outer fence {EAST - WEST:.0f} by {NORTH - SOUTH:.0f} m, inner {BETWEEN:.1f} m inside it, poles {POLES_APART:.1f} m apart"
