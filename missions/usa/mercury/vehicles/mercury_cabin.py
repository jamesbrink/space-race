"""The inside of a Mercury spacecraft: lining and frames, the couch, the instrument panel and its
consoles, the periscope, the pilot's controls, and what is stowed round him.

Not run by itself: a flight's model/vehicle.py calls build() with its own pressure vessel and the
fit of its own capsule. CAPSULE_7 is spacecraft No. 7's (Freedom 7, MR-3): the panel of the
Postlaunch Report's Figure 3.1-2, two portholes, a periscope, no Earth-path indicator. A later
capsule gives its own fit; nothing here is the orbital capsule's.

Dimensions are inches. The panel's layout is measured off the report's figure in the figure's own
pixels (FIG, below) and scaled once; the flight's spacecraft.md ("Cabin") says what each number rests on. Faces and
lettering are drawn here, into three images, by the same script that builds the metal.

A panel is laid out in its own frame: u to the pilot's right, v toward his head, w toward him.
What the viewer moves is its own node with its origin on its pivot and, in its extras, how it
reads (see `gauge`): `turn` a needle's scale as value, angle pairs (radians about the face's
normal, anticlockwise positive as the pilot sees it), `slide` value, metres pairs along its own
X, `drum` the digits on a counter's wheel.
"""

from __future__ import annotations

import math

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

import mercury_capsule
from srlib import IN, TAU, MeshBuilder, Surf, frame, interior, material, prof

# ------------------------------------------------------------------ the fit of capsule 7

# The Postlaunch Report's Figure 3.1-2 as scanned at 2228 px across and read at 2000: the main
# panel is 990 px wide there and the periscope's display is centred at (1321, 1150).
FIG_W = 990.0
FIG_C = (1321.0, 1150.0)
# 27 in: derived. The periscope's display is 8 in across (Hammack and Heberlig, p. 5) and its
# glass is 0.28 to 0.31 of the panel's width in the figure, which makes the panel 26 to 28.6 in.
PANEL_W = 27.0
S = PANEL_W / FIG_W  # inches to a pixel of the figure


def fig(px: float, py: float) -> tuple[float, float]:
    """A point of Figure 3.1-2, in panel inches from the middle of the periscope's display."""
    return ((px - FIG_C[0]) * S, (FIG_C[1] - py) * S)


# Where the panel stands in the capsule: the middle of the periscope's display, (x, y, station), and how far the
# panel leans, its top toward the nose and its face toward the pilot's eyes. Estimated: nothing read dimensions it.
# It is put square to the line from the model pilot's eyes and 23 in along it ("two feet in front of him", This New
# Ocean, p. 355), which with him on his back means over his lap, leaning 55 degrees: the cone cuts its top corners
# and its foot comes down between his chest and his knees, as the periscope's does in the flown capsule.
PANEL_AT = (0.0, -5.1, 26.6)
PANEL_TILT = math.radians(55.0)
STRIP_CANT = math.radians(30.0)  # the telelight strip, turned toward the pilot from the main panel: estimated
CONSOLE_CANT = math.radians(58.0)  # the left console beyond it: estimated
FUSE_AT = (-22.0, 3.0, 21.0)  # the fuse panel's upper edge on the left wall, (x, y, station): estimated
STRIP_DROP, CONSOLE_DROP = 3.5, 8.0  # how far down the panel the strip and the console hang, inches: estimated
SCREEN_R = 4.0  # the periscope's 8 in display: documented (Hammack and Heberlig, p. 5)
SCOPE_RECESS = 1.2  # how far its display sits behind the panel: estimated (NASM2021-00147)

PAINT = (0.52, 0.53, 0.52)  # the panels' and the wall's light grey, as the flown capsule's is (sRGB): estimated
INK = (0.07, 0.07, 0.07)
WHITE = (0.93, 0.93, 0.90)
BLACK = (0.035, 0.035, 0.04)

# ------------------------------------------------------------------ drawing

_font = None
_CAP = 0.716  # Arial's capital height in ems
_masks: dict[tuple[str, int], tuple[np.ndarray, float, float]] = {}


def _outline(body: str) -> tuple[np.ndarray, np.ndarray]:
    """A line of text as triangles, in ems, the baseline's left end at the origin."""
    curve = bpy.data.curves.new("txt", "FONT")
    curve.body = body
    curve.size = 1.0
    curve.resolution_u = 2
    if _font is not None:
        curve.font = _font
    obj = bpy.data.objects.new("txt", curve)
    bpy.context.scene.collection.objects.link(obj)
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh.calc_loop_triangles()
    verts = np.array([(v.co.x, v.co.y) for v in mesh.vertices], dtype=np.float64).reshape(-1, 2)
    tris = np.array([t.vertices[:] for t in mesh.loop_triangles], dtype=np.int64).reshape(-1, 3)
    bpy.data.objects.remove(obj)
    bpy.data.curves.remove(curve)
    bpy.data.meshes.remove(mesh)
    return verts, tris


