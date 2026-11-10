"""space-race Blender helpers: procedural, to-scale spacecraft geometry.

Conventions
- Units are metres. Source drawings are in inches; multiply by IN.
- +Z is the vehicle's long axis, nose up (launch attitude). glTF export turns that into +Y.
- Surfaces of revolution take a profile of (r, z) points. Walk the profile with the
  material on your LEFT (bottom centre -> outward -> up -> inward) and normals face out.
"""

from __future__ import annotations

import math
from typing import Callable, Iterable, Sequence

import bpy
from mathutils import Matrix, Vector

IN = 0.0254
TAU = math.tau

Vec3 = tuple[float, float, float]


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
    try:
        mat.use_nodes = True
    except Exception:
        pass
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

        self.grid(pt, us, vs, closed_u=full, uv=lambda u, j: (u * rmax, path[j]),
                  matrix=matrix, flip=flip)

    def tube(self, p0, p1, radius: float, segs: int = 12, caps: bool = True) -> None:
        p0, p1 = Vector(p0), Vector(p1)
        length = (p1 - p0).length
        prof = [(radius, 0.0), (radius, length)]
        if caps:
            prof = [(0.0, 0.0), *prof, (0.0, length)]
        self.lathe(prof, segs, matrix=frame(p0, p1 - p0))

    def disc(self, origin, normal, radius: float, height: float, segs: int = 6) -> None:
        """A capped stub: bolt heads, rivets, port covers."""
        self.lathe([(radius, 0.0), (radius, height), (0.0, height)], segs,
                   matrix=frame(origin, normal))

    def box(self, size: Sequence[float], matrix: Matrix) -> None:
        sx, sy, sz = (s / 2 for s in size)
        v = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
             (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
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
        (cx + radius * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
         cz + radius * math.sin(math.radians(a0 + (a1 - a0) * i / n)))
        for i in range(n + 1)
    ]


def text_mesh(body: str, size: float, font: bpy.types.VectorFont | None = None):
    """Flat text as (verts, faces) in the XY plane, origin at left baseline."""
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
    verts = [tuple(v.co) for v in mesh.vertices]
    faces = [tuple(p.vertices) for p in mesh.polygons]
    bpy.data.objects.remove(obj)
    bpy.data.curves.remove(curve)
    bpy.data.meshes.remove(mesh)
    return verts, faces


# -------------------------------------------------------------------------- export


def export_glb(path: str) -> None:
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_tangents=False,
        export_cameras=False,
        export_lights=False,
    )


def stats() -> tuple[int, int]:
    objs = [o for o in bpy.data.objects if o.type == "MESH"]
    return len(objs), sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)


def render_preview(path: str, target: Sequence[float], distance: float, azimuth: float = 35.0,
                   elevation: float = 12.0, res: tuple[int, int] = (900, 1400)) -> None:
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
    try:
        world.use_nodes = True
    except Exception:
        pass
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
