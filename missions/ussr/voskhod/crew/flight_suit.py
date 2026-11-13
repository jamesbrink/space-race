"""What the crew of Voskhod 1 flew in: no pressure suit, but a light wool suit and a white headset cap.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure faces -Y,
so his left is +X. See ./flight-suit.md. The body is figurelib's man, carried to each man's stature; the
garment is what the record and the suit kept at Kaluga show: a grey wool pullover with a turned-down
collar open in a V, grey wool trousers, soft shoes (they left their boots at the hatch), and on the head
the white cloth cap of the headset, with its earphones, chin strap and two microphones on short booms.
Nobody's likeness: the head is the shared one.

It is built only seated, for a cabin (`build_seated`): every mesh a child of the caller's node, carried to
the pose of a Voskhod couch. Mesh names begin Helmet_ (the head and its cap), Torso_, Arms_, Gloves_ (the
bare hands), Legs_ and Boots_ (the shoes), which is how figurelib knows which joints carry each.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import bpy
from mathutils import Matrix, Vector

import figurelib as fl
import srlib
from figurelib import Folds, Rig, Trousers, Tube, azimuth, band, build_head, build_shell, emit, gauss, group, ring, skin, smooth, squareness
from srlib import TAU, MeshBuilder, material


@dataclass(frozen=True)
class Wearer:
    """Who is in the suit: his own measures. None of the three men's heights was found in a document read
    (flight-suit.md), so each is an estimate and says where it is from."""

    name: str
    stature: float = 170.0
    breadth: float = 1.0  # distances from the midline, beside figurelib's man of 1.80 m carried to this stature
    girth: float = 0.97  # every section's radii, beside the same man


KOMAROV = Wearer("Komarov")
FEOKTISTOV = Wearer("Feoktistov")
YEGOROV = Wearer("Yegorov")

SHOE_TOP = 27.0  # the shoe's shaft, as on a man of 1.80 m: under the trouser leg, which hangs to the ankle
SHOE_LENGTH = 29.5
CAP = (8.5, 10.4, 11.7)  # the cap over the skull: half its width, depth and height
FACE = (math.radians(58), -2.6, 8.6)  # the cap's opening round the face: half its width round the head, its middle below the head's, half its height
# The pose a Voskhod couch holds a man in, as joint angles in degrees (vehicles/voskhod.py: POSE has the first two).
SEATED = {"hip": 68.0, "knee": 88.0, "ankle": 8.0, "knees_in": 0.0, "pelvis": 22.0, "elbow": 66.0, "elbow_toe_in": 40.0, "pronate": 36.0, "grip": 0.0}
LAP = (-3.0, 12.0, 1.2)  # where a thigh pressed against the belly stops: figurelib.seated_rig


def body(who: Wearer) -> fl.Body:
    """The man in a light suit: figurelib's man carried to his stature, the cloth a little off him."""
    size = who.stature / 180.3
    b = fl.man().scaled(stature=who.stature, heel=1.2 * size, breadth=who.breadth, girth=who.girth, bulk=(0.5, 0.5, 0.4), crotch_drop=3.0)
    # the sleeves end loose over the wrists, and the trouser legs over the shoes' tops
    b.arm[-2:] = [(x, y, z, 5.4, 5.5) for x, y, z, _, _ in b.arm[-2:]]
    x, y, _, _, _ = b.leg[-1]
    b.leg[-2:] = [(x, y, 31.0 * size, 6.6, 6.9), (x, y, 17.5 * size, 6.7, 7.0), (x, y, 13.5 * size, 6.5, 6.8)]
    return b


def wear(who: Wearer) -> None:
    """Whose suit is built from here on."""
    global WEARER, SIZE, B
    WEARER = who
    SIZE = who.stature / 180.3
    B = body(who)
    fl.use(B)
    _seated_points.clear()


_seated_points: dict[float, dict[str, list[Vector]]] = {}
wear(KOMAROV)


