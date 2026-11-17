"""Rebuild the shared DSKY front-web reference and its console display mask.

uv run --with cadquery-ocp==8.0.1.1.0 --with numpy --with scipy --with shapely \
  rebuild_dsky_front.py 2004739A-000.stp interior-panel.glb
Blender 5.x imports the metric survey; OCC reads only the CAD's planar front face.
No downloads, textures, photographic dimensions, rear ribs or scale fitting.
See ../dsky-front.md for applicability, nominal dimensions and omissions.
"""

import argparse
import gzip
import hashlib
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
STEP_SHA256 = "42f825e464be251824f3ad33bf42bcddbfb6ebad68a1f7944ab829f190cbc812"
SURVEY_SHA256 = "265d4801baca265083090fbcf21cd2efbf47cd0a33403de8f5c2e0de4e9ab92c"
WIDTH_IN = 6.900
HEIGHT_IN = 8.000
# 2004929D Section B-B: .04–.06 in front web; tolerance midpoint.
WEB_IN = (0.04 + 0.06) / 2
# 2004929D side view: overall 1.567–1.572 in; CAD's planar front datum.
FRONT_IN = (1.567 + 1.572) / 2


def export_survey(source, output):
    """Runs only inside factory-startup Blender. Preserve physical centimetres."""
    import bpy
    import numpy as np

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    vertices, triangles = [], []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        offset = len(vertices)
        vertices.extend(tuple(obj.matrix_world @ p.co) for p in obj.data.vertices)
        triangles.extend(tuple(offset + i for i in f.vertices) for f in obj.data.loop_triangles)
    np.savez(output, vertices=vertices, triangles=triangles)


def cad_web(step):
    """Retain the planar front contour; replace no rear feature with a guess."""
    import numpy as np
    import rebuild_dsky_housing as housing
    from OCP.Bnd import Bnd_Box
    from OCP.BRepAdaptor import BRepAdaptor_Surface
    from OCP.BRepBndLib import BRepBndLib
    from OCP.BRepCheck import BRepCheck_Analyzer
    from OCP.BRepPrimAPI import BRepPrimAPI_MakePrism
    from OCP.GeomAbs import GeomAbs_Plane
    from OCP.gp import gp_Vec
    from OCP.TopAbs import TopAbs_WIRE
    from OCP.TopExp import TopExp_Explorer

    selected = []
    for face in housing.faces(housing.read_shape(step)):
        surface = BRepAdaptor_Surface(face)
        if surface.GetType() != GeomAbs_Plane:
            continue
        plane = surface.Plane()
        if abs(plane.Axis().Direction().Z()) > 0.99 and abs(plane.Location().Z() / 25.4 - FRONT_IN) < 1e-7:
            selected.append(face)
    if len(selected) != 1:
        raise ValueError("Expected the single planar front face of this transcription")
    face = selected[0]
    explorer = TopExp_Explorer(face, TopAbs_WIRE)
    bounds = []
    while explorer.More():
        box = Bnd_Box()
        BRepBndLib.AddOptimal_s(explorer.Current(), box)
        lo, hi = box.CornerMin(), box.CornerMax()
        bounds.append(tuple(round(x / 25.4, 7) for x in (lo.X(), lo.Y(), hi.X(), hi.Y())))
        explorer.Next()
    if len(bounds) != 23 or (0.0, 0.0, WIDTH_IN, HEIGHT_IN) not in bounds:
        raise ValueError("Front contour must have its nominal envelope and 22 internal loops")
    # 2004929D: .907–.913 square clearances; .970 pitch, with staggered
    # outer columns. These checks do not independently audit every fillet.
    square = (0.907 + 0.913) / 2
    expected = [(x, y, round(x + square, 7), round(y + square, 7)) for x in (1.055, 2.025, 2.995, 3.965, 4.935) for y in (0.085, 1.055, 2.025)]
    expected += [(x, y, round(x + square, 7), round(y + square, 7)) for x in (0.085, 5.905) for y in (0.570, 1.540)]
    if any(x not in bounds for x in expected):
        raise ValueError("The nineteen keyboard-clearance bounds changed")
    solid = BRepPrimAPI_MakePrism(face, gp_Vec(0, 0, -WEB_IN * 25.4), False, True).Shape()
    if not BRepCheck_Analyzer(solid).IsValid():
        raise ValueError("Invalid nominal front-web extrusion")
    mesh = housing.tessellate(solid, 0.0001, 10)
    # Undo the housing helper's rotation, then put the front plane at local Z0.
    vertices = np.array([(x, -y, -z - FRONT_IN) for x, y, z in mesh["vertices_in"]])
    return *mesh_web(vertices, mesh["triangles"]), bounds


