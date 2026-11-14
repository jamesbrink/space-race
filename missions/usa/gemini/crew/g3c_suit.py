"""The G3C pressure suit, as Virgil Grissom and John Young wore it on Gemini-Titan 3 (23 March 1965).

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure faces -Y, so his left is
+X. See ./g3c-suit.md: nothing of the suit's own size is in print beyond the Smithsonian's overall figures for the two
flown suits, so every part is placed from the photographs of those two suits (front and back) and of the two men on
the day and in the cabin, against the men, and is an estimate. The body is figurelib's man carried to each man's
stature; the suit is the garment on it, a module of its own: it is not the Mercury suit recoloured.

What is built: the torso and limbs in their white outer layer, the helmet (white shell, a clear visor on side pivots
with its bright band across the brow, the blue neck ring), the helmet's tie-down (cable, buckle, blue strap), the name
tag and the NASA insignia, the electrical connector and the two gas connectors, the gauge on the left
forearm, pockets on the upper arms and the shins, the pressure zip up the back with a blue strap either side, gloves
on wrist rings (his right red), white laced boots with red straps, and over it the personal parachute harness.

It is built only seated, for a cabin (`build_seated`): every mesh a child of the caller's node, carried to the pose
of a Gemini ejection seat, visor down. Mesh names begin Helmet_, Torso_, Arms_, Gloves_, Legs_ and Boots_, which is
how figurelib knows which joints carry each. The seat's own restraint (the reel's straps, the lap belt) is the
seat's: `build_seated` returns where it has to run (`worn`) and ../vehicles/gemini_cabin.py lays it.

The straps are laid on the cloth as built with the Mercury suit module's `strap`, and the insignia is that module's
drawing of it (the same emblem); nothing else here is the Mark IV's.
"""

from __future__ import annotations

import math
import os
import sys
from dataclasses import dataclass, field

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "mercury", "crew"))
import figurelib as fl  # noqa: E402
import mark_iv_suit as mk  # noqa: E402  (its Art, its insignia and its strap-laying: tools, not the garment)
import srlib  # noqa: E402
from figurelib import Folds, Rig, Trousers, Tube, band, build_head, build_shell, emit, gauss, grain, group, ring, sides, skin, smooth, squareness  # noqa: E402
from srlib import CM, TAU, MeshBuilder, arc_profile, frame, material  # noqa: E402

# The seated posture, as joint angles in degrees (figurelib.seated_rig), and each arm's own: (the upper arm swung
# forward at the shoulder, drawn in to the side, the elbow, its hinge turned in, the forearm turned palm down, the hand
# closed 0 to 1). Chosen so that the man fits the seat as gemini_cabin.py lays it out: estimated.
SEATED = {
    "hip": 104.0,
    "knee": 112.0,
    "ankle": 14.0,
    "knees_in": 0.0,
    "pelvis": 10.0,
    "elbow": 70.0,
    "elbow_toe_in": 30.0,
    "pronate": 40.0,
    "grip": 0.0,
}
LAP = (-3.0, 11.5, 1.2)  # where a thigh pressed against the belly stops: figurelib.seated_rig
LAP_BELT = 3.0  # the lap belt crosses him this far toward his head from his hip joints
REST = (10.0, 11.0, 70.0, 26.0, 52.0, 0.15)  # a hand lying on its own thigh


@dataclass(frozen=True)
class Wearer:
    """Who is in the suit: his name as lettered on its tag, his stature, his build beside figurelib's man, and where
    each arm is in the seat (`left`, `right`: see REST)."""

    name: str
    stature: float
    breadth: float = 1.0
    girth: float = 1.0
    left: tuple[float, ...] = REST
    right: tuple[float, ...] = REST
    seated: dict = field(default_factory=dict)  # what of SEATED is his own


# 170.2 cm is 5 ft 7 in, as commonly given for Grissom (no primary record of it was found; the Mercury module uses the
# same); 175.3 cm is 5 ft 9 in, from NASA's biographical data sheet for Young as a search of it returned it (the sheet
# itself was not opened). Both estimated: g3c-suit.md, "The men".
GRISSOM = Wearer("V.I. GRISSOM", 170.2, 0.98, 1.0)
YOUNG = Wearer("J.W. YOUNG", 175.3, 0.99, 0.98)

REF = fl.man()
BOOT_TOP = 27.0  # as on a man of 1.80 m: to the lower calf
BOOT_LENGTH = 31.2
# The helmet, which is the same size on any man: heights above the middle of the neck ring.
SHELL_R0, SHELL_R, SHELL_TOP, SHELL_DEEP = 12.2, 13.8, 27.6, 1.06  # radius at the ring, at its widest, its height, fore-and-aft over across
VISOR = (math.radians(72), 12.4, 9.3)  # the opening: half its width round the shell, its middle above the ring, half its height
INSIGNIA_UNDER_RING, INSIGNIA_AZ = 13.2, 23.0  # the NASA insignia's middle: under the ring's middle, and round toward his left, degrees
NAME_TAG = (9.6, 2.2)  # the name tag: long, tall
NAME_TAG_UNDER_RING, NAME_TAG_AZ = 11.6, -21.0
BUCKLE_UNDER_RING = 11.2  # the tie-down's buckle, on the middle of the chest
HARNESS_WEB = 4.4  # 1 3/4 in webbing (the usual; not measured)
QD_UNDER_RING = 12.5  # the harness's quick disconnects, "forward and below each shoulder" (SEDR 300, p. 3-16)
BLUE = (0.018, 0.03, 0.17)


def up(z: float) -> float:
    """A height written for figurelib's man of 1.80 m, on whoever wears the suit."""
    return B.heel + (z - REF.heel) * (B.stature / REF.stature)


def body(who: Wearer) -> fl.Body:
    """The man in his suit: figurelib's man carried to his stature, let out a little by the suit's loose outer layer."""
    size = who.stature / REF.stature
    b = REF.scaled(stature=who.stature, heel=2.8 * size, breadth=who.breadth, girth=who.girth, bulk=(0.5, 0.4, 0.3))
    plain = REF.scaled(stature=who.stature, heel=2.8 * size, breadth=who.breadth, girth=who.girth)
    # where the cloth goes into something it is not let out: the neck into the ring, the cuffs into the gloves
    b.torso[-4:] = plain.torso[-4:]
    b.arm[-2:] = plain.arm[-2:]
    b.leg[-2:] = plain.leg[-2:]  # and the legs into the boots
    return b


