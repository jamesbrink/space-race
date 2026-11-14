"""The people on the ground at a Soviet launch: clothed standing figures for a place's scenery. See ./ground-party.md.

A crew figure (sk_1.py) is one man at a hundred thousand triangles, skinned so that the viewer can walk him. A launch
pad on the morning of a flight has forty or fifty people on it, standing. So these are another kind of figure on the
same body: the measures and joints are figurelib's (`figurelib.man`, scaled to a stature and a build), the face is
figurelib's face read at a few dozen points, and the clothes are a handful of plain forms over them, at some 1,700
triangles a man (700 at the far levels of detail). They are posed once, standing, and are not walked: a figure is
meshes in its group's node, one mesh a material, so a group of eight is a dozen draws.

What a figure is made from:
  a man        stature and build (`Person`), and how he stands: each arm's pose, how far his feet are apart and which is
               forward, which way his head is turned
  a dress      what he wears (`Dress`): the upper garment and how far down it comes, trousers, what is on his head, an
               armband, shoulder boards, stripes down the trousers, high boots
The dresses below are the ones the film and the photographs of 12 April 1961 show at Site 1 (the sources are in
ground-party.md): a marshal and generals in service tunics, officers in tunics and peaked caps with no greatcoats, the
chief designer in a dark overcoat and a velour hat, civilians in dark coats and hats, workers in navy hooded anoraks
with red armbands, medics in white coats, a cameraman.

Dimensions are centimetres, as figurelib's are: the origin is the ground between the feet, +Z up, and the figure faces
-Y, so its left is +X. `stand()` sets it down on a site in metres.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, replace

from mathutils import Matrix, Vector

import figurelib
import srlib
from srlib import CM, MeshBuilder, material

# ------------------------------------------------------------------------------ materials

# Cloth is named `suit-…` so that the viewer gives it a cloth's grain (stage.ts: WORN, ROUGH_SURFACE). The tones are
# read off the colour film and two colour photographs of the morning and cleaned, as the look asks: estimated.
CLOTH = {
    "skin": ("skin", (0.62, 0.42, 0.33), 0.0, 0.7),
    "hair": ("hair-dark", (0.05, 0.04, 0.035), 0.0, 0.8),
    "fair": ("hair-fair", (0.42, 0.3, 0.16), 0.0, 0.8),
    "grey-hair": ("hair-grey", (0.4, 0.4, 0.39), 0.0, 0.8),
    "black": ("suit-wool-black", (0.035, 0.036, 0.04), 0.0, 0.9),
    "navy": ("suit-cotton-navy", (0.05, 0.07, 0.14), 0.0, 0.9),
    "olive": ("suit-wool-olive", (0.2, 0.2, 0.11), 0.0, 0.9),
    "khaki": ("suit-wool-khaki", (0.3, 0.27, 0.17), 0.0, 0.9),
    "grey": ("suit-wool-grey", (0.24, 0.25, 0.26), 0.0, 0.9),
    "tan": ("suit-cotton-tan", (0.5, 0.42, 0.3), 0.0, 0.9),
    "white": ("suit-cotton-white", (0.82, 0.82, 0.79), 0.0, 0.9),
    "red": ("suit-cloth-red", (0.58, 0.05, 0.04), 0.0, 0.85),
    "blue": ("suit-cloth-blue", (0.1, 0.22, 0.5), 0.0, 0.85),
    "gold": ("braid-gold", (0.62, 0.47, 0.16), 0.7, 0.45),
    "leather": ("leather-black", (0.02, 0.02, 0.022), 0.1, 0.45),
}


def materials() -> dict:
    """The materials a party wears, by key: add them to a site's own (`parts.M.update(...)`)."""
    return {key: material(*spec) for key, spec in CLOTH.items()}


# ------------------------------------------------------------------------------ what a man wears, and how he stands


@dataclass
class Dress:
    """What a man wears. `coat` is the upper garment: its material, how far down it comes (`hem`: a share of the way
    from the crotch (0) to the ground (1); negative is above the crotch), how loose it is (`bulk`, centimetres let out
    round the trunk), and its collar ("stand", "turned", "hood" or None)."""

    coat: str
    hem: float = -0.06
    bulk: float = 1.5
    collar: str | None = "stand"
    trousers: str = "black"
    hat: str | None = None  # "cap", "fedora", "flat", "beret"
    hat_colour: str = "olive"  # a cap's crown; a hat's felt
    band: str = "black"  # a cap's band; a hat's ribbon
    hair: str = "hair"
    armband: str | None = None  # its material, on the left arm
    boards: str | None = None  # shoulder boards' material
    stripes: str | None = None  # down the trousers' outer seams
    boots: bool = False  # high boots, the trousers tucked in
    buttons: str | None = None  # a row down the front
    shirt: str | None = None  # an open collar: what shows in the V


