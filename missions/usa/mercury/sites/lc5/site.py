"""Launch Complex 5: the site's frame, its key dimensions and its materials. Dimensions are feet,
as the sources give them. The geometry helpers the pieces share are tools/blender/sitelib.py's,
passed on from here so that a piece imports everything from its site.

Frame (Blender): the origin is the launcher's centre on the hardstand's surface. +Z is up. +X is
the side the capsule hatch faces: WNW, about 295 deg true, uprange and toward the blockhouse.
+Y runs along the service structure's rails toward its parking places, SSW (205 deg true). True
north is (sin 25 deg, -cos 25 deg, 0) = (0.423, -0.906, 0): 25 deg from -Y toward +X. See ../lc-5.md.
"""

from __future__ import annotations

import math

import sitelib
from sitelib import (
    P,
    Parts,
    Wall,
    arch,
    axes,
    axle_cap,
    beam,
    box,
    box_girder,
    building,
    door,
    ear_clip,
    fence,
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
    rail_clamp,
    ring,
    roof_vent,
    searchlight,
    slab,
    solid,
    stair_rails,
    stairs,
    stood,
    truss,
    wall_door,
    window,
)
from srlib import FT, material

sitelib.use(FT)  # this site's drawings are in feet
ftp = profile  # a lathe profile given in feet

__all__ = [
    "P",
    "Parts",
    "Wall",
    "arch",
    "searchlight",
    "axle_cap",
    "box_girder",
    "rail_clamp",
    "receptacle",
    "axes",
    "beam",
    "box",
    "building",
    "door",
    "ear_clip",
    "fence",
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
    "panels",
    "placed",
    "plate",
    "prism",
    "profile",
    "ring",
    "roof_vent",
    "slab",
    "solid",
    "stair_rails",
    "stairs",
    "stood",
    "timber_pole",
    "truss",
    "wall_door",
    "window",
]

# --------------------------------------------------------------------------- the site

TRUE_NORTH = (math.sin(math.radians(25.0)), -math.cos(math.radians(25.0)), 0.0)
# The launcher's support pads, where the fins' bottoms rest. Estimated 4.9 to 6.0 ft off S63-02651
# (MR-4 at ignition, ground level): the booster's 70 in body gives 23.5 px/ft at the tail.
LAUNCHER_TOP = 5.5
# The capsule: the vehicle's origin (the heat shield's plane of maximum diameter) is 716.0 in above
# the fins; the hatch centre 32.8 in above that. The umbilical's receptacle is under the periscope's lens, inside
# its door: 135 degrees round from the hatch's middle (the hatch on +X), 31.2 in up the cone, on the skin (estimated,
# from photographs of the flown capsule and of No. 11: mr-3-freedom-7/spacecraft.md, "Round the cone"). It was
# taken until November 2026 to be on -Y, 8 in up the cone.
SHIELD_Z = LAUNCHER_TOP + 716.0 / 12
HATCH_Z = LAUNCHER_TOP + (716.0 + 32.8) / 12
UMBILICAL_AT = (math.radians(135.0), 31.2)  # (round from +X, station in inches)
UMBILICAL = (
    (37.25 - UMBILICAL_AT[1] * math.tan(math.radians(20.0))) / 12 * math.cos(UMBILICAL_AT[0]),
    (37.25 - UMBILICAL_AT[1] * math.tan(math.radians(20.0))) / 12 * math.sin(UMBILICAL_AT[0]),
    LAUNCHER_TOP + (716.0 + UMBILICAL_AT[1]) / 12,
)
VEHICLE_TIP = LAUNCHER_TOP + 83.38  # escape tower's tip (Hammack & Heberlig, Figure 18)


