"""Mercury spacecraft No. 13, "Friendship 7", on Atlas 109-D, as launched on Mercury-Atlas 6 (20 February 1962).

Run headless:
    pnpm model:ma-6            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. What No. 13 shared with the
Redstone capsules (the retropack, the recovery compartment, the antenna canister, the tower, the periscope's
optics, the couch) is ../../../vehicles/mercury_capsule.py; what it shared with No. 11, the first capsule of
its kind (the centreline window, the explosive hatch, the shingles round them, the panel), is built by that
flight's own script and ../../../vehicles/mercury_cabin_11.py, called from here; what was the orbital
capsules' (the ablation shield) is ../../../vehicles/mercury_orbital.py; and what was No. 13's own is here:
its paint, its hatch with all seventy bolts in, its pilot's name, and what each part says of this flight.

Every dimension is in inches and converted once, at the point of use, with IN. Station 0 is the heat shield's
maximum-diameter plane; +Z is toward the nose. Angles are round the cone in the pilot's frame, from his right
as he lies: the periscope is at 90 degrees (his feet), the window at 270 (his head), the hatch's middle at
315. The capsule is built so and then turned 45 degrees (mercury_capsule.stand), so that in the file its hatch
is on +X, the side a launch site's frame gives the hatch. See ../spacecraft.md for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    HeatShield  Retropack  Afterbody  Window  Hatch  CrewCabin  RecoveryCompartment
    AntennaCanister  EscapeTower
and, from ../../../vehicles/atlas_lv3b.py, the launch vehicle:
    AtlasAdapter  AtlasTank  AtlasPods  AtlasVerniers  AtlasSustainer  AtlasBoosterSection  AtlasBoosterEngines
"""

from __future__ import annotations

import importlib.util
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
import mercury_cabin_13  # noqa: E402
import mercury_capsule  # noqa: E402
import mercury_orbital  # noqa: E402
from mercury_capsule import (  # noqa: E402
    CONE_H,
    PILOT_HIP,
    THING_SHELLS,
    VESSEL,
    Z_RETRO_BOTTOM,
    Z_TOP,
    Skin,
)
from srlib import (  # noqa: E402
    IN,
    MeshBuilder,
    deg,
    group,
    interior,
    load_font,
    mark_shells,
    material,
    prof,
    run,
)


def _flight_script(flight: str):
    """Another Mercury flight's model script, loaded as a module and not run (its build is under `__main__`)."""
    path = os.path.join(_root, "missions", "usa", "mercury", "flights", flight, "model", "vehicle.py")
    spec = importlib.util.spec_from_file_location(f"vehicle_{flight.replace('-', '_')}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# Capsule No. 11 (Liberty Bell 7) was the first with the window and the explosive hatch, and the last before this one
# to fly with a man in it. Its script builds them, and the shingles round them; No. 13's are built by it, on the
# strength of the capsule as it is kept (NASM A19670176000: the window's plate, the hatch beside it, the shingle under
# the window with the name, the same seams). Where the window stands is measured on this capsule itself (the glass
# from station 21.9 to 41.3 between the cone's ends) and is the figure every capsule with the window is built to
# (`WINDOW_Z` there). See spacecraft.md, "What is assumed".
no11 = _flight_script("mr-4-liberty-bell-7")
WINDOW_T, WINDOW_Z, HATCH = no11.WINDOW_T, no11.WINDOW_Z, no11.HATCH
SCOPE_Z, SCOPE_DOOR, SCOPE_TUBE = no11.SCOPE_Z, no11.SCOPE_DOOR, no11.SCOPE_TUBE

Z_BOOSTER_BASE = -atlas_lv3b.LENGTH  # the booster engines' exit plane

# ------------------------------------------------------------------ what was No. 13's own (in, degrees)

# The shingle under the window: two stacks of ten beads, running down to the plain plate at the cone's foot (the
# capsule as kept: its beads end 14.1 in below the glass's foot, station 7.5, and the plate under them carries the
# ports marked J37 and J20).
NAME_STACKS = 2
NAME_FOOT = no11.BAND
# The paint. All of it is placed from photographs of this capsule on the pad and leaving it (NASA S62-00380,
# GPN-2006-000027 and its colour twin, GPN-2000-000686) and of the capsule as it is kept, where its traces remain;
# none of the places is dimensioned (spacecraft.md, "Paint"). Read again in November 2026, when the window was
# moved: each photograph's camera was fitted to the cone (its joint with the cylinder, the ring at its foot) or to
# hardware so placed, the skin unrolled, and each thing read by how far it stands from the glass.
# UNITED STATES stood on it twice, each with a flag under it: to the left of the window, the flag under its first
# letters, and round to the right of the hatch, the flag under its last. Each: the middle of its two lines round the
# cone, and where its flag's middle is. The two pairs are at the same stations, to the 0.6 in they can be read to.
UNITED_STATES = ((deg(217), deg(206)), (deg(24), deg(33)))
LINES = (36.9, 28.0)  # the stations of the two lines: UNITED's top 1.6 in below the glass's head, STATES' foot 3.4 above its foot
LETTERS = (23.0, 6.3)  # a line's length and its letters' height
FLAG = (16.9, 12.0)  # the flags' station, and their width: the flag's top just under the seam at the window's foot
# Friendship: low on the shingle under the window, level (the climb it was given until now was the camera's), from its
# F's swash past the seam at 255 degrees to its p just over the one at 285; and the red 7 through it between the n and
# the d, its top 4.7 in below the glass's foot and its foot just above the beads' foot.
NAME = (deg(268.8), 11.8, 20.6, deg(0))  # its middle, its length, how its line climbs
SEVEN = (deg(270.6), 12.4, 9.6)  # the red 7 through it: its middle and its height
SEVEN_EDGE = 0.3  # the white edge round the 7, inches
# from one layer of the name's paint to the next, inches: over a millimetre apart even where a coarser level of detail
# bridges the beads otherwise for one layer than for the next (a sixteenth of an inch was not, once the 7 lay across more of them)
LAYER = 0.08
BRUSH = (1.8, 0.07)  # the hand's letters against the typeface's: how much taller for their width, and how much heavier (inches)

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "Retropack_Housing",
    "Afterbody_Shingles",
    "Afterbody_Fasteners",
    "Afterbody_Plates",
    "Afterbody_Structure",
    "Afterbody_AttachRing",
    "Afterbody_Lettering",
    "Afterbody_Name",
    "Afterbody_Seven",
    "Afterbody_SevenEdge",
    "Afterbody_Flag",
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
    "Tower_EscapeMotor",
    "Tower_MotorBands",
)

