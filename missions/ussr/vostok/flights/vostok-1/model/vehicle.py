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
import vostok_cabin  # noqa: E402
from srlib import mark_shells, run  # noqa: E402


def pilot(parent, place) -> dict:
    """Gagarin in the seat: the SK-1 (../../../crew/sk_1.py) at his recorded 1.65 m, visor down, "СССР" on the helmet."""
    return sk_1.build_seated(parent, place, "Pilot")


def build() -> str:
    # under the fairing the instrument module's antennas were folded: they are built stowed, and the flight's data lets them out
    # the cabin is fitted as this ship flew: the board, control panel, hand controller and Vzor of 1961 (vehicles/vostok_cabin.py)
    vostok_3ka.build(pilot=pilot, stowed=True, fit="1961")
    az, lat = vostok_3ka.ENTRY
    # the fairing's opening is over hatch No. 1, where the line from the sphere's middle through the hatch meets the fairing
    summary = vostok_8k72k.build(hatch_az=az, hatch_z=vostok_3ka.Z_C + vostok_8k72k.common.FAIRING_R * math.tan(lat))
    mark_shells(vostok_8k72k.SHELLS)
    return summary


if __name__ == "__main__":
    MM = 0.001
    base = vostok_8k72k.BASE_Z * MM
    mid = base + vostok_8k72k.LENGTH * MM / 2
    centre = (0, 0, vostok_3ka.Z_C * MM)
    seat = ("Seat_", "Pilot", "Cabin_SeatRails")
    # the eyes are inside the helmet, and the hull and the fairing are between the cabin and the preview's light
    out = ("Pilot_Helmet", "DM_", "EntryHatch", "Fairing", "Cabin_Pressure", "Cabin_Padding", "ParachuteHatch")
    fit = ("Cabin_", "Gauge_", "Tele_", "Ctl_", "Lamp_", "Vzor_", "Globus_")
    hatch = math.degrees(vostok_3ka.HATCH_AZ)
    board = tuple(vostok_cabin.place(*vostok_cabin.BOARD_AT) * MM)
    panel = tuple(vostok_cabin.place(*vostok_cabin.PANEL_AT) * MM)
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
            # the third stage's engine, out of its stage; the braking engine from below; the seat and its pilot, out of the ball
            ("block-e-engine.png", (0, 0, base + 28.9), 5.2, dict(azimuth=-50, elevation=-12, res=(1300, 1300), only=("RD0109", "BlockE_Steering"))),
            ("block-e-base.png", (0, 0, base + 28.6), 9.0, dict(azimuth=-50, elevation=-38, res=(1400, 1200), only=("RD0109", "BlockE_"))),
            ("retro-engine.png", (0, 0, 0.25), 3.4, dict(azimuth=-60, elevation=-36, res=(1300, 1200), only=("Engine_",))),
            ("seat-right.png", centre, 4.4, dict(azimuth=225, elevation=10, res=(1500, 1300), only=seat)),
            ("seat-front.png", centre, 4.4, dict(azimuth=315, elevation=38, res=(1500, 1300), only=seat)),
            ("seat-view.png", "", 0, dict(seat="Seat_Pilot", lens=18, res=(1500, 1100), hide=out)),
            ("seat-board.png", "", 0, dict(seat="Seat_Pilot", lens=62, res=(1500, 1300), hide=out)),
            ("seat-vzor.png", "", 0, dict(seat="Seat_Pilot", lens=40, look=(0, -24), res=(1500, 1100), hide=out)),
            ("seat-left.png", "", 0, dict(seat="Seat_Pilot", lens=30, look=(38, 8), res=(1500, 1100), hide=out)),
            ("seat-right-hand.png", "", 0, dict(seat="Seat_Pilot", lens=30, look=(-42, -6), res=(1500, 1100), hide=out)),
            ("cabin-board.png", board, 1.5, dict(azimuth=hatch, elevation=-38, res=(1500, 1400), only=fit)),
            ("cabin-panel.png", panel, 1.9, dict(azimuth=hatch - 62, elevation=-6, res=(1400, 1500), only=fit)),
            ("cabin-fit.png", centre, 4.6, dict(azimuth=hatch + 28, elevation=-14, res=(1600, 1300), only=(*fit, *seat), hide=out)),
        ],
    )
