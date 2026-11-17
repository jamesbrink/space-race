"""CSM-101 on SA-205, Apollo 7: exterior study. pnpm model apollo-7 --preview DIR."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "apollo", "vehicles"))
import apollo_csm  # noqa: E402
import launch_escape  # noqa: E402
import saturn_ib  # noqa: E402
from srlib import IN, run  # noqa: E402


def build():
    saturn_ib.build()
    apollo_csm.build(saturn_ib.CSM_OFFSET)
    launch_escape.build()
    return (
        f"SA-205: nominal Q-ball STA{saturn_ib.HEIGHT} in (224 ft), "
        f"{2 * saturn_ib.RADIUS * IN:.4f} m upper-stage diameter; engine contours provisional"
    )


run(
    "Apollo 7 CSM-101",
    build,
    [
        ("apollo-7-stack.png", (0, 0, 34), 140, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-7-csm.png",
            (0, 0, (saturn_ib.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=30, elevation=12, res=(1100, 1400), lens=55, only=("CM_", "SM_", "SPS_", "RCS_")),
        ),
        (
            "apollo-7-command-module.png",
            (0, 0, (saturn_ib.CSM_OFFSET + 330) * IN),
            10,
            dict(azimuth=25, elevation=17, res=(1200, 1000), lens=55, only="CM_"),
        ),
    ],
)
