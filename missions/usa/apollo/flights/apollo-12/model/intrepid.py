"""LM-6 deployed for its independent lunar-orbit flight. Same builder as the launch stack."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "apollo", "vehicles"))
import lunar_module  # noqa: E402
from srlib import run  # noqa: E402


def build():
    lunar_module.build(deployed=True, spacecraft=6)
    return "31 ft deployed span over four footpads; 23 ft 1 in from pad plane to S-band antenna"


run(
    "Apollo 12 · Intrepid LM-6",
    build,
    [
        ("intrepid.png", (0, 0, 2.5), 20, dict(azimuth=15, elevation=10, res=(1100, 1100), lens=55)),
        (
            "intrepid-alsep.png",
            (-1.55, 1.55, 2.27),
            3.4,
            dict(
                azimuth=145,
                elevation=10,
                res=(1100, 850),
                lens=62,
                only=(
                    "LM6_Central",
                    "LM6_Folded",
                    "LM6_Passive",
                    "LM6_RTGPallet",
                    "LM6_Side",
                    "LM6_Generator",
                    "LM6_SEQFrame",
                    "LM6_Cask",
                    "LM6_Sealed",
                    "LM6_Station",
                ),
            ),
        ),
        (
            "intrepid-tv.png",
            (1.31, -1.32, 2.38),
            3.1,
            dict(
                azimuth=310,
                elevation=6,
                res=(1000, 850),
                lens=60,
                only=("LM6_Color", "LM6_TV", "LMSurfaceEquipment_Rack", "LM6_Container", "LM6_Sample"),
            ),
        ),
    ],
)
