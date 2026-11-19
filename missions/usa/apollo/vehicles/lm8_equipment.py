"""Antares exterior installations and experiment pallets. Dimensions in inches; sources and estimates in lm-8.md."""

import math

from mathutils import Matrix

import lm5_equipment
import lm6_equipment
from lm5_equipment import box, point, tube
from srlib import MeshBuilder, frame, group, mark_shells, prof


def quadrant(root, name, x, y, angle):
    local = group(name, root)
    local.location = point(x, y, 0)
    local.rotation_euler.z = math.radians(angle)
    return local


def transporter(root, skin, alloy, dark, white, amber):
    # The folded cart rode on the bottom of the MESA. The mission report gives
    # the attachment; the folded outline and arrangement behind the blanket are estimated.
    bay = quadrant(root, "LM8_METMount", 58.5, -58.5, 45)
    # Fig. 3.1-2 shows a compact rectangular package. Its protective thermal
    # blanket stayed on until EVA-1. Isolating the cart exposes the folded wheels.
    wrap = quadrant(skin, "LM8_METWrapMount", 58.5, -58.5, 45)
    blanket = MeshBuilder()
    verts = [
        point(x, y, z)
        for y, half, low, high in ((-1.2, 14.5, 70, 114), (-11.9, 13.8, 70.4, 113.5), (-12.8, 11.9, 72, 112))
        for x, z in ((-half, low), (half, low), (half, high), (-half, high))
    ]
    faces = [(8, 9, 10, 11)]
    for ring in (0, 4):
        faces.extend((ring + i, ring + (i + 1) % 4, ring + 4 + (i + 1) % 4, ring + 4 + i) for i in range(4))
    blanket.add(verts, faces)
    mark_shells([blanket.build("LM8_METThermalBlanket", amber, wrap, smooth=False).name])
    chassis, supports, sling, tires, wheels = (MeshBuilder() for _ in range(5))
    for x in (-12, 12):
        for z in (84.8, 110):
            tube(supports, (x, 1.8, z), (x, -4.2, z), 0.75)
        tube(chassis, (x, -4, 72), (x, -4, 112), 0.66)
        tube(supports, (x, -4, 108), (x / 2, -6.1, 79), 0.55)
        tube(supports, (x, -4, 74), (x + 1, -5.6, 87), 0.45)
    for z in (72, 86, 99, 112):
        tube(chassis, (-12, -4, z), (12, -4, z), 0.66)
    tube(supports, (-6, -6.1, 79), (6, -6.1, 79), 0.66)
    box(sling, (0, -3, 92), (24.2, 1.1, 35.8))
    for z in (83, 102):
        tube(supports, (-12, -4, z - 4.2), (0, -7.95, z), 0.55)
        tube(supports, (0, -7.8, z), (0, -9, z), 0.78)
        axis = frame(point(0, -9.2, z), (0, -1, 0))
        tires.lathe(prof([(5.1, -1.3), (6.8, -2), (7.7, -1.3), (8, 0), (7.7, 1.3), (6.8, 2), (5.1, 1.3), (5.1, -1.3)]), 48, matrix=axis)
        wheels.lathe(
            prof([(0, -1.3), (1, -1.3), (1.6, -0.4), (4.7, -0.7), (5.6, -0.95), (5.6, 0.95), (4.7, 0.7), (1.6, 0.4), (1, 1.3), (0, 1.3)]),
            48,
            matrix=axis,
        )
    chassis.build("LM8_METTubularFrame", alloy, bay)
    supports.build("LM8_METFoldedHandleAndLegs", alloy, bay)
    sling.build("LM8_METLoadBed", white, bay)
    tires.build("LM8_METPneumaticTires", dark, bay)
    wheels.build("LM8_METWheelHubs", alloy, bay)


def mesa(bay, alloy, white, dark):
    lm6_equipment.color_camera(bay, alloy, white, dark, "LM8")
    lm5_equipment.sample_cases(bay, alloy, dark, "LM8")
    flag = MeshBuilder()
    tube(flag, (23.5, 3.3, 72), (23.5, 3.3, 112), 1.4)
    flag.build("LM8_MESAFlagKit", alloy, bay)


