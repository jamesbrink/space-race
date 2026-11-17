"""Apollo 7 DSKY equipment in the existing shared front-cover frame.

Keys, displays and the plain enclosure are an ESTIMATED photographic
reconstruction of NASM A19770217000. Glass component dimensions retain their
own CM-101 drawing authority; installation remains estimated. No later DSKY
mesh, display cover or artwork is imported. The exhibit is unpowered.
"""

import gzip
import json
import math
from pathlib import Path

from mathutils import Vector

from cm_reference import CM_PER_IN, survey_cm
from dsky_front import reference
from panel_equipment import InchPanel
from srlib import IN, MeshBuilder, interior, material

FOLDER = Path(__file__).parent / "reference"


def rounded(width, height, radius, centre=(0, 0), segments=8):
    """Counterclockwise boundary; dimensions and vertices remain inches."""
    points = []
    for x, y, start in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for i in range(segments + 1):
            a = math.radians(start + i * 90 / segments)
            points.append((centre[0] + x * (width / 2 - radius) + radius * math.cos(a), centre[1] + y * (height / 2 - radius) + radius * math.sin(a)))
    return points


def solid(c, name, centre, sections, paint):
    """Closed finite solid with optional beveled shoulders."""
    mesh, vertices, faces = MeshBuilder(), [], []
    for width, height, radius, z in sections:
        vertices.extend((x * IN, y * IN, z * IN) for x, y in rounded(width, height, radius, centre))
    n = len(vertices) // len(sections)
    faces.extend((tuple(reversed(range(n))), tuple(range(len(vertices) - n, len(vertices)))))
    for level in range(len(sections) - 1):
        for i in range(n):
            j = (i + 1) % n
            faces.append((level * n + i, level * n + j, (level + 1) * n + j, (level + 1) * n + i))
    mesh.add(vertices, faces, matrix=c.frame(0, 0))
    return mesh.build(name, c.m[paint], c.parent, smooth=False)


def cover(c, name, data, section):
    """A closed asymmetric frame around a real opening, not a pane decal."""
    x0, y0, x1, y1 = data["cover_bounds_in"]
    outer = rounded(x1 - x0, y1 - y0, section["outer_corner"], ((x0 + x1) / 2, (y0 + y1) / 2))
    inner = rounded(*data["clear_size_in"], section["inner_corner"], data["clear_centre_in"])
    n = len(outer)
    vertices = [
        (x * IN, y * IN, z * IN)
        for loop, z in ((outer, section["back"]), (outer, section["front"]), (inner, section["back"]), (inner, section["front"]))
        for x, y in loop
    ]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.extend(
            ((n + i, n + j, 3 * n + j, 3 * n + i), (i, 2 * n + i, 2 * n + j, j), (i, j, n + j, n + i), (2 * n + i, 3 * n + i, 3 * n + j, 2 * n + j))
        )
    mesh = MeshBuilder()
    mesh.add(vertices, faces, matrix=c.frame(0, 0))
    mesh.build(name, c.m["panel"], c.parent, smooth=False)