def _mask(body: str, cap_px: float) -> tuple[np.ndarray, float, float]:
    """Text as coverage, 0 to 1, with where its lower-left pixel lies from the baseline's left end."""
    key = (body, round(cap_px * 8))
    if key in _masks:
        return _masks[key]
    verts, tris = _outline(body)
    ss = 3
    if not len(tris):
        out = (np.zeros((1, 1), np.float32), 0.0, 0.0)
        _masks[key] = out
        return out
    pts = verts * (cap_px / _CAP) * ss
    lo = np.floor(pts.min(axis=0)) - ss
    pts = pts - lo
    w = int(math.ceil(pts[:, 0].max() / ss) + 1) * ss
    h = int(math.ceil(pts[:, 1].max() / ss) + 1) * ss
    cover = np.zeros((h, w), bool)
    for a, b, c in pts[tris]:
        x0, x1 = int(max(0, math.floor(min(a[0], b[0], c[0])))), int(min(w, math.ceil(max(a[0], b[0], c[0])) + 1))
        y0, y1 = int(max(0, math.floor(min(a[1], b[1], c[1])))), int(min(h, math.ceil(max(a[1], b[1], c[1])) + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        xx, yy = xx + 0.5, yy + 0.5
        e0 = (b[0] - a[0]) * (yy - a[1]) - (b[1] - a[1]) * (xx - a[0])
        e1 = (c[0] - b[0]) * (yy - b[1]) - (c[1] - b[1]) * (xx - b[0])
        e2 = (a[0] - c[0]) * (yy - c[1]) - (a[1] - c[1]) * (xx - c[0])
        cover[y0:y1, x0:x1] |= ((e0 >= 0) & (e1 >= 0) & (e2 >= 0)) | ((e0 <= 0) & (e1 <= 0) & (e2 <= 0))
    alpha = cover.reshape(h // ss, ss, w // ss, ss).mean(axis=(1, 3)).astype(np.float32)
    out = (alpha, lo[0] / ss, lo[1] / ss)
    _masks[key] = out
    return out


class Sheet:
    """One image the cabin's faces and lettering are drawn into. Row 0 is the bottom."""

    def __init__(self, name: str, size: int, base=PAINT) -> None:
        self.name, self.size = name, size
        self.px = np.empty((size, size, 3), np.float32)
        self.px[:] = base
        self.shelf = [0, 0, 0]  # x, y, height of the row being filled

    def take(self, w_in: float, h_in: float, ppi: float, u0: float = 0.0, v0: float = 0.0, at: tuple[int, int] | None = None) -> Region:
        """Room for a drawing w by h inches, whose lower-left corner is (u0, v0) in its own coordinates:
        the next place along the shelf, or `at` (pixels) where the caller has laid the sheet out itself."""
        # (layouts are written for a sheet 2048 px across: a larger one is the same layout, finer)
        k = self.size / 2048
        ppi *= k
        w, h = int(math.ceil(w_in * ppi)) + 4, int(math.ceil(h_in * ppi)) + 4
        if at:
            at = (round(at[0] * k), round(at[1] * k))
            assert at[0] + w <= self.size and at[1] + h <= self.size, f"{self.name}: no room for {w} x {h} px at {at}"
            return Region(self, at[0] + 2, at[1] + 2, ppi, u0, v0)
        x, y, row = self.shelf
        if x + w > self.size:
            x, y, row = 0, y + row, 0
        assert y + h <= self.size, f"{self.name}: no room for {w} x {h} px"
        self.shelf = [x + w, y, max(row, h)]
        return Region(self, x + 2, y + 2, ppi, u0, v0)

    def image(self) -> bpy.types.Image:
        img = bpy.data.images.new(self.name, self.size, self.size, alpha=False)
        rgba = np.ones((self.size, self.size, 4), np.float32)
        rgba[..., :3] = np.clip(self.px, 0, 1)
        img.pixels.foreach_set(rgba.ravel())
        img.file_format = "PNG"
        img.pack()
        return img


class Region:
    """Part of a sheet, drawn on in inches."""

    def __init__(self, sheet: Sheet, ox: int, oy: int, ppi: float, u0: float, v0: float) -> None:
        self.sheet, self.ox, self.oy, self.ppi, self.u0, self.v0 = sheet, ox, oy, ppi, u0, v0

    def at(self, u: float, v: float) -> tuple[float, float]:
        return self.ox + (u - self.u0) * self.ppi, self.oy + (v - self.v0) * self.ppi

    def uv(self, u: float, v: float) -> tuple[float, float]:
        x, y = self.at(u, v)
        return x / self.sheet.size, y / self.sheet.size

    def _paint(self, x0: float, y0: float, x1: float, y1: float, cover, colour) -> None:
        n = self.sheet.size
        ix0, ix1 = max(0, int(math.floor(x0)) - 1), min(n, int(math.ceil(x1)) + 2)
        iy0, iy1 = max(0, int(math.floor(y0)) - 1), min(n, int(math.ceil(y1)) + 2)
        if ix1 <= ix0 or iy1 <= iy0:
            return
        yy, xx = np.mgrid[iy0:iy1, ix0:ix1]
        a = np.clip(cover(xx + 0.5, yy + 0.5), 0, 1)[..., None]
        sub = self.sheet.px[iy0:iy1, ix0:ix1]
        sub[:] = sub * (1 - a) + np.array(colour, np.float32) * a

    def rect(self, u0: float, v0: float, u1: float, v1: float, colour, r: float = 0.0, alpha: float = 1.0) -> None:
        (x0, y0), (x1, y1) = self.at(u0, v0), self.at(u1, v1)
        cx, cy, hx, hy, rr = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, r * self.ppi

        def cover(x, y):
            dx, dy = np.abs(x - cx) - (hx - rr), np.abs(y - cy) - (hy - rr)
            d = np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) + np.minimum(np.maximum(dx, dy), 0) - rr
            return (0.5 - d) * alpha

        self._paint(x0, y0, x1, y1, cover, colour)

    def ring(self, u: float, v: float, r0: float, r1: float, colour, a0: float = 0.0, a1: float = 360.0) -> None:
        """A disc (r0 = 0) or annulus; a0 to a1 limits it to a sector, degrees clockwise from the top."""
        cx, cy = self.at(u, v)
        p0, p1 = r0 * self.ppi, r1 * self.ppi

        def cover(x, y):
            d = np.hypot(x - cx, y - cy)
            c = np.minimum(p1 - d, d - p0) + 0.5 if r0 > 0 else p1 - d + 0.5
            if a1 - a0 < 360:
                ang = (np.degrees(np.arctan2(x - cx, y - cy)) - a0) % 360
                c = np.where(ang <= (a1 - a0), c, 0)
            return c

        self._paint(cx - p1, cy - p1, cx + p1, cy + p1, cover, colour)

    def line(self, a, b, width: float, colour) -> None:
        (ax, ay), (bx, by) = self.at(*a), self.at(*b)
        hw = max(width * self.ppi / 2, 0.5)
        dx, dy = bx - ax, by - ay
        ll = max(dx * dx + dy * dy, 1e-9)

        def cover(x, y):
            t = np.clip(((x - ax) * dx + (y - ay) * dy) / ll, 0, 1)
            return hw - np.hypot(x - ax - t * dx, y - ay - t * dy) + 0.5

        self._paint(min(ax, bx) - hw, min(ay, by) - hw, max(ax, bx) + hw, max(ay, by) + hw, cover, colour)

    def text(self, body: str, u: float, v: float, cap: float, colour=INK, align: str = "c", turn: int = 0, gap: float = 1.55) -> None:
        """Lines of text, `cap` inches tall, centred on (u, v) (or starting or ending there: align 'l', 'r'). `turn` quarter turns anticlockwise."""
        lines = body.split("\n")
        for i, line in enumerate(lines):
            off = ((len(lines) - 1) / 2 - i) * cap * gap
            mask, mx, my = _mask(line, cap * self.ppi)
            if turn:
                mask = np.rot90(mask, -turn)  # (rows run upward, so this is anticlockwise as seen)
            h, w = mask.shape
            x, y = self.at(u, v if turn % 2 else v + off)
            if turn % 2:  # (one line only)
                x0, y0 = x - w / 2, y - h / 2
            else:
                x0, y0 = (x - w / 2 if align == "c" else x if align == "l" else x - w), y - cap * self.ppi / 2 + my
            ix, iy = int(round(x0)), int(round(y0))
            n = self.sheet.size
            sx0, sy0, sx1, sy1 = max(0, -ix), max(0, -iy), min(w, n - ix), min(h, n - iy)
            if sx1 <= sx0 or sy1 <= sy0:
                continue
            a = mask[sy0:sy1, sx0:sx1, None]
            sub = self.sheet.px[iy + sy0 : iy + sy1, ix + sx0 : ix + sx1]
            sub[:] = sub * (1 - a) + np.array(colour, np.float32) * a

    def edge_screws(self, pts, pitch: float = 2.4, inset: float = 0.32) -> None:
        """A row of screws along every edge of a panel's outline (anticlockwise), `inset` in from it."""
        n = len(pts)
        for i in range(n):
            (u0, v0), (u1, v1) = pts[i], pts[(i + 1) % n]
            length = math.hypot(u1 - u0, v1 - v0)
            if length < 1.5:
                continue
            nu, nv = -(v1 - v0) / length, (u1 - u0) / length  # inward, for an outline that runs anticlockwise
            count = max(1, round((length - 1.0) / pitch))
            for k in range(count + 1):
                t = (0.5 + k * (length - 1.0) / count) / length
                self.screw(u0 + (u1 - u0) * t + nu * inset, v0 + (v1 - v0) * t + nv * inset, 0.09)

    def screw(self, u: float, v: float, r: float = 0.11) -> None:
        # (paint worn to the metal round the head, where a screwdriver has been: a paler ring, faint)
        wear = tuple(0.5 * a + 0.5 * b for a, b in zip(PAINT, (0.66, 0.66, 0.64)))
        self.ring(u, v, r, r * 1.7, wear)
        self.ring(u, v, 0, r, (0.50, 0.51, 0.50))
        self.ring(u, v, r * 0.82, r, (0.36, 0.37, 0.37))
        self.line((u - r * 0.5, v - r * 0.5), (u + r * 0.5, v + r * 0.5), 0.025, (0.2, 0.2, 0.2))
        self.line((u - r * 0.5, v + r * 0.5), (u + r * 0.5, v - r * 0.5), 0.025, (0.2, 0.2, 0.2))


def clock_xy(cw_deg: float, r: float) -> tuple[float, float]:
    a = math.radians(cw_deg)
    return r * math.sin(a), r * math.cos(a)


def scale_at(scale, value: float) -> float:
    """Where a value falls on a dial: `scale` is (value, degrees clockwise from the top) pairs."""
    for (v0, a0), (v1, a1) in zip(scale, scale[1:]):
        if value <= v1 or (v1, a1) == scale[-1]:
            return a0 + (a1 - a0) * (value - v0) / (v1 - v0)
    return scale[-1][1]


def draw_dial(rg: Region, r: float, scale, majors, minor: float, titles, numerals: float = 0.105, inset: float = 0.0, sectors=()) -> None:
    """A black face with white graduations. `majors` are (value, label); `minor` the step of the short ticks."""
    rg.ring(0, 0, 0, r, BLACK)
    for a0, a1, r0, r1, colour in sectors:
        rg.ring(0, 0, r * r0, r * r1, colour, a0, a1)
    rim = r * (0.93 - inset)
    v, top = scale[0][0], scale[-1][0]
    while minor and v <= top + 1e-6:
        a = scale_at(scale, v)
        rg.line(clock_xy(a, rim), clock_xy(a, rim - r * 0.085), 0.016, WHITE)
        v += minor
    for value, label in majors:
        a = scale_at(scale, value)
        rg.line(clock_xy(a, rim), clock_xy(a, rim - r * 0.16), 0.03, WHITE)
        if label:
            x, y = clock_xy(a, rim - r * 0.34)
            rg.text(label, x, y, max(numerals, 0.17 * r), WHITE)
    for body, x, y, cap in titles:
        # (legends as large as the flown faces have them: a twelfth of the dial's radius at the least)
        rg.text(body, x * r, y * r, max(cap, 0.085 * r) if len(body) > 4 else max(cap, 0.11 * r), WHITE)


# --------------------------------------------------------------------------- geometry


def plane(origin: Vector, ex: Vector, ey: Vector) -> Matrix:
    """A panel's frame: u along ex, v along ey, w toward whoever reads it. Inches in, metres out."""
    ex, ey = ex.normalized(), ey.normalized()
    m = Matrix((ex, ey, ex.cross(ey))).transposed().to_4x4() @ Matrix.Scale(IN, 4)
    m.translation = origin * IN
    return m


def rigid(m: Matrix) -> Matrix:
    """The same frame without its inch scale: what a node of its own is given."""
    loc, rot, _ = m.decompose()
    return Matrix.Translation(loc) @ rot.to_matrix().to_4x4()


class Cabin:
    """What is being built, and the meshes it goes into."""

    def __init__(self, parent, vessel: Surf, M: dict) -> None:
        self.g, self.vessel, self.M = parent, vessel, M
        self.mb: dict[str, MeshBuilder] = {}
        self.worst = math.inf  # the least room anything has from the wall, inches
        self.tightest = ""
        self.lenses: list[bpy.types.Object] = []  # the telelights, each to be given a material of its own

    def into(self, name: str) -> MeshBuilder:
        return self.mb.setdefault(name, MeshBuilder())

    def room(self, p: Vector) -> float:
        """How far a point (metres) is inside the lining, inches."""
        x, y, z = (c / IN for c in p)
        return self.vessel.r(z) - 0.12 - math.hypot(x, y)

    def flat(self, name: str, F: Matrix, pts, rg: Region | None, w: float = 0.0, flip: bool = False) -> None:
        """A flat polygon in a panel's frame, any shape, with its drawing laid on it."""
        tris = []
        for a, b, d in tessellate_polygon([[Vector((u, v, 0)) for u, v in pts]]):
            area = (pts[b][0] - pts[a][0]) * (pts[d][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[d][0] - pts[a][0])
            tris.append((a, b, d) if (area > 0) != flip else (a, d, b))  # toward the reader, or away
        verts = [tuple(F @ Vector((u, v, w))) for u, v in pts]
        uvs = [rg.uv(u, v) for u, v in pts] if rg else None
        self.into(name).add(verts, tris, uvs)

    def skirt(self, name: str, F: Matrix, pts, w0: float, w1: float) -> None:
        """A wall round a polygon's edge from w0 to w1, facing outward."""
        mb = self.into(name)
        n = len(pts)
        for i in range(n):
            (u0, v0), (u1, v1) = pts[i], pts[(i + 1) % n]
            mb.add([tuple(F @ Vector(q)) for q in ((u0, v0, w0), (u1, v1, w0), (u1, v1, w1), (u0, v0, w1))], [(0, 3, 2, 1)])

    def box(
        self, name: str, F: Matrix, u: float, v: float, su: float, sv: float, w0: float, w1: float, top: Region | None = None, tu=0.0, tv=0.0
    ) -> None:
        """A block on a panel from w0 to w1; its top face can carry a drawing centred on (tu, tv) of `top`."""
        mb = self.into(name)
        hu, hv = su / 2, sv / 2
        c = [(u - hu, v - hv), (u + hu, v - hv), (u + hu, v + hv), (u - hu, v + hv)]
        mb.add(
            [tuple(F @ Vector((a, b, w1))) for a, b in c],
            [(0, 1, 2, 3)],
            [top.uv(tu + a - u, tv + b - v) for a, b in c] if top else None,
        )
        for i in range(4):
            (a0, b0), (a1, b1) = c[i], c[(i + 1) % 4]
            mb.add([tuple(F @ Vector(q)) for q in ((a0, b0, w0), (a1, b1, w0), (a1, b1, w1), (a0, b0, w1))], [(0, 1, 2, 3)])

    def rim(self, name: str, F: Matrix, u: float, v: float, su: float, sv: float, t: float, w0: float, w1: float) -> None:
        """A frame of four strips, t wide, round a rectangle su by sv."""
        self.box(name, F, u, v + sv / 2 + t / 2, su + 2 * t, t, w0, w1)
        self.box(name, F, u, v - sv / 2 - t / 2, su + 2 * t, t, w0, w1)
        self.box(name, F, u - su / 2 - t / 2, v, t, sv, w0, w1)
        self.box(name, F, u + su / 2 + t / 2, v, t, sv, w0, w1)

    def disc(
        self, name: str, F: Matrix, u: float, v: float, r: float, w: float, rg: Region | None = None, segs: int = 32, ru: float = 0.0, rv: float = 0.0
    ) -> None:
        """A round face toward the reader, with the drawing centred on (ru, rv) of its region."""
        mb = self.into(name)
        ring = [(r * math.cos(TAU * i / segs), r * math.sin(TAU * i / segs)) for i in range(segs)]
        verts = [tuple(F @ Vector((u, v, w)))] + [tuple(F @ Vector((u + a, v + b, w))) for a, b in ring]
        uvs = ([rg.uv(ru, rv)] + [rg.uv(ru + a, rv + b) for a, b in ring]) if rg else None
        mb.add(verts, [(0, 1 + i, 1 + (i + 1) % segs) for i in range(segs)], uvs)

    def turned(self, name: str, F: Matrix, u: float, v: float, profile, segs: int = 24, w: float = 0.0) -> None:
        """A profile of (radius, height above the panel) turned about the panel's normal at (u, v)."""
        self.into(name).lathe(profile, segs, matrix=F @ Matrix.Translation((u, v, w)))

    def node(self, name: str, mat: str, F: Matrix, u: float, v: float, w: float, shape, spin: float = 0.0, **props) -> bpy.types.Object:
        """Something the viewer moves: its own object, its origin at (u, v, w) of the panel, built by shape(mb) in inches about that origin."""
        mb = MeshBuilder()
        shape(mb)
        mb.verts = [tuple(Vector(p) * IN) for p in mb.verts]
        props.setdefault("reach", max(Vector(p).length for p in mb.verts))  # how near a pointer must come to mean it, metres
        # (a lamp is lit by itself: its material is its own)
        obj = mb.build(name, self.M[mat].copy() if mat in OWN_MATERIAL else self.M[mat], self.g, smooth=False)
        obj.matrix_local = rigid(F @ Matrix.Translation((u, v, w))) @ Matrix.Rotation(spin, 4, "Z")
        for key, value in props.items():
            obj[key] = value
        return obj

    def finish(self, materials: dict[str, str], smooth=()) -> None:
        for name, mb in self.mb.items():
            if not mb.verts:
                continue
            if name not in WALL:
                for p in mb.verts:
                    room = self.room(Vector(p))
                    if room < self.worst:
                        self.worst, self.tightest = room, f"{name} at ({p[0] / IN:.1f}, {p[1] / IN:.1f}, {p[2] / IN:.1f}) in"
            mb.build(name, self.M[materials[name]], self.g, smooth=name in smooth, sharp_angle=35)
        assert self.worst > 0.25, f"the cabin's fittings come within {self.worst:.2f} in of the wall: {self.tightest}"


OWN_MATERIAL = ("amber", "red_lamp", "green_lamp")
# what is part of the wall, or goes through it: not held to the rule that nothing in the cabin reaches it
WALL = (
    "CrewCabin_Lining",
    "CrewCabin_Frames",
    "CrewCabin_PortFrames",
    "CrewCabin_Periscope",
    "CrewCabin_Lamps",
    "CrewCabin_LampLenses",
    "CrewCabin_WindowShroud",
)


def soft(mb: MeshBuilder, m: Matrix, size, r: float, nu: int = 16, nv: int = 9) -> None:
    """A box with every edge rounded to radius r (inches, like its size): a pack, a pouch, a kit. `m` is in metres."""
    hx, hy, hz = (max(0.0, s_ / 2 - r) for s_ in size)

    def pt(i, j):
        th, ph = TAU * i / nu, math.pi * (j / (nv - 1) - 0.5)
        d = Vector((math.cos(ph) * math.cos(th), math.cos(ph) * math.sin(th), math.sin(ph)))
        k = 99.0 / max(abs(d.x), abs(d.y), abs(d.z), 1e-9)
        core = Vector((max(-hx, min(hx, d.x * k)), max(-hy, min(hy, d.y * k)), max(-hz, min(hz, d.z * k))))
        return m @ ((core + d * r) * IN)

    mb.grid(pt, range(nu), range(nv), closed_u=True)


def pointer(length: float, width: float, tail: float = 0.0, tip: float = 0.25, hub: float = 0.0):
    """A needle lying along +v from its pivot, flat, facing the reader."""

    def shape(mb: MeshBuilder) -> None:
        mb.add(
            [
                (-width / 2, -tail, 0),
                (width / 2, -tail, 0),
                (width / 2, length * 0.72, 0),
                (width * tip, length, 0),
                (-width * tip, length, 0),
                (-width / 2, length * 0.72, 0),
            ],
            [(0, 1, 2, 5), (5, 2, 3, 4)],
        )
        if hub:
            mb.lathe([(hub, -0.02), (hub, 0.05), (0.0, 0.05)], 12)

    return shape


def turn_scale(scale, k: float = 1.0) -> list[float]:
    """A dial's scale as the viewer reads it: value, radians anticlockwise from the pointer's rest (straight up)."""
    return [x for v, cw in scale for x in (float(v) * k, -math.radians(cw))]


# --------------------------------------------------------------------------- instruments

# Each round instrument of capsule 7: where it is in Figure 3.1-2 (pixels), its diameter there, and
# its face as the flown capsule's reads today (NASM2021-00147): scale as (value, degrees clockwise
# from the top). The graduations are estimated from that photograph, not from an instrument drawing.
ROUND = {
    "Accelerometer": dict(
        at=(1010, 607),
        d=85,
        scale=[(-9, 135), (0, 270), (12, 450)],
        majors=[(-9, "-9"), (-6, "-6"), (-3, "-3"), (0, "0"), (3, "3"), (6, "6"), (9, "9"), (12, "12")],
        minor=1,
        titles=[("LONGITUDINAL\nACCELERATION", 0, 0.16, 0.05), ("G UNITS", 0, -0.42, 0.05)],
        rest=1.0,
        pointer="white",
    ),
    "Altimeter": dict(
        at=(990, 848),
        d=130,
        scale=[(0, 210), (100, 540)],
        majors=[(v, str(v)) for v in range(0, 101, 10)],
        minor=2,
        titles=[("ALT", 0, -0.3, 0.13), ("1000 FEET", 0, -0.47, 0.055), ("MAIN", -0.5, -0.18, 0.05), ("SNORKEL", -0.42, 0.08, 0.05)],
        rest=0.0,
        pointer="white",
    ),
    "DescentRate": dict(
        at=(1205, 803),
        d=88,
        scale=[(0, 270), (20, 225), (40, 195), (60, 165), (100, 120), (140, 90)],
        majors=[(0, "0"), (20, "2"), (40, "4"), (60, "6"), (100, "10"), (140, "14")],
        minor=10,
        titles=[("DESCENT", 0, 0.46, 0.085), ("10 FT/SEC", 0, 0.27, 0.04), ("DOWN", -0.3, -0.12, 0.05)],
        rest=0.0,
        pointer="white",
    ),
    "CabinPressure": dict(
        at=(1632, 612),
        d=85,
        scale=[(0, 180), (15, 450)],
        majors=[(v, str(v)) for v in (0, 3, 6, 9, 12, 15)],
        minor=1,
        titles=[("CABIN\nPRESSURE", 0, 0.2, 0.055), ("PSIA", 0, -0.3, 0.055)],
        rest=14.7,
        pointer="white",
    ),
    "CabinAir": dict(
        at=(1748, 605),
        d=85,
        scale=[(0, 225), (250, 495)],
        majors=[(v, str(v)) for v in range(0, 251, 50)],
        minor=10,
        titles=[("°F", 0, 0.25, 0.07), ("CABIN\nAIR", 0, -0.3, 0.055)],
        rest=95.0,
        pointer="white",
    ),
    "Humidity": dict(
        at=(1632, 728),
        d=85,
        scale=[(0, 225), (100, 495)],
        majors=[(v, str(v)) for v in range(0, 101, 20)],
        minor=10,
        titles=[("CABIN\nHUMIDITY", 0, 0.2, 0.05), ("PERCENT", 0, -0.32, 0.05)],
        rest=20.0,
        pointer="white",
    ),
    "Coolant": dict(
        at=(1748, 728),
        d=85,
        scale=[(0, 195), (100, 420)],
        majors=[(v, str(v)) for v in range(20, 101, 20)],
        minor=10,
        titles=[("COOLANT\nQUANTITY", 0, 0.12, 0.05), ("PERCENT\nREMAINING", 0, -0.42, 0.045)],
        rest=100.0,
        pointer="white",
    ),
    "Oxygen": dict(
        at=(1748, 868),
        d=85,
        scale=[(0, 200), (100, 380)],
        majors=[(0, "0"), (50, "50"), (100, "100")],
        minor=10,
        titles=[("OXYGEN", 0, 0.62, 0.05), ("PERCENT\nREMAINING", -0.1, -0.5, 0.042), ("EMERG", 0.5, 0.0, 0.045)],
        sectors=[(40, 140, 0.62, 0.9, (0.55, 0.1, 0.08))],
        rest=100.0,
        pointer="white",
    ),
    "DCVolts": dict(
        at=(1632, 1000),
        d=85,
        scale=[(0, -52), (30, 52)],
        majors=[(0, ""), (10, "10"), (20, "20"), (30, "30")],
        minor=2,
        titles=[("DC\nVOLTS", 0, -0.02, 0.06)],
        rest=24.0,
        pointer="white",
        fan=True,
    ),
    "DCAmps": dict(
        at=(1748, 1000),
        d=85,
        scale=[(0, -52), (50, 52)],
        majors=[(0, ""), (10, "10"), (20, "20"), (30, "30"), (40, "40"), (50, "50")],
        minor=5,
        titles=[("DC\nAMPS", 0, -0.02, 0.06)],
        rest=18.0,
        pointer="white",
        fan=True,
    ),
    "ACVolts": dict(
        at=(1748, 1153),
        d=85,
        scale=[(0, -52), (150, 52)],
        majors=[(0, ""), (50, "50"), (100, "100"), (150, "150")],
        minor=10,
        titles=[("AC\nVOLTS", 0, -0.02, 0.06)],
        rest=115.0,
        pointer="white",
        fan=True,
    ),
}

# The attitude and rate indicator's three dials, in inches from its middle (NASM2021-00147).
ATTITUDE = {
    "Roll": dict(at=(-2.45, 0.35), r=1.25, scale=[(-180, -180), (180, 180)], majors=[(0, "0"), (90, "90"), (-90, "90")], colour="blue", title="ROLL"),
    "Pitch": dict(
        at=(2.45, 0.35),
        r=1.25,
        scale=[(-180, -225), (180, 135)],
        majors=[(0, "0"), (90, "90"), (180, "180"), (-90, "-90")],
        colour="white",
        title="PITCH",
    ),
    "Yaw": dict(
        at=(0.0, -1.2),
        r=0.95,
        scale=[(-180, -180), (180, 180)],
        majors=[(0, "0"), (90, "90"), (-90, "270"), (180, "180")],
        colour="yellow",
        title="YAW",
    ),
}
RATE_FULL = 6.0  # degrees a second at the rate needles' full travel: estimated; nothing read gives the instrument's range
RATE_TRAVEL = 0.62  # inches

# The telelights of the left console's strip, top to bottom, with what overrides each (Figure 3.1-2).
SEQUENCE = (
    ("TowerJett", "TOWER JETT", "ring", 652),
    ("CapsuleSep", "CAPSULE SEP", "ring", 700),
    ("RetroSeq", "START\nRETRO SEQ.", "button", 750),
    ("RetroAtt", "IN RETRO ATT", "switch", 798),
    ("RetroFire", "RETRO FIRE", "button", 847),
    ("JettRetro", "JETT RETRO", "button", 895),
    ("PointZeroFiveG", ".05 G SWITCH", "button", 944),
    ("Drogue", "DROGUE", "button", 993),
    ("MainDeploy", "MAIN DEPLOY", "ring", 1042),
    ("ReserveDeploy", "RESERVE DEPLOY", "ring", 1091),
)
OTHER_LIGHTS = (
    ("Ready", "READY", (1522, 563)),
    ("Mayday", "MAYDAY", (1522, 605)),
    ("Recording", "RECORDING", (990, 704)),
    ("OxygenWarning", "OXYGEN\nWARNING", (1690, 803)),
    ("StandbyDC", "STANDBY\nD.C. AUTO", (1847, 975)),
    ("StandbyAC", "STANDBY\nA.C. AUTO", (1847, 1130)),
)

# Toggle switches of the main panel: where (figure pixels), the name above, and what its positions are called.
MAIN_SWITCHES = (
    ((1133, 632), "RATE IND", ("AUTO", "MANUAL ON"), "v"),
    ((1520, 520), "LAUNCH\nCONTROL", ("READY", "OFF"), "h"),
    ((985, 748), "BEACON", ("CONTIN", "GRND\nCOMMD"), "h"),
    ((1133, 890), "SQUIB", ("ARM", "OFF"), "h"),
    ((962, 1338), "HI-WATT TELE", ("CONTIN", "GRND\nCOMMD"), "h"),
    ((1845, 797), "CABIN FAN", ("NORM", "OFF"), "h"),
    ((1845, 880), "SUIT FAN", ("NORM", "NO. 2"), "h"),
    ((1845, 1025), "STDBY BATT", ("AUTO", "MAN"), "h"),
    ((1708, 1078), "AMMETER", ("NORM", "EMERG"), "h"),
    ((1778, 1078), "ELEC PWR", ("NORM", "ASCS"), "h"),
    ((1845, 1078), "ISOL BATT", ("NORM", "STDBY"), "h"),
    ((1635, 1168), "STDBY INVERT", ("FANS\nONLY", "ASCS\nONLY"), "h"),
    ((1635, 1222), "AUDIO BUS", ("NORM", "EMERG"), "h"),
    ((1748, 1220), "A.C. VOLTS", ("FANS", "ASCS"), "h"),
    ((1845, 1250), "TRANSMIT", ("UHF", "HF"), "h"),
    ((1845, 1322), "UHF SELECT", ("NORM", "RESERVE"), "h"),
)
CONSOLE_SWITCHES = (
    ((333, 880), "CABIN LITES", ("OFF", "ON"), "v"),
    ((395, 880), "GYRO", ("CAGE", "NORMAL"), "v"),
    ((465, 880), "ASCS MODE SEL", ("FLY-BY-WIRE", "NORMAL"), "v"),
    ((552, 880), "AUTO\nRETRO JETT", ("DIS-ARM", "ARM"), "v"),
    ((368, 1000), "RETRO HEATER", ("ON", "OFF"), "v"),
    ((382, 1183), "LDG BAG", ("MAN", "AUTO"), "v"),
)
# The switch-fuses of the fuse panel, row by row, in the order of the report's Figure 10.1-1. Where each row lies on
# the panel is estimated from NASM2021-00147: the 1960 manual's figure (SEDR 109-7, Figure 1-3) was not legible enough.
FUSES = (
    ("EMER\n.05G", "ASCS\n.05G", "RETRO\nMAN", "NO. 3\nRETRO", "NO. 2\nRETRO", "NO. 1\nRETRO", "EMERG\nRETRO"),
    ("PERI-\nSCOPE", "RESV\nDEPLOY", "EMERG\nCAP SEP", "EMERG\nMAIN", "EMERG\nJETT", "EMERG\nDROGUE"),
    ("EMERG\nPOSI", "EMER\nESCAPE", "EMERG\nTWR JETT", "EMER\nTWR SEP", "TWR SEP\nCONTRL"),
    ("ANT\nSWITCH", "PRO-\nGRAMMR"),
    ("LOW TEL\nTRANS", "COM\nRCVR A", "SPARE"),
)


def build(
    parent,
    vessel: Surf,
    M: dict,
    font,
    pilot: dict,
    hip: tuple[float, float],
    portholes,
    hatch: tuple[float, float, float, float],
    ceiling: float,
    suit=None,
) -> dict:
    """Everything inside the pressure vessel but the pilot. `pilot` is mark_iv_suit's key points
    (seat-frame centimetres) and `hip` where his hips are, (y, station) in inches; `portholes` are
    (angle, station) pairs; `hatch` is the opening, (angle from, angle to, station from, to).
    Returns where things are for the caller and the flight's record: metres, in the capsule's frame."""
    global _font
    _font = font
    if not interior():
        return {}
    M.update(materials())
    c = Cabin(parent, vessel, M)
    # the panels' lettering is three sixteenths of an inch tall at most (scaled off the flown capsule's) and read from
    # two feet: 150 pixels to the inch on the main panel and 110 on the consoles, which is what it takes to read it
    # through the lens at its narrowest
    main = Sheet("cabin-main-panel", 4096)
    side = Sheet("cabin-consoles", 3072)
    faces = Sheet("cabin-faces", 2048, BLACK)
    out: dict = {}

    def seat(p) -> Vector:
        """A point of the seated pilot, in capsule inches."""
        return Vector((p[0] / 2.54, hip[0] + p[1] / 2.54, hip[1] + p[2] / 2.54))

    lining(c, hatch, portholes, ceiling)
    couch(c, pilot, seat)
    neck_dam(c, seat, pilot)
    P = plane(Vector(PANEL_AT), Vector((1, 0, 0)), Vector((0, -math.cos(PANEL_TILT), math.sin(PANEL_TILT))))
    main_panel(c, P, main, faces)
    behind_panel(c, P)
    periscope(c, P, side, out)
    consoles(c, P, side, faces)
    controls(c, seat, pilot, out)
    if suit:
        restraints(c, suit, pilot, seat)
    # (the two lights either side of his head, clear of the hatch and the upper port; the suit's hoses clear of the hatch's sill)
    stowage(c, portholes, out, lamps_at=(-100.0, -82.0), hoses_at=2.4)
    fit_out(c, hatch, portholes)
    dress(c, M, parent, P, pilot, seat, main, side, faces, out)
    return out


def dress(c: Cabin, M: dict, parent, P: Matrix, pilot: dict, seat, main: Sheet, side: Sheet, faces: Sheet, out: dict, more=None) -> None:
    """What every fit ends with: each mesh built in its material (`more`: a fit's own meshes and theirs), the three
    sheets put on the materials that show them, and the seat's node at the pilot's eyes."""
    c.finish(
        {
            "CrewCabin_Lining": "cabin_paint",
            "CrewCabin_Frames": "cabin_paint",
            "CrewCabin_PortFrames": "cabin_paint",
            "CrewCabin_Couch": "couch",
            "CrewCabin_CouchLiner": "couch_liner",
            "CrewCabin_InstrumentPanel": "panel_main",
            "CrewCabin_PanelStructure": "cabin_paint",
            "CrewCabin_Consoles": "panel_side",
            "CrewCabin_Instruments": "faces",
            "CrewCabin_Bezels": "bezel",
            "CrewCabin_InstrumentGlass": "crystal",
            "CrewCabin_PanelFittings": "lever",
            "CrewCabin_Knobs": "bezel",
            "CrewCabin_RedCaps": "red",
            "CrewCabin_WhiteCaps": "white_plastic",
            "CrewCabin_Periscope": "cabin_paint",
            "CrewCabin_Equipment": "equipment",
            "CrewCabin_Stowage": "fabric",
            "CrewCabin_Pack": "olive",
            "CrewCabin_Hoses": "hose",
            "CrewCabin_Looms": "loom",
            "CrewCabin_Leads": "loom",
            "CrewCabin_Trunk": "loom",
            "CrewCabin_Harness": "loom",
            "CrewCabin_Risers": "loom",
            "CrewCabin_WallClips": "lever",
            "CrewCabin_WallCases": "equipment",
            "CrewCabin_WallConnectors": "red",
            "CrewCabin_WallPlates": "white_plastic",
            "CrewCabin_Connectors": "red",
            "CrewCabin_Clips": "lever",
            "CrewCabin_Straps": "couch_liner",
            "CrewCabin_Bottles": "bottle",
            "CrewCabin_Lamps": "equipment",
            "CrewCabin_LampLenses": "cabin_lamp",
            **(more or {}),
        },
        smooth=(
            "CrewCabin_Lining",
            "CrewCabin_Frames",
            "CrewCabin_PortFrames",
            "CrewCabin_Bezels",
            "CrewCabin_PanelFittings",
            "CrewCabin_Knobs",
            "CrewCabin_RedCaps",
            "CrewCabin_WhiteCaps",
            "CrewCabin_Periscope",
            "CrewCabin_Hoses",
            "CrewCabin_Looms",
            "CrewCabin_Leads",
            "CrewCabin_Trunk",
            "CrewCabin_Harness",
            "CrewCabin_Risers",
            "CrewCabin_Connectors",
            "CrewCabin_Pack",
            "CrewCabin_Stowage",
            "CrewCabin_InstrumentGlass",
            "CrewCabin_Couch",
            "CrewCabin_CouchLiner",
            *(more or {}),
        ),
    )
    for sheet, name in ((main, "panel_main"), (side, "panel_side"), (faces, "faces")):
        img = sheet.image()
        for key in (name, *(("telelight", "drum") if name == "faces" else ())):
            mat = M[key]
            tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
            tex.image = img
            bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    for obj in c.lenses:  # (now that the legends are on it: each lens is lit by itself)
        obj.data.materials[0] = M["telelight"].copy()
    out["room"] = c.worst
    # Where the pilot's eyes are and where they rest: on the panel between the clock and the periscope. A node of its
    # own, for the viewer's seat (ModelDef.seats): in the file its +Z looks that way and its +Y is the top of his head.
    # (the seated figure's own: midway between its eyes, with the head bowed in the helmet as he has it)
    eyes = seat(pilot["eyes"])
    eye = Vector((0.0, eyes.y, eyes.z))
    out["eye_off_square"] = math.degrees((Vector(P @ Vector((0, 0, 0))) / IN - eye).angle(-Vector(P.col[2][:3])))
    look = (Vector(P @ Vector((1.0, 7.5, 0.0))) / IN - eye).normalized()
    over = (Vector((0, -1, 0)) - look * look.dot(Vector((0, -1, 0)))).normalized()
    node = bpy.data.objects.new("Seat_Pilot", None)
    bpy.context.scene.collection.objects.link(node)
    node.parent = parent
    node.matrix_local = Matrix.Translation(eye * IN) @ Matrix(((-look).cross(over), -look, over)).transposed().to_4x4()
    out["eye"] = tuple(eye)
    out["eye_to_screen"] = (Vector(P @ Vector((0, 0, 0))) / IN - eye).length
    print(
        f"cabin: the pilot's eyes at ({eye.x:.2f}, {eye.y:.2f}, {eye.z:.2f}) in, "
        f"{out['eye_to_screen']:.1f} in from the middle of the panel and {out['eye_off_square']:.1f} degrees off square to it"
    )


def neck_dam(c: Cabin, seat, pilot: dict) -> None:
    """The suit's neck, closed: from his own eyes, with his helmet and head not drawn, the pilot looks down into his
    collar, and what is there is the neck dam of the suit, not the hollow of the model's torso."""
    neck = seat(pilot["neck_ring"])
    c.into("CrewCabin_Hoses").lathe(
        prof([(4.7, 0.0), (3.0, 0.5), (0.0, 0.7)]), 24, matrix=frame(Vector((neck.x, neck.y + 0.6, neck.z)) * IN, (0, -1, 0))
    )


def materials() -> dict:
    m = material
    grey = tuple(v**2.2 for v in PAINT)
    return {
        "cabin_paint": m("paint-cabin", grey, 0.0, 0.62),
        "panel_main": m("panel-main", (1, 1, 1), 0.0, 0.6),
        "panel_side": m("panel-consoles", (1, 1, 1), 0.0, 0.6),
        "faces": m("instrument-faces", (1, 1, 1), 0.0, 0.5),
        "telelight": m("telelight", (1, 1, 1), 0.0, 0.35),
        "drum": m("counter-drum", (1, 1, 1), 0.0, 0.5),
        "bezel": m("bezel-black", (0.012, 0.012, 0.014), 0.2, 0.42),
        "crystal": m("crystal", (0.75, 0.82, 0.85), 0.0, 0.04, alpha=0.06),
        "lever": m("lever-steel", (0.55, 0.55, 0.54), 1.0, 0.32),
        "red": m("cap-red", (0.5, 0.03, 0.02), 0.0, 0.45),
        "white_plastic": m("cap-white", (0.72, 0.72, 0.66), 0.0, 0.5),
        "needle_white": m("needle-white", (0.9, 0.9, 0.86), 0.0, 0.6),
        "needle_blue": m("needle-blue", (0.16, 0.38, 0.75), 0.0, 0.6),
        "needle_yellow": m("needle-yellow", (0.85, 0.72, 0.08), 0.0, 0.6),
        "couch_liner": m("couch-liner", (0.62, 0.55, 0.42), 0.0, 0.9),
        "olive": m("pack-olive", (0.13, 0.13, 0.07), 0.0, 0.9),
        "hose": m("hose-white", (0.7, 0.69, 0.63), 0.0, 0.7),
        "cabin_lamp": m("cabinlight-lens", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.85), emission_strength=0.6),
        "scope_screen": m("periscope-screen", (0.02, 0.025, 0.03), 0.0, 0.15),
        "loom": m("loom-grey", (0.22, 0.22, 0.23), 0.0, 0.7),
        "amber": m("lamp-amber", (0.75, 0.38, 0.04), 0.0, 0.3),
        "red_lamp": m("lamp-red", (0.55, 0.04, 0.03), 0.0, 0.3),
        "green_lamp": m("lamp-green", (0.05, 0.4, 0.2), 0.0, 0.3),
        "grip": m("grip-black", (0.02, 0.02, 0.022), 0.0, 0.55),
    }


# --------------------------------------------------------------------------- the wall


# The channelled frames round the wall: (station, whether it runs all the way round). Estimated, as lining() says.
FRAMES = ((6.1, True), (24.5, False), (29.5, False), (34.5, False), (48.5, True), (53.5, True))


def lining(c: Cabin, hatch, portholes, ceiling: float, openings=(), frames=FRAMES) -> None:
    """The wall as the pilot sees it: the inner skin painted grey, the channelled frames that
    line it (SEDR 104, 2-3: how many and where is not in anything read), a frame round the hatch
    opening and a bolted ring round each porthole. `openings`: what else is cut through the wall, each
    (angle from, angle to, station from, to) with its angles whole multiples of 2.5 degrees."""
    t0, t1, hz0, hz1 = hatch
    v = c.vessel
    rl = lambda z: v.r(z) - 0.12  # noqa: E731
    mb = c.into("CrewCabin_Lining")
    top = ceiling - 0.15  # under the small bulkhead
    # (in rings a couple of inches apart, and the bulkheads in rings too: the cabin's shading is kept at its vertices, shade())
    up = lambda z0, z1: [(rl(z), z) for z in np.linspace(z0, z1, max(2, round((z1 - z0) / 2.2) + 1))]  # noqa: E731
    across = lambda z, out: [(r, z) for r in (np.linspace(0.0, rl(z), 12) if out else np.linspace(rl(z), 0.0, 12))]  # noqa: E731
    if openings:
        mercury_capsule.wall(mb, rl, 0.62, top, (hatch, *openings), flip=True, step=2.2)
        mb.lathe(prof(across(top, False)), 144, flip=True)
    else:
        mb.lathe(prof(up(0.62, hz0)), 96, flip=True)
        mb.lathe(prof(up(hz0, hz1)), 84, arc=(t1, t0 + TAU), flip=True)
        mb.lathe(prof(up(hz1, top) + across(top, False)[1:]), 96, flip=True)
    mb.lathe(prof(across(0.62, True)), 96, flip=True)

    def clear(t: float, z: float, margin: float = 0.9) -> bool:
        """Whether a point of the wall is clear of every further opening, by `margin` inches."""
        return not any(o[2] - margin < z < o[3] + margin and (t - o[0] + margin / rl(z)) % TAU < o[1] - o[0] + 2 * margin / rl(z) for o in openings)

    fr = c.into("CrewCabin_Frames")

    def keep(arc, blocked):
        """What is left of an arc of the wall once the stretches in `blocked` are taken out of it: (from, to) pairs."""
        pieces = [arc]
        for o0, o1 in blocked:
            o0 = arc[0] + (o0 - arc[0]) % TAU
            o1 = o0 + (o1 - o0) % TAU
            rest = []
            for a, b in pieces:
                for lo, hi in ((o0 - TAU, o1 - TAU), (o0, o1)):
                    if hi <= a or lo >= b:
                        continue
                    if lo > a:
                        rest.append((a, lo))
                    a = max(a, hi)
                if b > a:
                    rest.append((a, b))
            pieces = rest
        return [(a, b) for a, b in pieces if b - a > 0.05]

    for z, whole in frames:
        # a frame stops either side of a port's ring
        ports_ = [
            (pt - half, pt + half)
            for pt, pz in portholes
            if abs(z - pz) < PORT_RING + 0.9
            for half in [(math.sqrt((PORT_RING + 0.9) ** 2 - (z - pz) ** 2) + 0.4) / rl(z)]
        ]
        profile = prof([(rl(z + 0.3) + 0.1, z + 0.3), (rl(z + 0.3) - 0.75, z + 0.3), (rl(z - 0.3) - 0.75, z - 0.3), (rl(z - 0.3) + 0.1, z - 0.3)])
        arc = (0.0, TAU) if whole else (t1 + 0.05, t0 + TAU - 0.05)
        cut = [o for o in openings if o[2] - 0.9 < z < o[3] + 0.9]
        pieces = [arc]
        if ports_:
            pieces = keep(arc, ports_ + [(o[0] - 0.04, o[1] + 0.04) for o in cut])
            for a, b in pieces:
                fr.lathe(profile, max(4, round(96 * (b - a) / TAU)), arc=(a, b))
        elif cut:  # (a frame stops either side of a window)
            o0, o1 = cut[0][0] - 0.04, cut[0][1] + 0.04
            pieces = [(o1, o0 + TAU)] if whole else [(arc[0], o0 + (TAU if o0 < arc[0] else 0.0)), (o1 + (TAU if o1 < arc[0] else 0.0), arc[1])]
            for a, b in pieces:
                if b - a > 0.05:
                    fr.lathe(profile, max(4, round(96 * (b - a) / TAU)), arc=(a, b))
        else:
            fr.lathe(profile, 96, arc=arc)
        for i in range(64):  # riveted to the skin through its flange
            t = arc[0] + (arc[1] - arc[0]) * (i + 0.5) / 64
            if not clear(t, z) or (ports_ and not any(a < t < b for a, b in pieces)):
                continue
            fr.disc(
                Vector((math.cos(t), math.sin(t), 0)) * ((rl(z) - 0.75) * IN) + Vector((0, 0, z * IN)),
                (-math.cos(t), -math.sin(t), 0),
                0.09 * IN,
                0.04 * IN,
            )
    # the hatch's sill: a row of studs round the opening, as the flown capsule's has (NASM2021-00153); their number is not counted
    for t in (t0 - 0.035, t1 + 0.035):
        for z in np.arange(hz0, hz1 + 0.1, 1.6):
            fr.disc(
                Vector((math.cos(t), math.sin(t), 0)) * (rl(z) * IN) + Vector((0, 0, z * IN)), (-math.cos(t), -math.sin(t), 0), 0.16 * IN, 0.12 * IN
            )
    for z in (hz0 - 0.8, hz1 + 0.8):
        for t in np.arange(t0, t1 + 0.01, 1.6 / rl(z)):
            fr.disc(
                Vector((math.cos(t), math.sin(t), 0)) * (rl(z) * IN) + Vector((0, 0, z * IN)), (-math.cos(t), -math.sin(t), 0), 0.16 * IN, 0.12 * IN
            )
    # The skin is riveted to the hat stringers outside it (SEDR 104, 2-3): a line of rivet heads down each, as the
    # flown capsule's wall shows. The Postlaunch Report names stringers by number into the twenties; that there are
    # 24, and which way round the first lies, are the model's.
    for k in range(24):
        t = TAU * (k + 0.5) / 24
        in_hatch = abs((t - (t0 + t1) / 2 + math.pi) % TAU - math.pi) < (t1 - t0) / 2 + 0.03
        for z in np.arange(5.0, 56.0, 2.2):
            if in_hatch and hz0 - 0.8 < z < hz1 + 0.8:
                continue
            p = Vector((math.cos(t), math.sin(t), 0)) * rl(z) + Vector((0, 0, z))
            if any((p * IN - v.p(pt, pz)).length < (PORT_RING + 0.6) * IN for pt, pz in portholes) or not clear(t, z):
                continue
            fr.disc(p * IN, (-math.cos(t), -math.sin(t), 0), 0.08 * IN, 0.035 * IN)
    # a bolted ring round each porthole, lying on the wall's own curve
    ports = c.into("CrewCabin_PortFrames")
    wall = Surf(v.r0 - 0.12, v.z0, v.a)

    def on_wall(t: float, z: float, r: float, a: float, off: float) -> Vector:
        zz = z + r * math.sin(a) * math.cos(v.a)
        return wall.p(t + r * math.cos(a) / wall.r(zz), zz, off)

    # radius, and how far out through the wall (inward is negative): a stepped ring, its inner lip over the wall's cut edge
    ring = [
        (PORT_RING, 0.06),
        (PORT_RING, -0.5),
        (PORT_BORE + 0.6, -0.5),
        (PORT_BORE + 0.6, -0.75),
        (PORT_BORE - 0.3, -0.75),
        (PORT_BORE - 0.3, -0.3),
    ]
    bolts = (PORT_RING + PORT_BORE + 0.6) / 2
    for k, (t, z) in enumerate(portholes):
        ports.grid(
            lambda a, k, t=t, z=z: on_wall(t, z, ring[k][0], a, ring[k][1]),
            [TAU * i / 48 for i in range(48)],
            range(len(ring)),
            closed_u=True,
            flip=PORT_FLIP,
        )
        # its bore goes on out through the wall to the outer pane, straight: from the couch the port is seen along the
        # wall, and nothing of the wall's own cut edge may show round it
        # (it stands a little inside the ring and a little proud of it: no gap between the two for the wall's edge to show at)
        ports.lathe(prof([(PORT_BORE - 0.34, 0.38), (PORT_BORE - 0.34, -0.6)]), 48, matrix=wall.frame(t, z))
        for i in range(4):  # the clamps that hold the inner panes' frame, as the flown capsule's ring has them (NASM2021-00147): four is ours
            a = TAU * (i + 0.5) / 4
            at = on_wall(t, z, bolts, a, -0.6)
            ports.box((1.3 * IN, 0.8 * IN, 0.8 * IN), frame(at, -wall.n(t + bolts * math.cos(a) / wall.r(z))) @ Matrix.Rotation(a, 4, "Z"))
        for i in range(24):
            a = TAU * (i + 0.5) / 24
            at = on_wall(t, z, bolts, a, -0.5)
            ports.disc(at, -wall.n(t + bolts * math.cos(a) / wall.r(z)), 0.16 * IN, 0.07 * IN)
        # the inner pane, the one that holds the cabin's pressure, under the ring's lip: with the outer pane set down in
        # the skin there is three quarters of an inch between the two (No. 7's ports were "multi-pane": Results, p. 19)
        pane = MeshBuilder()
        pane.lathe(prof([(PORT_BORE - 0.36, -0.5), (0.0, -0.5)]), 48, matrix=wall.frame(t, z), flip=True)
        obj = pane.build(f"CrewCabin_PortPane_{k}", c.M["glass"], c.g)
        obj["label"], obj["about"] = "Porthole", "The inner pane of one of spacecraft No. 7's two ports: the one that held the cabin's pressure."


PORT_FLIP = False
PORT_BORE = 3.72  # the hole through the wall for a port, radius: a hair over the hole in the skin (the flight's spacecraft.md)
PORT_RING = 5.7  # the bolted ring round it inside, radius: estimated from NASM2021-00147

# --------------------------------------------------------------------------- the couch


def couch(c: Cabin, pilot: dict, seat) -> None:
    """The contour couch: a fibreglass shell with a liner, moulded to the pilot (SEDR 104, 1-6),
    here laid under the model's own seated figure: a pan under the head, back and seat, a rest
    behind the thighs, one under the calves and one under the heels, each with a raised lip."""
    shell, liner = c.into("CrewCabin_Couch"), c.into("CrewCabin_CouchLiner")

    def pan(a, b, thick: float, width: float, lip: float, lipw: float = 1.6) -> None:
        a, b = Vector((0, *a)), Vector((0, *b))
        along = b - a
        length = along.length
        f = Matrix.Translation((a + b) / 2 * IN) @ Matrix.Rotation(math.atan2(along.z, along.y), 4, "X") @ Matrix.Scale(IN, 4)
        hw, hl, ht = width / 2, length / 2, thick / 2
        xs = [-hw, -hw + lipw * 0.35, -hw + lipw * 0.7, -hw + lipw, 0.0, hw - lipw, hw - lipw * 0.7, hw - lipw * 0.35, hw]

        def rise(x: float) -> float:
            k = max(0.0, (abs(x) - (hw - lipw)) / lipw)
            return ht + lip * k * k * (3 - 2 * k)

        liner.grid(lambda x, y: f @ Vector((x, y, rise(x))), xs, (-hl, hl))
        shell.grid(lambda x, y: f @ Vector((x, y, -ht)), xs, (-hl, hl), flip=True)
        for sy in (-1, 1):  # the ends, following the lip
            shell.grid(lambda x, k, sy=sy: f @ Vector((x, sy * hl, -ht + (rise(x) + ht) * k)), xs, (0.0, 1.0), flip=sy > 0)
        for sx in (-1, 1):
            shell.grid(lambda y, k, sx=sx: f @ Vector((sx * hw, y, -ht + (rise(hw) + ht) * k)), (-hl, hl), (0.0, 1.0), flip=sx < 0)

    pan((-31.0, 2.2), (-20.6, 2.2), 1.2, 15.0, 3.2, 2.0)  # head rest, a step below the back, with wings beside the helmet
    pan((-20.0, 2.9), (7.4, 2.9), 1.6, 27.0, 1.5)  # back, wide enough for the arms to lie on
    pan((7.4, 3.3), (11.0, 4.7), 1.4, 24.0, 1.5)  # seat, rising behind the hips
    pan((11.2, 4.9), (11.5, 13.5), 1.2, 22.0, 1.2)  # and up the back of the thighs
    pan((10.2, 21.6), (21.4, 17.1), 1.2, 17.0, 1.4)  # under the calves
    pan((25.3, 16.2), (25.5, 21.8), 0.6, 14.0, 0.6, 1.0)  # foot rest, under the heels
    for y, z0, z1 in ((16.5, 5.5, 18.6), (25.4, 2.0, 16.4)):  # struts carrying the leg rest down to the floor
        for x in (-8.3, 8.3):
            shell.tube((x * IN, y * IN, z0 * IN), (x * IN, y * IN, z1 * IN), 0.5 * IN, 10)


# --------------------------------------------------------------------------- the main panel

MAIN_OUTLINE_PX = [
    (905, 1360),
    (1088, 1360),
    (1088, 935),
    (1553, 935),
    (1553, 1360),
    (1875, 1360),
    (1893, 1342),
    (1893, 625),
    (1700, 478),
    (1040, 478),
    (985, 490),
    (940, 520),
    (915, 565),
    (905, 620),
]


def toggle(c: Cabin, F: Matrix, u: float, v: float, way: str, up: bool = True) -> None:
    """A toggle switch: a hexagonal nut, a red seal, and the lever thrown one way."""
    c.turned("CrewCabin_PanelFittings", F, u, v, [(0.2, 0.0), (0.2, 0.09), (0.13, 0.09), (0.13, 0.16), (0.0, 0.16)], 6)
    c.turned("CrewCabin_RedCaps", F, u, v, [(0.17, 0.165), (0.07, 0.21)], 10)
    lean = 0.42 * (1 if up else -1)
    tip = Vector((lean, 0, 0.62)) if way == "h" else Vector((0, lean, 0.62))
    c.into("CrewCabin_PanelFittings").tube(F @ Vector((u, v, 0.18)), F @ (Vector((u, v, 0.18)) + tip), 0.055 * IN, 8)


def telelight(c: Cabin, F: Matrix, faces: Sheet, name: str, legend: str, u: float, v: float, w: float = 0.0, size=(2.5, 0.95)) -> None:
    """A telelight: a black housing and a lens with its legend, which the viewer lights. The lens is its own mesh."""
    su, sv = size
    # a housing standing proud of the plate, its rim round a lens set down inside it, and a gap to the next
    c.box("CrewCabin_Bezels", F, u, v, su + 0.24, sv + 0.24, w, w + 0.3)
    c.rim("CrewCabin_Bezels", F, u, v, su + 0.02, sv + 0.02, 0.11, w + 0.25, w + 0.62)
    rg = faces.take(su, sv, 110, -su / 2, -sv / 2)
    # a smoked lens in a black housing, its legend engraved dark, as the flown capsule's are (NASM2021-00147)
    rg.rect(-su / 2, -sv / 2, su / 2, sv / 2, (0.34, 0.35, 0.34))
    rg.rect(-su / 2 + 0.06, -sv / 2 + 0.06, su / 2 - 0.06, sv / 2 - 0.06, (0.56, 0.57, 0.55), r=0.06)
    rg.text(legend, 0, 0, 0.2 if "\n" not in legend else 0.17, INK)
    lens = Cabin(c.g, c.vessel, c.M)
    lens.box("lens", F, u, v, su, sv, w + 0.2, w + 0.44, rg, 0.0, 0.0)
    obj = lens.mb["lens"].build(f"Tele_{name}", c.M["telelight"], c.g, smooth=False)
    obj["reach"] = math.hypot(su, sv) / 2 * IN
    c.lenses.append(obj)


def round_dial(
    c: Cabin, F: Matrix, faces: Sheet, name: str, spec: dict, u: float, v: float, r: float, w: float = 0.0, ppi: float = 125, rim: bool = False
) -> None:
    """A round instrument: its face a little behind the bezel's lip, a needle on its pivot, a glass over it. With `rim`,
    a bright ring round the glass on the bezel's lip, as the flown capsule's instruments have (NASM2021-00147)."""
    rg = faces.take(2 * r, 2 * r, ppi, -r, -r)
    draw_dial(rg, r * 0.92, spec["scale"], spec["majors"], spec["minor"], spec["titles"], sectors=spec.get("sectors", ()))
    c.turned("CrewCabin_Bezels", F, u, v, [(r + 0.14, 0.0), (r + 0.14, 0.3), (r * 0.94, 0.3), (r * 0.92, 0.06)], 32, w)
    c.disc("CrewCabin_Instruments", F, u, v, r * 0.93, w + 0.06, rg)
    c.disc("CrewCabin_InstrumentGlass", F, u, v, r * 0.93, w + 0.25, None, 20)
    if rim:
        c.turned(
            "CrewCabin_PanelFittings", F, u, v, [(r * 0.955, 0.24), (r * 0.955, 0.37), (r * 0.99, 0.4), (r * 1.03, 0.37), (r * 1.03, 0.24)], 32, w
        )
    pv = -r * 0.62 if spec.get("fan") else 0.0  # a fan-scale meter's needle is pivoted below its face
    rest = scale_at(spec["scale"], spec["rest"])
    shape = pointer(r * (1.5 if spec.get("fan") else 0.8), r * 0.09, r * (0.0 if spec.get("fan") else 0.22), hub=0.0 if spec.get("fan") else r * 0.13)
    c.node(
        f"Gauge_{name}",
        f"needle_{spec['pointer']}",
        F,
        u,
        v + pv,
        w + 0.13,
        shape,
        spin=-math.radians(rest),
        turn=turn_scale(spec["scale"]),
        rest=float(spec["rest"]),
    )
    if spec.get("fan"):
        c.box("CrewCabin_Bezels", F, u, v - r * 0.63, r * 1.25, r * 0.6, w + 0.0, w + 0.2)  # the mask the needle's pivot is under


def main_panel(c: Cabin, P: Matrix, sheet: Sheet, faces: Sheet) -> None:
    outline = [fig(*p) for p in MAIN_OUTLINE_PX]
    us, vs = [p[0] for p in outline], [p[1] for p in outline]
    rg = sheet.take(max(us) - min(us), max(vs) - min(vs) + 0.4, 74, min(us), min(vs) - 0.4)
    # the seam between the centre and right sections, and the screws along the edges
    seam = fig(1565, 0)[0]
    rg.line((seam, fig(0, 478)[1]), (seam, fig(0, 935)[1]), 0.03, (0.38, 0.39, 0.39))
    for px, py in (
        (925, 640),
        (925, 1000),
        (925, 1340),
        (1070, 1340),
        (1070, 960),
        (1060, 500),
        (1300, 492),
        (1545, 492),
        (1545, 700),
        (1545, 920),
        (1585, 492),
        (1690, 492),
        (1875, 640),
        (1875, 900),
        (1875, 1200),
        (1860, 1345),
        (1585, 1345),
        (1585, 920),
        (1210, 700),
        (1330, 920),
    ):
        rg.screw(*fig(px, py))
    # riveted sheet in sections: a row of screws round the edge and down each side of the seam
    rg.edge_screws(outline)
    for side in (-0.35, 0.35):
        for k in range(7):
            rg.screw(seam + side, fig(0, 520)[1] - k * 1.85, 0.09)
    c.flat("CrewCabin_InstrumentPanel", P, outline, rg)
    c.skirt("CrewCabin_PanelStructure", P, outline, 0.0, -0.9)
    c.flat("CrewCabin_PanelStructure", P, outline, None, -0.9, flip=True)

    for name, spec in ROUND.items():
        (u, v), r = fig(*spec["at"]), spec["d"] * S / 2
        round_dial(c, P, faces, name, spec, u, v, r, rim=True)
        c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -4.2)), r * 0.95 * IN, 12)  # its case behind the panel
    # the blanked hole of an instrument not flown (Figure 3.1-2 draws it empty)
    u, v = fig(1632, 870)
    rg.ring(u, v, 0, 1.15, (0.55, 0.56, 0.55))
    rg.ring(u, v, 1.1, 1.15, (0.4, 0.41, 0.41))

    attitude(c, P, faces)
    clock(c, P, faces)

    label = lambda body, px, py, cap=0.16, **kw: rg.text(body, *fig(px, py), cap, INK, **kw)  # noqa: E731
    for (px, py), name, (a, b), way in MAIN_SWITCHES:
        u, v = fig(px, py)
        toggle(c, P, u, v, way)
        rg.text(name, u, v + 0.62 + (0.1 if "\n" in name else 0), 0.18, INK)
        if way == "h":
            rg.text(a, u - 0.42, v, 0.14, INK, align="r")
            rg.text(b, u + 0.42, v, 0.14, INK, align="l")
        else:
            rg.text(a, u, v + 0.36, 0.14, INK)
            rg.text(b, u, v - 0.42, 0.14, INK)
    for name, legend, at in OTHER_LIGHTS:
        telelight(c, P, faces, name, legend, *fig(*at), size=(1.75, 0.95) if "\n" not in legend else (1.75, 1.05))

    # the O2 emergency flow light, alone on its plate (the two water lights of the figure were not flown: Figure 10.1-1 lists only this one)
    u, v = fig(1858, 740)
    rg.rect(u - 0.85, v - 0.5, u + 0.85, v + 2.9, (0.57, 0.58, 0.57), r=0.1)
    c.turned("CrewCabin_PanelFittings", P, u, v, [(0.3, 0.0), (0.3, 0.12), (0.22, 0.12)], 16)
    c.node("Tele_O2EmergFlow", "amber", P, u, v, 0.0, lambda mb: mb.lathe([(0.22, 0.1), (0.2, 0.3), (0.0, 0.36)], 14))
    rg.text("O2\nEMERG\nFLOW", u - 0.75, v + 0.1, 0.14, INK, align="r")

    # TIME ZERO: a guarded push button under a white cap
    u, v = fig(1275, 890)
    c.turned("CrewCabin_PanelFittings", P, u, v, [(0.42, 0.0), (0.42, 0.12), (0.3, 0.12)], 20)
    c.turned("CrewCabin_WhiteCaps", P, u, v, [(0.3, 0.1), (0.3, 0.75), (0.22, 0.9), (0.0, 0.9)], 16)
    label("TIME ZERO", 1275, 842)

    # the three switch-fuses under the altimeter
    u, v = fig(990, 1035)
    rg.rect(u - 1.75, v - 1.25, u + 1.75, v + 1.25, BLACK, r=0.08)
    for i, name in enumerate(("RETRO\nJETT", "SUIT\nFAN", "ENVR\nCONTL")):
        fuse(c, P, u + (i - 1) * 1.1, v - 0.35)
        rg.text(name, u + (i - 1) * 1.1, v + 0.78, 0.12, WHITE)

    # the pilot-observer camera's lens, looking back at him from beside the periscope
    u, v = fig(1035, 1185)
    c.turned("CrewCabin_Bezels", P, u, v, [(1.05, 0.0), (1.05, 0.5), (0.8, 0.6), (0.72, 0.3)], 28)
    c.disc("CrewCabin_InstrumentGlass", P, u, v, 0.72, 0.3, None, 16)
    c.disc("CrewCabin_Bezels", P, u, v, 0.74, 0.12, None, 16)

    # D.C. volts selector: a black rotary knob
    u, v = fig(1635, 1088)
    c.turned("CrewCabin_Knobs", P, u, v, [(0.8, 0.0), (0.8, 0.12), (0.5, 0.2), (0.45, 0.62), (0.0, 0.62)], 12)
    label("D.C. VOLTS", 1650, 1048)
    for i, mark in enumerate(("1", "2", "3", "4", "M", "S")):
        x, y = clock_xy(-100 + 40 * i, 1.0)
        rg.text(mark, u + x, v + y, 0.125, INK)

    # communications: the audio box, three thumbwheels and a key
    u0, v0 = fig(1580, 1335)
    u1, v1 = fig(1805, 1258)
    rg.rect(u0, v0, u1, v1, (0.52, 0.53, 0.52), r=0.1)
    rg.text("COMM AUDIO", (u0 + u1) / 2, v0 + 0.16, 0.14, INK)
    for i, name in enumerate(("HF", "UHF", "CMD")):
        uu = u0 + 1.6 + i * 1.0
        c.box("CrewCabin_Knobs", P, uu, (v0 + v1) / 2 + 0.1, 0.6, 1.0, 0.0, 0.16)
        rg.text(name, uu, v1 - 0.16, 0.125, INK)
    c.turned("CrewCabin_Knobs", P, u0 + 0.55, (v0 + v1) / 2 + 0.1, [(0.3, 0.0), (0.3, 0.2), (0.0, 0.2)], 12)
    rg.text("KEY", u0 + 0.55, v1 - 0.16, 0.125, INK)
    toggle(c, P, u1 - 0.75, (v0 + v1) / 2 + 0.1, "h")
    rg.text("UHF DF", u1 - 0.75, v1 - 0.16, 0.125, INK)


