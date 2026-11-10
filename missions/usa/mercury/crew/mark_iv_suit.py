"""The Mercury pressure suit: B.F. Goodrich's Navy Mark IV, as Alan Shepard wore it to the pad for
Mercury-Redstone 3, with the portable ventilator that kept him cool on the way.

Dimensions are centimetres. The origin is the floor between the feet, +Z up, and the figure
faces -Y, so his left is +X. See ./mark-iv-suit.md: the pilot's stature is the only published
length here. The body under the suit follows standard segment proportions for that stature;
everything about the suit itself (bulk, helmet, fittings, where the zipper runs) is read off
photographs and is an estimate.

MR-3 configuration: gloves zipped to the sleeves, no wrist rings. MR-4 added the rings.

Top-level nodes: Helmet  Torso  Arms  Gloves  Legs  Boots  Ventilator
"""

from __future__ import annotations

import bisect
import math
from typing import Callable, Sequence

import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import CM, TAU, MeshBuilder, frame, group, material

STATURE = 180.3           # documented: 5 ft 11 in
HEEL = 2.8                # boot heel under the foot
HELMET_OVER_CROWN = 6.0   # liner, shell and clearance above the top of the head


def landmark(fraction: float) -> float:
    """Height of a body landmark above the floor, boots on (Drillis & Contini proportions)."""
    return fraction * STATURE + HEEL


Z_KNEE = landmark(0.285)
Z_CROTCH = landmark(0.47)
Z_HIP = landmark(0.530)
Z_SHOULDER = landmark(0.818)
Z_CROWN = landmark(1.0)

STANCE = 13.5             # ankle centre off the midline: feet shoulder-width apart
BOOT_TOP = 27.0
BOOT_LENGTH = 31.2        # sole, toe to heel
NECK_RING_R = 12.5
HELMET_RX = 13.0          # shell half-width
HELMET_MID = 175.0        # height of the shell's widest section
HELMET_TOP = Z_CROWN + HELMET_OVER_CROWN
HELMET_RIM = 159.4        # the shell's lower edge, inside the neck ring
VENT_SIZE = (16.0, 42.0, 30.0)     # ventilator case: width, length, height
VENT_AT = (47.0, -5.0)             # its centre on the floor, at his left

FRONT, UP = Vector((0, -1, 0)), Vector((0, 0, 1))


def materials() -> dict:
    m = material
    return {
        "suit": m("suit-aluminized-nylon", (0.66, 0.67, 0.69), 0.75, 0.42),
        "webbing": m("webbing-nylon", (0.40, 0.41, 0.40), 0.2, 0.75),
        "tape": m("zipper-tape", (0.10, 0.10, 0.11), 0.0, 0.8),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "aluminium": m("aluminium", (0.78, 0.78, 0.77), 1.0, 0.32),
        "shell": m("helmet-fibreglass-white", (0.86, 0.86, 0.83), 0.0, 0.28),
        # not named glass: the viewer makes glass transparent, and there is no face behind this visor
        "glass": m("visor-tinted", (0.02, 0.03, 0.04), 0.0, 0.04),
        "rubber": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "boot": m("boot-leather-aluminized", (0.55, 0.56, 0.57), 0.6, 0.5),
        "lace": m("lace-cord", (0.70, 0.69, 0.64), 0.0, 0.85),
        "gauge": m("gauge-face", (0.02, 0.02, 0.02), 0.0, 0.25),
        "white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6),
        "hose": m("hose-rubber", (0.05, 0.05, 0.055), 0.0, 0.6),
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


def creases(d: float, th: float, pitch: float, seed: float) -> float:
    """Fabric folds running round a limb, -1..1: two pitches, each leaning and fading round the
    limb at its own rate, so no fold closes into a ring."""
    a = math.sin(TAU * d / pitch + 2.2 * math.sin(th + seed)) * (0.55 + 0.45 * math.sin(2 * th + 1.7 * seed))
    b = math.sin(TAU * d / (pitch * 0.61) + 3.1 * math.sin(2 * th + 2.3 * seed)) * (0.5 + 0.5 * math.sin(3 * th + seed))
    return (a + 0.5 * b) / 1.5


def emit(mb: MeshBuilder, name: str, mat, parent, **kw) -> bpy.types.Object:
    """Centimetres become metres here, once."""
    mb.verts = [(x * CM, y * CM, z * CM) for x, y, z in mb.verts]
    mb.uvs = [(u * CM, v * CM) for u, v in mb.uvs]
    return mb.build(name, mat, parent, **kw)


class Tube:
    """A MeshBuilder.loft that can also be asked where its skin is, so straps, zippers and
    fittings can be laid on it. It repeats loft's sampling exactly; keep the two in step.

    fold(d, theta) is loft's ripple with d in centimetres along the path instead of 0..1."""

    def __init__(self, path: Sequence[Sequence[float]], radii: Sequence[tuple[float, float]], *,
                 ref: Sequence[float] = (0, 1, 0), resample: int = 5,
                 fold: Callable[[float, float], float] | None = None) -> None:
        self.path = [Vector(p) for p in path]
        self.radii = list(radii)
        self.ref, self.resample, self.fold = Vector(ref), resample, fold
        pts, n = self.path, len(self.path)

        def cr(seq, i, t):
            p0, p1, p2, p3 = (seq[max(0, min(n - 1, k))] for k in (i - 1, i, i + 1, i + 2))
            return 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                          + (3 * p1 - p0 - 3 * p2 + p3) * t**3)

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
        mb.loft(self.path, self.radii, segs, ref=tuple(self.ref), resample=self.resample,
                ripple=ripple, caps=caps)

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
        return (self.centres[i].lerp(self.centres[i + 1], f)
                + side * (rad.x * k * math.cos(theta)) + other * (rad.y * k * math.sin(theta)))

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

    def patch(self, mb: MeshBuilder, d0: float, d1: float, th0: float, th1: float, height: float, *,
              nd: int = 8, nt: int = 6, sink: float = 0.3) -> None:
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


