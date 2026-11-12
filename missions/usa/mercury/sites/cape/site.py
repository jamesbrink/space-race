"""What the Cape's neighbouring complexes share: units, materials, and a few forms.

Each complex is built in a frame of its own, in feet as its sources are: the origin on a named pad's
centre at the pad's surface, +Z up, +Y along a stated compass bearing (the complex's `heading` in
src/viewer/cape1961.ts, which places it by that pad's published latitude and longitude) and +X ninety
degrees clockwise of that seen from above. A thing given in the record as a distance and a true bearing
from the pad is placed with `at()`.

These are neighbours, seen from across the scrub and walked up to, not the flight's own pad: each is
drawn as clean forms with the silhouette its record gives, at one level, with no interiors, no moving
parts and nothing to climb. A building's door is built shut and its windows dark, as sitelib does for
any building whose inside is not recorded. ../cape.md says of each thing what is documented and what
is estimated, and from when to when it stood.

The materials are Complex 5/6's own (lc5/site.py), by the same names, so that concrete here is the
concrete there. Only those the viewer has a mesh waiting for may be used (cape1961.ts:
WORN_BY_NEIGHBOURS): `materials()` gives exactly that set.
"""

from __future__ import annotations

import math

import sitelib
from lc5.site import FOOTING, GAUGE, GROUND, RAIL_PAIR_X, RAIL_TOP
from lc5.site import materials as _lc5_materials
from sitelib import P, Parts, axes, beam, box, fine, handrail, obox, offset_poly, plate, prism, profile, slab, solid, stood
from srlib import FT

sitelib.use(FT)
ftp = profile

__all__ = [
    "FOOTING",
    "FT",
    "GAUGE",
    "GROUND",
    "RAIL_PAIR_X",
    "RAIL_TOP",
    "P",
    "Parts",
    "at",
    "axes",
    "beam",
    "box",
    "fine",
    "ftp",
    "handrail",
    "materials",
    "obox",
    "offset_poly",
    "plate",
    "prism",
    "rails",
    "slab",
    "solid",
    "stood",
    "wedge_blockhouse",
]

# The keys of lc5/site.py's materials a neighbour may wear. Keep in step with WORN_BY_NEIGHBOURS in cape1961.ts.
WORN = ("concrete", "bunker", "block", "red", "white", "grey", "black", "galv", "deck", "rail", "blast", "tar", "shell", "void")


def materials() -> dict:
    every = _lc5_materials()
    return {key: every[key] for key in WORN}


def at(distance: float, bearing: float, heading: float, origin=(0.0, 0.0)) -> tuple[float, float]:
    """A place given as feet along a true bearing from `origin`, in a frame whose +Y lies along `heading`."""
    a = math.radians(bearing - heading)
    return origin[0] + distance * math.sin(a), origin[1] + distance * math.cos(a)


def rails(parts: Parts, node: str, y0: float, y1: float, pairs=(-RAIL_PAIR_X, RAIL_PAIR_X)) -> None:
    """A service structure's track along Y: two pairs of rails, each pair standard gauge, as Complex 5/6's is
    (lc5/site.py: the same track ran on to Complex 26). The rails only: they stand through the ground, their heads
    just proud of a pad's concrete; between pads the ballast under them is the land's own (cape.ts: TRACKS), and
    the sleepers are not built."""
    steel = parts(node, "rail")
    for cx in pairs:
        for side in (-0.5, 0.5):
            x = cx + side * GAUGE
            box(steel, (x - 0.11, y0, -0.9), (x + 0.11, y1, RAIL_TOP))


def wedge_blockhouse(
    parts: Parts,
    node: str,
    apex,
    toward: float,
    width: float,
    length: float,
    eave: float,
    crown: float,
    *,
    annexe: float = 0.0,
    annexe_height: float = 11.0,
    ports=((-7.5, 1.0), (3.0, 7.5)),
) -> None:
    """A Cape blockhouse of the 1950s pattern: a hardened body `width` across with a right-angled point toward
    the pads, `length` from the point to its back wall, its walls `eave` high; over the part behind the point a
    roof vaulted from side to side to `crown`; behind that a lower flat-roofed annexe `annexe` deep, unhardened,
    with the way in. `apex` is the point (x, y); `toward` the way it points, degrees anticlockwise from +X.
    A viewing port is let into each face of the point (`ports`: each one's ends along the face, feet from its
    middle), dark: nothing is modelled behind it. Its doors are shut. Meshes on `node`: `bunker`, `block`, `tar`,
    `void`, `blast`."""
    c, s = math.cos(math.radians(toward)), math.sin(math.radians(toward))

    def w(u: float, v: float) -> tuple[float, float]:
        """A point u back from the apex along the building's axis and v to the left of it."""
        return apex[0] - u * c - v * s, apex[1] - u * s + v * c

    half = width / 2
    wall = parts(node, "bunker")
    prism(wall, [w(0, 0), w(half, -half), w(length, -half), w(length, half), w(half, half)], GROUND - FOOTING, eave)
    # the vault: the same section from just behind the point to the back wall
    n, rise = 10, crown - eave
    section = [(-half + 0.01, eave - 1.0)] + [(-half + 0.01 + (width - 0.02) * k / n, eave + rise * (1 - (2 * k / n - 1) ** 2)) for k in range(n + 1)]
    section += [(half - 0.01, eave - 1.0)]
    solid(parts(node, "bunker/vault"), [[(*w(u, v), z) for v, z in section] for u in (half + 0.5, length - 0.01)])
    # a viewing port in each face of the point, sunk through the wall, under one thin hood
    void, steel = parts(node, "void"), parts(node, "blast")
    for side in (1, -1):
        mx, my = w(half / 2, side * half / 2)  # the face's middle
        along = (w(half, side * half)[0] - apex[0], w(half, side * half)[1] - apex[1])
        norm = math.hypot(*along)
        along = (along[0] / norm, along[1] / norm)
        out = (along[1] * side, -along[0] * side)
        if out[0] * (mx - w(half, 0)[0]) + out[1] * (my - w(half, 0)[1]) < 0:
            out = (-out[0], -out[1])
        for a0, a1 in ports:
            ca = (a0 + a1) / 2
            obox(void, (mx + along[0] * ca - out[0] * 0.3, my + along[1] * ca - out[1] * 0.3, 6.6), (*along, 0), (0, 0, 1), (a1 - a0, 0.9, 3.6))
        span = max(a for p in ports for a in p) - min(a for p in ports for a in p) + 2.0
        mid = (max(a for p in ports for a in p) + min(a for p in ports for a in p)) / 2
        obox(steel, (mx + along[0] * mid + out[0] * 0.6, my + along[1] * mid + out[1] * 0.6, 8.75), (*along, 0), (0, 0, 1), (span, 1.6, 0.3))
    if annexe:
        back = [w(length, -half + 3.0), w(length + annexe, -half + 3.0), w(length + annexe, half - 3.0), w(length, half - 3.0)]
        prism(parts(node, "block"), back, GROUND - FOOTING, annexe_height)
        prism(parts(node, "tar"), offset_poly(back, 0.6), annexe_height, annexe_height + 0.5)
        dx, dy = w(length + annexe * 0.5, half - 3.0)
        obox(steel, (dx - s * 0.05, dy + c * 0.05, 3.7), (c, s, 0), (0, 0, 1), (7.0, 0.5, 7.4))  # the double door in its side, shut
