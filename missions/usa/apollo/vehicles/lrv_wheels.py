"""LRV suspension and wheel assemblies. Apollo 16 press kit pp. 107, 109–111; inches, X forward, Y left."""

from math import cos, hypot, pi, radians, sin, tau

from mathutils import Matrix, Vector

import srlib
from lm5_equipment import box, point, tube
from srlib import IN, MeshBuilder, frame, group, prof

RADIUS = 32.19 / 2
# Wheel section read from the figure on p. 110. The 9 in maximum width is documented.
SECTION = [(8.2, -2.75), (10.0, -4.05), (11.9, -4.5), (13.45, -4.3), (14.85, -3.6), (15.62, -2.65), (15.94, -1.45), (16.03, 0)]
SECTION += [(r, -w) for r, w in reversed(SECTION[:-1])]


def polar(r, width, angle):
    return point(r * sin(angle), width, r * cos(angle))


def casing(mesh, scale):
    # Each strand runs diagonally from one bead across the crown to the other bead. The two
    # families cross as they did on the real wheel. Strand count and gauge are reduced for display.
    count = round(104 * scale)
    for i in range(count):
        phase = tau * i / count
        for hand in (-1, 1):
            vertices = []
            for j, (radius, width) in enumerate(SECTION):
                angle = phase + hand * (j / (len(SECTION) - 1) - 0.5) * 1.25
                # The inner family passes under the outer wires at each crossover.
                inner = 0.125 if hand < 0 else 0
                ra, wa = SECTION[max(0, j - 1)]
                rb, wb = SECTION[min(len(SECTION) - 1, j + 1)]
                length = hypot(rb - ra, wb - wa)
                p = polar(radius - inner * (wb - wa) / length, width + inner * (rb - ra) / length, angle)
                # A small three-sided cross-section remains visible in silhouette and through the mesh.
                along = Vector((cos(angle), 0, -sin(angle)))
                radial = Vector((sin(angle), 0, cos(angle)))
                for k in range(3):
                    offset = (along * cos(tau * k / 3) + radial * sin(tau * k / 3)) * 0.038 * IN
                    vertices.append(p + offset)
            faces = [(j * 3 + k, j * 3 + (k + 1) % 3, (j + 1) * 3 + (k + 1) % 3, (j + 1) * 3 + k) for j in range(len(SECTION) - 1) for k in range(3)]
            mesh.add(vertices, faces)


def tire(parent, name, sign, m):
    rim, stop, wires, treads, bolts = (MeshBuilder() for _ in range(5))
    spindle = frame(point(0, 0, 0), (0, sign, 0))
    # The outer hub is a spun, dished disc with a raised axle cap. The compliant outer wheel is open.
    rim.lathe(
        prof(
            [
                (0, -2.7),
                (3.5, -2.7),
                (6.1, -1.5),
                (8.22, -2.88),
                (8.32, -2.72),
                (8.32, 2.72),
                (8.2, 2.88),
                (6.9, 1.65),
                (4.0, 0.42),
                (2.5, 0.42),
                (2.35, 1.7),
                (0, 1.7),
            ]
        ),
        64,
        matrix=spindle,
    )
    # Open titanium inner frame, 25.5 inches outside diameter, with sprung ribs behind the wire.
    for width in (-2.0, 2.0):
        stop.lathe(prof([(12.40, width - 0.14), (12.75, width - 0.14), (12.75, width + 0.14), (12.40, width + 0.14)]), 56, matrix=spindle)
    for i in range(16):
        a = tau * i / 16
        for hand in (-1, 1):
            stop.ribbon([polar(8.12, hand * 2.35, a), polar(10.7, hand * 2.80, a + 0.09), polar(12.53, hand * 2, a + 0.16)], (0, 1, 0), 0.45 * IN)
    casing(wires, max(0.3, srlib.DETAIL))
    # Chevron plates are bent over the curved tread, with pairs of rivets. Keep the full pattern
    # at each level: the V's are a particularly conspicuous feature of the flight wheels.
    for i in range(48):
        a = tau * i / 48
        for hand in (-1, 1):
            sections = [(0.035, RADIUS, 0.0), (1.45, 16.00, 0.049), (2.65, 15.69, 0.091), (3.6, 14.93, 0.132)]
            vertices = [polar(r, hand * w, a + skew + delta) for w, r, skew in sections for delta in (-0.026, 0.026)]
            treads.add(vertices, [(j, j + 1, j + 3, j + 2) if hand > 0 else (j + 2, j + 3, j + 1, j) for j in (0, 2, 4)])
            if srlib.DETAIL >= 0.6:
                # The narrow head slightly proud of each strip at the shoulder.
                q = a + 0.097
                bolts.disc(polar(15.6, hand * 2.76, q), (sin(q) * 0.9, hand * 0.45, cos(q) * 0.9), 0.135 * IN, 0.075 * IN, segs=6)
    for angle in (0, pi):
        tube(bolts, (0, sign * 2.97, 6.9 * cos(angle)), (0, sign * 3.04, 3.4 * cos(angle)), 0.13)
        box(bolts, (0, sign * 3, 5.25 * cos(angle)), (0.8, 0.42, 0.7))
    for mesh, tag, mat, smooth in (
        (rim, "SpunHub", "alloy", True),
        (stop, "InnerFrame", "titanium", True),
        (wires, "WovenWire", "wire", True),
        (treads, "Chevrons", "titanium", False),
        (bolts, "Fasteners", "hardware", False),
    ):
        mesh.build(f"LRV_{tag}_{name}", m[mat], parent, smooth=smooth)


