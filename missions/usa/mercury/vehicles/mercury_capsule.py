"""The Mercury spacecraft as the two Redstone flights shared it: what was the same on capsule No. 7
(Freedom 7, MR-3) and capsule No. 11 (Liberty Bell 7, MR-4).

Not run by itself: a flight's model/vehicle.py imports it, builds its own afterbody, hatch, windows,
paint and cabin fit, and calls these for the rest. What is here: the dimensions and stations, the
materials, the heat-sink shield, the retropack, the recovery compartment, the antenna canister, the
escape tower; and the pieces of the afterbody and cabin that did not change (the periscope, the
umbilical receptacle, the roll thrusters, the pressure vessel round a hatch opening, the oxygen
bottles and the landing bag). What differed between the two is in vehicles/mercury-capsule.md.

Every dimension is in inches (the units of the McDonnell drawings) and converted once, at the point
of use, with IN. Station 0 is the heat shield's maximum-diameter plane; +Z is toward the nose. Each
flight's spacecraft.md says what each number rests on.
"""

from __future__ import annotations

import bisect
import contextlib
import math

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

import srlib
from srlib import (
    IN,
    TAU,
    MeshBuilder,
    Surf,
    arc_profile,
    deg,
    frame,
    group,
    interior,
    lathe_obj,
    material,
    prof,
    text_mesh,
)

# ------------------------------------------------------------------ dimensions (in)


SHIELD_R = 37.25  # 74.5 in maximum diameter
SHIELD_SPHERE_R = 80.0  # heat shield radius of curvature
SHIELD_EDGE = 2.5  # height of the shield's cylindrical edge
CONE_HALF_ANGLE = math.radians(20.0)
NECK_R = 16.0  # 32 in recovery compartment
CONE_H = (SHIELD_R - NECK_R) / math.tan(CONE_HALF_ANGLE)  # 58.38
# Stations along the axis are measured from the plane of maximum diameter, McDonnell's Z104.50
# (SEDR 104, Figure 1-3): subtract 104.50 from a Z station to get a height here.
Z_CYL = CONE_H
Z_CAN = 81.14  # top of the recovery compartment (CR-649 Figure 1 and Hammack & Heberlig Figure 17)
Z_CAN_TOP = 104.57  # Z209.07
CYL_H = Z_CAN - Z_CYL  # 22.76
CAN_H = Z_CAN_TOP - Z_CAN
CAN_R0, CAN_R1 = 12.0, 10.0  # 24 in tapering to 20 in (CR-649)
SHIELD_CAP = SHIELD_SPHERE_R - math.sqrt(SHIELD_SPHERE_R**2 - SHIELD_R**2)  # 9.20
Z_APEX = -(SHIELD_EDGE + SHIELD_CAP)
Z_SPHERE_C = Z_APEX + SHIELD_SPHERE_R
Z_RETRO_BOTTOM = -27.0  # Z77.50
TRUSS_BAYS = (106.08, 137.03, 167.98, 198.93)  # Z210.58, Z241.53, Z272.48, Z303.43
Z_TRUSS_TOP = TRUSS_BAYS[-1]
Z_MOTOR = 202.0  # bottom of the motor case, above its nozzle manifold: read off the figure
Z_MOTOR_TOP = 249.55  # Z354.05
Z_MOTOR_CAP = 253.55  # Z358.05: the domed cap the spike stands on
Z_TOP = 284.55  # Z389.05, tip of the aerodynamic spike: 311.55 in (7.913 m) above the retro nozzles

# The things a visitor points at, each a mesh of its own that says what it is (the viewer reads `label` and `about`
# off whatever is under the pointer: stage.ts thingOf). Those that are part of the skin are cut with it.
THING_SHELLS: list[str] = []


def thing(mb: MeshBuilder, name: str, mat, parent, label: str, about: str, shell: bool = True, **kw) -> None:
    if not mb.verts:
        return
    obj = mb.build(name, mat, parent, **kw)
    obj["label"], obj["about"] = label, about
    if shell:
        THING_SHELLS.append(name)


PILOT_HIP = (5.0, 9.4)  # the seated pilot's hip joints, (y, z) in the capsule: the only place he fits (mark_iv_suit.seated_fits)
BEAD = 0.14  # corrugation height
WALL = 1.2  # outer shingle to pressure vessel


# ------------------------------------------------------------------------ surfaces


CONE = Surf(SHIELD_R, 0.0, CONE_HALF_ANGLE)
CYL = Surf(NECK_R, Z_CYL, 0.0)
VESSEL = Surf(SHIELD_R - WALL / math.cos(CONE_HALF_ANGLE), 0.0, CONE_HALF_ANGLE)


# ----------------------------------------------------------------------- materials


def flag_image() -> bpy.types.Image:
    """The 50-star flag (in use since 4 July 1960), 1.9:1."""
    w, h = 570, 300
    px = np.zeros((h, w, 4), dtype=np.float32)
    px[..., 3] = 1.0
    red, white, blue = (0.70, 0.13, 0.20), (0.96, 0.96, 0.94), (0.20, 0.21, 0.42)
    stripe = h / 13
    for i in range(13):  # image row 0 is the bottom; the bottom stripe is red
        px[int(round(i * stripe)) : int(round((i + 1) * stripe)), :, :3] = red if i % 2 == 0 else white
    cw, ch = int(w * 0.4), int(round(7 * stripe))
    px[h - ch :, :cw, :3] = blue
    yy, xx = np.mgrid[0:h, 0:w]
    for row in range(9):
        count = 6 if row % 2 == 0 else 5
        cy = h - ch * (row + 1) / 10
        for col in range(count):
            cx = cw * (2 * col + (1 if row % 2 == 0 else 2)) / 12
            px[(xx - cx) ** 2 + (yy - cy) ** 2 < 5.2**2, :3] = white
    img = bpy.data.images.new("flag-50-star", w, h, alpha=False)
    img.pixels.foreach_set(px.ravel())
    img.file_format = "PNG"
    img.pack()
    return img


def make_materials() -> dict[str, bpy.types.Material]:
    m = material
    return {
        # Rene 41 shingles, oxidised and painted blue-black for emissivity
        "shingle": m("shingle-rene41", (0.035, 0.038, 0.046), 0.85, 0.42),
        "beryllium_shingle": m("shingle-beryllium", (0.05, 0.052, 0.058), 0.8, 0.5),
        "underlay": m("structure-dark", (0.02, 0.02, 0.022), 0.6, 0.7, double_sided=True),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "beryllium": m("heatsink-beryllium", (0.47, 0.46, 0.44), 1.0, 0.38),
        "titanium": m("titanium", (0.46, 0.44, 0.42), 1.0, 0.5, double_sided=True),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "strap": m("strap-steel", (0.62, 0.61, 0.58), 1.0, 0.3, double_sided=True),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "tower": m("tower-red", (0.40, 0.022, 0.012), 0.0, 0.64),
        "dielectric": m("dielectric-window", (0.62, 0.59, 0.50), 0.0, 0.6),
        # the viewer swaps anything named glass for a transparent, reflective material; what is
        # seen through it is the unlit cabin, stood in for by window-void
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),
        # a lens: the viewer draws it darker and more of a mirror than a pane, and does not offer it to be looked in at
        "lens_glass": m("glass-lens", (0.25, 0.32, 0.36), 0.0, 0.02),
        "void": m("window-void", (0.004, 0.004, 0.005), 0.0, 0.95),
        "paint_white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6, double_sided=True),
        "flag": m("flag", (1, 1, 1), 0.0, 0.6, double_sided=True, image=flag_image()),
        "couch": m("couch-fibreglass", (0.27, 0.28, 0.29), 0.0, 0.6),
        "lens": m("lens", (0.01, 0.01, 0.015), 0.0, 0.03),
        # what a cutaway shows
        "suit": m("suit-aluminized-nylon", (0.66, 0.67, 0.69), 0.6, 0.6),
        "helmet": m("helmet-fibreglass-white", (0.85, 0.85, 0.82), 0.0, 0.35),
        "fabric": m("fabric-nylon", (0.80, 0.76, 0.66), 0.0, 0.9),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "bottle": m("bottle-green", (0.10, 0.22, 0.13), 0.4, 0.4),
        "propellant": m("propellant-grain", (0.16, 0.13, 0.11), 0.0, 0.9),
        "copper": m("antenna-copper", (0.72, 0.42, 0.20), 1.0, 0.35),
    }


