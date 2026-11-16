"""John Young, the pilot, suited for Gemini-Titan 3. Run with `pnpm model gt-3`.

The suit is ../../../crew/g3c_suit.py, the G3C as these two men wore it; this is the standing figure, jointed, which
the launch site is walked as. What he carried to the pad that morning (a portable ventilator in one hand, his suit on
its air) and the yellow overshoes he wore to the spacecraft's sill are not built: ../../../crew/g3c-suit.md.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "crew"))
import g3c_suit  # noqa: E402
from srlib import CM, run  # noqa: E402

WHO = g3c_suit.YOUNG


def build() -> str:
    height = g3c_suit.build(WHO)
    return f"standing height {height:.3f} m in helmet and boots, the man {WHO.stature * CM:.3f} m"


if __name__ == "__main__":
    run(
        "gt-3 pilot",
        build,
        [
            ("pilot-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("pilot-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("pilot-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
        ],
    )
