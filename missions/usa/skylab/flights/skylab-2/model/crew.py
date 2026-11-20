"""Conrad's launch configuration for SA-206. Stature from NASA TM X-58163, Appendix A."""

import sys
from pathlib import Path

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
from skylab_suit import launch_suit  # noqa: E402
from srlib import run  # noqa: E402


def build():
    return launch_suit("Conrad", 66.5, mission.with_name("skylab-i-insignia.jpg"), shoulder_inset=0)


run("Skylab 2 Conrad", build, [("conrad.png", (0, 0, 0.93), 4.2, dict(azimuth=-83, elevation=3, res=(620, 800), lens=50))])
