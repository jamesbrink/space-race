"""Young's launch configuration. Stature from the Apollo 16 Press Kit crew biography."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402


def build():
    suit = a7l.standing("Young", stature=69 * 2.54, ev=True, a7lb=True, insignia=mission.with_name("apollo-16-insignia.jpg"))
    a7l.commander_bands()
    return suit


run("Apollo 16 Young", build, [("young.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
