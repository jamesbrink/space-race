"""The Gemini Agena Target Vehicle: Lockheed's Agena D, fitted out to be met and docked with, as it was in orbit.

Shared by the flights that had one to dock with; a flight's model/vehicle.py asks gemini_stack for it. It is built
standing on its engine beside the launch vehicle, as an exhibit stands: it never stood so.
The assembled Atlas, adapter and closed shroud at the launch site are built by atlas_slv3.py.

Dimensions are inches and stations are Lockheed's GATV stations, which run aft from ahead of the nose: the docking
adapter is bolted on at station 229.50 and the engine's nozzle ends at 495.02. A height here is 495.02 less a station.
Round the vehicle the documents measure from -Z, its top in orbit, "clockwise (looking forward)" through +Y at 90
degrees; +Z is the side toward the Earth.

See ./agena-target-vehicle.md for what each number rests on.

Top-level nodes: TargetDockingAdapter (target_docking_adapter.py)  AgenaForwardSection  AgenaTankSection
                 AgenaAftSection  AgenaEngine
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from mathutils import Matrix, Vector

import srlib
import target_docking_adapter as tda
from mercury_capsule import chamfered
from srlib import IN, TAU, MeshBuilder, deg, frame, group, interior, prof
from target_docking_adapter import Axis, ring, rivets, say

R = 30.0  # 60 in across: documented (Launch Systems Final Report, Figure III.C-2)
# Lockheed's stations (Launch Systems Final Report, Figure III.C-2; Gemini VIII mission report, Figure 3.0-2(a);
# Lockheed's Agena D catalog, section 13 and Figure 14-6): documented
S_TDA = 229.50  # the docking adapter / the auxiliary forward rack
S_FORWARD = 247.00  # the auxiliary rack / the forward section: "the standard Agena payload interface"
S_TANK = 287.5  # the forward section / the tank section
S_AFT = 384.0  # the tank section / the aft section
S_PARTED = 385.4  # where the vehicle parted from the adapter that stayed on the Atlas
S_RACK = 411.86  # the forward end of the aft equipment rack
S_BULKHEAD = 462.5  # the aft bulkhead
S_EXIT = 495.02  # the engine's nozzle exit
TANK = 129.08  # the tank's length over its hemispherical ends (Launch Systems Final Report, p. III.C-7): documented
# the aft equipment rack, across: about 30 in between the faces the secondary propulsion modules hang on and 46 in the
# other way, where the nitrogen spheres are; with the modules on, about 54 in. Lockheed's catalog writes "APP 32" and
# "APP 54" on its Figure 13-9; the 46 is scaled from its Figure 14-6 and NASA S66-25782: estimated
RACK = (15.0, 23.0, 5.0)  # half its width (along Y), half its height (along Z), the chamfer of its corners
# the engine, a Bell 8247 (Lockheed's catalog, section 14): 16,000 lb of thrust and a nozzle of 45 to 1 with a
# radiation-cooled titanium extension are documented. Its exit's radius and where the extension begins are scaled from
# the catalog's Figure 14-6 and from S66-25782 (33 in and 30 in across): estimated
EXIT_R = 16.3
S_EXTENSION = 470.0
S_GIMBAL = 436.0  # the gimbal: a guess
N2 = 8.05  # a nitrogen sphere's radius: derived from "TWO 2200 CU IN N2 TANKS" (the catalog's Figure 14-6), 16.1 in across inside
N2_AT = ((0.0, 426.0), (0.0, 448.0), (math.pi, 441.0))  # the two, on the -Z face, and the auxiliary one opposite: scaled from that figure

SHELLS = (
    *tda.SHELLS,
    "AgenaForward_Skin",
    "AgenaForward_Fasteners",
    "AgenaForward_Bare",
    "AgenaForward_Paint",
    "AgenaTank_Skin",
    "AgenaTank_Seams",
    "AgenaTank_Fairings",
    "AgenaTank_FairingPorts",
    "AgenaAft_ThrustConeFairing",
    "AgenaAft_Shields",
    "AgenaAft_ShieldRibs",
    "AgenaEngine_Extension",
)


@dataclass(frozen=True)
class Unit:
    """One Gemini Agena Target Vehicle as it flew: what a flight's model script chooses (as it chooses what stood at
    a pad), each field a thing that differed from one vehicle to the next and shows on a model. What is known of each
    unit's differences, with its source, is tabulated in agena-target-vehicle.md, "One vehicle from the next"; a field is
    added here when the model can show it."""

    number: str  # Lockheed's number for the vehicle
    tda: str  # McDonnell's number for the docking adapter it carried
    # experiment S-10's micrometeorite package on the docking adapter, for a man outside to open and bring home
    # (Technical Summary, pp. 318 and 334: on adapters 1A, 3, 5 and 7A)
    s10: bool = False
    # mission reports XI and XII, §3.4; the fingers were removed for both
    discharge_fingers: bool = True
    revised_forward_rack: bool = False
    ion_wake: bool = False
    tether: bool = False
    eva_station: bool = False


# Gemini VIII's (Gemini VIII mission report, 3.4; adapter 3): the first to reach orbit and the first docked with
GATV_5002 = Unit("5002", tda="2")
GATV_5004 = Unit("5004", tda="5", s10=True)
GATV_5003 = Unit("5003", tda="3", s10=True)
GATV_5005 = Unit("5005", tda="1A", s10=True, revised_forward_rack=True, ion_wake=True)
GATV_5006 = Unit("5006", tda="6", discharge_fingers=False, revised_forward_rack=True, ion_wake=True, tether=True)
GATV_5001 = Unit("5001", tda="7A", s10=True, discharge_fingers=False, revised_forward_rack=True, tether=True, eva_station=True)


def H(station: float) -> float:
    """A station as a height above the nozzle's exit, inches."""
    return S_EXIT - station


