# Gemini-Titan 3 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`. Every figure there carries its confidence
and source; this file says what was read, what had to be taken from elsewhere, and what the run gives. Times are seconds
from liftoff, 14:24:00.064 UTC. The checks' tolerances were set with the record, before the plan was first flown; the
misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts), each with its cause or "cause not established".

## 1. What there is to fly it from

The mission report (MSC-G-R-65-2) has every event to the tenth of a second and the weights as flown. It has not been
found, after a third search (NTRS by title, report number and through its API, the JSC History Portal, ibiblio, archive.org;
docs/sources.md). What was read instead:

- **The guidance reconstruction** (supplemental report 4): second stage cutoff 334 s and separation 359 s (section 3.2);
  liftoff 3.452 s after going inertial (3.1); its input card (p. 75), "BOOSTER ENGINE CUTOFF=156.250", so the first
  stage's cutoff at **152.80 s** (derived). The README had 154.3 s from the press kit's plan; the card replaces it.
  Retrofire 16,403 s (PDF p. 79).
- **The voice transcript** (supplemental report 5): every burn by the crew's watches and their velocity indicator.
- **SP-121, SP-138, SP-4002, SP-4203**: the orbit, the insertion, the miss and why.
- **The Gemini IV mission report**: the next vehicles' weights (section 3.3) and engines (Tables 5.2-II and III), taken
  for GLV-3 and spacecraft 3 (`assumed`), and GT-3's trim angle of attack and centre-of-mass offset (5.1.1.3).
- **The GT-1 mission report**: GLV-1's first stage chambers as measured (Table 5-II).
- **The Technical Summary (CR-1106) and SEDR 300**: the thrusters, the parachutes, the retrofire's ripple.

## 2. The ascent

