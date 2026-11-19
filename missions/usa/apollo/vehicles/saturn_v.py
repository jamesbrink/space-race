"""Saturn V SA-503 in launch attitude, from MSFC-MAN-503 and the Apollo 8 press kit. See saturn-v.md."""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

import saturn_ib
import saturn_structure as structure
import srlib
from apollo_csm import BELL_RIM, SM_BOTTOM, radial
from srlib import IN, TAU, MeshBuilder, group, interior, lathe_obj, mark_shells, material, prof


# The exhibit stands on the F-1 exits. The vehicle drawings use a different zero.
def station(vehicle_inches):
    return vehicle_inches + 115


LOWER_RADIUS = 198
UPPER_RADIUS = 130
F1_EXIT_RADIUS = (11 * 12 + 7) / 2  # NASA Saturn V News Reference, F-1 fact sheet R-1
FIN_TIP_RADIUS = 63 * 12 / 2  # MSFC-MAN-503 Figure 1-3
# The four outboard engines stand on the thrust posts at the stage's rim (News Reference p. 2-2,
# MSFC-MAN-503 Fig. 4-1). The 364-inch circle is the figure commonly quoted; no primary copy was read.
F1_PITCH_RADIUS = 364 / 2
# The S-IC's tanks, by station (Boeing D5-15782 Fig. 1-1; MSFC-MAN-503 Fig. 4-1). See saturn-v.md.
LOX_RIM = station(909)
FUEL_RIM = LOX_RIM - 262.4  # the intertank spans the two rims
FUEL_TOP = station(749)  # scaled from Fig. 1-1 at the centreline
FUEL_BOTTOM = FUEL_TOP - 517  # full tank, Fig. 4-1
FUEL_AFT = FUEL_BOTTOM + 120  # the aft rim: the dome's depth is estimated
# The thrust structure hangs 233.7 in below the fuel tank's aft rim (Fig. 4-1) and the skin ends with
# it, just forward of the gimbal plane at STA 100 (p. 4-1). The engines hang clear below.
THRUST_BASE = FUEL_AFT - 233.7
# Each fairing is a half cone from the top of the thrust structure down over the head of its engine.
# Its lower edge is estimated from the first stage fact sheet's drawing, a third of the way down the engine.
FAIRING_TOP = FUEL_AFT
FAIRING_BOTTOM = station(48.5)
FIRST_TOP = station(1564)
COLLAR_TOP = station(1760)
SECOND_TOP = station(2519)
TAPER_TOP = SECOND_TOP + 19 * 12
THIRD_TOP = station(3222)
IU_TOP = THIRD_TOP + 36
SLA_TOP = IU_TOP + 28 * 12
CSM_OFFSET = SLA_TOP - SM_BOTTOM
HEIGHT = 363 * 12


def barrel(name, parent, sections, white, black):
    """Paint built into the skin; eight bits name the dark half-quadrants in each band."""
    meshes = [MeshBuilder(), MeshBuilder()]
    for bottom, top, radius, end_radius, mask in sections:
        for quadrant in range(4):
            # The centre of the first dark half-quadrant runs through fin A.
            a = TAU * quadrant / 4 - math.pi / 8
            for half in (0, 1):
                start = a + half * math.pi / 4
                dark = bool(mask & (1 << (quadrant * 2 + half)))
                meshes[int(dark)].lathe(prof([(radius, bottom), (end_radius, top)]), segs=16, arc=(start, start + math.pi / 4))
    for mesh, paint in zip(meshes, (white, black)):
        if mesh.faces:
            mark_shells([mesh.build(name + paint.name, paint, parent).name])


def corrugations(parent, name, r0, r1, lo, hi, count, white, black, mask=0):
    """Raised stringers on the skirts, in the paint of the field they stand on."""
    meshes = [MeshBuilder(), MeshBuilder()]
    for i in range(count):
        sector = int(8 * (i + 0.5) / count)
        a = (i + 0.5) * TAU / count - math.pi / 8
        meshes[int(bool(mask & (1 << sector)))].tube(radial(r0, a, lo), radial(r1, a, hi), 0.85 * IN, segs=8, caps=False)
    for mesh, paint in zip(meshes, (white, black)):
        if mesh.faces:
            mark_shells([mesh.build(name + paint.name, paint, parent).name])


