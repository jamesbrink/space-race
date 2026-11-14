"""The Berkut pressure suit, as Pavel Belyayev and Aleksey Leonov wore it on 18 March 1965.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure faces -Y,
so his left is +X. See ./berkut.md: the two men's statures and masses are from Kamanin's table; nothing
of the suit's own size was found in print, so its bulk, its helmet and every fitting are read off
photographs of the two men at the pad that morning and of the suits kept since, and are estimates.
The body is figurelib's man, carried to each man's stature; the suit is the garment on it: the white
cover that is what the photographs show (its orange stripe down each limb is not built), the white helmet
with its wide visor and "СССР" on the brow, a metal ring at the neck, gloves and white laced boots.

It is built only seated, for a cabin (`build_seated`): every mesh a child of the caller's node, carried
to the pose of a Voskhod couch, visor down. Mesh names begin Helmet_, Torso_, Arms_, Gloves_, Legs_
and Boots_, which is how figurelib knows which joints carry each. The pack Leonov wore outside was put
on in orbit and is not part of the figure: `build_pack` builds it by itself, as it was stowed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import bpy
from mathutils import Matrix, Vector

import figurelib as fl
import srlib
from figurelib import Folds, Rig, Trousers, Tube, band, build_head, build_shell, emit, gauss, group, ring, skin, smooth, squareness
from srlib import TAU, MeshBuilder, arc_profile, frame, material, text_mesh


@dataclass(frozen=True)
class Wearer:
    """Who is in the suit: his own measures (documented: Kamanin's table of 19 January 1965), and his build beside
    figurelib's man, which is estimated from his mass."""

    name: str
    stature: float
    breadth: float = 0.98
    girth: float = 0.98


BELYAYEV = Wearer("Belyayev", 170.0, 0.97, 0.96)  # 170 cm, 72 kg
LEONOV = Wearer("Leonov", 172.0, 0.99, 1.0)  # 172 cm, 78.2 kg
BOOT_TOP = 30.0  # as on a man of 1.80 m: to mid-calf
BOOT_LENGTH = 31.0
HELMET_R = 15.6  # the shell is a ball from the crown down to the chin
COLLAR_R = 12.2
VISOR = (math.radians(78), 1.4, 8.6)  # the opening: half its width round the shell, its middle above the ball's, half its height
LETTERS = "СССР"
LETTER_HEIGHT = 3.6
PACK = (33.0, 50.0, 14.0)  # the pack: across, tall, deep (estimated off two museum photographs)
SEATED = {
    "hip": 68.0,
    "knee": 88.0,
    "ankle": 10.0,
    "knees_in": 0.0,
    "pelvis": 22.0,
    "elbow": 58.0,
    "elbow_toe_in": 34.0,
    "pronate": 32.0,
    "grip": 0.0,
}
LAP = (-3.0, 12.0, 1.2)  # where a thigh pressed against the belly stops: figurelib.seated_rig


def body(who: Wearer) -> fl.Body:
    """The man in his suit: figurelib's man carried to his stature, let out by the suit's layers and its cover."""
    size = who.stature / 180.3
    b = fl.man().scaled(stature=who.stature, heel=2.8 * size, breadth=who.breadth, girth=who.girth, bulk=(1.6, 1.3, 0.9), crotch_drop=4.0)
    plain = fl.man().scaled(stature=who.stature, heel=2.8 * size, breadth=who.breadth, girth=who.girth)
    # where the cloth goes into something it is not let out: the neck into the helmet's ring, the cuffs into the gloves
    b.torso[-4:] = plain.torso[-4:]
    b.arm[-2:] = plain.arm[-2:]
    x, y, _, _, _ = b.leg[-1]
    top = BOOT_TOP * size
    b.leg[-2:] = [(x, y, top + 5.5, 7.2, 7.5), (x, y, top + 1.6, 7.5, 7.8), (x, y, top - 0.6, 7.2, 7.5)]
    return b


def wear(who: Wearer) -> None:
    """Whose suit is built from here on."""
    global WEARER, SIZE, B, HELMET_AT, HELMET_RIM
    WEARER = who
    SIZE = who.stature / 180.3
    B = body(who)
    fl.use(B)
    HELMET_AT = Vector((0, B.head_y - 1.3, B.head.z - 0.5))
    HELMET_RIM = B.neck_z + 1.4
    _seated_points.clear()


_seated_points: dict[float, dict[str, list[Vector]]] = {}
wear(BELYAYEV)


def materials() -> dict:
    def m(name: str, *args) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        return bpy.data.materials.get(name) or material(name, *args)

    return {
        # (the viewer gives any material named suit... a weave)
        "cover": m("suit-white-cover", (0.80, 0.79, 0.74), 0.0, 0.85),
        "knit": m("suit-knit-cream", (0.70, 0.68, 0.60), 0.0, 0.95),
        "shell": m("helmet-white", (0.86, 0.86, 0.83), 0.0, 0.3),
        "glass": m("glass-visor", (0.02, 0.03, 0.04), 0.0, 0.04),
        "padding": m("helmet-liner", (0.06, 0.06, 0.06), 0.0, 0.9),
        "red": m("paint-red-nitro", (0.62, 0.04, 0.03), 0.0, 0.5),
        "skin": m("skin", (0.62, 0.42, 0.33), 0.0, 0.65),
        "eye": m("eye-white", (0.80, 0.79, 0.75), 0.0, 0.35),
        "hair": m("hair-brown", (0.10, 0.07, 0.05), 0.0, 0.8),
        "lip": m("skin-lip", (0.50, 0.29, 0.25), 0.0, 0.55),
        "cap": m("cap-cloth-white", (0.84, 0.83, 0.79), 0.0, 0.8),
        "dark": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "ring": m("aluminium-anodised-grey", (0.36, 0.37, 0.38), 1.0, 0.4),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "mirror": m("steel-polished", (0.80, 0.81, 0.82), 1.0, 0.06),
        "boot": m("boot-leather-white", (0.78, 0.77, 0.72), 0.0, 0.6),
        "sole": m("sole-leather-tan", (0.42, 0.30, 0.18), 0.0, 0.7),
        "lace": m("lace-cord-white", (0.72, 0.71, 0.66), 0.0, 0.85),
        "palm": m("glove-leather-black", (0.03, 0.03, 0.03), 0.0, 0.5),
        "tape": m("zipper-tape", (0.10, 0.10, 0.11), 0.0, 0.8),
        "hose": m("hose-braid-white", (0.74, 0.73, 0.68), 0.0, 0.8),
        "web": m("webbing-grey", (0.33, 0.35, 0.37), 0.0, 0.85),
    }


# -------------------------------------------------------------------------- helmet


def ball(phi: float, lift: float, off: float = 0.0) -> Vector:
    """A point of the helmet's ball: `phi` round from straight ahead toward his left, `lift` up from its middle, radians."""
    r = HELMET_R + off
    return HELMET_AT + Vector((r * math.cos(lift) * math.sin(phi), -r * math.cos(lift) * math.cos(phi), r * math.sin(lift)))


def build_helmet(M: dict) -> None:
    g = group("Helmet")
    shell, padding, visor, rim, fit, collar, knit, red = (MeshBuilder() for _ in range(8))
    half, mid, tall = VISOR
    low = math.asin((HELMET_RIM + 1.4 - HELMET_AT.z) / HELMET_R)  # where the ball gives way to the ring
    n = fl.sides(64)
    phis = [TAU * i / n for i in range(n)]
    lifts = [low + (math.pi / 2 - 0.02 - low) * j / 28 for j in range(29)]

    def opening(phi: float, lift: float) -> float:
        """Under 1 inside the visor's opening, a wide rounded oblong on the ball."""
        u, v = abs(((phi + math.pi) % TAU - math.pi) / half), abs((HELMET_R * math.sin(lift) - mid) / tall)
        return (u**3.0 + v**3.0) ** (1 / 3.0)

    rows = [[Vector((COLLAR_R * math.sin(p), HELMET_AT.y - COLLAR_R * math.cos(p), HELMET_RIM)) for p in phis]]
    rows += [[ball(p, lift) for p in phis] for lift in lifts]
    rows.append([HELMET_AT + Vector((0, 0, HELMET_R))] * n)

    def solid(j: int, i: int) -> bool:
        if j == 0 or j + 1 >= len(lifts):
            return True
        return opening(phis[i] + TAU / (2 * n), (lifts[j - 1] + lifts[j]) / 2) > 1.03

    skin(shell, rows, HELMET_AT, closed=True, keep=solid)
    skin(padding, [[HELMET_AT + (p - HELMET_AT) * 0.94 for p in row] for row in rows], HELMET_AT, closed=True, inward=True, keep=solid)

    def edge(psi: float, rho: float = 1.0) -> tuple[float, float]:
        f = rho * (1 + squareness(psi, 3.0))
        return half * f * math.cos(psi), math.asin(max(-0.98, min(0.98, (mid + tall * f * math.sin(psi)) / HELMET_R)))

    psis = [TAU * i / n - TAU / 4 for i in range(n)]
    lip = 0.22 + HELMET_R * (1 - math.cos(math.pi / n))
    skin(
        shell,
        [[ball(*edge(psi, rho), off) for psi in psis] for rho, off in ((0.97, 0.05), (1.0, lip), (1.06, lip), (1.11, lip - 0.05), (1.14, -0.1))],
        HELMET_AT,
        closed=True,
    )
    skin(padding, [[ball(*edge(psi, rho), -1.3) for psi in psis] for rho in (0.97, 1.04, 1.1, 1.15)], HELMET_AT, closed=True, inward=True)
    # the visor: a clear pane on the same ball in a pale frame, on pivots at the temples; down, as in the couch
    pane = [[ball(*edge(psi, rho), 1.25 if rho < 1.04 else 1.15) for psi in psis] for rho in (0.0, 0.25, 0.5, 0.75, 0.95, 1.04, 1.07)]
    skin(visor, pane, HELMET_AT, closed=True)
    line = [ball(*edge(psi, 1.07), 1.2) for psi in psis]
    Tube([*line, line[0]], [(0.6, 0.45)] * (n + 1), resample=2).add(rim, 10)
    for sx in (1, -1):  # the pivot's disc at each temple
        fit.lathe([(2.6, 0.0), (2.6, 1.6), (2.1, 2.0), (0.0, 2.0)], 24, matrix=frame(ball(sx * TAU / 4, 0.05, -0.2), (sx, 0, 0)))
    # "СССР" in red on the brow, over the opening
    font = srlib.load_font()
    verts, faces = text_mesh(LETTERS, 1.0, font, cuts=2)
    xs, ys = [v[0] for v in verts], [v[1] for v in verts]
    k = LETTER_HEIGHT / (max(ys) - min(ys))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    brow = math.asin((mid + tall) / HELMET_R) + (2.6 + LETTER_HEIGHT / 2) / HELMET_R
    red.add(
        [tuple(ball((x - cx) * k * 1.3 / (HELMET_R * math.cos(brow)), brow + (y - cy) * k / HELMET_R, 0.16)) for x, y, _ in verts],
        faces,
    )
    # the ring the helmet locks to, dark, with its latch in front; under it a knitted collar
    at = Matrix.Translation((0, HELMET_AT.y, HELMET_RIM))
    collar.lathe(
        [(COLLAR_R - 1.4, -1.9), (COLLAR_R + 0.7, -1.9), (COLLAR_R + 1.0, -1.4), (COLLAR_R + 1.0, 0.9), (COLLAR_R + 0.4, 1.6), (COLLAR_R - 0.6, 1.6)],
        56,
        matrix=at,
    )
    collar.box((3.0, 1.6, 2.6), Matrix.Translation((0, HELMET_AT.y - COLLAR_R - 1.2, HELMET_RIM - 0.4)))
    knit.lathe(
        [(COLLAR_R - 0.9, -1.6), (COLLAR_R + 0.4, -2.0), (COLLAR_R + 0.9, -4.4), (COLLAR_R + 1.9, -6.2), (COLLAR_R - 1.5, -6.8)],
        48,
        matrix=at,
    )
    # the man inside: a head for the opening to have in it, in the headset's white cap. Nobody's likeness
    head, cap, dark, eyes, hair, lips = (MeshBuilder() for _ in range(6))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    head.tube((0, 1.0, B.neck_z - 7.0), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    bowl = Matrix.Diagonal((8.2, 10.3, 11.8, 1.0)) @ Matrix.Rotation(math.radians(-50), 4, "X")
    cap.lathe(arc_profile(0, 0, 1.0, -15, 90, 14), 40, matrix=Matrix.Translation(hc) @ bowl)

    emit(shell, "Helmet_Shell", M["shell"], g)
    emit(padding, "Helmet_Liner", M["padding"], g)
    emit(head, "Helmet_Head", M["skin"], g)
    emit(cap, "Helmet_Cap", M["cap"], g)
    if eyes.verts:
        emit(eyes, "Helmet_Eyes", M["eye"], g)
        emit(dark, "Helmet_Irises", M["dark"], g)
    if hair.verts:
        emit(hair, "Helmet_Brows", M["hair"], g)
        emit(lips, "Helmet_Lips", M["lip"], g)
    emit(visor, "Helmet_Visor", M["glass"], g)
    emit(rim, "Helmet_VisorFrame", M["shell"], g)
    emit(fit, "Helmet_Pivots", M["shell"], g, sharp_angle=30)
    emit(red, "Helmet_Lettering", M["red"], g, smooth=False)
    emit(collar, "Helmet_NeckRing", M["ring"], g, sharp_angle=30)
    emit(knit, "Helmet_Collar", M["knit"], g)


# --------------------------------------------------------------------------- torso


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

    def flat(d: float, th: float) -> float:
        """0 down the front, where the closure lies and the cloth stays smooth under it; 1 in the open."""
        return smooth(abs(fl.azimuth(th)) * 0.3, 2.2, 4.0)

    t.fold = fold
    t.relief = [
        Folds(B.waist_z + 3.0 - B.torso_z0, B.waist_z + 14.0 - B.torso_z0, 6, 0.55, 0.9, spread=3.0, mask=flat),
        Folds(B.z_pit - 9.0 - B.torso_z0, B.z_pit - 2.0 - B.torso_z0, 4, 0.4, 2.7, -TAU / 4, spread=1.6, width=0.7, mask=flat),
    ]
    return t


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.arm], [(a, b) for *_, a, b in B.arm], resample=14)
    d_el = t.key_d(B.elbow_at)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)  # the crook of the elbow faces forward
    th_pit = t.toward((-sx, 0, 0), t.key_d(3))
    hem = B.sleeve_hem
    t.relief = [
        Folds(d_el - 4.5, d_el + 4.5, 6, 0.7, 0.7 * sx, th_in, spread=1.8),
        Folds(t.key_d(2) + 1.0, t.key_d(3) + 6.0, 4, 0.35, 2.1 * sx, th_pit, spread=1.2, mask=lambda dd, _th: smooth(abs(dd - hem), 1.0, 2.6)),
        Folds(t.length - 5.6, t.length - 3.5, 2, 0.35, 3.3 * sx, spread=3.0),  # gathered into the knitted cuff
    ]
    return t


def build_torso(M: dict) -> tuple[dict[int, Tube], Tube]:
    g = group("Torso")
    shell, tape, zips, fit, hose = (MeshBuilder() for _ in range(5))
    t = torso_tube()
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    build_shell(shell, t, arms)

    def az(deg: float) -> float:
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - B.torso_z0

    # the cover's closure down the front, from the collar to the waist, and the band it is drawn in by there
    band(zips, t.trace(d(B.neck_z - 7.2), d(B.waist_z + 2.2), az(0), az(0), 60), 1.5, 0.45, sink=0.2)
    band(tape, ring(t, d(B.waist_z), 72), 2.8, 0.35, closed=True)
    # where the ventilation hose leaves: a fitting at his belly, and the first of the hose in its white braid
    th = az(-38.0)
    z = B.waist_z + 9.0
    p, nm = t.at(d(z), th), t.normal(d(z), th)
    axis = (nm + Vector((-0.2, -0.1, -0.7))).normalized()
    fit.lathe([(3.0, 0.0), (3.0, 1.0), (2.4, 1.2), (2.4, 2.6), (1.6, 2.6)], 24, matrix=frame(p - axis * 0.8, axis))
    pts = fl.polyline(
        [
            tuple(p + axis * 1.6),
            tuple(p + axis * 5.0),
            tuple(p + axis * 8.0 + Vector((-0.8, 0.6, -3.0))),
            tuple(p + axis * 9.0 + Vector((-1.4, 1.2, -7.5))),
        ],
        0.5,
    )
    Tube(pts, [(1.7, 1.7)] * len(pts), resample=1, fold=lambda dd, _th: 0.07 * math.sin(TAU * dd / 1.2)).add(hose, 12)
    emit(shell, "Torso_Shell", M["cover"], g, sharp_angle=None)
    emit(tape, "Torso_Waistband", M["cover"], g, smooth=False)
    emit(zips, "Torso_Closure", M["tape"], g, smooth=False)
    emit(fit, "Torso_HoseFitting", M["aluminium"], g, sharp_angle=30)
    emit(hose, "Torso_Hose", M["hose"], g)
    return arms, t


def build_arms(M: dict, tubes: dict[int, Tube]) -> None:
    g = group("Arms")
    sleeves, steel, glass, face = (MeshBuilder() for _ in range(4))
    hem = B.sleeve_hem
    for sx in (1, -1):
        t = tubes[sx]
        t.mesh(sleeves, 32, t.rows(hem), caps=(False, True))
        t.mesh(sleeves, 32, [hem - 1.2, hem + 0.6], caps=(False, False), sunk=lambda _d: 0.25)
        # on the back of each forearm: the pressure gauge on his right, a mirror in a frame on his left
        dm = t.length - 11.0
        tb = t.toward((sx * 0.5, -0.8, 0.2), dm)
        m = frame(t.at(dm, tb, 0.0), t.normal(dm, tb))
        if sx < 0:
            steel.lathe([(2.6, 0.0), (2.6, 1.3), (2.3, 1.6), (2.1, 1.6), (2.1, 1.1)], 28, matrix=m)
            face.lathe([(2.1, 1.25), (0.0, 1.25)], 28, matrix=m)
        else:
            steel.box((5.0, 6.4, 1.0), m @ Matrix.Translation((0, 0, 0.3)))
            glass.box((3.6, 5.0, 0.3), m @ Matrix.Translation((0, 0, 0.95)))
    emit(sleeves, "Arms_Sleeves", M["cover"], g)
    emit(steel, "Arms_Fittings", M["steel"], g, sharp_angle=30)
    emit(face, "Arms_GaugeFace", M["dark"], g)
    emit(glass, "Arms_Mirror", M["mirror"], g, smooth=False)


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, rings, leather = MeshBuilder(), MeshBuilder(), MeshBuilder()
    fingers: list[float] = []
    for sx in (1, -1):
        hand, palm = fl.gloved_hand(shell, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
        first = len(leather.verts)
        th = palm.toward(-hand.B, 13.0)
        palm.patch(leather, 10.0, palm.length - 1.8, th - 1.1, th + 1.1, 0.4, nd=8, nt=10, sink=0.3)
        fl.fitted(leather, first, hand)
        first = len(rings.verts)
        band(rings, ring(palm, 0.6, 32), 2.3, 0.55, sink=0.5, bevel=0.3, closed=True)
        fl.fitted(rings, first, hand)
    shell.share = fingers
    emit(shell, "Gloves_Shell", M["cover"], g)
    emit(rings, "Gloves_WristRings", M["aluminium"], g, sharp_angle=30)
    emit(leather, "Gloves_Palms", M["palm"], g)


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
            0.7 * (1 - 0.75 * smooth(fl.rig().angles.get("knee", 0.0), 30, 90)),
            1.0 * sx,
            th_front + math.pi,
            spread=1.7,
        ),
        Folds(t.key_d(2) - 2.0, t.key_d(2) + 3.5, 4, 0.35, 2.6 * sx, t.toward((-sx, -0.6, 0), t.key_d(2)), spread=1.0),  # the groin
        Folds(t.key_d(7) - 5.0, t.key_d(7) + 2.0, 5, 0.5, 0.3 * sx, spread=3.0),  # bloused over the boot
    ]
    return t


