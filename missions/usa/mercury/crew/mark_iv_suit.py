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

import bisect
import math
import os
from collections.abc import Callable, Sequence

import bpy
import numpy as np
from mathutils import Matrix, Vector

import srlib
from srlib import CM, TAU, MeshBuilder, arc_profile, frame, material, text_mesh

STATURE = 180.3  # documented: 5 ft 11 in
HEEL = 2.8  # boot heel under the foot
HELMET_OVER_CROWN = 6.0  # liner, shell and clearance above the top of the head


def landmark(fraction: float) -> float:
    """Height of a body landmark above the floor, boots on (Drillis & Contini proportions)."""
    return fraction * STATURE + HEEL


Z_KNEE = landmark(0.285)
Z_CROTCH = landmark(0.47)
Z_HIP = landmark(0.530)
Z_SHOULDER = landmark(0.818)
Z_CROWN = landmark(1.0)

STANCE = 13.5  # ankle centre off the midline: feet shoulder-width apart
BOOT_TOP = 27.0
BOOT_LENGTH = 31.2  # sole, toe to heel
NECK_RING_R = 12.5
HELMET_RX = 13.0  # shell half-width
HELMET_MID = 175.0  # height of the shell's widest section
HELMET_TOP = Z_CROWN + HELMET_OVER_CROWN
HELMET_RIM = 159.4  # the shell's lower edge, inside the neck ring
VENT_SIZE = (16.0, 42.0, 30.0)  # ventilator case: width, length, height
VENT_AT = (47.0, -5.0)  # its centre on the floor, at his left

FRONT, UP = Vector((0, -1, 0)), Vector((0, 0, 1))


def materials() -> dict:
    def m(name: str, *args, image: Callable[[], bpy.types.Image] | None = None) -> bpy.types.Material | None:
        if _rig.dry:
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


# ------------------------------------------------------------------------ helpers


def gauss(x: float, x0: float, width: float) -> float:
    return math.exp(-(((x - x0) / width) ** 2))