def skin(mb: MeshBuilder, rows: Sequence[Sequence[Vector]], inside: Sequence[float] | None, *,
         closed: bool = False, flip: bool = False) -> None:
    """A quad grid through explicit rows of points. With `inside` given, the faces are wound to
    look away from that point; otherwise the normal is (along a row) x (row to row), or its
    reverse with `flip`."""
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
    if flip:
        faces = [f[::-1] for f in faces]
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


def band(mb: MeshBuilder, trace: Sequence[tuple[Vector, Vector]], width: float, height: float, *,
         lift: float = 0.0, sink: float = 0.3, bevel: float = 0.12, closed: bool = False) -> None:
    """A flat tape along a traced line, its top `height` proud of the skin and its edges sunk
    through it. Keep it narrow against the skin's radius: the tape does not bend across itself."""
    h = width / 2
    rows = []
    for p, nm, ac in rails(trace, closed):
        p = p + nm * lift
        rows.append([p - ac * h - nm * (sink + lift), p - ac * (h - bevel) + nm * height,
                     p + ac * (h - bevel) + nm * height, p + ac * h - nm * (sink + lift)])
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


def lacing(tube: Tube, d0: float, d1: float, theta: float, width: float, strip: MeshBuilder,
           cord: MeshBuilder, eyelet: MeshBuilder, pitch: float = 1.5) -> None:
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
        cord.tube(a1[0] + a1[1] * 0.42, b0[0] + b0[1] * 0.42, 0.11, 5)   # the upper cord of each cross
    for pair in pairs:
        for p, nm in pair:
            eyelet.disc(p - nm * 0.3, nm, 0.3, 0.65, 8)


