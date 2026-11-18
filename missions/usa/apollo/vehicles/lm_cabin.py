"""LM-3 forward crew compartment. A.2-3 and the LM operations handbook; panel relief and eye positions estimated."""

import math

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, frame, group, interior, load_font, text_mesh


def p(xyz):
    return Vector(xyz) * IN


def box(mesh, centre, size):
    mesh.box(p(size), Matrix.Translation(p(centre)))


def label(mesh, words, origin, size, font):
    verts, faces = text_mesh(words, size * IN, font, cuts=0)
    mesh.add([(origin[0] * IN, origin[1] * IN - v[0], origin[2] * IN + v[1]) for v in verts], [tuple(reversed(f)) for f in faces])


def build(owner, boards, silver, panel, black, ivory, glass):
    # Blender -Y becomes glTF +Z (forward); both astronauts face model +X.
    for name, y in (("LM_CommanderStation", 17), ("LM_PilotStation", -17)):
        eye = group(name, owner)
        eye.location = p((45, y, 199))
        eye.rotation_euler = (Matrix.Rotation(math.pi / 2, 4, "Z") @ Matrix.Rotation(math.radians(32), 4, "X")).to_euler()
    if not interior():
        return
    hull, edging, padding = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(hull, (41, 0, 140), (57, 63, 1.5))
    for side in (-1, 1):
        box(hull, (-4.5, side * 22.25, 140), (33.5, 18.5, 1.5))
    box(hull, (-4.5, 0, 155), (33.5, 26, 1.8))
    for side in (-1, 1):
        box(hull, (-4.5, side * 12.5, 147.4), (33.5, 1, 14.3))
    for side in (-1, 1):
        box(hull, (-8, side * 26, 161), (25, 2, 40))
        for x in (23, 53):
            edging.tube(p((x, side * 28, 150)), p((x, side * 28, 168)), 0.8 * IN)
        box(padding, (39, side * 28, 168), (32, 3, 2.5))
        for x in (31, 48):
            edging.tube(p((x, side * 16, 141)), p((x + 3, side * 19, 144)), 0.65 * IN)
    hull.build("LM3_CabinDeckAndSideLockers", panel, owner)
    edging.build("LM3_StationRailsAndRestraints", silver, owner)
    padding.build("LM3_PaddedArmrests", black, owner)

    # A.2.9: the alignment optical telescope above and between the two crew positions.
    optics, eyecup, racks, breakers = (MeshBuilder() for _ in range(4))
    optics.tube(p((54, 0, 216)), p((54, 0, 226)), 2.05 * IN)
    optics.tube(p((54, 0, 216)), p((50.6, 0, 213)), 1.35 * IN, caps=False)
    eyecup.tube(p((50.6, 0, 213)), p((49.7, 0, 212.2)), 1.65 * IN)
    optics.build("LM3_AlignmentOpticalTelescope", silver, boards)
    eyecup.build("LM3_TelescopeEyepiece", black, boards)
    # Side circuit-breaker banks with raised breaker caps and dividing strips.
    for side in (-1, 1):
        box(racks, (40, side * 32, 176), (19, 1.3, 10))
        for z in (173, 176, 179):
            for x in range(33, 49, 3):
                breakers.tube(p((x, side * 31.1, z)), p((x, side * 30.3, z)), 0.46 * IN, segs=8)
    racks.build("LM3_SideBreakerPanels", panel, boards)
    breakers.build("LM3_CircuitBreakers", black, boards)
    lining, webs = MeshBuilder(), MeshBuilder()
    for x in (37, 58):
        # Light rings on the lower sides of the crew barrel leave the overhead glazing clear.
        for side in (-1, 1):
            for deg in range(-52, 33, 14):

                def arc(angle, station=x, sign=side):
                    a = math.radians(angle)
                    return p((station, sign * 42 * math.cos(a), 181 + 42 * math.sin(a)))

                webs.tube(arc(deg), arc(deg + 14), 0.5 * IN, segs=8, caps=False)
    # Aft access steps up over the ascent-engine cover into the tunnel beneath the drogue.
    for z in (164, 177, 190):
        lining.tube(p((-14, -9, z)), p((-14, 9, z)), 0.65 * IN)
    for y in (-9, 9):
        lining.tube(p((-14, y, 161)), p((-14, y, 193)), 0.72 * IN)
    lining.build("LM3_AftStepAndHandholds", silver, owner)
    webs.build("LM3_CrewCompartmentFrames", panel, owner)

    # Main instrument panels 1 and 2, common centre and lower panels. Both pilots stood.
    cases, fascias, gauges, pointers, levers, legends = (MeshBuilder() for _ in range(6))
    font = load_font()

    def instrument(y, z, r):
        pose = frame(p((65.7, y, z)), (-1, 0, 0))
        gauges.lathe([(0, 0), (r * IN, 0), (r * IN, 0.36 * IN), (0, 0.36 * IN)], 28, matrix=pose)
        for j in range(9):
            a = math.pi * (0.17 + j * 0.205)
            pointers.tube(
                p((65.18, y + r * 0.79 * math.cos(a), z + r * 0.79 * math.sin(a))),
                p((65.18, y + r * 0.95 * math.cos(a), z + r * 0.95 * math.sin(a))),
                0.08 * IN,
            )
        pointers.tube(p((65.05, y, z)), p((65.05, y + r * 0.59, z + r * 0.33)), 0.12 * IN)

    for side in (-1, 1):
        y = side * 21
        box(cases, (69, y, 174), (6, 21, 16))
        box(fascias, (66.08, y, 174), (0.34, 20.7, 15.6))
        instrument(y, 176.5, 3.2)
        for dy in (-6, 6):
            instrument(y + dy, 175.5, 1.65)
        for dy in range(-7, 8, 3):
            levers.tube(p((65.6, y + dy, 169)), p((64.4, y + dy, 169.6)), 0.22 * IN)
        label(legends, "ATTITUDE", (65.46, y + 4, 181), 1.15, font)
    box(cases, (68, 0, 178), (4, 13, 32))
    box(fascias, (65.7, 0, 178), (0.32, 12.5, 31.5))
    # LM display and keyboard: three register rows, annunciators, 19 keycaps.
    for j in range(4):
        box(gauges, (65.37, -2, 188 - j * 1.68), (0.22, 6.4, 1.15))
    for j in range(3):
        for col in range(5):
            box(pointers, (65.35, 3 + col * 0.54, 188 - j * 1.24), (0.24, 0.4, 0.64))
    for row, count in enumerate((4, 5, 5, 5)):
        for col in range(count):
            box(levers, (65.14, 4.4 - col * 2, 177.8 - row * 1.9), (0.58, 1.45, 1.4))
    label(legends, "VERB    NOUN", (65.31, 4.8, 181.6), 1.0, font)
    for side in (-1, 1):
        for row in range(3):
            for col in range(5):
                y = side * (7 + col * 2)
                box(gauges, (62, y, 156 + row * 1.85), (0.8, 1.3, 1.35))
        # Hand controller and boot projecting inward from the angled side console.
        box(cases, (52, side * 31, 163), (12, 6, 5))
        levers.tube(p((52, side * 29, 164)), p((49, side * 26, 170)), 0.75 * IN)
        grip = MeshBuilder()
        box(grip, (49, side * 26, 170), (2.6, 2.1, 4))
        grip.build(f"LM3_HandController_{side}", black, boards)
    for mesh, name, paint in [
        (cases, "Cases", panel),
        (fascias, "Faces", silver),
        (gauges, "InstrumentGlass", black),
        (pointers, "Markings", ivory),
        (levers, "SwitchesAndKeys", panel),
        (legends, "Legends", ivory),
    ]:
        mesh.build("LM3_Panel" + name, paint, boards)
