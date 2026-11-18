"""LM-3 display geometry, in inches. External envelopes and installation only. See lunar-module.md."""

import math

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, interior, prof


def point(xyz):
    return Vector(xyz) * IN


def surface(mesh, centre, section, sides=48):
    mesh.lathe(prof(section), sides, matrix=Matrix.Translation(point(centre)))


def pipe(mesh, points, radius):
    for start, end in zip(points, points[1:], strict=False):
        mesh.tube(point(start), point(end), radius * IN, caps=False)


def box(mesh, xyz, size):
    mesh.box(point(size), Matrix.Translation(point(xyz)))


def vessel(mesh, xyz, radius, half_length):
    profile = [(radius * math.cos(a), half_length * math.sin(a)) for a in [math.pi * (j / 20 - 0.5) for j in range(21)]]
    surface(mesh, xyz, profile)


def engine(parent, ascent, metal, graphite, jacket, brass):
    """Separate extension, ablative chamber jacket, manifold and mounting structure."""
    # Table I, NASA 19700026405: approximately 85/51 in overall, 58/31 in exit.
    radius, throat, length, exit_z = (15.5, 2.5, 51, 112) if ascent else (29, 4, 85, 18.48)
    name = "APS" if ascent else "DPS"
    skirt, case, hardware, feed = (MeshBuilder() for _ in range(4))
    start = (0, 0, exit_z)
    section = [
        (radius, 0),
        (radius * 0.92, 0.075 * length),
        (radius * 0.72, 0.22 * length),
        (radius * 0.47, 0.39 * length),
        (throat * 1.7, 0.53 * length),
    ]
    inner = [(r - 0.38, z) for r, z in reversed(section)]
    surface(skirt, start, section + inner + [section[0]], 64)
    skirt.build("LM3_" + name + "_NozzleExtension", graphite, parent)
    chamber_radius = 4 if ascent else 7
    surface(
        case,
        start,
        [
            (throat * 1.72, 0.53 * length),
            (throat * 1.5, 0.59 * length),
            (throat, 0.65 * length),
            (chamber_radius, 0.70 * length),
            (chamber_radius, 0.88 * length),
            (chamber_radius + 1, 0.90 * length),
            (chamber_radius + 1, 0.94 * length),
            (0, 0.94 * length),
        ],
        48,
    )
    case.build("LM3_" + name + "_ChamberJacket", jacket, parent)
    for zfrac, r in [(0.012, radius * 0.995), (0.105, radius * 0.89), (0.52, throat * 1.78), (0.91, chamber_radius + 1.9)]:
        surface(
            hardware,
            start,
            [(r, zfrac * length), (r + 0.36, zfrac * length + 0.35), (r + 0.34, zfrac * length + 0.95), (r - 0.1, zfrac * length + 1.1)],
            56,
        )
    top = exit_z + length
    box(hardware, (0, 0, top - 0.8), (2 * chamber_radius + 7, 2 * chamber_radius + 4, 1.6))
    for side in (-1, 1):
        pipe(
            feed,
            [(side * (chamber_radius + 10), 8, top - 8), (side * (chamber_radius + 5), 7, top - 8), (side * (chamber_radius + 3), 2, top - 5)],
            0.85,
        )
    if ascent:
        for x in (-1, 1):
            for y in (-1, 1):
                pipe(hardware, [(x * 7, y * 5, top - 2), (x * 9.8, y * 10.3, 137), (x * 16, y * 17, 132)], 1.2)
    else:
        gimbal = exit_z + length * 0.79
        surface(hardware, (0, 0, gimbal), [(12, 0), (15, 0), (15, 2), (12, 2), (12, 0)])
        for i in range(4):
            a = i * math.pi / 2
            pipe(hardware, [(14 * math.cos(a), 14 * math.sin(a), gimbal + 1), (25 * math.cos(a), 25 * math.sin(a), 111)], 1.6)
        for x, y in ((16, 9), (-9, 16)):
            pipe(feed, [(x * 0.72, y * 0.72, gimbal - 8), (x, y, gimbal + 3), (x * 1.18, y * 1.18, 108)], 1.7)
    hardware.build("LM3_" + name + "_MountAndFittings", metal, parent)
    feed.build("LM3_" + name + "_ExternalLines", brass, parent)


def tanks(descent, ascent, structure, metal, oxidizer, fuel, brass):
    if not interior():
        return
    # A.2-4: beams enclose a central engine bay and four propellant bays.
    cross = MeshBuilder()
    for side in (-1, 1):
        for z in (59.8, 123.5):
            box(cross, (0, side * 27, z), (159, 2.5, 2))
            for y, length in ((-53.875, 51.25), (0, 51.5), (53.875, 51.25)):
                box(cross, (side * 27, y, z), (2.5, length, 2))
        for t in (-76, -32, 32, 76):
            box(cross, (t, side * 27, 91.7), (1.5, 2, 62))
            box(cross, (side * 27, t, 91.7), (2, 1.5, 62))
    cross.build("LM3_DescentCruciform", metal, structure)
    for owner, name, centres, r, h in (
        (descent, "DPS", [(53, 0, 92), (-53, 0, 92), (0, 53, 92), (0, -53, 92)], 24, 31),
        (ascent, "APS", [(0, 53, 175), (-5, -54, 177)], 23, 23),
    ):
        feed = MeshBuilder()
        bands = MeshBuilder()
        for i, (x, y, z) in enumerate(centres):
            cell = MeshBuilder()
            vessel(cell, (x, y, z), r, h)
            paint = fuel if i < len(centres) // 2 else oxidizer
            cell.build(f"LM3_{name}_PropellantTank_{i + 1}", paint, owner)
            for dz in (-h * 0.44, h * 0.44):
                rr = r * math.sqrt(1 - (dz / h) ** 2)
                surface(bands, (x, y, z + dz), [(rr + 0.2, -1), (rr + 0.2, 1), (rr - 0.2, 1)])
            bottom = z - h
            engine_z = 98 if name == "DPS" else 158
            pipe(
                feed,
                [
                    (x, y, bottom + 1),
                    (x, y, bottom - 2),
                    (x * 0.55, y * 0.55, bottom - 2),
                    (x * 0.32, y * 0.32, engine_z),
                    (x * 0.17, y * 0.17, engine_z),
                ],
                1,
            )
            pipe(feed, [(x, y, z + h), (x * 0.92, y * 0.92, z + h + 2), (x * 0.75, y * 0.75, z + h + 2)], 0.55)
        for i, sign in enumerate((-1, 1)):
            sphere = MeshBuilder()
            pos = (sign * 49, 46, 93) if name == "DPS" else (-24, sign * 18, 191)
            vessel(sphere, pos, 10 if name == "DPS" and i else 7.8, 10 if name == "DPS" and i else 7.8)
            sphere.build(f"LM3_{name}_HeliumVessel_{i + 1}", metal, owner)
        bands.build("LM3_" + name + "_TankSupports", metal, owner)
        feed.build("LM3_" + name + "_FeedAndPressurizationLines", brass, owner)


def rcs_tanks(parent, metal, fuel, oxidizer):
    if not interior():
        return
    for system, side in enumerate((-1, 1)):
        for j, (radius, paint) in enumerate([(7, fuel), (7.5, oxidizer), (4.8, metal)]):
            mesh = MeshBuilder()
            vessel(mesh, (-56, side * (12 + j * 13), 206), radius, 9 if j < 2 else radius)
            mesh.build(f"LM3_RCS_System{system + 1}_Tank{j + 1}", paint, parent)
