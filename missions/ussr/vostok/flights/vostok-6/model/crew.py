"""Valentina Tereshkova, suited for Vostok 6. Run with `pnpm model vostok-6`.

The suit is ../../../crew/sk_1.py as she wore it on 16 June 1963 (`TERESHKOVA`: the SK-2, the SK-1 cut again for a woman,
with "a decreased shoulder breadth" and "an increased hip girth" by its makers' account, thinner gloves, the valve's black
disc, no mirror on the right sleeve: ../../../crew/sk-1.md). The figure inside it is the suit module's own figure carried to
her height and build, not a figure modelled as a woman's: 1.64 m is what her proportion to her helmet gives in the
photograph of her report at the pad (no document gives her height), and every amount of the build is estimated. The
helmet's "СССР" is the photographs'. The spacecraft is vehicle.py beside this file, where the same figure sits in the seat.
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
    sk_1.wear(sk_1.TERESHKOVA)
    height = sk_1.build()
    return f"standing height {height:.3f} m in helmet and boots, pilot {sk_1.STATURE * CM:.3f} m, helmet {2 * sk_1.HELMET_R * CM:.3f} m across"


if __name__ == "__main__":
    run(
        "vostok-6 crew",
        build,
        [
            ("crew-front.png", (0, 0, 0.86), 4.3, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0, 0, 0.86), 4.3, dict(azimuth=-52, elevation=10)),
        ],
    )