# What this flight says of the things No. 11's script and the shared modules build with another flight's words.
PERISCOPE = (
    "Periscope",
    "The periscope's objective, put out through its door: an 8 in screen in the middle of the panel showed what it saw. "
    "With the hatch half bolted on, Glenn looked through it at the sky over the pad and said the weather was breaking up. "
    "In orbit it showed him the ground track under him; he found the window the better instrument. Placed as Liberty Bell 7's.",
)
SAYS = {
    "Window_": (
        "Window",
        "The window in front of the pilot's face: an outer pane of Vycor curved to the cone and three inner panes that hold the "
        "cabin's pressure. Through it Glenn watched three sunsets, the lights of Perth, and his retropack burning away in pieces.",
    ),
    "Periscope_Cartridge": PERISCOPE,
    "Periscope_Lens": PERISCOPE,
    "Periscope_Barrel": PERISCOPE,
    "Periscope_Mirror": PERISCOPE,
    "Periscope_Housing": PERISCOPE,
    "Periscope_Mouth": PERISCOPE,
    "Umbilical_Receptacle": (
        "Umbilical receptacle",
        "Where the ground's umbilical was plugged in until it was thrown off 35 seconds before liftoff: under the periscope's lens, "
        "inside its door. "
        "Placed as Liberty Bell 7's, whose photographs show it; no photograph of this capsule read shows this side.",
    ),
    "Retropack_Retro": (
        "Retrograde rockets",
        "Three solid motors of about 1,000 lbf for ten seconds each, fired five seconds apart over California at the end of the third "
        "orbit: what brought the capsule down. The pack should then have been dropped. It was kept on through the entry instead.",
    ),
    "Retropack_Straps": (
        "Retropack straps",
        "Three straps hold the pack to the heat shield until explosive bolts let it go. On this flight they were left to hold the "
        "shield on: a signal said its latches might have let go, and the pack was kept on through the entry. One strap flapped in "
        "front of the window and burned through. They should meet under the pack's middle at one bolt; here they do not.",
    ),
}


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> Skin:
    """The cone's skin as No. 11's script builds it (shingles, plates, hatch, periscope's door, roll jets), with No. 11's
    paint taken off again and No. 13's put on."""
    skin = no11.build_afterbody(M, font, name_stacks=NAME_STACKS, name_foot=NAME_FOOT)
    g = bpy.data.objects["Afterbody"]
    for name in ("Afterbody_Lettering", "Afterbody_Crack", "Afterbody_Flag"):
        obj = bpy.data.objects[name]
        if name in THING_SHELLS:
            THING_SHELLS.remove(name)
        mesh = obj.data
        bpy.data.objects.remove(obj)
        bpy.data.meshes.remove(mesh)
    build_paint(M, g, skin, font)
    return skin


