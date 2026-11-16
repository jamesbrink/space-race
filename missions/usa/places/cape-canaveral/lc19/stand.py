"""The launch stand: a concrete stand three storeys high with the steel launch deck at its north end, over the two
flame ducts and the flume's apron; the thrust mount the vehicle stood on; and the ramp the stages came up.

"The stand was 65 feet wide, 450 feet long, and three stories high" (the NHL nomination of Cape Canaveral AFS, Item 7,
p. 9): the width and the length are those. Everything else is read off photographs, chiefly NASA S65-43447 (the stand
from the flume, Gemini V on it, August 1965), S65-49568 (the same vehicle from the east, the erector part lowered),
S65-20994 and S65-20641 (the deck on the morning of Gemini 3 and at its rehearsal), and is estimated: ../lc-19.md.

The deck is two things. South of the vehicle it is the concrete stand's roof, painted blue-grey, which the stage
trailers, the cars and the crew's van came up the ramp on to. Round the vehicle it is steel, on steel columns, built
out north over the flume ("Launch deck: external north end", in Martin's list of what Gemini changed), with an opening
under each of the two firing positions: the vehicle's, and to its east the second stage's, which was fired alone
there for checkout. Under each opening a steel duct turns the flame north on to the apron.
"""

from __future__ import annotations

import math

from mathutils import Vector

from .site import (
    APRON,
    DECK_NORTH,
    DECK_SOUTH,
    DECK_Y,
    FOOTING,
    GROUND,
    HINGE,
    MOUNT_HEAD,
    MOUNT_TOP,
    OPENING,
    RAMP_FOOT,
    RAMP_ROAD,
    STAGE2_STAND,
    STAND_SOUTH,
    STAND_Y,
    STOREYS,
    P,
    Parts,
    beam,
    box,
    handrail,
    hull,
    obox,
    ring,
    stair_rails,
    stairs,
    wall_door,
    window,
)

DECK_T = 1.0  # the steel deck's depth, with its beams
STAGE2_OPENING = (5.5, 6.5)  # half the opening under the second stage's stand: its outlet is 13 ft wide in S65-43447
STAIR_X = (56.0, 106.0)  # the two stairs down the stand's long walls: where each starts at the deck and where it lands
STAIR_W = 3.5
RAMP_TAPER = STAND_SOUTH + 45.0  # by here the ramp's top has narrowed from the stand's width to the road's


def rrect(hu: float, hv: float, r: float, n: int = 3) -> list[tuple[float, float]]:
    """A rounded rectangle about the origin, anticlockwise: half its size each way and its corners' radius."""
    pts = []
    for cu, cv, a0 in ((hu - r, hv - r, 0.0), (-hu + r, hv - r, 90.0), (-hu + r, -hv + r, 180.0), (hu - r, -hv + r, 270.0)):
        for k in range(n + 1):
            a = math.radians(a0 + 90.0 * k / n)
            pts.append((cu + r * math.cos(a), cv + r * math.sin(a)))
    return pts


def duct(mb, y: float, half: tuple[float, float], throat: float, mouth: tuple[float, float], z_top: float) -> None:
    """A flame duct: down from the opening in the deck at (0 + x0, y), round a quarter turn and out north to the
    apron. `half` is half the opening (along X, along Y), `throat` the x of its middle, `mouth` half the outlet
    (across, up). One skin, seen from inside and out."""
    radius = 9.0
    ze = APRON + 1.5 + mouth[1]  # the outlet's middle: its sill a foot and a half over the apron
    out = DECK_NORTH + 6.0  # the outlet's lip, under the deck's edge
    path = [((throat, z_top), (0.0, -1.0), half[0], half[1])]
    turn = 6
    for k in range(turn + 1):
        a = math.pi / 2 * k / turn
        c = (throat - radius + radius * math.cos(a), ze + radius - radius * math.sin(a))
        t = (-math.sin(a), -math.cos(a))
        s = k / turn
        path.append((c, t, half[0] + (mouth[1] - half[0]) * s, half[1] + (mouth[0] - half[1]) * s))
    path.append(((out, ze), (-1.0, 0.0), mouth[1], mouth[0]))
    loops = []
    for (cx, cz), (tx, tz), hu, hv in path:
        nx, nz = tz, -tx  # across the path, in the vertical plane: toward the outside of the bend
        loops.append([(cx + nx * u, y + v, cz + nz * u) for u, v in rrect(hu, hv, min(hu, hv) * 0.35)])
    hull(mb, loops, caps=(False, False))


