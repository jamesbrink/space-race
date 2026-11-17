"""Apollo 7's CSM-101 exterior. Drawing units: inches; +Z noseward, hatch on +X.

NASA Apollo 7 press kit (68-168K), pp. 25–27 and Figures 25b/25d.
SM stations use the CSM-101 preflight reference; fittings remain provisional.
command_module.py supplies the nominal lower CM profile and shared measured apertures.
Cabin structure is separate from its unfinished equipment; no docking probe or
lunar high-gain antenna is invented.
"""

import math

from mathutils import Vector

import command_module
import main_console
import pressure_vessel
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
RCS_STATION = CM_BASE - 41.10  # CSM-101 reference Figure 1.4, p.1-16
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


def build(offset=0):
    """Build top-level part nodes, translated together by offset inches."""
    white = material("apollo-radiator-white", (0.82, 0.84, 0.80), roughness=0.65)
    silver = material("apollo-aluminium", (0.56, 0.60, 0.63), metallic=0.85, roughness=0.33)
    foil = material("apollo-cm-silver", (0.64, 0.67, 0.69), metallic=0.88, roughness=0.25)
    dark = material("apollo-nozzle", (0.13, 0.14, 0.15), metallic=0.55, roughness=0.65)
    seam = material("apollo-joints", (0.12, 0.14, 0.15), roughness=0.6)
    void = material("window-void-apollo", (0.012, 0.025, 0.035), roughness=0.25)
    groups = {
        name: group(name)
        for name in (
            "CommandModule",
            "SideHatch",
            "CabinStructure",
            "MainConsole",
            "HeatShield",
            "ForwardShield",
            "ServiceModule",
            "ServiceEngine",
            "ReactionControl",
        )
    }
    sm = groups["ServiceModule"]

    def panel_lathe(name, profile, paint):
        """Retain mating panel edges at every level of detail.

        The barrel keeps 24 four-segment sectors. Independently decimating its
        annuli and the fairing would overlap at their shared R77 boundary.
        """
        mesh = MeshBuilder()
        for sector in range(24):
            mesh.lathe(prof(profile), segs=4, arc=(TAU * sector / 24, TAU * (sector + 1) / 24))
        return mesh.build(name, paint, sm)

    # Engine begins at Z0, shell starts above it: no false 22-foot cylindrical barrel.
    z0 = SM_BOTTOM
    rings = (z0, z0 + 15, z0 + 58, SM_TOP - 16, SM_TOP)
    heights = sorted({z0, SM_TOP, *[z + d for z in rings for d in (-0.3, 0.3) if z0 < z + d < SM_TOP]})
    for i in range(24):
        a0, a1 = TAU * i / 24, TAU * (i + 1) / 24
        for lo, hi in zip(heights, heights[1:]):
            mid = (lo + hi) / 2
            radiator = mid < z0 + 58 and i % 6 in (1, 2, 3, 4) or mid > SM_TOP - 16
            paint = seam if any(abs(mid - z) < 0.31 for z in rings) else white if radiator else silver
            mesh = MeshBuilder()
            mesh.lathe(prof([(RADIUS, lo), (RADIUS, hi)]), segs=4, arc=(a0, a1))
            mesh.build(f"SM_Panel_{i}_{lo}", paint, sm)
    # Apollo 7 press kit, p. 26: 1-inch aluminium honeycomb shell.
    # A real inner wall and annular edges, not a two-sided paint sheet.
    panel_lathe("SM_InnerWall", [(RADIUS - 1, SM_TOP), (RADIUS - 1, z0)], white)
    panel_lathe("SM_LowerRim", [(RADIUS - 1, z0), (RADIUS, z0)], silver)
    panel_lathe("SM_UpperRim", [(RADIUS, SM_TOP), (RADIUS - 1, SM_TOP)], silver)
    for i in range(6):
        a = TAU * i / 6
        tube(f"SM_Seam_{i}", radial(77.2, a, z0 + 1), radial(77.2, a, SM_TOP - 1), 0.18, seam, sm)
    lathe_obj("SM_AftBulkhead", prof([(0, z0 + 1), (76, z0 + 1)]), dark, sm)
    # The published fairing bridges the barrel and nominal aft shield. The
    # annular closure is derived from those envelopes; seals and beams await
    # reconstruction. A two-sided surface does not invent laminate thickness.
    fairing = material("apollo-cm-sm-fairing", (0.56, 0.60, 0.63), metallic=0.85, roughness=0.33, double_sided=True)
    fairing_top = SM_TOP + FAIRING_HEIGHT
    panel_lathe(
        "SM_CM_Fairing",
        [(RADIUS, SM_TOP), (FAIRING_RADIUS, SM_TOP), (FAIRING_RADIUS, fairing_top), (command_module.radius(fairing_top - CM_BASE), fairing_top)],
        fairing,
    )
    bell("SPS_Bell", (0, 0, 0), (0, 0, 1), SPS_EXTENSION_LENGTH, SPS_EXIT_RADIUS, dark, groups["ServiceEngine"])
    # Four independent quads; four chambers each: axial pair and tangential pair.
    for i in range(4):
        # Apollo 7 press kit p.26a: packages on ±Y and ±Z. The model's
        # hatch-facing basis is (-Zc, Yc, Xc), so those are cardinal here too.
        # A 45-degree offset would put every package between the real axes.
        a = TAU * i / 4
        out = Vector((math.cos(a), math.sin(a), 0))
        tangent = Vector((-math.sin(a), math.cos(a), 0))
        centre = Vector(radial(82, a, RCS_STATION))
        mesh = MeshBuilder()
        mesh.box((13 * IN, 12 * IN, 15 * IN), frame(centre, out))
        mesh.build(f"RCS_Block_{i}", white, groups["ReactionControl"])
        for j, axis in enumerate((Vector((0, 0, 1)), Vector((0, 0, -1)), tangent, -tangent)):
            mouth = centre + axis * (15 * IN) + out * (2 * IN)
            bell(f"RCS_Nozzle_{i}_{j}", mouth, -axis, 9, 3.4, dark, groups["ReactionControl"])
    command_module.build(groups["CommandModule"], groups["HeatShield"], groups["ForwardShield"], groups["SideHatch"], CM_BASE, foil, void)
    pressure_vessel.build(groups["CabinStructure"], CM_BASE)
    main_console.build(groups["MainConsole"], CM_BASE)
    mark_shells(["CM_CrewCompartmentSkin", "CM_ForwardShield", "CM_AftShield"])
    for obj in groups.values():
        obj.location.z = offset * IN
    return groups
