"""Mercury spacecraft No. 11, "Liberty Bell 7", as flown on Mercury-Redstone 4 (21 July 1961).

Run headless:
    pnpm model:mr-4            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle. What No. 11 shared with No. 7 (the shield, the
retropack, the recovery compartment, the antenna canister, the tower, the periscope's optics, the
couch) is ../../../vehicles/mercury_capsule.py and mercury_cabin.py; here is what was its own: the
centreline window, the explosive hatch, its paint, its panel (../../../vehicles/mercury_cabin_11.py),
and its shingles as the photographs of this capsule show them.

Every dimension is in inches and converted once, at the point of use, with IN. Station 0 is the heat
shield's maximum-diameter plane; +Z is toward the nose. Angles are round the cone in the pilot's frame,
from his right as he lies: the periscope is at 90 degrees (his feet), the window at 270 (his head), the
hatch's middle at 315. The capsule is built so and then turned 45 degrees (mercury_capsule.stand), so that in
the file its hatch is on +X, the side a launch site's frame gives the hatch.
See ../spacecraft.md for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    HeatShield  Retropack  Afterbody  Window  Hatch  CrewCabin  RecoveryCompartment
    AntennaCanister  EscapeTower
and, from ../../../vehicles/redstone_mrlv.py, the launch vehicle:
    RedstoneAdapter  RedstoneAftUnit  RedstoneCenterUnit  RedstoneTailUnit  RedstoneEngine
"""

from __future__ import annotations

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
import mark_iv_suit  # noqa: E402
import mercury_cabin  # noqa: E402
import mercury_cabin_11  # noqa: E402
import mercury_capsule  # noqa: E402
import redstone_mrlv  # noqa: E402
from mercury_capsule import (  # noqa: E402
    CONE,
    CONE_H,
    PILOT_HIP,
    THING_SHELLS,
    VESSEL,
    Z_RETRO_BOTTOM,
    Z_TOP,
    Skin,
    outline,
    thing,
    trapezoid,
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
)

Z_BOOSTER_BASE = -redstone_mrlv.LENGTH  # the Redstone's fin trailing edges

# ------------------------------------------------------------------ what was No. 11's own (in, degrees)

# The window. The panes' sizes are documented (NASA SP-45, Figure 19-1, "Mercury spacecraft window": the orbital
# spacecraft's, whose panes' thicknesses are the ones the MR-4 report gives for No. 11); where the window stands
# along the cone is estimated from photographs of this capsule (NASA 61-MR4-53, MSFC-6116423).
WINDOW_T = deg(270)  # on the centreline, over the pilot's head
WINDOW_Z = 35.8  # the middle of the outer pane
OUTER_PANE = (21.0, 11.254, 7.511)  # along the cone; across at the heat shield's end; across at the nose's end
INNER_PANE = (12.95, 9.49, 7.30)
PANE_CORNER = 1.75  # the inner panes' corner radius, 1 3/4 in; the outer pane's is taken as the same
INNER_TILT = deg(26.0 - 20.0)  # the inner panes lie at 26 degrees to the axis where the skin lies at 20
INNER_LOW = (0.9, 2.0)  # the inner panes' heat-shield end: up the cone from the outer pane's, and under the skin: estimated
WINDOW_PANEL = (deg(255), deg(285), 24.8, 46.8)  # the plain plate the window is set in: estimated
WINDOW_OPENING = (deg(257.5), deg(282.5), 25.6, 46.0)  # left out of the structure under it
# The explosive hatch. "In the same location and of the same size" as No. 7's (the MR-4 report, p. 4), but placed
# here where this capsule's photographs have it: its edge beside the window's plate, its middle 45 degrees round
# from the window toward the pilot's right. Stations: SEDR 104 Figure 13-11 has thermocouples on the hatch's outer
# edge at Z123.0 and Z146.0 and on the hatch at Z124.25 and Z147.25, so it reaches at least from 18.5 to 42.75.
HATCH = (deg(287.5), deg(342.5), 18.5, 45.4)
JAMB = (deg(285), deg(345), 17.5, 46.8)  # the plain border round it
HATCH_JOINT = 0.14  # the joint round the hatch's shingles, inches: estimated
LANYARD = (deg(287.5), deg(294.5), 40.0, 45.4)  # the small cover over the outside lanyard: which corner is estimated
# The periscope's door, with the umbilical's receptacle under the lens (NASA S61-03705; the capsule as raised).
SCOPE_Z = 41.5
SCOPE_DOOR = (deg(80), deg(100), 28.6, 46.0)
UMBILICAL_Z = 32.5
# Shingles: twelve columns of 30 degrees, in rows that part at these stations. Estimated from the same photographs.
BAND, SEAM_LOW, SEAM_HIGH, TOP = 6.2, 24.8, 46.8, CONE_H - 0.4
NAME_FOOT = 9.6  # the foot of the shingle the name is painted on
# The painted crack: where it leaves the base, how far it leans from the meridian (away from the hatch), and the
# station it reaches. Read off NASA 61-MR4-53, MSFC-6116423 and S61-03740: estimated.
CRACK_FOOT = (deg(264.5), 2.3)
CRACK_LEAN = deg(33)
CRACK_TOP = 39.0

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "HeatShield_HeatSink",
    "HeatShield_Fasteners",
    "Retropack_Housing",
    "Afterbody_Shingles",
    "Afterbody_Fasteners",
    "Afterbody_Plates",
    "Afterbody_Structure",
    "Afterbody_AttachRing",
    "Afterbody_Lettering",
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


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> Skin:
    """The cone's skin: shingles beaded round it, the plain plates round the window, the hatch and the periscope's
    door, and the paint."""
    g = group("Afterbody")
    hatch = group("Hatch")
    skin = Skin(CONE)
    plates, hp, hb, cover = MeshBuilder(), MeshBuilder(), MeshBuilder(), MeshBuilder()

    # a plain band above the shield's attach ring, riveted
    plates.lathe(prof([(CONE.r(2.05), 2.05), (CONE.r(BAND - 0.05), BAND - 0.05)]), 144)
    for z in (2.9, 5.4):
        for i in range(96):
            t = TAU * (i + (0.5 if z > 4 else 0.0)) / 96
            skin.screw(skin.bolts, t, z)

    for k in range(12):
        t0, t1 = deg(15 + 30 * k), deg(45 + 30 * k)
        if k == 8:  # the window's column: a plate at the foot, the shingle with the name, the window's plate, a shingle above
            skin.panel(plates, t0, t1, BAND, NAME_FOOT)
            skin.shingle(t0, t1, NAME_FOOT, SEAM_LOW, stacks=1)  # one bead across its whole width (MSFC-6116423)
        elif k in (9, 10):  # the hatch's two columns
            skin.shingle(t0, t1, BAND, JAMB[2])
        else:
            skin.shingle(t0, t1, BAND, SEAM_LOW)
            if k != 2:  # (the periscope's door stands in this row of its column)
                skin.shingle(t0, t1, SEAM_LOW, SEAM_HIGH)
        skin.shingle(t0, t1, SEAM_HIGH, TOP)

    # the window's plate, with the pane's opening in it
    about = (WINDOW_T, WINDOW_Z)
    skin.panel(plates, *WINDOW_PANEL, hole=outline(trapezoid(*OUTER_PANE, PANE_CORNER, grow=-0.4)), about=about)
    mercury_capsule.fasten_round(skin, skin.bolts, WINDOW_PANEL, inset=0.45, pitch=2.4)
    # the hatch's border, and the periscope door's
    mid = ((HATCH[0] + HATCH[1]) / 2, (HATCH[2] + HATCH[3]) / 2)
    skin.panel(plates, *JAMB, hole=skin.bounds(*mid, *HATCH), about=mid)
    for i in range(12):  # (too narrow for washers: plain screws along it)
        for t in (JAMB[0] + 0.55 / CONE.r(32), JAMB[1] - 0.55 / CONE.r(32)):
            z = JAMB[2] + 1.4 + (JAMB[3] - JAMB[2] - 2.8) * i / 11
            skin.screw(skin.bolts, t, z)
        for z in (JAMB[2] + 0.45, JAMB[3] - 0.65):
            skin.screw(skin.bolts, JAMB[0] + (JAMB[1] - JAMB[0]) * (i + 0.5) / 12, z)
    door_mid = ((SCOPE_DOOR[0] + SCOPE_DOOR[1]) / 2, (SCOPE_DOOR[2] + SCOPE_DOOR[3]) / 2)
    door_plate = (deg(75), deg(105), SEAM_LOW, SEAM_HIGH)
    skin.panel(plates, *door_plate, hole=skin.bounds(*door_mid, *SCOPE_DOOR), about=door_mid)
    mercury_capsule.fasten_round(skin, skin.bolts, door_plate, inset=0.5, pitch=3.0, sides="blr")

    # the hatch: two shingles of its own, "in no manner ... attached to capsule shingles" (SEDR 104, 2-4), and the small
    # cover over the outside lanyard in the corner by the window
    half = (HATCH[0] + HATCH[1]) / 2
    # (a wider joint round them than between the capsule's own shingles, so that the hatch can be told from what it is set in)
    skin.shingle(HATCH[0], half, HATCH[2], LANYARD[2], panels=hp, bolts=hb, gap=HATCH_JOINT)
    skin.shingle(LANYARD[1], half, LANYARD[2], HATCH[3], panels=hp, bolts=hb, fasten="tl", gap=HATCH_JOINT)
    skin.shingle(half, HATCH[1], HATCH[2], HATCH[3], panels=hp, bolts=hb, gap=HATCH_JOINT)
    skin.panel(cover, *LANYARD)
    for t, z in (
        (LANYARD[0] + 0.022, LANYARD[2] + 0.7),
        (LANYARD[1] - 0.022, LANYARD[2] + 0.7),
        (LANYARD[0] + 0.022, LANYARD[3] - 0.7),
        (LANYARD[1] - 0.022, LANYARD[3] - 0.7),
    ):
        skin.screw(hb, t, z)

    skin.panels.build("Afterbody_Shingles", M["shingle"], g, sharp_angle=None)
    skin.bolts.build("Afterbody_Fasteners", M["bolt"], g)
    plates.build("Afterbody_Plates", M["shingle"], g, sharp_angle=None)
    hp.build("Hatch_Shingles", M["shingle"], hatch, sharp_angle=None)
    hb.build("Hatch_Fasteners", M["bolt"], hatch)
    thing(
        cover,
        "Hatch_LanyardCover",
        M["shingle"],
        hatch,
        "Lanyard cover",
        "Behind this small plate was a lanyard: a rescuer took the plate off and pulled, with at least 40 lb, and the hatch blew off. "
        "That there was one is documented; which corner of the hatch it was in is read off two figures and is estimated.",
        sharp_angle=None,
    )

    # the structure under the shingles, left open under the hatch, the window and the periscope's door
    under = MeshBuilder()
    mercury_capsule.wall(under, lambda z: CONE.r(z) - 0.1, 0.0, CONE_H, (HATCH, WINDOW_OPENING, SCOPE_DOOR))
    under.build("Afterbody_Structure", M["underlay"], g, sharp_angle=None)
    # (the hatch's own two skins: dark under its shingles, as the capsule's is, and titanium toward the cabin)
    rest = ((HATCH[1], HATCH[0] + TAU, HATCH[2], HATCH[3]),)
    hu, hv = MeshBuilder(), MeshBuilder()
    mercury_capsule.wall(hu, lambda z: CONE.r(z) - 0.1, HATCH[2], HATCH[3], rest)
    mercury_capsule.wall(hv, VESSEL.r, HATCH[2], HATCH[3], rest, flip=True)
    hu.build("Hatch_Structure", M["underlay"], hatch, sharp_angle=None)
    hv.build("Hatch_PressureSkin", M["titanium"], hatch, sharp_angle=None)
    mercury_capsule.attach_ring(M, g)

    build_periscope(M, g, skin)
    mercury_capsule.roll_thrusters(M, g)
    build_paint(M, g, skin, font)
    return skin


