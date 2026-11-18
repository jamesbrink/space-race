"""CSM-104 and LM-3 on SA-504, Apollo 9: the gallery exhibit, cut open to the cabin and the stages. pnpm model apollo-9 --preview DIR."""

import os
import sys

import bpy

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "apollo", "vehicles"))
import apollo_csm  # noqa: E402
import launch_escape  # noqa: E402
import lunar_module  # noqa: E402
import saturn_v  # noqa: E402
from srlib import IN, run  # noqa: E402


def build():
    saturn_v.build(lunar_module=lunar_module.build)
    apollo_csm.build(saturn_v.CSM_OFFSET, spacecraft=104)
    launch_escape.build(saturn_v.CSM_OFFSET, saturn_v.HEIGHT)
    # These stay behind opaque skins in both Lineup configurations. Gallery keeps them for inspection.
    for part in (
        "InstrumentUnitEquipment",
        "ThirdStageTankStructure",
        "ThirdStageEngine",
        "SecondStageTankStructure",
        "SecondStageEngines",
        "FirstStageTankStructure",
    ):
        bpy.data.objects[part]["lineup_enclosed"] = True
    return "Apollo 9, SA-504: 363 ft nominal height to the Q-ball"


run(
    "Apollo 9 CSM-104 and LM-3 and SA-504",
    build,
    [
        ("apollo-9-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-9-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1200, 1200), lens=55, only=("CM_", "SM_", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
