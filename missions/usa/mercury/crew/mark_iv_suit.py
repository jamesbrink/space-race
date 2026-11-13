"""The Mercury pressure suit: B.F. Goodrich's Navy Mark IV, as Alan Shepard wore it to the pad for
Mercury-Redstone 3, with the portable ventilator that kept him cool on the way, and as Virgil Grissom
wore it for Mercury-Redstone 4.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure
faces -Y, so his left is +X. See ./mark-iv-suit.md: the pilot's stature is the only published
length here. The body under the suit follows standard segment proportions for that stature;
everything about the suit itself (bulk, helmet, fittings, where the zipper runs) is read off
photographs and is an estimate. On the right chest are the NASA insignia and his name tag, as
photographed that day; there is no mission patch, because Mercury flights had none.

One module, and the flight says whose suit it builds and of which day: a `Fit` (MR_3, MR_4), given to build()
or build_seated(), or set with wear(). Until told, it is MR-3's: gloves zipped to the sleeves, no ring at the wrist.
MR_4 is Grissom's on 21 July 1961: his stature and his legs' measured girths, quick-removal wrist rings, the
parachute harness and the chest mirror hung on it, two microphones, the helmet's lead, the neck dam, the port on the
thigh, the white ventilator (mark-iv-suit.md, "5 May and 21 July 1961", has each with its source). Every literal
height below is written for Shepard (REF) and carried to the wearer by up(); with MR_3 the build is, to the byte,
what it was before there was a second fit.

Top-level nodes: Helmet  Torso  Arms  Gloves  Legs  Boots  Ventilator  Skeleton; with MR_4 also Harness  Mirror

The standing figure is skinned to Skeleton, the joints every crew figure has (srlib.FIGURE), so
the viewer can walk him; the ventilator is not, and stays where it stands.

build() is the standing figure. build_seated() is the same man on the couch, for a cabin: the
figure is always modelled standing and carried to a pose by its joints (Rig, Bend).
"""

from __future__ import annotations

import math
import os
from collections.abc import Callable, Sequence
from dataclasses import dataclass

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import figurelib as fl
import srlib
from figurelib import (
    FRONT,
    Folds,
    Rig,
    Trousers,
    Tube,
    azimuth,
    band,
    buckle,
    build_head,
    build_shell,
    emit,
    gauss,
    grain,
    group,
    lacing,
    polyline,
    ring,
    sides,
    skin,
    smooth,
    squareness,
)
from srlib import CM, TAU, MeshBuilder, arc_profile, frame, material, text_mesh

# The man the suit's heights are written for: Alan Shepard. His stature is the only published length;
# the body under the suit follows standard segment proportions for it, and the sections of trunk, arms
# and legs are figurelib's man of that height in a close suit, sized by eye from photographs of this one.
REF = fl.man(stature=180.3, heel=2.8)
SHOULDER_LINE = 146.0  # on him: the torso's broadest section. Up to here another man's heights go by his stature
NECK = 157.0  # on him: the neck joint, in the neck ring. From here up everything is the helmet's, which goes with the head


@dataclass(frozen=True)
class Fit:
    """A suit as one man wore it on one day: who he was, and what that day's suit had. The caller chooses (`wear`)."""

    flight: str
    name: str  # stamped on the name tag
    stature: float  # centimetres
    breadth: float = 1.0  # his joints' distances from the midline, beside REF's
    girth: float = 1.0  # the sections of his trunk and limbs, beside REF's
    thigh: float | None = None  # where his own are published: round the thigh at its largest, centimetres
    calf: float | None = None  # and round the calf
    insignia: tuple[float, float] = (147.5, -24.0)  # the insignia's centre: (height on REF, azimuth in degrees): 8 cm to the right of the middle
    insignia_under_ring: float | None = (
        None  # where a flight's photographs give it: its centre this far under the neck ring's lower edge, on the wearer
    )
    tie_down: tuple[float, float, float] = (156.0, 146.5, 139.5)  # the helmet tie-down strap: top, buckle, end (heights on REF)
    vent_size: tuple[float, float, float] = (16.0, 42.0, 30.0)  # ventilator case: width, length, height
    vent_port: float = 15.0  # the hose leaves its top this far forward of the middle
    # What a later flight's suit had (each is in mark-iv-suit.md, "5 May and 21 July 1961", with its source):
    wrist_rings: bool = False  # the gloves lock to bearing rings at the wrists; without them they zip to the sleeves
    harness: bool = False  # the personal parachute harness, worn over the suit, and the tie-down strap run on down to the crotch
    fork: bool = True  # the harness's leg straps and the tie-down's run to the fork: left off a figure in a couch, whose thighs lie on them
    mirror: bool = False  # the convex mirror on the chest
    microphones: int = 1  # in the helmet: one on a boom from the left ear, or one either side of the mouth
    lead: bool = False  # the helmet's communications lead, hanging on the right chest with its plug
    port: bool = False  # the biomedical connector on the right thigh as a round port in a reinforcing disc (without: under a flap)
    pale_gauge: bool = False  # the wrist gauge in a thick white bezel
    dark_palms: bool = False  # the gloves' palms faced in dark leather
    white_ventilator: bool = False  # the portable ventilator a white box with a panel on its end (without: the bare metal case)
    neck_dam: bool = False  # the rubber neck dam, rolled under the neck ring


# Mercury-Redstone 3, 5 May 1961: Alan Shepard. Gloves zipped to the sleeves, no wrist rings.
MR_3 = Fit("MR-3", "A. B. SHEPARD", 180.3)
# Mercury-Redstone 4, 21 July 1961: Virgil Grissom, as photographed at the pad that morning and on the two before.
MR_4 = Fit(
    "MR-4",
    "V. I. GRISSOM",
    170.2,  # 5 ft 7 in, as commonly given: no primary record of it was found
    thigh=21.0 * 2.54,  # the right; the left 20 3/4 in (Results of the Second U.S. Manned Suborbital Space Flight, p. 9)
    calf=15.875 * 2.54,  # both (the same)
    insignia=(147.5, -28.5),  # 9.3 cm to the right of the middle
    insignia_under_ring=11.0,
    vent_size=(21.0, 30.0, 20.0),
    vent_port=11.2,
    wrist_rings=True,
    harness=True,
    mirror=True,
    microphones=2,
    lead=True,
    port=True,
    pale_gauge=True,
    dark_palms=True,
    white_ventilator=True,
    neck_dam=True,
)
SUIT_SLACK = 2.0  # what figurelib's sections have over the body all round (figurelib.man)

FIT = MR_3
B = REF
STATURE = B.stature  # 5 ft 11 in
fl.use(B)

HELMET_OVER_CROWN = 6.0  # liner, shell and clearance above the top of the head
BOOT_TOP = 27.0
BOOT_LENGTH = 31.2  # sole, toe to heel
BOOT_SIZE = 1.0  # beside a boot for a man of 1.80 m
NECK_RING_R = 12.5
RING_LOW = 156.6  # the neck ring's lower edge
HELMET_RX = 13.0  # shell half-width
HELMET_MID = 175.0  # height of the shell's widest section
HELMET_TOP = B.z_crown + HELMET_OVER_CROWN
HELMET_RIM = 159.4  # the shell's lower edge, inside the neck ring
VENT_AT = (47.0, -5.0)  # its centre on the floor, at his left
# The biomedical port of MR-4, on the right thigh: how far above the knee its middle is, and the reinforcing disc
# round it as (radius, how far it stands off the thigh): two raised rings, its edge sunk through the cloth.
PORT_ABOVE_KNEE = 17.5
PORT_DISC = [(1.5, 0.55), (2.0, 0.3), (2.6, 0.3), (2.9, 0.42), (3.2, 0.3), (3.9, 0.3), (4.2, 0.42), (4.5, 0.3), (5.05, 0.3), (5.25, -0.3)]
# The wrist bearing ring of MR-4, on the glove's cuff: where its middle is down the cuff from the cuff's top, and its
# section as (radius, distance toward the hand): a locking collar either side of a raised band. Its ends go in through the cuff.
WRIST_RING_AT = 2.2
WRIST_RING = [
    (4.9, -1.8),
    (5.55, -1.8),
    (5.55, -1.05),
    (5.35, -0.95),
    (5.35, -0.5),
    (5.8, -0.4),
    (5.8, 0.4),
    (5.35, 0.5),
    (5.35, 0.95),
    (5.55, 1.05),
    (5.55, 1.8),
    (4.2, 1.8),
]


def carried(body: fl.Body, z: float) -> float:
    """A height written for REF, on another man. Up to the shoulder line it goes by his stature, as figurelib
    carries a body (Body.scaled). From the neck up it is the helmet's and the neck ring's, hardware that is the same
    size on any man and sits where his head does: it comes down with his crown. Between the two the slope of the
    shoulders takes up the difference: the skull is not scaled, so a shorter man has the shorter neck."""
    low = lambda h: body.heel + (h - REF.heel) * (body.stature / REF.stature)  # noqa: E731
    if z <= SHOULDER_LINE:
        return low(z)
    drop = body.z_crown - REF.z_crown
    if z >= NECK:
        return z + drop
    return low(SHOULDER_LINE) + (NECK + drop - low(SHOULDER_LINE)) * (z - SHOULDER_LINE) / (NECK - SHOULDER_LINE)


def up(z: float) -> float:
    """A height written for REF (every literal height in this module is), on whoever wears the suit."""
    return z if B is REF else carried(B, z)


def body(fit: Fit) -> fl.Body:
    """The man in the suit: REF himself, or REF carried to another stature (boots and hands by the same ratio)."""
    if fit.stature == REF.stature:
        return REF
    b = REF.scaled(stature=fit.stature, heel=REF.heel * fit.stature / REF.stature, breadth=fit.breadth, girth=fit.girth)
    b.torso = [(carried(b, z), a * fit.girth, c * fit.girth) for z, a, c in REF.torso]
    b.neck_z, b.z_yoke = carried(b, REF.neck_z), carried(b, REF.z_yoke)
    # his legs to his own measures, where they are published: each section's body (what is under the suit's slack)
    # is brought to the girth measured, the thigh's from the hip down to above the knee, the calf's at the calf
    grow = [1.0] * len(b.leg)
    if fit.thigh:
        k = fit.thigh / around(*b.leg[2][3:])
        grow[:5] = [k, k, k, k, (k + 1) / 2]
    if fit.calf:
        grow[b.knee_at + 1] = fit.calf / around(*b.leg[b.knee_at + 1][3:])
    b.leg = [(x, y, z, (a - SUIT_SLACK) * k + SUIT_SLACK, (c - SUIT_SLACK) * k + SUIT_SLACK) for (x, y, z, a, c), k in zip(b.leg, grow)]
    return b


def around(a: float, c: float) -> float:
    """How far it is round the body inside a section of the suit whose half-width and half-depth these are (Ramanujan's ellipse)."""
    a, c = a - SUIT_SLACK, c - SUIT_SLACK
    return math.pi * (3 * (a + c) - math.sqrt((3 * a + c) * (a + 3 * c)))


def wear(fit: Fit) -> None:
    """Whose suit is built from here on, and as of which flight. A flight's script says (build(fit) does it for the
    standing figure, build_seated(..., fit) for the one on the couch); until then the suit is MR-3's."""
    global FIT, B, STATURE, NAME, BOOT_SIZE, HELMET_MID, HELMET_TOP, HELMET_RIM
    FIT, B = fit, body(fit)
    STATURE, NAME = B.stature, fit.name
    BOOT_SIZE = B.stature / REF.stature
    HELMET_MID, HELMET_TOP, HELMET_RIM = up(175.0), B.z_crown + HELMET_OVER_CROWN, up(159.4)
    fl.use(B)
    _seated_points.clear()


