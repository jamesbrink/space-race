"""Intrepid's surface payload and crew rest equipment. Drawing units are inches. See lm-6.md."""

import math

from mathutils import Matrix

import lm5_equipment
from lm5_equipment import box, point, tube
from srlib import MeshBuilder, frame, group, mark_shells, prof


def color_camera(bay, alloy, white, dark, prefix="LM6"):
    """White Westinghouse lunar color camera, zoom barrel and cable adapter, AS12-46-6756."""
    body, fittings, lens = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(body, (-12, 9, 104), (11, 5.9, 6.3))
    for y in (6, 12):
        tube(fittings, (-16, y, 100.7), (-16, y, 114.7), 0.45)
    tube(fittings, (-16, 6, 100.7), (-8, 6, 100.7), 0.45)
    tube(fittings, (-17.5, 9, 104), (-20.4, 9, 104), 0.75)
    lens.lathe(
        prof([(1.65, 0), (1.65, 1), (1.2, 1.35), (1.2, 3.5), (1.7, 4.1), (1.7, 4.6), (0, 4.6)]), 24, matrix=frame(point(-6.5, 9, 104), (1, 0, 0))
    )
    body.build(f"{prefix}_ColorTVBody", white, bay)
    fittings.build(f"{prefix}_TVCarrierAndConnector", alloy, bay)
    lens.build(f"{prefix}_ColorZoomLens", dark, bay)


def mesa(bay, alloy, white, dark):
    color_camera(bay, alloy, white, dark)
    lm5_equipment.sample_cases(bay, alloy, dark, "LM6")


def bay_frame(name, root):
    bay = group(name, root)
    bay.location = point(-61, 61, 0)
    bay.rotation_euler.z = math.radians(225)
    return bay


def fuel_cask(root, alloy, white, prefix="LM6"):
    """The sealed graphite cask in its external cradle, photographed upright in AS12-46-6777."""
    bay = bay_frame(f"{prefix}_CaskMount", root)
    cask = group(f"{prefix}_GraphiteCask", bay)
    cask.location = point(-34, -1, 91)
    body, cradle, shoes = MeshBuilder(), MeshBuilder(), MeshBuilder()
    body.lathe(prof([(0, -11.5), (2, -10.96), (3.46, -9.5), (4, -7.5), (4, 7.5), (3.46, 9.5), (2, 10.96), (0, 11.5)]), 36)
    for x in (-4.8, 4.8):
        tube(cradle, (x, 0, -12), (x, 0, 12.7), 0.56)
        tube(shoes, (x, 0, -10), (x, 7, -12), 0.70)
        tube(shoes, (x, 0, 6), (x, 7, 10), 0.70)
    for z in (-7.8, 7.8):
        cradle.lathe(prof([(4.10, z - 0.44), (4.22, z - 0.44), (4.22, z + 0.44), (4.10, z + 0.44)]), 32)
    for z in (-12, 12.7):
        tube(cradle, (-4.8, 0, z), (4.8, 0, z), 0.56)
    body.build(f"{prefix}_SealedFuelCask", alloy, cask)
    cradle.build(f"{prefix}_CaskGuard", white, cask)
    shoes.build(f"{prefix}_CaskPivotBrackets", alloy, cask)


def science_frame(parts, alloy, dark, prefix):
    """MSC-01855 figs A-1 and A-2. Photograph AS12-46-6783 supplies the orientation of the bay doors."""
    bay = bay_frame(f"{prefix}_QuadII", parts["LMScienceBay"])
    skin = bay_frame(f"{prefix}_SEQClosure", parts["LMDescent"])
    panels, hinges, rack = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for x, width in ((-18.2, 17.2), (9.0, 35.2)):
        box(panels, (x, -1.4, 91), (width, 0.55, 45))
    for z in (75, 105):
        tube(hinges, (-27, -1.4, z - 1.4), (-27, -1.4, z + 1.4), 0.5)
    for x in (0, 19):
        tube(hinges, (x - 2, -1.4, 114), (x + 2, -1.4, 114), 0.5)
    mark_shells([panels.build(f"{prefix}_SEQDoors", dark, skin).name, hinges.build(f"{prefix}_SEQDoorHinges", alloy, skin).name])
    for x in (-27.5, 27.5):
        for z in (68, 114):
            tube(rack, (x, 0, z), (x, 14, z), 0.65)
        tube(rack, (x, 0, 68), (x, 0, 114), 0.8)
    for z in (68, 114):
        tube(rack, (-27.5, 0, z), (27.5, 0, z), 0.8)
    for x in (-14, 14):
        tube(rack, (x, 1, 111), (x, 16, 111), 0.65)
    rack.build(f"{prefix}_SEQFrameAndBooms", alloy, bay)

    station = group(f"{prefix}_CentralStationPallet", bay)
    rtg = group(f"{prefix}_RTGPallet", bay)
    for pallet, x in ((station, -13), (rtg, 13)):
        pallet.location = point(x, 9, 69)
        base = MeshBuilder()
        box(base, (0, 0, 1), (24, 17.5, 2))
        base.build(f"{pallet.name}Base", alloy, pallet)
    return station, rtg


