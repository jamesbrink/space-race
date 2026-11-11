"""Launch Complex 5/6 round pad 5, as it stood for Mercury-Redstone 3: the blockhouse, pad 6, and
what lay between. Scenery for the viewer, in the pad model's frame. Run with `pnpm model:mr-3`.

The pieces are ../../../sites/lc5/ (blockhouse.py, pad6.py, grounds.py, outbuildings.py,
vehicles.py), put together by ../../../sites/lc_5.py; ../../../sites/lc-5.md records every
dimension, its confidence and what is simplified.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "sites"))
import lc_5  # noqa: E402
from lc5 import blockhouse, pad6, site  # noqa: E402
from srlib import FT, run  # noqa: E402


def build() -> str:
    lc_5.build_surroundings()
    tip = blockhouse.BLOCKHOUSE_TIP
    reach = (tip[0] ** 2 + tip[1] ** 2) ** 0.5 * FT
    return (
        f"blockhouse {site.BLOCKHOUSE_LENGTH * FT:.1f} by {2 * site.BLOCKHOUSE_HALF * FT:.1f} m, its point {reach:.1f} m from pad 5; "
        f"pad 6 {-site.PAD6[1] * FT:.1f} m up the track, gantry {pad6.GANTRY_TOP * FT:.1f} m"
    )


if __name__ == "__main__":
    bx, by = (blockhouse.BLOCKHOUSE_TIP[0] + 45) * FT, (blockhouse.BLOCKHOUSE_TIP[1]) * FT
    run(
        "mr-3 surroundings",
        build,
        [
            ("surroundings-blockhouse.png", (bx, by, 3), 70, dict(azimuth=-150, elevation=22, res=(1600, 1100))),
            ("surroundings-blockhouse-back.png", (bx, by, 3), 60, dict(azimuth=20, elevation=12, res=(1600, 1100))),
            ("surroundings-pad6.png", (0, site.PAD6[1] * FT, 12), 130, dict(azimuth=-40, elevation=14, res=(1600, 1100))),
            ("surroundings-wide.png", (20, -80, 0), 330, dict(azimuth=-120, elevation=35, res=(1600, 1100))),
            ("surroundings-top.png", (20, -80, 0), 420, dict(azimuth=-90, elevation=89, res=(1400, 1400))),
        ],
    )
