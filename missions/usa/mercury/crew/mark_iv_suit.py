"""The Mercury pressure suit: B.F. Goodrich's Navy Mark IV, as Alan Shepard wore it to the pad for
Mercury-Redstone 3, with the portable ventilator that kept him cool on the way.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure
faces -Y, so his left is +X. See ./mark-iv-suit.md: the pilot's stature is the only published
length here. The body under the suit follows standard segment proportions for that stature;
everything about the suit itself (bulk, helmet, fittings, where the zipper runs) is read off
photographs and is an estimate. On the right chest are the NASA insignia and his name tag, as
photographed that day; there is no mission patch, because Mercury flights had none.

MR-3 configuration: gloves zipped to the sleeves, no wrist rings. MR-4 added the rings.

Top-level nodes: Helmet  Torso  Arms  Gloves  Legs  Boots  Ventilator  Skeleton

The standing figure is skinned to Skeleton, the joints every crew figure has (srlib.FIGURE), so
the viewer can walk him; the ventilator is not, and stays where it stands.

build() is the standing figure. build_seated() is the same man on the couch, for a cabin: the
figure is always modelled standing and carried to a pose by its joints (Rig, Bend).
"""

from __future__ import annotations

import math
import os
from collections.abc import Callable, Sequence

import bpy
import numpy as np
from mathutils import Matrix, Vector

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

# The man: Alan Shepard. His stature is the only published length; the body under the suit follows
# standard segment proportions for it, and the sections of trunk, arms and legs are figurelib's
# man of that height in a close suit, sized by eye from photographs of this one.
B = fl.man(stature=180.3, heel=2.8)
STATURE = B.stature  # 5 ft 11 in
fl.use(B)

HELMET_OVER_CROWN = 6.0  # liner, shell and clearance above the top of the head
BOOT_TOP = 27.0
BOOT_LENGTH = 31.2  # sole, toe to heel
NECK_RING_R = 12.5
HELMET_RX = 13.0  # shell half-width
HELMET_MID = 175.0  # height of the shell's widest section
HELMET_TOP = B.z_crown + HELMET_OVER_CROWN
HELMET_RIM = 159.4  # the shell's lower edge, inside the neck ring
VENT_SIZE = (16.0, 42.0, 30.0)  # ventilator case: width, length, height
VENT_AT = (47.0, -5.0)  # its centre on the floor, at his left


