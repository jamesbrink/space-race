"""Pad 31/6 for Soyuz 3 and 4. Launch-day exhibit; dimensions and appearance in site-31.md."""

import math
import sys
from pathlib import Path

root = next(path for path in Path(__file__).resolve().parents if (path / "tools/blender").is_dir())
sys.path.insert(0, str(root / "tools/blender"))
sys.path.insert(0, str(root / "missions/ussr/places/tyuratam"))
from site1 import launch_system  # noqa: E402
from site1.site import Parts, materials  # noqa: E402
from site1.soyuz_access import build_towers  # noqa: E402
from sitelib import box, fine, handrail  # noqa: E402
from srlib import run  # noqa: E402


def platform(parts):
    parts.node("Platform")
    slab = parts("Platform", "concrete")
    # A ring from the round launcher socket to the square edge. Omit shared radial faces.
    segments = 48
    for i in range(segments):
        ends = []
        for j in (i, i + 1):
            angle = math.tau * j / segments
            c, s = math.cos(angle), math.sin(angle)
            outer = 19.8 / max(abs(c), abs(s))
            ends += [(9.85 * c, 9.85 * s, 0), (outer * c, outer * s, 0), (outer * c, outer * s, -2.8), (9.85 * c, 9.85 * s, -2.8)]
        slab.add(ends, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
    for x in (-16.5, 16.5):
        for y in (-15.6, 15.6):
            box(slab, (x - 1.8, y - 1.6, -29), (x + 1.8, y + 1.6, -2.81))
    handrail(
        parts("Platform", "galv"), [(-19.3, -19.35, 0), (19.35, -19.35, 0), (19.35, 19.35, 0), (-19.3, 19.35, 0)], height=1.05, post=0.06, rail=0.05
    )
    parts.node("RailApproach")
    box(parts("RailApproach", "concrete"), (-83, -8.5, -1.6), (-19.81, 8.5, 0))
    for y in (-0.798, 0.798):
        box(parts("RailApproach", "rail"), (-82.99, y - 0.036, 0.006), (-9.93, y + 0.036, 0.065))
    if fine():
        for x in range(-81, -20, 3):
            for sign in (-1, 1):
                box(parts("RailApproach", "joint"), (x, sign * 4.2 - 3.8, 0.004), (x + 0.025, sign * 4.2 + 3.8, 0.008))


def build():
    parts = Parts(materials())
    platform(parts)
    # The January launch photograph shows a narrow free-standing lattice mast beside the rocket.
    # Its dimensions and position in this frame are estimates from that single oblique view.
    parts.node("PadMast")
    metal = parts("PadMast", "dark")
    box(parts("PadMast", "concrete"), (-22.8, -23.8, -4.0), (-19.2, -20.2, 0.22))

    def corner(index, z):
        half = 0.92 - 0.68 * z / 31
        dx, dy = [(-1, -1), (1, -1), (1, 1), (-1, 1)][index]
        return (-21 + dx * half, -22 + dy * half, z)

    for i in range(4):
        metal.tube(corner(i, 0.24), corner(i, 31.0), 0.074, 8)
        for z in range(0, 30, 3):
            low, high = z + 0.24, z + 3.24
            metal.tube(corner(i, low), corner((i + 1) % 4, high), 0.041, 6)
            metal.tube(corner(i, high), corner((i + 1) % 4, high), 0.048, 6)
    metal.tube((-21, -22, 30.96), (-21, -22, 33.7), 0.08, 8)
    launch_system.build(parts)
    build_towers(parts)
    parts.build()
    return "Site 31/6, October 1968 and January 1969; estimated 39.6 m deck"


run("Tyuratam Site 31", build, [("site-31.png", (-9, 0, 3), 110, dict(azimuth=42, elevation=19, res=(1120, 740)))])
