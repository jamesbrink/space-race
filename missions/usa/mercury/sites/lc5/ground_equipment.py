"""What else stood on the pad at liftoff, the floodlights and the camera towers.

None of these positions is documented, and two things are dated: the emergency shower (NASA's
prelaunch photograph of MR-3 with the cherry picker at the capsule, GPN-2000-001006, and KSC-61-4457
of 2 May 1961, show it at the pad's edge: a tubular frame on a cart, its sign a red cross on a
saltire) and the white trailer lettered "NASA SP-No 1" beside the structure's base (S61-03158). The
huts at the hatch side's edge and the striped barricade are FHSU F16_017 and F16_015, of July 1961,
and so are the floodlights' timber poles with two or three lamps on a crossarm. TM X-53107's countdown says the LOX topping trailer and the
LN2 trailers stayed through liftoff (T-60 s "LOX topping Off"; secured after the launch); MR-3
photographs (S61-01927, S61-02407/08) and MR-4's (S63-02651) show two white enclosures near the
launcher, one with a horizontal tank on top, a low box painted in orange and black chevrons, tripod
cameras, lattice camera towers, and floodlight poles with a crossarm carrying two lamps. All are
placed off the rails' corridor and off the hatch side, where the cherry picker stood; all estimated.
"""

from __future__ import annotations

import math

from mathutils import Vector

import interiors
import sitelib
import srlib
import vehicles as cars
from srlib import FT, interior

from .site import (
    P,
    Parts,
    axes,
    beam,
    box,
    ear_clip,
    fine,
    ftp,
    lattice,
    lettering,
    offset_poly,
    plate,
    ring,
    searchlight,
    slab,
    stood,
    timber_pole,
    wall_door,
    window,
)

FLOOD_POLES = ((-104.0, -62.0), (-104.0, 62.0), (-62.0, -104.0), (62.0, -104.0), (104.0, -70.0), (104.0, 66.0))  # in the grass at the pad's edge
FLOOD_HEIGHT = 40.0
CAMERA_TOWERS = ((-72.0, -38.0, 62.0), (-58.0, 78.0, 50.0))  # x, y, height
TRIPODS = ((-40.0, -30.0), (-45.0, 25.0), (30.0, -45.0), (-25.0, -55.0))