def materials() -> dict:
    def m(name: str, *args) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        return bpy.data.materials.get(name) or material(name, *args)

    return {
        # (the viewer gives any material named suit... a weave). A dark grey with a little blue in it, by eye from the
        # suit kept at Kaluga and the colour frames from the cabin: estimated
        "wool": m("suit-wool-grey", (0.14, 0.15, 0.17), 0.0, 0.92),
        "cap": m("cap-cloth-white", (0.84, 0.83, 0.79), 0.0, 0.8),
        "skin": m("skin", (0.62, 0.42, 0.33), 0.0, 0.65),
        "eye": m("eye-white", (0.80, 0.79, 0.75), 0.0, 0.35),
        "hair": m("hair-brown", (0.10, 0.07, 0.05), 0.0, 0.8),
        "lip": m("skin-lip", (0.50, 0.29, 0.25), 0.0, 0.55),
        "dark": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "strap": m("strap-white", (0.80, 0.79, 0.74), 0.0, 0.7),
        "microphone": m("microphone-red-brown", (0.45, 0.12, 0.05), 0.0, 0.6),
        "shoe": m("shoe-leather-dark", (0.05, 0.045, 0.04), 0.0, 0.7),
        "sole": m("sole-leather-tan", (0.42, 0.30, 0.18), 0.0, 0.7),
        "button": m("button-dark", (0.05, 0.05, 0.06), 0.0, 0.5),
    }


# ---------------------------------------------------------------------------- head


def cap_point(phi: float, lift: float, off: float = 0.0) -> Vector:
    """A point of the cap: `phi` round from straight ahead toward his left, `lift` up from the head's middle, radians."""
    a, b, c = (v + off for v in CAP)
    return B.head + Vector((a * math.cos(lift) * math.sin(phi), -b * math.cos(lift) * math.cos(phi) - 0.2, c * math.sin(lift)))


