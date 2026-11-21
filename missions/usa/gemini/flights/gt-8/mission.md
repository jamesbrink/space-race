# Gemini-Titan 8 as it is flown

The plan the simulator flies (`flight.plan`) is written from the record in [orbital.ts](orbital.ts) by
[gemini-titan-plan.ts](../../vehicles/gemini-titan-plan.ts) `geminiTitanPlan`, as Gemini-Titan 7's is. Every figure there
carries its confidence and source; this file says what was read, what had to be taken from elsewhere, and what the run
gives. Times are seconds (or hours:minutes:seconds) from liftoff, 16:41:02.389 UTC, 16 March 1966. The checks'
tolerances were set with the record, before the plan was first flown; the misses are in
[src/sim/misses.ts](../../../../../src/sim/misses.ts), each with its cause.

The flight deck still opens Gemini VIII's Fly on the docking chapter (src/app/address.ts `lacks`, enter.ts, main.ts,
session.ts, only.ts): the plan here is held by the tests and the figures, and is what the launch site's clock and the
idle show play. Fly goes to the pad when the docking is a phase of the same run (the plan's item D3).

## 1. What there is to fly it from

**The mission report** (MSC-G-R-66-4; the To the Moon archive's copy of the one the Apollo Lunar Surface Journal kept),
read on the page where its ClearScan text layer garbles digits: GLV-8's and spacecraft 8's weights (3.3), the sequence of
events (Table 4.2-I), the trajectory at BECO, SECO and separation and the landing (Table 4.3-I), the orbit before and
after each manoeuvre (Tables 4.3-II and 4.3-IV), the manoeuvres planned, commanded and flown (Table 4.3-III) and as the
guidance system's accelerometers measured them (Table 5.1.5-VII), the rendezvous in words (4.1, 4.3.1.2.1, 5.1.5.2.2:
the radar's ranges), the engines (Tables 5.2.2-I and 5.2.2-II), the shutdown impulse and the achieved performance
(5.2.2.3, 5.2.2.4), the retrorockets one by one (Table 5.1.8-V), the entry as the crew and the computer flew it
(5.1.5.2.3, Figure 5.1.5-17, Table 5.1.5-VIII), and the landing system's events against height (Figure 5.1.11-1).

The type's figures (thrusters, parachutes, heat shield, lift) are SP-121's, CR-1106's, SP-138's and SEDR 300's, as
Gemini 3's.

## 2. The ascent

GLV-8 on its own weights: 341,671 lb at liftoff with spacecraft 8 (8,351.31 lb), 85,276 at the first stage's burnout,
73,790 at the second stage's start of steady burning, 14,326 at its cutoff, worked into the two stages as Gemini 7's are:
the second stage burned 113 lb after its cutoff signal (its shutdown impulse, 35,544 lb-s) and could have burned 479 lb
more (the achieved performance, 8,830 lb, over the spacecraft), taken for the usable propellant still in it (assumed).
The first stage's two chambers at their standard inlet figures, 433,952 lb and 261.42 s, taken for sea level and raised
for vacuum as GLV-1's rose; the second stage its flight average, 102,735 lb and 314.06 s. Its thrust comes when its
chamber pressure rises, GLV-6's 0.015 s before the stages part (assumed), so at 155.275 s.

The law: the 99.9° azimuth (1.2° off the planned 98.7 for the Agena's own launch), up the plumb line to 22.98 s, a
pitch-over of 15 s (estimated), the linear tangent from staging, aimed at the cutoff's geodetic height, 527,125 ft, and
-0.07°, into the plane of 28.91°.

**The inclination is the separation state's, not the table's.** The report's final elements have 29.07° at insertion
(Table 4.3-IV), the RTCC's preliminary 28.94. The final state at separation (Table 4.3-I: 26.70° N, 70.03° W, heading
101.88°) gives 28.91° read as a tracking vector is read, its geodetic latitude made geocentric (sim/pursuit.ts
`fixState`), and 29.05° with the geodetic latitude; GATV-5003's insertion vector read the first way gives the 28.86° its
own Table 4.3-VI has. The table's figure looks to be the geodetic reading, and the separation state's is taken (derived),
the table's held as the check.

| | Record | Flown | |
| --- | --- | --- | --- |
| Speed at cutoff, space-fixed | 25,738 ft/s (7,844.9 m/s) at separation, the shutdown's impulse and 6 ft/s of the separation's in it | 7,845.6 m/s | holds |
| Perigee | 86.3 nmi (159.8 km) | 153.5 km | holds |
| Apogee | 146.7 nmi (271.7 km) | 274.1 km | holds |
| Inclination | 29.07° | 28.91° | holds |

The second stage is cut by the guidance at 337.63 s (337.54 recorded), with 183 kg of its usable propellant left.

## 3. The target and the rendezvous

**The target is GATV-5003 as the report's tracking had it at its insertion** (Table 4.3-V, the preliminary vector, its
height over the Launch Complex 19 radius: `INSERTION`, which the docking chapter starts from too), flown on from there
on gravity and the air at 7,116 lb (3.6) and an estimated drag area, the way its own run takes it (sim/plan.ts
`TargetDef` `orbit`). The Agena's own run (gatv-5003) is not used: flown on its law it reaches the record's orbit 16 km
ahead along it and 0.22° out of the vector's plane (PR #205's measurement). The Agena made no manoeuvre before the
docking; its ten came after the ship was down (Table 4.3-VII).

