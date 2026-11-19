"""Shatalov on the Site 31 rail apron. His cabin figure supplies the clothing, headset and stature."""

import sys
from pathlib import Path

here = Path(__file__).resolve()
sys.path.insert(0, str(here.parent))
from vehicle import PILOT  # noqa: E402

sys.path.insert(0, str(here.parents[3] / "crew"))
from soyuz_walkout import run_walker  # noqa: E402

if __name__ == "__main__":
    run_walker(PILOT)
