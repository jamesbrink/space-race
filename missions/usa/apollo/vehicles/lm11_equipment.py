"""Orion's J-2 equipment in launch stowage. Inches above the footpad plane unless noted. See lm-11.md."""

import math

from mathutils import Matrix

import lm5_equipment
import lm6_equipment
import lm10_equipment
from lm5_equipment import box, point, tube
from lm8_equipment import quadrant
from srlib import MeshBuilder, frame, group, mark_shells, material, prof


def ultraviolet(parts, alloy, amber, dark, white):
    """J-2 science plan, figs 2-16 and 2-35. Reconstruct local mounting and folded tripod geometry."""
    bay = quadrant(parts["LMFarUV"], "LM11_QuadIIICameraPallet", -58.5, -58.5, 315)
    optics = group("LM11_OpticalAssembly", bay)
    optics.location = point(12.5, 8, 89)
    head, yoke, spectrograph, legs, film, pupil, screws = (MeshBuilder() for _ in range(7))
    # The optical head sits across the top of the spectrograph. The 3-inch entrance faced one end.
    axis = frame(point(0, 0, 12), (1, 0, 0))
    head.lathe(prof([(0, -6), (3.3, -6), (3.8, -4.6), (3.8, 5.8), (3.25, 6.7), (2.5, 6.7), (2.2, 6.3), (1.5, 6.3)]), 48, matrix=axis)
    pupil.lathe(prof([(0, 6.25), (1.5, 6.25)]), 40, matrix=axis)
    box(film, (-7.7, 0, 12), (2.8, 5.1, 4))
    box(spectrograph, (0, 0, 4), (5.5, 5.3, 7.7))
    # Camera magnets and the notched altitude circle visible in J-2 fig. 2-35(b).
    for along in (1.7, 4.6):
        screws.lathe(prof([(3.65, along - 0.38), (4.05, along - 0.38), (4.05, along + 0.38), (3.65, along + 0.38)]), 36, matrix=axis)
    alt_axis = frame(point(0, -4.4, 12), (0, -1, 0))
    yoke.lathe(prof([(3.8, 0), (4.5, 0), (4.5, 0.38), (3.8, 0.38)]), 36, matrix=alt_axis, arc=(0, math.pi))
    for a in range(15, 180, 15):
        angle = math.radians(a)
        tube(screws, (4.0 * math.cos(angle), -4.84, 12 + 4.0 * math.sin(angle)), (4.4 * math.cos(angle), -4.84, 12 + 4.4 * math.sin(angle)), 0.08)
    for y in (-2.1, 2.1):
        tube(film, (-9.0, y, 11.5), (-10.3, y, 11.5), 0.29)
    tube(film, (-10.3, -2.1, 11.5), (-10.3, 2.1, 11.5), 0.30)
    for y in (-4.5, 4.5):
        tube(yoke, (0, y, 0.3), (0, y, 12.2), 0.55)
        tube(screws, (0, y - 0.55, 12.2), (0, y + 0.55, 12.2), 0.82)
    yoke.lathe(prof([(0, -1), (5.6, -1), (6, -0.8), (6, 0), (5.6, 0.2), (0, 0.2)]), 36)
    for i in range(36):
        a = math.tau * i / 36
        x, y = math.cos(a), math.sin(a)
        tube(screws, (5.15 * x, 5.15 * y, 0.29), (5.68 * x, 5.68 * y, 0.29), 0.065)
    for i in range(3):
        a = math.tau * i / 3
        x, y = math.cos(a), math.sin(a)
        tube(legs, (4.7 * x, 4.7 * y, -1.3), (2.7 * x, 2.7 * y, -16.0), 0.53)
        tube(legs, (2.7 * x, 2.7 * y, -15.75), (2.2 * x, 2.2 * y, -19.5), 0.34)
        box(legs, (2.2 * x, 2.2 * y, -19.8), (1.8, 1.5, 0.30))
        tube(screws, (4.7 * x, 4.7 * y, -1.5), (4.7 * x, 4.7 * y, 1.45), 0.42)
    head.build("LM11_SchmidtCamera", amber, optics)
    pupil.build("LM11_CameraAperture", dark, optics)
    yoke.build("LM11_CameraPointingMount", alloy, optics)
    spectrograph.build("LM11_Spectrograph", amber, optics)
    film.build("LM11_FilmTransport", alloy, optics)
    legs.build("LM11_FoldedTripod", alloy, optics)
    screws.build("LM11_CameraPivotsAndLevelers", dark, optics)
    pack = MeshBuilder()
    box(pack, (12.5, 13, 83), (8, 3.8, 9.8))
    pack.build("LM11_CameraBattery", white, bay)
    # The crew lifted a bagged camera from this pallet. The outer cover leaves with the thermal skins in cutaway.
    cover = quadrant(parts["LMDescent"], "LM11_CameraCoverMount", -58.5, -58.5, 315)
    bag = MeshBuilder()
    bag.lathe(
        prof([(0, 67.3), (5.8, 67.3), (9.8, 70.5), (10.8, 78), (10.8, 103.7), (8.3, 107), (4.0, 108.5), (0, 108.5)]),
        16,
        matrix=Matrix.Translation(point(12.5, 8.3, 0)) @ Matrix.Diagonal((1.24, 1.03, 1, 1)),
    )
    mark_shells([bag.build("LM11_CameraStowageBag", white, cover).name])


