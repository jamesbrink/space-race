"""Site 1 at Tyuratam as it stood for Vostok 4, on the morning of 12 August 1962. Run with `pnpm model vostok-4`.

The place itself is ../../../../places/tyuratam/site_1.py: this script only names the day, and each thing the site's modules
build says whether it stood then (sitelib.stood). What that changes is in ../../../../places/tyuratam/site-1.md, "What
stood when": the launching structure as in 1961 (it burnt on 1 June 1962 and was repaired; what the repair changed is not
known), the bus, no fillers (none recorded that morning), as Vostok 3's the day before, not April's car and truck nor its people.
This morning has its own reception. The vehicle and the
pilot are vehicle.py and crew.py beside this file; the viewer hangs the vehicle in the supports. To see the pad with the
vehicle in it, or what was taken away as it was left, use Vostok 2's pad.py (`SITE1_WITH_VEHICLE`, `SITE1_POSE`): the
hardware is the same.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "places", "tyuratam"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "crew"))
import site_1  # noqa: E402
from srlib import run  # noqa: E402


def build() -> str:
    return site_1.build("1962-08-12")  # the pad as it stood on the day of the flight


if __name__ == "__main__":
    run(
        "vostok-4 pad",
        build,
        [
            ("pad-wide.png", (40, 0, -8), 330, dict(azimuth=-125, elevation=22, res=(1600, 1100))),
            ("service-eye.png", (-6, 0, 14), 62, dict(azimuth=207, elevation=-11.5, res=(1400, 1400))),
            ("day-south.png", (0, 0, 14.5), 262, dict(azimuth=-90, elevation=0.4, res=(1543, 1120), lens=170.0)),
        ],
    )