def buckle(steel: MeshBuilder, web: MeshBuilder, p: Vector, nm: Vector, size: tuple[float, float],
           spin: float = 0.0) -> None:
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
    skin(shell, rows, centre, closed=True)

    # earphone bulges, one each side
    for sx in (1, -1):
        phi = sx * math.radians(100)
        shell.lathe([(3.8, 0.0), (3.7, 0.9), (3.2, 1.5), (2.0, 1.9), (0.0, 2.0)], 24,
                    matrix=frame(helmet_at(phi, 171.5, -0.5), helmet_normal(phi, 171.5)))

    # visor: a rounded opening from brow to chin, the Plexiglas riding outside the shell
    half_phi, zv, hv = math.radians(56), 173.0, 8.8

    def edge(psi: float, rho: float = 1.0) -> tuple[float, float]:
        f = rho * (1 + squareness(psi, 3.2))
        return half_phi * f * math.cos(psi), zv + hv * f * math.sin(psi)

    psis = [TAU * i / 56 - TAU / 4 for i in range(56)]
    rows = [[helmet_at(*edge(psi, rho), 0.3 + 0.5 * (1 - rho * rho)) for psi in psis]
            for rho in (0.0, 0.2, 0.4, 0.6, 0.8, 0.93, 1.0)]
    rows.append([helmet_at(*edge(psi), -0.4) for psi in psis])
    skin(visor, rows, centre, closed=True)
    rim = [helmet_at(*edge(psi), 0.2) for psi in psis]
    frame_mb = MeshBuilder()
    Tube([*rim, rim[0]], [(0.6, 0.6)] * (len(rim) + 1), resample=2).add(frame_mb, 10)
    for sx in (1, -1):   # the visor's pivots at the temples
        phi = sx * math.radians(67)
        fit.disc(helmet_at(phi, zv, -0.2), helmet_normal(phi, zv), 1.3, 0.9, 20)

    # neck ring: the helmet locks to it; the suit's neck is bonded underneath
    ringm.lathe([(9.8, 156.6), (12.2, 156.6), (NECK_RING_R, 157.0), (NECK_RING_R, 158.1), (12.1, 158.3),
                 (12.1, 158.7), (NECK_RING_R, 158.9), (NECK_RING_R, 159.9), (12.1, 160.3), (10.8, 160.3)],
                64, matrix=Matrix.Translation((0, -0.6, 0)))

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
    emit(visor, "Helmet_Visor", M["glass"], g)
    emit(frame_mb, "Helmet_VisorFrame", M["aluminium"], g)
    emit(ringm, "Helmet_NeckRing", M["aluminium"], g, sharp_angle=30)
    emit(fit, "Helmet_Fittings", M["aluminium"], g, sharp_angle=30)
    emit(port, "Helmet_OutletBore", M["rubber"], g)


# --------------------------------------------------------------------------- torso

TORSO_Z0 = 82.0
# (z, half-width, half-depth), crotch to the neck inside the ring
TORSO = [
    (82.0, 11.5, 8.5), (84.5, 15.0, 10.6), (89.0, 17.6, 12.1), (95.0, 18.4, 12.6), (103.0, 17.4, 12.0),
    (111.0, 16.2, 11.5), (120.0, 17.0, 12.1), (130.0, 18.7, 13.1), (140.0, 19.6, 13.2), (146.0, 19.6, 12.6),
    (150.0, 18.0, 11.6), (153.0, 14.5, 10.6), (155.3, 11.4, 9.9), (157.0, 10.4, 9.6), (159.0, 10.2, 9.4),
]


def torso_fold(d: float, th: float) -> float:
    z = TORSO_Z0 + d
    front, back = max(0.0, -math.sin(th)), max(0.0, math.sin(th))
    f = squareness(th, 2.5) * (1 - smooth(z, 148.0, 156.0))
    f += 0.05 * back * back * gauss(z, 94, 7)       # seat
    f += 0.05 * front * gauss(z, 133, 9)            # chest
    f -= 0.04 * back * gauss(z, 112, 8)             # small of the back
    f += 0.04 * back * gauss(z, 138, 9)             # shoulder blades
    f += 0.011 * creases(z, th, 3.4, 0.5) * gauss(z, 110, 7)   # gathers at the waist
    f += 0.008 * creases(z, th, 3.8, 1.9) * gauss(z, 89, 5)
    return f


