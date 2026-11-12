"""What else stood on the pad at liftoff, the floodlights and the camera towers.

None of these positions is documented, and two things are dated: the emergency shower (NASA's
prelaunch photograph of MR-3 with the cherry picker at the capsule, GPN-2000-001006, and KSC-61-4457
of 2 May 1961, show it at the pad's edge: a tubular frame on a cart, its sign a red cross on a
saltire) and the white trailer lettered "NASA SP-No 1" beside the structure's base (S61-03158). The
huts at the hatch side's edge and the striped barricade are FHSU F16_017 and F16_015, of July 1961,
and so are the floodlights' timber poles with two or three lamps on a crossarm. TM X-53107's countdown says the LOX topping trailer and the
LN2 trailers stayed through liftoff (T-60 s "LOX topping Off"; secured after the launch). MR-3's
liftoff photographs (S61-02407 at ignition, S61-01927, S61-02408) and MR-4's (S63-02651) show, behind
the launcher on the side away from the hatch: two open-topped screens of white panels, the lower with
an orange tank lying behind it, the taller with a grey switch box on its face, three floodlights over
it and a long white tank on a trailer behind; a drum painted in orange and black chevrons; tripod
cameras, lattice camera towers, and floodlight poles with a crossarm carrying two lamps. All are
placed off the rails' corridor and off the hatch side, where the cherry picker stood; all estimated.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import interiors
import sitelib
import srlib
import vehicles as cars
from srlib import FT, interior

from .site import (
    GROUND,
    P,
    Parts,
    axes,
    beam,
    box,
    ear_clip,
    fine,
    ftp,
    lamp_head,
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
    near_launcher(parts)

    # tripod cameras round the pad (TM X-53107 7.5.5.3: twenty fixed cameras near the pad)
    for k, (tx, ty) in enumerate(TRIPODS, 1):  # each a 35 mm camera on a wooden tripod, aimed at the booster's tail
        cam = f"GroundEquipment_Camera{k}"
        parts.node(cam, "GroundEquipment", (tx, ty, 0.0), label="Engineering camera")
        sitelib.film_camera(parts, cam, (tx, ty), (0.0, 0.0, 12.0))

    # camera towers: narrow galvanised lattices with a platform at the top
    parts.node("CameraTowers", label="Camera towers")
    for k, (cx, cy, h) in enumerate(CAMERA_TOWERS, 1):
        w = 2.5
        tower = f"CameraTowers_Tower{k}"
        parts.node(tower, "CameraTowers", (cx, cy, 0.0))
        galv, deck = parts(tower, "galv"), parts(tower, "deck")

        def corner(i: int, z: float, cx=cx, cy=cy, w=w):
            return (cx + w * (1 if i in (0, 3) else -1), cy + w * (1 if i < 2 else -1), z)

        levels = [0.3 + k * (h - 0.3) / round(h / 7) for k in range(round(h / 7) + 1)]
        lattice(galv, corner, levels, 0.28, 0.16)
        for z in (h * 0.55, h):
            box(deck, (cx - w - 0.6, cy - w - 0.6, z - 0.2), (cx + w + 0.6, cy + w + 0.6, z))
        box(parts(tower, "black"), (cx - 0.7, cy - 0.5, h), (cx + 0.7, cy + 0.5, h + 1.0))  # the camera
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
    for k, (x, y) in enumerate(FLOOD_POLES, 1):  # each pole its own node, so each is named when pointed at
        pole = f"Floodlights_Pole{k}"
        parts.node(pole, "Floodlights", (x, y, 0.0))
        timber_pole(parts, pole, x, y, FLOOD_HEIGHT, lamps=3, aim=(-x, -y, 0))

    furniture(parts)
    lights(parts)


def trailer_wheel(parts: Parts, node: str, centre, side: int) -> None:
    """A trailer's road wheel standing still: a tyre on a pressed-steel disc, its outer face toward `side` (+1: +X)."""
    m = axes(centre, (0, 1, 0), (side, 0, 0))
    tyre = [(0.85, -0.3), (1.15, -0.33), (1.32, -0.3), (1.4, -0.18), (1.4, 0.18), (1.32, 0.3), (1.15, 0.33), (0.85, 0.3)]
    parts(node, "tyre", True).lathe(ftp(tyre), 28, matrix=m)
    rim = [(0.0, -0.28), (0.86, -0.28), (0.86, 0.2), (0.55, 0.22), (0.3, 0.24), (0.27, 0.34), (0.0, 0.34)]
    parts(node, "grey/wheels", True).lathe(ftp(rim), 28, matrix=m)