# ------------------------------------------------------------------------ shingles


def shingle_row(panels: MeshBuilder, bolts: MeshBuilder, surf: Surf, z0: float, z1: float, count: int, phase: float, beads: int, which) -> None:
    """One ring of shingles. Each is its own patch: a flat fastened margin around a field of
    beads (the stiffening corrugations) that run along the meridian and fade out at each end."""
    arc = TAU / count
    margin = 0.07
    gap = 0.045  # inches between neighbouring shingles
    if beads:
        ss = [0.0, margin * 0.6] + [margin + (1 - 2 * margin) * i / (beads * 6) for i in range(beads * 6 + 1)] + [1 - margin * 0.6, 1.0]
    else:
        ss = [i / 6 for i in range(7)]
    rings = [(z0 + gap, 0.0), (z0 + 1.0, 0.0), (z0 + 2.0, 1.0), (z1 - 2.0, 1.0), (z1 - 1.0, 0.0), (z1 - gap, 0.0)]

    def height(s: float) -> float:
        if not beads or s <= margin or s >= 1 - margin:
            return 0.0
        frac = ((s - margin) / (1 - 2 * margin) * beads) % 1.0
        return BEAD * math.sin(math.pi * frac) ** 2

    for k in which:
        t0 = phase + k * arc

        def theta(s: float, z: float) -> float:
            g = gap / surf.r(z)
            return t0 + g + (arc - 2 * g) * s

        rmid = surf.r((z0 + z1) / 2)
        panels.grid(
            lambda s, j: surf.p(theta(s, rings[j][0]), rings[j][0], height(s) * rings[j][1]),
            ss,
            range(len(rings)),
            uv=lambda s, j: ((t0 + arc * s) * rmid * IN, rings[j][0] * IN),
        )
        # fasteners: up the seam, and across both ends between the beads
        n_edge = max(2, int((z1 - z0) / 2.4))
        # one row per seam (on this shingle's leading edge; its neighbour supplies the other)
        for i in range(n_edge):
            z = z0 + 1.6 + (z1 - z0 - 3.2) * i / (n_edge - 1)
            bolts.disc(surf.p(t0, z), surf.n(t0), 0.2 * IN, 0.07 * IN)
        n_end = beads or 4
        for z in (z0 + 0.55, z1 - 0.55):
            for i in range(1, n_end):
                s = margin + (1 - 2 * margin) * i / n_end
                bolts.disc(surf.p(theta(s, z), z), surf.n(theta(s, z)), 0.2 * IN, 0.07 * IN)


# ------------------------------------------------------- shingles beaded round the cone

GAP = 0.045  # inches between neighbouring shingles
PITCH = 1.3  # from one bead to the next along the cone, inches: estimated from photographs of capsule 11
PAINT_LIFT = 0.1  # how far paint stands off the skin it follows: clear of the screw heads under it by more than a millimetre
WASHER = (0.36, 0.19, 0.05)  # a fastener: a dimpled washer rising to the screw's head; radii and height in inches: estimated
SCREW = (0.14, 0.045)  # a plain screw's head, radius and height


def trapezoid(length: float, low: float, high: float, radius: float, grow: float = 0.0):
    """Half the width of a round-cornered trapezoid at height y, as a function: `length` along y about 0, `low` wide at
    the bottom and `high` at the top, corners of `radius`; `grow` moves its whole edge outward. Returns (half_width, y0, y1)."""
    y0, y1 = -length / 2 - grow, length / 2 + grow
    r = radius + grow

    def half(y: float) -> float:
        k = (y - y0) / (y1 - y0)
        w = (low + (high - low) * k) / 2 + grow
        d = min(y - y0, y1 - y)  # into the nearer end's corners
        return w if d >= r else w - r + math.sqrt(max(0.0, r * r - (r - d) ** 2))

    return half, y0, y1


def outline(shape, n: int = 14, ends: int = 6) -> list[tuple[float, float]]:
    """A trapezoid's edge as a closed polygon, anticlockwise from its bottom right: `n` points to a side, and its two
    ends cut in `ends` (an end lies round the cone, and a straight edge that long would sink under the skin)."""
    half, y0, y1 = shape
    # (closer together in the corners, where the edge turns)
    ys = [y0 + (y1 - y0) * (0.5 - 0.5 * math.cos(math.pi * i / n)) for i in range(n + 1)]
    top = [(half(y1) * (1 - 2 * i / ends), y1) for i in range(1, ends)]
    foot = [(-half(y0) * (1 - 2 * i / ends), y0) for i in range(1, ends)]
    return [(half(y), y) for y in ys] + top + [(-half(y), y) for y in reversed(ys)] + foot


def _reach(poly, a: float) -> tuple[float, float]:
    """Where the ray from the origin at angle `a` leaves a polygon that is star-shaped about the origin."""
    dx, dy = math.cos(a), math.sin(a)
    best = None
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        ex, ey = x1 - x0, y1 - y0
        den = dx * ey - dy * ex
        if abs(den) < 1e-12:
            continue
        t = (x0 * ey - y0 * ex) / den
        u = (x0 * dy - y0 * dx) / den
        if t > 0 and -1e-9 <= u <= 1 + 1e-9 and (best is None or t < best):
            best = t
    assert best is not None, "the polygon does not enclose the origin"
    return best * dx, best * dy


class Skin:
    """An afterbody's shingles with their beads running round the cone, and what is painted on them.

    Capsule 11's photographs (NASA 61-MR4-53, S61-03705, S61-03740; the capsule as raised in 1999) show each shingle
    as a column's width of stiffening beads lying across it, one above the next, most shingles carrying two stacks side
    by side. The skin is kept as a height field (`height`) as well as a mesh, so that paint can be laid on it and follow
    it: a letter painted across the beads rises and falls with them, as the real ones do.

    Angles are radians round the cone, stations inches. Meshes go to `panels` and `bolts`, or to builders given."""

    def __init__(self, surf: Surf, bead: float = BEAD) -> None:
        self.surf, self.bead = surf, bead
        self.cos = math.cos(surf.a)
        self.tiles: list[tuple[list[float], list[float], list[list[float]]]] = []
        self.panels, self.bolts = MeshBuilder(), MeshBuilder()

    # -- a shingle ---------------------------------------------------------------

    def shingle(
        self, t0: float, t1: float, z0: float, z1: float, stacks: int = 2, *, panels=None, bolts=None, fasten: str = "tbl", gap: float = GAP
    ) -> None:
        """One shingle between two meridians and two stations: a flat fastened margin round `stacks` stacks of beads
        (0: a plain plate). `fasten`: which edges carry a row of screws, of top, bottom, left (the lower angle), right.
        `gap`: how far it stands in from the lines given, inches: a hatch's shingles stand further from what is round them."""
        surf = self.surf
        panels, bolts = panels or self.panels, bolts or self.bolts
        rmid = surf.r((z0 + z1) / 2)
        g = gap / rmid
        ta, tb, za, zb = t0 + g, t1 - g, z0 + gap * self.cos, z1 - gap * self.cos
        width, run_ = (tb - ta) * rmid, (zb - za) / self.cos  # inches across at its middle, and along the cone
        detail = srlib.DETAIL
        margin, ramp, strip, end = 1.0, 0.4, 0.55, 1.25
        count = int((run_ - 2 * end) / PITCH)
        if detail < 0.5 or count < 1 or width < 2 * (margin + ramp) + 1.0:
            stacks = 0

        def spread(a: float, b: float, level: float) -> list[tuple[float, float]]:
            """A stretch of one height, cut so no facet turns more than four degrees round the cone."""
            # (at every level of detail: a wider facet sinks into the structure under it)
            n = max(1, math.ceil(math.degrees((b - a) * (tb - ta)) / 4.0 - 1e-6))
            return [(a + (b - a) * i / n, level) for i in range(1, n + 1)]

        m, e, d = margin / width, ramp / width, strip / width
        across: list[tuple[float, float]] = [(0.0, 0.0)]  # (fraction across, how much of a bead's height)
        if stacks == 0:
            across += spread(0.0, 1.0, 0.0)
        else:
            edges = [(m, 1.0 - m)] if stacks == 1 else [(m, 0.5 - d), (0.5 + d, 1.0 - m)]
            at = 0.0
            for a, b in edges:
                across += spread(at, a, 0.0) + [(a + e, 1.0)] + spread(a + e, b - e, 1.0) + [(b, 0.0)]
                at = b
            across += spread(at, 1.0, 0.0)
        along: list[tuple[float, float]] = [(0.0, 0.0)]  # (inches along the cone, how much of a bead's height)
        if stacks:
            pitch = (run_ - 2 * end) / count
            humps = ((-0.34, 0.0), (-0.17, 0.75), (0.0, 1.0), (0.17, 0.75), (0.34, 0.0)) if detail >= 1.0 else ((-0.34, 0.0), (0.0, 1.0), (0.34, 0.0))
            for k in range(count):
                along += [(end + (k + 0.5 + f) * pitch, h) for f, h in humps]
        along.append((run_, 0.0))
        ts = [ta + (tb - ta) * s for s, _ in across]
        zs = [za + s * self.cos for s, _ in along]
        H = [[self.bead * hz * ht for _, ht in across] for _, hz in along]
        self.tiles.append((ts, zs, H))
        panels.grid(
            lambda i, j: surf.p(ts[i], zs[j], H[j][i]),
            range(len(ts)),
            range(len(zs)),
            uv=lambda i, j: (ts[i] * rmid * IN, zs[j] * IN),
        )
        # fasteners: a row across each end, and one up the seam (its neighbour supplies the other side's)
        spots = []
        for edge, s in (("b", 0.6), ("t", run_ - 0.6)):
            if edge in fasten:
                n = max(2, round(width / 2.6))
                spots += [(ta + (tb - ta) * (i + 0.5) / n, za + s * self.cos) for i in range(n)]
        for edge, t in (("l", ta + 0.5 / rmid), ("r", tb - 0.5 / rmid)):
            if edge in fasten and run_ > 5.0:
                n = max(1, round((run_ - 3.8) / 3.4))
                spots += [(t, za + (1.9 + (run_ - 3.8) * (i + 0.5) / n) * self.cos) for i in range(n)]
        for t, z in spots:
            self.fastener(bolts, t, z)

    def fastener(self, bolts: MeshBuilder, t: float, z: float, off: float = 0.0) -> None:
        """A screw in its dimpled washer, as the shingles are held: through an oversized hole, so the skin can grow when hot."""
        if srlib.DETAIL < 0.5:
            return
        wide, head, tall = WASHER
        bolts.lathe([(wide * IN, 0.0), (head * IN, tall * IN), (0.0, tall * IN)], 10, matrix=frame(self.surf.p(t, z, off), self.surf.n(t)))

    def screw(self, bolts: MeshBuilder, t: float, z: float) -> None:
        """A plain screw's head."""
        bolts.disc(self.surf.p(t, z), self.surf.n(t), SCREW[0] * IN, SCREW[1] * IN)

    # -- a plain panel, with or without an opening ------------------------------------

    def flat(self, theta0: float, z0: float):
        """The cone unrolled about a point: (inches to the right, inches up the slant) to a place on it, as srlib.decal lays a drawing."""
        return lambda a, b, off=0.0: self.surf.wrap(theta0, z0, a, b, off)

    def bounds(self, theta0: float, z0: float, t0: float, t1: float, za: float, zb: float) -> list[tuple[float, float]]:
        """A patch between two meridians and two stations as a polygon on the cone unrolled about (theta0, z0)."""
        r0, sin = self.surf.r(z0), math.sin(self.surf.a)
        b0, b1 = (za - z0) / self.cos, (zb - z0) / self.cos
        at = lambda t, b: ((t - theta0) * (r0 - b * sin), b)  # noqa: E731
        return [at(t1, b0), at(t1, b1), at(t0, b1), at(t0, b0)]

    def panel(
        self, mb: MeshBuilder, t0: float, t1: float, z0: float, z1: float, hole=None, about=None, off: float = 0.0, rings=(0.0, 0.34, 0.67, 1.0)
    ) -> None:
        """A plain plate between two meridians and two stations. `hole` is a polygon cut out of it, on the cone unrolled
        about `about` (angle, station), which it must enclose; `rings` is how the plate is cut between the hole and its
        edge (a small hole in a wide plate wants more, or its outer facets turn too far round the cone)."""
        rmid = self.surf.r((z0 + z1) / 2)
        g = GAP / rmid
        ta, tb, za, zb = t0 + g, t1 - g, z0 + GAP * self.cos, z1 - GAP * self.cos
        if hole is None:
            n = max(1, math.ceil(math.degrees(tb - ta) / 4.0 - 1e-6))
            ts = [ta + (tb - ta) * i / n for i in range(n + 1)]
            mb.grid(lambda t, z: self.surf.p(t, z, off), ts, (za, zb), uv=lambda t, z: (t * rmid * IN, z * IN))
            return
        theta0, zc = about
        to = self.flat(theta0, zc)
        edge = self.bounds(theta0, zc, ta, tb, za, zb)
        angles = sorted({*(TAU * i / 96 for i in range(96)), *(math.atan2(y, x) % TAU for x, y in (*edge, *hole))})
        cuts, rings = rings, []
        for k in cuts:  # from the hole out to the edge, in rings: the plate lies on the cone, not across it
            ring = []
            for a in angles:
                (x0, y0), (x1, y1) = _reach(hole, a), _reach(edge, a)
                ring.append((x0 + (x1 - x0) * k, y0 + (y1 - y0) * k))
            rings.append(ring)
        mb.grid(
            lambda i, j: to(*rings[j][i], off),
            range(len(angles)),
            range(len(rings)),
            closed_u=True,
            uv=lambda i, j: (rings[j][i][0] * IN, rings[j][i][1] * IN),
            flip=True,
        )

    # -- the skin as a height, and paint on it ------------------------------------------

    def height(self, t: float, z: float) -> float:
        """How far the skin stands off the cone at a point, inches: on a bead or between them."""
        for ts, zs, H in self.tiles:
            if not zs[0] <= z <= zs[-1]:
                continue
            u = ts[0] + (t - ts[0]) % TAU
            if u > ts[-1]:
                continue
            i = max(1, min(len(ts) - 1, bisect.bisect_left(ts, u)))
            j = max(1, min(len(zs) - 1, bisect.bisect_left(zs, z)))
            fu = (u - ts[i - 1]) / (ts[i] - ts[i - 1])
            fz = (z - zs[j - 1]) / (zs[j] - zs[j - 1])
            low = H[j - 1][i - 1] + (H[j - 1][i] - H[j - 1][i - 1]) * fu
            high = H[j][i - 1] + (H[j][i] - H[j][i - 1]) * fu
            return low + (high - low) * fz
        return 0.0

    def paint(self, mb: MeshBuilder, verts, faces, theta0: float, z0: float, *, lift: float = PAINT_LIFT, uv=None) -> None:
        """Lay a flat drawing on the skin as paint: `verts` in inches on the cone unrolled about (theta0, z0), x to the
        right and y up the slant. It is cut along every row and meridian of the shingles under it, so that each piece
        of it lies on one facet of the skin, and stands `lift` off that. `uv`: a point of the drawing to its texture coordinates."""
        surf, sin = self.surf, math.sin(self.surf.a)
        r0 = surf.r(z0)
        bm = bmesh.new()
        made = [bm.verts.new((v[0], v[1], 0.0)) for v in verts]
        for f in faces:
            with contextlib.suppress(ValueError):
                bm.faces.new([made[i] for i in f])
        xs, ys = [v[0] for v in verts], [v[1] for v in verts]
        zlo, zhi = z0 + min(ys) * self.cos, z0 + max(ys) * self.cos
        tlo = theta0 + min(min(xs) / surf.r(zlo), min(xs) / surf.r(zhi))
        thi = theta0 + max(max(xs) / surf.r(zlo), max(xs) / surf.r(zhi))
        rows, meridians = set(), set()
        for ts, zs, _ in self.tiles:
            if zs[-1] < zlo or zs[0] > zhi:
                continue
            lo = ts[0] + math.floor((thi - ts[0]) / TAU) * TAU  # the tile's own angles, brought round to the drawing's
            if lo + (ts[-1] - ts[0]) < tlo:
                continue
            rows.update(round(z, 6) for z in zs if zlo < z < zhi)
            meridians.update(round(lo + (t - ts[0]), 7) for t in ts if tlo < lo + (t - ts[0]) < thi)

        def cut(co, no) -> None:
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-7, plane_co=co, plane_no=Vector(no).normalized())

        for z in sorted(rows):
            cut(((0.0, (z - z0) / self.cos, 0.0)), (0.0, 1.0, 0.0))
        for t in sorted(meridians):
            cut(((t - theta0) * r0, 0.0, 0.0), (1.0, (t - theta0) * sin, 0.0))
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
        bm.verts.index_update()
        out, uvs = [], []
        for v in bm.verts:
            z = z0 + v.co.y * self.cos
            t = theta0 + v.co.x / surf.r(z)
            out.append(tuple(surf.p(t, z, self.height(t, z) + lift)))
            uvs.append(uv(v.co.x, v.co.y) if uv else (0.0, 0.0))
        mb.add(out, [tuple(v.index for v in f.verts) for f in bm.faces], uvs)
        bm.free()

    def lettering(self, mb: MeshBuilder, body: str, length: float, tall: float, theta0: float, z0: float, font) -> None:
        """A line of capitals painted on the skin, `length` inches long and `tall` high, its middle at (theta0, z0)."""
        verts, faces = text_mesh(body, 1.0, font, cuts=0)
        xs, ys = [v[0] for v in verts], [v[1] for v in verts]
        sx, sy = length / (max(xs) - min(xs)), tall / (max(ys) - min(ys))
        cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        self.paint(mb, [((x - cx) * sx, (y - cy) * sy) for x, y, _ in verts], faces, theta0, z0)


def fasten_round(skin: Skin, bolts: MeshBuilder, rect, inset: float = 0.5, pitch: float = 2.6, sides: str = "tblr") -> None:
    """A row of screws just inside each edge of a plain plate: (angle from, angle to, station from, to)."""
    t0, t1, z0, z1 = rect
    cos = math.cos(CONE.a)
    for edge, z in (("b", z0 + inset * cos), ("t", z1 - inset * cos)):
        if edge in sides:
            width = (t1 - t0) * CONE.r(z) - 2 * inset
            n = max(2, round(width / pitch))
            for i in range(n + 1):
                skin.fastener(bolts, t0 + (inset + width * i / n) / CONE.r(z), z)
    run_ = (z1 - z0) / cos - 2 * inset
    n = max(2, round(run_ / pitch))
    for edge, sign, t in (("l", 1, t0), ("r", -1, t1)):
        if edge in sides:
            for i in range(1, n):
                z = z0 + (inset + run_ * i / n) * cos
                skin.fastener(bolts, t + sign * inset / CONE.r(z), z)


# --------------------------------------------------------------------------- parts


def build_heat_shield(M) -> None:
    g = group("HeatShield")
    phi_max = math.asin(SHIELD_R / SHIELD_SPHERE_R)
    cap = [(SHIELD_SPHERE_R * math.sin(phi_max * i / 40), Z_SPHERE_C - SHIELD_SPHERE_R * math.cos(phi_max * i / 40)) for i in range(41)]
    profile = cap + [(SHIELD_R, -0.25), (SHIELD_R - 0.25, 0.0), (SHIELD_R - 2.5, 0.0), (SHIELD_R - 3.0, -0.8), (0.0, -0.8)]
    lathe_obj("HeatShield_HeatSink", prof(profile), M["beryllium"], g, segs=160, sharp_angle=30)
    # attachment ring fasteners around the edge
    mb = MeshBuilder()
    for i in range(72):
        t = TAU * i / 72
        mb.disc(Vector((SHIELD_R * math.cos(t), SHIELD_R * math.sin(t), -1.3)) * IN, (math.cos(t), math.sin(t), 0), 0.28 * IN, 0.08 * IN)
    mb.build("HeatShield_Fasteners", M["bolt"], g)


def build_retropack(M) -> None:
    g = group("Retropack")
    housing = [(0, -23.0), (6, -22.6), (10, -21.6), (12.3, -20.6), (13, -19.5), (13, -10.85), (0, Z_APEX - 0.15)]
    lathe_obj("Retropack_Housing", prof(housing), M["aluminium"], g, segs=96, sharp_angle=35)

    motors, nozzles = MeshBuilder(), MeshBuilder()
    for i in range(3):  # three solid retrograde motors, ripple-fired 5 s apart
        t = TAU * i / 3
        c = Vector((7.0 * math.cos(t), 7.0 * math.sin(t), 0.0))
        m = Matrix.Translation((c + Vector((0, 0, -19.0))) * IN)
        motors.lathe(prof(arc_profile(0, 0, 5.6, -90, 20, 16)), 40, matrix=m)
        bell = [(1.1, -23.4), (1.9, -24.4), (2.7, -25.6), (3.2, -26.5), (3.45, Z_RETRO_BOTTOM)]
        nozzles.lathe(prof(bell), 32, matrix=Matrix.Translation(c * IN))
        nozzles.lathe(prof([(0.0, -23.6), (1.1, -23.4)]), 32, matrix=Matrix.Translation(c * IN))
    retro = (
        "Retrograde rockets",
        "Three solid motors of about 1,000 lbf for ten seconds each, fired five seconds apart: what would bring the capsule down from orbit. "
        "On this flight they were fired as a test.",
    )
    thing(motors, "Retropack_RetroMotors", M["aluminium"], g, *retro, shell=False)
    thing(nozzles, "Retropack_RetroNozzles", M["nozzle"], g, *retro, shell=False)
    motors, nozzles = MeshBuilder(), MeshBuilder()
    for i in range(3):  # three small posigrade motors push the capsule off the booster
        t = TAU * (i + 0.5) / 3
        c = Vector((9.6 * math.cos(t), 9.6 * math.sin(t), 0.0))
        m = Matrix.Translation(c * IN)
        motors.lathe(prof([(1.7, -19.5), (1.7, -23.6), (1.2, -24.2), (0.0, -24.2)]), 20, matrix=m)
        nozzles.lathe(prof([(0.5, -24.2), (1.0, -25.4)]), 16, matrix=m)
    posi = ("Posigrade rockets", "Three small solid motors, 400 lbf for a second, that push the capsule clear of the booster.")
    thing(motors, "Retropack_PosigradeMotors", M["aluminium"], g, *posi, shell=False)
    thing(nozzles, "Retropack_PosigradeNozzles", M["nozzle"], g, *posi, shell=False)

    straps, clips = MeshBuilder(), MeshBuilder()
    rs = SHIELD_SPHERE_R + 0.22
    for i in range(3):  # three straps hold the pack to the shield until explosive bolts release it
        t = TAU * (i + 0.5) / 3
        rad, side = Vector((math.cos(t), math.sin(t), 0)), (-math.sin(t), math.cos(t), 0)
        pts = [(13.15, -17.5), (13.15, -11.6)]
        pts += [(r, Z_SPHERE_C - math.sqrt(rs**2 - r**2)) for r in np.linspace(14.0, SHIELD_R, 14)]
        pts += [(SHIELD_R + 0.3, -1.2), (SHIELD_R + 0.3, 1.2)]
        path = [(rad * r + Vector((0, 0, z))) * IN for r, z in pts]
        straps.ribbon(path, side, 2.2 * IN)
        clips.box(
            (1.4 * IN, 3.0 * IN, 2.4 * IN), frame((rad * (SHIELD_R + 0.7) + Vector((0, 0, 0.6))) * IN, rad) @ Matrix.Rotation(math.pi / 2, 4, "Y")
        )
        # umbilical conduit beside each strap, pack to shield edge
        o = Vector(side) * 1.9
        straps.tube((rad * 13.2 + o + Vector((0, 0, -14))) * IN, (rad * 14.5 + o + Vector((0, 0, -10.6))) * IN, 0.3 * IN, 8)
    thing(
        straps,
        "Retropack_Straps",
        M["strap"],
        g,
        "Retropack straps",
        "Three straps hold the pack to the heat shield until explosive bolts let it go. "
        "They should meet under its middle at one bolt; here they do not.",
        shell=False,
        sharp_angle=25,
    )
    clips.build("Retropack_StrapFittings", M["steel"], g, smooth=False)


def afterbody_structure(M, g, hatch_group, hatch) -> None:
    """The structure under the shingles with the hatch's opening left out of it, and the hatch's own two skins.
    `hatch` is the opening: (angle from, angle to, station from, station to)."""
    t_h0, t_h1, hz0, hz1 = hatch
    wide = round(math.degrees(t_h1 - t_h0) / 2.5)  # a facet every 2.5 degrees
    under = MeshBuilder()
    r = lambda z: CONE.r(z) - 0.1  # noqa: E731
    under.lathe(prof([(r(0), 0.0), (r(hz0), hz0)]), 144)
    under.lathe(prof([(r(hz0), hz0), (r(hz1), hz1)]), 144 - wide, arc=(t_h1, t_h0 + TAU))
    under.lathe(prof([(r(hz1), hz1), (r(CONE_H), CONE_H)]), 144)
    under.build("Afterbody_Structure", M["underlay"], g, sharp_angle=None)
    hu = MeshBuilder()
    hu.lathe(prof([(r(hz0), hz0), (r(hz1), hz1)]), wide, arc=(t_h0, t_h1))
    rv = lambda z: VESSEL.r(z)  # noqa: E731
    hu.lathe(prof([(rv(hz0), hz0), (rv(hz1), hz1)]), wide, arc=(t_h0, t_h1), flip=True)
    hu.build("Hatch_Structure", M["titanium"], hatch_group, sharp_angle=None)


def attach_ring(M, g) -> None:
    """The shield attach ring: the smooth band below the first row of shingles."""
    lathe_obj("Afterbody_AttachRing", prof([(SHIELD_R, 0.02), (SHIELD_R + 0.05, 0.3), (CONE.r(2.0) + 0.12, 2.0)]), M["steel"], g, segs=160)


def periscope(M, g, station: float, about: str, door: tuple[float, float] | None = (6.0, 10.0)) -> None:
    """The periscope: its door's frame and the objective put out through it, under the pilot's feet (the side that faces
    the Earth with him head up). The same instrument as the screen on the panel (mercury_cabin): the lens here, a
    barrel behind it with its stop and a mirror at the bottom, where the light turns up the tube toward the screen.
    `station` is where the objective leaves the cone; `about` is what the flight says of it; `door` is the plain frame
    drawn round it, (across, along) in inches, or None where the flight builds the door's opening itself."""
    detail, glass, void, bore, mirror = (MeshBuilder() for _ in range(5))
    f = CONE.frame(deg(90), station)
    if door:
        detail.box((door[0] * IN, door[1] * IN, 1.3 * IN), CONE.frame(deg(90), station, -0.4))
    detail.lathe(
        prof([(2.4, 0.0), (2.4, 3.6), (2.05, 3.95), (1.9, 3.95), (1.9, 3.55)]), 32, matrix=f
    )  # the cartridge, and the ring that holds the lens
    glass.lathe(prof(arc_profile(0, 2.55, 2.25, 58, 90, 8)[::-1]), 32, matrix=f)  # the objective: a domed front element, 0.3 in proud at its middle
    if interior():
        glass.lathe(prof([(1.35, 2.3), (0.0, 2.42)]), 24, matrix=f)  # a second element down the barrel
        bore.lathe(prof([(1.88, 3.5), (1.88, 2.25), (1.4, 2.25), (1.4, 0.5), (0.0, 0.5)]), 32, matrix=f)  # the barrel, stopped down, blacked inside
        tilt = f @ Matrix.Translation((0, 0, 1.15 * IN)) @ Matrix.Rotation(deg(40), 4, "X")
        mirror.lathe(prof([(1.15, 0.0), (0.0, 0.0)]), 24, matrix=tilt)  # the mirror that turns the light up the tube
    else:
        void.lathe(prof([(1.9, 3.2), (0.0, 3.2)]), 32, matrix=f)
    says = ("Periscope", about)
    thing(detail, "Periscope_Door", M["steel"], g, *says)
    thing(glass, "Periscope_Objective", M["lens_glass"], g, *says)
    thing(bore, "Periscope_Barrel", M["nozzle"], g, *says)
    thing(mirror, "Periscope_Mirror", M["strap"], g, *says)
    thing(void, "Periscope_Well", M["void"], g, *says)


def umbilical_receptacle(M, g, at: tuple[float, float], about: str) -> None:
    """Where the ground's umbilical was plugged in: `at` is (angle round the cone, station)."""
    detail = MeshBuilder()
    f = CONE.frame(*at)
    detail.lathe(prof([(2.6, -0.3), (2.6, 0.45), (2.1, 0.45), (2.0, 0.25), (0.0, 0.25)]), 32, matrix=f)
    thing(detail, "Umbilical_Receptacle", M["steel"], g, "Umbilical receptacle", about)


def periscope_door(M, g, skin: Skin, door, scope_z: float, umbilical_z: float, about: str, umbilical_about: str) -> None:
    """The periscope's door open and its objective put out, with the umbilical's receptacle under the lens in the
    same opening, as the photographs have them (capsule 11: NASA S61-03705, on the pad, and as raised in 1999;
    capsule 7 as kept: NASM2021-00165). `door` is the opening: (angle from, angle to, station from, to)."""
    t0, t1, z0, z1 = door
    well, flap, liner = MeshBuilder(), MeshBuilder(), MeshBuilder()
    deep = 1.1  # inches: the opening's floor under the skin
    mid = ((t0 + t1) / 2, (z0 + z1) / 2)
    edge = skin.bounds(*mid, t0, t1, z0, z1)
    to = skin.flat(*mid)
    ring = [
        (edge[i][0] + (edge[(i + 1) % 4][0] - edge[i][0]) * k / 6, edge[i][1] + (edge[(i + 1) % 4][1] - edge[i][1]) * k / 6)
        for i in range(4)
        for k in range(6)
    ]
    well.grid(lambda i, j: to(*ring[i], -deep * j), range(len(ring)), (0, 1), closed_u=True)
    well.grid(lambda t, z: CONE.p(t, z, -deep), [t0 + (t1 - t0) * i / 6 for i in range(7)], (z0, z1))
    well.build("Periscope_Well", M["underlay"], g, sharp_angle=40)
    periscope(M, g, scope_z, about, door=None)
    umbilical_receptacle(M, g, (deg(90), umbilical_z), umbilical_about)
    # the door, hinged on the side toward the hatch and standing open (how far is ours); pale inside
    across = (t1 - t0) * CONE.r(mid[1]) - 0.3
    tall = (z1 - z0) / math.cos(CONE.a) - 0.3
    hinge = CONE.p(t0, mid[1], 0.15)
    out, round_ = CONE.n(t0), Vector((-math.sin(t0), math.cos(t0), 0.0))
    swing = deg(105)
    leaf = (round_ * math.cos(swing) + out * math.sin(swing)).normalized()
    up = Vector((-math.sin(CONE.a) * math.cos(t0), -math.sin(CONE.a) * math.sin(t0), math.cos(CONE.a)))
    face = leaf.cross(up).normalized()  # the side that faced outward when it was shut
    m = Matrix((leaf, up, face)).transposed().to_4x4()
    m.translation = hinge + leaf * (across / 2 * IN)
    flap.box((across * IN, tall * IN, 0.22 * IN), m)
    liner.box(((across - 0.8) * IN, (tall - 0.8) * IN, 0.1 * IN), m @ Matrix.Translation((0, 0, -0.22 * IN)))
    says = ("Periscope door", "The door the periscope's objective was put out through, open. It shut over the lens for the climb and for the entry.")
    thing(flap, "Periscope_DoorLeaf", M["shingle"], g, *says, shell=False, smooth=False)
    thing(liner, "Periscope_DoorLiner", M["paint_white"], g, *says, shell=False, smooth=False)


