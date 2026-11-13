"""The two cable masts. TM X-53107's countdown names them: No. 1 for the booster, No. 2 for the
capsule, each with an eject control line (T-390). No. 2 was held by a pneumatic release valve and
pulled away by a bungee cord (T-325, T-45); the capsule's umbilical dropped at about T-35 s. No. 1
carried the booster's "boom plug" and its cooling package with the LN2 boom tank (4.2.3, T-380),
and "boom drop" came at about T-14 s.

Their form is from photographs, not drawings: a slender tube a few feet from the vehicle, about
55 to 60 ft tall (S63-02651, MR-4; Hammack Fig. 23), seen pivoting away about its foot at ignition
(S61-02407, MR-3). Which photographed pole is which mast is not established; the booster's here is
an estimate of the same form.

Each mast is its own top-level node with its origin on its foot's hinge pin, so it can fall."""

from __future__ import annotations

import math

from mathutils import Matrix

from srlib import FT

from .site import LAUNCHER_TOP, MAST_NOTCH, SHIELD_Z, P, Parts, box, fine, obox, receptacle

HINGE_Z = 1.0  # the pin, above the hardstand
# No. 2 stands on the umbilical's side of the vehicle, between two fins, in the split of the
# service structure's platforms, which close round it (site.MAST_NOTCH): behind the vehicle, 45
# degrees round from the receptacle, which is under the periscope's lens. Its head stays under
# level 3; the umbilical rises past the white room's floor beside the capsule, below the heat
# shield's rim, and goes up round the cone, under the periscope's open door, to the receptacle.
CAPSULE_FOOT = (0.0, MAST_NOTCH[0])
CAPSULE_TOP = 62.3  # the pole's top, above level 2's roof
# No. 1 stands just in front of the platforms, its boom between levels 1 and 2 (estimated).
BOOSTER_FOOT = (-3.0, -13.5)
BOOSTER_PLUG_Z = 49.3


def foot(parts: Parts, node: str, x: float, y: float, axis: str) -> None:
    """The hinge: a base plate, two cheeks and the pin. The base stays with the pad; the cheeks are
    drawn on the mast so the pin turns in them."""
    base = parts("Hardstand", "grey", True)
    box(base, (x - 1.2, y - 1.2, -0.2), (x + 1.2, y + 1.2, 0.35))
    m = parts(node, "grey", True)
    along = (1, 0, 0) if axis == "x" else (0, 1, 0)
    for side in (-1, 1):
        if axis == "x":
            box(m, (x + side * 0.55 - 0.09, y - 0.3, 0.4), (x + side * 0.55 + 0.09, y + 0.3, 1.5))
        else:
            box(m, (x - 0.3, y + side * 0.55 - 0.09, 0.4), (x + 0.3, y + side * 0.55 + 0.09, 1.5))
    m.tube(P(x - 0.75 * along[0], y - 0.75 * along[1], HINGE_Z), P(x + 0.75 * along[0], y + 0.75 * along[1], HINGE_Z), 0.12 * FT, 10)