# Where the two harnesses leave the back of the panel for the wall, (x, y, station): stowage() runs them on down.
HARNESS_FROM = ((-9.0, 3.0, 35.0), (12.0, -2.0, 35.5))


def behind_panel(c: Cabin, P: Matrix) -> None:
    """What is behind the main panel, seen from the hatch and in the cutaway: a connector in a red cap on the back of
    each round instrument's case, a lead from each to a laced trunk across the panel's back, and the trunk on to the
    two harnesses that go down the walls (NASM2021-00147 and -00153 show the harnesses and red-capped connectors where
    they leave the instruments). Which instrument's lead goes where, the trunk's run and every size are estimated."""
    loom, caps, fit = c.into("CrewCabin_Leads"), c.into("CrewCabin_Connectors"), c.into("CrewCabin_Clips")
    at = lambda u, v, w: Vector(P @ Vector((u, v, w)))  # noqa: E731  (P takes panel inches to metres)
    back, trunk_v, trunk_w = -4.2, 9.0, -7.5  # the cases' backs, and where the trunk runs (panel inches)
    laced = lambda s, th: 0.22 if (s * 14) % 1.0 < 0.12 else 0.0  # noqa: E731  (a tie every inch and a half or so)
    cases = sorted(((*fig(*spec["at"]), spec["d"] * S / 2) for spec in ROUND.values()), key=lambda q: q[0])
    for i, (u, v, r) in enumerate(cases):
        # the case's back: a cap with its rim, and the connector in its red cap standing off it
        c.turned("CrewCabin_Equipment", P, u, v, [(r * 0.95 + 0.06, 0.0), (r * 0.95 + 0.06, -0.25), (r * 0.7, -0.32), (0.0, -0.32)], 16, back + 0.05)
        cu = u + r * 0.35
        caps.tube(at(cu, v, back - 0.2), at(cu, v, back - 0.85), 0.26 * IN, 10)
        # its lead, straight back out of the connector, then at a depth of its own (so that leads from instruments one
        # above another pass each other) over to the trunk, joining it at a place of its own along it
        deep = back - 1.8 - 0.32 * (i % 4)
        end = -5.5 + 11.0 * i / (len(cases) - 1)
        run_ = [at(cu, v, back - 0.5), at(cu, v, back - 1.2), at(cu, v, deep), at((cu + end) / 2, (v + trunk_v) / 2, deep), at(end, trunk_v, trunk_w)]
        loom.loft(run_, [(0.11 * IN, 0.11 * IN)] * len(run_), 6, resample=6)
    # the trunk across the back, its ends by the red-capped connectors where the two harnesses leave for the walls
    # (stowage(): HARNESS_FROM and the connectors beside each)
    path = [(-9.0, 4.8, -9.2), (-10.0, 7.0, -8.6), (-6.0, trunk_v, trunk_w), (0.0, trunk_v, trunk_w), (6.0, trunk_v, trunk_w), (10.0, 8.3, -7.4)]
    path += [(11.2, 7.4, -7.3)]
    thick = [(0.3, 0.3), (0.5, 0.42), (0.55, 0.45), (0.55, 0.45), (0.55, 0.45), (0.5, 0.42), (0.3, 0.3)]
    c.into("CrewCabin_Trunk").loft([at(*q) for q in path], [(a * IN, b * IN) for a, b in thick], 12, resample=10, ripple=laced)
    # held off the panel's back by clips on stand-offs
    gap = 11.0 / (len(cases) - 1)
    for u in (-5.5 + gap * (round((x + 5.5) / gap - 0.5) + 0.5) for x in (-3.0, 3.0)):  # (between two leads' ends)
        fit.tube(at(u, trunk_v + 0.2, -0.9), at(u, trunk_v + 0.2, trunk_w), 0.12 * IN, 8)
        fit.box((0.35 * IN, 1.6 * IN, 1.6 * IN), P @ Matrix.Translation((u, trunk_v, trunk_w)) @ Matrix.Scale(1 / IN, 4))


