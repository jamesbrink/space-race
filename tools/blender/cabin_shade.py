"""A cabin's own shadow, kept at its vertices (rendering.md, "An inside to sit in").

The viewer's lamps cast no shadows (every shadow map is a texture every lit surface in the scene must carry, and the
ground has none to spare), so this is where the dark behind a panel, under a console and in the corners comes from. It
is worked once, in the build, by casting rays against everything in the cabin as it stands: what moves afterwards (a
needle, a hand controller) leaves no shadow where it has gone.

What is kept is a colour attribute of four parts named `Shade`, the only one srlib.export_glb exports. Its red, green
and blue are how lit each point is by each of the cabin's lamps alone, one lamp to a channel in the order of the
flight's `ModelDef.lights` (red the first, green the second, blue the third; a cabin of one lamp has its figure in all
three, one of two the mean of its two in the blue); its alpha is how lit it is with them all out: how open the point is,
and how much of what lets light in (a porthole's pane, a periscope's screen) it sees. The viewer reads them together
(src/viewer/shade.ts): each lamp's figure by its share of the strength lit, and that mixed with the alpha by how much of
the whole is lit, so a way of the lights' switch that lights one lamp, or one at a quarter, is shaded as that lamp alone.

Each shaded mesh carries `shade_lamps` in its extras: the lamps' names, comma-joined, in the order of the channels (a
fitting's node, `Lamp_...`, where the lamp has one), which tests/ holds to the flight's `CabinDef.lighting.fittings`.
"""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence

import bpy
from mathutils import Vector


def spread(count: int) -> list[Vector]:
    """Directions over a hemisphere about +Z, evenly, more of them toward the pole (a cosine's share)."""
    out = []
    for i in range(count):
        r = math.sqrt((i + 0.5) / count)
        a = i * 2.39996323  # the golden angle
        out.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0.0, 1.0 - r * r)))))
    return out


def disc(at: Vector, facing: Vector, radius: float, out: float = 0.0) -> list[Vector]:
    """Where a round source of light (a lamp's lens, a pane) is asked from: its middle and four points at six tenths of
    its radius, `out` in front of it along `facing`, all in the scene's frame."""
    n = facing.normalized()
    a = (Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).cross(n).normalized() * (0.6 * radius)
    b = n.cross(a)
    c = at + n * out
    return [c, c + a, c - a, c + b, c - b]


def is_seen_through(o: bpy.types.Object) -> bool:
    """A pane or a crystal, or anything blended: not painted (its alpha is its own), and nothing a lamp is hidden behind."""
    mat = o.active_material
    return mat is not None and (mat.name.startswith(("glass", "crystal")) or mat.surface_render_method == "BLENDED")