def build_paint(M, g, skin: Skin, font) -> None:
    """The paint, as launched: UNITED STATES twice, each with its flag under it, and under the window the name, lettered
    by hand in white script with a red 7 through it."""
    paint, flag = MeshBuilder(), MeshBuilder()
    fz, fw = FLAG
    fh = fw / 1.9
    nx, ny = 12, 6
    verts = [((i / nx - 0.5) * fw, (j / ny - 0.5) * fh) for j in range(ny + 1) for i in range(nx + 1)]
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    for t, ft in UNITED_STATES:
        for body, z in zip(("UNITED", "STATES"), LINES):
            skin.lettering(paint, body, *LETTERS, t, z, font)
        skin.paint(flag, verts, faces, ft, fz, uv=lambda x, y: (x / fw + 0.5, y / fh + 0.5))
    paint.build("Afterbody_Lettering", M["paint_white"], g, smooth=False)
    flag.build("Afterbody_Flag", M["flag"], g, sharp_angle=None)

    # The name: "Friendship" in a chancery hand, climbing to the right, and a tall red 7 edged in white standing through
    # it between the n and the d. The 7 lies under the word where they cross, so each is its own layer off the skin.
    says = (
        "Friendship 7",
        "Glenn's children chose the name. Where Shepard's and Grissom's had been stencilled, he had this one lettered by hand: "
        "Cecelia Bibby, an artist at the Cape, painted it on the capsule in white script with a red 7. "
        "It is drawn here in a chancery typeface, which is not her hand; its place and size are read off photographs.",
    )
    name, seven, edge = MeshBuilder(), MeshBuilder(), MeshBuilder()
    nt, nz, length, rise = NAME
    hand = mercury_orbital.script_font() or font
    lift = mercury_capsule.PAINT_LIFT
    st, sz, tall = SEVEN
    # (each layer LAYER off the one under it: the white edge, the red on it, the word across both)
    mercury_orbital.hand_lettering(skin, edge, "7", tall, st, sz, hand, upright=True, fatten=SEVEN_EDGE, lift=lift)
    mercury_orbital.hand_lettering(skin, seven, "7", tall, st, sz, hand, upright=True, lift=lift + LAYER)
    mercury_orbital.hand_lettering(skin, name, "Friendship", length, nt, nz, hand, rise=rise, tall=BRUSH[0], fatten=BRUSH[1], lift=lift + 2 * LAYER)
    for mb, mesh, mat in (
        (edge, "Afterbody_SevenEdge", "paint_white"),
        (seven, "Afterbody_Seven", "paint_red"),
        (name, "Afterbody_Name", "paint_white"),
    ):
        mercury_capsule.thing(mb, mesh, M[mat], g, *says, smooth=False)


