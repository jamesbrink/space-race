"""Skylab CSM service equipment. SOH vol. I, fig. 1-29 and §§2.5–2.6; dimensions in inches."""

import math

import bpy
from mathutils import Matrix, Vector

from service_tanks import _ball, _lathe, profile
from srlib import IN, MeshBuilder, interior, material

SECTOR = Matrix.Rotation(math.radians(40), 4, "Z")


def solar_coating(cm_base, spacecraft):
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
    tape = material(f"skylab-{spacecraft}-thermal-tape", (0.68, 0.70, 0.65), metallic=0.89, roughness=0.29)
    # JSC-08662 §7.2: CSM-117 retained shoulder tape and flew bare EPS radiators.
    surfaces = ["CM_AftShield", "CM_CrewCompartmentSkin"]
    if spacecraft == 116:
        surfaces.append("SM_EPSRadiators")
    for name in surfaces:
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


def build(groups, origin_xa, cm_base, spacecraft):
    solar_coating(cm_base, spacecraft)
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
        blade.build(f"SM{spacecraft}_Scimitar_{sign}", radome, groups["VHFAntennas"], smooth=False)
    if not interior():
        return
    alloy, frame = propellant_materials()
    gold = material("skylab-descent-cell-case", (0.55, 0.48, 0.32), metallic=0.58, roughness=0.48)
    insulator = material("skylab-terminal-insulator", (0.12, 0.095, 0.074), roughness=0.56)
    vessels = groups["PropellantStorageModule"]
    batteries = groups["DescentBatteries"]
    water = groups["ServiceWaterTank"]

    def station(r, t, xa):
        return SECTOR @ Vector((r, t, xa - origin_xa))

    def box(builder, r, t, xa, dims):
        builder.box(Vector(dims) * IN, Matrix.Translation(station(r, t, xa) * IN) @ SECTOR)

    propellant_module(vessels, origin_xa, spacecraft, finishes=(alloy, frame))

    # On 118 the battery compartment was under the coated forward corner
    # of bay I (JSC-08963 fig. 6-1); internal rack stations are estimated.
    if spacecraft == 118:
        for child in vessels.children:
            child.location.z -= 46 * IN
    # Pack envelopes and terminal details are common to the three ferries.
    cases, covers, terminals, bushings = (MeshBuilder() for _ in range(4))
    for i, (r, t) in enumerate(((42, 0), (61, -12), (61, 12))):
        pose = Matrix.Translation(station(r, t, 860) * IN) @ SECTOR
        if spacecraft == 118:
            angle = Matrix.Rotation(math.radians(34), 4, "Z")
            centre = angle @ Vector((62, 0, 936 + 22 * i - origin_xa))
            pose = Matrix.Translation(centre * IN) @ angle @ Matrix.Rotation(math.pi / 2, 4, "X")

        def point(x, y, z):
            if spacecraft != 118:
                return station(r + x, t + y, 860 + z) * IN
            return pose @ (Vector((x, y, z)) * IN)

        def plate(mesh, x, y, z, dims):
            if spacecraft != 118:
                box(mesh, r + x, t + y, 860 + z, dims)
                return
            mesh.box(Vector(dims) * IN, pose @ Matrix.Translation(Vector((x, y, z)) * IN))

        plate(cases, 0, 0, 0, (17, 21, 27))
        plate(covers, 0, 0, 14.1, (17.3, 21.3, 0.9))
        for side in (-1, 1):
            x = 4.3 * side
            bushings.tube(point(x, 6.5, 14.7), point(x, 6.5, 15.5), 0.94 * IN, segs=16)
            terminals.tube(point(x, 6.5, 15.5), point(x, 6.5, 16.4), 0.50 * IN, segs=16)
            plate(covers, 0, side * 9.1, -13.9, (18.3, 1.15, 0.65))
    cases.build(f"SM{spacecraft}_DescentBatteryCases", gold, batteries, smooth=False)
    covers.build(f"SM{spacecraft}_DescentBatteryCoversAndFeet", frame, batteries, smooth=False)
    bushings.build(f"SM{spacecraft}_DescentBatteryBushings", insulator, batteries)
    terminals.build(f"SM{spacecraft}_DescentBatteryPosts", alloy, batteries)

    # SOH fig. 1-29 places water below the surviving SPS helium vessel, over the engine.
    centre = (0, 0, 902 - origin_xa)
    _lathe(f"SM{spacecraft}_WaterTank", profile(13, 0, 31), centre, alloy, water)
    _lathe(f"SM{spacecraft}_WaterTankOutlet", [(0, 31), (1.3, 31), (1.3, 33), (0, 33)], centre, frame, water)


