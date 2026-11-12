"""The launch complexes round Complex 5/6 as they stood in May 1961: what a walker from pad 5 can reach.
The Cape's own, not any flight's: Mercury-Redstone 3 (5 May 1961) shows them on its horizon.

Run with `pnpm model:cape`. A later state is another script beside this one, named for its date. The
pieces are the modules of the package above this folder, put together by ../../cape_1961.py;
../../cape.md records every dimension, its confidence, what stood when, and what is simplified.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "sites"))
import cape_1961  # noqa: E402
from cape import lc26  # noqa: E402
from srlib import FT, run  # noqa: E402

DATE = "1961-05-05"


def build() -> str:
    cape_1961.build(DATE)
    return f"as of {DATE}: Complex 26's gantry {lc26.TOP_RAIL * FT:.1f} m to its top rail, its pads {lc26.PAD_A[1] * FT:.1f} m apart"


if __name__ == "__main__":
    run(
        "the Cape as of 1961-05",
        build,
        [
            ("cape-lc26b.png", (0, -5, 15), 75, dict(azimuth=-60, elevation=10, res=(1400, 1100))),
            ("cape-lc26-gantry.png", (0, -5, 17), 60, dict(azimuth=150, elevation=6, res=(1400, 1100))),
            ("cape-lc26-wide.png", (-40, 80, 0), 260, dict(azimuth=-130, elevation=30, res=(1600, 1100))),
            ("cape-lc26-blockhouse.png", (-105, 79, 3), 45, dict(azimuth=-20, elevation=14, res=(1400, 1000))),
        ],
    )
