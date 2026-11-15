"""The concrete storage bunker of three bays, west of the command bunker: node `StorageBunker`.

What is recorded of it (HTA/JR-4/58 and PIC/JR-2/60, measured off the U-2's photographs of 1957 and 1959):
"approximately 100 feet west of the control bunker"; "three storage bays, each 35 feet square, with two earth
fills, each 35 feet wide, separating the three bays"; a roof of one height (the figure redacted); "each bay has a
roof-vent and is served by a revetted concrete drive with wide-angle turns"; "the face of the bunker is a concrete
wall"; "sloping walls and unusual hardness. At some points, walls are estimated to be 10 feet thick"; "ramps lead
down into each of the three bays". What it held was not known to the interpreters (solid propellant, or tanks of
liquid: their guesses), and is not known to us.

Its three bays stand on today's map as three buildings 11 by 12 m, 21 to 22 m apart (OpenStreetMap ways
172571561, 172571527, 172571558): the CIA's 35 ft squares on a 70 ft pitch, to within a metre. They are placed
from the map and sized from the CIA.

Estimated: the height, the gates (their size, that they were steel and two-leaved), the vents' form, how the
earth lies. Not modelled: the ramps down into the bays (the land is not cut: the gates stand at grade), and what
was inside, which is why the gates are built shut.
"""

from __future__ import annotations

import sitelib

from .place import FOOTING, bank, double_door
from .site import FT, GROUND, Parts, box

BAY = 35.0 * FT  # a bay, square (PIC/JR-2/60)
PITCH = 70.0 * FT  # a bay and the earth fill beside it (PIC/JR-2/60: fills "each 35 feet wide")
WEST = -53.75  # the bays' west face, m east of the rocket (OpenStreetMap: -53.6 to -54.1)
MIDDLE = 207.4  # the middle bay's middle, m north (OpenStreetMap: its outline is 201.1 to 213.2)
HEIGHT = 4.5  # the roof over the ground, m (estimated: the CIA's figure is redacted)
WALL = 1.0  # the bays' walls, m (estimated: "at some points ... 10 feet thick" is the CIA's upper figure)
GATE = (3.4, 3.4)  # a gate's opening, wide and high, m (estimated: a lorry or a trailer backed in)


def bays() -> list[tuple[float, float, float, float]]:
    return [(WEST, MIDDLE + k * PITCH - BAY / 2, WEST + BAY, MIDDLE + k * PITCH + BAY / 2) for k in (-1, 0, 1)]


def build(parts: Parts) -> None:
    g = "StorageBunker"
    parts.node(
        g,
        label="Storage bunker",
        about=(
            "Three concrete bays 35 ft square with earth between them, each with its drive and its roof vent: measured by the CIA off "
            "photographs of 1957 and 1959, and standing today. What was kept here is not recorded; the height and the gates are estimated."
        ),
    )
    eave = GROUND + HEIGHT
    conc, earth, grey = parts(g, "concrete/bays"), parts(g, "earth", True), parts(g, "grey/vents", True)
    rects = bays()
    for n, (x0, y0, x1, y1) in enumerate(rects):
        walls = sitelib.ring([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], WALL)
        s0 = (BAY - GATE[0]) / 2
        for i, w in enumerate(walls):  # wall 3 is the west face, where the drive comes in
            w.build(conc, -FOOTING, eave, [(s0, s0 + GATE[0], GROUND + 0.03, GROUND + GATE[1])] if i == 3 else [])
        double_door(parts, f"{g}_Gate{n + 1}", g, walls[3], s0, s0 + GATE[0], GROUND + 0.03, GROUND + GATE[1], depth=0.35)
        for leaf in ("L", "R"):
            obj = parts.nodes[f"{g}_Gate{n + 1}{leaf}"][0]
            obj["label"] = "Gate of a storage bay, kept shut"
            obj["about"] = (
                "What was stored in the bays is not recorded, so their insides are not drawn and the gates stay shut. The gates are estimated."
            )
        # the roof: a slab oversailing the walls, and the vent the interpreters saw on each
        sitelib.slab(parts(g, "concrete/roofs"), sitelib.offset_poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 0.25), eave, eave + 0.45, bottom=True)
        sitelib.roof_vent(grey, (x0 + x1) / 2, (y0 + y1) / 2, eave + 0.45, 2.2)
        # the threshold: a concrete apron before the gate, where the drive arrives
        box(parts(g, "concrete/aprons"), (x0 - 4.0, (y0 + y1) / 2 - 2.6, -FOOTING), (x0 - 0.02, (y0 + y1) / 2 + 2.6, 0.0))
    # the earth fills between the bays, held at the face by a battered concrete wall
    for (_, _, _, ya), (_, yb, _, _) in zip(rects, rects[1:]):
        sitelib.solid(
            parts(g, "concrete/revetment"),
            [
                [(WEST + 0.1, y, -FOOTING), (WEST + 1.5, y, -FOOTING), (WEST + 1.5, y, eave - 0.35), (WEST + 0.9, y, eave - 0.35)]
                for y in (ya - 0.5, yb + 0.5)
            ],
        )
        box(earth, (WEST + 1.2, ya - 0.3, -FOOTING), (WEST + BAY - 0.2, yb + 0.3, eave - 0.6))
    # and banked behind the bays and round both ends
    ys, yn = rects[0][1], rects[-1][3]
    bank(
        earth,
        [(WEST + BAY - 0.6, ys - 0.6), (WEST + BAY + 0.9, ys - 0.6), (WEST + BAY + 0.9, yn + 0.6), (WEST + BAY - 0.6, yn + 0.6)],
        eave - 0.7,
        5.0,
    )
    for y0, y1 in ((ys - 1.2, ys - 0.2), (yn + 0.2, yn + 1.2)):
        bank(earth, [(WEST + 4.2, y0), (WEST + BAY, y0), (WEST + BAY, y1), (WEST + 4.2, y1)], eave - 0.9, 3.8)


def summary() -> str:
    return f"storage bunker of three bays {BAY:.2f} m square ({BAY / FT:.0f} ft) on a {PITCH:.2f} m pitch, {-WEST - BAY / 2:.0f} m west"
