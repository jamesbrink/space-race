"""The Voskhod spacecraft in its two builds: the 3KV, with three couches (Voskhod 1), and the 3KD, with
two couches and the Volga airlock (Voskhod 2).

A Voskhod is a Vostok 3KA altered, and this module is that alteration and nothing more. What was the
Vostok's is imported from ../../vostok/vehicles/vostok_3ka.py and built by it: the sphere and its
hatches, the pressure hull and its lining, the instrument board and the Vzor (which stayed where they
were), the parachute container, the four straps and their lock, the cable mast, the instrument module,
its antennas, the bottle ring, the braking engine. What is built here is what a Voskhod had instead of
the ejection seat and on top of the sphere: the couches, set square to the old seat's line; the controls
moved to them; the reserve braking engine on the forward pole; and, on the 3KD, the airlock on hatch
No. 3 with what served it. See voskhod.md for what each number rests on.

Every dimension is in millimetres. Stations, azimuths and latitudes are the 3KA's (station 0 at the
braking engine's nozzle, +Z toward the descent module; azimuths about +Z from +X).

Top-level nodes:
    DescentModule  EntryHatch  ParachuteHatch  Cabin  ReserveEngine
    RetainingStraps  CableMast  InstrumentModule  Antennas  GasBottles  RetroEngine
and for the 3KV:   CouchLeft  CouchCentre  CouchRight
and for the 3KD:   CouchLeft  CouchRight  Airlock  AirlockRing  AirBottles
"""

from __future__ import annotations

import math
from collections.abc import Callable

import bpy
from mathutils import Matrix, Vector

import vostok_3ka as vk
from srlib import TAU, MeshBuilder, deg, frame, group, interior, mark_shells, material
from vostok_3ka import MM, OUTER, R_IN, Z_C, R, V, inside_cabin, placed, pm

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

# The couches. Each has its own frame, millimetres: origin midway between the man's hip joints, +X to his left, +Y to
# his head, +Z out of his chest. They lie in the plane the Vostok seat lay in, turned a quarter turn in it, so that
# the instrument board and the Vzor are at the crew's left and the entry hatch at their right; their heads are toward
# the parachute container. Where each stood in that plane is estimated: nothing with a dimension was found.
COUCH_3KV = {"Left": (530.0, -70.0, -215.0), "Centre": (0.0, -150.0, -55.0), "Right": (-530.0, -70.0, -215.0)}
COUCH_3KD = {"Left": (300.0, -40.0, -190.0), "Right": (-300.0, -40.0, -190.0)}
# The pose a couch holds a man in, as figurelib's joint angles in degrees (thighs raised from the line of the back,
# shins laid over): estimated, off photographs of the couches.
POSE = {"hip": 68.0, "knee": 88.0}
BACK = -142.0  # the liner under his back, below his hip joints
RAIL = -226.0  # the frame's two tubes, under that
# The liner's line under him, head to feet: (toward his head, out of his chest), from his hip joints. It is the under
# side of the seated figure (crew/flight_suit.py, in the pose above) with a finger's breadth to spare, and so is no
# more a survey of an Elbrus couch than the figure is of a man.
PROFILE = [
    (835.0, -86.0),
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
    (-240.0, 272.0),
    (-275.0, 286.0),
    (-330.0, 270.0),
    (-400.0, 240.0),
    (-500.0, 206.0),
    (-580.0, 182.0),
    (-690.0, 176.0),
]
# half its width and how high its sides stand, at places along it (toward his head): narrow enough under his trunk
# for his arms to lie outside it
SECTION = [
    (835.0, 105.0, 25.0),
    (700.0, 125.0, 45.0),
    (600.0, 120.0, 30.0),
    (520.0, 205.0, 40.0),
    (300.0, 212.0, 52.0),
    (0.0, 215.0, 55.0),
    (-100.0, 215.0, 60.0),
    (-160.0, 205.0, 45.0),
    (-240.0, 205.0, 30.0),
    (-400.0, 205.0, 30.0),
    (-690.0, 200.0, 25.0),
]
SHELL = 26.0  # the liner's thickness, down to the pan's own skin

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
SHELLS_3KV = (*SHELLS_COMMON, "DM_TechHatch_Skin", "DM_TechHatch_Shell", "DM_TechHatch_Rim", "DM_TechHatch_Bolts", "DM_TechHatch_Glass")


