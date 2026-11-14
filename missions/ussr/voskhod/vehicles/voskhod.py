"""The Voskhod spacecraft in its two builds: the 3KV, with three couches (Voskhod 1), and the 3KD, with
two couches and the Volga airlock (Voskhod 2).

A Voskhod is a Vostok 3KA altered, and this module is that alteration and nothing more. What was the
Vostok's is imported from ../../vostok/vehicles/vostok_3ka.py and built by it: the sphere and its
hatches (two of them at the latitudes OKB-1's drawings of a Voskhod give), the pressure hull and its lining, the plain
instrument board and Vzor (which stayed where they were), the four straps and their lock, the cable mast, the
instrument module, its antennas, the bottle ring, the braking engine. What is built here is what a Voskhod had instead
of the ejection seat and on top of the sphere: the couches, turned a quarter turn about the long axis from the old
seat's line, laid round their seated men; the parachute container beyond their heads; the reserve braking engine on
the forward pole; and, on the 3KD, the airlock on hatch No. 3 with the hatch into it. See voskhod.md for what each
number rests on, and its "The fit" for the room each man is left.

Every dimension is in millimetres. Stations, azimuths and latitudes are the 3KA's (station 0 at the
braking engine's nozzle, +Z toward the descent module; azimuths about +Z from +X).

Top-level nodes:
    DescentModule  EntryHatch  ParachuteHatch  Cabin  ReserveEngine
    RetainingStraps  CableMast  InstrumentModule  Antennas  GasBottles  RetroEngine
and for the 3KV:   CouchLeft  CouchCentre  CouchRight
and for the 3KD:   CouchLeft  CouchRight  Airlock  AirlockRing  AirlockHatch
In each couch that a flight lays a man in: Seat_Left, Seat_Centre or Seat_Right, an empty at his eyes.
"""

from __future__ import annotations

import math
from collections.abc import Callable

import bpy
from mathutils import Matrix, Vector

import srlib
import vostok_3ka as vk
import vostok_cabin
from srlib import TAU, MeshBuilder, deg, frame, group, interior, mark_shells, material
from vostok_3ka import INNER, MM, OUTER, R_IN, Z_C, R, V, inside_cabin, placed, pm

# ------------------------------------------------------------------ dimensions (mm)

POLE = Z_C + R  # the sphere's forward pole: station 4,180, as the 3KA's
# The reserve engine, off OKB-1's two general drawings (the 3KV's of 17 April 1964 and the 3KD's of April 1965), each
# scaled by the sphere's 2,300 mm, and a photograph of a test article: heights above the pole, and radii. Estimated:
# the drawings were read at 6.5 and 7.4 mm to a pixel, and three readings put its face 1.27 to 1.33 m above the pole,
# its rear drum 0.82 to 0.91 m across and its front drum 0.73 to 0.76.
RESERVE_H_MOUNT = 190.0  # the collar it stands on
RESERVE_H_STEP = 770.0  # where the rear drum gives way to the front one
RESERVE_H = 1300.0  # its front face (the stubs on it stand some 57 mm further)
RESERVE_R = (430.0, 412.0, 370.0)  # the rear drum at its foot and at the step; the front drum
# So the model is 5.48 m from the braking engine's nozzle to the reserve engine's face: the 3KV's drawing scales to
# 5.43 to 5.49 m. The one figure in print is "five meters" (Siddiqi p. 412), a round number: voskhod.md, "Length".
LENGTH = POLE + RESERVE_H

# Where the three hatches are, as (azimuth, latitude). No. 1 is the Vostok model's own (the line of its seat's rails:
# neither of OKB-1's drawings of a Voskhod shows that side of the ball). Nos. 2 and 3 are read off those two drawings,
# which show both a quarter turn apart and 21 degrees forward of the plane square to the long axis (voskhod.md,
# "The hatches"): the Vostok model has 30 and 15, by estimate, and is left as it is.
ENTRY = vk.ENTRY
PARACHUTE = (vk.PARACHUTE[0], deg(21.0))
HATCH_3 = (vk.TECHNOLOGICAL[0], deg(21.0))
HATCHES = (ENTRY, PARACHUTE, HATCH_3)

