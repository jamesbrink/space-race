"""The Vostok 3KA spacecraft: descent module, instrument module and what joins them.

Shared by every crewed Vostok; a flight's model/vehicle.py calls build() with what its own
spacecraft carried. See vostok-3ka.md for what each number rests on.

Every dimension is in millimetres, the unit of OKB-1's drawings and of every Soviet figure
quoted, and is converted once, at the point of use, with MM. Station 0 is the exit plane of the
braking engine's nozzle; +Z is toward the descent module, which rode forward under the fairing.
Azimuths are measured about +Z from +X.

Top-level nodes:
    DescentModule  EntryHatch  ParachuteHatch  Cabin  EjectionSeat
    RetainingStraps  CableMast  InstrumentModule  Antennas  GasBottles  RetroEngine
Nodes under them that a flight asks for by name:
    RetroEngine_Nozzle (in RetroEngine: the chamber's nozzle, its origin in the middle of its exit, its lowest point)
    ParachuteContainer (in Cabin: its origin in the middle of its mouth under hatch No. 2, +Z out along the hatch's line)
    Pilot (in EjectionSeat: the flight's seated figure)  Seat_Pilot (in EjectionSeat: an empty at his eyes)
EntryHatch and ParachuteHatch have their origins where their lines meet the sphere, +Z outward; EjectionSeat has the
seat frame's origin, +Z up the rails toward the entry hatch, -Y out of the pilot's chest (in the file: +Y up the rails,
+Z out of his chest): each is a body that leaves, along its own axis.
and, on a flight that carried one (build(film_camera=True)):
    FilmCamera
and, on a flight whose television is built as its cameras were (build(television=True)):
    TelevisionCameras
"""

from __future__ import annotations

import math
from collections.abc import Callable

import bpy
from mathutils import Matrix, Vector

from srlib import TAU, MeshBuilder, arc_profile, bore, deg, frame, group, interior, lathe_obj, mark_shells, material, prof

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

# The instrument module's antennas: a fan of three whips by the frame, three long whips from beside the engine
# (azimuth, spread from the axis), four ribbons standing aft.
FAN_AZ = deg(67.5)
FAN_RAKES = (-35.0, 0.0, 40.0)  # degrees forward of square to the axis
FAN_LENGTH = 1400.0
WHIPS = ((deg(22.5), 18.0), (deg(202.5), 18.0), (deg(112.5), 45.0))
WHIP_LENGTH = 2100.0


def _stowed() -> tuple:
    """How far each antenna is drawn back into the hull when stowed, mm: a vector for each of `Antenna_1` to `_10`.
    The fan and the long whips go back along their own lines, the ribbons straight forward. The distances are what
    keeps each inside the hull or the adapter under it; they are not a record of how the antennas were folded."""
    out = []
    for rake in FAN_RAKES:
        out.append(
            (-1330.0 * math.cos(deg(rake)) * math.cos(FAN_AZ), -1330.0 * math.cos(deg(rake)) * math.sin(FAN_AZ), -1330.0 * math.sin(deg(rake)))
        )
    for (az, spread), back in zip(WHIPS, (1720.0, 1720.0, 1900.0)):
        out.append((-back * math.sin(deg(spread)) * math.cos(az), -back * math.sin(deg(spread)) * math.sin(az), back * math.cos(deg(spread))))
    out += [(0.0, 0.0, 700.0)] * 4
    return tuple(out)


STOWED = _stowed()

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
    """The seat's own frame, millimetres: +Y up the rails toward the pilot's head and the entry
    hatch, +Z out of his chest, +X to his left. Its origin is PILOT_FORWARD behind the middle of
    his hip joints, level with them."""
    h = Vector((math.cos(HATCH_AZ), math.sin(HATCH_AZ), 0.0))
    up = Vector((0.0, 0.0, 1.0))
    s = h * math.cos(SEAT_TILT) + up * math.sin(SEAT_TILT)
    n = -h * math.sin(SEAT_TILT) + up * math.cos(SEAT_TILT)
    m = Matrix((s.cross(n), s, n)).transposed().to_4x4()
    # the rails' line through the middle of the hatch passes 65 mm in front of the frame's origin: 22 mm behind his hip joints
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


