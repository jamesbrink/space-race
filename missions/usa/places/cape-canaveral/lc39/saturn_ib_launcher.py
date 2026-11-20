"""The Saturn IB conversion of ML-1. MSFC-MAN-206 §VII, figs. 7-5 through 7-7. Feet."""

from math import cos, pi, sin

from sitelib import P, beam, box, fine, handrail, hull, obox, stair_rails, stairs
from srlib import FT

# Register the unchanged arm 9 at the same Block II hatch as the Saturn V launcher.
# The figure records the two decks exactly. The nozzle station relative to them is derived.
ENGINE_STATION = (3871 - 2196.859) / 12
TOP = 127
LOWER = 117


def pipe(mesh, a, b, radius):
    mesh.tube(P(*a), P(*b), radius * FT, segs=12 if fine() else 8)


def launch_pedestal(parts, deck):
    node = "Launch_Pedestal"
    parts.node(node)
    structure = parts(node, "deck/legs", True)  # Gray in flown rollout photograph KSC-73C-309.
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]

    def corner(i, h):
        sx, sy = corners[i % 4]
        radius = 25.5 - 8.4 * h / LOWER
        return sx * radius, sy * radius, deck + h

    # The four tubular legs converge under the square equipment story. Each bay has a
    # horizontal tie and a pair of braces meeting at the middle of the higher tie.
    for i in range(4):
        x, y, _ = corner(i, 0)
        box(parts(node, "steel/footings"), (x - 2.5, y - 2.5, deck + 0.02), (x + 2.5, y + 2.5, deck + 0.7))
        pipe(structure, corner(i, 0.7), corner(i, LOWER), 1.45)
        for lo, hi in zip((0.9, 24, 47, 70, 93.5), (24, 47, 70, 93.5, LOWER)):
            a, b = corner(i, hi), corner(i + 1, hi)
            crown = tuple((v + w) / 2 for v, w in zip(a, b))
            pipe(structure, a, b, 0.56)
            for j in (i, i + 1):
                pipe(structure, corner(j, lo + 0.5), crown, 0.70)
        # Clamped service risers run up the inner side of the inclined steel.
        sx, sy = corners[i]
        for delta, r in ((0, 0.46), (1.3, 0.32)):
            start = (x - sx * 2.3, y - sy * (1.8 + delta), deck + 0.72)
            end = (sx * 14.8, sy * (15.3 - delta), deck + LOWER - 0.12)
            pipe(parts(node, "rail/risers", True), start, end, r)
            for f in (0.23, 0.52, 0.79):
                v = tuple(bottom + (upper - bottom) * f for bottom, upper in zip(start, end))
                pipe(parts(node, "steel/pipe_clamps"), v, (v[0], v[1], v[2] + 0.28), r + 0.12)

    # Fig. 7-5: enclosed valve story under the working platform. The exhaust
    # passes through the middle of both floors. Diameters and wall bays estimated.
    edges = 16
    for i in range(edges):
        a, b = (i + 0.5) * 2 * pi / edges, (i + 1.5) * 2 * pi / edges

        def ring(mesh, inner, outer, lo, hi):
            hull(mesh, [[(r * cos(t), r * sin(t), deck + h) for r, t in ((inner, a), (outer, a), (outer, b), (inner, b))] for h in (lo, hi)])

        ring(parts(node, "deck/floors"), 13.5, 29.4, TOP - 1.1, TOP)
        ring(parts(node, "steel/valve_floor"), 13.5, 27.7, LOWER, LOWER + 0.70)
        ring(parts(node, "steel/flash_liner"), 13.5, 13.80, LOWER + 0.72, TOP - 1.12)
        ring(parts(node, "deck/equipment_enclosure"), 26.2, 26.5, LOWER + 0.72, TOP - 1.12)
        t = (a + b) / 2
        u, side = (cos(t), sin(t), 0), (-sin(t), cos(t), 0)
        if fine():
            face = parts(node, "steel/equipment_panels")
            # Panels sit outside the flat chords of the sixteen-sided enclosure.
            obox(face, (26.15 * u[0], 26.15 * u[1], deck + LOWER + 4.9), side, (0, 0, 1), (6.1, 0.19, 6.5))
            for h in (4.1, 4.9, 5.7):
                obox(parts(node, "rail/louvres"), (26.28 * u[0], 26.28 * u[1], deck + LOWER + h), side, (0, 0, 1), (4.35, 0.13, 0.21))
    handrail(
        parts(node, "rail/perimeter"),
        [(29.05 * cos(t), 29.05 * sin(t), deck + TOP) for t in [(j + 0.5) * 2 * pi / edges for j in range(edges)]],
    )

    bridge = "Pedestal_Bridge"
    parts.node(bridge)
    for y in (-3.1, 3.1):
        for x in (29, 39, 49):
            beam(parts(bridge, "steel/truss"), (x, y, deck + LOWER + 0.25), (x + 10, y, deck + LOWER + 4.0), 0.39)
            beam(parts(bridge, "steel/truss"), (x + 10, y, deck + LOWER + 4.0), (x + 10, y, deck + LOWER + 0.25), 0.48)
        beam(parts(bridge, "steel/truss"), (26.8, y, deck + LOWER + 0.25), (60, y, deck + LOWER + 0.25), 0.6)
    floor = parts(bridge, "deck/walkway")
    box(floor, (28.7, -3, deck + TOP - 0.36), (38, 3, deck + TOP - 0.012))
    stairs(floor, (59.42, 0, deck + 120.85), (38, 0, deck + TOP), 6)
    stair_rails(parts(bridge, "rail"), (59.42, 0, deck + 120.85), (38, 0, deck + TOP), 6)
    for y in (-3.1, 3.1):
        handrail(parts(bridge, "rail/landing"), [(28.65, y, deck + TOP), (37.60, y, deck + TOP)])