# The couches. Each has its own frame, millimetres: origin midway between the man's hip joints, +X to his left, +Y to
# his head, +Z out of his chest. They are the Vostok seat's line turned a quarter turn about the ship's long axis
# (Zak: "rotated 90 degrees around the vertical axis of the spacecraft"): the crew lie as the Vostok pilot lay, heads
# raised 24 degrees, but toward hatch No. 2 and its parachute container where his was toward hatch No. 1, so the
# instrument board and the Vzor are at their left and the entry hatch at their right. Where each couch stands is
# fitted round the men and the container, and is estimated (voskhod.md, "The fit").
COUCH_3KV = {"Left": (565.0, 10.0, -110.0), "Centre": (0.0, -250.0, -10.0), "Right": (-565.0, 10.0, -110.0)}
# The 3KD had two: the couch nearest hatch No. 3 gave way to the airlock's hatch, whose cover swung in over its place.
COUCH_3KD = {"Left": (25.0, -292.0, -150.0), "Right": (-565.0, 10.0, -110.0)}
# The instrument board stayed where a Vostok's was (Siddiqi p. 412; the flown Voskhod 1, photographed through hatch
# No. 1, has it over the Vzor on the far wall): so it is put where the Vostoks' own cabin has theirs (vostok_cabin.py:
# BOARD_AT, BOARD_TILT, which say what those rest on). The middle of its face from the sphere's centre, out toward
# hatch No. 3's side and toward the nose; and how far its face is tipped down from upright.
BOARD_AT = (-vostok_cabin.BOARD_AT[1], vostok_cabin.BOARD_AT[2])
BOARD_TIP = vostok_cabin.BOARD_TILT
# The parachute container behind hatch No. 2: a drum 0.75 m across where the Vostok model's is 0.8, reaching 350 mm in from
# the hatch's plane on the pressure hull where the Vostok model's reaches 440. Estimated: its depth is what leaves the
# middle man's crown 45 mm from its end with his toes 24 mm from the lining (voskhod.md, "The fit").
CHUTE_R = 375.0
CHUTE_REACH = 380.0
# The pose a couch holds a man in, as figurelib's joint angles in degrees (thighs raised from the line of the back,
# shins laid over): estimated, off photographs of the couches.
POSE = {"hip": 68.0, "knee": 88.0}
BACK = -142.0  # the pad under his back, below his hip joints
# The pad's line under him, head to feet: (toward his head, out of his chest), from his hip joints. It is the under
# side of the seated figure (crew/flight_suit.py, in the pose above) with a finger's breadth to spare, and so is no
# more a survey of an Elbrus couch than the figure is of a man. It runs from the crown of his head to above his heels:
# his feet hang past its end.
PROFILE = [
    (822.0, -80.0),
    (780.0, -92.0),
    (700.0, -98.0),
    (630.0, -104.0),
    (580.0, -114.0),
    (520.0, -133.0),
    (470.0, BACK),
    (300.0, BACK),
    (60.0, BACK),
    (0.0, -141.0),
    (-50.0, -133.0),
    (-95.0, -112.0),
    (-125.0, -77.0),
    (-148.0, -27.0),
    (-160.0, 40.0),
    (-176.0, 100.0),
    (-192.0, 155.0),
    (-214.0, 228.0),
    (-240.0, 264.0),
    (-275.0, 276.0),
    (-330.0, 262.0),
    (-400.0, 232.0),
    (-500.0, 198.0),
    (-560.0, 176.0),
    (-610.0, 170.0),
]
# half its width and how high its sides stand, at places along it (toward his head): a cup round the back of his head,
# narrow enough under his trunk for his arms to lie outside it, a rest under both calves
SECTION = [
    (822.0, 78.0, 62.0),
    (770.0, 112.0, 78.0),
    (700.0, 122.0, 72.0),
    (620.0, 118.0, 34.0),
    (520.0, 205.0, 40.0),
    (300.0, 212.0, 52.0),
    (0.0, 215.0, 55.0),
    (-100.0, 215.0, 60.0),
    (-160.0, 205.0, 45.0),
    (-240.0, 205.0, 12.0),
    (-400.0, 205.0, 12.0),
    (-610.0, 200.0, 12.0),
]
# Under a helmet, the 3KD's couches: a shallow dish in place of the cup, ending under the helmet's middle, which
# overhangs it (the cabin has no room beyond it for more). These rows take the place of those above for the head.
PROFILE_SUITED = [(800.0, -110.0), (760.0, -121.0), (700.0, -133.0), (640.0, -126.0), (600.0, -117.0), (560.0, -116.0)]
SECTION_SUITED = [(800.0, 80.0, 14.0), (740.0, 106.0, 20.0), (640.0, 106.0, 16.0), (590.0, 110.0, 22.0)]
SHELL = 26.0  # the pad's thickness, down to the trough's own skin
# The trough's box, off the photographs of the flown Voskhod 1 (voskhod.md, "The couch"): straight side walls of
# riveted sheet, stamped with round dimples, from under his shoulders to under his seat; a floor; and under it two
# beams painted red. Every size estimated.
BOX = (560.0, -128.0)  # where the side walls begin and end, toward his head
BOX_TOP = -132.0  # their upper edge: under the pad's rim, so that his arms lie over it
BOX_DEEP = 130.0
BEAM_DEEP = 80.0
SUITED = (8.0, 10.0)  # how much further toward his head, and out of the couch, a suited man's hip joints lie

SHELLS_COMMON = (
    "DM_Insulation",
    "DM_Fittings",
    "DM_Glass",
    "DM_HatchRings",
    "DM_Bolts",
    "DM_MastSockets",
    "EntryHatch_Skin",
    "EntryHatch_Shell",
    "EntryHatch_Rim",
    "EntryHatch_Bolts",
    "EntryHatch_Glass",
    "ParachuteHatch_Skin",
    "ParachuteHatch_Shell",
    "ParachuteHatch_Rim",
    "ParachuteHatch_Bolts",
    "Cabin_PressureShell",
    "Cabin_Padding",
    "CableMast_Duct",
    "CableMast_Cables",
    "CableMast_Plug",
    "IM_ForwardCone",
    "IM_AftCone",
    "IM_Band",
    "IM_Bolts",
    "IM_SupportRing",
    "IM_Louvres",
    "IM_LouvreFrames",
    "IM_Fittings",
    "IM_Covers",
    "IM_Apertures",
    "IM_Pipes",
    "Bottles_Spheres",
    "Bottles_Bands",
    "Bottles_Cradles",
    "Engine_Skirt",
)
SHELLS_3KD = (*SHELLS_COMMON, "AirlockHatch_Skin", "AirlockHatch_Shell", "AirlockHatch_Rim", "AirlockHatch_Bolts")
SHELLS_3KV = (*SHELLS_COMMON, "DM_TechHatch_Skin", "DM_TechHatch_Shell", "DM_TechHatch_Rim", "DM_TechHatch_Bolts", "DM_TechHatch_Glass")


def couch_frame() -> Matrix:
    """The couches' plane, millimetres: the Vostok seat's own, turned a quarter turn about the ship's long axis, with
    its origin at the sphere's centre. +X is the crew's left (toward hatch No. 3 and the Vzor, square to the long
    axis), +Y toward their heads (hatch No. 2 and the parachute container, raised as the Vostok seat's rails were),
    +Z out of their chests."""
    m = (Matrix.Rotation(-math.pi / 2, 3, "Z") @ vk.seat_frame().to_3x3()).to_4x4()
    m.translation = Vector((0, 0, Z_C))
    return m


def board_frame() -> Matrix:
    """The instrument board's own frame, millimetres in the scene: its face toward +Z, its top toward +Y. It faces
    hatch No. 1 across the cabin, tipped down toward the crew, on hatch No. 3's meridian."""
    h = Vector((math.cos(ENTRY[0]), math.sin(ENTRY[0]), 0.0))
    up = Vector((0.0, 0.0, 1.0))
    n = h * math.cos(BOARD_TIP) - up * math.sin(BOARD_TIP)
    t = h * math.sin(BOARD_TIP) + up * math.cos(BOARD_TIP)
    m = Matrix((t.cross(n), t, n)).transposed().to_4x4()
    # (the plain board is a box 110 mm deep about its frame's origin: its face is put at the place, not its middle)
    m.translation = Vector((0, 0, Z_C)) - h * BOARD_AT[0] + up * BOARD_AT[1] - n * 55.0
    return m


def figure_place(at: tuple[float, float, float]) -> Matrix:
    """Where a seated figure goes for a couch whose hip point is `at` in the couches' plane: maps figurelib's seat
    frame (metres; head toward -Y, chest toward +Z, his right toward +X) into the scene."""
    return Matrix.Scale(MM, 4) @ couch_frame() @ Matrix.Translation(at) @ Matrix.Scale(1 / MM, 4) @ Matrix.Diagonal((-1, -1, 1, 1))


