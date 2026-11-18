"""Atlas SLV-3 carrying GATV-5001 on its launch date at Complex 14."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path[:0] = [os.path.join(_root, directory) for directory in ("tools/blender", "missions/usa/gemini/vehicles", "missions/usa/mercury/vehicles")]

from agena_target_vehicle import GATV_5001  # noqa: E402
from atlas_slv3 import build  # noqa: E402
from srlib import run  # noqa: E402

if __name__ == "__main__":
    run("Atlas / GATV-5001", lambda: build(GATV_5001))