def build_torso(M: dict) -> tuple[Vector, Vector]:
    """Returns the waist inlet's mouth and axis, for the ventilator hose."""
    g = group("Torso")
    shell, tape, teeth, web, steel, inlet = (MeshBuilder() for _ in range(6))
    t = Tube([(0, 0, z) for z, _, _ in TORSO], [(a, b) for _, a, b in TORSO], resample=10, fold=torso_fold)
    t.add(shell, 56)

    def az(deg: float) -> float:   # azimuth from straight ahead toward his left -> theta
        return -TAU / 4 + math.radians(deg)

    def d(z: float) -> float:
        return z - TORSO_Z0

    # entry zipper, left collar to right waist
    zip_line = t.trace(d(150.0), d(107.5), az(30), az(-56), 150)
    band(tape, zip_line, 2.4, 0.35, sink=0.4)
    band(teeth, zip_line[2:-2], 0.5, 0.2, lift=0.35, sink=0.2, bevel=0.1)
    p, nm = zip_line[5]
    teeth.box((0.9, 1.8, 0.8), frame(p + nm * 0.5, nm) @ Matrix.Rotation(math.radians(35), 4, "Z"))

    # helmet tie-down: stops the helmet rising when the suit is pressurised
    band(web, t.trace(d(156.0), d(139.5), az(0), az(0), 24), 2.2, 0.25)
    p, nm = t.at(d(146.5), az(0)), t.normal(d(146.5), az(0))
    buckle(steel, web, p, nm, (2.4, 3.6), spin=TAU / 4)

    # waist strap, and two straps from it down through the crotch
    band(web, ring(t, d(103.0), 72), 2.6, 0.4, closed=True)
    p, nm = t.at(d(103.0), az(-14)), t.normal(d(103.0), az(-14))
    buckle(steel, web, p + nm * 0.3, nm, (3.4, 3.8))
    for sx in (1, -1):
        band(web, t.trace(d(101.5), d(84.6), az(sx * 25), az(sx * 9), 30), 2.2, 0.25)
        p, nm = t.at(d(95.0), az(sx * 18.9)), t.normal(d(95.0), az(sx * 18.9))
        buckle(steel, web, p, nm, (2.2, 3.4), spin=TAU / 4)

    # ventilation inlet at the left waist
    th = az(38)
    p, nm = t.at(d(111.0), th), t.normal(d(111.0), th)
    axis = (nm + Vector((0.25, -0.1, -0.45))).normalized()
    m = frame(p - axis * 0.9, axis)
    inlet.lathe([(3.0, 0.0), (3.0, 1.2), (2.2, 1.4), (2.2, 3.4), (2.5, 3.4), (2.5, 4.3), (1.45, 4.3)], 28, matrix=m)

    emit(shell, "Torso_Shell", M["suit"], g)
    emit(tape, "Torso_ZipperTape", M["tape"], g, smooth=False)
    emit(teeth, "Torso_ZipperTeeth", M["steel"], g, smooth=False)
    emit(web, "Torso_Straps", M["webbing"], g, smooth=False)
    emit(steel, "Torso_Buckles", M["steel"], g, smooth=False)
    emit(inlet, "Torso_InletFitting", M["aluminium"], g, sharp_angle=30)
    return p + axis * 2.6, axis


# ---------------------------------------------------------------------------- arms

# (x, y, z, radius across, radius fore-and-aft) for his left arm; the first point is inside the torso
ARM = [
    (11.5, 0.0, 146.0, 4.0, 4.2), (19.3, 0.0, Z_SHOULDER - 4.7, 6.4, 6.7), (22.8, 0.0, 139.5, 6.6, 6.9),
    (24.9, 0.3, 130.5, 6.3, 6.5), (27.4, 0.8, 117.5, 5.6, 5.7), (28.6, -0.9, 108.5, 5.4, 5.4),
    (29.6, -2.9, 100.5, 4.7, 4.7), (30.1, -3.9, 96.5, 4.3, 4.3),
]
CUFF_TO_WRIST = 5.5   # the sleeve ends inside the glove's cuff, this far above the wrist


def arm_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in ARM], [(a, b) for *_, a, b in ARM], resample=14)
    d_sh, d_el = t.key_d(2), t.key_d(4)
    th_in = t.toward((-0.3 * sx, -1, 0), d_el)   # the crook of the elbow faces forward

    def fold(d: float, th: float) -> float:
        inner = 0.5 + 0.5 * math.cos(th - th_in)
        f = 0.05 * gauss(d, d_el, 5.5) * (0.35 + 0.65 * inner) * creases(d, th, 3.0, 0.7 * sx)
        f += 0.022 * gauss(d, d_sh, 5) * creases(d, th, 3.3, 2.1 * sx)
        f += 0.008 * math.sin(TAU * d / 6.1 + 2 * th) * smooth(d, 12, 18) * (1 - smooth(d, t.length - 14, t.length - 8))
        return f

    t.fold = fold
    return t


