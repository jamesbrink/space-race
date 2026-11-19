# Gemini-Titan 7 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 3's is. Every figure there
carries its confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run
gives. Times are seconds (or hours:minutes:seconds) from liftoff, 19:30:03.702 UTC, 4 December 1965. The checks'
tolerances were set with the record, before the plan was first flown; the misses are in
[src/sim/misses.ts](../../../../../src/sim/misses.ts), each with its cause.

## 1. What there is to fly it from

**The mission report** (MSC-G-R-66-1, ibiblio's copy; the same file on the To the Moon archive), read on the page where its
text layer garbles digits: GLV-7's and spacecraft 7's weights (3.3), the sequence of events (Table 4.2-I), the trajectory
at BECO, SECO and separation and the landing (Table 4.3-I), the manoeuvres (Table 4.3-II) and the orbit after each and
every sixteenth revolution (Tables 4.3-III and 4.3-IV), the engines (Tables 5.2-I and 5.2-II, preliminary, postflight
reconstructed), the shutdown impulse and the payload margin (5.2.2.2, 5.2.2.4), the retrofire's push as the velocity
indicator read it (Table 5.1.8-III), the landing system's events against pressure height (Figure 5.1.11-1) and the entry
(4.3.1.3). It has no time for the fairings, the equipment section or retrorockets 2 to 4: the tape recorder had failed.

The type's figures (thrusters, rockets, parachutes, heat shield) are SP-121's, CR-1106's and SEDR 300's, as Gemini 3's.

## 2. The ascent

GLV-7 on its own weights: 342,569 lb at liftoff with spacecraft 7 (8,076.10 lb), 84,664 at the first stage's burnout,
73,587 at the second stage's start of steady burning, 14,372 at its cutoff, worked into the two stages as Gemini 3's are.
The first stage's two chambers at GLV-7's standard inlet figures, 436,306 lb and 261.74 s, taken for sea level, the vacuum
impulse raised by GLV-1's rise from 5 s to 155 s (assumed): flown, its average thrust from liftoff to burnout is 462,413
lb against the flight's 462,433 (Table 5.2-I), and it is 3,060 m/s at the cutoff against 10,042 ft/s (3,061 m/s). The
second stage GLV-7's flight average, 102,584 lb and 313.11 s (documented).

Two things the record has that a first reading of it misses, each from its own figures:

- **The second stage's thrust comes when its chamber pressure rises, not at the staging signal.** The signal is at
  155.61 s; the stages part at 156.25. Lit at the signal, as Gemini 3's is, it pushes the spent first stage for 0.6 s and
  burns 200 lb of propellant at the start that the end of the burn is short of, some 45 m/s. GLV-6's evaluation has its
  chamber pressure rising 0.015 s before the stages parted (II.C): that interval is taken (assumed), so 156.235 s.
- **What the stage could burn is more than it burned.** The radio guidance cut it on the orbit. Its shutdown impulse,
  36,190 lb-s (5.2.2.2), is 116 lb burned after the signal; and the vehicle could have carried 8,869 lb, 784 more than the
  spacecraft (5.2.2.4). GLV-6's evaluation has both kinds of figure for its vehicle, 834 lb of margin and 767 lb of
  usable propellant still in the stage 20 s after cutoff, so the margin is taken for the usable propellant (assumed), and
  the run's guidance cuts the stage on the orbit, as Gemini 3's does. Without it the stage runs dry 21 m/s short and the
  orbit's apogee is 257 km where the record's is 328.

The law: the 83.6° azimuth, up the plumb line to 22.94 s (the pitch programme's start), a pitch-over of 15 s
(estimated), the linear tangent from staging, aimed at the cutoff's geodetic height, 529,440 ft, and +0.04°.

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at cutoff, space-fixed | 25,793 ft/s (7,862 m/s) at separation, the shutdown's impulse in it | 7,862.6 m/s | holds |
| Perigee | 87.2 nmi (161.5 km) | 154.4 km | holds |
| Apogee | 177.1 nmi (328.0 km) | 333.1 km | holds |
| Inclination | 28.89° | 28.89° | holds: the law steers to it |

The second stage is cut by the guidance at 337.63 s (337.01 recorded), with 310 kg of its usable propellant left.

## 3. The orbit and the four burns

The published orbit is the report's final insertion set, 87.2 by 177.1 nautical miles, 28.89°, 89.39 min, before the
station keeping. **Its heights are over the oblate earth** and **its period perigee to perigee**, both assumed as Gemini 3's
are (that file's section 3): the report's earth model is the Fischer ellipsoid and its final elements are integrated from
the tracking (4.3, 4.3.1.2). It also says the perigee's slow rise was "measured as height above a spherical earth"
(4.3.1.2), and its preliminary elements are "measured above the launch complex 19 earth radius" (Table 4.3-IV): which
ball the final elements stand on is not said in so many words. In the free-molecule flow the ship drags 2.2 on a quarter
of its whole outside, 10.8 m² (estimated: it was powered down and let drift for most of the fourteen days).

| Burn | Thrusters | Attitude | When | Impulse |
| --- | --- | --- | --- | --- |
| Perigee adjust | aft-firing | along the motion | 3:47:59, 76.2 s | 58.1 ft/s |
| Phase adjust | aft-firing | along the motion | 69:43:21, 16.5 s | 12.6 ft/s |
| First circularising | aft-firing | along the motion | 119:11:55, 75.6 s | 60.0 ft/s |
| Second circularising | aft-firing | yawed 178°, against the motion | 119:55:01, 15 s | 12.1 ft/s |

Each at the report's instant and its tracked impulse (Table 4.3-II), along the motion as it lit. **Not flown**: the station
keeping on the second stage and the radial burn of 0:21:17 that ended it (8.8 ft/s on the thrusters that push down, pitched
−41.5° and yawed 49°): a record's burn is along the motion or across it. The report has them taking the apogee from 177.1
to 174.4 nautical miles.

| After | Record (final) | Flown from the pad | From the published orbit |
| --- | --- | --- | --- |
| Perigee adjust, read at 4:30 | 119.6 by 174.3 nmi (221.5 by 322.8 km) | 220.9 by 330.3 km: apogee misses | 328.1: holds |
| Phase adjust, at 70:30 | 126.5 by 170.9 (234.3 by 316.5) | 232.1 by 324.2: apogee misses | 322.4: holds |
| Circularising, at 120:30 | 160.5 by 162.8 (297.2 by 301.5) | 287.1 by 314.4: both miss | 285.5 by 316.6: both miss |
| Revolution 206, at 329:00 | 156.5 by 163.6 (289.8 by 303.0) | 283.0 by 308.9: perigee misses | 281.5 by 311.0: both miss |

The apogee before the circularising burns is the ascent's 5 km and the station keeping's 5 km. The circularising burns,
flown by the clock at the instants the ground worked for the real ship's apsides, do not come at this run's, and leave it
less round. Gemini VI-A is not in this run: its rendezvous on the eleventh day is a mark on the clock (263:58).

## 4. Retrofire, the entry and the descent

**The retrofire is timed by guidance for the landing place** (`landing.aimed`, sim/plan.ts `LandingAim`, assumed): the
ground worked its instant from the tracking of the revolution before (4.3.1.3), and on the run it is lit 36 s before the
record's 329:58:04. The retrosequence's attitude, the equipment section's going (30 s before, the type's sequence) and the
rockets keep their intervals to the burn and move with it (`LandingAim.from`: the chain from the retrosequence). The four rockets give 318.5 ft/s, the indicator's (Table 5.1.8-III), pushed 20.6° below the
line back along the motion, as its 298.1 ft/s aft and 111.8 down say (derived).

The re-entry module at 0.05 g weighs spacecraft 7's 4,824.33 lb, its lift the programme's 0.19 (estimated), banked 48.8°
to the left from the retrograde section's going: the report reconstructs the entry "through bank and reverse bank angles of
48.8°" to the landing point; the crew rolled left 55°, flew "at about 35° roll" and reversed the bank four or five times to
null the cross-range (4.3.1.3). The reversals are not flown, so the lift is held to one side all the way. The drogue at
about 50,000 ft (read off Figure 5.1.11-1), full in 16 s as its disreef shows; the main at the type's 10,600 ft, full in 13
s (330:31:05 to 330:31:18).

| | Record | Flown from the pad | From the published orbit |
| --- | --- | --- | --- |
| Drogue out | 330:29:30 | 330:30:34, 64 s late: misses | 154 s late: misses |
| Along the track from the landing | 0 | 1.5 km short: holds | holds |
| Across | 0 (0.5 nmi left of track) | 81 km left: misses | 45 km left: misses |
| Landing | 330:35:01 | 330:37:05: misses by 124 s | |

## 5. What disagrees

| | One reading | Another | Followed |
| --- | --- | --- | --- |
| What the final heights are over | the oblate earth, as the Gemini IV and V reports say of their final elements | "measured as height above a spherical earth" (4.3.1.2, of the perigee's rise) | the oblate earth, assumed as Gemini 3's |
| The phase adjustment | 69:43:21 (Table 4.2-I) | 69:43:19 (Table 4.3-II, 4.1) | the sequence of events, as the README |
| The bank | 53° planned; "rolled left 55°" (4.1) | "at about 35° roll" (4.3.1.3); 48.8° the reconstruction's | 48.8°, to the left |
| The circular orbit's period | 90.61 min (Table 4.3-III, final, read on the page at 220 dpi) | the README had it illegible, 90.51 or 90.61 | 90.61, in the check's source |

## 6. Simplified or left out

- The station keeping on the second stage and the radial burn that ended it; the ship's drift and its attitude between
  burns (a mean area is flown).
- Gemini VI-A: not a craft in this run. The rendezvous is a mark.
- The thrusters 3 and 4 that failed at 283 hours, the reserve fuel tank, the fuel cells: nothing flown reads them.
- The bank reversals of the entry, and the computer's guidance: one bank, held.
- The fairings' instant (15 s after the separation, estimated), the equipment section's (the type's 30 s before
  retrofire) and the rockets' spacing (the type's 5.5 s): not recorded.
- The first stage's figures at standard inlet conditions are taken for sea level; its vacuum impulse is GLV-1's rise.
  The usable propellant left in the second stage at its cutoff is the vehicle's payload margin.
- The orbit's heights over WGS 84's ellipsoid, not Fischer's.
