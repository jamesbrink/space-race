"""What stood on the deck that was not a structure: the crew's ramp to the erector's foot and the steps on its other
side, the guard's shelter, the white fence, the floodlights down both edges and the windsock.

All of it is read off photographs of the deck in March 1965 and is estimated: S65-20994 (the red grated ramp the
crew walked up on the morning of the flight, the blue-grey deck), S65-20641 (the shelter, the picket fence, the lamps
on their poles, at the rehearsal), S65-21881 (the windsock). ../lc-19.md.
"""

from __future__ import annotations

from srlib import FT

from .erector import BASE, XS
from .site import (
    HINGE,
    STAND_SOUTH,
    STAND_Y,
    P,
    Parts,
    beam,
    box,
    building,
    flat_roof,
    handrail,
    lamp_head,
    plate,
    stair_rails,
    stairs,
)

RAMP_Y = (6.2, 10.0)  # the crew's ramp: its two edges, east of the erector's middle, toward the express elevator
RAMP_RUN = 11.0
SHELTER = (22.0, 24.0, 27.5, 29.5)  # the guard's shelter: x0, y0, x1, y1
FENCE = ((30.0, 28.5), (62.0, 28.5))  # the picket fence, between the two erectors' ground
LAMPS_EVERY = 34.0
PANE = (1.0, 4.5, 3.4, 6.4, "blind")  # the shelter's window, in each long wall


def build(parts: Parts) -> None:
    g = "DeckFittings"
    parts.node(g, label="On the deck")
    red, grate, rails = parts(g, "red", True), parts(g, "reddeck"), parts(g, "red/rails", True)

    # ---- the crew's ramp: a red grating rising three feet to a landing at the erector's foot, railed (S65-20994)
    ya, yb = RAMP_Y
    top = XS - 0.75  # the landing reaches under the erector's south face to its foot's floor
    x0, x1 = HINGE[0] + 1.5, HINGE[0] + 1.5 + RAMP_RUN
    box(grate, (top, ya, BASE - 0.22), (x0, yb, BASE))
    plate(grate, [(x0, ya, BASE - 0.1), (x1, ya, -0.1), (x1, yb, -0.1), (x0, yb, BASE - 0.1)], 0.2)
    for y in (ya, yb):  # its stringers, the posts under the landing, and rails that follow the slope
        beam(red, (x0, y, BASE - 0.35), (x1 - 0.6, y, 0.0), 0.35)
        for x in (top + 0.3, x0):
            beam(red, (x, y, 0.0), (x, y, BASE - 0.2), 0.3)
        for k in range(5):
            x, z = x0 + (x1 - x0) * k / 4, BASE * (1 - k / 4)
            beam(rails, (x, y, z), (x, y, z + 3.5), 0.16)
        for h in (3.5, 1.75):
            beam(rails, (x0, y, BASE + h), (x1, y, h), 0.13)
    # (the landing's east side is railed; its west is open to the foot's floor, its north to the elevator)
    handrail(rails, [(top + 0.2, yb, BASE), (x0, yb, BASE)])

    # ---- on the west side, steps up to the foot's other floor, for the service elevator and the stairs (ours: no
    # photograph read shows how that side was reached)
    stairs(parts(g, "reddeck/steps"), (HINGE[0] + 5.5, -8.0, 0.0), (HINGE[0] + 1.5, -8.0, BASE), 3.4)
    stair_rails(rails, (HINGE[0] + 5.5, -8.0, 0.0), (HINGE[0] + 1.5, -8.0, BASE), 3.4)
    box(grate, (top, -9.9, BASE - 0.22), (HINGE[0] + 1.5, -6.1, BASE))
    for y in (-9.9, -6.1):
        for x in (top + 0.3, HINGE[0] + 1.5):
            beam(red, (x, y, 0.0), (x, y, BASE - 0.2), 0.3)
    handrail(rails, [(top + 0.2, -6.0, BASE), (HINGE[0] + 1.45, -6.0, BASE)])

    # ---- the guard's shelter by the erector's foot: a booth with a window each way, its door shut (S65-20641)
    s = "DeckFittings_Shelter"
    parts.node(s, g, ((SHELTER[0] + SHELTER[2]) / 2, (SHELTER[1] + SHELTER[3]) / 2, 0.0), label="Guard's shelter")
    building(
        parts, s, "shelter", SHELTER, 7.6,
        {0: [PANE], 2: [PANE], 3: [(1.5, 4.2, 0.05, 6.6, "shut")], 1: [(1.2, 4.3, 3.4, 6.4, "blind")]},
        floor=0.05, footing=0.0, mat="sign", wall=0.25,
    )  # fmt: skip
    flat_roof(parts, s, "shelter", SHELTER, 7.6, over=0.6, mat="sign")

    # ---- the white picket fence (S65-20641, on the deck's east side)
    (fx0, fy), (fx1, _) = FENCE
    wood = parts(g, "picket")
    for z in (1.0, 2.6):
        box(wood, (fx0, fy - 0.06, z - 0.15), (fx1, fy + 0.06, z + 0.15))
    k = 0
    x = fx0
    while x <= fx1 + 1e-6:
        if k % 8 == 0:
            box(wood, (x - 0.17, fy - 0.17, 0.0), (x + 0.17, fy + 0.17, 3.6))
        else:
            box(wood, (x - 0.13, fy - 0.12, 0.25), (x + 0.13, fy - 0.06, 3.3))
        x += 0.5
        k += 1

    # ---- floodlights on poles along both edges of the deck (S65-20641, S65-49568: a lamp to a pole)
    f = "Floodlights"
    parts.node(f, label="Floodlights")
    poles, lamps = parts(f, "galv", True), parts(f, "lamp")
    parts.mark(f, "lamp", lens_out=1)
    x = HINGE[0] + 14.0
    while x < STAND_SOUTH - 5.0:
        for side, y in ((-1, STAND_Y[0] + 1.0), (1, STAND_Y[1] - 1.0)):
            poles.tube(P(x, y, 0.4), P(x, y, 17.0), 0.14 * FT, 8)
            lamp_head(poles, lamps, (x, y - side * 0.5, 17.6), (-0.55 if x < 80 else 0.0, -side * 0.6, -0.6), 0.75)
        x += LAMPS_EVERY

    # ---- the windsock, on its pole at the deck's east edge (S65-21881; orange)
    wx, wy = 40.0, STAND_Y[1] - 1.2
    poles.tube(P(wx, wy, 0.4), P(wx, wy, 21.0), 0.1 * FT, 8)
    sock = parts(g, "wind", True)
    sock.lathe([(0.75 * FT, 0.0), (0.3 * FT, 5.5 * FT)], 10, matrix=_along(wx, wy, 20.3))


def _along(x: float, y: float, z: float):
    """A frame at (x, y, z) whose +Z lies down the wind: from the south-east that morning (140 degrees: the station's
    record), which in this site's frame is toward -X and a little -Y, drooping."""
    from mathutils import Vector  # noqa: PLC0415

    from srlib import frame  # noqa: PLC0415

    return frame(tuple(P(x, y, z)), tuple(Vector((-0.82, -0.57, -0.25)).normalized()))
