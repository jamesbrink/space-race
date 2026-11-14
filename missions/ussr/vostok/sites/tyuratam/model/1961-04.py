"""What of the range beyond Site 1's fences stands over the land from its pad, as of April 1961: the assembly and
test building of Site 2, two kilometres off. The range's own, not any flight's, and in Site 1's frame.

Run with `pnpm model:tyuratam`. It is a model of its own, and not part of Site 1's place, because of where it is: the
place's coarse shadow map is laid over the box of what the place holds, and a building 2 km to the west would take
it off the pad. The viewer fetches it as scenery round the site (../../site-1.ts `around`, src/viewer/around.ts) and
draws it in full at any distance: its two coarser levels are built and measured (1961-04.lod.json, and
../../site-1.md, "On the horizon") and wait for that to choose among them.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "sites"))
import sitelib  # noqa: E402
from site1 import place  # noqa: E402
from site1.site import Parts  # noqa: E402
from srlib import run  # noqa: E402
from tyuratam import mik  # noqa: E402

DATE = "1961-04-12"


def build() -> str:
    sitelib.as_of(DATE)
    parts = Parts(place.materials())
    mik.build(parts)
    parts.build()
    print(sitelib.standing())
    return f"as of {DATE}: {mik.summary()}"


if __name__ == "__main__":
    x, y = mik.AT
    run(
        "Tyuratam beyond Site 1 as of 1961-04",
        build,
        [
            ("tyuratam-mik.png", (x, y, 10), 170, dict(azimuth=-70, elevation=14, res=(1600, 1000))),
            ("tyuratam-mik-west.png", (x, y, 10), 170, dict(azimuth=150, elevation=20, res=(1600, 1000))),
            ("tyuratam-mik-gates.png", (x + 28, y + 53, 6), 60, dict(azimuth=62, elevation=6, res=(1600, 1000))),
        ],
    )
