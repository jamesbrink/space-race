"""Mercury spacecraft No. 20, "Faith 7", on Atlas 130-D, as launched on Mercury-Atlas 9 (15 May 1963).

Run headless:
    pnpm model:ma-9            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. No. 20 was the capsule of the "manned
one-day mission" and the most changed of the six that flew with a man, so this is the script with the most of its
own. What it shared with every capsule so far (the retropack, the recovery compartment, the antenna canister, the
tower, the couch) is ../../../vehicles/mercury_capsule.py; what it shared with No. 11, the first capsule of its kind
(the centreline window, the explosive hatch, the shingles round them), is built by that flight's own script, called
from here with no periscope; what was the orbital capsules' (the ablation shield, the balloon's container) is
../../../vehicles/mercury_orbital.py; and what was No. 20's own is here and in ../../../vehicles/mercury_cabin_20.py:
no periscope, and a door for the umbilical alone where the periscope's had been; a flashing beacon in a canister on
the retropack, to be thrown out in orbit, and a package of Geiger tubes beside it; three squares of white paint on
one shingle; its emblem, a white star with FAITH 7 on it; a panel with instruments where the periscope's screen
had been; a television camera by the pilot's hand.

Every dimension is in inches and converted once, at the point of use, with IN. Station 0 is the heat shield's
maximum-diameter plane; +Z is toward the nose. Angles are round the cone in the pilot's frame, from his right
as he lies: his feet are at 90 degrees, the window at 270 (his head), the hatch's middle at 315. The capsule is
built so and then turned 45 degrees (mercury_capsule.stand), so that in the file its hatch is on +X, the side a
launch site's frame gives the hatch. See ../spacecraft.md for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    HeatShield  Retropack  Afterbody  Window  Hatch  CrewCabin  RecoveryCompartment
    AntennaCanister  EscapeTower
and, from ../../../vehicles/atlas_lv3b.py, the launch vehicle:
    AtlasAdapter  AtlasTank  AtlasPods  AtlasVerniers  AtlasSustainer  AtlasBoosterSection  AtlasBoosterEngines
"""

from __future__ import annotations

import importlib.util
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "crew"))
import atlas_lv3b  # noqa: E402
import mark_iv_suit  # noqa: E402
import mercury_cabin  # noqa: E402
import mercury_cabin_20  # noqa: E402
import mercury_capsule  # noqa: E402
import mercury_orbital  # noqa: E402
from mercury_capsule import (  # noqa: E402
    CONE,
    CONE_H,
    PILOT_HIP,
    THING_SHELLS,
    VESSEL,
    Z_RETRO_BOTTOM,
    Z_TOP,
    Skin,
    thing,
)
from srlib import (  # noqa: E402
    IN,
    TAU,
    MeshBuilder,
    deg,
    frame,
    group,
    interior,
    load_font,
    mark_shells,
    material,
    prof,
    run,
    text_mesh,
)


