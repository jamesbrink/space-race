"""The measuring point south-west of Site 1 (IP-1) as of April 1961: what the U-2's photographs of July 1959 show of it, the
last taken before the flights. The range's own, not any flight's, and in Site 1's frame.

Run with `pnpm model ip1`. A model of its own, as Site 2's is (../../site2/model/1961-04.py), and for the same reason:
it stands a kilometre and a half from the pad, and the place's shadow maps are fitted to what the place's model holds.
The viewer fetches it as scenery round the site (../../ground.ts `NEIGHBOURS`, src/viewer/around.ts).
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "places", "tyuratam"))
import sitelib  # noqa: E402
from ip1 import centre  # noqa: E402
from site1 import place  # noqa: E402
from site1.site import Parts  # noqa: E402
from srlib import run  # noqa: E402

DATE = "1961-04-12"


def build() -> str:
    sitelib.as_of(DATE)
    parts = Parts(place.materials())
    built = centre.build(parts)
    parts.build()
    print(sitelib.standing())
    return f"as of {DATE}: {len(built)} things ({', '.join(built)}): {centre.summary()}"


if __name__ == "__main__":
    x, y = centre.HQ
    run(
        "Tyuratam's measuring point as of 1961-04",
        build,
        [
            ("ip1-centre.png", (x + 90, y - 90, 4), 360, dict(azimuth=-50, elevation=28, res=(1600, 1000))),
            ("ip1-headquarters.png", (x, y, 4), 70, dict(azimuth=-150, elevation=8, res=(1600, 1000))),
            ("ip1-dome-eye.png", (x + 50, y + 12, 4), 60, dict(azimuth=-60, elevation=1, res=(1600, 1000))),
        ],
    )
