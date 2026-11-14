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


def thing(mb: MeshBuilder, name: str, mat, parent, label: str, about: str, shell: bool = True, **kw) -> bpy.types.Object | None:
    if not mb.verts:
        return None
    obj = mb.build(name, mat, parent, **kw)
    obj["label"], obj["about"] = label, about
    if shell:
        THING_SHELLS.append(name)
    return obj


def pivot(name: str, parent, at: Vector, meshes) -> bpy.types.Object:
    """A node of its own at `at` (metres, in the parent's frame) holding meshes that were built in the parent's frame, each
    left where it was built: what a flight turns or slides (its `clocked` moves) has its origin on its hinge."""
    node = group(name, parent)
    node.location = at
    for obj in meshes:
        if obj is not None:
            obj.data.transform(Matrix.Translation(-at))
            obj.parent = node
    return node


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
        # the periscope door's inner pan: insulation under a cloth facing (its colour is ours: no photograph read shows it close to)
        "insulation": m("insulation-cloth", (0.6, 0.56, 0.46), 0.0, 0.92, double_sided=True),
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
        self,
        t0: float,
        t1: float,
        z0: float,
        z1: float,
        stacks: int = 2,
        *,
        panels=None,
        bolts=None,
        fasten: str = "tbl",
        gap: float = GAP,
        beads: int | None = None,
    ) -> None:
        """One shingle between two meridians and two stations: a flat fastened margin round `stacks` stacks of beads
        (0: a plain plate). `fasten`: which edges carry a row of screws, of top, bottom, left (the lower angle), right.
        `gap`: how far it stands in from the lines given, inches: a hatch's shingles stand further from what is round them.
        `beads`: how many beads a stack has, for a shingle whose photographs count them; otherwise as many as go at PITCH."""
        surf = self.surf
        panels, bolts = panels or self.panels, bolts or self.bolts
        rmid = surf.r((z0 + z1) / 2)
        g = gap / rmid
        ta, tb, za, zb = t0 + g, t1 - g, z0 + gap * self.cos, z1 - gap * self.cos
        width, run_ = (tb - ta) * rmid, (zb - za) / self.cos  # inches across at its middle, and along the cone
        detail = srlib.DETAIL
        margin, ramp, strip, end = 1.0, 0.4, 0.55, 1.25
        count = int((run_ - 2 * end) / PITCH) if beads is None else beads
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


