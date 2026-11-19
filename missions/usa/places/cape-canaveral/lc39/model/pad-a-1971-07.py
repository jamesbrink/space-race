"""Complex 39A with mobile launcher 3 at the launch of AS-510 on 26 July 1971."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo Pad 39A, ML-3",
    lambda: build("A", detailed=True, intertank_lox=True, ecs_room=True),
    [
        ("ml3-1971-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        ("pad-a-ecs-room.png", (34.1, 81.6, -10), 57, dict(azimuth=108, elevation=5, res=(1100, 700))),
        ("pad-a-ecs-plenum.png", (35.3, 81.6, -10.25), 16, dict(azimuth=125, elevation=8, res=(960, 640))),
    ],
)
