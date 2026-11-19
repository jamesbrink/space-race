"""Block II CSM exterior. The default configuration is Apollo 7's CSM-101. Drawing units: inches; +Z noseward, hatch on +X.

NASA Apollo 7 press kit (68-168K), pp. 25–27 and Figures 25b/25d.
SM stations use the CSM-101 preflight reference; fittings remain provisional.
command_module.py supplies the nominal lower CM profile and shared measured apertures.
The optional forward-end fittings and service antenna follow the spacecraft selected. See apollo-csm.md.
"""

import math

from mathutils import Vector

import apollo8_equipment
import apollo_docking
import cabin_bays
import command_module
import console_equipment
import dsky_equipment
import dsky_front
import forward_compartment
import hatch_interior
import main_console
import pressure_vessel
import service_tanks
import side_hatch
import unitized_couch
import window_glazing
from srlib import IN, TAU, MeshBuilder, frame, group, lathe_obj, mark_shells, material, prof

RADIUS = command_module.RADIUS
# Apollo integrated stations, retained in source inches. CSM-101 reference:
# MIT R-547 (October 1966), Figure 1.4, p.1-16; NAA 1967 training ST-304C.
SM_AFT_XA = 838.0
SM_FORWARD_XA = 993.0
CM_DATUM_XA = 1000.0
SM_AFT_XS = 200.0
SPS_EXTENSION_ATTACH_XS = 180.0
# NAA News Reference, SPS detailed description p.161: nominal Block II engine.
SPS_EXTENSION_LENGTH = 112.0
SPS_EXIT_RADIUS = 94.5 / 2
SPS_EXTENSION_ATTACH_XA = SM_AFT_XA + SPS_EXTENSION_ATTACH_XS - SM_AFT_XS
SPS_EXIT_XA = SPS_EXTENSION_ATTACH_XA - SPS_EXTENSION_LENGTH
# Model origin is now the derived nozzle exit; no published total is fitted.
SM_BOTTOM = SM_AFT_XA - SPS_EXIT_XA
SM_TOP = SM_FORWARD_XA - SPS_EXIT_XA
SM_BODY = SM_FORWARD_XA - SM_AFT_XA
CM_BASE = CM_DATUM_XA - SPS_EXIT_XA
CM_HEIGHT = command_module.COVER_TOP
CM_TOP = CM_BASE + CM_HEIGHT
# AOH Block II (1969), p.1-49: 26-inch, 13-foot-diameter CM/SM fairing.
FAIRING_HEIGHT = 26.0
FAIRING_RADIUS = 13 * 12 / 2
# MIT R-547 vol.III, Table1.3 p.1-18, NAA-S-22 preflight CSM-101 data.
# Coordinates locate the quad reference, not a surveyed housing's centre.
RCS_QUAD_XA = 958.905
RCS_QUAD_RADIUS = 83.56
RCS_CLOCKWISE_DEGREES = 7.25
RCS_NOZZLE_CANT_DEGREES = 10.0
RCS_STATION = RCS_QUAD_XA - SPS_EXIT_XA
# NAA Apollo News Reference, Reaction Control, p.150: nominal R-4D exit.
# This does not establish the intermediate contour or wall/rim thickness.
RCS_EXIT_DIAMETER = 5.6
# Inherited display rim, still estimated; not a measured nozzle wall thickness.
BELL_RIM = 0.3


def radial(radius, angle, z):
    return (radius * IN * math.cos(angle), radius * IN * math.sin(angle), z * IN)


def tube(name, a, b, radius, mat, parent):
    mesh = MeshBuilder()
    mesh.tube(a, b, radius * IN, segs=12)
    return mesh.build(name, mat, parent)


def bell(name, origin, direction, length, radius, mat, parent):
    """Open nozzle with a recessed inner wall and finite rim, all in inches."""
    obj = lathe_obj(
        name,
        prof(
            [
                (radius, 0),
                (radius * 0.77, length * 0.28),
                (radius * 0.36, length * 0.72),
                (radius * 0.23, length),
                (radius * 0.16, length),
                (radius * 0.29, length * 0.72),
                (radius * 0.70, length * 0.28),
                (radius - BELL_RIM, 0),
                (radius, 0),
            ]
        ),
        mat,
        parent,
        segs=64,
    )
    obj.matrix_local = frame(origin, direction)
    return obj


