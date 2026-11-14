"""What stood on the launching platform's deck on 12 April 1961, as the photographs and the film of the day show it:
the joints between its slabs, the low railing at its edge, two cabinets, a horn loudspeaker.

The source is one photograph, taken from beyond the south fence before liftoff (the rocket venting, the erector
gone), and the film of the morning («Первый рейс к звёздам», ЦСДФ 1961). The photograph is 28 px a metre at the
rocket (its fairing's breadth), so what is measured off it is good to some half a metre.

  The railing. Posts and wires along the platform's edge: it runs to the south-east corner, which a fence set in
    15 ft (the CIA's, from the photographs of 1957 and 1959: platform.py builds that one too) could not do, and on
    west past the south-west corner. Its height, about 1.1 m, is measured; its posts' spacing and the four wires are
    estimated.
  The cabinets. Two dark boxes behind the railing: one 2.7 m broad and 2.2 m high, its middle 20.4 m west of the
    axis; one 1.1 m broad and 2.2 m high, 16.7 m west, with a horn on its east side. How far in from the edge they
    stood cannot be seen from the south (estimated: 2 m). What they held is not recorded; their doors, caps and
    plinths are ours.
  The loudspeaker. The horn on the narrower cabinet. That it was a loudspeaker is our reading: "the loudspeakers
    announce the operational time" (Ivanovsky), and a readiness report of March 1961 has the "loud-speaking
    communication" checked. Another stands on the erector's wagon (erector.py), on a red box, in a colour photograph.
  The slabs. The film, looking down from the erector, shows the concrete in rectangular slabs with the rails flush.
    Their size on the platform is estimated: 6 m by 3 m.

Node: DeckFittings. See ../site-1.md.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import sitelib

from .deck import CENTRE, GANTRY, NORTH, SOUTH
from .platform import ABUTMENT, CHAMFER, HALF, LIP
from .site import GAUGE, OPENING_R, Parts, beam, box, fine, stood

RAIL_IN = 0.3  # the edge railing, in from the edge, m (estimated)
RAIL_H = 1.1  # its height, m (measured off the photograph, to some 0.2 m)
POSTS = 2.5  # between its posts, m (estimated)
# Each cabinet: its middle east and north of the axis, its breadth east to west, its depth, its height, m.
CABINETS = ((-20.4, -18.5, 2.7, 1.0, 2.2), (-16.7, -18.5, 1.1, 0.8, 2.2))
# The joints: across the deck, m east of the axis; and along it, m north of it, kept off every rail
JOINTS_X = (-18.0, -12.0, -6.0, 0.0, 6.0, 12.0, 18.0)
JOINTS_Y = tuple(s * (1.75 + 3.0 * k) for s in (-1, 1) for k in range(7))
JOINT = 0.03  # a joint's breadth, m
JOINT_Z = 0.004  # and how far over the deck it is drawn (viewer/laid.ts keeps `…-joint` apart from the slab in depth)


def _rails() -> list[tuple[float, float]]:
    """The rails on the slab that a joint across the deck stops for: (m north of the axis, the rail's east end)."""
    out = []
    for y, x_end in (CENTRE, NORTH, SOUTH):
        out += [(y + s * (GAUGE / 2 + 0.035), x_end) for s in (-1, 1)]
    out += [(s * GANTRY / 2, -math.sqrt(OPENING_R**2 - (GANTRY / 2) ** 2)) for s in (-1, 1)]
    return out


def joints(parts: Parts, node: str) -> None:
    mb = parts(node, "joint")
    lim = HALF - 0.06
    hole = OPENING_R + 0.12
    corner = HALF - CHAMFER  # beyond it, to the south-east, the slab's corner is cut off

    def strip(x0: float, y0: float, x1: float, y1: float) -> None:
        if x1 - x0 > 0.02 and y1 - y0 > 0.02:
            mb.add([sitelib.P(x0, y0, JOINT_Z), sitelib.P(x1, y0, JOINT_Z), sitelib.P(x1, y1, JOINT_Z), sitelib.P(x0, y1, JOINT_Z)], [(0, 1, 2, 3)])

    for y in JOINTS_Y:  # along the deck: stopped where the line crosses the opening
        dx = math.sqrt(hole**2 - y**2) if abs(y) < hole else 0.0
        east = min(lim, 2 * HALF - CHAMFER + y - 0.06) if y < -corner else lim
        for a, b in sitelib.free(-lim, east, [(-dx, dx)] if dx else []):
            strip(a, y - JOINT / 2, b, y + JOINT / 2)
    for x in JOINTS_X:  # across it: stopped at the opening, at each rail it meets and at each line along the deck
        dy = math.sqrt(hole**2 - x**2) if abs(x) < hole else 0.0
        taken = [(-dy, dy)] if dy else []
        taken += [(ry - 0.1, ry + 0.1) for ry, x_end in _rails() if x < x_end + 0.1]
        taken += [(jy - JOINT / 2 - 0.002, jy + JOINT / 2 + 0.002) for jy in JOINTS_Y]
        south = max(-lim, x - (2 * HALF - CHAMFER) + 0.06) if x > corner else -lim
        for a, b in sitelib.free(south, lim, taken):
            strip(x - JOINT / 2, a, x + JOINT / 2, b)


def railing(parts: Parts, node: str) -> None:
    """Posts and wires along the three sides over the pit and on west along the abutment's south side; open at the
    lip, where the mast's ladder is reached from the deck."""
    posts, wires = parts(node, "galv/posts"), parts(node, "wire/edge")
    e = HALF - RAIL_IN
    k = RAIL_IN * (math.sqrt(2) - 1)  # where the railing turns at each end of the cut corner
    runs = [
        [(-HALF, e), (e, e)],  # the north edge
        [(e, HALF - LIP[1] - 0.3), (e, -HALF + CHAMFER + k)],  # the east edge, from the lip south
        [(e, -HALF + CHAMFER + k), (HALF - CHAMFER - k, -e)],  # across the cut corner
        [(HALF - CHAMFER - k, -e), (-HALF - ABUTMENT + 0.3, -e)],  # the south edge, and on along the abutment
    ]
    for r, ((ax, ay), (bx, by)) in enumerate(runs):
        n = max(1, round(math.hypot(bx - ax, by - ay) / POSTS))
        for i in range(1 if r >= 2 else 0, n + 1):  # (a post where two runs meet belongs to the first of them)
            px, py = ax + (bx - ax) * i / n, ay + (by - ay) * i / n
            box(posts, (px - 0.035, py - 0.035, -0.2), (px + 0.035, py + 0.035, RAIL_H))
        for h in (0.3, 0.56, 0.82, 1.06) if fine() else (0.56, 1.06):
            beam(wires, (ax, ay, h), (bx, by, h), 0.014)


def horn(parts: Parts, node: str, at, aim, size: float = 1.0, key: str = "") -> None:
    """A horn loudspeaker: a flared mouth with its driver behind. `at` is the horn's throat, `aim` the way it points.
    (The reflex horns of the time were some 0.4 m across the mouth: estimated.)"""
    shell, drive = parts(node, f"galv/horns{key}", True), parts(node, f"dark/horns{key}", True)
    m = Matrix.Translation(Vector(at)) @ Vector((0, 0, 1)).rotation_difference(Vector(aim).normalized()).to_matrix().to_4x4()
    k = size
    # the flare, a thin shell: out along its outside from the throat to the lip, back along its inside
    out = [(0.05 * k, 0.0), (0.07 * k, 0.15 * k), (0.12 * k, 0.27 * k), (0.21 * k, 0.36 * k)]
    back = [(0.196 * k, 0.352 * k), (0.105 * k, 0.262 * k), (0.055 * k, 0.15 * k), (0.035 * k, 0.0)]
    shell.lathe(sitelib.profile([*out, *back]), 16, matrix=m)
    drive.lathe(sitelib.profile([(0.0, -0.14 * k), (0.07 * k, -0.14 * k), (0.085 * k, -0.1 * k), (0.085 * k, 0.0), (0.0, 0.0)]), 12, matrix=m)
    drive.lathe(sitelib.profile([(0.0, 0.16 * k), (0.045 * k, 0.22 * k), (0.0, 0.28 * k)]), 10, matrix=m)  # the reflex cone in the mouth


def cabinets(parts: Parts, node: str) -> None:
    """Two steel cupboards on concrete plinths, their doors in the north face (toward the tracks), a sloped cap. Their
    size is the photograph's; their form is estimated."""
    body, plinth, trim = parts(node, "dark/cabinets"), parts(node, "concrete/plinths"), parts(node, "deck/trim")
    for cx, cy, w, d, h in CABINETS:
        box(plinth, (cx - w / 2 - 0.08, cy - d / 2 - 0.08, -0.2), (cx + w / 2 + 0.08, cy + d / 2 + 0.08, 0.18))
        box(body, (cx - w / 2, cy - d / 2, 0.15), (cx + w / 2, cy + d / 2, h - 0.12))
        o = 0.07  # the cap: sloped to the south, oversailing all round
        loops = []
        for x in (cx - w / 2 - o, cx + w / 2 + o):
            loops.append([(x, cy - d / 2 - o, h - 0.14), (x, cy + d / 2 + o, h - 0.14), (x, cy + d / 2 + o, h), (x, cy - d / 2 - o, h - 0.09)])
        sitelib.solid(body, loops)
        leaves = max(1, round(w / 0.9))
        for i in range(leaves):  # door leaves standing 3 cm proud of the north face, a gap between them
            xa = cx - w / 2 + 0.06 + (w - 0.12) * i / leaves
            xb = cx - w / 2 + 0.06 + (w - 0.12) * (i + 1) / leaves
            box(body, (xa + 0.015, cy + d / 2 - 0.02, 0.24), (xb - 0.015, cy + d / 2 + 0.03, h - 0.2))
            if fine():
                hx = xb - 0.1 if i % 2 == 0 else xa + 0.1  # a handle near the meeting edge, hinges at the other
                box(trim, (hx - 0.02, cy + d / 2 + 0.02, 1.0), (hx + 0.02, cy + d / 2 + 0.075, 1.22))
                ex = xa + 0.07 if i % 2 == 0 else xb - 0.07
                for zc in (0.5, h - 0.5):
                    box(trim, (ex - 0.025, cy + d / 2 + 0.02, zc - 0.07), (ex + 0.025, cy + d / 2 + 0.06, zc + 0.07))
        if fine():  # a hooded vent in each end (but where the horn's bracket is)
            for s in (-1, 1) if w > 2.0 else (-1,):
                fx = cx + s * w / 2
                sitelib.solid(
                    trim, [[(fx - s * 0.02, y, h - 0.62), (fx + s * 0.09, y, h - 0.62), (fx - s * 0.02, y, h - 0.4)] for y in (cy - 0.2, cy + 0.2)]
                )
    # the horn on the narrower cabinet's east side, on a bracket, turned to the launch system
    cx, cy, w, d, h = CABINETS[1]
    horn(parts, node, (cx + w / 2 + 0.22, cy, h - 0.45), (1.0, 0.3, 0.05))
    beam(trim, (cx + w / 2 - 0.02, cy, h - 0.45), (cx + w / 2 + 0.2, cy, h - 0.45), 0.05)


def build(parts: Parts) -> None:
    if not stood(
        "On the deck: the edge railing, two cabinets, a loudspeaker; the slabs' joints",
        since="1961-04-12",
        confidence="documented",
        source="a photograph of 12 April 1961 taken from beyond the south fence before liftoff (the railing, the cabinets, the horn); "
        "the film of the morning (slabs, the rails flush). Not on the CIA's plans from the photographs of 1957 and 1959, which have a "
        "fence 15 ft in from the edge: when these came is not known, and for an earlier date they are left out",
    ):
        return
    g = "DeckFittings"
    parts.node(
        g,
        label="On the deck",
        about=(
            "What a photograph taken from beyond the south fence on 12 April 1961 shows on the platform: a low railing of posts "
            "and wires at its edge, two dark cabinets some 2.2 m high near its south-west corner, a horn loudspeaker on one of them. "
            "What the cabinets held is not recorded."
        ),
    )
    joints(parts, g)
    railing(parts, g)
    cabinets(parts, g)


def summary() -> str:
    return f"edge railing {RAIL_H:.1f} m, cabinets {CABINETS[0][2]:.1f} and {CABINETS[1][2]:.1f} m broad and {CABINETS[0][4]:.1f} m high"