def mesh_web(vertices, triangles):
    """Use one boundary for both caps and walls, without near-collinear cap slivers."""
    from collections import Counter

    import numpy as np
    from shapely import constrained_delaunay_triangles
    from shapely.geometry import Polygon
    from shapely.geometry.polygon import orient
    from shapely.ops import unary_union

    triangles = np.array(triangles)
    front = triangles[np.max(abs(vertices[triangles, 2]), axis=1) < 1e-8]
    original = unary_union([Polygon(vertices[f, :2]) for f in front])
    # The source B-rep was tessellated to .0001 in. Removing redundant boundary
    # samples within .0019 in keeps the combined chord approximation <=.002 in.
    # This is rendering deflection, not a new manufactured fillet dimension.
    polygon = orient(original.simplify(0.0019, preserve_topology=True), sign=1)
    if not polygon.is_valid or polygon.geom_type != "Polygon" or len(polygon.interiors) != 22:
        raise ValueError("Front-web meshing changed an opening")
    if original.hausdorff_distance(polygon) > 0.0019 + 1e-9:
        raise ValueError("Front-web boundary exceeded its tessellation allowance")
    result, faces, index = [], [], {}

    def vertex(point):
        point = tuple(round(float(x), 9) for x in point)
        if point not in index:
            index[point] = len(result)
            result.append(point)
        return index[point]

    cap = constrained_delaunay_triangles(polygon)
    if not math.isclose(sum(f.area for f in cap.geoms), polygon.area, rel_tol=1e-10):
        raise ValueError("Constrained caps changed the web area")
    for face in cap.geoms:
        points = np.array(face.exterior.coords)[:3]
        a, b = points[1] - points[0], points[2] - points[0]
        if a[0] * b[1] - a[1] * b[0] < 0:
            points = points[::-1]
        faces.append([vertex((x, y, 0)) for x, y in points])
        faces.append([vertex((x, y, -WEB_IN)) for x, y in points[::-1]])
    for ring in (polygon.exterior, *polygon.interiors):
        points = list(ring.coords)
        for a, b in zip(points[:-1], points[1:], strict=True):
            af, ab = vertex((*a, 0)), vertex((*a, -WEB_IN))
            bf, bb = vertex((*b, 0)), vertex((*b, -WEB_IN))
            faces.extend(((af, ab, bb), (af, bb, bf)))
    edges = Counter(tuple(sorted((f[i], f[(i + 1) % 3]))) for f in faces for i in range(3))
    if set(edges.values()) != {2}:
        raise ValueError("Nominal web mesh is not a closed two-manifold")
    return np.array(result), faces


