"""The Gemini spacecraft: McDonnell's two-man ship, re-entry module and adapter.

Shared by the flights that flew it; a flight's model/vehicle.py imports this module, says what its own ship had
(`Fit`), and calls build(). Dimensions are inches and stations are McDonnell's Z stations, which run from the
adapter's base (Z13.44, where it is bolted to the launch vehicle) toward the nose (Z239.28, the tip of the nose
fairing). The model's origin is Z103.44, the line the re-entry module and the adapter meet on: the heat shield's
rim. +Z is toward the nose.

Round the ship the drawings have a top (TY: the side the two hatches are on), a bottom (BY), and the crew's left
and right (LX, RX). The model's +X is TY and its +Y is RX, so an angle here is measured from the top toward the
crew's right: the command pilot's hatch, on the left, is at negative angles.

See ./gemini-spacecraft.md for what each number rests on: which are SEDR 300's, and which are read off the
photographs of spacecraft 3.

Top-level nodes: NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation
                 HeatShield  RetroSection  EquipmentSection
and, on a ship that carried them (`Fit`): ExtravehicularEquipment (spacecraft 4), RadarEvaluationPod (spacecraft 5).

In the equipment section a place is given by the module it belongs to (L, Lm): the section's modules stand against the
wall round a clear middle, and their beams are turned from the ship's own sides (MODULES_TURN).
"""

from __future__ import annotations

import math
from collections.abc import Callable
from dataclasses import dataclass

import bmesh
import bpy
from mathutils import Matrix, Vector

import srlib
from gemini_shell import (
    ADAPTER,
    BASE_R,
    CABIN,
    CABIN_A,
    CELL,
    HATCH_OUT,
    LENGTH,
    NECK,
    NECK_R,
    NOSE,
    RCS_AT,
    RCS_ROWS,
    RCS_SPLAY,
    RINGS,
    SHIELD_R,
    SHIELD_SPHERE,
    WALL,
    WINDOW_AFT,
    WINDOW_L,
    WINDOWS,
    Z0,
    Z_BASE,
    Z_DIVISION,
    Z_HATCH_AFT,
    Z_HATCH_FWD,
    Z_MATING_TOP,
    Z_NOSE,
    Z_RCS,
    Z_RR,
    Z_RR_TAPER,
    Z_RR_TOP,
    Z_SHIELD_APEX,
    band,
    chamber,
    depth,
    hatch_in,
    hatch_margin,
    holes,
    pierce,
    radial,
    sheet,
    shingle,
    skin,
    tidy,
    zz,
)
from mercury_capsule import chamfered, pivot
from srlib import IN, TAU, MeshBuilder, Surf, deg, frame, group, interior, lettering, material, prof

# What the ship's stations and surfaces are, and what its skins are made of, is in gemini_shell.py.

RETRO = (6.5, 19.5, 84.0)  # a retrograde rocket: its case's radius, how far its axis is from the ship's, its middle's station

# The orbit attitude and maneuver system's sixteen chambers, by SEDR 300's Figure 8-72 and its table. Which way each
# fires is documented; these places are read off the figure, which is a sketch in perspective: estimated.
OAMS_ATTITUDE = (deg(36), deg(54))  # a cluster's two chambers at the adapter's foot, round from the top or the bottom
OAMS_ATTITUDE_Z = 27.0  # their station
OAMS_AFT = (0.0, math.pi)  # 9 and 10, which push the ship forward: at the foot, top and bottom
# and where those two stand: how far from the ship's axis, the station of their exits, an exit's radius. NASA S65-63221
# (spacecraft 7 from behind) shows them standing through the gold cover at 0.86 to 0.92 of its rim's radius, their
# exits about 5 in across, a little forward of the rim: estimated from it
OAMS_AFT_AT = (52.5, Z_BASE + 3.4, 2.7)
OAMS_FORWARD = (deg(78), 95.5)  # 11 and 12, which slow it: round from the top on either side, and their station
OAMS_LATERAL = 86.0  # 13 to 16: the station they push through

# How the equipment section is laid out. McDonnell's own drawing of it is the Technical Summary's Figure 4 (p. 12),
# "Adapter equipment module structure", which names the ship's four sides on it: a blast shield at Z66.74 made of the
# modules' own support panels and an access door; two beams across the section; the OAMS module the segment beyond one
# beam, the fuel cell (or battery) module the segment beyond the other; between the beams the electronic module, the
# door and the environmental control system's module; and the coolant pump module a frame against the wall from Z28.61
# to Z41.17. Those are documented. The figure is a perspective sketch, so what is measured on it is estimated:
Z_BLAST = 66.74  # the blast shield's plane: documented (Technical Summary, Figures 3 and 4)
SHIELD_THICK = 0.9  # the shield's panels, honeycomb between two faces: a guess
# the beams do not run square to the ship's top and bottom. In Figure 4 the OAMS module's middle is 23 degrees round
# from the top toward the crew's right; in SEDR 300's Figure 8-72, which looks at the same module from the other end,
# the row of tanks is turned 25 degrees the same way: estimated
MODULES_TURN = deg(23)
BEAM_AT = 15.0  # each beam's middle from the ship's axis: Figure 4 scales to 14 in and 20 in, and four tanks must go beyond one
DOOR_HALF = 17.0  # half the access door's length along the beams: a third of the band between them, as Figure 4 draws it
BEAM_FOOT = Z_BLAST - SHIELD_THICK - 0.15 - 3.6  # the under side of a beam, which is 3.6 in deep (a guess)
T_OAMS = MODULES_TURN  # which way each module faces, round from the top: the OAMS module's wall,
T_POWER = MODULES_TURN + math.pi  # the fuel cell or battery module's, opposite it,
T_ELECTRONIC = MODULES_TURN + math.pi / 2  # the electronic module's, at one end of the band between the beams,
T_ECS = MODULES_TURN - math.pi / 2  # and the environmental control system's, at the other
PUMP_MODULE = (28.61, 41.17)  # the coolant pump module's stations: documented (Figure 4)
PUMP_MODULE_AT = (deg(-61), 33.0, 49.0, 26.0)  # where it is round from the top, its inner and outer faces from the axis, its width
PRIMARY_OXYGEN = (31.0, 55.5, 9.0)  # the primary oxygen: from the axis, its middle's station, its radius. All estimated
# the electronic module's boxes, each (from the axis, along, the middle's station) and (deep, wide, tall): all guesses
ELECTRONICS = (
    ((24.0, -6.2, 58.0), (10.0, 11.0, 12.0)),
    ((24.0, 6.2, 58.5), (10.0, 11.0, 11.0)),
    ((36.0, -6.2, 59.0), (10.0, 11.0, 10.0)),
    ((36.0, 6.2, 59.5), (10.0, 11.0, 9.0)),
    ((43.4, 0.0, 60.8), (3.6, 16.0, 7.0)),
)
# The temperature control cover across the foot, measured on NASA S65-63221 (spacecraft 7 from behind, 15 December
# 1965): an ellipse fitted to its rim gives the camera 41 degrees off the ship's axis, and the hoop the cloth is
# gathered to then lies 18 in forward of the rim (good to 3 in) and is 44 in across (good to 4 in). Estimated, and
# taken to be the same on every ship. Its rim is where the first model had it: just inside the mating ring
COVER_RIM = (BASE_R - 3.0, Z_BASE + 2.2)  # its rim: from the axis, and its station
COVER_HOOP = (22.0, 33.5)  # the hoop, and the flat disc inside it
PLEAT = 0.55  # how deep the cloth's gathers are at their deepest: by eye, from the same photograph
COVER_PORT = (5.3, 4.4)  # the opening in the disc's middle that an instrument looks out of: half its length and width (10.6 in in the photograph)
# the OAMS module's row of four places for a 21 in tank (SEDR 300 volume 1, Figure 6-10 sheet 5; Gemini V mission report,
# Figure 3.1-3): the row's distance from the axis, from one place to the next, and the tanks' station. Four 21.13 in
# balls in a straight row fit between a beam at 15 in and the wall only about here: estimated
OAMS_ROW = (24.5, 21.5, 50.0)
OAMS_HELIUM = (38.8, 43.0)  # a helium tank, between two of them and the wall: from the axis, and its station. Estimated

# What is read off NASA S65-21090 (the ship on the launch vehicle, 23 March 1965) through a fitted camera, but the lettering:
# estimated.
COVER = (2.0, 0.35)  # the white strip along the top: its width, and how proud it stands (the second a guess)
COVER_FOOT = (3.4, 6.0, 116.0)  # its aft end: how wide it is there, over what length it widens, and its station
COVER_TOP = 190.4  # the station of its forward end, on the re-entry control section
WHITE_DISC = (deg(-17.5), 165.3, 3.6)  # a white disc forward of the left hatch: round from the top, its station, across
SOCKET = 145.5  # the station of the socket for the outside handle, inboard of each window (and SEDR 300, Figure 2-8)
LETTERS = (137.5, 131.5, 118.0)  # the stations of UNITED, of STATES, and of the flag under them: read off the colour photograph of the liftoff
SCANNER_AT = deg(-84)  # the scanner fairing's middle, round from the top
SCANNER_Z = (166.5, 190.5)  # its ends
SCANNER_HALF = (4.3, 3.0)  # half the width of its face, aft and forward
SCANNER_PROUD = 3.4  # its face from the re-entry control section's skin
# The doors round the cabin below the hatches, by the angles of their edges from the top: the strip under a hatch's
# hinge, the two equipment bay doors, the main landing gear door (SEDR 300, Figure 2-7; Technical Summary, Figure 1;
# S64-04925 for the gear door's taper, which is a sector of about 31 degrees). All estimated.
DOORS = (deg(66), deg(112), deg(143))
# The three fairings over the retaining straps: "strap locations at Z103.44, looking forward" (Technical Summary, Figure
# 3, p. 10): one 13 degrees 8 minutes above the ship's left side, one the same above its right, and one 45 degrees
# round from the bottom toward the right. Documented. (S65-13395 shows one beside a hatch's aft outboard corner.)
STRAPS = (deg(135), deg(90 - 13 - 8 / 60), deg(-(90 - 13 - 8 / 60)))
NOZZLE_PLATE = (157.0, 5.2, 7.6)  # the fluid injection nozzles' plate on the right gear door: its station, width, length


# What spacecraft 4 and 5 carried that spacecraft 3 did not (flights/gt-4/spacecraft.md, flights/gt-5/spacecraft.md). The
# things are documented; these sizes and places are estimated, each from what its comment names.
HATCH_OPEN = deg(100)  # how far the pilot's hatch stood open in the extravehicular photographs (NASA S65-30427): by eye
# the rendezvous radar's four spiral antennas on the forward face (Gemini V mission report, Figure 3.1-4a): a cup's radius,
# how far it stands off the face, how far its axis is from the ship's. Scaled on the face in the figure, which is a sketch
RADAR_CUP = (3.1, 3.4, 4.3)
# the rendezvous evaluation pod (the same report, Figure 3.1-4b; SEDR 300 volume 2, Section VIII, pp. 8-291 to 8-299 and
# Figures 8-79 and 8-80). "The transponder, 10 by 10 by 20 inches, is the largest component", and the rest is fastened
# to it; its spiral antennas "extend outward approximately two inches from the case"; its dipole is "on the end of a
# two-foot long fixed boom": documented. It was "installed in the center of the equipment adapter section", its mount
# "on the blast shield access door" (Gemini VII mission report, 3.1.1.2): documented. The rest is estimated:
POD_BODY = (10.0, 10.0, 20.0)  # the transponder: along the ship, across the band between the beams, along the band
POD_AT = 50.0  # the station of the transponder's middle: what the mount and the charge's barrel leave under the door
POD_ANTENNA = (3.3, 2.0)  # a spiral antenna's radius (scaled from Figure 8-79), and how far its face stands off the case
POD_BOOM = 24.0  # the dipole's boom
POD_POSTS = (6.5, 11.0)  # the four posts that carry the cover: from the pod's middle across the band, and along it
# its cover, "an oval, plane structure" on those posts (p. 8-298), drawn in Figure 8-80 longer one way than the other: a
# circle of this radius over the pod, a smaller one over the dipole, that far along the boom, and the lines between
POD_COVER = (14.5, 4.5, 39.5)
POD_COVER_Z = 33.1  # its station: in the plane of the gold cover's disc, a little aft of it
# the reactant supply's two tanks, across their outsides. Derived inside: 22.25 lb of hydrogen and 180 lb of oxygen (SEDR 300
# volume 2, p. 5-33) at their liquids' densities, 4.42 and 71.2 lb/cu ft, make balls 25.5 and 20.3 in across; the 1.3 in of
# shell and insulation round each is a guess
RSS_TANKS = (28.0, 23.0)
FUEL_CELL = (6.25, 25.0)  # a fuel cell section: its radius and its length. Scaled on the hydrogen tank in the same report's Figure 3.1-5
# where the module's four things lie, each (from the ship's axis toward the module's wall, along the beam, station): a
# row beyond the beam, as Figure 3.1-5 and SEDR 300 volume 2's Figure 5-6 have them: the two sections at one end, then
# the hydrogen, then the oxygen. Which end the sections are at is read off those figures' insets: estimated
RSS_AT = ((33.5, 0.5, 50.0), (29.0, -26.0, 51.0))
FUEL_CELLS_AT = ((24.0, 33.5, 52.5), (24.0, 19.9, 52.5))
# the hand-held manoeuvring unit as stowed: 17 by 10 by 3 in folded (the Smithsonian's record of it, A19670211000), in the centre
# stowage box between the seats' heads (Gemini IV mission report, Table 3-III items 33 and 64, and Figure 3-15, which has no
# dimensions): toward the top, to the crew's right, station
EVA_AT = (30.0, 0.0, 112.0)
UMBILICAL = (25.0 * 12.0, 0.4, 4.6)  # the umbilical: its length (25 ft: the same report, 3.1.2.3.1), its radius and its coil's, both guesses

# What spacecraft 6 and 7 carried that spacecraft 5 did not (flights/gt-6a/spacecraft.md, flights/gt-7/spacecraft.md). "GVII"
# is the Gemini VII mission report, MSC-G-R-66-1. The things are documented; a size or a place is as its comment says.
# spacecraft 7's L-band transponder antenna on the forward face: "a single spiral antenna similar to equipment included in
# the rendezvous evaluation pod" (GVII, 3.1.2.4). Its radius and depth are the pod's antenna's, themselves scaled from a
# sketch; and how far it stands off the ship's axis, which is about half the face's radius in a photograph taken from
# spacecraft 6 (NASA S65-63113), where it is one pale disc to one side of the face. Which side is not made out: toward the bottom
TRANSPONDER = (3.3, 2.4, 7.0)
# its two acquisition lights, "at the base of the adapter" and "on opposite sides of the equipment adapter section" (GVII,
# 3.1.1.2 and 3.1.2.4): round from the top, and how far from the ship's axis. Which sides is not said, nor how they were
# mounted: they are put on the left and the right, a quarter of the way round from the two aft-firing thrusters, looking aft
# through the edge of the cover. Their form is the launch vehicle's flashing light's (titan_ii_glv.py), the same Agena light
ACQUISITION_LIGHTS = ((deg(90), deg(-90)), 52.5)
# its third drinking water tank, tank C, in the retrograde section: a ball across its outside, round from the top, from the
# ship's axis, its middle's station. Inside it is derived: 42 lb of water (GVII, 3.1.2.3) at 62.4 lb/cu ft is a ball 13.05 in
# across; the shell round it is a guess. SEDR 300 volume 1, Figure 6-10 sheet 5, draws it on a tray toward the top of the
# section; which side of the top is not read from it
WATER_C = (13.5, deg(24), 34.0, 88.5)
# the OAMS's reserve fuel tank, spacecraft 7's alone: "5.10 inches outside diameter, 30.7 inches in length" (SEDR 300 volume
# 1, Section VIII, p. 8-271: documented). It lies along the OAMS module's inboard side, under the beam: estimated from
# that section's Figure 8-72
RESERVE_TANK = (5.10, 30.7)
MYLAR = 0.3  # the fifty layers of aluminised mylar round spacecraft 7's hydrogen tank (GVII, 3.1.2.6.2): how thick is a guess
# an adapter battery, 400 ampere-hours: toward the wall, along the row, along the ship. Estimated
BATTERY = (12.0, 7.4, 10.0)
# spacecraft 6's adapter battery module (SEDR 300 volume 2, Figure 5-9): its three batteries in a row, and at the row's end
# the one drinking water tank this ship had, with the bottle of oxygen that pushed the water out (Figure 6-10 sheet 3).
# The tank is 1.8 times a battery's width in the figure: 13.5 in, which is also what a 42 lb tank comes to (WATER_C); the
# bottle's size is a guess. Each: across, and (from the ship's axis, along the beam, station)
BATTERY_WATER = (13.5, (26.0, -12.0, 53.0))
BATTERY_PRESSURANT = (3.2, (24.0, -22.0, 53.0))
# its OAMS tanks: two of fuel, two of oxidiser and two of helium, where spacecraft 5 and 7 had one of each (SEDR 300 volume
# 2, Section VIII, Figure 8-96 sheet 1: "one tank on S/C 5, two tanks on S/C 6": documented), each of the same size as the
# one. Figure 8-94 draws the four propellant tanks in the four places of the module's row (OAMS_ROW), the fuel tanks the
# middle two, as near as the figure can be read; the two of helium are put between them and the wall. Estimated
# and its three mooring latch receptacles, for the hooks of an Agena's docking cone: "equally spaced around the forward
# perimeter" of the rendezvous and recovery section, "the lower latch" the nose fairing's pivot (SEDR 300 volume 2, p. 13-5
# and Figure 13-2). Round from the top; and a fitting's width round the rim, its depth toward the axis and how far it stands
# forward of the rim: scaled on the rim in the figure and in a photograph of this ship taken from spacecraft 7 (NASA
# S65-64040), where the lowest shows as a notch: estimated
LATCHES = ((deg(180), deg(60), deg(-60)), (3.2, 1.5, 1.1))

# What spacecraft 8 and 9 carried that spacecraft 6 and 7 did not (flights/gt-8/spacecraft.md, flights/gt-9a/spacecraft.md).
# "GVIII" is the Gemini VIII mission report, MSC-G-R-66-4; "GIX" the Gemini IX-A mission report, MSC-G-R-66-6; "SEDR2" SEDR
# 300 volume 2. The things are documented; a size or a place is as its comment says.
# the docking system's index bar (SEDR2, pp. 13-5 and 13-20, Figures 13-2 and 13-8; Technical Summary, p. 241): a bar in a
# casing in the rendezvous and recovery section, at the top of the ship, run out by a cartridge once in orbit. "The
# extension cycle moves the indexing bar 13.82 in. from the retracted position to the fully extended position" (Technical
# Summary): documented. Its station is scaled from the plan view of the ship in GVIII's Figure 3.1-9, where the "docking
# bar" is on the top centreline 10.5 in aft of the section's forward end; the bar's radius, how much of it stays in the
# casing and the casing's radius are scaled from Figure 13-8: estimated
INDEX_BAR = (223.4, 13.82, 0.6, 3.2, 1.15)  # station, travel, the bar's radius, what stays in the casing, the casing's radius
# the rendezvous and docking light: "a 4000 candlepower rendezvous-docking light which is mounted externally on the
# retrograde section (centered above and just aft of the heads of the flight crew)" (Technical Summary, p. 327; its Figure
# 61 and SEDR2's Figure 13-1 draw it at the top of the adapter's forward end, looking forward): documented. Round from the
# top, its station, and its housing: long, wide, high. And the light added behind it for a man outside at night, "to the
# forward end of the adapter assembly and ... pointed aft to illuminate the adapter surface and handrail" (GVIII,
# 3.1.2.12.1), which Figure 3.1-9 draws on the top centreline there. Their stations and every size are guesses
DOCKING_LIGHT = (0.0, 100.0, (5.2, 3.4, 2.6))
EVA_LIGHT = (0.0, 94.0, (3.0, 2.2, 1.7))
# the two extendable handrails "behind the right hatch", "stowed flush on the surface of the adapter during launch" (GVIII,
# 3.1.2.12.1; SEDR2, p. 16-23 and Figure 16-9). "The painted metal handrails were 0.55 by 1.25 inches in cross section. The
# forward handrail was 21 inches long and was mounted on the retrograde section of the adapter. The aft handrail was 46
# inches long and was mounted on the adapter equipment section. There was a 9-inch gap between the two sections. Both
# handrails were flush with the spacecraft surface at launch, but were 1.5 inches above the spacecraft surface when
# deployed" (Summary of Gemini Extravehicular Activity, NASA SP-149, p. 5-6): documented. A rail: wide, deep, how far out
# it stands when extended. Where they are round the ship is scaled from the plan view in GVIII's Figure 3.1-9, which has
# them 6 in and 15 in to the right of the top centreline: they are put in one line, 12 degrees round, with the gap
# astride the joint between the two sections. Estimated
HANDRAIL = (1.25, 0.55, 1.5)
HANDRAILS = (deg(12), (21.0, 46.0), 9.0)  # round from the top; the forward and the aft rail's lengths; the gap between them
# the fuel cell module as spacecraft 8 and 9 had it (SEDR2, Figure 5-7, "RSS/Fuel Cell Module (S/C 8 & 9)"): a section,
# the oxygen tank, the other section, the hydrogen tank, in a row, where spacecraft 5 and 7 had the two sections together
# at one end. The order is the figure's: documented. Its tanks were the short missions': "22.25 lbs for long mission
# configurations and 5.80 lbs for short mission configurations" of hydrogen, and of oxygen "46.0 lbs on spacecraft 8 and
# 9" (SEDR2, p. 5-33): documented. Across their outsides, derived as RSS_TANKS is: 5.80 lb and 46.0 lb at 4.42 and 71.2
# lb/cu ft make balls 16.3 and 12.9 in across inside, and the 1.25 in of shell and insulation round each is a guess
RSS_TANKS_SHORT = (18.8, 15.4)
# where the four lie, each (from the ship's axis, along the beam, station): which end is which is read off the figure's
# inset as spacecraft 5's was, and the places are what the four and the wall leave each other. Estimated
FUEL_CELLS_ROW = ((24.0, 24.5, 52.5), (24.0, -4.5, 52.5))
RSS_ROW = ((30.0, -22.0, 50.0), (37.0, 10.0, 51.0))  # the hydrogen, at the row's end, and the oxygen, between the two sections
# a ship's two 42 lb water tanks from spacecraft 8 on (GVIII, 3.1.2.3.5 and Figure 3.1-2; SEDR2, Figure 6-10 sheet 6): tank
# B in the retrograde section on the tray spacecraft 7's third tank had (WATER_C), and tank A on the fuel cell module,
# between its two sections and inboard of the oxygen tank, as near as the SEDR's sketch can be read: estimated
WATER_A = (22.0, 10.0, 48.0)
# what rode on the outside of the retrograde section "behind the right hatch": spacecraft 8's nuclear emulsion package,
# experiment S-9, "8 1/2 x 6 x 3" in, "mounted in a cold well in the retro adapter behind the right hatch" (NASA release
# 66-52, p. 29), and spacecraft 9's micrometeorite collector, S-12, "11 inches long by 5.5 inches wide by 1.25 inches
# deep" (NASA release 66-97, p. 21), "mounted outside the spacecraft on the retrograde section of the adapter" (GIX,
# 8.7.2): documented. Each: long, wide, deep. Where on the section: round from the top, and the station of its middle.
# "Behind the right hatch" is all that is said: estimated, and taken to be one place for both
RETRO_PACKAGES = {"s-9": (8.5, 6.0, 3.0), "s-12": (11.0, 5.5, 1.25)}
RETRO_PACKAGE_AT = (deg(36), 93.5)
# the main parachute's container, on a ship of the rendezvous pattern: "22.25 inches in diameter and 21.32 inches long",
# "closed on the forward end" (SEDR2, p. 12-17): documented. The station of its aft end is a guess. (The earlier ships'
# pack is still the first model's guess at it, which is bigger: gemini-spacecraft.md)
CHUTE_CONTAINER = (22.25, 21.32, 195.0)
# what a man outside was to put on at the back of the adapter: spacecraft 8's Extravehicular Support Package, "26 inches
# high, 21 inches wide, and 17 inches deep" (NASA release 66-52, the Gemini 8 press kit, p. 42), and spacecraft 9's
# Astronaut Maneuvering Unit, 32 in high by 22 in wide by 19 in deep (NASA release 66-97, the Gemini 9 press kit, p. 22):
# documented. Each: high (along the wearer), wide, deep (along the ship)
BACKPACKS = {"esp": (26.0, 21.0, 17.0), "amu": (32.0, 22.0, 19.0)}
# where it hung. GIX's Figure 8.1-18, "AMU stowage in adapter assembly", has the pack on the ship's axis against a torque
# box that runs from the blast shield's door, Z66.74, aft to Z56.27, and turned "22.5 deg (REF)" from the ship's
# right-to-left line: documented, and it is the turn of the section's beams (MODULES_TURN, which was scaled off a sketch
# as 23). So the wearer lies along the band between the beams. SEDR2's Figure 16-2 puts the foot rest on the crew's left,
# which is the end of the band the primary oxygen is at (T_ECS). The same mount is assumed for spacecraft 8's pack
BACKPACK_HEAD = 56.27
TORQUE_BOX = (11.0, 15.0)  # the torque box: along the wearer, and across him. Scaled from the same figure: estimated
# the opening in the gold cover that the pack was reached through, and the thermal cover that closed it until the man
# was ready: the gold cover was "redesigned to accommodate the ESP, the handholds, and the foot supports" (GVIII,
# 3.1.2.12.1). NASA S-67-802 (SP-149, Figure 5.2-2) shows spacecraft 9's from behind with the cover gone: the cloth
# gathered to an oblong with round ends, the pack filling most of it. Half its length along the wearer, half its width,
# and its station: scaled from that photograph against the pack's size, and taken to be the same on spacecraft 8. Estimated
BACKPACK_OPENING = (20.0, 13.6, 33.5)
# the two hand bars and the foot rail in the adapter, folded against the gold cover as they were until the thermal cover
# was thrown off (GVIII, Figure 3.1-10; GIX, Figures 3.1-6 and 8.1-19; SEDR2, Figure 16-2 sheet 2). "The handbars were
# 1.38 in. in diameter" (SP-149, p. 5-6): documented. A hand bar's two arms' feet at the rim, either side of the line
# across the wearer (half the angle between them); where its bar lies, from the axis; half the bar's length. The foot
# rail the same, about the line toward his feet. Scaled from the sketches: estimated
HANDBAR_R = 0.69
HANDBAR = (deg(21), 19.0, 9.0)
FOOT_RAIL = (deg(13), 26.0, 8.5)


@dataclass
class Fit:
    """What one ship had that another had not: a flight's script fills this in, and its spacecraft.md says why."""

    late: int = 0  # spacecraft 10–12: ECS oxygen shared with the fuel cells, extra oxidizer sphere and flight-specific EVA hardware
    radar: bool = False  # the rendezvous radar in the rendezvous and recovery section's face
    lateral_thrusters: bool = True  # whether the four OAMS chambers that translate sideways, up and down were real ones
    adapter_batteries: int = 3  # silver-zinc batteries in the adapter's module (0: a fuel cell module instead)
    water_tanks: int = 1  # drinking water tanks in the adapter
    experiments: tuple[str, ...] = ()  # of: "sea-urchin", "blood", "reentry-communications"
    names: tuple[str, str] = ("", "")  # the command pilot and the pilot, for what their seats say
    crew: Callable | None = None  # builds the man in each seat (gemini_cabin.seat); without it the seats are empty
    white_disc: bool = True  # the white disc forward of the left hatch, which is in two photographs of spacecraft 3 and not identified
    # what the ships after spacecraft 3 had: each is off unless a flight asks for it, and spacecraft 3 asks for none
    gmt_clock: bool = False  # a G.m.t. clock on the command pilot's panel, where spacecraft 3 had a blank (from spacecraft 4)
    right_hatch_opens: bool = False  # the pilot's hatch a node of its own (HatchRight) with its origin on its hinge
    eva: bool = False  # the hand-held manoeuvring unit and the umbilical, stowed in the cabin (spacecraft 4)
    fuel_cells: bool = False  # the fuel cell module in the adapter: two sections, and their hydrogen and oxygen (spacecraft 5)
    water_spheres: int = 0  # drinking water tanks of the OAMS propellant tank's form in the adapter (spacecraft 5 had two)
    pod: bool = False  # the rendezvous evaluation pod under the blast shield's access door (spacecraft 5 only)
    # what spacecraft 6 and 7 had
    transponder: bool = False  # an L-band transponder's spiral antenna on the forward face, in the radar's place (spacecraft 7)
    acquisition_lights: bool = False  # two flashing lights at the adapter's foot, for another ship to find this one by (spacecraft 7)
    retro_water_tank: bool = False  # a third drinking water tank, in the retrograde section (spacecraft 7)
    oams_reserve_tank: bool = False  # the OAMS's reserve fuel tank (spacecraft 7 only)
    hydrogen_insulated: bool = False  # the fuel cells' hydrogen tank wrapped in aluminised mylar (spacecraft 7)
    battery_module: bool = False  # the adapter battery module as spacecraft 6 had it: one row, the one water tank at its end
    oams_tanks: int = 1  # how many of each of the OAMS's fuel, oxidiser and helium tanks (spacecraft 6 had two)
    mooring_latches: bool = False  # the three latch receptacles round the forward face's rim, for docking (spacecraft 6)
    range_indicator: bool = True  # the radar's range and range-rate indicator on the command pilot's panel (spacecraft 7 had none)
    get_clock: bool = False  # a digital clock of elapsed time on the centre panel, where the flight plan roller was (spacecraft 7)
    # what spacecraft 8 and 9 had
    index_bar: bool = False  # the docking system's index bar, stowed in its casing at the top of the forward section: the node RR_IndexBar
    docking_light: bool = False  # the rendezvous and docking light at the forward end of the retrograde section
    handrails: bool = False  # two extendable handrails behind the right hatch, stowed flush: the nodes Retro_Handrail, Equipment_Handrail
    eva_light: bool = False  # a light at the adapter's forward end, looking aft along the handrails
    fuel_cell_row: bool = False  # the fuel cell module's sections and tanks alternating in its row (spacecraft 8 and 9)
    module_water_tank: bool = False  # a 42 lb water tank, tank A, on the fuel cell module
    # what waits at the back of the adapter behind a thermal cover, with its hand bars and foot rail: "esp" (spacecraft 8) or "amu" (spacecraft 9)
    backpack: str = ""
    gold_inside: bool = False  # the adapter's inner surfaces gold where the earlier ships' were aluminium foil (from spacecraft 9)
    window_covers: bool = False  # a transparent cover over each hatch window for the climb, thrown off in orbit (spacecraft 9)
    retro_experiments: tuple[str, ...] = ()  # what rode on the outside of the retrograde section, behind the right hatch, of: "s-9", "s-12"


# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "NoseFairing_Shell",
    "RR_Shingles",
    "RR_Fasteners",
    "RR_Structure",
    "RCS_Shingles",
    "RCS_Fasteners",
    "RCS_CableCover",
    "RCS_Structure",
    "RCS_Liner",
    "Cabin_Shingles",
    "Cabin_Plain",
    "Cabin_HingePlates",
    "Cabin_CableCover",
    "Cabin_WhiteDisc",
    "Cabin_Fasteners",
    "Cabin_Structure",
    "Cabin_Lettering",
    "Cabin_Flag",
    "Cabin_StrapFairings",
    "Hatches_Skin",
    "Hatches_Fasteners",
    "Hatches_Structure",
    "CrewStation_PressureVessel",
    "HeatShield_Ablator",
    "HeatShield_Structure",
    "Retro_Skin",
    "Retro_Foil",
    "Retro_Rings",
    "Retro_SeparationBand",
    "Equipment_Skin",
    "Equipment_Foil",
    "Equipment_Rings",
    "Equipment_Cover",
    "Equipment_CoverWells",
    "Equipment_CoverHoop",
)
# and those only some ships have (`Fit`): a flight that asks for one adds its names to the list it marks (shells)
SHELLS_OF = {
    "right_hatch_opens": ("HatchRight_Skin", "HatchRight_Fasteners", "HatchRight_Structure"),
    "pod": ("Pod_Cover",),
    "backpack": ("Backpack_ThermalCover",),
}


def shells(fit: Fit) -> tuple[str, ...]:
    """The meshes of this ship that enclose something: SHELLS, less what it had not, and those of what it alone carried."""
    base = tuple(name for name in SHELLS if fit.white_disc or name != "Cabin_WhiteDisc")
    return base + tuple(name for key, names in SHELLS_OF.items() if getattr(fit, key) for name in names)


def materials() -> dict:
    m = material
    return {
        # Rene 41 shingles, black on the outside to radiate
        "shingle": m("shingle-rene41", (0.035, 0.038, 0.046), 0.85, 0.42),
        "beryllium": m("shingle-beryllium", (0.05, 0.052, 0.058), 0.8, 0.5),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "titanium": m("titanium", (0.46, 0.44, 0.42), 1.0, 0.5, double_sided=True),
        "liner": m("titanium-liner", (0.46, 0.44, 0.42), 1.0, 0.5),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "fairing": m("fibreglass-fairing", (0.80, 0.79, 0.74), 0.0, 0.6),
        "ablator": m("heatshield-ablator", (0.66, 0.62, 0.52), 0.0, 0.9),
        # the adapter: magnesium skin under a white ceramic paint, aluminium foil inside, a gold-coated cover across its foot
        "white": m("paint-adapter-white", (0.88, 0.88, 0.86), 0.0, 0.55),
        "foil": m("foil-aluminium", (0.74, 0.73, 0.69), 1.0, 0.36),
        "gold": m("insulation-gold", (0.62, 0.45, 0.16), 1.0, 0.38, double_sided=True),
        "honeycomb": m("fibreglass-shield", (0.58, 0.52, 0.36), 0.0, 0.8, double_sided=True),
        "magnesium": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),
        "void": m("window-void", (0.004, 0.004, 0.005), 0.0, 0.95),
        "paint_white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6, double_sided=True),
        "seat": m("aluminium-seat", (0.50, 0.51, 0.52), 0.9, 0.5, double_sided=True),
        "cushion": m("fabric-nylon", (0.80, 0.76, 0.66), 0.0, 0.9),
        "webbing": m("fabric-webbing", (0.42, 0.44, 0.38), 0.0, 0.9, double_sided=True),
        "panel": m("paint-cabin-grey", (0.30, 0.31, 0.32), 0.1, 0.6),
        "dial": m("instrument-face", (0.015, 0.015, 0.018), 0.0, 0.4),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "tank": m("titanium-tank", (0.50, 0.49, 0.47), 1.0, 0.35),
        "battery": m("battery-case", (0.62, 0.60, 0.50), 0.2, 0.6),
        "case": m("titanium-motor-case", (0.42, 0.41, 0.40), 1.0, 0.45),
        "yellow": m("paint-handle-yellow", (0.75, 0.56, 0.05), 0.0, 0.5),
        # the window's outer frame is gold-coloured in the colour photograph of the morning of the launch (S65-21090)
        "frame": m("window-frame-gold", (0.58, 0.42, 0.17), 1.0, 0.38),
        "well": m("window-well", (0.05, 0.05, 0.055), 0.2, 0.6),
        # and the fairing over the horizon scanners is the colour of bronze
        "bronze": m("fairing-bronze", (0.30, 0.15, 0.07), 0.85, 0.45),
        # and so are the plain plates under each hatch's hinge
        "plate": m("plate-bronze", (0.20, 0.10, 0.055), 0.8, 0.5),
        "cover": m("paint-cover-white", (0.86, 0.86, 0.83), 0.0, 0.6),
        # the pod's cover, silvered glass fibre, and the lenses of its flashing lights
        "silver": m("insulation-silver", (0.80, 0.80, 0.78), 1.0, 0.32, double_sided=True),
        "beacon": m("beacon-lens", (0.78, 0.80, 0.82), 0.0, 0.25),
    }


def reuse(mats: dict) -> dict:
    """Use the materials already in the file where the names match, so the GLB has one of each."""
    out = {}
    for key, mat in mats.items():
        first = bpy.data.materials.get(mat.name.split(".")[0])
        if first is not None and first is not mat:
            bpy.data.materials.remove(mat)
            mat = first
        out[key] = mat
    return out


def say(obj, label: str, about: str):
    """What a thing says of itself when pointed at (the viewer reads `label` and `about` off the mesh under the pointer)."""
    obj["label"], obj["about"] = label, about
    return obj


def retell(says: dict[str, tuple[str, str]]) -> None:
    """Give the named meshes a flight's own words: what each is called and what it says of itself when pointed at. The
    type's words are spacecraft 3's and Gemini-Titan 3's where they tell what happened; a later flight says its own
    (gemini_stack.build, once the spacecraft and the launch vehicle are both built). A mesh that is only built with the
    inside is passed over at a level of detail that has none."""
    for name, (label, about) in says.items():
        obj = bpy.data.objects.get(name)
        if obj is None:
            if interior():
                raise KeyError(f"retell: no such mesh: {name}")
            continue
        say(obj, label, about)


def P(right: float, top: float, station: float) -> Vector:
    """A point in the ship: inches to the crew's right of the middle, inches toward the top, and its Z station; metres out."""
    return Vector((top, right, zz(station))) * IN


def hoop(r0: float, r1: float, z0: float, z1: float) -> list[tuple[float, float]]:
    """A ring of rectangular section as a closed profile, faces outward: radii r0 to r1, heights z0 to z1."""
    return prof([(r0, z0), (r1, z0), (r1, z1), (r0, z1), (r0, z0)])


def sphere(mb: MeshBuilder, centre: Vector, r: float, segs: int = 32) -> None:
    """A ball: its middle and its radius in metres. (The first model of this ship gave the radius in metres to a
    profile that took inches, and every tank in it was a fortieth of its size.)"""
    n = 16 if srlib.DETAIL >= 1.0 else 8
    mb.lathe(
        [(r * math.cos(a), r * math.sin(a)) for a in (-math.pi / 2 + math.pi * i / n for i in range(n + 1))],
        segs,
        matrix=Matrix.Translation(centre),
    )


# ------------------------------------------------------------------ skins


def plates(panels: MeshBuilder, bolts: MeshBuilder, surf: Surf, z0: float, z1: float, t0: float, t1: float, count: int, lift: float = 0.0) -> None:
    """One ring of unbeaded shingles (the beryllium of the forward sections, the plain strips of the cabin)."""
    arc = (t1 - t0) / count
    gap = 0.05
    cols = max(2, round(8 * arc / deg(45)))
    for k in range(count):
        a0 = t0 + k * arc
        theta = lambda s, z, a0=a0: a0 + gap / surf.r(z) + (arc - 2 * gap / surf.r(z)) * s  # noqa: E731
        rows = max(2, round((z1 - z0) / 2.4))
        zs = [z0 + gap + (z1 - z0 - 2 * gap) * j / rows for j in range(rows + 1)]
        panels.grid(lambda s, z, theta=theta: surf.p(theta(s, z), z, lift), [i / cols for i in range(cols + 1)], zs)
        n = max(2, int((z1 - z0) / 2.6))
        for i in range(n):
            z = z0 + 0.8 + (z1 - z0 - 1.6) * i / (n - 1)
            for da in (-0.55, 0.55):
                bolts.disc(surf.p(a0 + da / surf.r(z), z, lift), surf.n(a0), 0.2 * IN, 0.07 * IN)
        across = max(2, round(arc * surf.r(z0) / 2.6))
        for z in (z0 + 0.5, z1 - 0.5):
            for i in range(1, across):
                t = theta(i / across, z)
                bolts.disc(surf.p(t, z, lift), surf.n(t), 0.2 * IN, 0.07 * IN)


# ------------------------------------------------------------------ the re-entry module


def build_nose_fairing(M) -> None:
    g = group("NoseFairing")
    mb = MeshBuilder()
    r0 = NOSE.r(zz(Z_RR_TOP))
    top = zz(Z_NOSE)
    mb.lathe(prof([(r0 + 0.25, zz(Z_RR_TOP) - 0.6), (r0 + 0.25, top - 1.6), (r0 - 0.5, top - 0.5), (r0 - 2.2, top), (0.0, top)]), 96)
    mb.build("NoseFairing_Shell", M["fairing"], g, sharp_angle=35)
    handle = MeshBuilder()  # the fitting in its middle that the ejector pushes on
    handle.lathe(prof([(2.2, top - 0.05), (2.2, top + 0.5), (0.0, top + 0.5)]), 20)
    handle.build("NoseFairing_Fitting", M["aluminium"], g, sharp_angle=35)


def build_rendezvous_recovery(M, fit: Fit) -> None:
    """The forward section: beryllium shingles over a titanium frame, the parachutes inside. It leaves with the drogue
    when the main parachute is to come out."""
    g = group("RendezvousRecovery")
    shingles, bolts, inner = MeshBuilder(), MeshBuilder(), MeshBuilder()
    z0, zt, z1 = zz(Z_RR), zz(Z_RR_TAPER), zz(Z_RR_TOP)
    plates(shingles, bolts, NECK, z0 + 0.4, zt, 0.0, TAU, 8)
    plates(shingles, bolts, NOSE, zt, z1 - 0.3, deg(22.5), TAU + deg(22.5), 8)
    r1 = NOSE.r(z1)
    inner.lathe(prof([(NECK_R - 0.8, z0), (NECK_R - 0.8, zt), (r1 - 0.8, z1)]), 64, flip=True)
    inner.lathe(hoop(NECK_R - 2.2, NECK_R - 0.05, z0, z0 + 0.4), 96)  # the ring it is bolted to the next section by
    inner.lathe(prof([(r1 - 0.05, z1 - 0.3), (r1 - 0.05, z1), (r1 - 2.0, z1)]), 96)
    shingles.build("RR_Shingles", M["beryllium"], g, sharp_angle=30)
    bolts.build("RR_Fasteners", M["bolt"], g)
    inner.build("RR_Structure", M["titanium"], g, sharp_angle=30)
    # its forward face: the radar's place. A ship without the radar has a cover there (gemini-spacecraft.md)
    face = MeshBuilder()
    face.lathe(prof([(r1 - 2.0, z1 - 0.6), (0.0, z1 - 0.6)]), 64)
    if fit.radar:
        build_radar(M, g, z1 - 0.6)
    elif fit.transponder:
        build_transponder(M, g, z1 - 0.6)
    elif srlib.DETAIL >= 0.5:
        for i in range(-5, 6):  # stiffening ribs across the cover
            y = i * 2.4
            half = math.sqrt(max(0.0, (r1 - 2.6) ** 2 - y**2))
            face.box((2 * half * IN, 0.5 * IN, 0.35 * IN), Matrix.Translation(Vector((0.0, y, z1 - 0.42)) * IN))
    if fit.transponder and not fit.radar:
        label, about = (
            "Radar transponder",
            "The rendezvous radar's place, and on this ship the other half of one: a transponder, which hears another ship's "
            "radar call and answers it on its own frequency, so that the caller can tell the answer from an echo and time "
            "it. The box and its regulator are behind this face; the antenna stands on it.",
        )
    elif fit.radar:
        label, about = (
            "Rendezvous radar",
            "The rendezvous radar's place: the face its four antennas stand on. The radar is an interferometer: it calls a "
            "transponder on the target, and from the answer's time and the difference in its phase at three receiving antennas "
            "it has the target's range and bearing.",
        )
    else:
        label, about = (
            "Forward face",
            "Where a ship going to meet another carries its rendezvous radar. This one was going nowhere near anything, and carried "
            "none: the section held only the parachutes. A photograph of this spacecraft eleven weeks before it flew shows the face "
            "closed by a flat ribbed cover. What, if anything, stood behind it in the radar's place has not been found.",
        )
    say(face.build("RR_Face", M["equipment"] if fit.radar or fit.transponder else M["fairing"], g, sharp_angle=35), label, about)
    if fit.mooring_latches:
        angles, (wide, deep, proud) = LATCHES
        latch = MeshBuilder()
        for a in angles:  # each a block on the rim with a catch standing over its inboard edge, for a hook to drop behind
            at = Matrix.Translation((radial(a) * (r1 - 1.1 - deep / 2) + Vector((0.0, 0.0, z1))) * IN) @ Matrix.Rotation(a, 4, "Z")
            chamfered(latch, (deep, wide, 2 * proud), at, 0.1)
            chamfered(latch, (0.5, wide - 0.6, 0.5), at @ Matrix.Translation(Vector((-deep / 2 + 0.1, 0.0, proud + 0.15)) * IN), 0.08)
        say(
            latch.build("RR_MooringLatches", M["steel"], g, sharp_angle=35),
            "Mooring latch receptacle",
            "One of three fittings round the rim of the forward face, a third of a turn apart, for the hooks of an Agena's "
            "docking cone to drop behind: with all three caught, the cone is drawn in and the two are one vehicle. The nose "
            "fairing covers them on the way up, and swings away on the lowest one. Before the ship comes home they are "
            "thrown off and covers slide over the holes they leave. That a ship of this pattern had three, equally spaced, "
            "is McDonnell's manual; their size here is estimated.",
        )
    if fit.index_bar:
        build_index_bar(M, g, fit.late == 12)
    if not interior():
        return
    chute = MeshBuilder()
    if fit.index_bar:  # (the container as McDonnell's manual for these ships gives it, which leaves the bar's casing room forward of it)
        across, long, foot = CHUTE_CONTAINER
        chute.lathe(
            prof(
                [
                    (0.0, zz(foot)),
                    (across / 2, zz(foot)),
                    (across / 2, zz(foot) + long - 0.8),
                    (across / 2 - 0.8, zz(foot) + long),
                    (0.0, zz(foot) + long),
                ]
            ),
            40,
        )
    else:
        chute.lathe(prof([(0.0, z0 + 3.0), (13.5, z0 + 3.0), (13.5, zt + 14.0), (11.0, z1 - 6.0), (0.0, z1 - 6.0)]), 40)
    say(
        chute.build("RR_MainParachute", M["cushion"], g, sharp_angle=30),
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in this section. The ship hangs from it by its nose at first, then is let "
        "down to hang level by two points so that it meets the sea on the edge of its heat shield. When Grissom threw that "
        "switch the ship dropped into the new attitude hard enough to throw both men into their windows: his faceplate broke. "
        "The pack's form here is estimated.",
    )
    mortar = MeshBuilder()
    side = radial(deg(180)) * 9.0
    mortar.tube((side + Vector((0, 0, z1 - 8.0))) * IN, (side + Vector((0, 0, z1 - 0.9))) * IN, 3.2 * IN, 16)
    mortar.tube((-side + Vector((0, 0, z1 - 7.0))) * IN, (-side + Vector((0, 0, z1 - 0.9))) * IN, 4.6 * IN, 16)
    say(
        mortar.build("RR_DrogueMortar", M["aluminium"], g, sharp_angle=35),
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out at 50,000 ft to steady the ship; at 10,600 ft the drogue pulls out a pilot "
        "parachute, and the pilot parachute pulls this whole section off the ship and the main parachute out of it. "
        "This ship's mortar had a steel breech; the next had an aluminium one. Their forms and places here are estimated.",
    )


def build_radar(M, g, face: float) -> None:
    """The rendezvous radar's four dual-spiral antennas on the forward face (Gemini V mission report, 3.1.2.4.2 and
    Figure 3.1-4a): one that transmits and three that receive. The reference antenna is the corner the other two receiving
    ones are measured from: the azimuth antenna beside it across the ship, the elevation antenna beside it toward the
    ship's top. `face` is the forward face's height, inches."""
    r, proud, off = RADAR_CUP
    cups, lids = MeshBuilder(), MeshBuilder()
    for top, right in ((-1, -1), (-1, 1), (1, -1), (1, 1)):  # reference, azimuth, elevation, transmitting
        m = Matrix.Translation(Vector((top * off, right * off, face)) * IN)
        cups.lathe(prof([(r, 0.0), (r, proud - 0.25), (r - 0.25, proud)]), 28, matrix=m)
        lids.lathe(prof([(r - 0.25, proud), (0.0, proud)]), 28, matrix=m)
        cups.lathe(hoop(r, r + 0.5, 0.0, 0.3), 28, matrix=m)  # the flange it is bolted down by
    say(
        cups.build("RR_RadarAntennas", M["aluminium"], g, sharp_angle=35),
        "Rendezvous radar antennas",
        "Four dual-spiral antennas on the ship's forward face. One transmits. The other three listen for the answer of a "
        "transponder on the target: the reference antenna, and beside it one for azimuth and one for elevation, each of which "
        "turns until the answer reaches it in step with the reference. How far each has turned is the target's bearing; how "
        "long the answer took is its range. The four antennas and what each does are documented; their size and where each "
        "stands on the face are scaled from McDonnell's sketch.",
    )
    lids.build("RR_RadarAntennaFaces", M["fairing"], g, sharp_angle=35)


def build_index_bar(M, g, capped: bool = False) -> None:
    """The docking system's index bar (SEDR 300 volume 2, pp. 13-5 and 13-20, Figures 13-2 and 13-8; Technical Summary,
    p. 241): a bar in a casing across the forward section, at the top of the ship. A cartridge runs it out 13.82 in once
    the ship is in orbit, and it is what a docking is steered by: it goes into the V-shaped notch in the target's cone and
    turns the ship as it enters. It is built as it left the pad, drawn in, its end at the skin, and is a node of its own
    (RR_IndexBar, its origin on the skin where it comes out) for a flight to run out."""
    station, travel, r, held, casing = INDEX_BAR
    z = zz(station)
    skin_r = NOSE.r(z)
    tip = skin_r + 0.45  # its end stands a little proud of the skin, in a collar
    foot = tip - travel - held
    up = Vector((1.0, 0.0, 0.0))  # (the ship's top)
    at = lambda x: (up * x + Vector((0.0, 0.0, z))) * IN  # noqa: E731
    bar = MeshBuilder()
    bar.tube(at(foot), at(tip), r * IN, 16)
    bar.lathe(prof([(r, tip - 0.5), (r + 0.12, tip - 0.4), (r + 0.12, tip - 0.1), (r, tip)]), 16, matrix=frame((0.0, 0.0, z * IN), up))
    obj = say(
        bar.build("RR_IndexBarRod", M["steel"], None, sharp_angle=35),
        "Index bar",
        "A steel bar that stands out of the top of the ship's nose once it is in orbit: a cartridge drives it 13.82 in up "
        "out of its casing, and it locks there. Coming in to dock, the pilot lines it up with a V-shaped notch in the "
        "rim of the target's cone; the notch takes it, and turns the ship the last few degrees so that the three latches "
        "meet their hooks. Before the ship comes home another cartridge throws it away. It is drawn here as it left "
        "the pad, drawn in. How far it runs out is documented; how thick it is and its exact place are scaled from "
        "McDonnell's drawings.",
    )
    moving = [obj]
    if capped:
        cap = MeshBuilder()
        cap.lathe(prof([(0, tip + 0.06), (1.8, tip + 0.06), (1.5, tip + 0.34), (0, tip + 0.34)]), 24, matrix=frame((0, 0, z * IN), up))
        moving.append(
            say(
                cap.build("RR_IndexBarCap", M["steel"], None),
                "Tether retaining cap",
                "The lip kept the target tether on the bar. Its profile follows Gemini XII figure 3.1-2; its diameter is estimated.",
            )
        )
    pivot("RR_IndexBar", g, at(skin_r), moving)
    fit_ = MeshBuilder()
    fit_.lathe(hoop(r + 0.2, r + 0.75, skin_r - 0.3, skin_r + 0.3), 16, matrix=frame((0.0, 0.0, z * IN), up))  # the collar it comes out through
    if interior():
        # its casing, the manifold at the casing's head with the two breeches the cartridges are in, and a bracket to the frame
        fit_.lathe(
            prof([(0.0, foot - 1.4), (casing, foot - 1.4), (casing, skin_r - 2.6), (r + 0.3, skin_r - 2.6)]), 16, matrix=frame((0.0, 0.0, z * IN), up)
        )
        head = skin_r - 3.6
        for side in (-1, 1):
            chamfered(fit_, (1.8, 2.6, 1.6), Matrix.Translation((up * head + Vector((0.0, side * (casing + 1.2), z))) * IN), 0.2)
            fit_.tube(
                at(head) + Vector((0.0, side * (casing + 2.5), 0.0)) * IN, at(head) + Vector((0.0, side * (casing + 3.9), 0.0)) * IN, 0.55 * IN, 10
            )
        chamfered(fit_, (1.2, 5.0, 2.6), Matrix.Translation((up * (foot + 5.0) + Vector((0.0, 0.0, z - casing - 1.0))) * IN), 0.15)
    say(
        fit_.build("RR_IndexBarCasing", M["aluminium"], g, sharp_angle=35),
        "Index bar casing",
        "The cylinder the index bar is driven out of, lying across the section with a manifold at its head: one breech for "
        "the cartridge that runs the bar out, one for the two that throw it away. Its form is McDonnell's drawing of the "
        "assembly; its sizes are scaled from it.",
    )


