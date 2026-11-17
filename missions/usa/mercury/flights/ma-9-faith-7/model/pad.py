"""Launch Complex 14 as it stood for Mercury-Atlas 9. Run with `pnpm model ma-9`.

The pad itself is ../../../../places/cape-canaveral/lc_14.py, the place's own, the one every orbital Mercury flight left
from: this script only names the day, and each thing the place's modules build says whether it stood then
(sitelib.stood). Nothing read has the pad changed by this morning (../../../../places/cape-canaveral/lc-14.md, "What
stood when": the photographs of May 1963 are most of what the complex is scaled from), so it builds as Mercury-Atlas 6's
did. The vehicle and the pilot are vehicle.py and crew.py beside this file; the viewer stands them on the pad, the
vehicle turned as it stood (lc_14.HATCH_TURN: the hatch on 240 degrees true, as every Mercury-Atlas stood).
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "places", "cape-canaveral"))
import lc_14  # noqa: E402
from lc14 import site, tower  # noqa: E402
from srlib import FT, run  # noqa: E402

DATE = "1963-05-15"


def build() -> str:
    lc_14.build(DATE)  # the pad as it stood on the day of the flight
    return (
        f"as of {DATE}: stand {lc_14.STAND_W * FT:.1f} by {lc_14.STAND_L * FT:.1f} m, its deck {site.DECK * FT:.3f} m over the paving; "
        f"engines' exit plane {lc_14.LAUNCHER_TOP * FT:.3f} m over the deck; service structure {lc_14.STRUCTURE_TOP * FT:.2f} m; "
        f"egress tower {tower.TOP * FT:.2f} m over the deck; "
        f"the structure rolls {lc_14.TABLE_Y * FT:.2f} m north on to the table and is carried {lc_14.PARKED_X * FT:.1f} m east"
    )


if __name__ == "__main__":
    g = site.APRON * FT
    run(
        "ma-9 pad",
        build,
        [
            ("pad-wide-sw.png", (0, 0, 14), 160, dict(azimuth=215, elevation=10, res=(1500, 1300))),
            ("pad-south.png", (0, 0, 16), 150, dict(azimuth=-90, elevation=4, res=(1300, 1500))),
            ("pad-tower.png", (5, -8, 16), 60, dict(azimuth=200, elevation=6, res=(1200, 1500))),
            ("pad-base.png", (-11, 2, g + 4), 34, dict(azimuth=160, elevation=10, res=(1600, 1100))),
        ],
    )
