"""Gemini spacecraft No. 7 on Gemini Launch Vehicle 7, as launched on Gemini-Titan 7 (4 December 1965).

Run headless:
    pnpm model gt-7            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. The stack is ../../../vehicles/gemini_stack.py
(the spacecraft gemini_spacecraft.py, the launch vehicle titan_ii_glv.py); what was this ship's and this vehicle's own
is said here (FIT, VEHICLE, SAYS) and argued in ../spacecraft.md and ../../../vehicles/titan-ii-glv.md.

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
from gemini_stack import TITAN, st  # noqa: E402
from srlib import run  # noqa: E402

# What spacecraft 7 had, against spacecraft 5 before it (../spacecraft.md, "This ship and the others"). "GVII" is the
# Gemini VII mission report, MSC-G-R-66-1, whose section 3.1 and Table 3.1-I list the differences; "GV" the Gemini V one.
FIT = Fit(
    radar=False,  # "Rendezvous radar equipment ... was not required in spacecraft 7" (GVII, 3.1.2.4)
    transponder=True,  # "In its place, an L-band radar transponder, a boost regulator, and a single spiral antenna" (GVII, 3.1.2.4)
    acquisition_lights=True,  # two, "on opposite sides of the equipment adapter section", at its base (GVII, 3.1.1.2 and 3.1.2.4)
    lateral_thrusters=True,  # the OAMS as spacecraft 5's but for the reserve tank (GVII, 3.1.2.7 and Figure 3.1-10)
    oams_reserve_tank=True,  # "A reserve fuel tank was added to the OAMS of spacecraft 7" (GVII, 3.1.2.7 and Figure 3.1-10)
    adapter_batteries=0,  # fuel cells, as spacecraft 5: "essentially the same as the spacecraft 5 system" (GVII, 3.1.2.6)
    fuel_cells=True,  # two sections, a tank each of hydrogen and oxygen (GVII, 3.1.2.6 and Figure 3.1-7)
    hydrogen_insulated=True,  # "Fifty layers of aluminized mylar were added to the outer surface" (GVII, 3.1.2.6.2 and Figure 3.1-8)
    water_tanks=0,
    water_spheres=2,  # tanks A and B, 150 lb each, "as in the spacecraft 5 configuration" (GVII, 3.1.2.3 and Figure 3.1-4)
    retro_water_tank=True,  # tank C: "one 42-pound tank ... in the adapter retrograde section" (GVII, 3.1.2.3 and Figure 3.1-4)
    pod=False,  # "The rendezvous evaluation pod installation was not required" (GVII, Table 3.1-I)
    # MSC-2 and MSC-3, as on spacecraft 4: the spectrometer "mounted in the equipment adapter section", the magnetometer's
    # sensor "on an extendible antenna boom" (GVII, 8.12.2 and 8.13.2). Where in the section is not said: spacecraft 4's places
    experiments=("proton-electron-spectrometer", "magnetometer"),
    names=("Borman", "Lovell"),
    # no crew: both men wore the G5C suit (GVII, 3.1.2.9.2), which is built standing, at the pad (../../../crew/g5c_suit.py),
    # and not seated
    crew=None,
    white_disc=False,  # not known of this ship: it is spacecraft 3's, and not identified
    gmt_clock=True,  # "The time reference system was like the spacecraft 5 system", with a digital clock besides (GVII, 3.1.2.5)
    range_indicator=False,  # "The radar range and range-rate indicator was deleted" (GVII, 3.1.2.9.1)
    # "a digital ground-elapsed-time (g.e.t.) clock in the center instrument panel in place of the flight plan roller" (GVII, 3.1.2.5)
    get_clock=True,
)

# GLV-7: as GLV-6, with flashing lights again, "four lights ... near the center, and spaced 90 degrees apart around the
# circumference" where GLV-4 had two (GVII, 3.2.2.5 and Table 3.2-I)
VEHICLE = dict(skirt_insulation=False, beacons=4)

PHOTOGRAPH = "It is read off a photograph of spacecraft 3 and taken to be the same on this ship."

# What these things say of themselves on this flight: the type's words tell Gemini-Titan 3's story, and the fuel cell
# module's and the experiments' tell Gemini-Titan 5's and 4's.
SAYS = {
    "RR_Face": (
        "Forward face",
        "Where spacecraft 5 and 6 carry the rendezvous radar. This ship was to be found, not to find: in the radar's place it "
        "had an L-band transponder, a regulator to boost its voltage and one spiral antenna, the set an Agena carries, fitted "
        "over a weekend in November 1965 when the Agena Gemini VI was to meet had been lost. A radar calls it and it answers; "
        "from the answer the other ship has its range and bearing. That they were here is documented; the antenna's size "
        "and place on the face are estimated.",
    ),
    "RR_MainParachute": (
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in this section. The ship hangs from it by its nose at first, then is let "
        "down to hang level by two points so that it meets the sea on the edge of its heat shield. It came out at 330 hours 31 "
        "minutes 3 seconds and set the ship down four minutes later. Then it and this section, which had gone with it, "
        "floated a short while and sank before the swimmers reached them. The pack's form here is estimated.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out to steady the ship; lower down the drogue pulls out a pilot parachute, and the "
        "pilot parachute pulls this whole section off the ship, transponder and all, and the main parachute out of it. On "
        "this flight the drogue came out at 330 hours 29 minutes 30 seconds, about when the last of the re-entry "
        "thrusters' propellant ran out, and the ship swung 20 degrees to either side under it. Their forms and places "
        "here are estimated.",
    ),
    "RCS_ThrustChambers": (
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. After fourteen days in the cold they were switched on about three quarters of an "
        "hour before retrofire, and worked. Borman began the entry on one ring and brought in the other when the first could not hold the ship; "
        "between them they used every pound they had. In each cluster one pair fires along the ship's top-to-bottom line, "
        "to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll it. That is why the ports "
        f"are ovals. Which chamber fires which way is SEDR 300's drawing; where the clusters stand is read off a photograph. {PHOTOGRAPH}",
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
        f"to the forward one must run along the outside until they are pulled free. {PHOTOGRAPH}",
    ),
    "Hatches_WindowFrames": (
        "Window",
        "The window is not in the skin. Its outer pane is set at about 35 degrees to the hatch, its aft edge at the skin and "
        "its forward edge sunk, so that it faces forward like a windscreen; and forward of it a trough is cut into the "
        "cone for the pilot to look along. There are three panes of 96 per cent silica glass, one in this outer frame and "
        "two in a frame bolted on inside with 35 bolts; the right-hand window's are optically ground. They were clean on "
        "the pad. At staging the second stage's fire left a yellowish film on them that the crew looked through for two "
        "weeks, the right one worst. To sleep, Borman and Lovell put foil from their food packs between the pane and its "
        "filter: the filter alone kept out neither the light nor the heat. The 35 degrees is SEDR 300's section as drawn; "
        "where the window is and its outline are read off a photograph of spacecraft 3, and taken to be the same on this ship.",
    ),
    "Retro_ForwardThrusters": (
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. This flight never "
        "used them to slow down: all four of its changes of orbit were made with the aft thrusters, the ship turned round "
        "for the one that had to be backward. They earned their place at the end. When the two small thrusters that yaw "
        "the ship to the right failed on the twelfth day, the crew were told to pull every manoeuvring thruster's "
        "breaker but number 12's and yaw with that, which worked, a little too strongly. Their thrust is documented; "
        "where they stand is read off SEDR 300's sketch of the system, and how far they lean forward is estimated.",
    ),
    "Retro_LateralThrusters": (
        "Lateral thrusters",
        "Chambers 13 to 16: four of 100 lbf, pointing out to the sides, up and down through the ship's centre of gravity, to "
        "move it bodily without turning it. They are what a ship flying beside another steers with, and this ship did that "
        "twice: beside its own Titan's second stage in its first quarter of an hour, and beside Gemini VI-A on the eleventh "
        "day, when Borman and Lovell each took a few minutes at it. At 21 minutes 17 seconds one of them was held on for 21 "
        "seconds, 8.8 ft a second, to take the ship away from the stage. Which way each pushes is documented; where they "
        "stand is read off SEDR 300's sketch.",
    ),
    "Retro_Rockets": (
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. They waited "
        "fourteen days. At 329 hours 58 minutes 4 seconds, in the dark over the Pacific, the first of them fired on the "
        "second, and Lovell said that was one big hurdle over with. When the other three fired is not on record: the "
        "ship's recorder had failed five days before and no station could hear it. Going up they have a second use: fired "
        "together, they pull the ship off a failing Titan. Their size is SEDR 300's; where they sit in the section is read "
        "off its figure.",
    ),
    "Equipment_AftThrusters": (
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. Every change this ship made to its orbit "
        "was made with them. Two seconds to push clear of the Titan, a few more to come back to it. At 3 hours 47 minutes "
        "59 seconds, 76 seconds to raise the low point of the orbit, the ship lined up on the star Spica because its "
        "platform was switched off; at 69 hours 43 minutes, 16.5 seconds lined up on Arcturus; and on the fifth day two "
        "burns, forward and then backward, that left it in a circle 161 nautical miles up for Gemini VI-A to come to. "
        "SEDR 300's sketch puts one at the top of the foot and one at the bottom; there they lean outward, and here they "
        "fire straight aft.",
    ),
    "Equipment_AttitudeThrusters": (
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. In each cluster one fires along the ship's "
        "top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll it. The "
        "ship's water boiler vented to one side and kept turning it to the left, so numbers 3 and 4, which yaw it to the "
        "right, worked harder than the rest. On the twelfth day, at 283 hours 28 minutes, the crew woke to find they would "
        "not stop the turn: fired, they gave a quarter of their push and a little glow, or nothing but a puff of unburnt "
        "propellant. The rest held out to the end. Their number, thrust and which way each fires are documented; where "
        "the clusters stand round the foot is read off SEDR 300's sketch.",
    ),
    "Equipment_Cover": (
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of glass "
        "fibre with gold deposited on it is stretched across the opening. When Gemini VI-A came up behind this ship its crew "
        "saw cords and strips trailing from round this end: what was left of the holder of the charge that had cut the "
        "ship from its Titan. Their photograph shows the cover too: gathered in from the rim to a hoop, like the inside of a "
        "funnel, with a flat disc in the middle, an opening in the disc that an instrument looks out of, and the two aft-firing "
        "thrusters standing through the cloth at the rim. That it was there and what it was made of are documented; its form is "
        "measured on that photograph, good to two or three inches. A raised oblong under the cloth beside the lower thruster, "
        "in the same photograph, is not identified and not built.",
    ),
    "Equipment_OamsTanks": (
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: a fuel tank, an oxidiser tank and a ball of helium to push them, feeding "
        "sixteen thrust chambers round the adapter. This ship went up with 247.5 lb of oxidiser and 180.9 lb of fuel, 340 lb "
        "of it usable, and came home with almost none: by the eighth day it was drifting to save what was left for the "
        "rendezvous. The tanks are 21.13 in, 21.12 in and 16.20 in across, which is McDonnell's manual for this ship; it "
        "gives each propellant tank 5,355 cubic inches, and that with the reserve tank beside them is room for what was "
        "loaded. McDonnell's drawings have the two propellant tanks in the middle of a row of four on one module, with a "
        "drinking water tank at each end; where the helium is is estimated.",
    ),
    "Equipment_PrimaryOxygen": (
        "Primary oxygen",
        "The oxygen the crew breathe in orbit, in a tank of its own: 109 lb of it at launch, a third of it left after fourteen "
        "days. On this ship a pipe joins it to the fuel cells' oxygen tank, so that either can lend to the other if a "
        "heater fails, as one had on the flight before. It lent in the first half hour: 17.5 seconds with the valve open, "
        "a third of a pound across. When this section is cut away before retrofire the crew go on to a smaller supply in "
        "the re-entry module. McDonnell's drawing puts it under its own panel of the blast shield, at one end of the space "
        "between the two beams; its size is estimated.",
    ),
    "Equipment_FuelCells": (
        "Fuel cell sections",
        "Two sealed cans, each holding three stacks of 32 cells. In each cell hydrogen and oxygen meet across a sheet of "
        "plastic that lets only the hydrogen's nuclei through; the electrons have to go round by the wire, and that is the "
        "ship's power. What comes out the other side is water. They ran for fourteen days, which was what they had been "
        "built for and had not yet done. The first section had its lapses and kept going. The second could not "
        "get rid of its water: its warning lamp burned for most of the flight, its output sagged and was coaxed back four "
        "times by purging it and resting it, and at 286 hours 57 minutes two of its three stacks were taken off the line. "
        "Four stacks out of six carried the ship to retrofire. That there are two sections of three stacks is documented; "
        "their size is scaled from McDonnell's sketch of spacecraft 5's; his drawing of this ship's module has them at one end "
        "of it, beyond the beam, with the two tanks beside them.",
    ),
    "Equipment_RssHydrogen": (
        "Fuel cell hydrogen tank",
        "Hydrogen for the fuel cells, 23.58 lb of it at launch, kept so cold and so squeezed that it is neither liquid nor "
        "gas. On the flight before, heat leaked in, the hydrogen had to be vented, and the venting turned the ship. So "
        "this tank was wrapped in fifty layers of aluminised film, hung on mounts that carry little heat, and its outlet "
        "pipe was led round it to cool it; a small charge could cut open the tube its vacuum jacket had been pumped out "
        "through, to let the jacket empty into space. It did not vent once in fourteen days, and 8.55 lb was left at the "
        "end. Its load and what was done to it are documented; the tank's size is worked from the load, with a guess at the "
        "insulation; it is the middle one of the module's row, as McDonnell's drawing has it.",
    ),
    "Equipment_RssOxygen": (
        "Fuel cell oxygen tank",
        "Oxygen for the fuel cells: 181.8 lb at launch. On the flight before, this tank's heater failed in the first half "
        "hour, its pressure collapsed and the flight was nearly ended. On this one the heater was left off for the climb, "
        "the pressure sagged from 230 lb to the square inch to about 140, and at 25 minutes the crew opened a new valve "
        "for 17.5 seconds and let a third of a pound of their own breathing oxygen in: 417 lb to the square inch. After "
        "that the heater kept it. At 171 hours the gauge stuck at 910 and stayed there; the heater could still be seen "
        "switching by what it drew. 60.95 lb was left at the end. Its load and pressures are documented; the tank's size "
        "is worked from the load, with a guess at the insulation; it is at the end of the module's row, as McDonnell's drawing has it.",
    ),
    "Equipment_WaterTanks": (
        "Drinking water tanks",
        "Two tanks of the manoeuvring system's own pattern, each able to hold 150 lb of water behind a diaphragm. Tank B went "
        "up with 149 lb of drinking water. Tank A went up holding only nitrogen at 19 lb to the square inch, and took the "
        "water the fuel cells made; that water also went in behind tank B's diaphragm and pushed the drinking water out. "
        "Late in the flight Houston thought the fuel cells' warning lamps had to do with both men drawing water for "
        "breakfast at once, and asked them to take turns. A third, smaller tank is in the retrograde section. That "
        "there were two here, and what each carried, are documented; their pattern is spacecraft 5's; McDonnell's drawing has "
        "them at the two ends of the manoeuvring system's row of tanks.",
    ),
    "Experiment_Spectrometer": (
        "Proton-electron spectrometer",
        "Experiment MSC-2, flown before on Gemini IV: a counter for the protons and electrons of the inner radiation belt, "
        "which dips to the ship's height over the South Atlantic. It is in this section, the report says, with a clear "
        "view of what comes at it, behind a window of thin film. The pilot switched it on for each pass through the "
        "anomaly; after the ship's recorder failed it was left on, so that whatever a station could hear "
        "would not be lost. Its electron counts were good and its proton counts erratic. That it was in this section is "
        "documented; where in it, and its form, are taken from Gemini IV's and estimated. A photograph Gemini VI-A's "
        "crew took of this ship from behind shows an instrument looking out of the middle of the cover, which is "
        "where this one is put.",
    ),
    "Experiment_Magnetometer": (
        "Magnetometer boom",
        "Experiment MSC-3, flown before on Gemini IV: three flux-gate sensors on the end of a boom, to find which way the "
        "Earth's magnetic field ran past the ship while the spectrometer counted, since particles in the belt spiral along "
        "the field. It was run out when the ship reached orbit and left out for the fourteen days; one of its three axes "
        "had stopped answering before the launch. In the photographs Gemini VI-A took, a cord from the charge that cut "
        "the ship from its Titan is caught round it, and the boom is seen run out from the middle of the gold cover, beside the "
        "spectrometer, which is where it is stowed here. The boom is documented; its form is estimated.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The panels are drawn from McDonnell's drawing of spacecraft 3's, with the clock that spacecraft 4 added on the "
        "command pilot's side and without the radar's range indicator, which this ship, having no radar, did not have. "
        "Before the command pilot: the ball that shows which way the ship points, the accelerometer and the abort lamp "
        "above it, the Titan's tank pressures, the event timer, and the counters that say how much speed is still to be "
        "added. Before the pilot: a second ball, his clock, the computer's readout and its keyboard. On the centre panel, "
        "where the flight plan used to wind past on a roller, is a clock that counts the flight's hours, minutes and "
        "seconds in figures, to 999 hours: on a flight this long nobody wanted to work elapsed time out from Greenwich. "
        "Its place is documented and its form is estimated. What else this ship changed is not drawn: a monitor for the "
        "fuel cells where the ammeter was; and switches renamed for what this ship carried in place of what the last "
        "one had, the oxygen crossfeed, the reserve fuel tank, the magnetometer's boom. The instruments' graduations "
        "are estimated.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners "
        "between, the hatches for its roof. Two men lived in it for 330 hours and 35 minutes without opening it. With the "
        "suits off it was a better place: the air was less dry, noses cleared, and the hose a suit no longer needed did "
        "for a vacuum cleaner. One morning, the ship having tumbled while they slept, they woke to find its walls at 66 "
        "degrees Fahrenheit, 20 below the usual. No drawing read gives its dimensions. Its form is McDonnell's figures': "
        "flat sides leaning in toward a narrow floor. Its sizes are those fitted round the crew of spacecraft 3, which "
        "was built to the same drawings.",
    ),
    "SeatCommandPilot_Frame": (
        "Ejection seat",
        "Borman's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the "
        "way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows "
        "both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° forward so "
        "that the two do not meet. Nobody ever had to. For most of this flight the seat had another use: the suit its man "
        "was not wearing was folded double and wedged behind it, visor and boots between the seat and the hatch. Its form "
        "is the two seats the Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: the G5C suit both men wore "
        "is built standing, at the pad, and not seated.",
    ),
    "SeatPilot_Frame": (
        "Ejection seat",
        "Lovell's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the "
        "way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows "
        "both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° forward so "
        "that the two do not meet. Lovell sat in it without a pressure suit from the 45th hour; he said "
        "afterwards that a man without legs would have suited the ship perfectly, there being nothing for them to do. Its "
        "form is the two seats the Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: the G5C suit both men "
        "wore is built standing, at the pad, and not seated.",
    ),
    # the launch vehicle
    "Stage2_Beacons": (
        "Flashing beacon",
        "One of four flashing lights of the kind made for the Agena's docking adapter, a quarter of the way round the stage "
        "from one another, so that from any side one could be seen. The first thing this crew did in orbit was turn round "
        "and fly beside the stage that had put them there, for about a quarter of an hour, 60 to 150 ft off: practice for "
        "keeping station on another ship. It was venting fuel and tumbling, and they kept clear. Gemini IV's vehicle "
        "had carried two such lights and no other had any. That there were four, 90 degrees apart near the middle of the "
        "stage, is documented; which sides they were on, their station and their form are estimated.",
    ),
    "Interstage_ExhaustPorts": (
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. On this flight the engine was "
        "signalled at 155.61 seconds and the stages had begun to part by 156.25; the crew saw their ship fly through a ring "
        "in an orange flame. Their number and size are counted off the photographs of GLV-3.",
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
        "each fuel line a small piston accumulator. On the flight before, the standpipes were charged wrongly and the crew "
        "were shaken at 0.38 g. On this one they did their work: the most the vehicle shook was about 0.13 g, for three "
        "seconds, 133 seconds up, and only one of the two men noticed. That the standpipes were there is documented; "
        "their form and place here are not.",
    ),
}


def build() -> str:
    return gemini_stack.build(FIT, SAYS, **VEHICLE)


if __name__ == "__main__":
    run(
        "gt-7 vehicle",
        build,
        gemini_stack.previews(
            (
                # the transponder's antenna on the forward face (the nose fairing off); tank C among the retrograde rockets,
                # from forward with the re-entry module and the section's skin off; the foot of the adapter from below with
                # the Titan off, an acquisition light on either hand; the two near beacons on the second stage; and the panels
                ("transponder.png", (0, 0, st(236)), 2.6, dict(azimuth=-30, elevation=40, res=(1300, 1300), hide=("NoseFairing",), lens=50)),
                (
                    "tank-c.png",
                    (0.3, 0.2, st(86)),
                    4.4,
                    dict(
                        azimuth=204,
                        elevation=50,
                        res=(1400, 1300),
                        only=("Retro_",),
                        hide=("Retro_Skin", "Retro_Foil", "Retro_SeparationBand"),
                        lens=50,
                    ),
                ),
                ("foot.png", (0, 0, st(16)), 6.5, dict(azimuth=-70, elevation=-62, res=(1400, 1400), hide=TITAN, lens=50)),
                ("beacons.png", (0, 0, gemini_stack.station(366)), 7.0, dict(azimuth=-45, elevation=6, res=(1400, 1100), lens=50)),
                (
                    "panels.png",
                    (0.4, 0, st(143)),
                    1.25,
                    dict(azimuth=0, elevation=-28, res=(1700, 1100), hide=(*gemini_stack.SKINS, "CrewStation_PressureVessel", "Seat"), lens=40),
                ),
            )
        ),
    )
