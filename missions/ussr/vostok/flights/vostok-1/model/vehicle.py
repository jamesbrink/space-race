"""Vostok 3KA No. 3, "Vostok", as flown by Yuri Gagarin on 12 April 1961.

Run headless:
    pnpm model:vostok-1        (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The spacecraft alone, as it was in orbit: antennas out, the straps and the cable mast still
holding the two modules together. Its launch vehicle (8K72K) and its pad (Site 1) are not built
yet. The spacecraft type is ../../../vehicles/vostok_3ka.py; this file chooses what No. 3 carried.
See ../spacecraft.md for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    DescentModule  EntryHatch  ParachuteHatch  Cabin  EjectionSeat
    RetainingStraps  CableMast  InstrumentModule  GasBottles  RetroEngine
"""

from __future__ import annotations

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "ussr", "vostok", "vehicles"))
import vostok_3ka  # noqa: E402
from srlib import run  # noqa: E402

PILOT_STATURE = 1570.0  # mm: Gagarin, as widely given (no primary record read)
HELMET_LETTERING = "СССР"  # painted on the helmet in red on the morning of the flight


def build() -> str:
    return vostok_3ka.build(stature=PILOT_STATURE, lettering=HELMET_LETTERING)


if __name__ == "__main__":
    mid = vostok_3ka.LENGTH / 2 * vostok_3ka.MM
    run(
        "vostok-1 vehicle",
        build,
        [
            ("vehicle-side.png", (0, 0, mid), 15, dict(azimuth=-135, elevation=4, res=(1300, 1400))),
            ("vehicle-hatch.png", (0, 0, mid + 0.7), 11, dict(azimuth=150, elevation=22, res=(1200, 1200))),
            ("vehicle-aft.png", (0, 0, 1.0), 12, dict(azimuth=60, elevation=-28, res=(1200, 1200))),
            ("vehicle-top.png", (0, 0, mid + 0.9), 11, dict(azimuth=20, elevation=42, res=(1200, 1200))),
        ],
    )
