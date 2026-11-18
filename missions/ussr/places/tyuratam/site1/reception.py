"""The send-off at the bus on 11 August 1962. Kamanin names four men who greeted Nikolayev
and says more than a dozen others also wanted to. On the 12th he says only that the preparations
differed little. The number shown, clothes and positions are estimates, not portraits of the named men.
"""

import math
import random

import ground_party as gp

from .august import BUS_DOOR
from .site import GROUND, Parts, stood


def build(parts: Parts) -> None:
    if not stood(
        "People meeting the cosmonaut at the bus",
        since="1962-08-11",
        until="1962-08-12",
        confidence="estimated",
        source=(
            "Kamanin, 12 August 1962: the gathering documented on the 11th, assumed from his comparison on the 12th. "
            "Clothes taken from the summer of 1961."
        ),
    ):
        return
    rng = random.Random(19620811)
    walkers = gp.Walkers("Reception")
    # Two loose rows south of the parked bus, leaving a passage along its door. This patch
    # of apron is visible in the 1961 film. No 1962 source sets each person's place.
    spots = []
    for i in range(17):
        row, col = divmod(i, 9)
        x = BUS_DOOR[0] - 10.2 + 1.35 * col + 0.55 * row + rng.uniform(-0.14, 0.14)
        y = BUS_DOOR[1] - 3.7 - 1.6 * row + rng.uniform(-0.32, 0.32)
        angle = math.degrees(math.atan2(BUS_DOOR[1] - y, BUS_DOOR[0] - x))
        dress = gp.summer_officer() if i in (2, 5, 11, 13) else gp.summer_shirt(rng.choice(("shirt-white", "shirt-cream", "shirt-blue")))
        person = gp.Person(dress, stature=rng.uniform(165, 183), build=rng.uniform(0.94, 1.11), turn=rng.uniform(-15, 15))
        walkers.stand(person, (x, y, GROUND), angle)
        spots.append((x, y))
    origin = (sum(x for x, _ in spots) / len(spots), sum(y for _, y in spots) / len(spots), 0.0)
    node = parts.node(
        "Reception",
        None,
        origin,
        label="At the bus",
        about="Kamanin describes Nikolayev's send-off and compares Popovich's preparations the next day. Clothing and places are estimated.",
    )
    walkers.build("Reception_People", node, origin, gp.materials(), parent_at=origin)