def pedestal_accessories(parts, deck):
    top = deck + TOP
    parts.node("Holddown_Arms")
    parts.node("Tail_Service_Masts")

    def radial(radius, cross, h):
        return radius * c - cross * s, radius * s + cross * c, top + h

    for i in range(8):
        a = i * pi / 4
        c, s = cos(a), sin(a)
        name = f"Holddown_Link_{i + 1}"
        pivot = (16.75, 0, 12)
        parts.node(name, "Holddown_Arms", radial(*pivot))
        obox(parts("Holddown_Arms", "steel/sole"), radial(18.5, 0, 0.45), (c, s, 0), (0, 0, 1), (7.0, 4.45, 0.85))
        for cross in (-1.42, 1.42):
            # Tapering cheek casting with two broad feet around the release linkage.
            points = [(15.65, 0.91), (21.55, 0.91), (18.5, 11.7), (17.30, 12.75), (16.15, 12.65), (15.70, 11.65)]
            hull(parts("Holddown_Arms", "steel/cheeks"), [[radial(r, y, h) for r, h in points] for y in (cross + 0.32, cross - 0.32)])
        pipe(parts("Holddown_Arms", "rail/pins", True), radial(16.75, -1.95, 12), radial(16.75, 1.95, 12), 0.46)
        shoe = parts(name, "steel/link")

        # A narrow sloping bearing takes the blunt aft face of this particular fin.
        def bearing(r):
            return ENGINE_STATION - TOP + (61.369 + (244.2 - 12 * r) * 50 / 110) / 12 - 0.0009 / FT

        profile = [(16.13, 11.82), (16.72, 11.33), (20.21, bearing(20.21) - 0.85), (19.82, bearing(19.82) - 0.82)]
        hull(shoe, [[radial(r, y, h) for r, h in profile] for y in (0.57, -0.57)])
        hull(
            parts(name, "rail/bearing"),
            [[radial(r, y, bearing(r) + dz) for r, y in ((19.86, -0.082), (20.30, -0.082), (20.30, 0.082), (19.86, 0.082))] for dz in (-0.90, 0)],
        )
        if i % 2 == 0:
            ducts = parts("Tail_Service_Masts", "deck/boattail_conditioning", True)
            pipe(ducts, radial(14.2, 0, 0.1), radial(14.2, 0, 9), 0.54)
            pipe(ducts, radial(14.2, 0, 9), radial(12.7, 0, 12.3), 0.54)
            pipe(ducts, radial(12.7, 0, 12.3), radial(12.6, 0, 12.55), 0.7)
    for name, degrees, head in (("Fuel_Mast", 67.5, 20.5), ("LOX_Mast", 157.5, 21.4), ("Cable_Mast_II", 112.5, 18.7), ("Cable_Mast_IV", 292.5, 18.7)):
        a = degrees * pi / 180
        c, s = cos(a), sin(a)
        pivot = radial(24.2, 0, 1.45)
        parts.node(name, "Tail_Service_Masts", pivot)
        obox(parts("Tail_Service_Masts", "steel/mast_base"), radial(24.2, 0, 0.64), (c, s, 0), (0, 0, 1), (4.2, 3.8, 1.22))
        pipe(parts("Tail_Service_Masts", "rail/mast_axle", True), radial(24.2, -1.65, 1.45), radial(24.2, 1.65, 1.45), 0.40)
        structure = parts(name, "steel/trunk", True)
        # Triangulated tilting support carries either a fluid pipe and connector or a cable head.
        for y in (-0.72, 0.72):
            pipe(structure, radial(24.2, y, 1.46), radial(16.1, y, head - 2.3), 0.31)
            pipe(structure, radial(25.4, y, 2.0), radial(20.6, y, head - 6.6), 0.24)
            pipe(structure, radial(20.6, y, head - 6.6), radial(16.0, y, head - 2.05), 0.24)
        pipe(parts(name, "rail/supply", True), radial(24.2, 0, 1.7), radial(16.1, 0, head - 2.3), 0.42)
        pipe(parts(name, "rail/supply", True), radial(16.1, 0, head - 2.3), radial(13.05, 0, head), 0.42)
        obox(parts(name, "deck/coupling"), radial(13.10, 0, head), (c, s, 0), (0, 0, 1), (0.74, 2.28, 1.20))


