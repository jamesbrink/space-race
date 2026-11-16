"""Launch Complex 14: the site's frame, its key dimensions and its materials. Dimensions are feet,
as the sources give them (HAER FL-8-7; the photographs are scaled in feet off the Atlas's 10 ft tank).
The geometry helpers the pieces share are tools/blender/sitelib.py's, passed on from here so that a
piece imports everything from its site.

Frame (Blender): the origin is the vehicle's axis at the stand's deck. +Z is up. **+X bears 105 deg
true**, the line the vehicle's pitch axis lay on ("the launch pad is oriented so that the pitch axis
of the launch vehicle is alined on an azimuth of 105 degrees": Results of the First United States
Manned Orbital Space Flight, p. 46): east-south-east, the way the transfer table carried the service
structure to its parking area. **+Y bears 015 deg**: along the stand and ramp's long axis, north,
the way the structure rolled off the stand; the ramp runs away along -Y. True north is
(-sin 15 deg, cos 15 deg, 0) = (-0.259, 0.966, 0): 15 deg from +Y toward -X (`TRUE_NORTH`). See ../lc-14.md.

Where things lie on the ground is OpenStreetMap's, which maps what survives (the ways are named in
../lc-14.md, "The layout"): each is given here as OSM has it, in feet east-south-east and north-north-east
of the middle of the stand's surviving outline (way 195727091), and put in the frame by `osm()`, which
takes off how far north of that middle the vehicle stood (`VEHICLE_NORTH`).
"""

from __future__ import annotations

import math

import sitelib
from lc5.site import materials as _cape_materials
from sitelib import (
    P,
    Parts,
    Wall,
    axes,
    axle_cap,
    beam,
    box,
    box_girder,
    building,
    door,
    ear_clip,
    fence,
    film_camera,
    fine,
    flat_roof,
    foot,
    handrail,
    hull,
    lamp_head,
    lattice,
    lettering,
    obox,
    offset_poly,
    panels,
    placed,
    plate,
    prism,
    profile,
    rail,
    rail_clamp,
    ring,
    roof_vent,
    slab,
    solid,
    stair_rails,
    stairs,
    stood,
    truss,
    wall_door,
    wheel_sides,
    window,
)
from srlib import FT, material

sitelib.use(FT)  # this site's sources are in feet
ftp = profile  # a lathe profile given in feet

__all__ = [
    "FT",
    "P",
    "Parts",
    "Wall",
    "axes",
    "axle_cap",
    "beam",
    "box",
    "box_girder",
    "building",
    "door",
    "ear_clip",
    "fence",
    "film_camera",
    "fine",
    "flat_roof",
    "foot",
    "ftp",
    "handrail",
    "hull",
    "lamp_head",
    "lattice",
    "lettering",
    "materials",
    "obox",
    "offset_poly",
    "osm",
    "panels",
    "placed",
    "plate",
    "prism",
    "profile",
    "rail",
    "rail_clamp",
    "ring",
    "roof_vent",
    "slab",
    "solid",
    "stair_rails",
    "stairs",
    "stood",
    "truss",
    "turned",
    "wall_door",
    "wheel_sides",
    "window",
]

# --------------------------------------------------------------------------- the site

BEARING_X = 105.0  # what +X bears, degrees true (documented: ../lc-14.ts `bearingX`, which is where the viewer reads it)
TRUE_NORTH = (-math.sin(math.radians(15.0)), math.cos(math.radians(15.0)), 0.0)

# The ground. The deck stands 22 ft over it (HAER FL-8-7, p. 20: the ramp "gradually increased to a height of 22'"):
# taken to the paving round the stand's foot (`APRON`). The viewer's terrain lies 12 cm under that paving (`GROUND`;
# ../lc-14.ts `grade`, which is the two together), as it does under the pads at Complex 5, so that no slab lies in the
# terrain's own depth (docs/agents/rendering.md, "Nothing lies close above the terrain"). Whatever stands on the
# ground reaches FOOTING below it.
DECK = 22.0
APRON = -DECK
GROUND = APRON - 0.12 / 0.3048
FOOTING = 3.0

# How far north of the middle of the stand's surviving outline the vehicle stood. The stand was 78 ft long and its
# "northern portion ... was razed in December 1976" (HAER, pp. 20 and 21); what survives is 68 ft (OSM), from the
# ramp's head at 34 ft south of its middle. The whole stand therefore ran from 34 ft south to 44 ft north (derived),
# and the launcher stood toward its north end, over the flame bucket, whose flume leaves north (HAER, p. 22). Where
# along it is read off the aerial photographs of May 1963 (NASA GPN-2000-000609 and KSC-63PC-34): estimated, 6 ft
# either way. ../lc-14.md, "Where the vehicle stood".
VEHICLE_NORTH = 14.0