def fairings(parent, white, dark, shield):
    """Four half-cone engine fairings carrying fins, and the heat shield that closes the base."""
    height = FAIRING_TOP - FAIRING_BOTTOM
    # (a row at the skin's lower edge: above it the fairing is part of the skin, below it hangs alone)
    rows = sorted({0, (THRUST_BASE - FAIRING_BOTTOM) / height, 0.5, 0.75, 1})
    n = srlib._segs(16)
    for i in range(4):
        a = TAU * i / 4

        def half_width(z):
            return 0.40 * (1 - 0.91 * z)  # 158 in across its foot, off the fact sheet's drawing

        # The dark field contains its fairing as part of the very same skin.
        # This keeps a vanishingly shallow pair of surfaces out of the taper tip.
        def cone(t, z, angle=a):
            bulge = 60 * (1 - z) * math.cos(t * math.pi / 2)
            return radial(LOWER_RADIUS + bulge, angle + t * half_width(z), FAIRING_BOTTOM + height * z)

        shell = MeshBuilder()
        shell.grid(cone, [2 * j / n - 1 for j in range(n + 1)], rows)
        for side in (-1, 1):
            # the skin from the cone's edge to the edge of the dark field, down to the skin's lower edge only
            def field(u, z, angle=a, side=side):
                edge = half_width(z)
                return radial(LOWER_RADIUS, angle + side * (edge + u * (math.pi / 8 - edge)), FAIRING_BOTTOM + height * z)

            shell.grid(field, [j / 4 for j in range(5)], rows[1:], flip=side < 0)
        mark_shells([shell.build(f"SIC_EngineFairing_{i}", dark, parent).name])
        skin = MeshBuilder()
        skin.lathe(prof([(LOWER_RADIUS, THRUST_BASE), (LOWER_RADIUS, FAIRING_TOP)]), segs=16, arc=(a + math.pi / 8, a + 3 * math.pi / 8))
        mark_shells([skin.build(f"SIC_FairingWhiteField_{i}", white, parent).name])
        blade = MeshBuilder()
        verts = []
        low = FAIRING_BOTTOM
        for r, bottom, top, width in [(236, low, low + 87, 5), (FIN_TIP_RADIUS, low, low + 30, 1.4)]:
            for side, z in ((-1, bottom), (1, bottom), (0, top)):
                p = Vector(radial(r, a, z)) + Vector(radial(width * side, a + math.pi / 2, 0))
                verts.append(p)
        blade.add(verts, [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3), (1, 2, 5, 4), (2, 0, 3, 5)])
        mark_shells([blade.build(f"SIC_Fin_{i}", shield, parent, smooth=False).name])
    # The base heat shield: steel honeycomb across the foot of the stage, forward of the gimbal plane.
    base = MeshBuilder()
    base.lathe(prof([(0, THRUST_BASE), (LOWER_RADIUS, THRUST_BASE)]), segs=48)
    base.build("SIC_BaseHeatShield", shield, parent)


def first_engines(parent, steel, alloy):
    for i in range(5):
        a = TAU * i / 4
        x, y, _ = radial(0 if i == 4 else F1_PITCH_RADIUS, a, 0)
        mount = group(f"F1_Mount_{i + 1}", parent)
        mount.location = (x, y, 0)
        # One continuous surface around the extension, its cooling bands and the
        # exhaust manifold. Both the wide rim and the recessed inner bell are visible.
        profile = [(F1_EXIT_RADIUS, 0)]
        for z in (8, 17, 26, 35):
            r = F1_EXIT_RADIUS * (1 - 0.23 * z / (145 * 0.28))
            profile.extend([(r, z), (r + 1, z + 0.5), (r + 0.7, z + 1.7), (r - 0.85, z + 2.3)])
        profile.extend(
            [
                (54.5, 38.5),
                (58.5, 39),
                (60, 42),
                (59.4, 47),
                (56.8, 50),
                (49, 51),
                (40, 75),
                (31, 100),
                (22, 125),
                (16, 145),
                (11, 145),
                (17, 125),
                (26, 100),
                (35, 75),
                (48, 41),
                (F1_EXIT_RADIUS - BELL_RIM, 0),
                (F1_EXIT_RADIUS, 0),
            ]
        )
        shell = MeshBuilder()
        # Preserve the diametral extremes on all four axes at every level of detail.
        for q in range(4):
            shell.lathe(prof(profile), segs=24, arc=(q * TAU / 4, (q + 1) * TAU / 4))
        shell.build(f"F1_Bell_{i + 1}", steel, mount)
        # The chamber and its dome reach the gimbal at STA 100, at every level of detail: the engines
        # hang in the open below the stage. The pump and its duct are for the finest only.
        body = MeshBuilder()
        structure.turn(
            body,
            [(16, 145), (20, 153), (20, 165), (15, 174), (11, 176), (9, 197), (7, 204), (8, 212), (4, station(100)), (0, station(100))],
            sides=srlib._segs(48),
        )
        if interior():
            structure.pipe(body, [(58, 0, 44), (57, 0, 61), (46, 0, 110), (30, 0, 146)], 6)
            structure.ball(body, (29, 0, 139), 14)
        body.build(f"F1_UpperEquipment_{i + 1}", steel, mount)
        # Each engine is carried to the structure above the heat shield.
        post = MeshBuilder()
        post.tube((0, 0, station(100) * IN), (0, 0, THRUST_BASE * IN), 6 * IN, segs=8, caps=False)
        post.build(f"F1_ThrustPost_{i + 1}", alloy, mount)