def build_periscope(M, g, skin: Skin) -> None:
    """The periscope's door, its objective and the umbilical's receptacle under the lens (mercury_capsule.periscope_door),
    placed from this capsule's photographs."""
    about = (
        "The periscope's objective, put out through its door: an 8 in screen in the middle of the panel showed what it saw. "
        "Grissom had the new window and used that; a quick look through the periscope after it extended gave him only cloud and ocean. "
        "Under the lens, in the same opening, is where the ground's umbilical plugged in. Placed from photographs of this capsule."
    )
    umbilical = (
        "Where the ground's umbilical was plugged in until it was pulled 35 seconds before liftoff: under the periscope's lens, "
        "inside its door, as a photograph of the capsule being serviced shows it (NASA S61-03705)."
    )
    mercury_capsule.periscope_door(M, g, skin, SCOPE_DOOR, SCOPE_Z, UMBILICAL_Z, about, umbilical)


def build_paint(M, g, skin: Skin, font) -> None:
    """The paint, as flown: the name under the window, the crack beside it, UNITED STATES and the flag either side of
    the periscope. Each is placed from photographs (spacecraft.md, "Paint"); none of the places is dimensioned."""
    paint, crack, flag = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for body, length, tall, z in (("LIBERTY", 12.7, 2.9, 22.4), ("BELL", 8.1, 3.1, 18.4), ("7", 1.9, 3.6, 14.3)):
        skin.lettering(paint, body, length, tall, WINDOW_T, z, font)
    for body, z in (("UNITED", 42.6), ("STATES", 33.9)):
        skin.lettering(paint, body, 23.0, 6.5, deg(133), z, font)
    paint.build("Afterbody_Lettering", M["paint_white"], g, smooth=False)

    # The crack: a white line from the base under the name's left edge, up and away from the hatch, two thirds of the
    # way to the nose. Painted across the beads, it comes out wavy without being drawn so; it wanders a little besides.
    t_mid, z_mid = deg(240), 20.0
    r0, sin, cos = CONE.r(z_mid), math.sin(CONE.a), math.cos(CONE.a)
    b0 = (CRACK_FOOT[1] - z_mid) / cos
    start = Vector(((CRACK_FOOT[0] - t_mid) * (r0 - b0 * sin), b0))  # on the cone unrolled about (t_mid, z_mid)
    along = Vector((-math.sin(CRACK_LEAN), math.cos(CRACK_LEAN)))
    side = Vector((along.y, -along.x))
    length = (CRACK_TOP - CRACK_FOOT[1]) / cos / along.y
    n = round(length / 0.8)
    verts, faces = [], []
    for i in range(n + 1):
        s = length * i / n
        wide = 0.55 + 0.1 * math.sin(s * 1.9) + 0.07 * math.sin(s * 0.67 + 1.0)  # half its width, inches: uneven, as a brush leaves it
        p = start + along * s + side * (0.45 * math.sin(s * 0.33 + 0.4) + 0.2 * math.sin(s * 0.9 + 2.0))  # and not quite straight
        verts += [tuple(p + side * wide), tuple(p - side * wide)]
        if i:
            faces.append((2 * i - 2, 2 * i, 2 * i + 1, 2 * i - 1))
    skin.paint(crack, verts, faces, t_mid, z_mid)
    thing(
        crack,
        "Afterbody_Crack",
        M["paint_white"],
        g,
        "The painted crack",
        "Grissom named his capsule for its shape and had the Liberty Bell's crack painted on it: a white line from the base toward the nose. "
        "Its line here is read off three photographs taken on the pad.",
        smooth=False,
    )

    fw, fh = 12.0, 12.0 / 1.9
    nx, ny = 12, 6
    verts = [((i / nx - 0.5) * fw, (j / ny - 0.5) * fh) for j in range(ny + 1) for i in range(nx + 1)]
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    skin.paint(flag, verts, faces, deg(61), 40.0, uv=lambda x, y: (x / fw + 0.5, y / fh + 0.5))
    flag.build("Afterbody_Flag", M["flag"], g, sharp_angle=None)