def build_arms(M: dict) -> dict[int, Tube]:
    g = group("Arms")
    sleeves, strips, cords, eyelets, alu, face, needle = (MeshBuilder() for _ in range(7))
    tubes = {}
    for sx in (1, -1):
        t = tubes[sx] = arm_tube(sx)
        t.add(sleeves, 32)
        d_el = t.key_d(4)
        out = t.toward((sx, 0.25, 0), d_el)
        lacing(t, t.key_d(2) + 4.0, d_el - 5.0, out, 2.4, strips, cords, eyelets)
        lacing(t, d_el + 4.5, t.length - 9.5, out, 2.2, strips, cords, eyelets)
    # suit pressure gauge on a strap round the left forearm
    t = tubes[1]
    dg = t.length - 6.0   # the glove's cuff covers the last 2.5 cm of sleeve
    band(strips, ring(t, dg, 32), 1.8, 0.3, closed=True)
    th = t.toward((0.55, -1, 0.2), dg)
    m = frame(t.at(dg, th, -0.2), t.normal(dg, th))
    alu.lathe([(2.4, 0.0), (2.4, 1.3), (2.15, 1.55), (1.9, 1.55), (1.9, 1.2)], 28, matrix=m)
    face.lathe([(1.95, 1.3), (0.0, 1.3)], 28, matrix=m)
    needle.box((0.14, 1.5, 0.26), m @ Matrix.Rotation(0.7, 4, "Z") @ Matrix.Translation((0, 0.45, 1.36)))

    emit(sleeves, "Arms_Sleeves", M["suit"], g)
    emit(strips, "Arms_LacingStrips", M["webbing"], g)
    emit(cords, "Arms_LacingCords", M["lace"], g)
    emit(eyelets, "Arms_Eyelets", M["steel"], g)
    emit(alu, "Arms_PressureGauge", M["aluminium"], g, sharp_angle=30)
    emit(face, "Arms_PressureGaugeFace", M["gauge"], g)
    emit(needle, "Arms_PressureGaugeNeedle", M["white"], g, smooth=False)
    return tubes


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


# knuckle position across the hand and down it, bone lengths, and flexion at each joint (degrees).
# The middle finger is cut straight for pushing buttons; the other three are curved to grip.
FINGERS = [
    (-3.75, 9.3, (4.6, 2.7, 2.3), (22, 32, 18), 1.12),
    (-1.25, 9.6, (5.0, 3.0, 2.4), (5, 5, 4), 1.14),
    (1.25, 9.2, (4.7, 2.8, 2.4), (24, 32, 18), 1.12),
    (3.75, 8.4, (3.7, 2.1, 2.1), (28, 34, 20), 1.0),
]


def finger(mb: MeshBuilder, hand: Hand, v: float, w0: float, lengths, bends, r: float) -> None:
    p = hand.p(-0.05, v, w0)
    pts, radii = [hand.p(-0.05, v, w0 - 2.2), p], [(r * 0.9, r * 0.95), (r, r)]
    angle = 0.0
    for length, bend, taper in zip(lengths, bends, (0.98, 0.9, 0.82)):
        angle += math.radians(bend)
        step = hand.curl(angle) * length
        pts += [p + step * 0.5, p + step]
        radii += [(r * taper, r * taper)] * 2
        p = p + step
    pts[-1] = p - hand.curl(angle) * 0.5   # a rounded fingertip rather than a cut end
    pts.append(p)
    radii.append((r * 0.45, r * 0.45))
    Tube(pts, radii, ref=hand.W, resample=3).add(mb, 10)