def rehome(obj: bpy.types.Object, node: bpy.types.Object, at: Matrix) -> None:
    """Give `node` the frame `at` (the scene's, metres) and make `obj`, built in the scene's axes, its child without
    moving it: the mesh's own points are taken into the node's frame, so the mesh has no transform of its own."""
    node.matrix_local = at if node.parent is None else node.parent.matrix_local.inverted() @ at
    obj.data.transform(at.inverted())
    obj.parent = node


def reframe(node: bpy.types.Object, at: Matrix, held: dict[str, Matrix] | None = None) -> None:
    """Give a top-level node, built with everything under it in the scene's axes, the frame `at` (the scene's, metres)
    without moving anything: each mesh's points are taken into it, a group under it keeps no transform and its own
    children are taken likewise, and a node with a place of its own (`held`: name, its frame in the scene) is put
    there. A part that leaves the vehicle then has its origin on itself and its own axes to leave along."""
    back = at.inverted()

    def take(obj: bpy.types.Object) -> None:
        for child in obj.children:
            if held and child.name in held:
                child.matrix_parent_inverse = Matrix.Identity(4)
                child.matrix_local = back @ held[child.name]
            elif child.type == "MESH":
                child.data.transform(back)
            else:
                take(child)

    take(node)
    node.matrix_local = at


# ----------------------------------------------------------------------- materials


# The lining of the cabin's wall. Vostok 1's flown cabin is lined in a yellow foam (the type's, and what every flight
# has unless it says otherwise); the flown cabins of Vostok 5 and Vostok 6, as they are kept and photographed, are
# lined in a white cloth. Both colours are judged from photographs of articles sixty years old.
LININGS = {
    "yellow": ("padding-yellow", (0.70, 0.52, 0.20)),
    "white": ("padding-white", (0.80, 0.80, 0.76)),
}


def materials(lining: str = "yellow") -> dict:
    m = material
    return {
        # the sphere in orbit: its ablator under a blanket of insulation faced with aluminium foil
        "foil": m("insulation-foil", (0.74, 0.74, 0.72), 1.0, 0.4),
        "shell": m("aluminium-shell", (0.58, 0.59, 0.58), 1.0, 0.5, double_sided=True),
        "padding": m(*LININGS[lining], 0.0, 0.92),
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
    # the rim it is bolted down by: a band standing proud round its edge. Its outer wall stands 1.5 mm outside the hatch's
    # own edge, not in it: in it, the two were one surface, which flickered (seen once the stack stood turned on its pad)
    lift = 12.0
    rim.lathe(
        pm([(r + 1.5, OUTER.z(r) - 6), (r + 1.5, OUTER.z(r + 1.5, lift)), *OUTER.cap(r, r - 76, lift, 3), (r - 76, OUTER.z(r - 76) - 6)]),
        96,
        matrix=ax,
    )
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


def build_cabin(M, tv_standins: bool = True) -> None:
    """`tv_standins` are the two plain barrels that stand for the television cameras on a flight that does not build
    them (build_television does, as its own node)."""
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
        if not tv_standins:
            break
        cam = Matrix.Translation(at) @ turn
        gear.lathe([(0, 0), (38, 0), (38, 150), (30, 160)], 16, matrix=cam)
        lens.lathe([(30, 160), (0, 160)], 16, matrix=cam)
    # equipment under and beside the seat: telemetry under it; air regeneration, the radio and the food locker at his right
    lockers = MeshBuilder()
    for x, y, z, sx, sy, sz in (
        (0, 150, -560, 560, 700, 200),
        (0, -470, -420, 460, 300, 220),
        (-520, 250, -230, 240, 560, 320),
        (-500, -330, 40, 220, 280, 300),
        (500, -330, -160, 220, 300, 320),
    ):
        lockers.box((sx, sy, sz), Matrix.Translation(P(x, y, z)))
        for dy in (-0.28, 0.28):  # each case's lid straps
            gear.box((sx + 8, 26, sz + 8), Matrix.Translation(P(x, y + sy * dy, z)))
    # two canisters of the air regeneration unit, at his right beside the cases
    for y in (-60, 110):
        gear.tube(P(-560, y - 60, 120), P(-560, y + 60, 120), 62, 20)
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
        (lockers, "Cabin_Cases", "panel"),
        (lens, "Cabin_Lenses", "lens"),
        (chute, "Cabin_ParachuteContainer", "fabric"),
    ):
        obj = placed(mb, S).build(name, M[mat], g, sharp_angle=35)
        inside_cabin(obj)
    # The container is a node of its own (`ParachuteContainer`): its origin in the middle of its mouth, under hatch No. 2,
    # its own +Z (the file's +Y) out along the hatch's line, so the top of its bounds is its mouth: where the descent
    # module's parachute is made fast (`Flight.flies.chutes[].at`).
    mouth = OUTER.axis(*PARACHUTE) @ Matrix.Translation(V(0, 0, zin - 50))
    rehome(bpy.data.objects["Cabin_ParachuteContainer"], group("ParachuteContainer", g), mouth)