def deck_plan() -> list[tuple[float, float, float, float]]:
    """The steel deck as rectangles (x0, y0, x1, y1) round its two openings."""
    (vx, vy), (sx, sy) = OPENING, STAGE2_OPENING
    cx, cy = STAGE2_STAND
    holes = ((-vx, -vy, vx, vy), (cx - sx, cy - sy, cx + sx, cy + sy))
    xs = sorted({DECK_NORTH, DECK_SOUTH, *(h[0] for h in holes), *(h[2] for h in holes)})
    ys = sorted({*DECK_Y, *(h[1] for h in holes), *(h[3] for h in holes)})
    out = []
    for ya, yb in zip(ys, ys[1:]):
        run = None  # cells of one row are joined along X, so the deck is a few long plates
        for xa, xb in zip(xs, xs[1:]):
            mx, my = (xa + xb) / 2, (ya + yb) / 2
            if any(h[0] < mx < h[2] and h[1] < my < h[3] for h in holes):
                if run:
                    out.append(run)
                run = None
            else:
                run = (run[0] if run else xa, ya, xb, yb)
        if run:
            out.append(run)
    return out


def build(parts: Parts) -> None:
    g = "LaunchStand"
    parts.node(g, label="Launch stand")
    grey, white, paint = parts(g, "grey", True), parts(g, "white"), parts(g, "deckpaint")
    y0, y1 = STAND_Y
    d0, d1 = DECK_Y

    # ---- the concrete stand: four walls from the footing to the deck, with what is known of its doors and windows
    # (the long walls are in S65-49568 and the Martin handbook's aerial view: plain, with doors at the ground and few
    # openings above; the rooms inside are not recorded, so the doors are shut and the windows dark)
    outline = [(DECK_SOUTH, y0), (STAND_SOUTH, y0), (STAND_SOUTH, y1), (DECK_SOUTH, y1)]
    walls = ring(outline, 1.5)
    doors = {0: [(20.0, 26.0), (118.0, 124.0)], 2: [(30.0, 36.0), (150.0, 156.0)]}  # along each long wall, from its start
    lights = {0: [(60.0, 66.0), (86.0, 92.0)], 2: [(70.0, 76.0), (110.0, 116.0)]}
    for i, w in enumerate(walls):
        holes = sorted(
            [(a, b, GROUND, GROUND + 7.0) for a, b in doors.get(i, [])]
            + [(a, b, s + 3.5, s + 6.5) for a, b in lights.get(i, []) for s in STOREYS[1:]]
        )
        # (openings in order along the wall; two at one place, one over the other, are cut as one tall slot and filled between)
        spans = sorted({(a, b) for a, b, _, _ in holes})
        cuts = []
        for a, b in spans:
            mine = sorted((lo, hi) for aa, bb, lo, hi in holes if (aa, bb) == (a, b))
            cuts.append((a, b, mine[0][0], mine[-1][1]))
            for (_, hi), (lo, _) in zip(mine, mine[1:]):
                w.box(white, a, b, 0.0, w.thick, hi, lo)
        w.build(white, FOOTING, -DECK_T, cuts)
        for k, (a, b) in enumerate(doors.get(i, [])):
            wall_door(parts, f"{g}_Door{i}{k}", g, w, a, b, GROUND, GROUND + 7.0, depth=0.5, mat="blast", works=False)
        for a, b in lights.get(i, []):
            for s in STOREYS[1:]:
                window(parts, g, w, a, b, s + 3.5, s + 6.5, mullions=[(a + b) / 2], pane="void")
    # its roof is the deck: a slab the walls carry, painted
    box(paint, (DECK_SOUTH, y0, -DECK_T), (STAND_SOUTH, y1, 0.0))
    # its joints: the concrete is laid in bays (S65-20994, S65-20641: lines across the deck; their spacing is estimated)
    joints = parts(g, "joint")
    bays = [DECK_SOUTH + 24.0 * k for k in range(1, int((STAND_SOUTH - DECK_SOUTH) / 24.0) + 1)]
    for x in bays:
        box(joints, (x - 0.08, y0 + 0.7, 0.0), (x + 0.08, y1 - 0.7, 0.008))
    for xa, xb in zip([DECK_SOUTH, *bays], [*bays, STAND_SOUTH]):
        box(joints, (xa + 0.3, 11.92, 0.0), (xb - 0.3, 12.08, 0.008))
    # a pilaster on each long wall where nothing else is: the walls are not one plane 244 ft long (S65-49568 has
    # the east wall in bays; where each stands is estimated)
    for yw, side, at in ((y0, -1, (28, 124, 148, 172, 196, 220, 244)), (y1, 1, (28, 52, 124, 172, 196, 244))):
        for x in at:
            ya, yb = sorted((yw - side * 0.05, yw + side * 0.6))
            box(white, (x - 1.0, ya, FOOTING), (x + 1.0, yb, -DECK_T - 0.03))
    # a kerb along each long edge (the pipe rails stand on it)
    for y in (y0, y1 - 0.6):
        box(white, (DECK_SOUTH + 0.1, y, -0.5), (STAND_SOUTH - 0.1, y + 0.6, 0.5))

    # ---- the steel launch deck round the two openings, on its columns
    for xa, ya, xb, yb in deck_plan():
        box(grey, (xa, ya, -DECK_T), (xb, yb, 0.0))
    rows = (DECK_NORTH + 1.0, -27.0, -12.5, DECK_SOUTH - 2.0)
    cols = [(x, y) for x in rows for y in (d0 + 1.0, -13.5, 14.5, 26.0, d1 - 1.0)]
    for x, y in cols:
        box(grey, (x - 0.6, y - 0.6, FOOTING), (x + 0.6, y + 0.6, -DECK_T))
    for x in rows:  # girders under the deck, across the stand
        box(grey, (x - 0.5, d0 + 0.3, -DECK_T - 2.2), (x + 0.5, d1 - 0.3, -DECK_T - 0.05))
    for y in (d0 + 1.0, d1 - 1.0):  # and along its two edges, with the bracing the photographs show under them
        box(grey, (DECK_NORTH + 0.3, y - 0.45, -DECK_T - 1.8), (DECK_SOUTH - 0.3, y + 0.45, -DECK_T - 0.1))
        for xa, xb in zip(rows, rows[1:]):
            beam(grey, (xa, y, APRON + 0.5), (xb, y, -DECK_T - 2.0), 0.5)
            beam(grey, (xb, y, APRON + 0.5), (xa, y, -DECK_T - 2.0), 0.5)
    # a working floor under the deck, between the ducts and the walls (S65-49568: two floors of equipment under the steel)
    mid = (APRON - DECK_T) / 2
    for ya, yb in ((d0 + 0.4, -12.9), (13.9, 26.6)):
        box(parts(g, "deck"), (-27.0, ya, mid - 0.25), (DECK_SOUTH, yb, mid))

    # ---- the two flame ducts, and the grey wall their outlets stand in
    ducts = parts(g, "duct", True)
    duct(ducts, 0.0, OPENING, 0.0, (10.0, 7.5), -DECK_T)
    duct(ducts, STAGE2_STAND[1], STAGE2_OPENING, STAGE2_STAND[0], (6.5, 7.0), -DECK_T)
    xw = DECK_NORTH + 8.0  # the wall's face: the outlets' lips stand two feet proud of it
    s2 = STAGE2_STAND[1]
    for ya, yb in ((d0 + 1.6, -10.8), (10.8, s2 - 7.3), (s2 + 7.3, d1 - 1.6)):
        box(grey, (xw, ya, APRON), (xw + 0.5, yb, -DECK_T - 2.2))
    for (ya, yb), top in (((-10.8, 10.8), APRON + 17.3), ((s2 - 7.3, s2 + 7.3), APRON + 16.3)):
        box(grey, (xw, ya, top), (xw + 0.5, yb, -DECK_T - 2.2))
        box(grey, (xw, ya, APRON), (xw + 0.5, yb, APRON + 1.0))
    # the floor under the deck: the head of the flume's apron
    box(parts(g, "concrete"), (DECK_NORTH - 4.0, d0 - 2.0, FOOTING), (DECK_SOUTH, d1 + 2.0, APRON))

    # ---- rails round the deck, open where the stairs and the erector's foot are
    rail = parts(g, "grey/rails", True)
    handrail(rail, [(DECK_SOUTH, d0 + 0.2, 0.0), (DECK_NORTH + 0.2, d0 + 0.2, 0.0), (DECK_NORTH + 0.2, d1 - 0.2, 0.0), (DECK_SOUTH, d1 - 0.2, 0.0)])
    for y in (y0 + 0.3, y1 - 0.3):
        handrail(rail, [(DECK_SOUTH, y, 0.5), (STAIR_X[0] - 0.2, y, 0.5)])
        handrail(rail, [(STAIR_X[0] + STAIR_W + 0.6, y, 0.5), (STAND_SOUTH - 0.3, y, 0.5)])
    for (vx, vy), (cx, cy) in ((OPENING, (0.0, 0.0)), (STAGE2_OPENING, STAGE2_STAND)):  # a kerb round each opening
        for xa, ya, xb, yb in (
            (cx - vx - 0.4, cy - vy - 0.4, cx + vx + 0.4, cy - vy),
            (cx - vx - 0.4, cy + vy, cx + vx + 0.4, cy + vy + 0.4),
            (cx - vx - 0.4, cy - vy, cx - vx, cy + vy),
            (cx + vx, cy - vy, cx + vx + 0.4, cy + vy),
        ):
            box(grey, (xa, ya, 0.0), (xb, yb, 0.5))

    # ---- the erector's footing: a pedestal under each end of its hinge, and the locks its north legs came down on to
    # ("the leg lock-unlock circuits" were what stopped Gemini IV's erector 12 degrees from the vehicle: its mission report)
    for s in (-1, 1):
        box(grey, (HINGE[0] - 1.45, s * 11.75 - 0.95, 0.0), (HINGE[0] + 0.45, s * 11.75 + 0.95, HINGE[1] - 0.85))
        box(grey, (HINGE[0] - 18.5 + 0.1, s * 11.75 - 0.9, 0.0), (HINGE[0] - 18.5 + 1.4, s * 11.75 + 0.9, 0.35))

    # ---- a stair down each long wall, from the deck to the land, in three flights (S65-49568 has the east one;
    # S65-43447 a steel stair off the deck's north-west corner, which is not built: this one is put in its place)
    steps, strail = parts(g, "deck/stairs"), parts(g, "grey/stairrails", True)
    for side, yw in ((-1, y0), (1, y1)):
        ya = yw + side * (0.25 + STAIR_W / 2)  # the walking line, beside the wall
        xs, flights = STAIR_X[0], 3
        drop = -GROUND / flights
        length = (STAIR_X[1] - STAIR_X[0] - STAIR_W) / flights
        # the head landing: out of the deck through the gap in its rail
        box(steps, (xs, min(yw, yw + side * (STAIR_W + 0.5)), -0.25), (xs + STAIR_W + 0.4, max(yw, yw + side * (STAIR_W + 0.5)), 0.0))
        x = xs + STAIR_W + 0.4
        for k in range(flights):
            top, low = -k * drop, -(k + 1) * drop
            run = length - (STAIR_W if k < flights - 1 else 0.0)
            stairs(steps, (x + run, ya, low), (x, ya, top), STAIR_W)
            stair_rails(strail, (x + run, ya, low), (x, ya, top), STAIR_W)
            if k < flights - 1:  # a landing, bracketed off the wall
                box(
                    steps, (x + run, min(yw, yw + side * (STAIR_W + 0.5)), low - 0.25), (x + run + STAIR_W, max(yw, yw + side * (STAIR_W + 0.5)), low)
                )
                for xb in (x + run + 0.3, x + run + STAIR_W - 0.3):
                    beam(strail, (xb, yw, low - 2.6), (xb, yw + side * (STAIR_W + 0.3), low - 0.3), 0.3)
                handrail(strail, [(x + run, yw + side * (STAIR_W + 0.4), low), (x + run + STAIR_W, yw + side * (STAIR_W + 0.4), low)])
            x += run + STAIR_W
        handrail(strail, [(xs, yw + side * (STAIR_W + 0.4), 0.0), (xs + STAIR_W + 0.4, yw + side * (STAIR_W + 0.4), 0.0)])
        handrail(strail, [(xs + 0.1, yw + side * 0.3, 0.0), (xs + 0.1, yw + side * (STAIR_W + 0.4), 0.0)])

    # ---- what is painted and let into the concrete deck (S65-20994): red-brown hatch plates, yellow marks
    plates, marks = parts(g, "plate"), parts(g, "yellow")
    for x, y in ((40.0, 6.0), (40.0, 30.0), (95.0, -8.0), (150.0, 20.0)):
        box(plates, (x - 3.0, y - 2.5, 0.0), (x + 3.0, y + 2.5, 0.03))
    for x, y in ((30.0, 12.0), (30.0, 22.0), (48.0, 16.0)):
        box(marks, (x - 0.4, y - 1.2, 0.0), (x + 0.4, y + 1.2, 0.012))


