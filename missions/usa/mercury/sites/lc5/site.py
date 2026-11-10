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
    mb.box(tuple((hi - lo) * FT), Matrix.Translation((lo + hi) / 2 * FT))


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