def materials() -> dict:
    def m(name: str, *args, image: Callable[[], bpy.types.Image] | None = None) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        # one of each in a file: the seated figure shares the standing one's, and the caller's
        return bpy.data.materials.get(name) or material(name, *args, image=image() if image else None)

    later = {}
    if FIT.harness:
        # (dark in every photograph of July 1961, all black and white: the colour is not established)
        # (the harness's colours are the colour photograph S64-36915's: olive-brown webbing, slate-blue quilted pads)
        later["harness"] = m("harness-webbing-olive", (0.062, 0.05, 0.028), 0.0, 0.9)
        later["pad"] = m("harness-pad-slate", (0.05, 0.075, 0.115), 0.0, 0.85)
        later["tiedown"] = m("webbing-cream", (0.80, 0.77, 0.68), 0.0, 0.85)  # cream in the colour photograph S88-55875
        later["nametape"] = m("name-tape-white", (1, 1, 1), 0.0, 0.8, image=name_tape_image)
    if FIT.mirror:
        later["mirror"] = m("mirror-polished", (0.86, 0.87, 0.88), 1.0, 0.04)
    if FIT.pale_gauge:
        later["bezel"] = m("rubber-white", (0.86, 0.85, 0.80), 0.0, 0.7)
    if FIT.dark_palms:
        later["palm"] = m("glove-palm-leather-dark", (0.03, 0.03, 0.03), 0.0, 0.65)
    if FIT.lead:
        later["lead"] = m("lead-white", (0.84, 0.83, 0.78), 0.0, 0.6)
    if FIT.neck_dam:
        later["dam"] = m("rubber-neck-dam", (0.50, 0.17, 0.06), 0.0, 0.8)  # orange in S64-36909, red-brown on the suit as kept
    return {
        **later,
        "suit": m("suit-aluminized-nylon", (0.66, 0.67, 0.69), 0.6, 0.6),
        "webbing": m("webbing-nylon", (0.40, 0.41, 0.40), 0.2, 0.75),
        "tape": m("zipper-tape", (0.10, 0.10, 0.11), 0.0, 0.8),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "shell": m("helmet-fibreglass-white", (0.86, 0.86, 0.83), 0.0, 0.28),
        # named glass: the viewer makes it a clear pane, as the Plexiglas visor was
        "glass": m("glass-visor", (0.02, 0.03, 0.04), 0.0, 0.04),
        "liner": m("helmet-liner", (0.06, 0.06, 0.06), 0.0, 0.9),
        "skin": m("skin", (0.62, 0.42, 0.33), 0.0, 0.65),
        "eye": m("eye-white", (0.80, 0.79, 0.75), 0.0, 0.35),
        "hair": m("hair-brown", (0.10, 0.07, 0.05), 0.0, 0.8),
        "lip": m("skin-lip", (0.50, 0.29, 0.25), 0.0, 0.55),
        "cap": m("cap-fabric", (0.82, 0.82, 0.78), 0.0, 0.9),
        "rubber": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "boot": m("boot-leather-aluminized", (0.55, 0.56, 0.57), 0.6, 0.5),
        "lace": m("lace-cord", (0.70, 0.69, 0.64), 0.0, 0.85),
        "gauge": m("gauge-face", (0.02, 0.02, 0.02), 0.0, 0.25),
        "white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6),
        "hose": m("hose-rubber", (0.05, 0.05, 0.055), 0.0, 0.6),
        # sewn-on cloth and leather: the colours are in the images
        "insignia": m("patch-nasa-insignia", (1, 1, 1), 0.0, 0.85, image=insignia_image),
        "nametag": m("name-tag-leather", (1, 1, 1), 0.0, 0.6, image=name_tag_image),
    }


# -------------------------------------------------------------------------- helmet


def helmet_r(z: float) -> float:
    if z >= HELMET_MID:
        u = min(1.0, (z - HELMET_MID) / (HELMET_TOP - HELMET_MID))
        return HELMET_RX * max(0.0, 1 - u**2.4) ** (1 / 2.4)
    # the lower half is an ellipse cut off where it meets the neck ring
    return HELMET_RX * math.sqrt(1 - ((HELMET_MID - z) / 31.5) ** 2)


def helmet_point(phi: float, z: float) -> Vector:
    """The shell: phi is azimuth from straight ahead toward his left. Round at the neck ring,
    deeper than wide and set forward where the head is."""
    k = smooth(z, up(160.0), up(172.0))
    r = helmet_r(z)
    return Vector((r * math.sin(phi), -0.6 - 0.8 * k - r * (1 + 0.12 * k) * math.cos(phi), z))


def helmet_normal(phi: float, z: float) -> Vector:
    a = helmet_point(phi + 0.02, z) - helmet_point(phi - 0.02, z)
    b = helmet_point(phi, z + 0.2) - helmet_point(phi, z - 0.2)
    return a.cross(b).normalized()


def helmet_at(phi: float, z: float, off: float = 0.0) -> Vector:
    return helmet_point(phi, z) + helmet_normal(phi, z) * off


def NOD_AT(head: Vector) -> Vector:  # noqa: N802
    """What a bowed head turns about: the top of the neck, under the middle of the skull (rest pose, centimetres)."""
    return Vector((0.0, head.y + 1.5, head.z - 6.0))


