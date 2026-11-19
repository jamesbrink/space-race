"""The measuring point south-west of Site 1 (ИП-1; the CIA's "Instrumentation Control Center", "approximately 4,680
feet southwest of the launch platform"), and the tracking station built along the road south-east of it by 1963.

**The centre of 1959** is PIC/JR-2/60 Figure 27, the CIA's line drawing of it from the U-2's photographs of July
1959, with a scale bar (2.13 ft a pixel as scanned), a north arrow, its fence dimensioned 1,160 by 640 ft and three
buildings given in the text: "Item 13: Gable-roofed building 35 feet square. Item 14: Gable-roofed building 105 by
55 feet. Item 15: Gable-roofed building 145 by 40 feet." It names four more and gives no figure for them: a "probable
headquarters building", a "possible generator building", an "instrumentation building" and a "building with dome",
the dome "20' dia." Those four are scaled off the drawing.

Where each stands is worked from the drawing and checked twice. The headquarters building, 105 by 52 ft as drawn, is
a building of 106 by 50 ft on today's map (OpenStreetMap way 172576987); item 14, 247 m along the compound and 42 m
across it from there on the drawing, falls within a metre of a building of 100 by 45 ft on today's map (way
172576984); item 15 falls on a roof 44 m long that lies across the compound on a KH-7 photograph of 24 September 1964
(mission 4011, frame DZB00401100008H009001, laid on Site 1's frame by four buildings here, to some 3 m), and item 13 on
a small one. So the two that today's map has are built where it has them, and the rest where the drawing puts them
from the headquarters building, good to some 10 m.

**The tracking station** is CIA/PID memorandum M/EB 524/64 of 10 November 1964: "two 105 by 75 by 25-foot
instrumentation buildings spaced from center to center, 795 feet apart", "a one-story 95 by 40-foot support building
... midway between", "a 60-foot diameter environmental shelter ... on the roof of the westernmost instrumentation
building, and a 55 to 60-foot circular possible environmental shelter support base" on the easternmost, and "a
self-supporting lattice tower roughly 200 feet in height ... approximately 600 feet northeast of the easternmost
building". Today's map has the three buildings in a row on that bearing (ways 172576995, 172577009, 172576988), the
outer two alike, 25 by 19.5 m and 267 m apart: smaller and further apart than the CIA measured on small-scale
photographs. The KH-7 photograph has the roofs at today's size, so they are built at today's outlines and the CIA's
height, the one figure nothing else gives. NPIC/R-227/63 (September 1963) has the "two new identical structures ...
about 800 feet apart"; the photograph of September 1964 has the dome's shadow on the western one, the support
building and the tower's shadow, 56 m long where the Sun gives a 61 m tower 63 m.

Heights not given are read off the shadows on that photograph (1.03 of a height: the assembly building's 70 ft
against its own), good to some 2 m. Not built, though the drawing has them: the fence, the "large probable bunker"
at the north-west end (a mound of 33 by 31 m on today's map: its height is not known), the "possible tracking antenna"
on its pad (item 19), the pad with a 15 ft cylinder (item 12), the mounded tanks, the stick masts, a long outline 157
by 31 ft that is not hatched as a building, and the interferometer 1,140 ft west-north-west (six radomes on a cleared
circle 1,000 ft across; "inactive" by December 1963). Nor what the centre gained between 1959 and 1964 inside its
fence, which "approximately doubled" (NPIC/R-1440/63, its dates blacked out): the photograph of 1964 has a dozen more
roofs than the drawing, and no report read measures them.
"""

from __future__ import annotations

import math

from site1 import relief
from site1.site import FT, Parts
from site2 import blocks
from site2.blocks import Block
from sitelib import beam, box, lattice, stood

FIGURE_27 = "PIC/JR-2/60 Figure 27 and p. 40 (U-2, July 1959)"
KH7 = "KH-7 mission 4011, 24 September 1964, frame DZB00401100008H009001"
MEMO = "CIA/PID M/EB 524/64 (10 November 1964)"

# The compound's own directions: its length runs north-west (bearing 305.5), its breadth north-east (the bearing of the
# headquarters building's length on today's map, and of every building in it)
ALONG = 126.0
# Where the headquarters building stands (today's map), and where it is on the drawing: feet along the compound from
# its south-east end and across it from its south-west side, read off the figure
HQ = (-867.7, -1152.5)
HQ_DRAWN = (1050.0, 189.0)


def drawn(along: float, across: float) -> tuple[float, float]:
    """Where a point of the CIA's drawing is in Site 1's frame, m: `along` and `across` in feet as the drawing has it."""
    a, c = (along - HQ_DRAWN[0]) * FT, (across - HQ_DRAWN[1]) * FT
    nw, ne = math.radians(ALONG + 180.0), math.radians(ALONG - 90.0)
    return (HQ[0] + a * math.sin(nw) + c * math.sin(ne), HQ[1] + a * math.cos(nw) + c * math.cos(ne))


SEEN = "its height read off its shadow on a satellite photograph of September 1964; its walls and windows are estimated"

CENTRE = [
    Block(
        node="MeasuringHeadquarters",
        label="Headquarters building of the measuring point",
        about=(
            "The largest building of the measuring point in 1959, at its north-west end: the CIA's interpreters took it for the "
            f"headquarters. Some 105 by 52 ft on their drawing, 106 by 50 on today's map, where it still stands. Two storeys: {SEEN}."
        ),
        at=HQ,
        size=(32.35, 15.30),
        axis=126.26,
        eave=6.4,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="documented",
        source=f'{FIGURE_27}: "probable headquarters building", scaled; OpenStreetMap way 172576987 (32.35 by 15.30 m); {KH7}',
    ),
    Block(
        node="MeasuringBuilding14",
        label="Gable-roofed building of the measuring point",
        about=(
            "One of three buildings the measuring point had gained by 1959: gable-roofed, 105 by 55 ft (the CIA, measured off a U-2's "
            f"photographs). It stands today. One storey: {SEEN}."
        ),
        at=(-688.9, -1333.1),
        size=(105.0 * FT, 55.0 * FT),
        axis=125.81,
        eave=3.6,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="documented",
        source=f"{FIGURE_27}: item 14, gable-roofed, 105 by 55 ft; OpenStreetMap way 172576984 (30.6 by 13.8 m); {KH7}",
    ),
    Block(
        node="MeasuringBuilding15",
        label="Long building across the measuring point",
        about=(
            "A long gable-roofed building lying across the compound at its south-east end in 1959: 145 by 40 ft (the CIA, measured off a "
            f"U-2's photographs). Today a larger building stands on the spot. One storey: {SEEN}."
        ),
        at=(-623.5, -1360.0),
        size=(145.0 * FT, 40.0 * FT),
        axis=34.83,
        eave=3.6,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="documented",
        source=f"{FIGURE_27}: item 15, gable-roofed, 145 by 40 ft; its roof on {KH7}; OpenStreetMap way 172577013 (since rebuilt larger)",
    ),
    Block(
        node="MeasuringBuilding13",
        label="Small building of the measuring point",
        about="A small gable-roofed building 35 ft square (the CIA, measured off a U-2's photographs of 1959). Its height is estimated.",
        at=drawn(391.0, 48.0),
        size=(35.0 * FT, 35.0 * FT),
        axis=ALONG,
        eave=3.0,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="documented",
        source=f"{FIGURE_27}: item 13, gable-roofed, 35 ft square; its place worked from the drawing, a small roof there on {KH7}",
    ),
    Block(
        node="MeasuringInstrumentBuilding",
        label="Instrumentation building",
        about=(
            "The building the CIA's drawing of 1959 names the instrumentation building: some 52 by 31 ft, scaled off the drawing. What "
            "instruments it held is not recorded. Its flat roof and its height are estimated."
        ),
        at=drawn(1029.0, 327.0),
        size=(52.0 * FT, 31.0 * FT),
        axis=ALONG,
        eave=4.0,
        roof="flat",
        since="1959-07",
        until=None,
        confidence="derived",
        source=f'{FIGURE_27}: "instrumentation building", scaled (no figure given); a roof there on {KH7}',
    ),
    Block(
        node="MeasuringGenerator",
        label="Generator building",
        about=(
            "A small building the CIA's interpreters took for a generator house in 1959: some 38 by 30 ft, scaled off their drawing. "
            "Its roof and height are estimated."
        ),
        at=drawn(896.0, 210.0),
        size=(38.0 * FT, 30.0 * FT),
        axis=ALONG,
        eave=3.4,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="derived",
        source=f'{FIGURE_27}: "possible generator building", scaled (no figure given)',
    ),
]

# The building with a dome: its outline scaled off the drawing, its dome's breadth given on it
DOME_BUILDING = Block(
    node="MeasuringDomeBuilding",
    label="Building with a dome",
    about=(
        "A building with a dome 20 ft across on its roof, as the CIA drew it in 1959: an instrument under a cover, which one is "
        "not recorded. Its outline, some 42 by 25 ft, is scaled off the drawing; its height and the dome's are estimated."
    ),
    at=drawn(918.0, 325.0),
    size=(42.0 * FT, 25.0 * FT),
    axis=ALONG - 90.0,
    eave=4.5,
    roof="flat",
    since="1959-07",
    until=None,
    confidence="derived",
    source=f'{FIGURE_27}: "building with dome", "20\' dia."; its outline scaled (no figure given)',
)

STATION_SINCE = "1963-09"
STATION = [
    Block(
        node="TrackingBuildingWest",
        label="Western instrumentation building of the tracking station",
        about=(
            "One of two like buildings 267 m apart along the road south-east of the measuring point, built by September 1963: 25 ft "
            "high (the CIA). By September 1964 it carried a radome 60 ft across on its roof. Today's map has it 24.6 by 19.9 m; the CIA "
            "made it 105 by 75 ft from small-scale photographs. What the station tracked is not said in anything read."
        ),
        at=(-225.2, -1551.6),
        size=(24.61, 19.89),
        axis=36.49,
        eave=25.0 * FT,
        roof="flat",
        since=STATION_SINCE,
        until=None,
        confidence="documented",
        source=f'{MEMO}: 25 ft high; NPIC/R-227/63 (September 1963): "two new identical structures"; OpenStreetMap way 172576995; {KH7}',
    ),
    Block(
        node="TrackingBuildingEast",
        label="Eastern instrumentation building of the tracking station",
        about=(
            "The twin of the western building, 267 m south-east of it: 25 ft high (the CIA). In 1964 its roof carried the round "
            "base for a radome like the other's, 55 to 60 ft across, with an antenna or its mount in the middle."
        ),
        at=(-7.5, -1707.0),
        size=(25.43, 18.99),
        axis=35.40,
        eave=25.0 * FT,
        roof="flat",
        since=STATION_SINCE,
        until=None,
        confidence="documented",
        source=f"{MEMO}: 25 ft high; NPIC/R-227/63 (September 1963); OpenStreetMap way 172576988; {KH7}",
    ),
    Block(
        node="TrackingSupportBuilding",
        label="Support building of the tracking station",
        about=(
            "A one-storey building midway between the station's two instrumentation buildings: 95 by 40 ft (the CIA), under construction "
            "in 1963 and finished by September 1964. It stands today. Its gabled roof is estimated."
        ),
        at=(-121.6, -1632.2),
        size=(95.0 * FT, 40.0 * FT),
        axis=124.60,
        eave=3.6,
        roof="gable",
        since="1964-09",
        until=None,
        confidence="documented",
        source=f'{MEMO}: "a one-story 95 by 40-foot support building"; OpenStreetMap way 172577009 (32.0 by 16.4 m); {KH7}',
    ),
]

RADOME = 60.0 * FT  # "a 60-foot diameter environmental shelter"
RADOME_BASE = 58.0 * FT  # "a 55 to 60-foot circular possible environmental shelter support base"
TOWER = 200.0 * FT  # "roughly 200 feet in height"
TOWER_AT = (
    117.0,
    -1603.0,
)  # its foot, from its shadow on the photograph (good to some 15 m); the CIA: "approximately 600 feet northeast of the easternmost building"


def _dome(radius: float, sunk: float, segs: int = 32, rings: int = 10):
    """A ball of `radius` with its lowest `sunk` of a radius under the roof: (r, z) from the roof up, for a lathe."""
    lo = -math.asin(min(1.0, sunk))
    pts = []
    for i in range(rings + 1):
        t = lo + (math.pi / 2 - lo) * i / rings
        pts.append((radius * math.cos(t), radius * (math.sin(t) + sunk)))
    pts[-1] = (0.0, pts[-1][1])
    return pts


def _small_dome(k, b: Block) -> None:
    # a hemisphere on a kerb in the middle of the roof (its height estimated: half its breadth)
    r = 20.0 * FT / 2
    top = b.eave + 0.3
    k("plaster").lathe([(r + 0.15, top - 0.02), (r + 0.15, top + 0.35), (r - 0.05, top + 0.35)], 32)
    k("white").lathe([(q, top + 0.35 + z) for q, z in _dome(r, 0.0)], 32)


