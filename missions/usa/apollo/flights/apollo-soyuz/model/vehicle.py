"""Saturn IB SA-210 with the stowed Docking Module and CSM-111."""

import sys
from importlib import import_module
from pathlib import Path

root = next(p for p in Path(__file__).resolve().parents if (p / "tools/blender").is_dir())
sys.path[:0] = [str(root / path) for path in ("tools/blender", "missions/usa/apollo/vehicles", "missions/usa/skylab/vehicles")]
apollo_csm = import_module("apollo_csm")
launch_escape = import_module("launch_escape")
saturn_ib = import_module("saturn_ib")
astp_docking_module = import_module("astp_docking_module")
skylab_ib_equipment = import_module("skylab_ib_equipment")
srlib = import_module("srlib")

# The 224-ft press-kit envelope agrees with the assumed SA-206 reference stations.
OFFSET = 2034.859 - apollo_csm.SM_BOTTOM
HEIGHT = 2681.859


def build():
    stages = saturn_ib.build(skylab_serial=210)
    skylab_ib_equipment.stage_equipment(210)
    apollo_csm.build(OFFSET, spacecraft=111)
    launch_escape.build(OFFSET, HEIGHT, boardable=True)
    astp_docking_module.build()
    for name in ("InstrumentUnitEquipment", "SecondStageTankStructure", "SecondStageEngine", "FirstStageTankStructure"):
        stages[name]["lineup_enclosed"] = True
    return f"SA-210, Q-ball STA {HEIGHT} in ({HEIGHT * srlib.IN:.3f} m); DM-2, 3.15 m between docking interfaces"


srlib.run(
    "Apollo–Soyuz · CSM-111 and SA-210",
    build,
    [
        ("sa210-stack.png", (0, 0, 34), 142, dict(azimuth=34, elevation=5, res=(850, 1350), lens=55)),
        (
            "dm2.png",
            (0, 0, astp_docking_module.SOYUZ_END + 1.5),
            8,
            dict(azimuth=-32, elevation=-24, res=(1000, 790), lens=52, only=("DM2_", "DS5_")),
        ),
    ],
)
