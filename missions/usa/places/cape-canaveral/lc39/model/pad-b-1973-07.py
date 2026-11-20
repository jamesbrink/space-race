"""Complex 39B and ML-1 at the launch of Skylab 3 on 28 July 1973."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Skylab Pad 39B, ML-1",
    lambda: build("B", detailed=True, ecs_room=True, skylab=True, side_hinge=True, pad_b_floodlights=True),
    [
        ("ml1-july-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        ("july-pedestal.png", (0, 0, 35), 127, dict(azimuth=218, elevation=8, res=(1000, 900))),
    ],
)