def wear(who: Wearer) -> None:
    """Whose suit is built from here on."""
    global WEARER, SIZE, B, RING_Z, RING_Y, H0
    WEARER = who
    SIZE = who.stature / REF.stature
    B = body(who)
    fl.use(B)
    RING_Z = B.neck_z + 0.5  # the middle of the neck ring
    RING_Y = B.head_y + 0.4  # the helmet's own axis, a little behind the middle of the face
    H0 = B.head.z - RING_Z  # the shell is widest level with the middle of the head
    _seated_points.pop(who.name, None)


_seated_points: dict[str, dict[float, dict[str, list[Vector]]]] = {}
_cloth = mk.Cloth()
wear(GRISSOM)


def name_tag_image() -> bpy.types.Image:
    """Black cloth with the name embroidered in white. Units are half the tag's length."""
    w, h = NAME_TAG
    name = WEARER.name
    art = mk.Art(f"g3c-name-tag-{name.split()[-1].lower()}", 512, round(512 * h / w), 1.0, (0.012, 0.012, 0.014))
    art.text(name, 1.72, (0.0, 0.0), (0.86, 0.86, 0.84), srlib.load_font())
    return art.image()


def materials() -> dict:
    def m(name: str, *args, image=None, **kw) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        return bpy.data.materials.get(name) or material(name, *args, image=image() if image else None, **kw)

    return {
        # (the viewer gives any material named suit... a weave)
        # white with a satin sheen: S65-23485, S65-23486 and S65-23488 (the suits as kept have yellowed)
        "suit": m("suit-nylon-satin-white", (0.80, 0.80, 0.78), 0.12, 0.42),
        "glove": m("glove-nylon-white", (0.78, 0.78, 0.75), 0.0, 0.6),
        "shell": m("helmet-fibreglass-white", (0.86, 0.86, 0.83), 0.0, 0.28),
        "glass": m("glass-visor", (0.02, 0.03, 0.04), 0.0, 0.04),
        "liner": m("helmet-liner", (0.06, 0.06, 0.06), 0.0, 0.9),
        "seal": m("rubber-grey", (0.42, 0.43, 0.44), 0.0, 0.7),
        "bright": m("aluminium-polished", (0.80, 0.81, 0.82), 1.0, 0.18),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "blue": m("aluminium-anodised-blue", (0.10, 0.22, 0.52), 1.0, 0.38),
        "red": m("aluminium-anodised-red", (0.55, 0.07, 0.05), 1.0, 0.38),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "chrome": m("steel-polished", (0.80, 0.81, 0.82), 1.0, 0.1),
        "tape": m("webbing-blue", BLUE, 0.0, 0.8),
        "teeth": m("zipper-brass", (0.45, 0.34, 0.14), 1.0, 0.45),
        "harness": m("harness-webbing-grey", (0.06, 0.068, 0.085), 0.0, 0.9),
        "roller": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "plug": m("connector-insert-brown", (0.36, 0.14, 0.05), 0.0, 0.6),
        "gauge": m("gauge-face", (0.02, 0.02, 0.02), 0.0, 0.25),
        "skin": m("skin", (0.62, 0.42, 0.33), 0.0, 0.65),
        "eye": m("eye-white", (0.80, 0.79, 0.75), 0.0, 0.35),
        "hair": m("hair-brown", (0.10, 0.07, 0.05), 0.0, 0.8),
        "lip": m("skin-lip", (0.50, 0.29, 0.25), 0.0, 0.55),
        "dark": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "pad": m("earphone-pad-tan", (0.62, 0.52, 0.36), 0.0, 0.85),
        "white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6),
        "boot": m("boot-nylon-white", (0.76, 0.75, 0.71), 0.0, 0.7),
        "sole": m("sole-rubber-tan", (0.42, 0.33, 0.22), 0.0, 0.8),
        "lace": m("lace-cord-white", (0.72, 0.71, 0.66), 0.0, 0.85),
        "strap": m("webbing-red", (0.20, 0.025, 0.03), 0.0, 0.8),
        "insignia": m("patch-nasa-insignia", (1, 1, 1), 0.0, 0.85, image=mk.insignia_image),
        "nametag": m(f"name-tag-{WEARER.name.split()[-1].lower()}", (1, 1, 1), 0.0, 0.85, image=name_tag_image),
    }


# -------------------------------------------------------------------------- helmet


def shell_r(h: float) -> float:
    """The shell's radius across at a height above the ring: it flares from the ring to its widest, then domes."""
    if h <= H0:
        return SHELL_R0 + (SHELL_R - SHELL_R0) * math.sin(math.pi / 2 * max(h, 0.0) / H0)
    return SHELL_R * math.sqrt(max(0.0, 1 - ((h - H0) / (SHELL_TOP - H0)) ** 2))


def height(v: float) -> float:
    """A height above the ring from a distance up the shell's skin (its chart): straight below the widest, an arc over the dome."""
    return v if v <= H0 else H0 + (SHELL_TOP - H0) * math.sin(min(math.pi / 2, (v - H0) / (SHELL_TOP - H0)))


def shell(phi: float, v: float, off: float = 0.0) -> Vector:
    """A point of the helmet's shell: `phi` round from straight ahead toward his left, `v` up its skin from the ring; `off` proud of it."""
    h = height(v)
    r = shell_r(h)
    p = Vector((r * math.sin(phi), RING_Y - r * SHELL_DEEP * math.cos(phi), RING_Z + h))
    if not off:
        return p
    core = Vector((0.0, RING_Y, RING_Z + min(h, H0)))
    return p + (p - core).normalized() * off


