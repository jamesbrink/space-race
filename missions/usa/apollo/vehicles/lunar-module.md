# LM-3 Spider

The drawing datum is the plane of the deployed footpads. Blender uses inches and converts to metres once. The four surface probes extend below that plane. In the standalone Gallery exhibit the spacecraft has extended gear and antenna. The launch stack builds the same parts with folded gear and a stowed antenna.

| Dimension | Inches | Basis |
| --- | ---: | --- |
| Footpad plane to steerable antenna crest | 277 | LM-3 mission drawing |
| Span across opposite footpads | 372 nominal | LM-3 mission drawing, 31 ft |
| Descent stage across flats / depth | 166 / 68.86 | LM-3 mission drawing |
| Lower descent skin above pad plane | 58.30 | LM-3 mission drawing |
| Forward pressure cabin diameter / length | 92 / 42 | Mission report and press kit |
| Forward hatch side / tunnel diameter | 32 / 32 | Press kit |
| Footpad diameter | 37 | Press kit |
| Deployed tread radius | 167.57 | Type dimension assumed for this unit |
| Reaction-control thrusters' axes from the centreline | 66.1 (up and down), 61.5 (fore, aft and side) | MIT R-567 §6.4.1.4, type figures assumed for LM-3 |
| Plane of the clusters above the pad plane | 180.15 | Derived: 254 in above R-567's origin, the docking plane at X 312.5 in there |
| DPS overall length / exit diameter | ~85 / ~58 | Approximate type envelope assumed for LM-3 |
| APS overall length / exit diameter | ~51 / ~31 | Approximate type envelope assumed for LM-3 |

