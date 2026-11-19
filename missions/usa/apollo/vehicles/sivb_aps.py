"""J-mission S-IVB auxiliary propulsion modules. Inch envelopes estimated from NESC-IB-22-05, figs. D.1–D.3."""

import math

import bpy
from mathutils import Matrix, Vector

import saturn_structure as structure
from srlib import IN, MeshBuilder, bore, frame, group, mark_shells, material, prof


def propulsion_pods(stage, stage_radius, aft, white, steel, alloy, serial):
    tank_paint = material("sivb-aps-tank", (0.53, 0.48, 0.37), metallic=0.63, roughness=0.45)
    # A pitch jet looks radially out, two roll/yaw jets look across the stage, and one ullage jet looks aft.
    # Each fairing follows the stage skin until it tapers to a nose. Each engine looks through an opening.
    for number, sign in ((1, 1), (2, -1)):
        prefix = f"SIVB{serial}_APS{number}_"
        position = (0, sign * (stage_radius - 1.6) * IN, aft * IN)
        azimuth = sign * math.pi / 2
        cover = group(prefix + "OuterCover", stage)
        cover.location, cover.rotation_euler.z = position, azimuth
        skin = MeshBuilder()
        profiles = [(z, 17, 17) for z in (16, 21, 25, 28, 31, 34, 37, 40)] + [(67, 17, 17), (75, 15.2, 15.4), (85, 10, 11), (97, 5, 6), (106, 0.6, 1)]
        angles = [math.pi * (i / 24 - 0.5) for i in range(25)]
        skin.grid(
            lambda a, row: (profiles[row][1] * math.cos(a) * IN, profiles[row][2] * math.sin(a) * IN, profiles[row][0] * IN),
            angles,
            range(len(profiles)),
        )
        # The aft heat shield is a D-shaped plate with a circular hole around the ullage nozzle.
        perimeter = [(17 * math.cos(a), 17 * math.sin(a)) for a in angles] + [(0, y) for y in range(15, -17, -2)]
        outer = [(x * IN, y * IN, 16 * IN) for x, y in perimeter]
        inner = []
        for x, y in perimeter:
            a = math.atan2(y, x - 7)
            inner.append(((7 + 4.2 * math.cos(a)) * IN, 4.2 * math.sin(a) * IN, 16 * IN))
        count = len(perimeter)
        skin.add(outer + inner, [(i, count + i, count + (i + 1) % count, (i + 1) % count) for i in range(count)])
        shell = skin.build(prefix + "Fairing", white, cover)
        mark_shells([shell.name])
        bpy.context.view_layer.update()

        package = group(f"ThirdStageAPS{number}")
        mount = group(prefix + "Mount", package)
        mount.location, mount.rotation_euler.z = position, azimuth
        # A backplate carries the tank restraints and jet valves against the skirt. Section sizes are estimated.
        rack = MeshBuilder()
        for y in (-13.2, 13.2):
            rack.box((2.4 * IN, 1.5 * IN, 46 * IN), Matrix.Translation(Vector((4.0, y, 43)) * IN))
        for z in (24, 37.5):
            rack.box((2.8 * IN, 26.8 * IN, 1.8 * IN), Matrix.Translation(Vector((4.0, 0, z)) * IN))
        rack.box((5.5 * IN, 13.3 * IN, 11.5 * IN), Matrix.Translation(Vector((5.9, 0, 28)) * IN))
        rack.build(prefix + "EquipmentFrame", alloy, mount, smooth=False)
        for label, y, radius in (("Fuel", -6.7, 5), ("Oxidizer", 6, 6.5)):
            tank = MeshBuilder()
            structure.turn(tank, [(radius * r, z) for r, z in ((0.15, 39.5), (0.8, 41), (1, 44), (1, 61), (0.83, 64), (0.15, 66))], (8, y, 0))
            tank.build(prefix + label + "Tank", tank_paint, mount)
            clamps = MeshBuilder()
            for z in (48, 59):
                structure.band(clamps, radius + 0.33, z, 0.37, 1.1, (8, y, 0))
            clamps.build(prefix + label + "Restraints", alloy, mount)
        helium = MeshBuilder()
        structure.ball(helium, (6, -5, 72.1), 5)
        helium.build(prefix + "HeliumSphere", alloy, mount)
        lines = MeshBuilder()
        for y in (-6.7, 6):
            structure.pipe(lines, [(8, y, 39.5), (8, y, 38), (6, y * 0.4, 36), (6, y * 0.4, 29)], 0.53)
            structure.pipe(lines, [(5, -5 + (1 if y > 0 else -1) * 2.4, 68.2), (3.1, y, 66.8), (3.1, y, 64), (5.1, y, 63.4)], 0.4)
        lines.build(prefix + "FeedLines", alloy, mount)
        for label, point, direction, scale in (
            ("Pitch", (7, 0, 33), (1, 0, 0.36), 1),
            ("RollYawLeft", (5.5, -6, 28), (0, -1, 0), 1),
            ("RollYawRight", (5.5, 6, 28), (0, 1, 0), 1),
            ("Ullage", (7, 0, 24), (0, 0, -1), 0.82),
        ):
            body = MeshBuilder()
            axis = frame(Vector(point) * IN, direction) @ Matrix.Scale(scale, 4)
            lip = frame(Vector(point) * IN + Vector(direction).normalized() * (11.2 * scale * IN), direction)
            if label != "Ullage":
                bore([shell.name], cover.matrix_world @ lip, (4 * scale + 0.75) * IN, 5.5 * IN)
            body.lathe(
                prof([(0, 0), (2.8, 0), (2.8, 1.9), (2.3, 2.4), (2.5, 5.1), (1.5, 6.3), (2.2, 8.4), (4, 11.2), (3.7, 11.25), (1.3, 6.7), (0, 6.7)]),
                segs=28,
                matrix=axis,
            )
            body.build(prefix + label + "Engine", steel, mount)
