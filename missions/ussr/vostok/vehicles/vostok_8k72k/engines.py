"""The RD-107 and RD-108: one design, four fixed chambers on one turbopump, with two steering
chambers (RD-107, a strap-on's) or four (RD-108, the core's).

Engine stations are millimetres above the main nozzles' exit plane. The chamber's outline and
every fitting are drawn from photographs of museum engines and of the vehicle from below; nothing
here is from a drawing (../vostok-8k72k.md).
"""

from __future__ import annotations

import math

from mathutils import Matrix

from srlib import interior

from .common import CHAMBER_AT, EXIT_R, STEER_EXIT_R, Local, at, facing

# a main chamber, outside: (radius, station) from the exit up over the throat to the head
BELL = [
    (EXIT_R, 0),
    (352, 110),
    (328, 320),
    (288, 560),
    (238, 790),
    (182, 1000),
    (132, 1160),
    (104, 1262),
    (116, 1330),
    (166, 1400),
    (215, 1470),
    (215, 1930),
    (190, 2010),
    (120, 2068),
    (0, 2090),
]
WALL = 14.0  # the double wall, with the coolant's passages in it
THROAT = 7  # index of the throat in BELL
HEAD = 2090.0
# a steering chamber, the same way
STEER = [(STEER_EXIT_R, 0), (99, 70), (82, 200), (58, 330), (40, 410), (46, 450), (76, 492), (76, 640), (56, 684), (0, 696)]
STEER_PIVOT = 560.0  # its trunnions, above its own exit
STEER_DROP = 60.0  # how far its exit hangs above the main nozzles' plane
PUMP_Z = 2500.0  # the turbopump's shaft


def bell_r(z: float) -> float:
    return next(r0 + (r1 - r0) * (z - z0) / (z1 - z0) for (r0, z0), (r1, z1) in zip(BELL, BELL[1:]) if z0 <= z <= z1)


def chamber(bells: Local, liners: Local, x: float, y: float) -> None:
    """One main chamber: a real bell with a throat, open below, so it can be looked up."""
    m = at(x, y, 0)
    bells.lathe(BELL, 40, m)
    inner = [(r - WALL, z) for r, z in BELL[: THROAT + 4]] + [(BELL[THROAT + 3][0] - WALL, 1900), (0, 1900)]  # up to the injector's face
    liners.lathe(inner, 40, m, flip=True)
    bells.lathe([(EXIT_R - WALL, 0), (EXIT_R, 0)], 40, m)  # the lip
    for z in (150, 520, 880):  # stiffening hoops round the bell
        r = bell_r(z)
        bells.lathe([(r - 2, z - 26), (r + 13, z - 12), (r + 13, z + 12), (r - 2, z + 26)], 40, m)
    bells.lathe(
        [(BELL[1][0] - 2, 60), (BELL[1][0] + 34, 78), (BELL[1][0] + 34, 142), (BELL[1][0] - 4, 160)], 40, m
    )  # the fuel's manifold at the exit


def steering(bells: Local, liners: Local, steel: Local, x: float, y: float, az: float) -> None:
    """A steering chamber hung in its trunnions, which lie along the direction `az` (radians)."""
    m = at(x, y, STEER_DROP)
    bells.lathe(STEER, 20, m)
    liners.lathe([(r - 6, z) for r, z in STEER[:5]] + [(STEER[5][0] - 6, 620), (0, 620)], 20, m, flip=True)
    bells.lathe([(STEER_EXIT_R - 6, 0), (STEER_EXIT_R, 0)], 20, m)
    c, s = math.cos(az), math.sin(az)
    z = STEER_DROP + STEER_PIVOT
    steel.tube((x - 150 * c, y - 150 * s, z), (x + 150 * c, y + 150 * s, z), 26, 12)  # trunnions: the propellants come in through them
    for k in (-1, 1):  # the yoke's two cheeks, up to the frame above
        steel.box((36, 70, 330), at(x + k * 150 * c, y + k * 150 * s, z + 130) @ Matrix.Rotation(az, 4, "Z"))
    steel.tube((x - 168 * c, y - 168 * s, z + 290), (x + 168 * c, y + 168 * s, z + 290), 30, 10)


