"""The launch system in the platform's hole: Barmin's "tulip".

A ring that turns in the hole to aim the rocket, and on it four support trusses that lean in and meet
round the rocket's waist, where the four strap-ons' tips push on the core. The rocket hangs there,
its tail below the deck, held by nothing but its own weight on the four heads; four guides lower down
steady its tail. When it lifts, the weight comes off the heads and each truss falls back under its
counterweight.

What is recorded: the ring's two diameters and how far the turning part reaches above and below the
deck (a Soviet description of the later system; the CIA's 65 ft circle and 60 ft tower of 1959 agree
with them), that there are four trusses and four guides, and how they let go. The trusses' own
shape, the members' sizes, the platforms and the angle they fall through are estimated from the film
of April 1961 and from the structure as it stands. See ../site-1.md.

Nodes: LaunchRing, with Support_1..4 (each with its origin on its hinge) and Guide_1..4 under it.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

from .site import RING_IN, RING_OUT, ROTATING_BELOW, TIP_Z, TURN, P, Parts, about, beam, fine, handrail, obox, profile, truss

HINGE_R, HINGE_Z = 8.3, 1.6  # a support truss's hinge, on its base on the ring (estimated)
HEAD_R, HEAD_Z = 2.6, TIP_Z - 0.5  # where its boom ends, behind the load ring's sector
SECTOR = (1.8, 2.25)  # the load ring's sector: inside and outside radius, clear of the core (1.475) and the boosters' tips
SECTOR_Z = (TIP_Z - 0.76, TIP_Z - 0.26)
DECK_Z = TIP_Z + 2.6  # the work platform on each truss's head, above the strap-ons' tips (off the film of April 1961)
FALL = 45.0  # degrees a truss falls back through: from 28 in of upright to 17 out (estimated)
GUIDE_Z = -ROTATING_BELOW + 1.3


def build(parts: Parts) -> None:
    parts.node("LaunchRing")
    ring, cage, deck = parts("LaunchRing", "green"), parts("LaunchRing", "dark"), parts("LaunchRing", "deck")
    turn = Matrix.Rotation(TURN, 4, "Z")
    # the ring: a box girder round the hole, its top the deck men stand on to reach the tail
    ring.lathe(profile([(RING_IN, -1.5), (RING_OUT, -1.5), (RING_OUT, -0.06), (RING_IN, -0.06), (RING_IN, -1.5)]), 16, matrix=turn)
    deck.lathe(profile([(RING_IN + 0.05, -0.05), (RING_OUT - 0.05, -0.05), (RING_OUT - 0.05, 0.0), (RING_IN + 0.05, 0.0)]), 16, matrix=turn)
    handrail(deck, [about(360.0 * k / 16, RING_IN + 0.15, 0.0) for k in range(17)], height=1.1, post=0.05, rail=0.04)
    # what hangs under it and turns with it, down to the level of the rocket's tail: columns, a lower ring, bracing
    low = -ROTATING_BELOW
    cage.lathe(
        profile([(RING_IN + 0.2, low), (RING_IN + 1.3, low), (RING_IN + 1.3, low + 0.5), (RING_IN + 0.2, low + 0.5), (RING_IN + 0.2, low)]),
        16,
        matrix=turn,
    )
    for k in range(8):
        a0, a1 = 22.5 + 45.0 * k, 22.5 + 45.0 * (k + 1)
        beam(cage, about(a0, RING_IN + 0.75, low + 0.45), about(a0, RING_IN + 0.75, -1.45), 0.4)
        if fine():
            beam(cage, about(a0, RING_IN + 0.75, low + 0.45), about(a1, RING_IN + 0.75, -1.45), 0.22)

    for k in range(4):
        az = 45.0 + 90.0 * k
        support(parts, k + 1, az)
        guide(parts, k + 1, az)


def support(parts: Parts, n: int, az: float) -> None:
    """One support truss, between two strap-ons: its base on the ring, its boom, the load ring's sector, the
    platform on its head, its counterweights."""
    node = f"Support_{n}"
    hinge = Vector(about(az, HINGE_R, HINGE_Z))
    parts.node(node, "LaunchRing", origin=tuple(hinge))
    out = Vector(about(az, 1.0)).normalized()
    side = Vector((-out.y, out.x, 0.0))
    up = Vector((0, 0, 1))
    boom, dark, deck, weight = parts(node, "green"), parts(node, "dark"), parts(node, "deck"), parts(node, "weight")
    base = parts("LaunchRing", "green/bases")
    # the base: two cheeks on the ring with the hinge pin between them
    for s in (-1, 1):
        obox(base, tuple(Vector(about(az, HINGE_R, HINGE_Z / 2 + 0.1)) + side * (s * 2.05)), tuple(out), (0, 0, 1), (1.5, 0.3, HINGE_Z + 0.5))
    boom.tube(P(*(hinge - side * 2.0)), P(*(hinge + side * 2.0)), 0.16, 12)
    # the boom: a box truss, wide at the hinge and narrow at the head
    head = Vector(about(az, HEAD_R, HEAD_Z))
    along = (head - hinge).normalized()
    across = along.cross(side).normalized()  # square to the boom, outward and up
    length = (head - hinge).length

    def corner(i: int, s: float) -> tuple:
        t = s / length
        half_w = 1.7 + (0.75 - 1.7) * t
        half_d = 0.75 + (0.4 - 0.75) * t
        sw, sd = ((-1, -1), (1, -1), (1, 1), (-1, 1))[i]
        return tuple(hinge + along * s + side * (sw * half_w) + across * (sd * half_d))

    bays = 7 if fine() else 4
    truss(boom, corner, [length * b / bays for b in range(bays + 1)], 0.2, 0.12)
    # the head: the sector of the load ring the rocket's weight sits on, and the frame that carries it
    # (35 degrees either way: the four leave 20 degrees open at each strap-on, where its nose comes up between them
    # before the trusses have begun to fall: the pose check, ../site-1.md)
    a0, a1 = TURN + math.radians(az - 35.0), TURN + math.radians(az + 35.0)
    (ri, ro), (zb, zt) = SECTOR, SECTOR_Z
    dark.lathe(profile([(ri, zb), (ro, zb), (ro, zt), (ri, zt), (ri, zb)]), 24, arc=(a0, a1))
    for s in (-1, 1):
        for sd in (-1, 1):
            p = Vector(corner(0 if s < 0 else 1, length)) if sd < 0 else Vector(corner(3 if s < 0 else 2, length))
            q = Vector(about(az + s * 20.0, ro - 0.05, (zb + zt) / 2))
            beam(boom, tuple(p), tuple(q), 0.16)
    # the platform on the head, railed, with the posts that carry it up from the boom
    da = 30.0
    r0, r1 = 2.7, 4.5
    pz = DECK_Z
    arc = (TURN + math.radians(az - da), TURN + math.radians(az + da))
    deck.lathe(profile([(r0, pz - 0.08), (r1, pz - 0.08), (r1, pz), (r0, pz), (r0, pz - 0.08)]), 12, arc=arc)
    rim = [about(az - da + 2 * da * k / 6, r1 - 0.06, pz) for k in range(7)]
    handrail(deck, [about(az - da, r0 + 0.06, pz), *rim, about(az + da, r0 + 0.06, pz)], height=1.1, post=0.05, rail=0.04)
    for s in (-1, 1):
        beam(boom, corner(3 if s < 0 else 2, length * 0.86), about(az + s * (da - 4.0), r1 - 0.3, pz - 0.08), 0.14)
        beam(boom, tuple(about(az + s * 18.0, ro - 0.05, zt)), about(az + s * (da - 4.0), r0 + 0.3, pz - 0.08), 0.14)
    # the counterweights: iron slabs stacked either side of the boom's foot, behind the hinge, that pull it over (how many
    # and how big is estimated: the film shows a dark mass there, not its make-up)
    for s in (-1, 1):
        for k in range(3):
            c = hinge + out * 0.75 + up * (0.95 - 0.5 + 0.25 + 0.5 * k) + side * (s * 1.35)
            inset = 0.04 * (k % 2)
            obox(weight, tuple(c), tuple(out), (0, 0, 1), (1.3 - inset, 0.9 - inset, 0.46))


def guide(parts: Parts, n: int, az: float) -> None:
    """One lower guide: an arm from the turning cage in to the rocket's tail, between two strap-ons. Its grip on
    the tail is not modelled: it ends short of the skin."""
    node = f"Guide_{n}"
    foot = Vector(about(az, RING_IN + 0.2, GUIDE_Z))
    parts.node(node, "LaunchRing", origin=tuple(foot))
    arm = parts(node, "green")
    tip = Vector(about(az, 3.9, GUIDE_Z + 0.2))
    out = Vector(about(az, 1.0)).normalized()
    side = Vector((-out.y, out.x, 0.0))
    for s in (-1, 1):
        beam(arm, tuple(foot + side * (s * 0.9)), tuple(tip + side * (s * 0.25)), 0.22)
    beam(arm, tuple(foot + side * 0.9), tuple(foot - side * 0.9), 0.22)
    obox(arm, tuple(tip), tuple(out), (0, 0, 1), (0.5, 0.9, 0.4))
