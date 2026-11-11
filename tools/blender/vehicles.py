"""Road vehicles for the scenery of a site: cars, station wagons, carryalls and pickups, built
from a description (`Car`) rather than sculpted, so a site chooses and parks them and no more.

Dimensions are inches, as the makers published them. A vehicle is described in its own frame:
X forward from the rear axle, Y to the driver's left, Z up from the ground. It is built as one
node at the middle of its wheelbase, on the ground, facing its local +X in Blender; its four road
wheels are child nodes with their origins on their hubs and their axles along local Y, so the
viewer can roll them about Y and steer the front pair about the vertical:

    <name>                      the vehicle: body, glass, interior, trim, lamps
      <name>_SteerWheel_1, _2   front wheels, left and right
      <name>_Wheel_1, _2        rear wheels, left and right

How a body is made. The lower body is one skin lofted through cross-sections (`Car.section`):
a flat floor, a wheel well wherever a wheel stands, the side with its tuck-under, a rounded
shoulder, a fin if it has one, and the crowned bonnet or boot lid. Three curves along the length
give each section its size: `top` (the bonnet, the belt, the boot lid), `bottom` (the sill) and
`plan` (the half-width). The well is part of the skin, so the underside is closed and casts a
whole shadow, and the wheel arch is as clean as the sections are close. Over the cabin the skin is
left open and a greenhouse stands on the belt: pillars, a roof, panes of glass, and behind them a
tub with seats, a dashboard and a steering wheel. Separate wings (a Beetle's, a step-side
pickup's) are the same loft, one-sided, sunk into the body's side (`Pod`).

Levels of detail follow srlib.DETAIL. At 1.0 everything is built. Below 0.75 (`srlib.interior()`)
there is no interior and the panes are dark `window-void`; shut lines, handles, plates and wipers
go too. Below 0.5 the bright trim goes and every curve is thinned. The outline does not change.

Trim never lies flat on a panel: two parallel faces a few centimetres apart flicker when seen from
across a site. A strip is a ridge whose faces slope away from the panel, a lamp is a dome, a plate
and a grille are tilted, and everything is sunk through the skin behind.

The catalogue at the end is American road vehicles of 1955 to 1961 and the Volkswagen. A site's
own module picks from it, colours them and parks them:

    car = vehicles.ford_1957("seafoam", "white")
    car.build("Car_01", parent_node, (x, y, z), heading_degrees)
"""

from __future__ import annotations

import bisect
import math
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field

import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import IN, TAU, MeshBuilder, group, material

Keys = Sequence[tuple[float, float]]

# ---------------------------------------------------------------------- materials

# Body colours, by eye: no maker's chart was read. A site may add its own with `paint()`.
PAINTS = {
    "white": (0.80, 0.80, 0.77),
    "cream": (0.74, 0.70, 0.58),
    "black": (0.03, 0.03, 0.035),
    "seafoam": (0.33, 0.52, 0.45),
    "blue": (0.16, 0.30, 0.48),
    "navy": (0.05, 0.08, 0.17),
    "red": (0.50, 0.06, 0.05),
    "olive": (0.20, 0.22, 0.13),
    "turquoise": (0.18, 0.47, 0.50),
    "grey": (0.42, 0.44, 0.45),
    "tan": (0.55, 0.45, 0.32),
    "green": (0.10, 0.22, 0.15),
}
# key -> (material name, colour, metallic, roughness)
OTHERS = {
    "glass": ("glass", (0.6, 0.75, 0.8), 0.0, 0.03),  # the viewer makes anything named glass a clear pane
    "void": ("window-void", (0.02, 0.022, 0.025), 0.0, 0.6),
    "rubber": ("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
    "whitewall": ("rubber-whitewall", (0.78, 0.77, 0.72), 0.0, 0.8),
    "chrome": ("chrome", (0.75, 0.76, 0.78), 1.0, 0.18),
    "under": ("steel-chassis", (0.05, 0.05, 0.055), 0.3, 0.7),
    "line": ("panel-line", (0.015, 0.015, 0.015), 0.0, 0.8),
    "lamp": ("lamp-lens-clear", (0.85, 0.85, 0.8), 0.0, 0.15),
    "tail": ("lamp-tail", (0.45, 0.02, 0.02), 0.0, 0.3),
    "plate": ("licence-plate-blank", (0.78, 0.74, 0.5), 0.0, 0.6),
    "seat-grey": ("upholstery-grey", (0.3, 0.31, 0.32), 0.0, 0.85),
    "seat-tan": ("upholstery-tan", (0.5, 0.4, 0.27), 0.0, 0.85),
    "seat-red": ("upholstery-red", (0.36, 0.07, 0.06), 0.0, 0.8),
    "seat-green": ("upholstery-green", (0.2, 0.3, 0.26), 0.0, 0.85),
    "trim-dark": ("interior-dark", (0.09, 0.09, 0.085), 0.0, 0.9),
    "insignia": ("paint-insignia-blue", (0.03, 0.09, 0.35), 0.0, 0.5),
}


def paint(key: str, colour: Sequence[float]) -> None:
    """Add a body colour, or change one."""
    PAINTS[key] = tuple(colour)


def _mat(key: str) -> bpy.types.Material:
    """One of each in a file: a site's own material is used where the names agree."""
    if key in PAINTS:
        name, args = f"paint-car-{key}", (PAINTS[key], 0.3, 0.3)
    else:
        name, *args = OTHERS[key]
    return bpy.data.materials.get(name) or material(name, *args)


# ------------------------------------------------------------------------ helpers


def curve(keys: Keys) -> Callable[[float], float]:
    """A smooth line through (x, value) keys that never overshoots them (a monotone cubic); flat beyond the ends."""
    ks = sorted(keys)
    xs, ys = [k[0] for k in ks], [k[1] for k in ks]
    n = len(ks)
    if n == 1:
        return lambda x: ys[0]
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0], *(0.0 if d[i - 1] * d[i] <= 0 else 2 * d[i - 1] * d[i] / (d[i - 1] + d[i]) for i in range(1, n - 1)), d[-1]]

    def f(x: float) -> float:
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = bisect.bisect_right(xs, x) - 1
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        return (
            (2 * t**3 - 3 * t**2 + 1) * ys[i] + (t**3 - 2 * t**2 + t) * h * m[i] + (-2 * t**3 + 3 * t**2) * ys[i + 1] + (t**3 - t**2) * h * m[i + 1]
        )

    return f


def grain() -> float:
    """How coarse this level of detail may be: 1 at full detail, about 3 at the far one."""
    return 1 / max(0.33, min(1.0, srlib.DETAIL))


def trimmed() -> bool:
    """Whether bright trim is built."""
    return srlib.DETAIL >= 0.5


def poly(mb: MeshBuilder, pts: Sequence[Sequence[float]], facing: Sequence[float]) -> None:
    """A flat face through pts, wound to look along `facing`."""
    p = [Vector(q) for q in pts]
    n = sum(((p[i] - p[0]).cross(p[i + 1] - p[0]) for i in range(1, len(p) - 1)), Vector())
    if n.dot(Vector(facing)) < 0:
        p.reverse()
    mb.add([tuple(q) for q in p], [tuple(range(len(p)))])


def box(mb: MeshBuilder, lo: Sequence[float], hi: Sequence[float]) -> None:
    mb.box([abs(b - a) for a, b in zip(lo, hi)], Matrix.Translation([(a + b) / 2 for a, b in zip(lo, hi)]))


def hexa(mb: MeshBuilder, bottom: Sequence[Sequence[float]], top: Sequence[Sequence[float]], ends: bool = True) -> None:
    """A solid between two quads given in the same order: a seat back, or without its `ends` a
    post whose head and foot are buried in what it joins."""
    b, t = [Vector(p) for p in bottom], [Vector(p) for p in top]
    mid = sum(b + t, Vector()) / 8
    for quad in (*((b, t) if ends else ()), *([b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]] for i in range(4))):
        poly(mb, quad, sum(quad, Vector()) / 4 - mid)


