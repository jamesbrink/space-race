"""SA-205 cutaway structure. Dimensions in inches; see saturn-ib.md for source confidence."""

import math

from mathutils import Matrix, Vector

from srlib import IN, TAU, MeshBuilder, frame, group, interior, mark_shells, material, prof

# Douglas SM-46978A, fig. AP 2-1. Match its separation plane to the MSFC checklist fig. 6 vehicle datum.
DOUGLAS_OFFSET = 1186.804 - 200.6
DOME_RADIUS = 130
# The S-IB outer tanks' pitch radius, axis to axis: ESTIMATED. No drawing read gives it. 93 in clears the
# 105-inch centre tank and the 70-inch outer tanks (52.5 + 35 = 87.5 in would have them touching) with room for the
# lines between them, and puts the outer tanks' outside at 128 in from the axis. Listed in saturn-ib.md.
SIB_TANK_PITCH_RADIUS = 93
SIB_SKIRT_BOTTOM, SIB_SKIRT_TOP = 192, 938  # rounded from the SA-203 onward profile, fig. 5


def ds(station):
    return DOUGLAS_OFFSET + station


def polar(r, a, z):
    return Vector((r * math.cos(a), r * math.sin(a), z))


def metric(point):
    return Vector(point) * IN


def finish(mesh, name, mat, parent, *, cut=False):
    obj = mesh.build(name, mat, parent)
    if cut:
        mark_shells([obj.name])
    return obj


def turn(mesh, profile, centre=(0, 0, 0), sides=48):
    mesh.lathe(prof(profile), sides, matrix=Matrix.Translation(metric(centre)))


def ball(mesh, centre, r):
    turn(mesh, [(r * math.cos(t), r * math.sin(t)) for t in [math.pi * (i / 16 - 0.5) for i in range(17)]], centre, 32)


def pipe(mesh, points, r, sides=16):
    mesh.loft([metric(p) for p in points], [(r * IN, r * IN)] * len(points), sides)


def band(mesh, r, z, width, height, centre=(0, 0, 0)):
    # Finite annulus; outer radius r, radial width width, full axial height height.
    turn(mesh, [(r - width, z), (r, z), (r, z + height), (r - width, z + height), (r - width, z)], centre, 48)


def beam(mesh, a, b, width, depth):
    a, b = metric(a), metric(b)
    # Horizontal beam, local X along its span. Its web and flange widths are exhibit estimates.
    d = b - a
    matrix = Matrix.Translation((a + b) / 2) @ Matrix.Rotation(math.atan2(d.y, d.x), 4, "Z")
    mesh.box((d.length, width * IN, depth * IN), matrix)


def sphere_cap(mesh, radius, centre_z, first, last, centre=(0, 0, 0), steps=18):
    turn(
        mesh,
        [(radius * math.cos(t), centre_z + radius * math.sin(t)) for t in [first + (last - first) * i / steps for i in range(steps + 1)]],
        centre,
        96,
    )


