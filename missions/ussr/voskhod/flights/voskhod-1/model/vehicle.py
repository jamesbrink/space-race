"""Voskhod 1 on its launch vehicle: Voskhod 3KV No. 3 under its fairing on 11A57 No. R15000-04, as it stood
on the morning of 12 October 1964.

Run headless:
    pnpm model:voskhod-1       (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The whole stack. The spacecraft is ../../../vehicles/voskhod.py (which builds a Vostok 3KA altered, importing
what was the Vostok's from ../../../../vostok/vehicles/vostok_3ka.py) and the launch vehicle
../../../vehicles/voskhod_11a57/ (the Vostok launcher's core and boosters under a larger third stage); this
file chooses what this flight's carried: the 3KV's three couches, and the three men in them (../spacecraft.md).
Stations are the spacecraft's (0 at its braking engine's nozzle, millimetres).

Top-level nodes (the viewer's part list keys on these names):
    DescentModule  EntryHatch  ParachuteHatch  Cabin  CouchLeft  CouchCentre  CouchRight  ReserveEngine
    RetainingStraps  CableMast  InstrumentModule  Antennas  GasBottles  RetroEngine
    Fairing  BlockI  AftSection  Interstage  CoreStage  CoreEngine  Booster_B  Booster_V  Booster_G  Booster_D
"""

from __future__ import annotations

import math
import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "voskhod", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "voskhod", "crew"))
from mathutils import Vector  # noqa: E402

import flight_suit  # noqa: E402
import voskhod  # noqa: E402
import voskhod_11a57  # noqa: E402
import vostok_3ka  # noqa: E402
from srlib import run  # noqa: E402
from vostok_8k72k.common import FAIRING_R  # noqa: E402

# Who lay where. The commander was the last aboard and lay next to the entry hatch, the doctor the first and the
# furthest from it, the engineer between them (../README.md): so, with the hatch at the crew's right, from their left.
CREW = {"Left": flight_suit.YEGOROV, "Centre": flight_suit.FEOKTISTOV, "Right": flight_suit.KOMAROV}


def crew(name: str, node, place) -> None:
    """The man in a couch, in what he flew in (../../../crew/flight_suit.py)."""
    flight_suit.build_seated(node, place, f"Crew_{name}", CREW[name])


def build() -> str:
    # under the fairing the instrument module's antennas were folded: they are built stowed, and the flight's data lets them out
    voskhod.build("3KV", crew=crew, stowed=True)
    az, lat = vostok_3ka.ENTRY
    # the fairing's opening is over hatch No. 1, where the line from the sphere's middle through the hatch meets the fairing
    return voskhod_11a57.build(hatch_az=az, hatch_z=vostok_3ka.Z_C + FAIRING_R * math.tan(lat))


if __name__ == "__main__":
    MM = 0.001
    base = voskhod_11a57.BASE_Z * MM
    mid = base + voskhod_11a57.LENGTH * MM / 2
    C = voskhod.couch_frame()
    at = lambda x, y, z: tuple(C @ Vector((x, y, z)) * MM)  # noqa: E731
    centre = (0, 0, vostok_3ka.Z_C * MM)
    feet = math.degrees(vostok_3ka.HATCH_AZ) + 90.0  # the way the crew's feet point: the viewer's cutaway opens on it
    cabin = ("Couch", "Crew", "Cabin_Instr", "Cabin_Glob", "Cabin_Panels", "Cabin_Equip", "Cabin_Para", "Cabin_Lens")
    ship = ("DM_", "EntryHatch", "ParachuteHatch", "Reserve", "Strap", "CableMast", "IM_", "Antenna", "Bottles", "Engine_")
    run(
        "voskhod-1 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 140, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, base + 38.0), 60, dict(azimuth=150, elevation=8, res=(1100, 1900))),
            (
                "third-stage.png",
                (0, 0, base + 32.5),
                26,
                dict(azimuth=30, elevation=4, res=(1300, 1500), only=("BlockI", "RD0108", "AftSection", "Interstage")),
            ),
            ("engine.png", (0, 0, base + 29.4), 13, dict(azimuth=30, elevation=-28, res=(1400, 1100), only=("BlockI", "RD0108"))),
            ("ship.png", (0, 0, 2.5), 13, dict(azimuth=200, elevation=14, res=(1300, 1500), only=ship)),
            ("ship-2.png", (0, 0, 2.5), 13, dict(azimuth=20, elevation=24, res=(1300, 1500), only=ship)),
            ("reserve.png", (0, 0, 4.5), 5.0, dict(azimuth=200, elevation=18, res=(1300, 1200), only=ship)),
            ("cabin-feet.png", centre, 5.2, dict(azimuth=feet, elevation=14, res=(1500, 1300), only=cabin)),
            ("cabin-above.png", centre, 5.2, dict(azimuth=feet, elevation=68, res=(1500, 1300), only=cabin)),
            ("cabin-left.png", centre, 5.2, dict(azimuth=feet + 90, elevation=16, res=(1500, 1300), only=cabin)),
            ("cabin-right.png", centre, 5.2, dict(azimuth=feet - 90, elevation=16, res=(1500, 1300), only=cabin)),
            ("couch.png", at(-500, 150, 0), 3.2, dict(azimuth=feet - 40, elevation=30, res=(1400, 1200), only=("CouchRight", "Crew_Right"))),
        ],
    )
