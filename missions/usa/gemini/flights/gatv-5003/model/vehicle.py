"""GATV-5003, docking target for Gemini VIII. See the flight README."""

from __future__ import annotations

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path[:0] = [os.path.join(_root, directory) for directory in ("tools/blender", "missions/usa/gemini/vehicles", "missions/usa/mercury/vehicles")]

import agena_target_vehicle as target  # noqa: E402
from mercury_capsule import flag_image  # noqa: E402
from srlib import mark_shells, material, run  # noqa: E402


def build() -> str:
    flag = material("flag", (1, 1, 1), 0.0, 0.6, double_sided=True, image=flag_image())
    summary, shells = target.build(target.Axis((0, 0), 0, 0), flag, target.GATV_5003)
    mark_shells(shells)
    return summary


if __name__ == "__main__":
    run("GATV-5003", build)
