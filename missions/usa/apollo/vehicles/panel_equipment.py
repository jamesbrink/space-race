"""Finite panel equipment in an orthonormal inch frame, shared by console and DSKY.

The caller supplies the source registration and confidence. This builder only
converts geometry to metres and keeps printed legends clear of their surface.
"""

import bmesh
from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, load_font, prof, text_mesh

PRINT = 0.06  # Rendering separation (1.524 mm), not paint/letter thickness.


class InchPanel:
    def __init__(self, parent, base, origin, u, v, normal, materials, prefix="CM_Console"):
        self.parent, self.base, self.prefix = parent, base, prefix
        self.origin, self.u, self.v, self.n = map(Vector, (origin, u, v, normal))
        self.m = materials
        self.font, self.meshes = load_font(), {}

    def frame(self, u, v, w=0):
        f = Matrix((self.u, self.v, self.n)).transposed().to_4x4()
        f.translation = (self.origin + self.u * u + self.v * v + self.n * w + Vector((0, 0, self.base))) * IN
        return f

    def mesh(self, role, paint):
        key = role, paint
        if key not in self.meshes:
            self.meshes[key] = MeshBuilder()
        return self.meshes[key]

    def box(self, role, paint, u, v, width, height, lo, hi):
        self.mesh(role, paint).box((width * IN, height * IN, (hi - lo) * IN), self.frame(u, v, (lo + hi) / 2))

    def lathe(self, role, paint, u, v, points, segs=48):
        self.mesh(role, paint).lathe(prof(points), segs=segs, matrix=self.frame(u, v))

    def line(self, role, paint, a, b, width, w):
        a, b = Vector((*a, w)), Vector((*b, w))
        delta = b - a
        tangent = delta.normalized()
        side = Vector((-tangent.y, tangent.x, 0)) * width / 2
        vertices = [a - side, a + side, b + side, b - side]
        self.mesh(role, paint).add([tuple(p * IN) for p in vertices], [(0, 3, 2, 1)], matrix=self.frame(0, 0))

    def text(self, body, u, v, cap=0.09, w=PRINT, paint="ink", role="Legends"):
        for row, line in enumerate(body.split("\n")):
            # Flat legends need no cylinder-wrapping subdivisions. Tiny
            # subdivided triangles lose precision at the stack's world height.
            points, faces = text_mesh(line, 1, self.font, cuts=0)
            if not points:
                continue
            xs, ys = [p[0] for p in points], [p[1] for p in points]
            k = cap / (max(ys) - min(ys))
            cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
            # Sub-0.05-mm print slivers are below the drawing's resolution.
            # Collapse them locally before the stack's 57-m float translation.
            bm = bmesh.new()
            vertices = [bm.verts.new(((x - cx) * k * IN, (y - cy) * k * IN, 0)) for x, y, _ in points]
            for face in faces:
                bm.faces.new([vertices[i] for i in face])
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.00005)
            bmesh.ops.dissolve_degenerate(bm, edges=list(bm.edges), dist=0.00005)
            bmesh.ops.triangulate(bm, faces=list(bm.faces))
            bm.verts.ensure_lookup_table()
            bm.verts.index_update()
            points = [tuple(p.co) for p in bm.verts]
            faces = [tuple(p.index for p in face.verts) for face in bm.faces]
            bm.free()
            vertices = [(u * IN + x, (v - row * cap * 1.4) * IN + y, w * IN) for x, y, _ in points]
            self.mesh(role, paint).add(vertices, faces, matrix=self.frame(0, 0))

    def flush(self):
        objects = []
        for (role, paint), mesh in self.meshes.items():
            objects.append(mesh.build(f"{self.prefix}_{role}_{paint}", self.m[paint], self.parent, smooth=False))
        self.meshes.clear()
        return objects