def dome(mesh, radius, centre, depth, side):
    profile = [(radius * math.cos(t * math.pi / 28), centre + side * depth * math.sin(t * math.pi / 28)) for t in range(15)]
    structure.turn(mesh, profile if side == 1 else list(reversed(profile)), sides=96)


def tanks(parent, name, radius, domes, lining, metal, warm):
    walls, caps, rings = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for lo, hi in lining:
        structure.turn(walls, [(radius, hi), (radius, lo)], sides=96)
        for j in range(1, 5):
            structure.band(rings, radius - 1, lo + (hi - lo) * j / 5, radius * 0.045, 1.5)
    for centre, depth, side in domes:
        dome(caps, radius, centre, depth, side)
    for mesh, label, mat in [(walls, "Liners", metal), (caps, "Bulkheads", warm), (rings, "Rings", metal)]:
        mark_shells([mesh.build(name + label, mat, parent).name])


def adapter(parent, white, carrying_lm=False, designation=None):
    # SLA-11 four fixed panels and four jettisonable petals, each on its physical hinge.
    hinge = IU_TOP + (85.9 if carrying_lm else 7 * 12)
    designation = designation or ("13A" if carrying_lm else "11")

    def radius(z):
        return UPPER_RADIUS + (77 - UPPER_RADIUS) * (z - IU_TOP) / (SLA_TOP - IU_TOP)

    for i in range(4):
        a = i * math.pi / 2
        for moving, lo, hi in [(False, IU_TOP, hinge - 0.08), (True, hinge + 0.08, SLA_TOP)]:
            owner = group(f"SLA_Door_{i}", parent) if moving else parent
            origin = Vector(radial(radius(hinge), a, hinge)) if moving else Vector()
            if moving:
                owner.location = origin
            mesh = MeshBuilder()
            section = [(radius(lo), lo), (radius(hi), hi), (radius(hi) - 1.75, hi), (radius(lo) - 1.75, lo)]
            # End the petals a hair short of one another so each has its own visible edge.
            sides = srlib._segs(32)
            verts = [Vector(radial(r, a + (j / sides - 0.5) * (math.pi / 2 - 0.002), z)) - origin for j in range(sides + 1) for r, z in section]
            faces = [(j * 4 + k, (j + 1) * 4 + k, (j + 1) * 4 + (k + 1) % 4, j * 4 + (k + 1) % 4) for j in range(sides) for k in range(4)]
            faces.extend([(0, 1, 2, 3), tuple(4 * sides + j for j in (3, 2, 1, 0))])
            mesh.add(verts, faces)
            mark_shells([mesh.build(f"SLA{designation}_{'Door' if moving else 'Base'}Panel_{i}", white, owner, smooth=False).name])


