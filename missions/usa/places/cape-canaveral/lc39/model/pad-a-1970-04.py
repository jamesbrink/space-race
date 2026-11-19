"""Complex 39A with mobile launcher 3 at the launch of AS-508 on 11 April 1970."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo Pad 39A, ML-3",
    lambda: build("A", detailed=True, intertank_lox=True),
    [
        ("ml3-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        (
            "ml3-intertank.png",
            (7.35, 0, 35.72),
            6.2,
            dict(azimuth=215, elevation=20, res=(1120, 700), only=("Service_Arm_1", "Intertank_LOX_Carrier")),
        ),
    ],
)