def fender(parent, name, fore, sign, m, *, repaired):
    skin, stays, seams = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # The telescoping sections follow the tyre crown. Deployed ends are visible as small steps.
    direction = 1 if fore else -1
    sections = ((-55, -33, 17.80), (-33, 8, 18.08)) if repaired else ((-55, -33, 17.80), (-33, 45, 18.08), (45, 77, 17.80))
    for lo, hi, r in sections:
        steps = max(5, round((hi - lo) * srlib.DETAIL / 4))
        section = [(-5.4, r - 0.82), (-5.15, r - 0.25), (-4.48, r), (0, r + 0.21), (4.48, r), (5.15, r - 0.25), (5.4, r - 0.82)]
        verts = [polar(radius, w, radians(direction * (lo + (hi - lo) * i / steps))) for i in range(steps + 1) for w, radius in section]
        skin.add(verts, [(i * 7 + j, (i + 1) * 7 + j, (i + 1) * 7 + j + 1, i * 7 + j + 1) for i in range(steps) for j in range(6)])
    for a in (-33,) if repaired else (-33, 45):
        angle = radians(direction * a)
        for w1, w2, r1, r2 in ((-5.2, -4.48, 17.95, 18.24), (-4.48, 0, 18.24, 18.45), (0, 4.48, 18.45, 18.24), (4.48, 5.2, 18.24, 17.95)):
            seams.tube(polar(r1 + 0.06, w1, angle), polar(r2 + 0.06, w2, angle), 0.11 * IN, caps=False)
    for a in (-33, 40):
        angle = radians(a)
        q = polar(17.35, -sign * 4.9, angle)
        stays.tube(point(0, -sign * 5.7, 1), q, 0.26 * IN)
        stays.tube(q, polar(17.86, -sign * 4.35, angle), 0.33 * IN)
    if repaired:
        from lrv3_equipment import map_extension

        map_extension(parent, m)
    skin.build(f"LRV_FenderSkin_{name}", m["amber"], parent)
    stays.build(f"LRV_FenderBraces_{name}", m["alloy"], parent)
    seams.build(f"LRV_FenderSeams_{name}", m["ochre"], parent)


