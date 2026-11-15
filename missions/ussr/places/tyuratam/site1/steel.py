"""Steelwork the launch-day service hardware shares: a frame turned about the rocket's axis, a plate
girder with lightening holes, decks cut to a curve, rails round an arc.

Everything here is in the site's units (metres) and the site's frame (../site-1.md).
"""

from __future__ import annotations

import math

from mathutils import Vector

from srlib import material

from .site import TURN, P, Parts, beam, fine, handrail, obox
from .site import profile as lathe_profile

__all__ = ["Turned", "arc", "arc_deck", "arc_rail", "box_truss", "extra_materials", "girder", "poly_deck", "polyline", "slim_truss"]


def extra_materials(parts: Parts) -> None:
    """Materials only the service hardware wears, added to the site's own."""
    m = parts.M
    if "tread" not in m:
        m["tread"] = material("steel-wheel-tread", (0.36, 0.35, 0.33), 1.0, 0.4)


class Turned:
    """A frame turned about the vertical through the rocket's axis: `out` points away from the axis at `az` degrees
    round the rocket from its own +X, `side` anticlockwise from above, and a point is (out, side, up)."""

    def __init__(self, az: float) -> None:
        self.angle = TURN + math.radians(az)
        self.out = Vector((math.cos(self.angle), math.sin(self.angle), 0.0))
        self.side = Vector((-self.out.y, self.out.x, 0.0))
        self.up = Vector((0.0, 0.0, 1.0))

    def __call__(self, r: float, s: float, z: float) -> tuple:
        return tuple(self.out * r + self.side * s + self.up * z)

    def v(self, r: float, s: float, z: float) -> Vector:
        return Vector(self(r, s, z))


def polyline(points, z: float) -> list:
    """Where a path given as (station, a, b, ...) knots is at station z: straight between the knots, and held at its
    ends beyond them."""
    if z <= points[0][0]:
        return list(points[0][1:])
    for (z0, *a), (z1, *b) in zip(points, points[1:]):
        if z <= z1:
            t = (z - z0) / (z1 - z0)
            return [p + (q - p) * t for p, q in zip(a, b)]
    return list(points[-1][1:])