def inside_cabin(obj: bpy.types.Object, margin: float = 16.0) -> None:
    """Nothing in the cabin may reach its wall: the clearance check cannot see a box through the
    hull, because the two surfaces cross instead of lying together."""
    c = V(0, 0, Z_C)
    far = max((v.co - c).length for v in obj.data.vertices) / MM
    assert far < R_IN - 14 - margin, f"{obj.name} reaches {far:.0f} mm from the centre: the cabin's lining is at {R_IN - 14:.0f}"


# ------------------------------------------------------------- the seat and its pilot


# How far in front of the seat frame's origin the pilot's hip joints are. The seat's back and the
# parachute pack on it were laid out round a stand-in whose back lay 56 mm behind its hips; a man's
# is 140 mm behind his (crew/sk_1.py, the shared figure), so he lies that much further forward, his
# back on the pack. Neither the pack's place nor his in the seat has been read anywhere. Moving
# the seat back instead takes its guide shoes outside the hatch's opening, which is the one
# thing here with a published size.
PILOT_FORWARD = 87.0


def build_seat(M, pilot: Callable[[bpy.types.Object, Matrix], object] | None) -> dict[str, Matrix]:
    """The seat, and the flight's pilot in it. Returns the nodes under it that have a place of their own (name, frame in
    the scene): `Seat_Pilot`, at his eyes, where a pilot's builder says where they are."""
    g = group("EjectionSeat")
    if not interior():
        return {}
    S = seat_frame()
    P = lambda x, y, z: Vector((x, y, z))  # noqa: E731
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
    held = {}
    if pilot:
        # The pilot is the flight's own (its suit, its man): he is handed a node of his own in the seat (`Pilot`, so that
        # he can be told from the seat he leaves at four kilometres) and where his hips are, in the figure library's seat
        # frame (metres; head toward -Y, chest toward +Z, his right toward +X).
        place = Matrix.Scale(MM, 4) @ S @ Matrix.Translation((0, 0, PILOT_FORWARD)) @ Matrix.Scale(1 / MM, 4) @ Matrix.Diagonal((-1, -1, 1, 1))
        keys = pilot(group("Pilot", g), place)
        if isinstance(keys, dict) and "eyes" in keys:
            held["Seat_Pilot"] = seat_view(g, place @ (Vector(keys["eyes"]) * 0.01))
    # everything that rides out must clear the entry hatch's opening on its way
    s = S.to_3x3() @ Vector((0, 1, 0))
    c = V(0, 0, Z_C)
    for obj in (o for o in g.children_recursive if o.type == "MESH"):
        inside_cabin(obj, 6.0)
        off = max(((v.co - c) - s * (v.co - c).dot(s)).length for v in obj.data.vertices) / MM
        assert off < HATCH_R - 12, f"{obj.name} is {off:.0f} mm off the rails' line: the hatch is {HATCH_R:.0f} mm in radius"
    return held


# What the seated pilot looks at with his head at rest: the middle of the instrument board, in the seat's frame (mm).
BOARD_AT = (0.0, -230.0, 765.0)


