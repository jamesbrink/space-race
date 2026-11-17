"""Dimensioned DSKY housing reference; not yet installed in the CM-101 cabin.

Standalone review:
blender -b --factory-startup -P missions/usa/apollo/vehicles/dsky_housing.py -- \
  --out /tmp/dsky.glb --preview /tmp/dsky-previews
See dsky-housing.md for primary dimensions, CAD provenance and applicability limits.
"""

import gzip
import json
import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_root / "tools" / "blender"))

import srlib  # noqa: E402

WIDTH = 8.124
HEIGHT = 8.000
SWITCH_BORE = (0.565 + 0.566) / 2


def build(parent=None):
    """Build the reference in source inches, without inventing a spacecraft pose."""
    reference = json.loads(gzip.decompress((Path(__file__).parent / "reference" / "apollo-dsky-housing.json.gz").read_bytes()))
    level = reference["levels"][0 if srlib.DETAIL >= 0.75 else 1 if srlib.DETAIL >= 0.5 else 2]
    vertices = level["vertices_in"]
    dimensions = [max(p[a] for p in vertices) - min(p[a] for p in vertices) for a in (0, 2)]
    if any(abs(actual - expected) > 1e-7 for actual, expected in zip(dimensions, (WIDTH, HEIGHT), strict=True)):
        raise ValueError("DSKY reference envelope no longer matches drawing 2004968E")
    parent = srlib.group("DSKYHousing", parent)
    mesh = srlib.MeshBuilder()
    mesh.add([(x * srlib.IN, y * srlib.IN, z * srlib.IN) for x, y, z in vertices], level["triangles"])
    # Neutral reference shading, not a reconstructed flight paint scheme.
    grey = srlib.material("apollo-dsky-reference", (0.22, 0.24, 0.25), metallic=0.25, roughness=0.65)
    mesh.build("DSKY_FrontHousing_Reference", grey, parent, smooth=False)
    return parent


def standalone():
    build()
    return f"drawing reference {WIDTH} × {HEIGHT} in; {WIDTH * srlib.IN:.7f} × {HEIGHT * srlib.IN:.4f} m; not installed CM-101 equipment"


if __name__ == "__main__":
    srlib.run(
        "DSKY front-housing reference",
        standalone,
        [
            (
                "dsky-housing.png",
                (WIDTH / 2 * srlib.IN, -0.45 * srlib.IN, HEIGHT / 2 * srlib.IN),
                0.8,
                dict(azimuth=-65, elevation=18, res=(1400, 1100), lens=55),
            ),
        ],
    )
