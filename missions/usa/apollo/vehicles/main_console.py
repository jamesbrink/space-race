"""Shared Block II main-console reference surface, not equipped CM-101 panels.

Source coordinates remain centimetres from the Smithsonian CM-107 derivative.
Apollo 7's NAA V36-976018 Rev D identifies the shared main-panel arrangement.
No photographic scaling, manufactured thickness or later instruments are added.
"""

import json
import math
from pathlib import Path

from mathutils import Vector
from mathutils.bvhtree import BVHTree

import pressure_vessel
from cm_reference import survey_cm
from dsky_front import reference as dsky_reference
from srlib import CM, IN, MeshBuilder, interior, material


def build(parent, base):
    """Keep the concave console silhouette whole when surrounding shells open."""
    if not interior():
        return
    source = json.loads((Path(__file__).parent / "reference" / "apollo-main-console.json").read_text())
    masked = {p["id"]: p for p in dsky_reference()["console_surfaces"]}
    panel = material("apollo-console-reference", (0.14, 0.16, 0.17), roughness=0.75, double_sided=True)
    all_points, all_faces = [], []
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
        # The DSKY front web passes through the blank reference plane. Its
        # projected volume masks the plane, without an invented stand-off or
        # a claim to have reconstructed the console's manufactured aperture.
        surface_mesh = masked[surface["id"]]
        points_cm = [survey_cm(p, source["registration"]) for p in surface_mesh["vertices_cm"]]
        points = [(x * CM, y * CM, z * CM + base * IN) for x, y, z in points_cm]
        mesh.add(points, surface_mesh["triangles"])
        mesh.build(f"CM_MainConsole_{surface['id']}", panel, parent, smooth=False)
        offset = len(all_points)
        all_points.extend(points)
        all_faces.extend(tuple(offset + i for i in face) for face in surface_mesh["triangles"])
    # The measured fixed interfaces must remain holes after both masks and the
    # source-to-model registration. Probe actual built triangles, not a JSON flag.
    tree = BVHTree.FromPolygons(all_points, all_faces, all_triangles=True)
    normal = Vector(source["extraction"]["plane_normal"])
    for aperture in source["apertures"]:
        probe = Vector(aperture["probe_cm"])
        at = Vector(survey_cm(probe, source["registration"]))
        direction = (Vector(survey_cm(probe + normal, source["registration"])) - at).normalized()
        at *= CM
        at.z += base * IN
        hit, *_ = tree.ray_cast(at + direction * 0.1, -direction, 0.2)
        if hit is not None:
            raise ValueError(f"Main-console interface {aperture['id']} was capped")