def survey_pose(survey, console):
    """Derive a rigid reference pose from the shared metal front, excluding displays."""
    import numpy as np
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components

    vertices, triangles = survey["vertices"], survey["triangles"]
    if vertices.shape != (327288, 3) or triangles.shape != (210348, 3):
        raise ValueError("Survey import changed; review component identification before rebuilding")
    unique, inverse = np.unique(vertices, axis=0, return_inverse=True)
    welded = inverse[triangles]

    def labels(faces):
        a, b = faces.ravel(), np.roll(faces, 1, axis=1).ravel()
        graph = coo_matrix((np.ones(len(a)), (a, b)), shape=(len(unique), len(unique))).tocsr()
        _, lab = connected_components(graph, directed=False)
        return lab[faces[:, 0]]

    component = np.flatnonzero(labels(welded) == 785)
    if len(component) != 1293:
        raise ValueError("The visually identified DSKY component changed")
    t = triangles[component]
    normal = np.array(console["extraction"]["plane_normal"])
    centre = np.array(console["extraction"]["plane_centre_cm"])
    horizontal = np.array([1.0, 0, 0])
    horizontal -= horizontal @ normal * normal
    horizontal /= np.linalg.norm(horizontal)
    down = np.cross(normal, horizontal)
    uv = np.stack([(vertices - centre) @ a for a in (horizontal, down, normal)], axis=1)
    points = uv[t]
    mid = points.mean(axis=1)
    cross = np.cross(points[:, 1] - points[:, 0], points[:, 2] - points[:, 0])
    area = np.linalg.norm(cross, axis=1) / 2
    parallel = abs(cross[:, 2] / np.maximum(2 * area, 1e-20)) > 0.98

    def regions(mask):
        ids = np.flatnonzero(mask)
        lab = labels(welded[component[ids]])
        return [ids[lab == k] for k in np.unique(lab)]

    def spread(ids):
        return np.prod(np.ptp(points[ids, :, :2].reshape(-1, 2), axis=0))

    # Segmentation bands describe this processed derivative, not hardware
    # dimensions, manufactured tolerances or absolute survey accuracy.
    seed = max(regions(parallel & (abs(mid[:, 2] + 0.005) < 0.015)), key=spread)
    p = mid[seed]
    weight = np.sqrt(area[seed])
    fit = np.linalg.lstsq(np.c_[p[:, :2], np.ones(len(p))] * weight[:, None], p[:, 2] * weight, rcond=None)[0]
    residual = points[:, :, 2] - points[:, :, 0] * fit[0] - points[:, :, 1] * fit[1] - fit[2]
    metal = max(regions(parallel & (abs(residual).max(axis=1) < 0.04)), key=spread)
    if len(metal) != 234:
        raise ValueError("Shared front-metal plane selection changed")
    extent = points[metal, :, :2].reshape(-1, 2)
    mid_xy = (extent.min(axis=0) + extent.max(axis=0)) / 2
    front_centre = centre + horizontal * mid_xy[0] + down * mid_xy[1] + normal * (fit[:2] @ mid_xy + fit[2])
    right = horizontal + normal * fit[0]
    right /= np.linalg.norm(right)
    up = -(down + normal * fit[1])
    up -= right * (right @ up)
    up /= np.linalg.norm(up)
    front = np.cross(right, up)
    basis = np.stack([right, up, front], axis=1)
    if abs(np.linalg.det(basis) - 1) > 1e-10:
        raise ValueError("Registration must be rigid and preserve handedness")
    origin = front_centre - right * WIDTH_IN * 2.54 / 2 - up * HEIGHT_IN * 2.54 / 2
    evidence = {
        "component": 785,
        "metal_source_face_indices": component[metal].tolist(),
        "plane_coefficients_in_console_basis": fit.tolist(),
        "segmentation_vertex_band_cm": 0.04,
        "source_metal_span_cm": np.ptp(extent, axis=0).tolist(),
        "nominal_front_span_cm": [WIDTH_IN * 2.54, HEIGHT_IN * 2.54],
        "method": (
            "Area-weighted least-squares metal front plane; centre its retained planar bounds on the nominal cover envelope. "
            "Rigid orthonormal basis, no scaling. Display planes and their later covers excluded."
        ),
        "limits": (
            "Derived reference pose in CM-107, assumed shared for CM-101; not an as-built installation, attachment survey or clearance measurement. "
            "Processed mesh is not raw metrology."
        ),
    }
    return origin, basis, evidence, (centre, horizontal, down)


