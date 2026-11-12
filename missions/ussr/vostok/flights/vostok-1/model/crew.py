"""Yuri Gagarin, suited for Vostok 1. Run with `pnpm model:vostok-1`.

The suit is ../../../crew/sk_1.py, shared with the Vostok flights that followed. The spacecraft is
vehicle.py beside this file.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "crew"))
import sk_1  # noqa: E402
from srlib import CM, run  # noqa: E402


def build() -> str:
    height = sk_1.build()
    return f"standing height {height:.3f} m in helmet and boots, pilot {sk_1.STATURE * CM:.3f} m, helmet {2 * sk_1.HELMET_R * CM:.3f} m across"


if __name__ == "__main__":
    run(
        "vostok-1 crew",
        build,
        [
            ("crew-front.png", (0, 0, 0.86), 4.3, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0, 0, 0.86), 4.3, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0, 0, 0.86), 4.3, dict(azimuth=90, elevation=6)),
            ("crew-helmet.png", (0, 0, 1.56), 1.4, dict(azimuth=-62, elevation=8, res=(1100, 1100))),
        ],
    )