def build(parent, base):
    if not interior():
        return
    data = json.loads((FOLDER / "apollo-dsky-equipment.json").read_text())
    registration = reference()["registration"]
    turn = lambda p: Vector((-p[1], p[0], p[2]))  # noqa: E731
    c = InchPanel(
        parent,
        base,
        Vector(survey_cm(registration["origin_cm"], registration["apollo_frame"])) / CM_PER_IN,
        *[turn(p) for p in registration["basis_columns"]],
        {
            "panel": material("apollo-dsky-cover-grey", (0.40, 0.42, 0.40), roughness=0.65),
            "case": material("apollo-dsky-case", (0.09, 0.10, 0.11), metallic=0.35, roughness=0.60),
            "key": material("apollo-dsky-key", (0.012, 0.015, 0.017), roughness=0.75),
            "white": material("apollo-dsky-key-legend", (0.78, 0.79, 0.73), roughness=0.75),
            "ink": material("apollo-dsky-display-ink", (0.012, 0.015, 0.015), roughness=0.85),
            "lens": material("apollo-dsky-indicator-unlit", (0.42, 0.44, 0.39), roughness=0.60),
            "display": material("apollo-dsky-el-unlit", (0.15, 0.16, 0.10), roughness=0.65),
            "glass": material("crystal", (0.87, 0.92, 0.94), roughness=0.12, alpha=0.08),
        },
        prefix="CM_DSKY",
    )
    parent["equipment_confidence"] = "estimated"
    parent["equipment_source"] = "NASM A19770217000 photographs; GNC-33A p.13; 2003994J; 2004743A glass -001/-002"
    parent["display_state"] = "Unpowered exhibit; no invented numerical readings or AGC simulation"
    case = data["rear_case_in"]
    solid(c, "CM_DSKY_RearCase", (3.45, 4.0), [(case["width"], case["height"], 0.18, z) for z in (case["back"], case["front"])], "case")
    section = data["key_section_in"]
    for key in data["keys"]:
        label, (u, v) = key["legend"], key["centre_in"]
        obj = solid(
            c,
            f"CM_DSKY_Key_{label.replace(' ', '_')}",
            (u, v),
            [
                (section["width"], section["width"], section["corner_radius"], section["base"]),
                (section["width"], section["width"], section["corner_radius"], section["shoulder"]),
                (section["top_width"], section["top_width"], section["top_radius"], section["top"]),
            ],
            "key",
        )
        obj["dsky_key"] = label
        obj["section_confidence"] = "estimated"
        if label == "−":
            c.line("KeyLegends", "white", (u - 0.13, v), (u + 0.13, v), 0.045, section["top"] + 0.06)
        else:
            c.text(
                label.replace(" ", "\n"),
                u,
                v + (0.06 if " " in label else 0),
                0.26 if len(label) == 1 else 0.11,
                section["top"] + 0.06,
                "white",
                "KeyLegends",
            )
    panes = json.loads(gzip.decompress((FOLDER / "apollo-dsky-panels.json.gz").read_bytes()))
    for name in ("il", "el"):
        placement = data[name]
        cover(c, f"CM_DSKY_{name.upper()}Cover", placement, data["cover_section_in"])
        pane = next(p for p in panes["panels"] if p["part"] == placement["pane_part"])
        mesh = MeshBuilder()
        mesh.add(
            [tuple(x * IN for x in p) for p in pane["levels"][0]["vertices_in"]],
            pane["levels"][0]["triangles"],
            matrix=c.frame(*placement["pane_lower_left_in"]),
        )
        obj = mesh.build(f"CM_DSKY_Glass_{pane['part']}", c.m["glass"], parent, smooth=False)
        obj["source_part"] = pane["part"]
        obj["installation_confidence"] = "estimated"
    # The two blank display backs are physical faces under the clear glass.
    c.box("ILBack", "lens", 1.7725, 6.0525, 2.50, 3.10, -0.40, 0.12)
    c.box("ELBack", "display", 5.13, 5.441, 2.50, 4.30, -0.40, 0.12)
    for row, labels in enumerate(data["annunciators"]):
        for col, label in enumerate(labels):
            u, v = 1.18 + col * 1.18, 7.20 - row * 0.56
            c.box("IndicatorLenses", "lens", u, v, 1.09, 0.50, 0.10, 0.18)
            c.text(label, u, v + (0.055 if "\n" in label else 0), 0.11, 0.24, "ink", "IndicatorLegends")
    for label, u, v in (("COMP\nACTY", 4.40, 7.18), ("PROG", 5.70, 7.42), ("VERB", 4.43, 6.47), ("NOUN", 5.72, 6.47)):
        c.text(label, u, v, 0.12, 0.18, "ink", "DisplayLegends")
    # The horizontal divider is visible on the preserved unpowered instrument.
    c.line("ELDivider", "lens", (4.02, 5.60), (6.22, 5.60), 0.055, 0.18)
    c.flush()
    from console_equipment import _validate

    _validate(parent, base)
