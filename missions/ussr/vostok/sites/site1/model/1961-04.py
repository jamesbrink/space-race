"""Site 1 at Tyuratam as it stood in April 1961: the command bunker, the storage bunker, the buildings by the
pad, what stood round the flame pit's rim, and the double fence with its lights and towers. The place itself,
not any flight's: Vostok 1 (12 April 1961) shows it round its pad, and so can anything else that flew from
here that spring.

Run with `pnpm model:site-1`. A later state of the place is another script beside this one, named for its
date, giving that date to the same builders: each thing they build says when it stood (sitelib.stood), so what
had gone or not yet come is left out. The pieces are the modules of the package above this folder, put
together by ../../site_1.py; ../../site-1.md records every dimension, its confidence, what stood when, and what
is simplified.

`SITE1_WITH_PAD=1` in the environment builds the pad with it, so that the clearance check and the stills see
the two together. That is for looking and checking: build it to a scratch directory (`--out-dir`), never into
public/models.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "sites"))
import site_1  # noqa: E402
from site1 import bunker, storage  # noqa: E402
from srlib import run  # noqa: E402

DATE = "1961-04-12"
WITH_PAD = os.environ.get("SITE1_WITH_PAD") == "1"


def build() -> str:
    if WITH_PAD:
        site_1.build(DATE)
    return f"as of {DATE}: {site_1.build_place(DATE)}"


if __name__ == "__main__":
    bx, by = bunker.CENTRE
    run(
        "site-1 as of 1961-04",
        build,
        [
            ("place-wide.png", (-20, 60, 0), 900, dict(azimuth=-115, elevation=38, res=(1600, 1100))),
            ("place-bunker.png", (bx, by, 2), 75, dict(azimuth=-160, elevation=16, res=(1600, 1100))),
            ("place-bunker-eye.png", (bx - 10, by + 8, 1.6), 22, dict(azimuth=165, elevation=2, res=(1600, 1100))),
            ("place-storage.png", (storage.WEST, storage.MIDDLE, 2), 60, dict(azimuth=170, elevation=14, res=(1600, 1100))),
            ("place-shed.png", (-52, 20, 3), 70, dict(azimuth=115, elevation=14, res=(1600, 1100))),
            ("place-cascade.png", (-38, -23, 1), 28, dict(azimuth=-70, elevation=18, res=(1600, 1100))),
            ("place-rim.png", (20, -110, 2), 70, dict(azimuth=-70, elevation=20, res=(1600, 1100))),
            ("place-conduit.png", (0, 55, -8), 110, dict(azimuth=-20, elevation=25, res=(1600, 1100))),
            ("place-fence.png", (-470, -180, 3), 60, dict(azimuth=40, elevation=10, res=(1600, 1100))),
            ("place-tower.png", (-122, 10, 9), 45, dict(azimuth=-60, elevation=8, res=(1100, 1400))),
            ("place-shops.png", (-100, 160, 3), 170, dict(azimuth=-20, elevation=22, res=(1600, 1100))),
        ],
    )