def _flight_script(flight: str):
    """Another Mercury flight's model script, loaded as a module and not run (its build is under `__main__`)."""
    path = os.path.join(_root, "missions", "usa", "mercury", "flights", flight, "model", "vehicle.py")
    spec = importlib.util.spec_from_file_location(f"vehicle_{flight.replace('-', '_')}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# Capsule No. 11 (Liberty Bell 7) was the first with the window and the explosive hatch. Its script builds them, and
# the shingles round them; No. 20's are built by it, on the strength of this capsule's own photographs (NASA
# S63-06259 and S63-09676-E: the window's cover and the emblem under it, UNITED STATES to its left; GPN-2000-001335:
# the hatch, and UNITED STATES to its right), with what those photographs show otherwise. See spacecraft.md.
no11 = _flight_script("mr-4-liberty-bell-7")
# (Where the window stands is measured on this capsule, on the carrier's deck: S63-07701 has its glass from station
# 21.1 to 40.2, level with the first UNITED STATES, and that with No. 13's is the figure every capsule with the window
# is built to: `WINDOW_Z` there, 31.5. Until November 2026 it was 35.8, against this photograph.)
WINDOW_T, WINDOW_Z, HATCH = no11.WINDOW_T, no11.WINDOW_Z, no11.HATCH

Z_BOOSTER_BASE = -atlas_lv3b.LENGTH  # the booster engines' exit plane

# ------------------------------------------------------------------ what was No. 20's own (in, degrees)

# The periscope was taken out (NASA SP-45, Table 3-II, p. 52: "Deleted periscope ... Reduce weight by 76 lb; unnecessary
# for attitude reference"). On every capsule before, the ground's umbilical plugged in under the periscope's lens, in
# the periscope's own opening; this one had "a spring-loaded mechanism ... for the closing of the spacecraft umbilical
# door" (the MA-9 press kit, p. 33) and an UMBILICAL DOOR light at the head of its sequence lights (SP-45, Figure
# 17-7(b)). So: a door for the umbilical alone. Where it was is not in anything read. The one photograph read that
# reaches this side of No. 20 (KSC-63-MA9-174, at the cone's limb) shows a plain plate there under the upper seam,
# where the beads stop, and nothing of what is in it: the door is put in that plate where the umbilical had been on
# No. 11, and is as big as the receptacle wants. Estimated.
UMBILICAL_Z = no11.UMBILICAL_Z
UMBILICAL_DOOR = (deg(83.5), deg(96.5), UMBILICAL_Z - 3.2, UMBILICAL_Z + 3.2)
DOOR_JOINT = 0.15  # the joint round the shut door, in
DOOR_DEEP = 1.1  # the opening's floor under the skin, in

# The shingle under the window: two stacks of beads, as No. 18's had. No photograph of No. 20 read shows it square on.
# On the carrier's deck (S63-07701) its beads end at about station 6.3, give or take 0.8: it is run down to the plain
# band at the cone's foot, as No. 13's is.
NAME_STACKS = 2
NAME_FOOT = no11.BAND
# The shingles part at the same two stations all round this capsule: the seams at the foot and the head of the
# window's plate (20.5 and 42.5) run on from the window to the pilot's feet and round to the hatch. KSC-63-MA9-174,
# taken from above with the capsule in its collar, shows one seam running round the window's side above the first
# UNITED, and above it a single row of shingles to the top of the cone, the three white squares on one of them: "a
# single test shingle located at the small end of the conical section". S63-07701, fitted to the cone, has those two
# seams at 42.2 and 21.4, give or take 0.7 (the upper 2 to 3 in above UNITED's top, the lower 1.5 to 2 in under STATES'
# foot), and S63-07521 has CAUTION THERMOCOUPLE stencilled on each beside the window's plate. To the right of the hatch
# GPN-2000-001335, close and square on, shows the second UNITED STATES between two seams level with the head and foot
# of the hatch's opening and its flag under the lower: taken as the same two. Documented by photograph that they run
# so; the stations are the window's plate's. (Until November 2026: 20.8 and 38.5 from 75 to 255 degrees, read against
# lettering that stood 2.5 in too low, and No. 11's elsewhere.) The hatch's own two columns are named for nothing:
# the shingles above and below the hatch are No. 11's.
ROWS = {k: (no11.SEAM_LOW, no11.SEAM_HIGH) for k in (11, 0, 1, 2, 3, 4)}

# The paint. All of it is placed from photographs of this capsule (spacecraft.md, "Paint"); none of it is dimensioned.
# UNITED STATES stood on it twice, each with a flag under it: to the left of the window, low on the cone, under the
# white squares (NASA S63-06259, S63-09676-E, S63-07521, KSC-63-MA9-174), and round to the right of the hatch, level with it
# (GPN-2000-001335, taken on the carrier's deck). Each: the middle of its two lines round the cone, the stations of
# the two lines, and where its flag's middle is (angle, station).
# Read again in November 2026, when the window was moved. The first pair on S63-07701, between the cone's ends: UNITED
# from 32.9 to 38.6 and STATES from 24.15 to 30.2 by a camera fitted to the cone, 36.2 and 27.4 for their middles by
# the cone's ends alone, give or take 0.5; letters 5.5 to 6.3 in; the lines' right ends at 241 degrees; the flag's top
# at about 20, its middle 16.7. It had stood 2.5 in lower here, with letters of 6.9. The second pair on
# GPN-2000-001335, roughly: UNITED's top an inch below the upper seam, so about 37.6 and 28.5, give or take 1.2,
# where it had 42.4 and 31.9 against a hatch taken 4 in too tall; its flag is not measured and is put under the lower
# seam, as that photograph has it.
UNITED_STATES = (
    (deg(215), (36.2, 27.4), (deg(215), 16.7)),
    (deg(28), (37.6, 28.5), (deg(30), 17.2)),
)
LETTERS = (23.0, 6.0)  # a line's length and its letters' height: the stencil's size on Nos. 16 and 18
FLAG = 12.0  # the flags' width
# The white paint patches: "three test panels were 6-inch squares baked onto a single test shingle located at the small
# end of the conical section" (The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7, p. 21), three kinds of
# white coating, to see what the entry did to each. Their size and that they were at the cone's small end on one
# shingle are documented; that they stood one above the next over the U of the first UNITED, and the gaps between
# them, are read off S63-06259 and S63-09676-E. The middle of the column round the cone, the station of the top
# square's upper edge, a square's side, and the gap between two.
# The squares end at the upper seam and begin at the cone's top (S63-07701, S63-06259, KSC-63-MA9-174): a row of 16.8
# in along the cone, in which three squares of 6 in with gaps between them do not fit. They read about 5.1 in each.
# So the two things the book says cannot both be had on this cone, and the shingle is kept: squares of 4.9 in, 0.6
# apart, between the top of the cone and the seam at 42.5. Estimated; documented as 6 in.
PATCHES = (deg(185), 57.6, 4.9, 0.6)
PATCH_LIFT = mercury_capsule.PAINT_LIFT + 0.03  # how far they stand off the skin, inches

# The emblem, on the shingle under the window: a white field with straight edges and points, FAITH across it in dark
# capitals and a 7 under that. The only photographs of it read (S63-06259, S63-09676-E) see it almost edge on, at the
# limb of the cone, where its outline is two points above and below a broad middle; it is drawn as the five-pointed
# star the flight's later insignia has, with the insignia's lettering. The star's size is what fills the shingle as
# those photographs have it filled. Estimated, all of it but that it was white, pointed, and said FAITH 7.
# Its place is read off S63-07701 (the deck, from the window's side, the paint scorched to five pale lobes): its upper
# point at station 20.1, 0.4 in under the seam at the window's foot, its side points at the shingle's two seams, its
# lower points at 7.2. A regular star of that height has points 7.6 in from its middle and one of that width 8.6: 7.8.
STAR = (deg(270), 12.8, 7.8)  # its middle (angle, station) and the radius of its points
STAR_WAIST = math.sin(math.radians(18)) / math.sin(math.radians(54))  # a regular star's inner corners, as a part of that radius
FAITH = (0.2, 8.6, 1.75)  # the word: its middle above the star's (as a part of its radius), its length and its letters' height
SEVEN = (-0.3, 3.9)  # the 7: its middle below the star's, and its height
LAYER = 0.07  # from the star's paint to the lettering's, inches: over a millimetre apart

# The flashing beacon (NASA SP-45, pp. 218 and 219, Figures 12-2 and 12-5): "a 5.75-inch-diameter spherical assembly
# weighing about 10 pounds and equipped with two xenon-gas-discharge lamps located at opposite poles", "ejected from
# the container at a speed of 10 ft/sec by means of a compressed spring acting against a piston when the canister
# covers were released". The canister was "on the retropack" (the press kit, p. 9), and Figure 12-5 draws it at the
# pack's outer corner on the side toward the Earth, with the capsule pitched 20 degrees down and the sphere leaving
# 88 degrees below the horizon: 68 degrees from the capsule's long axis, on the side of the pilot's feet. Documented:
# the sphere, its lamps, the spring and piston, and that angle (derived from the figure's two). The canister's size is
# drawn round the sphere and its spring, and where on the pack it stood is scaled off the figure's sketch. Estimated.
BEACON_R = 5.75 / 2
BEACON_CAN = (3.25, 9.6)  # the canister: its radius and its length
BEACON_T = deg(90)  # round the pack: toward the pilot's feet, which is toward the Earth in orbit
BEACON_AT = (12.9, -23.5)  # the middle of its closed end: (radius, station)
BEACON_AIM = math.radians(68.0)  # its axis from the capsule's, toward the nose

# The Geiger-Mueller tubes (NASA SP-45, p. 226 and Figure 12-14): "A package with two Geiger-Mueller tubes were mounted
# on the spacecraft retropackage", one "collimated to view along the spacecraft roll axis", the other viewing "a
# hemispherical area about a direction 40 deg below the roll axis". Documented: two tubes, on the retropack, and where
# each looked. The package's size and its place on the pack's end are read off the figure's sketch. Estimated.
GEIGER_BOX = (4.2, 3.0, 2.2)
GEIGER_AT = (deg(270), 10.2)  # on the pack's lower end: (angle, radius)

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "Retropack_Housing",
    "Retropack_BeaconCanister",
    "Afterbody_Shingles",
    "Afterbody_Fasteners",
    "Afterbody_Plates",
    "Afterbody_Structure",
    "Afterbody_AttachRing",
    "Afterbody_Lettering",
    "Afterbody_Flag",
    "Afterbody_Patches",
    "Afterbody_Star",
    "Afterbody_Name",
    "Hatch_Shingles",
    "Hatch_Fasteners",
    "Hatch_Structure",
    "Hatch_PressureSkin",
    "CrewCabin_PressureVessel",
    "CrewCabin_Lining",
    "CrewCabin_Frames",
    "Hatch_Lining",
    "Recovery_Shingles",
    "Recovery_Fasteners",
    "Recovery_Structure",
    "Recovery_ParachuteCanisters",
    "Antenna_Housing",
    "Antenna_DielectricWindow",
    "Antenna_Fittings",
    "Antenna_BalloonCanister",
    "Tower_EscapeMotor",
    "Tower_MotorBands",
)

