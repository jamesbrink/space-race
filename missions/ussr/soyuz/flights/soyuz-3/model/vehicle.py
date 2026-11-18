"""Soyuz 3 on its first-generation 11A511, with the 7K-OK No. 10 inside its launch fairing."""

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
from flight_suit import Wearer  # noqa: E402
from srlib import run  # noqa: E402

# Beregovoy attributed fit problems to his 180 cm height (Challenge to Apollo, p. 661).
PILOT = Wearer("Beregovoy", stature=180.0, contrasting_headset=True)


def build() -> str:
    soyuz_7kok.build(PILOT, october_1968=True)
    return soyuz_11a511.build(soyuz_7kok.BOARDING_HATCH_AZIMUTH, soyuz_7kok.BOARDING_HATCH_STATION)


if __name__ == "__main__":
    base = soyuz_11a511.BASE_Z * soyuz_11a511.MM
    mid = base + soyuz_11a511.LENGTH * soyuz_11a511.MM / 2
    run(
        "soyuz-3 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )
