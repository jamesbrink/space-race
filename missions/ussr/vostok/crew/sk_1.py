"""The Vostok pressure suit: Zvezda's SK-1, as Yuri Gagarin wore it on 12 April 1961.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure
faces -Y, so his left is +X. See ./sk-1.md: his stature and mass are from his service record;
nothing of the suit's own size has been found in print, so its bulk, its helmet and every
fitting are read off photographs and are estimates. The body is figurelib's man, carried to his
stature; the suit is the garment on it: the orange cover that is what the photographs show (the
pressure suit proper is underneath and is seen only as a grey band at the neck), the white
helmet that does not come off, with "СССР" painted on its brow that morning, gloves on metal
wrist rings, black laced boots.

Top-level nodes: Helmet  Torso  Arms  Gloves  Legs  Boots  Skeleton

The standing figure is skinned to Skeleton, the joints every crew figure has (srlib.FIGURE), so
the viewer can walk him, with the visor up (out of sight inside the shell) as it was on the way
to the pad.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

import figurelib as fl
import srlib
from figurelib import (
    FRONT,
    Folds,
    Trousers,
    Tube,
    azimuth,
    band,
    build_head,
    build_shell,
    emit,
    gauss,
    group,
    ring,
    skin,
    smooth,
    squareness,
)
from srlib import TAU, MeshBuilder, arc_profile, frame, material, text_mesh

STATURE = 165.0  # documented: his service record of 1960
SIZE = STATURE / 180.3  # beside figurelib's man: what his hands and boots are scaled by


def body() -> fl.Body:
    """Gagarin: figurelib's man carried to 1.65 m, a little broader for his height (68 kg), in a
    looser garment: the orange cover stands off the pressure suit by a centimetre or more."""
    b = fl.man().scaled(stature=STATURE, heel=2.8 * SIZE, breadth=0.97, girth=0.96, bulk=(1.3, 1.1, 0.6), crotch_drop=4.0)
    plain = fl.man().scaled(stature=STATURE, heel=2.8 * SIZE, breadth=0.97, girth=0.96)
    # where the cloth goes into something it is not let out: the neck into the helmet's collar, the cuffs into the gloves
    b.torso[-4:] = plain.torso[-4:]
    b.arm[-2:] = plain.arm[-2:]
    # the trouser legs are bloused above the boots' tops, drawn in, and go down inside them
    x, y, z, _, _ = b.leg[-1]
    top = BOOT_TOP * BOOT_SIZE
    b.leg[-2:] = [(x, y, top + 4.2, 6.5, 6.8), (x, y, top + 0.9, 4.7, 4.9), (x, y, z, 4.0, 4.2)]
    return b


BOOT_TOP = 28.0  # as on a man of 1.80 m: about mid-calf
BOOT_LENGTH = 31.2
BOOT_SIZE = 0.93  # a 29 cm sole: a shade large for him, as a boot worn over a suit's foot is
B = body()
fl.use(B)

HELMET_R = 15.2  # the shell is a ball from the crown down to the chin
HELMET_AT = Vector((0, B.head_y - 1.3, B.head.z - 0.5))  # its centre: ahead of and under the middle of the skull, so that the chin is inside
HELMET_TOP = HELMET_AT.z + HELMET_R
HELMET_RIM = B.neck_z + 1.6  # its lower edge, on the collar
COLLAR_R = 11.4
VISOR = (math.radians(54), 0.6, 8.6)  # the opening: half its width round the shell, its middle above the ball's, half its height
LETTERS = "СССР"
LETTER_HEIGHT = 2.7  # estimated from the photographs of 12 April
PORT = (B.waist_z + 9.0, -38.0)  # where the hoses leave the suit: (height, azimuth in degrees): his right abdomen


def materials() -> dict:
    def m(name: str, *args) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        return bpy.data.materials.get(name) or material(name, *args)

    return {
        # (the viewer gives any material named suit... a weave)
        "cover": m("suit-orange-cover", (0.80, 0.27, 0.04), 0.0, 0.85),
        "liner": m("suit-grey-pressure-layer", (0.42, 0.45, 0.47), 0.0, 0.8),
        "shell": m("helmet-white", (0.86, 0.86, 0.83), 0.0, 0.3),
        "glass": m("glass-visor", (0.02, 0.03, 0.04), 0.0, 0.04),
        "padding": m("helmet-liner", (0.06, 0.06, 0.06), 0.0, 0.9),
        "red": m("paint-red-nitro", (0.62, 0.04, 0.03), 0.0, 0.5),
        "skin": m("skin", (0.62, 0.42, 0.33), 0.0, 0.65),
        "eye": m("eye-white", (0.80, 0.79, 0.75), 0.0, 0.35),
        "hair": m("hair-brown", (0.10, 0.07, 0.05), 0.0, 0.8),
        "lip": m("skin-lip", (0.50, 0.29, 0.25), 0.0, 0.55),
        "cap": m("cap-leather-white", (0.84, 0.83, 0.78), 0.0, 0.7),
        "dark": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "mirror": m("steel-polished", (0.80, 0.81, 0.82), 1.0, 0.06),
        "leather": m("boot-leather-black", (0.025, 0.024, 0.023), 0.0, 0.5),
        "sole": m("sole-leather-tan", (0.42, 0.30, 0.18), 0.0, 0.7),
        "lace": m("lace-cord-black", (0.03, 0.03, 0.03), 0.0, 0.85),
        "hose": m("hose-grey-green", (0.30, 0.34, 0.30), 0.0, 0.65),
    }


# -------------------------------------------------------------------------- helmet


def ball(phi: float, lift: float, off: float = 0.0) -> Vector:
    """A point of the helmet's ball: `phi` round from straight ahead toward his left, `lift` up from its middle, radians; `off` outside the shell."""
    r = HELMET_R + off
    return HELMET_AT + Vector((r * math.cos(lift) * math.sin(phi), -r * math.cos(lift) * math.cos(phi), r * math.sin(lift)))


