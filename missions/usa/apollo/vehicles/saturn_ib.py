"""SA-205 exterior, in inches. NASA Apollo 7 press kit pp. 31–33 and Figure 25a.

Published rounded envelopes constrain the stack. The S-IVB separation plane uses the
AS-205 flight evaluation's rounded station; nozzle exit IDs use the period fact sheets.
Engine contours, fins, paint boundaries and attachments remain provisional.
"""

import math

from mathutils import Matrix

from apollo_csm import BELL_RIM, SM_BOTTOM, bell, radial, tube
from srlib import IN, TAU, MeshBuilder, frame, group, lathe_obj, load_font, material, prof, text_mesh

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


def lettering(body, angle, z, radius, size, mat, parent, vertical=False):
    verts, faces = text_mesh(body, size * IN, load_font(), cuts=3)
    mesh = MeshBuilder()
    if vertical:
        # Each letter has its own baseline, facing radially outward.
        for j, letter in enumerate(body):
            vs, fs = text_mesh(letter, size * IN, load_font(), cuts=2)
            transformed = []
            for x, y, _zz in vs:
                a = angle + (x - size * IN * 0.35) / (radius * IN)
                transformed.append(radial(radius, a, z - j * size * 1.25 + y / IN))
            mesh.add(transformed, fs)
    else:
        width = max((v[0] for v in verts), default=0)
        mesh.add([radial(radius, angle + (x - width / 2) / (radius * IN), z + y / IN) for x, y, _ in verts], faces)
    mesh.build(f"Letters_{body}_{round(angle, 2)}", mat, parent, smooth=False)


def build():
    white = material("saturn-white", (0.86, 0.87, 0.83), roughness=0.64)
    black = material("saturn-black", (0.025, 0.03, 0.035), roughness=0.7)
    steel = material("saturn-engine-steel", (0.22, 0.24, 0.25), metallic=0.7, roughness=0.52)
    red = material("saturn-lettering-red", (0.55, 0.035, 0.02), roughness=0.7)
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
        tank = lathe_obj(
            f"SIB_OuterTank_{i}",
            prof([(0, 115), (25, 119), (35, 143), (35, SIB_TOP - 60), (26, SIB_TOP - 38), (0, SIB_TOP - 32)]),
            # Fuel tanks alternate with the outer LOX tanks. MSFC's Saturn IB
            # Flight Manual (30 September 1972), p.4-4, explicitly dates the
            # switch from black fuel tanks to white to SA-206 and subsequent.
            black if i % 2 else white,
            sib,
            segs=64,
        )
        tank.location.x, tank.location.y = radial(93, a, 0)[:2]
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
    painted_barrel("SIVB_Skin", INTERSTAGE_TOP, SIVB_TOP, sivb, white, black, [(INTERSTAGE_TOP, INTERSTAGE_TOP + 55)])
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
        lettering("UNITEDSTATES", a, SIB_TOP - 130, 128.8, 31, red, sib, vertical=True)
        lettering("USA", a, SIVB_TOP - 175, 130.8, 25, red, sivb, vertical=True)
    cylinder("IU_Skin", RADIUS, SIVB_TOP, IU_TOP, black, groups["InstrumentUnit"])
    sla = groups["SpacecraftAdapter"]
    lathe_obj("SLA_Shell", prof([(130, IU_TOP), (77, SLA_TOP)]), white, sla, segs=128)
    # Four panel seams terminate at the SM interface; no LM is inside this adapter.
    for i in range(4):
        a = TAU * (i + 0.5) / 4
        tube(f"SLA_Seam_{i}", radial(130, a, IU_TOP + 2), radial(77, a, SLA_TOP - 2), 0.6, black, sla)
    return groups
