"""LM-3 Spider, LM-4 Snoopy and LM-5 Eagle. Inches from the deployed footpad plane, forward hatch on +X. See lunar-module.md."""

import math

from mathutils import Matrix, Vector

import apollo_docking
import lm5_equipment
import lm6_equipment
import lm7_equipment
import lm8_equipment
import lm10_equipment
import lm_cabin
import lm_propulsion
import lm_systems
from srlib import IN, MeshBuilder, frame, group, load_font, mark_shells, material, prof, text_mesh

PAD_RADIUS = 37 / 2
TREAD = 167.57  # NASA TN D-6850, p. 6, centre of each deployed pad
KNEE = 109
DECK = 58.30 + 68.86
KNEE_Z = DECK - 12.291
FOLD = 49  # degrees, reconstructed from TN D-6850 figs. 2 and 3
# The reaction-control thrusters, from MIT Instrumentation Laboratory R-567 section 6 (November 1968), 6.4.1.4: each
# one's reference position in LM vehicle coordinates, whose origin is 254 in below the plane of the clusters. The
# docking plane is at X 312.5 in there (6.4.2: the LM's origin at CSM X 36.1378 m, the CM's plane at XA 1110.25 in).
RCS_PLANE = 254 - 312.5 + apollo_docking.LM_PLANE  # 180.15 in above the pads
RCS_ARM = 66.1  # the up and down thrusters' axis, out from the centreline both fore and aft and to the side
RCS_UP, RCS_DOWN = RCS_PLANE + 4.8, RCS_PLANE - 5.3  # their reference points, X 258.8 and 248.7 in
RCS_INBOARD = 61.5  # each horizontal thruster's axis, across its line of fire
RCS_REACH = 66.35  # and its reference point, along it


def at(point):
    return Vector(point) * IN


def tube(mesh, a, b, radius):
    mesh.tube(at(a), at(b), radius * IN, segs=12)


def box(mesh, centre, size):
    mesh.box(at(size), Matrix.Translation(at(centre)))


def shell(mesh, rings, *, bottom=True, cap=True):
    """Faceted skin between successive cross sections, all wound the same way."""
    n = len(rings[0])
    faces = [(j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i) for j in range(len(rings) - 1) for i in range(n)]
    if bottom:
        faces.append(tuple(reversed(range(n))))
    if cap:
        faces.append(tuple(range((len(rings) - 1) * n, len(rings) * n)))
    mesh.add([at(p) for ring in rings for p in ring], faces)


def octagon(width, corner, z):
    return [
        (x, y, z)
        for x, y in [
            (width, corner),
            (corner, width),
            (-corner, width),
            (-width, corner),
            (-width, -corner),
            (-corner, -width),
            (corner, -width),
            (width, -corner),
        ]
    ]


def bell(parent, name, xyz, direction, radius, length, paint):
    mesh = MeshBuilder()
    mesh.lathe(
        prof(
            [
                (radius, 0),
                (0.73 * radius, length * 0.35),
                (0.31 * radius, length * 0.76),
                (0.23 * radius, length),
                (0.18 * radius, length),
                (0.25 * radius, length * 0.76),
                (0.69 * radius, length * 0.35),
                (radius - 0.4, 0),
                (radius, 0),
            ]
        ),
        40,
        matrix=frame(at(xyz), direction),
    )
    mesh.build(name, paint, parent)


def dish(parent, name, centre, normal, radius, alloy, dark):
    pose = frame(at(centre), normal)
    pan = MeshBuilder()
    pan.lathe(
        prof([(0, -1), (0.48 * radius, 0), (radius, 0.17 * radius), (radius, 0.22 * radius), (0.48 * radius, 0.055 * radius), (0, 0)]),
        32,
        matrix=pose,
    )
    pan.build(name, alloy, parent)["diameter_in"] = 2 * radius
    feed = MeshBuilder()
    tip = pose @ at((0, 0, 0.55 * radius))
    for i in range(3):
        a = i * math.tau / 3
        feed.tube(pose @ at((0.82 * radius * math.cos(a), 0.82 * radius * math.sin(a), 0.14 * radius)), tip, 0.34 * IN, segs=8)
    feed.build(name + "_Feed", dark, parent)


