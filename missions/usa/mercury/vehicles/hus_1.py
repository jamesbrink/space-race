"""The Sikorsky HUS-1 Seahorse (S-58) of the U.S. Marine Corps, as it flew Mercury's recoveries in 1961.

Shared by the flights it recovered; a flight's model/helicopter.py imports this module and calls build() with the
aircraft's own markings (`Markings`). See ./hus-1.md for what each number rests on.

Units. Sikorsky's descriptive arrangement of the S-58 and Jane's give the type in feet (and its tyres in inches), so
the figures here are feet, and a tyre's inches; each is multiplied by FT or IN once, where a point is made. A point
is given as (u, y, z): u feet aft of the tip of the nose, y feet to port, z feet above the ground with the helicopter
standing on its wheels. In the file the helicopter faces +X with its port side on +Y (in the viewer: +X forward,
+Y up, the starboard side toward +Z), and the origin is on the ground straight under the main rotor's axis.

Top-level nodes (each a part; origins in metres, in the viewer's axes):
    Fuselage      the body: skin, cockpit glazing, the cabin inside, markings, rails, the hoist's mount, the
                  whip antenna. Origin at the model's origin.
    MainRotor     the head and four blades, with the shaft. Origin on the rotor axis at the plane of the blades
                  (0, 4.237, 0); turn it about its own Y. Counter-clockwise seen from above, as Sikorsky's rotors
                  turn: a positive turn about +Y.
    TailRotor     its hub and four blades. Origin on the hub, on the port side of the pylon's top; its axis is
                  the node's own Z in the viewer (Y in Blender), across the aircraft.
    TailPylon     the pylon, the gearbox fairing at its top, the horizontal stabiliser. Origin at its foot, where
                  it meets the tail cone. Built unfolded; the fold is not modelled.
    MainGear      the two main legs: oleo, radius rods, axle, wheel and tyre.
    TailWheel     the castoring tail wheel, its fork and oleo.
    CabinDoor     the starboard sliding door, built shut. Origin at its forward lower corner; it slides aft along
                  the viewer's -X by DOOR_TRAVEL feet on the rails above and below the opening.
    Hoist         the rescue hoist's boom, drum and hook, built stowed (lying aft along the starboard side above
                  the door). Origin on its pivot; it swings out to starboard by a positive quarter turn about its
                  own Y. Under it, `Hoist_Sheave`: an empty where the cable leaves the drum.
    CargoHook     the belly hook under the rotor axis that the capsule's line was hung from. Origin at the hook's
                  throat, where the line's eye bears.
    RecoveryPole  the shepherd's hook Reinhard threaded through the capsule's recovery loop, lying on the cabin
                  floor. Origin at its grip end; under it `RecoveryPole_Crook`, an empty at the inside of the crook.
"""

from __future__ import annotations

import bisect
import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass

import bmesh
import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import FT, IN, TAU, MeshBuilder, frame, group, material

# ------------------------------------------------------------------ the type's figures (feet unless said)

ROTOR_D = 56.0  # main rotor diameter: Jane's 1958-59 p. 372; Sikorsky's descriptive arrangement ("56.0 DIA.")
TAIL_ROTOR_D = 9.5  # tail rotor diameter: Sikorsky's descriptive arrangement ("9.5 DIA")
TRACK = 12.0  # main wheels, centre to centre: Jane's 1958-59 p. 372; the arrangement's "12.0"
WHEELBASE = 28.0 + 3.0 / 12  # main axle to tail axle: Jane's 1958-59 p. 372, 28 ft 3 in
FUSELAGE = 46.6  # nose to the pylon's trailing edge: the arrangement's "46.6" (Jane's: 47 ft 2 in)
HEAD_TOP = 14.3  # ground to the top of the rotor head: the arrangement's "14.3" (Jane's: 14 ft 4 in)
TR_TIP_LOW = 77.0 / 12  # ground to the tail rotor's lowest tip: the arrangement's 77 in
MAIN_TYRE = (11.00, 12.0)  # 11.00-12, inches: Jane's 1958-59 p. 372 and the arrangement
TAIL_TYRE = (6.00, 6.0)  # 6.00-6, inches: the same
BLADE_AREA = 35.0  # sq ft, the arrangement's "blade area": one blade's (four would be 140)

# ------------------------------------------------------------------ read off the arrangement (estimated)

X_ROTOR = 10.9  # nose to the rotor axis
X_MAIN = 7.84  # nose to the main axle
X_TAIL = X_MAIN + WHEELBASE  # nose to the tail axle (derived from Jane's wheelbase)
Z_BLADES = 13.9  # the plane of the blades at the hub
BLADE_ROOT = 2.2  # rotor axis to the blade's root fitting
BLADE_CHORD = BLADE_AREA / (ROTOR_D / 2 - BLADE_ROOT - 0.3)  # 1.37 ft (16.4 in): derived from the blade's area
BLADE_THICK = 0.12  # of chord: NACA 0012, the arrangement's blade section
TR_X, TR_Y = 43.7, 1.6  # the tail rotor's hub: aft of the nose, and to port of the pylon's middle (from the plan)
TR_Z = TR_TIP_LOW + TAIL_ROTOR_D / 2  # 11.17 ft: derived
TR_CHORD = 0.55  # tail rotor blade chord: estimated
MAIN_R = (MAIN_TYRE[1] + 2 * 0.9 * MAIN_TYRE[0]) / 2  # 15.9 in: derived from the size code at an aspect of 0.9 (estimated)
TAIL_R = (TAIL_TYRE[1] + 2 * 0.9 * TAIL_TYRE[0]) / 2  # 8.4 in: the same
# The starboard cargo door's opening, as the arrangement draws it dashed (hidden): u from, to; z from, to.
DOOR = (8.6, 12.8, 3.2, 7.2)
DOOR_TRAVEL = 4.4  # how far it slides aft to clear the opening: estimated
CABIN = (6.2, 16.8, 3.0, 8.6, 2.35)  # the cabin's lining: u from, to; floor, ceiling; half-width. Estimated
HOIST_PIVOT = (8.9, -3.25, 7.85)  # the rescue hoist boom's pivot, above the door's forward edge: estimated
HOIST_BOOM = 2.6  # pivot to the drum: estimated


@dataclass(frozen=True)
class Markings:
    """One aircraft's paint: what a photograph of it shows."""

    side: str  # the side number, big on the nose and small on the tail cone ("32")
    code: str  # the squadron's tail code on the pylon ("ET")
    bureau: str | None  # the Navy's bureau number, on the tail cone; None if no photograph gives it
    service: str = "MARINES"


def P(u: float, y: float, z: float) -> Vector:
    """A point given in feet from the nose (aft), to port and up, in the file's metres."""
    return Vector(((X_ROTOR - u) * FT, y * FT, z * FT))


def D(v: Vector) -> tuple[float, float, float]:
    """The inverse of P."""
    return X_ROTOR - v.x / FT, v.y / FT, v.z / FT


# ------------------------------------------------------------------ curves


def curve(keys: Sequence[tuple[float, float]]) -> Callable[[float], float]:
    """A smooth curve through (x, y) keys that never overshoots them (Fritsch and Carlson's monotone cubic)."""
    xs = [k[0] for k in keys]
    ys = [k[1] for k in keys]
    n = len(xs)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2 for i in range(1, n - 1)] + [d[-1]]
    for i in range(n - 1):
        if d[i] == 0:
            m[i] = m[i + 1] = 0.0
            continue
        a, b = m[i] / d[i], m[i + 1] / d[i]
        s = a * a + b * b
        if s > 9:
            t = 3 / math.sqrt(s)
            m[i], m[i + 1] = t * a * d[i], t * b * d[i]

    def f(x: float) -> float:
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = bisect.bisect_right(xs, x) - 1
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]

    return f


