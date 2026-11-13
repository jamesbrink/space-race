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
the viewer can walk him, with the visor up over the crown as it was on the way to the pad.
build_seated() is the same man in the ejection seat's pose, visor down, for a cabin.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import bpy
from mathutils import Matrix, Vector

import figurelib as fl
import srlib
from figurelib import (
    FRONT,
    UP,
    Folds,
    Rig,
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


@dataclass(frozen=True)
class Wearer:
    """Who is in the suit: the pilot's own measures, and what of the suit was made to them. The defaults are Gagarin's
    (sk-1.md); a flight whose pilot is recorded otherwise gives its own and calls `wear` before it builds."""

    stature: float = 165.0  # documented: his service record of 1960
    breadth: float = 0.97  # distances from the midline, beside figurelib's man of 1.80 m
    girth: float = 0.96  # every section's radii, beside the same man
    bulk: tuple[float, float, float] = (1.3, 1.1, 0.6)  # the cover let out over the pressure suit: trunk, arms, legs, cm
    shoulders: float = 1.0  # the chest and shoulders again, beside `breadth`
    hips: float = 1.0  # the pelvis and the tops of the thighs again, beside `breadth`
    boot: float = 0.93  # the shared boot's size: a 29 cm sole, a shade large for him, as a boot worn over a suit's foot is
    glove: float = 1.0  # the gloves beside a hand of the pilot's own size: the SK-2's were thinner
    # What of the suit itself differed (sk-1.md, "The SK-2, and the suits of June 1963"). Each is read off photographs.
    valve: str = "plain"  # the round fitting at the right front of the collar: "plain", or a disc with a rim: "disc-black", "disc-pale"
    neck: str = "grey"  # the pressure suit's own neck under the helmet's ring: "grey", or "pale"
    gloves: str = "cover"  # the gloves' backs and fingers: the "cover"'s orange cloth, or "black" leather
    mirror: bool = True  # the mirror sewn on the right sleeve


GAGARIN = Wearer()
# Bykovskiy on 14 June 1963, in the last SK-1 made. No document with his height was found: he is the module's own
# figure (in his suit he weighed 90.7 kg, which less the suit's 23 kg is Gagarin's 68). What is his own is read off
# the film and photographs of that day and the suit Zvezda keeps: the valve's disc, the pale neck, black gloves.
BYKOVSKY = Wearer(valve="disc-pale", neck="pale", gloves="black")
# Tereshkova on 16 June 1963, in the SK-2: the SK-1 cut again for a woman, with "a decreased shoulder breadth" and "an
# increased hip girth" (Abramov and Skoog, p. 58), gloves with thinner insulation, no mirror on the right sleeve (the
# photographs of that morning). No document with her height was found: 1.64 m is what her proportion to her helmet
# gives in the photograph of her reporting at the pad. Every amount here is estimated.
TERESHKOVA = Wearer(
    stature=164.0,
    breadth=0.93,
    girth=0.94,
    shoulders=0.95,
    hips=1.06,
    boot=0.86,
    glove=0.94,
    valve="disc-black",
    neck="pale",
    gloves="black",
    mirror=False,
)
BOOT_TOP = 28.0  # as on a man of 1.80 m: about mid-calf
BOOT_LENGTH = 31.2
HELMET_R = 15.2  # the shell is a ball from the crown down to the chin
COLLAR_R = 11.4
VISOR = (math.radians(62), 1.6, 8.6)  # the opening: half its width round the shell, its middle above the ball's, half its height
VISOR_UP = 92.0  # degrees the visor is swung up over the crown when it is open
LETTERS = "СССР"
VALVE_R = 4.0  # the breathing valve's disc on the suits of June 1963: about 8 cm across, off the photographs
VALVE_AT = (-34.0, 4.6)  # where it hangs: degrees round the collar toward the pilot's right, centimetres under the ring
ELBOW_AT = -86.0  # the elbow fitting at the right of the ring
LETTER_HEIGHT = 3.8  # estimated from the photographs of 12 April and of the suits kept since


def body(who: Wearer = GAGARIN) -> fl.Body:
    """The pilot: figurelib's man carried to his stature (Gagarin: 1.65 m, a little broader for his height at 68 kg), in
    a looser garment: the orange cover stands off the pressure suit by a centimetre or more."""
    size = who.stature / 180.3
    b = fl.man().scaled(stature=who.stature, heel=2.8 * size, breadth=who.breadth, girth=who.girth, bulk=who.bulk, crotch_drop=4.0)
    plain = fl.man().scaled(stature=who.stature, heel=2.8 * size, breadth=who.breadth, girth=who.girth)
    # where the cloth goes into something it is not let out: the neck into the helmet's collar, the cuffs into the gloves
    b.torso[-4:] = plain.torso[-4:]
    b.arm[-2:] = plain.arm[-2:]
    # the trouser legs hang over the boots' tops: full above them, and ending a little way down the outside of the shaft
    x, y, _, _, _ = b.leg[-1]
    top = BOOT_TOP * who.boot
    b.leg[-2:] = [(x, y, top + 5.5, 7.0, 7.3), (x, y, top + 1.6, 7.3, 7.6), (x, y, top - 0.6, 7.0, 7.3)]
    if who.shoulders != 1.0 or who.hips != 1.0:
        build_of(b, who.shoulders, who.hips)
    if who.glove != 1.0:
        b.hand *= who.glove
    return b


def build_of(b: fl.Body, shoulders: float, hips: float) -> None:
    """A build that one figure for breadth does not give: the trunk from the waist up to the yoke, the armholes and
    the arms that hang from them are made `shoulders` as wide, the pelvis and the thighs down to the knees `hips` as
    wide. The neck goes into the same collar and the shins into the same boots, so neither moves."""

    def across(z: float) -> float:
        up = smooth(z, b.waist_z, b.z_pit) * (1 - smooth(z, b.z_yoke, b.neck_z))
        down = 1 - smooth(z, b.z_crotch + 6.0, b.waist_z)
        return 1 + (shoulders - 1) * up + (hips - 1) * down

    b.torso = [(z, a * across(z), d) for z, a, d in b.torso]
    b.pit_x *= shoulders
    b.arm = [(x * shoulders, y, z, a, d) for x, y, z, a, d in b.arm]
    b.hip_x *= hips
    knee = b.leg[b.knee_at][2]
    b.leg = [(x * (1 + (hips - 1) * smooth(z, knee, b.z_crotch)), y, z, a, d) for x, y, z, a, d in b.leg]


def wear(who: Wearer) -> None:
    """Whose suit is built from here on: everything below reads these, and they follow the pilot's measures."""
    global WEARER, STATURE, SIZE, BOOT_SIZE, B, HELMET_AT, HELMET_TOP, HELMET_RIM, PORT
    WEARER = who
    STATURE = who.stature
    SIZE = STATURE / 180.3  # beside figurelib's man: what his hands and boots are scaled by
    BOOT_SIZE = who.boot
    B = body(who)
    fl.use(B)
    HELMET_AT = Vector((0, B.head_y - 1.3, B.head.z - 0.5))  # its centre: ahead of and under the middle of the skull, so that the chin is inside
    HELMET_TOP = HELMET_AT.z + HELMET_R
    HELMET_RIM = B.neck_z + 1.6  # its lower edge, on the collar
    PORT = (B.waist_z + 9.0, -38.0)  # where the hoses leave the suit: (height, azimuth in degrees): his right abdomen
    _seated_points.clear()


_seated_points: dict[float, dict[str, list[Vector]]] = {}
wear(GAGARIN)


def materials() -> dict:
    def m(name: str, *args) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        return bpy.data.materials.get(name) or material(name, *args)

    return {
        # (the viewer gives any material named suit... a weave)
        # (a strong red-orange, by eye from colour photographs of 12 April and of the suits in museums: estimated)
        "cover": m("suit-orange-cover", (0.83, 0.16, 0.015), 0.0, 0.8),
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
        "palm": m("glove-leather-tan", (0.50, 0.33, 0.17), 0.0, 0.6),
        "tape": m("zipper-tape", (0.10, 0.10, 0.11), 0.0, 0.8),
        "cord": m("cord-cream", (0.74, 0.68, 0.52), 0.0, 0.85),
        "microphone": m("microphone-red-brown", (0.30, 0.07, 0.05), 0.0, 0.6),
        # what only some suits have, made only for them
        **({"liner": m("suit-pale-pressure-layer", (0.70, 0.71, 0.68), 0.0, 0.8)} if WEARER.neck == "pale" else {}),
        **({"valve": m("valve-enamel-pale", (0.78, 0.78, 0.75), 0.1, 0.45)} if WEARER.valve == "disc-pale" else {}),
        **({"glove": m("glove-leather-black", (0.03, 0.03, 0.03), 0.0, 0.5)} if WEARER.gloves == "black" else {}),
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
    # The visor: a clear pane on the same ball, a little outside it, in a metal rim, hung on the
    # pivots at the temples. Open, it is swung up over the crown, which is how he wore it to the
    # pad; in the seat it is down.
    up = 0.0 if fl.rig().posed() else math.radians(VISOR_UP)
    swing = Matrix.Translation(HELMET_AT) @ Matrix.Rotation(-up, 4, "X") @ Matrix.Translation(-HELMET_AT)
    pane = [[swing @ ball(*edge(psi, rho), 1.25 if rho < 1.1 else 1.15) for psi in psis] for rho in (0.0, 0.25, 0.5, 0.75, 0.95, 1.08, 1.12)]
    skin(visor, pane, HELMET_AT, closed=True)
    # the pane's own metal rim
    line = [swing @ ball(*edge(psi, 1.12), 1.2) for psi in psis]
    Tube([*line, line[0]], [(0.5, 0.42)] * (n + 1), resample=2).add(rim, 10)
    for sx in (1, -1):
        fit.lathe([(2.3, 0.0), (2.3, 0.9), (1.9, 1.2), (0.0, 1.2)], 24, matrix=frame(ball(sx * TAU / 4, 0.0, -0.3), (sx, 0, 0)))

    # "СССР" in red on the brow, over the opening: painted by hand that morning
    font = srlib.load_font()
    verts, faces = text_mesh(LETTERS, 1.0, font, cuts=2)
    xs, ys = [v[0] for v in verts], [v[1] for v in verts]
    k = LETTER_HEIGHT / (max(ys) - min(ys))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    brow = math.asin((mid + tall) / HELMET_R) + (3.2 + LETTER_HEIGHT / 2) / HELMET_R
    red.add(
        [tuple(ball((x - cx) * k * 1.3 / (HELMET_R * math.cos(brow)), brow + (y - cy) * k / HELMET_R, 0.16)) for x, y, _ in verts],
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
    valve_rim, valve_slots, hose = MeshBuilder(), MeshBuilder(), MeshBuilder()
    if WEARER.valve == "plain":
        # the ventilation fitting at the right front of the collar, with the stub of its hose
        phi = math.radians(-58)
        at = Vector((COLLAR_R * math.sin(phi), HELMET_AT.y - COLLAR_R * math.cos(phi), HELMET_RIM - 0.4))
        out = Vector((math.sin(phi), -math.cos(phi), -0.35)).normalized()
        fit.lathe([(2.7, -0.6), (2.7, 1.0), (2.3, 1.3), (2.3, 1.9), (0.0, 1.9)], 28, matrix=frame(at, out))
    else:
        # The suits of June 1963, as the photographs and the film of those mornings have them: the breathing valve is a
        # disc some 8 cm across hung on the neck piece under the ring at the pilot's right front, a thick rim round a
        # metal cap with three slots; beside it, at the right of the ring, an elbow with the stub of a black hose.
        phi = math.radians(VALVE_AT[0])
        r = COLLAR_R + 0.5 + 0.44 * (VALVE_AT[1] - 4.2)  # the neck piece's own radius at that depth under the ring
        at = Vector((r * math.sin(phi), HELMET_AT.y - r * math.cos(phi), HELMET_RIM - VALVE_AT[1]))
        out = Vector((math.sin(phi), -math.cos(phi), -0.42)).normalized()
        m = frame(at, out)
        valve_rim.lathe([(VALVE_R, -0.8), (VALVE_R, 1.5), (VALVE_R - 0.5, 2.2), (2.45, 2.2), (2.45, 1.4)], 36, matrix=m)
        fit.lathe([(2.4, 0.9), (2.4, 2.45), (1.7, 2.9), (0.0, 2.9)], 28, matrix=m)
        for i in range(3 if srlib.DETAIL >= 0.75 else 0):
            turn = Matrix.Rotation(TAU * i / 3 + 0.5, 4, "Z")
            valve_slots.box((0.3, 1.0, 0.3), m @ turn @ Matrix.Translation((0, 1.15, 2.9)))
        phi = math.radians(ELBOW_AT)
        side = Vector((math.sin(phi), -math.cos(phi), 0.0))
        root = Vector((0, HELMET_AT.y, HELMET_RIM - 0.2)) + side * (COLLAR_R + 0.4)
        knee = root + side * 3.4 + Vector((0, 0, -0.6))
        fit.lathe([(2.0, -0.4), (2.0, 0.9), (1.5, 1.2)], 20, matrix=frame(root, side))
        Tube([root, root + side * 2.2, knee, knee + Vector((0, 0, -2.6))], [(1.3, 1.3)] * 4, resample=4).add(fit, 14)
        fit.lathe([(1.75, 0.0), (1.75, 0.9), (1.3, 1.1)], 16, matrix=frame(knee + Vector((0, 0, -2.2)), (0, 0, -1)))
        keys = [tuple(knee + Vector(v)) for v in ((0, 0, -3.2), (0.3, -0.5, -6.0), (1.2, -1.2, -9.0))]
        pts = fl.polyline(keys, 0.5)
        Tube(pts, [(1.2, 1.2)] * len(pts), resample=1, fold=lambda dd, _th: 0.07 * math.sin(TAU * dd / 1.2)).add(hose, 12)

    # the man inside: a head for the opening to have in it. Nobody's likeness (sk-1.md).
    head, cap, dark, eyes, hair, lips, mics = (MeshBuilder() for _ in range(7))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    head.tube((0, 1.0, B.neck_z - 7.0), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    # the white headset cap: a bowl over the crown and the back of the head, standing off the scalp all round
    bowl = Matrix.Diagonal((8.2, 10.3, 11.8, 1.0)) @ Matrix.Rotation(math.radians(-50), 4, "X")
    cap.lathe(arc_profile(0, 0, 1.0, -15, 90, 14), 40, matrix=Matrix.Translation(hc) @ bowl)
    for sx in (1, -1):  # a microphone at each corner of the mouth, on a short boom from the cap
        dark.tube((sx * 7.3, hc.y - 2.0, hc.z - 4.5), (sx * 3.6, hc.y - 9.6, hc.z - 6.3), 0.28, 8)
        mics.disc((sx * 3.3, hc.y - 9.5, hc.z - 6.3), (sx * 0.35, -1, 0), 0.95, 0.9, 14)

    emit(shell, "Helmet_Shell", M["shell"], g)
    emit(padding, "Helmet_Liner", M["padding"], g)
    emit(head, "Helmet_Head", M["skin"], g)
    emit(cap, "Helmet_Cap", M["cap"], g)
    emit(dark, "Helmet_MicrophoneBooms", M["dark"], g, sharp_angle=30)
    emit(mics, "Helmet_Microphones", M["microphone"], g, sharp_angle=30)
    if eyes.verts:
        emit(eyes, "Helmet_Eyes", M["eye"], g)
    if hair.verts:
        emit(hair, "Helmet_Brows", M["hair"], g)
        emit(lips, "Helmet_Lips", M["lip"], g)
    emit(visor, "Helmet_Visor", M["glass"], g)
    emit(rim, "Helmet_VisorFrame", M["aluminium"], g)
    emit(fit, "Helmet_Fittings", M["aluminium"], g, sharp_angle=30)
    emit(red, "Helmet_Lettering", M["red"], g, smooth=False)
    emit(collar, "Helmet_Collar", M["aluminium"], g, sharp_angle=30)
    emit(band_, "Helmet_NeckBand", M["liner"], g)
    if valve_rim.verts:
        emit(valve_rim, "Helmet_ValveRim", M.get("valve", M["dark"]), g, sharp_angle=30)
        emit(hose, "Helmet_Hose", M["dark"], g)
    if valve_slots.verts:
        emit(valve_slots, "Helmet_ValveSlots", M["dark"], g, smooth=False)


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
    shell, tape, fit, hose, zips, teeth = (MeshBuilder() for _ in range(6))
    t = torso_tube()
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    build_shell(shell, t, arms)

    def az(deg: float) -> float:
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - B.torso_z0

    # the front closure, from the collar down to the waist, under a flap of the cover's own cloth
    for side in (-5.5, 5.5):
        band(tape, t.trace(d(B.neck_z - 7.5), d(B.waist_z + 2.0), az(side), az(side), 60), 1.6, 0.3, sink=0.4)
    line = t.trace(d(B.neck_z - 7.0), d(B.waist_z + 2.2), az(0), az(0), 60)
    band(zips, line, 1.5, 0.5, sink=0.2)
    band(teeth, line[1:-1], 0.45, 0.2, lift=0.5, sink=0.2, bevel=0.1)
    # a welted pocket on each side of the chest, and the slanting zip on the left of the abdomen
    for sx in (1, -1):
        band(zips, t.trace(d(B.z_pit + 3.5), d(B.z_pit + 1.5), az(sx * 16), az(sx * 34), 12), 1.3, 0.3, sink=0.3)
    slant = t.trace(d(B.waist_z + 12.0), d(B.waist_z + 5.0), az(14), az(40), 24)
    band(zips, slant, 1.5, 0.3, sink=0.3)
    band(teeth, slant[1:-1], 0.45, 0.2, lift=0.3, sink=0.2, bevel=0.1)
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
    emit(zips, "Torso_ZipperTape", M["tape"], g, smooth=False)
    emit(teeth, "Torso_ZipperTeeth", M["steel"], g, smooth=False)
    emit(fit, "Torso_HoseFitting", M["aluminium"], g, sharp_angle=30)
    emit(hose, "Torso_Hoses", M["hose"], g)
    # The cord: one pale cord comes out at the collar's seam on his left and hangs loose down the left of the chest
    # toward the closure (the film still in the bus on 12 April; museum suits have it looped to the left pocket).
    # What it is was not found. A cord and not a lacing: there are no eyelets and nothing crosses.
    top, low = B.neck_z - 7.4, B.neck_z - 21.0  # (it ends inboard of the pocket, 21 cm under the neck: read off the still, estimated)
    # (of the way down, degrees to his left, centimetres off the cloth)
    run = [(0.0, 15.0, 0.25), (0.22, 17.5, 0.5), (0.5, 15.0, 0.6), (0.78, 10.5, 0.5), (1.0, 7.5, 0.4)]
    keys = [tuple(t.at(d(top + (low - top) * u), az(a)) + t.normal(d(top + (low - top) * u), az(a)) * off) for u, a, off in run]
    cpts = fl.polyline(keys, 0.6)
    cord = MeshBuilder()
    Tube(cpts, [(0.2, 0.2)] * len(cpts), resample=1).add(cord, 6)
    emit(cord, "Torso_Cord", M["cord"], g)
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
    emit(sleeves, "Arms_Sleeves", M["cover"], g)
    if not WEARER.mirror:
        return
    # the mirror sewn on the right sleeve, for what he cannot see directly: a round glass in a cloth patch on the back of the forearm
    t = tubes[-1]
    dm = t.length - 10.6
    th = t.toward((-0.8, -0.6, 0.1), dm)
    t.patch(patch, dm - 3.0, dm + 3.0, th - 0.62, th + 0.62, 0.3, nd=8, nt=8)
    m = frame(t.at(dm, th, 0.0), t.normal(dm, th))
    steel.lathe([(2.5, 0.0), (2.5, 0.8), (2.2, 1.0), (2.05, 1.0), (2.05, 0.6)], 28, matrix=m)
    glass.lathe([(2.1, 0.75), (0.0, 0.75)], 28, matrix=m)
    emit(patch, "Arms_MirrorPatch", M["cover"], g)
    emit(steel, "Arms_MirrorRim", M["steel"], g, sharp_angle=30)
    emit(glass, "Arms_Mirror", M["mirror"], g)


# -------------------------------------------------------------------------- gloves


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, rings, leather = MeshBuilder(), MeshBuilder(), MeshBuilder()
    fingers: list[float] = []
    for sx in (1, -1):
        hand, palm = fl.gloved_hand(shell, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
        # the palm is faced with leather
        first = len(leather.verts)
        th = palm.toward(-hand.B, 13.0)
        palm.patch(leather, 10.0, palm.length - 1.8, th - 1.1, th + 1.1, 0.4, nd=8, nt=10, sink=0.3)
        fl.fitted(leather, first, hand)
        # the metal ring each glove locks to the sleeve by
        first = len(rings.verts)
        band(rings, ring(palm, 0.6, 32), 2.3, 0.55, sink=0.5, bevel=0.3, closed=True)
        fl.fitted(rings, first, hand)
    shell.share = fingers
    emit(shell, "Gloves_Shell", M.get("glove", M["cover"]), g)
    emit(rings, "Gloves_WristRings", M["aluminium"], g, sharp_angle=30)
    emit(leather, "Gloves_Palms", M["palm"], g)


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
        Folds(t.key_d(7) - 5.0, t.key_d(7) + 2.0, 5, 0.5, 0.3 * sx, spread=3.0),  # bloused over the boot
    ]
    return t


def build_legs(M: dict, torso: Tube) -> None:
    g = group("Legs")
    legs, pockets, flaps, snaps = (MeshBuilder() for _ in range(4))
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    zips, teeth = MeshBuilder(), MeshBuilder()
    front = -TAU / 4
    # (seated, that length of the zip is folded into the lap and is left out)
    if not fl.rig().posed():
        line = torso.trace(B.waist_z - 2.2 - B.torso_z0, B.pelvis_top + 2.0 - B.torso_z0, front, front, 30)
        band(zips, line, 1.5, 0.5, sink=0.2)
        band(teeth, line[1:-1], 0.45, 0.2, lift=0.5, sink=0.2, bevel=0.1)
    for sx in (1, -1):
        t = tubes[sx]
        # a bellows pocket on the front of each thigh, under a flap held by two snaps
        d0 = t.key_d(2) + 9.0
        th = t.toward((sx * 0.45, -1, 0), d0)
        t.patch(pockets, d0 + 3.6, d0 + 17.0, th - 0.74, th + 0.74, 0.7, nd=10, nt=10)
        t.patch(flaps, d0, d0 + 6.0, th - 0.8, th + 0.8, 1.05, nd=5, nt=10)
        if srlib.DETAIL >= 0.5:
            for s in (-0.5, 0.5):
                snaps.disc(t.at(d0 + 4.8, th + s, 0.95), t.normal(d0 + 4.8, th + s), 0.5, 0.3, 10)

    emit(legs, "Legs_Trousers", M["cover"], g, sharp_angle=None)
    emit(pockets, "Legs_Pockets", M["cover"], g)
    emit(flaps, "Legs_PocketFlaps", M["cover"], g)
    if zips.verts:
        emit(zips, "Legs_ZipperTape", M["tape"], g, smooth=False)
        emit(teeth, "Legs_ZipperTeeth", M["steel"], g, smooth=False)
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


# ------------------------------------------------------------- in the ejection seat

# The pose the Vostok seat holds him in, as joint angles in degrees: taken from the seat as
# vehicles/vostok_3ka.py lays it out (thighs raised 60 degrees from the line of the back, shins
# hanging to the foot board), not from a drawing of the seat.
SEATED = {
    "hip": 60.0,
    "knee": 79.0,
    "ankle": 12.0,
    "knees_in": 0.0,
    "pelvis": 24.0,
    "elbow": 46.0,
    "elbow_toe_in": 24.0,
    "pronate": 30.0,
    "grip": 0.0,
}
LAP = (-3.0, 12.0, 1.2)  # where a thigh pressed against the belly stops: figurelib.seated_rig


def seated_rig() -> Rig:
    fl.use(B)
    return fl.seated_rig(SEATED, LAP)


def seated_points() -> dict[str, list[Vector]]:
    """Every vertex of the seated figure by mesh, in seat-frame centimetres, without building anything."""
    return fl.posed_points(_seated_points, seated_rig, build_figure)


def seated_key_points() -> dict:
    """Where the seat has to be: key points of the seated figure in seat-frame centimetres."""
    rig, pts = seated_rig(), seated_points()
    helmet = [p for name, ps in pts.items() if name.startswith("Helmet_Shell") for p in ps]
    centre = rig.carry(HELMET_AT)
    sides_ = (("left", 1), ("right", -1))
    return {
        **fl.body_key_points(rig, pts),
        "head_top": tuple(rig.carry(HELMET_AT + UP * HELMET_R)),
        "helmet_centre": tuple(centre),
        "helmet_radius": max((p - centre).length for p in helmet),
        "helmet_back_z": min(p.z for p in helmet),
        "collar": tuple(rig.carry((0, HELMET_AT.y, HELMET_RIM))),
        "heels": {side: tuple(rig.carry((sx * B.stance, 8.2 * BOOT_SIZE, 0.0), "leg")) for side, sx in sides_},
        "toes": {side: tuple(rig.carry((sx * B.stance, -23.0 * BOOT_SIZE, 1.8 * BOOT_SIZE), "leg")) for side, sx in sides_},
        "sole_y": max(p.y for p in pts["Boots_Soles"]),
    }


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str = "Pilot") -> dict:
    """The same figure in the ejection seat's pose, visor down, for a cabin: every mesh a child of
    `parent`, named `<prefix>_<Node>_<Mesh>`, with no skeleton.

    The seat frame is figurelib's, centimetres: origin midway between the hip joints, the torso
    along -Y (head toward -Y), the chest facing +Z, his right hand toward +X. `place` maps that
    frame, once it is in metres, into the caller's space; it is baked into the vertices. (The
    Vostok seat's own frame, vehicles/vostok_3ka.py `seat_frame`, has +Y toward his head and +X
    to his left and is in millimetres: `place = S @ Matrix.Diagonal((-1, -1, 1, 1))` with S its
    frame in metres.) Returns seated_key_points(). Nothing is built below the detail at which
    interiors are shown."""
    keys = seated_key_points()
    if srlib.interior():
        fl.build_posed(parent, place, prefix, seated_rig, build_figure)
    return keys
