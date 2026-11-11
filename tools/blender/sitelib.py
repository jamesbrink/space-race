"""Building blocks for a launch site: the pieces every pad, blockhouse and tower is made of.

A site's own package (missions/<nation>/<programme>/sites/<site>/) holds that site's dimensions
and layout and nothing else; what it builds them from is here, so the next site starts with
walls, windows, doors, stairs, ladders, paving, fences, light poles and trusses already made.

Units. A site is modelled in its sources' units (feet at the Cape, millimetres at Baikonur). It
says so once, `sitelib.use(FT)`, and from then on every length passed to these functions is in
those units; metres are made here, once. Sizes these helpers choose for themselves (a handrail's
height, a riser, a window bar) are held in feet, as the American hardware they were first drawn
from was, and turned into the site's units by `foot()`; `m()` does the same for a size in metres.

Nodes. `Parts` collects meshes by node and material. A node is a named empty with its origin
where the thing moves from: a hinge, an axle, a lift's floor. Three kinds of thing are marked for
the viewer's walker, each as a custom property that travels as a glTF extra:
  climb   a ladder (Parts.ladder): its own object, climbed inside its bounding box
  door    a door leaf (door(), Wall.door, building()): its own node, origin on the hinge line,
          built closed; `swing` is the turn in degrees about the vertical that opens it
  lift    a lift car: its own node, origin at its floor's middle, built at its lowest stop;
          `stops` are the heights of its stops above that, in metres
A walker is 0.26 m in radius and 1.89 m tall and steps up 0.3 m: stairs() keeps risers under
that; doorways want 0.7 by 1.95 m clear and a floor beyond.

Faces. Everything here is built from closed boxes and prisms whose faces either cross at an angle
or lie back to back, which srlib.check_clearance allows. Where a fitting sits on a wall it is sunk
into it, never laid on it.
"""

from __future__ import annotations

import contextlib
import math

from mathutils import Matrix, Vector

import srlib
from srlib import MeshBuilder, group

UNIT = 1.0  # metres in one of the site's units; set by use()
TAU_ = math.tau


def use(unit: float) -> None:
    """Say what unit the site is modelled in: metres per unit (srlib.FT, srlib.IN, 0.001 for mm)."""
    global UNIT
    UNIT = unit


@contextlib.contextmanager
def units(unit: float):
    """For the length of a `with` block, lengths are in another unit: a thing drawn in feet for a site in millimetres."""
    global UNIT
    before, UNIT = UNIT, unit
    try:
        yield
    finally:
        UNIT = before


# ------------------------------------------------------------------- what stood when

# A place is built once and dated. A site's builders say of each thing when it stood there; a
# state script (sites/<site>/model/<date>.py) or a flight's pad script names its date, and what
# did not stand then is left out. Dates are ISO text, as exact as is known: "1955", "1961-02",
# "1961-05-05". None is open-ended: not known to have begun, or to have ended.
AS_OF: str | None = None
STANDING: list[tuple] = []


def as_of(date: str | None) -> None:
    """Name the date the place is being built for. None builds everything."""
    global AS_OF
    AS_OF = date
    STANDING.clear()


def stood(thing: str, *, since: str | None = None, until: str | None = None, confidence: str, source: str) -> bool:
    """Whether `thing` stood on the date being built, and a record that it was asked: when it
    stood (`since`, `until`), how sure that is ("documented", "derived" or "estimated", as for any
    number in this repo) and what says so. Use it round whatever was not always there:

        if stood("White room", since="1961-02", confidence="documented", source="TM X-53107 7.5.1.2"):
            ...

    A date given to the month or the year covers all of it: something there "until 1961-06" is
    there on 1961-06-27 and gone on 1961-07-01."""
    if confidence not in ("documented", "derived", "estimated"):
        raise ValueError(f"stood: {thing}: confidence is {confidence!r}")
    there = AS_OF is None or ((since is None or since <= AS_OF) and (until is None or AS_OF[: len(until)] <= until))
    STANDING.append((thing, since, until, confidence, source, there))
    return there


def standing() -> str:
    """What was asked of stood() in this build, as lines for the build's report."""
    rows = [
        f"  {'built' if there else 'left out':8}  {thing}: {since or '?'} to {until or '?'} ({confidence}; {source})"
        for thing, since, until, confidence, source, there in STANDING
    ]
    return "\n".join([f"as of {AS_OF or 'any date'}:", *rows])


def foot() -> float:
    """One foot, in the site's units."""
    return 0.3048 / UNIT


def m(metres: float) -> float:
    """A length in metres, in the site's units."""
    return metres / UNIT


def ear_clip(pts) -> list[tuple[int, int, int]]:
    """Triangles over a simple polygon given anticlockwise: a deck with notches cut in its edge."""
    idx = list(range(len(pts)))
    tris = []

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    def inside(p, a, b, c):
        return cross(a, b, p) >= -1e-9 and cross(b, c, p) >= -1e-9 and cross(c, a, p) >= -1e-9

    while len(idx) > 3:
        for k in range(len(idx)):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            a, b, c = pts[i0], pts[i1], pts[i2]
            if cross(a, b, c) <= 1e-9:
                continue
            if any(inside(pts[j], a, b, c) for j in idx if j not in (i0, i1, i2) and pts[j] not in (a, b, c)):
                continue
            tris.append((i0, i1, i2))
            idx.pop(k)
            break
        else:
            raise ValueError("ear_clip: no ear; is the polygon simple and anticlockwise?")
    tris.append(tuple(idx))
    return tris


def P(x: float, y: float, z: float) -> Vector:
    return Vector((x, y, z)) * UNIT


def fine() -> bool:
    """Whether to build what only a close look shows: bolts, ribs, tread."""
    return srlib.DETAIL >= 0.5


# ------------------------------------------------------------------------ the pieces


class Parts:
    """Meshes grouped by node and material. A node is an empty whose origin is where it moves
    from (a hinge, an axle, the point it slides with); nodes carry translations only, so a
    child's location is its world origin less its parent's. Geometry is given in site units and
    moved into its node's frame when built, one mesh per node and material."""

    def __init__(self, M: dict) -> None:
        self.M = M
        self.nodes: dict[str, tuple] = {}
        self.meshes: dict[tuple[str, str], tuple[MeshBuilder, bool]] = {}
        self.ladders: list[tuple] = []
        self.props: dict[tuple[str, str], dict] = {}

    def node(self, name: str, parent: str | None = None, origin=(0.0, 0.0, 0.0), **props):
        """A named node. `props` travel to the viewer as the node's extras (userData): a door
        says `door`, a lift `lift` and its `stops`."""
        o = Vector(origin)
        obj = group(name, self.nodes[parent][0] if parent else None, **props)
        obj.location = (o - (self.nodes[parent][1] if parent else Vector())) * UNIT
        self.nodes[name] = (obj, o)
        return obj

    def __call__(self, node: str, mat: str, smooth: bool = False) -> MeshBuilder:
        key = (node, mat)
        if key not in self.meshes:
            self.meshes[key] = (MeshBuilder(), smooth)
        return self.meshes[key][0]

    def shift(self, node: str, d) -> None:
        """Move everything drawn so far for `node` by d (site units): a part built closed and shown open."""
        dx, dy, dz = (v * UNIT for v in d)
        for (n, _), (mb, _) in self.meshes.items():
            if n == node:
                mb.verts = [(x + dx, y + dy, z + dz) for x, y, z in mb.verts]

    def ladder(self, node: str, key: str, foot, top, *, face, mat: str = "white", width: float | None = None) -> None:
        """A ladder a walker can climb, hung on `node`: one run from `foot` to `top` (site
        units; the floor it stands on and the floor it reaches), the climber looking along
        `face`. It becomes its own object `<node>_Ladder<Key>`, marked `climb` (srlib.ladder)."""
        self.ladders.append((node, key, Vector(foot), Vector(top), tuple(face), mat, width))

    def mark(self, node: str, mat: str, **props) -> None:
        """Custom properties for the mesh that `node` and `mat` make: they travel to the viewer as
        the mesh's extras (a searchlight's lens says its `candela` and `spread`)."""
        self.props.setdefault((node, mat), {}).update(props)

    def build(self) -> None:
        for node, key, foot, top, face, mat, width in self.ladders:
            obj, origin = self.nodes[node]
            label = "".join(w.capitalize() for w in key.split("_"))
            srlib.ladder(
                f"{node}_Ladder{label}",
                foot * UNIT,
                top * UNIT,
                self.M[mat],
                obj,
                face=face,
                origin=origin * UNIT,
                width=0.45 if width is None else width * UNIT,
            )
        for (node, mat), (mb, smooth) in self.meshes.items():
            if not mb.faces:
                continue
            obj, origin = self.nodes[node]
            off = origin * UNIT
            mb.verts = [(x - off.x, y - off.y, z - off.z) for x, y, z in mb.verts]
            # a key "material/what" lets one node carry two meshes of the same material
            label = "".join(w.capitalize() for w in mat.replace("/", "_").split("_"))
            built = mb.build(f"{node}_{label}", self.M[mat.split("/")[0]], obj, smooth=smooth, sharp_angle=30 if smooth else None)
            for key, value in self.props.get((node, mat), {}).items():
                built[key] = value