def receptacle() -> tuple[float, float, float]:
    """Where the capsule's umbilical plugs in on the date being built: the receptacle of whichever capsule
    stood on the booster then. Both capsules' receptacles are under the periscope's lens, 135 degrees round
    from the hatch; they differ in station, each from its own photographs (the flights' spacecraft.md):
    No. 7's at 31.2 in (UMBILICAL, above), No. 11's at 32.5 in. The point is on the skin."""
    # (which capsule, the station of its receptacle in inches, since, until, how sure, what says so)
    capsules = (
        (
            "Capsule No. 7 on the booster: its umbilical receptacle at station 31.2",
            31.2,
            None,
            "1961-05-05",
            "documented",
            "MR-3 flew No. 7 on 5 May 1961 (Postlaunch Report); the station is estimated (mr-3-freedom-7/spacecraft.md)",
        ),
        (
            "Capsule No. 11 on the booster: its umbilical receptacle at station 32.5",
            32.5,
            "1961-06-30",
            "1961-07-21",
            "documented",
            "FHSU item 314, LOD 61-6091, 30 June 1961: 'Capsule checkout on third level, Pad 5 (Caps #11)'; MR-4 Results p. 5: "
            "21 days on the pad. The station is estimated (mr-4-liberty-bell-7/spacecraft.md)",
        ),
    )
    stations = [
        station for thing, station, since, until, sure, source in capsules if stood(thing, since=since, until=until, confidence=sure, source=source)
    ]
    station = stations[0] if stations else UMBILICAL_AT[1]  # (between the two flights nothing stood there: No. 7's is kept)
    out = (37.25 - station * math.tan(math.radians(20.0))) / 12
    return (out * math.cos(UMBILICAL_AT[0]), out * math.sin(UMBILICAL_AT[0]), LAUNCHER_TOP + (716.0 + station) / 12)


HARDSTAND = 200.0  # side of the square: OSM outline 195 to 202 ft; TM X-53107 Figure 7-6, 157 px at 1.274 ft/px
CIRCLE_R = 60.5  # the painted circle: 95 px on Figure 7-6 at 1.274 ft/px
# How far concrete, ballast and footings go down. The viewer's terrain is 0.12 m (0.39 ft) under the
# pad's surface (the pads and roads were at grade), so anything standing on the ground must reach past it.
FOOTING = 3.0
GROUND = -0.12 / 0.3048  # the viewer's terrain (backdrops.ts: GROUND_Y), in feet under the pad's surface

# The rest of Complex 5/6, in this frame. From OpenStreetMap, which maps what survives (see ../lc-5.md):
PAD6 = (0.0, -520.0)  # pad 6's centre: 519 ft along 025.2 deg; taken on the rails' centre line, 520 ft
# The blockhouse is an arrow: a rectangle 44 ft wide with a right-angled point toward the pads, 90 ft
# from the point to the back wall. The point is 305 ft from pad 5's centre and 304 ft from pad 6's.
BLOCKHOUSE_TIP = (157.3, -261.0)
BLOCKHOUSE_LENGTH, BLOCKHOUSE_HALF = 90.0, 22.0
# The cable trench: its end on the pad (TM X-53107 Figure 7-6), and where it reaches the blockhouse, at
# the pad 5 firing room's corner (the covers that survive run to it; FHSU F16_016 shows pad 6's the same).
TRENCH_END = (51.0, -8.5)
TRENCH_TO = (BLOCKHOUSE_TIP[0] + 19.9, BLOCKHOUSE_TIP[1] + 19.9)

# The track: two pairs of rails, each about standard gauge, their centres about 21 ft apart
# (6100884: fin span 142 px = 12.67 ft, pairs 223 px apart; OpenStreetMap maps two lines 22.3 ft apart).
RAIL_PAIR_X = 10.5  # each pair's centre line, either side of the launcher
GAUGE = 4.71  # 4 ft 8.5 in, between the rails' centres (estimated: the pairs looked standard gauge)
RAIL_TOP = 0.03  # rail heads stand 9 mm proud of the concrete
TRACK_END = 245.0  # the track's far end on the structure's side: past the launch position (Figure 7-6)
TRACK_BACK = -165.0  # how much of the run north toward pad 6 is modelled

