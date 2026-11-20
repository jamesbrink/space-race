"""Skylab 3: CSM-117 aboard Saturn IB SA-207."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path[:0] = [str(root / path) for path in ("tools/blender", "missions/usa/apollo/vehicles", "missions/usa/skylab/vehicles")]
import apollo_csm  # noqa: E402
import launch_escape  # noqa: E402
import s150  # noqa: E402
import saturn_ib  # noqa: E402
from skylab_ib_equipment import stage_equipment  # noqa: E402
from srlib import IN, run  # noqa: E402

# MSFC-MAN-206, fig. 1-1: STA 2034.859, aft end of service module.
OFFSET = 2034.859 - apollo_csm.SM_BOTTOM
HEIGHT = 2681.859


def build():
    groups = saturn_ib.build(skylab_serial=207)
    stage_equipment(207)
    s150.build()
    apollo_csm.build(OFFSET, spacecraft=117)
    launch_escape.build(OFFSET, HEIGHT, boardable=True)
    for name in ("InstrumentUnitEquipment", "SecondStageTankStructure", "SecondStageEngine", "FirstStageTankStructure"):
        groups[name]["lineup_enclosed"] = True
    return f"SA-207, Q-ball STA {HEIGHT} in ({HEIGHT * IN:.3f} m); fin span 40.7 ft"


run(
    "Skylab 3 · CSM-117 and SA-207",
    build,
    [
        ("skylab-3-stack.png", (0, 0, 34), 140, dict(azimuth=28, elevation=4, res=(900, 1400), lens=55)),
        (
            "skylab-3-csm.png",
            (0, 0, (OFFSET + 211) * IN),
            24,
            dict(azimuth=32, elevation=12, res=(1000, 1000), lens=55, only=("CM", "SM", "SPS_", "RCS_", "HGA_", "DockingProbe")),
        ),
        (
            "skylab-3-s150.png",
            (-2.08, -2.08, (1662.859 + 19) * IN),
            1.8,
            dict(azimuth=45, elevation=10, res=(900, 760), lens=51, only="S150_"),
        ),
    ],
)
