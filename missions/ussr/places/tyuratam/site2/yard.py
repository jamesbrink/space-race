"""What stood in the assembly building's fenced yard at Site 2 (the CIA's "Missile Assembly and Checkout Facility No 1",
770 by 545 ft inside its fence): the buildings the CIA's interpreters measured or drew, which today's map still has and
a KH-7 photograph of 24 September 1964 shows standing.

Three sources, laid over one another (../site-1.md, "Beyond the fences"):
  - PIC/JR-2/60 Figure 8, the CIA's line drawing of the launch support area from the U-2's photographs of July 1959,
    with two of the yard's buildings dimensioned on it ("160' x 55'", "125' x 35'") and the rest drawn to its scale
    (1.49 ft a pixel as scanned); NPIC/R-1440/63 p. 9 gives the same two again and their roofs: "a gable-roofed
    building, measures 125 by 35 feet and is located to the northeast of the rail-through building. The other, a
    hip-roofed building, measures 160 by 55 feet and is located parallel to and on the west side".
  - today's map (OpenStreetMap), which has a building of each of those sizes in each of those places: where each is
    built, and the bearing of its length.
  - KH-7 mission 4011, 24 September 1964, frame DZB00401100008H009001, laid on Site 1's frame by four of those buildings
    (to a metre or so over the yard): every one of them stands on it, and the Sun's shadows on it give their heights,
    against the assembly building's own, whose 70 ft the CIA measured (a shadow there is 1.03 of the height).

Sizes are in feet where the CIA gives them and metres where today's map does. Heights are derived from those shadows,
good to some 2 m, and the walls, windows and doors are ours (blocks.py). Not built, though the drawing and the frame
have them: the yard's fence and its four corner towers, the "tall tower" in the south-east corner (a water tower; its
diameter is blacked out), a building some 55 by 60 ft beyond the hall's south-south-west end (where the extension of
the 1970s stands today), and half a dozen huts under 50 ft long.
"""

from __future__ import annotations

from site1.site import FT, Parts
from site2 import blocks
from site2.blocks import Block

FIGURE_8 = "PIC/JR-2/60 Figure 8 (U-2, July 1959)"
KH7 = "KH-7 mission 4011, 24 September 1964, frame DZB00401100008H009001"

YARD = [
    Block(
        node="YardWorkshop",
        label="Workshop west of the assembly building",
        about=(
            "A storage or shop building alongside the assembly building's west wall, across the tracks from it: 160 by 55 ft under a "
            "hipped roof (the CIA, measured off a U-2's photographs). It stands today. Its height is read off its shadow on a "
            "satellite photograph of September 1964; its walls and windows are estimated."
        ),
        at=(-1955.0, -546.0),
        size=(160.0 * FT, 55.0 * FT),
        axis=27.84,
        eave=4.2,
        roof="hip",
        since="1959-07",
        until=None,
        confidence="documented",
        source=f"{FIGURE_8}: 160 by 55 ft; NPIC/R-1440/63 p. 9: hip-roofed; OpenStreetMap way 173526232 (48.5 by 16.7 m); {KH7}",
    ),
    Block(
        node="YardStore",
        label="Store north-east of the assembly building",
        about=(
            "A long low storage or shop building by the yard's east fence, north-east of the assembly building: 125 by 35 ft under a "
            "gabled roof (the CIA, measured off a U-2's photographs). It stands today. Its height is read off its shadow on a "
            "satellite photograph of September 1964."
        ),
        at=(-1813.5, -511.1),
        size=(125.0 * FT, 35.0 * FT),
        axis=27.83,
        eave=3.4,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="documented",
        source=f"{FIGURE_8}: 125 by 35 ft; NPIC/R-1440/63 p. 9: gable-roofed; OpenStreetMap way 173526192 (40.4 by 10.0 m); {KH7}",
    ),
    Block(
        node="YardTallBuilding",
        label="Tall building east of the assembly building",
        about=(
            "The tallest thing in the yard after the assembly building itself, some 12 m by its shadow on a satellite photograph of "
            "September 1964: what it was is not recorded. Some 88 by 55 ft on the CIA's drawing of 1959; today's map has a larger "
            "building on the spot. Its flat roof is estimated."
        ),
        at=(-1834.0, -557.0),
        size=(88.0 * FT, 55.0 * FT),
        axis=27.8,
        eave=12.2,
        roof="flat",
        since="1959-07",
        until=None,
        confidence="derived",
        source=f"{FIGURE_8}, scaled (no figure on it); OpenStreetMap way 173526445, since enlarged; its roof's middle and its 13 m shadow on {KH7}",
    ),
    Block(
        node="YardShop",
        label="Shop east of the assembly building",
        about=(
            "A low shop building in the south of the yard, east of the assembly building: some 82 by 36 ft on the CIA's drawing of 1959, "
            "and standing today a little longer. Its gabled roof and its height are estimated."
        ),
        at=(-1880.0, -636.7),
        size=(82.0 * FT, 36.0 * FT),
        axis=27.82,
        eave=3.4,
        roof="gable",
        since="1959-07",
        until=None,
        confidence="derived",
        source=f"{FIGURE_8}, scaled (no figure on it); OpenStreetMap way 173526256 (32.8 by 11.4 m); {KH7}",
    ),
    Block(
        node="YardLongBuilding",
        label="Long building north of the assembly building",
        about=(
            "A long building beyond the assembly building's north end, beside the tracks, its roof new and bright on a satellite "
            "photograph of September 1964. It is not on the CIA's plans of 1959 or 1963. It stands today, 64 by 15.5 m. Its gabled roof is estimated."
        ),
        at=(-1906.2, -452.4),
        size=(64.39, 15.51),
        axis=27.84,
        eave=4.2,
        roof="gable",
        since="1964-09",
        until=None,
        confidence="documented",
        source=(
            f"{KH7}; OpenStreetMap way 173526251; not on {FIGURE_8} nor on NPIC/R-1440/63 Figure 6: when between 1963 and "
            "September 1964 it was built is not known"
        ),
    ),
]


def build(parts: Parts) -> list[Block]:
    """The yard as it stood on the date being built: what was built."""
    return [b for b in YARD if blocks.build(parts, b)]


def summary(built: list[Block]) -> str:
    return "; ".join(blocks.line(b) for b in built) or "nothing of the yard"
