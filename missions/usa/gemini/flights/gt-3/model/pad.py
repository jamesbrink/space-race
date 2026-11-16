"""Launch Complex 19 as it stood for Gemini-Titan 3 on 23 March 1965. Run with `pnpm model gt-3`.

The pad itself is ../../../../places/cape-canaveral/lc_19.py, which every Gemini flight will share. The vehicle is
vehicle.py beside this file; the viewer stands it on the thrust mount, its engines' exits 3.6 ft over the deck.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "places", "cape-canaveral"))
import lc_19  # noqa: E402
from srlib import FT, run  # noqa: E402


def build() -> str:
    lc_19.build("1965-03-23")  # the pad as it stood on the day of the flight
    return (
        f"erector {lc_19.ERECTOR_TOP * FT:.2f} m over the deck, hinged {lc_19.HINGE[0] * FT:.2f} m south of the vehicle; umbilical tower "
        f"{lc_19.UT_TOP * FT:.2f} m; the deck {-lc_19.GROUND * FT:.3f} m over the land; "
        f"the engines' exits {lc_19.ENGINE_EXIT * FT:.3f} m over the deck"
    )


if __name__ == "__main__":
    run(
        "gt-3 pad",
        build,
        [
            # from the east, as S65-49568 has it; from the flume, as S65-43447; from the deck's south end, as S65-21881 and S65-20641
            ("pad-east.png", (8, 0, 14), 150, dict(azimuth=85, elevation=4, res=(1600, 1100))),
            ("pad-north.png", (-3, 0, 12), 110, dict(azimuth=178, elevation=-4, res=(1200, 1500))),
            ("pad-south.png", (4, 0, 20), 120, dict(azimuth=-4, elevation=2, res=(1100, 1500))),
            ("pad-wide.png", (25, 0, 5), 260, dict(azimuth=50, elevation=22, res=(1600, 1100))),
            ("pad-foot.png", (5, 1.5, 2.0), 22, dict(azimuth=-25, elevation=8, res=(1500, 1100))),
            ("pad-whiteroom.png", (1.5, 0, 31.5), 26, dict(azimuth=150, elevation=28, res=(1500, 1100))),
            ("pad-top.png", (15, 3, 0), 130, dict(azimuth=-90, elevation=89, res=(1500, 1500))),
            ("pad-tower.png", (-5, -5, 22), 60, dict(azimuth=135, elevation=10, res=(1100, 1500))),
        ],
    )
