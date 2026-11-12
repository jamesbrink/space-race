"""What stands inside a building of the 1950s and 1960s: instrument consoles and relay racks with
real faces (meters, switches, lamps, labels), chairs, desks, lockers, clocks, cable trays, ceiling
lights. For any site: a blockhouse, a ready room, an office on a gantry, a trailer.

Lengths are in the site's units (sitelib.use), as everywhere; the sizes these pieces choose for
themselves are in feet. Everything is placed by a frame: `at(origin, facing)` gives a piece's own
axes on the floor, X to its right as you face it, Y away from you (into it), Z up.

All of it is built only at full detail (`close()`), except a piece's body, which is kept at every
level so a room seen through a window from across the site is not empty.

Materials a site must provide (sitelib.Parts keys): `console` (the cabinet's paint), `panelface`
(the instrument panels' own, darker), `black`, `sign` (white: dials, paper), `chrome`, `interior`
(dark upholstery and screens), `lamp` (white, emissive), `lamp-red`, `lamp-green`, `lamp-amber`,
`plank`, `deck` (galvanised: trays). Nothing here is a particular maker's console: the faces are
the period's vocabulary, arranged by whoever calls them, and a site must say so in its record.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import sitelib
import srlib
from sitelib import Parts, foot

LAMPS = {"r": "lamp-red", "g": "lamp-green", "a": "lamp-amber", "w": "lamp"}


def close() -> bool:
    """Whether to build what only someone standing in the room sees."""
    return srlib.DETAIL >= 1.0


def at(origin, facing: float = 0.0) -> Matrix:
    """A piece's frame on a floor: at `origin` (site units), turned so that someone using it looks
    along `facing` degrees (anticlockwise from the site's +X, seen from above). Metres."""
    a = math.radians(facing)
    return sitelib.axes(origin, (math.sin(a), -math.cos(a), 0.0), (0.0, 0.0, 1.0))


def _box(mb, m: Matrix, lo, hi) -> None:
    u = sitelib.UNIT
    lo, hi = Vector(lo), Vector(hi)
    mb.box(tuple(abs(v) * u for v in hi - lo), m @ Matrix.Translation((lo + hi) / 2 * u))


def _stub(mb, m: Matrix, p, r: float, h: float, segs: int = 10) -> None:
    """A round stub standing on the frame's XY plane at p, along +Z."""
    u = sitelib.UNIT
    mb.lathe([(r * u, 0.0), (r * u, h * u), (0.0, h * u)], segs, matrix=m @ Matrix.Translation(Vector(p) * u))


def _rod(mb, m: Matrix, a, b, r: float, segs: int = 6) -> None:
    u = sitelib.UNIT
    mb.tube(m @ (Vector(a) * u), m @ (Vector(b) * u), r * u, segs)


def _text(mb, m: Matrix, body: str, size: float, p, font=None) -> None:
    """Flat lettering on the frame's XY plane, centred on p, reading along +X."""
    u = sitelib.UNIT
    verts, faces = srlib.text_mesh(body, size * u, font, cuts=0)
    xs = [v[0] for v in verts]
    mid = (max(xs) + min(xs)) / 2
    o = Vector(p) * u
    mb.add([tuple(m @ Vector((o.x + x - mid, o.y + y - size * u * 0.36, o.z))) for x, y, _ in verts], faces)


def panel(parts: Parts, node: str, m: Matrix, width: float, height: float, rows, *, title: str = "", font=None, seed: int = 1) -> None:
    """An instrument panel's face: a plate on the frame's XY plane (origin its lower left corner, X
    along it, Y up it, Z out of it) carrying rows of instruments, top to bottom. A row is one of
      ("meters", n)      round panel meters, needles at various readings
      ("switches", n)    toggle switches, some up and some down
      ("lamps", "rgaw")  indicator lamps: red, green, amber, white, in that order
      ("buttons", n)     square push buttons, the first one red
      ("screen",)        a television monitor
      ("recorder",)      a strip-chart recorder: paper behind a window, two knobs
      ("label", "TEXT")  an engraved legend
    `title` is lettered across the top. Nothing is built below full detail but the plate."""
    f = foot()
    face = parts(node, "panelface")
    _box(face, m, (0.02 * f, 0.02 * f, 0.0), (width - 0.02 * f, height - 0.02 * f, 0.03 * f))
    if not close():
        return
    black, white, chrome, dark = (
        parts(node, "black/instruments", True),
        parts(node, "sign/dials", True),
        parts(node, "chrome", True),
        parts(node, "interior/screens"),
    )
    ink = parts(node, "sign/legends")
    z = 0.03 * f
    top = height - 0.06 * f
    if title:
        _text(ink, m, title, 0.085 * f, (width / 2, top - 0.07 * f, z + 0.006 * f), font)
        top -= 0.2 * f
    weights = [0.45 if r[0] == "label" else 2.2 if r[0] in ("screen", "recorder") else 1.5 if r[0] == "meters" else 1.0 for r in rows]
    if not rows:  # a blank panel: its plate and nothing on it
        return
    unit = (top - 0.06 * f) / sum(weights)
    rnd = seed * 7919
    y = top
    for row, wt in zip(rows, weights):
        h = unit * wt
        cy = y - h / 2
        y -= h
        kind = row[0]
        n = len(row[1]) if kind == "lamps" else row[1] if kind in ("meters", "switches", "buttons") else 1
        xs = [width * (k + 0.5) / n for k in range(n)]
        if kind == "meters":
            r = min(h * 0.44, width / n * 0.4)
            for x in xs:
                rnd = (rnd * 16807 + 11) % 2147483647
                _stub(black, m, (x, cy, z), r, 0.03 * f, 14)
                _stub(white, m, (x, cy, z), r * 0.84, 0.04 * f, 14)
                a = math.radians(140 - 100 * (rnd % 1000) / 1000)
                c = Vector((x + r * 0.35 * math.cos(a), cy - r * 0.3 + r * 0.35 * math.sin(a), z + 0.045 * f))
                needle = m @ Matrix.Translation(c * sitelib.UNIT) @ Matrix.Rotation(a, 4, "Z")
                black.box((r * 0.75 * sitelib.UNIT, r * 0.05 * sitelib.UNIT, 0.008 * f * sitelib.UNIT), needle)
        elif kind == "switches":
            for x in xs:
                rnd = (rnd * 16807 + 11) % 2147483647
                up = 1 if rnd % 3 else -1
                _stub(chrome, m, (x, cy, z), 0.04 * f, 0.02 * f, 6)
                _rod(chrome, m, (x, cy, z + 0.02 * f), (x, cy + up * 0.045 * f, z + 0.12 * f), 0.013 * f, 5)
        elif kind == "lamps":
            for x, c in zip(xs, row[1]):
                _stub(chrome, m, (x, cy, z), 0.06 * f, 0.02 * f, 10)
                _stub(parts(node, LAMPS[c], True), m, (x, cy, z), 0.042 * f, 0.045 * f, 10)
        elif kind == "buttons":
            for k, x in enumerate(xs):
                _box(parts(node, "lamp-red") if k == 0 else black, m, (x - 0.05 * f, cy - 0.05 * f, z), (x + 0.05 * f, cy + 0.05 * f, z + 0.04 * f))
        elif kind == "screen":
            w = min(width - 0.3 * f, h * 1.25)
            _box(black, m, (width / 2 - w / 2 - 0.06 * f, cy - h * 0.46, z), (width / 2 + w / 2 + 0.06 * f, cy + h * 0.46, z + 0.05 * f))
            _box(dark, m, (width / 2 - w / 2, cy - h * 0.4, z + 0.03 * f), (width / 2 + w / 2, cy + h * 0.4, z + 0.062 * f))
        elif kind == "recorder":
            w = width - 0.4 * f
            _box(black, m, (width / 2 - w / 2 - 0.05 * f, cy - h * 0.44, z), (width / 2 + w / 2 + 0.05 * f, cy + h * 0.44, z + 0.04 * f))
            _box(white, m, (width / 2 - w / 2, cy - h * 0.2, z + 0.02 * f), (width / 2 + w / 2, cy + h * 0.38, z + 0.05 * f))
            for dx in (-w * 0.3, w * 0.3):
                _stub(chrome, m, (width / 2 + dx, cy - h * 0.32, z + 0.04 * f), 0.04 * f, 0.05 * f, 8)
        elif kind == "label":
            _text(ink, m, row[1], min(0.07 * f, h * 0.6), (width / 2, cy, z + 0.006 * f), font)


def console(parts: Parts, node: str, m: Matrix, width: float, modules, *, font=None, seed: int = 1) -> None:
    """A sit-down console: a cabinet with a writing shelf and a sloped turret of panels, one panel
    for each of `modules`: (title, rows), the rows as for panel(). The frame is on the floor at the
    middle of the operator's edge; he faces +Y."""
    f = foot()
    body = parts(node, "console")
    w = width / 2
    _box(body, m, (-w, 0.9 * f, 0.0), (w, 2.9 * f, 2.35 * f))  # the cabinet, a knee hole in front of it
    for s in (-1, 1):
        _box(body, m, (s * w, 0.0, 0.0), (s * (w - 0.12 * f), 0.9 * f, 2.35 * f))
    _box(parts(node, "black/shelf"), m, (-w - 0.03 * f, -0.15 * f, 2.35 * f), (w + 0.03 * f, 1.3 * f, 2.45 * f))  # the shelf
    # the turret: its face slopes back from the shelf
    y0, y1, z0, z1, lean = 1.3 * f, 2.9 * f, 2.45 * f, 4.0 * f, 0.85 * f
    u = sitelib.UNIT
    loops = [[m @ (Vector(p) * u) for p in ((x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0 + lean, z1))] for x in (-w, w)]
    k = 4
    verts = [tuple(v) for loop in loops for v in loop]
    body.add(verts, [(i, (i + 1) % k, k + (i + 1) % k, k + i) for i in range(k)] + [(3, 2, 1, 0), (4, 5, 6, 7)])
    slope = math.hypot(lean, z1 - z0)
    up = Vector((0.0, lean, z1 - z0)).normalized()
    n = len(modules)
    for i, (title, rows) in enumerate(modules):
        x = -w + width * i / n
        pm = m @ sitelib.axes_local((x, y0, z0), (1, 0, 0), up, u)
        panel(parts, node, pm, width / n, slope, rows, title=title, font=font, seed=seed * 31 + i)


def rack(
    parts: Parts,
    node: str,
    m: Matrix,
    panels,
    *,
    width: float | None = None,
    height: float | None = None,
    depth: float | None = None,
    font=None,
    seed: int = 1,
) -> None:
    """A relay rack: a tall cabinet whose front (toward -Y of the frame, which stands at the middle
    of its front edge on the floor) is a column of panels, top to bottom: (title, rows, share of
    the height). A blank panel is ("", [], share)."""
    f = foot()
    width, height, depth = (2.0 * f if width is None else width), (6.6 * f if height is None else height), (2.0 * f if depth is None else depth)
    _box(parts(node, "console"), m, (-width / 2, 0.0, 0.0), (width / 2, depth, height))
    total = sum(p[2] for p in panels)
    z = height - 0.15 * f
    usable = height - 0.5 * f
    for i, (title, rows, share) in enumerate(panels):
        h = usable * share / total
        z -= h
        pm = m @ sitelib.axes_local((-width / 2 + 0.08 * f, 0.0, z), (1, 0, 0), (0, 0, 1), sitelib.UNIT)
        panel(parts, node, pm, width - 0.16 * f, h, rows, title=title, font=font, seed=seed * 17 + i)


def chair(parts: Parts, node: str, m: Matrix) -> None:
    """A steel office chair on a pedestal: the frame is on the floor under the seat's middle, the sitter facing +Y."""
    if not close():
        return
    f = foot()
    pad, steel = parts(node, "interior/upholstery"), parts(node, "chrome", True)
    _box(pad, m, (-0.7 * f, -0.7 * f, 1.4 * f), (0.7 * f, 0.7 * f, 1.6 * f))
    _box(pad, m, (-0.65 * f, -0.85 * f, 2.1 * f), (0.65 * f, -0.72 * f, 3.0 * f))
    for s in (-0.45, 0.45):
        _rod(steel, m, (s * f, -0.7 * f, 1.42 * f), (s * f, -0.79 * f, 2.3 * f), 0.035 * f)
    _rod(steel, m, (0, 0, 0.25 * f), (0, 0, 1.4 * f), 0.07 * f, 8)
    for k in range(4):
        a = math.tau * (k + 0.5) / 4
        _rod(steel, m, (0, 0, 0.3 * f), (0.8 * f * math.cos(a), 0.8 * f * math.sin(a), 0.06 * f), 0.04 * f)


def clock(parts: Parts, node: str, m: Matrix, *, hour: float = 9.57, radius: float | None = None) -> None:
    """A wall clock: the frame's origin is its middle on the wall, Z out of the wall, Y up. `hour` is the time shown."""
    if not close():
        return
    f = foot()
    r = 0.6 * f if radius is None else radius
    black, white = parts(node, "black/instruments", True), parts(node, "sign/dials", True)
    _stub(black, m, (0, 0, 0), r, 0.12 * f, 20)
    _stub(white, m, (0, 0, 0), r * 0.9, 0.14 * f, 20)
    u = sitelib.UNIT
    for length, turn in ((0.5, hour / 12), (0.78, hour % 1)):
        a = math.pi / 2 - math.tau * turn
        c = Vector((r * length / 2 * math.cos(a), r * length / 2 * math.sin(a), 0.15 * f))
        black.box((r * length * u, r * 0.06 * u, 0.01 * f * u), m @ Matrix.Translation(c * u) @ Matrix.Rotation(a, 4, "Z"))


def tray(parts: Parts, node: str, a, b, *, width: float | None = None) -> None:
    """A cable tray hung under a ceiling from a to b (site units, its underside): two rails and rungs, cables lying in it."""
    f = foot()
    width = 1.0 * f if width is None else width
    a, b = Vector(a), Vector(b)
    along = (b - a).normalized()
    side = Vector((-along.y, along.x, 0.0)) * (width / 2)
    steel = parts(node, "deck/trays")
    for s in (-1, 1):
        sitelib.beam(steel, tuple(a + side * s), tuple(b + side * s), 0.1 * f)
    if not close():
        return
    n = max(1, round((b - a).length / (1.5 * f)))
    for k in range(n + 1):
        p = a + (b - a) * k / n
        sitelib.beam(steel, tuple(p - side), tuple(p + side), 0.06 * f)
    cable = parts(node, "cable", True)
    for k, off in enumerate((-0.28, -0.05, 0.2)):
        up = Vector((0, 0, (0.1 + 0.03 * k) * f))
        cable.tube((a + side * off + up) * sitelib.UNIT, (b + side * off + up) * sitelib.UNIT, (0.05 + 0.012 * k) * f * sitelib.UNIT, 6)


def ceiling_light(
    parts: Parts, node: str, name: str | None, centre, *, along=(1.0, 0.0), length: float | None = None, intensity: float = 1.0, reach: float = 8.0
) -> None:
    """A fluorescent fitting under a ceiling at `centre` (site units, the ceiling's height), and
    the mark the viewer puts a light at: an empty `Light_<name>` under `node`, carrying `intensity`
    and `reach` (metres). One fitting in a room is named for the room and its light stands for all
    of them; the others are given no name and are fittings only. The tubes' material is `lamp`.

    `intensity` is in fittings: 1.0 is one two-tube 40 W fluorescent of the period, about 5,000 lm
    (estimated: a round figure for the type, from no catalogue), and a room is given the number of
    fittings that light it. What that is on the screen is the viewer's business: its exposure
    indoors is one value at every hour (stage.ts: INDOORS_EXPOSURE), set so that a room with one
    fitting to every 150 square feet or so reads as lit by them. The mark hangs 2 ft 6 in under
    the ceiling, not at it: from the fitting's own height the one light that stands for the
    room's fittings meets the ceiling at a glancing angle, and the ceiling was black."""
    f = foot()
    length = 4.0 * f if length is None else length
    c = Vector(centre)
    d = Vector((along[0], along[1], 0.0)).normalized()
    s = Vector((-d.y, d.x, 0.0))
    sitelib.obox(parts(node, "sign/fittings"), tuple(c - Vector((0, 0, 0.12 * f))), tuple(d), (0, 0, 1), (length, 1.0 * f, 0.24 * f))
    for off in (-0.25, 0.25):
        sitelib.obox(
            parts(node, "lamp/tubes"), tuple(c + s * (off * f) - Vector((0, 0, 0.3 * f))), tuple(d), (0, 0, 1), (length - 0.3 * f, 0.12 * f, 0.12 * f)
        )
    if name:
        parts.node(f"Light_{name}", node, tuple(c - Vector((0, 0, 2.5 * f))), intensity=float(intensity), reach=float(reach))


def floor_joints(parts: Parts, node: str, x0: float, y0: float, x1: float, y1: float, z: float, *, pitch: float | None = None, inside=None) -> None:
    """Tile joints on a floor: dark lines every `pitch` (two feet unless told), 2 mm proud of it.
    `inside(x, y)` says whether a point is in the room, for a room that is not a rectangle."""
    if not close():
        return
    f = foot()
    pitch = 2.0 * f if pitch is None else pitch
    mb = parts(node, "joint/floor")
    t, lift, step = 0.02 * f, 0.007 * f, pitch / 2

    def run(horizontal: bool, c: float, lo: float, hi: float) -> None:
        start = None
        k = 0
        while lo + k * step <= hi + 1e-6:
            s = lo + k * step
            ok = inside is None or inside(*((s, c) if horizontal else (c, s)))
            if ok and start is None:
                start = s
            if start is not None and (not ok or s + step > hi):
                end = s if ok else s - step
                if end - start > step * 0.5:
                    lo3, hi3 = (
                        ((start, c - t / 2, z), (end, c + t / 2, z + lift)) if horizontal else ((c - t / 2, start, z), (c + t / 2, end, z + lift))
                    )
                    q = [(lo3[0], lo3[1]), (hi3[0], lo3[1]), (hi3[0], hi3[1]), (lo3[0], hi3[1])]
                    top = (
                        z + lift + (0.0 if horizontal else 0.005 * f)
                    )  # the two sets at different heights: where they cross, neither shares the other's face
                    mb.add([tuple(sitelib.P(x, y, top)) for x, y in q], [(0, 1, 2, 3)])
                start = None
            k += 1

    n = 1
    while y0 + n * pitch < y1:
        run(True, y0 + n * pitch, x0, x1)
        n += 1
    n = 1
    while x0 + n * pitch < x1:
        run(False, x0 + n * pitch, y0, y1)
        n += 1


# ------------------------------------------------------------------ furniture and fittings
# The ordinary contents of an office, a ready room, a kitchen, a test trailer and a generator house
# of the period, by kind: none of it is any one maker's, and a site must say so in its record.
# Each is placed by a frame from at(): on the floor at the middle of the edge its user stands at,
# facing +Y. Bodies are built at every level (a room seen through a window is not empty); what only
# someone in the room sees (drawer fronts, handles, a telephone) only at full detail.


def _face(m: Matrix, origin, right, up) -> Matrix:
    """A frame on a face of a piece, for panel(): origin its lower left corner (site units, in the piece's frame)."""
    return m @ sitelib.axes_local(origin, right, up, sitelib.UNIT)


def telephone(parts: Parts, node: str, m: Matrix) -> None:
    """A desk telephone of the 1950s, its frame on the desk top under its middle, the dial toward -Y."""
    if not close():
        return
    f = foot()
    black, white = parts(node, "black/instruments", True), parts(node, "sign/dials", True)
    _box(black, m, (-0.32 * f, -0.38 * f, 0.0), (0.32 * f, 0.38 * f, 0.22 * f))
    _box(black, m, (-0.26 * f, -0.3 * f, 0.22 * f), (0.26 * f, 0.22 * f, 0.33 * f))
    face = _face(m, (0.0, -0.36 * f, 0.15 * f), (1, 0, 0), (0, 0.45, 1))
    _stub(white, face, (0.0, 0.0, 0.0), 0.15 * f, 0.03 * f, 14)
    for s in (-1, 1):  # the cradle's horns and the handset across them
        _stub(black, m, (s * 0.2 * f, 0.08 * f, 0.33 * f), 0.05 * f, 0.08 * f, 8)
        _box(black, m, (s * 0.38 * f - 0.08 * f, -0.02 * f, 0.4 * f), (s * 0.38 * f + 0.08 * f, 0.18 * f, 0.5 * f))
    _box(black, m, (-0.32 * f, 0.03 * f, 0.43 * f), (0.32 * f, 0.13 * f, 0.5 * f))


def desk(parts: Parts, node: str, m: Matrix, *, width: float | None = None, phone: bool = True) -> None:
    """A steel office desk: a lino top, a pedestal of three drawers on the right, a modesty panel,
    a blotter and papers, a telephone. The sitter faces +Y."""
    f = foot()
    w, d, h = (5.0 * f if width is None else width) / 2, 2.5 * f, 2.5 * f
    body, top = parts(node, "console"), parts(node, "black/shelf")
    _box(top, m, (-w, 0.0, h - 0.1 * f), (w, d, h))
    _box(body, m, (w - 1.35 * f, 0.08 * f, 0.0), (w - 0.06 * f, d - 0.06 * f, h - 0.1 * f))
    _box(body, m, (-w + 0.06 * f, 0.08 * f, 0.0), (-w + 0.18 * f, d - 0.06 * f, h - 0.1 * f))
    _box(body, m, (-w + 0.18 * f, d - 0.2 * f, 0.7 * f), (w - 1.35 * f, d - 0.12 * f, h - 0.1 * f))
    if not close():
        return
    chrome, paper, blot = parts(node, "chrome", True), parts(node, "sign/paper"), parts(node, "interior/blotter")
    for z0, z1 in ((0.1 * f, 0.95 * f), (1.0 * f, 1.65 * f), (1.7 * f, 2.33 * f)):
        _box(body, m, (w - 1.3 * f, 0.03 * f, z0), (w - 0.11 * f, 0.1 * f, z1))
        _rod(chrome, m, (w - 0.95 * f, 0.0, (z0 + z1) / 2 + 0.1 * f), (w - 0.46 * f, 0.0, (z0 + z1) / 2 + 0.1 * f), 0.025 * f)
    _box(body, m, (-w + 0.3 * f, 0.03 * f, h - 0.4 * f), (w - 1.45 * f, 0.1 * f, h - 0.12 * f))  # the middle drawer
    _box(blot, m, (-w + 0.6 * f, 0.25 * f, h), (w - 1.6 * f, 1.85 * f, h + 0.02 * f))
    for k in range(3):
        x, y, z = -w + 0.8 * f + k * 0.08 * f, 0.4 * f + k * 0.1 * f, h + 0.03 * f + k * 0.008 * f
        _box(paper, m, (x, y, z), (x + 0.7 * f, y + 0.9 * f, z + 0.006 * f))
    if phone:
        telephone(parts, node, m @ Matrix.Translation(Vector((w - 0.8 * f, 1.4 * f, h)) * sitelib.UNIT))


def lockers(parts: Parts, node: str, m: Matrix, n: int, *, width: float | None = None, height: float | None = None) -> None:
    """A bank of `n` steel lockers on a dark plinth, their doors toward -Y: louvres top and bottom, a lift handle, a number plate."""
    f = foot()
    w, d, h = (1.2 * f if width is None else width), 1.5 * f, (6.0 * f if height is None else height)
    x0 = -n * w / 2
    _box(parts(node, "black/plinth"), m, (x0 + 0.05 * f, 0.1 * f, 0.0), (-x0 - 0.05 * f, d - 0.05 * f, 0.32 * f))
    body = parts(node, "console")
    _box(body, m, (x0, 0.04 * f, 0.3 * f), (-x0, d, h))
    if not close():
        return
    dark, chrome, plate = parts(node, "black/vents"), parts(node, "chrome", True), parts(node, "sign/plates")
    for k in range(n):
        a, b = x0 + k * w + 0.04 * f, x0 + (k + 1) * w - 0.04 * f
        _box(body, m, (a, -0.02 * f, 0.36 * f), (b, 0.06 * f, h - 0.06 * f))  # the door
        for z in [h - 0.5 * f - j * 0.12 * f for j in range(5)] + [0.7 * f + j * 0.12 * f for j in range(4)]:
            _box(dark, m, (a + 0.25 * f, -0.03 * f, z), (b - 0.25 * f, -0.01 * f, z + 0.05 * f))
        _rod(chrome, m, (b - 0.18 * f, -0.02 * f, h * 0.48), (b - 0.18 * f, -0.12 * f, h * 0.48), 0.03 * f)
        _box(chrome, m, (b - 0.26 * f, -0.04 * f, h * 0.44), (b - 0.1 * f, -0.01 * f, h * 0.53))
        _box(plate, m, ((a + b) / 2 - 0.15 * f, -0.03 * f, h - 1.15 * f), ((a + b) / 2 + 0.15 * f, -0.015 * f, h - 0.95 * f))


def cabinet(parts: Parts, node: str, m: Matrix, *, drawers: int = 4) -> None:
    """A steel filing cabinet, its drawers toward -Y, each with a pull and a card holder."""
    f = foot()
    w, d, h = 1.25 * f, 2.3 * f, 4.4 * f
    body = parts(node, "console")
    _box(body, m, (-w / 2, 0.04 * f, 0.0), (w / 2, d, h))
    if not close():
        return
    chrome = parts(node, "chrome", True)
    for k in range(drawers):
        z0 = 0.15 * f + k * (h - 0.25 * f) / drawers
        z1 = z0 + (h - 0.25 * f) / drawers - 0.06 * f
        _box(body, m, (-w / 2 + 0.05 * f, -0.03 * f, z0), (w / 2 - 0.05 * f, 0.06 * f, z1))
        _box(chrome, m, (-0.25 * f, -0.09 * f, (z0 + z1) / 2 - 0.05 * f), (0.25 * f, -0.02 * f, (z0 + z1) / 2 + 0.03 * f))
        _box(parts(node, "sign/plates"), m, (-0.18 * f, -0.045 * f, z1 - 0.3 * f), (0.18 * f, -0.02 * f, z1 - 0.15 * f))


def table(parts: Parts, node: str, m: Matrix, width: float, depth: float, *, height: float | None = None) -> None:
    """A table: a laminate top on four chromed tube legs, the frame under the middle of its near edge."""
    f = foot()
    h = 2.5 * f if height is None else height
    _box(parts(node, "trailer/tabletop"), m, (-width / 2, 0.0, h - 0.1 * f), (width / 2, depth, h))
    legs = parts(node, "chrome", True)
    for x in (-width / 2 + 0.3 * f, width / 2 - 0.3 * f):
        for y in (0.3 * f, depth - 0.3 * f):
            _rod(legs, m, (x, y, 0.0), (x, y, h - 0.1 * f), 0.05 * f, 8)


def bench(parts: Parts, node: str, m: Matrix, length: float) -> None:
    """A slatted bench on two steel legs, the frame under the middle of its near edge."""
    f = foot()
    wood, steel = parts(node, "plank"), parts(node, "black/legs")
    for k in range(3):
        _box(wood, m, (-length / 2, 0.05 * f + k * 0.38 * f, 1.4 * f), (length / 2, 0.38 * f + k * 0.38 * f, 1.5 * f))
    for x in (-length / 2 + 0.6 * f, length / 2 - 0.6 * f):
        _box(steel, m, (x - 0.06 * f, 0.1 * f, 0.0), (x + 0.06 * f, 1.1 * f, 1.4 * f))


def stool(parts: Parts, node: str, m: Matrix) -> None:
    """A round steel stool, its frame on the floor under the seat."""
    if not close():
        return
    f = foot()
    _stub(parts(node, "interior/upholstery"), m, (0.0, 0.0, 2.0 * f), 0.55 * f, 0.15 * f, 14)
    steel = parts(node, "chrome", True)
    for k in range(4):
        a = math.tau * (k + 0.5) / 4
        _rod(steel, m, (0.3 * f * math.cos(a), 0.3 * f * math.sin(a), 2.0 * f), (0.55 * f * math.cos(a), 0.55 * f * math.sin(a), 0.0), 0.035 * f)


def counter(parts: Parts, node: str, m: Matrix, length: float, *, sink: float | None = None) -> None:
    """A kitchen counter against a wall at +Y: base cabinets with doors, a top with a backsplash and,
    `sink` along it (from the left end), a sink with its tap. The frame is under the middle of its front."""
    f = foot()
    d, h = 2.0 * f, 3.0 * f
    x0, x1 = -length / 2, length / 2
    body, top = parts(node, "console"), parts(node, "trailer/tabletop")
    _box(parts(node, "black/plinth"), m, (x0, 0.25 * f, 0.0), (x1, d, 0.35 * f))
    if sink is None:
        _box(body, m, (x0, 0.08 * f, 0.33 * f), (x1, d, h - 0.12 * f))
    else:  # lower under the basin
        s = x0 + sink
        for a, b, z in ((x0, s - 1.0 * f, h - 0.12 * f), (s - 1.0 * f, s + 1.0 * f, h - 0.76 * f), (s + 1.0 * f, x1, h - 0.12 * f)):
            _box(body, m, (a, 0.08 * f, 0.33 * f), (b, d, z))
    edges = [(x0, x1)] if sink is None else [(x0, x0 + sink - 1.0 * f), (x0 + sink + 1.0 * f, x1)]
    for a, b in edges:
        _box(top, m, (a, 0.0, h - 0.12 * f), (b, d, h))
    _box(top, m, (x0, d - 0.08 * f, h), (x1, d, h + 0.4 * f))  # backsplash
    if sink is not None:
        s = x0 + sink
        steel = parts(node, "chrome", True)
        _box(top, m, (s - 1.0 * f, 0.0, h - 0.12 * f), (s + 1.0 * f, 0.15 * f, h))
        _box(top, m, (s - 1.0 * f, 1.6 * f, h - 0.12 * f), (s + 1.0 * f, d - 0.08 * f, h))
        for lo, hi in (((s - 0.9 * f, 0.15 * f, h - 0.75 * f), (s + 0.9 * f, 1.6 * f, h - 0.7 * f)),):  # the basin's floor and sides
            _box(steel, m, lo, hi)
        for a, b in (((s - 1.0 * f, 0.15 * f), (s - 0.9 * f, 1.6 * f)), ((s + 0.9 * f, 0.15 * f), (s + 1.0 * f, 1.6 * f))):
            _box(steel, m, (a[0], a[1], h - 0.75 * f), (b[0], b[1], h - 0.13 * f))
        for y0, y1 in ((0.15 * f, 0.25 * f), (1.5 * f, 1.6 * f)):
            _box(steel, m, (s - 0.9 * f, y0, h - 0.7 * f), (s + 0.9 * f, y1, h - 0.13 * f))
        if close():
            _rod(steel, m, (s, 1.85 * f, h), (s, 1.85 * f, h + 0.9 * f), 0.05 * f, 8)
            _rod(steel, m, (s, 1.85 * f, h + 0.9 * f), (s, 1.3 * f, h + 0.75 * f), 0.04 * f, 8)
    if not close():
        return
    chrome = parts(node, "chrome", True)
    n = max(1, round(length / (1.5 * f)))
    for k in range(n):
        a, b = x0 + k * length / n + 0.05 * f, x0 + (k + 1) * length / n - 0.05 * f
        _box(body, m, (a, 0.02 * f, 0.4 * f), (b, 0.1 * f, h - 0.55 * f))
        _box(body, m, (a, 0.02 * f, h - 0.5 * f), (b, 0.1 * f, h - 0.17 * f))  # a drawer over it
        _box(chrome, m, ((a + b) / 2 - 0.2 * f, -0.03 * f, h - 0.38 * f), ((a + b) / 2 + 0.2 * f, 0.03 * f, h - 0.3 * f))
        _rod(chrome, m, (b - 0.15 * f, 0.0, h - 1.2 * f), (b - 0.15 * f, 0.0, h - 0.8 * f), 0.025 * f)


def refrigerator(parts: Parts, node: str, m: Matrix) -> None:
    """A refrigerator of the 1950s, its door toward -Y: a rounded white cabinet, a chrome latch handle, a dark plinth."""
    f = foot()
    w, d, h = 2.5 * f, 2.4 * f, 5.4 * f
    white = parts(node, "white/appliances", True)
    u = sitelib.UNIT
    r = 0.35 * f
    arc = [k * math.pi / 12 for k in range(7)]  # the rounded front of its top
    prof = [(0.12 * f, 0.4 * f), (d, 0.4 * f), (d, h)] + [(0.12 * f + r - r * math.sin(a), h - r + r * math.cos(a)) for a in arc]
    loops = [[m @ (Vector((x, y, z)) * u) for y, z in prof] for x in (-w / 2, w / 2)]
    k = len(prof)
    verts = [tuple(v) for loop in loops for v in loop]
    white.add(verts, [(i, (i + 1) % k, k + (i + 1) % k, k + i) for i in range(k)] + [tuple(reversed(range(k))), tuple(range(k, 2 * k))])
    _box(parts(node, "black/plinth"), m, (-w / 2 + 0.1 * f, 0.3 * f, 0.0), (w / 2 - 0.1 * f, d - 0.1 * f, 0.42 * f))
    if close():
        chrome = parts(node, "chrome", True)
        _box(parts(node, "black/vents"), m, (-w / 2 + 0.06 * f, 0.08 * f, h - 1.9 * f), (w / 2 - 0.06 * f, 0.14 * f, h - 1.85 * f))
        _box(chrome, m, (w / 2 - 0.45 * f, -0.05 * f, h - 2.6 * f), (w / 2 - 0.3 * f, 0.13 * f, h - 2.0 * f))
        _box(chrome, m, (-0.4 * f, 0.08 * f, 0.5 * f), (0.4 * f, 0.13 * f, 0.62 * f))


def stove(parts: Parts, node: str, m: Matrix) -> None:
    """A gas range against a wall at +Y: four burners, a back guard with its knobs, an oven door."""
    f = foot()
    w, d, h = 3.0 * f, 2.2 * f, 3.0 * f
    white = parts(node, "white/appliances", True)
    _box(white, m, (-w / 2, 0.06 * f, 0.35 * f), (w / 2, d, h))
    _box(white, m, (-w / 2, d - 0.25 * f, h), (w / 2, d, h + 0.8 * f))
    _box(parts(node, "black/plinth"), m, (-w / 2 + 0.1 * f, 0.3 * f, 0.0), (w / 2 - 0.1 * f, d - 0.1 * f, 0.37 * f))
    if not close():
        return
    black, chrome = parts(node, "black/instruments", True), parts(node, "chrome", True)
    for x in (-0.7 * f, 0.7 * f):
        for y in (0.6 * f, 1.4 * f):
            _stub(black, m, (x, y, h), 0.32 * f, 0.04 * f, 14)
            _stub(chrome, m, (x, y, h + 0.04 * f), 0.12 * f, 0.02 * f, 10)
    for k in range(4):
        _stub(chrome, _face(m, (-0.9 * f + k * 0.6 * f, d - 0.25 * f, h + 0.4 * f), (1, 0, 0), (0, 0, 1)), (0.0, 0.0, 0.0), 0.07 * f, 0.08 * f, 8)
    _box(white, m, (-w / 2 + 0.15 * f, 0.0, 0.5 * f), (w / 2 - 0.15 * f, 0.08 * f, h - 0.6 * f))  # the oven door
    _box(parts(node, "interior/screens"), m, (-0.6 * f, -0.01 * f, 1.3 * f), (0.6 * f, 0.02 * f, 2.0 * f))
    _rod(chrome, m, (-0.8 * f, -0.08 * f, h - 0.75 * f), (0.8 * f, -0.08 * f, h - 0.75 * f), 0.03 * f)


def urn(parts: Parts, node: str, m: Matrix) -> None:
    """A coffee urn on a counter, its tap toward -Y: the frame on the counter under its middle."""
    if not close():
        return
    f = foot()
    chrome = parts(node, "chrome", True)
    u = sitelib.UNIT
    prof = [(0.0, 0.0), (0.42 * f, 0.0), (0.45 * f, 0.15 * f), (0.45 * f, 1.6 * f), (0.38 * f, 1.75 * f), (0.1 * f, 1.82 * f), (0.0, 1.95 * f)]
    chrome.lathe([(r * u, z * u) for r, z in prof], 18, matrix=m)
    _rod(chrome, m, (0.0, -0.4 * f, 0.4 * f), (0.0, -0.6 * f, 0.4 * f), 0.04 * f)
    _rod(parts(node, "black/instruments", True), m, (0.0, -0.6 * f, 0.4 * f), (0.0, -0.6 * f, 0.25 * f), 0.035 * f)


def board(parts: Parts, node: str, m: Matrix, width: float, height: float, *, seed: int = 1) -> None:
    """A notice board on a wall, papers pinned to it: the frame at its lower left corner on the wall, Z out of it."""
    f = foot()
    _box(parts(node, "plank/board"), m, (0.0, 0.0, 0.0), (width, height, 0.06 * f))
    if not close():
        return
    paper = parts(node, "sign/paper")
    rnd = seed * 7919
    for k in range(max(2, round(width * height / (1.2 * f * f)))):
        rnd = (rnd * 16807 + 11) % 2147483647
        x = 0.15 * f + (rnd % 1000) / 1000 * (width - 1.0 * f)
        y = 0.15 * f + ((rnd // 1000) % 1000) / 1000 * (height - 1.2 * f)
        _box(paper, m, (x, y, 0.065 * f + k * 0.004 * f), (x + 0.7 * f, y + 0.95 * f, 0.07 * f + k * 0.004 * f))


def workbench(parts: Parts, node: str, m: Matrix, length: float, sets=(), *, font=None, seed: int = 1) -> None:
    """A steel workbench against a wall at +Y, a shelf under it, and on it a row of portable test
    sets, each a cabinet whose face is a panel(): `sets` are (title, rows, width)."""
    f = foot()
    d, h = 2.3 * f, 3.0 * f
    steel, top = parts(node, "console"), parts(node, "black/shelf")
    _box(top, m, (-length / 2, 0.0, h - 0.12 * f), (length / 2, d, h))
    _box(steel, m, (-length / 2 + 0.15 * f, 0.18 * f, 0.5 * f), (length / 2 - 0.15 * f, d - 0.05 * f, 0.6 * f))  # the shelf, inside the legs
    for x in (-length / 2 + 0.1 * f, length / 2 - 0.2 * f):
        for y in (0.15 * f, d - 0.15 * f):
            _box(steel, m, (x, y - 0.1 * f, 0.0), (x + 0.1 * f, y, h - 0.12 * f))
    x = -length / 2 + 0.3 * f
    for k, (title, rows, w) in enumerate(sets):
        hgt = 1.4 * f
        _box(parts(node, "black/cases"), m, (x, 0.5 * f, h), (x + w, d - 0.2 * f, h + hgt))
        face = _face(m, (x + 0.05 * f, 0.5 * f, h + 0.05 * f), (1, 0, 0), (0, 0, 1))
        panel(parts, node, face, w - 0.1 * f, hgt - 0.1 * f, rows, title=title, font=font, seed=seed * 13 + k)
        x += w + 0.25 * f


def generator_set(parts: Parts, node: str, m: Matrix, length: float, *, font=None) -> None:
    """A diesel engine and its generator on a skid, the frame on the floor under the middle of the
    skid's side that faces -Y: radiator at -X, engine, generator at +X, a control box on the
    generator with its meters toward -Y, the exhaust up from the engine."""
    f = foot()
    x0, x1, w = -length / 2, length / 2, 3.2 * f
    dark, paint = parts(node, "black/skid"), parts(node, "console")
    for y in (0.2 * f, w - 0.6 * f):
        _box(dark, m, (x0, y, 0.0), (x1, y + 0.4 * f, 0.6 * f))
    re = x0 + 0.6 * f
    _box(paint, m, (x0 + 0.1 * f, 0.4 * f, 0.6 * f), (re, w - 0.4 * f, 4.4 * f))  # radiator
    _box(paint, m, (re + 0.3 * f, 0.6 * f, 0.6 * f), (re + 4.0 * f, w - 0.6 * f, 3.4 * f))  # engine block
    _box(paint, m, (re + 0.6 * f, 0.9 * f, 3.4 * f), (re + 3.7 * f, w - 0.9 * f, 3.9 * f))  # rocker covers
    gx = re + 4.0 * f
    u = sitelib.UNIT
    paint_s = parts(node, "console/round", True)
    gl = (x1 - gx - 0.4 * f) * u
    along = m @ sitelib.axes_local((gx + 0.2 * f, w / 2, 2.0 * f), (0, 1, 0), (0, 0, 1), u)  # its Z along the skid
    paint_s.lathe([(0.0, 0.0), (1.25 * f * u, 0.0), (1.25 * f * u, gl), (0.0, gl)], 24, matrix=along)
    _box(dark, m, (gx + 0.5 * f, w / 2 - 1.0 * f, 0.6 * f), (x1 - 0.5 * f, w / 2 + 1.0 * f, 0.9 * f))  # its feet
    cb = (gx + 0.6 * f, x1 - 0.6 * f)
    _box(paint, m, (cb[0], 0.5 * f, 3.25 * f), (cb[1], 2.0 * f, 4.9 * f))
    face = _face(m, (cb[0] + 0.05 * f, 0.5 * f, 3.3 * f), (1, 0, 0), (0, 0, 1))
    panel(parts, node, face, cb[1] - cb[0] - 0.1 * f, 1.55 * f, [("meters", 3), ("lamps", "gar"), ("switches", 3)], font=font, seed=5)
    if close():
        grey = parts(node, "grey", True)
        for k in range(int((w - 1.0 * f) / (0.2 * f))):  # the radiator's grille
            y = 0.55 * f + k * 0.2 * f
            _box(dark, m, (x0 + 0.02 * f, y, 0.8 * f), (x0 + 0.12 * f, y + 0.08 * f, 4.2 * f))
        _rod(grey, m, (re + 2.0 * f, w / 2, 3.9 * f), (re + 2.0 * f, w / 2, 6.5 * f), 0.22 * f, 10)  # the exhaust
        _rod(grey, m, (re + 0.2 * f, w / 2, 2.6 * f), (re + 0.35 * f, w / 2, 2.6 * f), 0.5 * f, 12)  # the fan's hub housing
