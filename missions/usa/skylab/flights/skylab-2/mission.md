# Skylab 2: the record and the plan in words

The run (orbital.ts, `orbital`; vehicles/saturn-ib-plan.ts writes the plan from it) flies CSM-116 on SA-206 from Pad 39B to the
Pacific: the ascent to its flight evaluation, the rendezvous with the workshop as the Skylab visits' profile, the docked
stay coasted, the two deorbit firings, the entry steered to the landing place, and the Earth landing system. What each
figure is and where it is read is beside it in orbital.ts; this is the account of what is flown, what is not, and what the
run misses its record by. Times are from range zero, 13:00:00 UTC on 25 May 1973.

## What was read

- **The launch vehicle**: the SA-206 flight evaluation (MPR-SAT-FE-73-3), read on its page images, the text layer being
  garbled: every event (Table 2-2), the cutoffs, separations and insertion (Tables 4-2 to 4-4, 4-7), the H-1s and the J-2
  (Tables 6-2, 7-1, 7-2, Figs. 6-2 and 7-2), the roll and pitch programme (§9.3.1, Fig. 9-2) and every mass (Tables 16-1,
  16-3, 16-5). The run's ascent is the stated law on these, cut on the published period.
- **The spacecraft's mission report (JSC-08414) has not been read**: it is not on NTRS and the only copy found is not
  reachable. Its burns, masses and entry are therefore taken from what was read, each said so:
  - the rendezvous profile from the history of NASA's rendezvous (JSC-63400, chapter 5), which sets out the Skylab
    visits' common sequence (NC1, NC2, NCC, NSR, TPI, two midcourse corrections, braking);
  - the instants the record does give: the terminal phase's lighting as the crew logged it (7:03:47.6, the technical
    crew debriefing), the rendezvous, soft dock, stand-up EVA, failed docking attempts and hard dock (the MSFC mission
    sequence evaluation, TM X-64816, to the minute), the undocking and both deorbit firings (Astronautics and Aeronautics,
    1973, to the minute), the splashdown (the Historical Data Book);
  - where a figure of the profile is wanted that this flight's record does not give (the orbits after NC1 and NC2, the
    terminal phase's 130° of travel, each burn's impulse as a fallback, the deorbit impulses), the second visit's
    planned figures (the Skylab 3 press kit), taken;
  - the command module's masses at the entry, drogue and landing, CM-117's (the second-visit report, Table D-I), taken;
  - the landing place from secondary sources (24°45′ N, 127°02′ W: Spacefacts, Wikipedia).

## The ascent

The S-IB is flown on its flight's own propulsion and pitch, both read off the flight evaluation's figures (Skylab 3's
mission.md sets out the same for SA-207):

- **The H-1s' flow in flight** (Fig. 6-2): 2,783 kg/s at range zero, 2,879 from 30 s to 105 s, 2,812 at 137.5 s, where
  Table 6-2's figures, reduced to standard sea-level conditions, give 2,818 throughout. Flown at that level, thrust with
  flow (saturn-ib-plan.ts `h1`), the stage burns 401.6 t from first motion to the outboard cutoff, where the mass tables
  have 400.0 (Table 16-5); at the figures it burned 395.3. Its specific impulse at altitude is the figure's, 2,879 N s/kg
  (293.5 s): until November 2026 AS-205's rise was taken for it (299.4 s), which made up for the flow the run did not burn.