def build_helmet(M: dict) -> None:
    g = group("Helmet")
    white, liner, visor, seal, bright, fit, blue, alu, pad, mic = (MeshBuilder() for _ in range(10))
    half, mid, tall = VISOR
    n = sides(72)
    phis = [TAU * i / n for i in range(n)]
    top = H0 + (SHELL_TOP - H0) * math.pi / 2
    vs = [1.2 + (top * 0.985 - 1.2) * j / 34 for j in range(35)]

    def opening(phi: float, v: float) -> float:
        """Under 1 inside the visor's opening, a wide rounded oblong on the shell."""
        u, w = abs(((phi + math.pi) % TAU - math.pi) / half), abs((v - mid) / tall)
        return (u**3.0 + w**3.0) ** (1 / 3.0)

    centre = Vector((0.0, RING_Y, RING_Z + H0))
    rows = [[shell(p, v) for p in phis] for v in vs]
    rows.append([shell(0.0, top)] * n)

    def solid(j: int, i: int) -> bool:
        if j + 2 >= len(rows):
            return True
        return opening(phis[i] + TAU / (2 * n), (vs[j] + vs[j + 1]) / 2) > 1.03

    skin(white, rows, centre, closed=True, keep=solid)
    skin(liner, [[shell(p, v, -1.0) for p in phis] for v in vs] + [[shell(0.0, top, -1.0)] * n], centre, closed=True, inward=True, keep=solid)

    def edge(psi: float, rho: float = 1.0) -> tuple[float, float]:
        f = rho * (1 + squareness(psi, 3.0))
        return half * f * math.cos(psi), mid + tall * f * math.sin(psi)

    psis = [TAU * i / n - TAU / 4 for i in range(n)]
    lip = 0.25 + SHELL_R * (1 - math.cos(math.pi / n))
    # the grey seal the visor closes on, round the opening's edge, and the liner turned in behind it
    skin(
        seal,
        [[shell(*edge(psi, rho), off) for psi in psis] for rho, off in ((0.955, -0.6), (0.97, lip), (1.035, lip), (1.05, -0.12))],
        centre,
        closed=True,
    )
    skin(liner, [[shell(*edge(psi, rho), -1.3) for psi in psis] for rho in (0.955, 1.04, 1.1, 1.15)], centre, closed=True, inward=True)
    # the visor: a clear pane standing off the shell, down, on a pivot at each temple
    out = 1.3
    pane = [[shell(*edge(psi, rho), out if rho < 1.05 else out - 0.12) for psi in psis] for rho in (0.0, 0.25, 0.5, 0.75, 0.95, 1.05, 1.085)]
    skin(visor, pane, centre, closed=True)
    # the bright band along its upper edge, from pivot to pivot over the brow
    arc = [math.radians(8 + 164 * k / 44) for k in range(45)]
    skin(
        bright,
        [
            [shell(*edge(psi, rho), off) for psi in arc]
            for rho, off in ((1.0, out - 0.25), (1.005, out + 0.3), (1.105, out + 0.3), (1.11, out - 0.25))
        ],
        centre,
    )
    for sx in (1, -1):
        phi = sx * (half + math.radians(11))
        at, nm = shell(phi, mid + 1.2), (shell(phi, mid + 1.2, 1.0) - shell(phi, mid + 1.2)).normalized()
        fit.lathe([(2.5, -0.3), (2.5, 0.55), (2.25, 0.8), (1.2, 0.8), (1.2, 1.65), (0.0, 1.65)], 24, matrix=frame(at, nm))
        # the arm from the pivot forward to the band's end
        a, b = shell(phi, mid + 1.2, 0.42), shell(*edge(math.radians(8 if sx > 0 else 172), 1.14), 0.42)
        a = a + (b - a).normalized() * 2.75
        fit.box((0.5, (b - a).length + 1.0, 1.5), mk.axes((a + b) / 2, nm, (b - a).normalized(), nm.cross((b - a).normalized())))
        # an earphone's pad inside the shell at each ear, and a microphone on its boom before the mouth
        ear = Vector((sx * (B.skull[0] + 1.3), B.head.y + 0.5, B.head.z - 0.5))
        pad.lathe([(3.4, -1.2), (3.4, 0.6), (2.6, 1.1), (0.0, 1.1)], 20, matrix=frame(ear, (-sx, 0, 0)))
        tip = fl.head_point(sx * 2.6, -6.2) + Vector((0, -2.3, 0))
        boom = fl.polyline(
            [tuple(ear + Vector((sx * 1.0, -2.5, -4.5))), tuple(ear + Vector((sx * 0.5, -8.0, -6.2))), tuple(tip + Vector((sx * 1.6, 0.4, 0)))], 0.8
        )
        Tube(boom, [(0.22, 0.22)] * len(boom), resample=1).add(mic, 6)
        mic.box((2.2, 1.1, 1.3), Matrix.Translation(tip) @ Matrix.Rotation(sx * math.radians(20), 4, "Z"))
    # the neck ring: blue anodised, the helmet's half over the suit's, a bright line where they meet, the latch in front
    oval = Matrix.Translation((0, RING_Y, RING_Z)) @ Matrix.Diagonal((1.0, SHELL_DEEP, 1.0, 1.0))
    r = SHELL_R0
    blue.lathe([(r - 1.3, -2.6), (r + 0.9, -2.6), (r + 1.2, -2.2), (r + 1.2, -0.5), (r + 0.3, -0.5)], 64, matrix=oval)
    blue.lathe([(r + 0.3, 0.1), (r + 0.95, 0.1), (r + 0.95, 1.5), (r + 0.6, 1.9), (r - 0.4, 1.9)], 64, matrix=oval)
    alu.lathe([(r + 0.2, -0.68), (r + 1.45, -0.68), (r + 1.45, 0.28), (r + 0.2, 0.28)], 64, matrix=oval)
    front = Vector((0.0, RING_Y - (r + 1.5) * SHELL_DEEP, RING_Z))
    blue.box((4.4, 1.5, 2.6), Matrix.Translation(front + Vector((0, 0, -1.2))))
    alu.box((2.4, 0.9, 1.2), Matrix.Translation(front + Vector((0, -0.6, 0.6))))
    # the man inside: the shared head (nobody's likeness), bare, his hair cut short
    head, dark, eyes, hair, lips, crop = (MeshBuilder() for _ in range(6))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    head.tube((0, 1.0, B.neck_z - 7.0), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    bowl = Matrix.Diagonal((B.skull[0] + 0.25, B.skull[1] + 0.3, B.skull[2] + 0.35, 1.0)) @ Matrix.Rotation(math.radians(-58), 4, "X")
    crop.lathe(arc_profile(0, 0, 1.0, 8, 90, 14), 40, matrix=Matrix.Translation(hc) @ bowl)

    emit(white, "Helmet_Shell", M["shell"], g)
    emit(liner, "Helmet_Liner", M["liner"], g)
    emit(seal, "Helmet_VisorSeal", M["seal"], g)
    emit(head, "Helmet_Head", M["skin"], g)
    emit(crop, "Helmet_Hair", M["hair"], g)
    if eyes.verts:
        emit(eyes, "Helmet_Eyes", M["eye"], g)
        emit(dark, "Helmet_Irises", M["dark"], g)
    if hair.verts:
        emit(hair, "Helmet_Brows", M["hair"], g)
        emit(lips, "Helmet_Lips", M["lip"], g)
    emit(pad, "Helmet_Earphones", M["pad"], g)
    emit(mic, "Helmet_Microphones", M["white"], g, sharp_angle=40)
    emit(visor, "Helmet_Visor", M["glass"], g)
    emit(bright, "Helmet_VisorBand", M["bright"], g)
    emit(fit, "Helmet_Pivots", M["aluminium"], g, sharp_angle=30)
    emit(blue, "Helmet_NeckRing", M["blue"], g, sharp_angle=30)
    emit(alu, "Helmet_NeckRingJoint", M["bright"], g, sharp_angle=30)


# --------------------------------------------------------------------------- torso


def az(degrees: float) -> float:
    """An azimuth round the trunk (from straight ahead toward his left, degrees) as Tube.at counts it."""
    return -TAU / 4 + math.radians(degrees)


def torso_tube() -> Tube:
    t = Tube([(0, 0, z) for z, _, _ in B.torso], [(a, b) for _, a, b in B.torso], resample=10)
    top = B.torso[-1][0]

    def fold(d: float, th: float) -> float:
        z = B.torso_z0 + d
        front, back = max(0.0, -math.sin(th)), max(0.0, math.sin(th))
        f = squareness(th, 2.6) * (1 - smooth(z, top - 11.0, top - 3.0))
        f += 0.05 * back * back * gauss(z, B.z_hip - 4.0, 7)  # seat
        f += 0.03 * front * gauss(z, B.z_pit + 3.0, 9)  # chest
        f -= 0.03 * back * gauss(z, B.waist_z + 9.0, 8)  # small of the back
        return f

    def loose(d: float, th: float) -> float:
        """0 where something is sewn on or drawn tight and the cloth lies flat under it; 1 in the open."""
        a = abs(fl.azimuth(th))
        return smooth(a, 60.0, 72.0) * (1 - smooth(a, 118.0, 128.0))

    t.fold = fold
    t.relief = [
        Folds(B.waist_z + 3.0 - B.torso_z0, B.waist_z + 14.0 - B.torso_z0, 6, 0.5, 0.9, spread=3.0, mask=loose),
        Folds(B.z_pit - 9.0 - B.torso_z0, B.z_pit - 2.0 - B.torso_z0, 4, 0.35, 2.7, -TAU / 4, spread=1.6, width=0.7, mask=loose),
    ]
    return t


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.arm], [(a, b) for *_, a, b in B.arm], resample=14)
    d_el = t.key_d(B.elbow_at)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)  # the crook of the elbow faces forward
    t.relief = [
        Folds(d_el - 4.5, d_el + 4.5, 6, 0.6, 0.7 * sx, th_in, spread=1.8),
        Folds(t.length - 5.6, t.length - 3.5, 2, 0.3, 3.3 * sx, spread=3.0),  # gathered into the wrist ring
    ]
    return t


