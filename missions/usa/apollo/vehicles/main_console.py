"""Shared Block II main-console reference surface, not equipped CM-101 panels.

Source coordinates remain centimetres from the Smithsonian CM-107 derivative.
Apollo 7's NAA V36-976018 Rev D identifies the shared main-panel arrangement.
No photographic scaling, manufactured thickness or later instruments are added.
"""

import json
from pathlib import Path

from srlib import CM, IN, MeshBuilder, interior, material


def build(parent, base):
    """Keep the concave console silhouette whole when surrounding shells open."""
    if not interior():
        return
    source = json.loads((Path(__file__).parent / "reference" / "apollo-main-console.json").read_text())
    datum = source["registration"]["scan_sphere_apex_cm"]
    panel = material("apollo-console-reference", (0.14, 0.16, 0.17), roughness=0.75, double_sided=True)
    for surface in source["surfaces"]:
        mesh = MeshBuilder()
        points = [(-p[1] * CM, p[0] * CM, (p[2] - datum) * CM + base * IN) for p in surface["boundary_cm"]]
        # Blender tessellates the concave n-gon. A convex hull would wrongly
        # fill the central notch; a thickness would invent an unseen back face.
        mesh.add(points, [tuple(range(len(points)))])
        mesh.build(f"CM_MainConsole_{surface['id']}", panel, parent, smooth=False)