def build_transponder(M, g, face: float) -> None:
    """Spacecraft 7's L-band transponder antenna on the forward face (Gemini VII mission report, 3.1.2.4): one spiral
    antenna of the pod's pattern, where spacecraft 5 and 6 had the radar's four. `face` is the forward face's height, inches."""
    r, thick, off = TRANSPONDER
    m = Matrix.Translation(Vector((-off, 0.0, face)) * IN)
    cup, lid = MeshBuilder(), MeshBuilder()
    cup.lathe(prof([(r, 0.0), (r, thick - 0.25), (r - 0.25, thick)]), 28, matrix=m)
    cup.lathe(hoop(r, r + 0.5, 0.0, 0.3), 28, matrix=m)  # the flange it is bolted down by
    lid.lathe(prof([(r - 0.25, thick), (0.0, thick)]), 28, matrix=m)
    say(
        cup.build("RR_TransponderAntenna", M["aluminium"], g, sharp_angle=35),
        "Transponder antenna",
        "One flat spiral antenna, of the pattern the last ship's pod carried and the Agena was to carry. Through it the "
        "transponder behind the face heard the other ship's radar and answered. That there was one, and whose pattern "
        "it was, are documented; its size is the pod's antenna's, scaled from a sketch. A photograph taken from the "
        "other ship shows it as one pale disc to one side of the face; which side is not made out.",
    )
    lid.build("RR_TransponderAntennaFace", M["fairing"], g, sharp_angle=35)


def cable_cover(mb: MeshBuilder, surf: Surf, s0: float, s1: float, foot: bool = False) -> None:
    """The cover over the parachute's control cables: a strip along the top of the ship, from station s0 to s1. With
    `foot` it widens at its aft end, as the photograph has it."""
    wide, proud = COVER
    n = max(2, round((s1 - s0) / 3.0))
    rows = []
    for i in range(n + 1):
        s = s0 + (s1 - s0) * i / n
        hw = wide / 2
        if foot and s - s0 < COVER_FOOT[1]:
            hw += (COVER_FOOT[0] - wide) / 2 * 0.5 * (1.0 + math.cos(math.pi * (s - s0) / COVER_FOOT[1]))
        r = surf.r(zz(s))
        rows.append([surf.p(y / r, zz(s), o) for y, o in ((-hw, -0.15), (-hw, proud), (hw, proud), (hw, -0.15))])
    mb.grid(lambda i, j: rows[j][i], range(4), range(n + 1))
    mb.add([tuple(p) for p in rows[0]], [(3, 2, 1, 0)])
    mb.add([tuple(p) for p in rows[-1]], [(0, 1, 2, 3)])


def build_reentry_control(M) -> None:
    """The short cylinder between the cabin and the forward section: sixteen thrust chambers of 25 lbf in two rings of
    eight, and their tanks. It steers the ship from retrofire to the parachute."""
    g = group("ReentryControl")
    shingles, bolts, inner, noz, cup, cover = (MeshBuilder() for _ in range(6))
    z0, z1 = zz(Z_RCS), zz(Z_RR)
    plates(shingles, bolts, NECK, z0, z1, 0.0, TAU, 8)
    liner = MeshBuilder()  # its inner cylinder: seen from inside only, so the chambers' ports are not shut by it
    liner.lathe(prof([(NECK_R - 0.8, z0), (NECK_R - 0.8, z1)]), 64, flip=True)
    liner.build("RCS_Liner", M["liner"], g, sharp_angle=None)
    inner.lathe(prof([(NECK_R - 0.8, z1 - 0.05), (0.0, z1 - 0.05)]), 64)  # its forward face, the main parachute's adapter on it
    skin_obj = shingles.build("RCS_Shingles", M["beryllium"], g, sharp_angle=30)
    bolts.build("RCS_Fasteners", M["bolt"], g)
    inner.build("RCS_Structure", M["titanium"], g, sharp_angle=30)
    bpy.context.view_layer.update()
    # The sixteen chambers: four clusters, on the diagonals. In each a chamber that pitches the ship and one that yaws
    # it stand side by side, and each is there twice, once for the A ring and once for the B ring, one behind the
    # other. A chamber fires along one of the ship's axes, not out along a radius (SEDR 300, Figure 8-84): so its port
    # is an oval and its bell is cut off at the skin.
    for top in (1, -1):
        for side in (1, -1):
            for k, a in enumerate(RCS_AT):
                theta = side * a if top > 0 else side * (math.pi - a)
                up, across = Vector((top, 0.0, 0.0)), Vector((0.0, side, 0.0))
                out = (up if k == 0 else across) * math.cos(RCS_SPLAY) + (across if k == 0 else up) * math.sin(RCS_SPLAY)
                for station in RCS_ROWS:
                    chamber(noz, cup, (skin_obj.name,), NECK, theta, zz(station), out, 1.25, 1.9, lip=0.32)
    tidy((skin_obj.name,), NECK)
    say(
        noz.build("RCS_ThrustChambers", M["nozzle"], g, sharp_angle=35),
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. None of them points straight out. In each cluster one pair fires along the "
        "ship's top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll "
        "it. That is why the ports are ovals. Which chamber fires which way is SEDR 300's drawing; where the clusters "
        "stand is read off a photograph of this ship on the morning it flew, and how far each is turned from its axis "
        "is estimated.",
    )
    cup.build("RCS_Ports", M["titanium"], g, sharp_angle=35)
    cable_cover(cover, NECK, Z_RCS + 0.05, COVER_TOP)
    say(
        cover.build("RCS_CableCover", M["cover"], g, sharp_angle=35),
        "Parachute cable cover",
        "The white strip along the top of the ship. It is in the photograph taken on the morning of the launch, running "
        "from near the heat shield up over this section. SEDR 300 lists a cover over the parachute's control cables "
        "here, and that is what it is taken to be; its width is read off the photograph.",
    )
    if interior():
        tanks = MeshBuilder()
        # each ring's own: a ball of nitrogen 7.25 in across, a fuel tank 5.10 in across and 30.7 long and an oxidiser
        # tank 5.10 by 25.2 (SEDR 300, section VIII). The section is 18 in long, so the tanks cannot stand along it:
        # they are laid across, and how is estimated.
        for ring, x in ((0, 5.5), (1, -5.5)):
            up = Vector((x, 0.0, 0.0))
            for length, dz in ((30.7, 4.2), (25.2, 10.8)):
                half = length / 2
                c = up + Vector((0.0, 0.0, z0 + dz))
                tanks.tube((c - Vector((0.0, half, 0.0))) * IN, (c + Vector((0.0, half, 0.0))) * IN, 2.55 * IN, 16)
            sphere(tanks, (Vector((0.0, (1 - 2 * ring) * 9.0, z0 + 14.0))) * IN, 3.625 * IN)
        say(
            tanks.build("RCS_Tanks", M["tank"], g, sharp_angle=35),
            "Re-entry control tanks",
            "Each of the two rings has its own fuel tank, oxidiser tank and ball of nitrogen to push them: six vessels. The "
            "nitrogen balls are 7.25 in across, the fuel tanks 5.10 in across and 30.7 in long and the oxidiser tanks 5.10 by "
            "25.2, which is documented. The tanks are longer than the section, so they must lie across it; how they are "
            "arranged in it is estimated.",
        )


def build_heat_shield(M) -> None:
    g = group("HeatShield")
    cap = SHIELD_SPHERE - math.sqrt(SHIELD_SPHERE**2 - SHIELD_R**2)  # 7.21 in
    apex = zz(Z_SHIELD_APEX)
    centre = apex + SHIELD_SPHERE
    n = 16
    arc = [
        (SHIELD_SPHERE * math.sin(a), centre - SHIELD_SPHERE * math.cos(a))
        for a in (math.asin(SHIELD_R / SHIELD_SPHERE) * i / n for i in range(n + 1))
    ]
    mb = MeshBuilder()
    mb.lathe(prof([*arc, (SHIELD_R, apex + cap + 1.4)]), 144)
    mb.build("HeatShield_Ablator", M["ablator"], g, sharp_angle=40)
    back = MeshBuilder()
    back.lathe(prof([(SHIELD_R - 0.6, apex + cap + 1.4), *[(r * 0.985, z + 1.4) for r, z in arc[::-1]]]), 96)
    back.build("HeatShield_Structure", M["titanium"], g, sharp_angle=40)


def _mirror(side: int, fa, fb):
    """Two edges of something on the crew's right as functions of height, or their mirror images on the left."""
    return (fa, fb) if side > 0 else (lambda z: -fb(z), lambda z: -fa(z))