def patch(mb: MeshBuilder, ax: Axis, a0: float, a1: float, s0: float, s1: float, off: float = 0.22) -> None:
    """A painted or bare panel on the skin: from one angle to another, from one station aft to another."""
    n = max(2, round(abs(a1 - a0) / deg(6)))
    for i in range(n):
        b0, b1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
        mb.add(
            [tuple(ax.p(b0, R + off, H(s1))), tuple(ax.p(b1, R + off, H(s1))), tuple(ax.p(b1, R + off, H(s0))), tuple(ax.p(b0, R + off, H(s0)))],
            [(0, 1, 2, 3)],
        )


def hemisphere(mb: MeshBuilder, ax: Axis, r: float, h: float, up: int, flip: bool = False) -> None:
    """Half a ball about the axis, its rim at height `h`, bulging forward (`up` 1) or aft (-1)."""
    n = 10
    arc = [(r * math.cos(math.pi / 2 * i / n), h + up * r * math.sin(math.pi / 2 * i / n)) for i in range(n + 1)]
    mb.lathe(prof(arc if up > 0 else arc[::-1]), 64, matrix=ax.m(), flip=flip)


def build(ax: Axis, flag, unit: Unit = GATV_5003, *, recovered_samples: bool = False) -> tuple[str, tuple[str, ...]]:
    """The vehicle with its nozzle's exit at the axis's datum and its top (-Z) the way the axis faces. `flag`: the
    material the flag is drawn in. `unit`: which vehicle, as it flew. Returns its size, and the
    meshes that enclose something. `recovered_samples` shows the four outer sample panels of the closed S010 package
    as it appeared when Gemini X returned to the earlier target."""
    M = tda.materials()
    fine = srlib.DETAIL >= 0.5
    whole = interior()
    tda.build(
        ax.up(H(S_TDA)),
        M,
        lip=tda.LIP_EXTENDED,
        cone_black=True,
        s10=unit.s10,
        discharge=unit.discharge_fingers,
        whose="the Agena's forward rack",
        ion_wake=unit.ion_wake,
        tether=unit.tether,
        eva_station=unit.eva_station,
        recovered_samples=recovered_samples,
    )
    tank_flag = unit.eva_station  # the position visible on GATV-5001 in NASA S66-62755
    build_forward(ax, M, flag, whole, unit.revised_forward_rack, tank_flag)
    build_tank(ax, M, flag, fine, unit.revised_forward_rack, tank_flag)
    build_aft(ax, M, fine, whole)
    build_engine(ax, M, fine, whole)
    long = (H(S_TDA) + tda.LIP_EXTENDED) * IN
    shells = (*SHELLS, "AgenaTank_Flag" if tank_flag else "AgenaForward_Flag")
    if unit.revised_forward_rack:
        shells += ("AgenaForward_ThermalTape", "AgenaForward_BallastDoor")
    return f"Agena {long:.3f} m from its nozzle to its cone's lip, {2 * R * IN:.3f} m across", shells


