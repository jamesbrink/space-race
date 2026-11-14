"""The place round Site 1's pad: what its modules share. Where the roads and the tracks run, the materials
only the place uses, and a few helpers (an earth bank, a thing built in its own frame and set down turned).

The plan of this place is one drawing and one map. The drawing is Figure 5 of PIC/JR-2/60 (CIA, February 1960):
a line drawing of "Launch Area A" with a scale bar and a north arrow, made from U-2 photographs of 1957 and
1959, which agrees with the plan in HTA/JR-4/58. The map is today's (OpenStreetMap, and satellite imagery of the
2020s), on which much of 1959's plan still stands: the bunker, the storage bunker's three bays, two of the
buildings, the spoil heap, the roads. Where a thing is on both, its place is today's map's (good to a few
metres) and its size the CIA's; where it is only on the drawing, its place is scaled off the drawing (good to
some ten metres) and says so. The drawing is 1.065 px a foot in the 500 dpi copy read, the rocket's axis at the
middle of its dark circle. See ../site-1.md, "The place round the pad".

Metres, in the site's frame: +X east, +Y north, the origin the rocket's axis at the deck.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import sitelib
from sitelib import P, beam, obox, profile
from srlib import MeshBuilder, material

from . import relief, site
from .site import GROUND, Parts

FOOTING = 0.6  # how far under the deck's level whatever stands on the land goes down: the land is 0.12 m under it
FLOOR = GROUND + 0.15  # a building's floor: a step up from the land (estimated)

# The tracks that cross the fence, and the roads: the same lines the land paints (src/viewer/tyuratam.ts: RAILS,
# ROADS). Keep the two in step. Metres east and north.
# The centre track is on the rocket's axis from 160 m out (the erector carried the rocket along it to the axis); the three
# beside it are brought, over their last 60 m, to where the CIA's plan of March 1961 has them on the platform (deck.py).
CENTRE_TRACK = [(-1400.7, 10.6), (-160.0, 0.0), (-25.8, 0.0)]
SPURS = [
    [(15.0, 13.564), (-60.0, 13.564), (-212.6, 15.2)],
    [(-204.5, -5.9), (-60.0, -8.321), (-26.8, -8.321)],
    [(10.9, -12.375), (-60.0, -12.375), (-155.4, -10.1), (-286.2, 1.1)],
    [(-330.6, 1.5), (-121.8, 25.7), (-39.8, 28.9)],
]
# The road in from the south-west (OpenStreetMap way 54570611) to where the roads part at the pad's south-west.
MAIN_ROAD = [(-1851.8, -774.8), (-1504.9, -117.6), (-1482.1, -88.6), (-1461.7, -70.7), (-1415.4, -42.7), (-1366.9, -27.2),
             (-1335.8, -23.2), (-603.8, -25.3), (-85.6, -22.6)]  # fmt: skip
# The road round the pit and back past the bunker (way 172571827).
RING_ROAD = [(-85.6, -22.6), (-81.0, -33.8), (-86.8, -91.8), (-81.0, -109.3), (-69.5, -121.0), (-38.7, -132.4), (-9.4, -134.8),
             (58.9, -135.0), (86.3, -126.0), (222.3, -45.9), (230.8, -37.7), (238.2, -25.0), (242.7, -3.0), (241.7, 9.2),
             (235.5, 29.9), (219.6, 48.7), (152.3, 83.7), (69.8, 120.8), (46.2, 135.1), (36.9, 154.0), (34.2, 225.0),
             (31.3, 233.5), (21.4, 245.4), (5.7, 250.2), (-82.7, 249.4)]  # fmt: skip
# The road from the storage bunker south to the propellant shed (way 172441909, its last leg), as far as the northern spur.
BUNKER_ROAD = [(-82.7, 249.4), (-81.7, 199.6), (-83.5, 34.0)]
ROAD_HALF = 3.0  # half a road's width, m (estimated: a road of concrete slabs two lanes wide)
TRACK_HALF = 2.2  # half a track's bed, m (tyuratam.ts paints it 2.1 m either side)

# The short drives off them, which are ours: to the gas receivers by the platform, to the storage bunker's three bays
# and to the check-out shop's gate.
DRIVES = [
    [(-85.6, -22.6), (-48.0, -20.5)],
    [(-82.0, 186.06), (-57.7, 186.06)],
    [(-82.0, 207.4), (-57.7, 207.4)],
    [(-82.4, 228.74), (-57.7, 228.74)],
    [(-82.4, 230.3), (-92.0, 230.3)],
    [(242.4, 0.0), (235.0, 0.0)],  # from the road round the pit's tip onto the road down into the pit (platform.py)
]

ROADS = [MAIN_ROAD, RING_ROAD, BUNKER_ROAD, *DRIVES]


def _to_line(x: float, y: float, line) -> float:
    best = 1e9
    for (ax, ay), (bx, by) in zip(line, line[1:]):
        dx, dy = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        best = min(best, math.hypot(x - ax - t * dx, y - ay - t * dy))
    return best


def to_road(x: float, y: float) -> float:
    """How far a point is from the nearest road's middle line, m."""
    return min(_to_line(x, y, line) for line in ROADS)