def build_helmet(M: dict) -> None:
    g = _nodes["Helmet"] = group("Helmet")
    shell, visor, ringm, fit, port = (MeshBuilder() for _ in range(5))
    centre = Vector((0, -1.4, HELMET_MID))

    zs = [HELMET_RIM + (HELMET_MID - HELMET_RIM) * i / 12 for i in range(12)]
    zs += [HELMET_MID + (HELMET_TOP - HELMET_MID) * math.sin(math.radians(a)) for a in range(0, 90, 6)]
    zs.append(HELMET_TOP - 0.02)
    phis = [TAU * i / 56 for i in range(56)]
    rows = [[helmet_point(p, z) for p in phis] for z in zs]
    rows.append([helmet_point(0, HELMET_TOP - 0.02) * 1.0 for _ in phis])
    apex = sum(rows[-2], Vector()) / len(phis)
    rows[-1] = [Vector((apex.x, apex.y, HELMET_TOP)) for _ in phis]
    # visor: a rounded opening from brow to chin, the Plexiglas riding outside the shell
    half_phi, zv, hv = math.radians(56), up(173.0), 8.8

    def solid(j: int, i: int) -> bool:
        """Whether the shell is there: not where the visor's opening is (a little inside its frame)."""
        if j + 1 >= len(zs):
            return True
        phi = (phis[i] + TAU / 112 + math.pi) % TAU - math.pi
        u, v = abs(phi / half_phi), abs(((zs[j] + zs[j + 1]) / 2 - zv) / hv)
        return (u**3.2 + v**3.2) ** (1 / 3.2) > 0.88

    skin(shell, rows, centre, closed=True, keep=solid)
    # the padded liner, seen through the visor: without it the shell has no inside
    liner = MeshBuilder()
    skin(liner, [[centre + (p - centre) * 0.94 for p in row] for row in rows], centre, closed=True, inward=True, keep=solid)

    # the pivots' bosses at the temples: flat discs
    for sx in (1, -1):
        phi = sx * math.radians(100)
        shell.lathe(
            [(2.6, 0.0), (2.6, 0.7), (2.2, 1.0), (0.0, 1.0)], 24, matrix=frame(helmet_at(phi, up(171.5), -0.5), helmet_normal(phi, up(171.5)))
        )

    # the man inside: a face for the visor to have behind it. Nobody's likeness.
    head, cap, dark, eyes, hair, lips = (MeshBuilder() for _ in range(6))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    skull = len(head.verts)
    head.tube((0, 1.0, up(150.0)), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    # the white communications cap: a bowl over the crown and the back of the head, standing
    # off the scalp all round so that the two never meet at any level of detail
    bowl = Matrix.Diagonal((8.2, 10.3, 11.8, 1.0)) @ Matrix.Rotation(math.radians(-50), 4, "X")
    cap.lathe(arc_profile(0, 0, 1.0, -15, 90, 14), 40, matrix=Matrix.Translation(hc) @ bowl)
    if FIT.microphones == 1:
        # lip microphone on its boom from the left ear
        dark.tube((7.4, hc.y - 2.0, hc.z - 4.0), (2.2, hc.y - 10.6, hc.z - 6.0), 0.3, 8)
        dark.box((1.8, 1.0, 1.2), Matrix.Translation((1.4, hc.y - 10.8, hc.z - 6.0)))
    else:
        # a microphone either side of the mouth, each on a boom from under its ear (MR-4: S61-02845, 61-MR4-76)
        for sx in (1, -1):
            at = Vector((sx * 3.5, hc.y - 10.3, hc.z - 5.6))
            dark.tube((sx * 7.4, hc.y - 2.0, hc.z - 4.6), at + Vector((sx * 0.9, 0.3, 0.0)), 0.3, 8)
            dark.box((2.4, 1.2, 1.5), Matrix.Translation(at) @ Matrix.Rotation(math.radians(-sx * 28), 4, "Z"))
    # Posed, the head can be bowed inside the helmet (`head`, degrees: chin toward the chest), about the top of the
    # neck. The helmet is fixed to the suit and does not move: only the head, its cap and microphone do.
    nod = math.radians(fl.rig().angles.get("head", 0.0))
    if nod:
        turn = Matrix.Translation(NOD_AT(hc)) @ Matrix.Rotation(nod, 4, "X") @ Matrix.Translation(-NOD_AT(hc))
        head.verts[:skull] = [tuple(turn @ Vector(v)) for v in head.verts[:skull]]
        for mb in (cap, dark, eyes, hair, lips):
            mb.verts = [tuple(turn @ Vector(v)) for v in mb.verts]

    def edge(psi: float, rho: float = 1.0) -> tuple[float, float]:
        f = rho * (1 + squareness(psi, 3.2))
        return half_phi * f * math.cos(psi), zv + hv * f * math.sin(psi)

    psis = [TAU * i / 56 - TAU / 4 for i in range(56)]
    rows = [[helmet_at(*edge(psi, rho), 0.3 + 0.5 * (1 - rho * rho)) for psi in psis] for rho in (0.0, 0.2, 0.4, 0.6, 0.8, 0.93, 1.0)]
    rows.append([helmet_at(*edge(psi), -0.4) for psi in psis])
    skin(visor, rows, centre, closed=True)
    # the visor's seal: a dark band on the shell inside the frame, which is also where the opening's edge is
    seal = MeshBuilder()
    skin(seal, [[helmet_at(*edge(psi, rho), 0.15) for psi in psis] for rho in (0.72, 0.82, 0.92, 1.0)], centre, closed=True)
    rim = [helmet_at(*edge(psi), 0.2) for psi in psis]
    frame_mb = MeshBuilder()
    Tube([*rim, rim[0]], [(0.6, 0.6)] * (len(rim) + 1), resample=2).add(frame_mb, 10)
    for sx in (1, -1):  # the visor's pivots at the temples
        phi = sx * math.radians(67)
        fit.disc(helmet_at(phi, zv, -0.2), helmet_normal(phi, zv), 1.3, 0.9, 20)

    # neck ring: the helmet locks to it; the suit's neck is bonded underneath
    ringm.lathe(
        [
            (9.8, up(RING_LOW)),
            (12.2, up(RING_LOW)),
            (NECK_RING_R, up(157.0)),
            (NECK_RING_R, up(158.1)),
            (12.1, up(158.3)),
            (12.1, up(158.7)),
            (NECK_RING_R, up(158.9)),
            (NECK_RING_R, up(159.9)),
            (12.1, up(160.3)),
            (10.8, up(160.3)),
        ],
        64,
        matrix=Matrix.Translation((0, -0.6, 0)),
    )

    # suit outlet, low on the right: exhaled oxygen leaves here when the visor is shut
    phi = math.radians(-112)
    m = frame(helmet_at(phi, up(166.0), -0.5), helmet_normal(phi, up(166.0)))
    fit.lathe([(2.0, 0.0), (2.0, 1.5), (1.65, 1.7), (1.65, 3.1), (1.25, 3.1)], 24, matrix=m)
    port.lathe([(1.3, 2.7), (0.0, 2.7)], 24, matrix=m)
    # visor seal connector by the left jaw
    phi = math.radians(47)
    m = frame(helmet_at(phi, up(163.2), -0.3), helmet_normal(phi, up(163.2)))
    fit.lathe([(0.75, 0.0), (0.75, 1.1), (0.42, 1.1), (0.42, 2.0), (0.0, 2.0)], 12, matrix=m)

    emit(shell, "Helmet_Shell", M["shell"], g)
    emit(liner, "Helmet_Liner", M["liner"], g)
    emit(head, "Helmet_Head", M["skin"], g)
    emit(cap, "Helmet_CommCap", M["cap"], g)
    emit(dark, "Helmet_FaceDetail", M["rubber"], g, sharp_angle=30)
    if eyes.verts:
        emit(eyes, "Helmet_Eyes", M["eye"], g)
    if hair.verts:
        emit(hair, "Helmet_Brows", M["hair"], g)
        emit(lips, "Helmet_Lips", M["lip"], g)
    emit(visor, "Helmet_Visor", M["glass"], g)
    emit(seal, "Helmet_VisorSeal", M["rubber"], g)
    emit(frame_mb, "Helmet_VisorFrame", M["aluminium"], g)
    emit(ringm, "Helmet_NeckRing", M["aluminium"], g, sharp_angle=30)
    emit(fit, "Helmet_Fittings", M["aluminium"], g, sharp_angle=30)
    emit(port, "Helmet_OutletBore", M["rubber"], g)


ZIP = ((150.0, 30.0), (107.5, -56.0))  # entry zipper: (height, azimuth in degrees), collar to waist
INLET = (111.0, 38.0)  # ventilation inlet at the left waist


def zip_ends() -> tuple[tuple[float, float], tuple[float, float]]:
    """The entry zipper's two ends on the wearer: (height, azimuth in degrees)."""
    (z0, a0), (z1, a1) = ZIP
    return (up(z0), a0), (up(z1), a1)


def torso_tube() -> Tube:
    t = Tube([(0, 0, z) for z, _, _ in B.torso], [(a, b) for _, a, b in B.torso], resample=10)

    def fold(d: float, th: float) -> float:
        z = B.torso_z0 + d
        front, back = max(0.0, -math.sin(th)), max(0.0, math.sin(th))
        f = squareness(th, 2.5) * (1 - smooth(z, up(148.0), up(156.0)))
        f += 0.05 * back * back * gauss(z, up(94), 7)  # seat
        f += 0.035 * front * gauss(z, up(134), 9)  # chest
        f -= 0.04 * back * gauss(z, up(112), 8)  # small of the back
        f += 0.04 * back * gauss(z, up(138), 9)  # shoulder blades
        f -= 0.03 * front * gauss(z, up(114), 6)  # the cloth falls in under the chest: the suit is not inflated
        return f

    def flat(d: float, th: float) -> float:
        """0 where a fitting lies and the cloth has to stay smooth under it, 1 in the open."""
        z, a = B.torso_z0 + d, azimuth(th)
        (z0, a0), (z1, a1) = zip_ends()
        on_zip = abs(a - (a0 + (a1 - a0) * (z - z0) / (z1 - z0))) * 0.3 if z1 - 2 < z < z0 + 2 else 99.0  # about 0.3 cm a degree
        keep = smooth(on_zip, 2.4, 4.5)
        keep *= smooth(math.hypot(z - up(INLET[0]), (a - INLET[1]) * 0.3), 4.0, 6.5)
        if FIT.harness:
            keep *= tight(z, a)
        return keep

    t.fold = fold
    # creases stop short of the straps, the zipper and the inlet
    t.relief = [
        Folds(up(106.0) - B.torso_z0, up(118.5) - B.torso_z0, 6, 0.46, 0.5, spread=3.0, mask=flat),
        Folds(up(121.5) - B.torso_z0, up(129.0) - B.torso_z0, 4, 0.36, 3.1, -TAU / 4, spread=1.5, width=0.7, mask=flat),  # slack under the chest
    ]
    return t


def build_torso(M: dict) -> tuple[Vector, Vector, dict[int, Tube], Tube]:
    """Returns the waist inlet's mouth and axis, for the ventilator hose, the arms' tubes and the torso's own."""
    g = _nodes["Torso"] = group("Torso")
    shell, tape, teeth, web, steel, inlet, patch, tag = (MeshBuilder() for _ in range(8))
    t = torso_tube()
    build_insignia(t, patch, tag)
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    if FIT.harness:
        # (under the harness the armpits' folds are pressed flat, as the trunk's own creases are: torso_tube's `flat`)
        build_shell(shell, t, arms, lambda p: tight(p.z, azimuth_of(t, p)))
        _cloth.add(shell, shell.share)
    else:
        build_shell(shell, t, arms)

    def az(deg: float) -> float:  # azimuth from straight ahead toward his left -> theta
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - B.torso_z0

    # entry zipper, left collar to right waist
    (z0, a0), (z1, a1) = zip_ends()
    zip_line = t.trace(d(z0), d(z1), az(a0), az(a1), 150)
    band(tape, zip_line, 2.4, 0.35, sink=0.4)
    band(teeth, zip_line[2:-2], 0.5, 0.2, lift=0.35, sink=0.2, bevel=0.1)
    p, nm = zip_line[5]
    teeth.box((0.9, 1.8, 0.8), frame(p + nm * 0.5, nm) @ Matrix.Rotation(math.radians(35), 4, "Z"))

    # helmet tie-down: stops the helmet rising when the suit is pressurised
    if FIT.harness:
        # (MR-4's is laid with the harness it runs under, once the trousers it ends on are built: build_worn)
        _cloth.under += [(p, 1.2, 0.55, "zipper") for p, _ in zip_line[::3]]
        _cloth.under += [(p, 1.3, 0.4, "waist") for p, _ in ring(t, d(B.waist_z), 72)]
    else:
        top, clasp, end = (up(z) for z in FIT.tie_down)
        band(web, t.trace(d(top), d(end), az(0), az(0), 24), 2.2, 0.25)
        p, nm = t.at(d(clasp), az(0)), t.normal(d(clasp), az(0))
        buckle(steel, web, p, nm, (2.4, 3.6), spin=TAU / 4)

    # waist strap: it lies over the line where the shell ends and the trousers begin
    band(web, ring(t, d(B.waist_z), 72), 2.6, 0.4, closed=True)
    p, nm = t.at(d(B.waist_z), az(-14)), t.normal(d(B.waist_z), az(-14))
    buckle(steel, web, p + nm * 0.3, nm, (3.4, 3.8))

    # ventilation inlet at the left waist
    th = az(INLET[1])
    p, nm = t.at(d(up(INLET[0])), th), t.normal(d(up(INLET[0])), th)
    axis = (nm + Vector((0.25, -0.1, -0.45))).normalized()
    m = frame(p - axis * 0.9, axis)
    inlet.lathe([(3.0, 0.0), (3.0, 1.2), (2.2, 1.4), (2.2, 3.4), (2.5, 3.4), (2.5, 4.3), (1.45, 4.3)], 28, matrix=m)

    if FIT.neck_dam and srlib.DETAIL >= 0.5:
        # MR-4: the neck dam in its stored position, a roll of rubber round the suit's neck under the helmet's ring
        # (Results of the Second U.S. Manned Suborbital Space Flight, Figure 7-6 (a))
        dam = MeshBuilder()
        dam.lathe(
            [(10.7 + 0.55 * math.cos(math.radians(a)), up(RING_LOW) - 0.45 + 0.55 * math.sin(math.radians(a))) for a in range(-90, 271, 30)],
            48,
            matrix=Matrix.Translation((0, -0.6, 0)),
        )
        emit(dam, "Torso_NeckDam", M["dam"], g)
    emit(shell, "Torso_Shell", M["suit"], g, sharp_angle=None)
    emit(tape, "Torso_ZipperTape", M["tape"], g, smooth=False)
    emit(teeth, "Torso_ZipperTeeth", M["steel"], g, smooth=False)
    emit(web, "Torso_Straps", M["webbing"], g, smooth=False)
    emit(steel, "Torso_Buckles", M["steel"], g, smooth=False)
    emit(inlet, "Torso_InletFitting", M["aluminium"], g, sharp_angle=30)
    emit(patch, "Torso_Insignia", M["insignia"], g, sharp_angle=None)
    emit(tag, "Torso_NameTag", M["nametag"], g, sharp_angle=None)
    return p + axis * 2.6, axis, arms, t


# ------------------------------------------------------------------------ insignia

# What was sewn to the right chest on 5 May 1961: the NASA insignia of 1959 and, under it, a
# leather name tag. There was no mission patch; the first of those flew on Gemini 5.
INSIGNIA_R = 3.81  # a 3 in patch
INSIGNIA_TIPS = ((42.0, 1.2), (225.0, 1.2))  # the red vector's two points, which stand out past the disc: (degrees from his left, radii)
INSIGNIA_ART = 1.3  # its image covers this many radii either side of the centre
NAME_TAG = (11.5, 2.5)  # width, height
NAME_TAG_DROP = 5.6  # its centre below the insignia's
PATCH_LIFT = 0.18  # how far a sewn patch stands off the cloth; its edge goes down through it


class Art:
    """A picture drawn in flat colours, in its own units with +Y up, twice as fine as it is kept."""

    def __init__(self, name: str, w: int, h: int, half_width: float, colour: Sequence[float]) -> None:
        self.name, self.w, self.h = name, w, h
        self.px = np.empty((2 * h, 2 * w, 4), dtype=np.float32)
        self.px[..., :3], self.px[..., 3] = colour, 1.0
        step = half_width / w  # image row 0 is the bottom
        self.yy, self.xx = np.mgrid[0 : 2 * h, 0 : 2 * w].astype(np.float32)
        self.xx = (self.xx + 0.5 - w) * step
        self.yy = (self.yy + 0.5 - h) * step

    def where(self, mask: np.ndarray, colour: Sequence[float]) -> None:
        self.px[mask, :3] = colour

    def triangle(self, a: Sequence[float], b: Sequence[float], c: Sequence[float], colour: Sequence[float]) -> None:
        def side(p: Sequence[float], q: Sequence[float]) -> np.ndarray:
            return (q[0] - p[0]) * (self.yy - p[1]) - (q[1] - p[1]) * (self.xx - p[0])

        s = [side(a, b), side(b, c), side(c, a)]
        self.where((s[0] >= 0) & (s[1] >= 0) & (s[2] >= 0) | (s[0] <= 0) & (s[1] <= 0) & (s[2] <= 0), colour)

    def text(self, body: str, width: float, centre: Sequence[float], colour: Sequence[float], font: bpy.types.VectorFont | None) -> None:
        """Lettering `width` across, its middle at `centre`."""
        verts, faces = text_mesh(body, 1.0, font, cuts=0)
        xs, ys = [v[0] for v in verts], [v[1] for v in verts]
        k = width / (max(xs) - min(xs))
        ox, oy = centre[0] - k * (max(xs) + min(xs)) / 2, centre[1] - k * (max(ys) + min(ys)) / 2
        for f in faces:
            self.triangle(*((ox + k * verts[i][0], oy + k * verts[i][1]) for i in f), colour)

    def image(self) -> bpy.types.Image:
        img = bpy.data.images.new(self.name, self.w, self.h, alpha=False)
        img.pixels.foreach_set(self.px.reshape(self.h, 2, self.w, 2, 4).mean(axis=(1, 3)).ravel())
        img.file_format = "PNG"
        img.pack()
        return img


def font(*paths: str) -> bpy.types.VectorFont | None:
    """The first of these fonts this machine has; Blender's own if none."""
    for path in paths:
        if os.path.exists(path):
            return bpy.data.fonts.load(path, check_existing=True)
    return None


def insignia_image() -> bpy.types.Image:
    """The NASA insignia adopted in 1959, as an embroidered patch: a blue sphere, stars, an orbit,
    the red vector whose two points overhang the edge, and the letters. Units are the disc's radius."""
    blue, red, thread = (0.10, 0.16, 0.56), (0.78, 0.09, 0.15), (0.93, 0.91, 0.84)
    art = Art("nasa-insignia-1959", 512, 512, INSIGNIA_ART, thread)
    x, y = art.xx, art.yy
    art.where(x * x + y * y < 0.95**2, blue)  # a rim of thread is left round it
    for sx, sy, r in (
        (-0.52, 0.56, 0.035),
        (-0.22, 0.72, 0.028),
        (0.12, 0.66, 0.035),
        (-0.68, 0.30, 0.028),
        (0.50, -0.42, 0.035),
        (0.30, -0.62, 0.028),
        (0.66, -0.20, 0.028),
        (0.05, -0.74, 0.035),
        (-0.30, -0.56, 0.028),
        (0.44, -0.72, 0.022),
        (-0.50, -0.34, 0.022),
        (0.72, 0.28, 0.022),
    ):
        # four-pointed stars
        art.where((np.abs(x - sx) + 3.2 * np.abs(y - sy) < 2.6 * r) | (3.2 * np.abs(x - sx) + np.abs(y - sy) < 2.6 * r), thread)
    # the orbit: an ellipse tilted down to his left, about the letters
    c, s = math.cos(math.radians(-22)), math.sin(math.radians(-22))
    u, v = (x - 0.06) * c + (y + 0.04) * s, -(x - 0.06) * s + (y + 0.04) * c
    art.where(np.abs(np.sqrt((u / 0.80) ** 2 + (v / 0.36) ** 2) - 1) < 0.045, thread)
    # the vector: two slender wings from one point, thickest where they meet
    (a0, k0), (a1, k1) = INSIGNIA_TIPS
    apex = (k0 * math.cos(math.radians(a0)), k0 * math.sin(math.radians(a0)))
    low = (1.25 * k1 * math.cos(math.radians(a1)), 1.25 * k1 * math.sin(math.radians(a1)))  # still a stripe where the cloth ends
    high, crook = (-0.90, 0.24), (0.30, 0.20)
    art.triangle(apex, crook, low, red)
    art.triangle(apex, crook, high, red)
    art.text(
        "NASA",
        1.42,
        (0.0, 0.03),
        thread,
        font("/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
    )
    return art.image()


# Whose suit it is: the name stamped on the tag. A flight's script sets it before building (MR-4: Grissom's).
NAME = "A. B. SHEPARD"


def name_tag_image() -> bpy.types.Image:
    """Dark blue leather with the pilot's name stamped on it in silver. Units are half the tag's width."""
    w, h = NAME_TAG
    art = Art(f"name-tag-{NAME.split()[-1].lower()}", 512, round(512 * h / w), 1.0, (0.045, 0.06, 0.13))
    x, y = art.xx, art.yy
    art.where((np.abs(np.abs(x) - 0.965) < 0.006) | (np.abs(np.abs(y) - (h / w - 0.035)) < 0.006), (0.16, 0.18, 0.26))  # a line of stitching
    art.text(NAME, 1.36, (0.02, 0.0), (0.74, 0.75, 0.76), srlib.load_font())
    return art.image()


def lay(t: Tube, z: float, az: float) -> Callable[[float, float, float], Vector]:
    """Where a flat thing sewn to the torso at (height, azimuth) has each of its points: `a`
    centimetres toward his left measured round the cloth, `b` up, `off` proud of it."""
    d0, th0 = z - B.torso_z0, -TAU / 4 + math.radians(az)

    def at(a: float, b: float, off: float) -> Vector:
        d, th = d0 + b, th0
        for _ in range(8):  # round a section that is not a circle, an eighth of the way at a time
            th += a / 8 / ((t._skin(d, th + 0.01, False) - t._skin(d, th - 0.01, False)).length / 0.02)
        return t.at(d, th, off)

    return at


def insignia_at() -> tuple[float, float]:
    """The insignia's centre on the wearer: (height, azimuth in degrees)."""
    if FIT.insignia_under_ring is not None:
        return up(RING_LOW) - FIT.insignia_under_ring, FIT.insignia[1]
    return up(FIT.insignia[0]), FIT.insignia[1]


def build_insignia(t: Tube, patch: MeshBuilder, tag: MeshBuilder) -> None:
    z, az = insignia_at()

    # the insignia: a disc, drawn out to a point where each end of the vector overhangs it
    at, r = lay(t, z, az), INSIGNIA_R
    n = sides(40, 16)
    spokes = {TAU * k / n: 1.0 for k in range(n)}
    for deg, k in INSIGNIA_TIPS:
        phi, half = math.radians(deg), 0.14
        spokes = {a: v for a, v in spokes.items() if abs((a - phi + math.pi) % TAU - math.pi) > half * 1.05}
        spokes.update({(phi - half) % TAU: 1.0, phi % TAU: k, (phi + half) % TAU: 1.0})
    rings = max(3, round(6 / grain()))
    flat = [[(f * r * k * math.cos(a), f * r * k * math.sin(a)) for a, k in sorted(spokes.items())] for f in (i / rings for i in range(rings + 1))]
    base = len(patch.verts)
    skin(patch, [[at(a, b, PATCH_LIFT) for a, b in row] for row in flat] + [[at(a, b, -0.3) for a, b in flat[-1]]], None, closed=True, flip=True)
    half = INSIGNIA_ART * r
    patch.uvs[base:] = [((a / half + 1) / 2 / CM, (b / half + 1) / 2 / CM) for row in [*flat, flat[-1]] for a, b in row]

    # the name tag, level under it
    at, (w, h) = lay(t, z - NAME_TAG_DROP, az), NAME_TAG
    nx = max(4, round(10 / grain()))
    xs = [-w / 2, *(w * (i / nx - 0.5) for i in range(nx + 1)), w / 2]
    ys = [-h / 2, -h / 2, 0.0, h / 2, h / 2]
    top = lambda i, j: 0 < i < len(xs) - 1 and 0 < j < len(ys) - 1  # noqa: E731
    base = len(tag.verts)
    skin(tag, [[at(a, b, 0.16 if top(i, j) else -0.3) for i, a in enumerate(xs)] for j, b in enumerate(ys)], None)
    tag.uvs[base:] = [((a / w + 0.5) / CM, (b / h + 0.5) / CM) for b in ys for a in xs]


# ------------------------------------------------- over the suit: the cloth as built, and what lies on it
#
# The zipper, the patches and the waist strap are laid on the torso's Tube, which is where the cloth is before the
# sleeves are stitched in and the armpits' folds pressed into it. A harness runs over the shoulders and through the
# crotch, where the finished skin is nowhere a Tube says: so it is laid on the cloth itself, as it was built.


class Cloth:
    """The suit's skin as built (trunk, shoulders and trousers), to lay on it what is worn over it."""

    def __init__(self) -> None:
        self.verts: list[Vector] = []
        self.faces: list[tuple[int, ...]] = []
        self.share: list[float] = []  # of each vertex, how much is the sleeve's (figurelib.build_shell)
        # what already lies on it: (a point of its middle line, its half-width, how far its top stands off the cloth, what it is)
        self.under: list[tuple[Vector, float, float, str]] = []
        self._tree: BVHTree | None = None

    def add(self, mb: MeshBuilder, share: Sequence[float] | None = None) -> None:
        base = len(self.verts)
        self.verts += [Vector(v) for v in mb.verts]
        self.faces += [tuple(base + i for i in f) for f in mb.faces]
        self.share += list(share) if share else [0.0] * len(mb.verts)
        self._tree = None

    def _ready(self) -> None:
        if self._tree is not None:
            return
        self._tree = BVHTree.FromPolygons(self.verts, self.faces)
        self._normals = [Vector() for _ in self.verts]
        for f in self.faces:
            v = [self.verts[i] for i in f]
            nm = sum(((v[i] - v[0]).cross(v[i + 1] - v[0]) for i in range(1, len(f) - 1)), Vector())
            for i in f:
                self._normals[i] += nm
        self._near = KDTree(len(self.verts))
        for i, v in enumerate(self.verts):
            self._near.insert(v, i)
        self._near.balance()

    def on(self, p: Sequence[float]) -> tuple[Vector, Vector]:
        """The point of the cloth nearest `p`, and the way the cloth faces there (smoothed over the face it is on)."""
        self._ready()
        co, _nm, index, _dist = self._tree.find_nearest(Vector(p))
        nm = sum((self._normals[i].normalized() / ((self.verts[i] - co).length + 0.05) for i in self.faces[index]), Vector())
        return co, nm.normalized()

    def hit(self, origin: Sequence[float], way: Sequence[float]) -> Vector:
        """Where a ray from outside first meets the cloth."""
        self._ready()
        co = self._tree.ray_cast(Vector(origin), Vector(way).normalized())[0]
        if co is None:
            raise ValueError(f"nothing of the suit lies {tuple(way)} of {tuple(origin)}")
        return co

    def share_at(self, p: Sequence[float]) -> float:
        """How much of the cloth under `p` is the sleeve's: what is laid on it there follows the arm by as much."""
        self._ready()
        near = self._near.find_n(Vector(p), 3)
        return sum(self.share[i] / (dist + 0.05) for _, i, dist in near) / sum(1 / (dist + 0.05) for _, _, dist in near)


_cloth = Cloth()
_nodes: dict[str, bpy.types.Object | None] = {}  # the figure's top-level nodes, for what is added to one after it is built
_chart: list[tuple[float, float, float]] = []  # tight()'s lines, as points: (height, azimuth, half-width)

CHART = 0.27  # centimetres a degree round the trunk, near enough, for measuring on its chart
HARNESS_WEB = 4.4  # the harness's webbing: 1 3/4 in, the usual width of a parachute harness's (not measured)
HARNESS_PAD = 5.4  # its quilted pads over the shoulders (61-MR4-79, beside a mirror taken as 15 cm)
CHEST_STRAP = (19.7, 3.2)  # the chest strap: its middle under the neck ring's lower edge, and its width (S61-02888)
NAME_TAPE = (10.9, 2.2)  # the white tape lettered GRISSOM on the chest strap: length, height (S61-02888)
MIRROR_UNDER_RING = 11.0  # the chest mirror's middle under the neck ring's lower edge (S61-02888, 61-MR4-79)
MIRROR = 5.0 * 2.54  # across the mirror itself: "the 5-inch plexiglas parabolic mirror" (NASA's caption to 61-MR4-79)
MIRROR_R = 7.5  # 15 cm across its rim: 13 cm in 61-MR4-76 and 16 in S61-02888, each beside the 24 cm neck ring
TIE_BUCKLE = 4.8  # the tie-down strap's buckle, under the chest strap's middle
# a leg strap between the hip and the fork: (off the midline, above the bottom of the pelvis), from the fork outward
FORK = ((5.0, 3.0), (6.2, 4.4), (8.2, 6.0), (10.6, 8.0), (12.6, 10.0))


def axes(origin: Vector, x: Vector, y: Vector, z: Vector) -> Matrix:
    """A frame at `origin` whose own axes are these three."""
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = origin
    return m


def azimuth_of(t: Tube, p: Vector) -> float:
    """Where a point of the trunk is on the trunk's chart: degrees round from straight ahead toward his left, as Tube.at counts them."""
    i, f = t._row(p.z - B.torso_z0)
    rad = t.rads[i].lerp(t.rads[i + 1], f)
    return azimuth(math.atan2(p.y / rad.y, p.x / rad.x))


def harness_chart() -> dict[str, list[tuple[float, float]]]:
    """Where the parachute harness of MR-4 runs over the trunk, as lines on the trunk's chart: (height, azimuth in
    degrees from straight ahead toward his left; 180 is the middle of the back). Read off the photographs of 19 and 21
    July 1961 (front: S61-02845, S61-02888, 61-MR4-79; back: S61-02889 and FHSU 449, the walk to the lift): two straps
    from the hips up the front, over the shoulders and crossed on the back to the opposite hip; a strap across the
    chest under the mirror and one across the back under the crossing; the tie-down strap down the middle."""
    chest = up(RING_LOW) - CHEST_STRAP[0]
    waist, yoke = B.waist_z, B.z_yoke
    hip = waist - 6.0
    out = {
        "chest": [(chest, float(a)) for a in range(-50, 51, 10)],
        "back": [(chest - 10.0, float(a)) for a in range(118, 243, 8)] + [(chest - 10.0, 242.0)],
        "tie": [(chest - 1.9, 0.0), (waist + 12.0, 0.0), (waist + 2.5, 0.0)],
    }
    for side, sx in (("L", 1), ("R", -1)):
        out[f"front{side}"] = [
            (hip, 52.0 * sx),
            (waist + 8.0, 60.0 * sx),
            (chest - 8.0, 55.0 * sx),
            (chest, 50.0 * sx),
            (chest + 6.0, 47.0 * sx),
            (yoke - 4.0, 46.0 * sx),
        ]
        # (straight from beside the neck to the other hip: the two cross 4.6 cm under the chest strap's height)
        out[f"rear{side}"] = [
            (yoke - 1.0, 149.0 * sx),
            (chest + 4.4, 166.7 * sx),
            (chest - 4.6, 180.0 * sx),
            (waist + 12.8, 201.0 * sx),
            (waist + 2.8, 220.6 * sx),
            (hip, 232.0 * sx),
        ]
    return out


def along_chart(keys: Sequence[tuple[float, float]], step: float = 0.8) -> list[tuple[float, float]]:
    """Points every `step` centimetres along a smooth line through `keys` on the trunk's chart."""
    return [(p.x, p.y / CHART) for p in polyline([(z, a * CHART, 0.0) for z, a in keys], step)]


def tight(z: float, a: float) -> float:
    """0 where something is drawn tight over the trunk at (height, azimuth) and the cloth lies flat under it (the
    harness's straps, the patches under the mirror), 1 in the open."""
    if not _chart:
        for name, keys in harness_chart().items():
            half = {"chest": CHEST_STRAP[1], "back": CHEST_STRAP[1], "tie": 2.2}.get(name, HARNESS_PAD) / 2
            _chart.extend((zq, aq, half) for zq, aq in along_chart(keys))
        zi, ai = insignia_at()
        _chart.extend((zi - drop, ai + da, INSIGNIA_R) for drop in (0.0, NAME_TAG_DROP) for da in (-12.0, 0.0, 12.0))
    keep = 1.0
    for zq, aq, half in _chart:
        dz = z - zq
        if abs(dz) < half + 2.6:
            keep = min(keep, smooth(math.hypot(dz, ((a - aq + 180.0) % 360.0 - 180.0) * CHART) - half, 0.3, 2.6))
    return keep


def strap(
    mb: MeshBuilder,
    keys: Sequence[Sequence[float]],
    width: float | Callable[[Vector], float],
    proud: float | Callable[[Vector], float],
    *,
    what: str = "",
    ignore: Sequence[str] = (),
    dive: tuple[float, float] = (1.6, 1.6),
    sink: float = 0.35,
    bevel: float = 0.18,
    across: int = 5,
    step: float = 0.6,
    picture: bool = False,
) -> list[tuple[Vector, Vector, Vector]]:
    """A length of webbing laid on the cloth along a smooth line through `keys` (points near it, rest pose): `width`
    wide and its top `proud` of the cloth (either may depend on where it is), following the cloth across its width as
    well as along it, its edges sunk through. Where it crosses something already laid there it rides over it. At each
    end it goes down into the cloth over `dive` centimetres (0: cut off square; no more than 1.8, or it meets the
    cloth too flatly). `what` names it for whatever is laid after it; `ignore` names what it runs under instead of
    over. With `picture`, its UVs are one image from end to end.
    Returns its middle line as (point on the cloth, the way the cloth faces, across the strap)."""
    coarse = srlib.DETAIL < 0.5  # the level seen from far off: stood further off its coarser cloth, across fewer points, its ends cut square
    across, dive = (3, (0.0, 0.0)) if coarse else (across, dive)
    line = [_cloth.on(p)[0] for p in polyline(keys, step * grain())]
    for _ in range(3):  # the keys are only near the cloth: let the line settle along itself, on it
        line = [line[0], *(_cloth.on((a + 2 * b + c) / 4)[0] for a, b, c in zip(line, line[1:], line[2:])), line[-1]]
    n = len(line)
    faces = [_cloth.on(c)[1] for c in line]
    at = [0.0]
    for a, b in zip(line, line[1:]):
        at.append(at[-1] + (b - a).length)
    rows, rail = [], []
    for i, c in enumerate(line):
        nm = sum(faces[max(0, i - 2) : i + 3], Vector()).normalized()
        ac = nm.cross((line[min(n - 1, i + 1)] - line[max(0, i - 1)]).normalized()).normalized()
        half = (width(c) if callable(width) else width) / 2
        h = (proud(c) if callable(proud) else proud) + (0.2 if coarse else 0.0)
        for q, reach, top, name in _cloth.under:
            if name not in ignore:
                gap = (q - c).length - reach - half
                if gap < 2.2:
                    h = max(h, h + (top + (0.5 if coarse else 0.3) - h) * (1 - smooth(gap, 0.0, 2.2)))
        for end, length in ((at[i], dive[0]), (at[-1] - at[i], dive[1])):
            if length:  # (straight down, and steeply: a strap that eased into the cloth would lie in its plane where it met it)
                h = -sink + (h + sink) * min(1.0, end / length)
        row = [_cloth.on(c - ac * half + nm * 0.6)[0] - nm * sink]
        for k in range(across):
            q, qn = _cloth.on(c + ac * ((half - bevel) * (2 * k / (across - 1) - 1)) + nm * 0.6)
            row.append(q + qn * h)
        row.append(_cloth.on(c + ac * half + nm * 0.6)[0] - nm * sink)
        rows.append(row)
        rail.append((c, nm, ac, h, half))
    base, cols = len(mb.verts), across + 2
    skin(mb, rows, None, flip=True)
    if not dive[0]:
        mb.faces.append(tuple(base + k for k in range(cols)))
    if not dive[1]:
        mb.faces.append(tuple(base + (n - 1) * cols + k for k in reversed(range(cols))))
    if picture:
        mb.uvs[base:] = [(at[i] / at[-1] / CM, min(1.0, max(0.0, (k - 1) / (across - 1))) / CM) for i in range(n) for k in range(across + 2)]
    if what:
        _cloth.under += [(c, half, h, what) for c, _, _, h, half in rail]
    return [(c, nm, ac) for c, nm, ac, _, _ in rail]


def name_tape_image() -> bpy.types.Image:
    """The white tape on the harness's chest strap, lettered with the pilot's surname. Units are half its length."""
    w, h = NAME_TAPE
    art = Art(f"name-tape-{NAME.split()[-1].lower()}", 512, round(512 * h / w), 1.0, (0.86, 0.85, 0.80))
    art.text(NAME.split()[-1], 1.5, (0.0, 0.0), (0.05, 0.05, 0.06), srlib.load_font())
    return art.image()


def build_worn(M: dict, t: Tube) -> None:
    """What Grissom wore over the suit on 21 July 1961 that Shepard's figure does not have: the parachute harness,
    the chest mirror hung on it, the tie-down strap run on down to the crotch, the helmet's lead. Built once trunk
    and trousers are, on the cloth as it then is."""
    az = lambda deg: -TAU / 4 + math.radians(deg)  # noqa: E731
    on_trunk = lambda z, a: t.at(z - B.torso_z0, az(a), 1.2)  # noqa: E731
    front = lambda x, z: _cloth.hit((x, -60.0, z), (0, 1, 0))  # noqa: E731
    rear = lambda x, z: _cloth.hit((x, 60.0, z), (0, -1, 0))  # noqa: E731
    chart = harness_chart()
    chest = up(RING_LOW) - CHEST_STRAP[0]
    low = B.pelvis_bottom
    web, pad, tape, tie, steel, rings = (MeshBuilder() for _ in range(6))

    # across the chest, and across the back: laid first, the two long straps run over them
    strap(web, [on_trunk(z, a) for z, a in chart["chest"]], CHEST_STRAP[1], 0.26, what="chest", dive=(1.0, 1.0))
    strap(web, [on_trunk(z, a) for z, a in along_chart(chart["back"], 3.0)], CHEST_STRAP[1], 0.26, what="back", dive=(1.5, 1.5))
    # the white name tape on the chest strap, at his right
    d, th = chest - B.torso_z0, az(-28.0)
    span = NAME_TAPE[0] / ((t._skin(d, th + 0.01, False) - t._skin(d, th - 0.01, False)).length / 0.02 * math.pi / 180)  # degrees round the chest
    strap(
        tape, [on_trunk(chest, -12.0 - span * (1 - k / 4)) for k in range(5)], NAME_TAPE[1], 0.3, dive=(0.0, 0.0), sink=-0.2, bevel=0.05, picture=True
    )

    # the two long straps: from the fork up the front of the hip and the chest, over the shoulder, crossed on the
    # back to the other hip, and round under the other buttock to the fork. Padded where they bear on the shoulders.
    rails = {}
    for side, sx in (("L", 1), ("R", -1)):
        # a leg strap from the fork up to each hip, front and back: the long strap's two ends are sewn over theirs
        (hip, a0), (_, a1) = chart[f"front{side}"][0], chart[f"rear{side}"][-1]
        if FIT.fork:
            strap(web, [front(sx * x, low + z) for x, z in FORK] + [on_trunk(hip + 2.0, a0)], HARNESS_WEB, 0.28, what=f"leg{side}", dive=(1.1, 0.0))
            strap(web, [rear(-sx * x, low + z) for x, z in FORK] + [on_trunk(hip + 2.0, a1)], HARNESS_WEB, 0.28, what=f"seat{side}", dive=(1.1, 0.0))
        keys = [on_trunk(z, a) for z, a in along_chart(chart[f"front{side}"], 2.5)]
        keys += [_cloth.hit((sx * x, y, 200.0), (0, 0, -1)) for x, y in ((14.4, -6.0), (14.3, -3.0), (14.0, 0.0), (13.3, 3.0), (12.2, 6.0))]
        keys += [on_trunk(z, a) for z, a in along_chart(chart[f"rear{side}"], 2.5)]
        run = polyline(keys, 0.6)
        # webbing from the hip to the chest strap and from the shoulder blade to the other hip; between them, over the shoulder, the pad
        first = next(i for i, p in enumerate(run) if p.y < 0 and p.z > chest - 3.0)
        last = max(i for i, p in enumerate(run) if p.y > 0 and p.z > B.z_yoke - 10.0)
        # (without the leg straps to be sewn over, each end goes down into the cloth at its hip)
        ends = 0.0 if FIT.fork else 1.2
        strap(web, run[: first + 5], HARNESS_WEB, 0.28, what=f"main{side}", dive=(ends, 0.0))
        strap(web, run[last - 4 :], HARNESS_WEB, 0.28, what=f"main{side}", dive=(0.0, ends))
        rails[sx] = strap(pad, run[first : last + 1], HARNESS_PAD, 0.62, what=f"pad{side}", dive=(0.0, 0.0), bevel=0.3)
    web.share = [_cloth.share_at(v) for v in web.verts]
    pad.share = [_cloth.share_at(v) for v in pad.verts]

    # a V-ring on each shoulder strap, at the height of the insignia, for the chest parachute's snaps
    for sx in (1, -1):
        c, nm, ac = min((r for r in rails[sx] if r[0].y < 0), key=lambda r: abs(r[0].z - (chest + 8.0)))
        along = ac.cross(nm) * (1 if ac.cross(nm).z > 0 else -1)  # up the strap
        o = c + nm * 0.95
        # a bar across the strap under a keeper, and the bow of the V standing up from it
        loop = [o + ac * (2.6 * math.cos(a)) + along * (2.2 * max(0.0, math.sin(a))) for a in (math.radians(k * 15) for k in range(24))]
        Tube([*loop, loop[0]], [(0.3, 0.3)] * (len(loop) + 1), ref=tuple(nm), resample=1).add(rings, 8)
        if srlib.DETAIL >= 0.5:
            pad.box((3.2, 1.7, 0.9), axes(c + nm * 0.75, ac, along, nm))  # the loop of webbing that holds it to the pad
    pad.share += [0.0] * (len(pad.verts) - len(pad.share))

    # the tie-down strap: from under the chest strap down the middle of the front to the fork, with its buckle
    keys = [on_trunk(z, a) for z, a in along_chart(chart["tie"], 3.0)]
    if FIT.fork:
        keys += [front(0.0, z) for z in (B.waist_z - 1.0, B.waist_z - 6.0, low + 7.0, low + 3.5, low + 1.2)]
    rail = strap(tie, keys, 2.2, 0.26, ignore=("chest", "zipper"), dive=(0.8, 1.1))
    c, nm, _ = min(rail, key=lambda r: abs(r[0].z - (chest - TIE_BUCKLE)))
    buckle(steel, tie, c + nm * 0.26, nm, (2.4, 3.6), spin=TAU / 4)

    g = _nodes["Harness"] = group("Harness")
    emit(web, "Torso_HarnessWebbing", M["harness"], g)
    emit(pad, "Torso_HarnessPads", M["pad"], g)
    emit(tape, "Torso_HarnessNameTape", M["nametape"], g, sharp_angle=None)
    emit(rings, "Torso_HarnessRings", M["steel"], g)
    emit(tie, "Torso_TieDown", M["tiedown"], _nodes["Torso"])
    emit(steel, "Torso_TieDownBuckle", M["steel"], _nodes["Torso"], smooth=False)
    if FIT.mirror:
        build_mirror(M, t, rails)
    if FIT.lead:
        build_lead(M)


def build_mirror(M: dict, t: Tube, rails: dict[int, list[tuple[Vector, Vector, Vector]]]) -> None:
    """The convex mirror on the chest ("hero's medal"): the camera that watched the pilot photographed his instruments
    in it. A dome of polished metal in a rim, hung between the harness's shoulder straps by a tab either side."""
    glass, rim, tabs = (MeshBuilder() for _ in range(3))
    z = up(RING_LOW) - MIRROR_UNDER_RING
    d, th = z - B.torso_z0, -TAU / 4
    nm = t.normal(d, th)
    m = frame(_cloth.on(t.at(d, th, 1.0))[0], nm)
    r = MIRROR_R
    # it stands off the chest on its mounting: its back 9 mm from the cloth at the middle, more at its edges as the chest falls away
    span, rise = MIRROR / 2, 1.2
    rim.lathe([(0.0, 0.9), (r, 0.9), (r, 2.1), (r - 0.35, 2.35), (span - 0.05, 2.35), (span - 0.05, 1.9)], 56, matrix=m)
    # the dome: a cap of a sphere, 1.2 cm proud of its edge
    ball = (span * span + rise * rise) / (2 * rise)
    most = math.asin(span / ball)
    glass.lathe(
        [(ball * math.sin(most * (1 - k / 10)), 1.95 + ball * (math.cos(most * (1 - k / 10)) - math.cos(most))) for k in range(11)], 56, matrix=m
    )
    for sx in (1, -1):
        c, pn, ac = min((q for q in rails[sx] if q[0].y < 0), key=lambda q: abs(q[0].z - z))
        a = m @ Vector((sx * (r - 0.3), 0.0, 1.5))
        b = c + ac * (-1.4 if ac.x * sx > 0 else 1.4) + pn * 0.66  # on the pad, toward the mirror from its middle
        way = (b - a).normalized()
        across = Vector((0, 0, 1)) - way * way.z
        tabs.box(((b - a).length + 0.8, 1.8, 0.3), axes((a + b) / 2, way, across.normalized(), way.cross(across).normalized()))
    g = _nodes["Mirror"] = group("Mirror")
    emit(glass, "Torso_MirrorGlass", M["mirror"], g)
    emit(rim, "Torso_MirrorRim", M["aluminium"], g, sharp_angle=30)
    emit(tabs, "Torso_MirrorTabs", M["tiedown"], g, smooth=False)


def build_lead(M: dict) -> None:
    """The helmet's communications lead: unplugged until he is in the couch, it hangs from the helmet's right side
    down the right chest, its plug at the chest strap (S61-02845, S61-02888, 61-MR4-79)."""
    lead, plug = MeshBuilder(), MeshBuilder()
    ring = up(RING_LOW)
    out = Vector((math.sin(math.radians(-50)), -math.cos(math.radians(-50)), 0.0))
    centre = Vector((0.0, -0.6, 0.0))
    # it hangs clear of the chest and of what is on it (the insignia, the mirror's tab), from a ring that overhangs both
    hang = lambda x, z, off: _cloth.hit((x, -60.0, z), (0, 1, 0)) + Vector((0.0, -off, 0.0))  # noqa: E731
    keys = [
        helmet_at(math.radians(-50), ring + 5.6, -0.4),
        helmet_at(math.radians(-50), ring + 5.2, 1.0),
        centre + out * 14.3 + Vector((0, 0, ring + 3.0)),
        centre + out * 14.4 + Vector((0, 0, ring - 0.8)),
        hang(-10.4, ring - 6.0, 2.8),
        hang(-10.0, ring - 11.5, 2.7),
        hang(-9.7, ring - 16.0, 2.4),
    ]
    pts = polyline(keys, 0.5)
    Tube(pts, [(0.42, 0.42)] * len(pts), resample=1).add(lead, 10)
    end, way = pts[-1], (pts[-1] - pts[-3]).normalized()
    plug.lathe([(0.0, -0.3), (0.75, -0.3), (0.75, 0.5), (0.95, 0.6), (0.95, 3.0), (0.7, 3.3), (0.0, 3.3)], 16, matrix=frame(end, way))
    for mb, name, mat in ((lead, "Helmet_Lead", M["lead"]), (plug, "Helmet_LeadPlug", M["lead"])):
        points = [Vector(v) for v in mb.verts]
        obj = emit(mb, name, mat, _nodes["Helmet"], sharp_angle=30)
        rig = fl.rig()
        if obj is not None and not rig.posed():
            # a lead, not a part of the helmet: its top goes with the head, and from the neck ring down it lies with the chest
            follows = []
            for p in points:
                k = smooth(p.z, ring - 2.5, ring + 2.5)
                w = {joint: x * (1 - k) for joint, x in fl.joint_weights("Torso", p).items()}
                w["Head"] = w.get("Head", 0.0) + k
                follows.append(w)
            rig.skins[-1] = (obj, follows)


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.arm], [(a, b) for *_, a, b in B.arm], resample=14)
    d_el = t.key_d(4)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)  # the crook of the elbow faces forward
    th_pit = t.toward((-sx, 0, 0), t.key_d(3))
    t.fold = lambda d, th: (
        0.008 * math.sin(TAU * d / 6.1 + 2 * th) * smooth(d, B.sleeve_hem + 2, B.sleeve_hem + 8) * (1 - smooth(d, t.length - 14, t.length - 8))
    )
    t.relief = [
        Folds(d_el - 4.5, d_el + 4.5, 7, 0.6, 0.7 * sx, th_in, spread=1.7),
        # bunched where the arm hangs against the side; smooth for 2 cm either side of the seam with the shoulder
        Folds(t.key_d(2) + 1.0, t.key_d(3) + 6.0, 5, 0.3, 2.1 * sx, th_pit, spread=1.2, mask=lambda d, th: smooth(abs(d - B.sleeve_hem), 1.0, 2.6)),
        Folds(t.length - 17.0, t.length - 9.5, 3, 0.22, 3.3 * sx, th_in, spread=1.0),
    ]
    return t