def seat_view(couch: bpy.types.Object, name: str, place: Matrix, keys: dict) -> None:
    """`Seat_<name>`: an empty at the eyes of the man in a couch, a child of the couch's node. In the file its +Z is the
    way he looks and its +Y the top of his head, which is what a seat's node promises (types.ts: `ModelDef.seats`). Both
    are his own head's, as the flight's figure holds it (figurelib.head_view: `keys`, in figurelib's seat frame, which
    `place` puts in the scene): he lies with his head straight on his shoulders, so he looks out of his chest at the
    cabin's wall over him. What that puts in front of each man is in voskhod.md, "The couches as seats"."""
    turn = place.to_3x3()
    eyes = place @ (Vector(keys["eyes"]) * 0.01)
    look, over = (turn @ Vector(keys["look"])).normalized(), (turn @ Vector(keys["crown"])).normalized()
    over = (over - look * look.dot(over)).normalized()
    node = group(f"Seat_{name}", couch)
    node.matrix_local = Matrix.Translation(eyes) @ Matrix(((-look).cross(over), -look, over)).transposed().to_4x4()
    C = Matrix.Scale(MM, 4) @ couch_frame()
    e = C.inverted() @ eyes
    c = C.to_3x3().normalized().inverted() @ look
    wall = to_lining(eyes / MM, look)
    print(
        f"voskhod: {name}'s eyes at ({e.x:.0f}, {e.y:.0f}, {e.z:.0f}) mm in the couches' plane, looking along "
        f"({c.x:.2f}, {c.y:.2f}, {c.z:.2f}) of it; the lining is {wall:.0f} mm from them that way, and the scene's "
        f"({eyes.x:.3f}, {eyes.y:.3f}, {eyes.z:.3f}) m is where they are"
    )


def to_lining(p: Vector, d: Vector) -> float:
    """How far it is from `p` along the unit vector `d` to the pressure hull's inner face (a ball of R_IN about the
    sphere's centre), millimetres."""
    q = p - Vector((0, 0, Z_C))
    b = q.dot(d)
    return -b + math.sqrt(b * b - q.length_squared + R_IN * R_IN)


def build_container(M: dict) -> None:
    """The parachute container behind hatch No. 2, under its cloth: a node of its own in the cabin (`ParachuteContainer`,
    as a Vostok's: its origin in the middle of its mouth, its +Z out along the hatch's line)."""
    if not interior():
        return
    cabin = bpy.data.objects["Cabin"]
    zin = INNER.z(vk.HATCH_R)
    r = CHUTE_R
    chute = MeshBuilder()
    end = zin - CHUTE_REACH
    chute.lathe(pm([(0, end), (r - 30, end), (r, end + 40), (r, zin - 50), (0, zin - 50)]), 48, matrix=OUTER.axis(*PARACHUTE))
    obj = chute.build("Cabin_ParachuteContainer", M["fabric"], cabin, sharp_angle=35)
    inside_cabin(obj)
    vk.rehome(obj, group("ParachuteContainer", cabin), OUTER.axis(*PARACHUTE) @ Matrix.Translation(V(0, 0, zin - 50)))


# ----------------------------------------------------------------------- the couches


def _resample(points: list[tuple[float, float]], step: float) -> list[tuple[float, float, float]]:
    """Points every `step` or so along a smooth curve through `points`, each with how far along the list it is."""
    pts = [Vector((y, z)) for y, z in points]
    n = len(pts)
    out = []
    for i in range(n - 1):
        p0, p1, p2, p3 = (pts[max(0, min(n - 1, k))] for k in (i - 1, i, i + 1, i + 2))
        pieces = max(1, round((p2 - p1).length / step))
        for k in range(pieces):
            t = k / pieces
            p = 0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t**3)
            out.append((p.x, p.y, i + t))
    out.append((pts[-1].x, pts[-1].y, float(n - 1)))
    return out


def _section(y: float, table: list) -> tuple[float, float]:
    """Half the couch's width and the height of its sides at a place along it (toward his head, from his hips)."""
    for (y0, w0, s0), (y1, w1, s1) in zip(table, table[1:]):
        if y1 <= y <= y0:
            t = (y0 - y) / (y0 - y1)
            t = t * t * (3 - 2 * t)
            return w0 + (w1 - w0) * t, s0 + (s1 - s0) * t
    return table[0][1:] if y > table[0][0] else table[-1][1:]