def build(parts: Parts) -> None:
    parts.node("GroundEquipment")
    white, dark, tank, stripe, black = (
        parts("GroundEquipment", "trailer"),
        parts("GroundEquipment", "chassis", True),
        parts("GroundEquipment", "trailer/tank", True),
        parts("GroundEquipment", "orange"),
        parts("GroundEquipment", "black"),
    )
    # the LOX topping unit: a horizontal insulated tank on a white enclosure, on a trailer's wheels
    x0, y0 = -30.0, -26.0
    u = "GroundEquipment_LoxTrailer"
    parts.node(u, "GroundEquipment", (x0, y0, 0.0), label="LOX topping trailer")
    white, dark, tank, black = parts(u, "trailer"), parts(u, "chassis", True), parts(u, "trailer/tank", True), parts(u, "black")
    box(white, (x0 - 4.0, y0 - 11.0, 1.6), (x0 + 4.0, y0 + 11.0, 8.0))
    box(dark, (x0 - 3.2, y0 - 10.0, 1.0), (x0 + 3.2, y0 + 10.0, 1.62))
    head = [(2.75 * math.sin(math.radians(t)), 2.5 * (1.0 - math.cos(math.radians(t)))) for t in range(0, 91, 9)]  # a 2:1 dished head
    tank.lathe(
        ftp(head + [(r_, 19.0 - z) for r_, z in reversed(head)]),
        48,
        matrix=axes((x0, y0 - 9.5, 10.85), (1, 0, 0), (0, 1, 0)),
    )
    for dy in (-6.0, 6.0):  # saddles, and a strap over the tank at each
        box(white, (x0 - 2.2, y0 + dy - 0.4, 8.0), (x0 + 2.2, y0 + dy + 0.4, 8.85))
        strap = ftp([(2.78, -0.2), (2.84, -0.2), (2.84, 0.2), (2.78, 0.2), (2.78, -0.2)])
        tank.lathe(strap, 48, matrix=axes((x0, y0 + dy, 10.85), (1, 0, 0), (0, 1, 0)))
    for side in (-1, 1):
        for dy in (-6.5, -3.5):
            trailer_wheel(parts, u, (x0 + side * 3.625, y0 + dy, 1.4), side)
    box(dark, (x0 - 0.5, y0 + 11.0, 0.9), (x0 + 0.5, y0 + 15.0, 1.3))  # drawbar
    if fine():
        for k in range(3):  # louvres and a door on the enclosure
            box(black, (x0 - 4.05, y0 - 8.0 + k * 3.0, 4.0), (x0 - 3.9, y0 - 6.0 + k * 3.0, 6.5))
        box(black, (x0 + 3.9, y0 + 2.0, 1.8), (x0 + 4.05, y0 + 5.0, 7.0))
    # the tank's fittings: a vent stack with its cap, relief valves, a manway; the control end and the hose end
    metal = parts(u, "grey/fittings", True)
    metal.tube(P(x0, y0 - 7.5, 13.4), P(x0, y0 - 7.5, 17.5), 0.12 * FT, 10)
    metal.lathe(ftp([(0.0, 0.0), (0.4, 0.0), (0.4, 0.25), (0.0, 0.4)]), 12, matrix=axes((x0, y0 - 7.5, 17.6), (1, 0, 0), (0, 0, 1)))
    for dy in (-3.0, -2.2):
        metal.tube(P(x0 + 0.6, y0 + dy, 13.3), P(x0 + 0.6, y0 + dy, 14.3), 0.1 * FT, 8)
    metal.lathe(ftp([(0.0, 0.0), (0.9, 0.0), (0.9, 0.25), (0.0, 0.25)]), 20, matrix=axes((x0, y0 + 2.0, 13.5), (1, 0, 0), (0, 0, 1)))
    end_fittings(parts, u, (x0, y0 - 11.0), -1, 8.0, "LOX TOPPING", seed=21)
    hose_end(parts, u, (x0, y0 + 11.0), 1, ("OXYGEN", "NO SMOKING"))

    # a second, smaller enclosure: LN2 or the peroxide unit (estimated)
    x1, y1 = -24.0, 22.0
    u = "GroundEquipment_NitrogenTrailer"
    parts.node(u, "GroundEquipment", (x1, y1, 0.0), label="Nitrogen trailer")
    white, dark, tank = parts(u, "trailer"), parts(u, "chassis", True), parts(u, "trailer/tank", True)
    box(white, (x1 - 4.0, y1 - 5.5, 1.6), (x1 + 4.0, y1 + 5.5, 7.5))
    box(dark, (x1 - 3.2, y1 - 4.5, 1.0), (x1 + 3.2, y1 + 4.5, 1.62))
    for side in (-1, 1):
        trailer_wheel(parts, u, (x1 + side * 3.625, y1 - 2.0, 1.4), side)
    tank.lathe(
        ftp([(0, 0), (1.3, 0), (1.3, 4.0), (1.15, 4.45), (0.8, 4.7), (0, 4.8)]),
        40,
        matrix=axes((x1 + 1.5, y1 + 2.0, 7.5), (1, 0, 0), (0, 0, 1)),
    )
    end_fittings(parts, u, (x1, y1 + 5.5), 1, 7.5, "LIQUID NITROGEN", seed=33)
    hose_end(parts, u, (x1, y1 - 5.5), -1, ("NITROGEN",))

    # the low box painted in chevrons, 15 to 20 ft from the launcher
    black = parts("GroundEquipment", "black")
    sx, sy = -20.0, 8.0  # clear of the service structure's base
    box(black, (sx - 4.5, sy - 2.0, 0.0), (sx + 4.5, sy + 2.0, 3.0))
    n = 6
    for k in range(n):  # orange chevrons on the long faces, a few millimetres proud of the black
        for face in (-1, 1):
            yy = sy + face * 2.02
            xa = sx - 4.5 + k * 9.0 / n
            pts = [(xa, 0.05), (xa + 0.7, 0.05), (xa + 0.7 + 0.75, 1.5), (xa + 0.7, 2.95), (xa, 2.95), (xa + 0.75, 1.5)]
            verts = [tuple(P(px, yy, pz)) for px, pz in pts]
            stripe.add(verts, [(0, 1, 2, 5), (5, 2, 3, 4)] if face < 0 else [(0, 5, 2, 1), (5, 4, 3, 2)])

    # tripod cameras round the pad (TM X-53107 7.5.5.3: twenty fixed cameras near the pad)
    for k, (tx, ty) in enumerate(TRIPODS, 1):  # each a 35 mm camera on a wooden tripod, aimed at the booster's tail
        cam = f"GroundEquipment_Camera{k}"
        parts.node(cam, "GroundEquipment", (tx, ty, 0.0), label="Engineering camera")
        sitelib.film_camera(parts, cam, (tx, ty), (0.0, 0.0, 12.0))

    # camera towers: narrow galvanised lattices with a platform at the top
    parts.node("CameraTowers", label="Camera towers")
    galv, deck = parts("CameraTowers", "galv"), parts("CameraTowers", "deck")
    for cx, cy, h in CAMERA_TOWERS:
        w = 2.5

        def corner(i: int, z: float, cx=cx, cy=cy, w=w):
            return (cx + w * (1 if i in (0, 3) else -1), cy + w * (1 if i < 2 else -1), z)

        levels = [0.3 + k * (h - 0.3) / round(h / 7) for k in range(round(h / 7) + 1)]
        lattice(galv, corner, levels, 0.28, 0.16)
        for z in (h * 0.55, h):
            box(deck, (cx - w - 0.6, cy - w - 0.6, z - 0.2), (cx + w + 0.6, cy + w + 0.6, z))
        box(black, (cx - 0.7, cy - 0.5, h), (cx + 0.7, cy + 0.5, h + 1.0))  # the camera
        # the way up: a ladder on the face toward the launcher, to the top deck (estimated)
        parts.ladder(
            "CameraTowers",
            f"tower{CAMERA_TOWERS.index((cx, cy, h)) + 1}",
            (cx + w + 0.95, cy, 0.0),
            (cx + w + 0.95, cy, h),
            face=(-1, 0, 0),
            mat="galv",
        )
        for z in (h * 0.3, h * 0.55, h * 0.8):
            for dy in (-0.74, 0.74):
                beam(galv, (cx + w + 0.95, cy + dy, z), (cx + w, cy + dy, z), 0.1)
        for i in range(4):
            px, py, _ = corner(i, 0)
            box(galv, (px - 0.6, py - 0.6, -FOOT_DEPTH), (px + 0.6, py + 0.6, 0.3))

    # floodlights: timber poles with a crossarm and three lamps, aimed at the vehicle
    parts.node("Floodlights")
    for x, y in FLOOD_POLES:
        timber_pole(parts, "Floodlights", x, y, FLOOD_HEIGHT, lamps=3, aim=(-x, -y, 0))

    furniture(parts)
    lights(parts)


