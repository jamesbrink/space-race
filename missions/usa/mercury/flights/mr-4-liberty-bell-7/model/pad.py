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
AZIMUTH = 100.0  # the flight's azimuth, degrees true (flight.ts: `trajectory.azimuth`): what the launcher's table was turned to
TURN = lc_5.launcher_turn(AZIMUTH)  # 60 degrees: where the hatch's middle stands, round from +X toward +Y


def build() -> str:
    lc_5.build(DATE, AZIMUTH)  # the pad as it stood on the day of the flight, its launcher set for the flight
    return (
        f"as of {DATE}: launcher turned {TURN:.0f} degrees, pedestal top {lc_5.PEDESTAL_TOP * FT:.3f} m, "
        f"service structure {lc_5.STRUCTURE_TOP * FT:.1f} m, hardstand {lc_5.HARDSTAND * FT:.1f} m square"
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
            # the two cable masts under level 1, from where the photographs that place them were taken round the vehicle
            # (FHSU items 466, 468 and 333: sites/lc5/site.py MASTS), which the launcher's turn puts on the pad
            ("pad-masts-151.png", (0, 0, 8.0), 36, dict(azimuth=151 + TURN, elevation=4, res=(1100, 1400))),
            ("pad-masts-232.png", (0, 0, 8.0), 36, dict(azimuth=232 + TURN, elevation=4, res=(1100, 1400))),
            ("pad-masts-312.png", (0, 0, 8.0), 36, dict(azimuth=312.5 + TURN, elevation=4, res=(1100, 1400))),
            # the whole pad from the same three places, further off: the truck and the structure fall where the photographs have them
            ("pad-from-151.png", (0, 0, 13.0), 62, dict(azimuth=151 + TURN, elevation=1, res=(1200, 1500))),
            ("pad-from-232.png", (0, 0, 13.0), 62, dict(azimuth=232 + TURN, elevation=1, res=(1200, 1500))),
            ("pad-from-312.png", (0, 0, 13.0), 62, dict(azimuth=312.5 + TURN, elevation=1, res=(1200, 1500))),
            # level 2 from in front, under the white room: the opening round the booster's mast and its cooling package, and its rails
            ("pad-level2.png", (0.6, -1.2, 16.9), 9, dict(azimuth=-80, elevation=22, res=(1500, 1000))),
        ],
    )