def arc(r: float, a0: float, a1: float, n: int) -> list[tuple[float, float]]:
    """Points round a circle about the origin from a0 to a1 radians, both ends in."""
    return [(r * math.cos(a0 + (a1 - a0) * k / n), r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


def girder(mb, a, b, up, depth: float, flange: float, *, web: float = 0.03, holes: int = 0, hole: float = 0.0, plate: float = 0.04) -> None:
    """A welded plate girder from a to b (the middle of its web), `depth` deep along `up`: two flanges and a web, the
    web pierced by `holes` round lightening holes of radius `hole`, evenly spaced. The holes are openings."""
    a, b = Vector(a), Vector(b)
    u = (b - a).normalized()
    v = Vector(up)
    v = (v - u * v.dot(u)).normalized()
    w = u.cross(v)
    length = (b - a).length
    mid = (a + b) / 2
    for s in (-1, 1):  # the flanges, their inner faces where the web ends
        obox(mb, tuple(mid + v * (s * (depth / 2 - plate / 2))), tuple(u), tuple(v), (length, flange, plate))
    hd = depth / 2 - plate + 0.004  # the web runs a little into each flange
    if not holes or not fine():
        obox(mb, tuple(mid), tuple(u), tuple(v), (length - 0.02, web, 2 * hd))
        return
    for end, sign in ((a, -1), (b, 1)):  # the web's two ends
        quad = [
            end + v * hd + w * (sign * web / 2),
            end - v * hd + w * (sign * web / 2),
            end - v * hd - w * (sign * web / 2),
            end + v * hd - w * (sign * web / 2),
        ]
        mb.add([tuple(P(*q)) for q in quad], [(0, 1, 2, 3)])
    cell = length / holes
    n = 16
    for k in range(holes):
        c = a + u * (cell * (k + 0.5))
        hx = cell / 2
        angles = sorted({math.tau * i / n for i in range(n)} | {math.atan2(sy * hd, sx * hx) % math.tau for sx in (-1, 1) for sy in (-1, 1)})
        inner, outer = [], []
        for t in angles:
            ct, st = math.cos(t), math.sin(t)
            d = min(hx / abs(ct) if abs(ct) > 1e-9 else 1e9, hd / abs(st) if abs(st) > 1e-9 else 1e9)
            inner.append(c + u * (hole * ct) + v * (hole * st))
            outer.append(c + u * (d * ct) + v * (d * st))
        m = len(angles)
        for face in (1, -1):
            off = w * (face * web / 2)
            for i in range(m):
                j = (i + 1) % m
                quad = [inner[i] + off, outer[i] + off, outer[j] + off, inner[j] + off]
                mb.add([tuple(P(*q)) for q in (quad if face > 0 else quad[::-1])], [(0, 1, 2, 3)])
        for i in range(m):  # the hole's wall, seen from inside the hole
            j = (i + 1) % m
            quad = [inner[i] + w * (web / 2), inner[j] + w * (web / 2), inner[j] - w * (web / 2), inner[i] - w * (web / 2)]
            mb.add([tuple(P(*q)) for q in quad], [(0, 1, 2, 3)])


def poly_deck(mb, outline, z0: float, z1: float) -> None:
    """A flat deck over any simple outline (site units, anticlockwise from above), from z0 up to z1."""
    from sitelib import ear_clip

    tris = ear_clip([tuple(p) for p in outline])
    top = [tuple(P(x, y, z1)) for x, y in outline]
    bot = [tuple(P(x, y, z0)) for x, y in outline]
    mb.add(top, tris)
    mb.add(bot, [t[::-1] for t in tris])
    k = len(outline)
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def arc_deck(mb, r0: float, r1: float, z0: float, z1: float, a0: float, a1: float, segs: int = 24) -> None:
    """A deck that is part of a ring about the rocket's axis: from radius r0 to r1 and angle a0 to a1 (radians, in the
    site's frame), closed at both ends."""
    mb.lathe(lathe_profile([(r0, z0), (r1, z0), (r1, z1), (r0, z1), (r0, z0)]), segs, arc=(a0, a1))
    for a, flip in ((a0, False), (a1, True)):
        c, s = math.cos(a), math.sin(a)
        quad = [P(r0 * c, r0 * s, z0), P(r1 * c, r1 * s, z0), P(r1 * c, r1 * s, z1), P(r0 * c, r0 * s, z1)]
        mb.add([tuple(q) for q in (quad[::-1] if flip else quad)], [(0, 1, 2, 3)])


def arc_rail(mb, r: float, z: float, a0: float, a1: float, n: int, height: float = 1.1) -> None:
    """A handrail round part of a circle about the rocket's axis, standing on a deck at z."""
    handrail(mb, [(x, y, z) for x, y in arc(r, a0, a1, n)], height=height, post=0.05, rail=0.04)


def slim_truss(mb, corner, s0: float, s1: float, bays: int, chord: float, brace: float) -> None:
    """A slender straight box truss from station s0 to s1: four chords each in one piece, a frame at every bay and, close
    to, one diagonal a bay on each face, alternating. corner(i, s) places chord i. (A diagonal that lies within some
    fourteen degrees of its chord is taken by the clearance check for a face laid on it: keep a bay under three times
    the truss's width, or leave the diagonals to the finest level, as this does.)"""
    for i in range(4):
        beam(mb, corner(i, s0), corner(i, s1), chord)
    stations = [s0 + (s1 - s0) * k / bays for k in range(bays + 1)]
    for s in stations:
        for i in range(4):
            beam(mb, corner(i, s), corner((i + 1) % 4, s), brace)
    if not fine():
        return
    for n, (a, b) in enumerate(zip(stations, stations[1:])):
        for i in range(4):
            j = (i + 1) % 4
            beam(mb, corner(i if n % 2 == 0 else j, a), corner(j if n % 2 == 0 else i, b), brace * 0.85)


def box_truss(mb, corner, stations, chord: float, brace: float) -> None:
    """sitelib.truss for a slender truss that may bend: chords bay by bay, a frame at each station, and the diagonals
    only at the finer levels (with the longer bays of the coarsest one they lie too near their chords: see slim_truss)."""
    for a, b in zip(stations, stations[1:]):
        for i in range(4):
            beam(mb, corner(i, a), corner(i, b), chord)
    for s in stations:
        for i in range(4):
            beam(mb, corner(i, s), corner((i + 1) % 4, s), brace)
    if not fine():
        return
    for n, (a, b) in enumerate(zip(stations, stations[1:])):
        for i in range(4):
            j = (i + 1) % 4
            beam(mb, corner(i if n % 2 == 0 else j, a), corner(j if n % 2 == 0 else i, b), brace * 0.85)
