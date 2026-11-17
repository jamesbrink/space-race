"""Apollo 7 unitized couches: documented configuration, estimated reconstruction.

NASA TN D-7440 Figs 1/4/5/7 and pp.9–10 establish the flight hardware.
NAA CS-2025C explicitly identifies SC101 and its 96-degree flight position.
Complete machining/installation drawings were not located. Photographic
reconstruction is the last-resort basis for all sizes and installation coordinates here
are ESTIMATED for CM-101, including earlier SC012 dimensions used as scale priors.
This geometry supplies no mass, strength, landing dynamics or crew-eye datum.
Source units remain inches; conversion to metres occurs in the build helpers.
"""

import math

# Documented flight operating angle. The back's installation pitch is estimated
# from the SC101 side view, not another angle read from its annotations.
SEAT_BACK_DEGREES = 96.0
BACK_PITCH_DEGREES = 12.0
HIP_X, HIP_XC = -5.0, 32.0
CENTRES_Y = (-23.0, 0.0, 23.0)
# SC012 handbook pp.6-17/18: 32 × 22 back pan and 56 main beam. Their use
# on CM101 is explicitly estimated, NOT verified unchanged/shared hardware.
BACK_LENGTH, BACK_WIDTH, BEAM_LENGTH = 32.0, 22.0, 56.0
SEAT_LENGTH, SEAT_WIDTH = 18.0, 20.0
LEG_LENGTH, LEG_WIDTH = 20.0, 18.0
FOOT_LENGTH, FOOT_WIDTH = 10.0, 16.0
HEAD_LENGTH, HEAD_WIDTH = 9.0, 10.0
LEG_DOWN_DEGREES, TOE_DEGREES = 18.0, 75.0
FRAME_HALF_WIDTH = 34.5
PAN_THICKNESS, PAD_HEIGHT = 0.375, 1.0
STRAP_WIDTH, STRAP_THICKNESS = 1.5, 0.10


