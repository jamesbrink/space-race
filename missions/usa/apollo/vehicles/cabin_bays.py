"""Visible cabin equipment bays, NAR News Reference pp.48–49 and P-64–68.

The Apollo 7 press kit identifies the flown optical instruments. The bay
layout follows the illustrated cabinet faces. Individual CM-101 panel and
bracket dimensions, viewing positions, and finishes are estimated.
See cabin-fittings.md.
"""

from mathutils import Matrix, Vector

from srlib import IN, MeshBuilder, frame, interior, lathe_obj, material, prof


def build(parent, base):
    if not interior():
        return
    alloy = material("apollo-bay-frame", (0.45, 0.47, 0.46), metallic=0.52, roughness=0.60)
    paint = material("apollo-bay-panel", (0.67, 0.68, 0.63), roughness=0.76)
    dark = material("apollo-bay-recess", (0.13, 0.15, 0.15), roughness=0.74)
    optics = material("apollo-optics-housing", (0.28, 0.30, 0.30), metallic=0.62, roughness=0.46)
    glass = material("glass-apollo-optics", (0.055, 0.095, 0.10), metallic=0.32, roughness=0.16)

    def world(point):
        return (Vector(point) + Vector((0, 0, base))) * IN

    # Local horizontal and upward axes on each cupboard; its normal points
    # into the cabin. A rebated face, latch pad and raised bail on every door.
    def bay(name, centre, u, width, height, depth, cols, rows):
        u = Vector(u)
        v = Vector((0, 0, 1))
        n = u.cross(v)
        rot = Matrix((u, v, n)).transposed().to_4x4()

        def at(x, y, z):
            return world(Vector(centre) + u * x + v * y + n * z)

        def box(mesh, x, y, z, w, h, d):
            tr = rot.copy()
            tr.translation = at(x, y, z)
            mesh.box((w * IN, h * IN, d * IN), tr)

        shell = MeshBuilder()
        box(shell, 0, 0, -depth / 2, width, height, depth)
        shell.build(f"CM_{name}Carcass", alloy, parent, smooth=False)
        skins = MeshBuilder()
        latches = MeshBuilder()
        handles = MeshBuilder()
        for i in range(cols):
            for j in range(rows):
                w, h = width / cols, height / rows
                x, y = -width / 2 + (i + 0.5) * w, -height / 2 + (j + 0.5) * h
                box(skins, x, y, 0.20, w - 0.6, h - 0.6, 0.6)
                lx, ly = x + w * 0.25, y + h * 0.18
                box(latches, lx, ly, 0.58, 2.8, 1.4, 0.30)
                handles.tube(at(lx - 0.8, ly, 0.74), at(lx - 0.8, ly, 1.24), 0.13 * IN, segs=12)
                handles.tube(at(lx - 0.8, ly, 1.24), at(lx + 0.8, ly, 1.24), 0.15 * IN, segs=12)
                handles.tube(at(lx + 0.8, ly, 1.24), at(lx + 0.8, ly, 0.74), 0.13 * IN, segs=12)
        skins.build(f"CM_{name}DoorFaces", paint, parent, smooth=False)
        latches.build(f"CM_{name}LatchPlates", dark, parent, smooth=False)
        handles.build(f"CM_{name}Bails", alloy, parent)

    for name, side in (("Left", -1), ("Right", 1)):
        bay(name + "EquipmentBay", (2, side * 39, 29), (side, 0, 0), 33, 25, 5, 3, 2)
        bay(name + "ForwardBay", (3, side * 37.8, 49), (side, 0, 0), 25, 13, 4.8, 2, 1)
    bay("LowerEquipmentBay", (-39, 0, 31), (0, 1, 0), 43, 26, 7, 3, 2)
    # Two distinct oculars project into the cabin above the foot-end lockers.
    for name, y, r in (("Sextant", -4.75, 1.15), ("ScanningTelescope", 4.75, 1.45)):
        axis = Vector((0.90, 0, 0.435)).normalized()
        tr = frame(world((-42, y, 47)), axis)
        part = lathe_obj(
            f"CM_{name}Eyepiece",
            prof([(0, 0), (2.1, 0), (2.1, 2.8), (r, 3.5), (r, 6.2), (r + 0.25, 6.4), (r + 0.25, 7), (r - 0.24, 7), (r - 0.24, 6.6)]),
            optics,
            parent,
            segs=36,
        )
        part.matrix_local = tr
        lens = lathe_obj(f"CM_{name}Lens", prof([(0, 6.64), (r - 0.25, 6.64)]), glass, parent, segs=36)
        lens.matrix_local = tr


