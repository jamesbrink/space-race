# Apollo 7 flight physics

Apollo 7 lifted off from Complex 34 at 15:02:45 UTC on 11 October 1968. The
flight plan uses seconds from liftoff. Its Saturn IB records use the range
clock at the precision the launch-vehicle reports give, while the spacecraft
events use ground elapsed time. The mission report rounds CSM/S-IVB separation
to 02:55:02. Chrysler gives 02:55:02.4. [Apollo 7 Mission Report, Table 2-I](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf)
and [Saturn AS-205/CSM-101 Postflight Trajectory, Table VI](https://apollojournals.org/afj/ap07fj/pdf/as205-postflight-traj-rep-19920075302.pdf).

## Launch and attached orbit

The integration uses one S-IB tank for the two sets of four H-1 engines, then
one J-2 on the S-IVB. The separate sets shut down at 140.64 and 144.32 s. The
S-IVB lights at 146.97 s, switches to the lower mixture-ratio setting at
455.77 s, and cuts off at 616.75 s. The J-2's lower setting uses the ratio of the
tabulated thrust levels and one specific impulse across both settings. In this
approximation, fuel and oxidizer are one mass, with unusable propellant excluded
from the available total. Ignition and cutoff transients, engine cant and
closed-loop guidance are simplified. [AS-205 flight evaluation, §§6, 8–9](https://apollojournals.org/afj/ap07fj/pdf/a07-as205-saturn-ib-results-19900067467.pdf)
and [S-IVB-205 stage evaluation, §14](https://www.nasa.gov/wp-content/uploads/static/history/afj/ap07fj/pdf/a07-s-ivb-flight-eval-rep-19700076411.pdf).

The whole flight is one integrated state, from the pad to the sea, changed only by the
forces modeled: thrust, gravity, the air, the joint's push at each separation, lift and
drag in entry, and the parachutes. Nothing joins it to a tracking state. The tracking
points of the postflight trajectory and the mission report are kept as a reference
(`record.coastFixes`): a sample is kept at each of their instants, the difference is
the run's residual (`node tools/residuals.mjs apollo-7`), and no state is written from
them. Until November 2026 the replay interpolated itself onto seven measured states
during the ascent and joined each later one in orbit; that is gone.

The first stage follows approximate readings from its measured inertial pitch curve
and the 72° flight azimuth after the initial roll, flown open, as the S-IB's tilt
programme was. The simulator interpolates between points read off the figure. From the
J-2's start the S-IVB is steered by a closed loop standing in for Saturn's iterative
guidance: a linear-tangent law in pitch and a constant yaw out of the launch plane,
solved so that the cutoff comes at the reported height over the Fischer ellipsoid
(748,374 ft), level, in the reported plane (31.58°). The law's first command steps the
thrust 7.3° up as it takes over; the report's attitude figure shows about 8°. The yaw
is what turns the plane from the 32.5° an unsteered ascent on that azimuth reaches,
as the vehicle's own did: at cutoff the run is 3 km across the track from the
tracking, where the unsteered ascent was 59 km. The J-2 is cut by the guidance when the orbit reached has the reported
period, at 615.8 s against the recorded 616.75 s. Individual gimbal angles, the
guidance equations themselves and the propellant-utilization shift's transient are
simplified, and the stack's drag is approximate.

The run rises 127 m in the vertical programme and drifts about 0.24 m; Table XI of
the postflight trajectory gives about 121 m and 5 m in the first ten seconds. Against
Table XIII (which tracks the vehicle's centre of gravity, where the model flies the
stack's base, tens of metres off) the run is 0.4 km and 14 m/s out at the first
stage's separation, and at guidance cutoff 9.5 km further along the track, 3.2 km to
the right, level with it, and 19 m/s out. The J-2 is cut by guidance when the
orbit has the period of the tracked insertion, 89.525 min: the state of Table XIII
at 626.76 s read as a mean orbit, perigee to perigee (derived). The mission report's
Table 2-II prints 89.7, a tenth of a minute, where its own heights go round in
89.56; cut on 89.7 the run began ten seconds a revolution long.

What the S-IVB let out while the spacecraft was still on it is flown as a force on
the stack along its axis (`Craft.vents`), in the batch run, the live vehicle and the
path under guidance alike, from what the flight evaluation's platform measured: 1.1
m/s in the oxygen tank's 30-second vent half a minute after cutoff; 6.6 m/s in the
oxygen dump through the engine from 5,668.95 to 6,388.95 s, 3.5 of it in the first
131 s; 0.2 m/s more by 6,671 s and 13,789 N s after that. Each is a steady force
over its interval on the stack's mass as the run has it (derived). The axis is the
attitude programme's, which is part of the steering law: along the motion and level
from the alignment, 20 degrees down from 9,775 s, and held among the stars from the
freeze. The hydrogen tank's vents were open for three spells before the dump; what
they pushed is not in the report and is not flown.

| Tracked state | Tracked, km and min | Run |
| --- | --- | --- |
| Insertion, 626.76 s | 228.6 by 281.2, 89.525 | 228.6 by 280.2, 89.515 |
| Before the dump, 5,669 s | 229.4 by 295.0, 89.673 | 228.6 by 283.8, 89.552 |
| After the dump, 6,390 s | 229.2 by 307.1, 89.795 | 229.0 by 306.2, 89.782 |
| Separation, 10,502.4 s | 235.5 by 316.4, 89.952 | 230.1 by 307.3, 89.805 |

The run and the tracking agree after the dump to a kilometre in both heights. Before
it the tracked state is 11 km higher at apogee than the vent's 1.1 m/s makes it, and
by the separation the tracked orbit has gained 9 km more at apogee and 6 at perigee
(some 4.5 m/s) that nothing in the report accounts for: the hydrogen venting, the
helium dumps, or the crew's minutes on the stage's controls. None is flown, so the
spacecraft leaves on an orbit nine seconds a revolution short. At the separation
the run is 48 km along, 7 km across and 7 km below the tracked state. On orbit
nothing is joined to these
fixes. [Postflight trajectory, §2 and Tables XI and XIII](https://apollojournals.org/afj/ap07fj/pdf/as205-postflight-traj-rep-19920075302.pdf). The
attached stack aligns to local horizontal, later pitches nose down and holds
that inertial attitude before release. The brief crew takeover of the S-IVB
controls is on the timeline. The replay does not reconstruct those individual
hand inputs. [AS-205 flight evaluation, Figs. 12-1, 12-4 and 12-6 and §12.2](https://apollojournals.org/afj/ap07fj/pdf/a07-as205-saturn-ib-results-19900067467.pdf)
and [Apollo 7 Mission Report, Tables 2-II and 3-II](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

## Coasting, maneuvering and separation

The coast integrates the engine impulses, gravity and atmospheric drag across the
11-day mission, from the state the ascent left and from nothing else. The reported
states at each SPS ignition are a reference the run is held against, not states it
is put on. With the rendezvous flown by guidance (below) the run is 530 km ahead of
the tracking at the first SPS firing at 26:24:55, 400 km at the second, and at
75:48, as the third lights, 198 km ahead and 0.2 km in height. That firing lowers
the perigee to 90 nautical miles, and from there the run falls behind: 1,240 km by
the fourth firing at 120:43, 3,700 km by the fifth, 6,300 by the sixth, and 5,400 km
by the deorbit firing. Each firing after the rendezvous is lit by the clock and
aimed as the plan has it wherever the run then is. The air is the cause that can be
named: at that perigee the spacecraft's drag (its base end on to the air, 12 m², an
estimate of an attitude it did not hold for eleven days) and the day's density
decide the period. With its side to the air on the average (32 m²) the same run is
as far ahead as this one is behind. The same shortage shows before the rendezvous,
where the S-IVB falls back on the spacecraft too slowly. Nothing is adjusted to
either. The simulator treatsthe recorded place. The simulator treats
positions published on the Fischer ellipsoid as corresponding WGS 84 positions.
Takeover retains the trajectory and fuel usage up to the handover, then integrates
forward from the current state under the same forces, exactly as the record's own
run does: a player-flown trajectory and the record's differ only in what was
commanded, and nothing pulls either toward
the mission record. [Apollo 7 Mission Report, §§3.1–3.2 and Tables 3-I–3-V](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

One SPS engine supplies all eight firings from the measured 9,737.3 lb initial
propellant load. The first seven burns can be taken over in sequence. The last
burn deorbits the spacecraft. The model uses the measured integrated impulses
and the mass at each published ignition, accounts for fuel expenditure with the
rocket equation, and reserves one start per ignition. Constant acceleration
over each effective firing interval approximates the thrust transient. For the
two half-second commands, measured thrust persists for 2.67 and 2.82 s.
Directions use reported local-horizontal components, postflight state-vector
differences with gravity removed, or the stated maneuver geometry. The actual
spacecraft used +X service-module RCS translation to settle propellant before
each SPS burn, delivering 3.1 to 6.6 ft/s, and small corrections after some
firings. Those short translations are omitted from the SPS engine impulses.
[Apollo 7 Mission Report, §§3.2, 5.16 and 5.18](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

## The rendezvous with the S-IVB

The S-IVB is a craft of its own from the separation (`FlightPlan.target`,
`src/sim/pursuit.ts`): it leaves at the speed the joint pushes the two apart at
and is flown on by gravity and the air alone, until it comes down. Nothing the
spacecraft does moves it, and nothing the record saw of it is written into it.
Its mass is the stage, instrument unit and adapter with all the propellant gone
(derived, 12.5 t). Its drag is an estimate: King-Hele's 2.2 on a quarter of its
outside (117 m²), the area a body turning every way presents, since how it lay
after its control was let go is not in anything read.

The spacecraft's burns on it are the record's, as commands. Each has what it was
for, and guidance solves its line and its length on where the two craft are as
it lights, by flying the burn ahead on the run's own forces until it does that.
The firing pushes as hard as the record's did, for as long as the solved impulse
takes. The record's impulses and ranges are checks on the result.

| Burn | What guidance flies it for | Run | Record |
| --- | --- | --- | --- |
| Beside the stage, 2:55:37 to 3:20:10 | Rest 100 ft ahead of it (the distance is the photograph's; the side and the times of the turn-round are estimates) | 3.2 ft/s; 31 m at 3:16 | about 100 ft at 3:16 |
| First phasing, 3:20:09.9 | As recorded: what it was aimed at is not in anything read | 5.7 ft/s | 5.7 ft/s |
| Second phasing, 15:52:00.9 | As recorded | 7.0 ft/s | 7.02 ft/s |
| Corrective combination, SPS 1, 26:24:55.7 | The stage 80 nautical miles ahead and 7.8 above as the coelliptic maneuver lights, and in its plane | 224.5 ft/s in 11.0 s, from a lead of 210 nautical miles | 204.1 ft/s in 9.4 s, from a lead of about 84 |
| Coelliptic maneuver, SPS 2, 28:00:56.5 | An orbit of the stage's shape, the height between them constant | 180.8 ft/s in 8.1 s | 173.8 ft/s in 7.8 s |
| Terminal phase initiation, 29:16:33 | Arrive at the stage at the report's theoretical intercept, 29:51:46 (7 min 51 s after the braking began: §3.2.1) | 17.7 ft/s | 17.4 ft/s in Table 3-IV, 17.7 in §3.2.1 |
| Braking, 29:43:55, and the station kept to 30:20 | Rest 70 ft from the stage by 29:55:43, and held | 18.0 ft/s, from 1.41 nautical miles | 18.2 ft/s resultant to 29:55:43 (49.1 ft/s spent in all), from 1.2 nautical miles |
| Separation, 30:20 | As recorded: 2 ft/s, taken along the motion (the report gives neither its instant nor its direction) | 2.0 ft/s | 2 ft/s (§8) |

The braking is a thrust commanded from the range and its rate, within what two
100 lbf thrusters give: the crew's own pulses are not on the record. The terminal
phase's midcourse correction (2 ft/s aft and 0.5 up at 29:30:42) is not flown, its
aim not being in anything read; the braking takes up what it would have. The
propellant a solved firing draws is what its own impulse costs. After the
separation the two part by the burn and the air: 125 nautical miles at 45:30 and
252 at 53:20, where the sextant's tracking ended at 160 and 320 (`src/sim/misses.ts`).

The spent S-IB, escape tower and boost cover, service module and forward heat
shield follow detached trajectories. Their contact radii, inertial moments and
drag areas approximate the modeled bodies. The tower carries its own jettison
motor. The service module's clearance uses the reconstructed 25–30 ft/s speed
increase. Radar and visual observations suggest it tumbled after separation,
with uncertain roll thruster operation. Its transient rotation and possible
shock interaction with the command module are omitted. [Apollo 7 Press Kit,
spacecraft structure and systems](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A07_PressKit.pdf)
and [Apollo 7 Mission Report, §3.4](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

The service-module translation plume follows the flight’s effective thrust
during phasing, terminal initiation and braking. The display uses the four
aft-facing nozzle mouths of the modeled quads. Their outward cants cancel
in axial translation. The simulated CSM turns into the reported net thrust
direction over an estimated 30 seconds before each maneuver. The plume level
follows the averaged force. The roughly 12-minute intermittent braking
sequence appears at reduced intensity.
The report does not give a time history of thruster selections and pulse widths
for those maneuvers. The exhaust expansion pressure is a display estimate.
[Apollo 7 Mission Report, §3.2.1 and Table 3-IV](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf)
and [Service-module RCS geometry](../../vehicles/reaction-control.md).

## Entry and splashdown

Entry starts from the reconstructed 400,000-ft interface. The plan uses the
reported orbital state and onboard flight-path angle. The measured
lift-to-drag trend is read from Fig. 5.2-1, with the low-Mach end held below the
figure's range. Drag coefficients come from the later CM-107, which has the same
Block II outline and a different center of mass. The crew's initial
lift-up attitude, approximately 55° backup bank and the digital autopilot's
reversals are represented by readings from the plotted roll trace. The
simulator does not run the Apollo guidance computer or reconstruct the actual
upper-air winds and transonic RCS pulses. [Apollo 7 Mission Report, §§3.3,
5.2 and 5.16 and Figs. 5.2-1 and 5.16-28](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf),
[Apollo 7 Entry Postflight Analysis](https://apollojournals.org/afj/ap07fj/pdf/a07-entry-postflight-analysis-19740072689.pdf)
and [NASA TN D-6725, Table I](https://ntrs.nasa.gov/api/citations/19720013191/downloads/19720013191.pdf).

The flight report gives a peak load of 3.41 g in the structural analysis and
the reconstructed trajectory 3.33 g; the run's is held against it in
`src/sim/misses.ts`. Flown from the pad on its own forces, the simulated capsule
splashes down 58 minutes after the reported 260:09:03, a quarter of the way round
the Earth from the recovery force's position: the deorbit firing is lit by the
clock, 5,400 km back along the orbit from where the tracked spacecraft then was
(above). With every tracking state joined, as until November 2026, it was 41 s late
and 47 km off: that agreement was the tracking's, not the simulator's. The first
run on its own forces came down 92 km off, by where its perigee lay. The twin drogues
have one equivalent drag area and the three mains another. The opening model
approximates staged reefing with continuous inflation. [Apollo 7 Mission
Report, Tables 2-I and 3-VI and §§5.1, 5.5 and 5.16](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

The bow-shock rendering uses the shared stagnation-heating estimate on the
184.8-in spherical heat-shield radius. The report's thermocouples measured
embedded temperatures at multiple depths. Aft shield readings at 0.05 in below
the ablator reached roughly 2,400 °F at some stations. The computed cold-wall stagnation flux peaks at about 416 kW/m² at GET
259:57:34. The glow depicts the shock layer. No match to a thermocouple curve, ablator
temperature, burn-through or mass loss is computed. [Apollo 7 Mission Report,
§5.4 and Fig. 5.4-2](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

The manual rotational controller uses the Block II SCS low-rate setting, 0.7°/s at full deflection on each axis. The higher settings and individual jet pulses are outside this controller model. [Apollo Operations Handbook, vol. 1, §2.3](https://apollojournals.org/afj/aoh/aoh-v1-2-03-scs.pdf).
