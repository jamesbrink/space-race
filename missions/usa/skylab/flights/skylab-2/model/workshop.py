"""Skylab as the Skylab 2 crew found it on docking, 25 May 1973. See ../../../vehicles/workshop.md."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path[:0] = [str(root / path) for path in ("tools/blender", "missions/usa/apollo/vehicles", "missions/usa/skylab/vehicles")]
import workshop  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Skylab workshop, visit 2",
    lambda: workshop.build(2),
    [
        ("skylab-2-workshop.png", (0, 0, 13.5), 52, dict(azimuth=-62, elevation=18, res=(1200, 1200), lens=50)),
        ("skylab-2-sun-side.png", (0, 0, 13.5), 52, dict(azimuth=90, elevation=8, res=(1200, 1200), lens=50)),
        ("skylab-2-damage.png", (-3.2, 1.6, 6.5), 13, dict(azimuth=150, elevation=10, res=(1100, 1100), lens=50)),
    ],
)
