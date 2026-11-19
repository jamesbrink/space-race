"""Apollo-era Complex 39B, for Apollo 10."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run("Apollo Pad 39B", lambda: build("B"), [("pad-b.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200)))])
