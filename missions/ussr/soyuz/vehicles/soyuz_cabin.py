"""An early Soyuz descent cabin, in millimetres from the spacecraft engine end. See cabin.md."""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

import cabin_shade
import flight_suit
import soyuz_sirius
import srlib
from srlib import MeshBuilder, group, material

MM = 0.001
HIP = (0, 0, 2690)
OUTBOARD_COUCH_Y = -14  # fore-aft offset clears the liner at the outer feet and headrests
PANEL = (0, -560, 3480)
LAMP = (405, -610, 3150)
LAMP_WITH_OUTBOARD_CREW = (620, -530, 3150)
LAMP_AIM = Vector((-0.6, 0.7, 0.4)).normalized()


def at(point):
    return Matrix.Translation(point)


def hung(mesh, name, mat, parent, **kwargs):
    mesh.verts = [tuple(MM * n for n in v) for v in mesh.verts]
    return mesh.build(name, mat, parent, **kwargs)


def upholstery():
    return {
        "frame": material("soyuz-couch-alloy", (0.42, 0.45, 0.44), 0.58, 0.42, double_sided=True),
        "liner": material("soyuz-liner-olive", (0.16, 0.15, 0.086), 0.0, 0.78),
        "strap": material("soyuz-webbing", (0.25, 0.22, 0.16), 0.0, 0.88, double_sided=True),
    }


def couches(parent, pilot, port, starboard, *, seated_figure, omitted_couch):
    """Kazbek shells on their shared support, with the commander in the centre."""
    mats = upholstery()
    shells, cushions, straps = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # Stations across a couch, contoured beneath the shoulders, hips, knee bend and raised heels.
    profile = [
        (-815, 102, -93),
        (-737, 135, -101),
        (-550, 202, -112),
        (-380, 212, -134),
        (-175, 220, -143),
        (30, 186, -153),
        (160, 197, -41),
        (239, 187, 104),
        (405, 171, 112),
        (580, 156, 116),
        (704, 140, 135),
    ]

    def loft(mesh, x, shoulder_shift, scale, rim, height):
        def point(u, i):
            y, width, z = profile[i]
            return (x + u * (width + rim) * scale, scale * y + shoulder_shift, HIP[2] + z + height + 65 * u**4)

        mesh.grid(point, [-1, -0.85, -0.6, -0.3, 0, 0.3, 0.6, 0.85, 1], list(range(len(profile))))

    positions = ((0, pilot, "Commander"), (-515, port, "Port"), (515, starboard, "Starboard"))
    for x, wearer, name in sorted(positions):
        if name == omitted_couch:
            continue
        scale = 0.78 if x and not wearer else 1.0
        shoulder_shift = OUTBOARD_COUCH_Y if x and wearer else 0
        loft(shells, x, shoulder_shift, scale, 18, -23)
        loft(cushions, x, shoulder_shift, scale, 0, 0)
        for y, z in ((-435, 2440), (205, 2440)):
            shells.tube((x - 215, y, z), (x + 215, y, z), 21, 16)
            for side in (-1, 1):
                shells.tube((x + side * 165, y, z), (x + side * 165, y, 2540), 17, 14)
        if x and not wearer:
            for side in (-1, 1):
                straps.ribbon([(x + side * 122, -460 * scale, 2660), (x + side * 92, -270 * scale, 2600), (x + side * 36, -30, 2585)], (1, 0, 0), 36)
    hung(shells, "Kazbek_Frames", mats["frame"], parent)
    hung(cushions, "Kazbek_Liners", mats["liner"], parent)
    if straps.verts:
        hung(straps, "Kazbek_Webbing", mats["strap"], parent)

    for x, wearer, name in positions:
        if wearer is None:
            continue
        occupant = group(f"Crew_{wearer.name}", parent)
        place = at(Vector((x, OUTBOARD_COUCH_Y if x else 0, HIP[2])) * MM)
        keys = seated_figure(occupant, place, wearer.name, wearer)
        eyes, look, up = (Vector(keys[key]) for key in ("eyes", "look", "crown"))
        if x:
            # The outboard cosmonauts look in toward the shared instrument board.
            turn = Matrix.Rotation(math.radians(-math.copysign(32, x)), 3, "Y")
            look, up = turn @ look, turn @ up
        seat = group(f"Seat_{name}", parent)
        seat.matrix_local = at(place @ (eyes * 0.01)) @ Matrix(((-look).cross(up), -look, up)).transposed().to_4x4()


