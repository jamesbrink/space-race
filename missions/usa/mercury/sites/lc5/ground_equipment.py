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

import srlib
from srlib import FT

from .site import (
    P,
    Parts,
    axes,
    beam,
    box,
    ear_clip,
    fine,
    lattice,
    lettering,
    obox,
    offset_poly,
    plate,
    ring,
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
    box(white, (x0 - 4.0, y0 - 11.0, 1.6), (x0 + 4.0, y0 + 11.0, 8.0))
    box(dark, (x0 - 3.2, y0 - 10.0, 1.0), (x0 + 3.2, y0 + 10.0, 1.62))
    tank.lathe(
        [
            (0, 0),
            (1.6 * FT, 0.3 * FT),
            (2.6 * FT, 1.3 * FT),
            (2.75 * FT, 2.5 * FT),
            (2.75 * FT, 16.5 * FT),
            (2.6 * FT, 17.7 * FT),
            (1.6 * FT, 18.7 * FT),
            (0, 19.0 * FT),
        ],
        24,
        matrix=axes((x0, y0 - 9.5, 10.85), (1, 0, 0), (0, 1, 0)),
    )
    for dy in (-6.0, 6.0):  # saddles
        box(white, (x0 - 2.2, y0 + dy - 0.4, 8.0), (x0 + 2.2, y0 + dy + 0.4, 9.1))
    for side in (-1, 1):
        for dy in (-6.5, -3.5):
            dark.tube(P(x0 + side * 3.3, y0 + dy, 1.4), P(x0 + side * 3.95, y0 + dy, 1.4), 1.4 * FT, 16)
    box(dark, (x0 - 0.5, y0 + 11.0, 0.9), (x0 + 0.5, y0 + 15.0, 1.3))  # drawbar
    if fine():
        for k in range(3):  # louvres and a door on the enclosure
            box(black, (x0 - 4.05, y0 - 8.0 + k * 3.0, 4.0), (x0 - 3.9, y0 - 6.0 + k * 3.0, 6.5))
        box(black, (x0 + 3.9, y0 + 2.0, 1.8), (x0 + 4.05, y0 + 5.0, 7.0))

    # a second, smaller enclosure: LN2 or the peroxide unit (estimated)
    x1, y1 = -24.0, 22.0
    box(white, (x1 - 4.0, y1 - 5.5, 1.6), (x1 + 4.0, y1 + 5.5, 7.5))
    box(dark, (x1 - 3.2, y1 - 4.5, 1.0), (x1 + 3.2, y1 + 4.5, 1.62))
    for side in (-1, 1):
        dark.tube(P(x1 + side * 3.3, y1 - 2.0, 1.4), P(x1 + side * 3.95, y1 - 2.0, 1.4), 1.4 * FT, 16)
    tank.lathe(
        [(0, 0), (1.3 * FT, 0), (1.3 * FT, 4.0 * FT), (0.9 * FT, 4.6 * FT), (0, 4.8 * FT)],
        20,
        matrix=axes((x1 + 1.5, y1 + 2.0, 7.5), (1, 0, 0), (0, 0, 1)),
    )

    # the low box painted in chevrons, 15 to 20 ft from the launcher
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
    for tx, ty in TRIPODS:
        for k in range(3):
            a = math.tau * k / 3
            beam(dark, (tx + 1.2 * math.cos(a), ty + 1.2 * math.sin(a), 0.0), (tx, ty, 4.2), 0.12)
        aim = Vector((-tx, -ty, 8.0)).normalized()
        obox(black, (tx, ty, 4.75), (aim.x, aim.y, aim.z), (0, 0, 1) if abs(aim.z) < 0.9 else (1, 0, 0), (1.4, 0.7, 0.9))

    # camera towers: narrow galvanised lattices with a platform at the top
    parts.node("CameraTowers")
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


def hut(parts: Parts, key: str, rect, door_wall: int, window_wall: int) -> None:
    """A small timber-framed hut on skids, a door in one wall and a window in another."""
    x0, y0, x1, y1 = rect
    g = f"GroundEquipment_{key.capitalize()}"  # its own node: it is one thing, and can be taken away
    parts.node(g, "GroundEquipment", ((x0 + x1) / 2, (y0 + y1) / 2, 0.0))
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
    parts.node(sh, g, (sx, sy, 0.0))
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
    parts.node(cs, g, (-44.25, -92.85, 0.0))
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
    parts.node(bk, g, (bx, by, 0.0))
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
    parts.node(tr, g, ((tx0 + tx1) / 2, ty1 - 4.55, 0.0))
    white, dark, red, ink = parts(tr, "sign"), parts(tr, "chassis", True), parts(tr, "signred"), parts(tr, "black/lettering")
    tz, troof = 3.62, 12.2  # its floor and the underside of its roof
    van = parts(tr, "trailer/van")
    sides = ring([(tx0, ty0), (tx1, ty0), (tx1, ty1), (tx0, ty1)], 0.2)
    for i, w in enumerate(sides):
        w.build(van, 3.4, troof, [(9.0, 12.0, tz, tz + 6.7)] if i == 1 else [])
    wall_door(parts, f"{g}_TrailerDoor", tr, sides[1], 9.0, 12.0, tz, tz + 6.7, mat="grey", sign="SP-1")
    box(parts(tr, "plank/vanfloor"), (tx0 + 0.1, ty0 + 0.1, 3.4), (tx1 - 0.1, ty1 - 0.1, tz))
    box(parts(tr, "trailer/vanroof"), (tx0 - 0.1, ty0 - 0.1, troof), (tx1 + 0.1, ty1 + 0.1, troof + 0.25))
    fit = parts(tr, "console")
    box(fit, (tx0 + 0.2, ty0 + 14.0, tz), (tx0 + 2.4, ty1 - 0.4, tz + 3.0))  # a bench of test sets along the far wall (invented)
    box(fit, (tx0 + 0.2, ty0 + 0.4, tz), (tx0 + 2.2, ty0 + 6.0, tz + 6.4))
    frame = parts(tr, "chassis")
    box(frame, (tx0 + 1.2, ty0 + 0.5, 2.6), (tx1 - 1.2, ty1 - 0.5, 3.42))
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


FOOT_DEPTH = 2.5
