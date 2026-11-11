"""Launch Complex 5: the site's frame, its key dimensions, materials, and the geometry helpers the
pieces share. Dimensions are feet, as the sources give them; each builder multiplies by FT once.

Frame (Blender): the origin is the launcher's centre on the hardstand's surface. +Z is up. +X is
the side the capsule hatch faces: WNW, about 295 deg true, uprange and toward the blockhouse.
+Y runs along the service structure's rails toward its parking places, SSW (205 deg true). True
north is (sin 25 deg, -cos 25 deg, 0) = (0.423, -0.906, 0): 25 deg from -Y toward +X. See ../lc-5.md.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import srlib
from srlib import FT, MeshBuilder, group, material

# --------------------------------------------------------------------------- the site

TRUE_NORTH = (math.sin(math.radians(25.0)), -math.cos(math.radians(25.0)), 0.0)
# The launcher's support pads, where the fins' bottoms rest. Estimated 4.9 to 6.0 ft off S63-02651
# (MR-4 at ignition, ground level): the booster's 70 in body gives 23.5 px/ft at the tail.
LAUNCHER_TOP = 5.5
# The capsule: the vehicle's origin (the heat shield's plane of maximum diameter) is 716.0 in above
# the fins; the hatch centre 32.8 in above that, the umbilical receptacle 8 in up the cone.
SHIELD_Z = LAUNCHER_TOP + 716.0 / 12
HATCH_Z = LAUNCHER_TOP + (716.0 + 32.8) / 12
UMBILICAL = (0.0, -(37.25 - 8.0 * math.tan(math.radians(20.0))) / 12, LAUNCHER_TOP + (716.0 + 8.0) / 12)
VEHICLE_TIP = LAUNCHER_TOP + 83.38  # escape tower's tip (Hammack & Heberlig, Figure 18)

HARDSTAND = 200.0  # side of the square: OSM outline 195 to 202 ft; TM X-53107 Figure 7-6, 157 px at 1.274 ft/px
CIRCLE_R = 60.5  # the painted circle: 95 px on Figure 7-6 at 1.274 ft/px
# How far concrete, ballast and footings go down. The viewer's terrain is 0.45 m (1.48 ft) under the
# pad's surface, so anything standing on the ground must reach well past it.
FOOTING = 3.0
GROUND = -0.45 / 0.3048  # the viewer's terrain (backdrops.ts: GROUND_Y), in feet under the pad's surface

# The rest of Complex 5/6, in this frame. From OpenStreetMap, which maps what survives (see ../lc-5.md):
PAD6 = (0.0, -520.0)  # pad 6's centre: 519 ft along 025.2 deg; taken on the rails' centre line, 520 ft
# The blockhouse is an arrow: a rectangle 44 ft wide with a right-angled point toward the pads, 90 ft
# from the point to the back wall. The point is 305 ft from pad 5's centre and 304 ft from pad 6's.
BLOCKHOUSE_TIP = (157.3, -261.0)
BLOCKHOUSE_LENGTH, BLOCKHOUSE_HALF = 90.0, 22.0
# The cable trench: its end on the pad (TM X-53107 Figure 7-6), and where it reaches the blockhouse, at
# the pad 5 firing room's corner (the covers that survive run to it; FHSU F16_016 shows pad 6's the same).
TRENCH_END = (51.0, -8.5)
TRENCH_TO = (BLOCKHOUSE_TIP[0] + 19.9, BLOCKHOUSE_TIP[1] + 19.9)

# The track: two pairs of rails, each about standard gauge, their centres about 21 ft apart
# (6100884: fin span 142 px = 12.67 ft, pairs 223 px apart; OpenStreetMap maps two lines 22.3 ft apart).
RAIL_PAIR_X = 10.5  # each pair's centre line, either side of the launcher
GAUGE = 4.71  # 4 ft 8.5 in, between the rails' centres (estimated: the pairs looked standard gauge)
RAIL_TOP = 0.03  # rail heads stand 9 mm proud of the concrete
TRACK_END = 245.0  # the track's far end on the structure's side: past the launch position (Figure 7-6)
TRACK_BACK = -165.0  # how much of the run north toward pad 6 is modelled

# The service structure's node origin is the point on the track's centre line where the vehicle's
# axis is when the structure stands round it. It is built there, round the vehicle, platforms
# closed. Its later positions, along +Y:
STRUCTURE_T55 = 110.0  # "edge of pad" at T-55 min: not dimensioned anywhere; estimated 100 to 120 ft
STRUCTURE_LAUNCH = 173.0  # T-8:45: Figure 7-6's marker at 181 ft, less the 8 ft from this origin to the base's middle

# Work platforms, floor heights. Level 3 (the white room) is anchored to the capsule: its floor at
# the heat shield's plane. The spacing is scaled off Hammack Fig. 22 (S-61-1930) and TM X-53107 Fig. 7-7.
LEVELS = {1: SHIELD_Z - 19.6, 2: SHIELD_Z - 10.9, 3: SHIELD_Z - 0.6, 4: SHIELD_Z + 11.1}
STRUCTURE_TOP = 135.0  # to the crane deck's top rail: LC-26 twin 111 ft 9 in + 23 ft (Noble), COE "140 feet"
PLATFORM_PART = 4.5  # how far each half of a platform slides out, either way, to open (estimated)
MAST_NOTCH = (-8.0, 0.7)  # where the capsule's cable mast stands in the platforms' split, and the cut round it


def ear_clip(pts) -> list[tuple[int, int, int]]:
    """Triangles over a simple polygon given anticlockwise: a deck with notches cut in its edge."""
    idx = list(range(len(pts)))
    tris = []

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def inside(p, a, b, c):
        return cross(a, b, p) >= -1e-9 and cross(b, c, p) >= -1e-9 and cross(c, a, p) >= -1e-9

    while len(idx) > 3:
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = pts[i0], pts[i1], pts[i2]
            if cross(a, b, c) <= 1e-9:
                continue
            if any(inside(pts[j], a, b, c) for j in idx if j not in (i0, i1, i2) and pts[j] not in (a, b, c)):
                continue
            tris.append((i0, i1, i2))
            idx.pop(k)
            break
        else:
            raise ValueError("ear_clip: no ear; is the polygon simple and anticlockwise?")
    tris.append(tuple(idx))
    return tris


def P(x: float, y: float, z: float) -> Vector:
    return Vector((x, y, z)) * FT


def fine() -> bool:
    """Whether to build what only a close look shows: bolts, ribs, tread."""
    return srlib.DETAIL >= 0.5


def materials() -> dict:
    m = material
    return {
        "concrete": m("concrete", (0.46, 0.45, 0.42), 0.0, 0.9),
        "joint": m("concrete-joint", (0.07, 0.07, 0.065), 0.0, 1.0),
        "ballast": m("ballast-gravel", (0.22, 0.21, 0.19), 0.0, 1.0),
        "tie": m("timber-tie", (0.12, 0.09, 0.07), 0.0, 0.9),
        "rail": m("steel-rail", (0.30, 0.25, 0.21), 1.0, 0.55),
        "paint": m("paint-line-yellow", (0.75, 0.42, 0.04), 0.0, 0.6),
        "red": m("paint-structure-red", (0.58, 0.085, 0.025), 0.0, 0.55),
        "white": m("paint-structure-white", (0.78, 0.78, 0.75), 0.0, 0.5),
        "grey": m("paint-structure-grey", (0.25, 0.27, 0.28), 0.1, 0.6),
        "panel": m("paint-panel-turquoise", (0.14, 0.42, 0.42), 0.0, 0.4),
        "deck": m("galvanised-deck", (0.42, 0.43, 0.44), 0.9, 0.6),
        "galv": m("galvanised-steel", (0.5, 0.51, 0.52), 0.9, 0.45),
        "scorched": m("steel-scorched", (0.085, 0.075, 0.07), 0.8, 0.7),
        "black": m("paint-launcher-black", (0.04, 0.04, 0.042), 0.2, 0.7),
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),  # the viewer makes this transparent
        "interior": m("interior-dark", (0.09, 0.09, 0.085), 0.0, 0.9),
        "tyre": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "yellow": m("paint-vehicle-yellow", (0.62, 0.42, 0.03), 0.0, 0.5),
        "orange": m("paint-stripe-orange", (0.7, 0.2, 0.02), 0.0, 0.55),
        "lamp": m("lamp", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.6),
        "cable": m("cable", (0.03, 0.03, 0.03), 0.0, 0.7),
        "chassis": m("steel-chassis", (0.05, 0.05, 0.055), 0.3, 0.7),
        "scorch": m("concrete-scorched", (0.13, 0.12, 0.115), 0.0, 1.0),
        "stain": m("concrete-stained", (0.27, 0.26, 0.24), 0.0, 0.95),
        "blue": m("paint-insignia-blue", (0.03, 0.09, 0.35), 0.0, 0.5),
        "trailer": m("paint-trailer-white", (0.72, 0.72, 0.69), 0.0, 0.55),
        # the blockhouse and what stood round it
        "bunker": m("concrete-painted", (0.66, 0.64, 0.58), 0.0, 0.85),
        "block": m("concrete-block-painted", (0.6, 0.59, 0.54), 0.0, 0.9),
        "tar": m("roof-tar", (0.035, 0.035, 0.035), 0.0, 0.95),
        "shell": m("shell-gravel", (0.47, 0.42, 0.32), 0.0, 1.0),
        "timber": m("timber-pole", (0.13, 0.085, 0.05), 0.0, 0.9),
        "plank": m("timber-plank", (0.38, 0.3, 0.2), 0.0, 0.85),
        "blast": m("steel-blast-door", (0.17, 0.11, 0.085), 0.6, 0.6),
        "frame": m("steel-window-frame", (0.07, 0.075, 0.075), 0.6, 0.55),
        "console": m("paint-console-green", (0.3, 0.36, 0.33), 0.1, 0.5),
        "corrugated": m("galvanised-corrugated", (0.5, 0.51, 0.5), 0.8, 0.5),
        "mesh": m("galvanised-mesh", (0.42, 0.43, 0.42), 0.8, 0.6, double_sided=True),
        "canvas": m("canvas-sandbag", (0.42, 0.38, 0.29), 0.0, 1.0),
        "chrome": m("chrome", (0.75, 0.76, 0.78), 1.0, 0.18),
        "taillamp": m("lamp-tail", (0.45, 0.02, 0.02), 0.0, 0.3),
        "void": m("window-void", (0.02, 0.022, 0.025), 0.0, 0.6),
        "sign": m("paint-sign-white", (0.82, 0.82, 0.8), 0.0, 0.5),
        "signred": m("paint-sign-red", (0.6, 0.05, 0.04), 0.0, 0.5),
        "car-seafoam": m("paint-car-seafoam", (0.33, 0.52, 0.45), 0.3, 0.3),
        "car-cream": m("paint-car-cream", (0.74, 0.7, 0.58), 0.3, 0.3),
        "car-blue": m("paint-car-blue", (0.16, 0.3, 0.48), 0.3, 0.3),
        "car-red": m("paint-car-red", (0.5, 0.06, 0.05), 0.3, 0.3),
        "car-black": m("paint-car-black", (0.03, 0.03, 0.035), 0.3, 0.25),
        "car-white": m("paint-car-white", (0.8, 0.8, 0.77), 0.3, 0.3),
        "car-olive": m("paint-car-olive", (0.2, 0.22, 0.13), 0.1, 0.6),
    }


# ------------------------------------------------------------------------ the pieces


class Parts:
    """Meshes grouped by node and material. A node is an empty whose origin is where it moves
    from (a hinge, an axle, the point it slides with); nodes carry translations only, so a
    child's location is its world origin less its parent's. Geometry is given in site feet and
    moved into its node's frame when built, one mesh per node and material."""

    def __init__(self, M: dict) -> None:
        self.M = M
        self.nodes: dict[str, tuple] = {}
        self.meshes: dict[tuple[str, str], tuple[MeshBuilder, bool]] = {}

    def node(self, name: str, parent: str | None = None, origin=(0.0, 0.0, 0.0)):
        o = Vector(origin)
        obj = group(name, self.nodes[parent][0] if parent else None)
        obj.location = (o - (self.nodes[parent][1] if parent else Vector())) * FT
        self.nodes[name] = (obj, o)
        return obj

    def __call__(self, node: str, mat: str, smooth: bool = False) -> MeshBuilder:
        key = (node, mat)
        if key not in self.meshes:
            self.meshes[key] = (MeshBuilder(), smooth)
        return self.meshes[key][0]

    def shift(self, node: str, d) -> None:
        """Move everything drawn so far for `node` by d (feet): a part built closed and shown open."""
        dx, dy, dz = (v * FT for v in d)
        for (n, _), (mb, _) in self.meshes.items():
            if n == node:
                mb.verts = [(x + dx, y + dy, z + dz) for x, y, z in mb.verts]

    def build(self) -> None:
        for (node, mat), (mb, smooth) in self.meshes.items():
            if not mb.faces:
                continue
            obj, origin = self.nodes[node]
            off = origin * FT
            mb.verts = [(x - off.x, y - off.y, z - off.z) for x, y, z in mb.verts]
            # a key "material/what" lets one node carry two meshes of the same material
            label = "".join(w.capitalize() for w in mat.replace("/", "_").split("_"))
            mb.build(f"{node}_{label}", self.M[mat.split("/")[0]], obj, smooth=smooth, sharp_angle=30 if smooth else None)