def propellant_materials():
    return (
        material("skylab-rcs-titanium", (0.53, 0.54, 0.52), metallic=0.76, roughness=0.39),
        material("skylab-equipment-rack", (0.26, 0.29, 0.30), metallic=0.72),
    )


def propellant_module(vessels, origin_xa, spacecraft, *, axial_shift=0, finishes=None):
    """Shared auxiliary RCS rack. SOH envelopes and estimated local placement."""
    if not interior():
        return
    alloy, frame = finishes if finishes is not None else propellant_materials()

    def station(r, t, xa):
        return SECTOR @ Vector((r, t, xa + axial_shift - origin_xa))

    def box(builder, r, t, xa, dims):
        builder.box(Vector(dims) * IN, Matrix.Translation(station(r, t, xa) * IN) @ SECTOR)

    # The handbook specifies counts and envelopes; rack positions within bay I are estimated.
    radius, length = 12.64 / 2, 38.819
    rack = MeshBuilder()
    fittings = MeshBuilder()
    middle, outer, pitch = (56.8, 68.2, 12.7) if spacecraft in (111, 118) else (55.5, 68, 13)
    locations = [(43, -7), (43, 7)] + [(middle, pitch * i) for i in (-1.5, -0.5, 0.5, 1.5)] + [(outer, pitch * i) for i in (-1, 0, 1)]
    for i, (r, t) in enumerate(locations):
        tank = "Oxidizer" if i < 5 else "Fuel"
        name = f"SM{spacecraft}_PSM_{tank}{i + 1 if i < 5 else i - 4}"
        centre = station(r, t, 892)
        _lathe(name, profile(radius, 0, length), centre, alloy, vessels)
        for h in (-1.5, length - 0.2):
            _lathe(f"{name}_Port{int(h)}", [(0, 0), (0.9, 0), (0.9, 1.7), (0, 1.7)], centre + Vector((0, 0, h)), frame, vessels)
    for i, (r, t) in enumerate(((48, 0), (63, -12.5), (63, 12.5)), 1):
        centre = station(r, t, 942)
        _ball(f"SM{spacecraft}_PSM_Helium{i}", 12.37, centre, alloy, vessels)
        fittings.tube(station(r, t, 932.4) * IN, station(r, t, 937.4) * IN, 2.5 * IN, segs=24)
        fittings.tube(centre * IN, station(r, t, 949.5) * IN, 0.82 * IN, segs=10)
    for r, width in ((43, 26), (middle, 50), (outer, 37)):
        for xa in (890, 932.5):
            box(rack, r, 0, xa, (3.4, width, 1.0))
    for t in (-11.5, 11.5):
        box(rack, 56, t, 889.1, (31, 1.35, 0.72))
        box(rack, 56, t, 933.4, (31, 1.35, 0.72))
    for t in (-11.5, 11.5):
        box(rack, 42.7, t, 911.25, (0.95, 0.95, 44.2))
    rack.build(f"SM{spacecraft}_PSM_Cradle", frame, vessels)
    fittings.build(f"SM{spacecraft}_PSM_HeliumNecks", frame, vessels)


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