def build_window(M) -> dict:
    """The window: an outer pane on the cone's own curve under a retaining rim, a well lined with foil, and the three
    inner panes in their frame, flat and a little steeper than the skin. Returns where its inner panes are, for the cabin."""
    g = group("Window")
    to = Skin(CONE).flat(WINDOW_T, WINDOW_Z)
    says = (
        "Window",
        "The centreline window, new with this capsule: the astronauts asked for it. An outer pane of Vycor 0.35 in thick, curved to the cone, "
        "and three inner panes that hold the cabin's pressure. Through it the pilot saw 30 degrees across and 33 up and down.",
    )
    # the outer pane, on the cone, and the rim that holds it
    pane = trapezoid(*OUTER_PANE, PANE_CORNER)
    half, y0, y1 = pane
    glass = MeshBuilder()
    rows = [y0 + (y1 - y0) * (0.5 - 0.5 * math.cos(math.pi * j / 28)) for j in range(29)]
    glass.grid(lambda u, y: to(u * half(y), y, -0.08), [i / 4 - 1 for i in range(9)], rows)
    thing(glass, "Window_Glass", M["glass"], g, *says, sharp_angle=None)
    rim = MeshBuilder()
    inner, outer = outline(trapezoid(*OUTER_PANE, PANE_CORNER, grow=-0.4)), outline(trapezoid(*OUTER_PANE, PANE_CORNER, grow=0.38))
    rings = ((inner, -0.08), (inner, 0.09), (outer, 0.09), (outer, 0.0))
    rim.grid(lambda i, j: to(*rings[j][0][i], rings[j][1]), range(len(inner)), range(4), closed_u=True, flip=True)
    screws = outline(trapezoid(*OUTER_PANE, PANE_CORNER, grow=0.0), 9)
    for x, y in screws:
        p = to(x, y, 0.09)
        rim.disc(p, (to(x, y, 1.0) - to(x, y, 0.0)).normalized(), 0.1 * IN, 0.045 * IN)
    thing(rim, "Window_Rim", M["steel"], g, *says, sharp_angle=40)

    # the inner panes: flat, their heat-shield end nearest the skin
    length = INNER_PANE[0]
    low_y = y0 + INNER_LOW[0]
    centre = Vector((0.0, low_y + length / 2 * math.cos(INNER_TILT), -(INNER_LOW[1] + length / 2 * math.sin(INNER_TILT))))
    F = CONE.frame(WINDOW_T, WINDOW_Z) @ Matrix.Translation(centre * IN) @ Matrix.Rotation(-INNER_TILT, 4, "X")
    at = lambda x, y, z=0.0: F @ Vector((x * IN, y * IN, z * IN))  # noqa: E731
    where = {
        "frame": F,
        "pane": INNER_PANE,
        "corner": PANE_CORNER,
        "centre": tuple(F.translation),
        "out": tuple((to(0, 0, 0) - F.translation).normalized()),
    }
    if not interior():
        # no cabin behind it: a dark pan under the glass stands in for one
        void = MeshBuilder()
        void.grid(lambda u, y: to(u * half(y), y, -0.3), [i / 4 - 1 for i in range(9)], rows)
        thing(void, "Window_Void", M["void"], g, *says, sharp_angle=None)
        return where
    inside = trapezoid(*INNER_PANE, PANE_CORNER)
    ihalf, iy0, iy1 = inside
    panes = MeshBuilder()
    panes.grid(
        lambda u, y: at(u * ihalf(y), y, -0.5),
        [i / 2 - 1 for i in range(5)],
        [iy0 + (iy1 - iy0) * (0.5 - 0.5 * math.cos(math.pi * j / 16)) for j in range(17)],
    )
    thing(panes, "Window_InnerPanes", M["glass"], g, *says, shell=False, sharp_angle=None)
    # the well between them: from the outer pane's opening down to the inner frame, in crinkled foil (61-MR4-53)
    well = MeshBuilder()
    top, foot = outline(trapezoid(*OUTER_PANE, PANE_CORNER, grow=-0.2)), outline(trapezoid(*INNER_PANE, PANE_CORNER, grow=-0.25))
    well.grid(
        lambda i, j: to(*top[i], -0.2) * (1 - j) + at(*foot[i], 0.02) * j,
        range(len(top)),
        (0.0, 0.5, 1.0),
        closed_u=True,
    )
    thing(well, "Window_Well", M["foil"], g, *says, sharp_angle=None)
    # the inner frame: titanium, bolted round (SEDR 104, Figure 2-3)
    fr = MeshBuilder()
    a, b = outline(trapezoid(*INNER_PANE, PANE_CORNER, grow=-0.3)), outline(trapezoid(*INNER_PANE, PANE_CORNER, grow=0.6))
    rings = ((a, -1.15), (a, 0.02), (b, 0.02), (b, -1.15), (a, -1.15))
    fr.grid(lambda i, j: at(*rings[j][0][i], rings[j][1]), range(len(a)), range(5), closed_u=True, flip=True)
    for x, y in outline(trapezoid(*INNER_PANE, PANE_CORNER, grow=0.3), 9):
        fr.disc(at(x, y, -1.15), -Vector(F.col[2][:3]), 0.13 * IN, 0.06 * IN)
    thing(fr, "Window_InnerFrame", M["titanium"], g, *says, shell=False, sharp_angle=40)
    return where