@dataclass
class Person:
    dress: Dress
    stature: float = 172.0
    build: float = 1.0  # girth beside figurelib's man
    arms: tuple[str, str] = ("down", "down")  # left, right: a key of ARMS
    feet: tuple[float, float] = (1.0, 0.0)  # how far apart beside the body's own stance; the left foot forward of the right, cm
    turn: float = 0.0  # the head, degrees to his left
    nod: float = 0.0  # and down
    lean: float = 0.0  # the trunk forward, degrees
    carries: str | None = None  # "camera"
    who: str = ""


def marshal() -> Dress:
    """A Marshal of the Soviet Union in everyday service dress, as the colour photograph of Moskalenko beside Gagarin
    has him: an open-collared olive tunic over a shirt and tie, gold shoulder boards, a cap with a red band."""
    return Dress(
        "olive", hem=0.02, hat="cap", hat_colour="khaki", band="red", boards="gold", stripes="red", trousers="navy", shirt="khaki", buttons="gold"
    )


def general() -> Dress:
    """A general of the air force: the film has one with red-striped trousers and a red-banded cap walking beside
    the pilot. (Aviation's band was blue and its generals' stripes blue; the film's are red, and the film is followed.)"""
    return Dress("olive", hem=0.02, hat="cap", hat_colour="olive", band="red", boards="gold", stripes="red", trousers="navy", buttons="gold")


def officer(band: str = "black") -> Dress:
    """An officer in a closed tunic and a peaked cap, no greatcoat (the film): the band black for the artillery and
    rocket troops, blue for aviation."""
    return Dress("olive", hem=0.02, hat="cap", hat_colour="olive", band=band, boards="gold", trousers="navy", buttons="gold")


def worker(hat: str | None = None, hair: str = "hair") -> Dress:
    """A man of the launch crew: a navy hooded anorak pulled over the head, its hood down, a red armband, navy
    trousers (the film, at the bus and at the lift's landing)."""
    return Dress("navy", hem=-0.02, bulk=4.0, collar="hood", trousers="navy", hat=hat, hat_colour="black", armband="red", hair=hair)


def overcoat(hat: str = "fedora", coat: str = "black", felt: str = "black") -> Dress:
    """A civilian in a dark overcoat and a hat: the chief designer's was dark, his hat black velour (Golovanov)."""
    return Dress(coat, hem=0.52, bulk=3.5, collar="turned", trousers="black", hat=hat, hat_colour=felt, band="leather")


def jacket(coat: str = "grey", hat: str | None = "flat", armband: str | None = None) -> Dress:
    """A civilian in a suit jacket: a colour photograph has one in grey with a flat cap and a red armband."""
    return Dress(coat, hem=-0.04, bulk=2.0, collar="turned", trousers="black", hat=hat, hat_colour=coat, armband=armband, shirt="white")


def medic(hair: str = "hair") -> Dress:
    """A doctor in a white coat to the knee, bare-headed (the film; a colour photograph)."""
    return Dress("white", hem=0.42, bulk=2.5, collar="turned", trousers="black", hair=hair, shirt="white")


def raincoat() -> Dress:
    """A man in a pale raincoat: one stands among the dark coats in the film's view from above."""
    return Dress("tan", hem=0.5, bulk=3.0, collar="turned", trousers="black", hat="flat", hat_colour="grey")


