"""The equipment that distinguishes the last three ships. Inches and spacecraft stations as in Gemini X–XII §3.
The reports identify the mount and fittings; unquoted installation sizes and clock angles are estimates."""

import math

from mathutils import Matrix, Vector

from gemini_spacecraft import T_ECS, Lm, ball, can, hoop, laid, say
from mercury_capsule import chamfered
from srlib import IN, MeshBuilder, group, material


def point(frame, x, y, z):
    return frame @ (Vector((x, y, z)) * IN)


def block(mesh, frame, centre, size, bevel=0.1):
    chamfered(mesh, size, frame @ Matrix.Translation(Vector(centre) * IN), bevel)


def pipe(mesh, frame, points, radius):
    for p, q in zip(points, points[1:]):
        mesh.tube(point(frame, *p), point(frame, *q), radius * IN, 12)


def nitrogen(M, g):
    """Two bottles for the hand gun. The exterior valve was accessible to the pilot (X §3.1.2.12)."""
    bottles, bracket = MeshBuilder(), MeshBuilder()
    for a in (-5.5, 5.5):
        frame = Lm(T_ECS, -18, a, 46)
        can(bottles, frame, 4, 16, 2.8)
        for z in (-4, 4):
            bracket.lathe(hoop(3.98, 4.3, z - 0.4, z + 0.4), 24, matrix=frame)
            pipe(bracket, frame, [(0, 3.9, z), (0, 5.2, z)], 0.32)
        pipe(bracket, frame, [(0, 5.2, -4), (0, 5.2, 17)], 0.32)
        pipe(bracket, frame, [(0, 0, 8), (0, 0, 10)], 0.3)
    pipe(bracket, Lm(T_ECS, -18, 0, 46), [(0, -5.5, 10), (0, 5.5, 10)], 0.3)
    say(
        bottles.build("HHMU_NitrogenBottles", M["tank"], g),
        "Hand gun nitrogen supply",
        "Two adapter bottles fed the pilot’s hand-held maneuvering unit. Bottle dimensions and mounting brackets are estimated.",
    )
    bracket.build("HHMU_Cradles", M["aluminium"], g)
    face = laid(math.radians(23), 54)
    metal, handle = MeshBuilder(), MeshBuilder()
    block(metal, face, (0, 0, 0.4), (5, 3.4, 0.8))
    metal.lathe([(r * IN, z * IN) for r, z in [(0, 0.8), (0.8, 0.8), (0.8, 1.8), (1, 2), (0.6, 2.3), (0, 2.3)]], 16, matrix=face)
    block(handle, face, (1.6, 0, 1.4), (0.6, 2.6, 0.5))
    say(
        metal.build("HHMU_Disconnect", M["steel"], g),
        "Umbilical disconnect",
        "The pilot could connect the hand gun’s nitrogen feed at the outside of the adapter.",
    )
    handle.build("HHMU_Valve", M["equipment"], g)


def shoes(M, g, frame):
    metal, stops = MeshBuilder(), MeshBuilder()
    for x in (-6, 6):
        block(metal, frame, (x, 0, 0), (4.8, 11, 0.45))
        for side in (-1, 1):
            block(metal, frame, (x + side * 2.3, 0, -1), (0.35, 10, 1.8))
        pipe(stops, frame, [(x - 2.3, 2, 0), (x - 2.3, 2, -3), (x + 2.3, 2, -3), (x + 2.3, 2, 0)], 0.32)
    say(
        metal.build("EVA_FootRestraints", M["bronze"], g),
        "Foot restraints",
        "The pilot could hold position with both hands free. Their attachment and orientation follow the mission "
        "report; boot clearances are estimated.",
    )
    stops.build("EVA_ToeStops", M["steel"], g)


def sump(M, g):
    """XI §3.1.1.1: tank at the center; the camera bracket is separately attached to the access panel."""
    centre = Lm(T_ECS, 0, 0, 48)
    shell, optics, lamps, cameras = (MeshBuilder() for _ in range(4))
    for x in (-8, 8):
        block(shell, centre, (x, 0, 0), (0.35, 14, 15))
    block(shell, centre, (0, 6.9, 0), (15.6, 0.35, 15))
    block(shell, centre, (0, 0, 7.6), (16.4, 14, 0.35))
    for x in (-5.5, -2, 2, 5.5):
        for z in (-4, 4):
            ball(lamps, centre @ Matrix.Translation(Vector((x, 6, z)) * IN), 0.65, 12)
    ball(optics, centre, 5.5, 32)
    say(
        optics.build("Sump_TransparentTank", material("sump-clear-acrylic", (0.78, 0.86, 0.9), roughness=0.18, alpha=0.33, double_sided=True), g),
        "Transparent Apollo sump",
        "A one-eighth-scale Apollo sump gave the crew a view of fluid behavior in weightlessness. The installation dimensions are estimated.",
    )
    shell.build("Sump_Shroud", M["aluminium"], g)
    lamps.build("Sump_EightBacklights", M["beacon"], g)
    mirror, clock = MeshBuilder(), MeshBuilder()
    block(mirror, centre @ Matrix.Rotation(0.55, 4, "Z"), (-5.85, -2, 0), (0.2, 5, 8))
    mirror.build("Sump_Mirror", M["silver"], g)
    clock.disc(point(centre, 5, -4, -5), (0, 0, -1), 1.5 * IN, 0.4 * IN)
    clock.build("Sump_Clock", M["panel"], g)
    for x in (-3, 3):
        eye = Lm(T_ECS, 0, x, 59)
        block(cameras, eye, (-1, 0, 0), (6, 4, 4))
        can(cameras, eye @ Matrix.Translation(Vector((0, 0, -3)) * IN), 1.3, 2, 0.3)
    block(cameras, Lm(T_ECS, 0, 0, 63), (0, 0, 0), (12, 13, 0.6))
    say(
        cameras.build("Sump_CameraBracket", M["equipment"], g),
        "Pair of 16 mm cameras",
        "The cameras on the retro-rocket access panel photographed the tank and mirror. Gordon left them behind after his EVA ended early.",
    )
    shoes(M, g, Lm(T_ECS, 0, 0, 34))


