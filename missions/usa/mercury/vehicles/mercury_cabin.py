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


# Where the panel stands in the capsule: the middle of the periscope's display, (x, y, station).
# Estimated: fitted to the model's pilot (clear of his knees, 30.6 in) and to the cone, which is
# what cuts the panel's top corners. "Two feet in front of him" (This New Ocean, p. 355) is all
# that is in print; the model has it 32 in from his eyes, because its pilot lies flat.
PANEL_AT = (0.0, 0.5, 33.0)
STRIP_CANT = math.radians(34.0)  # the telelight strip, turned toward the pilot from the main panel: estimated
CONSOLE_CANT = math.radians(62.0)  # the left console beyond it: estimated
FUSE_CANT = math.radians(86.0)  # and the fuse panel on the wall: estimated
EYE_FROM_HELMET = (1.0, 3.3)  # the eyes from the middle of the helmet, toward the feet and toward the face, inches: the suit model's own
SCREEN_R = 4.0  # the periscope's 8 in display: documented (Hammack and Heberlig, p. 5)
SCOPE_RECESS = 1.2  # how far its display sits behind the panel: estimated (NASM2021-00147)

PAINT = (0.61, 0.62, 0.61)  # the panels' and the wall's light grey, as the flown capsule's is (sRGB): estimated
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
        w, h = int(math.ceil(w_in * ppi)) + 4, int(math.ceil(h_in * ppi)) + 4
        if at:
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

    def screw(self, u: float, v: float, r: float = 0.11) -> None:
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
            rg.text(label, x, y, numerals, WHITE)
    for body, x, y, cap in titles:
        rg.text(body, x * r, y * r, cap, WHITE)


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
                    self.worst = min(self.worst, self.room(Vector(p)))
            mb.build(name, self.M[materials[name]], self.g, smooth=name in smooth, sharp_angle=35)
        assert self.worst > 0.25, f"the cabin's fittings come within {self.worst:.2f} in of the wall"


OWN_MATERIAL = ("amber", "red_lamp", "green_lamp")
# what is part of the wall, or goes through it: not held to the rule that nothing in the cabin reaches it
WALL = ("CrewCabin_Lining", "CrewCabin_Frames", "CrewCabin_PortFrames", "CrewCabin_Periscope", "CrewCabin_Lamps", "CrewCabin_LampLenses")


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
    parent, vessel: Surf, M: dict, font, pilot: dict, hip: tuple[float, float], portholes, hatch: tuple[float, float, float, float], ceiling: float
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
    main = Sheet("cabin-main-panel", 2048)
    side = Sheet("cabin-consoles", 2048)
    faces = Sheet("cabin-faces", 2048, BLACK)
    out: dict = {}

    def seat(p) -> Vector:
        """A point of the seated pilot, in capsule inches."""
        return Vector((p[0] / 2.54, hip[0] + p[1] / 2.54, hip[1] + p[2] / 2.54))

    lining(c, hatch, portholes, ceiling)
    couch(c, pilot, seat)
    # The suit's neck, closed: from his own eyes, with his helmet and head not drawn, the pilot looks down into his
    # collar, and what is there is the neck dam of the suit, not the hollow of the model's torso.
    neck = seat(pilot["neck_ring"])
    c.into("CrewCabin_Hoses").lathe(
        prof([(4.7, 0.0), (3.0, 0.5), (0.0, 0.7)]), 24, matrix=frame(Vector((neck.x, neck.y + 0.6, neck.z)) * IN, (0, -1, 0))
    )
    P = plane(Vector(PANEL_AT), Vector((1, 0, 0)), Vector((0, -1, 0)))
    main_panel(c, P, main, faces)
    periscope(c, P, side, out)
    consoles(c, P, side, faces)
    controls(c, seat, pilot, out)
    stowage(c, portholes, out)
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
            "CrewCabin_Lamps": "equipment",
            "CrewCabin_LampLenses": "cabin_lamp",
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
            "CrewCabin_Pack",
            "CrewCabin_Stowage",
            "CrewCabin_InstrumentGlass",
            "CrewCabin_Couch",
            "CrewCabin_CouchLiner",
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
    helmet = seat(pilot["helmet_centre"])
    eye = Vector((0.0, helmet.y + EYE_FROM_HELMET[0], helmet.z + EYE_FROM_HELMET[1]))
    look = (Vector(P @ Vector((1.0, 7.5, 0.0))) / IN - eye).normalized()
    over = (Vector((0, -1, 0)) - look * look.dot(Vector((0, -1, 0)))).normalized()
    node = bpy.data.objects.new("Seat_Pilot", None)
    bpy.context.scene.collection.objects.link(node)
    node.parent = parent
    node.matrix_local = Matrix.Translation(eye * IN) @ Matrix(((-look).cross(over), -look, over)).transposed().to_4x4()
    out["eye"] = tuple(eye)
    out["eye_to_screen"] = (Vector(P @ Vector((0, 0, 0))) / IN - eye).length
    return out


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


