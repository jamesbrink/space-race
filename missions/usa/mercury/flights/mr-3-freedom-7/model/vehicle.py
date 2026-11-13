"""Mercury spacecraft No. 7, "Freedom 7", as flown on Mercury-Redstone 3 (5 May 1961).

Run headless:
    pnpm model:mr-3            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

This is the flight's vehicle: spacecraft and launch vehicle. Its pad and its pilot are
pad.py and crew.py beside it.

What No. 7 shared with No. 11 (the shield, the retropack, the recovery compartment, the antenna canister,
the tower, the periscope, the pressure vessel) is ../../../vehicles/mercury_capsule.py; here is what was
its own: its shingles as the flown capsule has them, two portholes, the latch hatch, its paint and its cabin's fit.

Every dimension below is in inches (the units of the McDonnell drawings) and converted
once, at the point of use, with IN. Station 0 is the heat shield's maximum-diameter plane;
+Z is toward the nose. Angles are round the cone in the pilot's frame, from his right as he lies:
the periscope is at 90 degrees (his feet), his left at 180, his head at 270, the hatch's middle at 315.
The capsule is built so and then turned 45 degrees (mercury_capsule.stand), so that in the file its
hatch is on +X, the side a launch site's frame gives the hatch. See ../spacecraft.md for what each
number rests on.

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
    Skin,
    thing,
)
from srlib import (  # noqa: E402
    IN,
    TAU,
    MeshBuilder,
    Surf,
    bore,
    deg,
    group,
    interior,
    load_font,
    mark_shells,
    prof,
    run,
)

Z_BOOSTER_BASE = -redstone_mrlv.LENGTH  # the Redstone's fin trailing edges

# ------------------------------------------------------------------ what was No. 7's own (in, degrees)

# Everything here is in the pilot's frame and is read off the flown capsule as it is kept (Smithsonian A19620021000:
# photographs NASM2021-00160, -00161, -00165, -00168 and A19620021000_DSH01) and off the photographs of 21 April and
# 5 May 1961; ../spacecraft.md says which number rests on which. All of it is estimated: no drawing read places any of it.
# The hatch: its middle 45 degrees round from the pilot's head toward his right, four stringer bays wide.
HATCH = (deg(287.5), deg(342.5), 18.5, 44.0)
JAMB = (deg(285), deg(345), 17.6, 44.9)  # the plain border round it
HATCH_JOINT = 0.14  # the joint round the hatch's shingles, inches: as on capsule 11's model
LATCH_INSET = 1.3  # how far in from the hatch's edge its eight latches are, inches: a placeholder, as the latches are
# The two ports, (angle, station): the lower one 30 degrees past the hatch's foot-side edge, the upper one high at the
# pilot's left. A flat plate 10 in across round a hole in the skin, the pane set down inside it.
PORTHOLES = ((deg(15), 28.5), (deg(232.5), 34.5))
PORT_PLATE, PORT_HOLE, PORT_GLASS, PORT_SET = 5.0, 3.7, 3.3, 0.9  # radii of the plate, the hole and the clear glass; how far in the pane sits
# The periscope's door and its objective, level with the upper line of UNITED STATES; the umbilical under the lens.
SCOPE_Z = mercury_cabin.SCOPE_STATION
SCOPE_DOOR = (deg(80), deg(100), 27.5, 41.5)
SCOPE_TUBE = (0.0, 15.5, 36.4)  # the last bend of the periscope's tube in the cabin (mercury_cabin.periscope's `run`): it comes out along that run
UMBILICAL_Z = 31.2
# Shingles: rows that part at these stations; the columns are in COLUMNS, below.
BAND, SEAM_LOW, SEAM_HIGH, TOP = 3.4, 22.0, 42.0, CONE_H - 0.4
PORT_PLATES = ((deg(0), deg(30), SEAM_LOW, 35.5), (deg(217.5), deg(247.5), 27.5, SEAM_HIGH))  # the plain plate each port is set in
DOOR_PLATE = (deg(75), deg(105), SEAM_LOW, SEAM_HIGH)
# The roll jets' plates, in the top row either side of the periscope.
ROLL_JETS = ((deg(45), 50.0), (deg(135), 50.0))
# Columns of shingles round the cone, degrees: (from, to, what stands in it). A shingle 22 degrees wide or more carries
# two stacks of beads side by side, a narrower one a single stack.
COLUMNS = (
    (345.0, 360.0, "narrow"),
    (0.0, 30.0, "lower port"),
    (30.0, 60.0, ""),
    (60.0, 75.0, ""),
    (75.0, 105.0, "periscope"),
    (105.0, 133.125, ""),
    (133.125, 161.25, ""),
    (161.25, 189.375, ""),
    (189.375, 217.5, ""),
    (217.5, 247.5, "upper port"),
    (247.5, 266.25, ""),
    (266.25, 285.0, ""),
    (285.0, 315.0, "hatch"),
    (315.0, 345.0, "hatch"),
)

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
    "Hatch_Shingles",
    "Hatch_Fasteners",
    "Hatch_Latches",
    "Hatch_Structure",
    "Hatch_PressureSkin",
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


def circle(radius: float, n: int = 48) -> list[tuple[float, float]]:
    """A round hole as a polygon on the cone unrolled, anticlockwise."""
    return [(radius * math.cos(TAU * i / n), radius * math.sin(TAU * i / n)) for i in range(n)]


# --------------------------------------------------------------------------- parts


def build_afterbody(M, font) -> Skin:
    """The cone's skin as the flown capsule has it: shingles beaded round the cone, the plain plates round the two
    ports, the hatch and the periscope's door, the roll jets' plates, and the paint as the photographs of 1961 show it."""
    g = group("Afterbody")
    hatch = group("Hatch")
    skin = Skin(CONE)
    plates, hp, hb, latches = MeshBuilder(), MeshBuilder(), MeshBuilder(), MeshBuilder()

    # a plain band above the shield's attach ring, riveted
    plates.lathe(prof([(CONE.r(2.05), 2.05), (CONE.r(BAND - 0.05), BAND - 0.05)]), 144)
    for i in range(120):
        skin.screw(skin.bolts, TAU * i / 120, 2.75)

    for a, b, what in COLUMNS:
        t0, t1 = deg(a), deg(b)
        stacks = 2 if b - a >= 22.0 else 1
        if what == "hatch":
            skin.shingle(t0, t1, BAND, JAMB[2], stacks)
            skin.shingle(t0, t1, JAMB[3], TOP, stacks)
            continue
        if what == "narrow":  # (beside the hatch: its lower seam is lower than its neighbours')
            skin.shingle(t0, t1, BAND, 16.5, stacks)
            skin.shingle(t0, t1, 16.5, SEAM_HIGH, stacks)
        elif what == "lower port":
            skin.shingle(t0, t1, BAND, SEAM_LOW, stacks)
            skin.shingle(t0, t1, PORT_PLATES[0][3], SEAM_HIGH, stacks)
        elif what == "upper port":
            skin.shingle(t0, t1, BAND, SEAM_LOW, stacks)
            skin.shingle(t0, t1, SEAM_LOW, PORT_PLATES[1][2], stacks)
        else:
            skin.shingle(t0, t1, BAND, SEAM_LOW, stacks)
            if what != "periscope":  # (the periscope's door stands in this row of its column)
                skin.shingle(t0, t1, SEAM_LOW, SEAM_HIGH, stacks)
        skin.shingle(t0, t1, SEAM_HIGH, TOP, stacks)

    # the ports' plates, each with its hole; the hatch's border; the periscope door's plate
    for plate, (t, z) in zip(PORT_PLATES, PORTHOLES):
        skin.panel(plates, *plate, hole=circle(PORT_HOLE), about=(t, z), rings=[i / 9 for i in range(10)])
        mercury_capsule.fasten_round(skin, skin.bolts, plate, inset=0.5, pitch=2.8)
    mid = ((HATCH[0] + HATCH[1]) / 2, (HATCH[2] + HATCH[3]) / 2)
    skin.panel(plates, *JAMB, hole=skin.bounds(*mid, *HATCH), about=mid)
    for i in range(12):  # (too narrow for washers: plain screws along it)
        for t in (JAMB[0] + 0.55 / CONE.r(32), JAMB[1] - 0.55 / CONE.r(32)):
            z = JAMB[2] + 1.4 + (JAMB[3] - JAMB[2] - 2.8) * i / 11
            skin.screw(skin.bolts, t, z)
        for z in (JAMB[2] + 0.45, JAMB[3] - 0.45):
            skin.screw(skin.bolts, JAMB[0] + (JAMB[1] - JAMB[0]) * (i + 0.5) / 12, z)
    door_mid = ((SCOPE_DOOR[0] + SCOPE_DOOR[1]) / 2, (SCOPE_DOOR[2] + SCOPE_DOOR[3]) / 2)
    skin.panel(plates, *DOOR_PLATE, hole=skin.bounds(*door_mid, *SCOPE_DOOR), about=door_mid)
    mercury_capsule.fasten_round(skin, skin.bolts, DOOR_PLATE, inset=0.5, pitch=3.0)

    # The hatch: No. 7 carried the mechanical latch hatch (69 lb as installed), with release handles inside and out.
    # Two shingles of its own; its latches and outside handle are placeholders (no drawing of the mechanism has been
    # read, and the flown hatch was lost at recovery).
    half = (HATCH[0] + HATCH[1]) / 2
    skin.shingle(HATCH[0], half, HATCH[2], HATCH[3], panels=hp, bolts=hb, gap=HATCH_JOINT)
    skin.shingle(half, HATCH[1], HATCH[2], HATCH[3], panels=hp, bolts=hb, gap=HATCH_JOINT)
    inset = LATCH_INSET
    ta, tb = HATCH[0] + inset / CONE.r(HATCH[2]), HATCH[1] - inset / CONE.r(HATCH[2])
    za, zb = HATCH[2] + inset, HATCH[3] - inset
    for t, z in ((ta, za), (tb, za), (ta, zb), (tb, zb), (half, za), (half, zb), (ta, (za + zb) / 2), (tb, (za + zb) / 2)):
        latches.box((1.5 * IN, 0.9 * IN, 0.6 * IN), CONE.frame(t, z, 0.05))  # latch housings, sunk well through the skin
    latches.box((1.1 * IN, 6.5 * IN, 1.0 * IN), CONE.frame(half, (za + zb) / 2 - 3.0, 0.25))  # the outside release handle

    build_ports(M, g, skin)
    skin.panels.build("Afterbody_Shingles", M["shingle"], g, sharp_angle=None)
    skin.bolts.build("Afterbody_Fasteners", M["bolt"], g)
    plates.build("Afterbody_Plates", M["shingle"], g, sharp_angle=None)
    hp.build("Hatch_Shingles", M["shingle"], hatch, sharp_angle=None)
    hb.build("Hatch_Fasteners", M["bolt"], hatch)
    thing(
        latches,
        "Hatch_Latches",
        M["bolt"],
        hatch,
        "Hatch latches and release handle",
        "No. 7's hatch was held by a mechanical latch mechanism of 69 lb, worked by a handle inside or out; the explosive hatch came later. "
        "These latches are placeholders: no drawing of the mechanism has been read, and the flown hatch was lost at recovery.",
        smooth=False,
    )

    # the structure under the shingles, left open under the hatch and the periscope's door (the ports are bored below)
    under = MeshBuilder()
    mercury_capsule.wall(under, lambda z: CONE.r(z) - 0.1, 0.0, CONE_H, (HATCH, SCOPE_DOOR))
    under.build("Afterbody_Structure", M["underlay"], g, sharp_angle=None)
    # (the hatch's own two skins: dark under its shingles, as the capsule's is, and titanium toward the cabin)
    rest = ((HATCH[1], HATCH[0] + TAU, HATCH[2], HATCH[3]),)
    hu, hv = MeshBuilder(), MeshBuilder()
    mercury_capsule.wall(hu, lambda z: CONE.r(z) - 0.1, HATCH[2], HATCH[3], rest)
    mercury_capsule.wall(hv, VESSEL.r, HATCH[2], HATCH[3], rest, flip=True)
    hu.build("Hatch_Structure", M["underlay"], hatch, sharp_angle=None)
    hv.build("Hatch_PressureSkin", M["titanium"], hatch, sharp_angle=None)
    mercury_capsule.attach_ring(M, g)

    mercury_capsule.periscope_door(
        M,
        g,
        skin,
        SCOPE_DOOR,
        SCOPE_Z,
        UMBILICAL_Z,
        "The periscope's objective, put out through its door: Freedom 7's main view outside, shown on an 8 in screen in the middle of the panel. "
        "It took in about 172 degrees (the orbital spacecraft's figure). It was drawn in for the climb and put out again above the air. "
        "Placed from the flown capsule as it is kept.",
        "Where the ground's umbilical was plugged in until it was pulled 35 seconds before liftoff: under the periscope's lens, inside its door "
        "(the manual has the receptacle under the periscope's door; a photograph of 21 April 1961 has the ground's line at this side).",
        SCOPE_TUBE,
    )
    mercury_capsule.roll_fittings(
        M,
        g,
        ROLL_JETS,
        "Hydrogen peroxide jets that roll the capsule: a 6 lbf and a 1 lbf chamber in each plate, one plate for each way. "
        "Placed from the flown capsule as it is kept; that these are the roll jets is read from their two nozzles, large and small.",
    )
    build_paint(M, g, skin, font)
    return skin


def build_ports(M, g, skin: Skin) -> None:
    """The two ports from outside: a flat plate laid on the skin round the hole, screwed down through dimpled washers,
    and the pane set down inside it under a pale retaining ring (NASM2021-00168)."""
    ports = (
        ("Lower", "low at the pilot's right, beyond the hatch's edge: the earth-sky camera looked out of this one"),
        ("Upper", "high at the pilot's left: the one Shepard looked for the horizon through"),
    )
    for (which, where), (t, z) in zip(ports, PORTHOLES):
        plate, ring, glass, void = MeshBuilder(), MeshBuilder(), MeshBuilder(), MeshBuilder()
        to = skin.flat(t, z)
        # the plate: an annulus on the cone's own curve, a sixteenth of an inch and more above the shingle it is laid on
        n = 48
        radii = ((PORT_HOLE, -0.09), (PORT_HOLE, 0.1), (PORT_PLATE, 0.1), (PORT_PLATE, 0.0))
        plate.grid(
            lambda i, j, to=to: to(radii[j][0] * math.cos(TAU * i / n), radii[j][0] * math.sin(TAU * i / n), radii[j][1]),
            range(n),
            range(4),
            closed_u=True,
            flip=True,
        )
        for i in range(18):
            a = TAU * (i + 0.5) / 18
            zz = z + 4.35 * math.sin(a) * math.cos(CONE.a)
            skin.fastener(skin.bolts, t + 4.35 * math.cos(a) / CONE.r(zz), zz, 0.1)
        f = CONE.frame(t, z)
        # the well down to the pane and the ring that holds it, with its small bolts: flat, where the skin is round
        lip = -PORT_SET + 0.1
        # (it starts under the skin: the cone falls a quarter of an inch away from a flat ring at the port's sides)
        ring.lathe(prof([(PORT_HOLE - 0.2, -0.28), (PORT_HOLE - 0.2, lip), (PORT_GLASS - 0.05, lip), (PORT_GLASS - 0.05, -PORT_SET)]), 48, matrix=f)
        for i in range(24):
            a = TAU * (i + 0.5) / 24
            ring.disc(f @ Vector((3.375 * math.cos(a) * IN, 3.375 * math.sin(a) * IN, lip * IN)), CONE.n(t), 0.06 * IN, 0.04 * IN)
        # (out to the sleeve that lines the wall inside, so nothing is seen past its edge from the cabin)
        glass.lathe(prof([(PORT_HOLE - 0.01, -PORT_SET - 0.02), (0.0, -PORT_SET - 0.02)]), 48, matrix=f)
        if not interior():  # no cabin behind it: a dark disc stands in for one
            void.lathe(
                prof([(PORT_GLASS + 0.02, -PORT_SET - 0.1), (0.0, -PORT_SET - 0.1)]), 48, matrix=f
            )  # (between the glass and the vessel, 2 mm and more from each)
        says = (
            "Porthole",
            f"One of spacecraft No. 7's two ports, {where}. 10 in across its plate, with about 6.6 in of glass clear. "
            "The window ahead of the pilot came with a later spacecraft. Click the glass to look in.",
        )
        thing(plate, f"Porthole_{which}_Plate", M["shingle"], g, *says, sharp_angle=40)
        thing(ring, f"Porthole_{which}_Ring", M["aluminium"], g, *says)
        thing(glass, f"Porthole_{which}_Glass", M["glass"], g, *says)
        thing(void, f"Porthole_{which}_Well", M["void"], g, *says)


def build_paint(M, g, skin: Skin, font) -> None:
    """The paint as flown. UNITED STATES in two lines beyond the periscope's door (the pad, 21 April 1961; the capsule
    as kept, where it is the original paint). FREEDOM over 7, small, low at the left of the hatch (the carrier's deck,
    5 May 1961: the capsule as kept has the name elsewhere, repainted). No flag: none is in any photograph of 1961 read."""
    paint = MeshBuilder()
    for body, length, z in (("UNITED", 31.0, 36.3), ("STATES", 30.0, 28.3)):
        skin.lettering(paint, body, length, 7.0, deg(141), z, font)
    skin.lettering(paint, "FREEDOM", 23.0, 3.4, deg(240.5), 17.3, font)
    skin.lettering(paint, "7", 2.3, 3.4, deg(240.5), 12.9, font)
    paint.build("Afterbody_Lettering", M["paint_white"], g, smooth=False)


def build_crew_cabin(M) -> None:
    g = group("CrewCabin")
    mercury_capsule.pressure_vessel(M, g, HATCH)
    mercury_capsule.bulkhead_stiffeners(M, g)

    if not interior():
        return
    # The pilot: the same suit model as the one standing on the pad (crew/mark_iv_suit.py), posed
    # on the couch: head toward -Y, back to the heat shield, thighs straight up, shins sloping down
    # to a foot rest. That tuck is not a choice: a man 71 in tall lies across a cabin 63 in wide.
    # Its seat frame has the hips at the origin.
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    pilot = mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    # the cabin round him, as spacecraft No. 7 was fitted (vehicles/mercury_cabin.py)
    where = mercury_cabin.build(g, VESSEL, M, load_font(), pilot, PILOT_HIP, PORTHOLES, HATCH, CONE_H - 0.3, mark_iv_suit.seated_points())
    mercury_cabin.hatch_inside(bpy.data.objects["Hatch"], VESSEL, M, HATCH, latches=LATCH_INSET)
    mercury_capsule.oxygen_and_bag(M, g)
    # the cabin's own shadows, worked once everything in it stands where it will
    mercury_cabin.shade(g, where["lamps"], (bpy.data.objects["Hatch_Lining"],))
    mercury_capsule.keep_inside()
    return where


# ---------------------------------------------------------------------------- main


def build() -> str:
    font = load_font()
    M = mercury_capsule.make_materials()
    mercury_capsule.build_heat_shield(M)
    mercury_capsule.build_retropack(M)
    build_afterbody(M, font)
    where = build_crew_cabin(M)
    if interior():  # the two ports go right through structure, pressure vessel and lining (their plates are made with the hole)
        for t, z in PORTHOLES:
            bore(("Afterbody_Structure", "CrewCabin_PressureVessel", "CrewCabin_Lining"), CONE.frame(t, z), mercury_cabin.PORT_BORE * IN, 3.0 * IN)
    mercury_capsule.build_recovery_compartment(M)
    mercury_capsule.build_antenna_canister(M)
    mercury_capsule.build_escape_tower(M)
    # Built in the pilot's frame, the capsule stands on its booster with its hatch on +X, as every site's frame has it
    # (sites/lc-5.ts): turned 45 degrees about its long axis. What flight.ts quotes of the cabin is in the turned frame.
    turn = mercury_capsule.stand((HATCH[0] + HATCH[1]) / 2, mercury_capsule.SPACECRAFT)
    if where:
        report(where, turn)
    out = mercury_capsule.scope_axis(SCOPE_Z, SCOPE_TUBE)[1]
    print(f"mr-3 periscope door: {mercury_capsule.periscope_hinge(SCOPE_DOOR, (HATCH[0] + HATCH[1]) / 2, out)}")
    redstone_mrlv.build(Z_BOOSTER_BASE, font)
    mark_shells(SHELLS + tuple(THING_SHELLS) + mercury_cabin.WALL_FIT + redstone_mrlv.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


def report(where: dict, turn: Matrix) -> None:
    """What flight.ts quotes of the cabin, in the viewer's frame (x, up, -y of this one), metres, as the capsule stands."""
    view = lambda p: tuple(round(c, 3) for c in ((turn @ Vector(p)).x, (turn @ Vector(p)).z, -(turn @ Vector(p)).y))  # noqa: E731
    print(f"mr-3 cabin: room {where['room']:.2f} in; overhead {view((0, -1, 0))}")
    for name, (t, z) in zip(("lower", "upper"), PORTHOLES):
        inner = Surf(VESSEL.r0 - 0.12, VESSEL.z0, VESSEL.a)
        print(f"mr-3 cabin: {name} port: at {view(inner.p(t, z, -0.3))}, out {view(CONE.n(t))}, across {2 * PORT_GLASS * IN:.3f}")
    scope = CONE.p(deg(90), SCOPE_Z, 3.95)
    print(f"mr-3 cabin: periscope at {view(scope)}; its feet-ward direction {view((0, 1, 0))}; lamps {[view(p) for p in where['lamps']]}")
    print(f"mr-3 cabin: eye {view(Vector(where['eye']) * IN)}")


if __name__ == "__main__":
    run(
        "mr-3 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, (Z_TOP + Z_BOOSTER_BASE) / 2 * IN), 70, dict(azimuth=20, res=(700, 1600))),
            ("capsule-hatch.png", (0, 0, 0.9), 9, dict(azimuth=0, elevation=6, res=(1300, 1300))),
            ("capsule-port.png", (0, 0, 0.9), 9, dict(azimuth=70, elevation=6, res=(1300, 1300))),
            ("capsule-periscope.png", (0, 0, 0.9), 9, dict(azimuth=150, elevation=6, res=(1300, 1300))),
            ("capsule-name.png", (0, 0, 0.9), 9, dict(azimuth=-80, elevation=6, res=(1300, 1300))),
            ("skin-close.png", (0.55, 0.45, 0.8), 3.0, dict(azimuth=40, elevation=4, res=(1300, 1300))),
        ],
    )