def materials() -> dict:
    def m(name: str, *args, image: Callable[[], bpy.types.Image] | None = None) -> bpy.types.Material | None:
        if fl.rig().dry:
            return None
        # one of each in a file: the seated figure shares the standing one's, and the caller's
        return bpy.data.materials.get(name) or material(name, *args, image=image() if image else None)

    return {
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
    k = smooth(z, 160.0, 172.0)
    r = helmet_r(z)
    return Vector((r * math.sin(phi), -0.6 - 0.8 * k - r * (1 + 0.12 * k) * math.cos(phi), z))


def helmet_normal(phi: float, z: float) -> Vector:
    a = helmet_point(phi + 0.02, z) - helmet_point(phi - 0.02, z)
    b = helmet_point(phi, z + 0.2) - helmet_point(phi, z - 0.2)
    return a.cross(b).normalized()


def helmet_at(phi: float, z: float, off: float = 0.0) -> Vector:
    return helmet_point(phi, z) + helmet_normal(phi, z) * off


def build_helmet(M: dict) -> None:
    g = group("Helmet")
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
    half_phi, zv, hv = math.radians(56), 173.0, 8.8

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
        shell.lathe([(2.6, 0.0), (2.6, 0.7), (2.2, 1.0), (0.0, 1.0)], 24, matrix=frame(helmet_at(phi, 171.5, -0.5), helmet_normal(phi, 171.5)))

    # the man inside: a face for the visor to have behind it. Nobody's likeness.
    head, cap, dark, eyes, hair, lips = (MeshBuilder() for _ in range(6))
    hc = B.head
    build_head(head, eyes, dark, hair, lips)
    head.tube((0, 1.0, 150.0), (0, 0.4, hc.z - 6.0), 5.6, 24)  # neck
    # the white communications cap: a bowl over the crown and the back of the head, standing
    # off the scalp all round so that the two never meet at any level of detail
    bowl = Matrix.Diagonal((8.2, 10.3, 11.8, 1.0)) @ Matrix.Rotation(math.radians(-50), 4, "X")
    cap.lathe(arc_profile(0, 0, 1.0, -15, 90, 14), 40, matrix=Matrix.Translation(hc) @ bowl)
    # lip microphone on its boom from the left ear
    dark.tube((7.4, hc.y - 2.0, hc.z - 4.0), (2.2, hc.y - 10.6, hc.z - 6.0), 0.3, 8)
    dark.box((1.8, 1.0, 1.2), Matrix.Translation((1.4, hc.y - 10.8, hc.z - 6.0)))

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
            (9.8, 156.6),
            (12.2, 156.6),
            (NECK_RING_R, 157.0),
            (NECK_RING_R, 158.1),
            (12.1, 158.3),
            (12.1, 158.7),
            (NECK_RING_R, 158.9),
            (NECK_RING_R, 159.9),
            (12.1, 160.3),
            (10.8, 160.3),
        ],
        64,
        matrix=Matrix.Translation((0, -0.6, 0)),
    )

    # suit outlet, low on the right: exhaled oxygen leaves here when the visor is shut
    phi = math.radians(-112)
    m = frame(helmet_at(phi, 166.0, -0.5), helmet_normal(phi, 166.0))
    fit.lathe([(2.0, 0.0), (2.0, 1.5), (1.65, 1.7), (1.65, 3.1), (1.25, 3.1)], 24, matrix=m)
    port.lathe([(1.3, 2.7), (0.0, 2.7)], 24, matrix=m)
    # visor seal connector by the left jaw
    phi = math.radians(47)
    m = frame(helmet_at(phi, 163.2, -0.3), helmet_normal(phi, 163.2))
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


def torso_tube() -> Tube:
    t = Tube([(0, 0, z) for z, _, _ in B.torso], [(a, b) for _, a, b in B.torso], resample=10)

    def fold(d: float, th: float) -> float:
        z = B.torso_z0 + d
        front, back = max(0.0, -math.sin(th)), max(0.0, math.sin(th))
        f = squareness(th, 2.5) * (1 - smooth(z, 148.0, 156.0))
        f += 0.05 * back * back * gauss(z, 94, 7)  # seat
        f += 0.035 * front * gauss(z, 134, 9)  # chest
        f -= 0.04 * back * gauss(z, 112, 8)  # small of the back
        f += 0.04 * back * gauss(z, 138, 9)  # shoulder blades
        f -= 0.03 * front * gauss(z, 114, 6)  # the cloth falls in under the chest: the suit is not inflated
        return f

    def flat(d: float, th: float) -> float:
        """0 where a fitting lies and the cloth has to stay smooth under it, 1 in the open."""
        z, a = B.torso_z0 + d, azimuth(th)
        (z0, a0), (z1, a1) = ZIP
        on_zip = abs(a - (a0 + (a1 - a0) * (z - z0) / (z1 - z0))) * 0.3 if z1 - 2 < z < z0 + 2 else 99.0  # about 0.3 cm a degree
        keep = smooth(on_zip, 2.4, 4.5)
        keep *= smooth(math.hypot(z - INLET[0], (a - INLET[1]) * 0.3), 4.0, 6.5)
        return keep

    t.fold = fold
    # creases stop short of the straps, the zipper and the inlet
    t.relief = [
        Folds(106.0 - B.torso_z0, 118.5 - B.torso_z0, 6, 0.46, 0.5, spread=3.0, mask=flat),
        Folds(121.5 - B.torso_z0, 129.0 - B.torso_z0, 4, 0.36, 3.1, -TAU / 4, spread=1.5, width=0.7, mask=flat),  # slack under the chest
    ]
    return t


