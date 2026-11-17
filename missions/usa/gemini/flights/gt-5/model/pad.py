"""Launch Complex 19 as it stood for Gemini-Titan 5 on 21 August 1965. Run with `pnpm model gt-5`.

The pad itself is ../../../../places/cape-canaveral/lc_19.py, the place's own, the one Gemini 3 and 4 left from: this script
only names the day, and each thing the place's modules build says whether it stood then (sitelib.stood). Nothing read
has the complex changed since Gemini 3's morning (../../../../places/cape-canaveral/lc-19.md, "What stood when"): "Pad
damage was minimal" after Gemini 4 (the Gemini V mission report, 5.2.10.3). The vehicle and the two men
are vehicle.py, crew.py and pilot.py beside this file; the viewer stands the vehicle on the thrust mount.
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

DATE = "1965-08-21"


def build() -> str:
    lc_19.build(DATE)  # the pad as it stood on the day of the flight
    return (
        f"as of {DATE}: erector {lc_19.ERECTOR_TOP * FT:.2f} m over the deck, hinged {lc_19.HINGE[0] * FT:.2f} m south of the vehicle; "
        f"umbilical tower {lc_19.UT_TOP * FT:.2f} m; the deck {-lc_19.GROUND * FT:.3f} m over the land; "
        f"the engines' exits {lc_19.ENGINE_EXIT * FT:.3f} m over the deck"
    )


if __name__ == "__main__":
    run(
        "gt-5 pad",
        build,
        [
            # from the east, as NASA S65-49568 has the erector on its way down that morning; from the deck's south end
            ("pad-east.png", (8, 0, 14), 150, dict(azimuth=85, elevation=4, res=(1600, 1100))),
            ("pad-south.png", (4, 0, 20), 120, dict(azimuth=-4, elevation=2, res=(1100, 1500))),
            ("pad-foot.png", (5, 1.5, 2.0), 22, dict(azimuth=-25, elevation=8, res=(1500, 1100))),
        ],
    )
