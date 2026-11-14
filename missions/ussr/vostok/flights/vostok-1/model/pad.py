"""Site 1 at Tyuratam as it stood for Vostok 1, on the morning of 12 April 1961. Run with `pnpm model:vostok-1`.

The place itself is ../../../sites/site_1.py, shared with the Vostoks that followed. The vehicle and the
pilot are vehicle.py and crew.py beside this file; the viewer hangs the vehicle in the supports.

`SITE1_WITH_VEHICLE=1` in the environment builds the vehicle in its place as well, so that the clearance
check and the stills see the two together. `SITE1_POSE=away` builds what was taken away as it was left:
the erector's boom down and the wagon drawn back, the service trusses lowered, the cable mast swung clear
(the flight's data does this on the slider; here it is for the stills and the clearance check). Both are
for looking and checking: build to a scratch directory (`--out-dir`), never into public/models.
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
POSE = os.environ.get("SITE1_POSE")


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


def away() -> None:
    """Turn each moving piece to where the morning left it, as flight.ts's moves do: for the stills and the check."""
    import math

    from site1 import cable_mast, erector, service_trusses
    from site1.steel import Turned

    def swing(name: str, out, degrees: float) -> None:
        obj = bpy.data.objects[name]
        obj.rotation_mode = "AXIS_ANGLE"
        obj.rotation_axis_angle = (math.radians(degrees), -out[1], out[0], 0.0)  # about the hinge, its top going outward

    swing("ServiceTruss_North", Turned(45.0).out, service_trusses.FALL)
    swing("ServiceTruss_South", Turned(225.0).out, service_trusses.FALL)
    swing("UpperCableMast", Turned(cable_mast.AZ).out, cable_mast.FALL)
    swing("Erector_Boom", (-1.0, 0.0), 90.0 + math.degrees(erector.LEAN))
    bpy.data.objects["Erector"].location.x -= erector.ROLL[0]
    for name in ("TankCar_Oxygen", "TankCar_Kerosene"):
        bpy.data.objects[name].location.x -= 180.0


def build() -> str:
    if WITH_VEHICLE:
        vehicle()
    summary = site_1.build("1961-04-12")  # the pad as it stood on the day of the flight
    if POSE == "away":
        away()
    return summary


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
            # what served the rocket: from across the deck, from a man's eye height, and each piece close to
            ("service-wide.png", (-4, 0, 14), 135, dict(azimuth=-112, elevation=6, res=(1600, 1200))),
            ("service-eye.png", (-6, 0, 14), 62, dict(azimuth=207, elevation=-11.5, res=(1400, 1400))),
            ("service-north.png", (-14, 0, 12), 120, dict(azimuth=95, elevation=5, res=(1700, 1200))),
            ("service-stairs.png", (-13, 3.2, 2.4), 13, dict(azimuth=150, elevation=-3.5, res=(1400, 1100))),
            ("service-bridge.png", (-2.6, 0.4, 27), 15, dict(azimuth=128, elevation=14, res=(1400, 1100))),
            ("service-trusses.png", (0, 0, 16), 52, dict(azimuth=38, elevation=12, res=(1400, 1300))),
            ("service-rings.png", (0, 3, 19), 18, dict(azimuth=70, elevation=28, res=(1400, 1100))),
            ("service-mast.png", (5, 0.6, 16), 62, dict(azimuth=-28, elevation=6, res=(1200, 1500))),
            ("service-erector.png", (-20, 0, 9), 75, dict(azimuth=-118, elevation=7, res=(1600, 1200))),
            ("service-drawn-off.png", (-48, 0, 4), 62, dict(azimuth=-112, elevation=9, res=(1600, 1000))),
            # what is fixed on the deck and in the pit: along the rails at a man's eye height, the masts against the sky,
            # one mast's head, the small building; from the pit's floor up at the deflector, the trenches and the sump,
            # the road down, the cut in the north rim
            ("fixed-deck-eye.png", (-10, -3.5, 0.5), 20, dict(azimuth=185, elevation=3.2, res=(1600, 1100), lens=28.0)),
            ("fixed-masts.png", (0, 0, 16), 150, dict(azimuth=-135, elevation=3, res=(1600, 1200))),
            ("fixed-mast-head.png", (22, 19.4, 31.5), 15, dict(azimuth=205, elevation=8, res=(1200, 1400))),
            ("fixed-stair-head.png", (-18.4, 7.8, 1.2), 16, dict(azimuth=-150, elevation=6, res=(1400, 1000))),
            ("fixed-pit-floor.png", (0, 0, -24), 78, dict(azimuth=0, elevation=-12.5, res=(1500, 1300))),
            ("fixed-trenches.png", (34, 0, -44), 64, dict(azimuth=25, elevation=33, res=(1600, 1100))),
            ("fixed-road.png", (130, 0, -22), 170, dict(azimuth=-35, elevation=24, res=(1600, 1000))),
            ("fixed-notch.png", (-2, 92, -4), 85, dict(azimuth=55, elevation=32, res=(1500, 1100))),
        ],
    )