# The body's outline, read off Sikorsky's descriptive arrangement (side view for the top and bottom, plan view for
# the width): feet, u aft of the nose. Estimated: the drawing is a reproduction, read to about 2 in.
TOP = curve(
    [
        (0.0, 5.1), (0.08, 5.9), (0.3, 6.6), (0.7, 7.3), (1.3, 7.9), (2.6, 8.7), (4.2, 9.35), (5.0, 10.4), (5.8, 11.3),
        (6.6, 11.8), (7.2, 11.95), (10.0, 11.95), (12.5, 11.9), (14.0, 11.6), (16.0, 11.1), (19.0, 10.1), (21.2, 9.0),
        (24.0, 8.4), (27.5, 7.9), (33.8, 6.9), (37.0, 6.62),
    ]
)  # fmt: skip
BOT = curve(
    [
        (0.0, 5.1), (0.08, 4.3), (0.3, 3.6), (0.7, 3.0), (1.3, 2.6), (2.5, 2.15), (3.8, 1.85), (5.0, 1.72), (16.0, 1.72),
        (18.0, 1.85), (22.0, 2.15), (26.0, 2.35), (30.0, 2.48), (34.0, 2.58), (37.0, 2.62),
    ]
)  # fmt: skip
# where the body is widest, between its top and bottom: level through the cabin, so the cabin's sides (and the door
# that slides along them) do not change with the roof
MID = curve([(0.0, 5.1), (1.0, 5.4), (3.0, 6.2), (4.0, 6.6), (17.0, 6.6), (20.0, 6.0), (24.0, 5.4), (30.0, 4.8), (37.0, 4.62)])
HALF = curve(
    [
        (0.0, 0.0), (0.08, 0.9), (0.3, 1.6), (0.7, 2.1), (1.3, 2.5), (2.2, 2.75), (3.2, 2.85), (17.0, 2.85), (19.0, 2.6),
        (21.0, 2.2), (24.0, 1.6), (28.0, 1.25), (32.0, 0.95), (37.0, 0.68),
    ]
)  # fmt: skip
SQUARE = curve([(0.0, 2.3), (2.0, 2.4), (4.5, 4.0), (17.0, 4.0), (21.0, 2.7), (37.0, 2.6)])  # superellipse exponent
TAPER = curve([(0.0, 0.0), (3.5, 0.0), (5.0, 0.22), (13.0, 0.25), (17.0, 0.4), (22.0, 0.25), (37.0, 0.1)])  # narrower above
U_END = 37.0  # the tail cone's end, inside the pylon's foot


def section(u: float, phi: float) -> tuple[float, float]:
    """(y, z) of the body's skin at u, `phi` round from the top toward port."""
    zc, n = MID(u), SQUARE(u)
    c, s = math.cos(phi), math.sin(phi)
    t = math.copysign(abs(c) ** (2 / n), c)
    z = zc + (TOP(u) - zc if c > 0 else zc - BOT(u)) * t
    w = HALF(u) * (1 - TAPER(u) * max(0.0, t) ** 2)
    return w * math.copysign(abs(s) ** (2 / n), s), z


def body(u: float, phi: float, off: float = 0.0) -> Vector:
    """A point of the skin (metres), `off` feet out along its normal."""
    y, z = section(u, phi)
    p = P(u, y, z)
    return p + body_normal(u, phi) * (off * FT) if off else p


def body_normal(u: float, phi: float) -> Vector:
    e = 1e-3
    du = P(u + e, *section(u + e, phi)) - P(u - e, *section(u - e, phi))
    dp = P(u, *section(u, phi + e)) - P(u, *section(u, phi - e))
    n = dp.cross(du)
    y, z = section(u, phi)
    if n.dot(Vector((0.0, y, z - MID(u)))) < 0:
        n = -n
    return n.normalized()


def phi_side(u: float, z: float, side: int) -> float:
    """The phi at which the skin at u is at height z, on the port (+1) or starboard (-1) side."""
    zc = MID(u)
    h = TOP(u) - zc if z > zc else zc - BOT(u)
    t = max(-0.999, min(0.999, (z - zc) / h))
    c = math.copysign(abs(t) ** (SQUARE(u) / 2), t)
    return math.atan2(side * math.sqrt(max(0.0, 1 - c * c)), c)


def phi_top(u: float, y: float) -> float:
    """The phi on the upper half of the skin at u at which it is y to port (y rises with phi there, either side)."""
    lo, hi = (0.0, math.pi / 2) if y >= 0 else (-math.pi / 2, 0.0)
    for _ in range(48):
        mid = (lo + hi) / 2
        if section(u, mid)[0] < y:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# ------------------------------------------------------------------ the pylon's outline (feet; estimated likewise)

PY_Z = [2.66, 2.7, 2.86, 3.2, 3.8, 5.0, 6.4, 6.9, 8.0, 9.5, 11.0, 11.3, 11.55, 11.8]
PY_LE = curve([(2.66, 36.6), (6.4, 36.6), (6.9, 37.4), (8.0, 38.37), (10.0, 40.15), (11.3, 41.3), (11.55, 41.5), (11.8, 41.9)])
PY_TE = curve(
    [(2.66, 37.6), (2.7, 38.4), (2.86, 39.4), (3.2, 40.5), (3.8, 41.3), (5.0, 42.0), (8.5, 44.06), (11.3, 45.7), (11.55, 45.65), (11.8, 45.2)]
)
PY_HALF = curve([(2.66, 0.66), (6.0, 0.62), (11.0, 0.5), (11.8, 0.42)])
PY_N = 2.4


def fin(z: float, th: float) -> tuple[float, float]:
    """(u, y) of the pylon's skin at height z, `th` round from its leading edge toward port."""
    le, te = PY_LE(z), PY_TE(z)
    c, s = math.cos(th), math.sin(th)
    um, a = (le + te) / 2, (te - le) / 2
    return um - a * math.copysign(abs(c) ** (2 / PY_N), c), PY_HALF(z) * math.copysign(abs(s) ** (2 / PY_N), s)


def fin_point(z: float, th: float, off: float = 0.0) -> Vector:
    u, y = fin(z, th)
    p = P(u, y, z)
    if not off:
        return p
    e = 1e-3
    dz = P(*_fin3(z + e, th)) - P(*_fin3(z - e, th))
    dt = P(*_fin3(z, th + e)) - P(*_fin3(z, th - e))
    n = dt.cross(dz)
    if n.dot(p - P((PY_LE(z) + PY_TE(z)) / 2, 0, z)) < 0:
        n = -n
    return p + n.normalized() * (off * FT)


def _fin3(z: float, th: float) -> tuple[float, float, float]:
    u, y = fin(z, th)
    return u, y, z


def th_side(z: float, u: float, side: int) -> float:
    le, te = PY_LE(z), PY_TE(z)
    c = max(-0.999, min(0.999, ((le + te) / 2 - u) / ((te - le) / 2)))
    c = math.copysign(abs(c) ** (PY_N / 2), c)
    return math.atan2(side * math.sqrt(max(0.0, 1 - c * c)), c)


# ------------------------------------------------------------------ materials