# --------------------------------------------------------------------------- helpers


def box(mb: MeshBuilder, lo, hi) -> None:
    """Axis-aligned box from corner to corner, site units."""
    lo, hi = Vector(lo), Vector(hi)
    mb.box(tuple(abs(v) * UNIT for v in hi - lo), Matrix.Translation((lo + hi) / 2 * UNIT))


def beam(mb: MeshBuilder, a, b, width: float) -> None:
    """A square steel member between two points, site units."""
    mb.tube(P(*a), P(*b), width / math.sqrt(2) * UNIT, 4, caps=True)


def axes(origin, x_axis, z_axis) -> Matrix:
    """A frame at `origin` (site units) with local X and Z along the given directions; Y completes it."""
    x, z = Vector(x_axis).normalized(), Vector(z_axis).normalized()
    m = Matrix((x, z.cross(x), z)).transposed().to_4x4()
    m.translation = Vector(origin) * UNIT
    return m


def axes_local(origin, x_axis, y_axis, unit: float | None = None) -> Matrix:
    """A frame inside another: at `origin` (site units) with its X and Y along the given
    directions and Z their cross product. For composing after a piece's own frame: a panel's face
    on a console, a dial on a panel."""
    x, y = Vector(x_axis).normalized(), Vector(y_axis).normalized()
    m = Matrix((x, y, x.cross(y))).transposed().to_4x4()
    m.translation = Vector(origin) * (UNIT if unit is None else unit)
    return m


def profile(points) -> list:
    """A lathe profile given in site units."""
    return [(r * UNIT, z * UNIT) for r, z in points]


def obox(mb: MeshBuilder, centre, x_axis, z_axis, size) -> None:
    """A box of `size` (site units, along its own X, Y, Z) turned to the given axes."""
    mb.box(tuple(v * UNIT for v in size), axes(centre, x_axis, z_axis))


def plate(mb: MeshBuilder, pts, thickness: float) -> None:
    """A flat plate: a convex polygon (site units, any plane), given thickness about that plane."""
    pts = [Vector(p) for p in pts]
    n = Vector((0, 0, 0))
    for a, b in zip(pts, pts[1:] + pts[:1]):
        n += a.cross(b)
    h = n.normalized() * thickness / 2
    k = len(pts)
    top, bot = [tuple((p + h) * UNIT) for p in pts], [tuple((p - h) * UNIT) for p in pts]
    mb.add(top, [tuple(range(k))])
    mb.add(bot, [tuple(reversed(range(k)))])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def hull(mb: MeshBuilder, loops, caps=(True, True)) -> None:
    """A skin over a row of loops (site units), each with the same number of points and running
    anticlockwise seen from the far end. The ends are closed flat."""
    k = len(loops[0])
    verts = [tuple(Vector(p) * UNIT) for loop in loops for p in loop]
    faces = []
    for s in range(len(loops) - 1):
        for i in range(k):
            j = (i + 1) % k
            faces.append((s * k + i, s * k + j, (s + 1) * k + j, (s + 1) * k + i))
    mb.add(verts, faces)
    if caps[0]:
        mb.add(verts[:k], [tuple(reversed(range(k)))])
    if caps[1]:
        mb.add(verts[-k:], [tuple(range(k))])


def arch(x: float, w: float, zb: float, zt: float, r: float, n: int = 4) -> list:
    """A loop for hull(): flat sides and bottom, the two top corners rounded to radius r; at station x."""
    pts = [(x, w, zb)]
    for cy, a0 in ((w - r, 0.0), (-w + r, math.pi / 2)):
        pts += [(x, cy + r * math.cos(a0 + math.pi / 2 * k / n), zt - r + r * math.sin(a0 + math.pi / 2 * k / n)) for k in range(n + 1)]
    return [*pts, (x, -w, zb)]


def lattice(mb: MeshBuilder, corner, levels, col: float, brace: float, faces=(0, 1, 2, 3)) -> None:
    """A four-legged truss tower. corner(i, z) gives leg i's position at height z."""
    for z0, z1 in zip(levels, levels[1:]):
        for i in range(4):  # a leg is drawn bay by bay, so it follows a tower that changes slope
            beam(mb, corner(i, z0), corner(i, z1), col)
        for i in faces:
            j = (i + 1) % 4
            beam(mb, corner(i, z1), corner(j, z1), brace)
            beam(mb, corner(i, z0), corner(j, z1), brace * 0.8)
            beam(mb, corner(j, z0), corner(i, z1), brace * 0.8)


def truss(mb: MeshBuilder, corner, stations, chord: float, brace: float) -> None:
    """A four-chord box truss with a frame at each station and one diagonal a bay on each face,
    alternating: the zigzag of the mobile tower's mast and jib. corner(i, s) places chord i."""
    for s0, s1 in zip(stations, stations[1:]):
        for i in range(4):
            beam(mb, corner(i, s0), corner(i, s1), chord)
    for s in stations:
        for i in range(4):
            beam(mb, corner(i, s), corner((i + 1) % 4, s), brace)
    for n, (s0, s1) in enumerate(zip(stations, stations[1:])):
        for i in range(4):
            a, b = (i, (i + 1) % 4) if n % 2 == 0 else ((i + 1) % 4, i)
            beam(mb, corner(a, s0), corner(b, s1), brace * 0.85)


def handrail(mb: MeshBuilder, pts, height: float | None = None, post: float | None = None, rail: float | None = None) -> None:
    """Posts and two rails along a polyline of deck-level points: 3 ft 6 in high unless told."""
    f = foot()
    height, post, rail = (3.5 * f if height is None else height), (0.16 * f if post is None else post), (0.13 * f if rail is None else rail)
    for seg, (a, b) in enumerate(zip(pts, pts[1:])):
        a, b = Vector(a), Vector(b)
        n = max(1, round((b - a).length / (5.0 * f)))
        for k in range(1 if seg else 0, n + 1):  # a corner post belongs to the run before it
            p = a + (b - a) * k / n
            beam(mb, p, p + Vector((0, 0, height)), post)
        for h in (height, height * 0.5):
            beam(mb, a + Vector((0, 0, h)), b + Vector((0, 0, h)), rail)


def prism(mb: MeshBuilder, outline, z0: float, z1: float) -> None:
    """A vertical prism over a convex outline (site units, anticlockwise from above)."""
    k = len(outline)
    top = [tuple(P(x, y, z1)) for x, y in outline]
    bot = [tuple(P(x, y, z0)) for x, y in outline]
    mb.add(top, [tuple(range(k))])
    mb.add(bot, [tuple(reversed(range(k)))])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def lamp_head(poles: MeshBuilder, lamps: MeshBuilder, centre, aim, size: float | None = None) -> None:
    """A floodlight: a reflector bowl and its lens, pointed along `aim`; `size` is its radius."""
    size = 0.85 * foot() if size is None else size
    m = Matrix.Translation(Vector(centre) * UNIT) @ Vector((0, 0, 1)).rotation_difference(Vector(aim).normalized()).to_matrix().to_4x4()
    poles.lathe([(0.3 * size * UNIT, -0.8 * size * UNIT), (size * UNIT, 0.0)], 14, matrix=m)
    lamps.lathe([(0.96 * size * UNIT, -0.035 * size * UNIT), (0.0, -0.035 * size * UNIT)], 14, matrix=m, flip=True)


# ------------------------------------------------------- buildings, paving and what is placed


def offset_poly(pts, d: float) -> list:
    """An outline (anticlockwise) moved outward by d at every side, mitred; negative d moves it in."""
    n = len(pts)
    out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        la, lb = math.hypot(p1[0] - p0[0], p1[1] - p0[1]), math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        n1 = ((p1[1] - p0[1]) / la, -(p1[0] - p0[0]) / la)
        n2 = ((p2[1] - p1[1]) / lb, -(p2[0] - p1[0]) / lb)
        k = d / (1.0 + n1[0] * n2[0] + n1[1] * n2[1])
        out.append((p1[0] + (n1[0] + n2[0]) * k, p1[1] + (n1[1] + n2[1]) * k))
    return out


