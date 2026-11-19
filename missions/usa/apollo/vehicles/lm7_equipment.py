"""Aquarius flight equipment. MSC-02680 appendix A, figures A-1 and A-2, and AS13-62-8929. Units are inches."""

from mathutils import Matrix

import lm5_equipment
import lm6_equipment
from lm5_equipment import box, point, tube
from srlib import MeshBuilder, group, material, prof


def mesa(bay, alloy, ivory, dark):
    lm6_equipment.color_camera(bay, alloy, ivory, dark, "LM7")
    # Training rack S69-57058/60/61: upper and lower sample cases, spare round
    # ECS cartridges beside them. Flight hardware envelopes/positions estimated.
    lm5_equipment.sample_cases(bay, alloy, dark, "LM7", stations=((0, 76), (0, 94)))
    cartridges, retaining = MeshBuilder(), MeshBuilder()
    for x in (-20.5, -13.2):
        tube(cartridges, (x, 6, 72), (x, 6, 83), 3.1)
        tube(retaining, (x, 6, 76.2), (x, 6, 77.3), 3.2)
    cartridges.build("LM7_MESASpareCartridges", ivory, bay)
    retaining.build("LM7_MESACartridgeStraps", alloy, bay)
    # A.2: LM-7 replaced the MESA's D-ring with a loop of cable. Station estimated.
    loop = MeshBuilder()
    path = [(21, 0.5, 112), (20, 0.5, 110), (20.3, 0.5, 108.7), (21.4, 0.5, 108.4), (22.2, 0.5, 109.4), (21, 0.5, 112)]
    for a, b in zip(path, path[1:]):
        tube(loop, a, b, 0.15)
    loop.build("LM7_MESAReleaseLoop", alloy, bay)


def build(parts, alloy, amber, dark, white, linen):
    lm5_equipment.surface_bays(parts["LMSurfaceEquipment"], None, parts["LMDescent"], alloy, amber, dark, white, mesa_load=mesa, prefix="LM7")
    station, rtg = lm6_equipment.science_frame(parts, alloy, dark, "LM7")
    lm6_equipment.generator_and_carrier(rtg, alloy, dark, "LM7")
    drill, stems = MeshBuilder(), MeshBuilder()
    drill_x = 10.24
    box(drill, (drill_x, 1, 8.5), (4, 7, 6))
    tube(drill, (drill_x, 1, 11.2), (drill_x, 1, 15.2), 1.1)
    tube(drill, (drill_x, -2.5, 12), (drill_x, 4.5, 12), 0.52)
    for z in (5, 7.2, 9.4, 11.6, 13.8):
        tube(stems, (-10, 8.5, z), (10, 8.5, z), 0.7)
    drill.build("LM7_LunarSurfaceDrill", white, rtg)
    stems.build("LM7_DrillStemRack", alloy, rtg)

    chassis, seismometer, cplee, gauges, braces, heatflow = (MeshBuilder() for _ in range(6))
    box(chassis, (0, 0, 5.5), (20, 14.5, 6.5))
    seismometer.lathe(prof([(0, 9), (4.5, 9), (4.7, 10), (4.7, 24.6), (4.2, 25.5), (0, 25.5)]), 24, matrix=Matrix.Translation(point(5.4, 1, 0)))
    box(cplee, (-5.2, 2.6, 15.2), (8.5, 7.4, 12.5))
    for x in (-8.4, -2):
        tube(braces, (x, -1.35, 10.3), (-10.4 - x, -1.35, 20.1), 0.22)
    box(gauges, (-5.2, -4, 13.4), (7.1, 4.0, 8.8))
    box(gauges, (-5.2, -3.9, 19.3), (4.5, 3.7, 3.4))
    for z in (3.8, 6.3):
        tube(heatflow, (-9, -8, z), (9, -8, z), 0.65)
    chassis.build("LM7_CentralStationElectronics", alloy, station)
    seismometer.build("LM7_PassiveSeismometer", amber, station)
    cplee.build("LM7_ChargedParticleDetector", white, station)
    braces.build("LM7_DetectorBracing", alloy, station)
    gauges.build("LM7_ColdCathodeGauge", dark, station)
    heatflow.build("LM7_HeatFlowProbeStowage", white, station)
    lm6_equipment.fuel_cask(parts["LMFuelCask"], alloy, white, "LM7")
    lm6_equipment.hammocks(parts["LMHammocks"], linen, dark, "LM7")


def mailbox(parent, alloy, dark, linen):
    # One of the two square command-module cartridges connected to the suit returns.
    assembly = group("LM7_MailboxAssembly", parent)
    assembly.location = point(18, 11.7, 183)
    tape = material("lm7-gray-tape", (0.35, 0.34, 0.30), roughness=0.64)
    bag = material("lm7-garment-bag", (0.65, 0.62, 0.51), roughness=0.45)
    shell, face, screen, bands, folds, hose, cuffs = (MeshBuilder() for _ in range(7))
    box(shell, (0, 0, 0), (7.4, 5.5, 7.4))
    box(face, (0, -2.87, 0), (6.55, 0.11, 6.55))
    for i in range(-9, 10):
        x = i / 3
        tube(screen, (x, -3.01, -3.19), (x, -3.01, 3.19), 0.036)
        tube(screen, (-3.19, -3.24, x), (3.19, -3.24, x), 0.036)
    for x in (-3.45, -1.12, 1.12, 3.45):
        box(bands, (x, -3.13, 0), (0.28, 0.15, 7.15))
        for span in (-2.28, 0, 2.28):
            box(bands, (span, -3.13, x), (2.00, 0.15, 0.28))
    for x in (-2.55, 2.55):
        box(bands, (x, 0.15, 3.79), (0.9, 5.45, 0.16))
    # The garment bag forms a plenum behind the cartridge. The tape seals around the hose.
    for z, width, depth in ((-3.93, 6.95, 4.9), (-4.65, 5.9, 4.1), (-5.26, 4.4, 3.2)):
        box(folds, (0, 0.6, z), (width, depth, 0.79))
    path = [(0, 0.65, -5.6), (0, 0.6, -7.2), (-0.6, 0.7, -8.8), (-2.0, 1.1, -10.0), (-4, 2.3, -10.5), (-6, 4.6, -9.6), (-7, 6, -7.8)]
    for start, end in zip(path, path[1:]):
        tube(hose, start, end, 1.1)
        for f in (0.22, 0.65):
            a = tuple(x + (y - x) * f for x, y in zip(start, end))
            b = tuple(x + (y - x) * (f + 0.10) for x, y in zip(start, end))
            tube(cuffs, a, b, 1.17)
    shell.build("LM7_MailboxCanister", tape, assembly)
    face.build("LM7_MailboxFilterBed", dark, assembly)
    screen.build("LM7_MailboxMesh", alloy, assembly)
    bands.build("LM7_MailboxFaceGridAndTape", linen, assembly)
    folds.build("LM7_MailboxGarmentBag", bag, assembly)
    hose.build("LM7_MailboxSuitReturnHose", linen, assembly)
    cuffs.build("LM7_MailboxHoseRibs", tape, assembly)