def build_arms(M: dict, tubes: dict[int, Tube]) -> None:
    g = group("Arms")
    sleeves, strips, cords, eyelets, alu, face, needle = (MeshBuilder() for _ in range(7))
    for sx in (1, -1):
        t = tubes[sx]
        # The sleeve starts on the ring of points the shoulder's skin ends on, so the two read as
        # one cloth. A band 2.5 mm underneath backs the join: if rounding ever opens a hair's
        # breadth between the two meshes, what shows through is sleeve.
        t.mesh(sleeves, 32, t.rows(B.sleeve_hem), caps=(False, True))
        t.mesh(sleeves, 32, [B.sleeve_hem - 1.2, B.sleeve_hem + 0.6], caps=(False, False), sunk=lambda d: 0.25)
        d_el = t.key_d(4)
        out = t.toward((sx, 0.25, 0), d_el)
        lacing(t, t.key_d(2) + 4.0, d_el - 6.5, out, 2.4, strips, cords, eyelets)
        lacing(t, d_el + 6.5, t.length - 9.5, out, 2.2, strips, cords, eyelets)
    # suit pressure gauge on a strap round the left forearm
    t = tubes[1]
    dg = t.length - 6.0  # the glove's cuff covers the last 2.5 cm of sleeve
    band(strips, ring(t, dg, 32), 1.8, 0.3, closed=True)
    th = t.toward((0.55, -1, 0.2), dg)
    m = frame(t.at(dg, th, -0.2), t.normal(dg, th))
    if FIT.pale_gauge:  # MR-4: a thick white bezel, 5.8 cm across (61-MR4-76, S88-55875)
        alu.lathe([(2.9, 0.0), (2.9, 1.25), (2.65, 1.6), (1.9, 1.6), (1.9, 1.2)], 28, matrix=m)
    else:
        alu.lathe([(2.4, 0.0), (2.4, 1.3), (2.15, 1.55), (1.9, 1.55), (1.9, 1.2)], 28, matrix=m)
    face.lathe([(1.95, 1.3), (0.0, 1.3)], 28, matrix=m)
    needle.box(
        (0.14, 1.5, 0.9), m @ Matrix.Rotation(0.7, 4, "Z") @ Matrix.Translation((0, 0.45, 1.25))
    )  # sunk well through the face, 2 mm proud of it

    emit(sleeves, "Arms_Sleeves", M["suit"], g)
    emit(strips, "Arms_LacingStrips", M["webbing"], g)
    emit(cords, "Arms_LacingCords", M["lace"], g)
    emit(eyelets, "Arms_Eyelets", M["steel"], g)
    emit(alu, "Arms_PressureGauge", M["bezel" if FIT.pale_gauge else "aluminium"], g, sharp_angle=30)
    emit(face, "Arms_PressureGaugeFace", M["gauge"], g)
    emit(needle, "Arms_PressureGaugeNeedle", M["white"], g, smooth=False)


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, tape, teeth, web, steel, rings, leather = (MeshBuilder() for _ in range(7))
    fingers: list[float] = []
    for sx in (1, -1):
        hand, palm = fl.gloved_hand(shell, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
        # (what is laid on the glove is made, like it, for a full-sized hand, and brought to the wearer's with it: figurelib.fitted)
        first = [len(mb.verts) for mb in (tape, teeth, web, steel, rings, leather)]
        if FIT.wrist_rings:
            # MR-4: the glove locks to a ring on the sleeve that turns on a bearing, so the wrist can turn under pressure.
            # Three bands of machined aluminium, 3.6 cm long in all, round the cuff above the wrist (61-MR4-76).
            c, along = palm.centre(WRIST_RING_AT), (palm.centre(WRIST_RING_AT + 1.0) - palm.centre(WRIST_RING_AT - 1.0)).normalized()
            # (never fewer than 24 sides: a coarser ring's flats come down onto the cuff's corners)
            rings.lathe(WRIST_RING, 40 if srlib.DETAIL >= 1 else round(24 / srlib.DETAIL), matrix=frame(c, along))
        else:
            # MR-3: the glove zips to the sleeve all the way round. No wrist ring, so no rotation.
            zipper = ring(palm, 1.2, 32)
            band(tape, zipper, 1.5, 0.22, closed=True)
            band(teeth, zipper, 0.42, 0.18, lift=0.22, sink=0.2, bevel=0.08, closed=True)
        # restraint strap at the wrist
        band(web, ring(palm, 7.6, 28), 1.5, 0.32, closed=True)
        th = palm.toward(hand.B, 7.6)
        buckle(steel, web, palm.at(7.6, th, 0.25), palm.normal(7.6, th), (2.0, 2.4))
        if FIT.dark_palms:  # MR-4: the palm faced in dark leather (S61-02888, 61-MR4-79)
            th = palm.toward(-hand.B, 13.0)
            palm.patch(leather, 10.0, palm.length - 1.8, th - 1.1, th + 1.1, 0.4, nd=8, nt=10, sink=0.3)
        for mb, i in zip((tape, teeth, web, steel, rings, leather), first):
            fl.fitted(mb, i, hand)

    shell.share = fingers
    emit(shell, "Gloves_Shell", M["suit"], g)
    if FIT.wrist_rings:
        emit(rings, "Gloves_WristRings", M["aluminium"], g, sharp_angle=30)
    else:
        emit(tape, "Gloves_ZipperTape", M["tape"], g, smooth=False)
        emit(teeth, "Gloves_ZipperTeeth", M["steel"], g, smooth=False)
    emit(web, "Gloves_Straps", M["webbing"], g, smooth=False)
    emit(steel, "Gloves_Buckles", M["steel"], g, smooth=False)
    if FIT.dark_palms:
        emit(leather, "Gloves_Palms", M["palm"], g)


# ---------------------------------------------------------------------------- legs


def leg_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in B.leg], [(a, b) for *_, a, b in B.leg], resample=18)
    d_knee, d_calf = t.key_d(5), t.key_d(6)
    th_front = t.toward(FRONT, d_knee)

    def fold(d: float, th: float) -> float:
        c = math.cos(th - th_front)
        return 0.06 * max(0.0, -c) * gauss(d, d_calf, 8) + 0.04 * max(0.0, c) * gauss(d, d_knee, 4)  # calf, kneecap

    t.fold = fold
    t.relief = [
        # deepest behind the knee; a knee bent double has one big fold there, not these
        Folds(
            d_knee - 6.0,
            d_knee + 6.0,
            8,
            0.62 * (1 - 0.75 * smooth(fl.rig().angles.get("knee", 0.0), 30, 90)),
            1.0 * sx,
            th_front + math.pi,
            spread=1.6,
        ),
        # the groin (none under a harness's leg straps, which are drawn tight across it)
        Folds(
            t.key_d(2) - 2.0,
            t.key_d(2) + 3.5,
            4,
            0.3,
            2.6 * sx,
            t.toward((-sx, -0.6, 0), t.key_d(2)),
            spread=1.0,
            mask=(lambda d, th: 0.0) if FIT.harness else None,
        ),
        Folds(t.key_d(7) - 0.5, t.key_d(7) + 4.3, 3, 0.3, 0.3 * sx, spread=3.0),  # bunched over the boot
    ]
    return t