def build_crew_cabin(M, window: dict) -> None:
    g = group("CrewCabin")
    v = MeshBuilder()
    rv = VESSEL.r
    inner_opening = mercury_cabin_13.WINDOW_OPENING
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5)]), 144)  # the aft pressure bulkhead
    mercury_capsule.wall(v, rv, 0.5, CONE_H - 0.3, (HATCH, inner_opening))
    v.lathe(prof([(rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # the small bulkhead
    mercury_capsule.sill(v, HATCH)
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)
    mercury_capsule.bulkhead_stiffeners(M, g)
    if not interior():
        return
    # The pilot: the Mark IV suit as modelled for Shepard (crew/mark_iv_suit.py), on the couch, with Glenn's name on its tag.
    # Glenn's own measures and what his suit had that Shepard's had not are in spacecraft.md ("The pilot"): not modelled.
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    mark_iv_suit.NAME = "J. H. GLENN"
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    where = mercury_cabin_13.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, HATCH, CONE_H - 0.3, mark_iv_suit.seated_points(), window, SCOPE_Z)
    mercury_cabin_13.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, HATCH)
    print(f"ma-6 cabin: {where}")
    mercury_capsule.oxygen_and_bag(M, g)
    # (what lets light in with the lamps out: the window's inner panes and the periscope's screen)
    openings = [(window["centre"], 0.5 * window["pane"][1] * IN), (where["periscope"]["screen"], where["periscope"]["radius"])]
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
    # crinkled aluminium foil over the insulation round the window's well, as No. 11's photographs show it
    M["foil"] = material("insulation-foil", (0.74, 0.73, 0.69), 1.0, 0.36, double_sided=True)
    mercury_orbital.build_ablation_shield(
        M,
        "Glass fibre in phenolic resin, which chars and boils away and takes the heat with it: an orbital entry is too long for "
        "the solid beryllium the Redstone capsules had. A signal on the second orbit said this shield might have come unlatched; "
        "it had not. It came down with its retropack still strapped across it.",
    )
    mercury_capsule.build_retropack(M)
    build_afterbody(M, font)
    window = no11.build_window(M)
    build_crew_cabin(M, window)
    # the periscope's lower housing comes in through the pressure vessel (and the lining, where there is one) under its
    # door: the door, the cartridge and the link between them are No. 11's (mercury_capsule.ScopeWorks), where No. 11's are
    scope = mercury_capsule.ScopeWorks(SCOPE_DOOR, SCOPE_Z, SCOPE_TUBE)
    mercury_capsule.periscope_mouth(("CrewCabin_PressureVessel", *(("CrewCabin_Lining",) if interior() else ())), scope)
    mercury_capsule.build_recovery_compartment(M)
    mercury_capsule.build_antenna_canister(M)
    mercury_capsule.build_escape_tower(M)
    say()
    # the capsule is built in the pilot's frame; it stands on the booster with its hatch on +X, as every site's frame has it
    turn = mercury_capsule.stand((HATCH[0] + HATCH[1]) / 2, mercury_capsule.SPACECRAFT)
    # (the periscope's door, cartridge and link: each one's motion into its node, now that the capsule stands as it will)
    mercury_capsule.periscope_run(scope, turn)
    atlas_lv3b.build(Z_BOOSTER_BASE, font, serial="10 9D")
    mark_shells(SHELLS + mercury_orbital.SHELLS + tuple(THING_SHELLS) + atlas_lv3b.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    wz = WINDOW_Z * IN
    mid = (Z_TOP + Z_BOOSTER_BASE) / 2 * IN
    tank = -atlas_lv3b.LENGTH * IN
    run(
        "ma-6 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, mid), 78, dict(azimuth=-70, res=(700, 1900))),
            ("vehicle-stack-pods.png", (0, 0, mid), 78, dict(azimuth=20, res=(700, 1900))),
            ("atlas-top.png", (0, 0, -2.6), 16, dict(azimuth=-80, elevation=4, res=(1300, 1500))),
            ("atlas-booster.png", (0, 0, tank + 3.0), 22, dict(azimuth=-60, elevation=2, res=(1300, 1500))),
            ("atlas-booster-pods.png", (0, 0, tank + 3.0), 22, dict(azimuth=25, elevation=2, res=(1300, 1500))),
            ("atlas-engines.png", (0, 0, tank + 0.6), 13, dict(azimuth=-60, elevation=-38, res=(1400, 1300))),
            ("atlas-adapter.png", (0, 0, -0.5), 7, dict(azimuth=-88, elevation=2, res=(1300, 1300))),
            # (the capsule stands turned: the pilot's 315 degrees, the hatch, is the file's +X)
            ("capsule-window.png", (0, 0, 0.9), 9, dict(azimuth=-45, elevation=6, res=(1300, 1300))),
            ("capsule-hatch.png", (0, 0, 0.9), 9, dict(azimuth=0, elevation=6, res=(1300, 1300))),
            ("capsule-right.png", (0, 0, 0.9), 9, dict(azimuth=60, elevation=6, res=(1300, 1300))),
            ("capsule-periscope.png", (0, 0, 0.9), 9, dict(azimuth=135, elevation=6, res=(1300, 1300))),
            ("capsule-far-side.png", (0, 0, 0.9), 9, dict(azimuth=-160, elevation=6, res=(1300, 1300))),
            ("capsule-united-states.png", (0, 0, 0.9), 9, dict(azimuth=-98, elevation=6, res=(1300, 1300))),
            ("capsule-shield.png", (0, 0, -0.2), 7, dict(azimuth=-60, elevation=-35, res=(1300, 1300))),
            ("name-close.png", (0.3, -0.3, 0.55), 2.8, dict(azimuth=-43, elevation=4, res=(1300, 1300))),
            ("window-close.png", (0.4, -0.4, wz), 3.2, dict(azimuth=-40, elevation=18, res=(1300, 1300))),
            # from the couch, as the pilot's eyes have it (Seat_Pilot), by the cabin's own two lights
            ("cabin-ahead.png", (0, 0, 0), 0, dict(seat="Seat_Pilot", lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000))),
            (
                "cabin-left.png",
                (0, 0, 0),
                0,
                dict(seat="Seat_Pilot", look=(70, 15), lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000)),
            ),
            (
                "cabin-right.png",
                (0, 0, 0),
                0,
                dict(seat="Seat_Pilot", look=(-70, 15), lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000)),
            ),
            (
                "cabin-up.png",
                (0, 0, 0),
                0,
                dict(seat="Seat_Pilot", look=(0, 50), lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000)),
            ),
        ],
    )