# --------------------------------------------------------------------------- helpers


def box(mb: MeshBuilder, lo, hi) -> None:
    """Axis-aligned box from corner to corner, feet."""
    lo, hi = Vector(lo), Vector(hi)
    mb.box(tuple(abs(v) * FT for v in hi - lo), Matrix.Translation((lo + hi) / 2 * FT))


def beam(mb: MeshBuilder, a, b, width: float) -> None:
    """A square steel member between two points, feet."""
    mb.tube(P(*a), P(*b), width / math.sqrt(2) * FT, 4, caps=True)


def axes(origin, x_axis, z_axis) -> Matrix:
    """A frame at `origin` (feet) with local X and Z along the given directions; Y completes it."""
    x, z = Vector(x_axis).normalized(), Vector(z_axis).normalized()
    m = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    m.translation = Vector(origin) * FT
    return m


def ftp(points) -> list:
    """A lathe profile given in feet."""
    return [(r * FT, z * FT) for r, z in points]


def obox(mb: MeshBuilder, centre, x_axis, z_axis, size) -> None:
    """A box of `size` (feet, along its own X, Y, Z) turned to the given axes."""
    mb.box(tuple(v * FT for v in size), axes(centre, x_axis, z_axis))


def plate(mb: MeshBuilder, pts, thickness: float) -> None:
    """A flat plate: a convex polygon (feet, any plane), given thickness about that plane."""
    pts = [Vector(p) for p in pts]
    n = Vector((0, 0, 0))
    for a, b in zip(pts, pts[1:] + pts[:1]):
        n += a.cross(b)
    h = n.normalized() * thickness / 2
    k = len(pts)
    top, bot = [tuple((p + h) * FT) for p in pts], [tuple((p - h) * FT) for p in pts]
    mb.add(top, [tuple(range(k))])
    mb.add(bot, [tuple(reversed(range(k)))])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def hull(mb: MeshBuilder, loops, caps=(True, True)) -> None:
    """A skin over a row of loops (feet), each with the same number of points and running
    anticlockwise seen from the far end. The ends are closed flat."""
    k = len(loops[0])
    verts = [tuple(Vector(p) * FT) for loop in loops for p in loop]
    faces = []
    for s in range(len(loops) - 1):
        for i in range(k):
            j = (i + 1) % k
            faces.append((s * k + i, s * k + j, (s + 1) * k + j, (s + 1) * k + i))
    mb.add(verts, faces)
    if caps[0]:
        mb.add(verts[:k], [tuple(reversed(range(k)))])
    if caps[1]:
        mb.add(verts[-k:], [tuple(range(k))])


