# Gemini-Titan 5 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`. Every figure there carries its confidence
and source; this file says what was read, what had to be taken from elsewhere, and what the run gives. Times are seconds
(or hours, minutes and seconds) from liftoff, 13:59:59.518 UTC. The checks' tolerances were set with the record, before
the plan was first flown; the misses are in [src/sim/misses.ts](../../../../../src/sim/misses.ts), each with its cause.

## 1. What there is to fly it from

Unlike Gemini 3's, this flight's mission report was found and read: *Gemini Program Mission Report, Gemini V*
(MSC-G-R-65-4, October 1965; the Virtual AGC project's scan at ibiblio.org). Its text layer garbles digits (3 for 8,
_ for 5), so every table below was read on the page:

- **GLV-5's weights** (section 3.3, p. 3-27) and **spacecraft 5's** (p. 3-28), at launch, retrofire, 0.05 g, the main's
  deployment and touchdown.
- **GLV-5's engines**, postflight reconstructed (Tables 5.2-I and 5.2-II, p. 5-131), and its **pitch programme** as flown
  (Table 5.2-IV, p. 5-133).
- **The sequence of events** to the hundredth in the launch phase and to the second after (Table 4.2-I).
- **The trajectory**: cutoffs and separation (Table 4.3-I), the orbit revolution by revolution, final and over the oblate
  earth (Table 4.3-II), the pod's ejection (4.3-III), the four manoeuvres of the third day (4.3-IV), the translations by
  the accelerometers (5.1.5-VII) and by the OAMS's own account (5.1.8-II).
- **The retrofire** (Tables 5.1.5-IX and 5.1.8-V) and **the entry**: the bank angles flown (5.1.5.2.3; the crew's account,
  7.1.1.7 and 7.1.2.7), the lift and trim as computed (Figure 5.1.1-1), the computer's state (Table 5.1.5-X), and what went
  wrong (6.2.2.2.1).
- **The launch azimuth**, 72°, on its Figure 6.2-1.

Taken from elsewhere: the first stage's vacuum impulse (GLV-1's, the GT-1 report: GLV-5's table has only its flight
average), the forward thrusters (the type's: never lit on this flight), the drag curves (the Mercury-Atlas's and the
Mercury capsule's, as Gemini 3's), the parachutes' areas (NASA CR-1106) and the ripple's spacing (SEDR 300).

## 2. The ascent

The Titan's two stages on GLV-5's own weights: the vehicle 341,163 lb at liftoff with spacecraft 5 (7,947.17 lb), 84,675 at
first stage burnout, 72,699 as the second stage reached steady combustion, 13,633 at its shutdown. So the first stage
268,464 lb at liftoff and 11,976 lb as let go; the second 59,066 lb burned to its shutdown, and with it **the one second of
burning it still had**: "Burn time remaining ... 1.0" s at the shutdown (Table 5.2-II), 330 lb at its flow, counted
usable (`S2_RESERVE`), not dry. The first stage is one engine of GLV-5's 438,281 lb at the standard inlet condition and
260.84 s, its vacuum impulse GLV-1's 281.1 s; the second GLV-5's flight average, 103,099 lb and 312.61 s. Staging as
recorded: the shutdown and the second stage's start at 153.55 s, the stages parting at 154.29 s.

The first stage flies **its pitch programme as flown**, open, as the gyros did: up the plumb line to 23.09 s, then 0.75,
0.56 and 0.25 deg/s to 88.35, 119.06 and 162.61 s (Table 5.2-IV, integrated: 77.0 degrees of tilt), held to the radio
guidance's first command at 168.40 s; from there the law's linear tangent, aimed at the record's cutoff, 530,298 ft over
the ellipsoid and -0.02 degrees (Table 4.3-I). The second stage is cut by the guidance when the orbit reached has the
published period, as the radio guidance cut it.