def fuse(c: Cabin, F: Matrix, u: float, v: float) -> None:
    """A switch-fuse: a black body with its lever, a white bar across it, thrown up (No. 1)."""
    c.box("CrewCabin_Knobs", F, u, v, 0.62, 1.0, 0.0, 0.3)
    c.into("CrewCabin_Knobs").box(
        (0.5 * IN, 0.22 * IN, 0.6 * IN), F @ Matrix.Translation((u, v + 0.25, 0.5)) @ Matrix.Rotation(-0.5, 4, "X") @ Matrix.Scale(1 / IN, 4)
    )
    c.into("CrewCabin_WhiteCaps").box(
        (0.62 * IN, 0.34 * IN, 0.1 * IN),
        F @ Matrix.Translation((u, v + 0.25, 0.5)) @ Matrix.Rotation(-0.5, 4, "X") @ Matrix.Translation((0, 0, 0.32)) @ Matrix.Scale(1 / IN, 4),
    )


def attitude(c: Cabin, P: Matrix, faces: Sheet, box=None, k: float = 1.0) -> None:
    """The attitude and rate indicator: roll, pitch and yaw each on a dial of its own round a
    square rate indicator whose three needles slide. No ball: Mercury's was three pointers.
    `box`: its corners on the panel, (left, top) and (right, bottom), where they are not capsule 7's; `k`: its
    dials' size beside capsule 7's."""
    (u0, v1), (u1, v0) = box or (fig(1175, 497), fig(1460, 663))
    cu, cv, hw, hh = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2, (v1 - v0) / 2
    rg = faces.take(2 * hw, 2 * hh, 125, -hw, -hh)
    rg.rect(-hw, -hh, hw, hh, BLACK)
    c.rim("CrewCabin_Bezels", P, cu, cv, 2 * hw - 0.1, 2 * hh - 0.1, 0.22, 0.0, 0.34)
    rect = [(cu - hw, cv - hh), (cu + hw, cv - hh), (cu + hw, cv + hh), (cu - hw, cv + hh)]
    c.flat("CrewCabin_Instruments", P, rect, Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 + cu, rg.v0 + cv), 0.08)
    c.flat("CrewCabin_InstrumentGlass", P, rect, None, 0.29)
    c.into("CrewCabin_Equipment").box((2 * hw * IN, 2 * hh * IN, 5.0 * IN), P @ Matrix.Translation((cu, cv, -3.5)) @ Matrix.Scale(1 / IN, 4))
    for name, d in ATTITUDE.items():
        x, y = d["at"][0] * k, d["at"][1] * k
        r = d["r"] * k
        # drawn in place: the dial's own coordinates are the indicator's, moved to its middle
        sub = Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 - x, rg.v0 - y)
        for value in range(-180, 180, 10):
            a = scale_at(d["scale"], value)
            sub.line(clock_xy(a, r), clock_xy(a, r * (0.8 if value % 30 == 0 else 0.88)), 0.022 if value % 30 == 0 else 0.014, WHITE)
        for value, text in d["majors"]:
            sub.text(text, *clock_xy(scale_at(d["scale"], value), r * 0.6), 0.15, WHITE)
        sub.text(d["title"], 0, -r * 0.3, 0.12, WHITE)
        if name == "Pitch":  # the attitudes to hold: 34 degrees nose down for retrofire, 14.5 in orbit (SEDR 104, Figure 12-3)
            for value, text in ((-34, "RETRO"), (-14.5, "ORBIT")):
                a = scale_at(d["scale"], value)
                sub.line(clock_xy(a, r), clock_xy(a, r * 0.72), 0.03, (0.9, 0.9, 0.86))
                sub.text(text, *clock_xy(a + (9 if value < -20 else -9), r * 0.42), 0.055, WHITE)
        shape = pointer(r * 0.82, 0.17 if name == "Yaw" else 0.1, 0.0, 0.1 if name == "Yaw" else 0.3, hub=0.1)
        c.node(
            f"Gauge_{name}",
            f"needle_{d['colour']}",
            P,
            cu + x,
            cv + y,
            0.17,
            shape,
            spin=-math.radians(scale_at(d["scale"], 0)),
            turn=turn_scale(d["scale"]),
            rest=0.0,
            wrap=360.0,
        )
    # the rate indicator: a square of dots, a bar that rises with pitch rate and two that go aside with roll and yaw rate
    for i in range(13):
        q = (i - 6) / 6 * 0.78 * k
        for x, y in ((q, 0.78 * k), (q, -0.78 * k), (-0.78 * k, q), (0.78 * k, q)):
            rg.ring(x, 0.55 * k + y, 0, 0.018, WHITE)
    slide = [-RATE_FULL, -RATE_TRAVEL * k * IN, RATE_FULL, RATE_TRAVEL * k * IN]

    def bar(length: float, width: float):
        corners = [(-width / 2, -length / 2, 0), (width / 2, -length / 2, 0), (width / 2, length / 2, 0), (-width / 2, length / 2, 0)]
        return lambda mb: mb.add(corners, [(0, 1, 2, 3)])

    c.node("Gauge_RollRate", "needle_blue", P, cu, cv + (0.55 + 0.4) * k, 0.15, bar(0.72 * k, 0.05), slide=slide, rest=0.0)
    c.node("Gauge_YawRate", "needle_yellow", P, cu, cv + (0.55 - 0.4) * k, 0.15, bar(0.72 * k, 0.07), slide=slide, rest=0.0)
    c.node("Gauge_PitchRate", "needle_white", P, cu, cv + 0.55 * k, 0.21, bar(1.5 * k, 0.05), spin=math.pi / 2, slide=slide, rest=0.0)


