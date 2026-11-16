"""Launch Complex 14 as it stood in February 1962: the ramp, the paving and the pit, the flume, the blockhouse and the
buildings by it, the propellant storage. The place itself, not any flight's: Mercury-Atlas 6 (20 February 1962) shows
it round its pad, and so can anything else that flew from here in that state (nothing read has it change before
Mercury-Atlas 9, 15 May 1963: ../../lc-14.md, "What stood when").

Run with `pnpm model lc-14`. A later state of the place is another script beside this one, named for its date, giving
that date to the same builders: each thing they build says when it stood (sitelib.stood), so what had gone or not yet
come is left out. The pieces are the modules of the package above this folder, put together by ../../lc_14.py;
../../lc-14.md records every dimension, its confidence, what stood when, and what is simplified.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "places", "cape-canaveral"))
import lc_14  # noqa: E402
from lc14 import blockhouse, site  # noqa: E402
from srlib import FT, run  # noqa: E402

DATE = "1962-02-20"


def build() -> str:
    lc_14.build_place(DATE)
    reach = (blockhouse.CENTRE[0] ** 2 + blockhouse.CENTRE[1] ** 2) ** 0.5 * FT
    return (
        f"as of {DATE}: ramp {site.RAMP_L * FT:.1f} m to a deck {site.DECK * FT:.2f} m over the paving; "
        f"blockhouse dome {2 * blockhouse.FOOT_R * FT:.1f} m across, its middle {reach:.1f} m from the vehicle; "
        f"transfer table's tracks {(site.TABLE_EAST - site.TABLE_WEST) * FT:.1f} m long"
    )


if __name__ == "__main__":
    bx, by = blockhouse.CENTRE[0] * FT, blockhouse.CENTRE[1] * FT
    g = site.APRON * FT
    run(
        "lc-14 as of 1962-02",
        build,
        [
            ("place-ramp-west.png", (0, -30, g + 4), 110, dict(azimuth=195, elevation=10, res=(1600, 1000))),
            ("place-ramp-foot.png", (0, -70, g + 3), 100, dict(azimuth=-95, elevation=6, res=(1600, 1000))),
            ("place-blockhouse.png", (bx, by, g + 4), 85, dict(azimuth=-25, elevation=16, res=(1600, 1000))),
            ("place-blockhouse-west.png", (bx - 15, by, g + 3), 70, dict(azimuth=160, elevation=12, res=(1600, 1000))),
            ("place-lox.png", (-92, -58, g + 3), 60, dict(azimuth=215, elevation=18, res=(1600, 1000))),
            ("place-fuel.png", (30, -28, g + 3), 55, dict(azimuth=-60, elevation=14, res=(1600, 1000))),
            ("place-pit.png", (20, 16, g), 70, dict(azimuth=60, elevation=20, res=(1600, 1000))),
            ("place-wide.png", (-60, 20, g), 520, dict(azimuth=215, elevation=32, res=(1800, 1100))),
            ("place-flume.png", (0, 120, g), 260, dict(azimuth=80, elevation=28, res=(1600, 1000))),
        ],
    )