def slab(mb: MeshBuilder, outline, z0: float, z1: float, spread: float = 0.0, bottom: bool = False) -> None:
    """A slab over any simple outline (site units, anticlockwise): paving, a floor, a roof. With `spread`
    its edges are battered, the foot that far outside the top: fill graded down to the ground, which
    is also a ramp on to it. The underside is left off unless asked for: it is in the ground."""
    k = len(outline)
    tris = ear_clip(list(outline))
    foot = offset_poly(outline, spread) if spread else outline
    top = [tuple(P(x, y, z1)) for x, y in outline]
    bot = [tuple(P(x, y, z0)) for x, y in foot]
    mb.add(top, tris)
    if bottom:
        mb.add(bot, [t[::-1] for t in tris])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


class Wall:
    """One side of a building's ring of walls, from outer[i] to outer[i + 1] (site units, anticlockwise),
    mitred to its neighbours at each end. Distances `s` run along its outer face; `depth` is into
    the wall from that face (negative: standing off it outside)."""

    def __init__(self, outer, inner, i: int) -> None:
        j = (i + 1) % len(outer)
        self.a, self.b = Vector(outer[i]), Vector(outer[j])
        self.ia, self.ib = Vector(inner[i]), Vector(inner[j])
        self.length = (self.b - self.a).length
        self.u = (self.b - self.a) / self.length
        self.n = Vector((-self.u.y, self.u.x))  # into the building
        self.thick = (self.ia - self.a).dot(self.n)

    def p(self, s: float, depth: float, z: float) -> tuple:
        q = self.a + self.u * s + self.n * depth
        return (q.x, q.y, z)

    def _plan(self, s: float):
        o = self.a + self.u * s
        if s <= 1e-6:
            return self.a, self.ia
        if s >= self.length - 1e-6:
            return self.b, self.ib
        return o, o + self.n * self.thick

    def build(self, mb: MeshBuilder, z0: float, z1: float, openings=()) -> None:
        """The wall, built round its openings: each (s0, s1, sill, head), in order along it."""

        def piece(s0, s1, za, zb):
            if s1 - s0 < 1e-6 or zb - za < 1e-6:
                return
            (o0, i0), (o1, i1) = self._plan(s0), self._plan(s1)
            prism(mb, [tuple(o0), tuple(o1), tuple(i1), tuple(i0)], za, zb)

        at = 0.0
        for s0, s1, sill, head in openings:
            piece(at, s0, z0, z1)
            piece(s0, s1, z0, sill)
            piece(s0, s1, head, z1)
            at = s1
        piece(at, self.length, z0, z1)

    def box(self, mb: MeshBuilder, s0: float, s1: float, d0: float, d1: float, za: float, zb: float) -> None:
        """A box on the wall: along it from s0 to s1, from depth d0 to d1, between two heights."""
        c = self.a + self.u * ((s0 + s1) / 2) + self.n * ((d0 + d1) / 2)
        obox(mb, (c.x, c.y, (za + zb) / 2), (self.u.x, self.u.y, 0), (0, 0, 1), (s1 - s0, d1 - d0, zb - za))


def ring(outer, thick: float) -> list:
    """The walls of a building whose outline is `outer` (site units, anticlockwise), each `thick` through."""
    inner = offset_poly(outer, -thick)
    return [Wall(outer, inner, i) for i in range(len(outer))]


def window(
    parts: Parts,
    node: str,
    w: Wall,
    s0: float,
    s1: float,
    sill: float,
    head: float,
    *,
    mullions=(),
    bar: float | None = None,
    glass_at: float | None = None,
) -> None:
    """Glass in an opening of a wall, in a steel frame that overlaps the opening's edges. The
    wall must have been built round the opening (Wall.build). `mullions` are distances along the
    wall for uprights, or ("h", height) for a transom. Meshes: `glass` and `frame` of `node`."""
    f = foot()
    bar = 0.16 * f if bar is None else bar
    glass, frame = parts(node, "glass"), parts(node, "frame")
    d = w.thick / 2 if glass_at is None else glass_at
    e = 0.04 * f
    w.box(glass, s0 + 0.01 * f, s1 - 0.01 * f, d - 0.03 * f, d + 0.03 * f, sill + 0.01 * f, head - 0.01 * f)
    d0, d1 = d - 0.12 * f, d + 0.12 * f
    w.box(frame, s0 - e, s0 + bar, d0, d1, sill - e, head + e)
    w.box(frame, s1 - bar, s1 + e, d0, d1, sill - e, head + e)
    w.box(frame, s0 + bar, s1 - bar, d0, d1, sill - e, sill + bar)
    w.box(frame, s0 + bar, s1 - bar, d0, d1, head - bar, head + e)
    for m_ in mullions:
        if isinstance(m_, tuple):  # ("h", height): a transom
            w.box(frame, s0 + bar, s1 - bar, d0 + e / 2, d1 - e / 2, m_[1] - bar / 2, m_[1] + bar / 2)
        else:
            w.box(frame, m_ - bar / 2, m_ + bar / 2, d0 + e / 2, d1 - e / 2, sill + bar, head - bar)


def placed(mb: MeshBuilder, built: MeshBuilder, at, heading: float = 0.0) -> None:
    """Add what was built in a thing's own frame (its +X forward, already in metres)
    at a place on the site, turned `heading` degrees anticlockwise from the site's +X."""
    m = Matrix.Translation(Vector(at) * UNIT) @ Matrix.Rotation(math.radians(heading), 4, "Z")
    mb.add(built.verts, built.faces, built.uvs, m)


def stairs(
    mb: MeshBuilder, foot_at, top_at, width: float, *, rise: float | None = None, tread_t: float | None = None, stringer: float | None = None
) -> int:
    """A straight flight of open steel stairs from `foot_at` to `top_at` (site units; the points
    are the walking line's ends, on the lower floor and on the upper): treads between two
    stringers. `rise` is the most a riser may be (7.4 in unless told; never more than the 0.28 m
    a walker in the viewer can step up). Returns the number of risers."""
    f = foot()
    rise = min(0.62 * f if rise is None else rise, m(0.28))
    tread_t, stringer = (0.12 * f if tread_t is None else tread_t), (0.75 * f if stringer is None else stringer)
    a, b = Vector(foot_at), Vector(top_at)
    run = Vector((b.x - a.x, b.y - a.y, 0.0))
    along = run.normalized()
    side = Vector((-along.y, along.x, 0.0))
    n = max(2, math.ceil((b.z - a.z) / rise - 1e-6))
    for k in range(1, n):  # the nth riser lands on the upper floor
        c = a + run * ((k - 0.5) / (n - 1)) + Vector((0, 0, (b.z - a.z) * k / n - tread_t / 2))
        obox(
            mb, tuple(c), tuple(along), (0, 0, 1), (run.length / (n - 1) + 0.2 * f, width, tread_t)
        )  # each tread laps the one below: no gap to fall through
    for s in (-1, 1):
        lo = a + side * (s * (width / 2 + 0.06 * f)) + Vector((0, 0, 0.1 * f))
        hi = b + side * (s * (width / 2 + 0.06 * f)) + Vector((0, 0, -0.25 * f))
        d = (hi - lo).normalized()
        obox(mb, tuple((lo + hi) / 2), tuple(d), tuple(side), ((hi - lo).length + 0.6 * f, stringer, 0.1 * f))
    return n


def stair_rails(mb: MeshBuilder, foot_at, top_at, width: float, height: float | None = None) -> None:
    """Handrails either side of a flight built by stairs()."""
    f = foot()
    height = 3.0 * f if height is None else height
    a, b = Vector(foot_at), Vector(top_at)
    side = Vector((-(b.y - a.y), b.x - a.x, 0.0)).normalized()
    for s in (-1, 1):
        off = side * (s * (width / 2 + 0.06 * f))
        n = max(1, round((b - a).length / (4.5 * f)))
        for k in range(n + 1):
            q = a + (b - a) * k / n + off
            beam(mb, tuple(q), tuple(q + Vector((0, 0, height))), 0.13 * f)
        for h in (height, height * 0.5):
            beam(mb, tuple(a + off + Vector((0, 0, h))), tuple(b + off + Vector((0, 0, h))), 0.11 * f)