def payload(parent, steel, alloy):
    # M-932-68-08 p.34 Fig.5. Ratios read against the adapter lower ring at
    # the same height: cylinder 65/113 of 260 in across and 49/113 of 260 tall.
    radius, bottom, height = 75, IU_TOP + 4, 113
    top = bottom + height
    inside = radius - 9  # broad lip and open cells visible in AS08-16-2582
    skin = lathe_obj(
        "LTAB_BallastCylinder",
        prof([(radius - 2, bottom), (radius, bottom), (radius, top), (inside, top), (inside, top - 6), (radius - 2, top - 6), (radius - 2, bottom)]),
        steel,
        parent,
    )
    mark_shells([skin.name])
    # Two members each way. Short transverse sections join the long members
    # so their forward faces do not overlap at the crossings.
    grid = MeshBuilder()
    centre_z = top - 4
    half_width = 3
    pitch = 23
    end = math.sqrt((inside + 1) ** 2 - pitch**2)
    for offset in (-pitch, pitch):
        structure.beam(grid, (offset, -end, centre_z), (offset, end, centre_z), 2 * half_width, 3)
        for left, right in [(-end, -pitch - half_width), (-pitch + half_width, pitch - half_width), (pitch + half_width, end)]:
            structure.beam(grid, (left, offset, centre_z), (right, offset, centre_z), 2 * half_width, 3)
    grid.build("LTAB_ForwardGrille", alloy, group("LTAB_EndGrid", parent))
    frame = MeshBuilder()
    for i in range(4):
        a = i * TAU / 4
        attach_z = bottom + height * 0.55
        attach_r = UPPER_RADIUS + (77 - UPPER_RADIUS) * (attach_z - IU_TOP) / (SLA_TOP - IU_TOP) - 1.75
        apex = structure.polar(attach_r, a, attach_z)
        for z in (bottom + 4, bottom + height - 4):
            structure.pipe(frame, [structure.polar(radius, a, z), apex], 2.5)
    frame.build("LTAB_FourAdapterStruts", alloy, parent)


def markings(first, second, red):
    # SA-503 on its pad, NASA S68-55424. Red paint and flags sit on white fields.
    font = bpy.data.fonts.load(str(Path(srlib.__file__).parent / "fonts" / "LiberationSans-Regular.ttf"))
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "mercury" / "vehicles"))
    from mercury_capsule import flag_image

    flag_material = material("saturn-us-flag", (1, 1, 1), roughness=0.65, image=flag_image())
    bold = srlib.load_font()
    for i in range(4):
        a = TAU * i / 4 + math.pi / 4
        saturn_ib.lettering("USA", a, 644, LOWER_RADIUS, 57, 45, 91, red, first, bold)
        saturn_ib.lettering("UNITED STATES", a, 2500, LOWER_RADIUS, 31, 25, 38, red, second, font, word_gap=16)
        flag = MeshBuilder()
        flag.grid(
            lambda u, v, angle=a: radial(LOWER_RADIUS + 0.6, angle + (u - 0.5) * 145 / LOWER_RADIUS, 1240 + v * 76),
            [j / 16 for j in range(17)],
            [0, 1],
        )
        flag.build(f"SIC_Flag_{i}", flag_material, first)
    mark_shells([obj.name for owner in (first, second) for obj in owner.children if obj.name.startswith(("Letters_", "SIC_Flag_"))])


