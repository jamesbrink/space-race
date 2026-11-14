"""The Gemini spacecraft's stations and surfaces, and what its skins are made of: the beaded shingles, the window in
each hatch with the trough cut into the cone before it, and a thrust chamber set in its port at an angle to the skin.

gemini_spacecraft.py builds the ship from these. Dimensions are inches and stations are McDonnell's Z stations; the
model's origin is Z103.44 and its +X is the ship's top (TY: the hatches), its +Y the crew's right (RX). An angle is
measured round the ship from the top toward the crew's right.

What each number rests on is in ./gemini-spacecraft.md. Much of what is here is read off one photograph, NASA
S65-21090 (the spacecraft on the launch vehicle on the morning of the flight, seen from above), through a camera
fitted to it; those figures are good to about two inches and three degrees, and are `estimated`.
"""

from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector

import srlib
from srlib import IN, TAU, MeshBuilder, Surf, deg

# ------------------------------------------------------------------ stations and sizes (in)

Z0 = 103.44  # the re-entry module / adapter mating line: the model's origin
Z_BASE = 13.44  # the spacecraft / launch vehicle mating line
Z_MATING_TOP = 15.38  # the head of the mating section (Technical Summary, Fig. 1)
Z_DIVISION = 68.44  # where the equipment section ends and the retrograde section begins (Technical Summary, Fig. 1)
Z_SHIELD_APEX = 94.4  # the heat shield's crown, inside the retrograde section
Z_RING = 104.94  # the head of the ring the heat shield is bolted to
Z_HATCH_AFT = 106.0  # the hatches' aft edges: estimated
Z_SILL = 108.0  # the large pressure bulkhead, and the hatch openings' aft sills
Z_DOORS = 132.5  # where the equipment bay doors divide
Z_HATCH_FWD = 151.62  # the hatches' forward edges (Technical Summary, Fig. 1)
Z_ACCESS = 160.2  # the "Z160.20 equipment access" shingles begin (SEDR 300, Fig. 2-7)
Z_RCS = 173.97  # cabin / re-entry control system section
Z_RR = 191.97  # re-entry control system section / rendezvous and recovery section
Z_RR_TAPER = 201.47  # where the rendezvous and recovery section begins to taper
Z_RR_TOP = 233.97  # its forward face
Z_NOSE = 239.28  # the tip of the nose fairing
LENGTH = Z_NOSE - Z_BASE  # 225.84: the launch configuration

BASE_R = 60.0  # 120.00 in across the adapter's base
ADAPTER_TOP_R = 44.15  # 88.30 in across its head
SHIELD_R = 45.0  # 90.00 in across the heat shield
SHIELD_SPHERE = 144.0  # the heat shield's spherical radius
NECK_R = 19.33  # 38.66 in across the re-entry control system section
CABIN_A = deg(20)
ADAPTER_A = math.atan((BASE_R - ADAPTER_TOP_R) / (Z0 - Z_BASE))  # 10 degrees
RR_A = deg(7)

# The hatches. Each lies between the beam along the top of the cabin and its hinge.
HATCH_IN = 5.7  # from the top centreline to a hatch's inboard edge: half the beam's width (S65-13244): estimated
HATCH_OUT = deg(62)  # its hinge, round from the top: estimated
HATCH_MARGIN = 4.6  # the plate along its inboard edge, over the sill and the latches (S65-21090): estimated
WALL = 2.4  # outer mould line to inner, through a hatch: estimated

# The windows (all estimated from S65-21090 but the tilt, which is SEDR 300's Figure 2-10 as drawn).
WINDOW_AT = deg(41)  # the middle of a window's aft edge, round from the top
WINDOW_AFT = 141.3  # the station of that point: where the outer pane meets the skin
WINDOW_TILT = deg(35)  # the outer pane to the hatch's skin: its forward edge is sunk
WINDOW_L = 8.5  # the pane from its aft edge to its forward edge, at its middle
WINDOW_HALF = 7.4  # half its width
WINDOW_ARCH = -4.0  # where the arch of its outboard and forward side meets its forward edge, from its middle
TROUGH_TIP = 169.0  # where the trough before a window runs out (Technical Summary, Fig. 1): estimated
TROUGH_WALLS = (2.0, 4.5)  # how wide its inboard wall is, which is steep, and its outboard one, which is not (S65-13244)

