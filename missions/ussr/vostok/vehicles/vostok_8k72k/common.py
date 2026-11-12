"""What every block of the 8K72K shares: its dimensions, its materials, and a builder in millimetres.

Every dimension is in millimetres. A station `H` is a height above the plane of the main nozzles'
exits, the lowest point of the vehicle. See ../vostok-8k72k.md for what each number rests on:
overall lengths and the three diameters are published; every station between them is estimated.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

from srlib import TAU, MeshBuilder, _segs, deg, frame, group, prof

MM = 0.001

# ------------------------------------------------------------------ dimensions (mm)

LENGTH = 38360.0  # on the pad, with fairing (Minakov; Siddiqi)
SPAN = 10300.0  # over the air rudders
NOZZLES = 600.0  # the main nozzles below each tail's rim: 19.8 m with them less 19.2 m without

# Block A, the core
CORE_TOP = 27490.0  # 28,750 with the lattice, less its 1,260
CORE_R_TAIL = 1025.0  # 2.05 m
CORE_R_MAX = 1475.0  # 2.95 m
CORE_R_TOP = 1290.0  # 2.58 m
CORE_TAPER = 6200.0  # where the tail's cylinder ends, level with the boosters' shoulders
CORE_NECK = 26400.0  # where the upper cone ends
CORE_BAY = 3600.0  # top of the engine bay
CORE_RINGS = 5200.0  # top of the peroxide and nitrogen tanks' bay
CORE_FUEL = (5400.0, 14300.0)
CORE_LOX = (15200.0, 25600.0)

# Blocks B, V, G, D: stations `s` up each block's own axis from its tail's rim
BOOSTER_LENGTH = 19200.0  # without the nozzles
BOOSTER_R = 1340.0  # 2.68 m
BOOSTER_CYL = 5600.0  # the cylinder; a cone from there to the tip
BOOSTER_BASE_R = 2780.0  # the base's centre from the core's axis
BOOSTER_TIP_R = 1520.0  # the tip ball from the core's axis, on its bracket
BOOSTER_TILT = math.asin((BOOSTER_BASE_R - BOOSTER_TIP_R) / BOOSTER_LENGTH)  # 3.76 degrees
BOOSTER_TIP_H = NOZZLES + BOOSTER_LENGTH * math.cos(BOOSTER_TILT)  # 19,759: the core is widest here
BOOSTER_BAY = 1700.0  # top of the engine bay
BOOSTER_FUEL = (2700.0, 5150.0)
BOOSTER_LOX = (5600.0, 17400.0)
BOOSTER_AZ = {"B": 0.0, "V": 90.0, "G": 180.0, "D": 270.0}  # degrees; which block stood where is not known to us
RUDDER_SPAN = SPAN / 2 - BOOSTER_BASE_R - BOOSTER_R  # 1,030 out from the skin

# the lattice, Block E, the fairing
TRUSS_TOP = 28750.0
BLOCK_E_TOP = TRUSS_TOP + 2980.0  # 31,730: the spacecraft's frame rests here
BLOCK_E_R = 1290.0  # 2.58 m
FAIRING_R = 1350.0  # 2.7 m
FAIRING_CYL = 3090.0  # the cylinder, from the fairing's foot
FAIRING_TIP_R = 300.0  # the rounded tip; between it and the cylinder the nose is an ogive
SPACECRAFT_SEAT = 1200.0  # the station of the 3KA that rests on Block E: the aft face of its frame
BASE_Z = SPACECRAFT_SEAT - BLOCK_E_TOP  # the nozzle exits, in the spacecraft's stations: -30,530

# engines
EXIT_R = 360.0  # a main chamber's nozzle exit, 720 mm across
CHAMBER_AT = 445.5  # each main chamber from the engine's axis along both of its axes: 630 mm away, on the diagonals
STEER_EXIT_R = 125.0  # a steering chamber's: 0.35 of a main one's, as 2.5 tf is to a main chamber's share of the thrust


def core_r(h: float) -> float:
    """The core's outer radius at a station."""
    if h <= CORE_TAPER:
        return CORE_R_TAIL
    if h <= BOOSTER_TIP_H:
        return CORE_R_TAIL + (CORE_R_MAX - CORE_R_TAIL) * (h - CORE_TAPER) / (BOOSTER_TIP_H - CORE_TAPER)
    if h <= CORE_NECK:
        return CORE_R_MAX + (CORE_R_TOP - CORE_R_MAX) * (h - BOOSTER_TIP_H) / (CORE_NECK - BOOSTER_TIP_H)
    return CORE_R_TOP


