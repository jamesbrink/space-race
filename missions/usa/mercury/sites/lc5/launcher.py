"""The launcher: the Redstone launch ring, a table about 10 ft across on four legs, standing on the
scale plate over a four-sided flame deflector. The vehicle stood free on four pads under its fins:
no hold-down arms (TM X-53107 4.2.4). Its two tail plugs, a 60-pin control connector and a 4-pin
power connector with a ground strap, sat on the ring under fin II and pulled out as it rose
(Figure 4-25). Two heavy cables run from the ring across the pad.

Sizes are estimated: S63-02651 (MR-4 at ignition) gives a table about 10 ft across and support
pads 4.9 to 6.0 ft up; S61-02408 and 6100884 show the legs, struts and splayed feet. The
four-sided deflector is NASA SP-4204, ch. 2-4 (secondary); its size is not known.
"""

from __future__ import annotations

import math

from mathutils import Vector

from srlib import FT, TAU

from .site import LAUNCHER_TOP, RAIL_TOP, P, Parts, axes, beam, box, fine, ftp, obox, plate

RING_R = (3.05, 5.0)  # the table's opening and its outside: about 10 ft across
FOOT_R = 5.5  # where the feet stand, on the scale plate
FIN_II = math.radians(45.0)  # which fin is II is not recorded against the model: the fin at +X +Y is taken


def build(parts: Parts, node: str = "LaunchPedestal", rail_top: float = RAIL_TOP) -> None:
    """The launcher, at the origin. Pad 6's was the same Redstone ring: the scenery builds it under
    another name and moves it there (Parts.shift)."""
    parts.node(node)
    ring, legs = parts(node, "black", True), parts(node, "black/legs")
    defl, fittings, cable = parts(node, "scorched"), parts(node, "grey", True), parts(node, "cable", True)
    z1 = LAUNCHER_TOP
    zr = z1 - 0.95  # the table's underside
    ri, ro = RING_R
    # the table: a deep box section rolled into a ring, with ribs between its flanges
    prof = [(ri, zr), (ro, zr), (ro, zr + 0.12), (ro - 0.15, zr + 0.12), (ro - 0.15, z1 - 0.32), (ro, z1 - 0.32), (ro, z1 - 0.2)]
    ring.lathe(ftp([*prof, (ri, z1 - 0.2), (ri, zr)]), 64)
    if fine():
        for k in range(24):
            a = TAU * (k + 0.5) / 24
            radial = (math.cos(a), math.sin(a), 0)
            obox(ring, (4.865 * radial[0], 4.865 * radial[1], (zr + z1 - 0.2) / 2), radial, (0, 0, 1), (0.13, 0.07, 0.5))  # between the flanges
    # the four pads the fins' bottoms rest on, and the fin clamps beside them (TM X-53107, T-390)
    for i in range(4):
        t = math.radians(45 + 90 * i)
        c, s = math.cos(t), math.sin(t)
        tang = (-s, c, 0)
        obox(fittings, (4.1 * c, 4.1 * s, z1 - 0.1), (c, s, 0), (0, 0, 1), (1.6, 0.9, 0.2))
        for side in (-1, 1):
            obox(fittings, (4.1 * c + side * 0.62 * tang[0], 4.1 * s + side * 0.62 * tang[1], z1 + 0.25), (c, s, 0), (0, 0, 1), (0.9, 0.12, 0.7))
    # four legs, between the fins: a column under the ring, a strut out to a splayed foot
    foot_z = 0.15
    for i in range(4):
        t = TAU * i / 4
        c, s = math.cos(t), math.sin(t)
        top, foot = Vector((4.3 * c, 4.3 * s, zr)), Vector((FOOT_R * c, FOOT_R * s, foot_z + 0.35))
        d = (foot - top).normalized()
        tang = Vector((-s, c, 0))
        obox(legs, (top + foot) / 2, d, tang, ((foot - top).length + 0.3, 0.75, 0.65))
        # a raking strut from the ring's inside edge, and a tie round to the next leg
        beam(legs, (3.3 * c, 3.3 * s, zr + 0.1), tuple(foot + Vector((0, 0, 0.6)) - d * 0.8), 0.4)
        t2 = TAU * (i + 1) / 4
        beam(legs, (5.0 * c, 5.0 * s, 1.6), (5.0 * math.cos(t2), 5.0 * math.sin(t2), 1.6), 0.3)
        # the foot: a jack screw in a pad, for levelling (TM X-53107 L-25: "vertical alignment")
        box(legs, (FOOT_R * c - 0.9, FOOT_R * s - 0.9, foot_z), (FOOT_R * c + 0.9, FOOT_R * s + 0.9, foot_z + 0.22))
        fittings.tube(P(FOOT_R * c, FOOT_R * s, foot_z + 0.2), P(FOOT_R * c, FOOT_R * s, foot_z + 0.9), 0.28 * FT, 12)
        if fine():
            for dx in (-0.68, 0.68):
                for dy in (-0.68, 0.68):
                    fittings.disc(P(FOOT_R * c + dx, FOOT_R * s + dy, foot_z + 0.22), (0, 0, 1), 0.08 * FT, 0.09 * FT, 6)
    # the deflector: four plates meeting in a ridge-topped pyramid under the nozzle
    apex, base, h0 = 3.4, 3.0, 0.16
    corners = [Vector((base * math.cos(TAU * (k + 0.5) / 4), base * math.sin(TAU * (k + 0.5) / 4), h0)) for k in range(4)]
    for k in range(4):
        a, b = corners[k], corners[(k + 1) % 4]
        defl.add([tuple(a * FT), tuple(b * FT), tuple(P(0, 0, apex))], [(0, 1, 2)])
        plate(
            defl,
            [tuple(a + Vector((0, 0, -0.01))), tuple(b + Vector((0, 0, -0.01))), (b.x * 1.08, b.y * 1.08, 0.16), (a.x * 1.08, a.y * 1.08, 0.16)],
            0.05,
        )
        beam(defl, tuple(a), (0, 0, apex - 0.02), 0.22)  # the seams, welded proud
    # the tail plugs under fin II: a housing on the ring with the two connectors' receptacles
    c, s = math.cos(FIN_II), math.sin(FIN_II)
    hx, hy = 4.3 * c - 1.75 * s, 4.3 * s + 1.75 * c  # beside the fin's pad, clear of the fin
    obox(fittings, (hx, hy, z1 + 0.05), (c, s, 0), (0, 0, 1), (1.3, 1.9, 0.5))
    for off, rr in ((-0.45, 0.22), (0.45, 0.13)):  # 60-pin and 4-pin
        fittings.tube(P(hx - s * off, hy + c * off, z1 + 0.3), P(hx - s * off, hy + c * off, z1 + 0.42), rr * FT, 12)
    # the two heavy cables from the ring to the pad, and away across it: WNW to the trench's end, and ESE.
    # Each leaves the ring from a plug, hangs down to the slab, lies on it in easy curves (lifted over
    # the rails' heads), and rises into a receptacle on a junction box. Their routes are estimated;
    # S61-02408 shows heavy black cables lying slack on the slab round the launcher.
    for start, ground, box_at, d in (
        ((4.95, 1.2), [(7.6, 1.9), (13.0, 3.1), (20.0, 2.2), (27.0, 0.4), (33.4, -1.0)], (36.6, -1.4), 1),
        ((-4.95, -1.0), [(-7.8, -1.9), (-15.0, -3.8), (-26.0, -2.6), (-40.0, -4.4), (-52.0, -2.4), (-55.6, -2.0)], (-58.8, -2.0), -1),
    ):
        cable_run(cable, fittings, (start[0], start[1], zr - 0.25), ground, box_at, d, rail_top)


