"""The cars and trucks parked at the blockhouse on a launch morning.

FHSU F16_016 (July 1961) shows about a dozen American sedans and station wagons of the late
1950s nose-in along the ready-room building and the drive, a white pickup with a box body and a
round insignia on its door beside the blockhouse, and a light forward-control van by the hut. No
photograph of the blockhouse's parking on 5 May has been found, so which cars stood where that
morning is not known: these are that photograph's kinds of vehicle in that photograph's places.
Their makes are not identified; sizes are typical of the period (a full-size sedan 17 to 18 ft long
and 6.4 ft wide). Everything here is estimated.

A vehicle is built in its own frame (+X forward, origin on the ground under its middle) and placed
on the site turned to its heading.
"""

from __future__ import annotations

from mathutils import Matrix

from srlib import FT, MeshBuilder

from .blockhouse import APRON, S
from .site import GROUND, P, Parts, arch, box, fine, ftp, hull, placed, plate


class Kit:
    """One vehicle's meshes by material, in its own frame."""

    def __init__(self) -> None:
        self.mbs: dict[str, MeshBuilder] = {}

    def __call__(self, mat: str) -> MeshBuilder:
        return self.mbs.setdefault(mat, MeshBuilder())

    def place(self, parts: Parts, node: str, at, heading: float) -> None:
        smooth = {"tyre", "chrome", "lamp", "taillamp"}
        for mat, mb in self.mbs.items():
            base = mat.split("/")[0]
            placed(parts(node, mat, base in smooth or base.startswith("car-") or base == "trailer"), mb, at, heading)


def wheels(kit: Kit, xs, track: float, r: float, w: float = 0.62) -> None:
    for x in xs:
        for s in (-1, 1):
            y0, y1 = sorted((s * (track / 2 - w / 2), s * (track / 2 + w / 2)))
            kit("tyre").tube(P(x, y0, r), P(x, y1, r), r * FT, 16)
            kit("chrome").tube(P(x, s * (track / 2 + w / 2 - 0.02), r), P(x, s * (track / 2 + w / 2 + 0.05), r), r * 0.55 * FT, 12)


def sedan(paint: str, *, wagon: bool = False, fins: bool = True, roof: str | None = None, length: float = 17.4) -> Kit:
    """A full-size American car of 1955 to 1960: a long low body, a glasshouse set back on it."""
    kit = Kit()
    k = length / 17.4
    body, glass = kit(paint), kit("glass")
    w = 3.15
    hull(
        body,
        [
            arch(-8.7 * k, 2.3, 1.5, 2.6, 0.45),
            arch(-8.35 * k, 2.95, 1.05, 3.05, 0.5),
            arch(-5.0 * k, w, 0.9, 3.2, 0.42),
            arch(2.4 * k, w, 0.9, 3.28, 0.42),
            arch(6.4 * k, w - 0.05, 0.95, 3.15, 0.5),
            arch(8.3 * k, 2.95, 1.1, 2.95, 0.6),
            arch(8.7 * k, 2.4, 1.45, 2.6, 0.5),
        ],
    )
    back = -8.0 * k if wagon else -4.9 * k
    rear_top = -7.3 * k if wagon else -3.3 * k
    hull(
        glass,
        [
            arch(back, 2.7, 3.12, 3.3, 0.1),
            arch(rear_top, 2.42, 3.12, 4.72, 0.45),
            arch(1.0 * k, 2.42, 3.12, 4.78, 0.45),
            arch(2.9 * k, 2.7, 3.12, 3.3, 0.1),
        ],
    )
    top = kit(roof or paint)
    hull(top, [arch(rear_top - 0.25, 2.5, 4.55, 4.86, 0.3), arch(1.25 * k, 2.5, 4.55, 4.92, 0.3)])
    pillars = [rear_top + 0.1, -0.9 * k, 1.0 * k] + ([-4.2 * k] if wagon else [])
    for x in pillars:
        for s in (-1, 1):
            y0, y1 = sorted((s * 2.3, s * 2.56))
            box(top, (x - 0.14, y0, 3.2), (x + 0.14, y1, 4.6))
    kit("interior").add(*seats(back + 0.8, 2.2 * k))
    if fins and not wagon:
        for s in (-1, 1):
            y = s * 2.82
            plate(body, [(-8.5 * k, y, 2.9), (-4.6 * k, y, 3.1), (-8.6 * k, y, 3.85)], 0.3)
    chrome = kit("chrome")
    box(chrome, (8.6 * k, -3.1, 1.25), (8.95 * k, 3.1, 1.75))
    box(chrome, (-8.95 * k, -3.05, 1.25), (-8.6 * k, 3.05, 1.75))
    box(chrome, (8.5 * k, -2.0, 1.85), (8.74 * k, 2.0, 2.45))  # the grille
    for s in (-1, 1):
        kit("lamp").lathe(
            ftp([(0.0, 0.0), (0.33, 0.0), (0.28, 0.12), (0.0, 0.16)]),
            10,
            matrix=Matrix.Translation(P(8.42 * k, s * 2.35, 2.45)) @ Matrix.Rotation(1.5708, 4, "Y"),
        )
        y0, y1 = sorted((s * 2.1, s * 2.7))
        box(kit("taillamp"), (-8.62 * k, y0, 2.2), (-8.3 * k, y1, 2.55))
        if fine():  # the spear down each side
            ya, yb = sorted((s * (w - 0.02), s * (w + 0.04)))
            box(chrome, (-7.6 * k, ya, 2.35), (6.6 * k, yb, 2.47))
    wheels(kit, (-5.0 * k, 5.3 * k), 5.0, 1.17)
    return kit


