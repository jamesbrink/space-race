"""Launch Complex 5 as it stood for Mercury-Redstone 3. Run with `pnpm model:mr-3`.

The pad itself is ../../../sites/lc_5.py, shared with MR-4. The vehicle and the pilot are
vehicle.py and crew.py beside this file; the viewer stands them on the pad.
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


def build() -> str:
    lc_5.build()
    return (
        f"pedestal top {lc_5.PEDESTAL_TOP * FT:.3f} m, service structure {lc_5.STRUCTURE_TOP * FT:.1f} m, "
        f"hardstand {lc_5.HARDSTAND * FT:.1f} m square"
    )


if __name__ == "__main__":
    run(
        "mr-3 pad",
        build,
        [
            ("pad-wide.png", (-8, 0, 16), 150, dict(azimuth=-55, elevation=14, res=(1600, 1100))),
            ("pad-pedestal.png", (0, 0, 1.5), 22, dict(azimuth=-60, elevation=12, res=(1200, 900))),
            ("pad-top.png", (-8, 0, 30), 70, dict(azimuth=-130, elevation=8, res=(1200, 1100))),
        ],
    )
