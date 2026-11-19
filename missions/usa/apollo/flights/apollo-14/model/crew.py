"""Shepard in his launch-day A7L, NASA KSC photograph 71PC-67."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402


def build():
    # Apollo 14 Press Kit, prime commander biography: 5 ft 11 in.
    a7l.standing("Shepard", stature=71 * 2.54, ev=True)
    a7l.commander_bands()
    return "Alan Shepard, A7L EV launch garment, fitted to 5 ft 11 in stature"


run("Apollo 14 commander", build, [("shepard.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