# What this flight says of the things No. 11's script and the shared modules build with another flight's words.
SAYS = {
    "Window_": (
        "Window",
        "The window in front of the pilot's face: an outer pane of Vycor curved to the cone and three inner panes that hold the "
        "cabin's pressure. With the periscope gone it was the only way to see out, and the marks on it the only way to line the "
        "capsule up by eye: Cooper flew his retrofire by them. From the second orbit he complained of an oily film on the outer pane.",
    ),
    "Retropack_Retro": (
        "Retrograde rockets",
        "Three solid motors of about 1,000 lbf for ten seconds each, fired five seconds apart: what brings the capsule down. "
        "The autopilot had lost its power by then, so John Glenn counted Cooper down by radio from a ship off Japan and he fired "
        "them by hand, holding the capsule on the window's marks. They put him down four and a half miles from the carrier.",
    ),
    "Retropack_Straps": (
        "Retropack straps",
        "Three straps hold the pack to the heat shield until explosive bolts let it go, a minute after the last rocket has "
        'burned out. Cooper dropped it by hand: "And off they came." '
        "They should meet under the pack's middle at one bolt; here they do not.",
    ),
}


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> Skin:
    """The cone's skin as No. 11's script builds it (shingles, plates, hatch, roll jets) with no periscope, an opening
    for the umbilical's door in the plate the periscope's door had stood in, this capsule's shingle under the window,
    and No. 20's paint put on."""
    skin = no11.build_afterbody(M, font, name_stacks=NAME_STACKS, name_foot=NAME_FOOT, paint=False, periscope=False, door=UMBILICAL_DOOR, rows=ROWS)
    g = bpy.data.objects["Afterbody"]
    build_umbilical_door(M, g, skin)
    build_paint(M, g, skin, font)
    return skin


