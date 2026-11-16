"""Site 1 at Tyuratam as it stood for Vostok 5, on the afternoon of 14 June 1963. Run with `pnpm model vostok-5`.

The place itself is ../../../../places/tyuratam/site_1.py: this script only names the day, and each thing the site's modules
build says whether it stood then (sitelib.stood). Nothing read says what had changed at the pad in the two years since
Vostok 2 but the fire of 1 June 1962 and its month of repairs (what they replaced is not recorded), Korolev's post under a
concrete canopy and a new room beside the bunker (Kamanin, August 1962), none of which is modelled: so it is built as the
modules have it, and ../../../../places/tyuratam/site-1.md, "What stood when", says so. That afternoon: the bus (Kamanin);
no record of the fillers; the people not built. The vehicle and the pilot are vehicle.py and crew.py beside this file; the
viewer hangs the vehicle in the supports.

`SITE1_WITH_VEHICLE=1` in the environment builds the vehicle in its place as well, so that the clearance
check and the stills see the two together. `SITE1_POSE=away` builds what was taken away as it was left
(the flight's data does this on the slider; here it is for the stills and the clearance check). Both are
for looking and checking: build to a scratch directory (`--out-dir`), never into public/models.
"""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "places", "tyuratam"))
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
    summary = site_1.build("1963-06-14")  # the pad as it stood on the day of the flight
    if POSE == "away":
        away()
    return summary


if __name__ == "__main__":
    # `SR_STILLS=day-` in the environment takes only the stills whose names begin so
    only = os.environ.get("SR_STILLS", "")
    stills = [
        ("pad-wide.png", (40, 0, -8), 330, dict(azimuth=-125, elevation=22, res=(1600, 1100))),
        ("pad-platform.png", (0, 0, 8), 120, dict(azimuth=-150, elevation=14, res=(1600, 1100))),
        ("service-wide.png", (-4, 0, 14), 135, dict(azimuth=-112, elevation=6, res=(1600, 1200))),
        ("service-eye.png", (-6, 0, 14), 62, dict(azimuth=207, elevation=-11.5, res=(1400, 1400))),
        ("service-mast.png", (5, 0.6, 16), 62, dict(azimuth=-28, elevation=6, res=(1200, 1500))),
        ("fixed-deck-eye.png", (-10, -3.5, 0.5), 20, dict(azimuth=185, elevation=3.2, res=(1600, 1100), lens=28.0)),
        ("day-south.png", (0, 0, 14.5), 262, dict(azimuth=-90, elevation=0.4, res=(1543, 1120), lens=170.0)),
    ]
    run("vostok-5 pad", build, [still for still in stills if still[0].startswith(only)])