def vessel(radius: float, length: float, crown: float) -> list:
    """The profile of a pressure vessel along its axis: `length` over its two dished heads, each `crown` deep."""
    head = [(radius * math.sin(math.radians(t)), crown * (1.0 - math.cos(math.radians(t)))) for t in range(0, 91, 9)]
    return head + [(r, length - z) for r, z in reversed(head)]


def blast_screen(parts: Parts, node: str, xf: float, y0: float, y1: float, height: float, back: float, bays: int) -> None:
    """A screen of white panels standing on the pad between the launcher and what it shelters, open to the sky and
    at the back: a face along Y at x = `xf` toward the launcher (+X), and a return `back` feet long at each end.
    The photographs give its outline, its colour and its panel joints; its posts, feet and raking struts are how
    such a screen is made to stand, and estimated. Meshes on `node`: `trailer/screen`, `grey/screenframe`."""
    white, steel = parts(node, "trailer/screen"), parts(node, "grey/screenframe")
    post, sheet = 0.16, 0.06
    stands = [(xf, y0 + k * (y1 - y0) / bays) for k in range(bays + 1)]
    box(white, (xf - sheet, y0, 0.3), (xf + sheet, y1, height))
    box(white, (xf - 0.24, y0 - 0.24, height), (xf + 0.24, y1 + 0.24, height + 0.14))  # the capping rail
    for y in (y0, y1):
        box(white, (xf - back, y - sheet, 0.3), (xf, y + sheet, height))
        box(white, (xf - back - 0.24, y - 0.24, height), (xf - 0.24, y + 0.24, height + 0.14))
        stands += [(xf - back, y), (xf - back / 2, y)]
    for x, y in stands:
        box(white, (x - post, y - post, 0.0), (x + post, y + post, height))
        box(steel, (x - 0.55, y - 0.55, 0.0), (x + 0.55, y + 0.55, 0.07))  # its foot plate
    for _, y in stands[: bays + 1]:  # a raking strut behind each post of the face
        beam(steel, (xf - post, y, height * 0.72), (xf - post - height * 0.42, y, 0.1), 0.2)
        box(steel, (xf - height * 0.42 - 0.75, y - 0.4, 0.0), (xf - height * 0.42 + 0.15, y + 0.4, 0.09))
    if fine():  # the rails the sheets are fixed to, seen from behind
        for z in (0.42, height * 0.5):
            box(steel, (xf - 0.19, y0 + post, z), (xf - sheet - 0.02, y1 - post, z + 0.25))


def handwheel(metal, at, out, radius: float = 0.42) -> None:
    """A valve's handwheel: `at` its middle (feet), `out` the way its stem points (a horizontal direction)."""
    o = Vector(out).normalized()
    side = Vector((0, 0, 1)).cross(o)
    rim = [(radius - 0.07, -0.04), (radius, -0.04), (radius, 0.04), (radius - 0.07, 0.04), (radius - 0.07, -0.04)]
    metal.lathe(ftp(rim), 16, matrix=axes(at, tuple(side), tuple(o)))
    for k in range(3):
        q = math.tau * k / 3
        tip = Vector(at) + (side * math.cos(q) + Vector((0, 0, 1)) * math.sin(q)) * (radius - 0.05)
        beam(metal, tuple(at), tuple(tip), 0.05)