def build(offset=0, *, spacecraft=101):
    """Build top-level part nodes, translated together by offset inches."""
    if spacecraft not in (101, 103, 104, 106, 107):
        raise ValueError(f"Unmodelled CSM-{spacecraft}")
    lunar = spacecraft != 101
    probe_installed = spacecraft in (104, 106, 107)
    white = material("apollo-radiator-white", (0.82, 0.84, 0.80), roughness=0.65)
    silver = material("apollo-aluminium", (0.56, 0.60, 0.63), metallic=0.85, roughness=0.33)
    foil = material("apollo-cm-silver", (0.64, 0.67, 0.69), metallic=0.88, roughness=0.25)
    dark = material("apollo-nozzle", (0.13, 0.14, 0.15), metallic=0.55, roughness=0.65)
    void = material("window-void-apollo", (0.012, 0.025, 0.035), roughness=0.25)
    groups = {
        name: group(name)
        for name in (
            "CommandModule",
            "SideHatch",
            "CabinStructure",
            "CabinWindows",
            "MainConsole",
            "FlightDirectorIndicators",
            "ConsoleEquipment",
            "DSKYFrontWeb",
            "CrewCouches",
            "CabinEquipmentBays",
            "HeatShield",
            "ForwardShield",
            "ForwardCompartment",
            "ServiceModule",
            "ServiceSumpTanks",
            "ServicePower",
            "ServiceHelium",
            "ServiceEngine",
            "ReactionControl",
        )
    }
    sm = groups["ServiceModule"]

    fairing_top = SM_TOP + FAIRING_HEIGHT
    service_tanks.panels(sm, RADIUS, SM_BOTTOM, SM_TOP, FAIRING_RADIUS, fairing_top, command_module.radius(fairing_top - CM_BASE), white, silver)
    # These meshes enclose the service-module compartments. Clip both wall
    # faces, the rims, seams and fairing together; leaving an
    # unmarked inner wall would make the apparent opening solid again.
    # The quads and engine are separate nodes and remain whole in cutaway.
    mark_shells([obj.name for obj in sm.children if obj.type == "MESH"])
    service_tanks.build(groups["ServiceSumpTanks"], SPS_EXIT_XA)
    service_tanks.pressurant(groups["ServiceHelium"], SPS_EXIT_XA)
    service_tanks.power(groups["ServicePower"], SPS_EXIT_XA)
    service_tanks.structure(sm, SPS_EXIT_XA)
    service_tanks.engine(groups["ServiceEngine"], SPS_EXTENSION_LENGTH, SPS_EXIT_RADIUS)
    # Four independent quads; four chambers each: axial pair and tangential pair.
    for i in range(4):
        # The press kit's axis description is schematic. R-547 Table1.3
        # explicitly clocks the quad references 7°15' clockwise looking aft;
        # Block II AOH p.2.5-1 independently confirms that offset.
        a = TAU * i / 4 - math.radians(RCS_CLOCKWISE_DEGREES)
        out = Vector((math.cos(a), math.sin(a), 0))
        tangent = Vector((-math.sin(a), math.cos(a), 0))
        centre = Vector(radial(RCS_QUAD_RADIUS, a, RCS_STATION))
        mesh = MeshBuilder()
        mesh.box((13 * IN, 12 * IN, 15 * IN), frame(centre, out))
        mesh.build(f"RCS_Block_{i}", white, groups["ReactionControl"])
        for j, along in enumerate((Vector((0, 0, 1)), Vector((0, 0, -1)), tangent, -tangent)):
            # `axis` points down the exhaust plume, opposite the table's
            # thrust vector. Cant every mouth outward from the panel. The
            # table's vectors assume unclocked quads (its explicit footnote),
            # so this local basis also applies the 7°15' placement rotation.
            cant = math.radians(RCS_NOZZLE_CANT_DEGREES)
            axis = along * math.cos(cant) + out * math.sin(cant)
            mouth = centre + axis * (15 * IN) + out * (2 * IN)
            bell(f"RCS_Nozzle_{i}_{j}", mouth, -axis, 9, RCS_EXIT_DIAMETER / 2, dark, groups["ReactionControl"])
    hatch = groups["SideHatch"]
    hatch_leaf = side_hatch.hinge(hatch, "Side_Hatch_Pivot", CM_BASE, command_module.radius, side_hatch.opening())
    command_module.build(
        groups["CommandModule"],
        groups["HeatShield"],
        groups["ForwardShield"],
        hatch_leaf,
        CM_BASE,
        foil,
        void,
        docking_ring=probe_installed,
    )
    hatch_interior.build(hatch_leaf, CM_BASE, lightweight=spacecraft in (106, 107))
    forward_compartment.build(groups["ForwardCompartment"], CM_BASE, combined_hatch=lunar, hatch_setback=10 if probe_installed else 0)
    pressure_vessel.build(groups["CabinStructure"], CM_BASE)
    window_glazing.build(groups["CabinWindows"], CM_BASE, hatch_parent=hatch_leaf)
    side_hatch.register_leaf(hatch_leaf)
    main_console.build(groups["MainConsole"], CM_BASE)
    dsky_front.build(groups["DSKYFrontWeb"], CM_BASE)
    dsky_equipment.build(groups["DSKYFrontWeb"], CM_BASE)
    console_equipment.indicators(groups["FlightDirectorIndicators"], CM_BASE, spacecraft=spacecraft)
    console_equipment.equipment(groups["ConsoleEquipment"], CM_BASE, spacecraft=spacecraft)
    cabin_bays.build(groups["CabinEquipmentBays"], CM_BASE)
    unitized_couch.build(groups["CrewCouches"], CM_BASE, foldable=lunar)
    if lunar:
        groups["HighGainAntenna"] = group("HighGainAntenna")
        apollo8_equipment.antenna(groups["HighGainAntenna"], SM_BOTTOM)
        apollo8_equipment.navigation(groups["CabinEquipmentBays"], CM_BASE)
    if probe_installed:
        # Inside the right rendezvous window, visible to the LM crew (Apollo Program Summary Report, section 4.7.5).
        # Register to the reconstructed pane. Target size and standoff are estimates.
        normal = Vector((0.5163366, -0.0096678, 0.8563311))
        centre = Vector((38.47952, 25.65527, CM_BASE + 60.92348)) * IN - normal * (1.1 * IN)
        target = MeshBuilder()
        target_pose = frame(centre, normal)
        target.lathe(prof([(1.9, 0), (2.24, 0), (2.24, 0.13), (1.9, 0.13), (1.9, 0)]), 40, matrix=target_pose)
        for x, y in ((1, 0), (0, 1)):
            target.tube(
                target_pose @ Vector((-2 * x * IN, -2 * y * IN, 0)), target_pose @ Vector((2 * x * IN, 2 * y * IN, 0)), 0.085 * IN, segs=8, caps=False
            )
        green = material("apollo-target-green", (0.06, 0.36, 0.14), emission=(0.05, 0.38, 0.12), emission_strength=0.55)
        red = material("apollo-target-red", (0.63, 0.052, 0.033))
        target.build("CM104_TargetBackplateMarkings", green, groups["CabinWindows"])
        base = MeshBuilder()
        base.lathe(prof([(0, -0.3), (2.3, -0.3), (2.3, -0.16), (0, -0.16)]), 40, matrix=target_pose)
        base.build("CM104_TargetBase", green, groups["CabinWindows"])
        sight = MeshBuilder()
        sight.lathe(prof([(0.24, -0.13), (0.24, 0.55), (0.55, 0.61), (0.55, 0.77), (0, 0.77)]), 24, matrix=target_pose)
        sight.build("CM104_RendezvousWindowTarget", red, groups["CabinWindows"])
        probe = groups["DockingProbe"] = group("DockingProbe")
        apollo_docking.command(probe, CM_BASE, silver, void)
    mark_shells(["CM_CrewCompartmentSkin", "CM_ForwardShield", "CM_AftShield"])
    for obj in groups.values():
        obj.location.z = offset * IN
    cabin_bays.shade(groups, CM_BASE + offset)
    return groups