def seats(x0: float, x1: float):
    """The dark of a car's inside: a floor pan and two bench backs, as (verts, faces)."""
    mb = MeshBuilder()
    box(mb, (x0, -2.25, 2.0), (x1, 2.25, 3.0))
    for x in (x0 + 0.4, (x0 + x1) / 2 - 0.2):
        box(mb, (x, -2.2, 3.0), (x + 0.5, 2.2, 4.1))
    return mb.verts, mb.faces


def pickup(paint: str) -> Kit:
    """The white pickup beside the blockhouse: a half-ton with a box body in place of its bed and a
    round insignia on the door (F16_016)."""
    kit = Kit()
    body, glass = kit(paint), kit("glass")
    hull(
        body, [arch(1.0, 3.1, 1.3, 3.5, 0.3), arch(4.0, 3.1, 1.3, 3.6, 0.45), arch(7.4, 3.0, 1.35, 3.45, 0.6), arch(8.3, 2.7, 1.5, 3.1, 0.6)]
    )  # cab floor and bonnet
    hull(glass, [arch(0.9, 2.75, 3.4, 5.55, 0.4), arch(3.2, 2.75, 3.4, 5.6, 0.4), arch(4.6, 2.9, 3.4, 3.6, 0.1)])
    hull(body, [arch(0.7, 2.85, 5.4, 5.72, 0.3), arch(3.4, 2.85, 5.4, 5.76, 0.3)])
    for x in (1.0, 3.25):
        for s in (-1, 1):
            y0, y1 = sorted((s * 2.6, s * 2.9))
            box(body, (x - 0.16, y0, 3.45), (x + 0.16, y1, 5.5))
    box(body, (0.6, -2.8, 3.45), (0.86, 2.8, 5.5))  # the cab's back
    kit("interior").add(*seats(1.2, 4.2))
    box(kit(paint + "/box"), (-8.0, -3.25, 2.3), (0.55, 3.25, 7.3))  # the box body
    if fine():
        for x in (-7.8, -5.0, -2.2, 0.35):
            box(kit(paint + "/box"), (x - 0.08, -3.3, 2.3), (x + 0.08, 3.3, 7.34))
    box(kit("glass"), (-8.06, 0.3, 4.6), (-7.99, 2.4, 6.3))  # the back doors' windows
    box(kit("glass"), (-8.06, -2.4, 4.6), (-7.99, -0.3, 6.3))
    for s in (-1, 1):
        kit("blue").lathe(
            ftp([(0.0, 0.0), (0.62, 0.0), (0.62, 0.04), (0.0, 0.04)]),
            16,
            matrix=Matrix.Translation(P(2.6, s * 3.1, 2.75)) @ Matrix.Rotation(-s * 1.5708, 4, "X"),
        )
        kit("lamp").lathe(
            ftp([(0.0, 0.0), (0.33, 0.0), (0.28, 0.12), (0.0, 0.16)]),
            10,
            matrix=Matrix.Translation(P(8.18, s * 2.2, 2.75)) @ Matrix.Rotation(1.5708, 4, "Y"),
        )
    box(kit("chrome"), (8.4, -3.1, 1.5), (8.75, 3.1, 1.95))
    box(kit("chrome"), (-8.4, -3.1, 1.6), (-8.0, 3.1, 2.0))
    box(kit("chassis"), (-8.0, -1.6, 1.6), (7.5, 1.6, 2.32))
    wheels(kit, (-4.6, 5.6), 5.56, 1.3, 0.7)
    return kit