def lay(t: Tube, z: float, azimuth: float):
    """Where a flat thing sewn to the trunk at (height, azimuth) has each of its points: `a` centimetres toward his
    left measured round the cloth, `b` up, `off` proud of it."""
    d0, th0 = z - B.torso_z0, az(azimuth)

    def at(a: float, b: float, off: float) -> Vector:
        d, th = d0 + b, th0
        for _ in range(8):  # round a section that is not a circle, an eighth of the way at a time
            th += a / 8 / ((t._skin(d, th + 0.01, False) - t._skin(d, th - 0.01, False)).length / 0.02)
        return t.at(d, th, off)

    return at


def oval(mb: MeshBuilder, at, a: float, b: float, lift: float, image: float | None = None, tips=()) -> None:
    """A sewn patch on the trunk: an ellipse `a` by `b` (half-axes) lying on the cloth, its edge down through it. With
    `image`, its UVs are a picture that covers that many times `a` either side of the middle."""
    n = sides(40, 16)
    spokes = {TAU * k / n: 1.0 for k in range(n)}
    for degrees, k in tips:
        phi, wide = math.radians(degrees), 0.14
        spokes = {q: v for q, v in spokes.items() if abs((q - phi + math.pi) % TAU - math.pi) > wide * 1.05}
        spokes.update({(phi - wide) % TAU: 1.0, phi % TAU: k, (phi + wide) % TAU: 1.0})
    rings = max(3, round(6 / grain()))
    flat = [[(f * a * k * math.cos(q), f * b * k * math.sin(q)) for q, k in sorted(spokes.items())] for f in (i / rings for i in range(rings + 1))]
    base = len(mb.verts)
    skin(mb, [[at(x, y, lift) for x, y in row] for row in flat] + [[at(x, y, -0.3) for x, y in flat[-1]]], None, closed=True, flip=True)
    if image:
        mb.uvs[base:] = [((x / (image * a) + 1) / 2 / CM, (y / (image * a) + 1) / 2 / CM) for row in [*flat, flat[-1]] for x, y in row]


def shoulders(mb: MeshBuilder, share) -> None:
    """In the seat the upper arms are not where the standing figure's hang. What is one skin with the trunk (the
    shoulders, and what lies on them) follows each arm by its share of it, as it follows the standing figure's joint."""
    rig = fl.rig()
    turns = getattr(rig, "shoulder", None)
    if not rig.posed() or not turns:
        return
    for i, v in enumerate(mb.verts):
        s = share[i] if i < len(share) else 0.0
        if s > 1e-4:
            p = Vector(v)
            mb.verts[i] = tuple(p.lerp(turns[1 if p.x >= 0 else -1](p), s))


