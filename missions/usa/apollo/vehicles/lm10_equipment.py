"""Falcon’s J-mission payload in launch stowage. Inches above the footpad plane. See lm-10.md."""

import math

from mathutils import Matrix

import lm5_equipment
import lm6_equipment
import srlib
from lm5_equipment import box, point, tube
from lm8_equipment import quadrant
from srlib import IN, MeshBuilder, frame, group, mark_shells, material, prof


def folded_wheel(root, name, x, z, sign, alloy, dark):
    # Press kit p. 83: 32 × 9 inches, wire tire, open bump stop and chevron tread strips.
    # A folded wheel axis and abbreviated mesh pitch are estimated from the deployment drawing.
    wheel = group(name, root)
    wheel.matrix_local = frame(point(x, 13.8, z), (-sign * 0.47, -0.883, 0))
    rim, wires, tread = MeshBuilder(), MeshBuilder(), MeshBuilder()
    rim.lathe(prof([(0, -3.8), (6, -3.8), (8.3, -2.5), (8.3, 2.5), (6, 3.8), (0, 3.8)]), 36)
    for rz, half in ((11.6, 2.8), (15.3, 2.25)):
        for h in (-half, half):
            rim.lathe(prof([(rz - 0.25, h - 0.14), (rz, h), (rz - 0.25, h + 0.14)]), 48)
    count = max(12, round(32 * srlib.DETAIL))
    for i in range(count):
        angle = math.tau * i / count
        for sign_z in (-1, 1):

            def at(r, theta, height):
                return point(r * math.cos(theta), r * math.sin(theta), height * sign_z)

            for pitch in (-1, 1):
                wires.tube(at(8.25, angle, 2.6), at(12.7, angle + pitch * 0.20, 4.5), 0.15 * IN, segs=5)
                wires.tube(at(12.7, angle + pitch * 0.20, 4.5), at(15.75, angle + pitch * 0.33, 0), 0.15 * IN, segs=5)
            # Thin titanium strips spanning part of the wire crown.
            vertices = [at(16, angle + delta, 0) for delta in (-0.027, 0.027)]
            vertices += [at(15.1, angle + delta, 3.3) for delta in (0.14, 0.09)]
            tread.add(vertices, [(0, 1, 2, 3)])
    # KSC-71PC-345 shows the short amber fenders over the folded flight wheels.
    fender = MeshBuilder()
    middle = 0 if sign > 0 else math.pi
    fender.lathe(prof([(16.35, -5.0), (16.75, -5.1), (17.1, -4.2), (17.1, 4.2), (16.75, 5.1), (16.35, 5.0)]), 14, arc=(middle - 0.73, middle + 0.73))
    fender.build(name + "RetractedFender", material("lm10-amber-fiberglass", (0.61, 0.19, 0.035), roughness=0.48, double_sided=True), wheel)
    wires.build(name + "WireTire", dark, wheel)
    rim.build(name + "HubAndBumpStop", alloy, wheel)
    titanium = material("lm10-titanium-tread", (0.42, 0.44, 0.44), metallic=0.63, roughness=0.53, double_sided=True)
    tread.build(name + "ChevronStrips", titanium, wheel, smooth=False)


def rover(parts, alloy, dark, white, prefix="LM10"):
    bay = quadrant(parts["LMRover"], f"{prefix}_QuadI", 58.5, 58.5, 135)
    # The underside of the center chassis faces outboard. Fore and aft fold over its inboard side.
    floor, framebars, mounts, seat = (MeshBuilder() for _ in range(4))
    box(floor, (0, -2.3, 92), (55, 2.3, 57))
    for x in range(-24, 25, 4):
        box(floor, (x, -3.78, 92), (0.55, 0.58, 54))
    for x in (-28.1, 28.1):
        tube(framebars, (x, -2.2, 62.7), (x, -2.2, 121.3), 0.85)
        tube(mounts, (x, -1, 64), (x * 0.45, 15, 59), 0.8)
        tube(mounts, (x * 0.38, -1, 63.8), (x * 0.45, 15, 59), 0.62)
    tube(mounts, (0, -1, 119), (0, 20, 119), 1.05)
    for z in (63, 92, 121):
        tube(framebars, (-28.1, -2.2, z), (28.1, -2.2, z), 0.82)
    for z, end in ((65, 91), (119, 93)):
        for x in (-12, 12):
            tube(framebars, (x, 2, z), (x, 5, end), 0.95)
            tube(framebars, (x, 5, end), (-x, 2, z), 0.48)
        tube(framebars, (-12, 5, end), (12, 5, end), 0.82)
    for x in (-12, 12):
        box(seat, (x, 0.1, 91), (20, 1.8, 23))
    box(seat, (0, 1.9, 75), (11, 2.5, 12))
    floor.build(f"{prefix}_CenterChassis", alloy, bay)
    framebars.build(f"{prefix}_FoldedChassis", alloy, bay)
    mounts.build(f"{prefix}_DeploymentSupports", dark, bay)
    seat.build(f"{prefix}_FoldedSeatAndBatteryCovers", white, bay)
    for end, z in (("Front", 77), ("Rear", 109.6)):
        for side, sign in (("Left", -1), ("Right", 1)):
            folded_wheel(bay, f"{prefix}_{end}{side}Wheel", 16.8 * sign, z, sign, alloy, dark)
    cover = quadrant(parts["LMDescent"], f"{prefix}_RoverBlanketMount", 58.5, 58.5, 135)
    blanket = MeshBuilder()
    box(blanket, (0, -4.41, 92), (57.6, 0.5, 59.8))
    mark_shells([blanket.build(f"{prefix}_RoverThermalCover", white, cover).name])


