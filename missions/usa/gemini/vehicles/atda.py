"""The Augmented Target Docking Adapter: McDonnell's stand-in for an Agena, as Gemini IX-A found it in orbit, with its
ascent shroud still on it and half open.

One was built and one flew (1 June 1966). It is here beside the other targets because it carries the same docking
adapter (target_docking_adapter.py); a flight's model/vehicle.py asks gemini_stack for it. It is built standing on its
tail beside the launch vehicle, as an exhibit stands: it never stood so. The Atlas that carried it is not built.

Dimensions are inches and stations are the ATDA's own: 0 where the docking adapter meets the equipment section,
positive toward the docking cone, as McDonnell's drawing of it has them (Technical Summary, Figure 66; SEDR 300 volume 2,
Figure 15-1). A height here is a station plus 102.35, the tip of the stub antenna at its tail being the lowest thing
on it. Round it, angles are measured from its top, where the cone's notch is, as on the docking adapter.

See ./atda.md for what each number rests on.

Top-level nodes: TargetDockingAdapter (target_docking_adapter.py)  AtdaEquipmentSection  AtdaReactionControl  AtdaShroud
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import target_docking_adapter as tda
from mercury_capsule import chamfered
from srlib import IN, TAU, MeshBuilder, deg, group, interior, prof
from target_docking_adapter import Axis, ring, rivets, say

R = 30.0  # the equipment section, 60 in across: documented (Technical Summary, Figure 66, section C-C)
# McDonnell's dimensions along it (the same figure): the equipment section 54.00 in, the reaction control section 18.00,
# the battery module 17.75, and the stub antenna standing 12.60 beyond it: documented. Stations follow
S_EQUIPMENT = -54.00
S_RCS = -72.00
S_BATTERY = -89.75
S_TAIL = -102.35
RCS_R = 20.2  # the reaction control section, 40.4 in across: documented (section B-B)
BATTERY_R = 18.1  # the battery module, 36.2 in across: documented (section A-A)
LIGHTS = (-5.06, -49.00)  # the stations of the two rings of running lights (SEDR 300 volume 2, Figure 15-1): documented
# the ascent shroud: "117 inches long and consisted of a cylinder 23.5 inches long by 65 inches in diameter, blended to a
# 15-degree half-angle cone topped by a 12-inch-diameter hemisphere" (Launch Systems Final Report, p. III.C-3, of the
# Agena's, which this one was); 65.12 in across its base on McDonnell's drawing: documented. The 117 in, the 23.5 in
# and the 15 degrees leave a nose of 9.8 in radius, not 6: derived, and nearer what the photographs show
SHROUD = (117.00, 65.12 / 2, 23.5, deg(15))
NOSE_R = (93.5 - (SHROUD[1] / math.tan(SHROUD[3]))) / ((1 - math.sin(SHROUD[3])) - math.cos(SHROUD[3]) / math.tan(SHROUD[3]))
# how far it had opened: "The shroud halves had pivoted to about 30 degrees of separation ... when the wiring became taut
# on the ends of the band-clamp halves" (Gemini IX-A mission report, 5.8.1.2): documented. Each half is turned half of it
OPEN = deg(15)
BAND = 22.0  # the band clamp, "at a station 22 inches forward of the TDA/shroud interface" (the same): documented

SHELLS = (
    *tda.SHELLS,
    "AtdaEquipment_Skin",
    "AtdaEquipment_Fasteners",
    "AtdaEquipment_Band",
    "AtdaEquipment_Stripe",
    "AtdaEquipment_Flag",
    "AtdaEquipment_Doors",
    "AtdaRcs_Skin",
    "AtdaRcs_BatteryCan",
    # (the shroud too: cut open, the cone it kept the ship out of is seen inside it)
    "AtdaShroud_Shell",
    "AtdaShroud_Inside",
    "AtdaShroud_BandClamp",
    "AtdaShroud_Placards",
)


def H(station: float) -> float:
    """A station as a height above the stub antenna's tip, inches."""
    return station - S_TAIL


