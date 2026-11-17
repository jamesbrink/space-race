"""Shared DSKY front-web reference, rigidly placed from the CM-107 metal face.

The nominal web is not a complete cover, equipped DSKY, pane or keyboard.
Source drawing inches and survey centimetres remain separate until placement.
"""

import functools
import gzip
import hashlib
import json
from pathlib import Path

from cm_reference import survey_cm
from srlib import CM, IN, MeshBuilder, interior, material

FOLDER = Path(__file__).parent / "reference"


@functools.cache
def reference():
    """The web and console mask must change together, never drift or overlap."""
    data = json.loads(gzip.decompress((FOLDER / "apollo-dsky-front-web.json.gz").read_bytes()))
    if hashlib.sha256((FOLDER / "apollo-main-console.json").read_bytes()).hexdigest() != data["console_source_sha256"]:
        raise ValueError("Main-console reference changed: rebuild the DSKY pose and display mask")
    return data


def build(parent, base):
    """Keep the closed nominal web whole inside the opened CM; no invented stand-off."""
    if not interior():
        return
    data = reference()
    vertices = data["mesh"]["vertices_in"]
    cad = data["cad"]
    expected = ((0, 0, -cad["web_in"]), (cad["width_in"], cad["height_in"], 0))
    for extreme, wanted in zip((min, max), expected, strict=True):
        if any(abs(extreme(p[a] for p in vertices) - wanted[a]) > 1e-7 for a in range(3)):
            raise ValueError("DSKY front-web reference envelope changed")
    registration = data["registration"]
    origin, basis = registration["origin_cm"], registration["basis_columns"]
    points = []
    for p in vertices:
        raw_cm = [origin[a] + 2.54 * sum(p[k] * basis[k][a] for k in range(3)) for a in range(3)]
        x, y, z = survey_cm(raw_cm, registration["apollo_frame"])
        points.append((x * CM, y * CM, z * CM + base * IN))
    mesh = MeshBuilder()
    mesh.add(points, data["mesh"]["triangles"])
    grey = material("apollo-dsky-front-reference", (0.22, 0.24, 0.25), metallic=0.25, roughness=0.65)
    mesh.build("CM_DSKYFrontWeb_Reference", grey, parent, smooth=False)