def timber_pole(
    parts: Parts, node: str, x: float, y: float, height: float, *, ground: float, lamps: int = 0, aim=None, arm: float | None = None
) -> None:
    """A creosoted timber pole standing in ground at height `ground`, tapering, with a crossarm
    on two braces. With `lamps`, that many floodlights stand on the arm, aimed along `aim`;
    without, it carries insulators for a line. Meshes: `timber`, `grey/polefittings`, `lamp`."""
    f = foot()
    arm = 6.0 * f if arm is None else arm
    wood, metal = parts(node, "timber", True), parts(node, "grey/polefittings", True)
    z0 = ground - 2.0 * f
    wood.lathe(profile([(0.0, z0), (0.55 * f, z0), (0.36 * f, height), (0.0, height)]), 10, matrix=Matrix.Translation(P(x, y, 0)))
    a = Vector(aim if aim is not None else (1, 0, 0))
    a.z = 0
    a.normalize()
    side = Vector((-a.y, a.x, 0))
    c = Vector((x, y, height - 1.6 * f)) + a * (0.45 * f)
    obox(wood, tuple(c), tuple(side), (0, 0, 1), (arm, 0.3 * f, 0.38 * f))
    for s in (-1, 1):
        beam(metal, tuple(c + side * (s * arm * 0.36)), (x + a.x * 0.42 * f, y + a.y * 0.42 * f, height - 4.2 * f), 0.1 * f)
    if lamps:
        glow = parts(node, "lamp", True)
        offs = [0.0] if lamps == 1 else [arm * 0.42 * (2 * k / (lamps - 1) - 1) for k in range(lamps)]
        for o in offs:
            q = c + side * o + Vector((0, 0, 0.19 * f))
            beam(metal, tuple(q), tuple(q + Vector((0, 0, 0.7 * f))), 0.12 * f)
            lamp_head(metal, glow, q + Vector((0, 0, 1.25 * f)), a + Vector((0, 0, -0.45)), 0.75 * f)
        # the conduit down the pole to a switch box
        metal.tube(
            P(x - a.x * 0.5 * f, y - a.y * 0.5 * f, ground + 2.5 * f), P(x - a.x * 0.42 * f, y - a.y * 0.42 * f, height - 2.0 * f), 0.05 * f * UNIT, 6
        )
        obox(metal, (x - a.x * 0.62 * f, y - a.y * 0.62 * f, ground + 6.0 * f), tuple(a), (0, 0, 1), (0.5 * f, 1.0 * f, 1.4 * f))
    elif fine():
        for o in (-arm * 0.42, -arm * 0.16, arm * 0.16, arm * 0.42):
            q = c + side * o + Vector((0, 0, 0.19 * f))
            metal.lathe(
                profile([(0.0, 0.0), (0.06 * f, 0.0), (0.06 * f, 0.25 * f), (0.16 * f, 0.3 * f), (0.16 * f, 0.5 * f), (0.0, 0.55 * f)]),
                8,
                matrix=Matrix.Translation(q * UNIT),
            )


# ------------------------------------------------------------ doors, paving, fences, small buildings


def door(
    parts: Parts,
    name: str,
    parent: str,
    hinge,
    along,
    width: float,
    height: float,
    *,
    swing: float,
    thick: float | None = None,
    mat: str = "blast",
    fittings: str = "knob",
    sign: str | None = None,
) -> None:
    """A door leaf as its own node, built closed, with what a door carries: three hinges, a
    kickplate, and a knob (`fittings="knob"`), a lever handle and dogs for a plate door
    (`"lever"`), or nothing (`"none"`); `sign` is lettered on a plate at eye height on the face
    it opens toward. `hinge` is the foot of the hinge line (site units), `along` the horizontal
    direction the closed leaf runs from it. The node's origin is on the hinge, so the viewer opens
    it by turning the node `swing` degrees about the vertical (anticlockwise seen from above is
    positive); both are recorded on the node (`door`, `swing`). The fittings are the leaf's own
    meshes and turn with it; they are built at full detail only.
    Materials: `mat`, and `chrome`, `galv`, `sign`, `black`."""
    f = foot()
    thick = 0.14 * f if thick is None else thick
    h = Vector(hinge)
    u = Vector((along[0], along[1], 0.0)).normalized()
    n = Vector((-u.y, u.x, 0.0)) * (1.0 if swing > 0 else -1.0)  # the side it opens toward
    parts.node(name, parent, tuple(h), door=1, swing=float(swing))
    gap = 0.03 * f
    # The kickplate is the leaf's foot, not a sheet laid on it, and a sign stands off on studs: seen
    # from across a site, a plate a few millimetres proud of the face behind it would flicker.
    kick = 0.9 * f if fittings != "none" else gap
    mid = h + u * (width / 2)
    obox(parts(name, mat), tuple(mid + Vector((0, 0, (kick + height - gap) / 2))), tuple(u), (0, 0, 1), (width - 2 * gap, thick, height - gap - kick))
    if fittings != "none":
        obox(
            parts(name, "galv/kick"),
            tuple(mid + Vector((0, 0, (gap + kick) / 2))),
            tuple(u),
            (0, 0, 1),
            (width - 2 * gap, thick + 0.02 * f, kick - gap),
        )
    if srlib.DETAIL < 1.0 or fittings == "none":
        return
    bright, plate_ = parts(name, "chrome", True), parts(name, "galv/kick")
    up = Vector((0, 0, 1))
    for z in (0.7 * f, height / 2, height - 0.7 * f):  # hinges: a knuckle on the side it opens toward
        k = h + n * (thick / 2 + 0.03 * f) + u * (0.04 * f) + up * z
        bright.tube((k - up * (0.18 * f)) * UNIT, (k + up * (0.18 * f)) * UNIT, 0.035 * f * UNIT, 8)
    grip = h + u * (width - 0.28 * f) + up * (3.0 * f)
    for side in (-1, 1):
        o = grip + n * (side * thick / 2)
        d = n * side
        if fittings == "lever":  # a bar handle standing off a plate door, and a dog above and below it
            bright.tube((o + up * (0.5 * f) + d * (0.22 * f)) * UNIT, (o - up * (0.5 * f) + d * (0.22 * f)) * UNIT, 0.04 * f * UNIT, 8)
            for dz in (-0.45, 0.45):
                bright.tube((o + up * (dz * f)) * UNIT, (o + up * (dz * f) + d * (0.22 * f)) * UNIT, 0.03 * f * UNIT, 6)
            for dz in (-2.0, 2.6):
                obox(plate_, tuple(o + up * (dz * f) + d * (0.04 * f) - u * (0.15 * f)), tuple(u), (0, 0, 1), (0.7 * f, 0.08 * f, 0.18 * f))
        else:
            bright.tube((o + d * (0.006 * f)) * UNIT, (o + d * (0.16 * f)) * UNIT, 0.035 * f * UNIT, 8, caps=False)
            bright.lathe(
                profile([(0.0, 0.0), (0.09 * f, 0.02 * f), (0.11 * f, 0.08 * f), (0.07 * f, 0.14 * f), (0.0, 0.15 * f)]),
                10,
                matrix=axes(tuple(o + d * (0.14 * f)), tuple(u), tuple(d)),
            )
            bright.lathe(
                profile([(0.0, 0.0), (0.13 * f, 0.0), (0.13 * f, 0.015 * f), (0.0, 0.015 * f)]), 10, matrix=axes(tuple(o), tuple(u), tuple(d))
            )
    if sign:
        o = h + u * (width / 2) + up * (5.2 * f) + n * (thick / 2)
        right = up.cross(n)  # reads left to right seen from the side it opens toward
        wide = min(width - 0.6 * f, 0.16 * f * len(sign) + 0.3 * f)
        obox(parts(name, "sign/plate"), tuple(o + n * (0.18 * f)), tuple(right), (0, 0, 1), (wide, 0.03 * f, 0.36 * f))
        for dx in (-wide / 2 + 0.1 * f, wide / 2 - 0.1 * f):
            bright.tube((o + right * dx) * UNIT, (o + right * dx + n * (0.17 * f)) * UNIT, 0.02 * f * UNIT, 6, caps=False)
        lettering(
            parts(name, "black/lettering"), sign, 0.2 * f, tuple(o + n * (0.205 * f) - up * (0.07 * f)), tuple(right), (0, 0, 1), srlib.load_font()
        )