def van(paint: str) -> Kit:
    """The forward-control van by the hut: a box on wheels with a band of windows."""
    kit = Kit()
    body, glass = kit(paint), kit("glass")
    hull(body, [arch(-7.4, 2.9, 1.2, 3.75, 0.2), arch(5.6, 2.9, 1.2, 3.75, 0.2), arch(7.0, 2.8, 1.3, 3.75, 0.5), arch(7.4, 2.4, 1.8, 3.75, 0.6)])
    hull(glass, [arch(-7.3, 2.72, 3.6, 5.5, 0.3), arch(5.4, 2.72, 3.6, 5.5, 0.3), arch(7.1, 2.55, 3.6, 5.3, 0.5)])
    hull(body, [arch(-7.45, 2.86, 5.35, 6.1, 0.55), arch(5.8, 2.86, 5.35, 6.1, 0.55), arch(7.2, 2.6, 5.2, 5.75, 0.5)])
    for x in (-7.2, -4.2, -1.2, 1.8, 4.6):
        for s in (-1, 1):
            y0, y1 = sorted((s * 2.6, s * 2.86))
            box(body, (x - 0.18, y0, 3.7), (x + 0.18, y1, 5.4))
    box(body, (-7.42, -2.7, 3.7), (-7.2, -0.1, 5.4))
    box(kit("interior"), (-7.0, -2.4, 2.4), (5.0, 2.4, 3.5))
    for x in (-4.0, -0.5, 3.4):
        box(kit("interior"), (x, -2.3, 3.5), (x + 0.5, 2.3, 4.6))
    for s in (-1, 1):
        kit("lamp").lathe(
            ftp([(0.0, 0.0), (0.33, 0.0), (0.28, 0.12), (0.0, 0.16)]),
            10,
            matrix=Matrix.Translation(P(7.32, s * 1.9, 2.9)) @ Matrix.Rotation(1.5708, 4, "Y"),
        )
    box(kit("chrome"), (7.35, -2.9, 1.3), (7.7, 2.9, 1.75))
    box(kit("chrome"), (-7.7, -2.9, 1.3), (-7.35, 2.9, 1.75))
    wheels(kit, (-4.2, 4.9), 5.0, 1.2)
    return kit


def build(parts: Parts) -> None:
    g = "Vehicles"
    parts.node(g)
    on_shell, on_ground = APRON, GROUND
    # nose-in along the ready rooms' far wall, on the shell
    row = [("car-seafoam", {"roof": "car-white"}), ("car-cream", {}), ("car-black", {}), ("car-blue", {"wagon": True})]
    for k, (paint, kw) in enumerate(row):
        sedan(paint, **kw).place(parts, g, (*S(60.5 + k * 8.4, -69.5), on_shell), 90.0 + (2, -3, 1, -2)[k])
    # along the drive behind the blockhouse
    for k, (paint, kw, turn) in enumerate(
        (("car-white", {"roof": "car-blue"}, 268.0), ("car-red", {"roof": "car-white"}, 271.0), ("car-olive", {"wagon": True, "fins": False}, 266.0))
    ):
        sedan(paint, **kw).place(parts, g, (*S(114.0, -30.0 + k * 20.5), on_shell), turn)
    # the pickup with the box body, on the shell in front of the breezeway
    pickup("trailer").place(parts, g, (*S(46.0, -38.0), on_shell), 172.0)
    # at the hut by the road
    van("car-white").place(parts, g, (286.0, -148.0, on_ground), 185.0)
    sedan("car-black", fins=False, length=16.4).place(parts, g, (300.0, -146.5, on_ground), 92.0)
    sedan("car-cream", roof="car-seafoam").place(parts, g, (309.5, -146.0, on_ground), 88.0)
