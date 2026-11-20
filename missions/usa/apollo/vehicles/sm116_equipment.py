"""CSM-116 Skylab service equipment. SOH vol. I, fig. 1-29 and §§2.5–2.6; dimensions in inches."""

import math

import bpy
from mathutils import Matrix, Vector

from service_tanks import _ball, _lathe, profile
from srlib import IN, MeshBuilder, interior, material

SECTOR = Matrix.Rotation(math.radians(40), 4, "Z")


def solar_coating(cm_base):
    # A material boundary on the actual shell preserves its apertures and cutaway.
    # Baseline white paint boundaries are estimated.
    coat = material("skylab-csm-solar-white", (0.83, 0.83, 0.79), roughness=0.72, double_sided=True)
    bpy.context.view_layer.update()
    for name in ("CM_CrewCompartmentSkin", "CM_ForwardShield", "CM_SideHatchCover", "SM_Panels", "SM_CM_Fairing"):
        obj = bpy.data.objects[name]
        obj.data.materials.append(coat)
        index = len(obj.data.materials) - 1
        for face in obj.data.polygons:
            if (obj.matrix_world @ face.center).x < 0:
                face.material_index = index

    # First-visit thermal changes, JSC-08414 §7.2, fig. 7-1. Register the
    # drawing's +Y direction to the model. Its curved CM edges are estimated.
    tape = material("skylab-116-thermal-tape", (0.68, 0.70, 0.65), metallic=0.89, roughness=0.29)
    for name in ("CM_AftShield", "CM_CrewCompartmentSkin", "SM_EPSRadiators"):
        obj = bpy.data.objects[name]
        obj.data.materials.append(tape)
        for face in obj.data.polygons:
            p = obj.matrix_world @ face.center
            azimuth = math.degrees(math.atan2(p.y, p.x)) % 360
            xc = p.z / IN - cm_base
            if name == "SM_EPSRadiators":
                # Local segments 270..292.5, 90..112.5 and 45..67.5 are 1, 5 and 4.
                # Fig. 7-1 gives an area fraction for panel 4; the exact strip edge is estimated.
                covered = 270 < azimuth < 292.5 or 90 < azimuth < 112.5 or (45 < azimuth < 67.5 and xc < -0.5)
            else:
                covered = 45 < azimuth < 260 and 18.8 < xc < 38.8
            if covered:
                face.material_index = len(obj.data.materials) - 1