| | Record | Flown | |
| --- | --- | --- | --- |
| Second stage cutoff | 333.28 s | 333.37 s | the guidance's, on the orbit |
| Speed at separation, space-fixed | 25,805 ft/s (7,865.4 m/s) | 7,866.5 m/s | holds |
| Perigee at insertion | 87.4 nmi (161.9 km) | 155.7 km | holds |
| Apogee at insertion | 188.9 nmi (349.8 km) | 347.0 km | holds |
| Inclination | 32.59° | 32.590° | holds |
| Exit acceleration | 7.6 g | 7.69 g | holds |
| Greatest dynamic pressure | 766 lb/sq ft (36.7 kPa) | 37.7 kPa at 79 s | holds |
| First stage cutoff: speed | 9,933 ft/s (3,027.6 m/s) | 3,000 m/s | holds |
| First stage cutoff: height | 215,550 ft (65.7 km) | 58.8 km | **misses**, 6.9 km low |
| First stage cutoff: climb | 19.87° | 15.32° | **misses**, 4.5° flat |

**The pitch rates disagree with themselves.** Table 5.2-IV prints the actual rates as 0.75, 0.56 and 0.25 deg/s against
the planned 0.709, 0.516 and 0.235, but gives the differences as +0.041, +0.044 and +0.015, and section 4.1 has the first
stage "slightly lofted because of low-pitch program rates, headwinds, and the first-stage thrust being higher than
expected". The rates as printed are higher than planned, not lower. Flown as printed (here), the first stage comes to its
cutoff 6.9 km low and 4.5 degrees flat; flown at the planned rates it comes to 63.6 km and 18.7 degrees, 69 m/s slow
(a diagnosis: not flown). Which reading is right is not settled, and nothing is adjusted; the second stage's law makes up
the difference and reaches the published orbit within a tenth of a second of the record's cutoff.

**Without the second's reserve** the second stage runs dry at 332.6 s, 54 m/s short of the orbit, its perigee and apogee
154 by 159 km, and the ship is down within a day. 26 m/s of that is the shutdown's own impulse, "approximately 36 600
lb-sec" (5.2.2.3), 86.3 ft/s by the accelerometers from the shutdown to 355 s (Table 5.1.5-VII), which the simulator
does not fly (staged.ts: no tail-off); the rest is the model's. Counted as the record has it, usable, the stage reaches
the orbit with 42 kg left. Postflight the vehicle's payload capability was put at 8,306 lb, 359 lb over the spacecraft
(5.2.2.5).

## 3. The orbit, the pod and the burns

The published orbit, 87.4 by 188.9 nautical miles, 32.59°, 89.59 min, the final elements, **documented as over the oblate
earth** ("final elements are measured over an oblate earth", 4.3.1.2: this is the report Gemini 3's `orbit.over` assumed
from), its period taken as anomalistic (assumed, as Gemini 3's). It includes the separation's push: the aft thrusters on
from 356.11 to 367.01 s (with two seconds off), 7.6 ft/s by the accelerometers, flown as the joint's push.

**The pod** is thrown out at 2:07:15 at 4.6 ft/s (Table 4.3-III; the plan's `released`, a joint with nothing gone, as the
fairings are), drawn going from the equipment section and flown on as a shed body. It is not a target: no orbit is
written for it, nothing chases it, and the radar's lock on it to 7,721 ft is not drawn. Its weight was not found (35 kg,
estimated). The 180° yaw that followed is not flown.