def wall_door(
    parts: Parts,
    name: str,
    parent: str,
    w: Wall,
    s0: float,
    s1: float,
    sill: float,
    head: float,
    *,
    hinge: str = "s0",
    opens: str = "out",
    depth: float | None = None,
    frame: bool = True,
    **kw,
) -> None:
    """A door filling an opening of a wall (built round it by Wall.build): the leaf (door(), with
    its fittings) hinged at the opening's `s0` or `s1` edge, opening outward or inward, set
    `depth` into the wall, and a steel frame round the opening on both faces of the wall, which
    is the parent's (material `frame`)."""
    f = foot()
    d = w.thick / 2 if depth is None else depth
    at_s0 = hinge == "s0"
    h = w.p(s0 if at_s0 else s1, d, sill)
    along = (w.u.x, w.u.y) if at_s0 else (-w.u.x, -w.u.y)
    turn = (-1.0 if opens == "out" else 1.0) * (1.0 if at_s0 else -1.0)
    door(parts, name, parent, h, along, s1 - s0, head - sill, swing=turn * 100.0, **kw)
    if frame:
        steel = parts(parent, "frame/doors")
        b, proud = 0.22 * f, 0.04 * f
        for d0, d1 in ((-proud, 0.06 * f), (w.thick - 0.06 * f, w.thick + proud)):
            lap = 0.02 * f  # over the opening's edge, so no face of the frame lies in a face of the wall
            w.box(steel, s0 - b, s0 + lap, d0, d1, sill, head + b)
            w.box(steel, s1 - lap, s1 + b, d0, d1, sill, head + b)
            w.box(steel, s0 + lap, s1 - lap, d0, d1, head - lap, head + b)


def solid(mb: MeshBuilder, loops) -> None:
    """A closed skin over a row of loops (site units), facing outward whichever way the loops
    wind: a curved rail, a bank of ballast, anything swept along a path."""
    k = len(loops[0])
    verts = [Vector(p) * UNIT for loop in loops for p in loop]
    faces = []
    for s in range(len(loops) - 1):
        for i in range(k):
            j = (i + 1) % k
            faces.append((s * k + i, s * k + j, (s + 1) * k + j, (s + 1) * k + i))
    faces.append(tuple(reversed(range(k))))
    faces.append(tuple(range(len(verts) - k, len(verts))))
    vol = 0.0
    for f_ in faces:
        for a in range(1, len(f_) - 1):
            vol += verts[f_[0]].dot(verts[f_[a]].cross(verts[f_[a + 1]]))
    if vol < 0:
        faces = [f_[::-1] for f_ in faces]
    mb.add([tuple(v) for v in verts], faces)


def box_girder(
    mb: MeshBuilder,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    *,
    flange: float | None = None,
    inset: float | None = None,
    pitch: float | None = None,
    splices=(),
) -> None:
    """A built-up steel box girder running along Y: two flange plates oversailing a box of web
    plates, vertical stiffeners on both webs every `pitch`, and at each y in `splices` a bolted
    splice plate on both webs. For a gantry's base, a crane's rail beam, a bridge. Stiffeners are
    left out below detail 0.5 and bolts below 1."""
    f = foot()
    flange, inset, pitch = (0.25 * f if flange is None else flange), (0.3 * f if inset is None else inset), (4.0 * f if pitch is None else pitch)
    box(mb, (x0, y0, z1 - flange), (x1, y1, z1))
    box(mb, (x0, y0, z0), (x1, y1, z0 + flange))
    box(mb, (x0 + inset, y0 + 0.02 * f, z0 + flange - 0.02 * f), (x1 - inset, y1 - 0.02 * f, z1 - flange + 0.02 * f))
    if not fine():
        return
    n = max(1, round((y1 - y0) / pitch))
    t = 0.04 * f
    for k in range(n + 1):
        y = y0 + 0.1 * f + (y1 - y0 - 0.2 * f) * k / n
        if any(abs(y - sy) < 1.5 * f for sy in splices):
            continue
        for xa, xb in ((x0 + 0.03 * f, x0 + inset + 0.02 * f), (x1 - inset - 0.02 * f, x1 - 0.03 * f)):
            box(mb, (xa, y - t, z0 + flange - 0.01 * f), (xb, y + t, z1 - flange + 0.01 * f))
    for sy in splices:
        za, zb = z0 + flange + 0.3 * f, z1 - flange - 0.3 * f
        for face, xw in ((-1, x0 + inset), (1, x1 - inset)):
            xa, xb = sorted((xw + face * 0.05 * f, xw - face * 0.02 * f))
            box(mb, (xa, sy - 1.2 * f, za), (xb, sy + 1.2 * f, zb))
            if srlib.DETAIL >= 1.0:
                rows = max(2, round((zb - za) / (0.6 * f)))
                for i in range(rows):
                    for dy in (-0.9, -0.4, 0.4, 0.9):
                        mb.disc(
                            P(xw + face * 0.05 * f, sy + dy * f, za + (zb - za) * (i + 0.5) / rows), (face, 0, 0), 0.05 * f * UNIT, 0.03 * f * UNIT, 6
                        )


def axle_cap(mb: MeshBuilder, centre, normal, radius: float | None = None) -> None:
    """The cover on the end of an axle box: a dished cap, a hub and three bolts, facing `normal`. Full detail only."""
    if srlib.DETAIL < 1.0:
        return
    f = foot()
    r = 0.32 * f if radius is None else radius
    n = Vector(normal).normalized()
    m = srlib.frame(Vector(centre) * UNIT, n)
    mb.lathe(profile([(r, 0.0), (r, 0.05 * f), (r * 0.8, 0.09 * f), (r * 0.4, 0.09 * f), (r * 0.36, 0.16 * f), (0.0, 0.16 * f)]), 14, matrix=m)
    for k in range(3):
        a = TAU_ * k / 3
        mb.disc(
            m @ Vector((r * 0.62 * math.cos(a) * UNIT, r * 0.62 * math.sin(a) * UNIT, 0.09 * f * UNIT)),
            tuple(n),
            0.04 * f * UNIT,
            0.035 * f * UNIT,
            6,
        )


def rail_clamp(mb: MeshBuilder, x: float, y: float, rail_top: float) -> None:
    """A rail clamp under the end of a rail truck: two jaws either side of the rail's head and the yoke over them. At detail 0.5 and up."""
    if not fine():
        return
    f = foot()
    for xa, xb in ((x - 0.48 * f, x - 0.17 * f), (x + 0.17 * f, x + 0.48 * f)):
        box(mb, (xa, y - 0.28 * f, rail_top + 0.03 * f), (xb, y + 0.28 * f, rail_top + 0.75 * f))
    box(mb, (x - 0.5 * f, y - 0.3 * f, rail_top + 0.7 * f), (x + 0.5 * f, y + 0.3 * f, rail_top + 1.0 * f))


def searchlight(
    parts: Parts,
    node: str,
    parent: str | None,
    at,
    aim_at,
    *,
    ground: float = 0.0,
    diameter: float | None = None,
    candela: float = 8.0e8,
    spread: float = 1.25,
) -> None:
    """A mobile searchlight of the 60-inch Army kind: a drum on a yoke on a four-wheeled trailer,
    its glass toward `aim_at` (site units, like `at`, which is where the yoke's pivot stands on the
    ground). Its own node `node`, so it can be towed away. The lens is the mesh of material `search`
    (which a site names `lamp-flood-search`), and carries `candela` and `spread` (the beam's whole
    angle, degrees) for the viewer: a 60-inch carbon arc gave about 800 million candela in a beam
    a degree and a quarter wide. Materials: `search`, `car-olive` (its paint), `tyre`, `chassis`."""
    f = foot()
    d = 5.0 * f if diameter is None else diameter
    o = Vector((at[0], at[1], ground))
    parts.node(node, parent, tuple(o), label="Searchlight")
    paint, dark, tyre = parts(node, "car-olive", True), parts(node, "chassis", True), parts(node, "tyre", True)
    aim = (Vector(aim_at) - (o + Vector((0, 0, 5.5 * f)))).normalized()
    flat = Vector((aim.x, aim.y, 0.0)).normalized()
    side = Vector((-flat.y, flat.x, 0.0))
    up = Vector((0, 0, 1))
    obox(dark, tuple(o + up * (1.9 * f)), tuple(flat), (0, 0, 1), (8.0 * f, 4.8 * f, 0.5 * f))  # the trailer's bed
    for a in (-2.8, 2.8):
        for s in (-1, 1):
            c = o + flat * (a * f) + side * (s * 2.9 * f) + up * (1.3 * f)
            tyre.tube((c - side * (0.35 * f)) * UNIT, (c + side * (0.35 * f)) * UNIT, 1.3 * f * UNIT, 14)
    beam(dark, tuple(o + flat * (4.0 * f) + up * (1.9 * f)), tuple(o + flat * (7.5 * f) + up * (1.6 * f)), 0.3 * f)  # the drawbar
    pivot = o + up * (5.5 * f)
    for s in (-1, 1):  # the yoke
        beam(paint, tuple(o + side * (s * (d / 2 + 0.35 * f)) + up * (2.1 * f)), tuple(pivot + side * (s * (d / 2 + 0.35 * f))), 0.4 * f)
    obox(paint, tuple(o + up * (2.3 * f)), tuple(side), (0, 0, 1), (d + 1.1 * f, 1.0 * f, 0.4 * f))
    m = axes(tuple(pivot), tuple(side), tuple(aim))
    r, depth = d / 2, 2.6 * f
    paint.lathe(
        profile([(0.0, -depth * 0.55), (r * 0.7, -depth * 0.5), (r, -depth * 0.3), (r, depth * 0.45), (r * 0.96, depth * 0.45)]), 20, matrix=m
    )
    parts(node, "search", True).lathe(profile([(r * 0.96, depth * 0.4), (0.0, depth * 0.4)]), 20, matrix=m, flip=True)
    parts.mark(node, "search", candela=float(candela), spread=float(spread))


