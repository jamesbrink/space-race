"""The two cable masts. TM X-53107's countdown names them: No. 1 for the booster (the "compartment mast"), No. 2 for
the capsule, each with an eject control line (T-390) and each fed at 750 psi (T-45). No. 2 was held by a pneumatic
release valve and pulled away by a bungee cord (T-325, T-45); the capsule's umbilical dropped at about T-35 s. No. 1
carried the booster's "boom plug" and the cooling package that kept the instrument compartment between 10 and 40
degrees C (4.2.3: air drawn out "through the missile drop-off plate", cooled in "a cooling package mounted on a cable
mast" and returned), with its LN2 boom tank (T-380); "boom drop" came at about T-14 s.

Both are slender poles hinged on the launcher's table and standing close against the vehicle, a hand's breadth off
its skin: "Booster arrival and erection on launcher. Cable masts erected" (TM X-53107, L-25). Where they stand round
the vehicle is derived from three photographs of MR-4 (site.MASTS); their heights, their heads and what they carry
are read off the same photographs and MR-3's at ignition (S61-02407), and are estimated:

  No. 1  a 6.5 in tube to 5.5 ft above the foot of the booster's chequered section, steadied against the skin just
         under that foot; outboard of it, from half a foot under the foot to 2.2 ft over it, the cooling package (a
         white vessel under a dark box) with a hose coiled behind it; from the pole's top a bundle of hoses arches
         over and in to the booster, 3 to 5 ft up the section.
  No. 2  a 3.8 in tube to the capsule's heat shield with the umbilical strapped up it, a release head at its top,
         and the umbilical from the head up round the cone to the receptacle under the periscope's lens.

Each fell straight out from the vehicle about its hinge (S61-02407: the capsule's lying on the pad at ignition, the
booster's a third of the way over; FHSU items 118, 126 and 134: both lying out from the table after MR-4 had gone).

Each mast is its own top-level node with its origin on its hinge pin, so it can fall; its shoe stays on the launcher.
"""

from __future__ import annotations

import math

from srlib import FT

from .site import (
    BOOSTER_BAND,
    LAUNCHER_TOP,
    MAST_HINGE_Z,
    PACKAGE_HALF,
    PACKAGE_REACH,
    POLE_R,
    SHIELD_Z,
    P,
    Parts,
    axes,
    fine,
    ftp,
    mast_frame,
    obox,
    receptacle,
)

DECK = LAUNCHER_TOP - 0.2  # the launcher's table, where the shoes are bolted (launcher.py)
BOOSTER_TOP = BOOSTER_BAND + 5.5  # the top of No. 1's pole (items 466 and 333: 4.7 and 6.1 ft over the foot of the chequers)
PACKAGE_Z = (BOOSTER_BAND - 0.4, BOOSTER_BAND + 2.2)  # the cooling package, foot and top (466: -0.5 to +2.2; 333: -0.2 to +2.2)
CAPSULE_TOP = SHIELD_Z + 0.45  # the top of No. 2's pole, and its release head 0.8 ft more (466 and 468: 0.9 and 1.3 ft over the shield)
HEAD = 0.8
BODY_R = 35.0 / 12  # the booster's skin, which the steady and the boom plug stop short of


def frame(which: str):
    """A mast's own directions: `at(out, round, z)` is a point so far out from the vehicle, so far round it and so high."""
    (x, y), out, rnd = mast_frame(which)

    def at(u: float, v: float, z: float) -> tuple[float, float, float]:
        return (x + out[0] * u + rnd[0] * v, y + out[1] * u + rnd[1] * v, z)

    return at, (*out, 0.0), (*rnd, 0.0)