def instrument_unit(parent, steel, metal):
    """SA-503 equipment bays, by cold plate number in MSFC-MAN-503 Fig. 7-4 sheets 2–5."""
    cases, plates, vessels = MeshBuilder(), MeshBuilder(), MeshBuilder()

    def pose(bay, across, height, radius):
        angle = (bay - 3) * TAU / 24
        return (
            Matrix.Translation(radial(radius, angle, THIRD_TOP + height)) @ Matrix.Rotation(angle, 4, "Z") @ Matrix.Translation((0, across * IN, 0))
        )

    for bay in range(1, 25):
        if bay != 8:  # access door
            plates.box((1.25 * IN, 28 * IN, 26 * IN), pose(bay, 0, 17, 127))
    # Tangential offsets, case widths and heights traced from the perspective
    # views. Space is left for the open access door and the spherical assemblies.
    envelopes = {
        1: [(-7, 23, 12, 9), (8, 22, 9, 12), (8, 8, 8, 8)],
        2: [(-8, 15, 13, 23), (7, 21, 10, 16)],
        4: [(0, 22, 24, 11), (0, 8, 24, 10)],
        5: [(0, 22, 24, 11), (0, 8, 24, 10)],
        6: [(-7, 20, 9, 14), (6, 10, 10, 9)],
        9: [(-8, 22, 10, 11), (8, 22, 10, 14), (0, 8, 20, 8)],
        10: [(-8, 21, 10, 14), (8, 21, 8, 11), (0, 8, 15, 8)],
        11: [(-6, 21, 10, 12), (7, 21, 10, 12), (3, 7, 14, 8)],
        12: [(-7, 22, 10, 11), (7, 22, 12, 14), (0, 8, 10, 9)],
        13: [(-6, 21, 12, 12), (7, 21, 8, 12), (0, 8, 19, 7)],
        14: [(0, 23, 13, 12), (-5, 8, 10, 9), (7, 8, 9, 9)],
        15: [(-8, 22, 8, 12), (7, 23, 12, 12), (7, 9, 12, 8)],
        17: [(-8, 22, 9, 11), (6, 23, 8, 10), (-1, 8, 13, 10)],
        18: [(0, 23, 17, 13), (-6, 8, 8, 8), (7, 8, 10, 8)],
        19: [(0, 23, 22, 12), (0, 8, 22, 12)],  # data adapter over flight computer
        20: [(0, 22, 19, 11), (-6, 8, 10, 8), (7, 8, 11, 8)],
        23: [(-6, 8, 9, 11), (8, 9, 9, 12), (-6, 23, 9, 9)],
        24: [(-8, 22, 8, 11), (3, 22, 7, 11), (11, 22, 6, 14)],
    }
    for bay, items in envelopes.items():
        for x, z, width, height in items:
            cases.box((5.5 * IN, width * IN, height * IN), pose(bay, x, z, 123.5))
    # The two accumulators, the cylindrical flight control computer at bay 16,
    # the gas-bearing supply and ST-124-M3 platform. External envelopes only.
    for bay, radius, height in [(3, 8, 23), (7, 5, 21), (16, 9, 23)]:
        profile = [
            (0, -height / 2),
            (radius * 0.84, -height / 2),
            (radius, -height / 2 + 2),
            (radius, height / 2 - 2),
            (radius * 0.84, height / 2),
            (0, height / 2),
        ]
        vessels.lathe(prof(profile), 28, matrix=pose(bay, 0, 16, 126 - radius))
    for bay, radius in [(21, 11), (22, 9)]:
        centre = pose(bay, 0, 15, 126 - radius).translation / IN
        structure.ball(vessels, centre, radius)
    for mesh, name, paint in [(plates, "ColdPlates", metal), (cases, "InstrumentCases", steel), (vessels, "PlatformAndVessels", metal)]:
        mark_shells([mesh.build("IU503_" + name, paint, parent).name])


