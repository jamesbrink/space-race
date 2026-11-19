"""A building of the range beyond Site 1's fences, as its sources give it: an outline measured by the CIA's
interpreters or kept by today's map, a kind of roof where a report names one, and a height read off a shadow.

Every one of these is seen from the pad at a kilometre or two, or walked up to across the steppe, and of none is
there a photograph from the ground in the years of the flights. So each is drawn as what the sources do give, a
plain rendered block of its measured outline under its kind of roof, with a plinth, a row of windows a storey and a
door, which are ours: they say that it is a building and how many storeys its height makes it, and nothing more is
claimed for them (../site-1.md, "Beyond the fences").

`Block` is one building; `build` sets it down in Site 1's frame, its node's origin at its middle on the ground, as
the assembly building is (mik.py), so the viewer can stand it on its land (viewer/around.ts).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import sitelib
import srlib
from site1 import relief
from site1.place import FOOTING, Local
from site1.site import Parts, box, stood

STOREY = 3.3  # a storey's height, m (estimated: what the windows are spaced by)


@dataclass(frozen=True)
class Block:
    """One building. `at` is its middle, m east and north of Site 1's axis; `size` its length and breadth, m;
    `axis` the bearing of its length, degrees; `eave` its walls' height, m; `roof` "gable", "hip" or "flat"."""

    node: str
    label: str
    about: str
    at: tuple[float, float]
    size: tuple[float, float]
    axis: float
    eave: float
    roof: str
    since: str | None
    until: str | None
    confidence: str
    source: str
    rise: float = 0.0  # the ridge over the eaves, m (0: 0.35 of the half breadth for a pitched roof: estimated)
    wall: str = "plaster"


def _hip(mb, a: float, b: float, z0: float, z1: float) -> None:
    """A hipped roof over a rectangle 2a by 2b (a >= b): four slopes of one pitch up to a ridge, closed underneath."""
    r = a - b
    u = sitelib.UNIT
    verts = [(-a, -b, z0), (a, -b, z0), (a, b, z0), (-a, b, z0), (-r, 0.0, z1), (r, 0.0, z1)]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (3, 2, 1, 0)]
    mb.add([(x * u, y * u, z * u) for x, y, z in verts], faces)


def rise_of(b: Block) -> float:
    """How far its ridge stands over its eaves, m."""
    return b.rise or (0.35 * b.size[1] / 2 if b.roof in ("gable", "hip") else 0.0)


def build(parts: Parts, b: Block, extra=None, smooth=()) -> bool:
    """Set the building down if it stood on the date being built. Says whether it did. `extra(k, b)` adds what is its
    alone to its meshes (a dome on its roof), in its own frame: +X along its length, its middle at the ground; `smooth`
    names the materials of it that are rounded."""
    if not stood(b.label, since=b.since, until=b.until, confidence=b.confidence, source=b.source):
        return False
    base = relief.ground(*b.at)
    parts.node(b.node, origin=(*b.at, base), label=b.label, about=b.about)
    k = Local()
    wall, roof, glass, steel = k(b.wall), k("felt"), k("void"), k("blast")
    a, h = b.size[0] / 2, b.size[1] / 2
    eave = b.eave
    rise = rise_of(b)
    over, thick = 0.5, 0.22
    if b.roof == "gable":
        ridge, pitch = eave + rise, rise / h
        sitelib.solid(wall, [[(x, -h, -FOOTING), (x, h, -FOOTING), (x, h, eave), (x, 0.0, ridge), (x, -h, eave)] for x in (-a, a)])
        for s in (-1, 1):  # each slope: a slab from beyond the eave up to the ridge
            ye, ze = s * (h + over), eave - over * pitch
            sitelib.solid(roof, [[(x, ye, ze), (x, 0.0, ridge), (x, 0.0, ridge + thick), (x, ye, ze + thick)] for x in (-a - over, a + over)])
    else:
        box(wall, (-a, -h, -FOOTING), (a, h, eave))
        if b.roof == "hip":  # its eaves over the walls all round, its underside a hand under their heads
            _hip(roof, a + over, h + over, eave - over * rise / h, eave + rise)
        else:  # a flat roof: a slab proud of the walls, and a kerb round it
            box(roof, (-a - 0.25, -h - 0.25, eave - 0.05), (a + 0.25, h + 0.25, eave + 0.3))
    # what each level of detail draws: in full and at the second level its plinth, windows and door; at the third its mass and roof
    if srlib.DETAIL >= 0.5:
        box(wall, (-a - 0.12, -h - 0.12, -FOOTING), (a + 0.12, h + 0.12, 0.55))  # the plinth
        storeys = max(1, round((eave - 0.6) / STOREY))
        bays = max(2, round(b.size[0] / 4.2))
        step = b.size[0] / bays
        door = bays // 2
        for s in (-1, 1):
            ya, yb = sorted((s * (h + 0.05), s * (h - 0.06)))
            for floor in range(storeys):
                sill = 1.25 + floor * STOREY
                head = min(sill + 1.5, eave - 0.35)
                if head - sill < 0.6:
                    continue
                for i in range(bays):
                    x = -a + (i + 0.5) * step
                    if floor == 0 and s == 1 and i == door:
                        continue
                    box(glass, (x - min(0.75, step * 0.3), ya, sill), (x + min(0.75, step * 0.3), yb, head))
        x = -a + (door + 0.5) * step
        box(steel, (x - 0.65, h - 0.06, 0.0), (x + 0.65, h + 0.16, min(2.25, eave - 0.3)))
    if extra:
        extra(k, b)
    k.put(parts, b.node, (*b.at, base), 90.0 - b.axis, smooth)
    return True


def line(b: Block) -> str:
    """One building for the build's report: its size, its place from the pad, its height."""
    x, y = b.at
    top = b.eave + (rise_of(b) or 0.3)
    return (
        f"{b.node} {b.size[0]:.1f} by {b.size[1]:.1f} m, {top:.1f} m to its top, {math.hypot(x, y):.0f} m off on bearing "
        f"{math.degrees(math.atan2(x, y)) % 360:.0f}"
    )