def build_legs(M: dict, torso: Tube) -> None:
    g = group("Legs")
    legs, strips, cords, eyelets, flap, snaps, bore = (MeshBuilder() for _ in range(7))
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    if FIT.harness:
        _cloth.add(legs)
    for sx in (1, -1):
        t = tubes[sx]
        d_knee = t.key_d(5)
        out = t.toward((sx, 0.15, 0), d_knee)
        lacing(t, t.key_d(2) + 5.0, d_knee - 8.5, out, 2.6, strips, cords, eyelets)
        lacing(t, d_knee + 8.5, t.key_d(7) - 3.0, out, 2.4, strips, cords, eyelets)
        if sx == -1 and FIT.port:
            # MR-4: the biomedical connector is a round port in the middle of a reinforcing disc, on the front of the
            # right thigh two fifths of the way from the crotch to the knee (S61-02888, 61-MR4-79). The disc is cloth
            # and lies on the thigh's curve, with two raised rings; the port is a collar with a bore.
            d0 = d_knee - PORT_ABOVE_KNEE
            th = t.toward((sx * 0.3, -1, 0), d0)
            per = (t._skin(d0, th + 0.01, False) - t._skin(d0, th - 0.01, False)).length / 0.02  # centimetres a radian, round the thigh
            n = sides(40, 16)
            rows = [[t.at(d0 + r * math.cos(TAU * k / n), th + r * math.sin(TAU * k / n) / per, off) for k in range(n)] for r, off in PORT_DISC]
            skin(flap, rows, t.centre(d0), closed=True)
            m = frame(t.at(d0, th), t.normal(d0, th))
            snaps.lathe([(1.55, -0.2), (1.55, 0.9), (1.25, 1.1), (0.75, 1.1), (0.75, 0.5)], 24, matrix=m)
            bore.lathe([(0.78, 0.5), (0.0, 0.5)], 24, matrix=m)
        elif sx == -1:
            # biomedical connector flap, right thigh: the sensor harness plugs in underneath
            d0, d1 = d_knee - 21.0, d_knee - 9.0
            th = t.toward((sx * 0.75, -1, 0), d0)
            t.patch(flap, d0, d1, th - 0.5, th + 0.5, 0.35, nd=10, nt=10)
            for d in (d0 + 1.0, d1 - 1.0):
                for s in (-0.4, 0.4):
                    snaps.disc(t.at(d, th + s, 0.25), t.normal(d, th + s), 0.4, 0.3, 10)

    emit(legs, "Legs_Trousers", M["suit"], g, sharp_angle=None)
    emit(strips, "Legs_LacingStrips", M["webbing"], g)
    emit(cords, "Legs_LacingCords", M["lace"], g)
    emit(eyelets, "Legs_Eyelets", M["steel"], g)
    if FIT.port:
        emit(flap, "Legs_BiomedDisc", M["suit"], g)
        emit(snaps, "Legs_BiomedPort", M["aluminium"], g, sharp_angle=30)
        emit(bore, "Legs_BiomedPortBore", M["rubber"], g)
    else:
        emit(flap, "Legs_BiomedFlap", M["suit"], g)
        emit(snaps, "Legs_BiomedSnaps", M["steel"], g)


