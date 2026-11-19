"""Soyuz's paired service towers. The arrangement follows NASA S75-32339. Dimensions in metres,
estimated against the photographed vehicle. The open steel frames and decks are shown closed for access.
"""

from .site import Parts, beam
from .steel import Turned, arc_deck, arc_rail, box_truss, poly_deck

LEVELS = (17.1, 19.8, 22.5, 25.2, 27.9, 30.6, 33.3, 36.0)


def build_towers(parts: Parts) -> None:
    for base, azimuth in (("NorthServiceTower", 45), ("SouthServiceTower", 225)):
        f = Turned(azimuth)
        parts.node(base)
        name = f"{base}_Frame"
        parts.node(name, base, origin=f(8.6, 0, 0.5))
        steel, floor, rails = parts(name, "green"), parts(name, "deck"), parts(name, "galv")

        # The lower frame straddles the support arm. Above it the open lift shaft is narrower.
        def corner(i, z, frame=f):
            r = max(4.4, 8.6 - 0.28 * z)
            w = max(0.92, 3.0 - 0.15 * z)
            return frame(r + (-0.64, 0.64, 0.64, -0.64)[i], (-w, -w, w, w)[i], z)

        box_truss(steel, corner, (0.5, 4.5, 8.5, 12.5, *LEVELS, 37.5), 0.16, 0.11)
        angle = f.angle
        for z in LEVELS:
            inside = 1.68
            outside = 3.72
            arc_deck(floor, inside, outside, z - 0.10, z, angle - 1.53, angle + 1.53)
            arc_rail(rails, outside, z, angle - 1.53, angle - 0.23, 12)
            arc_rail(rails, outside, z, angle + 0.23, angle + 1.53, 12)
            corners = [f(r, s, 0)[:2] for r, s in ((3.62, -0.75), (5.1, -0.75), (5.1, 0.75), (3.62, 0.75))]
            poly_deck(floor, corners, z - 0.13, z + 0.012)
            for side in (-1, 1):
                beam(steel, f(4.45, side * 0.78, z - 1.6), f(2.48, side * 0.78, z - 0.14), 0.12)
        # Two different faces of the shaft give the climb an intermediate landing.
        parts.ladder(name, "lower", f(8.8, -0.42, 0.05), f(5.0, -0.42, LEVELS[0]), face=tuple(-f.out), mat="galv")
        parts.ladder(name, "upper", f(5.0, 0.42, LEVELS[0]), f(5.0, 0.42, LEVELS[-1]), face=tuple(-f.out), mat="galv")