def outside_instruments(parts, alloy, white, dark):
    # A.2.1: covered reflector on quadrant I, portable magnetometer on quadrant II.
    q1 = quadrant(parts["LMRetroreflector"], "LM8_ReflectorMount", 60, 60, 135)
    q1.location += point(0, 0, 8)
    support, panel, cover = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(panel, (0, -3.5, 90), (19.4, 3, 18.1))
    box(cover, (0, -5.2, 90), (19, 0.3, 17.7))
    for x in (-9.9, 9.9):
        tube(support, (x, -4.2, 80.4), (x, -4.2, 100.2), 0.45)
        for z in (82, 98):
            tube(support, (x, -4, z), (x, 2.3, z), 0.6)
    support.build("LM8_ReflectorBrackets", alloy, q1)
    panel.build("LM8_CornerCubePanelCase", alloy, q1)
    cover.build("LM8_ReflectorDustCover", white, q1)
    q2 = lm6_equipment.bay_frame("LM8_LPMMount", parts["LMPortableMagnetometer"])
    rails, meter, tripod, reel = (MeshBuilder() for _ in range(4))
    for z in (84.5, 96):
        tube(rails, (10.9, -3.3, z), (22.8, -3.3, z), 0.64)
        for x in (10.9, 22.8):
            tube(rails, (x, -3.3, z), (x, 1.6, z), 0.6)
        tube(rails, (10.9, -3.3, z), (10.9, -5.5, z), 0.48)
        tube(rails, (10.9, -5.5, z), (14.8, -5.5, z), 0.45)
    rails.build("LM8_MagnetometerStowageRails", alloy, q2)
    box(meter, (19, -5.6, 87), (8, 5, 9))
    for x in (12.3, 13.4, 14.5):
        tube(tripod, (x, -5, 73), (x, -5, 102), 0.42)
    reel.lathe(
        prof([(0, -1.6), (3.4, -1.6), (3.4, -1.2), (2.6, -1.2), (2.6, 1.2), (3.4, 1.2), (3.4, 1.6), (0, 1.6)]),
        28,
        matrix=frame(point(19, -5.4, 96), (0, 1, 0)),
    )
    meter.build("LM8_MagnetometerReadout", white, q2)
    tripod.build("LM8_FoldedMagnetometerTripod", alloy, q2)
    reel.build("LM8_MagnetometerCableReel", dark, q2)


def build(parts, alloy, amber, dark, white, linen):
    lm5_equipment.surface_bays(parts["LMSurfaceEquipment"], None, parts["LMDescent"], alloy, amber, dark, white, mesa_load=mesa, prefix="LM8")
    transporter(parts["LMTransporter"], parts["LMDescent"], alloy, dark, linen, amber)
    outside_instruments(parts, alloy, white, dark)
    station, rtg = lm6_equipment.science_frame(parts, alloy, dark, "LM8")
    lm6_equipment.generator_and_carrier(rtg, alloy, dark, "LM8")
    chassis, passive, cplee, active, side, gauge = (MeshBuilder() for _ in range(6))
    box(chassis, (0, 0, 6), (20, 14.5, 7.5))
    passive.lathe(prof([(0, 10), (4.4, 10), (4.6, 11), (4.6, 24), (3.7, 25), (0, 25)]), 28, matrix=Matrix.Translation(point(5.4, 1, 0)))
    box(cplee, (-5.2, 2.6, 16.4), (8.5, 7.4, 12.4))
    box(active, (-5.2, -4.3, 14.7), (8.6, 4.4, 9.5))
    box(side, (0, 4.3, 26.4), (12.4, 5.0, 8.5))
    tube(gauge, (9.8, 3, 4), (9.8, 3, 17), 1.2)
    chassis.build("LM8_CentralStation", alloy, station)
    passive.build("LM8_PassiveSeismometer", amber, station)
    cplee.build("LM8_ChargedParticleDetector", white, station)
    active.build("LM8_ActiveSeismicPackage", dark, station)
    side.build("LM8_IonDetector", white, rtg)
    gauge.build("LM8_ColdCathodeGauge", alloy, rtg)
    lm6_equipment.fuel_cask(parts["LMFuelCask"], alloy, white, "LM8")
    lm6_equipment.hammocks(parts["LMHammocks"], linen, dark, "LM8")