def arch(x: float, w: float, zb: float, zt: float, r: float, n: int = 4) -> list:
    """A loop for hull(): flat sides and bottom, the two top corners rounded to radius r; at station x."""
    pts = [(x, w, zb)]
    for cy, a0 in ((w - r, 0.0), (-w + r, math.pi / 2)):
        pts += [(x, cy + r * math.cos(a0 + math.pi / 2 * k / n), zt - r + r * math.sin(a0 + math.pi / 2 * k / n)) for k in range(n + 1)]
    return [*pts, (x, -w, zb)]


def lattice(mb: MeshBuilder, corner, levels, col: float, brace: float, faces=(0, 1, 2, 3)) -> None:
    """A four-legged truss tower. corner(i, z) gives leg i's position at height z."""
    for z0, z1 in zip(levels, levels[1:]):
        for i in range(4):  # a leg is drawn bay by bay, so it follows a tower that changes slope
            beam(mb, corner(i, z0), corner(i, z1), col)
        for i in faces:
            j = (i + 1) % 4
            beam(mb, corner(i, z1), corner(j, z1), brace)
            beam(mb, corner(i, z0), corner(j, z1), brace * 0.8)
            beam(mb, corner(j, z0), corner(i, z1), brace * 0.8)


def truss(mb: MeshBuilder, corner, stations, chord: float, brace: float) -> None:
    """A four-chord box truss with a frame at each station and one diagonal a bay on each face,
    alternating: the zigzag of the mobile tower's mast and jib. corner(i, s) places chord i."""
    for s0, s1 in zip(stations, stations[1:]):
        for i in range(4):
            beam(mb, corner(i, s0), corner(i, s1), chord)
    for s in stations:
        for i in range(4):
            beam(mb, corner(i, s), corner((i + 1) % 4, s), brace)
    for n, (s0, s1) in enumerate(zip(stations, stations[1:])):
        for i in range(4):
            a, b = (i, (i + 1) % 4) if n % 2 == 0 else ((i + 1) % 4, i)
            beam(mb, corner(a, s0), corner(b, s1), brace * 0.85)


