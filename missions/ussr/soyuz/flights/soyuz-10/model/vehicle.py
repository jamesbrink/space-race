"""Soyuz 10, 7K-OKS No. 31 and its 11A511. Spacecraft stations in millimetres from the aft end."""

from __future__ import annotations

import sys
from pathlib import Path

_root = next(path for path in Path(__file__).resolve().parents if (path / "tools" / "blender").is_dir())
sys.path.insert(0, str(_root / "tools" / "blender"))
sys.path.insert(0, str(_root / "missions" / "ussr" / "voskhod" / "crew"))
for _programme in ("vostok", "voskhod", "soyuz"):
    sys.path.insert(0, str(_root / "missions" / "ussr" / _programme / "vehicles"))

import soyuz_7kok  # noqa: E402
import soyuz_11a511  # noqa: E402
import soyuz_cabin  # noqa: E402
from flight_suit import Wearer  # noqa: E402
from soyuz_7kok import BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION, metres, rod, surface  # noqa: E402
from soyuz_station import PROBE_TIP, docking_unit, orbital_module  # noqa: E402
from srlib import MeshBuilder, frame, group, run  # noqa: E402

# Shatalov is in the centre; the outboard arrangement follows the RKK Energia trainer photo.
# Crew clothing, figure proportions and poses are reconstructed.
COMMANDER = Wearer("Shatalov", wool_colour=(0.13, 0.087, 0.081))
PORT = Wearer("Rukavishnikov", breadth=0.97, wool_colour=(0.082, 0.088, 0.098))
STARBOARD = Wearer("Yeliseyev", breadth=0.97, wool_colour=(0.145, 0.169, 0.195))


def rendezvous_antennas(paints):
    root = soyuz_7kok.igla_antenna(paints)
    brackets = MeshBuilder()
    for side, sign in (("Left", -1), ("Right", 1)):
        rod(brackets, (sign * 974, -350, 5960), (sign * 1084, -350, 6030), 20)
        boom = group("IglaAux" + side, root)
        boom.location = metres((sign * 1084, -350, 6030))
        mast = MeshBuilder()
        rod(mast, (0, 0, 0), (0, 0, 605), 19)
        rod(mast, (0, -27, 22), (0, -27, 535), 7)
        mast.build(boom.name + "_Mast", paints["alloy"], boom)
        dish = frame(metres((0, 0, 605)), (0, -1, 0))
        surface(boom, boom.name + "_Dish", paints["white"], [(0, -38), (54, -31), (97, -11), (104, 0), (99, 5), (54, -22), (0, -26)], dish, 40)
        surface(boom, boom.name + "_Feed", paints["foil"], [(14, -30), (12, 13), (22, 22), (0, 22)], dish, 24)
    brackets.build("Igla_AuxBearings", paints["foil"], root)


def build() -> str:
    paints = soyuz_7kok.palette()
    soyuz_7kok.service(paints, aft_torus=False)
    soyuz_7kok.descent(paints)
    orbital_module(paints)
    docking_unit(paints)
    rendezvous_antennas(paints)
    soyuz_7kok.infrared_vertical(paints)
    soyuz_7kok.wing("Left", -1, paints)
    soyuz_7kok.wing("Right", 1, paints)
    soyuz_cabin.build(COMMANDER, port=PORT, starboard=STARBOARD, hand_controls=True)
    launcher = soyuz_11a511.build(BOARDING_HATCH_AZIMUTH, BOARDING_HATCH_STATION)
    return f"{launcher}; {PROBE_TIP * soyuz_7kok.MM:.3f} m aft end to probe tip"


if __name__ == "__main__":
    base = soyuz_11a511.BASE_Z * soyuz_11a511.MM
    mid = base + soyuz_11a511.LENGTH * soyuz_11a511.MM / 2
    run(
        "soyuz-10 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )
