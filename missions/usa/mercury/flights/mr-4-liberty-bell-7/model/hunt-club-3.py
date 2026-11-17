"""Hunt Club 3: the second Marine Corps HUS-1 of 21 July 1961, which picked Grissom out of the sea in its horse collar.

Run with `pnpm model mr-4` (or `--only hunt-club-3`). The type is ../../../vehicles/hus_1.py, as Hunt Club 1's
(helicopter.py beside this file); this script says which aircraft it was, as far as the record shows it. Its pilot was
Capt. Phillip Upschulte and its copilot Lt. George F. Cox, who threw Grissom the collar (This New Ocean, p. 375; the
Marine Corps Gazette's Leatherneck, May 2016, pp. 42 and 43, secondary).

Which aircraft: NASA 61-MR4-82 shows it with Grissom on its hoist, the boom out over the door: 30 large on the door and
small on the nose, RESCUE stencilled twice aft of the door, the national insignia; MSFC-6116429 and S61-02819 give it as
ET-30 (helicopter.py). Its bureau number is not legible in any photograph read, so none is painted; This Day in Aviation
gives 148754 without a source, and it is not used. Everything else is the type's (hus-1.md), as Hunt Club 1's.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
import hus_1  # noqa: E402
from srlib import load_font, run  # noqa: E402

HUNT_CLUB_3 = hus_1.Markings(side="30", code="ET", bureau=None, rescue=True)


def build() -> str:
    return hus_1.build(HUNT_CLUB_3, load_font())


def at(u: float, y: float, z: float) -> tuple[float, float, float]:
    """A point given as the module gives it (feet aft of the nose, to port, up), in the file's metres."""
    return tuple(hus_1.P(u, y, z))


if __name__ == "__main__":
    middle = at(21.0, 0, 6.5)
    run(
        "mr-4 hunt club 3",
        build,
        [
            ("hc3-starboard.png", middle, 30, dict(azimuth=-90, elevation=4, res=(1800, 900), lens=50)),
            ("hc3-port.png", middle, 30, dict(azimuth=90, elevation=4, res=(1800, 900), lens=50)),
            ("hc3-rescue.png", at(17.5, -3.0, 5.5), 8.0, dict(azimuth=-80, elevation=4, res=(1300, 1000))),
        ],
    )