def build_torso(M: dict) -> tuple[dict[int, Tube], Tube]:
    global _cloth
    g = group("Torso")
    cloth, tape, teeth, blue, tag, patch, plate, plug, red, alu, cable, chrome, pocket = (MeshBuilder() for _ in range(13))
    t = torso_tube()
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    build_shell(cloth, t, arms)
    _cloth = mk.Cloth()
    _cloth.add(cloth, cloth.share)

    def d(z: float) -> float:
        return z - B.torso_z0

    # the collar the ring is set in: the cloth gathered under it
    collar = Matrix.Translation((0, RING_Y, RING_Z)) @ Matrix.Diagonal((1.0, SHELL_DEEP, 1.0, 1.0))
    r = SHELL_R0
    cloth.lathe([(r - 0.6, -2.3), (r + 0.5, -2.7), (r + 0.9, -3.8), (r + 1.5, -4.9), (r - 1.5, -5.7)], 48, matrix=collar)
    cloth.share += [0.0] * (len(cloth.verts) - len(cloth.share))
    # the NASA insignia on his left chest and the name tag on his right
    oval(patch, lay(t, RING_Z - INSIGNIA_UNDER_RING, INSIGNIA_AZ), mk.INSIGNIA_R, mk.INSIGNIA_R, 0.22, mk.INSIGNIA_ART, mk.INSIGNIA_TIPS)
    at, (w, h) = lay(t, RING_Z - NAME_TAG_UNDER_RING, NAME_TAG_AZ), NAME_TAG
    nx = max(4, round(10 / grain()))
    xs = [-w / 2, *(w * (i / nx - 0.5) for i in range(nx + 1)), w / 2]
    ys = [-h / 2, -h / 2, 0.0, h / 2, h / 2]
    base = len(tag.verts)
    skin(tag, [[at(a, b, 0.22 if 0 < i < len(xs) - 1 and 0 < j < len(ys) - 1 else -0.3) for i, a in enumerate(xs)] for j, b in enumerate(ys)], None)
    tag.uvs[base:] = [((a / w + 0.5) / CM, (b / h + 0.5) / CM) for b in ys for a in xs]
    # the helmet's tie-down: a cable from each side of the ring to a buckle on the chest, and its blue strap down the front
    zb = RING_Z - BUCKLE_UNDER_RING
    pb, nb = t.at(d(zb), az(0)), t.normal(d(zb), az(0))
    m = frame(pb, nb)
    turn = m @ Matrix.Rotation(math.atan2(-(m.inverted().to_3x3() @ Vector((0, 0, 1))).x, (m.inverted().to_3x3() @ Vector((0, 0, 1))).y), 4, "Z")
    chrome.box((3.3, 3.4, 1.5), turn @ Matrix.Translation((0, 0, 0.2)))
    chrome.box((3.9, 0.7, 1.9), turn @ Matrix.Translation((0, -0.9, 0.4)))
    chrome.box((1.5, 1.6, 1.1), turn @ Matrix.Translation((0, 2.3, 0.25)))
    eye = turn @ Vector((0, 2.6, 0.45))
    for sx in (1, -1):
        phi = sx * math.radians(52)
        a = Vector(((SHELL_R0 + 1.2) * math.sin(phi), RING_Y - (SHELL_R0 + 1.2) * SHELL_DEEP * math.cos(phi), RING_Z - 2.5))
        mids = [_cloth.on(a.lerp(eye, f) + Vector((0, -3.0, 0)))[0] + Vector((0, -0.95, 0.1)) for f in (0.3, 0.62)]
        pts = fl.polyline([tuple(a), *(tuple(q) for q in mids), tuple(eye)], 0.8)
        Tube(pts, [(0.11, 0.11)] * len(pts), resample=1).add(cable, 5)
    tie = t.trace(d(zb - 1.2), d(B.waist_z + 12.5), az(0), az(0), 40)
    band(tape, tie, 2.6, 0.32, sink=0.2)
    _cloth.under += [(q, 1.3, 0.32, "tie") for q, _ in tie[::2]]
    # the electrical connector under the insignia: an oval plate on a blue patch, the connector's round insert in it
    ze, ae = up(128.0), 21.0
    oval(blue, lay(t, ze, ae), 4.3, 3.2, 0.24)
    me = frame(t.at(d(ze), az(ae)), t.normal(d(ze), az(ae)))
    me = me @ Matrix.Rotation(math.atan2(-(me.inverted().to_3x3() @ Vector((0, 0, 1))).x, (me.inverted().to_3x3() @ Vector((0, 0, 1))).y), 4, "Z")
    plate.lathe([(2.3, 0.0), (2.3, 0.75), (2.0, 0.95), (0.0, 0.95)], 28, matrix=me @ Matrix.Diagonal((1.5, 1.0, 1.0, 1.0)))
    plate.lathe([(1.75, 0.6), (1.75, 1.5), (1.45, 1.7), (1.25, 1.7), (1.25, 1.2)], 24, matrix=me @ Matrix.Translation((-0.9, 0, 0)))
    plug.lathe([(1.25, 1.35), (0.0, 1.35)], 24, matrix=me @ Matrix.Translation((-0.9, 0, 0)))
    plate.lathe([(0.6, 0.6), (0.6, 1.3), (0.0, 1.3)], 12, matrix=me @ Matrix.Translation((2.2, 0, 0)))
    # the two gas connectors at the waist, each on a blue patch: anodised red at his right, bare at his left
    zg = B.waist_z + 7.0
    for sx, mb in ((-1, red), (1, alu)):
        ag = sx * 25.0
        oval(blue, lay(t, zg, ag), 4.5, 4.5, 0.24)
        p, nm = t.at(d(zg), az(ag)), t.normal(d(zg), az(ag))
        mb.lathe([(3.2, 0.0), (3.2, 0.7), (2.6, 0.9), (2.6, 2.0), (2.2, 2.3), (1.7, 2.3), (1.7, 1.6)], 28, matrix=frame(p, nm))
        chrome.lathe([(1.72, 1.9), (0.0, 1.9)], 20, matrix=frame(p, nm))
    # the pressure zip from the crotch up the back to the neck, and a blue strap either side of it
    zip_line = t.trace(d(B.waist_z + 4.0), d(B.neck_z - 6.5), az(180), az(180), 60)
    band(tape, zip_line, 3.4, 0.3, sink=0.2)
    band(teeth, zip_line, 0.6, 0.2, lift=0.3, sink=0.1, bevel=0.1)
    _cloth.under += [(q, 1.7, 0.5, "zip") for q, _ in zip_line[::2]]
    for sx in (1, -1):
        line = t.trace(d(B.waist_z + 5.0), d(B.z_yoke - 6.0), az(sx * 146), az(sx * 149), 50)
        band(tape, line, 2.4, 0.3, sink=0.2)
        _cloth.under += [(q, 1.2, 0.3, "back") for q, _ in line[::2]]
    # a pocket on each upper arm
    for sx in (1, -1):
        a = arms[sx]
        keys = [a.at(dd, a.toward((sx, -0.25, 0), dd), 0.8) for dd in (15.0, 18.0, 21.0, 24.0, 26.5)]
        mk._cloth = _cloth
        mk.strap(pocket, keys, 7.2, 0.3, dive=(0.0, 0.0), sink=0.3)
    pocket.share = [_cloth.share_at(v) for v in pocket.verts]
    for mb in (cloth, pocket):
        shoulders(mb, mb.share)
    emit(cloth, "Torso_Shell", M["suit"], g, sharp_angle=None)
    emit(pocket, "Torso_ArmPockets", M["suit"], g)
    emit(patch, "Torso_Insignia", M["insignia"], g, sharp_angle=None)
    emit(tag, "Torso_NameTag", M["nametag"], g, sharp_angle=None)
    emit(tape, "Torso_Straps", M["tape"], g, smooth=False)
    emit(teeth, "Torso_ZipTeeth", M["teeth"], g, smooth=False)
    emit(blue, "Torso_ConnectorPatches", M["tape"], g, sharp_angle=None)
    emit(plate, "Torso_ElectricalConnector", M["aluminium"], g, sharp_angle=30)
    emit(plug, "Torso_ElectricalInsert", M["plug"], g)
    emit(red, "Torso_GasInlet", M["red"], g, sharp_angle=30)
    emit(alu, "Torso_GasOutlet", M["aluminium"], g, sharp_angle=30)
    emit(chrome, "Torso_TieDownBuckle", M["chrome"], g, sharp_angle=30)
    emit(cable, "Torso_TieDownCable", M["steel"], g)
    return arms, t