def smooth(x: float, lo: float, hi: float) -> float:
    t = min(1.0, max(0.0, (x - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def squareness(theta: float, n: float) -> float:
    """Radius change that turns an ellipse into a superellipse of exponent n."""
    return (abs(math.cos(theta)) ** n + abs(math.sin(theta)) ** n) ** (-1 / n) - 1


def rnd(i: int, seed: float) -> float:
    """A repeatable number in 0..1 for the i-th thing of a seeded set."""
    x = math.sin(i * 12.9898 + seed * 78.233) * 43758.5453
    return x - math.floor(x)


class Folds:
    """Creases in loose fabric round a limb between `lo` and `hi` centimetres along it: each a
    narrow valley with a soft ridge either side, leaning and wandering round the limb, deepest
    toward `inner` (the inside of a joint) and gone on the far side, so none closes into a ring.
    Called with (d, theta) it gives the skin's rise or fall in centimetres; nothing outside lo..hi
    by more than `FADE`, so fittings laid on the limb beyond that sit on undisturbed cloth."""

    FADE = 1.5

    def __init__(
        self,
        lo: float,
        hi: float,
        n: int,
        depth: float,
        seed: float,
        inner: float | None = None,
        *,
        width: float = 0.5,
        spread: float = 1.3,
        mask: Callable[[float, float], float] | None = None,
    ) -> None:
        self.lo, self.hi, self.mask = lo, hi, mask
        self.folds = []
        for i in range(n):
            r = [rnd(i * 7 + k, seed) for k in range(7)]
            centre = lo + (hi - lo) * (i + 0.5 + 0.5 * (r[0] - 0.5)) / n
            peak = TAU * r[1] if inner is None else inner + (r[1] - 0.5) * 2 * spread
            self.folds.append(
                (
                    centre,
                    (r[2] - 0.5) * 2.2,
                    TAU * r[3],
                    (r[4] - 0.5) * 0.9,
                    peak,
                    1.2 + 2.0 * r[5],
                    depth * (0.55 + 0.9 * r[6]),
                    width * (0.75 + 0.5 * r[0]),
                )
            )

    def __call__(self, d: float, th: float) -> float:
        if not self.lo - self.FADE < d < self.hi + self.FADE:
            return 0.0
        total = 0.0
        for centre, lean, phase, wander, peak, sharp, depth, w in self.folds:
            x = (d - centre - lean * math.sin(th - phase) - wander * math.sin(2 * th + 1.7 * phase)) / w
            if abs(x) > 5.5:
                continue
            reach = max(0.0, math.cos((th - peak) / 2)) ** (2 * sharp)
            total += depth * reach * (-math.exp(-x * x) + 0.55 * math.exp(-(((x - 1.9) / 1.4) ** 2)) + 0.4 * math.exp(-(((x + 2.0) / 1.5) ** 2)))
        if self.mask:
            total *= self.mask(d, th)
        return total * smooth(d, self.lo - self.FADE, self.lo) * (1 - smooth(d, self.hi, self.hi + self.FADE))


def grain() -> float:
    """How coarse this level of detail may be: 1 at full detail, about 3 for the far ones."""
    return 1 / max(0.35, min(1.0, srlib.DETAIL))


def sides(n: int, least: int = 8) -> int:
    """An even number of sides for a limb at this level of detail."""
    return max(least, 2 * round(srlib._segs(n) / 2))


# ---------------------------------------------------------------------------- pose
#
# The figure is modelled standing (the rest pose) and every mesh is then carried to its pose by
# the joints it hangs from: a limb bends through an arc at each joint, the way a hose does, and
# whatever is laid on it (lacing, straps, the gauge) bends with it.

HIP_X = 9.6  # hip joint off the midline
ELBOW = (27.4, 0.8, 117.5)  # his left elbow; ARM passes through it
ANKLE_Z = 10.0


class Bend:
    """A hinge at `joint` about `axis`. Everything further than `half` along `along` turns through
    `angle`; within `half` either side of the joint the limb follows a circular arc, its
    cross-sections staying whole, so its length down the middle does not change."""

    def __init__(
        self, joint: Sequence[float], axis: Sequence[float], along: Sequence[float], half: float, angle: float, hollow: float | None = None
    ) -> None:
        # hollow: on the inside of a sharp bend the limb's two halves press together and the flesh
        # gives; nothing may lie nearer the bend's centre than this fraction of the way to it
        self.hollow = hollow
        self.j, self.n = Vector(joint), Vector(axis).normalized()
        a = Vector(along)
        self.a = (a - self.n * a.dot(self.n)).normalized()
        self.b = self.n.cross(self.a)
        self.half, self.angle = half, angle

    def __call__(self, p: Vector) -> Vector:
        if abs(self.angle) < 1e-9:
            return p
        rel = p - self.j
        u = rel.dot(self.a)
        if self.hollow is not None:
            radius = 2 * self.half / self.angle
            # the limit eases off with distance from the joint, as the two halves draw apart
            limit = self.hollow * radius + max(0.0, abs(u) - self.half) / math.tan(self.angle / 2)
            inward = rel.dot(self.b)
            if limit - inward < 6.0:
                rel = rel - self.b * (inward - limit + 0.5 * math.log1p(math.exp((limit - inward) / 0.5)))
        if u <= -self.half:
            return self.j + rel
        q = rel - self.a * u  # where the point sits in its cross-section
        t = min(u, self.half) + self.half
        th = self.angle * t / (2 * self.half)
        radius = 2 * self.half / self.angle
        c, s = math.cos(th), math.sin(th)
        centre = self.j - self.a * self.half + (self.a * s + self.b * (1 - c)) * radius
        if u > self.half:
            centre = centre + (self.a * c + self.b * s) * (u - self.half)
        qa, qb, qn = q.dot(self.a), q.dot(self.b), q.dot(self.n)
        return centre + self.a * (qa * c - qb * s) + self.b * (qa * s + qb * c) + self.n * qn


class Twist:
    """A limb turned about its own length: nothing before `start` centimetres along `along` from
    `joint`, the whole `angle` beyond `end`, the cloth wound evenly between."""

    def __init__(self, joint: Sequence[float], along: Sequence[float], start: float, end: float, angle: float) -> None:
        self.j, self.a = Vector(joint), Vector(along).normalized()
        self.start, self.end, self.angle = start, end, angle

    def __call__(self, p: Vector) -> Vector:
        rel = p - self.j
        u = rel.dot(self.a)
        turn = self.angle * smooth(u, self.start, self.end)
        if abs(turn) < 1e-9:
            return p
        return self.j + Matrix.Rotation(turn, 3, self.a) @ rel


class Rig:
    """Where the meshes go and how they get there. The default is the standing figure: no joint
    turned, top-level nodes, centimetres to metres and nothing else."""

    def __init__(self) -> None:
        self.bends: dict[tuple[str, int], list[Bend | Twist]] = {}  # (limb, side) -> joints, furthest from the body first
        self.angles: dict[str, float] = {}  # the pose's joint angles in degrees, for what the cloth does at a bent joint
        self.grip = 0.0  # 0: the hand hangs relaxed; 1: closed round a hand controller
        self.press: Callable[[Vector, str], Vector] | None = None  # flesh giving way where two parts of the body meet
        self.to_frame: Matrix | None = None  # rest pose (cm) -> the pose's own frame (cm)
        self.place: Matrix | None = None  # that frame, in metres -> the caller's space
        self.parent: bpy.types.Object | None = None
        self.prefix = ""
        self.dry = False  # collect points only: no Blender objects
        self.points: dict[str, list[Vector]] = {}  # posed vertices by mesh name, in the pose's frame
        self.inlet: tuple[Vector, Vector] | None = None  # the waist inlet's mouth and the way it points, rest pose
        self.skins: list[tuple[bpy.types.Object, list[dict[str, float]]]] = []  # the standing figure's meshes and the joints each vertex follows

    def posed(self) -> bool:
        return self.to_frame is not None

    def carry(self, p: Sequence[float], limb: str | None = None) -> Vector:
        """A rest-pose point, where the pose puts it (centimetres, the pose's frame). From the
        waist down (`pelvis`, `leg`) the garment is one cloth: a point goes with the pelvis and
        with its leg, more of it the leg's the further down it is."""
        v = Vector(p)
        sx = 1 if v.x >= 0 else -1
        share = 0.0
        if limb in ("pelvis", "leg"):
            # (by height alone, from the waist down to the crotch: a hip bent double is no place for the stride's sharper line)
            # (and nothing of it under the waist strap, which lies across the join and keeps its shape)
            share = smooth(WAIST_Z - 2.0 - v.z, 0.0, WAIST_Z - 2.0 - PELVIS_BOTTOM)
            ways = []
            for part, w in (("pelvis", 1 - share), ("leg", share)):
                if w > 1e-6:
                    q = v
                    for bend in self.bends.get((part, sx), ()):
                        q = bend(q)
                    ways.append((q, w))
            v = sum((q * w for q, w in ways), Vector())
        elif limb:
            for bend in self.bends.get((limb, sx), ()):
                v = bend(v)
        if self.to_frame is None:
            return v
        v = self.to_frame @ v
        if self.press and share > 0:
            v = v.lerp(self.press(v, "leg"), share)
        return v


_rig = Rig()


# ---------------------------------------------------------------------- the skeleton
#
# The standing figure can also be moved by the viewer: it is skinned to the joints every crew
# figure has (srlib.FIGURE). The seated figure is not; it is carried to its pose above, once.

JOINTED = ("Helmet", "Torso", "Arms", "Gloves", "Legs", "Boots")  # the ventilator is not part of him
SPINE_Z = 106.0  # the waist: above it the torso follows Spine
NECK_Z = 157.0


def joints() -> dict[str, Vector]:
    """Where each joint is in the rest pose, centimetres."""
    out = {"Hips": Vector((0, 0, Z_HIP)), "Spine": Vector((0, 0, SPINE_Z)), "Head": Vector((0, 0, NECK_Z))}
    for side, sx in (("L", 1), ("R", -1)):
        out[f"UpperArm.{side}"] = Vector((sx * ARM[1][0], *ARM[1][1:3]))
        out[f"LowerArm.{side}"] = Vector((sx * ELBOW[0], *ELBOW[1:]))
        out[f"Hand.{side}"] = wrist_point(sx)
        out[f"UpperLeg.{side}"] = Vector((sx * HIP_X, 0.0, Z_HIP))
        out[f"LowerLeg.{side}"] = Vector((sx * 12.3, -1.0, Z_KNEE))
        out[f"Foot.{side}"] = Vector((sx * STANCE, 0.5, ANKLE_Z))
    return out


def hand_of(sx: int) -> Hand:
    return Hand(sx, wrist_point(sx), wrist_point(sx, 1.0) - wrist_point(sx))


KNUCKLES = 9.1  # centimetres down the hand from the wrist: the line the four fingers hinge on
GRIP_AT = (-2.7, 0.0, 8.4)  # where a handle lies in the hooked fingers: out of the palm, across it, down the hand
HOOK = 50.0  # degrees the fingers turn at the knuckles to close on a handle


def finger_hinges() -> dict[str, tuple[str, Vector, Vector]]:
    """The fingers of each hand hinge together on the knuckles' line (the thumb does not): one
    more joint a hand, so that it can hook round a handle. Positive closes."""
    out = {}
    for side, sx in (("L", 1), ("R", -1)):
        hand = hand_of(sx)
        out[f"Fingers.{side}"] = (f"Hand.{side}", hand.p(0, 0, KNUCKLES), hand.D.cross(-hand.B))
    return out


PELVIS_BOTTOM = Z_CROTCH - 3.0  # the crotch of the trousers: the suit hangs this far under the body's own
HIP_CREASE = 5.0  # either side of the line a thigh folds on, the cloth is shared between the pelvis and the thigh over this many centimetres


def crease(x: float, y: float) -> float:
    """The height of the line a thigh folds on, at a point `x` from the midline and `y` behind the
    hip joints: in front it runs up and out from the crotch toward the point of the hip, as the
    groin does; behind it lies level under the buttock, which stays with the pelvis."""
    front = Z_CROTCH + (Z_HIP + 5.0 - Z_CROTCH) * smooth(abs(x), 2.0, 17.0)
    back = Z_CROTCH + 1.0 + 5.0 * smooth(abs(x), 8.0, 18.0)
    return back + (front - back) * smooth(-y, -4.0, 4.0)


def leg_share(p: Vector) -> tuple[float, float]:
    """How much of a rest-pose point from the waist down goes with the left leg and with the
    right; the rest is the pelvis's. One function of place for the whole garment, so the seat of
    the trousers, the thighs and anything laid on them move as one cloth. At the crotch's own
    seam the two legs have half each: it stays midway between them as they part."""
    line = crease(p.x, p.y)
    thigh = 1 - smooth(p.z, line - HIP_CREASE, line + HIP_CREASE)
    if thigh <= 0:
        return 0.0, 0.0
    # below the crotch a leg is its own; above it the two sides run into each other across the middle
    half = 0.05 + 3.5 * smooth(p.z, PELVIS_BOTTOM - 1.0, PELVIS_BOTTOM + 6.0)
    left = smooth(p.x, -half, half)
    return thigh * left, thigh * (1 - left)


def lower_weights(p: Vector) -> dict[str, float]:
    """The joints a rest-pose point from the waist down follows: pelvis and spine above the hip's
    crease, then thigh, shin and foot, the cloth shared across each joint over a few centimetres."""
    left, right = leg_share(p)
    side = "L" if p.x >= 0 else "R"
    lower = smooth(Z_KNEE - p.z, -6.0, 6.0)
    foot = 1 - smooth(p.z, ANKLE_Z - 2.0, ANKLE_Z + 7.0)
    spine = smooth(p.z, SPINE_Z - 7.0, SPINE_Z + 7.0)
    rest = 1 - left - right
    out = {"Hips": rest * (1 - spine), "Spine": rest * spine, f"LowerLeg.{side}": lower * (1 - foot), f"Foot.{side}": lower * foot}
    out["UpperLeg.L"] = left * (1 - lower)
    out["UpperLeg.R"] = right * (1 - lower)
    return out


def joint_weights(node: str, p: Vector, share: float = 0.0) -> dict[str, float]:
    """How much of a rest-pose point of `node` follows each joint. Across a joint the cloth is
    shared between the two sides of it over a few centimetres, as a hose bends; a fitting well
    clear of a joint follows one and keeps its shape. `share` is what only the builder knows: of
    a point of the torso's skin, how much belongs to the sleeve on its side (the shoulder is one
    skin with the torso); of a point of a glove, how much of it is finger beyond the knuckle."""
    arm = share
    side = "L" if p.x >= 0 else "R"
    sx = 1 if p.x >= 0 else -1
    if node == "Helmet":
        return {"Head": 1.0}
    if node == "Torso":
        out = {joint: w * (1 - arm) for joint, w in lower_weights(p).items()}
        out[f"UpperArm.{side}"] = arm
        return out
    if node in ("Arms", "Gloves"):
        elbow, wrist = Vector((sx * ELBOW[0], *ELBOW[1:])), wrist_point(sx)
        along = (wrist - elbow).normalized()
        lower = smooth((p - elbow).dot(along), -5.0, 5.0)
        hand = smooth((p - wrist).dot(along), -2.5, 2.5)
        fingers = share if node == "Gloves" else 0.0
        return {
            f"UpperArm.{side}": 1 - lower,
            f"LowerArm.{side}": lower * (1 - hand),
            f"Hand.{side}": lower * hand * (1 - fingers),
            f"Fingers.{side}": lower * hand * fingers,
        }
    return lower_weights(p)  # legs and boots


LIMB = {"Arms": "arm", "Gloves": "arm", "Legs": "leg", "Boots": "leg", "Torso": "pelvis"}  # which joints move a node's meshes


def group(name: str) -> bpy.types.Object | None:
    """A top-level node of the standing figure; the caller's own node when he is posed inside something."""
    if _rig.dry:
        return None
    return _rig.parent if _rig.posed() else srlib.group(name)


def emit(mb: MeshBuilder, name: str, mat, parent, **kw) -> bpy.types.Object | None:
    """Rest pose to pose, and centimetres to metres, here and only here."""
    if _rig.posed():
        limb = LIMB.get(name.split("_")[0])
        pts = [_rig.carry(v, limb) for v in mb.verts]
        _rig.points[name] = pts
        if _rig.dry:
            return None
        mb.verts = [tuple(_rig.place @ (p * CM)) for p in pts]
        name = f"{_rig.prefix}_{name}"
    else:
        node = name.split("_")[0]
        share = getattr(mb, "share", None)  # per vertex, what only the builder knows: see joint_weights
        follows = None
        if node in JOINTED:
            follows = [joint_weights(node, Vector(v), share[i] if share and i < len(share) else 0.0) for i, v in enumerate(mb.verts)]
        mb.verts = [(x * CM, y * CM, z * CM) for x, y, z in mb.verts]
    mb.uvs = [(u * CM, v * CM) for u, v in mb.uvs]
    obj = mb.build(name, mat, parent, **kw)
    if not _rig.posed() and follows:
        _rig.skins.append((obj, follows))
    return obj


class Tube:
    """A MeshBuilder.loft that can also be asked where its skin is, so straps, zippers and
    fittings can be laid on it. It repeats loft's sampling exactly; keep the two in step.

    fold(d, theta) is loft's ripple with d in centimetres along the path instead of 0..1."""

    def __init__(
        self,
        path: Sequence[Sequence[float]],
        radii: Sequence[tuple[float, float]],
        *,
        ref: Sequence[float] = (0, 1, 0),
        resample: int = 5,
        fold: Callable[[float, float], float] | None = None,
    ) -> None:
        self.path = [Vector(p) for p in path]
        self.radii = list(radii)
        self.ref, self.resample, self.fold = Vector(ref), resample, fold
        self.relief: list[Folds] = []  # creases, in centimetres, on top of `fold`
        pts, n = self.path, len(self.path)

        def cr(seq, i, t):
            p0, p1, p2, p3 = (seq[max(0, min(n - 1, k))] for k in (i - 1, i, i + 1, i + 2))
            return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t**3)

        ra = [Vector((a, b, 0)) for a, b in radii]
        self.centres, self.rads = [], []
        for i in range(n - 1):
            for k in range(resample):
                self.centres.append(cr(pts, i, k / resample))
                self.rads.append(cr(ra, i, k / resample))
        self.centres.append(pts[-1])
        self.rads.append(ra[-1])
        m = len(self.centres)
        self.frames = []
        for i in range(m):
            t = (self.centres[min(m - 1, i + 1)] - self.centres[max(0, i - 1)]).normalized()
            side = self.ref.cross(t)
            side = side.normalized() if side.length > 1e-6 else Vector((1, 0, 0))
            self.frames.append((side, t.cross(side)))
        self.dist = [0.0]
        for a, b in zip(self.centres, self.centres[1:]):
            self.dist.append(self.dist[-1] + (b - a).length)
        self.length = self.dist[-1]

    def key_d(self, i: int) -> float:
        """Distance along the path of the i-th control point."""
        return self.dist[i * self.resample]

    def add(self, mb: MeshBuilder, segs: int = 24, caps: tuple[bool, bool] = (True, True)) -> None:
        m = len(self.centres)
        ripple = (lambda s, th: self.fold(self.dist[round(s * (m - 1))], th)) if self.fold else None
        mb.loft(self.path, self.radii, segs, ref=tuple(self.ref), resample=self.resample, ripple=ripple, caps=caps)

    def rows(self, d0: float = 0.0, d1: float | None = None, *, step: float = 0.9, must: Sequence[float] = ()) -> list[float]:
        """Stations down the path for mesh(): `step` apart, a third of that where there are creases to carry."""
        d1 = self.length if d1 is None else d1
        coarse, fine = step * grain(), 0.3 * grain()
        out, d = [d0], d0
        while d < d1 - 1e-6:
            creased = any(f.lo - f.FADE <= d < f.hi + f.FADE for f in self.relief)
            d = min(d1, d + (fine if creased else coarse))
            out.append(d)
        for m in must:
            if d0 < m < d1:
                out = [x for x in out if abs(x - m) > 0.12]
                out.append(m)
        return sorted(out)

    def mesh(
        self,
        mb: MeshBuilder,
        segs: int,
        rows: Sequence[float] | None = None,
        *,
        caps: tuple[bool, bool] = (True, True),
        sunk: Callable[[float], float] | None = None,
        least: int = 8,
    ) -> None:
        """The skin as a grid through rows(), read from the same function that at() reads, so
        what is laid on the limb and the limb itself cannot disagree. `sunk(d)` draws it in by
        that many centimetres (a sleeve tucked under a hem)."""
        rows = self.rows() if rows is None else rows
        n = sides(segs, least)
        ths = [TAU * j / n for j in range(n)]
        grid = [[self.at(d, th, -sunk(d)) if sunk and sunk(d) else self._skin(d, th) for th in ths] for d in rows]
        vs = list(rows)
        if caps[0]:
            grid.insert(0, [self.centre(rows[0])] * n)
            vs.insert(0, rows[0])
        if caps[1]:
            grid.append([self.centre(rows[-1])] * n)
            vs.append(rows[-1])
        verts = [tuple(p) for row in grid for p in row]
        uvs = [(th * max(self.rads[self._row(d)[0]].x, 1e-4), d) for d in vs for th in ths]
        faces = [(r * n + j, r * n + (j + 1) % n, (r + 1) * n + (j + 1) % n, (r + 1) * n + j) for r in range(len(grid) - 1) for j in range(n)]
        mb.add(verts, faces, uvs)

    def _row(self, d: float) -> tuple[int, float]:
        d = min(max(d, 0.0), self.length)
        i = min(bisect.bisect_right(self.dist, d) - 1, len(self.dist) - 2)
        span = self.dist[i + 1] - self.dist[i]
        return i, ((d - self.dist[i]) / span if span > 1e-9 else 0.0)

    def centre(self, d: float) -> Vector:
        i, f = self._row(d)
        return self.centres[i].lerp(self.centres[i + 1], f)

    def toward(self, direction: Sequence[float], d: float) -> float:
        """The theta at which the skin faces `direction`."""
        side, other = self.frames[self._row(d)[0]]
        v = Vector(direction)
        return math.atan2(v.dot(other), v.dot(side))

    def _skin(self, d: float, theta: float, folded: bool = True) -> Vector:
        i, f = self._row(d)
        rad = self.rads[i].lerp(self.rads[i + 1], f)
        side = self.frames[i][0].lerp(self.frames[i + 1][0], f)
        other = self.frames[i][1].lerp(self.frames[i + 1][1], f)
        k = 1.0 + (self.fold(d, theta) if folded and self.fold else 0.0)
        if folded and self.relief:
            k += sum(f(d, theta) for f in self.relief) / max(0.5 * (rad.x + rad.y), 1.0)
        return self.centres[i].lerp(self.centres[i + 1], f) + side * (rad.x * k * math.cos(theta)) + other * (rad.y * k * math.sin(theta))

    def normal(self, d: float, theta: float) -> Vector:
        """Outward normal of the unfolded skin: wrinkles would only make it jitter."""
        a = self._skin(d, theta + 0.03, False) - self._skin(d, theta - 0.03, False)
        b = self._skin(min(d + 0.3, self.length), theta, False) - self._skin(max(d - 0.3, 0.0), theta, False)
        return a.cross(b).normalized()

    def at(self, d: float, theta: float, off: float = 0.0) -> Vector:
        p = self._skin(d, theta)
        return p + self.normal(d, theta) * off if off else p

    def trace(self, d0: float, d1: float, th0: float, th1: float, n: int) -> list[tuple[Vector, Vector]]:
        """(point, normal) pairs along a straight line in (d, theta)."""
        out = []
        for i in range(n + 1):
            d, th = d0 + (d1 - d0) * i / n, th0 + (th1 - th0) * i / n
            out.append((self.at(d, th), self.normal(d, th)))
        return out

    def patch(
        self, mb: MeshBuilder, d0: float, d1: float, th0: float, th1: float, height: float, *, nd: int = 8, nt: int = 6, sink: float = 0.3
    ) -> None:
        """A raised panel that follows the skin's curve: flaps, lacing strips, boot tongues."""
        rows = []
        for i in range(nd + 1):
            d = d0 + (d1 - d0) * i / nd
            ths = [th0 + (th1 - th0) * j / nt for j in range(nt + 1)]
            row = [self.at(d, th, height) for th in ths]
            rows.append([self.at(d, ths[0], -sink), *row, self.at(d, ths[-1], -sink)])
        first = [self.at(d0, th0 + (th1 - th0) * j / nt, -sink) for j in range(nt + 1)]
        last = [self.at(d1, th0 + (th1 - th0) * j / nt, -sink) for j in range(nt + 1)]
        rows = [[first[0], *first, first[-1]], *rows, [last[0], *last, last[-1]]]
        skin(mb, rows, self.centre((d0 + d1) / 2))


def skin(
    mb: MeshBuilder,
    rows: Sequence[Sequence[Vector]],
    inside: Sequence[float] | None,
    *,
    closed: bool = False,
    flip: bool = False,
    inward: bool = False,
    keep: Callable[[int, int], bool] | None = None,
) -> None:
    """A quad grid through explicit rows of points. With `inside` given, the faces are wound to
    look away from that point (toward it with `inward`); otherwise the normal is (along a row) x
    (row to row), or its reverse with `flip`. `keep(row, column)` leaves an opening where it is false."""
    nu = len(rows[0])
    verts = [Vector(p) for row in rows for p in row]
    cols = nu if closed else nu - 1
    faces = []
    for j in range(len(rows) - 1):
        for i in range(cols):
            a, b = j * nu + i, j * nu + (i + 1) % nu
            faces.append((a, b, b + nu, a + nu))
    if inside is not None:
        centre, best = Vector(inside), 0.0
        for f in faces:
            p = [verts[k] for k in f]
            n = (p[2] - p[0]).cross(p[3] - p[1])
            if n.length > best:
                best, flip = n.length, n.dot((p[0] + p[2]) / 2 - centre) < 0
        flip = flip != inward
    if flip:
        faces = [f[::-1] for f in faces]
    if keep is not None:
        faces = [f for k, f in enumerate(faces) if keep(k // cols, k % cols)]
    uvs, v = [], 0.0
    for j, row in enumerate(rows):
        if j:
            v += (Vector(row[0]) - Vector(rows[j - 1][0])).length
        u = 0.0
        for i, p in enumerate(row):
            if i:
                u += (Vector(p) - Vector(row[i - 1])).length
            uvs.append((u, v))
    mb.add([tuple(p) for p in verts], faces, uvs)


def rails(trace: Sequence[tuple[Vector, Vector]], closed: bool = False) -> list[tuple[Vector, Vector, Vector]]:
    """(point, normal, across) along a traced line; `across` is normal x travel."""
    n, out = len(trace), []
    for i, (p, nm) in enumerate(trace):
        a = trace[(i - 1) % n][0] if closed else trace[max(0, i - 1)][0]
        b = trace[(i + 1) % n][0] if closed else trace[min(n - 1, i + 1)][0]
        out.append((p, nm, nm.cross((b - a).normalized()).normalized()))
    return out


def band(
    mb: MeshBuilder,
    trace: Sequence[tuple[Vector, Vector]],
    width: float,
    height: float,
    *,
    lift: float = 0.0,
    sink: float = 0.3,
    bevel: float = 0.12,
    closed: bool = False,
) -> None:
    """A flat tape along a traced line, its top `height` proud of the skin and its edges sunk
    through it. Keep it narrow against the skin's radius: the tape does not bend across itself."""
    h = width / 2
    rows = []
    for p, nm, ac in rails(trace, closed):
        p = p + nm * lift
        rows.append(
            [p - ac * h - nm * (sink + lift), p - ac * (h - bevel) + nm * height, p + ac * (h - bevel) + nm * height, p + ac * h - nm * (sink + lift)]
        )
    if closed:
        rows.append(rows[0])
    base = len(mb.verts)
    skin(mb, rows, None, flip=True)
    if not closed:
        end = base + 4 * (len(rows) - 1)
        mb.faces.append((base, base + 1, base + 2, base + 3))
        mb.faces.append((end + 3, end + 2, end + 1, end))


def ring(tube: Tube, d: float, n: int = 40) -> list[tuple[Vector, Vector]]:
    """A trace once round a tube at distance d."""
    return [(tube.at(d, TAU * i / n), tube.normal(d, TAU * i / n)) for i in range(n)]


def lacing(
    tube: Tube, d0: float, d1: float, theta: float, width: float, strip: MeshBuilder, cord: MeshBuilder, eyelet: MeshBuilder, pitch: float = 1.5
) -> None:
    """A sizing strip: a tape down the limb with a cord crossed between two rows of eyelets."""
    half = width / 2 / max(tube.rads[tube._row((d0 + d1) / 2)[0]].x, 1.0)
    tube.patch(strip, d0, d1, theta - half, theta + half, 0.2, nd=max(4, round((d1 - d0) / 1.2)), nt=4)
    if srlib.DETAIL < 0.5:
        return
    n = max(2, round((d1 - d0 - 1.2) / pitch))
    inset = half * 0.62
    pairs = []
    for k in range(n + 1):
        d = d0 + 0.6 + (d1 - d0 - 1.2) * k / n
        pairs.append([(tube.at(d, theta + s * inset, 0.2), tube.normal(d, theta + s * inset)) for s in (-1, 1)])
    for (a0, a1), (b0, b1) in zip(pairs, pairs[1:]):
        cord.tube(a0[0] + a0[1] * 0.1, b1[0] + b1[1] * 0.1, 0.11, 5)
        cord.tube(a1[0] + a1[1] * 0.42, b0[0] + b0[1] * 0.42, 0.11, 5)  # the upper cord of each cross
    for pair in pairs:
        for p, nm in pair:
            eyelet.disc(p - nm * 0.3, nm, 0.3, 0.65, 8)


def buckle(steel: MeshBuilder, web: MeshBuilder, p: Vector, nm: Vector, size: tuple[float, float], spin: float = 0.0) -> None:
    """A strap buckle: a steel frame with the webbing passing over its bar."""
    m = frame(p, nm) @ Matrix.Rotation(spin, 4, "Z")
    steel.box((size[0], size[1], 1.0), m @ Matrix.Translation((0, 0, 0.1)))
    web.box((size[0] * 0.45, size[1] * 1.15, 1.0), m @ Matrix.Translation((0, 0, 0.32)))


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


HEAD = Vector((0, -1.2, Z_CROWN - 11.0))  # centre of the skull
SKULL = (7.6, 9.6, 11.0)  # its half-width, half-depth and half-height


def bump(x: float, x0: float, wx: float, z: float, z0: float, wz: float) -> float:
    return math.exp(-(((x - x0) / wx) ** 2) - ((z - z0) / wz) ** 2)


def face_relief(x: float, z: float) -> float:
    """How far the face stands forward of a plain egg, in centimetres, at `x` across and `z` up
    from the middle of the head: brow, eye sockets, a nose with a bridge, cheekbones, lips, chin
    and jaw. Proportions are a textbook adult's, not a portrait."""
    ax = abs(x)
    f = 0.45 * math.exp(-(((z - 2.1) / 0.75) ** 2)) * smooth(5.2 - ax, 0.0, 1.6) * (0.7 + 0.3 * math.exp(-(((ax - 2.9) / 1.6) ** 2)))  # brow ridge
    f -= 0.62 * bump(ax, 3.15, 1.4, z, 0.55, 0.8)  # eye sockets
    f -= 0.2 * bump(ax, 5.6, 1.2, z, 1.0, 2.2)  # temples
    # nose: a ridge from between the brows, widening and rising to the tip, cut back under it
    if z >= -3.7:
        t = min(1.0, max(0.0, (1.6 - z) / 5.3))
        rise = (0.32 + 2.0 * t**1.35) * (math.exp(-(((z - 1.6) / 1.3) ** 2)) if z > 1.6 else 1.0)
        f += rise * math.exp(-((x / (0.6 + 0.5 * t)) ** 2))
    else:
        f += 2.32 * math.exp(-(((z + 3.7) / 0.45) ** 2)) * math.exp(-((x / 1.1) ** 2))
    f += 0.5 * bump(ax, 1.05, 0.5, z, -3.35, 0.55)  # nostrils
    f += 0.42 * bump(ax, 4.3, 1.7, z, -1.3, 1.8)  # cheekbones
    f += 1.3 * bump(x, 0, 3.3, z, -6.0, 1.7)  # the mouth stands forward of the cheeks
    f += 0.3 * bump(x, 0, 1.9, z, -5.5, 0.34) + 0.34 * bump(x, 0, 1.6, z, -6.5, 0.4)  # lips
    f -= 0.3 * bump(x, 0, 2.3, z, -6.0, 0.17) + 0.26 * bump(x, 0, 1.5, z, -7.35, 0.42)  # between them, and under the lower one
    f += 3.0 * bump(x, 0, 3.1, z, -9.0, 1.9)  # chin
    f += 1.5 * math.exp(-(((z + 8.6) / 2.6) ** 2)) * math.exp(-((x / 6.5) ** 2))  # jaw
    return f


def head_point(x: float, z: float, sunk: float = 0.0) -> Vector:
    """The face's skin at `x` across and `z` up from the middle of the head (front half only)."""
    a, b, c = SKULL
    narrow = 1 - 0.2 * smooth(-z, 3.5, 10.5)  # the skull narrows to the jaw
    depth = math.sqrt(max(0.0, 1 - (x / (a * narrow)) ** 2 - (z / c) ** 2))
    front = smooth(depth, 0.1, 0.7)
    return HEAD + Vector((x, -b * depth - face_relief(x, z) * front + sunk, z))


def build_head(head: MeshBuilder, eyes: MeshBuilder, dark: MeshBuilder, hair: MeshBuilder, lips: MeshBuilder) -> None:
    a, b, c = SKULL
    # brows and lips lie 2 mm proud of the skin, which only the full mesh follows that closely: where
    # they are built the face is not thinned, and below that they are left out
    fine = srlib.DETAIL >= 0.75
    q = 1.0 if fine else grain()
    # rows close together from chin to brow, where the features are; columns close together across the face
    zs, z = [-c], -c
    while z < c - 1e-6:
        z = min(c, z + (0.3 if -9.6 <= z < 4.0 else 0.9) * q)
        zs.append(z)
    n_front, n_back = 60 if fine else sides(60), sides(14)
    phis = [math.radians(-96 + 192 * k / n_front) for k in range(n_front)] + [math.radians(96 + 168 * k / n_back) for k in range(n_back)]
    rows = []
    for z in zs:
        ring_r = math.sqrt(max(0.0, 1 - (z / c) ** 2))
        narrow = 1 - 0.2 * smooth(-z, 3.5, 10.5)
        row = []
        for phi in phis:
            x = a * narrow * ring_r * math.sin(phi)
            if math.cos(phi) > 0:
                row.append(head_point(x, z))
            else:
                row.append(HEAD + Vector((x, -b * ring_r * math.cos(phi), z)))
        rows.append(row)
    skin(head, rows, HEAD, closed=True)
    for sx in (1, -1) if srlib.DETAIL >= 0.5 else ():  # from far enough off for the coarsest level, a face is its shadows
        # eyes: a white ball set back in each socket so the lids' opening is the socket's own
        # edge, with a dark iris standing just proud of it
        at = head_point(sx * 3.15, 0.5)
        ball = Matrix.Translation(at + Vector((0, 0.72, 0))) @ Matrix.Diagonal((1.45, 1.0, 0.78, 1.0))
        eyes.lathe(arc_profile(0, 0, 1.0, -90, 90, 10), 20, matrix=ball)
        iris = Matrix.Translation(at + Vector((0, -0.2, 0.02))) @ Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Diagonal((0.56, 0.56, 0.26, 1.0))
        dark.lathe(arc_profile(0, 0, 1.0, 0, 90, 6), 16, matrix=iris)
        # eyelids: skin over the top of the ball and a rim under it, 2.5 mm proud of the iris
        lid = Matrix.Translation(at + Vector((0, 0.72, 0))) @ Matrix.Diagonal((1.45 * 1.14, 1.5, 0.78 * 1.25, 1.0))
        head.lathe(arc_profile(0, 0, 1.0, 33, 90, 6), 20, matrix=lid)
        head.lathe(arc_profile(0, 0, 1.0, -90, -42, 4), 20, matrix=lid)
        if not fine:
            continue
        # eyebrows, lying in the skin along the brow ridge: (across, girth up and down, girth out of the skin)
        brow = ((1.2, 0.26, 0.2), (1.9, 0.34, 0.26), (2.8, 0.34, 0.27), (3.7, 0.3, 0.26), (4.4, 0.24, 0.22), (4.9, 0.14, 0.16))
        pts = [head_point(sx * x, 2.25 + 0.3 * math.sin((x - 1.2) / 3.7 * math.pi), out - 0.17) for x, _, out in brow]
        Tube(pts, [(up, out) for _, up, out in brow], ref=(0, 1, 0), resample=3).add(hair, 8)
    for z, half, r in ((-5.52, 2.25, 0.3), (-6.5, 1.9, 0.33)) if fine else ():  # lips: the colour, lying in the skin
        xs = [half * k / 5 for k in range(-5, 6)]
        girth = [r * max(0.3, 1 - (x / half) ** 2) ** 0.5 for x in xs]
        pts = [head_point(x, z + 0.16 * (1 - (x / half) ** 2) * (1 if z > -6 else -1), 0.85 * k - 0.18) for x, k in zip(xs, girth)]
        Tube(pts, [(k, 0.85 * k) for k in girth], ref=(0, 1, 0), resample=2).add(lips, 8)


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
    hc = HEAD
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


# --------------------------------------------------------------------------- torso

TORSO_Z0 = 82.0
# (z, half-width, half-depth), from under the pelvis to the neck inside the ring. Below PELVIS_TOP
# the trunk is rounded off into the thighs (Trousers), so the first rows are only what that starts from.
TORSO = [
    (82.0, 16.2, 11.2),
    (84.5, 16.6, 11.5),
    (89.0, 17.5, 12.0),
    (95.0, 18.3, 12.6),
    (103.0, 17.4, 12.0),
    (111.0, 16.2, 11.5),
    (120.0, 17.0, 12.1),
    (130.0, 18.7, 13.1),
    (140.0, 19.6, 13.2),
    (146.0, 19.6, 12.6),
    (150.0, 18.0, 11.6),
    (153.0, 14.5, 10.6),
    (155.3, 11.4, 9.9),
    (157.0, 10.4, 9.6),
    (159.0, 10.2, 9.4),
]
WAIST_Z = 103.0  # the waist strap. Above it the garment is the Torso node's shell; from it down, the Legs node's trousers


ZIP = ((150.0, 30.0), (107.5, -56.0))  # entry zipper: (height, azimuth in degrees), collar to waist
INLET = (111.0, 38.0)  # ventilation inlet at the left waist
Z_PIT, Z_YOKE = 130.5, 151.0  # the armhole in the torso: armpit to the top of the shoulder
ARMHOLE = 0.47  # its half-width round the torso, radians


def azimuth(th: float) -> float:
    """Degrees round the torso from straight ahead toward his left, -180..180."""
    return (math.degrees(th) + 90 + 180) % 360 - 180


def torso_tube() -> Tube:
    t = Tube([(0, 0, z) for z, _, _ in TORSO], [(a, b) for _, a, b in TORSO], resample=10)

    def fold(d: float, th: float) -> float:
        z = TORSO_Z0 + d
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
        z, a = TORSO_Z0 + d, azimuth(th)
        (z0, a0), (z1, a1) = ZIP
        on_zip = abs(a - (a0 + (a1 - a0) * (z - z0) / (z1 - z0))) * 0.3 if z1 - 2 < z < z0 + 2 else 99.0  # about 0.3 cm a degree
        keep = smooth(on_zip, 2.4, 4.5)
        keep *= smooth(math.hypot(z - INLET[0], (a - INLET[1]) * 0.3), 4.0, 6.5)
        return keep

    t.fold = fold
    # creases stop short of the straps, the zipper and the inlet
    t.relief = [
        Folds(106.0 - TORSO_Z0, 118.5 - TORSO_Z0, 6, 0.46, 0.5, spread=3.0, mask=flat),
        Folds(121.5 - TORSO_Z0, 129.0 - TORSO_Z0, 4, 0.36, 3.1, -TAU / 4, spread=1.5, width=0.7, mask=flat),  # slack under the chest
    ]
    return t


def relax(verts: list[Vector], faces: Sequence[tuple[int, ...]], weight: dict[int, float], rounds: int) -> None:
    """Let the listed vertices settle toward the average of their neighbours, each by its weight:
    what turns two surfaces stitched edge to edge into one."""
    near: dict[int, set[int]] = {i: set() for i in weight}
    for f in faces:
        for a, b in zip(f, f[1:] + f[:1]):
            if a in near:
                near[a].add(b)
            if b in near:
                near[b].add(a)
    for _ in range(rounds):
        moved = {i: verts[i].lerp(sum((verts[k] for k in near[i]), Vector()) / len(near[i]), 0.6 * w) for i, w in weight.items() if near[i]}
        for i, p in moved.items():
            verts[i] = p


def drape(verts: list[Vector], faces: Sequence[tuple[int, ...]], frozen: set[int]) -> None:
    """Folds fanning out from each armpit across the chest and the back, where the cloth of a
    soft suit is gathered when the arms hang: valleys a few millimetres deep, pressed in along
    the skin's own normal after the shoulders have been stitched on."""
    normal = [Vector() for _ in verts]
    for f in faces:
        nm = sum(((verts[f[i]] - verts[f[0]]).cross(verts[f[i + 1]] - verts[f[0]]) for i in range(1, len(f) - 1)), Vector())
        for i in f:
            normal[i] += nm
    for sx in (1, -1):
        pit = Vector((sx * 18.5, 0.0, Z_PIT + 1.0))
        for side in (-1, 1):  # chest, back
            fan = [
                (math.radians(18 + 21 * k + 14 * rnd(k, sx + side)), 0.36 + 0.26 * rnd(k + 9, 2 * sx + side), 0.85 + 0.5 * rnd(k + 5, sx - side))
                for k in range(4)
            ]
            for i, p in enumerate(verts):
                v = p - pit
                if i in frozen or v.y * side <= 0.5 or not 2.5 < v.length < 19.0 or v.x * sx > 4.0:
                    continue
                reach = v.length
                psi = math.atan2(v.z, -v.x * sx)  # up from the horizontal, swinging in toward the chest's middle
                fall = sum(-dep * math.exp(-(((psi - a - 0.12 * math.sin(reach / 3.0 + a * 7)) * reach / w) ** 2)) for a, dep, w in fan)
                verts[i] = p + normal[i].normalized() * fall * smooth(reach, 2.5, 6.0) * (1 - smooth(reach, 11.5, 19.0)) * smooth(
                    v.y * side, 0.5, 3.0
                )


def build_shell(mb: MeshBuilder, t: Tube, arms: dict[int, Tube]) -> None:
    """The torso from the waist up and both shoulders as one skin. The torso is a grid with an armhole cut in each
    side; from each hole's edge a sleeve is lofted over the shoulder and down to SLEEVE_HEM on the
    upper arm, where the Arms node's sleeve carries on from the same ring of points. Stitched to the hole
    and relaxed, the cloth runs from chest to arm without a crease."""
    n = trunk_sides()
    rows = t.rows(WAIST_Z - TORSO_Z0, must=(Z_PIT - TORSO_Z0, Z_YOKE - TORSO_Z0))
    ra = min(range(len(rows)), key=lambda r: abs(rows[r] - (Z_PIT - TORSO_Z0)))
    rb = min(range(len(rows)), key=lambda r: abs(rows[r] - (Z_YOKE - TORSO_Z0)))
    jw = max(1, round(ARMHOLE / (TAU / n)))
    ths = [TAU * j / n for j in range(n)]
    verts = [t._skin(d, th) for d in rows for th in ths]
    uvs = [(th * 18.0, d) for d in rows for th in ths]
    faces: list[tuple[int, ...]] = []

    def col(sx: int, k: int) -> int:  # k columns round from the middle of his side
        return ((0 if sx == 1 else n // 2) + k) % n

    cut = {(r, col(sx, k)) for sx in (1, -1) for r in range(ra, rb) for k in range(-jw, jw)}
    for r in range(len(rows) - 1):
        for j in range(n):
            if (r, j) not in cut:
                faces.append((r * n + j, r * n + (j + 1) % n, (r + 1) * n + (j + 1) % n, (r + 1) * n + j))
    # open at the waist, where the trousers carry on from the same ring of points; closed inside the neck ring
    r, c = len(rows) - 1, len(verts)
    verts.append(t.centre(rows[-1]))
    uvs.append((0.0, rows[-1]))
    faces += [(c, r * n + j, r * n + (j + 1) % n) for j in range(n)]

    weight: dict[int, float] = {}
    frozen: set[int] = set()
    share: dict[int, float] = {}  # how much of each vertex is sleeve: half at the armhole's edge, all of it a third of the way to the hem
    for sx in (1, -1):
        arm = arms[sx]
        hole = [ra * n + col(sx, k) for k in range(-jw, jw + 1)] + [rb * n + col(sx, k) for k in range(-jw, jw + 1)]
        hole += [r * n + col(sx, k) for r in range(ra + 1, rb) for k in (-jw, jw)]
        mid = sum((verts[i] for i in hole), Vector()) / len(hole)
        side, other = arm.frames[arm._row(arm.key_d(1))[0]]

        def angle(p: Vector, about: Vector, axes=(side, other)) -> float:
            return math.atan2((p - about).dot(axes[1]), (p - about).dot(axes[0])) % TAU

        hole.sort(key=lambda i: angle(verts[i], mid))
        hole_at = [angle(verts[i], mid) for i in hole]
        m = sides(32)
        steps = max(8, round(26 / (0.62 * grain())))

        def along(p: Vector) -> float:
            """How far down the arm a point of the armhole is."""
            ds = [2.0 + (SLEEVE_HEM - 3.5) * k / 60 for k in range(61)]
            return min(ds, key=lambda d: (arm.centre(d) - p).length)

        base = len(verts)
        for k in range(m):
            phi = TAU * k / m
            # where this line of the sleeve leaves the armhole's edge
            e = next(
                (e for e in range(len(hole)) if hole_at[e] <= phi < (hole_at[(e + 1) % len(hole)] if e + 1 < len(hole) else TAU + 1)), len(hole) - 1
            )
            a0, a1 = hole_at[e], hole_at[(e + 1) % len(hole)] + (TAU if e + 1 >= len(hole) else 0.0)
            start = verts[hole[e]].lerp(verts[hole[(e + 1) % len(hole)]], (phi - a0) / max(a1 - a0, 1e-6)) if phi >= a0 else verts[hole[0]]
            d0 = along(start)
            f0 = arm.frames[arm._row(d0)[0]]
            th0 = angle(start, arm.centre(d0), f0)
            turn = (phi - th0 + math.pi) % TAU - math.pi
            gap = start - arm._skin(d0, th0)
            for q in range(1, steps + 1):
                u = q / steps
                w = smooth(u, 0.0, 0.5)
                d = d0 + (SLEEVE_HEM - d0) * u
                verts.append(arm._skin(d, th0 + turn * w) + gap * (1 - w))
                share[len(verts) - 1] = 0.5 + 0.5 * smooth(u, 0.0, 0.35)
                uvs.append((phi * 6.0, 80.0 + d))
                if u < 0.6:
                    weight[base + k * steps + q - 1] = 1 - smooth(u, 0.2, 0.6)
            for q in range(steps - 1):
                a, b = base + k * steps + q, base + ((k + 1) % m) * steps + q
                faces.append((a, b, b + 1, a + 1))
        frozen.update(base + k * steps + q for k in range(m) for q in (steps - 2, steps - 1))  # the seam's ring is the sleeve's too
        # stitch the armhole's edge to the sleeve's first ring
        first, i, k, e = [base + k * steps for k in range(m)], 0, 0, len(hole)
        while i < e or k < m:
            next_hole = hole_at[(i + 1) % e] + (TAU if i + 1 >= e else 0.0)
            next_ring = TAU * (k + 1) / m
            if i < e and (k >= m or next_hole <= next_ring):
                faces.append((hole[i % e], hole[(i + 1) % e], first[k % m]))
                i += 1
            else:
                faces.append((hole[i % e], first[(k + 1) % m], first[k % m]))
                k += 1
        # how far round the hole the torso's own cloth gives way
        edge = [verts[i] for i in hole]
        for r in range(max(0, ra - 12), min(len(rows), rb + 14)):
            for k in range(-jw - 6, jw + 7):
                i = r * n + col(sx, k)
                if (r, col(sx, k)) in cut and i not in hole:
                    continue
                reach = min((verts[i] - p).length for p in edge)
                if reach < 5.5:
                    weight[i] = max(weight.get(i, 0.0), 1 - smooth(reach, 1.0, 5.5))
                if reach < 7.0:
                    share[i] = 0.5 * (1 - smooth(reach, 0.0, 7.0))
    relax(verts, faces, weight, max(3, round(14 / grain())))
    drape(verts, faces, frozen)
    mb.share = [share.get(i, 0.0) for i in range(len(verts))]
    mb.add([tuple(v) for v in verts], faces, uvs)


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
        return z - TORSO_Z0

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
    band(web, ring(t, d(WAIST_Z), 72), 2.6, 0.4, closed=True)
    p, nm = t.at(d(WAIST_Z), az(-14)), t.normal(d(WAIST_Z), az(-14))
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
    d0, th0 = z - TORSO_Z0, -TAU / 4 + math.radians(az)

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


# ---------------------------------------------------------------------------- arms

# (x, y, z, radius across, radius fore-and-aft) for his left arm; the first point is inside the torso
ARM = [
    (11.5, 0.0, 146.0, 4.0, 4.2),
    (19.3, 0.0, Z_SHOULDER - 4.7, 6.4, 6.7),
    (22.8, 0.0, 139.5, 6.6, 6.9),
    (24.9, 0.3, 130.5, 6.3, 6.5),
    (27.4, 0.8, 117.5, 5.6, 5.7),
    (28.6, -0.9, 108.5, 5.4, 5.4),
    (29.6, -2.9, 100.5, 4.7, 4.7),
    (30.1, -3.9, 96.5, 4.3, 4.3),
]
CUFF_TO_WRIST = 5.5  # the sleeve ends inside the glove's cuff, this far above the wrist


def wrist_point(sx: int, beyond: float = 0.0) -> Vector:
    """The wrist in the rest pose, or a point `beyond` it down the hand."""
    cuff, before = Vector((sx * ARM[-1][0], *ARM[-1][1:3])), Vector((sx * ARM[-2][0], *ARM[-2][1:3]))
    return cuff + (cuff - before).normalized() * (CUFF_TO_WRIST + beyond)


def palm_centre(sx: int) -> Vector:
    return wrist_point(sx, 6.5)


def palm_rest(sx: int) -> Vector:
    """The middle of the palm's skin: what lies on a hand controller's knob."""
    hand = Hand(sx, wrist_point(sx), wrist_point(sx, 1.0) - wrist_point(sx))
    return hand.p(-2.4, 0.0, 5.0)


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in ARM], [(a, b) for *_, a, b in ARM], resample=14)
    d_el = t.key_d(4)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)  # the crook of the elbow faces forward
    th_pit = t.toward((-sx, 0, 0), t.key_d(3))
    t.fold = lambda d, th: (
        0.008 * math.sin(TAU * d / 6.1 + 2 * th) * smooth(d, SLEEVE_HEM + 2, SLEEVE_HEM + 8) * (1 - smooth(d, t.length - 14, t.length - 8))
    )
    t.relief = [
        Folds(d_el - 4.5, d_el + 4.5, 7, 0.6, 0.7 * sx, th_in, spread=1.7),
        # bunched where the arm hangs against the side; smooth for 2 cm either side of the seam with the shoulder
        Folds(t.key_d(2) + 1.0, t.key_d(3) + 6.0, 5, 0.3, 2.1 * sx, th_pit, spread=1.2, mask=lambda d, th: smooth(abs(d - SLEEVE_HEM), 1.0, 2.6)),
        Folds(t.length - 17.0, t.length - 9.5, 3, 0.22, 3.3 * sx, th_in, spread=1.0),
    ]
    return t


SLEEVE_HEM = 28.5  # centimetres down the arm's path: the shoulder (Torso node) ends and the sleeve (Arms node) shows


def build_arms(M: dict, tubes: dict[int, Tube]) -> None:
    g = group("Arms")
    sleeves, strips, cords, eyelets, alu, face, needle = (MeshBuilder() for _ in range(7))
    for sx in (1, -1):
        t = tubes[sx]
        # The sleeve starts on the ring of points the shoulder's skin ends on, so the two read as
        # one cloth. A band 2.5 mm underneath backs the join: if rounding ever opens a hair's
        # breadth between the two meshes, what shows through is sleeve.
        t.mesh(sleeves, 32, t.rows(SLEEVE_HEM), caps=(False, True))
        t.mesh(sleeves, 32, [SLEEVE_HEM - 1.2, SLEEVE_HEM + 0.6], caps=(False, False), sunk=lambda d: 0.25)
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


# -------------------------------------------------------------------------- gloves


class Hand:
    """Axes of a relaxed hand: D toward the fingertips, B out of the back of the hand, W across
    the knuckles toward the little finger. The back of the hand faces out and a little forward."""

    def __init__(self, sx: int, wrist: Vector, distal: Vector) -> None:
        self.o, self.D = wrist, distal.normalized()
        b = Vector((sx * math.cos(math.radians(25)), -math.sin(math.radians(25)), 0))
        self.B = (b - self.D * b.dot(self.D)).normalized()
        w = self.D.cross(self.B)
        self.W = w if w.y > 0 else -w

    def p(self, u: float, v: float, w: float) -> Vector:
        return self.o + self.B * u + self.W * v + self.D * w

    def curl(self, angle: float) -> Vector:
        """Direction of a finger bone flexed `angle` toward the palm."""
        return self.D * math.cos(angle) - self.B * math.sin(angle)


# knuckle position across the hand and down it, bone lengths, flexion at each joint (degrees),
# radius, and how far the finger fans out from the middle one (degrees).
# The middle finger is cut straight for pushing buttons; the other three are curved to grip.
FINGERS = [
    (-3.6, 9.3, (4.6, 2.7, 2.3), (20, 30, 16), 1.12, -5.0),
    (-1.2, 9.6, (5.0, 3.0, 2.4), (5, 5, 4), 1.14, -1.0),
    (1.2, 9.2, (4.7, 2.8, 2.4), (25, 34, 19), 1.1, 3.0),
    (3.55, 8.4, (3.7, 2.1, 2.1), (31, 37, 22), 0.98, 7.5),
]


# the thumb's bones: (toward the fingertips, out to the side, forward of the palm), length
THUMB = [((0.74, 0.58, 0.34), 4.5), ((0.94, 0.2, 0.26), 3.3), ((0.97, 0.04, 0.24), 2.6)]
# closed round a hand controller's knob (estimated): each finger's flexion, and the thumb's bones
GRIP = [(46, 56, 32), (40, 48, 28), (48, 56, 32), (46, 54, 32)]
THUMB_GRIP = [((0.72, 0.42, 0.55), 4.5), ((0.84, 0.02, 0.54), 3.3), ((0.74, -0.2, 0.64), 2.6)]


def digit(mb: MeshBuilder, hand: Hand, root: Vector, start: Vector, bones: Sequence[tuple[Vector, float]], r: float, thick: float = 1.0) -> None:
    """A finger or thumb: one skin from inside the palm to the tip, swelling at each knuckle and
    waisted between, the last bone rounded off into a pad. `bones` are (direction, length);
    `thick` deepens the first knuckle, back of the hand to palm."""
    pts, radii = [root, start], [(r * 0.6, r * 0.6), (r * 1.1 * thick, r * 1.06)]  # a root well inside the palm's skin
    p, n = start, len(bones)
    for i, (along, length) in enumerate(bones):
        k = 1 - 0.09 * i  # each bone a little slimmer than the last
        last = i == n - 1
        for f, girth in ((0.3, 0.95), (0.7, 0.93)) if not last else ((0.3, 0.95), (0.62, 0.97), (0.86, 0.84)):
            pts.append(p + along * (length * f))
            radii.append((r * k * girth * (0.94 if last else 1.0), r * k * girth))
        p = p + along * length
        pts.append(p)
        # a knuckle swells on a straight finger; bent round a grip the cloth there is drawn thin, or it would fold through itself
        radii.append((r * k * 0.42, r * k * 0.46) if last else (r * (k - 0.09) * (1.07 - 0.3 * _rig.grip), r * (k - 0.09) * 1.03))
    t = Tube(pts, radii, ref=hand.W, resample=3)
    t.mesh(mb, 12, [t.dist[i] for i in range(len(t.dist))])


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, tape, teeth, web, steel = (MeshBuilder() for _ in range(5))
    fingers: list[float] = []
    for sx in (1, -1):
        hand = Hand(sx, wrist_point(sx), arms[sx].path[-1] - arms[sx].path[-2])
        # cuff, wrist, palm: (distance below the wrist, half-thickness, half-width)
        keys = [
            (-8.0, 5.1, 5.1),
            (-6.0, 5.1, 5.1),
            (-2.5, 3.9, 4.4),
            (0.0, 2.9, 3.9),
            (3.0, 2.5, 4.6),
            (6.5, 2.3, 5.2),
            (8.4, 1.9, 5.3),
            (9.3, 1.4, 5.25),
        ]
        palm = Tube([hand.p(0, 0, w) for w, _, _ in keys], [(a, b) for _, a, b in keys], ref=hand.W, resample=6)
        th_back = palm.toward(hand.B, 12.0)
        # round at the cuff, squared off across the palm so the knuckles stay inside it; ribbed
        # fabric across the back of the hand, hollowed a little between the tendons
        palm.fold = lambda d, th, tb=th_back: (
            squareness(th, 4.2 - 1.3 * max(0.0, math.cos(th - tb))) * smooth(d, 6, 10)  # squarer in the palm than across the back
            + 0.018 * max(0.0, math.cos(th - tb)) * math.sin(TAU * d / 1.3) * smooth(d, 9.5, 11) * (1 - smooth(d, 15.5, 17))
            - 0.05 * max(0.0, -math.cos(th - tb)) ** 2 * gauss(d, 13.0, 2.5)  # the hollow of the palm
            + 0.1 * max(0.0, math.cos(th - tb)) ** 3 * gauss(d, 13.5, 3.5)  # the back of the hand is domed, not flat
        )
        palm.mesh(shell, 28, palm.rows(step=0.45), least=14)  # a hand of eight flats lays its faces along the thumb's
        grip = _rig.grip
        for (v, w0, lengths, bends, r, fan), closed in zip(FINGERS, GRIP):
            angle, bones = 0.0, []
            for length, bend, shut in zip(lengths, bends, closed):
                angle += math.radians(bend + (shut - bend) * grip)
                bones.append(((hand.curl(angle) + hand.W * math.tan(math.radians(fan))).normalized(), length))
            start = hand.p(0.12 - 0.4 * grip, v, w0)  # a bent knuckle's crown stays under the back of the hand's skin
            # the root inside the palm leans half the first knuckle's bend, so a closed finger turns
            # through two easy corners there and not one its own skin would fold over on
            lean = math.radians(bends[0] + (closed[0] - bends[0]) * grip) / 2
            root = start - (hand.D * math.cos(lean) - hand.B * math.sin(lean) + hand.W * math.tan(math.radians(fan))).normalized() * 2.4
            first = len(shell.verts)
            digit(shell, hand, root, start, bones, r, 1.14)
            # beyond its knuckle a finger follows the hand's Fingers joint
            fingers += [0.0] * (first - len(fingers)) + [smooth((Vector(v) - start).dot(bones[0][0]), -1.5, 1.0) for v in shell.verts[first:]]
        # thumb: from the heel of the hand, out to the side and forward of the palm, lying
        # along the first finger
        base = hand.p(-0.7, -3.3, 0.8)
        bones = []
        for ((kd, kw, kb), length), ((gd, gw, gb), _) in zip(THUMB, THUMB_GRIP):
            kd, kw, kb = kd + (gd - kd) * grip, kw + (gw - kw) * grip, kb + (gb - kb) * grip
            bones.append(((hand.D * kd - hand.W * kw - hand.B * kb).normalized(), length))
        digit(shell, hand, base - bones[0][0] * 2.2, base + bones[0][0] * 0.2, bones, 1.42, 1.15)
        knuckle = base + bones[0][0] * (0.2 + bones[0][1])
        # the web of cloth from the thumb's knuckle to the first finger's
        to = hand.p(-0.45, -3.7, 7.4)
        back = (hand.p(-0.5, -2.6, 3.5) - (knuckle + to) / 2).normalized()  # toward the heel of the hand: the web's edge is a hollow curve
        span = Tube(
            [knuckle + back * 0.9 - (to - knuckle).normalized() * 0.6, (knuckle + to) / 2 + back * 1.5, to + back * 1.0],
            [(1.25, 0.62), (1.35, 0.5), (1.5, 0.62)],
            ref=hand.B,
            resample=5,
        )
        span.mesh(shell, 12, [span.dist[i] for i in range(len(span.dist))])
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

# (x, y, z, radius across, radius fore-and-aft) for his left leg, from the hip joint (inside the pelvis) to inside the boot
LEG = [
    (9.6, 0.0, Z_HIP + 0.5, 7.4, 8.6),
    (9.9, 0.0, 92.0, 8.6, 9.9),
    (10.5, 0.0, Z_CROTCH - 3.5, 9.0, 10.2),
    (10.9, -0.3, 75.0, 9.0, 9.7),
    (11.6, -0.8, 65.0, 8.1, 8.5),
    (12.3, -1.0, Z_KNEE, 7.0, 7.3),
    (12.8, 0.2, 43.0, 6.8, 7.2),
    (STANCE, 0.6, 32.0, 5.8, 6.1),
    (STANCE, 0.5, 20.0, 4.7, 4.9),
]


def leg_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in LEG], [(a, b) for *_, a, b in LEG], resample=18)
    d_knee, d_calf = t.key_d(5), t.key_d(6)
    th_front = t.toward(FRONT, d_knee)

    def fold(d: float, th: float) -> float:
        c = math.cos(th - th_front)
        return 0.06 * max(0.0, -c) * gauss(d, d_calf, 8) + 0.04 * max(0.0, c) * gauss(d, d_knee, 4)  # calf, kneecap

    t.fold = fold
    t.relief = [
        # deepest behind the knee; a knee bent double has one big fold there, not these
        Folds(
            d_knee - 6.0, d_knee + 6.0, 8, 0.62 * (1 - 0.75 * smooth(_rig.angles.get("knee", 0.0), 30, 90)), 1.0 * sx, th_front + math.pi, spread=1.6
        ),
        Folds(t.key_d(2) - 2.0, t.key_d(2) + 3.5, 4, 0.3, 2.6 * sx, t.toward((-sx, -0.6, 0), t.key_d(2)), spread=1.0),  # the groin
        Folds(t.key_d(7) - 0.5, t.key_d(7) + 4.3, 3, 0.3, 0.3 * sx, spread=3.0),  # bunched over the boot
    ]
    return t


def trunk_sides() -> int:
    """Sides of the trunk's skin at this level of detail: the shell's and the trousers', which share the waist's ring. A multiple of four."""
    return 4 * max(2, round(sides(72) / 4))


def smin(a: float, b: float, k: float) -> float:
    """The lesser of two distances, rounded off where they are within `k` of each other: two forms run into one."""
    h = max(k - abs(a - b), 0.0) / k
    return min(a, b) - h * h * k * 0.25


PELVIS_TOP = Z_CROTCH + 3.0  # below this the trunk is rounded off underneath, like the bottom of an egg, down to PELVIS_BOTTOM
FILLET = 2.0  # centimetres over which trunk and thighs run into each other
TROUSER_HEM = 7.0  # below the crotch by this much a leg is its own tube again


class Trousers:
    """The garment from the waist down as one skin: the trunk, rounded off underneath, and the two
    legs, run together where they meet, the way a pair of trousers is cut. There is a ring of
    points at the waist (the shell's own lowest); under the crotch a seam from front to back; and
    from the half of the trunk's lowest ring and that seam, each leg's first ring.

    The surface is where a smoothed union of three forms ends: each is a stack of level sections
    (an ellipse, squared up as the limb's own `fold` has it) and `reach` finds the edge along a
    ray from inside. So the seat, the groin and the crotch are whatever trunk and thighs make
    between them, with no part modelled as a block of its own."""

    def __init__(self, torso: Tube, legs: dict[int, Tube]) -> None:
        self.torso, self.legs = torso, legs
        self.tables = {}
        for sx, t in legs.items():
            rows = sorted((c.z, c.x, c.y, r.x, r.y, d) for c, r, d in zip(t.centres, t.rads, t.dist))
            self.tables[sx] = ([r[0] for r in rows], rows)
        self.leg_top = max(zs[-1] for zs, _ in self.tables.values())

    def cap(self, z: float) -> float:
        """How much of its section the trunk has left at height z: all of it above PELVIS_TOP, none at PELVIS_BOTTOM."""
        if z >= PELVIS_TOP:
            return 1.0
        return math.sqrt(max(0.0, 1 - ((PELVIS_TOP - z) / (PELVIS_TOP - PELVIS_BOTTOM)) ** 2))

    def trunk(self, x: float, y: float, z: float) -> float:
        """About how far a point is outside the trunk (negative: inside), centimetres."""
        t = self.torso
        cap = self.cap(z)
        rho = math.hypot(x, y)
        if cap < 1e-3:
            return rho + (PELVIS_BOTTOM - z if z < PELVIS_BOTTOM else 0.0) + 0.01
        i, f = t._row(z - TORSO_Z0)
        rad = t.rads[i].lerp(t.rads[i + 1], f)
        if rho < 1e-6:
            return -min(rad.x, rad.y) * cap
        th = math.atan2(y / rad.y, x / rad.x)
        k = cap * (1 + (t.fold(z - TORSO_Z0, th) if t.fold else 0.0))
        return rho * (1 - 1 / math.hypot(x / (rad.x * k), y / (rad.y * k)))

    def section(self, sx: int, z: float) -> tuple[float, float, float, float, float]:
        """A leg's level section at height z: centre x and y, radii across and fore-and-aft, and how far down its path that is."""
        zs, rows = self.tables[sx]
        i = min(max(bisect.bisect_right(zs, z) - 1, 0), len(zs) - 2)
        f = min(1.0, max(0.0, (z - zs[i]) / (zs[i + 1] - zs[i])))
        a, b = rows[i], rows[i + 1]
        return tuple(a[k] + (b[k] - a[k]) * f for k in range(1, 6))

    def leg(self, sx: int, x: float, y: float, z: float) -> float:
        """About how far a point is outside a leg. A leg ends inside the pelvis: its top is let go of over a few centimetres."""
        if z >= self.leg_top:
            return 99.0
        cx, cy, a, b, _ = self.section(sx, z)
        qx, qy = x - cx, y - cy
        rho = math.hypot(qx, qy)
        lost = 4.0 * smooth(z, self.leg_top - 4.0, self.leg_top)
        if rho < 1e-6:
            return -min(a, b) + lost
        return rho * (1 - 1 / math.hypot(qx / a, qy / b)) + lost

    def outside(self, x: float, y: float, z: float) -> float:
        return smin(self.trunk(x, y, z), smin(self.leg(1, x, y, z), self.leg(-1, x, y, z), FILLET), FILLET)

    @staticmethod
    def reach(f: Callable[[float], float], far: float) -> float:
        """How far along a ray that starts inside the first edge is: f(r) is how far outside the point r along it lies. No further than `far`."""
        step, lo = 0.6, 0.0
        while lo < far and f(min(far, lo + step)) < 0:
            lo += step
        if lo >= far:
            return far
        hi = min(far, lo + step)
        for _ in range(18):
            mid = 0.5 * (lo + hi)
            if f(mid) < 0:
                lo = mid
            else:
                hi = mid
        return 0.5 * (lo + hi)

    def build(self, mb: MeshBuilder) -> None:
        t = self.torso
        n = trunk_sides()
        k = max(2, round(n / 9))  # edges of the seam under the crotch
        m = n // 2 + k  # sides of a leg
        ths = [TAU * j / n for j in range(n)]
        z_low = PELVIS_BOTTOM + 2.5
        rows = t.rows(z_low - TORSO_Z0, WAIST_Z - TORSO_Z0)
        verts: list[Vector] = []
        uvs: list[tuple[float, float]] = []
        faces: list[tuple[int, ...]] = []
        # the trunk, from just over the crotch up to the waist
        for d in rows:
            z = TORSO_Z0 + d
            cap = self.cap(z)
            for th in ths:
                own = t._skin(d, th)
                edge = math.hypot(own.x, own.y)
                ux, uy = own.x / edge, own.y / edge
                r = edge * cap
                if z < self.leg_top + 0.5:
                    legs = lambda q, ux=ux, uy=uy, z=z: smin(self.leg(1, ux * q, uy * q, z), self.leg(-1, ux * q, uy * q, z), FILLET)  # noqa: E731
                    r = self.reach(lambda q, r=r, legs=legs: smin(q - r, legs(q), FILLET), 40.0)
                verts.append(Vector((ux * r, uy * r, z)))
                uvs.append((th * 18.0, d))
        for r in range(len(rows) - 1):
            faces += [(r * n + j, r * n + (j + 1) % n, (r + 1) * n + (j + 1) % n, (r + 1) * n + j) for j in range(n)]
        # a band under the shell's lowest edge backs the join, as the sleeve's does the shoulder's
        top = (len(rows) - 1) * n
        for lift in (0.6, 1.6):
            base = len(verts)
            verts += [t.at(rows[-1] + lift, th, -0.25) for th in ths]
            uvs += [(th * 18.0, rows[-1] + lift) for th in ths]
            faces += [(top + j, top + (j + 1) % n, base + (j + 1) % n, base + j) for j in range(n)]
            top = base
        # the seam under the crotch, front to back, in the plane between the legs
        seam = []
        for i in range(1, k):
            a = math.pi * i / k
            uy, uz = -math.cos(a), -math.sin(a)
            r = self.reach(lambda q, uy=uy, uz=uz: self.outside(0.0, uy * q, z_low + uz * q), 30.0)
            seam.append(len(verts))
            verts.append(Vector((0.0, uy * r, z_low + uz * r)))
            uvs.append((0.0, -r))
        weight: dict[int, float] = {}
        for sx in (1, -1):
            leg = self.legs[sx]
            loop = [(3 * n // 4 + sx * i) % n for i in range(n // 2 + 1)] + seam[::-1]
            d_hem = self.section(sx, PELVIS_BOTTOM - TROUSER_HEM)[4]

            def frame_at(d: float, leg=leg) -> tuple[Vector, Vector, Vector]:
                side, across = leg.frames[leg._row(d)[0]]
                return leg.centre(d), side, across

            start, angle = [], []
            for i in loop:
                d = self.section(sx, verts[i].z)[4]
                c, side, across = frame_at(d)
                a = math.atan2((verts[i] - c).dot(across), (verts[i] - c).dot(side))
                if angle:
                    a += TAU * round((angle[-1] - a) / TAU)
                start.append(d)
                angle.append(a)
            turn = 1 if (angle[-1] - angle[0]) > 0 else -1
            off = sum(a - turn * TAU * j / m for j, a in enumerate(angle)) / m
            even = [off + turn * TAU * j / m for j in range(m)]
            steps = max(4, round(TROUSER_HEM / (0.9 * grain())))
            rings = [loop]
            for q in range(1, steps + 1):
                u = q / steps
                ring_ = []
                for j in range(m):
                    d = start[j] + (d_hem - start[j]) * u
                    th = angle[j] + (even[j] - angle[j]) * smooth(u, 0.0, 0.8)
                    c = leg.centre(d)
                    own = leg._skin(d, th) - c
                    r, way = own.length, own.normalized()
                    if q < steps:
                        # no further than the plane between the legs: beyond it is the other leg's
                        far = min(40.0, (-c.x / way.x) if way.x * sx < -1e-6 else 40.0)

                        def f(q_: float, c=c, way=way, r=r, sx=sx) -> float:
                            p = c + way * q_
                            return smin(q_ - r, smin(self.trunk(p.x, p.y, p.z), self.leg(-sx, p.x, p.y, p.z), FILLET), FILLET)

                        r = self.reach(f, far)
                    ring_.append(len(verts))
                    verts.append(c + way * r)
                    uvs.append((turn * TAU * j / m * 9.0, 30.0 + d))
                    if u < 0.75:
                        weight[ring_[-1]] = 0.5 * (1 - smooth(u, 0.2, 0.75))
                rings.append(ring_)
            for i in loop:
                weight[i] = 0.5
            # then the leg itself, down into the boot, closed at its end
            down = leg.rows(d_hem)
            for d in down[1:]:
                rings.append(list(range(len(verts), len(verts) + m)))
                verts += [leg._skin(d, th) for th in even]
                uvs += [(turn * TAU * j / m * 9.0, 30.0 + d) for j in range(m)]
            rings.append([len(verts)] * m)
            verts.append(leg.centre(down[-1]))
            uvs.append((0.0, 30.0 + down[-1]))
            # wound to look outward, whichever way round the rings run: judged on the hem's ring, which is a plain tube there
            a, b = rings[steps], rings[steps + 1]
            nm = (verts[b[1]] - verts[a[0]]).cross(verts[a[1]] - verts[b[0]])
            out = nm.dot(verts[a[0]] - leg.centre(d_hem)) > 0
            for a, b in zip(rings, rings[1:]):
                for j in range(m):
                    j1 = (j + 1) % m
                    quad = (a[j], b[j], b[j1], a[j1]) if out else (a[j], a[j1], b[j1], b[j])
                    quad = tuple(dict.fromkeys(quad))
                    if len(quad) >= 3:
                        faces.append(quad)
        # the trunk's rows nearest the crotch settle with the legs' first rings
        for r in range(min(4, len(rows) - 2)):
            for j in range(n):
                weight[r * n + j] = max(weight.get(r * n + j, 0.0), 0.5 * (1 - r / 4))
        relax(verts, faces, weight, max(2, round(6 / grain())))
        mb.add([tuple(v) for v in verts], faces, uvs)


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
    y0 = 0.5  # ankle centre
    toe = y0 - 23.5
    heel = toe + BOOT_LENGTH
    for sx in (1, -1):
        x0 = sx * STANCE
        shaft = Tube(
            [(x0, y0, z) for z in (BOOT_TOP, BOOT_TOP - 1.5, 21.0, 15.0, 10.0, 5.0)],
            [(6.2, 6.5), (6.15, 6.45), (5.6, 5.9), (4.9, 5.3), (4.5, 5.1), (4.2, 4.8)],
            resample=5,
        )
        shaft.add(uppers, 28)
        # the foot: heel to toe, squared off underneath so the upper meets the sole at its edge
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
            # its squared underside lies inside the sole, 7 mm under the top face and 2 mm or more
            # over the bottom one, so neither lands on it at a coarse level of detail
            [(x0, y0 + y, z - 0.3) for y, z, _, _ in keys],
            [(a, b - 0.15) for *_, a, b in keys],
            ref=(0, 0, 1),
            resample=5,
            fold=lambda d, th: squareness(th, 4.0) * smooth(-math.sin(th), 0.0, 0.6),
        )
        foot.add(uppers, 28)

        # sole: an outline of stations down the foot, raised at the heel
        n, centre_y, half = 28, (toe + heel) / 2, (heel - toe) / 2
        st = []
        for i in range(n + 1):
            a = math.pi * i / n
            c, s = math.cos(a), math.sin(a)
            y = centre_y - half * math.copysign(abs(c) ** 0.75, c)
            # blunt at toe and heel, with a welt: the sole's wall stands clear of the upper's all
            # round, at any level of detail (a pointed heel let the upper overhang it)
            w = (5.9 + 0.3 * c) * s**0.55 + 0.4 * s**0.25
            h = smooth(y, y0 - 9.0, y0 + 0.5)
            st.append((y, w, 0.45 * h, 1.8 + 1.4 * h))
        inside = Vector((x0, centre_y, 1.0))
        skin(soles, [[Vector((x0 - w, y, zt)), Vector((x0 + w, y, zt))] for y, w, _, zt in st], inside + UP)
        skin(soles, [[Vector((x0 - w, y, zb)), Vector((x0 + w, y, zb))] for y, w, zb, _ in st], inside + UP * 4)
        for s in (-1, 1):
            skin(soles, [[Vector((x0 + s * w, y, zb)), Vector((x0 + s * w, y, zt))] for y, w, zb, zt in st], inside)
        # heel block, set in from the sole's edge
        hy = y0 + 3.5
        hs = [(hy + (y - hy) * 0.93, max(0.0, w * 0.93 - 0.15)) for y, w, _, _ in st if y > y0 - 1.0]
        hs = [(hs[0][0], 0.0), *hs]
        inside = Vector((x0, y0 + 3.5, 0.8))
        skin(soles, [[Vector((x0 - w, y, 0.0)), Vector((x0 + w, y, 0.0))] for y, w in hs], inside + UP)
        for s in (-1, 1):
            skin(soles, [[Vector((x0 + s * w, y, 0.0)), Vector((x0 + s * w, y, 1.7))] for y, w in hs], inside)

        # tongue and laces up the front of the shaft, and across the instep
        th = shaft.toward(FRONT, 10.0)
        shaft.patch(tongue, 1.0, 15.0, th - 0.28, th + 0.28, 0.18, nd=10, nt=4)
        if srlib.DETAIL >= 0.5:
            rows = [
                [(shaft.at(d, th + s * 0.33, 0.65), shaft.normal(d, th + s * 0.33)) for s in (-1, 1)] for d in (1.8, 4.0, 6.2, 8.4, 10.6, 12.8, 15.0)
            ]
            th = foot.toward(UP, 10.0)
            rows += [[(foot.at(d, th - s * 0.33, 0.65), foot.normal(d, th - s * 0.33)) for s in (-1, 1)] for d in (9.4, 11.6, 13.8, 16.0)]
            for (a0, a1), (b0, b1) in zip(rows, rows[1:]):
                laces.tube(a0[0], b1[0], 0.13, 5)
                laces.tube(a1[0] + a1[1] * 0.32, b0[0] + b0[1] * 0.32, 0.13, 5)
            for a0, a1 in (rows[0], rows[-1]):
                laces.tube(a0[0], a1[0], 0.13, 5)
            for pair in rows:
                for p, nm in pair:
                    eyelets.disc(p - nm * 0.9, nm, 0.3, 1.35, 8)  # lacing hooks

    emit(uppers, "Boots_Uppers", M["boot"], g)
    emit(tongue, "Boots_Tongues", M["boot"], g)
    emit(soles, "Boots_Soles", M["rubber"], g, sharp_angle=30)
    emit(laces, "Boots_Laces", M["lace"], g)
    emit(eyelets, "Boots_Eyelets", M["steel"], g)


# ---------------------------------------------------------------------- ventilator


def polyline(keys: Sequence[Sequence[float]], step: float) -> list[Vector]:
    """Points every `step` along a smooth curve through `keys`."""
    pts, n = [Vector(k) for k in keys], len(keys)
    fine = []
    for i in range(n - 1):
        p0, p1, p2, p3 = (pts[max(0, min(n - 1, k))] for k in (i - 1, i, i + 1, i + 2))
        for k in range(24):
            t = k / 24
            fine.append(0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t**3))
    fine.append(pts[-1])
    out, carry = [fine[0]], 0.0
    for a, b in zip(fine, fine[1:]):
        seg = (b - a).length
        while carry + seg >= step:
            a = a + (b - a) * ((step - carry) / seg)
            out.append(a)
            seg, carry = (b - a).length, 0.0
        carry += seg
    return out


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
    _rig.inlet = (inlet, axis)
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
    global _rig
    _rig = Rig()
    build_figure(ventilator=True)
    hinges = {name: (parent, at * CM, axis) for name, (parent, at, axis) in finger_hinges().items()}
    rig = srlib.skeleton({name: p * CM for name, p in joints().items()}, hinges=hinges)
    for obj, follows in _rig.skins:
        srlib.bind(obj, rig, follows)
    # what the viewer carries things by, and runs the ventilator's hose between
    for side, sx in (("L", 1), ("R", -1)):
        hand = hand_of(sx)
        srlib.grip(rig, f"Hand.{side}", f"Grip.{side}", hand.p(*GRIP_AT) * CM, hand.W)
    inlet, axis = _rig.inlet
    srlib.anchor("Inlet", rig, inlet * CM, axis, bone="Spine")
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
    rig = Rig()
    q = SEATED
    down = (0, 0, -1)
    toe_in = math.radians(q["elbow_toe_in"])
    for sx in (1, -1):
        rig.bends[("leg", sx)] = [
            Bend((sx * STANCE, 0.5, ANKLE_Z), (-1, 0, 0), down, 7.0, math.radians(q["ankle"])),
            Bend((sx * 12.3, -1.0, Z_KNEE), (1, 0, 0), down, 10.0, math.radians(q["knee"]), hollow=0.68),
            Bend((sx * HIP_X, 0.0, Z_HIP), (0, sx, 0), down, 8.0, math.radians(q["knees_in"])),
            Bend((sx * HIP_X, 0.0, Z_HIP), (-1, 0, 0), down, 8.0, math.radians(q["hip"])),
        ]
        rig.bends[("pelvis", sx)] = [Bend((0, 0, Z_HIP - 3.0), (-1, 0, 0), down, 9.0, math.radians(q["pelvis"]))]
        ex, ey, ez = ELBOW
        hinge = (-math.cos(toe_in), sx * math.sin(toe_in), 0)
        fore = wrist_point(sx) - Vector((sx * ex, ey, ez))
        rig.bends[("arm", sx)] = [
            Twist((sx * ex, ey, ez), fore, -1.5, 5.5, sx * math.radians(q["pronate"])),  # wound into the elbow's own folds, clear of the lacing
            Bend((sx * ex, ey, ez), hinge, (sx * 0.19, -0.07, -1), 6.0, math.radians(q["elbow"])),
        ]
    # seat frame: origin between the hip joints, head toward -Y, chest toward +Z, his right toward +X
    rig.to_frame = Matrix(((-1, 0, 0, 0), (0, 0, -1, Z_HIP), (0, -1, 0, 0), (0, 0, 0, 1)))
    rig.angles, rig.grip = dict(q), q["grip"]

    def press(p: Vector, limb: str) -> Vector:
        """The front of each thigh, where it would pass through the belly, gives way instead and
        lies against it: a soft wall that the thigh's skin cannot cross, leaving a groin crease
        below the waist strap. Only the trousers' cloth is there, so nothing laid on it is crushed."""
        if limb != "leg" or p.z > 26.0:
            return p
        wall = LAP_CREASE - LAP_SLOPE * max(0.0, p.z - LAP_SKIN)
        over = (p.y - wall) / 1.2
        # (what is pressed back keeps a little of its depth, so the cloth gathered there lies in layers and not all in one plane)
        return Vector((p.x, wall + 1.2 * (math.log1p(math.exp(over)) if over < 30 else over) + 0.15 * min(0.0, p.y - wall), p.z))

    rig.press = press
    return rig


_seated_points: dict[float, dict[str, list[Vector]]] = {}


def seated_points() -> dict[str, list[Vector]]:
    """Every vertex of the seated figure by mesh, in seat-frame centimetres, without building anything."""
    global _rig
    if srlib.DETAIL not in _seated_points:
        keep, _rig = _rig, seated_rig()
        _rig.dry = True
        try:
            build_figure(ventilator=False)
            _seated_points[srlib.DETAIL] = _rig.points
        finally:
            _rig = keep
    return _seated_points[srlib.DETAIL]


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

    def both(fn: Callable[[int], Vector]) -> dict[str, tuple[float, float, float]]:
        return {"left": tuple(fn(1)), "right": tuple(fn(-1))}

    def lowest(prefix: str) -> float:
        return min(p.z for name, ps in pts.items() if name.startswith(prefix) for p in ps)

    helmet = [p for name, ps in pts.items() if name.startswith("Helmet_Shell") for p in ps]
    centre = rig.carry((0, -1.4, HELMET_MID))
    soles = [p for p in pts["Boots_Soles"]]
    return {
        "head_top": tuple(rig.carry((0, -1.4, HELMET_TOP))),
        "helmet_centre": tuple(centre),
        "helmet_radius": max((p - centre).length for p in helmet),
        "helmet_back_z": min(p.z for p in helmet),
        "neck_ring": tuple(rig.carry((0, -0.6, 158.5))),
        "shoulders": both(lambda sx: rig.carry((sx * ARM[1][0], ARM[1][1], ARM[1][2]))),
        "elbows": both(lambda sx: rig.carry((sx * ELBOW[0], ELBOW[1], ELBOW[2]), "arm")),
        "hips": both(lambda sx: rig.carry((sx * HIP_X, 0, Z_HIP))),
        "knees": both(lambda sx: rig.carry((sx * 12.3, -1.0, Z_KNEE), "leg")),
        "ankles": both(lambda sx: rig.carry((sx * STANCE, 0.5, ANKLE_Z), "leg")),
        "heels": both(lambda sx: rig.carry((sx * STANCE, 8.2, 0.0), "leg")),
        "toes": both(lambda sx: rig.carry((sx * STANCE, -23.0, 1.8), "leg")),
        "hands": both(lambda sx: rig.carry(palm_centre(sx), "arm")),
        "grips": both(lambda sx: rig.carry(palm_rest(sx), "arm")),
        "wrists": both(lambda sx: rig.carry(wrist_point(sx), "arm")),
        "back_plane_z": min(lowest("Torso_Shell"), lowest("Legs_Trousers")),
        "seat_y": max(p.y for p in pts["Legs_Trousers"] if p.z < 2.0),  # under the pelvis: the seat of the trousers, behind the hip joints' line
        "thigh_back_y": max(p.y for p in pts["Legs_Trousers"] if 6.0 < p.z < 15),  # the backs of the thighs, clear of the seat
        "sole_y": max(p.y for p in soles),
        "extent_min": tuple(min(p[i] for ps in pts.values() for p in ps) for i in range(3)),
        "extent_max": tuple(max(p[i] for ps in pts.values() for p in ps) for i in range(3)),
    }


def build_seated(parent: bpy.types.Object, place: Matrix, prefix: str = "CrewCabin_Pilot") -> dict:
    """The same figure on the couch, for a cabin: every mesh a child of `parent`, named
    `<prefix>_<Node>_<Mesh>`, with no ventilator (a stub of hose at the waist inlet instead).

    The seat frame is centimetres: origin midway between the hip joints, the torso along -Y (head
    toward -Y), the chest facing +Z, his right hand toward +X. `place` maps that frame, once it is
    in metres, into the caller's space; it is baked into the vertices. Returns seated_key_points().
    Nothing is built below the detail at which interiors are shown."""
    global _rig
    keys = seated_key_points()
    if not srlib.interior():
        return keys
    keep, _rig = _rig, seated_rig()
    _rig.parent, _rig.place, _rig.prefix = parent, Matrix(place), prefix
    try:
        build_figure(ventilator=False)
    finally:
        _rig = keep
    return keys
