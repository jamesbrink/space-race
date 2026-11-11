"""The blockhouse pads 5 and 6 shared, and the ready-room building beside it.

What is published (see ../lc-5.md): built 1955; "identical reinforced-concrete structures shaped
like arrows facing their pads" (it and Complex 26's); "two rooms facing diagonally", one firing room
to each pad; ready rooms, kitchen and office in a concrete-block building with a tar-and-gravel
roof, joined to it by a breezeway roof (NHL nomination 84003872, item 7). Of Complex 26's, its
twin, the museum gives: walls two feet thick; a domed roof five feet thick at the edges and nearly
eight overhead; windows of three segments of glass, each fifteen quarter-inch layers, about a foot
thick in all; a double set of armour-plate blast doors.

The plan is OpenStreetMap's outline of the surviving building. Everything else is read off two
photographs taken from pad 6's gantry and the blockhouse roof in July 1961 (FHSU Project Mercury
collection, F16_016 and F16_015) and off the building as it stands (Wikimedia Commons, 2005 and
2010): heights, the windows' sizes and places, the door, the roof's equipment, the paving. All
of that is estimated.

Local frame: u from the arrow's point back along its axis (the site's +X), v across (the site's +Y).
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from srlib import FT, TAU, interior

from .site import (
    BLOCKHOUSE_HALF,
    BLOCKHOUSE_LENGTH,
    BLOCKHOUSE_TIP,
    FOOTING,
    GROUND,
    P,
    Parts,
    axes,
    beam,
    box,
    ear_clip,
    fine,
    ftp,
    handrail,
    lamp_head,
    obox,
    offset_poly,
    plate,
    ring,
    slab,
    wall_door,
    window,
)

WALL = 2.0  # documented, of Complex 26's
EAVE = 15.0  # the walls' top: F16_016, against the pickup beside it (14 to 17 ft)
ROOF_EDGE, CROWN = 15.6, 18.6  # the roof's rise is the published three feet of extra thickness overhead
FLOOR = 0.25
CEILING = EAVE - 5.0  # five feet of roof at the edge
APRON = -0.6  # the shell paving round the buildings: a step below the concrete
NOSE = BLOCKHOUSE_HALF  # the point is a right angle, so it is as long as the building is half wide
# the windows in each diagonal face, feet from the point: one pane, then a pair (F16_016; the 2010 photograph)
WINDOWS = ((5.0, 10.0), (16.5, 25.25))
SILL, HEAD = 4.4, 8.9
DOOR = (29.5, 36.5)  # the blast door in the back wall, feet from its pad 6 corner (2005 photograph)
DOOR_HEAD = FLOOR + 7.5
SIDE_DOOR = (4.0, 7.6)  # the door in the pad 6 side's wall, feet from the window face's corner (F16_016)
# the ready rooms: the block building on the pad 6 side, its back wall in line with the blockhouse's
ANNEX = (56.8, 90.0, -59.4, -29.0)  # u0, u1, v0, v1
ANNEX_WALL, ANNEX_EAVE = 0.67, 11.0


def S(u: float, v: float, z: float | None = None) -> tuple:
    """Local feet to site feet."""
    if z is None:
        return (BLOCKHOUSE_TIP[0] + u, BLOCKHOUSE_TIP[1] + v)
    return (BLOCKHOUSE_TIP[0] + u, BLOCKHOUSE_TIP[1] + v, z)


OUTLINE = [
    S(0, 0),
    S(NOSE, -BLOCKHOUSE_HALF),
    S(BLOCKHOUSE_LENGTH, -BLOCKHOUSE_HALF),
    S(BLOCKHOUSE_LENGTH, BLOCKHOUSE_HALF),
    S(NOSE, BLOCKHOUSE_HALF),
]
CENTRE = S(50.0, 0.0)


def roof_z(x: float, y: float, outline) -> float:
    """The dome's height over a point: a parabola from the roof's edge to its crown."""
    best = 1e9
    c = Vector(CENTRE)
    p = Vector((x, y))
    if (p - c).length < 1e-6:
        return CROWN
    for a, b in zip(outline, outline[1:] + outline[:1]):
        a, b = Vector(a), Vector(b)
        # how far along c -> p the outline is crossed
        d, e = p - c, b - a
        den = d.x * e.y - d.y * e.x
        if abs(den) < 1e-9:
            continue
        t = ((a.x - c.x) * e.y - (a.y - c.y) * e.x) / den
        k = ((a.x - c.x) * d.y - (a.y - c.y) * d.x) / den
        if t > 0 and -1e-6 <= k <= 1 + 1e-6:
            best = min(best, t)
    s = min(1.0, 1.0 / best)
    return ROOF_EDGE + (CROWN - ROOF_EDGE) * (1 - s * s)


def build(parts: Parts) -> None:
    g = "Blockhouse"
    parts.node(g)
    conc, steel, frame, glass = parts(g, "bunker"), parts(g, "blast"), parts(g, "frame"), parts(g, "glass")
    walls = ring(OUTLINE, WALL)
    face6, side6, back, side5, face5 = walls

    # ---- the walls, round the six panes and the door
    n = face6.length
    win6 = [(s0, s1, SILL, HEAD) for s0, s1 in WINDOWS]
    win5 = [(n - s1, n - s0, SILL, HEAD) for s0, s1 in reversed(WINDOWS)]
    face6.build(conc, -FOOTING, EAVE, win6)
    face5.build(conc, -FOOTING, EAVE, win5)
    side6.build(conc, -FOOTING, EAVE, [(*SIDE_DOOR, FLOOR, FLOOR + 7.0)])
    side5.build(conc, -FOOTING, EAVE)
    back.build(conc, -FOOTING, EAVE, [(DOOR[0], DOOR[1], FLOOR, DOOR_HEAD)])
    for w, wins in ((face6, win6), (face5, win5)):
        for s0, s1, sill, head in wins:
            # a foot of laminated glass in the middle of the wall, in a steel frame at its outer face
            w.box(glass, s0 + 0.01, s1 - 0.01, 0.5, 1.5, sill + 0.01, head - 0.01)
            w.box(frame, s0 - 0.05, s0 + 0.22, 0.12, 0.5, sill - 0.05, head + 0.05)
            w.box(frame, s1 - 0.22, s1 + 0.05, 0.12, 0.5, sill - 0.05, head + 0.05)
            w.box(frame, s0 + 0.22, s1 - 0.22, 0.12, 0.5, sill - 0.05, sill + 0.22)
            w.box(frame, s0 + 0.22, s1 - 0.22, 0.12, 0.5, head - 0.22, head + 0.05)
            panes = 2 if s1 - s0 > 7 else 1
            if panes == 2:
                m = (s0 + s1) / 2
                w.box(frame, m - 0.16, m + 0.16, 0.14, 0.48, sill + 0.22, head - 0.22)
            # the steel shutters, hinged over each pane and propped open
            for k in range(panes):
                a0 = s0 + (s1 - s0) * k / panes + 0.12
                a1 = s0 + (s1 - s0) * (k + 1) / panes - 0.12
                hinge, out, drop = head + 0.3, 1.9, 1.5
                plate(steel, [w.p(a0, -0.06, hinge), w.p(a1, -0.06, hinge), w.p(a1, -out, hinge - drop), w.p(a0, -out, hinge - drop)], 0.09)
                if fine():
                    for a in (a0 + 0.25, a1 - 0.25):
                        beam(steel, w.p(a, -out + 0.15, hinge - drop + 0.1), w.p(a, 0.05, sill + 0.5), 0.07)
        # the hood over the windows: a ledge cast across the face
        w.box(conc, 3.0, 28.0, -0.55, 0.2, 11.2, 11.55)
        if fine():
            w.box(conc, 3.0, 28.0, -0.2, 0.2, 10.9, 11.21)

    # ---- the floor, the ceiling, and the wall between the two firing rooms
    inner = offset_poly(OUTLINE, -WALL)
    tris = ear_clip(inner)
    floor = parts(g, "concrete/floor")
    floor.add([tuple(P(x, y, FLOOR)) for x, y in inner], tris)
    conc.add([tuple(P(x, y, CEILING)) for x, y in inner], [t[::-1] for t in tris])
    part = parts(g, "bunker/partition")
    for u0, u1 in ((WALL * 1.42, 30.0), (34.0, 58.0)):  # a doorway between the rooms
        box(part, S(u0, -0.33, FLOOR - 0.2), S(u1, 0.33, CEILING + 0.2))
    box(part, S(30.0, -0.33, FLOOR + 7.0), S(34.0, 0.33, CEILING + 0.2))
    for v0, v1 in ((-BLOCKHOUSE_HALF + WALL - 0.2, -3.0), (3.0, 7.0), (15.0, BLOCKHOUSE_HALF - WALL + 0.2)):  # and behind them, the equipment room
        box(part, S(58.0, v0, FLOOR - 0.2), S(58.66, v1, CEILING + 0.2))
    box(part, S(58.0, -3.0, FLOOR + 7.0), S(58.66, 3.0, CEILING + 0.2))
    box(part, S(58.0, 7.0, FLOOR + 7.8), S(58.66, 15.0, CEILING + 0.2))

    # ---- the roof: a slab set in from the walls, domed
    edge = offset_poly(OUTLINE, -1.0)
    per = 6 if fine() else 3
    rim = []
    for a, b in zip(edge, edge[1:] + edge[:1]):
        rim += [(a[0] + (b[0] - a[0]) * k / per, a[1] + (b[1] - a[1]) * k / per) for k in range(per)]
    roof = parts(g, "bunker/roof", True)
    rings = [1.0, 0.86, 0.7, 0.52, 0.34, 0.16] if fine() else [1.0, 0.7, 0.35]

    def dome(i: float, s: float):
        x, y = rim[int(i) % len(rim)]
        x, y = CENTRE[0] + (x - CENTRE[0]) * s, CENTRE[1] + (y - CENTRE[1]) * s
        return P(x, y, ROOF_EDGE + (CROWN - ROOF_EDGE) * (1 - s * s))

    roof.grid(dome, list(range(len(rim))), rings, closed_u=True)
    last = [tuple(dome(i, rings[-1])) for i in range(len(rim))]
    roof.add([*last, tuple(P(*CENTRE, CROWN))], [(i, (i + 1) % len(rim), len(rim)) for i in range(len(rim))])
    for a, b in zip(edge, edge[1:] + edge[:1]):  # its edge, standing on the walls
        conc.add([tuple(P(*a, EAVE - 0.3)), tuple(P(*b, EAVE - 0.3)), tuple(P(*b, ROOF_EDGE)), tuple(P(*a, ROOF_EDGE))], [(0, 1, 2, 3)])

    def on_roof(u: float, v: float, up: float = 0.0) -> tuple:
        x, y = S(u, v)
        return (x, y, roof_z(x, y, edge) + up)

    # ---- the blast door: two leaves of plate, one standing open (so the room can be seen and entered)
    hood = parts(g, "blast/doorframe")
    back.box(hood, DOOR[0] - 0.5, DOOR[1] + 0.5, -0.25, 0.3, DOOR_HEAD - 0.02, DOOR_HEAD + 0.6)
    for s0, s1 in ((DOOR[0] - 0.5, DOOR[0] + 0.08), (DOOR[1] - 0.08, DOOR[1] + 0.5)):
        back.box(hood, s0, s1, -0.2, 0.3, FLOOR - 0.6, DOOR_HEAD - 0.02)
    mid = (DOOR[0] + DOOR[1]) / 2
    for k, (s0, s1, side) in enumerate(((DOOR[0], mid, "s0"), (mid, DOOR[1], "s1"))):  # each leaf its own node, shut
        leaf = f"{g}_BlastDoor{k + 1}"
        wall_door(parts, leaf, g, back, s0, s1, FLOOR, DOOR_HEAD, hinge=side, depth=0.3, thick=0.35)
        if fine():  # its strap hinges
            a0, a1 = (s0 - 0.3, s0 + 2.2) if side == "s0" else (s1 - 2.2, s1 + 0.3)
            for z in (FLOOR + 1.2, FLOOR + 3.7, FLOOR + 6.3):
                back.box(parts(leaf, "blast/straps"), a0, a1, 0.02, 0.2, z - 0.14, z + 0.14)
    # the ramp up to it from the shell
    ramp = parts(g, "concrete/ramp")
    r0, r1 = back.p(DOOR[0] - 1.0, 0, 0), back.p(DOOR[1] + 1.0, 0, 0)
    out = Vector((-back.n.x, -back.n.y, 0)) * 7.0
    a, b = Vector(r0), Vector(r1)
    v = [a + Vector((0, 0, FLOOR)), b + Vector((0, 0, FLOOR)), b + out + Vector((0, 0, APRON - 0.05)), a + out + Vector((0, 0, APRON - 0.05))]
    low = [Vector((q.x, q.y, APRON - 0.6)) for q in v]
    ramp.add([tuple(q * FT) for q in v + low], [(3, 2, 1, 0), (0, 4, 7, 3), (1, 2, 6, 5), (2, 3, 7, 6)])

    # ---- on the walls: floodlights at the corners, conduit and boxes, a second door, the ladder
    grey, lamps = parts(g, "grey", True), parts(g, "lamp", True)
    for w, s in ((face6, 14.0), (face5, face5.length - 14.0), (back, 8.0), (back, 40.0), (side6, 30.0)):
        q = Vector(w.p(s, -0.9, 13.4))
        beam(grey, w.p(s, 0.1, 13.2), tuple(q), 0.14)
        lamp_head(grey, lamps, q + Vector((0, 0, 0.3)), Vector((-w.n.x, -w.n.y, -0.75)), 0.8)
    wall_door(parts, f"{g}_SideDoor", g, side6, *SIDE_DOOR, FLOOR, FLOOR + 7.0, depth=0.2, thick=0.25)  # the plate door on the pad 6 side
    side6.box(parts(g, "blast/doorframe"), SIDE_DOOR[0] - 0.25, SIDE_DOOR[1] + 0.25, -0.15, 0.15, FLOOR + 7.0, FLOOR + 7.35)
    side6.box(parts(g, "concrete/step"), SIDE_DOOR[0] - 0.5, SIDE_DOOR[1] + 0.5, -3.0, 0.0, APRON - 0.5, FLOOR - 0.42)
    for s, zb, size in ((12.0, 3.4, (1.2, 1.8)), (15.5, 3.0, (1.6, 2.4)), (20.5, 3.6, (1.0, 1.2))):  # switch and junction boxes
        side6.box(grey, s, s + size[0], -0.45, 0.1, zb, zb + size[1])
        grey.tube(P(*side6.p(s + size[0] / 2, -0.2, zb + size[1])), P(*side6.p(s + size[0] / 2, -0.2, EAVE + 0.4)), 0.08 * FT, 6)
    # the ladder to the roof on the pad 5 side's wall, near the back (it is there today; in 1961 not seen)
    ls = 8.0
    parts.ladder(g, "roof", side5.p(ls, -0.55, APRON), side5.p(ls, -0.55, ROOF_EDGE), face=(side5.n.x, side5.n.y, 0), mat="grey", width=2.0)
    for z in (5.0, 11.0):
        for ds in (-0.98, 0.98):
            beam(grey, side5.p(ls + ds, -0.55, z), side5.p(ls + ds, 0.1, z), 0.1)
    for ds in (-1.2, 1.2):  # handholds either side of where it lands
        beam(grey, side5.p(ls + ds, 0.3, EAVE - 0.2), side5.p(ls + ds, 0.3, EAVE + 3.4), 0.14)

    # ---- on the roof (F16_016, F16_015): a railed stand of antennas, masts, a wind vane, cables, and
    # the telemetry helix with its mesh reflector, on a tripod held down with sandbags
    rails = parts(g, "white/rails")
    corners = [(34.0, 3.0), (52.0, 3.0), (52.0, 15.0), (34.0, 15.0), (34.0, 5.6)]  # open at one corner
    handrail(rails, [on_roof(u, v) for u, v in corners], 3.3)
    for u, v, h in ((38.0, 6.0, 2.2), (47.0, 11.0, 1.6)):  # equipment boxes in the stand
        x, y, z = on_roof(u, v)
        box(grey, (x - 1.2, y - 0.9, z - 0.3), (x + 1.2, y + 0.9, z + h))
    tx, ty, tz = on_roof(43.0, 8.0)
    for k in range(3):  # a tripod and its mast
        a = TAU * k / 3
        beam(grey, (tx + 2.2 * math.cos(a), ty + 2.2 * math.sin(a), tz - 0.2), (tx, ty, tz + 5.0), 0.14)
    grey.tube(P(tx, ty, tz + 4.6), P(tx, ty, tz + 13.0), 0.06 * FT, 6)
    for z, w_ in ((tz + 9.0, 2.6), (tz + 10.5, 2.2), (tz + 12.0, 1.8)):  # a yagi's elements
        beam(grey, (tx, ty - w_, z), (tx, ty + w_, z), 0.05)
    beam(grey, (tx, ty, tz + 8.6), (tx, ty, tz + 12.4), 0.07)
    wx, wy, wz = on_roof(62.0, -6.0)  # the whip, guyed
    grey.tube(P(wx, wy, wz - 0.2), P(wx, wy, wz + 24.0), 0.045 * FT, 6)
    vx, vy, vz = on_roof(58.0, 9.0)  # the wind vane and its cups
    grey.tube(P(vx, vy, vz - 0.2), P(vx, vy, vz + 9.0), 0.05 * FT, 6)
    beam(grey, (vx - 1.4, vy, vz + 9.0), (vx + 1.4, vy, vz + 9.0), 0.06)
    plate(grey, [(vx - 1.4, vy, vz + 9.06), (vx - 0.6, vy, vz + 9.06), (vx - 0.6, vy, vz + 9.9), (vx - 1.4, vy, vz + 9.9)], 0.03)
    beam(grey, (vx, vy - 1.0, vz + 7.6), (vx, vy + 1.0, vz + 7.6), 0.05)
    for dy in (-1.0, 1.0):
        grey.lathe(ftp([(0.0, -0.14), (0.14, 0.0), (0.0, 0.14)]), 8, matrix=Matrix.Translation(P(vx, vy + dy, vz + 7.6)))
    cable = parts(g, "cable", True)
    for path in (
        [on_roof(12.0, -6.0, 0.08), on_roof(24.0, -2.0, 0.08), on_roof(36.0, 5.0, 0.08), on_roof(42.0, 8.0, 0.1)],
        [on_roof(43.0, 9.0, 0.08), on_roof(52.0, 2.0, 0.08), on_roof(60.0, -8.0, 0.08), on_roof(66.0, -19.0, 0.08), S(66.0, -21.6, EAVE - 2.0)],
    ):
        cable.loft([P(*q) for q in path], [(0.05 * FT, 0.05 * FT)] * len(path), 6, ref=(0, 0, 1))
    # the helix, aimed at pad 5 over the firing room's roof
    hx, hy, hz = on_roof(22.0, 9.0)
    head = Vector((hx, hy, hz + 5.2))
    for k in range(3):
        a = TAU * k / 3 + 0.5
        beam(grey, (hx + 2.6 * math.cos(a), hy + 2.6 * math.sin(a), hz - 0.1), tuple(head), 0.2)
        bx, by = hx + 2.9 * math.cos(a), hy + 2.9 * math.sin(a)
        bag = parts(g, "canvas", True)
        for j, (ox, oy) in enumerate(((0.0, 0.0), (0.7, 0.5))):  # sandbags on each foot
            bz = roof_z(bx + ox, by + oy, edge)
            bag.lathe(
                ftp([(0.0, -0.05), (0.75, 0.05), (0.95, 0.3), (0.7, 0.55), (0.0, 0.62)]),
                10,
                matrix=Matrix.Translation(P(bx + ox, by + oy, bz + 0.32 * j))
                @ Matrix.Rotation(a + j, 4, "Z")
                @ Matrix.Diagonal((1.0, 0.6, 1.0, 1.0)),
            )
    grey.lathe(ftp([(0.0, -0.5), (0.5, -0.5), (0.5, 0.5), (0.0, 0.5)]), 10, matrix=Matrix.Translation(head * FT))
    aim = (Vector((0.0, 0.0, 40.0)) - head).normalized()  # at the vehicle on pad 5
    aim = (aim + Vector((0, 0, 0.25))).normalized()
    t1 = Vector((0, 0, 1)).cross(aim).normalized()
    t2 = aim.cross(t1)
    boom0, boom1 = head + aim * 0.4, head + aim * 9.5
    grey.tube(boom0 * FT, boom1 * FT, 0.13 * FT, 8)
    white = parts(g, "white/helix", True)
    turns, steps = 5, 14 if fine() else 8
    path = []
    for k in range(turns * steps + 1):
        a = TAU * k / steps
        path.append((head + aim * (1.6 + 7.4 * k / (turns * steps)) + (t1 * math.cos(a) + t2 * math.sin(a)) * 1.25) * FT)
    white.loft(path, [(0.07 * FT, 0.07 * FT)] * len(path), 6, ref=tuple(aim), resample=1)
    for k in range(turns):  # the helix's stand-offs
        a = TAU * 0.25
        q = head + aim * (1.6 + 7.4 * (k + 0.25) / turns)
        beam(grey, tuple(q), tuple(q + (t1 * math.cos(a) + t2 * math.sin(a)) * 1.25), 0.06)
    mesh = parts(g, "mesh")
    c = head + aim * 1.3
    octagon = [c + (t1 * math.cos(TAU * (k + 0.5) / 8) + t2 * math.sin(TAU * (k + 0.5) / 8)) * 3.3 for k in range(8)]
    mesh.add([tuple(q * FT) for q in octagon], [tuple(range(8))])
    for k in range(8):
        beam(white, tuple(octagon[k]), tuple(octagon[(k + 1) % 8]), 0.1)
    for k in range(4):
        beam(white, tuple(octagon[k]), tuple(octagon[k + 4]), 0.08)

    # ---- inside: each firing room's consoles facing its windows, racks behind (not documented)
    if interior():
        con, dark, lit = parts(g, "console"), parts(g, "interior"), parts(g, "lamp/room")
        for w in (face6, face5):
            back_dir = Vector((w.n.x, w.n.y, 0))
            for k in range(3):
                s = 10.5 + k * 6.2
                c = Vector(w.p(s + 2.6, WALL + 5.2, 0))
                obox(con, (c.x, c.y, FLOOR + 1.45), (w.u.x, w.u.y, 0), (0, 0, 1), (5.2, 2.6, 2.9))  # the desk
                top = c - back_dir * 0.35
                slope = (back_dir + Vector((0, 0, 0.75))).normalized()  # its panel, sloping up and away from the operator
                obox(dark, (top.x, top.y, FLOOR + 3.5), (w.u.x, w.u.y, 0), tuple(slope.cross(Vector((w.u.x, w.u.y, 0)))), (5.0, 1.6, 0.25))
                seat = c + back_dir * 2.6
                box(dark, (seat.x - 0.75, seat.y - 0.75, FLOOR), (seat.x + 0.75, seat.y + 0.75, FLOOR + 1.5))
        for v in (-1, 1):  # recorder racks along the wall between the rooms
            for k in range(5):
                box(con, S(36.0 + k * 2.1, v * 0.34, FLOOR), S(38.0 + k * 2.1, v * 2.3, FLOOR + 6.4))
                box(dark, S(36.2 + k * 2.1, v * 2.3, FLOOR + 3.4), S(37.8 + k * 2.1, v * 2.36, FLOOR + 6.0))
        for u in (60.5, 70.0, 79.0):  # the equipment room: relay racks in rows
            box(con, S(u, -16.0, FLOOR), S(u + 2.0, -4.0, FLOOR + 7.0))
            box(con, S(u, 2.0, FLOOR), S(u + 2.0, 8.0, FLOOR + 7.0))
        for u, v in ((16.0, -8.0), (16.0, 8.0), (30.0, -12.0), (30.0, 12.0), (46.0, -12.0), (46.0, 12.0), (72.0, -8.0), (72.0, 12.0)):
            box(lit, S(u - 2.0, v - 0.5, CEILING - 0.3), S(u + 2.0, v + 0.5, CEILING + 0.1))

    annex(parts)
    paving(parts)


def annex(parts: Parts) -> None:
    """The ready rooms, kitchen and office: concrete block, a flat tar roof, and a roof across to
    the blockhouse (NHL nomination). Its plan is the rest of OpenStreetMap's outline; its height,
    pilasters, door and vent are F16_016's; its other windows and all of its inside are estimated."""
    g = "ReadyRoom"
    parts.node(g)
    u0, u1, v0, v1 = ANNEX
    outline = [S(u0, v0), S(u1, v0), S(u1, v1), S(u0, v1)]
    block, tar, frame = parts(g, "block"), parts(g, "tar"), parts(g, "frame")
    far, rear, breeze, pads = ring(outline, ANNEX_WALL)  # v0 side, the back (u1), the breezeway side, the side toward the pads
    far.build(block, -FOOTING, ANNEX_EAVE, [(6.0, 10.5, 3.6, 7.2), (14.0, 17.2, FLOOR, FLOOR + 7.0), (21.0, 28.0, 3.6, 7.2)])
    rear.build(block, -FOOTING, ANNEX_EAVE, [(5.0, 11.0, 3.6, 7.2), (19.0, 25.0, 3.6, 7.2)])
    breeze.build(block, -FOOTING, ANNEX_EAVE, [(18.0, 21.4, FLOOR, FLOOR + 7.0)])
    pads.build(block, -FOOTING, ANNEX_EAVE, [(4.0, 8.5, 7.0, 9.4)])
    window(parts, g, far, 6.0, 10.5, 3.6, 7.2, mullions=[8.25])
    window(parts, g, far, 21.0, 28.0, 3.6, 7.2, mullions=[23.33, 25.67])
    window(parts, g, rear, 5.0, 11.0, 3.6, 7.2, mullions=[7.0, 9.0])
    window(parts, g, rear, 19.0, 25.0, 3.6, 7.2, mullions=[21.0, 23.0])
    # the vent toward the pads: louvres in a frame
    pads.box(frame, 3.9, 4.1, 0.1, 0.5, 6.9, 9.5)
    pads.box(frame, 8.4, 8.6, 0.1, 0.5, 6.9, 9.5)
    for k in range(6):
        z = 7.1 + k * 0.4
        plate(frame, [pads.p(4.05, 0.05, z + 0.3), pads.p(8.45, 0.05, z + 0.3), pads.p(8.45, 0.5, z), pads.p(4.05, 0.5, z)], 0.05)
    # doors: one to the drive, one under the breezeway; each leaf its own node, shut
    wall_door(parts, f"{g}_Door1", g, far, 14.0, 17.2, FLOOR, FLOOR + 7.0, depth=0.28)
    wall_door(parts, f"{g}_Door2", g, breeze, 18.0, 21.4, FLOOR, FLOOR + 7.0, depth=0.28)
    # pilasters, as the photograph shows them, and a plinth course
    for x, y in outline:  # a pier at each corner
        box(block, (x - 0.62, y - 0.62, -FOOTING + 0.5), (x + 0.62, y + 0.62, ANNEX_EAVE - 0.05))
    for w in (far, rear, breeze, pads):
        for s in (w.length / 3, 2 * w.length / 3):
            if w is far and 12.0 < s < 19.0 or w is breeze and 17.0 < s < 22.5:
                continue
            w.box(block, s - 0.5, s + 0.5, -0.22, 0.2, -FOOTING + 0.5, ANNEX_EAVE - 0.05)
    # the roof, oversailing; tar and gravel on top
    slab(block, offset_poly(outline, 0.9), ANNEX_EAVE, ANNEX_EAVE + 0.75, bottom=True)
    slab(tar, offset_poly(outline, 0.6), ANNEX_EAVE + 0.7, ANNEX_EAVE + 1.0)
    floor = parts(g, "concrete/floor")
    inner = offset_poly(outline, -ANNEX_WALL)
    floor.add([tuple(P(x, y, FLOOR)) for x, y in inner], ear_clip(inner))
    # the breezeway roof across to the blockhouse, on a beam and two pipe columns
    bz = ANNEX_EAVE - 0.6
    box(block, S(u0 + 6.0, v1 - 0.3, bz), S(u1 - 1.0, -BLOCKHOUSE_HALF + 0.4, bz + 0.5))
    box(tar, S(u0 + 6.3, v1 - 0.1, bz + 0.45), S(u1 - 1.3, -BLOCKHOUSE_HALF + 0.2, bz + 0.75))
    grey = parts(g, "grey", True)
    # the air handler behind it, on a stand between the buildings (F16_016)
    box(grey, S(u1 - 9.0, v1 + 0.9, 4.0), S(u1 - 1.5, -BLOCKHOUSE_HALF - 0.9, 9.2))
    for u in (u1 - 8.6, u1 - 1.9):
        for v in (v1 + 1.3, -BLOCKHOUSE_HALF - 1.3):
            beam(grey, S(u, v, APRON - 0.3), S(u, v, 4.0), 0.3)
    if fine():
        for k in range(8):
            z = 4.6 + k * 0.5
            plate(
                frame,
                [
                    S(u1 - 1.45, v1 + 1.2, z + 0.3),
                    S(u1 - 1.45, -BLOCKHOUSE_HALF - 1.2, z + 0.3),
                    S(u1 - 1.2, -BLOCKHOUSE_HALF - 1.2, z),
                    S(u1 - 1.2, v1 + 1.2, z),
                ],
                0.04,
            )
    lamps = parts(g, "lamp", True)
    for w, s in ((far, 4.0), (far, 30.0), (pads, 15.0)):
        q = Vector(w.p(s, -0.8, 9.6))
        beam(grey, w.p(s, 0.1, 9.4), tuple(q), 0.12)
        lamp_head(grey, lamps, q + Vector((0, 0, 0.3)), Vector((-w.n.x, -w.n.y, -0.8)), 0.7)
    if interior():  # a wall across, a table and benches, lockers, a counter
        dark, con, plank = parts(g, "interior"), parts(g, "console"), parts(g, "plank")
        um = (u0 + u1) / 2
        for a, b in ((v0 + ANNEX_WALL - 0.1, v0 + 12.0), (v0 + 15.5, v1 - ANNEX_WALL + 0.1)):
            box(block, S(um - 0.25, a, FLOOR - 0.2), S(um + 0.25, b, ANNEX_EAVE - 0.1))
        box(block, S(um - 0.25, v0 + 12.0, FLOOR + 7.0), S(um + 0.25, v0 + 15.5, ANNEX_EAVE - 0.1))
        box(plank, S(u0 + 4.0, v0 + 9.0, FLOOR + 2.3), S(u0 + 12.0, v0 + 12.2, FLOOR + 2.5))
        for u in (u0 + 4.4, u0 + 11.4):
            box(dark, S(u, v0 + 9.4, FLOOR), S(u + 0.25, v0 + 11.8, FLOOR + 2.3))
        for v in (v0 + 7.2, v0 + 12.9):
            box(plank, S(u0 + 4.0, v, FLOOR + 1.3), S(u0 + 12.0, v + 1.0, FLOOR + 1.45))
            for u in (u0 + 4.5, u0 + 11.3):
                box(dark, S(u, v + 0.2, FLOOR), S(u + 0.2, v + 0.8, FLOOR + 1.3))
        for k in range(6):
            box(con, S(um - 1.8, v0 + 17.0 + k * 1.6, FLOOR), S(um - 0.26, v0 + 18.5 + k * 1.6, FLOOR + 6.0))
        box(con, S(u1 - 3.2, v0 + 12.0, FLOOR), S(u1 - ANNEX_WALL, v0 + 22.0, FLOOR + 3.0))  # the kitchen's counter
        box(parts(g, "trailer"), S(u1 - 3.4, v0 + 23.0, FLOOR), S(u1 - ANNEX_WALL - 0.1, v0 + 25.6, FLOOR + 5.4))  # and refrigerator