def handrail(mb: MeshBuilder, pts, height: float = 3.5, post: float = 0.16, rail: float = 0.13) -> None:
    """Posts and two rails along a polyline of deck-level points."""
    for seg, (a, b) in enumerate(zip(pts, pts[1:])):
        a, b = Vector(a), Vector(b)
        n = max(1, round((b - a).length / 5.0))
        for k in range(1 if seg else 0, n + 1):  # a corner post belongs to the run before it
            p = a + (b - a) * k / n
            beam(mb, p, p + Vector((0, 0, height)), post)
        for h in (height, height * 0.5):
            beam(mb, a + Vector((0, 0, h)), b + Vector((0, 0, h)), rail)


def prism(mb: MeshBuilder, outline, z0: float, z1: float) -> None:
    """A vertical prism over a convex outline (feet, anticlockwise from above)."""
    k = len(outline)
    top = [tuple(P(x, y, z1)) for x, y in outline]
    bot = [tuple(P(x, y, z0)) for x, y in outline]
    mb.add(top, [tuple(range(k))])
    mb.add(bot, [tuple(reversed(range(k)))])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def lamp_head(poles: MeshBuilder, lamps: MeshBuilder, centre, aim, size: float = 0.85) -> None:
    """A floodlight: a reflector bowl and its lens, pointed along `aim`."""
    m = Matrix.Translation(Vector(centre) * FT) @ Vector((0, 0, 1)).rotation_difference(Vector(aim).normalized()).to_matrix().to_4x4()
    poles.lathe([(0.3 * size * FT, -0.8 * size * FT), (size * FT, 0.0)], 14, matrix=m)
    lamps.lathe([(0.96 * size * FT, -0.03 * FT), (0.0, -0.03 * FT)], 14, matrix=m, flip=True)