def cosmic_detector(root, alloy, dark):
    """J-2 fig 2-32 and AS16-107-17441. The four hinged panels sit one above another on the aft face."""
    # SP-315 §15A measured panel 2's exposed detector area in centimetres.
    width, height = 22.6 / 2.54, 14.7 / 2.54
    stride = height + 1.20
    frame_mesh, pins, pull = MeshBuilder(), MeshBuilder(), MeshBuilder()
    facing = material("lm11-perforated-foil", (0.67, 0.69, 0.69), metallic=0.65, roughness=0.48)
    y, z0 = 26.8, 69.3
    for i in range(4):
        z = z0 + stride * i
        plate = MeshBuilder()
        box(plate, (-84.6, y, z), (0.7, width, height))
        plate.build(f"LM11_DetectorPanel{i + 1}", facing if i < 2 else alloy, root)
        for sign in (-1, 1):
            box(frame_mesh, (-84.20, y + sign * (width / 2 + 0.35), z), (0.9, 0.55, stride - 0.20))
        box(frame_mesh, (-84.20, y, z - height / 2 - 0.36), (0.9, width + 0.55, 0.48))
        tube(pins, (-84.7, y - 2.8, z + height / 2 + 0.29), (-84.7, y + 2.8, z + height / 2 + 0.29), 0.20)
    box(frame_mesh, (-84.20, y, z0 + 3 * stride + height / 2 + 0.55), (0.9, width + 0.65, 0.42))
    tube(pull, (-85.3, y - 5.4, z0 + 3 * stride), (-85.5, y - 6.3, z0 - 4.3), 0.11)
    tube(pull, (-85.5, y - 6.3, z0 - 4.3), (-85.5, y - 5.5, z0 - 5.1), 0.20)
    frame_mesh.build("LM11_DetectorFrame", dark, root)
    pins.build("LM11_DetectorHinges", alloy, root)
    pull.build("LM11_WindowShadeLanyard", alloy, root)


def mesa(bay, alloy, white, dark):
    lm5_equipment.sample_cases(bay, alloy, dark, "LM11")
    cases, camera, drill = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for x in (-15.5, 5.6, 18):
        box(cases, (x, 11, 102), (8.3, 6, 13))
    box(camera, (-8, -0.9, 109), (7.4, 5.8, 5.2))
    tube(camera, (-4.1, -0.9, 109), (0.4, -0.9, 109), 1.6)
    box(drill, (13.5, 3.3, 98), (5.4, 3.9, 8.2))
    tube(drill, (10.8, 3.3, 94), (8.7, 3.3, 90.2), 0.6)
    tube(drill, (16.2, 3.3, 94), (18.3, 3.3, 90.2), 0.6)
    cases.build("LM11_MESALoadPallets", white, bay)
    camera.build("LM11_GroundCommandedTelevisionCamera", white, bay)
    drill.build("LM11_LunarSurfaceDrill", alloy, bay)