# --------------------------------------------------------------------------- boots


def build_boots(M: dict) -> None:
    g = group("Boots")
    uppers, soles, laces, eyelets, tongue = (MeshBuilder() for _ in range(5))
    if BOOT_SIZE == 1.0:
        fl.laced_boots(uppers, soles, laces, eyelets, tongue, BOOT_TOP, BOOT_LENGTH)
    else:  # (a smaller boot brings its laces nearer the leather: they are stood off it a little more)
        fl.laced_boots(uppers, soles, laces, eyelets, tongue, BOOT_TOP, BOOT_LENGTH, BOOT_SIZE, lace_lift=0.04)

    emit(uppers, "Boots_Uppers", M["boot"], g)
    emit(tongue, "Boots_Tongues", M["boot"], g)
    emit(soles, "Boots_Soles", M["rubber"], g, sharp_angle=30)
    emit(laces, "Boots_Laces", M["lace"], g)
    emit(eyelets, "Boots_Eyelets", M["steel"], g)


def build_hose_stub(M: dict, inlet: Vector, axis: Vector) -> None:
    """In the cabin the suit is on the spacecraft's oxygen: a short length of hose at the waist
    inlet, cut off where the cabin's plumbing would take over."""
    g = group("Torso")
    hose = MeshBuilder()
    pts = polyline([tuple(inlet - axis * 1.2), tuple(inlet + axis * 4.0), tuple(inlet + axis * 8.0 + Vector((1.2, 0, -1.6)))], 0.4)
    Tube(pts, [(1.5, 1.5)] * len(pts), resample=1, fold=lambda d, th: 0.085 * math.sin(TAU * d / 1.6)).add(hose, 12)
    emit(hose, "Torso_HoseStub", M["hose"], g)