def build(parts: Parts) -> None:
    # ---- No. 2, the capsule's: its head under level 3, the umbilical up beside the capsule
    x, y = CAPSULE_FOOT
    parts.node("UmbilicalMast", None, (x, y, HINGE_Z))
    foot(parts, "UmbilicalMast", x, y, "x")
    m, head, cable = parts("UmbilicalMast", "grey", True), parts("UmbilicalMast", "yellow"), parts("UmbilicalMast", "cable", True)
    top = CAPSULE_TOP
    tube(m, x, y, top)
    box(head, (x - 0.5, y - 0.5, top), (x + 0.5, y + 0.5, top + 1.3))  # the release head
    ux, uy, uz = receptacle()  # of the capsule that stood there on the date being built

    def round_cone(a: float, station: float, off: float) -> tuple[float, float, float]:
        "A point `off` ft out from the capsule's skin, `a` degrees round from +X, at a station in inches."
        r = (37.25 - station * math.tan(math.radians(20.0))) / 12 + off
        return (r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), LAUNCHER_TOP + (716.0 + station) / 12)

    out = math.hypot(ux, uy)
    # The umbilical is a node of its own (UmbilicalMast_Cable), hinged where it leaves the release head: when the plug is
    # pulled and the mast goes over, it swings down with it and hangs from the fallen head to the pad, rather than
    # standing up from it.
    parts.node("UmbilicalMast_Cable", "UmbilicalMast", (x, y - 0.45, top + 0.9))
    run = parts("UmbilicalMast_Cable", "cable", True)
    path = [(x, y - 0.45, top + 0.9), (x, 6.2, top + 1.0), (x, 4.6, top + 1.05), (x, 3.45, top + 1.3), (x, 3.42, SHIELD_Z + 0.3)]
    path += [round_cone(100.0, 12.0, 0.3), round_cone(122.0, 20.0, 0.27), round_cone(135.0, 26.0, 0.2)]
    path += [(ux * (out + 0.2) / out, uy * (out + 0.2) / out, uz)]
    run.loft([P(*p) for p in path], [(0.15 * FT, 0.15 * FT)] * len(path), 10, ref=(0.3, 0.3, 0.9))
    lanyard(cable, x, y, top)

    # ---- No. 1, the booster's: its boom reaches the booster's skin, cooling package on top
    x, y = BOOSTER_FOOT
    parts.node("BoosterMast", None, (x, y, HINGE_Z))
    foot(parts, "BoosterMast", x, y, "x")
    m, pack, cable = parts("BoosterMast", "grey", True), parts("BoosterMast", "white"), parts("BoosterMast", "cable", True)
    top = BOOSTER_PLUG_Z - 1.3
    tube(m, x, y, top)
    box(pack, (x - 0.9, y - 1.1, top), (x + 0.9, y + 1.1, top + 2.6))  # cooling package and LN2 boom tank
    skin = (0.0, -3.0, BOOSTER_PLUG_Z)  # the plug, on the booster's -Y side
    d = (skin[0] - x, skin[1] - y, 0.0)
    length = (d[0] ** 2 + d[1] ** 2) ** 0.5
    obox(m, ((x + skin[0]) / 2, (y + skin[1]) / 2, BOOSTER_PLUG_Z), d, (0, 0, 1), (length - 1.2, 0.4, 0.4))  # the boom
    obox(m, (skin[0], skin[1] - 0.25, BOOSTER_PLUG_Z), d, (0, 0, 1), (0.4, 1.1, 1.1))  # boom plug, against the skin
    path = [(x + 0.3, y + 1.0, top + 1.2), (x * 0.6, y * 0.6 - 1.2, BOOSTER_PLUG_Z + 0.6), (0.2, -3.6, BOOSTER_PLUG_Z + 0.4)]
    cable.loft([P(*p) for p in path], [(0.1 * FT, 0.1 * FT)] * len(path), 8, ref=(0, 0, 1))
    lanyard(cable, x, y, top)


def tube(m, x: float, y: float, top: float) -> None:
    m.lathe(
        [(0.0, 1.5 * FT), (0.34 * FT, 1.5 * FT), (0.22 * FT, top * FT), (0.0, top * FT)],
        16,
        matrix=Matrix.Translation(P(x, y, 0)),
    )
    m.tube(P(x, y, HINGE_Z - 0.25), P(x, y, 1.6), 0.3 * FT, 12)  # the knuckle round the pin
    if fine():
        z = 11.0
        while z < top - 2.0:
            r = 0.34 - 0.12 * (z - 1.5) / (top - 1.5)
            m.tube(P(x, y, z - 0.15), P(x, y, z + 0.15), (r + 0.05) * FT, 16)
            z += 10.0


def lanyard(cable, x: float, y: float, top: float) -> None:
    """The eject control line down the mast (TM X-53107, T-390 item 9)."""
    cable.tube(P(x + 0.4, y + 0.4, 1.8), P(x + 0.3, y + 0.3, top - 0.5), 0.035 * FT, 6)