def trailer_wheel(parts: Parts, node: str, centre, side: int) -> None:
    """A trailer's road wheel standing still: a tyre on a pressed-steel disc, its outer face toward `side` (+1: +X)."""
    m = axes(centre, (0, 1, 0), (side, 0, 0))
    tyre = [(0.85, -0.3), (1.15, -0.33), (1.32, -0.3), (1.4, -0.18), (1.4, 0.18), (1.32, 0.3), (1.15, 0.33), (0.85, 0.3)]
    parts(node, "tyre", True).lathe(ftp(tyre), 28, matrix=m)
    rim = [(0.0, -0.28), (0.86, -0.28), (0.86, 0.2), (0.55, 0.22), (0.3, 0.24), (0.27, 0.34), (0.0, 0.34)]
    parts(node, "grey/wheels", True).lathe(ftp(rim), 28, matrix=m)


def _wall(cx: float, yw: float, d: int):
    """A point on an end wall at y = yw whose outside faces d (+1: +Y): `a` across it (to the right of someone facing it), `out` from it."""
    return lambda a, out, z: (cx - d * a, yw + d * out, z)


def end_fittings(parts: Parts, g: str, at, d: int, top: float, title: str, *, seed: int = 1) -> None:
    """The working end of a cryogenic trailer's enclosure (estimated: the kind, not this one): a cabinet with its
    gauges and switches, two lines down the end with a valve and handwheel each, a gauge, and the hose coupling
    at the foot, on node `g`. `at` is (x, y) of the end wall's middle, `d` the way it faces (+1: +Y), `top` the enclosure's top."""
    W = _wall(at[0], at[1], d)
    right = (-d, 0, 0)
    case, metal = parts(g, "trailer/cabinets"), parts(g, "grey/fittings", True)
    box(case, *sorted_box(W(-3.4, -0.05, 3.0), W(-0.7, 0.55, 6.7)))
    interiors.panel(
        parts,
        g,
        sitelib.axes_local(W(-3.3, 0.55, 3.1), right, (0, 0, 1)),
        2.5,
        3.45,
        [("meters", 3), ("lamps", "gar"), ("switches", 4), ("label", "PRESS  LEVEL  FLOW")],
        title=title,
        font=srlib.load_font(),
        seed=seed,
    )
    for a in (1.0, 2.4):
        metal.tube(P(*W(a, 0.45, top - 0.4)), P(*W(a, 0.45, 2.2)), 0.12 * FT, 10)
        metal.tube(P(*W(a, -0.05, top - 0.4)), P(*W(a, 0.57, top - 0.4)), 0.12 * FT, 10)
        box(metal, *sorted_box(W(a - 0.25, 0.2, 4.3), W(a + 0.25, 0.7, 4.9)))  # the valve
        if fine():
            metal.tube(P(*W(a, 0.7, 4.6)), P(*W(a, 1.0, 4.6)), 0.04 * FT, 6)
            wheel = axes(W(a, 1.0, 4.6), (1, 0, 0), (0, d, 0))
            metal.lathe(ftp([(0.36, -0.04), (0.45, -0.04), (0.45, 0.04), (0.36, 0.04), (0.36, -0.04)]), 16, matrix=wheel)
            for k in range(3):
                q = math.tau * k / 3
                beam(metal, W(a, 1.0, 4.6), W(a + 0.38 * math.cos(q), 1.0, 4.6 + 0.38 * math.sin(q)), 0.05)
            gauge = axes(W(a, 0.55, 6.2), (1, 0, 0), (0, d, 0))  # a pressure gauge on the line
            metal.lathe(ftp([(0.0, 0.0), (0.22, 0.0), (0.22, 0.17), (0.0, 0.17)]), 14, matrix=gauge)
            parts(g, "sign/dials", True).lathe(ftp([(0.0, 0.17), (0.18, 0.17), (0.18, 0.185), (0.0, 0.185)]), 14, matrix=gauge)
        for z in (3.0, 6.9):  # brackets to the wall
            box(metal, *sorted_box(W(a - 0.06, -0.05, z - 0.1), W(a + 0.06, 0.45, z + 0.1)))
    metal.tube(P(*W(1.7, 0.45, 2.2)), P(*W(1.7, 1.1, 2.2)), 0.15 * FT, 10)  # the coupling at the foot, capped
    box(metal, *sorted_box(W(0.9, 0.3, 2.05), W(2.5, 0.6, 2.35)))
    cap = axes(W(1.7, 1.1, 2.2), (1, 0, 0), (0, d, 0))
    parts(g, "black/caps", True).lathe(ftp([(0.0, 0.0), (0.2, 0.0), (0.2, 0.25), (0.0, 0.25)]), 12, matrix=cap)