def drive(parent, name, sign, m):
    housing, brake, cable, rings = (MeshBuilder() for _ in range(4))
    spindle = frame(point(0, 0, 0), (0, -sign, 0))
    housing.lathe(
        prof(
            [
                (0, 2.58),
                (2.6, 2.58),
                (3.12, 3.48),
                (3.12, 4.60),
                (2.75, 4.94),
                (2.75, 6.1),
                (2.35, 6.36),
                (1.91, 6.36),
                (1.91, 9.75),
                (1.6, 10.13),
                (0, 10.13),
            ]
        ),
        48,
        matrix=spindle,
    )
    brake.lathe(prof([(2.93, 4.6), (3.42, 4.78), (3.42, 5.16), (2.76, 5.24)]), 44, matrix=spindle)
    for i in range(10):
        a = tau * i / 10
        tube(rings, (1.96 * sin(a), -sign * 6.55, 1.96 * cos(a)), (1.96 * sin(a), -sign * 9.5, 1.96 * cos(a)), 0.14)
    for a in range(0, 360, 60):
        q = radians(a)
        rings.disc(polar(2.62, -sign * 3.55, q), (0, -sign, 0), 0.24 * IN, 0.27 * IN)
    box(brake, (1.8, -sign * 5.2, 2.32), (1.6, 1.6, 1.2))
    tube(cable, (1.85, -sign * 5.30, 3.0), (2.4, -sign * 7.95, 3.58), 0.24)
    tube(cable, (2.4, -sign * 7.95, 3.58), (1.25, -sign * 10.5, 2.75), 0.24)
    for mesh, tag, mat in (
        (housing, "TractionMotor", "alloy"),
        (brake, "Brake", "dark"),
        (cable, "Cable", "rubber"),
        (rings, "MotorFins", "hardware"),
    ):
        mesh.build(f"LRV_{tag}_{name}", m[mat], parent)


def suspension_link(parent, corner, tag, start, end):
    """Local +Z (viewer +Y) runs from the inboard hinge to the outboard joint."""
    link = group(f"LRV_Link_{corner}_{tag}", parent)
    direction = point(*end) - point(*start)
    axis = direction.normalized()
    side = axis.cross(Vector((1, 0, 0))).normalized()
    rotation = Matrix((side.cross(axis), side, axis)).transposed()
    link.matrix_local = Matrix.Translation(point(*start)) @ rotation.to_4x4()
    group(link.name + "_In", link)
    group(link.name + "_Out", link).location.z = direction.length
    return link, direction.length / IN