def build_helmet(M: dict) -> None:
    g = group("Helmet")
    shell, padding, visor, rim, fit, collar, band_, red = (MeshBuilder() for _ in range(8))
    half, mid, tall = VISOR
    low = math.asin((HELMET_RIM + 1.4 - HELMET_AT.z) / HELMET_R)  # where the ball gives way to the collar
    n = fl.sides(56)
    phis = [TAU * i / n for i in range(n)]
    lifts = [low + (math.pi / 2 - 0.02 - low) * j / 26 for j in range(27)]

    def opening(phi: float, lift: float) -> float:
        """Under 1 inside the visor's opening, a rounded oblong on the ball."""
        u, v = abs(((phi + math.pi) % TAU - math.pi) / half), abs((HELMET_R * math.sin(lift) - mid) / tall)
        return (u**3.4 + v**3.4) ** (1 / 3.4)

    rows = [[Vector((COLLAR_R * math.sin(p), HELMET_AT.y - COLLAR_R * math.cos(p), HELMET_RIM)) for p in phis]]
    rows += [[ball(p, lift) for p in phis] for lift in lifts]
    rows.append([HELMET_AT + Vector((0, 0, HELMET_R))] * n)

    def solid(j: int, i: int) -> bool:
        if j == 0 or j + 1 >= len(lifts):
            return True
        return opening(phis[i] + TAU / (2 * n), (lifts[j - 1] + lifts[j]) / 2) > 1.03

    skin(shell, rows, HELMET_AT, closed=True, keep=solid)
    # the padding inside, seen through the opening: without it the shell has no inside
    skin(padding, [[HELMET_AT + (p - HELMET_AT) * 0.94 for p in row] for row in rows], HELMET_AT, closed=True, inward=True, keep=solid)

    def edge(psi: float, rho: float = 1.0) -> tuple[float, float]:
        f = rho * (1 + squareness(psi, 3.4))
        return half * f * math.cos(psi), math.asin((mid + tall * f * math.sin(psi)) / HELMET_R)

    psis = [TAU * i / n - TAU / 4 for i in range(n)]
    # (a ball of flat faces lies inside the true one by up to this much: what is laid on it stands that much further off)
    lip = 0.22 + HELMET_R * (1 - math.cos(math.pi / n))
    # the opening's own edge: a lip of the shell, true to the line where the grid of the ball is cut in steps
    skin(
        shell,
        [[ball(*edge(psi, rho), off) for psi in psis] for rho, off in ((0.97, 0.05), (1.0, lip), (1.08, lip), (1.15, lip - 0.05), (1.19, -0.1))],
        HELMET_AT,
        closed=True,
    )
    skin(padding, [[ball(*edge(psi, rho), -1.3) for psi in psis] for rho in (0.97, 1.05, 1.13, 1.2)], HELMET_AT, closed=True, inward=True)
    # the opening's metal frame
    line = [ball(*edge(psi), lip + 0.05) for psi in psis]
    Tube([*line, line[0]], [(0.55, 0.55)] * (n + 1), resample=2).add(rim, 10)
    # The visor: a clear pane on the same ball, a little outside it, hung on the pivots at the
    # temples. Open, it is swung up out of sight between the shell and its padding, which is how
    # he wore it to the pad: the standing figure has none. In the seat it is down.
    if fl.rig().posed():
        pane = [[ball(*edge(psi, rho), 1.25 if rho < 1.1 else 1.15) for psi in psis] for rho in (0.0, 0.25, 0.5, 0.75, 0.95, 1.08, 1.12)]
        skin(visor, pane, HELMET_AT, closed=True)
    for sx in (1, -1):
        fit.lathe([(2.3, 0.0), (2.3, 0.9), (1.9, 1.2), (0.0, 1.2)], 24, matrix=frame(ball(sx * TAU / 4, 0.0, -0.3), (sx, 0, 0)))

    # "СССР" in red on the brow, over the opening: painted by hand that morning
    font = srlib.load_font()
    verts, faces = text_mesh(LETTERS, 1.0, font, cuts=2)
    xs, ys = [v[0] for v in verts], [v[1] for v in verts]
    k = LETTER_HEIGHT / (max(ys) - min(ys))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    brow = math.asin((mid + tall) / HELMET_R) + (2.3 + LETTER_HEIGHT / 2) / HELMET_R
    red.add(
        [tuple(ball((x - cx) * k * 1.12 / (HELMET_R * math.cos(brow)), brow + (y - cy) * k / HELMET_R, 0.16)) for x, y, _ in verts],
        faces,
    )

    # the collar the helmet stands on: a metal ring, and under it the grey of the pressure suit's own neck
    collar.lathe(
        [(COLLAR_R - 1.4, -1.5), (COLLAR_R + 0.5, -1.5), (COLLAR_R + 0.8, -1.1), (COLLAR_R + 0.8, 0.9), (COLLAR_R + 0.3, 1.6), (COLLAR_R - 0.6, 1.6)],
        56,
        matrix=Matrix.Translation((0, HELMET_AT.y, HELMET_RIM)),
    )
    band_.lathe(
        [(COLLAR_R - 0.9, -1.2), (COLLAR_R + 0.2, -1.6), (COLLAR_R + 0.5, -4.2), (COLLAR_R + 1.3, -6.0), (COLLAR_R - 1.5, -6.6)],
        48,
        matrix=Matrix.Translation((0, HELMET_AT.y, HELMET_RIM)),
    )
    # the ventilation fitting at the right front of the collar, with the stub of its hose
    phi = math.radians(-58)
    at = Vector((COLLAR_R * math.sin(phi), HELMET_AT.y - COLLAR_R * math.cos(phi), HELMET_RIM - 0.4))
    out = Vector((math.sin(phi), -math.cos(phi), -0.35)).normalized()
    fit.lathe([(1.5, -0.6), (1.5, 1.4), (1.15, 1.6), (1.15, 2.8), (0.0, 2.8)], 20, matrix=frame(at, out))

    # the man inside: a head for the opening to have in it. Nobody's likeness (sk-1.md).
    head, cap, dark, eyes, hair, lips = (MeshBuilder() for _ in range(6))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    head.tube((0, 1.0, B.neck_z - 7.0), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    # the white headset cap: a bowl over the crown and the back of the head, standing off the scalp all round
    bowl = Matrix.Diagonal((8.2, 10.3, 11.8, 1.0)) @ Matrix.Rotation(math.radians(-50), 4, "X")
    cap.lathe(arc_profile(0, 0, 1.0, -15, 90, 14), 40, matrix=Matrix.Translation(hc) @ bowl)
    for sx in (1, -1):  # a microphone at each corner of the mouth, on a short boom from the cap
        dark.tube((sx * 7.3, hc.y - 2.0, hc.z - 4.5), (sx * 3.6, hc.y - 9.6, hc.z - 6.3), 0.28, 8)
        dark.box((1.5, 1.0, 1.1), Matrix.Translation((sx * 3.3, hc.y - 9.9, hc.z - 6.3)))

    emit(shell, "Helmet_Shell", M["shell"], g)
    emit(padding, "Helmet_Liner", M["padding"], g)
    emit(head, "Helmet_Head", M["skin"], g)
    emit(cap, "Helmet_Cap", M["cap"], g)
    emit(dark, "Helmet_Microphones", M["dark"], g, sharp_angle=30)
    if eyes.verts:
        emit(eyes, "Helmet_Eyes", M["eye"], g)
    if hair.verts:
        emit(hair, "Helmet_Brows", M["hair"], g)
        emit(lips, "Helmet_Lips", M["lip"], g)
    if visor.verts:
        emit(visor, "Helmet_Visor", M["glass"], g)
    emit(rim, "Helmet_VisorFrame", M["aluminium"], g)
    emit(fit, "Helmet_Fittings", M["aluminium"], g, sharp_angle=30)
    emit(red, "Helmet_Lettering", M["red"], g, smooth=False)
    emit(collar, "Helmet_Collar", M["aluminium"], g, sharp_angle=30)
    emit(band_, "Helmet_NeckBand", M["liner"], g)


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
        f -= 0.045 * gauss(z, B.waist_z, 3.5)  # drawn in at the waist
        return f

    def flat(d: float, th: float) -> float:
        """0 where a fitting lies and the cloth has to stay smooth under it, 1 in the open."""
        z, a = B.torso_z0 + d, azimuth(th)
        keep = smooth(abs(a) * 0.3, 2.2, 4.0)  # the front closure
        keep *= smooth(math.hypot(z - PORT[0], (a - PORT[1]) * 0.3), 4.5, 7.0)
        return keep * smooth(abs(z - B.waist_z), 1.8, 3.4)

    t.fold = fold
    # a loose cover: slack above and below the waist, and under the chest
    t.relief = [
        Folds(B.waist_z + 3.0 - B.torso_z0, B.waist_z + 14.0 - B.torso_z0, 6, 0.55, 0.9, spread=3.0, mask=flat),
        Folds(B.z_pit - 9.0 - B.torso_z0, B.z_pit - 2.0 - B.torso_z0, 4, 0.4, 2.7, -TAU / 4, spread=1.6, width=0.7, mask=flat),
    ]
    return t


def build_torso(M: dict) -> tuple[dict[int, Tube], Tube]:
    g = group("Torso")
    shell, tape, fit, hose = (MeshBuilder() for _ in range(4))
    t = torso_tube()
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    build_shell(shell, t, arms)

    def az(deg: float) -> float:
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - B.torso_z0

    # the front closure, from the collar down to the waist, under a flap of the cover's own cloth
    band(tape, t.trace(d(B.neck_z - 7.5), d(B.waist_z + 2.0), az(0), az(0), 60), 3.4, 0.3, sink=0.4)
    # a band of the same cloth at the waist, where the cover is drawn in: it lies over the line where the shell ends and the trousers begin
    band(tape, ring(t, d(B.waist_z), 72), 2.8, 0.35, closed=True)
    # where the hoses leave: a fitting at his right abdomen, and the first of the bundle hanging from it
    th = az(PORT[1])
    p, nm = t.at(d(PORT[0]), th), t.normal(d(PORT[0]), th)
    axis = (nm + Vector((-0.2, -0.1, -0.7))).normalized()
    fit.lathe([(2.9, 0.0), (2.9, 1.0), (2.3, 1.2), (2.3, 2.6), (1.5, 2.6)], 24, matrix=frame(p - axis * 0.8, axis))
    pts = fl.polyline(
        [
            tuple(p + axis * 1.6),
            tuple(p + axis * 5.0),
            tuple(p + axis * 8.0 + Vector((-0.6, 0.6, -3.0))),
            tuple(p + axis * 9.0 + Vector((-1.0, 1.2, -7.5))),
        ],
        0.5,
    )
    Tube(pts, [(1.45, 1.45)] * len(pts), resample=1, fold=lambda dd, _th: 0.07 * math.sin(TAU * dd / 1.5)).add(hose, 12)
    end = pts[-1]
    fit.box((3.4, 2.6, 3.6), Matrix.Translation(end + Vector((0, 0, -1.2))))  # the connector the bundle ends in

    emit(shell, "Torso_Shell", M["cover"], g, sharp_angle=None)
    emit(tape, "Torso_Closure", M["cover"], g, smooth=False)
    emit(fit, "Torso_HoseFitting", M["aluminium"], g, sharp_angle=30)
    emit(hose, "Torso_Hoses", M["hose"], g)
    return arms, t


# ---------------------------------------------------------------------------- arms


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.arm], [(a, b) for *_, a, b in B.arm], resample=14)
    d_el = t.key_d(B.elbow_at)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)  # the crook of the elbow faces forward
    th_pit = t.toward((-sx, 0, 0), t.key_d(3))
    hem = B.sleeve_hem
    t.relief = [
        Folds(d_el - 4.5, d_el + 4.5, 6, 0.7, 0.7 * sx, th_in, spread=1.8),
        Folds(t.key_d(2) + 1.0, t.key_d(3) + 6.0, 4, 0.35, 2.1 * sx, th_pit, spread=1.2, mask=lambda dd, _th: smooth(abs(dd - hem), 1.0, 2.6)),
        Folds(t.length - 5.6, t.length - 3.5, 2, 0.35, 3.3 * sx, spread=3.0),  # gathered above the wrist ring
    ]
    return t