def build_hatches(M, fit: Fit) -> list[dict]:
    """The two hatches, each hinged along its outboard edge, each with a window at its forward end. Returns where each
    window is."""
    g = group("Hatches")
    # one set of meshes for the two hatches; or, on a ship whose pilot's hatch was opened in flight, a set for each, so
    # that the right one can be a node of its own on its hinge (HatchRight)
    both = tuple(MeshBuilder() for _ in range(8))
    sets = {-1: both, 1: tuple(MeshBuilder() for _ in range(8)) if fit.right_hatch_opens else both}
    panes: dict[int, list] = {-1: [], 1: []}
    z0, z1 = zz(Z_HATCH_AFT) + 0.06, zz(Z_HATCH_FWD) - 0.06
    whole = interior()
    fine = srlib.DETAIL >= 1.0
    cell = 0.45 if holes() else 0.9
    proud = 0.26 if holes() else 0.55  # how far the window's frame stands off its plate: more where the plate is coarse
    zone = zz(WINDOW_AFT) - 2.2  # where the plate the window is let into begins
    rings = [z0, zz(118.0), zz(129.0), zone, z1]
    windows = []
    inb = lambda z: hatch_in(z) + 0.06 / CABIN.r(z)  # noqa: E731
    outb = lambda z: HATCH_OUT - 0.06 / CABIN.r(z)  # noqa: E731
    for side, name in ((-1, "Left"), (1, "Right")):
        skin_, bolts, structure, frames, studs, hinges, wells, latches = sets[side]
        win = WINDOWS[side]
        low = "al" if side > 0 else "ah"
        for i in range(3):  # three rings of beaded cells aft of the window
            band(skin_, bolts, rings[i], rings[i + 1], *_mirror(side, hatch_margin, outb), 5, rivets=low)
            shingle(skin_, bolts, rings[i], rings[i + 1], *_mirror(side, inb, hatch_margin), rivets=low)
        # beside the window the plate along the inboard edge is plain: the socket for the outside handle is in it
        shingle(skin_, bolts, zone, z1, *_mirror(side, inb, hatch_margin), beads=False, rivets=low + "f")
        # the window's plate: smooth, let down round the opening and before it to the trough's floor
        sheet(skin_, *_mirror(side, hatch_margin, outb), zone, z1, 0.0, cell, lambda t, z, win=win: win.covers(t, z, 0.3))
        if holes():
            ta, tb = _mirror(side, hatch_margin, outb)
            n = max(4, round((tb(zone) - ta(zone)) * CABIN.r(zone) / 2.2))
            for i in range(n):  # the plate's aft edge, fastened
                t = ta(zone) + (tb(zone) - ta(zone)) * (i + 0.5) / n
                bolts.disc(skin(t, zone + 0.35, -0.02), CABIN.n(t), 0.19 * IN, 0.09 * IN)
        # the window: a bolted frame round the opening, lying on the pane's plane and over its aft edge onto the skin
        n = 72 if fine else 36
        rim_out, rim_mid, rim_in, rim = win.outline(n, 0.8), win.outline(n, 0.25), win.outline(n, -0.3), win.outline(n)
        m = len(rim)
        rows = [
            [win.lay(u, w, -0.12) for u, w in rim_out],
            [win.lay(u, w, proud) for u, w in rim_out],
            [win.lay(u, w, proud) for u, w in rim_mid],
            [win.lay(u, w, proud) for u, w in rim_in],
            [win.lay(u, w, -0.42) for u, w in rim_in],
        ]
        frames.grid(lambda i, j, rows=rows: rows[j][i], range(m), range(5), closed_u=True, flip=side < 0)
        for u, w in rim_mid[:: n // 24]:
            studs.disc(win.lay(u, w, 0.24), win.np, 0.13 * IN, 0.14 * IN)

        def fan(mb: MeshBuilder, lift: float, grow: float, out: bool, win=win) -> None:
            edge_ = win.outline(n, grow)
            cu, cw = sum(p[0] for p in edge_) / len(edge_), sum(p[1] for p in edge_) / len(edge_)
            pts = [tuple(win.at(cu, cw, lift) * IN)] + [tuple(win.at(u, w, lift) * IN) for u, w in edge_]
            k = len(edge_)
            ccw = (win.side > 0) == out
            mb.add(pts, [(0, 1 + i, 1 + (i + 1) % k) if ccw else (0, 1 + (i + 1) % k, 1 + i) for i in range(k)])

        pane = MeshBuilder()
        fan(pane, -0.3, 0.1, True)
        panes[side].append(pane.build(f"Hatch{name}_WindowOuter", M["glass" if whole else "void"], g, sharp_angle=None))
        windows.append({"side": side, "centre": win.at(-1.5, WINDOW_L / 2, -2.4) * IN, "normal": win.np.copy()})
        if fit.window_covers:
            # (spacecraft 9: the outer window of an earlier ship, in its frame, hooked on over this one for the climb: GIX, 3.1.1)
            hi = proud + 0.75
            edges = [(win.outline(n, 0.72), proud + 0.14), (win.outline(n, 0.72), hi), (win.outline(n, -0.2), hi), (win.outline(n, -0.2), hi - 0.3)]
            rows = [[win.at(u, w, lift) * IN for u, w in edge_] for edge_, lift in edges]
            frames.grid(lambda i, j, rows=rows: rows[j][i], range(m), range(4), closed_u=True, flip=side < 0)
            if whole:
                cover = MeshBuilder()
                fan(cover, hi - 0.22, -0.1, True)
                panes[side].append(cover.build(f"Hatch{name}_WindowCover", M["glass"], g, sharp_angle=None))
        # three hinges along the outboard edge, and the socket a handle goes into from outside
        th = side * HATCH_OUT
        for z in (z0 + 6.0, (z0 + z1) / 2, z1 - 6.0):
            hinges.tube(CABIN.p(th, z - 2.2, 0.35), CABIN.p(th, z + 2.2, 0.35), 0.6 * IN, 10)
        ts = side * (hatch_in(zz(SOCKET)) + 2.6 / CABIN.r(zz(SOCKET)))
        hinges.lathe(hoop(0.5, 1.05, -0.3, 0.24), 16, matrix=frame(skin(ts, zz(SOCKET)), CABIN.n(ts)))
        if not whole:
            continue
        # inside: the hatch's inner skin, let down under the trough; the well between the panes; the two inner panes
        # in their frame, which is bolted on from inside with 35 bolts (SEDR 300, Figure 2-10)
        sheet(
            structure,
            *_mirror(side, inb, outb),
            z0,
            z1,
            0.0,
            1.5,
            lambda t, z, win=win: win.covers(t, z, 1.5),
            flip=True,
            drop=lambda t, z: max(WALL, depth(t, z) + 0.9),
        )
        wall = [[win.at(u, w, lift) * IN for u, w in rim] for lift in (-0.42, -2.3)]
        wells.grid(lambda i, j, wall=wall: wall[j][i], range(m), range(2), closed_u=True, flip=side < 0)
        inner = MeshBuilder()
        fan(inner, -1.75, 0.1, True)
        fan(inner, -2.1, 0.1, True)
        panes[side].append(inner.build(f"Hatch{name}_WindowInner", M["glass"], g, sharp_angle=None))
        ring_in, ring_out = win.outline(n, -0.25), win.outline(n, 1.35)
        rows = [
            [win.at(u, w, -2.32) * IN for u, w in ring_in],
            [win.at(u, w, -2.32) * IN for u, w in ring_out],
            [win.at(u, w, -0.5) * IN for u, w in ring_out],
        ]
        structure.grid(lambda i, j, rows=rows: rows[j][i], range(m), range(3), closed_u=True, flip=side < 0)
        for u, w in win.outline(35, 0.55):
            studs.disc(win.at(u, w, -2.3) * IN, -win.np, 0.15 * IN, 0.1 * IN)
        # twelve latches on the sill (Figure 2-8: "typical 12 places"): the hatch is hinged outboard, so they are put
        # along its other three edges, and how many to an edge is estimated
        places = [(inb(z) + 1.6 / CABIN.r(z), z) for z in (z0 + 3.5 + (z1 - z0 - 12.0) * i / 6 for i in range(7))]
        places += [(deg(a), z0 + 1.6) for a in (20, 35, 50)] + [(deg(14.5), z1 - 1.6), (deg(58.5), z1 - 1.6)]
        for a, z in places:
            t = side * a
            down = max(WALL, depth(t, z) + 0.9)
            at = (radial(t) * (CABIN.r(z) - down - 0.55) + Vector((0.0, 0.0, z))) * IN
            f = frame(at, -radial(t))
            chamfered(latches, (1.3, 2.2, 1.1), f, 0.12)
            latches.tube(f @ (Vector((0.0, 0.0, 0.5)) * IN), f @ (Vector((0.0, 0.0, 1.5)) * IN), 0.3 * IN, 8)
    window_about = (
        "The window is not in the skin. Its outer pane is set at about 35 degrees to the hatch, its aft edge at the skin and "
        "its forward edge sunk, so that it faces forward like a windscreen; and forward of it a trough is cut into the "
        "cone for the pilot to look along. There are three panes of 96 per cent silica glass, one in this outer frame and "
        "two in a frame bolted on inside with 35 bolts; the right-hand window's are optically ground. The 35 degrees is "
        "SEDR 300's section as drawn; where the window is, its outline and the trough's are read off the photograph of "
        "this ship on the morning of the launch."
    )
    latches_about = (
        "Twelve latches hold each hatch down on its sill, all worked together by one handle inside; in an ejection "
        "pyrotechnic actuators throw them and push the hatch open. Their number is SEDR 300's; where each is, and "
        "its form, are estimated."
    )
    for side, prefix in ((-1, "Hatches"), (1, "HatchRight")):
        if sets[side] is both and side > 0:
            break  # (the two hatches are one set of meshes, built already)
        skin_, bolts, structure, frames, studs, hinges, wells, latches = sets[side]
        made = [
            skin_.build(f"{prefix}_Skin", M["shingle"], g, sharp_angle=None),
            bolts.build(f"{prefix}_Fasteners", M["bolt"], g),
            say(frames.build(f"{prefix}_WindowFrames", M["frame"], g, sharp_angle=35), "Window", window_about),
            studs.build(f"{prefix}_WindowBolts", M["bolt"], g),
            hinges.build(f"{prefix}_Hinges", M["steel"], g, sharp_angle=35),
        ]
        if whole:
            made += [
                structure.build(f"{prefix}_Structure", M["liner"], g, sharp_angle=30),
                wells.build(f"{prefix}_WindowWells", M["well"], g, sharp_angle=35),
                say(latches.build(f"{prefix}_Latches", M["steel"], g, sharp_angle=35), "Hatch latches", latches_about),
            ]
        if whole and side > 0 and fit.late == 12:
            import gemini_cabin

            made += gemini_cabin.stowed_handrail(M, g, say)
        if sets[side] is not both and side > 0:
            # the pilot's hatch on its own node, its origin on the hinge's line, half way along it: a flight swings it
            pivot("HatchRight", g, CABIN.p(HATCH_OUT, (z0 + z1) / 2, 0.35), made + panes[1])
    if whole:
        build_experiments_on_hatches(M, g, fit)
    return windows


# where an experiment rides on the inside of a hatch: round from the top, and the station of its aft end. Estimated: clear
# of a seated man's helmet, which is within an inch of the hatch from Z120 to Z134, and inboard of the window
EXPERIMENT_AT = (deg(20), 134.5)


def build_experiments_on_hatches(M, g, fit: Fit) -> None:
    """What rode on the inside of the hatches on a flight that carried it."""
    if "sea-urchin" in fit.experiments:
        mb = MeshBuilder()
        t = -EXPERIMENT_AT[0]
        a = CABIN.p(t, zz(EXPERIMENT_AT[1]), -WALL - 2.0)
        b = CABIN.p(t, zz(EXPERIMENT_AT[1] + 6.75 * math.cos(CABIN_A)), -WALL - 2.0)
        mb.tube(a, b, 1.625 * IN, 20)
        mb.tube(b, b + (b - a).normalized() * 1.4 * IN, 0.5 * IN, 10)  # the handle that is turned
        say(
            mb.build("Experiment_SeaUrchinEggs", M["aluminium"], g, sharp_angle=35),
            "Sea urchin egg experiment",
            "A metal cylinder 3 1/4 in across and 6 3/4 in long on the inside of the left hatch, holding eight chambers of sea "
            "urchin eggs, sperm and a fixative. Turning the handle at its end was to fertilise the eggs, and turning it again "
            "later to stop them, so that it could be seen whether cells divide differently without weight. Grissom turned it; "
            "the handle broke off in his hand. Its size and its hatch are the press kit's; where on the hatch is estimated: "
            "forward of his helmet and inboard of the window, where there is room for it and his hand comes to it.",
        )
    if "blood" in fit.experiments:
        mb = MeshBuilder()
        t, z = EXPERIMENT_AT[0], EXPERIMENT_AT[1] + 2.0
        chamfered(mb, (3.7, 3.8, 1.3), frame(CABIN.p(t, zz(z), -WALL - 1.1), -CABIN.n(t)), 0.1)
        mb.tube(CABIN.p(t, zz(z + 2.3), -WALL - 1.1), CABIN.p(t, zz(z + 3.5), -WALL - 1.1), 0.45 * IN, 10)
        for dz in (-1.2, 1.2):  # its two feet on the hatch
            mb.tube(CABIN.p(t, zz(z + dz), -WALL + 0.2), CABIN.p(t, zz(z + dz), -WALL - 0.6), 0.4 * IN, 8)
        say(
            mb.build("Experiment_BloodIrradiation", M["aluminium"], g, sharp_angle=35),
            "Blood irradiation experiment",
            "A sealed aluminium box 3.7 by 3.8 by 1.3 in on the inside of the right hatch, holding samples of human blood beside a "
            "source of phosphorus-32. Young twisted its handle to put the blood in the way of the radiation, and again to take it "
            "out; the same was done to a twin of it at the Cape. The blood that had been in orbit showed a little more damage. "
            "Its size and its hatch are the press kit's; where on the hatch is estimated: forward of his helmet and inboard "
            "of the window.",
        )


def build_cabin(M, fit: Fit, font, flag) -> None:
    """The cone round the crew: beaded Rene 41 shingles over a titanium frame, with the equipment bays between the two."""
    g = group("Cabin")
    panels, plain, bolts, under, cover, strips = (MeshBuilder() for _ in range(6))
    aft, fwd, neck = zz(Z_HATCH_AFT), zz(Z_HATCH_FWD), zz(RINGS[-1])
    rings = [zz(s) for s in RINGS]
    # the ring the heat shield is bolted to, plain
    sheet(plain, 0.0, TAU, 1.5, aft - 0.05, 0.0, 2.2)
    for i in range(128):
        t = TAU * (i + 0.5) / 128
        bolts.disc(CABIN.p(t, (1.5 + aft) / 2), CABIN.n(t), 0.2 * IN, 0.08 * IN)
    # the beam between the hatches: a plain strip under the cables' cover, and a column of short beads either side of
    # it (S65-13244), cut where the hatches' own rings are
    strip = lambda z: 1.3 / CABIN.r(z)  # noqa: E731
    beam = [aft + 0.06, zz(118.0), zz(129.0), zz(WINDOW_AFT) - 2.2, fwd]
    for za, zb in zip(beam, beam[1:]):
        shingle(plain, bolts, za, zb, lambda z: -strip(z), strip, beads=False, rivets="")
        shingle(panels, bolts, za, zb, strip, lambda z: hatch_in(z) - 0.06 / CABIN.r(z), rivets="a")
        shingle(panels, bolts, za, zb, lambda z: -hatch_in(z) + 0.06 / CABIN.r(z), lambda z: -strip(z), rivets="a")
    # under each hinge a strip of plain plates (S65-13395)
    for side in (1, -1):
        for za, zb in zip(beam, beam[1:]):
            shingle(strips, bolts, za, zb, *_mirror(side, lambda z: HATCH_OUT + 0.06 / CABIN.r(z), lambda z: DOORS[0]), beads=False, rivets="alh")
    # forward of the hatches, over the top: two rings, the troughs running out across them, their beads following
    for za, zb, access in ((fwd, rings[4], False), (rings[4], neck, True)):
        shingle(plain, bolts, za, zb, lambda z: -strip(z), strip, beads=False, rivets="")
        for side in (1, -1):
            edges = [strip, lambda z: deg(22), lambda z: deg(52), lambda z: DOORS[0]]
            for k in range(3):
                # (the plates either side of the cover on the last ring are plain: a white disc sits on the left one)
                into = plain if access and k == 0 else panels
                shingle(into, bolts, za, zb, *_mirror(side, edges[k], edges[k + 1]), beads=into is panels, rivets="al" if side > 0 else "ah")
    # the sides and the bottom: the doors over the equipment bays, the landing gear doors, the doors underneath
    # (SEDR 300, Figure 2-7; the Technical Summary's Figure 1), each a set of cells
    spans = [
        (DOORS[0], DOORS[1]),
        (DOORS[1], DOORS[2]),
        (DOORS[2], TAU - DOORS[2]),
        (TAU - DOORS[2], TAU - DOORS[1]),
        (TAU - DOORS[1], TAU - DOORS[0]),
    ]
    for i in range(5):
        za, zb = rings[i], rings[i + 1]
        r = CABIN.r((za + zb) / 2)
        if i == 4:  # the ring of "Z160.20 equipment access" shingles, all the way round below the top
            band(panels, bolts, za, zb, DOORS[0], TAU - DOORS[0], max(3, round((TAU - 2 * DOORS[0]) * r / CELL)), rivets="al")
            continue
        for t0, t1 in spans:
            band(panels, bolts, za, zb, t0, t1, max(1, round((t1 - t0) * r / CELL)), rivets="al")
    if interior():  # the frame under the shingles: seen only with the ship cut open
        under.lathe(prof([(CABIN.r(0.0) - 1.6, 0.0), (CABIN.r(aft) - 1.6, aft)]), 96, flip=True)
        under.lathe(prof([(CABIN.r(aft) - 1.6, aft), (CABIN.r(zz(Z_RCS)) - 1.6, zz(Z_RCS))]), 96, arc=(HATCH_OUT, TAU - HATCH_OUT), flip=True)
        sheet(under, -HATCH_OUT, HATCH_OUT, fwd, zz(Z_RCS), -1.6, 2.4, flip=True)
        sheet(under, lambda z: -hatch_in(z), hatch_in, aft, fwd, -1.6, 2.4, flip=True)
    under.lathe(hoop(SHIELD_R - 1.2, SHIELD_R + 0.25, 0.1, 1.5), 144)  # the ring the heat shield is bolted to
    under.lathe(hoop(NECK_R - 2.4, NECK_R + 0.2, zz(Z_RCS) - 0.4, zz(Z_RCS)), 96)
    panels.build("Cabin_Shingles", M["shingle"], g, sharp_angle=None)
    plain.build("Cabin_Plain", M["shingle"], g, sharp_angle=30)
    strips.build("Cabin_HingePlates", M["plate"], g, sharp_angle=30)
    bolts.build("Cabin_Fasteners", M["bolt"], g)
    under.build("Cabin_Structure", M["titanium"], g, sharp_angle=30)
    cable_cover(cover, CABIN, COVER_FOOT[2], Z_RCS - 0.05, foot=True)
    say(
        cover.build("Cabin_CableCover", M["cover"], g, sharp_angle=35),
        "Parachute cable cover",
        "The white strip along the top of the ship, between the hatches. It is in the photograph taken on the morning of "
        "the launch. SEDR 300 lists a cover over the parachute's control cables here, and that is what it is taken to be: "
        "the ship comes down hanging level from two points, and the lines to the forward one must run along the outside "
        "until they are pulled free. Its width and where it ends are read off the photograph.",
    )
    if fit.white_disc:
        disc = MeshBuilder()
        t, z = WHITE_DISC[0], zz(WHITE_DISC[1])
        disc.lathe(prof([(WHITE_DISC[2] / 2, -0.1), (WHITE_DISC[2] / 2, 0.14), (0.0, 0.14)]), 28, matrix=frame(CABIN.p(t, z), CABIN.n(t)))
        say(
            disc.build("Cabin_WhiteDisc", M["cover"], g, sharp_angle=35),
            "White disc",
            "A white disc a few inches across, on the top of the ship just left of the middle, forward of the left hatch. It is "
            "in two photographs of this spacecraft, in January and on the morning of the launch. What it is has not been found.",
        )
    # paint: UNITED STATES in two lines and the flag under it, on each side below the hatch's hinge
    paint, flags = MeshBuilder(), MeshBuilder()
    fw, fh = 15.0, 15.0 / 1.9
    for side in (-1, 1):
        t = side * deg(92)
        for body, station in (("UNITED", LETTERS[0]), ("STATES", LETTERS[1])):
            lettering(paint, CABIN, body, 26.0, t, zz(station), False, font)
        nx, ny = 10, 5
        flags.grid(
            lambda i, j, t=t: CABIN.wrap(t, zz(LETTERS[2]), (i / nx - 0.5) * fw, (j / ny - 0.5) * fh, 0.3),
            range(nx + 1),
            range(ny + 1),
            uv=lambda i, j: (i / nx, j / ny),
        )
    paint.build("Cabin_Lettering", M["paint_white"], g, smooth=False)
    flags.build("Cabin_Flag", flag, g, sharp_angle=None)
    # the three fairings over the straps that hold the re-entry module to the adapter
    fair = MeshBuilder()
    us = [math.pi * k / 8 for k in range(9)]
    vs = [math.pi * k / 10 for k in range(11)]
    for a in STRAPS:
        f = frame(CABIN.p(a, 4.6, 0.0), CABIN.n(a))  # (a blister: across the cone, along it, and proud of it)
        fair.grid(
            lambda u, v: Vector((2.6 * IN * math.sin(v) * math.cos(u), -5.0 * IN * math.cos(v), 1.9 * IN * math.sin(v) * math.sin(u) - 0.25 * IN)),
            us,
            vs,
            matrix=f,
            flip=True,
        )
    say(
        fair.build("Cabin_StrapFairings", M["shingle"], g, sharp_angle=35),
        "Retaining strap fairing",
        "The re-entry module is held to the adapter by three titanium straps across this joint, one high on each side and one "
        "low on the right, each where a bundle of wires and pipes crosses, so that the charge that cuts a strap cuts those "
        "too. After retrofire the three charges fire and the last of the adapter is pushed away. The fairings are counted "
        "in SEDR 300; where round the ship the straps are is McDonnell's drawing; the fairings' shape is ours.",
    )
    if "reentry-communications" in fit.experiments:
        # on the right landing gear door, near its forward end: a plate with three nozzles in it, and an arming
        # receptacle half way along the door (NASA S64-04925)
        plate, noz = MeshBuilder(), MeshBuilder()
        t = (DOORS[1] + DOORS[2]) / 2
        F = frame(CABIN.p(t, zz(NOZZLE_PLATE[0]), 0.0), CABIN.n(t)) @ Matrix.Rotation(math.pi, 4, "Z")
        wide, tall = NOZZLE_PLATE[1], NOZZLE_PLATE[2]
        chamfered(plate, (wide, tall, 0.9), F, 0.14)
        chamfered(plate, (1.7, 1.3, 0.8), frame(CABIN.p(t - deg(4), zz(138.0), 0.0), CABIN.n(t)), 0.1)
        for x, y, a, b in ((-1.1, 1.3, 1.0, 1.55), (1.25, 1.5, 0.8, 1.25), (0.5, -1.6, 0.65, 1.05)):
            # (No. 3, No. 2 and No. 1 of the figure: each an oval mouth, the nozzle's own holes in a face set down inside it)
            m = F @ Matrix.Translation(Vector((x, y, 0.0)) * IN) @ Matrix.Diagonal((a, b, 1.0, 1.0))
            noz.lathe(prof([(1.12, 0.3), (1.12, 0.62), (1.0, 0.62), (1.0, 0.52), (0.0, 0.52)]), 20, matrix=m)
        say(
            plate.build("Experiment_NozzlePlate", M["steel"], g, sharp_angle=35),
            "Re-entry communications experiment",
            "Coming home, a ship is wrapped in air so hot that it stops radio: for some minutes nothing gets in or out. Here, on "
            "the right landing gear door, is the outside of 85 lb of equipment that tried a cure: three nozzles in a plate, "
            "through which a timer squirted water into the hot air in short pulses for about two and a half minutes. With the "
            "water on, stations on the ground did hear the ship. The plate, its three nozzles and its place near the door's "
            "forward end are NASA's own drawing of it (S64-04925), which has no dimensions: its size here is estimated.",
        )
        noz.build("Experiment_Nozzles", M["nozzle"], g, sharp_angle=35)
        if interior():
            # (its water, in the landing gear's well behind the door, outside the pressure vessel: its size and place a guess)
            tank = MeshBuilder()
            tank.tube(CABIN.p(t, zz(111.0), -5.0), CABIN.p(t, zz(125.0), -5.0), 2.2 * IN, 16)
            tank.build("Experiment_WaterTank", M["tank"], g, sharp_angle=35)


def build_scanner_fairing(M) -> None:
    """The horizon scanners look out of the ship's left side at the neck; a fairing covers them on the way up. In the
    photograph of the morning of the launch it is a long flat-faced box the colour of bronze, riveted along its edges,
    lying from the cabin's forward end up over the re-entry control section."""
    g = group("ScannerFairing")
    mb, rivets = MeshBuilder(), MeshBuilder()
    t = SCANNER_AT
    s0, s1 = SCANNER_Z
    rad, tan = radial(t), Vector((-math.sin(t), math.cos(t), 0.0))
    face = NECK_R + SCANNER_PROUD
    body = lambda s: CABIN.r(zz(s)) if s < Z_RCS else NECK_R  # noqa: E731
    stations = [s0, s0 + 4.6, s0 + 9.0, s1 - 2.4, s1]
    rows = []
    for k, s in enumerate(stations):
        ht = SCANNER_HALF[0] + (SCANNER_HALF[1] - SCANNER_HALF[0]) * (s - s0) / (s1 - s0)
        hb = ht + 0.9
        top = body(s) - 3.0 if k in (0, len(stations) - 1) else face
        low = math.sqrt(body(s) ** 2 - hb**2) - (3.3 if k in (0, len(stations) - 1) else 0.4)
        rows.append([(rad * rho + tan * y + Vector((0.0, 0.0, zz(s)))) * IN for y, rho in ((-hb, low), (-ht, top), (ht, top), (hb, low))])
        if 0 < k < len(stations) - 1 and k + 1 < len(stations) - 1:
            s2 = stations[k + 1]
            n = max(2, round((s2 - s) / 1.7))
            for i in range(n + 1):
                sz = s + (s2 - s) * i / n
                h = SCANNER_HALF[0] + (SCANNER_HALF[1] - SCANNER_HALF[0]) * (sz - s0) / (s1 - s0)
                for y in (-h + 0.4, h - 0.4):
                    rivets.disc((rad * face + tan * y + Vector((0.0, 0.0, zz(sz)))) * IN, rad, 0.13 * IN, 0.06 * IN)
    mb.grid(lambda i, j: rows[j][i], range(4), range(len(rows)))
    mb.build("ScannerFairing_Shell", M["bronze"], g, sharp_angle=30)
    rivets.build("ScannerFairing_Rivets", M["aluminium"], g)


def build_crew_station(M, fit: Fit, font=None) -> None:
    """The pressure vessel and what is in it: gemini_cabin.py. The vessel is not the cone: it is a welded titanium box
    inside it, flat sided, with the hatches for its roof; the space between its sides and the cone is the equipment bays."""
    import gemini_cabin

    gemini_cabin.build(
        group("CrewStation"),
        M,
        font or srlib.load_font(),
        fit.names,
        say,
        fit.crew,
        gmt_clock=fit.gmt_clock,
        reentry_switch="reentry-communications" in fit.experiments,
        range_indicator=fit.range_indicator,
        get_clock=fit.get_clock,
        late=fit.late,
    )


# ------------------------------------------------------------------ the adapter


def gold_foil():
    """The gold the adapter's inner surfaces were plated with from spacecraft 9 on (SEDR 300 volume 2, p. 2-17): made
    when a ship asks for it, so that a ship that does not carries no such material."""
    return bpy.data.materials.get("foil-gold") or material("foil-gold", (0.62, 0.45, 0.16), 1.0, 0.36)


def adapter_skin(M, g, prefix: str, s0: float, s1: float, gold: bool = False) -> tuple:
    """A length of the adapter's skin from station s0 up to s1: magnesium, white outside, aluminium foil inside (gold,
    with `gold`), with the stringers that carry the coolant on its inner face."""
    skin_, foil, rings, stringers = (MeshBuilder() for _ in range(4))
    z0, z1 = zz(s0), zz(s1)
    n = max(6, round((z1 - z0) / 2.6))
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    skin_.lathe(prof([(ADAPTER.r(z), z) for z in zs]), 144)
    fs = [z0 + 1.6 + (z1 - z0 - 3.2) * i / n for i in range(n + 1)]  # (between the rings at its ends)
    foil.lathe(prof([(ADAPTER.r(z) - 0.5, z) for z in fs]), 144, flip=True)
    skin_obj = skin_.build(f"{prefix}_Skin", M["white"], g, sharp_angle=None)
    foil_obj = foil.build(f"{prefix}_Foil", gold_foil() if gold else M["foil"], g, sharp_angle=None)
    for z, wide in ((z0, 1.6), (z1, 1.6)):
        lo, hi = (z, z + wide) if z == z0 else (z - wide, z)
        rings.lathe(
            prof(
                [
                    (ADAPTER.r(lo) - 2.6, lo),
                    (ADAPTER.r(lo) - 0.12, lo),
                    (ADAPTER.r(hi) - 0.12, hi),
                    (ADAPTER.r(hi) - 2.6, hi),
                    (ADAPTER.r(lo) - 2.6, lo),
                ]
            ),
            144,
        )
    if interior():
        for i in range(40):  # the stringers: each a bulb on a web, the bulb hollow for the coolant
            a = TAU * (i + 0.5) / 40
            stringers.tube(ADAPTER.p(a, z0 + 1.8, -1.5), ADAPTER.p(a, z1 - 1.8, -1.5), 0.42 * IN, 6, caps=False)
    rings.build(f"{prefix}_Rings", M["magnesium"], g, sharp_angle=30)
    if stringers.verts:
        say(
            stringers.build(f"{prefix}_Stringers", M["magnesium"], g, sharp_angle=None),
            "Coolant stringers",
            "The adapter is the ship's radiator. Its stringers are extruded with a hollow bulb along them, and the coolant that "
            "has taken the heat from the cabin and the electronics is pumped through the bulbs; the white skin they are fastened "
            "to gives the heat to space. Their section is SEDR 300's; their number here is a guess.",
        )
    bpy.context.view_layer.update()
    return skin_obj, foil_obj


def i_beam(mb: MeshBuilder, along: Matrix, length: float, deep: float, flange: float) -> None:
    """A beam of I section lying along its frame's x, `deep` along its z: a web, a flange top and bottom, and stiffeners
    across the web."""
    chamfered(mb, (length - 0.2, 0.3, deep - 0.5), along, 0.05)
    for s in (-1, 1):
        chamfered(mb, (length, flange, 0.35), along @ Matrix.Translation(Vector((0.0, 0.0, s * (deep / 2 - 0.17))) * IN), 0.06)
    n = max(2, round(length / 9.0))
    for i in range(n + 1):
        x = -length / 2 + 1.0 + (length - 2.0) * i / n
        if abs(x) < 3.0:
            continue
        chamfered(mb, (0.25, flange * 0.8, deep - 0.8), along @ Matrix.Translation(Vector((x, 0.0, 0.0)) * IN), 0.04)


def build_retro_section(M, fit: Fit) -> None:
    """The adapter's upper part: the four retrograde rockets, and six of the OAMS's thrust chambers. It stays on until
    the rockets have fired."""
    g = group("RetroSection")
    skin_obj, _ = adapter_skin(M, g, "Retro", Z_DIVISION, Z0, fit.gold_inside)
    band = MeshBuilder()  # where the adapter is cut round before retrofire: the two sections' rings meet in a band
    band.lathe(
        prof(
            [
                (ADAPTER.r(zz(s)) + o, zz(s))
                for s, o in ((Z_DIVISION - 1.5, -0.05), (Z_DIVISION - 1.2, 0.16), (Z_DIVISION + 1.2, 0.16), (Z_DIVISION + 1.5, -0.05))
            ]
        ),
        144,
    )
    band.build("Retro_SeparationBand", M["white"], g, sharp_angle=30)
    noz, cup, dummy = MeshBuilder(), MeshBuilder(), MeshBuilder()
    skins = (skin_obj.name,)
    # 13 to 16, which move the ship bodily to the right, to the left, up and down: each on the far side from the way it
    # pushes, firing straight out, at the station of the ship's centre of gravity (SEDR 300, Figure 8-72)
    for theta in (deg(-90), deg(90), deg(180), 0.0):
        chamber(noz if fit.lateral_thrusters else dummy, cup, skins, ADAPTER, theta, zz(OAMS_LATERAL), radial(theta), 2.3, 2.9)
    # 11 and 12, which slow it: one on each side, firing forward and out
    forward = MeshBuilder()
    for side in (1, -1):
        theta = side * OAMS_FORWARD[0]
        out = (radial(theta) * 0.82 + Vector((0.0, 0.0, 0.57))).normalized()
        chamber(forward, cup, skins, ADAPTER, theta, zz(OAMS_FORWARD[1]), out, 2.1, 2.7)
    tidy(skins, ADAPTER)
    cup.build("Retro_Ports", M["titanium"], g, sharp_angle=35)
    say(
        forward.build("Retro_ForwardThrusters", M["nozzle"], g, sharp_angle=35),
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. An hour and a half "
        "after the launch Grissom held them on for 75 seconds, took 15 metres a second off the ship's speed, and Gemini 3 was "
        "in a different orbit: the first time a crew had changed the path they were on. Their thrust is documented; where "
        "they stand is read off SEDR 300's sketch of the system, and how far they lean forward is estimated.",
    )
    if noz.verts:
        say(
            noz.build("Retro_LateralThrusters", M["nozzle"], g, sharp_angle=35),
            "Lateral thrusters",
            "Four chambers of 100 lbf that move the ship bodily.",
        )
    if dummy.verts:
        say(
            dummy.build("Retro_LateralThrusters", M["steel"], g, sharp_angle=35),
            "Lateral thrusters (dummies)",
            "Chambers 13 to 16: four of 100 lbf belong here, pointing out to the sides, up and down through the ship's centre of "
            "gravity, to move it bodily without turning it. McDonnell's manual says it in a note on the drawing: inoperative on "
            "spacecraft 3. It could go forward and back, and nothing else. So when the plan called for a push sideways, to tilt "
            "the orbit by a fiftieth of a degree, Grissom turned the whole ship square to its path and used the forward and aft "
            "thrusters. The next ship had real ones. What stood in the ports of this one is not recorded; here they are the "
            "chambers' shapes in plain steel.",
        )
    if fit.docking_light:
        build_docking_light(M, g)
    if fit.eva_light:
        build_eva_light(M, g)
    if fit.handrails:
        build_handrail(M, g, "Retro", 0)
    if fit.late == 10:
        from late_equipment import experiment_ports

        experiment_ports(M, g)
    for name in fit.retro_experiments:
        build_retro_package(M, g, name)
    if not interior():
        return
    r, at, mid = RETRO
    case, bell, beam, fit_ = (MeshBuilder() for _ in range(4))
    for k in range(4):
        a = deg(45) + TAU * k / 4
        c = radial(a) * at + Vector((0, 0, zz(mid)))
        sphere(case, c * IN, r * IN)
        m = Matrix.Translation(c * IN)
        bell.lathe(prof([(1.4, -r + 1.0), (2.2, -r - 1.5), (3.6, -r - 5.5), (4.3, -r - 8.0)][::-1]), 20, matrix=m)
        case.lathe(hoop(2.0, 3.4, -r - 0.5, -r + 1.2), 16, matrix=m)  # the flange the nozzle is bolted to
        for i in range(12):
            b = TAU * i / 12
            fit_.disc(m @ (Vector((2.75 * math.cos(b), 2.75 * math.sin(b), -r - 0.5)) * IN), (0, 0, -1), 0.2 * IN, 0.2 * IN)
        # the igniter beside the nozzle, and a lug to the beam on either hand
        ig = c + radial(a + deg(90)) * 3.9 + Vector((0, 0, -r + 0.6))
        fit_.tube(ig * IN, (ig + Vector((0, 0, -2.6))) * IN, 0.8 * IN, 10)
        for da in (-deg(45), deg(45)):
            e = radial(a + da)
            foot = e * e.dot(c) + Vector((0, 0, zz(mid)))  # the nearest point of that beam's web
            start = c + (foot - c).normalized() * (r - 0.3)
            fit_.tube(start * IN, (foot - (foot - c).normalized() * 0.15) * IN, 0.55 * IN, 8)
            chamfered(fit_, (2.2, 1.0, 2.2), frame(foot * IN, (c - foot).normalized()) @ Matrix.Translation(Vector((0, 0, 0.5)) * IN), 0.1)
    span = 2 * (ADAPTER.r(zz(mid + 7.0)) - 3.4)
    for a, pieces in ((0.0, ((0.0, span),)), (deg(90), ((span / 4 + 0.9, span / 2 - 1.8), (-span / 4 - 0.9, span / 2 - 1.8)))):
        # the cross of beams they hang in: one whole, the other in two halves that meet it
        e = radial(a)
        for at_, length in pieces:
            along = Matrix((e, Vector((-e.y, e.x, 0.0)), Vector((0, 0, 1)))).transposed().to_4x4()
            along.translation = (e * at_ + Vector((0, 0, zz(mid + 1.0)))) * IN
            i_beam(beam, along, length, 11.0, 3.2)
    beam.tube(Vector((0, 0, zz(mid - 5.0))) * IN, Vector((0, 0, zz(mid + 7.0))) * IN, 2.4 * IN, 16)
    say(
        case.build("Retro_Rockets", M["case"], g, sharp_angle=None),
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 4 hours 33 "
        "minutes 23 seconds they brought Gemini 3 down. Going up they have a second use: fired together, they pull the ship "
        "off a failing Titan. Their size is SEDR 300's; where they sit in the section is read off its figure.",
    )
    bell.build("Retro_RocketNozzles", M["nozzle"], g, sharp_angle=35)
    fit_.build("Retro_RocketFittings", M["steel"], g, sharp_angle=35)
    say(
        beam.build("Retro_Beams", M["aluminium"], g, sharp_angle=35),
        "Retrograde rocket beams",
        "A cross of aluminium I-beams across the section, each rocket hung in one of its quarters by lugs. The beams and the "
        "rockets on them are SEDR 300's figure; the beams' depth and the flanges' width are estimated from it.",
    )
    if fit.retro_water_tank:
        build_retro_water_tank(M, g)


def laid(theta: float, station: float, off: float = 0.0) -> Matrix:
    """A frame on the adapter's skin, `theta` round from the top at that station and `off` inches out of it: its x along
    the skin toward the nose, its y round the ship (toward the top from the crew's right), its z out of the skin."""
    n = ADAPTER.n(theta)
    t = Vector((-math.sin(theta), math.cos(theta), 0.0))
    m = Matrix((n.cross(t), -t, n)).transposed().to_4x4()
    m.translation = ADAPTER.p(theta, zz(station), off)
    return m


def lamp(body: MeshBuilder, lens: MeshBuilder, m: Matrix, size: tuple[float, float, float], looks: int) -> None:
    """A lamp in a housing on the skin: `m` is its frame there (laid), `size` its housing's length, width and height,
    and it looks toward the nose (`looks` 1) or aft (-1). The housing is sunk a little into the skin and tapers away
    behind the lens."""
    long, wide, high = size
    chamfered(body, (long * 0.55, wide, high + 0.3), m @ Matrix.Translation(Vector((looks * long * 0.22, 0.0, high / 2 - 0.15)) * IN), 0.3)
    chamfered(
        body, (long * 0.5, wide * 0.72, high * 0.7 + 0.3), m @ Matrix.Translation(Vector((-looks * long * 0.25, 0.0, high * 0.35 - 0.15)) * IN), 0.3
    )
    r = min(wide, high) / 2 - 0.25
    face = m @ Matrix.Translation(Vector((looks * long * 0.495, 0.0, high / 2)) * IN) @ Matrix.Rotation(looks * math.pi / 2, 4, "Y")
    body.lathe(hoop(r, r + 0.22, -0.1, 0.3), 20, matrix=face)  # the bezel
    lens.lathe(prof([(r, 0.02), (r * 0.8, 0.26), (0.0, 0.34)]), 20, matrix=face)


def build_docking_light(M, g) -> None:
    """The rendezvous and docking light (Gemini VIII mission report, Figure 3.1-1, "Retrograde section"; SEDR 300 volume
    2, Figure 13-1): a lamp at the forward end of the adapter, looking forward along the ship."""
    theta, station, size = DOCKING_LIGHT
    body, lens = MeshBuilder(), MeshBuilder()
    lamp(body, lens, laid(theta, station), size, 1)
    body.build("Retro_DockingLightHousing", M["aluminium"], g, sharp_angle=35)
    say(
        lens.build("Retro_DockingLight", M["beacon"], g, sharp_angle=35),
        "Rendezvous and docking light",
        "A lamp of 4,000 candlepower at the forward end of the adapter, over and just behind the crew's heads, looking "
        "forward past the cabin: the ship's headlight. In the dark half of an orbit it lit the target for the last few "
        "hundred feet of an approach, and the docking cone the ship was being steered into. Its strength and that it "
        "stood centred here are McDonnell's summary of the programme; its station and its form are estimated.",
    )


def build_eva_light(M, g) -> None:
    """The light added for a man outside at night (Gemini VIII mission report, 3.1.2.12.1 and Figure 3.1-9): at the
    forward end of the adapter, looking aft along the handrails."""
    theta, station, size = EVA_LIGHT
    body, lens = MeshBuilder(), MeshBuilder()
    lamp(body, lens, laid(theta, station), size, -1)
    body.build("Retro_EvaLightHousing", M["aluminium"], g, sharp_angle=35)
    say(
        lens.build("Retro_EvaLight", M["beacon"], g, sharp_angle=35),
        "Extravehicular light",
        "A small lamp at the forward end of the adapter that looks aft, where every other light on the ship looks "
        "forward: it was put there to light the adapter's skin and the handrail along it for a man making his way to "
        "the back of the ship in the dark. The report's plan of the ship draws it on the top centreline; its form is "
        "estimated.",
    )


def build_handrail(M, g, prefix: str, which: int) -> None:
    """One of the two extendable handrails along the adapter behind the right hatch (Gemini VIII mission report,
    3.1.2.12.1 and Figure 3.1-9; SEDR 300 volume 2, p. 16-23 and Figure 16-9; NASA SP-149, p. 5-6): `which` is 0 for the
    forward one, on the retrograde section, and 1 for the aft one, on the equipment section. It is built as it left the
    pad, flush with the skin, and is a node of its own (Retro_Handrail, Equipment_Handrail, its origin on the skin at its
    middle) for a flight to stand out: its two legs are sunk in the skin and come out with it."""
    theta, lengths, gap = HANDRAILS
    wide, deep, out = HANDRAIL
    long = lengths[which]
    ca = math.cos(ADAPTER.a)
    ends = (
        (Z_DIVISION + gap / 2 * ca, Z_DIVISION + (gap / 2 + long) * ca)
        if which == 0
        else (Z_DIVISION - (gap / 2 + long) * ca, Z_DIVISION - gap / 2 * ca)
    )
    mid = (ends[0] + ends[1]) / 2
    here = laid(theta, mid)
    rail = MeshBuilder()
    chamfered(rail, (long, wide, deep), here @ Matrix.Translation(Vector((0.0, 0.0, deep / 2 + 0.06)) * IN), 0.12)
    for e in (-1, 1):  # the two legs it stands on when it is out
        chamfered(
            rail, (1.5, wide - 0.35, out + 0.9), here @ Matrix.Translation(Vector((e * (long / 2 - 3.2), 0.0, -(out + 0.9) / 2 + 0.2)) * IN), 0.1
        )
    obj = say(
        rail.build(f"{prefix}_HandrailBar", M["cover"], None, sharp_angle=35),
        "Handrail",
        "One of two painted metal rails along the adapter behind the right hatch, 0.55 by 1.25 in in section, "
        + ("21 in long, on the retrograde section" if which == 0 else "46 in long, on the equipment section")
        + ", with nine inches between the two. At launch they lie flush with the skin. In orbit each springs out to stand "
        "an inch and a half off it: the aft one by itself as the ship leaves the Titan, which had been holding its "
        "release pin, the forward one when the man going outside presses a button at its end. They were his road from "
        "the hatch to the back of the ship. Their sizes are NASA's summary of the programme's work outside; where they "
        "are round the ship is scaled from the mission report's plan of it.",
    )
    pivot(f"{prefix}_Handrail", g, ADAPTER.p(theta, zz(mid)), [obj])
    fit_ = MeshBuilder()
    for e in (-1, 1):  # the retaining hooks that hold it down
        chamfered(fit_, (1.3, wide + 1.0, 0.5), here @ Matrix.Translation(Vector((e * (long / 2 - 1.2), 0.0, -0.05)) * IN), 0.08)
    if which == 0:  # the forward one's release button, at its forward end
        fit_.lathe(prof([(0.55, 0.0), (0.55, 0.5), (0.0, 0.5)]), 12, matrix=here @ Matrix.Translation(Vector((long / 2 + 1.4, 0.0, -0.1)) * IN))
    fit_.build(f"{prefix}_HandrailFittings", M["aluminium"], g, sharp_angle=35)


def build_retro_package(M, g, name: str) -> None:
    """An experiment's package on the outside of the retrograde section behind the right hatch, where a man standing in
    the hatch could reach it: spacecraft 8's nuclear emulsion (S-9) or spacecraft 9's micrometeorite collector (S-12)."""
    long, wide, deep = RETRO_PACKAGES[name]
    theta, station = RETRO_PACKAGE_AT
    here = laid(theta, station)
    box, lid = MeshBuilder(), MeshBuilder()
    sunk = deep - 0.9 if name == "s-9" else 0.25  # (S-9 sat in a well in the skin; S-12 on it)
    chamfered(box, (long + 1.2, wide + 1.2, 0.5), here @ Matrix.Translation(Vector((0.0, 0.0, 0.1)) * IN), 0.1)  # the plate it is mounted by
    chamfered(box, (long, wide, deep), here @ Matrix.Translation(Vector((0.0, 0.0, deep / 2 - sunk)) * IN), 0.15)
    top = deep - sunk
    chamfered(lid, (long - 0.5, wide - 0.5, 0.3), here @ Matrix.Translation(Vector((0.0, 0.0, top + 0.1)) * IN), 0.08)  # its cover door
    for e in (-1, 1):  # the door's hinge along one long side, and a handle
        lid.tube(
            here @ (Vector((e * (long / 2 - 1.6), wide / 2 - 0.15, top + 0.05)) * IN),
            here @ (Vector((e * (long / 2 - 3.2), wide / 2 - 0.15, top + 0.05)) * IN),
            0.22 * IN,
            8,
        )
    lid.tube(here @ (Vector((-1.2, 0.0, top + 0.45)) * IN), here @ (Vector((1.2, 0.0, top + 0.45)) * IN), 0.2 * IN, 8)
    label, about = {
        "s-9": (
            "Nuclear emulsion package",
            "Experiment S-9: a block of photographic emulsion 8 1/2 by 6 by 3 in, in a well in the adapter's skin behind the "
            "right hatch, to record the tracks of cosmic rays that never reach a balloon. A motor inside moved one stack "
            "of plates past another so that each track could be dated. It had to be kept cold and to come home, so the "
            "man going outside was to bring it in. Its size and that it was behind the right hatch are the press kit's; "
            "exactly where is estimated.",
        ),
        "s-12": (
            "Micrometeorite collector",
            "Experiment S-12: an aluminium box 11 by 5.5 by 1.25 in on the outside of the retrograde section, with a door the "
            "crew could open and shut from inside. Behind the door were films a few hundred atoms thick, to be holed by "
            "dust too fine to see, and with them sealed samples of bacteria, moulds and a virus, to find out what a day "
            "of space does to them. Its size is the press kit's and that it was on this section the report's; exactly "
            "where is estimated.",
        ),
    }[name]
    box.build(f"Retro_Experiment{name.replace('-', '').upper()}Mount", M["aluminium"], g, sharp_angle=35)
    say(lid.build(f"Retro_Experiment{name.replace('-', '').upper()}", M["cover"], g, sharp_angle=35), label, about)


def build_retro_water_tank(M, g) -> None:
    """Spacecraft 7's tank C (Gemini VII mission report, 3.1.2.3 and Figure 3.1-4; SEDR 300 volume 1, Figure 6-10 sheet 5):
    a ball of drinking water in the retrograde section, on a tray between two of the rockets, its two halves bolted
    together round its middle."""
    across, theta, rho, station = WATER_C
    r = across / 2
    c = radial(theta) * rho + Vector((0.0, 0.0, zz(station)))
    here = Matrix.Translation(c * IN) @ Matrix.Rotation(theta, 4, "Z")
    tank, tray = MeshBuilder(), MeshBuilder()
    sphere(tank, c * IN, r * IN, 32)
    tank.lathe(hoop(r - 0.1, r + 0.6, -0.3, 0.3), 32, matrix=here)  # the flange its halves are bolted by
    tank.tube((c + Vector((0, 0, r - 0.3))) * IN, (c + Vector((0, 0, r + 0.9))) * IN, 0.8 * IN, 12)  # where the line comes in
    say(
        tank.build("Retro_WaterTank", M["tank"], g, sharp_angle=None),
        "Drinking water tank C",
        "A third tank of drinking water, which only this ship had: fourteen days of it for two men would not go in the two "
        "tanks of the equipment section, one of which had to be kept for the water the fuel cells made. It could hold 42 lb "
        "and went up with 25, pushed out by oxygen. It is in this section and not the one behind because this section "
        "stays on until retrofire. That it was here and what it held are documented; its size is worked from the 42 lb, "
        "and where in the section it sat is read off two sketches: toward the top, on a tray.",
    )
    foot = -r - 0.9  # the tray's upper face, below the tank's middle
    chamfered(tray, (15.0, 15.0, 0.5), here @ Matrix.Translation(Vector((0.0, 0.0, foot - 0.25)) * IN), 0.12)
    tray.lathe(hoop(4.2, 4.9, foot, -r + 1.25), 24, matrix=here)  # the ring the tank sits in
    for side in (-1, 1):  # a lip down each side
        chamfered(tray, (15.4, 0.4, 2.4), here @ Matrix.Translation(Vector((0.0, side * 7.5, foot + 0.5)) * IN), 0.08)
    tray.build("Retro_WaterTankSupport", M["aluminium"], g, sharp_angle=35)


# ------------------------------------------------------------------ the equipment section


def L(theta: float, out: float, along: float, station: float) -> Vector:
    """A point in the equipment section, by the module it belongs to: `out` inches from the ship's axis toward the wall
    that module stands against (`theta`, round from the top), `along` inches a quarter turn further round, and its Z
    station; metres out."""
    return (radial(theta) * out + radial(theta + math.pi / 2) * along + Vector((0.0, 0.0, zz(station)))) * IN


def Lm(theta: float, out: float, along: float, station: float) -> Matrix:
    """A frame there: its x outward, its y along, its z toward the nose."""
    return Matrix.Translation(L(theta, out, along, station)) @ Matrix.Rotation(theta, 4, "Z")


def slab(mb: MeshBuilder, outline: list[tuple[float, float]], s0: float, s1: float, theta: float, bevel: float = 0.12) -> None:
    """A plate cut to an outline, (out, along) in a module's frame and anticlockwise seen from the nose, between two
    stations, its edges chamfered."""
    n = len(outline)
    cx, cy = sum(p[0] for p in outline) / n, sum(p[1] for p in outline) / n

    def at(p: tuple[float, float], inset: float, station: float) -> tuple:
        k = inset / (math.hypot(p[0] - cx, p[1] - cy) or 1.0)
        return tuple(L(theta, p[0] + (cx - p[0]) * k, p[1] + (cy - p[1]) * k, station))

    verts = [at(p, inset, s) for inset, s in ((bevel, s1), (0.0, s1 - bevel), (0.0, s0 + bevel), (bevel, s0)) for p in outline]
    faces: list[tuple[int, ...]] = [tuple(range(n))]
    for k in range(3):
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, (k + 1) * n + i, (k + 1) * n + j, k * n + j))
    faces.append(tuple(range(4 * n - 1, 3 * n - 1, -1)))
    mb.add(verts, faces)


