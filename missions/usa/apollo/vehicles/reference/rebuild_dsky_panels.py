"""Build the two Apollo 7 DSKY safety-glass panes from drawing annotations.

python rebuild_dsky_panels.py [--out /path/to/apollo-dsky-panels.json.gz]
Standard library only. No CAD, scan scaling or inferred spacecraft installation.
Primary references and dimensional interpretation: ../dsky-panels.md.
"""

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

# 2004743A, front/end/side views, inches. These are nominal drawing values,
# not measurements of a flown part. The .135 thickness has an explicit ±.010.
WIDTH = 2.540
HEIGHTS = {"001": 3.135, "002": 4.358}
THICKNESS = 0.135
BEVEL = 0.085  # Side-view dimension ends at the bevel toe, not the rear face.
CORNER_RADIUS = 0.185
EDGE_FLAT = THICKNESS - BEVEL  # Derived remaining flat; 45° gives equal bevel runs.


def outline(height, inset, segments):
    """CCW rounded rectangle; the offset front shares the four arc centres."""
    radius = CORNER_RADIUS - inset
    points = []
    for x, y, angle in (
        (CORNER_RADIUS, CORNER_RADIUS, math.pi),
        (WIDTH - CORNER_RADIUS, CORNER_RADIUS, 1.5 * math.pi),
        (WIDTH - CORNER_RADIUS, height - CORNER_RADIUS, 0),
        (CORNER_RADIUS, height - CORNER_RADIUS, 0.5 * math.pi),
    ):
        points.extend(
            (x + radius * math.cos(angle + i * math.pi / (2 * segments)), y + radius * math.sin(angle + i * math.pi / (2 * segments)))
            for i in range(segments + 1)
        )
    return points


def mesh(height, segments):
    rings = [(outline(height, inset, segments), z) for inset, z in ((0, 0), (0, EDGE_FLAT), (BEVEL, THICKNESS))]
    count = len(rings[0][0])
    vertices = [(x, y, z) for ring, z in rings for x, y in ring]
    faces = []
    for layer in range(2):
        for i in range(count):
            j = (i + 1) % count
            a, b, c, d = layer * count + i, layer * count + j, (layer + 1) * count + j, (layer + 1) * count + i
            faces.extend(((a, b, c), (a, c, d)))
    for layer, z in ((0, 0), (2, THICKNESS)):
        centre = len(vertices)
        vertices.append((WIDTH / 2, height / 2, z))
        for i in range(count):
            a, b = layer * count + i, layer * count + (i + 1) % count
            faces.append((centre, a, b) if layer else (centre, b, a))
    return {
        "quarter_segments": segments,
        "maximum_arc_sagitta_in": CORNER_RADIUS * (1 - math.cos(math.pi / (4 * segments))),
        "vertices_in": [[round(c, 12) for c in p] for p in vertices],
        "triangles": faces,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=Path(__file__).with_name("apollo-dsky-panels.json.gz"))
    args = parser.parse_args()
    data = {
        "generator_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "drawing": "2004743 revision A, sheet 1, Panel, Indicator, IL-EL, AGC DSKY",
        "drawing_url": "https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n1420/mode/1up",
        "source_units": "inches",
        "status": "Complete nominal outer pane geometry; no installed pose or optical reconstruction",
        "applicability": {
            "dsky": "2003994-031, drawing revision J sheet 1, finds 30 and 31",
            "covers": {"001": "2003897-021, find 6", "002": "2003897-031, find 8"},
            "cover_drawing": "2003897 revision C, sheet 1, parts and note-applicability tables",
            "cover_url": "https://archive.org/stream/apertureCardBox459NARASW_images/apertureCardBox459NARASW#page/n185/mode/1up",
        },
        "dimensions_in": {
            "width": WIDTH,
            "height_by_dash": HEIGHTS,
            "thickness": THICKNESS,
            "thickness_tolerance": 0.010,
            "edge_flat": EDGE_FLAT,
            "corner_radius": CORNER_RADIUS,
            "bevel_run": BEVEL,
            "bevel_degrees": 45,
        },
        "confidence": {
            "nominal": "Width, dash-specific heights, thickness, bevel run, corner radius and bevel angle are drawing annotations",
            "derived": "Remaining flat edge is nominal thickness minus the .085-inch bevel run; the 45-degree inward run is .085 inch too",
            "limits": (
                "Nominal part envelope, not as-built metrology; laminated ply stack, toleranced extremes, "
                "optical properties and installation are not reconstructed"
            ),
        },
        "material": "Laminated glass, MIL-G-8602A, Class II, Grade 2N, drawing note 1",
        "notes": "-001 and -002 use notes 1, 2 and 3 only. The -003 anti-reflection coating requirements in notes 4 and 5 are excluded",
        "panels": [
            {"part": f"2004743-{dash}", "height_in": height, "levels": [mesh(height, n) for n in (24, 12, 8)]} for dash, height in HEIGHTS.items()
        ],
    }
    args.out.write_bytes(gzip.compress(json.dumps(data, separators=(",", ":")).encode(), mtime=0))
    print("DSKY panes 2004743-001/-002: nominal 2.540 × 3.135/4.358 × .135 in, .185 corners, .085-inch 45-degree bevel")


if __name__ == "__main__":
    main()