def booster_r(s: float) -> float:
    """A booster's outer radius at a station up its own axis."""
    return BOOSTER_R if s <= BOOSTER_CYL else BOOSTER_R * (BOOSTER_LENGTH - s) / (BOOSTER_LENGTH - BOOSTER_CYL)


def segs(n: int) -> int:
    """Sides for a curve at the build's level of detail, as srlib's own shapes count them."""
    return _segs(n)


def V(x: float, y: float, z: float) -> Vector:
    """Millimetres in, metres out."""
    return Vector((x, y, z)) * MM


def pm(points):
    return prof(points, MM)


def at(x: float, y: float, z: float) -> Matrix:
    """A translation, millimetres in."""
    return Matrix.Translation(V(x, y, z))


def facing(origin, normal) -> Matrix:
    """A frame at `origin` (mm) whose +Z is `normal`."""
    return frame(V(*origin), normal)


def core_frame(base_z: float) -> Matrix:
    """Stations of the vehicle to the scene: `base_z` is the nozzle exits' station in the flight's frame, mm."""
    return at(0, 0, base_z)


def booster_frame(base_z: float, az_deg: float) -> Matrix:
    """A booster's own axes to the scene: +Z up its axis from the middle of its tail's rim, +X away from the core."""
    return Matrix.Rotation(deg(az_deg), 4, "Z") @ at(BOOSTER_BASE_R, 0, base_z + NOZZLES) @ Matrix.Rotation(-BOOSTER_TILT, 4, "Y")


class Local:
    """A MeshBuilder that takes millimetres in a block's own axes and builds in the scene's metres."""

    def __init__(self, x: Matrix) -> None:
        self.mb = MeshBuilder()
        self.x = x
        self.rot = x.to_3x3()

    def lathe(self, points, segs: int = 64, at: Matrix | None = None, **kw) -> None:  # noqa: A002 (reads as "lathe ... at")
        self.mb.lathe(pm(points), segs, matrix=self.x @ at if at is not None else self.x, **kw)

    def tube(self, p0, p1, r: float, segs: int = 12, caps: bool = True) -> None:
        self.mb.tube(self.x @ V(*p0), self.x @ V(*p1), r * MM, segs, caps)

    def disc(self, origin, normal, r: float, h: float, segs: int = 6) -> None:
        self.mb.disc(self.x @ V(*origin), self.rot @ Vector(normal), r * MM, h * MM, segs)

    def box(self, size, at: Matrix) -> None:  # noqa: A002
        self.mb.box([s * MM for s in size], self.x @ at)

    def loft(self, path, radii, segs: int = 16, ref=(0, 1, 0), **kw) -> None:
        self.mb.loft([self.x @ V(*p) for p in path], [(a * MM, b * MM) for a, b in radii], segs, ref=tuple(self.rot @ Vector(ref)), **kw)

    def grid(self, point, us, vs, **kw) -> None:
        self.mb.grid(lambda u, v: tuple(self.x @ V(*point(u, v))), us, vs, **kw)

    def ball(self, centre, r: float, segs: int = 24, rings: int = 12) -> None:
        self.lathe([(r * math.cos(a), r * math.sin(a)) for a in (math.pi * (k / rings - 0.5) for k in range(rings + 1))], segs, at(*centre))

    def torus(self, big: float, a: float, b: float, z: float, segs: int = 64, n: int = 20, power: float = 2.0) -> None:
        """A ring tank about the axis: its section is centred `big` out, `a` wide and `b` tall either way.
        `power` above 2 squares the section's corners."""
        pts = []
        for k in range(n + 1):
            t = TAU * k / n
            c, s = math.cos(t), math.sin(t)
            pts.append((big + a * math.copysign(abs(c) ** (2 / power), c), z + b * math.copysign(abs(s) ** (2 / power), s)))
        self.lathe(pts, segs)

    def plate(self, radius: float, z: float, hole: float, centres, down: bool = True, n: int = 24) -> None:
        """A flat round plate with a round hole for each of four nozzles, one in each quarter: each
        quarter is a strip from its hole's rim to the quarter's own edge, so nothing overlaps."""
        for cx, cy in centres:
            sx, sy = math.copysign(1, cx), math.copysign(1, cy)

            def edge(t, cx=cx, cy=cy, sx=sx, sy=sy):
                dx, dy = math.cos(t), math.sin(t)
                reach = []
                if dx * sx < -1e-9:
                    reach.append(-cx / dx)  # the line between this quarter and the next
                if dy * sy < -1e-9:
                    reach.append(-cy / dy)
                b = cx * dx + cy * dy
                reach.append(-b + math.sqrt(max(0.0, b * b - (cx * cx + cy * cy - radius * radius))))  # the plate's rim
                k = min(reach)
                return cx + dx * k, cy + dy * k

            def point(t, v, cx=cx, cy=cy, edge=edge):
                ex, ey = edge(t)
                hx, hy = cx + hole * math.cos(t), cy + hole * math.sin(t)
                return (hx + (ex - hx) * v, hy + (ey - hy) * v, z)

            self.grid(point, [TAU * i / n for i in range(n)], [0.0, 1.0], closed_u=True, flip=not down)

    def build(self, name: str, mat, parent, **kw) -> bpy.types.Object:
        return self.mb.build(name, mat, parent, **kw)