def hinge(parts: Parts, node: str, which: str, collar: float) -> None:
    """The foot: a shoe bolted to the launcher's table with a lug standing on it, and on the mast a fork over the lug
    with the pin through both and a collar the tube stands in (FHSU item 134 shows the booster's so). The pin lies
    across the way the mast falls. The shoe is the launcher's; the fork, pin and collar are the mast's."""
    at, out, rnd = frame(which)
    up = (0.0, 0.0, 1.0)
    z = MAST_HINGE_Z
    shoe = parts("LaunchPedestal", "grey", True)
    obox(shoe, at(0, 0, DECK + 0.02), out, up, (0.72, 0.5, 0.14))
    obox(shoe, at(0, 0, (DECK + z) / 2 + 0.04), out, up, (0.28, 0.12, z - DECK - 0.08))
    shoe.tube(P(*at(0, -0.066, z)), P(*at(0, 0.066, z)), 0.17 * FT, 16)  # the lug's round head, the pin through it
    if fine():
        for u in (-0.28, 0.28):
            for v in (-0.18, 0.18):
                shoe.disc(P(*at(u, v, DECK + 0.09)), up, 0.045 * FT, 0.04 * FT, 6)
    m = parts(node, "grey", True)
    m.tube(P(*at(0, -0.21, z)), P(*at(0, 0.21, z)), 0.06 * FT, 12)
    for v in (-0.125, 0.125):
        obox(m, at(0, v, z + 0.15), out, up, (0.36, 0.05, 0.75))
    m.lathe(ftp([(0.0, z + 0.3), (collar, z + 0.3), (collar, z + 0.62), (0.0, z + 0.62)]), 20, matrix=axes(at(0, 0, 0), out, up))


def pole(m, which: str, top: float, every: float) -> None:
    """The tube, from its collar to a capped top, with a welded band every so far up it (item 134 has the bands)."""
    at, out, _ = frame(which)
    r = POLE_R[which]
    m.lathe(
        ftp([(0.0, MAST_HINGE_Z + 0.6), (r, MAST_HINGE_Z + 0.6), (r, top - 0.06), (r * 0.7, top + 0.05), (0.0, top + 0.05)]),
        16,
        matrix=axes(at(0, 0, 0), out, (0, 0, 1)),
    )
    if fine():
        z = MAST_HINGE_Z + every
        while z < top - 2.0:
            m.tube(P(*at(0, 0, z - 0.08)), P(*at(0, 0, z + 0.08)), (r + 0.035) * FT, 16)
            z += every


def build(parts: Parts) -> None:
    capsule(parts)
    booster(parts)


def capsule(parts: Parts) -> None:
    """No. 2: the pole to the heat shield, the umbilical strapped up it, the release head, the umbilical to the capsule."""
    which, node = "capsule", "UmbilicalMast"
    at, _, _ = frame(which)
    parts.node(node, None, at(0, 0, MAST_HINGE_Z))
    hinge(parts, node, which, 0.26)
    m, cable = parts(node, "grey", True), parts(node, "cable/lines", True)  # (not "cable": the umbilical's node has that name)
    top = CAPSULE_TOP
    pole(m, which, top, 8.0)
    # the release head: a box on the pole's top, the valve's body on its outer face (TM X-53107, T-540: "capsule mast release valve")
    obox(parts(node, "grey/head"), at(0, 0, top + HEAD / 2 + 0.06), frame(which)[1], (0, 0, 1), (0.5, 0.46, HEAD))
    m.tube(P(*at(0.25, 0, top + 0.45)), P(*at(0.52, 0, top + 0.45)), 0.1 * FT, 12)
    # the umbilical, strapped up the pole's side from the table to the head, and the eject control line beside it
    run = [at(0.0, 0.29, z) for z in (MAST_HINGE_Z + 1.1, 20.0, 40.0, top - 1.2)] + [at(0.0, 0.31, top + 0.25)]
    cable.loft([P(*p) for p in run], [(0.1 * FT, 0.1 * FT)] * len(run), 10, ref=(0, 0, 1), resample=1)
    cable.tube(P(*at(0.22, -0.12, MAST_HINGE_Z + 1.0)), P(*at(0.22, -0.12, top - 0.2)), 0.03 * FT, 6)
    if fine():
        z = MAST_HINGE_Z + 4.0
        while z < top - 2.0:  # the straps
            obox(m, at(0.0, 0.2, z), (0, 0, 1), frame(which)[2], (0.12, 0.5, 0.46))
            z += 8.0

    # The umbilical itself is a node of its own (UmbilicalMast_Cable), hinged where it leaves the head: when the plug is
    # pulled and the mast goes over, it swings on with it and lies from the fallen head on the pad. It rises from the
    # head beside the heat shield's rim and goes up round the cone, under the periscope's open door, to the receptacle
    # of the capsule that stood there on the date being built.
    ux, uy, uz = receptacle()

    def round_cone(a: float, station: float, off: float) -> tuple[float, float, float]:
        "A point `off` ft out from the capsule's skin, `a` degrees round from +X, at a station in inches."
        r = (37.25 - station * math.tan(math.radians(20.0))) / 12 + off
        return (r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), LAUNCHER_TOP + (716.0 + station) / 12)

    out = math.hypot(ux, uy)
    pivot = at(-0.2, 0.0, top + HEAD + 0.02)
    parts.node("UmbilicalMast_Cable", node, pivot)
    path = [pivot, at(-0.34, -0.02, top + HEAD + 0.3), round_cone(119.0, 19.0, 0.36), round_cone(128.0, 23.0, 0.27), round_cone(135.0, 26.0, 0.2)]
    path += [(ux * (out + 0.2) / out, uy * (out + 0.2) / out, uz)]
    parts("UmbilicalMast_Cable", "cable", True).loft([P(*p) for p in path], [(0.13 * FT, 0.13 * FT)] * len(path), 10, ref=(0.3, 0.3, 0.9))


