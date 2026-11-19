"""Challenger's surface payload as packed. Inches in local pallet frames; see lm-12.md."""

import math

import lm5_equipment
import lm6_equipment
import lm10_equipment
import lrv3_equipment
from lm5_equipment import box, point, tube
from lm8_equipment import quadrant
from srlib import MeshBuilder, frame, group, mark_shells, prof


def mesa(bay, alloy, white, dark):
    lm5_equipment.sample_cases(bay, alloy, dark, "LM12")
    pallets, camera, rods, caps = (MeshBuilder() for _ in range(4))
    for x in (-21, -8, 8, 21):
        box(pallets, (x, 11, 100), (9, 7, 17))
    box(camera, (-1, -1.1, 110), (8, 6, 5))
    tube(camera, (3, -1.1, 110), (7.4, -1.1, 110), 1.65)
    # The 240 cm neutron probe travelled in two sections. Press kit p. 46.
    half_length, radius = 120 / 2.54, 1 / 2.54
    for y in (3, 4.4):
        tube(rods, (-half_length / 2, y, 112.5), (half_length / 2, y, 112.5), radius)
        tube(caps, (half_length / 2 - 0.65, y, 112.5), (half_length / 2 + 0.20, y, 112.5), radius + 0.11)
    probe = group("LM12_PackedNeutronProbe", bay)
    rods.build("LM12_NeutronProbeSections", alloy, probe)
    caps.build("LM12_ProbeEndCaps", dark, probe)
    pallets.build("LM12_MESAPallets", white, bay)
    camera.build("LM12_MESATelevisionCamera", white, bay)


def quad_three(root, name):
    return quadrant(root, name, -58.5, -58.5, 315)


def gravimeter(parts, dark, alloy):
    mount = quad_three(parts["LMTraverseGravimeter"], "LM12_GravimeterMount")
    lrv3_equipment.traverse_gravimeter(alloy, dark, part=mount, origin=(-13, 0.9, 91.3))


def electrical_properties(parts, white, alloy, dark):
    mount = quad_three(parts["LMSEP"], "LM12_SEPPallet")
    tx, panel, mast, reels = (MeshBuilder() for _ in range(4))
    box(tx, (9.8, 8, 82.4), (17.7, 9.5, 11.6))
    # Solar panels folded against the transmitter. The two dipoles rode on side reels.
    for x in (0.5, 19.1):
        box(panel, (x, 8, 82.4), (0.5, 9.7, 12.5))
    for x in (5.2, 14.5):
        reels.lathe(
            prof([(0, 0), (3.3, 0), (3.3, 0.42), (2.8, 0.42), (2.8, 1.8), (3.3, 1.8), (3.3, 2.25), (0, 2.25)]),
            32,
            matrix=frame(point(x, 3.0, 82.5), (0, -1, 0)),
        )
    lrv3_equipment.sep_receiver(alloy, white, dark, part=mount, origin=(10, 8.0, 91.0), deployed=False)
    # The rover-mounted receiver and its folded antenna travel with the transmitter.
    for x in (18.8, 20.1):
        tube(mast, (x, 9, 91), (x, 9, 111), 0.38)
    tx.build("LM12_SEPTransmitter", white, mount)
    panel.build("LM12_SEPFoldedPanelsAndCover", dark, mount)
    reels.build("LM12_SEPAntennaReels", alloy, mount)
    mast.build("LM12_SEPFoldedAntenna", alloy, mount)


def survey_cargo(parts, white, alloy):
    # Outer transport envelopes only, stowed inboard in III (Appendix F, fig. 2-4).
    bay = quad_three(parts["LMSeismicCargo"], "LM12_SeismicTransportMount")
    cases, rails = MeshBuilder(), MeshBuilder()
    for x in (-12.5, 10.5):
        box(cases, (x, 18.7, 76.8), (15.5, 7.5, 14.4))
        for dx in (-7.1, 7.1):
            tube(rails, (x + dx, 14.7, 69), (x + dx, 14.7, 84.7), 0.40)
        tube(rails, (x - 5.1, 18.7, 84.4), (x + 5.1, 18.7, 84.4), 0.46)
    cases.build("LM12_SeismicSurveyTransportCases", white, bay)
    rails.build("LM12_SeismicTransportRetainers", alloy, bay)


def cosmic_detector(root, dark, alloy):
    # Mission report fig. A-7: two faces carried together in the ascent cabin until EVA 1.
    base, slide, rings = MeshBuilder(), MeshBuilder(), MeshBuilder()
    box(base, (14, 27.5, 144.2), (7.4, 0.55, 4.8))
    box(slide, (14, 27.08, 144.2), (7.28, 0.14, 4.6))
    for x in (9.72, 18.28):
        for i in range(16):
            a, b = i * math.tau / 16, (i + 1) * math.tau / 16
            tube(
                rings, (x + 0.76 * math.cos(a), 27.46, 144.2 + 0.76 * math.sin(a)), (x + 0.76 * math.cos(b), 27.46, 144.2 + 0.76 * math.sin(b)), 0.105
            )
    base.build("LM12_CosmicRaySunBox", alloy, root)
    slide.build("LM12_CosmicRayShadeSlide", dark, root)
    rings.build("LM12_CosmicRayPullRings", alloy, root)


