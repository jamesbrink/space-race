"""Skylab 4: CSM-118 aboard Saturn IB SA-208."""

import sys
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path[:0] = [str(root / path) for path in ("tools/blender", "missions/usa/apollo/vehicles", "missions/usa/skylab/vehicles")]
import apollo_csm  # noqa: E402
import launch_escape  # noqa: E402
import sa208_fins  # noqa: E402
import saturn_ib  # noqa: E402
from skylab_ib_equipment import stage_equipment  # noqa: E402
from srlib import IN, run  # noqa: E402

# MSFC-MAN-206, fig. 1-1: STA 2034.859, aft end of service module.
OFFSET = 2034.859 - apollo_csm.SM_BOTTOM
HEIGHT = 2681.859


def build():
    groups = saturn_ib.build(skylab_serial=208)
    stage_equipment(208)
    sa208_fins.build(groups["FirstStageTankStructure"])
    apollo_csm.build(OFFSET, spacecraft=118)
    launch_escape.build(OFFSET, HEIGHT, boardable=True)
    for name in ("InstrumentUnitEquipment", "SecondStageTankStructure", "SecondStageEngine", "FirstStageTankStructure"):
        groups[name]["lineup_enclosed"] = True
    return f"SA-208, Q-ball STA {HEIGHT} in ({HEIGHT * IN:.3f} m); fin span 40.7 ft"


run(
    "Skylab 4 · CSM-118 and SA-208",
    build,
    [
        ("skylab-4-stack.png", (0, 0, 34), 140, dict(azimuth=28, elevation=4, res=(900, 1400), lens=55)),
        (
            "skylab-4-csm.png",
            (0, 0, (OFFSET + 211) * IN),
            24,
            dict(azimuth=32, elevation=12, res=(1000, 1000), lens=55, only=("CM", "SM", "SPS_", "RCS_", "HGA_", "DockingProbe")),
        ),
        (
            "skylab-4-fin-repair.png",
            sa208_fins.POSITION_FOUR,
            1.12,
            dict(azimuth=62, elevation=19, res=(1060, 800), lens=49, only="SA208_F4_"),
        ),
    ],
)
