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
not modeled. On orbit nothing is joined to the venting or separation
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
is put on. With no venting, no propellant-settling translations and each burn aimed
as the plan has it, the run drifts from the tracking along its orbit: 1,170 km
ahead by the first SPS firing at 26:24:55, 3,100 km ahead by the fourth, and
4,200 km behind by the deorbit firing, with at most some 120 km across the track. The
orbit's shape is kept by the burns, so the entry comes where the lowered perigee is
and the splashdown is near the recorded place (below). The simulator treats
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
The two early phasing burns, terminal initiation and net rendezvous braking
are modeled as finite RCS impulses. Individual braking pulses and fine
corrections are unresolved. [Apollo 7 Mission Report, §§3.2, 5.16 and 5.18](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

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
splashes down 652 s after the reported 260:09:03, about 92 km from the recovery
force's approximate position (28 km short along the track and 88 km across it:
it enters where the orbit's perigee is, eleven minutes later than the flight did,
and the Earth has turned under it). With every tracking state joined, as until
November 2026, it was 41 s late and 47 km off: that agreement was the tracking's,
not the simulator's. The twin drogues
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