def circadian(parent, origin_xa):
    """CSM-117 sector I. SOH §2.11.4; Northrop NORT 73-320 figs. 1-1/2. Inches."""
    from srlib import frame, prof

    # The handbook specifies the 40 x 24 x 20 in package envelope. Bay-I mounting station
    # and the sizes and spacing of the individual assemblies are reconstructed from photographs.
    origin = Vector((58.2, 0, 955.5 - origin_xa))

    def at(x, y, z):
        return (SECTOR @ (origin + Vector((x, y, z)))) * IN

    def box(mesh, x, y, z, dims):
        mesh.box(Vector(dims) * IN, Matrix.Translation(at(x, y, z)) @ SECTOR)

    def drum(name, x, y, z, length, radius, direction, finish):
        mesh = MeshBuilder()
        contour = [(0, 0), (radius * 0.93, 0), (radius, 0.32), (radius, length - 0.32), (radius * 0.93, length), (0, length)]
        mesh.lathe(prof(contour), segs=36, matrix=frame(at(x, y, z), SECTOR @ Vector(direction)))
        mesh.build("SM117_CPE_" + name, finish, parent)

    alloy = material("skylab-cpe-housings", (0.47, 0.50, 0.48), metallic=0.63, roughness=0.4)
    dark = material("skylab-cpe-electronics", (0.15, 0.17, 0.17), metallic=0.41)
    white = material("skylab-cpe-oxygen", (0.76, 0.78, 0.73), roughness=0.52)
    stainless = material("skylab-cpe-connections", (0.65, 0.67, 0.65), metallic=0.8)

    chassis = MeshBuilder()
    for y in (-15, 15):
        box(chassis, 0, y, 0.3, (24, 1.45, 0.6))
    box(chassis, 0, 0, 0.96, (22.8, 40, 0.56))
    box(chassis, 0, -19.68, 10.65, (20.2, 0.64, 18.68))
    chassis.build("SM117_CPE_ChassisAndColdPlate", dark, parent, smooth=False)

    # Reading from the front: sealed mouse chamber, forward-facing ECS pressure
    # enclosure with bolted cover, and the small pump beneath its pipework.
    for name, y, r, length in (("S071_MouseChamber", -8.55, 6.55, 16.5), ("S071_ECS", 7.35, 7.0, 15.5)):
        x, z = 10.5, r + 1.32
        drum(name, x, y, z, length, r, (-1, 0, 0), alloy)
        flange = MeshBuilder()
        ring = [(r - 0.38, 0), (r + 0.35, 0), (r + 0.35, 0.30), (r - 0.38, 0.30), (r - 0.38, 0)]
        flange.lathe(prof(ring), segs=36, matrix=frame(at(x - 0.4, y, z), SECTOR @ Vector((1, 0, 0))))
        for i in range(12):
            a = math.tau * i / 12
            flange.disc(at(x - 0.06, y + r * math.cos(a), z + r * math.sin(a)), SECTOR @ Vector((1, 0, 0)), 0.23 * IN, 0.23 * IN)
        flange.build(f"SM117_CPE_{name}Flange", stainless, parent)
    # Two cylindrical auxiliary coolant tanks lie crosswise along the rear edge.
    for i, y in enumerate((-9.1, 8.2), 1):
        drum(f"CoolantTank{i}", -8.05, y - 7.3, 4.35, 14.6, 2.85, (0, 1, 0), alloy)
    # The four circular vinegar-gnat enclosures sit on the rear shelf.
    shelf = MeshBuilder()
    box(shelf, -7.6, -2.0, 8.1, (8.4, 29.8, 0.5))
    shelf.build("SM117_CPE_InstrumentShelf", dark, parent, smooth=False)
    for i in range(4):
        drum(f"S072_Enclosure{i + 1}", -7.5, -13.2 + 7.2 * i, 8.48, 5.9, 3.3, (0, 0, 1), alloy)

    _ball("SM117_CPE_OxygenTank", 7.5, (SECTOR @ (origin + Vector((1.2, 14.1, 15.72)))), white, parent)
    electronics = MeshBuilder()
    for y, width in ((-10.1, 8.4), (-1.8, 6.8), (5.0, 5.2)):
        box(electronics, 2.4, y, 17.55, (10.0, width, 4.7))
    electronics.build("SM117_CPE_DataSystemAndSupplies", dark, parent, smooth=False)
    drum("PumpMotor", 6.2, 16.8, 3.0, 8.4, 1.36, (-1, 0, 0), dark)
    pipework = MeshBuilder()
    for route in (
        [(5, 7, 15.1), (5, 7, 16.9), (5, 12.3, 16.9)],
        [(8.6, -7.9, 14.1), (8.6, -7.9, 15.3), (8.6, -4.8, 15.3)],
        [(4.7, 16.8, 4.3), (4.7, 16.8, 8.8), (4.7, 14.1, 8.8)],
    ):
        for start, end in zip(route, route[1:]):
            pipework.tube(at(*start), at(*end), 0.24 * IN, caps=False)
    pipework.build("SM117_CPE_Pipework", stainless, parent)