def build_umbilical_door(M, g, skin: Skin) -> None:
    """The umbilical's door, shut as at liftoff (it was sprung shut when the umbilical was thrown off), and under it
    the receptacle in its well. The leaf stands flush with the plate, a joint all round it, its hinge on the edge
    toward the nose."""
    t0, t1, z0, z1 = UMBILICAL_DOOR
    mid = ((t0 + t1) / 2, (z0 + z1) / 2)
    to = skin.flat(*mid)
    edge = skin.bounds(*mid, t0, t1, z0, z1)

    def ring(pts, n: int = 5) -> list[tuple[float, float]]:
        """A four-sided outline, each side cut in n."""
        step = lambda a, b, k: a + (b - a) * k / n  # noqa: E731
        return [(step(pts[i][0], pts[(i + 1) % 4][0], k), step(pts[i][1], pts[(i + 1) % 4][1], k)) for i in range(4) for k in range(n)]

    says = (
        "Umbilical door",
        "Until just before liftoff the capsule was fed from the ground through one thick plug: power, cooling, the wires that told "
        "the blockhouse how it was. On every earlier capsule that plug went in under the periscope's lens, and the periscope's door "
        "shut over both. This capsule had no periscope, so the socket has a door to itself, sprung to snap shut when the plug is "
        "thrown off, and a light at the head of the pilot's sequence panel to say that it has. "
        "That it had one is the record's; the one photograph read of this side shows a plain plate and no more, and the door's "
        "place and size are ours.",
    )
    well, leaf, hinge = MeshBuilder(), MeshBuilder(), MeshBuilder()
    outer = ring(edge)
    well.grid(lambda i, j: to(*outer[i], -DOOR_DEEP * j), range(len(outer)), (0, 1), closed_u=True)
    well.grid(lambda t, z: CONE.p(t, z, -DOOR_DEEP), [t0 + (t1 - t0) * i / 5 for i in range(6)], (z0, z1))
    well.build("Umbilical_Well", M["underlay"], g, sharp_angle=40)
    mercury_capsule.umbilical_receptacle(
        M,
        g,
        (mid[0], UMBILICAL_Z),
        "Where the ground's umbilical was plugged in until it was thrown off at the end of the count. "
        "It lies under its own door, which is shut, as at liftoff. Placed as Liberty Bell 7's: nothing read places this capsule's.",
        sunk=mercury_capsule.UMBILICAL_SUNK,
    )
    # the leaf: the plate's own curve, a joint in from the opening all round, and an edge turned down under it
    j = DOOR_JOINT
    r = CONE.r(mid[1])
    ta, tb, za, zb = t0 + j / r, t1 - j / r, z0 + j * math.cos(CONE.a), z1 - j * math.cos(CONE.a)
    inner = ring(skin.bounds(*mid, ta, tb, za, zb))
    leaf.grid(lambda t, z: CONE.p(t, z, 0.0), [ta + (tb - ta) * i / 5 for i in range(6)], (za, zb))
    leaf.grid(lambda i, k: to(*inner[i], -0.22 * k), range(len(inner)), (0, 1), closed_u=True, flip=True)
    for t in (t0 + 0.24 * (t1 - t0), t0 + 0.76 * (t1 - t0)):  # its hinge's two knuckles, in the joint on the nose's side
        a, b = CONE.p(t - 0.55 / r, z1 - 0.07, 0.15), CONE.p(t + 0.55 / r, z1 - 0.07, 0.15)
        hinge.tube(a, b, 0.09 * IN, 8)  # (standing over the joint, clear of the plate and the leaf by more than a millimetre)
    thing(leaf, "Umbilical_Door", M["shingle"], g, *says, sharp_angle=40)
    thing(hinge, "Umbilical_Hinge", M["steel"], g, *says, shell=False)
    bpy.data.objects["Umbilical_Well"]["label"], bpy.data.objects["Umbilical_Well"]["about"] = says


def star(radius: float) -> tuple[list, list]:
    """A five-pointed star about its own middle, one point up: its ten corners and its middle, and ten triangles."""
    verts = [(0.0, 0.0)]
    for k in range(10):
        r = radius * (1.0 if k % 2 == 0 else STAR_WAIST)
        a = math.pi / 2 + TAU * k / 10
        verts.append((r * math.cos(a), r * math.sin(a)))
    return verts, [(0, 1 + k, 1 + (k + 1) % 10) for k in range(10)]


