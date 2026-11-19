"""Apollo 16 surface crew in their rover seats, used only while driving."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
from lunar_riders import build  # noqa: E402
from srlib import run  # noqa: E402

run("Apollo 16 lunar rover crew", lambda: build(16), [("riders-16.png", (0, 0, 0.94), 4.3, dict(azimuth=37, elevation=10, res=(850, 700), lens=49))])
