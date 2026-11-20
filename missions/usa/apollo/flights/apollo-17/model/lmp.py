"""Schmitt's launch configuration. Stature from the Apollo 17 Press Kit crew biography."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from a7lb_emblems import sleeve_emblems  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return a7l.standing(
        "Schmitt", stature=69 * 2.54, ev=True, a7lb=True, insignia=mission.with_name("apollo-17-insignia.jpg"), sleeve_emblems=sleeve_emblems
    )


run("Apollo 17 Schmitt", build, [("schmitt.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
