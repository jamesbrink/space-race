"""Mattingly's launch configuration. Stature from the Apollo 16 Press Kit crew biography."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return a7l.standing("Mattingly", stature=70 * 2.54, ev=False, a7lb=True, insignia=mission.with_name("apollo-16-insignia.jpg"))


run("Apollo 16 Mattingly", build, [("mattingly.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
