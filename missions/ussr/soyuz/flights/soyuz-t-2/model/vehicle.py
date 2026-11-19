"""Soyuz T-2, the first crewed 7K-ST, and its Soyuz-U launcher."""

import sys
from functools import partial
from pathlib import Path

_root = next(path for path in Path(__file__).resolve().parents if (path / "tools" / "blender").is_dir())
sys.path.insert(0, str(_root / "tools" / "blender"))
sys.path.insert(0, str(_root / "missions" / "ussr" / "voskhod" / "crew"))
for _programme in ("vostok", "voskhod", "soyuz"):
    sys.path.insert(0, str(_root / "missions" / "ussr" / _programme / "vehicles"))

import sokol_k  # noqa: E402
import soyuz_7kok  # noqa: E402
import soyuz_7kst  # noqa: E402
import soyuz_11a511  # noqa: E402
import soyuz_cabin  # noqa: E402
import soyuz_neptun  # noqa: E402
from flight_suit import Wearer  # noqa: E402
from soyuz_7kok import BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, MM  # noqa: E402
from srlib import group, material, run  # noqa: E402

COMMANDER = Wearer("Malyshev", breadth=0.98)
ENGINEER = Wearer("Aksyonov", breadth=0.96)


def build():
    paints = soyuz_7kok.palette()
    paints.update(
        quilt=material("soyuz-t-green-blanket", (0.063, 0.132, 0.085), roughness=0.86),
        tape=material("soyuz-t-green-bindings", (0.122, 0.172, 0.115), roughness=0.76),
        cells=material("soyuz-t-silicon", (0.019, 0.052, 0.148), 0.33, 0.31),
    )
    soyuz_7kst.service_module(paints)
    soyuz_7kok.descent(paints, heat_shield_base=2340)  # 2.14 m to the forward hatch, CAS 1980-045A.
    soyuz_7kst.orbital_module(paints)
    soyuz_7kst.igla(paints)
    for side, sign in (("Left", -1), ("Right", 1)):
        soyuz_7kst.solar_array(side, sign, paints)

    console = group("NeptunConsole", lineup_enclosed=True)
    soyuz_cabin.build(
        COMMANDER,
        port=ENGINEER,
        hand_controls=True,
        seated_figure=partial(sokol_k.build_seated, kv2=True),
        instruments=lambda _, pose: soyuz_neptun.build(console, pose),
        instrument_casters=(console,),
        instrument_body="Neptun_body",
    )
    launcher = soyuz_11a511.build(BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, transport=True)
    return f"{launcher}; {soyuz_7kst.LENGTH * MM:.3f} m aft to probe tip, {soyuz_7kst.SOLAR_SPAN * MM:.3f} m deployed wingspan"


if __name__ == "__main__":
    mid = (soyuz_11a511.BASE_Z + soyuz_11a511.TRANSPORT_LENGTH / 2) * MM
    run(
        "Soyuz T-2 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )
