"""Launch Complex 19 as it stood in March 1965: the blockhouse and its cableway, the flume and the skimming basin,
the two propellant holding areas, the roads, the buildings and the fence round the stand. The place itself, not any
flight's: Gemini-Titan 3 (23 March 1965) shows it round its pad.

Run with `pnpm model lc-19`. A later state of the place is another script beside this one, named for its date, giving
that date to the same builders: each thing they build says when it stood (sitelib.stood). The pieces are the modules
of the package above this folder, put together by ../../lc_19.py; ../../lc-19.md records every dimension, its
confidence, what stood when, and what is simplified.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "places", "cape-canaveral"))
import lc_19  # noqa: E402
from lc19 import site  # noqa: E402
from srlib import FT, run  # noqa: E402

DATE = "1965-03-23"


def off(at: tuple[float, float]) -> float:
    """How far a place is from the vehicle's axis, metres."""
    return (at[0] ** 2 + at[1] ** 2) ** 0.5 * FT


def build() -> str:
    lc_19.build_place(DATE)
    return (
        f"as of {DATE}: blockhouse {off(site.BLOCKHOUSE):.1f} m from the vehicle, the flume {site.FLUME * FT:.1f} m long, "
        f"fuel {off(site.FUEL_AREA):.1f} m and oxidizer {off(site.OXIDIZER_AREA):.1f} m off, the land {-site.GROUND * FT:.3f} m under the deck"
    )


if __name__ == "__main__":
    g = site.GROUND * FT
    at = lambda xy, up=3.0: (xy[0] * FT, xy[1] * FT, g + up)  # noqa: E731
    run(
        "lc-19 as of 1965-03",
        build,
        [
            ("place-wide.png", (0, 0, g), 620, dict(azimuth=-125, elevation=38, res=(1600, 1100))),
            ("place-blockhouse.png", at(site.BLOCKHOUSE, 5.0), 150, dict(azimuth=-70, elevation=14, res=(1600, 1100))),
            ("place-fuel.png", at(site.FUEL_AREA), 70, dict(azimuth=160, elevation=14, res=(1600, 1100))),
            ("place-oxidizer.png", at(site.OXIDIZER_AREA), 70, dict(azimuth=160, elevation=14, res=(1600, 1100))),
            ("place-flume.png", (-80, 3, g), 260, dict(azimuth=175, elevation=18, res=(1600, 1100))),
            ("place-top.png", (-20, -20, g), 760, dict(azimuth=-90, elevation=89, res=(1500, 1500))),
        ],
    )
