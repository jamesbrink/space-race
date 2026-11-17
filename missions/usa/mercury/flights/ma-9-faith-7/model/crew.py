"""L. Gordon Cooper, Jr., suited for Mercury-Atlas 9 on 15 May 1963. Run with `pnpm model ma-9`.

The suit is ../../../crew/mark_iv_suit.py, the one module the Mercury crews are built from, in the fit his photographs
give (`mark_iv_suit.MA_9`, the same the figure on the couch wears: his stature, his wrist rings, two microphones, the
round port on the right thigh). His suit's own changes for this flight (the boots made one with it, the life vest moved
to the left leg, new shoulders) are not built: ../spacecraft.md, "The pilot". The vehicle and the pad are vehicle.py and
pad.py beside this file.
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

COOPER = mark_iv_suit.MA_9


def build() -> str:
    height = mark_iv_suit.build(COOPER)
    return f"standing height {height:.3f} m in helmet and boots, pilot {COOPER.stature * CM:.3f} m (documented)"


if __name__ == "__main__":
    run(
        "ma-9 crew",
        build,
        [
            ("crew-front.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0.12, 0, 0.95), 4.7, dict(azimuth=-52, elevation=10)),
            ("crew-back.png", (0.12, 0, 0.95), 4.7, dict(azimuth=90, elevation=6)),
        ],
    )