# The periscope's door and objective as they moved (SEDR 104, 2-3, 12-2, 12-18, 12-19 and Figure 12-1). Only the
# objective cartridge moves: it "may be extended and retracted through a periscope door opening in the bottom of the
# capsule" by an electric motor and gear box on the lower housing, on roller guides. The door "encloses the periscope
# lower lens flange and the capsule ground checkout umbilical receptacle" and, "mechanically linked to the periscope
# housing, automatically opens and closes with periscope extension and retraction": "a connecting link between the
# objective cartridge and the periscope door allows the door to move in unison with the telescopic motion of the
# objective cartridge". Figure 12-1 draws the door as a pan with a toothed long edge (read here as a piano hinge) and
# the link from the cartridge's lower end to the door's inner face. So the model is one linkage (ScopeWorks): a door on
# a hinge along its long edge, a cartridge that slides out, and a link of fixed length from a lug on the cartridge to
# a clevis on the door, which pushes the door open as the cartridge comes out and draws it shut as it goes in. It is
# built as it stood at liftoff, shut and drawn in; each moving piece is a node with its own motion in its extras
# (`run`: periscope_run), which a flight plays on its clock.
#
# Documented: that there is a link between cartridge and door and that they move as one; that the door is part of the
# capsule's side insulation when shut (SEDR 109-7, 2-18). Estimated, every one: how far the cartridge travels, where
# the hinge, the lug and the clevis are, the link's length, and so how far the door opens (it comes out at 97 degrees
# on No. 7 and 109 on No. 11: the photographs of it open show it standing a little past square).
SCOPE_OUT = 5.65  # how far the objective comes out along its tube, in: from wholly under the shut door (its lens's dome is 4.8 in up the
# cartridge) to standing out; chosen so that drawn in on either capsule no flat of it lies along a skin, the well's floor or an end of
# the cabin's tube (estimated)
SCOPE_RIM = 3.65  # the lens cell's rim, in up the cartridge from where its node is
SCOPE_BODY = 2.1  # the cartridge's body, radius; its lens cell is 2.3 (Figure 12-4 draws a cylinder ending in a wider flanged cell)
SCOPE_DOOR_JOINT = 0.15  # the joint round the shut door, in: estimated
SCOPE_DOOR_THICK = 0.22  # the door's leaf, in: estimated
SCOPE_DOOR_PAN = (
    0.45  # the floor of the door's inner pan, in under the skin: its insulation (estimated; it shuts just clear of the umbilical's receptacle)
)
SCOPE_HINGE_JOINT = 0.3  # the joint on the door's hinged side, in: wider than the rest, with the hinge's barrel in it
SCOPE_HINGE = (0.14, 0.03, 0.07)  # the hinge: its line's distance from the leaf's edge and under the skin, and its barrel's radius, in
SCOPE_MOUTH = 3.0  # the opening in the well's floor that the cartridge and its link come up through, radius
SCOPE_SLEEVE = 2.72  # the lower housing's bore under it, radius
LINK_CLEVIS = (3.0, 0.75)  # the door's clevis: in from the hinge along the door, and under the skin
LINK_ALONG = 0.0  # and along the hinge from the lug as it stands drawn in, in: level with it, so that the link comes up inside the housing's mouth
LINK_LUG = (2.45, 2.8, math.radians(70.0))  # the cartridge's lug: in from its axis, under the lens's rim, and round from the side toward the hinge
SCOPE_STEPS = 16  # how many steps the motion is written in (periscope_run)
SCOPE_RAMP = 0.12  # how much of the motion the motor takes to come up to speed, and to stop
UMBILICAL_SUNK = 0.95  # how far the receptacle sits under the skin, in, so that the door shuts over it (SEDR 104, 2-3: the door encloses it)


def scope_axis(station: float, toward) -> tuple[Vector, Vector]:
    """The line the objective comes out along: the last run of the periscope's tube in the cabin, which ends at the
    pressure vessel at `station` (mercury_cabin.periscope's foot, 0.6 in inside it) and comes from `toward` (inches, the
    pilot's frame: that tube's last bend). Returns where the line comes through the skin (inches) and its direction out.
    Drawn in, the objective is inside that tube, where the cabin has its cartridge."""
    foot = VESSEL.p(deg(90), station, -0.6) / IN
    d = (foot - Vector(toward)).normalized()
    # (in the meridian at 90 degrees, x = 0: the skin is where y is the cone's radius at that height)
    s = (CONE.r0 - foot.y - (foot.z - CONE.z0) * math.tan(CONE.a)) / (d.y + d.z * math.tan(CONE.a))
    return foot + d * s, d