def build(parent, base):
    """Build a common frame, three body supports, restraints and eight struts."""
    import bpy
    from mathutils import Matrix, Vector
    from mathutils.bvhtree import BVHTree
    from mathutils.geometry import tessellate_polygon

    import pressure_vessel
    from srlib import IN, MeshBuilder, _segs, frame, group, interior, lathe_obj, material, prof

    parent["geometry_confidence"] = "estimated"
    parent["configuration_source"] = "NASA TN D-7440, Figs 1/4/5/7, pp.9–10; NAA SC101 CS-2025C"
    parent["seat_back_degrees"] = SEAT_BACK_DEGREES
    if not interior():
        return

    metal = material("apollo-couch-aluminium", (0.56, 0.59, 0.60), metallic=0.7, roughness=0.48)
    pan_paint = material("apollo-couch-pan", (0.69, 0.71, 0.67), roughness=0.8)
    cloth = material("apollo-couch-padding", (0.74, 0.73, 0.67), roughness=0.95)
    webbing = material("apollo-couch-harness", (0.31, 0.33, 0.30), roughness=0.95)
    steel = material("apollo-couch-steel", (0.24, 0.27, 0.28), metallic=0.7, roughness=0.38)
    rubber = material("apollo-couch-heel-pad", (0.10, 0.12, 0.12), roughness=0.92)
    owned = []
    pitch = math.radians(BACK_PITCH_DEGREES)
    back = Vector((math.cos(pitch), 0, math.sin(pitch)))
    normal = Vector((-back.z, 0, back.x))
    across = Vector((0, 1, 0))
    seat_angle = pitch + math.radians(SEAT_BACK_DEGREES)
    seat = Vector((math.cos(seat_angle), 0, math.sin(seat_angle)))
    seat_normal = Vector((seat.z, 0, -seat.x))
    down = math.radians(LEG_DOWN_DEGREES)
    leg = Vector((-math.cos(down), 0, -math.sin(down)))
    leg_normal = Vector((leg.z, 0, -leg.x))
    toe = math.radians(TOE_DEGREES)
    foot = Vector((math.cos(toe), 0, math.sin(toe)))
    foot_normal = Vector((foot.z, 0, -foot.x))
    origin = Vector((HIP_X, 0, HIP_XC))

    def world(p):
        return (Vector(p) + Vector((0, 0, base))) * IN

    def point(u, v, n=0):
        return origin + back * u + across * v + normal * n

    def keep(obj, *, mount=False):
        owned.append((obj, mount))
        return obj

    def box(name, centre, a, b, size, paint, owner=parent, *, mount=False):
        a, b = Vector(a).normalized(), Vector(b).normalized()
        n = a.cross(b).normalized()
        transform = Matrix((a, b, n)).transposed().to_4x4()
        transform.translation = world(centre)
        mesh = MeshBuilder()
        mesh.box(tuple(x * IN for x in size), transform)
        return keep(mesh.build(name, paint, owner), mount=mount)

    def beam(name, a, b, width, depth, paint=metal, owner=parent):
        a, b = Vector(a), Vector(b)
        direction = (b - a).normalized()
        side = across if abs(direction.dot(across)) < 0.9 else back
        side = (side - direction * side.dot(direction)).normalized()
        return box(name, (a + b) / 2, direction, side, ((b - a).length, width, depth), paint, owner)

    def cylinder(name, a, b, radius, paint=metal, owner=parent, *, mount=False):
        a, b = Vector(a), Vector(b)
        length = (b - a).length
        obj = lathe_obj(name, prof([(0, 0), (radius, 0), (radius, length), (0, length)]), paint, owner, segs=20)
        obj.matrix_local = frame(world(a), b - a)
        return keep(obj, mount=mount)

    def plate(name, at, direction, outward, length, width, paint, owner, *, padded=False):
        """Closed shaped pan or soft bevelled pad; no single-sided seat cards."""
        direction, outward = Vector(direction), Vector(outward)
        side = outward.cross(direction).normalized()
        radius = min(1.5, width / 5)
        outline = []
        for u, v, angle in (
            (radius, -width / 2 + radius, math.pi),
            (length - radius, -width / 2 + radius, 1.5 * math.pi),
            (length - radius, width / 2 - radius, 0),
            (radius, width / 2 - radius, math.pi / 2),
        ):
            # The rectangle's local axes are (longitudinal, lateral).
            segments = max(4, _segs(8))
            outline.extend(
                (u + radius * math.cos(angle + j * math.pi / (2 * segments)), v + radius * math.sin(angle + j * math.pi / (2 * segments)))
                for j in range(segments + 1)
            )
        rings = ((0, 0), (0, 0.70), (0.45, PAD_HEIGHT)) if padded else ((0, -PAN_THICKNESS), (0, 0))
        vertices = []
        for inset, height in rings:
            for u, v in outline:
                # Rounded cushion edges contract toward the padded front;
                # the front remains a flat padded support surface.
                uu = length / 2 + (u - length / 2) * (1 - 2 * inset / length)
                vv = v * (1 - 2 * inset / width)
                vertices.append(world(Vector(at) + direction * uu + side * vv + outward * height))
        count = len(outline)
        faces = []
        for layer in range(len(rings) - 1):
            for i in range(count):
                j = (i + 1) % count
                faces.append((layer * count + i, layer * count + j, (layer + 1) * count + j, (layer + 1) * count + i))
        for layer, reverse in ((0, True), (len(rings) - 1, False)):
            flat = [Vector((u, v, 0)) for u, v in outline]
            for triangle in tessellate_polygon([flat]):
                indices = [layer * count + i for i in triangle]
                faces.append(tuple(reversed(indices)) if reverse else tuple(indices))
        mesh = MeshBuilder()
        mesh.add(vertices, faces)
        return keep(mesh.build(name, paint, owner, smooth=False))

    def strap(name, path, up, owner):
        """A finite-thickness webbing strap with closed end faces."""
        up = Vector(up).normalized()
        vertices, faces = [], []
        for i, p in enumerate(path):
            tangent = Vector(path[min(i + 1, len(path) - 1)]) - Vector(path[max(0, i - 1)])
            side = up.cross(tangent).normalized() * STRAP_WIDTH / 2
            for s, n in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                vertices.append(world(Vector(p) + side * s + up * (n * STRAP_THICKNESS / 2)))
        for i in range(len(path) - 1):
            for j in range(4):
                k = (j + 1) % 4
                faces.append((4 * i + j, 4 * i + k, 4 * (i + 1) + k, 4 * (i + 1) + j))
        faces.extend(((3, 2, 1, 0), tuple(4 * (len(path) - 1) + j for j in range(4))))
        mesh = MeshBuilder()
        mesh.add(vertices, faces)
        return keep(mesh.build(name, webbing, owner, smooth=False))

    def seat_leg_pan(index, hip, knee, ankle, owner):
        """One continuous rigid seat/leg pan, with a mitred knee bend."""
        miter = (seat_normal + leg_normal) * PAN_THICKNESS / (1 + seat_normal.dot(leg_normal))
        section = (
            (hip, SEAT_WIDTH / 2),
            (knee, LEG_WIDTH / 2),
            (ankle, LEG_WIDTH / 2),
            (ankle - leg_normal * PAN_THICKNESS, LEG_WIDTH / 2),
            (knee - miter, LEG_WIDTH / 2),
            (hip - seat_normal * PAN_THICKNESS, SEAT_WIDTH / 2),
        )
        vertices = [world(p + across * sign * width) for sign in (-1, 1) for p, width in section]
        faces = [(i, (i + 1) % 6, (i + 1) % 6 + 6, i + 6) for i in range(6)]
        faces.extend((tuple(reversed(range(6))), tuple(range(6, 12))))
        mesh = MeshBuilder()
        mesh.add(vertices, [tuple(reversed(face)) for face in faces])
        return keep(mesh.build(f"CM_CouchSeatLegPan_{index}", pan_paint, owner, smooth=False))

    # One box-beam platform, not three detachable/foldable Apollo 8+ frames.
    for v in (-FRAME_HALF_WIDTH, -11.5, 11.5, FRAME_HALF_WIDTH):
        beam(f"CM_CouchMainBeam_{v}", point(BACK_LENGTH - BEAM_LENGTH, v, -1.5), point(BACK_LENGTH, v, -1.5), 1.5, 2.0)
    for u in (-24.0, 0.0, 16.0, BACK_LENGTH):
        beam(f"CM_CouchCrossBeam_{u}", point(u, -FRAME_HALF_WIDTH, -3.5), point(u, FRAME_HALF_WIDTH, -3.5), 1.5, 2.0)

    for index, y in enumerate(CENTRES_Y):
        owner = group(f"UnitizedPosition_{index + 1}", parent)
        hip = origin + across * y
        knee = hip + seat * SEAT_LENGTH
        ankle = knee + leg * LEG_LENGTH
        plate(f"CM_CouchBackPan_{index}", hip, back, normal, BACK_LENGTH, BACK_WIDTH, pan_paint, owner)
        plate(f"CM_CouchBackPad_{index}", hip + back * 1.0, back, normal, BACK_LENGTH - 2, BACK_WIDTH - 3, cloth, owner, padded=True)
        seat_leg_pan(index, hip, knee, ankle, owner)
        plate(f"CM_CouchSeatPad_{index}", hip + seat, seat, seat_normal, SEAT_LENGTH - 2, SEAT_WIDTH - 3, cloth, owner, padded=True)
        plate(f"CM_CouchLegPad_{index}", ankle - leg, -leg, leg_normal, LEG_LENGTH - 2, LEG_WIDTH - 3, cloth, owner, padded=True)
        plate(f"CM_CouchFootPan_{index}", ankle, foot, foot_normal, FOOT_LENGTH, FOOT_WIDTH, metal, owner)
        for u in (4, 25):
            for v in (-10.5, 10.5):
                box(f"CM_CouchPanBracket_{index}_{u}_{v}", hip + back * u + across * v - normal * 0.4, back, across, (3.0, 2.0, 1.2), metal, owner)
        for v in (-4.0, 4.0):
            cylinder(
                f"CM_CouchHeadPost_{index}_{v}", hip + back * 27 + across * v - normal, hip + back * 35 + across * v + normal * 2.0, 0.4, owner=owner
            )
        head = hip + back * (32 - HEAD_LENGTH / 2) + normal * 1.7
        plate(f"CM_CouchHeadrest_{index}", head, back, normal, HEAD_LENGTH, HEAD_WIDTH, cloth, owner, padded=True)

        # Only the hip pivots. The flight-design seat/leg support is one unit,
        # without a foldable knee joint or later pip-pin folding hardware.
        at = hip - normal
        cylinder(f"CM_CouchHipAxle_{index}", at - across * (SEAT_WIDTH / 2 + 0.8), at + across * (SEAT_WIDTH / 2 + 0.8), 0.55, steel, owner)

        # Six suspension points, one release buckle. The unoccupied, laid
        # webbing pose is estimated; no invisible astronaut holds it in space.
        buckle = hip + back * 3 + normal * 1.8
        box(f"CM_CouchBuckle_{index}", buckle, back, across, (2.6, 2.8, 0.8), steel, owner)
        box(f"CM_CouchRelease_{index}", buckle + normal * 0.65, back, across, (1.4, 1.0, 0.5), metal, owner)
        for sign in (-1, 1):
            strap(
                f"CM_CouchShoulderHarness_{index}_{sign}",
                [hip + back * u + across * sign * v + normal * n for u, v, n in ((27, 5.8, 1.3), (19, 4.7, 1.5), (10, 3.4, 1.4), (4, 1.1, 1.8))],
                normal,
                owner,
            )
            strap(
                f"CM_CouchLapHarness_{index}_{sign}",
                [hip + back * u + across * sign * v + normal * n for u, v, n in ((1, 10, 1.3), (2, 6.5, 1.6), (3, 1.0, 1.8))],
                normal,
                owner,
            )
            strap(
                f"CM_CouchCrotchHarness_{index}_{sign}",
                [
                    hip + seat * 5 + across * sign * 4 + seat_normal * 1.3,
                    hip + seat * 2 + across * sign * 2 + seat_normal * 1.6,
                    buckle - back * 1.5 + across * sign * 0.7,
                ],
                normal,
                owner,
            )

        # Passive heel restraints replaced the earlier D-ring instep system
        # immediately before Apollo 7 (D-7440 p.6). Two boots per crewman.
        for sign in (-1, 1):
            at = ankle + across * sign * 3.8
            plate(f"CM_CouchHeelPad_{index}_{sign}", at + foot * 0.5, foot, foot_normal, 8.5, 6.3, rubber, owner, padded=True)
            for v in (-3.3, 3.3):
                beam(
                    f"CM_CouchHeelClip_{index}_{sign}_{v}",
                    at + across * v + foot_normal * 1.2,
                    at + foot * 2.4 + across * v + foot_normal * 1.2,
                    0.5,
                    2.4,
                    metal,
                    owner,
                )
            beam(
                f"CM_CouchHeelRear_{index}_{sign}",
                at - across * 3.3 + foot_normal * 1.8,
                at + across * 3.3 + foot_normal * 1.8,
                0.5,
                2.4,
                metal,
                owner,
            )
            cylinder(
                f"CM_CouchToeRetainer_{index}_{sign}",
                at + foot * 8.3 - across * 3.5 + foot_normal * 2.2,
                at + foot * 8.3 + across * 3.5 + foot_normal * 2.2,
                0.25,
                steel,
                owner,
            )
            for v in (-3.5, 3.5):
                cylinder(
                    f"CM_CouchRetainerPost_{index}_{sign}_{v}",
                    at + foot * 8.3 + across * v - foot_normal * 0.2,
                    at + foot * 8.3 + across * v + foot_normal * 2.2,
                    0.25,
                    steel,
                    owner,
                )

    def strut(name, a, b):
        """Honeycomb-attenuator exterior: case, piston and end fittings."""
        a, b = Vector(a), Vector(b)
        delta = b - a
        # Estimated attachment stem bridges the frame and case. The housing
        # begins beyond the frame; it must not hang unsupported above it.
        cylinder(f"CM_CouchStrutStem_{name}", a - delta.normalized() * 0.5, a + delta * 0.14, 0.5, steel)
        cylinder(f"CM_CouchStrutCase_{name}", a + delta * 0.10, a + delta * 0.70, 1.25)
        cylinder(f"CM_CouchStrutRod_{name}", a + delta * 0.65, b - delta.normalized() * 1.5, 0.55, steel)
        for i, t in enumerate((0.08, 0.14, 0.64, 0.71)):
            cylinder(f"CM_CouchStrutBand_{name}_{i}", a + delta * t, a + delta * (t + 0.025), 1.5, steel)
        # A mounting pad crosses the nominal wall reference; its finite metal
        # thickness is an estimated fitting, not a claim about skin structure.
        axis = delta.normalized()
        side = across if abs(axis.dot(across)) < 0.9 else back
        box(f"CM_CouchWallMount_{name}", b, axis, side - axis * side.dot(axis), (4.0, 4.0, 4.0), metal, mount=True)

    # Counts/orientation from the earlier unitized layout and D-7440 Fig.1;
    # exact SC101 mounting coordinates remain estimated. Head struts pass
    # outboard of the measured console, with endpoints on the nominal wall.
    for sign in (-1, 1):
        strut(f"XFoot_{sign}", point(-20, sign * FRAME_HALF_WIDTH, -1.5), Vector((-15, sign * 22, 80.75)))
        r = pressure_vessel.radius(65)
        strut(f"XHead_{sign}", point(29, sign * FRAME_HALF_WIDTH, -1.5), Vector((math.sqrt(r * r - 44 * 44), sign * 44, 65)))
        r = pressure_vessel.radius(pressure_vessel.AFT)
        strut(f"Z_{sign}", point(27, sign * FRAME_HALF_WIDTH, -1.5), Vector((math.sqrt(r * r - 32 * 32), sign * 32, pressure_vessel.AFT)))
        z = point(0, sign * FRAME_HALF_WIDTH, -1.5).z
        r = pressure_vessel.radius(z)
        strut(f"Y_{sign}", point(0, sign * FRAME_HALF_WIDTH, -1.5), Vector((HIP_X, sign * math.sqrt(r * r - HIP_X**2), z)))

    # Verify actual geometry, not just the source parameters. Body supports
    # must fit the nominal cabin; wall fittings deliberately cross its datum.
    bpy.context.view_layer.update()
    console = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("CM_MainConsole_")]
    points, faces = [], []
    for obj in console:
        offset = len(points)
        points.extend(obj.matrix_local @ v.co for v in obj.data.vertices)
        obj.data.calc_loop_triangles()
        faces.extend(tuple(offset + i for i in f.vertices) for f in obj.data.loop_triangles)
    tree = BVHTree.FromPolygons(points, faces, all_triangles=True) if points else None
    for obj, mount in owned:
        coords = [obj.matrix_local @ v.co for v in obj.data.vertices]
        if tree:
            for edge in obj.data.edges:
                a, b = (coords[i] for i in edge.vertices)
                delta = b - a
                if delta.length > 1e-6:
                    hit, *_ = tree.ray_cast(a, delta.normalized(), delta.length)
                    if hit is not None:
                        raise ValueError(f"{obj.name} crosses the measured main-console reference")
        if mount:
            continue
        for p in coords:
            z = p.z / IN - base
            r = math.hypot(p.x, p.y) / IN
            if not pressure_vessel.AFT <= z <= pressure_vessel.FORWARD or r > pressure_vessel.radius(z) + 0.01:
                raise ValueError(f"{obj.name} leaves the nominal pressure-wall envelope: Xc={z:.3f}, r={r:.3f}")
            if z < pressure_vessel.bulkhead_x(r) - 0.01:
                raise ValueError(f"{obj.name} passes through the nominal cabin floor")
    print(
        "Apollo 7 unitized couches: estimated geometry; 3 positions, 18 harness points, 6 passive heel restraints, 8 honeycomb-attenuator exteriors"
    )