# The shingles.
BEAD = (1.15, 0.22)  # the cabin's beads: from one to the next along the cone, and how proud one stands
CELL = 6.5  # a cell of beads, round the cone, between two rows of fasteners
RINGS = (Z_HATCH_AFT, 119.25, Z_DOORS, 146.35, Z_ACCESS, Z_RCS - 0.4)  # the seams round the cabin: all but two estimated

# The re-entry control system's chambers (the places estimated from S65-21090; the directions are SEDR 300's Fig. 8-84).
RCS_AT = (deg(34), deg(55))  # the two chambers of a cluster, round from the top or the bottom: the pitch one, the yaw one
RCS_ROWS = (183.4, 188.1)  # the stations of the two rings of chambers
RCS_SPLAY = deg(10)  # how far a chamber is turned from the axis it fires along: estimated


def zz(station: float) -> float:
    """A station as a height in the model."""
    return station - Z0


CABIN = Surf(SHIELD_R, 0.0, CABIN_A)
ADAPTER = Surf(BASE_R, zz(Z_BASE), ADAPTER_A)
NECK = Surf(NECK_R, zz(Z_RCS), 0.0)
NOSE = Surf(NECK_R, zz(Z_RR_TAPER), RR_A)


def radial(a: float) -> Vector:
    return Vector((math.cos(a), math.sin(a), 0.0))


def hatch_in(z: float) -> float:
    """A hatch's inboard edge round from the top, at a height: a line parallel to the ship's middle, not a meridian."""
    return math.asin(HATCH_IN / CABIN.r(z))


def hatch_margin(z: float) -> float:
    return math.asin((HATCH_IN + HATCH_MARGIN) / CABIN.r(z))


def holes() -> bool:
    """Whether ports are cut through the skins at this level of detail: below it a skin is too coarse to cut cleanly."""
    return srlib.DETAIL >= 0.5


# ------------------------------------------------------------------ a window and its trough


def _fall(x: float) -> float:
    """1 at nought falling smoothly to nought at 1."""
    return 0.0 if x >= 1.0 else 1.0 if x <= 0.0 else 0.5 * (1.0 + math.cos(math.pi * x))


class Window:
    """One hatch's window: the plane its outer pane lies in, the opening's outline on that plane, and how far under
    the cone the skin is let down round it and before it (the trough the pilot looks along).

    The pane is not in the skin. Its aft edge is at the skin and its forward edge is sunk, so that it stands at 35
    degrees to the hatch and faces forward; forward of it the skin is cut away in a trough that runs out toward the
    neck. On the pane, `u` is inches outboard of its middle and `w` inches from its aft edge toward the nose."""

    def __init__(self, side: int) -> None:
        self.side = side
        tw = side * WINDOW_AT
        a, tilt = CABIN_A, WINDOW_TILT
        rad = radial(tw)
        n = Vector((math.cos(a) * rad.x, math.cos(a) * rad.y, math.sin(a)))  # the skin's normal at its middle
        g = Vector((-math.sin(a) * rad.x, -math.sin(a) * rad.y, math.cos(a)))  # along the skin, toward the nose
        self.eu = side * Vector((-math.sin(tw), math.cos(tw), 0.0))
        self.ef = math.cos(tilt) * g - math.sin(tilt) * n
        self.np = math.cos(tilt) * n + math.sin(tilt) * g  # the way the pane faces: out, and forward
        self.o = rad * CABIN.r(zz(WINDOW_AFT)) + Vector((0.0, 0.0, zz(WINDOW_AFT)))
        self.zf = self.o.z + WINDOW_L * self.ef.z  # the height of its forward edge
        self.w_tip = self.aft(WINDOW_HALF)  # where the aft edge ends outboard: the opening's outboard point

    # -- the pane's plane

    def at(self, u: float, w: float, lift: float = 0.0) -> Vector:
        """A point of the pane's plane, `lift` inches out of it: inches."""
        return self.o + u * self.eu + w * self.ef + lift * self.np

    def on(self, p: Vector) -> tuple[float, float]:
        d = p - self.o
        return d.dot(self.eu), d.dot(self.ef)

    def under(self, theta: float, z: float) -> float:
        """How far the pane's plane is under the cone, measured toward the ship's axis, at an angle and a height."""
        c = math.cos(theta) * self.np.x + math.sin(theta) * self.np.y
        return CABIN.r(z) - (self.o.dot(self.np) - z * self.np.z) / c

    def aft(self, u: float) -> float:
        """Where the pane's plane comes out through the skin, `u` across: the opening's aft edge is this line."""
        lo, hi = -3.0, WINDOW_L
        for _ in range(40):
            mid = (lo + hi) / 2
            p = self.at(u, mid)
            if math.hypot(p.x, p.y) > CABIN.r(p.z):
                lo = mid
            else:
                hi = mid
        return hi

    # -- the opening

    def outboard(self, w: float) -> float:
        """The opening's outboard edge, `w` down the pane: a quarter of an ellipse from its outboard point round to
        its forward edge."""
        if w <= self.w_tip:
            return WINDOW_HALF
        k = min(1.0, (w - self.w_tip) / (WINDOW_L - self.w_tip))
        return WINDOW_ARCH + (WINDOW_HALF - WINDOW_ARCH) * math.sqrt(max(0.0, 1.0 - k * k))

    def flat(self, w: float, by: float = 1.3) -> float:
        """How far outboard the hatch's plate keeps to the pane's plane, `w` down the pane: the opening's outboard edge
        and `by` inches all round it."""
        best = -WINDOW_HALF
        for i in range(-6, 7):
            dw = by * i / 6
            if w - dw <= WINDOW_L:
                best = max(best, self.outboard(w - dw) + math.sqrt(max(0.0, by * by - dw * dw)))
        return best

    def outline(self, n: int = 72, grow: float = 0.0) -> list[tuple[float, float]]:
        """The opening's edge as (u, w) points, running anticlockwise as seen from outside on the crew's right (and
        clockwise on the left); `grow` moves it outward by that many inches."""
        h, corner = WINDOW_HALF, 1.0
        pts: list[tuple[float, float]] = []
        na = max(6, n // 4)
        for i in range(na + 1):  # the aft edge, from the inboard corner out to the outboard point
            u = -h + 2 * h * i / na
            pts.append((u, self.aft(u)))
        nb = max(6, n // 3)
        for i in range(1, nb + 1):  # round the outboard side to the forward edge
            a = math.pi / 2 * i / nb
            pts.append((WINDOW_ARCH + (h - WINDOW_ARCH) * math.cos(a), self.w_tip + (WINDOW_L - self.w_tip) * math.sin(a)))
        nc = max(3, n // 8)
        for i in range(1, nc + 1):  # the forward edge, toward the beam
            pts.append((WINDOW_ARCH - (h - corner + WINDOW_ARCH) * i / nc, WINDOW_L))
        for i in range(1, 5):  # the forward inboard corner
            a = math.pi / 2 * i / 4
            pts.append((-h + corner - corner * math.sin(a), WINDOW_L - corner + corner * math.cos(a)))
        nd = max(3, n // 8)
        w0 = self.aft(-h)
        for i in range(1, nd):  # the inboard edge, back to the aft one
            pts.append((-h, WINDOW_L - corner - (WINDOW_L - corner - w0) * i / nd))
        if grow:
            cu = sum(p[0] for p in pts) / len(pts)
            cw = sum(p[1] for p in pts) / len(pts)
            out = []
            m = len(pts)
            for i, (u, w) in enumerate(pts):
                (u0, w0_), (u1, w1) = pts[i - 1], pts[(i + 1) % m]
                tu, tw_ = u1 - u0, w1 - w0_
                ln = math.hypot(tu, tw_) or 1.0
                nu, nw = tw_ / ln, -tu / ln
                if nu * (u - cu) + nw * (w - cw) < 0:
                    nu, nw = -nu, -nw
                out.append((u + nu * grow, w + nw * grow))
            pts = out
        return pts

    def inside(self, u: float, w: float, grow: float = 0.0) -> bool:
        if w > WINDOW_L + grow or u < -WINDOW_HALF - grow:
            return False
        return w > self.aft(max(-WINDOW_HALF, min(WINDOW_HALF, u))) - grow and u < self.outboard(min(w, WINDOW_L)) + grow

    def covers(self, theta: float, z: float, grow: float = 0.0) -> bool:
        """Whether a point of the skin, by its angle and height, is in the opening."""
        if self.side * theta <= 0:
            return False
        c = math.cos(theta) * self.np.x + math.sin(theta) * self.np.y
        rho = (self.o.dot(self.np) - z * self.np.z) / c
        return self.inside(*self.on(Vector((rho * math.cos(theta), rho * math.sin(theta), z))), grow)

    def lay(self, u: float, w: float, lift: float = 0.0) -> Vector:
        """A point of the pane's plane, or, where the plane has come out through the cone or gone under the trough's
        floor, the point of the skin there: what lies round the opening follows the skin. Metres."""
        p = self.at(u, w)
        th = math.atan2(p.y, p.x)
        rho = math.hypot(p.x, p.y)
        if rho > CABIN.r(p.z) or rho < CABIN.r(p.z) - depth(th, p.z) - 1e-4:
            return skin(th, p.z, lift)
        return (p + lift * self.np) * IN

    # -- the trough

    def depth(self, theta: float, z: float) -> float:
        """How far the skin is let down under the cone here, inches toward the ship's axis: nothing aft of the
        opening, the pane's own plane beside it, and before it a trough that narrows and shallows to its tip."""
        a = self.side * theta
        if a <= 0 or z >= zz(TROUGH_TIP):
            return 0.0
        d = self.under(theta, min(z, self.zf))
        if d <= 0:
            return 0.0
        r = CABIN.r(z)
        u = (a - WINDOW_AT) * r
        if z <= self.zf:
            lo, hi, fade = -WINDOW_HALF - 1.3, self.flat((z - self.o.z) / self.ef.z), 1.0
        else:
            t = (z - self.zf) / (zz(TROUGH_TIP) - self.zf)
            mid, half = -3.0, 5.7 * (1.0 - 0.72 * t)
            lo, hi, fade = mid - half, mid + half, (1.0 - t) * (1.0 - 0.35 * t)
        wall_in, wall_out = TROUGH_WALLS
        room = (HATCH_OUT - WINDOW_AT) * r - 0.9 - hi  # (its outboard wall stops short of the hinge)
        if u < lo:
            m = _fall((lo - u) / wall_in)
        elif u > hi:
            m = _fall((u - hi) / max(0.6, min(wall_out, room)))
        else:
            m = 1.0
        return d * m * fade


WINDOWS = {side: Window(side) for side in (-1, 1)}


def depth(theta: float, z: float) -> float:
    """How far under the cone the cabin's skin is at an angle and a height: nothing, but in the two troughs."""
    theta = (theta + math.pi) % TAU - math.pi
    if not (zz(WINDOW_AFT) - 4.0 < z < zz(TROUGH_TIP)) or abs(theta) > HATCH_OUT:
        return 0.0
    return WINDOWS[1 if theta > 0 else -1].depth(theta, z)


def skin(theta: float, z: float, off: float = 0.0) -> Vector:
    """A point of the cabin's skin, `off` inches out along the cone's normal: metres."""
    r = CABIN.r(z) - depth(theta, z)
    return (Vector((r * math.cos(theta), r * math.sin(theta), z)) + off * CABIN.n(theta)) * IN


def troughed(t0: float, t1: float, z0: float, z1: float) -> bool:
    """Whether a piece of the cabin's skin has any of a trough in it."""
    return any(depth(t0 + (t1 - t0) * i / 6, z0 + (z1 - z0) * j / 6) > 0.02 for i in range(7) for j in range(7))


# ------------------------------------------------------------------ shingles


def _edge(t):
    return t if callable(t) else (lambda z, v=t: v)


def shingle(
    panels: MeshBuilder,
    bolts: MeshBuilder,
    z0: float,
    z1: float,
    ta,
    tb,
    *,
    beads: bool = True,
    margin: float = 0.65,
    rivets: str = "al",
    off: float = 0.0,
) -> None:
    """One cell of the cabin's skin between heights z0 and z1 and angles ta and tb (each a figure or a function of
    height): a flat fastened margin round a rank of beads. The beads lie round the cone, each a little short of the
    cell's width, one after another along it (S65-13395, S65-21090, S65-13244). Where a trough crosses the cell the
    beads go down into it. `rivets` says which of its edges this cell fastens: a(ft), f(orward), l(ow angle), h(igh)."""
    fa, fb = _edge(ta), _edge(tb)
    gap = 0.05
    ca = math.cos(CABIN_A)
    zm = (z0 + z1) / 2
    rm = CABIN.r(zm)
    width = (fb(zm) - fa(zm)) * rm
    slant = (z1 - z0) / ca
    pitch, proud = BEAD
    detail = srlib.DETAIL
    dip = troughed(fa(zm), fb(zm), z0, z1)
    if detail < 1.0:
        pitch *= 2
    count = int((slant - 2 * margin) / pitch) if beads and detail >= 0.5 and width > 2 * margin + 1.4 and slant > 2 * margin + pitch else 0
    rows: list[tuple[float, float]] = [(gap, 0.0)]
    if count:
        step = (slant - 2 * margin) / count
        shape = ((0.08, 0.0), (0.3, 1.0), (0.7, 1.0), (0.92, 0.0)) if detail >= 1.0 else ((0.2, 0.0), (0.6, 1.0))
        rows += [(margin + (k + f) * step, h) for k in range(count) for f, h in shape]
    elif dip:
        n = max(2, round(slant / 0.5))
        rows += [(slant * i / n, 0.0) for i in range(1, n)]
    rows.append((slant - gap, 0.0))
    # across it: the margin, the bead's rounded end, its length, and back
    e0, e1 = margin / width, min(0.45, (margin + 0.5) / width)
    if count:
        inner = max(1, math.ceil((1 - 2 * e1) * width / (0.5 if dip else 2.4)))
        cols = [(0.0, 0.0), (e0, 0.0)] + [(e1 + (1 - 2 * e1) * i / inner, 1.0) for i in range(inner + 1)] + [(1 - e0, 0.0), (1.0, 0.0)]
    else:
        inner = max(1, math.ceil(width / (0.5 if dip else 2.4)))
        cols = [(i / inner, 0.0) for i in range(inner + 1)]

    def theta(s: float, z: float) -> float:
        g = gap / CABIN.r(z)
        return fa(z) + g + (fb(z) - fa(z) - 2 * g) * s

    def point(i: int, j: int) -> Vector:
        z = z0 + rows[j][0] * ca
        return skin(theta(cols[i][0], z), z, off + proud * cols[i][1] * rows[j][1])

    panels.grid(
        point,
        range(len(cols)),
        range(len(rows)),
        uv=lambda i, j: ((fa(zm) + (fb(zm) - fa(zm)) * cols[i][0]) * rm * IN, (z0 + rows[j][0] * ca) * IN),
    )
    if detail < 0.5:
        return

    def rivet(s: float, q: float) -> None:
        z = z0 + q * ca
        t = theta(s, z)
        bolts.disc(skin(t, z, off - 0.02), CABIN.n(t), 0.19 * IN, 0.12 * IN)

    across = max(2, round(width / 2.1))
    along = max(2, round(slant / 2.4))
    inset = 0.3
    for edge in rivets:
        if edge in "af":
            for i in range(across):
                rivet((i + 0.5) / across, inset if edge == "a" else slant - inset)
        else:
            for i in range(along):
                rivet(inset / width if edge == "l" else 1 - inset / width, slant * (i + 0.5) / along)


def band(panels: MeshBuilder, bolts: MeshBuilder, z0: float, z1: float, t0, t1, count: int, **kw) -> None:
    """A ring of the cabin's skin from angle t0 round to t1 as `count` cells side by side."""
    f0, f1 = _edge(t0), _edge(t1)
    for k in range(count):
        ta = lambda z, k=k: f0(z) + (f1(z) - f0(z)) * k / count  # noqa: E731
        tb = lambda z, k=k: f0(z) + (f1(z) - f0(z)) * (k + 1) / count  # noqa: E731
        shingle(panels, bolts, z0, z1, ta, tb, **kw)


def sheet(mb: MeshBuilder, t0, t1, z0: float, z1: float, off: float, cell: float, hole=None, flip: bool = False, drop=None) -> None:
    """A piece of the cabin's skin, plain, from angle t0 to t1 (figures or functions of height) and height z0 to z1,
    `off` inches off it, in cells about `cell` inches across; where `hole(theta, z)` is true there is none. `drop`
    (theta, z) is a further distance inward, for what lies under the skin and must keep under it."""
    f0, f1 = _edge(t0), _edge(t1)
    zm = (z0 + z1) / 2
    nz = max(1, round((z1 - z0) / math.cos(CABIN_A) / cell))
    nt = max(1, round(abs(f1(zm) - f0(zm)) * CABIN.r(zm) / cell))
    zs = [z0 + (z1 - z0) * j / nz for j in range(nz + 1)]
    grid = [[(f0(z) + (f1(z) - f0(z)) * i / nt, z) for i in range(nt + 1)] for z in zs]

    def at(t: float, z: float) -> tuple:
        if drop is None:
            return tuple(skin(t, z, off))
        r = CABIN.r(z) - drop(t, z)
        return tuple(Vector((r * math.cos(t), r * math.sin(t), z)) * IN)

    verts = [at(t, z) for row in grid for t, z in row]
    faces = []
    for j in range(nz):
        for i in range(nt):
            (ta, za), (tb, zb) = grid[j][i], grid[j + 1][i + 1]
            if hole and hole((ta + tb) / 2, (za + zb) / 2):
                continue
            a, b, c, d = j * (nt + 1) + i, j * (nt + 1) + i + 1, (j + 1) * (nt + 1) + i + 1, (j + 1) * (nt + 1) + i
            faces.append((a, d, c, b) if flip else (a, b, c, d))
    mb.add(verts, faces)


# ------------------------------------------------------------------ a thrust chamber in its port


def pierce(name: str, at: Vector, out: Vector, radius: float, reach: float = 6.0) -> None:
    """Cut a port through a skin for a chamber that fires along `out` from `at` (inches), which need not be the way
    the skin faces. srlib.bore is for a hole square to its skin: it draws the hole's rim onto a circle about its
    axis, and on a skin the axis leans to, that lifts the rim off the skin. Here the faces round the port are divided
    until they are small and every one that reaches inside it is taken out; the rim is left as it falls, a little
    outside the port, and the chamber's collar lies over it."""
    obj = bpy.data.objects[name]
    inv = obj.matrix_world.inverted()
    a, d = inv @ (at * IN), (inv.to_3x3() @ out).normalized()
    r = radius * IN

    def off(co) -> float:
        v = co - a
        s = v.dot(d)
        return (v - d * s).length if abs(s) < reach * IN else 1e9

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for _ in range(7):
        long = [
            e
            for e in bm.edges
            if e.calc_length() > r * 0.16 and min(off(e.verts[0].co), off(e.verts[1].co), off((e.verts[0].co + e.verts[1].co) / 2)) < r * 1.5
        ]
        if not long:
            break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=True)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    inside = [f for f in bm.faces if any(off(v.co) < r for v in f.verts)]
    bmesh.ops.delete(bm, geom=inside, context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def tidy(names, surf: Surf) -> None:
    """Take out of the named skins the faces a port's cutting has left with no area, or standing on edge: one of
    those can lie along a collar's side and be taken for a face that will flicker against it."""
    for name in names:
        obj = bpy.data.objects[name]
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        # (a four-sided face with three corners in a line is drawn as a triangle and a sliver: find the sliver)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
        bm.normal_update()
        thin = [
            f
            for f in bm.faces
            if f.calc_area() < 2e-3 * f.calc_perimeter() ** 2
            or f.normal.dot(surf.n(math.atan2(f.calc_center_median().y, f.calc_center_median().x))) < 0.6
        ]
        bmesh.ops.delete(bm, geom=thin, context="FACES")
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()


def _meets(surf: Surf, p: Vector, out: Vector, lift: float) -> Vector:
    """Where the line through `p` (inches) along `out` comes through the surface, `lift` inches outside it: inches."""
    lo, hi = -12.0, 12.0
    for _ in range(40):
        mid = (lo + hi) / 2
        q = p + out * mid
        if math.hypot(q.x, q.y) < surf.r(q.z) + lift:
            lo = mid
        else:
            hi = mid
    return p + out * hi


def chamber(
    noz: MeshBuilder,
    cup: MeshBuilder,
    skins,
    surf: Surf,
    theta: float,
    z: float,
    out: Vector,
    exit_r: float,
    hole: float,
    lip: float = 0.6,
) -> None:
    """A thrust chamber set in a skin at an angle: the way it fires (`out`) is not the way the skin faces, so its port
    is an oval, its bell is cut off flush with the skin and the collar round the port lies on the skin. `skins` are
    the meshes the port is cut through; `hole` the radius it is cut to; the chamber's exit is `exit_r` across."""
    out = out.normalized()
    at = Vector((surf.r(z) * math.cos(theta), surf.r(z) * math.sin(theta), z))
    e1 = out.cross(Vector((0.0, 0.0, 1.0)))
    e1 = e1.normalized() if e1.length > 1e-6 else Vector((1.0, 0.0, 0.0))
    e2 = out.cross(e1)
    n = srlib._segs(24)

    def ring(rho: float, lift: float) -> list[Vector]:
        return [_meets(surf, at + rho * (math.cos(a) * e1 + math.sin(a) * e2), out, lift) * IN for a in (TAU * i / n for i in range(n))]

    def strip(mb: MeshBuilder, rings: list[list[Vector]], flip: bool = False) -> None:
        mb.grid(lambda i, j: rings[j][i], range(n), range(len(rings)), closed_u=True, flip=flip)

    wall = hole + 0.12
    if not holes():  # from far off: a collar on the skin and a dark oval in it
        strip(cup, [ring(wall + lip, -0.3), ring(wall + lip, 0.3), ring(wall, 0.3)])
        disc = ring(wall, 0.22)
        centre = _meets(surf, at, out, 0.22) * IN
        noz.add([tuple(centre)] + [tuple(p) for p in disc], [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)])
        return
    for name in skins:
        pierce(name, at, out, hole)
    deep = at - out * (exit_r * 3.6 + 1.0)
    floor = [(deep + wall * (math.cos(a) * e1 + math.sin(a) * e2)) * IN for a in (TAU * i / n for i in range(n))]
    # the collar on the skin round the port, then the cup's wall down from it, seen from inside the cup
    strip(cup, [ring(wall + lip, -0.3), ring(wall + lip, 0.14), ring(wall, 0.14), floor])
    cup.add([tuple(deep * IN)] + [tuple(p) for p in floor], [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)])
    # the bell: its throat deep in the cup, its lip cut off just under the skin
    throat = at - out * (exit_r * 3.3 + 1.0)
    rings = []
    for rr, ss in ((0.36, 0.0), (0.62, 0.42), (0.9, 0.8)):
        base = throat + out * (ss * exit_r * 3.0)
        rings.append([(base + exit_r * rr * (math.cos(a) * e1 + math.sin(a) * e2)) * IN for a in (TAU * i / n for i in range(n))])
    rings.append(ring(exit_r, -0.3))
    strip(noz, rings)