def pivot(name: str, parent, origin: Vector, **props) -> bpy.types.Object:
    """A node with its origin on a joint (metres): what a `swing` turns about. No rotation of its own."""
    obj = group(name, parent, **props)
    obj.location = origin
    return obj


def hang(obj: bpy.types.Object, on: bpy.types.Object) -> bpy.types.Object:
    """Make a mesh built in the scene's axes a child of a pivot without moving it."""
    obj.data.transform(Matrix.Translation(-on.location))
    obj.parent = on
    return obj


def fin(mb: Local, outline, thick_root: float, thick_tip: float, r_root: float, r_tip: float, m: Matrix) -> None:
    """A flat tapered surface: `outline` is (r, z) points in its own plane, which `m` stands on the block."""
    half = lambda r: (thick_root + (thick_tip - thick_root) * (r - r_root) / (r_tip - r_root)) / 2  # noqa: E731
    n = len(outline)
    verts, faces = [], []
    for side in (1, -1):
        base = len(verts)
        verts += [(r, side * half(r), z) for r, z in outline]
        idx = list(range(base, base + n))
        faces.append(tuple(idx if side == -1 else reversed(idx)))
    for i in range(n):  # edge faces, with their own corners so that they shade flat
        (r0, z0), (r1, z1) = outline[i], outline[(i + 1) % n]
        base = len(verts)
        verts += [(r0, half(r0), z0), (r1, half(r1), z1), (r1, -half(r1), z1), (r0, -half(r0), z0)]
        faces.append((base, base + 1, base + 2, base + 3))
    mb.mb.add([tuple(v) for v in verts], faces, None, mb.x @ m @ Matrix.Scale(MM, 4))


def materials() -> dict:
    """Named as the viewer keys on them. Colours are judged from film stills and are estimates."""
    from srlib import material as m

    return {
        "lacquer": m("paint-booster-greygreen", (0.19, 0.235, 0.20), 0.1, 0.55),
        "frost": m("frost-lox", (0.90, 0.93, 0.96), 0.0, 0.95),
        "pale": m("paint-booster-palegrey", (0.56, 0.58, 0.56), 0.1, 0.5),
        "shield": m("steel-polished", (0.66, 0.66, 0.64), 1.0, 0.22),
        "wall": m("aluminium-inner", (0.50, 0.51, 0.50), 0.9, 0.7),
        "alu": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "tank": m("aluminium-tank", (0.60, 0.60, 0.59), 1.0, 0.4),
        "inner": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "engine": m("engine-steel", (0.30, 0.29, 0.28), 1.0, 0.42),
        "bell": m("engine-bell", (0.42, 0.36, 0.30), 1.0, 0.38),
        "liner": m("chamber-liner", (0.34, 0.24, 0.18), 1.0, 0.45),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "dark": m("heatshield-dark", (0.07, 0.065, 0.06), 0.4, 0.7),
        "deflector": m("deflector-brown", (0.13, 0.085, 0.06), 0.2, 0.8),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "pipe": m("steel-pipe", (0.40, 0.40, 0.41), 1.0, 0.5),
    }


def reuse(mats: dict) -> dict:
    """Use a material already in the scene where the names match, so the GLB has one of each."""
    out = {}
    for key, mat in mats.items():
        first = bpy.data.materials.get(mat.name.split(".")[0])
        if first is not None and first is not mat:
            bpy.data.materials.remove(mat)
            mat = first
        out[key] = mat
    return out