def ridge(mb: MeshBuilder, pts: Sequence[Vector], normal: Sequence[float], half: float, proud: float, sink: float = 0.4) -> None:
    """A strip of trim along pts on a panel that faces `normal`: a ridge, its two faces sloping
    back into the panel, so that neither is parallel to it."""
    n = Vector(normal).normalized()
    rows = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        across = n.cross(t).normalized()
        rows.append((p - across * half - n * sink, p + n * proud, p + across * half - n * sink))
    for (a0, b0, c0), (a1, b1, c1) in zip(rows, rows[1:]):
        poly(mb, (a0, b0, b1, a1), n + (a0 - c0).normalized())
        poly(mb, (b0, c0, c1, b1), n + (c0 - a0).normalized())
    for (a, b, c), out in ((rows[0], pts[0] - pts[1]), (rows[-1], pts[-1] - pts[-2])):
        poly(mb, (a, b, c), out)


class Kit:
    """One node's meshes by material key, in inches. A key "material/what" lets a node carry
    two meshes of one material."""

    def __init__(self) -> None:
        self.mbs: dict[str, MeshBuilder] = {}

    def __call__(self, key: str) -> MeshBuilder:
        return self.mbs.setdefault(key, MeshBuilder())

    def build(self, name: str, parent: bpy.types.Object, shift: Sequence[float] = (0, 0, 0)) -> int:
        """Inches to metres, into `parent`'s frame. Returns the triangles built."""
        dx, dy, dz = shift
        tris = 0
        for key, mb in self.mbs.items():
            if not mb.faces:
                continue
            mb.verts = [((x + dx) * IN, (y + dy) * IN, (z + dz) * IN) for x, y, z in mb.verts]
            label = "".join(w.capitalize() for w in key.replace("/", "-").split("-"))
            flat = key.split("/")[0] in ("line", "plate", "void", "glass")
            mb.build(f"{name}_{label}", _mat(key.split("/")[0]), parent, smooth=not flat, sharp_angle=38)
            tris += sum(len(f) - 2 for f in mb.faces)
        return tris


