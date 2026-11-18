"""Soyuz 4 on its first-generation 11A511, with the 7K-OK No. 12 inside its launch fairing."""

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
from srlib import MeshBuilder, group, run  # noqa: E402

# Flight clothing and stature reconstructed from period photography.
PILOT = Wearer("Shatalov", contrasting_headset=True)


def build() -> str:
    paints = soyuz_7kok.palette()
    soyuz_7kok.service(paints)
    soyuz_7kok.descent(paints)
    soyuz_7kok.orbit(paints)
    soyuz_7kok.rendezvous_lights(paints)
    soyuz_7kok.infrared_vertical(paints)
    soyuz_7kok.wing("Left", -1, paints)
    soyuz_7kok.wing("Right", 1, paints)
    rails = MeshBuilder()
    # Run inward of the rendezvous lamps toward the existing grab bars beside the hatch.
    for az in (-126, -54):
        points = [soyuz_7kok.polar(radius, az, z) for radius, z in ((1070, 5860), (1162, 5910), (1130, 6250), (998, 6520), (862, 6660))]
        for a, b in zip(points, points[1:]):
            soyuz_7kok.rod(rails, a, b, 12)
        for radius, z in ((1130, 6250), (998, 6520), (862, 6660)):
            soyuz_7kok.rod(rails, soyuz_7kok.polar(radius, az, z), soyuz_7kok.polar(radius - 115, az, z - 34), 10)
    rails.build("BO_EvaRailTubes", paints["alloy"], group("EvaHandrails"))
    soyuz_cabin.build(PILOT, hand_controls=True)
    return soyuz_11a511.build(soyuz_7kok.BOARDING_HATCH_AZIMUTH, soyuz_7kok.BOARDING_HATCH_STATION)


if __name__ == "__main__":
    base = soyuz_11a511.BASE_Z * soyuz_11a511.MM
    mid = base + soyuz_11a511.LENGTH * soyuz_11a511.MM / 2
    run(
        "soyuz-4 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )
