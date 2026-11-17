"""Apollo 7 DSKY safety-glass pane components; no spacecraft pose assigned.

blender -b --factory-startup -P missions/usa/apollo/vehicles/dsky_panels.py -- \
  --out /tmp/dsky-panels.glb --preview /tmp/dsky-panels
See dsky-panels.md. The standalone arrangement is an exhibit, not an installation.
"""

import gzip
import json
import sys
from pathlib import Path

_root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(_root / "tools" / "blender"))

import srlib  # noqa: E402


def build(part, parent=None):
    """Source XY is the pane face, +Z its bevelled front; convert inches once."""
    data = json.loads(gzip.decompress((Path(__file__).parent / "reference" / "apollo-dsky-panels.json.gz").read_bytes()))
    if data["source_units"] != "inches":
        raise ValueError("DSKY panel geometry must retain drawing inches")
    panel = next(p for p in data["panels"] if p["part"] == part)
    level = panel["levels"][0 if srlib.DETAIL >= 0.75 else 1 if srlib.DETAIL >= 0.5 else 2]
    node = srlib.group(f"DSKYPanel_{part}", parent, source_part=part, confidence="documented nominal geometry; installation unresolved")
    mesh = srlib.MeshBuilder()
    mesh.add([tuple(c * srlib.IN for c in p) for p in level["vertices_in"]], level["triangles"])
    # Opaque neutral shading makes the thin bevel inspectable. This is not a
    # claim about glass tint, transmission, coating or refractive index.
    neutral = srlib.material("apollo-dsky-pane-geometry-reference", (0.55, 0.60, 0.62), roughness=0.55)
    mesh.build(f"DSKY_Pane_{part}", neutral, node, smooth=False)
    return node


def standalone():
    build("2004743-001")
    long = build("2004743-002")
    long.location.x = 3.2 * srlib.IN  # Display spacing only; no installed coordinate.
    return "2004743-001/-002 nominal glass geometry; display spacing and opaque reference shading only, not installed"


if __name__ == "__main__":
    srlib.run(
        "DSKY safety-glass pane components",
        standalone,
        [
            ("dsky-panes-front.png", (2.87 * srlib.IN, 2.1 * srlib.IN, 0), 0.45, dict(azimuth=-70, elevation=72, res=(1400, 1100), lens=55)),
            ("dsky-panes-bevel.png", (2.87 * srlib.IN, 2.1 * srlib.IN, 0), 0.4, dict(azimuth=-70, elevation=24, res=(1400, 1000), lens=55)),
        ],
    )