def engine_shield(mesh, perimeter, profile, *, underside=False):
    """Panel a polygonal deck round a concentric opening or a closed, recessed shield."""
    edge = []
    for a, b in zip(perimeter, perimeter[1:] + perimeter[:1], strict=True):
        for i in range(6):
            edge.append(tuple(u + (v - u) * i / 6 for u, v in zip(a, b, strict=True)))
    rays = [(x / math.hypot(x, y), y / math.hypot(x, y)) for x, y, _ in edge]
    for radius, height in profile:
        ring = [(radius * dx, radius * dy, height) for dx, dy in rays]
        for i in range(len(edge)):
            j = (i + 1) % len(edge)
            face = [edge[i], edge[j], ring[j]]
            if radius:
                face.append(ring[i])
            mesh.add([at(p) for p in face], [tuple(reversed(range(len(face)))) if underside else tuple(range(len(face)))])
        edge = ring


def descent(parent, foil, amber, dark, alloy, spacecraft):
    # The octagon encloses the beam cross, four propellant bays and four corner bays.
    wrap = MeshBuilder()
    base, top = octagon(77, 34, 58.30), octagon(80, 34, DECK)
    shell(wrap, [base, octagon(83, 34, 61), octagon(83, 34, 94), octagon(83, 34, 121), top], bottom=False, cap=False)
    blanket = wrap.build("LM3_DescentBlanket", foil, parent, smooth=False)
    blanket.data.materials.append(dark)
    blanket.data.materials.append(amber)
    for side in blanket.data.polygons:
        ring, facet = divmod(side.index, 8)
        side.material_index = (
            1 if ring == 3 or ring == 2 and facet in (0, 1, 2, 4, 6, 7) or ring == 1 and facet in (1, 3, 5) else 2 if facet in (0, 4, 6) else 0
        )
    if spacecraft >= 4:
        # S69-17807: black corner panels over broad gold-edged blankets.
        for side in blanket.data.polygons:
            ring, facet = divmod(side.index, 8)
            side.material_index = 1 if ring in (1, 2) else 2 if facet % 2 else 0
    if spacecraft == 5:
        # AS11-44-6574: copper and gold on the front, dark fields under the placards.
        for side in blanket.data.polygons:
            ring, facet = divmod(side.index, 8)
            side.material_index = 1 if facet in (0, 6) and ring in (1, 2) else 2 if (ring + facet) % 3 else 0
    if spacecraft >= 6:
        # AS12-46-6777: a dark upper band above the copper and gold blankets.
        for side in blanket.data.polygons:
            ring, facet = divmod(side.index, 8)
            side.material_index = 1 if ring == 3 else 0 if facet in (2, 5, 7) else 2
    mark_shells([blanket.name])
    # The descent engine passes through its base shield. Above it a separate, closed
    # blast deflector receives the ascent plume. Local recess dimensions are estimated.
    base_shield, deck, deflector = (MeshBuilder() for _ in range(3))
    engine_shield(base_shield, base, [(23.5, 58.30)], underside=True)
    # The octagonal seam is shared by the gold blanket and the covered central recess.
    lip = octagon(24, 10, DECK)
    cap = MeshBuilder()
    # A.2-4: the rectangular central panel rests on the four beam intersections.
    # Split its edge into the same eight sectors as the blanket.
    rim = octagon(27, 24.8, DECK + 0.18)
    for i in range(8):
        j = (i + 1) % 8
        deck.add([at(v) for v in (top[i], top[j], rim[j], rim[i])], [(0, 1, 2, 3)])
        cap.add([at(v) for v in (rim[i], rim[j], lip[j], lip[i])], [(0, 1, 2, 3)])
    mark_shells([cap.build("LM3_DeflectorRetainer", alloy, parent, smooth=False).name])
    engine_shield(deflector, lip, [(23, DECK - 1), (20, 108), (18, 106.5), (0, 107.5)])
    mark_shells([base_shield.build("LM3_DescentBaseShield", alloy, parent, smooth=False).name])
    mark_shells([deck.build("LM3_InterstageDeck", foil, parent, smooth=False).name])
    mark_shells([deflector.build("LM3_AscentBlastDeflector", amber, parent, smooth=False).name])
    # Forward diagonal quadrants in AS09-21-3212: a US flag and the two-line country marking.
    badges = MeshBuilder()
    legend = MeshBuilder()
    flag = MeshBuilder()
    for sign in (-1, 1):
        normal = Vector((1, sign, 0)).normalized()
        u = Vector((-sign, 1, 0)).normalized()

        def decal(dx, dz, depth, sgn=sign, t=u, n=normal):
            if spacecraft >= 4 and sgn < 0:
                dx += 12  # Flag toward one edge of the MESA bay, estimated.
            if spacecraft == 10:
                depth += 4.5 if sgn > 0 else 8.0  # Outer face of the stowed rover or enlarged MESA.
            return at((58.5, sgn * 58.5, 77)) + at(t * dx + Vector((0, 0, dz)) + n * depth)

        vs = [decal(x, z, 0.45) for x, z in ((-12, -6), (12, -6), (12, 6), (-12, 6))]
        if sign == 1:
            badges.add(vs, [(0, 1, 2, 3)])
            for word, z in [("UNITED", 0.6), ("STATES", -4.3)]:
                verts, faces = text_mesh(word, 5.4 * IN, load_font(), cuts=0)
                legend.add([decal(v[0] / IN - 9, v[1] / IN + z, 0.55) for v in verts], faces)
        else:
            flag.add(vs, [(0, 1, 2, 3)], [(0, 0), (1, 0), (1, 1), (0, 1)])
    mark_shells([badges.build("LM3_CountryPlacard", dark if spacecraft >= 4 else alloy, parent).name])
    mark_shells([legend.build("LM3_CountryLetters", alloy if spacecraft >= 4 else dark, parent).name])
    if spacecraft == 4:
        # S69-17807 shows a tall metallic bay face beside the gold-edged black
        # closure. These capture its external subdivision, not the ground covers.
        facing, borders = MeshBuilder(), MeshBuilder()
        along = Vector((1, 1, 0)).normalized()
        normal = Vector((1, -1, 0)).normalized()

        def bay(x, height, depth):
            return at((58.5, -58.5, height)) + at(along * x + normal * depth)

        for left, right, bottom, top in [(-31, -28, 66, 118), (-27.7, -14, 66, 118), (-13.7, -12, 66, 118)]:
            facing.add([bay(left, bottom, 0.8), bay(right, bottom, 0.8), bay(right, top, 0.8), bay(left, top, 0.8)], [(0, 1, 2, 3)])
        for h in (68, 113):
            borders.tube(bay(-31, h, 1.25), bay(-12, h, 1.25), 0.39 * IN, segs=8)
        for x in (-31.5, -11.5):
            borders.tube(bay(x, 66, 1), bay(x, 118, 1), 0.45 * IN, segs=8)
        mark_shells([facing.build("LM4_ForwardBayClosure", alloy, parent).name, borders.build("LM4_BayEdging", amber, parent).name])

    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "mercury" / "vehicles"))
    from mercury_capsule import flag_image

    mark_shells([flag.build("LM3_Flag", material("lm3-us-flag", (1, 1, 1), image=flag_image()), parent).name])
    seams = MeshBuilder()
    rails = MeshBuilder()
    for i in range(4):
        a = math.tau * i / 4

        def point(radius, side, z, angle=a):
            return (radius * math.cos(angle) - side * math.sin(angle), radius * math.sin(angle) + side * math.cos(angle), z)

        for side in [-30, 30]:
            tube(rails, point(78, side, 123), point(KNEE, 0, KNEE_Z), 2.1)
            tube(rails, point(82, side, 63), point(KNEE, 0, KNEE_Z), 1.8)
            tube(seams, point(83.5, side, 63), point(83.5, side, 119), 0.7)
        tube(seams, point(83.5, -32, 83), point(83.5, 32, 83), 0.65)
    rails.build("LM3_Outriggers", alloy, parent)
    mark_shells([seams.build("LM3_DescentBlanketSeams", amber, parent).name])