def hose_end(parts: Parts, g: str, at, d: int, words) -> None:
    """The other end of a trailer's enclosure, on node `g`: the transfer hose wound on its reel, and the placards over it (estimated)."""
    W = _wall(at[0], at[1], d)
    metal, hose = parts(g, "grey/fittings", True), parts(g, "cable/hose", True)
    reel = axes(W(-1.25, 1.0, 4.4), (0, d, 0), (-d, 0, 0))  # its axle across the end
    metal.lathe(ftp([(0.0, 0.1), (0.5, 0.1), (0.5, 2.4), (0.0, 2.4)]), 20, matrix=reel)
    hose.lathe(ftp([(0.5, 0.15), (0.82, 0.15), (0.82, 2.35), (0.5, 2.35)]), 24, matrix=reel)
    for z in (0.05, 2.45):  # its flanges
        metal.lathe(ftp([(0.0, z - 0.05), (1.0, z - 0.05), (1.0, z + 0.05), (0.0, z + 0.05)]), 24, matrix=reel)
    for a in (-1.4, 1.4):  # the reel's brackets
        box(metal, *sorted_box(W(a - 0.06, -0.05, 3.2), W(a + 0.06, 1.05, 4.5)))
    font = srlib.load_font()
    sign, ink = parts(g, "sign/placards"), parts(g, "black/lettering")
    for k, word in enumerate(words):
        z = 6.3 + k * 0.75
        box(sign, *sorted_box(W(-1.6, -0.03, z), W(1.6, 0.05, z + 0.6)))
        lettering(ink, word, 0.4, W(0.0, 0.065, z + 0.1), right_of(d), (0, 0, 1), font)


def right_of(d: int) -> tuple:
    return (-d, 0, 0)


def sorted_box(a, b) -> tuple:
    return tuple(min(p, q) for p, q in zip(a, b)), tuple(max(p, q) for p, q in zip(a, b))


def hut(parts: Parts, key: str, rect, door_wall: int, window_wall: int) -> None:
    """A small timber-framed hut on skids, a door in one wall and a window in another."""
    x0, y0, x1, y1 = rect
    g = f"GroundEquipment_{key.capitalize()}"  # its own node: it is one thing, and can be taken away
    parts.node(g, "GroundEquipment", ((x0 + x1) / 2, (y0 + y1) / 2, 0.0), label="Hut")
    outline = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    walls = ring(outline, 0.3)
    skin = parts(g, f"trailer/{key}")
    for i, w in enumerate(walls):
        holes = []
        if i == door_wall:
            holes.append((w.length / 2 - 1.5, w.length / 2 + 1.5, 0.75, 7.4))
        if i == window_wall:
            holes.append((w.length / 2 - 2.0, w.length / 2 + 2.0, 3.8, 6.6))
        w.build(skin, 0.5, 8.6, holes)
        if i == window_wall:
            window(parts, g, w, w.length / 2 - 2.0, w.length / 2 + 2.0, 3.8, 6.6, mullions=[w.length / 2])
        if i == door_wall:
            wall_door(parts, f"GroundEquipment_{key.capitalize()}Door", g, w, w.length / 2 - 1.5, w.length / 2 + 1.5, 0.75, 7.4, mat="grey")
            w.box(parts(g, "chassis"), w.length / 2 - 1.8, w.length / 2 + 1.8, -2.2, 0.0, 0.3, 0.72)  # the step
    inner = offset_poly(outline, -0.3)
    parts(g, "plank").add([tuple(P(x, y, 0.75)) for x, y in inner], ear_clip(inner))
    slab(parts(g, f"trailer/{key}roof"), offset_poly(outline, 0.5), 8.6, 8.95, bottom=True)
    for y in (y0 + 1.0, y1 - 1.0):  # the skids
        box(parts(g, "chassis"), (x0 - 0.6, y - 0.3, 0.0), (x1 + 0.6, y + 0.3, 0.5))


