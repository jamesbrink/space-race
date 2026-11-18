"""Boost protective cover, including the commander's circular viewing port (source inches)."""

import json
import math
from pathlib import Path

from mathutils import Vector

import command_module as cm
import perforated_wall
import side_hatch
from cm_reference import survey_cm
from srlib import CM, IN, MeshBuilder, lathe_obj, mark_shells, material, prof

# North American Apollo News Reference pp.140–142: nominal Block II BPC and
# commander viewing window. Its installation on CM-101 is estimated.
PORT_RADIUS = 4
HEIGHT = 132


def build(parent, base, white, *, boardable=False):
    data = json.loads((Path(__file__).parent / "reference/apollo-cm-apertures.json").read_text())
    aperture = next(a for a in data["apertures"] if a["id"] == "rendezvous-left")
    points = [Vector(survey_cm(p, data["registration"])) * CM for p in aperture["boundary_cm"]]
    centre = sum(points, Vector()) / len(points)
    angle = math.atan2(centre.y, centre.x)
    z = centre.z / IN
    # Lower edge starts at the shoulder, where the nominal 156-in BPC and
    # 154-in CM are widest. The axial joint and upper taper are estimates.
    lo = cm._cz
    top = lo + HEIGHT
    join = cm.FORWARD_LIMIT
    r0 = cm.radius(join) + 1
    rtop = 5.5

    def radius(h):
        if h <= join:
            return cm.radius(h) + 1
        return r0 + (rtop - r0) * (h - join) / (top - join)

    def normal(h):
        dr = (radius(h + 0.001) - radius(h - 0.001)) / 0.002
        length = math.hypot(1, dr)
        return 1 / length, -dr / length

    # Mill the hole in the face topology. Circumferential and longitudinal
    # distances are each four inches in the tangent plane at the port centre.
    az = [i * math.tau / 64 for i in range(64)]
    edge = [Vector((angle + PORT_RADIUS * math.cos(a) / radius(z), z * IN + PORT_RADIUS * IN * math.sin(a) * math.cos(cm.CONE_ANGLE))) for a in az]
    wall = material("apollo-bpc-fibreglass", (0.88, 0.87, 0.82), roughness=0.63, double_sided=True)
    openings = [edge]
    if boardable:
        # The cover has its own leaf (JPL TM 33-425). Its perimeter and hinge
        # placement use the CM aperture as their reference; cover dimensions were not found.
        outline = side_hatch.opening()
        middle = sum(outline, Vector((0, 0))) / len(outline)
        opening = [middle + 1.05 * (point - middle) for point in outline]
        cover_leaf = side_hatch.hinge(parent, "Boost_Hatch_Pivot", base, radius, opening)
        leaf = [middle + 1.03 * (point - middle) for point in outline]
        perforated_wall.build(
            "BPC_Hatch",
            cover_leaf,
            wall,
            base,
            min(point.y for point in leaf) / IN,
            max(point.y for point in leaf) / IN,
            radius,
            normal,
            [],
            boundary=leaf,
        )
        mark_shells(["BPC_Hatch"])
        side_hatch.register_leaf(cover_leaf)
        openings.append(opening)
    perforated_wall.build("BPC_Shell", parent, wall, base, lo, top, radius, normal, openings, joins=(cm.CONE_Z, join))
    lathe_obj("BPC_Crown", prof([(rtop, base + top), (0, base + top)]), white, parent)
    # A clear inset disc represents the cover glazing. The source dimensions
    # the port diameter, while glazing thickness and surface finish are unknown.
    v = []
    for a, height in edge:
        r = radius(height / IN) - 0.15
        v.append((r * math.cos(a) * IN, r * math.sin(a) * IN, base * IN + height))
    glass = material("glass-apollo-bpc", (0.75, 0.83, 0.86), roughness=0.22, alpha=0.14, double_sided=True)
    mesh = MeshBuilder()
    mesh.add(v, [tuple(range(len(v)))])
    mesh.build("BPC_ViewingPort", glass, parent, smooth=False)
    mark_shells(["BPC_Shell", "BPC_Crown", "BPC_ViewingPort"])
