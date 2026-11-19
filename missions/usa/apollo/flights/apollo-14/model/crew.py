"""Shepard in his launch-day A7L, NASA KSC photograph 71PC-67."""

import sys
from pathlib import Path

import bpy

mission = Path(__file__).resolve()
sys.path.insert(0, str(mission.parents[6] / "tools/blender"))
sys.path.insert(0, str(mission.parents[3] / "crew"))
import a7l  # noqa: E402
from srlib import run  # noqa: E402


def build():
    # Apollo 14 Press Kit, prime commander biography: 5 ft 11 in.
    a7l.standing("Shepard", stature=71 * 2.54, ev=True)
    stripe = a7l.paint("a7l-commander-red", (0.58, 0.035, 0.025), roughness=0.9)
    # The garment UV's second coordinate is the station along each limb in metres.
    # Colour existing rows of cloth so the bands bend with the sleeves and trousers.
    for name, station in (("Arms_Sleeves", 0.32), ("Legs_Trousers", 0.30 + 0.50)):
        mesh = bpy.data.objects[name].data
        mesh.materials.append(stripe)
        uv = mesh.uv_layers.active.data
        for face in mesh.polygons:
            along = sum(uv[i].uv.y for i in face.loop_indices) / len(face.loop_indices)
            if abs(along - station) < 0.019:
                face.material_index = 1
    return "Alan Shepard, A7L EV launch garment, fitted to 5 ft 11 in stature"


run("Apollo 14 commander", build, [("shepard.png", (0, 0, 0.93), 4.2, dict(azimuth=-66, elevation=4, res=(620, 800), lens=50))])