def to_track(x: float, y: float) -> float:
    """How far a point is from the nearest track's middle line, m."""
    return min(_to_line(x, y, line) for line in [CENTRE_TRACK, *SPURS])


def clear_of_ways(x: float, y: float, margin: float = 1.0) -> bool:
    """Whether a post or a pole may stand here: off every road and every track's bed, with a margin."""
    return to_road(x, y) > ROAD_HALF + margin and to_track(x, y) > TRACK_HALF + margin


def toward_pad(x: float, y: float) -> float:
    """The heading, degrees anticlockwise from the site's +X, of the way from a point to the rocket."""
    return math.degrees(math.atan2(-y, -x))


def rounded(cx: float, cy: float, w: float, h: float, r: float, n: int = 4) -> list:
    """A rectangle w (east-west) by h, its corners rounded to radius r, anticlockwise from above."""
    pts = []
    for sx, sy, a0 in ((1, 1, 0.0), (-1, 1, 0.5), (-1, -1, 1.0), (1, -1, 1.5)):
        ox, oy = cx + sx * (w / 2 - r), cy + sy * (h / 2 - r)
        pts += [(ox + r * math.cos(math.pi * (a0 + 0.5 * k / n)), oy + r * math.sin(math.pi * (a0 + 0.5 * k / n))) for k in range(n + 1)]
    return pts


class Local:
    """Meshes built in a thing's own frame (metres, its +X the way it faces), then set down on the site turned to
    its heading: a shed along its spur, an observation post facing the rocket."""

    def __init__(self) -> None:
        self.mb: dict[str, MeshBuilder] = {}

    def __call__(self, mat: str) -> MeshBuilder:
        return self.mb.setdefault(mat, MeshBuilder())

    def put(self, parts: Parts, node: str, at, heading: float, smooth=()) -> None:
        for mat, mb in self.mb.items():
            sitelib.placed(parts(node, mat, mat in smooth), mb, at, heading)


def turned(at, heading: float, x: float, y: float) -> tuple[float, float]:
    """Where a point of a thing's own frame is on the site, once it is set down at `at` turned `heading` degrees."""
    c, s = math.cos(math.radians(heading)), math.sin(math.radians(heading))
    return at[0] + x * c - y * s, at[1] + x * s + y * c


def settle(parts: Parts, *, draped=(), groups=(), left=()) -> list[tuple[str, float]]:
    """Set everything built so far down on the land (relief.py). Every module of the place builds on one level, the
    deck's; the ground north of the tracks lies some 8 m under that. A thing that stands in one spot (a building, a
    tower, a bunker: a top-level node, or a child of one of `groups`) goes down as it is, by the land's height at the
    middle of its plan. A thing that runs across the country (a fence, a row of poles, a heap of earth: `draped`) goes
    down vertex by vertex, each by the land's height where it is, so posts stay upright and wires follow the ground.
    `left` are not moved (what stands on the embankment, or was built on the land already). Returns what went down as
    it was, and how far."""
    top_of, unit_of = {}, {}
    for name, (obj, _) in parts.nodes.items():
        chain = [obj]
        while chain[-1].parent is not None:
            chain.append(chain[-1].parent)
        top_of[name] = chain[-1].name
        unit_of[name] = chain[-2].name if chain[-1].name in groups and len(chain) > 1 else chain[-1].name
    boxes: dict[str, list[float]] = {}
    for (node, _), (mb, _) in parts.meshes.items():
        top = top_of[node]
        if top in left or not mb.verts:
            continue
        if top in draped or unit_of[node] in groups:
            mb.verts = [(x, y, z + relief.ground(x, y)) for x, y, z in mb.verts]
            continue
        b = boxes.setdefault(unit_of[node], [1e9, 1e9, -1e9, -1e9])
        for x, y, _ in mb.verts:
            b[0], b[1], b[2], b[3] = min(b[0], x), min(b[1], y), max(b[2], x), max(b[3], y)
    drop = {unit: relief.ground((b[0] + b[2]) / 2, (b[1] + b[3]) / 2) for unit, b in boxes.items()}
    for (node, _), (mb, _) in parts.meshes.items():
        dz = drop.get(unit_of[node])
        if dz and top_of[node] not in draped and unit_of[node] not in groups:
            mb.verts = [(x, y, z + dz) for x, y, z in mb.verts]
    for name, (obj, origin) in list(parts.nodes.items()):
        dz = drop.get(unit_of[name])
        if not dz:
            continue
        parts.nodes[name] = (obj, origin + Vector((0.0, 0.0, dz)))
        if name == unit_of[name]:
            obj.location.z += dz
    for k, (node, key, foot, top, *rest) in enumerate(parts.ladders):
        dz = drop.get(unit_of[node])
        if dz:
            parts.ladders[k] = (node, key, foot + Vector((0.0, 0.0, dz)), top + Vector((0.0, 0.0, dz)), *rest)
    return sorted(drop.items())


