"""The small buildings round the complex: two huts behind the blockhouse, the generator building
between it and pad 5, and the shed beside the track.

Their plans and places are OpenStreetMap's (buildings that stand there today, each matched to a
building in the July 1961 photographs: FHSU F16_016 for the huts, F16_015 for the generator
building, F16_017 for the shed). Derived: plan sizes and positions. Estimated: heights, roofs,
doors, windows, what each was for, and which way each faces.

Only the generator building can be gone into: its louvred walls say what it held. What the two
huts and the shed held is not recorded, so their doors are built shut and their windows dark
(sitelib.building: "shut", "blind") rather than opening on an empty room.
"""

from __future__ import annotations

import math

from mathutils import Matrix

import interiors
import sitelib
import srlib
from srlib import FT, interior

from .site import FOOTING, GROUND, P, Parts, box, building, fence, fine, flat_roof, ftp, roof_vent

FLOOR = GROUND + 0.5
WALL = 0.55  # sitelib.building's walls


def shell(parts: Parts, node: str, key: str, rect, eave: float, openings: dict, **kw) -> list:
    """sitelib.building on this site's ground: walls down to the footing, a floor half a foot up."""
    return building(parts, node, key, rect, eave, openings, floor=FLOOR, footing=-FOOTING, **kw)