# Each arm's pose, for the left arm (the right is its mirror): which way the upper arm points from the shoulder, where
# the wrist is carried to from the elbow, and which way the palm faces. All unit-less directions in the figure's frame
# (+X his left, -Y ahead, +Z up).
ARMS = {
    "down": ((0.13, 0.03, -0.99), (0.07, -0.18, -0.98), (1, 0, 0)),
    "back": ((0.1, 0.22, -0.97), (-0.55, 0.45, -0.7), (0, 1, 0)),  # hands behind the back
    "front": ((0.12, -0.1, -0.99), (-0.55, -0.45, -0.7), (0, -1, 0)),  # hands together in front
    "pocket": ((0.14, 0.06, -0.99), (-0.42, 0.02, -0.91), (1, 0, 0)),  # the hand in the coat's or the trousers' pocket: not drawn
    "hip": ((0.45, 0.25, -0.86), (-0.68, -0.15, -0.72), (0, 1, 0)),
    "wave": ((0.42, -0.2, 0.88), (0.02, -0.2, 0.98), (0, -1, 0)),
    "cap": ((0.5, -0.3, 0.81), (-0.75, 0.05, 0.66), (0, -1, 0)),  # waving a cap, or a hand at the brow
    "salute": ((0.75, -0.25, 0.3), (-0.93, 0.02, 0.36), (0, 0, -1)),
    "camera": ((0.31, -0.93, -0.2), (-0.7, 0.1, 0.71), (-1, 0, 0)),  # both hands at a camera held to the eye
    "point": ((0.2, -0.85, -0.2), (0.05, -0.97, 0.22), (1, 0, 0)),
    "chest": ((0.18, -0.3, -0.94), (-0.8, -0.42, 0.42), (0, -1, 0)),  # a hand to the chest, or holding a lapel
}


def coarse() -> bool:
    """Whether this is a far level of detail: fewer sides, no small things."""
    return srlib.DETAIL < 0.5


def _n(sides: int) -> int:
    return max(5, round(sides * (0.6 if coarse() else 1.0)))


class _Figure:
    """One figure's meshes, by material key, in centimetres."""

    def __init__(self) -> None:
        self.mb: dict[str, MeshBuilder] = {}

    def __call__(self, key: str) -> MeshBuilder:
        return self.mb.setdefault(key, MeshBuilder())

    def tube(
        self,
        key: str,
        pts: Sequence[Sequence[float]],
        radii: Sequence[tuple[float, float]],
        segs: int,
        ref=(0, 1, 0),
        caps=(True, True),
        fine: int = 2,
    ) -> None:
        self(key).loft([tuple(p) for p in pts], list(radii), _n(segs), ref=ref, resample=1 if coarse() else fine, caps=caps)

    def lathe(self, key: str, prof: Sequence[tuple[float, float]], segs: int, matrix: Matrix, arc: tuple[float, float] | None = None) -> None:
        if arc:
            self(key).lathe(list(prof), _n(segs), matrix=matrix, arc=arc)
        else:
            self(key).lathe(list(prof), _n(segs), matrix=matrix)

    def turned(self, by: Matrix) -> None:
        for mb in self.mb.values():
            mb.verts = [tuple(by @ Vector(v)) for v in mb.verts]

    def into(self, out, place: Matrix) -> int:
        """Add everything to `out(key)` (a site's MeshBuilders, metres), set down by `place`. Returns the triangles."""
        tris = 0
        for key, mb in self.mb.items():
            out(key).add(mb.verts, mb.faces, [(u * CM, v * CM) for u, v in mb.uvs], matrix=place)
            tris += sum(len(f) - 2 for f in mb.faces)
        return tris


def _unit(v) -> Vector:
    return Vector(v).normalized()


