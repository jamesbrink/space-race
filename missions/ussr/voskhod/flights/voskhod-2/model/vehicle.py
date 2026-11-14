"""Voskhod 2 on its launch vehicle: Voskhod 3KD No. 4 under its fairing on 11A57 No. R15000-05, as it stood
on the morning of 18 March 1965, the Volga airlock folded on its side under the fairing's blister.

Run headless:
    pnpm model:voskhod-2       (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The whole stack. The spacecraft is ../../../vehicles/voskhod.py built as the 3KD (a Vostok 3KA altered: what
was the Vostok's is imported from ../../../../vostok/vehicles/vostok_3ka.py) and the launch vehicle
../../../vehicles/voskhod_11a57/; this file chooses what this flight's carried: two couches, the airlock,
and the two men in their Berkut suits (../spacecraft.md). Stations are the spacecraft's (0 at its braking
engine's nozzle, millimetres).

The airlock is built folded, and the flight's data draws it out. With VOSKHOD_AIRLOCK=extended in the
environment it is built as it stood in orbit instead: for stills only, never for the committed model.

Top-level nodes (the viewer's part list keys on these names):
    DescentModule  EntryHatch  ParachuteHatch  Cabin  CouchLeft  CouchRight  ReserveEngine
    Airlock  AirlockRing  AirlockHatch
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
from mathutils import Matrix, Vector  # noqa: E402

import berkut  # noqa: E402
import voskhod  # noqa: E402
import voskhod_11a57  # noqa: E402
import vostok_3ka  # noqa: E402
from srlib import run  # noqa: E402
from vostok_8k72k.common import FAIRING_R  # noqa: E402

EXTENDED = os.environ.get("VOSKHOD_AIRLOCK") == "extended"


# Who lay where. Leonov went aboard first and Belyayev after him (Belyayev's report), so Leonov's couch is the one
# further from the entry hatch: at the crew's left, next to the airlock's hatch.
CREW = {"Left": berkut.LEONOV, "Right": berkut.BELYAYEV}
# Where the pack Leonov wore outside is put: on edge at the cabin's left, in the place the third couch had left,
# its outer face toward the wall. In the couches' plane, millimetres. Where it was really stowed was not found.
PACK_AT = (700.0, -150.0, -60.0)


def crew(name: str, node, place) -> dict:
    """The man in a couch, in his Berkut suit (../../../crew/berkut.py); and beside Leonov, his pack."""
    keys = berkut.build_seated(node, place, f"Crew_{name}", CREW[name])
    if name == "Left":
        C = voskhod.couch_frame()
        C.translation = C.translation * 0.001
        turn = Matrix(((0, 0, 1), (0, 1, 0), (-1, 0, 0))).to_4x4()  # its outer face toward the crew's left, its top toward their heads
        berkut.build_pack(node, C @ Matrix.Translation(Vector(PACK_AT) * 0.001) @ turn, "Crew_Left_Pack")
    return keys


def build() -> str:
    # under the fairing the instrument module's antennas were folded: they are built stowed, and the flight's data lets them out
    voskhod.build("3KD", crew=crew, stowed=True, airlock_extended=EXTENDED)
    az, lat = vostok_3ka.ENTRY
    lock_az, lock_lat = voskhod.AIRLOCK
    # the fairing's opening is over hatch No. 1; its blister is over the airlock, where hatch No. 3's line meets the fairing
    return voskhod_11a57.build(
        hatch_az=az,
        hatch_z=vostok_3ka.Z_C + FAIRING_R * math.tan(lat),
        blister=None if EXTENDED else (lock_az, vostok_3ka.Z_C + FAIRING_R * math.tan(lock_lat)),
    )


if __name__ == "__main__":
    MM = 0.001
    base = voskhod_11a57.BASE_Z * MM
    mid = base + voskhod_11a57.LENGTH * MM / 2
    centre = (0, 0, vostok_3ka.Z_C * MM)
    lock = math.degrees(voskhod.AIRLOCK[0])
    feet = math.degrees(vostok_3ka.HATCH_AZ) + 90.0  # the way the crew's feet point: the viewer's cutaway opens on it
    A = voskhod.airlock_frame()
    along = lambda mm: tuple(A @ (Vector((0, 0, mm)) * MM))  # noqa: E731
    cabin = ("Couch", "Crew", "Cabin_Instr", "Cabin_Glob", "Cabin_Panels", "Cabin_Equip", "Cabin_Para", "Cabin_Lens", "AirlockHatch")
    ship = ("DM_", "EntryHatch", "ParachuteHatch", "Reserve", "Strap", "CableMast", "IM_", "Antenna", "Bottles", "Engine_", "Airlock")
    run(
        "voskhod-2 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 140, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper-blister.png", (0, 0, base + 38.0), 60, dict(azimuth=lock - 50, elevation=8, res=(1100, 1900))),
            ("upper-blister-side.png", (0, 0, base + 39.5), 30, dict(azimuth=lock - 90, elevation=4, res=(1100, 1500))),
            ("ship.png", (0, 0, 2.9), 15, dict(azimuth=lock - 70, elevation=14, res=(1500, 1500), only=ship)),
            ("ship-2.png", (0, 0, 2.9), 15, dict(azimuth=lock + 60, elevation=24, res=(1500, 1500), only=ship)),
            (
                "airlock.png",
                along(1500 if not EXTENDED else 2300),
                7.5 if not EXTENDED else 11,
                dict(azimuth=lock - 60, elevation=10, res=(1500, 1300), only=ship),
            ),
            ("airlock-head.png", along(1800 if not EXTENDED else 3500), 4.2, dict(azimuth=lock + 35, elevation=30, res=(1400, 1200), only=ship)),
            ("airlock-foot.png", along(1100), 4.2, dict(azimuth=lock - 75, elevation=-8, res=(1400, 1200), only=ship)),
            ("cabin-feet.png", centre, 5.2, dict(azimuth=feet, elevation=14, res=(1500, 1300), only=cabin)),
            ("cabin-above.png", centre, 5.2, dict(azimuth=feet, elevation=68, res=(1500, 1300), only=cabin)),
            ("cabin-left.png", centre, 5.2, dict(azimuth=feet + 90, elevation=16, res=(1500, 1300), only=cabin)),
            ("crew-right.png", centre, 4.4, dict(azimuth=feet - 60, elevation=36, res=(1500, 1300), only=("Couch", "Crew"))),
        ],
    )