def _radome(k, b: Block) -> None:
    # a ball 60 ft across, three quarters of it over the roof (how much of a ball it was is estimated)
    r = RADOME / 2
    top = b.eave + 0.3
    k("white").lathe([(q, top - 0.02 + z) for q, z in _dome(r, 0.5)], 40)


def _radome_base(k, b: Block) -> None:
    # the ring the shelter was to stand on, and the mount in its middle (their heights estimated)
    r = RADOME_BASE / 2
    top = b.eave + 0.3
    k("plaster").lathe([(r, top - 0.02), (r, top + 0.9), (r - 0.4, top + 0.9), (r - 0.4, top - 0.02)], 40)
    k("grey").lathe([(1.1, top - 0.02), (1.1, top + 2.2), (0.0, top + 2.2)], 16)


def tower(parts: Parts) -> bool:
    """The lattice tower north-east of the eastern building: four legs tapering to a head, a platform under it."""
    if not stood(
        "Lattice tower of the tracking station",
        since="1964-09",
        confidence="documented",
        source=(
            f'{MEMO}: "a self-supporting lattice tower roughly 200 feet in height", "a suspect microwave antenna or boresight reflector" '
            f"on it; its shadow on {KH7}"
        ),
    ):
        return False
    g = "TrackingTower"
    base = relief.ground(*TOWER_AT)
    parts.node(
        g,
        origin=(*TOWER_AT, base),
        label="Lattice tower of the tracking station",
        about=(
            "A self-supporting lattice tower roughly 200 ft high (the CIA), north-east of the station's eastern building, with what "
            "its interpreters took for a microwave antenna or a boresight reflector on it: a target to line the station's dishes "
            "up on. Its shadow is 56 m long on a satellite photograph of September 1964. Its breadth and its bracing are estimated."
        ),
    )
    steel = parts(g, "grey")
    x, y = TOWER_AT
    foot, head = 7.0, 0.9  # half its breadth at the ground and at its top, m (estimated: a tower of its height)
    levels = [TOWER * f for f in (0.0, 0.09, 0.19, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1.0)]

    def corner(i: int, z: float):
        half = foot + (head - foot) * (z / TOWER) ** 0.8
        sx, sy = ((1, 1), (-1, 1), (-1, -1), (1, -1))[i % 4]
        return (x + sx * half, y + sy * half, base + z)

    lattice(steel, corner, levels, 0.32, 0.16)
    for i in range(4):  # each leg on a concrete footing
        cx, cy, _ = corner(i, 0.0)
        box(parts(g, "plaster"), (cx - 0.9, cy - 0.9, base - 0.6), (cx + 0.9, cy + 0.9, base + 0.35))
    # the reflector near its head, toward the station (which way it faced is estimated)
    zr = base + TOWER - 6.0
    box(parts(g, "white"), (x - 1.6, y - 1.25, zr - 1.5), (x + 1.6, y - 1.15, zr + 1.5))
    beam(steel, (x, y - 1.15, zr), (x, y, zr), 0.14)
    return True


def build(parts: Parts) -> list[str]:
    """The measuring point and the tracking station as they stood on the date being built: the nodes built."""
    built = [b.node for b in CENTRE if blocks.build(parts, b)]
    if blocks.build(parts, DOME_BUILDING, _small_dome, smooth=("white",)):
        built.append(DOME_BUILDING.node)
    for b in STATION:
        extra = None
        if b.node == "TrackingBuildingWest" and stood(
            "Radome on the western instrumentation building",
            since="1964-09",
            confidence="documented",
            source=f'{MEMO}: "a 60-foot diameter environmental shelter"; its shadow on {KH7}',
        ):
            extra = _radome
        if b.node == "TrackingBuildingEast" and stood(
            "Radome's base on the eastern instrumentation building",
            since="1964-09",
            confidence="documented",
            source=(
                f'{MEMO}: "a 55 to 60-foot circular possible environmental shelter support base with an antenna and/or antenna mount '
                'within its center"'
            ),
        ):
            extra = _radome_base
        if blocks.build(parts, b, extra, smooth=("white",)):
            built.append(b.node)
    if tower(parts):
        built.append("TrackingTower")
    return built


def summary() -> str:
    everything = [*CENTRE, DOME_BUILDING, *STATION]
    return "; ".join(blocks.line(b) for b in everything)
