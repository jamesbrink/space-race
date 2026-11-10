"""Alan Shepard, suited for Mercury-Redstone 3. Run with `pnpm model:mr-3`.

The suit is ../../../crew/mark_iv_suit.py, shared with MR-4 (which added wrist rings). The
vehicle and the pad are vehicle.py and pad.py beside this file.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "crew"))
import mark_iv_suit  # noqa: E402
from srlib import CM, run  # noqa: E402


def build() -> str:
    height = mark_iv_suit.build()
    return (
        f"standing height {height:.3f} m in helmet and boots, "
        f"pilot {mark_iv_suit.STATURE * CM:.3f} m, neck ring {2 * mark_iv_suit.NECK_RING_R * CM:.3f} m across"
    )


if __name__ == "__main__":
    run(
        "mr-3 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
            ("crew-helmet.png", (0, 0, 1.70), 1.5, dict(azimuth=-62, elevation=8, res=(1100, 1100))),
        ],
    )
