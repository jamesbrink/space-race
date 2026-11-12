"""The Vostok 3KA spacecraft: descent module, instrument module and what joins them.

Shared by every crewed Vostok; a flight's model/vehicle.py calls build() with what its own
spacecraft carried. See vostok-3ka.md for what each number rests on.

Every dimension is in millimetres, the unit of OKB-1's drawings and of every Soviet figure
quoted, and is converted once, at the point of use, with MM. Station 0 is the exit plane of the
braking engine's nozzle; +Z is toward the descent module, which rode forward under the fairing.
Azimuths are measured about +Z from +X.

Top-level nodes:
    DescentModule  EntryHatch  ParachuteHatch  Cabin  EjectionSeat
    RetainingStraps  CableMast  InstrumentModule  GasBottles  RetroEngine
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

from srlib import TAU, MeshBuilder, arc_profile, bore, deg, frame, group, interior, lathe_obj, load_font, mark_shells, material, prof, text_mesh

MM = 0.001

# ------------------------------------------------------------------ dimensions (mm)

R = 1150.0  # descent module: a sphere 2.3 m across its heat shield
R_IN = 1100.0  # its pressure hull, 2.2 m
WALL = R - R_IN  # (the shield is thicker on the side that meets the air; the model's is even all round)
MODULE_R = 1215.0  # instrument module: 2.43 m at the joint of its two cones
LENGTH = 4400.0  # without antennas: nozzle exit to the top of the housing on the sphere's forward pole
CAP_H = 220.0  # that housing, above the sphere

Z_C = LENGTH - CAP_H - R  # the sphere's centre
# the instrument module's profile, scaled off RKK Energia's dimensioned cutaway and photographs of the Kaluga article
Z_TAIL = 250.0  # where the aft cone meets the engine's skirt
TAIL_R = 300.0
Z_BAND0, Z_BAND1 = 1200.0, 1280.0  # the frame at the greatest diameter
Z_SHELF = 1880.0  # the forward cone's top, where the gas bottles sit: level with the sphere's aft pole
SHELF_R = 990.0
DRUM_R = 840.0
Z_DRUM = 2130.0  # the rim of the dish the sphere sits over
SEAT_RING_R = 830.0  # where the support ring meets the sphere
Z_SEAT_RING = Z_C - math.sqrt(R**2 - SEAT_RING_R**2)

BOTTLE_SLOTS = 16  # places round the ring; fourteen hold a bottle
BOTTLE_GAPS = (9, 1)  # the cable mast passes through one empty place; the other is put opposite it
BOTTLE_R = 165.0
BOTTLE_RING_R = 1040.0
Z_BOTTLES = Z_SHELF + BOTTLE_R + 10.0

HATCH_R = 500.0  # each of the three hatches is about a metre across
PORT_R = 100.0  # clear glass of a porthole
# The entry hatch is over the pilot's head, on the line of the seat's rails. It is put at 135 degrees so that the
# viewer's cutaway (the quadrant from 180 to 270 degrees) shows him side on, from his right.
HATCH_AZ = deg(135.0)
SEAT_TILT = deg(24.0)  # the seat's rails above the plane square to the long axis
STRAPS = 4
STRAP_AZ = [deg(90.0 * i) for i in range(STRAPS)]
# hatch: (azimuth, latitude). No. 1, entry, over his head; No. 3, technological, opposite it beyond his feet;
# No. 2, parachute, between them at his left. Each lies between two straps.
ENTRY = (HATCH_AZ, SEAT_TILT)
PARACHUTE = (HATCH_AZ - math.pi / 2, deg(30.0))
TECHNOLOGICAL = (HATCH_AZ + math.pi, deg(15.0))
MAST_AZ = deg(202.5)  # the cable mast, in the fourth gap between the straps
MAST_LAT = deg(40.0)
# The three portholes: one in each of hatches 1 and 3 (the Vzor looks through No. 3's), and one at his right.
RIGHT_PORT = (deg(247.0), deg(28.0))
HAIRPIN_LAT = deg(60.0)

SHELLS = (
    "DM_Insulation",
    "DM_Fittings",
    "DM_Glass",
    "DM_HatchRings",
    "DM_Bolts",
    "DM_MastSockets",
    "DM_TechHatch_Skin",
    "DM_TechHatch_Shell",
    "DM_TechHatch_Rim",
    "DM_TechHatch_Bolts",
    "DM_TechHatch_Glass",
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


def V(x: float, y: float, z: float) -> Vector:
    """Millimetres in, metres out."""
    return Vector((x, y, z)) * MM


def pm(points):
    return prof(points, MM)


class Ball:
    """The descent module's sphere, or one concentric with it: points by azimuth and latitude."""

    def __init__(self, r: float) -> None:
        self.r = r

    @staticmethod
    def n(az: float, lat: float) -> Vector:
        return Vector((math.cos(lat) * math.cos(az), math.cos(lat) * math.sin(az), math.sin(lat)))

    def p(self, az: float, lat: float, off: float = 0.0) -> Vector:
        return (Vector((0, 0, Z_C)) + (self.r + off) * self.n(az, lat)) * MM

    def frame(self, az: float, lat: float, off: float = 0.0) -> Matrix:
        """Origin on the surface, local +Z outward, +X east, +Y north."""
        return frame(self.p(az, lat, off), self.n(az, lat))

    def axis(self, az: float, lat: float) -> Matrix:
        """Origin at the centre, local +Z through the point: what a hatch is turned about."""
        return frame(V(0, 0, Z_C), self.n(az, lat))

    def cap(self, r_edge: float, r_inner: float = 0.0, off: float = 0.0, n: int = 12):
        """A profile for a lathe about axis(): the sphere's surface from `r_edge` in to `r_inner`
        (distances from the axis), listed so that its faces look outward."""
        rr = self.r + off
        a0, a1 = math.asin(r_edge / rr), math.asin(r_inner / rr)
        return [(rr * math.sin(a0 + (a1 - a0) * i / n), rr * math.cos(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

    def z(self, r: float, off: float = 0.0) -> float:
        """Height above the centre, along a hatch's axis, of the surface at distance r from it."""
        return math.sqrt((self.r + off) ** 2 - r**2)


OUTER = Ball(R)
INNER = Ball(R_IN)


def seat_frame() -> Matrix:
    """The seat's own frame, millimetres: origin midway between the pilot's hip joints, +Y up the
    rails toward his head and the entry hatch, +Z out of his chest, +X to his left."""
    h = Vector((math.cos(HATCH_AZ), math.sin(HATCH_AZ), 0.0))
    up = Vector((0.0, 0.0, 1.0))
    s = h * math.cos(SEAT_TILT) + up * math.sin(SEAT_TILT)
    n = -h * math.sin(SEAT_TILT) + up * math.cos(SEAT_TILT)
    m = Matrix((s.cross(n), s, n)).transposed().to_4x4()
    # the rails' line through the middle of the hatch passes 65 mm in front of his hips
    m.translation = Vector((0, 0, Z_C)) + n * -65.0 + s * -100.0
    return m


def to_seat(f: Matrix) -> Matrix:
    """A frame of the scene (metres) as the seat's frame has it (millimetres)."""
    f = f.copy()
    f.translation = f.translation / MM
    return seat_frame().inverted() @ f


def placed(mb: MeshBuilder, matrix: Matrix) -> MeshBuilder:
    """Take a builder filled in the seat's millimetres into the scene's metres."""
    m = Matrix.Scale(MM, 4) @ matrix
    mb.verts = [tuple(m @ Vector(v)) for v in mb.verts]
    return mb


def pivot(name: str, parent: bpy.types.Object, at: Vector, **props) -> bpy.types.Object:
    """A node with its origin on a hinge: what a `swing` turns about."""
    obj = group(name, parent, **props)
    obj.location = at
    return obj


def hang(obj: bpy.types.Object, on: bpy.types.Object) -> bpy.types.Object:
    """Make a mesh built in the scene's axes a child of a pivot without moving it."""
    obj.data.transform(Matrix.Translation(-on.location))
    obj.parent = on
    return obj


# ----------------------------------------------------------------------- materials


def materials() -> dict:
    m = material
    return {
        # the sphere in orbit: its ablator under a blanket of insulation faced with aluminium foil
        "foil": m("insulation-foil", (0.74, 0.74, 0.72), 1.0, 0.4),
        "shell": m("aluminium-shell", (0.58, 0.59, 0.58), 1.0, 0.5, double_sided=True),
        "padding": m("padding-yellow", (0.70, 0.52, 0.20), 0.0, 0.92),
        "frame": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "sheet": m("aluminium-sheet", (0.56, 0.57, 0.57), 0.9, 0.6, double_sided=True),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "strap": m("strap-olive", (0.20, 0.25, 0.13), 0.1, 0.6, double_sided=True),
        "band": m("strap-steel", (0.62, 0.61, 0.58), 1.0, 0.3, double_sided=True),
        "module": m("paint-module-grey", (0.36, 0.41, 0.37), 0.2, 0.55),
        "louvre": m("louvre-polished", (0.82, 0.82, 0.82), 1.0, 0.16, double_sided=True),
        "bottle": m("bottle-green", (0.10, 0.22, 0.13), 0.4, 0.4),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "antenna": m("antenna-steel", (0.70, 0.70, 0.69), 1.0, 0.3),
        "white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6),
        "cable": m("cable-orange", (0.62, 0.30, 0.10), 0.0, 0.8),
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),
        "void": m("window-void", (0.004, 0.004, 0.005), 0.0, 0.95),
        "lens": m("lens", (0.01, 0.01, 0.015), 0.0, 0.03),
        # what a cutaway shows
        "panel": m("panel-grey", (0.46, 0.47, 0.46), 0.3, 0.6),
        "panel_black": m("panel-black", (0.03, 0.03, 0.035), 0.1, 0.5),
        "gauge": m("gauge-face", (0.02, 0.02, 0.02), 0.0, 0.25, emission=(0.55, 1.0, 0.65), emission_strength=0.35),
        "globe": m("globe-blue", (0.16, 0.34, 0.50), 0.0, 0.3),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "seat": m("seat-grey", (0.38, 0.40, 0.41), 0.6, 0.5),
        "fabric": m("fabric-nylon", (0.80, 0.76, 0.66), 0.0, 0.9),
        "suit": m("suit-orange", (0.80, 0.27, 0.04), 0.0, 0.85),
        "helmet": m("helmet-white", (0.88, 0.88, 0.85), 0.0, 0.35),
        "visor": m("visor-dark", (0.02, 0.025, 0.03), 0.0, 0.08),
        "red": m("paint-red", (0.62, 0.03, 0.02), 0.0, 0.5),
        "leather": m("leather-black", (0.03, 0.03, 0.03), 0.0, 0.6),
        "tank": m("aluminium-tank", (0.60, 0.60, 0.59), 1.0, 0.4),
    }


# ------------------------------------------------------------------ descent module


def porthole(fit: MeshBuilder, glass: MeshBuilder, bolts: MeshBuilder, void: MeshBuilder, where: tuple[float, float], hood: float = 16.0) -> None:
    """A porthole: a bezel standing `hood` mm proud, the pane, and a sleeve through the wall."""
    f = OUTER.frame(*where)
    rg = PORT_R
    fit.lathe(pm([(rg + 48, -10), (rg + 48, hood), (rg, hood), (rg - 3, 6)]), 48, matrix=f)
    if interior():
        fit.lathe(pm([(rg - 3, 6), (rg - 3, -(WALL + 26)), (rg + 34, -(WALL + 26)), (rg + 34, -(WALL + 6))]), 48, matrix=f)
    else:  # nothing is built inside: a dark disc stands in for the cabin
        void.lathe(pm([(rg - 3, 4), (0, 4)]), 32, matrix=f)
    glass.lathe(pm([(rg - 2, 10), (0, 10)]), 48, matrix=f)
    for i in range(12):
        a = TAU * i / 12
        bolts.disc(f @ (Vector(((rg + 26) * math.cos(a), (rg + 26) * math.sin(a), hood)) * MM), OUTER.n(*where), 8 * MM, 5 * MM)


def ball_bore(skins: dict[str, float], where: tuple[float, float], radius: float, depth: float) -> None:
    """srlib.bore through skins that are balls about the descent module's centre (name: radius, mm),
    along the line through `where`. bore() draws each rim onto the hole's circle by moving it across
    the hole, which on a flat skin leaves it in the skin; on a ball it lifts it off, by centimetres
    for a hatch. So each rim is put back where the hole's circle meets its own ball."""
    f = OUTER.frame(*where)
    bpy.context.view_layer.update()
    bore(list(skins), f, radius * MM, depth)
    for name, rs in skins.items():
        obj = bpy.data.objects[name]
        to_hole = f.inverted() @ obj.matrix_world
        back = to_hole.inverted()
        z = (math.sqrt(rs**2 - radius**2) - R) * MM
        for v in obj.data.vertices:
            c = to_hole @ v.co
            if abs(math.hypot(c.x, c.y) - radius * MM) < 1e-5 and abs(c.z) < depth:
                v.co = back @ Vector((c.x, c.y, z))
        obj.data.update()


def build_hatch(M, node, prefix: str, where: tuple[float, float], window: float = 0.0) -> None:
    """One of the three round hatches: a piece of the sphere's shield and of the pressure hull
    behind it, a bolted rim, and the edge between. `node` is what it is a child of; `window` is
    how far the bezel of the porthole in its middle stands proud, if it has one."""
    ax = OUTER.axis(*where)
    r = HATCH_R - 9.0
    skin, shell, rim, bolts = (MeshBuilder() for _ in range(4))
    skin.lathe(pm(OUTER.cap(r)), 96, matrix=ax)
    skin.lathe(pm([(r, INNER.z(r)), (r, OUTER.z(r))]), 96, matrix=ax)  # the hatch's own edge
    shell.lathe(pm(INNER.cap(r)), 72, matrix=ax)
    # the rim it is bolted down by: a band standing proud round its edge
    lift = 12.0
    rim.lathe(pm([(r, OUTER.z(r) - 6), *OUTER.cap(r, r - 76, lift, 3), (r - 76, OUTER.z(r - 76) - 6)]), 96, matrix=ax)
    rot = ax.to_3x3()
    for i in range(30):  # thirty, by the count of those taken out and put back on the pad
        a = TAU * (i + 0.5) / 30
        rb = r - 38
        at = Vector((rb * math.cos(a), rb * math.sin(a), OUTER.z(rb, lift)))
        bolts.disc(ax @ (at * MM), rot @ at.normalized(), 11 * MM, 6 * MM)
    skin.build(f"{prefix}_Skin", M["foil"], node, sharp_angle=40)
    shell.build(f"{prefix}_Shell", M["shell"], node, sharp_angle=None)
    if window:
        glass, void = MeshBuilder(), MeshBuilder()
        porthole(rim, glass, bolts, void, where, window)
        bpy.context.view_layer.update()
        ball_bore({f"{prefix}_Skin": R, **({f"{prefix}_Shell": R_IN} if interior() else {})}, where, PORT_R + 6, 0.3)
        glass.build(f"{prefix}_Glass", M["glass"], node)
        if void.verts:
            void.build(f"{prefix}_WindowWell", M["void"], node)
    rim.build(f"{prefix}_Rim", M["frame"], node, sharp_angle=30)
    bolts.build(f"{prefix}_Bolts", M["bolt"], node)


def build_descent_module(M) -> None:
    g = group("DescentModule")
    skin = MeshBuilder()
    skin.lathe(pm([(R * math.cos(deg(-90 + 180 * i / 72)), Z_C + R * math.sin(deg(-90 + 180 * i / 72))) for i in range(73)]), 144)
    skin.build("DM_Insulation", M["foil"], g, sharp_angle=None)

    fit, rings, glass, void, bolts = (MeshBuilder() for _ in range(5))
    # each hatch's seat: a coaming round the opening and the jamb through the wall
    for where in (ENTRY, PARACHUTE, TECHNOLOGICAL):
        ax = OUTER.axis(*where)
        r = HATCH_R
        rings.lathe(pm([(r + 52, OUTER.z(r + 52) - 8), *OUTER.cap(r + 52, r + 2, 12, 3), (r + 2, OUTER.z(r + 2) - 8)]), 96, matrix=ax)
        # (the jamb stands just inside the opening cut for it, and its lip inside the cabin covers the lining's edge)
        rings.lathe(pm([(r - 3, OUTER.z(r) + 10), (r - 3, INNER.z(r) - 60), (r + 56, INNER.z(r) - 60)]), 96, matrix=ax)
        if not interior():  # nothing is built inside: a dark disc stands in for the cabin
            void.lathe(pm([(r, INNER.z(r) - 30), (0, INNER.z(r) - 30)]), 48, matrix=ax)
    # No. 3, the technological hatch, stays on; the Vzor looks out through the porthole in it, under a deep hood
    build_hatch(M, g, "DM_TechHatch", TECHNOLOGICAL, window=70.0)
    porthole(fit, glass, bolts, void, RIGHT_PORT)

    # the plate the cable mast plugs into: the instrument module's power and commands come through its sockets
    f = OUTER.frame(MAST_AZ, MAST_LAT)
    fit.lathe(pm([(200, -12), (200, 14), (0, 14)]), 48, matrix=f)
    sockets = MeshBuilder()
    for ring_r, count in ((0, 1), (62, 6), (124, 12), (170, 18)):
        for i in range(count):
            a = TAU * i / count
            sockets.lathe(pm([(16, 15.5), (0, 15.5)]), 10, matrix=f @ Matrix.Translation(V(ring_r * math.cos(a), ring_r * math.sin(a), 0)))

    # the top: the lock the four straps meet at, under the housing of the forward antennas
    top = Z_C + R
    fit.lathe(pm([(262, Z_C + OUTER.z(262) - 6), (262, Z_C + OUTER.z(262) + 16), (236, Z_C + OUTER.z(236) + 20)]), 64)
    fit.lathe(pm([(232, Z_C + OUTER.z(232) - 6), (225, top + 20), (150, top + CAP_H - 40), (128, top + CAP_H), (0, top + CAP_H)]), 48)
    fit.build("DM_Fittings", M["frame"], g, sharp_angle=35)
    rings.build("DM_HatchRings", M["frame"], g, sharp_angle=30)
    glass.build("DM_Glass", M["glass"], g)
    bolts.build("DM_Bolts", M["bolt"], g)
    sockets.build("DM_MastSockets", M["void"], g)
    if void.verts:
        void.build("DM_WindowWells", M["void"], g)

    # two whips and a short mast from the housing on the pole
    ant = MeshBuilder()
    for sx in (-1, 1):
        a0 = V(sx * 62, sx * 62, top + CAP_H - 10)
        ant.tube(a0, a0 + V(sx * 300, sx * 300, 1900), 6 * MM, 8)
    ant.tube(V(0, 0, top + CAP_H - 2), V(0, 0, top + CAP_H + 520), 9 * MM, 10)  # the rod on the axis, with its crossbar
    ant.tube(V(-70, 0, top + CAP_H + 170), V(70, 0, top + CAP_H + 170), 7 * MM, 8)
    ant.build("DM_Antennas", M["antenna"], g, sharp_angle=None)


def build_hatches(M) -> None:
    build_hatch(M, group("EntryHatch"), "EntryHatch", ENTRY, window=16.0)
    build_hatch(M, group("ParachuteHatch"), "ParachuteHatch", PARACHUTE)


def cut_openings() -> None:
    """The three hatch openings and the side porthole, through the shield and the pressure hull."""
    bpy.context.view_layer.update()
    # the lining's openings are wider than the hull's: two rims drawn onto one circle would lie together
    for where in (ENTRY, PARACHUTE, TECHNOLOGICAL):
        ball_bore({"DM_Insulation": R, "Cabin_PressureShell": R_IN}, where, HATCH_R, 0.45)
        if interior():
            ball_bore({"Cabin_Padding": R_IN - 14}, where, HATCH_R + 34, 0.45)
    ball_bore({"DM_Insulation": R, **({"Cabin_PressureShell": R_IN} if interior() else {})}, RIGHT_PORT, PORT_R + 6, 0.3)
    if interior():
        ball_bore({"Cabin_Padding": R_IN - 14}, RIGHT_PORT, PORT_R + 22, 0.3)


# ------------------------------------------------------------------------ the cabin


def build_cabin(M) -> None:
    g = group("Cabin")
    arc = [deg(-90 + 180 * i / 48) for i in range(49)]
    shell = MeshBuilder()
    shell.lathe(pm([(R_IN * math.cos(a), Z_C + R_IN * math.sin(a)) for a in arc]), 96)
    shell.build("Cabin_PressureShell", M["shell"], g, sharp_angle=None)
    if not interior():
        return
    pad = MeshBuilder()
    rp = R_IN - 14
    pad.lathe(pm([(rp * math.cos(a), Z_C + rp * math.sin(a)) for a in arc]), 96, flip=True)
    pad.build("Cabin_Padding", M["padding"], g, sharp_angle=None)

    S = seat_frame()
    P = lambda x, y, z: Vector((x, y, z))  # noqa: E731
    rails, panel, black, gauges, globe, gear, lens, chute = (MeshBuilder() for _ in range(8))
    # the two guides the seat is fired along, bolted to the cabin's frames
    for sx in (-1, 1):
        rails.box((34, 1500, 60), Matrix.Translation(P(sx * 318, 130, -262)))
        for y in (-420, 60, 520):
            rails.box((30, 60, 150), Matrix.Translation(P(sx * 318, y, -350)))
    # the instrument board, over his knees and facing his eyes
    board = Matrix.Translation(P(0, -230, 765)) @ Matrix.Rotation(deg(-126), 4, "X")
    panel.box((440, 320, 110), board)
    globe.lathe(arc_profile(0, 0, 62, -20, 90, 10), 28, matrix=board @ Matrix.Translation(P(-70, -30, 50)))  # the Globus
    panel.lathe([(82, 40), (82, 62), (62, 62)], 28, matrix=board @ Matrix.Translation(P(-70, -30, 0)))
    for x, y, rr in ((-150, 100, 36), (-60, 100, 36), (30, 100, 36), (120, 100, 36), (60, -70, 30)):
        gauges.disc(board @ P(x, y, 55), board.to_3x3() @ P(0, 0, 1), rr, 4, 20)
    black.box((110, 190, 8), board @ Matrix.Translation(P(150, -40, 58)))  # the board of signal lamps
    # the control panel at his left hand: black, with the switches and the logic lock's keys
    left = Matrix.Translation(P(345, 60, 150)) @ Matrix.Rotation(deg(-78), 4, "Y")
    black.box((300, 280, 60), left)
    for i in range(10):
        gear.disc(left @ P(-100 + 50 * (i % 5), -50 + 100 * (i // 5), 30), left.to_3x3() @ P(0, 0, 1), 9, 14, 8)
    # the hand controller by his right hand: a grip on a ball, in a square housing
    gear.box((110, 110, 80), Matrix.Translation(P(-345, 30, 150)))
    gear.lathe(arc_profile(0, 0, 42, 0, 90, 6), 16, matrix=Matrix.Translation(P(-345, 30, 190)))
    black.box((36, 120, 44), Matrix.Translation(P(-345, 30, 252)))
    # the Vzor: an optical sight on the porthole beyond his feet
    vz = to_seat(INNER.frame(*TECHNOLOGICAL))
    gear.lathe([(PORT_R + 60, -46), (PORT_R + 60, -150), (PORT_R + 20, -230), (PORT_R - 20, -230)], 40, matrix=vz)
    lens.lathe([(PORT_R - 20, -230), (0, -222)], 40, matrix=vz, flip=True)
    # television cameras: one beside the board watching his face, one at his side
    for at, turn in ((P(150, -520, 660), Matrix.Rotation(deg(-105), 4, "X")), (P(-400, 330, 330), Matrix.Rotation(deg(70), 4, "Y"))):
        cam = Matrix.Translation(at) @ turn
        gear.lathe([(0, 0), (38, 0), (38, 150), (30, 160)], 16, matrix=cam)
        lens.lathe([(30, 160), (0, 160)], 16, matrix=cam)
    # equipment under and beside the seat: telemetry under it; air regeneration, the radio and the food locker at his right
    for x, y, z, sx, sy, sz in (
        (0, 150, -560, 560, 700, 200),
        (0, -470, -420, 460, 300, 220),
        (-520, 250, -230, 240, 560, 320),
        (-500, -330, 40, 220, 280, 300),
        (500, -330, -160, 220, 300, 320),
    ):
        gear.box((sx, sy, sz), Matrix.Translation(P(x, y, z)))
    # the descent module's own parachute, in its container behind hatch No. 2
    pax = to_seat(OUTER.axis(*PARACHUTE))
    zin = INNER.z(HATCH_R)
    chute.lathe([(0, zin - 440), (370, zin - 440), (400, zin - 400), (400, zin - 50), (0, zin - 50)], 48, matrix=pax)

    for mb, name, mat in (
        (rails, "Cabin_SeatRails", "steel"),
        (panel, "Cabin_InstrumentBoard", "panel"),
        (black, "Cabin_Panels", "panel_black"),
        (gauges, "Cabin_Instruments", "gauge"),
        (globe, "Cabin_Globus", "globe"),
        (gear, "Cabin_Equipment", "equipment"),
        (lens, "Cabin_Lenses", "lens"),
        (chute, "Cabin_ParachuteContainer", "fabric"),
    ):
        obj = placed(mb, S).build(name, M[mat], g, sharp_angle=35)
        inside_cabin(obj)


def inside_cabin(obj: bpy.types.Object, margin: float = 16.0) -> None:
    """Nothing in the cabin may reach its wall: the clearance check cannot see a box through the
    hull, because the two surfaces cross instead of lying together."""
    c = V(0, 0, Z_C)
    far = max((v.co - c).length for v in obj.data.vertices) / MM
    assert far < R_IN - 14 - margin, f"{obj.name} reaches {far:.0f} mm from the centre: the cabin's lining is at {R_IN - 14:.0f}"


# ------------------------------------------------------------- the seat and its pilot


def build_seat(M, stature: float, lettering: str | None, font) -> None:
    g = group("EjectionSeat")
    if not interior():
        return
    S = seat_frame()
    P = lambda x, y, z: Vector((x, y, z))  # noqa: E731
    k = stature / 1570.0  # the figure's proportions are laid out for 1.57 m and scaled
    seat, steel, pack, bottles = (MeshBuilder() for _ in range(4))
    seat.box((500, 820, 44), Matrix.Translation(P(0, 330, -160)))  # back
    seat.box((300, 190, 70), Matrix.Translation(P(0, 720, -105)))  # headrest
    seat.box((500, 300, 40), Matrix.Translation(P(0, -70, -135)) @ Matrix.Rotation(deg(8), 4, "X"))  # pan
    seat.box((440, 430, 30), Matrix.Translation(P(0, -400, 150)) @ Matrix.Rotation(deg(20), 4, "X"))  # leg rest
    seat.box((440, 30, 200), Matrix.Translation(P(0, -625, 150)) @ Matrix.Rotation(deg(20), 4, "X"))  # foot board
    for sx in (-1, 1):
        seat.box((36, 1000, 150), Matrix.Translation(P(sx * 268, 260, -120)))  # side beams
        seat.box((30, 440, 120), Matrix.Translation(P(sx * 236, -390, 80)) @ Matrix.Rotation(deg(20), 4, "X"))
        steel.box((40, 70, 60), Matrix.Translation(P(sx * 290, 620, -215)))  # the shoes that ride the guides
        steel.box((40, 70, 60), Matrix.Translation(P(sx * 290, -80, -215)))
        # the two firing mechanisms under the seat
        steel.tube(P(sx * 110, -260, -235), P(sx * 110, 520, -235), 44, 20)
        steel.lathe([(44, 0), (52, 40), (30, 70)], 20, matrix=frame(P(sx * 110, -260, -235), (0, -1, 0)))
    pack.box((400, 520, 78), Matrix.Translation(P(0, 400, -95)))  # his parachute, between his back and the seat
    pack.box((380, 300, 100), Matrix.Translation(P(0, -60, -210)))  # the survival kit under the pan
    for sx in (-1, 1):
        bottles.tube(P(sx * 215, 30, -245), P(sx * 215, 330, -245), 36, 16)  # oxygen for the descent
    for mb, name, mat in (
        (seat, "Seat_Frame", "seat"),
        (steel, "Seat_Mechanism", "steel"),
        (pack, "Seat_Packs", "fabric"),
        (bottles, "Seat_Oxygen", "bottle"),
    ):
        placed(mb, S).build(name, M[mat], g, sharp_angle=35)
    build_pilot(M, g, S, k, lettering, font)
    # everything that rides out must clear the entry hatch's opening on its way
    s = S.to_3x3() @ Vector((0, 1, 0))
    c = V(0, 0, Z_C)
    for obj in g.children:
        inside_cabin(obj, 6.0)
        off = max(((v.co - c) - s * (v.co - c).dot(s)).length for v in obj.data.vertices) / MM
        assert off < HATCH_R - 12, f"{obj.name} is {off:.0f} mm off the rails' line: the hatch is {HATCH_R:.0f} mm in radius"


def build_pilot(M, g, S: Matrix, k: float, lettering: str | None, font) -> None:
    """The pilot in the SK-1 suit, seated. A plain figure: lofted limbs and a helmet, in the pose
    the seat holds him in, not the jointed figure a crew model is (srlib.FIGURE)."""
    P = lambda x, y, z: Vector((x, y, z)) * k  # noqa: E731
    suit, boots, gloves, helmet, visor, ring, red = (MeshBuilder() for _ in range(7))
    fwd, up = (0.0, 0.0, 1.0), (0.0, 1.0, 0.0)
    suit.loft(
        [P(0, -70, 5), P(0, 60, 0), P(0, 240, 5), P(0, 400, 12), P(0, 480, 15), P(0, 525, 20)],
        [(165 * k, 105 * k), (165 * k, 112 * k), (172 * k, 118 * k), (188 * k, 114 * k), (150 * k, 100 * k), (80 * k, 75 * k)],
        28,
        ref=fwd,
    )
    for sx in (-1, 1):
        hip, knee, ankle = P(sx * 95, 0, 10), P(sx * 135, -192, 333), P(sx * 150, -555, 210)
        suit.loft([hip, (hip + knee) / 2, knee], [(88 * k, 88 * k), (80 * k, 80 * k), (69 * k, 69 * k)], 18, ref=up)
        suit.loft([knee, (knee + ankle) / 2, ankle + P(0, -20, 0)], [(61 * k, 61 * k), (56 * k, 56 * k), (45 * k, 45 * k)], 18, ref=fwd)
        # boots: laced leather, toes up
        boots.loft(
            [ankle + P(0, 70, 26), ankle + P(0, 10, 4), ankle + P(0, -40, -14)], [(57 * k, 57 * k), (58 * k, 58 * k), (60 * k, 60 * k)], 14, ref=fwd
        )
        boots.loft(
            [ankle + P(0, -42, -52), ankle + P(0, -46, 40), ankle + P(0, -50, 140), ankle + P(0, -50, 210)],
            [(52 * k, 50 * k), (50 * k, 54 * k), (47 * k, 42 * k), (38 * k, 30 * k)],
            14,
            ref=(1.0, 0.0, 0.0),
        )
        shoulder, elbow, wrist = P(sx * 200, 440, 25), P(sx * 262, 190, 70), P(sx * 190, 10, 262)
        suit.loft([shoulder, (shoulder + elbow) / 2, elbow], [(62 * k, 62 * k), (57 * k, 57 * k), (53 * k, 53 * k)], 16, ref=fwd)
        suit.loft([elbow, (elbow + wrist) / 2, wrist], [(47 * k, 47 * k), (43 * k, 43 * k), (38 * k, 38 * k)], 16, ref=up)
        gloves.loft(
            [wrist + P(0, 20, -15), wrist + P(0, -40, 20), wrist + P(-sx * 10, -95, 40), wrist + P(-sx * 15, -130, 40)],
            [(46 * k, 46 * k), (48 * k, 32 * k), (44 * k, 24 * k), (34 * k, 18 * k)],
            12,
            ref=fwd,
        )
    # the helmet: a white shell with a visor, on a neck ring
    head = P(0, 655, 40)
    hr = 152.0 * k
    hm = Matrix.Translation(head)
    helmet.lathe(arc_profile(0, 0, hr, -90, 90, 20), 36, matrix=hm)
    ring.lathe([(96 * k, -8 * k), (112 * k, 0), (112 * k, 26 * k), (96 * k, 34 * k)], 32, matrix=frame(P(0, 525, 22), (0, 1, 0.1)))
    # the visor: a cap of the same ball, facing forward and a little down
    vm = hm @ frame((0, 0, 0), (0, -0.25, 1))
    r1 = hr + 3.0
    visor.lathe([(r1 * math.sin(deg(a)), r1 * math.cos(deg(a))) for a in (52, 42, 32, 22, 11, 0)], 28, matrix=vm)
    if lettering:
        verts, faces = text_mesh(lettering, 1.0, font, cuts=2)
        xs, ys = [v[0] for v in verts], [v[1] for v in verts]
        scale = 150.0 * k / (max(xs) - min(xs))
        cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        lm = hm @ frame((0, 0, 0), (0, 0.72, 0.69))  # on the brow, above the visor
        rl = hr + 1.6
        out = []
        for x, y, _ in verts:
            a, b = (x - cx) * scale / rl, (y - cy) * scale / rl
            out.append(tuple(lm @ Vector((rl * math.sin(a) * math.cos(b), rl * math.sin(b), rl * math.cos(a) * math.cos(b)))))
        red.add(out, faces)
    for mb, name, mat, smooth in (
        (suit, "Pilot_Suit", "suit", True),
        (boots, "Pilot_Boots", "leather", True),
        (gloves, "Pilot_Gloves", "leather", True),
        (helmet, "Pilot_Helmet", "helmet", True),
        (visor, "Pilot_Visor", "visor", True),
        (ring, "Pilot_NeckRing", "frame", True),
        (red, "Pilot_Lettering", "red", False),
    ):
        if mb.verts:
            placed(mb, S).build(name, M[mat], g, smooth=smooth, sharp_angle=None if smooth else 30)


# ------------------------------------------------ what joins the two modules together


def hairpin(mb: MeshBuilder, base: Vector, along: Vector, out: Vector, length: float, back: float, gap: float, r: float) -> None:
    """A ribbon antenna: a rod `length` mm long that turns back on itself and returns `back` mm, the
    two legs `gap` apart. Millimetres in; `along` and `out` are unit vectors."""
    h = gap / 2
    path = [base + along * z for z in (0.0, length * 0.3, length * 0.6, length - h * 2, length - h * 0.5)]
    path += [base + out * (h - h * math.cos(a)) + along * (length + h * math.sin(a)) for a in (deg(30), deg(60), deg(90), deg(120), deg(150))]
    path += [base + out * gap + along * z for z in (length - h * 0.5, length - h * 2, length - back * 0.5, length - back)]
    mb.loft([p * MM for p in path], [(r * MM, r * MM)] * len(path), 10, ref=tuple(out.cross(along)), resample=3)


def build_straps(M) -> None:
    """Four steel bands from the instrument module's support ring over the sphere to one lock at
    its top. Each is its own node, hinged where it is made fast to the ring: released, it springs
    back and stays with the instrument module. Each carries one of the command link's antennas."""
    g = group("RetainingStraps")
    lat0 = -math.asin((Z_C - Z_SEAT_RING) / R)
    lat1 = math.acos(262.0 / R) - deg(0.6)
    for i, az in enumerate(STRAP_AZ):
        rad = Vector((math.cos(az), math.sin(az), 0))
        hinge = pivot(f"Strap_{i + 1}", g, V(SEAT_RING_R * rad.x, SEAT_RING_R * rad.y, Z_SEAT_RING))
        band, steel, ant = MeshBuilder(), MeshBuilder(), MeshBuilder()
        side = (-math.sin(az), math.cos(az), 0)
        path = [OUTER.p(az, lat0 + (lat1 - lat0) * j / 40, 9.0) for j in range(41)]
        band.ribbon(path, side, 70 * MM)
        steel.box((84 * MM, 120 * MM, 30 * MM), OUTER.frame(az, lat0 + deg(4), 12))  # the tensioner at its foot
        steel.box((84 * MM, 70 * MM, 26 * MM), OUTER.frame(az, lat1 - deg(1.5), 10))  # its end, in the lock
        steel.box((96 * MM, 96 * MM, 40 * MM), OUTER.frame(az, HAIRPIN_LAT, 16))  # the antenna's foot
        base = OUTER.p(az, HAIRPIN_LAT, 20) / MM
        ant.tube(base * MM, (base + Vector((0, 0, 70))) * MM, 14 * MM, 12)
        hairpin(ant, base + Vector((0, 0, 40)), Vector((0, 0, 1)), rad, 900, 380, 100, 9)
        hang(band.build(f"Strap_{i + 1}_Band", M["strap"], None, sharp_angle=None), hinge)
        hang(steel.build(f"Strap_{i + 1}_Fittings", M["steel"], None, smooth=False), hinge)
        hang(ant.build(f"Strap_{i + 1}_Antenna", M["antenna"], None, sharp_angle=None), hinge)


def build_cable_mast(M) -> None:
    """The cable mast: a duct of cables from the instrument module up the side of the sphere to a
    plate of plugs. It is hinged on the instrument module and goes with it."""
    g = group("CableMast")
    az = MAST_AZ
    rad = Vector((math.cos(az), math.sin(az), 0))
    upv = Vector((0, 0, 1))
    foot = rad * 1085 + upv * 1700
    hinge = pivot("CableMast_Arm", g, foot * MM)
    duct, cables, head = MeshBuilder(), MeshBuilder(), MeshBuilder()
    lat0 = deg(-41)
    path = [foot + rad * 48, rad * 1080 + upv * 1880, rad * 990 + upv * 2080, rad * 945 + upv * 2200]
    path += [OUTER.p(az, lat0 + (MAST_LAT - deg(11.6) - lat0) * j / 9, 62) / MM for j in range(10)]
    duct.loft([p * MM for p in path], [(66 * MM, 24 * MM)] * len(path), 16, ref=tuple(rad), resample=3)
    for dx in (-88, 88):  # the cable bundles lashed along its edges
        off = Vector((-math.sin(az), math.cos(az), 0)) * dx
        cables.loft([(p + off) * MM for p in path[1:]], [(17 * MM, 17 * MM)] * (len(path) - 1), 8, ref=tuple(rad), resample=3)
    f = OUTER.frame(MAST_AZ, MAST_LAT)
    head.lathe(pm([(0, 22), (215, 22), (215, 70), (170, 104), (0, 110)]), 48, matrix=f)
    hang(duct.build("CableMast_Duct", M["sheet"], None, sharp_angle=40), hinge)
    hang(cables.build("CableMast_Cables", M["cable"], None, sharp_angle=None), hinge)
    hang(head.build("CableMast_Plug", M["sheet"], None, sharp_angle=40), hinge)


# -------------------------------------------------------------- instrument module

AFT_SLOPE = math.atan2(MODULE_R - TAIL_R, Z_BAND0 - Z_TAIL)  # the aft cone's surface from the long axis
FWD_SLOPE = math.atan2(MODULE_R - SHELF_R, Z_SHELF - Z_BAND1)


def cone_r(z: float) -> float:
    """The instrument module's radius at a station."""
    if z <= Z_BAND0:
        return TAIL_R + (MODULE_R - TAIL_R) * (z - Z_TAIL) / (Z_BAND0 - Z_TAIL)
    if z <= Z_BAND1:
        return MODULE_R
    return MODULE_R + (SHELF_R - MODULE_R) * (z - Z_BAND1) / (Z_SHELF - Z_BAND1)


def cone_n(az: float, z: float) -> Vector:
    if z <= Z_BAND0:
        return Vector((math.cos(AFT_SLOPE) * math.cos(az), math.cos(AFT_SLOPE) * math.sin(az), -math.sin(AFT_SLOPE)))
    return Vector((math.cos(FWD_SLOPE) * math.cos(az), math.cos(FWD_SLOPE) * math.sin(az), math.sin(FWD_SLOPE)))


def cone_p(az: float, z: float, off: float = 0.0) -> Vector:
    """A point on the module's skin, or `off` mm out from it: millimetres."""
    r = cone_r(z)
    return Vector((r * math.cos(az), r * math.sin(az), z)) + cone_n(az, z) * off


def cone_frame(az: float, z: float, off: float = 0.0) -> Matrix:
    """Origin on the module's skin, local +Z out of it, +Y up the slope."""
    return frame(cone_p(az, z, off) * MM, cone_n(az, z))


def build_instrument_module(M) -> None:
    g = group("InstrumentModule")
    fwd = [(MODULE_R, Z_BAND1), (SHELF_R, Z_SHELF), (DRUM_R, Z_SHELF), (DRUM_R, Z_DRUM)]
    # its forward end is a dish the sphere sits over
    dish_r = R + 150.0
    a_rim = math.asin((DRUM_R - 30) / dish_r)
    sag = lambda a: dish_r * (math.cos(a) - math.cos(a_rim))  # noqa: E731
    dish = [(DRUM_R - 30, Z_DRUM)] + [(dish_r * math.sin(a_rim * (1 - i / 10)), Z_DRUM - sag(a_rim * (1 - i / 10))) for i in range(1, 11)]
    lathe_obj("IM_ForwardCone", pm(fwd + dish), M["module"], g, segs=144, sharp_angle=30)
    lathe_obj("IM_AftCone", pm([(TAIL_R, Z_TAIL), (MODULE_R, Z_BAND0)]), M["module"], g, segs=144, sharp_angle=30)
    band, bolts = MeshBuilder(), MeshBuilder()
    band.lathe(pm([(MODULE_R, Z_BAND0), (MODULE_R + 20, Z_BAND0 + 6), (MODULE_R + 20, Z_BAND1 - 6), (MODULE_R, Z_BAND1)]), 144)
    for i in range(72):
        a = TAU * i / 72
        bolts.disc(
            V((MODULE_R + 20) * math.cos(a), (MODULE_R + 20) * math.sin(a), (Z_BAND0 + Z_BAND1) / 2), (math.cos(a), math.sin(a), 0), 9 * MM, 6 * MM
        )
    band.build("IM_Band", M["frame"], g, sharp_angle=30)

    # the ring the sphere sits in: a band of lightening holes from the drum up to the sphere
    ring = MeshBuilder()
    cells = 48
    za, zb, zc, zd = Z_DRUM, Z_DRUM + 20, Z_SEAT_RING - 20, Z_SEAT_RING
    rr = lambda z: DRUM_R + (SEAT_RING_R - DRUM_R) * (z - Z_DRUM) / (Z_SEAT_RING - Z_DRUM)  # noqa: E731
    ring.lathe(pm([(rr(za), za), (rr(zb), zb)]), 96)
    ring.lathe(pm([(rr(zc), zc), (rr(zd), zd)]), 96)
    for i in range(cells):
        a = TAU * i / cells
        ring.lathe(pm([(rr(zb), zb), (rr(zc), zc)]), 2, arc=(a - 0.3 * TAU / cells, a + 0.3 * TAU / cells))
    ring.build("IM_SupportRing", M["sheet"], g, sharp_angle=None)

    # the radiator of the thermal control system: polished shutters over the aft cone, in bays
    slats, frames = MeshBuilder(), MeshBuilder()
    bays, rows = 16, 14
    z0, z1 = Z_TAIL + 110, Z_BAND0 - 60
    for b in range(bays):
        a0, a1 = TAU * (b + 0.09) / bays, TAU * (b + 0.91) / bays
        for j in range(rows):
            zl, zh = z0 + (z1 - z0) * (j + 0.1) / rows, z0 + (z1 - z0) * (j + 0.9) / rows
            lift = (zh - zl) / math.cos(AFT_SLOPE) * math.tan(deg(24))  # each slat stands open
            slats.grid(
                lambda u, v, zl=zl, zh=zh, lift=lift: (cone_p(u, zl, 12.0) * (1 - v) + cone_p(u, zh, 12.0 + lift) * v) * MM,
                [a0 + (a1 - a0) * i / 4 for i in range(5)],
                (0.0, 1.0),
            )
        frames.box((30 * MM, (z1 - z0 + 40) / math.cos(AFT_SLOPE) * MM, 44 * MM), cone_frame(TAU * b / bays, (z0 + z1) / 2, 6.0))
    for z in (z0 - 16, z1 + 16):
        frames.lathe(pm([(cone_r(z) - 6, z - 16), (cone_r(z) + 34, z), (cone_r(z) + 6, z + 16)]), 96)
    slats.build("IM_Louvres", M["louvre"], g, smooth=False)
    frames.build("IM_LouvreFrames", M["frame"], g, sharp_angle=30)

    fit, white, dark, pipes = (MeshBuilder() for _ in range(4))
    zm = (Z_BAND1 + Z_SHELF) / 2
    for i in range(4):  # round covers on the forward cone
        white.lathe(pm([(132, -8), (132, 14), (118, 24), (0, 26)]), 40, matrix=cone_frame(deg(33.75 + 90 * i), zm - 40))
    for i in range(8):  # attitude jets: eight blocks of two nozzles on the frame, one nozzle of each set
        f = cone_frame(deg(45 * i + 11.25), Z_BAND1 + 70)
        fit.box((120 * MM, 90 * MM, 90 * MM), f @ Matrix.Translation(V(0, 0, 25)))
        for dx in (-32, 32):
            fit.lathe(pm([(15, 60), (22, 96)]), 12, matrix=f @ Matrix.Translation(V(dx, 0, 0)))
            dark.lathe(pm([(21, 95), (8, 66), (0, 66)]), 12, matrix=f @ Matrix.Translation(V(dx, 0, 0)))
    for i in range(12):  # valves and junction boxes of the pneumatic system
        size = ((90, 140, 60), (70, 70, 90), (150, 80, 50))[i % 3]
        fit.box(tuple(s * MM for s in size), cone_frame(deg(30 * i + 4), Z_BAND1 + 190 + 90 * (i % 4), size[2] / 2 - 12))
    z = Z_SHELF - 40  # the ring main round the top of the cone
    r = cone_r(z) + 26 / math.cos(FWD_SLOPE)
    pipes.lathe(pm([(r + 9 * math.cos(deg(a)), z + 9 * math.sin(deg(a))) for a in range(0, 361, 45)]), 96)
    # the Sun sensor of the automatic orientation system
    f = cone_frame(deg(157.5), zm + 60)
    fit.lathe(pm([(70, -10), (70, 90), (52, 112), (44, 100)]), 28, matrix=f)
    dark.lathe(pm([(44, 100), (0, 100)]), 28, matrix=f)

    # antennas: eleven on the module
    ant = MeshBuilder()
    # three whips in a fan from one bracket on the forward cone by the frame: one square to the axis, one raked forward, one aft
    az = deg(67.5)
    zf = Z_BAND1 + 200
    fit.box((110 * MM, 300 * MM, 110 * MM), cone_frame(az, zf, 40))
    rad = Vector((math.cos(az), math.sin(az), 0))
    for k, rake in ((-1, -35.0), (0, 0.0), (1, 40.0)):
        base = cone_p(az, zf + 100 * k, 90)
        d = rad * math.cos(deg(rake)) + Vector((0, 0, 1)) * math.sin(deg(rake))
        ant.tube(base * MM, (base + d * 1400) * MM, 6 * MM, 8)
    # three long whips trailing from beside the engine: a pair spread 18 degrees from the axis, and one at 45
    for az, spread in ((deg(22.5), 18.0), (deg(202.5), 18.0), (deg(112.5), 45.0)):
        rad = Vector((math.cos(az), math.sin(az), 0))
        base = cone_p(az, Z_TAIL + 60, -6)
        d = (Vector((0, 0, -1)) * math.cos(deg(spread)) + rad * math.sin(deg(spread))).normalized()
        ant.lathe(pm([(24, 0), (24, 40), (12, 64)]), 12, matrix=frame(base * MM, d))
        ant.tube((base + d * 50) * MM, (base + d * 2100) * MM, 6 * MM, 8)
    # four ribbon antennas rooted among the shutters, standing aft along the axis
    for i in range(4):
        az = deg(90 * i + 45)
        rad = Vector((math.cos(az), math.sin(az), 0))
        z = Z_TAIL + (620 - TAIL_R) / math.tan(AFT_SLOPE)
        fit.box((70 * MM, 70 * MM, 90 * MM), cone_frame(az, z, 20))
        hairpin(ant, cone_p(az, z, 50), Vector((0, 0, -1)), rad, 960, 400, 100, 8)
    fit.build("IM_Fittings", M["frame"], g, sharp_angle=35)
    white.build("IM_Covers", M["white"], g, sharp_angle=35)
    dark.build("IM_Apertures", M["nozzle"], g)
    pipes.build("IM_Pipes", M["steel"], g, sharp_angle=None)
    bolts.build("IM_Bolts", M["bolt"], g)
    ant.build("IM_Antennas", M["antenna"], g, sharp_angle=None)

    if interior():  # the sealed compartment's contents: frames of instruments and batteries
        gear = MeshBuilder()
        gear.lathe(pm([(0, 1150), (760, 1150), (760, 1180), (0, 1180)]), 48)  # the instrument frame's deck
        for i in range(8):
            gear.box((260 * MM, 320 * MM, 380 * MM), Matrix.Rotation(deg(45 * i), 4, "Z") @ Matrix.Translation(V(640, 0, 1385)))
        for i in range(6):
            gear.box((220 * MM, 260 * MM, 300 * MM), Matrix.Rotation(deg(60 * i + 30), 4, "Z") @ Matrix.Translation(V(540, 0, 1750)))
        gear.tube(V(0, 0, 1180), V(0, 0, 1860), 90 * MM, 24)
        gear.build("IM_Instruments", M["equipment"], g, sharp_angle=35)


def build_gas_bottles(M) -> None:
    """The ring of spherical bottles round the joint: compressed nitrogen for the attitude jets and
    oxygen for the cabin, outside both modules."""
    g = group("GasBottles")
    balls, bands, cradles = MeshBuilder(), MeshBuilder(), MeshBuilder()
    step = TAU / BOTTLE_SLOTS
    for i in range(BOTTLE_SLOTS):
        if i in BOTTLE_GAPS:
            continue
        az = step * i
        c = V(BOTTLE_RING_R * math.cos(az), BOTTLE_RING_R * math.sin(az), Z_BOTTLES)
        m = Matrix.Translation(c) @ Matrix.Rotation(az, 4, "Z")
        balls.lathe(pm(arc_profile(0, 0, BOTTLE_R, -90, 90, 14)), 28, matrix=m)
        strap = pm([(BOTTLE_R + 1.5, -16), (BOTTLE_R + 3.5, -14), (BOTTLE_R + 3.5, 14), (BOTTLE_R + 1.5, 16)])
        bands.lathe(strap, 28, matrix=m)
        over = pm([(BOTTLE_R + 4.5, -16), (BOTTLE_R + 6.5, -14), (BOTTLE_R + 6.5, 14), (BOTTLE_R + 4.5, 16)])  # the second lies over the first
        bands.lathe(over, 28, matrix=m @ Matrix.Rotation(math.pi / 2, 4, "Y"))
        cradles.lathe(pm([(70, -BOTTLE_R - 12), (70, -BOTTLE_R + 22), (96, -BOTTLE_R + 22)]), 16, matrix=m)
        cradles.tube(c + V(0, 0, BOTTLE_R - 4), c + V(0, 0, BOTTLE_R + 34), 12 * MM, 8)  # its valve
    r = BOTTLE_RING_R - BOTTLE_R - 4
    z = Z_BOTTLES + BOTTLE_R + 30
    cradles.lathe(pm([(r + 8 * math.cos(deg(a)), z + 8 * math.sin(deg(a))) for a in range(0, 361, 45)]), 96)  # the main that joins them
    balls.build("Bottles_Spheres", M["bottle"], g, sharp_angle=None)
    bands.build("Bottles_Bands", M["band"], g, sharp_angle=None)
    cradles.build("Bottles_Cradles", M["steel"], g, sharp_angle=35)


def build_retro_engine(M) -> None:
    """The TDU-1 braking engine: one chamber on the axis and four steering nozzles round it."""
    g = group("RetroEngine")
    lathe_obj(
        "Engine_Skirt",
        pm([(205, 110), (TAIL_R, Z_TAIL), (TAIL_R + 14, Z_TAIL + 30), (TAIL_R - 20, Z_TAIL + 30)]),
        M["frame"],
        g,
        segs=64,
        sharp_angle=30,
    )
    noz, body = MeshBuilder(), MeshBuilder()
    noz.lathe(pm([(140, 0), (128, 50), (100, 120), (62, 190), (36, 235), (34, 250)]), 48)
    body.lathe(pm([(34, 250), (60, 262), (86, 290), (86, 380), (60, 420), (0, 430)]), 40)
    body.lathe(pm([(0, 268), (186, 268), (194, 110), (205, 110)]), 48, flip=True)  # the plate that closes the skirt
    for i in range(4):
        a = deg(45 + 90 * i)
        m = Matrix.Translation(V(148 * math.cos(a), 148 * math.sin(a), 0))
        noz.lathe(pm([(28, 100), (23, 140), (12, 185), (10, 195)]), 20, matrix=m)
        body.lathe(pm([(10, 195), (20, 205), (20, 270)]), 16, matrix=m)
    noz.build("Engine_Nozzles", M["nozzle"], g, sharp_angle=None)
    body.build("Engine_Chamber", M["steel"], g, sharp_angle=35)
    if interior():
        tanks, pump = MeshBuilder(), MeshBuilder()
        # the installation is 0.95 m across: a torus of propellant round the chamber, and the bottle that pressurises it
        tanks.lathe(pm([(325 + 150 * math.cos(deg(a)), 700 + 150 * math.sin(deg(a))) for a in range(0, 361, 20)]), 64)
        tanks.lathe(pm(arc_profile(0, 960, 130, -90, 90, 14)), 40)
        pump.tube(V(-120, 0, 480), V(120, 0, 480), 70 * MM, 20)  # the turbopump across the chamber's head
        pump.tube(V(0, 0, 430), V(0, 0, 840), 40 * MM, 16)
        tanks.build("Engine_Tanks", M["tank"], g, sharp_angle=None)
        pump.build("Engine_Turbopump", M["steel"], g, sharp_angle=35)


# ---------------------------------------------------------------------------- main


def build(stature: float = 1570.0, lettering: str | None = None) -> str:
    """Build the spacecraft. `stature` is the pilot's height, mm; `lettering` what is painted on his helmet."""
    M = materials()
    font = load_font()
    build_descent_module(M)
    build_hatches(M)
    build_cabin(M)
    cut_openings()
    build_seat(M, stature, lettering, font)
    build_straps(M)
    build_cable_mast(M)
    build_instrument_module(M)
    build_gas_bottles(M)
    build_retro_engine(M)
    mark_shells(SHELLS)
    return f"{LENGTH * MM:.3f} m nozzle to the top of the sphere's housing, {2 * MODULE_R * MM:.3f} m across"