def can(mb: MeshBuilder, m: Matrix, r: float, long: float, k: float, segs: int = 24) -> None:
    """A cylinder with rounded ends about a frame's z: a tank, a bottle, a fuel cell's case. `k` is the radius its ends
    are rounded to."""
    h = long / 2
    arc = [(r - k + k * math.sin(a), k - k * math.cos(a)) for a in (math.pi / 2 * i / 5 for i in range(6))]
    mb.lathe(prof([(0.0, -h), *((x, -h + y) for x, y in arc[1:]), *((x, h - y) for x, y in arc[::-1][:-1]), (0.0, h)]), segs, matrix=m)


def ball(mb: MeshBuilder, m: Matrix, r: float, segs: int = 32, ring: float = 0.0) -> None:
    """A tank that is a ball, with a boss at each pole where a line comes in and, with `ring`, the band round its
    middle that its halves are joined by, standing that far proud."""
    sphere(mb, m.translation, r * IN, segs)
    for s in (-1, 1):
        mb.lathe(prof([(1.1, s * (r - 0.3)), (1.1, s * (r + 1.0)), (0.0, s * (r + 1.0))][::s]), 12, matrix=m)
    if ring:
        mb.lathe(hoop(r - 0.1, r + ring, -0.35, 0.35), segs, matrix=m)


def cover_station(r: float, gathered: float | None = None) -> float:
    """The station of the temperature control cover, that far from the ship's axis: flat inside its hoop, a cone from
    the hoop out to the rim. `gathered`: what the cloth is gathered to on that line from the axis, where it is not the
    hoop (a ship with a backpack's opening in its cover)."""
    (r1, s1), (r0, s0) = COVER_RIM, COVER_HOOP
    if gathered is not None:
        r0 = gathered
    return s0 if r <= r0 else s0 + (s1 - s0) * (r - r0) / (r1 - r0)


def backpack_outline(delta: float, grow: float = 0.0) -> float:
    """The opening in the gold cover that a backpack is reached through: how far its edge is from the ship's axis,
    `delta` round from the way the wearer's feet point. An oblong with round ends; `grow` moves the edge outward."""
    a, b, _ = BACKPACK_OPENING
    b += grow
    c = a - BACKPACK_OPENING[1]  # the middle of an end's arc, from the axis
    cs, sn = abs(math.cos(delta)), abs(math.sin(delta))
    if sn > 1e-9 and b / sn * cs <= c:
        return b / sn
    return c * cs + math.sqrt(max(0.0, b * b - (c * sn) ** 2))


def gather_of(fit: Fit) -> Callable[[float], float] | None:
    """What a ship's gold cover is gathered to, as a function of the angle round from the top: None for the hoop."""
    return (lambda theta: backpack_outline(theta - T_ECS)) if fit.backpack else None


def pod_outline(delta: float) -> float:
    """The rendezvous pod cover's outline: how far its edge is from the ship's axis, `delta` round from the way the
    pod's dipole points. An egg: a circle over the pod, a smaller one over the dipole, and the lines between them."""
    a, b, d = POD_COVER
    delta = abs((delta + math.pi) % TAU - math.pi)
    psi = math.pi / 2 - math.asin((a - b) / d)  # where the straight sides leave the larger circle
    tip = math.atan2(b * math.sin(psi), d + b * math.cos(psi))  # and where they reach the smaller
    if delta >= psi:
        return a
    if delta >= tip:
        return a / math.cos(delta - psi)
    return d * math.cos(delta) + math.sqrt(b * b - (d * math.sin(delta)) ** 2)


def port_outline(delta: float) -> float:
    """The opening in the cover's middle that an instrument looks out of: a rectangle with rounded corners."""
    half_along, half_out = COVER_PORT
    return ((abs(math.cos(delta)) / half_along) ** 4 + (abs(math.sin(delta)) / half_out) ** 4) ** -0.25


def well(mb: MeshBuilder, theta: float, rho: float, radius: float, floor: float, gather: Callable[[float], float] | None = None) -> None:
    """Where something stands through the cover (a thrust chamber, a light): a collar lying on the cover round the
    hole, and the cuff inside it, up to a floor at that station. `gather`: what the cloth is gathered to (gather_of)."""
    c = radial(theta) * rho
    n = srlib._segs(24)
    spokes = [Vector((math.cos(TAU * i / n), math.sin(TAU * i / n), 0.0)) for i in range(n)]

    def station(q: Vector) -> float:
        return cover_station(q.length, gather(math.atan2(q.y, q.x)) if gather else None)

    def ring(r_: float, lift: float) -> list[Vector]:
        return [Vector(((c + e * r_).x, (c + e * r_).y, zz(station(c + e * r_) - lift))) * IN for e in spokes]

    cuff = [(c + e * (radius + 0.12) + Vector((0.0, 0.0, zz(floor)))) * IN for e in spokes]
    rings = [ring(radius + 0.9, 0.5), ring(radius + 0.12, 0.5), cuff]
    mb.grid(lambda i, j: rings[j][i], range(n), range(3), closed_u=True)
    mb.add([tuple((c + Vector((0.0, 0.0, zz(floor)))) * IN)] + [tuple(p) for p in cuff], [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)])


def build_cover(M, g, fit: Fit, wells: list[tuple[float, float, float, float]]) -> None:
    """The temperature control cover across the open end (SEDR 300, p. 2-23; NASA S65-63221, spacecraft 7 from behind):
    gold-coated cloth gathered in from the rim to a hoop, and a flat disc inside the hoop. `wells` are what stands
    through it: round from the top, from the ship's axis, the hole's radius, and the station of the cuff's floor."""
    (r1, _), (r0, s0) = COVER_RIM, COVER_HOOP
    fine = srlib.DETAIL >= 0.5
    gores = 48 if srlib.DETAIL >= 1.0 else 36 if fine else 24
    cols, rows = 2 * gores, (8 if fine else 3)
    pleat = PLEAT if fine else 0.0
    looks_aft = "proton-electron-spectrometer" in fit.experiments
    # (a ship with the pod has the pod's own cover in the middle, and the gold cut back round it: build_pod; one with a
    # backpack has the cloth gathered to the backpack's opening, and no hoop or disc: build_backpack)
    pack = bool(fit.backpack)
    gather = gather_of(fit)
    hole = backpack_outline if pack else (lambda d: pod_outline(d) + 0.3) if fit.pod else port_outline if looks_aft else None
    angles = [T_ELECTRONIC + TAU * i / cols for i in range(cols)]
    inner = [hole(a - (T_ECS if pack else T_ELECTRONIC)) if hole else 0.0 for a in angles]

    def point(i: int, r: float, lift: float = 0.0) -> tuple:
        return tuple((radial(angles[i]) * r + Vector((0.0, 0.0, zz(cover_station(r, inner[i] if pack else None)) + lift))) * IN)

    verts: list[tuple] = []
    faces: list[tuple[int, ...]] = []
    for i in range(cols):  # the cone: a ridge and a valley to each gore, deepest toward the hoop it is gathered to
        start = inner[i] if pack else max(r0, inner[i])
        gathered = start if pack else r0
        for j in range(rows + 1):
            r = start + (r1 - start) * j / rows
            t = (r1 - r) / (r1 - gathered)
            verts.append(point(i, r, pleat * (0.4 + 0.6 * t) * min(1.0, (1.0 - t) / 0.12) * (1 if i % 2 == 0 else -1)))
    for i in range(cols):
        k = (i + 1) % cols
        faces.extend((i * (rows + 1) + j, k * (rows + 1) + j, k * (rows + 1) + j + 1, i * (rows + 1) + j + 1) for j in range(rows))
    base = len(verts)
    if pack:
        pass
    elif hole:  # the disc inside the hoop, out from the opening in it
        for i in range(cols):
            verts += [point(i, min(inner[i], r0)), point(i, r0)]
        for i in range(cols):
            k = (i + 1) % cols
            if min(inner[i], inner[k]) < r0 - 1e-6:
                faces.append((base + 2 * i, base + 2 * k, base + 2 * k + 1, base + 2 * i + 1))
    else:
        verts.append((0.0, 0.0, zz(s0) * IN))
        verts += [point(i, r0) for i in range(cols)]
        faces.extend((base, base + 1 + i, base + 1 + (i + 1) % cols) for i in range(cols))
    cover, hoops = MeshBuilder(), MeshBuilder()
    cover.add(verts, faces)
    # the hoop the cloth is gathered to, and the seam inside it; where the pod's cover crosses the hoop it is cut
    cut = next((a for a in (TAU * i / 720 for i in range(360)) if pod_outline(a) + 0.3 < r0), 0.0) if fit.pod else 0.0
    arc = (T_ELECTRONIC + cut, T_ELECTRONIC + TAU - cut)
    for r, k in () if pack else ((r0, 0.32), *(() if fit.pod else ((r0 - 2.4, 0.18),))):
        hoops.lathe(
            prof([(r + k * math.cos(a), zz(s0) - 0.1 + k * math.sin(a)) for a in (-math.pi / 2 + TAU * i / 8 for i in range(9))]), cols, arc=arc
        )
    if pack:  # the cord the cloth is gathered to, round the opening

        def cord(i: int, j: int) -> tuple:
            a = -math.pi / 2 + TAU * j / 8
            return tuple((radial(angles[i]) * (inner[i] + 0.32 * math.cos(a)) + Vector((0.0, 0.0, zz(s0) - 0.1 + 0.32 * math.sin(a)))) * IN)

        hoops.grid(cord, range(cols), range(9), closed_u=True)
    hoops.build("Equipment_CoverHoop", M["gold"], g, sharp_angle=None)
    say(
        cover.build("Equipment_Cover", M["gold"], g, sharp_angle=6),  # (each gather a crease, as the cloth's are)
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of glass "
        "fibre cloth with gold deposited on it closes the opening: gathered in from the rim to a hoop, like the inside of a "
        "funnel, with a flat disc in the middle. Until the ship leaves the Titan, the dome of the Titan's tank stands up into "
        "the adapter under it. The two thrusters that push the ship forward stand through it at the rim. That it was there and "
        "what it "
        "was made of are documented; its form is measured on a photograph of Gemini 7 taken from Gemini 6, good to two or "
        "three inches, and taken to be the same on every ship.",
    )
    cuffs = MeshBuilder()
    for theta, rho, radius, floor in wells:
        if holes():
            at = cover_station(rho, gather(theta) if gather else None)
            pierce("Equipment_Cover", radial(theta) * rho + Vector((0.0, 0.0, zz(at))), Vector((0.0, 0.0, -1.0)), radius)
            well(cuffs, theta, rho, radius, floor, gather)
    if cuffs.verts:
        trim("Equipment_Cover", [(radial(theta) * rho * IN, (radius + 3.0) * IN) for theta, rho, radius, _ in wells])
        cuffs.build("Equipment_CoverWells", M["gold"], g, sharp_angle=35)


def trim(name: str, spots: list[tuple[Vector, float]]) -> None:
    """Take out of a mesh, round each spot where a hole was cut in it (where, and how far round, in metres across the
    ship), the faces the cutting left with no area. Such a face has no direction of its own, and can be taken for one
    that will flicker against the cuff beside it; one with three corners in a line is a triangle and a sliver."""
    obj = bpy.data.objects[name]
    bm = bmesh.new()
    bm.from_mesh(obj.data)

    def near(f) -> bool:
        c = f.calc_center_median()
        return any(math.hypot(c.x - at.x, c.y - at.y) < reach for at, reach in spots)

    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3 and near(f)])
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if near(f) and f.calc_area() < 2e-3 * f.calc_perimeter() ** 2], context="FACES")
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def build_equipment_section(M, fit: Fit) -> None:
    """The adapter's lower part: what is needed only in orbit. It is cut away just before retrofire."""
    g = group("EquipmentSection")
    skin_obj, _ = adapter_skin(M, g, "Equipment", Z_MATING_TOP, Z_DIVISION, fit.gold_inside)
    ring = MeshBuilder()  # the machined ring at its foot, bolted to the launch vehicle with twenty bolts
    ring.lathe(hoop(BASE_R - 2.4, BASE_R + 0.45, zz(Z_BASE), zz(Z_MATING_TOP)), 144)
    for i in range(20):
        a = TAU * (i + 0.5) / 20
        ring.disc(ADAPTER.p(a, zz((Z_BASE + Z_MATING_TOP) / 2), 0.45), radial(a), 0.55 * IN, 0.35 * IN)
    ring.build("Equipment_MatingRing", M["aluminium"], g, sharp_angle=30)
    noz, cup = MeshBuilder(), MeshBuilder()
    skins = (skin_obj.name,)
    # 1 to 8, which turn the ship: four clusters at the foot, on the diagonals. In each, the chamber nearer the top or
    # the bottom fires along the ship's top-to-bottom line and pitches it; the other fires sideways and yaws it; a pair
    # in opposite corners rolls it (SEDR 300, Figure 8-72 and its table). None fires out along a radius.
    for top in (1, -1):
        for side in (1, -1):
            for k, a in enumerate(OAMS_ATTITUDE):
                theta = side * a if top > 0 else side * (math.pi - a)
                out = Vector((top, 0.0, 0.0)) if k == 0 else Vector((0.0, side, 0.0))
                chamber(noz, cup, skins, ADAPTER, theta, zz(OAMS_ATTITUDE_Z), out, 1.25, 1.9, lip=0.4)
    tidy(skins, ADAPTER)
    cup.build("Equipment_Ports", M["titanium"], g, sharp_angle=35)
    say(
        noz.build("Equipment_AttitudeThrusters", M["nozzle"], g, sharp_angle=35),
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. In each cluster one fires along the ship's "
        "top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll it. They are "
        "part of the orbit attitude and maneuver system, whose propellants are in this section. Their number, thrust and which "
        "way each fires are documented; where the clusters stand round the foot is read off SEDR 300's sketch.",
    )
    aft = MeshBuilder()
    rho, exit_, exit_r = OAMS_AFT_AT
    wells = []
    for a in OAMS_AFT:  # 9 and 10, which push the ship forward: at the foot, top and bottom, firing aft through the cover
        here = Matrix.Translation((radial(a) * rho + Vector((0.0, 0.0, zz(exit_)))) * IN)
        aft.lathe(prof([(exit_r, 0.0), (exit_r - 0.35, 1.5), (1.6, 4.0), (0.85, 6.4), (1.25, 7.0), (1.25, 9.6), (0.0, 9.6)]), 20, matrix=here)
        wells.append((a, rho, exit_r + 0.3, exit_ + 5.0))
    say(
        aft.build("Equipment_AftThrusters", M["nozzle"], g, sharp_angle=35),
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. When the Titan's engine had stopped and a "
        "charge had cut the ship free, Grissom held these on to push it clear and into orbit. He held them a little long. At "
        "4 hours 21 minutes he used them again, for two and a half minutes, to bring the low point of the orbit down into the "
        "air: had the retrograde rockets then failed, the ship would have come home anyway. SEDR 300's sketch puts one at "
        "the top of the foot and one at the bottom, and a photograph of Gemini 7 from behind shows the two standing through "
        "the gold cover just inside its rim; how far in is measured on that photograph.",
    )
    if fit.acquisition_lights:
        wells += build_acquisition_lights(M, g)
    if fit.handrails:
        build_handrail(M, g, "Equipment", 1)
    build_cover(M, g, fit, wells)
    if fit.backpack:
        build_donning_station(M, g, fit)
    if not interior():
        return
    if fit.backpack:
        build_torque_box(M, g)
    build_blast_shield(M, g, fit)
    build_oams_module(M, g, fit)
    if fit.fuel_cells:
        build_fuel_cells(M, g, fit.hydrogen_insulated, fit.fuel_cell_row, fit.late != 0)
    if fit.module_water_tank:
        build_module_water_tank(M, g, fit.late != 0)
    if fit.adapter_batteries:
        build_battery_module(M, g, fit)
    build_ecs_module(M, g, fit.late != 0)
    build_electronic_module(M, g)
    build_adapter_experiments(M, g, fit)
    if fit.pod:
        build_pod_mount(M, g)


def build_acquisition_lights(M, g) -> list[tuple[float, float, float, float]]:
    """Spacecraft 7's two acquisition lights (Gemini VII mission report, 3.1.1.2 and 3.1.2.4): the flashing lights made
    for the Agena, at the foot of the adapter on opposite sides, for the crew of spacecraft 6 to find this ship by.
    Returns where each stands through the cover (build_cover's `wells`)."""
    angles, rho = ACQUISITION_LIGHTS
    base, lens = MeshBuilder(), MeshBuilder()
    for a in angles:
        port = frame((radial(a) * rho + Vector((0.0, 0.0, zz(Z_BASE + 3.1)))) * IN, Vector((0.0, 0.0, -1.0)))
        base.lathe(prof([(0.0, -3.4), (2.6, -3.4), (2.6, 0.5), (0.0, 0.5)]), 20, matrix=port)
        lens.lathe(prof([(1.9, 0.5), (1.9, 1.3), (1.3, 2.1), (0.0, 2.4)]), 20, matrix=port)
    base.build("Equipment_AcquisitionLightBases", M["aluminium"], g, sharp_angle=35)
    say(
        lens.build("Equipment_AcquisitionLights", M["beacon"], g, sharp_angle=35),
        "Acquisition light",
        "One of two flashing lights of the kind made for the Agena, put on this ship when it became a target: a xenon lamp "
        "that fires about 65 times a minute and can be seen for some twenty miles as a star of the third magnitude. The "
        "crew switched them from a circuit breaker by the pilot's elbow. That there were two, on opposite sides at the base "
        "of this section, is documented; which sides, and how they were mounted, was not found: they are put left and "
        "right, looking aft through the cover.",
    )
    return [(a, rho, 2.9, Z_BASE + 6.4) for a in angles]