# ------------------------------------------------------- buildings, paving and what is placed


def offset_poly(pts, d: float) -> list:
    """An outline (anticlockwise) moved outward by d at every side, mitred; negative d moves it in."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        la, lb = math.hypot(p1[0] - p0[0], p1[1] - p0[1]), math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        n1 = ((p1[1] - p0[1]) / la, -(p1[0] - p0[0]) / la)
        n2 = ((p2[1] - p1[1]) / lb, -(p2[0] - p1[0]) / lb)
        k = d / (1.0 + n1[0] * n2[0] + n1[1] * n2[1])
        out.append((p1[0] + (n1[0] + n2[0]) * k, p1[1] + (n1[1] + n2[1]) * k))
    return out


def slab(mb: MeshBuilder, outline, z0: float, z1: float, spread: float = 0.0, bottom: bool = False) -> None:
    """A slab over any simple outline (feet, anticlockwise): paving, a floor, a roof. With `spread`
    its edges are battered, the foot that far outside the top: fill graded down to the ground, which
    is also a ramp on to it. The underside is left off unless asked for: it is in the ground."""
    k = len(outline)
    tris = ear_clip(list(outline))
    foot = offset_poly(outline, spread) if spread else outline
    top = [tuple(P(x, y, z1)) for x, y in outline]
    bot = [tuple(P(x, y, z0)) for x, y in foot]
    mb.add(top, tris)
    if bottom:
        mb.add(bot, [t[::-1] for t in tris])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


class Wall:
    """One side of a building's ring of walls, from outer[i] to outer[i + 1] (feet, anticlockwise),
    mitred to its neighbours at each end. Distances `s` run along its outer face; `depth` is into
    the wall from that face (negative: standing off it outside)."""

    def __init__(self, outer, inner, i: int) -> None:
        j = (i + 1) % len(outer)
        self.a, self.b = Vector(outer[i]), Vector(outer[j])
        self.ia, self.ib = Vector(inner[i]), Vector(inner[j])
        self.length = (self.b - self.a).length
        self.u = (self.b - self.a) / self.length
        self.n = Vector((-self.u.y, self.u.x))  # into the building
        self.thick = (self.ia - self.a).dot(self.n)

    def p(self, s: float, depth: float, z: float) -> tuple:
        q = self.a + self.u * s + self.n * depth
        return (q.x, q.y, z)

    def _plan(self, s: float):
        o = self.a + self.u * s
        if s <= 1e-6:
            return self.a, self.ia
        if s >= self.length - 1e-6:
            return self.b, self.ib
        return o, o + self.n * self.thick

    def build(self, mb: MeshBuilder, z0: float, z1: float, openings=()) -> None:
        """The wall, built round its openings: each (s0, s1, sill, head), in order along it."""

        def piece(s0, s1, za, zb):
            if s1 - s0 < 1e-6 or zb - za < 1e-6:
                return
            (o0, i0), (o1, i1) = self._plan(s0), self._plan(s1)
            prism(mb, [tuple(o0), tuple(o1), tuple(i1), tuple(i0)], za, zb)

        at = 0.0
        for s0, s1, sill, head in openings:
            piece(at, s0, z0, z1)
            piece(s0, s1, z0, sill)
            piece(s0, s1, head, z1)
            at = s1
        piece(at, self.length, z0, z1)

    def box(self, mb: MeshBuilder, s0: float, s1: float, d0: float, d1: float, za: float, zb: float) -> None:
        """A box on the wall: along it from s0 to s1, from depth d0 to d1, between two heights."""
        c = self.a + self.u * ((s0 + s1) / 2) + self.n * ((d0 + d1) / 2)
        obox(mb, (c.x, c.y, (za + zb) / 2), (self.u.x, self.u.y, 0), (0, 0, 1), (s1 - s0, d1 - d0, zb - za))


def ring(outer, thick: float) -> list:
    """The walls of a building whose outline is `outer` (feet, anticlockwise), each `thick` through."""
    inner = offset_poly(outer, -thick)
    return [Wall(outer, inner, i) for i in range(len(outer))]


def window(
    parts: Parts, node: str, w: Wall, s0: float, s1: float, sill: float, head: float, *, mullions=(), bar: float = 0.16, glass_at: float | None = None
) -> None:
    """Glass in an opening, in a steel frame that overlaps the opening's edges."""
    glass, frame = parts(node, "glass"), parts(node, "frame")
    d = w.thick / 2 if glass_at is None else glass_at
    w.box(glass, s0 + 0.01, s1 - 0.01, d - 0.03, d + 0.03, sill + 0.01, head - 0.01)
    d0, d1 = d - 0.12, d + 0.12
    w.box(frame, s0 - 0.04, s0 + bar, d0, d1, sill - 0.04, head + 0.04)
    w.box(frame, s1 - bar, s1 + 0.04, d0, d1, sill - 0.04, head + 0.04)
    w.box(frame, s0 + bar, s1 - bar, d0, d1, sill - 0.04, sill + bar)
    w.box(frame, s0 + bar, s1 - bar, d0, d1, head - bar, head + 0.04)
    for m_ in mullions:
        if isinstance(m_, tuple):  # ("h", height): a transom
            w.box(frame, s0 + bar, s1 - bar, d0 + 0.02, d1 - 0.02, m_[1] - bar / 2, m_[1] + bar / 2)
        else:
            w.box(frame, m_ - bar / 2, m_ + bar / 2, d0 + 0.02, d1 - 0.02, sill + bar, head - bar)


