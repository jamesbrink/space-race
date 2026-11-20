"""Complex 39A with mobile launcher 3 at the launch of AS-512 on 7 December 1972."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo Pad 39A, ML-3",
    lambda: build("A", detailed=True, intertank_lox=True, ecs_room=True, level200_purge=True, night_launch=True),
    [
        ("ml3-december-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        ("xenon-bank.png", (-46.94, -44.50, 1.28), 9.2, dict(azimuth=49, elevation=12, res=(1000, 800), only=("Xenon_Bank_1",))),
        ("arm7-vent.png", (6.25, 0.13, 99.15), 8.3, dict(azimuth=42, elevation=14, res=(1000, 800), only=("Arm7_Vent_Disconnect",))),
    ],
)