def lining(c: Cabin, hatch, portholes, ceiling: float) -> None:
    """The wall as the pilot sees it: the inner skin painted grey, the channelled frames that
    line it (SEDR 104, 2-3: how many and where is not in anything read), a frame round the hatch
    opening and a bolted ring round each porthole."""
    t0, t1, hz0, hz1 = hatch
    v = c.vessel
    rl = lambda z: v.r(z) - 0.12  # noqa: E731
    mb = c.into("CrewCabin_Lining")
    top = ceiling - 0.15  # under the small bulkhead
    mb.lathe(prof([(rl(0.62), 0.62), (rl(hz0), hz0)]), 96, flip=True)
    mb.lathe(prof([(rl(hz0), hz0), (rl(hz1), hz1)]), 84, arc=(t1, t0 + TAU), flip=True)
    mb.lathe(prof([(rl(hz1), hz1), (rl(top), top), (0.0, top)]), 96, flip=True)
    mb.lathe(prof([(0.0, 0.62), (rl(0.62), 0.62)]), 96, flip=True)
    fr = c.into("CrewCabin_Frames")
    for z, whole in ((7.0, True), (24.5, False), (29.5, False), (34.5, False), (48.5, True), (53.5, True)):
        if any(abs(z - pz) < 7.4 for _, pz in portholes):
            continue  # (a frame does not cross a window)
        profile = prof([(rl(z + 0.3) + 0.1, z + 0.3), (rl(z + 0.3) - 0.75, z + 0.3), (rl(z - 0.3) - 0.75, z - 0.3), (rl(z - 0.3) + 0.1, z - 0.3)])
        arc = (0.0, TAU) if whole else (t1 + 0.05, t0 + TAU - 0.05)
        fr.lathe(profile, 96, arc=arc)
        for i in range(64):  # riveted to the skin through its flange
            t = arc[0] + (arc[1] - arc[0]) * (i + 0.5) / 64
            fr.disc(
                Vector((math.cos(t), math.sin(t), 0)) * ((rl(z) - 0.75) * IN) + Vector((0, 0, z * IN)),
                (-math.cos(t), -math.sin(t), 0),
                0.09 * IN,
                0.04 * IN,
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
            if any((p * IN - v.p(pt, pz)).length < 7.2 * IN for pt, pz in portholes):
                continue
            fr.disc(p * IN, (-math.cos(t), -math.sin(t), 0), 0.08 * IN, 0.035 * IN)
    # a bolted ring round each porthole, lying on the wall's own curve
    ports = c.into("CrewCabin_PortFrames")
    wall = Surf(v.r0 - 0.12, v.z0, v.a)

    def on_wall(t: float, z: float, r: float, a: float, off: float) -> Vector:
        zz = z + r * math.sin(a) * math.cos(v.a)
        return wall.p(t + r * math.cos(a) / wall.r(zz), zz, off)

    ring = [(6.7, 0.06), (6.7, -0.5), (4.6, -0.5), (4.6, -0.25)]  # radius, and how far out through the wall (inward is negative)
    for t, z in portholes:
        ports.grid(
            lambda a, k, t=t, z=z: on_wall(t, z, ring[k][0], a, ring[k][1]),
            [TAU * i / 40 for i in range(40)],
            range(4),
            closed_u=True,
            flip=PORT_FLIP,
        )
        # its bore goes on out through the wall to the outer pane, straight: from the couch the port is seen along the
        # wall, and nothing of the wall's own cut edge may show round it
        ports.lathe(prof([(4.7, 1.6), (4.7, -0.45)]), 40, matrix=wall.frame(t, z))
        for i in range(20):
            a = TAU * (i + 0.5) / 20
            at = on_wall(t, z, 5.75, a, -0.5)
            ports.disc(at, -wall.n(t + 5.75 * math.cos(a) / wall.r(z)), 0.16 * IN, 0.07 * IN)


PORT_FLIP = False

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
    pan((7.4, 3.3), (13.6, 5.2), 1.4, 24.0, 1.5)  # seat, rising behind the hips
    pan((13.6, 5.2), (13.9, 13.5), 1.2, 22.0, 1.2)  # and up the back of the thighs
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
    c.turned("CrewCabin_RedCaps", F, u, v, [(0.115, 0.14), (0.085, 0.24), (0.0, 0.24)], 10)
    lean = 0.42 * (1 if up else -1)
    tip = Vector((lean, 0, 0.62)) if way == "h" else Vector((0, lean, 0.62))
    c.into("CrewCabin_PanelFittings").tube(F @ Vector((u, v, 0.18)), F @ (Vector((u, v, 0.18)) + tip), 0.055 * IN, 8)


def telelight(c: Cabin, F: Matrix, faces: Sheet, name: str, legend: str, u: float, v: float, w: float = 0.0, size=(2.5, 0.95)) -> None:
    """A telelight: a black housing and a lens with its legend, which the viewer lights. The lens is its own mesh."""
    su, sv = size
    c.box("CrewCabin_Bezels", F, u, v, su + 0.16, sv + 0.16, w, w + 0.34)
    rg = faces.take(su, sv, 110, -su / 2, -sv / 2)
    rg.rect(-su / 2, -sv / 2, su / 2, sv / 2, (0.80, 0.80, 0.76))
    rg.rect(-su / 2 + 0.05, -sv / 2 + 0.05, su / 2 - 0.05, sv / 2 - 0.05, (0.86, 0.86, 0.82), r=0.06)
    rg.text(legend, 0, 0, 0.2 if "\n" not in legend else 0.17, INK)
    lens = Cabin(c.g, c.vessel, c.M)
    lens.box("lens", F, u, v, su, sv, w + 0.2, w + 0.46, rg, 0.0, 0.0)
    obj = lens.mb["lens"].build(f"Tele_{name}", c.M["telelight"], c.g, smooth=False)
    obj["reach"] = math.hypot(su, sv) / 2 * IN
    c.lenses.append(obj)


def round_dial(c: Cabin, F: Matrix, faces: Sheet, name: str, spec: dict, u: float, v: float, r: float, w: float = 0.0, ppi: float = 125) -> None:
    """A round instrument: its face a little behind the bezel's lip, a needle on its pivot, a glass over it."""
    rg = faces.take(2 * r, 2 * r, ppi, -r, -r)
    draw_dial(rg, r * 0.92, spec["scale"], spec["majors"], spec["minor"], spec["titles"], sectors=spec.get("sectors", ()))
    c.turned("CrewCabin_Bezels", F, u, v, [(r + 0.14, 0.0), (r + 0.14, 0.3), (r * 0.94, 0.3), (r * 0.92, 0.06)], 32, w)
    c.disc("CrewCabin_Instruments", F, u, v, r * 0.93, w + 0.06, rg)
    c.disc("CrewCabin_InstrumentGlass", F, u, v, r * 0.93, w + 0.25, None, 20)
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
    c.flat("CrewCabin_InstrumentPanel", P, outline, rg)
    c.skirt("CrewCabin_PanelStructure", P, outline, 0.0, -0.9)
    c.flat("CrewCabin_PanelStructure", P, outline, None, -0.9, flip=True)

    for name, spec in ROUND.items():
        (u, v), r = fig(*spec["at"]), spec["d"] * S / 2
        round_dial(c, P, faces, name, spec, u, v, r)
        c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -4.2)), r * 0.95 * IN, 12)  # its case behind the panel
    # the blanked hole of an instrument not flown (Figure 3.1-2 draws it empty)
    u, v = fig(1632, 870)
    rg.ring(u, v, 0, 1.15, (0.55, 0.56, 0.55))
    rg.ring(u, v, 1.1, 1.15, (0.4, 0.41, 0.41))

    attitude(c, P, faces)
    clock(c, P, faces)

    label = lambda body, px, py, cap=0.105, **kw: rg.text(body, *fig(px, py), cap, INK, **kw)  # noqa: E731
    for (px, py), name, (a, b), way in MAIN_SWITCHES:
        u, v = fig(px, py)
        toggle(c, P, u, v, way)
        rg.text(name, u, v + 0.62 + (0.1 if "\n" in name else 0), 0.105, INK)
        if way == "h":
            rg.text(a, u - 0.42, v, 0.085, INK, align="r")
            rg.text(b, u + 0.42, v, 0.085, INK, align="l")
        else:
            rg.text(a, u, v + 0.36, 0.085, INK)
            rg.text(b, u, v - 0.42, 0.085, INK)
    for name, legend, at in OTHER_LIGHTS:
        telelight(c, P, faces, name, legend, *fig(*at), size=(1.75, 0.95) if "\n" not in legend else (1.75, 1.05))

    # the O2 emergency flow light, alone on its plate (the two water lights of the figure were not flown: Figure 10.1-1 lists only this one)
    u, v = fig(1858, 740)
    rg.rect(u - 0.85, v - 0.5, u + 0.85, v + 2.9, (0.57, 0.58, 0.57), r=0.1)
    c.turned("CrewCabin_PanelFittings", P, u, v, [(0.3, 0.0), (0.3, 0.12), (0.22, 0.12)], 16)
    c.node("Tele_O2EmergFlow", "amber", P, u, v, 0.0, lambda mb: mb.lathe([(0.22, 0.1), (0.2, 0.3), (0.0, 0.36)], 14))
    rg.text("O2\nEMERG\nFLOW", u - 0.75, v + 0.1, 0.085, INK, align="r")

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
        rg.text(name, u + (i - 1) * 1.1, v + 0.78, 0.085, WHITE)

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
        rg.text(mark, u + x, v + y, 0.08, INK)

    # communications: the audio box, three thumbwheels and a key
    u0, v0 = fig(1580, 1335)
    u1, v1 = fig(1805, 1258)
    rg.rect(u0, v0, u1, v1, (0.52, 0.53, 0.52), r=0.1)
    rg.text("COMM AUDIO", (u0 + u1) / 2, v0 + 0.16, 0.085, INK)
    for i, name in enumerate(("HF", "UHF", "CMD")):
        uu = u0 + 1.6 + i * 1.0
        c.box("CrewCabin_Knobs", P, uu, (v0 + v1) / 2 + 0.1, 0.6, 1.0, 0.0, 0.16)
        rg.text(name, uu, v1 - 0.16, 0.08, INK)
    c.turned("CrewCabin_Knobs", P, u0 + 0.55, (v0 + v1) / 2 + 0.1, [(0.3, 0.0), (0.3, 0.2), (0.0, 0.2)], 12)
    rg.text("KEY", u0 + 0.55, v1 - 0.16, 0.08, INK)
    toggle(c, P, u1 - 0.75, (v0 + v1) / 2 + 0.1, "h")
    rg.text("UHF DF", u1 - 0.75, v1 - 0.16, 0.08, INK)


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


