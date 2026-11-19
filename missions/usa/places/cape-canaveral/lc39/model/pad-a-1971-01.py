"""Complex 39A with mobile launcher 2 at the launch of AS-509 on 31 January 1971."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from lc39.hardware import build  # noqa: E402
from srlib import run  # noqa: E402

run(
    "Apollo Pad 39A, ML-2",
    lambda: build("A", detailed=True, arm2_quench=True, intertank_lox=True, rp1_valve=True),
    [
        ("ml2-1971-launcher.png", (10, 0, 64), 370, dict(azimuth=225, elevation=8, res=(880, 1200))),
        (
            "ml2-rp1-mast.png",
            (1.8, -8.50, 19.8),
            26.0,
            dict(
                azimuth=45,
                elevation=13,
                res=(840, 720),
                only=("RP1_Mast_Cutoff", "Tail_Boom_1_2", "Tail_Carrier_1_2", "Tail_Visor_1_2", "Tail_Service_Masts"),
            ),
        ),
        ("ml2-rp1-valve.png", (1.20, -9.04, 17.40), 3.4, dict(azimuth=220, elevation=12, res=(800, 680), only=("RP1_Mast_Cutoff",))),
    ],
)
