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
the right, level with it, and 19 m/s out. It is left on 228 by 298 km and 89.70 min,
where the report has 228 by 285 km and 89.7 min. By the spacecraft's separation at
02:55:02.4 it is 32 km along, 7 km across and 9 km below the tracked state: the
S-IVB's venting and propellant dump, which raised the real orbit in those hours, are
not modeled. What they were worth can be read off the record itself. The tracked
states, read as mean orbits the way the published one is read (derived), go round
in 89.53 min at insertion (228.0 by 280.7 km), 89.67 min at 5,669 s and 89.80 min
at 6,390 s (the two states either side of the oxygen dump), and 89.95 min at the
spacecraft's separation (235.0 by 315.8 km): 26 s of period gained in two and
three-quarter hours, some 12 m/s along the motion, of which the dump's twelve
minutes are 3.5. The run flies none of it. It is cut on the report's 89.7 min,
which is printed to a tenth of a minute and is 10 s over what the tracked
insertion gives, so the run begins a little high and ends a little low, and the
two partly cancel: this is the first thing to fly next, as a force on the
attached stage, in the run, the live vehicle and the path ahead alike. On orbit
nothing is joined to the venting or separation
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
is put on. With no venting, no propellant-settling translations and each burn after
the rendezvous aimed as the plan has it, the run drifts from the tracking along its
orbit: 1,350 km ahead by the first SPS firing at 26:24:55, 3,800 km ahead by the
fourth, and 1,500 km behind by the deorbit firing, with at most some 210 km across
the track. The rendezvous (below) leaves the spacecraft on its own S-IVB's orbit,
which is the insertion's without the venting, and the entry comes 1,300 km beyond
the recorded place. The simulator treats
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
| Corrective combination, SPS 1, 26:24:55.7 | The stage 80 nautical miles ahead and 7.8 above as the coelliptic maneuver lights, and in its plane | 217.4 ft/s in 10.7 s | 204.1 ft/s in 9.4 s |
| Coelliptic maneuver, SPS 2, 28:00:56.5 | An orbit of the stage's shape, the height between them constant | 174.1 ft/s in 7.8 s | 173.8 ft/s in 7.8 s |
| Terminal phase initiation, 29:16:33 | Arrive at the stage after 130° of its travel (assumed: Gemini's transfer; Apollo 7's own figure is not in anything read) | 18.2 ft/s; the stage 28.5° above the level ahead as it lights | 17.4 ft/s (the standard line of sight is 27.45°) |
| Braking, 29:43:55, and the station kept to 30:20 | Rest 70 ft from the stage by 29:55:43, and held there | 21.3 ft/s, from 1.10 nautical miles | 18.2 ft/s to 29:55:43, from 1.2 nautical miles |

The braking is a thrust commanded from the range and its rate, within what two
100 lbf thrusters give: the crew's own pulses are not on the record. The terminal
phase's two midcourse corrections are not flown; the braking takes up what they
would have. After 30:20 the run lets the stage go at rest and the two part by the
air alone: 81 nautical miles at 45:30 and 193 at 53:20, where the sextant's
tracking ended at 160 and 320. Those two ranges fit a parting by the air a fifth
faster than the run's and a separation of some 2 ft/s as the station ended. No
such burn is in the plan, and no figure for one is in anything read
(`src/sim/misses.ts`).

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
splashes down 420 s after the reported 260:09:03, about 1,320 km from the recovery
force's approximate position (1,307 km beyond it along the track and 106 km to the left).
With every tracking state joined, as until November 2026, it was 41 s late and
47 km off: that agreement was the tracking's, not the simulator's. Before the
rendezvous was flown by guidance it was 652 s late and 92 km off, entering where
its orbit's perigee lay. The twin drogues
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
