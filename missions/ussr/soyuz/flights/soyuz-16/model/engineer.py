"""Nikolay Rukavishnikov in the launch garment modelled in this flight's cabin, standing at the pad."""

import sys
from pathlib import Path

model = Path(__file__).resolve().parent
sys.path.insert(0, str(model))
sys.path.insert(0, str(model.parents[2] / "crew"))
from vehicle import ENGINEER  # noqa: E402

from soyuz_walkout import run_walker  # noqa: E402

if __name__ == "__main__":
    run_walker(ENGINEER, "sokol-k")