class ScopeWorks:
    """The periscope's door, cartridge and link as one linkage, in inches in the pilot's frame. `door` is the opening
    (angle from, angle to, station from, to); `station` and `toward` are the periscope's tube in the cabin (scope_axis)."""

    def __init__(self, door, station: float, toward) -> None:
        t0, t1, z0, z1 = door
        self.door = door
        zm = (z0 + z1) / 2
        ta = self.ta = t0 + SCOPE_HINGE_JOINT / CONE.r(zm)
        # the door's own directions at its hinged edge: across it from the hinge, along the hinge toward the nose, out of the skin
        self.w = Vector((-math.sin(ta), math.cos(ta), 0.0))
        self.h = Vector((-math.sin(CONE.a) * math.cos(ta), -math.sin(CONE.a) * math.sin(ta), math.cos(CONE.a)))
        self.n = CONE.n(ta)
        self.edge = CONE.p(ta, zm) / IN  # the middle of the hinged edge, on the skin
        self.hinge = self.edge - self.w * SCOPE_HINGE[0] - self.n * SCOPE_HINGE[1]  # and of the hinge pin's line, in the joint beside it
        self.at, self.out = scope_axis(station, toward)
        toward_hinge = (-self.w - self.out * (-self.w).dot(self.out)).normalized()
        r, down, turn = LINK_LUG
        radial = toward_hinge * math.cos(turn) + self.out.cross(toward_hinge) * math.sin(turn)
        self.lug = self.at + self.out * (SCOPE_RIM - SCOPE_OUT) + radial * r - self.out * down  # drawn in
        b, c = LINK_CLEVIS
        z_clevis = zm + ((self.lug - self.edge).dot(self.h) + LINK_ALONG) * math.cos(CONE.a)
        self.clevis_at = (ta + b / CONE.r(z_clevis), z_clevis)  # (angle, station) on the cone: the door is curved as the cone is
        self.clevis = CONE.p(*self.clevis_at, -c) / IN  # shut
        self.length = (self.clevis - self.lug).length
        # the motion: at each step how far out the cartridge is (the motor comes up to speed, runs, and stops) and
        # how far open that has pushed the door
        self.table: list[tuple[float, float]] = []
        theta = 0.0
        for i in range(SCOPE_STEPS + 1):
            d = SCOPE_OUT * self.ramp(i / SCOPE_STEPS)
            theta = self.opened(d, theta)
            self.table.append((d, theta))

    @staticmethod
    def ramp(k: float) -> float:
        """How far through its travel a motor is, `k` of the way through its time: a constant speed, reached and left over SCOPE_RAMP of the time."""
        r = SCOPE_RAMP
        if k < r:
            return k * k / (2 * r * (1 - r))
        if k > 1 - r:
            return 1 - (1 - k) ** 2 / (2 * r * (1 - r))
        return (k - r / 2) / (1 - r)

    def swung(self, theta: float) -> Matrix:
        """The door swung open by `theta` about its hinge pin (inches)."""
        return Matrix.Translation(self.hinge) @ Matrix.Rotation(-theta, 4, self.h) @ Matrix.Translation(-self.hinge)

    def opened(self, d: float, least: float = 0.0) -> float:
        """How far open the door is with the cartridge `d` inches out: the first angle at or past `least` at which the
        link, from the lug where it now is to the clevis where the door then has it, is its own length."""
        lug = self.lug + self.out * d
        miss = lambda theta: ((self.swung(theta) @ self.clevis) - lug).length - self.length  # noqa: E731
        a, fa = least, miss(least)
        if abs(fa) < 1e-9:
            return least
        for i in range(1, 241):
            b = least + math.radians(0.25) * i
            fb = miss(b)
            if fa * fb <= 0:
                for _ in range(50):
                    mid = (a + b) / 2
                    if fa * miss(mid) <= 0:
                        b = mid
                    else:
                        a, fa = mid, miss(mid)
                return (a + b) / 2
            a, fa = b, fb
        raise ValueError(f"the periscope's link jams with the cartridge {d:.2f} in out")

    def motions(self, k: int) -> dict[str, Matrix]:
        """How each piece has moved from where it was built at step `k`: metres, in the pilot's frame."""
        d, theta = self.table[k]
        metres = lambda m: Matrix.Translation(m.translation * IN) @ m.to_3x3().to_4x4()  # noqa: E731
        lug = self.lug + self.out * d
        clevis = self.swung(theta) @ self.clevis
        turn = (self.clevis - self.lug).rotation_difference(clevis - lug).to_matrix().to_4x4()
        link = Matrix.Translation(lug) @ turn @ Matrix.Translation(-self.lug)
        return {
            "Periscope_Objective": Matrix.Translation(self.out * (d * IN)),
            "Periscope_Door": metres(self.swung(theta)),
            "Periscope_Link": metres(link),
        }


def periscope_run(works: ScopeWorks, turn: Matrix) -> None:
    """Write each moving piece's motion into its node's extras (`run`), for the viewer to play (types.ts: Move, `run`):
    seven figures a step, how far it has moved (x, y, z, metres) and how it has turned (a quaternion x, y, z, w), in
    its parent's frame as the file has it (+Y up) and from where it was built. Called once the capsule stands as it
    will (`turn`: what mercury_capsule.stand gave it), since a node's parent may have been turned with it. The link is
    the cartridge's child: its motion is what is left once the cartridge's own is taken off."""
    bpy.context.view_layer.update()
    back = turn.inverted()
    for name, carried_by in (("Periscope_Objective", None), ("Periscope_Door", None), ("Periscope_Link", "Periscope_Objective")):
        node = bpy.data.objects[name]
        parent, placed = node.parent.matrix_world.copy(), node.matrix_local.translation.copy()
        run: list[float] = []
        for k in range(SCOPE_STEPS + 1):
            moved = works.motions(k)
            carried = turn @ moved[carried_by] @ back if carried_by else Matrix.Identity(4)
            local = parent.inverted() @ carried.inverted() @ (turn @ moved[name] @ back) @ parent
            by = local.to_3x3() @ placed + local.translation - placed
            q = local.to_quaternion()
            run += [round(v, 6) + 0.0 for v in (by.x, by.z, -by.y, q.x, q.z, -q.y, q.w)]  # (+ 0.0: no minus nought)
        node["run"] = run
    print(
        f"periscope: the cartridge comes out {SCOPE_OUT:.2f} in and its link, {works.length:.2f} in long, "
        f"opens the door {math.degrees(works.table[-1][1]):.1f} degrees ({math.degrees(works.table[SCOPE_STEPS // 2][1]):.0f} half way through)"
    )


def periscope_mouth(names, works: ScopeWorks) -> None:
    """Cut the lower housing's way through the named skins (the pressure vessel, and the lining where there is one):
    the cartridge and its link come up through it."""
    # (square to the wall, as the well's own floor is cut, and as wide: a hole cut along the cartridge's leaning line
    # would have its rim drawn off the wall's own surface)
    up = CONE.n(deg(90))
    middle = works.at - works.out * ((WALL + 0.06) / works.out.dot(up))
    srlib.bore(names, frame(middle * IN, up), SCOPE_MOUTH * IN, 0.3 * IN)


def chamfered(mb: MeshBuilder, size, matrix: Matrix, bevel: float = 0.08) -> None:
    """A block with every edge chamfered (inches, like its size; `matrix` in metres): a case, a fitting, a dog. A plain
    box has no edge to catch the light and is a flat shape close to; this has one along every side."""
    h = [s_ / 2 for s_ in size]
    b = min(bevel, *(0.45 * e for e in h))
    verts: list = []
    faces: list = []

    def face(pts, out: bool) -> None:
        faces.append(tuple(range(len(verts), len(verts) + len(pts))))
        verts.extend(tuple(matrix @ (Vector(p) * IN)) for p in (pts if out else pts[::-1]))

    def point(axis: int, va: float, u: int, vu: float, w: int, vw: float) -> list[float]:
        p = [0.0, 0.0, 0.0]
        p[axis], p[u], p[w] = va, vu, vw
        return p

    for axis in range(3):
        u, w = (axis + 1) % 3, (axis + 2) % 3
        for s_ in (1, -1):  # a face, inset by the chamfer
            face([point(axis, s_ * h[axis], u, su * (h[u] - b), w, sw * (h[w] - b)) for su, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1))], s_ > 0)
        for su in (1, -1):  # an edge along this axis: the chamfer between the two faces that meet at it
            for sw in (1, -1):
                quad = [
                    point(axis, -(h[axis] - b), u, su * h[u], w, sw * (h[w] - b)),
                    point(axis, h[axis] - b, u, su * h[u], w, sw * (h[w] - b)),
                    point(axis, h[axis] - b, u, su * (h[u] - b), w, sw * h[w]),
                    point(axis, -(h[axis] - b), u, su * (h[u] - b), w, sw * h[w]),
                ]
                face(quad, su * sw < 0)
    for sx in (1, -1):  # a corner: the triangle between three chamfers
        for sy in (1, -1):
            for sz in (1, -1):
                tri = [
                    (sx * h[0], sy * (h[1] - b), sz * (h[2] - b)),
                    (sx * (h[0] - b), sy * h[1], sz * (h[2] - b)),
                    (sx * (h[0] - b), sy * (h[1] - b), sz * h[2]),
                ]
                face(tri, sx * sy * sz > 0)
    mb.add(verts, faces)