def roll_fittings(M, g, places, about: str) -> None:
    """The roll jets as the flown capsule No. 7 has them (NASM2021-00160, -00161, A19620021000_DSH01): a round plate
    let into the top row of shingles, with two nozzles in it, a large and a small. `places` are (angle, station)."""
    for side, (t, z) in zip("AB", places):
        plate, pale, dark = MeshBuilder(), MeshBuilder(), MeshBuilder()
        f = CONE.frame(t, z)
        # the plate stands a little proud of the beads round it, sunk well through the skin
        plate.lathe(prof([(2.35, -0.6), (2.35, 0.2), (2.15, 0.26), (0.0, 0.26)]), 28, matrix=f)
        for i in range(6):
            a = TAU * (i + 0.5) / 6
            plate.disc(f @ Vector((1.95 * math.cos(a) * IN, 1.95 * math.sin(a) * IN, 0.26 * IN)), CONE.n(t), 0.1 * IN, 0.05 * IN)
        for dx, rad in ((-0.75, 0.78), (1.05, 0.42)):  # the 6 lbf chamber's nozzle and the 1 lbf chamber's
            m = f @ Matrix.Translation((dx * IN, 0, 0))
            pale.lathe(prof([(rad + 0.22, 0.26), (rad + 0.22, 0.42), (rad, 0.42)]), 18, matrix=m)
            dark.lathe(prof([(rad, 0.42), (rad * 0.45, -0.35), (0.0, -0.35)]), 18, matrix=m)
        says = ("Roll thrusters", about)
        thing(plate, f"RollThrusters_{side}_Plate", M["steel"], g, *says)
        thing(pale, f"RollThrusters_{side}_Ports", M["dielectric"], g, *says)
        thing(dark, f"RollThrusters_{side}_Throats", M["nozzle"], g, *says)


def stand(hatch_mid: float, nodes) -> Matrix:
    """Turn the spacecraft about its long axis so that the middle of its hatch is on +X, the side every launch site's
    frame gives the hatch (sites/lc-5.ts). A flight's script builds its capsule in the pilot's frame (his right hand
    at 0 degrees, his feet at 90, his head at 270) and calls this last. The turn is put into the meshes themselves and
    into the placing of whatever has a placing of its own (a needle on its pivot, the seat), so every top-level node
    stays where it was, unturned. Returns the turn, for whatever the script reports in the model's frame."""
    turn = Matrix.Rotation(-hatch_mid, 4, "Z")
    if abs(hatch_mid % TAU) < 1e-9:
        return turn
    bpy.context.view_layer.update()  # (an object's matrix_local is read from the last evaluation: those placed since read as nothing)
    for name in nodes:
        top = bpy.data.objects.get(name)
        if top is None:
            continue
        for child in top.children:
            # a mesh of its own at the node's origin with nothing hung on it is turned in its vertices; anything else in its placing
            plain = child.type == "MESH" and child.matrix_local == Matrix.Identity(4) and not child.children and child.data.users == 1
            if plain and child.find_armature() is None:
                child.data.transform(turn)
            else:
                child.matrix_local = turn @ child.matrix_local
    return turn


SPACECRAFT = ("HeatShield", "Retropack", "Afterbody", "Hatch", "Window", "CrewCabin", "RecoveryCompartment", "AntennaCanister", "EscapeTower")


def roll_thrusters(M, g) -> None:
    """Roll thrusters: a high (6 lbf) and low (1 lbf) pair each way, low on the cone."""
    for side, t0 in (("A", deg(90)), ("B", deg(270))):
        detail, dark = MeshBuilder(), MeshBuilder()
        for dt, rad in ((-0.085, 0.55), (-0.045, 0.3), (0.045, 0.3), (0.085, 0.55)):
            f = CONE.frame(t0 + dt, 4.6, 0.0)
            detail.lathe(prof([(rad + 0.25, -0.2), (rad + 0.25, 0.3), (rad, 0.3)]), 16, matrix=f)
            dark.lathe(prof([(rad, 0.3), (rad * 0.4, -0.3), (0.0, -0.3)]), 16, matrix=f)
        says = (
            "Roll thrusters",
            "Hydrogen peroxide jets that roll the capsule: a 6 lbf and a 1 lbf chamber each way. Placed by judgement, not from a drawing.",
        )
        thing(detail, f"RollThrusters_{side}_Ports", M["steel"], g, *says)
        thing(dark, f"RollThrusters_{side}_Throats", M["nozzle"], g, *says)


