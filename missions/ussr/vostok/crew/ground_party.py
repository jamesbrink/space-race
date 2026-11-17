"""The people on the ground at a Soviet launch: clothed standing figures for a place's scenery. See ./ground-party.md.

A crew figure (sk_1.py) is one man at a hundred thousand triangles, skinned so that the viewer can walk him. A launch
pad on the morning of a flight has forty or fifty people on it, standing. So these are another kind of figure on the
same body: the measures and joints are figurelib's (`figurelib.man`, scaled to a stature and a build), the face is
figurelib's face read at a few dozen points, and the clothes are a handful of plain forms over them, at some 1,700
triangles a man (700 at the far levels of detail). They are posed once, standing: a figure is meshes in its group's
node, one mesh a material, so a group of eight is a dozen draws (`Party`). A group the viewer walks off is the same,
but each man jointed to the crew's joints on a skeleton of the group's, under a node of his own (`Walkers`).

What a figure is made from:
  a man        stature and build (`Person`), and how he stands: each arm's pose, how far his feet are apart and which is
               forward, which way his head is turned
  a dress      what he wears (`Dress`): the upper garment and how far down it comes, trousers, what is on his head, an
               armband, shoulder boards, stripes down the trousers, high boots
The dresses below are the ones the film and the photographs of 12 April 1961 show at Site 1 (the sources are in
ground-party.md): a marshal and generals in service tunics, officers in tunics and peaked caps with no greatcoats, the
chief designer in a dark overcoat and a velour hat, civilians in dark coats and hats, workers in navy hooded anoraks
with red armbands, medics in white coats, a cameraman. And the summer's, which the film of 6 August 1961 shows: shirts
in white and pale tones, short-sleeved and tucked in at a belt, officers in khaki summer shirts and ties, a white jacket.

Dimensions are centimetres, as figurelib's are: the origin is the ground between the feet, +Z up, and the figure faces
-Y, so its left is +X. `stand()` sets it down on a site in metres.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, replace

import bpy
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
    # summer dress (6 August 1961: the film «Снова к звёздам»): white and pale shirts, the officers' khaki summer shirts;
    # a checked shirt is drawn as its mid tone (the check is not drawn); a straw hat; dark lenses
    "shirt-white": ("suit-cotton-shirt-white", (0.86, 0.86, 0.83), 0.0, 0.85),
    "shirt-cream": ("suit-cotton-shirt-cream", (0.8, 0.76, 0.64), 0.0, 0.85),
    "shirt-blue": ("suit-cotton-shirt-blue", (0.6, 0.67, 0.74), 0.0, 0.85),
    "shirt-check": ("suit-cotton-shirt-check", (0.42, 0.44, 0.5), 0.0, 0.9),
    "khaki-summer": ("suit-cotton-khaki", (0.46, 0.42, 0.28), 0.0, 0.88),
    "straw": ("hat-straw", (0.74, 0.67, 0.48), 0.0, 0.8),
    "lens": ("sunglasses-dark", (0.015, 0.016, 0.02), 0.0, 0.15),
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
    tie: str | None = "leather"  # down the V, where there is one
    sleeves: str = "long"  # or "short": to above the elbow, the forearm bare
    tucked: bool = False  # a shirt into the trousers at a belt, not a coat over them
    glasses: bool = False  # dark glasses


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


# Summer dress: what the film of 6 August 1961 («Снова к звёздам», 21:45 to 22:20) shows nearly everyone in at Site 1.


def summer_shirt(colour: str = "shirt-white", trousers: str = "black", hat: str | None = None, hair: str = "hair", glasses: bool = False) -> Dress:
    """A civilian in a short-sleeved shirt tucked into dark trousers at a belt, open at the neck: white or pale for
    nearly all of them (the film); `shirt-check` for the one checked shirt, in its mid tone."""
    return Dress(
        colour,
        bulk=0.7,
        collar="shirt",
        trousers=trousers,
        hat=hat,
        hat_colour="straw" if hat == "fedora" else "grey",
        band="leather",
        hair=hair,
        shirt="skin",
        tie=None,
        sleeves="short",
        tucked=True,
        glasses=glasses,
    )


def summer_officer(band: str = "blue", glasses: bool = False) -> Dress:
    """An officer in the khaki summer shirt, short-sleeved, with a tie, and a peaked cap (the film: air force badges,
    so the aviation's blue band); navy trousers as April's officers wore. Shoulder boards on the shirt are not made out
    in the film and are not drawn."""
    return Dress(
        "khaki-summer",
        bulk=0.8,
        collar="shirt",
        trousers="navy",
        hat="cap",
        hat_colour="olive",
        band=band,
        shirt="khaki-summer",
        tie="leather",
        sleeves="short",
        tucked=True,
        glasses=glasses,
    )


def summer_tunic(band: str = "blue") -> Dress:
    """One of the few officers in a tunic with shoulder boards (the film): April's closed tunic and peaked cap."""
    return officer(band)


def white_jacket(armband: str | None = None, hat: str | None = None) -> Dress:
    """A white summer jacket over an open shirt, dark trousers: Smirnov's (a photograph), with a pale straw hat and an
    armband on the left arm, whose colour the black-and-white photograph does not give."""
    return Dress(
        "shirt-white",
        hem=-0.04,
        bulk=2.0,
        collar="turned",
        trousers="black",
        hat=hat,
        hat_colour="straw",
        band="leather",
        armband=armband,
        shirt="skin",
        tie=None,
    )


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
    """One figure's meshes, by material key, in centimetres. Each vertex also remembers which piece of him it was made
    for (`mark`): the legs, the trunk, an arm, a hand, a foot, the neck, the head. That is what a jointed figure's
    vertices are weighted by (`_weigh`); a figure that is not jointed carries the marks and does nothing with them."""

    def __init__(self) -> None:
        self.mb: dict[str, MeshBuilder] = {}
        self.tags: dict[str, list[str]] = {}
        self.piece = "trunk"
        # each arm's shoulder, elbow and wrist as built, by side ("L", "R"), and the joints a jointed figure is hung on
        self.arms: dict[str, tuple[Vector, Vector, Vector]] = {}
        self.joints: dict[str, Vector] = {}
        self.weights: dict[str, list[dict[str, float]]] = {}

    def __call__(self, key: str) -> MeshBuilder:
        return self.mb.setdefault(key, MeshBuilder())

    def mark(self, piece: str | None) -> None:
        """Every vertex made so far is the piece being made's; those made from here on are `piece`'s (None: no change)."""
        for key, mb in self.mb.items():
            tags = self.tags.setdefault(key, [])
            tags.extend([self.piece] * (len(mb.verts) - len(tags)))
        if piece:
            self.piece = piece

    def take(self, other: _Figure) -> None:
        """Add another's meshes, marks and all, to these."""
        other.mark(None)
        self.mark(None)
        for key, mb in other.mb.items():
            self(key).add(mb.verts, mb.faces, mb.uvs)
            self.tags.setdefault(key, []).extend(other.tags.get(key, []))

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


def figure(p: Person, jointed: bool = False) -> _Figure:
    """A person, standing, in centimetres. `jointed`: also where each of the crew's joints is in him as built
    (`_Figure.joints`, srlib.FIGURE's and the two halves at the hips) and how much each vertex follows each of them
    (`_Figure.weights`), for a figure the viewer walks."""
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
        f.mark("legs")
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
        f.mark("foot.L" if sx > 0 else "foot.R")
        out = math.radians(9.0 * sx)
        toe = Vector((math.sin(out), -math.cos(out), 0.0))
        shoe = [(-9.0, 3.3, 3.2, 3.1), (-3.5, 4.4, 3.7, 3.7), (6.0, 4.9, 3.2, 3.2), (15.0, 4.5, 2.3, 2.3), (19.5, 2.8, 1.5, 1.6)]
        f.tube(
            "leather", [(ax + toe.x * s, ay + toe.y * s, zc_) for s, _, _, zc_ in shoe], [(a, b) for _, a, b, _ in shoe], 10, ref=(0, 0, 1), fine=1
        )

    # ---- the seat of the trousers, under the coat's hem; or, under a shirt tucked in, up to the belt at the waist
    f.mark("legs")
    seat = [(0, 0, zc - 6.0), (0, 0, zc + 2.0), (0, 0, zc + 14.0)]
    seat_r = [(13.0 * p.build, 10.0 * p.build), (16.0 * p.build, 11.5 * p.build), (16.5 * p.build, 11.5 * p.build)]
    if d.tucked:
        # Under a coat the seat is a coat's, and lies inside the legs' tops. Seen, it is the trousers' own: from inside the
        # legs at the crotch, round the legs' tops at the hips (each leg's top ring wholly inside it), then the body's own
        # sections a little let out up to the belt.
        belt_z = body.waist_z + 1.0
        lx, _, lz, la, lb = body.leg[1]
        hips = (lx + la + 0.6 + 1.8, (lb + 0.6) * 1.3)
        torso = [(z, a, b) for z, a, b in body.torso]
        seat = [(0, 0, zc - 5.0), (0, 0, lz - 1.0), (0, 0, belt_z - 9.0), (0, 0, belt_z)]
        seat_r = [(lx, lb * 0.95), hips, *[(a + 0.5, b + 0.5) for a, b in (_at(torso, z) for z in (belt_z - 9.0, belt_z))]]
    # (drawn straight between its rows when tucked: a curve through them bellies out over the legs' tops, a millimetre from them)
    f.tube(d.trousers, seat, seat_r, 12, fine=1 if d.tucked else 2)
    if d.tucked:
        # the belt: a band round the trousers' top, the shirt over its upper edge (the trousers there narrow upward: the
        # band is a few millimetres off the widest of them)
        (a0, b0), (a1, b1) = seat_r[-2:]
        k = 3.5 / 9.0
        belt_a, belt_b = max(a1, a1 + (a0 - a1) * k) + 0.4, max(b1, b1 + (b0 - b1) * k) + 0.4
        f.tube("leather", [(0, 0, belt_z - 3.5), (0, 0, belt_z - 0.3)], [(belt_a, belt_b)] * 2, 12, fine=1)

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
    if d.tucked:
        # a shirt tucked in: from over the belt's upper edge (the cloth a little bloused over it) to the shoulders. (The
        # coat's line is half a centimetre behind the trousers': its front is let out by as much again.)
        skirt = [(belt_z - 1.5, belt_a + 1.0, belt_b + 1.6)]
        trunk = [row for row in trunk if row[0] > belt_z + 2.0]
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
    elif d.collar == "shirt":
        # a shirt's collar, open and lying flat round the neck: a turned collar's, smaller
        coat.lathe(
            d.coat,
            [(neck_r - 1.0, z_neck + 1.8), (neck_r + 1.8, z_neck - 0.8), (neck_r + 1.6, z_neck - 1.4), (neck_r - 1.0, z_neck - 1.2)],
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
        # (on a shirt, from under its collar)
        za, zb = (z_neck - 3.0, z_neck - 11.0) if d.collar == "shirt" else (z_neck - 2.0, z_neck - 14.0)
        heights = sorted({za, zb, *[z for z, _, _ in rows if zb < z < za]}, reverse=True)
        # (on a shirt it lies closer: the cloth under it is thin)
        lie, half_v = (0.45, 3.4) if d.tucked else (1.0, 4.6)
        for key, half, off in ((d.shirt, half_v, lie), *(((d.tie, 1.3, lie + 0.7),) if d.tie else ())):
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
        S = "L" if sx > 0 else "R"
        coat.arms[S] = (s.copy(), e.copy(), wrist.copy())
        coat.mark(f"arm.{S}")
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
        folded = len(runs) > 1
        if d.sleeves == "short":
            # a short sleeve to above the elbow, open at its end, and the arm bare from inside it to the wrist (the body's
            # own sections are a suit's, some two centimetres over the skin: the bare arm is that much slighter)
            end = 0.55
            coat.tube(
                d.coat,
                [first, s, s + u * (upper * end)],
                [(a + out_, b + out_) for a, b in (row[0][3:], head_r, (mid_r[0] + 0.5, mid_r[1] + 0.5))],
                12,
                ref=(0, 1, 0.01),
                fine=1,
            )
            # (and the wrist ends inside the hand, slighter than it, so that the two are not one surface drawn twice)
            k = body.hand
            bare = [(pts, [(a - 1.4, b - 1.4) for a, b in rad]) for pts, rad in runs]
            pts, rad = bare[-1]
            bare[-1] = (pts, [*rad[:-1], (2.0 * k, 1.7 * k)])
            # (from a little inside the sleeve's end: both ways of building the arm have its third point half way down it)
            pts, rad = bare[0]
            bare[0] = ([s + u * (upper * (end - 0.12)), *pts[2:]], [rad[2], *rad[2:]])
            for i, (pts, rad) in enumerate(bare):
                coat.mark(f"{'upper' if i == 0 else 'fore'}.{S}" if folded else f"arm.{S}")
                coat.tube("skin", pts, rad, 10, ref=(0, 1, 0.01), fine=1)
        else:
            for i, (pts, rad) in enumerate(runs):
                coat.mark(f"{'upper' if i == 0 else 'fore'}.{S}" if folded else f"arm.{S}")
                coat.tube(d.coat, pts, [(a + out_, b + out_) for a, b in rad], 12, ref=(0, 1, 0.01), fine=1)
        coat.mark(f"arm.{S}")
        if d.armband and sx > 0:
            a, b = row[3][3:]
            coat.tube(
                d.armband, [s + u * (upper * 0.42), s + u * (upper * 0.66)], [(a + out_ + 0.5, b + out_ + 0.5)] * 2, 14, ref=(0, 1, 0.01), fine=1
            )
        if d.boards:
            coat.mark("trunk")
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
        coat.mark(f"hand.{S}")
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
        coat.mark("trunk")
    coat.turned(lean)
    f.take(coat)
    f.arms = {S: tuple(lean @ v for v in sew) for S, sew in coat.arms.items()}

    # ---- the neck, the head and what is on it: turned together
    top = _Figure()
    head = body.head
    top.mark("neck")
    top.tube("skin", [(0, 0.5, z_neck - 3.0), (0, -0.2, head.z - 6.0)], [(5.6 * p.build**0.5, 6.0 * p.build**0.5), (5.2, 5.6)], 9, fine=1)
    top.mark("head")
    _head(top, body, d)
    if d.hat:
        _hat(top, body, d)
    if d.glasses:
        _glasses(top)
    nod = (
        Matrix.Translation((0, head.y + 3.0, head.z - 9.0))
        @ Matrix.Rotation(math.radians(p.turn), 4, "Z")
        @ Matrix.Rotation(math.radians(-p.nod), 4, "X")
    )
    top.turned(lean @ nod @ Matrix.Translation((0, -head.y - 3.0, 9.0 - head.z)))
    f.take(top)

    f.mark("head")
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
    f.mark(None)
    if jointed:
        _weigh(f, body)
    return f


def _glasses(top: _Figure) -> None:
    """Dark glasses: two lenses before the eyes, clear of the brow and the cheek, and a bridge. (Their arms are not drawn.)"""
    # (how far forward the face comes round each eye: the lens stands half a centimetre before the most of it)
    front = min(figurelib.head_point(x, z).y for x in (1.2, 3.2, 5.2) for z in (-1.0, 0.6, 2.2)) - 0.5
    lens = [(0.0, -0.15), (2.15, -0.15), (2.15, 0.15), (0.0, 0.15)]
    for sx in (1, -1):
        at = figurelib.head_point(sx * 3.2, 0.6)
        m = Matrix.Translation((at.x, front, at.z)) @ Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Diagonal((1.12, 0.82, 1.0, 1.0))
        top.lathe("lens", lens, 12, m)
    top("leather").box((1.6, 0.35, 0.4), Matrix.Translation((0.0, front, figurelib.head_point(3.2, 0.6).z + 0.7)))


def _seg(p: Vector, a: Vector, b: Vector) -> float:
    """How far a point is from the segment a to b."""
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def _weights_at(v: Vector, piece: str, arms: dict[str, tuple[Vector, Vector, Vector]], neck_z: float) -> dict[str, float]:
    """The joints a vertex of `piece` follows, and how much of each (at most four; they add up to one)."""
    side = piece[-1]
    if piece == "head":
        return {"Head": 1.0}
    if piece == "neck":
        h = figurelib.smooth(v.z, neck_z - 4.0, neck_z + 2.0)
        return {"Spine": 1 - h, "Head": h}
    if piece.startswith("foot."):
        return {f"Foot.{side}": 1.0}
    if piece.startswith("hand."):
        return {f"Hand.{side}": 1.0}
    if piece.startswith("upper."):
        return {f"UpperArm.{side}": 1.0}
    if piece.startswith("fore."):
        return {f"LowerArm.{side}": 1.0}
    if piece.startswith("arm."):
        # by which bone's line it is nearer, eased over a few centimetres across the elbow; inside the shoulder, the
        # trunk's; past the wrist, the hand's
        s, e, w = arms[side]
        lower = figurelib.smooth(_seg(v, s, e) - _seg(v, e, w), -2.0, 2.0)
        fore = w - e
        hand = lower * figurelib.smooth((v - e).dot(fore) / fore.length - fore.length, -2.5, 2.5)
        up = e - s
        trunk = (1 - lower) * (1 - figurelib.smooth((v - s).dot(up) / up.length, -6.0, 1.0))
        return {"Spine": trunk, f"UpperArm.{side}": 1 - lower - trunk, f"LowerArm.{side}": lower - hand, f"Hand.{side}": hand}
    # the legs and the trunk: one cloth from the waist down, as the crew figures' (figurelib.lower_weights)
    return dict(sorted(figurelib.lower_weights(v).items(), key=lambda kv: -kv[1])[:4])


def _weigh(f: _Figure, body) -> None:
    """Where each joint of a figure the viewer walks is in him as built, and the joints each of his vertices follows.
    The joints are the crew's (srlib.FIGURE, at figurelib's landmarks for his body) but the arms', which are where his
    arms were built: so standing as built every joint is unturned, and he is as he was made."""
    joints = figurelib.joints()
    for side, (s, e, w) in f.arms.items():
        joints[f"UpperArm.{side}"], joints[f"LowerArm.{side}"], joints[f"Hand.{side}"] = s.copy(), e.copy(), w.copy()
    for side, sx in (("L", 1), ("R", -1)):
        joints[f"HipHalf.{side}"] = body.hip_point(sx)
    f.joints = joints
    for key, mb in f.mb.items():
        f.weights[key] = [_weights_at(Vector(v), piece, f.arms, body.neck_z) for v, piece in zip(mb.verts, f.tags[key])]


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


class Walkers:
    """A group of people the viewer walks off (or on), each on his own feet: still a mesh a material for the group, so
    forty men are a dozen draws, but every man jointed to the crew's joints (srlib.FIGURE) on a skeleton of the group's
    own, under a node of his own (`<group>_Person_<n>`, a child of `<group>_People`, its origin on the ground between
    his feet and turned only to the way he faces). His joints are named as a crew figure's with his number after them
    (`Hips_3`, `UpperArm.L_3`): the viewer finds them within his own node (viewer/onfoot/gait.ts). Stand each where he
    stood (`stand`), then `build`.

    A man to be walked is built standing square (his feet together as the crew's stand, no lean): the gait sets his
    legs and trunk going from there. His arms are as built (`Person.arms`), and swing from there."""

    def __init__(self, group: str) -> None:
        self.group = group
        self.mb: dict[str, MeshBuilder] = {}
        self.weights: dict[str, list[dict[str, float]]] = {}
        self.persons: list[tuple[str, Vector, float, dict[str, Vector]]] = []
        self.triangles = 0

    @property
    def people(self) -> int:
        return len(self.persons)

    def __call__(self, key: str) -> MeshBuilder:
        return self.mb.setdefault(key, MeshBuilder())

    def stand(self, p: Person, at: Sequence[float], heading: float) -> str:
        """One of them, his feet at `at` (metres, the site's frame), facing `heading` degrees anticlockwise from +X.
        Returns his node's name."""
        n = len(self.persons) + 1
        f = figure(replace(p, feet=(1.0, 0.0), lean=0.0), jointed=True)
        turn = Matrix.Rotation(math.radians(heading + 90.0), 4, "Z")
        place = Matrix.Translation(Vector(at)) @ turn @ Matrix.Scale(CM, 4)
        for key, mb in f.mb.items():
            self(key).add(mb.verts, mb.faces, [(u * CM, v * CM) for u, v in mb.uvs], matrix=place)
            self.weights.setdefault(key, []).extend({f"{joint}_{n}": w for joint, w in follows.items()} for follows in f.weights[key])
            self.triangles += sum(len(face) - 2 for face in mb.faces)
        name = f"{self.group}_Person_{n}"
        self.persons.append((name, Vector(at), heading, {joint: place @ at_ for joint, at_ in f.joints.items()}))
        return name

    def build(self, name: str, parent, origin: Sequence[float], mats: dict, parent_at: Sequence[float] = (0.0, 0.0, 0.0)):
        """The group's skeleton, `name` (the `<group>_People` node: an armature at `origin`, metres, under `parent`, whose
        own origin is at `parent_at`), a bone a man and his joints under it, and the meshes hung on them. Returns the
        skeleton."""
        o = Vector(origin)
        data = bpy.data.armatures.new(name)
        rig = bpy.data.objects.new(name, data)
        bpy.context.scene.collection.objects.link(rig)
        rig.parent = parent
        rig.location = o - Vector(parent_at)
        bpy.context.view_layer.update()
        bpy.context.view_layer.objects.active = rig
        bpy.ops.object.mode_set(mode="EDIT")
        for person, at, heading, joints in self.persons:
            n = person.rsplit("_", 1)[1]
            # each a stub standing straight up, rolled so that its own X is the man's left: in the GLB his node has no
            # rotation but his heading, and his joints none at all (srlib.skeleton, turned with him)
            ahead = Matrix.Rotation(math.radians(heading + 90.0), 3, "Z") @ Vector((0.0, -1.0, 0.0))

            def bone(bone_name: str, head: Vector, parent_bone=None):
                b = data.edit_bones.new(bone_name)
                b.head = head - o
                b.tail = b.head + Vector((0.0, 0.0, 0.05))
                b.align_roll(ahead)
                if parent_bone is not None:
                    b.parent = parent_bone
                return b

            root = bone(person, at)
            made = {}
            for joint, up in srlib.FIGURE.items():
                made[joint] = bone(f"{joint}_{n}", joints[joint], made[up] if up else root)
            for side in ("L", "R"):
                bone(f"HipHalf.{side}_{n}", joints[f"HipHalf.{side}"], made["Hips"])
        bpy.ops.object.mode_set(mode="OBJECT")
        for key, mb in self.mb.items():
            mb.verts = [tuple(Vector(v) - o) for v in mb.verts]
            obj = mb.build(f"{name}_{key.replace('-', ' ').title().replace(' ', '')}", mats[key], rig, smooth=True, sharp_angle=62.0)
            srlib.bind(obj, rig, self.weights[key])
        return rig


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
    "summer_officer",
    "summer_shirt",
    "summer_tunic",
    "vary",
    "Walkers",
    "white_jacket",
    "worker",
]