def build(groups, origin_xa, cm_base):
    solar_coating(cm_base)
    # SOH figs. 2.8-31/32: opposed VHF scimitars near the Apollo Y axes.
    # Reconstruct the asymmetric radome section and integral foot from the drawing.
    radome = material("skylab-vhf-ceramic", (0.77, 0.76, 0.68), roughness=0.48)
    curve = [
        (-7, 0),
        (-7, 0.5),
        (-6.3, 0.8),
        (-5.7, 2.5),
        (-4.1, 4.6),
        (-2.2, 5.7),
        (0, 6.1),
        (2.3, 5.9),
        (4.4, 5.2),
        (5.6, 4.1),
        (6.1, 0.8),
        (6.7, 0.6),
        (6.7, 0),
    ]
    for sign in (-1, 1):
        vertices = [(t * IN, sign * (76.6 + rise) * IN, (origin + 937 - origin_xa) * IN) for t in (-0.53, 0.53) for origin, rise in curve]
        n = len(curve)
        faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        faces.extend([tuple(reversed(range(n))), tuple(range(n, n * 2))])
        blade = MeshBuilder()
        blade.add(vertices, [tuple(reversed(face)) if sign < 0 else face for face in faces])
        blade.build(f"SM116_Scimitar_{sign}", radome, groups["VHFAntennas"], smooth=False)
    if not interior():
        return
    alloy = material("skylab-rcs-titanium", (0.53, 0.54, 0.52), metallic=0.76, roughness=0.39)
    frame = material("skylab-equipment-rack", (0.26, 0.29, 0.30), metallic=0.72)
    gold = material("skylab-descent-cell-case", (0.55, 0.48, 0.32), metallic=0.58, roughness=0.48)
    insulator = material("skylab-terminal-insulator", (0.12, 0.095, 0.074), roughness=0.56)
    vessels = groups["PropellantStorageModule"]
    batteries = groups["DescentBatteries"]
    water = groups["ServiceWaterTank"]

    def station(r, t, xa):
        return SECTOR @ Vector((r, t, xa - origin_xa))

    def box(builder, r, t, xa, dims):
        builder.box(Vector(dims) * IN, Matrix.Translation(station(r, t, xa) * IN) @ SECTOR)

    # The handbook specifies counts and envelopes; rack positions within bay I are estimated.
    radius, length = 12.64 / 2, 38.819
    rack = MeshBuilder()
    fittings = MeshBuilder()
    locations = [(43, -7), (43, 7), (55.5, -19.5), (55.5, -6.5), (55.5, 6.5), (55.5, 19.5), (68, -13), (68, 0), (68, 13)]
    for i, (r, t) in enumerate(locations):
        tank = "Oxidizer" if i < 5 else "Fuel"
        name = f"SM116_PSM_{tank}{i + 1 if i < 5 else i - 4}"
        centre = station(r, t, 892)
        _lathe(name, profile(radius, 0, length), centre, alloy, vessels)
        for h in (-1.5, length - 0.2):
            _lathe(f"{name}_Port{int(h)}", [(0, 0), (0.9, 0), (0.9, 1.7), (0, 1.7)], centre + Vector((0, 0, h)), frame, vessels)
    for i, (r, t) in enumerate(((48, 0), (63, -12.5), (63, 12.5)), 1):
        centre = station(r, t, 942)
        _ball(f"SM116_PSM_Helium{i}", 12.37, centre, alloy, vessels)
        fittings.tube(station(r, t, 932.4) * IN, station(r, t, 937.4) * IN, 2.5 * IN, segs=24)
        fittings.tube(centre * IN, station(r, t, 949.5) * IN, 0.82 * IN, segs=10)
    for r, width in ((43, 26), (55.5, 50), (68, 37)):
        for xa in (890, 932.5):
            box(rack, r, 0, xa, (3.4, width, 1.0))
    for t in (-11.5, 11.5):
        box(rack, 56, t, 889.1, (31, 1.35, 0.72))
        box(rack, 56, t, 933.4, (31, 1.35, 0.72))
    for t in (-11.5, 11.5):
        box(rack, 42.7, t, 911.25, (0.95, 0.95, 44.2))
    rack.build("SM116_PSM_Cradle", frame, vessels)
    fittings.build("SM116_PSM_HeliumNecks", frame, vessels)

    # Silver-zinc cases and binding posts are representative, below the PSM on their carrier.
    cases, covers, terminals, bushings = (MeshBuilder() for _ in range(4))
    for r, t in ((42, 0), (61, -12), (61, 12)):
        box(cases, r, t, 860, (17, 21, 27))
        box(covers, r, t, 874.1, (17.3, 21.3, 0.9))
        for side in (-1, 1):
            x = r + 4.3 * side
            bushings.tube(station(x, t + 6.5, 874.7) * IN, station(x, t + 6.5, 875.5) * IN, 0.94 * IN, segs=16)
            terminals.tube(station(x, t + 6.5, 875.5) * IN, station(x, t + 6.5, 876.4) * IN, 0.50 * IN, segs=16)
            box(covers, r, t + side * 9.1, 846.1, (18.3, 1.15, 0.65))
    cases.build("SM116_DescentBatteryCases", gold, batteries, smooth=False)
    covers.build("SM116_DescentBatteryCoversAndFeet", frame, batteries, smooth=False)
    bushings.build("SM116_DescentBatteryBushings", insulator, batteries)
    terminals.build("SM116_DescentBatteryPosts", alloy, batteries)

    # SOH fig. 1-29 places water below the surviving SPS helium vessel, over the engine.
    centre = (0, 0, 902 - origin_xa)
    _lathe("SM116_WaterTank", profile(13, 0, 31), centre, alloy, water)
    _lathe("SM116_WaterTankOutlet", [(0, 31), (1.3, 31), (1.3, 33), (0, 33)], centre, frame, water)


def parasol(parent, cm_base):
    """First-visit parasol in its T027 science-airlock canister, launch stowage under the couches."""
    if not interior():
        return
    case = material("skylab-parasol-canister", (0.75, 0.74, 0.69), metallic=0.48, roughness=0.46)
    fittings = material("skylab-parasol-backplate", (0.41, 0.45, 0.45), metallic=0.67, roughness=0.34)
    dark = material("skylab-parasol-retainers", (0.25, 0.24, 0.20), roughness=0.84)
    origin = Vector((10, 0, cm_base + 22.5))

    def at(x, y, z):
        return (origin + Vector((x, y, z))) * IN

    def block(builder, x, y, z, dim):
        builder.box(Vector(dim) * IN, Matrix.Translation(at(x, y, z)))

    # 53 × 8 × 8 in, NASA's first-visit history. The pressurizable plate
    # and central rod passage follow JSC-08414 §3; under-couch orientation is estimated.
    body, plate, retainers = MeshBuilder(), MeshBuilder(), MeshBuilder()
    block(body, 0, 0.1, 0, (7.63, 51.7, 7.63))
    for end in (-1, 1):
        block(plate, 0, end * 26.0, 0, (8, 0.43, 8))
    # A collar around the deployment-rod gland on the removable backplate.
    plate.tube(at(0, -26.18, 0), at(0, -26.5, 0), 0.97 * IN, segs=24)
    for y in (-15, 15):
        for x in (-3.91, 3.91):
            block(retainers, x, y, 0, (0.18, 1.38, 7.6))
        for z in (-3.91, 3.91):
            block(retainers, 0, y, z, (8.0, 1.38, 0.18))
    body.build("CM116_ParasolCanister", case, parent, smooth=False)
    plate.build("CM116_ParasolEndFittings", fittings, parent, smooth=False)
    retainers.build("CM116_ParasolStowageBands", dark, parent, smooth=False)
