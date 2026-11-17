# Mercury-Atlas 7: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts` (a
`MercuryAtlasRecord`, [mercury-atlas-plan.ts](../../vehicles/mercury-atlas-plan.ts)), what it rests on and what the
simulator makes of it. Every figure there carries its source; the bibliography is [docs/sources.md](../../../../../docs/sources.md),
"Mercury-Atlas 7".

## What there is, and what there is not

- **Documented for this flight** (NASA TN D-3814, the postlaunch report as published in 1967; NASA SP-6, the same flight
  as first published): every event planned and as flown (TN D-3814 Table XVI, p. 122; SP-6 Table 3-II); the cutoff,
  25,717 ft/s at 527,859 ft and 0.0004° below level, and the orbit, 86.87 by 144.96 nautical miles, 88 min 32 s, 32.55°
  (Table XVII, the same in SP-6 Table 3-I); the loads and dynamic pressures going up and coming down (the same tables);
  the spacecraft's weights for five phases (p. 7); **the retrofire as the tracking gave it** (p. 101): 36.5° in pitch and
  27° in yaw, the motors' impulse 3 per cent under their group's 38,943 lb s; the drogue let out by hand at 25,450 ft and
  the main at 8,950 ft (p. 67); where it was picked up (NASA SP-45, Table 8-III, and TN D-3814, Table XX).
- **Friendship 7's, taken for this flight** (`assumed`): everything of the Atlas D's (its weights, its engines' ratings and
  impulses, Encyclopedia Astronautica and SP-45), since Atlas 107-D "did not differ in any major respect" from 109-D (p. 7);
  the booster section let go four seconds after its engines' cutoff; MA-5's aiming azimuth, the roll programme's 15 s and
  the guidance's start at 155 s; the ascent's drag; the ball the heights are over; the capsule's drag in orbit.
- **Not found anywhere reached**: anything of Atlas 107-D's own performance (the *Postlaunch Memorandum Report* as first
  issued and Convair's flight evaluation report were not found); the capsule's weight at retrofire (the trajectory analysis
  used "a calculated spacecraft pre-retrograde weight", not printed); what the orbit's heights are measured over; the
  retrofire attitude through the burn as a history (Figure 18 is a plot, not read off).

What 107-D had that 109-D had not (p. 7): staging at 130.1 s where 109-D's was 131.3, the backup at 132.2 where it was
136, the booster engines' main oxidizer valves of stainless steel, and the fuel tank's insulation bulkhead kept; none of
it is a figure the simulator flies. Spacecraft No. 18's twenty-one differences from No. 13 (pp. 5 and 6) are in its
weights here and in [spacecraft.md](spacecraft.md).

## The ascent

As Friendship 7's (its [mission.md](../ma-6-friendship-7/mission.md)), on the same figures: all five engines lit on the
pad on the one tank, the booster engines cut at the record's 2:08.6 and the booster section let go at 2:12.6, the tower at
2:32.2, the sustainer cut when the ground's guidance has 25,717 ft/s. The steering law is solved for this flight's cutoff
height and path, 527,859 ft and −0.0004°.