def build(*, lunar_module=None, adapter_number=None):
    white = material("saturn-white", (0.86, 0.87, 0.83), roughness=0.64)
    black = material("saturn-black", (0.025, 0.03, 0.035), roughness=0.7)
    steel = material("saturn-engine-steel", (0.22, 0.24, 0.25), metallic=0.7, roughness=0.52)
    alloy = material("saturn-machined-alloy", (0.64, 0.67, 0.66), metallic=0.65, roughness=0.4)
    warm = material("saturn-tank-bulkhead", (0.60, 0.53, 0.38), 0.38, 0.55, double_sided=True)
    metal = material("saturn-interior-alloy", (0.63, 0.67, 0.68), 0.55, 0.47, double_sided=True)
    red = material("saturn-lettering-red", (0.55, 0.035, 0.02), roughness=0.7)
    # (seen from both sides: the fins' and the heat shield's undersides, and the shield from within the cutaway)
    shield = material("saturn-base-titanium", (0.5, 0.52, 0.52), 0.6, 0.5, double_sided=True)
    fairing_black = material("saturn-fairing-black", (0.025, 0.03, 0.035), roughness=0.7, double_sided=True)
    first = group("SaturnFirstStage")
    second = group("SaturnSecondStage")
    collar = group("LowerInterstage")
    taper = group("SaturnInterstage")
    third = group("SaturnThirdStage")
    iu = group("InstrumentUnit")
    r, u = LOWER_RADIUS, UPPER_RADIUS
    # Dark fields align across the S-IC forward skirt and S-II interstage.
    barrel("SIC_", first, [(FAIRING_TOP, 685, r, r, 0x55), (685, 1560, r, r, 0), (1560, FIRST_TOP, r, r, 0x55)], white, black)
    barrel("SII_Interstage_", collar, [(FIRST_TOP, COLLAR_TOP, r, r, 0x55)], white, black)
    barrel("SII_", second, [(COLLAR_TOP, 1970, r, r, 0x55), (1970, 2015, r, r, 255), (2015, SECOND_TOP, r, r, 0)], white, black)
    # Two stacked roll-pattern rows on the conical interstage. Their quarters differ.
    mid = (SECOND_TOP + TAPER_TOP) / 2
    barrel("SIVB_Interstage_", taper, [(SECOND_TOP, mid, r, (r + u) / 2, 0b11000011), (mid, TAPER_TOP, (r + u) / 2, u, 0b00001111)], white, black)
    barrel("SIVB_", third, [(TAPER_TOP, THIRD_TOP, u, u, 0)], white, black)
    barrel("IU_", iu, [(THIRD_TOP, IU_TOP, u, u, 255)], white, black)
    fairings(first, white, fairing_black, shield)
    markings(first, second, red)
    if srlib.DETAIL >= 0.5:
        corrugations(first, "SIC_IntertankStringers", r, r, 756, 940, 144, white, black)
        corrugations(first, "SIC_ForwardStringers", r, r, 1564, FIRST_TOP - 1, 144, white, black, 0x55)
        corrugations(collar, "SII_InterstageStringers", r, r, FIRST_TOP + 1, COLLAR_TOP - 1, 144, white, black, 0x55)
        corrugations(second, "SII_ForwardStringers", r, r, SECOND_TOP - 125, SECOND_TOP - 2, 144, white, black)
        corrugations(third, "SIVB_ForwardStringers", u, u, THIRD_TOP - 105, THIRD_TOP - 2, 96, white, black)

    first_engines(group("FirstStageEngines"), steel, alloy)
    engines = group("SecondStageEngines")
    for i in range(5):
        mount = group(f"SII_J2_{i + 1}", engines)
        mount.location = radial(0 if i == 4 else 17.5 * 12 / 2, TAU * i / 4, station(1664) - structure.ds(100))
        structure.j2_engine(mount, steel, alloy, saturn_ib.J2_EXIT_INNER_RADIUS, BELL_RIM)
    third_engine = group("ThirdStageEngine")
    third_engine.location.z = (THIRD_TOP - saturn_ib.SIVB_TOP) * IN
    structure.j2_engine(third_engine, steel, alloy, saturn_ib.J2_EXIT_INNER_RADIUS, BELL_RIM)
    for i in range(2):
        a = i * math.pi + math.pi / 2
        mesh = MeshBuilder()
        mesh.box((27 * IN, 30 * IN, 59 * IN), Matrix.Translation(radial(u + 6, a, TAPER_TOP + 44)) @ Matrix.Rotation(a, 4, "Z"))
        mesh.build(f"SIVB_APSPod_{i}", white, third)

    first_tanks = group("FirstStageTankStructure")
    second_tanks = group("SecondStageTankStructure")
    third_tanks = group("ThirdStageTankStructure")
    equipment = group("InstrumentUnitEquipment")
    if interior():
        # Boeing D5-15782 Fig. 1-1 locates the LOX aft crown, its rim and the
        # distinct RP-1 crown below. The 262.4-inch intertank spans the rims.
        lox_rim, fuel_rim, fuel_top, fuel_aft = LOX_RIM, FUEL_RIM, FUEL_TOP, FUEL_AFT
        tanks(
            group("SIC_FuelTank", first_tanks),
            "SIC_RP1",
            194,
            [(fuel_aft, 120, -1), (fuel_rim, fuel_top - fuel_rim, 1)],
            [(fuel_aft, fuel_rim)],
            metal,
            warm,
        )
        tanks(
            group("SIC_OxidizerTank", first_tanks),
            "SIC_LOX",
            194,
            [(lox_rim, 137, -1), (station(1420), 121, 1)],
            [(lox_rim, station(1420))],
            metal,
            warm,
        )
        # The S-II's 22-ft LOX envelope (5-1) is hung from its bolting ring,
        # between STA 1847 and 1863 (D5-15782 Fig. 3-2). Its lower half is shallower.
        weld = station(1855)
        forward = SECOND_TOP - 11.5 * 12
        tanks(second_tanks, "SII_Tank", 194, [(weld, 120, -1), (weld, 144, 1), (forward, 128, 1)], [(weld, forward)], metal, warm)
        third_tanks.location.z = third_engine.location.z
        structure.second_stage(third_tanks, metal, warm, steel)
        instrument_unit(equipment, steel, metal)
    adapter(group("SpacecraftAdapter"), white, lunar_module is not None, adapter_number)
    if lunar_module is None:
        payload(group("LunarTestArticle"), steel, alloy)
    else:
        lunar_module(IU_TOP)
