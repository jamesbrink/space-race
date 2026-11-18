"""Leonov in his Berkut suit on Voskhod 2’s launch morning (../../../crew/berkut.md)."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "voskhod", "crew"))
import berkut  # noqa: E402
from srlib import run  # noqa: E402

if __name__ == "__main__":
    run(
        "voskhod-2 pilot",
        lambda: berkut.standing(berkut.LEONOV),
        [("pilot-front.png", (0, 0, 0.86), 4.3, dict(azimuth=-90, elevation=4))],
    )