def seat_view(seat: bpy.types.Object, eyes: Vector) -> Matrix:
    """`Seat_Pilot`: an empty at the seated figure's eyes (the scene's metres), a child of the seat he rides out on. In
    the file its +Z looks at the middle of the instrument board and its +Y is as near the top of his head as that
    allows, which is what a seat's node promises (types.ts: `ModelDef.seats`). Returns its frame in the scene."""
    S = Matrix.Scale(MM, 4) @ seat_frame()
    look = (S @ Vector(BOARD_AT) - eyes).normalized()
    head = S.to_3x3() @ Vector((0, 1, 0))
    over = (head - look * look.dot(head)).normalized()
    m = Matrix(((-look).cross(over), -look, over)).transposed().to_4x4()
    m.translation = eyes
    group("Seat_Pilot", seat)
    e = to_seat(m).translation
    far = (S @ Vector(BOARD_AT) - eyes).length / MM
    down = math.degrees(look.angle(S.to_3x3() @ Vector((0, 0, 1))))
    print(
        f"seat: the pilot's eyes at ({e.x:.0f}, {e.y:.0f}, {e.z:.0f}) mm in the seat's frame, "
        f"{far:.0f} mm from the middle of the board, looking {down:.1f} degrees toward his feet"
    )
    return m


def seat_node() -> Matrix:
    """The frame the seat's node has (the scene's, metres): its origin the seat frame's, its +Z (the file's +Y) up the
    rails toward the pilot's head and the entry hatch, its -Y (the file's +Z) out of his chest, its +X to his left."""
    S = seat_frame()
    r = S.to_3x3()
    left, rails, chest = r @ Vector((1, 0, 0)), r @ Vector((0, 1, 0)), r @ Vector((0, 0, 1))
    m = Matrix((left, -chest, rails)).transposed().to_4x4()
    m.translation = S.translation * MM
    return m


def hatch_node(where: tuple[float, float]) -> Matrix:
    """The frame a hatch's node has (the scene's, metres): its origin where the hatch's line meets the sphere's outer
    surface, its +Z (the file's +Y) outward along that line: the way it is thrown off."""
    return OUTER.frame(*where)


# ------------------------------------------------------------ what a flight carried

# A Konvas-Avtomat, the hand-held 35 mm reflex camera of Soviet newsreel men: three lenses on a turret, a round
# magazine behind, a viewfinder along its left side, its motor below as the grip. Vostok 2 carried one, "modified
# for space flight" (how is not known to us). The type's overall size is published; its form is read off photographs
# of the camera kept as Titov's and of him holding one. Where it rode in the cabin is in nothing read: it is put at
# the pilot's right hand, its lenses toward the right porthole.
KONVAS_LENGTH = 290.0  # over the longest lens's hood and the eyecup
KONVAS_HEIGHT = 260.0  # over the magazine and the motor
KONVAS_AT = (-560.0, -150.0, 400.0)  # the middle of its body, in the seat's frame
KONVAS_LENSES = ((90.0, 22.0, 52.0), (210.0, 25.0, 68.0), (330.0, 29.0, 85.0))  # round the turret: degrees, barrel radius, length


