"""Vostok 6 on its launch vehicle: Vostok 3KA No. 8 under its fairing on its 8K72K, as it stood on the
morning of 16 June 1963, two days after Vostok 5 left the same pad.

Run headless:
    pnpm model:vostok-6        (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The whole stack. The spacecraft type is ../../../vehicles/vostok_3ka.py and the launch vehicle
../../../vehicles/vostok_8k72k/; this file chooses what this flight's carried. The record
(../spacecraft.md) finds one thing that can be drawn in which No. 8 differed from No. 7: its pilot, a
woman in the SK-2, the SK-1 cut again for women (../../../crew/sk_1.py: TERESHKOVA; her height is an
estimate from a photograph). The white lining, the two television cameras and the cine camera are as
Vostok 5's, by the same call. Everything else is the type's, and is said there to be assumed where it
is. Stations are the spacecraft's (0 at its braking engine's nozzle, millimetres), so the launch
vehicle's base is at -30,530.

Top-level nodes (the viewer's part list keys on these names):
    DescentModule  EntryHatch  ParachuteHatch  Cabin  EjectionSeat  FilmCamera  TelevisionCameras
    RetainingStraps  CableMast  InstrumentModule  Antennas  GasBottles  RetroEngine
    Fairing  BlockE  Interstage  CoreStage  CoreEngine  Booster_B  Booster_V  Booster_G  Booster_D
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
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "crew"))
from mathutils import Vector  # noqa: E402

import sk_1  # noqa: E402
import vostok_3ka  # noqa: E402
import vostok_8k72k  # noqa: E402
from srlib import mark_shells, run  # noqa: E402


def pilot(parent, place) -> dict:
    """Tereshkova in the seat: the SK-2 (../../../crew/sk_1.py), visor down, "СССР" on the helmet."""
    sk_1.wear(sk_1.TERESHKOVA)
    return sk_1.build_seated(parent, place, "Pilot")


def build() -> str:
    # under the fairing the instrument module's antennas were folded: they are built stowed, and the flight's data lets them out
    vostok_3ka.build(pilot=pilot, stowed=True, film_camera=True, television=True, lining="white")
    az, lat = vostok_3ka.ENTRY
    # the fairing's opening is over hatch No. 1, where the line from the sphere's middle through the hatch meets the fairing
    summary = vostok_8k72k.build(hatch_az=az, hatch_z=vostok_3ka.Z_C + vostok_8k72k.common.FAIRING_R * math.tan(lat))
    mark_shells(vostok_8k72k.SHELLS)
    return summary


if __name__ == "__main__":
    MM = 0.001
    base = vostok_8k72k.BASE_Z * MM
    mid = base + vostok_8k72k.LENGTH * MM / 2
    S = vostok_3ka.seat_frame()
    at = lambda x, y, z: tuple(S @ Vector((x, y, z)) * MM)  # noqa: E731
    hatch = math.degrees(vostok_3ka.HATCH_AZ)
    # the cabin's contents out of the ball: the pilot, and what looks at her
    figure = ("Seat_", "Pilot")
    cabin = (*figure, "Tv_", "FilmCamera_", "Cabin_Instr", "Cabin_Glob", "Cabin_Panels", "Cabin_SeatRails")
    centre = (0, 0, vostok_3ka.Z_C * MM)
    run(
        "vostok-6 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 120, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, base + 33.0), 40, dict(azimuth=150, elevation=8, res=(1200, 1700))),
            ("cabin-right.png", centre, 4.6, dict(azimuth=225, elevation=12, res=(1500, 1300), only=cabin)),
            ("cabin-left.png", centre, 4.6, dict(azimuth=45, elevation=20, res=(1500, 1300), only=cabin)),
            ("cabin-above.png", centre, 4.6, dict(azimuth=135, elevation=62, res=(1500, 1300), only=cabin)),
            ("pilot-right.png", at(0, 150, 200), 3.4, dict(azimuth=225, elevation=10, res=(1500, 1300), only=figure)),
            ("pilot-left.png", at(0, 150, 200), 3.4, dict(azimuth=45, elevation=14, res=(1500, 1300), only=figure)),
            ("pilot-front.png", at(0, 150, 200), 3.4, dict(azimuth=hatch + 180, elevation=58, res=(1500, 1300), only=figure)),
            ("pilot-helmet.png", at(0, 700, 180), 1.25, dict(azimuth=hatch + 150, elevation=50, res=(1300, 1300), only=figure)),
            ("pilot-hands.png", at(0, 60, 260), 1.3, dict(azimuth=hatch + 200, elevation=55, res=(1300, 1100), only=figure)),
        ],
    )
