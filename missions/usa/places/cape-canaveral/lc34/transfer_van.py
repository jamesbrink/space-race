"""The Clark Cortez crew transfer van, reconstructed in the manufacturer's inches."""

from math import pi

from mathutils import Matrix, Vector

import sitelib
from sitelib import Parts, beam, box, fine, lettering, obox
from srlib import IN, frame
from vehicles import suburban_1960

from .site import deck, pipe

PARK_X, PARK_Y = -86, -31  # estimated departure-side stopping spot on the apron, in site feet
NODE = "Transfer_Van"
MODEL = "Clark Cortez crew transfer van"
ABOUT = "Apollo 7's crew rode to Complex 34 in this converted Clark Cortez. Dimensions are the 1968 coach's; NASA's fittings are reconstructed."


def body(parts):
    white, trim, glass = (parts(NODE, k) for k in ("tank", "chrome", "glass"))
    floor, blue, red = (parts(NODE, k) for k in ("deck", "van_blue", "van_red"))
    # 225 × 95 × 96 in body. Leave the four wheel wells and the rear boarding opening genuinely open.
    deck(floor, -64, 152, -44, 44, 28, thick=1.1)
    box(parts(NODE, "steel"), (-60, -22, 11), (148, 22, 26))
    for s in (-1, 1):
        lo, hi = sorted((s * 45.5, s * 47.5))
        for xa, xb in ((-64, -17.5), (17.5, 101.5), (138.5, 153.2)):
            box(white, (xa, lo, 15.4), (xb, hi, 54))
        for x in (0, 120):
            cap = 53.97 if x == 0 else 33.63
            box(white, (x - 17.4, lo + 0.051, 32.7), (x + 17.4, hi - 0.055, cap))
            for sign in (-1, 1):
                for low, high, gap in ((19.8, 24.3, 15.81), (24.36, 28.8, 13.2), (28.86, 32.65, 8.6)):
                    xa, xb = sorted((x + sign * 17.36, x + sign * gap))
                    box(white, (xa, lo + 0.093, low), (xb, hi - 0.097, high))
        boxes = [(-63, 55, 86), (-18, 54.07, 84), (25.3, 54.08, 84), (68.2, 54.08, 84), (99, 54.08, 84), (144, 54.08, 86)]
        for x, a, b in boxes:
            box(white, (x - 1.15, lo + 0.05, a), (x + 1.15, hi - 0.05, b))
        for xa, xb in ((-61.6, -19.3), (-16.7, 24), (26.6, 66.9), (69.5, 97.75), (133.4, 142.7)):
            a, b = sorted((s * 45.64, s * 46.19))
            box(glass, (xa, a, 54.2), (xb, b, 84.18))
        box(white, (-64, lo, 84.24), (152.5, hi, 89.6))
        a, b = sorted((s * 47.63, s * 47.82))
        for xa, xb in ((-64, 101.4), (138.66, 153.2)):
            box(blue, (xa + 0.09, a, 39.4), (xb - 0.09, b, 43.1))
            box(trim, (xa + 0.09, a, 43.26), (xb - 0.09, b, 44.0))
            box(red, (xa + 0.09, a, 44.09), (xb - 0.09, b, 44.45))
            box(red, (xa + 0.09, a, 38.84), (xb - 0.09, b, 39.22))
        # Roof and side body corner short radii.
        obox(white, (43, s * 45.2, 89.1), (1, 0, 0), (0, -s * 0.53, 1), (217, 5.1, 0.85))
    deck(white, -65.9, 151.6, -43.05, 43.05, 93, thick=1.65)
    box(white, (-46, -15, 93.06), (-24, 15, 96))
    for k in range(-4, 5):
        box(parts(NODE, "steel/vents"), (-47, k * 2.5 - 0.4, 94.1), (-46.06, k * 2.5 + 0.4, 95.1))
    # Rounded front lower cap, twin windshield and horizontal grille.
    box(white, (151.84, -44.6, 18.1), (155.64, 44.6, 55.7))
    box(white, (149.1, -43.2, 84.2), (153.01, 43.2, 89.1))
    for y in (-22, 22):
        obox(glass, (153.7, y, 70), (0, 1, 0), (-0.12, 0, 1), (42, 29.7, 0.66))
    for y in (-43.7, 0, 43.7):
        beam(parts(NODE, "tank"), (155.3, y, 54.1), (151.8, y, 84.59), 0.96)
    box(parts(NODE, "black"), (155.8, -25.3, 25.1), (156.27, 25.3, 37.1))
    for z in (25.3, 27.5, 29.7, 31.9, 34.1, 36.3):
        box(trim, (156.56, -25.6, z), (157.04, 25.6, z + 0.44))
    for y in (-34.6, 34.6):
        pipe(trim, (156, y, 35), (157.0, y, 35), 4.8, 18)
        pipe(parts(NODE, "white"), (157.07, y, 35), (157.75, y, 35), 3.91, 18)
    for x in (-67.5, 157.5):
        box(trim, (x - 1, -44.7, 14.45), (x + 1, 44.7, 17.4))
    for y in (-35, 35):
        box(parts(NODE, "van_blue"), (-66.5, y - 1.26, 37.1), (-65.28, y + 1.26, 45.1))
    for side in (-1, 1):
        yy = side * 43.1
        deck(parts(NODE, "steel/steps"), 131.8, 141.8, yy - 3.65, yy + 3.65, 11.6, thick=0.78)
    # Rear bulkhead carries a glazed door and a separate passenger window.
    for ya, yb in ((-45, -11.55), (11.55, 45)):
        box(white, (-66.14, ya, 18.3), (-64.4, yb, 57.2))
        box(white, (-66.15, ya, 78.6), (-64.35, yb, 90))
        box(glass, (-65.85, ya + 1.4, 57.24), (-65.39, yb - 1.4, 78.54))
    deck(parts(NODE, "steel/steps"), -73.3, -64.45, -11.6, 11.6, 17.9, thick=0.79)
    deck(parts(NODE, "steel/steps"), -77.1, -65.2, -11.05, 11.05, 9.0, thick=0.8)
    for sign in (-1, 1):
        lettering(parts(NODE, "sign"), "NASA", 4.4, (51.7, sign * 47.88, 39.1), (-sign, 0, 0), (0, 0, 1))
    if fine():
        for y in (-40, 40):
            x = 148.1
            beam(trim, (x, y, 61), (x - 4, y + (10 if y > 0 else -10), 68), 0.82)
            ym = y + (10 if y > 0 else -10)
            box(trim, (x - 4.54, ym - 1.3, 66.7), (x - 3.5, ym + 1.3, 71.1))
            beam(parts(NODE, "black"), (153.5, y / 2, 57), (152.6, y / 2 + 12, 62), 0.38)