def build_film_camera(M) -> None:
    g = group("FilmCamera")
    if not interior():
        return
    S = seat_frame()
    P = lambda x, y, z: Vector((x, y, z))  # noqa: E731
    # its own frame, in the seat's: +Y along the lenses, at the right porthole; +Z its top, as near the pilot's head as that leaves it
    at = P(*KONVAS_AT)
    y = (to_seat(INNER.frame(*RIGHT_PORT)).translation - at).normalized()
    z = (P(0, 1, 0) - y * y.y).normalized()
    C = Matrix((y.cross(z), y, z)).transposed().to_4x4()
    C.translation = at
    body, barrels, glass = MeshBuilder(), MeshBuilder(), MeshBuilder()
    body.box((104, 140, 150), Matrix.Identity(4))
    front = 70.0 + 14.0  # the turret's face
    turret = P(0, 70, 4)
    body.lathe([(66, 0), (66, 14), (0, 14)], 40, matrix=frame(turret, (0, 1, 0)))
    for a, r, length in KONVAS_LENSES:
        m = frame(P(36 * math.cos(deg(a)), front, turret.z + 36 * math.sin(deg(a))), (0, 1, 0))
        barrels.lathe([(r, 0), (r, length - 14), (r + 6, length - 10), (r + 6, length), (r - 2, length), (r - 2, length - 18)], 28, matrix=m)
        glass.lathe([(r - 2, length - 18), (0, length - 18)], 28, matrix=m)
    # the magazine: a drum on edge behind the body's top, with the boss of its take-up side
    top = KONVAS_HEIGHT / 2
    body.lathe([(0, 0), (80, 0), (80, 62), (50, 62), (50, 78), (0, 78)], 48, matrix=frame(P(-31, -30, top - 80), (1, 0, 0)))
    # the viewfinder: a tube along the left side to an eyecup behind
    back = front + KONVAS_LENSES[-1][2] - KONVAS_LENGTH
    body.tube(P(-70, 30, 52), P(-70, back + 25, 52), 16, 20)
    body.box((12, 50, 20), Matrix.Translation(P(-56, -10, 52)))
    cup = frame(P(-70, back + 25, 52), (0, -1, 0))
    body.lathe([(16, 0), (26, 18), (26, 25), (14, 25)], 20, matrix=cup)
    glass.lathe([(14, 25), (0, 22)], 20, matrix=cup)
    body.tube(P(0, 12, -70), P(0, 12, -top), 30, 24)  # the motor, which is the grip
    for mb, name, mat in ((body, "FilmCamera_Body", "panel_black"), (barrels, "FilmCamera_Lenses", "frame"), (glass, "FilmCamera_Glass", "lens")):
        inside_cabin(placed(mb, S @ C).build(name, M[mat], g, sharp_angle=35))


# The television cameras of the Seliger system (NII-380, Leningrad): two in the cabin, each a one-inch vidicon in a
# ribbed case, 3 kg and 12 W. From Vostok 3 they sent 400 lines of 400 elements ten times a second, and the picture
# went out on broadcast television. The case's form is read off the one published photograph of the camera (Efimov);
# no dimension of it has been found, so every size below is estimated from that photograph, scaled by the one-inch
# tube and its plug. One camera looks at the pilot's face from in front (the received frames show him so, from some
# thirty degrees toward his feet); where the other was is not in anything read, and it is put at his right, level
# with his head, for the view in profile that the system was first set up to give of the dogs.
SELIGER_CASE = (104.0, 226.0, 118.0)  # across, along the lens, tall
SELIGER_LENS_R = 26.0
SELIGER_FACE = (0.0, 690.0, 150.0)  # what both look at, in the seat's frame: the front of his helmet
SELIGER_AT = ((160.0, 280.0, 760.0), (-640.0, 590.0, 340.0))  # the middle of each case, in the seat's frame


def rounded_box(mb: MeshBuilder, size: tuple[float, float, float], r: float, matrix: Matrix, n: int = 4) -> None:
    """A box `size` across, along and tall whose four long edges (those along its own Y) are rounded to `r`."""
    w, length, h = size
    ring = []
    x0, z0 = w / 2 - r, h / 2 - r
    for cx, cz, a0 in ((x0, z0, 0.0), (-x0, z0, 90.0), (-x0, -z0, 180.0), (x0, -z0, 270.0)):
        for i in range(n + 1):
            a = deg(a0 + 90.0 * i / n)
            ring.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    m = len(ring)
    verts = [(x, -length / 2, z) for x, z in ring] + [(x, length / 2, z) for x, z in ring]
    faces = [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)]
    faces += [tuple(range(m)), tuple(reversed(range(m, 2 * m)))]
    out = []
    for f in faces:  # turned so that each looks outward: the shape is convex about its middle
        a, b, c = (Vector(verts[i]) for i in f[:3])
        mid = sum((Vector(verts[i]) for i in f), Vector()) / len(f)
        out.append(f if (b - a).cross(c - a).dot(mid) > 0 else tuple(reversed(f)))
    mb.add(verts, out, None, matrix)