def periscope(M, g, works: ScopeWorks, about: str) -> None:
    """The periscope's objective cartridge, under the pilot's feet (the side that faces the Earth with him head up). The
    same instrument as the screen on the panel (mercury_cabin): the lens here in its flanged cell, a body behind it with
    its stop and a mirror at the bottom, where the light turns up the tube toward the screen. Built drawn in, SCOPE_OUT
    inside where it stands when put out, on a node of its own (`Periscope_Objective`, at the lens's place on the skin)
    that a flight slides out along the tube; and on a node of that one (`Periscope_Link`, its origin on the lug's pin)
    the link to the door. `about` is what the flight says of it."""
    detail, glass, void, bore, mirror, link = (MeshBuilder() for _ in range(6))
    at, out = works.at, works.out
    f = frame((at - out * SCOPE_OUT) * IN, out)
    # the cartridge: a body long enough to stand in the lower housing's bore when it is out, and its lens cell, wider,
    # with the ring that holds the lens (drawn in, it is inside the cabin's tube, clear of the frames)
    body = [(0.0, -2.6), (SCOPE_BODY, -2.6), (SCOPE_BODY, 3.15), (2.3, 3.3), (2.3, SCOPE_RIM), (2.05, 3.95), (1.9, 3.95), (1.9, 3.55)]
    detail.lathe(prof(body), 32, matrix=f)
    for z in (-1.4, 2.4):  # the bands its roller guides run on (SEDR 104, Figure 12-1 sheet 2: "roller guide"): two is ours
        detail.lathe(
            prof([(SCOPE_BODY - 0.02, z - 0.27), (SCOPE_BODY + 0.07, z - 0.18), (SCOPE_BODY + 0.07, z + 0.18), (SCOPE_BODY - 0.02, z + 0.27)]),
            32,
            matrix=f,
        )
    glass.lathe(prof(arc_profile(0, 2.55, 2.25, 58, 90, 8)[::-1]), 32, matrix=f)  # the objective: a domed front element, 0.3 in proud at its middle
    if interior():
        glass.lathe(prof([(1.35, 2.3), (0.0, 2.42)]), 24, matrix=f)  # a second element down the barrel
        bore.lathe(prof([(1.7, 3.5), (1.7, 2.25), (1.4, 2.25), (1.4, 0.5), (0.0, 0.5)]), 32, matrix=f)  # the barrel, stopped down, blacked inside
        # (1.7 in round: drawn in, it is inside the cabin's tube, whose run there is 1.9)
        tilt = f @ Matrix.Translation((0, 0, 1.15 * IN)) @ Matrix.Rotation(deg(40), 4, "X")
        mirror.lathe(prof([(1.15, 0.0), (0.0, 0.0)]), 24, matrix=tilt)  # the mirror that turns the light up the tube
    else:
        void.lathe(prof([(1.9, 3.2), (0.0, 3.2)]), 32, matrix=f)
    # the lug the link is pinned to: a stud standing out of the cartridge's side, a boss at its root and a head on its end
    foot = at - out * SCOPE_OUT
    on_axis = foot + out * out.dot(works.lug - foot)
    radial = (works.lug - on_axis).normalized()
    reach = (works.lug - on_axis).length
    stud = frame(on_axis * IN, radial)
    detail.lathe(
        prof(
            [
                (0.3, SCOPE_BODY - 0.1),
                (0.3, reach - 0.2),
                (0.1, reach - 0.14),
                (0.1, reach + 0.12),
                (0.16, reach + 0.14),
                (0.16, reach + 0.2),
                (0.0, reach + 0.2),
            ]
        ),
        12,
        matrix=stud,
    )
    says = ("Periscope", about)
    built = (
        thing(detail, "Periscope_Cartridge", M["steel"], g, *says),
        thing(glass, "Periscope_Lens", M["lens_glass"], g, *says),
        thing(bore, "Periscope_Barrel", M["nozzle"], g, *says),
        thing(mirror, "Periscope_Mirror", M["strap"], g, *says),
        thing(void, "Periscope_Void", M["void"], g, *says),
    )
    node = pivot("Periscope_Objective", g, at * IN, built)
    # the link: a flat bar with an eye at each end, from the lug's pin to the door's clevis, between the clevis's cheeks
    along = works.clevis - works.lug
    x = along.normalized()
    z = (works.h - x * works.h.dot(x)).normalized()
    bar = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    bar.translation = ((works.lug + works.clevis) / 2 - at) * IN  # (in the cartridge's node's own frame)
    chamfered(link, (works.length + 0.4, 0.3, 0.14), bar, 0.05)
    says = (
        "Periscope door link",
        "The link from the periscope's cartridge to its door: as the cartridge comes out it pushes the door open, and draws it shut going in.",
    )
    pivot("Periscope_Link", node, (works.lug - at) * IN, (thing(link, "Periscope_LinkBar", M["steel"], g, *says, shell=False),))