def lettering(mb: MeshBuilder, body: str, size: float, origin, right, up, font=None) -> None:
    """Painted letters on a flat face: `origin` is the middle of the line's foot (site units),
    `right` and `up` the directions it reads along, seen from in front. The letters are flat:
    `origin` must stand off the face behind them (a centimetre close to; more if seen from far)."""
    verts, faces = srlib.text_mesh(body, size, font, cuts=0)
    xs = [v[0] for v in verts]
    mid = (max(xs) + min(xs)) / 2
    o, r, u = Vector(origin), Vector(right), Vector(up)
    mb.add([tuple((o + r * (vx - mid) + u * vy) * UNIT) for vx, vy, _ in verts], faces)


def panels(
    slabs: MeshBuilder,
    joints: MeshBuilder,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    pitch: float,
    *,
    top: float = 0.0,
    bottom: float,
    gap: float | None = None,
    inset: float = 0.0,
    slots=(),
) -> None:
    """Concrete laid in square panels with open joints: a hardstand, a road. Each panel is its
    own box `gap` short of its neighbours; under the gaps lies one dark slab (`joints`), its
    sides `inset` inside the panels' outer faces (keep that well over a centimetre for paving
    seen from far off: two faces 18 mm apart cannot be told apart at 150 m). `slots` are bands
    (x from, x to) left open the length of the paving, down to the dark slab: the channel a rail
    is let into, with its flangeway."""
    f = foot()
    gap = 0.12 * f if gap is None else gap
    nx, ny = max(1, round((x1 - x0) / pitch)), max(1, round((y1 - y0) / pitch))
    for i in range(nx):
        for j in range(ny):
            xa, ya = x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny
            xb, yb = x0 + (x1 - x0) * (i + 1) / nx, y0 + (y1 - y0) * (j + 1) / ny
            for xl, xr in free(xa + gap / 2, xb - gap / 2, slots):
                box(slabs, (xl, ya + gap / 2, bottom), (xr, yb - gap / 2, top))
    box(joints, (x0 + inset, y0 + inset, bottom - 0.1 * f), (x1 - inset, y1 - inset, top - gap))


def free(lo: float, hi: float, slots) -> list[tuple[float, float]]:
    """What is left of the interval (lo, hi) once the `slots` (from, to) are taken out of it."""
    out, at = [], lo
    for s0, s1 in sorted(slots):
        if s1 <= at or s0 >= hi:
            continue
        if s0 > at:
            out.append((at, s0))
        at = max(at, s1)
    if at < hi:
        out.append((at, hi))
    return out


def fence(parts: Parts, node: str, pts, *, ground: float, height: float | None = None, closed: bool = True) -> None:
    """Chain link on pipe posts along a line of points (site units): posts every 6 ft 8 in, a top
    rail, the mesh one face seen from both sides. Meshes: `mesh` and `galv` of `node`."""
    f = foot()
    height = 7.0 * f if height is None else height
    mesh, galv = parts(node, "mesh"), parts(node, "galv", True)
    pairs = list(zip(pts, pts[1:] + pts[:1])) if closed else list(zip(pts, pts[1:]))
    for (ax, ay), (bx, by) in pairs:
        n = max(1, round(math.hypot(bx - ax, by - ay) / (6.7 * f)))
        for k in range(n if closed else n + 1):
            x, y = ax + (bx - ax) * k / n, ay + (by - ay) * k / n
            galv.tube(P(x, y, ground - 1.0 * f), P(x, y, ground + height + 0.2 * f), 0.09 * f * UNIT, 6)
        beam(galv, (ax, ay, ground + height), (bx, by, ground + height), 0.1 * f)
        mesh.add(
            [
                tuple(P(ax, ay, ground + 0.2 * f)),
                tuple(P(bx, by, ground + 0.2 * f)),
                tuple(P(bx, by, ground + height - 0.1 * f)),
                tuple(P(ax, ay, ground + height - 0.1 * f)),
            ],
            [(0, 1, 2, 3)],
        )


def building(
    parts: Parts,
    node: str,
    key: str,
    rect,
    eave: float,
    openings: dict,
    *,
    floor: float,
    footing: float,
    mat: str = "block",
    wall: float | None = None,
) -> list:
    """Four walls on a rectangle (x0, y0, x1, y1) from `footing` up to `eave`, with a floor.
    `openings` maps a wall's number (0: the -Y side, 1: +X, 2: +Y, 3: -X; each runs
    anticlockwise seen from above) to its openings, each (s0, s1, sill, head, kind):
      "window"  glass in a steel frame with one mullion
      "door"    a leaf on its own node `<node>_<Key>Door<n>`, hinged at s0, opening outward
      "louvre"  fixed blades in a frame
    Returns the walls (Wall), for hanging more on them."""
    f = foot()
    wall = 0.55 * f if wall is None else wall
    x0, y0, x1, y1 = rect
    outline = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    walls = ring(outline, wall)
    skin, frame = parts(node, f"{mat}/{key}"), parts(node, "frame")
    doors = 0
    for i, w in enumerate(walls):
        holes = sorted(openings.get(i, []))
        w.build(skin, footing, eave, [(a, b, lo, hi) for a, b, lo, hi, _ in holes])
        for a, b, lo, hi, kind in holes:
            if kind == "window":
                window(parts, node, w, a, b, lo, hi, mullions=[(a + b) / 2])
            elif kind == "door":
                doors += 1
                wall_door(parts, f"{node}_{key.capitalize()}Door{doors}", node, w, a, b, lo, hi, depth=wall * 0.4)
            else:
                w.box(frame, a - 0.1 * f, a + 0.08 * f, 0.05 * f, wall - 0.05 * f, lo - 0.1 * f, hi + 0.1 * f)
                w.box(frame, b - 0.08 * f, b + 0.1 * f, 0.05 * f, wall - 0.05 * f, lo - 0.1 * f, hi + 0.1 * f)
                n = max(2, round((hi - lo) / (0.4 * f)))
                for k in range(n):
                    z = lo + (hi - lo) * k / n
                    plate(
                        frame,
                        [
                            w.p(a, 0.05 * f, z + (hi - lo) / n),
                            w.p(b, 0.05 * f, z + (hi - lo) / n),
                            w.p(b, wall - 0.05 * f, z),
                            w.p(a, wall - 0.05 * f, z),
                        ],
                        0.04 * f,
                    )
    inner = offset_poly(outline, -wall)
    parts(node, "concrete/floor").add([tuple(P(x, y, floor)) for x, y in inner], ear_clip(inner))
    return walls


def flat_roof(parts: Parts, node: str, key: str, rect, eave: float, *, over: float | None = None, mat: str = "block") -> None:
    """A flat concrete roof oversailing a rectangle, tar and gravel on top. Meshes: `<mat>/<key>roof`, `tar`."""
    f = foot()
    over = 0.7 * f if over is None else over
    x0, y0, x1, y1 = rect
    outline = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    slab(parts(node, f"{mat}/{key}roof"), offset_poly(outline, over), eave, eave + 0.6 * f, bottom=True)
    slab(parts(node, "tar"), offset_poly(outline, over - 0.3 * f), eave + 0.55 * f, eave + 0.85 * f)


def roof_vent(mb: MeshBuilder, x: float, y: float, z: float, size: float = 1.0) -> None:
    """A roof ventilator: a stub and a mushroom cap, about a foot and a half tall at size 1."""
    f = foot() * size
    prof = [(0.0, -0.2), (0.45, -0.2), (0.45, 0.9), (0.95, 0.95), (0.95, 1.2), (0.6, 1.55), (0.0, 1.62)]
    mb.lathe(profile([(r * f, h * f) for r, h in prof]), 12, matrix=Matrix.Translation(P(x, y, z)))