def rover_tools(carrier, alloy, dark, white, linen):
    """Packed against the quadrant III pallet. J-2 figs 2-16 and 2-33(b), surface procedures fig 3.4-1."""
    # Move the carrier frame ahead of the pallet face so its clips can actually hold the tools.
    carrier.location = point(-12, 3.5, 55)
    meter, reel, bags, tools, dials = (MeshBuilder() for _ in range(5))
    box(meter, (-2, -0.9, 45), (7.6, 4.2, 6))
    for x in (-4.4, -2, 0.4):
        box(dials, (x, -3.19, 46), (1.8, 0.18, 1.2))
    # The electronics box and cable reel ride together. The collapsed sensor tripod has its own sheath.
    reel.lathe(
        prof([(0, -1.0), (2.7, -1.0), (2.7, -0.75), (2.2, -0.75), (2.2, 0.75), (2.7, 0.75), (2.7, 1.0), (0, 1.0)]),
        28,
        matrix=frame(point(-2, 0.0, 52), (0, -1, 0)),
    )
    box(bags, (-8.5, 0.35, 37.3), (2.0, 2.8, 18))
    tube(tools, (-8.5, 0.35, 46.5), (-8.5, 0.35, 52.5), 0.57)
    box(meter, (-8.5, 0.35, 53.7), (2.5, 2.15, 2))
    # The self-recording penetrometer's upper assembly contains a recording drum.
    tube(tools, (3.4, -0.5, 19.0), (3.4, -0.5, 45.0), 0.28)
    tube(tools, (3.4, -0.5, 44.8), (3.4, -0.5, 50.5), 1.05)
    for x in (6, 8):
        tube(tools, (x, 0.1, 19), (x, 0.1, 45), 0.28)
        tube(tools, (x, 0.1, 44.8), (x + 0.55, 0.1, 47.3), 0.29)
        tube(tools, (x, 0.1, 19.25), (x - 0.68, 0.1, 16.3), 0.39)
    meter.build("LM11_PortableMagnetometerReadoutAndSensor", white, carrier)
    dials.build("LM11_MagnetometerDisplays", dark, carrier)
    reel.build("LM11_MagnetometerCableReel", dark, carrier)
    bags.build("LM11_FoldedTripodSheath", linen, carrier)
    tools.build("LM11_StowedPenetrometerAndTongs", alloy, carrier)


def build(parts, alloy, amber, dark, white, linen):
    carrier = lm10_equipment.rover_and_pallet(parts, alloy, amber, dark, white, "LM11", mesa)
    rover_tools(carrier, alloy, dark, white, linen)
    # Apollo 16 mission report appendix A.3.2, new dust-covered bags under both seats.
    bags, lids = MeshBuilder(), MeshBuilder()
    for x in (-12, 12):
        box(bags, (x, 4.3, 88), (15, 4.2, 13))
        box(lids, (x, 6.7, 88), (15.4, 0.4, 13.4))
    seat_frame = quadrant(parts["LMRover"], "LM11_UnderseatMount", 58.5, 58.5, 135)
    bags.build("LM11_UnderseatStowage", linen, seat_frame)
    lids.build("LM11_UnderseatDustFlaps", white, seat_frame)
    ultraviolet(parts, alloy, amber, dark, white)
    cosmic_detector(parts["LMCosmicRayDetector"], alloy, dark)
    # J-2 fig 2-14. Passive and active seismic equipment and the stationary magnetometer rode on pallet one.
    station, rtg = lm6_equipment.science_frame(parts, alloy, dark, "LM11")
    lm6_equipment.generator_and_carrier(rtg, alloy, dark, "LM11", carrier_parent=carrier)
    base, seismic, geophones, poles = (MeshBuilder() for _ in range(4))
    box(base, (0, 0, 5.9), (21.5, 15.4, 7.4))
    seismic.lathe(prof([(0, 10), (4, 10), (4.5, 11), (4.5, 22), (3.8, 23), (0, 23)]), 28, matrix=Matrix.Translation(point(5.5, 0, 0)))
    for x in (-8.7, -6.2, -3.7):
        tube(poles, (x, -5.7, 11), (x, 5.7, 20), 0.85)
    for y in (-4, 0, 4):
        tube(geophones, (-5.7, y, 11.3), (-1.7, y, 11.3), 1.1)
    base.build("LM11_ALSEPCentralStation", alloy, station)
    seismic.build("LM11_PassiveSeismometer", white, station)
    poles.build("LM11_FoldedMagnetometerArms", white, station)
    geophones.build("LM11_ActiveSeismicGeophones", dark, station)
    cases, fittings = MeshBuilder(), MeshBuilder()
    box(cases, (-5, -3.4, 27.7), (9.4, 3.6, 13.2))
    box(cases, (5, -3.4, 25.4), (9.6, 3.6, 8.6))
    box(fittings, (0, 2.5, 23.8), (20, 4.1, 4.6))
    for x in (-7, -2.4, 2.4, 7):
        tube(fittings, (x, 0.6, 26.2), (x, 0.6, 29.5), 1.08)
    cases.build("LM11_HeatFlowProbeBoxAndElectronics", white, rtg)
    fittings.build("LM11_ActiveSeismicPallet", alloy, rtg)
    lm6_equipment.fuel_cask(parts["LMFuelCask"], alloy, white, "LM11")
    lm6_equipment.hammocks(parts["LMHammocks"], linen, dark, "LM11")