def thrust_mount(parts: Parts) -> None:
    """The thrust mount: the first stage was lowered "until its four longerons rest on the four 'A-frame' thrust mounts.
    The longerons are attached with four 1-3/8-inch diameter bolts" (the handbook, ch. 4), and let go at liftoff "by
    explosive charges shearing eight nuts on four studs" (its countdown): documented. Each is built as two box legs raking out from its head to the
    deck either side of the opening, tied to its neighbours part-way up: their form is read off S65-43447 and
    S65-49568, where the eight legs stand as a grey cone 19 ft across at the deck."""
    g = "ThrustMount"
    parts.node(g, label="Thrust mount")
    a_frames(parts(g, "grey", True), parts(g, "black", True), (0.0, 0.0), MOUNT_HEAD, MOUNT_TOP, (OPENING[0] + 1.6, OPENING[1] + 1.5))


def a_frames(grey, dark, at: tuple[float, float], h: float, top: float, feet: tuple[float, float]) -> None:
    """Four A-frames about `at`: their heads `h` from it on the diagonals at height `top`, their feet on the lines
    `feet` (along X, along Y) either side of the opening."""
    cx, cy = at
    fx, fy = feet
    for sx in (-1, 1):
        for sy in (-1, 1):
            head = Vector((cx + sx * h, cy + sy * h, top - 1.0))
            for foot_at in (Vector((cx + sx * fx, cy + sy * (h - 2.6), 0.0)), Vector((cx + sx * (h - 2.6), cy + sy * fy, 0.0))):
                d = (head - foot_at).normalized()
                side = d.cross(Vector((0, 0, 1))).normalized()
                obox(grey, tuple((foot_at + head) / 2), tuple(d), tuple(side.cross(d)), ((head - foot_at).length, 1.3, 1.1))
                box(grey, (foot_at.x - 1.2, foot_at.y - 1.2, 0.0), (foot_at.x + 1.2, foot_at.y + 1.2, 0.3))  # its shoe on the deck
            # the head: a block the longeron's foot sat on, and the bolt's housing under it
            box(grey, (head.x - 0.9, head.y - 0.9, top - 1.5), (head.x + 0.9, head.y + 0.9, top))
            box(dark, (head.x - 0.3, head.y - 0.3, top - 2.3), (head.x + 0.3, head.y + 0.3, top - 1.52))
    for k in range(4):  # the ties between the four heads
        (ax, ay), (bx, by) = [(-1, -1), (1, -1), (1, 1), (-1, 1)][k], [(1, -1), (1, 1), (-1, 1), (-1, -1)][k]
        beam(grey, (cx + ax * h, cy + ay * h, top - 0.9), (cx + bx * h, cy + by * h, top - 0.9), 0.7)


