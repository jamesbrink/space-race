"""Apollo 16 lunar roving vehicle, deployed for a traverse."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "vehicles"))
from lunar_rover import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo 16 lunar rover",
    lambda: build(16),
    [
        ("lrv-16.png", (0, 0, 1.02), 8.0, dict(azimuth=41, elevation=16, res=(1160, 850), lens=54)),
        ("lrv-16-wheel.png", (1.143, 0.9144, 0.412), 2.05, dict(azimuth=67, elevation=8, res=(900, 780), lens=53)),
        ("lrv-16-stations.png", (-0.02, 0, 0.77), 3.7, dict(azimuth=148, elevation=28, res=(1080, 790), lens=48)),
        ("lrv-16-console.png", (0.20, 0, 0.91), 0.93, dict(azimuth=163, elevation=40, res=(850, 820), lens=56)),
    ],
)