def figure(p: Person) -> _Figure:
    """A person, standing, in centimetres."""
    d = p.dress
    body = figurelib.man().scaled(p.stature, 2.5, 0.97 + 0.03 * p.build, p.build)
    figurelib.use(body)
    f = _Figure()
    zc, zk = body.z_crotch, body.z_knee
    hem = zc - d.hem * (zc - 4.0) if d.hem >= 0 else zc - d.hem * 60.0
    lean = Matrix.Translation((0, 0, body.z_hip)) @ Matrix.Rotation(math.radians(p.lean), 4, "X") @ Matrix.Translation((0, 0, -body.z_hip))

    # ---- the legs: trousers from inside the coat to the shoe, or to a high boot's top
    spread, step = p.feet
    for sx in (1, -1):
        fwd = -step / 2 * sx  # the left foot forward of the right by `step`: -Y is ahead
        rows = [body.leg[i] for i in (1, 3, 5, 7, 8)]  # the hip, the thigh, the knee, the calf, the ankle
        z_top = rows[0][2]
        path, radii = [], []
        for x, y, z, a, b in rows:
            t = (z_top - z) / (z_top - 8.0)
            path.append((sx * x * (1 + (spread - 1) * t), y + fwd * t, z))
            radii.append((a + 0.6, b + 0.6))
        ax, ay = sx * body.stance * spread, body.ankle_y + fwd
        if d.boots:
            cut = next(i for i, r in enumerate(rows) if r[2] < zk - 6.0)
            f.tube(
                d.trousers,
                [*path[:cut], (path[cut][0], path[cut][1], zk - 9.0)],
                [*radii[:cut], (radii[cut][0] + 1.2, radii[cut][1] + 1.2)],
                12,
                fine=1,
            )
            shaft = [(path[cut][0], path[cut][1], zk - 7.0), *path[cut:], (ax, ay, 9.0)]
            f.tube(
                "leather", shaft, [(radii[cut][0] + 0.4, radii[cut][1] + 0.4), *[(a + 0.2, b + 0.2) for a, b in radii[cut:]], (4.6, 5.0)], 12, fine=1
            )
        else:
            f.tube(d.trousers, [*path, (ax, ay, 5.0)], [*radii, (5.4, 6.4)], 12, fine=1)
            if d.stripes:
                # a stripe down the outer seam: a ridge standing on the cloth, from the hip to the cuff
                f.tube(
                    d.stripes,
                    [(q[0] + sx * (r[0] + 0.1), q[1], q[2]) for q, r in zip(path[1:], radii[1:])] + [(ax + sx * 5.5, ay, 5.5)],
                    [(0.45, 1.9)] * len(path),
                    4,
                    caps=(True, True),
                    fine=1,
                )
        # the shoe: heel to toe, turned out a little
        out = math.radians(9.0 * sx)
        toe = Vector((math.sin(out), -math.cos(out), 0.0))
        shoe = [(-9.0, 3.3, 3.2, 3.1), (-3.5, 4.4, 3.7, 3.7), (6.0, 4.9, 3.2, 3.2), (15.0, 4.5, 2.3, 2.3), (19.5, 2.8, 1.5, 1.6)]
        f.tube(
            "leather", [(ax + toe.x * s, ay + toe.y * s, zc_) for s, _, _, zc_ in shoe], [(a, b) for _, a, b, _ in shoe], 10, ref=(0, 0, 1), fine=1
        )

    # ---- the seat of the trousers, under the coat's hem
    f.tube(
        d.trousers,
        [(0, 0, zc - 6.0), (0, 0, zc + 2.0), (0, 0, zc + 14.0)],
        [(13.0 * p.build, 10.0 * p.build), (16.0 * p.build, 11.5 * p.build), (16.5 * p.build, 11.5 * p.build)],
        12,
    )

    # ---- the coat: the trunk's own sections from the waist up, and below the waist a skirt down to the hem
    # (the body's own table runs on up into a suit's neck ring: a coat stops at the shoulders' slope, and the neck is its own)
    slope = body.neck_z - 4.0
    trunk = [(z, a + d.bulk, b + d.bulk) for z, a, b in body.torso if body.waist_z - 1.0 <= z <= slope]
    neck_r = 7.6 + 0.3 * d.bulk
    trunk.append((body.neck_z - 1.2, neck_r, 7.2 + 0.3 * d.bulk))
    hip_a, hip_b = max(a for z, a, b in body.torso if z < body.waist_z) + d.bulk, max(b for z, a, b in body.torso if z < body.waist_z) + d.bulk
    flare = max(0.0, (zc - hem) / 60.0)  # a longer coat hangs wider
    skirt = [(hem, hip_a + 3.0 + 5.0 * flare, hip_b + 2.2 + 5.0 * flare)]
    if hem < zc - 12.0:
        skirt.append(((hem + zc) / 2, hip_a + 2.4 + 3.0 * flare, hip_b + 1.6 + 3.0 * flare))
    skirt.append((zc + 6.0, hip_a + 1.6, hip_b + 0.9))
    rows = [*skirt, *trunk]
    coat = _Figure()
    coat.tube(d.coat, [(0, 0.6, z) for z, _, _ in rows], [(a, b) for _, a, b in rows], 16, fine=1)
    z_neck = rows[-1][0]
    if d.collar == "stand":
        coat.lathe(
            d.coat,
            [(neck_r - 1.2, z_neck - 1.0), (neck_r + 0.6, z_neck - 1.0), (neck_r + 0.3, z_neck + 3.2), (neck_r - 1.2, z_neck + 3.2)],
            12,
            Matrix.Translation((0, 0, 0)),
        )
    elif d.collar == "turned":
        coat.lathe(
            d.coat,
            [(neck_r - 1.0, z_neck + 2.6), (neck_r + 4.6, z_neck - 2.4), (neck_r + 4.3, z_neck - 3.2), (neck_r - 1.0, z_neck - 2.6)],
            12,
            Matrix.Translation((0, 0.8, 0)),
        )
    elif d.collar == "hood":
        # the hood, down: a soft roll round the neck and a bag behind it
        coat.lathe(
            d.coat,
            [(neck_r - 1.0, z_neck + 2.8), (neck_r + 3.2, z_neck + 1.2), (neck_r + 3.6, z_neck - 1.5), (neck_r - 1.0, z_neck - 2.6)],
            12,
            Matrix.Translation((0, 0.8, 0)),
        )
        bag = [(0.0, -9.0), (6.5, -7.0), (9.0, 0.0), (6.5, 6.0), (0.0, 7.5)]
        coat.lathe(
            d.coat,
            bag,
            10,
            Matrix.Translation((0, 12.5, z_neck - 5.0)) @ Matrix.Rotation(math.radians(-18), 4, "X") @ Matrix.Diagonal((1.15, 0.55, 1.0, 1.0)),
        )
    if d.shirt:
        # an open collar: the shirt in the V, standing a little proud of the coat's front, and a dark tie down it
        def front(x: float, z: float, off: float) -> tuple[float, float, float]:
            a, b = _at(rows, z)
            return (x, 0.6 - b * math.sqrt(max(0.0, 1 - (x / a) ** 2)) - off, z)

        # (a strip a level, and a level at each of the coat's own rows, so that it lies off the cloth all the way down)
        za, zb = z_neck - 2.0, z_neck - 14.0
        heights = sorted({za, zb, *[z for z, _, _ in rows if zb < z < za]}, reverse=True)
        for key, half, off in ((d.shirt, 4.6, 1.0), ("leather", 1.3, 1.7)):
            levels = [(z, half * (z - zb) / (za - zb)) for z in heights]
            verts = [front(s * w, z, off) for z, w in levels for s in (-1, 1)]
            coat(key).add(verts, [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(len(levels) - 1)])
    if d.buttons and not coarse():
        zt = z_neck - 18.0 if d.shirt else z_neck - 5.0
        for k in range(3 if d.shirt else 5):
            z = zt - k * 9.0
            b_at = _at(rows, z)[1]
            coat.lathe(
                d.buttons,
                [(0.0, -0.5), (1.0, -0.5), (0.7, 0.3), (0.0, 0.55)],
                6,
                Matrix.Translation((0, 0.6 - b_at - 0.1, z)) @ Matrix.Rotation(math.radians(90), 4, "X"),
            )

    # ---- the arms: a sleeve from the shoulder to the wrist, a hand, an armband, a shoulder board
    row = body.arm
    upper = (Vector(row[4][:3]) - Vector(row[1][:3])).length
    fore = (Vector(row[7][:3]) - Vector(row[4][:3])).length
    out_ = d.bulk * 0.45
    for side, sx in enumerate((1, -1)):
        u, w, palm = (Vector((sx * v[0], v[1], v[2])) for v in ARMS[p.arms[side]])
        u, w, palm = u.normalized(), w.normalized(), palm.normalized()
        s = Vector((sx * row[1][0], row[1][1], row[1][2]))
        e = s + u * upper
        wrist = e + w * fore
        # (a coat's shoulder is not a pressure suit's: it starts lower and further in. Nothing is put through the points
        # but straight lines: a sharp bend drawn as a curve folds over. An easy elbow is rounded over two rings, one each
        # side of it; a sharp one, an arm folded back on itself, is one ring across the fold)
        first = Vector((sx * (row[0][0] + 1.5), row[0][1], row[0][2] - 3.0))
        head_r, mid_r, elbow_r, fore_r, cuff_r = (
            (row[1][3] - 0.7, row[1][4] - 0.3),
            row[3][3:],
            row[4][3:],
            row[5][3:],
            (row[7][3] + 0.5, row[7][4] + 0.5),
        )
        if u.dot(w) < -0.2:
            # (the forearm a few millimetres slighter than the upper arm, as it is: where the two lie along each other
            # inside the fold their sides would otherwise be one surface drawn twice)
            runs = [
                ([first, s, s + u * (upper * 0.5), e + u * 1.5], [row[0][3:], head_r, mid_r, elbow_r]),
                ([e - w * 1.5, e + w * (fore * 0.6), wrist], [(elbow_r[0] - 0.5, elbow_r[1] - 0.5), (fore_r[0] - 0.3, fore_r[1] - 0.3), cuff_r]),
            ]
        else:
            runs = [
                (
                    [first, s, s + u * (upper * 0.5), e - u * 4.5, e + w * 4.5, e + w * (fore * 0.6), wrist],
                    [row[0][3:], head_r, mid_r, elbow_r, elbow_r, fore_r, cuff_r],
                )
            ]
        for pts, rad in runs:
            coat.tube(d.coat, pts, [(a + out_, b + out_) for a, b in rad], 12, ref=(0, 1, 0.01), fine=1)
        if d.armband and sx > 0:
            a, b = row[3][3:]
            coat.tube(
                d.armband, [s + u * (upper * 0.42), s + u * (upper * 0.66)], [(a + out_ + 0.5, b + out_ + 0.5)] * 2, 14, ref=(0, 1, 0.01), fine=1
            )
        if d.boards:
            # a shoulder board, lying on the coat's slope from the collar out to the sleeve's head
            (z1, a1, _), (z2, a2, _) = rows[-2], rows[-1]
            at_r = (a1 + a2) / 2 + 1.5
            z_on = z1 + (a1 - at_r) / (a1 - a2) * (z2 - z1)
            tilt = math.atan2(z2 - z1, a1 - a2)
            m = Matrix.Translation((sx * at_r, 0.6, z_on + 0.9)) @ Matrix.Rotation(tilt * sx, 4, "Y")
            coat(d.boards).box((min(12.0, a1 - a2 - 1.0), 5.6, 1.0), m)
        if p.arms[side] == "pocket":
            continue  # the hand is in the pocket
        # the hand: a mitt along the forearm's line, and a thumb
        k = body.hand
        across = palm.cross(w)
        across = across.normalized() if across.length > 1e-3 else Vector((1, 0, 0)).cross(w).normalized()
        flat = across.cross(w).normalized()  # square to the hand's back
        # (the fingers hang a little curled, toward the palm)
        hand = [wrist - w * 1.0, wrist + w * (4.5 * k), wrist + w * (9.5 * k) - flat * (0.8 * k), wrist + w * (14.5 * k) - flat * (3.0 * k)]
        coat.tube("skin", hand, [(2.9 * k, 2.4 * k), (4.5 * k, 2.2 * k), (4.3 * k, 2.0 * k), (2.9 * k, 1.5 * k)], 8, ref=tuple(flat), fine=1)
        thumb = wrist + w * (4.5 * k) + across * (3.6 * k * sx)
        coat.tube(
            "skin",
            [thumb, thumb + (w + across * (0.7 * sx)).normalized() * (5.5 * k)],
            [(1.25 * k, 1.25 * k), (0.9 * k, 0.9 * k)],
            6,
            ref=tuple(flat),
            fine=1,
        )
    coat.turned(lean)
    for key, mb in coat.mb.items():
        f(key).add(mb.verts, mb.faces, mb.uvs)

    # ---- the neck, the head and what is on it: turned together
    top = _Figure()
    head = body.head
    top.tube("skin", [(0, 0.5, z_neck - 3.0), (0, -0.2, head.z - 6.0)], [(5.6 * p.build**0.5, 6.0 * p.build**0.5), (5.2, 5.6)], 9, fine=1)
    _head(top, body, d)
    if d.hat:
        _hat(top, body, d)
    nod = (
        Matrix.Translation((0, head.y + 3.0, head.z - 9.0))
        @ Matrix.Rotation(math.radians(p.turn), 4, "Z")
        @ Matrix.Rotation(math.radians(-p.nod), 4, "X")
    )
    top.turned(lean @ nod @ Matrix.Translation((0, -head.y - 3.0, 9.0 - head.z)))
    for key, mb in top.mb.items():
        f(key).add(mb.verts, mb.faces, mb.uvs)

    if p.carries == "camera":
        # a hand-held cine camera at the eye (the film: a cameraman walks backward before the party with one): a body, a
        # lens, a magazine on its top. Estimated: a Konvas of the kind the newsreel men carried.
        c = lean @ Vector((0.0, head.y - body.skull[1] - 10.5, head.z + 0.5))
        m = Matrix.Translation(c)
        f("leather").box((7.5, 15.0, 11.0), m)
        f("leather").lathe(
            [(0.0, 0.0), (3.2, 0.0), (3.4, 6.5), (0.0, 6.5)],
            _n(10),
            matrix=m @ Matrix.Translation((0, -7.0, 0.5)) @ Matrix.Rotation(math.radians(90), 4, "X"),
        )
        f("grey").lathe(
            [(0.0, -2.2), (6.5, -2.2), (6.5, 2.2), (0.0, 2.2)],
            _n(12),
            matrix=m @ Matrix.Translation((0, 2.0, 10.5)) @ Matrix.Rotation(math.radians(90), 4, "Y"),
        )
    return f