def build_paint(M, g, skin: Skin, font) -> None:
    """The paint, as launched: UNITED STATES twice, each with its flag under it; the three white squares over the
    first; and under the window the emblem, a white star with FAITH across it and a 7 under that."""
    paint, flag, patches = MeshBuilder(), MeshBuilder(), MeshBuilder()
    fw = FLAG
    fh = fw / 1.9
    nx, ny = 12, 6
    verts = [((i / nx - 0.5) * fw, (j / ny - 0.5) * fh) for j in range(ny + 1) for i in range(nx + 1)]
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    for t, lines, (ft, fz) in UNITED_STATES:
        for body, z in zip(("UNITED", "STATES"), lines):
            skin.lettering(paint, body, *LETTERS, t, z, font)
        skin.paint(flag, verts, faces, ft, fz, uv=lambda x, y: (x / fw + 0.5, y / fh + 0.5))
    paint.build("Afterbody_Lettering", M["paint_white"], g, smooth=False)
    flag.build("Afterbody_Flag", M["flag"], g, sharp_angle=None)

    pt, top, side, gap = PATCHES
    square = [(-side / 2, -side / 2), (side / 2, -side / 2), (side / 2, side / 2), (-side / 2, side / 2)]
    for k in range(3):
        # (the row lies over the screws at its shingle's two ends: a little further off the skin than the lettering, to clear their heads)
        skin.paint(patches, square, [(0, 1, 2, 3)], pt, top - (side / 2 + k * (side + gap)) * math.cos(CONE.a), lift=PATCH_LIFT)
    thing(
        patches,
        "Afterbody_Patches",
        M["paint_white"],
        g,
        "White paint patches",
        "Three six-inch squares of three kinds of white coating, baked onto one shingle at the small end of the cone. A capsule "
        "that is to stay up for days wants to be white: painted so, it would run ten or fifteen degrees cooler inside than under "
        "the dark oxide. Aurora 7 and Sigma 7 had each carried one patch to measure that. These three were to show which white "
        "survives the heat of the entry. Their size and number are the record's; their places are read off photographs.",
        smooth=False,
    )

    # The emblem. The star, then the lettering LAYER off it.
    says = (
        "Faith 7",
        'Cooper chose the name last, and with some trouble: "my trust in God, my country, and my teammates". It worried the '
        'publicity men, who could hear the headline if the capsule were lost at sea: "The United States today lost Faith". '
        "It was painted under the window, as every pilot's had been, dark letters on a white field. "
        "The only photographs of it read see it nearly edge on: the star is the later insignia's, and so is the lettering, in a "
        "typeface of ours.",
    )
    st, sz, sr = STAR
    lift = mercury_capsule.PAINT_LIFT
    field, name = MeshBuilder(), MeshBuilder()
    skin.paint(field, *star(sr), st, sz, lift=lift)
    up, length, tall = FAITH
    plain = text_mesh("FAITH", 1.0, font, cuts=0)[0]
    aspect = (max(v[0] for v in plain) - min(v[0] for v in plain)) / (max(v[1] for v in plain) - min(v[1] for v in plain))
    z_word = sz + up * sr * math.cos(CONE.a)
    mercury_orbital.hand_lettering(skin, name, "FAITH", length, st, z_word, font, tall=tall * aspect / length, lift=lift + LAYER)
    down, high = SEVEN
    mercury_orbital.hand_lettering(skin, name, "7", high, st, sz + down * sr * math.cos(CONE.a), font, upright=True, lift=lift + LAYER)
    thing(field, "Afterbody_Star", M["paint_white"], g, *says, smooth=False)
    thing(name, "Afterbody_Name", M["paint_black"], g, *says, smooth=False)


