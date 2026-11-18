"""Apollo 7, Cunningham in his intravehicular A7L pressure suit."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402

run("Apollo 7 Cunningham", lambda: a7l.standing("Cunningham"), [("lmp-front.png", (0, 0, 0.95), 4.7, dict(azimuth=-84, elevation=3))])
