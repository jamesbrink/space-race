"""Tessellate the CC0 drawing transcription, checking its main dimensions first.

uv run --with cadquery-ocp==8.0.1.1.0 rebuild_dsky_housing.py /path/to/2004968E.stp
Input URL, SHA-256, drawing authority and limitations: ../dsky-housing.md.
No downloads or photographic measurements. Blender needs only the generated gzip.
"""

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

from OCP.Bnd import Bnd_Box
from OCP.BRep import BRep_Tool
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.GeomAbs import GeomAbs_Cylinder
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_Reader
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED, TopAbs_SHELL, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopLoc import TopLoc_Location
from OCP.TopoDS import TopoDS

STEP_SHA256 = "848a59c7dd01ac29e1078f3a0df45277afb5a338ee87dd8badc72d7a029506d1"
MM_PER_IN = 25.4


def faces(shape):
    explorer = TopExp_Explorer(shape, TopAbs_FACE)
    while explorer.More():
        yield TopoDS.Face(explorer.Current())
        explorer.Next()


def read_shape(path):
    reader = STEPControl_Reader()
    if reader.ReadFile(str(path)) != IFSelect_RetDone:
        raise ValueError("Cannot read the DSKY housing STEP")
    reader.TransferRoots()
    shape = reader.OneShape()
    if not BRepCheck_Analyzer(shape).IsValid():
        raise ValueError("Invalid housing B-rep")
    for kind in (TopAbs_SOLID, TopAbs_SHELL):
        explorer = TopExp_Explorer(shape, kind)
        count = 0
        while explorer.More():
            if kind == TopAbs_SHELL and not explorer.Current().Closed():
                raise ValueError("Open housing shell")
            count += 1
            explorer.Next()
        if count != 1:
            raise ValueError("Expected one housing solid with one closed shell")
    return shape


def verify(shape):
    """2004968E front view and Section A-A, inch dimensions; no sheet scaling."""
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape, box)
    lo, hi = box.CornerMin(), box.CornerMax()
    bounds = [tuple(c / MM_PER_IN for c in (p.X(), p.Y(), p.Z())) for p in (lo, hi)]
    expected_bounds = [(0, 0, -8), (8.124, 0.9005 + 0.12, 0)]
    if any(abs(a - b) > 1e-7 for row, other in zip(bounds, expected_bounds, strict=True) for a, b in zip(row, other, strict=True)):
        raise ValueError(f"Housing envelope differs from the drawing: {bounds}")
    bores = set()
    for face in faces(shape):
        surface = BRepAdaptor_Surface(face)
        if surface.GetType() != GeomAbs_Cylinder:
            continue
        cylinder = surface.Cylinder()
        # Midpoint of the published .565–.566-inch tolerance, not an estimate.
        if abs(cylinder.Radius() / MM_PER_IN - 0.5655 / 2) > 1e-7:
            continue
        p, axis = cylinder.Location(), cylinder.Axis().Direction()
        if abs(axis.Y()) < 1 - 1e-7:
            raise ValueError("Switch bore is not normal to the front face")
        # A through-bore has separate front and rear cylindrical face patches.
        # Compare the unique axes, rather than counting those as extra holes.
        bores.add((round(p.X() / MM_PER_IN, 7), round(-p.Z() / MM_PER_IN, 7)))
    # All locations are BASIC offsets from the right B-hole axis and the
    # horizontal line above the keyboard in the front view. .970 is derived
    # from successive 1.370/2.340/3.310/4.280/5.250 BASIC offsets.
    expected = [(round(7.371 - x, 7), round(2.895 - z, 7)) for x in (1.370, 2.340, 3.310, 4.280, 5.250) for z in (0.415, 1.385, 2.355)]
    expected += [(round(7.371 - x, 7), round(2.895 - z, 7)) for x in (0.400, 6.220) for z in (0.900, 1.870)]
    if sorted(bores) != sorted(expected):
        raise ValueError(f"Nineteen switch-bore locations differ from the drawing: {bores}")
    print("Verified envelope and all nineteen switch-bore diameters, locations and axes")


def tessellate(shape, deflection_in, angle_deg):
    BRepMesh_IncrementalMesh(shape, deflection_in * MM_PER_IN, False, math.radians(angle_deg), False).Perform()
    vertices, triangles = [], []
    for face in faces(shape):
        location = TopLoc_Location()
        mesh = BRep_Tool.Triangulation_s(face, location)
        if mesh is None:
            raise ValueError("Untessellated housing face")
        offset = len(vertices)
        for i in range(1, mesh.NbNodes() + 1):
            p = mesh.Node(i).Transformed(location.Transformation())
            # Rigid 180-degree X rotation: front faces -Y, top is +Z.
            # Retain drawing inches; dsky_housing.py converts once to metres.
            vertices.append([round(c / MM_PER_IN, 9) for c in (p.X(), -p.Y(), -p.Z())])
        for i in range(1, mesh.NbTriangles() + 1):
            a, b, c = mesh.Triangle(i).Get()
            if face.Orientation() == TopAbs_REVERSED:
                b, c = c, b
            triangles.append([offset + a - 1, offset + b - 1, offset + c - 1])
    return {"deflection_in": deflection_in, "angle_deg": angle_deg, "vertices_in": vertices, "triangles": triangles}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("step", type=Path)
    parser.add_argument("--out", type=Path, default=Path(__file__).with_name("apollo-dsky-housing.json.gz"))
    args = parser.parse_args()
    if hashlib.sha256(args.step.read_bytes()).hexdigest() != STEP_SHA256:
        raise ValueError("Unexpected STEP source; review the drawing and transcription before changing its hash")
    verify(read_shape(args.step))
    levels = []
    for deflection, angle in ((0.002, 10), (0.004, 15), (0.008, 25)):
        # Fresh B-rep: OCC's previous, finer face triangulations must not be
        # reused for a supposedly coarser level.
        level = tessellate(read_shape(args.step), deflection, angle)
        levels.append(level)
        print(f"{deflection} in / {angle} deg: {len(level['triangles'])} triangles")
    data = {
        "drawing": "2004968 revision E, sheet 1, dash -021",
        "source": "https://github.com/virtualagc/virtualagc/blob/mechanical/3D-models/2004968E.stp",
        "git_blob_sha": "b2052a787ff775928ff3ee5cd3c9ee01de9e838f",
        "step_sha256": STEP_SHA256,
        "author": "ManoDaSilva",
        "licence": "CC0",
        "status": "Drawing-reference component; CM-101 front-assembly applicability and installed pose unresolved",
        "levels": levels,
    }
    args.out.write_bytes(gzip.compress(json.dumps(data, separators=(",", ":")).encode(), mtime=0))


if __name__ == "__main__":
    main()