def build_couch(M: dict, name: str, at: tuple[float, float, float], suited: bool = False) -> bpy.types.Object:
    """One Elbrus couch, to the form the photographs of the flown ships show: a trough of riveted aluminium with a cup
    for the head and straight, dimpled side walls, a rest for the calves raised on two stays, pads in grey-green
    cloth, a maker's plate; under it two beams painted red, standing on four sprung struts, the pair at the head
    leaning. `at` is where his hip joints come, in the couches' plane; `suited` is the wider couch of the 3KD, for a
    man in a pressure suit. Returns its node, for the flight to put its man in."""
    g = group(f"Couch{name}")
    if not interior():
        return g
    C = couch_frame() @ Matrix.Translation(at)
    wide = 1.12 if suited else 1.0
    profile = PROFILE_SUITED + PROFILE[5:] if suited else PROFILE
    section = SECTION_SUITED + SECTION[4:] if suited else SECTION
    line = _resample(profile, 28.0)
    us = [math.sin(math.pi / 2 * k / 7) for k in range(-7, 8)]
    liner, pan, tubes, struts, beams, belts, plate = (MeshBuilder() for _ in range(7))

    def normal(i: int) -> Vector:
        """Toward the man, square to the line as it runs over a hand's breadth either way: the sides stand along this,
        and were it the line's own normal they would cross each other inside the bend under his seat."""
        a, b = line[max(0, i - 6)], line[min(len(line) - 1, i + 6)]
        t = Vector((b[0] - a[0], b[1] - a[1])).normalized()
        return Vector((t.y, -t.x))  # (the line runs head to feet)

    def point(u: float, i: int, down: float, out: float) -> Vector:
        """A point of the couch: `u` across, at the i-th place along the line, `down` under the pad's surface, `out` wider."""
        y, z, _ = line[i]
        half, side = _section(y, section)
        nm = normal(i)
        lift = side * abs(u) ** 2.6 - down
        return Vector((u * (half * wide + out), y + nm.x * lift, z + nm.y * lift))

    idx = list(range(len(line)))
    liner.grid(lambda u, i: point(u, int(i), 0.0, 0.0), us, idx, flip=True)
    pan.grid(lambda u, i: point(u, int(i), SHELL, 12.0), us, idx)
    # the trough's rolled edge, which closes the pad's edge: a strip from one surface to the other, all the way round
    rim_in = [point(-1, i, 0.0, 0.0) for i in idx] + [point(u, idx[-1], 0.0, 0.0) for u in us[1:]] + [point(1, i, 0.0, 0.0) for i in idx[::-1][1:]]
    rim_in += [point(u, 0, 0.0, 0.0) for u in us[::-1][1:-1]]
    rim_out = (
        [point(-1, i, SHELL, 12.0) for i in idx]
        + [point(u, idx[-1], SHELL, 12.0) for u in us[1:]]
        + [point(1, i, SHELL, 12.0) for i in idx[::-1][1:]]
    )
    rim_out += [point(u, 0, SHELL, 12.0) for u in us[::-1][1:-1]]
    m = len(rim_in)
    pan.add([*rim_in, *rim_out], [(k, (k + 1) % m, m + (k + 1) % m, m + k) for k in range(m)])

    # The box under his trunk: two side walls, two ends and a floor, of sheet 3 mm thick, standing 6 mm outside the
    # trough's own skin; round dimples stamped in the walls, a row of rivets along each edge.
    hx = 193.0 * wide + 12.0  # (under the trough's overhanging rim, so that a neighbour's elbow has the room beside it)
    y0, y1 = BOX
    z0, z1 = BOX_TOP - BOX_DEEP, BOX_TOP
    for sx in (-1, 1):
        pan.box((3.0, y0 - y1, BOX_DEEP), Matrix.Translation((sx * hx, (y0 + y1) / 2, (z0 + z1) / 2)))
        for k in range(4):
            y = y1 + (y0 - y1) * (k + 0.5) / 4
            pan.lathe([(58, 1.5), (58, 4.5), (50, 7.5), (0, 7.5)], 28, matrix=frame((sx * hx, y, (z0 + z1) / 2 - 6), (sx, 0, 0)))
        for k in range(18):
            y = y1 + (y0 - y1) * (k + 0.5) / 18
            for z in (z0 + 12, z1 - 12):
                tubes.disc((sx * (hx + 1.5), y, z), (sx, 0, 0), 4.5, 2.5, 8)
    for y in (y0, y1):
        pan.box((2 * hx - 5.4, 3.0, BOX_DEEP), Matrix.Translation((0, y + (1.5 if y == y1 else -1.5), (z0 + z1) / 2)))
    pan.box((2 * hx - 5.4, y0 - y1 - 8.4, 3.0), Matrix.Translation((0, (y0 + y1) / 2, z0 + 1.5)))
    # the maker's plate, on the wall at his right, by his shoulder (Pillet's photograph: «Изд. ЭЛЬБРУС»)
    plate.box((2.0, 74.0, 44.0), Matrix.Translation((-(hx + 2.5), y0 - 70.0, z1 - 44.0)))
    # the ends of his waist belt, hanging over the walls at his hips: the harness across him is not built
    for sx in (-1, 1):
        belts.box((4.0, 46.0, 130.0), Matrix.Translation((sx * (hx + 12.0), -10.0, z1 - 62.0)))
        tubes.box((7.0, 52.0, 30.0), Matrix.Translation((sx * (hx + 12.0), -10.0, z1 - 136.0)))
    # the rest under his calves: two rails under it and a stay from each down to the box's end
    rx = 150.0 * wide
    rest = [(-292.0, 226.0), (-420.0, 182.0), (-600.0, 130.0)]
    for sx in (-1, 1):
        tubes.loft([Vector((sx * rx, y, z)) for y, z in rest], [(11.0, 11.0)] * len(rest), 10, ref=(1, 0, 0), resample=1)
        tubes.tube(Vector((sx * rx, -330.0, 211.0)), Vector((sx * rx, y1 - 8.0, z0 + 20.0)), 9.0, 10)
        tubes.tube(Vector((sx * rx, -560.0, 140.0)), Vector((sx * rx, y1 - 8.0, z0 + 20.0)), 9.0, 10)
    tubes.tube(Vector((-rx, y1 - 8.0, z0 + 20.0)), Vector((rx, y1 - 8.0, z0 + 20.0)), 11.0, 10)
    # Under the box, two beams painted red, as the flown Voskhod 1's cradle is; and four sprung struts from them to
    # the cabin's structure. The pair at his head lean toward it, as the pair seen there in the photograph does; the
    # others stand square to the couches' plane. They are as long as reaches the hull: their real places were not found.
    bx = hx - 26.0
    zb = z0 - BEAM_DEEP / 2 - 3.0
    for sx in (-1, 1):
        beams.box((22.0, y0 - y1 - 50.0, BEAM_DEEP), Matrix.Translation((sx * bx, (y0 + y1) / 2 - 55.0, zb)))
        for k in range(5):
            y = y1 - 30.0 + (y0 - y1 - 50.0) * (k + 0.5) / 5
            beams.lathe([(30, 11.0), (30, 14.5), (0, 14.5)], 20, matrix=frame((sx * bx, y, zb), (sx, 0, 0)))
    reach = R_IN - 14.0 - 60.0
    for y, lean in ((y0 - 110.0, deg(24.0)), (y1 + 40.0, 0.0)):
        for sx in (-1, 1):
            top = Vector((sx * bx, y, zb - BEAM_DEEP / 2 + 8.0))
            way = Vector((0.0, math.sin(lean), -math.cos(lean)))
            c = Vector(at) + top  # in the couches' plane, from the sphere's centre
            b = c.dot(way)
            fall = -b + math.sqrt(max(0.0, b * b - c.length_squared + reach * reach))
            if fall < 90.0:
                continue
            foot, mid = top + way * fall, top + way * (fall * 0.5)
            struts.tube(foot, mid, 22.0, 16)
            struts.lathe([(22, 0), (28, 6), (28, 20), (22, 26)], 16, matrix=frame(mid, tuple(-way)))
            tubes.tube(mid - way * 2.0, top, 11.0, 10)
            struts.lathe([(44, 0), (44, 10), (24, 22)], 16, matrix=frame(foot, tuple(-way)))
    for mb, part, mat, kw in (
        (liner, "Liner", M["liner"], dict(sharp_angle=None)),
        (pan, "Pan", M["pan"], dict(sharp_angle=50)),
        (tubes, "Frame", M["tube"], dict(sharp_angle=35)),
        (struts, "Struts", M["steel"], dict(sharp_angle=35)),
        (beams, "Cradle", M["cradle"], dict(sharp_angle=35)),
        (belts, "Belt", M["belt"], dict(sharp_angle=35)),
        (plate, "Plate", M["panel_black"], dict(sharp_angle=35)),
    ):
        if mb.verts:
            inside_cabin(placed(mb, C).build(f"Couch{name}_{part}", mat, g, **kw), 6.0)
    return g