def staging_fittings(lower, upper, alloy, dark):
    # A.2.3: four explosive bolt/nut assemblies. Individual fitting profiles and
    # positions are estimated at the corners of the central thrust structure.
    sockets, feet, braces = (MeshBuilder() for _ in range(3))
    for x in (-28, 28):
        for y in (-28, 28):
            pos = Matrix.Translation(at((x, y, DECK)))
            sockets.lathe(prof([(3.8, 0.25), (3.8, 1), (2.8, 1.3), (2.8, 3.4), (1.4, 3.4), (1.4, 0.25)]), 24, matrix=pos)
            feet.lathe(prof([(1.4, 3.46), (3.1, 3.46), (3.1, 4.5), (2.2, 6), (0, 6)]), 24, matrix=pos)
            tube(braces, (x, y, DECK + 5.2), (x * 0.7, y * 0.9, 138), 1.65)
    sockets.build("LM3_InterstageSockets", alloy, lower)
    feet.build("LM3_SeparationFittings", dark, upper)
    braces.build("LM3_InterstageBrackets", alloy, upper)


def check_stowed_gear():
    """The folded struts and their deployment shields must clear the adapter panels."""
    import bpy
    from mathutils.bvhtree import BVHTree

    bpy.context.view_layer.update()

    def meshes(root):
        for obj in bpy.data.objects[root].children_recursive:
            if obj.type == "MESH":
                yield obj.name, BVHTree.FromPolygons([obj.matrix_world @ v.co for v in obj.data.vertices], [p.vertices[:] for p in obj.data.polygons])

    panels = list(meshes("SpacecraftAdapter"))
    for name, gear in meshes("LMLandingGear"):
        for panel_name, panel in panels:
            if gear.overlap(panel):
                raise ValueError(f"Stowed landing gear {name} intersects {panel_name}")