def attitude(c: Cabin, P: Matrix, faces: Sheet) -> None:
    """The attitude and rate indicator: roll, pitch and yaw each on a dial of its own round a
    square rate indicator whose three needles slide. No ball: Mercury's was three pointers."""
    (u0, v1), (u1, v0) = fig(1175, 497), fig(1460, 663)
    cu, cv, hw, hh = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2, (v1 - v0) / 2
    rg = faces.take(2 * hw, 2 * hh, 125, -hw, -hh)
    rg.rect(-hw, -hh, hw, hh, BLACK)
    c.rim("CrewCabin_Bezels", P, cu, cv, 2 * hw - 0.1, 2 * hh - 0.1, 0.22, 0.0, 0.34)
    rect = [(cu - hw, cv - hh), (cu + hw, cv - hh), (cu + hw, cv + hh), (cu - hw, cv + hh)]
    c.flat("CrewCabin_Instruments", P, rect, Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 + cu, rg.v0 + cv), 0.08)
    c.flat("CrewCabin_InstrumentGlass", P, rect, None, 0.29)
    c.into("CrewCabin_Equipment").box((2 * hw * IN, 2 * hh * IN, 5.0 * IN), P @ Matrix.Translation((cu, cv, -3.5)) @ Matrix.Scale(1 / IN, 4))
    for name, d in ATTITUDE.items():
        x, y = d["at"]
        r = d["r"]
        # drawn in place: the dial's own coordinates are the indicator's, moved to its middle
        sub = Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 - x, rg.v0 - y)
        for value in range(-180, 180, 10):
            a = scale_at(d["scale"], value)
            sub.line(clock_xy(a, r), clock_xy(a, r * (0.8 if value % 30 == 0 else 0.88)), 0.022 if value % 30 == 0 else 0.014, WHITE)
        for value, text in d["majors"]:
            sub.text(text, *clock_xy(scale_at(d["scale"], value), r * 0.6), 0.1, WHITE)
        sub.text(d["title"], 0, -r * 0.3, 0.085, WHITE)
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
        k = (i - 6) / 6 * 0.78
        for x, y in ((k, 0.78), (k, -0.78), (-0.78, k), (0.78, k)):
            rg.ring(x, 0.55 + y, 0, 0.018, WHITE)
    slide = [-RATE_FULL, -RATE_TRAVEL * IN, RATE_FULL, RATE_TRAVEL * IN]

    def bar(length: float, width: float):
        corners = [(-width / 2, -length / 2, 0), (width / 2, -length / 2, 0), (width / 2, length / 2, 0), (-width / 2, length / 2, 0)]
        return lambda mb: mb.add(corners, [(0, 1, 2, 3)])

    c.node("Gauge_RollRate", "needle_blue", P, cu, cv + 0.55 + 0.4, 0.15, bar(0.72, 0.05), slide=slide, rest=0.0)
    c.node("Gauge_YawRate", "needle_yellow", P, cu, cv + 0.55 - 0.4, 0.15, bar(0.72, 0.07), slide=slide, rest=0.0)
    c.node("Gauge_PitchRate", "needle_white", P, cu, cv + 0.55, 0.21, bar(1.5, 0.05), spin=math.pi / 2, slide=slide, rest=0.0)