def build_blast_shield(M, g, fit: Fit) -> None:
    """The blast shield at Z66.74 and the beams it lies on (Technical Summary, Figure 4, p. 12, and p. 13): not one
    sheet but the support panels of the section's modules and an access door between them, of aluminium honeycomb
    faced with glass fibre. Two beams cross the section; the OAMS module is the segment beyond one, the fuel cell or
    battery module the segment beyond the other, and between the beams are the electronic module, the door, and the
    environmental control system's module."""
    rs = ADAPTER.r(zz(Z_BLAST)) - 2.8
    gap = 0.12
    b, d = BEAM_AT - gap, DOOR_HALF

    def arc(a0: float, a1: float, n: int) -> list[tuple[float, float]]:
        return [(rs * math.cos(a), rs * math.sin(a)) for a in (a0 + (a1 - a0) * i / n for i in range(n + 1))]

    seg = math.acos((BEAM_AT + gap) / rs)
    end = math.acos(b / rs)
    panels, door, beams = MeshBuilder(), MeshBuilder(), MeshBuilder()
    s0, s1 = Z_BLAST - SHIELD_THICK, Z_BLAST
    slab(panels, arc(-seg, seg, 28), s0, s1, T_OAMS)  # the OAMS module's
    slab(panels, arc(-seg, seg, 28), s0, s1, T_POWER)  # the fuel cell or battery module's
    slab(panels, [(-b, d + gap), (b, d + gap), *arc(end, math.pi - end, 12)], s0, s1, T_OAMS)  # the electronic module's
    slab(panels, [(b, -d - gap), (-b, -d - gap), *arc(math.pi + end, TAU - end, 12)], s0, s1, T_OAMS)  # the ECS module's
    slab(door, [(-b, -d + gap), (b, -d + gap), (b, d - gap), (-b, d - gap)], s0, s1, T_OAMS)
    say(
        panels.build("Equipment_BlastShield", M["honeycomb"], g, sharp_angle=30),
        "Blast shield",
        "Aluminium honeycomb faced with glass fibre, across the head of this section under the retrograde rockets. If the "
        "rockets were ever fired to pull the ship off a failing launch vehicle, this section and the Titan's oxidiser tank "
        "would be straight below them. It is not one sheet: each of the section's modules hangs under a panel of its own, "
        "and the panels and a door between them make the shield. McDonnell's drawing gives its station and which module is "
        "on which side; how wide each panel is is scaled from that drawing.",
    )
    say(
        door.build("Equipment_BlastShieldDoor", M["honeycomb"], g, sharp_angle=30),
        "Blast shield access door",
        "The panel in the middle of the blast shield, between the two beams. Nothing hangs under it but what a flight puts "
        "there, an experiment or spacecraft 5's pod, so the middle of the section is clear from here to the gold cover. That "
        "there was a door in the middle is McDonnell's drawing; its size is scaled "
        "from it.",
    )
    # the two beams, each the edge of the module beyond it; the short ones that frame the door; a fitting at each end
    top = s0 - 0.15
    half = math.sqrt((ADAPTER.r(zz(top - 1.8)) - 2.5) ** 2 - BEAM_AT**2)
    for side in (1, -1):
        i_beam(beams, Lm(T_OAMS, side * BEAM_AT, 0.0, top - 1.8) @ Matrix.Rotation(math.pi / 2, 4, "Z"), 2 * half - 3.4, 3.6, 2.6)
        for e in (1, -1):
            chamfered(beams, (3.0, 3.2, 4.4), Lm(T_OAMS, side * BEAM_AT, e * (half - 1.6), top - 2.6), 0.25)
    for e in (1, -1):
        i_beam(beams, Lm(T_OAMS, 0.0, e * DOOR_HALF, top - 1.2), 2 * BEAM_AT - 3.0, 2.4, 2.0)
    for e in (1, -1):  # the fasteners along the door's two long edges, seen from below
        for i in range(7):
            beams.disc(L(T_OAMS, e * (b - 1.0), (i - 3) * (d - 2.0) / 3, s0), (0.0, 0.0, -1.0), 0.4 * IN, 0.14 * IN)
    say(
        beams.build("Equipment_ModuleBeams", M["aluminium"], g, sharp_angle=35),
        "Module support beams",
        "Two beams across the section, wall to wall, with the blast shield's panels lying on them. Each is the inboard edge of a "
        "module: the manoeuvring system's tanks hang beyond one, the fuel cells or the batteries beyond the other, and the "
        "space between the two is left clear. They do not run square to the ship's top and bottom: two of McDonnell's drawings "
        "have them turned about 23 degrees, as near as a sketch can be measured. The beams and what hangs from each are his "
        "drawing; how far apart they are and "
        "their section are scaled from it.",
    )


def build_oams_module(M, g, fit: Fit) -> None:
    """The orbit attitude and maneuver system's module (Technical Summary, Figure 4; SEDR 300 volume 1, Section VIII,
    Figure 8-72; volume 2, Section VIII, Figures 8-94 and 8-96; the Gemini V mission report, Figure 3.1-3): a frame
    with a straight inboard side and a side curved to the wall, and four places in a row along it. A ship with one
    tank each of fuel and oxidiser has them in the middle two, and a fuel cell ship has its two drinking water tanks,
    of the same pattern, at the ends; spacecraft 6 has propellant in all four."""
    out, pitch, station = OAMS_ROW
    places = [(i - 1.5) * pitch for i in range(4)]
    tanks, water, frames_, packs = (MeshBuilder() for _ in range(4))
    if fit.oams_tanks > 1:
        propellant = [(places[0], 21.12), (places[1], 21.13), (places[2], 21.13), (places[3], 21.12)]  # (fuel the middle two)
        helium = (-pitch, pitch)
    else:
        propellant = [(places[1], 21.13), (places[2], 21.12)]
        helium = (0.0,)
    for along, across in propellant:
        ball(tanks, Lm(T_OAMS, out, along, station), across / 2)
    for along in helium:  # the helium that pushes them: in the gap between two tanks and the wall, a little aft
        ball(tanks, Lm(T_OAMS, OAMS_HELIUM[0], along, OAMS_HELIUM[1]), 16.20 / 2, 24)
    say(
        tanks.build("Equipment_OamsTanks", M["tank"], g, sharp_angle=None),
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: a fuel tank 21.13 in across, an oxidiser tank 21.12 in across and a ball "
        "of helium 16.20 in across to push them, feeding sixteen thrust chambers round the adapter. About 300 lb of "
        "propellant on this flight. With it Gemini 3 changed its orbit three times. The sizes are SEDR 300's. McDonnell's "
        "drawings have the propellant tanks side by side on one module, against the wall toward the ship's top and a "
        "little to the crew's right; where along that module each stands, and where the helium is, are estimated.",
    )
    filled = [a for a, _ in propellant]
    if fit.water_spheres and fit.oams_tanks == 1:
        for along in (places[0], places[3])[: fit.water_spheres]:
            ball(water, Lm(T_OAMS, out, along, station), 21.12 / 2)
            filled.append(along)
        say(
            water.build("Equipment_WaterTanks", M["tank"], g, sharp_angle=None),
            "Drinking water tanks",
            "Two tanks of the manoeuvring system's own pattern, at the two ends of its row of tanks, each able to hold 150 lb "
            "of water behind a diaphragm. One went up with 30 lb in it, pushed out by oxygen. The other went up with 126 lb "
            "and did two jobs: the water the fuel cells made was piped in on the far side of its diaphragm, and pushed the "
            "drinking water out as it came. So the more electricity the ship made, the less room it had left for the water "
            "that made, and late in the flight power was held down for that reason too. That there were two, whose pattern "
            "they were and that they stood at the ends of this row are documented; the row's place is scaled from "
            "McDonnell's drawings.",
        )
    # the frame they hang in, a little above their middles: the straight side, the curved side, a member between each
    # two places, and a ring round each tank
    level = station + 9.0
    side, rim = 13.6, ADAPTER.r(zz(level)) - 3.6
    reach = math.sqrt(rim**2 - side**2)
    chamfered(frames_, (2.0, 2 * reach - 1.0, 2.0), Lm(T_OAMS, side, 0.0, level), 0.2)
    steps = 28
    phi = math.atan2(reach, side)
    curve = [L(T_OAMS, rim * math.cos(a), rim * math.sin(a), level) for a in (-phi + 2 * phi * i / steps for i in range(steps + 1))]
    for p, q in zip(curve, curve[1:]):
        frames_.tube(p, q, 0.9 * IN, 8, caps=False)
    for along in (0.0, -pitch, pitch):
        frames_.tube(L(T_OAMS, side + 0.8, along, level), L(T_OAMS, math.sqrt(rim**2 - along**2) - 0.4, along, level), 0.8 * IN, 8)
    girth = math.sqrt((21.13 / 2) ** 2 - 9.0**2)  # a tank's radius at the frame's level
    for along in filled:
        frames_.lathe(hoop(girth + 0.25, girth + 0.95, -0.3, 0.3), 24, matrix=Lm(T_OAMS, out, along, level))
        for e in (-1, 1):  # a lug to the member on either hand (at the row's ends, to the curved side)
            far = along + e * pitch / 2
            to = L(T_OAMS, out, far - e * 0.6, level) if abs(far) < 1.2 * pitch else L(T_OAMS, out + 1.0, along + e * (girth + 3.2), level)
            frames_.tube(L(T_OAMS, out, along + e * (girth + 0.8), level), to, 0.5 * IN, 8)
    for along in (-0.9 * reach, -pitch, 0.0, pitch, 0.9 * reach):  # hangers up to the beam
        frames_.tube(L(T_OAMS, side, along, level + 0.9), L(T_OAMS, BEAM_AT - 0.5, along, BEAM_FOOT + 0.15), 0.5 * IN, 8)
    for a in (-0.55 * phi, 0.0, 0.55 * phi):  # and a fitting to the wall
        chamfered(frames_, (2.6, 3.0, 2.4), Lm(T_OAMS + a, rim + 0.9, 0.0, level), 0.2)
    say(
        frames_.build("Equipment_OamsModule", M["aluminium"], g, sharp_angle=35),
        "OAMS module structure",
        "The frame the manoeuvring system's tanks hang in: straight on the side toward the middle of the ship, curved to the "
        "wall on the other, with room for four tanks in a row. It went into the adapter as one piece, tanks and valves "
        "already on it. Its form is McDonnell's drawings of the module; none of them is dimensioned, and its sizes here "
        "are what the four tanks and the wall leave.",
    )
    # the valve packages on their manifold, along the module's inboard side under the beam (Figure 8-72 draws them so:
    # the pressure regulator, and the packages lettered A to E, with the two propellant shutoff valves)
    bar = (side - 3.0, level + 2.0)
    packs.tube(L(T_OAMS, bar[0], -17.0, bar[1]), L(T_OAMS, bar[0], 17.0, bar[1]), 0.6 * IN, 10)
    for i, along in enumerate((-15.0, -9.0, -3.0, 3.0, 9.0, 15.0)):
        if i % 2:
            chamfered(packs, (2.4, 2.8, 2.6), Lm(T_OAMS, bar[0], along, bar[1]), 0.25)
            packs.tube(L(T_OAMS, bar[0] - 1.2, along, bar[1]), L(T_OAMS, bar[0] - 2.4, along, bar[1]), 0.5 * IN, 8)
        else:
            packs.tube(L(T_OAMS, bar[0], along - 1.5, bar[1] - 0.2), L(T_OAMS, bar[0], along + 1.5, bar[1] - 0.2), 1.25 * IN, 12)
            packs.tube(L(T_OAMS, bar[0], along, bar[1] - 0.2), L(T_OAMS, bar[0], along, bar[1] - 2.3), 0.55 * IN, 8)
    say(
        packs.build("Equipment_OamsPackages", M["equipment"], g, sharp_angle=35),
        "OAMS valve packages",
        "The manoeuvring system's plumbing, gathered into packages on one manifold: the regulator that brings the helium "
        "down from 3,000 lb to the square inch to what the tanks are pushed with, the valves that squibs open to let the helium "
        "and the propellants through for the first time, the filters and check valves, and the two valves by which the fuel and "
        "the oxidiser could be shut off again. What the packages are is documented; their forms here are "
        "tokens, and their place along the module's inboard side is read off McDonnell's sketch.",
    )
    if fit.oams_reserve_tank:
        build_reserve_tank(M, g, side - 4.0, level - 3.0)


def build_reserve_tank(M, g, out: float, station: float) -> None:
    """The OAMS's reserve fuel tank, which only spacecraft 7 had (Gemini VII mission report, 3.1.2.7; SEDR 300 volume 1,
    Section VIII, p. 8-271 and Figure 8-72): a cylinder of the re-entry control system's pattern, lying along the
    module's inboard side."""
    across, long = RESERVE_TANK
    tank, straps = MeshBuilder(), MeshBuilder()
    along = Lm(T_OAMS, out, 0.0, station) @ Matrix.Rotation(-math.pi / 2, 4, "X")  # (its axis along the module)
    can(tank, along, across / 2, long, 1.3)
    say(
        tank.build("Equipment_OamsReserveTank", M["tank"], g, sharp_angle=None),
        "OAMS reserve fuel tank",
        "A third tank for the manoeuvring system, on this ship only: a cylinder 5.10 in across and 30.7 in long, of the "
        "pattern the re-entry control system uses, holding about 13 lb of fuel behind a valve that a squib opens. It is "
        "there because the gauge could not be trusted near empty: when the main fuel tank ran dry the crew would open "
        "this one and know exactly what they had left. They did, at 290 hours. Its size is McDonnell's figure; where it "
        "lies is estimated from the manual's sketch of the system.",
    )
    for s in (-1, 1):  # the two straps that hold it to the module's frame
        straps.lathe(hoop(across / 2 - 0.1, across / 2 + 0.25, s * 9.0 - 0.5, s * 9.0 + 0.5), 24, matrix=along)
        straps.tube(L(T_OAMS, out + across / 2, s * 9.0, station + 0.6), L(T_OAMS, out + 3.4, s * 9.0, station + 2.4), 0.45 * IN, 8)
    straps.build("Equipment_OamsReserveTankStraps", M["aluminium"], g, sharp_angle=35)


def battery(mb: MeshBuilder, m: Matrix) -> None:
    """One of the adapter's 400 ampere-hour batteries: a ribbed case, its lid and its connector (SEDR 300 volume 2,
    Figure 5-9, draws them so; their size is estimated)."""
    deep, wide, tall = BATTERY
    chamfered(mb, (deep, wide, tall), m, 0.3)
    for k in (-0.32, 0.0, 0.32):  # the ribs round the case
        chamfered(mb, (deep + 0.36, wide + 0.36, 0.55), m @ Matrix.Translation(Vector((0.0, 0.0, k * tall)) * IN), 0.12)
    chamfered(mb, (deep - 1.6, wide - 1.4, 0.5), m @ Matrix.Translation(Vector((0.0, 0.0, -tall / 2 - 0.1)) * IN), 0.12)  # its lid, aft
    mb.lathe(prof([(0.9, 0.0), (0.9, -1.1), (0.0, -1.1)][::-1]), 10, matrix=m @ Matrix.Translation(Vector((deep / 4, 0.0, -tall / 2 - 0.3)) * IN))


