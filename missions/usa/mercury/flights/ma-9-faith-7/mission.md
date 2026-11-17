# Mercury-Atlas 9: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts` (a
`MercuryAtlasRecord`, [mercury-atlas-plan.ts](../../vehicles/mercury-atlas-plan.ts)), what it rests on and what the
simulator makes of it. Every figure there carries its source; the bibliography is [docs/sources.md](../../../../../docs/sources.md),
"Mercury-Atlas 9".

## What there is, and what there is not

MA-9's report is a part of NASA SP-45, the programme's summary, and it is thinner than the three before it: no table of
events planned and flown, no weights, no loads, no cutoff conditions.

- **Documented for this flight**: the powered flight's instants, BECO at 132.5 s, the booster section let go at 135.4,
  SECO at 303.03 "approximately 1 second earlier than planned", the roll programme to 15 s and the sustainer's pitch
  programme to 159 s (SP-45, pp. 102 and 103); the burnout "within a few feet per second high in velocity, 500 feet low
  in altitude, and 0.005° low in flight path angle" of the plan (p. 103); the orbit, 87.2 by 144.2 nautical miles (p. 13),
  88 min 45 s at 32.55° (*This New Ocean*, p. 496); 17,547 miles per hour over Bermuda (p. 494); **the retrofire by hand
  at 33:59:30 by the ground's clock** (SP-45, p. 151), at 34° by the window's reticle (*This New Ocean*, p. 500); the
  drogue by hand at 42,000 ft (the pilot's report, p. 357); the rate on the main, "About 34 feet per second" (the
  transcript, p. 442); the duration, 34:19:49 (Table 3-I); where it was picked up (Table 8-III).
- **Derived from the transcript** (SP-45, pp. 385 to 441): its times are the capsule's clock, which ran fast, 16 s by the
  fifteenth orbit (*This New Ocean*, p. 499) and 23 s at retrofire, where the ground's 33:59:30 was the transcript's
  "fire" at 33:59:53; with those 23 s off, the pack jettisoned by hand at 34:00:46, the drogue at 34:14:08 and the main at
  34:15:40; the 0.05 g the ground predicted, 34:09:19. The separation at the pilot's "I have SECO, sep cap" at 00:05:04.
- **Sigma 7's, taken for this flight** (`assumed`): every weight (TN D-4807, Table I and p. 108): no weight of spacecraft
  20's has been read; the press kit's "about 4,000", "about 3,000" and "approximately 2,400" pounds agree with Sigma 7's to
  their rounding, and SP-45's Table 3-II gives some of the changes' weights (the periscope 76 lb off, 10 lb of fuel and
  13.5 lb of water on), not all. The main's barostat height, 10,600 ft.
- **Friendship 7's** (`assumed`): everything of the Atlas D's, MA-5's azimuth, the ascent's drag, the ball, the free-molecule
  figure; the retrorockets' specified impulse, 38,880 lb s. **Aurora 7's**: the arc from the pad to the cutoff (no place
  for MA-9's cutoff has been read). **The press kit's plan**: the tower's release at 154 s.
- **Not found anywhere reached**: the *Postlaunch Memorandum Report* for MA-9 (three parts, NASA MSC, 1963: Part I
  would have the events and the trajectory); anything of Atlas 130-D's own performance but that its effective specific
  impulse was "within, but on the high side, of the tolerance band" (p. 103); the loads.

## The period

The orbit is flown from its heights and its period, as every flight's is. **The period is flown as a Kepler period,
assumed from Sigma 7's** (`orbit.kind`), whose own heights and period decide it (tests/periods.test.mjs). Faith 7's own
cannot: on the equatorial radius its heights' mean orbit has a Kepler period 2.0 s longer than the 88 min 45 s, an
anomalistic one 2.6 s shorter and a nodal one 12.9 s shorter; the Kepler period is the nearer, but not for every period
within the printed second. Friendship 7's and Aurora 7's are nodal on the same ball. No document read says which period
any of them is. As a diagnosis only: read as nodal it comes back round 13 s late each revolution and the drogue came out
2,234 km short of the pick-up point after twenty-two of them; the heights alone, with no period, put it 8 km short; as
a Kepler period, 371 km long. Two seconds of a period printed to the second are 330 km at the end of a day and a half,
so this flight's landing says little of anything else.

## The ascent, the orbit and the decay

As Friendship 7's, on the same figures. The cutoff speed is the 17,547 miles per hour *This New Ocean* gives over Bermuda
(25,736 ft/s, which may include the posigrades' 24 ft/s); the steering law is solved for the plan's 528,400 ft less 500,
and 0.005° below level. What it gives (tests/staged.test.mjs): the cutoff speed at T+281.7 s, 21.4 s before the record's
303.03 (recorded), in an orbit of 161 by 285 km (the record 161 by 267).

The day and a half is coasted on the simulator's rails (sim/rails.ts) on the deck, and flown in the batch run, in free-
molecule flow: Cooper drifted with the attitude control off for most of it, so its drag is the capsule turning every way,
a quarter of its surface, 2.88 m² (derived), on Friendship 7's 2.2. Over the 22 revolutions the coast's apogee comes down
12.5 km (264.8 to 252.3 km over the sea) and its perigee 2 km; SP-45 says only that "the orbital parameters did not decay
an appreciable amount" (p. 151) and plots the apogee against time (Figure 7-12, not read off). Left up, the simulator's
`decay` has it down in 5.9 days from the injection, where SP-45 gives "about 4.7 days" (p. 124).

## The retrofire and the descent

The automatic control had gone with its inverter on the twenty-first pass, so Cooper turned the capsule to retrofire
attitude on the night side by hand, held it at 34° by the reticle on his window with the manual proportional control,
and fired the motors with his button on Glenn's count at 33:59:30: "Right on the old gazoo". So the retrofire is flown
at 34°, no yaw (none was recorded), at that instant, on the motors' specified impulse over Sigma 7's weight at
retrofire, 127.4 m/s (derived). He jettisoned the pack by hand a minute later; the drogue by hand at 42,000 ft, the main
at the barostat's height.

What it gives (tests/orbital.test.mjs, staged.test.mjs): from the published orbit, 0.05 g at 34:08:44 (the ground's
prediction, 34:09:19), the drogue out at 34:14:04 (34:14:08), **371 km beyond where it was picked up** and 12 km to its
right: recorded, with the period's reading above as its likeliest cause. From where the ascent left it, 590 km beyond
and 36 km across, the drogue 34 s late, and down 104 s after the record, falling 8.9 m/s on the main where Cooper read
34 ft/s (10.4 m/s).

## What is simplified or left out

- The Atlas is Friendship 7's, the Atlas D's (weights and impulses from a secondary source), not 130-D's.
- The capsule's weights are Sigma 7's; its 22 revolutions' fuel, oxygen and water are not taken off as spent.
- Its attitude in orbit is not flown: the drag is a tumbling capsule's throughout, where it was held at times.
- The retrofire is one even burn of the specified impulse, along one line held through it.
- The capsule's clock is taken 23 s fast for every transcript time after the first hours: it was 16 s by the fifteenth
  orbit, so the descent's derived instants are good to some seconds.
