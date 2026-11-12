"""space-race Blender helpers: procedural, to-scale spacecraft geometry.

Conventions
- Units are metres. Source drawings are in inches; multiply by IN.
- +Z is the vehicle's long axis, nose up (launch attitude). glTF export turns that into +Y.
- Surfaces of revolution take a profile of (r, z) points. Walk the profile with the
  material on your LEFT (bottom centre -> outward -> up -> inward) and normals face out.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import math
import os
import re
import sys
from collections.abc import Callable, Sequence

import bmesh
import bpy
from mathutils import Matrix, Vector

IN = 0.0254
FT = 0.3048
CM = 0.01
TAU = math.tau

Vec3 = tuple[float, float, float]

# Level of detail, set by `--detail` (run()). 1.0 is the inventory model. Lower values thin
# every curve and, under 0.5, leave out fasteners: the same script builds the game's far LODs.
DETAIL = 1.0


def interior() -> bool:
    """Whether to build what is only seen in a cutaway: crew, equipment, tank internals."""
    return DETAIL >= 0.75


def _segs(n: int) -> int:
    """Sides for a curve at this level of detail. Eight or fewer is a shape (a square beam, a hex
    nut), not a curve, so it is kept; a curve is thinned but never below eight or above what was asked."""
    return n if DETAIL >= 1.0 or n <= 8 else min(n, max(8, round(n * DETAIL)))


# --------------------------------------------------------------------------- scene


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def group(name: str, parent: bpy.types.Object | None = None, **props) -> bpy.types.Object:
    """An empty that becomes a named glTF node. Custom props export as node extras."""
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    for key, value in props.items():
        obj[key] = value
    return obj


# ----------------------------------------------------------------------- materials


def material(
    name: str,
    color: Sequence[float],
    metallic: float = 0.0,
    roughness: float = 0.5,
    *,
    emission: Sequence[float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
    double_sided: bool = False,
    image: bpy.types.Image | None = None,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    with contextlib.suppress(Exception):
        mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        nodes.clear()
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        out = nodes.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (*color[:3], 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if image is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    mat.use_backface_culling = not double_sided
    if alpha < 1.0:
        mat.surface_render_method = "BLENDED"
    return mat


# ------------------------------------------------------------------------- builder


def basis(normal: Vector) -> tuple[Vector, Vector, Vector]:
    """Right-handed (t1, t2, n) with n along `normal`."""
    n = Vector(normal).normalized()
    ref = Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))
    t1 = ref.cross(n).normalized()
    t2 = n.cross(t1)
    return t1, t2, n


def frame(origin: Sequence[float], normal: Sequence[float]) -> Matrix:
    """Matrix taking local +Z to `normal` at `origin`."""
    t1, t2, n = basis(Vector(normal))
    m = Matrix((t1, t2, n)).transposed().to_4x4()
    m.translation = Vector(origin)
    return m


class MeshBuilder:
    """Accumulates geometry so a part with thousands of bolts is still one mesh."""

    def __init__(self) -> None:
        self.verts: list[Vec3] = []
        self.faces: list[tuple[int, ...]] = []
        self.uvs: list[tuple[float, float]] = []  # per vertex

    def add(self, verts, faces, uvs=None, matrix: Matrix | None = None) -> None:
        base = len(self.verts)
        if matrix is not None:
            verts = [tuple(matrix @ Vector(v)) for v in verts]
        self.verts.extend(tuple(v) for v in verts)
        self.faces.extend(tuple(base + i for i in f) for f in faces)
        self.uvs.extend(uvs if uvs is not None else [(0.0, 0.0)] * len(verts))

    # -- parametric grid ---------------------------------------------------------

    def grid(
        self,
        point: Callable[[float, float], Sequence[float]],
        us: Sequence[float],
        vs: Sequence[float],
        *,
        closed_u: bool = False,
        uv: Callable[[float, float], tuple[float, float]] | None = None,
        matrix: Matrix | None = None,
        flip: bool = False,
    ) -> None:
        """Quad grid over point(u, v). Normal is d/du x d/dv."""
        nu, nv = len(us), len(vs)
        verts = [tuple(point(u, v)) for v in vs for u in us]
        uvs = [uv(u, v) if uv else (u, v) for v in vs for u in us]
        faces = []
        cols = nu if closed_u else nu - 1
        for j in range(nv - 1):
            for i in range(cols):
                a = j * nu + i
                b = j * nu + (i + 1) % nu
                c = (j + 1) * nu + (i + 1) % nu
                d = (j + 1) * nu + i
                faces.append((a, d, c, b) if flip else (a, b, c, d))
        self.add(verts, faces, uvs, matrix)

    def lathe(
        self,
        profile: Sequence[tuple[float, float]],
        segs: int = 64,
        *,
        matrix: Matrix | None = None,
        arc: tuple[float, float] = (0.0, TAU),
        flip: bool = False,
    ) -> None:
        """Revolve an (r, z) profile about local Z. UVs are in metres (arc, path)."""
        segs = _segs(segs)
        full = abs((arc[1] - arc[0]) - TAU) < 1e-6
        n = segs if full else segs + 1
        us = [arc[0] + (arc[1] - arc[0]) * i / segs for i in range(n)]
        path = [0.0]
        for (r0, z0), (r1, z1) in zip(profile, profile[1:]):
            path.append(path[-1] + math.hypot(r1 - r0, z1 - z0))
        rmax = max(r for r, _ in profile) or 1.0
        vs = list(range(len(profile)))

        def pt(u, j):
            r, z = profile[j]
            return (r * math.cos(u), r * math.sin(u), z)

        self.grid(pt, us, vs, closed_u=full, uv=lambda u, j: (u * rmax, path[j]), matrix=matrix, flip=flip)

    def tube(self, p0, p1, radius: float, segs: int = 12, caps: bool = True) -> None:
        p0, p1 = Vector(p0), Vector(p1)
        length = (p1 - p0).length
        prof = [(radius, 0.0), (radius, length)]
        if caps:
            prof = [(0.0, 0.0), *prof, (0.0, length)]
        self.lathe(prof, segs, matrix=frame(p0, p1 - p0))

    def disc(self, origin, normal, radius: float, height: float, segs: int = 6) -> None:
        """A capped stub: bolt heads, rivets, port covers. Left out below detail 0.5."""
        if DETAIL < 0.5:
            return
        self.lathe([(radius, 0.0), (radius, height), (0.0, height)], segs, matrix=frame(origin, normal))

    def box(self, size: Sequence[float], matrix: Matrix) -> None:
        sx, sy, sz = (s / 2 for s in size)
        v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
        f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        # split verts per face so the box shades flat
        verts, faces = [], []
        for face in f:
            faces.append(tuple(range(len(verts), len(verts) + 4)))
            verts.extend(v[i] for i in face)
        self.add(verts, faces, None, matrix)

    def ribbon(self, path: Sequence[Sequence[float]], side: Sequence[float], width: float) -> None:
        """A flat strap following `path`, `width` wide along `side`. Use a double-sided material."""
        s = Vector(side).normalized() * (width / 2)
        verts, uvs, d = [], [], 0.0
        prev = Vector(path[0])
        for p in path:
            p = Vector(p)
            d += (p - prev).length
            prev = p
            verts += [tuple(p - s), tuple(p + s)]
            uvs += [(0.0, d), (width, d)]
        faces = [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(len(path) - 1)]
        self.add(verts, faces, uvs)

    def loft(
        self,
        path: Sequence[Sequence[float]],
        radii: Sequence[tuple[float, float]],
        segs: int = 24,
        *,
        ref: Sequence[float] = (0, 1, 0),
        resample: int = 5,
        ripple: Callable[[float, float], float] | None = None,
        caps: tuple[bool, bool] = (True, True),
    ) -> None:
        """An elliptical tube along a smoothed path: limbs, hoses, anything grown rather than turned.

        radii[i] = (a, b): `a` across the path along ref x tangent, `b` along the remaining axis.
        ripple(s, theta) scales the radius, s running 0..1 along the path: folds and wrinkles."""
        pts = [Vector(p) for p in path]
        n = len(pts)
        segs = _segs(segs)

        def cr(seq, i, t):  # Catmull-Rom through seq[i]..seq[i+1]
            p0, p1, p2, p3 = (seq[max(0, min(n - 1, k))] for k in (i - 1, i, i + 1, i + 2))
            return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t**3)

        ra = [Vector((a, b, 0)) for a, b in radii]
        centres, rads = [], []
        for i in range(n - 1):
            for k in range(resample):
                centres.append(cr(pts, i, k / resample))
                rads.append(cr(ra, i, k / resample))
        centres.append(pts[-1])
        rads.append(ra[-1])
        m = len(centres)
        r = Vector(ref)
        frames = []
        for i in range(m):
            t = (centres[min(m - 1, i + 1)] - centres[max(0, i - 1)]).normalized()
            side = r.cross(t)
            side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
            frames.append((side, t.cross(side)))
        rows = list(range(m))
        scale = [1.0] * m
        if caps[0]:
            rows.insert(0, 0)
            scale.insert(0, 0.0)
        if caps[1]:
            rows.append(m - 1)
            scale.append(0.0)
        us = [TAU * i / segs for i in range(segs)]
        length = [0.0]
        for a, b in zip(centres, centres[1:]):
            length.append(length[-1] + (b - a).length)

        def pt(u, j):
            i = rows[j]
            side, other = frames[i]
            k = scale[j] * (1.0 + (ripple(i / (m - 1), u) if ripple else 0.0))
            return centres[i] + side * (rads[i].x * k * math.cos(u)) + other * (rads[i].y * k * math.sin(u))

        self.grid(pt, us, range(len(rows)), closed_u=True, uv=lambda u, j: (u * max(rads[rows[j]].x, 1e-4), length[rows[j]]))

    # -- output ------------------------------------------------------------------

    def build(
        self,
        name: str,
        mat: bpy.types.Material,
        parent: bpy.types.Object | None = None,
        *,
        smooth: bool = True,
        sharp_angle: float | None = 40.0,
    ) -> bpy.types.Object:
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        uv_layer = mesh.uv_layers.new(name="UVMap")
        for loop in mesh.loops:
            uv_layer.data[loop.index].uv = self.uvs[loop.vertex_index]
        if smooth:
            mesh.shade_smooth()
            if sharp_angle is not None:
                mesh.set_sharp_from_angle(angle=math.radians(sharp_angle))
        mesh.materials.append(mat)
        mesh.validate()
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj.parent = parent
        return obj


def lathe_obj(name, profile, mat, parent=None, segs=96, **kw) -> bpy.types.Object:
    mb = MeshBuilder()
    mb.lathe(profile, segs)
    return mb.build(name, mat, parent, **kw)


def arc_profile(cx: float, cz: float, radius: float, a0: float, a1: float, n: int = 12):
    """(r, z) points on a circle in the profile plane; angles in degrees from +r toward +z."""
    return [
        (cx + radius * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + radius * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
        for i in range(n + 1)
    ]


def text_mesh(body: str, size: float, font: bpy.types.VectorFont | None = None, cuts: int = 3):
    """Flat text as (verts, faces) in the XY plane, origin at left baseline.

    Faces are triangulated and each edge cut `cuts` times: a letter wrapped round a cylinder
    must bend with it, or the middle of every stroke sinks under the skin."""
    curve = bpy.data.curves.new("txt", "FONT")
    curve.body = body
    curve.size = size
    curve.resolution_u = 3
    if font is not None:
        curve.font = font
    obj = bpy.data.objects.new("txt", curve)
    bpy.context.scene.collection.objects.link(obj)
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    if cuts:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()
    verts = [tuple(v.co) for v in mesh.vertices]
    faces = [tuple(p.vertices) for p in mesh.polygons]
    bpy.data.objects.remove(obj)
    bpy.data.curves.remove(curve)
    bpy.data.meshes.remove(mesh)
    return verts, faces


# ------------------------------------------------------- surfaces in drawing units


def prof(points, unit: float = IN):
    """A profile in drawing units (inches by default), converted to metres."""
    return [(r * unit, z * unit) for r, z in points]


def deg(d: float) -> float:
    return math.radians(d)


class Surf:
    """A cone or cylinder about Z: points, normals, and offsets along the normal."""

    def __init__(self, r0: float, z0: float, half_angle: float) -> None:
        self.r0, self.z0, self.a = r0, z0, half_angle

    def r(self, z: float) -> float:
        return self.r0 - (z - self.z0) * math.tan(self.a)

    def n(self, theta: float) -> Vector:
        ca = math.cos(self.a)
        return Vector((ca * math.cos(theta), ca * math.sin(theta), math.sin(self.a)))

    def p(self, theta: float, z: float, off: float = 0.0) -> Vector:
        """Inches in, metres out."""
        r = self.r(z)
        return (Vector((r * math.cos(theta), r * math.sin(theta), z)) + off * self.n(theta)) * IN

    def frame(self, theta: float, z: float, off: float = 0.0) -> Matrix:
        return frame(self.p(theta, z, off), self.n(theta))

    def wrap(self, theta0: float, z0: float, a: float, b: float, off: float) -> Vector:
        """Lay a flat decal on the surface: `a` inches to the right, `b` inches up the slant."""
        z = z0 + b * math.cos(self.a)
        return self.p(theta0 + a / self.r(z), z, off)


def decal(mb: MeshBuilder, surf: Surf, theta0: float, z0: float, verts, faces, vertical: bool, off=0.3) -> None:
    """Paint flat XY geometry (inches) onto a surface. `vertical` text reads nose-ward."""
    out = []
    for x, y, _ in verts:
        a, b = (-y, x) if vertical else (x, y)
        out.append(tuple(surf.wrap(theta0, z0, a, b, off)))
    mb.add(out, faces)


def lettering(mb: MeshBuilder, surf: Surf, body: str, length: float, theta0: float, z0: float, vertical: bool, font) -> None:
    verts, faces = text_mesh(body, 1.0, font)
    xs, ys = [v[0] for v in verts], [v[1] for v in verts]
    scale = length / (max(xs) - min(xs))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    verts = [((x - cx) * scale, (y - cy) * scale, 0.0) for x, y, _ in verts]
    decal(mb, surf, theta0, z0, verts, faces, vertical)


def mark_shells(names: Sequence[str]) -> None:
    """Flag the meshes that enclose something. The viewer's cutaway slices these and nothing else,
    so what is inside is seen whole. The flag travels as a glTF extra (`userData.shell`)."""
    missing = [n for n in names if n not in bpy.data.objects]
    # a shell that is itself interior (a chamber liner, a compartment wall) is not built at low detail
    if missing and interior():
        raise KeyError(f"mark_shells: no such mesh: {', '.join(missing)}")
    for n in names:
        if n in missing:
            continue
        bpy.data.objects[n]["shell"] = 1


def ladder(
    name: str,
    foot: Sequence[float],
    top: Sequence[float],
    mat: bpy.types.Material,
    parent: bpy.types.Object | None = None,
    *,
    face: Sequence[float] = (1.0, 0.0, 0.0),
    width: float = 0.45,
    spacing: float = 0.3,
    rail: float = 0.045,
    rung: float = 0.025,
    proud: float = 1.0,
    origin: Sequence[float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    """A fixed ladder, as its own object, which the viewer lets a walker climb.

    `foot` and `top` are the middle of the bottom and of the top of the run (metres, the scene's
    axes): the floor it stands on and the floor it reaches. One call is one run, vertical or
    nearly so; a tall climb with a landing part-way is two. `face` is the horizontal direction
    the climber looks while on it; the rungs lie across that. `origin` is the parent's place in
    the scene, taken off every vertex, as for any mesh hung on a node.

    The contract with the viewer (walk mode) is the custom property `climb`, which travels as a
    glTF extra like `shell` does: the walker climbs anything so marked, inside its bounding box.
    It knows the ladder only by that box (foot, top, and which way is thin: the thin way is the
    side it is climbed from), so nothing but stringers and rungs belongs in this object: no cage,
    no stand-offs, no landing. The stringers stand `proud` of the top floor (a metre, as real ones
    do), which is also what lets a walker on that floor find the ladder to go down. It also needs a floor within 0.3 m of the
    run's top and 0.6 m of clear standing room at each end; that is the caller's to provide."""
    a, b = Vector(foot), Vector(top)
    up = b - a
    f = Vector((face[0], face[1], 0.0)).normalized()
    side = Vector((0.0, 0.0, 1.0)).cross(f).normalized() * (width / 2)
    o = Vector(origin)
    mb = MeshBuilder()
    head = b + up.normalized() * proud  # the stringers stand proud of the floor they reach, to be held on the way off
    for s in (-1.0, 1.0):
        mb.tube(a + side * s - o, head + side * s - o, rail / 2 * math.sqrt(2), 4)
    step = spacing if DETAIL >= 0.5 else spacing * 2
    n = max(1, int(up.length / step))
    for k in range(1, n + 1):
        c = a + up * (k * step / up.length) - o
        if (c + o - a).length > up.length - 0.05:
            break
        mb.tube(c - side, c + side, rung / 2 * math.sqrt(2), 4, caps=False)
    obj = mb.build(name, mat, parent, smooth=False)
    obj["climb"] = 1
    return obj


def bore(names: Sequence[str], matrix: Matrix, radius: float, depth: float) -> None:
    """Cut a round hole through the named meshes: a window is an opening, not a dark disc.
    The hole's axis is the local Z of `matrix` (metres); it reaches `depth` either way along it.

    Not a boolean: these skins are open surfaces, and a boolean takes a lathe with bulkheads for
    a solid and leaves the hole a floor. Instead the faces round the hole are divided until they
    are small, those inside it are removed, and the rim left behind is drawn onto the circle.
    Whatever frames the window (a bezel, a sleeve) should overlap that rim by a few millimetres."""
    inv = matrix.inverted()
    centre = matrix.translation
    for name in names:
        obj = bpy.data.objects[name]
        to_hole = inv @ obj.matrix_world
        bm = bmesh.new()
        bm.from_mesh(obj.data)

        def polar(co, to_hole=to_hole):
            c = to_hole @ co
            return math.hypot(c.x, c.y), c.z

        def passes(e, to_world=obj.matrix_world):  # whether an edge runs near the hole, wherever its ends are
            a, b = to_world @ e.verts[0].co, to_world @ e.verts[1].co
            ab = b - a
            k = max(0.0, min(1.0, (centre - a).dot(ab) / max(ab.length_squared, 1e-12)))
            return (a + ab * k - centre).length < radius * 1.5

        for _ in range(7):
            long = [e for e in bm.edges if e.calc_length() > radius * 0.16 and passes(e)]
            if not long:
                break
            bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
        inside = [f for f in bm.faces if (lambda rz: rz[0] < radius * 1.03 and abs(rz[1]) < depth)(polar(f.calc_center_median()))]
        rim = {v for f in inside for v in f.verts}  # only what the hole touched: a panel's own edge stays put
        bmesh.ops.delete(bm, geom=inside, context="FACES")
        # a face left with every corner on the rim would be folded flat along the circle: it goes too
        slivers = [f for f in bm.faces if all(v in rim for v in f.verts)]
        bmesh.ops.delete(bm, geom=slivers, context="FACES")
        from_hole = to_hole.inverted()
        for v in rim:
            if not v.is_valid:
                continue
            r, z = polar(v.co)
            if r > 1e-9:
                c = to_hole @ v.co
                v.co = from_hole @ Vector((c.x * radius / r, c.y * radius / r, c.z))
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()


# ----------------------------------------------------------------------- clearance

MIN_GAP = 0.001  # metres. The viewer keeps depth resolution under a third of this (stage.ts: fitDepth).


def check_clearance(min_gap: float = MIN_GAP) -> list[str]:
    """Find faces that would z-fight: parallel, facing the same way, overlapping, under `min_gap` apart.

    Two such faces land on the same depth value and the renderer picks between them per pixel,
    per frame: the surface flickers. Every triangle in the scene fires short rays along its
    normal from four points; a hit on a nearly parallel face inside `min_gap` is a violation.
    Faces that cross at an angle are fine (they meet in a line), and so are single-sided faces
    back to back or face to face (only one of the two is ever drawn).

    Returns one line per offending pair of objects, worst first; empty means clean."""
    from mathutils.bvhtree import BVHTree

    verts: list[Vector] = []
    tris: list[tuple[int, int, int]] = []
    owner: list[int] = []
    objs = [o for o in bpy.data.objects if o.type == "MESH"]
    two_sided = []
    for oi, obj in enumerate(objs):
        mesh = obj.data
        mesh.calc_loop_triangles()
        base = len(verts)
        mw = obj.matrix_world
        verts.extend(mw @ v.co for v in mesh.vertices)
        tris.extend((base + t.vertices[0], base + t.vertices[1], base + t.vertices[2]) for t in mesh.loop_triangles)
        owner.extend([oi] * len(mesh.loop_triangles))
        two_sided.append(not mesh.materials[0].use_backface_culling)
    tree = BVHTree.FromPolygons(verts, tris, epsilon=0.0)
    normals = []
    for a, b, c in tris:
        n = (verts[b] - verts[a]).cross(verts[c] - verts[a])
        normals.append(n.normalized() if n.length > 1e-12 else None)

    eps = 2e-6
    found: dict[tuple[str, str], list[tuple[float, Vector]]] = {}
    weights = ((1 / 3, 1 / 3, 1 / 3), (0.6, 0.2, 0.2), (0.2, 0.6, 0.2), (0.2, 0.2, 0.6))
    for ti, (a, b, c) in enumerate(tris):
        n = normals[ti]
        if n is None:
            continue
        for wa, wb, wc in weights:
            p = verts[a] * wa + verts[b] * wb + verts[c] * wc
            for sign in (1.0, -1.0):
                hit, _hn, hi, dist = tree.ray_cast(p + n * (sign * eps), n * sign, min_gap)
                if hit is None or hi == ti or normals[hi] is None:
                    continue
                d = n.dot(normals[hi])
                if abs(d) < 0.97:
                    continue  # crossing, not coplanar
                both = two_sided[owner[ti]] or two_sided[owner[hi]]
                if d < 0 and not both:
                    continue  # back to back or face to face: never both drawn
                key = tuple(sorted((objs[owner[ti]].name, objs[owner[hi]].name)))
                found.setdefault(key, []).append((dist + eps, p.copy()))
    out = []
    for key, hits in sorted(found.items(), key=lambda kv: min(h[0] for h in kv[1])):
        gap, at = min(hits, key=lambda h: h[0])
        out.append(f"{key[0]} / {key[1]}: {len(hits)} samples, closest {gap * 1000:.2f} mm at ({at.x:.3f}, {at.y:.3f}, {at.z:.3f}) m")
    return out


# ---------------------------------------------------------------- figures that move

# A figure the viewer can animate carries these joints, by these names, each hanging from the
# one beside it: this is the whole contract, the same for every crew figure. In Blender a joint
# is a bone of the figure's armature; in the GLB it is a node of the skin. Each has its origin
# on the anatomical joint and, at rest, the model's own axes (in the file: +X the figure's left,
# +Y up, +Z the way it faces; no rotation), so turning any of them about its local X swings what
# hangs from it forward and back: a positive turn takes a hanging limb backward.
FIGURE = {
    "Hips": None,
    "Spine": "Hips",
    "Head": "Spine",
    "UpperArm.L": "Spine",
    "LowerArm.L": "UpperArm.L",
    "Hand.L": "LowerArm.L",
    "UpperArm.R": "Spine",
    "LowerArm.R": "UpperArm.R",
    "Hand.R": "LowerArm.R",
    "UpperLeg.L": "Hips",
    "LowerLeg.L": "UpperLeg.L",
    "Foot.L": "LowerLeg.L",
    "UpperLeg.R": "Hips",
    "LowerLeg.R": "UpperLeg.R",
    "Foot.R": "LowerLeg.R",
}


def skeleton(
    joints: dict[str, Sequence[float]], name: str = "Skeleton", hinges: dict[str, tuple[str, Sequence[float], Sequence[float]]] | None = None
) -> bpy.types.Object:
    """The armature of a figure: one bone for each joint of FIGURE, its head at `joints[name]`
    (metres, the scene's axes). The figure must be modelled upright (+Z up), facing -Y, its left
    toward +X. A bone is a stub standing straight up, rolled so that its own X is the scene's:
    that is what leaves every joint in the GLB without a rotation of its own.

    `hinges` adds joints a figure has beyond those: {name: (parent, where, axis)}. Such a joint
    turns about one line, `axis`, which is made its own X; so unlike the others it has a rotation
    at rest, and is turned from there about its own X (a hand's `Fingers.L`: positive closes)."""
    missing = [j for j in FIGURE if j not in joints]
    if missing:
        raise KeyError(f"skeleton: no position for {', '.join(missing)}")
    data = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    for joint, parent in FIGURE.items():
        bone = data.edit_bones.new(joint)
        bone.head = Vector(joints[joint])
        bone.tail = bone.head + Vector((0.0, 0.0, 0.05))
        bone.align_roll(Vector((0.0, -1.0, 0.0)))
        if parent:
            bone.parent = data.edit_bones[parent]
    for joint, (parent, where, axis) in (hinges or {}).items():
        x = Vector(axis).normalized()
        down = Vector((0.0, 0.0, -1.0))
        y = (down - x * down.dot(x)).normalized()  # the stub hangs down, square to its hinge
        bone = data.edit_bones.new(joint)
        bone.head = Vector(where)
        bone.tail = bone.head + y * 0.03
        bone.align_roll(x.cross(y))
        bone.parent = data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    return obj


def anchor(
    name: str,
    parent: bpy.types.Object | None,
    at: Sequence[float],
    z_axis: Sequence[float] = (0, 0, 1),
    y_axis: Sequence[float] = (0, 1, 0),
    *,
    bone: str | None = None,
    **props,
) -> bpy.types.Object:
    """A named point with a direction, for the viewer to hang or aim things by: where a hose
    leaves a case, where it enters a suit. An empty at `at` (metres, the scene's axes) whose own
    +Z is `z_axis` and whose +Y is as near `y_axis` as that allows. With `bone`, `parent` is a
    skeleton and the anchor rides on that joint. `props` travel as the node's extras.
    In the GLB, and so in three.js, Blender's +Z is the node's +Y and Blender's +Y its -Z."""
    obj = group(name, parent, **props)
    if bone:
        obj.parent_type = "BONE"
        obj.parent_bone = bone
    z = Vector(z_axis).normalized()
    y = Vector(y_axis)
    y = (y - z * y.dot(z)).normalized()
    m = Matrix((y.cross(z), y, z)).transposed().to_4x4()
    m.translation = Vector(at)
    bpy.context.view_layer.update()
    obj.matrix_world = m
    return obj


def grip(rig: bpy.types.Object, bone: str, name: str, at: Sequence[float], along: Sequence[float]) -> bpy.types.Object:
    """Where a hand holds a handle: an anchor on a hand's joint, upright in the rest pose, its
    +Y (Blender) along the line a handle lies on across the closed fingers. A carried thing is
    built the same way round: its node's origin at the middle of its handle, the handle along its
    own Y, itself hanging below along -Z. Made a child of the grip with no transform of its own,
    it is then in the hand. (In three.js terms: handle along the node's Z, hanging along -Y.)"""
    y = Vector(along)
    y.z = 0.0
    return anchor(name, rig, at, (0, 0, 1), y, bone=bone)


def bind(obj: bpy.types.Object, rig: bpy.types.Object, weights: Sequence[dict[str, float]]) -> None:
    """Hang a mesh on a skeleton: `weights[i]` says how much of vertex i follows each joint
    (they are scaled to add up to one; at most four joints a vertex, which is all a GLB carries).
    The mesh stays where it is in the scene and under its own parent, so a part is still a part,
    but once it is skinned the viewer places it by its joints, not by its node: a skinned part
    cannot also be moved as a node (no exploded view of a figure)."""
    if len(weights) != len(obj.data.vertices):
        raise ValueError(f"bind: {obj.name} has {len(obj.data.vertices)} vertices and {len(weights)} weights")
    groups: dict[str, bpy.types.VertexGroup] = {}
    for i, w in enumerate(weights):
        w = {j: x for j, x in w.items() if x > 1e-3}
        total = sum(w.values())
        if not w or len(w) > 4:
            raise ValueError(f"bind: vertex {i} of {obj.name} follows {len(w)} joints")
        for joint, x in w.items():
            if joint not in rig.data.bones:
                raise KeyError(f"bind: {joint} is not a joint of {rig.name}")
            if joint not in groups:
                groups[joint] = obj.vertex_groups.new(name=joint)
            groups[joint].add([i], x / total, "REPLACE")
    obj.modifiers.new(rig.name, "ARMATURE").object = rig


# -------------------------------------------------------------------------- export

# Joining static meshes for the export: one mesh is one draw call in the viewer, and one more in
# every shadow-map redraw, so meshes nobody can tell apart are exported as one.
#
# The rule. The tree of nodes is never touched: every empty stays, with its name, transform and
# extras, because every empty is something the viewer may ask for (a part, a `label` it names
# under the pointer, a place in the surroundings, a pivot that a move, a door, a lift or a wheel
# turns on). Only meshes are joined, and only with their siblings: two meshes are joined when
# they hang on the same parent, have the same material, and each of them is static and anonymous,
# which is all of:
#   - its origin is its parent's (no transform of its own: a mesh given an origin was given a pivot);
#   - it has no children, no armature, vertex groups or shape keys, is not hung on a bone, and its
#     mesh data is not shared with another object (a figure's skin and an instance are left alone);
#   - it has one material, and that is not one the viewer treats mesh by mesh: `glass...` (each
#     pane is a mesh: stage.ts `panes` takes one window from each), `lamp...` (lamps.ts finds
#     fittings from the vertices of each lens mesh), `concrete-scorch/stain...` (surface.ts gives
#     each mark its own blended material) and anything blended (drawn in order, mesh by mesh);
#   - it has no custom property (they are glTF extras, and each is a mark the viewer reads off
#     that mesh: `climb`, `label`, `about`, `lens_out`, `candela`, `door`, `lift`, `lever`...).
#     The one exception is `shell`, which only says "the cutaway clips me": shells are joined
#     with shells that carry the same value, and the joined mesh carries it;
#   - its name is not one the viewer looks for: no string anywhere in any flight's data (`moves`,
#     `functions`, `actions`, `views`, `walker`, `seats`, `flies`, `hide`, a hose's mesh and
#     anchors: build-model.mjs evaluates every flight.ts and hands over every string in it), with
#     or without a number after it (explode.ts finds wheels as a prefix and a number); none of
#     the vehicle contract's names (drive.ts); none of a figure's joints.
# A joined mesh keeps the name and node of its first member, so whatever is found afterwards is
# what was built. Meshes are joined only while the result spans no more than MERGE_SPAN: Draco
# quantises each mesh's positions over its own box (export_glb), so a join must not make that
# box, and with it the step, larger than the 0.05 mm the export is set up for; it also keeps what
# is culled and what the walker's solids search local.
#
# It runs after the clearance check, which therefore still names the meshes as the scripts built
# them, and it cannot hide a clash: a join moves nothing (every member is in its parent's frame
# already), and run() compares every triangle in the scene before and after (place, corner
# normals, UVs, vertex colours, material) and fails the build if one differs. So the triangles
# exported are exactly those the check passed. The rule is the same at every level of detail.
MERGE_SPAN = 12.0  # metres: 12 m over 18 bits is a step of 0.046 mm
_PER_MESH_MATERIAL = re.compile(r"^(glass|lamp|concrete-(scorch|stain))")
_CONTRACT_NAME = re.compile(r"_(Steer)?Wheel_\d+$|_Knuckle_\d+$|_SteeringWheel$|_Door_\d+$|_(Seat|Stand)_|^Light_|^Grip|^Fingers")
_JOINABLE_PROPS = {"shell"}
_IDENTITY = Matrix.Identity(4)


def _key(name: str) -> str:
    """A name as the viewer compares names: without dots, underscores, spaces or case."""
    return re.sub(r"[._\s]", "", name).lower()


def _is_identity(m: Matrix) -> bool:
    return all(abs(m[r][c] - _IDENTITY[r][c]) < 1e-9 for r in range(4) for c in range(4))


def _joinable(obj: bpy.types.Object, named: set[str]) -> tuple | None:
    """What a mesh may be joined on (parent, material, extras, layers), or None if it keeps its own node."""
    mesh = obj.data
    if obj.type != "MESH" or obj.parent is None or obj.parent_type != "OBJECT" or obj.children:
        return None
    if obj.modifiers or obj.vertex_groups or mesh.shape_keys or mesh.users != 1 or mesh.keys() or not mesh.polygons:
        return None
    if not (_is_identity(obj.matrix_basis) and _is_identity(obj.matrix_parent_inverse)):
        return None
    if len(mesh.materials) != 1 or mesh.materials[0] is None:
        return None
    mat = mesh.materials[0]
    if _PER_MESH_MATERIAL.match(mat.name) or mat.surface_render_method == "BLENDED":
        return None
    props = {k: obj[k] for k in obj.keys()}  # noqa: SIM118 (an ID block's keys, not a dict's)
    if not set(props) <= _JOINABLE_PROPS or not all(isinstance(v, (int, float, str, bool)) for v in props.values()):
        return None
    key = _key(obj.name)
    if key in named or re.sub(r"\d+$", "", key) in named or _CONTRACT_NAME.search(obj.name):
        return None
    layers = (
        tuple(uv.name for uv in mesh.uv_layers),
        tuple((c.name, c.domain, c.data_type) for c in mesh.color_attributes),
    )
    return (obj.parent.name, mat.name, tuple(sorted(props.items())), layers)


def merge_static(named: Sequence[str]) -> int:
    """Join the scene's static, anonymous meshes (the rule is above). `named` is every name the
    flights' data asks the viewer to find. Returns how many meshes went into others."""
    names = {_key(n) for n in named} | {_key(j) for j in FIGURE}
    groups: dict[tuple, list[bpy.types.Object]] = {}
    for obj in sorted(bpy.data.objects, key=lambda o: o.name):
        on = _joinable(obj, names)
        if on is not None:
            groups.setdefault(on, []).append(obj)
    gone = 0
    for members in groups.values():
        # Its members are all in their parent's frame, so their boxes can be compared as they are.
        clusters: list[tuple[Vector, Vector, list[bpy.types.Object]]] = []
        for obj in members:
            corners = [Vector(c) for c in obj.bound_box]
            lo = Vector(min(c[i] for c in corners) for i in range(3))
            hi = Vector(max(c[i] for c in corners) for i in range(3))
            for at, (clo, chi, held) in enumerate(clusters):
                nlo = Vector(min(a, b) for a, b in zip(lo, clo, strict=True))
                nhi = Vector(max(a, b) for a, b in zip(hi, chi, strict=True))
                if max(nhi - nlo) <= MERGE_SPAN:
                    clusters[at] = (nlo, nhi, [*held, obj])
                    break
            else:
                clusters.append((lo, hi, [obj]))
        for _lo, _hi, held in clusters:
            if len(held) < 2:
                continue
            with bpy.context.temp_override(active_object=held[0], selected_objects=held, selected_editable_objects=held):
                bpy.ops.object.join()
            gone += len(held) - 1
    return gone


def fingerprint() -> tuple[str, object]:
    """Every triangle in the scene, whichever mesh holds it, in an order that does not depend on
    the meshes: a digest of each one's corners (place in the scene, UV, colour) and material, and
    beside it the corners' normals in that order. `same_scene` compares two of them."""
    import numpy as np

    keys, normals = [], []
    for obj in bpy.data.objects:
        if obj.type != "MESH" or not obj.data.polygons:
            continue
        mesh = obj.data
        mesh.calc_loop_triangles()
        nt, nl, nv = len(mesh.loop_triangles), len(mesh.loops), len(mesh.vertices)
        world = np.array(obj.matrix_world, dtype=np.float64)
        co = np.empty(nv * 3, dtype=np.float32)
        mesh.vertices.foreach_get("co", co)
        of = np.empty(nl, dtype=np.int32)
        mesh.loops.foreach_get("vertex_index", of)
        normal = np.empty(nl * 3, dtype=np.float32)
        mesh.corner_normals.foreach_get("vector", normal)
        corner = [co.reshape(nv, 3)[of].astype(np.float64) @ world[:3, :3].T + world[:3, 3]]
        for uv in mesh.uv_layers:
            data = np.empty(nl * 2, dtype=np.float32)
            uv.uv.foreach_get("vector", data)
            corner.append(data.reshape(nl, 2).astype(np.float64))
        for colour in mesh.color_attributes:
            n = nl if colour.domain == "CORNER" else nv
            data = np.empty(n * 4, dtype=np.float32)
            colour.data.foreach_get("color", data)
            data = data.reshape(n, 4).astype(np.float64)
            corner.append(data if colour.domain == "CORNER" else data[of])
        corners = np.hstack(corner) + 0.0  # (no minus zero)
        tri = np.empty(nt * 3, dtype=np.int32)
        mesh.loop_triangles.foreach_get("loops", tri)
        slot = np.empty(nt, dtype=np.int32)
        mesh.loop_triangles.foreach_get("material_index", slot)
        # a material as a number that is the same whichever mesh it is on
        ids = np.array([int(hashlib.sha256(m.name.encode()).hexdigest()[:12], 16) for m in mesh.materials], dtype=np.float64)
        keys.append(np.hstack([corners[tri].reshape(nt, -1), ids[slot].reshape(nt, 1)]))
        normals.append((normal.reshape(nl, 3).astype(np.float64) @ world[:3, :3].T)[tri].reshape(nt, 9))
    digest = hashlib.sha256()
    ordered = []
    for width in sorted({k.shape[1] for k in keys}):
        rows = np.ascontiguousarray(np.vstack([k for k in keys if k.shape[1] == width]))
        facing = np.vstack([n for k, n in zip(keys, normals, strict=True) if k.shape[1] == width])
        order = np.argsort(rows.view(np.dtype((np.void, rows.dtype.itemsize * width))).ravel(), kind="stable")
        digest.update(rows[order].tobytes())
        ordered.append(facing[order])
    return digest.hexdigest(), (np.vstack(ordered) if ordered else np.zeros((0, 9)))


# Normals are worked out again by Blender when meshes are joined, and come out the same but for
# the last bits of a float: they are held to this, a fifth of the step the export quantises them to.
NORMAL_NOISE = 5e-5


def same_scene(a: tuple[str, object], b: tuple[str, object]) -> bool:
    """Whether two fingerprints are of the same triangles: places, UVs, colours and materials to the bit, normals to NORMAL_NOISE."""
    import numpy as np

    return a[0] == b[0] and a[1].shape == b[1].shape and bool(np.all(np.abs(a[1] - b[1]) <= NORMAL_NOISE))


def export_glb(path: str) -> None:
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_tangents=False,
        # a model may carry its own baked shading at its vertices, in a colour attribute named Shade (a cabin's: the
        # viewer multiplies the surface by it); no other colour attribute is exported
        export_vertex_color="NAME",
        export_vertex_color_name="Shade",
        export_all_vertex_colors=False,
        export_cameras=False,
        export_lights=False,
        # Draco: about a sixth of the size. Positions are quantised per mesh, so 18 bits keeps
        # the error under 0.05 mm on the longest part (the 11 m tank) and the 1 mm clearance holds.
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=18,
        export_draco_normal_quantization=12,
        export_draco_texcoord_quantization=14,
    )


def stats() -> tuple[int, int]:
    objs = [o for o in bpy.data.objects if o.type == "MESH"]
    return len(objs), sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)


