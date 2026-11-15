"""The two service trusses (фермы обслуживания, 8Т119): the work platforms round the launch vehicle.

Two trusses stand on the launch system's ring, one on its north side and one on its south, each over one of the
four supports. Raised, they close round the rocket above the strap-ons' tips and their half-ring platforms make
whole rings; lowered, each lies level out over the platform's edge. TsKBTM's own account of the pair built for the
R-7 (as quoted by militaryrussia.ru): "the load-bearing structure is made as curved welded beams of truss type,
which in their upper part run into one beam of the same section"; a lower, a middle and an upper platform; a hinge
on the turning ring; a hydraulic system that raises the truss to the vertical. Length 21.6 m, width 7.9 m, height
20 m, 56 t. These are the first pair: the ones that stand there now, with lifts inside square columns, replaced
them later.

On 12 April 1961 (the transcript of the morning, Moscow time): at 08:15 "they are lowering the service platforms;
all the work on the trusses is finished", and at 08:40 "now we are drawing the trusses off". A photograph of a
Vostok at ignition, taken across the pit, shows both lying level to the north and south, their half rings standing
up from their far ends.

What is recorded: the figures above, that there were two and where (the CIA's interpreters, March 1961: "two
parallel inner sides ... on the north and south sides of the tower, with the east-west opening between them
generally unobstructed"), and the times. Everything else is estimated from one KBOM drawing and two frames of film:
the legs' line, every member, where the platforms stood against the 8K72K, the ladders. See ../site-1.md.

A truss's own frame (steel.Turned): out from the rocket's axis, across (anticlockwise from above), up.

Nodes: ServiceTrusses, with ServiceTruss_North and ServiceTruss_South under it, each with its origin on its hinge.
"""

from __future__ import annotations

import math

from sitelib import ear_clip

from .site import MM, Parts, beam, fine, handrail, obox, stood
from .steel import Turned, arc_deck, arc_rail, box_truss, polyline

# The 8Т119 (TsKBTM, as quoted by militaryrussia.ru; millimetres)
LENGTH = 21600.0 * MM  # over all, lying: from the heel under its hinge to its head
WIDTH = 7900.0 * MM  # across: the platforms' rings
HEIGHT = 20000.0 * MM  # standing: from its hinge to the upper platform's rail
HINGE_R, HINGE_Z = 8.6, 0.9  # each truss's hinge line, on the ring's deck (estimated)
FOOT = 2.9  # each leg's foot, either side of the support the truss stands over
# A leg's line: (height, out, across) knots from its hinge to where the two run into one (estimated: clear of the
# support between them, of its platform and of the strap-ons, and leaning in from the hinge all the way up)
LEG = [(HINGE_Z, HINGE_R, FOOT), (5.5, 7.5, 2.6), (10.5, 6.3, 1.5), (14.0, 5.6, 0.25)]  # (side by side at the join)
JOIN_Z, JOIN_R = LEG[-1][0], LEG[-1][1]
TOP_Z = HINGE_Z + HEIGHT  # the upper platform's rail
TOP_R = 4.45  # the single beam's line at its head, behind the rings
RING = (1.72, WIDTH / 2)  # a platform's ring: inside, clear of the core; outside, half the truss's width
RAIL = 1.1
UPPER_Z = TOP_Z - RAIL  # the upper platform's floor, a rail's height under the head
MIDDLE_Z = UPPER_Z - 2.15  # the middle one, a storey below (the spacing off a photograph of a Vostok on the pad)
END_GAP = math.radians(1.5)  # each half ring stops this short of the line where the two halves meet
FALL = 98.0  # degrees a truss is lowered through: until its single beam lies about level, 2 m over the deck (estimated)
TREAD = 0.08  # a floor's thickness
LEG_D, LEG_W = 0.3, 0.22  # half a leg's section: out, across
BEAM_D, BEAM_W = 0.3, 0.4  # half the single beam's
NECK = 1.5  # half the width of the floor that joins a platform to the beam


def col(z: float) -> float:
    """The single beam's line above the join: how far out it stands at height z."""
    return JOIN_R + (TOP_R - JOIN_R) * (z - JOIN_Z) / (TOP_Z - JOIN_Z)