# ------------------------------------------------------------- the reserve engine


def build_reserve_engine(M: dict) -> None:
    """The reserve braking engine: a solid-propellant motor on the sphere's forward pole, where a Vostok had the housing
    of its forward antennas, standing in the lock the four straps meet at. Its outline is OKB-1's general drawing's: a
    drum that narrows a little, a step, a smaller drum with a flat face. How its gas left it is in nothing read."""
    g = group("ReserveEngine")
    case, band, mount, fit, bolts = (MeshBuilder() for _ in range(5))
    z0 = POLE
    h_mount, h_step, h_top = RESERVE_H_MOUNT, RESERVE_H_STEP, RESERVE_H
    r_foot, r_step, r_front = RESERVE_R
    # the mount: a collar from the lock up to the drum's foot, stiffened by eight gussets
    mount.lathe(pm([(236, Z_C + OUTER.z(236) - 6), (250, z0 + 40), (r_foot - 30, z0 + h_mount - 40), (r_foot - 30, z0 + h_mount + 12)]), 64)
    for i in range(8):
        a = TAU * (i + 0.5) / 8
        rad = Vector((math.cos(a), math.sin(a), 0))
        mid_r, mid_z = (250 + r_foot - 30) / 2 + 14, z0 + h_mount / 2
        lean = math.atan2(r_foot - 30 - 250, h_mount - 80)
        mount.box(
            (16 * MM, 190 * MM, 40 * MM),
            frame(V(mid_r * rad.x, mid_r * rad.y, mid_z), (math.cos(lean) * rad.x, math.cos(lean) * rad.y, -math.sin(lean))),
        )
    # the case: the rear drum, the step, the front drum and its face
    case.lathe(
        pm(
            [
                (r_foot, z0 + h_mount),
                (r_step, z0 + h_step),
                (r_front + 16, z0 + h_step + 26),
                (r_front, z0 + h_step + 60),
                (r_front, z0 + h_top - 14),
                (r_front - 14, z0 + h_top),
                (0, z0 + h_top),
            ]
        ),
        72,
    )
    case.lathe(pm([(r_foot - 34, z0 + h_mount), (r_foot, z0 + h_mount)]), 72)  # (its foot's own edge, over the collar)
    for z, r, half in ((z0 + h_mount + 34, r_foot - 2.5, 20), (z0 + h_step - 24, r_step + 1.8, 16), (z0 + h_top - 60, r_front, 16)):
        band.lathe(pm([(r - 3, z - half - 6), (r + 8, z - half), (r + 8, z + half), (r - 3, z + half + 6)]), 72)
        for i in range(24):
            a = TAU * i / 24
            bolts.disc(V((r + 8) * math.cos(a), (r + 8) * math.sin(a), z), (math.cos(a), math.sin(a), 0), 8 * MM, 5 * MM)
    # what the photographs of the test articles show on it: a hatch on the front drum, a cable duct down its side to
    # the sphere, and on its face a ring of short stubs round a boss
    a = deg(250)
    rad = Vector((math.cos(a), math.sin(a), 0))
    fit.box((230 * MM, 300 * MM, 20 * MM), frame(V(r_front * rad.x, r_front * rad.y, z0 + (h_step + h_top) / 2 + 10), tuple(rad)))
    a = deg(70)
    rad = Vector((math.cos(a), math.sin(a), 0))
    fit.box(
        (70 * MM, (h_top - h_step - 150) * MM, 50 * MM),
        frame(V((r_front + 8) * rad.x, (r_front + 8) * rad.y, z0 + (h_step + h_top) / 2 + 10), tuple(rad)),
    )
    slope = math.atan2(r_foot - r_step, h_step - h_mount)
    mid = (r_foot + r_step) / 2 + 8
    fit.box(
        (70 * MM, (h_step - h_mount - 150) * MM, 50 * MM),
        frame(V(mid * rad.x, mid * rad.y, z0 + (h_mount + h_step) / 2), (math.cos(slope) * rad.x, math.cos(slope) * rad.y, math.sin(slope))),
    )
    fit.lathe(pm([(92, z0 + h_top - 6), (92, z0 + h_top + 34), (70, z0 + h_top + 46), (0, z0 + h_top + 46)]), 32)
    for i in range(6):
        a = TAU * i / 6 + deg(15)
        fit.tube(V(215 * math.cos(a), 215 * math.sin(a), z0 + h_top - 8), V(215 * math.cos(a), 215 * math.sin(a), z0 + h_top + 57), 17 * MM, 12)
    mount.build("Reserve_Mount", M["frame"], g, sharp_angle=35)
    case.build("Reserve_Case", M["white"], g, sharp_angle=35)
    band.build("Reserve_Bands", M["frame"], g, sharp_angle=35)
    fit.build("Reserve_Fittings", M["frame"], g, sharp_angle=35)
    bolts.build("Reserve_Bolts", M["bolt"], g)


# ----------------------------------------------------------------- the Volga airlock

AIRLOCK = HATCH_3  # hatch No. 3: where a Vostok's technological hatch was, with the Vzor's porthole
AIRLOCK_R = 600.0  # 1.2 m outside
AIRLOCK_R_IN = 500.0  # 1.0 m inside
AIRLOCK_STOWED = 700.0  # folded for launch
AIRLOCK_LENGTH = 2500.0  # in orbit
AIRLOCK_HATCH_R = 350.0  # its outer hatch: 700 mm (Zak), or 650 (Siddiqi)
AIRLOCK_INNER_R = 325.0  # the hatchway from the cabin: 650 mm (Siddiqi p. 450; Zak's table), or 700 (Zak's text; Woods)
AIRLOCK_BASE = 120.0  # the lower assembly ring
AIRLOCK_HEAD = 260.0  # the upper rigid part
# The soft part is drawn in bands that stand inside one another when it is folded and are drawn out one from the next
# as it fills: nine, each 240 mm, 10 mm apart when nested, each going 225 mm further than the one below. The real one
# was folded cloth and rubber that straightened as its air beams filled; no two bands ever slid.
SLEEVES = 9
SLEEVE = 240.0
SLEEVE_NEST = 10.0
SLEEVE_TRAVEL = (AIRLOCK_LENGTH - AIRLOCK_STOWED) / (SLEEVES - 1)  # 225
AIR_BEAMS = 40  # (Siddiqi; Altunin and Verba have 36)
AIRLOCK_BOTTLE_R = 165.0  # four spheres round its foot (off the museum's article)