# ------------------------------------------------------------------------ track

# A flat-bottomed rail, half its section: inches out from the middle and up from the foot. The
# proportions are a 100 lb ASCE section's (5 3/4 in high, 5 3/4 in across the foot, the head 2 3/4 in
# wide, the web 9/16 in), set down from memory: estimated. Far off it is twelve points, a shape.
RAIL_HEIGHT, RAIL_HEAD, RAIL_FOOT, RAIL_WEB = 5.75, 2.75, 5.75, 0.5625
_RAIL = [(2.875, 0.0), (2.875, 0.3), (2.3, 0.45), (0.85, 0.95), (0.45, 1.25), (0.28, 1.7), (0.28, 3.85), (0.45, 4.2), (0.85, 4.42),
         (1.3, 4.52), (1.375, 4.75), (1.375, 5.5), (1.28, 5.69), (1.05, 5.75)]  # fmt: skip
_RAIL_FAR = [(2.875, 0.0), (2.875, 0.4), (0.3, 0.9), (0.3, 4.3), (1.375, 4.5), (1.375, 5.75)]
FLANGEWAY = 1.875  # inches, beside a running rail's head where a wheel's flange passes (estimated: the usual)
PLATE = (13.0, 7.75, 0.625)  # a tie plate, inches: across the rail, along it, thick (estimated: a typical plate)


def inch() -> float:
    return foot() / 12.0


def rail_section(plane: float = 0.0, side: int = 1, foot_cut: bool = False) -> list[tuple[float, float]]:
    """A rail's section as a closed loop (site units): x across it, z up from the foot. `plane`,
    0 to 1, takes that much of the head off on the `side` side (+1 or -1), and `foot_cut` the foot
    on that side back to the web: a switch point, planed to lie against its stock rail."""
    half = _RAIL if fine() else _RAIL_FAR
    i = inch()
    out = []
    for x, z in half + [(-x, z) for x, z in reversed(half)]:
        if x * side > RAIL_WEB / 2 + 1e-6:
            if z > 4.15:
                x = side * (RAIL_WEB / 2 + (abs(x) - RAIL_WEB / 2) * (1.0 - plane))
            elif foot_cut:
                x = side * RAIL_WEB / 2
        out.append((x * i, z * i))
    return out


def rail(mb: MeshBuilder, path, *, plane=None, side: int = 1, foot_cut: bool = False) -> None:
    """A rail swept along `path`: points (x, y, top), site units, `top` the height of its head
    there. `plane` (one value per point) and `side` (+1: the left of the way the path runs) plane
    its head as rail_section() does; with `foot_cut` its foot is cut on that side all along."""
    pts = [Vector(p) for p in path]
    h = RAIL_HEIGHT * inch()
    loops = []
    for k, p in enumerate(pts):
        a, b = pts[max(0, k - 1)], pts[min(len(pts) - 1, k + 1)]
        t = Vector((b.x - a.x, b.y - a.y, 0.0)).normalized()
        s = Vector((-t.y, t.x, 0.0))
        sec = rail_section(plane[k] if plane else 0.0, side, foot_cut)
        loops.append([tuple(Vector((p.x, p.y, p.z - h)) + s * x + Vector((0.0, 0.0, z))) for x, z in sec])
    solid(mb, loops)


def tie_plate(plates: MeshBuilder, spikes: MeshBuilder | None, at, along, top: float, *, seat: float | None = None, wide: float = 0.0) -> None:
    """The plate a rail sits on at a sleeper, its top under the rail's foot at height `top` - the
    rail's head height; with two spikes diagonally opposite, as on straight track, their heads over
    the foot. `at` is the rail's middle (x, y). The plate is sunk half an inch into the sleeper, or,
    given `seat` (the sleeper's top), stands on it. `wide` widens it toward the rail's left by that
    much (site units), for two rails on one plate; then it carries no spikes."""
    i = inch()
    t = Vector((along[0], along[1], 0.0)).normalized()
    s = Vector((-t.y, t.x, 0.0))
    base = top - RAIL_HEIGHT * i
    bottom = base - (PLATE[2] + 0.5) * i if seat is None else seat
    c = Vector((at[0], at[1], (base + bottom) / 2)) + s * (wide / 2)
    obox(plates, tuple(c), tuple(s), (0, 0, 1), (PLATE[0] * i + abs(wide), PLATE[1] * i, base - bottom))
    if spikes is None or wide:
        return
    for d, e in ((1, 1.9), (-1, -1.9)):  # its head clear of the foot's edge, its shank sunk in the plate
        q = Vector((at[0], at[1], base + 0.3 * i)) + s * (d * 3.3 * i) + t * (e * i)
        obox(spikes, tuple(q), tuple(s), (0, 0, 1), (0.75 * i, 0.7 * i, 1.2 * i))


def ties_and_plates(plates: MeshBuilder, spikes: MeshBuilder | None, ties, rails) -> None:
    """A plate wherever a rail crosses a sleeper: `ties` are (centre (x, y), its axis, half its
    length, its top), `rails` polylines of (x, y, top). The plate stands on the sleeper, turned to
    the rail. Two rails crossing one sleeper within a plate's width of each other share one plate,
    unspiked; a rail crossing two sleepers that cross each other gets a plate on the first only."""
    w = PLATE[0] * inch()
    placed: dict[int, list[Vector]] = {}
    for (cx, cy), ax, half, seat in ties:
        a = Vector((ax[0], ax[1])).normalized()
        n = Vector((-a.y, a.x))
        c = Vector((cx, cy))
        hits = []
        for r, path in enumerate(rails):
            for p, q in zip(path, path[1:]):
                d0, d1 = (Vector(p[:2]) - c).dot(n), (Vector(q[:2]) - c).dot(n)
                if d0 == d1 or (d0 > 0) == (d1 > 0) and d0 != 0:
                    continue
                k = d0 / (d0 - d1)
                x = Vector(p[:2]).lerp(Vector(q[:2]), k)
                if abs((x - c).dot(a)) <= half - 0.6 * foot() and all((x - o).length > 1.1 * foot() for o in placed.get(r, [])):
                    hits.append(((x - c).dot(a), x, Vector(q[:2]) - Vector(p[:2]), p[2] + (q[2] - p[2]) * k, r))
                break
        hits.sort(key=lambda h: h[0])
        k = 0
        while k < len(hits):
            u, x, d, top, r = hits[k]
            placed.setdefault(r, []).append(x)
            if k + 1 < len(hits) and hits[k + 1][0] - u < w:  # the next rail is on this plate too
                left = Vector((-d.y, d.x)).normalized()
                span = (hits[k + 1][1] - x).dot(left)
                placed.setdefault(hits[k + 1][4], []).append(hits[k + 1][1])
                tie_plate(plates, None, x, d, max(top, hits[k + 1][3]), seat=seat, wide=span)
                k += 2
            else:
                tie_plate(plates, spikes, x, d, top, seat=seat)
                k += 1


def clip(poly, a: float, b: float, c: float) -> list:
    """The part of a polygon ((x, y) points) where a*x + b*y <= c (Sutherland-Hodgman)."""
    out = []
    for k, p in enumerate(poly):
        q = poly[(k + 1) % len(poly)]
        fp, fq = a * p[0] + b * p[1] - c, a * q[0] + b * q[1] - c
        if fp <= 0:
            out.append(p)
        if (fp < 0 < fq) or (fq < 0 < fp):
            t = fp / (fp - fq)
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def band(o, d, lo: float, hi: float, a: float, b: float) -> list:
    """A rectangle along direction `d` from point `o` (2D): across it from `lo` to `hi` (to the
    left of `d` positive), along it from `a` to `b`. Anticlockwise."""
    d = Vector(d).normalized()
    n = Vector((-d.y, d.x))
    o = Vector(o)
    return [tuple(o + d * u + n * v) for u, v in ((a, lo), (b, lo), (b, hi), (a, hi))]


def minus_strip(poly, o, d, lo: float, hi: float) -> list:
    """A convex polygon less a strip (across `d` from `lo` to `hi` about `o`): up to two pieces."""
    d = Vector(d).normalized()
    n = (-d.y, d.x)
    c = n[0] * o[0] + n[1] * o[1]
    pieces = [clip(poly, n[0], n[1], c + lo), clip(poly, -n[0], -n[1], -(c + hi))]
    return [p for p in pieces if len(p) >= 3 and abs(_area(p)) > 1e-9]


