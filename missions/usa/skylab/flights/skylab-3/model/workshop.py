"""Skylab as the Skylab 3 crew found it on docking, 28 July 1973. See ../../../vehicles/workshop.md."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path[:0] = [str(root / path) for path in ("tools/blender", "missions/usa/apollo/vehicles", "missions/usa/skylab/vehicles")]
import workshop  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Skylab workshop, visit 3",
    lambda: workshop.build(3),
    [
        ("skylab-3-workshop.png", (0, 0, 13.5), 52, dict(azimuth=-62, elevation=18, res=(1200, 1200), lens=50)),
        ("skylab-3-sun-side.png", (0, 0, 13.5), 52, dict(azimuth=90, elevation=8, res=(1200, 1200), lens=50)),
        ("skylab-3-parasol.png", (0, 3.5, 7.0), 15, dict(azimuth=60, elevation=55, res=(1100, 1100), lens=50)),
        ("skylab-3-ports.png", (0, -1.0, 20.5), 9, dict(azimuth=-115, elevation=10, res=(1000, 1000), lens=50)),
    ],
)