def build_forward(ax: Axis, M: dict, flag, whole: bool, revised_rack: bool, tank_flag: bool) -> None:
    """The auxiliary forward rack, 17.5 in that McDonnell's adapter is bolted to, and the forward section behind it: the
    vehicle's guidance, its batteries, its radios, and the two horizon sensors that tell it which way is down."""
    g = group("AgenaForwardSection")
    skin, bolts, paint, bare, dark = (MeshBuilder() for _ in range(5))
    skin.lathe(prof([(R, H(S_TANK)), (R, H(S_TDA))]), 96, matrix=ax.m())
    for s in (S_TDA + 1.2, S_FORWARD - 1.0, S_FORWARD + 1.0, 267.0, S_TANK - 1.2):
        rivets(bolts, ax, R, H(s), 72)
    for k in range(12):
        for i in range(12):
            bolts.disc(ax.p(TAU * k / 12, R, H(S_TDA + 3.0 + i * 4.6)), ax.radial(TAU * k / 12), 0.2 * IN, 0.07 * IN)
    # the paint, as NASA S66-25782 has the side toward the crew's camera (+Y), and taken to be the same on the other:
    # white, with a bare band next the tanks, black panels for the temperature inside, and the flag high on the side,
    # 19 in long. Each is measured on the photograph against the vehicle's 60 in: estimated
    for side in (1, -1):
        mid = side * deg(90)
        patch(bare, ax, mid - deg(65), mid + deg(65), 267.0, S_TANK - 0.4)
        patch(dark, ax, *sorted((side * deg(34), side * deg(52))), 271.5, 283.0, 0.36)
        patch(dark, ax, *sorted((side * deg(60), side * deg(90))), S_TDA + 1.0, 266.5)
        if not tank_flag:
            flag_patch(paint, ax, side, 41.0, 243.0, 19.0)
    say(
        skin.build("AgenaForward_Skin", M["white"], g, sharp_angle=None),
        "Forward section",
        "Fifty-eight inches of the vehicle between the docking adapter and the tanks: a rack of 17.5 in that McDonnell's "
        "adapter is bolted to, and behind it the standard Agena's forward section, 40.5 in long. In it are what flies "
        "the vehicle: the gyros and the two infrared horizon sensors that hold it level, the batteries, the command "
        "receiver and the programmer that remembers what it has been told to do, the telemetry. Its lengths are "
        "documented. The base paint scheme follows photographs of the Gemini VIII target: white, with black and bare panels.",
    )
    bolts.build("AgenaForward_Fasteners", M["aluminium"], g)
    bare.build("AgenaForward_Bare", M["alclad"], g, sharp_angle=None)
    dark.build("AgenaForward_Paint", M["black"], g, sharp_angle=None)
    if not tank_flag:
        paint.build("AgenaForward_Flag", flag, g, sharp_angle=None)
    if revised_rack:
        # Gemini X §3.4.1.1 gives the coverage (about 15%) but no map. Three 30 degree sectors taking 60%
        # of the axial length each give 0.15 of the cylindrical area. Their position and individual splits are estimated.
        tape, door = MeshBuilder(), MeshBuilder()
        for angle in (8.0, 128.0, 248.0):
            for s0, s1 in ((230.4, 246.0), (248.5, 267.7)):
                patch(tape, ax, deg(angle), deg(angle + 30), s0, s1, 0.51)
        patch(door, ax, deg(165), deg(195), 232.5, 244.5, 0.24)
        say(
            tape.build("AgenaForward_ThermalTape", M["silver"], g, sharp_angle=None),
            "Reflective aluminium tape",
            "Applied over about fifteen percent of the forward racks' skins for thermal control. The mission report gives "
            "the area and material. These strips' layout is estimated.",
        )
        say(
            door.build("AgenaForward_BallastDoor", M["steel"], g, sharp_angle=None),
            "Stainless ballast door",
            "This replacement for the magnesium access door helped carry the ballast in the auxiliary rack. "
            "The mission report gives the material and purpose. The door's station and size are estimated.",
        )
    # the horizon sensors' two heads, either side of the Earth side, low on the section: a dark blister over each
    heads, lamps_, ants = (MeshBuilder() for _ in range(3))
    for a in (deg(150), deg(210)):
        heads.lathe(prof([(4.4, -0.3), (4.4, 0.5), (3.4, 1.5), (0.0, 1.9)]), 24, matrix=ax.on(a, R, H(260.0)))
    say(
        heads.build("AgenaForward_HorizonSensors", M["black"], g, sharp_angle=35),
        "Horizon sensor",
        "One of two infrared eyes on the vehicle's under side, each sweeping the space below it for the warm edge of "
        "the Earth. Between them they tell the vehicle how far it is tipped in pitch and in roll, and gas jets at its "
        "tail put it right. That there are two, under the vehicle, is Lockheed's; a photograph shows a dark blister "
        "low on this section, which is what is drawn; their exact place is estimated.",
    )
    # the running lights: green to the right of the top, red to the left, 35 degrees round (Gemini VIII report, Figure 3.4-2).
    # A part of their own
    g_lights = group("AgenaRunningLights")
    for a, colour in ((deg(35), "green"), (deg(-35), "red")):
        m = MeshBuilder()
        at = ax.on(a, R, H(S_TDA + 5.0))
        lamps_.lathe(prof([(1.5, -0.3), (1.5, 0.3), (1.15, 0.3)]), 14, matrix=at)
        m.lathe(prof([(1.15, 0.3), (0.9, 0.95), (0.0, 1.15)]), 14, matrix=at)
        say(
            m.build(f"AgenaForward_RunningLight{colour.capitalize()}", M[colour], g_lights, sharp_angle=35),
            "Running light",
            "A coloured lamp, as on a ship: green to the right of the vehicle's top and red to the left, 35 degrees round "
            "from it, so that a crew coming up in the dark can tell which way the vehicle is turned. Their colours and "
            "angles are the mission report's drawing; how far along the vehicle they are is estimated.",
        )
    lamps_.build("AgenaForward_LightBases", M["aluminium"], g_lights, sharp_angle=35)
    # antennas, as the mission report's sketch of them has it (Figure 3.4-2, which has no dimensions): the C-band and
    # two S-band on the Earth side, the telemetry blade for the climb, and the range safety pair on the two sides
    ants.lathe(prof([(2.6, -0.3), (2.6, 0.35), (0.0, 0.35)]), 16, matrix=ax.on(deg(162), R, H(240.0)))
    for a in (deg(138), deg(150)):
        ants.lathe(prof([(1.4, -0.3), (1.4, 0.5), (0.0, 0.5)]), 12, matrix=ax.on(a, R, H(270.0)))
    chamfered(ants, (9.0, 0.5, 3.6), ax.on(deg(172), R, H(276.0), 1.3), 0.12)
    for a in (deg(90), deg(270)):
        chamfered(ants, (6.0, 5.0, 0.6), ax.on(a, R, H(280.0), 0.05), 0.1)
    say(
        ants.build("AgenaForward_Antennas", M["rod"], g, sharp_angle=35),
        "Antennas",
        "What the ground reached the vehicle through: a C-band beacon and two S-band antennas for the radars that "
        "tracked it, a blade for telemetry on the way up, and a pair on opposite sides for the range safety officer's "
        "command to destroy it. Which there were is the mission report's sketch of them, which has no dimensions: "
        "every place and size here is estimated.",
    )
    if not whole:
        return
    inside, frame_ = MeshBuilder(), MeshBuilder()
    ring(frame_, ax, R - 2.4, R - 0.15, H(S_FORWARD) - 0.5, H(S_FORWARD) + 0.5)
    ring(frame_, ax, R - 2.4, R - 0.15, H(S_TANK), H(S_TANK) + 1.0)
    ring(frame_, ax, R - 2.4, R - 0.15, H(S_TDA) - 1.2, H(S_TDA) - 0.2)
    # what is in it: the guidance module low on the Earth side, its underside the skin; batteries; the boxes of the
    # command and telemetry systems round the wall. Every one a guess
    chamfered(inside, (22.0, 16.0, 8.0), ax.on(deg(180), R - 5.5, H(263.0)), 0.6)
    for a, s, size in (
        (deg(60), 262.0, (16.0, 12.0, 8.0)),
        (deg(100), 255.0, (10.0, 14.0, 7.0)),
        (deg(300), 262.0, (16.0, 12.0, 8.0)),
        (deg(260), 255.0, (10.0, 14.0, 7.0)),
        (deg(20), 266.0, (12.0, 10.0, 7.0)),
        (deg(340), 266.0, (12.0, 10.0, 7.0)),
        (deg(120), 238.0, (10.0, 12.0, 6.0)),
        (deg(240), 238.0, (10.0, 12.0, 6.0)),
        (deg(0), 238.0, (10.0, 9.0, 6.0)),
    ):
        if revised_rack and a in (deg(60), deg(120)):
            continue  # one primary and one running-light battery removed; the shared equipment layout is estimated
        chamfered(inside, size, ax.on(a, R - 2.6 - size[2] / 2, H(s)), 0.4)
    if revised_rack:
        ballast = MeshBuilder()
        chamfered(ballast, (10.0, 12.0, 3.0), ax.on(deg(180), R - 3.2, H(238.5)), 0.2)
        say(
            ballast.build("AgenaForward_LeadBallast", M["equipment"], g, sharp_angle=35),
            "Lead ballast",
            "About 150 pounds of lead on the longerons and the new access door moved the target's centre of gravity. "
            "The report documents the weight and supports. The shape and location are estimates.",
        )
    say(
        inside.build("AgenaForward_Equipment", M["equipment"], g, sharp_angle=35),
        "Guidance and electronics",
        "The vehicle's own equipment, hung round the wall of this section: the guidance module on the Earth side, "
        "with the gyros and the horizon sensors; silver-zinc batteries; the command receiver, the programmer and the "
        "telemetry. That these are in the forward section is documented. No drawing read places them: every box "
        "here is a guess.",
    )
    frame_.build("AgenaForward_Frames", M["structure"], g, sharp_angle=30)