def osm(x: float, y: float) -> tuple[float, float]:
    """A place as OpenStreetMap has it (feet along 105 deg and along 015 deg from the middle of way 195727091), in the site's frame."""
    return (x, y - VEHICLE_NORTH)


# The stand and ramp (HAER FL-8-7, p. 20: documented): "approximately 432' long", twelve bays, the stand the northernmost,
# "approximately 60' wide x 78' long"; the ramp "approximately 24' wide"; its southernmost bay "approximately 170' long
# ... on earthen fill paved with concrete slabs", the rest on a steel frame under a concrete slab.
STAND_W, STAND_L = 60.0, 78.0
STAND_S = osm(0, -34.0)[1]  # the stand's south edge: the ramp's head (OSM ways 195727091, 1264624135)
STAND_N = STAND_S + STAND_L
RAMP_W = 24.0
RAMP_L = 432.0 - STAND_L  # the eleven bays of ramp
RAMP_FILL = 170.0  # the southernmost, on fill
RAMP_BAY = (RAMP_L - RAMP_FILL) / 10  # each of the ten on steel: 18.4 ft (derived)
RAMP_FOOT = STAND_S - RAMP_L  # where the ramp meets the ground
# "gradually increased to a height of 22' over the northern six bays": read as level at 22 ft over those six (110 ft)
# and rising to it over the fill and the four bays south of them, 9 in 100, which a missile's trailer can climb;
# the photographs of May 1963 have the deck level for at least that far south of the stand. The other reading (the
# whole rise in the six bays, 1 in 5) is what scenery.ts drew until this model. Derived; ../lc-14.md, "The ramp".
RAMP_LEVEL = 6 * RAMP_BAY
RAMP_KNEE = STAND_S - RAMP_LEVEL  # south of this the deck slopes down to the ground


def ramp_z(y: float) -> float:
    """The ramp's surface at y: level from the stand to the knee, then down to the ground at its foot."""
    if y >= RAMP_KNEE:
        return 0.0
    return APRON * (1.0 - max(0.0, y - RAMP_FOOT) / (RAMP_KNEE - RAMP_FOOT))


# The vehicle on the launcher. The engines' exit plane stood about 8 ft over the deck (estimated, 2 ft either way: NASA
# GPN-2000-000998, taken from the ramp with the eye at the deck's level, has the booster section's foot 7.8 ft up by the
# tank's 10 ft; the aerial GPN-2000-000609 reads 11 ft, less surely); the vehicle's origin, the capsule's widest plane, is
# 859.81 in over that (vehicles/mercury-atlas.ts `BASE`), the hatch's middle 32.8 in higher, the tip 95 ft 4 in.
LAUNCHER_TOP = 8.0
SHIELD_Z = LAUNCHER_TOP + 859.81 / 12
HATCH_Z = SHIELD_Z + 32.8 / 12
HATCH_R = (37.25 - 32.8 * math.tan(math.radians(20.0))) / 12  # the skin at the hatch's middle, from the axis
VEHICLE_TIP = LAUNCHER_TOP + (95.0 + 4.0 / 12)
TANK_R = 5.0  # the Atlas's tank, 10 ft across (NASA SP-45, p. 85)
# How the vehicle stood: its pitch axis, on which the two booster engines and their pods lie, along +X (105 deg). The
# capsule's hatch is 45 degrees round from the window, which is over the long pod (vehicles/atlas-lv3b.md, "Which way
# round"): so on 060 or on 240 deg true, 45 or 225 degrees round from +X toward +Y. The photographs of Glenn going
# aboard and of the bascule at the hatch settle it (../lc-14.md, "Which way the hatch faced"): 240, the window toward
# the blockhouse and the ocean behind the capsule seen from the hatch's side (NASA S62-00490, KSC-LOD-62-475).
HATCH_TURN = 225.0


def round_vehicle(degrees: float = 0.0) -> float:
    """A place round the vehicle, given in degrees from the hatch's middle (anticlockwise from above), as an angle
    in the site's frame: radians from +X toward +Y."""
    return math.radians(degrees + HATCH_TURN)