def build_retropack_experiments(M) -> None:
    """What No. 20's retropack carried besides its rockets: the flashing beacon in its canister, and the Geiger tubes."""
    g = bpy.data.objects["Retropack"]
    # ---- the beacon's canister, at the pack's outer corner on the side of the pilot's feet, leaning out toward the nose
    radial = Vector((math.cos(BEACON_T), math.sin(BEACON_T), 0.0))
    aim = radial * math.sin(BEACON_AIM) + Vector((0, 0, math.cos(BEACON_AIM)))
    foot = radial * BEACON_AT[0] + Vector((0, 0, BEACON_AT[1]))
    F = frame(foot * IN, aim)
    r, long = BEACON_CAN
    says = (
        "Flashing beacon",
        "A ten-pound ball five and three-quarter inches across, with a xenon flash lamp at each pole and its own batteries: something "
        "to look for. Two spacecraft that are to meet must first see each other, and nobody knew how far off a light could be found "
        "against the stars. On the third orbit Cooper pitched the capsule 20 degrees down and fired the squib: a spring threw the "
        "ball out of this can at ten feet a second, straight toward the Earth, into an orbit a little different from his own. He "
        'could not find it that night. On the next he did, and the night after, eight to ten miles off and faint: "I was with the '
        'little rascal all night." It was the first satellite launched from a manned spacecraft. '
        "The ball, its lamps, the spring and the angle it left at are the report's; the can is drawn round them, and its place on "
        "the pack is scaled off a sketch.",
    )
    can, lids = MeshBuilder(), MeshBuilder()
    can.lathe(prof([(0.0, 0.0), (r - 0.15, 0.0), (r, 0.15), (r, long), (r - 0.08, long), (r - 0.08, 0.12), (0.0, 0.12)]), 32, matrix=F)
    for z in (0.9, long - 0.9):  # a stiffening band toward each end
        can.lathe(prof([(r, z - 0.3), (r + 0.1, z - 0.2), (r + 0.1, z + 0.2), (r, z + 0.3)]), 32, matrix=F)
    # its cover: two halves of a shallow cone over the open end, with a joint between them, held shut until the squib
    for a0 in (0.0, math.pi):
        half = (a0 + 0.035, a0 + math.pi - 0.035)
        lids.lathe(prof([(r + 0.12, long - 0.35), (r + 0.12, long + 0.05), (0.35, long + 1.25)]), 12, matrix=F, arc=half)
    lids.lathe(prof([(0.42, long + 1.1), (0.42, long + 1.5), (0.0, long + 1.55)]), 12, matrix=F)  # the latch the squib let go
    thing(can, "Retropack_BeaconCanister", M["aluminium"], g, *says, sharp_angle=35)
    thing(lids, "Retropack_BeaconCover", M["aluminium"], g, *says, shell=False, sharp_angle=35)
    # the saddle it is held to the pack by: two straps round it and a foot under each on the pack's corner
    saddle = MeshBuilder()
    inward = (-radial - aim * (-radial).dot(aim)).normalized()  # square to the canister's line, toward the pack
    for z in (2.0, 5.0):
        on_can = foot + aim * z + inward * r
        to_pack = Vector((0, 0, 1)) * 0.2 - radial  # (in toward the pack's wall, a little up it)
        end = on_can + to_pack.normalized() * (1.3 + 0.55 * z)
        saddle.tube(on_can * IN, end * IN, 0.38 * IN, 10)
        saddle.lathe(prof([(r + 0.1, z - 0.42), (r + 0.26, z - 0.42), (r + 0.26, z + 0.42), (r + 0.1, z + 0.42)]), 32, matrix=F)
    thing(saddle, "Retropack_BeaconSaddle", M["steel"], g, *says, shell=False, sharp_angle=35)
    if interior():
        # in the can: the piston on its spring, squeezed, and the ball on the piston, a lamp at each pole
        ball, lamps, works = MeshBuilder(), MeshBuilder(), MeshBuilder()
        zc = long - 0.55 - BEACON_R
        ball.lathe(prof([(BEACON_R * math.sin(math.pi * i / 24), zc - BEACON_R * math.cos(math.pi * i / 24)) for i in range(25)]), 32, matrix=F)
        for s in (-1, 1):  # (its poles lie along the can: one lamp toward the cover, one down through the piston's middle)
            pole = foot + aim * (zc + s * (BEACON_R - 0.12))
            lamps.lathe(prof([(0.55, 0.0), (0.55, 0.2), (0.38, 0.42), (0.0, 0.5)]), 14, matrix=frame(pole * IN, aim * s))
        zp = zc - BEACON_R * 0.8
        works.lathe(prof([(r - 0.25, zp - 0.3), (r - 0.25, zp), (2.0, zp), (2.0, zp - 0.3)]), 24, matrix=F)  # a ring the ball sits in
        turns, coil = 3.5, []
        for i in range(int(turns * 16) + 1):  # the spring under it, squeezed between the piston and the can's floor
            a = TAU * i / 16
            coil.append(F @ (Vector((2.2 * math.cos(a), 2.2 * math.sin(a), 0.4 + (zp - 0.9) * i / (turns * 16))) * IN))
        for a, b in zip(coil, coil[1:]):
            works.tube(a, b, 0.11 * IN, 6)
        thing(ball, "Retropack_Beacon", M["aluminium"], g, *says, shell=False, sharp_angle=None)
        thing(lamps, "Retropack_BeaconLamps", M["glass"], g, *says, shell=False, sharp_angle=35)
        thing(works, "Retropack_BeaconSpring", M["steel"], g, *says, shell=False, sharp_angle=35)

    # ---- the Geiger tubes: a box on the pack's lower end between two nozzles, one tube looking straight aft, one 40 degrees off
    gt, gr = GEIGER_AT
    out = Vector((math.cos(gt), math.sin(gt), 0.0))
    z_end = pack_end(gr)
    bx, by, bz = GEIGER_BOX
    at = out * gr + Vector((0, 0, z_end - bz / 2 + 0.25))
    box = MeshBuilder()
    G = Matrix.Translation(at * IN) @ Matrix.Rotation(gt + math.pi / 2, 4, "Z")
    mercury_capsule.chamfered(box, (bx, by, bz), G, 0.18)
    aft = Vector((0, 0, -1.0))
    for dx, lean in ((-1.1, 0.0), (1.1, math.radians(40.0))):  # (the second leans toward the pilot's feet: "below the roll axis")
        look = aft * math.cos(lean) + Vector((0.0, 1.0, 0.0)) * math.sin(lean)
        base = at + (G.to_3x3() @ Vector((dx, 0.0, 0.0))) + aft * (bz / 2 - 0.3)
        box.lathe(prof([(0.62, 0.0), (0.62, 1.7), (0.5, 1.7), (0.5, 0.9), (0.0, 0.9)]), 14, matrix=frame(base * IN, look))
    thing(
        box,
        "Retropack_GeigerTubes",
        M["aluminium"],
        g,
        "Geiger tubes",
        "Two Geiger-Mueller tubes in a package on the retropack, to count the electrons outside. Ten months before, a hydrogen bomb "
        "set off above the Pacific had left a belt of them round the Earth, and where the Earth's field dips, over the South "
        "Atlantic, the capsule flew through its edge. One tube looked straight back along the capsule's axis through a narrow "
        "tube; the other, shielded, looked 40 degrees to one side. Only the first counted anything: the belt had all but gone. "
        "That there were two, where each looked and that they were on the pack are the report's; the box and its place are ours.",
        shell=False,
        sharp_angle=35,
    )


def pack_end(r: float) -> float:
    """The station of the retropack's lower end at a radius: its housing as mercury_capsule.build_retropack turns it."""
    pts = ((0.0, -23.0), (6.0, -22.6), (10.0, -21.6), (12.3, -20.6), (13.0, -19.5))
    for (r0, z0), (r1, z1) in zip(pts, pts[1:]):
        if r0 <= r <= r1:
            return z0 + (z1 - z0) * (r - r0) / (r1 - r0)
    return pts[-1][1]


