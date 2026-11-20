"""Shoulder markings visible in the December 6 suit-up and White Room photographs."""

import math
import sys
from pathlib import Path

mercury = Path(__file__).resolve().parents[2] / "mercury"
sys.path[:0] = [str(mercury / "crew"), str(mercury / "vehicles")]
import figurelib as fl  # noqa: E402
from mark_iv_suit import INSIGNIA_ART, insignia_image  # noqa: E402
from mercury_capsule import flag_image  # noqa: E402
from srlib import CM, MeshBuilder, material  # noqa: E402


def sleeve_emblems(arms, shoulder):
    # Dimensions in cm, estimated against the fittings in KSC-72PC-613 and KSC-72PC-627.
    for sign, width, height, name, picture in ((1, 10, 6.1, "Flag", flag_image), (-1, 7.6, 7.6, "NASA", insignia_image)):
        arm = arms[sign]
        station = 18.0
        centre = arm.toward((sign, -0.2, 0), station)
        span = width * 0.1 / (arm.at(station, centre + 0.05) - arm.at(station, centre - 0.05)).length
        grid = [i / 4 - 1 for i in range(9)]

        def shape(u, v, side=sign):
            if side == 1:
                return u, v
            return u * math.sqrt(1 - v * v / 2), v * math.sqrt(1 - u * u / 2)

        def surface(u, v, tube=arm, middle=centre, around=span, tall=height, plan=shape):
            x, y = plan(u, v)
            return tube.at(station - y * tall / 2, middle - x * around / 2, 0.50)

        def texture(u, v, plan=shape, scale=1 if sign == 1 else 1 / INSIGNIA_ART):
            x, y = plan(u, v)
            return (0.5 + 0.5 * x * scale) / CM, (0.5 + 0.5 * y * scale) / CM

        patch = MeshBuilder()
        patch.grid(surface, grid, grid, uv=texture)
        patch.share = [1.0] * len(patch.verts)  # the shoulder shell follows its upper-arm joint here
        mat = material("a7lb-sleeve-" + name.lower(), (1, 1, 1), roughness=0.93, image=picture())
        fl.emit(patch, "Torso_" + name, mat, shoulder)
