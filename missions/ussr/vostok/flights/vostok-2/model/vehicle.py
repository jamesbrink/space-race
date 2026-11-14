"""Vostok 2 on its launch vehicle: Vostok 3KA No. 4 under its fairing on 8K72K No. E103-17, as it
stood on the morning of 6 August 1961.

Run headless:
    pnpm model:vostok-2        (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The whole stack. The spacecraft type is ../../../vehicles/vostok_3ka.py and the launch vehicle
../../../vehicles/vostok_8k72k/; this file chooses what this flight's carried, which the record
(../spacecraft.md) puts at one thing that can be drawn: the film camera in the cabin. Everything
else is the type's, and is said there to be assumed where it is. Stations are the spacecraft's
(0 at its braking engine's nozzle, millimetres), so the launch vehicle's base is at -30,530.

Top-level nodes (the viewer's part list keys on these names):
    DescentModule  EntryHatch  ParachuteHatch  Cabin  EjectionSeat  FilmCamera
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
import sk_1  # noqa: E402
import vostok_3ka  # noqa: E402
import vostok_8k72k  # noqa: E402
from srlib import mark_shells, run  # noqa: E402


def pilot(parent, place) -> dict:
    """Titov in the seat: the SK-1 (../../../crew/sk_1.py), visor down, "СССР" on the helmet as the reports of the
    morning have it. The figure is the suit module's own, 1.65 m: no document with Titov's height was found."""
    return sk_1.build_seated(parent, place, "Pilot")


def build() -> str:
    # under the fairing the instrument module's antennas were folded: they are built stowed, and the flight's data lets them out
    vostok_3ka.build(pilot=pilot, stowed=True, film_camera=True)
    az, lat = vostok_3ka.ENTRY
    # the fairing's opening is over hatch No. 1, where the line from the sphere's middle through the hatch meets the fairing
    summary = vostok_8k72k.build(hatch_az=az, hatch_z=vostok_3ka.Z_C + vostok_8k72k.common.FAIRING_R * math.tan(lat))
    mark_shells(vostok_8k72k.SHELLS)
    return summary


if __name__ == "__main__":
    MM = 0.001
    base = vostok_8k72k.BASE_Z * MM
    mid = base + vostok_8k72k.LENGTH * MM / 2
    run(
        "vostok-2 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 120, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, base + 33.0), 40, dict(azimuth=150, elevation=8, res=(1200, 1700))),
        ],
    )