def couch_frame() -> Matrix:
    """The couches' plane, millimetres: the Vostok seat's own, turned a quarter turn about the line out of the man's
    chest, with its origin at the sphere's centre. +X is the crew's left (toward hatch No. 3 and the Vzor), +Y toward
    their heads (hatch No. 2 and the parachute container), +Z out of their chests."""
    m = (vk.seat_frame().to_3x3() @ Matrix(((0, 1, 0), (-1, 0, 0), (0, 0, 1)))).to_4x4()
    m.translation = Vector((0, 0, Z_C))
    return m


def figure_place(at: tuple[float, float, float]) -> Matrix:
    """Where a seated figure goes for a couch whose hip point is `at` in the couches' plane: maps figurelib's seat
    frame (metres; head toward -Y, chest toward +Z, his right toward +X) into the scene."""
    return Matrix.Scale(MM, 4) @ couch_frame() @ Matrix.Translation(at) @ Matrix.Scale(1 / MM, 4) @ Matrix.Diagonal((-1, -1, 1, 1))


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


def _section(y: float) -> tuple[float, float]:
    """Half the couch's width and the height of its sides at a place along it (toward his head, from his hips)."""
    for (y0, w0, s0), (y1, w1, s1) in zip(SECTION, SECTION[1:]):
        if y1 <= y <= y0:
            t = (y0 - y) / (y0 - y1)
            t = t * t * (3 - 2 * t)
            return w0 + (w1 - w0) * t, s0 + (s1 - s0) * t
    return SECTION[0][1:] if y > SECTION[0][0] else SECTION[-1][1:]