def near_launcher(parts: Parts) -> None:
    """What stood behind the launcher at liftoff, on the side away from the hatch (S61-02407, S61-01927, S61-02408 and,
    for MR-4, S63-02651): a low white screen with an orange tank lying behind it; a taller white screen with a grey
    switch box on its face and three floodlights over it, and behind that a long white tank on a trailer; and a drum
    painted in orange and black chevrons nearer the launcher. That they stood there, their colours and their outlines
    are the photographs'; every size is scaled off them against the booster's 70 in body, allowing for their standing
    further from the camera, and the places are read from oblique views: both screens stand at the slab's far edge
    (S61-02407 has the edge, with a hose lying along it, in line with their feet), the lower some 10 ft and the taller
    some 28 ft toward the structure's side of the launcher: all estimated. What the orange tank held and what the drum was for are not recorded; the
    long white tank is taken for the LOX topping trailer of TM X-53107's count."""
    g = "GroundEquipment"
    font = srlib.load_font()
    stood(
        "Blast screens, the tank behind each, and the chevron drum behind the launcher",
        since="1961-05",
        confidence="documented",
        source="S61-02407, S61-01927, S61-02408 (5 May 1961); S63-02651 shows the same in July. Sizes and places estimated",
    )

    # ---- the low screen and the orange tank on its cart
    xf, y0, y1, h = -86.0, 4.0, 15.0, 4.6
    u = f"{g}_TankScreen"
    parts.node(u, g, (xf, (y0 + y1) / 2, 0.0), label="Blast screen")
    blast_screen(parts, u, xf, y0, y1, h, 7.0, 3)
    u = f"{g}_TankCart"
    cx, cy, cz, r, length = xf - 4.4, (y0 + y1) / 2, 3.5, 1.5, 6.4
    parts.node(u, g, (cx, cy, 0.0), label="Tank on its cart")
    tank, frame, metal = parts(u, "orange/tank", True), parts(u, "chassis"), parts(u, "grey/fittings", True)
    tank.lathe(ftp(vessel(r, length, 0.7)), 40, matrix=axes((cx, cy - length / 2, cz), (1, 0, 0), (0, 1, 0)))
    for dy in (-1.9, 1.9):  # a saddle and a strap at each
        box(frame, (cx - 1.25, cy + dy - 0.2, 1.75), (cx + 1.25, cy + dy + 0.2, cz - 0.9))
        strap = ftp([(r + 0.02, -0.14), (r + 0.07, -0.14), (r + 0.07, 0.14), (r + 0.02, 0.14), (r + 0.02, -0.14)])
        metal.lathe(strap, 40, matrix=axes((cx, cy + dy, cz), (1, 0, 0), (0, 1, 0)))
    for dx in (-1.25, 1.25):  # the cart: two rails and two ends, an axle under the middle, a prop and a drawbar at one end
        box(frame, (cx + dx - 0.12, cy - 3.3, 1.5), (cx + dx + 0.12, cy + 3.3, 1.76))
        box(frame, (cx + dx - 0.1, cy - 0.75, 1.0), (cx + dx + 0.1, cy - 0.45, 1.5))
    for ya in (-3.3, 3.05):
        box(frame, (cx - 1.3, cy + ya, 1.52), (cx + 1.3, cy + ya + 0.25, 1.74))
    metal.tube(P(cx - 1.75, cy - 0.6, 1.0), P(cx + 1.75, cy - 0.6, 1.0), 0.11 * FT, 10)
    for side in (-1, 1):
        m = axes((cx + side * 1.95, cy - 0.6, 1.0), (0, 1, 0), (side, 0, 0))
        tyre = [(0.6, -0.2), (0.86, -0.22), (0.97, -0.17), (1.0, -0.08), (1.0, 0.08), (0.97, 0.17), (0.86, 0.22), (0.6, 0.2)]
        parts(u, "tyre", True).lathe(ftp(tyre), 24, matrix=m)
        parts(u, "grey/wheels", True).lathe(ftp([(0.0, -0.18), (0.61, -0.18), (0.61, 0.12), (0.2, 0.16), (0.0, 0.16)]), 20, matrix=m)
    beam(frame, (cx, cy + 3.2, 1.6), (cx, cy + 3.2, 0.12), 0.16)  # the prop it stands on
    box(frame, (cx - 0.35, cy + 2.85, 0.0), (cx + 0.35, cy + 3.55, 0.12))
    beam(frame, (cx, cy + 3.3, 1.63), (cx, cy + 5.4, 1.63), 0.14)  # the drawbar and its eye
    eye = [(0.12, -0.05), (0.26, -0.05), (0.26, 0.05), (0.12, 0.05), (0.12, -0.05)]
    metal.lathe(ftp(eye), 12, matrix=axes((cx, cy + 5.6, 1.63), (1, 0, 0), (0, 0, 1)))
    # on top: the filler with its cap, a relief valve, the outlet's valve and its gauge; a hose coiled on the end
    top = cz + r
    metal.tube(P(cx, cy - 1.0, top - 0.05), P(cx, cy - 1.0, top + 0.45), 0.2 * FT, 12)
    parts(u, "black/caps", True).tube(P(cx, cy - 1.0, top + 0.45), P(cx, cy - 1.0, top + 0.6), 0.26 * FT, 12)
    metal.tube(P(cx, cy + 0.2, top - 0.05), P(cx, cy + 0.2, top + 0.7), 0.07 * FT, 8)
    metal.tube(P(cx, cy + 1.2, top - 0.05), P(cx, cy + 1.2, top + 0.5), 0.09 * FT, 8)
    box(metal, (cx - 0.2, cy + 1.0, top + 0.5), (cx + 0.2, cy + 1.4, top + 0.85))
    if fine():
        handwheel(metal, (cx + 0.5, cy + 1.2, top + 0.68), (1, 0, 0), 0.3)
        metal.tube(P(cx + 0.2, cy + 1.2, top + 0.68), P(cx + 0.5, cy + 1.2, top + 0.68), 0.04 * FT, 6)
        dial = axes((cx - 0.2, cy + 1.2, top + 0.68), (0, 1, 0), (-1, 0, 0))
        metal.lathe(ftp([(0.0, 0.0), (0.2, 0.0), (0.2, 0.15), (0.0, 0.15)]), 14, matrix=dial)
        parts(u, "sign/dials", True).lathe(ftp([(0.0, 0.15), (0.16, 0.15), (0.16, 0.165), (0.0, 0.165)]), 14, matrix=dial)
    hose = parts(u, "cable/hose", True)
    for k in range(4):
        coil = [(0.62, 0.0), (0.7, 0.08), (0.62, 0.16), (0.54, 0.08), (0.62, 0.0)]
        hose.lathe(ftp(coil), 16, matrix=axes((cx, cy - length / 2 - 0.75 - 0.17 * k, cz - 0.2), (1, 0, 0), (0, -1, 0)))
    beam(metal, (cx, cy - length / 2 - 0.3, cz + 0.42), (cx, cy - length / 2 - 1.55, cz + 0.42), 0.08)  # the hook it hangs on

    # ---- the taller screen: a switch box on its face, three floodlights over it
    xf, y0, y1, h = -84.0, 20.0, 36.0, 7.5
    u = f"{g}_LoxScreen"
    parts.node(u, g, (xf, (y0 + y1) / 2, 0.0), label="Blast screen")
    blast_screen(parts, u, xf, y0, y1, h, 6.0, 4)
    metal = parts(u, "grey/fittings", True)
    by = y0 + 5.2
    box(parts(u, "grey/switchbox"), (xf + 0.16, by - 0.8, 3.3), (xf + 0.8, by + 0.8, 5.3))
    metal.tube(P(xf + 0.45, by + 0.4, 3.3), P(xf + 0.45, by + 0.4, 0.0), 0.06 * FT, 8)  # its conduit to the pad
    py = y0 + 9.0  # the lamps' post, clamped to the screen
    metal.tube(P(xf + 0.4, py, h - 2.0), P(xf + 0.4, py, h + 1.5), 0.09 * FT, 8)
    beam(metal, (xf + 0.4, py - 1.9, h + 1.5), (xf + 0.4, py + 1.9, h + 1.5), 0.14)
    for z in (h - 1.9, h - 0.5):
        box(metal, (xf + 0.1, py - 0.2, z), (xf + 0.5, py + 0.2, z + 0.12))
    glow = parts(u, "lamp/floods", True)
    parts.mark(u, "lamp/floods", lens_out=1)
    for dy in (-1.6, 0.0, 1.6):
        q = Vector((xf + 0.4, py + dy, h + 1.57))
        beam(metal, tuple(q), tuple(q + Vector((0, 0, 0.45))), 0.1)
        lamp_head(metal, glow, q + Vector((0.2, 0, 0.95)), (-q.x, -q.y, 9.0 - q.z), 0.5)

    # ---- behind it, the long white tank on its trailer: the LOX topping trailer
    u = f"{g}_LoxTrailer"
    tx, ta, tb = xf - 11.5, 24.0, 50.0  # its middle line, its rear and its front
    deck, r, length = 4.6, 2.5, 21.0
    cz = deck + 0.55 + r
    parts.node(u, g, (tx, ta + 6.0, 0.0), label="LOX topping trailer")
    white, dark, tank, metal = parts(u, "trailer"), parts(u, "chassis"), parts(u, "trailer/tank", True), parts(u, "grey/fittings", True)
    box(parts(u, "plank/deck"), (tx - 4.0, ta, deck - 0.25), (tx + 4.0, tb, deck))
    for dx in (-1.6, 1.6):  # the frame's two beams, and the cross members that show under the deck's edge
        box(dark, (tx + dx - 0.2, ta + 0.2, deck - 1.25), (tx + dx + 0.2, tb - 0.2, deck - 0.25))
    for k in range(9):
        y = ta + 0.6 + k * (tb - ta - 1.2) / 8
        box(dark, (tx - 3.9, y - 0.12, deck - 0.6), (tx + 3.9, y + 0.12, deck - 0.27))
    tank.lathe(ftp(vessel(r, length, 1.25)), 48, matrix=axes((tx, ta + 3.0, cz), (1, 0, 0), (0, 1, 0)))
    for dy in (5.5, 13.5, 21.5):  # saddles, and a strap over the tank at each
        box(white, (tx - 2.1, ta + dy - 0.35, deck), (tx + 2.1, ta + dy + 0.35, cz - 1.4))
        strap = ftp([(r + 0.03, -0.2), (r + 0.09, -0.2), (r + 0.09, 0.2), (r + 0.03, 0.2), (r + 0.03, -0.2)])
        tank.lathe(strap, 48, matrix=axes((tx, ta + dy, cz), (1, 0, 0), (0, 1, 0)))
    for side in (-1, 1):  # the tandem at the rear, the landing legs at the front
        for dy in (3.6, 7.4):
            trailer_wheel(parts, u, (tx + side * 3.3, ta + dy, 1.4), side)
        beam(dark, (tx + side * 2.6, tb - 6.0, deck - 1.2), (tx + side * 2.6, tb - 6.0, 0.1), 0.3)
        box(dark, (tx + side * 2.6 - 0.5, tb - 6.5, 0.0), (tx + side * 2.6 + 0.5, tb - 5.5, 0.1))
    for dy in (3.6, 7.4):
        box(dark, (tx - 2.9, ta + dy - 0.18, 1.22), (tx + 2.9, ta + dy + 0.18, 1.58))
        for dx in (-1.6, 1.6):
            box(dark, (tx + dx - 0.15, ta + dy - 0.5, 1.58), (tx + dx + 0.15, ta + dy + 0.5, deck - 1.25))  # the spring hangers
    box(dark, (tx - 1.5, tb - 3.5, deck - 0.75), (tx + 1.5, tb - 0.5, deck - 0.6))  # the kingpin's plate
    beam(dark, (tx - 2.6, tb - 6.0, deck - 2.4), (tx + 2.6, tb - 6.0, deck - 2.4), 0.16)
    # the tank's fittings: a vent stack with its cap, relief valves, a manway, and the placard on each side
    top = cz + r
    metal.tube(P(tx, ta + 5.0, top - 0.05), P(tx, ta + 5.0, top + 3.6), 0.12 * FT, 10)
    metal.lathe(ftp([(0.0, 0.0), (0.4, 0.0), (0.4, 0.25), (0.0, 0.4)]), 12, matrix=axes((tx, ta + 5.0, top + 3.6), (1, 0, 0), (0, 0, 1)))
    for dy in (9.0, 9.8):
        metal.tube(P(tx + 0.5, ta + dy, top - 0.1), P(tx + 0.5, ta + dy, top + 0.9), 0.1 * FT, 8)
    metal.lathe(ftp([(0.0, 0.0), (0.9, 0.0), (0.9, 0.25), (0.0, 0.25)]), 20, matrix=axes((tx, ta + 15.0, top - 0.08), (1, 0, 0), (0, 0, 1)))
    sign, ink = parts(u, "sign/placards"), parts(u, "black/lettering")
    for side in (-1, 1):
        box(sign, (tx + side * (r + 0.12) - 0.04, ta + 10.0, cz - 0.55), (tx + side * (r + 0.12) + 0.04, ta + 17.0, cz + 0.55))
        lettering(ink, "LIQUID OXYGEN", 0.5, (tx + side * (r + 0.19), ta + 13.5, cz + 0.05), (0, side, 0), (0, 0, 1), font)
        lettering(ink, "NO SMOKING", 0.3, (tx + side * (r + 0.19), ta + 13.5, cz - 0.42), (0, side, 0), (0, 0, 1), font)
    # the working end, at the rear, reached from the pad: the fill and topping lines down from the tank's head, a
    # valve and handwheel on each, the capped coupling at the foot, and a board of three gauges (the kind, not this one)
    for a in (-1.0, 1.0):
        metal.tube(P(tx + a, ta + 3.6, cz - 1.6), P(tx + a, ta - 0.5, cz - 1.6), 0.12 * FT, 10)
        metal.tube(P(tx + a, ta - 0.5, cz - 1.5), P(tx + a, ta - 0.5, 2.7), 0.12 * FT, 10)
        box(metal, (tx + a - 0.28, ta - 0.8, 3.5), (tx + a + 0.28, ta - 0.2, 4.1))
        if fine():
            metal.tube(P(tx + a, ta - 0.8, 3.8), P(tx + a, ta - 1.15, 3.8), 0.04 * FT, 6)
            handwheel(metal, (tx + a, ta - 1.15, 3.8), (0, -1, 0))
    metal.tube(P(tx - 1.0, ta - 0.5, 2.7), P(tx + 1.0, ta - 0.5, 2.7), 0.12 * FT, 10)
    metal.tube(P(tx, ta - 0.5, 2.7), P(tx, ta - 1.3, 2.7), 0.15 * FT, 10)
    parts(u, "black/caps", True).tube(P(tx, ta - 1.3, 2.7), P(tx, ta - 1.55, 2.7), 0.2 * FT, 12)
    box(parts(u, "trailer/cabinets"), (tx + 2.0, ta - 0.4, deck + 0.02), (tx + 3.9, ta + 0.2, deck + 1.9))
    for k in range(3):
        dial = axes((tx + 2.35 + 0.6 * k, ta - 0.4, deck + 1.3), (1, 0, 0), (0, -1, 0))
        metal.lathe(ftp([(0.0, 0.0), (0.24, 0.0), (0.24, 0.1), (0.0, 0.1)]), 14, matrix=dial)
        parts(u, "sign/dials", True).lathe(ftp([(0.0, 0.1), (0.2, 0.1), (0.2, 0.115), (0.0, 0.115)]), 14, matrix=dial)
    lettering(ink, "PRESS  LEVEL  FLOW", 0.16, (tx + 2.95, ta - 0.43, deck + 0.45), (1, 0, 0), (0, 0, 1), font)
    hose = parts(u, "cable/hose", True)
    for k in range(5):  # the transfer hose, coiled flat on the deck's front
        coil = [(1.35, 0.0), (1.5, 0.15), (1.35, 0.3), (1.2, 0.15), (1.35, 0.0)]
        hose.lathe(ftp(coil), 20, matrix=axes((tx, tb - 2.3, deck + 0.01 + 0.3 * k), (1, 0, 0), (0, 0, 1)))

    # ---- a wall of sandbags on the grass beyond the slab's edge (S61-02407: five or six courses, about 7 ft long;
    # something under a white cover stands at each end of it, which is not built: what they were is not recorded)
    u = f"{g}_Sandbags"
    bx, by = -122.0, -18.0
    parts.node(u, g, (bx, by, 0.0), label="Sandbags")
    bag = parts(u, "canvas", True)
    # a filled bag, flat on its bed and full to its edge (no waist between courses): 2.5 by 1.4 ft, bedded 6 in a course.
    # Laid as a wall is: stretchers two deep, then headers across, the top two courses one bag thick; each bag turned
    # and shifted a little, by a rule and not by chance, so the build is the same every time
    shape = ftp([(0.0, 0.0), (0.86, 0.0), (0.98, 0.2), (0.92, 0.44), (0.62, 0.57), (0.0, 0.6)])
    for course in range(6):
        headers = course % 2 == 1 and course < 4
        rows = 1 if headers or course >= 4 else 2
        along = 5 if headers else 3
        for row in range(rows):
            for k in range(along):
                wobble = math.sin(12.9898 * (course * 31 + row * 7 + k) + 4.1)  # -1 to 1, fixed for each bag
                y = by + (k - (along - 1) / 2) * (1.4 if headers else 2.35) + 0.07 * wobble
                x = bx + (row - (rows - 1) / 2) * 1.3 - 0.06 * wobble
                turn = math.radians((0.0 if headers else 90.0) + 7.0 * wobble)
                lay = Matrix.Translation(P(x, y, GROUND + 0.5 * course)) @ Matrix.Rotation(turn, 4, "Z") @ Matrix.Diagonal((1.3, 0.72, 1.0, 1.0))
                bag.lathe(shape, 12, matrix=lay)

    # ---- the drum painted in chevrons, 15 to 20 ft from the launcher (S61-01927: about 9 ft across and 4 ft high)
    sx, sy, dr, dh = -20.5, 8.0, 4.6, 3.9  # clear of the service structure's base
    u = f"{g}_ChevronDrum"
    parts.node(u, g, (sx, sy, 0.0))
    black, stripe = parts(u, "black/drum", True), parts(u, "orange", True)
    black.lathe(ftp([(0.0, 0.0), (dr, 0.0), (dr, dh), (0.0, dh)]), 48, matrix=axes((sx, sy, 0.0), (1, 0, 0), (0, 0, 1)))
    # twelve chevrons round it, each a band bent at mid-height and laid on the curve, 9 mm off the black
    n, across, up, lean, off = 12, 3, 3, 0.4, 0.03
    for k in range(n):
        for z0, z1, a0, a1 in ((0.06, dh / 2, 0.0, lean), (dh / 2, dh - 0.06, lean, 0.0)):
            verts = []
            for j in range(up + 1):
                for i in range(across + 1):
                    q = math.tau * (k + 0.5 * i / across + a0 + (a1 - a0) * j / up) / n
                    verts.append(tuple(P(sx + (dr + off) * math.cos(q), sy + (dr + off) * math.sin(q), z0 + (z1 - z0) * j / up)))
            w = across + 1
            stripe.add(verts, [(j * w + i, j * w + i + 1, (j + 1) * w + i + 1, (j + 1) * w + i) for j in range(up) for i in range(across)])