def build_harness(M: dict, t: Tube) -> None:
    """The personal parachute harness, worn over the suit: "nylon webbing formed into a double figure 8", the two
    joined by a waist strap and a chest strap, with a quick disconnect "forward and below each shoulder" for the
    parachute's risers and the reel's straps (SEDR 300, p. 3-16). Its run is read off S65-23486 and S65-23488. The
    loops round the thighs are left off: he is sitting on them."""
    g = group("Torso")
    web, chrome, roller = (MeshBuilder() for _ in range(3))
    mk._cloth = _cloth
    on_trunk = lambda z, a: t.at(z - B.torso_z0, az(a), 1.2)  # noqa: E731
    chest, waist = RING_Z - QD_UNDER_RING, B.waist_z + 1.8
    # (the waist strap: across the front over the tie-down's strap, as in S65-23486, and across the small of the back)
    mk.strap(web, [on_trunk(B.waist_z + 13.6, float(a)) for a in range(-54, 55, 9)], 3.8, 0.26, what="waist", dive=(1.0, 1.0))
    mk.strap(web, [on_trunk(waist, float(a)) for a in range(158, 203, 6)], 3.0, 0.26, what="waist", dive=(1.0, 1.0))
    mk.strap(
        web, [on_trunk(chest + 5.2, float(a)) for a in (-40, -27, -13, 0, 13, 27, 40)], 2.5, 0.24, what="chest", dive=(1.0, 1.0), ignore=("tie",)
    )
    rails = {}
    for side, sx in (("L", 1), ("R", -1)):
        keys = [
            on_trunk(z, a * sx)
            for z, a in (
                (B.waist_z + 1.0, 52.0),
                (B.waist_z + 7.5, 53.0),
                (chest - 9.5, 50.5),
                (chest, 47.0),
                (max(chest + 2.2, B.z_yoke - 4.0), 46.0),
            )
        ]
        keys += [_cloth.hit((sx * x, y, 200.0), (0, 0, -1)) for x, y in ((14.0, -6.0), (13.9, -3.0), (13.6, 0.0), (12.9, 3.0), (11.9, 6.0))]
        keys += [on_trunk(z, a * sx) for z, a in ((B.z_yoke - 1.0, 151.0), (chest - 3.0, 159.0), (waist + 9.0, 163.0), (waist, 164.0))]
        rails[sx] = mk.strap(web, fl.polyline(keys, 0.6), HARNESS_WEB, 0.3, what=f"main{side}", dive=(0.0, 0.0))
    # (under the arm the webbing lies on the trunk and stays there)
    web.share = [_cloth.share_at(v) * smooth(v[2], B.z_pit - 2.0, B.z_pit + 5.0) for v in web.verts]
    for sx in (1, -1):  # the quick disconnects: a bright body across the strap, a dark roller above and below its bar
        c, nm, ac = min((r for r in rails[sx] if r[0].y < 0), key=lambda r: abs(r[0].z - chest))
        along = ac.cross(nm) * (1 if ac.cross(nm).z > 0 else -1)  # up the strap
        m = mk.axes(c + nm * 0.62, along.cross(nm), along, nm)
        chrome.box((5.8, 6.2, 1.7), m @ Matrix.Translation((0, 0, 0.1)))
        chrome.box((6.6, 1.3, 2.3), m @ Matrix.Translation((0, -1.4, 0.4)))
        for y in (0.6, -3.0):
            roller.tube(m @ Vector((-2.2, y, 1.25)), m @ Vector((2.2, y, 1.25)), 0.62, 12)
        for x in (-1, 1):
            chrome.box((0.8, 2.6, 1.9), m @ Matrix.Translation((x * 2.1, 4.0, 0.3)))
    shoulders(web, web.share)
    emit(web, "Torso_HarnessWebbing", M["harness"], g)
    emit(chrome, "Torso_HarnessDisconnects", M["chrome"], g, sharp_angle=30)
    emit(roller, "Torso_HarnessRollers", M["roller"], g)


def build_arms(M: dict, tubes: dict[int, Tube]) -> None:
    g = group("Arms")
    sleeves, blue, steel, face = (MeshBuilder() for _ in range(4))
    hem = B.sleeve_hem
    for sx in (1, -1):
        t = tubes[sx]
        t.mesh(sleeves, 32, t.rows(hem), caps=(False, True))
        t.mesh(sleeves, 32, [hem - 1.2, hem + 0.6], caps=(False, False), sunk=lambda _d: 0.25)
        if sx > 0:  # the pressure gauge on the left forearm, on its blue patch
            dm = t.length - 9.5
            tb = t.toward((sx * 0.5, -0.8, 0.2), dm)
            m = frame(t.at(dm, tb), t.normal(dm, tb))
            t.patch(blue, dm - 3.1, dm + 3.1, tb - 0.62, tb + 0.62, 0.16, nd=6, nt=8)
            steel.lathe([(2.2, 0.0), (2.2, 1.5), (1.9, 1.8), (1.7, 1.8), (1.7, 1.3)], 28, matrix=m)
            face.lathe([(1.7, 1.45), (0.0, 1.45)], 28, matrix=m)
    emit(sleeves, "Arms_Sleeves", M["suit"], g)
    emit(blue, "Arms_GaugePatch", M["tape"], g)
    emit(steel, "Arms_Gauge", M["aluminium"], g, sharp_angle=30)
    emit(face, "Arms_GaugeFace", M["gauge"], g)