def build(parts, alloy, amber, dark, white, linen):
    carrier = lm10_equipment.rover_and_pallet(parts, alloy, amber, dark, white, "LM12", mesa)
    seat_frame = quadrant(parts["LMRover"], "LM12_UnderseatMount", 58.5, 58.5, 135)
    bags = MeshBuilder()
    for x in (-12, 12):
        box(bags, (x, 4.3, 88), (15, 4.2, 13))
        box(bags, (x, 6.7, 88), (15.4, 0.4, 13.4))
    bags.build("LM12_UnderseatBagsAndFlaps", linen, seat_frame)
    gravimeter(parts, dark, alloy)
    electrical_properties(parts, white, alloy, dark)
    survey_cargo(parts, white, alloy)
    cosmic_detector(parts["LMCosmicRayDetector"], dark, alloy)
    cover = quad_three(parts["LMDescent"], "LM12_PalletBlanketMount")
    blanket = MeshBuilder()
    box(blanket, (0, -6.9, 91.3), (53, 0.42, 46.8))
    mark_shells([blanket.build("LM12_QuadIIIBlanket", amber, cover).name])
    station, rtg = lm6_equipment.science_frame(parts, alloy, dark, "LM12")
    lm6_equipment.generator_and_carrier(rtg, alloy, dark, "LM12", carrier_parent=carrier)
    # Array E, figs 2-2 and 2-3. Distinct packed instrument cases and handling hardware.
    cases, controls, locks, sleeves = (MeshBuilder() for _ in range(4))
    box(cases, (0, 0, 4.6), (21.8, 16.0, 4.8))
    box(cases, (-6.5, 3.0, 14.0), (7.3, 9.1, 13.8))
    box(cases, (4.3, -2.5, 13.3), (11.1, 8.1, 12.4))
    for x in (-8.9, -4.1, 0.2, 8.4):
        tube(locks, (x, -7.1, 7.1), (x, -7.1, 12), 0.38)
    for i in range(4):
        x = -7.9 + i * 4.6
        box(controls, (x, -8.36, 4.4), (2.25, 0.37, 1.6))
    for x in (-7.3, -2.6, 2.2, 7.1):
        tube(sleeves, (x, 9.2, 7.2), (x, 9.2, 18.0), 0.68)
    # Cross-braced central station shelf, thermal panels, handling loops and face connectors (fig. 2-2).
    for x in (-9.9, -4.95, 0, 4.95):
        tube(locks, (x, -8.12, 2.6), (x + 4.35, -8.12, 6.35), 0.18)
        tube(locks, (x, -8.12, 6.35), (x + 4.35, -8.12, 2.6), 0.18)
    for x, y, z, height in ((-6.5, -1.75, 14.0, 13.8), (4.3, -6.82, 13.3, 12.4)):
        for side in (-1, 1):
            box(controls, (x + side * 2.45, y, z), (0.20, 0.17, height - 0.75))
    for z in (15.8, 17.1, 18.4):
        tube(locks, (0.0, -6.87, z), (7.5, -6.87, z), 0.16)
    cases.build("LM12_ArrayEStationAndInstrumentCases", white, station)
    controls.build("LM12_ArrayEConnectors", dark, station)
    locks.build("LM12_ArrayEHoldDowns", alloy, station)
    sleeves.build("LM12_ArrayEGeophoneSet", alloy, station)
    packs, tie = MeshBuilder(), MeshBuilder()
    box(packs, (-5.2, -0.7, 25.5), (9.2, 9, 9.6))
    box(packs, (5.4, -0.7, 26.2), (10.3, 9.3, 10.8))
    for x in (-6.8, 7.2):
        tube(tie, (x, -5.6, 21.1), (x, -5.6, 29.8), 0.27)
    # A light rack bridges the generator and the packed experiment cases; the generator comes out below.
    for x in (-10, 10):
        for y in (-5.9, 5.9):
            tube(tie, (x, y, 2.1), (x, y, 20.65), 0.34)
        tube(tie, (x, -6.2, 20.55), (x, 6.2, 20.55), 0.52)
    for y in (-5.9, 5.9):
        tube(tie, (-10, y, 20.55), (10, y, 20.55), 0.47)
    for x in (-5.2, 5.4):
        tube(tie, (x, -5.7, 20.7), (x, -5.7, 30.2), 0.24)
        tube(tie, (x, -5.7, 30.2), (x, 4.25, 30.2), 0.24)
    packs.build("LM12_ArrayEHeatFlowAndEjectaInstrumentPacks", linen, rtg)
    tie.build("LM12_ArrayEPackRestraints", alloy, rtg)
    lm6_equipment.fuel_cask(parts["LMFuelCask"], alloy, white, "LM12")
    lm6_equipment.hammocks(parts["LMHammocks"], linen, dark, "LM12")