def build_torso(M: dict) -> tuple[Vector, Vector, dict[int, Tube], Tube]:
    """Returns the waist inlet's mouth and axis, for the ventilator hose, the arms' tubes and the torso's own."""
    g = group("Torso")
    shell, tape, teeth, web, steel, inlet, patch, tag = (MeshBuilder() for _ in range(8))
    t = torso_tube()
    build_insignia(t, patch, tag)
    arms = {sx: arm_tube(sx) for sx in (1, -1)}
    build_shell(shell, t, arms)

    def az(deg: float) -> float:  # azimuth from straight ahead toward his left -> theta
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - B.torso_z0

    # entry zipper, left collar to right waist
    zip_line = t.trace(d(ZIP[0][0]), d(ZIP[1][0]), az(ZIP[0][1]), az(ZIP[1][1]), 150)
    band(tape, zip_line, 2.4, 0.35, sink=0.4)
    band(teeth, zip_line[2:-2], 0.5, 0.2, lift=0.35, sink=0.2, bevel=0.1)
    p, nm = zip_line[5]
    teeth.box((0.9, 1.8, 0.8), frame(p + nm * 0.5, nm) @ Matrix.Rotation(math.radians(35), 4, "Z"))

    # helmet tie-down: stops the helmet rising when the suit is pressurised
    band(web, t.trace(d(156.0), d(139.5), az(0), az(0), 24), 2.2, 0.25)
    p, nm = t.at(d(146.5), az(0)), t.normal(d(146.5), az(0))
    buckle(steel, web, p, nm, (2.4, 3.6), spin=TAU / 4)

    # waist strap: it lies over the line where the shell ends and the trousers begin
    band(web, ring(t, d(B.waist_z), 72), 2.6, 0.4, closed=True)
    p, nm = t.at(d(B.waist_z), az(-14)), t.normal(d(B.waist_z), az(-14))
    buckle(steel, web, p + nm * 0.3, nm, (3.4, 3.8))

    # ventilation inlet at the left waist
    th = az(INLET[1])
    p, nm = t.at(d(INLET[0]), th), t.normal(d(INLET[0]), th)
    axis = (nm + Vector((0.25, -0.1, -0.45))).normalized()
    m = frame(p - axis * 0.9, axis)
    inlet.lathe([(3.0, 0.0), (3.0, 1.2), (2.2, 1.4), (2.2, 3.4), (2.5, 3.4), (2.5, 4.3), (1.45, 4.3)], 28, matrix=m)

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
INSIGNIA = (147.5, -24.0)  # the insignia's centre: (height, azimuth in degrees), 8 cm to the right of the middle
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


def name_tag_image() -> bpy.types.Image:
    """Dark blue leather with the pilot's name stamped on it in silver. Units are half the tag's width."""
    w, h = NAME_TAG
    art = Art("name-tag-shepard", 512, round(512 * h / w), 1.0, (0.045, 0.06, 0.13))
    x, y = art.xx, art.yy
    art.where((np.abs(np.abs(x) - 0.965) < 0.006) | (np.abs(np.abs(y) - (h / w - 0.035)) < 0.006), (0.16, 0.18, 0.26))  # a line of stitching
    art.text("A. B. SHEPARD", 1.36, (0.02, 0.0), (0.74, 0.75, 0.76), srlib.load_font())
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


