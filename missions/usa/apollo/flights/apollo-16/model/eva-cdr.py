"""Young on the Moon, as he went out of the LM: A7LB extravehicular suit, PLSS -7 (crew/eva.py).

Stature from the Apollo 16 Press Kit, p. 126 (a7l.md)."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import eva  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return eva.standing("Young", 69 * 2.54, a7lb=True, commander=True, plss=7)


run("Apollo 16 Young on the Moon", build, [("young-eva.png", (0, 0, 0.95), 4.4, dict(azimuth=-150, elevation=6, res=(620, 800), lens=50))])
