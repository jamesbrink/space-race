"""Spacecraft 10 on GLV-10 and its separately launched GATV-5005. See ../spacecraft.md."""

from __future__ import annotations

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
import agena_target_vehicle  # noqa: E402
import gemini_stack  # noqa: E402
import late_stack  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return late_stack.build(10, ("Young", "Collins"), agena_target_vehicle.GATV_5005)


if __name__ == "__main__":
    run("gt-10 vehicle", build, gemini_stack.previews(gemini_stack.target_previews("agena")))
