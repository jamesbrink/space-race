"""LM-12 Challenger before touchdown. The launch stack calls the same builder with its legs folded."""

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
    lunar_module.build(deployed=True, spacecraft=12, landed=True)
    return "31 ft over deployed footpads; 23 ft 1 in from pad plane to steerable antenna"


run(
    "Apollo 17 · Challenger LM-12",
    build,
    [
        ("challenger.png", (0, 0, 2.8), 18.5, dict(azimuth=32, elevation=15, res=(1024, 1000), lens=56)),
        (
            "challenger-pallet.png",
            (-1.38, -1.38, 2.35),
            2.95,
            dict(
                azimuth=230,
                elevation=20,
                res=(900, 800),
                lens=54,
                only=("LRV_BlueGravimeter", "LRV_Gravimeter", "LM12_SEP", "LRV_SEP", "LM12_Seismic", "LM12_ToolPallet"),
            ),
        ),
        (
            "challenger-array-e.png",
            (-1.34, 1.34, 2.15),
            3.1,
            dict(
                azimuth=134,
                elevation=18,
                res=(900, 800),
                lens=54,
                only=("LM12_ArrayE", "LM12_RTG", "LM12_CentralStationPallet", "LM12_Generator", "LM12_SEQFrame"),
            ),
        ),
    ],
)
