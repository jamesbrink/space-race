"""Skylab A7LB launch garments. Centimetres and placement estimates against the flown suits; see a7lb.md."""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apollo/crew"))
import a7l  # noqa: E402
import figurelib as fl  # noqa: E402
from a7lb_emblems import sleeve_emblems  # noqa: E402
from srlib import MeshBuilder, frame, load_font, text_mesh  # noqa: E402

# Wearer's right to left, relative to the pattern's waist and front centreline. Compare NASM A19761192000 and A19761196000.
COUPLINGS = ((-0.91, 4, False), (-0.85, 13, False), (-0.13, 4.5, True), (-0.03, 13, True), (0.64, 11.5, True), (0.74, 19.7, True))


def launch_webbing(parent, body, shoulder_inset):
    """The two brown shoulder straps visible on Conrad at suit-up and on Weitz in the rehearsal photograph."""
    mesh = bpy.data.objects["Torso_BetaCloth"].data
    mesh.calc_loop_triangles()
    shell = BVHTree.FromPolygons([v.co for v in mesh.vertices], [t.vertices[:] for t in mesh.loop_triangles], all_triangles=True)
    webbing = MeshBuilder()
    for sign in (-1, 1):

        def strap(across, sweep, side=sign):
            # A ray in the sagittal plane drapes the webbing continuously over the shoulder.
            direction = Vector((0, -math.cos(sweep), math.sin(sweep)))
            middle = Vector(((15.0 + across - shoulder_inset * math.sin(sweep)) * side * fl.CM, 0, (body.waist_z + 22) * fl.CM))
            hit, _, _, _ = shell.ray_cast(middle + direction, -direction, 1)
            return (hit + direction * (0.010 + 0.008 * max(0, direction.y))) / fl.CM

        webbing.grid(strap, [i * 0.2 for i in range(-7, 8)], [math.pi * i / 128 for i in range(129)], flip=sign < 0)
    fl.emit(webbing, "Torso_ShoulderWebbing", a7l.paint("skylab-launch-webbing", (0.20, 0.11, 0.055), roughness=0.91), parent)


def launch_suit(who, inches, emblem, *, shoulder_inset=2.15, chest_emblem=None):
    a7l.fit(who, inches * 2.54)
    # Seat the garment under the rigid neck ring at each stature.
    fl.B.torso[-3:] = [(z, x - 1.0, y - 1.0) for z, x, y in fl.B.torso[-3:]]
    z, x, y = fl.B.torso[-1]
    fl.B.torso[-1] = (z - 0.55, x, y)
    fl.start()
    a7l.garment(who, a7lb=True, ev=True, insignia=None if chest_emblem else emblem, sleeve_emblems=sleeve_emblems, chest_layout=COUPLINGS)
    body = fl.B
    torso = fl.Tube([(0, 0, z) for z, _, _ in body.torso], [(x, y) for _, x, y in body.torso], resample=10)
    parent = bpy.data.objects["Torso"]
    if chest_emblem:
        chest_emblem(torso, parent, emblem)
    launch_webbing(parent, body, shoulder_inset)
    waist = body.waist_z - body.torso_z0

    def point(angle, height, lift):
        return torso.at(waist + height, angle - math.pi / 2, lift)

    # The narrow blue fitting and metal loop can be distinguished between the two large coupling clusters.
    small = MeshBuilder()
    az = -0.44
    small.lathe(
        [(0, 0), (1.55, 0), (1.55, 1.0), (1.15, 1.8), (0, 1.8)], 20, matrix=frame(point(az, 15.5, 0), torso.normal(waist + 15.5, az - math.pi / 2))
    )
    fl.emit(small, "Torso_AuxiliaryFitting", bpy.data.materials["apollo-suit-anodised-blue"], parent)
    loop = MeshBuilder()
    profile = [(-0.47, 20.5, 0.2), (-0.47, 20.4, 1.8), (-0.43, 19, 2.1), (-0.34, 19, 2.1), (-0.30, 20.4, 1.8), (-0.30, 20.5, 0.2)]
    for a, b in zip(profile, profile[1:]):
        loop.tube(point(*a), point(*b), 0.30, 12)
    fl.emit(loop, "Torso_Ring", bpy.data.materials["apollo-suit-aluminium"], parent)

    # Tape and individual name on the upper chest, next to the flight emblem in S73-25901.
    tape = MeshBuilder()
    torso.patch(tape, waist + 24.4, waist + 27.0, -1.95, -1.39, 0.40)
    fl.emit(tape, "Torso_NameTape", a7l.paint("skylab-name-tape", (0.73, 0.72, 0.65)), parent)
    verts, faces = text_mesh(who.upper(), 1.6, load_font(), cuts=1)
    width = max(x for x, _, _ in verts)
    letters = MeshBuilder()
    letters.add([point(-0.10 + (x - width / 2) / 18, 25.1 + y, 0.65) for x, y, _ in verts], faces)
    fl.emit(letters, "Torso_" + who, a7l.paint("skylab-name-ink", (0.04, 0.045, 0.05)), parent)
    fl.rig_standing()
    return f"{who}, Skylab A7LB launch pressure garment"
