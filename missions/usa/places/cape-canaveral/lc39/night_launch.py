"""LC-39 xenon banks used for Apollo 17. Mechanical outlines and bank positions reconstructed in feet."""

from mathutils import Vector

from sitelib import P, axes, beam, box, fine, obox, profile
from srlib import FT


def xenon_banks(parts):
    # KSC-72P-468: low banks on the perimeter aimed up at the launch vehicle.
    # MC2/1 gives 72 20 kW heads and two 60 kW banks. Their division into racks is estimated.
    parts.node("Xenon_Banks")
    # Each rack is aimed at an estimated height above the hardstand.
    stations = [
        (-154, -146, 105),
        (-42, -151, 147),
        (147, -146, 189),
        (258, -80, 231),
        (258, 82, 273),
        (147, 147, 315),
        (-42, 151, 122),
        (-154, 146, 164),
        (-151, -83, 150),
        (-151, 83, 150),
    ]
    up = Vector((0, 0, 1))
    for index, (x, y, aim_height) in enumerate(stations):
        heavy = index >= 8
        node = f"Xenon_Bank_{index + 1}"
        parts.node(node, "Xenon_Banks", (x, y, 0))
        steel, housing = parts(node, "steel"), parts(node, "deck")
        flat = Vector((-x, -y, 0)).normalized()
        side = Vector((-flat.y, flat.x, 0))
        base = Vector((x, y, 0))
        radius = 2.1 if heavy else 1.0
        width = 6.4 if heavy else 9.8
        obox(steel, base + up * 0.35, side, up, (width + 1.0, 4.1, 0.68))
        for across in (-width / 2, width / 2):
            foot = base + side * across
            beam(steel, foot - flat * 1.45 + up * 0.5, foot + up * 8.0, 0.31)
            beam(steel, foot + flat * 1.45 + up * 0.5, foot + up * 8.0, 0.31)
        for row in range(1 if heavy else 3):
            height = 4.5 if heavy else 2.2 + 2.6 * row
            rail = base + up * height - flat * 0.72
            beam(steel, rail - side * width / 2, rail + side * width / 2, 0.35)
            for offset in (0,) if heavy else (-2.9, 0, 2.9):
                pivot = base + up * height + side * offset
                aim = (Vector((0, 0, aim_height)) - pivot).normalized()
                matrix = axes(pivot, side, aim)
                # Trunnions on a yoke, cooling case, front clamp ring, recessed reflector and lens.
                for sign in (-1, 1):
                    tip = pivot + side * (sign * (radius + 0.17))
                    beam(steel, tip - flat * 0.8 - up * 0.16, tip, 0.18)
                housing.lathe(
                    profile(
                        [
                            (0, -radius * 1.35),
                            (radius * 0.64, -radius * 1.14),
                            (radius, -radius * 0.52),
                            (radius, radius * 0.69),
                            (radius * 0.92, radius * 0.69),
                        ]
                    ),
                    20,
                    matrix=matrix,
                )
                parts(node, "rail", True).lathe(
                    profile(
                        [
                            (radius * 0.89, radius * 0.68),
                            (radius * 1.04, radius * 0.7),
                            (radius * 1.04, radius * 0.82),
                            (radius * 0.89, radius * 0.82),
                        ]
                    ),
                    20,
                    matrix=matrix,
                )
                parts(node, "mirror", True).lathe(
                    profile([(0, -radius * 0.46), (radius * 0.45, -radius * 0.31), (radius * 0.9, radius * 0.61)]), 20, matrix=matrix, flip=True
                )
                parts(node, "xenon", True).lathe(profile([(radius * 0.9, radius * 0.74), (0, radius * 0.79)]), 20, matrix=matrix)
                if fine():
                    obox(housing, pivot - aim * (radius * 1.42), side, aim, (radius, radius * 0.71, radius * 0.38))
        # The viewer clusters nearby lenses. Beam and candela here are estimated for each rack.
        parts.mark(node, "xenon", candela=1.2e6, spread=66, lens_out=1)


def vent_disconnect(parts):
    """AS-512 flight evaluation §3.2.3 identifies the detector at the arm 7 hydrogen vent disconnect."""
    # Level relative to the hardstand is the 47-foot base plus arm 7's 276-foot station.
    z = 47 + 276
    name = "Arm7_Vent_Disconnect"
    parts.node(name, "Service_Arm_7", (15.6, 0, z + 2.6))
    pipe, rim, frame = parts(name, "deck", True), parts(name, "rail", True), parts(name, "steel")
    pipe.tube(P(13.4, 0, z + 2.6), P(28.4, 0, z + 2.6), 0.56 * FT)
    for x in (13.47, 13.99, 17.4, 27.6):
        rim.tube(P(x, 0, z + 2.6), P(x + 0.19, 0, z + 2.6), 0.69 * FT)
    for x in (14.85, 22.9, 27.8):
        for side in (-1, 1):
            beam(frame, (x, 0.82 * side, z + 0.41), (x, 0.40 * side, z + 2.22), 0.16)
    # A sample pickup beside the joint, with a small enclosure and exposed conduit. Dimensions estimated.
    box(frame, (14.44, 0.69, z + 2.4), (15.32, 1.23, z + 3.0))
    box(parts(name, "deck/cover"), (14.37, 1.247, z + 2.34), (15.39, 1.34, z + 3.06))
    rim.tube(P(14.0, 0.4, z + 2.74), P(14.5, 0.87, z + 2.74), 0.09 * FT)
    rim.tube(P(15.28, 1.05, z + 2.65), P(18.8, 1.05, z + 2.65), 0.078 * FT)