def build_headset(M: dict) -> None:
    g = group("Helmet")
    head, cap, dark, eyes, hair, lips, mics, strap, phones = (MeshBuilder() for _ in range(9))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    head.tube((0, 1.0, B.neck_z - 7.0), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    half, mid, tall = FACE
    n = fl.sides(48)
    phis = [TAU * i / n for i in range(n)]
    low = math.radians(-58)
    lifts = [low + (math.pi / 2 - 0.02 - low) * j / 22 for j in range(23)]

    def opening(phi: float, lift: float) -> float:
        """Under 1 inside the opening round the face, a rounded oblong on the cap."""
        u, v = abs(((phi + math.pi) % TAU - math.pi) / half), abs((CAP[2] * math.sin(lift) - mid) / tall)
        return (u**3.0 + v**3.0) ** (1 / 3.0)

    rows = [[cap_point(p, lift) for p in phis] for lift in lifts]
    rows.append([hc + Vector((0, -0.2, CAP[2]))] * n)

    def solid(j: int, i: int) -> bool:
        if j + 1 >= len(lifts):
            return True
        return opening(phis[i] + TAU / (2 * n), (lifts[j] + lifts[j + 1]) / 2) > 1.04

    skin(cap, rows, hc, closed=True, keep=solid)

    def edge(psi: float, rho: float = 1.0) -> tuple[float, float]:
        f = rho * (1 + squareness(psi, 3.0))
        return half * f * math.cos(psi), math.asin(max(-0.98, min(0.98, (mid + tall * f * math.sin(psi)) / CAP[2])))

    psis = [TAU * i / n - TAU / 4 for i in range(n)]
    # the opening's bound edge, true to the line where the grid of the cap is cut in steps, and turned in to the face
    skin(
        cap,
        [
            [cap_point(*edge(psi, rho), off) for psi in psis]
            for rho, off in ((0.93, -0.9), (0.97, 0.12), (1.0, 0.3), (1.1, 0.3), (1.17, 0.05), (1.2, -0.3))
        ],
        hc,
        closed=True,
    )
    # under the cap's lower edge, a band that closes it against the neck
    skin(cap, [[cap_point(p, low, off) for p in phis] for off in (0.0, -1.6)], hc, closed=True, flip=True)
    for sx in (1, -1):  # an earphone in a round cup over each ear, and the chin strap between them
        at = cap_point(sx * math.radians(96), math.radians(-12), 0.1)
        out = (at - hc).normalized()
        out = Vector((out.x, out.y * 0.3, 0.0)).normalized()
        phones.lathe([(3.6, -0.6), (3.6, 1.0), (3.0, 1.6), (0.0, 1.7)], 28, matrix=srlib.frame(at, out))
        # a microphone at each corner of the mouth, on a short boom from the earphone
        dark.tube(tuple(at + out * 0.9 + Vector((0, -2.0, -2.6))), (sx * 3.6, hc.y - 9.9, hc.z - 6.2), 0.28, 8)
        mics.disc((sx * 3.3, hc.y - 9.8, hc.z - 6.2), (sx * 0.35, -1, 0), 0.95, 0.9, 14)
    keys = [cap_point(math.radians(a), math.radians(lift), 0.25) for a, lift in ((104, -34), (62, -50), (34, -56))]
    chin = Vector((0, hc.y - 7.6, hc.z - 10.9))
    path = [*keys, chin + Vector((3.6, 0, 0.5)), chin, chin + Vector((-3.6, 0, 0.5)), *[Vector((-p.x, p.y, p.z)) for p in keys[::-1]]]
    pts = fl.polyline([tuple(p) for p in path], 0.7)
    Tube(pts, [(0.95, 0.16)] * len(pts), ref=(0, 1, 0), resample=1).add(strap, 8)

    emit(head, "Helmet_Head", M["skin"], g)
    emit(cap, "Helmet_Cap", M["cap"], g)
    emit(phones, "Helmet_Earphones", M["cap"], g, sharp_angle=30)
    emit(strap, "Helmet_ChinStrap", M["strap"], g)
    emit(dark, "Helmet_MicrophoneBooms", M["dark"], g, sharp_angle=30)
    emit(mics, "Helmet_Microphones", M["microphone"], g, sharp_angle=30)
    if eyes.verts:
        emit(eyes, "Helmet_Eyes", M["eye"], g)
    if hair.verts:
        emit(hair, "Helmet_Brows", M["hair"], g)
        emit(lips, "Helmet_Lips", M["lip"], g)


# --------------------------------------------------------------------------- torso


def torso_tube() -> Tube:
    t = Tube([(0, 0, z) for z, _, _ in B.torso], [(a, b) for _, a, b in B.torso], resample=10)
    top = B.torso[-1][0]

    def fold(d: float, th: float) -> float:
        z = B.torso_z0 + d
        front, back = max(0.0, -math.sin(th)), max(0.0, math.sin(th))
        f = squareness(th, 2.6) * (1 - smooth(z, top - 11.0, top - 3.0))
        f += 0.04 * back * back * gauss(z, B.z_hip - 4.0, 7)  # seat
        f += 0.03 * front * gauss(z, B.z_pit + 3.0, 9)  # chest
        f -= 0.03 * back * gauss(z, B.waist_z + 9.0, 8)  # small of the back
        return f

    def flat(d: float, th: float) -> float:
        """0 down the front, where the collar's opening lies and the cloth stays smooth under it; 1 in the open."""
        return smooth(abs(azimuth(th)) * 0.3, 2.4, 4.2)

    t.fold = fold
    # a loose pullover: slack over the belt, and under the chest
    t.relief = [
        Folds(B.waist_z + 2.0 - B.torso_z0, B.waist_z + 12.0 - B.torso_z0, 5, 0.5, 0.9, spread=3.0, mask=flat),
        Folds(B.z_pit - 9.0 - B.torso_z0, B.z_pit - 2.0 - B.torso_z0, 4, 0.35, 2.7, -TAU / 4, spread=1.6, width=0.7, mask=flat),
    ]
    return t


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.arm], [(a, b) for *_, a, b in B.arm], resample=14)
    d_el = t.key_d(B.elbow_at)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)  # the crook of the elbow faces forward
    th_pit = t.toward((-sx, 0, 0), t.key_d(3))
    hem = B.sleeve_hem
    t.relief = [
        Folds(d_el - 4.5, d_el + 4.5, 5, 0.6, 0.7 * sx, th_in, spread=1.8),
        Folds(t.key_d(2) + 1.0, t.key_d(3) + 6.0, 4, 0.3, 2.1 * sx, th_pit, spread=1.2, mask=lambda dd, _th: smooth(abs(dd - hem), 1.0, 2.6)),
    ]
    return t


def build_torso(M: dict) -> tuple[dict[int, Tube], Tube]:
    g = group("Torso")
    shell, collar, trim = (MeshBuilder() for _ in range(3))
    t = torso_tube()
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    build_shell(shell, t, arms)

    def az(deg: float) -> float:
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - B.torso_z0

    # The collar: turned down all round the neck, its two points lying on the chest either side of an opening cut in
    # a V, with no buttons (the suit kept at Kaluga). The V is drawn as the opening's two bound edges.
    neck = B.neck_z - 4.6
    band(collar, ring(t, d(neck), 56), 4.4, 0.5, sink=0.4, bevel=0.3, closed=True)
    for sx in (1, -1):
        band(collar, t.trace(d(neck - 1.0), d(neck - 8.5), az(sx * 15), az(sx * 9), 14), 3.4, 0.75, sink=0.4, bevel=0.3)
        band(trim, t.trace(d(neck - 2.0), d(neck - 15.0), az(sx * 5.2), az(sx * 0.9), 20), 0.8, 0.32, sink=0.3)
    # the band the pullover is drawn in by at the waist, over the line where the shell ends and the trousers begin
    band(trim, ring(t, d(B.waist_z), 72), 3.0, 0.35, closed=True)
    emit(shell, "Torso_Shell", M["wool"], g, sharp_angle=None)
    emit(collar, "Torso_Collar", M["wool"], g, smooth=False)
    emit(trim, "Torso_Trim", M["wool"], g, smooth=False)
    return arms, t