The height ends at the S-band antenna, not at the docking ring. The ascent and descent stage structures, gear and system counts come from the flown vehicle report. The press kit describes the two pilots standing at their controls. Photographs constrain the forward window shapes, black and metallic insulation, copper-gold descent blankets, ladder, porch and foot restraints. [Mission Report, appendix A.2 and figs. A.2-2 through A.2-5](https://coastalreview.org/wp-content/uploads/2019/03/Apollo-9-mission-report.pdf) · [Apollo 9 press kit, pp. 38–47](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A09_PressKit.pdf) · [NASA flight photograph](https://science.nasa.gov/resource/apollo-9-lunar-module-in-lunar-landing-configuration/) · [NASA TN D-6850, p. 6 and figs. 2–3](https://ntrs.nasa.gov/citations/19720018253)

The descent stage contains the cruciform structure, throttleable engine, four propellant tanks, pressurization vessels, four 400 Ah batteries and one water and one oxygen vessel. The landing radar looks down from the underside. The ascent stage retains its fixed engine, two propellant tanks, two 310 Ah batteries, two oxygen and two water tanks, suit-circuit hardware, two reaction-control supplies and four four-nozzle clusters. Inside the pressure cabin the two stations have armrests and restraints, side breaker panels, a central display and keyboard, an alignment optical telescope, barrel frames and handholds over the ascent-engine cover. The side instrument banks and optical alignment are estimated from the operations handbook. Engine views isolate the chamber, jacket, nozzle extension and mounts. The nominal DPS thrust is 9,870 lbf. The mission report gives 10,500 lbf as the upper operating figure. The APS was rated at 3,500 lbf. [Mission Report, A.2.4, A.2.7–13, figs. A.2-16 through A.2-24](https://coastalreview.org/wp-content/uploads/2019/03/Apollo-9-mission-report.pdf) · [NASA spacecraft engine dimensions, table I](https://ntrs.nasa.gov/api/citations/19700026405/downloads/19700026405.pdf)

Four separation fittings join the ascent and descent structures. Their placement at the beam intersections and their visible hardware profiles are reconstructed. The separated stages expose two different engine interfaces. The ascent nozzle clears the descent deck and its covered blast deflector. The descent nozzle projects through an opening in the underside heat shield. The model places the ascent exit 112 in above the pad plane and the centre of the deflector at 107.5 in. Those local stations and the recess profile are estimates. The 31 in ascent exit and 58 in descent exit retain the approximate type diameters in the table. [Grumman LM News Reference, pp. LV-8–9](https://www.apolloproject.com/spacecraft/lmnr2.pdf)

The passive docking port includes the removable honeycomb cone, central capture socket and surrounding flanged ring. The model uses the 31.454 in envelope across the drogue supports and 13.01 in cone depth from the Block II drawing. The mating frame sits 238.65 in above the pad plane: the mission drawing gives that height to the top of the ascent stage (fig. A.2-2, 19 ft 10.65 in) without naming it the docking plane, so taking it for that plane is an assumption. Fine fitting sections and the clock angle are reconstructed. [NASA TN D-6854, fig. A-13](https://ntrs.nasa.gov/api/citations/19720018207/downloads/19720018207.pdf)

The four reaction-control clusters stand on outriggers at 45° to the pitch and roll axes. Each thruster is where the guidance computer was told it was: the up and down pair on an axis 66.1 in from the centreline both fore and aft and to the side, their reference points 4.8 in above and 5.3 in below the plane of the clusters; the two horizontal thrusters on axes 61.5 in out, their reference points 66.35 in along them. The clusters are numbered I to IV from the left forward corner round by the rear. That plane is 254 in above the origin of the LM's coordinates, and the docking plane 312.5 in above it, which puts the clusters 180.15 in above the pads. A reference point is taken for the thruster's throat, which is an assumption: the document gives a point on each line of thrust and does not say which. [MIT Instrumentation Laboratory R-567, section 6, §6.4.1.4 and §6.4.2](https://ibiblio.org/apollo/NARA-SW/R-567-sec6.pdf) · [NASA TN D-6740, "Installation of the System"](https://ntrs.nasa.gov/citations/19720014237)

On the forward face the ladder, the hatch, the round tracking light and the rendezvous radar's dish lie on one centreline, with the steerable S-band antenna off to the LM's right, and a handrail rises on either side of the porch. That is so of LM-3 and of LM-4 alike, and the model builds it for both; only the stations of the dish, the lamp and the rails are estimated. Spider's tracking light worked until staging and then failed. [NASA AS09-21-3212](https://apollojournals.org/alsj/a410/AS09-21-3212HR.jpg) · [Mission Report, section 17.2.3](https://coastalreview.org/wp-content/uploads/2019/03/Apollo-9-mission-report.pdf)

## On the Moon (the six that landed)

LM-5, LM-6, LM-8, LM-10, LM-11 and LM-12 are built as they stood on the Moon (`lunar_module.build(landed=True)`; each
flight's `model/<lm>.py`), with three things the others do not need: the forward hatch on a hinge of its own, the porch's deck,
and the ladder as something to climb.

| Dimension | Inches | Basis |
| --- | ---: | --- |
| Forward hatch | 32 square | LMA790-3-LM (LM 10 and subsequent), vol. I, 1.2.2.1.2: "approximately 32 inches square; it is hinged to swing inboard" |
| Its hinge | on the pilot's side, the right | the ALSJ, Apollo 11 at 109:03:02: it "will swing inward and toward him" (Aldrin, on the right) |
| Its swing in | 80° | Estimated: not found in what was read; the build checks every 5° of it clears the cabin (`check_hatch_swing`) |
| Ladder | 9 rungs, 9 apart, rails 20 between centres | Grumman, *Apollo News Reference*, Lunar Module, p. LV-12 |
| Lowest rung from the footpad | 30, along the strut | The same page: "the ladder extends down to within 30 inches of the footpad" |
| Ladder's rails from the strut's axis | 9 | Estimated, to clear the flag kit under its left rail |

The ladder lies along the forward primary strut from the porch to 30 in short of the pad's pivot, its rails up to the porch
(the handbook, 1.3.2.2.7: "from the forward end of the platform"), and leans with the strut, 27° from the upright. It is its own
mesh, `LM_ForwardLadder`, marked `climb` with where its rungs are (`climb_pitch`, 9 in along the strut, 8.0 in up;
`climb_first`), and the viewer climbs it as a ladder that leans (walking.md, "Ladders are climbed"). From its lowest rung to the
pad's top is about 27 in: the last long step down, and a jump back up to the rung (on Apollo 11 no primary strut stroked at all,
TN D-6850 table V, so the step was its full height). The porch's upper surface was "corrugated to facilitate hand and foot holds"
(News Reference, LV-12): a plate under the model's bars, `LM_EVAPorchDeck`, which a walker's feet find between them. The hatch
is the node `LM_ForwardHatch`, its origin on its hinge line, opened and shut by hand on the porch (the part's `Open the hatch`),
and the stations are boarded and left through it (`seats[].from`, `egress: ['surface']`).

How each stood at rest (its heading, pitch and roll) is its landing site's (missions/usa/places/moon/, `rest`), from its mission
report; app/surface.ts stands it so, its pads set on the ground as a whole.

## Reconstruction limits

The flight drawing controls the major envelopes. Panel boundaries, foil folds, local tank and equipment positions, pipe and harness paths, brackets, instrument faces, restraints and the eye positions are estimates. The alignment telescope is shown from the crew side. Its exterior optical head and light path through the roof are omitted. The equipment schematics establish counts and connections but do not dimension every installation. The model depicts the principal assemblies. It omits individual electrical circuits, complete environmental plumbing, deployable personal equipment, and detailed internal engine mechanisms. The thrusters' nozzles (5 in across, 7 in long), their housings and the three struts of each outrigger, with where the struts are rooted, are estimates. The transfer handrail that ran from near the forward hatch to near the docking interface, which Schweickart went along, is omitted. The illustrative gear, antenna and staging motions have estimated angles and timings. The two station availability intervals approximate the span between each astronaut’s first ingress and final transfer in the mission report’s activity chart, including periods spent elsewhere. The Gallery does not simulate occupancy. On the six that landed: the ladder's top rung is about 38 in below the porch, where the News Reference has it 18 in below the porch's forward end, because the model's descent stage stands some 10 in higher than TN D-7084's fig. 3 has it (its deck 127 in over the pads against about 117 in): the ladder keeps its documented foot and rungs and its rails run on up to the porch. The porch is the model's 31 by 28 in; the News Reference has 32 by 45 in and the handbook "approximately 3 feet square", which disagree, and neither is followed. The hatch's swing is estimated, and to swing it at all the model's lower edges of the main and centre panels are kept an inch above its top and the floor's switch rows moved clear of its sweep (lm_cabin.py `hatch_top`): the handbook has the hatch "just below the lower display panels", and the panels were estimates that came down in front of it; the stowed LMs in the launch stacks and Spider, Snoopy and Aquarius keep the panels as they were. The pads are stood on the ground as a whole, not each crushed into it, and the probes are drawn as deployed, not bent as they were on landing. The heading at rest is the approach's, which no report gives as a figure. [Apollo Operations Handbook, LM](https://web.mit.edu/digitalapollo/Documents/Chapter8/lemhandbook.pdf)

## As the simulator flies it

The lunar module is a plan of its own (lm-plan.ts, from a flight's lm-record.ts; Apollo 11's is apollo-11/lm.ts), flown live by sim/craftlive.ts and sim/attitude.ts, and on its legs by sim/surface.ts (docs/agents/simulator.md, "The lunar module, and its legs on the ground"). Its descent engine is rated 10,500 lbf and throttles from 10 to 65 per cent, with its full throttle position at 92.5 (R-567 §6.4.6.1; TN D-7143; the handbook, §2.1); its ascent engine gives 15,568.8 N at 309 s (R-567 §6.4.7.1); its sixteen thrusters stand at R-567's places (lm-rcs.ts). The legs: each footpad at the 167.57 in tread on the body's axes, on the pads' plane 73.85 in up LM coordinates, its primary strut crushing at 4,500 lbf to about 10 in and 9,500 lbf to 32 in (TN D-6850 fig. 7); a 5.6 ft probe on the legs the flight's record names.

What the simulator gets wrong or leaves out of it:

- The primary strut's line (27.4° off the X axis) is the model's reconstruction, and the step between its two cartridges is read off a figure; the leg pushes only along the ground's normal (the secondary struts' share, which take the pad's sideways load, is not flown), the footpad is a point, and the soil gives nothing of its own.
- The leg's stiffness before its strut crushes (2 cm under its first stage's load) and its damping ratio (0.3) are ours.
- The descent engine's full throttle position is flown at 92.5 per cent of 10,500 lbf (9,712 lbf); the handbook's nominal figure there is 9,870 lbf. Its thrust is along +X through the centre of mass: its gimbal's trim is not flown, nor its start and stop transients (R-567's step delays), nor its erosion with burn time, nor any thrust amplified near the ground.
- The ascent and descent stages' masses at separation take the ascent stage's at lunar lift-off for its own (apollo-11/lm.ts); what the surface stay changed is not accounted.
- The thrusters' torques are worked about one centre of mass (the separation's): the ascent stage alone, its centre some 60 in higher, keeps the up- and down-firing thrusters' arms but not the level ones' small coupling into pitch and roll. The 0.3° deadband is taken for all three axes (the handbook gives 0.4° in yaw), the 5°/s rate limit for pitch too (10°/s there), and the rate deadband is the CSM's (estimated). The +X thrusters' plumes on the descent stage, the APS/RCS interconnect and what the thrusters' propellant takes off the mass are not flown.
- "Fire in the hole": the share of the ascent engine's jet that escapes between the stages (0.8, 10° below the level) and the second at full thrust the descent stage stands it for are ours.
- Each engine may be started ten times (the handbook sets no number).
