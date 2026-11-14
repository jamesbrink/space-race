"""What any crew figure shares: the body under the suit, its joints, and how a garment is hung on it.

A figure is a `Body` (a man's measures: stature, where his joints are, the girths of trunk, arms
and legs as tables of sections) and a garment, which is a module of its own: its materials, what
the cloth does (folds, creases), helmet, gloves, boots and fittings. The Mercury suit is
missions/usa/mercury/crew/mark_iv_suit.py; the Vostok one missions/ussr/vostok/crew/sk_1.py.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure
faces -Y, so its left is +X. It is always modelled standing (the rest pose). From there it is
either skinned to the joints every crew figure has (srlib.FIGURE: `rig_standing`), so the viewer
can walk it, or carried once to a pose by its joints for a cabin (`Rig`, `Bend`, `seated_rig`,
`build_posed`).

What is here:
  - the body's measures and where its joints are           Body, joints
  - how much of each point follows each joint              joint_weights, lower_weights, leg_share
  - a limb as a skin that can be asked where it is         Tube, Folds, skin, band, ring, lacing, buckle
  - the trunk from the waist up with both shoulders        build_shell
  - the garment from the waist down as one skin            Trousers
  - a hand, with the grip the viewer carries things by     Hand, gloved_hand, hand_of
  - a head for a visor to have behind it                   build_head
  - the pose                                               Rig, Bend, Twist, emit, group, seated_rig

The top-level nodes of a figure are Helmet, Torso, Arms, Gloves, Legs and Boots (JOINTED); a
garment may add others that are not part of him (something he carries). `use(body)` says whose
body is being built; nothing here knows any one suit.
"""

from __future__ import annotations

import bisect
import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import CM, TAU, MeshBuilder, arc_profile, frame


