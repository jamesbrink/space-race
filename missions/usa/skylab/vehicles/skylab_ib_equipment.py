"""Shared Skylab Saturn IB stage equipment. All source dimensions are inches."""

import math

import bpy
from mathutils import Matrix, Vector

from apollo_csm import radial
from saturn_structure import ball, turn
from srlib import IN, MeshBuilder, bore, frame, group, interior, mark_shells, material, prof

IU_BASE = 1662.859
AFT_SKIRT = 1186.804


def mount(name, parent, angle, z):
    obj = group(name, parent)
    obj.location = radial(128.9, angle, z)
    obj.rotation_euler.z = angle
    return obj


def fairing(name, parent, sections, mat, cut=False):
    """An open-backed fairing conforming to the stage. Sections give z, half-width and stand-off."""
    mesh = MeshBuilder()
    arc = [math.pi * (i / 24 - 0.5) for i in range(25)]
    sections = sorted(sections)
    mesh.grid(
        lambda a, row: (sections[row][2] * math.cos(a) * IN, sections[row][1] * math.sin(a) * IN, sections[row][0] * IN), arc, range(len(sections))
    )
    shell = mesh.build(name, mat, parent)
    if cut:
        mark_shells([shell.name])
    return shell


def box(name, parent, dims, pos, mat):
    mesh = MeshBuilder()
    mesh.box(Vector(dims) * IN, Matrix.Translation(Vector(pos) * IN))
    return mesh.build(name, mat, parent, smooth=False)


def stage_equipment(serial):
    white = material(f"sa{serial}-equipment-white", (0.79, 0.80, 0.78), roughness=0.62)
    metal = material(f"sa{serial}-mount-alloy", (0.44, 0.48, 0.50), metallic=0.59)
    dark = material(f"sa{serial}-fittings", (0.12, 0.13, 0.15), metallic=0.45)
    retros = group("InterstageRetromotors")
    ullage = group("UllageRockets")
    # Positions I and III. The shorter IB module has three attitude jets, with no fourth aft jet.
    for i, az in enumerate((-90, 90), 1):
        pod = mount(f"SA{serial}_APS{i}", group(f"StageAttitudeModule{i}"), math.radians(az), AFT_SKIRT + 2)
        cover = group(f"SA{serial}_APSCover{i}", pod)
        shell = fairing(
            f"SA{serial}_APS{i}_Fairing",
            cover,
            [(0, 1, 1), (7, 12, 10), (16, 15, 17), (20, 15, 17), (25, 15, 17), (55, 15, 17), (65, 13, 13), (80, 1, 1)],
            white,
            cut=True,
        )
        if interior():
            equipment = MeshBuilder()
            for y in (-5, 5):
                turn(equipment, [(0, 26), (3, 27), (4.5, 30), (4.5, 48), (3.5, 51), (0, 52)], (5, y, 0))
            ball(equipment, (5.5, 0, 60), 4.7)
            equipment.build(f"SA{serial}_APS{i}_PressureVessels", metal, pod)
        # Three open jet bells behind separate openings in the removable fairing.
        bpy.context.view_layer.update()
        for j, (x, y, z, dx, dy) in enumerate(((17, 0, 21, 1, 0), (6, -14.2, 16, 0.25, -1), (6, 14.2, 16, 0.25, 1)), 1):
            mesh = MeshBuilder()
            axis = Vector((dx, dy, 0)).normalized()
            lip = frame(Vector((x, y, z)) * IN, axis)
            bore([shell.name], pod.matrix_world @ lip, 3.2 * IN, 5.0 * IN)
            mesh.lathe(prof([(0, -9), (2.5, -9), (2.5, -6), (1.35, -4.5), (2.8, 0.45), (2.53, 0.45), (1.15, -4.4), (0, -4.4)]), segs=24, matrix=lip)
            mesh.build(f"SA{serial}_APS{i}_Engine{j}", dark, pod)
    for i in range(4):
        pod = mount(f"SA{serial}_Retro{i}", retros, math.radians(i * 90), 980)
        fairing(f"SA{serial}_Retro{i}_Fairing", pod, [(0, 2, 1), (11, 8, 8), (110, 8, 8), (134, 7, 7), (144, 1, 1)], white)
    for i in range(3):
        pod = mount(f"SA{serial}_Ullage{i}", ullage, math.radians(30 + i * 120), AFT_SKIRT + 4)
        fairing(f"SA{serial}_Ullage{i}_Fairing", pod, [(0, 7, 3), (4, 9, 14), (15, 9, 14), (36, 7, 8), (51, 1, 1)], white)
    return white, metal, dark
