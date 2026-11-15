"""The upper cable mast (верхняя кабель-мачта): what the third stage's and the spacecraft's lines came up.

A slender mast on the launch system's ring, opposite the erector, that carried cables up to the third stage and
was swung clear in the last minute. Korolev to Gagarin at 09:06 Moscow time: "the pressurisation is going, the
cable mast is away, all is normal"; ignition was called at 09:07.

What is recorded: that the launch system had one upper cable mast and two lower ones (KBOM's drawing of the R-7's
launch system, in Afanasyev); a shadow the CIA's interpreters read in March 1961 as a "possible umbilical mast",
its base "somewhere within the darkened circular area" and its top "anywhere between 85 and 95 feet above the
launching platform", ending "in an oblong loop"; the minute it came away. A photograph of a Vostok being raised
shows it as two slender lattice legs with a head, standing beyond the rocket's tail. Two photographs of 12 April
1961 taken from across the pit (RussianSpaceWeb) show where it had gone to: in the first the rocket still stands in
the closed supports and the mast already leans some 25 degrees out of upright; in the second the rocket's tail is
some 20 m over the deck and the mast leans as it did. So it went the whole way back at 09:06, a minute before
liftoff, and did not move as the rocket left.

Estimated: which side it stood on (the east, over the support there: the only place the two service trusses do not
sweep as they are lowered; the two photographs, taken from the east, have it on the rocket's left, which is the
south: see ../site-1.md, what the model gets wrong), its legs' line, every member, the arm at its head and where on
the third stage its plugs went, how far it swung and how fast. See ../site-1.md.

The two lower cable masts, under the deck at the rocket's tail, are not built: one small reproduction of a drawing
shows that they were there and nothing read shows where.

Node: UpperCableMast, its origin on its hinge.
"""

from __future__ import annotations

from mathutils import Vector

from .site import FT, Parts, beam, fine, obox, stood
from .steel import Turned, slim_truss

AZ = 315.0  # round the rocket from its own +X: the support on the east side of the ring, opposite the erector
TOP_Z = 90.0 * FT  # its head above the deck: the middle of the CIA's 85 to 95 ft (PIC/JR-2/61)
HINGE_R, HINGE_Z = 8.75, 0.7  # its hinge line, on the ring (estimated)
FOOT = 2.7  # each leg's foot, either side of the support
HEAD_R, HEAD_A = 4.75, 0.55  # the legs' line at the head: out from the axis, and half their spread
ARM_Z = 24.3  # the arm's tip, against the third stage under the fairing's foot (estimated)
ARM_R = 1.5  # how near the axis the plugs come: the third stage's skin is at 1.29
# Degrees from where it stood to where it leans once it is away, at 09:06 (estimated). Standing, its legs lean 8.9
# degrees in; the photographs of the morning have it at least 25 degrees out of upright (in projection: 24.7 with the
# rocket standing, 21.5 with it risen), which is 34 from standing or more. 40 is taken, 31 degrees out of upright: the
# least at which the support under it, falling back at liftoff, passes inside its legs with room (the pose check: it
# crosses them at 34 and clears at 38).
FALL = 40.0
LEG = 0.24  # half a leg's section