def materials() -> dict:
    m = material
    return {
        # Overall a dark olive green, as a colour photograph of a Marine HUS-1 of 1960 (HMR(L)-163 off the Bennington)
        # shows it; the black-and-white photographs of 21 July 1961 show the same dark tone under white lettering.
        # The shade is estimated: no paint chip or specification was read.
        "paint": m("paint-usmc-olive", (0.10, 0.11, 0.065), 0.0, 0.5),
        "white": m("paint-insignia-white", (0.80, 0.80, 0.78), 0.0, 0.45),
        "blue": m("paint-insignia-blue", (0.025, 0.04, 0.14), 0.0, 0.45),
        "red": m("paint-insignia-red", (0.42, 0.03, 0.025), 0.0, 0.45),
        "yellow": m("paint-blade-tip-yellow", (0.75, 0.55, 0.04), 0.0, 0.45),
        "blade": m("paint-rotor-blade", (0.05, 0.05, 0.05), 0.2, 0.45),
        "void": m("window-void", (0.012, 0.014, 0.016), 0.0, 0.2),
        "louvre": m("aluminium-louvre", (0.42, 0.43, 0.40), 0.8, 0.45),
        "inside": m("cabin-interior", (0.13, 0.14, 0.11), 0.0, 0.8),
        "metal": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "rubber": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "hub": m("paint-hub-grey", (0.30, 0.31, 0.30), 0.3, 0.5),
        "alu": m("aluminium-pole", (0.62, 0.62, 0.61), 1.0, 0.45),
    }


def _reuse(mats: dict) -> dict:
    """Use the caller's materials where the names match, so the GLB has one of each."""
    out = {}
    for key, mat in mats.items():
        first = bpy.data.materials.get(mat.name.split(".")[0])
        if first is not None and first is not mat:
            bpy.data.materials.remove(mat)
            mat = first
        out[key] = mat
    return out


# ------------------------------------------------------------------ helpers


def oriented(mb: MeshBuilder, verts: Sequence[Vector], faces: Sequence[Sequence[int]], normal_of: Callable[[int], Vector]) -> None:
    """Add faces, each turned to face along `normal_of(its first vertex)`."""
    out = []
    for f in faces:
        a, b, c = (verts[i] for i in f[:3])
        n = (b - a).cross(c - a)
        out.append(tuple(f) if n.dot(normal_of(f[0])) >= 0 else tuple(reversed(f)))
    mb.add([tuple(v) for v in verts], out)


def fan(mb: MeshBuilder, tip: Vector, ring: Sequence[Vector], outward: Vector) -> None:
    verts = [tip, *ring]
    faces = [(0, 1 + i, 1 + (i + 1) % len(ring)) for i in range(len(ring))]
    oriented(mb, verts, faces, lambda _i: outward)


def outward(mb: MeshBuilder, inner: Callable[[Vector], Vector]) -> None:
    """Turn every face of `mb` to face away from `inner(its middle)`, a point inside the solid it skins."""
    out = []
    for f in mb.faces:
        vs = [Vector(mb.verts[i]) for i in f]
        mid = sum(vs, Vector()) / len(vs)
        n = Vector()
        for a, b in zip(vs, vs[1:] + vs[:1]):  # Newell's normal: right for a face that is not quite flat
            n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
        out.append(tuple(f) if n.dot(mid - inner(mid)) >= 0 else tuple(reversed(f)))
    mb.faces = out


def flat_text(body_: str, font, height: float, longest: float | None = None) -> tuple[list[tuple[float, float]], list[tuple[int, ...]], float]:
    """Lettering laid flat, its capitals `height` feet tall, from x = 0 at the left, narrowed to `longest` feet if it
    would be longer; and its length."""
    verts, faces = srlib.text_mesh(body_, 1.0, font)
    ys = [v[1] for v in verts]
    xs = [v[0] for v in verts]
    k = height / (max(ys) - min(ys))
    x0, y0 = min(xs), min(ys)
    length = (max(xs) - x0) * k
    kx = k * min(1.0, (longest or length) / length)
    return [((x - x0) * kx, (y - y0) * k) for x, y, _ in verts], faces, length * kx / k


def star(r: float) -> tuple[list[tuple[float, float]], list[tuple[int, ...]]]:
    """A five-pointed star with its points on a circle of radius r, one point up."""
    pts = [(0.0, 0.0)]
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.382
        pts.append((rr * math.cos(a), rr * math.sin(a)))
    return pts, [(0, 1 + i, 1 + (i + 1) % 10) for i in range(10)]


def disc2(r: float, n: int = 40) -> tuple[list[tuple[float, float]], list[tuple[int, ...]]]:
    n = srlib._segs(n)
    pts = [(0.0, 0.0)] + [(r * math.cos(TAU * i / n), r * math.sin(TAU * i / n)) for i in range(n)]
    return pts, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]


def rect2(x0: float, y0: float, x1: float, y1: float, cuts: int = 6) -> tuple[list[tuple[float, float]], list[tuple[int, ...]]]:
    """A rectangle divided into a grid, so it bends with a curved skin."""
    pts, faces = [], []
    for j in range(cuts + 1):
        for i in range(cuts + 1):
            pts.append((x0 + (x1 - x0) * i / cuts, y0 + (y1 - y0) * j / cuts))
    for j in range(cuts):
        for i in range(cuts):
            a = j * (cuts + 1) + i
            faces.append((a, a + 1, a + cuts + 2, a + cuts + 1))
    return pts, faces


def quad2(corners: Sequence[tuple[float, float]], cuts: int = 6) -> tuple[list[tuple[float, float]], list[tuple[int, ...]]]:
    """Any four-cornered patch (corners in order), divided into a grid."""
    (ax, ay), (bx, by), (cx, cy), (dx, dy) = corners
    pts, faces = [], []
    for j in range(cuts + 1):
        t = j / cuts
        for i in range(cuts + 1):
            s = i / cuts
            x = (1 - t) * ((1 - s) * ax + s * bx) + t * ((1 - s) * dx + s * cx)
            y = (1 - t) * ((1 - s) * ay + s * by) + t * ((1 - s) * dy + s * cy)
            pts.append((x, y))
    for j in range(cuts):
        for i in range(cuts):
            a = j * (cuts + 1) + i
            faces.append((a, a + 1, a + cuts + 2, a + cuts + 1))
    return pts, faces


# The skin and the pylon as built, so that what is painted on them stands off the faces that are drawn, not off the
# curve they approximate: where an outline is concave, a facet stands proud of the curve.
SURFACES: dict = {}


def onto(which: str, p: Vector, n: Vector, off: float) -> Vector:
    """`p`, a point of the true surface with outward normal `n`, moved onto the built mesh `which` and `off` feet out."""
    tree = SURFACES.get(which)
    if tree is not None:
        hit = tree.ray_cast(p + n * (0.3 * FT), -n, 0.6 * FT)[0]
        if hit is not None:
            p = hit
    return p + n * (off * FT)


def remember(which: str, mb: MeshBuilder) -> None:
    from mathutils.bvhtree import BVHTree

    SURFACES[which] = BVHTree.FromPolygons([Vector(v) for v in mb.verts], mb.faces, epsilon=0.0)


def fine(pts, faces, longest: float = 0.25):
    """A flat figure's faces cut into triangles no side of which is longer than `longest` feet, so that, laid on a
    curved skin, none sinks into it between its corners."""
    pts = list(pts)
    cache: dict = {}

    def mid(i: int, j: int) -> int:
        key = (min(i, j), max(i, j))
        if key not in cache:
            (ax, ay), (bx, by) = pts[i], pts[j]
            pts.append(((ax + bx) / 2, (ay + by) / 2))
            cache[key] = len(pts) - 1
        return cache[key]

    def size(i: int, j: int) -> float:
        return math.dist(pts[i], pts[j])

    todo = [tri for f in faces for tri in ((f[0], f[k], f[k + 1]) for k in range(1, len(f) - 1))]
    out = []
    while todo:
        a, b, c = todo.pop()
        if max(size(a, b), size(b, c), size(c, a)) <= longest:
            out.append((a, b, c))
            continue
        ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
        todo += [(a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)]
    return pts, out


def on_side(
    mb: MeshBuilder, pts, faces, side: int, at: tuple[float, float], off: float, *, along: int | None = None, surface: str | None = "skin"
) -> None:
    """Paint a flat (a, b) figure onto the body's side: a along the body (feet; toward the tail on the port side and
    toward the nose on the starboard, so it reads from left to right on both), b up; `at` is (u, z) of its origin."""
    sense = side if along is None else along
    pts, faces = fine(pts, faces)
    verts, normals = [], []
    for a, b in pts:
        u, z = at[0] + sense * a, at[1] + b
        phi = phi_side(u, z, side)
        n = body_normal(u, phi)
        verts.append(onto(surface, body(u, phi), n, off) if surface else body(u, phi) + n * (off * FT))
        normals.append(n)
    oriented(mb, verts, faces, lambda i: normals[i])


def on_top(mb: MeshBuilder, pts, faces, off: float) -> None:
    """Paint a figure given as (u, y) onto the upper half of the body."""
    pts, faces = fine(pts, faces)
    verts, normals = [], []
    for u, y in pts:
        phi = phi_top(u, y)
        n = body_normal(u, phi)
        verts.append(onto("skin", body(u, phi), n, off))
        normals.append(n)
    oriented(mb, verts, faces, lambda i: normals[i])


def on_fin(mb: MeshBuilder, pts, faces, side: int, at: tuple[float, float], off: float) -> None:
    """The same onto the pylon's side; (a, b) are along the aircraft and up, `at` is (u, z)."""
    pts, faces = fine(pts, faces)
    verts, normals = [], []
    for a, b in pts:
        u, z = at[0] + side * a, at[1] + b
        th = th_side(z, u, side)
        p = fin_point(z, th)
        n = (fin_point(z, th, 1.0) - p).normalized()
        verts.append(onto("fin", p, n, off))
        normals.append(n)
    oriented(mb, verts, faces, lambda i: normals[i])


def pivot(name: str, parent, at: Vector, meshes) -> bpy.types.Object:
    """A node of its own at `at` holding meshes built in the parent's frame, each left where it was built."""
    node = group(name, parent)
    node.location = at
    for obj in meshes:
        if obj is not None:
            obj.data.transform(Matrix.Translation(-at))
            obj.parent = node
    return node


def tube(mb: MeshBuilder, a: Vector, b: Vector, r: float, segs: int = 12) -> None:
    mb.tube(a, b, r, segs)


def box_at(mb: MeshBuilder, centre: Vector, size: Sequence[float], x_axis: Vector | None = None) -> None:
    """A box `size` metres (along x_axis, across, up), its middle at `centre`."""
    if x_axis is None:
        mb.box(size, Matrix.Translation(centre))
        return
    x = x_axis.normalized()
    z = Vector((0, 0, 1)) if abs(x.z) < 0.9 else Vector((0, 1, 0))
    y = z.cross(x).normalized()
    z = x.cross(y)
    m = Matrix((x, y, z)).transposed().to_4x4()
    m.translation = centre
    mb.box(size, m)


# ------------------------------------------------------------------ the body


def _stations() -> list[float]:
    us = [0.03, 0.08, 0.15, 0.24, 0.36, 0.5, 0.7, 0.95, 1.25, 1.6, 2.0, 2.5, 3.0, 3.6, 4.2, 4.6, 5.0, 5.4, 5.8, 6.2, 6.6]
    us += [7.2, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0]
    us += [23.5, 25.0, 26.5, 28.0, 29.5, 31.0, 32.5, 34.0, 35.5, U_END]
    if srlib.DETAIL < 1.0:
        keep = round(len(us) * max(srlib.DETAIL, 0.7))
        step = (len(us) - 1) / (keep - 1)
        us = sorted({us[round(i * step)] for i in range(keep)})
    return us


def build_skin(mats: dict, parent) -> bpy.types.Object:
    segs = max(srlib._segs(64), 40)  # no coarser: the lettering lies on it
    us = _stations()
    phis = [TAU * i / segs for i in range(segs)]
    mb = MeshBuilder()
    mb.grid(lambda phi, u: body(u, phi), phis, us, closed_u=True)
    nose = [body(us[0], phi) for phi in phis]
    fan(mb, P(0.0, 0.0, TOP(0.0)), nose, Vector((1, 0, 0)))
    tail = [body(U_END, phi) for phi in phis]
    fan(mb, P(U_END, 0.0, MID(U_END)), tail, Vector((-1, 0, 0)))
    outward(mb, lambda c: P(min(max(D(c)[0], 0.3), U_END - 0.3), 0.0, MID(D(c)[0])))
    remember("skin", mb)
    skin = mb.build("Fuselage_Skin", mats["paint"], parent, sharp_angle=60.0)
    # The starboard door's opening: cut the skin on its four edges and take out what is inside.
    u0, u1, z0, z1 = DOOR
    bm = bmesh.new()
    bm.from_mesh(skin.data)
    for co, no in (
        (P(u0, 0, 0), Vector((1, 0, 0))),
        (P(u1, 0, 0), Vector((1, 0, 0))),
        (P(0, 0, z0), Vector((0, 0, 1))),
        (P(0, 0, z1), Vector((0, 0, 1))),
    ):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-7, plane_co=co, plane_no=no)
    inside = []
    for f in bm.faces:
        u, y, z = D(f.calc_center_median())
        if u0 < u < u1 and z0 < z < z1 and y < 0:
            inside.append(f)
    bmesh.ops.delete(bm, geom=inside, context="FACES")
    bm.to_mesh(skin.data)
    bm.free()
    skin.data.update()
    return skin


def build_cabin(mats: dict, parent) -> None:
    """The cabin's lining: floor, walls, ceiling and the bulkheads at either end, facing in, and the jambs of the
    door's opening from the skin to it. Seen only through the open door."""
    u0, u1, f0, f1, half = CABIN
    d0, d1, z0, z1 = DOOR
    mb = MeshBuilder()

    def quad(a: Vector, b: Vector, c: Vector, d: Vector, inward: Vector) -> None:
        oriented(mb, [a, b, c, d], [(0, 1, 2, 3)], lambda _i: inward)

    def wall(y: float, us_: tuple[float, float], zs: tuple[float, float]) -> None:
        a, b = us_
        lo, hi = zs
        quad(P(a, y, lo), P(b, y, lo), P(b, y, hi), P(a, y, hi), Vector((0, -math.copysign(1, y), 0)))

    quad(P(u0, -half, f0), P(u1, -half, f0), P(u1, half, f0), P(u0, half, f0), Vector((0, 0, 1)))  # floor
    quad(P(u0, -half, f1), P(u1, -half, f1), P(u1, half, f1), P(u0, half, f1), Vector((0, 0, -1)))  # ceiling
    quad(P(u0, -half, f0), P(u0, half, f0), P(u0, half, f1), P(u0, -half, f1), Vector((-1, 0, 0)))  # forward bulkhead
    quad(P(u1, -half, f0), P(u1, half, f0), P(u1, half, f1), P(u1, -half, f1), Vector((1, 0, 0)))  # aft bulkhead
    wall(half, (u0, u1), (f0, f1))  # port wall
    # the starboard wall round the door
    wall(-half, (u0, d0), (f0, f1))
    wall(-half, (d1, u1), (f0, f1))
    wall(-half, (d0, d1), (f0, z0))
    wall(-half, (d0, d1), (z1, f1))
    # the jambs: from the opening in the skin to the wall, each facing into the opening
    n = 8

    def skin_y(u: float, z: float) -> float:
        return section(u, phi_side(u, z, -1))[0]

    for z, inward in ((z0, Vector((0, 0, 1))), (z1, Vector((0, 0, -1)))):
        for i in range(n):
            a, b = d0 + (d1 - d0) * i / n, d0 + (d1 - d0) * (i + 1) / n
            quad(P(a, -half, z), P(b, -half, z), P(b, skin_y(b, z), z), P(a, skin_y(a, z), z), inward)
    for u, inward in ((d0, Vector((-1, 0, 0))), (d1, Vector((1, 0, 0)))):
        for i in range(n):
            a, b = z0 + (z1 - z0) * i / n, z0 + (z1 - z0) * (i + 1) / n
            quad(P(u, -half, a), P(u, -half, b), P(u, skin_y(u, b), b), P(u, skin_y(u, a), a), inward)
    mb.build("Fuselage_Cabin", mats["inside"], parent, sharp_angle=30.0)


def build_glazing(mats: dict, parent) -> None:
    """The cockpit's windscreen and side windows, the cabin's two windows on the port side, the nose's louvres and
    lamps. No cockpit is modelled behind them, so they are the dark `window-void`. Placed from the arrangement and the
    photographs: estimated."""
    mb = MeshBuilder()
    off = 0.02
    for side in (1, -1):
        # the pilots' sliding side windows, with the quarter pane ahead of them
        pts, faces = quad2([(0.0, 0.0), (3.75, 0.0), (3.75, 2.45), (1.1, 2.45)], 8)
        on_side(mb, pts, faces, side, (5.75, 8.8), off, along=1)
        # the louvred intakes on the nose's clamshell doors, below the windscreen
        pts, faces = quad2([(0.0, 0.0), (1.4, 0.0), (2.0, 1.5), (0.6, 1.5)], 6)
        on_side(mb, pts, faces, side, (2.2, 6.75), off, along=1)
        # the round lamp low on either cheek of the nose
        pts, faces = disc2(0.36, 24)
        on_side(mb, pts, faces, side, (0.95, 4.5), off, along=1)
    # the cabin's two square windows on the port side (the arrangement; S61-02826)
    for u in (13.1, 15.8):
        pts, faces = rect2(0.0, 0.0, 1.8, 1.8, 4)
        on_side(mb, pts, faces, 1, (u, 5.1), off, along=1)
    # the windscreen: two panes either side of a centre post, from the nose's top to the roof
    for y0, y1 in ((0.22, 2.25), (-2.25, -0.22)):
        pts, faces = quad2([(4.4, y0), (6.35, y0), (6.35, y1), (4.4, y1)], 8)
        on_top(mb, pts, faces, off)
    mb.build("Fuselage_Glazing", mats["void"], parent, sharp_angle=60.0)


def build_markings(mats: dict, parent, mk: Markings, font) -> None:
    """The Marine Corps' markings of 1961 as the photographs of 21 July show them on Hunt Club 1 (S61-02826, MSFC-6116424)
    and on the same squadron's aircraft at MR-3 (KSC-71P-260): the side number big on the nose and small on the tail cone,
    the national insignia on the cabin, MARINES along the tail cone, the squadron's code on the pylon. Sizes and places
    are read off those photographs: estimated."""
    white, blue, red = MeshBuilder(), MeshBuilder(), MeshBuilder()
    off = 0.02  # 6 mm, as the capsule's decals
    for side in (1, -1):
        # MARINES, 1.8 ft capitals, along the tail cone, 8.6 ft long
        pts, faces, length = flat_text(mk.service, font, 1.8, 8.6)
        u0 = 23.6 if side == 1 else 23.6 + length
        on_side(white, pts, faces, side, (u0, 4.3), off)
        # the side number, small, aft of MARINES
        pts, faces, length = flat_text(mk.side, font, 0.8)
        u0 = 32.9 if side == 1 else 32.9 + length
        on_side(white, pts, faces, side, (u0, 5.0), off)
        # the big side number: on the port side on the nose ahead of the cabin; on the starboard it is on the door
        if side == 1:
            pts, faces, length = flat_text(mk.side, font, 2.0)
            on_side(white, pts, faces, side, (9.45, 2.9), off)
        # the national insignia: R the disc's radius (1.27 ft: the whole is 5.4 ft across in S61-02826)
        r = 1.27
        cu, cz = 20.5, 6.0
        for sgn in (1, -1):
            pts, faces = rect2(sgn * 0.9 * r, -0.475 * r, sgn * 2.125 * r, 0.275 * r, 4)
            on_side(blue, pts, faces, side, (cu, cz), off - 0.007)
            pts, faces = rect2(sgn * 0.97 * r, -0.35 * r, sgn * 2.0 * r, 0.15 * r, 4)
            on_side(white, pts, faces, side, (cu, cz), off + 0.01)
            pts, faces = rect2(sgn * 0.97 * r, -0.183 * r, sgn * 2.0 * r, -0.017 * r, 4)
            on_side(red, pts, faces, side, (cu, cz), off + 0.02)
        pts, faces = disc2(r, 40)
        on_side(blue, pts, faces, side, (cu, cz), off)
        pts, faces = star(r * 0.98)
        on_side(white, pts, faces, side, (cu, cz), off + 0.01)
        # the squadron's code on the pylon, under the tail rotor's hub
        pts, faces, length = flat_text(mk.code, font, 1.35)
        u0 = 41.9 - length / 2 if side == 1 else 41.9 + length / 2
        on_fin(white, pts, faces, side, (u0, 8.9), off)
        if srlib.DETAIL >= 0.5:
            # the white DANGER plate low on the pylon, and the bureau number under MARINES
            pts, faces = rect2(0.0, 0.0, 1.7, 0.65, 4)
            on_fin(white, pts, faces, side, (39.9 if side == 1 else 41.6, 6.55), off)
            if mk.bureau:
                pts, faces, length = flat_text(mk.bureau, font, 0.36)
                u0 = 29.6 if side == 1 else 29.6 + length
                on_side(white, pts, faces, side, (u0, 3.05), off)
    if white.verts:
        white.build("Fuselage_Markings", mats["white"], parent, sharp_angle=60.0)
    blue.build("Fuselage_InsigniaBlue", mats["blue"], parent, sharp_angle=60.0)
    red.build("Fuselage_InsigniaRed", mats["red"], parent, sharp_angle=60.0)
    if srlib.DETAIL >= 0.5:
        ink = MeshBuilder()
        for side in (1, -1):
            pts, faces, length = flat_text("DANGER", font, 0.2)
            u0 = 40.2 if side == 1 else 41.3
            on_fin(ink, pts, faces, side, (u0, 6.95), off + 0.01)
        ink.build("Fuselage_Stencil", mats["red"], parent, sharp_angle=60.0)


def build_fittings(mats: dict, parent) -> None:
    """The ribbed louvres of the transmission's cooling outlet on the spine, the door's rails, the hoist's mount and
    the whip antenna: estimated from the photographs."""
    louvre = MeshBuilder()
    ribs = 13 if srlib.DETAIL >= 0.6 else 8
    for i in range(ribs):
        u = 15.4 + 5.0 * i / (ribs - 1)
        reach = 1.05 - 0.35 * i / (ribs - 1)  # the fan of ribs narrows aft
        path = [body(u, phi, 0.09) for phi in [reach * (k / 8 - 0.5) * 2 for k in range(9)]]
        louvre.loft(path, [(0.045 * FT, 0.07 * FT)] * len(path), 6, ref=(1, 0, 0), resample=3)
    louvre.build("Fuselage_Louvres", mats["louvre"], parent)
    fit = MeshBuilder()
    d0, d1, z0, z1 = DOOR
    for z in (z0 - 0.17, z1 + 0.2):  # the door's two rails, along which it slides aft over the skin
        us = [d0 - 0.2 + (DOOR_TRAVEL + d1 - d0 + 0.4) * k / 10 for k in range(11)]
        path = [body(u, phi_side(u, z, -1), 0.025) for u in us]
        fit.loft(path, [(0.045 * FT, 0.04 * FT)] * len(path), 8, ref=(0, 0, 1), resample=2)
    # the hoist's mount: a bracket from the skin out to the boom's pivot
    pu, py, pz = HOIST_PIVOT
    skin = body(pu, phi_side(pu, pz, -1), -0.05)
    pivot_at = P(pu, py, pz)
    box_at(fit, (skin + pivot_at) / 2 + Vector((0, 0, -0.32 * FT)), (0.35 * FT, (pivot_at - skin).length, 0.12 * FT))
    box_at(fit, (skin + pivot_at) / 2 + Vector((0, 0, 0.32 * FT)), (0.35 * FT, (pivot_at - skin).length, 0.12 * FT))
    # the whip antenna on the tail cone (S61-02826)
    tube(fit, P(33.4, 0, TOP(33.4) - 0.1), P(33.4, 0, 12.6), 0.02 * FT, 6)
    tube(fit, P(33.4, 0, TOP(33.4) - 0.1), P(33.4, 0, TOP(33.4) + 0.25), 0.08 * FT, 8)
    fit.build("Fuselage_Fittings", mats["metal"], parent)


def build_door(mats: dict, mk: Markings, font) -> bpy.types.Object:
    """The starboard sliding door, shut: a shell standing just off the skin and overlapping the opening, so it can slide
    aft along its rails over the skin. On it the side number, as KSC-71P-260 shows ET-44's, and a window."""
    d0, d1, z0, z1 = DOOR
    a0, a1, b0, b1 = d0 - 0.15, d1 + 0.15, z0 - 0.07, z1 + 0.1
    out_off, in_off = 0.15, 0.08
    nu, nz = 10, 10
    mb = MeshBuilder()
    grid_out, grid_in = [], []
    for j in range(nz + 1):
        z = b0 + (b1 - b0) * j / nz
        for i in range(nu + 1):
            u = a0 + (a1 - a0) * i / nu
            phi = phi_side(u, z, -1)
            grid_out.append(body(u, phi, out_off))
            grid_in.append(body(u, phi, in_off))
    faces = []
    for j in range(nz):
        for i in range(nu):
            a = j * (nu + 1) + i
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    oriented(mb, grid_out, faces, lambda _i: Vector((0, -1, 0)))
    oriented(mb, grid_in, faces, lambda _i: Vector((0, 1, 0)))
    # its four edges
    ring = [(j, i) for i in range(nu + 1) for j in (0,)] + [(j, nu) for j in range(1, nz + 1)]
    ring += [(nz, i) for i in range(nu - 1, -1, -1)] + [(j, 0) for j in range(nz - 1, 0, -1)]
    ring.append(ring[0])
    edges = MeshBuilder()
    for (ja, ia), (jb, ib) in zip(ring, ring[1:]):
        ka, kb = ja * (nu + 1) + ia, jb * (nu + 1) + ib
        edges.add([tuple(grid_out[ka]), tuple(grid_out[kb]), tuple(grid_in[kb]), tuple(grid_in[ka])], [(0, 1, 2, 3)])
    middle = P((a0 + a1) / 2, 0.0, (b0 + b1) / 2)
    outward(edges, lambda c: Vector((middle.x, c.y, middle.z)))
    mb.add(edges.verts, edges.faces)
    door = mb.build("CabinDoor_Panel", mats["paint"], None, sharp_angle=50.0)
    paint = MeshBuilder()
    pts, faces, length = flat_text(mk.side, font, 1.9)
    on_side(paint, pts, faces, -1, (d0 + 0.75 + length, 3.5), out_off + 0.02, surface=None)
    numbers = paint.build("CabinDoor_Number", mats["white"], None, sharp_angle=60.0)
    glass = MeshBuilder()
    pts, faces = rect2(0.0, 0.0, 1.6, 1.25, 4)
    on_side(glass, pts, faces, -1, (d1 - 0.45, 5.8), out_off + 0.02, surface=None)
    window = glass.build("CabinDoor_Window", mats["void"], None, sharp_angle=60.0)
    return pivot("CabinDoor", None, P(d0, -2.9, z0), [door, numbers, window])


# ------------------------------------------------------------------ the pylon


def build_pylon(mats: dict) -> bpy.types.Object:
    segs = srlib._segs(32)
    ths = [TAU * i / segs for i in range(segs)]
    zs = PY_Z
    mb = MeshBuilder()
    mb.grid(lambda th, z: fin_point(z, th), ths, zs, closed_u=True)
    outward(mb, lambda c: P((PY_LE(D(c)[2]) + PY_TE(D(c)[2])) / 2, 0.0, min(max(D(c)[2], zs[0] + 0.05), zs[-1] - 0.05)))
    top = [fin_point(zs[-1], th) for th in ths]
    um = (PY_LE(zs[-1]) + PY_TE(zs[-1])) / 2
    fan(mb, P(um, 0, zs[-1] + 0.12), top, Vector((0, 0, 1)))
    bottom = [fin_point(zs[0], th) for th in ths]
    fan(mb, P((PY_LE(zs[0]) + PY_TE(zs[0])) / 2, 0, zs[0]), bottom, Vector((0, 0, -1)))
    remember("fin", mb)
    skin = mb.build("TailPylon_Skin", mats["paint"], None, sharp_angle=55.0)
    # the tail rotor's gearbox fairing, bulging from the pylon's port side at the hub
    gear = MeshBuilder()
    m = Matrix.Translation(P(TR_X, 0.25, TR_Z)) @ Matrix.Diagonal((0.85 * FT, 0.62 * FT, 0.6 * FT, 1.0))
    gear.lathe(srlib.arc_profile(0, 0, 1.0, -90, 90, 10), 20, matrix=m)
    fair = gear.build("TailPylon_Gearbox", mats["paint"], None)
    # the horizontal stabiliser across the pylon, ahead of the tail rotor's disc
    stab = MeshBuilder()
    chord, thick = 1.9, 0.14
    span = (-3.05, 2.45)
    sec = [(0.0, 0.0), (0.1, 0.45), (0.35, 0.5), (0.7, 0.3), (1.0, 0.0), (0.7, -0.3), (0.35, -0.5), (0.1, -0.45)]
    u_le, z_s = 38.3, 7.7

    def sp(i: int, y: float) -> Vector:
        c, t = sec[i]
        return P(u_le + c * chord, y, z_s + t * thick)

    stab.grid(lambda i, y: sp(int(i), y), list(range(len(sec))), list(span), closed_u=True)
    for y, n in ((span[0], Vector((0, -1, 0))), (span[1], Vector((0, 1, 0)))):
        fan(stab, P(u_le + chord / 2, y, z_s), [sp(i, y) for i in range(len(sec))], n)
    outward(stab, lambda c: P(u_le + chord / 2, min(max(D(c)[1], span[0] + 0.1), span[1] - 0.1), z_s))
    tail = stab.build("TailPylon_Stabiliser", mats["paint"], None, sharp_angle=50.0)
    return pivot("TailPylon", None, P(U_END, 0, BOT(U_END)), [skin, fair, tail])


# ------------------------------------------------------------------ the rotors


def _blade(mb: MeshBuilder, origin: Vector, along: Vector, lead: Vector, stations, caps: tuple[bool, bool]) -> None:
    """A blade from `origin` (metres) out along `along`. `stations` are (r, chord, thickness), feet, r from the axis;
    the section is NACA 0012's form scaled to the thickness, the quarter chord on the blade's axis and the leading
    edge toward `lead`."""
    xs = [0.0, 0.025, 0.1, 0.25, 0.45, 0.7, 0.9, 1.0]
    half = [0.0, 0.0279, 0.0468, 0.0594, 0.0570, 0.0420, 0.0187, 0.0013]  # NACA 0012's half-thickness, of chord
    up = along.cross(lead).normalized()
    ring = list(zip(xs, half)) + [(x, -h) for x, h in zip(reversed(xs[1:-1]), reversed(half[1:-1]))]
    n = len(ring)
    rings, outs = [], []
    for r, chord, thick in stations:
        c = origin + along * (r * FT)
        rings.append([c + lead * ((0.25 - x) * chord * FT) + up * (h / 0.06 * thick / 2 * FT) for x, h in ring])
        outs.append([lead * (0.4 - x) * 0.3 + up * (0.0 if h == 0 else math.copysign(1.0, h)) for x, h in ring])
    verts = [v for rg in rings for v in rg]
    normals = [o for og in outs for o in og]
    faces = [(j * n + i, j * n + (i + 1) % n, (j + 1) * n + (i + 1) % n, (j + 1) * n + i) for j in range(len(rings) - 1) for i in range(n)]
    oriented(mb, verts, faces, lambda i: normals[i])
    if caps[0]:
        fan(mb, sum(rings[0], Vector()) / n, rings[0], -along)
    if caps[1]:
        fan(mb, sum(rings[-1], Vector()) / n, rings[-1], along)


def build_main_rotor(mats: dict) -> bpy.types.Object:
    """The head (hub, hinge arms and their dampers) and four blades, pointing forward, aft and to either side. Flat:
    no droop at rest, no coning, no pitch. The blades' tips are painted yellow (estimated)."""
    hub = P(X_ROTOR, 0, Z_BLADES)
    head, blades, tips = MeshBuilder(), MeshBuilder(), MeshBuilder()
    tube(head, P(X_ROTOR, 0, 11.6), P(X_ROTOR, 0, Z_BLADES - 0.3), 0.3 * FT, 20)  # the shaft out of the fuselage's top
    head.lathe(srlib.prof([(0.0, -0.36), (0.75, -0.36), (0.75, 0.3), (0.4, 0.4), (0.0, 0.4)], FT), 28, matrix=Matrix.Translation(hub))
    tip = ROTOR_D / 2
    t = BLADE_CHORD * BLADE_THICK
    for k in range(4):
        a = k * math.pi / 2
        along = Vector((math.cos(a), math.sin(a), 0.0))
        lead = Vector((-math.sin(a), math.cos(a), 0.0))  # counter-clockwise from above, so the leading edge is this way
        box_at(head, hub + along * (1.5 * FT), (1.8 * FT, 0.42 * FT, 0.36 * FT), along)  # the hinge arm
        tube(head, hub + along * (0.9 * FT) - lead * (0.36 * FT), hub + along * (2.1 * FT) - lead * (0.36 * FT), 0.09 * FT, 10)
        _blade(blades, hub, along, lead, [(BLADE_ROOT, 0.8, 0.30), (3.2, BLADE_CHORD, 0.18), (tip - 1.0, BLADE_CHORD, t)], (True, False))
        _blade(tips, hub, along, lead, [(tip - 1.0, BLADE_CHORD, t), (tip, BLADE_CHORD, t)], (False, True))
    meshes = [
        head.build("MainRotor_Head", mats["hub"], None),
        blades.build("MainRotor_Blades", mats["blade"], None, sharp_angle=50.0),
        tips.build("MainRotor_Tips", mats["yellow"], None, sharp_angle=50.0),
    ]
    return pivot("MainRotor", None, hub, meshes)


def build_tail_rotor(mats: dict) -> bpy.types.Object:
    """Its shaft out of the gearbox, the hub and four blades, square to the aircraft. Its sense of rotation was not
    read. The blades' tips are painted white (estimated: a light ring at the tips in every photograph)."""
    hub = P(TR_X, TR_Y, TR_Z)
    head, blades, tips = MeshBuilder(), MeshBuilder(), MeshBuilder()
    tube(head, P(TR_X, 0.55, TR_Z), P(TR_X, TR_Y + 0.15, TR_Z), 0.16 * FT, 14)
    head.lathe(srlib.prof([(0.0, -0.18), (0.36, -0.18), (0.36, 0.14), (0.2, 0.26), (0.0, 0.26)], FT), 18, matrix=frame(hub, (0, 1, 0)))
    r1 = TAIL_ROTOR_D / 2
    for k in range(4):
        a = k * math.pi / 2
        along = Vector((math.cos(a), 0.0, math.sin(a)))
        lead = Vector((-math.sin(a), 0.0, math.cos(a)))
        box_at(head, hub + along * (0.5 * FT), (0.7 * FT, 0.22 * FT, 0.22 * FT), along)
        _blade(blades, hub, along, lead, [(0.3, 0.3, 0.12), (0.9, TR_CHORD, 0.075), (r1 - 0.6, TR_CHORD, 0.066)], (True, False))
        _blade(tips, hub, along, lead, [(r1 - 0.6, TR_CHORD, 0.066), (r1, TR_CHORD, 0.066)], (False, True))
    meshes = [
        head.build("TailRotor_Hub", mats["hub"], None),
        blades.build("TailRotor_Blades", mats["blade"], None, sharp_angle=50.0),
        tips.build("TailRotor_Tips", mats["white"], None, sharp_angle=50.0),
    ]
    return pivot("TailRotor", None, hub, meshes)


# ------------------------------------------------------------------ the gear


def _tyre(mb_tyre: MeshBuilder, mb_hub: MeshBuilder, centre: Vector, size: tuple[float, float], r_out: float) -> None:
    """A tyre and its wheel, axle across the aircraft. `size` and `r_out` in inches."""
    width, rim = size
    w2, r_in = width / 2, rim / 2 + 0.2
    prof = [(r_in, -w2 * 0.84), (r_in + 0.3 * (r_out - r_in), -w2), (r_in + 0.75 * (r_out - r_in), -w2 * 0.94), (r_out - 0.9, -w2 * 0.6)]
    prof += [(r_out, 0.0), (r_out - 0.9, w2 * 0.6), (r_in + 0.75 * (r_out - r_in), w2 * 0.94), (r_in + 0.3 * (r_out - r_in), w2), (r_in, w2 * 0.84)]
    m = frame(centre, (0, 1, 0))
    mb_tyre.lathe(srlib.prof(prof, IN), 36, matrix=m)
    mb_hub.lathe(srlib.prof([(0.0, -w2 * 0.62), (r_in + 0.1, -w2 * 0.62), (r_in + 0.1, w2 * 0.62), (0.0, w2 * 0.62)], IN), 24, matrix=m)


def build_main_gear(mats: dict) -> bpy.types.Object:
    tyres, hubs, struts = MeshBuilder(), MeshBuilder(), MeshBuilder()
    r = MAIN_R / 12
    for side in (1, -1):
        axle = P(X_MAIN, side * TRACK / 2, r)
        _tyre(tyres, hubs, axle, MAIN_TYRE, MAIN_R)
        inboard = P(X_MAIN, side * (TRACK / 2 - 0.62), r)
        tube(struts, P(X_MAIN, side * (TRACK / 2 - 0.2), r), inboard, 0.16 * FT, 12)
        # the oleo, up to the fuselage's side at the cockpit floor (the arrangement's front view)
        top = P(8.0, side * 2.78, 7.4)
        mid = inboard.lerp(top, 0.42)
        tube(struts, inboard, mid, 0.17 * FT, 14)
        tube(struts, mid - (top - inboard).normalized() * (0.15 * FT), top, 0.24 * FT, 14)
        # the two radius rods to the belly
        for u in (6.4, 9.6):
            tube(struts, inboard, P(u, side * 1.45, 2.05), 0.11 * FT, 10)
    meshes = [
        tyres.build("MainGear_Tyres", mats["rubber"], None),
        hubs.build("MainGear_Wheels", mats["hub"], None),
        struts.build("MainGear_Struts", mats["metal"], None),
    ]
    node = group("MainGear")
    for obj in meshes:
        obj.parent = node
    return node


def build_tail_wheel(mats: dict) -> bpy.types.Object:
    tyres, hubs, struts = MeshBuilder(), MeshBuilder(), MeshBuilder()
    r = TAIL_R / 12
    axle = P(X_TAIL, 0, r)
    _tyre(tyres, hubs, axle, TAIL_TYRE, TAIL_R)
    tube(struts, P(X_TAIL, -0.36, r), P(X_TAIL, 0.36, r), 0.06 * FT, 10)
    for y in (-0.33, 0.33):
        a, b = P(X_TAIL, y, r), P(X_TAIL - 0.35, y, 1.55)
        box_at(struts, (a + b) / 2, ((b - a).length + 0.1 * FT, 0.07 * FT, 0.22 * FT), b - a)
    box_at(struts, P(X_TAIL - 0.35, 0, 1.6), (0.3 * FT, 0.8 * FT, 0.16 * FT))
    tube(struts, P(X_TAIL - 0.35, 0, 1.6), P(X_TAIL - 0.75, 0, 2.75), 0.14 * FT, 12)
    meshes = [
        tyres.build("TailWheel_Tyre", mats["rubber"], None),
        hubs.build("TailWheel_Wheel", mats["hub"], None),
        struts.build("TailWheel_Fork", mats["metal"], None),
    ]
    node = group("TailWheel")
    for obj in meshes:
        obj.parent = node
    return node


# ------------------------------------------------------------------ the recovery gear


def build_hoist(mats: dict) -> bpy.types.Object:
    """The rescue hoist: a boom on a pivot above the door's forward edge, the hoist's drum at its end, the cable's
    sheave under the drum and the hook. Stowed: lying aft along the side. Its form is estimated."""
    pu, py, pz = HOIST_PIVOT
    at = P(pu, py, pz)
    aft = Vector((-1, 0, 0))
    boom, drum, hook = MeshBuilder(), MeshBuilder(), MeshBuilder()
    tube(boom, at + Vector((0, 0, -0.42 * FT)), at + Vector((0, 0, 0.42 * FT)), 0.12 * FT, 12)  # the knuckle
    tube(boom, at, at + aft * (HOIST_BOOM * FT), 0.1 * FT, 12)
    end = at + aft * ((HOIST_BOOM + 0.35) * FT)
    drum.lathe(srlib.prof([(0.0, -0.45), (0.3, -0.45), (0.3, 0.45), (0.0, 0.45)], FT), 18, matrix=frame(end, (-1, 0, 0)))
    sheave = end + Vector((0, 0, -0.42 * FT))
    box_at(boom, end + Vector((0, 0, -0.32 * FT)), (0.3 * FT, 0.16 * FT, 0.22 * FT))
    tube(hook, sheave, sheave + Vector((0, 0, -0.45 * FT)), 0.012 * FT, 6)
    hook.lathe(
        srlib.prof([(0.0, 0.0), (0.06, 0.0), (0.06, 0.22), (0.0, 0.22)], FT), 8, matrix=Matrix.Translation(sheave + Vector((0, 0, -0.66 * FT)))
    )
    meshes = [
        boom.build("Hoist_Boom", mats["metal"], None),
        drum.build("Hoist_Drum", mats["hub"], None),
        hook.build("Hoist_Hook", mats["metal"], None),
    ]
    node = pivot("Hoist", None, at, meshes)
    mark = group("Hoist_Sheave", node)
    mark.location = sheave - at
    return node


def build_cargo_hook(mats: dict) -> bpy.types.Object:
    """The cargo hook under the belly at the rotor's axis: the frame it hangs in and the hook. Form estimated."""
    throat = P(X_ROTOR, 0, 0.97)
    mb = MeshBuilder()
    box_at(mb, P(X_ROTOR, 0, 1.62), (0.5 * FT, 0.32 * FT, 0.42 * FT))
    box_at(mb, P(X_ROTOR, 0, 1.3), (0.14 * FT, 0.12 * FT, 0.36 * FT))
    m = frame(throat + Vector((0, 0, 0.08 * FT)), (0, 1, 0))
    mb.lathe(srlib.prof([(0.08, -0.04), (0.14, -0.04), (0.14, 0.04), (0.08, 0.04)], FT), 14, matrix=m)
    obj = mb.build("CargoHook_Hook", mats["metal"], None)
    return pivot("CargoHook", None, throat, [obj])


def build_pole(mats: dict) -> bpy.types.Object:
    """The shepherd's hook: an aluminium pole with a crook at its end. Documented that it was used (This New Ocean,
    p. 373); its length and crook are estimated. It lies on the cabin floor, crook forward."""
    grip = P(16.3, 1.35, CABIN[2] + 0.07)
    end = P(7.3, 1.75, CABIN[2] + 0.07)
    mb = MeshBuilder()
    tube(mb, grip, end, 0.055 * FT, 10)
    d = (end - grip).normalized()
    side = d.cross(Vector((0, 0, 1))).normalized()
    r = 0.42 * FT
    centre = end + side * r
    path = [centre - side * r * math.cos(a) + d * r * math.sin(a) for a in [math.pi * k / 10 for k in range(11)]]
    mb.loft(path, [(0.05 * FT, 0.05 * FT)] * len(path), 8, ref=(0, 0, 1), resample=2)
    obj = mb.build("RecoveryPole_Pole", mats["alu"], None)
    node = pivot("RecoveryPole", None, grip, [obj])
    mark = group("RecoveryPole_Crook", node)
    mark.location = centre - grip
    return node


# ------------------------------------------------------------------ the whole


def build(mk: Markings, font=None) -> str:
    """Build the HUS-1 in `mk`'s markings; return a line saying how big it came out."""
    mats = _reuse(materials())
    fuselage = group("Fuselage")
    SURFACES.clear()
    build_skin(mats, fuselage)
    build_pylon(mats)
    build_cabin(mats, fuselage)
    build_glazing(mats, fuselage)
    build_markings(mats, fuselage, mk, font)
    build_fittings(mats, fuselage)
    build_main_rotor(mats)
    build_tail_rotor(mats)
    build_main_gear(mats)
    build_tail_wheel(mats)
    build_door(mats, mk, font)
    build_hoist(mats)
    build_cargo_hook(mats)
    build_pole(mats)
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9))
    hi = -lo
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        for v in obj.data.vertices:
            w = obj.matrix_world @ v.co
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    size = hi - lo
    return (
        f"overall {size.x:.3f} m nose-blade tip to tail rotor tip ({size.x / FT:.1f} ft), {size.y:.3f} m across the rotor "
        f"({size.y / FT:.1f} ft), {size.z:.3f} m high to the tail rotor's top tip ({size.z / FT:.2f} ft); "
        f"head top {HEAD_TOP * FT:.3f} m"
    )
