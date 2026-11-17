"""Gemini spacecraft No. 8 on Gemini Launch Vehicle 8, as launched on Gemini-Titan 8 (16 March 1966), and beside it the
Gemini Agena Target Vehicle it docked with, GATV-5003, as it was in orbit.

Run headless:
    pnpm model gt-8            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

The flight's vehicle: spacecraft and launch vehicle, as they left the pad. The stack is ../../../vehicles/gemini_stack.py
(the spacecraft gemini_spacecraft.py, the launch vehicle titan_ii_glv.py); what was this ship's and this vehicle's own
is said here (FIT, VEHICLE, SAYS) and argued in ../spacecraft.md and ../../../vehicles/titan-ii-glv.md. The Agena
(../../../vehicles/agena_target_vehicle.py, with the docking adapter of target_docking_adapter.py) stands on the floor
beside the launch vehicle: an exhibit's arrangement, since it went up from Complex 14 on an Atlas 101 minutes
earlier. The Atlas is not built.

Top-level nodes (the viewer's part list keys on these names):
    NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation  HeatShield
    RetroSection  EquipmentSection  ExtravehicularSupportPackage
from the launch vehicle:
    TitanStage2  TitanStage2Engine  TitanInterstage  TitanStage1  TitanStage1Engine
and the target:
    TargetDockingAdapter  AgenaForwardSection  AgenaTankSection  AgenaAftSection  AgenaEngine
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
from agena_target_vehicle import GATV_5003  # noqa: E402
from gemini_spacecraft import Fit  # noqa: E402
from gemini_stack import st  # noqa: E402
from srlib import run  # noqa: E402

# What spacecraft 8 had, against spacecraft 6, which it "most closely resembled", and spacecraft 7, whose fuel cells it
# had (../spacecraft.md, "This ship and the others"). "GVIII" is the Gemini VIII mission report, MSC-G-R-66-4, whose
# section 3.1 and Table 3.1-I list the differences; "SEDR2" is SEDR 300 volume 2, McDonnell's manual for the rendezvous
# ships; "TS" McDonnell's Technical Summary, NASA CR-1106; "SP-149" NASA's Summary of Gemini Extravehicular Activity;
# "kit" NASA's press kit for the flight, release 66-52.
FIT = Fit(
    radar=True,  # not listed as changed from spacecraft 6: "Rendezvous radar" (GVIII, Figure 3.1-1)
    mooring_latches=True,  # the three latch receptacles: "spacecraft 8 through 12" (SEDR2, p. 13-1 and Figure 13-2)
    index_bar=True,  # the "docking bar" on the top of the forward section (GVIII, Figures 3.1-1 and 3.1-9; SEDR2, Figure 13-8)
    docking_light=True,  # "Rendezvous and docking light" (GVIII, Figure 3.1-1), 4,000 candlepower, centred (TS, p. 327)
    lateral_thrusters=True,  # all sixteen OAMS chambers real, from spacecraft 4 on
    oams_tanks=2,  # "two tanks on S/C 6, 8 & 9" of fuel, "two tanks on S/C 6, 8 & up" of oxidiser and helium (SEDR2, Section VIII, Figure 8-96)
    oams_reserve_tank=True,  # "Reserve-fuel-tank system installed for OAMS" (GVIII, Table 3.1-I and 3.1.2.7.2): as spacecraft 7's
    adapter_batteries=0,
    fuel_cells=True,  # "Fuel Cell Power System used instead of adapter battery module" (GVIII, Table 3.1-I)
    fuel_cell_row=True,  # the module as McDonnell drew it for these two ships (SEDR2, Figure 5-7), with the short missions' tanks (p. 5-33)
    hydrogen_insulated=False,  # "insulation on hydrogen supply tank ... not incorporated" (GVIII, 3.1.2.6)
    water_tanks=0,
    water_spheres=0,
    module_water_tank=True,  # tank A, "Equipment adapter water storage tank" (GVIII, 3.1.2.3.5 and Figure 3.1-2)
    retro_water_tank=True,  # tank B, "Retro-adapter water storage tank" (the same)
    handrails=True,  # "Handrails and Velcro patches added to exterior surface of spacecraft" (GVIII, Table 3.1-I; SP-149, p. 5-6)
    eva_light=True,  # "a light was added to the forward end of the adapter assembly and was pointed aft" (GVIII, 3.1.2.12.1)
    backpack="esp",  # "ESP provided and stowed in adapter assembly" (GVIII, Table 3.1-I; kit, p. 40)
    retro_experiments=("s-9",),  # the nuclear emulsion package behind the right hatch (GVIII, 8.0; kit, p. 29)
    pod=False,
    experiments=(),
    names=("Armstrong", "Scott"),
    # no crew: both men wore the G4C suit (GVIII, 3.1.2.12.2), which is built standing, at the pad (../../../crew/g4c_suit.py),
    # and not seated
    crew=None,
    white_disc=False,  # it is spacecraft 3's, and not identified
    gmt_clock=True,  # as spacecraft 4 to 6: assumed, nothing read says it of this ship
    get_clock=True,  # the elapsed-time digital clock, which on this ship was given a light and a dimmer (GVIII, 3.1.2.9.1 (f))
)

# GLV-8: as GLV-6 outside. What changed was inside it (GVIII, 3.2 and Table 3.2-I): two telemetry antenna cutouts where
# there had been four, a new injector in the second stage's engine, a gain change five seconds earlier
VEHICLE = dict(skirt_insulation=False)

PHOTOGRAPH = "It is read off a photograph of spacecraft 3 and taken to be the same on this ship."
STRIP = "Its place is read off a photograph of spacecraft 3, and taken to be the same on this ship."

# What these things say of themselves on this flight: the type's words tell Gemini-Titan 3's story.
SAYS = {
    "RR_MainParachute": (
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in a container 22.25 in across and 21.32 in long in this section. "
        "The ship hangs from it by its nose at first, then is let down to hang level by two points so that it meets the "
        "sea on the edge of its heat shield. On this flight it came out at 10 hours 38 minutes 8 seconds, over the "
        "western Pacific, three days early and half a world from the carrier Boxer, which was waiting in the "
        "Atlantic. The container's size is McDonnell's manual's; where it sits in the section is estimated.",
    ),
    "RR_DrogueMortar": (
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out to steady the ship; lower down the drogue pulls out a pilot parachute, and the "
        "pilot parachute pulls this whole section off the ship, radar and all, and the main parachute out of it. On "
        "this flight the drogue came out at 10 hours 36 minutes 47 seconds and the main parachute 81 seconds later. "
        "Their forms and places here are estimated.",
    ),
    "RR_RadarAntennas": (
        "Rendezvous radar antennas",
        "Four dual-spiral antennas on the ship's forward face. One transmits. The other three listen for the answer of a "
        "transponder in the Agena's docking adapter: the reference antenna, and beside it one for azimuth and one for "
        "elevation, each of which turns until the answer reaches it in step with the reference. On this flight the "
        "radar first heard the Agena at 3 hours 27 minutes 48 seconds and had it solidly three and a half minutes "
        "later, 181 nautical miles away. The four antennas and what each does are documented; their size and where "
        "each stands on the face are scaled from McDonnell's sketch of spacecraft 5's.",
    ),
    "RR_MooringLatches": (
        "Mooring latch receptacle",
        "One of three fittings round the rim of the forward face, a third of a turn apart, for the hooks of the Agena's "
        "docking cone to drop behind. At 6 hours 33 minutes 16 seconds they did: the first time two vehicles had been "
        "joined in orbit. Six seconds later the cone had drawn the ship in and the two were rigid. Forty-two "
        "minutes after that, with the pair rolling and Armstrong unable to stop it, the hooks let go again at his "
        "command. The nose fairing covers the receptacles on the way up and swings away on the lowest one. That "
        "there were three, equally spaced, is McDonnell's manual; their size here is estimated.",
    ),
    "RCS_ThrustChambers": (
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks, meant "
        "for the way home. On this flight they were what stopped the tumble. With the ship turning nearly once a second "
        "and the manoeuvring system shut off, Armstrong opened both rings at 7 hours 16 minutes 25 seconds; the first "
        "chamber fired at 7:19:04, the rates were under control by 7:25:30, and one ring was shut down again after 80 "
        "seconds of firing to save it. About half the system's propellant was gone, and the rule was plain: once the "
        "re-entry system has been used, the ship comes home at the next chance. In each cluster one pair fires along "
        "the ship's top-to-bottom line and the other sideways. Which chamber fires which way is SEDR 300's drawing; "
        f"where the clusters stand is read off a photograph. {PHOTOGRAPH}",
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
        "two in a frame bolted on inside with 35 bolts. Through his, Armstrong flew the last hundred and fifty feet to "
        "the Agena and put the ship's nose into its cone at less than a foot a second; the status panel over the cone "
        "was read through them. The 35 degrees is SEDR 300's section as drawn; where the window is and its outline are "
        "read off a photograph of spacecraft 3, and taken to be the same on this ship.",
    ),
    "Retro_ForwardThrusters": (
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. They made the "
        "flight's first manoeuvre, 3.1 ft a second off the top of the orbit at 1 hour 34 minutes, and they were the "
        "brakes at the end of the chase. They were also the way out: at 7 hours 15 minutes 12 seconds, with ship and "
        "Agena rolling together, Armstrong fired them for 6.6 seconds to back the nose out of the cone. Their thrust "
        "is documented; where they stand is read off SEDR 300's sketch of the system, and how far they lean forward is "
        "estimated.",
    ),
    "Retro_LateralThrusters": (
        "Lateral thrusters",
        "Chambers 13 to 16: four of 100 lbf, pointing out to the sides, up and down through the ship's centre of gravity, to "
        "move it bodily without turning it. For 36 minutes before the docking Armstrong kept the ship 150 to 50 ft from "
        "the Agena while he and Scott looked it over, which is these thrusters' work, and then slid in. Which way each pushes is documented; "
        "where they stand is read off SEDR 300's sketch.",
    ),
    "Retro_Rockets": (
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 10 hours "
        "4 minutes 47 seconds, in the seventh revolution, the first of them began to bring Gemini VIII down toward a "
        "part of the Pacific where one destroyer was on station. Their size is SEDR 300's; where "
        "they sit in the section is read off its figure.",
    ),
    "Retro_WaterTank": (
        "Water tank B",
        "The ship's drinking water: one of its two tanks, each able to hold 42 lb, two aluminium half-shells with a "
        "titanium ring between them. This one went up with 36 lb of water. The water the fuel cells make is piped in "
        "between its diaphragms and pushes the drinking water out to the crew. It is in this section and not the one "
        "behind because this section stays on until retrofire. That it was here and what it held are documented; its "
        "size is worked from the 42 lb, and where in the section it sat is read off two sketches: toward the top, on "
        "a tray.",
    ),
    "Equipment_AftThrusters": (
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. These did the catching up. They pushed "
        "the ship clear of the Titan for eight seconds; at 2 hours 18 minutes they added 50.6 ft a second in a burn of "
        "68 seconds, to lift the low point of the orbit; at 3 hours 48 minutes, 61.6 ft a second in 82 seconds, which "
        "made the orbit a near circle 15 nautical miles under the Agena's; and at 5 hours 15 minutes the 27 ft a "
        "second that began the climb to it. SEDR 300's sketch puts one at the top of the foot and one at the bottom; "
        "there they lean outward, and here they fire straight aft.",
    ),
    "Equipment_AttitudeThrusters": (
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. One of these ended the flight. At "
        "7 hours 0 minutes 27 seconds, 27 minutes after the docking, the valves of No. 8 opened by themselves, shut "
        "five seconds later, and after four seconds more opened again and stayed open: probably a short circuit to "
        "ground in its wiring. No. 8 "
        "rolls and yaws the ship to the left. Armstrong and Scott took the Agena for the culprit, fought the roll "
        "with these same thrusters, and undocked; freed of the Agena's mass the ship spun up to 296 degrees a second. "
        "They shut the whole system off, stopped the spin with the re-entry thrusters, and then found No. 8 by "
        "switching the others back on one at a time. It had fired for 900 seconds in all. Their number, thrust and "
        "which way each fires are documented; where the clusters stand round the foot is read off SEDR 300's sketch.",
    ),
    "Equipment_Cover": (
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of "
        "glass fibre cloth with gold deposited on it closes the opening. On this ship it was made again to take what "
        "a man going outside would need: it is gathered in from the rim to an oblong opening in the middle, with a "
        "thermal cover over the opening, the backpack behind that, and two hand bars and a foot rail folded flat "
        "against the cloth. Until the ship leaves the Titan, the dome of the Titan's tank stands up into the adapter "
        "under it. That it was redesigned so is documented; its form is measured on photographs of spacecraft 7's "
        "and spacecraft 9's.",
    ),
    "Equipment_OamsTanks": (
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: two tanks of fuel, two of oxidiser and two of helium to push them, "
        "feeding sixteen thrust chambers round the adapter. This ship went up with 420 lb of oxidiser and 347 lb of "
        "fuel, for three days of manoeuvres with an Agena. The chase and the docking went as planned. Then, in "
        "25 minutes, one thruster that would not shut and the others fighting it burned some 200 lb, and by the "
        "time this section was cut away 563 lb had gone. That there were two of each, 21.13 in, 21.12 in and "
        "16.20 in across, is McDonnell's manual; its drawing has the four propellant tanks in a row along the "
        "module's frame. Which of the four are fuel, and where the two helium tanks are, are estimated.",
    ),
    "Equipment_OamsReserveTank": (
        "OAMS reserve fuel tank",
        "A third fuel tank for the manoeuvring system: a cylinder 5.10 in across and 30.7 in long, of the pattern the "
        "re-entry control system uses, behind a valve that a squib opens. It is there because the gauge could not be "
        "trusted near empty: when the main tanks ran dry the crew would open this one and know exactly what they had "
        "left. It went up with 14.5 lb in it. Spacecraft 7 had the first; this ship had one too. Its size is "
        "McDonnell's figure; where it lies is estimated from the manual's sketch of the system.",
    ),
    "Equipment_PrimaryOxygen": (
        "Primary oxygen",
        "The oxygen the crew breathe in orbit, in a tank of its own. A valve joins it to the fuel cells' oxygen, so that "
        "either can lend to the other. When this section is cut away before retrofire the crew go on to a smaller "
        "supply in the re-entry module; on this flight that was at 10 hours 3 minutes 48 seconds. McDonnell's drawing "
        "puts it under its own panel of the blast shield, at one end of the space between the two beams; its size is "
        "estimated.",
    ),
    "Equipment_FuelCells": (
        "Fuel cell sections",
        "Two sealed cans, each holding three stacks of 32 cells. In each cell hydrogen and oxygen meet across a sheet of "
        "plastic that lets only the hydrogen's nuclei through; the electrons have to go round by the wire, and that is "
        "the ship's power. What comes out the other side is water. Spacecraft 6 had flown on batteries; this ship "
        "had the fuel cells of spacecraft 7, for a flight of three days, and they were asked for less than eleven "
        "hours. On this ship and the next the two cans stand apart, with the oxygen tank between them. That is "
        "McDonnell's drawing of the module; their size is scaled from his sketch of spacecraft 5's.",
    ),
    "Equipment_RssHydrogen": (
        "Fuel cell hydrogen tank",
        "Hydrogen for the fuel cells, kept so cold and so squeezed that it is neither liquid nor gas. A flight of three "
        "days needs a quarter of what a fortnight does: 5.80 lb, where spacecraft 7's tank held 22. The wrap of "
        "aluminised film that tank had was left off this one. The load is McDonnell's manual's figure for a short "
        "mission; the tank's size is worked from it, with a guess at the insulation; it is at the end of the "
        "module's row, as his drawing has it.",
    ),
    "Equipment_RssOxygen": (
        "Fuel cell oxygen tank",
        "Oxygen for the fuel cells: 46 lb on this ship and the next, where the fortnight's flight had carried 180. It "
        "stands between the two fuel cell sections. The load is McDonnell's manual's; the tank's size is worked from "
        "it, with a guess at the insulation; its place is his drawing of the module.",
    ),
    "Equipment_BlastShieldDoor": (
        "Blast shield access door",
        "The panel in the middle of the blast shield, between the two beams. On this ship the backpack's torque box is "
        "bolted to its under side, so that the pack hangs in the clear middle of the section, behind the gold cover. "
        "That there was a door in the middle is McDonnell's drawing; its size is scaled from it.",
    ),
    "CrewCabin_InstrumentPanel": (
        "Instrument panels",
        "The panels are drawn from McDonnell's drawing of spacecraft 3's, with the clocks the later ships added. Before "
        "the command pilot: the ball that shows which way the ship points, the accelerometer and the abort lamp above "
        "it, the Titan's tank pressures, the counters that say how much speed is still to be added, and the range and "
        "range rate of whatever the radar has found. On this ship there was more that is not drawn: a panel for "
        "commanding the Agena, with two switches to make its cone rigid and to undock by hand if the automatic "
        "sequence failed; a panel for the tape unit that reloaded the computer in flight; the fuel cells' monitor, "
        "in the place of the batteries' ammeter. When the ship spun, the programme's history says, the two men were "
        "dizzy, their sight was blurred, and they had trouble seeing the dials on the panel overhead, where the "
        "switches of the re-entry system are. The instruments' graduations are estimated.",
    ),
    "CrewStation_PressureVessel": (
        "Pressure vessel",
        "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners "
        "between, the hatches for its roof. Armstrong and Scott sat in it for 10 hours 41 minutes, of a flight planned "
        "for three days. Neither hatch was opened: Scott was to have gone out through his on the second day. No "
        "drawing read gives its dimensions. Its form is McDonnell's figures': flat sides leaning in toward a narrow "
        "floor. Its sizes are those fitted round the crew of spacecraft 3, which was built to the same drawings.",
    ),
    "SeatCommandPilot_Frame": (
        "Ejection seat",
        "Armstrong's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute "
        "the way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees "
        "blows both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° "
        "forward so that the two do not meet. On this ship the kit under the seat was made lower. From this seat, six "
        "and a half hours up, Armstrong docked two vehicles for the first time, and half an hour after that flew a ship "
        "that was turning once a second back to rest. Its form is the two seats the Smithsonian holds, 22 in wide and "
        "54 in tall. The seat is empty: the G4C suit both men wore is built standing, at the pad, and not seated.",
    ),
    "SeatPilot_Frame": (
        "Ejection seat",
        "Scott's seat. Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute "
        "the way out is this, an ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees "
        "blows both hatches open and fires both seats up their rails on the bulkhead, which are canted 12° apart and 8° "
        "forward so that the two do not meet. Scott was to have left this seat on the second day for more than two "
        "hours outside, with a pack on his back and a gas gun in his hand; he never did. Its form is the two seats "
        "the Smithsonian holds, 22 in wide and 54 in tall. The seat is empty: the G4C suit both men wore is "
        "built standing, at the pad, and not seated.",
    ),
    # the launch vehicle
    "Interstage_ExhaustPorts": (
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. On this flight the signal "
        "to start it came 154.61 seconds after liftoff, with the first stage's shutdown, and the stages began to part "
        "at 155.29. Their number and size are counted off the photographs of GLV-3.",
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
    return gemini_stack.build(FIT, SAYS, target=GATV_5003, **VEHICLE)


if __name__ == "__main__":
    run(
        "gt-8 vehicle",
        build,
        gemini_stack.previews(
            (
                # the nose with its fairing off: the radar, the latch receptacles, the index bar's collar; the adapter's
                # top, with the two lights, the handrails and the emulsion package; the back of the adapter, with the
                # thermal cover, the hand bars and the foot rail; the backpack behind the cover; the fuel cell module
                ("nose.png", (0, 0, st(228)), 2.8, dict(azimuth=-30, elevation=35, res=(1300, 1300), hide=("NoseFairing",), lens=50)),
                ("adapter-top.png", (1.1, 0.2, st(62)), 5.0, dict(azimuth=25, elevation=38, res=(1500, 1300), lens=50)),
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
                (
                    "fuel-cell-module.png",
                    (-0.6, -0.25, st(52)),
                    3.2,
                    dict(
                        azimuth=203,
                        elevation=-24,
                        res=(1500, 1100),
                        only=("Equipment_FuelCells", "Equipment_Rss", "Equipment_WaterTankA", "Equipment_ModuleBeams"),
                        lens=50,
                    ),
                ),
                *gemini_stack.target_previews("agena"),
            )
        ),
    )