def pressure_vessel(M, g, hatch) -> None:
    """The titanium pressure vessel: the aft bulkhead, the wall round the hatch's opening, the small bulkhead, and the
    hatch's sill closing the gap between vessel and outer structure."""
    t_h0, t_h1, hz0, hz1 = hatch
    wide = round(math.degrees(t_h1 - t_h0) / 2.5)
    rv = VESSEL.r
    v = MeshBuilder()
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5), (rv(hz0), hz0)]), 144)  # aft pressure bulkhead + wall
    v.lathe(prof([(rv(hz0), hz0), (rv(hz1), hz1)]), 144 - wide, arc=(t_h1, t_h0 + TAU))
    v.lathe(prof([(rv(hz1), hz1), (rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # small bulkhead
    sill(v, hatch)
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)


def sill(v: MeshBuilder, opening) -> None:
    """An opening's sill: closes the gap between pressure vessel and outer structure round its four sides."""
    t0, t1, z0, z1 = opening
    wide = round(math.degrees(t1 - t0) / 2.5)
    for t in (t0, t1):
        v.grid(lambda u, z: CONE.p(t, z, -0.1) * (1 - u) + VESSEL.p(t, z) * u, (0.0, 1.0), (z0, z1))
    for z in (z0, z1):
        v.grid(lambda t, u: CONE.p(t, z, -0.1) * (1 - u) + VESSEL.p(t, z) * u, [t0 + (t1 - t0) * i / wide for i in range(wide + 1)], (0.0, 1.0))


def wall(mb: MeshBuilder, r, z0: float, z1: float, openings=(), *, flip: bool = False, step: float | None = None) -> None:
    """A wall of revolution, radius r(z) inches, from station z0 to z1, left open where `openings` say: each is
    (angle from, angle to, station from, station to), its angles whole multiples of 2.5 degrees so that the facets of
    one band meet those of the next. `step` cuts it into rings that tall (a cabin's shade is kept at its vertices)."""
    cuts = sorted({z0, z1, *(z for o in openings for z in o[2:] if z0 < z < z1)})
    for za, zb in zip(cuts, cuts[1:]):
        n = max(1, round((zb - za) / step)) if step else 1
        profile = prof([(r(za + (zb - za) * i / n), za + (zb - za) * i / n) for i in range(n + 1)])
        gaps = []
        for o in openings:
            if o[2] <= za and o[3] >= zb:
                a, b = o[0] % TAU, o[1] % TAU or TAU
                gaps.append((a, b if b > a else b + TAU))  # (an opening may lie across the angle nought)
        gaps.sort()
        if not gaps:
            mb.lathe(profile, 144, flip=flip)
            continue
        for (_, a), (b, _) in zip(gaps, gaps[1:] + [(gaps[0][0] + TAU, 0.0)]):
            if b - a > 1e-6:
                mb.lathe(profile, round(math.degrees(b - a) / 2.5), arc=(a, b), flip=flip)


def bulkhead_stiffeners(M, g) -> None:
    ribs = MeshBuilder()
    for i in range(12):  # aft bulkhead stiffeners, seen when the shield is off
        t = TAU * i / 12
        ribs.box((26 * IN, 0.8 * IN, 0.9 * IN), Matrix.Rotation(t, 4, "Z") @ Matrix.Translation((21 * IN, 0, 0.1 * IN)))
    ribs.lathe(prof([(7.5, 0.5), (7.5, -0.4), (6.5, -0.4), (6.5, 0.5)]), 48)
    ribs.build("CrewCabin_BulkheadStiffeners", M["titanium"], g, smooth=False)


def oxygen_and_bag(M, g) -> None:
    """Under the couch and behind the bulkhead: the two oxygen bottles, and the landing bag folded flat."""
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    bottles, bag = MeshBuilder(), MeshBuilder()
    for x, y in ((-10.5, 21.0), (10.5, 21.0)):  # oxygen: two spherical bottles, primary and reserve
        bottles.lathe(prof(arc_profile(0, 0, 3.7, -90, 90, 12)), 24, matrix=Matrix.Translation(P(x, y, 6.2)))
    # the landing bag, folded flat between the heat shield and the bulkhead
    bag.lathe(prof([(21.5, -0.55), (22.0, -0.7), (33.0, -0.7), (33.5, -0.55), (33.0, -0.42), (22.0, -0.42), (21.5, -0.55)]), 96)
    bottles.build("CrewCabin_OxygenBottles", M["bottle"], g)
    bag.build("CrewCabin_LandingBag", M["fabric"], g)


def keep_inside() -> None:
    """Nothing in the cabin may reach the pressure vessel: the clearance check cannot see a boot
    through the hull, because the two surfaces cross instead of lying together."""
    inside = [o.name for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("CrewCabin_Pilot")]
    for name in (*inside, "CrewCabin_OxygenBottles"):
        for v in bpy.data.objects[name].data.vertices:
            x, y, z = (c / IN for c in v.co)
            room = VESSEL.r(z) - math.hypot(x, y)
            assert room > 0.3, f"{name} is {-room:.1f} in outside the pressure vessel at ({x:.1f}, {y:.1f}, {z:.1f}) in"


def build_recovery_compartment(M) -> None:
    g = group("RecoveryCompartment")
    panels, bolts = MeshBuilder(), MeshBuilder()
    shingle_row(panels, bolts, CYL, Z_CYL + 0.3, Z_CAN - 0.3, 12, deg(15), 0, range(12))
    panels.build("Recovery_Shingles", M["beryllium_shingle"], g, sharp_angle=None)
    bolts.build("Recovery_Fasteners", M["bolt"], g)

    s = MeshBuilder()
    rr = NECK_R - 0.1
    s.lathe(prof([(0.0, Z_CYL + 0.2), (rr, Z_CYL + 0.2), (rr, Z_CAN), (0.0, Z_CAN)]), 96)
    s.build("Recovery_Structure", M["underlay"], g, sharp_angle=30)
    chutes = MeshBuilder()  # main and reserve ring-sail canisters, seen with the antenna canister off
    for y in (-6.6, 6.6):
        chutes.lathe(prof([(6.2, Z_CAN), (6.2, Z_CAN + 0.5), (5.6, Z_CAN + 0.8), (0.0, Z_CAN + 0.8)]), 40, matrix=Matrix.Translation((0, y * IN, 0)))
    chutes.build("Recovery_ParachuteCanisters", M["aluminium"], g)
    if interior():  # the packed main and reserve parachutes under those lids
        packs = MeshBuilder()
        for y in (-6.6, 6.6):
            packs.lathe(
                prof([(0.0, Z_CYL + 1.4), (5.6, Z_CYL + 1.4), (5.9, Z_CYL + 3.0), (5.9, Z_CAN - 2.2), (5.2, Z_CAN - 0.6), (0.0, Z_CAN - 0.6)]),
                32,
                matrix=Matrix.Translation((0, y * IN, 0)),
            )
        packs.build("Recovery_ParachutePacks", M["fabric"], g)

    for q in range(4):  # pitch and yaw thrusters: a 24 lbf and a 1 lbf nozzle at each quadrant
        fit, dark = MeshBuilder(), MeshBuilder()
        t = deg(90 * q + 45)
        fit.box((5.0 * IN, 3.2 * IN, 0.9 * IN), CYL.frame(t, Z_CAN - 4.0, -0.2))  # sunk through the skin, proud by 0.25 in
        for dz, rad in ((0.75, 0.8), (-0.85, 0.35)):
            f = CYL.frame(t, Z_CAN - 4.0 + dz, 0.25)
            fit.lathe(prof([(rad + 0.2, 0.0), (rad + 0.2, 0.25), (rad, 0.25)]), 16, matrix=f)
            dark.lathe(prof([(rad, 0.25), (rad * 0.4, -0.2), (0.0, -0.2)]), 16, matrix=f)
        says = (
            "Pitch and yaw thrusters",
            "Hydrogen peroxide jets that pitch and yaw the capsule: a 24 lbf and a 1 lbf chamber at each quadrant. "
            "Placed by judgement, not from a drawing.",
        )
        thing(fit, f"Recovery_Thruster_{q}_Port", M["steel"], g, *says)
        thing(dark, f"Recovery_Thruster_{q}_Throats", M["nozzle"], g, *says)


def can_r(z: float) -> float:
    return CAN_R0 + (CAN_R1 - CAN_R0) * (z - Z_CAN) / CAN_H


def build_antenna_canister(M) -> None:
    g = group("AntennaCanister")
    w0, w1 = Z_CAN + 7.0, Z_CAN + 15.0  # the dielectric window is 8 in (SEDR 104, 2-9)
    lower = [(0.0, Z_CAN + 0.05), (CAN_R0, Z_CAN + 0.05), (can_r(w0), w0)]
    upper = [(can_r(w1), w1), (CAN_R1, Z_CAN_TOP - 0.4), (CAN_R1 - 0.4, Z_CAN_TOP), (0.0, Z_CAN_TOP)]
    mb = MeshBuilder()
    mb.lathe(prof(lower), 96)
    mb.lathe(prof(upper), 96)
    fit = MeshBuilder()
    can = Surf(CAN_R0, Z_CAN, math.atan((CAN_R0 - CAN_R1) / CAN_H))
    for i in range(4):  # supports bridging the bicone antenna's dielectric window
        t = deg(45 + 90 * i)
        fit.box((0.9 * IN, 0.25 * IN, (w1 - w0 + 1.2) * IN), can.frame(t, (w0 + w1) / 2, 0.05) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    for z in (w0 - 0.5, w1 + 0.5):
        for i in range(36):
            t = TAU * i / 36
            fit.disc(can.p(t, z), can.n(t), 0.17 * IN, 0.06 * IN)
    for which, t in (("Roll", deg(0)), ("Pitch", deg(90))):  # roll and pitch infrared horizon scanners
        body, lens = MeshBuilder(), MeshBuilder()
        f = can.frame(t, Z_CAN + 18.5)
        body.lathe(prof([(2.0, -0.4), (2.0, 1.3), (1.5, 1.6), (1.4, 1.3)]), 28, matrix=f)
        lens.lathe(prof([(1.4, 1.3), (0.0, 1.45)]), 28, matrix=f)
        says = (
            f"{which} horizon scanner",
            "An infrared scanner that finds the Earth's edge, to keep the attitude gyros true. There are two: roll and pitch.",
        )
        thing(body, f"Antenna_Scanner_{which}", M["steel"], g, *says)
        thing(lens, f"Antenna_Scanner_{which}_Lens", M["lens"], g, *says, shell=False)
    # top: drogue mortar, and the destabilising flap that keeps the capsule from entering nose-first
    fit.lathe(
        prof([(3.2, Z_CAN_TOP), (3.2, Z_CAN_TOP + 1.2), (2.8, Z_CAN_TOP + 1.2), (2.8, Z_CAN_TOP + 0.2), (0.0, Z_CAN_TOP + 0.2)]),
        32,
        matrix=Matrix.Translation((0, -5.5 * IN, 0)),
    )
    fit.box((9.0 * IN, 6.0 * IN, 0.25 * IN), Matrix.Translation((0, 4.0 * IN, (Z_CAN_TOP + 0.55) * IN)) @ Matrix.Rotation(deg(5), 4, "X"))
    for x in (-4.0, 4.0):
        fit.tube((x * IN - 0.8 * IN, 1.2 * IN, (Z_CAN_TOP + 0.3) * IN), (x * IN + 0.8 * IN, 1.2 * IN, (Z_CAN_TOP + 0.3) * IN), 0.3 * IN, 10)
    mb.build("Antenna_Housing", M["beryllium_shingle"], g, sharp_angle=30)
    window = lathe_obj("Antenna_DielectricWindow", prof([(can_r(w0), w0), (can_r(w1), w1)]), M["dielectric"], g)
    window["label"] = "Antenna window"
    window["about"] = (
        "An 8 in band the radio passes through: behind it is the bicone antenna, two cones point to point, which the canister is named for."
    )
    fit.build("Antenna_Fittings", M["steel"], g)
    if interior():  # the bicone itself: two cones point to point behind the dielectric window
        wm = (w0 + w1) / 2
        cone = MeshBuilder()
        cone.lathe(prof([(can_r(w0) - 0.9, w0 - 0.4), (1.1, wm - 0.25), (1.1, wm + 0.25), (can_r(w1) - 0.9, w1 + 0.4)]), 64)
        cone.lathe(prof([(0.0, Z_CAN + 1.0), (1.0, Z_CAN + 1.0), (1.0, Z_CAN_TOP - 1.0), (0.0, Z_CAN_TOP - 1.0)]), 16)
        cone.build("Antenna_Bicone", M["copper"], g)


def build_escape_tower(M) -> None:
    g = group("EscapeTower")
    ring = [
        (NECK_R + 0.1, Z_CAN - 1.0),
        (NECK_R + 0.75, Z_CAN - 0.6),
        (NECK_R + 0.75, Z_CAN + 1.4),
        (NECK_R - 0.2, Z_CAN + 1.8),
        (CAN_R0 + 0.15, Z_CAN + 1.8),
        (CAN_R0 + 0.15, Z_CAN + 0.1),
    ]
    lathe_obj("Tower_ClampRing", prof(ring), M["steel"], g, sharp_angle=30)

    r_base, r_top = NECK_R + 0.2, 6.5
    legs = [deg(30 + 120 * i) for i in range(3)]

    def node(i: int, z: float) -> Vector:
        r = r_base + (r_top - r_base) * (z - (Z_CAN + 1.8)) / (Z_TRUSS_TOP - (Z_CAN + 1.8))
        return Vector((r * math.cos(legs[i % 3]), r * math.sin(legs[i % 3]), z)) * IN

    truss, steel = MeshBuilder(), MeshBuilder()
    levels = list(TRUSS_BAYS)  # no cross-members until clear of the canister
    for i in range(3):
        truss.tube(node(i, Z_CAN + 1.0), node(i, Z_TRUSS_TOP), 0.8 * IN, 14)
        for z in levels:
            truss.tube(node(i, z), node(i + 1, z), 0.5 * IN, 10)
        for b, (z0, z1) in enumerate(zip(levels, levels[1:])):
            j0, j1 = (i, i + 1) if b % 2 == 0 else (i + 1, i)
            truss.tube(node(j0, z0), node(j1, z1), 0.45 * IN, 10)
        # explosive-bolt housing where each leg meets the clamp ring
        steel.box(
            (3.2 * IN, 2.4 * IN, 3.0 * IN),
            frame(node(i, Z_CAN + 1.2), (math.cos(legs[i]), math.sin(legs[i]), 0)) @ Matrix.Rotation(math.pi / 2, 4, "Y"),
        )
    truss.lathe(
        prof(
            [(0.0, Z_TRUSS_TOP - 0.6), (7.6, Z_TRUSS_TOP - 0.6), (7.6, Z_TRUSS_TOP + 0.6), (5.2, Z_TRUSS_TOP + 0.6), (5.2, Z_MOTOR), (0.0, Z_MOTOR)]
        ),
        48,
    )
    truss.build("Tower_Truss", M["tower"], g, sharp_angle=35)
    steel.build("Tower_BoltHousings", M["steel"], g, smooth=False)

    # escape motor: 52,000 lbf for 0.78 s (SEDR 104) through three nozzles canted 19 degrees off axis
    case = [
        (0.0, Z_MOTOR),
        (7.5, Z_MOTOR),
        (7.5, Z_MOTOR_TOP),
        (7.2, Z_MOTOR_TOP + 1.2),
        (6.2, Z_MOTOR_CAP - 1.2),
        (5.0, Z_MOTOR_CAP),
        (2.2, Z_MOTOR_CAP + 0.6),
        (1.3, Z_MOTOR_CAP + 2.4),
        (0.7, Z_MOTOR_CAP + 3.2),
        (0.7, Z_TOP - 0.4),
        (0.0, Z_TOP),
    ]
    lathe_obj("Tower_EscapeMotor", prof(case), M["tower"], g, segs=64, sharp_angle=30)
    bands = MeshBuilder()
    for z in (Z_MOTOR + 1.0, (Z_MOTOR + Z_MOTOR_TOP) / 2, Z_MOTOR_TOP - 1.0):
        bands.lathe(prof([(7.5, z - 0.6), (7.7, z - 0.4), (7.7, z + 0.4), (7.5, z + 0.6)]), 64)
    bands.build("Tower_MotorBands", M["steel"], g)
    if interior():  # the solid-propellant grain that the case is wrapped round
        grain = MeshBuilder()
        grain.lathe(
            prof([(0.0, Z_MOTOR + 2.0), (6.9, Z_MOTOR + 2.0), (6.9, Z_MOTOR_TOP - 1.0), (5.0, Z_MOTOR_TOP + 2.0), (0.0, Z_MOTOR_TOP + 2.0)]), 40
        )
        grain.build("Tower_PropellantGrain", M["propellant"], g)
    noz, jett = MeshBuilder(), MeshBuilder()
    cant = deg(19)
    for i in range(3):
        t = deg(90 + 120 * i)  # between the legs
        rad = Vector((math.cos(t), math.sin(t), 0))
        origin = (rad * 3.6 + Vector((0, 0, Z_MOTOR + 1.0))) * IN
        axis = rad * math.sin(cant) + Vector((0, 0, -math.cos(cant)))
        noz.lathe(prof([(1.5, 0.0), (1.7, 2.0), (2.7, 5.5), (3.6, 9.0), (4.1, 12.0)]), 32, matrix=frame(origin, axis))
    # tower-jettison motor fires straight down the middle
    jett.lathe(prof([(2.3, Z_MOTOR - 0.2), (2.3, Z_MOTOR - 5.5), (1.2, Z_MOTOR - 6.5), (2.0, Z_MOTOR - 9.0)]), 28)
    thing(
        noz,
        "Tower_EscapeNozzles",
        M["nozzle"],
        g,
        "Escape rocket nozzles",
        "Three nozzles canted 19 degrees outward, so that 52,000 lbf of fire goes past the capsule it is pulling away, not onto it.",
        shell=False,
    )
    thing(
        jett,
        "Tower_JettisonNozzle",
        M["nozzle"],
        g,
        "Tower jettison rocket",
        "Takes the tower away once it is no longer wanted: about 800 lbf for a second and a half. It had three nozzles; the model has one.",
        shell=False,
    )
