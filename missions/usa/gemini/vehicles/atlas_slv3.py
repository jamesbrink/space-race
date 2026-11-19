"""Exterior of an Atlas SLV-3 carrying a Gemini target on Complex 14. Dimensions are inches.
The mission reports' Figure 3.0-2(a) gives each launch silhouette. See atlas-slv3.md for the figure datums,
the portions of the Atlas exterior assumed from the Mercury Atlas and the limits of the walk-around model.
"""

from __future__ import annotations

import math

import bpy

import agena_target_vehicle as agena
import atda
import atlas_lv3b
import srlib
import target_docking_adapter as tda
from mercury_capsule import flag_image
from srlib import IN, MeshBuilder, group, load_font, material, prof

# External surfaces shared with the earlier Atlas exhibit. Omit the Mercury adapter, markings and interior.
ATLAS_EXTERIOR = {
    "Tank_Frost",
    "Tank_Skin",
    "Tank_Seams",
    "Tank_FrostSeams",
    "Pods_Fairings",
    "Pods_Bands",
    "Pods_Fasteners",
    "Pods_Conduit",
    "Verniers_Fairings",
    "Verniers_Nozzles",
    "Verniers_PressureLine",
    "Sustainer_Nozzle",
    "Tank_LoxLine",
    "Booster_Skirt",
    "Booster_Fairings",
    "Booster_HeatShield",
    "BoosterEngines_Nozzles",
}
ATLAS_LENGTH = 808.0  # Gemini IX-A mission report Fig 3.0-2(a), stations 1310.00 to 502.00
AGENA_DATUM = 526.0  # GATV station at the Atlas interface, Gemini VIII mission report Fig 3.0-2(a)
ATDA_DATUM = -198.38  # ATDA station at the Atlas interface, Gemini IX-A mission report Fig 3.0-2(a)


def atlas(length: float) -> None:
    atlas_lv3b.build(0, load_font(), serial="")
    # Keep only the dated external shapes identified in the photographs. The original click-through notes describe Mercury.
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            if obj.name not in ATLAS_EXTERIOR:
                bpy.data.objects.remove(obj, do_unlink=True)
                continue
            for prop in ("label", "about"):
                if prop in obj:
                    del obj[prop]
    for obj in list(bpy.context.scene.objects):
        if obj.type == "EMPTY" and not obj.children:
            bpy.data.objects.remove(obj, do_unlink=True)
        elif not obj.parent:
            obj.scale.z = length / ATLAS_LENGTH


def circular_skin(name, mat, node, profile, sides=96):
    skin = MeshBuilder()
    skin.lathe(prof(profile), sides)
    return skin.build(name, mat, node, sharp_angle=40)


def shroud(base, mats):
    """Closed launch configuration of the same shroud whose separated halves the ATDA gallery shows."""
    length, radius, cylinder, angle = atda.SHROUD
    cap = atda.NOSE_R
    centre = base + length - cap
    profile = [(radius, base), (radius, base + cylinder)]
    for i in range(12):
        t = angle + (math.pi / 2 - angle) * i / 11
        profile.append((cap * math.cos(t), centre + cap * math.sin(t)))
    node = group("TargetAscentShroud")
    circular_skin("TargetShroud_Outer", mats["fibreglass"], node, profile)
    marks = MeshBuilder()
    for start in (0.38, 2.60, 3.53, 5.75):
        marks.lathe(prof([(radius + 0.28, base + 10), (radius + 0.28, base + 14.5)]), 8, arc=(start, start + 0.16))
    marks.build("TargetShroud_Placards", material("paint-shroud-placard", (0.50, 0.065, 0.032), 0, 0.6), node, sharp_angle=None)
    circular_skin("TargetShroud_Band", mats["steel"], node, [(radius + 0.17, base + atda.BAND - 1), (radius + 0.17, base + atda.BAND + 1)])


def build(unit: agena.Unit | None) -> str:
    augmented = unit is None
    # For Gemini VIII the callout reads 808.5 in, while the station difference is 808.0 in. Keep the printed overall silhouette.
    base = ATLAS_LENGTH if augmented else 808.5
    atlas(base)
    mats = tda.materials()
    flag = material("flag", (1, 1, 1), 0, 0.6, double_sided=True, image=flag_image())
    if augmented:
        ax = tda.Axis((0, 0), base + atda.S_TAIL - ATDA_DATUM, 0)
        atda.build_equipment(ax, mats, flag, False)
        split = base + atda.S_EQUIPMENT - ATDA_DATUM
        top = base + 139.17 - ATDA_DATUM
        lower = base - ATDA_DATUM
    else:
        ax = tda.Axis((0, 0), base + AGENA_DATUM - agena.S_EXIT, 0)
        agena.build_forward(ax, mats, flag, False, unit.revised_forward_rack, unit.eva_station)
        agena.build_tank(ax, mats, flag, srlib.DETAIL >= 0.5, unit.revised_forward_rack, unit.eva_station)
        # The aft rack and the engine ride inside the adapter until the Agena leaves it, and fly with it on the flight deck.
        agena.build_aft(ax, mats, srlib.DETAIL >= 0.5, False)
        agena.build_engine(ax, mats, srlib.DETAIL >= 0.5, False)
        split = base + AGENA_DATUM - agena.S_AFT
        top = base + AGENA_DATUM - 90.33
        lower = base + AGENA_DATUM - agena.S_TDA
    adapter = group("AtlasTargetAdapter")
    circular_skin("AtlasTargetAdapter_Skin", mats["black"], adapter, [(atlas_lv3b.MATE_R, base), (30, base + 31.5), (30, split)])
    # Two staggered rows in NASA S66-24482 and the ATDA launch photograph in Spaceport, June 2016, p. 50. Their hidden repeat and width are estimated.
    checks = MeshBuilder()
    for row in range(2):
        high = split - 25 - row * 11
        for index in range(row, 16, 2):
            checks.lathe(prof([(30.23, high - 11), (30.23, high)]), 8, arc=(math.tau * index / 16, math.tau * (index + 1) / 16))
    checks.build("AtlasTargetAdapter_Checks", mats["white"], adapter, sharp_angle=None)
    shroud_base = top - atda.SHROUD[0]
    circular_skin("DockingAdapter_Outer", mats["white"], group("TargetCollar"), [(30, lower), (30, shroud_base)])
    shroud(shroud_base, mats)
    return f"Atlas and {'ATDA' if augmented else unit.number}, {top * IN:.3f} m from exit plane to shroud tip"