def clock(c: Cabin, P: Matrix, faces: Sheet, box=None) -> None:
    """The Redstone flights' clock: a twelve-hour watch and a counter of seconds from launch
    (the orbital clock, with its time to retrograde, came later). `box`: its corners where they are not capsule 7's."""
    (u0, v1), (u1, v0) = box or (fig(1332, 688), fig(1545, 915))
    cu, cv, hw, hh = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2, (v1 - v0) / 2
    k = 0.75  # the corners cut off: an octagon
    octagon = [(-hw + k, -hh), (hw - k, -hh), (hw, -hh + k), (hw, hh - k), (hw - k, hh), (-hw + k, hh), (-hw, hh - k), (-hw, -hh + k)]
    rg = faces.take(2 * hw, 2 * hh, 110, -hw, -hh)
    rg.rect(-hw, -hh, hw, hh, (0.05, 0.05, 0.055))
    here = [(cu + x, cv + y) for x, y in octagon]
    c.flat("CrewCabin_Instruments", P, here, Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 + cu, rg.v0 + cv), 0.14)
    c.skirt("CrewCabin_Bezels", P, here, 0.14, 0.0)
    wu, wv, wr = 0.1, 1.45, 1.15  # the watch
    scale = [(0, 0), (12, 360)]
    sub = Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 - wu, rg.v0 - wv)
    sub.ring(0, 0, 0, wr, (0.02, 0.02, 0.02))
    for m in range(60):
        sub.line(clock_xy(m * 6, wr * 0.95), clock_xy(m * 6, wr * (0.82 if m % 5 == 0 else 0.9)), 0.02 if m % 5 == 0 else 0.012, (0.85, 0.7, 0.3))
    for hour in range(1, 13):
        sub.text(str(hour), *clock_xy(scale_at(scale, hour), wr * 0.64), 0.12, (0.85, 0.7, 0.3))
    c.turned("CrewCabin_Bezels", P, cu + wu, cv + wv, [(wr + 0.14, 0.14), (wr + 0.14, 0.5), (wr, 0.5), (wr * 0.98, 0.2)], 32)
    c.disc("CrewCabin_InstrumentGlass", P, cu + wu, cv + wv, wr * 0.98, 0.45, None, 20)
    c.turned("CrewCabin_Knobs", P, cu + wu - 1.25, cv + wv - 0.75, [(0.22, 0.14), (0.22, 0.5), (0.0, 0.5)], 12)  # wind
    rg.text("WIND", -0.9, 0.35, 0.09, WHITE)
    for name, length, width, period in (("Hour", 0.6, 0.1, 43200.0), ("Minute", 0.92, 0.07, 3600.0), ("Second", 0.98, 0.03, 60.0)):
        c.node(
            f"Gauge_Clock{name}",
            "needle_white",
            P,
            cu + wu,
            cv + wv,
            0.22 + 0.06 * ("Hour", "Minute", "Second").index(name),
            pointer(wr * length, width, 0.1, hub=0.06 if name == "Second" else 0.0),
            turn=[0.0, 0.0, period, -TAU],
            wrap=period,
            rest=0.0,
        )
    # the counter: five wheels behind a window
    rg.rect(-1.25, -1.72, 1.25, -1.12, (0.01, 0.01, 0.01), r=0.05)
    rg.text("SECONDS FROM\nLAUNCH", 0, -2.25, 0.1, WHITE)
    rg.text("RESET", hw - 0.42, -1.6, 0.075, WHITE, turn=3)
    digits = faces.take(0.34, 11 * 0.46, 110)
    for d in range(11):  # nought again above the nine: the wheel's skin runs half a digit past a whole turn
        digits.rect(0, d * 0.46, 0.34, (d + 1) * 0.46, (0.80, 0.80, 0.76))
        digits.text(str(d % 10), 0.17, d * 0.46 + 0.23, 0.26, INK)
    for place in range(5):

        def wheel(mb: MeshBuilder) -> None:
            n, r, hw_ = 30, 0.34, 0.2
            verts, uvs = [], []
            for i in range(n + 1):
                a = TAU * i / n
                for sx in (-1, 1):
                    # digit 0 faces the reader at rest; the wheel turns about its own X to bring up the next
                    verts.append((sx * hw_, r * math.sin(a), r * math.cos(a)))
                    uvs.append(digits.uv(0.17 + sx * 0.17, (i / n + 0.05) * 4.6))
            mb.add(verts, [(2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2) for i in range(n)], uvs)

        c.node(f"Gauge_Counter{place}", "drum", P, cu + (1.0 - place * 0.5), cv - 1.42, -0.12, wheel, drum=10.0, place=float(place))
    c.into("CrewCabin_Equipment").box((2 * hw * IN, 2 * hh * IN, 3.6 * IN), P @ Matrix.Translation((cu, cv, -2.8)) @ Matrix.Scale(1 / IN, 4))


# --------------------------------------------------------------------------- the periscope


def periscope(c: Cabin, P: Matrix, sheet: Sheet, out: dict, box=None, station: float | None = None, run=None) -> None:
    """The periscope's display in the middle of the panel, set back in its opening, with its
    housing behind and the tube down between the pilot's legs to the objective in the capsule's
    floor side. The 8 in screen is documented; every other size is off the figure or the photograph.
    `box`: the opening's corners; `station`: where the objective leaves the cone; `run`: the points the tube passes
    between the housing and the objective: each where it is not capsule 7's."""
    (u0, v1), (u1, v0) = box or (fig(1088, 935), fig(1553, 1380))
    rg = sheet.take(u1 - u0, v1 - v0, 64, u0, v0, at=(1216, 1124))
    d = SCOPE_RECESS
    rect = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    c.flat("CrewCabin_Consoles", P, rect, rg, -d)
    c.skirt("CrewCabin_Periscope", P, rect[::-1], 0.0, -d)  # the opening's own walls, facing in
    # the black scale ring, graduated in degrees for the Sun and Moon index
    rg.ring(0, 0, SCREEN_R + 0.05, SCREEN_R + 1.35, BLACK)
    for a in range(0, 360, 2):
        rg.line(clock_xy(a, SCREEN_R + 1.3), clock_xy(a, SCREEN_R + (1.0 if a % 10 == 0 else 1.15)), 0.014, WHITE)
    for a in range(0, 360, 30):
        rg.text(str(a), *clock_xy(a, SCREEN_R + 0.7), 0.1, WHITE)
    for uu, vv in ((u0 + 0.5, v0 + 0.5), (u1 - 0.5, v0 + 0.5), (u1 - 0.5, v1 - 0.5), (u0 + 0.5, v1 - 0.5)):
        rg.screw(uu, vv, 0.14)
    c.turned("CrewCabin_Bezels", P, 0, 0, [(SCREEN_R + 0.22, 0.0), (SCREEN_R + 0.22, 0.16), (SCREEN_R, 0.16), (SCREEN_R - 0.03, 0.05)], 64, -d)
    # the screen itself: what the viewer draws the outside onto
    screen = Cabin(c.g, c.vessel, c.M)
    screen.disc("s", P, 0, 0, SCREEN_R - 0.02, -d + 0.06, None, 64)
    obj = screen.mb["s"].build("Periscope_Screen", c.M["scope_screen"], c.g)
    obj["screen_radius"] = (SCREEN_R - 0.02) * IN
    # its knobs: altitude, drift and reticle brightness on the display (SEDR 104, Figure 12-2), and the filter selector,
    # which the manual has on the left side of the housing (12-14) and is put here at the display's left edge
    for name, (ku, kv), r in (
        ("ALTITUDE", (-4.9, -4.9), 0.55),
        ("DRIFT", (1.6, -5.6), 0.42),
        ("RETICLE", (5.1, -4.9), 0.5),
        ("FILTER", (-5.55, 1.2), 0.5),
    ):
        c.turned("CrewCabin_Knobs", P, ku, kv, [(r, 0.0), (r, 0.45), (r * 0.8, 0.6), (0.0, 0.6)], 14, -d)
        rg.text(name, ku + (1.0 if ku < 0 else -1.0) * (0.0 if name == "DRIFT" else 0.2), kv + r + 0.26, 0.13, WHITE if abs(ku) < 2 else INK)
    rg.rect(u0 + 0.35, v1 - 0.85, u0 + 1.55, v1 - 0.45, BLACK, r=0.05)
    rg.text("RETRACT", u0 + 0.95, v1 - 0.65, 0.12, WHITE)
    c.turned("CrewCabin_PanelFittings", P, u0 + 0.95, v1 - 1.35, [(0.26, 0.0), (0.26, 0.2), (0.0, 0.26)], 12, -d)
    # the upper housing behind the display, and the tube
    body = c.into("CrewCabin_Periscope")
    # (shallow: the pilot's thighs stand just behind its foot)
    body.box(
        ((u1 - u0 - 0.6) * IN, (v1 - v0 - 0.6) * IN, 2.3 * IN),
        P @ Matrix.Translation(((u0 + u1) / 2, (v0 + v1) / 2, -d - 1.3)) @ Matrix.Scale(1 / IN, 4),
    )
    # from the back of the housing up over his knees, then down between his shins and feet to the objective
    top = Vector(P @ Vector((0.0, 2.5, -d - 2.0))) / IN
    foot = c.vessel.p(math.pi / 2, SCOPE_STATION if station is None else station, -0.6) / IN
    between = [Vector(p) for p in (run or ((0.0, 6.0, 35.2), (0.0, 15.5, 36.4)))]
    run_ = [top, *between, foot + (between[-1] - foot).normalized() * 1.2]
    body.loft([p * IN for p in run_], [(1.9 * IN, 1.9 * IN)] * len(run_), 16, ref=(1, 0, 0))
    body.tube((foot - (foot - run_[-2]).normalized() * 6.5) * IN, foot * IN, 2.5 * IN, 20)  # the objective's cartridge
    out["periscope"] = {"screen": tuple(P @ Vector((0, 0, -d + 0.06))), "radius": (SCREEN_R - 0.02) * IN}
    # the map case hangs below the display (SEDR 104, 12-27): a fabric pouch
    soft(c.into("CrewCabin_Stowage"), P @ Matrix.Translation((0.0, v0 - 3.0, -0.9)) @ Matrix.Scale(1 / IN, 4), (8.5, 5.6, 1.5), 0.6)


