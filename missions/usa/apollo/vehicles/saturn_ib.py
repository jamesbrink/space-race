"""SA-205 exterior, in inches. NASA Apollo 7 press kit pp. 31–33 and Figure 25a.

Published rounded envelopes constrain the stack. The S-IVB separation plane uses the
AS-205 flight evaluation's rounded station; nozzle exit IDs use the period fact sheets.
Engine contours, fins, paint boundaries and attachments remain provisional.
"""

import math
from pathlib import Path

import bpy
from mathutils import Matrix

import srlib
from apollo_csm import BELL_RIM, SM_BOTTOM, bell, radial, tube
from srlib import IN, TAU, MeshBuilder, frame, group, lathe_obj, mark_shells, material, prof, text_mesh

SIB_TOP = 80.2 * 12
SIVB_TOP = SIB_TOP + 58.4 * 12
IU_TOP = SIVB_TOP + 36
SLA_TOP = IU_TOP + 28 * 12
CSM_OFFSET = SLA_TOP - SM_BOTTOM  # align the SM aft bulkhead at XA838 to the adapter
HEIGHT = 224 * 12  # Figure 25a; height to escape-system Q-ball
RADIUS = 130  # p. 33, 260 in instrument unit and S-IVB interface
# MPR-SAT-FE-68-4, Figure A-1, p.206: vehicle station in inches, rounded.
# The model uses that station directly, not 1187 inches added to the S-IB top.
INTERSTAGE_TOP = 1187.0
# Saturn IB News Reference, changed September 1968, H-1 and J-2 fact sheets
# (PDF pp.45/69): these dimensions are explicitly INSIDE exit diameters.
H1_EXIT_INNER_RADIUS = (3 * 12 + 10) / 2
J2_EXIT_INNER_RADIUS = (6 * 12 + 5) / 2
# MSFC Saturn IB Mission Plan and Technical Information Checklist, revision 18
# (1 August 1968), p.4-8 and Figure 1, p.6-3. These are gimbal-centre radii,
# NOT nozzle-exit radii. The +Z engine axis points inward toward the nose;
# its exhaust points outward. Figure 25 places odd fin lines on the vehicle
# positions and even lines on the outboard engines. Absolute CSM clocking is pending.
H1_GIMBAL_STATION = 100
H1_INBOARD_RADIUS, H1_INBOARD_CANT = 32, 3
H1_OUTBOARD_RADIUS, H1_OUTBOARD_CANT = 95, 6
# Photographic estimates, NOT drawing dimensions: NASA S68-50712 and S68-29781.
# See saturn-ib.md for calibration, uncertainties and font limitations. Heights
# are actual painted capitals, not a font's em size. These never feed physics.
SIB_CAP, SIB_U_WIDTH, SIB_PITCH, SIB_WORD_GAP, SIB_TEXT_TOP = 36, 30, 48, 24, 865
SIB_FIELD_LO, SIB_FIELD_HI, SIB_FIELD_ARC = 240, 900, 40
SIVB_CAP, SIVB_U_WIDTH, SIVB_PITCH = 40, 28, 80
SIVB_TEXT_TOP = SIVB_TOP - 80
SIVB_WHITE_FIELD_LO = SIVB_TOP - 320
PAINT_LIFT = 0.3  # Rendering separation, as srlib.decal; not paint thickness.


def cylinder(name, radius, lo, hi, mat, parent):
    return lathe_obj(name, prof([(radius, lo), (radius, hi)]), mat, parent, segs=128)


def painted_barrel(name, lo, hi, parent, white, black, bands=()):
    """Paint is on the skin, not a second near-coplanar skin above it."""
    mesh = [MeshBuilder(), MeshBuilder()]
    levels = sorted({lo, hi, *[z for start, end in bands for z in (start, end) if lo < z < hi]})
    for i in range(16):
        for z0, z1 in zip(levels, levels[1:]):
            dark = any(start <= (z0 + z1) / 2 <= end for start, end in bands) and i % 4 in (0, 1)
            mesh[int(dark)].lathe(prof([(RADIUS, z0), (RADIUS, z1)]), segs=8, arc=(TAU * i / 16, TAU * (i + 1) / 16))
    for i, m in enumerate(mesh):
        if m.faces:
            m.build(f"{name}_{i}", black if i else white, parent)


