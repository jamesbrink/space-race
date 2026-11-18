"""GATV-5003, the dormant Gemini VIII Agena encountered by Gemini X in July 1966.

The target is centred on the origin with the engine exit at floor height. The S010 collector
is as Collins saw it before removing the hardware. See ../spacecraft.md.
"""

from __future__ import annotations

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path[:0] = [os.path.join(_root, directory) for directory in ("tools/blender", "missions/usa/gemini/vehicles", "missions/usa/mercury/vehicles")]

import agena_target_vehicle as agena  # noqa: E402
from mercury_capsule import flag_image  # noqa: E402
from srlib import mark_shells, material, run  # noqa: E402


def build() -> str:
    flag = material("flag", (1, 1, 1), 0.0, 0.6, double_sided=True, image=flag_image())
    summary, shells = agena.build(agena.Axis((0, 0), 0, 0), flag, agena.GATV_5003, recovered_samples=True)
    mark_shells(shells)
    return summary


if __name__ == "__main__":
    run("Gemini VIII Agena as met by Gemini X", build)
