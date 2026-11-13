"""Launch Complex 5 as it stood for Mercury-Redstone 4 on 21 July 1961. Run with `pnpm model:mr-4`.

The pad itself is ../../../sites/lc_5.py, the one Mercury-Redstone 3 flew from eleven weeks before: this script
only names the day, and each thing the site's modules build says whether it stood then (sitelib.stood). What that
changes is in ../../../sites/lc-5.md, "What stood when": capsule No. 11's umbilical, the emergency shower beside
the structure's base, the transfer van that brought the pilot, no packing case. The vehicle is vehicle.py beside
this file; the viewer stands it on the pad.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "sites"))
import lc_5  # noqa: E402
from srlib import FT, run  # noqa: E402

DATE = "1961-07-21"


def build() -> str:
    lc_5.build(DATE)  # the pad as it stood on the day of the flight
    return (
        f"as of {DATE}: pedestal top {lc_5.PEDESTAL_TOP * FT:.3f} m, service structure {lc_5.STRUCTURE_TOP * FT:.1f} m, "
        f"hardstand {lc_5.HARDSTAND * FT:.1f} m square"
    )


if __name__ == "__main__":
    run(
        "mr-4 pad",
        build,
        [
            ("pad-wide.png", (-8, 0, 16), 150, dict(azimuth=-55, elevation=14, res=(1600, 1100))),
            ("pad-base.png", (7, -4, 2.2), 26, dict(azimuth=-28, elevation=7, res=(1600, 1100))),
            ("pad-van.png", (8.5, 8.0, 2.4), 30, dict(azimuth=38, elevation=7, res=(1600, 1100))),
            ("pad-hatch.png", (0.6, 0, 20.6), 9, dict(azimuth=-12, elevation=4, res=(1300, 1100))),
        ],
    )