def airlock_frame() -> Matrix:
    """The airlock's own frame, metres: origin at the sphere's centre, +Z out along hatch No. 3's line."""
    return OUTER.axis(*AIRLOCK)


def airlock_foot() -> float:
    """Where the airlock's lower ring begins, mm from the sphere's centre along its line: on the ring left on the hull."""
    return OUTER.z(560.0) + 38.0


def build_inner_hatch(M: dict) -> None:
    """The hatch from the cabin into the airlock, in hatch No. 3's opening: a plate that closes the Vostok's metre down
    to a hatchway of 650 mm, its coaming, and a lid on the cabin's side of it that swings inward about a hinge on the
    side toward hatch No. 2 and the parachute container (Zak; Leonov: «лег на свою плиту»). The Vzor is in the lid: its
    porthole through it, its body on the lid's inner face. `AirlockHatch_Lid` is a node with its origin on the hinge,
    built shut; a flight swings it. Its drive, its cams and the hand wheel are not built."""
    g = group("AirlockHatch")
    ax = OUTER.axis(*AIRLOCK)
    r, ri = vk.HATCH_R - 9.0, AIRLOCK_INNER_R
    rc = ri + 30.0  # the coaming's outside
    skin, shell, rim, bolts, lid, glass, fit, lens = (MeshBuilder() for _ in range(8))
    skin.lathe(pm(OUTER.cap(r, rc)), 96, matrix=ax)
    skin.lathe(pm([(r, INNER.z(r)), (r, OUTER.z(r))]), 96, matrix=ax)  # the plate's own edge
    shell.lathe(pm(INNER.cap(r, rc)), 72, matrix=ax)
    lift = 12.0  # (the band it is bolted down by, as the Vostok's cover has: vostok_3ka.build_hatch)
    rim.lathe(
        pm([(r + 1.5, OUTER.z(r) - 6), (r + 1.5, OUTER.z(r + 1.5, lift)), *OUTER.cap(r, r - 76, lift, 3), (r - 76, OUTER.z(r - 76) - 6)]),
        96,
        matrix=ax,
    )
    rot = ax.to_3x3()
    for i in range(30):
        a = TAU * (i + 0.5) / 30
        rb = r - 38
        at = Vector((rb * math.cos(a), rb * math.sin(a), OUTER.z(rb, lift)))
        bolts.disc(ax @ (at * MM), rot @ at.normalized(), 11 * MM, 6 * MM)
    # the coaming: through the plate from 8 mm proud of the shield to a flange 70 mm inside the pressure skin
    zo, zi = OUTER.z(rc) + 8.0, INNER.z(rc) - 70.0
    rim.lathe(pm([(rc, zo - 20), (rc, zo), (ri, zo), (ri, zi), (ri + 52, zi), (ri + 52, zi + 12), (rc, zi + 12), (rc, zi + 76)]), 96, matrix=ax)
    if not interior():  # nothing is built inside: a dark disc stands in for the cabin
        void = MeshBuilder()
        void.lathe(pm([(ri, zi + 20), (0, zi + 20)]), 48, matrix=ax)
        void.build("AirlockHatch_WindowWell", M["void"], g)
    skin.build("AirlockHatch_Skin", M["foil"], g, sharp_angle=40)
    shell.build("AirlockHatch_Shell", M["shell"], g, sharp_angle=None)
    rim.build("AirlockHatch_Rim", M["frame"], g, sharp_angle=30)
    bolts.build("AirlockHatch_Bolts", M["bolt"], g)
    zl = zi - 5.0  # the lid's outer face
    hinge = ax @ V(ri + 62, 0, zl - 15)  # on the side toward hatch No. 2: east, as the ball's frames have it
    node = vk.pivot("AirlockHatch_Lid", g, hinge)  # (at every level of detail: a flight's data swings it)
    if not interior():
        return
    # The lid: a disc 30 mm thick seated under the flange, the Vzor's porthole in its middle; two lugs at the hinge.
    rp = vk.PORT_R
    lid.lathe(pm([(rp + 8, zl), (ri + 44, zl), (ri + 44, zl - 30), (rp + 8, zl - 30), (rp + 8, zl)]), 96, matrix=ax)
    glass.lathe(pm([(rp + 8, zl - 12), (0, zl - 12)]), 48, matrix=ax)
    for i in range(6):  # the cams that hold it shut («кулачки отошли, крышка пошла»)
        a = TAU * (i + 0.5) / 6
        cam = V((ri + 14) * math.cos(a), (ri + 14) * math.sin(a), zl - 36)
        fit.box((70 * MM, 34 * MM, 22 * MM), ax @ Matrix.Translation(cam) @ Matrix.Rotation(a, 4, "Z"))
    # the Vzor's body on its inner face, as the plain cabin's is on a Vostok's hatch, and shorter by the lid's depth
    zv = zl - 30.0
    fit.lathe(pm([(rp + 60, zv), (rp + 60, zv - 90), (rp + 20, zv - 160), (rp - 20, zv - 160)]), 40, matrix=ax)
    lens.lathe(pm([(rp - 20, zv - 160), (0, zv - 152)]), 40, matrix=ax, flip=True)
    for sy in (-1, 1):
        fit.box((60 * MM, 26 * MM, 30 * MM), ax @ Matrix.Translation(V(ri + 50, sy * 110, zl - 15)))
    fit.tube(ax @ V(ri + 62, -140, zl - 15), ax @ V(ri + 62, 140, zl - 15), 9 * MM, 12)
    for mb, name, mat in ((lid, "Plate", "frame"), (glass, "Glass", "glass"), (fit, "Fittings", "equipment"), (lens, "Vzor", "lens")):
        vk.hang(mb.build(f"AirlockHatch_Lid_{name}", M[mat], None, sharp_angle=35), node)