# The service structure's rails: at the ground, either side of the stand, from beside the vehicle north on to the
# transfer table (HAER, p. 22 and Figure 7). Their gauge is not published: estimated off NASA GPN-2000-000998 (the
# structure some 67 ft across its base, seen from the ramp, 5 ft either way) with the stand's 60 ft and the pipes on its
# west face between them.
RAIL_X = 34.0  # each rail's centre line, either side of the stand, whose pipes it clears by 2.5 ft
RAIL_TOP = APRON + 0.03  # rail heads stand 9 mm proud of the paving they are let into
# The transfer table's two tracks (OSM ways 1264975420 and 1264975421: derived): on 105 deg, 43 ft apart, from 50 ft
# west of the stand's axis to 555 ft east of it. OSM, traced from imagery to a few feet, has the nearer one 1.5 ft
# inside the line the stand's north edge is derived on; the table ran clear of the stand, so both are taken 4 ft
# further north than drawn, the nearer 2.5 ft off the stand (estimated).
TABLE_TRACKS = (osm(0, 46.5)[1], osm(0, 89.5)[1])
TABLE_Y = (TABLE_TRACKS[0] + TABLE_TRACKS[1]) / 2  # the table's middle: where the structure's middle stands when it is carried
TABLE_WEST, TABLE_EAST = -50.0, 555.0
# The table runs in a pit, its deck level with the paving so that the structure rolls on to it: the pit's two walls
# (HAER Figure 7, the stand in steel in 1956, has a walled trench with a rail on its floor in the foreground). Its depth
# is not in anything read: 3 ft, estimated.
PIT = (STAND_N + 0.6, TABLE_TRACKS[1] + 1.9)  # the pit's south and north walls
PIT_DEPTH = 3.0
TABLE_HALF = 44.0  # half the table's length along its tracks: it carries the structure's legs and its stair
# "approximately 300' east of the Launch Stand" (HAER, p. 22): how far the table carried it
PARKED_X = 300.0

# The structure itself. 154 ft 8 in (HAER, p. 22: documented), taken from its rails; the NHL nomination has 145 ft.
STRUCTURE_TOP = 154.0 + 8.0 / 12


def turned(parts: Parts, node: str, pivot, axis: str, degrees: float) -> None:
    """Turn everything drawn so far for `node` about a line through `pivot` (site units) along the site's X, Y or Z,
    right-handed: a piece built as it lies when lowered, and shown raised."""
    from mathutils import Matrix, Vector

    c = Vector(pivot) * FT
    r = Matrix.Rotation(math.radians(degrees), 3, axis)
    for (n, _), (mb, _) in parts.meshes.items():
        if n == node:
            mb.verts = [tuple(r @ (Vector(v) - c) + c) for v in mb.verts]


def materials() -> dict:
    """The Cape's own materials, by the names Complex 5's are built in (lc5/site.py), and what this complex adds."""
    m = material
    every = _cape_materials()
    every.update(
        {
            # the service structure and the umbilical tower: a bright red-orange in every colour photograph of 1962 and
            # 1963 (NASA GPN-2000-000609, GPN-2000-000998): estimated from them
            "orange": m("paint-structure-orange", (0.72, 0.085, 0.015), 0.0, 0.5),
            # corrugated asbestos cement: the ramp's sides and the Ready Building (HAER, pp. 20 and 25)
            "asbestos": m("siding-asbestos-cement", (0.52, 0.53, 0.5), 0.0, 0.9),
            # the white room's sliding doors and the huts' roofs: bright corrugated aluminium
            "aluminium": m("aluminium-corrugated", (0.74, 0.75, 0.76), 0.9, 0.35),
            "tank": m("paint-tank-white", (0.8, 0.8, 0.77), 0.1, 0.45),
            "gunite": m("concrete-gunite", (0.6, 0.58, 0.52), 0.0, 0.95),
            "fill": m("sand-fill", (0.56, 0.5, 0.36), 0.0, 1.0),
            "pipe": m("steel-pipe-grey", (0.42, 0.44, 0.45), 0.6, 0.5),
            "stripe": m("paint-hazard-yellow", (0.78, 0.6, 0.04), 0.0, 0.5),
            "water": m("water-basin", (0.07, 0.11, 0.1), 0.0, 0.08),
            "lamp-signal-red": m("lamp-signal-red", (0.7, 0.05, 0.03), 0.0, 0.3, emission=(1.0, 0.1, 0.05), emission_strength=0.8),
            "lamp-signal-green": m("lamp-signal-green", (0.05, 0.35, 0.12), 0.0, 0.3),
        }
    )
    return every
