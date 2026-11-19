"""Complex 39A with mobile launcher 2 at the launch of AS-507 on 14 November 1969."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo Pad 39A, ML-2",
    lambda: build("A", detailed=True, arm2_quench=True),
    [
        ("ml2-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        ("ml2-quench.png", (12.0, 0.6, 55.25), 11.0, dict(azimuth=25, elevation=12, res=(1120, 700), only=("Service_Arm_2", "Arm2_Quench"))),
    ],
)