def door_leaf(parts, name, hinge, along, width, swing, window_top, *, driver=False):
    x, y, z = hinge
    parts.node(name, NODE, hinge, door=1, swing=swing, axis="y")
    up = (0, 0, 1)
    for lo, hi, key in ((0, 31.0, "tank"), (31.12, window_top - 1.3, "glass"), (window_top - 1.15, window_top + 0.6, "tank")):
        obox(
            parts(name, key),
            (x + along[0] * width / 2, y + along[1] * width / 2, z + (lo + hi) / 2),
            along,
            up,
            (width - (1.8 if key == "glass" else 0), 0.76 if key == "glass" else 1.48, hi - lo),
        )
    for s in (0.5, width - 0.5):
        obox(
            parts(name, "tank"),
            (x + along[0] * s, y + along[1] * s, z + (31.09 + window_top - 1.22) / 2),
            along,
            up,
            (0.99, 1.35, window_top - 1.22 - 31.09),
        )
    for f in (0.42, 0.72):
        u = width * f
        obox(parts(name, "chrome"), (x + along[0] * u - along[1] * 0.92, y + along[1] * u + along[0] * 0.92, z + 28), along, up, (2.3, 0.72, 0.62))
    if driver:
        deck(parts(name, "van_blue"), x - width + 0.15, x - 0.11, y + 0.79, y + 0.96, z + 9.25, thick=3.25)


