"""Aquarius returning to Earth, after the landing gear deployment and cabin filter conversion."""

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
    lunar_module.build(deployed=True, spacecraft=7)
    return "LM-7 with landing gear down (061:00:10 GET), stages joined; 31 ft span over four footpads"


run(
    "Apollo 13 · Aquarius LM-7",
    build,
    [
        ("aquarius.png", (0, 0, 2.5), 20, dict(azimuth=15, elevation=10, res=(1100, 1100), lens=55)),
        ("aquarius-mailbox.png", (0.435, 0.325, 4.55), 0.82, dict(azimuth=-69, elevation=14, res=(950, 800), lens=48, only=("LM7_Mailbox",))),
        (
            "aquarius-alsep.png",
            (-1.55, 1.55, 2.27),
            3.4,
            dict(
                azimuth=145,
                elevation=10,
                res=(1100, 850),
                lens=62,
                only=(
                    "LM7_Central",
                    "LM7_Folded",
                    "LM7_Passive",
                    "LM7_RTGPallet",
                    "LM7_Generator",
                    "LM7_SEQFrame",
                    "LM7_Lunar",
                    "LM7_Drill",
                    "LM7_Charged",
                    "LM7_Detector",
                    "LM7_Cold",
                    "LM7_Heat",
                ),
            ),
        ),
    ],
)