def first_stage(parent, metal, warm, dark):
    """Pressure vessel ends, the repeated folded slosh plates, top frame and sixteen engine feeds."""
    ends, plates, feeds, spider, liners = (MeshBuilder() for _ in range(5))
    # Projecting the 70/105-in vessels through the fig. 5 skirts gives these weld-plane estimates.
    # Full head shapes stay independent from the projecting straight skirts seen on the exterior.
    for i in range(9):
        centre_tank = i == 8
        a = TAU * i / 8
        centre = polar(0 if centre_tank else SIB_TANK_PITCH_RADIUS, a, 0)
        radius = 52.5 if centre_tank else 35
        r = radius - 0.7
        lo, hi = (267, 873) if centre_tank else (260, 868 if i % 2 == 0 else 826)
        turn(liners, [(r + 0.45, hi), (r + 0.45, lo)], centre, 64)
        sphere_cap(ends, r, lo, -math.pi / 2, 0, centre, 12)
        sphere_cap(ends, r, hi, 0, math.pi / 2, centre, 12)
        # Inclined members folded down the length of the wall with their ends carried by rings.
        # The chevrons follow Fig. 5 and News Reference CC-06(E); counts and sections are estimated.
        rows = 8 if centre_tank else 6
        bays = round((hi - lo) / 31)
        pitch = (hi - lo) / bays
        for j in range(bays):
            z = lo + j * pitch
            band(plates, r, z, 1.4, 0.6, centre)
            for k in range(rows):
                clock = a + TAU * k / rows
                start = polar(r - 1, clock, z)
                vertex = polar(r * 0.53, clock, z + pitch / 2)
                end = polar(r - 1, clock, z + pitch)
                # Folded strip surface with finite transverse width; double-sided anodised aluminium.
                off = polar(2.1, clock + math.pi / 2, 0)
                pts = [centre + p + s * off for p in (start, vertex, end) for s in (-1, 1)]
                plates.add([metric(p) for p in pts], [(0, 1, 3, 2), (2, 3, 5, 4)])
        if not centre_tank:
            # One inboard and one outboard supply from EACH of the eight outer tanks, CC-73.
            # Alternate RP-1/oxygen tanks feed adjoining engine lines; routing is schematic.
            for j in (0, 1):
                target = a if i % 2 == j else a - math.pi / 4
                er = 32 if j == 0 else 95
                lateral = 6 if i % 2 else -6
                p = centre + polar(6 if j else -6, a, lo - r) + polar(lateral, a + math.pi / 2, 0)
                q = polar(er, target, 0) + polar(lateral, target + math.pi / 2, 0)
                pipe(
                    feeds,
                    [
                        p + Vector((0, 0, 2)),
                        p - Vector((0, 0, 25)),
                        0.65 * p + 0.35 * q + Vector((0, 0, -6)),
                        q + Vector((0, 0, 113)),
                        q + Vector((0, 0, 96)),
                    ],
                    4,
                )
    finish(liners, "SIB_TankInnerWalls", metal, parent, cut=True)
    finish(ends, "SIB_TankBulkheads", metal, parent, cut=True)
    finish(plates, "SIB_SloshBaffles", warm, parent, cut=True)
    finish(feeds, "SIB_FeedLines", metal, parent)
    # Eight beams meet at the hub; crossbeams join their outer ends (CC-74).
    band(spider, 18, 939, 8, 19)
    for i in range(8):
        a = TAU * (i + 0.5) / 8
        beam(spider, polar(15, a, 949), polar(122, a, 949), 5, 17)
        beam(spider, polar(121, a, 949), polar(121, a + TAU / 8, 949), 6, 14)
    finish(spider, "SIB_SpiderBeam", dark, parent)
    # The tail carries the centre tank on a barrel. Four thrust outriggers alternate with
    # four fin outriggers at the skirt. The full-height webs and ring flanges follow CC-03(C).
    thrust = MeshBuilder()
    turn(
        thrust,
        [
            (46, 100.5),
            (52.2, 100.5),
            (52.2, 103.0),
            (51, 103.0),
            (51, 183.5),
            (53, 183.5),
            (53, 187),
            (45, 187),
            (45, 184),
            (49.5, 184),
            (49.5, 102),
            (46, 102),
            (46, 100.5),
        ],
    )
    for i in range(8):
        angle = TAU * i / 8
        side = polar(1, angle + math.pi / 2, 0)
        for sign in (-1, 1):
            # A pair of shear webs stands beside each radial bay. Their profiles are estimates.
            silhouette = [(50, 104), (119, 143), (119, 188), (50, 185)]
            pts = [polar(radius, angle, z) + side * (sign * 13 + offset) for offset in (-0.38, 0.38) for radius, z in silhouette]
            thrust.add([metric(p) for p in pts], [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
        if i % 2:  # outboard gimbal loads enter through every other outrigger
            beam(thrust, polar(58, angle, 106), polar(106, angle, 106), 13, 7)
        else:
            beam(thrust, polar(23, angle, 109), polar(50, angle, 109), 12, 6)
    finish(thrust, "SIB_TailBarrelAndOutriggers", dark, parent, cut=True)
    # Two high-pressure helium spheres in the forward skirts of F-3/F-4, CC-06(F).
    gas = MeshBuilder()
    helium_radius = 12 * (3 * 19.28 / (4 * math.pi)) ** (1 / 3)  # gas-space equivalent radius
    for a in (5 * math.pi / 4, 7 * math.pi / 4):
        ball(gas, polar(SIB_TANK_PITCH_RADIUS, a, 899), helium_radius)
    finish(gas, "SIB_FuelPressurizationSpheres", metal, parent)


def aft_dome(mesh):
    """The S-IVB's aft LOX dome, the 130-in sphere's lower half."""
    sphere_cap(mesh, DOME_RADIUS, ds(287.8), -math.pi / 2, 0)


def thrust_cone(mesh):
    """The S-IVB's engine thrust cone, from the J-2's gimbal at STA 100 to the aft dome. Returns its radius at the dome."""
    # Engine thrust cone penetrates the aft dome only at its tangent attachment.
    cone_r = math.sqrt(DOME_RADIUS**2 - (287.8 - 186.9) ** 2)
    turn(mesh, [(13, ds(121.4)), (cone_r, ds(183.5)), (cone_r, ds(186.9))])
    turn(mesh, [(5, ds(100)), (9, ds(100)), (13, ds(121.4)), (12, ds(121.4)), (5, ds(100))])
    return cone_r


def aft_closure(parent, metal, dark):
    """Below full detail, where the tanks are not built: the S-IVB's aft dome and thrust cone alone, which close the
    stage's base once its interstage has gone (seen from behind in flight). The same meshes as second_stage's."""
    aft, cone = MeshBuilder(), MeshBuilder()
    aft_dome(aft)
    thrust_cone(cone)
    finish(aft, "SIVB_AftTankDome", metal, parent, cut=True)
    finish(cone, "SIVB_ThrustCone", dark, parent, cut=True)


def second_stage(parent, metal, warm, dark, *, spheres_per_bank=4):
    """Three dome stations, O2 baffles, helium banks and thrust cone of S-IVB-205."""
    aft, common, forward, rings, supports, equipment, cone, ribs = (MeshBuilder() for _ in range(8))
    # The production forward/aft domes include manholes and fittings. Form only the part of the
    # 130-in spherical surface inside the 260-in tank; carry the small crown discrepancy at the bosses.
    aft_dome(aft)
    sphere_cap(forward, DOME_RADIUS, ds(553), 0, math.pi / 2)
    common_centre = ds(335.2) - DOME_RADIUS
    joint_angle = math.asin((ds(244.4) - common_centre) / DOME_RADIUS)
    sphere_cap(common, DOME_RADIUS, common_centre, joint_angle, math.pi / 2)
    # Axial stations AP 2-1 include the common bulkhead assembly's sandwich. The exterior
    # sphere's intersection with the aft dome differs by ~2 in; bridge the nominal tee at the joint.
    outer_r = math.sqrt(DOME_RADIUS**2 - (287.8 - 244.4) ** 2)
    inner_r = DOME_RADIUS * math.cos(joint_angle)
    turn(common, [(inner_r, ds(244.4)), (outer_r, ds(244.4))])
    finish(aft, "SIVB_AftTankDome", metal, parent, cut=True)
    finish(common, "SIVB_CommonBulkhead", warm, parent, cut=True)
    finish(forward, "SIVB_ForwardTankDome", metal, parent, cut=True)
    liner = MeshBuilder()
    turn(liner, [(129.3, ds(553)), (129.3, ds(287.8))], sides=128)
    finish(liner, "SIVB_HydrogenTankLining", warm, parent, cut=True)
    # The four rings and their A-frames follow the mission cutaway. Their stations and widths are estimated.
    for z, r in [(186, 60), (216, 91), (246, 110), (278, 94)]:
        band(rings, r, ds(z), 7, 1)
    for i in range(8):
        a = TAU * i / 8
        for direction in (-1, 1):
            pipe(
                supports,
                [
                    polar(57, a + direction * 0.15, ds(186.5)),
                    polar(87, a + direction * 0.095, ds(216.5)),
                    polar(107, a + direction * 0.035, ds(246.5)),
                    polar(91, a + direction * 0.15, ds(278.5)),
                ],
                1.05,
                8,
            )
    finish(rings, "SIVB_OxygenSloshRings", metal, parent, cut=True)
    finish(supports, "SIVB_OxygenBaffleFrames", dark, parent, cut=True)
    # AP 2-1, two banks along the tunnel side. 26.9-in centre spacing is dimensioned.
    for a in (math.radians(170), math.radians(220)):
        for row in range(spheres_per_bank):
            z = ds(454 + 26.9 * row)
            ball(equipment, polar(114, a, z), 12.5)
            beam(equipment, polar(124, a, z), polar(129.4, a, z), 6, 5)
    ball(equipment, polar(76, math.radians(52), ds(158.6)), 12.5)
    cone_r = thrust_cone(cone)
    for i in range(24):
        a = TAU * i / 24
        pipe(ribs, [polar(13, a, ds(121.4)), polar(cone_r, a, ds(183.5))], 1, 8)
    finish(cone, "SIVB_ThrustCone", dark, parent, cut=True)
    finish(ribs, "SIVB_ThrustConeStringers", metal, parent, cut=True)
    finish(equipment, "SIVB_HeliumSpheres", metal, parent)


def build(groups, *, spheres_per_bank=4, s150=False):
    if not interior():
        return
    metal = material("saturn-interior-alloy", (0.63, 0.67, 0.68), 0.55, 0.47, double_sided=True)
    warm = material("saturn-tank-bulkhead", (0.60, 0.53, 0.38), 0.38, 0.55, double_sided=True)
    dark = material("saturn-thrust-frame", (0.32, 0.36, 0.38), 0.55, 0.6, double_sided=True)
    first_stage(groups["FirstStageTankStructure"], metal, warm, dark)
    second_stage(groups["SecondStageTankStructure"], metal, warm, dark, spheres_per_bank=spheres_per_bank)
    instrument_bay(groups["InstrumentUnitEquipment"], dark, metal, s150)


def engine_case(mesh, centre, axis, length, radius):
    transform = frame(metric(centre), axis)
    mesh.lathe(
        prof(
            [
                (0, -length / 2),
                (radius * 0.75, -length / 2),
                (radius, -length * 0.32),
                (radius, length * 0.32),
                (radius * 0.75, length / 2),
                (0, length / 2),
            ]
        ),
        32,
        matrix=transform,
    )


def h1_equipment(mount, index, alloy):
    """The H-1 combined pump and heat exchanger, outlined from Rocketdyne RD-1."""
    mesh = MeshBuilder()
    # Existing engine mount is canted; +X in its own plane is not necessarily stage-outward.
    # Rotate the off-axis package into free space on the outside of each engine cluster.
    # Convert stage-radial vector into the local gimbal frame, retaining the canted local Z axis.
    local = mount.matrix_local.to_3x3().transposed() @ Vector((mount.location.x, mount.location.y, 0))
    clock = math.atan2(local.y, local.x)
    turn(mesh, [(6, -8), (8, -6), (8, -2), (6, 0), (0, 0)])
    engine_case(mesh, (15, 0, -28), (0, 1, 0), 19, 8.4)
    engine_case(mesh, (15, -8, -27), (0, 1, 0), 5.5, 9)
    pipe(mesh, [(14, -11, -28), (16, -17, -32), (18, -17, -40), (21, -14, -51), (23, -8, -65), (23, -3, -69)], 4.7)
    pipe(mesh, [(15, 10, -28), (17, 14, -20), (14, 12, -12), (8, 4, -10)], 2.4)
    obj = finish(mesh, f"H1_PumpAndHeatExchanger_{index}", alloy, mount)
    obj.rotation_euler.z = clock


def j2_engine(parent, bell_mat, alloy, exit_radius, rim):
    """Nozzle exit and gimbal stations from SM-46978A; intermediate contour from R-3-125K."""
    root = group("J2_Mount", parent)
    root.location.z = ds(100) * IN
    exit_z = -116  # Douglas -16 minus gimbal 100
    outside = [(exit_radius + rim, exit_z), (37.7, -108), (34.4, -91), (29.5, -72), (24.5, -58), (20, -46), (14, -34), (9.2, -26), (7.65, -22)]
    inside = [(7.35, -22), (8.9, -26), (13.6, -34), (19.6, -46), (24.1, -58), (29.1, -72), (34, -91), (37.35, -108), (exit_radius, exit_z)]
    # Roll the circumferential reinforcing bands into the nozzle wall. Adjacent surfaces share an edge.
    contour = []
    for (r0, z0), (r1, z1) in zip(outside, outside[1:]):
        contour.append((r0, z0))
        for z in (-114, -106, -96, -85, -75, -64, -60):
            if z0 < z < z + 1.2 < z1:
                a = r0 + (r1 - r0) * (z - z0) / (z1 - z0)
                b = r0 + (r1 - r0) * (z + 1.2 - z0) / (z1 - z0)
                contour.extend([(a, z), (a + 0.8, z + 0.15), (b + 0.8, z + 1.0), (b, z + 1.2)])
    contour.append(outside[-1])
    nozzle = MeshBuilder()
    turn(nozzle, contour + inside + [outside[0]])
    finish(nozzle, "J2_Bell", bell_mat, root)
    chamber = MeshBuilder()
    turn(chamber, [(7.65, -22), (9.2, -18), (10, -14), (10, -9), (8.5, -5), (5, -2), (4, 0), (0, 0)])
    finish(chamber, "J2_InjectorHead", alloy, root)
    if not interior():
        return
    mesh = MeshBuilder()
    # Independent oxygen/fuel pumps, start sphere, exhaust transfer duct and manifolds.
    for side in (-1, 1):
        engine_case(mesh, (side * 25, 0, -29), (0, 0, 1), 19, 8)
        pipe(mesh, [(side * 25, 0, -22), (side * 23, 0, -12), (side * 21, 0, 0), (side * 21, 0, 14)], 4.4)
        for z in (-11, 0, 13):
            band(mesh, 5.2, z, 0.85, 1.4, (side * 21, 0, 0))
        pipe(mesh, [(side * 21, -4, -29), (side * 21, -9, -25), (side * 14, -10, -15), (side * 8, -4, -12)], 3.1)
    ball(mesh, (0, -13, -15), 12)
    pipe(mesh, [(22, 0, -38), (24, 1, -45), (26.5, 2, -53), (26.7, 3, -58)], 3.8)
    finish(mesh, "J2_PumpsStartTankAndManifolds", alloy, root)


def instrument_bay(parent, dark, metal, s150):
    """Unroll the three sectors of SA-205's IU. Trace the component envelopes in checklist Fig. 11."""
    # The source is the flattened inside view. Coordinates below are the printed envelope centres
    # and sizes, read in pixels on a 1535x1193 rendering of PDF p.177; depths and finishes estimated.
    # Sector end letters on the drawing give 601 A-C, 603 C-B, 602 B-A. Pos I is at x1021 in 601.
    bounds = {601: (0, 259), 603: (1, 730), 602: (2, 493)}
    fitted = material("saturn-iu-cases", (0.39, 0.44, 0.43), 0.48, 0.58)
    plates = MeshBuilder()
    cases = MeshBuilder()

    def pose(unit, px, py, r):
        sector, top = bounds[unit]
        angle = math.radians(-90 + sector * 120 + 120 * (px - 1021) / 955)
        z = ds(676.7) + 36 * (1 - (py - top) / 126)
        return Matrix.Translation(metric(polar(r, angle, z))) @ Matrix.Rotation(angle, 4, "Z"), angle, z

    def box(mesh, unit, x, y, w, h, depth, r):
        mat, _, _ = pose(unit, x, y, r)
        mesh.box((depth * IN, w * TAU * 130 / 3 / 955 * IN, h * 36 / 126 * IN), mat)

    # A flat cooling panel is a chord hung just clear of the curved shell; 24 positions,
    # with the access door at 601-8. Omit plates at the ST-124 and other open stations.
    plate_bounds = {
        601: [(615, 726), (748, 851), (865, 965), (1096, 1200), (1213, 1315)],
        602: [(494, 597), (612, 715), (728, 834), (845, 949), (964, 1069), (1081, 1185), (1196, 1310)],
        603: [(374, 472), (488, 595), (608, 711), (860, 968), (1092, 1197), (1208, 1315)],
    }
    for unit, limits in plate_bounds.items():
        for left, right in limits:
            box(plates, unit, (left + right) / 2, bounds[unit][1] + 63, right - left, 104, 0.9, 128.0)
    # Rectangular silhouettes actually shown on this layout. In 601 the two 206-only
    # thermal-sensor experiments are omitted. No late cooling pump is added.
    known = {
        601: [
            (797, 302, 84, 28),
            (912, 291, 82, 29),
            (909, 343, 79, 28),  # three batteries
            (1021, 324, 45, 80),
            (1114, 356, 21, 25),
            (1176, 303, 40, 48),
            (1186, 347, 18, 17),
            (1240, 289, 46, 30),
            (1254, 343, 16, 19),
            (1298, 291, 31, 44),
            (1292, 349, 18, 34),
        ],
        602: [
            (431, 556, 48, 68),
            (515, 526, 29, 25),
            (515, 585, 28, 38),
            (571, 527, 45, 34),
            (568, 584, 46, 29),
            (662, 528, 63, 45),
            (760, 532, 46, 46),
            (810, 533, 31, 47),
            (801, 587, 46, 33),
            (865, 528, 33, 36),
            (920, 527, 38, 29),
            (863, 584, 30, 31),
            (901, 588, 18, 22),
            (935, 589, 15, 20),
            (1042, 526, 34, 32),
            (984, 588, 15, 22),
            (1010, 592, 22, 14),
            (1048, 589, 29, 30),
            (1111, 533, 47, 46),
            (1160, 530, 26, 42),
            (1160, 585, 12, 41),
            (1216, 533, 33, 44),
            (1271, 602, 31, 16),
        ],
        603: [
            (503, 766, 14, 27),
            (534, 769, 15, 29),
            (571, 769, 32, 33),
            (686, 826, 13, 22),
            (730, 761, 20, 32),
            (821, 769, 27, 29),
            (911, 768, 74, 28),
            (958, 792, 12, 9),
            (888, 821, 33, 35),
            (936, 820, 43, 37),
            (1027, 773, 78, 36),
            (1027, 818, 78, 36),
            (1143, 764, 49, 40),
            (1111, 828, 33, 28),
            (1154, 832, 23, 25),
            (1183, 828, 17, 35),
            (1231, 761, 47, 32),
            (1227, 800, 21, 10),
            (1230, 828, 30, 15),
            (1259, 812, 13, 11),
            (1287, 807, 36, 30),
        ],
    }
    for unit, items in known.items():
        for x, y, w, h in items:
            # Leave the S-IU-208 detector, adjacent recorder and gas-supply bays
            # to its own experiment. The SA-205 drawing describes different contents.
            if s150 and ((unit == 601 and 480 < x < 725) or (unit == 602 and x < 485)):
                continue
            depth = 7 if w > 42 else 4
            box(cases, unit, x, y, w, h, depth, 126.8 - depth / 2)
    finish(plates, "IU_ColdPlateSupports", metal, parent, cut=True)
    finish(cases, "IU_InstrumentCases", fitted, parent, cut=True)
    cylinders = MeshBuilder()
    # ST-124 inertial platform and air bearing supply in sector 603.
    _, a, z = pose(603, 780, 797, 116)
    ball(cylinders, polar(115, a, z), 10.8)
    _, a, z = pose(603, 650, 785, 117)
    ball(cylinders, polar(117, a, z), 9.5)
    finish(cylinders, "IU_InertialPlatformAndAirSupply", dark, parent, cut=True)