# the wrist ring's section as (radius, distance toward the hand): a locking collar either side of a raised band
WRIST_RING = [(4.7, -1.6), (5.45, -1.6), (5.45, -0.5), (5.75, -0.4), (5.75, 0.4), (5.45, 0.5), (5.45, 1.5), (4.2, 1.5)]


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell_, rings = MeshBuilder(), {1: MeshBuilder(), -1: MeshBuilder()}
    second = MeshBuilder()
    fingers: list[float] = []
    rig = fl.rig()
    keep = rig.grip
    for sx in (1, -1):
        if rig.posed():
            rig.grip = (WEARER.left if sx > 0 else WEARER.right)[5]
        hand, palm = fl.gloved_hand(shell_, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
        first, first2 = len(rings[sx].verts), len(second.verts)
        c, along = palm.centre(2.2), (palm.centre(3.2) - palm.centre(1.2)).normalized()
        rings[sx].lathe(WRIST_RING, 40 if srlib.DETAIL >= 1 else round(24 / srlib.DETAIL), matrix=frame(c, along))
        second.lathe(
            [(5.0, -2.5), (5.6, -2.5), (5.6, -1.7), (5.0, -1.7)], 40 if srlib.DETAIL >= 1 else round(24 / srlib.DETAIL), matrix=frame(c, along)
        )
        fl.fitted(rings[sx], first, hand)
        fl.fitted(second, first2, hand)
    rig.grip = keep
    shell_.share = fingers
    emit(shell_, "Gloves_Shell", M["glove"], g)
    # his right wrist's ring is anodised red, his left bare: both flown suits as kept, and S65-23488
    emit(rings[-1], "Gloves_WristRingRight", M["red"], g, sharp_angle=30)
    emit(rings[1], "Gloves_WristRingLeft", M["aluminium"], g, sharp_angle=30)
    emit(second, "Gloves_WristRingBands", M["blue"], g, sharp_angle=30)


def leg_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.leg], [(a, b) for *_, a, b in B.leg], resample=18)
    d_knee, d_calf = t.key_d(B.knee_at), t.key_d(B.knee_at + 1)
    th_front = t.toward(fl.FRONT, d_knee)

    def fold(d: float, th: float) -> float:
        c = math.cos(th - th_front)
        return 0.05 * max(0.0, -c) * gauss(d, d_calf, 8) + 0.035 * max(0.0, c) * gauss(d, d_knee, 4)  # calf, kneecap

    t.fold = fold
    t.relief = [
        Folds(
            d_knee - 6.5,
            d_knee + 6.5,
            7,
            0.6 * (1 - 0.75 * smooth(fl.rig().angles.get("knee", 0.0), 30, 90)),
            1.0 * sx,
            th_front + math.pi,
            spread=1.7,
        ),
        Folds(t.key_d(2) - 2.0, t.key_d(2) + 3.5, 4, 0.3, 2.6 * sx, t.toward((-sx, -0.6, 0), t.key_d(2)), spread=1.0),  # the groin
    ]
    return t


def build_legs(M: dict, torso: Tube) -> None:
    g = group("Legs")
    legs, pockets, flaps, zips = (MeshBuilder() for _ in range(4))
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    _cloth.add(legs)
    for sx in (1, -1):  # a zipped pocket on each shin, a flap over its top
        t = tubes[sx]
        d0 = t.key_d(B.knee_at) + 7.0
        th = t.toward((sx * 0.45, -1, 0), d0 + 8.0)
        t.patch(pockets, d0, d0 + 17.0, th - 0.78, th + 0.78, 0.45, nd=14, nt=10)
        t.patch(flaps, d0 - 0.8, d0 + 4.2, th - 0.84, th + 0.84, 0.8, nd=5, nt=10)
        zip_ = t.trace(d0 + 5.0, d0 + 16.0, th - sx * 0.55, th - sx * 0.55, 16)
        band(zips, [(p + nm * 0.45, nm) for p, nm in zip_], 0.7, 0.16, sink=0.1, bevel=0.1)
    emit(legs, "Legs_Trousers", M["suit"], g, sharp_angle=None)
    emit(pockets, "Legs_ShinPockets", M["suit"], g)
    emit(flaps, "Legs_ShinPocketFlaps", M["suit"], g)
    emit(zips, "Legs_ShinPocketZips", M["teeth"], g, smooth=False)


def build_boots(M: dict) -> None:
    g = group("Boots")
    uppers, soles, laces, eyelets, tongue, straps, buckles = (MeshBuilder() for _ in range(7))
    fl.laced_boots(uppers, soles, laces, eyelets, tongue, BOOT_TOP, BOOT_LENGTH, SIZE, lace_lift=0.05)
    for sx in (1, -1):  # two red straps over the laces: one round the ankle, one round the instep, a buckle on the outside of each
        x0, y0 = sx * B.stance, B.ankle_y
        first = [len(straps.verts), len(buckles.verts)]
        # (figurelib.laced_boots's shaft and foot, where the leather is: keep in step with it)
        shaft = Tube(
            [(x0, y0, z) for z in (BOOT_TOP, BOOT_TOP - 1.5, 21.0, 15.0, 10.0, 5.0)],
            [(6.2, 6.5), (6.15, 6.45), (5.6, 5.9), (4.9, 5.3), (4.5, 5.1), (4.2, 4.8)],
            resample=5,
        )
        keys = [
            (7.4, 4.9, 2.0, 2.6),
            (6.8, 5.0, 3.4, 3.6),
            (3.5, 5.5, 4.3, 4.6),
            (-2.5, 6.4, 4.9, 5.3),
            (-9.5, 5.4, 5.3, 4.2),
            (-15.5, 4.4, 5.3, 3.2),
            (-20.0, 3.9, 4.6, 2.6),
            (-22.6, 3.5, 2.8, 2.0),
        ]
        foot = Tube(
            [(x0, y0 + y, z - 0.3) for y, z, _, _ in keys],
            [(a, b - 0.15) for *_, a, b in keys],
            ref=(0, 0, 1),
            resample=5,
            fold=lambda _d, th: squareness(th, 4.0) * smooth(-math.sin(th), 0.0, 0.6),
        )
        for tube, dd, way in ((shaft, BOOT_TOP - 13.0, fl.FRONT), (foot, foot.key_d(3) + 3.6, fl.UP)):
            # (it lies on the leather, and rides over the lacing and its hooks down the front)
            th0 = tube.toward(way, dd)
            trace = [(p + nm * (0.12 + 0.72 * max(0.0, math.cos(TAU * i / 36 - th0)) ** 2), nm) for i, (p, nm) in enumerate(ring(tube, dd, 36))]
            if tube is foot:  # (from the sole's edge over the instep to the sole's edge: under the foot there is the sole)
                k = max(range(36), key=lambda i: trace[i][0].z)
                trace = [trace[(k + i) % 36] for i in range(-36, 37) if trace[(k + i) % 36][0].z > 2.2 and abs(i) < 14]
                band(straps, trace, 1.7, 0.22, sink=0.15)
            else:
                band(straps, trace, 1.7, 0.22, sink=0.15, closed=True)
            th = tube.toward((sx, 0, 0.2), dd)
            buckles.box((1.5, 2.3, 0.9), frame(tube.at(dd, th, 0.4), tube.normal(dd, th)))
        if SIZE != 1.0:
            foot_at = Vector((x0, y0, 0.0))
            for mb, i0 in zip((straps, buckles), first):
                for i in range(i0, len(mb.verts)):
                    mb.verts[i] = tuple(foot_at + (Vector(mb.verts[i]) - foot_at) * SIZE)
    emit(uppers, "Boots_Uppers", M["boot"], g)
    emit(tongue, "Boots_Tongues", M["boot"], g)
    emit(soles, "Boots_Soles", M["sole"], g, sharp_angle=30)
    emit(laces, "Boots_Laces", M["lace"], g)
    emit(eyelets, "Boots_Eyelets", M["steel"], g)
    emit(straps, "Boots_Straps", M["strap"], g, smooth=False)
    emit(buckles, "Boots_StrapBuckles", M["steel"], g, sharp_angle=30)