def beads(mb: MeshBuilder, face: Matrix, a: float, b: float, w: float = 6.0, proud: float = 2.5, gap: float = 1.5) -> None:
    """The stiffening pressed into a panel: a rim `a` by `b` and a cross inside it, standing `proud`. `face` has its
    origin on the panel, +Z out of it, +X along `a`. No two beads overlap: where they would cross, one stops short."""
    bar = lambda length, x, y, turn=0.0: mb.box((length, w, 2 * proud), face @ Matrix.Translation((x, y, 0)) @ Matrix.Rotation(turn, 4, "Z"))  # noqa: E731
    for sy in (-1, 1):
        bar(a, 0, sy * (b - w) / 2)
    for sx in (-1, 1):
        bar(b - 2 * w, sx * (a - w) / 2, 0, math.pi / 2)
    ai, bi = a - 2 * w, b - 2 * w
    al = math.atan2(bi, ai)
    half = min((ai / 2 - gap - w / 2 * math.sin(al)) / math.cos(al), (bi / 2 - gap - w / 2 * math.cos(al)) / math.sin(al))
    bar(2 * half, 0, 0, al)
    d = (w / 2 + gap + w / 2 * abs(math.cos(2 * al))) / math.sin(2 * al)
    for s in (-1, 1):
        mid = s * (half + d) / 2
        bar(half - d, mid * math.cos(al), -mid * math.sin(al), -al)


def build_television(M) -> None:
    g = group("TelevisionCameras")
    if not interior():
        return
    S = seat_frame()
    P = lambda x, y, z: Vector((x, y, z))  # noqa: E731
    enamel = material("enamel-grey-blue", (0.30, 0.37, 0.41), 0.3, 0.5)
    braid = material("braid-violet", (0.16, 0.13, 0.30), 0.0, 0.85)
    cases, fronts, glass, plugs, cables = (MeshBuilder() for _ in range(5))
    w, length, h = SELIGER_CASE
    r = 10.0
    for at in SELIGER_AT:
        # its own frame, in the seat's: +Y along the lens, at the pilot's face; +Z its top, as near the way his head lies as that leaves it
        at = P(*at)
        y = (P(*SELIGER_FACE) - at).normalized()
        z = (P(0, 1, 0) - y * y.y).normalized()
        C = Matrix((y.cross(z), y, z)).transposed().to_4x4()
        C.translation = at
        rounded_box(cases, SELIGER_CASE, r, C)
        lengthwise = Matrix.Rotation(math.pi / 2, 4, "Z")  # a panel's own +X laid along the case
        for sx in (-1, 1):  # the two sides, then the top and the bottom
            side = Matrix.Translation((sx * w / 2, 0, 0)) @ Matrix.Rotation(sx * math.pi / 2, 4, "Y")
            beads(cases, C @ side @ lengthwise, length - 30, h - 2 * r - 8)
        for sz in (-1, 1):
            lid = Matrix.Translation((0, 0, sz * h / 2)) @ Matrix.Rotation(math.pi * (sz < 0), 4, "Y")
            beads(cases, C @ lid @ lengthwise, length - 30, w - 2 * r - 8)
        # the front: a black plate, the bracket it hangs by across its top, and the lens below the middle
        front = length / 2
        fronts.box((w - 6, 6, h - 6), C @ Matrix.Translation(P(0, front + 3, 0)))
        fronts.box((w + 40, 4, 34), C @ Matrix.Translation(P(0, front + 8, h / 2 - 24)))
        for sx in (-1, 1):
            for dz in (-9, 9):
                fronts.disc(C @ P(sx * (w / 2 + 11), front + 10, h / 2 - 24 + dz), C.to_3x3() @ P(0, 1, 0), 4.5, 3.5, 8)
            fronts.disc(C @ P(sx * (w / 2 - 13), front + 6, -(h / 2 - 13)), C.to_3x3() @ P(0, 1, 0), 4.0, 2.5, 8)  # the plate's own screws
        rl = SELIGER_LENS_R
        lens = C @ frame(P(0, front + 6, -14), (0, 1, 0))
        barrel = [(rl, 0), (rl, 10), (rl + 3.5, 12), (rl + 3.5, 24), (rl, 26), (rl, 40), (rl + 4, 44), (rl + 4, 52), (rl - 2, 52), (rl - 2, 36)]
        fronts.lathe(barrel, 32, matrix=lens)
        glass.lathe([(rl - 2, 36), (0, 36)], 32, matrix=lens)
        fronts.tube(C @ P(rl + 2, front + 24, -14), C @ P(rl + 17, front + 24, -14), 3.5, 8)  # the lever on its focusing ring
        # the back: the socket, and the cable in its braid to the plug that joined it to the ship's harness
        back = -length / 2
        plugs.tube(C @ P(22, back + 4, 12), C @ P(22, back - 16, 12), 17, 20)
        for sx in (-1, 1):  # the screws that hold its back cover
            for sz in (-1, 1):
                plugs.disc(C @ P(sx * (w / 2 - 14), back, sz * (h / 2 - 14)), C.to_3x3() @ P(0, -1, 0), 4.0, 2.5, 8)
        path = [P(22, back - 16, 12), P(22, back - 42, 12), P(33, back - 68, 1), P(58, back - 82, -27), P(86, back - 86, -60)]
        cables.loft([C @ p for p in path], [(7.0, 7.0)] * len(path), 10, ref=tuple(C.to_3x3() @ P(1, 0, 0)), resample=3)
        end, along = C @ path[-1], (C.to_3x3() @ (path[-1] - path[-2])).normalized()
        shell = [(0, -2), (10, -2), (13, 5), (19, 9), (19, 32), (21.5, 34), (21.5, 47), (16, 47), (16, 41), (0, 41)]
        plugs.lathe(shell, 20, matrix=frame(end, along))
    for mb, name, mat in (
        (cases, "Tv_Cases", enamel),
        (fronts, "Tv_Fronts", M["panel_black"]),
        (glass, "Tv_Glass", M["lens"]),
        (plugs, "Tv_Plugs", M["frame"]),
        (cables, "Tv_Cables", braid),
    ):
        inside_cabin(placed(mb, S).build(name, mat, g, sharp_angle=35))


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