def booster(parts: Parts) -> None:
    """No. 1: the pole, its steady against the booster, the cooling package and its coiled hose, the hoses to the booster."""
    which, node = "booster", "BoosterMast"
    at, out, rnd = frame(which)
    up = (0.0, 0.0, 1.0)
    parts.node(node, None, at(0, 0, MAST_HINGE_Z))
    hinge(parts, node, which, 0.31)
    m, white, dark, hose = parts(node, "grey", True), parts(node, "white", True), parts(node, "chassis"), parts(node, "cable/hoses", True)
    r, top = POLE_R[which], BOOSTER_TOP
    pole(m, which, top, 6.5)
    skin = -((mast_frame(which)[0][0] ** 2 + mast_frame(which)[0][1] ** 2) ** 0.5) + BODY_R  # the booster's skin, from the pole's middle
    # the steady: two struts in to a shoe that stops 5/8 in short of the skin, just under the chequers (items 466 and 333)
    for z in (BOOSTER_BAND - 1.25, BOOSTER_BAND - 0.55):
        m.tube(P(*at(-r + 0.03, 0, z)), P(*at(skin + 0.1, 0, z)), 0.05 * FT, 8)
    obox(m, at(skin + 0.08, 0, BOOSTER_BAND - 0.9), out, up, (0.06, 0.5, 1.0))
    # the cooling package, outboard: the coolant's vessel, white, round-bottomed, under the box of its blower and
    # valves, on two arms from the pole (TM X-53107 4.2.3: "the coolant container, blower, check valve, vent valve,
    # control box"); the LN2 line down the pole from it
    z0, z1 = PACKAGE_Z
    mid, split = 1.15, z0 + 1.5
    white.lathe(
        ftp([(0.0, z0), (0.3, z0 + 0.03), (0.47, z0 + 0.2), (0.52, z0 + 0.5), (0.52, split), (0.0, split)]),
        20,
        matrix=axes(at(mid, 0, 0), out, up),
    )
    obox(dark, at(mid, 0, (split + 0.06 + z1) / 2), out, up, (1.1, 1.2, z1 - split - 0.06))
    for z in (z0 + 0.75, z1 - 0.35):
        for v in (-0.3, 0.3):
            m.tube(P(*at(r - 0.03, v * 0.5, z)), P(*at(mid - 0.4, v, z)), 0.045 * FT, 8)
    if fine():
        for z in (z0 + 0.62, split - 0.2):  # the bands the vessel hangs in
            white.tube(P(*at(mid, 0, z - 0.04)), P(*at(mid, 0, z + 0.04)), 0.545 * FT, 20)
    white.tube(P(*at(r + 0.07, 0.17, MAST_HINGE_Z + 1.2)), P(*at(r + 0.07, 0.17, z0 + 0.6)), 0.04 * FT, 8)
    # the hose coiled behind the package, hung in a long loop (466: the dark loop outboard of the white vessel)
    cu, cz, ru, rz, rh = PACKAGE_REACH - 0.07 - 0.36, (z0 + z1) / 2 + 0.05, 0.36, 0.95, 0.07
    coil = [at(cu + ru * math.sin(math.tau * k / 24), 0.16 * (k / 24 - 1), cz + rz * math.cos(math.tau * k / 24)) for k in range(49)]  # two turns
    hose.loft([P(*p) for p in coil], [(rh * FT, rh * FT)] * len(coil), 8, ref=rnd, resample=1)
    m.tube(P(*at(mid + 0.5, 0, cz + rz - 0.1)), P(*at(cu, 0, cz + rz - 0.1)), 0.04 * FT, 6)  # the hook it hangs on
    assert cu + ru + rh <= PACKAGE_REACH + 1e-6 and PACKAGE_HALF >= 0.62  # what level 2's floor is cut round (site.package_cut)
    # From the package up the pole's outer side, over its top in a saddle and in to the booster: the two air ducts
    # (out to the package and back) and the boom plug's cable between them, to a plate that stops 5/8 in short of
    # the skin 3 to 5 ft up the chequered section (466 and 333)
    arch = [(0.93, z1 - 0.05), (0.6, z1 + 1.0), (0.52, top - 1.6), (0.47, top - 0.5), (0.3, top + 0.42), (-0.08, top + 0.68)]
    arch += [(-0.42, top + 0.4), (-0.56, top - 0.3), (-0.5, top - 0.95), (-0.44, top - 1.26), (skin + 0.13, top - 1.3)]  # square on to the plate
    for v, rr in ((-0.23, 0.13), (0.23, 0.13), (0.0, 0.07)):
        hose.loft([P(*at(u, v, z)) for u, z in arch], [(rr * FT, rr * FT)] * len(arch), 10, ref=rnd, resample=2)
    obox(m, at(skin + 0.09, 0, top - 1.3), out, up, (0.06, 0.9, 0.8))  # the plate the plugs are on
    obox(m, at(0.0, 0, top + 0.09), out, up, (0.5, 0.78, 0.1))  # the saddle on the pole's top
    hose.tube(P(*at(-0.2, r + 0.05, MAST_HINGE_Z + 1.0)), P(*at(-0.2, r + 0.05, top - 0.3)), 0.03 * FT, 6)  # the eject control line


def resting() -> dict[str, float]:
    """How far over each mast goes before something of it is on the pad: degrees from upright, about its pin. What comes
    down first is the booster's coiled hose and the capsule's release head; each stops a finger's breadth clear."""

    def over(points) -> float:
        "The least turn at which one of `points` (so far up from the pin, so far out) is 0.06 ft off the pad."
        best = 180.0
        for a, b in points:
            k = math.hypot(a, b)
            best = min(best, math.degrees(math.acos((0.06 - MAST_HINGE_Z) / k) - math.atan2(b, a)))
        return best

    z0, z1 = PACKAGE_Z
    coil = [((z0 + z1) / 2 + 0.05 + dz - MAST_HINGE_Z, PACKAGE_REACH) for dz in (-0.5, 0.0, 0.5, 1.02)]
    package = [(z1 - MAST_HINGE_Z, 1.15 + 0.55)]
    head = [(CAPSULE_TOP + HEAD + 0.06 - MAST_HINGE_Z, 0.25), (CAPSULE_TOP + 0.45 - MAST_HINGE_Z, 0.52 + 0.1)]
    return {"BoosterMast": over(coil + package), "UmbilicalMast": over(head)}
