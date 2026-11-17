"""Unified side-hatch thermal cover: measured outlines on the nominal CM wall.

Source units: centimetres for the exterior survey, metres for the detached
Block II hatch scan. No Apollo 11 lightweight pressure-door pockets
are used for the earlier CM-101 hatch (NASA TN D-7780, p.12).
"""

import json
from pathlib import Path

from mathutils import Matrix, Vector

import perforated_wall
from srlib import CM, IN, MeshBuilder, mark_shells, material

REFERENCE = json.loads((Path(__file__).parent / "reference" / "apollo-side-hatch.json").read_text())


def _hull(points):
    """Order the measured curved interface in the wall's cylindrical domain."""
    points = sorted(points, key=lambda p: (p.x, p.y))

    def cross(a, b, c):
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

    lower, upper = [], []
    for sequence, into in ((points, lower), (points[::-1], upper)):
        for point in sequence:
            while len(into) >= 2 and cross(into[-2], into[-1], point) <= 0:
                into.pop()
            into.append(point)
    return lower[:-1] + upper[:-1]


def opening():
    """Thermal-shell interface, not the crew's clear passage or a flat door."""
    survey = json.loads((Path(__file__).parent / "reference" / "apollo-cm-apertures.json").read_text())
    datum = survey["registration"]["scan_sphere_apex_cm"]
    points = [Vector((-p[1], p[0], p[2] - datum)) * CM for p in REFERENCE["thermal_opening"]["boundary_cm"]]
    return _hull(perforated_wall.domain(points))


def build(parent, base, radius, normal, project, void):
    """The outer reference surface and its aperture; the pressure door is pending."""
    outer = opening()
    data = REFERENCE["window"]
    registration = REFERENCE["registration"]
    rotation = Matrix(registration["rotation"])
    translation = Vector(registration["translation_m"])
    # The measured mounting face is an aperture reference, not a glass-plane
    # survey. The closure remains explicitly temporary until glazing is built.
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
    mesh = MeshBuilder()
    mesh.add([(p.x, p.y, p.z + base * IN) for p in measured], [tuple(range(n))])
    mesh.build("CM_HatchWindowPendingGlazing", void, parent)
    mark_shells(["CM_SideHatchCover"])