def build_arms(M: dict, tubes: dict[int, Tube]) -> None:
    g = group("Arms")
    sleeves = MeshBuilder()
    hem = B.sleeve_hem
    for sx in (1, -1):
        t = tubes[sx]
        # the sleeve starts on the ring of points the shoulder's skin ends on; a band underneath backs the join
        t.mesh(sleeves, 32, t.rows(hem), caps=(False, True))
        t.mesh(sleeves, 32, [hem - 1.2, hem + 0.6], caps=(False, False), sunk=lambda _d: 0.25)
    emit(sleeves, "Arms_Sleeves", M["wool"], g)


def build_hands(M: dict, arms: dict[int, Tube]) -> None:
    """Bare hands: figurelib's hand in skin, its cuff under the sleeve's end."""
    g = group("Gloves")
    shell = MeshBuilder()
    fingers: list[float] = []
    for sx in (1, -1):
        fl.gloved_hand(shell, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
    shell.share = fingers
    emit(shell, "Gloves_Hands", M["skin"], g)


# ---------------------------------------------------------------------------- legs


def leg_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.leg], [(a, b) for *_, a, b in B.leg], resample=18)
    d_knee, d_calf = t.key_d(B.knee_at), t.key_d(B.knee_at + 1)
    th_front = t.toward(fl.FRONT, d_knee)

    def fold(d: float, th: float) -> float:
        c = math.cos(th - th_front)
        return 0.04 * max(0.0, -c) * gauss(d, d_calf, 8) + 0.03 * max(0.0, c) * gauss(d, d_knee, 4)  # calf, kneecap

    t.fold = fold
    t.relief = [
        Folds(
            d_knee - 6.0,
            d_knee + 6.0,
            6,
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
    legs = MeshBuilder()
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    emit(legs, "Legs_Trousers", M["wool"], g, sharp_angle=None)


def build_shoes(M: dict) -> None:
    """Soft shoes: figurelib's boot, low, without its laces. What they were is not recorded beyond "slippers"."""
    g = group("Boots")
    uppers, soles, tongue = (MeshBuilder() for _ in range(3))
    fl.laced_boots(uppers, soles, MeshBuilder(), MeshBuilder(), tongue, SHOE_TOP, SHOE_LENGTH, SIZE)
    emit(uppers, "Boots_Uppers", M["shoe"], g)
    emit(tongue, "Boots_Tongues", M["shoe"], g)
    emit(soles, "Boots_Soles", M["sole"], g, sharp_angle=30)


# --------------------------------------------------------------------------- build


def build_figure() -> None:
    M = materials()
    build_headset(M)
    arms, torso = build_torso(M)
    build_arms(M, arms)
    build_hands(M, arms)
    build_legs(M, torso)
    build_shoes(M)


def seated_rig() -> Rig:
    fl.use(B)
    return fl.seated_rig(SEATED, LAP)


def seated_key_points() -> dict:
    """Where the couch has to be: key points of the seated figure in figurelib's seat frame, centimetres."""
    rig = seated_rig()
    pts = fl.posed_points(_seated_points, seated_rig, build_figure)
    return {**fl.body_key_points(rig, pts), "head_top": tuple(rig.carry(B.head + fl.UP * CAP[2])), "head_back_z": min(p.z for p in pts["Helmet_Cap"])}


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str, who: Wearer) -> dict:
    """`who` in a Voskhod couch: every mesh a child of `parent`, named `<prefix>_<Node>_<Mesh>`, with no skeleton.
    `place` maps figurelib's seat frame (origin midway between the hip joints, head toward -Y, chest toward +Z, his
    right toward +X), once in metres, into the caller's space. Nothing is built below the detail at which interiors
    are shown. Returns seated_key_points()."""
    wear(who)
    keys = seated_key_points()
    if srlib.interior():
        fl.build_posed(parent, place, prefix, seated_rig, build_figure)
    return keys