The four burns before the coelliptic are flown at the record's instants and impulses (Table 5.1.5-VII), each along the
line its accelerometers measured, the nose along it for the aft-firing pair and against it for the forward-firing: what
they were aimed at (the apogee 15 nautical miles under the Agena's, the perigee and phase, the node, a correction that
should not have been made) is not yet a kind guidance solves. The rest are made on the Agena (`Manoeuvre.toward`,
plan.ts `Pursuit`), the record's impulse a check:

| Burn | Thrusters | When | Record (accelerometers) | Flown | |
| --- | --- | --- | --- | --- | --- |
| Height adjust | forward-firing | 1:34:36.4, 5.5 s | 3.14 ft/s | as recorded | |
| Phase adjust | aft-firing | 2:18:25.8, 68 s | 50.59 ft/s | as recorded | |
| Plane change | aft-firing, yawed 90.6° right | 2:45:52.8, 35.5 s | 26.64 ft/s | as recorded | |
| Vernier height adjust | aft-firing | 3:03:42.2, 3 s | 2.28 ft/s | as recorded | |
| Coelliptic | aft-firing, pitched down 21° | 3:48:09.7 | 61.58 ft/s (18.77 m/s) | solved coelliptic: 21.08 m/s | misses |
| Terminal phase | aft-firing | 5:14:55.7 | 27.30 ft/s (8.32 m/s) | solved to reach the Agena at 5:47:46: 22.54 m/s | misses |
| Correction at 82° to go | | 5:27:26.0 | 15.15 ft/s | solved: nothing | misses |
| Correction at 34° to go | | 5:39:19.9 | 9.47 ft/s | solved: nothing | misses |
| Braking | forward-firing | 5:43:08.9, about 10 min | 41.22 ft/s (12.56 m/s) | held 150 ft behind the Agena to the docking: 29.87 m/s | misses |

The terminal phase's arrival is the record's own: the two corrections were made at central angles of 81.8° and 33.6° to
go, 713.9 s apart, and the Agena goes the last 33.6° at that rate in 497.6 s more, 5:47:46.

| After | Record (final, over the Fischer ellipsoid) | Flown from the pad | |
| --- | --- | --- | --- |
| Height adjust, read at 1:40 | 86.3 by 144.7 nmi (159.8 by 268.0 km) | 160.0 by 273.0 km | holds |
| Phase adjust, at 2:25 | 113.3 by 144.7 (209.8 by 268.0) | 211.3 by 273.2 | holds |
| Coelliptic, at 3:55 | 143.9 by 146.7 (266.5 by 271.7) | 274.0 by 276.6 | perigee misses |
| Terminal phase, at 5:20 | 145.9 by 159.0 (270.2 by 294.5) | 269.7 by 323.6 | apogee misses |
| Rendezvous, at 6:00 | 158.6 by 161.1 (293.7 by 298.4) | 297.1 by 298.4 | holds |
| Before retrofire, at 10:00 | 157.5 by 161.3 (291.7 by 298.7) | 297.0 by 298.3 | holds |

| The Agena | Record | Flown | |
| --- | --- | --- | --- |
| At the radar's lock-on, 3:31:18 | 181 nmi (335 km) | 345 km | holds |
| As the radar's signal dropped, 5:01:32 | 46 nmi (85 km) | 122 km | misses |
| At the terminal phase, 5:14:56 | about 29 nmi (54 km) | 91 km | misses |
| Keeping station, 5:55 | about 150 ft | 150 ft | holds |