def shade(groups, station):
    """Bake the three-area exhibit lights with the same baker as the Mercury cabins."""
    if not interior():
        return
    import bpy

    import cabin_shade

    bpy.context.view_layer.update()
    names = ("CabinStructure", "MainConsole", "FlightDirectorIndicators", "ConsoleEquipment", "DSKYFrontWeb", "CrewCouches", "CabinEquipmentBays")
    inside = cabin_shade.meshes_under(*(groups[name] for name in names))
    solid = [obj for obj in inside if not cabin_shade.is_seen_through(obj)]
    lamps = []
    for label, side in (("Left", -1), ("Centre", 0), ("Right", 1)):
        at = Vector((18, side * 29, station + 55)) * IN
        lamps.append((label, at, cabin_shade.disc(at, Vector((0, 0, -1)), 1.5 * IN)))
    daylight = []
    for obj in groups["CabinWindows"].children:
        if obj.name.endswith("_pressure_1"):
            # Pane vertices end with the centres of the two faces.
            p = obj.matrix_world @ obj.data.vertices[-1].co
            q = obj.matrix_world @ obj.data.vertices[-2].co
            daylight.append(cabin_shade.disc(q, (q - p).normalized(), 2 * IN))
    blockers = [*solid, *cabin_shade.meshes_under(groups["SideHatch"])]
    cabin_shade.bake(solid, blockers, lamps, daylight, broad=("CM_PressureWall", "CM_AftPressureBulkhead"), flip=("CM_PressureWall",))


def columbia_dispenser(parent, base):
    """Left forward bay. TN D-6737, water-gas separator illustration; dimensions in inches."""
    if not interior():
        return
    alloy = material("apollo-water-dispenser", (0.60, 0.63, 0.61), metallic=0.76, roughness=0.33)
    dark = material("apollo-dispenser-grip", (0.19, 0.19, 0.17), roughness=0.65)
    # The cartridge is six inches long. Location within the bay, diameter, and handpiece are estimated.
    bracket, grip, pipe = MeshBuilder(), MeshBuilder(), MeshBuilder()

    def point(x, y, z):
        return Vector((x, y, z + base)) * IN

    axis = Vector((0, 0, 1))
    case = lathe_obj("CM107_WaterGasSeparator", prof([(0, 0), (0.63, 0), (0.76, 0.25), (0.76, 5.65), (0.6, 6), (0, 6)]), alloy, parent, segs=32)
    case.matrix_local = frame(point(11, -33.5, 47), axis)
    for z in (48.2, 51.8):
        bracket.tube(point(11, -37, z), point(11, -34.3, z), 0.44 * IN, segs=12)
    grip.tube(point(11, -33.5, 46.9), point(9.8, -33.5, 44.6), 0.56 * IN, segs=16)
    pipe.tube(point(11, -33.5, 53), point(11, -33.5, 54.1), 0.32 * IN, segs=12)
    pipe.tube(point(11, -33.5, 54.1), point(12.7, -33.5, 54.8), 0.29 * IN, segs=12)
    bracket.build("CM107_DispenserStowageClips", alloy, parent)
    grip.build("CM107_DispenserHandpiece", dark, parent)
    pipe.build("CM107_DispenserNozzle", alloy, parent)