def flag_patch(mesh: MeshBuilder, ax: Axis, side: int, angle: float, station: float, width: float) -> None:
    """Flag decal on the cylinder. The union lies forward and toward the target's top."""
    nx, ny = 8, 4
    height = width / 1.9
    mesh.grid(
        lambda i, j: ax.p(side * (deg(angle) + (0.5 - j / ny) * height / R), R + 0.22, H(station - width / 2 + width * i / nx)),
        range(nx + 1),
        range(ny + 1),
        uv=lambda i, j: (i / nx, j / ny),
        flip=side > 0,
    )


def build_tank(ax: Axis, M: dict, flag, fine: bool, rotated_mount: bool, tank_flag: bool) -> None:
    """The tank section: one cylinder of aluminium that is both tanks' wall, fuel forward and oxidiser aft, with a
    fairing along its top and one along its bottom for what cannot go through a tank."""
    g = group("AgenaTankSection")
    skin, seams, fair, holes_ = (MeshBuilder() for _ in range(4))
    skin.lathe(prof([(R, H(S_AFT)), (R, H(S_TANK))]), 96, matrix=ax.m())
    for s in (S_TANK + 0.6, 312.0, 336.0, 360.0, S_AFT - 0.6):  # the welds round it
        ring(seams, ax, R - 0.1, R + 0.12, H(s) - 0.5, H(s) + 0.5)
    if fine:
        for k in range(8):  # and along it
            a = TAU * (k + 0.5) / 8
            if abs(math.sin(a)) < 0.3:
                continue  # (under the fairings)
            seams.tube(ax.p(a, R + 0.02, H(S_AFT - 1.2)), ax.p(a, R + 0.02, H(S_TANK + 1.2)), 0.16 * IN, 6, caps=False)
    for a in (0.0, math.pi):
        wide, proud = 9.0, 2.7
        m = ax.on(a, R, (H(S_TANK) + H(S_AFT)) / 2, proud / 2 - 0.4)
        chamfered(fair, (S_AFT - S_TANK - 1.0, wide, proud + 0.8), m, 0.7)
        if a == 0.0 and fine:  # (the row of square openings along the upper one, as NASA S66-25782 shows it)
            for i in range(14):
                for side in (-1, 1):
                    x = -(S_AFT - S_TANK) / 2 + 6.0 + i * 6.4
                    chamfered(holes_, (2.2, 0.3, 1.5), m @ Matrix.Translation(Vector((x, side * (wide / 2 + 0.02), 0.1)) * IN), 0.05)
    say(
        skin.build("AgenaTank_Skin", M["polished"], g, sharp_angle=None),
        "Tank section",
        "One cylinder of bare aluminium, five feet across, whose wall is the wall of both tanks: fuel in the forward one, "
        "oxidiser in the after one, about 13,000 lb of the two. The engine burns unsymmetrical dimethylhydrazine with "
        "nitric acid, which ignite on contact. The engine could restart in orbit, including with a spacecraft "
        "docked. The section's length is documented, and the tanks' length over "
        "their ends, 129.08 in. It was left bare: the photographs taken from Gemini VIII show polished metal in panels.",
    )
    seams.build("AgenaTank_Seams", M["alclad"], g, sharp_angle=None)
    if tank_flag:
        paint = MeshBuilder()
        for side in (1, -1):
            flag_patch(paint, ax, side, 92.0, 328.0, 28.0)
        paint.build("AgenaTank_Flag", flag, g, sharp_angle=None)
    say(
        fair.build("AgenaTank_Fairings", M["black"], g, sharp_angle=35),
        "Tank fairing",
        "The tanks fill the section from wall to wall, so the wires and pipes that join the two ends of the vehicle go "
        "outside, under two fairings along it. That there are two is documented. A photograph shows the upper one "
        "dark, with a row of square openings along it; the lower one is taken to be opposite it, and their size is "
        "estimated.",
    )
    if holes_.verts:
        holes_.build("AgenaTank_FairingPorts", M["alclad"], g, sharp_angle=35)
    # the telemetry antenna for orbit, at the section's aft end (Gemini VIII report, Figure 3.4-2): a stub. Estimated
    stub = MeshBuilder()
    stub.lathe(prof([(1.3, -0.3), (1.3, 0.4), (0.35, 0.4), (0.35, 5.0), (0.0, 5.0)]), 12, matrix=ax.on(deg(125), R, H(377.0)))
    if rotated_mount:
        # The receptacle turned 90 degrees in its own mounting plane (Gemini X §3.4.2.4).
        chamfered(stub, (2.3, 4.0, 0.65), ax.on(deg(125), R, H(377.0), -0.12), 0.1)
    stub.build("AgenaTank_TelemetryAntenna", M["rod"], g, sharp_angle=35)
    tanks = MeshBuilder()  # (at every level of detail: they are what closes the vehicle's two open ends)
    over = (TANK - (S_AFT - S_TANK)) / 2  # how far each end stands beyond the section: 16.29 in
    ri = R - 1.6
    hemisphere(tanks, ax, ri, H(S_TANK) + over - ri, 1, flip=True)  # the fuel tank's forward end, seen from inside
    hemisphere(tanks, ax, ri, H(S_AFT) - over + ri, -1, flip=True)  # the oxidiser tank's aft end
    hemisphere(tanks, ax, ri, H(330.0) - ri * 0.0, -1)  # the bulkhead between the two: where is a guess
    say(
        tanks.build("AgenaTank_Bulkheads", M["structure"], g, sharp_angle=None),
        "Propellant tank ends",
        "The tanks' ends are half-balls, and each stands 16 in beyond the section it is in: 129.08 in over the two, in a "
        "section 96.5 in long. Between the fuel and the oxidiser is a third. The length over the ends is documented; "
        "where the dividing bulkhead is, and which way it bulges, are guesses.",
    )