# --------------------------------------------------------------------------- build


def build_figure() -> None:
    M = materials()
    build_helmet(M)
    arms, torso = build_torso(M)
    build_arms(M, arms)
    build_gloves(M, arms)
    build_legs(M, torso)
    build_boots(M)
    build_harness(M, torso)


class Turn:
    """An arm turned whole about its shoulder (what the standing figure's upper-arm joint does)."""

    def __init__(self, joint: Vector, m: Matrix) -> None:
        self.j, self.m = Vector(joint), m

    def __call__(self, p: Vector) -> Vector:
        return self.j + self.m @ (Vector(p) - self.j)


def seated_rig() -> Rig:
    """figurelib's seated pose, with each arm given its own: turned at the shoulder as well as the elbow."""
    fl.use(B)
    q = {**SEATED, **WEARER.seated}
    rig = fl.seated_rig(q, LAP)
    rig.shoulder = {}
    for sx, (flex, draw, elbow_, toe, pronate, _grip) in ((1, WEARER.left), (-1, WEARER.right)):
        elbow = B.elbow_point(sx)
        toe_in = math.radians(toe)
        hinge = (-math.cos(toe_in), sx * math.sin(toe_in), 0)
        fore = fl.wrist_point(sx) - elbow
        turn = Turn(B.shoulder_point(sx), Matrix.Rotation(math.radians(flex), 3, (-1, 0, 0)) @ Matrix.Rotation(sx * math.radians(draw), 3, (0, 1, 0)))
        rig.shoulder[sx] = turn
        rig.bends[("arm", sx)] = [
            fl.Twist(elbow, fore, -1.5, 5.5, sx * math.radians(pronate)),
            fl.Bend(elbow, hinge, (sx * 0.19, -0.07, -1), 6.0, math.radians(elbow_)),
            turn,
        ]
    return rig


def seated_points() -> dict[str, list[Vector]]:
    """Every vertex of the seated figure by mesh, in figurelib's seat frame (centimetres), without building anything."""
    return fl.posed_points(_seated_points.setdefault(WEARER.name, {}), seated_rig, build_figure)


def draped(pts: list[Vector], x: float, half: float, pivot: tuple[float, float], a0: float, a1: float, n: int, off: float) -> list[Vector]:
    """A line laid over the figure in the plane `x` across him: round `pivot` (toward his head is -y, his chest +z)
    from the angle a0 to a1 (degrees from his chest's way, toward his head), at each angle `off` outside the
    outermost of the figure's points within `half` either side of the plane."""
    near = [p for p in pts if abs(p.x - x) < half]
    out = []
    for k in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * k / n)
        way = Vector((0.0, -math.sin(a), math.cos(a)))
        side = Vector((0.0, -math.cos(a), -math.sin(a)))
        reach = max(
            ((p.y - pivot[0]) * way.y + (p.z - pivot[1]) * way.z for p in near if abs((p.y - pivot[0]) * side.y + (p.z - pivot[1]) * side.z) < 2.0),
            default=0.0,
        )
        out.append(Vector((x, pivot[0], pivot[1])) + way * (reach + off))
    return out


def seated_key_points() -> dict:
    """Where the seat has to be, and where its restraint runs: key points of the seated figure in figurelib's seat
    frame, centimetres."""
    rig, pts = seated_rig(), seated_points()
    cloth = [p for name, ps in pts.items() if name in ("Torso_Shell", "Legs_Trousers", "Torso_HarnessWebbing") for p in ps]
    helmet = [p for name, ps in pts.items() if name.startswith("Helmet_") for p in ps]
    eyes = (fl.head_point(3.15, 0.5) + fl.head_point(-3.15, 0.5)) / 2 + Vector((0, -0.2, 0.02))
    disconnects = pts["Torso_HarnessDisconnects"]
    worn = {"lap": [], "reel": {}}
    # the lap belt: over the top of each thigh at the fold of the hip, across the lap
    for k in range(-12, 13):
        x = k * 0.158 * B.hip_x
        near = [p for p in cloth if abs(p.x - x) < 1.6 and abs(p.y + LAP_BELT) < 2.2]
        if near:
            worn["lap"].append((x, -LAP_BELT, max(p.z for p in near) + 0.45))
    # the reel's two straps: from behind each shoulder over it and down to the harness's quick disconnect
    # (in the seat's frame his left is toward -X)
    for side, sx in (("left", 1), ("right", -1)):
        qd = [p for p in disconnects if p.x * sx < 0]
        x = sum(p.x for p in qd) / len(qd)
        top = rig.carry(B.shoulder_point(sx))
        line = draped(cloth, x, 2.4, (top.y, top.z - 2.0), 165.0, 0.0, 22, 0.5)
        end = Vector((x, min(p.y for p in qd) + 0.6, max(p.z for p in qd) - 0.2))
        worn["reel"][side] = [tuple(p) for p in line if p.z < end.z - 0.3 or p.y < end.y - 1.0] + [tuple(end)]
    return {
        **fl.body_key_points(rig, pts),
        "eyes": tuple(rig.carry(eyes)),
        "head_top": tuple(rig.carry((0, RING_Y, RING_Z + SHELL_TOP))),
        "helmet_back_z": min(p.z for p in helmet),
        "helmet": [tuple(p) for p in helmet[:: max(1, len(helmet) // 4000)]],
        "skin": [tuple(p) for ps in pts.values() for p in ps[:: max(1, len(ps) // 1500)]],  # a sample of all of him, for a cabin to check its room by
        "sole_z": min(p.z for p in pts["Boots_Soles"]),
        "worn": worn,
    }


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str, who: Wearer) -> dict:
    """`who` in a Gemini ejection seat, visor down: every mesh a child of `parent`, named `<prefix>_<Node>_<Mesh>`,
    with no skeleton. `place` maps figurelib's seat frame (origin midway between the hip joints, head toward -Y, chest
    toward +Z, his right toward +X), once in metres, into the caller's space. Nothing is built below the detail at
    which interiors are shown. Returns seated_key_points()."""
    wear(who)
    keys = seated_key_points()
    if srlib.interior():
        fl.build_posed(parent, place, prefix, seated_rig, build_figure)
    return keys
