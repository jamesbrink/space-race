"""Triangulate a surface of revolution around actual aperture boundaries.

The planar domain is (azimuth, axial station in metres), not a flattened door.
Physical dimensions and normals are supplied by the owning hardware module.
"""

import math

from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt

from srlib import IN, MeshBuilder, _segs


def within(point, polygon):
    x, y = point
    inside = False
    for a, b in zip(polygon, polygon[1:] + polygon[:1]):
        if (a.y > y) != (b.y > y) and x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x:
            inside = not inside
    return inside


def domain(boundary):
    return [Vector((math.atan2(p.y, p.x), p.z)) for p in boundary]


def convex_boundary(points):
    """Order a projected outline in XY, retaining each point's other coordinates."""
    points = sorted(points, key=lambda p: (p.x, p.y))

    def cross(a, b, c):
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

    lower, upper = [], []
    for sequence, into in ((points, lower), (points[::-1], upper)):
        for point in sequence:
            while len(into) >= 2 and cross(into[-2], into[-1], point) <= 0:
                into.pop()
            into.append(point)
    return lower[:-1] + upper[:-1]


def disc(name, parent, paint, base, height, radius, holes):
    """Flat nominal bulkhead: profile inches, measured hole outlines in metres."""
    around = _segs(128)
    outer = [
        Vector((radius * IN * math.cos(-math.pi + 2 * math.pi * i / around), radius * IN * math.sin(-math.pi + 2 * math.pi * i / around)))
        for i in range(around)
    ]
    points, edges = [], []
    for boundary in [outer, *holes]:
        start = len(points)
        points.extend(Vector((p.x, p.y)) for p in boundary)
        edges.extend((start + i, start + (i + 1) % len(boundary)) for i in range(len(boundary)))
    coords, _, faces, *_ = delaunay_2d_cdt(points, edges, [], 0, 1e-8, False)
    kept = []
    for face in faces:
        centre = sum((coords[i] for i in face), Vector((0, 0))) / len(face)
        if within(centre, outer) and not any(within(centre, h) for h in holes):
            kept.append(face)
    mesh = MeshBuilder()
    mesh.add([(p.x, p.y, (base + height) * IN) for p in coords], kept)
    return mesh.build(name, paint, parent, smooth=False)


def build(name, parent, paint, base, lower, upper, radius, normal, holes, joins=(), boundary=None):
    """Source inches at the profile, metres at the aperture boundaries."""
    axial, around = _segs(64), _segs(128)
    zs = sorted({lower, upper, *joins, *[lower + (upper - lower) * i / axial for i in range(axial + 1)]})
    points, edges = [], []
    boundaries = [*holes, *([boundary] if boundary is not None else [])]

    def near_edge(point):
        # Interior samples too close to a constrained edge create razor-thin
        # triangles after float32 export. Keep the measured edge unchanged;
        # omit only optional tessellation samples beside it.
        for polygon in boundaries:
            for a, b in zip(polygon, polygon[1:] + polygon[:1]):
                edge = b - a
                k = min(1, max(0, (point - a).dot(edge) / edge.length_squared)) if edge.length_squared else 0
                if (point - a.lerp(b, k)).length < 0.001:
                    return True
        return False

    def excluded(point):
        return (boundary is not None and not within(point, boundary)) or any(within(point, h) for h in holes)

    for z in zs:
        for i in range(around + 1):
            p = Vector((-math.pi + 2 * math.pi * i / around, z * IN))
            if not excluded(p) and not near_edge(p):
                points.append(p)
    for polygon in boundaries:
        start = len(points)
        points.extend(polygon)
        edges.extend((start + i, start + (i + 1) % len(polygon)) for i in range(len(polygon)))
    coords, _, faces, *_ = delaunay_2d_cdt(points, edges, [], 0, 1e-8, False)
    verts = [(radius(p.y / IN) * math.cos(p.x) * IN, radius(p.y / IN) * math.sin(p.x) * IN, base * IN + p.y) for p in coords]
    kept = [face for face in faces if not excluded(sum((coords[i] for i in face), Vector((0, 0))) / len(face))]
    mesh = MeshBuilder()
    mesh.add(verts, kept)
    obj = mesh.build(name, paint, parent)
    # Irregular constrained triangles must not introduce false wrinkles into
    # the lighting of an analytical surface of revolution.
    normals = []
    for p in coords:
        nr, nz = normal(p.y / IN)
        normals.append((nr * math.cos(p.x), nr * math.sin(p.x), nz))
    obj.data.normals_split_custom_set_from_vertices(normals)
    return obj


def check_openings(skin, apertures, base):
    """Assert daylight through each opening, independently of triangulation."""
    mesh = skin.data
    mesh.calc_loop_triangles()
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], [t.vertices for t in mesh.loop_triangles], all_triangles=True)
    for name, measured, direction in apertures:
        mean = sum(measured, Vector((0, 0, 0))) / len(measured)
        for boundary in measured:
            point = mean * 0.8 + boundary * 0.2 + Vector((0, 0, base * IN))
            # Start just inside the measured frame, then look out through it.
            hit, *_ = tree.ray_cast(point - direction * 0.1, direction, 2)
            if hit is not None:
                raise ValueError(f"Skin bridges surveyed opening {name}")
