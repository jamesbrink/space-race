"""Irwin on the Moon, as he went out of the LM: A7LB extravehicular suit, PLSS -7 (crew/eva.py).

Stature from the Apollo 15 Press Kit crew biography (as lmp.py)."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import eva  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return eva.standing("Irwin", 68 * 2.54, a7lb=True, commander=False, plss=7)


run("Apollo 15 Irwin on the Moon", build, [("irwin-eva.png", (0, 0, 0.95), 4.4, dict(azimuth=-150, elevation=6, res=(620, 800), lens=50))])