def build_instrument_module(M, stowed: bool = False) -> None:
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
    # Ten antennas, each its own node with its origin at its root (`Antenna_1` to `Antenna_10`), so that a flight
    # can show them stowed. Under the fairing they were folded; that is not modelled: stowed, each is drawn withdrawn
    # into the hull along `STOWED`'s vector, and a flight's data slides it out again.
    aerials = group("Antennas")

    def antenna(k: int, base: Vector, mb: MeshBuilder) -> None:
        node = pivot(f"Antenna_{k}", aerials, base * MM)
        obj = hang(mb.build(f"Antenna_{k}_Rod", M["antenna"], None, sharp_angle=None), node)
        if stowed:
            obj.data.transform(Matrix.Translation(Vector(STOWED[k - 1]) * MM))

    # three whips in a fan from one bracket on the forward cone by the frame: one square to the axis, one raked forward, one aft
    az = FAN_AZ
    zf = Z_BAND1 + 200
    fit.box((110 * MM, 300 * MM, 110 * MM), cone_frame(az, zf, 40))
    rad = Vector((math.cos(az), math.sin(az), 0))
    for k, rake in enumerate(FAN_RAKES):
        ant = MeshBuilder()
        base = cone_p(az, zf + 100 * (k - 1), 90)
        d = rad * math.cos(deg(rake)) + Vector((0, 0, 1)) * math.sin(deg(rake))
        ant.tube(base * MM, (base + d * FAN_LENGTH) * MM, 6 * MM, 8)
        antenna(1 + k, base, ant)
    # three long whips trailing from beside the engine: a pair spread 18 degrees from the axis, and one at 45
    for k, (az, spread) in enumerate(WHIPS):
        ant = MeshBuilder()
        rad = Vector((math.cos(az), math.sin(az), 0))
        base = cone_p(az, Z_TAIL + 60, -6)
        d = (Vector((0, 0, -1)) * math.cos(deg(spread)) + rad * math.sin(deg(spread))).normalized()
        fit.lathe(pm([(24, 0), (24, 40), (12, 64)]), 12, matrix=frame(base * MM, d))
        ant.tube((base + d * 50) * MM, (base + d * WHIP_LENGTH) * MM, 6 * MM, 8)
        antenna(4 + k, base, ant)
    # four ribbon antennas rooted among the shutters, standing aft along the axis
    for i in range(4):
        ant = MeshBuilder()
        az = deg(90 * i + 45)
        rad = Vector((math.cos(az), math.sin(az), 0))
        z = Z_TAIL + (620 - TAIL_R) / math.tan(AFT_SLOPE)
        fit.box((70 * MM, 70 * MM, 90 * MM), cone_frame(az, z, 20))
        hairpin(ant, cone_p(az, z, 50), Vector((0, 0, -1)), rad, 960, 400, 100, 8)
        antenna(7 + i, cone_p(az, z, 50), ant)
    fit.build("IM_Fittings", M["frame"], g, sharp_angle=35)
    white.build("IM_Covers", M["white"], g, sharp_angle=35)
    dark.build("IM_Apertures", M["nozzle"], g)
    pipes.build("IM_Pipes", M["steel"], g, sharp_angle=None)
    bolts.build("IM_Bolts", M["bolt"], g)

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
    # The chamber's nozzle is a node of its own (`RetroEngine_Nozzle`), its origin on the axis in the plane of the exit,
    # which is its lowest point and station 0: a flight hangs the braking burn's fire there.
    nozzle = pivot("RetroEngine_Nozzle", g, V(0, 0, 0))
    main, noz, body = MeshBuilder(), MeshBuilder(), MeshBuilder()
    main.lathe(pm([(140, 0), (128, 50), (100, 120), (62, 190), (36, 235), (34, 250)]), 48)
    body.lathe(pm([(34, 250), (60, 262), (86, 290), (86, 380), (60, 420), (0, 430)]), 40)
    body.lathe(pm([(0, 268), (186, 268), (194, 110), (205, 110)]), 48, flip=True)  # the plate that closes the skirt
    for i in range(4):
        a = deg(45 + 90 * i)
        m = Matrix.Translation(V(148 * math.cos(a), 148 * math.sin(a), 0))
        noz.lathe(pm([(28, 100), (23, 140), (12, 185), (10, 195)]), 20, matrix=m)
        body.lathe(pm([(10, 195), (20, 205), (20, 270)]), 16, matrix=m)
    hang(main.build("Engine_Nozzle", M["nozzle"], None, sharp_angle=None), nozzle)
    noz.build("Engine_SteeringNozzles", M["nozzle"], g, sharp_angle=None)
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


