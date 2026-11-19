"""Assemble a landing mission’s Block II CSM, folded LM and indexed Saturn V."""

import math
from functools import partial

import bpy

import apollo_csm
import launch_escape
import lunar_module
import saturn_v
from srlib import IN, MeshBuilder, group, material


def bearing_lugs(stage, serial):
    """The lower thrust ring's four bearing points (MSFC-MAN-504 §4 and fig. 8-7); local envelopes estimated."""
    paint = material("sic-bearing-alloy", (0.31, 0.33, 0.34), metallic=0.62, roughness=0.54)
    # With the complete stage indexed on the pad, position I is east, then II north, III west, IV south.
    for i in range(4):
        a = math.radians(-45 + 90 * i)
        root = group(f"SIC{serial}_Bearing_{i + 1}", stage)
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
        lug.build(f"SIC{serial}_BearingLug_{i + 1}", paint, root, smooth=False)


def build(serial, csm, lm, adapter):
    saturn_v.build(lunar_module=partial(lunar_module.build, spacecraft=lm), adapter_number=adapter, impact_radio=serial == 508)
    if serial in (507, 508):
        saturn_v.sii_external_equipment(serial - 500)
    # MSFC-MAN-504 fig. 8-7 as seen on ML-1: north toward the tower, engine 1 northeast.
    # Index the complete first stage together so its engine fairings stay over the outboard bells.
    bearing_lugs(bpy.data.objects["SaturnFirstStage"], serial)
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
    apollo_csm.build(saturn_v.CSM_OFFSET, spacecraft=csm)
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