def placed(mb: MeshBuilder, built: MeshBuilder, at, heading: float = 0.0) -> None:
    """Add what was built in a thing's own frame (its +X forward, feet turned to metres already)
    at a place on the site, turned `heading` degrees anticlockwise from the site's +X."""
    m = Matrix.Translation(Vector(at) * FT) @ Matrix.Rotation(math.radians(heading), 4, "Z")
    mb.add(built.verts, built.faces, built.uvs, m)


def stairs(mb: MeshBuilder, foot, top, width: float, *, rise: float = 0.62, tread_t: float = 0.12, stringer: float = 0.75) -> int:
    """A straight flight of open steel stairs from `foot` to `top` (feet; the points are the
    walking line's ends, on the lower floor and the upper): treads between two stringers. Returns
    the number of risers."""
    a, b = Vector(foot), Vector(top)
    run = Vector((b.x - a.x, b.y - a.y, 0.0))
    along = run.normalized()
    side = Vector((-along.y, along.x, 0.0))
    n = max(2, round((b.z - a.z) / rise))
    for k in range(1, n):  # the nth riser lands on the upper floor
        c = a + run * ((k - 0.5) / (n - 1)) + Vector((0, 0, (b.z - a.z) * k / n - tread_t / 2))
        obox(mb, tuple(c), tuple(along), (0, 0, 1), (run.length / (n - 1) + 0.08, width, tread_t))
    for s in (-1, 1):
        lo = a + side * (s * (width / 2 + 0.06)) + Vector((0, 0, 0.1))
        hi = b + side * (s * (width / 2 + 0.06)) + Vector((0, 0, -0.25))
        d = (hi - lo).normalized()
        obox(mb, tuple((lo + hi) / 2), tuple(d), tuple(side), ((hi - lo).length + 0.6, stringer, 0.1))
    return n