def lettering(body, angle, top, radius, height, width, pitch, mat, parent, font, *, centre=(0, 0), word_gap=0):
    """Fit physical capital height and U width, preserving other glyph proportions."""
    reference, _ = text_mesh("U", 1, font)
    u_width = max(p[0] for p in reference) - min(p[0] for p in reference)
    u_height = max(p[1] for p in reference) - min(p[1] for p in reference)
    mesh = MeshBuilder()
    for letter in body:
        if letter == " ":
            top -= word_gap
            continue
        verts, faces = text_mesh(letter, 1, font, cuts=3)
        xs, ys = [p[0] for p in verts], [p[1] for p in verts]
        cx, y0 = (min(xs) + max(xs)) / 2, min(ys)
        # Use measured glyph bounds. A narrow I remains narrow; overshoots in
        # rounded glyphs do not change the requested physical capital height.
        sy = height / (max(ys) - y0)
        sx = width / u_width
        transformed = []
        for x, y, _ in verts:
            a = angle + (x - cx) * sx / radius
            px, py, pz = radial(radius + PAINT_LIFT, a, top - height + (y - y0) * sy)
            transformed.append((px + centre[0], py + centre[1], pz))
        mesh.add(transformed, faces)
        top -= pitch
    obj = mesh.build(f"Letters_{body.replace(' ', '')}_{round(angle, 2)}", mat, parent, smooth=False)
    obj["paint_confidence"] = "estimated"
    obj["paint_cap_height_in"] = height
    obj["paint_u_width_in"] = width
    obj["paint_reference_cap_ratio"] = u_width / u_height


def outer_tank(index, angle, white, black, parent):
    """One tank skin, with its fuel-tank white marking field painted into it."""
    fuel = index % 2 == 1
    profile = [(0, 115), (25, 119), (35, 143), (35, SIB_FIELD_LO), (35, SIB_FIELD_HI), (35, SIB_TOP - 60), (26, SIB_TOP - 38), (0, SIB_TOP - 32)]
    half = SIB_FIELD_ARC / (2 * 35)
    angles = sorted({TAU * i / 64 for i in range(64)} | {half, TAU - half})
    mesh = MeshBuilder()
    mesh.grid(lambda a, j: radial(profile[j][0], a, profile[j][1]), angles, list(range(len(profile))), closed_u=True)
    tank = mesh.build(f"SIB_OuterTank_{index}", black if fuel else white, parent)
    if fuel:
        tank.data.materials.append(white)
        for polygon in tank.data.polygons:
            centre = sum((tank.data.vertices[i].co for i in polygon.vertices), tank.location.copy()) / len(polygon.vertices)
            if SIB_FIELD_LO < centre.z / IN < SIB_FIELD_HI and abs(math.atan2(centre.y, centre.x)) < half:
                polygon.material_index = 1
    tank.rotation_euler.z = angle
    tank.location.x, tank.location.y = radial(93, angle, 0)[:2]
    return tank