def clock(c: Cabin, P: Matrix, faces: Sheet) -> None:
    """The Redstone flights' clock: a twelve-hour watch and a counter of seconds from launch
    (the orbital clock, with its time to retrograde, came later)."""
    (u0, v1), (u1, v0) = fig(1332, 688), fig(1545, 915)
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


def periscope(c: Cabin, P: Matrix, sheet: Sheet, out: dict) -> None:
    """The periscope's display in the middle of the panel, set back in its opening, with its
    housing behind and the tube down between the pilot's legs to the objective in the capsule's
    floor side. The 8 in screen is documented; every other size is off the figure or the photograph."""
    (u0, v1), (u1, v0) = fig(1088, 935), fig(1553, 1380)
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
    for name, (ku, kv), r in (("ALTITUDE", (-4.9, -4.9), 0.55), ("DRIFT", (1.6, -5.6), 0.42), ("RETICLE", (5.1, -4.9), 0.5)):
        c.turned("CrewCabin_Knobs", P, ku, kv, [(r, 0.0), (r, 0.45), (r * 0.8, 0.6), (0.0, 0.6)], 14, -d)
        rg.text(name, ku + (1.0 if ku < 0 else -1.0) * (0.0 if name == "DRIFT" else 0.2), kv + r + 0.22, 0.09, WHITE if abs(ku) < 2 else INK)
    rg.rect(u0 + 0.35, v1 - 0.85, u0 + 1.55, v1 - 0.45, BLACK, r=0.05)
    rg.text("RETRACT", u0 + 0.95, v1 - 0.65, 0.085, WHITE)
    c.turned("CrewCabin_PanelFittings", P, u0 + 0.95, v1 - 1.35, [(0.26, 0.0), (0.26, 0.2), (0.0, 0.26)], 12, -d)
    # the upper housing behind the display, and the tube
    body = c.into("CrewCabin_Periscope")
    body.box(
        ((u1 - u0 - 0.6) * IN, (v1 - v0 - 0.6) * IN, 4.6 * IN),
        P @ Matrix.Translation(((u0 + u1) / 2, (v0 + v1) / 2, -d - 2.45)) @ Matrix.Scale(1 / IN, 4),
    )
    top = Vector((0.0, PANEL_AT[1] + 4.6, PANEL_AT[2] + d + 3.0))
    foot = c.vessel.p(math.pi / 2, SCOPE_STATION, -0.6) / IN
    body.tube(top * IN, foot * IN, 1.9 * IN, 20)
    body.tube((foot - (foot - top).normalized() * 6.5) * IN, foot * IN, 2.5 * IN, 20)  # the objective's cartridge
    out["periscope"] = {"screen": tuple(P @ Vector((0, 0, -d + 0.06))), "radius": (SCREEN_R - 0.02) * IN}
    # the map case hangs below the display (SEDR 104, 12-27): a fabric pouch
    soft(c.into("CrewCabin_Stowage"), P @ Matrix.Translation((0.0, v0 - 3.0, -0.9)) @ Matrix.Scale(1 / IN, 4), (8.5, 5.6, 1.5), 0.6)