def bake(
    receivers: Sequence[bpy.types.Object],
    casters: Sequence[bpy.types.Object],
    lamps: Sequence[tuple[str, Vector, Sequence[Vector]]],
    openings: Sequence[Sequence[Vector]] = (),
    broad: Sequence[str] = (),
    flip: Sequence[str] = (),
    skin: tuple[float, float] = (0.038, 0.003),
    reach: float = 0.23,
    short: float = 0.010,
    joined: Mapping[str, Sequence[str]] | None = None,
) -> None:
    """Shade `receivers` (meshes) against `casters` (meshes; the receivers among them) by `lamps`, in the order of the
    flight's `ModelDef.lights`: each (name, its middle, the places along or across it it is asked from), in the scene's
    frame, metres. `openings`: what lets light in with the lamps out, each as the places it is asked from (`disc`).

    On the broad surfaces (`broad`, by name: a wall, a couch, a panel's face, where a shadow's edge can be read) every
    place of a lamp is asked, a ray starts `skin[0]` off the surface, clear of what is fastened to it (a clip, a case
    on its feet: a vertex of the wall that happened to lie under a clip was a dark blot two inches across, with its
    neighbours lit), and the result is evened between neighbouring vertices twice, so a shadow's edge is a slope and
    not a step; elsewhere (a hose, a bolt) a lamp is asked once from its middle, `skin[1]` off. How open a point is is
    asked from close to, over `reach`; a ray to a light stops `short` of it. A mesh named in `flip` is seen from the side
    its faces turn away from (a hull's piece built facing out, and seen from inside): it is shaded for that side.

    A mesh named in `joined` is narrow and hangs on others (a curtain a third of an inch off the wall it is snapped to):
    asked from itself, a ray from its skin starts out in the open where the wall's do not, and it came out lit where the
    wall it lies on is dark, a bright line along the wall. It takes its figures from the meshes it is joined to instead,
    each vertex the mean of their four nearest vertices, the nearer counting the more."""
    from mathutils.bvhtree import BVHTree

    assert 1 <= len(lamps) <= 3, f"a shade has three channels for lamps: {len(lamps)} lamps"
    verts, tris = [], []
    for o in casters:
        o.data.calc_loop_triangles()
        base = len(verts)
        m = o.matrix_world
        verts.extend(m @ v.co for v in o.data.vertices)
        tris.extend(tuple(base + i for i in t.vertices) for t in o.data.loop_triangles)
    tree = BVHTree.FromPolygons(verts, tris)
    ways, few = spread(24), spread(9)
    names = ",".join(name for name, _, _ in lamps)

    def sees(at: Vector, n: Vector, places) -> tuple[float, float]:
        """How much of `places` (points of one source of light) a point sees, 0 to 1; and by how much it faces them."""
        got, facing = 0, 0.0
        for p in places:
            to = p - at
            length = to.length
            facing += to.dot(n) / max(length, 1e-9)
            if to.dot(n) > 0 and tree.ray_cast(at, to / length, length - short)[0] is None:
                got += 1
        return got / len(places), facing / len(places)

    joined = joined or {}
    figures: dict[str, tuple[list[Vector], list[tuple[float, float, float, float]]]] = {}
    for o in [r for r in receivers if r.name not in joined] + [r for r in receivers if r.name in joined]:
        if is_seen_through(o):
            continue
        if o.name in joined:
            _join(o, [figures[name] for name in joined[o.name]], names)
            continue
        wide = o.name in broad
        off = skin[0] if wide else skin[1]
        mesh = o.data
        m = o.matrix_world
        turn = m.to_3x3().inverted().transposed() * (-1.0 if o.name in flip else 1.0)
        count = len(mesh.vertices)
        on = [[0.0] * count for _ in lamps]
        dark = [0.0] * count
        for i, v in enumerate(mesh.vertices):
            n = (turn @ v.normal).normalized()
            co = m @ v.co
            near = co + n * skin[1]
            at = co + n * off
            t1 = (Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).cross(n).normalized()
            t2 = n.cross(t1)
            rays = ways if wide else few
            clear = sum(tree.ray_cast(near, t1 * w.x + t2 * w.y + n * w.z, reach)[0] is None for w in rays) / len(rays)
            for k, (_, middle, places) in enumerate(lamps):
                got, facing = sees(at, n, places if wide else [middle])
                # turned away, or shaded: lit by what the rest of the cabin gives back
                lit = max(0.0, min(1.0, (facing + 0.15) / 0.3))
                seen = 0.3 * (1 - lit) + lit * (0.12 + 0.88 * got)
                on[k][i] = 0.1 + 0.9 * (0.6 * seen + 0.4 * clear) ** 1.5
            windows = max((sees(at, n, places)[0] for places in openings), default=0.0)
            dark[i] = 0.08 + 0.92 * (0.5 * clear + 0.5 * windows) ** 1.5
        if wide:  # evened between neighbours, twice
            ring = [[] for _ in mesh.vertices]
            for e in mesh.edges:
                a, b = e.vertices
                ring[a].append(b)
                ring[b].append(a)
            for _ in range(2):
                on = [_even(xs, ring) for xs in on]
                dark = _even(dark, ring)
        # one lamp to a channel; a channel with no lamp of its own carries the mean of those there are
        mean = [sum(xs[i] for xs in on) / len(on) for i in range(count)]
        channels = [on[k] if k < len(on) else mean for k in range(3)]
        layer = mesh.color_attributes.new("Shade", "FLOAT_COLOR", "POINT")
        for i in range(count):
            layer.data[i].color = (channels[0][i], channels[1][i], channels[2][i], dark[i])
        o["shade_lamps"] = names
        if any(o.name in targets for targets in joined.values()):
            figures[o.name] = ([m @ v.co for v in mesh.vertices], [tuple(c.color) for c in layer.data])


def _join(o: bpy.types.Object, onto: list[tuple[list[Vector], list[tuple[float, float, float, float]]]], names: str) -> None:
    """Shade `o` with the figures of the meshes it hangs on (`onto`: each one's vertices in the scene's frame and their
    figures): each vertex the mean of the four nearest of theirs, weighted by the inverse of the distance."""
    from mathutils.kdtree import KDTree

    at = [p for points, _ in onto for p in points]
    values = [v for _, figs in onto for v in figs]
    tree = KDTree(len(at))
    for i, p in enumerate(at):
        tree.insert(p, i)
    tree.balance()
    m = o.matrix_world
    layer = o.data.color_attributes.new("Shade", "FLOAT_COLOR", "POINT")
    for i, v in enumerate(o.data.vertices):
        near = tree.find_n(m @ v.co, 4)
        weights = [1.0 / max(d, 1e-4) for _, _, d in near]
        total = sum(weights)
        layer.data[i].color = tuple(sum(w * values[k][c] for w, (_, k, _) in zip(weights, near, strict=True)) / total for c in range(4))
    o["shade_lamps"] = names


def _even(xs: list[float], ring: list[list[int]]) -> list[float]:
    """Each vertex's figure evened with its neighbours'."""
    return [(k + sum(xs[j] for j in ring[i])) / (1 + len(ring[i])) for i, k in enumerate(xs)]


def meshes_under(*nodes: bpy.types.Object) -> list[bpy.types.Object]:
    """Every mesh under these nodes, at any depth."""
    out = []
    for node in nodes:
        for o in [node, *node.children_recursive]:
            if o.type == "MESH":
                out.append(o)
    return out


def nearest(prefix: str, at: Vector) -> str:
    """The name of the object starting with `prefix` whose middle is nearest `at` (scene's frame): a lamp's fitting."""
    best, least = "", math.inf
    for o in bpy.data.objects:
        if o.type != "MESH" or not o.name.startswith(prefix):
            continue
        middle = o.matrix_world @ (sum((Vector(c) for c in o.bound_box), Vector()) / 8)
        if (middle - at).length < least:
            best, least = o.name, (middle - at).length
    return best