def build(parts: Parts) -> None:
    if not stood(
        "Service trusses 8T119 (the first pair)",
        since="1957",
        confidence="documented",
        source="TsKBTM's account of the R-7's ground equipment, as quoted by militaryrussia.ru; the film of 15 May 1957. "
        "Replaced later by the pair with lift columns: when is not in anything read",
    ):
        return
    parts.node("ServiceTrusses")
    one(parts, "ServiceTruss_North", 45.0)
    one(parts, "ServiceTruss_South", 225.0)


def slab(mb, f: Turned, outline, z: float) -> None:
    """A floor, its top at z, over a simple outline given as (out, across) in a truss's frame, anticlockwise from above."""
    k = len(outline)
    tris = [tuple(range(k))] if k <= 4 else ear_clip(outline)
    top = [f(r, a, z) for r, a in outline]
    bot = [f(r, a, z - TREAD) for r, a in outline]
    mb.add(top, tris)
    mb.add(bot, [t[::-1] for t in tris])
    for i in range(k):
        j = (i + 1) % k
        mb.add([bot[i], bot[j], top[j], top[i]], [(0, 1, 2, 3)])


def rect(r0: float, r1: float, a0: float, a1: float) -> list:
    return [(r0, a0), (r1, a0), (r1, a1), (r0, a1)]


def rail(mb, f: Turned, pts, z: float) -> None:
    handrail(mb, [f(r, a, z) for r, a in pts], height=RAIL, post=0.05, rail=0.04)


def one(parts: Parts, node: str, az: float) -> None:
    """One truss, standing closed, over the support at `az` round the rocket."""
    f = Turned(az)
    parts.node(node, "ServiceTrusses", origin=f(HINGE_R, 0.0, HINGE_Z))
    steel, deck, rails = parts(node, "green"), parts(node, "deck"), parts(node, "deck/rails")
    base = parts("ServiceTrusses", "dark")

    # the hinge: a pedestal on the ring under each leg, and the pin through it
    for s in (-1, 1):
        obox(base, f(HINGE_R, s * FOOT, HINGE_Z / 2 - 0.02), tuple(f.out), (0, 0, 1), (0.8, 0.36, HINGE_Z + 0.3))
        steel.tube(f.v(HINGE_R, s * (FOOT - 0.36), HINGE_Z), f.v(HINGE_R, s * (FOOT + 0.36), HINGE_Z), 0.11, 12)

    # the two legs: box trusses that lean in over the strap-ons' shoulders and run together above the support's head
    bays = 10 if fine() else 5
    zs = [HINGE_Z + (JOIN_Z - HINGE_Z) * k / bays for k in range(bays + 1)]
    for s in (-1, 1):

        def corner(i: int, z: float, s=s) -> tuple:
            r, across = polyline(LEG, z)
            dr, da = ((-1, -1), (1, -1), (1, 1), (-1, 1))[i]
            return f(r + dr * LEG_D, s * across + da * LEG_W, z)

        box_truss(steel, corner, zs, 0.13, 0.075)
    # the single beam they run into, up to the head, and the knee where they meet
    cz = [JOIN_Z + 0.2 + (TOP_Z - 0.75 - JOIN_Z - 0.2) * k / 5 for k in range(6)]  # (it stands on the knee)

    def column(i: int, z: float) -> tuple:
        dr, da = ((-1, -1), (1, -1), (1, 1), (-1, 1))[i]
        return f(col(z) + dr * BEAM_D, da * BEAM_W, z)

    box_truss(steel, column, cz, 0.13, 0.075)
    obox(steel, f(JOIN_R, 0.0, JOIN_Z), tuple(f.out), (0, 0, 1), (0.86, 1.3, 0.3))

    # the platforms: half a ring each, railed round the outside but for the neck, on arms from the beam
    a0, a1 = f.angle - math.pi / 2 + END_GAP, f.angle + math.pi / 2 - END_GAP
    open_at = math.asin(NECK / (RING[1] - 0.06))  # the rail stops either side of the neck
    for pz in (MIDDLE_Z, UPPER_Z):
        arc_deck(deck, RING[0], RING[1], pz - TREAD, pz, a0, a1, 24)
        for b0, b1 in ((a0, f.angle - open_at), (f.angle + open_at, a1)):
            arc_rail(rails, RING[1] - 0.06, pz, b0, b1, 5 if fine() else 3, RAIL)
        # a curb under the outer edge, and the arms and knees that carry it from the beam
        arc_deck(steel, RING[1] - 0.22, RING[1] - 0.04, pz - 0.3, pz - TREAD - 0.004, a0 + 0.01, a1 - 0.01, 24)
        for deg in (-62.0, -24.0, 24.0, 62.0):
            a = f.angle + math.radians(deg)
            tip = ((RING[0] + 0.15) * math.cos(a), (RING[0] + 0.15) * math.sin(a), pz - 0.2)
            beam(steel, f(col(pz) - BEAM_D, math.copysign(0.33, deg), pz - 0.45), tip, 0.12)
        for s in (-1, 1):
            beam(steel, f(col(pz - 1.3) - BEAM_D, s * 0.33, pz - 1.3), f(RING[1] - 0.5, s * 1.4, pz - 0.26), 0.09)
    access(parts, node, f)