def console_mask(vertices_cm, console, axes):
    """Retain measured console interfaces and clear the nominal web's volume."""
    import numpy as np
    from shapely import constrained_delaunay_triangles
    from shapely.geometry import MultiPoint, Polygon
    from shapely.ops import unary_union

    centre, horizontal, down = axes
    footprint = MultiPoint(np.stack([(vertices_cm - centre) @ a for a in (horizontal, down)], axis=1)).convex_hull
    apertures = [
        Polygon(np.stack([(np.array(p["boundary_cm"]) - centre) @ a for a in (horizontal, down)], axis=1)) for p in console.get("apertures", [])
    ]
    mask = unary_union([footprint, *apertures])
    if not math.isclose(mask.area, footprint.area + sum(p.area for p in apertures), abs_tol=1e-8):
        raise ValueError("Measured console interfaces and nominal DSKY footprint overlap")
    result = []
    for surface in console["surfaces"]:
        boundary = np.array(surface["boundary_cm"])
        polygon = Polygon(np.stack([(boundary - centre) @ a for a in (horizontal, down)], axis=1))
        cut = polygon.difference(mask)
        triangles = constrained_delaunay_triangles(cut)
        if not math.isclose(sum(p.area for p in triangles.geoms), cut.area, rel_tol=1e-10, abs_tol=1e-8):
            raise ValueError("Console mask triangulation changed the reference area")
        points, faces = [], []
        for triangle in triangles.geoms:
            uv = np.array(triangle.exterior.coords)[:3]
            a, b = uv[1] - uv[0], uv[2] - uv[0]
            if a[0] * b[1] - a[1] * b[0] > 0:
                uv = uv[::-1]
            offset = len(points)
            points.extend((centre + uv[:, 0, None] * horizontal + uv[:, 1, None] * down).tolist())
            faces.append([offset, offset + 1, offset + 2])
        result.append({"id": surface["id"], "vertices_cm": points, "triangles": faces, "area_cm2": cut.area})
    return result, {
        "method": (
            "Convex footprint of the complete nominal front-web volume, projected onto the existing blank console plane. "
            "Subtract with the separate measured FDAI panel interfaces and constrained-triangulate. "
            "No offset or invented aperture machining."
        ),
        "area_cm2": footprint.area,
        "fixed_aperture_area_cm2": sum(p.area for p in apertures),
        "status": "Visualization interface only, not a measured manufactured console cutout",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("step", type=Path)
    parser.add_argument("survey", type=Path)
    parser.add_argument("--blender", default="/Applications/Blender.app/Contents/MacOS/Blender")
    parser.add_argument("--out", type=Path, default=HERE / "apollo-dsky-front-web.json.gz")
    args = parser.parse_args()
    for path, expected in ((args.step, STEP_SHA256), (args.survey, SURVEY_SHA256)):
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Unexpected source: {path.name}")
    import numpy as np

    console_path = HERE / "apollo-main-console.json"
    console = json.loads(console_path.read_text())
    if console["source"]["sha256"] != SURVEY_SHA256:
        raise ValueError("Console and DSKY must use the same shared survey")
    with tempfile.TemporaryDirectory(prefix="apollo-dsky-") as temporary:
        survey_path = Path(temporary) / "survey.npz"
        subprocess.run(
            [
                args.blender,
                "-b",
                "--factory-startup",
                "-P",
                str(Path(__file__).resolve()),
                "--",
                "--export-survey",
                str(args.survey.resolve()),
                str(survey_path),
            ],
            check=True,
        )
        with np.load(survey_path) as survey:
            origin, basis, evidence, axes = survey_pose(survey, console)
    vertices, triangles, loops = cad_web(args.step)
    placed = origin + (vertices * 2.54) @ basis.T
    panels, mask = console_mask(placed, console, axes)
    data = {
        "status": "Nominal shared front-web reference only; not a complete DSKY cover or equipped instrument",
        "cad": {
            "drawing": "2004739A front contour; 2004929D Section B-B front web",
            "url": "https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004739A-000.stp",
            "git_blob_sha": "dc831229cbcd76a7d2450605b3c112a91b24927c",
            "sha256": STEP_SHA256,
            "author": "ManoDaSilva",
            "licence": "CC0",
            "width_in": WIDTH_IN,
            "height_in": HEIGHT_IN,
            "web_in": WEB_IN,
            "front_loops_in": loops,
            "deflection_in": 0.002,
            "angle_degrees": 10,
            "cap_source_deflection_in": 0.0001,
            "boundary_simplification_in": 0.0019,
            "mesh_method": "Constrained planar caps and side walls from one simplified front boundary; closed oriented two-manifold",
        },
        "survey": console["source"],
        "shared_hardware": {
            "apollo7_dsky": "2003994-031",
            "apollo11_dsky": "2003994-121",
            "common_front_cover": "2004739-001",
            "scope": (
                "Shared cover only. The later indicator/display covers, labels, rear ribs and electronics are excluded. "
                "Front-web extrusion uses the stock drawing's nominal tolerance midpoint, not a full machined cover section."
            ),
        },
        "registration": {
            "origin_cm": origin.tolist(),
            "basis_columns": basis.T.tolist(),
            "evidence": evidence,
            "apollo_frame": console["registration"],
        },
        "console_source_sha256": hashlib.sha256(console_path.read_bytes()).hexdigest(),
        "console_mask": mask,
        "console_surfaces": panels,
        "mesh": {"vertices_in": vertices.tolist(), "triangles": triangles},
    }
    data["survey"] = dict(
        data["survey"],
        use="Measured CM-107 common front-cover plane and reference pose only; no equipment mesh, textures, later display covers or labels copied",
    )
    args.out.write_bytes(gzip.compress(json.dumps(data, separators=(",", ":")).encode(), mtime=0))
    print(f"DSKY front web: {len(triangles)} triangles, {WIDTH_IN} × {HEIGHT_IN} × {WEB_IN} in; rigid shared reference pose")


if __name__ == "__main__":
    if "--export-survey" in sys.argv:
        at = sys.argv.index("--export-survey")
        export_survey(Path(sys.argv[at + 1]), Path(sys.argv[at + 2]))
    else:
        main()
