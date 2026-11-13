"""What the Mercury spacecraft that went into orbit had and the two Redstone capsules had not.

Not run by itself: an orbital flight's model/vehicle.py imports it beside mercury_capsule.py, which
still builds everything the capsules had alike. What is here: the ablation heat shield (the Redstone
flights' was a beryllium heat sink), and a name painted by hand in a script (theirs were stencilled
capitals). Each flight's spacecraft.md says what each number rests on.

Dimensions are inches, converted once with IN; stations and angles as mercury_capsule.py has them.
"""

from __future__ import annotations

import math
import os

import bpy

import mercury_capsule
from mercury_capsule import Skin
from srlib import MeshBuilder, material, text_mesh

# Meshes of this module's that enclose something (the viewer's cutaway slices these).
SHELLS = ("HeatShield_Ablator", "HeatShield_Fasteners")


def materials() -> dict:
    return {
        # glass cloth in phenolic resin, as moulded: a dark brown laminate, dull
        "ablator": material("ablator-phenolic", (0.085, 0.052, 0.034), 0.0, 0.78),
        "paint_red": material("paint-red", (0.62, 0.035, 0.03), 0.0, 0.55, double_sided=True),
    }


def build_ablation_shield(M: dict, about: str) -> None:
    """The orbital flights' heat shield: the same outside as the heat sink (74.5 in across, an 80 in radius: the
    capsule's mould line did not change), but glass fibre in phenolic resin that chars and boils away. Built by
    mercury_capsule.build_heat_shield in this material; `about` is what the flight says of it."""
    mercury_capsule.build_heat_shield({**M, "beryllium": M["ablator"]})
    shield = bpy.data.objects["HeatShield_HeatSink"]
    shield.name = shield.data.name = "HeatShield_Ablator"
    shield["label"], shield["about"] = "Ablation heat shield", about


def script_font() -> bpy.types.VectorFont | None:
    """A chancery italic for a name lettered by hand; a flight's bold sans if the machine has none (the lettering is
    then the wrong hand, and the same size)."""
    for path in ("/System/Library/Fonts/Supplemental/Apple Chancery.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf"):
        if os.path.exists(path):
            return bpy.data.fonts.load(path)
    return None


def hand_lettering(
    skin: Skin,
    mb: MeshBuilder,
    body: str,
    size: float,
    theta0: float,
    z0: float,
    font,
    *,
    rise: float = 0.0,
    upright: bool = False,
    tall: float = 1.0,
    fatten: float = 0.0,
    lift: float = mercury_capsule.PAINT_LIFT,
) -> None:
    """Lettering painted on the shingles in its font's own proportions (Skin.lettering stretches capitals to a box):
    `size` inches long (or high, if `upright`), its middle at (theta0, z0), its line climbing `rise` radians to the
    right. `tall` makes the letters that much taller for their width (a narrow hand); `fatten` moves every outline out
    by that many inches (a brush's weight, or the edge round a letter: the letter fattened, under it)."""
    plain, faces = text_mesh(body, 1.0, font, cuts=0)
    xs, ys = [v[0] for v in plain], [v[1] for v in plain]
    k = size / (tall * (max(ys) - min(ys)) if upright else max(xs) - min(xs))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    if fatten:
        plain, faces = text_mesh(body, 1.0, font, cuts=0, offset=fatten / k)
    c, s = math.cos(rise), math.sin(rise)
    flat = [((x - cx) * k, (y - cy) * k * tall) for x, y, _ in plain]
    skin.paint(mb, [(x * c - y * s, x * s + y * c) for x, y in flat], faces, theta0, z0, lift=lift)
