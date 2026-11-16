"""Valeriy Bykovskiy, suited for Vostok 5. Run with `pnpm model vostok-5`.

The suit is ../../../crew/sk_1.py as he wore it on 14 June 1963 (`BYKOVSKY`: the last SK-1 made, with the round valve's
pale disc at the collar, the pale neck and black gloves, read off the film and photographs of that day and the suit Zvezda
keeps: ../../../crew/sk-1.md). His height was not found, so the figure is the suit module's own, built to Gagarin's
recorded 165 cm (estimated: ../spacecraft.md, where his 90.7 kg in the suit, less the suit's 23 kg, is Gagarin's 68). The
helmet's "СССР" is the photographs'. The spacecraft is vehicle.py beside this file.
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
    sk_1.wear(sk_1.BYKOVSKY)
    height = sk_1.build()
    return f"standing height {height:.3f} m in helmet and boots, pilot {sk_1.STATURE * CM:.3f} m, helmet {2 * sk_1.HELMET_R * CM:.3f} m across"


if __name__ == "__main__":
    run(
        "vostok-5 crew",
        build,
        [
            ("crew-front.png", (0, 0, 0.86), 4.3, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0, 0, 0.86), 4.3, dict(azimuth=-52, elevation=10)),
        ],
    )
