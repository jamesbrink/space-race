"""Gemini spacecraft No. 6 on Gemini Launch Vehicle 6, as launched on Gemini-Titan 6A (15 December 1965).

Run headless:
    pnpm model gt-6a           (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad at the third count. The stack is
../../../vehicles/gemini_stack.py (the spacecraft gemini_spacecraft.py, the launch vehicle titan_ii_glv.py); what was this
ship's and this vehicle's own is said here (FIT, VEHICLE, SAYS) and argued in ../spacecraft.md and
../../../vehicles/titan-ii-glv.md.

Top-level nodes (the viewer's part list keys on these names):
    NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation  HeatShield
    RetroSection  EquipmentSection
and, from the launch vehicle:
    TitanStage2  TitanStage2Engine  TitanInterstage  TitanStage1  TitanStage1Engine
"""

from __future__ import annotations

import os
import sys

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
import gemini_stack  # noqa: E402
from gemini_spacecraft import Fit  # noqa: E402
from gemini_stack import st  # noqa: E402
from srlib import run  # noqa: E402

# What spacecraft 6 had, against spacecraft 5 before it and spacecraft 7, which flew first (../spacecraft.md, "This ship and
# the others"). The report on this flight (MSC-G-R-66-2) has not been found. "SEDR2" is SEDR 300 volume 2, McDonnell's
# manual for the rendezvous ships, which says what was spacecraft 6's alone; "GVII" the Gemini VII mission report,
# MSC-G-R-66-1, which says what spacecraft 7 lacked that 5 and 6 had; "kit" NASA's press kit for the two flights, release
# 65-362; "SP-121" the Gemini Midprogram Conference.
FIT = Fit(
    radar=True,  # "the regular rendezvous radar installation required for spacecraft 5 and 6" (GVII, 3.1.1.1); kit, p. 59
    # the three mooring latch receptacles round the forward face's rim, under the nose fairing. The ship was built to dock
    # with an Agena, and its JETT RETRO switch fired the latches' release ("spacecraft 6 and 8 through 12": SEDR2, p. 4-23;
    # Figure 13-2). That they were still on it in December is assumed: nothing read says they were taken off, and NASA
    # S65-64040 shows a notch at the bottom of the rim where the lowest would be. The index bar is stowed at launch: not built
    mooring_latches=True,
    lateral_thrusters=True,  # all sixteen OAMS chambers real, from spacecraft 4 on
    # "two tanks on S/C 6" each of fuel, of oxidiser and of helium, where spacecraft 5 had one (SEDR 300 volume 2, Section
    # VIII, Figure 8-96 sheet 1, p. 8-346, and Figure 8-94, p. 8-342)
    oams_tanks=2,
    adapter_batteries=3,  # "On spacecraft 6, three 400 ampere/hour, 16 cell, silver-zinc batteries" (SEDR2, p. 5-22); kit, p. 61
    # in a row under the adapter battery module's beam, with the ship's one water tank at the row's end: "Spacecraft 6 has
    # only one storage tank and uses oxygen for the pressurant" (SEDR2, Figure 5-9, "S/C 6"; p. 6-18; Figure 6-10 sheet 3)
    battery_module=True,
    fuel_cells=False,  # "in lieu of the fuel cell batteries" (SEDR2, p. 5-3): the last Gemini on batteries alone
    water_tanks=0,  # (the early ships' small tanks are not this ship's: its one tank is the battery module's)
    pod=False,  # the rendezvous evaluation pod was "on spacecraft 5 only" (SEDR2, p. 2-19)
    experiments=(),  # (none of its three experiments is modelled: ../spacecraft.md)
    names=("Schirra", "Stafford"),
    # no crew: both men wore the G4C suit (SP-121, p. 64), which is not modelled
    crew=None,
    white_disc=False,  # not known of this ship: it is spacecraft 3's, and not identified
    gmt_clock=True,  # as spacecraft 4 and 5: assumed, nothing read says it of this ship
    # "the addition of a mission-elapsed-time clock to spacecraft 6 and subsequent spacecraft" (SP-121, p. 63). Where it stood
    # is said of spacecraft 7's, "in the center instrument panel in place of the flight plan roller" (GVII, 3.1.2.5), and
    # taken to be the same here
    get_clock=True,
)

# GLV-6: as GLV-5. The flashing lights were GLV-4's and GLV-7's: "added to stage II of GLV-7" from the GLV-6 configuration
# (GVII, 3.2.2.5 and Table 3.2-I)
VEHICLE = dict(skirt_insulation=False)