CABLE_R = 0.15  # a heavy ground cable, 3.6 in across (estimated)


def _smooth(points, step: float) -> list:
    """A Catmull-Rom curve through 2D points, sampled about every `step` (site units)."""
    pts = [Vector((x, y)) for x, y in points]
    out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = (pts[max(0, min(len(pts) - 1, k))] for k in (i - 1, i, i + 1, i + 2))
        n = max(1, round((p2 - p1).length / step))
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t**3))
    out.append(pts[-1])
    return out


def cable_run(cable, fittings, start, ground, box_at, d: int, rail_top: float) -> None:
    """One cable: from a plug under the ring at `start` (x, y, z), hanging to the slab at ground[0], along the
    ground through `ground`, up into a receptacle on the junction box at `box_at`, whose face is toward -d (x).
    Where it crosses a rail it rides over the head, at `rail_top`."""
    from .hardstand import rails_x

    r = CABLE_R
    rails = rails_x()

    def rest(x: float) -> float:  # lying on the slab, or carried over a rail's head
        lift = max((max(0.0, 1.0 - abs(x - rx) / 0.8) for rx in rails), default=0.0)
        return r + 0.004 + lift * lift * (3 - 2 * lift) * (rail_top + 0.012)

    sx, sy, sz = start
    tx, ty = ground[0]
    path = []
    for k in range(10):  # the drop: leaving the plug steeply, meeting the slab tangentially
        s = k / 10
        path.append((sx + (tx - sx) * s, sy + (ty - sy) * s, rest(tx) + (sz - rest(tx)) * (1 - s) ** 2))
    flat = _smooth(ground, 0.6 if fine() else 2.0)
    path += [(p.x, p.y, rest(p.x)) for p in flat]
    bx, by = box_at
    face = bx - d * 0.9  # the box's face toward the launcher
    lx, ly = flat[-1]
    for k in range(1, 7):  # up off the slab into the receptacle
        s = k / 6
        path.append((lx + (face - d * 0.35 - lx) * s, ly + (by - ly) * s, rest(lx) + (0.75 - rest(lx)) * s * s * (3 - 2 * s)))
    cable.loft([P(*p) for p in path], [(r * FT, r * FT)] * len(path), 12, ref=(0, 0, 1), resample=1)
    # the plug at the ring: a body, a knurled coupling ring, a rubber boot where the cable leaves it
    down = (0.0, 0.0, -1.0)
    plug = axes((sx, sy, sz + 0.6), (1, 0, 0), down)
    body = [(0.0, -0.1), (0.24, -0.1), (0.24, 0.0), (0.28, 0.02), (0.28, 0.18), (0.22, 0.2), (0.22, 0.48), (0.16, 0.6), (0.0, 0.6)]
    fittings.lathe(ftp(body), 16, matrix=plug)
    # the junction box, and on its face a receptacle's square flange with the plug in it
    box(fittings, (bx - 0.9, by - 0.9, 0.0), (bx + 0.9, by + 0.9, 1.3))
    box(fittings, (face - d * 0.05 - 0.05, by - 0.45, 0.3), (face - d * 0.05 + 0.05, by + 0.45, 1.2))
    sock = axes((face - d * 0.05, by, 0.75), (0, 1, 0), (-d, 0, 0))
    fittings.lathe(ftp([(0.0, 0.0), (0.26, 0.0), (0.26, 0.12), (0.3, 0.14), (0.3, 0.3), (0.2, 0.34), (0.17, 0.4), (0.0, 0.4)]), 16, matrix=sock)
    if fine():  # the bolts of the box's cover
        for dy in (-0.7, 0.7):
            for z in (0.15, 1.15):
                fittings.disc(P(face - d * 0.0, by + dy, z), (-d, 0, 0), 0.05 * FT, 0.04 * FT, 6)