def build(parts: Parts) -> None:
    if not stood(
        "Upper cable mast",
        since="1957",
        confidence="documented",
        source="KBOM's drawing of the launch system (Afanasyev); CIA PIC/JR-2/61: a possible umbilical mast, 85 to 95 ft; "
        "the transcript of 12 April 1961, 09:06",
    ):
        return
    node = "UpperCableMast"
    f = Turned(AZ)
    parts.node(node, None, origin=f(HINGE_R, 0.0, HINGE_Z))
    steel, dark, cable = parts(node, "green"), parts(node, "dark"), parts(node, "cable")
    base = parts("LaunchRing", "dark/mast_feet")
    head_z = TOP_Z - 1.1

    def line(s: int, z: float) -> tuple[float, float]:
        t = (z - HINGE_Z) / (head_z - HINGE_Z)
        return HINGE_R + (HEAD_R - HINGE_R) * t, s * (FOOT + (HEAD_A - FOOT) * t)

    # a pedestal and a pin under each leg, and the two legs: slender box trusses that run together toward the head
    bays = 20 if fine() else 10
    zs = [HINGE_Z + (head_z - HINGE_Z) * k / bays for k in range(bays + 1)]
    for s in (-1, 1):
        obox(base, f(HINGE_R, s * FOOT, HINGE_Z / 2 - 0.02), tuple(f.out), (0, 0, 1), (0.6, 0.32, HINGE_Z + 0.24))
        steel.tube(f.v(HINGE_R, s * (FOOT - 0.3), HINGE_Z), f.v(HINGE_R, s * (FOOT + 0.3), HINGE_Z), 0.09, 12)

        def corner(i: int, z: float, s=s) -> tuple:
            r, a = line(s, z)
            dr, da = ((-1, -1), (1, -1), (1, 1), (-1, 1))[i]
            return f(r + dr * LEG, a + da * LEG, z)

        slim_truss(steel, corner, HINGE_Z, head_z, bays, 0.085, 0.05)
    # ties and crosses between the legs, above where the support under them swings (it falls back between the legs)
    tie_from = 17.5
    levels = [z for z in zs if z >= tie_from]
    for k, z in enumerate(levels):
        (r, a), (_, b) = line(1, z), line(-1, z)
        beam(steel, f(r, a - LEG, z), f(r, b + LEG, z), 0.09)
        if k + 1 < len(levels) and fine():
            z2 = levels[k + 1]
            (r2, a2), (_, b2) = line(1, z2), line(-1, z2)
            beam(steel, f(r, a - LEG, z), f(r2, b2 + LEG, z2), 0.05)
            beam(steel, f(r, b + LEG, z), f(r2, a2 - LEG, z2), 0.05)

    # the head: a frame across the two legs, and the arm that reaches in to the third stage with the plugs at its tip
    obox(steel, f(HEAD_R, 0.0, head_z + 0.12), tuple(f.out), (0, 0, 1), (0.7, 2 * HEAD_A + 0.7, 0.3))
    for s in (-1, 1):
        beam(steel, f(HEAD_R, s * HEAD_A, head_z + 0.25), f(HEAD_R, 0.0, TOP_Z - 0.06), 0.1)
    beam(steel, f(HEAD_R, -HEAD_A, TOP_Z - 0.06), f(HEAD_R, HEAD_A, TOP_Z - 0.06), 0.1)
    root_z = head_z - 0.9
    root = f.v(line(1, root_z)[0] - LEG - 0.02, 0.0, root_z)
    for s in (-1, 1):
        r, a = line(s, root_z)
        beam(steel, f(r, a, root_z), tuple(root), 0.1)
    tip = f.v(ARM_R + 0.45, 0.0, ARM_Z + 0.1)
    for s in (-1, 1):  # two booms from the legs to the tip, and a stay over them from the head
        beam(steel, tuple(root + f.side * (s * 0.3)), tuple(tip + f.side * (s * 0.3)), 0.09)
    beam(steel, f(HEAD_R - 0.2, 0.0, head_z + 0.2), tuple(tip + Vector((0, 0, 0.1))), 0.05)
    for t in (0.33, 0.66):
        p = root + (tip - root) * t
        beam(steel, tuple(p - f.side * 0.3), tuple(p + f.side * 0.3), 0.06)
    # the loop at its tip (the "oblong loop" the interpreters saw): a frame that holds the plugs to the stage's plate
    w, h = 0.6, 0.28
    c = f.v(ARM_R + 0.18, 0.0, ARM_Z)
    for a, b in (((-w, -h), (w, -h)), ((w, -h), (w, h)), ((w, h), (-w, h)), ((-w, h), (-w, -h))):
        beam(steel, tuple(c + f.side * a[0] + f.up * a[1]), tuple(c + f.side * b[0] + f.up * b[1]), 0.06)
    for s in (-1, 1):
        beam(steel, tuple(tip + f.side * (s * 0.3)), tuple(c + f.side * (s * 0.5) + f.up * h), 0.06)
        obox(dark, tuple(c + f.side * (s * 0.3) - f.out * 0.07), tuple(f.out), (0, 0, 1), (0.2, 0.22, 0.3))  # a plug's housing
    # the cables: from the plugs back along the arm and down one leg to the ring
    for s in (-1, 1):
        path = [c + f.side * (s * 0.3) + f.out * 0.05, tip + f.side * (s * 0.12) - f.up * 0.12, root + f.side * (s * 0.12) - f.up * 0.14]
        r, a = line(1, root_z - 0.3)
        path.append(f.v(r - LEG - 0.07, a + s * 0.07, root_z - 0.5))
        r, a = line(1, HINGE_Z + 1.2)
        path.append(f.v(r - LEG - 0.07, a + s * 0.07, HINGE_Z + 1.2))
        path.append(f.v(HINGE_R - 0.75, FOOT + s * 0.07, 0.02))
        for p, q in zip(path, path[1:]):
            cable.tube(p, q, 0.035, 8)


def summary() -> str:
    return f"cable mast {TOP_Z:.2f} m over the deck ({TOP_Z / FT:.0f} ft)"
