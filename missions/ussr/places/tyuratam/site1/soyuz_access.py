"""Soyuz's paired service towers. The arrangement follows NASA S75-32339. Dimensions in metres,
estimated against the photographed vehicle. The open steel frames and decks are shown closed for access.
"""

from .site import Parts, beam
from .steel import Turned, arc_deck, arc_rail, box_truss, poly_deck

LEVELS = (17.1, 19.8, 22.5, 25.2, 27.9, 30.6, 33.3, 36.0)


def boarding_lift(parts: Parts, frame: str) -> None:
    """A reconstruction of the crew lift seen in the Soyuz 3 film. The car travels along
    guides to the boarding platform. Its dimensions, side of the tower and travel are estimates."""
    f = Turned(270)
    foot, head, low, high = 11.7, 4.58, 0.13, LEVELS[-2]
    delta = f(head - foot, 0, high - low)
    name = "SoyuzCrewLift"
    parts.node(
        name,
        frame,
        origin=f(foot, 0, low),
        lift=1,
        stops=[[0, 0, 0], [delta[0], delta[2], -delta[1]]],
        stop_names=["the apron", "the boarding platform"],
    )
    car, rails = parts(name, "deck"), parts(name, "galv")
    outline = [f(foot + x, y, 0)[:2] for x, y in ((-0.86, -0.76), (0.86, -0.76), (0.86, 0.76), (-0.86, 0.76))]
    poly_deck(car, outline, low - 0.09, low)
    for side in (-1, 1):
        y = side * 0.73
        for x in (-0.82, 0.82):
            beam(rails, f(foot + x, y, low + 0.01), f(foot + x, y, low + 2.28), 0.055)
        for h in (0.49, 1.02, 2.22):
            beam(rails, f(foot - 0.83, y, low + h), f(foot + 0.83, y, low + h), 0.042)
        beam(parts(frame, "green"), f(foot, side * 0.89, low), f(head - 0.45, side * 0.89, high + 2.1), 0.10)


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
            if base == "SouthServiceTower" and z == LEVELS[-2]:
                # The crew-lift doorway meets the outside of the arc at 45 degrees.
                arc_rail(rails, outside, z, angle + 0.23, angle + 0.54, 4)
                arc_rail(rails, outside, z, angle + 1.03, angle + 1.53, 5)
                boarding_lift(parts, name)
            else:
                arc_rail(rails, outside, z, angle + 0.23, angle + 1.53, 12)
            corners = [f(r, s, 0)[:2] for r, s in ((3.62, -0.75), (5.1, -0.75), (5.1, 0.75), (3.62, 0.75))]
            poly_deck(floor, corners, z - 0.13, z + 0.012)
            for side in (-1, 1):
                beam(steel, f(4.45, side * 0.78, z - 1.6), f(2.48, side * 0.78, z - 0.14), 0.12)
        # Two different faces of the shaft give the climb an intermediate landing.
        parts.ladder(name, "lower", f(8.8, -0.42, 0.05), f(5.0, -0.42, LEVELS[0]), face=tuple(-f.out), mat="galv")
        parts.ladder(name, "upper", f(5.0, 0.42, LEVELS[0]), f(5.0, 0.42, LEVELS[-1]), face=tuple(-f.out), mat="galv")