HOSE_R, HOSE_PITCH = 1.5, 1.6  # the ventilator hose: radius, and the spacing of its corrugations


def build_ventilator(M: dict, inlet: Vector, axis: Vector) -> None:
    """The portable ventilator he carried from the van: a case with a blower and a hose to the
    suit's waist inlet. Its size and every detail of it are guesses from the walk-out photographs."""
    g = group("Ventilator")
    case, hard, grille, hose, fit, panel = (MeshBuilder() for _ in range(6))
    wx, ly, hz = FIT.vent_size
    cx, cy = VENT_AT
    plain = FIT.white_ventilator  # MR-4's: a white box, of which only its handle, its hose and the panel on its end are in the photographs
    feet = 0.2 if plain else 1.2
    cz = feet + hz / 2
    # the case is a loft across its width, squared up, with eased edges at the two faces
    xs = [(0.0, 0.93), (0.3, 0.975), (0.9, 1.0), (wx - 0.9, 1.0), (wx - 0.3, 0.975), (wx, 0.93)]
    Tube(
        [(cx - wx / 2 + x, cy, cz) for x, _ in xs], [(hz / 2 * k, ly / 2 * k) for _, k in xs], resample=1, fold=lambda d, th: squareness(th, 10.0)
    ).add(case, 72)
    top = cz + hz / 2
    # carrying handle
    hy = cy + 1.0
    Tube(
        [(cx, hy + y, top + z) for y, z in ((-7.0, -0.6), (-6.6, 2.4), (-4.8, 3.6), (4.8, 3.6), (6.6, 2.4), (7.0, -0.6))],
        [(0.75, 0.75)] * 6,
        ref=(1, 0, 0),
        resample=6,
    ).add(hard, 10)
    for y in (-7.0, 7.0):
        hard.box((3.0, 2.4, 0.8), Matrix.Translation((cx, hy + y, top + 0.2)))
    for y in () if plain else (-11.0, 13.0):  # lid latches on the outboard face
        hard.box((0.7, 3.0, 4.4), Matrix.Translation((cx + wx / 2, cy + y, top - 5.0)))
    for dx in () if plain else (-1, 1):
        for dy in (-1, 1):
            hard.tube((cx + dx * 5.0, cy + dy * 16.0, 0.0), (cx + dx * 5.0, cy + dy * 16.0, feet + 0.6), 1.3, 12)
    for k in () if plain else range(6):  # blower louvres
        grille.box((0.6, 16.0, 1.0), Matrix.Translation((cx + wx / 2, cy, feet + 6.0 + k * 2.1)))
    if plain:
        # the end that goes first as it is carried: a dark panel with a round socket beside it (61-MR4-79)
        end = cy - ly / 2
        panel.box((wx * 0.42, 1.0, hz * 0.34), Matrix.Translation((cx - wx * 0.17, end, cz + hz * 0.08)))
        panel.lathe(
            [(2.1, 0.0), (2.1, 0.8), (1.5, 0.8), (1.5, 0.5), (0.0, 0.5)], 24, matrix=frame((cx + wx * 0.24, end + 0.1, cz + hz * 0.08), (0, -1, 0))
        )
    # hose: out of the top of the case, up and across to the inlet at his left waist
    py = cy - FIT.vent_port
    fit.lathe([(2.9, -0.4), (2.9, 0.9), (2.3, 1.1), (2.3, 3.2), (1.45, 3.2)], 28, matrix=Matrix.Translation((cx, py, top)))
    keys = [
        (cx, py, top + 1.5),
        (cx, py, top + 8.0),
        (cx - 1.5, py - 4.0, top + 20.0),
        (cx - 9.0, py - 9.0, up(68.0)),
        (cx - 19.0, py - 8.0, up(84.0)),
        tuple(inlet + axis * 16.0),
        tuple(inlet + axis * 6.0),
        tuple(inlet - axis * 1.2),
    ]
    pts = polyline(keys, 0.4)
    Tube(pts, [(HOSE_R, HOSE_R)] * len(pts), resample=1, fold=lambda d, th: 0.085 * math.sin(TAU * d / HOSE_PITCH)).add(hose, 12)

    emit(case, "Ventilator_Case", M["white" if plain else "aluminium"], g)
    emit(hard, "Ventilator_Hardware", M["steel"], g, sharp_angle=30)
    if plain:
        emit(panel, "Ventilator_Panel", M["rubber"], g, sharp_angle=30)
    else:
        emit(grille, "Ventilator_Louvres", M["rubber"], g, smooth=False)
    emit(hose, "Ventilator_Hose", M["hose"], g)
    emit(fit, "Ventilator_HoseFitting", M["aluminium"], g, sharp_angle=30)
    # the node's origin is the middle of the handle, which lies along Y with the case hanging
    # below it: made a child of a hand's grip (srlib.grip), the case is carried
    held = Vector((cx, hy, top + 3.6)) * CM
    g.location = held
    for obj in g.children:
        obj.data.transform(Matrix.Translation(-held))
    length = sum((b - a).length for a, b in zip(pts, pts[1:]))
    srlib.anchor(
        "Ventilator_HosePort",
        g,
        Vector((cx, py, top + 3.2)) * CM,
        (0, 0, 1),
        hose_radius=HOSE_R * CM,
        hose_length=round(length * CM, 3),
        hose_pitch=HOSE_PITCH * CM,
    )