def hut(parts: Parts, key: str, rect, door_wall: int, window_wall: int) -> None:
    """A small timber-framed hut on skids, a door in one wall and a window in another. What the
    huts in the July photographs held is not recorded: the door is built shut and the window dark
    (sitelib.door `works=False`, a `void` pane), rather than opening on an empty box."""
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
            window(parts, g, w, w.length / 2 - 2.0, w.length / 2 + 2.0, 3.8, 6.6, mullions=[w.length / 2], pane="void")
        if i == door_wall:
            wall_door(
                parts, f"GroundEquipment_{key.capitalize()}Door", g, w, w.length / 2 - 1.5, w.length / 2 + 1.5, 0.75, 7.4, mat="grey", works=False
            )
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
SEARCHLIGHTS = ((72.0, -82.0), (-86.0, -30.0), (-78.0, 62.0))


def lights(parts: Parts) -> None:
    source = "TM X-53107 p. 7-21 and 8.3.2 (that there were); S61-03158, FHSU F19_001, F19_008"
    if stood("Searchlights round pad 5", since="1961-05", confidence="estimated", source=source):
        for k, (x, y) in enumerate(SEARCHLIGHTS, 1):
            searchlight(
                parts,
                f"GroundEquipment_Searchlight{k}",
                "GroundEquipment",
                (x, y),
                (0.0, 0.0, 45.0),
                about="A 60-inch carbon-arc searchlight: crews lit the pad with them through the night count, and "
                "switched them off before launch. That there were searchlights is documented; their kind, number and "
                "places here are estimated.",
            )


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
    for k, (x, y, turn) in enumerate(((57.0, -13.0, 20.0), (58.5, 13.5, -15.0)), 1):
        board = f"GroundEquipment_Danger{k}"
        parts.node(board, g, (x, y, 0.0))
        white, dark, red = parts(board, "sign"), parts(board, "chassis", True), parts(board, "signred")
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
        interiors.desk(parts, tr, interiors.at(((tx0 + tx1) / 2, ty0 + 3.4, STEP_TOP), 270.0), width=4.0)
        for x, y, z in ((34.3, 86.5, tz), (34.3, 92.0, tz), (34.0, ty0 + 4.6, STEP_TOP)):
            interiors.stool(parts, tr, interiors.at((x, y, z), 0.0))
        interiors.clock(parts, tr, axes(((tx0 + tx1) / 2, ty1 - 0.22, tz + 7.2), (1, 0, 0), (0, -1, 0)))
        interiors.tray(parts, tr, (tx0 + 1.2, 80.5, troof - 0.9), (tx0 + 1.2, ty1 - 0.6, troof - 0.9))
    interiors.ceiling_light(parts, tr, "Trailer", ((tx0 + tx1) / 2, 87.0, troof - 0.02), along=(0, 1), intensity=1.6, reach=7.0)
    interiors.ceiling_light(parts, tr, None, ((tx0 + tx1) / 2, 75.0, troof - 0.02), along=(0, 1))
    frame = parts(tr, "chassis")
    box(frame, (tx0 + 1.2, ty0 + 8.0, 2.6), (tx1 - 1.2, ty1 - 0.5, 3.42))
    # Coupled to it, the tractor that takes it away when the pad is cleared: an Army 2-1/2-ton 6x6 truck
    # tractor (M275) of the kind NASA ran at the Cape, from tools/blender/vehicles.py. FHSU item 544 shows a
    # dark one of the family coupled to SP No 1 (the white one, items 263, 265 and 407, towed another van):
    # olive is our reading of "dark", and that this one towed it away that morning is estimated. Its fifth
    # wheel's plate is 52 in up, 4 in ahead of the middle of its tandem (the node's origin), under the
    # trailer's kingpin; the floor steps up over it at the front, as a semi-trailer's does, its underside
    # just clear of the plate. The tractor is built facing its own +X under a node turned to face the way
    # the trailer does (-Y), so that it can be driven.
    king, plate_z = 4.0 / 12, 52.0 / 12
    box(parts(tr, "plank/vanstep"), (tx0 + 0.25, ty0 + 0.25, plate_z + 0.02), (tx1 - 0.25, ty0 + 6.2, STEP_TOP))  # wall to wall
    box(parts(tr, "plank/vanstep"), (tx0 + 0.25, ty0 + 6.12, tz - 0.05), (tx1 - 0.25, ty0 + 6.2, plate_z + 0.02))  # its riser
    bay = parts.node("GroundEquipment_TractorBay", g, ((tx0 + tx1) / 2, ty0 + 3.0 + king, 0.0))
    bay.rotation_euler = (0.0, 0.0, -math.pi / 2)
    tractor = cars.m275_tractor("olive")
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
    # the steps up to the door: their own node, hinged at the top along the trailer's side, so they fold
    # up before it is towed (flight.ts) and nothing hangs below the frame while it moves (estimated)
    st = "GroundEquipment_TrailerSteps"
    parts.node(st, tr, (tx1 + 0.1, ty0 + 10.5, 2.85))
    for k in range(4):
        box(parts(st, "deck"), (tx1 + 0.1 + k * 0.9, ty0 + 9.0, 2.85 - k * 0.72 - 0.1), (tx1 + 1.0 + k * 0.9, ty0 + 12.0, 2.85 - k * 0.72))
    for y in (ty0 + 9.0, ty0 + 12.0):
        beam(parts(st, "chassis"), (tx1 + 0.2, y, 2.75), (tx1 + 3.7, y, 0.0), 0.14)
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
STEP_TOP = 4.55  # the trailer's raised floor at the front, over the tractor's fifth wheel: 0.93 ft (0.28 m) above the rest
