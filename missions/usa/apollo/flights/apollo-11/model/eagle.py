"""LM-5 deployed for its independent lunar-orbit flight. Same builder as the launch stack."""

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
    lunar_module.build(deployed=True, spacecraft=5)
    return "31 ft deployed span over four footpads; 23 ft 1 in from pad plane to S-band antenna"


run("Apollo 11 · Eagle LM-5", build, [("eagle.png", (0, 0, 2.5), 20, dict(azimuth=15, elevation=10, res=(1100, 1100), lens=55))])