@dataclass
class Body:
    """A man's measures, centimetres, boots on. Heights of the landmarks are fractions of his
    stature (Drillis and Contini's segment proportions) over the heel of his boot; the sections of
    trunk, arm and leg are given as tables once the landmarks are known (they are the body in
    its garment: a suit's bulk is in them)."""

    stature: float
    heel: float  # boot heel under the foot
    knee: float = 0.285
    crotch: float = 0.47
    hip: float = 0.530
    shoulder: float = 0.818
    hip_x: float = 9.6  # hip joint off the midline
    stance: float = 13.5  # ankle centre off the midline
    ankle_y: float = 0.5
    ankle_z: float = 10.0
    spine_z: float = 106.0  # the waist: above it the torso follows Spine
    neck_z: float = 157.0
    waist_z: float = 103.0  # above it the garment is the Torso node's shell; from it down, the Legs node's trousers
    crotch_drop: float = 3.0  # the crotch of the trousers hangs this far under the body's own
    crotch_round: float = 3.0  # and the trunk is rounded off underneath from this far over it
    hip_crease: float = 5.0  # either side of the line a thigh folds on, the cloth is shared between the pelvis and the thigh over this much
    fillet: float = 2.0  # over which trunk and thighs run into each other
    trouser_hem: float = 7.0  # below the crotch by this much a leg is its own tube again
    torso_z0: float = 82.0
    torso: list = field(default_factory=list)  # (z, half-width, half-depth), from under the pelvis to the neck
    z_pit: float = 130.5  # the armhole in the torso: armpit ...
    z_yoke: float = 151.0  # ... to the top of the shoulder
    armhole: float = 0.47  # its half-width round the torso, radians
    pit_x: float = 18.5  # the armpit off the midline
    # (x, y, z, radius across, radius fore-and-aft) down the left arm; the first point is inside the torso, the second the shoulder joint
    arm: list = field(default_factory=list)
    elbow_at: int = 4  # which of those is the elbow
    cuff_to_wrist: float = 5.5  # the sleeve ends inside the glove's cuff, this far above the wrist
    sleeve_hem: float = 28.5  # down the arm's path: the shoulder (Torso node) ends and the sleeve (Arms node) shows
    leg: list = field(default_factory=list)  # likewise for the left leg, from the hip joint (inside the pelvis) to inside the boot
    knee_at: int = 5  # which of those is the knee
    skull: tuple = (7.6, 9.6, 11.0)  # half-width, half-depth and half-height of the head before its features
    head_y: float = -1.2
    hand: float = 1.0  # the hand's size beside a man's of 1.80 m

    def landmark(self, fraction: float) -> float:
        """Height of a body landmark above the floor, boots on."""
        return fraction * self.stature + self.heel

    @property
    def z_knee(self) -> float:
        return self.landmark(self.knee)

    @property
    def z_crotch(self) -> float:
        return self.landmark(self.crotch)

    @property
    def z_hip(self) -> float:
        return self.landmark(self.hip)

    @property
    def z_shoulder(self) -> float:
        return self.landmark(self.shoulder)

    @property
    def z_crown(self) -> float:
        return self.landmark(1.0)

    @property
    def pelvis_bottom(self) -> float:
        return self.z_crotch - self.crotch_drop

    @property
    def pelvis_top(self) -> float:
        return self.z_crotch + self.crotch_round

    @property
    def head(self) -> Vector:
        """The centre of the skull."""
        return Vector((0, self.head_y, self.z_crown - self.skull[2]))

    @property
    def elbow(self) -> tuple[float, float, float]:
        return tuple(self.arm[self.elbow_at][:3])

    def shoulder_point(self, sx: int) -> Vector:
        return Vector((sx * self.arm[1][0], *self.arm[1][1:3]))

    def elbow_point(self, sx: int) -> Vector:
        x, y, z = self.elbow
        return Vector((sx * x, y, z))

    def hip_point(self, sx: int) -> Vector:
        return Vector((sx * self.hip_x, 0.0, self.z_hip))

    def knee_point(self, sx: int) -> Vector:
        x, y, z = self.leg[self.knee_at][:3]
        return Vector((sx * x, y, z))

    def ankle_point(self, sx: int) -> Vector:
        return Vector((sx * self.stance, self.ankle_y, self.ankle_z))

    def scaled(self, stature: float, heel: float, breadth: float, girth: float, bulk: tuple[float, float, float] = (0.0, 0.0, 0.0), **more) -> Body:
        """Another man on the same plan: every height carried to the new stature (so the landmarks
        fall where his proportions put them), every distance from the midline scaled by `breadth`,
        every section's radii by `girth` and then let out by `bulk` centimetres (a looser garment:
        trunk, arms, legs). `more` sets whatever else differs."""
        k = stature / self.stature

        def z(v: float) -> float:
            return heel + (v - self.heel) * k

        def limb(rows: list, out: float) -> list:
            return [(x * breadth, y * breadth, z(h), a * girth + out, b * girth + out) for x, y, h, a, b in rows]

        out = Body(
            stature=stature,
            heel=heel,
            knee=self.knee,
            crotch=self.crotch,
            hip=self.hip,
            shoulder=self.shoulder,
            hip_x=self.hip_x * breadth,
            stance=self.stance * breadth,
            ankle_y=self.ankle_y,
            ankle_z=z(self.ankle_z),
            spine_z=z(self.spine_z),
            neck_z=z(self.neck_z),
            waist_z=z(self.waist_z),
            crotch_drop=self.crotch_drop,
            crotch_round=self.crotch_round,
            hip_crease=self.hip_crease,
            fillet=self.fillet,
            trouser_hem=self.trouser_hem,
            torso_z0=z(self.torso_z0),
            torso=[(z(h), a * girth + bulk[0], b * girth + bulk[0]) for h, a, b in self.torso],
            z_pit=z(self.z_pit),
            z_yoke=z(self.z_yoke),
            armhole=self.armhole,
            pit_x=self.pit_x * breadth,
            arm=limb(self.arm, bulk[1]),
            elbow_at=self.elbow_at,
            cuff_to_wrist=self.cuff_to_wrist * k,
            sleeve_hem=self.sleeve_hem * k,
            leg=limb(self.leg, bulk[2]),
            knee_at=self.knee_at,
            skull=self.skull,
            head_y=self.head_y,
            hand=self.hand * k,
        )
        for name, value in more.items():
            setattr(out, name, value)
        return out


FRONT, UP = Vector((0, -1, 0)), Vector((0, 0, 1))


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
            share = smooth(B.waist_z - 2.0 - v.z, 0.0, B.waist_z - 2.0 - B.pelvis_bottom)
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


def man(stature: float = 180.3, heel: float = 2.8) -> Body:
    """A man of 1.80 m in a close-fitting suit (about 2 cm over the body all round), standing with
    his feet 27 cm apart: the sections every figure starts from. They were sized by eye for the
    Mercury suit on Alan Shepard; another man is this one `scaled`."""
    body = Body(stature=stature, heel=heel)
    # (z, half-width, half-depth), from under the pelvis to the neck inside the ring. Below the crotch
    # the trunk is rounded off into the thighs (figurelib.Trousers), so the first rows are only what that starts from.
    body.torso = [
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
    # (x, y, z, radius across, radius fore-and-aft) for the left arm; the first point is inside the torso
    body.arm = [
        (11.5, 0.0, 146.0, 4.0, 4.2),
        (19.3, 0.0, body.z_shoulder - 4.7, 6.4, 6.7),
        (22.8, 0.0, 139.5, 6.6, 6.9),
        (24.9, 0.3, 130.5, 6.3, 6.5),
        (27.4, 0.8, 117.5, 5.6, 5.7),  # the elbow
        (28.6, -0.9, 108.5, 5.4, 5.4),
        (29.6, -2.9, 100.5, 4.7, 4.7),
        (30.1, -3.9, 96.5, 4.3, 4.3),
    ]
    # likewise for the left leg, from the hip joint (inside the pelvis) to inside the boot
    body.leg = [
        (9.6, 0.0, body.z_hip + 0.5, 7.4, 8.6),
        (9.9, 0.0, 92.0, 8.6, 9.9),
        (10.5, 0.0, body.z_crotch - 3.5, 9.0, 10.2),
        (10.9, -0.3, 75.0, 9.0, 9.7),
        (11.6, -0.8, 65.0, 8.1, 8.5),
        (12.3, -1.0, body.z_knee, 7.0, 7.3),  # the knee
        (12.8, 0.2, 43.0, 6.8, 7.2),
        (body.stance, 0.6, 32.0, 5.8, 6.1),
        (body.stance, 0.5, 20.0, 4.7, 4.9),
    ]
    return body


_rig = Rig()
B: Body = None  # the body being built: use()


def use(body: Body) -> None:
    """Build this body from here on: every function of this module reads its measures."""
    global B
    B = body


def rig() -> Rig:
    """The pose being built: the standing figure's, or the one a posed figure is being carried to."""
    return _rig


def start() -> Rig:
    """Begin a standing figure: nothing turned, nothing built."""
    global _rig
    _rig = Rig()
    return _rig


# ---------------------------------------------------------------------- the skeleton
#
# The standing figure can also be moved by the viewer: it is skinned to the joints every crew
# figure has (srlib.FIGURE). The seated figure is not; it is carried to its pose above, once.

JOINTED = ("Helmet", "Torso", "Arms", "Gloves", "Legs", "Boots")  # the ventilator is not part of him


def joints() -> dict[str, Vector]:
    """Where each joint is in the rest pose, centimetres."""
    out = {"Hips": Vector((0, 0, B.z_hip)), "Spine": Vector((0, 0, B.spine_z)), "Head": Vector((0, 0, B.neck_z))}
    for side, sx in (("L", 1), ("R", -1)):
        out[f"UpperArm.{side}"] = B.shoulder_point(sx)
        out[f"LowerArm.{side}"] = B.elbow_point(sx)
        out[f"Hand.{side}"] = wrist_point(sx)
        out[f"UpperLeg.{side}"] = B.hip_point(sx)
        out[f"LowerLeg.{side}"] = B.knee_point(sx)
        out[f"Foot.{side}"] = B.ankle_point(sx)
    return out


def hand_of(sx: int) -> Hand:
    """A hand of the body's own size, where its arm puts it."""
    return Hand(sx, wrist_point(sx), wrist_point(sx, 1.0) - wrist_point(sx), B.hand)


# (a hand's own measures are a man's of 1.80 m; a body's `hand` scales them: Hand.p)
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


def crease(x: float, y: float) -> float:
    """The height of the line a thigh folds on, at a point `x` from the midline and `y` behind the
    hip joints: in front it runs up and out from the crotch toward the point of the hip, as the
    groin does; behind it lies level under the buttock, which stays with the pelvis."""
    front = B.z_crotch + (B.z_hip + 5.0 - B.z_crotch) * smooth(abs(x), 2.0, 17.0)
    back = B.z_crotch + 1.0 + 5.0 * smooth(abs(x), 8.0, 18.0)
    return back + (front - back) * smooth(-y, -4.0, 4.0)


def leg_share(p: Vector) -> tuple[float, float]:
    """How much of a rest-pose point from the waist down goes with the left leg and with the
    right; the rest is the pelvis's. One function of place for the whole garment, so the seat of
    the trousers, the thighs and anything laid on them move as one cloth. At the crotch's own
    seam the two legs have half each: it stays midway between them as they part."""
    line = crease(p.x, p.y)
    thigh = 1 - smooth(p.z, line - B.hip_crease, line + B.hip_crease)
    if thigh <= 0:
        return 0.0, 0.0
    # below the crotch a leg is its own; above it the two sides run into each other across the middle
    half = 0.05 + 3.5 * smooth(p.z, B.pelvis_bottom - 1.0, B.pelvis_bottom + 6.0)
    left = smooth(p.x, -half, half)
    return thigh * left, thigh * (1 - left)


def lower_weights(p: Vector) -> dict[str, float]:
    """The joints a rest-pose point from the waist down follows: pelvis and spine above the hip's
    crease, then thigh, shin and foot, the cloth shared across each joint over a few centimetres.

    Across the hip's crease the cloth does not go straight from the pelvis to the thigh. Shared
    between two joints a right angle apart, a point is carried to the middle of the chord between
    where each would put it: nearer the hip than either, so with a thigh raised level the groin
    sank. Between them is a joint that turns half as far as the thigh does (`HipHalf.L`/`.R`, on
    the hip joint: the viewer drives it, `gait.ts`: `halfHips`), and the band goes pelvis, half,
    thigh: each step is half the angle, and the middle of the band keeps its distance from the hip."""
    left, right = leg_share(p)
    side = "L" if p.x >= 0 else "R"
    lower = smooth(B.z_knee - p.z, -6.0, 6.0)
    foot = 1 - smooth(p.z, B.ankle_z - 2.0, B.ankle_z + 7.0)
    spine = smooth(p.z, B.spine_z - 7.0, B.spine_z + 7.0)
    legs = left + right
    rest = max(0.0, 1 - 2 * legs)
    half = 1 - abs(2 * legs - 1)  # all of it the half-turn's in the middle of the band
    thigh = max(0.0, 2 * legs - 1)
    out = {"Hips": rest * (1 - spine), "Spine": rest * spine, f"LowerLeg.{side}": lower * (1 - foot), f"Foot.{side}": lower * foot}
    for leg, w in (("L", left), ("R", right)):
        if legs > 0:
            out[f"HipHalf.{leg}"] = half * w / legs
            out[f"UpperLeg.{leg}"] = thigh * w / legs * (1 - lower)
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
        elbow, wrist = Vector((sx * B.elbow[0], *B.elbow[1:])), wrist_point(sx)
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
    a, b, c = B.skull
    narrow = 1 - 0.2 * smooth(-z, 3.5, 10.5)  # the skull narrows to the jaw
    depth = math.sqrt(max(0.0, 1 - (x / (a * narrow)) ** 2 - (z / c) ** 2))
    front = smooth(depth, 0.1, 0.7)
    return B.head + Vector((x, -b * depth - face_relief(x, z) * front + sunk, z))


def build_head(head: MeshBuilder, eyes: MeshBuilder, dark: MeshBuilder, hair: MeshBuilder, lips: MeshBuilder) -> None:
    a, b, c = B.skull
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
                row.append(B.head + Vector((x, -b * ring_r * math.cos(phi), z)))
        rows.append(row)
    skin(head, rows, B.head, closed=True)
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


def azimuth(th: float) -> float:
    """Degrees round the torso from straight ahead toward his left, -180..180."""
    return (math.degrees(th) + 90 + 180) % 360 - 180


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


def drape(verts: list[Vector], faces: Sequence[tuple[int, ...]], frozen: set[int], ease: Callable[[Vector], float] | None = None) -> None:
    """Folds fanning out from each armpit across the chest and the back, where the cloth of a
    soft suit is gathered when the arms hang: valleys a few millimetres deep, pressed in along
    the skin's own normal after the shoulders have been stitched on. `ease(point)` is how much of
    a fold is left there, 0 to 1: under a strap drawn tight over the cloth there is none."""
    normal = [Vector() for _ in verts]
    for f in faces:
        nm = sum(((verts[f[i]] - verts[f[0]]).cross(verts[f[i + 1]] - verts[f[0]]) for i in range(1, len(f) - 1)), Vector())
        for i in f:
            normal[i] += nm
    for sx in (1, -1):
        pit = Vector((sx * B.pit_x, 0.0, B.z_pit + 1.0))
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
                move = normal[i].normalized() * fall * smooth(reach, 2.5, 6.0) * (1 - smooth(reach, 11.5, 19.0)) * smooth(v.y * side, 0.5, 3.0)
                verts[i] = p + (move * ease(p) if ease else move)


def build_shell(mb: MeshBuilder, t: Tube, arms: dict[int, Tube], ease: Callable[[Vector], float] | None = None) -> None:
    """The torso from the waist up and both shoulders as one skin. The torso is a grid with an armhole cut in each
    side; from each hole's edge a sleeve is lofted over the shoulder and down to SLEEVE_HEM on the
    upper arm, where the Arms node's sleeve carries on from the same ring of points. Stitched to the hole
    and relaxed, the cloth runs from chest to arm without a crease. `ease` is drape's: where the armpits' folds are pressed flat."""
    n = trunk_sides()
    rows = t.rows(B.waist_z - B.torso_z0, must=(B.z_pit - B.torso_z0, B.z_yoke - B.torso_z0))
    ra = min(range(len(rows)), key=lambda r: abs(rows[r] - (B.z_pit - B.torso_z0)))
    rb = min(range(len(rows)), key=lambda r: abs(rows[r] - (B.z_yoke - B.torso_z0)))
    jw = max(1, round(B.armhole / (TAU / n)))
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
            ds = [2.0 + (B.sleeve_hem - 3.5) * k / 60 for k in range(61)]
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
                d = d0 + (B.sleeve_hem - d0) * u
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
    drape(verts, faces, frozen, ease)
    mb.share = [share.get(i, 0.0) for i in range(len(verts))]
    mb.add([tuple(v) for v in verts], faces, uvs)


def wrist_point(sx: int, beyond: float = 0.0) -> Vector:
    """The wrist in the rest pose, or a point `beyond` it down the hand."""
    cuff, before = Vector((sx * B.arm[-1][0], *B.arm[-1][1:3])), Vector((sx * B.arm[-2][0], *B.arm[-2][1:3]))
    return cuff + (cuff - before).normalized() * (B.cuff_to_wrist + beyond)


def palm_centre(sx: int) -> Vector:
    return wrist_point(sx, 6.5 * B.hand)


def palm_rest(sx: int) -> Vector:
    """The middle of the palm's skin: what lies on a hand controller's knob."""
    return hand_of(sx).p(-2.4, 0.0, 5.0)


# -------------------------------------------------------------------------- gloves


class Hand:
    """Axes of a relaxed hand: D toward the fingertips, B out of the back of the hand, W across
    the knuckles toward the little finger. The back of the hand faces out and a little forward."""

    def __init__(self, sx: int, wrist: Vector, distal: Vector, size: float = 1.0) -> None:
        self.o, self.D, self.size = wrist, distal.normalized(), size
        b = Vector((sx * math.cos(math.radians(25)), -math.sin(math.radians(25)), 0))
        self.B = (b - self.D * b.dot(self.D)).normalized()
        w = self.D.cross(self.B)
        self.W = w if w.y > 0 else -w

    def p(self, u: float, v: float, w: float) -> Vector:
        """A point of the hand: out of its back, across it and down it from the wrist, in a full-sized hand's centimetres."""
        k = self.size
        return self.o + self.B * (u * k) + self.W * (v * k) + self.D * (w * k)

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


def trunk_sides() -> int:
    """Sides of the trunk's skin at this level of detail: the shell's and the trousers', which share the waist's ring. A multiple of four."""
    return 4 * max(2, round(sides(72) / 4))


def smin(a: float, b: float, k: float) -> float:
    """The lesser of two distances, rounded off where they are within `k` of each other: two forms run into one."""
    h = max(k - abs(a - b), 0.0) / k
    return min(a, b) - h * h * k * 0.25


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
        if z >= B.pelvis_top:
            return 1.0
        return math.sqrt(max(0.0, 1 - ((B.pelvis_top - z) / (B.pelvis_top - B.pelvis_bottom)) ** 2))

    def trunk(self, x: float, y: float, z: float) -> float:
        """About how far a point is outside the trunk (negative: inside), centimetres."""
        t = self.torso
        cap = self.cap(z)
        rho = math.hypot(x, y)
        if cap < 1e-3:
            return rho + (B.pelvis_bottom - z if z < B.pelvis_bottom else 0.0) + 0.01
        i, f = t._row(z - B.torso_z0)
        rad = t.rads[i].lerp(t.rads[i + 1], f)
        if rho < 1e-6:
            return -min(rad.x, rad.y) * cap
        th = math.atan2(y / rad.y, x / rad.x)
        k = cap * (1 + (t.fold(z - B.torso_z0, th) if t.fold else 0.0))
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
        return smin(self.trunk(x, y, z), smin(self.leg(1, x, y, z), self.leg(-1, x, y, z), B.fillet), B.fillet)

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
        z_low = B.pelvis_bottom + 2.5
        rows = t.rows(z_low - B.torso_z0, B.waist_z - B.torso_z0)
        verts: list[Vector] = []
        uvs: list[tuple[float, float]] = []
        faces: list[tuple[int, ...]] = []
        # the trunk, from just over the crotch up to the waist
        for d in rows:
            z = B.torso_z0 + d
            cap = self.cap(z)
            for th in ths:
                own = t._skin(d, th)
                edge = math.hypot(own.x, own.y)
                ux, uy = own.x / edge, own.y / edge
                r = edge * cap
                if z < self.leg_top + 0.5:
                    legs = lambda q, ux=ux, uy=uy, z=z: smin(self.leg(1, ux * q, uy * q, z), self.leg(-1, ux * q, uy * q, z), B.fillet)  # noqa: E731
                    r = self.reach(lambda q, r=r, legs=legs: smin(q - r, legs(q), B.fillet), 40.0)
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
            d_hem = self.section(sx, B.pelvis_bottom - B.trouser_hem)[4]

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
            steps = max(4, round(B.trouser_hem / (0.9 * grain())))
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
                            return smin(q_ - r, smin(self.trunk(p.x, p.y, p.z), self.leg(-sx, p.x, p.y, p.z), B.fillet), B.fillet)

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


# -------------------------------------------------------------------------- a hand


def gloved_hand(shell: MeshBuilder, sx: int, along: Vector, fingers: list[float]) -> tuple[Hand, Tube]:
    """One hand's skin, in whatever glove the garment's material makes of it: cuff, wrist and
    palm, four fingers, the thumb and its web, relaxed or closed as the pose's `grip` has it.
    `along` is the way the forearm runs into it. `fingers` gets, for each vertex added, how much
    of it is finger beyond the knuckle (what `Fingers.L`/`.R` turn). Returns the hand and the
    tube of its cuff and palm, for a garment to lay its own fittings on: both in a full-sized
    hand's measures; a smaller body's hand is the same hand scaled about its wrist (`fitted`)."""
    hand = Hand(sx, wrist_point(sx), along)
    first_vertex = len(shell.verts)
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
    fitted(shell, first_vertex, hand)
    return hand, palm


def fitted(mb: MeshBuilder, first: int, hand: Hand) -> None:
    """What was added to `mb` from vertex `first` on was made for a full-sized hand: bring it to the body's own, about the wrist."""
    if B.hand == 1.0:
        return
    for i in range(first, len(mb.verts)):
        mb.verts[i] = tuple(hand.o + (Vector(mb.verts[i]) - hand.o) * B.hand)


# --------------------------------------------------------------------------- boots


def laced_boots(
    uppers: MeshBuilder,
    soles: MeshBuilder,
    laces: MeshBuilder,
    eyelets: MeshBuilder,
    tongue: MeshBuilder,
    top: float,
    length: float,
    size: float = 1.0,
    lace_lift: float = 0.0,
) -> None:
    """A pair of laced boots on the body's feet: shaft and foot, sole and heel block, a tongue,
    laces on hooks. `top` is how high the shaft stands and `length` the sole from toe to heel,
    both as on a man of 1.80 m; `size` scales the whole boot for another, and `lace_lift` stands
    the laces that much further off the leather (a boot made smaller brings them nearer it)."""
    y0 = B.ankle_y  # ankle centre
    toe = y0 - 23.5
    heel = toe + length
    for sx in (1, -1):
        x0 = sx * B.stance
        first = [len(mb.verts) for mb in (uppers, soles, laces, eyelets, tongue)]
        shaft = Tube(
            [(x0, y0, z) for z in (top, top - 1.5, 21.0, 15.0, 10.0, 5.0)],
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
                [(shaft.at(d, th + s * 0.33, 0.65 + lace_lift), shaft.normal(d, th + s * 0.33)) for s in (-1, 1)]
                for d in (1.8, 4.0, 6.2, 8.4, 10.6, 12.8, 15.0)
            ]
            th = foot.toward(UP, 10.0)
            rows += [[(foot.at(d, th - s * 0.33, 0.65 + lace_lift), foot.normal(d, th - s * 0.33)) for s in (-1, 1)] for d in (9.4, 11.6, 13.8, 16.0)]
            for (a0, a1), (b0, b1) in zip(rows, rows[1:]):
                laces.tube(a0[0], b1[0], 0.13, 5)
                laces.tube(a1[0] + a1[1] * 0.32, b0[0] + b0[1] * 0.32, 0.13, 5)
            for a0, a1 in (rows[0], rows[-1]):
                laces.tube(a0[0], a1[0], 0.13, 5)
            for pair in rows:
                for p, nm in pair:
                    eyelets.disc(p - nm * 0.9, nm, 0.3, 1.35, 8)  # lacing hooks
        # (made to a man's boot of 1.80 m; a smaller body's is the same boot, scaled about the point of the floor under its ankle)
        if size != 1.0:
            foot_at = Vector((x0, y0, 0.0))
            for mb, i0 in zip((uppers, soles, laces, eyelets, tongue), first):
                for i in range(i0, len(mb.verts)):
                    mb.verts[i] = tuple(foot_at + (Vector(mb.verts[i]) - foot_at) * size)


# ------------------------------------------------------------- standing, and posed


def rig_standing() -> bpy.types.Object:
    """The standing figure just built, given its skeleton: every mesh emitted under a jointed node
    is hung on the joints it follows, and each hand gets the grip the viewer carries things by."""
    hinges = {name: (parent, at * CM, axis) for name, (parent, at, axis) in finger_hinges().items()}
    # (the half-turn at each hip, which the crease's cloth follows: lower_weights)
    helpers = {f"HipHalf.{side}": ("Hips", B.hip_point(sx) * CM) for side, sx in (("L", 1), ("R", -1))}
    skeleton = srlib.skeleton({name: p * CM for name, p in joints().items()}, hinges=hinges, helpers=helpers)
    for obj, follows in _rig.skins:
        srlib.bind(obj, skeleton, follows)
    for side, sx in (("L", 1), ("R", -1)):
        hand = hand_of(sx)
        srlib.grip(skeleton, f"Hand.{side}", f"Grip.{side}", hand.p(*GRIP_AT) * CM, hand.W)
    return skeleton


def seated_rig(q: dict[str, float], lap: tuple[float, float, float]) -> Rig:
    """A figure lying in a couch or sitting in a seat, as joint angles in degrees: `hip` (thigh
    raised from the plane of the back), `knee`, `ankle` (toes drawn up), `knees_in`, `pelvis` (the
    seat of the suit rolled under), `elbow`, `elbow_toe_in`, `pronate`, `grip` (0 to 1). The torso
    does not move: the seat frame is laid along it, centimetres, origin between the hip joints,
    head toward -Y, chest toward +Z, the figure's right toward +X.

    `lap` is where a thigh pressed against the belly stops, in that frame: the crease starts this
    far toward the head from the hip joints, at the height of the belly's skin, and opens at this
    slope."""
    lap_crease, lap_skin, lap_slope = lap
    rig = Rig()
    down = (0, 0, -1)
    toe_in = math.radians(q["elbow_toe_in"])
    for sx in (1, -1):
        rig.bends[("leg", sx)] = [
            Bend(B.ankle_point(sx), (-1, 0, 0), down, 7.0, math.radians(q["ankle"])),
            Bend(B.knee_point(sx), (1, 0, 0), down, 10.0, math.radians(q["knee"]), hollow=0.68),
            Bend(B.hip_point(sx), (0, sx, 0), down, 8.0, math.radians(q["knees_in"])),
            Bend(B.hip_point(sx), (-1, 0, 0), down, 8.0, math.radians(q["hip"])),
        ]
        rig.bends[("pelvis", sx)] = [Bend((0, 0, B.z_hip - 3.0), (-1, 0, 0), down, 9.0, math.radians(q["pelvis"]))]
        elbow = B.elbow_point(sx)
        hinge = (-math.cos(toe_in), sx * math.sin(toe_in), 0)
        fore = wrist_point(sx) - elbow
        rig.bends[("arm", sx)] = [
            Twist(elbow, fore, -1.5, 5.5, sx * math.radians(q["pronate"])),  # wound into the elbow's own folds, clear of the lacing
            Bend(elbow, hinge, (sx * 0.19, -0.07, -1), 6.0, math.radians(q["elbow"])),
        ]
    rig.to_frame = Matrix(((-1, 0, 0, 0), (0, 0, -1, B.z_hip), (0, -1, 0, 0), (0, 0, 0, 1)))
    rig.angles, rig.grip = dict(q), q["grip"]

    def press(p: Vector, limb: str) -> Vector:
        """The front of each thigh, where it would pass through the belly, gives way instead and
        lies against it: a soft wall that the thigh's skin cannot cross, leaving a groin crease
        below the waist strap. Only the trousers' cloth is there, so nothing laid on it is crushed."""
        if limb != "leg" or p.z > 26.0:
            return p
        wall = lap_crease - lap_slope * max(0.0, p.z - lap_skin)
        over = (p.y - wall) / 1.2
        # (what is pressed back keeps a little of its depth, so the cloth gathered there lies in layers and not all in one plane)
        return Vector((p.x, wall + 1.2 * (math.log1p(math.exp(over)) if over < 30 else over) + 0.15 * min(0.0, p.y - wall), p.z))

    rig.press = press
    return rig


def posed_points(cache: dict, pose: Callable[[], Rig], build: Callable[[], None]) -> dict[str, list[Vector]]:
    """Every vertex of a posed figure by mesh, in the pose's own frame (centimetres), without
    building anything: `build` is run dry. Kept in `cache` by level of detail."""
    global _rig
    if srlib.DETAIL not in cache:
        keep, _rig = _rig, pose()
        _rig.dry = True
        try:
            build()
            cache[srlib.DETAIL] = _rig.points
        finally:
            _rig = keep
    return cache[srlib.DETAIL]


def build_posed(parent: bpy.types.Object, place: Matrix, prefix: str, pose: Callable[[], Rig], build: Callable[[], None]) -> None:
    """A posed figure, for a cabin: every mesh `build` emits becomes a child of `parent`, named
    `<prefix>_<Node>_<Mesh>`, carried to the pose and then by `place` (which maps the pose's
    frame, once it is in metres, into the caller's space); both are baked into the vertices.
    No skeleton: it is carried to its pose once."""
    global _rig
    keep, _rig = _rig, pose()
    _rig.parent, _rig.place, _rig.prefix = parent, Matrix(place), prefix
    try:
        build()
    finally:
        _rig = keep


def body_key_points(pose: Rig, pts: dict[str, list[Vector]]) -> dict:
    """Where a seat has to be: the joints and reaches of a posed figure in the pose's frame, centimetres. A garment adds its own (helmet, boots)."""

    def both(fn: Callable[[int], Vector]) -> dict[str, tuple[float, float, float]]:
        return {"left": tuple(fn(1)), "right": tuple(fn(-1))}

    def lowest(prefix: str) -> float:
        return min(p.z for name, ps in pts.items() if name.startswith(prefix) for p in ps)

    return {
        "shoulders": both(lambda sx: pose.carry(B.shoulder_point(sx))),
        "elbows": both(lambda sx: pose.carry(B.elbow_point(sx), "arm")),
        "hips": both(lambda sx: pose.carry(B.hip_point(sx))),
        "knees": both(lambda sx: pose.carry(B.knee_point(sx), "leg")),
        "ankles": both(lambda sx: pose.carry(B.ankle_point(sx), "leg")),
        "hands": both(lambda sx: pose.carry(palm_centre(sx), "arm")),
        "grips": both(lambda sx: pose.carry(palm_rest(sx), "arm")),
        "wrists": both(lambda sx: pose.carry(wrist_point(sx), "arm")),
        "back_plane_z": min(lowest("Torso_Shell"), lowest("Legs_Trousers")),
        "seat_y": max(p.y for p in pts["Legs_Trousers"] if p.z < 2.0),  # under the pelvis: the seat of the trousers, behind the hip joints' line
        "thigh_back_y": max(p.y for p in pts["Legs_Trousers"] if 6.0 < p.z < 15),  # the backs of the thighs, clear of the seat
        "extent_min": tuple(min(p[i] for ps in pts.values() for p in ps) for i in range(3)),
        "extent_max": tuple(max(p[i] for ps in pts.values() for p in ps) for i in range(3)),
    }


def head_view(pose: Rig) -> dict:
    """Where a posed figure sees from and the way his own head is turned, in the pose's frame: `eyes` (centimetres)
    midway between the irises (build_head puts each 3.15 cm off the middle), `look` the way his face is turned and
    `crown` the way the top of his head points (unit vectors). What a seat's eye point is made from."""
    eyes = (head_point(3.15, 0.5) + head_point(-3.15, 0.5)) / 2 + Vector((0, -0.2, 0.02))
    at = pose.carry(eyes)
    return {
        "eyes": tuple(at),
        "look": tuple((pose.carry(eyes + FRONT) - at).normalized()),
        "crown": tuple((pose.carry(eyes + UP) - at).normalized()),
    }
