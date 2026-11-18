"""Visible Sokol-K suit in the Kazbek couch. Outer appearance estimated from Zvezda photos."""

import math

import bpy
from mathutils import Vector

import flight_suit
from srlib import MeshBuilder, frame, material


def build_seated(parent, place, prefix, wearer):
    # Keep the existing posed human anatomy and preserve its eye datum.
    keys = flight_suit.build_seated(parent, place, prefix, wearer)
    white = bpy.data.materials.get("suit-sokol-k-outer") or material("suit-sokol-k-outer", (0.8, 0.79, 0.72), roughness=0.84)
    blue = bpy.data.materials.get("suit-sokol-k-binding") or material(
        "suit-sokol-k-binding", (0.048, 0.112, 0.275), roughness=0.63, double_sided=True
    )
    graphite = bpy.data.materials.get("sokol-k-rubber") or material("sokol-k-rubber", (0.063, 0.059, 0.053), roughness=0.83)
    glass = bpy.data.materials.get("glass-visor-sokol-k") or material(
        "glass-visor-sokol-k", (0.57, 0.69, 0.72), roughness=0.14, alpha=0.15, double_sided=True
    )
    for obj in list(parent.children):
        if obj.type != "MESH":
            continue
        name = obj.name.removeprefix(prefix + "_")
        if name.startswith(("Torso_", "Arms_", "Legs_", "Boots_Uppers", "Boots_Tongues", "Gloves_")):
            obj.data.materials[0] = white
        elif name.startswith("Boots_Soles"):
            obj.data.materials[0] = graphite
        elif name == "Helmet_Cap":
            bpy.data.objects.remove(obj, do_unlink=True)
        elif name == "Helmet_Earphones":
            obj.data.materials[0] = blue

    eye = place @ (0.01 * Vector(keys["eyes"]))
    up = (place.to_3x3() @ Vector(keys["crown"])).normalized()
    look = (place.to_3x3() @ Vector(keys["look"])).normalized()
    right = look.cross(up).normalized()
    origin = eye - 0.031 * up + 0.019 * look
    angles = [math.tau * i / 48 for i in range(48)]
    hood, rim, visor, chest, hardware = (MeshBuilder() for _ in range(5))

    def mould(angle, row):
        radius_x, radius_y, depth = row
        return origin + radius_x * math.cos(angle) * right + radius_y * math.sin(angle) * up + depth * look

    # The helmet is a continuous soft hood behind the hinged visor.
    hood.grid(
        mould,
        angles,
        [(0.115, 0.134, -0.008), (0.125, 0.139, -0.04), (0.126, 0.138, -0.113), (0.115, 0.125, -0.174), (0, 0, -0.221)],
        closed_u=True,
        uv=lambda angle, row: (angle / math.tau, row[2]),
    )
    rim.grid(
        mould,
        angles,
        [(0.115, 0.134, -0.008), (0.118, 0.137, 0.005), (0.106, 0.125, 0.010)],
        closed_u=True,
        uv=lambda angle, row: (angle / math.tau, row[2]),
        flip=True,
    )
    visor.grid(
        lambda angle, arc: mould(angle, (0.106 * math.cos(arc), 0.125 * math.cos(arc), 0.013 + 0.094 * math.sin(arc))),
        angles,
        [math.pi * i / 22 for i in range(12)],
        closed_u=True,
        flip=True,
    )
    # Pressure visor hinge details and a closure crossing the chest. Positions are by eye.
    for side in (-1, 1):
        axis = side * right
        hinge = eye - 0.046 * up - 0.021 * look + 0.122 * axis
        hardware.disc(hinge, axis, 0.018, 0.014, 20)
    shoulders = [place @ (0.01 * Vector(p)) for p in keys["shoulders"].values()]
    shoulder = (shoulders[0] + shoulders[1]) / 2
    core = shoulder + 0.134 * look
    chest.ribbon(
        [core + 0.09 * up - 0.13 * right, core + 0.055 * up - 0.09 * right, core + 0.029 * up, core + 0.009 * up + 0.128 * right],
        up,
        0.021,
    )
    valve = core - 0.137 * up + 0.084 * right + 0.033 * look
    hardware.lathe([(0.028, 0), (0.028, 0.006), (0.018, 0.014), (0, 0.015)], 32, matrix=frame(valve, look))
    hood.build(f"{prefix}_Helmet_SokolHood", white, parent)
    rim.build(f"{prefix}_Helmet_SokolRim", blue, parent)
    visor.build(f"{prefix}_Helmet_SokolVisor", glass, parent)
    chest.build(f"{prefix}_Torso_SokolClosure", blue, parent)
    hardware.build(f"{prefix}_Helmet_SokolFittings", graphite, parent)
    return keys