def build_crew_cabin(M, window: dict) -> None:
    g = group("CrewCabin")
    v = MeshBuilder()
    rv = VESSEL.r
    inner_opening = mercury_cabin_11.WINDOW_OPENING
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5)]), 144)  # the aft pressure bulkhead
    mercury_capsule.wall(v, rv, 0.5, CONE_H - 0.3, (HATCH, inner_opening))
    v.lathe(prof([(rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # the small bulkhead
    mercury_capsule.sill(v, HATCH)
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)
    mercury_capsule.bulkhead_stiffeners(M, g)
    if not interior():
        return
    # The pilot: the suit model that stands on the pad (crew/mark_iv_suit.py), on the couch as in No. 7.
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    mark_iv_suit.NAME = "V. I. GRISSOM"  # (the tag in the photographs ends ...GRISSOM: the initials are taken as given like Shepard's)
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    where = mercury_cabin_11.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, HATCH, CONE_H - 0.3, mark_iv_suit.seated_points(), window, SCOPE_Z)
    mercury_cabin_11.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, HATCH)
    mercury_cabin_11.name_things(g)
    print(f"mr-4 cabin: {where}")
    mercury_capsule.oxygen_and_bag(M, g)
    mercury_cabin.shade(g, where["lamps"], (bpy.data.objects["Hatch_Lining"],))
    mercury_capsule.keep_inside()


# ---------------------------------------------------------------------------- main


def build() -> str:
    font = load_font()
    M = mercury_capsule.make_materials()
    # crinkled aluminium foil over the insulation round the window's well, as the photographs show it
    M["foil"] = material("insulation-foil", (0.74, 0.73, 0.69), 1.0, 0.36, double_sided=True)
    mercury_capsule.build_heat_shield(M)
    mercury_capsule.build_retropack(M)
    build_afterbody(M, font)
    window = build_window(M)
    build_crew_cabin(M, window)
    mercury_capsule.build_recovery_compartment(M)
    mercury_capsule.build_antenna_canister(M)
    mercury_capsule.build_escape_tower(M)
    # the capsule is built in the pilot's frame; it stands on the booster with its hatch on +X, as every site's frame has it
    mercury_capsule.stand((HATCH[0] + HATCH[1]) / 2, mercury_capsule.SPACECRAFT)
    redstone_mrlv.build(Z_BOOSTER_BASE, font, clamp_covers="streamlined")
    mark_shells(SHELLS + tuple(THING_SHELLS) + redstone_mrlv.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    wz = WINDOW_Z * IN
    run(
        "mr-4 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, (Z_TOP + Z_BOOSTER_BASE) / 2 * IN), 70, dict(azimuth=-70, res=(700, 1600))),
            ("capsule-window.png", (0, 0, 0.9), 9, dict(azimuth=-88, elevation=6, res=(1300, 1300))),
            ("capsule-hatch.png", (0, 0, 0.9), 9, dict(azimuth=-45, elevation=6, res=(1300, 1300))),
            ("capsule-periscope.png", (0, 0, 0.9), 9, dict(azimuth=100, elevation=6, res=(1300, 1300))),
            ("capsule-crack.png", (0, 0, 0.9), 9, dict(azimuth=-125, elevation=6, res=(1300, 1300))),
            ("window-close.png", (0, -0.6, wz), 3.2, dict(azimuth=-80, elevation=18, res=(1300, 1300))),
            ("name-close.png", (0, -0.7, 0.45), 2.6, dict(azimuth=-96, elevation=4, res=(1300, 1300))),
        ],
    )