def build(ax: Axis, flag) -> tuple[str, tuple[str, ...]]:
    """The ATDA with the tip of its stub antenna at the axis's datum and its top the way the axis faces. Returns its
    size, and the meshes that enclose something."""
    M = tda.materials()
    whole = interior()
    tda.build(ax.up(H(0.0)), M, lip=tda.LIP_ATDA, cone_black=False, s10=True, whose="the equipment section")
    build_equipment(ax, M, flag, whole)
    build_rcs(ax, M, whole)
    build_shroud(ax, M)
    long = (tda.LIP_ATDA - S_TAIL) * IN
    return f"ATDA {long:.3f} m from its antenna's tip to its cone's lip, {2 * R * IN:.3f} m across, its shroud {SHROUD[0] * IN:.3f} m long", SHELLS


def build_equipment(ax: Axis, M: dict, flag, whole: bool) -> None:
    """The equipment section: a ring-stiffened cylinder 54 in long with the vehicle's electronics on two beams across
    it, four access doors, and six running lights."""
    g = group("AtdaEquipmentSection")
    skin, bolts, band, stripe, doors, lamps = (MeshBuilder() for _ in range(6))
    skin.lathe(prof([(R, H(S_EQUIPMENT)), (R, H(0.0))]), 96, matrix=ax.m())
    for s in (-1.4, -18.0, -36.0, S_EQUIPMENT + 1.4):
        rivets(bolts, ax, R, H(s), 72)
    # the paint. McDonnell's manual says the section is "painted black with white longitudinal stripes"; the report says
    # most of the vehicle was "painted with an aluminized acrylic enamel"; the photographs taken from Gemini IX-A (NASA
    # S66-37923) show an aluminium-coloured section with one black band along it carrying a white stripe. The photographs
    # are followed. Which side the band is on is not made out: it is put on the vehicle's right. Estimated
    n = 10
    for i in range(n):
        a0, a1 = deg(72) + deg(36) * i / n, deg(72) + deg(36) * (i + 1) / n
        band.add(
            [tuple(ax.p(a, R + 0.22, H(s))) for a, s in ((a0, S_EQUIPMENT + 2.4), (a1, S_EQUIPMENT + 2.4), (a1, -2.4), (a0, -2.4))], [(0, 1, 2, 3)]
        )
    for a0, a1 in ((deg(88), deg(92)),):
        stripe.add(
            [tuple(ax.p(a, R + 0.36, H(s))) for a, s in ((a0, S_EQUIPMENT + 4.0), (a1, S_EQUIPMENT + 4.0), (a1, -4.0), (a0, -4.0))], [(0, 1, 2, 3)]
        )
    # the flag, forward on the same side
    fw, nx, ny = 12.0, 8, 4
    fh = fw / 1.9
    fl = MeshBuilder()
    fl.grid(
        lambda i, j: ax.p(deg(60) + (0.5 - j / ny) * fh / R, R + 0.22, H(-9.0 - fw / 2 + fw * i / nx)),
        range(nx + 1),
        range(ny + 1),
        uv=lambda i, j: (1.0 - i / nx, j / ny),
    )
    # four access doors, one in each quarter (Gemini IX-A mission report, 3.7.1.3): where on the wall is a guess
    for k in range(4):
        a = deg(45) + TAU * k / 4
        w = 9.0 / R
        for i in range(8):
            b0, b1 = a - w + 2 * w * i / 8, a - w + 2 * w * (i + 1) / 8
            doors.add([tuple(ax.p(b, R + 0.22, H(s))) for b, s in ((b0, -40.0), (b1, -40.0), (b1, -16.0), (b0, -16.0))], [(0, 1, 2, 3)])
        for i in range(9):
            for b in (a - w, a + w):
                bolts.disc(ax.p(b, R + 0.2, H(-40.0 + 3.0 * i)), ax.radial(b), 0.2 * IN, 0.1 * IN)
    say(
        skin.build("AtdaEquipment_Skin", M["aluminium"], g, sharp_angle=None),
        "Equipment section",
        "A plain cylinder five feet across and 54 in long, built in six weeks out of parts that had already been "
        "tested for the Gemini spacecraft. In it, on two beams that cross in the middle, is what an Agena has that a "
        "bare docking collar lacks: radar beacons for the ground to track it by, a command receiver, telemetry, and "
        "the electronics of a small attitude control system. It has no engine and cannot change its orbit. Its "
        "length and width are McDonnell's drawing; the paint is read off the photographs Gemini IX-A's crew took.",
    )
    bolts.build("AtdaEquipment_Fasteners", M["aluminium"], g)
    band.build("AtdaEquipment_Band", M["black"], g, sharp_angle=None)
    stripe.build("AtdaEquipment_Stripe", M["white"], g, sharp_angle=None)
    fl.build("AtdaEquipment_Flag", flag, g, sharp_angle=None)
    say(
        doors.build("AtdaEquipment_Doors", M["alclad"], g, sharp_angle=None),
        "Access door",
        "One of four doors in the section's wall, through which its equipment was put in and checked. That there were "
        "four is documented; where they were round the section, and their size, are guesses.",
    )
    g_lights = group("AtdaRunningLights")  # (a part of their own)
    # six running lights under quartz domes: green on the right of the top, red on the left, amber underneath, two of
    # each on a line along the vehicle (SEDR 300 volume 2, p. 15-11)
    for a, colour in ((deg(45), "green"), (deg(-45), "red"), (deg(180), "amber")):
        m = MeshBuilder()
        for s in LIGHTS:
            at = ax.on(a, R, H(s))
            lamps.lathe(prof([(1.9, -0.3), (1.9, 0.3), (1.5, 0.3)]), 14, matrix=at)
            m.lathe(prof([(1.5, 0.3), (1.25, 1.2), (0.0, 1.6)]), 14, matrix=at)
        say(
            m.build(f"AtdaEquipment_RunningLight{colour.capitalize()}", M[colour], g_lights, sharp_angle=35),
            "Running lights",
            "Six lamps of about 21 candlepower under domes of quartz glass, two of each colour on a line along the "
            "vehicle: green to the right of its top, red to the left and amber underneath, so that a crew coming "
            "up in the dark can tell which way it is turned and how it is rolling. Their colours, their number and "
            "their stations are documented; how far round the top the green and red are is estimated.",
        )
    lamps.build("AtdaEquipment_LightBases", M["aluminium"], g_lights, sharp_angle=35)
    # the UHF whip under its fairing, and the C-band beacons' helices: three to a set, two sets
    ants = MeshBuilder()
    chamfered(ants, (11.0, 2.4, 2.2), ax.on(deg(200), R, H(-36.0), 0.8), 0.6)
    for k in range(6):
        a = deg(20) + TAU * k / 6
        ants.lathe(prof([(1.0, -0.2), (1.0, 0.5), (0.5, 2.2), (0.0, 2.4)]), 10, matrix=ax.on(a, R, H(-44.0 if k % 2 else -46.5)))
    say(
        ants.build("AtdaEquipment_Antennas", M["rod"], g, sharp_angle=35),
        "Antennas",
        "A fairing over a UHF whip for telemetry and commands, and six short helices for the two C-band beacons that "
        "the ground's radars tracked the vehicle by, three to a beacon. What there was is documented; where each is "
        "round the section, and its size, are guesses.",
    )
    if not whole:
        return
    beams, kit, frames_ = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for h in (H(0.0) - 0.9, H(-18.0), H(-36.0), H(S_EQUIPMENT) + 0.1):
        ring(frames_, ax, R - 2.2, R - 0.15, h, h + 0.8)
    mid = (H(0.0) + H(S_EQUIPMENT)) / 2
    mid += 4.0  # (the beams stand clear of the reaction control tanks, which come up into the section's foot)
    for a in (deg(22.5), deg(112.5)):  # two beams across the section, crossing at right angles near the middle
        m = ax.m(mid, a)
        chamfered(beams, (2 * R - 5.0, 0.35, 30.0), m, 0.08)
        for e in (-1, 1):
            chamfered(beams, (2 * R - 5.0, 3.0, 0.4), m @ Matrix.Translation(Vector((0.0, 0.0, e * 15.0)) * IN), 0.08)
    say(
        beams.build("AtdaEquipment_Beams", M["alclad"], g, sharp_angle=35),
        "Equipment beams",
        "Two beams across the section, crossing at right angles near its middle, with the electronics bolted to their "
        "webs. That there are two and that they cross so is documented; their depth is scaled from McDonnell's drawing.",
    )
    # the equipment on the beams' webs, as McDonnell's drawing names it; which box is where, and every size, a guess
    for a, out, hh, size in (
        (deg(22.5), 17.0, 6.0, (12.0, 5.0, 10.0)),
        (deg(22.5), -17.0, 4.0, (12.0, 5.0, 9.0)),
        (deg(22.5), 16.0, -9.0, (10.0, 4.0, 8.0)),
        (deg(22.5), -15.0, -9.0, (9.0, 4.0, 8.0)),
        (deg(112.5), 17.0, 5.0, (12.0, 6.0, 10.0)),
        (deg(112.5), -17.0, 5.0, (12.0, 5.0, 10.0)),
        (deg(112.5), 16.0, -9.0, (9.0, 5.0, 7.0)),
        (deg(112.5), -16.0, -9.0, (10.0, 4.0, 8.0)),
    ):
        for face in (1, -1):
            chamfered(kit, size, ax.m(mid + hh, a) @ Matrix.Translation(Vector((out, face * (size[1] / 2 + 0.35), 0.0)) * IN), 0.35)
    say(
        kit.build("AtdaEquipment_Electronics", M["equipment"], g, sharp_angle=35),
        "Electronics",
        "Every box here had flown before in a Gemini spacecraft: two C-band radar beacons, a command receiver and "
        "decoder, a telemetry programmer and its converters, two packages of rate gyros, two inverters, and the "
        "attitude control electronics that turned the gyros' signals into thruster firings. What there was is "
        "McDonnell's drawing; which box is where, and their sizes, are guesses.",
    )
    frames_.build("AtdaEquipment_Frames", M["structure"], g, sharp_angle=30)