def _at(rows, z: float) -> tuple[float, float]:
    """A coat's half-width and half-depth at a height: straight between its rows."""
    for (z0, a0, b0), (z1, a1, b1) in zip(rows, rows[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            return a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
    return rows[-1][1:] if z > rows[-1][0] else rows[0][1:]


def _head(top: _Figure, body, d: Dress) -> None:
    """The head: figurelib's face (`head_point`) read at a few dozen points, the skull behind it, eyes, and hair
    where no hat covers it."""
    a, b, c = body.skull
    head = body.head
    nz, nf, nb = (7, 7, 4) if coarse() else (11, 11, 6)
    zs = [-c * 0.97 + 2 * c * 0.97 * i / (nz - 1) for i in range(nz)]
    phis = [math.radians(-96 + 192 * k / nf) for k in range(nf)] + [math.radians(96 + 168 * k / nb) for k in range(nb)]

    def point(z: float, phi: float, out: float = 0.0) -> Vector:
        ring = math.sqrt(max(0.0, 1 - (z / c) ** 2))
        narrow = 1 - 0.2 * figurelib.smooth(-z, 3.5, 10.5)
        x = a * narrow * ring * math.sin(phi)
        q = figurelib.head_point(x, z) if math.cos(phi) > 0 else head + Vector((x, -b * ring * math.cos(phi), z))
        return q + (q - head).normalized() * out if out else q

    n = len(phis)
    verts = [tuple(point(z, phi)) for z in zs for phi in phis]
    # (the columns run anticlockwise seen from above and the rows upward, so a face taken in that order looks outward)
    faces = [(r * n + j, r * n + (j + 1) % n, (r + 1) * n + (j + 1) % n, (r + 1) * n + j) for r in range(nz - 1) for j in range(n)]
    faces.append(tuple(reversed(range(n))))
    faces.append(tuple(range((nz - 1) * n, nz * n)))
    top("skin").add(verts, faces)
    if not coarse():
        for sx in (1, -1):  # the eyes: a dark bead in each socket
            at = figurelib.head_point(sx * 3.15, 0.55)
            top("hair").lathe(
                [(0.0, -0.5), (0.9, -0.3), (0.9, 0.1), (0.0, 0.45)],
                6,
                matrix=Matrix.Translation(at + Vector((0, 0.25, 0)))
                @ Matrix.Rotation(math.radians(90), 4, "X")
                @ Matrix.Diagonal((1.25, 1.0, 0.8, 1.0)),
            )
    # the hair: a shell over the scalp, from the hairline back and down to the nape; under a hat only what shows below it
    line = 4.2 if d.hat else 6.3
    hv, hf = [], []
    for r in range(nz - 1):
        for j in range(n):
            cell = [
                (zs[r], phis[j]),
                (zs[r], phis[(j + 1) % n] + (math.tau if j == n - 1 else 0.0)),
                (zs[r + 1], phis[(j + 1) % n] + (math.tau if j == n - 1 else 0.0)),
                (zs[r + 1], phis[j]),
            ]
            zm = (zs[r] + zs[r + 1]) / 2
            pm = (cell[0][1] + cell[1][1]) / 2
            front = math.cos(pm) > 0.25
            if (front and zm < line) or (not front and zm < -4.5) or (d.hat and zm > 5.0):
                continue
            base = len(hv)
            hv += [tuple(point(z, phi, 0.45)) for z, phi in cell]
            hf.append((base, base + 1, base + 2, base + 3))
    if hv:
        top(d.hair).add(hv, hf)


def _hat(top: _Figure, body, d: Dress) -> None:
    a, b, _ = body.skull
    head = body.head
    oval = Matrix.Diagonal((1.0, (b + 0.5) / (a + 0.5), 1.0, 1.0))
    r = a + 0.5
    if d.hat == "cap":
        # the peaked cap: a band, a wide crown tipped up at the front, a peak, a badge
        m = Matrix.Translation(head + Vector((0, 0.3, 4.0))) @ Matrix.Rotation(math.radians(6), 4, "X") @ oval
        top.lathe(d.band, [(r - 1.0, 0.0), (r + 0.25, 0.0), (r + 0.35, 4.3), (r - 1.0, 4.3)], 14, m)
        tip = m @ Matrix.Translation((0, 0, 4.3)) @ Matrix.Rotation(math.radians(9), 4, "X")
        top.lathe(d.hat_colour, [(r - 1.0, -0.4), (r + 0.3, 0.0), (r + 4.6, 3.0), (r + 4.4, 3.9), (r * 0.5, 5.3), (0.0, 5.4)], 14, tip)
        top.lathe("leather", [(r - 0.3, 0.9), (r + 5.2, -1.6), (r + 5.2, -2.1), (r - 0.3, 0.3)], 12, m, arc=(math.radians(-162), math.radians(-18)))
        if not coarse():
            top.lathe(
                "gold",
                [(0.0, -0.4), (1.3, -0.4), (0.9, 0.5), (0.0, 0.7)],
                6,
                m @ Matrix.Translation((0, -(r + 0.3), 2.3)) @ Matrix.Rotation(math.radians(90), 4, "X"),
            )
    elif d.hat == "fedora":
        m = Matrix.Translation(head + Vector((0, 0.3, 4.6))) @ Matrix.Rotation(math.radians(4), 4, "X") @ oval
        top.lathe(d.hat_colour, [(r - 1.0, 0.9), (r + 6.2, -0.5), (r + 6.3, 0.0), (r + 0.2, 1.2), (r - 0.2, 8.6), (r - 2.0, 10.2), (0.0, 9.3)], 14, m)
        top.lathe(d.band, [(r + 0.1, 1.2), (r + 0.45, 1.3), (r + 0.3, 3.6), (r - 0.1, 3.6)], 14, m)
    elif d.hat == "flat":
        m = Matrix.Translation(head + Vector((0, -1.0, 4.8))) @ Matrix.Rotation(math.radians(8), 4, "X") @ oval
        top.lathe(d.hat_colour, [(r - 1.0, 0.0), (r + 0.4, 0.0), (r + 2.6, 2.4), (r + 2.0, 5.0), (r * 0.5, 7.4), (0.0, 7.6)], 14, m)
        top.lathe(
            d.hat_colour, [(r - 0.3, 0.6), (r + 4.4, -0.8), (r + 4.4, -1.2), (r - 0.3, 0.1)], 10, m, arc=(math.radians(-150), math.radians(-30))
        )
    elif d.hat == "beret":
        m = Matrix.Translation(head + Vector((0.8, 0.6, 5.0))) @ Matrix.Rotation(math.radians(-7), 4, "Y") @ oval
        top.lathe(d.hat_colour, [(r - 1.0, 0.0), (r + 0.3, 0.0), (r + 3.0, 2.4), (r + 2.4, 4.8), (r * 0.5, 7.2), (0.0, 7.4)], 14, m)


def stand(out, p: Person, at: Sequence[float], heading: float) -> int:
    """Set a person down on a site: his feet at `at` (metres, the site's frame), facing `heading` degrees anticlockwise
    from the site's +X. `out(key)` gives the MeshBuilder a material's meshes go to. Returns the triangles."""
    place = Matrix.Translation(Vector(at)) @ Matrix.Rotation(math.radians(heading + 90.0), 4, "Z") @ Matrix.Scale(CM, 4)
    return figure(p).into(out, place)


class Party:
    """A group of people who stand together and leave together: one node's meshes, a mesh a material, so that eight
    men are a dozen draws. Stand each where he stood (`stand`), then `build` them under the group's node."""

    def __init__(self) -> None:
        self.mb: dict[str, MeshBuilder] = {}
        self.triangles = 0
        self.people = 0

    def __call__(self, key: str) -> MeshBuilder:
        return self.mb.setdefault(key, MeshBuilder())

    def stand(self, p: Person, at: Sequence[float], heading: float) -> None:
        """One of them, his feet at `at` (metres, the site's frame), facing `heading` degrees anticlockwise from +X."""
        self.triangles += stand(self, p, at, heading)
        self.people += 1

    def build(self, node, origin: Sequence[float], mats: dict) -> None:
        """Make the meshes under `node` (an empty at `origin`, metres). Cloth and skin are shaded smooth: a sleeve of
        twelve sides is a round sleeve, and only a real corner (a cap's edge, a shoulder board) is a crease."""
        o = Vector(origin)
        for key, mb in self.mb.items():
            mb.verts = [tuple(Vector(v) - o) for v in mb.verts]
            mb.build(f"{node.name}_{key.replace('-', ' ').title().replace(' ', '')}", mats[key], node, smooth=True, sharp_angle=62.0)


def vary(p: Person, **changes) -> Person:
    """The same man with something changed: his arms, his stature, which way he looks."""
    return replace(p, **changes)


__all__ = [
    "ARMS",
    "CLOTH",
    "Dress",
    "Person",
    "figure",
    "general",
    "jacket",
    "marshal",
    "materials",
    "medic",
    "officer",
    "overcoat",
    "raincoat",
    "stand",
    "vary",
    "worker",
]