What it gives (tests/staged.test.mjs): the cutoff speed reached at T+297.9 s, 12.0 s before the record's 309.9 (a recorded
miss: src/sim/misses.ts); the record's own cutoff came 8.5 s later than Friendship 7's for 13 ft/s less, which the
type's figures cannot give. At the cutoff 161 by 266 km (the record 161 by 268), 32.32° (32.55); the greatest dynamic
pressure 52.0 kPa (967 lb/ft², 46.3 kPa, on the Cape's air of the day); 7.9 g at the sustainer's cutoff (7.8).

## The orbit, the retrofire and the pack

The coast is flown from the published orbit as Friendship 7's is, from the cutoff's place: its 30.50° N 72.41° W (Table
XVII) is 8.45° round from the pad in the frame that does not turn (derived), and its path 0.0004° below level puts it a
twentieth of a degree short of perigee. In orbit the capsule is held to Friendship 7's free-molecule figure; Carpenter's
drifting, his turns by hand and his fuel are not flown.

Thirty-four seconds before retrofire (the retrosequence begun at 04:32:36.5) it is turned to its retrofire attitude, and
this flight's is the one it was flown at, not the one it was meant to be at: the horizon scanner's error had the
automatic system and the gyros wrong, Carpenter lined it up by the window and by hand, and the tracking gave it **36.5°
below the level and 27° off in yaw**, the capsule's small end to his right; facing back along the track, heads up, his
right is the left of the motion, so the push is turned that way, north of the track (`retro.yaw`, plan.ts `Hold`: the
landing came down "15 nautical miles north of the nominal ground track"). It is held as one line through the burn,
where he brought the yaw down as it burned. He fired the motors with his own button at 04:33:10.3, "approximately 3
seconds late"; their impulse was 3 per cent under the group's nominal: 37,775 lb s over the capsule in orbit, 2,974.56 lb,
124.5 m/s (derived: no weight at retrofire is printed, and what he had spent of his fuel would add a per cent or so),
spread evenly from the first's lighting to the third's burning out. The pack is jettisoned at 04:34:10.8, a minute later,
as planned; from then the capsule weighs its documented 2,663.36 lb.

## The descent

What comes down is let loose at the drogue's height: let out by hand at 25,450 ft as the capsule swung, and the main by
hand at 8,950 ft when the barostat (reading the cabin's lagging pressure) had not let it out at 10,600; each on the
Redstone flights' canopies, and the capsule falls on them at its weight at the main's deployment, 2,557.70 lb.

What it gives (tests/orbital.test.mjs, staged.test.mjs): from the published orbit, 7.6 g and 20.1 kPa in the entry (7.5,
20.5), 0.05 g at 04:44:41 (04:44:44), the drogue out at 04:51:01 (04:50:54), **107 km beyond where it was picked up and
22 km to its right**, and 537 km from the planned point: recorded. The report has it some 250 nautical miles (463 km)
long. With the errors taken off one at a time (tests/orbital.test.mjs prints each): the yaw is worth 374 km here (175
statute miles, 282 km, in *This New Ocean*), the three seconds 28 km (15 miles), the low impulse 156 km (60 miles), the
pitch 2.5° high 35 km the other way; flown at 34°, no yaw, on time and at the group's impulse it comes down 33 km from
the planned point. So the simulator makes more of the retrofire's errors than the record does, and the cause is not
established (the capsule's drag in the entry, the retrofire weight, the ball the heights are over are each listed and
weighed). From where the ascent left it, 377 km beyond and 41 km across (recorded: the ascent's early cutoff and its
plane), the drogue 37 s late, and down 65 s after the record, falling 8.8 m/s on the main: the record's 4 min 9 s from
8,950 ft is 11.0 m/s on the average, and Carpenter had "right on 30 feet per second", 9.1 (recorded, not changed).

## What is simplified or left out

- The Atlas is Friendship 7's, the Atlas D's (weights and impulses from a secondary source), not 107-D's; the verniers are
  part of the sustainer; no build-up or tail-off; all the propellant is taken as burnable.
- The ascent's pitch programme is a stated law; no yaw steering; the azimuth is MA-5's.
- The retrofire attitude is one line held through the burn (the tracking's equivalent), not the attitude as it moved; the
  impulse is the tracking's, over the weight in orbit.
- Carpenter's attitude in orbit, his double authority and his empty tanks are not flown; nor is the capsule's swinging
  in the entry, which is what made him let the drogue out early.
- The retrofire is one even burn of the three motors' whole impulse; the propellant they burned is not taken off.
- The capsule's ablation, the jets' fuel and the oxygen are taken off at the drogue (its weight under the main), not as
  spent.
