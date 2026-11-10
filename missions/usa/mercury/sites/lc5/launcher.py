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

from .site import LAUNCHER_TOP, P, Parts, beam, box, fine, ftp, obox, plate

RING_R = (3.05, 5.0)  # the table's opening and its outside: about 10 ft across
FOOT_R = 5.5  # where the feet stand, on the scale plate
FIN_II = math.radians(45.0)  # which fin is II is not recorded against the model: the fin at +X +Y is taken


def build(parts: Parts) -> None:
    parts.node("LaunchPedestal")
    ring, legs = parts("LaunchPedestal", "black", True), parts("LaunchPedestal", "black/legs")
    defl, fittings, cable = parts("LaunchPedestal", "scorched"), parts("LaunchPedestal", "grey", True), parts("LaunchPedestal", "cable", True)
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
    # the two heavy cables from the ring to the pad, and away across it: WNW to the trench's end, and ESE
    for path in (
        [(4.95, 1.2, zr + 0.4), (6.2, 1.6, 0.6), (9.0, 2.2, 0.32), (20.0, 2.6, 0.32), (33.0, 0.0, 0.32), (36.0, -1.2, 0.4)],
        [(-4.95, -1.0, zr + 0.4), (-6.2, -1.4, 0.6), (-9.0, -2.0, 0.32), (-30.0, -3.5, 0.32), (-55.0, -2.0, 0.32), (-58.0, -2.0, 0.6)],
    ):
        cable.loft([P(*p) for p in path], [(0.24 * FT, 0.24 * FT)] * len(path), 10, ref=(0, 0, 1))
    for x, y in ((36.6, -1.4), (-58.8, -2.0)):  # the boxes they plug into
        box(fittings, (x - 0.9, y - 0.9, 0.0), (x + 0.9, y + 0.9, 1.3))