**Why the run is behind at the terminal phase.** The run comes to the burns before the coelliptic on an orbit whose
apogee is some 5 km over the record's: the ascent is cut on the record's period, and the report's heights and its period
are some 3 km apart in the axis they give. Flown at the record's impulses, the burns keep that, and the coelliptic
orbit the run then solves on the Agena lies 5 to 7 km over the record's, about 21 km under the Agena where the record's
was 25 (13.5 nautical miles). It closes on the Agena slower: 10 km farther than the record at the lock-on, before the
coelliptic burn, 37 km farther by 5:14:56. The terminal phase, lit by the clock where the crew lit it on the Agena's
elevation (26.8°), has the farther to go in the same time and asks nearly three times the record's impulse. Guidance
that solves the height adjust for its apogee and lights the terminal phase on the elevation (the plan's item A4) closes
this; nothing here is adjusted to.

**The corrections solve to nothing** because the run has no navigation, radar or platform error: the terminal phase it
solves reaches the Agena. The crew's took out theirs.

## 4. The docking, the roll and the undocking

**Not flown.** The braking holds the ship 150 ft behind the Agena to the docking at 6:33:16 (`Pursuit.station`), and
from there the ship coasts on beside it where the braking left it: the docked forty-two minutes, the Agena's 90° yaw of
the pair at about 6:49, thruster No. 8's firing from 7:00:26.7 (its push on the pair, an attitude thruster's 25 lb over
some 900 s, and the crew's against it, are on no record as a translation) and the roll to 296°/s after the undocking are
marks on the clock. At 7:15:12.3 the ship backs off on the forward-firing pair for 6.6 s ("thrusters 11 and 12",
5.1.5.3.1): 1.22 m/s on the type's thrust, the nose taken to the right of the motion, where the Agena's yaw left the
pair (estimated: where it pointed after the roll is not recorded). The orbit before retrofire holds both its heights.

## 5. Retrofire, the entry and the descent

**The retrofire is timed by guidance for the landing place** (`landing.aimed`, sim/plan.ts `LandingAim`): the ground
loaded the instant for recovery area 7-3 and it fired at the planned second, 10:04:47, over Kano. The equipment section
goes at 10:03:48, the report's; the four rockets lit at 10:04:46.6, 52.2, 57.4 and 10:05:03.3 (5.57 s apart), each its
acceptance test's impulse over its web burning time (2,680 lb for 5.33 s), giving the 314.0 ft/s the crew read, 21.3°
below the line back along the motion.

**The bank is the crew's and the computer's, read off the report and flown by the clock**: 10° to the south (right of the
motion) from the retrograde section's going to 400,000 ft (10:26:53.2), the back-up 52° to the south from there, then
from 10:31:02.91, when "the flight crew started to fly the bank angles commanded by the onboard computer", about 20°,
35° and 15° to the north and the last command, 90° north, read off Figure 5.1.5-17 (estimated), and lift up from the
guidance's end at 10:35:50.4. The computer commanded those banks on the ship's own range to the target; flown by the
clock they do not take out the run's cross-range (A7's entry guidance, with a Gemini law, would). The lift is the
programme's 0.19 on the Mercury capsule's drag curve.

| | Record | Flown | |
| --- | --- | --- | --- |
| Drogue | 10:36:47 (Table 4.2-I; 10:36:34.4 in Figure 5.1.11-1), about 47,000 ft | 10:37:20 | holds |
| Along the track from where it landed | | 0.2 km short | holds |
| Across the track | 1.4 nmi right at guidance termination | 31.5 km left | misses |
| Landing | 10:41:26 | 10:43:00 | misses: the parachutes, as Gemini 7's |

The landing place is the ship's own computer's, 25°12′ N 136°05′ E (Table 4.3-I, "IGS coordinates in the onboard
computer"); the destroyer *Leonard F. Mason* reported picking it up at 25°22′ N 135°56′ E, and the planned point was
25°15′ N 136°00′ E.

## 6. What this leaves out

- The docking, the docked period and the undocking's attitude (section 4). D3 makes the docking a phase of the same run.
- The four burns before the coelliptic as aimed (section 3): they are flown as recorded.
- The terminal phase's trigger on the elevation angle: it is lit by the clock.
- Thruster No. 8's push on the pair and on the ship, the roll and the re-entry control system's firings: none is a
  translation on the record.
- The computer's entry commands as commanded: they are flown by the clock as read off a figure.
- The OAMS propellant: the burns take none off the ship's mass (orbital.ts `movesOf`), which in orbit is its launch weight.
