"""Gordon Cooper, the command pilot, suited for Gemini-Titan 5. Run with `pnpm model gt-5`.

The suit is ../../../crew/g4c_suit.py, the G4C as the two men wore it on 21 August 1965, without the cover for going
outside; this is the standing figure, jointed, which the launch site is walked as. What he carried to the pad that
morning (a portable ventilator, his suit on its air: NASA S65-28740) and the yellow overshoes worn to the spacecraft's
sill are not built: ../../../crew/g4c-suit.md.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "crew"))
import g4c_suit  # noqa: E402
from srlib import CM, run  # noqa: E402

WHO = g4c_suit.COOPER


def build() -> str:
    height = g4c_suit.build(WHO)
    return f"standing height {height:.3f} m in helmet and boots, the man {WHO.stature * CM:.3f} m"


if __name__ == "__main__":
    run(
        "gt-5 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-left.png", (0.12, 0, 0.95), 4.7, dict(azimuth=0, elevation=6)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
            ("crew-right.png", (0.12, 0, 0.95), 4.7, dict(azimuth=180, elevation=6)),
            ("crew-flag.png", (0.2, 0, 1.42), 0.9, dict(azimuth=-20, elevation=8)),
        ],
    )