def build_arms(M: dict, tubes: dict[int, Tube]) -> None:
    g = group("Arms")
    sleeves, patch, glass, steel = (MeshBuilder() for _ in range(4))
    hem = B.sleeve_hem
    for sx in (1, -1):
        t = tubes[sx]
        # the sleeve starts on the ring of points the shoulder's skin ends on; a band underneath backs the join
        t.mesh(sleeves, 32, t.rows(hem), caps=(False, True))
        t.mesh(sleeves, 32, [hem - 1.2, hem + 0.6], caps=(False, False), sunk=lambda _d: 0.25)
    # the mirror sewn on the right sleeve, for what he cannot see directly: a round glass in a cloth patch on the back of the forearm
    t = tubes[-1]
    dm = t.length - 10.6
    th = t.toward((-0.8, -0.6, 0.1), dm)
    t.patch(patch, dm - 3.0, dm + 3.0, th - 0.62, th + 0.62, 0.3, nd=8, nt=8)
    m = frame(t.at(dm, th, 0.0), t.normal(dm, th))
    steel.lathe([(2.5, 0.0), (2.5, 0.8), (2.2, 1.0), (2.05, 1.0), (2.05, 0.6)], 28, matrix=m)
    glass.lathe([(2.1, 0.75), (0.0, 0.75)], 28, matrix=m)

    emit(sleeves, "Arms_Sleeves", M["cover"], g)
    emit(patch, "Arms_MirrorPatch", M["cover"], g)
    emit(steel, "Arms_MirrorRim", M["steel"], g, sharp_angle=30)
    emit(glass, "Arms_Mirror", M["mirror"], g)


