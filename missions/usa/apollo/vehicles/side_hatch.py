"""Unified side-hatch thermal cover: measured outlines on the nominal CM wall.

Source units: centimetres for the exterior survey, metres for the detached
Block II hatch scan. No Apollo 11 lightweight pressure-door pockets
are used for the earlier CM-101 hatch (NASA TN D-7780, p.12). See cabin-fittings.md.
"""

import json
import math
from pathlib import Path

from mathutils import Matrix, Vector

import perforated_wall
from cm_reference import AFT_APEX_XC, survey_cm
from srlib import CM, IN, MeshBuilder, group, interior, mark_shells, material

REFERENCE = json.loads((Path(__file__).parent / "reference" / "apollo-side-hatch.json").read_text())


def opening():
    """Thermal-shell interface, not the crew's clear passage or a flat door."""
    survey = json.loads((Path(__file__).parent / "reference" / "apollo-cm-apertures.json").read_text())
    points = [Vector(survey_cm(p, survey["registration"])) * CM for p in REFERENCE["thermal_opening"]["boundary_cm"]]
    return perforated_wall.convex_boundary(perforated_wall.domain(points))


def hinge(parent, name, base, radius, boundary):
    """Keep the closed modelling coordinates and register a pivot at the outer hinge edge."""
    a = max(boundary, key=lambda point: point.x)
    r = radius(a.y / IN) * IN
    pivot = Vector((r * math.cos(a.x), r * math.sin(a.x), base * IN + a.y))
    leaf = group(name, parent)
    leaf.location = pivot
    return leaf


def register_leaf(leaf):
    """Geometry uses the capsule datum. Make it local to the hinge without moving the closed door."""
    shift = Matrix.Translation(-leaf.location)
    for child in leaf.children:
        child.matrix_local = shift @ child.matrix_local


def build(parent, base, radius, normal, project, void):
    """The outer reference surface and its aperture; the pressure door is pending."""
    outer = opening()
    data = REFERENCE["window"]
    registration = REFERENCE["registration"]
    rotation = Matrix(registration["rotation"])
    translation = Vector(registration["translation_m"])
    # The stored rigid registration ends in the original fitted-apex frame.
    # Apply the same nominal Apollo datum used by the curved thermal opening.
    translation.z += AFT_APEX_XC * IN
    # The measured mounting face is an aperture reference, not a glass-plane
    # survey. Separate estimated glazing uses it without moving this frame.
    measured = [rotation @ Vector(p) + translation for p in data["boundary_m"]]
    direction = rotation @ Vector(data["normal"])
    rim = [project(p, direction) for p in measured]
    hole = perforated_wall.domain(rim)
    if not all(perforated_wall.within(p, outer) for p in hole):
        raise ValueError("Registered hatch window falls outside the measured thermal opening")
    foil = material("apollo-hatch-silver", (0.64, 0.67, 0.69), metallic=0.88, roughness=0.35, double_sided=True)
    low, high = min(p.y for p in outer) / IN, max(p.y for p in outer) / IN
    skin = perforated_wall.build("CM_SideHatchCover", parent, foil, base, low, high, radius, normal, [hole], boundary=outer)
    perforated_wall.check_openings(skin, [("hatch", measured, direction)], base)
    mesh = MeshBuilder()
    n = len(measured)
    mesh.add(
        [(p.x, p.y, p.z + base * IN) for p in measured + rim],
        [(i, i + n, (i + 1) % n + n, (i + 1) % n) for i in range(n)],
    )
    mesh.build("CM_HatchWindowReveal", foil, parent)
    if not interior():
        mesh = MeshBuilder()
        mesh.add([(p.x, p.y, p.z + base * IN) for p in measured], [tuple(range(n))])
        mesh.build("CM_HatchWindowDistantVoid", void, parent)
    mark_shells(["CM_SideHatchCover", "CM_HatchWindowReveal"])