def build_gloves(M: dict, arms: dict[int, Tube]) -> None:
    g = group("Gloves")
    shell, tape, teeth, web, steel = (MeshBuilder() for _ in range(5))
    for sx in (1, -1):
        cuff = arms[sx].path[-1]
        along = cuff - arms[sx].path[-2]
        hand = Hand(sx, cuff + along.normalized() * CUFF_TO_WRIST, along)
        # cuff, wrist, palm: (distance below the wrist, half-thickness, half-width)
        keys = [(-8.0, 5.1, 5.1), (-6.0, 5.1, 5.1), (-2.5, 3.9, 4.4), (0.0, 2.9, 3.9), (3.0, 2.5, 4.6),
                (6.5, 2.3, 5.2), (8.4, 1.9, 5.3), (9.3, 1.4, 5.25)]
        palm = Tube([hand.p(0, 0, w) for w, _, _ in keys], [(a, b) for _, a, b in keys], ref=hand.W, resample=6)
        th_back = palm.toward(hand.B, 12.0)
        # round at the cuff, squared off across the palm so the knuckles stay inside it; ribbed
        # fabric across the back of the hand
        palm.fold = lambda d, th, tb=th_back: (
            squareness(th, 4.5) * smooth(d, 6, 10)
            + 0.018 * max(0.0, math.cos(th - tb)) * math.sin(TAU * d / 1.3) * smooth(d, 9.5, 11) * (1 - smooth(d, 15.5, 17)))
        palm.add(shell, 28)
        for v, w0, lengths, bends, r in FINGERS:
            finger(shell, hand, v, w0, lengths, bends, r)
        # thumb, from the heel of the hand forward and across the palm
        p = hand.p(-0.6, -3.4, 1.0)
        pts, radii = [p], [(1.6, 1.8)]
        for (kd, kw, kb), length, r in (((0.75, 0.60, 0.30), 4.6, 1.35), ((0.93, 0.25, 0.25), 3.3, 1.15),
                                        ((0.97, 0.10, 0.20), 2.2, 0.98), ((0.97, 0.10, 0.20), 0.5, 0.45)):
            p = p + (hand.D * kd - hand.W * kw - hand.B * kb).normalized() * length
            pts.append(p)
            radii.append((r, r * 1.05))
        Tube(pts, radii, ref=hand.W, resample=4).add(shell, 12)
        # MR-3: the glove zips to the sleeve all the way round. No wrist ring, so no rotation.
        zipper = ring(palm, 1.2, 32)
        band(tape, zipper, 1.5, 0.22, closed=True)
        band(teeth, zipper, 0.42, 0.18, lift=0.22, sink=0.2, bevel=0.08, closed=True)
        # restraint strap at the wrist
        band(web, ring(palm, 7.6, 28), 1.5, 0.22, closed=True)
        th = palm.toward(hand.B, 7.6)
        buckle(steel, web, palm.at(7.6, th, 0.15), palm.normal(7.6, th), (2.0, 2.4))

    emit(shell, "Gloves_Shell", M["suit"], g)
    emit(tape, "Gloves_ZipperTape", M["tape"], g, smooth=False)
    emit(teeth, "Gloves_ZipperTeeth", M["steel"], g, smooth=False)
    emit(web, "Gloves_Straps", M["webbing"], g, smooth=False)
    emit(steel, "Gloves_Buckles", M["steel"], g, smooth=False)


# ---------------------------------------------------------------------------- legs

# (x, y, z, radius across, radius fore-and-aft) for his left leg, from inside the hips to inside the boot
LEG = [
    (9.5, 0.0, Z_HIP + 0.5, 6.0, 6.6), (9.8, 0.0, 92.0, 7.0, 7.6), (10.2, 0.0, Z_CROTCH - 3.5, 9.7, 10.2),
    (10.8, -0.3, 75.0, 9.3, 9.8), (11.6, -0.8, 65.0, 8.1, 8.5), (12.3, -1.0, Z_KNEE, 7.0, 7.3),
    (12.8, 0.2, 43.0, 6.8, 7.2), (STANCE, 0.6, 32.0, 5.8, 6.1), (STANCE, 0.5, 20.0, 4.7, 4.9),
]


def leg_tube(sx: int) -> Tube:
    t = Tube([(sx * x, y, z) for x, y, z, _, _ in LEG], [(a, b) for *_, a, b in LEG], resample=18)
    d_hip, d_knee, d_calf, d_cuff = t.key_d(2), t.key_d(5), t.key_d(6), t.key_d(7) - 2.0
    th_front = t.toward(FRONT, d_knee)

    def fold(d: float, th: float) -> float:
        c = math.cos(th - th_front)
        front, back = max(0.0, c), max(0.0, -c)
        f = 0.06 * back * gauss(d, d_calf, 8) + 0.04 * front * gauss(d, d_knee, 4)
        f += 0.04 * gauss(d, d_knee, 6.5) * (0.4 + 0.6 * back) * creases(d, th, 3.2, 1.0 * sx)
        f += 0.018 * gauss(d, d_hip, 6) * creases(d, th, 3.6, 2.6 * sx)
        f += 0.012 * gauss(d, d_cuff, 4) * creases(d, th, 2.8, 0.3 * sx)   # bunching over the boot
        return f

    t.fold = fold
    return t


