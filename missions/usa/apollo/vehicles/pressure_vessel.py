"""Block II pressure-vessel wall derived from published penetration coordinates.

North American A-512S (13 January 1969), ST-310A, printed p.27, supplies
(Xc,Yc,Zc) in inches. ST-278A, p.26, identifies the Block II wall limits.
Only the verified sidewall profile is reconstructed here: bulkheads, tunnel,
hatch, stringers and equipment are separate unfinished work.
"""

import math

# Source coordinates, NOT pre-converted model coordinates. Apollo's longitudinal
# axis is Xc; the viewer's hatch-facing Blender basis is (-Zc,Yc,Xc).
POINTS = {
    "A": (30.9000, 28.7200, 51.0939),
    "B": (18.6856, -48.8943, 30.4243),
    "C": (26.0000, -51.5856, -26.9500),
    "G": (30.9000, -16.4500, 56.2568),
    "H": (19.2500, -45.0084, -36.0000),
    "T": (51.9600, 9.6122, -52.8055),
    "P": (60.5000, -10.1506, -47.1474),
    "R": (57.0005, -9.2244, -49.6092),
    "O": (58.7200, 11.3140, -48.0486),
}
AFT = 14.07
FORWARD = 80.75


def _line(first, second):
    a, b = POINTS[first], POINTS[second]
    ra, rb = math.hypot(*a[1:]), math.hypot(*b[1:])
    slope = (rb - ra) / (b[0] - a[0])
    return ra - slope * a[0], slope


# Two independent points define each straight wall generator. Other points in
# the table verify it; no best-fit dimensions or photograph scaling are used.
LOWER = _line("A", "H")
UPPER = _line("T", "P")
MID = (UPPER[0] - LOWER[0]) / (LOWER[1] - UPPER[1])


def radius(x):
    intercept, slope = LOWER if x < MID else UPPER
    return intercept + slope * x


def verify():
    """Cross-check the reconstruction against points not used to define it."""
    for label in ("B", "C", "G", "R", "O"):
        x, y, z = POINTS[label]
        if abs(math.hypot(y, z) - radius(x)) > 0.001:
            raise ValueError(f"Pressure-vessel profile misses published penetration {label}")
    # PR29-12 (1968), Figure 4: kick frame Xc42.665, radius59.6.
    if abs(MID - 42.665) > 0.001 or abs(radius(MID) - 59.6) > 0.001:
        raise ValueError("Pressure-vessel profile misses the published kick frame")


verify()


def build(parent, base):
    """Build the sourced wall and frame interfaces, without invented bulkheads."""
    import json
    from pathlib import Path

    from mathutils import Vector

    import perforated_wall
    from srlib import CM, IN, MeshBuilder, interior, mark_shells, material

    if not interior():
        return
    source = json.loads((Path(__file__).parent / "reference" / "apollo-cm-inner-apertures.json").read_text())
    datum = source["registration"]["scan_sphere_apex_cm"]

    def measured(points):
        return [Vector((-p[1], p[0], p[2] - datum)) * CM for p in points]

    def project(point, direction):
        # Intersect the measured frame normal with the nominal upper wall.
        intercept, slope = UPPER
        intercept *= IN
        p, n = point, direction
        r = intercept + slope * p.z
        a = n.x**2 + n.y**2 - (slope * n.z) ** 2
        b = 2 * (p.x * n.x + p.y * n.y - r * slope * n.z)
        c = p.x**2 + p.y**2 - r**2
        disc = b * b - 4 * a * c
        if disc < 0:
            raise ValueError("Measured pressure-window frame misses nominal wall")
        t = min(((-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a)), key=abs)
        return p + t * n

    windows = []
    for port in source["apertures"]:
        frame = measured(port["boundary_cm"])
        n = port["normal"]
        direction = Vector((-n[1], n[0], n[2]))
        # A tilted rendezvous frame crosses the nominal cone. Split its edge
        # at that intersection: one quad spanning a sign change would fold
        # over itself, creating a false coplanar surface at the crossing.
        split = []
        for first, last in zip(frame, frame[1:] + frame[:1]):
            split.append(first)
            d0 = (project(first, direction) - first).dot(direction)
            d1 = (project(last, direction) - last).dot(direction)
            if d0 * d1 < 0:
                lo, hi = 0.0, 1.0
                for _ in range(48):
                    k = (lo + hi) / 2
                    point = first.lerp(last, k)
                    d = (project(point, direction) - point).dot(direction)
                    if d * d0 > 0:
                        lo = k
                    else:
                        hi = k
                split.append(first.lerp(last, (lo + hi) / 2))
        frame = split
        rim = [project(p, direction) for p in frame]
        windows.append((port["id"], frame, rim, direction))
    hatch = measured(source["hatch_frame_interface"]["boundary_cm"])
    holes = [perforated_wall.domain(rim) for _, _, rim, _ in windows] + [perforated_wall.domain(hatch)]

    def normal(x):
        slope = LOWER[1] if x < MID else UPPER[1]
        scale = math.sqrt(1 + slope * slope)
        return 1 / scale, -slope / scale

    aluminium = material("apollo-pressure-wall", (0.66, 0.68, 0.66), metallic=0.45, roughness=0.65, double_sided=True)
    wall = perforated_wall.build("CM_PressureWall", parent, aluminium, base, AFT, FORWARD, radius, normal, holes, joins=(MID,))
    perforated_wall.check_openings(wall, [(name, frame, direction) for name, frame, _, direction in windows], base)
    for name, frame, rim, _ in windows:
        # A derived connection from the published wall to the surveyed frame
        # interface. This is not a measured honeycomb thickness or glass stack.
        mesh = MeshBuilder()
        n = len(frame)
        faces = []
        for i in range(n):
            j = (i + 1) % n
            if (frame[i] - rim[i]).length < 1e-8:
                faces.append((i, j, j + n))
            elif (frame[j] - rim[j]).length < 1e-8:
                faces.append((i, j, i + n))
            else:
                faces.append((i, j, j + n, i + n))
        mesh.add([(p.x, p.y, p.z + base * IN) for p in frame + rim], faces)
        mesh.build(f"CM_PressureFrame_{name}", aluminium, parent, smooth=False)
    mark_shells(["CM_PressureWall"])