PHOTOGRAPH = "It is read off a photograph of spacecraft 3 and taken to be the same on this ship."
STRIP = "Its place is read off a photograph of spacecraft 3; the photograph Gemini 7's crew took of this ship from 38 ft shows the same strip."

# What these things say of themselves on this flight: the type's words tell Gemini-Titan 3's story.
SAYS = {
    "RR_MainParachute": (
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in this section. The ship hangs from it by its nose at first, then is let "
        "down to hang level by two points so that it meets the sea on the edge of its heat shield. On this flight it came out "
        "at about 3,200 m and set the ship down 7 nautical miles from the point it was steered for, before the carrier Wasp's "
        "television cameras. The height is the programme's history's; the pack's form here is estimated.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out to steady the ship; lower down the drogue pulls out a pilot parachute, and the "
        "pilot parachute pulls this whole section off the ship, radar and all, and the main parachute out of it. On this "
        "flight the drogue came out at about 14,000 m and the main at about 3,200 m, by the programme's history. Their forms "
        "and places here are estimated.",
    ),
    "RCS_ThrustChambers": (
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. On this flight they did more than hold it steady: this was the first Gemini steered "
        "to its landing by its own computer. The ship is heavier on one side, so it flies with a little lift, and "
        "rolling it with these points the lift where it is wanted. Schirra held it banked 55 degrees to the left until the "
        "computer took over, then followed its needles, and came down 7 nautical miles from the mark. In each cluster "
        "one pair fires along the ship's top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in "
        "opposite corners they roll it. That is why the ports are ovals. Which chamber fires which way is SEDR 300's "
        f"drawing; where the clusters stand is read off a photograph. {PHOTOGRAPH}",
    ),
    "RCS_CableCover": (
        "Parachute cable cover",
        "The white strip along the top of the ship, running from near the heat shield up over this section. SEDR 300 lists "
        f"a cover over the parachute's control cables here, and that is what it is taken to be. {STRIP}",
    ),
    "Cabin_CableCover": (
        "Parachute cable cover",
        "The white strip along the top of the ship, between the hatches. SEDR 300 lists a cover over the parachute's control "
        "cables here, and that is what it is taken to be: the ship comes down hanging level from two points, and the lines "
        f"to the forward one must run along the outside until they are pulled free. {STRIP}",
    ),
    "Hatches_WindowFrames": (
        "Window",
        "The window is not in the skin. Its outer pane is set at about 35 degrees to the hatch, its aft edge at the skin and "
        "its forward edge sunk, so that it faces forward like a windscreen; and forward of it a trough is cut into the "
        "cone for the pilot to look along. There are three panes of 96 per cent silica glass, one in this outer frame and "
        "two in a frame bolted on inside with 35 bolts; the right-hand window's are optically ground. Everything this "
        "flight was for was done through them: Schirra flew the last three thousand feet to Gemini 7 by eye, and then the two "
        "crews looked at one another through four panes of glass. In Gemini 7's photograph of this ship a blue card "
        "reading BEAT ARMY is propped in the right-hand one. The 35 degrees is SEDR 300's section as drawn; where the window "
        "is and its outline are read off a photograph of spacecraft 3, and taken to be the same on this ship.",
    ),
    "Retro_ForwardThrusters": (
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. They are the "
        "brakes of a rendezvous. At 5 hours 50 minutes, 3,000 ft from Gemini 7 and closing at about 40 ft a second, Schirra "
        "began firing them, and by 1,500 ft he was down to 7 ft a second. From the other ship Borman and Lovell watched "
        "the flame, which the programme's history puts at twelve metres long. Their thrust is documented; where they stand "
        "is read off SEDR 300's sketch of the system, and how far they lean forward is estimated.",
    ),
    "Retro_LateralThrusters": (
        "Lateral thrusters",
        "Chambers 13 to 16: four of 100 lbf, pointing out to the sides, up and down through the ship's centre of gravity, to "
        "move it bodily without turning it. They are what a ship closing on a target steers its last few hundred feet "
        "with, and this was the first ship to use them for it. For more than three revolutions Schirra and Stafford flew "
        "round Gemini 7 with them, out to 300 ft and in to one, and found they could change their speed by a tenth of a foot "
        "a second at a touch. Which way each pushes is documented; where they stand is read off SEDR 300's sketch.",
    ),
    "Retro_Rockets": (
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 25 hours 15 "
        "minutes 58 seconds, in the dark, the first of them began to bring Gemini 6A down, a day after it went up. Going up "
        "they have a second use: fired together, they pull the ship off a failing Titan. Their size is SEDR 300's; where "
        "they sit in the section is read off its figure.",
    ),
    "Equipment_AftThrusters": (
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. These did the catching up. The Titan "
        "left the ship a little slow and some 1,200 miles behind Gemini 7. At 1 hour 34 minutes they added 14 ft a second to "
        "lift the high point of the orbit, at 2 hours 18 minutes 61 ft a second to lift the low point, and at 3 hours 47 "
        "minutes, in a burn of 54 seconds, 43 ft a second that made the orbit a circle 15 nautical miles under Gemini 7's. "
        "SEDR 300's sketch puts one at the top of the foot and one at the bottom; there they lean outward, and here they "
        "fire straight aft.",
    ),
    "Equipment_AttitudeThrusters": (
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. In each cluster one fires along the ship's "
        "top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll it. In "
        "the last half hour of the chase they kept the ship's nose, and the radar on it, on Gemini 7; beside it they held "
        "the ship so still that at one point neither man touched the stick for twenty minutes. Their number, thrust and which "
        "way each fires are documented; where the clusters stand round the foot is read off SEDR 300's sketch.",
    ),
    "Equipment_Cover": (
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of glass "
        "fibre with gold deposited on it is stretched across the opening. When the two ships met, each crew told the other "
        "that it had cords several metres long streaming from its back end: they were the rubber holders of the charge that "
        "cuts the ship from the Titan, torn loose round this rim. It is gathered in from the rim to a hoop, like the inside of "
        "a funnel, with a flat disc in the middle, and the two aft-firing thrusters stand through it at the rim. That it was "
        "there and what it was made of are documented; its form is measured on the photograph this ship's crew took of Gemini 7 "
        "from behind, good to two or three inches, and taken to be the same on this ship.",
    ),
    "Equipment_OamsTanks": (
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: fuel, oxidiser and helium to push them, feeding sixteen thrust chambers "
        "round the adapter. A ship that had to find another in orbit was given twice the tanks of the ones before: two "
        "of fuel, two of oxidiser and two of helium, each the size of the one a Gemini had carried until now. 669 lb was "
        "the load announced for this flight, against about 300 lb for Gemini 3. The whole chase used 113 lb of fuel, and "
        "Schirra arrived with 62 per cent of his propellant left. That there were two of each, 21.13 in, 21.12 in and "
        "16.20 in across, is McDonnell's manual; its drawing has the four propellant tanks in a row along the module's frame, "
        "against the wall toward the ship's top and a little to the crew's right. Which of the four are fuel, and where the two "
        "helium tanks are, are estimated.",
    ),
    "Equipment_PrimaryOxygen": (
        "Primary oxygen",
        "The oxygen the crew breathe in orbit, in a tank of its own. When this section is cut away before retrofire the "
        "crew go on to a smaller supply in the re-entry module. McDonnell's drawing puts it under its own panel of the blast "
        "shield, at one end of the space between the two beams; its size is estimated.",
    ),
    "Equipment_Batteries": (
        "Adapter batteries",
        "Three silver-zinc batteries of 400 ampere-hours, each weighing 118 lb in a magnesium case: all the power the ship "
        "had in orbit. Gemini 5 and Gemini 7 ran on fuel cells; this ship was given batteries so that nothing the fuel "
        "cells did on Gemini 5 could hold up the first rendezvous. They were good for two days at most, and the flight was "
        "planned so that it could come home after one, which it did. It was the last Gemini to fly on batteries alone. Their "
        "number, rating and weight are McDonnell's manual's, and so is their row under the module's beam; their size here "
        "is estimated.",
    ),
    "RR_MooringLatches": (
        "Mooring latch receptacle",
        "One of three fittings round the rim of the forward face, a third of a turn apart, for the hooks of an Agena's "
        "docking cone to drop behind: with all three caught, the cone is drawn in and the two are one vehicle. This ship "
        "was built to dock with the Agena that was lost on 25 October, and went up in December to meet a ship with "
        "nothing to catch them. The nose fairing covers them on the way up and swings away on the lowest one. That a "
        "ship of this pattern had three, equally spaced, is McDonnell's manual; that they were still on this one in "
        "December is assumed, and the photograph Gemini 7's crew took of its nose shows a notch at the bottom of the "
        "rim where the lowest would be. Their size here is estimated.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The panels are drawn from McDonnell's drawing of spacecraft 3's, with the clock that spacecraft 4 added on the "
        "command pilot's side. Before the command pilot besides: the ball that shows which way the ship points, the "
        "accelerometer and the abort lamp above it, the Titan's tank pressures, the event timer, the counters that say how "
        "much speed is still to be added, and the range and range rate of whatever the radar has found. On this flight "
        "that last dial was one the chase was flown by: Schirra and Stafford found the radar's range rate and the "
        "platform's angles the best pair of figures they had. Before the pilot: a second ball, his clock, the computer's "
        "readout and its keyboard. On the centre panel is a clock counting hours, minutes and seconds from liftoff, the "
        "first a Gemini had: until then the crews had worked elapsed time out from Greenwich, and sometimes got it "
        "wrong. That this ship had one is documented; its place is the next ship's, where it took the place of the "
        "flight plan's roller, and its form is estimated. What else this ship changed is not drawn: a plain voltmeter "
        "and ammeter for the batteries, and the panel that was to have commanded the Agena. The instruments' "
        "graduations are estimated.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners "
        "between, the hatches for its roof. Schirra and Stafford sat in it through three counts: on 25 October while their "
        "Agena was lost, on 12 December while the Titan lit and stopped under them, and on 15 December for a day and "
        "an hour. No drawing read gives its dimensions. Its form is McDonnell's figures': flat sides leaning in toward a "
        "narrow floor. Its sizes are those fitted round the crew of spacecraft 3, which was built to the same drawings.",
    ),
    "SeatCommandPilot_Frame": (
        "Ejection seat",
        "Schirra's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute "
        "the way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees "
        "blows both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° "
        "forward so that the two do not meet. On 12 December 1965 the rules called for it: the engines had lit and stopped "
        "and the clock on the panel was running as if the vehicle had left the ground. Schirra had felt no lift, and left "
        "the ring alone. Its form is the two seats the Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: "
        "the G4C suit both men wore is not modelled.",
    ),
    "SeatPilot_Frame": (
        "Ejection seat",
        "Stafford's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute "
        "the way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees "
        "blows both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° "
        "forward so that the two do not meet. Stafford reckoned that leaving the pad on one meant more than 20 g and, at "
        "best, months with a sore back. Its form is the two seats the Smithsonian holds, 22 in wide and 54 in tall. The "
        "seat is empty: the G4C suit both men wore is not modelled.",
    ),
    # the launch vehicle
    "Interstage_ExhaustPorts": (
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. The plan for this flight put "
        "it 2 minutes 36 seconds after liftoff; the time it happened is in a report that has not been found. Their number "
        "and size are counted off the photographs of GLV-3.",
    ),
    "Stage1_OxidiserFeedConduit": (
        "Oxidiser feed line",
        "The oxidiser tank is above the fuel tank, and its feed line goes straight down through the fuel inside a conduit of "
        "its own, its joints butt-welded since GLV-4. Documented that it was so; its size is estimated.",
    ),
    "Stage1Engine_PogoSuppressors": (
        "Standpipe and accumulator",
        "The missile shook along its length for half a minute of first stage flight: the thrust, the propellant in the feed "
        "lines and the stretch of the vehicle fed one another. A warhead did not mind; a crew reading instruments would. So "
        "each oxidiser line has a standpipe, a closed tube with a bubble of gas at its top for the liquid to bounce on, and "
        "each fuel line a small piston accumulator. On Gemini 5's vehicle the standpipes had been charged wrongly and the "
        "crew were shaken past the limit; it was the only time. As this one left the pad both men thought it shimmied, and "
        "the programme's history allows that two false starts may have left them listening for it. That the standpipes "
        "were there is documented; their form and place here are not.",
    ),
}


def build() -> str:
    return gemini_stack.build(FIT, SAYS, **VEHICLE)


if __name__ == "__main__":
    run(
        "gt-6a vehicle",
        build,
        gemini_stack.previews(
            (
                # the radar on the forward face and the three latch receptacles round its rim (the nose fairing off); the
                # panels; and the battery module alone, with the water tank at its end, from below
                ("radar.png", (0, 0, st(236)), 2.6, dict(azimuth=-30, elevation=40, res=(1300, 1300), hide=("NoseFairing",), lens=50)),
                (
                    "panels.png",
                    (0.4, 0, st(143)),
                    1.25,
                    dict(azimuth=0, elevation=-28, res=(1700, 1100), hide=(*gemini_stack.SKINS, "CrewStation_PressureVessel", "Seat"), lens=40),
                ),
                (
                    "battery-module.png",
                    (-0.6, -0.25, st(54)),
                    2.9,
                    dict(
                        azimuth=203,
                        elevation=-24,
                        res=(1500, 1100),
                        only=("Equipment_Batteries", "Equipment_BatteryModule", "Equipment_WaterTank", "Equipment_ModuleBeams"),
                        lens=50,
                    ),
                ),
            )
        ),
    )
