"""Shepard on the Moon, as he went out of the LM: A7L extravehicular suit, PLSS -6 (crew/eva.py).

Stature from the Apollo 14 Press Kit, prime commander biography: 5 ft 11 in (as crew.py)."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import eva  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return eva.standing("Shepard", 71 * 2.54, a7lb=False, commander=True, plss=6)


run("Apollo 14 Shepard on the Moon", build, [("shepard-eva.png", (0, 0, 0.95), 4.4, dict(azimuth=-150, elevation=6, res=(620, 800), lens=50))])
