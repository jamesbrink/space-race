"""The refractory hardstand, concrete launch pedestal and rail-mounted flame deflectors."""

from math import cos, pi, sin, tau

from sitelib import beam, box, fine, handrail, hull, obox, prism, stair_rails, stairs

from .site import APRON_RADIUS, FLAME_RADIUS, PEDESTAL_HALF, PEDESTAL_TOP, RAIL_Y, SERVICE_PARK, circle, deck, hardstand, pipe


def apron(parts):
    node = "Apron"
    parts.node(node)
    hardstand(parts(node, "concrete"), APRON_RADIUS)
    # The rectangular refractory fields either side of the stand appear on Argonne's overhead scan.
    for side in (-1, 1):
        lo, hi = sorted((side * 30, side * 132))
        deck(parts(node, "brick"), -59, 49, lo, hi, 0.019)
        if fine():
            for x in range(-56, 48, 5):
                deck(parts(node, "concrete/brick_joints"), x, x + 0.11, lo + 0.1, hi - 0.1, 0.031)
            for y in range(round(lo) + 6, round(hi) - 1, 6):
                deck(parts(node, "concrete/brick_joints"), -58.9, 48.9, y, y + 0.1, 0.043)
    steel = parts(node, "rail")
    for y in RAIL_Y:
        box(steel, (SERVICE_PARK - 53, y - 0.2, -0.19), (42, y + 0.2, 0.21))
    for x in (-6, 6):
        box(steel, (x - 0.17, -219, -0.18), (x + 0.17, 17, 0.14))


def pedestal(parts):
    node = "Launch_Pedestal"
    parts.node(node)
    concrete, topside = parts(node, "concrete"), parts(node, "plate")
    s, top = PEDESTAL_HALF, PEDESTAL_TOP
    for x in (-17.2, 17.2):
        for y in (-17.2, 17.2):
            box(concrete, (x - 3.8, y - 3.8, -0.7), (x + 3.8, y + 3.8, 20.89))
            box(parts(node, "brick"), (x - 4.05, y - 4.05, 0.08), (x + 4.05, y + 4.05, 1.81))
    # The deck is square on the outside and circular on the inside. Sector prisms share only their edges.
    for i in range(64):
        a, b = tau * i / 64, tau * (i + 1) / 64

        def point(theta, r):
            return r * cos(theta), r * sin(theta)

        def outer(theta):
            return s / max(abs(cos(theta)), abs(sin(theta)))

        prism(concrete, [point(a, FLAME_RADIUS), point(a, outer(a)), point(b, outer(b)), point(b, FLAME_RADIUS)], 20.9, top - 0.18)
        prism(
            topside,
            [point(a, FLAME_RADIUS - 0.07), point(a, outer(a) + 0.28), point(b, outer(b) + 0.28), point(b, FLAME_RADIUS - 0.07)],
            top - 0.16,
            top,
        )
    steel = parts(node, "steel")
    handrail(steel, [(-s, -s, top), (s, -s, top), (s, s, top), (-s, s, top)])
    handrail(steel, [(-s, -6, top), (-s, -s + 0.34, top)])
    handrail(steel, [(-s, s - 0.34, top), (-s, 1, top)])
    for foot, landing, width in [
        ((-51, 15, 0), (-29, 15, 13.5), 4.6),
        ((-31, -2.5, 13.5), (-21, -2.5, top), 4.8),
    ]:
        stairs(parts(node, "deck/stairs"), foot, landing, width)
        stair_rails(parts(node, "galv"), foot, landing, width)
    deck(parts(node, "deck"), -33.4, -27.0, -5, 17.4, 13.5)
    for y in (-4.8, 17.2):
        beam(steel, (-33, y, 0.15), (-33, y, 13.3), 0.64)
    handrail(steel, [(-33.4, -4.8, 13.5), (-33.4, 17.4, 13.5), (-31.4, 17.4, 13.5)])
    for corner in circle(18.4, 8):
        x, y = corner
        pipe(parts(node, "yellow"), (x, y, top + 0.03), (x, y, top + 0.2), 0.37)


def deflectors(parts):
    parent = "Flame_Deflectors"
    parts.node(parent)
    for name, y0 in (("Duty_Deflector", 0), ("Spare_Deflector", -199)):
        parts.node(name, parent, (0, y0, 0))
        # USF's modern survey records a 43-ft length, 32-ft width and 21-ft height.
        section = [(-21.5, 1.6), (-17, 2.5), (-12, 6), (-6, 13.5), (-1.2, 20.6), (0, 21), (1.2, 20.6), (6, 13.5), (12, 6), (17, 2.5), (21.5, 1.6)]
        for (ya, za), (yb, zb) in zip(section, section[1:]):
            hull(
                parts(name, "ceramic"),
                [
                    [(-16, y0 + ya, za - 0.55), (-16, y0 + ya, za), (-16, y0 + yb, zb), (-16, y0 + yb, zb - 0.55)],
                    [(16, y0 + ya, za - 0.55), (16, y0 + ya, za), (16, y0 + yb, zb), (16, y0 + yb, zb - 0.55)],
                ],
            )
        steel = parts(name, "steel")
        for x in (-15.6, -9, -3, 3, 9, 15.6):
            for y, z in section[1:-1:2]:
                beam(steel, (x, y0 + y, 0.9), (x, y0 + y, z - 0.4), 0.45)
            beam(steel, (x, y0 - 20, 1.5), (x, y0 + 20, 1.5), 0.62)
        for x in (-6, 6):
            for y in (-14.5, 14.5):
                pipe(steel, (x - 0.6, y0 + y, 0.83), (x + 0.6, y0 + y, 0.83), 0.69)


def hold_downs(parts):
    parent = "Hold_Downs"
    parts.node(parent)
    # Eight azimuths, between fins as estimated from the press-kit drawing and launch photography.
    for i in range(8):
        name = f"Hold_Down_{i + 1}"
        a = tau * (i + 0.5) / 8
        u = cos(a), sin(a), 0
        x, y = 14.4 * u[0], 14.4 * u[1]
        parts.node(name, parent, (x, y, PEDESTAL_TOP + 1.5))
        obox(parts(name, "galv"), (x, y, 27.26), u, (0, 0, 1), (3, 2.5, 0.46))
        obox(parts(name, "steel"), (x, y, 28.04), u, (0, 0, 1), (1.8, 1.75, 1.07))
        for dy in (-0.67, 0.67):
            ax, ay = x - dy * u[1], y + dy * u[0]
            beam(parts(name, "steel"), (ax, ay, 28.43), (ax - 3.7 * u[0], ay - 3.7 * u[1], 29.2), 0.62)
        obox(parts(name, "yellow"), (11.05 * u[0], 11.05 * u[1], 29.38), u, (0, 0, 1), (1.3, 1.72, 0.39))
        if fine():
            for ang in (-pi / 4, pi / 4, 3 * pi / 4, 5 * pi / 4):
                vx = x + 1.15 * cos(a + ang)
                vy = y + 1.15 * sin(a + ang)
                pipe(parts(name, "steel/bolts"), (vx, vy, 27.47), (vx, vy, 27.64), 0.12, 6)
