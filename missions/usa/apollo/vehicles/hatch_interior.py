"""CM-101 unified hatch, cabin side. Estimated enclosure and exposed mechanism.

JPL TM 33-425, 'The Apollo Command Module Side Access Hatch', fig. 2, shows
the latch drive, pump handle, pressure valve and rods. Model only their visible
exteriors. No later lightweight pocket pattern is used. See cabin-fittings.md.
"""

import json
import math
from pathlib import Path

from mathutils import Matrix, Vector
from mathutils.geometry import delaunay_2d_cdt

import perforated_wall
import side_hatch
from cm_reference import AFT_APEX_XC, survey_cm
from srlib import CM, IN, MeshBuilder, interior, mark_shells, material


def build(parent, base):
    if not interior():
        return
    src = json.loads((Path(__file__).parent / "reference/apollo-cm-inner-apertures.json").read_text())
    boundary = [Vector(survey_cm(p, src["registration"])) * CM / IN for p in src["hatch_frame_interface"]["boundary_cm"]]
    data = side_hatch.REFERENCE
    reg = data["registration"]
    rot = Matrix(reg["rotation"])
    offset = Vector(reg["translation_m"]) / IN + Vector((0, 0, AFT_APEX_XC))
    points = [rot @ Vector(p) / IN + offset for p in data["window"]["boundary_m"]]
    centre = sum(points, Vector()) / len(points)
    n = (rot @ Vector(data["window"]["normal"])).normalized()
    u = Vector((0, 1, 0))
    u = (u - n * u.dot(n)).normalized()
    v = n.cross(u)

    def plane(p):
        d = p - centre
        return Vector((d.dot(u), d.dot(v)))

    def local(x, y, h):
        return (centre + u * x + v * y + n * h + Vector((0, 0, base))) * IN

    outer = [plane(p) * 0.985 for p in boundary]
    hole = [Vector((4.42 * math.cos(i * math.tau / 64), 4.42 * math.sin(i * math.tau / 64))) for i in range(64)]
    coords, edges = [], []
    for path in (outer, hole):
        start = len(coords)
        coords.extend(path)
        edges.extend((start + i, start + (i + 1) % len(path)) for i in range(len(path)))
    pts, _, tris, *_ = delaunay_2d_cdt(coords, edges, [], 0, 1e-6, False)
    keep = []
    for tri in tris:
        mid = sum((pts[i] for i in tri), Vector((0, 0))) / len(tri)
        if perforated_wall.within(mid, outer) and not perforated_wall.within(mid, hole):
            keep.append(tuple(reversed(tri)))
    mesh = MeshBuilder()
    mesh.add([local(p.x, p.y, -4.5) for p in pts], keep)
    metal = material("apollo-hatch-pressure-door", (0.58, 0.60, 0.57), metallic=0.45, roughness=0.61, double_sided=True)
    for path, depth in ((outer, -3.9), (hole, -2.32)):
        count = len(path)
        mesh.add(
            [local(p.x, p.y, h) for h in (-4.5, depth) for p in path],
            [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)],
        )
    mesh.build("CM_SideHatchPressureDoor", metal, parent, smooth=False)
    mark_shells(["CM_SideHatchPressureDoor"])
    # Space drive units along the closed edge. Individual positions and sizes
    # are schematic; the later lightweight inner door is not a source.
    outline = [p * 0.90 for p in outer]
    segments = [(a, b, (b - a).length) for a, b in zip(outline, outline[1:] + outline[:1])]
    perimeter = sum(length for _, _, length in segments)
    drivers = MeshBuilder()
    rods = MeshBuilder()
    stations = []
    for i in range(15):
        travelled = (i + 0.5) * perimeter / 15
        for a, b, length in segments:
            if travelled <= length:
                pos = a.lerp(b, travelled / length)
                break
            travelled -= length
        stations.append(pos)
        transform = Matrix((u, v, n)).transposed().to_4x4()
        transform.translation = local(*pos, -4.96)
        drivers.box(tuple(k * IN for k in (1.65, 1.15, 1.05)), transform)
    for a, b in zip(stations, stations[1:] + stations[:1]):
        rods.tube(local(*a, -5.05), local(*b, -5.05), 0.18 * IN, segs=10, caps=False)
    rods.tube(local(6, -4, -5.1), local(10, -5, -6.0), 0.46 * IN, segs=16)
    rods.tube(local(10, -5, -6), local(10, -8.8, -6), 0.55 * IN, segs=16)
    dark = material("apollo-hatch-latch-drive", (0.30, 0.30, 0.28), metallic=0.66, roughness=0.46)
    for name, part in (("CM_HatchLatchHousings", drivers), ("CM_HatchDriveAndHandle", rods)):
        part.build(name, dark, parent, smooth=False)
        mark_shells([name])
