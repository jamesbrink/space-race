"""Bean on the Moon, as he went out of the LM: A7L extravehicular suit, PLSS -6 (crew/eva.py).

Stature from the Apollo 12 Press Kit, p. 79: "height: 5 feet 9 1/2 inches"."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import eva  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return eva.standing("Bean", 69.5 * 2.54, a7lb=False, commander=False, plss=6)


run("Apollo 12 Bean on the Moon", build, [("bean-eva.png", (0, 0, 0.95), 4.4, dict(azimuth=-150, elevation=6, res=(620, 800), lens=50))])
