"""SA-205 exterior, in inches. NASA Apollo 7 press kit pp. 31–33 and Figure 25a.

Published rounded envelopes constrain the stack. The S-IVB separation plane uses the
AS-205 flight evaluation's rounded station; nozzle exit IDs use the period fact sheets.
Engine contours, fins, paint boundaries and attachments remain provisional.
"""

import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

import saturn_structure as structure
import srlib
from apollo_csm import BELL_RIM, SM_BOTTOM, bell, radial, tube
from srlib import IN, TAU, MeshBuilder, frame, group, lathe_obj, mark_shells, material, prof, text_mesh

SIB_TOP = 80.2 * 12
SIVB_TOP = SIB_TOP + 58.4 * 12
IU_TOP = SIVB_TOP + 36
SLA_TOP = IU_TOP + 28 * 12
CSM_OFFSET = SLA_TOP - SM_BOTTOM  # align the SM aft bulkhead at XA838 to the adapter
HEIGHT = 224 * 12  # Figure 25a; height to escape-system Q-ball
# MSFC M10-1076, p. 4-2: rounded SA-205 stage envelopes.
SIB_TAIL_RADIUS = 22.8 * 12 / 2
SIB_FIN_TIP = 40.7 * 12 / 2
RADIUS = 130  # p. 33, 260 in instrument unit and S-IVB interface
# MPR-SAT-FE-68-4, Figure A-1, p.206: vehicle station in inches, rounded.
# The model uses that station directly, not 1187 inches added to the S-IB top.
INTERSTAGE_TOP = 1187.0
# Saturn IB News Reference, changed September 1968, H-1 and J-2 fact sheets
# (PDF pp.45/69): these dimensions are explicitly INSIDE exit diameters.
H1_EXIT_INNER_RADIUS = (3 * 12 + 10) / 2
J2_EXIT_INNER_RADIUS = (6 * 12 + 5) / 2
# MSFC Saturn IB Mission Plan and Technical Information Checklist, revision 18
# (1 August 1968), p.4-8 ("Engine Mounting") and Figure 1, p.6-3. The four inboard engines
# were fixed and only the four outboards gimballed (p.4-8: actuators on the outboard engines
# only). The page does not say where its radii are taken: they are placed here in the STA 100
# gimbal plane, every engine's mounting point, NOT at the nozzle exits. The +Z engine axis points inward toward the nose;
# its exhaust points outward. Figure 25 places odd fin lines on the vehicle
# positions and even lines on the outboard engines. Absolute CSM clocking is pending.
H1_MOUNT_STATION = 100
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


def painted_barrel(name, lo, hi, parent, white, black, bands=(), *, continuous=False):
    """Paint is on the skin, not a second near-coplanar skin above it."""
    mesh = [MeshBuilder(), MeshBuilder()]
    levels = sorted({lo, hi, *[z for start, end in bands for z in (start, end) if lo < z < hi]})
    for i in range(16):
        for z0, z1 in zip(levels, levels[1:]):
            dark = any(start <= (z0 + z1) / 2 <= end for start, end in bands) and (continuous or i % 4 in (0, 1))
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


def outer_tank(index, angle, white, black, parent, *, white_fuel=False):
    """One tank skin, with its fuel-tank white marking field painted into it."""
    fuel = index % 2 == 1 and not white_fuel
    profile = [(35, structure.SIB_SKIRT_BOTTOM), (35, SIB_FIELD_LO), (35, SIB_FIELD_HI), (35, structure.SIB_SKIRT_TOP)]
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
    tank.location.x, tank.location.y = radial(structure.SIB_TANK_PITCH_RADIUS, angle, 0)[:2]
    return tank


