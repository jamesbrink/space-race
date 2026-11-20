"""Complex 39B with mobile launcher 3 as dated for Apollo 10 (May 1969): the launcher's articulated hold-down arms and tail service masts."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run("Apollo Pad 39B", lambda: build("B", detailed=True), [("pad-b-1969-05.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200)))])
