"""The Gemini-Titan 10 standing pilot figure. See ../../../crew/g4c-suit.md."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "crew"))
import g4c_suit  # noqa: E402
from srlib import CM, run  # noqa: E402

WHO = g4c_suit.COLLINS


def build() -> str:
    height = g4c_suit.build(WHO)
    return f"standing height {height:.3f} m in helmet and boots, the man {WHO.stature * CM:.3f} m"


if __name__ == "__main__":
    run(
        "gt-10 pilot",
        build,
        [
            ("pilot-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("pilot-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("pilot-left.png", (0.12, 0, 0.95), 4.7, dict(azimuth=0, elevation=6)),
            ("pilot-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
            ("pilot-right.png", (0.12, 0, 0.95), 4.7, dict(azimuth=180, elevation=6)),
            ("pilot-flag.png", (0.2, 0, 1.42), 0.9, dict(azimuth=-20, elevation=8)),
        ],
    )
