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

The stack follows approximate readings from the measured inertial pitch curves
and the 72° flight azimuth after the initial roll. The simulator interpolates between points read off the figures. The method omits yaw departures, individual
gimbal angles and Saturn's iterative guidance equations. Aerodynamic drag of the
stack is approximate. The raw integration reaches 7,779.13 m/s at J-2 cutoff,
1.19 m/s below the flight report. The raw inclination is 32.467° against 31.58°,
0.887° high. Raw ellipsoidal altitude is about 240 km against the report's 228 km.
The replay flies the vertical programme from the modeled launch mount through
10.31 s. Table XI of the postflight trajectory gives about 121 m of rise and 5 m
of lateral displacement in the first ten seconds. The simulation rises 127 m and
drifts about 0.24 m. After the vertical programme it interpolates the differences
between the integrated trajectory and seven measured position and velocity
states from 50 s to insertion. Table XIII tracks the vehicle centre of gravity.
The model uses the stack base as its ascent datum, an offset of tens of metres.
The postflight table gives 61.9777° W at guidance cutoff and 61.2293° W at
insertion ten seconds later. On orbit the replay joins the venting and separation
fixes. [Postflight trajectory, §2 and Tables XI and XIII](https://apollojournals.org/afj/ap07fj/pdf/as205-postflight-traj-rep-19920075302.pdf). The
attached stack aligns to local horizontal, later pitches nose down and holds
that inertial attitude before release. The brief crew takeover of the S-IVB
controls is on the timeline. The replay does not reconstruct those individual
hand inputs. [AS-205 flight evaluation, Figs. 12-1, 12-4 and 12-6 and §12.2](https://apollojournals.org/afj/ap07fj/pdf/a07-as205-saturn-ib-results-19900067467.pdf)
and [Apollo 7 Mission Report, Tables 2-II and 3-II](https://apollojournals.org/afj/ap07fj/pdf/a07-mission-report.pdf).

## Coasting, maneuvering and separation

The historical coast integrates the engine impulses, gravity and atmospheric
drag, and joins the reported ignition states across the 11-day mission. The
transition between tracking fixes is continuous in position and velocity.
These fixes contain reconstructed radar-based states. Applying them to a
historical run keeps the spacecraft near the recorded ground track despite
accumulated drag, steering and atmospheric errors. The simulator treats
positions published on the Fischer ellipsoid as corresponding WGS 84
positions. Takeover retains the trajectory and fuel usage up to the handover,
then uses the current state under the same forces to integrate forward.
Subsequent tracking fixes cannot pull a player-flown trajectory back toward
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

The peak load is 3.20 g versus the reconstructed trajectory's 3.33 g. The
flight report gives 3.41 g in the structural analysis. The simulated capsule
splashes down 41 s after the reported 260:09:03, near 27.62° N, 63.61° W,
about 47 km from the recovery force's approximate position. The twin drogues
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