def build(parts: Parts) -> None:
    g = "Outbuildings"
    parts.node(g)
    grey, dark = parts(g, "grey", True), parts(g, "chassis")

    # ---- the hut behind the blockhouse: flat-roofed, two doors toward the drive
    r = (228.8, -209.5, 247.7, -192.7)
    e = GROUND + 9.5
    shell(
        parts,
        g,
        "hut1",
        r,
        e,
        {0: [(2.5, 5.7, FLOOR, FLOOR + 6.8, "shut"), (10.5, 15.5, FLOOR, FLOOR + 6.8, "shut")], 2: [(6.0, 11.0, FLOOR + 3.4, FLOOR + 6.4, "blind")]},
    )
    flat_roof(parts, g, "hut1", r, e)
    # the fenced yard beside it: two transformers behind chain link
    yx0, yy0, yx1, yy1 = 231.0, -190.5, 251.0, -179.8
    fence(parts, g, [(yx0, yy0), (yx1, yy0), (yx1, yy1), (yx0, yy1)], ground=GROUND)
    box(parts(g, "concrete/yard"), (yx0 + 1.0, yy0 + 1.0, -FOOTING), (yx1 - 1.0, yy1 - 1.0, GROUND + 0.4))
    for x in (yx0 + 4.0, yx0 + 12.0):
        box(grey, (x, yy0 + 2.6, GROUND + 0.4), (x + 4.4, yy1 - 2.6, GROUND + 4.8))
        for k in range(3):
            grey.lathe(
                ftp([(0.0, 0.0), (0.22, 0.0), (0.3, 0.5), (0.16, 0.9), (0.26, 1.2), (0.0, 1.5)]),
                8,
                matrix=Matrix.Translation(P(x + 0.9 + k * 1.3, yy0 + 5.3, GROUND + 4.8)),
            )
        if fine():
            for k in range(8):  # cooling fins
                box(dark, (x + 0.3 + k * 0.5, yy0 + 2.3, GROUND + 1.0), (x + 0.45 + k * 0.5, yy0 + 2.61, GROUND + 4.2))

    # ---- the hut by the road, with ducts on its roof and a tall pole beside it (F16_016)
    r = (293.7, -167.3, 316.4, -157.1)
    e = GROUND + 9.0
    shell(
        parts,
        g,
        "hut2",
        r,
        e,
        {
            0: [
                (3.0, 6.2, FLOOR, FLOOR + 6.8, "shut"),
                (9.5, 13.5, FLOOR + 3.2, FLOOR + 6.2, "blind"),
                (16.0, 20.0, FLOOR + 3.2, FLOOR + 6.2, "blind"),
            ],
            1: [(3.5, 6.7, FLOOR + 4.5, FLOOR + 6.5, "louvre")],
        },
    )
    flat_roof(parts, g, "hut2", r, e)
    box(grey, (297.0, -165.5, e + 0.8), (301.5, -160.0, e + 2.6))
    box(grey, (305.0, -164.5, e + 0.8), (312.0, -160.5, e + 1.9))
    roof_vent(grey, 303.2, -159.6, e + 0.7, 0.7)

    # ---- the generator building, between the blockhouse and pad 5: louvred walls, roof ventilators, an exhaust
    r = (124.1, -115.6, 146.5, -97.5)
    e = GROUND + 11.0
    lv = lambda a, b: (a, b, FLOOR + 2.0, FLOOR + 7.0, "louvre")  # noqa: E731
    shell(
        parts,
        g,
        "gen",
        r,
        e,
        {
            0: [lv(3.0, 8.0), lv(14.0, 19.0)],
            1: [(6.0, 12.0, FLOOR, FLOOR + 8.0, "door")],
            2: [lv(3.0, 8.0), lv(14.0, 19.0)],
            3: [(7.0, 10.2, FLOOR, FLOOR + 6.8, "door")],
        },
    )
    flat_roof(parts, g, "gen", r, e)
    interiors.ceiling_light(parts, g, "Generators", ((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, e - 0.02), length=3.0, intensity=0.6, reach=5.0)
    for x in (129.0, 135.3, 141.6):
        roof_vent(grey, x, -106.6, e + 0.7, 1.1)
    grey.tube(P(144.0, -100.5, e + 0.5), P(144.0, -100.5, e + 6.5), 0.35 * 0.3048, 10)
    if interior():  # the sets, seen through the louvres and the door: radiators to the louvred wall (estimated, of the kind)
        font = srlib.load_font()
        for x in (131.5, 141.0):
            interiors.generator_set(parts, g, interiors.at((x, -106.5, FLOOR), 180.0), 11.0, font=font)
        interiors.panel(
            parts,
            g,
            sitelib.axes_local((124.1 + WALL + 0.01, -101.6, FLOOR + 3.0), (0, 1, 0), (0, 0, 1)),  # on the -X wall, beside the door
            2.6,
            3.5,
            [("meters", 3), ("lamps", "gr"), ("switches", 4), ("label", "SET 1    SET 2    PAD")],
            title="TRANSFER",
            font=font,
            seed=17,
        )
    # its fuel tank on cradles outside: dished heads, steel saddles on concrete piers, straps, the fill
    # and vent on top, a gauge, the line to the building (estimated: the ordinary arrangement)
    tank = parts(g, "trailer/tank", True)
    head = [(0.0, 0.0), (0.7, 0.04), (1.25, 0.15), (1.65, 0.38), (1.85, 0.65), (1.9, 0.85)]
    tank.lathe(
        ftp(head + [(r_, 10.0 - z) for r_, z in reversed(head)]),
        40,
        matrix=Matrix.Translation(P(150.5, -112.0, GROUND + 3.2)) @ Matrix.Rotation(math.radians(-90), 4, "X"),
    )
    conc, metal = parts(g, "concrete/piers"), parts(g, "grey/tankfittings", True)
    for y in (-110.0, -104.0):
        box(conc, (149.0, y - 0.6, GROUND - 1.0), (152.0, y + 0.6, GROUND + 0.6))
        box(dark, (149.3, y - 0.25, GROUND + 0.6), (151.7, y + 0.25, GROUND + 1.6))
        strap = ftp([(1.93, -0.12), (1.98, -0.12), (1.98, 0.12), (1.93, 0.12), (1.93, -0.12)])
        metal.lathe(strap, 40, matrix=Matrix.Translation(P(150.5, y, GROUND + 3.2)) @ Matrix.Rotation(math.radians(-90), 4, "X"))
    top = GROUND + 3.2 + 1.9
    metal.tube(P(150.5, -109.0, top - 0.2), P(150.5, -109.0, top + 0.7), 0.12 * FT, 10)  # the fill, capped
    metal.lathe(ftp([(0.0, 0.0), (0.2, 0.0), (0.2, 0.18), (0.0, 0.18)]), 12, matrix=Matrix.Translation(P(150.5, -109.0, top + 0.7)))
    metal.tube(P(150.5, -106.0, top - 0.2), P(150.5, -106.0, top + 2.4), 0.07 * FT, 8)  # the vent, turned down at its head
    metal.tube(P(150.5, -106.0, top + 2.4), P(150.5, -106.6, top + 2.4), 0.07 * FT, 8)
    metal.tube(P(150.5, -106.6, top + 2.4), P(150.5, -106.6, top + 1.9), 0.07 * FT, 8)
    metal.lathe(ftp([(0.0, 0.0), (0.3, 0.0), (0.3, 0.15), (0.0, 0.15)]), 12, matrix=Matrix.Translation(P(150.5, -103.5, top - 0.1)))  # gauge
    feed = [(150.5, -104.0, GROUND + 1.6), (150.5, -102.0, GROUND + 1.0), (147.2, -102.0, GROUND + 1.0)]
    for a, b in zip(feed, feed[1:]):  # the line from the tank's underside to the building's wall
        metal.tube(P(*a), P(*b), 0.05 * FT, 8)

    # ---- the shed west of the track, between the pads: a corrugated roof with one ventilator (F16_017)
    r = (36.9, -270.4, 63.2, -254.6)
    lo, hi = GROUND + 8.0, GROUND + 9.6
    shell(
        parts,
        g,
        "shed",
        r,
        lo,
        {2: [(4.0, 7.2, FLOOR, FLOOR + 6.8, "shut"), (12.0, 20.0, FLOOR, FLOOR + 7.4, "shut")], 0: [(8.0, 12.0, FLOOR + 3.2, FLOOR + 6.2, "blind")]},
        mat="corrugated",
        wall=0.35,
    )
    x0, y0, x1, y1 = r[0] - 1.2, r[1] - 1.2, r[2] + 1.2, r[3] + 1.2
    roof = parts(g, "corrugated/roof")
    pitch = 0.5 if fine() else 1.5
    us = [x0 + k * pitch / 2 for k in range(round((x1 - x0) / (pitch / 2)) + 1)]

    def top(x: float, y: float):
        k = round((x - x0) / (pitch / 2))
        return P(x, y, lo + (hi - lo) * (y - y0) / (y1 - y0) + (0.1 if k % 2 else 0.0) + 0.12)

    roof.grid(top, us, [y0, y1])
    under = [P(x0, y0, lo + 0.02), P(x1, y0, lo + 0.02), P(x1, y1, hi + 0.02), P(x0, y1, hi + 0.02)]
    roof.add([tuple(q) for q in under], [(3, 2, 1, 0)])
    roof.add([tuple(under[0]), tuple(under[1]), tuple(P(x1, y0, lo + 0.17)), tuple(P(x0, y0, lo + 0.17))], [(0, 1, 2, 3)])
    roof.add([tuple(under[2]), tuple(under[3]), tuple(P(x0, y1, hi + 0.17)), tuple(P(x1, y1, hi + 0.17))], [(0, 1, 2, 3)])
    gable = parts(g, "corrugated/gable")  # the walls' tops, up to the roof's slope
    for x in (r[0], r[2] - 0.35):
        v = [P(x, r[1], lo), P(x + 0.35, r[1], lo), P(x + 0.35, r[3], lo), P(x, r[3], lo), P(x, r[3], hi - 0.25), P(x + 0.35, r[3], hi - 0.25)]
        gable.add([tuple(q) for q in v], [(0, 4, 3), (1, 2, 5), (3, 4, 5, 2), (0, 1, 5, 4)])
    box(gable, (r[0] + 0.35, r[3] - 0.35, lo), (r[2] - 0.35, r[3], hi - 0.2))
    roof_vent(grey, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, (lo + hi) / 2 + 0.1, 1.3)

    # what each is called when pointed at (its walls and roof): the uses are estimated (see the module's note)
    known = "Its plan and place are OpenStreetMap's map of the building that stands there today; its height, doors and use are estimated."
    for key, about, mats in (
        ("Hut", known, ("block/hut1", "block/hut1roof", "block/hut2", "block/hut2roof")),
        ("Generator building", "Taken for the complex's generator house from its louvred walls. " + known, ("block/gen", "block/genroof")),
        ("Generator fuel tank", "The generators' diesel on cradles beside the house: its form and fittings are estimated.", ("trailer/tank",)),
        ("Shed", known, ("corrugated/shed", "corrugated/roof", "corrugated/gable")),
    ):
        for mat in mats:
            parts.mark(g, mat, label=key, about=about)