- **The pitch programme** (Fig. 9-2, the LVDC's pitch attitude), read at 250 dpi on its gridlines, which are evenly spaced
  from its border; its event marks fall within a few seconds of Table 2-2. Until November 2026 it was read 10 to 15 s early
  (10° at 24 s against 38.5), and the S-IB flew too flat: 49.1 km at the outboard cutoff against 58.14, max q 43.1 kPa
  against 33.8.

| | Record | Run |
| --- | --- | --- |
| Mach 1 | 60.5 s, 7.66 km | 59.3 s, 7.3 km |
| Max q | 75.5 s, 33.8 kPa at 12.84 km | 75.3 s, 34.6 kPa at 12.82 km |
| Inboard cutoff | 54.70 km, 2,266.2 m/s, climbing 24.62° | 56.3 km, 2,270 m/s, 25.4° |
| Outboard cutoff | 58.14 km, 2,330.4 m/s, 23.96° | 59.8 km, 2,332 m/s, 24.8° |
| J-2 cutoff | 586.19 s, 7,865.5 m/s | 583.2 s, 7,872.3 m/s |

## The workshop

The workshop is the flight's target, a craft of its own flown by gravity and the air (sim/plan.ts `TargetDef.orbit`):
its mass at the first docking, 74,773 kg (JSC-08662, Table D-I), on a drag area chosen for its solar-inertial attitude
(skylab-plan.ts `WORKSHOP_DRAG_AREA`). No tracking vector or element set for it was found. It is placed from the launch's
commentary (SL II MC 1/1, at T−1:25): "an orbit of 239 nautical miles by 234", and at ignition "approximately 780
nautical miles downrange". The plane is the one the launch put the spacecraft into (the flight evaluation's tracked state
at insertion: a launch to a rendezvous is aimed into the target's plane), the place on it so far past the pad's nearest
point (`workshopInPlane`). A first placing on a plane over the pad 214 s before ignition ("passed directly overhead") put
the workshop 1.7° out of the spacecraft's plane, and the rendezvous could not be made on it: the commentary's "overhead"
is taken as loose.

## The rendezvous

Each burn is flown as what it was for, solved on the workshop where it is as it lights (sim/plan.ts `Pursuit`):

| Burn | Lit | Purpose | Run |
| --- | --- | --- | --- |
| NC1 | 2:24:14, 1.5 revolutions after insertion at apogee | `level`: the workshop 480 km ahead at NC2 | 57.1 m/s |
| NC2 | 4:40:07, 1.5 revolutions on | `level`: the workshop 45.4 km up at NCC | 5.5 m/s |
| NCC | 5:26:16, half a revolution on | `reach`: the workshop 149.5 km ahead and 10 nautical miles up at NSR | 81.3 m/s |
| NSR | 6:03:16, 37 minutes on | `coelliptic`, `planar` | 55.7 m/s |
| TPI | on the elevation, 27°, within ±10 min of 7:03:47.6 | `elevation`, 130° of travel | 6.4 m/s |
| Braking | 7:27:00 to the rendezvous at 7:37:00 | `station` 100 ft off the docking port, to the soft dock at 8:15 | 12.7 m/s |

The places at NC2, NCC and NSR are worked back from the terminal phase: at it the workshop stands 27° up, 10 nautical miles
over the coelliptic orbit; from NSR it draws away at three halves of its motion times the height between; NCC's and NC2's
heights under it are the second visit's planned orbits'. The second visit planned 67.4, 48.2, 9.0, 5.9 and 6.4 m/s for
NC1 to TPI: the run's NCC and NSR are larger because NC1, a level burn, can set the phase at NC2 or the height there but
not both, and the run's insertion apogee (348 km, SA-206's 352) is not the second visit's: NC2 finds the spacecraft
lower under the workshop than the profile, so it closes faster and NCC takes the phase back; and NSR takes out the wedge
(40 m/s of its 56) between the run's insertion plane and the workshop's, whose plane is the record's insertion's. None of
this flight's own impulses is a check: none was read. The two midcourse corrections are not flown: they corrected
navigation errors the run does not have (the crew recalled 0.5 and 4.7 ft/s, the debriefing).

The run comes to rest 30 m off the docking port at 7:37 and keeps station to 8:15, the first soft dock. From there it is
a mark: the stand-up EVA (10:52 to 11:25), the capture latches failing through eight attempts (11:25 to 13:13), the hard
dock (14:52). No joint is formed between craft yet: the spacecraft coasts on alone beside the workshop, the two on
nearly the same orbit for 27 days (a hundred metres apart at the hard dock's instant), and the undocking (08:55 on 22 June)
and the separation (09:40) are marks.

## Home

The first deorbit firing at 10:05 and the deorbit at 13:11 (the record's minutes) are flown at the second visit's planned
impulses, against the motion; the modules part five minutes after the deorbit firing; the computer steers the entry to
the landing place (`Hold.entry`, the type's pad loads and roll constants, lift up before its commands). The ground's
timing of the firings for the recovery area (`LandingAim`) is not flown: its open-loop trials, started on the coast
before the first firing, came down on that firing's perigee pass and found no instant, and timing the deorbit firing alone
found none either; the firings are lit by the clock.

## Against the record

| | Record | Run |
| --- | --- | --- |
| Cutoff speed | 7,865.54 m/s | 7,872.32 m/s: holds |
| Orbit at insertion | 149.99 by 352.07 km, 50.030°, 89.53 min | 150.0 by 348.4 km, 50.030°, 89.49 min: holds |
| Workshop at the terminal phase's instant | about 22 nautical miles (40.7 km) | 38.5 km: holds |
| Splashdown | 13:49:49 | 13:54:40, 44 km short and 142 km across the track: **miss** (`cm.at`, +291 s) |

The heights of the flight evaluation's Table 4-7 are over its equatorial radius: the insertion's place, 158.52 km
geodetic at 39.271° N, is 6,528.08 km from the centre, 149.99 km over 6,378.09 km, at a flight path angle of 0.011°. The
orbit's ball is so (`orbit.radius`).

## What the plan gets wrong or leaves out

- The burns' instants before the terminal phase, and every burn's line, are the profile's, not this flight's.
- The spacecraft's mass is the flight evaluation's at separation, less what the run burns; its service propulsion load
  (2,200 kg) is estimated.
- The docking is not flown, nor the docked stay as a joined craft; nor the flyarounds, the stand-up EVA's push on the
  spacecraft, the undocking or the separation.
- The deorbit firings are not timed for the landing place.
- The command module's lift and trim are CM-101's; its masses CM-117's.
- The H-1s' flow in flight and the pitch programme are read off figures; the S-IB's drag curve is a slender stack's,
  Apollo 7's.
