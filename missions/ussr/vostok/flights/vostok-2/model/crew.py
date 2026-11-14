"""Gherman Titov, suited for Vostok 2. Run with `pnpm model:vostok-2`.

The suit is ../../../crew/sk_1.py, Vostok 1's, worn again: the SK-1 was made to each man's measure, and nothing read
says how Titov's differed from Gagarin's but the man in it. His height was not found (163 cm is printed on biography
pages that name no source), so the figure is the suit module's own, built to Gagarin's recorded 165 cm: estimated, and
said so in ../spacecraft.md. The helmet's "СССР" is the reports' of the morning. The spacecraft is vehicle.py beside
this file.
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
        "vostok-2 crew",
        build,
        [
            ("crew-front.png", (0, 0, 0.86), 4.3, dict(azimuth=-90, elevation=4)),
            ("crew-three-quarter.png", (0, 0, 0.86), 4.3, dict(azimuth=-52, elevation=10)),
        ],
    )