SCOPE_STATION = 13.0  # where the objective leaves the cone: estimated from the flown capsule (NASM2021-00160, -00165)

# --------------------------------------------------------------------------- the consoles


def consoles(c: Cabin, P: Matrix, sheet: Sheet, faces: Sheet) -> None:
    """The left console in its two parts and the fuse panel beyond, each turned further toward
    the pilot; the right console under the hatch."""
    ex, ey, ez = (Vector(P.col[i][:3]).normalized() for i in range(3))
    edge = Vector(P @ Vector((fig(905, 0)[0], 0, 0))) / IN  # the main panel's left edge, at the periscope's height
    a = STRIP_CANT
    sx = ex * math.cos(a) - ez * math.sin(a)
    Sx = plane(edge, sx, ey)  # u runs back from the hinge: the strip is u from -6.7 to 0
    sfig = lambda px, py: ((px - 830) * S, (FIG_C[1] - py) * S)  # noqa: E731
    strip = [sfig(585, 1350), sfig(830, 1345), sfig(830, 415), sfig(585, 620)]
    rg = sheet.take(strip[1][0] - strip[0][0], strip[2][1] - strip[0][1], 74, strip[0][0], strip[0][1], at=(0, 0))
    c.flat("CrewCabin_Consoles", Sx, strip, rg)
    c.skirt("CrewCabin_PanelStructure", Sx, strip, 0.0, -0.7)
    c.flat("CrewCabin_PanelStructure", Sx, strip, None, -0.7, flip=True)
    lu, ou = sfig(765, 0)[0], sfig(685, 0)[0]
    for name, legend, kind, py in SEQUENCE:
        v = sfig(0, py)[1]
        telelight(c, Sx, faces, name, legend, lu, v)
        if kind == "ring":  # a pull ring on its stem, hanging from the panel

            def ring(mb: MeshBuilder) -> None:
                mb.lathe([(0.07, 0.0), (0.07, 0.45), (0.0, 0.45)], 8)
                tube = [(0.34 + 0.055 * math.cos(TAU * k / 6), 0.055 * math.sin(TAU * k / 6)) for k in range(7)]
                mb.lathe(tube, 16, matrix=Matrix.Translation((0, -0.2, 0.62)) @ Matrix.Rotation(math.pi / 2 - 0.5, 4, "X"))

            c.turned("CrewCabin_PanelFittings", Sx, ou, v, [(0.2, 0.0), (0.2, 0.1), (0.1, 0.1)], 10)
            c.node(f"Ctl_{name}", "lever", Sx, ou, v, 0.08, ring, pull=1.2 * IN)
        elif kind == "button":  # a push button in a black collar; RETRO FIRE and JETT RETRO are guarded
            c.turned("CrewCabin_Knobs", Sx, ou, v, [(0.36, 0.0), (0.36, 0.3), (0.26, 0.3)], 14)
            c.node(f"Ctl_{name}", "red", Sx, ou, v, 0.0, lambda mb: mb.lathe([(0.25, 0.2), (0.25, 0.42), (0.0, 0.46)], 12), press=0.12 * IN)
        else:
            toggle(c, Sx, ou, v, "v")
            rg.text("RETRO ATT\nBY-PASS", ou - 1.2, v + 0.3, 0.08, INK)
            rg.text("AUTO RET\nATTITUDE", ou - 1.2, v - 0.35, 0.08, INK)
    for label_, py in (("PULL TO\nPRESSURIZE\nPUSH TO RESET", 1140), ("PULL OPEN\nDE-COMPRESS\nPUSH CLOSED", 1192)):
        v = sfig(0, py)[1]
        rg.text(label_, lu, v, 0.085, INK)
        c.turned("CrewCabin_WhiteCaps", Sx, ou, v, [(0.12, 0.0), (0.12, 0.5), (0.4, 0.55), (0.42, 0.85), (0.0, 0.9)], 14)
    v = sfig(0, 1240)[1]
    toggle(c, Sx, ou - 0.6, v, "h")
    rg.text("RESCUE AIDS", lu, v, 0.1, INK)
    u, v = sfig(733, 540)
    toggle(c, Sx, u, v, "v")
    rg.text("SIGNAL\nLIGHTS\nTEST", u, v + 0.75, 0.08, INK)
    u, v = sfig(795, 522)
    c.turned("CrewCabin_PanelFittings", Sx, u, v, [(0.22, 0.0), (0.22, 0.1), (0.15, 0.1)], 12)
    c.node("Tele_GroundComm", "red_lamp", Sx, u, v, 0.0, lambda mb: mb.lathe([(0.15, 0.08), (0.13, 0.24), (0.0, 0.28)], 12))
    rg.text("GROUND\nCOMM", u, v + 0.55, 0.08, INK)
    rg.text("RETRO\nRESET", u, v - 0.6, 0.08, INK)
    for i in range(3):  # where the 1960 panel had LAUNCH OXY: three blanked holes
        rg.ring(sfig(740 + 28 * i, 0)[0], sfig(0, 603)[1], 0, 0.3, (0.55, 0.56, 0.55))

    # the console's outer part, hinged on the strip's far edge and turned further
    hinge = Vector(Sx @ Vector((strip[0][0], 0, 0))) / IN
    b = CONSOLE_CANT
    cx = ex * math.cos(b) - ez * math.sin(b)
    Cx = plane(hinge, cx, ey)
    cfig = lambda px, py: ((px - 585) * S, (FIG_C[1] - py) * S)  # noqa: E731
    part = [cfig(355, 1362), cfig(585, 1352), cfig(585, 690), cfig(520, 705), cfig(460, 790), cfig(235, 822)]
    rg2 = sheet.take(part[1][0] - part[5][0], part[2][1] - part[0][1], 74, part[5][0], part[0][1], at=(502, 0))
    c.flat("CrewCabin_Consoles", Cx, part, rg2)
    c.skirt("CrewCabin_PanelStructure", Cx, part, 0.0, -0.7)
    c.flat("CrewCabin_PanelStructure", Cx, part, None, -0.7, flip=True)
    for (px, py), name, (p0, p1), way in CONSOLE_SWITCHES:
        u, v = cfig(px, py)
        toggle(c, Cx, u, v, way)
        rg2.text(name, u, v + 0.68 + (0.1 if "\n" in name else 0), 0.085, INK)
        rg2.text(p0, u, v + 0.36, 0.08, INK)
        rg2.text(p1, u, v - 0.42, 0.08, INK)
    for name, text, (px, py), mat in (
        ("HeatersOn", "HTR'S ON", (338, 945), "amber"),
        ("RetroCold", "RETRO\nROCKETS\nCOLD", (352, 1058), "red_lamp"),
        ("LandingBag", "", (382, 1127), "green_lamp"),
    ):
        u, v = cfig(px, py)
        c.turned("CrewCabin_PanelFittings", Cx, u, v, [(0.22, 0.0), (0.22, 0.1), (0.15, 0.1)], 12)
        c.node(f"Tele_{name}", mat, Cx, u, v, 0.0, lambda mb: mb.lathe([(0.15, 0.08), (0.13, 0.24), (0.0, 0.28)], 12))
        if text:
            rg2.text(text, u + 0.3, v, 0.08, INK, align="l")
    # control fuel: one gauge, two needles, the automatic system's on the left and the manual's on the right
    u, v = cfig(455, 968)
    r = 78 * S / 2
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
    c.turned("CrewCabin_Bezels", Cx, u, v, [(r + 0.14, 0.0), (r + 0.14, 0.3), (r * 0.94, 0.3), (r * 0.92, 0.06)], 28)
    c.disc("CrewCabin_Instruments", Cx, u, v, r * 0.93, 0.06, fr)
    c.disc("CrewCabin_InstrumentGlass", Cx, u, v, r * 0.93, 0.25, None, 20)
    c.node("Gauge_FuelAuto", "needle_white", Cx, u, v, 0.12, pointer(r * 0.8, 0.07), spin=-math.radians(325), turn=turn_scale(left), rest=100.0)
    c.node("Gauge_FuelManual", "needle_white", Cx, u, v, 0.18, pointer(r * 0.8, 0.07), spin=-math.radians(35), turn=turn_scale(right), rest=100.0)
    # the snorkel's pull handle, the landing bag's switch, and the four fuel shut-off handles down the inner edge
    u, v = cfig(440, 1070)
    c.into("CrewCabin_WhiteCaps").tube(Cx @ Vector((u - 0.9, v, 0.5)), Cx @ Vector((u + 0.9, v, 0.5)), 0.2 * IN, 10)
    c.into("CrewCabin_PanelFittings").tube(Cx @ Vector((u, v, 0.0)), Cx @ Vector((u, v, 0.5)), 0.08 * IN, 8)
    rg2.text("WARNING\nPULL OPEN SNORKEL\nONLY BELOW 20,000 FT", u + 0.2, v - 0.75, 0.08, INK)
    for name, py in (("MANUAL", 950), ("ROLL", 1065), ("YAW", 1165), ("PITCH", 1270)):
        u, v = cfig(552, py)
        c.into("CrewCabin_Knobs" if name == "MANUAL" else "CrewCabin_PanelFittings").box(
            (0.5 * IN, 2.0 * IN, 0.5 * IN), Cx @ Matrix.Translation((u, v, 0.75)) @ Matrix.Scale(1 / IN, 4)
        )
        c.into("CrewCabin_PanelFittings").tube(Cx @ Vector((u, v, 0.0)), Cx @ Vector((u, v, 0.55)), 0.09 * IN, 8)
        rg2.text(name, u - 0.55, v, 0.085, INK, turn=1)
    # the fuse panel, on the wall beyond the console
    hinge2 = Vector(Cx @ Vector((part[5][0], 0, 0))) / IN
    f_ = FUSE_CANT
    fx = ex * math.cos(f_) - ez * math.sin(f_)
    Fx = plane(hinge2 + ey * -2.5, fx, ey)
    fw, fh = 8.6, 15.0
    rect = [(-fw, -fh / 2), (0, -fh / 2), (0, fh / 2), (-fw, fh / 2)]
    rg3 = sheet.take(fw, fh, 74, -fw, -fh / 2, at=(1216, 0))
    c.flat("CrewCabin_Consoles", Fx, rect, rg3)
    c.skirt("CrewCabin_PanelStructure", Fx, rect, 0.0, -0.6)
    c.flat("CrewCabin_PanelStructure", Fx, rect, None, -0.6, flip=True)
    for row, names in enumerate(FUSES):
        v = fh / 2 - 1.9 - row * 2.75
        rg3.rect(-fw + 0.25, v - 0.75, -fw + 0.25 + len(names) * 1.14 + 0.2, v + 0.75, BLACK, r=0.06)
        rg3.text("1 UP", -0.5, v + 0.5, 0.085, (0.6, 0.5, 0.1))
        rg3.text("2 DN", -0.5, v - 0.5, 0.085, (0.6, 0.5, 0.1))
        for i, name in enumerate(names):
            u = -fw + 0.92 + i * 1.14
            fuse(c, Fx, u, v)
            rg3.text(name, u, v + 1.22, 0.08, INK)
    # the right console, under the hatch: the emergency oxygen lever and the suit and cabin temperature selectors
    R = plane(Vector((24.6, 3.5, 15.5)), Vector((0.26, -0.966, 0)), Vector((-0.33, -0.09, 0.94)))
    rw, rh = 6.6, 8.2
    rect = [(-rw / 2, -rh / 2), (rw / 2, -rh / 2), (rw / 2, rh / 2), (-rw / 2, rh / 2)]
    rg4 = sheet.take(rw, rh, 74, -rw / 2, -rh / 2, at=(502, 1368))
    c.flat("CrewCabin_Consoles", R, rect, rg4)
    c.skirt("CrewCabin_PanelStructure", R, rect, 0.0, -2.2)
    rg4.text("EMER O2", 0, 3.5, 0.1, INK)
    rg4.text("EMER", -1.2, 3.05, 0.08, INK)
    rg4.text("NORM", 1.2, 3.05, 0.08, INK)
    c.into("CrewCabin_RedCaps").tube(R @ Vector((-2.2, 3.0, 0.3)), R @ Vector((-2.9, 3.4, 0.9)), 0.28 * IN, 10)
    for name, v in (("SUIT TEMP", 1.2), ("CABIN TEMP", -1.8)):
        rg4.text(name, 0.9, v + 1.0, 0.09, INK)
        rg4.text("COOLER", -2.0, v + 0.6, 0.08, INK)
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