def build_crew_cabin(M, window: dict) -> None:
    g = group("CrewCabin")
    v = MeshBuilder()
    rv = VESSEL.r
    inner_opening = mercury_cabin_20.WINDOW_OPENING
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5)]), 144)  # the aft pressure bulkhead
    mercury_capsule.wall(v, rv, 0.5, CONE_H - 0.3, (HATCH, inner_opening))
    v.lathe(prof([(rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # the small bulkhead
    mercury_capsule.sill(v, HATCH)
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)
    mercury_capsule.bulkhead_stiffeners(M, g)
    if not interior():
        return
    # The pilot: the Mark IV suit as modelled (crew/mark_iv_suit.py), on the couch, as Cooper and his own photographs
    # have it: his stature, 5 ft 9 in (The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7, p. 1: documented),
    # the gloves locked to rings at the wrists, two microphones in the helmet, the biomedical connector a round port on
    # the right thigh (NASA S63-01922). What his suit had that the model has not is in spacecraft.md ("The pilot").
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    cooper = mark_iv_suit.Fit("MA-9", "L. G. COOPER", 175.3, wrist_rings=True, microphones=2, port=True)
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot", cooper)
    where = mercury_cabin_20.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, HATCH, CONE_H - 0.3, mark_iv_suit.seated_points(), window)
    mercury_cabin_20.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, HATCH)
    print(f"ma-9 cabin: {where}")
    mercury_capsule.oxygen_and_bag(M, g)
    # (what lets light in with the lamps out: the window's inner panes alone. There is no periscope's screen)
    openings = [(window["centre"], 0.5 * window["pane"][1] * IN)]
    mercury_cabin.shade(g, where["lamps"], mercury_cabin.inside_of("Hatch"), openings)
    mercury_capsule.keep_inside()


def say() -> None:
    """Give the things built with another flight's words this flight's (SAYS: by the start of a mesh's name)."""
    for obj in bpy.data.objects:
        if obj.type != "MESH" or "about" not in obj:
            continue
        for start, (label, about) in SAYS.items():
            if obj.name.startswith(start):
                obj["label"], obj["about"] = label, about


# ---------------------------------------------------------------------------- main


def build() -> str:
    font = load_font()
    M = mercury_capsule.make_materials()
    M.update(mercury_orbital.materials())
    M.update(mercury_orbital.retropack_materials())
    # crinkled aluminium foil over the insulation round the window's well, as No. 11's photographs show it
    M["foil"] = material("insulation-foil", (0.74, 0.73, 0.69), 1.0, 0.36, double_sided=True)
    # the emblem's lettering: dark on the white star. Black paint, or the shingle left bare: the photographs do not say
    M["paint_black"] = material("paint-black", (0.02, 0.02, 0.022), 0.0, 0.6, double_sided=True)
    mercury_orbital.build_ablation_shield(
        M,
        "Glass fibre in phenolic resin, which chars and boils away and takes the heat with it. It is also the bottom of a cushion: "
        "before landing it is unlatched and drops four feet on a skirt of rubberised cloth. On this flight it came through the "
        "air under the pilot's own hand, the autopilot having lost its power, and did what it was made to.",
    )
    mercury_capsule.build_retropack(M)
    # (No. 16's pack was striped dark on light, and this one may have been: no photograph of No. 20's has been read, so it is not)
    mercury_orbital.hf_dipole(
        M,
        "The aerial for the high-frequency voice radio that Sigma 7 had first carried: two halves on opposite sides of the "
        "retropack, each a tape of beryllium copper that curls into a tube as it leaves its reel, fourteen feet each way. "
        "On this flight it was tested on purpose. Thirty hours up Cooper called on it twice, once near Panama and once over "
        "the empty South Atlantic, each time with the capsule turned so that the aerial lay level and then so that it "
        "pointed at the Earth, while every station listened. It worked, and in the long gaps between stations Cooper "
        "found it worth having. It went with the retropack. "
        "The tape's size and that there were two on the pack are Sigma 7's report's; the units are drawn from a photograph "
        "with no scale, and where round the pack they stood is estimated. They are shown rolled up, as launched.",
    )
    build_retropack_experiments(M)
    build_afterbody(M, font)
    window = no11.build_window(M)
    build_crew_cabin(M, window)
    mercury_capsule.build_recovery_compartment(M)
    mercury_capsule.build_antenna_canister(M)
    mercury_orbital.balloon_canister(
        M,
        "Under the flap on the canister's top: a can three inches across holding a 30 in balloon of orange Mylar, folded, a bottle "
        "of nitrogen to fill it and a hundred feet of nylon line. Aurora 7's had torn; this one was made again and tested until "
        "nobody doubted it. On the sixth orbit Cooper set his cameras, fired the squib, and nothing happened. He tried again. "
        '"The balloon did not deploy: felt no shock; hear nothing on it." Why was never learned: the wiring was in this '
        "canister, which is thrown away with the parachute. The balloon is in its can still, as at liftoff. "
        "That the can was here and three inches across is the record's; its depth and its place under the flap are estimated.",
        None,
    )
    mercury_capsule.build_escape_tower(M)
    say()
    # the capsule is built in the pilot's frame; it stands on the booster with its hatch on +X, as every site's frame has it
    mercury_capsule.stand((HATCH[0] + HATCH[1]) / 2, mercury_capsule.SPACECRAFT)
    # Atlas 130-D: its number as the photograph of 14 May has it; no insulation bulkhead (taken out on the production
    # line); the booster engines' baffled injectors and hypergolic igniters, which came in with 113-D ("The Atlas 130-D is
    # equipped with baffle injection engines; it requires a hypergolic (self-igniting) start": the MA-9 press kit, p. 46)
    atlas_lv3b.build(Z_BOOSTER_BASE, font, serial="13 0D", baffled_injectors=True, hypergolic_igniters=True)
    mark_shells(SHELLS + mercury_orbital.SHELLS + tuple(THING_SHELLS) + atlas_lv3b.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    wz = WINDOW_Z * IN
    mid = (Z_TOP + Z_BOOSTER_BASE) / 2 * IN
    tank = -atlas_lv3b.LENGTH * IN
    top = mercury_capsule.Z_CAN_TOP * IN
    seat = dict(seat="Seat_Pilot", lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000))
    pack = ("Retropack", "HeatShield")
    run(
        "ma-9 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, mid), 78, dict(azimuth=-70, res=(700, 1900))),
            ("vehicle-stack-pods.png", (0, 0, mid), 78, dict(azimuth=20, res=(700, 1900))),
            ("atlas-top.png", (0, 0, -2.6), 16, dict(azimuth=-80, elevation=4, res=(1300, 1500))),
            ("atlas-serial.png", (0, 0, tank + 5.6), 9, dict(azimuth=45, elevation=3, res=(1300, 1300))),
            ("atlas-engines.png", (0, 0, tank + 0.6), 13, dict(azimuth=-60, elevation=-38, res=(1400, 1300))),
            # (the capsule stands turned: the pilot's 315 degrees, the hatch, is the file's +X)
            ("capsule-window.png", (0, 0, 0.9), 9, dict(azimuth=-45, elevation=6, res=(1300, 1300))),
            ("capsule-hatch.png", (0, 0, 0.9), 9, dict(azimuth=0, elevation=6, res=(1300, 1300))),
            ("capsule-right.png", (0, 0, 0.9), 9, dict(azimuth=73, elevation=6, res=(1300, 1300))),
            ("capsule-umbilical.png", (0, 0, 0.9), 9, dict(azimuth=135, elevation=6, res=(1300, 1300))),
            ("capsule-far-side.png", (0, 0, 0.9), 9, dict(azimuth=-160, elevation=6, res=(1300, 1300))),
            ("capsule-united-states.png", (0, 0, 0.9), 9, dict(azimuth=-103, elevation=6, res=(1300, 1300))),
            ("capsule-as-photographed.png", (0, 0, 0.75), 6.5, dict(azimuth=-112, elevation=2, res=(1300, 1300))),
            ("capsule-shield.png", (0, 0, -0.2), 7, dict(azimuth=-60, elevation=-35, res=(1300, 1300))),
            ("emblem-close.png", (0.3, -0.3, 0.45), 2.6, dict(azimuth=-45, elevation=14, res=(1300, 1300))),
            ("emblem-raking.png", (0.3, -0.3, 0.45), 1.8, dict(azimuth=-100, elevation=8, res=(1300, 1300))),
            ("patches-close.png", (-0.28, -0.4, 1.2), 2.6, dict(azimuth=-130, elevation=14, res=(1300, 1300))),
            ("umbilical-door-close.png", (-0.45, 0.45, 0.82), 2.0, dict(azimuth=135, elevation=14, res=(1300, 1300))),
            ("window-close.png", (0.4, -0.4, wz), 3.2, dict(azimuth=-40, elevation=18, res=(1300, 1300))),
            ("canister-top.png", (0, 0, top), 3.0, dict(azimuth=30, elevation=38, res=(1300, 1300))),
            # the retropack from below and from its side, with only the shield behind it
            ("retropack-below.png", (0, 0, -0.5), 3.4, dict(azimuth=135, elevation=-48, only=pack, res=(1300, 1300))),
            ("retropack-side.png", (0, 0, -0.5), 3.2, dict(azimuth=45, elevation=-8, only=pack, res=(1300, 1300))),
            ("retropack-beacon.png", (-0.3, 0.3, -0.52), 1.6, dict(azimuth=100, elevation=-20, only=pack, res=(1300, 1300))),
            # from the couch, as the pilot's eyes have it (Seat_Pilot), by the cabin's own two lights
            ("cabin-ahead.png", (0, 0, 0), 0, seat),
            ("cabin-panel.png", (0, 0, 0), 0, dict(seat, lens=32, look=(0, -8))),
            ("cabin-left.png", (0, 0, 0), 0, dict(seat, look=(70, 15))),
            ("cabin-right.png", (0, 0, 0), 0, dict(seat, look=(-70, 15))),
            ("cabin-right-down.png", (0, 0, 0), 0, dict(seat, look=(-75, -35))),
            ("cabin-up.png", (0, 0, 0), 0, dict(seat, look=(0, 50))),
            # with the skin off: the television camera by his hand, the balloon's can under the flap
            (
                "tv-camera.png",
                (0.18, 0.4, 0.42),
                1.3,
                dict(azimuth=80, elevation=30, only=("CrewCabin_Pilot", "TV_", "CrewCabin_Equipment", "CrewCabin_Couch", "Ctl_"), res=(1300, 1300)),
            ),
            (
                "balloon-can.png",
                (0, 0, top - 0.08),
                1.1,
                dict(azimuth=170, elevation=20, only=("Antenna_Balloon", "Antenna_Fittings", "Antenna_Bicone"), res=(1300, 1300)),
            ),
        ],
    )