def check_engine_interfaces(parts):
    """Sweep the ascent nozzle out of its well and check both permanently installed engine apertures."""
    import bpy
    from mathutils.bvhtree import BVHTree

    bpy.context.view_layer.update()

    def triangles(obj):
        return [obj.matrix_world @ v.co for v in obj.data.vertices], [p.vertices[:] for p in obj.data.polygons]

    def tree(name):
        return BVHTree.FromPolygons(*triangles(bpy.data.objects[name]))

    deck = [tree(name) for name in ("LM3_InterstageDeck", "LM3_DescentBlanket", "LM3_AscentBlastDeflector")]
    skirt = bpy.data.objects["LM3_APS_NozzleExtension"]
    verts, faces = triangles(skirt)
    # At and above one deck depth of lift the lowest point is already above the whole deck.
    for step in range(101):
        dz = Vector((0, 0, (DECK - 58.30) * IN * step / 100))
        swept = BVHTree.FromPolygons([v + dz for v in verts], faces)
        if any(swept.overlap(surface) for surface in deck):
            raise ValueError(f"Ascent nozzle intersects descent-stage deck at {dz.z:.3f} m lift")
    for engine, shield in (("LMAscentEngine", "LM3_AscentBaseHeatShield"), ("LMDescentEngine", "LM3_DescentBaseShield")):
        base = tree(shield)
        if any(base.overlap(tree(o.name)) for o in parts[engine].children if o.type == "MESH"):
            raise ValueError(f"{engine} intersects {shield}")

    floor = bpy.data.objects.get("LM3_CabinDeckAndSideLockers")
    if floor:
        cabin = tree(floor.name)
        for obj in parts["LMAscentEngine"].children:
            if obj.type == "MESH" and cabin.overlap(tree(obj.name)):
                raise ValueError(f"{obj.name} intersects cabin floor or engine cover")


def landing_gear(parent, gold, metal, dark, deployed, spacecraft):
    # Each local assembly is built deployed then folded inward under its outrigger.
    # The viewer rotates it back about that same knee after the adapter opens.
    for i in range(4):
        az = i * math.pi / 2
        hinge = group(f"LM3_GearHinge_{i}", parent)
        hinge.location = at((KNEE * math.cos(az), KNEE * math.sin(az), KNEE_Z))
        hinge.rotation_euler = (Matrix.Rotation(az, 4, "Z") @ Matrix.Rotation(math.radians(0 if deployed else FOLD), 4, "Y")).to_euler()
        strut, piston, pad = MeshBuilder(), MeshBuilder(), MeshBuilder()
        if spacecraft >= 4:
            # M-932-69-10 p.45: plume shield added over the deployment mechanism.
            # A faceted shallow hood represents the envelope; profile estimated.
            # The inboard lip covers the knee while the outboard edge clears the
            # fixed SLA panels during extraction, before the leg unfolds.
            profile = [(-10, 3), (-6, 5), (1, 4), (4, 1)]
            if spacecraft >= 6:
                profile = profile[:3]  # MSC-01855 A.2: part of the deployment-truss shield was removed.
            shell(strut, [[(x, y, z) for x, z in profile] for y in (-7, 7)])
        foot = (TREAD - KNEE, 0, 2 - KNEE_Z)
        joint = tuple(v * 0.64 for v in foot)
        tube(strut, (0, 0, 0), joint, 3.7)
        piston.tube(at(joint), at(foot), 2.5 * IN, caps=False)
        for side in (-1, 1):
            tube(piston if spacecraft >= 6 else strut, (-10, side * 22, -28), joint, 1.65)
            tube(piston, (-2, side * 3, -5), (-10, side * 22, -28), 1.15)
        pad.lathe(prof([(0, -2), (10, -2), (PAD_RADIUS, 2.1), (PAD_RADIUS, 3.4), (10, 0.5), (2, 1), (0, 2)]), 40, matrix=Matrix.Translation(at(foot)))
        pad.build(f"LM3_Footpad_{i}", gold if spacecraft >= 5 else metal, hinge)["diameter_in"] = 2 * PAD_RADIUS
        if spacecraft < 5 or i != 0:
            probe = group(f"LM3_ProbeHinge_{i}", hinge)
            probe.location = at((foot[0] + 11, 0, foot[2] + 1))
            probe.rotation_euler.y = math.radians(0 if deployed else 158)
            sensor = MeshBuilder()
            sensor.tube(at((0, 0, 0)), at((3, 0, -14)), 0.7 * IN, caps=False)
            sensor.tube(at((3, 0, -14)), at((3, 0, -67)), 0.55 * IN, caps=False)
            sensor.build(f"LM3_SurfaceProbe_{i}", metal, probe)
        strut.build(f"LM3_GoldStrut_{i}", gold, hinge)
        if i == 0:
            ladder = piston if spacecraft >= 4 else MeshBuilder()
            for y in (-7, 7):
                tube(ladder, (10, y, -5), (50, y, -89), 0.8)
            for rung in range(9):
                t = (rung + 0.5) / 9
                tube(ladder, (10 + 40 * t, -7, -5 - 84 * t), (10 + 40 * t, 7, -5 - 84 * t), 0.75)
            if spacecraft >= 5:
                lm5_equipment.ladder(hinge, metal, dark, f"LM{spacecraft}", flag_on_ladder=spacecraft < 8)
            if spacecraft == 3:
                ladder.build("LM3_ForwardLadder", dark, hinge)
        piston.build(f"LM3_Piston_{i}", metal, hinge)