def build(*, skylab=False):
    # MSFC-MAN-206 fig. 1-1, vehicle stations in inches. The upper SLA
    # interface meets the SM aft bulkhead; the flight separation line is 1.06 in aft.
    sib_top, interstage_top, sivb_top, iu_top, hinge_height, sla_top = (
        (962.304, 1186.804, 1662.859, 1698.859, 1781.309, 2034.859)
        if skylab
        else (SIB_TOP, INTERSTAGE_TOP, SIVB_TOP, IU_TOP, IU_TOP + 7 * 12, SLA_TOP)
    )
    white = material("saturn-white", (0.86, 0.87, 0.83), roughness=0.64)
    black = material("saturn-black", (0.025, 0.03, 0.035), roughness=0.7)
    steel = material("saturn-engine-steel", (0.22, 0.24, 0.25), metallic=0.7, roughness=0.52)
    alloy = material("saturn-machined-alloy", (0.64, 0.67, 0.66), metallic=0.65, roughness=0.4)
    red = material("saturn-lettering-red", (0.55, 0.035, 0.02), roughness=0.7)
    # OFL Liberation Sans Regular 2.1.5: a reproducible light sans substitute,
    # not a claim that the original contractor stencils used this typeface.
    font = bpy.data.fonts.load(str(Path(srlib.__file__).parent / "fonts" / "LiberationSans-Regular.ttf"))
    groups = {
        n: group(n)
        for n in (
            "SaturnFirstStage",
            "FirstStageEngines",
            "FirstStageTankStructure",
            "SaturnInterstage",
            "SaturnSecondStage",
            "SecondStageEngine",
            "SecondStageTankStructure",
            "InstrumentUnit",
            "InstrumentUnitEquipment",
            "SpacecraftAdapter",
        )
    }
    sib = groups["SaturnFirstStage"]
    # Eight 70-inch tanks surrounding one 105-inch tank, per p. 32.
    # Tank end stations and cluster pitch radius are estimated; source envelopes are rounded.
    cylinder("SIB_CentreTank", 52.5, structure.SIB_SKIRT_BOTTOM, structure.SIB_SKIRT_TOP, white, sib)
    for i in range(8):
        a = TAU * i / 8
        # MSFC-MAN-206 p.4-4 dates white fuel tanks to SA-206 onward. The
        # actual SA-205 photograph S68-29781 shows red letters on white
        # fields on the BLACK fuel tanks, not on the white oxygen tanks.
        outer_tank(i, a, white, black, sib, white_fuel=skylab)
    if skylab:
        # NASA KSC-72P-506 shows a light skirt with dark rectangles between the white fins.
        skirt = cylinder("SIB_ThrustSkirt", SIB_TAIL_RADIUS, 32, 97, white, sib)
        skirt.data.materials.append(black)
        for polygon in skirt.data.polygons:
            angle = math.atan2(polygon.center.y, polygon.center.x)
            if (angle % (math.pi / 4)) / (math.pi / 4) > 0.58:
                polygon.material_index = 1
        cylinder("SIB_UpperThrustSkirt", SIB_TAIL_RADIUS, 97, structure.SIB_SKIRT_BOTTOM, white, sib)
    else:
        cylinder("SIB_ThrustSkirt", SIB_TAIL_RADIUS, 32, structure.SIB_SKIRT_BOTTOM, black, sib)
    cylinder("SIB_ForwardRing", 130, structure.SIB_SKIRT_TOP, sib_top, white, sib)
    # MSFC Air Load Manual 1.9201, reproduced in TP-3615 Fig. 39. The type's
    # 110-in exposed planform starts slightly inside the rounded tail envelope.
    for i in range(8):
        a = TAU * i / 8
        verts = []
        for radius, aft, chord, thickness in [(SIB_FIN_TIP - 110, 111.369, 100, 17.496), (SIB_FIN_TIP, 61.369, 40, 6.446)]:
            # Blunt tapered wedge. Ridge position and aft face width are estimates.
            for offset, station in [(0, aft + chord), (0.5, aft + 0.30 * chord), (0.2, aft), (-0.2, aft), (-0.5, aft + 0.30 * chord)]:
                x, y, z = radial(radius, a, station)
                half_width = offset * thickness * IN
                verts.append((x - math.sin(a) * half_width, y + math.cos(a) * half_width, z))
        faces = [(0, 1, 2, 3, 4), (9, 8, 7, 6, 5)]
        for k in range(5):
            nxt = (k + 1) % 5
            faces.append((k, k + 5, nxt + 5, nxt))
        mesh = MeshBuilder()
        mesh.add(verts, faces)
        mesh.build(f"SIB_Fin_{i}", white, sib, smooth=False)
    for i in range(8):
        a = TAU * (i % 4) / 4 + (math.pi / 4 if i >= 4 else 0)
        r, cant = (H1_INBOARD_RADIUS, H1_INBOARD_CANT) if i < 4 else (H1_OUTBOARD_RADIUS, H1_OUTBOARD_CANT)
        s, c = math.sin(math.radians(cant)), math.cos(math.radians(cant))
        mount = group(f"H1_Mount_{i}", groups["FirstStageEngines"])
        mount.matrix_local = frame(radial(r, a, H1_MOUNT_STATION), (-s * math.cos(a), -s * math.sin(a), c))
        # The provisional contour in the engine's own frame, from 100 in below the
        # mounting plane to 8 in above it; the exit and chamber stations are not known.
        bell(f"H1_Bell_{i}", (0, 0, -100 * IN), (0, 0, 1), 70, H1_EXIT_INNER_RADIUS + BELL_RIM, steel, mount)
        tube(f"H1_Chamber_{i}", (0, 0, -36 * IN), (0, 0, 8 * IN), 8, steel, mount)
        if srlib.interior():
            structure.h1_equipment(mount, i, alloy)
    # S-IVB aft interstage surrounds its single J-2.
    painted_barrel("Interstage_Skin", sib_top, interstage_top, groups["SaturnInterstage"], white, black, [(sib_top + 12, interstage_top - 12)])
    structure.j2_engine(groups["SecondStageEngine"], steel, alloy, J2_EXIT_INNER_RADIUS, BELL_RIM)
    sivb = groups["SaturnSecondStage"]
    if skylab:
        # S73-27095: two dark circumferential skirt bands with a white barrel between.
        painted_barrel(
            "SIVB_Skin",
            interstage_top,
            sivb_top,
            sivb,
            white,
            black,
            [(interstage_top, interstage_top + 50), (sivb_top - 60, sivb_top)],
            continuous=True,
        )
    else:
        painted_barrel("SIVB_Skin", interstage_top, sivb_top, sivb, white, black, [(interstage_top, SIVB_WHITE_FIELD_LO)])
        for i in range(2):
            a = TAU * i / 2 + math.pi / 2
            mesh = MeshBuilder()
            mesh.box((24 * IN, 22 * IN, 58 * IN), Matrix.Translation(radial(136, a, interstage_top + 26)))
            mesh.build(f"SIVB_AuxiliaryPropulsion_{i}", white, sivb)
    # Real raised longitudinal stiffeners, sunk into the skin, with a common angular grid.
    for i in range(64):
        a = TAU * i / 64
        for j, (lo, hi) in enumerate(((interstage_top + 4, interstage_top + 49), (sivb_top - 60, sivb_top - 5))):
            tube(
                f"SIVB_Rib_{i}_{j}",
                radial(130, a, lo),
                radial(130, a, hi),
                0.8,
                black if skylab or (j == 0 and (i // 4) % 4 in (0, 1)) else white,
                sivb,
            )
    # No guessed cable tunnels: the initial four were unsourced and covered the USA paint.
    for i in range(4):
        a = TAU * i / 4
        fuel_angle = a + math.pi / 4
        centre = radial(structure.SIB_TANK_PITCH_RADIUS, fuel_angle, 0)[:2]
        lettering(
            "UNITED STATES",
            fuel_angle,
            838 if skylab else SIB_TEXT_TOP,
            35,
            SIB_CAP,
            SIB_U_WIDTH,
            41 if skylab else SIB_PITCH,
            red,
            sib,
            font,
            centre=centre,
            word_gap=SIB_WORD_GAP,
        )
        if skylab:
            serial = MeshBuilder()
            srlib.lettering(serial, srlib.Surf(35, 0, 0), "SA-206", 46, fuel_angle, 296, False, font)
            serial.build(f"SIB_Serial_{i}", black, sib).location = (*centre, 0)
        lettering("USA", a, SIVB_TEXT_TOP, RADIUS, SIVB_CAP, SIVB_U_WIDTH, SIVB_PITCH, red, sivb, font)
    cylinder("IU_Skin", RADIUS, sivb_top, iu_top, black, groups["InstrumentUnit"])
    sla = groups["SpacecraftAdapter"]
    # Four seven-foot aft panels and four twenty-one-foot doors (NAR
    # News Reference p. 66). Apollo 7 retained the doors on their hinges.
    slope = (130 - 77) / (sla_top - iu_top)
    gauge = 1.75 * math.hypot(1, slope)
    for i in range(4):
        mid = TAU * i / 4
        for moving, bottom, top in ((False, iu_top, hinge_height - 0.08), (True, hinge_height + 0.08, sla_top)):
            r0, r1 = 130 - slope * (bottom - iu_top), 130 - slope * (top - iu_top)
            parent = group(f"SLA_Door_{i}", sla) if moving else sla
            # Place the hinge along the tangent at the middle of each petal.
            pivot = Vector(radial(r0, mid, hinge_height)) if moving else Vector()
            if moving:
                parent.location = pivot
            section = [(r0, bottom), (r1, top), (r1 - gauge, top), (r0 - gauge, bottom)]
            vertices = []
            faces = []
            for j in range(33):
                az = mid + (math.pi / 4 - 0.001) * (2 * j / 32 - 1)
                vertices.extend(Vector(radial(r, az, h)) - pivot for r, h in section)
                if j:
                    for k in range(4):
                        faces.append(((j - 1) * 4 + k, j * 4 + k, j * 4 + (k + 1) % 4, (j - 1) * 4 + (k + 1) % 4))
            faces.extend(((0, 1, 2, 3), (131, 130, 129, 128)))
            skin = MeshBuilder()
            skin.add(vertices, faces)
            skin.build(f"SLA_{'Petal' if moving else 'Aft'}Skin_{i}", white, parent, smooth=False)
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
    structure.build(groups, spheres_per_bank=3 if skylab else 4)
    return groups
