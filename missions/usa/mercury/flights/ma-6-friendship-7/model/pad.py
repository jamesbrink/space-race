"""Launch Complex 14 as it stood for Mercury-Atlas 6. Run with `pnpm model ma-6`.

The pad itself is ../../../../places/cape-canaveral/lc_14.py, the place's own: this script only names the day. The
vehicle and the pilot are vehicle.py and crew.py beside this file; the viewer stands them on the pad, the vehicle
turned as it stood (lc_14.HATCH_TURN: the hatch on 240 degrees true).
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

DATE = "1962-02-20"


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
        "ma-6 pad",
        build,
        [
            ("pad-wide-sw.png", (0, 0, 14), 160, dict(azimuth=215, elevation=10, res=(1500, 1300))),
            ("pad-south.png", (0, 0, 16), 150, dict(azimuth=-90, elevation=4, res=(1300, 1500))),
            ("pad-west.png", (0, 0, 16), 150, dict(azimuth=180, elevation=6, res=(1300, 1500))),
            ("pad-east.png", (0, 0, 16), 150, dict(azimuth=0, elevation=6, res=(1300, 1500))),
            ("pad-north.png", (0, 0, 16), 150, dict(azimuth=90, elevation=8, res=(1300, 1500))),
            ("pad-deck.png", (2, -4, 3), 46, dict(azimuth=235, elevation=14, res=(1600, 1100))),
            ("pad-launcher.png", (0, 0, 2.5), 22, dict(azimuth=-70, elevation=16, res=(1500, 1100))),
            ("pad-tower.png", (5, -8, 16), 60, dict(azimuth=200, elevation=6, res=(1200, 1500))),
            ("pad-whiteroom.png", (0, -1, 25.5), 30, dict(azimuth=-90, elevation=6, res=(1500, 1100))),
            ("pad-head.png", (0, 0, 22), 40, dict(azimuth=225, elevation=-8, res=(1300, 1300))),
            ("pad-base.png", (-11, 2, g + 4), 34, dict(azimuth=160, elevation=10, res=(1600, 1100))),
            ("pad-table.png", (0, 16, g), 60, dict(azimuth=60, elevation=24, res=(1600, 1100))),
            ("pad-top-down.png", (0, 0, 0), 110, dict(azimuth=-90, elevation=80, res=(1400, 1400))),
        ],
    )
