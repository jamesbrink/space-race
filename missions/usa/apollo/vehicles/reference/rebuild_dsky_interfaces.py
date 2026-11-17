"""Extract shared metal display interfaces for comparison, NOT installation.

Run in the same OCC/numpy/scipy/shapely environment as rebuild_dsky_front.py:
  python rebuild_dsky_interfaces.py interior-panel.glb
Blender imports the hash-checked physical source with factory startup. The
existing front-web rigid pose is retained exactly; no fitting or scale change.
"""

import argparse
import gzip
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

from rebuild_dsky_front import HERE, SURVEY_SHA256, survey_pose


def interfaces(survey, origin, basis, evidence):
    """Retain the two closed source boundaries, with original physical vertices."""
    import numpy as np
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    source = survey["vertices"]
    local = (source - origin) @ basis / 2.54
    metal_faces = survey["triangles"][evidence["metal_source_face_indices"]]
    union = unary_union([Polygon(local[face, :2]) for face in metal_faces])
    plane = max(union.geoms, key=lambda p: p.area)
    rings = sorted(plane.interiors, key=lambda ring: Polygon(ring).centroid.x)
    if len(rings) != 2 or [len(ring.coords) - 1 for ring in rings] != [16, 18]:
        raise ValueError("Shared cover display-loop topology changed; inspect the source")
    ids = np.unique(metal_faces)
    result = []
    for name, ring in zip(("il", "el"), rings, strict=True):
        points = np.array(ring.coords)[:-1]
        nearest = [int(ids[np.argmin(np.linalg.norm(local[ids, :2] - p, axis=1))]) for p in points]
        if np.max(np.linalg.norm(local[nearest, :2] - points, axis=1)) > 1e-10:
            raise ValueError("A boundary point is not an original survey vertex")
        result.append(
            {
                "id": name,
                "boundary_in": points.tolist(),
                "source_vertex_indices": nearest,
                "source_vertices_cm": source[nearest].tolist(),
                "area_in2": Polygon(ring).area,
                "bounds_in": list(ring.bounds),
            }
        )
    return result


def compare(web, boundaries):
    """Audit compatibility with the committed nominal subset, without trimming."""
    import numpy as np
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    vertices = np.array(web["mesh"]["vertices_in"])
    faces = np.array(web["mesh"]["triangles"])
    front = faces[np.max(abs(vertices[faces, 2]), axis=1) < 1e-8]
    nominal = unary_union([Polygon(vertices[f, :2]) for f in front])
    outer = Polygon(nominal.exterior)
    old = sorted([Polygon(r) for r in nominal.interiors if r.bounds[3] - r.bounds[1] > 4], key=lambda p: p.centroid.x)
    if len(old) != 2:
        raise ValueError("Expected two nominal CAD display openings")
    result = []
    for source, cad in zip(boundaries, old, strict=True):
        polygon = Polygon(source["boundary_in"])
        outside = polygon.difference(outer)
        result.append(
            {
                "id": source["id"],
                "nominal_opening_bounds_in": list(cad.bounds),
                "symmetric_difference_in2": polygon.symmetric_difference(cad).area,
                "outside_nominal_outer_area_in2": outside.area,
                "outside_nominal_outer_rings_in": [
                    list(p.exterior.coords) for p in ([outside] if outside.geom_type == "Polygon" and not outside.is_empty else [])
                ],
            }
        )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("survey", type=Path)
    parser.add_argument("--blender", default="/Applications/Blender.app/Contents/MacOS/Blender")
    parser.add_argument("--out", type=Path, default=HERE / "apollo-dsky-display-interfaces.json.gz")
    args = parser.parse_args()
    if hashlib.sha256(args.survey.read_bytes()).hexdigest() != SURVEY_SHA256:
        raise ValueError("Unexpected survey source")
    import numpy as np

    web_path = HERE / "apollo-dsky-front-web.json.gz"
    console_path = HERE / "apollo-main-console.json"
    web = json.loads(gzip.decompress(web_path.read_bytes()))
    console = json.loads(console_path.read_bytes())
    if hashlib.sha256(console_path.read_bytes()).hexdigest() != web["console_source_sha256"]:
        raise ValueError("Front-web and console reference hashes differ")
    with tempfile.TemporaryDirectory(prefix="apollo-dsky-interfaces-") as temporary:
        survey_path = Path(temporary) / "survey.npz"
        subprocess.run(
            [
                args.blender,
                "-b",
                "--factory-startup",
                "-P",
                str(HERE / "rebuild_dsky_front.py"),
                "--",
                "--export-survey",
                str(args.survey.resolve()),
                str(survey_path),
            ],
            check=True,
        )
        with np.load(survey_path) as survey:
            origin, basis, evidence, _ = survey_pose(survey, console)
            if not np.array_equal(origin, web["registration"]["origin_cm"]) or not np.array_equal(basis.T, web["registration"]["basis_columns"]):
                raise ValueError("Existing rigid registration changed")
            boundaries = interfaces(survey, origin, basis, evidence)
    data = {
        "status": "Uninstalled comparison reference: source E/L contour crosses the older nominal outer contour; do not trim, scale or merge",
        "confidence": "assumed",
        "applicability": web["shared_hardware"],
        "source": web["survey"],
        "scope": (
            "Only the two fixed metal interfaces of verified shared cover 2004739-001. "
            "No later equipment, glass or frame geometry copied. Processed visualization derivative, not machining dimensions or raw metrology."
        ),
        "front_web_sha256": hashlib.sha256(web_path.read_bytes()).hexdigest(),
        "registration": web["registration"],
        "interfaces": boundaries,
        "comparison": compare(web, boundaries),
    }
    data["source"] = dict(data["source"], use="Unscaled projected fixed metal-cover display interfaces only; uninstalled comparison reference")
    args.out.write_bytes(gzip.compress(json.dumps(data, separators=(",", ":")).encode(), mtime=0))
    print("Shared display interfaces retained for comparison; installation withheld because the contours conflict")


if __name__ == "__main__":
    main()