def cabin(parent, gear, platform, foil, white, dark, glass, alloy, gold, deployed, spacecraft):
    # Front face, irregular tank fairings, midsection and equipment rack follow MSFC fig. 51.
    nose = MeshBuilder()

    def rim(x, cy, cz, ry, rz):
        return [(x, cy + ry * math.cos(math.tau * j / 12), cz + rz * math.sin(math.tau * j / 12)) for j in range(12)]

    # The circular pressure shell has open front and overhead glazing; the black
    # thermal cheeks lie under the narrow metallic strip down the centre.
    rear, front = rim(34, 0, 181, 46, 46), rim(76, 0, 181, 46, 46)
    for j in range(12):
        # Top sector on the commander's side houses the overhead docking window.
        if j == 2:
            continue
        n = (j + 1) % 12
        nose.add([at(rear[j]), at(rear[n]), at(front[n]), at(front[j])], [(0, 1, 2, 3)])
    mark_shells([nose.build("LM3_CrewCompartment", white, parent, smooth=False).name])
    cheeks = MeshBuilder()
    bridge = MeshBuilder()
    panes = MeshBuilder()
    for sign in (-1, 1):

        def patch(mesh, points, sgn=sign):
            vs = [at((x, sgn * y, z)) for x, y, z in points]
            mesh.add(vs, [tuple(range(len(vs))) if sgn == 1 else tuple(reversed(range(len(vs))))])

        top = (76.5, 8, 211)
        outer = (77, 40, 204)
        bottom = (76, 22, 183)
        patch(panes, [top, bottom, outer])
        patch(cheeks, [(74, 7, 225), (68, 27, 222), (68, 41, 208), outer, top])
        patch(cheeks, [outer, (68, 41, 208), (65, 47, 184), (68, 40, 159), (76, 22, 141), bottom])
        patch(cheeks, [bottom, (76, 22, 141), (76, 17, 141), (76, 17, 174), (76, 7, 183), top])
        patch(bridge, [(76, 0, 225), (74, 7, 225), top, (76, 7, 183), (76, 17, 174), (76, 0, 174)])
    roof = [at(v) for v in (rear[2], rear[3], front[3], front[2])]
    panes.add(roof, [(0, 1, 2, 3)])
    mark_shells([panes.build("LM3_FlightAndDockingGlazing", glass, parent, smooth=False).name])
    mark_shells(
        [
            cheeks.build("LM3_BlackWindowSurrounds", dark, parent, smooth=False).name,
            bridge.build("LM3_CentreShield", alloy, parent, smooth=False).name,
        ]
    )
    trim = MeshBuilder()
    for j in range(4):
        trim.tube(roof[j], roof[(j + 1) % 4], 0.65 * IN, segs=8)
    trim.build("LM3_DockingWindowBezel", dark, parent)
    mid = MeshBuilder()
    rings = [octagon(39, 22, 129), octagon(57, 26, 154), octagon(54, 30, 214), octagon(39, 22, 236)]
    skin_rings = [[(0.73 * x - 7, y, z) for x, y, z in ring] for ring in rings]
    shell(mid, skin_rings, bottom=False, cap=False)
    engine_shield(mid, skin_rings[-1], [(17.72, 236)])
    mark_shells([mid.build("LM3_Midsection", foil, parent, smooth=False).name])
    belly = MeshBuilder()
    engine_shield(belly, skin_rings[0], [(15.5, 129)], underside=True)
    mark_shells([belly.build("LM3_AscentBaseHeatShield", dark, parent, smooth=False).name])
    bays = MeshBuilder()
    shell(bays, [rim(-83, 0, 175, 34, 25), rim(-66, 0, 179, 45, 34), rim(-40, 0, 180, 44, 35)])
    for side in (-1, 1):
        shell(
            bays,
            [rim(-37, side * 45, 175, 30, 32), rim(-10, side * 51, 178, 33, 36), rim(26, side * 52, 175, 25, 27), rim(40, side * 49, 171, 14, 16)],
        )
    cladding = bays.build("LM3_AftBayAndTankFairings", white, parent, smooth=False)
    cladding.data.materials.append(dark)
    for polygon in cladding.data.polygons:
        if polygon.index < 26 or polygon.index % 12 in (1, 2, 5, 6):
            polygon.material_index = 1
    mark_shells([cladding.name])
    framebars, hatch, porch, shoes = (MeshBuilder() for _ in range(4))
    for sign in (-1, 1):
        triangle = [(76.5, sign * 8, 211), (77, sign * 40, 204), (76, sign * 22, 183)]
        for j in range(3):
            tube(framebars, triangle[j], triangle[(j + 1) % 3], 0.8)
    box(hatch, (76.65, 0, 157), (1, 32, 32))
    for y in (-16.7, 16.7):
        tube(framebars, (77.4, y, 140), (77.4, y, 174), 0.9)
    for z in (140, 174):
        tube(framebars, (77.4, -16.7, z), (77.4, 16.7, z), 0.9)
    tube(framebars, (78, -5, 163), (78, 4, 163), 1.1)
    for y in range(-13, 14, 3):
        tube(porch, (79, y, 133), (110, y, 133), 0.8)
    for y in (-14, 14):
        tube(porch, (79, y, 133), (110, y, 133), 1)
    for y in (-7, 7):
        for dy in (-2.2, 2.2):
            tube(shoes, (97, y + dy, 134), (101, y + dy, 137), 0.7)
        tube(shoes, (101, y - 2.2, 137), (101, y + 2.2, 137), 0.7)
    mark_shells([hatch.build("LM3_ForwardHatch", foil, parent).name])
    framebars.build("LM3_FramesAndHatchHandle", dark, parent)
    porch.build("LM3_EVAPorch", dark, platform)
    if spacecraft == 3:
        shoes.build("LM3_GoldenSlippers", gold, platform)
    else:
        # Plate 43a: handholds rise on either side of the porch grating.
        # AS10-34-5112: fittings and bright-edged thermal cover on the forward hatch.
        hatch_cover, hatch_fittings, grab = MeshBuilder(), MeshBuilder(), MeshBuilder()
        box(hatch_cover, (77.32, 0, 156.5), (0.24, 28, 27))
        for y, z, r in ((-9, 160, 3.8), (8.8, 153, 4.2)):
            pose = frame(at((77.6, y, z)), (1, 0, 0))
            hatch_fittings.lathe(prof([(r, -0.1), (r, 0.6), (r * 0.76, 1.1), (r * 0.4, 0.55), (0, 0.7)]), 20, matrix=pose)
        for y in (-17.6, 17.6):
            shell(
                grab,
                [
                    [(x + dx, y + dy, z) for dx, dy in ((-0.5, -0.6), (0.5, -0.6), (0.5, 0.6), (-0.5, 0.6))]
                    for x, z in ((78.6, 141.5), (80.5, 150), (80.5, 165), (78.6, 173))
                ],
            )
        mark_shells([hatch_cover.build("LM4_ForwardHatchCover", dark, parent).name, hatch_fittings.build("LM4_HatchFittings", gold, parent).name])
        grab.build("LM4_HatchHandholds", alloy, parent)
    # Both flight articles: a handrail up either side of the porch (AS09-21-3212 of LM-3; the press kit's plate 43a
    # of LM-4). Their run is estimated.
    rails = MeshBuilder()
    for y in (-14, 14):
        for a, b in zip([(80, y, 134), (81, y, 143), (93, y, 143)], [(81, y, 143), (93, y, 143), (110, y, 134)], strict=True):
            tube(rails, a, b, 0.65)
    rails.build("LM_PorchHandrails", alloy, platform)
    # And the round tracking light on the centreline of the forward face, below the rendezvous dish (AS09-21-3212,
    # AS10-34-5112). Its lens is static and unlit in the Gallery; its size and station are estimated.
    socket, lens = MeshBuilder(), MeshBuilder()
    mount = frame(at((77.6, 0, 188)), (1, 0, 0))
    socket.lathe(prof([(4.5, -1.5), (4.5, 0.7), (3.65, 1), (3.55, -0.5)]), 28, matrix=mount)
    lens.lathe(prof([(3.65, 0.35), (2.8, 0.7), (0, 0.85)]), 28, matrix=mount)
    socket.build("LM_TrackingLampBezel", alloy, parent)
    lens.build("LM_TrackingLampLens", dark, parent)["diameter_in"] = 7.3  # (a mark of its own keeps it a node of its own)
    # Four clusters on outriggers at 45 degrees to the pitch and roll axes (NASA TN D-6740, "Installation of the
    # System"), each thruster where R-567 puts it. R-567 numbers them I to IV from the left forward corner round by
    # the rear; +Y here is the commander's side, the LM's -Y. A reference point is taken for the throat. The
    # nozzle, the housing and the three struts of each outrigger, with where they are rooted, are estimated.
    quads, outriggers = MeshBuilder(), MeshBuilder()
    for quad, sx, sy in (("I", 1, 1), ("II", -1, 1), ("III", -1, -1), ("IV", 1, -1)):
        jets = (
            ("U", (RCS_ARM * sx, RCS_ARM * sy, RCS_UP), (0, 0, 1)),
            ("D", (RCS_ARM * sx, RCS_ARM * sy, RCS_DOWN), (0, 0, -1)),
            ("F", (RCS_REACH * sx, RCS_INBOARD * sy, RCS_PLANE), (sx, 0, 0)),
            ("S", (RCS_INBOARD * sx, RCS_REACH * sy, RCS_PLANE), (0, sy, 0)),
        )
        for jet, throat, d in jets:
            mouth = tuple(v + t * 7 for v, t in zip(throat, d))
            bell(gear, f"LM3_RCS_{quad}_{jet}", mouth, tuple(-t for t in d), 2.5, 7, dark)
            # (the nozzles are joined into one mesh on export: the point itself is kept as a node, to be measured and fired from)
            group(f"LM3_Thruster_{quad}_{jet}", gear).location = at(throat)
        box(quads, (64 * sx, 64 * sy, RCS_PLANE - 0.25), (9.2, 9.2, 11))
        # (rooted inside the tank fairing's end, and for the rear pair's third strut inside the aft bay)
        roots = [(36, 46, 187), (36, 46, 172), (38, 57, 178)] if sx > 0 else [(-35, 52, 188), (-35, 52, 171), (-60, 38, 180)]
        for (x, y, z), end in zip(roots, [(60, 60, 183), (60, 60, 177), (60.5, 61, 180)], strict=True):
            tube(outriggers, (x, y * sy, z), (end[0] * sx, end[1] * sy, end[2]), 1)
    quads.build("LM3_QuadHousings", alloy, gear)
    outriggers.build("LM3_RCS_Outriggers", alloy, gear)
    sb = group("LM3_SBandHinge", gear)
    sb.location = at((59, 42, 221))
    if not deployed:
        sb.rotation_euler.x = math.radians(60)
    dish(sb, "LM3_SBand", (4, 0, 43), (1, 0, 0), 13, alloy, dark)
    mast = MeshBuilder()
    tube(mast, (0, 0, 0), (4, 0, 43), 1.3)
    mast.build("LM3_SBandBoom", alloy, sb)
    # The rendezvous radar's gimbal is on the centreline forward of the docking tunnel on both flight articles
    # (AS09-21-3212 of LM-3; the Apollo 10 press kit's plate 42b and AS10-34-5112 of LM-4). Its station is estimated.
    radar = (68, 0, 240)
    dish(gear, "LM3_RendezvousRadar", radar, (0.96, 0.18, 0.15), 12, white, dark)
    masts = MeshBuilder()
    tube(masts, (66, 0, 226.5), radar, 1.25)  # (rooted in the roof, not inside the cabin)
    for side in (-1, 1):
        tube(masts, (-15, side * 33, 227), (-23, side * 46, 236), 0.55)
    masts.build("LM3_AntennaMasts", alloy, gear)