def paving(parts: Parts) -> None:
    """Round the buildings: crushed shell, a concrete walk along the window faces, and the posts
    along the drive's edge, banded black and white (F16_016)."""
    g = "Blockhouse"
    shell, conc = parts(g, "shell"), parts(g, "concrete/walk")
    hx = BLOCKHOUSE_HALF
    apron = [S(-15.0, -30.0), S(8.0, -80.0), S(126.0, -80.0), S(126.0, 36.0), S(8.0, 36.0), S(-15.0, 30.0)]
    slab(shell, apron, GROUND - 0.6, APRON, spread=3.6)
    walk = [S(0, 0), S(NOSE, hx), S(NOSE - 3.9, hx + 3.9), S(-7.8, 0), S(NOSE - 3.9, -hx - 3.9), S(NOSE, -hx)]
    slab(conc, walk, -FOOTING, 0.0)
    # the tracking dish on its own slab at the point (F16_016, lower left): a mesh bowl on a pedestal
    box(conc, S(-14.0, -5.0, -FOOTING), S(-8.2, 5.0, -0.04))
    grey, mesh = parts(g, "grey", True), parts(g, "mesh")
    dx, dy = S(-11.0, 0.0)
    grey.tube(P(dx, dy, -0.1), P(dx, dy, 4.2), 0.25 * FT, 8)
    for k in range(3):
        a = TAU * k / 3
        beam(grey, (dx + 2.0 * math.cos(a), dy + 2.0 * math.sin(a), -0.02), (dx, dy, 2.6), 0.12)
    aim = Vector((-0.55, 0.45, 0.7)).normalized()
    mesh.lathe(
        ftp([(0.15, 0.0), (1.2, 0.12), (2.3, 0.45), (3.2, 0.95)]),
        16,
        matrix=axes((dx + aim.x * 0.6, dy + aim.y * 0.6, 4.4 + aim.z * 0.6), Vector((0, 0, 1)).cross(aim), aim),
    )
    beam(grey, (dx, dy, 4.2), (dx + aim.x * 2.6, dy + aim.y * 2.6, 4.4 + aim.z * 2.6), 0.08)
    # posts along the drive: at the paving's back edge and its pad 6 side
    posts = [S(128.0, v) for v in range(-76, 37, 14)] + [S(u, -82.0) for u in range(14, 127, 14)]
    black, white = parts(g, "black/posts", True), parts(g, "white/posts", True)
    for x, y in posts:
        for k in range(6):
            (white if k % 2 else black).tube(
                P(x, y, GROUND - 1.0 if k == 0 else GROUND + k * 0.7), P(x, y, GROUND + (k + 1) * 0.7), 0.17 * FT, 8, caps=k in (0, 5)
            )