def build():
    white = material("saturn-white", (0.86, 0.87, 0.83), roughness=0.64)
    black = material("saturn-black", (0.025, 0.03, 0.035), roughness=0.7)
    steel = material("saturn-engine-steel", (0.22, 0.24, 0.25), metallic=0.7, roughness=0.52)
    red = material("saturn-lettering-red", (0.55, 0.035, 0.02), roughness=0.7)
    # OFL Liberation Sans Regular 2.1.5: a reproducible light sans substitute,
    # not a claim that the original contractor stencils used this typeface.
    font = bpy.data.fonts.load(str(Path(srlib.__file__).parent / "fonts" / "LiberationSans-Regular.ttf"))
    groups = {
        n: group(n)
        for n in (
            "SaturnFirstStage",
            "FirstStageEngines",
            "SaturnInterstage",
            "SaturnSecondStage",
            "SecondStageEngine",
            "InstrumentUnit",
            "SpacecraftAdapter",
        )
    }
    sib = groups["SaturnFirstStage"]
    # Eight 70-inch tanks surrounding one 105-inch tank, per p. 32.
    # Tank end stations and cluster pitch radius are estimated; source envelopes are rounded.
    cylinder("SIB_CentreTank", 52.5, 130, SIB_TOP - 40, white, sib)
    for i in range(8):
        a = TAU * i / 8
        # MSFC-MAN-206 p.4-4 dates white fuel tanks to SA-206 onward. The
        # actual SA-205 photograph S68-29781 shows red letters on white
        # fields on the BLACK fuel tanks, not on the white oxygen tanks.
        outer_tank(i, a, white, black, sib)
    cylinder("SIB_ThrustSkirt", 127, 32, 138, white, sib)
    cylinder("SIB_ForwardRing", 130, SIB_TOP - 38, SIB_TOP, white, sib)
    # Eight substantial swept fins, each a closed wedge, not a flat card.
    for i in range(8):
        a = TAU * i / 8
        verts = []
        shape = [(124, 170), (202, 65), (202, 35), (124, 70)]
        for side in (-1, 1):
            for radius, z in shape:
                x, y, zz = radial(radius, a, z)
                verts.append((x - math.sin(a) * side * 1.6 * IN, y + math.cos(a) * side * 1.6 * IN, zz))
        mesh = MeshBuilder()
        mesh.add(verts, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        mesh.build(f"SIB_Fin_{i}", black if i % 2 else white, sib, smooth=False)
    for i in range(8):
        a = TAU * (i % 4) / 4 + (math.pi / 4 if i >= 4 else 0)
        r, cant = (H1_INBOARD_RADIUS, H1_INBOARD_CANT) if i < 4 else (H1_OUTBOARD_RADIUS, H1_OUTBOARD_CANT)
        s, c = math.sin(math.radians(cant)), math.cos(math.radians(cant))
        mount = group(f"H1_Mount_{i}", groups["FirstStageEngines"])
        mount.matrix_local = frame(radial(r, a, H1_GIMBAL_STATION), (-s * math.cos(a), -s * math.sin(a), c))
        # Retain the provisional contour in the engine's own frame. Its old
        # Z0..108 study becomes -100..8 relative to the documented gimbal.
        # This corrects the mounting, not the unknown exit/chamber stations.
        bell(f"H1_Bell_{i}", (0, 0, -100 * IN), (0, 0, 1), 70, H1_EXIT_INNER_RADIUS + BELL_RIM, steel, mount)
        tube(f"H1_Chamber_{i}", (0, 0, -36 * IN), (0, 0, 8 * IN), 8, steel, mount)
    # S-IVB aft interstage surrounds its single J-2.
    painted_barrel("Interstage_Skin", SIB_TOP, INTERSTAGE_TOP, groups["SaturnInterstage"], white, black, [(SIB_TOP + 12, INTERSTAGE_TOP - 12)])
    bell("J2_Bell", radial(0, 0, SIB_TOP + 38), (0, 0, 1), 130, J2_EXIT_INNER_RADIUS + BELL_RIM, steel, groups["SecondStageEngine"])
    sivb = groups["SaturnSecondStage"]
    painted_barrel("SIVB_Skin", INTERSTAGE_TOP, SIVB_TOP, sivb, white, black, [(INTERSTAGE_TOP, SIVB_WHITE_FIELD_LO)])
    for i in range(2):
        a = TAU * i / 2 + math.pi / 2
        mesh = MeshBuilder()
        mesh.box((24 * IN, 22 * IN, 58 * IN), Matrix.Translation(radial(136, a, INTERSTAGE_TOP + 26)))
        mesh.build(f"SIVB_AuxiliaryPropulsion_{i}", white, sivb)
    # Real raised longitudinal stiffeners, sunk into the skin, with a common angular grid.
    for i in range(64):
        a = TAU * i / 64
        for j, (lo, hi) in enumerate(((INTERSTAGE_TOP + 4, INTERSTAGE_TOP + 49), (SIVB_TOP - 60, SIVB_TOP - 5))):
            tube(f"SIVB_Rib_{i}_{j}", radial(130, a, lo), radial(130, a, hi), 0.8, black if j == 0 and (i // 4) % 4 in (0, 1) else white, sivb)
    # No guessed cable tunnels: the initial four were unsourced and covered the USA paint.
    for i in range(4):
        a = TAU * i / 4
        fuel_angle = a + math.pi / 4
        centre = radial(93, fuel_angle, 0)[:2]
        lettering(
            "UNITED STATES",
            fuel_angle,
            SIB_TEXT_TOP,
            35,
            SIB_CAP,
            SIB_U_WIDTH,
            SIB_PITCH,
            red,
            sib,
            font,
            centre=centre,
            word_gap=SIB_WORD_GAP,
        )
        lettering("USA", a, SIVB_TEXT_TOP, RADIUS, SIVB_CAP, SIVB_U_WIDTH, SIVB_PITCH, red, sivb, font)
    cylinder("IU_Skin", RADIUS, SIVB_TOP, IU_TOP, black, groups["InstrumentUnit"])
    sla = groups["SpacecraftAdapter"]
    lathe_obj("SLA_Shell", prof([(130, IU_TOP), (77, SLA_TOP)]), white, sla, segs=128)
    # Four panel seams terminate at the SM interface; no LM is inside this adapter.
    for i in range(4):
        a = TAU * (i + 0.5) / 4
        tube(f"SLA_Seam_{i}", radial(130, a, IU_TOP + 2), radial(77, a, SLA_TOP - 2), 0.6, black, sla)
    # Match the Redstone/Titan convention: the entire vehicle's enclosing skins,
    # fins and skin-mounted paint/fittings open in the same quadrant. Engines
    # and the separate APS equipment remain whole; no interior is invented.
    mark_shells(
        [
            obj.name
            for name in ("SaturnFirstStage", "SaturnInterstage", "SaturnSecondStage", "InstrumentUnit", "SpacecraftAdapter")
            for obj in groups[name].children_recursive
            if obj.type == "MESH" and not obj.name.startswith("SIVB_AuxiliaryPropulsion_")
        ]
    )
    return groups
