"""Recover the two fixed FDAI interfaces from the shared console survey.

python rebuild_console_apertures.py /path/to/x3d-cm-interior-panel-uvs-150k-4096-high.glb
Requires numpy, scipy and shapely outside Blender. The existing console reference
supplies its registered plane and outer contours; neither is refitted or scaled.
Regenerate the DSKY reference afterwards: its hash and console triangulation change.
"""

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SURVEY_SHA256 = "265d4801baca265083090fbcf21cd2efbf47cd0a33403de8f5c2e0de4e9ab92c"


def main():
    import numpy as np
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("survey", type=Path)
    parser.add_argument("--console", type=Path, default=HERE / "apollo-main-console.json")
    parser.add_argument("--blender", default="/Applications/Blender.app/Contents/MacOS/Blender")
    args = parser.parse_args()
    if hashlib.sha256(args.survey.read_bytes()).hexdigest() != SURVEY_SHA256:
        raise ValueError("Unexpected console survey")
    console = json.loads(args.console.read_text())
    if console["source"]["sha256"] != SURVEY_SHA256:
        raise ValueError("Console reference and aperture survey differ")
    with tempfile.TemporaryDirectory(prefix="apollo-console-") as temporary:
        export = Path(temporary) / "survey.npz"
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
                str(export),
            ],
            check=True,
        )
        with np.load(export) as survey:
            vertices, triangles = survey["vertices"], survey["triangles"]
    # Match the structural extraction's exact-position weld and stable component
    # numbering. No distance weld, triangle-plane band or instrument mesh is used.
    unique, inverse = np.unique(vertices, axis=0, return_inverse=True)
    indexed = inverse[triangles]
    rows, cols = indexed.ravel(), np.roll(indexed, 1, axis=1).ravel()
    graph = coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(len(unique),) * 2).tocsr()
    _, labels = connected_components(graph, directed=False)
    components = labels[indexed[:, 0]]
    normal = np.array(console["extraction"]["plane_normal"])
    centre = np.array(console["extraction"]["plane_centre_cm"])
    horizontal = np.array([1.0, 0.0, 0.0]) - normal * normal[0]
    horizontal /= np.linalg.norm(horizontal)
    down = np.cross(normal, horizontal)
    uv = np.stack([(vertices - centre) @ axis for axis in (horizontal, down)], axis=1)

    def polygon(points):
        points = np.array(points)
        return Polygon(np.stack([(points - centre) @ axis for axis in (horizontal, down)], axis=1))

    blank = unary_union([polygon(surface["boundary_cm"]) for surface in console["surfaces"]])
    apertures = []
    for name, component in (("fdai-1", 240), ("fdai-2", 712)):
        footprint = unary_union([Polygon(p) for p in uv[triangles[components == component]] if Polygon(p).area > 1e-10])
        if footprint.geom_type != "Polygon":
            raise ValueError(f"{name}: structural component no longer has one footprint")
        holes = sorted((Polygon(ring) for ring in footprint.interiors), key=lambda p: -p.area)
        if not holes or not blank.contains(holes[0]):
            raise ValueError(f"{name}: missing fixed interface inside the existing console")
        hole = holes[0]
        boundary = np.array(hole.exterior.coords)[:-1]
        probe = hole.representative_point()
        apertures.append(
            {
                "id": name,
                "source_component": component,
                "boundary_cm": (centre + boundary[:, 0, None] * horizontal + boundary[:, 1, None] * down).tolist(),
                "area_cm2": hole.area,
                "probe_cm": (centre + probe.x * horizontal + probe.y * down).tolist(),
            }
        )
        print(f"{name}: {len(boundary)} contour vertices, {hole.area:.9f} cm² projected interface")
    console["apertures"] = apertures
    # The original extraction used this same vertex graph; triangles meeting
    # at one welded vertex also belong to one component. Correct its wording.
    console["extraction"]["method"] = console["extraction"]["method"].replace("edge-connected triangle", "vertex-connected triangle")
    console["source"]["use"] = (
        "Main-console structural silhouette and two fixed FDAI interfaces only; assumed shared Block II structure. "
        "No CM-107 controls, labels, equipment, textures, couches or side wings."
    )
    console["extraction"]["aperture_method"] = (
        "The largest internal loop in each complete projected structural footprint, components 240 and 712. "
        "Keep every union-boundary point on the existing reference plane, with no circle fit, simplification or scaling. "
        "No instrument, glass, ball, case or electronics geometry is retained."
    )
    console["verification"]["apertures"] = (
        "The two fixed round FDAI interfaces correspond to the devices on CM-101 panels 1 and 2 in V36-976018 Rev D. "
        "NAA Guidance and Control Systems, S/C 101, 15 September 1967, SCS-2100D p.76 independently identifies the round front arrangement. "
        "Shared structural interfaces only, assumed for CM-101; processed-survey contours are not machining drawings or as-built measurements."
    )
    console["extraction"]["limits"] = (
        "Processed visualization derivative, not raw metrology. Projection and common-datum registration do not establish "
        "survey accuracy or manufacturing tolerance. Shared outer contour and two fixed FDAI interfaces only; "
        "support frame, individual panel joints, other instrument cutouts, equipment and controls unfinished."
    )
    args.console.write_text(json.dumps(console, indent=2) + "\n")


if __name__ == "__main__":
    main()