def mesa(bay, alloy, white, dark):
    lm5_equipment.sample_cases(bay, alloy, dark, "LM10")
    pallets, camera, fittings = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for x in (-21, -8, 8, 21):
        box(pallets, (x, 11, 100), (9, 7, 17))
        tube(fittings, (x - 3, 6.8, 105), (x + 3, 6.8, 105), 0.4)
    box(camera, (0, -0.9, 110), (8, 6, 5))
    tube(fittings, (4, -0.9, 110), (8.5, -0.9, 110), 1.6)
    pallets.build("LM10_MESALoadPallets", white, bay)
    camera.build("LM10_MESATelevisionCamera", white, bay)
    fittings.build("LM10_MESAFittings", dark, bay)


def rover_and_pallet(parts, alloy, amber, dark, white, prefix, mesa_load):
    rover(parts, alloy, dark, white, prefix)
    lm5_equipment.surface_bays(parts["LMSurfaceEquipment"], None, parts["LMDescent"], alloy, amber, dark, white, mesa_load=mesa_load, prefix=prefix)
    # The enlarged MESA projects forward from the earlier cabinet. Local depth and fairing are estimated.
    skirt = quadrant(parts["LMDescent"], f"{prefix}_EnlargedMESAMount", 58.5, -58.5, 45)
    cover = MeshBuilder()
    box(cover, (0, -4.0, 91), (61, 7.6, 54))
    mark_shells([cover.build(f"{prefix}_EnlargedMESACover", amber, skirt).name])
    pallet = quadrant(parts["LMRoverPallet"], f"{prefix}_QuadIIIRoverPallet", -58.5, -58.5, 315)
    carrier = group(f"{prefix}_ToolCarrierMount", pallet)
    carrier.location = point(-12, 7, 55)
    trays = MeshBuilder()
    box(trays, (-12, 8, 91), (20, 2, 47))
    for z in (68, 114):
        tube(trays, (-22, 8, z), (-2, 8, z), 0.8)
    trays.build(f"{prefix}_ToolPallet", alloy, pallet)
    return carrier


def build(parts, alloy, amber, dark, white, linen):
    carrier = rover_and_pallet(parts, alloy, amber, dark, white, "LM10", mesa)
    reflector = quadrant(parts["LMRetroreflector"], "LM10_QuadIIIReflectorPallet", -58.5, -58.5, 315)
    array, blanket, channels = (MeshBuilder() for _ in range(3))
    # The two leaves of the 300-cube reflector fold face to face for flight.
    box(array, (12, 5.3, 91), (26.1, 2.3, 24))
    box(array, (5.6, 2.3, 91), (12.8, 2.3, 24))
    box(blanket, (18.8, 3.75, 91), (12.3, 0.45, 23.6))
    # ALSEP-MT-05 table 2-2. The rails bound the 27.375 × 25.5 × 11.75-inch stowed assembly.
    for z in (78.875, 103.125):
        tube(channels, (-1.6875, 1.0, z), (25.6875, 1.0, z), 0.625)
    for x in (0, 24):
        tube(channels, (x, 1, 79), (x, 11.5, 91), 0.625)
        tube(channels, (x, 11.5, 91), (x, 1, 103), 0.625)
    array.build("LM10_FoldedReflectorPanels", alloy, reflector)
    blanket.build("LM10_ReflectorCover", white, reflector)
    channels.build("LM10_ReflectorPallet", dark, reflector)
    station, rtg = lm6_equipment.science_frame(parts, alloy, dark, "LM10")
    lm6_equipment.generator_and_carrier(rtg, alloy, dark, "LM10", carrier_parent=carrier)
    instruments, covers = MeshBuilder(), MeshBuilder()
    box(instruments, (0, 0, 6), (21, 15, 7))
    covers.lathe(prof([(0, 9.8), (4, 9.8), (4.5, 11), (4.5, 23), (3.8, 24), (0, 24)]), 28, matrix=Matrix.Translation(point(5.6, 0, 0)))
    for x, y in ((-6, -4), (-6, 3)):
        box(covers, (x, y, 16), (8, 5.3, 12))
    instruments.build("LM10_ALSEPCentralStation", alloy, station)
    covers.build("LM10_SeismicMagnetometerAndSpectrometer", white, station)
    # MSC mission J-1 science plan fig. 2-14: RTG behind the heat-flow experiment pallet;
    # ion detector / cold-cathode gauge on their own subpallet above it.
    probe, electronics, ion, rails = (MeshBuilder() for _ in range(4))
    box(probe, (-5.7, -3.1, 27), (8.6, 3.1, 11.5))
    box(electronics, (4.3, -3.1, 24.8), (9.8, 3.1, 7))
    box(ion, (1.3, 2.9, 30.7), (15, 8.2, 8.6))
    tube(rails, (-9.8, -5.1, 20.7), (9.8, -5.1, 20.7), 0.64)
    for x in (-10, 10):
        tube(rails, (x, -4.8, 20.7), (x, -4.8, 34), 0.48)
    probe.build("LM10_HeatFlowProbeBox", white, rtg)
    electronics.build("LM10_HeatFlowElectronics", dark, rtg)
    ion.build("LM10_IonDetectorAndGauge", alloy, rtg)
    rails.build("LM10_ExperimentSubpallets", alloy, rtg)
    lm6_equipment.fuel_cask(parts["LMFuelCask"], alloy, white, "LM10")
    lm6_equipment.hammocks(parts["LMHammocks"], linen, dark, "LM10")