def build_insignia(t: Tube, patch: MeshBuilder, tag: MeshBuilder) -> None:
    z, az = INSIGNIA

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
    alu.lathe([(2.4, 0.0), (2.4, 1.3), (2.15, 1.55), (1.9, 1.55), (1.9, 1.2)], 28, matrix=m)
    face.lathe([(1.95, 1.3), (0.0, 1.3)], 28, matrix=m)
    needle.box(
        (0.14, 1.5, 0.9), m @ Matrix.Rotation(0.7, 4, "Z") @ Matrix.Translation((0, 0.45, 1.25))
    )  # sunk well through the face, 2 mm proud of it

    emit(sleeves, "Arms_Sleeves", M["suit"], g)
    emit(strips, "Arms_LacingStrips", M["webbing"], g)
    emit(cords, "Arms_LacingCords", M["lace"], g)
    emit(eyelets, "Arms_Eyelets", M["steel"], g)
    emit(alu, "Arms_PressureGauge", M["aluminium"], g, sharp_angle=30)
    emit(face, "Arms_PressureGaugeFace", M["gauge"], g)
    emit(needle, "Arms_PressureGaugeNeedle", M["white"], g, smooth=False)


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, tape, teeth, web, steel = (MeshBuilder() for _ in range(5))
    fingers: list[float] = []
    for sx in (1, -1):
        hand, palm = fl.gloved_hand(shell, sx, arms[sx].path[-1] - arms[sx].path[-2], fingers)
        # MR-3: the glove zips to the sleeve all the way round. No wrist ring, so no rotation.
        zipper = ring(palm, 1.2, 32)
        band(tape, zipper, 1.5, 0.22, closed=True)
        band(teeth, zipper, 0.42, 0.18, lift=0.22, sink=0.2, bevel=0.08, closed=True)
        # restraint strap at the wrist
        band(web, ring(palm, 7.6, 28), 1.5, 0.32, closed=True)
        th = palm.toward(hand.B, 7.6)
        buckle(steel, web, palm.at(7.6, th, 0.25), palm.normal(7.6, th), (2.0, 2.4))

    shell.share = fingers
    emit(shell, "Gloves_Shell", M["suit"], g)
    emit(tape, "Gloves_ZipperTape", M["tape"], g, smooth=False)
    emit(teeth, "Gloves_ZipperTeeth", M["steel"], g, smooth=False)
    emit(web, "Gloves_Straps", M["webbing"], g, smooth=False)
    emit(steel, "Gloves_Buckles", M["steel"], g, smooth=False)


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
        Folds(t.key_d(2) - 2.0, t.key_d(2) + 3.5, 4, 0.3, 2.6 * sx, t.toward((-sx, -0.6, 0), t.key_d(2)), spread=1.0),  # the groin
        Folds(t.key_d(7) - 0.5, t.key_d(7) + 4.3, 3, 0.3, 0.3 * sx, spread=3.0),  # bunched over the boot
    ]
    return t


def build_legs(M: dict, torso: Tube) -> None:
    g = group("Legs")
    legs, strips, cords, eyelets, flap, snaps = (MeshBuilder() for _ in range(6))
    tubes = {sx: leg_tube(sx) for sx in (1, -1)}
    Trousers(torso, tubes).build(legs)
    for sx in (1, -1):
        t = tubes[sx]
        d_knee = t.key_d(5)
        out = t.toward((sx, 0.15, 0), d_knee)
        lacing(t, t.key_d(2) + 5.0, d_knee - 8.5, out, 2.6, strips, cords, eyelets)
        lacing(t, d_knee + 8.5, t.key_d(7) - 3.0, out, 2.4, strips, cords, eyelets)
        if sx == -1:
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
    emit(flap, "Legs_BiomedFlap", M["suit"], g)
    emit(snaps, "Legs_BiomedSnaps", M["steel"], g)


# --------------------------------------------------------------------------- boots


