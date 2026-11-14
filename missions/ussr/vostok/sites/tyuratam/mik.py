"""The assembly and test building of Site 2 (МИК 2-1), where every R-7 was put together and from which Gagarin's
rocket was rolled out on 11 April: 2.04 km from Site 1's pad on bearing 252 degrees, and the one thing beyond the
fences that stands over the land from the deck.

The CIA's "Missile Assembly and Checkout Facility No 1": 395 by 105 ft and 70 ft high, a shed 30 ft broad along its
west side, three tracks through it (PIC/JR-2/60 p. 16: measured off the U-2's photographs). Accepted on 11 May 1957.
Its place and the bearing of its long axis are today's map's (OpenStreetMap way 173526300) less the extension built on
its north-north-east end in 1973 to 1974.

**Its form beyond that box is estimated**: no photograph of it between 1957 and 1961 was found. It is drawn as the
halls of its kind were: a low double-pitched roof, pilasters between its bays, a band of windows under the eaves,
three tall gates in each end (one a track), a lean-to along the west side. The roof's rise, the bays, the gates, the
windows, the lean-to's length and height and every colour are ours.

Built in Site 1's frame, its node's origin at its middle on the ground, so that the viewer can set it down on its
land. Node: AssemblyBuilding. See ../site-1.md, "On the horizon".
"""

from __future__ import annotations

import math

import sitelib
from site1 import relief
from site1.place import FOOTING, Local
from site1.site import FT, Parts, box, stood

AT = (-1941.0, -641.0)  # its middle, m east and north of Site 1's axis
LENGTH, BREADTH, HEIGHT = 395.0 * FT, 105.0 * FT, 70.0 * FT
AXIS = 28.0  # the bearing of its long axis, degrees
SHED = 30.0 * FT  # the lean-to's breadth
RISE = 2.0  # the ridge over the eaves, m (estimated: a low roof)
BAYS = 20  # along it (estimated: six metres a bay)
GATE = (4.8, 7.5)  # each gate's breadth and height, m (estimated: a rocket on its wagon passes)
SHED_TOP = (8.0, 5.5)  # the lean-to's roof at the wall and at its eave, m (estimated)


def build(parts: Parts) -> None:
    if not stood(
        "Assembly and test building of Site 2 (MIK 2-1)",
        since="1957-05",
        confidence="documented",
        source="PIC/JR-2/60 p. 16 (395 by 105 by 70 ft, measured); accepted 11 May 1957; OpenStreetMap way 173526300 less its extension of 1973-74",
    ):
        return
    g = "AssemblyBuilding"
    base = relief.ground(*AT)
    parts.node(
        g,
        origin=(*AT, base),
        label="Assembly and test building",
        about=(
            "Where the rocket was put together lying down, and from where it was rolled out to the pad on the morning of 11 April: "
            "two kilometres by rail. 395 by 105 ft and 70 ft high, with three tracks through it (the CIA, measured off a U-2's "
            "photographs). Its roof, windows, gates and colour are estimated: no photograph of it from those years was found."
        ),
    )
    k = Local()
    wall, roof, glass, steel, bars = k("plaster"), k("felt"), k("void"), k("blast"), k("frame")
    a, b = LENGTH / 2, BREADTH / 2
    ridge, eave = HEIGHT, HEIGHT - RISE
    pitch = RISE / b
    sitelib.solid(wall, [[(x, -b, -FOOTING), (x, b, -FOOTING), (x, b, eave), (x, 0.0, ridge), (x, -b, eave)] for x in (-a, a)])
    over, thick = 0.8, 0.3
    for s in (-1, 1):  # each slope: a slab from beyond the eave up to the ridge
        ye, ze = s * (b + over), eave - over * pitch
        sitelib.solid(roof, [[(x, ye, ze), (x, 0.0, ridge), (x, 0.0, ridge + thick), (x, ye, ze + thick)] for x in (-a - over, a + over)])
    box(roof, (-a - over, -0.15, ridge + thick - 0.02), (a + over, 0.15, ridge + thick + 0.1))
    # the lean-to along the west side (+Y here), a bay short of each end
    step = LENGTH / BAYS
    xa, xb = -a + step, a - step
    top, low = SHED_TOP
    fall = (top - low) / (SHED + 0.2)
    sitelib.solid(wall, [[(x, b - 0.2, -FOOTING), (x, b + SHED, -FOOTING), (x, b + SHED, low), (x, b - 0.2, top)] for x in (xa, xb)])
    y0, y1 = b + 0.02, b + SHED + 0.5
    z0, z1 = top - (y0 - b + 0.2) * fall, top - (y1 - b + 0.2) * fall
    sitelib.solid(roof, [[(x, y0, z0), (x, y1, z1), (x, y1, z1 + 0.2), (x, y0, z0 + 0.2)] for x in (xa - 0.4, xb + 0.4)])
    for i in range(1, BAYS - 1, 3):  # its doors, and a window between each two
        x = -a + (i + 0.5) * step
        box(steel, (x - 1.5, b + SHED - 0.05, 0.0), (x + 1.5, b + SHED + 0.08, 3.2))
        box(glass, (x + step - 1.2, b + SHED - 0.05, 2.0), (x + step + 1.2, b + SHED + 0.05, 3.6))
    # pilasters between the bays, and the band of windows under the eaves
    sill, head = eave - 5.5, eave - 1.5
    for i in range(BAYS + 1):
        x = -a + i * step
        box(wall, (x - 0.45, -b - 0.4, -FOOTING), (x + 0.45, -b + 0.1, eave - 0.6))
        if xa - 0.5 < x < xb + 0.5:
            box(wall, (x - 0.45, b - 0.1, top + 0.5), (x + 0.45, b + 0.4, eave - 0.6))
        else:
            box(wall, (x - 0.45, b - 0.1, -FOOTING), (x + 0.45, b + 0.4, eave - 0.6))
    for i in range(BAYS):
        x = -a + i * step
        for s in (-1, 1):
            ya, yb = sorted((s * (b + 0.06), s * (b - 0.05)))
            box(glass, (x + 0.9, ya, sill), (x + step - 0.9, yb, head))
            for n in range(1, 3 if sitelib.fine() else 1):  # its mullions
                xm = x + 0.9 + (step - 1.8) * n / 3
                ya, yb = sorted((s * (b + 0.1), s * (b - 0.02)))
                box(bars, (xm - 0.06, ya, sill - 0.1), (xm + 0.06, yb, head + 0.1))
    # three gates in each end, one a track
    w, h = GATE
    for s in (-1, 1):
        for y in (-8.0, 0.0, 8.0):
            xs = sorted((s * (a - 0.05), s * (a + 0.12)))
            box(steel, (xs[0], y - w / 2, 0.0), (xs[1], y + w / 2, h))
            xs = sorted((s * (a - 0.05), s * (a + 0.2)))
            box(bars, (xs[0], y - w / 2 - 0.3, h), (xs[1], y + w / 2 + 0.3, h + 0.4))
            xs = sorted((s * (a + 0.1), s * (a + 0.16)))
            box(bars, (xs[0], y - 0.05, 0.02), (xs[1], y + 0.05, h - 0.05))
    k.put(parts, g, (*AT, base), 90.0 - AXIS)


def summary() -> str:
    return (
        f"assembly building {LENGTH:.1f} by {BREADTH:.1f} by {HEIGHT:.1f} m, {math.hypot(*AT):.0f} m off on bearing "
        f"{math.degrees(math.atan2(AT[0], AT[1])) % 360:.0f}, its foot {relief.ground(*AT):+.2f} m from the deck's level"
    )
