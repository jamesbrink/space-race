"""Launch Complex 19: the site's frame, its key dimensions and its materials. Dimensions are feet, as
the sources give them. The geometry helpers the pieces share are tools/blender/sitelib.py's, passed on
from here so that a piece imports everything from its site.

Frame (Blender): the origin is the launch vehicle's axis on the launch deck, the steel deck the thrust
mount stands on. +Z is up. +X runs along the stand toward the ramp, the way the erector lowers and the
spacecraft's hatches faced: 175 degrees true, a little east of south. +Y is square to the stand on
the side of the second-stage test position, 85 degrees true: east, toward the sea. True north is
(-cos 5, -sin 5, 0): the flume runs to -X, the blockhouse lies to -Y. See ../lc-19.md for every figure's
source and how sure it is; nearly all of them are read off photographs, and are estimated.
"""

from __future__ import annotations

import math

import sitelib
from sitelib import (
    P,
    Parts,
    Wall,
    axes,
    beam,
    box,
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
    plate,
    prism,
    profile,
    ring,
    roof_vent,
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

sitelib.use(FT)  # this site's figures are in feet
ftp = profile  # a lathe profile given in feet

__all__ = [
    "P",
    "Parts",
    "Wall",
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
    "plate",
    "prism",
    "profile",
    "ring",
    "ring_rail",
    "roof_vent",
    "slab",
    "solid",
    "stair_rails",
    "stairs",
    "stood",
    "truss",
    "wall_door",
    "window",
]

# --------------------------------------------------------------------------- the site

BEARING_X = 175.0  # what +X bears, degrees true (../lc-19.ts `bearingX`, which is where the viewer reads it)
TRUE_NORTH = (-math.cos(math.radians(5.0)), -math.sin(math.radians(5.0)), 0.0)

HB = "Martin, Gemini-Titan II Air Force Launch Vehicle Press Handbook, chapter 7"  # the complex's own figures: ../lc-19.md

# The land. "The launch stand is 28 feet tall, 65 feet wide and 450 feet long", and the spacecraft was hoisted "28 feet
# from the ground to the deck" (the handbook, p. 7-8): documented. The viewer's terrain is there (../lc-19.ts `grade`).
GROUND = -28.0
FOOTING = GROUND - 3.0  # how far down anything standing on the land goes: past the terrain
PAVED = GROUND + 0.4  # paving laid on the land: 12 cm over the terrain, as every pad's is (docs/agents/rendering.md)
APRON = -26.0  # the flume's concrete apron under the deck's north end, two feet over the land (S65-43447: estimated)

# The stand: 65 ft wide (documented). The vehicle did not stand on its middle line: in S65-43447 the deck's west edge
# is 23.5 ft from the vehicle's axis and its east edge 47.5 ft, with the second-stage test position on the east half
# (estimated: the steel deck with its walks is 71 ft across in that photograph, 3 ft wider each side than the concrete).
STAND_Y = (-20.5, 44.5)  # the concrete stand's two long walls
DECK_Y = (-23.5, 47.5)  # the steel launch deck's edges, with its walks
DECK_NORTH = -42.0  # the launch deck's north edge over the flume (S65-49568: 225 px north of the axis at 5.4 px/ft)
DECK_SOUTH = 14.0  # where the steel deck meets the concrete stand's roof (the same photograph)
# "The launch deck, or ramp level, is 300 feet long, extending south from the pad" (the handbook, pp. 7-2 and 7-8): the
# stand's level top is taken to run 300 ft from the deck's north edge, and the earth ramp from there. The handbook's and
# the nomination's 450 ft is not reconciled with it: the ramp's own length, 220 ft, is read off imagery of what is left.
STAND_SOUTH = DECK_NORTH + 300.0
RAMP_FOOT = STAND_SOUTH + 220.0
RAMP_ROAD = (-2.0, 26.0)  # the ramp's paving, 28 ft wide about the stand's middle line (Esri imagery: estimated)
STOREYS = (-28.0, -18.7, -9.3)  # its floors: "the test stand second floor" is documented, their heights are not (the 28 ft in thirds)

# The thrust mount: "the four 'A-frame' thrust mounts" under the first stage's four longerons, each held by a 1 3/8 in
# stud whose nuts explosive charges sheared at liftoff (the handbook, ch. 4 and its countdown). The skirt's foot is
# 13.9 ft over the deck: 13.8 to 14 ft in three
# photographs (S65-10461, S65-49568, S65-43447), on the vehicle's 10 ft. The engines hang 123.8 in below the skirt's
# foot (titan-ii-glv.md: stations 1224.311 to 1348.103), so their exits are 3.6 ft over the deck.
MOUNT_TOP = 13.9
MOUNT_HEAD = 5.2  # the four longerons, from the axis (on the skin's diagonals: estimated)
ENGINE_EXIT = MOUNT_TOP - (1348.103 - 1224.311) / 12  # the vehicle's base over the deck: what the viewer stands it at
VEHICLE_TOP = ENGINE_EXIT + (1071.278 + 225.84) / 12  # the nose fairing's tip: 1,297.118 in over the exits
SPACECRAFT_BASE = ENGINE_EXIT + 1071.278 / 12  # the adapter's foot on the launch vehicle, spacecraft station Z13.44
CABIN_FOOT = SPACECRAFT_BASE + 90.0 / 12  # Z103.44, where the cabin meets the adapter: the vehicle model's origin
# The flame bucket "is 19 feet 8 inches wide and 17 feet 6 inches tall" where the flame enters it (the handbook, p. 7-10):
# the opening in the deck is given its width across the stand and its other figure along it (which way is not said).
OPENING = (8.75, 9.83)  # half of it, along X and along Y

# The second-stage test position, on the deck's east half: its flame opening is centred 39 ft east of the vehicle's in
# S65-43447, 13 ft wide; its stand a little north of the vehicle's line in S65-49568; its umbilical tower 17 ft east
# of the axis and 42 ft high. Estimated.
STAGE2_STAND = (-10.0, 39.0)
STAGE2_TOWER = (-14.0, 17.0)
STAGE2_TOWER_TOP = 42.0
# The spacecraft hoisting crane: a tower crane "on the north side of the test stand in line with the vehicle" that
# lifted the spacecraft "28 feet from the ground to the deck" (the handbook: documented). Its place, 35 ft north of
# the axis and 12 ft west, its 40 ft and its jib are read off S65-10461 and S65-43447: estimated.
CRANE = (-35.0, -12.0)
CRANE_TOP = 40.0

# The complete vehicle erector: "138-foot-high", 140 tons, "It measures 18.5 by 25 feet" (the handbook, p. 7-10:
# documented; the sentence could be the white room's, and is taken for the erector's body, 18.5 ft deep and 25 ft
# wide, which is what the photographs show). Its hinge is at the deck, 10 to 13 ft south of the vehicle's axis
# (S65-49568: estimated), and the first stage lay "5 feet from the erector's bottom end", which puts that end at the
# deck. It is open to the north.
HINGE = (
    13.0,
    5.5,
)  # the hinge line: x, z (it runs along Y). On pedestals: the lowered erector's underside is a man's height over the deck in S65-21881
ERECTOR_DEPTH = 18.5
ERECTOR_HALF = 12.5  # half its width
ERECTOR_TOP = 138.0
# "Nine hydraulically operated work platforms"; the service elevator, on the west, "serves five work platform levels
# between the deck and the 80-foot level" (documented). The five levels' heights are read off the erector's south face
# in the handbook's p. 7-15 (members at about 36, 45, 52, 60, 69 and 78 ft, each to 4 ft): put at equal steps to 80 ft.
WORK_LEVELS = (36.0, 47.0, 58.0, 69.0, 80.0)
# The white room: "50 feet high, 25 feet square at the base and 23 feet square at the top", 25 tons, its levels at
# "91 feet 2 inches, 102 feet 2 inches, 109 feet 2 inches and 118 feet 2 inches", a 5-ton bridge crane at "the 132-foot
# level of the erector" (the handbook, pp. 7-10 and 7-13: documented). The crew's level is the second: "the 100-foot
# level of the White Room" (the Gemini XI press kit), 21 in over the cabin's foot, so the hatches' sills are at the floor.
WHITE_ROOM = (88.0, 138.0)
ROOM_LEVELS = (91.0 + 2 / 12, 102.0 + 2 / 12, 109.0 + 2 / 12, 118.0 + 2 / 12)
CREW_FLOOR = ROOM_LEVELS[1]
BRIDGE_CRANE = 132.0
ROOM_HALF = (12.5, 11.5)  # half the room's side at its base and at its top

# The complete vehicle umbilical tower: "triangular", "102 feet high", "14-foot sides", its booms "14 to 18 feet" long
# at the 25, 43, 54 and 71 ft levels for the first stage, the 80 and 90 ft levels for the second and one at 99 ft for
# the spacecraft (the handbook, p. 7-13: documented). It stood west-north-west of the vehicle: 23 ft west of the axis
# in S65-43447 and 15 ft north in S65-10461 (estimated, to 6 ft); it is put 20 ft west and 22 ft north, within that, so
# that its two upper booms pass north of the white room's wall as built.
UT = (-22.0, -20.0)
UT_SIDE = 14.0
UT_TOP = 102.0
BOOMS = (25.0, 43.0, 54.0, 71.0, 80.0, 90.0, 99.0)

# The rest of the complex, in this frame, measured off Esri World Imagery (2020s) with the stand's long axis taken
# from OpenStreetMap way 195727094 and checked against the handbook's distances (../lc-19.md, "The layout").
BLOCKHOUSE = (-33.0, -723.0)  # the dome's middle: 724 ft west (OSM way 378204625). "600 feet west"; the cableway "200 yards" (the handbook)
CABLEWAY_AT = 50.0  # where the cableway meets the stand's west wall
FLUME = 553.0  # the flume's length from the stand (the handbook, p. 7-2: documented)
BASIN = (-790.0, DECK_NORTH - FLUME, -35.0, 45.0)  # the skimming basin: x from, to; y from, to (its far end and its width off imagery)
FUEL_AREA = (-270.0, 378.0)  # the fuel holding area: 464 ft north-east ("440 feet northeast of the stand")
OXIDIZER_AREA = (242.0, 212.0)  # the oxidizer holding area: 322 ft south-east ("330 feet ... southeast")
DECONTAMINATION = (201.0, -501.0)  # the personnel decontamination building: 540 ft south-west ("545 feet southwest")
INSTRUMENT_TOWER = (97.0, -32.0)  # a small lattice tower with a platform, west of the deck (S65-21881: estimated)


def ring_rail(mb, pts, height: float = 3.5) -> None:
    """A handrail right round a closed outline of deck-level points: the last side shares the first's post."""
    handrail(mb, pts, height)
    a, b = pts[-1], pts[0]
    for h in (height, height / 2):
        beam(mb, (a[0], a[1], a[2] + h), (b[0], b[1], b[2] + h), 0.13)


def materials() -> dict:
    m = material
    return {
        "concrete": m("concrete", (0.46, 0.45, 0.42), 0.0, 0.9),
        "joint": m("concrete-joint", (0.07, 0.07, 0.065), 0.0, 1.0),
        "deckpaint": m("concrete-painted-grey", (0.5, 0.54, 0.57), 0.0, 0.8),  # the stand's top, painted blue-grey (S65-20994)
        "white": m("concrete-painted-white", (0.74, 0.73, 0.68), 0.0, 0.85),  # the stand's walls and the buildings (S65-49568)
        "red": m("paint-structure-red", (0.62, 0.115, 0.03), 0.0, 0.55),  # red oxide: the erector and the towers
        "grey": m("paint-structure-grey", (0.3, 0.32, 0.34), 0.1, 0.6),  # the launch deck's steel and the thrust mount
        "duct": m("steel-scorched-duct", (0.085, 0.075, 0.07), 0.8, 0.7, double_sided=True),  # the flame ducts: seen from inside and out
        "deck": m("galvanised-deck", (0.42, 0.43, 0.44), 0.9, 0.6),
        "reddeck": m("paint-structure-red-deck", (0.5, 0.1, 0.03), 0.0, 0.7),  # grating painted with the steel it lies on
        "galv": m("galvanised-steel", (0.5, 0.51, 0.52), 0.9, 0.45),
        "pipe": m("paint-pipe-aluminium", (0.6, 0.61, 0.6), 0.6, 0.45),
        "curtain": m("canvas-curtain", (0.78, 0.76, 0.69), 0.0, 0.95, double_sided=True),
        "room": m("paint-room-white", (0.86, 0.86, 0.84), 0.0, 0.6),  # the white room's walls
        "roomfloor": m("paint-room-floor", (0.6, 0.62, 0.62), 0.0, 0.7),  # and its floors: pale, as its inside was (their colour is not read)
        "mesh": m("galvanised-mesh", (0.42, 0.43, 0.42), 0.8, 0.6, double_sided=True),
        "cable": m("cable", (0.03, 0.03, 0.03), 0.0, 0.7),
        "black": m("paint-launcher-black", (0.04, 0.04, 0.042), 0.2, 0.7),
        "yellow": m("paint-line-yellow", (0.75, 0.52, 0.04), 0.0, 0.6),
        "plate": m(
            "paint-line-oxide", (0.42, 0.16, 0.1), 0.0, 0.7
        ),  # the deck's hatch plates, red-brown (S65-20994): laid flat, so named as paint is (viewer/laid.ts)
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),  # the viewer makes this transparent
        "void": m("window-void", (0.02, 0.022, 0.025), 0.0, 0.6),
        "frame": m("steel-window-frame", (0.07, 0.075, 0.075), 0.6, 0.55),
        "blast": m("steel-blast-door", (0.17, 0.11, 0.085), 0.6, 0.6),
        "chrome": m("chrome", (0.75, 0.76, 0.78), 1.0, 0.18),
        "sign": m("paint-sign-white", (0.82, 0.82, 0.8), 0.0, 0.5),
        "lamp": m("lamp", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.6),
        "lamp-room": m("lamp-room", (0.95, 0.93, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.8), emission_strength=0.8),
        "lamp-red": m("lamp-red", (0.7, 0.05, 0.03), 0.0, 0.3, emission=(1.0, 0.1, 0.05), emission_strength=0.8),
        # the land's own: what the ramp and the blockhouse are heaped from, and what is laid on it
        "earth": m("earth-grassed", (0.2, 0.25, 0.1), 0.0, 1.0, double_sided=True),  # heaped fill, seen from any side
        "sand": m("earth-sand", (0.55, 0.5, 0.38), 0.0, 1.0),
        "shell": m("shell-gravel", (0.47, 0.42, 0.32), 0.0, 1.0),
        "asphalt": m("road-asphalt", (0.1, 0.1, 0.105), 0.0, 0.95),
        "water": m("water-still", (0.05, 0.1, 0.11), 0.0, 0.08),
        "block": m("concrete-block-painted", (0.6, 0.59, 0.54), 0.0, 0.9),
        "tar": m("roof-tar", (0.035, 0.035, 0.035), 0.0, 0.95),
        "corrugated": m("galvanised-corrugated", (0.5, 0.51, 0.5), 0.8, 0.5),
        "tank": m("paint-tank-white", (0.8, 0.8, 0.77), 0.1, 0.45),
        "tyre": m("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
        "timber": m("timber-pole", (0.13, 0.085, 0.05), 0.0, 0.9),
        "picket": m("paint-fence-white", (0.84, 0.84, 0.8), 0.0, 0.6),
        "wind": m("canvas-windsock", (0.85, 0.45, 0.04), 0.0, 0.9, double_sided=True),
    }