The Titan's two stages on their own propellant loads, GLV-4's weights: the first stage 262,600 lb at liftoff, 11,600 lb as
let go; the second 65,521 lb, 5,421 lb empty, 60,100 lb burned (GIV, section 3.3, worked as orbital.ts shows). The first
stage's two chambers are one engine of GLV-1's measured thrust, 418,530 lb at 5 s and 257.3 s, 281.1 s at 155 s; the
second stage GLV-4's as flown, 102,777 lb and 313.07 s. At 152.80 s the second stage is lit with the stages joined, firing
through the interstage's ports (`hot`: half its side open, 30 degrees, five seconds' endurance, all estimated), the first
stage cut, and 0.68 s later (GLV-8's interval) the first stage let go. The second stage is cut at 334.0 s; the spacecraft
parts at 359 s, pushed by the planned 10 ft/s of its aft thrusters. A stated steering law on the 72 degree azimuth: up the
plumb line to 25 s, as Grissom called the pitch, a pitch-over of 15 s (estimated), the linear tangent from staging, aimed at
87.0 nautical miles over the orbit's ball (section 3: 6,378.7 km, where it was 6,388.2 until November 2026) and +0.01
degrees at the cutoff. The cutoff is aimed at that height as a radius, where the flown perigee's radius stands the
apsides' lift, 6.0 km, lower: simplified (section 7).

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at cutoff, space-fixed | 25,682 ft/s (7,828 m/s) at insertion | 7,767 m/s | miss: 61 m/s short |
| Perigee | 87.0 nmi (161.1 km) | 28.3 km | miss |
| Apogee | 121.0 nmi (224.1 km) | 161.1 km | miss |
| Inclination | 32.6° | 32.53° | within 0.25° |

It falls short of the orbit, as the Vostoks' and Voskhod's ascents here do. The figures are GLV-4's and GLV-1's, not
GLV-3's, whose thrust and impulse the launch systems report says were "higher than predicted", by how much not said.
Nothing is adjusted. So from the spacecraft's separation the run shown is the published orbit begun where the ascent left
it (staged.ts `published`): a handover, not a result.

## 3. The orbit and the three burns

The published orbit, 87.0 by 121.0 nautical miles, 32.6°, 88.3 min (SP-4002), begun at insertion, 353.8 s.

**What the heights are over: the oblate earth, as the apsides flown** (`orbit.over`, assumed). This flight's report is
not found; the next two say what their final elements are: "measured over an oblate earth", the Fischer ellipsoid (Gemini
IV, MSC-G-R-65-3, sections 4.3 and 4.3.1.2), the apogees and perigees "obtained by integrating the best Gemini tracking
network vectors throughout the mission to the apogee and perigee that followed" (Gemini V, MSC-G-R-65-4, 4.3.1.2), and
SP-4002's insertion rows, this flight's among them, are those reports' final elements. A height flown is the least or
greatest radius less the ellipsoid's there. The simulator reads a height off a mean orbit, a(1 - e) or a(1 + e) less a
ball, and at 32.6° J2's short-periodic terms put the radius flown at the apsides 6.0 km under the mean orbit's
(world/meanelements.ts `apsisLift`). So the ball is the ellipsoid's radius under the apsis, 6,372.7 km at the perigee's
30.4° (WGS 84's; Fischer's is some 30 m higher), and that lift: **6,378.7 km** (`flownApsisBall`, derived on the
reports' reading). Until November 2026 it was the ball the heights and period imply as a nodal period, 6,388.2 km, 10 km
above the equator, which no height could be measured from.

A trial read the heights as mean heights over the ellipsoid, 6,372.7 km, the axis that ball plus the mean height and the
period a check. It was reverted, and is the wrong reduction: the reports' apsides are flown ones, and as mean heights the
orbit is 6.0 km low. Flown so, the coast's nodal period was 5,279.2 s against 5,298 (18.8 s short), the perigee after the
third burn 13.4 km low (was 11.9), the drogue out 90 s early, 367.6 km short of the landing and 73.4 km to the right (was
219.6 and 81.5). Every Gemini set misses by 4 to 5 s beyond its rounding so read (tests/periods.test.mjs).

**The period is flown perigee to perigee** (`orbit.kind` anomalistic, assumed from the Gemini IV and V reports). On the
oblate earth the heights' mean orbit has an anomalistic period 1.2 s shorter than the 88.3 min, a Kepler one 3.4 s longer
and a nodal one 11.5 s shorter: printed to a tenth of a minute (3 s), this flight's own figures cannot choose between the
first two. Gemini IV's final insertion set (152.2 by 87.6 nautical miles, 88.90 min, its perigee at 29.0° by the
separation's 30.97° N and 0.07° path) can: anomalistic 1.1 s short, Kepler 3.5 long, nodal 11.3 short, the anomalistic
nearest for every period within its rounding. Gemini V's (188.9 by 87.4, 89.59 min) is nearest it too, 2.1 s short against
2.5 long, too close to decide. Neither comes within its rounding (0.4 s): the reports do not say what their period is,
and the Kepler period of the osculating orbit at insertion, which is not a mean orbit's and is not flown, comes nearer for
all three (+0.6, +0.7 and −0.2 s). Which the reports printed is not settled; between the two the axis differs by some
1.5 km. That it is not node to node is settled: nodal misses every Gemini set by 11 to 13 s.

What the readings move (tests/orbital.test.mjs, "what a change in an input moves"; a diagnosis only, not a reason for
either): with the period node to node the drogue comes out 70 km further on, 4.5 km more to the right and 44 s later,
exactly as on the reading until November 2026 (no ball stated, nodal), since a ball moves only the heights read off the
run, not the orbit a period fixes; as a Kepler period, 39 km shorter. The coast's nodal period is now 5,287.7 s (88.13
min), where read as nodal it was the published 5,298.

The spacecraft in orbit weighs its
launch weight, 7,111 lb. In the free-molecule flow of the orbit it drags 2.2 (King-Hele's, assumed) on the adapter's 120 in
foot, nose or tail first along the motion (7.30 m², derived).

Each burn is flown at the instants the crew timed it and the impulse their velocity indicator gave, along the attitude they
held, fixed as it lit:

| Burn | Thrusters | Attitude | From, to | Impulse |
| --- | --- | --- | --- | --- |
| First | forward-firing pair (2 × 79 lb, the type's) | small end forward, along the motion | 1:33:00 to 1:34:14 | 49 ft/s against the motion |
| Second | forward-firing pair | yawed square to the motion | about 2:17:00, 14.0 s (derived) | 10 ft/s across |
| Second, trim | aft-firing pair (2 × 95 lb) | the same | a second after, for 1 s | its thrust, 0.26 m/s |
| Third | aft-firing pair | blunt end forward, against the motion | 4:21:23 to 4:23:14 | 97 ft/s against the motion |

Which way the ship was yawed for the second burn, and so whether the plane turned north or south, is not read: estimated.
At the type's thrust the first burn would have been 54 ft/s, not the indicator's 49: the chambers' cant, or the thrust.

| After | Record | Flown (from the published orbit) | Shown (from the ascent) |
| --- | --- | --- | --- |
| the first burn, read at 1:40:00 | 85.6 by 92.6 nmi (158.5 by 171.5 km), the ground's call | 161.8 by 173.7 km | 165.5 by 170.2 km: perigee a miss |
| the third burn, read at 4:25:00 | vacuum perigee 45 nmi (83.3 km), SP-138 | 72.0 km: miss | 67.4 km: miss |

The third burn's miss, 11 km low, is recorded with its cause not established: what the indicator's 97 ft/s measured along
(with canted chambers) and what ball SP-138's perigee is over are not read.

## 4. Retrofire

The equipment section goes 30 s before retrofire (the type's sequence, SP-121 Figure 3-3: assumed). The four retrograde
rockets fire from 16,403 s, 5.5 s apart for 5.5 s each (SEDR 300), as one burn of their whole impulse spread evenly over
22 s: 56,800 lb s (the type's, SP-121 Table 4-I) over spacecraft 4's 5,432.44 lb at retrofire, 102.5 m/s, 336 ft/s (derived;
SP-138 has "approximately 320 ft/sec" for the type). The push is back along the motion and 30 degrees below the level: the
next flight's "about 30° pitch", its sign lost in the text read and taken as Mercury's (estimated). The retrograde section
goes at 4:34:15, when the crew called it.

## 5. The entry and its lift

The re-entry module, spacecraft 4's 4,725.71 lb at 0.05 g (assumed), on the Mercury capsule's drag curve on its own 90 in
shield (estimated), trimmed 8 to 9 degrees (GIV, documented for GT-3) on its centre of mass 1.43 in off its axis. **The lift
flown is 0.19 lift over drag**, the programme's average as flown (SP-138, p. 159), taken for spacecraft 3: its own as flown
is in the mission report. **The lift predicted, which is not flown, is 0.29**: SP-138 has GT-3 making "approximately 35
percent" less lift for its drag than predicted, a loss of some 160 nautical miles of reach (p. 163), and 0.19 / 0.65 = 0.29.
Both figures rest on the 0.19, which is an estimate for this ship.

The crew were to fly the backup bank angle and then the computer's commands (SP-138, p. 163); the angles flown are not
read. The bank is held at 60 degrees to the right from the retrograde section's going (estimated): the target lay on the
footprint's 60 degree contour and south of its centreline. Held lift up it comes down 390 km further on; held level, 246 km
shorter (tests/orbital.test.mjs, "what a change in an input moves").

## 6. The descent

The drogue at an indicated 60,000 ft, as Grissom called it at 4:46:48 (an 8.3 ft conical ribbon at 0.5, estimated, full by
its 16 s reefing); the main at the type's 10,600 ft, its 84.2 ft ringsail at the 31.6 ft/s the Technical Summary gives for a
module of 4,400 lb (344 m², derived), disreefed at 10 s; the module at spacecraft 4's 4,415.30 lb (assumed). The model carries the rendezvous and recovery section away under the old drogue when the main comes out. The separate pilot parachute and the swing to two-point suspension at 4:48:47 are omitted.

| | Record | Flown | Shown |
| --- | --- | --- | --- |
| Drogue | 4:46:48 | 4:45:58 | 4:46:07 |
| Drogue, along the track from where it landed | | 289 km short: miss | 253 km short: miss |
| Drogue, across the track | | 77 km right: miss | 54 km right: miss |
| Landing | 4:52:31 | | 4:52:58, 27 s late: within 60 s |

**Where it lands.** The record is 60 nautical miles (111 km) short of the planned point, SP-138's Table 13-I, SP-4002 and
SP-4203's own appendix; the "about 84 kilometers short" of SP-4203's narrative (p. 236) is 45 nautical miles, SP-138's
vacuum perigee on the same page, and is not followed (README, "Where sources disagree"). The checks hold the drogue's place
to where the ship landed (22°26′ N 70°51′ W), within 40 km along and 25 km across, and it misses both. The record cannot
hold the landing to a hundred kilometres: the bank angles are not read, the lift is the programme's average, the retrofire
attitude's sign is ours, and where on the orbit it began is reckoned (a degree is some 110 km along the track at retrofire).

## 7. What is simplified

- The heights' ball is WGS 84's ellipsoid under the apsis, not the reports' Fischer ellipsoid (some 30 m higher at 30°),
  and the apsides' lift over it is Kozai's first-order J2 at the mean apsides, one figure for both (they differ by tens of
  metres). The ascent's cutoff is aimed at 87.0 nautical miles over that ball as a radius, 6.0 km above the radius a flown
  perigee there has.
- The ascent's drag curves, the pitch-over, the interstage's hot staging and the steering authority are estimates.
- The spacecraft's mass in orbit is its launch weight: what it left on the second stage, the fairings and the propellant
  each burn burned (some 130 lb) are not taken off; each burn's impulse is the indicator's, so the mass moves only drag.
- The separation's push is the plan's 10 ft/s, shared by the masses; how long Grissom held it on is not read. The published
  orbit is taken at insertion, before it.
- The fairings go at 6:21 and fly separately. Their mass, free speed and drag are estimates; the nose cap leaves the face axially and the scanner cover moves out from the neck. The equipment section is let go at the type's 30 s before
  retrofire. The equipment and retrograde sections each drift aft at an estimated 0.5 m/s at release. Their relative velocities were not found.
- Each burn's line is fixed as it lights: the crew held their attitude on the horizon, which turns 5 degrees in the first
  burn's 74 s.
- The lift is constant over Mach number; the bank is one angle held from the retrograde section's going to the drogue; below
  the drogue nothing lifts.
- The two-point suspension is omitted. The old drogue and recovery section are drawn drifting away at deployment, with an estimated descent speed.
- On the flight deck the burns are fired by hand with Space along the long axis as the hand holds it, each with the record's
  impulse and length; there are no translation keys for the hand controller, and the bank in the entry is the record's.