def stair_rails(mb: MeshBuilder, foot, top, width: float, height: float = 3.0) -> None:
    """Handrails either side of a flight built by stairs()."""
    a, b = Vector(foot), Vector(top)
    side = Vector((-(b.y - a.y), b.x - a.x, 0.0)).normalized()
    for s in (-1, 1):
        off = side * (s * (width / 2 + 0.06))
        n = max(1, round((b - a).length / 4.5))
        for k in range(n + 1):
            q = a + (b - a) * k / n + off
            beam(mb, tuple(q), tuple(q + Vector((0, 0, height))), 0.13)
        for h in (height, height * 0.5):
            beam(mb, tuple(a + off + Vector((0, 0, h))), tuple(b + off + Vector((0, 0, h))), 0.11)


def timber_pole(
    parts: Parts, node: str, x: float, y: float, height: float, *, lamps: int = 0, aim=None, arm: float = 6.0, ground: float | None = None
) -> None:
    """A creosoted timber pole, tapering, with a crossarm on two braces. With `lamps`, that many
    floodlights stand on the arm, aimed along `aim` (FHSU F16_015 and F16_017, July 1961: two or
    three round floods on each pole at the pad's edge); without, it carries insulators for a line."""
    wood, metal = parts(node, "timber", True), parts(node, "grey/polefittings", True)
    z0 = (GROUND if ground is None else ground) - 2.0
    wood.lathe(ftp([(0.0, z0), (0.55, z0), (0.36, height), (0.0, height)]), 10, matrix=Matrix.Translation(P(x, y, 0)))
    a = Vector(aim if aim is not None else (1, 0, 0))
    a.z = 0
    a.normalize()
    side = Vector((-a.y, a.x, 0))
    c = Vector((x, y, height - 1.6)) + a * 0.45
    obox(wood, tuple(c), tuple(side), (0, 0, 1), (arm, 0.3, 0.38))
    for s in (-1, 1):
        beam(metal, tuple(c + side * (s * arm * 0.36)), (x + a.x * 0.42, y + a.y * 0.42, height - 4.2), 0.1)
    if lamps:
        glow = parts(node, "lamp", True)
        offs = [0.0] if lamps == 1 else [arm * 0.42 * (2 * k / (lamps - 1) - 1) for k in range(lamps)]
        for o in offs:
            q = c + side * o + Vector((0, 0, 0.19))
            beam(metal, tuple(q), tuple(q + Vector((0, 0, 0.7))), 0.12)
            lamp_head(metal, glow, q + Vector((0, 0, 1.25)), a + Vector((0, 0, -0.45)), 0.75)
        # the conduit down the pole to a switch box
        metal.tube(P(x - a.x * 0.5, y - a.y * 0.5, 1.0), P(x - a.x * 0.42, y - a.y * 0.42, height - 2.0), 0.05 * FT, 6)
        obox(metal, (x - a.x * 0.62, y - a.y * 0.62, 4.6), tuple(a), (0, 0, 1), (0.5, 1.0, 1.4))
    elif fine():
        for o in (-arm * 0.42, -arm * 0.16, arm * 0.16, arm * 0.42):
            q = c + side * o + Vector((0, 0, 0.19))
            metal.lathe(ftp([(0.0, 0.0), (0.06, 0.0), (0.06, 0.25), (0.16, 0.3), (0.16, 0.5), (0.0, 0.55)]), 8, matrix=Matrix.Translation(q * FT))
