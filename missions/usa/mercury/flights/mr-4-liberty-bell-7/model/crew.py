"""Virgil Grissom, suited for Mercury-Redstone 4 on 21 July 1961. Run with `pnpm model:mr-4`.

The suit is ../../../crew/mark_iv_suit.py, the one module Mercury-Redstone 3's crew is built from: this script only
says whose it is and of which day (`mark_iv_suit.MR_4`). What that changes is in ../../../crew/mark-iv-suit.md,
"5 May and 21 July 1961". The vehicle and the pad are vehicle.py and pad.py beside this file.
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
    height = mark_iv_suit.build(mark_iv_suit.MR_4)
    return (
        f"standing height {height:.3f} m in helmet and boots, "
        f"pilot {mark_iv_suit.STATURE * CM:.3f} m, neck ring {2 * mark_iv_suit.NECK_RING_R * CM:.3f} m across"
    )


if __name__ == "__main__":
    run(
        "mr-4 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
            ("crew-helmet.png", (0, 0, 1.60), 1.5, dict(azimuth=-62, elevation=8, res=(1100, 1100))),
            # what this flight's suit had that Freedom 7's did not
            ("crew-chest.png", (0, 0, 1.31), 1.5, dict(azimuth=-90, elevation=4, res=(1100, 1100))),
            ("crew-chest-side.png", (0, 0, 1.31), 1.5, dict(azimuth=-38, elevation=8, res=(1100, 1100))),
            ("crew-harness-back.png", (0, 0, 1.12), 2.4, dict(azimuth=90, elevation=6, res=(1100, 1100))),
            ("crew-wrist.png", (0.30, -0.04, 0.90), 0.9, dict(azimuth=-55, elevation=12, res=(1100, 1100))),
            ("crew-thigh.png", (-0.06, -0.05, 0.78), 1.3, dict(azimuth=-100, elevation=6, res=(1100, 1100))),
            ("crew-ventilator.png", (0.47, -0.05, 0.14), 1.4, dict(azimuth=-62, elevation=22, res=(1100, 1100))),
        ],
    )