**Five burns**, all on the aft-firing thrusters, the forward ones never lit ("because of the problem with the fuel-cell
oxygen-supply vessel", 5.1.8.1.2), each at the record's instant and for its length, with the impulse Table 4.3-IV (or 4.3-III)
gives as actual:

| | Lit | Length | Impulse | Attitude |
| --- | --- | --- | --- | --- |
| Perigee raised | 0:56:00 | 13 s | 9.7 ft/s | small end forward |
| Apogee lowered | 50:49:58 | 27 s | 20.9 ft/s | blunt end forward |
| Phase adjusted | 51:34:31 | 20 s | 15.7 ft/s | small end forward |
| Plane changed | 52:06:26 | 19.7 s | 15.0 ft/s | yawed 90° left |
| Coelliptic | 53:04:04 | 22.5 s | 17.2 ft/s | small end forward, pitched 15.2° up |

The last four were the "rendezvous with a point in space": the maneuvres an Agena-chasing Gemini VI would make, flown
toward an imaginary target in an orbit of 154.2 by 123.8 nautical miles (4.3.1.2.2). The four tables disagree by up to
1 ft/s on the plane change (accelerometers 15.6, the indicator 15.0, the OAMS's table 14.7, the ground's 14.6); Table
4.3-IV's actual column is followed throughout.

| Orbit read at | Record (final) | Flown on from the ascent | |
| --- | --- | --- | --- |
| 1:40:00, after the perigee was raised | 92.4 by 188.9 nmi (171.1 by 349.8 km) | 171.2 by 352.7 km | holds |
| 54:00:00, after the third day's four burns | 108.7 by 168.8 nmi (201.3 by 312.6 km) | 202.0 by 318.5 km | holds |
| 188:53:20, revolution 120 | 106.0 by 154.8 nmi (196.3 by 286.7 km) | 198.1 by 303.0 km | apogee **misses**, 16.3 km high |

**The run's ship comes down more slowly than the tracked one.** From the third day's burns to the last day its apogee falls
15.5 km where the tracking has 25.9. It is flown end on in the free-molecule flow, on the adapter's 7.30 m² disc, where for
most of the eight days it drifted, powered down, venting hydrogen and oxygen, and the ground's own drag factor for it moved
by 23 per cent after the third day (4.3.1.2). Flown on 10 m², between end on and tumbling, the apogee comes within 3 km and
the run keeps to the record's clock within a minute (a diagnosis: not flown). The attitude it drifted in is not in the
record; nothing is changed.

## 4. The retrofire, the entry and the landing

The equipment section goes at 190:26:47; the four rockets at 190:27:43.3, 48.8, 54.0 and 190:28:00.1 (Table 5.1.8-V), flown
as their total impulse, 324.5 ft/s, spread evenly from the first's lighting to the last's burning out, 33.9° below the
level (269.31 ft/s aft and 180.7 down on the indicator's axes by telemetry, Table 5.1.5-IX; the 9.94 to the left is not
flown); the retrograde section at 190:28:30. The re-entry module, 4,733.79 lb at 0.05 g, flies on its lift as read off
Figure 5.1.1-1 (about 0.2 to Mach 15, 0.12 between Mach 7 and 5, back to 0.2 below Mach 2: estimated, a preliminary
figure read by eye) on the Mercury capsule's drag curve, at the banks the crew flew:

| From | Bank | Source |
| --- | --- | --- |
| retrofire | 0°, full lift | "a 0° bank angle (maximum lift) trajectory was flown as planned" to 400,000 ft (5.1.5.2.3) |
| 190:42:04 | 54° left | the backup bank, from 400,000 ft (7.1.1.7); 4.1 has 53°, and the computer commanded 60° right |
| 190:45:00 | 88° left, no lift | "about 40 seconds" after guidance began at 190:44:20, the needle not moving (7.1.2.7); 5.1.5.2.3 has the 90° from 190:44:20 |
| 190:47:20 | 54° left | "The 90° bank angle was flown until approximately 190:47:20" (5.1.5.2.3); the crew's "about 1 min 30 sec" of zero lift would end it at 190:46:30 |
| 190:48:46 | 60° right | "the last 33 seconds before drogue parachute deployment" (7.1.1.7) |

The drogue comes out at 69,000 ft, the main at 10,600 ft.

**Why it landed short.** Not a wrong rate of the Earth's turning, as it is often told: the report says the ground's
program "was correct as written" and turns the Earth at 360.98° a day from midnight G.m.t. before the launch, so it needs
the whole elapsed time, and **the days were left out of the time of retrofire** (6.2.2.2.1). The update put the ship 7.89°
of longitude east of where it was (at 187.44° W, where it was at 195.33°: the 0.9856° a day the Earth turns beyond a
whole turn, for the eight days). The computer, steering to a target it reckoned 250 nautical miles short of, commanded
zero lift (90°) to shorten the range; the crew followed it until the needle plainly did not move, then flew the backup
bank angles. "Flying zero lift for a relatively short period of time (about 1 min 30 sec) during the most effective
period of reentry lift capability caused the major portion of the 89 miles uprange miss distance" (7.1.1.7). The retrofire
itself was on time and correct ("the final revolution 121, area 1, retrofire time was correct", 6.2.2.2.1).

**What the run does with it.** The computer and its update are not simulated: the run flies the banks the crew flew,
which is where the miss is. The retrofire is timed by the run's own state for the place the ship came down (`landing.aimed`,
sim/plan.ts `LandingAim`), as the ground timed it by the tracking for its target: after eight days the run cannot be held
to the record's clock (below), and a burn lit at the recorded instant would come down thousands of kilometres off. So:

- **Along the track, the landing is held, not a result.** The drogue comes out 0.4 km short of where the ship landed and
  0.9 km to the right of it (flown on from the ascent): within the checks, by construction along the track.
- **Across the track it is a result**, and holds: 0.9 km. From the published orbit begun at the reckoned injection
  (orbital.test.mjs) it is 43 km to the right, a miss (the injection's arc is a ground range taken for an arc).
- **The 89 nautical miles are in the banks.** From the run's own retrofire, flown on the bank the crew had been given
  (54° left) all the way, it comes down 114 km (61 nautical miles) further on and 35 km to the left; at a constant 60° right,
  the half-lift bank the planned trajectory was worked for (4.3.1.3, "a half-lift reentry according to Math Flow 6"), 55 km
  (30 nautical miles) further on and 89 km to the right; at full lift throughout, 458 km on. The record's 89 was against a
  target the computer would have steered to with its bank, which no fixed bank is: the run reproduces a shortfall of the
  same kind and of 30 to 61 of the 89 nautical miles, from the zero-lift spell as the record has it, on a lift read off a
  preliminary figure. (These are diagnoses, flown on a copy of the record with the run's retrofire instant: not checks.)
- **The clock.** The run is behind the record's clock after eight days (section 3): its retrofire is lit 589 s after
  190:27:43.3, the drogue comes out 679 s late (the entry 90 s longer than the record's, on its estimated lift and drag) and
  the ship lands 750 s late (71 s more under the main: CR-1106's 31.6 ft/s for the type, where the record has 10,600 ft to
  the sea in 3 min 58 s). All three are in MISSES.

## 5. What the run costs

The whole flight from the pad, eight days and 120 revolutions, is flown in under 4 s on hal9000 (10 s steps of the
fourth-order Runge-Kutta above 150 km). Its tests in tests/staged.test.mjs (the twelve for this flight, with the aim's trial
flights and the ascent's sensitivities) take some 28 s, in the range of the other orbital flights': no rebalance of
`SR_PART` is needed.

## 6. What is simplified or left out

- The pitch programme flown as Table 5.2-IV prints it (section 2); the roll programme, and the yaw, not flown.
- No tail-off of the second stage (36,600 lb-s); its last second's propellant counted usable instead, as the record has it.
- The pod a body let go, not a target; its weight estimated; the radar's track of it, the 180° yaw after, and its
  reentry at revolution 87 (4.3.1.2.1) not flown.
- The spacecraft flown end on in orbit throughout, where it drifted for most of the flight; the venting not flown.
- The attitude thrusters' failures (thruster 7 from about 118:32) not flown: they changed no orbit the record measures.
- Each manoeuvre straight along its attitude: the height adjustment's 1.9° of pitch, the plane change's -0.8° pitch and
  0.8° short of 90° of yaw, and the coelliptic's -0.3° of yaw, not flown; the coelliptic's 15.2° of pitch is.
- The retrofire's 9.94 ft/s to the left not flown.
- The entry's banks held exactly from their instants, two of them worked from the crew's "about"; the lift a preliminary
  figure read by eye; the trim, 16°, read off the same figure (the heat shield's char puts the stagnation point at an
  angle about half of it, 5.1.1.1).
- The drogue's ten seconds squidded at Mach 1.2 not flown (it opens as at its normal height); the bridle's failed leg not
  flown.
- The computer, its update and its commands not simulated: the banks they led to are.
