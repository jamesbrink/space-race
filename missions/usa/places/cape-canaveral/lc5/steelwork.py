"""Close views of the Noble service stand. Site feet throughout. See lc-5.md for the evidence
and the estimated stock sections, grating pitch and expanded-metal opening."""

import math

from mathutils import Vector

from .site import P, box


def angle(mb, start, end, width, facing):
    """Rolled angle between two joints. Orient its hollow quadrant toward the inside of the leg."""
    a, b = Vector(start), Vector(end)
    run = (b - a).normalized()
    u = Vector(facing)
    u = (u - run * u.dot(run)).normalized()
    v = run.cross(u)
    half, gauge = width / 2, width * 0.13
    profile = [(-half, -half), (half, -half), (half, -half + gauge), (-half + gauge, -half + gauge), (-half + gauge, half), (-half, half)]
    points = [P(*(p + u * x + v * y)) for p in (a, b) for x, y in profile]
    n = len(profile)
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    mb.add(points, [*faces, tuple(reversed(range(n))), tuple(range(n, 2 * n))])


def grating(mb, x0, x1, y0, y1, z):
    """An open floor panel with perimeter band, bearing bars and transverse ties below their tops."""
    band, gauge, depth = 0.08, 0.025, 0.15
    for x in (x0, x1 - band):
        box(mb, (x, y0, z - depth), (x + band, y1, z))
    for y in (y0, y1 - band):
        box(mb, (x0 + band, y, z - depth), (x1 - band, y + band, z))
    count = math.ceil((x1 - x0 - 2 * band) / 0.14)
    for i in range(1, count):
        x = x0 + band + (x1 - x0 - 2 * band) * i / count
        box(mb, (x - gauge / 2, y0 + band, z - depth), (x + gauge / 2, y1 - band, z))
    y = y0 + 0.36
    while y < y1 - band:
        box(mb, (x0 + band, y, z - 0.08), (x1 - band, y + gauge, z - 0.025))
        y += 0.36


def lift_mesh(mb, a, b, floor, roof):
    """Raised expanded sheet with staggered diamond openings. Each bond is shared by four strands."""
    a, b = Vector(a), Vector(b)
    along = (b - a).normalized()
    normal = Vector((-along.y, along.x))
    cols, rows = math.ceil((b - a).length / 0.14), math.ceil((roof - floor) / 0.065)
    dx, dz = (b - a).length / cols, (roof - floor) / rows

    def vertex(x, z, setback):
        p = a + along * x + normal * setback
        return P(p.x, p.y, floor + z)

    # Slit and stretched metal: one narrow angled face per strand. Adjacent strands meet
    # along the short, uncut flat bond. Even rows begin on the frame, odd ones half a cell in.
    for row in range(rows):
        for col in range(cols):
            for side in (0, 1):
                x0, x1 = (col + side) * dx, (col + 0.5) * dx
                if row % 2:
                    x0, x1 = x1, x0
                sign = 1 if x1 > x0 else -1
                z0, z1 = dz * row, dz * (row + 1)
                mb.add(
                    [vertex(x0, z0, 0), vertex(x0 + sign * 0.009, z0, 0.010), vertex(x1, z1, 0), vertex(x1 - sign * 0.009, z1, -0.010)],
                    [(0, 1, 2, 3)],
                )