# Where the objective leaves the cone: level with the upper line of UNITED STATES on the flown capsule (NASM2021-00160, -00165).
# Estimated. (Until November 2026 this was 13, a misreading of the same photographs.)
SCOPE_STATION = 37.0

# --------------------------------------------------------------------------- the consoles


def fuel_gauge(c: Cabin, F: Matrix, faces: Sheet, u: float, v: float, r: float) -> None:
    """Control fuel: one gauge, two needles, the automatic system's on the left and the manual's on the right."""
    fr = faces.take(2 * r, 2 * r, 125, -r, -r)
    left, right = [(0, 215), (100, 325)], [(0, 145), (100, 35)]
    draw_dial(
        fr,
        r * 0.92,
        left,
        [(0, "0"), (50, ""), (100, "")],
        10,
        [("CONTROL\nFUEL", 0, 0.5, 0.05), ("AUTO", -0.3, -0.05, 0.045), ("MAN", 0.32, -0.05, 0.045), ("PERCENT", 0, -0.6, 0.045)],
    )
    for value in range(0, 101, 10):
        a = scale_at(right, value)
        fr.line(clock_xy(a, r * 0.86), clock_xy(a, r * (0.7 if value % 50 == 0 else 0.78)), 0.02, WHITE)
    c.turned("CrewCabin_Bezels", F, u, v, [(r + 0.14, 0.0), (r + 0.14, 0.3), (r * 0.94, 0.3), (r * 0.92, 0.06)], 28)
    c.disc("CrewCabin_Instruments", F, u, v, r * 0.93, 0.06, fr)
    c.disc("CrewCabin_InstrumentGlass", F, u, v, r * 0.93, 0.25, None, 20)
    c.node("Gauge_FuelAuto", "needle_white", F, u, v, 0.12, pointer(r * 0.8, 0.07), spin=-math.radians(325), turn=turn_scale(left), rest=100.0)
    c.node("Gauge_FuelManual", "needle_white", F, u, v, 0.18, pointer(r * 0.8, 0.07), spin=-math.radians(35), turn=turn_scale(right), rest=100.0)


def consoles(c: Cabin, P: Matrix, sheet: Sheet, faces: Sheet) -> None:
    """The left console in its two parts and the fuse panel beyond, each turned further toward
    the pilot; the right console under the hatch."""
    ex, ey, ez = (Vector(P.col[i][:3]).normalized() for i in range(3))
    # the main panel's left edge. (The strip and the console hang lower on it than the figure, which is a flat layout,
    # draws them: by STRIP_DROP and CONSOLE_DROP, so that they clear the cone where the panel leans up into it.)
    edge = Vector(P @ Vector((fig(905, 0)[0], -STRIP_DROP, 0))) / IN
    a = STRIP_CANT
    sx = ex * math.cos(a) - ez * math.sin(a)
    Sx = plane(edge, sx, ey)  # u runs back from the hinge: the strip is u from -6.7 to 0
    sfig = lambda px, py: ((px - 830) * S, (FIG_C[1] - py) * S)  # noqa: E731
    strip = [sfig(585, 1350), sfig(830, 1345), sfig(830, 415), sfig(585, 620)]
    rg = sheet.take(strip[1][0] - strip[0][0], strip[2][1] - strip[0][1], 74, strip[0][0], strip[0][1], at=(0, 0))
    rg.edge_screws(strip)
    c.flat("CrewCabin_Consoles", Sx, strip, rg)
    c.skirt("CrewCabin_PanelStructure", Sx, strip, 0.0, -0.7)
    c.flat("CrewCabin_PanelStructure", Sx, strip, None, -0.7, flip=True)
    lu, ou = sfig(765, 0)[0], sfig(685, 0)[0]
    for name, legend, kind, py in SEQUENCE:
        v = sfig(0, py)[1]
        telelight(c, Sx, faces, name, legend, lu, v)
        if kind == "ring":  # a pull ring on its stem, hanging from the panel

            def ring(mb: MeshBuilder) -> None:
                mb.lathe([(0.09, 0.0), (0.09, 0.5), (0.0, 0.5)], 8)
                tube = [(0.4 + 0.08 * math.cos(TAU * k / 8), 0.08 * math.sin(TAU * k / 8)) for k in range(9)]
                mb.lathe(tube, 16, matrix=Matrix.Translation((0, -0.2, 0.62)) @ Matrix.Rotation(math.pi / 2 - 0.5, 4, "X"))

            c.turned("CrewCabin_PanelFittings", Sx, ou, v, [(0.2, 0.0), (0.2, 0.1), (0.1, 0.1)], 10)
            c.node(f"Ctl_{name}", "lever", Sx, ou, v, 0.08, ring, pull=1.2 * IN)
        elif kind == "button":  # a push button in a black collar; RETRO FIRE and JETT RETRO are guarded
            c.turned("CrewCabin_Knobs", Sx, ou, v, [(0.36, 0.0), (0.36, 0.3), (0.26, 0.3)], 14)
            if name in ("RetroFire", "JettRetro"):  # guarded (Figure 3.1-2): a collar standing round the button
                c.turned("CrewCabin_PanelFittings", Sx, ou, v, [(0.52, 0.0), (0.52, 0.62), (0.44, 0.62), (0.44, 0.0)], 16)
            c.node(f"Ctl_{name}", "red", Sx, ou, v, 0.0, lambda mb: mb.lathe([(0.25, 0.2), (0.25, 0.42), (0.0, 0.46)], 12), press=0.12 * IN)
        else:
            toggle(c, Sx, ou, v, "v")
            rg.text("RETRO ATT\nBY-PASS", ou - 1.2, v + 0.3, 0.125, INK)
            rg.text("AUTO RET\nATTITUDE", ou - 1.2, v - 0.35, 0.125, INK)
    for label_, py in (("PULL TO\nPRESSURIZE\nPUSH TO RESET", 1140), ("PULL OPEN\nDE-COMPRESS\nPUSH CLOSED", 1192)):
        v = sfig(0, py)[1]
        rg.text(label_, lu, v, 0.14, INK)
        c.turned("CrewCabin_WhiteCaps", Sx, ou, v, [(0.12, 0.0), (0.12, 0.5), (0.4, 0.55), (0.42, 0.85), (0.0, 0.9)], 14)
    v = sfig(0, 1240)[1]
    toggle(c, Sx, ou - 0.6, v, "h")
    rg.text("RESCUE AIDS", lu, v, 0.14, INK)
    u, v = sfig(733, 540)
    toggle(c, Sx, u, v, "v")
    rg.text("SIGNAL\nLIGHTS\nTEST", u, v + 0.75, 0.125, INK)
    u, v = sfig(795, 522)
    c.turned("CrewCabin_PanelFittings", Sx, u, v, [(0.22, 0.0), (0.22, 0.1), (0.15, 0.1)], 12)
    c.node("Tele_GroundComm", "red_lamp", Sx, u, v, 0.0, lambda mb: mb.lathe([(0.15, 0.08), (0.13, 0.24), (0.0, 0.28)], 12))
    rg.text("GROUND\nCOMM", u, v + 0.55, 0.125, INK)
    rg.text("RETRO\nRESET", u, v - 0.6, 0.125, INK)
    for i in range(3):  # where the 1960 panel had LAUNCH OXY: three blanked holes
        rg.ring(sfig(740 + 28 * i, 0)[0], sfig(0, 603)[1], 0, 0.3, (0.55, 0.56, 0.55))

    # the console's outer part, hinged on the strip's far edge and turned further
    hinge = Vector(Sx @ Vector((strip[0][0], STRIP_DROP - CONSOLE_DROP, 0))) / IN
    b = CONSOLE_CANT
    cx = ex * math.cos(b) - ez * math.sin(b)
    Cx = plane(hinge, cx, ey)
    cfig = lambda px, py: ((px - 585) * S, (FIG_C[1] - py) * S)  # noqa: E731
    part = [cfig(355, 1362), cfig(585, 1352), cfig(585, 690), cfig(520, 705), cfig(460, 790), cfig(235, 822)]
    rg2 = sheet.take(part[1][0] - part[5][0], part[2][1] - part[0][1], 74, part[5][0], part[0][1], at=(502, 0))
    rg2.edge_screws(part)
    c.flat("CrewCabin_Consoles", Cx, part, rg2)
    c.skirt("CrewCabin_PanelStructure", Cx, part, 0.0, -0.7)
    c.flat("CrewCabin_PanelStructure", Cx, part, None, -0.7, flip=True)
    for (px, py), name, (p0, p1), way in CONSOLE_SWITCHES:
        u, v = cfig(px, py)
        toggle(c, Cx, u, v, way)
        rg2.text(name, u, v + 0.68 + (0.1 if "\n" in name else 0), 0.14, INK)
        rg2.text(p0, u, v + 0.36, 0.125, INK)
        rg2.text(p1, u, v - 0.42, 0.125, INK)
    for name, text, (px, py), mat in (
        ("HeatersOn", "HTR'S ON", (338, 945), "amber"),
        ("RetroCold", "RETRO\nROCKETS\nCOLD", (352, 1058), "red_lamp"),
        ("LandingBag", "", (382, 1127), "green_lamp"),
    ):
        u, v = cfig(px, py)
        c.turned("CrewCabin_PanelFittings", Cx, u, v, [(0.22, 0.0), (0.22, 0.1), (0.15, 0.1)], 12)
        c.node(f"Tele_{name}", mat, Cx, u, v, 0.0, lambda mb: mb.lathe([(0.15, 0.08), (0.13, 0.24), (0.0, 0.28)], 12))
        if text:
            rg2.text(text, u + 0.3, v, 0.125, INK, align="l")
    fuel_gauge(c, Cx, faces, *cfig(455, 968), 78 * S / 2)
    # the snorkel's pull handle, the landing bag's switch, and the four fuel shut-off handles down the inner edge
    u, v = cfig(440, 1070)
    c.into("CrewCabin_WhiteCaps").tube(Cx @ Vector((u - 0.9, v, 0.5)), Cx @ Vector((u + 0.9, v, 0.5)), 0.2 * IN, 10)
    c.into("CrewCabin_PanelFittings").tube(Cx @ Vector((u, v, 0.0)), Cx @ Vector((u, v, 0.5)), 0.08 * IN, 8)
    rg2.text("WARNING\nPULL OPEN SNORKEL\nONLY BELOW 20,000 FT", u + 0.2, v - 0.75, 0.125, INK)
    for name, py in (("MANUAL", 950), ("ROLL", 1065), ("YAW", 1165), ("PITCH", 1270)):
        u, v = cfig(552, py)
        # a T-handle: its grip a rounded bar across the stem, lying along the console (NASM2021-00147), on a stem in a collar
        grip = [(0.0, 0.0), (0.16, 0.03), (0.25, 0.16), (0.27, 0.5), (0.24, 1.0), (0.27, 1.5), (0.25, 1.84), (0.16, 1.97), (0.0, 2.0)]
        c.into("CrewCabin_Knobs" if name == "MANUAL" else "CrewCabin_PanelFittings").lathe(
            grip, 14, matrix=Cx @ Matrix.Translation((u, v - 1.0, 0.78)) @ Matrix.Rotation(-math.pi / 2, 4, "X")
        )
        c.turned("CrewCabin_PanelFittings", Cx, u, v, [(0.24, 0.0), (0.24, 0.14), (0.11, 0.2), (0.09, 0.2), (0.09, 0.6), (0.0, 0.6)], 12)
        rg2.text(name, u - 0.55, v, 0.14, INK, turn=1)
    # the fuse panel, on the wall beyond the console
    # (on the wall at the pilot's left elbow, facing across the cabin: its own place, not hung from the console)
    Fx = plane(Vector(FUSE_AT), Vector((0.07, 0.0, 1.0)), Vector((0.0, -1.0, 0.0)))
    fw, fh = 8.6, 15.0
    rect = [(-fw, -fh / 2), (0, -fh / 2), (0, fh / 2), (-fw, fh / 2)]
    rg3 = sheet.take(fw, fh, 74, -fw, -fh / 2, at=(1216, 0))
    rg3.edge_screws(rect)
    c.flat("CrewCabin_Consoles", Fx, rect, rg3)
    c.skirt("CrewCabin_PanelStructure", Fx, rect, 0.0, -0.6)
    c.flat("CrewCabin_PanelStructure", Fx, rect, None, -0.6, flip=True)
    for row, names in enumerate(FUSES):
        v = fh / 2 - 1.9 - row * 2.75
        rg3.rect(-fw + 0.25, v - 0.75, -fw + 0.25 + len(names) * 1.14 + 0.2, v + 0.75, BLACK, r=0.06)
        rg3.text("1 UP", -0.5, v + 0.5, 0.11, (0.6, 0.5, 0.1))
        rg3.text("2 DN", -0.5, v - 0.5, 0.11, (0.6, 0.5, 0.1))
        for i, name in enumerate(names):
            u = -fw + 0.92 + i * 1.14
            fuse(c, Fx, u, v)
            rg3.text(name, u, v + 1.22, 0.125, INK)
    # the right console, under the hatch: the emergency oxygen lever and the suit and cabin temperature selectors
    R = plane(Vector((24.6, 3.5, 15.5)), Vector((0.26, -0.966, 0)), Vector((-0.33, -0.09, 0.94)))
    rw, rh = 6.6, 8.2
    rect = [(-rw / 2, -rh / 2), (rw / 2, -rh / 2), (rw / 2, rh / 2), (-rw / 2, rh / 2)]
    rg4 = sheet.take(rw, rh, 74, -rw / 2, -rh / 2, at=(502, 1368))
    rg4.edge_screws(rect)
    c.flat("CrewCabin_Consoles", R, rect, rg4)
    c.skirt("CrewCabin_PanelStructure", R, rect, 0.0, -2.2)
    rg4.text("EMER O2", 0, 3.5, 0.14, INK)
    rg4.text("EMER", -1.2, 3.05, 0.125, INK)
    rg4.text("NORM", 1.2, 3.05, 0.125, INK)
    c.into("CrewCabin_RedCaps").tube(R @ Vector((-2.2, 3.0, 0.3)), R @ Vector((-2.9, 3.4, 0.9)), 0.28 * IN, 10)
    for name, v in (("SUIT TEMP", 1.2), ("CABIN TEMP", -1.8)):
        rg4.text(name, 0.9, v + 1.0, 0.09, INK)
        rg4.text("COOLER", -2.0, v + 0.6, 0.125, INK)
        c.turned("CrewCabin_Knobs", R, -0.3, v, [(0.55, 0.0), (0.55, 0.4), (0.0, 0.45)], 14)
        c.into("CrewCabin_Knobs").box(
            (2.0 * IN, 0.5 * IN, 0.35 * IN), R @ Matrix.Translation((0.5, v + 0.25, 0.33)) @ Matrix.Rotation(0.45, 4, "Z") @ Matrix.Scale(1 / IN, 4)
        )


# --------------------------------------------------------------------------- the controls