# Searchlights. That crewed searchlights worked in the pad area through the night is documented (TM
# X-53107 p. 7-21: "photo and searchlight crews to clear area"; 8.3.2: at T-30 on MR-4 "the
# searchlight crew [secured] the searchlights because of interference with telemetry"). How many,
# of what kind and where is not: S61-03158 shows MR-3 lit hard from the blockhouse side, FHSU
# F19_001 (MR-4) two sources at the pad's far edge, and F19_008 a large drum on a four-wheeled
# trailer that looks like a 60-inch Army unit. So: three of those, one toward the blockhouse and two
# across the pad, each aimed at the vehicle's middle. All estimated.
SEARCHLIGHTS = ((72.0, -82.0), (-86.0, -30.0), (-84.0, 45.0))


def lights(parts: Parts) -> None:
    source = "TM X-53107 p. 7-21 and 8.3.2 (that there were); S61-03158, FHSU F19_001, F19_008"
    if stood("Searchlights round pad 5", since="1961-05", confidence="estimated", source=source):
        for k, (x, y) in enumerate(SEARCHLIGHTS, 1):
            searchlight(parts, f"GroundEquipment_Searchlight{k}", "GroundEquipment", (x, y), (0.0, 0.0, 45.0))


def furniture(parts: Parts) -> None:
    """What the photographs show standing about the pad: see the module's note for which and when."""
    g = "GroundEquipment"
    font = srlib.load_font()
    white, dark, red, ink = parts(g, "sign"), parts(g, "chassis", True), parts(g, "signred"), parts(g, "black/lettering")

    # ---- the emergency shower, at the pad's north edge: a frame of white tube on a cart
    stood(
        "Emergency shower on its cart",
        since="1961-05-02",
        confidence="documented",
        source="KSC-61-4457 (2 May 1961); GPN-2000-001006. Not looked for in MR-4's photographs",
    )
    stood(
        "Trailer NASA SP-No 1",
        since="1961-05",
        confidence="documented",
        source="S61-03158 (MR-3 on the pad at night); a white NASA trailer is beside the structure in July too (F16_017)",
    )
    sx, sy = -58.0, -91.0
    sh = "GroundEquipment_Shower"
    parts.node(sh, g, (sx, sy, 0.0), label="Emergency shower")
    white, dark, red, ink = parts(sh, "sign"), parts(sh, "chassis", True), parts(sh, "signred"), parts(sh, "black/lettering")
    tube = parts(sh, "white/shower", True)
    for dx in (-1.6, 1.6):
        for dy in (-1.6, 1.6):
            tube.tube(P(sx + dx, sy + dy, 0.9), P(sx + dx, sy + dy, 8.6), 0.07 * FT, 8)
            dark.tube(P(sx + dx * 1.15, sy + dy - 0.12, 0.42), P(sx + dx * 1.15, sy + dy + 0.12, 0.42), 0.42 * FT, 12)  # castors
        tube.tube(P(sx + dx, sy - 1.6, 8.6), P(sx + dx, sy + 1.6, 8.6), 0.07 * FT, 8)
    for dy in (-1.6, 1.6):
        tube.tube(P(sx - 1.6, sy + dy, 8.6), P(sx + 1.6, sy + dy, 8.6), 0.07 * FT, 8)
    box(parts(sh, "deck"), (sx - 2.0, sy - 2.0, 0.75), (sx + 2.0, sy + 2.0, 0.95))  # its grating floor
    tube.tube(P(sx, sy - 1.6, 8.6), P(sx, sy, 8.6), 0.05 * FT, 8)  # the supply to the head
    tube.lathe(
        [(0.0, 0.0), (0.5 * FT, -0.05 * FT), (0.5 * FT, -0.25 * FT), (0.06 * FT, -0.5 * FT), (0.0, -0.5 * FT)][::-1],
        12,
        matrix=axes((sx, sy, 8.55), (1, 0, 0), (0, 0, 1)),
    )
    # the sign on two of its faces: a red saltire, a cross in a disc, the words above
    for face in ((0, 1, 0), (1, 0, 0)):
        n = Vector(face)
        r = Vector((0, 0, 1)).cross(n)  # reads left to right seen from outside
        c = Vector((sx, sy, 0)) + n * 1.72
        plate(white, [tuple(c + r * a + Vector((0, 0, z))) for a, z in ((-1.5, 1.6), (1.5, 1.6), (1.5, 8.2), (-1.5, 8.2))], 0.06)
        f = c + n * 0.045
        for d in (-1, 1):  # the saltire's two arms
            plate(red, [tuple(f + r * (d * a) + Vector((0, 0, z))) for a, z in ((-1.35, 1.8), (-1.05, 1.8), (1.35, 6.0), (1.05, 6.0))], 0.012)
        red.lathe(
            [(0.0, 0.0), (0.62 * FT, 0.0), (0.62 * FT, 0.008 * FT), (0.0, 0.008 * FT)],
            16,
            matrix=axes(tuple(f + Vector((0, 0, 3.9)) + n * 0.01), tuple(r), tuple(n)),
        )
        lettering(ink, "EMERGENCY", 0.36, f + Vector((0, 0, 7.45)), r, (0, 0, 1), font)
        lettering(ink, "SHOWER", 0.36, f + Vector((0, 0, 6.85)), r, (0, 0, 1), font)
    hose = parts(sh, "cable", True)
    for k in range(4):  # the hose coiled on its hook
        hose.lathe(
            [(0.75 * FT, 0.0), (0.83 * FT, 0.08 * FT), (0.75 * FT, 0.16 * FT), (0.67 * FT, 0.08 * FT), (0.75 * FT, 0.0)],
            14,
            matrix=axes((sx - 1.75 - 0.17 * k, sy, 3.6), (0, 1, 0), (-1, 0, 0)),
        )

    # ---- a packing case beside it (GPN-2000-001006)
    cs = "GroundEquipment_Case"
    parts.node(cs, g, (-44.25, -92.85, 0.0), label="Packing case")
    wood = parts(cs, "plank")
    box(wood, (-48.0, -94.5, 0.0), (-40.5, -91.2, 2.7))
    if fine():
        for x in (-47.6, -44.25, -40.9):
            box(wood, (x - 0.2, -94.58, 0.02), (x + 0.2, -91.12, 2.78))
    box(wood, (-46.0, -93.8, 2.7), (-43.8, -92.2, 3.9))

    # ---- DANGER boards on stands by the cherry picker, and a striped barricade at the pad's corner
    white, dark, red, ink = parts(g, "sign"), parts(g, "chassis", True), parts(g, "signred"), parts(g, "black/lettering")
    for x, y, turn in ((57.0, -13.0, 20.0), (58.5, 13.5, -15.0)):
        a = math.radians(turn)
        r = Vector((math.sin(a), -math.cos(a), 0))
        n = Vector((-math.cos(a), -math.sin(a), 0))  # faces the vehicle
        c = Vector((x, y, 0))
        for d in (-0.8, 0.8):
            beam(dark, tuple(c + r * d), tuple(c + r * d + Vector((0, 0, 4.2))), 0.1)
            beam(dark, tuple(c + r * d - n * 1.0), tuple(c + r * d + n * 1.0), 0.1)
        plate(white, [tuple(c + r * e + n * 0.08 + Vector((0, 0, z))) for e, z in ((-1.0, 2.6), (1.0, 2.6), (1.0, 4.4), (-1.0, 4.4))], 0.05)
        plate(red, [tuple(c + r * e + n * 0.115 + Vector((0, 0, z))) for e, z in ((-0.9, 3.75), (0.9, 3.75), (0.9, 4.3), (-0.9, 4.3))], 0.012)
        lettering(white, "DANGER", 0.34, c + n * 0.13 + Vector((0, 0, 3.86)), r, (0, 0, 1), font)
    bx, by = 84.0, -93.0
    bk = "GroundEquipment_Barricade"
    parts.node(bk, g, (bx, by, 0.0), label="Barricade")
    white, dark, red, ink = parts(bk, "sign"), parts(bk, "chassis", True), parts(bk, "signred"), parts(bk, "black/lettering")
    stripe = parts(bk, "orange")
    for d in (-4.5, 4.5):
        beam(dark, (bx + d - 0.9, by, 0.0), (bx + d, by, 3.4), 0.2)
        beam(dark, (bx + d + 0.9, by, 0.0), (bx + d, by, 3.4), 0.2)
    box(parts(bk, "black/barricade"), (bx - 5.5, by - 0.08, 2.2), (bx + 5.5, by + 0.08, 3.5))
    for k in range(7):
        for face in (-1, 1):
            xa = bx - 5.3 + k * 1.5
            v = [
                P(xa, by + face * 0.095, 2.25),
                P(xa + 0.7, by + face * 0.095, 2.25),
                P(xa + 1.4, by + face * 0.095, 3.45),
                P(xa + 0.7, by + face * 0.095, 3.45),
            ]
            stripe.add([tuple(q) for q in v], [(0, 1, 2, 3)] if face < 0 else [(3, 2, 1, 0)])

    # ---- the white trailer lettered NASA SP-No 1, beside where the structure stands back (S61-03158)
    tx0, ty0, tx1, ty1 = 30.0, 68.0, 38.0, 97.0
    tr = "GroundEquipment_Trailer"
    parts.node(tr, g, ((tx0 + tx1) / 2, ty1 - 4.55, 0.0), label="Trailer, NASA SP-No 1")
    white, dark, red, ink = parts(tr, "sign"), parts(tr, "chassis", True), parts(tr, "signred"), parts(tr, "black/lettering")
    tz, troof = 3.62, 12.2  # its floor and the underside of its roof
    van = parts(tr, "trailer/van")
    sides = ring([(tx0, ty0), (tx1, ty0), (tx1, ty1), (tx0, ty1)], 0.2)
    for i, w in enumerate(sides):
        w.build(van, 3.4, troof, [(9.0, 12.0, tz, tz + 6.7)] if i == 1 else [])
    wall_door(parts, f"{g}_TrailerDoor", tr, sides[1], 9.0, 12.0, tz, tz + 6.7, mat="grey", sign="SP-1")
    box(parts(tr, "plank/vanfloor"), (tx0 + 0.1, ty0 + 0.1, 3.4), (tx1 - 0.1, ty1 - 0.1, tz))
    box(parts(tr, "trailer/vanroof"), (tx0 - 0.1, ty0 - 0.1, troof), (tx1 + 0.1, ty1 + 0.1, troof + 0.25))
    # Inside, what a pad test trailer of the period held, of its kind and from no photograph: racks of
    # test equipment along the far wall and beyond the door, a bench of portable test sets, a desk on
    # the raised floor at the front, stools, a clock, a cable tray, its lights. Every legend is invented.
    if interior():
        racks = [
            ("TELEMETRY", [("meters", 3), ("lamps", "gggr")], 2.0),
            ("", [("recorder",)], 2.0),
            ("CAPSULE POWER", [("meters", 4), ("switches", 6)], 2.0),
            ("", [("lamps", "ggaarr"), ("buttons", 4)], 1.5),
            ("COMMUNICATIONS", [("meters", 2), ("switches", 4), ("label", "UHF   HF   INTERCOM")], 2.0),
            ("", [("screen",)], 2.0),
            ("RECORDERS", [("recorder",)], 2.0),
            ("", [("recorder",)], 2.0),
        ]
        for k, y in enumerate((82.0, 84.0, 86.0, 88.0)):
            interiors.rack(parts, tr, interiors.at((tx0 + 2.25, y, tz), 180.0), racks[2 * k : 2 * k + 2] + [("", [], 1.0)], font=font, seed=k + 40)
        for k, y in enumerate((83.0, 85.0)):
            panels = [("TIMING", [("label", "T - 00 : 55 : 00"), ("lamps", "gar")], 1.5), ("", [("meters", 2), ("switches", 3)], 1.5), ("", [], 2.0)]
            interiors.rack(parts, tr, interiors.at((tx1 - 2.22, y, tz), 0.0), panels if k == 0 else racks[2:4], font=font, seed=k + 50)
        sets = [
            ("OSCILLOSCOPE", [("screen",), ("switches", 3)], 1.6),
            ("POWER SUPPLY", [("meters", 2), ("switches", 2)], 1.4),
            ("SIGNAL GEN", [("meters", 1), ("buttons", 3)], 1.4),
            ("METER", [("meters", 1), ("switches", 2)], 1.1),
        ]
        interiors.workbench(parts, tr, interiors.at((tx0 + 2.52, 93.0, tz), 180.0), 7.2, sets, font=font, seed=7)
        interiors.cabinet(parts, tr, interiors.at((tx1 - 2.52, 94.5, tz), 0.0))
        interiors.desk(parts, tr, interiors.at(((tx0 + tx1) / 2, ty0 + 3.4, tz + 0.55), 270.0), width=4.0)
        for x, y, z in ((34.3, 86.5, tz), (34.3, 92.0, tz), (34.0, ty0 + 4.6, tz + 0.55)):
            interiors.stool(parts, tr, interiors.at((x, y, z), 0.0))
        interiors.clock(parts, tr, axes(((tx0 + tx1) / 2, ty1 - 0.22, tz + 7.2), (1, 0, 0), (0, -1, 0)))
        interiors.tray(parts, tr, (tx0 + 1.2, 80.5, troof - 0.9), (tx0 + 1.2, ty1 - 0.6, troof - 0.9))
    interiors.ceiling_light(parts, tr, "Trailer", ((tx0 + tx1) / 2, 87.0, troof - 0.02), along=(0, 1), intensity=0.7, reach=5.0)
    interiors.ceiling_light(parts, tr, None, ((tx0 + tx1) / 2, 75.0, troof - 0.02), along=(0, 1))
    frame = parts(tr, "chassis")
    box(frame, (tx0 + 1.2, ty0 + 8.0, 2.6), (tx1 - 1.2, ty1 - 0.5, 3.42))
    # Coupled to it, a tractor unit to take it away when the pad is cleared: a late-1950s medium
    # conventional from tools/blender/vehicles.py, every figure of which is estimated. No photograph
    # shows what moved this trailer. Its fifth wheel stands 9 cm higher than this trailer's floor, so
    # the floor steps up over it at the front, as a semi-trailer's does. The tractor is built facing
    # its own +X under a node turned to face the way the trailer does (-Y), so that it can be driven.
    box(parts(tr, "plank/vanstep"), (tx0 + 0.25, ty0 + 0.25, tz - 0.05), (tx1 - 0.25, ty0 + 6.2, tz + 0.55))  # wall to wall, over the tractor's wings
    bay = parts.node("GroundEquipment_TractorBay", g, ((tx0 + tx1) / 2, ty0 + 3.0, 0.0))
    bay.rotation_euler = (0.0, 0.0, -math.pi / 2)
    tractor = cars.ford_f600_tractor("white")
    built = tractor.build("GroundEquipment_Tractor", bay, (0.0, 0.0, 0.0), 0.0)
    radius, base = tractor.tyre[0] * 0.0254, tractor.wheelbase * 0.0254
    print(f"  GroundEquipment_Tractor: wheel radius {radius:.3f} m, wheelbase {base:.3f} m, {built['triangles']:,} triangles")
    k = 0
    for y in (ty1 - 6.5, ty1 - 2.6):  # the bogie at the back: each pair of tyres its own node on its hub, to roll
        for s in (-1, 1):
            k += 1
            xa, xb = sorted((s * 2.3 + (tx0 + tx1) / 2, s * 3.9 + (tx0 + tx1) / 2))
            wheel = f"{tr}_Wheel_{k}"
            parts.node(wheel, tr, ((xa + xb) / 2, y, 1.55))
            parts(wheel, "tyre", True).tube(P(xa, y, 1.55), P(xb, y, 1.55), 1.55 * FT, 16)
            parts(wheel, "chassis", True).tube(P(xa - 0.03, y, 1.55), P(xb + 0.03, y, 1.55), 0.8 * FT, 10)
        box(parts(tr, "chassis/axles"), ((tx0 + tx1) / 2 - 2.3, y - 0.2, 1.35), ((tx0 + tx1) / 2 + 2.3, y + 0.2, 1.75))
    for s in (-1, 1):  # the landing legs at the front
        x = (tx0 + tx1) / 2 + s * 2.6
        beam(frame, (x, ty0 + 5.0, 0.0), (x, ty0 + 5.0, 2.7), 0.35)
        box(frame, (x - 0.5, ty0 + 4.5, 0.0), (x + 0.5, ty0 + 5.5, 0.12))
    for k in range(4):  # steps up to the door
        box(parts(tr, "deck"), (tx1 + 0.1 + k * 0.9, ty0 + 9.0, 2.85 - k * 0.72 - 0.1), (tx1 + 1.0 + k * 0.9, ty0 + 12.0, 2.85 - k * 0.72))
    for y in (ty0 + 9.0, ty0 + 12.0):
        beam(frame, (tx1 + 0.2, y, 2.75), (tx1 + 3.7, y, 0.0), 0.14)
    lettering(ink, "NASA", 1.25, (tx1 + 0.012, ty1 - 9.0, 9.3), (0, 1, 0), (0, 0, 1), font)
    lettering(ink, "SP-No 1", 0.9, (tx1 + 0.012, ty1 - 9.0, 7.6), (0, 1, 0), (0, 0, 1), font)
    if fine():
        for y in (ty0 + 0.04, ty1 - 0.24):  # corner posts and a rub rail
            for x in (tx0 - 0.05, tx1 - 0.15):
                box(van, (x, y, 3.42), (x + 0.2, y + 0.2, 12.19))
        box(frame, (tx1 - 0.02, ty0 + 0.3, 3.5), (tx1 + 0.07, ty0 + 8.6, 3.75))
        box(frame, (tx1 - 0.02, ty0 + 12.4, 3.5), (tx1 + 0.07, ty1 - 0.3, 3.75))

    # ---- two huts at the hatch side's edge (F16_017)
    if stood(
        "Two huts at the pad's hatch-side edge", confidence="estimated", source="FHSU F16_017, July 1961; whether they stood in May is not known"
    ):
        hut(parts, "hut1", (87.0, 24.0, 97.5, 35.0), 3, 0)
        hut(parts, "hut2", (88.5, 40.0, 97.5, 49.0), 3, 2)
        # A pickup stands hitched to each by a chain, to drag it off on its skids when the pad is cleared.
        # Nothing records how the huts were moved, or that they were: a half-ton pickup is the least
        # that could do it (tools/blender/vehicles.py; its make is not from any photograph).
        chain = parts(g, "chassis/chains", True)
        for k, y in enumerate((29.5, 44.5), 1):
            truck = cars.ford_f100("white", utility=None)
            built = truck.build(f"GroundEquipment_Tow{k}", parts.nodes[g][0], (104.5 * FT, y * FT, 0.0), 0.0)
            chain.tube(P(97.6, y, 0.45), P(101.2, y, 1.3), 0.03 * FT, 6)
            radius, base = truck.tyre[0] * 0.0254, truck.wheelbase * 0.0254  # what flight.ts needs for the drive
            print(f"  GroundEquipment_Tow{k}: wheel radius {radius:.3f} m, wheelbase {base:.3f} m, {built['triangles']:,} triangles")


FOOT_DEPTH = 2.5
