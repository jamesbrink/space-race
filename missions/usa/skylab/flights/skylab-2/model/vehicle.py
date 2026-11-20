"""Skylab 2: CSM-116 aboard Saturn IB SA-206."""

import math
import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path[:0] = [str(root / path) for path in ("tools/blender", "missions/usa/apollo/vehicles", "missions/usa/skylab/vehicles")]
import apollo_csm  # noqa: E402
import launch_escape  # noqa: E402
import sa206_equipment  # noqa: E402
import saturn_ib  # noqa: E402
from srlib import IN, run  # noqa: E402

# MSFC-MAN-206, fig. 1-1: STA 2034.859, aft end of service module.
OFFSET = 2034.859 - apollo_csm.SM_BOTTOM
HEIGHT = 2681.859


def build():
    groups = saturn_ib.build(skylab=True)
    sa206_equipment.build()
    apollo_csm.build(OFFSET, spacecraft=116)
    launch_escape.build(OFFSET, HEIGHT, boardable=True)
    for name in ("InstrumentUnitEquipment", "SecondStageTankStructure", "SecondStageEngine", "FirstStageTankStructure"):
        groups[name]["lineup_enclosed"] = True
    return f"SA-206, Q-ball STA {HEIGHT} in ({HEIGHT * IN:.3f} m); fin span 40.7 ft"


run(
    "Skylab 2 · CSM-116 and SA-206",
    build,
    [
        ("skylab-2-stack.png", (0, 0, 34), 140, dict(azimuth=28, elevation=4, res=(900, 1400), lens=55)),
        (
            "skylab-2-csm.png",
            (0, 0, (OFFSET + 211) * IN),
            24,
            dict(azimuth=32, elevation=12, res=(1000, 1000), lens=55, only=("CM", "SM", "SPS_", "RCS_", "HGA_", "DockingProbe")),
        ),
        (
            "skylab-2-m415.png",
            saturn_ib.radial(130, math.radians(-51), sa206_equipment.IU_BASE + 18),
            1.7,
            dict(azimuth=-50, elevation=3, res=(900, 760), lens=51, only=("M415_Panel1",)),
        ),
    ],
)