def controls(c: Cabin, seat, pilot: dict, out: dict) -> None:
    """The three-axis hand controller under the right hand and the abort handle under the left
    (Results of the First U.S. Manned Suborbital Space Flight, p. 22), each where the model's
    pilot has his hand: a black grip on a pivot, with its push-rods and bracket simplified to a box."""
    for side, sx, name in (("right", 1, "Ctl_HandController"), ("left", -1, "Ctl_Abort")):
        grip = seat(pilot["grips"][side])
        base = Vector((grip.x, grip.y, grip.z - 4.2))
        c.into("CrewCabin_Equipment").box(
            (3.2 * IN, 3.6 * IN, (base.z - 3.2) * IN), Matrix.Translation(Vector((base.x + sx * 0.6, base.y, (base.z + 3.2) / 2)) * IN)
        )
        F = plane(base, Vector((1, 0, 0)), Vector((0, 1, 0)))

        def shape(mb: MeshBuilder, name=name) -> None:
            mb.lathe([(0.5, 0.0), (0.42, 0.5), (0.62, 1.2), (0.78, 2.6), (0.74, 4.0), (0.55, 4.6), (0.0, 4.7)], 14)
            if name == "Ctl_Abort":  # the lock's release on its top
                mb.lathe([(0.3, 4.6), (0.3, 5.0), (0.0, 5.05)], 10)

        obj = c.node(name, "grip", F, 0, 0, 0, shape)
        obj.data.shade_smooth()
        out[name] = tuple(base * IN)


# --------------------------------------------------------------------------- stowage


def stowage(
    c: Cabin,
    portholes,
    out: dict,
    lamps_at=(-128.0, -52.0),
    fuse_wiring: bool = True,
    panel_camera: bool = True,
    cord: bool = True,
    hoses_at: float = 0.0,
) -> None:
    """What else the record puts in the cabin, each where it says or, where it does not say, where the
    flown capsule has it today: cameras, the chest parachute, the survival kit, two cabin lights,
    the environmental system's boxes under the couch, the oxygen hose to the suit."""
    gear = c.into("CrewCabin_Equipment")
    box = lambda x, y, z, sx, sy, sz: gear.box((sx * IN, sy * IN, sz * IN), Matrix.Translation(Vector((x, y, z + sz / 2)) * IN))  # noqa: E731
    # the environmental control system "located primarily below the astronaut's couch" (Results, p. 20), and equipment shelves outboard of it
    for spec in (
        (-19.5, -8.0, 0.7, 9, 12, 5),
        (20.0, -9.0, 0.7, 8, 11, 5),
        (0.0, 20.5, 0.7, 14, 8, 6),
        (-21.0, 12.0, 0.7, 7, 9, 6),
        (0.0, -27.5, 0.7, 12, 5, 0.9),
    ):
        box(*spec)
    # the instrument-panel camera, "just to the left of the astronaut's head" (Results, p. 24)
    if panel_camera:
        box(-9.5, -27.0, 6.0, 3.2, 5.5, 3.6)
        gear.tube(Vector((-9.5, -24.2, 7.8)) * IN, Vector((-9.5, -22.8, 8.4)) * IN, 0.9 * IN, 12)
    # the earth-sky camera at the lower right window (Results, p. 24)
    if portholes:
        t, z = portholes[0]
        at = c.vessel.p(t, z, -7.5) / IN
        aim = (c.vessel.p(t, z, 0.0) / IN - at).normalized()
        gear.box((3.4 * IN, 3.4 * IN, 5.0 * IN), frame(at * IN, aim))
        gear.tube((at + aim * 2.5) * IN, (at + aim * 4.6) * IN, 1.2 * IN, 14)
    # the chest parachute, stowed by the pilot's right shoulder (olive, as in NASM2021-00153): estimated
    pack = Matrix.Translation(Vector((16.5, -17.0, 9.0)) * IN) @ Matrix.Rotation(0.35, 4, "Z") @ Matrix.Rotation(-0.3, 4, "Y")
    soft(c.into("CrewCabin_Pack"), pack, (5.0, 10.0, 7.0), 1.6)
    for dy in (-2.6, 0.0, 2.6):  # its straps
        soft(c.into("CrewCabin_Stowage"), pack @ Matrix.Translation((0, dy * IN, 0)), (5.25, 0.9, 7.25), 0.4, 12, 7)
    # The survival kit: the tall zippered fabric container on the left wall beside the pilot's shoulder, as the flown
    # capsule has one there (NASM2021-00147, the far left). That it is the kit is SEDR 104 Figure 1-6's word for what
    # hangs at the left of the couch in the orbital capsule: not checked for No. 7.
    kit = Matrix.Translation(Vector((-21.3, -13.0, 14.0)) * IN) @ Matrix.Rotation(math.atan2(-13.0, -21.3) + math.pi, 4, "Z")
    soft(c.into("CrewCabin_Stowage"), kit, (3.4, 9.5, 12.0), 1.2)
    c.into("CrewCabin_Looms").box((0.2 * IN, 0.35 * IN, 10.6 * IN), kit @ Matrix.Translation((1.75 * IN, 0, 0)))  # its zip
    # the visor seal's oxygen bottle, green, low at the pilot's left (SEDR 109-7 lists it for No. 7; its place is the flown capsule's)
    c.into("CrewCabin_Bottles").tube(Vector((-15.5, 2.0, 5.6)) * IN, Vector((-15.5, 10.0, 6.6)) * IN, 1.3 * IN, 16)
    c.into("CrewCabin_PanelFittings").tube(Vector((-15.5, 10.0, 6.6)) * IN, Vector((-15.5, 11.2, 6.75)) * IN, 0.45 * IN, 10)
    # a small mirror on a bracket under the upper port (NASM2021-00147): what it was for is not in anything read
    if len(portholes) > 1:
        t, z = portholes[1]
        at = c.vessel.p(t + 0.42, z - 5.5, -1.6)
        aim = (Vector((0.0, -24.0, 13.0)) * IN - at).normalized()
        c.into("CrewCabin_Lamps").box((2.6 * IN, 1.9 * IN, 0.5 * IN), frame(at, aim))
        c.into("CrewCabin_PanelFittings").box((2.2 * IN, 1.5 * IN, 0.1 * IN), frame(at + aim * (0.31 * IN), aim))
        c.into("CrewCabin_Lamps").tube(at, c.vessel.p(t + 0.42, z - 5.5, 0.3), 0.25 * IN, 8)
    # two cabin floodlights above and either side of the pilot's head (SEDR 104, 10-19, the orbital capsule: No. 7's are not in anything read)
    lamps = []
    for th in (math.radians(a) for a in lamps_at):
        zl = 24.0
        f = Surf(c.vessel.r0 - 0.12, c.vessel.z0, c.vessel.a).frame(th, zl)
        c.into("CrewCabin_Lamps").box((4.2 * IN, 1.6 * IN, 1.6 * IN), f @ Matrix.Translation((0, 0, -0.3 * IN)))
        c.into("CrewCabin_LampLenses").box((3.6 * IN, 1.0 * IN, 0.2 * IN), f @ Matrix.Translation((0, 0, -1.24 * IN)))
        lamps.append(tuple(f @ Vector((0, 0, -2.2 * IN))))
    out["lamps"] = lamps
    # the suit's oxygen hose from the waist inlet, over the left arm and down to the environmental system
    path = [(-5.6, 1.4, 16.9), (-7.5, 2.2, 18.3), (-11.0, 2.6, 18.2), (-14.5, 1.5, 15.0), (-16.5, -2.0, 10.0), (-18.5, -6.0, 5.9)]
    c.into("CrewCabin_Hoses").loft(
        [Vector(p) * IN for p in path], [(0.62 * IN, 0.62 * IN)] * len(path), 12, ripple=lambda s, th: 0.06 * math.sin(s * 150)
    )
    # the wiring that comes down from the fuse panel to the floor, as the flown capsule has it (NASM2021-00147): three runs, estimated
    loom = c.into("CrewCabin_Looms")
    for k in range(3 if fuse_wiring else 0):
        run_ = [(-22.6 - 0.1 * k, 4.0 + 0.9 * k, 13.0), (-24.2, 6.0 + 0.9 * k, 9.0), (-25.4, 9.0 + 0.9 * k, 5.0), (-24.0, 13.0 + 0.6 * k, 1.6)]
        loom.loft([Vector(p) * IN for p in run_], [(0.32 * IN, 0.32 * IN)] * len(run_), 8)
    # the white coiled cord that hangs down the left wall in the flown capsule (NASM2021-00147): what it served is not in anything read
    if cord:
        a0, a1 = Vector((-20.5, -20.5, 15.0)), Vector((-21.5, -19.0, 5.0))
        along = (a1 - a0).normalized()
        side1 = along.cross(Vector((1, 0, 0))).normalized()
        side2 = along.cross(side1)
        turns = int((a1 - a0).length / 0.3)
        coil = [
            a0 + (a1 - a0) * (i / (turns * 8)) + (side1 * math.cos(TAU * i / 8) + side2 * math.sin(TAU * i / 8)) * 0.24 for i in range(turns * 8 + 1)
        ]
        c.into("CrewCabin_Hoses").loft([p * IN for p in coil], [(0.07 * IN, 0.07 * IN)] * len(coil), 5, resample=1)
        # the clip it hangs from: a stub from the cord to the wall, ending in the lining (it used to go on through the hull)
        reach = (c.vessel.r(a0.z) - 0.02) / math.hypot(a0.x, a0.y)
        c.into("CrewCabin_Lamps").tube(Vector((a0.x * 1.02, a0.y * 1.02, a0.z)) * IN, Vector((a0.x * reach, a0.y * reach, a0.z)) * IN, 0.45 * IN, 8)
    # The pilot's knee strap, one of the couch's restraints (shoulder, chest, lap and knee straps and toe caps: Postlaunch
    # Report, p. 38). Only this one is modelled: a band over both knees down to the couch either side; its run is estimated.
    band = [(-9.2, 5.0, 21.5), (-8.0, 5.0, 27.5), (-4.8, 5.0, 31.25), (0.0, 5.0, 30.7), (4.8, 5.0, 31.25), (8.0, 5.0, 27.5), (9.2, 5.0, 21.5)]
    c.into("CrewCabin_Straps").loft([Vector(p) * IN for p in band], [(0.9 * IN, 0.07 * IN)] * len(band), 8, ref=(0, 1, 0))
    # The suit circuit's two hoses on the right, from the environmental system under the couch up the wall toward the
    # pilot's head, corrugated, and a junction box above the panel with its leads into the tunnel: as the flown capsule
    # has them (NASM2021-00147, lower right and top), placed by eye.
    for k in (0, 1):
        run_ = [(21.0, -5.0 + 2.2 * k, 5.9), (24.0, -4.5 + 2.2 * k, 12.0), (24.0, -6.0 + 2.2 * k, 19.0), (20.0, -6.0 + 2.2 * k, 26.0)]
        if hoses_at:  # (a fit whose hatch comes down on this side moves them clear of its sill)
            run_ = [(x, y + hoses_at, z) for x, y, z in run_]
        c.into("CrewCabin_Looms").loft(
            [Vector(p) * IN for p in run_], [(0.8 * IN, 0.8 * IN)] * len(run_), 10, resample=14, ripple=lambda s, th: 0.07 * math.sin(s * 260)
        )
    box_at = Vector((2.5, -17.2, 44.0))
    c.into("CrewCabin_Equipment").box((4.2 * IN, 1.6 * IN, 2.6 * IN), Matrix.Translation(box_at * IN) @ Matrix.Rotation(0.35, 4, "X"))
    for k in (-1, 0, 1):
        run_ = [box_at + Vector((1.2 * k, 0.6, 1.2)), Vector((2.5 + 1.6 * k, -13.0, 49.5)), Vector((2.0 + 1.2 * k, -9.0, 55.5))]
        loom.loft([p * IN for p in run_], [(0.22 * IN, 0.22 * IN)] * len(run_), 6)
    # The harnesses from the back of the panel down each side to the equipment on the floor, with their connectors
    # in red caps where they leave the instruments (NASM2021-00153 shows them from the hatch): the runs are estimated.
    for path in (
        [(-9.0, 3.0, 35.0), (-15.0, 8.0, 31.0), (-21.5, 11.5, 22.0), (-24.0, 13.0, 10.0), (-22.0, 14.0, 6.8)],
        [(12.0, -2.0, 35.5), (18.0, -8.0, 31.0), (21.8, -10.0, 22.0), (22.0, -10.0, 9.0), (21.0, -9.5, 5.8)],
    ):
        for k in (-1, 1):
            run_ = [Vector((x, y + 0.45 * k, z + 0.1 * k)) * IN for x, y, z in path]
            # (laced: a tie every few inches, drawn as a swelling of the run itself)
            loom.loft(run_, [(0.4 * IN, 0.4 * IN)] * len(run_), 8, resample=12, ripple=lambda s, th: 0.2 if (s * 10) % 1.0 < 0.14 else 0.0)
        x, y, z = path[0]
        for k in range(3):
            c.into("CrewCabin_RedCaps").tube(
                Vector((x + 1.3 * (k - 1), y - 2.0, z - 0.2)) * IN, Vector((x + 1.3 * (k - 1), y - 2.0, z + 1.1)) * IN, 0.4 * IN, 10
            )


# What stands on No. 7's wall besides what stowage() places, each (angle round from his right in degrees, station in
# inches, size across, up the wall and out from it in inches, what it is). The kind and how densely they crowd the wall
# are SEDR 104 Figure 1-2 (the orbital capsule's interior arrangement: cases and harnesses round the whole wall) and the
# flown capsule's photographs (NASM2021-00147 and -00153); which case is which, where each is and how big are ours.
WALL_CASES = (
    (176.0, 27.5, 4.6, 3.2, 2.2, "a relay case"),
    (186.0, 41.0, 5.2, 3.6, 2.4, "a junction case"),
    (162.0, 42.0, 4.4, 3.0, 2.0, "a junction case"),
    (8.0, 40.5, 4.8, 3.4, 2.2, "an amplifier case"),
    (27.0, 42.0, 4.2, 3.0, 2.0, "a relay case"),
)
# The harnesses round the wall: along these frames, beside them on the side toward the pilot (FRAMES; SEDR 104 Figure 1-2 draws
# the cabin's wiring following its frames round the wall), and two runs up the wall between them.
HARNESS_FRAMES = (24.5, 34.5, 48.5)
HARNESS_RISERS = (40.0, 200.0, 150.0)


# The meshes fit_out() builds, which stand on the wall: a flight lists them with its shells.
WALL_FIT = ("CrewCabin_Harness", "CrewCabin_Risers", "CrewCabin_WallClips", "CrewCabin_WallCases", "CrewCabin_WallConnectors", "CrewCabin_WallPlates")


