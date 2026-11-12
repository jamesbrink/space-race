"""Site 1 at Tyuratam as it stood for Vostok 1, on the morning of 12 April 1961. Run with `pnpm model:vostok-1`.

The place itself is ../../../sites/site_1.py, shared with the Vostoks that followed. The vehicle and the
pilot are vehicle.py and crew.py beside this file; the viewer hangs the vehicle in the supports.

`SITE1_WITH_VEHICLE=1` in the environment builds the vehicle in its place as well, so that the clearance
check and the stills see the two together. That is for looking and checking: build it to a scratch
directory (`--out-dir`), never into public/models.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "sites"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "crew"))
import bpy  # noqa: E402

import site_1  # noqa: E402
from srlib import group, run  # noqa: E402

WITH_VEHICLE = os.environ.get("SITE1_WITH_VEHICLE") == "1"


def vehicle() -> None:
    """The stack as vehicle.py builds it, hung where the flight's data hangs it: for the check and the stills only."""
    import math

    import vostok_3ka
    import vostok_8k72k

    vostok_3ka.build(pilot=None, stowed=True)
    az, lat = vostok_3ka.ENTRY
    vostok_8k72k.build(hatch_az=az, hatch_z=vostok_3ka.Z_C + vostok_8k72k.common.FAIRING_R * math.tan(lat))
    stand = group("VehicleForCheck")
    stand.location = (0.0, 0.0, site_1.TAIL_Z - vostok_8k72k.BASE_Z * 0.001)
    stand.rotation_euler = (0.0, 0.0, site_1.TURN)
    for obj in list(bpy.context.scene.objects):
        if obj.parent is None and obj is not stand:
            obj.parent = stand


def build() -> str:
    if WITH_VEHICLE:
        vehicle()
    return site_1.build("1961-04-12")  # the pad as it stood on the day of the flight


if __name__ == "__main__":
    run(
        "vostok-1 pad",
        build,
        [
            ("pad-wide.png", (40, 0, -8), 330, dict(azimuth=-125, elevation=22, res=(1600, 1100))),
            ("pad-platform.png", (0, 0, 8), 120, dict(azimuth=-150, elevation=14, res=(1600, 1100))),
            ("pad-tulip.png", (0, 0, 9), 60, dict(azimuth=-60, elevation=8, res=(1200, 1300))),
            ("pad-heads.png", (0, 0, 14), 26, dict(azimuth=-100, elevation=24, res=(1400, 1100))),
            ("pad-below.png", (0, 0, -4), 60, dict(azimuth=20, elevation=-22, res=(1400, 1100))),
            ("pad-pit.png", (40, 0, -25), 230, dict(azimuth=15, elevation=28, res=(1600, 1100))),
            ("pad-slot.png", (0, 0, -25), 80, dict(azimuth=35, elevation=8, res=(1400, 1100))),
        ],
    )