def build_legs(M: dict, torso: Tube) -> None:
    g = group("Legs")
    legs = MeshBuilder()
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    emit(legs, "Legs_Trousers", M["cover"], g, sharp_angle=None)


def build_boots(M: dict) -> None:
    g = group("Boots")
    uppers, soles, laces, eyelets, tongue = (MeshBuilder() for _ in range(5))
    fl.laced_boots(uppers, soles, laces, eyelets, tongue, BOOT_TOP, BOOT_LENGTH, SIZE, lace_lift=0.06)
    emit(uppers, "Boots_Uppers", M["boot"], g)
    emit(tongue, "Boots_Tongues", M["boot"], g)
    emit(soles, "Boots_Soles", M["sole"], g, sharp_angle=30)
    emit(laces, "Boots_Laces", M["lace"], g)
    emit(eyelets, "Boots_Eyelets", M["steel"], g)


# --------------------------------------------------------------------------- build


def build_figure() -> None:
    M = materials()
    build_helmet(M)
    arms, torso = build_torso(M)
    build_arms(M, arms)
    build_gloves(M, arms)
    build_legs(M, torso)
    build_boots(M)


def seated_rig() -> Rig:
    fl.use(B)
    return fl.seated_rig(SEATED, LAP)


def seated_key_points() -> dict:
    """Where the couch has to be: key points of the seated figure in figurelib's seat frame, centimetres."""
    rig = seated_rig()
    pts = fl.posed_points(_seated_points, seated_rig, build_figure)
    helmet = [p for name, ps in pts.items() if name.startswith("Helmet_Shell") for p in ps]
    return {
        **fl.body_key_points(rig, pts),
        **fl.head_view(rig),  # his eyes and the way his own head is turned: where his couch's view is from
        "head_top": tuple(rig.carry(HELMET_AT + fl.UP * HELMET_R)),
        "helmet_back_z": min(p.z for p in helmet),
    }


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str, who: Wearer) -> dict:
    """`who` in a Voskhod couch, visor down: every mesh a child of `parent`, named `<prefix>_<Node>_<Mesh>`, with no
    skeleton. `place` maps figurelib's seat frame (origin midway between the hip joints, head toward -Y, chest toward
    +Z, his right toward +X), once in metres, into the caller's space. Nothing is built below the detail at which
    interiors are shown. Returns seated_key_points()."""
    wear(who)
    keys = seated_key_points()
    if srlib.interior():
        fl.build_posed(parent, place, prefix, seated_rig, build_figure)
    return keys


