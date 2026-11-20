"""Cernan's launch configuration. Stature from the Apollo 17 Press Kit crew biography."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from a7lb_emblems import sleeve_emblems  # noqa: E402
from srlib import run  # noqa: E402


def build():
    suit = a7l.standing(
        "Cernan", stature=72 * 2.54, ev=True, a7lb=True, insignia=mission.with_name("apollo-17-insignia.jpg"), sleeve_emblems=sleeve_emblems
    )
    a7l.commander_bands()
    return suit


run("Apollo 17 Cernan", build, [("cernan.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