def build_legs(M: dict) -> None:
    g = group("Legs")
    legs, strips, cords, eyelets, flap, snaps = (MeshBuilder() for _ in range(6))
    for sx in (1, -1):
        t = leg_tube(sx)
        t.add(legs, 40)
        d_knee = t.key_d(5)
        out = t.toward((sx, 0.15, 0), d_knee)
        lacing(t, t.key_d(2) + 5.0, d_knee - 7.0, out, 2.6, strips, cords, eyelets)
        lacing(t, d_knee + 7.0, t.key_d(7) - 3.0, out, 2.4, strips, cords, eyelets)
        if sx == -1:
            # biomedical connector flap, right thigh: the sensor harness plugs in underneath
            d0, d1 = d_knee - 21.0, d_knee - 9.0
            th = t.toward((sx * 0.75, -1, 0), d0)
            t.patch(flap, d0, d1, th - 0.5, th + 0.5, 0.35, nd=10, nt=10)
            for d in (d0 + 1.0, d1 - 1.0):
                for s in (-0.4, 0.4):
                    snaps.disc(t.at(d, th + s, 0.25), t.normal(d, th + s), 0.4, 0.3, 10)

    emit(legs, "Legs_Trousers", M["suit"], g)
    emit(strips, "Legs_LacingStrips", M["webbing"], g)
    emit(cords, "Legs_LacingCords", M["lace"], g)
    emit(eyelets, "Legs_Eyelets", M["steel"], g)
    emit(flap, "Legs_BiomedFlap", M["suit"], g)
    emit(snaps, "Legs_BiomedSnaps", M["steel"], g)


# --------------------------------------------------------------------------- boots


