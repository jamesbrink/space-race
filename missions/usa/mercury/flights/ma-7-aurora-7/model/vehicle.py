"""Mercury spacecraft No. 18, "Aurora 7", on Atlas 107-D, as launched on Mercury-Atlas 7 (24 May 1962).

Run headless:
    pnpm model:ma-7            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. What No. 18 shared with every
capsule so far (the retropack, the recovery compartment, the antenna canister, the tower, the periscope's
optics, the couch) is ../../../vehicles/mercury_capsule.py; what it shared with No. 11, the first capsule of its
kind (the centreline window, the explosive hatch, the shingles round them, the panel), is built by that flight's
own script and ../../../vehicles/mercury_cabin_11.py, called from here; what was the orbital capsules' (the
ablation shield, the balloon's container) is ../../../vehicles/mercury_orbital.py; and what was No. 18's own is
here and in ../../../vehicles/mercury_cabin_18.py: its emblem and the rest of its paint, a white patch painted on
one shingle to take its temperature, the two stacks of beads on the shingle under its window, the zero-gravity
experiment by the pilot's head, a panel with three instruments taken out, a couch with two straps fewer.

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

import bmesh
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
import mercury_cabin_18  # noqa: E402
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
)
from srlib import (  # noqa: E402
    IN,
    TAU,
    MeshBuilder,
    deg,
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


# Capsule No. 11 (Liberty Bell 7) was the first with the window and the explosive hatch. Its script builds them where
# its own photographs put them, and the shingles round them; No. 18's are built by it, on the strength of this capsule's
# own photographs (NASA S62-03907, 62-MA7-73, S62-04018: the window's plate, the hatch beside it, the beaded shingle
# under the window, the seam at the window's foot), with what those photographs show otherwise. See spacecraft.md.
no11 = _flight_script("mr-4-liberty-bell-7")
WINDOW_T, WINDOW_Z, HATCH = no11.WINDOW_T, no11.WINDOW_Z, no11.HATCH
SCOPE_Z, SCOPE_DOOR, SCOPE_TUBE = no11.SCOPE_Z, no11.SCOPE_DOOR, no11.SCOPE_TUBE

Z_BOOSTER_BASE = -atlas_lv3b.LENGTH  # the booster engines' exit plane

# ------------------------------------------------------------------ what was No. 18's own (in, degrees)

# The shingle under the window carries two stacks of beads side by side, where No. 11's had one bead across its whole
# width: NASA S62-03907 and the colour photograph of the emblem (Commons: Aurora 7 insignia proper.jpg).
NAME_STACKS = 2

# The paint. All of it is placed from photographs of this capsule (spacecraft.md, "Paint"); none of it is dimensioned.
# UNITED STATES stood on it twice, each with a flag under it: to the left of the window (NASA TN D-3814, Figure 25;
# 62-MA7-73) and round to the right of the hatch (62PC-52, the liftoff). Each: the middle of its two lines round the
# cone, and where its flag's middle is.
UNITED_STATES = ((deg(212), deg(208)), (deg(20), deg(28)))
LINES = (38.4, 31.3)  # the stations of the two lines
LETTERS = (23.0, 6.0)  # a line's length and its letters' height
FLAG = (20.2, 12.0)  # the flags' station, and their width
# The white patch painted on one shingle beside an unpainted one, each with a thermocouple under it, to compare how hot
# they ran (NASA TN D-3814, p. 66: documented): over the U of the first UNITED. Its middle, and its size across and up
# the cone: read off Figure 25.
PATCH = (deg(188.6), 44.2, 4.0, 4.0)

# The emblem, on the shingle under the window: laid out from the shingle's own corner, the seam at the window's foot
# (station 24.8) where it meets the seam at 255 degrees, in inches to the right and inches down the cone. Read off one
# photograph taken square on, in colour (Commons: Aurora 7 insignia proper.jpg), scaled by the shingle's width.
CORNER = (deg(255), no11.SEAM_LOW)
RINGS = (  # each: its middle, its radius and its colour; where two cross, the one named first is drawn over the other
    ((3.70, 4.46), 3.40, "paint_cream"),
    ((7.02, 2.94), 2.30, "paint_orange"),
    ((4.27, 4.46), 1.30, "paint_orange"),
    ((4.84, 5.60), 2.60, "paint_pale_blue"),
)
RING_BAND = 0.1  # half the width of a ring's line
RAY_PITCH = 0.3  # from one ray to the next round a ring, inches
RING_BREAK = (0.3, 1.6)  # a ring stops this far short of one drawn over it, and no ring has rays within this of another's line, inches
SEVEN = ((4.05, 7.60), 7.5, 9.75)  # the 7: its middle, its width and its height
SEVEN_EDGE = 0.2  # the pale edge round it
AURORA = (16.95, 16.4, 3.4, deg(287.0))  # the word: its station, its length, its letters' height, and where its last letter ends
WAVER = (0.085, 1.15)  # how far the letters' sides waver, and over what length, inches: by rule, not her brush
LAYER = 0.07  # from one layer of the emblem's paint to the next, inches: over a millimetre apart even on a bead's flank

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
    "Afterbody_EmblemCream",
    "Afterbody_EmblemOrange",
    "Afterbody_EmblemPaleBlue",
    "Afterbody_SevenEdge",
    "Afterbody_Seven",
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
PERISCOPE = (
    "Periscope",
    "The periscope's objective, put out through its door: an 8 in screen in the middle of the panel showed what it saw. "
    "Carpenter was told to line up on the window, since later capsules might fly without a periscope; in the end he "
    "found the periscope's wide view the quicker way to find which way he was pointing, by day. By night it showed him "
    "nothing: \"What in the world happened to the periscope? Oh, it's dark, that's what happened.\" Placed as Liberty Bell 7's.",
)
SAYS = {
    "Window_": (
        "Window",
        "The window in front of the pilot's face: an outer pane of Vycor curved to the cone and three inner panes that hold the "
        "cabin's pressure. The red filter Friendship 7 carried for it was left off. Through it Carpenter photographed the "
        "horizon, a balloon that would not fill, and at each sunrise the bright specks Glenn had called fireflies.",
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
        "periscope's lens, inside its door. The cameras at the pad saw it go, the periscope draw in and the door shut. "
        "Placed as Liberty Bell 7's, whose photographs show it; no photograph of this capsule read shows this side.",
    ),
    "Retropack_Retro": (
        "Retrograde rockets",
        "Three solid motors of about 1,000 lbf for ten seconds each, fired five seconds apart: what brings the capsule down. "
        "On this flight they were fired by hand, three seconds late and with the capsule pointing 25 degrees off to one side, "
        "and gave three per cent less than they should. Together that put Aurora 7 down 250 nautical miles past its ships.",
    ),
    "Retropack_Straps": (
        "Retropack straps",
        "Three straps hold the pack to the heat shield until explosive bolts let it go, a minute after the last rocket has "
        'burned out. In the entry Carpenter saw "a long rectangular strap going off in the distance". '
        "They should meet under the pack's middle at one bolt; here they do not.",
    ),
}


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> Skin:
    """The cone's skin as No. 11's script builds it (shingles, plates, hatch, periscope's door, roll jets) with this
    capsule's shingle under the window, and No. 18's paint put on."""
    skin = no11.build_afterbody(M, font, name_stacks=NAME_STACKS, paint=False)
    build_paint(M, bpy.data.objects["Afterbody"], skin, font)
    return skin


def on_shingle(right: float, down: float) -> tuple[float, float]:
    """A place on the shingle under the window, from inches to the right of its corner and inches down the cone from
    it, as (angle, station)."""
    z = CORNER[1] - down * math.cos(CONE.a)
    return CORNER[0] + right / CONE.r(z), z


def fitted(body: str, font, wide: float, tall: float, cuts: int = 0, fatten: float = 0.0):
    """A word or a figure as flat geometry about its own middle, made `wide` by `tall` inches whatever its typeface's
    proportions; `fatten` moves every outline out by that many inches (the edge round a letter)."""
    plain, faces = text_mesh(body, 1.0, font, cuts=cuts)
    xs, ys = [v[0] for v in plain], [v[1] for v in plain]
    kx, ky = wide / (max(xs) - min(xs)), tall / (max(ys) - min(ys))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    if fatten:
        plain, faces = text_mesh(body, 1.0, font, cuts=cuts, offset=fatten / math.sqrt(kx * ky))
    return [((x - cx) * kx, (y - cy) * ky) for x, y, _ in plain], faces


def sliced(flat, faces, step: float):
    """A flat drawing cut along level lines `step` apart, so that its upright edges have points to bend at."""
    bm = bmesh.new()
    made = [bm.verts.new((x, y, 0.0)) for x, y in flat]
    for f in faces:
        bm.faces.new([made[i] for i in f])
    ys = [y for _, y in flat]
    for k in range(math.ceil(min(ys) / step), math.floor(max(ys) / step) + 1):
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-7, plane_co=(0.0, k * step, 0.0), plane_no=(0.0, 1.0, 0.0))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.verts.index_update()
    out = [(v.co.x, v.co.y) for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return out


def rayed_ring(middle, radius: float, over=(), others=()) -> tuple[list, list]:
    """One of the emblem's rings as flat geometry about its middle: a thin line round a circle with short rays
    standing out of it and shorter ones in, uneven, as the brush left them. The rays are a part of the ring's own
    outline, so nothing in it lies on anything else of it; where a ring of `over` (middle, radius: on the shingle,
    as `middle` is, inches right and down) crosses it, it is broken, as if it went under; and near any of `others`
    (every other ring) it has no rays, so that no two rings' rays meet: all the rings are one layer."""
    verts: list[tuple[float, float]] = []
    faces: list[tuple[int, ...]] = []
    n = 2 * round(TAU * radius / RAY_PITCH)  # steps round the ring: a ray's foot is one step wide, and one step lies between rays
    r0, r1 = radius - RING_BAND, radius + RING_BAND
    at = lambda r, i: (r * math.cos(TAU * i / n), r * math.sin(TAU * i / n))  # noqa: E731

    def off(i: float, rings) -> float:
        """How far a point of this ring is from the line of the nearest of `rings`."""
        x, y = at(radius, i)  # (y is up the cone; `middle` counts down it)
        return min((abs(math.hypot(middle[0] + x - c[0], middle[1] - y - c[1]) - r) for c, r, *_ in rings), default=math.inf)

    for i in range(n):
        if min(off(i, over), off(i + 0.5, over), off(i + 1, over)) < RING_BREAK[0]:
            continue
        base = len(verts)
        verts += [at(r0, i), at(r0, i + 1), at(r1, i + 1), at(r1, i)]
        faces.append((base, base + 1, base + 2, base + 3))
        if i % 2 == 0 and off(i + 0.5, others) > RING_BREAK[1]:  # a ray out, and every other one a shorter ray in
            k = i // 2
            out = (0.11 + 0.07 * math.sin(k * 2.4) + 0.04 * math.sin(k * 5.3 + 1.0)) * (0.55 * radius + 1.0)
            verts.append(at(r1 + out, i + 0.5 + 0.6 * math.sin(k * 1.7)))
            faces.append((base + 2, base + 3, len(verts) - 1))
            if k % 2:
                verts.append(at(r0 - 0.45 * out, i + 0.5))
                faces.append((base, base + 1, len(verts) - 1))
    return verts, faces


def build_paint(M, g, skin: Skin, font) -> None:
    """The paint, as launched: UNITED STATES twice, each with its flag under it; the white patch over the first; and
    under the window the emblem, a 7 through rings of coloured rays with AURORA across its foot."""
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
        "An experiment in paint. One shingle was painted white over a thermocouple, beside a bare, oxidised one with a "
        "thermocouple of its own, to see how much the colour of a spacecraft's skin matters. Going up, the white patch ran "
        "about 300 °F cooler than the dark shingle; in the worst of the entry, 200 °F hotter. "
        "That it was there is the report's; its size and place are read off one photograph.",
        smooth=False,
    )

    # The emblem. Carpenter drew it; Cecelia Bibby painted it. Each layer stands LAYER off the one under it: the rings,
    # the 7's pale edge, the 7, and the word across them all.
    says = (
        "Aurora 7",
        "Carpenter chose the name: a light in the sky, and the dawn. He had also grown up at the corner of Aurora and "
        "Seventh in Boulder, Colorado. He sketched the emblem himself, rings of coloured rays with a 7 through them, and "
        "Cecelia Bibby, who had lettered Friendship 7, painted it under the window. "
        "It is drawn here from one colour photograph: the 7 is a typeface's and the word's wavering is by rule, not her "
        "brush; the rings' places and colours are read off the photograph.",
    )
    lift = mercury_capsule.PAINT_LIFT
    rings: dict[str, MeshBuilder] = {}
    for k, (middle, radius, colour) in enumerate(RINGS):
        skin.paint(
            rings.setdefault(colour, MeshBuilder()),
            *rayed_ring(middle, radius, RINGS[:k], RINGS[:k] + RINGS[k + 1 :]),
            *on_shingle(*middle),
            lift=lift,
        )
    for colour, name in (("paint_cream", "Cream"), ("paint_orange", "Orange"), ("paint_pale_blue", "PaleBlue")):
        mercury_capsule.thing(rings[colour], f"Afterbody_Emblem{name}", M[colour], g, *says, smooth=False)
    hand = mercury_orbital.script_font() or font
    (right, down), wide, tall = SEVEN
    edge, seven, name = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # (cut fine, both of them: a coarse figure and its coarse edge each bridge the beads their own way, and close on each other)
    skin.paint(edge, *fitted("7", hand, wide, tall, cuts=3, fatten=SEVEN_EDGE), *on_shingle(right, down), lift=lift + LAYER)
    skin.paint(seven, *fitted("7", hand, wide, tall, cuts=3), *on_shingle(right, down), lift=lift + 2 * LAYER)
    # the word: plain capitals whose sides waver, ending where the photographs have its last letter, at the hatch's edge
    station, length, high, end = AURORA
    amp, over = WAVER
    flat, faces = sliced(*fitted("AURORA", font, length, high), over / 6)
    flat = [(x + amp * math.sin(TAU * y / over), y) for x, y in flat]  # (every letter alike at a height: none leans into its neighbour)
    skin.paint(name, flat, faces, end - length / 2 / CONE.r(station), station, lift=lift + 3 * LAYER)
    for mb, mesh, mat in (
        (edge, "Afterbody_SevenEdge", "paint_white"),
        (seven, "Afterbody_Seven", "paint_blue"),
        (name, "Afterbody_Name", "paint_white"),
    ):
        mercury_capsule.thing(mb, mesh, M[mat], g, *says, smooth=False)