def render_preview(
    path: str, target: Sequence[float], distance: float, azimuth: float = 35.0, elevation: float = 12.0, res: tuple[int, int] = (900, 1400)
) -> None:
    """Quick EEVEE still, for eyeballing a build without opening the viewer."""
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 70
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam)
    az, el = math.radians(azimuth), math.radians(elevation)
    t = Vector(target)
    cam.location = t + distance * Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el)))
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    made = [cam]
    for i, (energy, a) in enumerate(((6.0, az + 0.9), (1.5, az - 1.4))):
        sun_data = bpy.data.lights.new(f"PreviewSun{i}", "SUN")
        sun_data.energy = energy
        sun = bpy.data.objects.new(f"PreviewSun{i}", sun_data)
        scene.collection.objects.link(sun)
        d = Vector((math.cos(a), math.sin(a), 0.6))
        sun.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        made.append(sun)
    world = bpy.data.worlds.new("PreviewWorld")
    with contextlib.suppress(Exception):
        world.use_nodes = True
    bg = next((n for n in world.node_tree.nodes if n.type == "BACKGROUND"), None)
    if bg:
        bg.inputs["Color"].default_value = (0.25, 0.27, 0.3, 1)
    scene.world = world
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    scene.render.engine = next(e for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH") if e in engines)
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for obj in made:
        bpy.data.objects.remove(obj)


def run(name: str, build: Callable[[], str], previews: Sequence[tuple] = ()) -> None:
    """The main() every model script shares: parse args, build, export, report, preview.

    `build` constructs the scene and returns a one-line summary of its size.
    `previews` are (filename, target, distance, {kwargs for render_preview})."""
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview", help="directory for EEVEE preview stills")
    ap.add_argument("--detail", type=float, default=1.0, help="level of detail: 1 is full, 0.25 is a distant LOD")
    ap.add_argument("--allow-clashes", action="store_true", help="export even if the clearance check fails")
    ap.add_argument("--named", help="a JSON list of the names the flights' data asks the viewer to find: meshes so named are not joined")
    args = ap.parse_args(argv)
    global DETAIL
    DETAIL = args.detail
    reset_scene()
    summary = build()
    bpy.context.view_layer.update()
    clashes = check_clearance()
    if clashes:
        print(f"{name}: CLEARANCE FAILED: parallel faces under {MIN_GAP * 1000:.0f} mm apart will flicker")
        for line in clashes:
            print(f"  {line}")
        if not args.allow_clashes:
            sys.exit(1)
    # Static meshes are joined for the export, after the check and under its eye (see merge_static).
    built = stats()[0]
    if args.named:
        with open(args.named, encoding="utf8") as f:
            named = json.load(f)
        before = fingerprint()
        merge_static(named)
        bpy.context.view_layer.update()
        after = fingerprint()
        if not same_scene(before, after):
            print(f"{name}: MERGE FAILED: the joined scene is not the scene that was built ({len(before[1]):,} triangles, then {len(after[1]):,})")
            sys.exit(1)
    else:
        print(f"{name}: meshes not joined: no --named list (tools/build-model.mjs gives one)")
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    export_glb(out)
    n, tris = stats()
    print(f"{name}: {n} meshes (built as {built}), {tris:,} triangles, {summary}, {os.path.getsize(out) / 1e6:.2f} MB -> {out}")
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        for filename, target, distance, kw in previews:
            render_preview(os.path.join(args.preview, filename), target, distance, **kw)


def load_font():
    """A bold sans for painted lettering; falls back to Blender's built-in font."""
    for path in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(path):
            return bpy.data.fonts.load(path)
    return None