def service_lines(parts, deck):
    """Fig. 7-7 identifies the service media. Routing, connectors and diameters reconstructed."""
    for name, level, tip, radii in (
        ("Service_Arm_1A", 215, 18.4 - 68 / 12, (0.40, 0.22)),
        ("Service_Arm_6", 245, 12.65, (0.38, 0.44)),
        ("Service_Arm_7", 276, 12.65, (0.56, 0.25)),
        ("Service_Arm_8", 304, 9.8, (0.31, 0.26)),
    ):
        z = deck + level
        for y, radius in zip((-1.0, 1.0), radii):
            tube = parts(name, "rail/service_lines", True)
            pipe(tube, (tip + 3.3, y, z + 1.4), (52.6, y, z + 1.4), radius)
            pipe(tube, (tip + 1.05, y, z + 2.45), (tip + 3.25, y, z + 1.46), radius)
            pipe(parts(name, "deck/couplings", True), (tip + 0.72, y, z + 2.5), (tip + 1.19, y, z + 2.5), radius + 0.24)
            for x in (tip + 4.2, 31, 45):
                pipe(parts(name, "steel/clamps", True), (x, y, z + 1.4), (x + 0.27, y, z + 1.4), radius + 0.09)
                beam(parts(name, "steel/cradles"), (x + 0.12, y, z + 0.47), (x + 0.12, y, z + 1.34), 0.20)
        for y in (-1.77, 1.77):
            beam(parts(name, "steel/carrier"), (tip + 0.60, y, z + 0.54), (tip + 1.94, y, z + 3.22), 0.18)
        beam(parts(name, "steel/carrier"), (tip + 1.94, -1.77, z + 3.22), (tip + 1.94, 1.77, z + 3.22), 0.18)