def second_visit_stowage(groups, cm_base):
    """Items on top of the aft lockers, JSC-08662 fig. 7-1 (launch), rather than the return load in fig. 7-2."""
    if not interior():
        return
    fabric = material("skylab117-cargo-wrap", (0.76, 0.72, 0.62), roughness=0.91)
    straps = material("skylab117-cargo-straps", (0.37, 0.35, 0.29), roughness=0.85)
    metal = material("skylab117-cargo-buckles", (0.57, 0.59, 0.56), metallic=0.72)

    def package(node, tag, *dimensions):
        _cargo_case(groups[node], "CM117_" + tag, cm_base, (fabric, straps, metal), *dimensions)

    package("BackupParasol", "SpareParasol", 10, 0, 22.5, 7.7, 51.5, 7.8)
    package("RateGyroPackages", "GyroPackage1", 22, -10.0, 22.0, 10.7, 15.7, 7.4)
    package("RateGyroPackages", "GyroPackage2", 22, 9.2, 22.0, 10.5, 13.1, 7.3)


def _cargo_case(parent, tag, cm_base, finishes, x, y, z, width, length, height):
    fabric, straps, metal = finishes
    pos = Vector((x, y, cm_base + z))
    body, bands, buckles = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # Chamfer the corners of the covered case. The drawing shows external
    # transit packages; enclosure and belt cross-sections are estimated.
    w, h = width / 2, height / 2
    cut = 0.65
    outline = [(-w + cut, -h), (-w, -h + cut), (-w, h - cut), (-w + cut, h), (w - cut, h), (w, h - cut), (w, -h + cut), (w - cut, -h)]
    verts = [(pos + Vector((u, v, a))) * IN for v in (-length / 2, length / 2) for u, a in outline]
    n = len(outline)
    faces = [(j, (j + 1) % n, n + (j + 1) % n, n + j) for j in range(n)]
    body.add(verts, [*faces, tuple(reversed(range(n))), tuple(range(n, 2 * n))])
    for v in (-length * 0.30, length * 0.30):
        outer = [(u + math.copysign(0.085, u), a + math.copysign(0.085, a)) for u, a in outline]
        belt = [(pos + Vector((u, b, a))) * IN for b in (v - 0.48, v + 0.48) for u, a in outer]
        bands.add(belt, faces)
        buckles.box(Vector((1.05, 1.4, 0.24)) * IN, Matrix.Translation((pos + Vector((0.65, v, h + 0.21))) * IN))
    body.build(tag, fabric, parent, smooth=False)
    bands.build(tag + "Straps", straps, parent, smooth=False)
    buckles.build(tag + "Buckles", metal, parent, smooth=False)


def third_visit_stowage(groups, cm_base):
    """Covered launch cargo above the aft lockers, JSC-08963 fig. 6-4 and §6.9."""
    if not interior():
        return
    food = material("skylab118-provisions-canvas", (0.75, 0.72, 0.63), roughness=0.9)
    linen = material("skylab118-toolcase-fabric", (0.82, 0.82, 0.76), roughness=0.88)
    straps = material("skylab118-restraints", (0.43, 0.40, 0.32), roughness=0.82)
    hardware = material("skylab118-buckles", (0.55, 0.57, 0.56), metallic=0.74)
    # Aft locker clearance and relative layout follow the section. Package
    # envelopes and restraint details are estimates; the tools remained bagged.
    for i, (x, y, w, length, h) in enumerate(((9, -17, 8.0, 13.2, 6.7), (9, 13, 8.0, 13, 6.4), (20, -9, 9.6, 12.5, 6.1)), 1):
        _cargo_case(groups["ExtendedVisitFood"], f"CM118_FoodParcel{i}", cm_base, (food, straps, hardware), x, y, 22.2, w, length, h)
    for node, tag, x, y, w, length, h in (
        ("CometBracketCase", "T025BracketContainer", 9, -1, 7.7, 14.9, 5.3),
        ("ExperimentStowage", "S054FilmBag", 20, 5, 10, 12, 6.5),
        ("ExperimentStowage", "S193ToolKit", 21, 16, 9.2, 7.8, 5.5),
        ("ExperimentStowage", "CoolantAccessories", 20, -20, 8.2, 7.3, 5.9),
    ):
        _cargo_case(groups[node], "CM118_" + tag, cm_base, (linen, straps, hardware), x, y, 22, w, length, h)
