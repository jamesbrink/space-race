"""CSM-107 and LM-5 on SA-506, Apollo 11: the gallery exhibit, cut open to the cabin and the stages. pnpm model apollo-11 --preview DIR."""

import os
import sys
from functools import partial

import bpy
from mathutils.bvhtree import BVHTree

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


def check_stowed_gear():
    """The folded struts and their deployment shields must clear the adapter panels."""
    bpy.context.view_layer.update()

    def meshes(root):
        for obj in bpy.data.objects[root].children_recursive:
            if obj.type == "MESH":
                yield obj.name, BVHTree.FromPolygons([obj.matrix_world @ v.co for v in obj.data.vertices], [p.vertices[:] for p in obj.data.polygons])

    panels = list(meshes("SpacecraftAdapter"))
    for name, gear in meshes("LMLandingGear"):
        for panel_name, panel in panels:
            if gear.overlap(panel):
                raise ValueError(f"Stowed landing gear {name} intersects {panel_name}")


def build():
    saturn_v.build(lunar_module=partial(lunar_module.build, spacecraft=5), adapter_number="14")
    check_stowed_gear()
    apollo_csm.build(saturn_v.CSM_OFFSET, spacecraft=107)
    launch_escape.build(saturn_v.CSM_OFFSET, saturn_v.HEIGHT, boardable=True)
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
    return "Apollo 11, SA-506: 363 ft nominal height to the Q-ball"


run(
    "Apollo 11 CSM-107 and LM-5 and SA-506",
    build,
    [
        ("apollo-11-stack.png", (0, 0, 55), 220, dict(azimuth=30, elevation=4, res=(1000, 1600), lens=55)),
        (
            "apollo-11-csm.png",
            (0, 0, (saturn_v.CSM_OFFSET + 205) * IN),
            24,
            dict(azimuth=25, elevation=15, res=(1200, 1200), lens=55, only=("CM_", "SM_", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
