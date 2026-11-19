"""Falcon in lunar landing configuration, before touchdown. Same builder as the launch stack."""

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
    lunar_module.build(deployed=True, spacecraft=10)
    return "31 ft deployed span over four footpads; 23 ft 1 in from pad plane to S-band antenna"


run(
    "Apollo 15 · Falcon LM-10",
    build,
    [
        ("falcon.png", (0, 0, 2.7), 19, dict(azimuth=42, elevation=13, res=(960, 1000), lens=56)),
        (
            "falcon-rover.png",
            (1.36, 1.36, 2.35),
            4.1,
            dict(
                azimuth=223,
                elevation=15,
                res=(900, 850),
                lens=53,
                only=("LM10_CenterChassis", "LM10_Folded", "LM10_DeploymentSupports", "LM10_Front", "LM10_Rear"),
            ),
        ),
    ],
)
