"""Nominal Block II afterbody (inches) and shared surveyed apertures (centimetres).

NASA TN D-5686, Figure 2(g): D154, aft radius184.8, shoulder radius7.7,
33-degree conical wall. This is nominal common geometry, not a survey of CM-101.
Heat-shield stations: NAA A-512S (1969), ST-428A, p.31. The side hatch remains provisional.
"""

import json
import math
from pathlib import Path

from mathutils import Vector

import perforated_wall
import side_hatch
from cm_reference import AFT_APEX_XC, survey_cm
from srlib import CM, IN, MeshBuilder, _segs, interior, lathe_obj, mark_shells, material, prof

RADIUS = 77.0
AFT_RADIUS = 184.8
SHOULDER_RADIUS = 7.7
CONE_ANGLE = math.radians(33)
# North American A-512S, 13 January 1969, ST-428A, printed p.31:
# explicitly Block II heat-shield stations. Common structural reference, not
# independently surveyed CM-101 skin coordinates or docking-probe height.
AFT_LIMIT = 23.23
FORWARD_LIMIT = 81.13
COVER_TOP = 112.25
TUNNEL_RADIUS = 15.0  # NAA News Reference p.47: nominal 30-inch forward hatch
_cr = RADIUS - SHOULDER_RADIUS
_cz = AFT_APEX_XC + AFT_RADIUS - math.sqrt((AFT_RADIUS - SHOULDER_RADIUS) ** 2 - _cr**2)
_aft_angle = math.atan2(_cr, AFT_APEX_XC + AFT_RADIUS - _cz)
JOIN_R = AFT_RADIUS * math.sin(_aft_angle)
JOIN_Z = AFT_APEX_XC + AFT_RADIUS * (1 - math.cos(_aft_angle))
CONE_R = _cr + SHOULDER_RADIUS * math.cos(CONE_ANGLE)
CONE_Z = _cz + SHOULDER_RADIUS * math.sin(CONE_ANGLE)
APEX = CONE_Z + CONE_R / math.tan(CONE_ANGLE)


def radius(z):
    if z <= JOIN_Z:
        return math.sqrt(max(0, AFT_RADIUS**2 - (z - AFT_APEX_XC - AFT_RADIUS) ** 2))
    if z < CONE_Z:
        return _cr + math.sqrt(max(0, SHOULDER_RADIUS**2 - (z - _cz) ** 2))
    return (APEX - z) * math.tan(CONE_ANGLE)


def _on_cone(point, normal):
    """Project a surveyed aperture along its measured normal to the nominal skin."""
    p, n = Vector(point), Vector(normal)
    k = math.tan(CONE_ANGLE)
    a = n.x**2 + n.y**2 - k**2 * n.z**2
    b = 2 * (p.x * n.x + p.y * n.y + k**2 * (APEX * IN - p.z) * n.z)
    c = p.x**2 + p.y**2 - k**2 * (APEX * IN - p.z) ** 2
    disc = b * b - 4 * a * c
    if disc < 0:
        raise ValueError("Surveyed aperture does not project onto the conical wall")
    roots = ((-b - math.sqrt(disc)) / (2 * a), (-b + math.sqrt(disc)) / (2 * a))
    t = min(roots, key=abs)
    return p + n * t


def build(cm, heatshield, forward, hatch_node, base, foil, void):
    """Keep named flight nodes; the forward assembly is explicitly unfinished."""
    survey = json.loads((Path(__file__).parent / "reference" / "apollo-cm-apertures.json").read_text())
    apertures = []
    for port in survey["apertures"]:
        measured = [Vector(survey_cm(p, survey["registration"])) * CM for p in port["boundary_cm"]]
        n = port["normal"]
        normal = Vector((-n[1], n[0], n[2]))
        rim = [_on_cone(p, normal) for p in measured]
        polygon = perforated_wall.domain(rim)
        apertures.append((port["id"], measured, rim, polygon))
    hatch = side_hatch.opening()
    holes = [p[3] for p in apertures] + [hatch]

    def normal(z):
        if z <= JOIN_Z:
            return radius(z) / AFT_RADIUS, (z - AFT_APEX_XC - AFT_RADIUS) / AFT_RADIUS
        if z < CONE_Z:
            return (radius(z) - _cr) / SHOULDER_RADIUS, (z - _cz) / SHOULDER_RADIUS
        return math.cos(CONE_ANGLE), math.sin(CONE_ANGLE)

    skin = perforated_wall.build("CM_CrewCompartmentSkin", cm, foil, base, AFT_LIMIT, FORWARD_LIMIT, radius, normal, holes, joins=(CONE_Z,))
    probes = []
    for port, (_, measured, _, _) in zip(survey["apertures"], apertures, strict=True):
        n = port["normal"]
        probes.append((port["id"], measured, Vector((-n[1], n[0], n[2]))))
    perforated_wall.check_openings(skin, probes, base)
    for name, measured, rim, _ in apertures:
        # The measured opening and nominal surface define the reveal. No raised
        # guessed tube is added around these apertures.
        mesh = MeshBuilder()
        verts = [(p.x, p.y, base * IN + p.z) for p in measured + rim]
        n = len(measured)
        mesh.add(verts, [(i, i + n, (i + 1) % n + n, (i + 1) % n) for i in range(n)])
        mesh.build(f"CM_WindowReveal_{name}", foil, cm)
        mark_shells([f"CM_WindowReveal_{name}"])
        if not interior():
            # Distance-only stand-in: the full model has real clear panes.
            mesh = MeshBuilder()
            mesh.add(verts[:n], [tuple(range(n))])
            obj = mesh.build(f"CM_WindowDistantVoid_{name}", void, cm)
            obj.data.materials[0].use_backface_culling = False
    # Truncate the nominal conical wall at the documented cover station. The
    # upper edge fillet is omitted: the idealized wind-tunnel nose radius is not
    # established as the flight heat shield's edge radius.
    lathe_obj(
        "CM_ForwardShield",
        prof([(radius(FORWARD_LIMIT), base + FORWARD_LIMIT), (radius(COVER_TOP), base + COVER_TOP), (TUNNEL_RADIUS, base + COVER_TOP)]),
        foil,
        forward,
        segs=128,
    )
    side_hatch.build(hatch_node, base, radius, normal, _on_cone, void)
    # ST-428A places the aft-shield joint at Xc23.23. Retain the nominal
    # spherical and toroidal curvature through that station, including R77 at
    # the shoulder's widest point. Skin thickness is not invented.
    thin_shield = material("apollo-aft-shield-surface", (0.29, 0.24, 0.20), roughness=0.85, double_sided=True)
    sphere = [
        (AFT_RADIUS * math.sin(_aft_angle * i / _segs(32)), base + AFT_APEX_XC + AFT_RADIUS * (1 - math.cos(_aft_angle * i / _segs(32))))
        for i in range(_segs(32) + 1)
    ]
    start = math.atan2(JOIN_Z - _cz, JOIN_R - _cr)
    end = math.asin((AFT_LIMIT - _cz) / SHOULDER_RADIUS)
    angles = sorted({0.0, *[start + (end - start) * i / _segs(24) for i in range(_segs(24) + 1)]})
    shoulder = [(_cr + SHOULDER_RADIUS * math.cos(a), base + _cz + SHOULDER_RADIUS * math.sin(a)) for a in angles]
    lathe_obj("CM_AftShield", prof(sphere + shoulder[1:]), thin_shield, heatshield, segs=128)