# The service structure's node origin is the point on the track's centre line where the vehicle's
# axis is when the structure stands round it. It is built there, round the vehicle, platforms
# closed. Its later positions, along +Y:
STRUCTURE_T55 = 110.0  # "edge of pad" at T-55 min: not dimensioned anywhere; estimated 100 to 120 ft
STRUCTURE_LAUNCH = 173.0  # T-8:45: Figure 7-6's marker at 181 ft, less the 8 ft from this origin to the base's middle

# Work platforms, floor heights. Level 3 (the white room) is anchored to the capsule: its floor at
# the heat shield's plane. The spacing is scaled off Hammack Fig. 22 (S-61-1930) and TM X-53107 Fig. 7-7.
LEVELS = {1: SHIELD_Z - 19.6, 2: SHIELD_Z - 10.9, 3: SHIELD_Z - 0.6, 4: SHIELD_Z + 11.1}
STRUCTURE_TOP = 135.0  # to the crane deck's top rail: LC-26 twin 111 ft 9 in + 23 ft (Noble), COE "140 feet"
PLATFORM_PART = 4.5  # how far each half of a platform slides out, either way, to open (estimated)
# Where the capsule's cable mast stands in the platforms' split, and the cut round it: behind the vehicle on the
# receptacle's side (+Y, 45 degrees round from it), the one place on that side the parted platforms leave clear.
MAST_NOTCH = (8.0, 0.7)