def build_airlock(M: dict, extended: bool = False) -> None:
    """The Volga airlock on hatch No. 3, folded as it rode under the fairing: the ring it leaves on the hull, the cover
    of the hatch into the cabin (with the Vzor's porthole in it), the lower assembly ring with four bottles, the soft
    tube, the rigid head with the outer hatch, a rail and the cine camera on its bracket. Each piece that moves is a
    node with its origin where the airlock is made fast to the hull; `extended` builds it as it stood in orbit, for a
    still (a flight builds it folded, and its data draws it out)."""
    A = airlock_frame()
    rot = A.to_3x3()
    z0 = airlock_foot()
    at = A @ (Vector((0, 0, z0)) * MM)
    out = (rot @ Vector((0, 0, 1))).normalized()
    cloth = material("airlock-cloth-tan", (0.60, 0.50, 0.34), 0.0, 0.92)
    bladder = material("airlock-bladder-cream", (0.78, 0.75, 0.66), 0.0, 0.85)
    grey = material("airlock-cap-grey", (0.42, 0.45, 0.50), 0.3, 0.55)
    P = lambda r, th, zl: A @ (Vector((r * math.cos(th), r * math.sin(th), z0 + zl)) * MM)  # noqa: E731
    prof = lambda pts: pm([(r, z0 + zl) for r, zl in pts])  # noqa: E731

    # what stays on the hull: the ring it stood on, and the hatch's cover
    ring = MeshBuilder()
    ring.lathe(pm([(612, OUTER.z(612) - 8), (612, z0 - 4), (556, z0 - 4), (556, OUTER.z(556) - 8)]), 96, matrix=A)
    ring.build("AirlockRing_Flange", M["frame"], group("AirlockRing"), sharp_angle=30)
    build_inner_hatch(M)

    g = group("Airlock")

    def piece(name: str, travel: float) -> bpy.types.Object:
        node = vk.pivot(name, g, at.copy())
        if extended:
            node.location = node.location + out * travel * MM
        return node

    def hang(mb: MeshBuilder, name: str, mat, node: bpy.types.Object, **kw) -> None:
        """A mesh built where it stands folded, made a child of a piece's node (which may stand drawn out)."""
        obj = mb.build(name, mat, None, **kw)
        obj.data.transform(Matrix.Translation(-at))
        obj.parent = node

    # the lower assembly ring, and round it the four bottles: air for the beams, for filling the airlock again, and two in reserve
    body = piece("Airlock_Body", 0.0)
    base, tanks, steel = MeshBuilder(), MeshBuilder(), MeshBuilder()
    h = AIRLOCK_BASE
    base.lathe(prof([(466, 0), (640, 0), (640, 46), (608, 56), (608, h - 2), (466, h - 2), (466, 0)]), 96, matrix=A)
    for i in range(24):
        a = TAU * (i + 0.5) / 24
        steel.disc(P(626, a, 50), tuple(out), 9 * MM, 6 * MM)
    # (they stand on the side toward the ship's nose, which is where there is room for them under the fairing)
    up = rot.inverted() @ (Vector((0, 0, 1)) - out * out.z)
    a_nose = math.atan2(up.y, up.x)
    for i in range(4):
        a = a_nose + deg(-66 + 44 * i)
        m = Matrix.Translation(P(800, a, 40)) @ rot.to_4x4() @ Matrix.Rotation(a, 4, "Z")
        r = AIRLOCK_BOTTLE_R
        tanks.lathe(pm([(r * math.cos(deg(-90 + 180 * k / 14)), r * math.sin(deg(-90 + 180 * k / 14))) for k in range(15)]), 28, matrix=m)
        steel.lathe(pm([(r + 1.5, -15), (r + 3.5, -13), (r + 3.5, 13), (r + 1.5, 15)]), 28, matrix=m @ Matrix.Rotation(math.pi / 2, 4, "Y"))
        steel.box((150 * MM, 60 * MM, 60 * MM), m @ Matrix.Translation(V(-r - 40, 0, -10)))  # its cradle on the ring
        steel.tube(P(800, a, 40 + r - 4), P(800, a, 40 + r + 34), 12 * MM, 8)  # its valve
        steel.tube(P(800, a, 40 + r + 28), P(624, a, 90), 7 * MM, 8)  # and the pipe from it to the ring
    hang(base, "Airlock_BaseRing", M["frame"], body, sharp_angle=35)
    hang(tanks, "Airlock_Bottles", M["tank"], body, sharp_angle=None)
    hang(steel, "Airlock_BaseFittings", M["steel"], body, sharp_angle=35)

    # the soft tube: the cover outside, the bladder inside, the air beams between showing as flutes
    n = AIR_BEAMS * (6 if srlib.DETAIL >= 1.0 else 3 if srlib.DETAIL >= 0.5 else 2)
    us = [TAU * i / n for i in range(n)]
    flute = lambda th: 3.0 * (1 - abs(math.cos(AIR_BEAMS * th / 2)))  # noqa: E731
    for k in range(SLEEVES):
        node = piece(f"Airlock_Tube_{k + 1}", SLEEVE_TRAVEL * k)
        lo = AIRLOCK_BASE + SLEEVE_NEST * k
        hi = lo + SLEEVE
        ro, ri = AIRLOCK_R - 6.0 * k, AIRLOCK_R_IN - 48.0 + 6.0 * k
        cover, inner, hoop = MeshBuilder(), MeshBuilder(), MeshBuilder()
        cover.grid(lambda u, v, ro=ro, lo=lo, hi=hi: P(ro - flute(u), u, lo + (hi - lo) * v), us, [0.0, 1.0], closed_u=True)
        inner.grid(lambda u, v, ri=ri, lo=lo, hi=hi: P(ri + flute(u), u, lo + (hi - lo) * v), us, [0.0, 1.0], closed_u=True, flip=True)
        # its two ends, closing the wall between cover and bladder
        wall = lambda u, v, ro=ro, ri=ri: ri + flute(u) + (ro - ri - 2 * flute(u)) * v  # noqa: E731
        cover.grid(lambda u, v, hi=hi, wall=wall: P(wall(u, v), u, hi), us, [0.0, 1.0], closed_u=True, flip=True)
        cover.grid(lambda u, v, lo=lo, wall=wall: P(wall(u, v), u, lo), us, [0.0, 1.0], closed_u=True)
        # (the hoop is cut round at the cover's own stations, so that it stands off the cover alike at every level of detail)
        band = [(ro - 9, hi - 24), (ro + 1.5, hi - 18), (ro + 1.5, hi - 3), (ro - 9, hi - 3)]
        hoop.grid(lambda u, j, band=band: P(band[int(j)][0], u, band[int(j)][1]), us, [0, 1, 2, 3], closed_u=True)
        hang(cover, f"Airlock_Tube_{k + 1}_Cover", cloth, node, sharp_angle=50)
        hang(inner, f"Airlock_Tube_{k + 1}_Bladder", bladder, node, sharp_angle=50)
        hang(hoop, f"Airlock_Tube_{k + 1}_Hoop", cloth, node, sharp_angle=35)

    # the head: a ribbed ring, the plate the outer hatch seats in, the rail that crowns it, the cine camera on its bracket
    head = piece("Airlock_Head", AIRLOCK_LENGTH - AIRLOCK_STOWED)
    z1 = AIRLOCK_STOWED - AIRLOCK_HEAD
    z2 = AIRLOCK_STOWED
    hr = AIRLOCK_HATCH_R
    shell, ribs, rail, cam, glass = (MeshBuilder() for _ in range(5))
    shell.lathe(
        prof(
            [
                (470, z1),
                (606, z1),
                (622, z1 + 12),
                (622, z2 - 60),
                (600, z2 - 32),
                (560, z2),
                (hr + 12, z2),
                (hr + 12, z2 - 40),
                (470, z2 - 40),
                (470, z1),
            ]
        ),
        96,
        matrix=A,
    )
    for i in range(24):
        a = TAU * i / 24
        ribs.box((26 * MM, 150 * MM, 22 * MM), frame(P(629, a, (z1 + z2) / 2 - 24), tuple(rot @ Vector((math.cos(a), math.sin(a), 0)))))
    rail.lathe(prof([(540 + 11 * math.cos(deg(t)), z2 + 70 + 11 * math.sin(deg(t))) for t in range(0, 361, 45)]), 72, matrix=A)
    for i in range(6):
        a = TAU * i / 6 + deg(30)
        rail.tube(P(540, a, z2 - 4), P(540, a, z2 + 66), 9 * MM, 8)
    # (the camera stands on the side toward the ship's nose, looking back across the hatch at the man coming out)
    a_cam = a_nose
    arm = [P(612, a_cam, z2 - 110), P(664, a_cam, z2 - 20), P(650, a_cam, z2 + 70)]
    cam.loft(arm, [(14 * MM, 14 * MM)] * 3, 10, ref=tuple(out), resample=2)
    look = (P(0, 0, z2 + 420) - arm[-1]).normalized()
    C = frame(arm[-1] + out * 0.09, tuple(look))
    vk.rounded_box(cam, (120 * MM, 210 * MM, 150 * MM), 18 * MM, C @ Matrix.Rotation(math.pi / 2, 4, "X"))
    cam.lathe(pm([(34, 100), (34, 150), (40, 156), (40, 176), (30, 176), (30, 150)]), 24, matrix=C)
    glass.lathe(pm([(30, 150), (0, 150)]), 24, matrix=C)
    hang(shell, "Airlock_HeadRing", M["frame"], head, sharp_angle=35)
    hang(ribs, "Airlock_HeadRibs", M["frame"], head, sharp_angle=35)
    hang(rail, "Airlock_Rail", M["steel"], head, sharp_angle=35)
    hang(cam, "Airlock_Camera", M["white"], head, sharp_angle=35)
    hang(glass, "Airlock_CameraLens", M["lens"], head, sharp_angle=35)
    # the outer hatch: a domed cover hinged at its rim on the side away from the camera, which opened inward
    hinge = P(hr - 10, a_cam + math.pi, z2 - 14) - at
    hatch = vk.pivot("Airlock_OuterHatch", head, hinge)
    lid = MeshBuilder()
    rise = lambda r: 70.0 * (1 - (r / hr) ** 2)  # noqa: E731
    lid.lathe(prof([(hr, z2 - 30), (hr, z2 - 4), *[(hr * (1 - j / 10), z2 - 4 + rise(hr * (1 - j / 10))) for j in range(1, 11)]]), 64, matrix=A)
    lid.lathe(prof([(hr * j / 10, z2 - 24 + rise(hr * j / 10)) for j in range(0, 10)] + [(hr, z2 - 30)]), 64, matrix=A, flip=True)
    obj = lid.build("Airlock_OuterHatch_Lid", grey, None, sharp_angle=40)
    obj.data.transform(Matrix.Translation(-(at + hinge)))
    obj.parent = hatch