def skin(kit: Kit, loops: Sequence[Sequence[Vector]], what: Callable[[int, int], str | None], *, closed: bool, flip: bool = False) -> None:
    """Quads between successive loops of points. `what(station, segment)` names the material of
    each, or None to leave it open. Each material gets only the points it uses."""
    m = len(loops[0])
    used: dict[str, tuple[dict[int, int], list, list]] = {}
    for s in range(len(loops) - 1):
        for j in range(m if closed else m - 1):
            key = what(s, j)
            if key is None:
                continue
            index, verts, faces = used.setdefault(key, ({}, [], []))
            face = []
            for i in (s * m + j, s * m + (j + 1) % m, (s + 1) * m + (j + 1) % m, (s + 1) * m + j):
                if i not in index:
                    index[i] = len(verts)
                    verts.append(tuple(round(c, 5) for c in loops[i // m][i % m]))
                if index[i] not in face and all(verts[index[i]] != verts[k] for k in face):
                    face.append(index[i])
            if len(face) >= 3:  # fewer where a wheel well has no depth
                faces.append(tuple(reversed(face)) if flip else tuple(face))
    for key, (_, verts, faces) in used.items():
        kit(key).add(verts, faces)


def cap(mb: MeshBuilder, loop: Sequence[Vector], facing: Sequence[float]) -> None:
    """Close a flat loop with one face. A section with a fin is not convex, so it is left to
    Blender to cut into triangles; a fan about its middle would fold over itself."""
    pts = [p for i, p in enumerate(loop) if (p - loop[i - 1]).length > 1e-4]
    poly(mb, pts, facing)


DOME = [(0.82, 3.3), (0.7, 4.2), (0.38, 4.8), (0.0, 5.05)]  # a lamp's lens: (share of its radius, inches along its axis)
BEZEL = [(1.12, 0.0), (1.12, 2.6), (0.98, 3.7), (0.82, 3.3)]  # the bright ring round it


def lamp(kit: Kit, kind: str, at: Sequence[float], aim: Sequence[float], r: float, wide: float = 1.0) -> None:
    """A round lamp looking along `aim`, its back 2.5 in inside the panel at `at`; `wide` stretches it sideways."""
    at, aim = Vector(at), Vector(aim).normalized()
    m = srlib.frame(at - aim * 2.5, aim) @ Matrix.Diagonal((wide, 1.0, 1.0, 1.0))
    if not trimmed():
        kit(kind).lathe([(r * 1.05, 0.0), (r * 1.05, 2.9), (0.0, 4.6)], 8, matrix=m)
        return
    kit(kind).lathe([(r * k, z) for k, z in DOME], 12, matrix=m)
    if trimmed():
        kit("chrome").lathe([(r * k, z) for k, z in BEZEL], 12, matrix=m)


# ------------------------------------------------------------------------ the car


@dataclass
class Car:
    """A vehicle, in inches. See the module's note for the frame; `nose` is how far the body
    reaches ahead of the front axle."""

    what: str  # the make, model and year it is meant to be, for the record
    wheelbase: float
    length: float
    width: float
    height: float
    nose: float
    track: float = 58.0
    tyre: tuple[float, float, float] = (13.4, 6.7, 7.0)  # outside radius, section width, rim radius
    # the lower body: keys along X (inches forward of the rear axle); `plan` is the half-width
    top: Keys = ()
    bottom: Keys = ()
    plan: Keys = ()
    sill: float = 8.5  # the floor's height, where `bottom` is not given
    shoulder: float = 4.0  # radius where the side turns into the bonnet
    crown: float = 1.6  # how much higher the bonnet's middle is than its edges
    tuck: float = 3.0  # how far the side draws in at the sill
    fin: Keys = ()  # extra height of the shoulder: tail fins
    arch: float = 16.5  # radius of the wheel openings; 0 for none
    arches: tuple[bool, bool] = (True, True)  # rear, front
    flat_tail: float | None = None  # X at which the body stops short, squarely: a pickup's cab
    # the greenhouse: X of the windscreen's foot and head, the back light's head and foot
    cabin: tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)
    tumble: float = 5.0  # how far the glass leans in from belt to roof
    bow: float = 5.0  # how far the windscreen's middle stands ahead of its ends
    pillars: Sequence[float] = ()  # X of the posts between the side panes
    post: float = 2.6  # a post's width
    sail: float = 0.0  # extra width of the rearmost post
    backlight: float = 1.0  # how much of the back's width is glass
    roof_reach: tuple[float, float] = (1.5, 1.5)  # the roof's overhang, front and back
    doors: Sequence[float] = ()  # X of the shut lines
    seats: Sequence[float] = ()  # X of each bench's front edge
    lhd: bool = True
    # what is hung on it
    pods: Sequence[Pod] = ()
    lamps: int = 1  # head lamps a side
    lamp_at: tuple[float, float, float] = (0.0, 0.0, 3.5)  # half-spacing, height, radius; 0 to place by the body
    tail_at: tuple[float, float, float, float] = (0.0, 0.0, 2.6, 1.0)  # half-spacing, height, radius, how wide for its height
    grille: tuple[float, float, float] = (0.0, 0.0, 0.0)  # half-width, bottom, top; none if no height
    spear: Keys = ()  # a bright strip down the side: (X, height) keys
    spear_paint: str = "chrome"
    bumper: tuple[float, float] = (0.0, 0.0)  # height of the front and rear bars' middles; 0 to hang them by the sill
    bumper_size: tuple[float, float] = (1.5, 2.5)
    bumper_w: tuple[float, float] = (0.0, 0.0)  # half-width of each; 0 for the body's
    cap_r: float = 5.0  # hub cap radius: 5 is a small cap on a painted wheel, 7 and over a full cover
    back: Callable[[Car, Kit], None] | None = None  # what is built behind a flat tail
    # colours
    paint: str = "white"
    roof: str | None = None
    wheel: str | None = None  # the wheels' paint; the body's if not given
    upholstery: str = "seat-grey"
    whitewall: float = 0.0  # width of the white band; 0 for a black tyre

    _top: Callable[[float], float] = field(init=False, repr=False, default=None)
    _bottom: Callable[[float], float] = field(init=False, repr=False, default=None)
    _plan: Callable[[float], float] = field(init=False, repr=False, default=None)
    _fin: Callable[[float], float] = field(init=False, repr=False, default=None)

    def __post_init__(self) -> None:
        self.x1 = self.wheelbase + self.nose
        self.x0 = self.x1 - self.length
        hw, sill, L = self.width / 2, self.sill, self.length
        if not self.plan:
            self.plan = [
                (self.x0, hw - 6),
                (self.x0 + 5, hw - 1.2),
                (self.x0 + 0.22 * L, hw),
                (self.x1 - 0.22 * L, hw),
                (self.x1 - 5, hw - 1.5),
                (self.x1, hw - 7),
            ]
        if not self.bottom:
            a = self.arch + 3
            self.bottom = [
                (self.x0, sill + 8),
                (self.x0 + 9, sill + 3),
                (-a, sill),
                (self.wheelbase + a, sill),
                (self.x1 - 8, sill + 3),
                (self.x1, sill + 7),
            ]
        self._top, self._bottom, self._plan = curve(self.top), curve(self.bottom), curve(self.plan)
        self._fin = curve(self.fin) if self.fin else (lambda x: 0.0)
        self.axles = (0.0, self.wheelbase)
        self.well = self.track / 2 - self.tyre[1] / 2 - 1.6  # the wheel well's inner wall
        self.tail = self.x0 if self.flat_tail is None else self.flat_tail

    # ---- the lower body

    def arch_z(self, x: float) -> float:
        """Height of the wheel opening's edge at x; 0 where there is none."""
        z = 0.0
        for k, xa in enumerate(self.axles):
            if self.arch > 0 and self.arches[k] and abs(x - xa) < self.arch:
                z = max(z, self.tyre[0] + math.sqrt(self.arch**2 - (x - xa) ** 2))
        return z

    def side(self, x: float, z: float) -> float:
        """The body side's Y at a height: widest half way up, drawn in toward the sill."""
        w, zb, zt = self._plan(x), self._bottom(x), self._top(x)
        zw = zb + 0.5 * (zt - zb)
        t = max(0.0, (zw - z) / max(zw - zb, 1e-3))
        return w - self.tuck * t * t

    def shape(self) -> tuple[int, int]:
        """Points up the side and round the shoulder, at this level of detail."""
        return (3, 4) if srlib.DETAIL >= 0.75 else (2, 3) if srlib.DETAIL >= 0.5 else (1, 2)

    def section(self, x: float) -> list[tuple[float, float]]:
        """Half of the body's cross-section at x, as (y, z) from the middle of the floor, out and
        up and back to the middle of the bonnet. The count is the same at every x."""
        ns, na = self.shape()
        w, zb, zt = self._plan(x), self._bottom(x), self._top(x)
        h = self._fin(x)
        r = min(self.shoulder, 0.45 * (zt - zb), 0.5 * w)
        zs = zt + h - r
        za = min(max(zb, self.arch_z(x)), zs - 0.8)
        yin = min(self.well, self.side(x, zb) - 1.0)
        pts = [(0.0, zb), (yin, zb), (yin, za), (self.side(x, za), za)]
        pts += [(self.side(x, za + (zs - za) * j / ns), za + (zs - za) * j / ns) for j in range(1, ns + 1)]
        pts += [(w - r + r * math.cos(math.pi / 2 * k / na), zs + r * math.sin(math.pi / 2 * k / na)) for k in range(1, na + 1)]
        flat = w - r

        def lid(y: float) -> float:
            return zt + self.crown * (1 - (y / flat) ** 2)

        y1 = flat - (5.0 if h > 0.2 else 0.3 * flat)
        return [*pts, (y1, lid(y1)), (0.5 * y1, lid(0.5 * y1)), (0.0, zt + self.crown)]

    def stations(self) -> list[float]:
        lo, hi = self.tail, self.x1
        n = max(2, round((hi - lo) / (4.6 * grain() ** 1.3)))
        xs = [lo + (hi - lo) * i / n for i in range(n + 1)]
        xs += [k[0] for keys in (self.top, self.bottom, self.plan, self.fin) for k in keys]
        xs += [self.cabin[0], self.cabin[3]]
        keep = [lo, hi, *(x for x in (self.cabin[0], self.cabin[3]) if lo < x < hi)]
        m = max(3, round(11 / grain()))
        for k, xa in enumerate(self.axles):
            if self.arch > 0 and self.arches[k]:
                arc = [xa - self.arch * math.cos(math.pi * i / m) for i in range(m + 1)]
                # a station just outside each end makes the well's end wall upright; from afar it may slope
                keep += [arc[0] - 0.35, *arc, arc[-1] + 0.35] if trimmed() else arc
        for x in sorted(xs):
            if lo < x < hi and all(abs(x - q) > 1.4 * grain() ** 2 for q in keep):
                keep.append(x)
        return sorted(x for x in keep if lo - 1e-6 <= x <= hi + 1e-6)

    def build_body(self, kit: Kit) -> None:
        xs = self.stations()
        ns, na = self.shape()
        lid = 3 + ns + na  # the first of the three segments across the bonnet
        loops = []
        for x in xs:
            half = self.section(x)
            loops.append([Vector((x, y, z)) for y, z in half] + [Vector((x, -y, z)) for y, z in half[-2:0:-1]])
        m = len(loops[0])
        n = m // 2 + 1

        def what(s: int, j: int) -> str | None:
            i = j if j < n - 1 else m - j - 1
            if i < 3:
                return "under"
            if i >= lid and self.cabin[3] < (xs[s] + xs[s + 1]) / 2 < self.cabin[0]:
                return None  # the cabin: the greenhouse stands here
            return self.paint

        skin(kit, loops, what, closed=True)
        cap(kit(self.paint), loops[-1], (1, 0, 0))
        cap(kit(self.paint), loops[0], (-1, 0, 0))

    # ---- the greenhouse

    def belt(self, x: float) -> float:
        return self._top(x)

    def glass_y(self, x: float) -> float:
        """Half-width of the glass at the belt."""
        return self._plan(x) - min(self.shoulder, 0.5 * self._plan(x)) - 0.6

    def roof_z(self, x: float) -> float:
        """The roof's top along its length: a shallow arc, highest a little ahead of its middle."""
        a, b = self.cabin[2] - self.roof_reach[1], self.cabin[1] + self.roof_reach[0]
        return self.height - 2.2 * (2 * (x - a) / (b - a) - 1.1) ** 2

    def build_greenhouse(self, kit: Kit) -> None:
        foot, head, rear, back = self.cabin
        key = self.roof or self.paint
        top = kit(key)
        glass = kit("glass" if srlib.interior() else "void")
        thick = 1.6
        a, b = rear - self.roof_reach[1], head + self.roof_reach[0]
        nx, ny = max(3, round(8 / grain())), max(2, round(4 / grain()))
        wr = min(self.glass_y(foot), self.glass_y(back)) - self.tumble
        # the roof: a crowned slab with a rolled edge
        loops = []
        for i in range(nx + 1):
            x = a + (b - a) * i / nx
            z = self.roof_z(x)
            edge = wr + 1.2 - 2.5 * (2 * i / nx - 1) ** 4  # drawn in at its front and back corners
            half = [(edge * math.sin(math.pi / 2 * k / ny), z - 1.6 * (1 - math.cos(math.pi / 2 * k / ny))) for k in range(ny + 1)]
            half += [(edge - 0.5, z - 1.6 - thick), (0.0, z - 0.4 - thick)]
            loops.append([Vector((x, y, zz)) for y, zz in half] + [Vector((x, -y, zz)) for y, zz in half[-2:0:-1]])
        skin(kit, loops, lambda s, j: key, closed=True, flip=True)
        cap(top, loops[0], (-1, 0, 0))
        cap(top, loops[-1], (1, 0, 0))

        def under(x: float) -> float:
            return self.roof_z(x) - thick - 0.9

        def rail(x_belt: float, x_roof: float, s: int, inset: float = 0.0) -> tuple[Vector, Vector]:
            """A point on the belt and the one above it under the roof, on side s."""
            return (
                Vector((x_belt, s * (self.glass_y(x_belt) - inset), self.belt(x_belt) - 0.3)),
                Vector((x_roof, s * (wr - inset), under(x_roof))),
            )

        # posts: the windscreen's, those between the side panes, the back light's
        posts = sorted([(foot, head, self.post), *((x, x, self.post) for x in self.pillars), (back, rear, self.post + self.sail)], reverse=True)
        up = Vector((0, 0, 1.2))
        for s in (1, -1):
            edges = []
            for k, (xb, xr, wide) in enumerate(posts):
                # the first runs back from the windscreen's line, the last forward from the back light's
                d0, d1 = (-wide, 0.0) if k == 0 else (0.0, wide) if k == len(posts) - 1 else (-wide / 2, wide / 2)
                lo0, hi0 = rail(xb + d0, xr + d0, s, -0.5)
                lo1, hi1 = rail(xb + d1, xr + d1, s, -0.5)
                in0, up0 = rail(xb + d0, xr + d0, s, 1.8)
                in1, up1 = rail(xb + d1, xr + d1, s, 1.8)
                hexa(top, (lo0, lo1, in1, in0), (hi0 + up, hi1 + up, up1 + up, up0 + up), ends=False)
                edges.append((rail(xb + d0, xr + d0, s), rail(xb + d1, xr + d1, s)))
            for (rear_edge, _), (_, front_edge) in zip(edges, edges[1:]):  # the side panes, between each post and the next
                poly(glass, (rear_edge[0], rear_edge[1], front_edge[1], front_edge[0]), (0, s, 0.2))
        # windscreen and back light, bowed in plan
        n = max(2, round(6 / grain()))
        for xb, xr, bow, out in ((foot, head, self.bow, 1), (back, rear, -0.7 * self.bow, -1)):
            rows = []
            for i in range(n + 1):
                t = 2 * i / n - 1
                k = bow * (1 - t * t)
                # its ends stop just inside the posts, a little behind their faces
                rows.append(
                    (
                        Vector((xb + k - 0.3 * out, t * (self.glass_y(xb) - 1.5), self.belt(xb + k) - 0.3)),
                        Vector((xr + 0.6 * k - 0.3 * out, t * (wr - 1.5), under(xr))),
                    )
                )
            for i, ((lo0, hi0), (lo1, hi1)) in enumerate(zip(rows, rows[1:])):
                solid = out < 0 and abs(2 * (i + 0.5) / n - 1) > self.backlight  # a small back light: the rest is roof
                poly(top if solid else glass, (lo0, hi0, hi1, lo1), (out, 0, 0.3))
            if srlib.DETAIL >= 0.75 and out == 1:  # wipers, parked
                for y in (0.45, -0.1):
                    p = Vector((xb + bow * (1 - y * y) + 0.5, y * self.glass_y(xb), self.belt(xb) + 0.4))
                    kit("under").tube(p, p + Vector((-1.6, -0.36 * self.glass_y(xb), 2.6)), 0.22, 5)

    def build_interior(self, kit: Kit) -> None:
        """A tub inside the cabin, and what is seen through the glass: benches, the dashboard, the wheel."""
        foot, head, rear, back = self.cabin
        trim, seat = kit("trim-dark"), kit(self.upholstery)
        x0, x1 = back - 1.0, foot + 0.5
        if self.arch > 0 and abs(x0) < self.arch + 2.0:
            x0 = -self.arch - 2.0  # its back wall stands behind the rear wheel's well, not in it
        wy = min(self.glass_y(foot), self.glass_y(back)) - 2.2
        zf = max(self._bottom(0.5 * (x0 + x1)) + 4.0, 11.0)
        zb0, zb1 = self.belt(x0) - 0.5, self.belt(x1) - 0.5
        inside = Vector(((x0 + x1) / 2, 0, zf + 12))
        corners = [(x0, -wy), (x1, -wy), (x1, wy), (x0, wy)]
        poly(trim, [(x, y, zf) for x, y in corners], (0, 0, 1))
        for (xa, ya), (xb, yb) in zip(corners, corners[1:] + corners[:1]):
            quad = [
                Vector((xa, ya, zf)),
                Vector((xb, yb, zf)),
                Vector((xb, yb, zb0 if xb == x0 else zb1)),
                Vector((xa, ya, zb0 if xa == x0 else zb1)),
            ]
            poly(trim, quad, inside - sum(quad, Vector()) / 4)
        for s in (1, -1):  # the doors' tops, out to under the shoulder
            out = [(x, s * (self._plan(x) - 0.4 * self.shoulder), self.belt(x) - 5.0) for x in (x0, x1)]
            poly(trim, [(x0, s * wy, zb0), (x1, s * wy, zb1), out[1], out[0]], (0, 0, 1))
        for xa in self.axles:  # wheel housings that stand into the cabin
            if self.arch > 0 and x0 < xa + self.arch and xa - self.arch < x1:
                lo, hi = max(x0, xa - self.arch - 1.5), min(x1, xa + self.arch + 1.5)
                z = min(self.tyre[0] + self.arch + 1.5, zb0 - 2)
                for s in (1, -1):  # only the faces the cabin sees: the well itself is the body's
                    ya, yb = s * (self.well - 1.5), s * wy
                    poly(trim, [(lo, ya, zf), (hi, ya, zf), (hi, ya, z), (lo, ya, z)], (0, -s, 0))
                    poly(trim, [(lo, ya, z), (hi, ya, z), (hi, yb, z), (lo, yb, z)], (0, 0, 1))
                    for x, out in ((lo, -1), (hi, 1)):
                        poly(trim, [(x, ya, zf), (x, yb, zf), (x, yb, z), (x, ya, z)], (out, 0, 0))
        dash = zb1 - 0.5
        hexa(
            trim,
            [(x1 - 9, -wy, dash - 8), (x1, -wy, dash - 8), (x1, wy, dash - 8), (x1 - 9, wy, dash - 8)],
            [(x1 - 7, -wy, dash - 1), (x1, -wy, dash + 0.2), (x1, wy, dash + 0.2), (x1 - 7, wy, dash - 1)],
        )
        hub = Vector((x1 - 15.5, (1 if self.lhd else -1) * 0.52 * wy, dash - 2.0))
        axis = Vector((-1, 0, 0.42)).normalized()
        m = srlib.frame(hub, axis)
        wheel = kit("trim-dark/wheel")
        wheel.lathe([(7.9, 0.0), (8.3, -0.45), (8.7, 0.0), (8.3, 0.45), (7.9, 0.0)], 20, matrix=m)
        wheel.tube(hub - axis * 0.4, hub - axis * 9.0, 0.8, 8)
        for a in (0.25 * TAU, 0.58 * TAU, 0.92 * TAU):
            wheel.tube(hub, m @ Vector((8.0 * math.cos(a), 8.0 * math.sin(a), 0.0)), 0.4, 5)
        fronts = list(self.seats) or [x1 - 24.0, x0 + 26.0]
        for xf in fronts:  # benches
            xr = max(xf - 19.0, x0 + 3.5)
            y = wy - 1
            hexa(
                seat,
                [(xr, -y, zf - 1), (xf, -y, zf - 1), (xf, y, zf - 1), (xr, y, zf - 1)],
                [(xr, -y, zf + 9.5), (xf, -y, zf + 10.5), (xf, y, zf + 10.5), (xr, y, zf + 9.5)],
            )
            z = min(zf + 30.0, self.belt(xr) + 3.0)
            hexa(
                seat,
                [(xr - 1.0, 0.4 - y, zf + 6), (xr + 4.5, 0.4 - y, zf + 6), (xr + 4.5, y - 0.4, zf + 6), (xr - 1.0, y - 0.4, zf + 6)],
                [(xr - 3.5, 0.4 - y, z), (xr + 0.5, 0.4 - y, z), (xr + 0.5, y - 0.4, z), (xr - 3.5, y - 0.4, z)],
            )
        xs = fronts[-1] - 22.0
        if xs > x0 + 4:  # the shelf behind the back seat
            poly(trim, [(x0, -wy, zb0 - 1.0), (xs, -wy, zb0 - 1.0), (xs, wy, zb0 - 1.0), (x0, wy, zb0 - 1.0)], (0, 0, 1))

    # ---- what is hung on the body

    def build_trim(self, kit: Kit) -> None:
        chrome = kit("chrome")
        close = srlib.DETAIL >= 0.75
        nose, tail = self.x1, self.tail
        bw, bh = self.bumper_size
        for end, x_end, zc in ((1, nose, self.bumper[0]), (-1, tail, self.bumper[1])):  # bumpers: a bar round each end
            if end < 0 and self.flat_tail is not None:
                continue
            z = zc or self._bottom(x_end - end * 6) + 3.5
            wide = self.bumper_w[0 if end > 0 else 1] or self._plan(x_end - end * 9) + 1.0
            half = [(x_end - end * 10.0, wide + 0.3), (x_end - end * 1.5, wide), (x_end + end * 1.7, 0.78 * wide), (x_end + end * 2.7, 0.4 * wide)]
            path = [(x, -y, z) for x, y in half] + [(x_end + end * 2.9, 0.0, z)] + [(x, y, z) for x, y in reversed(half)]
            if not trimmed():
                path = path[::2]
            chrome.loft(path, [(bw, bh)] * len(path), 8 if trimmed() else 6, ref=(0, 0, 1), resample=2 if trimmed() else 1)
            if close:
                for s in (1, -1):  # over-riders
                    chrome.lathe(
                        [(0.0, -1.0), (1.5, -1.0), (1.4, 2.6), (0.8, 3.6), (0.0, 3.9)],
                        8,
                        matrix=Matrix.Translation((x_end + end * 2.7, s * 0.16 * self.width, z - 1.6)),
                    )
                # a licence plate, blank, standing on the bar: upright at the front, leaning back at the tail
                lean = Matrix.Translation((x_end + end * 2.7, 0, z + bh + 3.4)) @ Matrix.Rotation(math.radians(20 if end < 0 else 0), 4, "Y")
                p = [lean @ Vector((0, y, zz)) for y, zz in ((-6, -3), (6, -3), (6, 3), (-6, 3))]
                poly(kit("plate"), p, (end, 0, 0.3))
                poly(kit("under/plate"), [q - Vector((end * 0.25, 0, 0)) for q in p], (-end, 0, -0.3))
        hy, hz, hr = self.lamp_at  # head lamps
        hy = hy or 0.72 * self._plan(nose - 3)
        hz = hz or self._top(nose - 4) - 6.5
        for s in (1, -1):
            for k in range(self.lamps):
                lamp(kit, "lamp", (nose, s * (hy - k * (2 * hr + 0.9)), hz), (1, 0, 0), hr)
        ty, tz, tr, wide = self.tail_at  # tail lamps
        if self.flat_tail is None and tr > 0:
            ty = ty or 0.74 * self._plan(tail + 3)
            tz = tz or self._top(tail + 4) - 5.0
            for s in (1, -1):
                lamp(kit, "tail", (tail, s * ty, tz), (-1, 0, 0), tr, wide)
        if not trimmed():
            return
        gw, g0, g1 = self.grille  # the grille: a dark panel leaning back into the nose, bright bars across it
        if g1 > g0:
            dark = kit("under/grille")
            foot, head = nose + 1.5, nose - 2.0  # foot proud, top sunk: nothing lies parallel to the nose
            poly(dark, [(foot, -gw, g0), (foot, gw, g0), (head, gw, g1), (head, -gw, g1)], (1, 0, 0.2))
            poly(dark, [(foot, -gw, g0), (foot, gw, g0), (nose - 3, gw, g0), (nose - 3, -gw, g0)], (0, 0, -1))
            for s in (1, -1):
                poly(dark, [(foot, s * gw, g0), (head, s * gw, g1), (nose - 3, s * gw, g0)], (0, s, 0))
            bars = max(2, round((g1 - g0) / (1.9 if close else 3.2)))
            for i in range(bars + 1):
                t = i / bars
                x, z = foot + (head - foot) * t, g0 + (g1 - g0) * t
                ridge(chrome, [Vector((x, -gw - 0.6, z)), Vector((x, gw + 0.6, z))], (1, 0, 0.35), 0.5 if close else 0.8, 0.8)
        if self.spear:  # a strip down each side
            line = curve(self.spear)
            lo, hi = min(k[0] for k in self.spear), max(k[0] for k in self.spear)
            run = [lo, *(x for x in self.stations() if lo < x < hi), hi]
            mb = kit("chrome" if self.spear_paint == "chrome" else self.spear_paint + "/spear")
            for s in (1, -1):
                pts = [Vector((x, s * self.side(x, line(x)), line(x))) for x in run if self.arch_z(x) < line(x) - 1.2]
                if len(pts) > 1:
                    ridge(mb, pts, (0, s, 0), 0.55, 0.55)
        if not close:
            return
        for x in self.doors:  # shut lines and handles
            zs = self._top(x) - min(self.shoulder, 4.0) - 0.3
            z0 = max(self._bottom(x), self.arch_z(x)) + 0.6
            for s in (1, -1):
                pts = [Vector((x, s * self.side(x, z0 + (zs - z0) * i / 4), z0 + (zs - z0) * i / 4)) for i in range(5)]
                ridge(kit("line"), pts, (0, s, 0), 0.16, 0.14, 0.3)
        for x in self.doors[:-1] if len(self.doors) > 2 else self.doors[:1]:
            zs = self._top(x - 4.5) - min(self.shoulder, 4.0) - 3.8
            for s in (1, -1):
                h = Vector((x - 4.5, s * (self.side(x - 4.5, zs) + 0.75), zs))
                chrome.tube(h - Vector((2.2, 0, 0)), h + Vector((2.2, 0, 0)), 0.42, 6)
                for dx in (-1.9, 1.9):
                    chrome.tube(h + Vector((dx, 0, 0)), h + Vector((dx, -s * 1.3, 0)), 0.3, 5)

    def build_wheel(self, name: str, parent: bpy.types.Object, hub: Vector, side: int) -> int:
        """One road wheel as its own node: origin at the hub, axle along local Y."""
        R, w, rr = self.tyre
        node = group(name, parent)
        node.location = hub * IN
        kit = Kit()
        hw = w / 2
        out = Matrix.Rotation(-side * math.pi / 2, 4, "X")  # the lathe's +Z becomes outboard
        paint_key = self.wheel or self.paint
        if not trimmed():
            kit("rubber").lathe([(0.0, -hw + 1.2), (R - 1.0, -hw), (R, -hw + 1.5), (R, hw - 1.5), (R - 1.0, hw), (rr, hw - 0.3)], 16, matrix=out)
            kit("chrome" if self.cap_r >= rr - 1.0 else paint_key).lathe([(rr, hw - 0.3), (0.0, hw + 0.4)], 16, matrix=out)
            return kit.build(name, node)
        segs = 20
        tyre = [
            (0.0, -hw + 1.2),
            (rr, -hw + 1.2),
            (rr, -hw + 0.3),
            (rr + 0.35 * (R - rr), -hw),
            (R - 1.3, -hw),
            (R - 0.35, -hw + 0.9),
            (R, -hw + 1.9),
        ]
        tyre += [(R, hw - 1.9), (R - 0.35, hw - 0.9), (R - 1.3, hw)]
        if self.whitewall:
            edge = rr + 0.5 + self.whitewall
            tyre += [(edge, hw + 0.1)]
            kit("whitewall").lathe([(edge, hw + 0.1), (rr + 0.5, hw + 0.05), (rr, hw - 0.35)], segs, matrix=out)
        else:
            tyre += [(rr + 0.5, hw + 0.05), (rr, hw - 0.35)]
        kit("rubber").lathe(tyre, segs, matrix=out)
        cr = min(self.cap_r, rr - 0.7)
        if cr < rr - 1.0:
            kit(paint_key).lathe([(rr, hw - 0.35), (rr - 0.45, hw - 1.3), (cr + 1.2, hw - 1.5), (cr, hw - 0.9)], segs, matrix=out)
            kit("chrome").lathe([(cr, hw - 0.9), (cr - 0.5, hw - 0.1), (0.5 * cr, hw + 0.55), (0.0, hw + 0.7)], segs, matrix=out)
        else:  # a full wheel cover
            kit("chrome").lathe(
                [(rr, hw - 0.35), (rr - 0.5, hw - 1.0), (cr - 1.0, hw - 0.9), (0.6 * cr, hw + 0.3), (0.3 * cr, hw + 0.9), (0.0, hw + 1.0)],
                segs,
                matrix=out,
            )
        return kit.build(name, node)

    def build(self, name: str, parent: bpy.types.Object | None, at: Sequence[float], heading: float = 0.0) -> dict:
        """Build it as node `name` under `parent`, the middle of its wheelbase on the ground at
        `at` (metres, the parent's frame), turned `heading` degrees anticlockwise from +X.
        Returns {"node", "triangles", "wheels"}."""
        node = group(name, parent)
        node.location = Vector(at)
        node.rotation_euler = (0.0, 0.0, math.radians(heading))
        kit = Kit()
        self.build_body(kit)
        if self.cabin[0] > self.cabin[3]:
            self.build_greenhouse(kit)
            if srlib.interior():
                self.build_interior(kit)
        for pod in self.pods:
            pod.build(self, kit)
        self.build_trim(kit)
        if self.back:
            self.back(self, kit)
        shift = -self.wheelbase / 2
        tris = kit.build(name, node, (shift, 0, 0))
        wheels = []
        for label, x in (("Wheel", self.axles[0]), ("SteerWheel", self.axles[1])):
            for k, s in ((1, 1), (2, -1)):
                wheels.append(f"{name}_{label}_{k}")
                tris += self.build_wheel(wheels[-1], node, Vector((x + shift, s * self.track / 2, self.tyre[0])), s)
        return {"node": node, "triangles": tris, "wheels": wheels}

    def footprint(self) -> tuple[float, float, float]:
        """How far it reaches ahead of and behind its node's origin, and half its width over everything, in metres."""
        half = max([self.width / 2, *(p.reach for p in self.pods)]) + 0.5
        return ((self.x1 - self.wheelbase / 2 + 4.5) * IN, (self.wheelbase / 2 - self.x0 + 4.5) * IN, half * IN)


@dataclass
class Pod:
    """A separate wing over a wheel: a bulge on the body's side with the wheel's opening in it.
    `top` and `out` are keys along X: its height, and how far its outside stands from the car's middle."""

    top: Keys
    out: Keys
    inner: float  # Y of its inner side, buried in the body
    axle: float | None = None  # X of the wheel it covers; None for a running board
    arch: float = 15.5
    bottom: float = 9.0
    shoulder: float = 5.0
    paint: str | None = None
    lamp: tuple[int, float, float, str] | None = None  # a lamp in its end: +1 front or -1 back, height, radius, kind

    @property
    def reach(self) -> float:
        return max(k[1] for k in self.out)

    def build(self, car: Car, kit: Kit) -> None:
        top, out = curve(self.top), curve(self.out)
        lo, hi = min(k[0] for k in self.top), max(k[0] for k in self.top)
        n = max(4, round((hi - lo) / (4.0 * grain() ** 1.3)))
        xs = [lo + (hi - lo) * i / n for i in range(n + 1)]
        if self.axle is not None:
            m = max(3, round(10 / grain()))
            arc = [self.axle - self.arch * math.cos(math.pi * i / m) for i in range(m + 1)]
            xs = sorted([x for x in xs if all(abs(x - q) > 1.4 * grain() for q in arc)] + [x for x in arc if lo < x < hi])
        ns, na = car.shape()
        key = self.paint or car.paint
        for s in (1, -1):
            loops = []
            for x in xs:
                w, zt = out(x), top(x)
                zb = min(self.bottom, zt - 1.0)
                r = min(self.shoulder, 0.48 * (zt - zb), 0.9 * max(w - self.inner, 0.2))
                zs = zt - r
                za = zb
                if self.axle is not None and abs(x - self.axle) < self.arch:
                    za = min(max(zb, car.tyre[0] + math.sqrt(self.arch**2 - (x - self.axle) ** 2)), zs - 0.6)
                pts = [(self.inner, za), (w - 0.5, za)]
                pts += [(w - 0.5 * (1 - j / ns) ** 2, za + (zs - za) * j / ns) for j in range(1, ns + 1)]
                pts += [(w - r + r * math.cos(math.pi / 2 * k / na), zs + r * math.sin(math.pi / 2 * k / na)) for k in range(1, na + 1)]
                loops.append([Vector((x, s * y, z)) for y, z in [*pts, (self.inner, zt + 0.3)]])
            skin(kit, loops, lambda st, j, key=key: "under" if j == 0 else key, closed=False, flip=s < 0)
            cap(kit(key), loops[0], (-1, 0, 0))
            cap(kit(key), loops[-1], (1, 0, 0))
            if self.lamp:
                end, z, r, kind = self.lamp
                x = (hi if end > 0 else lo) - end * (2.0 + 1.1 * r)
                lamp(kit, kind, (x, s * (self.inner + 0.5 * (out(x) - self.inner) + 0.6), z), (end, 0, 0.12 if end > 0 else 0.0), r)


# ---------------------------------------------------------------------- catalogue
#
# American road vehicles of 1955 to 1961, and the one import everybody had. Wheelbase, length and
# width (and height where given) are the makers' figures as Wikipedia's articles quote them;
# everything else about each shape (where the glass stands, the heights of bonnet and boot, the
# overhangs, tracks, tyres, trim) is estimated from the look of the type. None carries a badge.


def ford_1957(paint: str = "seafoam", roof: str | None = "white", *, wagon: bool = False, **kw) -> Car:
    """1957 Ford Custom 300 Fordor sedan, or the Country Sedan wagon on the same body: 116 in
    wheelbase, 203.5 in long (documented); 77 in wide and 57 in high (estimated). Canted fins over
    round tail lamps, single head lamps, a full-length side strip."""
    wb, nose, L = 116.0, 33.0, 203.5
    x1 = wb + nose
    x0 = x1 - L
    car = dict(
        what="1957 Ford Country Sedan" if wagon else "1957 Ford Custom 300 Fordor",
        wheelbase=wb,
        length=L,
        width=77.0,
        height=59.0 if wagon else 57.0,
        nose=nose,
        track=58.0,
        tyre=(13.4, 6.7, 7.0),
        top=[(x0, 32.5), (x0 + 3, 36.0), (-10, 38.5), (78, 39.5), (140, 38.0), (x1 - 2, 36.0), (x1, 32.0)],
        fin=[] if wagon else [(-14, 0.0), (x0 + 14, 3.0), (x0 + 2, 3.4), (x0, 2.2)],
        cabin=(78.0, 63.0, x0 + 11.0, x0 + 5.0) if wagon else (78.0, 63.0, 9.0, -11.0),
        pillars=(38.0, 3.0, -30.0) if wagon else (38.0,),
        sail=0.0 if wagon else 5.0,
        bow=6.5,
        doors=(82.0, 38.0, 4.0),
        lamp_at=(0.0, 0.0, 3.6),
        tail_at=(0.0, 30.0, 3.3, 1.0),
        grille=(24.0, 17.0, 25.5),
        spear=[(x0 + 5, 27.5), (0, 27.0), (100, 27.5), (x1 - 8, 28.5)],
        seats=(54.0, 20.0),
        whitewall=2.2,
        paint=paint,
        roof=roof,
    )
    return Car(**{**car, **kw})


def chevrolet_1959(paint: str = "navy", roof: str | None = None, **kw) -> Car:
    """1959 Chevrolet Biscayne four-door sedan: 119 in wheelbase, 210.9 in long, 79.6 in wide
    (documented); 56 in high (estimated). The flat spread fins over cat's-eye tail lamps, four
    head lamps set low."""
    wb, nose, L = 119.0, 35.0, 210.9
    x1 = wb + nose
    x0 = x1 - L
    car = dict(
        what="1959 Chevrolet Biscayne sedan",
        wheelbase=wb,
        length=L,
        width=79.6,
        height=56.0,
        nose=nose,
        track=60.0,
        tyre=(13.6, 7.2, 7.0),
        top=[(x0, 29.5), (x0 + 3, 33.0), (-14, 36.0), (80, 38.0), (146, 36.8), (x1 - 2, 34.5), (x1, 30.5)],
        fin=[(-18, 0.0), (x0 + 22, 1.8), (x0 + 3, 3.0), (x0, 2.0)],
        shoulder=3.4,
        crown=1.2,
        cabin=(80.0, 62.0, 6.0, -15.0),
        pillars=(37.0,),
        post=2.2,
        sail=3.0,
        bow=7.5,
        tumble=6.0,
        doors=(84.0, 37.0, 3.0),
        lamps=2,
        lamp_at=(0.0, 24.5, 2.9),
        tail_at=(0.0, 29.0, 2.3, 2.5),
        grille=(31.0, 16.5, 22.0),
        spear=[(x0 + 8, 29.0), (70, 29.5)],
        seats=(55.0, 19.0),
        paint=paint,
        roof=roof,
    )
    return Car(**{**car, **kw})


def ford_1956(paint: str = "white", roof: str | None = "blue", **kw) -> Car:
    """1956 Ford Fairlane Town Sedan: 115.5 in wheelbase, 198.5 in long, 75.9 in wide, 61.0 in
    high (documented). A tall rounded body, single head lamps, round tail lamps, and the
    Fairlane's bright strip that dips in a V at the front door."""
    wb, nose, L = 115.5, 32.0, 198.5
    x1 = wb + nose
    x0 = x1 - L
    car = dict(
        what="1956 Ford Fairlane Town Sedan",
        wheelbase=wb,
        length=L,
        width=75.9,
        height=61.0,
        nose=nose,
        track=58.0,
        tyre=(13.8, 6.7, 7.5),
        top=[(x0, 33.5), (x0 + 3, 37.5), (-9, 40.5), (76, 42.0), (138, 41.0), (x1 - 2, 38.5), (x1, 34.0)],
        fin=[(-12, 0.0), (x0 + 12, 1.6), (x0, 1.2)],
        shoulder=5.0,
        crown=2.2,
        cabin=(76.0, 64.0, 8.0, -9.0),
        pillars=(37.0,),
        sail=6.0,
        bow=6.0,
        doors=(81.0, 37.0, 5.0),
        lamp_at=(0.0, 0.0, 3.6),
        tail_at=(0.0, 31.0, 3.1, 1.0),
        grille=(25.0, 17.5, 26.0),
        spear=[(x1 - 9, 36.0), (72, 35.5), (52, 28.0), (20, 28.5), (x0 + 5, 29.0)],
        seats=(53.0, 20.0),
        whitewall=2.5,
        cap_r=7.5,
        paint=paint,
        roof=roof,
    )
    return Car(**{**car, **kw})


def corvair_1960(paint: str = "white", **kw) -> Car:
    """1960 Chevrolet Corvair 700 four-door sedan: 108 in wheelbase, 180 in long, 66.9 in wide
    (documented); 51.3 in high (estimated). Rear-engined, so no grille; a crease all round at the
    belt, four small head lamps, a roof that overhangs the back light."""
    wb, nose, L = 108.0, 31.0, 180.0
    x1 = wb + nose
    x0 = x1 - L
    car = dict(
        what="1960 Chevrolet Corvair 700 sedan",
        wheelbase=wb,
        length=L,
        width=66.9,
        height=51.3,
        nose=nose,
        track=54.0,
        tyre=(12.2, 6.3, 6.6),
        top=[(x0, 28.5), (x0 + 3, 32.0), (-10, 33.5), (72, 34.5), (132, 33.5), (x1 - 2, 31.5), (x1, 28.0)],
        shoulder=2.2,
        crown=1.0,
        tuck=2.2,
        arch=15.0,
        cabin=(72.0, 58.0, 5.0, -10.0),
        pillars=(34.0,),
        post=2.2,
        bow=6.0,
        roof_reach=(1.5, 4.5),
        doors=(76.0, 34.0, 2.0),
        lamps=2,
        lamp_at=(0.0, 24.5, 2.7),
        tail_at=(0.0, 25.0, 2.3, 1.0),
        spear=[(x0 + 3, 31.0), (x1 - 4, 31.4)],
        spear_paint=paint,
        seats=(50.0, 18.0),
        whitewall=1.8,
        paint=paint,
    )
    return Car(**{**car, **kw})


def rambler_american(paint: str = "black", roof: str | None = "white", **kw) -> Car:
    """1958 to 1960 Rambler American two-door sedan: 100 in wheelbase, 178.25 in long, 73 in wide,
    57.32 in high (documented). The 1950 Nash Rambler's rounded tub brought back, with the wheel
    openings cut out."""
    wb, nose, L = 100.0, 32.0, 178.25
    x1 = wb + nose
    x0 = x1 - L
    car = dict(
        what="1958-60 Rambler American",
        wheelbase=wb,
        length=L,
        width=73.0,
        height=57.32,
        nose=nose,
        track=55.0,
        tyre=(12.8, 5.9, 7.5),
        top=[(x0, 31.0), (x0 + 3, 35.0), (-8, 38.0), (66, 39.0), (124, 38.0), (x1 - 2, 36.0), (x1, 32.0)],
        shoulder=6.5,
        crown=2.6,
        tuck=4.0,
        arch=15.0,
        cabin=(66.0, 56.0, 8.0, -8.0),
        pillars=(28.0,),
        sail=5.0,
        bow=3.5,
        doors=(70.0, 28.0),
        lamp_at=(0.0, 0.0, 3.5),
        tail_at=(0.0, 28.0, 2.2, 1.0),
        grille=(20.0, 17.0, 24.0),
        seats=(44.0, 17.0),
        paint=paint,
        roof=roof,
    )
    return Car(**{**car, **kw})


def volkswagen(paint: str = "cream", **kw) -> Car:
    """Volkswagen Type 1 of 1958 to 1961: 94.5 in wheelbase, 160.6 in long, 60.6 in wide, 59.1 in
    high (documented). A narrow body between four separate wings, running boards, head lamps in
    the front wings, the roof running down into the engine lid."""
    wb, nose, L = 94.5, 26.0, 160.6
    x1 = wb + nose
    x0 = x1 - L
    front = Pod(
        top=[(73, 13.0), (79, 26.5), (wb, 31.5), (110, 30.0), (118, 24.5), (x1 + 0.8, 15.0)],
        out=[(73, 25.0), (82, 29.3), (wb, 30.3), (112, 29.0), (x1 + 0.8, 23.5)],
        inner=15.0,
        axle=wb,
        arch=14.2,
        bottom=12.0,
        lamp=(1, 26.0, 3.2, "lamp"),
    )
    rear = Pod(
        top=[(-32, 13.0), (-27, 24.5), (0, 31.0), (12, 27.5), (20, 13.0)],
        out=[(-32, 23.5), (-20, 29.3), (0, 30.3), (14, 29.0), (20, 26.0)],
        inner=19.0,
        axle=0.0,
        arch=14.2,
        bottom=12.5,
        lamp=(-1, 24.0, 1.5, "tail"),
    )
    board = Pod(top=[(18, 10.2), (75, 10.2)], out=[(18, 28.6), (75, 28.6)], inner=19.0, bottom=8.8, shoulder=0.7, paint="black")
    car = dict(
        what="Volkswagen Type 1, 1958-61",
        wheelbase=wb,
        length=L,
        width=60.6,
        height=59.1,
        nose=nose,
        track=51.0,
        tyre=(12.6, 5.6, 7.5),
        plan=[(x0, 11.0), (x0 + 6, 19.0), (-12, 24.5), (30, 25.5), (66, 25.0), (96, 20.5), (112, 15.5), (x1, 9.0)],
        top=[(x0, 17.0), (x0 + 5, 23.5), (x0 + 16, 31.5), (-14, 37.5), (66, 37.5), (88, 34.5), (108, 28.0), (x1 - 2, 21.5), (x1, 17.0)],
        bottom=[(x0, 15.0), (x0 + 8, 11.0), (-14, 8.5), (100, 8.5), (x1 - 6, 11.0), (x1, 14.0)],
        shoulder=5.5,
        crown=2.5,
        tuck=1.2,
        arch=15.0,  # behind the wing's own opening, and a little larger
        arches=(True, False),
        cabin=(66.0, 59.0, 14.0, -14.0),
        pillars=(24.0,),
        post=2.4,
        sail=4.0,
        tumble=4.0,
        bow=1.5,
        backlight=0.55,
        roof_reach=(1.2, 1.2),
        doors=(64.0, 24.0),
        lamps=0,
        tail_at=(0.0, 0.0, 0.0, 1.0),
        bumper=(15.5, 16.0),
        bumper_w=(27.5, 27.5),
        bumper_size=(1.0, 1.7),
        seats=(46.0, 16.0),
        pods=(front, rear, board),
        paint=paint,
    )
    return Car(**{**car, **kw})


def suburban_1960(paint: str = "white", **kw) -> Car:
    """1960 Chevrolet Suburban Carryall: 115 in wheelbase, 199.5 in long, 79.5 in wide
    (documented); 72 in high (estimated). A half-ton truck's front with a long windowed body: two
    doors, three rows of seats, four head lamps."""
    wb, nose, L = 115.0, 33.0, 199.5
    x1 = wb + nose
    x0 = x1 - L
    car = dict(
        what="1960 Chevrolet Suburban Carryall",
        wheelbase=wb,
        length=L,
        width=79.5,
        height=72.0,
        nose=nose,
        track=61.0,
        tyre=(14.2, 6.7, 7.5),
        sill=13.5,
        top=[(x0, 43.0), (x0 + 3, 46.5), (70, 48.0), (122, 47.0), (x1 - 3, 44.5), (x1, 40.0)],
        shoulder=3.4,
        crown=1.4,
        tuck=2.0,
        arch=17.5,
        cabin=(70.0, 61.0, x0 + 10.0, x0 + 5.0),
        pillars=(36.0, 2.0, -28.0),
        tumble=4.0,
        bow=4.5,
        roof_reach=(1.5, 1.0),
        doors=(74.0, 36.0),
        lamps=2,
        lamp_at=(0.0, 36.5, 2.9),
        tail_at=(0.0, 36.0, 2.0, 1.0),
        grille=(26.0, 27.0, 33.5),
        bumper=(21.0, 21.0),
        seats=(48.0, 14.0, -18.0),
        paint=paint,
    )
    return Car(**{**car, **kw})


def ford_f100(paint: str = "white", *, utility: str | None = "white", insignia: bool = False, **kw) -> Car:
    """1957 to 1960 Ford F-100 on the 110 in wheelbase (documented), with the separate-wing
    (Flareside) back; about 190 in long, 76 in wide and 70 in high over the cab (estimated). With
    `utility` (a paint), a closed body stands on the bed: rounded top, a window each side, two
    doors at the back. `insignia` puts a plain dark disc on each door."""
    wb, nose, L = 110.0, 32.0, 190.0
    x1 = wb + nose
    x0 = x1 - L
    cab = 38.0

    def back(car: Car, kit: Kit) -> None:
        key = (utility or paint) + "/box"
        body = kit(key)
        for s in (1, -1):  # the frame's rails
            ya, yb = sorted((s * 13.0, s * 16.0))
            box(kit("under"), (x0 + 4, ya, 15.0), (cab - 1.0, yb, 20.5))
        box(body, (x0, -25.0, 20.5), (cab - 2.5, 25.0, 33.0))  # the bed
        kit("chrome").loft([(x0 - 3.0, -33.0, 19.0), (x0 - 3.0, 0, 19.0), (x0 - 3.0, 33.0, 19.0)], [(1.4, 2.3)] * 3, 8, ref=(0, 0, 1), resample=1)
        for s in (1, -1):
            lamp(kit, "tail", (x0, s * 22.0, 27.0), (-1, 0, 0), 1.8)
        if utility:
            hw, z0, z1, r = 37.0, 33.0, 79.0, 7.0
            n = max(2, round(4 / grain()))
            half = [(0.0, z0), (hw, z0)] + [
                (hw - r + r * math.cos(math.pi / 2 * k / n), z1 - r + r * math.sin(math.pi / 2 * k / n)) for k in range(n + 1)
            ]
            half += [(0.0, z1 + 1.2)]
            loop = [*half, *[(-y, z) for y, z in half[-2:0:-1]]]
            ends = (x0 - 1.0, x0 + 0.5, cab - 4.0, cab - 2.5)
            loops = [
                [Vector((x, y * (0.97 if i in (0, 3) else 1.0), z1 + (z - z1) * (0.985 if i in (0, 3) else 1.0))) for y, z in loop]
                for i, x in enumerate(ends)
            ]
            skin(kit, loops, lambda st, j: key, closed=True)
            cap(body, loops[0], (-1, 0, 0))
            cap(body, loops[-1], (1, 0, 0))
            void = kit("void")
            for s in (1, -1):  # a window each side and one in each back door, hinged out at the foot like an awning
                pane = [(-22.0, s * (hw + 0.4), 70.0), (-4.0, s * (hw + 0.4), 70.0), (-4.0, s * (hw + 3.4), 59.0), (-22.0, s * (hw + 3.4), 59.0)]
                poly(void, pane, (0, s, 0.3))
                poly(void, [pane[2], pane[3], (-22.0, s * (hw - 0.5), 59.0), (-4.0, s * (hw - 0.5), 59.0)], (0, 0, -1))
                for x in (-22.0, -4.0):
                    poly(void, [(x, s * (hw + 0.4), 70.0), (x, s * (hw + 3.4), 59.0), (x, s * (hw - 0.5), 59.0)], (x + 13.0, 0, 0))
                ya, yb = sorted((s * 5.0, s * 21.0))
                xb = x0 - 1.0
                pane = [(xb - 0.4, ya, 70.0), (xb - 0.4, yb, 70.0), (xb - 3.2, yb, 59.0), (xb - 3.2, ya, 59.0)]
                poly(void, pane, (-1, 0, 0.3))
                poly(void, [pane[2], pane[3], (xb + 0.5, yb, 59.0), (xb + 0.5, ya, 59.0)], (0, 0, -1))
                for y in (ya, yb):
                    poly(void, [(xb - 0.4, y, 70.0), (xb - 3.2, y, 59.0), (xb + 0.5, y, 59.0)], (0, y - s * 13.0, 0))
            if srlib.DETAIL >= 0.75:  # the back doors' shut lines
                for y in (0.0, -30.0, 30.0):
                    ridge(kit("line"), [Vector((x0 - 1.0, y, 36.0)), Vector((x0 - 1.0, y, 72.0))], (-1, 0, 0), 0.2, 0.16, 0.3)
        if insignia and trimmed():
            for s in (1, -1):
                at = Vector((58.0, s * car.side(58.0, 31.0), 31.0))
                kit("insignia").lathe([(4.2, -0.7), (0.0, 1.8)], 16, matrix=srlib.frame(at, (0, s, 0)))

    wing = Pod(
        top=[(-20, 15.0), (-15, 27.0), (0, 32.0), (15, 27.0), (20, 15.0)],
        out=[(-20, 33.0), (-10, 37.2), (0, 37.8), (10, 37.2), (20, 33.0)],
        inner=23.0,
        axle=0.0,
        arch=16.5,
        bottom=14.0,
    )
    car = dict(
        what="1957-60 Ford F-100 Flareside" + (" with a utility body" if utility else ""),
        wheelbase=wb,
        length=L,
        width=76.0,
        height=70.0,
        nose=nose,
        track=60.5,
        tyre=(14.2, 6.7, 7.5),
        top=[(cab, 45.5), (72, 46.5), (126, 45.5), (x1 - 3, 43.0), (x1, 38.5)],
        bottom=[(cab, 14.0), (130, 14.0), (x1 - 6, 17.0), (x1, 20.0)],
        plan=[(cab, 37.2), (120, 38.0), (x1 - 5, 36.5), (x1, 31.0)],
        shoulder=4.0,
        crown=1.4,
        tuck=2.0,
        arch=17.5,
        arches=(False, True),
        flat_tail=cab,
        cabin=(72.0, 62.0, 45.0, 41.0),
        tumble=4.0,
        bow=5.0,
        roof_reach=(1.5, 2.5),
        doors=(76.0, 44.0),
        lamp_at=(0.0, 36.5, 3.6),
        grille=(25.0, 26.0, 33.0),
        bumper=(21.0, 0.0),
        seats=(66.0,),
        pods=(wing,),
        back=back,
        paint=paint,
    )
    return Car(**{**car, **kw})
