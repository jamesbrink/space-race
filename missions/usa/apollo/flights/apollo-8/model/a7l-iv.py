"""Standing IV launch garment, shared by LC-39 flights. Representative fit in cm."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402

run("A7L IV launch garment", lambda: a7l.standing("Launch crew", stature=178, ev=False), [])
