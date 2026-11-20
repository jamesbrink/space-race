"""SA-208 rear-spar fittings and position 4 outrigger splice, flight evaluation figures 8-16 and 8-17."""

import math

from mathutils import Matrix, Vector

from apollo_csm import radial
from srlib import IN, MeshBuilder, frame, group, material, prof

# The type drawing gives the fin envelope. These locations and section dimensions (inches) are estimates.
ROOT_RADIUS = 130
REAR_SPAR_STATION = 117
POSITION_FOUR = radial(ROOT_RADIUS - 4, 3 * math.pi / 4, REAR_SPAR_STATION)


def add_box(mesh, size, centre):
    mesh.box(Vector(size) * IN, Matrix.Translation(Vector(centre) * IN))


def section(mesh, outline, half_width):
    """Extrude a radial section (x, z) across the fitting."""
    verts = [(x * IN, y * IN, z * IN) for y in (-half_width, half_width) for x, z in outline]
    n = len(outline)
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, i + n, j + n, j))
    mesh.add(verts, faces)


def bolt(mesh, inner, outer, z, radius):
    """Visible ends of the radial fastener. Its shank is inside the spar and block."""
    for bearing, direction in ((inner, -1), (outer, 1)):
        axis = frame(Vector((bearing, 0, z)) * IN, (direction, 0, 0))
        mesh.lathe(prof([(0, -0.14), (radius * 1.7, -0.14), (radius * 1.7, 0.17), (0, 0.17)]), segs=20, matrix=axis)
        mesh.lathe(prof([(0, 0.10), (radius * 1.48, 0.10), (radius * 1.48, 0.77), (0, 0.77)]), segs=6, matrix=axis)
        if direction == 1:
            mesh.lathe(prof([(0, 0.68), (radius, 0.68), (radius, 1.0), (0, 1.0)]), segs=12, matrix=axis)


def build(tank_structure):
    beam = material("sa208-outrigger-aluminium", (0.45, 0.48, 0.50), metallic=0.58)
    blocks = material("sa208-fin-reinforcing-block", (0.70, 0.73, 0.72), metallic=0.65)
    steel = material("sa208-fin-attachment-steel", (0.24, 0.26, 0.27), metallic=0.73)
    for pos in range(1, 9):
        angle = (pos - 1) * math.pi / 4
        name = f"SA208_F{pos}_"
        fitting = group("FinFourAttachment", lineup_enclosed=True) if pos == 4 else group(name + "Attachment", tank_structure)
        origin = group(name + "Frame", fitting)
        origin.location = radial(ROOT_RADIUS, angle, REAR_SPAR_STATION)
        origin.rotation_euler.z = angle

        # Radial section, Fig. 8-17. The flanged E-beam takes the two bolts from the fin rear spar.
        shape = MeshBuilder()
        add_box(shape, (0.7, 4.2, 13.0), (-1.5, 0, 0))
        add_box(shape, (12.6, 0.45, 9.8), (-8.13, 1.9, 0))
        for side in (-1, 1):
            add_box(shape, (2.4, 3.6, 3.8), (-2.6, 0, side * 2.5))
        if pos == 4:
            add_box(shape, (12.5, 0.66, 4.3), (-8.15, -1.83, -3.0))
        for z in (-5.0, 0, 5.0):
            add_box(shape, (12.8, 4.1, 0.62), (-8.05, 0, z))
        add_box(shape, (1.0, 4.6, 13.4), (-0.55, 0, 0))
        add_box(shape, (8.5, 3.25, 0.65), (4.16, 0, 0))
        shape.build(name + "BeamAndSpar", beam, origin, smooth=False)

        reinforcement = MeshBuilder()
        fasteners = MeshBuilder()
        for side in (-1, 1):
            z = side * 2.45
            # Stepped reinforcement narrows into the small retaining-bolt flange.
            outline = [(-0.12, 1.16), (4.54, 1.16), (4.54, 3.65), (3.58, 3.65), (3.15, 3.79), (2.83, 4.1), (2.68, 4.55), (2.68, 6.24), (-0.12, 6.24)]
            section(reinforcement, [(x, side * h) for x, h in (outline if side == 1 else reversed(outline))], 1.92)
            bolt(fasteners, -3.8, 4.54, z, 0.55)
            bolt(fasteners, -1.85, 2.68, side * 5.55, 0.28)
        reinforcement.build(name + "Blocks", blocks, origin, smooth=False)
        fasteners.build(name + "Bolts", steel, origin, smooth=False)

        if pos == 4:
            # Fig. 8-16: the spacer fills the removed material; a drilled plate bridges the channel web.
            splice = MeshBuilder()
            add_box(splice, (10.4, 0.55, 2.9), (-8.4, -2.28, -3.5))
            add_box(splice, (3, 0.75, 1), (-8.4, -1.57, -3.5))
            splice.build(name + "SpliceAndSpacer", blocks, origin, smooth=False)
            rivets = MeshBuilder()
            for x in (-12.4, -10.4, -6.4, -4.4):
                for z in (-4.35, -2.65):
                    rivets.tube(Vector((x, -2.42, z)) * IN, Vector((x, -2.82, z)) * IN, 0.22 * IN, segs=8)
            rivets.build(name + "SpliceFasteners", steel, origin, smooth=False)