def fittings(parent, lamp_position, *, crewed_outboard=False):
    """Bracket-mounted equipment leaves the two side portholes open."""
    box = material("soyuz-equipment-grey", (0.37, 0.41, 0.39), 0.32, 0.58)
    dark = material("soyuz-cable-black", (0.066, 0.068, 0.058), 0.0, 0.8)
    light = material("soyuz-cabinlight-lens", (0.88, 0.87, 0.75), 0.0, 0.34, emission=(1.0, 0.94, 0.77), emission_strength=0.55)
    units, leads, lamp = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for side in (-1, 1):
        for y, z, sy in ((425, 3265, 168), (340, 3475, 130), (-346, 3080, 180)):
            x = side * 655
            units.box((137, sy, 106), at((x, y, z)))
            for port in (-26, 26):
                leads.tube((x + port, y - sy / 2 - 20, z), (x + port, y - sy / 2 + 11, z), 10)
                leads.tube((x + port, y - sy / 2 - 20, z), (x + port, y - sy / 2 - 65, z - 90), 6)
    for y, radius in ((-186, 48), (202, 39)):
        x = 265 if crewed_outboard and y > 0 else 369
        units.box((97, 125, 70), at((x, y, 2865)))
        leads.tube((x, y, 2890), (x - 14, y + 22, 2996), 15, 18)
        leads.lathe([(22, 0), (23, 20), (21, 65), (15, 75), (0, 75)], 20, matrix=srlib.frame((x - 14, y + 22 - radius, 2996), (0, 1, 0)))
    for side in (-1, 1):
        for y, z in ((425, 3265), (340, 3475), (-346, 3080)):
            units.tube((side * 709, y, z), (side * 833, y, z), 18, 14)
    lamp_frame = srlib.frame(lamp_position, LAMP_AIM)
    units.box((118, 172, 32), lamp_frame @ at((0, 0, -22)))
    for bracket in (-50, 50):
        start = lamp_frame @ Vector((bracket, 0, -36))
        units.tube(start, start - 255 * LAMP_AIM, 15, 16)
    lamp.box((91, 137, 11), Matrix.Identity(4))
    hung(units, "Cabin_Equipment", box, parent)
    hung(leads, "Cabin_Wiring", dark, parent)
    light_node = hung(lamp, "Lamp_1", light, parent)
    light_node.matrix_local = srlib.frame(Vector(lamp_position) * MM, LAMP_AIM)


def rendezvous_controls(parent, *, crewed_outboard=False):
    """Beregovoy's three-axis hand controls, with mounts and grip forms reconstructed."""
    support = material("soyuz-control-mount", (0.35, 0.38, 0.34), 0.48, 0.54)
    grip = material("soyuz-control-grip", (0.055, 0.063, 0.050), 0.04, 0.72)
    metal, handles = MeshBuilder(), MeshBuilder()
    for side in (-1, 1):
        x = side * (290 if crewed_outboard else 367)
        width = 49 if crewed_outboard else 113
        base = 2711 if crewed_outboard else 2720
        metal.box((width, 126, 48), at((x, -282, base)))
        metal.tube((x + side * (width / 2 - 3.5), -282, base - 10), (side * 477, -245, 2615), 14, 14)
        metal.tube((x, -282, base + 14), (x, -263, 2828), 15, 16)
        handles.lathe([(19, 0), (26, 12), (24, 31), (33, 70), (29, 92), (13, 97), (0, 97)], 24, matrix=at((x, -263, 2812)))
        handles.tube((x, -267, 2895), (x, -287, 2895), 10, 12)
    hung(metal, "SA_HandControlMounts", support, parent)
    hung(handles, "SA_HandControls", grip, parent)


