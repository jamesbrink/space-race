# Mercury-Atlas 8: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts` (a
`MercuryAtlasRecord`, [mercury-atlas-plan.ts](../../vehicles/mercury-atlas-plan.ts)), what it rests on and what the
simulator makes of it. Every figure there carries its source; the bibliography is [docs/sources.md](../../../../../docs/sources.md),
"Mercury-Atlas 8".

## What there is, and what there is not

- **Documented for this flight** (NASA TN D-4807, the postlaunch report as published in 1968; NASA SP-12, the same flight
  as first published): every event planned and as flown (TN D-4807 Table XXII, p. 134); the cutoff, 25,730 ft/s at
  528,467 ft and 0.0062° below level, and the orbit, 86.94 by 152.8 nautical miles, 88 min 55 s, 32.55° (Table XXIII and
  SP-12 Table 2-I); the loads and dynamic pressures going up and coming down (the same tables); the spacecraft's weights
  for five phases (Table I, p. 14) and at retrofire, 2,994 lb, as the network's data gave it (p. 108); the retrorockets'
  impulse and attitude with which the report's own integrated entry came down within a mile of the retrieval point,
  38,975 lb s at −34° in pitch and none in yaw (p. 108); the drogue let out by hand at 39,400 ft and the main by its
  barostat at 10,600 ft (p. 69); where it was picked up (NASA SP-45, Table 8-III).
- **Friendship 7's, taken for this flight** (`assumed`): everything of the Atlas D's (its weights, its engines' ratings
  and impulses), the booster section let go four seconds after its engines' cutoff, MA-5's aiming azimuth, the roll
  programme and the guidance's start, the ascent's drag, the ball the heights are over, the capsule's drag in orbit
  held in orbit attitude.
- **Not found anywhere reached**: anything of Atlas 113-D's own performance; what the orbit's heights are measured over;
  the capsule's attitude through its hours of drifting flight.

What 113-D had that 107-D had not (TN D-4807, pp. 12 and 13): no insulation bulkhead, baffled injectors on the booster
engines, hypergolic igniters, no extra hold-down, the staging backup moved from 136 to 132.3 s, new range-safety
receivers; and "the duration of the second-stage pitch program was reduced by 2.5 seconds" (p. 106). None is a figure the
simulator flies. Read and not used: the Gilmore weighing system's 324,650 lb at the oxygen tank's securing (p. 105),
which is more than the type's whole stack: what was weighed with it is not said. Spacecraft No. 16's eighty-one changes
from No. 18 (pp. 7 to 12) are in its weights here and in [spacecraft.md](spacecraft.md).

## The ascent

As Friendship 7's (its [mission.md](../ma-6-friendship-7/mission.md)), on the same figures: the booster engines cut at
the record's 2:08.6 ("a somewhat lofted trajectory ... resulted in a 2-second-early discrete signal at BECO;
consequently SECO was about 10 seconds later than nominal", p. 106), the booster section let go at 2:12.6, the tower at
2:33, the sustainer cut when the ground's guidance has 25,730 ft/s. The steering law is solved for this flight's cutoff
height and path, 528,467 ft and −0.0062°.

What it gives (tests/staged.test.mjs): the cutoff speed reached at T+298.2 s, 17.5 s before the record's 315.7 (a
recorded miss: the record's lofted climb and late cutoff are 113-D's, and the type's figures cannot give them). At the
cutoff 161 by 280 km (the record 161 by 283), 32.33° (32.55); the greatest dynamic pressure 53.0 kPa (964 lb/ft², 46.2
kPa); 7.9 g at the sustainer's cutoff (8.1).

## The orbit, the retrofire and the pack

The coast is flown from the published orbit as Friendship 7's is, from the cutoff's place: its 30.5447° N 72.2157° W
(Table XXIII) is 8.64° round from the pad in the frame that does not turn (derived), and its path 0.0062° below level
puts it two thirds of a degree short of perigee. **Its period is read as a Kepler period** (`orbit.kind`, estimated):
Friendship 7's and Aurora 7's published periods agree with their heights over the equatorial radius as nodal periods to
a second, which is how the simulator reads a period unless told; Sigma 7's 88 min 55 s does not (its heights give 88 min
41.5 s node to node), and is their Kepler period, the two-body period of that orbit, to a second (5,336.3 s), as Faith
7's is. Read as nodal, the convention, it comes back round 13.5 s late each revolution: first flown so, the drogue came
out 236 km short of the pick-up point. Six revolutions, nine hours: in orbit the capsule is held to Friendship
7's free-molecule figure; Schirra's hours of drifting with the jets off, and his fuel, are not flown.

The automatic sequence turned it to retrofire attitude at 08:51:30 and fired the three motors from 08:52:00, Schirra with
the cover off his button to back it up; it "did not seem to vary as much as half a degree" through the burn. So it is
flown at −34° and no yaw, and the impulse is the one the report's integration used, 38,975 lb s over the capsule's
2,994 lb, 127.6 m/s (derived). The pack goes a minute after the first motor, at 08:53:00, as planned; from then the
capsule weighs its documented 2,732.50 lb.

## The descent

What comes down is let loose at the drogue's height: let out by hand at 39,400 ft (planned at about 40,000), the main by
its barostat at 10,600 ft; each on the Redstone flights' canopies, and the capsule falls on them at its weight at the
main's deployment, 2,602.32 lb.

What it gives (tests/orbital.test.mjs, staged.test.mjs): from the published orbit, 7.8 g and 20.9 kPa in the entry (7.6,
21.9), 0.05 g at 09:01:12 (09:01:40), the drogue out at 09:06:34 (09:06:50), **48 km beyond where it was picked up** and
8 km to its right: recorded. Friendship 7's and Aurora 7's coasts come down some 105 km long on the same model. From
where the ascent left it, 420 km beyond and 33 km across (recorded: the ascent's early cutoff and its plane), and down
50 s after the record, falling 8.9 m/s on the main: the record's 4 min 59 s from 10,600 ft is 10.8 m/s on the average
(recorded, not changed).

## What is simplified or left out

- The Atlas is Friendship 7's, the Atlas D's (weights and impulses from a secondary source), not 113-D's; the verniers
  are part of the sustainer; no build-up or tail-off; all the propellant is taken as burnable.
- The ascent's pitch programme is a stated law (113-D's was 2.5 s shorter in its second stage); no yaw steering; the
  azimuth is MA-5's.
- The capsule's attitude in orbit is not flown: its drag is the orbit attitude's throughout, where Schirra drifted for
  hours.
- The retrofire is one even burn of the three motors' whole impulse; the propellant they burned is not taken off.
- The capsule's ablation, the jets' fuel and the oxygen are taken off at the drogue (its weight under the main), not as
  spent.
