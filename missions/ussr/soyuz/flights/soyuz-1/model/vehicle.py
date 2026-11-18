"""Soyuz 1 on its first-generation 11A511, with the 7K-OK No. 4 inside its launch fairing."""

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
from srlib import run  # noqa: E402


def build() -> str:
    soyuz_7kok.build()
    return soyuz_11a511.build()


if __name__ == "__main__":
    base = soyuz_11a511.BASE_Z * soyuz_11a511.MM
    mid = base + soyuz_11a511.LENGTH * soyuz_11a511.MM / 2
    run(
        "soyuz-1 vehicle",
        build,
        [
            ("stack.png", (0, 0, mid), 145, dict(azimuth=-60, elevation=6, res=(900, 1900))),
            ("upper.png", (0, 0, 7), 52, dict(azimuth=30, elevation=8, res=(1100, 1900))),
        ],
    )