def build_boots(M: dict) -> None:
    g = group("Boots")
    uppers, soles, laces, eyelets, tongue = (MeshBuilder() for _ in range(5))
    y0 = 0.5                      # ankle centre
    toe = y0 - 23.5
    heel = toe + BOOT_LENGTH
    for sx in (1, -1):
        x0 = sx * STANCE
        shaft = Tube([(x0, y0, z) for z in (BOOT_TOP, BOOT_TOP - 1.5, 21.0, 15.0, 10.0, 5.0)],
                     [(6.2, 6.5), (6.15, 6.45), (5.6, 5.9), (4.9, 5.3), (4.5, 5.1), (4.2, 4.8)], resample=5)
        shaft.add(uppers, 28)
        # the foot: heel to toe, squared off underneath so the upper meets the sole at its edge
        keys = [(7.4, 4.9, 2.0, 2.6), (6.8, 5.0, 3.4, 3.6), (3.5, 5.5, 4.3, 4.6), (-2.5, 6.4, 4.9, 5.3),
                (-9.5, 5.4, 5.3, 4.2), (-15.5, 4.4, 5.3, 3.2), (-20.0, 3.9, 4.6, 2.6), (-22.6, 3.5, 2.8, 2.0)]
        foot = Tube([(x0, y0 + y, z) for y, z, _, _ in keys], [(a, b) for *_, a, b in keys], ref=(0, 0, 1),
                    resample=5, fold=lambda d, th: squareness(th, 4.0) * smooth(-math.sin(th), 0.0, 0.6))
        foot.add(uppers, 28)

        # sole: an outline of stations down the foot, raised at the heel
        n, centre_y, half = 28, (toe + heel) / 2, (heel - toe) / 2
        st = []
        for i in range(n + 1):
            a = math.pi * i / n
            c, s = math.cos(a), math.sin(a)
            y = centre_y - half * math.copysign(abs(c) ** 0.75, c)
            w = (5.9 + 0.3 * c) * s**0.75
            h = smooth(y, y0 - 9.0, y0 + 0.5)
            st.append((y, w, 1.3 * h, 1.8 + 1.4 * h))
        inside = Vector((x0, centre_y, 1.0))
        skin(soles, [[Vector((x0 - w, y, zt)), Vector((x0 + w, y, zt))] for y, w, _, zt in st], inside + UP)
        skin(soles, [[Vector((x0 - w, y, zb)), Vector((x0 + w, y, zb))] for y, w, zb, _ in st], inside - UP * 2)
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
            rows = [[(shaft.at(d, th + s * 0.33, 0.65), shaft.normal(d, th + s * 0.33)) for s in (-1, 1)]
                    for d in (1.8, 4.0, 6.2, 8.4, 10.6, 12.8, 15.0)]
            th = foot.toward(UP, 10.0)
            rows += [[(foot.at(d, th - s * 0.33, 0.65), foot.normal(d, th - s * 0.33)) for s in (-1, 1)]
                     for d in (9.4, 11.6, 13.8, 16.0)]
            for (a0, a1), (b0, b1) in zip(rows, rows[1:]):
                laces.tube(a0[0], b1[0], 0.13, 5)
                laces.tube(a1[0] + a1[1] * 0.32, b0[0] + b0[1] * 0.32, 0.13, 5)
            for a0, a1 in (rows[0], rows[-1]):
                laces.tube(a0[0], a1[0], 0.13, 5)
            for pair in rows:
                for p, nm in pair:
                    eyelets.disc(p - nm * 0.9, nm, 0.3, 1.35, 8)   # lacing hooks

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
            fine.append(0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                               + (3 * p1 - p0 - 3 * p2 + p3) * t**3))
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
    Tube([(cx - wx / 2 + x, cy, cz) for x, _ in xs], [(hz / 2 * k, ly / 2 * k) for _, k in xs], resample=1,
         fold=lambda d, th: squareness(th, 10.0)).add(case, 72)
    top = cz + hz / 2
    # carrying handle
    hy = cy + 1.0
    Tube([(cx, hy + y, top + z) for y, z in ((-7.0, -0.6), (-6.6, 2.4), (-4.8, 3.6), (4.8, 3.6), (6.6, 2.4), (7.0, -0.6))],
         [(0.75, 0.75)] * 6, ref=(1, 0, 0), resample=6).add(hard, 10)
    for y in (-7.0, 7.0):
        hard.box((3.0, 2.4, 0.8), Matrix.Translation((cx, hy + y, top + 0.2)))
    for y in (-11.0, 13.0):   # lid latches on the outboard face
        hard.box((0.7, 3.0, 4.4), Matrix.Translation((cx + wx / 2, cy + y, top - 5.0)))
    for dx in (-1, 1):
        for dy in (-1, 1):
            hard.tube((cx + dx * 5.0, cy + dy * 16.0, 0.0), (cx + dx * 5.0, cy + dy * 16.0, feet + 0.6), 1.3, 12)
    for k in range(6):        # blower louvres
        grille.box((0.6, 16.0, 1.0), Matrix.Translation((cx + wx / 2, cy, feet + 6.0 + k * 2.1)))
    # hose: out of the top of the case, up and across to the inlet at his left waist
    py = cy - 15.0
    fit.lathe([(2.9, -0.4), (2.9, 0.9), (2.3, 1.1), (2.3, 3.2), (1.45, 3.2)], 28,
              matrix=Matrix.Translation((cx, py, top)))
    keys = [(cx, py, top + 1.5), (cx, py, top + 8.0), (cx - 1.5, py - 4.0, top + 20.0), (cx - 9.0, py - 9.0, 68.0),
            (cx - 19.0, py - 8.0, 84.0), tuple(inlet + axis * 16.0), tuple(inlet + axis * 6.0), tuple(inlet - axis * 1.2)]
    pts = polyline(keys, 0.4)
    Tube(pts, [(1.5, 1.5)] * len(pts), resample=1,
         fold=lambda d, th: 0.085 * math.sin(TAU * d / 1.6)).add(hose, 12)

    emit(case, "Ventilator_Case", M["aluminium"], g)
    emit(hard, "Ventilator_Hardware", M["steel"], g, sharp_angle=30)
    emit(grille, "Ventilator_Louvres", M["rubber"], g, smooth=False)
    emit(hose, "Ventilator_Hose", M["hose"], g)
    emit(fit, "Ventilator_HoseFitting", M["aluminium"], g, sharp_angle=30)


# --------------------------------------------------------------------------- build


def build() -> float:
    """Builds the figure and returns its standing height in metres."""
    M = materials()
    build_helmet(M)
    inlet, axis = build_torso(M)
    arms = build_arms(M)
    build_gloves(M, arms)
    build_legs(M)
    build_boots(M)
    build_ventilator(M, inlet, axis)
    return max(v.co.z for o in bpy.data.objects if o.type == "MESH" for v in o.data.vertices)
