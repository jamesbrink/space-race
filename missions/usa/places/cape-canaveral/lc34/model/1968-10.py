"""Cape Canaveral Launch Complex 34 on the morning of 11 October 1968."""

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "places", "cape-canaveral"))

from lc34 import grounds, pedestal, towers, transfer_van  # noqa: E402
from lc34.site import APRON_RADIUS, PEDESTAL_TOP, PRESS_KIT, SERVICE_PARK, SERVICE_TOP, TOWER_TOP, materials  # noqa: E402
from sitelib import Parts, as_of, stood  # noqa: E402
from srlib import FT, run  # noqa: E402

DATE = "1968-10-11"


def build():
    as_of(DATE)
    palette = materials()
    parts = Parts(palette)
    if stood("Launch Complex 34", since="1961-10-27", until="1971-11", confidence="documented", source=PRESS_KIT):
        for item in (
            pedestal.apron,
            pedestal.pedestal,
            pedestal.deflectors,
            pedestal.hold_downs,
            towers.umbilical_tower,
            grounds.roads,
            grounds.floods,
            grounds.blockhouse,
            grounds.propellant,
            grounds.operations,
        ):
            item(parts)
    if stood("Apollo-era service structure", since="1964", until="1972-04", confidence="documented", source=PRESS_KIT):
        towers.service_structure(parts)
    if stood("Post-Apollo 1 white room", since="1968", until="1972-04", confidence="documented", source=PRESS_KIT):
        towers.white_room(parts)
    parts.build()
    transfer_van.build(palette)
    return (
        f"{DATE}: apron {2 * APRON_RADIUS * FT:.2f} m, pedestal {PEDESTAL_TOP * FT:.2f} m, "
        f"tower {TOWER_TOP * FT:.2f} m, service structure {SERVICE_TOP * FT:.2f} m high"
    )


if __name__ == "__main__":
    run(
        "lc-34 as of 1968-10",
        build,
        [
            ("lc34-pad-eye.png", (0, 0, 16), 43, dict(azimuth=215, elevation=-18, res=(1500, 1050))),
            ("lc34-towers.png", (-50, -3, 30), 250, dict(azimuth=145, elevation=14, res=(1500, 1050))),
            ("lc34-pedestal.png", (0, 0, 3), 29, dict(azimuth=226, elevation=11, res=(1400, 1050))),
            ("lc34-service.png", (SERVICE_PARK * FT, 0, 45), 277, dict(azimuth=230, elevation=12, res=(1500, 1050))),
            ("lc34-van.png", (transfer_van.PARK_X * FT + 1.1, transfer_van.PARK_Y * FT, 1.15), 11, dict(azimuth=28, elevation=11, res=(1400, 1050))),
            ("lc34-white-room.png", (10, -5, 67), 21, dict(azimuth=215, elevation=10, res=(1400, 1050))),
            ("lc34-site.png", (-72, -25, 15), 790, dict(azimuth=245, elevation=41, res=(1500, 1050))),
        ],
    )