def build_rcs(ax: Axis, M: dict, whole: bool) -> None:
    """The reaction control section, which is a Gemini spacecraft's re-entry control section put to another use, and
    the battery module behind it in its can, with the stub antenna at its tail."""
    g = group("AtdaReactionControl")
    g_battery = group("AtdaBatteryModule")  # (the can behind it, with what hangs on it: a part of its own)
    skin, webs, can, rails, noz, stub = (MeshBuilder() for _ in range(6))
    # the step from the equipment section's 60 in down to it: the ring it was cut from the Atlas's adapter at
    skin.lathe(prof([(RCS_R - 0.4, H(S_RCS)), (RCS_R - 0.4, H(S_EQUIPMENT))]), 72, matrix=ax.m())
    step = MeshBuilder()  # (the equipment section's aft end, round the smaller section: seen from both sides)
    step.lathe(prof([(RCS_R - 0.4, H(S_EQUIPMENT) - 0.7), (R - 0.3, H(S_EQUIPMENT) - 0.7)]), 96, matrix=ax.m())
    step.build("AtdaRcs_Step", M["structure"], g, sharp_angle=None)
    ring(webs, ax, R - 2.0, R + 0.2, H(S_EQUIPMENT) - 1.4, H(S_EQUIPMENT))
    for k in range(9):  # "nine external webs supporting the longitudinal stiffeners"
        a = TAU * (k + 0.5) / 9
        chamfered(webs, (S_EQUIPMENT - S_RCS - 0.6, 0.4, 1.0), ax.on(a, RCS_R - 0.4, (H(S_RCS) + H(S_EQUIPMENT)) / 2, 0.4), 0.06)
    for s in (S_RCS, S_EQUIPMENT - 1.0):
        ring(webs, ax, RCS_R - 1.6, RCS_R + 0.1, H(s), H(s) + 1.0)
    # sixteen thrust chambers of 23.5 lb in two rings of eight, as on the spacecraft: four clusters on the diagonals
    for top_ in (1, -1):
        for side in (1, -1):
            for a in (deg(34), deg(55)):
                theta = side * a if top_ > 0 else side * (math.pi - a)
                for s in (S_RCS + 6.2, S_RCS + 11.0):
                    noz.lathe(prof([(0.0, -1.2), (0.6, -1.2), (0.6, 0.0), (1.25, 1.1)]), 14, matrix=ax.on(theta, RCS_R - 0.4, H(s)))
    say(
        skin.build("AtdaRcs_Skin", M["tank"], g, sharp_angle=None),
        "Reaction control section",
        "A Gemini spacecraft's re-entry control section, 18 in long: the short cylinder that steers the ship home from "
        "retrofire, with its sixteen thrusters of 23.5 lb in two complete rings and its own tanks. Here it had another "
        "job. With two packages of rate gyros it was to stop the vehicle tumbling, or hold it turning slowly so that "
        "the Sun warmed it evenly. It could not point the vehicle anywhere: there is nothing aboard that knows which "
        "way is down. Its length and width are McDonnell's drawing; it is of titanium, as the spacecraft's is.",
    )
    webs.build("AtdaRcs_Structure", M["alclad"], g, sharp_angle=35)
    say(
        noz.build("AtdaRcs_ThrustChambers", M["nozzle"], g, sharp_angle=35),
        "Reaction control thrusters",
        "Sixteen chambers of 23.5 lb, two rings of eight, either ring enough alone: the spacecraft's own re-entry "
        "thrusters. On this vehicle they answered only to rate gyros. When Gemini IX-A came up to it, it was "
        "turning at about three degrees a second with its shroud hanging open, and they were what was keeping "
        "that from being worse. Their number and thrust are documented; they are drawn pointing straight out, where "
        "the spacecraft's fire along its axes, and their places are the spacecraft's, assumed.",
    )
    # the battery module's can, and the four rails the vehicle slid out of the Atlas's adapter on
    can.lathe(prof([(0.0, H(S_BATTERY)), (BATTERY_R, H(S_BATTERY)), (BATTERY_R, H(S_RCS) - 0.05)]), 72, matrix=ax.m())
    for h in (H(S_BATTERY) + 0.2, H(S_RCS) - 1.2):
        ring(can, ax, BATTERY_R - 0.2, BATTERY_R + 0.3, h, h + 0.8, 72)
    say(
        can.build("AtdaRcs_BatteryCan", M["aluminium"], g_battery, sharp_angle=35),
        "Battery module",
        "A can 36 in across at the vehicle's tail, bolted to the reaction control section where a spacecraft's "
        "parachute section would be. In it are three silver-zinc batteries of 400 ampere-hours, enough for five days, "
        "and two small ones for firing pyrotechnics. Its size is McDonnell's drawing.",
    )
    for k in range(4):
        a = deg(45) + TAU * k / 4
        rails.tube(ax.p(a, R - 1.4, H(S_EQUIPMENT) - 1.0), ax.p(a, BATTERY_R + 4.4, H(S_BATTERY) + 0.6), 0.55 * IN, 8)
        chamfered(rails, (1.6, 2.4, 4.6), ax.on(a, BATTERY_R + 2.2, H(S_BATTERY) + 1.2), 0.2)
    say(
        rails.build("AtdaRcs_SeparationRails", M["alclad"], g_battery, sharp_angle=35),
        "Separation rails",
        "Four rails from the equipment section's rim down to the foot of the battery can. The whole tail of the vehicle "
        "rode inside the adapter on top of the Atlas; when a charge cut the two apart, eight bungee cords pulled the "
        "vehicle out at about three feet a second, and it ran out along these so that nothing caught. That there "
        "were guide rails supported by the can is documented; their form is scaled from McDonnell's drawing.",
    )
    stub.lathe(prof([(0.0, H(S_TAIL)), (0.625, H(S_TAIL)), (0.625, H(S_BATTERY) + 0.3)]), 12, matrix=ax.m())
    stub.lathe(prof([(0.625, H(S_BATTERY) - 0.9), (2.2, H(S_BATTERY) - 0.9), (2.2, H(S_BATTERY) + 0.05)]), 16, matrix=ax.m())
    say(
        stub.build("AtdaRcs_StubAntenna", M["rod"], g_battery, sharp_angle=35),
        "UHF stub antenna",
        "A stub an inch and a quarter thick, standing 12.6 in out of the middle of the vehicle's tail: the antenna that "
        "kept the ground in touch with it whichever way it rolled. In this exhibit the vehicle stands on it, which "
        "nothing ever did. Its length is McDonnell's drawing and its thickness his manual's.",
    )
    if not whole:
        return
    tanks, batt = MeshBuilder(), MeshBuilder()
    # each ring's own fuel tank, oxidiser tank and nitrogen bottle, standing forward into the equipment section
    for e, x in ((1, 6.0), (-1, -6.0)):
        for y, long in ((-6.0, 30.7), (6.0, 25.2)):
            foot = ax.p(0.0, x, H(S_RCS) + 2.0) + ax.radial(math.pi / 2) * (y * IN)
            tanks.tube(foot, foot + Vector((0.0, 0.0, long * IN)), 2.55 * IN, 16)
        c = ax.p(0.0, 0.0, H(S_RCS) + 9.0) + ax.radial(math.pi / 2) * (e * 14.5 * IN)
        tanks.lathe(
            [(3.625 * IN * math.cos(t), 3.625 * IN * math.sin(t)) for t in (-math.pi / 2 + math.pi * i / 10 for i in range(11))],
            20,
            matrix=Matrix.Translation(c),
        )
    say(
        tanks.build("AtdaRcs_Tanks", M["tank"], g, sharp_angle=35),
        "Reaction control tanks",
        "Each of the two rings has its own tank of fuel, tank of oxidiser and bottle of nitrogen, as on the spacecraft: "
        "tubes 5.1 in across and a ball of 7.25. They are fastened to this section and stand forward out of it into "
        "the equipment section. That they do is documented; their sizes are the spacecraft's; how they are arranged "
        "is scaled from McDonnell's drawing.",
    )
    for k in range(3):
        a = TAU * k / 3 + 0.4
        chamfered(batt, (10.0, 7.4, 12.0), ax.on(a, 9.6, (H(S_BATTERY) + H(S_RCS)) / 2 - 1.0) @ Matrix.Rotation(math.pi / 2, 4, "Y"), 0.3)
    for e in (-1, 1):
        chamfered(batt, (2.6, 3.0, 4.0), ax.on(e * 0.9 + math.pi + 0.4, 2.4, H(S_BATTERY) + 12.0) @ Matrix.Rotation(math.pi / 2, 4, "Y"), 0.2)
    say(
        batt.build("AtdaRcs_Batteries", M["equipment"], g_battery, sharp_angle=35),
        "Batteries",
        "Three silver-zinc batteries of 400 ampere-hours, of the kind a Gemini on batteries carried in its adapter, and "
        "two of 15 for the pyrotechnics. Their number and ratings are the mission report's; McDonnell's drawing "
        "labels the large ones 350 ampere-hours. Their sizes and places are guesses.",
    )


