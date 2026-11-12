"""Mercury spacecraft No. 7, "Freedom 7", as flown on Mercury-Redstone 3 (5 May 1961).

Run headless:
    pnpm model:mr-3            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

This is the flight's vehicle: spacecraft and launch vehicle. Its pad and its pilot are
pad.py and crew.py beside it.

What No. 7 shared with No. 11 (the shield, the retropack, the recovery compartment, the antenna canister,
the tower, the periscope, the pressure vessel) is ../../../vehicles/mercury_capsule.py; here is what was
its own: its shingles as modelled, two portholes, the latch hatch, its paint and its cabin's fit.

Every dimension below is in inches (the units of the McDonnell drawings) and converted
once, at the point of use, with IN. Station 0 is the heat shield's maximum-diameter plane;
+Z is toward the nose. See ../spacecraft.md for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    HeatShield  Retropack  Afterbody  Hatch  CrewCabin  RecoveryCompartment
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
    shingle_row,
    thing,
)
from srlib import (  # noqa: E402
    IN,
    TAU,
    MeshBuilder,
    bore,
    decal,
    deg,
    group,
    interior,
    lettering,
    load_font,
    mark_shells,
    prof,
    run,
)

Z_BOOSTER_BASE = -redstone_mrlv.LENGTH  # the Redstone's fin trailing edges

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "HeatShield_HeatSink",
    "HeatShield_Fasteners",
    "Retropack_Housing",
    "Afterbody_Shingles",
    "Afterbody_Fasteners",
    "Afterbody_Structure",
    "Afterbody_AttachRing",
    "Afterbody_Lettering",
    "Afterbody_Flags",
    "Hatch_Shingles",
    "Hatch_Latches",
    "Hatch_Structure",
    "CrewCabin_PressureVessel",
    "CrewCabin_Lining",
    "CrewCabin_Frames",
    "CrewCabin_PortFrames",
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

# The two 10 in ports, (angle round the cone, station): the lower window first, under the hatch at the pilot's right,
# then the upper one, high at his left (Postlaunch Report, Figure 3.1-1, which is not dimensioned: both places are
# estimated from it and from the flown capsule, NASM2021-00147 and -00160).
PORTHOLES = ((math.radians(30), 13.0), (math.radians(-125), 40.0))
PANELS = 24  # shingles around the cone
PANEL_ARC = TAU / PANELS
PANEL_PHASE = -1.5 * PANEL_ARC  # puts three panels symmetric about +X: the hatch
HATCH_PANELS = (0, 1, 2)
ROWS = ((2.0, 20.0, 8), (20.0, 44.0, 6), (44.0, CONE_H - 0.4, 4))  # z0, z1, beads per shingle
HATCH_ROW = 1


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> None:
    g = group("Afterbody")
    hatch = group("Hatch")
    t_h0 = PANEL_PHASE + HATCH_PANELS[0] * PANEL_ARC
    t_h1 = PANEL_PHASE + (HATCH_PANELS[-1] + 1) * PANEL_ARC
    hz0, hz1, _ = ROWS[HATCH_ROW]

    panels, bolts = MeshBuilder(), MeshBuilder()
    hp, hb = MeshBuilder(), MeshBuilder()
    for row, (z0, z1, beads) in enumerate(ROWS):
        skip = HATCH_PANELS if row == HATCH_ROW else ()
        shingle_row(panels, bolts, CONE, z0, z1, PANELS, PANEL_PHASE, beads, [k for k in range(PANELS) if k not in skip])
    shingle_row(hp, MeshBuilder(), CONE, hz0, hz1, PANELS, PANEL_PHASE, ROWS[HATCH_ROW][2], HATCH_PANELS)
    # No. 7 carried the mechanical latch hatch (69 lb), with release handles inside and out.
    # The 70-bolt hatch was the original design and, with a detonating fuse, the later explosive one.
    inset = 1.5  # inches in from the hatch edge, clear of the jamb
    ta, tb = t_h0 + inset / CONE.r(hz0), t_h1 - inset / CONE.r(hz0)
    za, zb = hz0 + inset, hz1 - inset
    for t, z in ((ta, za), (tb, za), (ta, zb), (tb, zb), ((ta + tb) / 2, za), ((ta + tb) / 2, zb), (ta, (za + zb) / 2), (tb, (za + zb) / 2)):
        hb.box((1.5 * IN, 0.9 * IN, 0.6 * IN), CONE.frame(t, z, 0.05))  # latch housings, sunk well through the skin
    hb.box((1.1 * IN, 6.5 * IN, 1.0 * IN), CONE.frame(t_h0 + 0.82 * (t_h1 - t_h0), (za + zb) / 2 - 3.0, 0.25))  # external release handle
    panels.build("Afterbody_Shingles", M["shingle"], g, sharp_angle=None)
    bolts.build("Afterbody_Fasteners", M["bolt"], g)
    hp.build("Hatch_Shingles", M["shingle"], hatch, sharp_angle=None)
    hb.build("Hatch_Latches", M["bolt"], hatch, smooth=False)
    bpy.data.objects["Hatch_Latches"]["label"] = "Hatch latches and release handle"
    bpy.data.objects["Hatch_Latches"]["about"] = (
        "No. 7's hatch was held by a mechanical latch mechanism of 69 lb, worked by a handle inside or out; the explosive hatch came later. "
        "These latches are placeholders: no drawing of the mechanism has been read."
    )

    # structure under the shingles, with the hatch opening left out
    mercury_capsule.afterbody_structure(M, g, hatch, (t_h0, t_h1, hz0, hz1))
    mercury_capsule.attach_ring(M, g)

    # two 10 in portholes: No. 7 predates the trapezoidal overhead window
    ports = (
        ("Lower", "low at the pilot's right, under the hatch: the earth-sky camera looked out of this one"),
        ("Upper", "high at the pilot's left: the one Shepard looked for the horizon through"),
    )
    for (which, where), (t, z) in zip(ports, PORTHOLES):
        detail, glass, void = MeshBuilder(), MeshBuilder(), MeshBuilder()
        f = CONE.frame(t, z)
        # a bezel standing proud of the shingles, a pane set into it, and the cabin behind
        detail.lathe(prof([(6.0, -1.0), (6.0, 0.7), (5.0, 0.7), (4.9, 0.22)]), 48, matrix=f)
        # with a cabin behind it this is a real opening (bored below), lined through the wall by the frame inside
        # (mercury_cabin); with none, a dark disc stands in for one
        if not interior():
            void.lathe(prof([(4.9, 0.22), (0.0, 0.22)]), 48, matrix=f)
        glass.lathe(prof([(4.95, 0.52), (0.0, 0.52)]), 48, matrix=f)
        for i in range(16):
            a = TAU * i / 16
            detail.disc(f @ Vector((5.5 * math.cos(a) * IN, 5.5 * math.sin(a) * IN, 0.7 * IN)), CONE.n(t), 0.17 * IN, 0.06 * IN)
        says = (
            "Porthole",
            f"One of spacecraft No. 7's two 10 in ports, {where}. "
            "The window ahead of the pilot came with a later spacecraft. Click the glass to look in.",
        )
        thing(detail, f"Porthole_{which}_Frame", M["steel"], g, *says)
        thing(glass, f"Porthole_{which}_Glass", M["glass"], g, *says)
        thing(void, f"Porthole_{which}_Well", M["void"], g, *says)

    mercury_capsule.periscope(
        M,
        g,
        mercury_cabin.SCOPE_STATION,
        "The periscope's objective, put out through its door: Freedom 7's main view outside, shown on an 8 in screen in the middle of the panel. "
        "It took in about 172 degrees (the orbital spacecraft's figure). It was drawn in for the climb and put out again above the air.",
    )
    mercury_capsule.umbilical_receptacle(
        M,
        g,
        (deg(-90), 8.0),
        "Where the ground's umbilical was plugged in until it was pulled 35 seconds before liftoff. Placed by judgement: "
        "the manual has the receptacle under the periscope's door.",
    )
    mercury_capsule.roll_thrusters(M, g)

    paint, flags = MeshBuilder(), MeshBuilder()
    for t in (deg(135), deg(-45)):
        lettering(paint, CONE, "UNITED STATES", 26.0, t, 28.0, True, font)
        fw, fh, nx = 6.0, 6.0 / 1.9, 8
        verts = [((i / nx - 0.5) * fw, (j - 0.5) * fh, 0.0) for j in range(2) for i in range(nx + 1)]
        base = len(flags.verts)
        decal(flags, CONE, t, 50.5, verts, [(i, i + 1, nx + 2 + i, nx + 1 + i) for i in range(nx)], False)
        flags.uvs[base:] = [(i / nx, j) for j in range(2) for i in range(nx + 1)]
    lettering(paint, CONE, "FREEDOM 7", 15.0, deg(96), 30.0, False, font)
    paint.build("Afterbody_Lettering", M["paint_white"], g, smooth=False)
    flags.build("Afterbody_Flags", M["flag"], g, sharp_angle=None)


def build_crew_cabin(M) -> None:
    g = group("CrewCabin")
    t_h0 = PANEL_PHASE + HATCH_PANELS[0] * PANEL_ARC
    t_h1 = PANEL_PHASE + (HATCH_PANELS[-1] + 1) * PANEL_ARC
    hz0, hz1, _ = ROWS[HATCH_ROW]
    mercury_capsule.pressure_vessel(M, g, (t_h0, t_h1, hz0, hz1))
    mercury_capsule.bulkhead_stiffeners(M, g)

    if not interior():
        return
    # The pilot: the same suit model as the one standing on the pad (crew/mark_iv_suit.py), posed
    # on the couch: head toward -Y, the hatch at his right hand, back to the heat shield, thighs
    # straight up, shins sloping down to a foot rest. That tuck is not a choice: a man 71 in tall
    # lies across a cabin 63 in wide. Its seat frame has the hips at the origin.
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    hatch = (t_h0, t_h1, hz0, hz1)
    # the cabin round him, as spacecraft No. 7 was fitted (vehicles/mercury_cabin.py)
    where = mercury_cabin.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, PORTHOLES, hatch, CONE_H - 0.3, mark_iv_suit.seated_points())
    mercury_cabin.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, hatch)
    print(f"mr-3 cabin: {where}")
    mercury_capsule.oxygen_and_bag(M, g)
    # the cabin's own shadows, worked once everything in it stands where it will
    mercury_cabin.shade(g, where["lamps"], (bpy.data.objects["Hatch_Lining"],))
    mercury_capsule.keep_inside()


# ---------------------------------------------------------------------------- main


def build() -> str:
    font = load_font()
    M = mercury_capsule.make_materials()
    mercury_capsule.build_heat_shield(M)
    mercury_capsule.build_retropack(M)
    build_afterbody(M, font)
    build_crew_cabin(M)
    if interior():  # the two portholes go right through shingle, structure and pressure vessel
        for t, z in PORTHOLES:
            bore(("Afterbody_Shingles", "Afterbody_Structure", "CrewCabin_PressureVessel", "CrewCabin_Lining"), CONE.frame(t, z), 4.96 * IN, 3.0 * IN)
            bore(("Afterbody_Fasteners",), CONE.frame(t, z), 5.5 * IN, 3.0 * IN)  # no bolt heads left hanging in the opening
    mercury_capsule.build_recovery_compartment(M)
    mercury_capsule.build_antenna_canister(M)
    mercury_capsule.build_escape_tower(M)
    redstone_mrlv.build(Z_BOOSTER_BASE, font)
    mark_shells(SHELLS + tuple(THING_SHELLS) + redstone_mrlv.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    run(
        "mr-3 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, (Z_TOP + Z_BOOSTER_BASE) / 2 * IN), 70, dict(azimuth=20, res=(700, 1600))),
            ("vehicle-capsule.png", (0, 0, 1.2), 12, dict(azimuth=25, elevation=8, res=(1200, 1200))),
        ],
    )