# -------------------------------------------------------------------------- gloves


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, rings = MeshBuilder(), MeshBuilder()
    fingers: list[float] = []
    for sx in (1, -1):
        hand, palm = fl.gloved_hand(shell, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
        # the metal ring each glove locks to the sleeve by
        first = len(rings.verts)
        band(rings, ring(palm, 0.6, 32), 2.3, 0.55, sink=0.5, bevel=0.3, closed=True)
        fl.fitted(rings, first, hand)
    shell.share = fingers
    emit(shell, "Gloves_Shell", M["cover"], g)
    emit(rings, "Gloves_WristRings", M["aluminium"], g, sharp_angle=30)


# ---------------------------------------------------------------------------- legs


def leg_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.leg], [(a, b) for *_, a, b in B.leg], resample=18)
    d_knee, d_calf = t.key_d(B.knee_at), t.key_d(B.knee_at + 1)
    th_front = t.toward(FRONT, d_knee)

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
        Folds(t.key_d(7) - 3.5, t.key_d(7) + 1.5, 4, 0.45, 0.3 * sx, spread=3.0),  # bloused over the boot
    ]
    return t


def build_legs(M: dict, torso: Tube) -> None:
    g = group("Legs")
    legs, pockets, snaps = (MeshBuilder() for _ in range(3))
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    for sx in (1, -1):
        t = tubes[sx]
        # a patch pocket on the front of each thigh, under a flap held by two snaps
        d0 = t.key_d(2) + 9.0
        th = t.toward((sx * 0.45, -1, 0), d0)
        t.patch(pockets, d0 + 3.2, d0 + 15.0, th - 0.62, th + 0.62, 0.3, nd=10, nt=10)
        t.patch(pockets, d0, d0 + 4.4, th - 0.66, th + 0.66, 0.55, nd=4, nt=10)
        if srlib.DETAIL >= 0.5:
            for s in (-0.42, 0.42):
                snaps.disc(t.at(d0 + 3.4, th + s, 0.45), t.normal(d0 + 3.4, th + s), 0.45, 0.3, 10)

    emit(legs, "Legs_Trousers", M["cover"], g, sharp_angle=None)
    emit(pockets, "Legs_Pockets", M["cover"], g)
    if snaps.verts:
        emit(snaps, "Legs_PocketSnaps", M["steel"], g)


# --------------------------------------------------------------------------- boots


def build_boots(M: dict) -> None:
    g = group("Boots")
    uppers, soles, laces, eyelets, tongue = (MeshBuilder() for _ in range(5))
    fl.laced_boots(uppers, soles, laces, eyelets, tongue, BOOT_TOP, BOOT_LENGTH, BOOT_SIZE, lace_lift=0.06)
    emit(uppers, "Boots_Uppers", M["leather"], g)
    emit(tongue, "Boots_Tongues", M["leather"], g)
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


def build() -> float:
    """Builds the standing figure and returns its height in metres."""
    fl.use(B)
    fl.start()
    build_figure()
    fl.rig_standing()
    return max(v.co.z for o in bpy.data.objects if o.type == "MESH" for v in o.data.vertices)
