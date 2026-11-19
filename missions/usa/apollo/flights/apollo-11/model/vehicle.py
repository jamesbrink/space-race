"""CSM-107 and LM-5 on SA-506, Apollo 11: the gallery exhibit, cut open to the cabin and the stages. pnpm model apollo-11 --preview DIR."""

import math
import os
import sys
from functools import partial

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
from srlib import IN, MeshBuilder, group, material, run  # noqa: E402


def bearing_lugs(stage):
    """The lower thrust ring's four bearing points (MSFC-MAN-504 §4 and fig. 8-7); local envelopes estimated."""
    paint = material("sic-bearing-alloy", (0.31, 0.33, 0.34), metallic=0.62, roughness=0.54)
    # With the complete stage indexed on the pad, position I is east, then II north, III west, IV south.
    for i in range(4):
        a = math.radians(-45 + 90 * i)
        root = group(f"SIC506_Bearing_{i + 1}", stage)
        root.location = saturn_v.radial(saturn_v.LOWER_RADIUS, a, saturn_v.THRUST_BASE)
        root.rotation_euler.z = a
        lug = MeshBuilder()
        # A flat sole on the launcher bearing, tapering back into the lower ring above it.
        section = [(0.1, 0), (5, 0), (5, 2.5), (1.5, 11), (-1, 11)]
        vertices = [(r * IN, side * 9 * IN, z * IN) for side in (-1, 1) for r, z in section]
        n = len(section)
        faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
        faces.extend(((j + 1) % n, j, n + j, n + (j + 1) % n) for j in range(n))
        lug.add(vertices, faces)
        lug.build(f"SIC506_BearingLug_{i + 1}", paint, root, smooth=False)


def build():
    saturn_v.build(lunar_module=partial(lunar_module.build, spacecraft=5), adapter_number="14")
    # MSFC-MAN-504 fig. 8-7 as seen on ML-1: north toward the tower, engine 1 northeast.
    # Index the complete first stage together so its engine fairings stay over the outboard bells.
    bearing_lugs(bpy.data.objects["SaturnFirstStage"])
    # The upper black fields continue over the interstage onto the S-II. Keep their register.
    for part in (
        "SaturnFirstStage",
        "FirstStageEngines",
        "FirstStageTankStructure",
        "LowerInterstage",
        "SaturnSecondStage",
        "SecondStageEngines",
        "SecondStageTankStructure",
    ):
        bpy.data.objects[part].rotation_euler.z = math.radians(-45)
    lunar_module.check_stowed_gear()
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
            dict(azimuth=25, elevation=15, res=(1200, 1200), lens=55, only=("CM", "SM_", "SPS_", "RCS_", "HGA_")),
        ),
    ],
)