def materials() -> dict:
    m = material
    return {
        "concrete": m("concrete", (0.46, 0.45, 0.42), 0.0, 0.9),
        "joint": m("concrete-joint", (0.07, 0.07, 0.065), 0.0, 1.0),
        "ballast": m("ballast-gravel", (0.22, 0.21, 0.19), 0.0, 1.0),
        "tie": m("timber-tie", (0.12, 0.09, 0.07), 0.0, 0.9),
        "rail": m("steel-rail", (0.30, 0.25, 0.21), 1.0, 0.55),
        "paint": m("paint-line-yellow", (0.75, 0.42, 0.04), 0.0, 0.6),
        "red": m("paint-structure-red", (0.58, 0.085, 0.025), 0.0, 0.55),
        "white": m("paint-structure-white", (0.78, 0.78, 0.75), 0.0, 0.5),
        "grey": m("paint-structure-grey", (0.25, 0.27, 0.28), 0.1, 0.6),
        "panel": m("paint-panel-turquoise", (0.14, 0.42, 0.42), 0.0, 0.4),
        "deck": m("galvanised-deck", (0.42, 0.43, 0.44), 0.9, 0.6),
        "galv": m("galvanised-steel", (0.5, 0.51, 0.52), 0.9, 0.45),
        "scorched": m("steel-scorched", (0.085, 0.075, 0.07), 0.8, 0.7),
        "black": m("paint-launcher-black", (0.04, 0.04, 0.042), 0.2, 0.7),
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),  # the viewer makes this transparent
        "interior": m("interior-dark", (0.09, 0.09, 0.085), 0.0, 0.9),
        "tyre": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "yellow": m("paint-vehicle-yellow", (0.62, 0.42, 0.03), 0.0, 0.5),
        "orange": m("paint-stripe-orange", (0.7, 0.2, 0.02), 0.0, 0.55),
        "lamp": m("lamp", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.6),
        "cable": m("cable", (0.03, 0.03, 0.03), 0.0, 0.7),
        "chassis": m("steel-chassis", (0.05, 0.05, 0.055), 0.3, 0.7),
        "scorch": m("concrete-scorched", (0.13, 0.12, 0.115), 0.0, 1.0),
        "stain": m("concrete-stained", (0.27, 0.26, 0.24), 0.0, 0.95),
        "blue": m("paint-insignia-blue", (0.03, 0.09, 0.35), 0.0, 0.5),
        "trailer": m("paint-trailer-white", (0.72, 0.72, 0.69), 0.0, 0.55),
        # the blockhouse and what stood round it
        "bunker": m("concrete-painted", (0.66, 0.64, 0.58), 0.0, 0.85),
        "block": m("concrete-block-painted", (0.6, 0.59, 0.54), 0.0, 0.9),
        "tar": m("roof-tar", (0.035, 0.035, 0.035), 0.0, 0.95),
        "shell": m("shell-gravel", (0.47, 0.42, 0.32), 0.0, 1.0),
        "timber": m("timber-pole", (0.13, 0.085, 0.05), 0.0, 0.9),
        "plank": m("timber-plank", (0.38, 0.3, 0.2), 0.0, 0.85),
        "blast": m("steel-blast-door", (0.17, 0.11, 0.085), 0.6, 0.6),
        "frame": m("steel-window-frame", (0.07, 0.075, 0.075), 0.6, 0.55),
        "console": m("paint-console-green", (0.3, 0.36, 0.33), 0.1, 0.5),
        "corrugated": m("galvanised-corrugated", (0.5, 0.51, 0.5), 0.8, 0.5),
        "mesh": m("galvanised-mesh", (0.42, 0.43, 0.42), 0.8, 0.6, double_sided=True),
        "canvas": m("canvas-sandbag", (0.42, 0.38, 0.29), 0.0, 1.0),
        "chrome": m("chrome", (0.75, 0.76, 0.78), 1.0, 0.18),
        "taillamp": m("lamp-tail", (0.45, 0.02, 0.02), 0.0, 0.3),
        "panelface": m("paint-panel-grey", (0.16, 0.17, 0.17), 0.2, 0.5),
        "lamp-red": m("lamp-red", (0.7, 0.05, 0.03), 0.0, 0.3, emission=(1.0, 0.1, 0.05), emission_strength=0.8),
        "lamp-green": m("lamp-green", (0.05, 0.6, 0.12), 0.0, 0.3, emission=(0.1, 1.0, 0.2), emission_strength=0.8),
        "lamp-amber": m("lamp-amber", (0.8, 0.45, 0.03), 0.0, 0.3, emission=(1.0, 0.6, 0.05), emission_strength=0.8),
        # a fitting that glows but lights nothing itself: the viewer puts the room's light at a Light_ empty
        "lamp-room": m("lamp-room", (0.95, 0.93, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.8),
        "reflector": m("chrome-reflector", (0.92, 0.93, 0.95), 1.0, 0.1),  # a searchlight's mirror
        "search": m("lamp-flood-search", (0.95, 0.97, 1.0), 0.0, 0.2, emission=(0.85, 0.92, 1.0), emission_strength=1.5),
        "void": m("window-void", (0.02, 0.022, 0.025), 0.0, 0.6),
        "sign": m("paint-sign-white", (0.82, 0.82, 0.8), 0.0, 0.5),
        "signred": m("paint-sign-red", (0.6, 0.05, 0.04), 0.0, 0.5),
        "car-seafoam": m("paint-car-seafoam", (0.33, 0.52, 0.45), 0.3, 0.3),
        "car-cream": m("paint-car-cream", (0.74, 0.7, 0.58), 0.3, 0.3),
        "car-blue": m("paint-car-blue", (0.16, 0.3, 0.48), 0.3, 0.3),
        "car-red": m("paint-car-red", (0.5, 0.06, 0.05), 0.3, 0.3),
        "car-black": m("paint-car-black", (0.03, 0.03, 0.035), 0.3, 0.25),
        "car-white": m("paint-car-white", (0.8, 0.8, 0.77), 0.3, 0.3),
        "car-olive": m("paint-car-olive", (0.2, 0.22, 0.13), 0.1, 0.6),
    }


def timber_pole(parts: Parts, node: str, x: float, y: float, height: float, **kw) -> None:
    """sitelib's timber pole, standing in this site's ground unless told otherwise."""
    if kw.get("ground") is None:
        kw["ground"] = GROUND
    sitelib.timber_pole(parts, node, x, y, height, **kw)
