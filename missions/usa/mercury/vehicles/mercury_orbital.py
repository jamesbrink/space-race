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
from mathutils import Matrix, Vector

import mercury_capsule
from mercury_capsule import Skin
from srlib import IN, MeshBuilder, interior, material, prof, text_mesh

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


# The tethered balloon's container (MA-7, and wanted again later): "packaged in a cylindrical container located in the
# antenna canister under the destabilizer flap" (NASA TN D-3814, p. 71). Its two liners were half-cylinders of balsa
# "about 6 inches long and 3 inches wide" (the same page): the container is drawn round them. Where under the flap it
# stood, and how deep, are estimated.
BALLOON_LINER = (1.5, 6.0)  # a liner's radius and length, in: documented
BALLOON_CAN = (1.75, 6.9)  # the container round them and the reel under them: its radius and depth, in: estimated
# its axis in the canister's top, in: under the flap as mercury_capsule builds it, toward the end of it that the viewer's
# cutaway opens (a capsule stood with its hatch on +X is cut along the line x + y = 0 here), so that the can is cut too
BALLOON_AT = (-2.6, 2.75)


def balloon_materials() -> dict:
    """The liners' fluorescent paints (their second colour, black, is not drawn): colours of ours for Day-Glo orange and yellow."""
    return {
        "dayglo_orange": material("paint-dayglo-orange", (1.0, 0.22, 0.02), 0.0, 0.6),
        "dayglo_yellow": material("paint-dayglo-yellow", (0.95, 0.85, 0.05), 0.0, 0.6),
    }


def balloon_canister(M: dict, about: str, liners: str) -> None:
    """The balloon experiment's container, let into the top of the antenna canister under the destabilising flap: a
    can with a lid, and in a cutaway the two balsa liners the folded balloon rode between, one orange and one yellow.
    `about` is what the flight says of the container, `liners` of what is in it. Build the antenna canister first."""
    g = bpy.data.objects["AntennaCanister"]
    top = mercury_capsule.Z_CAN_TOP
    (r, deep), (lr, ll) = BALLOON_CAN, BALLOON_LINER
    at = Matrix.Translation((BALLOON_AT[0] * IN, BALLOON_AT[1] * IN, 0.0))
    can = MeshBuilder()
    # (its lid stands a sixteenth of an inch proud of the canister's top, under the flap; its wall and floor are inside)
    lid = top + 0.07
    can.lathe(prof([(r, top - deep), (r, lid - 0.05), (r - 0.05, lid), (0.0, lid)]), 32, matrix=at)
    can.lathe(prof([(r, top - deep), (0.0, top - deep)]), 32, matrix=at, flip=True)
    obj = can.build("Antenna_BalloonCanister", M["aluminium"], g, sharp_angle=35)
    obj["label"], obj["about"] = "Balloon container", about
    if not interior():
        return
    for name, mat, a0 in (("Orange", "dayglo_orange", 0.0), ("Yellow", "dayglo_yellow", math.pi)):
        half = MeshBuilder()
        z0 = top - deep + 0.5  # (the reel and the strain gauge are under them: not modelled)
        gap = 0.06  # between the two liners' flat faces, in
        arc = (a0 + math.asin(gap / lr), a0 + math.pi - math.asin(gap / lr))
        half.lathe(prof([(lr, z0), (lr, z0 + ll)]), 16, matrix=at, arc=arc)
        ends = [(lr * math.cos(arc[0] + (arc[1] - arc[0]) * i / 16), lr * math.sin(arc[0] + (arc[1] - arc[0]) * i / 16)) for i in range(17)]
        for z, up in ((z0, False), (z0 + ll, True)):  # each end, and then the flat face
            ring = [tuple(at @ (Vector((x, y, z)) * IN)) for x, y in ends]
            fan = [(0, i, i + 1) if up else (0, i + 1, i) for i in range(1, 16)]
            half.add(ring, fan)
        (xa, ya), (xb, yb) = ends[0], ends[-1]
        face = [tuple(at @ (Vector(p) * IN)) for p in ((xa, ya, z0), (xb, yb, z0), (xb, yb, z0 + ll), (xa, ya, z0 + ll))]
        half.add(face, [(0, 1, 2, 3)])
        obj = half.build(f"Antenna_BalloonLiner{name}", M[mat], g, sharp_angle=35)
        obj["label"], obj["about"] = "Balloon liner", liners


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
