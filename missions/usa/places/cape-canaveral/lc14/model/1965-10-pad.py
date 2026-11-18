"""Launch Complex 14's Gemini configuration, common to the seven target launches, 1965–66.

The rail-mounted service structure is parked and the target umbilical tower stands beside the empty launcher.
The target flight puts its own Atlas on the stand. See ../../lc-14.md for chronology and limits.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path[:0] = [os.path.join(_root, directory) for directory in ("tools/blender", "missions/usa/places/cape-canaveral")]

import sitelib  # noqa: E402
from lc14 import agena_tower, service_structure, site  # noqa: E402
from lc_14 import hardware  # noqa: E402
from srlib import FT, run  # noqa: E402


def build() -> str:
    sitelib.as_of("1965-10-25")
    parts = site.Parts(site.materials())
    hardware(parts)
    # First the gantry rolls north onto the table. The table then carries it to its eastern parking area (HAER FL-8-7 p. 22).
    parts.nodes[service_structure.G][0].location.y += site.TABLE_Y * FT
    parts.nodes[service_structure.NAME][0].location.x += site.PARKED_X * FT
    parts.build()
    return f"Gemini umbilical tower {agena_tower.TOP:g} ft above the deck; service gantry parked {site.PARKED_X:g} ft east"


if __name__ == "__main__":
    run("Gemini LC-14", build)
