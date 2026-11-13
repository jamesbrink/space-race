"""Launch Complex 5/6 as it stood on 21 July 1961: the blockhouse, pad 6, and what lay between them and pad 5.
The place itself, not any flight's: Mercury-Redstone 4 shows it round its pad.

Run with `pnpm model:lc-5`. The same builders as 1961-05.py, given this date: each thing they build says when it
stood (sitelib.stood). Nothing here is known to have been built or taken away between 5 May and 21 July, so what
is built is what May's state has; what differs is what the record says of it. May's state was read off July's
photographs and assumed for May; this is the month they were taken in, so the gantry at pad 6 (which had flown its
last Redstone on 27 June and is in the photograph of this flight's liftoff), the cable racks, the scaffold stair
and the cars are told as seen, not as assumed. ../../lc-5.md, "What stood when".
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

DATE = "1961-07-21"


def build() -> str:
    lc_5.build_place(DATE)
    tip = blockhouse.BLOCKHOUSE_TIP
    reach = (tip[0] ** 2 + tip[1] ** 2) ** 0.5 * FT
    return (
        f"as of {DATE}: blockhouse {site.BLOCKHOUSE_LENGTH * FT:.1f} by {2 * site.BLOCKHOUSE_HALF * FT:.1f} m, its point {reach:.1f} m from pad 5; "
        f"pad 6 {-site.PAD6[1] * FT:.1f} m up the track, gantry {pad6.GANTRY_TOP * FT:.1f} m"
    )


if __name__ == "__main__":
    bx, by = (blockhouse.BLOCKHOUSE_TIP[0] + 45) * FT, (blockhouse.BLOCKHOUSE_TIP[1]) * FT
    run(
        "lc-5 as of 1961-07",
        build,
        [
            ("place-blockhouse.png", (bx, by, 3), 70, dict(azimuth=-150, elevation=22, res=(1600, 1100))),
            ("place-pad6.png", (0, site.PAD6[1] * FT, 12), 130, dict(azimuth=-40, elevation=14, res=(1600, 1100))),
            ("place-wide.png", (20, -80, 0), 330, dict(azimuth=-120, elevation=35, res=(1600, 1100))),
        ],
    )