def rack_outline(grow: float = 0.0) -> list[tuple[float, float]]:
    """The aft rack's section, as (along Z toward the top, along Y): an oblong with its corners cut off."""
    hy, hz, c = RACK[0] + grow, RACK[1] + grow, RACK[2]
    return [(hz, hy - c), (hz - c, hy), (-hz + c, hy), (-hz, hy - c), (-hz, -hy + c), (-hz + c, -hy), (hz - c, -hy), (hz, -hy + c)]


def build_aft(ax: Axis, M: dict, fine: bool, whole: bool) -> None:
    """The aft section as it was in orbit, its outer skin left on the Atlas: the cone the engine pushes on, under a
    white fairing, and the open rack behind it with the secondary propulsion modules on its two sides and the
    attitude control gas on its top and bottom."""
    g = group("AgenaAftSection")
    g_sps = group("AgenaSecondaryPropulsion")  # (the two modules on the rack's sides: a part of their own)
    cone, rack, shields, quilt, spheres, jets, sps, ants = (MeshBuilder() for _ in range(8))
    top = lambda zc, yc, s: ax.p(0.0, zc, H(s)) + ax.radial(math.pi / 2) * (yc * IN)  # noqa: E731  a point by its Z, its Y and its station
    # the thrust cone's fairing: from the tank's 60 in down to the rack
    n = 48
    outline = rack_outline(0.6)

    def on_rack(k: int) -> tuple[float, float]:
        """The rack's outline where the ray at that angle meets it."""
        a = TAU * k / n
        dz, dy = math.cos(a), math.sin(a)
        best = 1e9
        for (z0, y0), (z1, y1) in zip(outline, outline[1:] + outline[:1]):
            den = dz * (y1 - y0) - dy * (z1 - z0)
            if abs(den) < 1e-9:
                continue
            t = (z0 * (y1 - y0) - y0 * (z1 - z0)) / den
            u = (z0 * dy - y0 * dz) / den
            if t > 0 and -1e-9 <= u <= 1 + 1e-9:
                best = min(best, t)
        return best * dz, best * dy

    cone.grid(
        lambda k, j: ax.p(TAU * k / n, R - 0.2, H(S_PARTED)) * (1 - j) + top(*on_rack(k % n), S_RACK + 0.6) * j,
        range(n + 1),
        (0.0, 0.5, 1.0),
        flip=True,
    )
    ring(rack, ax, R - 2.2, R + 0.15, H(S_PARTED), H(S_AFT))  # the ring it parted from the Atlas's adapter at
    say(
        cone.build("AgenaAft_ThrustConeFairing", M["shield"], g, sharp_angle=30),
        "Thrust cone fairing",
        "Behind the tanks the vehicle narrows. On the way up this part was inside a skin as wide as the tanks, which "
        "joined the Agena to its Atlas and stayed on the Atlas when the two parted, at station 385.4. What is left is "
        "the cone that carries the engine's thrust into the tanks' wall, under a white shield added for these "
        "vehicles to keep the Sun off it. The station is documented; the shield's form is read off a photograph.",
    )
    # the rack: a frame of eight longerons and three rings, braced
    pts = rack_outline()
    for zc, yc in pts:
        rack.tube(top(zc, yc, S_RACK), top(zc, yc, S_BULKHEAD), 0.75 * IN, 8)
    for s in (S_RACK, (S_RACK + S_BULKHEAD) / 2, S_BULKHEAD - 0.4):
        for (z0, y0), (z1, y1) in zip(pts, pts[1:] + pts[:1]):
            rack.tube(top(z0, y0, s), top(z1, y1, s), 0.6 * IN, 8)
    if fine:
        mid = (S_RACK + S_BULKHEAD) / 2
        for sign in (1, -1):  # the bracing on the two faces the spheres are on
            zc = sign * RACK[1]
            for s0, s1 in ((S_RACK, mid), (mid, S_BULKHEAD - 0.4)):
                rack.tube(top(zc, -(RACK[0] - RACK[2]), s0), top(zc, RACK[0] - RACK[2], s1), 0.4 * IN, 6)
                rack.tube(top(zc, RACK[0] - RACK[2], s0), top(zc, -(RACK[0] - RACK[2]), s1), 0.4 * IN, 6)
    # the aft bulkhead: a plate across the rack's end, with a hole the engine's nozzle comes through
    verts = [tuple(top(zc, yc, S_BULKHEAD)) for zc, yc in rack_outline(0.4)]
    hole = [tuple(top(9.6 * math.cos(TAU * i / 32), 9.6 * math.sin(TAU * i / 32), S_BULKHEAD)) for i in range(32)]
    for i in range(32):  # (a fan from the hole out to the plate's edge: each of the hole's sides to the nearest corner)
        k0 = min(range(8), key=lambda k: abs((math.atan2(pts[k][1], pts[k][0]) - TAU * i / 32 + math.pi) % TAU - math.pi))
        k1 = min(range(8), key=lambda k: abs((math.atan2(pts[k][1], pts[k][0]) - TAU * (i + 1) / 32 + math.pi) % TAU - math.pi))
        quad = [hole[i], hole[(i + 1) % 32], verts[k1], verts[k0]]
        if k0 == k1:
            quad = quad[:3]
        rack.add(quad, [tuple(range(len(quad)))[::-1]])
        rack.add(quad, [tuple(range(len(quad)))])
    say(
        rack.build("AgenaAft_Rack", M["aluminium"], g, sharp_angle=35),
        "Aft equipment rack",
        "An open frame round the engine, from station 411.86 to the aft bulkhead at 462.5, with the vehicle's small "
        "engines and its gas hung on the outside of it: a secondary propulsion module on either side, nitrogen spheres "
        "on its top and bottom, attitude jets on its end. Its stations are documented. It is about 30 in one way and "
        "46 the other, as near as Lockheed's drawings and a photograph can be scaled; the frame's members are ours.",
    )
    # the nitrogen for the attitude jets: two spheres on the top face, one auxiliary on the bottom
    for a, s in N2_AT:
        at = ax.p(a, RACK[1] + 5.0 - N2, H(s))  # (five inches of it stand proud of the rack: scaled from the catalog's Figure 14-6)
        srlib_sphere(spheres, at, N2 * IN)
        rack_r = 0.5
        for e in (-1, 1):
            jets.tube(
                at + ax.radial(a + math.pi / 2) * (e * N2 * 0.8 * IN),
                ax.p(a, RACK[1], H(s)) + ax.radial(a + math.pi / 2) * (e * (RACK[0] - RACK[2]) * IN),
                rack_r * IN,
                6,
            )
    say(
        spheres.build("AgenaAft_NitrogenSpheres", M["tank"], g, sharp_angle=None),
        "Nitrogen spheres",
        "The gas the vehicle steers with when its engines are off: nitrogen, in two spheres of 2,200 cubic inches on the "
        "rack's top and a third on its bottom, let out through six small jets at the tail. With a spacecraft docked "
        "the same jets had twice the mass to turn. The spheres' volume is Lockheed's drawing's, and their size "
        "follows; their places are scaled from that drawing.",
    )
    # the attitude jets: two clusters of three on the aft bulkhead, top and bottom, each of ten pounds
    for a in (0.0, math.pi):
        base = ax.p(a, RACK[1] - 1.0, H(S_BULKHEAD + 1.4))
        chamfered(jets, (3.6, 6.0, 2.8), ax.on(a, RACK[1] - 1.0, H(S_BULKHEAD + 1.4)), 0.3)
        for way in (ax.radial(a), ax.radial(a + math.pi / 2), ax.radial(a - math.pi / 2)):
            jets.lathe(prof([(0.0, 0.0), (0.4, 0.0), (0.4, 1.2), (0.85, 2.6)]), 10, matrix=frame(base + way * (1.2 * IN), way))
    say(
        jets.build("AgenaAft_AttitudeJets", M["steel"], g, sharp_angle=35),
        "Attitude control jets",
        "Six cold gas jets of ten pounds' thrust each, in two clusters of three at the tail, top and bottom: one of each "
        "cluster blows outward for pitch, and two sideways for yaw and roll. Their number, thrust and places are "
        "Lockheed's; their form is estimated.",
    )
    # the secondary propulsion system: a module on either side, each with a chamber of 200 lb and one of 16 lb firing aft,
    # its two tanks under a shield
    for side, a in ((1, deg(90)), (-1, deg(270))):
        out = RACK[0]
        m = ax.on(a, out, H((S_RACK + S_BULKHEAD) / 2), 6.0)
        long = S_BULKHEAD - S_RACK
        chamfered(shields, (long - 1.0, 2 * (RACK[1] - RACK[2]) - 1.0, 12.0), m, 1.6)
        if fine:
            for i in range(11):  # the shield's ribs
                x = -long / 2 + 3.0 + i * (long - 6.0) / 10
                chamfered(quilt, (0.7, 2 * (RACK[1] - RACK[2]) - 2.4, 0.5), m @ Matrix.Translation(Vector((x, 0.0, 6.1)) * IN), 0.1)
        # Unit II (200 lb) toward the top on the -Y module and toward the bottom on the +Y one; Unit I (16 lb) at the other corner
        for unit, zc in ((2, -side * (RACK[1] - 6.5)), (1, side * (RACK[1] - 7.5))):
            r_exit, length = (3.4, 9.5) if unit == 2 else (1.3, 4.6)
            foot = top(zc, side * (out + 5.6), S_BULKHEAD - 3.0)
            sps.lathe(prof([(r_exit * 0.42, 0.0), (r_exit * 0.3, length * 0.3), (r_exit, length)]), 18, matrix=frame(foot, (0.0, 0.0, -1.0)))
            sps.lathe(
                prof([(0.0, -3.0), (r_exit * 0.55, -3.0), (r_exit * 0.55, 0.0), (r_exit * 0.42, 0.0)]), 14, matrix=frame(foot, (0.0, 0.0, -1.0))
            )
        if whole:  # under the shield: a fuel tank and an oxidiser tank, side by side, and the ball of nitrogen that feeds them
            for zc in (-7.0, 7.0):
                c0, c1 = top(zc, side * (out + 5.0), S_RACK + 9.0), top(zc, side * (out + 5.0), S_BULKHEAD - 14.0)
                sps.tube(c0, c1, 4.4 * IN, 16)
                srlib_sphere(sps, c0, 4.3 * IN)
                srlib_sphere(sps, c1, 4.3 * IN)
            srlib_sphere(sps, top(0.0, side * (out + 4.6), S_BULKHEAD - 7.0), 4.0 * IN)
    say(
        shields.build("AgenaAft_Shields", M["black"], g_sps, sharp_angle=35),
        "Secondary propulsion module",
        "One of two small rocket packs, one on each side of the rack, added to the Agena for Gemini. Each has its own "
        "tanks, its own nitrogen and two chambers that fire aft: one of 200 lb and one of 16. The 16 lb pair is fired "
        "first, to settle the main tanks' propellant over their outlets before the big engine is lit; the 200 lb "
        "pair makes the small changes of orbit the big engine is too coarse for. A shield over each keeps the Sun "
        "off it. That there are two, on opposite sides, and the four thrusts are documented; the photograph shows "
        "the shields ribbed and dark; a module's size is scaled from Lockheed's drawing.",
    )
    if quilt.verts:
        quilt.build("AgenaAft_ShieldRibs", M["silver"], g_sps, sharp_angle=35)
    say(
        sps.build("AgenaAft_SecondaryEngines", M["nozzle"], g_sps, sharp_angle=35),
        "Secondary propulsion chambers",
        "Each module's two chambers, firing aft beside the main engine's nozzle: Unit II, of 200 lb, and Unit I, of 16. "
        "On the module on the vehicle's right the small one is toward the top and the large one toward the bottom; on "
        "the left it is the other way about. Which is where is Lockheed's drawing; their sizes are scaled from it.",
    )
    # the command antenna and the two for orbit, on the rack (Launch Systems Final Report, Figure III.C-6): stubs. Estimated
    for a, s in ((deg(135), 430.0), (deg(225), 452.0)):
        ants.lathe(
            prof([(1.2, -0.2), (1.2, 0.4), (0.3, 0.4), (0.3, 6.0), (0.0, 6.0)]),
            10,
            matrix=frame(top(RACK[1] * math.cos(a) * 0.86, RACK[0] * math.sin(a) * 1.25, s), ax.radial(a)),
        )
    ants.build("AgenaAft_Antennas", M["rod"], g, sharp_angle=35)
    if whole:
        kit = MeshBuilder()
        chamfered(kit, (9.0, 8.0, 5.0), ax.on(0.0, 9.0, H(S_RACK + 6.0)), 0.4)  # the hydraulic power package
        chamfered(kit, (8.0, 7.0, 5.0), ax.on(math.pi, RACK[1] - 3.5, H(456.0)), 0.4)
        say(
            kit.build("AgenaAft_Equipment", M["equipment"], g, sharp_angle=35),
            "Hydraulic power package",
            "The pump and reservoir that swing the main engine on its gimbal to steer the vehicle while it burns, and "
            "beside it a junction box. That the package is on this rack is documented; its form and place are guesses.",
        )