# ---------------------------------------------------------------------------- main


def materials() -> dict:
    m = material
    return {
        **vk.materials("white"),
        # the couches as the flown Voskhod 2's show them: pads covered in a grey-green cloth, in pans of bare aluminium
        "liner": m("couch-cloth-greygreen", (0.20, 0.25, 0.24), 0.0, 0.92),
        "pan": m("couch-pan-aluminium", (0.60, 0.61, 0.60), 0.9, 0.5, double_sided=True),
        "tube": m("couch-tube", (0.55, 0.56, 0.55), 0.9, 0.45),
        # the beams under the couches, as the flown Voskhod 1 has them: painted a red lead colour
        "cradle": m("couch-cradle-red", (0.52, 0.13, 0.05), 0.2, 0.6),
        "belt": m("couch-belt-grey", (0.42, 0.42, 0.38), 0.0, 0.9),
    }


def build(
    kind: str = "3KV",
    crew: Callable[[str, bpy.types.Object, Matrix], object] | None = None,
    stowed: bool = False,
    airlock_extended: bool = False,
) -> str:
    """Build the spacecraft. `kind` is "3KV" or "3KD". `crew(place_name, node, place)` builds the man in each couch
    ("Left", "Centre", "Right": his couch's node, and where his hips are, in figurelib's seat frame); left out, the
    couches are empty. `stowed` draws the instrument module's ten antennas withdrawn, as a flight under its fairing needs.
    `airlock_extended` builds the 3KD's airlock as it stood in orbit, for a still."""
    assert kind in ("3KV", "3KD")
    M = materials()
    vk.build_descent_module(M, pole=False, technological=kind == "3KV", hatches=HATCHES)
    vk.build_hatches(M, HATCHES)
    board = vk.seat_frame().inverted() @ board_frame()
    vk.build_cabin(M, tv_standins=False, rails=False, stores=False, controls=False, hatches=HATCHES, board=board, container=False, vzor=kind == "3KV")
    build_container(M)
    vk.cut_openings(HATCHES)
    for name, at in (COUCH_3KV if kind == "3KV" else COUCH_3KD).items():
        node = build_couch(M, name, at, suited=kind == "3KD")
        if crew and interior():
            # (a man in a pressure suit lies a finger's breadth higher and further up the couch than one in cloth)
            place = figure_place(at if kind == "3KV" else (at[0], at[1] + SUITED[0], at[2] + SUITED[1]))
            keys = crew(name, node, place)
            # a figure that says where its eyes are gives its couch an eye point: somewhere to sit
            if isinstance(keys, dict) and "eyes" in keys:
                seat_view(node, name, place, keys)
    build_reserve_engine(M)
    if kind == "3KD":
        build_airlock(M, airlock_extended)
    vk.build_straps(M)
    vk.build_cable_mast(M)
    vk.build_instrument_module(M, stowed)
    vk.build_gas_bottles(M)
    vk.build_retro_engine(M)
    mark_shells(SHELLS_3KV if kind == "3KV" else SHELLS_3KD)
    return f"{LENGTH * MM:.3f} m nozzle to the top of the reserve engine, {2 * vk.MODULE_R * MM:.3f} m across"