def build_couch(M: dict, name: str, at: tuple[float, float, float], suited: bool = False) -> bpy.types.Object:
    """One Elbrus couch: a pan shaped to a man lying with his knees drawn up, lined, on a frame of tubes that stands on
    four sprung struts. `at` is where his hip joints come, in the couches' plane; `suited` is the wider couch of the
    3KD, for a man in a pressure suit. Returns its node, for the flight to put its man in."""
    g = group(f"Couch{name}")
    if not interior():
        return g
    C = couch_frame() @ Matrix.Translation(at)
    wide = 1.12 if suited else 1.0
    line = _resample(PROFILE, 28.0)
    us = [math.sin(math.pi / 2 * k / 7) for k in range(-7, 8)]
    liner, pan, tubes, struts = (MeshBuilder() for _ in range(4))

    def normal(i: int) -> Vector:
        """Toward the man, square to the line as it runs over a hand's breadth either way: the sides stand along this,
        and were it the line's own normal they would cross each other inside the bend under his seat."""
        a, b = line[max(0, i - 6)], line[min(len(line) - 1, i + 6)]
        t = Vector((b[0] - a[0], b[1] - a[1])).normalized()
        return Vector((t.y, -t.x))  # (the line runs head to feet)

    def point(u: float, i: int, down: float, out: float) -> Vector:
        """A point of the couch: `u` across, at the i-th place along the line, `down` under the liner's surface, `out` wider."""
        y, z, _ = line[i]
        half, side = _section(y)
        nm = normal(i)
        lift = side * abs(u) ** 2.6 - down
        return Vector((u * (half * wide + out), y + nm.x * lift, z + nm.y * lift))

    idx = list(range(len(line)))
    liner.grid(lambda u, i: point(u, int(i), 0.0, 0.0), us, idx, flip=True)
    pan.grid(lambda u, i: point(u, int(i), SHELL, 12.0), us, idx)
    # the pan's rolled edge, which closes the liner's edge: a strip from one surface to the other, all the way round
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
    # The frame under it: a sledge of two tubes, straight under his back and rising to the rest under his calves,
    # joined across and carrying the pan on posts.
    rx = 138.0 * wide
    sledge = [(770.0, -176.0), (650.0, -204.0), (520.0, RAIL), (-150.0, RAIL), (-640.0, 110.0)]

    def rail_z(y: float) -> float:
        for (y0, z0), (y1, z1) in zip(sledge, sledge[1:]):
            if y1 <= y <= y0:
                return z0 + (z1 - z0) * (y0 - y) / (y0 - y1)
        raise ValueError(y)

    def pan_under(y: float, behind: bool) -> float:
        """The pan's own under side over a place along the sledge: under his back, or under the rest for his calves."""
        rows = [(py, pz) for py, pz in PROFILE if (pz < -60.0) == behind]
        (y0, z0), (y1, z1) = min(zip(rows, rows[1:]), key=lambda ab: abs((ab[0][0] + ab[1][0]) / 2 - y))
        return z0 + (z1 - z0) * (y - y0) / (y1 - y0) - SHELL

    for sx in (-1, 1):
        tubes.loft([Vector((sx * rx, y, z)) for y, z in sledge], [(15.0, 15.0)] * len(sledge), 12, ref=(1, 0, 0), resample=1)
    for y, behind in ((600.0, True), (250.0, True), (-100.0, True), (-540.0, False)):
        z = rail_z(y)
        tubes.tube(Vector((-rx, y, z)), Vector((rx, y, z)), 13.0, 10)
        for sx in (-1, 1):  # a post from the sledge up into the pan
            tubes.tube(Vector((sx * rx, y, z + 4.0)), Vector((sx * rx, y, pan_under(y, behind) + 6.0)), 9.0, 8)
    # Four struts carry it: each a cylinder with a rod, sprung, standing from the cabin's structure up to the sledge.
    # They are drawn square to the couches' plane and as long as reaches the hull; their real places were not found.
    reach = R_IN - 14.0 - 75.0
    for y in (480.0, -40.0):
        for sx in (-1, 1):
            top = Vector((sx * rx, y, rail_z(y) - 4.0))
            c = Vector(at) + top  # in the couches' plane, from the sphere's centre
            fall = c.z + math.sqrt(max(0.0, reach * reach - c.x * c.x - c.y * c.y))
            if fall < 70.0:
                continue
            foot = top - Vector((0, 0, fall))
            mid = top - Vector((0, 0, fall * 0.55))
            struts.tube(foot, mid, 24.0, 16)
            struts.lathe([(24, 0), (30, 6), (30, 20), (24, 26)], 16, matrix=frame(mid, (0, 0, 1)))
            tubes.tube(mid + Vector((0, 0, 2.0)), top, 11.0, 10)
            struts.lathe([(46, 0), (46, 10), (26, 22)], 16, matrix=frame(foot, (0, 0, 1)))
    for mb, part, mat, kw in (
        (liner, "Liner", M["liner"], dict(sharp_angle=None)),
        (pan, "Pan", M["pan"], dict(sharp_angle=50)),
        (tubes, "Frame", M["tube"], dict(sharp_angle=35)),
        (struts, "Struts", M["steel"], dict(sharp_angle=35)),
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


# ---------------------------------------------------------------------------- main


def materials() -> dict:
    m = material
    return {
        **vk.materials("white"),
        # the couches as the flown Voskhod 2's show them: pads covered in a grey-green cloth, in pans of bare aluminium
        "liner": m("couch-cloth-greygreen", (0.20, 0.25, 0.24), 0.0, 0.92),
        "pan": m("couch-pan-aluminium", (0.60, 0.61, 0.60), 0.9, 0.5, double_sided=True),
        "tube": m("couch-tube", (0.55, 0.56, 0.55), 0.9, 0.45),
    }


def build(
    kind: str = "3KV",
    crew: Callable[[str, bpy.types.Object, Matrix], object] | None = None,
    stowed: bool = False,
) -> str:
    """Build the spacecraft. `kind` is "3KV" or "3KD". `crew(place_name, node, place)` builds the man in each couch
    ("Left", "Centre", "Right": his couch's node, and where his hips are, in figurelib's seat frame); left out, the
    couches are empty. `stowed` draws the instrument module's ten antennas withdrawn, as a flight under its fairing needs."""
    assert kind in ("3KV", "3KD")
    M = materials()
    vk.build_descent_module(M, pole=False, technological=kind == "3KV")
    vk.build_hatches(M)
    vk.build_cabin(M, tv_standins=False, rails=False, stores=False, controls=False)
    vk.cut_openings()
    for name, at in (COUCH_3KV if kind == "3KV" else COUCH_3KD).items():
        node = build_couch(M, name, at, suited=kind == "3KD")
        if crew and interior():
            crew(name, node, figure_place(at))
    build_reserve_engine(M)
    vk.build_straps(M)
    vk.build_cable_mast(M)
    vk.build_instrument_module(M, stowed)
    vk.build_gas_bottles(M)
    vk.build_retro_engine(M)
    mark_shells(SHELLS_3KV if kind == "3KV" else SHELLS_COMMON)
    return f"{LENGTH * MM:.3f} m nozzle to the top of the reserve engine, {2 * vk.MODULE_R * MM:.3f} m across"
