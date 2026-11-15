"""Gemini spacecraft No. 4 on Gemini Launch Vehicle 4, as launched on Gemini-Titan 4 (3 June 1965).

Run headless:
    pnpm model gt-4            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. The stack is ../../../vehicles/gemini_stack.py
(the spacecraft gemini_spacecraft.py, the launch vehicle titan_ii_glv.py); what was this ship's and this vehicle's own
is said here (FIT, VEHICLE, SAYS) and argued in ../spacecraft.md and ../../../vehicles/titan-ii-glv.md.

Top-level nodes (the viewer's part list keys on these names):
    NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation  HeatShield
    RetroSection  EquipmentSection  ExtravehicularEquipment
and, from the launch vehicle:
    TitanStage2  TitanStage2Engine  TitanInterstage  TitanStage1  TitanStage1Engine
The pilot's hatch is a node of its own inside Hatches, HatchRight, with its origin on its hinge: the flight swings it.
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
from gemini_stack import PANES, SKINS, st  # noqa: E402
from srlib import run  # noqa: E402

# What spacecraft 4 had, against spacecraft 3 before it and spacecraft 5 after (../spacecraft.md, "This ship and the
# others"). "GIV" is the Gemini IV mission report, MSC-G-R-65-3.
FIT = Fit(
    radar=False,  # the rendezvous radar came with spacecraft 5 (Gemini V mission report, 3.1): the Titan was kept station on by eye
    lateral_thrusters=True,  # "The lateral thrusting OAMS TCA's were operational" (GIV, Table 3-I)
    adapter_batteries=6,  # "six silver-zinc batteries" where spacecraft 3 had three (GIV, 3.1.2.6 and Figure 3-11)
    water_tanks=4,  # "four water-storage tanks ... instead of the one flown on GT-3" (GIV, 3.1.2.3 and Figure 3-6)
    experiments=("proton-electron-spectrometer", "magnetometer"),  # MSC-2 and MSC-3, in the adapter (GIV, 8.4 and 8.5)
    names=("McDivitt", "White"),
    # no crew: both men wore the G4C suit (GIV, 3.1.2.9.2), which is not modelled, and a G3C would be the wrong suit
    crew=None,
    white_disc=False,  # not known of this ship: it is spacecraft 3's, and not identified
    gmt_clock=True,  # "A G.m.t. clock was added to the command pilot's instrument panel" (GIV, Table 3-I; Figure 3-14)
    right_hatch_opens=True,  # the pilot's hatch was opened in orbit: out at about 4:23, shut again by 5:06 (GIV, 4.1)
    eva=True,  # the umbilical and the hand-held manoeuvring unit (GIV, 3.1.2.3.1 and 3.1.2.3.3)
)

# GLV-4: no insulation on the second stage's forward skirt, and the two flashing lights for the station keeping (GIV,
# 3.2.1.2 and 5.2.6; ../../../vehicles/titan-ii-glv.md, "One vehicle from the next")
VEHICLE = dict(skirt_insulation=False, beacons=True)

PHOTOGRAPH = "It is read off a photograph of spacecraft 3 and taken to be the same on this ship."

# What these things say of themselves on this flight: the type's words tell Gemini-Titan 3's story.
SAYS = {
    "RR_Face": (
        "Forward face",
        "Where a ship going to meet another carries its rendezvous radar. This ship had something to chase, its own Titan's "
        "second stage, and no radar to chase it with: the radar came with the next spacecraft. McDivitt had his eyes, two "
        "flashing lights on the stage, and thrusters, and found that thrusting toward a thing in orbit does not bring you "
        "to it. The face is closed here by the flat ribbed cover spacecraft 3 was photographed with; what this ship had "
        "there has not been found.",
    ),
    "RR_MainParachute": (
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in this section. The ship hangs from it by its nose at first, then is let "
        "down to hang level by two points so that it meets the sea on the edge of its heat shield. On the flight before, that "
        "drop had thrown both men at their windows; McDivitt and White braced for it. It came out at 97 hours 52 minutes "
        "11 seconds. The pack's form here is estimated.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out at 50,000 ft to steady the ship; at 10,600 ft the drogue pulls out a pilot "
        "parachute, and the pilot parachute pulls this whole section off the ship and the main parachute out of it. "
        "This ship's mortar had an aluminium breech where the last had a steel one. With its computer dead the ship came "
        "down spinning slowly, on purpose, to average out its lift, and the drogue came out at 97 hours 50 minutes 53 "
        "seconds. Their forms and places here are estimated.",
    ),
    "RCS_ThrustChambers": (
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. None of them points straight out. In each cluster one pair fires along the "
        "ship's top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll "
        "it. That is why the ports are ovals. Which chamber fires which way is SEDR 300's drawing; where the clusters "
        f"stand is read off a photograph. {PHOTOGRAPH}",
    ),
    "RCS_CableCover": (
        "Parachute cable cover",
        "The white strip along the top of the ship, running from near the heat shield up over this section. SEDR 300 lists "
        f"a cover over the parachute's control cables here, and that is what it is taken to be. {PHOTOGRAPH}",
    ),
    "Cabin_CableCover": (
        "Parachute cable cover",
        "The white strip along the top of the ship, between the hatches. SEDR 300 lists a cover over the parachute's control "
        "cables here, and that is what it is taken to be: the ship comes down hanging level from two points, and the lines "
        "to the forward one must run along the outside until they are pulled free. It was beside this strip that White "
        f"stood in the open hatch. {PHOTOGRAPH}",
    ),
    "Hatches_WindowFrames": (
        "Window",
        "The window is not in the skin. Its outer pane is set at about 35 degrees to the hatch, its aft edge at the skin and "
        "its forward edge sunk, so that it faces forward like a windscreen; and forward of it a trough is cut into the "
        "cone for the pilot to look along. There are three panes of 96 per cent silica glass, one in this outer frame and "
        "two in a frame bolted on inside with 35 bolts. Through this one McDivitt photographed White outside, and wanted "
        "him to come across and be seen; White found the gun's gas gone before he got there. The 35 degrees is SEDR 300's "
        "section as drawn; where the window is and its outline are read off a photograph of spacecraft 3, and taken to be "
        "the same on this ship.",
    ),
    "HatchRight_WindowFrames": (
        "Window",
        "The pilot's window: three panes of 96 per cent silica glass, these ones optically ground, the outer set at about "
        "35 degrees to the hatch so that it faces forward. The 35 degrees is SEDR 300's section as drawn; where the window "
        "is and its outline are read off a photograph of spacecraft 3, and taken to be the same on this ship.",
    ),
    "HatchRight_Latches": (
        "Hatch latches",
        "Twelve latches hold the hatch down on its sill, all worked together by one handle inside through a ratchet. On this "
        "flight they gave trouble both ways. A spring that returns the ratchet's pawl stuck, as it had on two ships on the "
        "ground before: the hatch would not unlatch until it had been worked at, and when White was back in his seat the "
        "handle swung free and would not draw the latches home. McDivitt pulled White down by the legs to give him "
        "something to push against, and it caught. They did not open it a second time to throw the equipment out, as "
        "the plan had been. Their number is SEDR 300's; where each is, and its form, are estimated.",
    ),
    "Retro_ForwardThrusters": (
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. In the first orbit "
        "McDivitt used them, with the rest, in 74 separate burns trying to close on the Titan's second stage; the stage fell "
        "away below and ahead all the same. Their thrust is documented; where they stand is read off SEDR 300's sketch of "
        "the system, and how far they lean forward is estimated.",
    ),
    "Retro_LateralThrusters": (
        "Lateral thrusters",
        "Chambers 13 to 16: four of 100 lbf, pointing out to the sides, up and down through the ship's centre of gravity, to "
        "move it bodily without turning it. On spacecraft 3 they were dummies; these were the first real ones, and "
        "McDivitt used them within minutes of reaching orbit, trying to stay beside the Titan's second stage. From this "
        "ship on the chambers were of a longer-lived kind, cooled by a layer of fuel along the wall. Which way each "
        "pushes is documented; where they stand is read off SEDR 300's sketch.",
    ),
    "Retro_Rockets": (
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 97 hours 40 "
        "minutes 1 second they brought Gemini 4 down, a second early. Going up they have a second use: fired together, they "
        "pull the ship off a failing Titan. Their size is SEDR 300's; where they sit in the section is read off its figure.",
    ),
    "Equipment_AftThrusters": (
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. When the Titan's engine had stopped and a "
        "charge had cut the ship free, McDivitt held these on for five seconds to push it clear. At 97 hours 28 minutes "
        "he used them again, for 2 minutes 41 seconds, to bring the low point of the orbit down into the air before the "
        "retrograde rockets were fired. SEDR 300's sketch puts one at the top of the foot and one at the bottom; there they "
        "lean outward, and here they fire straight aft.",
    ),
    "Equipment_Cover": (
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of glass "
        "fibre with gold deposited on it is stretched across the opening. It is gathered in from the rim to a hoop, like the "
        "inside of a funnel, with a flat disc in the middle, and the two aft-firing thrusters stand through it at the rim. This "
        "ship's has an opening in the middle for the spectrometer to look out of and the magnetometer's boom to run out "
        "through. That it was there and what it was made of are documented; its form is measured on a photograph of Gemini 7 "
        "from behind, good to two or three inches, and taken to be the same on this ship.",
    ),
    "Equipment_OamsTanks": (
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: a fuel tank 21.13 in across, an oxidiser tank 21.12 in across and a ball "
        "of helium 16.20 in across to push them, feeding sixteen thrust chambers round the adapter: 410 lb of propellant "
        "aboard at launch. In the first eighty "
        "minutes of this flight 115 lb of it went on the chase after the Titan's second stage, which was most of what had "
        "been allowed for that; the chase was called off and the ship drifted for the next two and a half days to save "
        "the rest. The sizes are SEDR 300's. McDonnell's drawings have the propellant tanks side by side on one module, against "
        "the wall toward the ship's top and a little to the crew's right; where along that module each stands, and where the "
        "helium is, are estimated.",
    ),
    "Equipment_PrimaryOxygen": (
        "Primary oxygen",
        "The oxygen the crew breathe in orbit: 52 lb of it for four days, where the three-orbit flight before had carried "
        "15. White's umbilical drew on it too, at 9 lb an hour while he was outside. When this section is cut away before "
        "retrofire the crew go on to a smaller supply in the re-entry module. McDonnell's drawing puts it under its own panel "
        "of the blast shield, at one end of the space between the two beams; its size is estimated.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The panels are drawn from McDonnell's drawing of spacecraft 3's, with the one change of this ship's that shows "
        "most: the clock on the command pilot's side, beside the rate of descent, where spacecraft 3 had a blank. It keeps "
        "Greenwich time. Before the command pilot besides: the ball that shows which way the ship points, the "
        "accelerometer and the abort lamp above it, the Titan's tank pressures, the event timer, the counters that say how "
        "much speed is still to be added. Before the pilot: a second ball, his clock, the computer's readout and its "
        "keyboard. That computer failed on the fourth day and would not switch off, and the ship came home without it. "
        "What else this ship changed is not drawn: switches moved between the pedestal, the overhead panel and the "
        "pilot's panel, and the fuel cell's switches fitted and not connected. The instruments' graduations are estimated.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners "
        "between, the hatches for its roof. For most of an hour on this flight it held no air at all: both men were in "
        "their suits, the pilot's hatch stood open, and the cabin was part of space until it was pumped up again at 5 "
        "hours 6 minutes. No drawing read gives its dimensions. Its form is McDonnell's figures': flat sides leaning in "
        "toward a narrow floor. Its sizes are those fitted round the crew of spacecraft 3, which was built to the same "
        "drawings.",
    ),
    "SeatCommandPilot_Frame": (
        "Ejection seat",
        "McDivitt's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the "
        "way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows "
        "both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° forward so "
        "that the two do not meet. Nobody ever had to. This ship's seats had a safety pin added to the ring, and a flatter "
        "survival kit under the man to give him more room. Its form is the two seats the Smithsonian holds, 22 in wide and "
        "54 in tall. The seat is empty: the G4C suit both men wore is not modelled.",
    ),
    "SeatPilot_Frame": (
        "Ejection seat",
        "White's seat, which he left at about 4 hours 23 minutes and began to get back into at 4 hours 46. Gemini has no escape "
        "tower: for the first fifteen thousand feet and again under a failed parachute the way out is this, an ejection "
        "seat on a rocket catapult. Pulling the ring between the knees blows both hatches open and fires both seats up "
        "their rails on the bulkhead, which are canted 12° apart and 8° forward so that the two do not meet. Its form is "
        "the two seats the Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: the G4C suit both men wore is "
        "not modelled.",
    ),
    # the launch vehicle
    "Interstage_ExhaustPorts": (
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. On this flight the engine was "
        "signalled at 152.43 seconds and the stages had begun to part by 153.14. Their number and size are counted off the "
        "photographs of GLV-3.",
    ),
    "Stage1_OxidiserFeedConduit": (
        "Oxidiser feed line",
        "The oxidiser tank is above the fuel tank, and its feed line goes straight down through the fuel inside a conduit of "
        "its own. On the vehicle before, that conduit's joints round it were lapped; on this one they were butt-welded. "
        "Documented that it was so; its size is estimated.",
    ),
    "Stage1Engine_PogoSuppressors": (
        "Standpipe and accumulator",
        "The missile shook along its length for half a minute of first stage flight: the thrust, the propellant in the feed "
        "lines and the stretch of the vehicle fed one another. A warhead did not mind; a crew reading instruments would. So "
        "each oxidiser line has a standpipe, a closed tube with a bubble of gas at its top for the liquid to bounce on, and "
        "each fuel line a small piston accumulator. This was the first vehicle whose standpipes could be charged from the "
        "blockhouse; the fuel tank's aft skirt was changed to let the lines in, and the accumulators were given a heat "
        "shield. That they were there is documented; their form and place here are not.",
    ),
}


def build() -> str:
    return gemini_stack.build(FIT, SAYS, **VEHICLE)


if __name__ == "__main__":
    run(
        "gt-4 vehicle",
        build,
        gemini_stack.previews(
            (
                # the pilot's hatch from outside, and the extravehicular equipment where it is drawn, between the seats' heads
                ("hatch-right.png", (0.5, 0.35, st(128)), 4.2, dict(azimuth=35, elevation=25, res=(1300, 1300))),
                ("eva-equipment.png", (0.75, 0, st(114)), 1.3, dict(azimuth=0, elevation=70, res=(1400, 1400), hide=SKINS, lens=40)),
                ("eva-equipment-side.png", (0.75, 0, st(114)), 1.6, dict(azimuth=-90, elevation=10, res=(1400, 1400), hide=SKINS, lens=40)),
                # from the command pilot's seat, ahead: his panel, with the clock this ship added
                (
                    "seat-left-ahead.png",
                    (0, 0, 0),
                    0,
                    dict(seat="Seat_CommandPilot", look=(0, -8), lens=18, lamps="Lamp_", res=(1600, 1000), hide=PANES),
                ),
            )
        ),
    )