def build(iu_top=0, *, deployed=False, spacecraft=3):
    if spacecraft not in (3, 4, 5, 6, 7, 8, 10):
        raise ValueError(f"Unsupported lunar module LM-{spacecraft}")
    foil = material("lm3-blanket-gold", (0.64, 0.29, 0.042), metallic=0.68, roughness=0.43)
    amber = material("lm3-copper-blanket", (0.41, 0.132, 0.029), metallic=0.50, roughness=0.52)
    white = material("lm3-ascent-shield", (0.53, 0.56, 0.55), metallic=0.48, roughness=0.50, double_sided=True)
    silver = material("lm3-machined-silver", (0.65, 0.68, 0.68), metallic=0.69, roughness=0.41, double_sided=True)
    dark = material("lm3-carbon-black", (0.022, 0.027, 0.029), roughness=0.66, double_sided=True)
    glass = material("glass-lm3-window", (0.036, 0.083, 0.12), metallic=0.22, roughness=0.21, alpha=0.36, double_sided=True)
    interior_paint = material("lm3-panel-gray", (0.24, 0.27, 0.27), roughness=0.68)
    ivory = material("lm3-panel-ink", (0.88, 0.84, 0.69), roughness=0.72)
    fuel = material("lm3-tank-light", (0.65, 0.64, 0.59), metallic=0.55)
    ox = material("lm3-tank-titanium", (0.39, 0.42, 0.43), metallic=0.64)
    parts = {
        name: group(name)
        for name in (
            "LMDescent",
            "LMAscent",
            "LMDockingPort",
            "LMDescentEngine",
            "LMAscentEngine",
            "LMDPSTanks",
            "LMAPSTanks",
            "LMDescentStructure",
            "LMLandingGear",
            "LMEquipment",
            "LMReactionSupply",
            "LMPorch",
            "LMStations",
            "LMControlPanels",
            "LMDescentPower",
            "LMAscentPower",
            "LMDescentConsumables",
            "LMAscentLifeSupport",
            "LMLandingRadar",
        )
    }
    if spacecraft >= 5:
        for name in ("LMPlumeDeflectors", "LMSurfaceEquipment", "LMScienceBay"):
            parts[name] = group(name)
        lm5_equipment.deflectors(parts["LMPlumeDeflectors"], silver, dark, f"LM{spacecraft}")
        if spacecraft == 5:
            lm5_equipment.surface_bays(parts["LMSurfaceEquipment"], parts["LMScienceBay"], parts["LMDescent"], silver, amber, dark, ivory)
        else:
            parts["LMFuelCask"] = group("LMFuelCask")
            parts["LMHammocks"] = group("LMHammocks")
            if spacecraft == 6:
                lm6_equipment.build(parts, silver, amber, dark, white, ivory)
            elif spacecraft == 10:
                for name in ("LMRover", "LMRoverPallet", "LMRetroreflector"):
                    parts[name] = group(name)
                lm10_equipment.build(parts, silver, amber, dark, white, ivory)
            elif spacecraft == 8:
                for name in ("LMTransporter", "LMRetroreflector", "LMPortableMagnetometer"):
                    parts[name] = group(name)
                lm8_equipment.build(parts, silver, amber, dark, white, ivory)
            else:
                lm7_equipment.build(parts, silver, amber, dark, white, ivory)
                if deployed:
                    parts["LMMailbox"] = group("LMMailbox")
                    lm7_equipment.mailbox(parts["LMMailbox"], silver, dark, ivory)
    for root in parts.values():
        if not deployed:
            root["lineup_enclosed"] = True
        root.location.z = (0 if deployed else iu_top - 36) * IN
    descent(parts["LMDescent"], foil, amber, dark, silver, spacecraft)
    landing_gear(parts["LMLandingGear"], foil, silver, dark, deployed, spacecraft)
    cabin(parts["LMAscent"], parts["LMEquipment"], parts["LMPorch"], white, white, dark, glass, silver, foil, deployed, spacecraft)
    apollo_docking.lunar(parts["LMDockingPort"], silver, dark, drogue_installed=not (spacecraft == 7 and deployed))
    lm_propulsion.engine(parts["LMDescentEngine"], False, silver, dark, white, amber, j_mission=spacecraft == 10)
    lm_propulsion.engine(parts["LMAscentEngine"], True, silver, dark, white, amber)
    lm_propulsion.tanks(parts["LMDPSTanks"], parts["LMAPSTanks"], parts["LMDescentStructure"], silver, ox, fuel, amber, j_mission=spacecraft == 10)
    lm_propulsion.rcs_tanks(parts["LMReactionSupply"], silver, fuel, ox)
    lm_systems.build(parts, silver, interior_paint, dark, white, spacecraft=spacecraft)
    staging_fittings(parts["LMDescent"], parts["LMAscent"], silver, dark)
    if deployed and spacecraft == 5:
        lm5_equipment.pilot_camera(parts["LMControlPanels"], silver, dark, ivory)
    lm_cabin.build(parts["LMStations"], parts["LMControlPanels"], silver, interior_paint, dark, ivory, glass)
    check_engine_interfaces(parts)