def build_crew_cabin(M, window: dict) -> None:
    g = group("CrewCabin")
    v = MeshBuilder()
    rv = VESSEL.r
    inner_opening = mercury_cabin_18.WINDOW_OPENING
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5)]), 144)  # the aft pressure bulkhead
    mercury_capsule.wall(v, rv, 0.5, CONE_H - 0.3, (HATCH, inner_opening))
    v.lathe(prof([(rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # the small bulkhead
    mercury_capsule.sill(v, HATCH)
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)
    mercury_capsule.bulkhead_stiffeners(M, g)
    if not interior():
        return
    # The pilot: the Mark IV suit as modelled for Shepard (crew/mark_iv_suit.py), on the couch, with Carpenter's name on its
    # tag. Carpenter's own measures and what his suit had that Shepard's had not are in spacecraft.md ("The pilot"): not modelled.
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    mark_iv_suit.NAME = "M. S. CARPENTER"
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    where = mercury_cabin_18.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, HATCH, CONE_H - 0.3, mark_iv_suit.seated_points(), window, SCOPE_Z)
    mercury_cabin_18.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, HATCH)
    print(f"ma-7 cabin: {where}")
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
    M.update(mercury_orbital.balloon_materials())
    # crinkled aluminium foil over the insulation round the window's well, as No. 11's photographs show it
    M["foil"] = material("insulation-foil", (0.74, 0.73, 0.69), 1.0, 0.36, double_sided=True)
    # the emblem's colours, read off one colour photograph of it (estimated)
    M["paint_blue"] = material("paint-blue", (0.02, 0.07, 0.30), 0.0, 0.55, double_sided=True)
    M["paint_cream"] = material("paint-cream", (0.92, 0.88, 0.70), 0.0, 0.6, double_sided=True)
    M["paint_orange"] = material("paint-orange", (0.80, 0.27, 0.05), 0.0, 0.6, double_sided=True)
    M["paint_pale_blue"] = material("paint-pale-blue", (0.62, 0.76, 0.88), 0.0, 0.6, double_sided=True)
    mercury_orbital.build_ablation_shield(
        M,
        "Glass fibre in phenolic resin, which chars and boils away and takes the heat with it. This one lost 13 lb, the most of "
        "any so far, and a third of an inch of it charred; its centre plug, a disc let into the middle, was gone when the "
        "capsule was picked up, though it had stayed through the heat. The two switches that told the ground it was latched, "
        "one of which had lied to Glenn, were rewired so that both had to agree.",
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
    mercury_orbital.balloon_canister(
        M,
        "Under the flap on the canister's top: a can holding a 30 in balloon of aluminised plastic, folded, a bottle of "
        "nitrogen to fill it and a hundred feet of nylon line on a reel. At 1 h 38 min a squib fired and a spring threw it "
        "out, in a cloud of small foil discs, to be towed behind: its pull would measure how much air is left at 160 km, "
        "and its five colours would show which is best seen in space. A seam had split. It filled to a crumpled thing eight "
        "inches thick, would not be cut loose, and burned up with the antenna canister in the entry. "
        "That the can was here is the report's; its size is drawn round its liners and its place under the flap is estimated.",
        "The balloon was packed between two half-round blocks of balsa six inches long, one painted Day-Glo orange and black "
        "and one yellow and black. They were thrown out with it; Carpenter tracked one for twenty seconds, taking it for the balloon.",
    )
    mercury_capsule.build_escape_tower(M)
    say()
    # the capsule is built in the pilot's frame; it stands on the booster with its hatch on +X, as every site's frame has it
    turn = mercury_capsule.stand((HATCH[0] + HATCH[1]) / 2, mercury_capsule.SPACECRAFT)
    # (the periscope's door, cartridge and link: each one's motion into its node, now that the capsule stands as it will)
    mercury_capsule.periscope_run(scope, turn)
    atlas_lv3b.build(Z_BOOSTER_BASE, font, serial="10 7D", insulation_bulkhead=True)
    mark_shells(SHELLS + mercury_orbital.SHELLS + tuple(THING_SHELLS) + atlas_lv3b.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    wz = WINDOW_Z * IN
    mid = (Z_TOP + Z_BOOSTER_BASE) / 2 * IN
    tank = -atlas_lv3b.LENGTH * IN
    top = mercury_capsule.Z_CAN_TOP * IN
    seat = dict(seat="Seat_Pilot", lens=18, lamps="Lamp_", hide="CrewCabin_Pilot_Helmet", res=(1600, 1000))
    run(
        "ma-7 vehicle",
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
            ("emblem-close.png", (0.3, -0.3, 0.45), 2.6, dict(azimuth=-45, elevation=14, res=(1300, 1300))),
            ("emblem-raking.png", (0.3, -0.3, 0.45), 1.6, dict(azimuth=-12, elevation=20, res=(1300, 1300))),
            ("patch-close.png", (-0.32, -0.43, 1.05), 2.4, dict(azimuth=-124, elevation=14, res=(1300, 1300))),
            ("window-close.png", (0.4, -0.4, wz), 3.2, dict(azimuth=-40, elevation=18, res=(1300, 1300))),
            ("canister-top.png", (0, 0, top), 3.0, dict(azimuth=30, elevation=38, res=(1300, 1300))),
            # from the couch, as the pilot's eyes have it (Seat_Pilot), by the cabin's own two lights
            ("cabin-ahead.png", (0, 0, 0), 0, seat),
            ("cabin-left.png", (0, 0, 0), 0, dict(seat, look=(70, 15))),
            ("cabin-right.png", (0, 0, 0), 0, dict(seat, look=(-70, 15))),
            ("cabin-right-back.png", (0, 0, 0), 0, dict(seat, look=(-115, 5))),
            ("cabin-up.png", (0, 0, 0), 0, dict(seat, look=(0, 50))),
            # with the skin off: the zero-gravity experiment by his head, the balloon's can under the flap, the bulkheads
            (
                "zero-g.png",
                (0.43, -0.43, 0.33),
                1.5,
                dict(azimuth=135, elevation=55, only=("CrewCabin_Pilot", "ZeroG_", "CrewCabin_Pack", "CrewCabin_Couch"), res=(1300, 1300)),
            ),
            (
                "zero-g-close.png",
                (0.62, -0.25, 0.4),
                0.7,
                dict(azimuth=160, elevation=50, only=("CrewCabin_Pilot", "ZeroG_", "CrewCabin_Pack", "CrewCabin_Couch"), res=(1300, 1300)),
            ),
            (
                "balloon-can.png",
                (0, 0, top - 0.08),
                1.1,
                dict(azimuth=170, elevation=20, only=("Antenna_Balloon", "Antenna_Fittings", "Antenna_Bicone"), res=(1300, 1300)),
            ),
            (
                "tank-bulkheads.png",
                (0, 0, tank + 8.3),
                9,
                dict(azimuth=-60, elevation=-28, only=("Tank_Bulkheads", "Tank_InsulationBulkhead"), res=(1300, 1300)),
            ),
        ],
    )