def build_battery_module(M, g, fit: Fit) -> None:
    """The adapter battery module of a ship without fuel cells (SEDR 300 volume 1, Figures 5-2 and 6-10 sheets 2 and 4,
    for spacecraft 3 and 4; volume 2, Figures 5-9 and 6-10 sheet 3, for spacecraft 6): the batteries hung in rows from
    a frame beyond the beam, on the side of the section away from the OAMS module, and the ship's drinking water with
    them. Spacecraft 3 has three batteries and one water tank; spacecraft 4 six, in two tiers, with four water tanks and
    the oxygen that pushed the water out; spacecraft 6 three, with one tank that is a ball and its oxygen."""
    n = fit.adapter_batteries
    out, upper, lower = 26.0, 55.5, 43.5
    deep, wide, tall = BATTERY
    batt, frames_, water = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # where each hangs, as (along, station): three to a tier; spacecraft 6's in a row from one end, the water tank at the other
    places = [(22.0 - 10.0 * i, upper) if fit.battery_module else ((i % 3 - 1) * 8.6, (upper, lower)[i // 3]) for i in range(n)]
    for along, station in places:
        battery(batt, Lm(T_POWER, out, along, station))
    say(
        batt.build("Equipment_Batteries", M["battery"], g, sharp_angle=35),
        "Adapter batteries",
        f"{('Three', 'Six')[n > 3]} silver-zinc batteries of 400 ampere-hours: all the power the ship has in orbit. The fuel "
        "cells that were to make Gemini's electricity from hydrogen and oxygen were not ready, so the first two crews flew on "
        "batteries, and how long the batteries would last set how long the flights could be. Their number and rating are "
        "documented, and McDonnell's drawings show them hung in a row from the module on this side of the section; their "
        "size is estimated.",
    )
    # the drinking water that hangs with them, as (along, station, how far its top is below a battery's): the early
    # ships' tanks are drums on end, spacecraft 6's is a ball
    hung: list[tuple[float, float, float]] = []
    if fit.battery_module:
        hung = [(BATTERY_WATER[1][1], upper, 1.6)]
    elif fit.water_tanks == 1:
        hung = [(-19.4, upper, 1.2)]
    elif fit.water_tanks > 1:  # in pairs at the two ends of the lower tier (SEDR 300 volume 1, Figure 6-10 sheet 4)
        hung = [(s * (16.9 + 7.7 * k), lower, 1.2) for s in (-1, 1) for k in range(fit.water_tanks // 2)]
    # the frame: two rails over each tier with a rung over each thing that hangs from them, the upper rails hung from
    # the beam and the lower from the upper
    tiers = sorted({station for _, station in places}, reverse=True)
    lo, hi = min(a for a, _ in places) - wide / 2 - 1.2, max(a for a, _ in places) + wide / 2 + 1.2
    rails = (out - deep / 2 + 0.6, out + deep / 2 - 0.6)
    for station in tiers:
        held = [(a, 0.2) for a, s in places if s == station] + [(a, drop) for a, s, drop in hung if s == station]
        a0, a1 = min([lo, *(a - 4.8 for a, _ in held)]), max([hi, *(a + 4.8 for a, _ in held)])
        rail = station + tall / 2 + 0.9
        for o in rails:
            chamfered(frames_, (1.2, a1 - a0, 1.2), Lm(T_POWER, o, (a0 + a1) / 2, rail), 0.15)
        for along in (a0 + 0.6, a1 - 0.6):
            chamfered(frames_, (deep - 2.0, 1.0, 0.8), Lm(T_POWER, out, along, rail), 0.12)
        for along, drop in held:
            chamfered(frames_, (deep - 2.0, 1.0, 0.8), Lm(T_POWER, out, along, rail), 0.12)
            for o in (-1, 1):
                frames_.tube(L(T_POWER, out + o * 3.0, along, rail), L(T_POWER, out + o * 3.0, along, station + tall / 2 - drop), 0.3 * IN, 8)
        if station == tiers[0]:
            for along in (a0 + 2.0, (a0 + a1) / 2, a1 - 2.0):  # hangers to the beam
                frames_.tube(L(T_POWER, rails[0], along, rail), L(T_POWER, BEAM_AT + 0.6, along, BEAM_FOOT + 0.15), 0.5 * IN, 8)
        else:
            for along in (lo + 0.6, hi - 0.6):  # posts from the tier above
                for o in rails:
                    frames_.tube(L(T_POWER, o, along, rail), L(T_POWER, o, along, tiers[0] + tall / 2 + 0.9), 0.4 * IN, 8)
    bottle = (out - deep / 2 - 2.4, -6.0, upper)  # spacecraft 4's bottle of oxygen, inboard of the upper tier
    if len(hung) > 1:
        frames_.tube(L(T_POWER, bottle[0], bottle[1], bottle[2] + 4.2), L(T_POWER, rails[0] - 0.3, bottle[1], upper + tall / 2 + 0.9), 0.3 * IN, 8)
    say(
        frames_.build("Equipment_BatteryModule", M["aluminium"], g, sharp_angle=35),
        "Adapter battery module",
        "The frame the batteries hang from, beyond one of the section's two beams: on the fuel cell ships the same place "
        "holds the cells and their tanks. McDonnell's drawings show the beam, the batteries under it in a row and the "
        "drinking water at the row's end; the frame's members here are estimated from them.",
    )
    if fit.battery_module:
        across, (w_out, w_along, w_station) = BATTERY_WATER
        small, (p_out, p_along, p_station) = BATTERY_PRESSURANT
        ball(water, Lm(T_POWER, w_out, w_along, w_station), across / 2, 32, ring=0.5)
        can(water, Lm(T_POWER, p_out, p_along, p_station), small / 2, 9.0, 1.2, 16)
        water.tube(
            L(T_POWER, p_out, p_along + small / 2 - 0.2, p_station), L(T_POWER, w_out - 1.0, w_along - across / 2 + 0.3, w_station), 0.3 * IN, 8
        )
        say(
            water.build("Equipment_WaterTank", M["tank"], g, sharp_angle=None),
            "Drinking water tank",
            "All the drinking water this ship carried in its adapter: one tank at the end of the row of batteries, with a "
            "small bottle of oxygen beside it to push the water forward to the cabin. Two days needed no more. The ships either "
            "side of it had fuel cells, which make water, and two or three big tanks to hold it. That there was one tank, "
            "where it hung and what pushed it are McDonnell's drawing; its size is scaled from that drawing.",
        )
    elif hung:
        for along, station, drop in hung:  # each a drum in two halves bolted together round the middle
            m = Lm(T_POWER, out, along, station - drop + 0.2)
            can(water, m, 3.6, 12.0, 1.6, 20)
            water.lathe(hoop(3.5, 4.2, -0.25, 0.25), 20, matrix=m)
        if len(hung) > 1:
            can(water, Lm(T_POWER, *bottle), 1.6, 9.0, 1.2, 12)
        say(
            water.build("Equipment_WaterTanks", M["tank"], g, sharp_angle=None),
            ("Drinking water tank", "Drinking water tanks")[len(hung) > 1],
            (
                "The drinking water for the flight: one small tank, a drum in two halves bolted together round the middle, "
                "from which the tank in the cabin was refilled. Three orbits needed no more. That there was one, and its "
                "form, are McDonnell's drawing; its size and where it hangs on the battery module are estimated.",
                "Four tanks of drinking water where the three-orbit ship had one, each a drum in two halves bolted together "
                "round the middle, with a bottle of oxygen to push the water forward to the cabin. McDonnell's drawing of "
                "this ship's module shows them in pairs at the ends of the lower row of batteries; their size is estimated.",
            )[len(hung) > 1],
        )


def build_fuel_cells(M, g, insulated: bool = False, row: bool = False, shared_oxygen: bool = False) -> None:
    """The reactant supply system and fuel cell module (Gemini V mission report, 3.1.2.6 and Figure 3.1-5; SEDR 300
    volume 2, Figure 5-6; volume 1, Figure 5-5): two fuel cell sections, each a sealed can of three stacks of 32 cells,
    and the two tanks of supercritical hydrogen and oxygen that feed them, in a row beyond the beam on the side of the
    section away from the OAMS module: the sections at one end, then the hydrogen, then the oxygen. With `row`, the
    module as spacecraft 8 and 9 had it (SEDR 300 volume 2, Figure 5-7): a section, the oxygen, the other section, the
    hydrogen, and the two tanks the smaller ones of a short mission."""
    cells, frames_ = MeshBuilder(), MeshBuilder()
    r, long = FUEL_CELL
    hang = BEAM_FOOT  # the under side of the beam
    cells_at, tanks_at, tanks = (FUEL_CELLS_ROW, RSS_ROW, RSS_TANKS_SHORT) if row else (FUEL_CELLS_AT, RSS_AT, RSS_TANKS)
    for out, along, station in cells_at:
        m = Lm(T_POWER, out, along, station)
        can(cells, m, r, long, 2.2, 28)
        for s in (-1, 1):  # the band at each end that its dome is clamped on by
            cells.lathe(hoop(r - 0.1, r + 0.35, s * (long / 2 - 3.0) - 0.7, s * (long / 2 - 3.0) + 0.7), 28, matrix=m)
            # and the strap it is held in, with an arm in to a post that hangs from the beam
            frames_.lathe(hoop(r + 0.05, r + 0.32, s * 6.0 - 0.5, s * 6.0 + 0.5), 28, matrix=m)
            frames_.tube(L(T_POWER, out - r - 0.2, along, station + s * 6.0), L(T_POWER, BEAM_AT + 1.4, along, station + s * 6.0), 0.4 * IN, 8)
        frames_.tube(L(T_POWER, BEAM_AT + 1.4, along, station - 8.0), L(T_POWER, BEAM_AT + 1.4, along, hang + 0.15), 0.6 * IN, 8)
        cells.lathe(prof([(2.6, -long / 2 + 0.4), (2.6, -long / 2 - 1.2), (0.0, -long / 2 - 1.2)][::-1]), 16, matrix=m)  # its accessory pad, aft
    say(
        cells.build("Equipment_FuelCells", M["aluminium"], g, sharp_angle=35),
        "Fuel cell sections",
        "Two sealed cans, each holding three stacks of 32 cells. In each cell hydrogen and oxygen meet across a sheet of "
        "plastic a tenth of an inch thick that lets only the hydrogen's nuclei through; the electrons have to go round by the "
        "wire, and that is the ship's power. What comes out the other side is water. Batteries enough for eight days would "
        "have weighed more than the ship could lift, so this was the flight the fuel cell had to work on, and it did, on "
        "less oxygen pressure than anyone had planned to try. That there are two sections of three stacks, and that they "
        "stand at one end of this module with the two tanks beside them, are documented; their size is scaled from "
        "McDonnell's sketch.",
    )
    for (out, along, station), across, name, label, about in (
        (
            tanks_at[0],
            tanks[0],
            "Hydrogen",
            "Fuel cell hydrogen tank",
            "Hydrogen for the fuel cells, 23 lb of it at launch, kept so cold and so squeezed that it is neither liquid nor "
            "gas. It behaved as predicted for the whole flight, except that what boiled off had to be vented, and the "
            "venting turned the drifting ship slowly over until the eighth day. Its weight is documented, and that it is "
            "the middle one of the module's row; the tank's size is worked from the weight, with a guess at the insulation.",
        ),
        (
            tanks_at[1],
            tanks[1],
            "Oxygen",
            "Fuel cell oxygen tank",
            "Oxygen for the fuel cells: 178 lb at launch, at 815 lb to the square inch. A heater inside is meant to keep the "
            "pressure up as the oxygen is drawn off. At 25 minutes 51 seconds into the flight the heater's circuit shorted "
            "and it never worked again. The pressure fell from 853 lb to the square inch to about 70 in four hours, the "
            "ship was powered down, the pod it had come to chase was abandoned, and Houston came within two hours of bringing "
            "the crew home. Then the pressure steadied, where the oxygen was part liquid and part gas, and the cells went on "
            "working on it for seven more days. Its weight and pressures are documented, and that it is at the end of the "
            "module's row; the tank's size is worked from the weight, with a guess at the insulation.",
        ),
    ):
        tank = MeshBuilder()
        if shared_oxygen and name == "Oxygen":
            name, label = "PrimaryOxygen", "Primary oxygen for crew and fuel cells"
            about = "One tank supplied breathing oxygen and fuel-cell reactant on spacecraft 10 through 12. "
            about += "Its module is documented in Gemini X figure 3.1-2; the envelope is estimated."
        wrap = MYLAR if insulated and name == "Hydrogen" else 0.0  # (spacecraft 7's hydrogen tank under its fifty layers of mylar)
        rr = across / 2 + wrap
        m = Lm(T_POWER, out, along, station)
        sphere(tank, m.translation, rr * IN, 40)
        mesh_name = "Equipment_PrimaryOxygen" if name == "PrimaryOxygen" else f"Equipment_Rss{name}"
        say(tank.build(mesh_name, M["silver" if wrap else "tank"], g, sharp_angle=None), label, about)
        # the band round its middle with what is fastened to it (heater, sensors, switches), and two struts up to the beam
        frames_.lathe(hoop(rr - 0.1, rr + 0.45, -0.4, 0.4), 40, matrix=m)
        for k in (-2, -1, 1, 2):
            chamfered(
                frames_,
                (1.5, 1.7, 1.5),
                Lm(T_POWER, out, along, station)
                @ Matrix.Rotation(math.pi + k * 0.42, 4, "Z")
                @ Matrix.Translation(Vector((rr + 0.9, 0.0, -0.9)) * IN),
                0.15,
            )
        for e in (-1, 1):
            frames_.tube(
                L(T_POWER, out - rr * 0.94, along + e * rr * 0.36, station + 0.2),
                L(T_POWER, BEAM_AT + 0.4, along + e * 4.0, hang + 0.15),
                0.5 * IN,
                8,
            )
    # the reactants' shutoff valves, on the beam between the two tanks (in a row of four, between the hydrogen and the section beside it)
    mid = (tanks_at[0][1] + cells_at[1][1]) / 2 - 1.2 if row else (RSS_AT[0][1] + RSS_AT[1][1]) / 2
    chamfered(frames_, (2.2, 6.0, 2.2), Lm(T_POWER, BEAM_AT + 2.6, mid, hang - 1.4), 0.2)
    for e in (-1, 1):
        frames_.tube(L(T_POWER, BEAM_AT + 2.6, mid + e * 1.5, hang - 2.4), L(T_POWER, BEAM_AT + 2.6, mid + e * 1.5, hang - 4.0), 0.6 * IN, 10)
        frames_.tube(L(T_POWER, BEAM_AT + 2.6, mid + e * 1.5, hang - 0.8), L(T_POWER, BEAM_AT + 1.0, mid + e * 1.5, hang + 0.15), 0.4 * IN, 8)
    say(
        frames_.build("Equipment_RssStructure", M["aluminium"], g, sharp_angle=35),
        "Fuel cell module structure",
        "What holds the fuel cells and their two tanks to the beam: a strap round each can, a band round the middle of each "
        "tank carrying its heater, its sensors and its pressure switch, and between the tanks the two valves that shut the "
        "hydrogen and the oxygen off. McDonnell's drawing of the module shows all of it; nothing in it is dimensioned.",
    )


def build_module_water_tank(M, g, late: bool = False) -> None:
    """Water tank A of a ship from spacecraft 8 on (Gemini VIII mission report, 3.1.2.3.5 and Figure 3.1-2; SEDR 300
    volume 2, Figure 6-10 sheet 6): a ball of the same pattern as the one in the retrograde section, hung on the fuel
    cell module. It takes the water the fuel cells make."""
    out, along, station = (19.5, -11.0, 36.0) if late else WATER_A
    r = WATER_C[0] / 2
    here = Lm(T_POWER, out, along, station)
    tank, straps = MeshBuilder(), MeshBuilder()
    ball(tank, here, r, 32, ring=0.6)
    say(
        tank.build("Equipment_WaterTankA", M["tank"], g, sharp_angle=None),
        "Water tank A",
        "One of the ship's two water tanks, each able to hold 42 lb: two aluminium half-shells with a titanium ring "
        "between them and a diaphragm at each joint. This one went up holding only nitrogen. The water the fuel cells "
        "make is acid, which is why the ring is titanium; it is piped in between the diaphragms of both tanks, and in "
        "the other tank, in the section forward of this one, it pushes the drinking water out to the crew. That there "
        "were two, what each held and that this one was in this section are documented; its size is worked from the "
        "42 lb, and its place on the fuel cell module is read off McDonnell's sketch.",
    )
    for e in (-1, 1):  # two struts from its ring up to the beam
        straps.tube(
            L(T_POWER, out - r * 0.8, along + e * r * 0.55, station + 0.3), L(T_POWER, BEAM_AT + 0.6, along + e * 2.5, BEAM_FOOT + 0.15), 0.4 * IN, 8
        )
    straps.build("Equipment_WaterTankASupport", M["aluminium"], g, sharp_angle=35)


def build_ecs_module(M, g, oxidizer: bool = False) -> None:
    """The environmental control system's two modules (Technical Summary, Figure 4): the primary oxygen under its own
    panel of the blast shield, at one end of the space between the beams, and the coolant pump module, a frame
    against the wall aft of it between Z28.61 and Z41.17."""
    oxygen, frames_, pumps = MeshBuilder(), MeshBuilder(), MeshBuilder()
    out, station, r = PRIMARY_OXYGEN
    if oxidizer:
        r = 11.0  # Gemini X report, §3.1.2.7.1, diameter 22 in
    here = Lm(T_ECS, out, 0.0, station)
    ball(oxygen, here, r, 32, ring=0.45)
    say(
        oxygen.build("Equipment_ExtraOxidizer" if oxidizer else "Equipment_PrimaryOxygen", M["tank"], g, sharp_angle=None),
        "Additional oxidizer tank" if oxidizer else "Primary oxygen",
        "The 22-inch oxidizer sphere on the former primary oxygen mount. The cylindrical reserve tank was a separate vessel."
        if oxidizer
        else "The oxygen the crew breathe in orbit, kept so cold and so squeezed that it is neither liquid nor gas: 15.3 lb of it "
        "on this flight. When this section is cut away before retrofire they go on to a smaller supply in the re-entry "
        "module. McDonnell's drawing puts it under its own panel of the blast shield, at one end of the space between the "
        "two beams; its size is estimated.",
    )
    for k in range(3):  # three struts up to its panel, each from a lug on the band
        turn = here @ Matrix.Rotation(TAU * k / 3 + 0.5, 4, "Z")
        chamfered(frames_, (1.6, 1.3, 1.0), turn @ Matrix.Translation(Vector((r + 0.95, 0.0, 0.0)) * IN), 0.12)
        foot = Vector((r + 1.15, 0.0, 0.0))
        frames_.tube(turn @ (foot * IN), turn @ ((foot + Vector((0.0, 0.0, Z_BLAST - SHIELD_THICK + 0.2 - station))) * IN), 0.4 * IN, 8)
    # the coolant pump module: a frame of tube, with the two pump packages, the reservoir and a heat exchanger in it
    (s0, s1), (theta, inner, outer, wide) = PUMP_MODULE, PUMP_MODULE_AT
    k = 0.6
    corners = [(o, a, s) for o in (inner + k, outer - k) for a in (-wide / 2 + k, wide / 2 - k) for s in (s0 + k, s1 - k)]
    for i, p in enumerate(corners):
        for q in corners[i + 1 :]:
            if sum(abs(x - y) > 1e-6 for x, y in zip(p, q)) == 1:  # an edge of the box
                frames_.tube(L(theta, *p), L(theta, *q), k * IN, 8)
    for a in (-1, 1):  # and the two rods that steady it from the wall above
        frames_.tube(L(theta, outer - k, a * (wide / 2 - k), s1 - k), L(theta, outer + 1.2, a * (wide / 2 - k), s1 + 9.0), 0.4 * IN, 8)
        frames_.tube(L(theta, outer - k, a * (wide / 2 - k), s0 + k), L(theta, outer + 5.0, a * (wide / 2 - k), s0 + k), 0.5 * IN, 8)
    can(pumps, Lm(theta, outer - 4.6, 0.0, s0 + 7.4) @ Matrix.Rotation(-math.pi / 2, 4, "X"), 3.2, 18.0, 2.0, 20)  # the reservoir
    for a in (-1, 1):
        m = Lm(theta, inner + 4.2, a * 6.0, s0 + 3.8) @ Matrix.Rotation(-math.pi / 2, 4, "X")
        can(pumps, m, 2.4, 9.0, 0.8, 16)  # a pump package: two pumps and their motors in one case
        pumps.lathe(hoop(2.3, 2.9, -0.4, 0.4), 16, matrix=m)
        pumps.tube(L(theta, inner + 4.2, a * 8.2, s0 + 5.0), L(theta, inner + 4.2, a * 8.2, s0 + 8.0), 0.5 * IN, 8)
    chamfered(pumps, (5.6, 15.0, 3.6), Lm(theta, inner + 4.4, 0.0, s1 - 3.4), 0.25)  # the heat exchanger
    for i in range(9):
        chamfered(pumps, (6.0, 0.3, 4.0), Lm(theta, inner + 4.4, (i - 4) * 1.6, s1 - 3.4), 0.05)
    frames_.build("Equipment_EcsStructure", M["aluminium"], g, sharp_angle=35)
    say(
        pumps.build("Equipment_CoolantModule", M["equipment"], g, sharp_angle=35),
        "Coolant pump module",
        "The pumps that keep the ship's coolant moving: out through the cabin, the suits and the electronics to take up their "
        "heat, and back through the hollow stringers of this adapter's skin to lose it to space. Two circuits, each with two "
        "pumps, and a reservoir the coolant comes back to. McDonnell's drawing shows the module as a frame "
        "against the wall and gives the stations it lies between; what is in the frame is listed in his manual, and its "
        "forms and places here are estimated.",
    )


def build_electronic_module(M, g) -> None:
    """The electronic module (Technical Summary, Figure 4): at the other end of the space between the beams from the
    primary oxygen, the adapter's electronics hung under their own panel of the blast shield."""
    boxes, rack = MeshBuilder(), MeshBuilder()
    under = Z_BLAST - SHIELD_THICK
    for (out, along, station), size in ELECTRONICS:
        m = Lm(T_ELECTRONIC, out, along, station)
        chamfered(boxes, size, m, 0.3)
        chamfered(
            boxes, (size[0] - 1.4, size[1] - 1.4, 0.4), m @ Matrix.Translation(Vector((0.0, 0.0, -size[2] / 2 - 0.08)) * IN), 0.1
        )  # its cover, aft
        for i in (-1, 0, 1):  # its connectors, on the face toward the middle of the ship
            at = m @ (Vector((-size[0] / 2, i * size[1] * 0.26, size[2] * 0.12)) * IN)
            boxes.lathe(prof([(0.62, -0.2), (0.62, 0.9), (0.0, 0.9)]), 10, matrix=frame(at, m.to_3x3() @ Vector((-1.0, 0.0, 0.0))))
        for o in (-1, 1):  # and the two hangers it is held to the rack by
            rack.tube(
                m @ (Vector((o * (size[0] / 2 - 1.0), 0.0, size[2] / 2 - 0.1)) * IN),
                L(T_ELECTRONIC, out + o * (size[0] / 2 - 1.0), along, under - 0.9),
                0.45 * IN,
                8,
            )
    say(
        boxes.build("Equipment_Modules", M["equipment"], g, sharp_angle=35),
        "Electronic module",
        "The electronics that are wanted only in orbit and can be left behind: among them a radar beacon that the ground tracks "
        "the ship by, one of the three telemetry transmitters and a diplexer for the UHF antennas. They hang under their own "
        "panel of the blast shield. That there is an "
        "electronic module on this side of the section is McDonnell's drawing; which box is where, and every box's size, "
        "is a guess.",
    )
    for out in sorted({o + s * (size[0] / 2 - 1.0) for (o, _, _), size in ELECTRONICS for s in (-1, 1)}):
        chamfered(rack, (1.2, 26.0, 0.8), Lm(T_ELECTRONIC, out, 0.0, under - 0.55), 0.12)
    rack.tube(L(T_ELECTRONIC, DOOR_HALF + 2.4, 0.0, under - 0.94), L(T_ELECTRONIC, 41.0, 0.0, under - 0.94), 0.6 * IN, 10)  # the wire bundle along it
    rack.build("Equipment_ModuleFrame", M["aluminium"], g, sharp_angle=35)


def build_adapter_experiments(M, g, fit: Fit) -> None:
    """What a flight's experiments put in the equipment section: under the access door, in the clear middle, looking
    out of the back through an opening in the cover (NASA S65-63221 shows spacecraft 7's so)."""
    under = Z_BLAST - SHIELD_THICK
    foot = COVER_HOOP[1]
    if "proton-electron-spectrometer" in fit.experiments:
        mb = MeshBuilder()
        along, body = -1.8, foot + 6.5  # (its body's middle)
        here = Lm(T_OAMS, 0.0, along, body)
        chamfered(mb, (7.0, 7.0, 6.0), here, 0.3)
        mb.lathe(prof([(0.0, -5.2), (1.6, -5.2), (1.6, -5.6), (2.4, -5.6), (2.4, -3.0)]), 16, matrix=here)  # its aperture, looking aft
        for o in (-1, 1):
            for a in (-1, 1):  # the four legs it stands off the door on
                mb.tube(here @ (Vector((o * 2.6, a * 2.6, 2.9)) * IN), L(T_OAMS, o * 4.6, along + a * 4.6, under + 0.2), 0.4 * IN, 8)
        say(
            mb.build("Experiment_Spectrometer", M["equipment"], g, sharp_angle=35),
            "Proton-electron spectrometer",
            "Experiment MSC-2: a counter for the protons and electrons of the inner radiation belt, which dips to the ship's "
            "height over the South Atlantic. It stands off the middle of the blast shield and looks out of the back of the "
            "ship through an opening in the gold cover, where there is nothing between it and space once the Titan has "
            "gone. It was switched on for the passes through the anomaly. Where it is, and that it faces aft, are "
            "documented; it weighed 12.5 lb; its form here is estimated.",
        )
    if "magnetometer" in fit.experiments:
        mb = MeshBuilder()
        along = 3.9
        mb.tube(L(T_OAMS, 0.0, along, foot + 2.6), L(T_OAMS, 0.0, along, under - 2.0), 0.7 * IN, 10)
        mb.tube(L(T_OAMS, 0.0, along, foot + 6.5), L(T_OAMS, 0.0, along, under - 1.6), 1.0 * IN, 10)
        chamfered(mb, (2.6, 2.6, 3.4), Lm(T_OAMS, 0.0, along, foot + 1.9), 0.2)
        for o in (-1, 1):
            mb.tube(L(T_OAMS, o * 0.8, along, under - 2.4), L(T_OAMS, o * 3.0, along + 2.0, under + 0.2), 0.35 * IN, 8)
        say(
            mb.build("Experiment_Magnetometer", M["aluminium"], g, sharp_angle=35),
            "Magnetometer boom",
            "Experiment MSC-3: three flux-gate sensors on the end of a boom, to find which way the Earth's magnetic field ran "
            "past the ship while the spectrometer counted, since particles in the belt spiral along the field. In orbit the "
            "pilot threw a switch, a guillotine cut the cable that held the boom, and it ran out through the gold cover and "
            "past the end of the adapter, to get the sensors clear of the ship's own iron. It could not be drawn back. The "
            "boom and that it pointed aft are documented; a photograph of Gemini 7 from behind shows it run out from the "
            "middle of the cover, beside the spectrometer, which is where it is stowed here; its form is estimated.",
        )


def build_donning_station(M, g, fit: Fit) -> None:
    """What a man was to hold and stand on at the back of the adapter while he put the backpack on (Gemini VIII mission
    report, 3.1.2.12.1 and Figure 3.1-10; Gemini IX-A mission report, Figures 3.1-6 and 8.1-19; SEDR 300 volume 2,
    p. 16-25 and Figure 16-2 sheet 2; NASA SP-149, pp. 5-6 and 5-7 and Figure 5.2-2): two hand bars, one to either hand,
    and a foot rail, each sprung and held folded against the gold cover by a cable until the thermal cover was thrown
    off; a floodlight at the foot of each hand bar; and a guide at the rim for the umbilical to run over. Built folded,
    as the ship left the pad."""
    rim = COVER_RIM[0] - 2.2
    gather = gather_of(fit)
    bars, feet, lens, guide = (MeshBuilder() for _ in range(4))

    def on(theta: float, r: float, lift: float = 1.5) -> Vector:
        """A point `lift` inches aft of the cloth, `r` from the axis on the line `theta` round from the top."""
        return (radial(theta) * r + Vector((0.0, 0.0, zz(cover_station(r, gather(theta))) - lift))) * IN

    def folded(about: float, spec: tuple[float, float, float], into: MeshBuilder) -> list[tuple[float, float]]:
        """A bar across the line `about`, on two arms from the rim. Returns where its arms' feet are: (angle, radius)."""
        half, out, reach = spec
        ends = []
        for e in (-1, 1):
            bar = radial(about) * out + radial(about + math.pi / 2) * (e * reach)
            ta, ra = math.atan2(bar.y, bar.x), bar.length
            ends.append(on(ta, ra))
            into.tube(on(about + e * half, rim), on(ta, ra), HANDBAR_R * IN, 12)
            sphere(into, on(ta, ra), (HANDBAR_R + 0.12) * IN, 12)  # (the elbow)
        into.tube(ends[0], ends[1], HANDBAR_R * IN, 12)
        return [(about + e * half, rim) for e in (-1, 1)]

    hinges = []
    for about in (T_OAMS, T_POWER):
        hinges += folded(about, HANDBAR, bars)
    hinges += folded(T_ECS, FOOT_RAIL, bars if fit.backpack != "amu" else feet)
    if fit.backpack == "amu":
        # (spacecraft 9: "two aluminum stirrups were installed on the footbar": Gemini IX-A mission report, 3.1.2.12.1)
        half, out, reach = FOOT_RAIL
        for e in (-1, 1):
            at = radial(T_ECS) * out + radial(T_ECS + math.pi / 2) * (e * reach * 0.45)
            ta, ra = math.atan2(at.y, at.x), at.length
            n = 10
            loop = [
                on(ta, ra - 3.4 * math.sin(math.pi * k / n), 1.5 + 2.6 * math.sin(math.pi * k / n))
                + radial(T_ECS + math.pi / 2) * (2.2 * math.cos(math.pi * k / n) * IN)
                for k in range(n + 1)
            ]
            for p0, p1 in zip(loop, loop[1:]):
                feet.tube(p0, p1, 0.3 * IN, 8, caps=False)
    for theta, r in hinges:  # the fitting each arm is hinged on, at the rim
        chamfered(feet, (2.6, 2.2, 2.0), frame(on(theta, r + 0.4, 1.3), (0.0, 0.0, -1.0)) @ Matrix.Rotation(theta, 4, "Z"), 0.2)
    for about in (T_OAMS, T_POWER):  # a floodlight at one foot of each hand bar, looking in at the middle
        theta = about - HANDBAR[0]
        at = on(theta, rim - 3.6, 2.4)
        aim = (Vector((0.0, 0.0, at.z - 3.0 * IN)) - at).normalized()
        feet.lathe(prof([(0.0, -1.6), (1.1, -1.6), (1.1, 0.0), (1.35, 0.3)]), 14, matrix=frame(at, aim))
        lens.lathe(prof([(1.3, 0.3), (0.9, 0.62), (0.0, 0.7)]), 14, matrix=frame(at, aim))
    # the umbilical guide, at the rim where the aft handrail ends: a horn for the hose to bend over
    theta = HANDRAILS[0]
    n = 8
    horn = [
        on(theta, COVER_RIM[0] + 0.6 - 2.4 * (1 - math.cos(math.pi / 2 * k / n)), 0.5 + 2.4 * math.sin(math.pi / 2 * k / n)) for k in range(n + 1)
    ]
    for e in (-1, 1):
        side = radial(theta + math.pi / 2) * (e * 1.6 * IN)
        for p0, p1 in zip(horn, horn[1:]):
            guide.tube(p0 + side, p1 + side, 0.32 * IN, 8, caps=False)
    guide.tube(horn[-1] - radial(theta + math.pi / 2) * (1.6 * IN), horn[-1] + radial(theta + math.pi / 2) * (1.6 * IN), 0.32 * IN, 8)
    say(
        bars.build("Equipment_HandBars", M["cover"], g, sharp_angle=None),
        "Hand bars and foot rail" if fit.backpack != "amu" else "Hand bars",
        "Two bars of tube 1.38 in across, one for either hand, on arms hinged at the adapter's rim. They are built folded "
        "flat against the gold cover, which is how they went up: they had to clear the dome of the Titan's tank, which "
        "stands up into the adapter until the ship leaves it. A cable holds them down. When the switch in the cabin is "
        "thrown a guillotine cuts the cable, springs swing them out and they latch, and a man at the back of the ship "
        "has something to hold while he backs into the pack. The tube's size is documented; the bars' lengths and "
        "where they lie are scaled from the reports' sketches.",
    )
    if feet.verts:
        say(
            feet.build("Equipment_FootRail" if fit.backpack == "amu" else "Equipment_BarFittings", M["aluminium"], g, sharp_angle=35),
            "Foot rail and stirrups" if fit.backpack == "amu" else "Bar hinges and floodlights",
            "A rail for the feet, folded against the cover like the hand bars and sprung out with them, toward the crew's "
            "left. On this ship two aluminium stirrups were added to it, to hold a man's boots while he used both hands "
            "on the pack. That they were added is documented; their form, the rail's length and where it lies are "
            "scaled from sketches. The fittings at the rim are the bars' hinges, and the two lamp housings the "
            "floodlights for working here at night."
            if fit.backpack == "amu"
            else "The fittings at the rim that the hand bars and the foot rail are hinged on, and the housings of the two "
            "floodlights for working here at night. Their forms are estimated.",
        )
    lens.build("Equipment_Floodlights", M["beacon"], g, sharp_angle=35)
    say(
        guide.build("Equipment_UmbilicalGuide", M["aluminium"], g, sharp_angle=35),
        "Umbilical guide",
        "A horn at the rim of the adapter, at the end of the handrail, for the umbilical to bend over: the adapter's "
        "edge is where the Titan was cut away, and it is sharp. It comes out with the hand bars. That there was one "
        "at the rear of the handrail is documented; its form is estimated.",
    )


def build_torque_box(M, g) -> None:
    """What a backpack hung from (Gemini IX-A mission report, 8.1.5 and Figure 8.1-18): a sheet metal torque box on the
    blast shield's access door, reaching aft to Z56.27, to which the pack's four-legged claw was pulled down by one
    bolt. A guillotine cut the bolt when the pack had been put on."""
    under = Z_BLAST - SHIELD_THICK
    long, wide = TORQUE_BOX
    mb = MeshBuilder()
    mid = (under - 0.15 + BACKPACK_HEAD) / 2
    chamfered(mb, (long, wide, under - 0.15 - BACKPACK_HEAD), Lm(T_ECS, 0.0, 0.0, mid), 0.35)
    for o in (-1, 1):
        for a in (-1, 1):  # the flange it is bolted to the door by, and its lightening holes' rims
            chamfered(mb, (2.4, 2.4, 0.5), Lm(T_ECS, o * (long / 2 + 0.6), a * (wide / 2 - 1.6), under - 0.42), 0.1)
        mb.lathe(hoop(1.5, 1.9, -0.1, 0.25), 16, matrix=Lm(T_ECS, o * long / 2, 0.0, mid) @ Matrix.Rotation(o * math.pi / 2, 4, "Y"))
    mb.tube(L(T_ECS, 0.0, 0.0, BACKPACK_HEAD + 0.2), L(T_ECS, 0.0, 0.0, BACKPACK_HEAD - 1.4), 0.9 * IN, 12)  # the guillotine round the bolt
    say(
        mb.build("Equipment_TorqueBox", M["aluminium"], g, sharp_angle=35),
        "Backpack torque box",
        "A sheet metal box on the blast shield's access door, in the middle of the section, reaching aft to station "
        "Z56.27: what the pack hangs from. Four legs on the pack's back seat on it and one bolt through the middle pulls "
        "them down. Round the bolt is a guillotine, fired from the cabin when the man has the pack on, and that is the "
        "last thing that holds him to the ship but his tether. That it was there, its stations and that the bolt was cut "
        "are documented; how wide it was is scaled from the report's drawing.",
    )


def build_backpack(M, kind: str) -> None:
    """The backpack at the back of the adapter, and the thermal cover over its opening: spacecraft 8's Extravehicular
    Support Package (Gemini VIII mission report, 3.1.2.12.4 and Figure 3.1-11; NASA release 66-52, pp. 40 to 43) or
    spacecraft 9's Astronaut Maneuvering Unit (Gemini IX-A mission report, 8.1 and Figures 8.1-2, 8.1-18 and 8.1-19;
    NASA release 66-97, pp. 22 and 23). A node of its own: it was to leave with the man. Its frame: x toward the
    wearer's feet, y to his left as he stands in it facing aft, z toward the ship's nose."""
    g = group({"esp": "ExtravehicularSupportPackage", "amu": "ManeuveringUnit"}[kind])
    high, wide, deep = BACKPACKS[kind]
    half, _, s0 = BACKPACK_OPENING
    # the thermal cover over the opening, which rested on the pack and was held by one line through its middle
    cover, straps = MeshBuilder(), MeshBuilder()
    n = 64
    edge = [
        (backpack_outline(TAU * i / n, 1.0) * math.cos(TAU * i / n), backpack_outline(TAU * i / n, 1.0) * math.sin(TAU * i / n)) for i in range(n)
    ]
    slab(cover, edge, s0 - 1.15, s0 - 0.7, T_ECS, 0.15)
    for k in (-1, 1):  # two stiffeners across it, and the fitting in its middle the line comes to
        chamfered(straps, (1.1, 2 * BACKPACK_OPENING[1] - 1.0, 0.4), Lm(T_ECS, k * half * 0.45, 0.0, s0 - 1.27), 0.1)
    straps.lathe(prof([(0.0, -0.75), (1.3, -0.75), (1.3, 0.0)]), 16, matrix=Lm(T_ECS, 0.0, 0.0, s0 - 1.15))
    say(
        cover.build("Backpack_ThermalCover", M["gold"], g, sharp_angle=35),
        "Thermal cover",
        "The gold cloth across the back of the adapter is gathered, on this ship, to an oblong opening in the middle, and "
        "this cover closes the opening until it is wanted. It rests against the pack behind it and is held by one line "
        "through the pack's middle. The switch that springs the hand bars out cuts the line and lets it go. That it was "
        "so held and so released is documented; its outline is scaled from a photograph of the adapter with the cover "
        "off, and its thickness is a guess.",
    )
    straps.build("Backpack_ThermalCoverFittings", M["aluminium"], g, sharp_angle=35)
    if not interior():
        return  # (it is behind its cover: from far off there is only the cover)
    mid = BACKPACK_HEAD - deep / 2
    here = Lm(T_ECS, 0.0, 0.0, mid)
    at = lambda x, y, z: here @ (Vector((x, y, z)) * IN)  # noqa: E731
    box = lambda mb, size, x, y, z, bevel=0.2: chamfered(mb, size, here @ Matrix.Translation(Vector((x, y, z)) * IN), bevel)  # noqa: E731
    shell, trim_, gold, lamps = (MeshBuilder() for _ in range(4))
    aft = -deep / 2  # the face the man backs up to
    # its four legs to the torque box, on its back
    for o in (-1, 1):
        for a in (-1, 1):
            trim_.tube(
                at(o * TORQUE_BOX[0] * 0.42, a * TORQUE_BOX[1] * 0.42, deep / 2 - 0.2),
                at(o * TORQUE_BOX[0] * 0.3, a * TORQUE_BOX[1] * 0.3, deep / 2 + 1.2),
                0.45 * IN,
                8,
            )
    if kind == "amu":
        box(shell, (high, wide, deep - 2.4), 0.0, 0.0, 1.2, 0.8)
        # the cradle a man sits back into: a pad for his back between two cheeks, and a seat at its foot
        box(shell, (high * 0.62, wide * 0.5, 1.6), -high * 0.1, 0.0, aft + 1.9, 0.5)
        for e in (-1, 1):
            box(shell, (high * 0.62, 2.6, 3.4), -high * 0.1, e * (wide * 0.25 + 1.6), aft + 1.7, 0.6)
        box(shell, (3.2, wide * 0.62, 4.6), high * 0.27, 0.0, aft + 2.3, 0.6)
        # the two sidearm controllers, folded up along its sides, a controller's head at the end of each
        for e in (-1, 1):
            box(shell, (15.0, 1.5, 2.2), -high * 0.08, e * (wide / 2 + 0.9), aft + 4.2, 0.3)
            box(trim_, (3.4, 2.2, 3.0), -high * 0.08 - 9.0, e * (wide / 2 + 1.0), aft + 4.4, 0.35)
            trim_.tube(
                at(-high * 0.08 - 10.4, e * (wide / 2 + 1.0), aft + 4.4), at(-high * 0.08 - 12.2, e * (wide / 2 + 1.0), aft + 3.6), 0.4 * IN, 8
            )
        # twelve thrust chambers in its corners: four that fire forward and four aft, two up and two down
        for o in (-1, 1):
            for e in (-1, 1):
                for way, z in ((-1, aft + 2.6), (1, deep / 2 - 1.4)):
                    m = (
                        here
                        @ Matrix.Translation(Vector((o * (high / 2 - 1.5), e * (wide / 2 - 1.5), z)) * IN)
                        @ Matrix.Rotation(0.0 if way > 0 else math.pi, 4, "X")
                    )
                    trim_.lathe(prof([(0.0, 0.0), (0.45, 0.0), (0.45, 0.9), (0.8, 1.9)]), 12, matrix=m)
            for e in (-1, 1):  # (up and down)
                m = (
                    here
                    @ Matrix.Translation(Vector((o * (high / 2 - 0.2), e * (wide / 2 - 4.5), 1.5)) * IN)
                    @ Matrix.Rotation(o * math.pi / 2, 4, "Y")
                )
                trim_.lathe(prof([(0.0, 0.0), (0.45, 0.0), (0.45, 0.9), (0.8, 1.7)]), 12, matrix=m)
        # the extensions that carry the upper forward chambers' exhaust clear of his helmet and shoulders, folded on its top
        for e in (-1, 1):
            gold.tube(at(-high / 2 - 1.0, e * (wide / 2 - 2.2), aft + 3.0), at(-high / 2 - 1.0, e * (wide / 2 - 2.2), aft + 10.5), 0.7 * IN, 12)
        # its antenna, a wedge on its top, and four green running lights
        box(trim_, (2.2, 5.0, 6.0), -high / 2 - 1.0, 0.0, 2.5, 0.5)
        for x, y in ((-high / 2 + 2.0, wide / 2 - 2.6), (-high / 2 + 2.0, -(wide / 2 - 2.6)), (high / 2 - 2.0, 0.0), (-high / 2 + 1.0, 0.0)):
            lamps.lathe(prof([(0.6, 0.0), (0.6, 0.35), (0.0, 0.6)]), 12, matrix=here @ Matrix.Translation(Vector((x, y, deep / 2 - 1.2)) * IN))
        label = "Astronaut Maneuvering Unit"
        about = (
            "The Air Force's backpack: an aluminium box 32 in high, 22 wide and 19 deep, 166 lb loaded, with a cradle a "
            "man sits back into. Twelve small thrusters in its corners, each of about 2.3 lb, burn hydrogen peroxide: "
            "four fire forward, four aft, two up and two down, worked from two controllers on arms that fold out to "
            "either hand. It carries its own oxygen, its own batteries and its own radio. It hangs here by four legs on "
            "a torque box, held by one bolt. Its size, weight and thrusters are documented; its outside is drawn from "
            "the reports' figures, which are sketches and dark photographs, and is estimated."
        )
    else:
        box(shell, (high, wide, deep - 2.0), 0.0, 0.0, 1.0, 1.2)
        box(shell, (high * 0.8, wide * 0.72, 2.4), 0.0, 0.0, aft + 1.9, 0.7)  # the pad his back comes against
        # the bag the 75 ft tether is folded in, on its top
        box(shell, (4.2, wide * 0.7, deep * 0.55), -high / 2 - 2.0, 0.0, 0.5, 1.0)
        # the hand-held manoeuvring unit, stowed on its side: a handle, and its two arms folded back along it
        y = -(wide / 2 + 1.5)  # (on the side away from the manoeuvring system's tanks, where there is room)
        box(trim_, (9.0, 1.6, 2.0), -1.0, y, 0.0, 0.3)
        trim_.tube(at(3.6, y, 0.0), at(5.6, y, 0.0), 0.55 * IN, 10)
        for k in (-1, 1):
            trim_.tube(at(-5.0, y, k * 1.2), at(6.4, y - 0.6, k * 1.2), 0.22 * IN, 8)
        # the hose from the pack to the unit, and the two bottles' necks on its foot: oxygen to breathe, Freon to fly on
        n = 12
        loop = [
            at(-high * 0.3 + 5.0 * math.cos(math.pi * k / n), y - 0.9 - 1.4 * math.sin(math.pi * k / n), 3.4 + 2.0 * math.sin(math.pi * k / n))
            for k in range(n + 1)
        ]
        for p0, p1 in zip(loop, loop[1:]):
            gold.tube(p0, p1, 0.35 * IN, 8, caps=False)
        for e in (-1, 1):
            trim_.lathe(
                prof([(0.0, 0.0), (1.5, 0.0), (1.5, 1.0), (0.7, 1.6), (0.7, 2.4)]),
                14,
                matrix=here @ Matrix.Translation(Vector((high / 2, e * wide * 0.22, 1.0)) * IN) @ Matrix.Rotation(math.pi / 2, 4, "Y"),
            )
        trim_.tube(
            at(-high / 2 + 1.0, wide / 2 - 1.5, deep / 2 - 2.0), at(-high / 2 - 8.0, wide / 2 - 1.5, deep / 2 - 2.0), 0.18 * IN, 6
        )  # its radio's antenna
        label = "Extravehicular Support Package"
        about = (
            "A backpack 26 in high, 21 wide and 17 deep, 92 lb: two bottles at 5,000 lb to the square inch, one of 7 lb "
            "of oxygen for the man to breathe and one of 18 lb of Freon for the gun in his hand to blow out, with a "
            "battery, a radio and 75 ft of tether in a bag. With it on and the ship's own hose let go, the man would "
            "have been joined to the ship by that tether alone, for eighty minutes at most. It hangs here by four "
            "legs on a torque box, held by one bolt. Its size, weight and what it held are documented; that it hung "
            "as the next ship's pack did is assumed; its outside is drawn from the report's sketch and is estimated."
        )
    say(shell.build("Backpack_Shell", M["cover"], g, sharp_angle=35), label, about)
    say(trim_.build("Backpack_Fittings", M["aluminium"], g, sharp_angle=35), label, about)
    if gold.verts:
        say(gold.build("Backpack_Hoses", M["gold"], g, sharp_angle=None), label, about)
    if lamps.verts:
        lamps.build("Backpack_RunningLights", M["beacon"], g, sharp_angle=35)


def build_pod_mount(M, g) -> None:
    """What spacecraft 5's rendezvous evaluation pod was thrown from, which stayed with the ship (SEDR 300 volume 2,
    Section VIII, pp. 8-298 and 8-299 and Figure 8-80; Gemini VII mission report, 3.1.1.2): the support assembly on the
    blast shield's access door, with the charge that threw the pod out, and the four posts that reach aft past the pod
    to carry its cover."""
    under = Z_BLAST - SHIELD_THICK
    out, along = POD_POSTS
    head = POD_AT + POD_BODY[0] / 2 + 0.75  # the forward face of the pod's own mounting plate
    mb = MeshBuilder()
    chamfered(mb, (2 * out + 2.4, 2 * along + 2.4, 0.8), Lm(T_OAMS, 0.0, 0.0, under - 0.55), 0.15)
    mb.tube(L(T_OAMS, 0.0, 0.0, under - 0.9), L(T_OAMS, 0.0, 0.0, head + 0.15), 1.8 * IN, 16)  # the barrel the charge is in
    for o in (-1, 1):
        for a in (-1, 1):
            mb.tube(L(T_OAMS, o * out, a * along, under - 0.9), L(T_OAMS, o * out, a * along, POD_COVER_Z + 1.5), 0.45 * IN, 10)
            # two posts diagonally opposite end in guide pins, the other two in the sockets the cover's springs were in
            mb.lathe(
                prof([(0.0, 0.0), (0.85 if o == a else 0.6, 0.0), (0.85 if o == a else 0.6, 1.6)]),
                10,
                matrix=Lm(T_OAMS, o * out, a * along, POD_COVER_Z + 1.1),
            )
            mb.tube(L(T_OAMS, o * 1.6, a * 1.6, under - 3.0), L(T_OAMS, o * (out - 0.4), a * (along - 0.4), under - 0.95), 0.35 * IN, 8)
    say(
        mb.build("Equipment_PodMount", M["aluminium"], g, sharp_angle=35),
        "Pod support assembly",
        "What the pod was thrown from: a mount on the blast shield's access door, in the middle of the section, with a charge "
        "in it, and four tubular posts reaching aft past the pod to hold its cover. Two of the posts ended in pins that "
        "kept the cover square; the other two held springs, squeezed by a cable through each. When the switch was pressed "
        "a guillotine cut the cables, the springs threw the cover off at 100 ft a second, and 80 thousandths of a second "
        "later the charge threw the pod after it at 5. That it was on the access door, the posts, the springs and the "
        "speeds are documented; every size is estimated.",
    )


def build_pod(M) -> None:
    """The rendezvous evaluation pod (SEDR 300 volume 2, Section VIII, pp. 8-291 to 8-299 and Figures 8-79 and 8-80;
    Gemini V mission report, 3.1.2.4.2 and Figure 3.1-4b): what an Agena's docking adapter would carry for the radar
    to find, in a package the ship took up with it and threw out. Its transponder, 10 by 10 by 20 in, is the body the
    rest is fastened to. A node of its own: it left, and its cover with it."""
    g = group("RadarEvaluationPod")
    sheet, ribs = MeshBuilder(), MeshBuilder()
    n = srlib._segs(96)
    edge = [radial(T_ELECTRONIC + TAU * i / n) * pod_outline(TAU * i / n) for i in range(n)]
    at = lambda p, station: tuple((p + Vector((0.0, 0.0, zz(station)))) * IN)  # noqa: E731
    sheet.add([at(Vector(), POD_COVER_Z), *(at(p, POD_COVER_Z) for p in edge)], [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)])
    say(
        sheet.build("Pod_Cover", M["silver"], g, sharp_angle=None),
        "Pod cover",
        "Glass fibre cloth stretched on a frame of tube, its outer face silvered: an umbrella to keep the Sun off the pod "
        "while it waited in the open end of the adapter. McDonnell's sketch draws it longer one way than the other; here the "
        "long end lies over the pod's antenna boom. When the pod's switch was pressed a guillotine cut two cables, and two "
        "springs threw "
        "the cover off at 100 ft a second, out of the way of the pod that followed. What it was made of, how it was held "
        "and how it left are documented; its outline is scaled from McDonnell's sketch.",
    )
    if not interior():
        return  # (from far off there is only its cover: the pod is behind it)
    rim = [p * 0.975 for p in edge]
    for i in range(0, n, 2):
        ribs.tube(Vector(at(rim[i], POD_COVER_Z + 0.5)), Vector(at(rim[(i + 2) % n], POD_COVER_Z + 0.5)), 0.3 * IN, 8, caps=False)
    spine = radial(T_ELECTRONIC)
    cross = radial(T_ELECTRONIC + math.pi / 2)
    ribs.tube(Vector(at(spine * -13.6, POD_COVER_Z + 0.5)), Vector(at(spine * 42.4, POD_COVER_Z + 0.5)), 0.3 * IN, 8)
    for s, half in ((-11.0, 8.9), (11.0, 8.9), (30.0, 6.2)):
        ribs.tube(Vector(at(spine * s - cross * half, POD_COVER_Z + 0.5)), Vector(at(spine * s + cross * half, POD_COVER_Z + 0.5)), 0.3 * IN, 8)
    ribs.build("Pod_Ribs", M["aluminium"], g, sharp_angle=35)
    tall, wide, long = POD_BODY
    body, antennas, lamps = MeshBuilder(), MeshBuilder(), MeshBuilder()
    here = Lm(T_OAMS, 0.0, 0.0, POD_AT)
    T = lambda o, a, z: here @ Matrix.Translation(Vector((o, a, z)) * IN)  # noqa: E731  (inches from the transponder's middle)
    chamfered(body, (wide, long, tall), here, 0.35)
    chamfered(body, (wide - 1.4, long - 1.6, 0.3), T(0.0, 0.0, -tall / 2 - 0.1), 0.1)  # its cover plate, aft
    for o in (-1, 1):
        for a in (-1, 0, 1):
            body.disc(here @ (Vector((o * (wide / 2 - 1.3), a * (long / 2 - 1.4), -tall / 2 - 0.25)) * IN), (0.0, 0.0, -1.0), 0.28 * IN, 0.1 * IN)
    chamfered(body, (wide - 1.0, 9.0, 0.6), T(0.0, 0.0, tall / 2 + 0.25), 0.12)  # the plate it was mounted by, forward
    for o in (-1, 1):
        for a in (-1, 1):
            body.disc(here @ (Vector((o * 3.6, a * 3.6, tall / 2 + 0.55)) * IN), (0.0, 0.0, 1.0), 0.35 * IN, 0.2 * IN)
    for o in (-1, 1):  # the two switches that the mount held in, and that turned the pod on as it left
        body.tube(here @ (Vector((o * 1.2, -6.4, tall / 2)) * IN), here @ (Vector((o * 1.2, -6.4, tall / 2 + 1.0)) * IN), 0.3 * IN, 8)
    # the two squib batteries, one on either side, and the boost regulator beside one of them: each a case with a
    # flanged lid
    for o, a, z, size in ((1, -3.0, 0.5, (4.2, 7.0, 6.0)), (-1, 0.0, -0.5, (4.2, 7.0, 6.0)), (1, 5.6, 1.0, (3.2, 5.4, 5.0))):
        off = o * (wide / 2 + size[0] / 2 - 0.05)
        chamfered(body, size, T(off, a, z), 0.25)
        chamfered(body, (0.3, size[1] + 0.5, size[2] + 0.5), T(off + o * (size[0] / 2 + 0.05), a, z), 0.08)
        for e in (-1, 1):
            for f in (-1, 1):
                body.disc(
                    here @ (Vector((off + o * (size[0] / 2 + 0.2), a + e * (size[1] / 2 - 0.3), z + f * (size[2] / 2 - 0.3))) * IN),
                    here.to_3x3() @ Vector((o, 0.0, 0.0)),
                    0.2 * IN,
                    0.08 * IN,
                )
        body.lathe(
            prof([(0.0, 0.0), (0.55, 0.0), (0.55, 1.0), (0.0, 1.0)]),
            10,
            matrix=frame(here @ (Vector((off, a + size[1] * 0.2, z - size[2] / 2)) * IN), (0.0, 0.0, -1.0)),
        )
    say(
        body.build("Pod_Body", M["aluminium"], g, sharp_angle=35),
        "Rendezvous evaluation pod",
        "A target the ship carried with it. It holds what an Agena's docking adapter was to hold: a transponder to answer the "
        "radar, antennas, two flashing lights, and two batteries to run them for a few hours, with a regulator to hold the "
        "transponder's voltage up as its battery ran down. The transponder is the box the rest is fastened to. At 2 hours "
        "7 minutes 15 seconds, with the ship turned square to its path, it was thrown out of the back of the adapter at 5 "
        "ft a second, and the radar found it at once and followed it out to 7,721 ft. Then the oxygen pressure fell, the "
        "ship was powered down, and nobody went after it. What it carried is documented, and the transponder's size, 10 by "
        "10 by 20 in; the rest is scaled from McDonnell's drawing of it, which has no dimensions.",
    )
    # two spiral antennas, each standing 2 in off the case: one on the aft face, one on an end; and the dipole, on a
    # boom two feet long off the other end
    r, proud = POD_ANTENNA
    dish = prof([(0.0, 0.4), (r, 0.4), (r, proud), (0.0, proud)])
    stem = prof([(1.3, 0.0), (1.3, 0.45)])
    fittings = MeshBuilder()
    for origin, normal in (
        (here @ (Vector((0.0, -4.0, -tall / 2 - 0.25)) * IN), Vector((0.0, 0.0, -1.0))),
        (here @ (Vector((0.0, -long / 2, 0.0)) * IN), here.to_3x3() @ Vector((0.0, -1.0, 0.0))),
    ):
        antennas.lathe(dish, 28, matrix=frame(origin, normal))
        fittings.lathe(stem, 16, matrix=frame(origin, normal))
    boom = (long / 2, POD_BOOM, 8.4)
    antennas.tube(here @ (Vector((0.0, boom[0], -1.5)) * IN), here @ (Vector((0.0, boom[0] + boom[1], -1.5)) * IN), 0.55 * IN, 10)
    chamfered(antennas, (1.8, 1.6, 1.8), T(0.0, boom[0] + 0.7, -1.5), 0.2)
    can(antennas, T(0.0, boom[0] + boom[1] + boom[2] / 2, -1.5) @ Matrix.Rotation(-math.pi / 2, 4, "X"), 2.4, boom[2], 0.5, 20)
    say(
        antennas.build("Pod_Antennas", M["fairing"], g, sharp_angle=35),
        "Pod antennas",
        "Two flat spiral antennas, facing different ways so that between them the pod can be heard from any side as it "
        "tumbles, and a dipole on a boom that covers what they miss. They are the pattern meant for the Agena, with two "
        "differences: on the Agena the spirals lie flush and the boom folds away, and here the spirals stand two inches "
        "off the case and the boom is fixed, two feet long. Those two figures are documented; the antennas' size and which "
        "faces they are on are scaled from McDonnell's drawing.",
    )
    # the two flashing lights, on opposite faces: each a ring of xenon on the case its circuit is in
    for z, way in ((-tall / 2 - 0.2, -1), (tall / 2, 1)):
        chamfered(fittings, (4.0, 4.0, 3.4), T(0.0, 7.0, z + way * 1.65), 0.25)
        seat = frame(here @ (Vector((0.0, 7.0, z + way * 3.35)) * IN), (0.0, 0.0, float(way)))
        fittings.lathe(prof([(0.7, 0.0), (0.7, 0.45), (0.0, 0.45)]), 12, matrix=seat)
        lamps.lathe(
            prof([(1.3 + 0.34 * math.cos(a), 0.4 + 0.34 * math.sin(a)) for a in (-math.pi / 2 + TAU * i / 10 for i in range(11))]), 24, matrix=seat
        )
    fittings.build("Pod_Fittings", M["aluminium"], g, sharp_angle=35)
    say(
        lamps.build("Pod_Beacons", M["beacon"], g, sharp_angle=35),
        "Flashing beacons",
        "Two flashing lights, of the kind an Agena was to carry, for the crew to find the pod by eye in the dark: each a "
        "ring-shaped tube of xenon, flashing about 80 times a minute, on opposite faces so that one could be seen from any "
        "side. They worked: Cooper and Conrad saw them. But sunlight glinting off the tumbling pod turned out to be easier "
        "to see than the lights were. That they were rings, their rate and that they were on opposite sides are "
        "documented; which faces is read off McDonnell's drawing.",
    )


def build_eva_equipment(M) -> None:
    """What spacecraft 4 carried for the first American to leave his ship: the hand-held manoeuvring unit, and the 25 ft
    umbilical. Between the seats' heads, just forward of the stowage box they went up in; the unit is drawn put together,
    its arms folded.
    A node of its own: it went out through the pilot's hatch."""
    g = group("ExtravehicularEquipment")
    if not interior():
        return  # (it is in the cabin: from far off there is only its node)
    top, right, station = EVA_AT
    unit, gas, hose = MeshBuilder(), MeshBuilder(), MeshBuilder()
    at = lambda across, up, fwd=0.0: P(right + across, top + up, station + fwd)  # noqa: E731
    # the propulsion unit: a handle with the trigger in it, the pusher's nozzle at one end, and the two arms that carry
    # the tractor nozzles out to either side of his hand, folded back along it
    chamfered(unit, (2.0, 9.6, 1.5), Matrix.Translation(at(-0.8, 3.0)), 0.3)
    chamfered(unit, (1.1, 5.4, 1.0), Matrix.Translation(at(-0.8, 1.5)), 0.2)  # the trigger's guard under it
    unit.tube(at(-5.4, 3.0), at(-7.6, 3.0), 0.55 * IN, 10)  # the pusher
    for s in (-1, 1):
        unit.tube(at(4.0, 3.0, s * 1.1), at(-8.2, 4.4, s * 1.1), 0.22 * IN, 8)
        unit.tube(at(-8.2, 4.4, s * 1.1), at(-8.6, 4.4, s * 1.1), 0.4 * IN, 8)
    # the high pressure section: a regulator and shutoff valve, and the pipe up to the handle
    chamfered(unit, (2.6, 2.4, 2.2), Matrix.Translation(at(-6.4, -1.8)), 0.25)
    unit.tube(at(-6.4, -0.5), at(-5.0, 2.4), 0.3 * IN, 8)
    say(
        unit.build("Eva_ManeuveringUnit", M["aluminium"], g, sharp_angle=35),
        "Hand-held manoeuvring unit",
        "The first thing anyone flew with in space that was not a spacecraft. A handle with a trigger: squeeze one way "
        "and oxygen blows from two small nozzles out on arms either side of the hand, each of 1 lb of thrust, and pulls the "
        "man forward; squeeze the other way and one nozzle of 2 lb pushes him back. Held in line with his middle it moved "
        "him without turning him. Edward White left the hatch on it, stopped himself 15 ft out, and went twice out and "
        "back; in about four minutes its gas was gone, and for the rest he had only the umbilical to pull on, which he "
        "found took him where it liked. It was built at the Manned Spacecraft Center, went up in two pieces in the "
        "stowage box between the seats' heads, and is drawn here put together, its arms folded, just forward of that box. "
        "Its folded size, 17 by 10 by 3 in, is the Smithsonian's measure of the unit itself; its parts are scaled from "
        "NASA's photograph of it.",
    )
    # its gas: two of the egress kit's oxygen bottles, side by side under the handle
    dome = [(1.3 * math.cos(a), 10.8 + 1.3 * math.sin(a)) for a in (math.pi / 2 * i / 6 for i in range(7))]
    for up in (-0.4, -3.2):  # (each a cylinder with a domed end, its neck at the regulator)
        gas.lathe(prof([(0.0, 0.0), (1.3, 0.0), *dome]), 16, matrix=frame(at(-4.2, up), Vector((0.0, 1.0, 0.0))))
    say(
        gas.build("Eva_OxygenBottles", M["tank"], g, sharp_angle=35),
        "Manoeuvring unit oxygen bottles",
        "Two oxygen bottles of the kind in the seat's egress kit: all the propellant the unit had. They held enough for "
        "about four minutes of short bursts. Documented; their size here is scaled from NASA's photograph.",
    )
    # the umbilical, coiled forward of the unit: four layers of four turns, one inside another, which is 25 ft of it
    # (2 pi times four turns at 4.6, 3.56, 2.52 and 1.48 in is 306 in). Each layer is drawn as its own helix
    length, r, coil = UMBILICAL
    pitch = 2.6 * r  # between one turn and the next, and one layer and the next: the hose and a little more
    layers, per = 4, 4
    assert abs(TAU * per * sum(coil - pitch * k for k in range(layers)) - length) < 0.03 * length, "the coil is not the umbilical's length"
    n = per * (20 if srlib.DETAIL >= 1.0 else 10)
    for k in range(layers):
        rad = coil - pitch * k
        path = [at(rad * math.cos(TAU * per * i / n), rad * math.sin(TAU * per * i / n), 2.6 + per * i / n * pitch) for i in range(n + 1)]
        for a, b in zip(path, path[1:]):
            hose.tube(a, b, r * IN, 8, caps=False)
    say(
        hose.build("Eva_Umbilical", M["gold"], g, sharp_angle=None),
        "Umbilical",
        "Twenty-five feet of hose wrapped in gold tape, and the only thing between Edward White and an orbit of his own. "
        "It carried his oxygen from the ship, at 9 lb an hour, the wires for his voice and his heartbeat, and with it a "
        "tether to take the load. It went up coiled in a pouch in the food box beside the stowage box, and is drawn here "
        "against the manoeuvring unit. After about twenty-two minutes outside he came back in along it. Its length and "
        "what it carried are documented; its thickness and its coil are estimated.",
    )


def build(font, flag, fit: Fit | None = None) -> str:
    """Build the spacecraft with Z103.44 at the origin and the hatches on +X. `flag` is the material the flag is drawn in.
    Returns its overall size."""
    fit = fit or Fit()
    M = reuse(materials())
    build_nose_fairing(M)
    build_rendezvous_recovery(M, fit)
    build_reentry_control(M)
    build_hatches(M, fit)
    build_scanner_fairing(M)
    build_cabin(M, fit, font, flag)
    build_crew_station(M, fit, font)
    build_heat_shield(M)
    build_retro_section(M, fit)
    build_equipment_section(M, fit)
    if fit.late:
        import late_equipment

        late_equipment.build(M, fit.late)
    if fit.eva:
        build_eva_equipment(M)
    if fit.pod:
        build_pod(M)
    if fit.backpack:
        build_backpack(M, fit.backpack)
    return f"spacecraft {LENGTH * IN:.3f} m long, {2 * BASE_R * IN:.3f} m across its base"
