"""The assembly and test building of Site 2 (МИК 2-1), where every R-7 was put together and from which Gagarin's
rocket was rolled out on 11 April: 2.04 km from Site 1's pad on bearing 252 degrees, and the one thing beyond the
fences that stands over the land from the deck.

The CIA's "Missile Assembly and Checkout Facility No 1": 395 by 105 ft and 70 ft high, a shed 30 ft broad along its
west side, three tracks through it (PIC/JR-2/60 p. 16: measured off the U-2's photographs). Accepted on 11 May 1957.
Its place and the bearing of its long axis are today's map's (OpenStreetMap way 173526300) less the extension built on
its north-north-east end in 1973 to 1974.

The CIA's plan of the place (PIC/JR-2/60 Figure 8, a line drawing; some 1.3 ft a pixel as scanned) draws it with the
shed as a strip along the whole of its west side, and three tracks through it some 40 ft apart, the middle one on its
long axis within the drawing's few feet: today's map has one track through it, on its axis (OpenStreetMap way
676662204), which is the one the rocket was rolled out on. So: the shed is as long as the building, and there are
three gates in each end, 40 ft apart, the middle one on the axis. The plan also draws a small rectangle, some 53 by
31 ft, inside the outline near the north-north-east end, on the axis: what it is (something on the roof, a part that
stood higher) is not said, and it is not built.

The middle gate is the one the assembled rocket left by, lying on its erector: the rocket is 10.3 m across its four
boosters (../vehicles/vostok-8k72k.md), so that gate is broader than that (derived); its height, and the two beside
it, a wagon's gates, are estimated.

**Its form beyond that is estimated**: no photograph of it between 1957 and 1961 was found. It is drawn as the halls
of its kind were: a low double-pitched roof, pilasters between its bays, a band of windows under the eaves, a lean-to
along the west side. The roof's rise, the bays, the windows, the lean-to's height and every colour are ours.

It is seen from Site 1 two kilometres off, so its levels of detail are few: in full, the windows' mullions and the
gates' frames; at the second level neither; at the third no pilasters either. Its outline, its windows, its
gates and the lean-to's doors are the same at all three (each side's windows drawn as one band were over a thousand
pixels' difference at the size the third level comes in at, and the lean-to left bare some 650:
model/1961-04.lod.json has what was measured of the levels as they are).

Built in Site 1's frame, its node's origin at its middle on the ground, so that the viewer can set it down on its
land. Node: AssemblyBuilding. See ../site-1.md, "On the horizon".
"""

from __future__ import annotations

import math

import sitelib
import srlib
from site1 import relief
from site1.place import FOOTING, Local
from site1.site import FT, Parts, box, stood

AT = (-1941.0, -641.0)  # its middle, m east and north of Site 1's axis
LENGTH, BREADTH, HEIGHT = 395.0 * FT, 105.0 * FT, 70.0 * FT
AXIS = 28.0  # the bearing of its long axis, degrees
SHED = 30.0 * FT  # the lean-to's breadth
RISE = 2.0  # the ridge over the eaves, m (estimated: a low roof)
BAYS = 20  # along it (estimated: six metres a bay)
# The gates: the tracks' spacing (scaled off PIC/JR-2/60 Figure 8: good to a few feet); the middle gate's breadth and
# height, m (derived: the rocket on its erector is 10.3 m across its boosters; the height estimated); a side gate's
# (estimated: a railway wagon's)
TRACKS = 40.0 * FT
GATE = (11.5, 10.5)
SIDE_GATE = (4.8, 6.5)
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
            "two kilometres by rail. 395 by 105 ft and 70 ft high, a shed along its west side and three tracks through it (the "
            "CIA, measured off a U-2's photographs). The middle gate is as broad as the rocket on its erector needed; its roof, "
            "its windows, the gates' heights and its colour are estimated: no photograph of it from those years was found."
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
    # what each level of detail draws (the building is seen from two kilometres: see above)
    full, far = srlib.DETAIL >= 1.0, srlib.DETAIL < 0.5
    # the lean-to along the whole of the west side (+Y here): the CIA's plan draws it from end to end
    step = LENGTH / BAYS
    xa, xb = -a + 0.3, a - 0.3
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
    for i in range(BAYS + 1) if not far else ():
        x = -a + i * step
        box(wall, (x - 0.45, -b - 0.4, -FOOTING), (x + 0.45, -b + 0.1, eave - 0.6))
        box(wall, (x - 0.45, b - 0.1, top + 0.5), (x + 0.45, b + 0.4, eave - 0.6))
    for s in (-1, 1):
        ya, yb = sorted((s * (b + 0.06), s * (b - 0.05)))
        for i in range(BAYS):
            x = -a + i * step
            box(glass, (x + 0.9, ya, sill), (x + step - 0.9, yb, head))
            for n in range(1, 3) if full else ():  # its mullions
                xm = x + 0.9 + (step - 1.8) * n / 3
                ma, mb = sorted((s * (b + 0.1), s * (b - 0.02)))
                box(bars, (xm - 0.06, ma, sill - 0.1), (xm + 0.06, mb, head + 0.1))
    # three gates in each end, a track through each: the great one on the axis, a wagon's either side
    for s in (-1, 1):
        for y, (w, h) in ((-TRACKS, SIDE_GATE), (0.0, GATE), (TRACKS, SIDE_GATE)):
            xs = sorted((s * (a - 0.05), s * (a + 0.12)))
            box(steel, (xs[0], y - w / 2, 0.0), (xs[1], y + w / 2, h))
            if not full:
                continue
            xs = sorted((s * (a - 0.05), s * (a + 0.2)))  # its lintel, and where its two leaves meet
            box(bars, (xs[0], y - w / 2 - 0.3, h), (xs[1], y + w / 2 + 0.3, h + 0.4))
            xs = sorted((s * (a + 0.1), s * (a + 0.16)))
            box(bars, (xs[0], y - 0.05, 0.02), (xs[1], y + 0.05, h - 0.05))
    k.put(parts, g, (*AT, base), 90.0 - AXIS)


def summary() -> str:
    return (
        f"assembly building {LENGTH:.1f} by {BREADTH:.1f} by {HEIGHT:.1f} m, {math.hypot(*AT):.0f} m off on bearing "
        f"{math.degrees(math.atan2(AT[0], AT[1])) % 360:.0f}, its foot {relief.ground(*AT):+.2f} m from the deck's level"
    )
