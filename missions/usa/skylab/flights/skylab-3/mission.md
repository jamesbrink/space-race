# Skylab 3: the record and the plan in words

The run (orbital.ts, `orbital`; vehicles/saturn-ib-plan.ts writes the plan from it) flies CSM-117 on SA-207 from Pad 39B to the
Pacific: the ascent to its flight evaluation, the rendezvous with the workshop on the Skylab visits' profile, the docked
stay coasted, the single deorbit firing, the entry steered to the landing place, and the Earth landing system. What each
figure is and where it is read is beside it in orbital.ts; this is the account of what is flown, what is not, and what the
run misses its record by. Times are from range zero, 11:10:50 UTC on 28 July 1973.

## What was read

- **The launch vehicle**: the SA-207 flight evaluation (MPR-SAT-FE-73-5), read on its page images: every event (Table 2-2),
  the cutoffs, separations and insertion (Tables 4-2 to 4-4, 4-7; the insertion's place in Table 4-7 is not legible in the
  scan), the H-1s (Table 6-2, Fig. 6-2), the J-2 (Tables 7-1, 7-2), the roll and pitch programme (§9.3.1, Fig. 9-3) and
  every mass (Tables 16-1 and 16-5). The run's ascent is the stated law on these, cut on the published period.
- **The spacecraft**: its mission report (JSC-08662): the rendezvous firings at their instants and impulses (Table 12-I,
  the real-time profile), the service propulsion load (§7.10.1: 867 kg of fuel and 1,398 of oxidizer), the reaction control
  system's usable load (§7.10.2) and the CSM's mass properties through the flight (Table D-I), the six firings' 39 s
  (§7.7.1, the deorbit's 18 s of them), the two leaking quads (§17.1), the single-firing deorbit of the modified plan (§12),
  the splashdown and the determined landing point (§§2, 13.3.3).
- **The profile**: the history of NASA's rendezvous (JSC-63400, chapter 5), as for Skylab 2.
- Where a figure is wanted that neither gives: the service propulsion engine's thrust and impulse, CSM-101's (the Apollo 7
  mission report); the command module's lift and trim, CM-101's; the tower's jettison 28 s after the S-IVB's start, as the
  Skylab 1/2 press kit planned it for SA-206; each said so beside it.

## The ascent

The S-IB is flown on its flight's own propulsion and pitch programme, both read off the flight evaluation's figures:

- **The H-1s' flow in flight** (Fig. 6-2). The eight engines ran above their Table 6-2 figures, which are reduced to
  standard sea-level conditions: about 2,817 kg/s at range zero, 2,903 from 20 s to 90 s, falling to 2,838 by 135 s, where
  the figures give 2,837 throughout. Flown at that level, thrust with flow (saturn-ib-plan.ts `h1`), the stage burns
  400.8 t from first motion to the outboard cutoff, where the mass tables have 400.5 (Table 16-5); at the figures it burned
  393.7 and left the S-IVB to make up the rest.
- **The pitch programme** (Fig. 9-3, the pitch command). The figure's first 100-s division is drawn short: its 100 to 700 s
  gridlines are evenly spaced 1.905 pixels a second apart at 250 dpi, and on them t = 0 lies about 8 s left of the plot's
  border. Registered so, its own event marks fall on Table 2-2 (max q 73.6 s against 75.0, the outboard cutoff 138.5
  against 140.73, the iterative guidance's start 175.8 against 176.6), and its knee on the documented tilt arrest
  (129.169 s, -62.2622°); read from the border every point comes 7 to 12 s early.

Read from the border and flown at the standard figures, as until November 2026, the S-IB flew too flat (45.8 km at the
outboard cutoff against 58.71, climbing 18.5° against 25.05, max q 49 kPa against 35.2) and the S-IVB ran dry some 155 m/s
short of orbit. Flown as above:

| | Record | Run |
| --- | --- | --- |
| Mach 1 | 59.0 s, 7.54 km | 58.2 s, 7.4 km |
| Max q | 75.0 s, 35.2 kPa at 13.17 km | 75.3 s, 37.8 kPa at 13.15 km |
| Inboard cutoff | 55.41 km, 2,238.3 m/s, climbing 25.61° | 54.9 km, 2,267 m/s, 25.0° |
| Outboard cutoff | 58.71 km, 2,301.8 m/s, 25.05° | 58.1 km, 2,325 m/s, 24.4° |
| Guidance's step at the S-IVB's start | about 5° up (Fig. 9-3) | 4.8° up |
| J-2 cutoff | 592.93 s, 7,829.7 m/s | 588.6 s, 7,835.4 m/s |
| Orbit | 149.87 by 226.29 km, 50.028°, 88.25 min | 149.9 by 221.7 km, 50.028°, 88.21 min |

## The workshop

The workshop is the flight's target (sim/plan.ts `TargetDef.orbit`): its mass at this visit's docking, 74,391 kg
(Table D-I), on the orbit the press kit expected at the rendezvous (424.6 by 439.5 km), on the plane of the spacecraft's
tracked state at its separation from the S-IVB (Table 4-4), as Skylab 2's is on its insertion's (`workshopInPlane`). No
tracking vector, element set or commentary figure for its place on that orbit was read for this launch. It is put where the
record's own firings bring the spacecraft: flown open on their impulses along the motion from this run's insertion
(NC1 65.44, NC2 47.57, NCC 11.46, NSR 6.40 m/s at Table 12-I's instants), the spacecraft comes to the terminal phase's
instant 1,081 km behind a workshop placed by the first visit's commentary (780 nautical miles downrange at ignition), where
the profile wants it 36.4 km behind and 10 nautical miles under (27° up). The workshop is placed 1,117.6 km further on
along its 6,810 km radius: 1,344.6 nautical miles downrange at ignition. The lower insertion of this launch (226 km
apogee against the first visit's 352) gains on the workshop faster.

## The rendezvous

Each burn is flown as what it was for, solved on the workshop where it is as it lights (sim/plan.ts `Pursuit`), as
Skylab 2's are:

| Burn | Lit | Purpose | Record (Table 12-I) | Run |
| --- | --- | --- | --- | --- |
| NC1 | 2:18:06 | `level`: the workshop's place at NC2 | 65.44 m/s | 71.1 m/s |
| NC2 | 4:33:54 | `level`: the workshop 24.5 nautical miles up at NCC | 47.57 m/s | 40.6 m/s |
| NCC | 5:20:03 | `reach`: the workshop 10 nautical miles up and so far ahead at NSR | 11.46 m/s | 5.6 m/s |
| NSR | 5:57:03 | `coelliptic`, `planar` | 6.40 m/s | 8.7 m/s |
| TPI | on the elevation, 27°, within ±10 min of 7:17:36 | `elevation`, 130° of travel | 6.49 m/s | 6.2 m/s, at 7:18:06 |
| Braking | 7:40:24 to the terminal phase's finalisation, 7:50:24 | `station` 100 ft off the docking port, to the docking at 8:21:10 | 8.32 m/s (planned) | 18.0 m/s |

NC1 and NC2 together are the record's within 1.3 m/s, split otherwise (the misses, below). The workshop stands 41.1 km off
at the terminal phase's instant, where the profile has about 22 nautical miles (40.7 km). The braking counts the station
keeping to the docking. The two midcourse corrections are not flown: they corrected navigation errors the run does not have.

Quad B is isolated at 14:18 (§17.1.1) and quad D at the alarm early on the sixth visit day (estimated: 10:47 on 2 August,
Astronautics and Aeronautics, 1973): from those instants their chambers give nothing, and the attitude is held on what is
left (sim/attitude.ts, `Thruster.isolated`). The docking is a mark: no joint is formed between craft yet (A3), so the
spacecraft coasts on alone beside the workshop for 59 days, and the undocking (19:49:42 on 25 September) is a mark.

## Home

The single deorbit firing of the modified plan is lit at the record's instant (21:38:18) for its 18 s against the motion;
the modules part five minutes after; the computer steers the entry to the determined landing point (`Hold.entry`).

## Against the record

| | Record | Run |
| --- | --- | --- |
| Cutoff speed | 7,829.73 m/s | 7,835.4 m/s: holds |
| Orbit at insertion | 149.87 by 226.29 km, 50.028° | 149.9 by 221.7 km, 50.028°: holds |
| NC1, NC2, NCC | 65.44, 47.57, 11.46 m/s | 71.1, 40.6, 5.6 m/s: **misses** |
| NSR, TPI | 6.40, 6.49 m/s | 8.7, 6.2 m/s: hold |
| Workshop at the terminal phase | about 22 nautical miles (40.7 km) | 41.1 km: holds |
| Splashdown | 22:19:54 | 22:24:50, 4,830 km along the track and 148 km across: **miss** (`cm.at`, +296 s) |

The splashdown: after 59 days coasted alone the spacecraft's place along its orbit is not the real ship's, which the ground
tracked and timed the deorbit on: a few kilometres in mean height are revolutions in 59 days. Timed by guidance for the
landing place along the track (`LandingAim`), the firing lights 36 minutes late and comes down level with the place but
897 km to one side, the Earth turned under; it is lit by the clock, as Skylab 2's are.

## What the plan gets wrong or leaves out

- The workshop's place on its orbit is derived from the record's firings, not read; its orbit is the press kit's expected one.
- Every burn's line is the profile's, not this flight's; the braking's start is chosen.
- The H-1s' flow and the pitch programme are read off figures; the S-IB's drag curve is a slender stack's, Apollo 7's.
- The docking is not flown, nor the docked stay as a joined craft, the flyaround inspection, the three EVAs, the undocking
  or the rescue preparations.
- The deorbit firing is not timed for the landing place.
- The service propulsion engine's figures and the command module's lift and trim are CM-101's; quad D's isolation instant
  is estimated.
