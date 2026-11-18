"""Gemini spacecraft No. 5 on Gemini Launch Vehicle 5, as launched on Gemini-Titan 5 (21 August 1965).

Run headless:
    pnpm model gt-5            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. The stack is ../../../vehicles/gemini_stack.py
(the spacecraft gemini_spacecraft.py, the launch vehicle titan_ii_glv.py); what was this ship's and this vehicle's own
is said here (FIT, VEHICLE, SAYS) and argued in ../spacecraft.md and ../../../vehicles/titan-ii-glv.md.

Top-level nodes (the viewer's part list keys on these names):
    NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation  HeatShield
    RetroSection  EquipmentSection  RadarEvaluationPod
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
sys.path.insert(0, os.path.join(_root, "missions", "usa", "gemini", "crew"))
import g3c_suit  # noqa: E402
import g4c_suit  # noqa: E402
import gemini_stack  # noqa: E402
from gemini_spacecraft import POD_AT, POD_COVER_Z, Fit  # noqa: E402
from gemini_stack import OPEN, TITAN, st  # noqa: E402
from srlib import run  # noqa: E402

# What spacecraft 5 had, against spacecraft 4 before it (../spacecraft.md, "This ship and the others"). "GV" is the
# Gemini V mission report, MSC-G-R-65-4; "GIV" the Gemini IV one, MSC-G-R-65-3.
FIT = Fit(
    radar=True,  # "The rendezvous radar was mounted on the forward face of the rendezvous and recovery section" (GV, 3.1.2.4.2)
    lateral_thrusters=True,  # as spacecraft 4: "The propulsion system was the same" (GV, 3.1.2.7)
    adapter_batteries=0,  # "the adapter battery module used on spacecraft 4 was replaced by a ... fuel cell module" (GV, 3.1.2.6)
    fuel_cells=True,  # two sections of three stacks, and a tank each of hydrogen and oxygen (GV, 3.1.2.6 and Figure 3.1-5)
    water_tanks=0,  # spacecraft 4's four small tanks gave way to
    water_spheres=2,  # "two tanks ... the same configuration as the ... OAMS propellant tank" (GV, 3.1.2.3 and Figure 3.1-3)
    pod=True,  # the rendezvous evaluation pod, in the equipment section under a silvered cover (GV, 3.1.2.4.2 and Figure 3.1-4)
    experiments=("electrostatic-charge",),
    docking_light=True,  # Gemini V report, 3.1.2.9.1(g); position assumed from the Technical Summary, p.327
    names=("Cooper", "Conrad"),
    crew=g3c_suit.flight_crew(g4c_suit.COOPER, g4c_suit.CONRAD),
    white_disc=False,  # not known of this ship: it is spacecraft 3's, and not identified
    gmt_clock=True,  # as spacecraft 4: "The time reference system was the same" (GV, 3.1.2.5; GIV, Table 3-I)
)

# GLV-5: as GLV-4, without the flashing lights that vehicle carried for its station keeping (GV, 3.2.2.5)
VEHICLE = dict(skirt_insulation=False)

PHOTOGRAPH = "It is read off a photograph of spacecraft 3 and taken to be the same on this ship."

# What these things say of themselves on this flight: the type's words tell Gemini-Titan 3's story.
SAYS = {
    "RR_MainParachute": (
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in this section. The ship hangs from it by its nose at first, then is let "
        "down to hang level by two points so that it meets the sea on the edge of its heat shield. It came out at 190 hours 51 "
        "minutes 16 seconds, at 10,600 ft, opened reefed and then full, and set the ship down softly four minutes later. "
        "The pack's form here is estimated.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out to steady the ship; at 10,600 ft the drogue pulls out a pilot parachute, and the "
        "pilot parachute pulls this whole section off the ship, radar and all, and the main parachute out of it. On this "
        "flight the drogue came out at 69,000 ft, at 190 hours 49 minutes 19 seconds. Their forms and places here are "
        "estimated.",
    ),
    "RCS_ThrustChambers": (
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. On this flight they were wanted early: by the eighth day the adapter's thrusters "
        "were failing one after another, and Cooper lined the ship up for retrofire on one ring of these. In each cluster "
        "one pair fires along the ship's top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in "
        "opposite corners they roll it. That is why the ports are ovals. Which chamber fires which way is SEDR 300's "
        f"drawing; where the clusters stand is read off a photograph. {PHOTOGRAPH}",
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
        "two in a frame bolted on inside with 35 bolts; the right-hand window's are optically ground. While the ship "
        "drifted and tumbled to save power, Cooper covered them: the stars going round were hard to live with. The 35 "
        "degrees is SEDR 300's section as drawn; where the window is and its outline are read off a photograph of "
        "spacecraft 3, and taken to be the same on this ship.",
    ),
    "Retro_ForwardThrusters": (
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. On the third day, "
        "when the orbit was changed four times in a rehearsal of the next flight's rendezvous, they were kept out of it: "
        "the fuel cells' oxygen was then part liquid and part gas, and it was thought that a long push in that direction "
        "would let gas be drawn off and drop the pressure again. The ship was turned round and the aft thrusters used. "
        "Their thrust is documented; where they stand is read off SEDR 300's sketch of the system, and how far they "
        "lean forward is estimated.",
    ),
    "Retro_LateralThrusters": (
        "Lateral thrusters",
        "Chambers 13 to 16: four of 100 lbf, pointing out to the sides, up and down through the ship's centre of gravity, to "
        "move it bodily without turning it. They are what a ship closing on a target steers its last few hundred feet "
        "with. This ship never got that close to anything: in the whole flight they fired for about five seconds. Which "
        "way each pushes is documented; where they stand is read off SEDR 300's sketch.",
    ),
    "Retro_Rockets": (
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 190 hours 27 "
        "minutes 43 seconds, in the dark, the first of them began to bring Gemini 5 down. Going up they "
        "have a second use: fired together, they pull the ship off a failing Titan. Their size is SEDR 300's; where they "
        "sit in the section is read off its figure.",
    ),
    "Equipment_AftThrusters": (
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. When the Titan's engine had stopped and a "
        "charge had cut the ship free, Cooper used them to push it clear, 7.6 ft a second. At 56 minutes they raised the "
        "low point of the orbit, and on the third day they did all four burns of a rendezvous with an Agena that was not "
        "there. SEDR 300's sketch puts one at the top of the foot and one at the bottom; there they lean outward, and here "
        "they fire straight aft.",
    ),
    "Equipment_AttitudeThrusters": (
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. In each cluster one fires along the ship's "
        "top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll it. On the "
        "fifth day the system turned sluggish and chamber 7 stopped working; chamber 8 followed, and the rest grew "
        "uneven. From then on the ship mostly drifted. Their number, thrust and which way each fires are documented; "
        "where the clusters stand round the foot is read off SEDR 300's sketch.",
    ),
    "Equipment_Cover": (
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of glass "
        "fibre with gold deposited on it is stretched across the opening. It is gathered in from the rim to a hoop, like the "
        "inside of a funnel, with a flat disc in the middle, and the two aft-firing thrusters stand through it at the rim. On "
        "this ship the middle is cut away for the pod's own silvered cover, which went when the pod did. That it was there and "
        "what it was made of are documented; its form is measured on a photograph of Gemini 7 from behind, good to two or three "
        "inches, and taken to be the same on this ship; how it was cut round the pod's cover is not in anything read.",
    ),
    "Equipment_OamsTanks": (
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: a fuel tank, an oxidiser tank and a ball of helium to push them, feeding "
        "sixteen thrust chambers round the adapter. This flight used 289 lb of propellant in eight days. The tanks are "
        "21.13 in, 21.12 in and 16.20 in across: McDonnell's manual for the rendezvous ships gives this one a single tank of "
        "each, of the early ships' size, where the next ship had two. His drawings have the two propellant tanks in the middle "
        "of a row of four on one module, with a drinking water tank at each end; where the helium is is estimated.",
    ),
    "Equipment_PrimaryOxygen": (
        "Primary oxygen",
        "The oxygen the crew breathe in orbit, in a tank of its own: it is not the fuel cells' oxygen, and the trouble with "
        "that tank never touched this one. When this section is cut away before retrofire the crew go on to a smaller "
        "supply in the re-entry module. McDonnell's drawing puts it under its own panel of the blast shield, at one end of the "
        "space between the two beams; its size is estimated.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The panels are drawn from McDonnell's drawing of spacecraft 3's, with the clock that spacecraft 4 added on the "
        "command pilot's side. Before the command pilot besides: the ball that shows which way the ship points, the "
        "accelerometer and the abort lamp above it, the Titan's tank pressures, the event timer, the counters that say how "
        "much speed is still to be added, and the range and range rate of whatever the radar has found, which on this "
        "flight worked for the first time. Before the pilot: a second ball, his clock, the computer's readout and its "
        "keyboard, and the six lamps of the fuel cells' stacks. What this ship changed is not drawn: a monitor for the "
        "fuel cells where the ammeter was, a panel of warning lamps, a second manoeuvre controller on the right-hand "
        "wall for the pilot, and the switch that threw out the pod. The instruments' graduations are estimated.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners "
        "between, the hatches for its roof. Two men lived in it for a week and a day, which nobody had done in anything "
        "like it; drifting with the power down it got cold enough that they shivered. No drawing read gives its "
        "dimensions. Its form is McDonnell's figures': flat sides leaning in toward a narrow floor. Its sizes are those "
        "fitted round the crew of spacecraft 3, which was built to the same drawings.",
    ),
    "SeatCommandPilot_Frame": (
        "Ejection seat",
        "Cooper's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the "
        "way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows "
        "both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° forward so "
        "that the two do not meet. Nobody ever had to. Its form is the two seats the Smithsonian holds, 22 in wide and 54 "
        "in tall. The seat carries its pilot "
        "in his G4C suit.",
    ),
    "SeatPilot_Frame": (
        "Ejection seat",
        "Conrad's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the "
        "way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows "
        "both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° forward so "
        "that the two do not meet. Its form is the two seats the Smithsonian holds, 22 in wide and 54 in tall. The seat carries its pilot "
        "in his G4C suit.",
    ),
    # the launch vehicle
    "Interstage_ExhaustPorts": (
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. On this flight the engine was "
        "signalled at 153.55 seconds and the stages had begun to part by 154.29. Their number and size are counted off the "
        "photographs of GLV-3.",
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
        "each fuel line a small piston accumulator. On this flight the bubble was a tenth of the size it should have been: "
        "the standpipes had been charged wrongly before the launch, and for about 13 seconds Cooper and Conrad were shaken "
        "at up to 0.38 g, half as much again as the limit. It was the only time it happened to a Gemini crew. That the "
        "standpipes were there is documented; their form and place here are not.",
    ),
}


def build() -> str:
    return gemini_stack.build(FIT, SAYS, **VEHICLE)


if __name__ == "__main__":
    run(
        "gt-5 vehicle",
        build,
        gemini_stack.previews(
            (
                # the radar on the forward face (the nose fairing off); the pod's cover in the gold cover, from below (the
                # Titan off); the pod under the access door with the adapter's skin and covers off, from two sides; and the
                # pod alone, from aft and from forward
                ("radar.png", (0, 0, st(236)), 2.6, dict(azimuth=-30, elevation=40, res=(1300, 1300), hide=("NoseFairing",), lens=50)),
                ("pod-cover.png", (0, 0, st(POD_COVER_Z)), 3.6, dict(azimuth=-60, elevation=-55, res=(1400, 1400), hide=TITAN, lens=50)),
                ("pod-in-place.png", (0, 0, st(POD_AT)), 3.0, dict(azimuth=-40, elevation=-30, res=(1500, 1300), hide=OPEN, lens=50)),
                ("pod-in-place-far.png", (0, 0, st(POD_AT)), 3.0, dict(azimuth=150, elevation=-24, res=(1500, 1300), hide=OPEN, lens=50)),
                (
                    "pod.png",
                    (0.25, 0.25, st(POD_AT - 3)),
                    1.9,
                    dict(azimuth=-35, elevation=-34, res=(1500, 1300), only=("Pod_",), hide=("Pod_Cover",), lens=50),
                ),
                (
                    "pod-forward.png",
                    (0.25, 0.25, st(POD_AT)),
                    1.9,
                    dict(azimuth=160, elevation=38, res=(1500, 1300), only=("Pod_",), hide=("Pod_Cover",), lens=50),
                ),
            )
        ),
    )