def build_shroud(ax: Axis, M: dict) -> None:
    """The ascent shroud as it stayed: two half-shells of phenolic glass fibre, hinged at their bases on the adapter's
    two sides, open about thirty degrees, with the band clamp's halves still on them and the wires that held them."""
    g = group("AtdaShroud")
    g_band = group("AtdaShroudBand")  # (what held it: the band clamp and the wiring to its bolts, a part of its own)
    long, rb, cyl, half = SHROUD
    base = H(tda.SHROUD_BASE)
    rn = NOSE_R
    cone_top = base + cyl + (rb - rn * math.cos(half)) / math.tan(half)  # where the cone meets the nose's cap
    centre = cone_top - rn * math.sin(half)
    body = [(rb, base), (rb, base + cyl), (rn * math.cos(half), cone_top)]
    cap = [(rn * math.cos(t), centre + rn * math.sin(t)) for t in (half + (math.pi / 2 - half) * i / 8 for i in range(9))]
    thick = 0.6
    outer, inner, bands, wires, marks = (MeshBuilder() for _ in range(5))
    ends = {}
    for side, a in ((1, deg(90)), (-1, deg(270))):
        pivot = ax.p(a, rb, base)
        axis = ax.radial(a + math.pi / 2)
        turn = Matrix.Translation(pivot) @ Matrix.Rotation(OPEN, 4, axis) @ Matrix.Translation(-pivot)
        m = turn @ ax.m()
        arc = (a - math.pi / 2, a + math.pi / 2)
        long_half = side < 0  # (one segment keeps the nose: which is not made out, and it is put on the vehicle's left)
        outer.lathe(prof(body), 48, matrix=m, arc=arc)
        inner.lathe(prof([(r - thick, h) for r, h in body]), 48, matrix=m, arc=arc, flip=True)
        if long_half:
            outer.lathe(prof(cap), 48, matrix=m)
            inner.lathe(prof([(max(0.0, r - thick), h - thick * 0.3) for r, h in cap]), 48, matrix=m, flip=True)
        # its two long edges, between the skins, and its base
        for e in (-1, 1):
            b = a + e * math.pi / 2
            rows = [[m @ Vector((r_ * math.cos(b) * IN, r_ * math.sin(b) * IN, h * IN)) for r_ in (r, r - thick)] for r, h in body]
            outer.grid(lambda i, j, rows=rows: rows[j][i], (0, 1) if e > 0 else (1, 0), range(len(rows)))
        outer.lathe(prof([(rb - thick, base), (rb, base)]), 48, matrix=m, arc=arc)
        top = rn * math.cos(half)
        if long_half:  # (the rim of the nose's cap, where the other segment met it)
            outer.lathe(prof([(top - thick, cone_top), (top, cone_top)]), 24, matrix=m, arc=(arc[1], arc[0] + TAU))
        else:
            outer.lathe(prof([(top, cone_top), (top - thick, cone_top)]), 24, matrix=m, arc=arc)
        # the band clamp's half, 22 in up, and the pad a spring pushed on, 40 in up
        bh = base + BAND
        bands.lathe(
            prof([(rb + 0.05, bh - 1.0), (rb + 0.4, bh - 1.0), (rb + 0.4, bh + 1.0), (rb + 0.05, bh + 1.0)]),
            48,
            matrix=m,
            arc=(arc[0] + 0.03, arc[1] - 0.03),
        )
        for e in (-1, 1):
            b = a + e * (math.pi / 2 - 0.05)
            end = m @ Vector(((rb + 0.4) * math.cos(b) * IN, (rb + 0.4) * math.sin(b) * IN, bh * IN))
            # The estimated bundle goes around the exposed edge of the half shell to the clamp on its outside.
            edge = a + e * (math.pi / 2 + 0.04)
            guide = m @ (Vector(((rb + 0.9) * math.cos(edge), (rb + 0.9) * math.sin(edge), bh - 0.5)) * IN)
            ends[(side, e)] = (guide, end)
            chamfered(
                bands,
                (2.0, 1.6, 1.4),
                m @ Matrix.Translation(Vector(((rb + 0.9) * math.cos(b), (rb + 0.9) * math.sin(b), bh)) * IN) @ Matrix.Rotation(b, 4, "Z"),
                0.15,
            )
        # two red placards near its base, as the photographs have them
        for da in (-0.5, 0.45):
            for k in range(4):
                b0, b1 = a + da - 0.09 + 0.045 * k, a + da - 0.09 + 0.045 * (k + 1)
                marks.add(
                    [
                        tuple(m @ Vector(((rb + 0.2) * math.cos(b) * IN, (rb + 0.2) * math.sin(b) * IN, h * IN)))
                        for b, h in ((b0, base + 8.0), (b1, base + 8.0), (b1, base + 13.0), (b0, base + 13.0))
                    ],
                    [(0, 1, 2, 3)],
                )
    # the wires that held it: from the adapter's rim to the ends of the band clamp's halves, top and bottom
    for (side, e), (guide, end) in ends.items():
        a = (deg(90) if side > 0 else deg(270)) + e * math.pi / 2
        foot = ax.p(a + side * e * -0.12, tda.RADIUS - 0.6, H(tda.SHELL) + 0.2)
        wires.tube(foot, guide, 0.28 * IN, 6)
        wires.tube(guide, end, 0.28 * IN, 6)
    say(
        outer.build("AtdaShroud_Shell", M["fibreglass"], g, sharp_angle=35),
        "Ascent shroud",
        "Two half-shells of phenolic glass fibre, 117 in long and 65 across, which covered the docking cone on the way "
        "up and should have been thrown off two seconds before the vehicle left its Atlas. The four bolts fired, the "
        "springs pushed, and the halves swung open about thirty degrees and stopped. One half carries the whole of the "
        'nose. "It looks like an angry alligator out here rotating around," said Stafford. The length, the width and '
        "the thirty degrees are documented; the nose's radius is worked from the other dimensions; which half kept "
        "the nose is not made out.",
    )
    inner.build("AtdaShroud_Inside", M["liner"], g, sharp_angle=35)
    say(
        bands.build("AtdaShroud_BandClamp", M["steel"], g_band, sharp_angle=35),
        "Band clamp",
        "A steel band round the shroud 22 in above its base, in two halves bolted together at the sides. When the bolts "
        "fired the halves were to fall away with the shroud, and as they went, four lanyards fastened to them were to "
        "pull out the plugs of the wires that ran to the bolts. The men who fitted the shroud at the Cape had not "
        "done it before, did not know what the loose lanyards were for, and taped them neatly to the wire bundles. So "
        "the plugs stayed in, and the wires, which take several hundred pounds to break, held the halves by the ends "
        "of this band. Its station and what held it are documented; its form is estimated.",
    )
    say(
        wires.build("AtdaShroud_Wiring", M["black"], g_band, sharp_angle=None),
        "Electrical wiring",
        "What kept the first docking with this vehicle from happening: four bundles of wire from the adapter to the "
        "explosive bolts' plugs on the band clamp, pulled taut. Each plug would have let go at two pounds if its "
        "lanyard had been fastened to the band. Stafford wanted to nudge the jaws open with his docking bar and was "
        "told not to. Two astronauts were sent to look at a duplicate shroud, to see whether a man outside could cut "
        "the wires: he could, they said, but among edges sharp enough to tear his suit. That the wires held the "
        "band's ends is documented; where they ran is estimated.",
    )
    marks.build("AtdaShroud_Placards", M["placard"], g, sharp_angle=None)