def ramp(parts: Parts) -> None:
    """The ramp: earth heaped to the stand's height and paved, falling to the land over 200 ft. "The stage trailer
    rolled up the long ramp" (SP-4203); its length is the nomination's 450 ft less the stand, its line and width are
    read off imagery of what is left, and its batter is the earth's own, taken as one in two: estimated."""
    g = "Ramp"
    parts.node(g, label="Ramp")
    earth, road = parts(g, "earth", True), parts(g, "concrete")
    y0, y1 = STAND_Y
    r0, r1 = RAMP_ROAD

    def top(x: float) -> float:
        return 0.0 if x <= STAND_SOUTH else GROUND * (x - STAND_SOUTH) / (RAMP_FOOT - STAND_SOUTH)

    def edges(x: float) -> tuple[float, float]:
        s = min(1.0, max(0.0, (x - STAND_SOUTH) / (RAMP_TAPER - STAND_SOUTH)))
        return y0 + (r0 - y0) * s, y1 + (r1 - y1) * s

    stations = [STAND_SOUTH, STAND_SOUTH + 15.0, RAMP_TAPER, STAND_SOUTH + 110.0, STAND_SOUTH + 165.0, RAMP_FOOT, RAMP_FOOT + 12.0]
    loops, paving = [], []
    for x in stations:
        z = top(min(x, RAMP_FOOT))
        a, b = edges(x)
        fall = (z - GROUND + 1.0) * 2.0
        # the shoulders stand a little under the paving, so that the two are never one face
        loops.append([(x, b + 3.0 + fall, GROUND - 1.0), (x, b + 3.0, z - 0.35), (x, a - 3.0, z - 0.35), (x, a - 3.0 - fall, GROUND - 1.0)])
        paving.append((x, a, b, z))
    hull(earth, loops, caps=(False, True))
    for (xa, a0, b0, za), (xb, a1, b1, zb) in zip(paving, paving[1:]):
        if xa >= RAMP_FOOT:
            break
        v = [
            P(xa, a0, za),
            P(xb, a1, zb),
            P(xb, b1, zb),
            P(xa, b0, za),
            P(xa, a0, za - 1.0),
            P(xb, a1, zb - 1.0),
            P(xb, b1, zb - 1.0),
            P(xa, b0, za - 1.0),
        ]
        road.add(
            [tuple(p) for p in v],
            [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (3, 2, 6, 7), (1, 5, 6, 2), *([] if xa == STAND_SOUTH else [(0, 3, 7, 4)])],
        )