def bank(mb: MeshBuilder, outline, top: float, spread: float, *, foot: float | None = None) -> None:
    """Earth heaped to `top` over an outline, its sides eased out `spread` to the ground and on down past it."""
    sitelib.slab(mb, outline, GROUND - FOOTING if foot is None else foot, top, spread=spread, soft=True)


def ridge(
    mb: MeshBuilder, at, heading: float, x0: float, x1: float, y0: float, side: int, top: float, *, run: float = 1.5, crest: float = 0.7
) -> None:
    """Earth banked against a wall, in a thing's own frame: the wall runs along its X from x0 to x1 at y0, and the
    earth lies on its `side` (+1: toward +Y), up to `top` against the wall, falling away 1 in `run`, and dying down to
    a quarter of that at each end so that it does not spill round the wall's corners."""
    shoulder = min(1.2, (x1 - x0) / 3)

    def loop(x: float, k: float) -> list:
        zt = GROUND + (top - GROUND) * k
        out = crest * k + (zt - GROUND + 0.3) * run
        pts = [(x, y0, GROUND - FOOTING), (x, y0 + side * out, GROUND - 0.3), (x, y0 + side * crest * k, zt), (x, y0, zt)]
        return [(*turned(at, heading, px, py), pz) for px, py, pz in pts]

    sitelib.solid(mb, [loop(x0, 0.25), loop(x0 + shoulder, 1.0), loop(x1 - shoulder, 1.0), loop(x1, 0.25)])


def shell(parts: Parts, node: str, key: str, rect, eave: float, openings: dict, *, wall: float = 0.4, mat: str = "plaster") -> list:
    """sitelib.building on this site's ground: plastered masonry walls down past the land, a floor a step up, a flat roof."""
    walls = sitelib.building(parts, node, key, rect, eave, openings, floor=FLOOR, footing=-FOOTING, mat=mat, wall=wall)
    sitelib.flat_roof(parts, node, key, rect, eave, over=0.35, mat=mat)
    return walls


def double_door(parts: Parts, name: str, parent: str, w, s0: float, s1: float, sill: float, head: float, *, depth: float, mat: str = "blast") -> None:
    """Two steel leaves filling an opening of a wall, meeting in its middle, built shut: what is behind them is not
    recorded and so is not offered (sitelib.door, works=False). One frame round the pair."""
    mid = (s0 + s1) / 2
    kw = dict(depth=depth, mat=mat, fittings="lever", works=False, frame=False)
    sitelib.wall_door(parts, f"{name}L", parent, w, s0, mid, sill, head, hinge="s0", **kw)
    sitelib.wall_door(parts, f"{name}R", parent, w, mid, s1, sill, head, hinge="s1", **kw)
    steel = parts(parent, "frame/doors")
    b, lap = 0.12, 0.01
    for d0, d1 in ((-0.03, 0.05), (w.thick - 0.05, w.thick + 0.03)):
        w.box(steel, s0 - b, s0 + lap, d0, d1, sill, head + b)
        w.box(steel, s1 - lap, s1 + b, d0, d1, sill, head + b)
        w.box(steel, s0 + lap, s1 - lap, d0, d1, head - lap, head + b)