def srlib_sphere(mb: MeshBuilder, centre: Vector, r: float, segs: int = 24) -> None:
    """A ball: its middle and its radius in metres."""
    n = 12 if srlib.DETAIL >= 1.0 else 6
    mb.lathe(
        [(r * math.cos(a), r * math.sin(a)) for a in (-math.pi / 2 + math.pi * i / n for i in range(n + 1))], segs, matrix=Matrix.Translation(centre)
    )


def build_engine(ax: Axis, M: dict, fine: bool, whole: bool) -> None:
    """The primary propulsion system: Bell's model 8247, one chamber of 16,000 lb on a gimbal, pump fed, restartable."""
    g = group("AgenaEngine")
    bell, ext, pump = MeshBuilder(), MeshBuilder(), MeshBuilder()
    throat_s, throat_r = 452.0, 2.9
    join_r = 9.0  # the nozzle's radius where the extension is bolted on: scaled from the same drawing
    # the chamber and the nozzle as far as the extension: cooled by the oxidiser, in a jacket
    chamber = [(0.0, H(S_GIMBAL + 2.0)), (4.2, H(S_GIMBAL + 2.5)), (5.0, H(S_GIMBAL + 6.0)), (5.0, H(throat_s - 5.0)), (throat_r + 0.5, H(throat_s))]
    cone_ = [
        (throat_r + 0.5 + (join_r - throat_r - 0.5) * math.sin(math.pi / 2 * i / 6) ** 0.8, H(throat_s + (S_EXTENSION - throat_s) * i / 6))
        for i in range(1, 7)
    ]
    bell.lathe(prof([*chamber, *cone_][::-1]), 48, matrix=ax.m())
    say(
        bell.build("AgenaEngine_Chamber", M["nozzle"], g, sharp_angle=35),
        "Main engine",
        "A Bell model 8247: one chamber of 16,000 lb, fed by a turbopump, burning dimethylhydrazine with nitric acid. "
        "It is the Agena's ordinary engine made to start many times: where the ordinary one lights its pump with "
        "solid charges, each good for one start, this one has small tanks that are filled again from the main ones. "
        "Its ascent burn put the vehicle into orbit. Crews or ground controllers could command a restart. It "
        "swings on a gimbal to steer. Its thrust and its make are documented; its form is scaled from Lockheed's "
        "drawings, which give no size.",
    )
    # the extension: thin titanium, cooled only by its own glow, stiffened outside by hoops and stringers
    profile = [
        (join_r + (EXIT_R - join_r) * math.sin(math.pi / 2 * i / 8) ** 0.75, H(S_EXTENSION + (S_EXIT - S_EXTENSION) * i / 8)) for i in range(9)
    ]
    ext.lathe(prof(profile[::-1]), 64, matrix=ax.m())
    hoop_ = lambda r, h0, h1: ext.lathe(prof([(r + 0.06, h0), (r + 0.5, h0), (r + 0.5, h1), (r + 0.06, h1)]), 64, matrix=ax.m())  # noqa: E731
    hoop_(EXIT_R, 0.0, 0.5)  # the hoop round its lip, which is what the vehicle stands on here
    if fine:
        for r, h in profile[2:-1:2]:
            hoop_(r, h - 0.25, h + 0.25)
        for k in range(24):
            a = TAU * k / 24
            for (r0, h0), (r1, h1) in zip(profile, profile[1:-1]):
                ext.tube(ax.p(a, r0 + 0.45, h0), ax.p(a, r1 + 0.45, h1), 0.22 * IN, 5, caps=False)
    say(
        ext.build("AgenaEngine_Extension", M["nozzle"], g, sharp_angle=35),
        "Nozzle extension",
        "The engine's bell is in two parts. The upper is cooled by the oxidiser on its way to the chamber. The lower, "
        "which takes the expansion out to 45 to 1, is a shell of titanium that carries nothing and is cooled only by "
        "glowing: it is stiffened on the outside by hoops and stringers, which is why it looks like a basket. The "
        "ratio and the titanium are documented; its size is scaled from Lockheed's drawing and from a photograph, "
        "about 33 in across at the exit.",
    )
    if not whole:
        return
    # beside the chamber: the turbopump, its two start tanks, the gimbal's mount to the thrust cone
    pump.tube(ax.p(deg(90), 8.4, H(S_GIMBAL + 2.0)), ax.p(deg(90), 8.4, H(S_GIMBAL + 13.0)), 3.2 * IN, 16)
    pump.tube(ax.p(deg(90), 8.4, H(S_GIMBAL + 13.0)), ax.p(deg(90), 6.5, H(S_GIMBAL + 20.0)), 1.4 * IN, 10)
    for a in (deg(230), deg(310)):
        pump.tube(ax.p(a, 9.0, H(S_GIMBAL + 3.0)), ax.p(a, 9.0, H(S_GIMBAL + 12.0)), 2.7 * IN, 14)
        srlib_sphere(pump, ax.p(a, 9.0, H(S_GIMBAL + 3.0)), 2.7 * IN, 14)
        srlib_sphere(pump, ax.p(a, 9.0, H(S_GIMBAL + 12.0)), 2.7 * IN, 14)
    for k in range(4):  # four struts from the gimbal up to the cone
        a = TAU * (k + 0.5) / 4
        pump.tube(ax.p(a, 2.0, H(S_GIMBAL + 1.0)), ax.p(a, 9.0, H(S_RACK - 1.0)), 0.7 * IN, 8)
    pump.lathe(prof([(0.0, H(S_GIMBAL + 2.0)), (3.0, H(S_GIMBAL + 2.0)), (3.0, H(S_GIMBAL - 1.0)), (0.0, H(S_GIMBAL - 1.0))]), 16, matrix=ax.m())
    say(
        pump.build("AgenaEngine_Turbopump", M["aluminium"], g, sharp_angle=35),
        "Turbopump and start tanks",
        "A gas generator burns a little of the propellants to spin a turbine, and the turbine drives the two pumps "
        "that feed the chamber. To get the turbine turning in the first place this engine has two small tanks of "
        "fuel and oxidiser, filled again from the main tanks after every burn: that is what lets it start more than "
        "once. That it had them is documented; their form and places are guesses.",
    )