def suspension(parent, steer, x, sign, name, m):
    pivots, knuckle, knuckle_eyes = MeshBuilder(), MeshBuilder(), MeshBuilder()

    # Upright and ball joints travel with the steering spindle. Its vertical axis passes
    # through the wishbone ends; the tie rod's pickup is deliberately offset for steering.
    def pickup(tag, out):
        at = point(*out) - steer.location
        group(f"LRV_Mount_{name}_{tag}", steer).location = at
        return tuple(at / IN)

    for tag, z, knuckle_z in (("Lower", 15.9, 13.25), ("Upper", 21.05, 19.75)):
        start = (x, sign * 16, z)
        end = (x, sign * 29.1, knuckle_z)
        link, length = suspension_link(parent, name, tag, start, end)
        arms = MeshBuilder()
        for dx in (-6.0, 6.0):
            tube(arms, (x + dx, sign * 16, z), end, 0.58)
            tube(pivots, (x + dx - 0.86, sign * 16, z), (x + dx + 0.86, sign * 16, z), 0.82)
        tube(arms, (x - 6.25, sign * 16, z), (x + 6.25, sign * 16, z), 0.43)
        to_hinge = link.matrix_basis.inverted()
        arms.verts = [tuple(to_hinge @ Vector(v)) for v in arms.verts]
        arms.build(f"LRV_Wishbone_{name}_{tag}", m["alloy"], link)
        outer = pickup(tag, end)
        box(knuckle_eyes, (outer[0], outer[1] + sign * 0.05, outer[2]), (1.62, 1.2, 0.96))
        if tag == "Lower":
            # On the forward leg, four fifths of the way to the outer ball joint.
            damper_mount = group(f"LRV_Mount_{name}_Damper", link)
            damper_mount.location = point(1.2, 0, 0.8 * length)
            damper_end = tuple((link.matrix_basis @ damper_mount.location) / IN)

    tube(knuckle, (0, 0, 13.25 - RADIUS), (0, 0, 19.75 - RADIUS), 0.56)
    tie_mount = pickup("Tie", (x - 3.6, sign * 29.15, 17.0))
    tube(knuckle, (0, 0, 17.0 - RADIUS), tie_mount, 0.38)
    box(knuckle_eyes, tie_mount, (1.2, 0.92, 0.8))
    knuckle.build(f"LRV_Knuckle_{name}", m["alloy"], steer)
    knuckle_eyes.build(f"LRV_KnuckleEyes_{name}", m["dark"], steer)
    pivots.build(f"LRV_Pivots_{name}", m["dark"], parent)

    tie, length = suspension_link(parent, name, "Tie", (x - 5.25, sign * 12.2, 17.85), (x - 3.6, sign * 29.15, 17.0))
    rod = MeshBuilder()
    tube(rod, (0, 0, 0), (0, 0, length), 0.28)
    rod.build(f"LRV_TieRod_{name}", m["hardware"], tie)

    damper, length = suspension_link(parent, name, "Damper", (x + 5.55, sign * 16.3, 22.2), damper_end)
    barrel, piston = MeshBuilder(), MeshBuilder()
    # Cylinder mouth stays the same distance from its chassis mount. The narrower piston
    # enters its bore from the eye on the lower wishbone.
    tube(barrel, (0, 0, 0), (0, 0, 0.66 * length), 0.7)
    tube(piston, (0, 0, 0), (0, 0, -0.66 * length), 0.33)
    barrel.build(f"LRV_Barrel_{name}", m["ochre"], damper)
    piston.build(f"LRV_Piston_{name}", m["hardware"], damper).location.z = length * IN


def build_wheels(m, mission):
    carrier = group("RoverSuspension")
    for fore, x, end in ((True, 45, "F"), (False, -45, "R")):
        # The front and rear steering actuators are independent. A motor drives the steering
        # gearbox and the two tie rods at each end. The gearcases and hardpoints are reconstructed.
        gear = group("LRV_SteeringGear_" + end, carrier)
        body, mechanism, links = MeshBuilder(), MeshBuilder(), MeshBuilder()
        g = x - 4.0
        box(body, (g, 0, 17.65), (5.05, 4.46, 2.95))
        mechanism.lathe(
            prof([(0, 0), (1.18, 0), (1.35, 0.48), (1.35, 4.15), (1.08, 4.48), (0, 4.48)]), 32, matrix=frame(point(g + 2.50, 0, 17.65), (1, 0, 0))
        )
        tube(mechanism, (g, -6.25, 18.10), (g, 6.25, 18.10), 0.54)
        for side in (-1, 1):
            tube(links, (g, side * 5.9, 18.10), (x - 5.25, side * 12.2, 17.85), 0.31)
            tube(mechanism, (g, side * 5.46, 18.10), (g, side * 6.62, 18.10), 0.73)
        body.build("LRV_SteeringCase_" + end, m["dark"], gear)
        mechanism.build("LRV_SteeringMotorAndCranks_" + end, m["alloy"], gear)
        links.build("LRV_SteeringLinks_" + end, m["hardware"], gear)
        for sign, side in ((1, "L"), (-1, "R")):
            name = end + side
            steer = group("LRV_Steer_" + name)
            # The steering bearing lies on the suspension upright, inboard of the centre of
            # the tread. Both ball joints stay on that axis as the complete drive steers.
            steer.location = point(x, 29.1 * sign, RADIUS)
            tire(group("LRV_Wheel_" + name, steer), name, sign, m)
            drive(group("LRV_Drive_" + name, steer), name, sign, m)
            fender(group("LRV_Fender_" + name, steer), name, fore, sign, m, repaired=mission == 17 and name == "RR")
            for assembly in steer.children:
                assembly.location.y = (36 - 29.1) * sign * IN
            suspension(carrier, steer, x, sign, name, m)