def lamp_pole(parts: Parts, node: str, x: float, y: float, aim, *, height: float = 7.5, ground: float = GROUND, key: str = "") -> None:
    """A light pole of the kind the range's fences had: a timber pole bolted to a concrete stub in the ground, a steel
    bracket at its head, a dished enamel shade and the lamp under it (material `lamp`, facing down and out: the
    viewer lights it after dark). Every size is estimated; that the poles stood, and where, is the CIA's."""
    wood, stub, metal = parts(node, f"timber/poles{key}", True), parts(node, f"concrete/stubs{key}"), parts(node, f"dark/brackets{key}", True)
    shade, glow = parts(node, f"enamel/shades{key}", True), parts(node, f"lamp/bulbs{key}", True)
    parts.mark(node, f"lamp/bulbs{key}", lens_out=1)
    a = Vector((aim[0], aim[1], 0.0)).normalized()
    # the stub: a concrete post 0.2 m square, 1.4 m out of the ground, the pole strapped to its side
    obox(stub, (x - a.x * 0.19, y - a.y * 0.19, ground + 0.35), tuple(a), (0, 0, 1), (0.2, 0.2, 2.1))
    wood.lathe(profile([(0.0, 0.25), (0.11, 0.25), (0.08, height), (0.0, height)]), 10, matrix=Matrix.Translation(P(x, y, ground)))
    for z in (0.55, 1.2):  # two wire lashings
        metal.lathe(
            profile([(0.0, 0.0), (0.24, 0.0), (0.24, 0.05), (0.0, 0.05)]), 8, matrix=Matrix.Translation(P(x - a.x * 0.1, y - a.y * 0.1, ground + z))
        )
    # the bracket: up and out over the ground the lamp lights
    top = Vector((x, y, ground + height - 0.25))
    out = top + a * 0.9 + Vector((0, 0, 0.35))
    beam(metal, tuple(top + a * 0.06), tuple(out), 0.04)
    beam(metal, tuple(top + a * 0.06 - Vector((0, 0, 0.5))), tuple(top + a * 0.5 + Vector((0, 0, 0.19))), 0.03)
    head = out - Vector((0, 0, 0.06))
    m = Matrix.Translation(head)
    # (each profile runs out along the underside and back over the top: a lathe's faces look outward that way round)
    shade.lathe(profile([(0.0, -0.075), (0.07, -0.075), (0.245, -0.135), (0.24, -0.12), (0.08, -0.06), (0.05, 0.0), (0.0, 0.0)]), 12, matrix=m)
    metal.lathe(profile([(0.0, -0.15), (0.045, -0.15), (0.045, -0.07), (0.0, -0.07)]), 8, matrix=m)  # the lamp's holder
    # the lamp: the lower half of a globe, so that what the viewer takes for its beam points down
    glow.lathe(profile([(0.0, -0.215), (0.045, -0.2), (0.062, -0.145)]), 8, matrix=m)


def materials() -> dict:
    """The pad's materials (site.materials) and the ones only the place uses. Colours are estimated throughout: no
    colour photograph of these buildings in 1961 has been read."""
    M = site.materials()
    m = material
    M.update(
        {
            "plaster": m("concrete-plaster-whitewashed", (0.66, 0.64, 0.58), 0.0, 0.92),
            "joint": m("concrete-joint", (0.07, 0.07, 0.065), 0.0, 1.0),
            "tar": m("roof-tar", (0.035, 0.035, 0.035), 0.0, 0.95),
            "blast": m("steel-door-green", (0.11, 0.14, 0.1), 0.5, 0.6),
            "frame": m("steel-window-frame", (0.07, 0.075, 0.075), 0.6, 0.55),
            "void": m("window-void", (0.02, 0.022, 0.025), 0.0, 0.6),
            "chrome": m("chrome", (0.75, 0.76, 0.78), 1.0, 0.18),
            "sign": m("paint-sign-white", (0.82, 0.82, 0.8), 0.0, 0.5),
            "black": m("paint-black", (0.04, 0.04, 0.042), 0.2, 0.7),
            "grey": m("paint-structure-grey", (0.25, 0.27, 0.28), 0.1, 0.6),
            "timber": m("timber-pole", (0.2, 0.15, 0.1), 0.0, 0.9),
            "plank": m("timber-plank", (0.34, 0.28, 0.2), 0.0, 0.85),
            "wire": m("steel-wire", (0.17, 0.15, 0.13), 0.8, 0.6),
            "tank": m("steel-receiver-grey", (0.27, 0.29, 0.28), 0.6, 0.5),
            "enamel": m("enamel-shade-white", (0.8, 0.8, 0.76), 0.0, 0.35),
        }
    )
    return M