def build(E: Matrix, node, M: dict, prefix: str, steer: list[tuple[float, float, float]], feed_top: float) -> None:
    """Build one engine in the frame `E` (origin on its axis at the main exits' plane). `steer` is each steering
    chamber's place and trunnion direction; `feed_top` is the station its propellant ducts rise to."""
    bells, liners, steel, pipes = Local(E), Local(E), Local(E), Local(E)
    for sx in (-1, 1):
        for sy in (-1, 1):
            chamber(bells, liners, sx * CHAMBER_AT, sy * CHAMBER_AT)
    for x, y, az in steer:
        steering(bells, liners, steel, x, y, az)
    bells.build(f"{prefix}_Bells", M["bell"], node, sharp_angle=35)
    liners.build(f"{prefix}_Liners", M["liner"], node, sharp_angle=35)
    # the frame that takes the thrust: a ring over the four heads, tied to each
    ring = 2180.0
    steel.lathe([(760, ring - 30), (800, ring - 30), (800, ring + 30), (760, ring + 30), (760, ring - 30)], 32)
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * CHAMBER_AT, sy * CHAMBER_AT
            steel.tube((x * 1.2, y * 1.2, HEAD - 110), (sx * 552, sy * 552, ring), 32, 10)
            steel.tube((x * 0.55, y * 0.55, 1500), (x * 1.0, y * 1.0, 1500), 22, 8)  # ties between the chambers
    if interior():
        # the turbopump lies across the top, between the heads: oxygen pump, turbine, fuel pump on one shaft
        z = PUMP_Z
        steel.lathe(
            [(0, -520), (150, -520), (215, -470), (215, -250), (150, -200), (150, -90), (250, -70), (250, 70), (150, 90)],
            28,
            facing((0, 0, z), (1, 0, 0)),
        )
        steel.lathe([(150, 90), (150, 200), (205, 250), (205, 430), (150, 480), (0, 480)], 28, facing((0, 0, z), (1, 0, 0)))
        steel.ball((0, 340, z + 190), 150, 20, 10)  # the gas generator, where the peroxide becomes steam
        steel.tube((0, 340, z + 60), (0, 150, z), 55, 12)
        # steam from the turbine leaves through two ducts down the middle, between the chambers
        for k in (-1, 1):
            pipes.loft(
                [(0, k * 60, z - 60), (0, k * 150, z - 420), (0, k * 150, 1300), (0, k * 150, 700)],
                [(70, 70)] * 4,
                14,
                ref=(1, 0, 0),
                caps=(False, True),
            )
        # the two main ducts down from the tanks, and a branch of each to every chamber's head
        pipes.tube((0, 0, z + 150), (0, 0, feed_top - 400), 125, 20)  # the oxygen's pipe comes down the block's axis
        pipes.tube((330, 0, z + 150), (330, 0, feed_top - 240), 95, 16)
        for sx in (-1, 1):
            for sy in (-1, 1):
                x, y = sx * CHAMBER_AT, sy * CHAMBER_AT
                pipes.loft(
                    [
                        (-215 + sx * 75, sy * 120, z - 110),
                        (sx * 190, sy * 290, z - 190),
                        (sx * 390, sy * 410, z - 185),
                        (x, y, HEAD + 130),
                        (x, y, HEAD - 10),
                    ],
                    [(50, 50)] * 5,
                    12,
                    ref=(sx, -sy, 0),
                )
                # fuel goes down the outside of each chamber to its manifold at the exit, then up through the wall
                pipes.loft(
                    [
                        (205, sy * 110, z - 60),
                        (sx * 630, sy * 650, 2000),
                        (sx * 660, sy * 660, 1500),
                        (sx * 716, sy * 716, 420),
                        (sx * 722, sy * 722, 112),
                    ],
                    [(40, 40)] * 5,
                    10,
                    ref=(sx, -sy, 0),
                )
        for x, y, az in steer:  # each steering chamber's two lines, from the pump to its trunnions
            c, s = math.cos(az), math.sin(az)
            for k in (-1, 1):
                p = (x + k * 150 * c, y + k * 150 * s, STEER_DROP + STEER_PIVOT)
                pipes.loft(
                    [p, (p[0] * 0.92, p[1] * 0.92, 1500), (p[0] * 0.55, p[1] * 0.55, 2150), (x * 0.2 - k * 90 * s, y * 0.2 + k * 90 * c, z - 50)],
                    [(22, 22)] * 4,
                    8,
                    ref=(-s, c, 0),
                )
        pipes.build(f"{prefix}_Pipes", M["pipe"], node, sharp_angle=None)
    steel.build(f"{prefix}_Frame", M["engine"], node, sharp_angle=35)
