"""Mercury spacecraft No. 16, "Sigma 7", on Atlas 113-D, as launched on Mercury-Atlas 8 (3 October 1962).

Run headless:
    pnpm model:ma-8            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. What No. 16 shared with every
capsule so far (the retropack, the recovery compartment, the antenna canister, the tower, the periscope's
optics, the couch) is ../../../vehicles/mercury_capsule.py; what it shared with No. 11, the first capsule of its
kind (the centreline window, the explosive hatch, the shingles round them, the panel), is built by that flight's
own script and ../../../vehicles/mercury_cabin_11.py, called from here; what was the orbital capsules' (the
ablation shield, a striped retropack, the dipole antenna on it) is ../../../vehicles/mercury_orbital.py; and what
was No. 16's own is here and in ../../../vehicles/mercury_cabin_16.py: its emblem, a sigma and a 7, and the rest
of its paint, nine panels of ablation materials bonded to the beryllium shingles of the cylinder, a white patch
painted on one shingle to take its temperature, the hand-held camera in its kit.

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
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "crew"))
import atlas_lv3b  # noqa: E402
import mark_iv_suit  # noqa: E402
import mercury_cabin  # noqa: E402
import mercury_cabin_16  # noqa: E402
import mercury_capsule  # noqa: E402
import mercury_orbital  # noqa: E402
from mercury_capsule import (  # noqa: E402
    CONE,
    CONE_H,
    CYL,
    PILOT_HIP,
    THING_SHELLS,
    VESSEL,
    Z_CYL,
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


# Capsule No. 11 (Liberty Bell 7) was the first with the window and the explosive hatch. Its script builds them where
# its own photographs put them, and the shingles round them; No. 16's are built by it, on the strength of this capsule's
# own photographs (NASA GPN-2000-001441, S62-06002, S62-06175: the window's plate, the hatch beside it on the pilot's
# right, the seam at the window's foot), with what those photographs show otherwise. See spacecraft.md.
no11 = _flight_script("mr-4-liberty-bell-7")
WINDOW_T, WINDOW_Z, HATCH = no11.WINDOW_T, no11.WINDOW_Z, no11.HATCH
SCOPE_Z, SCOPE_DOOR, SCOPE_TUBE = no11.SCOPE_Z, no11.SCOPE_DOOR, no11.SCOPE_TUBE

Z_BOOSTER_BASE = -atlas_lv3b.LENGTH  # the booster engines' exit plane

# ------------------------------------------------------------------ what was No. 16's own (in, degrees)

# The shingle under the window carries two stacks of beads side by side, as No. 18's did: the shingle itself, as flown
# and as it is kept (Commons: Flown Superalloy Shingle with Sigma 7 logo ...), eleven beads in each stack.
NAME_STACKS = 2

# The paint. All of it is placed from photographs of this capsule (spacecraft.md, "Paint"); none of it is dimensioned.
# UNITED STATES stood on it twice, each with a flag under it: to the left of the window (NASA S62-06144, on the
# carrier's deck) and round to the right of the hatch (NASA GPN-2000-001441, in the hangar; KSC-62PC-0078, the liftoff).
# Each: the middle of its two lines round the cone, and where its flag's middle is. The second's flag is in both of
# its photographs; no photograph read shows the first's, which is put where No. 18's was.
UNITED_STATES = ((deg(212), deg(208)), (deg(20), deg(28)))
LINES = (38.4, 31.3)  # the stations of the two lines
LETTERS = (23.0, 6.0)  # a line's length and its letters' height
FLAG = (20.2, 12.0)  # the flags' station, and their width
# "A rectangular white-painted patch was added to the spacecraft to evaluate the effect on spacecraft shingle
# temperatures" (NASA TN D-4807, p. 12: documented), as on No. 18. Its middle, and its size across and up the cone: read
# off NASA S62-06144, a photograph taken from a distance after the flight, in which a pale rectangle the beads show
# through stands above the first UNITED, between its U and its N, above the seam. Estimated, and the reading is not sure.
PATCH = (deg(191), 50.3, 4.0, 4.0)

# The emblem, on the shingle under the window: a sigma, and a 7 lying in its mouth. Laid out from the shingle's own
# corner, the seam at the window's foot (station 24.8) where it meets the seam at 255 degrees, in inches to the right
# and inches down the cone. Read off the shingle itself, photographed square on as it is kept, scaled by its width
# (the model's is 16.3 in at its middle); its place under the window from NASA S62-06002, in which the sigma's bar
# lies just under the fasteners at the window's foot.
CORNER = (deg(255), no11.SEAM_LOW)
EMBLEM_AT = (2.9, 1.3)  # the sigma's upper left corner: inches right of the shingle's corner and inches down from it
# (each outline: inches right and inches down from the sigma's upper left corner, walked round)
SIGMA = (
    (0.0, 0.0),
    (6.6, 0.0),
    (7.85, 1.75),
    (7.3, 1.75),
    (6.6, 0.72),
    (1.3, 0.72),
    (3.4, 3.75),
    (1.05, 7.45),
    (3.25, 7.45),
    (3.85, 6.7),
    (4.35, 6.7),
    (4.35, 8.18),
    (0.15, 8.18),
    (1.95, 3.95),
)
SEVEN = (
    (3.5, 4.1),
    (9.3, 3.85),
    (8.15, 5.15),
    (6.55, 7.05),
    (5.72, 9.05),
    (5.95, 10.45),
    (4.35, 10.2),
    (4.88, 9.05),
    (5.78, 7.12),
    (7.05, 5.58),
    (8.25, 4.5),
    (6.7, 4.72),
    (5.25, 5.15),
    (3.7, 5.28),
)
EDGE = (0.13, 0.11)  # the pale edge painted round the sigma, and round the 7, inches
LAYER = 0.07  # from the edges' paint to the colours' over it, inches: over a millimetre apart even on a bead's flank

# The ablation experiment: "Each ablation panel, which was bonded to a beryllium shingle of the cylindrical section of
# the spacecraft, was 15 inches long and 5 inches wide. The panel was centered on the shingle and was applied, starting
# at the juncture of the conical and cylindrical sections", on nine of the twelve shingles (NASA TN D-4807, p. 75;
# NASA SP-12, p. 10). Documented. How thick a panel was is not in anything read: estimated.
PANEL = (15.0, 5.0, 0.3)  # a panel: along the cylinder, round it, and how far it stands off the shingle
# What each of the twelve shingles carried, by the angle of its middle from 30 degrees round in steps of 30: a panel
# by its tone, or nothing. The reports' photograph of the ten shingles laid out (SP-12, Figure 1-9; TN D-4807, Figure
# 33) is in black and white: four panels are pale, one is grey, four are dark. Which shingle stood where round the
# cylinder is not in anything read, but for one: the liftoff's photograph (KSC-62PC-0078) has a pale panel above the
# second UNITED STATES. The rest of this order, and which three were bare ("two oppositely mounted": 60 and 240
# degrees here), are estimated.
PANELS = ("pale", None, "dark", "pale", None, "dark", "grey", None, "pale", "dark", "pale", "dark")

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "Retropack_Housing",
    "Afterbody_Shingles",
    "Afterbody_Fasteners",
    "Afterbody_Plates",
    "Afterbody_Structure",
    "Afterbody_AttachRing",
    "Afterbody_Lettering",
    "Afterbody_Flag",
    "Afterbody_Patch",
    "Afterbody_SigmaEdge",
    "Afterbody_Sigma",
    "Afterbody_SevenEdge",
    "Afterbody_Seven",
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
    "Recovery_AblationPale",
    "Recovery_AblationGrey",
    "Recovery_AblationDark",
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
    "Schirra lined the capsule up in yaw with it and without it, by day and by night, and reported that the window was "
    'enough and the periscope a second way of doing the same thing; at night it showed him nothing. "That chart helps no '
    "end to cover up that blasted periscope,\" he said. The next capsule flew without one. Placed as Liberty Bell 7's.",
)
SAYS = {
    "Window_": (
        "Window",
        "The window in front of the pilot's face: an outer pane of Vycor curved to the cone and three inner panes that hold the "
        "cabin's pressure. When the escape tower left, its rocket laid a thin film on it, as it had on Glenn's and Carpenter's. "
        "Schirra flew the turnaround on his instruments and would not look out of it until it was done; then he tracked the "
        "spent Atlas down across it with the smallest jets, and later lined the capsule up on the Moon and Venus.",
    ),
    "Periscope_Cartridge": PERISCOPE,
    "Periscope_Lens": PERISCOPE,
    "Periscope_Barrel": PERISCOPE,
    "Periscope_Mirror": PERISCOPE,
    "Periscope_Housing": PERISCOPE,
    "Periscope_Mouth": PERISCOPE,
    "Umbilical_Receptacle": (
        "Umbilical receptacle",
        "Where the ground's umbilical was plugged in until it was thrown off in the last minute of the count: under the "
        "periscope's lens, inside its door. Two cameras at the pad saw it go, the periscope draw in and the door shut. "
        "Placed as Liberty Bell 7's, whose photographs show it; no photograph of this capsule read shows this side.",
    ),
    "Retropack_Retro": (
        "Retrograde rockets",
        "Three solid motors of about 1,000 lbf for ten seconds each, fired five seconds apart: what brings the capsule down. "
        "On this flight the capsule's clock fired them, at 8 hours 52 minutes, with the autopilot holding the attitude: "
        '"the spacecraft did not seem to vary as much as half a degree," and the stars in the window "did not even quiver". '
        "The heater blankets earlier capsules had wrapped round them were left off to save weight.",
    ),
    "Retropack_Straps": (
        "Retropack straps",
        "Three straps hold the pack to the heat shield until explosive bolts let it go, a minute after the first rocket has "
        'lit: "I have retrojett, and light is green. I could hear it, by the way." '
        "They should meet under the pack's middle at one bolt; here they do not.",
    ),
}


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> Skin:
    """The cone's skin as No. 11's script builds it (shingles, plates, hatch, periscope's door, roll jets) with this
    capsule's shingle under the window, and No. 16's paint put on."""
    skin = no11.build_afterbody(M, font, name_stacks=NAME_STACKS, paint=False)
    build_paint(M, bpy.data.objects["Afterbody"], skin, font)
    return skin


def on_shingle(right: float, down: float) -> tuple[float, float]:
    """A place on the shingle under the window, from inches to the right of its corner and inches down the cone from
    it, as (angle, station)."""
    z = CORNER[1] - down * math.cos(CONE.a)
    return CORNER[0] + right / CONE.r(z), z


def inset(outline, by: float) -> list[tuple[float, float]]:
    """An outline moved in by `by` inches all round, each corner to where its two sides' lines then meet."""
    n = len(outline)
    area = sum(outline[i][0] * outline[(i + 1) % n][1] - outline[(i + 1) % n][0] * outline[i][1] for i in range(n))
    sign = 1.0 if area > 0 else -1.0
    out = []
    for i in range(n):
        (x0, y0), (x1, y1), (x2, y2) = outline[i - 1], outline[i], outline[(i + 1) % n]
        l0, l1 = math.hypot(x1 - x0, y1 - y0), math.hypot(x2 - x1, y2 - y1)
        e0, e1 = ((x1 - x0) / l0, (y1 - y0) / l0), ((x2 - x1) / l1, (y2 - y1) / l1)
        n0, n1 = (-sign * e0[1], sign * e0[0]), (-sign * e1[1], sign * e1[0])
        cross = e0[0] * e1[1] - e0[1] * e1[0]
        s = ((n1[0] - n0[0]) * e1[1] - (n1[1] - n0[1]) * e1[0]) * by / cross if abs(cross) > 1e-9 else 0.0
        out.append((x1 + n0[0] * by + e0[0] * s, y1 + n0[1] * by + e0[1] * s))
    return out


def filled(outline) -> tuple[list[tuple[float, float]], list[tuple[int, ...]]]:
    """An outline (inches right and inches down) as flat geometry for Skin.paint: x to the right, y up the cone."""
    flat = [(x, -y) for x, y in outline]
    return flat, [tuple(t) for t in tessellate_polygon([[Vector((x, y, 0.0)) for x, y in flat]])]


def build_paint(M, g, skin: Skin, font) -> None:
    """The paint, as launched: UNITED STATES twice, each with its flag under it; the white patch over the first; and
    under the window the emblem, a red sigma with a yellow 7 in its mouth, each edged pale."""
    paint, flag, patch = MeshBuilder(), MeshBuilder(), MeshBuilder()
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

    pt, pz, pw, ph = PATCH
    skin.paint(patch, [(-pw / 2, -ph / 2), (pw / 2, -ph / 2), (pw / 2, ph / 2), (-pw / 2, ph / 2)], [(0, 1, 2, 3)], pt, pz)
    mercury_capsule.thing(
        patch,
        "Afterbody_Patch",
        M["paint_white"],
        g,
        "White paint patch",
        "An experiment in paint, flown a second time because Aurora 7's figures were doubted. One shingle carried a patch "
        "of white paint over a thermocouple, with another thermocouple under the bare, oxidised metal beside it. Going up, "
        "the dark shingle ran as much as 410 °F hotter than the white; in orbit 130 °F hotter in sunlight and 70 °F in the "
        "dark; late in the entry, when the dark metal radiated better, 110 °F cooler. "
        "That it was there is the report's; its size and place are read off one distant photograph, and are not sure.",
        smooth=False,
    )

    # The emblem. Each letter is two layers: its pale edge, and its colour LAYER over that, drawn in by the edge's width.
    says = (
        "Sigma 7",
        "Schirra's flight was to be an engineering test, so he named the capsule for the engineer's sign for a sum, the Greek "
        "capital sigma, with the 7 of the seven astronauts: the sum of the work of everyone who had built and checked it. "
        "It was painted on the shingle under the window: a red sigma and a yellow 7 lying in its mouth, each edged pale. "
        "The shingle survives, its paint scorched, and the outlines here are read off it; the colours are its colours as they "
        "are now, and its place under the window is read off a photograph of Schirra going aboard.",
    )
    lift = mercury_capsule.PAINT_LIFT
    at = on_shingle(*EMBLEM_AT)
    for outline, edge, name, pale, colour in (
        (SIGMA, EDGE[0], "Sigma", "paint_cream", "paint_sigma"),
        (SEVEN, EDGE[1], "Seven", "paint_white", "paint_yellow"),
    ):
        under, over = MeshBuilder(), MeshBuilder()
        skin.paint(under, *filled(outline), *at, lift=lift)
        skin.paint(over, *filled(inset(outline, edge)), *at, lift=lift + LAYER)
        mercury_capsule.thing(under, f"Afterbody_{name}Edge", M[pale], g, *says, smooth=False)
        mercury_capsule.thing(over, f"Afterbody_{name}", M[colour], g, *says, smooth=False)


def build_ablation_panels(M) -> None:
    """The nine panels of ablation materials bonded to the beryllium shingles of the recovery compartment (PANEL,
    PANELS): each a slab with its edges broken, following the cylinder, its foot at the cone's top."""
    g = bpy.data.objects["RecoveryCompartment"]
    long, wide, thick = PANEL
    z0 = Z_CYL + 0.5
    lip = 0.08  # how far the upper face stands in from the edge
    # (across and along: where, and how far off the shingle; the first and last of each are sunk into the shingle)
    across = [(-wide / 2, -0.06), (-wide / 2, thick - lip), (-wide / 2 + lip, thick)]
    across += [(-wide / 2 + lip + (wide - 2 * lip) * i / 6, thick) for i in range(1, 6)]
    across += [(wide / 2 - lip, thick), (wide / 2, thick - lip), (wide / 2, -0.06)]
    along = [(z0, -0.06), (z0, thick - lip), (z0 + lip, thick), (z0 + long - lip, thick), (z0 + long, thick - lip), (z0 + long, -0.06)]
    tones: dict[str, MeshBuilder] = {}
    for k, tone in enumerate(PANELS):
        if tone is None:
            continue
        t = deg(30 + 30 * k)
        tones.setdefault(tone, MeshBuilder()).grid(
            lambda i, j, t=t: CYL.p(t + across[i][0] / CYL.r0, along[j][0], min(across[i][1], along[j][1])),
            range(len(across)),
            range(len(along)),
        )
    says = (
        "Ablation panels",
        "An experiment bonded to the outside. The cylinder's twelve shingles are thick beryllium, which soaks up the heat of "
        "the entry; on nine of them this flight carried a panel fifteen inches by five of a material that chars and wears away "
        "instead: eight materials from six makers, being weighed for the spacecraft to come after Mercury. Most had holes cut in "
        "them and some of the holes filled, to see how a repair would last. All nine came back charred and cracked and still "
        "stuck on; the rubbery ones did best. Schirra watched for colours from them in the entry and saw one green glow. "
        "Their number, size and place on each shingle are the report's; their thickness, their tones (from a photograph in "
        "black and white) and which shingle carried which are estimated.",
    )
    for tone, name in (("pale", "Pale"), ("grey", "Grey"), ("dark", "Dark")):
        mercury_capsule.thing(tones[tone], f"Recovery_Ablation{name}", M[f"ablation_{tone}"], g, *says, sharp_angle=30)


def build_crew_cabin(M, window: dict) -> None:
    g = group("CrewCabin")
    v = MeshBuilder()
    rv = VESSEL.r
    inner_opening = mercury_cabin_16.WINDOW_OPENING
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5)]), 144)  # the aft pressure bulkhead
    mercury_capsule.wall(v, rv, 0.5, CONE_H - 0.3, (HATCH, inner_opening))
    v.lathe(prof([(rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # the small bulkhead
    mercury_capsule.sill(v, HATCH)
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)
    mercury_capsule.bulkhead_stiffeners(M, g)
    if not interior():
        return
    # The pilot: the Mark IV suit as modelled for Shepard (crew/mark_iv_suit.py), on the couch, with Schirra's name on its
    # tag. Schirra's own measures and what his suit had that Shepard's had not are in spacecraft.md ("The pilot"): not modelled.
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    mark_iv_suit.NAME = "W. M. SCHIRRA"
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    where = mercury_cabin_16.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, HATCH, CONE_H - 0.3, mark_iv_suit.seated_points(), window, SCOPE_Z)
    mercury_cabin_16.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, HATCH)
    print(f"ma-8 cabin: {where}")
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
    M.update(mercury_orbital.retropack_materials())
    # crinkled aluminium foil over the insulation round the window's well, as No. 11's photographs show it
    M["foil"] = material("insulation-foil", (0.74, 0.73, 0.69), 1.0, 0.36, double_sided=True)
    # the emblem's colours, read off the shingle as it is kept, scorched (estimated)
    M["paint_cream"] = material("paint-cream", (0.92, 0.88, 0.70), 0.0, 0.6, double_sided=True)
    M["paint_sigma"] = material("paint-sigma-red", (0.50, 0.02, 0.014), 0.0, 0.55, double_sided=True)
    M["paint_yellow"] = material("paint-yellow", (0.80, 0.50, 0.03), 0.0, 0.6, double_sided=True)
    # the ablation panels' tones, read off the reports' black-and-white photograph of them (estimated: their colours are not known)
    M["ablation_pale"] = material("ablator-sample-pale", (0.80, 0.77, 0.68), 0.0, 0.85)
    M["ablation_grey"] = material("ablator-sample-grey", (0.36, 0.35, 0.33), 0.0, 0.85)
    M["ablation_dark"] = material("ablator-sample-dark", (0.11, 0.07, 0.05), 0.0, 0.8)
    mercury_orbital.build_ablation_shield(
        M,
        "Glass fibre in phenolic resin, which chars and boils away and takes the heat with it. This one lost 17.4 lb, more than "
        "any before it, and charred a third of an inch deep. Its centre plug, which Aurora 7's shield had lost, was bolted "
        "in for this flight and stayed. Afterwards the ablating layer was found cracked and come unglued from the structure "
        "under it over half the shield's radius; a piece was then cut from Aurora 7's, which had come unglued too.",
    )
    mercury_capsule.build_retropack(M)
    mercury_orbital.retropack_stripes(
        M,
        "The retropack was painted in stripes, dark on light, all the way round and on over its lower end. Paint was how a "
        "spacecraft's temperature was set, and this pack had to keep its three motors fit to fire for nine hours with nothing "
        "else to help: the heater blankets earlier capsules had wrapped round them were left off this one to save weight. "
        "That it was striped is from photographs of this capsule, and nothing read says why; how many stripes and how wide "
        "are counted off one photograph, and only the wall's are drawn.",
    )
    mercury_orbital.hf_dipole(
        M,
        "New for this flight: an aerial for the high-frequency voice radio, in two halves on opposite sides of the retropack. "
        "Each is a tape of beryllium copper that curls into a tube five-eighths of an inch across as it leaves its reel; a "
        "minute after the capsule left the Atlas a squib let both go, fourteen feet each way. It was put on to carry the "
        "pilot's voice further in orbit, and did: on the first pass the station at Hangar S heard him without a break from "
        "Guaymas in Mexico until he was near Bermuda. He could switch the radio between it and the bicone in the nose. It "
        "went with the retropack, its cables cut by a charge. "
        "The tape's size and that there were two on the pack are the report's; the units are drawn from a photograph with "
        "no scale, and where round the pack they stood is estimated. They are shown rolled up, as launched.",
    )
    build_afterbody(M, font)
    window = no11.build_window(M)
    build_crew_cabin(M, window)
    # the periscope's lower housing comes in through the pressure vessel (and the lining, where there is one) under its
    # door: the door, the cartridge and the link between them are No. 11's (mercury_capsule.ScopeWorks), where No. 11's are
    scope = mercury_capsule.ScopeWorks(SCOPE_DOOR, SCOPE_Z, SCOPE_TUBE)
    mercury_capsule.periscope_mouth(("CrewCabin_PressureVessel", *(("CrewCabin_Lining",) if interior() else ())), scope)
    mercury_capsule.build_recovery_compartment(M)
    build_ablation_panels(M)
    mercury_capsule.build_antenna_canister(M)
    mercury_capsule.build_escape_tower(M)
    say()
    # the capsule is built in the pilot's frame; it stands on the booster with its hatch on +X, as every site's frame has it
    turn = mercury_capsule.stand((HATCH[0] + HATCH[1]) / 2, mercury_capsule.SPACECRAFT)
    # (the periscope's door, cartridge and link: each one's motion into its node, now that the capsule stands as it will)
    mercury_capsule.periscope_run(scope, turn)
    atlas_lv3b.build(Z_BOOSTER_BASE, font, serial="11 3D", baffled_injectors=True, hypergolic_igniters=True)
    mark_shells(SHELLS + mercury_orbital.SHELLS + tuple(THING_SHELLS) + atlas_lv3b.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    wz = WINDOW_Z * IN
    mid = (Z_TOP + Z_BOOSTER_BASE) / 2 * IN
    tank = -atlas_lv3b.LENGTH * IN
    neck = (Z_CYL + 11.0) * IN
    seat = dict(seat="Seat_Pilot", lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000))
    run(
        "ma-8 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, mid), 78, dict(azimuth=-70, res=(700, 1900))),
            ("vehicle-stack-pods.png", (0, 0, mid), 78, dict(azimuth=20, res=(700, 1900))),
            ("atlas-top.png", (0, 0, -2.6), 16, dict(azimuth=-80, elevation=4, res=(1300, 1500))),
            ("atlas-booster.png", (0, 0, tank + 3.0), 22, dict(azimuth=-60, elevation=2, res=(1300, 1500))),
            ("atlas-serial.png", (0, 0, tank + 5.6), 9, dict(azimuth=45, elevation=3, res=(1300, 1300))),
            ("atlas-engines.png", (0, 0, tank + 0.6), 13, dict(azimuth=-60, elevation=-38, res=(1400, 1300))),
            # (the capsule stands turned: the pilot's 315 degrees, the hatch, is the file's +X)
            ("capsule-window.png", (0, 0, 0.9), 9, dict(azimuth=-45, elevation=6, res=(1300, 1300))),
            ("capsule-hatch.png", (0, 0, 0.9), 9, dict(azimuth=0, elevation=6, res=(1300, 1300))),
            ("capsule-right.png", (0, 0, 0.9), 9, dict(azimuth=60, elevation=6, res=(1300, 1300))),
            ("capsule-periscope.png", (0, 0, 0.9), 9, dict(azimuth=135, elevation=6, res=(1300, 1300))),
            ("capsule-far-side.png", (0, 0, 0.9), 9, dict(azimuth=-160, elevation=6, res=(1300, 1300))),
            ("capsule-united-states.png", (0, 0, 0.9), 9, dict(azimuth=-103, elevation=6, res=(1300, 1300))),
            ("capsule-shield.png", (0, 0, -0.2), 7, dict(azimuth=-60, elevation=-35, res=(1300, 1300))),
            ("emblem-close.png", (0.3, -0.3, 0.42), 2.6, dict(azimuth=-45, elevation=14, res=(1300, 1300))),
            ("emblem-raking.png", (0.3, -0.3, 0.42), 1.6, dict(azimuth=-12, elevation=20, res=(1300, 1300))),
            ("patch-close.png", (-0.3, -0.38, 1.25), 2.4, dict(azimuth=-124, elevation=14, res=(1300, 1300))),
            ("window-close.png", (0.4, -0.4, wz), 3.2, dict(azimuth=-40, elevation=18, res=(1300, 1300))),
            ("panels-window-side.png", (0, 0, neck), 3.4, dict(azimuth=-45, elevation=10, res=(1300, 1300))),
            ("panels-right.png", (0, 0, neck), 3.4, dict(azimuth=75, elevation=10, res=(1300, 1300))),
            ("panels-far.png", (0, 0, neck), 3.4, dict(azimuth=-165, elevation=10, res=(1300, 1300))),
            ("panel-close.png", (0.2, -0.2, neck), 1.3, dict(azimuth=-40, elevation=24, res=(1300, 1300))),
            # from the couch, as the pilot's eyes have it (Seat_Pilot), by the cabin's own two lights
            ("cabin-ahead.png", (0, 0, 0), 0, seat),
            ("cabin-left.png", (0, 0, 0), 0, dict(seat, look=(70, 15))),
            ("cabin-right.png", (0, 0, 0), 0, dict(seat, look=(-70, 15))),
            ("cabin-right-back.png", (0, 0, 0), 0, dict(seat, look=(-115, 5))),
            ("cabin-up.png", (0, 0, 0), 0, dict(seat, look=(0, 50))),
            # with the skin off: the camera in its kit beside the pilot, the retropack and its aerial, the booster engines' injectors
            (
                "camera.png",
                (0.65, 0.2, 0.36),
                1.6,
                dict(azimuth=0, elevation=40, only=("CrewCabin_Pilot", "Camera_", "CrewCabin_Pack", "CrewCabin_Couch"), res=(1300, 1300)),
            ),
            (
                "camera-close.png",
                (0.66, 0.2, 0.38),
                0.75,
                dict(azimuth=60, elevation=30, only=("CrewCabin_Pilot", "Camera_", "CrewCabin_Pack", "CrewCabin_Couch"), res=(1300, 1300)),
            ),
            ("retropack.png", (0, 0, -0.45), 2.3, dict(azimuth=-12, elevation=-14, only=("Retropack", "HeatShield"), res=(1300, 1300))),
            ("retropack-side.png", (0, 0, -0.42), 3.0, dict(azimuth=-75, elevation=-3, only=("Retropack",), res=(1300, 1300))),
            ("dipole-close.png", (0.24, -0.24, -0.4), 0.8, dict(azimuth=-30, elevation=-8, only=("Retropack", "HeatShield"), res=(1300, 1300))),
            (
                "injectors.png",
                (0, 0, tank + 1.6),
                7.5,
                dict(azimuth=-45, elevation=-62, only=("BoosterEngines_",), res=(1300, 1300)),
            ),
            (
                "injector-close.png",
                (1.13, -1.13, tank + 1.0),
                3.2,
                dict(azimuth=-45, elevation=-86, only=("BoosterEngines_",), res=(1300, 1300)),
            ),
            (
                "igniter-close.png",
                (1.35, -1.35, tank + 1.92),
                1.5,
                dict(azimuth=-70, elevation=18, only=("BoosterEngines_",), res=(1300, 1300)),
            ),
        ],
    )