def fit_out(c: Cabin, hatch, portholes) -> None:
    """No. 7's wall as it was fitted: harnesses laced along the frames and held to them by clips, runs up the wall
    between frames, and the cases the wiring serves, each with its connector in a red cap and a data plate.
    Every place and size is estimated (WALL_CASES); none of it is on No. 11's wall, which its own records leave bare."""
    t0, t1, hz0, hz1 = hatch
    v = c.vessel
    rl = lambda z: v.r(z) - 0.12  # noqa: E731
    deg = math.radians
    # (all of it on the wall, so its own meshes, which the cutaway slices with the wall: WALL_FIT)
    loom, clip = c.into("CrewCabin_Harness"), c.into("CrewCabin_WallClips")
    case_, caps, plate = c.into("CrewCabin_WallCases"), c.into("CrewCabin_WallConnectors"), c.into("CrewCabin_WallPlates")
    laced = lambda s, th: 0.18 if (s * 40) % 1.0 < 0.08 else 0.0  # noqa: E731
    # a frame on the wall: x down the slant, y round the cone, z out of the wall
    wallwise = lambda t: Matrix.Rotation(t, 4, "Z") @ Matrix.Rotation(math.pi / 2 - v.a, 4, "Y")  # noqa: E731
    at = lambda t, z, inward: Vector((math.cos(t), math.sin(t), 0)) * ((rl(z) - inward) * IN) + Vector((0, 0, z * IN))  # noqa: E731

    def free(t: float, z: float) -> bool:
        """Whether a place on the wall is clear of the hatch, the ports, the panel and what stowage() has put there."""
        a = math.degrees(t) % 360
        if (t - t0 + 0.12) % TAU < (t1 - t0) + 0.24 and hz0 - 2.0 < z < hz1 + 2.0:
            return False
        p = Vector((math.cos(t), math.sin(t), 0)) * rl(z) + Vector((0, 0, z))
        if any((p * IN - v.p(pt, pz)).length < (PORT_RING + 2.2) * IN for pt, pz in portholes):
            return False
        keep_out = (
            (48, 132, 0, 44),  # the panel, its back and the periscope behind it
            (245, 292, 18, 30),  # the cabin lights
            (268, 290, 40, 48),  # the junction box above the panel
            (190, 228, 0, 23),  # the survival kit
            (160, 186, 0, 23),  # the fuse panel
            (330, 360, 0, 29),  # the suit circuit's hoses
            (0, 8, 0, 29),
        )
        return not any(a0 <= a <= a1 and z0 <= z <= z1 for a0, a1, z0, z1 in keep_out)

    def runs(z: float, step: float = 2.0):
        """The stretches of the wall at a station that are free, as lists of angles (radians)."""
        out, cur = [], []
        for k in range(int(360 / step)):
            t = deg(k * step)
            if free(t, z):
                cur.append(t)
            elif cur:
                out.append(cur)
                cur = []
        if cur:
            if out and abs(out[0][0]) < 1e-9:  # (round past 0)
                out[0] = [t - TAU for t in cur] + out[0]
            else:
                out.append(cur)
        return [r for r in out if len(r) >= 4]

    # along the frames: a bundle of two, its clips standing off the frame's flange every 12 degrees or so
    for zf in HARNESS_FRAMES:
        zb = zf - 0.3 - 0.18 - 0.34  # (on the frame's near side, toward the pilot)
        for run_ in runs(zb):
            for k, (rad, dz, inward) in enumerate(((0.34, 0.0, 0.8), (0.17, -0.12, 1.5))):
                pts = [at(t, zb + dz, inward) for t in run_[1:-1]]
                if len(pts) >= 2:
                    loom.loft(
                        pts, [(rad * IN, rad * IN)] * len(pts), 10 if k == 0 else 6, ref=(0, 0, 1), resample=3, ripple=laced if k == 0 else None
                    )
            for t in run_[2:-2:6]:  # (each sunk in the frame's flange and standing clear round the two)
                clip.box((1.1 * IN, 0.4 * IN, 1.4 * IN), Matrix.Translation(at(t, zf - 0.75, 1.05)) @ wallwise(t))
    # up the wall between the frames, held by clips every four inches
    for a in HARNESS_RISERS:
        t = deg(a)
        za, zb = HARNESS_FRAMES[0] - 1.0, HARNESS_FRAMES[-1] - 0.5
        zs = [z for z in np.arange(za, zb + 0.01, 1.5)]
        if not all(free(t, z) for z in zs):
            continue
        # (standing two inches off the wall, so that it passes over the frames and the harnesses along them)
        pts = [at(t, z, 2.0) for z in zs]
        c.into("CrewCabin_Risers").loft(pts, [(0.3 * IN, 0.3 * IN)] * len(pts), 10, ref=(-math.sin(t), math.cos(t), 0), resample=3, ripple=laced)
        for z in zs[1:-1:3]:
            if not any(abs(z - zf) < 1.6 for zf in HARNESS_FRAMES):
                clip.box((0.35 * IN, 1.15 * IN, 2.1 * IN), Matrix.Translation(at(t, z, 1.45)) @ wallwise(t))
    # The cabin air inlet valve of capsules 5 and 7 (Postlaunch Report, Figure 3.1-1, which draws it low on the cone's
    # hatch side toward the nose, where the orbital capsule's is elsewhere): a valve body off the wall with its knob.
    # Its place and size are estimated from the figure.
    t, z = deg(22.0), 51.0
    if free(t, z):
        valve = MeshBuilder()
        f = Matrix.Translation(at(t, z, 0.0)) @ wallwise(t) @ Matrix.Rotation(math.pi, 4, "X")  # (its +Z into the cabin)
        valve.lathe([(1.2, -0.3), (1.2, 0.35), (1.0, 0.5), (1.0, 2.1), (0.8, 2.3), (0.0, 2.3)], 20, matrix=f @ Matrix.Scale(IN, 4))
        valve.lathe([(0.32, 2.2), (0.32, 2.9), (0.75, 3.0), (0.75, 3.45), (0.0, 3.5)], 16, matrix=f @ Matrix.Scale(IN, 4))
        valve.tube(f @ Vector((0.0, 1.0 * IN, 1.2 * IN)), f @ Vector((0.0, 2.3 * IN, 1.2 * IN)), 0.55 * IN, 14)  # its outlet
        obj = valve.build("CrewCabin_AirInletValve", c.M["lever"], c.g, sharp_angle=35)
        obj["label"], obj["about"] = (
            "Cabin air inlet valve",
            "Where the cabin took in outside air once it was low enough to breathe, on capsules 5 and 7 in this place "
            "(Postlaunch Report, Figure 3.1-1). Its place and size are estimated from that figure.",
        )
    # the cases, each on the wall on its own feet, with a data plate and its connector toward the nearest frame
    for a, z, w, h, d, _ in WALL_CASES:
        t = deg(a)
        if not free(t, z):
            continue
        lean = wallwise(t)  # (its back square to the cone's wall)
        f = Matrix.Translation(at(t, z, 0.8 + d / 2)) @ lean
        case_.box((h * IN, w * IN, d * IN), f)
        plate.box(((h * 0.45) * IN, (w * 0.5) * IN, 0.06 * IN), f @ Matrix.Translation((0.0, 0.0, (d / 2 + 0.03) * IN)))
        caps.tube(at(t, z + h / 2 - 0.2, 0.8 + d / 2), at(t, z + h / 2 + 0.75, 0.8 + d / 2), 0.32 * IN, 10)
        lead = [at(t, z + h / 2 + 0.6, 0.8 + d / 2), at(t, z + h / 2 + 1.6, 1.1 + d / 3), at(t, z + h / 2 + 2.6, 0.8)]
        loom.loft(lead, [(0.14 * IN, 0.14 * IN)] * len(lead), 6, resample=4)
        for side in (-1, 1):  # its feet
            case_.box(((h + 0.6) * IN, 0.5 * IN, 0.45 * IN), f @ Matrix.Translation((0, side * (w / 2 - 0.45) * IN, (d / 2 - 0.075) * IN)))


def shade(parent, lamps, also=()) -> None:
    """The cabin's own shadow, kept at its vertices (a colour attribute named Shade, which the viewer multiplies the
    surface by): how much of the two floodlights each point sees past everything else in the cabin, and how open it
    is to the room round it. The viewer's lamps cast no shadows (every shadow map is a texture every lit surface in
    the scene must carry, and the ground has none to spare), so this is where the dark behind the panel, under the
    consoles and in the corners comes from. It is worked once, here, by casting rays against everything in the cabin
    as it stands: what moves afterwards (a needle, the hand controller) leaves no shadow."""
    from mathutils.bvhtree import BVHTree

    if not interior():
        return
    still = [o for o in bpy.data.objects if o.type == "MESH" and (o.parent == parent or o in also) and o.matrix_local == Matrix.Identity(4)]
    verts, tris = [], []
    for o in still:
        o.data.calc_loop_triangles()
        base = len(verts)
        verts.extend(v.co.copy() for v in o.data.vertices)
        tris.extend(tuple(base + i for i in t.vertices) for t in o.data.loop_triangles)
    tree = BVHTree.FromPolygons(verts, tris)
    # a few ways out from a surface, spread over the half of the sky it faces
    ways = [Vector((math.sin(p) * math.cos(a), math.sin(p) * math.sin(a), math.cos(p))) for p in (0.45, 1.05) for a in np.arange(0.2, TAU, TAU / 6)]
    ways.append(Vector((0, 0, 1)))
    reach, skin = 9.0 * IN, 0.12 * IN
    lamps = [Vector(p) for p in lamps]
    for o in still:
        if o.name.startswith(("CrewCabin_Pilot", "CrewCabin_PressureVessel", "CrewCabin_BulkheadStiffeners")):
            continue
        layer = o.data.color_attributes.new("Shade", "FLOAT_COLOR", "POINT")
        for i, v in enumerate(o.data.vertices):
            n = v.normal
            at = v.co + n * skin
            seen = 0.0
            for lamp in lamps:
                to = lamp - at
                if to.dot(n) <= 0:
                    seen += 0.3  # (turned away: lit by what the rest of the cabin gives back)
                elif tree.ray_cast(at, to.normalized(), to.length)[0] is None:
                    seen += 1.0
                else:
                    seen += 0.12
            seen /= len(lamps)
            t1, t2 = (Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).cross(n).normalized(), None
            t2 = n.cross(t1)
            clear = sum(tree.ray_cast(at, t1 * w.x + t2 * w.y + n * w.z, reach)[0] is None for w in ways) / len(ways)
            k = 0.1 + 0.9 * (0.6 * seen + 0.4 * clear) ** 1.5
            layer.data[i].color = (k, k, k, 1.0)


def restraints(c: Cabin, suit: dict, pilot: dict, seat) -> None:
    """The couch's harness over the pilot: two shoulder straps, a chest strap and a lap strap, and a cap over each toe
    (Postlaunch Report, p. 38, which lists them with the knee strap). Each is laid on the seated figure's own surface
    (`suit`: every vertex of it by mesh, seat-frame centimetres), an eighth of an inch clear; where each runs is estimated."""
    body = np.array([tuple(p) for name, pts in suit.items() if name.startswith("Torso") for p in pts], dtype=np.float64)
    web = c.into("CrewCabin_Straps")

    def top(x: float, y: float, reach: float = 2.5) -> float | None:
        """The suit's surface at (x, y), seat-frame cm: how far chest-ward the highest of it stands, or None off the body."""
        near = body[(np.abs(body[:, 0] - x) < reach) & (np.abs(body[:, 1] - y) < reach)]
        return float(near[:, 2].max()) if len(near) else None

    def lay(points, ref) -> None:
        run_ = []
        for x, y in points:
            z = top(x, y)
            if z is not None:
                # (an eighth of an inch and more off the cloth, and further out where the body's side falls away)
                run_.append(seat((x + (1.2 if x > 15 else -1.2 if x < -15 else 0.0), y, z + 0.8)))
        if len(run_) >= 3:
            if ref == "x":  # (down to the couch at each end)
                run_ = [Vector((run_[0].x - 4.5, run_[0].y, 4.4)), *run_, Vector((run_[-1].x + 4.5, run_[-1].y, 4.4))]
            web.loft([p * IN for p in run_], [(0.85 * IN, 0.1 * IN)] * len(run_), 8, ref=(0, 0, 1))

    across = [-18.0, -12.0, -6.0, 0.0, 6.0, 12.0, 18.0]
    lay([(x, -40.0) for x in across], "x")  # chest
    lay([(x, -11.0) for x in across], "x")  # lap: across the belly, headward of where the thighs rise
    for sx in (-1, 1):  # shoulders: from the chest strap up over each shoulder
        lay([(sx * 9.0, float(y)) for y in np.arange(-44.0, -64.1, -3.0)], "y")
        toe = seat(pilot["toes"]["left" if sx > 0 else "right"])
        soft(c.into("CrewCabin_Straps"), Matrix.Translation(Vector((toe.x, toe.y - 1.5, toe.z - 0.7)) * IN), (3.8, 2.6, 2.4), 0.9, 12, 7)


def hatch_inside(parent, vessel: Surf, M: dict, hatch, latches: float = 0.0) -> None:
    """The latch hatch's inner face: painted like the wall, with the internal release handle
    along its forward edge (Postlaunch Report, Figure 3.1-1). With `latches` (how far in from the edge the latches
    are, inches), the mechanism's placeholder too (hatch_latches): the mechanism itself is not in anything read."""
    if not interior():
        return
    t0, t1, hz0, hz1 = hatch
    rl = lambda z: vessel.r(z) - 0.12  # noqa: E731
    mb = MeshBuilder()
    mb.lathe(prof([(rl(hz0), hz0), (rl(hz1), hz1)]), 16, arc=(t0, t1), flip=True)
    mb.build("Hatch_Lining", M["cabin_paint"], parent, sharp_angle=None)
    inner = Surf(vessel.r0 - 0.12, vessel.z0, vessel.a)
    bar = MeshBuilder()
    za, zb = hz1 - 3.2, hz1 - 3.2
    a, b = inner.p(t0 + 0.12, za, -1.3), inner.p(t1 - 0.12, zb, -1.3)
    bar.tube(a, b, 0.4 * IN, 10)
    for t in (t0 + 0.12, t1 - 0.12):
        bar.tube(inner.p(t, za, 0.6), inner.p(t, za, -1.3), 0.3 * IN, 8)
    bar.build("Hatch_ReleaseHandle", M["lever"], parent)
    if latches:
        hatch_latches(parent, inner, M, hatch, latches)


def hatch_latches(parent, inner: Surf, M: dict, hatch, inset: float) -> None:
    """The latch hatch's mechanism as a placeholder, from inside: a channelled frame round the inner face, a latch
    housing over each of the eight latches the outside shows (`inset` inches in from the edge, as the outside's are),
    and the rod that runs round from latch to latch to the release handle. That No. 7's hatch was held by latches
    worked from a handle inside or out is documented (69 lb as installed: This New Ocean); their number, the frame and
    the rods are not in anything read, and the flown hatch was lost at recovery. Estimated, every part of it."""
    t0, t1, z0, z1 = hatch
    n = lambda t: inner.n(t)  # noqa: E731
    k = 0.9  # the frame's middle line, inches in from the opening's edge
    rk = lambda z: inner.r(z)  # noqa: E731
    ta, tb, za, zb = t0 + k / rk(z0), t1 - k / rk(z0), z0 + k, z1 - k
    # the frame's middle line round the face, corner to corner, finely enough to follow the curve
    loop = []
    for i in range(12):
        loop.append((ta + (tb - ta) * i / 12, za))
    for i in range(8):
        loop.append((tb, za + (zb - za) * i / 8))
    for i in range(12):
        loop.append((tb + (ta - tb) * i / 12, zb))
    for i in range(8):
        loop.append((ta, zb + (za - zb) * i / 8))
    centres = [inner.p(t, z) for t, z in loop]
    m = len(loop)
    section = [(-0.55, 0.15), (-0.55, -0.45), (-0.4, -0.55), (0.4, -0.55), (0.55, -0.45), (0.55, 0.15)]  # (across, outward), inches

    def point(i, j):
        i = int(i)
        t, _ = loop[i]
        a, b = centres[i - 1], centres[(i + 1) % m]
        along = (b - a).normalized()
        across = along.cross(n(t)).normalized()
        # (at a corner, mitred: the offset across both edges' lines)
        before, after = (centres[i] - a).normalized(), (b - centres[i]).normalized()
        mitre = 1.0 / max(0.5, before.cross(n(t)).normalized().dot(across))
        if before.dot(after) > 0.99:
            mitre = 1.0
        x, o = section[j]
        return centres[i] + (across * (x * mitre) + n(t) * o) * IN

    frame_ = MeshBuilder()
    frame_.grid(point, range(m), range(len(section)), closed_u=True)
    # the inner skin's stiffeners inside the frame: two up the slant and one across, a hat section riveted down (ours)
    hat = [(-0.42, 0.15), (-0.42, -0.3), (-0.3, -0.38), (0.3, -0.38), (0.42, -0.3), (0.42, 0.15)]
    for path in ([(ta + (tb - ta) * k, za + 0.7 + (zb - za - 1.4) * i / 10) for i in range(11)] for k in (1 / 3, 2 / 3)):
        cs = [inner.p(t, z) for t, z in path]

        def rib(i, j, path=path, cs=cs):
            i = int(i)
            t, _ = path[i]
            along = (cs[min(i + 1, len(cs) - 1)] - cs[max(i - 1, 0)]).normalized()
            x, o = hat[j]
            return cs[i] + (along.cross(n(t)).normalized() * x + n(t) * o) * IN

        frame_.grid(rib, range(len(path)), range(len(hat)))
    across = [(ta + 0.7 / rk(z0) + (tb - ta - 1.4 / rk(z0)) * i / 16, (za + zb) / 2 + 2.0) for i in range(17)]
    cs = [inner.p(t, z) for t, z in across]

    def bar(i, j):
        i = int(i)
        t, _ = across[i]
        along = (cs[min(i + 1, len(cs) - 1)] - cs[max(i - 1, 0)]).normalized()
        x, o = ((-0.42, 0.15), (-0.42, -0.42), (-0.3, -0.52), (0.3, -0.52), (0.42, -0.42), (0.42, 0.15))[j]  # (over the ribs)
        return cs[i] + (along.cross(n(t)).normalized() * x + n(t) * o) * IN

    frame_.grid(bar, range(len(across)), range(len(hat)))
    for i in range(0, m, 2):  # riveted down through its flanges
        t, z = loop[i]
        for side in (-0.28, 0.28):
            a, b = centres[i - 1], centres[(i + 1) % m]
            across = (b - a).normalized().cross(n(t)).normalized()
            frame_.disc(centres[i] + (across * side - n(t) * 0.53) * IN, -n(t), 0.07 * IN, 0.075 * IN)
    frame_.build("Hatch_InnerFrame", M["cabin_paint"], parent, sharp_angle=35)
    # the latch housings over the frame, and the rods that join them
    mech = MeshBuilder()
    ti, tj = t0 + inset / rk(z0), t1 - inset / rk(z0)
    zi, zj = z0 + inset, z1 - inset
    half, mid = (t0 + t1) / 2, (zi + zj) / 2
    places = [(ti, zi), (half, zi), (tj, zi), (tj, mid), (tj, zj), (half, zj), (ti, zj), (ti, mid)]
    for t, z in places:
        f = inner.frame(t, z, -0.95)
        mech.box((1.7 * IN, 1.1 * IN, 0.95 * IN), f)
        mech.tube(inner.p(t, z, -1.0), inner.p(t, z, -1.62), 0.2 * IN, 10)  # the latch's spindle
    for (ta_, za_), (tb_, zb_) in zip(places, places[1:] + places[:1]):
        mech.tube(inner.p(ta_, za_, -1.32), inner.p(tb_, zb_, -1.32), 0.11 * IN, 8)
    mech.build("Hatch_LatchMechanism", M["lever"], parent, sharp_angle=35)
    # The outside release handle, stowed inside on the hatch (Postlaunch Report, Figure 3.1-1: "external release handle
    # (stowed position)", capsules 5 and 7): a bar with a grip at its end in two spring clips. Its size and where on the
    # hatch it lies are ours.
    stow, grip = MeshBuilder(), MeshBuilder()
    s0, s1 = (ta + (tb - ta) * 0.18, za + (zb - za) * 0.3), (ta + (tb - ta) * 0.62, za + (zb - za) * 0.3)
    a, b = inner.p(*s0, -1.0), inner.p(*s1, -1.0)
    stow.tube(a, b, 0.3 * IN, 12)
    for k in (0.2, 0.8):
        q = a.lerp(b, k)
        stow.tube(q + n(s0[0]) * (0.95 * IN), q - n(s0[0]) * (0.6 * IN), 0.45 * IN, 10)
    d = (b - a).normalized()
    side = d.cross(n(s1[0])).normalized()
    grip.tube(b + side * (1.6 * IN), b - side * (1.6 * IN), 0.42 * IN, 12)
    stow.build("Hatch_StowedHandle", M["lever"], parent, sharp_angle=35)
    grip.build("Hatch_StowedHandleGrip", M["grip"], parent)
    obj = bpy.data.objects["Hatch_StowedHandle"]
    obj["label"], obj["about"] = (
        "Outside release handle, stowed",
        "The handle a recovery crew put into the socket outside to open the hatch, carried stowed inside it (Postlaunch "
        "Report, Figure 3.1-1, capsules 5 and 7). Where it lay and its size are estimated.",
    )
