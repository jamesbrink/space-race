"""Vostok 1 on its launch vehicle: Vostok 3KA No. 3 under its fairing on 8K72K No. E103-16, as it
stood on the morning of 12 April 1961.

Run headless:
    pnpm model:vostok-1        (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The whole stack. The spacecraft type is ../../../vehicles/vostok_3ka.py and the launch vehicle
../../../vehicles/vostok_8k72k/; this file chooses what this flight's carried. Stations are the
spacecraft's (0 at its braking engine's nozzle, millimetres), so the launch vehicle's base is at
-30,530. Its pad (Site 1) is not built. See ../spacecraft.md and ../../../vehicles/vostok-8k72k.md
for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    DescentModule  EntryHatch  ParachuteHatch  Cabin  EjectionSeat
    RetainingStraps  CableMast  InstrumentModule  GasBottles  RetroEngine
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
import vostok_3ka  # noqa: E402
import vostok_8k72k  # noqa: E402
from srlib import mark_shells, run  # noqa: E402

PILOT_STATURE = 1570.0  # mm: Gagarin, as widely given (no primary record read)
HELMET_LETTERING = "СССР"  # painted on the helmet in red on the morning of the flight


def build() -> str:
    # under the fairing the instrument module's antennas were folded: they are built stowed, and the flight's data lets them out
    vostok_3ka.build(stature=PILOT_STATURE, lettering=HELMET_LETTERING, stowed=True)
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
        "vostok-1 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 120, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("stack-cut.png", (0, 0, mid), 120, dict(azimuth=-135, elevation=6, res=(900, 1900))),
            ("base.png", (0, 0, base + 0.2), 26, dict(azimuth=-60, elevation=-62, res=(1500, 1500))),
            ("base-side.png", (0, 0, base + 2.0), 30, dict(azimuth=-40, elevation=-8, res=(1600, 1200))),
            ("tips.png", (0, 0, base + 19.8), 22, dict(azimuth=-45, elevation=12, res=(1500, 1300))),
            ("upper.png", (0, 0, base + 33.0), 40, dict(azimuth=150, elevation=8, res=(1200, 1700))),
            ("truss.png", (0, 0, base + 28.4), 16, dict(azimuth=-50, elevation=-6, res=(1500, 1200))),
        ],
    )