def _area(p) -> float:
    return 0.5 * sum(p[k][0] * p[(k + 1) % len(p)][1] - p[(k + 1) % len(p)][0] * p[k][1] for k in range(len(p)))


def frog(body: MeshBuilder, tops: MeshBuilder, o, da, ga: int, db, gb: int, top: float, reach, *, wings: bool = True) -> None:
    """A cast frog where two rails cross at `o` (x, y): rail A along `da`, rail B along `db`, the
    casting reaching `reach` = (a, b) along each from `o`. `ga`, `gb` say which side of each is its
    gauge side (+1: the left of its direction), where its wheels' flanges run. The running surface
    is both rails' heads less each one's flangeway; with `wings`, as a turnout's frog has, each
    rail's head is carried on past the point beside the other's flangeway as a wing rail. The body
    is the casting under it, its top a flangeway's depth (2 in) below the heads, at height `top`.
    The rails themselves stop at the casting's ends. Done by cutting the casting's outline along
    every edge and keeping the cells that are running surface, so no two tops overlap."""
    i = inch()
    h, fw = RAIL_HEAD * i / 2, FLANGEWAY * i
    o = Vector(o[:2])
    da, db = Vector(da[:2]).normalized(), Vector(db[:2]).normalized()
    na, nb = Vector((-da.y, da.x)) * ga, Vector((-db.y, db.x)) * gb  # each toward its gauge side
    wide = 3 * h + fw
    outline = _convex(band(o, da, -wide, wide, -reach[0], reach[0]) + band(o, db, -wide, wide, -reach[1], reach[1]))
    lines = [(n, o.dot(n) + off) for n in (na, nb) for off in (-h, h, h + fw, wide)]
    # where the gauge faces cross (the frog's theoretical point), and the way the point faces
    m = Matrix(((na.x, na.y), (nb.x, nb.y)))
    pt = m.inverted() @ Vector((o.dot(na) + h, o.dot(nb) + h)) if abs(m.determinant()) > 1e-9 else o
    w = -(na + nb).normalized()
    lines.append((w, pt.dot(w) + 0.05 * foot()))  # just past the point, so three edges never meet in one place
    cells = [outline]
    for n, c in lines:
        nxt = []
        for cell in cells:
            for piece in (clip(cell, n.x, n.y, c), clip(cell, -n.x, -n.y, -c)):
                if len(piece) >= 3 and abs(_area(piece)) > 1e-10:
                    nxt.append(piece)
        cells = nxt

    def running(cell) -> bool:
        c = Vector((sum(x for x, _ in cell) / len(cell), sum(y for _, y in cell) / len(cell)))
        sa, sb = (c - o).dot(na), (c - o).dot(nb)
        if abs(sa) <= h and not h < sb <= h + fw:
            return True
        if abs(sb) <= h and not h < sa <= h + fw:
            return True
        if wings and (c - pt).dot(w) > 0:
            return (h + fw < sb <= wide and sa <= h) or (h + fw < sa <= wide and sb <= h)
        return False

    zb = top - 2.0 * i
    for cell in cells:
        cell = [p for k, p in enumerate(cell) if (Vector(p) - Vector(cell[k - 1])).length > 1e-6]
        edge = max((Vector(p) - Vector(cell[k - 1])).length for k, p in enumerate(cell))
        if len(cell) >= 3 and 2 * abs(_area(cell)) / edge > 0.01 * foot() and running(cell):  # no slivers: their sides would fight
            prism(tops, _ccw(cell), zb - 0.5 * i, top)
    prism(body, outline, top - (RAIL_HEIGHT + PLATE[2] + 0.3) * i, zb)  # down into the sleepers


def _ccw(p) -> list:
    return list(p) if _area(p) > 0 else list(reversed(p))


def _convex(pts) -> list:
    """The convex hull of 2D points, anticlockwise (monotone chain)."""
    pts = sorted(set((round(x, 9), round(y, 9)) for x, y in pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def film_camera(parts: Parts, node: str, at, aim_at, *, ground: float = 0.0, height: float | None = None) -> None:
    """A 35 mm engineering film camera of the period on a wooden tripod, pointed at `aim_at` (site
    units): a body with its lens turret and lens, the twin round magazine on top, a drive motor on
    the right, a finder along the left, on a geared head with its pan bar; the tripod's three
    doubled legs, spiked feet and a spreader on the ground. Of the kind (a Mitchell or a
    Photo-Sonics was the usual), not any one camera. `at` is (x, y), where it stands. Materials:
    `plank` (the legs), `black` (the camera), `chassis` (the head, the spreader), `chrome` (lens rims)."""
    f = foot()
    h = 4.4 * f if height is None else height
    wood, cam, iron, bright = parts(node, "plank/tripod"), parts(node, "black/camera", True), parts(node, "chassis"), parts(node, "chrome", True)
    top = Vector((at[0], at[1], ground + h))
    for k in range(3):  # the legs: two rails each, from the head's crown to a spiked foot
        a = TAU_ * k / 3 + 0.3
        out = Vector((math.cos(a), math.sin(a), 0.0))
        side = Vector((-out.y, out.x, 0.0))
        footp = Vector((at[0], at[1], ground)) + out * (1.7 * f)
        crown, knee = top - Vector((0, 0, 0.15 * f)) + out * (0.22 * f), footp + Vector((0, 0, 0.25 * f))
        for s in (-1, 1):
            beam(wood, tuple(crown + side * (s * 0.07 * f)), tuple(knee + side * (s * 0.05 * f)), 0.08 * f)
        beam(iron, tuple(footp + Vector((0, 0, 0.3 * f))), tuple(footp - Vector((0, 0, 0.05 * f))), 0.07 * f)  # the spike
        beam(iron, (at[0], at[1], ground + 0.06 * f), tuple(footp + Vector((0, 0, 0.06 * f))), 0.06 * f)  # the spreader's arm
    box(iron, (at[0] - 0.3 * f, at[1] - 0.3 * f, ground + h - 0.2 * f), (at[0] + 0.3 * f, at[1] + 0.3 * f, ground + h))  # the crown
    fwd = Vector(aim_at) - top
    fwd.normalize()
    flat = Vector((fwd.x, fwd.y, 0.0)).normalized()
    right = flat.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(fwd).normalized()
    head = top + Vector((0, 0, 0.25 * f))
    obox(iron, tuple(head), tuple(flat), (0, 0, 1), (0.6 * f, 0.5 * f, 0.5 * f))  # the geared head
    grip = head - flat * (1.8 * f) + right * (0.35 * f) - Vector((0, 0, 0.5 * f))
    beam(iron, tuple(head - flat * (0.2 * f) + right * (0.15 * f)), tuple(grip), 0.06 * f)  # the pan bar
    c = head + up * (0.65 * f)
    obox(cam, tuple(c), tuple(fwd), tuple(up), (1.0 * f, 0.6 * f, 0.75 * f))  # the body
    for d in (-0.3, 0.3):  # the twin magazine: two drums side by side along the body, on top
        m = axes(tuple(c + fwd * (d * f) + up * (0.65 * f) - right * (0.18 * f)), tuple(fwd), tuple(right))
        drum = [(0.0, 0.0), (0.38, 0.0), (0.4, 0.03), (0.4, 0.33), (0.38, 0.36), (0.0, 0.36)]
        cam.lathe(profile([(a * f, b * f) for a, b in drum]), 20, matrix=m)
    box_at = c + fwd * (0.5 * f)
    m = axes(tuple(box_at), tuple(right), tuple(fwd))  # the turret plate and the lens on it, along the line of sight
    cam.lathe(profile([(0.0, 0.0), (0.3 * f, 0.0), (0.3 * f, 0.06 * f), (0.0, 0.06 * f)]), 18, matrix=m)
    lens = [(0.0, 0.06), (0.12, 0.06), (0.12, 0.45), (0.15, 0.47), (0.15, 0.6), (0.0, 0.6)]
    bright.lathe(profile([(a * f, b * f) for a, b in lens]), 16, matrix=m)
    side_m = axes(tuple(c + right * (0.3 * f) - up * (0.1 * f) - fwd * (0.25 * f)), tuple(fwd), tuple(right))
    cam.lathe(profile([(0.0, 0.0), (0.17 * f, 0.0), (0.17 * f, 0.55 * f), (0.0, 0.55 * f)]), 14, matrix=side_m)  # the motor
    finder = c - right * (0.36 * f) + up * (0.15 * f)
    cam.tube(tuple((finder - fwd * (0.6 * f)) * UNIT), tuple((finder + fwd * (0.45 * f)) * UNIT), 0.08 * f * UNIT, 10)