def build_boots(M: dict) -> None:
    g = group("Boots")
    uppers, soles, laces, eyelets, tongue = (MeshBuilder() for _ in range(5))
    fl.laced_boots(uppers, soles, laces, eyelets, tongue, BOOT_TOP, BOOT_LENGTH)

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
    case, hard, grille, hose, fit = (MeshBuilder() for _ in range(5))
    wx, ly, hz = VENT_SIZE
    cx, cy = VENT_AT
    feet = 1.2
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
    for y in (-11.0, 13.0):  # lid latches on the outboard face
        hard.box((0.7, 3.0, 4.4), Matrix.Translation((cx + wx / 2, cy + y, top - 5.0)))
    for dx in (-1, 1):
        for dy in (-1, 1):
            hard.tube((cx + dx * 5.0, cy + dy * 16.0, 0.0), (cx + dx * 5.0, cy + dy * 16.0, feet + 0.6), 1.3, 12)
    for k in range(6):  # blower louvres
        grille.box((0.6, 16.0, 1.0), Matrix.Translation((cx + wx / 2, cy, feet + 6.0 + k * 2.1)))
    # hose: out of the top of the case, up and across to the inlet at his left waist
    py = cy - 15.0
    fit.lathe([(2.9, -0.4), (2.9, 0.9), (2.3, 1.1), (2.3, 3.2), (1.45, 3.2)], 28, matrix=Matrix.Translation((cx, py, top)))
    keys = [
        (cx, py, top + 1.5),
        (cx, py, top + 8.0),
        (cx - 1.5, py - 4.0, top + 20.0),
        (cx - 9.0, py - 9.0, 68.0),
        (cx - 19.0, py - 8.0, 84.0),
        tuple(inlet + axis * 16.0),
        tuple(inlet + axis * 6.0),
        tuple(inlet - axis * 1.2),
    ]
    pts = polyline(keys, 0.4)
    Tube(pts, [(HOSE_R, HOSE_R)] * len(pts), resample=1, fold=lambda d, th: 0.085 * math.sin(TAU * d / HOSE_PITCH)).add(hose, 12)

    emit(case, "Ventilator_Case", M["aluminium"], g)
    emit(hard, "Ventilator_Hardware", M["steel"], g, sharp_angle=30)
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
    M = materials()
    build_helmet(M)
    inlet, axis, arms, torso = build_torso(M)
    fl.rig().inlet = (inlet, axis)
    build_arms(M, arms)
    build_gloves(M, arms)
    build_legs(M, torso)
    build_boots(M)
    if ventilator:
        build_ventilator(M, inlet, axis)
    else:
        build_hose_stub(M, inlet, axis)


def build() -> float:
    """Builds the standing figure and returns its height in metres."""
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


def seated_key_points() -> dict:
    """Where the couch has to be: key points of the seated figure in seat-frame centimetres."""
    rig, pts = seated_rig(), seated_points()
    helmet = [p for name, ps in pts.items() if name.startswith("Helmet_Shell") for p in ps]
    centre = rig.carry((0, -1.4, HELMET_MID))
    sides_ = (("left", 1), ("right", -1))
    return {
        **fl.body_key_points(rig, pts),
        "head_top": tuple(rig.carry((0, -1.4, HELMET_TOP))),
        "helmet_centre": tuple(centre),
        "helmet_radius": max((p - centre).length for p in helmet),
        "helmet_back_z": min(p.z for p in helmet),
        "neck_ring": tuple(rig.carry((0, -0.6, 158.5))),
        "heels": {side: tuple(rig.carry((sx * B.stance, 8.2, 0.0), "leg")) for side, sx in sides_},
        "toes": {side: tuple(rig.carry((sx * B.stance, -23.0, 1.8), "leg")) for side, sx in sides_},
        "sole_y": max(p.y for p in pts["Boots_Soles"]),
    }


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str = "CrewCabin_Pilot") -> dict:
    """The same figure on the couch, for a cabin: every mesh a child of `parent`, named
    `<prefix>_<Node>_<Mesh>`, with no ventilator (a stub of hose at the waist inlet instead).

    The seat frame is centimetres: origin midway between the hip joints, the torso along -Y (head
    toward -Y), the chest facing +Z, his right hand toward +X. `place` maps that frame, once it is
    in metres, into the caller's space; it is baked into the vertices. Returns seated_key_points().
    Nothing is built below the detail at which interiors are shown."""
    keys = seated_key_points()
    if srlib.interior():
        fl.build_posed(parent, place, prefix, seated_rig, lambda: build_figure(ventilator=False))
    return keys
