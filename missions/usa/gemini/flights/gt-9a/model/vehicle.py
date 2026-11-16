"""Gemini spacecraft No. 9 on Gemini Launch Vehicle 9, as launched on Gemini-Titan 9A (3 June 1966), and beside it the
Augmented Target Docking Adapter it went up to meet, as it found it: with its shroud still on, half open.

Run headless:
    pnpm model gt-9a           (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad at the third count. The stack is
../../../vehicles/gemini_stack.py (the spacecraft gemini_spacecraft.py, the launch vehicle titan_ii_glv.py); what was
this ship's and this vehicle's own is said here (FIT, VEHICLE, SAYS) and argued in ../spacecraft.md and
../../../vehicles/titan-ii-glv.md. The ATDA (../../../vehicles/atda.py, with the docking adapter of
target_docking_adapter.py) stands on the floor beside the launch vehicle: an exhibit's arrangement, since it went up
from Complex 14 on an Atlas two days earlier. The Atlas is not built.

Top-level nodes (the viewer's part list keys on these names):
    NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation  HeatShield
    RetroSection  EquipmentSection  ManeuveringUnit
from the launch vehicle:
    TitanStage2  TitanStage2Engine  TitanInterstage  TitanStage1  TitanStage1Engine
and the target:
    TargetDockingAdapter  AtdaEquipmentSection  AtdaReactionControl  AtdaShroud
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

# What spacecraft 9 had. It "closely resembled Spacecraft 8", "except for the window covers and the extravehicular
# equipment" (../spacecraft.md, "This ship and the others"). "GIX" is the Gemini IX-A mission report, MSC-G-R-66-6, whose
# section 3.1 and Table 3.1-I list its differences from spacecraft 8; "GVIII" the Gemini VIII mission report, for what the
# two shared; "SEDR2" SEDR 300 volume 2; "SP-149" NASA's Summary of Gemini Extravehicular Activity; "kit" NASA's press
# kit for the flight, release 66-97.
FIT = Fit(
    radar=True,  # as spacecraft 8
    mooring_latches=True,  # "spacecraft 8 through 12" (SEDR2, p. 13-1 and Figure 13-2)
    index_bar=True,  # the "docking bar" (GIX, Figure 3.1-1): Cernan hung a mirror on it
    docking_light=True,  # "Rendezvous and docking light" (GIX, Figure 3.1-1)
    lateral_thrusters=True,
    # "two tanks on S/C 6, 8 & 9" (SEDR2, Section VIII, Figure 8-96); the propulsion system "the same as ... Spacecraft 8" (GIX, 3.1.2.7)
    oams_tanks=2,
    oams_reserve_tank=True,  # as spacecraft 8: "the same" (GIX, 3.1.2.7)
    adapter_batteries=0,
    fuel_cells=True,  # "a fuel-cell power system that was the same as the Spacecraft 8 system" (GIX, 3.1.2.6)
    fuel_cell_row=True,  # SEDR2, Figure 5-7, "RSS/Fuel Cell Module (S/C 8 & 9)"
    hydrogen_insulated=False,
    water_tanks=0,
    water_spheres=0,
    # the environmental control system "similar to the one used on Spacecraft 8" (GIX, 3.1.2.3); SEDR2, Figure 6-10 sheet 6, "S/C 8 and 9"
    module_water_tank=True,
    retro_water_tank=True,
    handrails=True,  # "The structural modifications (handrail, Velcro patches) installed on Spacecraft 8 were included" (GIX, 3.1.2.12.1)
    eva_light=True,  # "The external adapter surface light" (GIX, 5.1.10)
    backpack="amu",  # "The AMU replaced the ESP" (GIX, Table 3.1-I); its foot rail has the two stirrups this ship added
    gold_inside=True,  # "The inner adapter surfaces of spacecraft 9 through 12 are gold plated" (SEDR2, p. 2-17)
    window_covers=True,  # "A transparent cover for each hatch window was installed" (GIX, Table 3.1-I and 3.1.1)
    right_hatch_opens=True,  # Cernan went out through it: its own node, on its hinge
    retro_experiments=("s-12",),  # the micrometeorite collector on the retrograde section (GIX, 8.7.2; kit, p. 21)
    pod=False,
    experiments=(),
    names=("Stafford", "Cernan"),
    # no crew: both men wore the G4C suit (GIX, 3.1.2.12.2), which is not modelled
    crew=None,
    white_disc=False,  # it is spacecraft 3's, and not identified
    gmt_clock=True,  # as spacecraft 4 to 6: assumed, nothing read says it of this ship
    get_clock=True,  # the elapsed-time digital clock, its light dimmed on this ship by a hood (GIX, 3.1.2.9.1 (d))
)

# GLV-9: as GLV-8 outside, but for one opening: "The skin cutout for compartment 3 air conditioning was deleted" (GIX,
# Table 3.2-I). The model has no such cutout on any vehicle (../../../vehicles/titan-ii-glv.md)
VEHICLE = dict(skirt_insulation=False)

PHOTOGRAPH = "It is read off a photograph of spacecraft 3 and taken to be the same on this ship."
STRIP = "Its place is read off a photograph of spacecraft 3, and taken to be the same on this ship."

# What these things say of themselves on this flight: the type's words tell Gemini-Titan 3's story.
SAYS = {
    "RR_MainParachute": (
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in a container 22.25 in across and 21.32 in long in this section. "
        "The ship hangs from it by its nose at first, then is let down to hang level by two points so that it meets the "
        "sea on the edge of its heat shield. On this flight it came out at 72 hours 17 minutes 11 seconds, and the "
        "ship came down in sight of the carrier Wasp, which had it in view from three and a half nautical miles. "
        "The container's size is McDonnell's manual's; where it sits in the section is estimated.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out to steady the ship; lower down the drogue pulls out a pilot parachute, and the "
        "pilot parachute pulls this whole section off the ship, radar and all, and the main parachute out of it. On "
        "this flight the drogue came out at 72 hours 15 minutes 48 seconds, and at that moment, by the ship's own "
        "navigation, it was 0.38 of a nautical mile from the point it had been steered for. Their forms and places "
        "here are estimated.",
    ),
    "RR_RadarAntennas": (
        "Rendezvous radar antennas",
        "Four dual-spiral antennas on the ship's forward face. One transmits. The other three listen for the answer of a "
        "transponder in the target's docking adapter: the reference antenna, and beside it one for azimuth and one for "
        "elevation, each of which turns until the answer reaches it in step with the reference. On this flight the "
        "radar first heard the target at 130 nautical miles and held it from 120. The target was tumbling under its "
        "half-open shroud, and its answer came and went as it turned. The four antennas and what each does are "
        "documented; their size and where each stands on the face are scaled from McDonnell's sketch of spacecraft 5's.",
    ),
    "RR_MooringLatches": (
        "Mooring latch receptacle",
        "One of three fittings round the rim of the forward face, a third of a turn apart, for the hooks of a docking "
        "cone to drop behind. On this flight nothing caught them. The cone they were to go into was behind the two "
        "halves of a shroud that had not come off, and Stafford brought the ship's nose to within inches of it and "
        "no further. The nose fairing covers them on the way up and swings away on the lowest one. That there were "
        "three, equally spaced, is McDonnell's manual; their size here is estimated.",
    ),
    "RR_IndexBarRod": (
        "Index bar",
        "A steel bar that stands out of the top of the ship's nose once it is in orbit: a cartridge drives it 13.82 in up "
        "out of its casing, and it locks there. It is what a docking is steered by. On this flight there was no "
        "docking. Stafford wanted to nudge the shroud's jaws open with it and was told not to; two days later Cernan, "
        "outside, fastened a mirror to it so that Stafford could watch him at the back of the ship. It is drawn here "
        "as it left the pad, drawn in. How far it runs out is documented; how thick it is and its exact place are "
        "scaled from McDonnell's drawings.",
    ),
    "RCS_ThrustChambers": (
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. A Gemini comes through the air with a little lift, and rolling it with these "
        "points the lift where it is wanted. On this flight the computer steered, and when the drogue came out the "
        "ship's own navigation had it 0.38 of a nautical mile from its mark; the recovery ships made the landing 2.3 "
        "nautical miles west of it. In each cluster one pair fires along the ship's top-to-bottom line and the other "
        "sideways. Which chamber fires which way is SEDR 300's drawing; where the clusters stand is read off a "
        f"photograph. {PHOTOGRAPH}",
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
        "two in a frame bolted on inside with 35 bolts. On the ships before, a film had formed on the outer pane during "
        "the climb. So this ship went up with a fourth pane over each window: the outer window of a ship that had "
        "already flown, in its own frame, hooked on by two hinges and thrown off by two springs when a knob inside "
        "the hatch was turned, once the ship was in orbit. The 35 degrees is SEDR 300's section as drawn; where the "
        "window is and its outline are read off a photograph of spacecraft 3; the cover's form is estimated.",
    ),
    "Retro_ForwardThrusters": (
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. This flight made "
        "three rendezvous with the same target, each a different way, and these were the brakes of all three: the "
        "first from 4 hours 6 minutes, over about nine minutes, the second two and a half hours later, the third on "
        "the next day, from above. Their thrust is documented; where they stand is read off SEDR 300's sketch of the "
        "system, and how far they lean forward is estimated.",
    ),
    "Retro_LateralThrusters": (
        "Lateral thrusters",
        "Chambers 13 to 16: four of 100 lbf, pointing out to the sides, up and down through the ship's centre of gravity, to "
        "move it bodily without turning it. With these Stafford kept the ship beside a target that was rolling at "
        "three degrees a second, first at 60 ft in the dark, then at ten ft when the Sun came up, and on the third "
        "visit, the report says, within about three inches. Which way each pushes is documented; where they stand is "
        "read off SEDR 300's sketch.",
    ),
    "Retro_Rockets": (
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 71 hours "
        "46 minutes 44 seconds, in the forty-fifth revolution, the first of them began to bring Gemini IX-A down. "
        "Their size is SEDR 300's; where they sit in the section is read off its figure.",
    ),
    "Retro_WaterTank": (
        "Water tank B",
        "The ship's drinking water: one of its two tanks, each able to hold 42 lb, two aluminium half-shells with a "
        "titanium ring between them. The water the fuel cells make is piped in between its diaphragms and pushes the "
        "drinking water out to the crew; on this ship the plumbing was changed to keep air out of what they drank. "
        "It is in this section and not the one behind because this section stays on until retrofire. That it was "
        "here is documented; its size is worked from the 42 lb, and where in the section it sat is read off two "
        "sketches: toward the top, on a tray.",
    ),
    "Equipment_AftThrusters": (
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. The first rendezvous was to be made in "
        "the third revolution, faster than any before, and these did it in three burns: 74.8 ft a second at 49 "
        "minutes, 53.4 at 2 hours 24 minutes to make the orbit a circle under the target's, and 28.4 at 3 hours 36 "
        "minutes to climb to it. SEDR 300's sketch puts one at the top of the foot and one at the bottom; there they "
        "lean outward, and here they fire straight aft.",
    ),
    "Equipment_AttitudeThrusters": (
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. On the flight before, one of these "
        "had stuck open and sent the ship spinning, and its crew had no single switch to stop it with. This ship had "
        "one: a lever that took the power off every thruster of the manoeuvring system at once. Every bare "
        "connection in the box that drives the valves was also given a coat of varnish or epoxy, since a short "
        "circuit was the likeliest cause. Their number, thrust and which way each fires are documented; where the "
        "clusters stand round the foot is read off SEDR 300's sketch.",
    ),
    "Equipment_Cover": (
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of "
        "glass fibre cloth with gold deposited on it closes the opening: gathered in from the rim to an oblong opening "
        "in the middle, with a thermal cover over the opening, the Air Force's backpack behind that, and two hand "
        "bars and a foot rail folded flat against the cloth. Until the ship leaves the Titan, the dome of the "
        "Titan's tank stands up into the adapter under it. Its form is measured on a photograph of this ship's "
        "adapter with the thermal cover off, and on one of spacecraft 7's from behind.",
    ),
    "Equipment_HandBars": (
        "Hand bars",
        "Two bars of tube 1.38 in across, one for either hand, on arms hinged at the adapter's rim. They went up folded "
        "flat against the gold cover, to clear the dome of the Titan's tank, and a switch in the cabin was to spring "
        "them out. On this flight one of them, the thermal cover and the umbilical guide did not come all the way "
        "out; Cernan freed them by pulling on the bar. Each has a floodlight at its foot, and one of those failed. "
        "The tube's size is documented; the bars' lengths and where they lie are scaled from the reports' sketches.",
    ),
    "Equipment_FootRail": (
        "Foot rail and stirrups",
        "A rail for the feet, folded against the cover like the hand bars and sprung out with them, toward the crew's "
        "left. On this ship two aluminium stirrups were added to it, to hold a man's boots while he used both hands on "
        "the pack. They did not hold Cernan's. Every turn of a valve turned him instead, he worked far harder than "
        "anyone had planned for, and his visor fogged until he could not see. That they were added, and that they "
        "failed, are documented; their form, the rail's length and where it lies are scaled from sketches. The "
        "fittings at the rim are the bars' hinges, and the two lamp housings the floodlights.",
    ),
    "Equipment_OamsTanks": (
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: two tanks of fuel, two of oxidiser and two of helium to push them, "
        "feeding sixteen thrust chambers round the adapter. This ship went up with 336 lb of oxidiser and 343 lb of "
        "fuel that it could use, and used nearly all of it: three rendezvous, and hours of holding station beside a "
        "target that would not hold still. Seven hundred pounds were burned and fourteen were left. That there "
        "were two of each, 21.13 in, 21.12 in and 16.20 in across, is McDonnell's manual; its drawing has the four "
        "propellant tanks in a row along the module's frame. Which of the four are fuel, and where the two helium "
        "tanks are, are estimated.",
    ),
    "Equipment_OamsReserveTank": (
        "OAMS reserve fuel tank",
        "A third fuel tank for the manoeuvring system: a cylinder 5.10 in across and 30.7 in long, of the pattern the "
        "re-entry control system uses, behind a valve that a squib opens. It is there because the gauge could not be "
        "trusted near empty: when the main tanks ran dry the crew would open this one and know exactly what they had "
        "left. Spacecraft 7 had the first and spacecraft 8 the second; this ship's propulsion is recorded as the same "
        "as spacecraft 8's. Its size is McDonnell's figure; where it lies is estimated from the manual's sketch.",
    ),
    "Equipment_PrimaryOxygen": (
        "Primary oxygen",
        "The oxygen the crew breathe in orbit, in a tank of its own. It also fed the man outside, through 25 ft of "
        "umbilical, until he changed over to the backpack's supply, which Cernan never did for more than a moment. "
        "When this section is cut away before retrofire the crew go on to a smaller supply in the re-entry module; on "
        "this flight that was at 71 hours 45 minutes 50 seconds. McDonnell's drawing puts it under its own panel of "
        "the blast shield, at one end of the space between the two beams; its size is estimated.",
    ),
    "Equipment_FuelCells": (
        "Fuel cell sections",
        "Two sealed cans, each holding three stacks of 32 cells. In each cell hydrogen and oxygen meet across a sheet of "
        "plastic that lets only the hydrogen's nuclei through; the electrons have to go round by the wire, and that is "
        "the ship's power. What comes out the other side is water. They ran for the three days of this flight; on its "
        "panel each of the six stacks now had an ammeter of its own. On this ship and the one before the two cans "
        "stand apart, with the oxygen tank between them. That is McDonnell's drawing of the module; their size is "
        "scaled from his sketch of spacecraft 5's.",
    ),
    "Equipment_RssHydrogen": (
        "Fuel cell hydrogen tank",
        "Hydrogen for the fuel cells, kept so cold and so squeezed that it is neither liquid nor gas. A flight of three "
        "days needs a quarter of what a fortnight does: 5.80 lb, where spacecraft 7's tank held 22. The load is "
        "McDonnell's manual's figure for a short mission; the tank's size is worked from it, with a guess at the "
        "insulation; it is at the end of the module's row, as his drawing has it.",
    ),
    "Equipment_RssOxygen": (
        "Fuel cell oxygen tank",
        "Oxygen for the fuel cells: 46 lb on this ship and the one before, where the fortnight's flight had carried 180. "
        "It stands between the two fuel cell sections. The load is McDonnell's manual's; the tank's size is worked "
        "from it, with a guess at the insulation; its place is his drawing of the module.",
    ),
    "Equipment_BlastShieldDoor": (
        "Blast shield access door",
        "The panel in the middle of the blast shield, between the two beams. On this ship the backpack's torque box is "
        "bolted to its under side, from station Z66.74 aft to Z56.27, so that the pack hangs in the clear middle of the "
        "section, behind the gold cover. That there was a door in the middle is McDonnell's drawing; its size is "
        "scaled from it.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The panels are drawn from McDonnell's drawing of spacecraft 3's, with the clocks the later ships added. Before "
        "the command pilot: the ball that shows which way the ship points, the accelerometer and the abort lamp above "
        "it, the Titan's tank pressures, the counters that say how much speed is still to be added, and the range and "
        "range rate of whatever the radar has found. This ship had more that is not drawn: the panel for commanding "
        "a target; a switch for the Air Force's backpack, which let it go from the ship or sent its telemetry to the "
        "ship's recorder; a lamp that warned if the pack's hydrogen peroxide was getting hot; and the lever added "
        "after Gemini VIII that cuts the power to every manoeuvring thruster at once. The instruments' "
        "graduations are estimated.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners "
        "between, the hatches for its roof. Stafford and Cernan sat in it for three days and 21 minutes, and for two "
        "hours and five minutes of that it was open to space, with Stafford in it alone and Cernan at the far end of "
        "the ship on 25 ft of hose. No drawing read gives its dimensions. Its form is McDonnell's figures': flat "
        "sides leaning in toward a narrow floor. Its sizes are those fitted round the crew of spacecraft 3, which "
        "was built to the same drawings.",
    ),
    "SeatCommandPilot_Frame": (
        "Ejection seat",
        "Stafford's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute "
        "the way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees "
        "blows both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° "
        "forward so that the two do not meet. Stafford had sat on one through an engine shutdown on the pad six months "
        "before. He was in this one on 17 May when the Atlas carrying his Agena went into the Atlantic, on 1 June when "
        "the count stopped at three minutes, and on the 3rd when it did not. Its form is the two seats the "
        "Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: the G4C suit both men wore is not modelled.",
    ),
    "SeatPilot_Frame": (
        "Ejection seat",
        "Cernan's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute "
        "the way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees "
        "blows both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° "
        "forward so that the two do not meet. Cernan stood on this seat in the open hatch at 49 hours 23 minutes, "
        "and got back into it two hours later, behind a fogged visor, with Stafford holding his legs. "
        "Its form is the two seats the Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: the G4C suit "
        "both men wore is not modelled.",
    ),
    # the launch vehicle
    "Interstage_ExhaustPorts": (
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. On this flight the signal "
        "to start it came 152.48 seconds after liftoff, with the first stage's shutdown, and the stages began to part "
        "at 153.23. Their number and size are counted off the photographs of GLV-3.",
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
        "crew were shaken past the limit; it was the only time. That the standpipes were there is documented; their "
        "form and place here are not.",
    ),
}


def build() -> str:
    return gemini_stack.build(FIT, SAYS, target="atda", **VEHICLE)


if __name__ == "__main__":
    run(
        "gt-9a vehicle",
        build,
        gemini_stack.previews(
            (
                # the nose with its fairing off; the adapter's top, with the two lights, the handrails and the collector;
                # the windows under their covers; the back of the adapter; the backpack behind its cover
                ("nose.png", (0, 0, st(228)), 2.8, dict(azimuth=-30, elevation=35, res=(1300, 1300), hide=("NoseFairing",), lens=50)),
                ("adapter-top.png", (1.1, 0.2, st(62)), 5.0, dict(azimuth=25, elevation=38, res=(1500, 1300), lens=50)),
                ("window-covers.png", (0.6, 0.0, st(146)), 1.8, dict(azimuth=20, elevation=40, res=(1500, 1100), lens=50)),
                ("donning-station.png", (0, 0, st(24)), 6.4, dict(azimuth=-150, elevation=-49, res=(1500, 1500), hide=gemini_stack.TITAN, lens=50)),
                (
                    "backpack.png",
                    (0, 0, st(44)),
                    3.4,
                    dict(
                        azimuth=-120,
                        elevation=-35,
                        res=(1500, 1300),
                        only=("Backpack_", "Equipment_TorqueBox", "Equipment_BlastShield", "Equipment_ModuleBeams"),
                        lens=50,
                    ),
                ),
                *gemini_stack.target_previews("atda"),
            )
        ),
    )