def stowage(c: Cabin, portholes, out: dict) -> None:
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
    box(-9.5, -27.0, 6.0, 3.2, 5.5, 3.6)
    gear.tube(Vector((-9.5, -24.2, 7.8)) * IN, Vector((-9.5, -22.8, 8.4)) * IN, 0.9 * IN, 12)
    # the earth-sky camera at the lower right window (Results, p. 24)
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
    # the survival kit, at the left of the couch (SEDR 104 Figure 1-6, the orbital capsule: not checked for No. 7)
    soft(c.into("CrewCabin_Stowage"), Matrix.Translation(Vector((-17.0, -14.5, 8.5)) * IN) @ Matrix.Rotation(-0.3, 4, "Z"), (4.5, 11.0, 5.0), 1.2)
    # two cabin floodlights above and either side of the pilot's head (SEDR 104, 10-19, the orbital capsule: No. 7's are not in anything read)
    lamps = []
    for sx in (-1, 1):
        th = math.radians(-90 + sx * 38)
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
    for k in range(3):
        run_ = [(-22.6 - 0.1 * k, 4.0 + 0.9 * k, 13.0), (-24.2, 6.0 + 0.9 * k, 9.0), (-25.4, 9.0 + 0.9 * k, 5.0), (-24.0, 13.0 + 0.6 * k, 1.6)]
        loom.loft([Vector(p) * IN for p in run_], [(0.32 * IN, 0.32 * IN)] * len(run_), 8)


def hatch_inside(parent, vessel: Surf, M: dict, hatch) -> None:
    """The latch hatch's inner face: painted like the wall, with the internal release handle
    along its forward edge (Postlaunch Report, Figure 3.1-1). The mechanism itself is not in anything read."""
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