def science_bay(parts, alloy, dark, white, amber):
    station, rtg = science_frame(parts, alloy, dark, "LM6")
    instruments, covers, poles = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(instruments, (0, 0, 7), (20, 14.7, 9.8))
    covers.lathe(prof([(0, 12), (3.8, 12), (4.3, 13.4), (4.3, 28), (3.8, 29.1), (0, 29.1)]), 24, matrix=Matrix.Translation(point(-5, 0, 0)))
    box(instruments, (5, 1.5, 16.0), (8.1, 9.5, 7.9))
    for z in (13.8, 18.0):
        tube(poles, (1.1, -3.9, z), (8.9, -3.9, z), 0.45)
    for y in (-5, 5):
        tube(poles, (-10, y, 2.3), (-10, y, 11), 0.44)
    for x in (-8, -4, 0):
        tube(poles, (x, -6.8, 12.1), (x, -6.8, 26.8), 0.6)
    instruments.build("LM6_StationAndSpectrometer", alloy, station)
    covers.build("LM6_PassiveSeismicPackage", amber, station)
    poles.build("LM6_FoldedMagnetometerArms", white, station)

    generator_and_carrier(rtg, alloy, dark, "LM6")
    tools = MeshBuilder()
    for x in (-10.5, 10.5):
        tube(tools, (x, 5, 2.2), (x, 5, 25), 0.65)
    box(tools, (0, 4, 23), (13, 7.5, 7))
    tools.build("LM6_SideExperimentAndTools", white, rtg)


def generator_and_carrier(rtg, alloy, dark, prefix):
    generator, fins = MeshBuilder(), MeshBuilder()
    gen = group(f"{prefix}_SNAP27Generator", rtg)
    gen.location = point(0, -0.4, 2.1)
    generator.lathe(prof([(0, 0), (4.6, 0), (5, 2), (5, 16.5), (4.6, 18), (0, 18)]), 32)
    for index in range(8):
        transform = Matrix.Rotation(index * math.tau / 8, 4, "Z") @ Matrix.Translation(point(6.2, 0, 9.15))
        fins.box(point(3.6, 0.22, 15.6), transform)
    carrier = MeshBuilder()
    for x in (-8.2, 8.2):
        tube(carrier, (x, -1.4, 21), (x, -1.4, 35), 0.55)
    for z in (21, 35):
        tube(carrier, (-8.2, -1.4, z), (8.2, -1.4, z), 0.55)
    for end in (-8.2, 8.2):
        tube(carrier, (-end, -1.4, 21), (end, -1.4, 35), 0.38)
    for x in (-5.2, -2.6, 0, 2.6, 5.2):
        tube(carrier, (x, 1.3, 25), (x, 1.3, 32), 0.36)
    carrier.build(f"{prefix}_FoldedHandToolCarrier", alloy, rtg)
    generator.build(f"{prefix}_GeneratorHousing", dark, gen)
    fins.build(f"{prefix}_GeneratorRadiatorFins", alloy, gen)


def build(parts, alloy, amber, dark, white, linen):
    lm5_equipment.surface_bays(parts["LMSurfaceEquipment"], None, parts["LMDescent"], alloy, amber, dark, white, mesa_load=mesa, prefix="LM6")
    science_bay(parts, alloy, dark, white, amber)
    fuel_cask(parts["LMFuelCask"], alloy, white)
    hammocks(parts["LMHammocks"], linen, dark, "LM6")


def hammocks(parent, linen, dark, prefix):
    for index, y in enumerate((-14, 14)):
        roll, straps = MeshBuilder(), MeshBuilder()
        tube(roll, (-1, y - 9, 175), (-1, y + 9, 175), 2.55)
        for dy in (-5, 5):
            tube(straps, (-1, y + dy - 0.5, 175), (-1, y + dy + 0.5, 175), 2.72)
        roll.build(f"{prefix}_RolledHammock_{index}", linen, parent)
        straps.build(f"{prefix}_HammockStraps_{index}", dark, parent)