def lining(parent):
    """The inward face and return-module floor, clear of the mission model's outer quilt and window sleeves."""
    from soyuz_7kok import DESCENT, metres, polar

    wall = material("soyuz-cabin-lining", (0.61, 0.59, 0.44), 0.08, 0.82)
    mesh = MeshBuilder()
    inner = [(0, 2470), (967, 2470), *((r - (66 if z == 3400 else 52), z) for r, z in DESCENT if z >= 2540)]
    rings = []
    for (ra, za), (rb, zb) in zip(inner, inner[1:]):
        count = math.ceil(math.hypot(rb - ra, zb - za) / 52)
        for i in range(count):
            t = i / count
            rings.append((ra + (rb - ra) * t, za + (zb - za) * t))
    rings.append(inner[-1])
    mesh.lathe(rings, 96, flip=True)
    skin = hung(mesh, "SA_CabinLiner", wall, parent)
    bpy.context.view_layer.update()
    openings = []
    for az in (0, 180):
        tilt = math.radians(12)
        out = Vector(polar(math.cos(tilt), az, math.sin(tilt)))
        port = metres(polar(981, az, 3400))
        srlib.bore([skin.name], srlib.frame(port, out), 0.104, 0.26)
        openings.append(cabin_shade.disc(port, -out, 0.082))
    # The closed transfer hatch has a separate inward face. The outer lid faces
    # out toward the orbital room, so it cannot close the view from the couch.
    hatch, latch = MeshBuilder(), MeshBuilder()
    hatch.lathe([(0, 4443), (301, 4443), (315, 4435), (335, 4435), (345, 4443)], 72)
    latch.tube((-86, -69, 4425), (-86, 69, 4425), 9, 16)
    latch.tube((-86, -69, 4425), (-86, -69, 4449), 6, 12)
    latch.tube((-86, 69, 4425), (-86, 69, 4449), 6, 12)
    liner_hatch = hung(hatch, "SA_InwardHatchFace", wall, parent)
    hatch_latch = hung(latch, "SA_InwardHatchHandle", material("soyuz-hatch-handle", (0.29, 0.33, 0.30), 0.3, 0.58), parent)
    srlib.mark_shells([skin.name, liner_hatch.name, hatch_latch.name])
    return openings


def build(
    pilot: flight_suit.Wearer | None = None,
    *,
    hand_controls=False,
    port: flight_suit.Wearer | None = None,
    starboard: flight_suit.Wearer | None = None,
    seated_figure=flight_suit.build_seated,
    omitted_couch=None,
    extra_equipment=None,
):
    """Build the descent cabin in the spacecraft frame, at the detailed level only."""
    cabin = group("Cabin", lineup_enclosed=True)
    seats = group("Couches", lineup_enclosed=True)
    extras = (extra_equipment(),) if extra_equipment else ()
    if not srlib.interior():
        return
    openings = lining(cabin)
    soyuz_sirius.build(cabin, at(PANEL) @ Matrix.Rotation(math.radians(168), 4, "X"))
    crewed_outboard = port is not None or starboard is not None
    lamp_position = LAMP_WITH_OUTBOARD_CREW if crewed_outboard else LAMP
    fittings(cabin, lamp_position, crewed_outboard=crewed_outboard)
    couches(seats, pilot or flight_suit.KOMAROV, port, starboard, seated_figure=seated_figure, omitted_couch=omitted_couch)
    if hand_controls:
        rendezvous_controls(cabin, crewed_outboard=crewed_outboard)
    bpy.context.view_layer.update()
    meshes = [obj for obj in cabin_shade.meshes_under(cabin, seats, *extras) if obj.name != "Lamp_1"]
    lens_point = (Vector(lamp_position) + 6 * LAMP_AIM) * MM
    lamp_sources = (("Lamp_1", lens_point, cabin_shade.disc(lens_point, LAMP_AIM, 0.04)),)
    cabin_shade.bake(meshes, meshes, lamp_sources, openings, broad=("Sirius_Main_body", "Kazbek_Liners", "SA_CabinLiner"))
