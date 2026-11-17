"""Three-pane CM window studies in the shared Block II frame openings.

NASA TN D-7439 pp.4/6 gives nominal type thicknesses; use for CM101 is
ASSUMED. NAA News Reference p.48 gives the .10-in pressure-pair gap.
The flat pane planes, edge overlap and mounts are ESTIMATED. The measured
CM107 structural openings are not promoted to measured CM101 glass edges.
"""

import json
import math
from pathlib import Path

from mathutils import Matrix, Vector

from cm_reference import AFT_APEX_XC, survey_cm
from srlib import CM, IN, MeshBuilder, interior, mark_shells, material

FOLDER = Path(__file__).parent / "reference"
PRESSURE_THICKNESS = {"side": 0.25, "rendezvous": 0.20, "hatch": 0.23}
OUTER_THICKNESS = 0.70
PRESSURE_GAP = 0.10
# Estimated reference-plane offsets and hidden glass-edge overlap, in inches.
OUTER_FACE, PRESSURE_OUTBOARD_FACE = -0.10, -0.10
EDGE_OVERLAP = 0.08
HATCH_OUTER_TO_PRESSURE = 1.65


def flat(points, normal):
    """Keep a physically flat pane; a processed structural edge is not glass."""
    n = Vector(normal).normalized()
    centre = sum(points, Vector()) / len(points)
    if n.x * centre.x + n.y * centre.y < 0:
        n = -n
    points = [p - n * (p - centre).dot(n) for p in points]
    area = sum(((a - centre).cross(b - centre) for a, b in zip(points, points[1:] + points[:1])), Vector())
    if area.dot(n) < 0:
        points.reverse()
    return points, centre, n


def pane(name, parent, outline, normal, back, front, base, glass):
    outline, centre, normal = flat(outline, normal)
    # Hidden edge allowance is an estimated installation, not a machining
    # contour extracted from the survey. Do not scale the source frame itself.
    edge = [p + (p - centre).normalized() * EDGE_OVERLAP * IN for p in outline]
    n = len(edge)
    vertices = [tuple(p + normal * z * IN + Vector((0, 0, base * IN))) for z in (back, front) for p in edge]
    vertices += [tuple(centre + normal * z * IN + Vector((0, 0, base * IN))) for z in (back, front)]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.extend(((2 * n, j, i), (2 * n + 1, n + i, n + j), (i, j, n + j, n + i)))
    mesh = MeshBuilder()
    mesh.add(vertices, faces)
    obj = mesh.build(name, glass, parent, smooth=False)
    obj["pane_thickness_in"] = front - back
    obj["thickness_confidence"] = "assumed common nominal type; NASA TN D-7439 pp.4/6"
    obj["installation_confidence"] = "estimated plane, offset and hidden edge; shared structural opening is not measured glass"
    mark_shells([name])
    return obj


def build(parent, base):
    if not interior():
        return
    outer = json.loads((FOLDER / "apollo-cm-apertures.json").read_text())
    inner = json.loads((FOLDER / "apollo-cm-inner-apertures.json").read_text())
    glass = material("glass-apollo-window", (0.83, 0.91, 0.94), roughness=0.12, alpha=0.10)
    inners = {p["id"]: p for p in inner["apertures"]}
    parent["arrangement_source"] = "NASA TN D-6721 pp.1-3: three-pane windows on the first three crewed flights"
    parent["installation_confidence"] = "estimated; pressure and thermal frame references remain unscaled"
    for port in outer["apertures"]:
        name = port["id"]
        points = [Vector(survey_cm(p, outer["registration"])) * CM for p in port["boundary_cm"]]
        n = port["normal"]
        direction = Vector((-n[1], n[0], n[2]))
        pane(f"CM_Window_{name}_thermal", parent, points, direction, OUTER_FACE - OUTER_THICKNESS, OUTER_FACE, base, glass)
        p = inners[name]
        points = [Vector(survey_cm(q, inner["registration"])) * CM for q in p["boundary_cm"]]
        n = p["normal"]
        direction = Vector((-n[1], n[0], n[2]))
        thickness = PRESSURE_THICKNESS[name.split("-")[0]]
        for index in range(2):
            # Both pressure panes lie cabinward of the structural reference.
            # Its surveyed edge is not a measured glass mounting plane.
            front = PRESSURE_OUTBOARD_FACE - (1 - index) * (thickness + PRESSURE_GAP)
            pane(f"CM_Window_{name}_pressure_{index + 1}", parent, points, direction, front - thickness, front, base, glass)
    # The hatch scan supplies only its fixed outer window interface. Until the
    # pressure-door mounts are measured, place the circular inner pair at a
    # labelled estimated offset behind the thermal assembly.
    hatch = json.loads((FOLDER / "apollo-side-hatch.json").read_text())
    registration = hatch["registration"]
    rotation, offset = Matrix(registration["rotation"]), Vector(registration["translation_m"])
    offset.z += AFT_APEX_XC * IN
    points = [rotation @ Vector(p) + offset for p in hatch["window"]["boundary_m"]]
    direction = rotation @ Vector(hatch["window"]["normal"])
    pane("CM_Window_hatch_thermal", parent, points, direction, OUTER_FACE - OUTER_THICKNESS, OUTER_FACE, base, glass)
    # NAA Command Module News Reference p.45 gives the round hatch
    # window as about nine inches across. Register its centre to the
    # thermal opening; no CM-101 glass-edge survey survives here.
    _, centre, normal = flat(points, direction)
    u = normal.orthogonal().normalized()
    v = normal.cross(u)
    points = [centre + 4.5 * IN * (u * math.cos(i * math.tau / 64) + v * math.sin(i * math.tau / 64)) for i in range(64)]
    thickness = PRESSURE_THICKNESS["hatch"]
    for index in range(2):
        front = -HATCH_OUTER_TO_PRESSURE - (1 - index) * (thickness + PRESSURE_GAP)
        pane(f"CM_Window_hatch_pressure_{index + 1}", parent, points, direction, front - thickness, front, base, glass)