def build_pack(parent: bpy.types.Object, place: Matrix, prefix: str = "Pack") -> None:
    """The pack Leonov wore outside, by itself: a rounded white slab with a gauge's window in its outer face, and the
    webbing it hung by. `place` puts its own frame (metres: +Z out of its outer face, +Y its top, origin at its
    middle) in the caller's space. Nothing is built below the detail at which interiors are shown."""
    if not srlib.interior():
        return
    w, h, depth = (v * srlib.CM for v in PACK)
    case, glass, web, steel = (MeshBuilder() for _ in range(4))
    r, n = 0.045, 5
    ring_ = []
    for cx, cy, a0 in (
        (w / 2 - r, h / 2 - r, 0.0),
        (-(w / 2 - r), h / 2 - r, 90.0),
        (-(w / 2 - r), -(h / 2 - r), 180.0),
        (w / 2 - r, -(h / 2 - r), 270.0),
    ):
        ring_ += [(cx + r * math.cos(math.radians(a0 + 90.0 * i / n)), cy + r * math.sin(math.radians(a0 + 90.0 * i / n))) for i in range(n + 1)]
    m = len(ring_)
    # (its edges are eased: the outer face is a little smaller than its middle)
    layers = [(-depth / 2, 0.985), (-depth / 2 + 0.012, 1.0), (depth / 2 - 0.02, 1.0), (depth / 2, 0.93)]
    verts = [(x * k, y * k, z) for z, k in layers for x, y in ring_]
    faces = [(j * m + i, j * m + (i + 1) % m, (j + 1) * m + (i + 1) % m, (j + 1) * m + i) for j in range(len(layers) - 1) for i in range(m)]
    faces += [tuple(reversed(range(m))), tuple(range((len(layers) - 1) * m, len(layers) * m))]
    case.add(verts, faces, None, place)
    top = Matrix.Translation((0, h / 2 - 0.09, depth / 2))
    steel.lathe([(0.034, -0.004), (0.034, 0.008), (0.028, 0.011), (0.026, 0.011), (0.026, 0.004)], 28, matrix=place @ top)
    glass.lathe([(0.026, 0.006), (0.0, 0.006)], 28, matrix=place @ top)
    for sx in (-1, 1):  # two long dimples in its face, and the two straps that went over the shoulders
        case.box((0.03, h * 0.5, 0.012), place @ Matrix.Translation((sx * w * 0.2, -0.05, depth / 2 - 0.002)))
        web.box((0.04, h * 0.9, 0.006), place @ Matrix.Translation((sx * w * 0.3, 0.0, -depth / 2 - 0.004)))
    for mb, name, mat in ((case, "Case", "cover"), (glass, "GaugeGlass", "dark"), (web, "Straps", "web"), (steel, "GaugeRim", "steel")):
        M = materials()
        mb.build(f"{prefix}_{name}", M[mat], parent, sharp_angle=35)
