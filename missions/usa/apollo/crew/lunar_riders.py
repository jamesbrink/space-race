"""Two J-mission surface suits in the open rover seats. Body geometry in cm, rover seat datums in inches."""

import math

import bpy
from mathutils import Matrix, Vector

import a7l
import figurelib as fl
from srlib import IN, MeshBuilder, group


def surface_equipment(commander):
    body = fl.B
    helmet = fl.group("Helmet")
    cover, visor, edging, strips = (MeshBuilder() for _ in range(4))
    # The opaque LEVA sun visor is outside the clear pressure bubble. White thermal cover wraps the sides and back.
    z0 = body.neck_z + 14.2

    def shell(a, lat, proud=0):
        return (
            (16.1 + proud) * math.sin(a) * math.cos(lat),
            body.head_y - (17.1 + proud) * math.cos(a) * math.cos(lat),
            z0 + (17.7 + proud) * math.sin(lat),
        )

    def arc(a, b, n):
        return [math.radians(a + (b - a) * i / n) for i in range(n + 1)]

    sides = arc(-180, 180, 48)[:-1]
    cover.grid(shell, sides, arc(47, 90, 8), closed_u=True)
    cover.grid(shell, arc(66, 294, 32), arc(-74, 47, 18))
    cover.grid(shell, arc(-66, 66, 24), arc(-74, -32, 9))
    visor.grid(lambda a, lat: shell(a, lat, 0.2), arc(-66, 66, 28), arc(-32, 47, 16))
    for lat in (-32, 47):
        angles = arc(-66, 66, 28)
        for a, b in zip(angles, angles[1:]):
            edging.tube(shell(a, math.radians(lat)), shell(b, math.radians(lat)), 0.35, 8)
    if commander:
        # Identification stripe over the thermal cover, also visible from the follow camera.
        strips.grid(lambda a, lat: shell(a, lat, 0.22), arc(84, 276, 26), arc(32, 39, 2))
    white = a7l.paint("lrv-emu-thermal-cloth", (0.87, 0.85, 0.79), roughness=0.87, double_sided=True)
    black = a7l.paint("lrv-emu-dark-trim", (0.12, 0.12, 0.115), roughness=0.68)
    fl.emit(cover, "Helmet_OuterThermalCover", white, helmet)
    fl.emit(
        visor, "Helmet_GoldSunVisor", a7l.paint("lrv-emu-sun-visor", (0.55, 0.32, 0.068), metallic=0.89, roughness=0.19, double_sided=True), helmet
    )
    fl.emit(edging, "Helmet_VisorRim", black, helmet)
    if commander:
        fl.emit(strips, "Helmet_CommanderBand", a7l.paint("a7l-commander-red", (0.58, 0.035, 0.025), roughness=0.9), helmet)
    trunk = fl.group("Torso")
    case, rcu, connections, antenna, trim = (MeshBuilder() for _ in range(5))

    def box(mesh, pos, size):
        mesh.box(size, Matrix.Translation(Vector(pos)))

    z = body.waist_z
    # Back package low enough to settle against the open seat. OPS above the main life-support pack.
    box(case, (0, 21.2, z + 13.8), (38.4, 18.4, 40.0))
    box(case, (0, 21.2, z + 38.8), (38.6, 18.8, 9.6))
    for zp in (z + 2.7, z + 28.9):
        box(trim, (0, 30.7, zp), (37.4, 0.42, 1.3))
    box(rcu, (0, -18.0, z + 23.7), (18.2, 7.5, 10))
    for x in (-5, 0, 5):
        connections.tube((x, -21.6, z + 25), (x, -22.5, z + 25), 0.93, 12)
    # Main ventilation lines loop around either side of the waist.
    for sign in (-1, 1):
        run = [
            (sign * 14.6, 14.5, z + 3.2),
            (sign * 20.7, 11, z + 7.8),
            (sign * 22.1, -2.4, z + 6.4),
            (sign * 17, -13.1, z + 6.8),
            (sign * 10, -16.5, z + 9.8),
        ]
        for a, b in zip(run, run[1:]):
            connections.tube(a, b, 1.08, 12)
        box(trim, (sign * 10.7, -14.4, z + 32.8), (2.4, 1.2, 9))
    antenna.tube((13, 24.2, z + 43.4), (13, 24.2, z + 57.8), 0.32, 10)
    fl.emit(case, "Torso_PortableLifeSupportAndOxygenPurge", white, trunk)
    fl.emit(rcu, "Torso_ChestControlUnit", white, trunk)
    fl.emit(trim, "Torso_PackTrimAndStraps", black, trunk)
    fl.emit(connections, "Torso_SuitHosesAndControls", a7l.paint("lrv-suit-hoses", (0.42, 0.41, 0.38), roughness=0.75), trunk)
    fl.emit(antenna, "Torso_BackpackAntenna", black, trunk)


def build(mission):
    people = (("Scott", 72), ("Irwin", 68)) if mission == 15 else (("Young", 69), ("Duke", 71.5))
    for i, (who, height) in enumerate(people):
        name = "LRV_Driver" if i == 0 else "LRV_Passenger"
        root = group(name)
        a7l.fit(who, height * 2.54)
        # Seated pose is estimated from traverse photos. Frame axes are right, feet-ward and chest-forward.
        lean = math.radians(6)
        head = Vector((-math.sin(lean), 0, math.cos(lean)))
        front = Vector((math.cos(lean), 0, math.sin(lean)))
        placement = Matrix((Vector((0, -1, 0)), -head, front)).transposed().to_4x4()
        placement.translation = Vector((-8.7, 14 if i == 0 else -14, 29.2)) * IN
        posture = {"hip": 132, "knee": 116, "ankle": -5, "knees_in": 1, "pelvis": 4, "elbow": 96, "elbow_toe_in": 4, "pronate": 36, "grip": 0.0}

        def dressed(who=who, commander=i == 0):
            a7l.garment(who, ev=True, a7lb=True)
            surface_equipment(commander)

        fl.build_posed(root, placement, who, lambda: fl.seated_rig(posture, (-3, 11.5, 1.2)), dressed)
        if i == 0:
            a7l.commander_bands(who + "_")
        # The opaque lunar visor and outer shell enclose these; this asset is viewed only from outdoors.
        for suffix in a7l.HEAD:
            hidden = bpy.data.objects.get(who + "_Helmet_" + suffix)
            if hidden:
                bpy.data.objects.remove(hidden, do_unlink=True)
        glove = bpy.data.objects[who + "_Gloves_PressureGloves"]
        glove.data.materials[0] = a7l.paint("lrv-emu-outer-gloves", (0.66, 0.65, 0.61), roughness=0.85)
        for tag in ("Upper", "Laces", "Sole", "Tongue"):
            boot = bpy.data.objects.get(who + "_Boots_" + tag)
            if boot:
                boot.data.materials[0] = a7l.paint("lrv-emu-overshoe", (0.36, 0.37, 0.37), roughness=0.86)
    return "two seated A7LB extravehicular suits, oxygen purge and portable life-support packs"