# --------------------------------------------------------------------------- build


def build_figure(ventilator: bool) -> None:
    global _cloth
    _cloth = Cloth()
    _chart.clear()
    M = materials()
    build_helmet(M)
    inlet, axis, arms, torso = build_torso(M)
    fl.rig().inlet = (inlet, axis)
    build_arms(M, arms)
    build_gloves(M, arms)
    build_legs(M, torso)
    build_boots(M)
    if FIT.harness:
        build_worn(M, torso)
    if ventilator:
        build_ventilator(M, inlet, axis)
    else:
        build_hose_stub(M, inlet, axis)


def build(fit: Fit | None = None) -> float:
    """Builds the standing figure, in `fit`'s suit if one is given, and returns its height in metres."""
    if fit is not None:
        wear(fit)
    fl.use(B)
    fl.start()
    build_figure(ventilator=True)
    skeleton = fl.rig_standing()
    # where the viewer runs the ventilator's hose to
    inlet, axis = fl.rig().inlet
    srlib.anchor("Inlet", skeleton, inlet * CM, axis, bone="Spine")
    return max(v.co.z for o in bpy.data.objects if o.type == "MESH" for v in o.data.vertices)


# ------------------------------------------------------------------- on the couch

# The Mercury couch position, as joint angles in degrees. The torso does not move: the seat frame
# is laid along it. Chosen to fit the cabin (seated_fits), not measured from a drawing.
SEATED = {
    "hip": 100.0,  # thigh raised from the plane of the back
    "knee": 128.0,  # so the shins slope down toward the ankles
    "ankle": 30.0,  # toes drawn up toward the shin
    "knees_in": 4.0,  # legs brought together from the standing stance
    "pelvis": 40.0,  # the seat of the suit rolls under as the thighs come up
    "elbow": 21.5,  # forearms raised to the hand controllers
    "elbow_toe_in": 20.5,  # the hinge turned so the palms come in over the controllers, 27.2 cm off the centre line
    "pronate": 62.0,  # forearms turned palm down onto the controllers' knobs
    "grip": 1.0,  # hands closed round them
    "head": 30.0,  # the head bowed in the helmet: he is looking down his body at the panel (the eyes do the rest)
}
# where a thigh pressed against the belly stops, in seat-frame centimetres: the crease starts this
# far toward the head from the hip joints, at the height of the belly's skin, and opens at this slope
LAP_CREASE, LAP_SKIN, LAP_SLOPE = -2.0, 11.0, 1.2
INCH = 2.54
CABIN_R0, CABIN_TAPER = 35.97, 0.364  # pressure vessel's inner radius in inches: R0 - TAPER * z


def seated_rig() -> Rig:
    fl.use(B)
    return fl.seated_rig(SEATED, (LAP_CREASE, LAP_SKIN, LAP_SLOPE))


_seated_points: dict[float, dict[str, list[Vector]]] = {}


def seated_points() -> dict[str, list[Vector]]:
    """Every vertex of the seated figure by mesh, in seat-frame centimetres, without building anything."""
    return fl.posed_points(_seated_points, seated_rig, lambda: build_figure(ventilator=False))


def seated_fits(y_hip_in: float, z_hip_in: float = 9.4) -> float:
    """The smallest gap, in inches, between the seated figure and the cabin's pressure wall, with
    the seat origin at capsule (0, y_hip_in, z_hip_in). Negative means he is through the wall;
    the cabin asks for 0.5 or more."""
    worst = math.inf
    for pts in seated_points().values():
        for p in pts:
            z = z_hip_in + p.z / INCH
            worst = min(worst, CABIN_R0 - CABIN_TAPER * z - math.hypot(p.x / INCH, y_hip_in + p.y / INCH))
    return worst


def eyes_at(nod: float) -> Vector:
    """Midway between the eyes' irises with the head bowed by `nod` radians: rest pose, centimetres."""
    fl.use(B)
    mid = (fl.head_point(3.15, 0.5) + fl.head_point(-3.15, 0.5)) / 2 + Vector((0, -0.2, 0.02))
    return NOD_AT(B.head) + Matrix.Rotation(nod, 3, "X") @ (mid - NOD_AT(B.head))


def seated_key_points() -> dict:
    """Where the couch has to be: key points of the seated figure in seat-frame centimetres."""
    rig, pts = seated_rig(), seated_points()
    helmet = [p for name, ps in pts.items() if name.startswith("Helmet_Shell") for p in ps]
    centre = rig.carry((0, -1.4, HELMET_MID))
    sides_ = (("left", 1), ("right", -1))
    return {
        **fl.body_key_points(rig, pts),
        "head_top": tuple(rig.carry((0, -1.4, HELMET_TOP))),
        # midway between the eyes, as the bowed head has them (figurelib.build_head puts each 3.15 cm off the middle)
        "eyes": tuple(rig.carry(eyes_at(math.radians(SEATED["head"])))),
        "helmet_centre": tuple(centre),
        "helmet_radius": max((p - centre).length for p in helmet),
        "helmet_back_z": min(p.z for p in helmet),
        "neck_ring": tuple(rig.carry((0, -0.6, up(158.5)))),
        "heels": {side: tuple(rig.carry((sx * B.stance, 8.2, 0.0), "leg")) for side, sx in sides_},
        "toes": {side: tuple(rig.carry((sx * B.stance, -23.0, 1.8), "leg")) for side, sx in sides_},
        "sole_y": max(p.y for p in pts["Boots_Soles"]),
    }


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str = "CrewCabin_Pilot", fit: Fit | None = None) -> dict:
    """The same figure on the couch, for a cabin: every mesh a child of `parent`, named
    `<prefix>_<Node>_<Mesh>`, with no ventilator (a stub of hose at the waist inlet instead).

    The seat frame is centimetres: origin midway between the hip joints, the torso along -Y (head
    toward -Y), the chest facing +Z, his right hand toward +X. `place` maps that frame, once it is
    in metres, into the caller's space; it is baked into the vertices. Returns seated_key_points().
    Nothing is built below the detail at which interiors are shown. With `fit`, he is that flight's
    man in that flight's suit (wear); without, whoever the suit was last made for (MR-3's until told)."""
    if fit is not None:
        wear(fit)
    keys = seated_key_points()
    if srlib.interior():
        fl.build_posed(parent, place, prefix, seated_rig, lambda: build_figure(ventilator=False))
    return keys
