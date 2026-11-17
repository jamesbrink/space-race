"""Hunt Club 1: the Marine Corps HUS-1 that hooked Liberty Bell 7 on 21 July 1961 and could not lift it.

Run with `pnpm model mr-4` (or `--only helicopter`). The type is ../../../vehicles/hus_1.py; this script says which
aircraft it was. Its pilot was Lt. James L. Lewis and its copilot Lt. John Reinhard, of HMR(L)-262 (This New Ocean,
pp. 372 to 375; Results of the Second U.S. Manned Suborbital Space Flight, pp. 45 and 55).

Which aircraft: NASA photograph S61-02826 shows the helicopter with the capsule on its line, the capsule awash under
it: side number 32, the squadron's code ET on the pylon, and on the tail cone the bureau number 148755, read at full
resolution. MSFC-6116424 and 61-MR4-100 show the same aircraft (32, ET) towing it. The helicopter that picked Grissom
up is ET-30 in MSFC-6116429 and S61-02819; it is the same type and would be this model in its own markings
(`ET_30`, not built: its bureau number is not legible in either photograph).
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

HUNT_CLUB_1 = hus_1.Markings(side="32", code="ET", bureau="148755")
ET_30 = hus_1.Markings(side="30", code="ET", bureau=None)


def build() -> str:
    return hus_1.build(HUNT_CLUB_1, load_font())


def at(u: float, y: float, z: float) -> tuple[float, float, float]:
    """A point given as the module gives it (feet aft of the nose, to port, up), in the file's metres."""
    return tuple(hus_1.P(u, y, z))


if __name__ == "__main__":
    middle = at(21.0, 0, 6.5)
    run(
        "mr-4 helicopter",
        build,
        [
            ("heli-port.png", middle, 30, dict(azimuth=90, elevation=4, res=(1800, 900), lens=50)),
            ("heli-starboard.png", middle, 30, dict(azimuth=-90, elevation=4, res=(1800, 900), lens=50)),
            ("heli-front.png", at(8.0, 0, 7.0), 26, dict(azimuth=0, elevation=3, res=(1400, 1000), lens=50)),
            ("heli-three-quarter.png", middle, 34, dict(azimuth=35, elevation=14, res=(1800, 1100), lens=50)),
            ("heli-rear-quarter.png", middle, 34, dict(azimuth=-145, elevation=12, res=(1800, 1100), lens=50)),
            ("heli-above.png", at(16.0, 0, 6.0), 34, dict(azimuth=90, elevation=85, res=(1400, 1400), lens=35)),
            # the cabin door and the hoist above it, from a man's height on the starboard side
            ("heli-door.png", at(10.7, -2.9, 5.4), 6.5, dict(azimuth=-70, elevation=6, res=(1300, 1100))),
            ("heli-hoist.png", at(9.8, -3.2, 7.6), 3.6, dict(azimuth=-55, elevation=18, res=(1300, 1100))),
            ("heli-tail.png", at(42.0, 0, 9.0), 9.5, dict(azimuth=65, elevation=6, res=(1300, 1100))),
            ("heli-head.png", at(hus_1.X_ROTOR, 0, 13.6), 4.5, dict(azimuth=30, elevation=18, res=(1300, 1100))),
            ("heli-nose.png", at(3.0, 0, 6.0), 8.0, dict(azimuth=40, elevation=8, res=(1300, 1100))),
            ("heli-gear.png", at(8.0, -4.0, 3.0), 5.5, dict(azimuth=-40, elevation=8, res=(1300, 1100))),
        ],
    )