def build(
    pilot: Callable[[bpy.types.Object, Matrix], object] | None = None,
    stowed: bool = False,
    film_camera: bool = False,
    television: bool = False,
    lining: str = "yellow",
) -> str:
    """Build the spacecraft. `pilot(parent, place)` builds the man in the seat (a suit's `build_seated`); left out, the seat is empty.
    `stowed` draws the instrument module's ten antennas withdrawn, as a flight under its fairing needs. `film_camera` puts
    a Konvas in the cabin, as a node of its own: Vostok 2 was the first to carry one. `television` builds the two Seliger
    cameras as they were photographed, as a node of their own, in place of the cabin's two plain barrels: Vostok 3 and 4,
    whose picture was the first to be broadcast. `lining` is the colour of the cabin's wall (LININGS): white on Vostok 5 and
    Vostok 6, whose flown cabins show it."""
    M = materials(lining)
    build_descent_module(M)
    build_hatches(M)
    build_cabin(M, tv_standins=not television)
    cut_openings()
    held = build_seat(M, pilot)
    if film_camera:
        build_film_camera(M)
    if television:
        build_television(M)
    build_straps(M)
    build_cable_mast(M)
    build_instrument_module(M, stowed)
    build_gas_bottles(M)
    build_retro_engine(M)
    mark_shells(SHELLS)
    # what leaves the descent module on the way down has its origin on itself and its own axes to leave along
    reframe(bpy.data.objects["EntryHatch"], hatch_node(ENTRY))
    reframe(bpy.data.objects["ParachuteHatch"], hatch_node(PARACHUTE))
    reframe(bpy.data.objects["EjectionSeat"], seat_node(), held)
    return f"{LENGTH * MM:.3f} m nozzle to the top of the sphere's housing, {2 * MODULE_R * MM:.3f} m across"