def workstation(M, g):
    """XII fig. 3.1-6 viewed looking forward from aft: strips across the top, connectors and tool pouch below."""
    f = Lm(T_ECS, 0, 0, 38)
    base, rail, straps, tool, sockets = (MeshBuilder() for _ in range(5))
    block(base, f, (0, 0, 0), (27, 26, 0.65), 0.3)
    for x in (-13.4, 13.4):
        pipe(rail, f, [(x, -12, -0.6), (x, 12, -0.6)], 0.36)
    for y in (-12.5, 12.5):
        pipe(rail, f, [(-13, y, -0.6), (13, y, -0.6)], 0.36)
    for x, width in [(-10.5, 5), (-6, 4), (-2.5, 3), (2.5, 3), (6, 4), (10.5, 5)]:
        block(straps, f, (x, 9.2, -0.62), (width - 0.10, 4.8, 0.45))
    for x in (-10, 10):
        block(tool, f, (x, -8, -0.9), (3.1, 7, 1.2))
        pipe(rail, f, [(x - 1, -10, -1.6), (x - 1, -6, -2.7), (x + 1, -6, -2.7), (x + 1, -10, -1.6)], 0.28)
    for x, y in [(-10, 3), (-7, 3), (5, 3), (10, 3), (-8, -2), (6, -2)]:
        can(sockets, f @ Matrix.Translation(Vector((x, y, -1.5)) * IN), 0.75, 2.2, 0.2, 12)
    pipe(rail, f, [(-8, -2, -2.7), (-5, -3, -3.2), (1, -3, -3.4), (6, -2, -2.7)], 0.28)
    block(tool, f, (0, -10, -1.2), (10, 2.7, 1.7))
    block(base, f, (4, -7, -1.4), (3, 4.5, 2.0))
    sockets.disc(point(f, 4, -7, -2.65), (0, 0, -1), 0.55 * IN, 0.5 * IN, 6)
    say(
        base.build("Workstation_TaskBoard", M["aluminium"], g),
        "EVA task board",
        "Six hook-and-loop test strips above the fittings, removable handholds at the sides and the tool pouch below. "
        "Placement follows Gemini XII figure 3.1-6; overall dimensions are estimated.",
    )
    straps.build("Workstation_Strips", M["webbing"], g)
    rail.build("Workstation_RailsAndHose", M["steel"], g)
    sockets.build("Workstation_Connectors", M["bolt"], g)
    tool.build("Workstation_ToolPouchAndHolds", M["equipment"], g)
    shoes(M, g, Lm(T_ECS, 0, -16, 33))


def build(M, number):
    if number == 10:
        nitrogen(M, group("ManeuveringSupply"))
    elif number == 11:
        g = group("ApolloSumpExperiment")
        sump(M, g)
        import bpy

        nitrogen(M, bpy.data.objects["EquipmentSection"])
    elif number == 12:
        workstation(M, group("AdapterWorkstation"))


def experiment_ports(M, g):
    """X §3.1.1: the magnetometer port, beta door and two flush ion sensor doors at launch."""
    for name, theta, station, wide, desc in [
        ("Beta", -54, 81, 4.5, "A spring-loaded door protected the beta spectrometer."),
        ("IonA", 115, 88, 5, "One of two doors for the ion-sensing attitude experiment."),
        ("IonB", -113, 88, 5, "One of two doors for the ion-sensing attitude experiment."),
    ]:
        f = laid(math.radians(theta), station)
        lid, hinges = MeshBuilder(), MeshBuilder()
        block(lid, f, (0, 0, 0.08), (6, wide, 0.32))
        for x in (-2, 2):
            pipe(hinges, f, [(x - 0.35, wide / 2, 0.23), (x + 0.35, wide / 2, 0.23)], 0.21)
        say(
            lid.build("Retro_" + name + "Door", M["cover"], g),
            "Experiment door",
            desc + " Shown closed. Its dimensions and position on the retrograde section are estimated.",
        )
        hinges.build("Retro_" + name + "Hinges", M["steel"], g)
    f = laid(math.radians(-75), 92)
    mast = MeshBuilder()
    for r, low, high in [(1.2, -6, 0.2), (0.88, -5, 0.55), (0.55, -4, 0.9)]:
        mast.lathe([(r * IN, low * IN), (r * IN, high * IN), (0, high * IN)], 18, matrix=f)
    say(
        mast.build("Retro_MagnetometerMast", M["aluminium"], g),
        "Magnetometer boom",
        "The fluxgate instrument rode a telescoping boom through the retrograde adapter. Shown stowed; the tube "
        "diameters and installation station are estimated.",
    )