def access(parts: Parts, node: str, f: Turned) -> None:
    """The way up (estimated: nothing read shows it): two runs of ladder beside one leg with a landing at the head of
    each, then two up the back of the single beam, each to the neck that joins a platform to the beam."""
    steel, deck, rails = parts(node, "green"), parts(node, "deck"), parts(node, "deck/rails")
    across_look = tuple(-f.side)  # a climber beside a leg faces across, toward the truss's middle
    inward = tuple(-f.out)  # one behind the beam faces the rocket

    # beside the leg: each run stands clear of the leg's foot and comes up level with the leg's line
    mid_z = 7.0
    leg_mid, leg_top = polyline(LEG, mid_z), polyline(LEG, JOIN_Z)
    l1 = (leg_mid[0] + 0.1, FOOT + LEG_W + 0.45)  # (out, across): from the deck to the landing at 7 m
    l2 = (leg_top[0] + 0.1, leg_mid[1] + LEG_W + 0.45)  # from that landing to the one at the join
    parts.ladder(node, "leg1", f(*l1, 0.0), f(*l1, mid_z), face=across_look, mat="deck")
    parts.ladder(node, "leg2", f(*l2, mid_z), f(*l2, JOIN_Z), face=across_look, mat="deck")

    # the landing at 7 m: from the leg's side out past the first run's head, and round the foot of the second
    edge = leg_mid[1] + LEG_W + 0.03
    r0, r1 = l2[0] - 0.75, l1[0] + 0.75
    slab(deck, f, rect(r0, r1, edge, l1[1] - 0.1), mid_z)
    slab(deck, f, rect(r0, l1[0] - 0.36, l1[1] - 0.1, l1[1] + 0.75), mid_z)
    slab(deck, f, rect(l1[0] + 0.36, r1, l1[1] - 0.1, l1[1] + 0.75), mid_z)
    rail(
        rails, f, [(l1[0] - 0.4, l1[1] + 0.71), (r0 + 0.04, l1[1] + 0.71), (r0 + 0.04, edge + 0.04), (leg_mid[0] - LEG_D - 0.12, edge + 0.04)], mid_z
    )
    rail(rails, f, [(l1[0] + 0.4, l1[1] + 0.71), (r1 - 0.04, l1[1] + 0.71), (r1 - 0.04, edge + 0.04)], mid_z)
    for rr in (r0 + 0.12, r1 - 0.12):  # its bearers, and a strut under each from the leg
        beam(steel, f(rr, edge - 0.2, mid_z - 0.14), f(rr, l1[1] + 0.7, mid_z - 0.14), 0.1)
        lr, la = polyline(LEG, mid_z - 1.2)
        beam(steel, f(lr, la, mid_z - 1.2), f(rr, l1[1] + 0.3, mid_z - 0.2), 0.08)

    # the landing at the join: from the knee out past the second run's head, and back to the foot of the beam's ladder
    b1 = (JOIN_R + BEAM_D + 0.2, 1.0)  # the first run up the beam: behind it, to one side
    b2 = (col(MIDDLE_Z) + BEAM_D + 0.2, -1.0)  # the second, on the other side
    knee = 0.68
    j0 = l2[0] - 0.75
    slab(deck, f, rect(j0, b1[0] + 0.9, knee, 1.7), JOIN_Z)
    slab(deck, f, rect(j0, l2[0] + 0.75, 1.7, l2[1] - 0.1), JOIN_Z)
    rail(rails, f, [(j0 + 0.04, knee + 0.04), (j0 + 0.04, l2[1] - 0.14)], JOIN_Z)
    rail(rails, f, [(b1[0] + 0.86, knee + 0.04), (b1[0] + 0.86, 1.66), (l2[0] + 0.71, 1.66), (l2[0] + 0.71, l2[1] - 0.14)], JOIN_Z)
    for aa in (knee + 0.1, 1.6):
        beam(steel, f(JOIN_R - 0.2, aa, JOIN_Z - 0.14), f(b1[0] + 0.85, aa, JOIN_Z - 0.14), 0.1)
        beam(steel, f(col(JOIN_Z - 0.9), 0.3, JOIN_Z - 0.9), f(b1[0] + 0.7, aa, JOIN_Z - 0.2), 0.08)
    beam(steel, f(j0 + 0.1, 1.5, JOIN_Z - 0.14), f(j0 + 0.1, l2[1] - 0.15, JOIN_Z - 0.14), 0.1)
    beam(steel, f(l2[0] + 0.65, 1.5, JOIN_Z - 0.14), f(l2[0] + 0.65, l2[1] - 0.15, JOIN_Z - 0.14), 0.1)

    parts.ladder(node, "beam1", f(*b1, JOIN_Z), f(*b1, MIDDLE_Z), face=inward, mat="deck")
    parts.ladder(node, "beam2", f(*b2, MIDDLE_Z), f(*b2, UPPER_Z), face=inward, mat="deck")

    # each platform's neck: a floor from the ring's edge back past the beam, open where the run below comes up
    hole = BEAM_W + 0.1  # the beam stands in a hole this far either side of its middle
    for pz, came, goes in ((MIDDLE_Z, b1, b2), (UPPER_Z, b2, None)):
        c = col(pz)
        ring_edge = RING[1] + 0.012

        def edge_at(a: float, ring_edge=ring_edge) -> tuple:
            return (math.sqrt(ring_edge**2 - a * a), a)

        n = 6
        cuts = [-NECK + 2 * NECK * k / n for k in range(n + 1)]
        far = goes[0] + 0.85 if goes else c + BEAM_D + 0.9
        for s in (-1, 1):  # either side of the beam, back to where a ladder comes up or stands
            arrive = came[1] * s > 0
            back = came[0] - 0.12 if arrive else far
            along = sorted((a for a in cuts if a * s > hole + 1e-6), key=abs)
            outline = [edge_at(s * hole), (back, s * hole), (back, s * NECK), *[edge_at(a) for a in reversed(along)]]
            slab(deck, f, outline if s > 0 else outline[::-1], pz)
            run = [(RING[1] + 0.25, s * (NECK - 0.04)), (back - 0.04, s * (NECK - 0.04))]
            rail(rails, f, run if arrive else [*run, (back - 0.04, s * (hole + 0.06))], pz)
            beam(steel, f(c, s * 0.3, pz - 0.6), f(back - 0.2, s * (NECK - 0.2), pz - 0.14), 0.08)
        # in front of the beam and behind it
        between = [edge_at(a) for a in cuts if abs(a) < hole - 1e-6]
        slab(deck, f, [edge_at(-hole), (c - BEAM_D - 0.1, -hole), (c - BEAM_D - 0.1, hole), edge_at(hole), *between[::-1]], pz)
        slab(deck, f, rect(c + BEAM_D + 0.1, min(came[0] - 0.12, far), -hole, hole), pz)
        for s in (-1, 1):
            beam(steel, f(RING[1] - 0.1, s * (NECK - 0.15), pz - 0.14), f(min(came[0] - 0.12, far) - 0.1, s * (NECK - 0.15), pz - 0.14), 0.1)


def summary() -> str:
    return f"service trusses {HEIGHT:.1f} m from hinge to head, {WIDTH:.1f} m across the rings, upper floor {UPPER_Z:.2f} m over the deck"