def umbilical_receptacle(M, g, at: tuple[float, float], about: str, sunk: float = 0.0) -> None:
    """Where the ground's umbilical was plugged in: `at` is (angle round the cone, station); `sunk`, inches under the skin."""
    detail = MeshBuilder()
    f = CONE.frame(*at, -sunk)
    detail.lathe(prof([(2.6, -0.3), (2.6, 0.45), (2.1, 0.45), (2.0, 0.25), (0.0, 0.25)]), 32, matrix=f)
    thing(detail, "Umbilical_Receptacle", M["steel"], g, "Umbilical receptacle", about)


def periscope_door(M, g, skin: Skin, door, scope_z: float, umbilical_z: float, about: str, umbilical_about: str, toward) -> ScopeWorks:
    """The periscope's door and its objective, with the umbilical's receptacle under the lens in the same opening, where
    the photographs have them (capsule 11: NASA S61-03705, on the pad, and as raised in 1999; capsule 7 as kept:
    NASM2021-00165). Built as the capsule stood at liftoff: the door shut flush with the plate round it, the objective
    drawn in under it (they were from the umbilical's release at T-35 s until separation: SEDR 104, 12-2; MR-3
    Postlaunch Report, 10.7.2). The door is a node of its own with its origin on its hinge pin (`Periscope_Door`), on
    the side toward the hatch; the objective another (`Periscope_Objective`), and the link between them a third
    (`Periscope_Link`): each carries its motion (periscope_run), which the flight plays on its clock (flight.ts,
    `clocked`). `door` is the opening: (angle from, angle to, station from, to); `scope_z` and `toward` are the
    periscope's tube in the cabin (scope_axis). Returns the linkage, for the flight's build to finish (periscope_mouth,
    periscope_run)."""
    works = ScopeWorks(door, scope_z, toward)
    t0, t1, z0, z1 = door
    well, leaf, liner, pad, fit, fit_door, bolts, sleeve, hinge = (MeshBuilder() for _ in range(9))
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
    # The lower housing's mouth in the well's floor, where the cartridge and its link come up: an opening square to the
    # floor (the cartridge leans in it), a lip round it, and under it the housing's bore, dark, down the cartridge's line.
    up = CONE.n(deg(90))
    mouth = works.at - works.out * (deep / works.out.dot(up))
    srlib.bore(("Periscope_Well",), frame(mouth * IN, up), SCOPE_MOUTH * IN, 0.5 * IN)
    inner = SCOPE_MOUTH - 0.06  # (over the floor's cut edge)
    lip = [(inner + 0.39, None), (inner + 0.39, 0.06), (inner + 0.33, 0.12), (inner + 0.06, 0.12), (inner, 0.06), (inner, None)]
    l1, l2, _ = srlib.basis(up)

    def lip_at(i: float, j: float) -> Vector:
        r, rise = lip[int(j)]
        p = mouth + (l1 * math.cos(TAU * i / 48) + l2 * math.sin(TAU * i / 48)) * r
        if rise is None:  # (its foot on the floor, which is the cone's curve and not flat: a twentieth of an inch into it)
            lo, hi = -1.0, 0.5
            for _ in range(40):
                mid = (lo + hi) / 2
                q = p + up * mid
                under = (CONE.r(q.z) - math.hypot(q.x, q.y)) * math.cos(CONE.a) > deep + 0.05
                lo, hi = (mid, hi) if under else (lo, mid)
            rise = lo
        return (p + up * rise) * IN

    fit.grid(lip_at, range(48), range(len(lip)), closed_u=True)
    t1_, t2_, _ = srlib.basis(works.out)
    n_s = 32

    def bore_at(i: float, j: float) -> Vector:
        a = TAU * i / n_s
        radial = (t1_ * math.cos(a) + t2_ * math.sin(a)) * SCOPE_SLEEVE
        if j == 2:
            return (works.at - works.out * 8.4) * IN
        # (its upper edge on the floor's own plane, a little under it; its foot 8.4 in down the line, closed)
        s = -8.4 if j == 1 else (-(deep + 0.06) - radial.dot(up)) / works.out.dot(up)
        return (works.at + radial + works.out * s) * IN

    sleeve.grid(bore_at, range(n_s), (0, 1, 2), closed_u=True)
    periscope(M, g, works, about)
    umbilical_receptacle(M, g, (deg(90), umbilical_z), umbilical_about, sunk=UMBILICAL_SUNK)
    # the door, shut: a leaf on the cone's own curve, its outer face level with the plate round it and a joint all round;
    # dark outside like the shingles and pale inside, as the photographs of it open show
    j, thick, pan = SCOPE_DOOR_JOINT, SCOPE_DOOR_THICK, SCOPE_DOOR_PAN
    ta, tb = works.ta, t1 - j / CONE.r(mid[1])
    za, zb = z0 + j * math.cos(CONE.a), z1 - j * math.cos(CONE.a)
    n = max(2, math.ceil(math.degrees(tb - ta) / 4.0))  # (no facet turns more than four degrees round the cone)
    ts = [ta + (tb - ta) * i / n for i in range(n + 1)]
    leaf.grid(lambda t, z: CONE.p(t, z), ts, (za, zb))
    leaf.grid(lambda t, o: CONE.p(t, za, o), ts, (-thick, 0.0))  # its foot
    leaf.grid(lambda t, o: CONE.p(t, zb, o), ts, (0.0, -thick))  # its head
    leaf.grid(lambda z, o: CONE.p(ta, z, o), (za, zb), (0.0, -thick))  # the hinged edge
    leaf.grid(lambda z, o: CONE.p(tb, z, o), (za, zb), (-thick, 0.0))  # the free edge
    liner.grid(lambda t, z: CONE.p(t, z, -thick), ts, (za, zb), flip=True)
    # Its inner pan: "the periscope door forms a part of the capsule side insulation when it is closed" (SEDR 109-7,
    # 2-18), and Figure 12-1 draws a pan stepped in from the leaf's edge. Set well in from the hinge, where the
    # cartridge's rim comes up under it as it opens.
    # It stops short of the umbilical's receptacle, which stands higher than the pan's floor at its sides (the pan is
    # the cone's curve and the receptacle is flat).
    rm = CONE.r(mid[1])
    pa, pb = ta + 1.3 / rm, tb - 0.45 / rm
    qa, qb = umbilical_z + (2.6 + 0.45) * math.cos(CONE.a), zb - 0.5
    ps = [pa + (pb - pa) * i / n for i in range(n + 1)]
    pad.grid(lambda t, z: CONE.p(t, z, -pan), ps, (qa, qb), flip=True)
    pad.grid(lambda t, o: CONE.p(t, qa, o), ps, (-pan, -thick))
    pad.grid(lambda t, o: CONE.p(t, qb, o), ps, (-thick, -pan))
    pad.grid(lambda z, o: CONE.p(pa, z, o), (qa, qb), (-thick, -pan))
    pad.grid(lambda z, o: CONE.p(pb, z, o), (qa, qb), (-pan, -thick))
    # (held down by a strap across it at each third, as a blanket is: ours)
    for k in (1, 2):
        zk = qa + (qb - qa) * k / 3
        fit_door.grid(lambda t, z: CONE.p(t, z, -pan - 0.045), ps, (zk - 0.22, zk + 0.22), flip=True)
    # the clevis the link is pinned in, hung from the pan: two cheeks and a pin along the hinge
    ct, cz = works.clevis_at
    c_n, c_w = CONE.n(ct), Vector((-math.sin(ct), math.cos(ct), 0.0))
    c_h = c_n.cross(c_w)
    for side in (-0.2, 0.2):
        cheek = Matrix((c_w, c_h, c_n)).transposed().to_4x4()
        cheek.translation = (works.clevis + c_h * side + c_n * 0.085) * IN
        chamfered(fit_door, (0.56, 0.16, 0.57), cheek, 0.05)
    fit_door.tube((works.clevis - c_h * 0.34) * IN, (works.clevis + c_h * 0.34) * IN, 0.09 * IN, 10)
    # The hinge, along the leaf's long edge toward the hatch (Figure 12-1 draws that edge toothed): a pin's line a tenth
    # of an inch under the skin, its knuckles the door's and the frame's by turns.
    half = (zb - za) / math.cos(CONE.a) / 2 - 0.35
    count = 2 * round(half / 0.9) + 1
    span = 2 * half / count
    for k in range(count):
        a, b = works.hinge + works.h * (-half + span * k + 0.05), works.hinge + works.h * (-half + span * (k + 1) - 0.05)
        (fit_door if k % 2 else hinge).tube(a * IN, b * IN, SCOPE_HINGE[2] * IN, 10)
    # screws through the leaf into the pan's frame, along both long edges (their number is ours)
    for k in range(6):
        z = qa + (qb - qa) * (k + 0.5) / 6
        for t in (pa + 0.35 / rm, pb - 0.35 / rm):
            skin.screw(bolts, t, z)
    says = (
        "Periscope door",
        "The door the periscope's objective was put out through, with the umbilical's socket under it. A link from the periscope's cartridge "
        "pushed it open as the cartridge came out and drew it shut as it went in: open on the pad until the umbilical was released 35 seconds "
        "before liftoff, shut for the climb, open from separation, shut for the entry and open again under the drogue.",
    )
    thing(fit, "Periscope_Mouth", M["steel"], g, "Periscope", about, shell=False)
    thing(sleeve, "Periscope_Housing", M["underlay"], g, "Periscope", about, shell=False, sharp_angle=40)
    thing(hinge, "Periscope_Hinge", M["steel"], g, *says, shell=False)
    built = (
        thing(leaf, "Periscope_DoorLeaf", M["shingle"], g, *says, shell=False, sharp_angle=40),  # (curved as the plate round it is; its edges sharp)
        thing(liner, "Periscope_DoorLiner", M["paint_white"], g, *says, shell=False, sharp_angle=40),
        thing(pad, "Periscope_DoorPan", M["insulation"], g, *says, shell=False, sharp_angle=40),
        thing(fit_door, "Periscope_DoorFittings", M["steel"], g, *says, shell=False),
        thing(bolts, "Periscope_DoorScrews", M["bolt"], g, *says, shell=False),
    )
    # (its origin on the hinge pin's line, at the middle of the leaf's edge on the hatch's side)
    pivot("Periscope_Door", g, works.hinge * IN, built)
    return works


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
