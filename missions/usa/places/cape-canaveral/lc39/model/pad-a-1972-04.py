"""Complex 39A with mobile launcher 3 at the launch of AS-511 on 16 April 1972."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo Pad 39A, ML-3",
    lambda: build("A", detailed=True, intertank_lox=True, ecs_room=True, level200_purge=True),
    [
        ("ml3-1972-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        ("level-200-console.png", (21.64, -1.52, 76.37), 4.7, dict(azimuth=210, elevation=7, res=(980, 800), only=("LH2_Purge_Console",))),
        ("level-200-installed.png", (21.64, -1.52, 76.37), 9, dict(azimuth=205, elevation=3, res=(1060, 740))),
    ],
)
