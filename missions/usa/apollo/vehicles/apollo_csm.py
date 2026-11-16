"""Apollo 7's CSM-101 exterior. Drawing units: inches; +Z noseward, hatch on +X.

NASA Apollo 7 press kit (68-168K), pp. 25–27 and Figures 25b/25d.
Overall envelopes are documented (rounded); all surface stations and fittings estimated
from those figures. No interior, docking probe or lunar high-gain antenna is invented.
"""

import math

from mathutils import Vector

from srlib import IN, TAU, MeshBuilder, frame, group, lathe_obj, material, prof

RADIUS = 77.0  # press kit p. 25, 12 ft 10 in
CM_HEIGHT = 144.0  # p. 25, 12 ft (rounded)
SM_HEIGHT = 264.0  # p. 25, 22 ft: includes the engine extension here (estimated partition)
SM_BODY = 154.0  # estimated from Figure 25b, not a dimensioned station drawing
CM_BASE = SM_HEIGHT
CM_TOP = CM_BASE + CM_HEIGHT


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
                (radius - 0.3, 0),
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
    shield = material("apollo-ablator", (0.29, 0.24, 0.20), roughness=0.85)
    void = material("window-void-apollo", (0.012, 0.025, 0.035), roughness=0.25)
    groups = {name: group(name) for name in ("CommandModule", "HeatShield", "ServiceModule", "ServiceEngine", "ReactionControl")}
    sm = groups["ServiceModule"]
    # Engine begins at Z0, shell starts above it: no false 22-foot cylindrical barrel.
    z0 = SM_HEIGHT - SM_BODY
    rings = (z0, z0 + 15, z0 + 58, SM_HEIGHT - 16, SM_HEIGHT)
    heights = sorted({z0, SM_HEIGHT, *[z + d for z in rings for d in (-0.3, 0.3) if z0 < z + d < SM_HEIGHT]})
    for i in range(24):
        a0, a1 = TAU * i / 24, TAU * (i + 1) / 24
        for lo, hi in zip(heights, heights[1:]):
            mid = (lo + hi) / 2
            radiator = mid < z0 + 58 and i % 6 in (1, 2, 3, 4) or mid > SM_HEIGHT - 16
            paint = seam if any(abs(mid - z) < 0.31 for z in rings) else white if radiator else silver
            mesh = MeshBuilder()
            mesh.lathe(prof([(RADIUS, lo), (RADIUS, hi)]), segs=4, arc=(a0, a1))
            mesh.build(f"SM_Panel_{i}_{lo}", paint, sm)
    # Apollo 7 press kit, p. 26: 1-inch aluminium honeycomb shell.
    # A real inner wall and annular edges, not a two-sided paint sheet.
    lathe_obj("SM_InnerWall", prof([(RADIUS - 1, SM_HEIGHT), (RADIUS - 1, z0)]), white, sm)
    lathe_obj("SM_LowerRim", prof([(RADIUS - 1, z0), (RADIUS, z0)]), silver, sm)
    lathe_obj("SM_UpperRim", prof([(RADIUS, SM_HEIGHT), (RADIUS - 1, SM_HEIGHT)]), silver, sm)
    for i in range(6):
        a = TAU * i / 6
        tube(f"SM_Seam_{i}", radial(77.2, a, z0 + 1), radial(77.2, a, SM_HEIGHT - 1), 0.18, seam, sm)
    lathe_obj("SM_AftBulkhead", prof([(0, z0 + 1), (76, z0 + 1)]), dark, sm)
    bell("SPS_Bell", (0, 0, 0), (0, 0, 1), 112, 29, dark, groups["ServiceEngine"])
    # Four independent quads; four chambers each: axial pair and tangential pair.
    for i in range(4):
        a = TAU * (i + 0.5) / 4
        out = Vector((math.cos(a), math.sin(a), 0))
        tangent = Vector((-math.sin(a), math.cos(a), 0))
        centre = Vector(radial(82, a, SM_HEIGHT - 55))
        mesh = MeshBuilder()
        mesh.box((13 * IN, 12 * IN, 15 * IN), frame(centre, out))
        mesh.build(f"RCS_Block_{i}", white, groups["ReactionControl"])
        for j, axis in enumerate((Vector((0, 0, 1)), Vector((0, 0, -1)), tangent, -tangent)):
            mouth = centre + axis * (15 * IN) + out * (2 * IN)
            bell(f"RCS_Nozzle_{i}_{j}", mouth, -axis, 9, 3.4, dark, groups["ReactionControl"])
    cm = groups["CommandModule"]
    # Five actual holes in a conical skin, with dark recesses until a cabin is built.
    windows = [(0, 54, 15, 14), (85, 63, 15, 15), (-85, 63, 15, 15), (32, 96, 12, 15), (-32, 96, 12, 15)]

    def radius(z):
        return RADIUS - (RADIUS - 17) * z / CM_HEIGHT

    angles = sorted({-180, 180, *range(-180, 181, 3), *[v for a, _, w, _ in windows for v in (a - w / 2, a + w / 2)]})
    heights = sorted({4, CM_HEIGHT, *[v for _, z, _, h in windows for v in (z - h / 2, z + h / 2)]})
    mesh = MeshBuilder()
    hatch_mesh = MeshBuilder()
    for a0, a1 in zip(angles, angles[1:]):
        for lo, hi in zip(heights, heights[1:]):
            a, z = (a0 + a1) / 2, (lo + hi) / 2
            if any(abs(a - wa) < w / 2 and abs(z - wz) < h / 2 for wa, wz, w, h in windows):
                continue
            target = hatch_mesh if abs(a) < 19 and 25 < z < 85 else mesh
            target.lathe(prof([(radius(lo), CM_BASE + lo), (radius(hi), CM_BASE + hi)]), segs=1, arc=(math.radians(a0), math.radians(a1)))
    mesh.build("CM_Skin", foil, cm)
    hatch_mesh.build("CM_Hatch", silver, cm)
    for i, (a, z, w, h) in enumerate(windows):
        lo, hi = z - h / 2, z + h / 2
        a0, a1 = math.radians(a - w / 2), math.radians(a + w / 2)
        recess = MeshBuilder()
        recess.lathe(prof([(radius(lo) - 1, CM_BASE + lo), (radius(hi) - 1, CM_BASE + hi)]), segs=8, arc=(a0, a1))
        recess.build(f"CM_WindowRecess_{i}", void, cm)
        pts = [radial(radius(zz) + 0.35, aa, CM_BASE + zz) for aa, zz in ((a0, lo), (a1, lo), (a1, hi), (a0, hi))]
        for j in range(4):
            tube(f"CM_WindowFrame_{i}_{j}", pts[j], pts[(j + 1) % 4], 0.65, seam, cm)
    lathe_obj("CM_ForwardDeck", prof([(17, CM_TOP), (0, CM_TOP)]), foil, cm)
    lathe_obj("CM_TunnelHatch", prof([(0, CM_TOP + 0.2), (11, CM_TOP + 0.2), (11, CM_TOP + 0.7), (0, CM_TOP + 0.7)]), silver, cm)
    lathe_obj(
        "CM_AftShield",
        prof([(0, CM_BASE - 3), (45, CM_BASE - 2), (73, CM_BASE), (77, CM_BASE + 1), (RADIUS - (RADIUS - 17) * 4 / CM_HEIGHT, CM_BASE + 4)]),
        shield,
        groups["HeatShield"],
    )
    for obj in groups.values():
        obj.location.z = offset * IN
    return groups
