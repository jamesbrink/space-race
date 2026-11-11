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
    the mark the viewer puts a light at: an empty `Light_<name>` under `node`, a little below the
    fitting, carrying `intensity` and `reach` (metres). One fitting in a room is named for the
    room; the others are given no name and are fittings only. The tubes' material is `lamp`."""
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
        parts.node(f"Light_{name}", node, tuple(c - Vector((0, 0, 1.0 * f))), intensity=float(intensity), reach=float(reach))


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
