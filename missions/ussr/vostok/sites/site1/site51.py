"""Site 51, the R-9's first pad, 415 m north-north-west of Site 1's rocket: what of it is described.

The CIA called it "Launch Site 2-A" and found it new on the KEYHOLE photographs of 1961 (PIC/JR-8/61, August 1961,
pp. 13-14; the photographs' date is redacted): "an octagonal concrete pad about 190 by 120 feet", its long axis
north-west and south-east; a road from the west; a rail spur ending at a building 50 ft square south of the pad;
road and rail on a fan-shaped bank some 1,000 ft long and 350 ft wide at its east end. The first R-9 left it on
9 April 1961 (and failed) and the next on 21 April (ru.wikipedia, Р-9А; Zak, RussianSpaceWeb): so the pad stood on
the 12th, and **no rocket stood on it**.

Only what is described is built: the pad, the square building, the spur's last rails. The launch table, whatever
mast or erector served it, and everything else on the pad are not described in anything read and are left out.
The bank is drawn only under the pad (its height is not given: a metre is taken), and the road and the rest of
the spur are the land's to paint. The building's height, walls and doors are estimated.

Node: Site51 (the place). Its place on the land is the land's height at its middle (place.settle).
"""

from __future__ import annotations

import math

import sitelib

from .place import FLOOR, FOOTING, Local
from .site import FT, GAUGE, GROUND, Parts, box, stood

AT = (-101.0, 403.0)  # the pad's middle, m east and north of Site 1's axis: 415 m on 346 degrees (PIC/JR-8/61; today's map)
PAD = (190.0 * FT, 120.0 * FT)  # along its long axis, across it
HEADING = 135.0  # the long axis, degrees anticlockwise from east: north-west and south-east
BANK = 1.0  # the pad's top over the land, m (estimated: "low")
HUT = 50.0 * FT  # the square building
HUT_AT = (-101.0, 356.0)  # "south of the pad", at the spur's end (its distance from the pad estimated)
HUT_EAVE = 4.5  # estimated


def build(parts: Parts) -> None:
    if not stood(
        "Site 51: an octagonal pad, a building 50 ft square, a rail spur",
        since="1961-04",
        confidence="documented",
        source="PIC/JR-8/61 (August 1961), pp. 13-14: new on the photographs of 1961; the first R-9 was launched from it on 9 April 1961 "
        "(ru.wikipedia, Р-9А; Zak, RussianSpaceWeb). When it was finished is not known: it stood by 9 April",
    ):
        return
    g = "Site51"
    parts.node(
        g,
        label="Site 51",
        about=(
            "The first pad of the R-9, Korolev's second intercontinental missile, 415 m from Gagarin's rocket: an octagonal concrete "
            "pad 190 by 120 ft, a building 50 ft square where its rail spur ended (the CIA, off photographs of 1961). An R-9 left it "
            "three days before this morning, on 9 April, and failed; the next went on the 21st. No rocket stood on it on the 12th. What "
            "served a rocket here is not described and is not built."
        ),
    )
    k = Local()
    conc, earth = k("concrete/pad"), k("earth")
    a, b = PAD[0] / 2, PAD[1] / 2
    c = b * 0.45  # how much of each corner is cut off (estimated: "octagonal")
    octagon = [(-a + c, -b), (a - c, -b), (a, -b + c), (a, b - c), (a - c, b), (-a + c, b), (-a, b - c), (-a, -b + c)]
    top = GROUND + BANK
    sitelib.slab(conc, octagon, top - 0.3, top)
    sitelib.slab(earth, sitelib.offset_poly(octagon, 0.4), GROUND - FOOTING, top - 0.3, spread=2.2, soft=True)
    if sitelib.fine():  # its joints: a line every 6 m along it and one down its middle
        joint = k("joint")
        for i in range(-4, 5):
            x = i * 6.0
            half = b if abs(x) < a - c else b - (abs(x) - (a - c))
            joint.add(
                [
                    (x - 0.03, -half + 0.2, top + 0.02),
                    (x + 0.03, -half + 0.2, top + 0.02),
                    (x + 0.03, half - 0.2, top + 0.02),
                    (x - 0.03, half - 0.2, top + 0.02),
                ],
                [(0, 1, 2, 3)],
            )
        joint.add(
            [(-a + 0.3, -0.03, top + 0.02), (a - 0.3, -0.03, top + 0.02), (a - 0.3, 0.03, top + 0.02), (-a + 0.3, 0.03, top + 0.02)], [(0, 1, 2, 3)]
        )
    k.put(parts, g, (*AT, 0.0), HEADING, smooth=("earth",))
    # the building at the spur's end, and the spur's last 40 m of rails coming to it from the west
    hx, hy = HUT_AT
    rect = (hx - HUT / 2, hy - HUT / 2, hx + HUT / 2, hy + HUT / 2)
    sitelib.building(
        parts,
        g,
        "hut",
        rect,
        GROUND + HUT_EAVE,
        {
            3: [(5.0, 9.0, FLOOR, FLOOR + 3.6, "shut")],
            0: [(3.0, 4.4, FLOOR + 1.2, FLOOR + 2.4, "blind"), (10.0, 11.4, FLOOR + 1.2, FLOOR + 2.4, "blind")],
        },
        floor=FLOOR,
        footing=-FOOTING,
        mat="plaster",
        wall=0.4,
    )
    sitelib.flat_roof(parts, g, "hut", rect, GROUND + HUT_EAVE, over=0.35, mat="plaster")
    steel, ties = parts(g, "rail"), parts(g, "tie/spur")
    half = GAUGE / 2 + sitelib.RAIL_HEAD * sitelib.inch() / 2
    x0, x1 = rect[0] - 40.0, rect[0] - 0.3
    for s in (-1, 1):
        sitelib.rail(steel, [(x0, hy + s * half, GROUND + 0.3), (x1, hy + s * half, GROUND + 0.3)])
    n = round((x1 - x0) / 0.6)
    for i in range(n + 1 if sitelib.fine() else 0):
        x = x0 + (x1 - x0) * i / n
        box(ties, (x - 0.12, hy - 1.35, GROUND - 0.05), (x + 0.12, hy + 1.35, GROUND + 0.16))


def summary() -> str:
    return f"Site 51 at {math.hypot(*AT):.0f} m: pad {PAD[0]:.1f} by {PAD[1]:.1f} m, building {HUT:.1f} m square"
