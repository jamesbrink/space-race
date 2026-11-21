"""A crewman on the Moon's surface: the A7L or A7LB extravehicular suit, the portable life-support system and the oxygen purge
system on his back, the visor assembly over his helmet, the outer gloves and the lunar overshoes, standing on the crew's
walking skeleton (srlib.FIGURE) so the gait walks him (walking.md). Body in cm as a7l.py has it; the pack in inches, as its
sources give it. See a7l.md, "On the Moon"."""

import math

import bpy
from mathutils import Matrix, Vector

import a7l
import figurelib as fl
from lunar_riders import leva
from srlib import CM, IN, MeshBuilder

# The portable life-support system: "26 inches high, 17.8 inches wide, and 10.5 inches deep" (the -6, Apollo 11 to 14) and
# "26 inches high, 20.5 inches wide, and 10.5 inches deep" (the -7, Apollo 15 to 17); the oxygen purge system on top of it
# "18.4 inches long, 10 inches high, and 8 inches deep" (Grumman, Lunar Module News Reference, Portable Life Support System,
# p. P-1 and P-4, of each edition; TN D-8093 fig. 33 has the -6 at 26.44 by 17.84 by 10.5 in at its base, 8.43 at its top).
PLSS = {6: (17.8, 10.5, 26), 7: (20.5, 10.5, 26)}
OPS = (18.4, 8, 10)
# Where it rides on the back: its foot a hand's breadth under the waist and its face on the suit's back, estimated from the
# surface photographs (AS11-40-5903, AS15-86-11603), so that the purge unit's top is about level with the helmet's.
PACK_FOOT = -12  # cm, from the waist
PACK_FACE = 14.6  # cm, behind the body's axis: clear of the suit's back where it is deepest, the shoulder blades
GAP = 0.2  # cm between what is stacked on the pack and the pack (no two faces within a millimetre: srlib.check_clearance)


def pack(plss):
    """The two boxes on his back, their straps and the remote control unit on his chest (riders' estimates), in the Torso."""
    body = fl.B
    trunk = fl.group("Torso")
    white = a7l.paint("lrv-emu-thermal-cloth", (0.87, 0.85, 0.79), roughness=0.87, double_sided=True)
    black = a7l.paint("lrv-emu-dark-trim", (0.12, 0.12, 0.115), roughness=0.68)
    hoses = a7l.paint("lrv-suit-hoses", (0.42, 0.41, 0.38), roughness=0.75)
    case, ops, trim, rcu, lines, antenna = (MeshBuilder() for _ in range(6))
    width, depth, height = (v * IN / CM for v in PLSS[plss])
    foot = body.waist_z + PACK_FOOT
    case.box((width, depth, height), Matrix.Translation(Vector((0, PACK_FACE + depth / 2, foot + height / 2))))
    across, deep, tall = (v * IN / CM for v in OPS)
    ops.box((across, deep, tall), Matrix.Translation(Vector((0, PACK_FACE + deep / 2, foot + height + GAP + tall / 2))))
    # (the straps across the case's back, top and bottom, and round the foot of the purge unit)
    for z in (foot + 2.5, foot + height - 2.5):
        trim.box((width + 0.6, 0.5, 1.4), Matrix.Translation(Vector((0, PACK_FACE + depth + GAP + 0.25, z))))
    trim.box((across + 2 * GAP + 0.4, deep + 2 * GAP + 0.4, 1.2), Matrix.Translation(Vector((0, PACK_FACE + deep / 2, foot + height + GAP + 0.9))))
    # the remote control unit on the chest, and the lines from the pack round the waist to the suit's connectors (as the riders')
    rcu.box((18.2, 7.5, 10), Matrix.Translation(Vector((0, -18.0, body.waist_z + 23.7))))
    for sign in (-1, 1):
        run = [
            (sign * 14.6, PACK_FACE + 2.5, body.waist_z + 3.2),
            (sign * 20.7, 11, body.waist_z + 7.8),
            (sign * 22.1, -2.4, body.waist_z + 6.4),
            (sign * 17, -13.1, body.waist_z + 6.8),
            (sign * 10, -16.5, body.waist_z + 9.8),
        ]
        for a, b in zip(run, run[1:], strict=False):
            lines.tube(a, b, 1.08, 12)
    top = foot + height + GAP + tall
    antenna.tube((across / 2 - 3, PACK_FACE + deep / 2, top), (across / 2 - 3, PACK_FACE + deep / 2, top + 14), 0.32, 10)
    fl.emit(case, "Torso_PortableLifeSupport", white, trunk)
    fl.emit(ops, "Torso_OxygenPurgeSystem", white, trunk)
    fl.emit(trim, "Torso_PackStraps", black, trunk)
    fl.emit(rcu, "Torso_RemoteControlUnit", white, trunk)
    fl.emit(lines, "Torso_SuitHoses", hoses, trunk)
    fl.emit(antenna, "Torso_PackAntenna", black, trunk)


def standing(who, stature, *, a7lb, commander, plss):
    """`who` as he walked on the Moon, `stature` in cm (his press kit's height: the suit adds to it)."""
    a7l.fit(who, stature)
    fl.start()
    a7l.garment(who, ev=True, a7lb=a7lb)
    leva(commander)
    pack(plss)
    # (on a shorter man's figure the garment's wrist and neck rings come within a millimetre of the glove and the cloth they
    # meet: the wrist rings are let out a little about their own middles, as the J suits' are in a7l.py, and the neck ring
    # taken in, estimated)
    for name, k in (("Gloves_WristLeft", 1.07), ("Gloves_WristRight", 1.07), ("Helmet_NeckRing", 0.98)):
        ring = bpy.data.objects.get(name)
        if ring:
            middle = sum((v.co for v in ring.data.vertices), Vector()) / len(ring.data.vertices)
            ring.data.transform(Matrix.Translation(middle) @ Matrix.Scale(k, 4) @ Matrix.Translation(-middle))
    fl.rig_standing()
    # (the visor assembly's shell lies over the pressure bubble: the bubble goes, the head and the eyes stay for the walk's eye level)
    bubble = bpy.data.objects.get("Helmet_PressureBubble")
    if bubble:
        bpy.data.objects.remove(bubble, do_unlink=True)
    if commander:
        a7l.commander_bands()
    # the outer gloves and the lunar overshoes over the pressure garment's (as the rover's riders: lunar_riders.py)
    glove = bpy.data.objects["Gloves_PressureGloves"]
    glove.data.materials[0] = a7l.paint("lrv-emu-outer-gloves", (0.66, 0.65, 0.61), roughness=0.85)
    for tag in ("Upper", "Laces", "Sole", "Tongue"):
        boot = bpy.data.objects.get("Boots_" + tag)
        if boot:
            boot.data.materials[0] = a7l.paint("lrv-emu-overshoe", (0.36, 0.37, 0.37), roughness=0.86)
    suit = "A7LB" if a7lb else "A7L"
    inches = math.floor(stature / 2.54 * 2) / 2
    return f"{who} on the Moon: {suit} extravehicular suit, PLSS -{plss} and purge system, visor assembly, overshoes; {inches} in stature"
