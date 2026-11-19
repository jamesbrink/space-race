"""Worden's launch configuration. Stature from the Apollo 15 Press Kit crew biography."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402


def build():
    suit = a7l.standing("Worden", stature=70.5 * 2.54, ev=False, a7lb=True)
    return suit


run("Apollo 15 Worden", build, [("worden.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
