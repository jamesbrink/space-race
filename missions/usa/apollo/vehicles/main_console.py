"""Shared Block II main-console reference surface, not equipped CM-101 panels.

Source coordinates remain centimetres from the Smithsonian CM-107 derivative.
Apollo 7's NAA V36-976018 Rev D identifies the shared main-panel arrangement.
No photographic scaling, manufactured thickness or later instruments are added.
"""

import json
import math
from pathlib import Path

import pressure_vessel
from cm_reference import survey_cm
from srlib import CM, IN, MeshBuilder, interior, material


def build(parent, base):
    """Keep the concave console silhouette whole when surrounding shells open."""
    if not interior():
        return
    source = json.loads((Path(__file__).parent / "reference" / "apollo-main-console.json").read_text())
    panel = material("apollo-console-reference", (0.14, 0.16, 0.17), roughness=0.75, double_sided=True)
    for surface in source["surfaces"]:
        mesh = MeshBuilder()
        points_cm = [survey_cm(p, source["registration"]) for p in surface["boundary_cm"]]
        # The upper nominal pressure wall bounds a convex cone. If all outline
        # vertices are inside, every triangle of the planar panel is inside.
        # This checks the two references' compatibility, not flight clearance.
        for x, y, z in points_cm:
            if not pressure_vessel.MID < z / 2.54 < pressure_vessel.FORWARD:
                raise ValueError("Main-console reference leaves the nominal upper pressure wall")
            if math.hypot(x, y) > pressure_vessel.radius(z / 2.54) * 2.54:
                raise ValueError("Main-console reference intersects the nominal pressure wall; check the shared datum")
        points = [(x * CM, y * CM, z * CM + base * IN) for x, y, z in points_cm]
        # Blender tessellates the concave n-gon. A convex hull would wrongly
        # fill the central notch; a thickness would invent an unseen back face.
        mesh.add(points, [tuple(range(len(points)))])
        mesh.build(f"CM_MainConsole_{surface['id']}", panel, parent, smooth=False)
