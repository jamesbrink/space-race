"""What the Mercury spacecraft that went into orbit had and the two Redstone capsules had not.

Not run by itself: an orbital flight's model/vehicle.py imports it beside mercury_capsule.py, which
still builds everything the capsules had alike. What is here: the ablation heat shield (the Redstone
flights' was a beryllium heat sink), a name painted by hand in a script (theirs were stencilled
capitals), the balloon's container, the stripes painted on a retropack and the high-frequency dipole
antenna hung on one. A flight builds what its own record gives it. Each flight's spacecraft.md says
what each number rests on.

Dimensions are inches, converted once with IN; stations and angles as mercury_capsule.py has them.
"""

from __future__ import annotations

import math
import os

import bpy
from mathutils import Matrix, Vector

import mercury_capsule
from mercury_capsule import Skin
from srlib import IN, TAU, MeshBuilder, Surf, interior, material, prof, text_mesh

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


# ------------------------------------------------------------------ the retropack, as an orbital flight's record has it

# The retropack's wall, as mercury_capsule.build_retropack turns it: a cylinder of 13 in radius between these stations.
PACK = Surf(13.0, 0.0, 0.0)
PACK_WALL = (-19.5, -10.85)
# Stripes painted down the retropack's wall, dark on light, to even out what the Sun and the shade did to the motors
# in it. Photographs of spacecraft No. 16 before it was mated show them (NASA GPN-2000-001441; NASA SP-12, Figure 1-5):
# how many there were and how wide are counted and scaled off the first, which shows half of them. Estimated.
STRIPES = (44, 0.7)  # how many dark stripes round the pack, and a stripe's width, in
STRIPE_LIFT = 0.06  # off the wall: a millimetre and a half, under the straps

# The high-frequency dipole antenna (MA-8, and wanted again later): "mounted on the retropackage ... consisted of two
# elements ... The extendable portion of the antenna was made of specially treated beryllium copper tape; and each
# side, when deployed by the firing of a squib, measured 14 feet long and five-eighths inch in diameter" (NASA TN
# D-4807, p. 61 and Figures 21 and 22). Documented: that there were two, on the retropack, and the tape's size. The
# unit that held each tape rolled up is drawn from the report's Figure 22, which has no scale, and where round the
# pack the two stood is not in anything read: opposite each other, between the straps. Estimated.
DIPOLE_TAPE = (14.0 * 12.0, 0.625)  # an element, out: its length and diameter, in: documented (it is modelled rolled up)
DIPOLE_UNIT = (4.6, 5.0)  # a unit's base plate, across the pack and along it, in: estimated
DIPOLE_AT = (math.radians(90.0), math.radians(270.0))  # where the two stand round the pack, in the pilot's frame: estimated
DIPOLE_Z = -15.2  # the middle of a unit's plate, the station: estimated


def retropack_materials() -> dict:
    return {
        "stripe": material("paint-retropack-black", (0.02, 0.02, 0.022), 0.0, 0.6),
        "reel": material("antenna-beryllium-copper", (0.72, 0.50, 0.26), 1.0, 0.38),
    }


def retropack_stripes(M: dict, about: str) -> None:
    """The dark stripes down the retropack's wall (STRIPES). Build the retropack first. Only the wall is striped here:
    the photographs show the stripes running on over the pack's lower end, between the nozzles, which is not drawn."""
    g = bpy.data.objects["Retropack"]
    count, wide = STRIPES
    z0, z1 = PACK_WALL[0] + 0.25, PACK_WALL[1] - 0.2
    half = wide / 2 / PACK.r0
    mb = MeshBuilder()
    for i in range(count):
        t = TAU * (i + 0.5) / count
        mb.grid(lambda u, z: PACK.p(u, z, STRIPE_LIFT), (t - half, t, t + half), (z0, z1))
    # (paint on the housing: cut open with it)
    mercury_capsule.thing(mb, "Retropack_Stripes", M["stripe"], g, "Retropack stripes", about, smooth=False)


def hf_dipole(M: dict, about: str) -> None:
    """The two elements of the high-frequency dipole antenna on the retropack's wall, as launched: each tape rolled up
    on its reel in a unit bolted to the pack (DIPOLE_UNIT, DIPOLE_AT), its guide pointing straight out from the
    capsule's axis, the way the tape ran when a squib let it go. Build the retropack first."""
    g = bpy.data.objects["Retropack"]
    across, along = DIPOLE_UNIT
    tape_r = DIPOLE_TAPE[1] / 2
    for k, t in enumerate(DIPOLE_AT):
        # (in a unit's own frame: x across the pack, y toward the capsule's nose, z straight out from the axis)
        F = PACK.frame(t, DIPOLE_Z)
        at = lambda x, y, z, F=F: F @ (Vector((x, y, z)) * IN)  # noqa: E731
        body, reel = MeshBuilder(), MeshBuilder()
        # the plate it is bolted to the pack by, sunk into the wall along its middle, and its four bolts
        mercury_capsule.chamfered(body, (across, along, 0.6), F @ Matrix.Translation((0.0, 0.0, 0.07 * IN)), 0.12)
        for sx in (-1, 1):
            for sy in (-1, 1):
                body.disc(at(sx * (across / 2 - 0.5), sy * (along / 2 - 0.5), 0.3), F.to_3x3() @ Vector((0, 0, 1)), 0.24 * IN, 0.2 * IN)
        # the housing under the reel, with the guide the tape leaves by and the squib that lets it go
        mercury_capsule.chamfered(body, (3.0, 2.3, 2.2), F @ Matrix.Translation((0.0, -1.1 * IN, 1.35 * IN)), 0.15)
        body.tube(at(0.0, -1.1, 2.3), at(0.0, -1.1, 3.25), 0.5 * IN, 14)
        body.tube(at(1.3, -1.75, 1.3), at(2.45, -1.75, 1.3), 0.42 * IN, 12)
        body.tube(at(2.35, -1.75, 1.3), at(2.75, -1.75, 1.3), 0.3 * IN, 10)
        # the two cheeks that carry the reel's axle
        for sx in (-1, 1):
            mercury_capsule.chamfered(body, (0.3, 2.5, 2.9), F @ Matrix.Translation((sx * 1.95 * IN, 1.15 * IN, 1.75 * IN)), 0.1)
        # the reel: the tape wound flat on a drum between two flanges, and its end standing in the guide
        reel.tube(at(-1.6, 1.15, 2.0), at(1.6, 1.15, 2.0), 1.05 * IN, 20)
        for sx in (-1, 1):
            reel.tube(at(sx * 1.45, 1.15, 2.0), at(sx * 1.7, 1.15, 2.0), 1.45 * IN, 20)
        reel.tube(at(0.0, -1.1, 3.05), at(0.0, -1.1, 3.6), tape_r * IN, 12)
        mercury_capsule.thing(body, f"Retropack_Dipole_{k}_Unit", M["aluminium"], g, "HF dipole antenna", about, shell=False, sharp_angle=35)
        mercury_capsule.thing(reel, f"Retropack_Dipole_{k}_Reel", M["reel"], g, "HF dipole antenna", about, shell=False, sharp_angle=35)
