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


def build(name, parent, paint, base, lower, upper, radius, normal, holes, joins=()):
    """Source inches at the profile, metres at the aperture boundaries."""
    axial, around = _segs(64), _segs(128)
    zs = sorted({lower, upper, *joins, *[lower + (upper - lower) * i / axial for i in range(axial + 1)]})
    points, edges = [], []
    for z in zs:
        for i in range(around + 1):
            p = Vector((-math.pi + 2 * math.pi * i / around, z * IN))
            if not any(within(p, h) for h in holes):
                points.append(p)
    for polygon in holes:
        start = len(points)
        points.extend(polygon)
        edges.extend((start + i, start + (i + 1) % len(polygon)) for i in range(len(polygon)))
    coords, _, faces, *_ = delaunay_2d_cdt(points, edges, [], 0, 1e-8, False)
    verts = [(radius(p.y / IN) * math.cos(p.x) * IN, radius(p.y / IN) * math.sin(p.x) * IN, base * IN + p.y) for p in coords]
    kept = [face for face in faces if not any(within(sum((coords[i] for i in face), Vector((0, 0))) / len(face), h) for h in holes)]
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