def interior(parts):
    for i, (x, y) in enumerate(((111, 23), (111, -23), (47, 26), (17, 26), (-13, 26))):
        box(parts(NODE, "steel/seat_mounts"), (x - 6.9, y - 7.1, 28.08), (x + 6.9, y + 7.1, 41.3))
        box(parts(NODE, "van_seat"), (x - 9.1, y - 8.15, 41.36), (x + 9.1, y + 8.15, 45.8))
        obox(parts(NODE, "van_seat"), (x - 9.1, y, 57.83), (1, 0, 0), (-0.18, 0, 1), (4.1, 16.7, 24.2))
        if i == 0:
            parts.node(f"{NODE}_Seat_Driver", NODE, (x - 2.6, y, 45.22), seat=1).rotation_euler.z = pi / 2
    box(parts(NODE, "van_blue"), (-48, -41.75, 28.09), (83, -31.9, 63.4))
    box(parts(NODE, "white"), (-47.2, -41.6, 63.5), (82.2, -32.1, 64.55))
    box(parts(NODE, "black/dash"), (141, -42, 44), (151.4, 42, 55.7))
    for y in (16, 22, 28):
        pipe(parts(NODE, "chrome/gauges"), (141.2, y, 54.66), (140.4, y, 55.25), 1.82, 12)
    pipe(parts(NODE, "steel/column"), (142, 23, 47), (127.7, 23, 61.6), 0.76)
    steering = f"{NODE}_SteeringWheel"
    hub = Vector((127.5, 23, 61.8))
    stand = parts.node(f"{NODE}_Stand_Driver", NODE, (119, 68.7, 0), stand=1)
    stand.rotation_euler.z = 0
    obj = parts.node(steering, NODE, tuple(hub), steering=1)
    # Build directly in the wheel's own frame so the game's turn axis is its column.
    matrix = frame(hub * IN, Vector((-0.73, 0, 0.68)))
    obj.matrix_local = matrix
    wheel = parts(steering, "black")
    wheel.lathe(
        [(7.52 * IN, -0.27 * IN), (8.43 * IN, -0.25 * IN), (8.65 * IN, 0), (8.4 * IN, 0.28 * IN), (7.49 * IN, 0.26 * IN)],
        36,
        matrix=Matrix.Translation(hub * IN),
    )
    for a, b in (((0, 0, 0), (8, 0, 0)), ((0, 0, 0), (-8, 0, 0)), ((0, 0, 0), (0, -7.86, 0))):
        beam(wheel, tuple(hub + Vector(a)), tuple(hub + Vector(b)), 0.38)
    parts.node("Light_Transfer_Van", NODE, (34, 0, 86), reach=3.6, intensity=0.9)


def build(materials):
    with sitelib.units(IN):
        parts = Parts(materials)
        obj = parts.node(
            NODE,
            vehicle=MODEL,
            about=ABOUT,
            wheelbase=120 * IN,
            track=69 * IN,
            wheel_radius=15.5 * IN,
            mass=3600,
            turning_circle=12.2,
            footprint=[158 * IN, 78 * IN, 49 * IN],
        )
        body(parts)
        door_leaf(parts, f"{NODE}_Door_1", (133, 46.6, 33.85), (-1, 0, 0), 31.3, -71, 50.37, driver=True)
        door_leaf(parts, f"{NODE}_Door_2", (133, -46.6, 33.85), (-1, 0, 0), 31.3, 71, 50.37)
        door_leaf(parts, f"{NODE}_Rear_Door", (-65.53, -10.98, 18.2), (0, 1, 0), 21.94, 97, 69.875)
        interior(parts)
        donor = suburban_1960("white")
        donor.tyre = (15.5, 8.25, 8.0)
        donor.cap_r = 7.1
        for i, sign in ((1, 1), (2, -1)):
            donor.build_wheel(f"{NODE}_Wheel_{i}", obj, Vector((0, sign * 34.625, 15.5)), sign)
            knuckle = parts.node(f"{NODE}_Knuckle_{i}", NODE, (120, sign * 29, 15.5), steer=1)
            donor.build_wheel(f"{NODE}_SteerWheel_{i}", knuckle, Vector((0, sign * 5.5, 0)), sign)
        parts.build()
        obj.location = (PARK_X * 12 * IN, PARK_Y * 12 * IN, 0)
