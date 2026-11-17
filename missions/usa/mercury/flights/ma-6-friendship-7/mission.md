# Mercury-Atlas 6: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts` (a
`MercuryAtlasRecord`, [mercury-atlas-plan.ts](../../vehicles/mercury-atlas-plan.ts)), what it rests on and what the
simulator makes of it. Every figure there carries its source; the bibliography is [docs/sources.md](../../../../../docs/sources.md),
"Mercury-Atlas 6".

## What there is, and what there is not

- **Documented for this flight** (*Results of the First United States Manned Orbital Space Flight*, the "Results"): every
  event planned and as flown (Table 6-II, p. 71); the cutoff, 25,730 ft/s at 528,381 ft, the path 0.047° below level, and
  the orbit, 86.92 by 140.92 nautical miles, 88 min 29 s, 32.54° (Table 6-I); the loads and dynamic pressures going up and
  coming down (the same table); the spacecraft's weights at launch, in orbit, at retrofire and at the sea (p. 7); the
  retrofire attitude (Figure 2-22) and the final retrosequence time (p. 74); the drogue "at 30,000" and the main at 10,800 ft
  (pp. 191 and 135); where the capsule was picked up (NASA SP-45, Table 8-III).
- **The type's, taken for this unit** (`assumed`): the Atlas D's weights and its engines' specific impulses (Encyclopedia
  Astronautica, secondary); the booster section let go four seconds after its engines' cutoff (the Atlas D's sequence,
  Results Figure 4-4); the retrorockets' specified total impulse (the MA-4 and MA-5 trajectory report); the capsule's
  weight once the pack has gone (MA-7's fall from orbit to its reentry weight, TN D-3814); the drag curve, the drogue and
  the main as the Redstone flights have them (mercury-redstone.ts `HARDWARE`).
- **Not found anywhere reached**: anything of Atlas 109-D's own (its weights, its engines' measured thrust, its pitch
  programme: the *Postlaunch Memorandum Report* and Convair's flight report were not found); the retrofire's velocity
  change; what the orbit's heights are measured over; where on the orbit the cutoff was; the capsule's drag in orbit; the
  descent's measured rate.

## The ascent

All five engines are lit on the pad and draw on the one tank. The booster engines (two chambers of 154,000 lbf, SP-45's
rating taken at sea level, their vacuum thrust derived from the type's two specific impulses) are cut at the record's
2:09.6 and the booster section let go at 2:13.6; it leaves empty, its engines having drawn on the tank above them. The
sustainer and its two verniers (57,000 and 2 × 1,000 lbf, flown as one engine at the sustainer's impulses) burn on from
the same tank until the ground's guidance has 25,730 ft/s, space-fixed. The tower goes at 2:33.3.

The pitch programme was not found, so the ascent is flown on the simulator's stated law (sim/orbital.ts `Guidance`):
up the plumb line for the documented 15 s of the roll programme, pitched over for 15 s (estimated) in the plane of
MA-5's aiming azimuth, 72.51° (documented for MA-5, and MA-6's "was to be the same"), along its motion through the air
to 155 s, where the record has the radio guidance's steering begin, and on the linear tangent from there to the cutoff's
height and path (the targets: they are not checks). The inclination is a result.

What it gives (tests/staged.test.mjs): the cutoff speed reached at T+293.7 s, 7.7 s before the record's 301.4 (a recorded
miss: src/sim/misses.ts), with 1.1 t still in the tank; on the same figures it would have run dry at 302.8, so it is not
short. At the cutoff 161 by 280 km (the record 161 by 261), 32.33° (32.54); the greatest dynamic pressure 50.0 kPa at T+62 s
(982 lb/ft², 47.0 kPa, "at approximately T+1 minute"); 6.8 g at the booster engines' cutoff and 7.9 g at the sustainer's
(7.7). Every figure that is not documented is listed there with what a change in it is worth.

## The orbit, the retrofire and the pack

The coast is flown from the published orbit, read as mean elements with its period node to node (world/meanelements.ts):
from the estimated injection (`orbital.test.mjs`), or from where the ascent left the capsule, at the published orbit's
speed (`staged.ts` `published`: what the scene shows). The heights are taken over the equatorial radius: the report does
not say. **The period is flown node to node** (`orbit.kind`, derived from its own figures, tests/periods.test.mjs): on that
ball the heights' mean orbit has a nodal period 0.9 s shorter than the 88 min 29 s, an anomalistic one 9.4 s longer and a
Kepler one 14.0 s longer, so the nodal is the nearest for every period within the printed second. No document read says
which it is.

In orbit the capsule is a craft in free-molecule flow: 2.2 (a satellite's, as Vostok's) on 3.72 m², its shield's disc and
its side as the motion meets them held in orbit attitude, blunt end forward and pitched 34° (derived from the documented
sizes and attitude; the hours it drifted or was yawed round are not in it). Glenn's yaw jet, the fly-by-wire and the
drift are not flown: in orbit its attitude is not.

Thirty seconds before retrofire (the retrosequence, 04:32:38) it is turned to retrofire attitude: against the motion and
34° below the level, so the push is back and down. The three motors are one engine of three, ripple-fired from 04:33:08:
their specified total impulse, 38,880 lb s, over the 2,970 lb capsule, 128 m/s (derived), spread evenly from the first's
lighting to the third's burning out twenty seconds later. That has the same impulse and the same middle as the three
burning one, two, two and one at a time. The pack was to go at 04:33:58; kept on, it goes at 04:43:14, when Glenn said
"I think the pack just let go" (estimated: its straps burned through in the entry). Until then the coast carries the
whole capsule's mass and the capsule's own drag; from then the capsule's estimated 2,675.8 lb.

## The descent

What comes down is let loose at the drogue's height: the drogue is out at 30,000 ft (the pilot's reading, which the
report's figure confirms was above the design's 21,000; *This New Ocean* has 28,000), the main at 10,800 ft (Results, p.
135), each on the Redstone flights' canopies, and the capsule falls on them at its landing weight, 2,493 lb (documented).

What it gives (tests/orbital.test.mjs, staged.test.mjs): from the estimated injection, 7.7 g and 20.4 kPa in the entry
(7.7, 22.6), 0.05 g at 04:43:27 (the relay switched by hand at 04:43:31, when he was already "in a small g field"), the
drogue out at 04:49:15 (04:49:17.2), 104 km beyond the pick-up point along the track and 29 km to its right: recorded.
From where the ascent left it, 215 km beyond and 47 km across (recorded: the ascent's early cutoff and its plane), and
down at 04:56:14, 51 s after the record, falling 8.7 m/s on the main (the design's 30 ft/s): the main's 312 s from 10,800 ft
in the record is 10.6 m/s on the average, faster than the canopy as derived on Freedom 7 gives (recorded, not changed).

The record itself landed some 40 nautical miles short of the planned point, because the retrofire was worked out without
the consumables spent (*This New Ocean*, p. 433): that is the planners' miss, not this run's. The run is held to where it
was picked up.

## What is simplified or left out

- The Atlas is the Atlas D's (weights and impulses from a secondary source), not 109-D's; the verniers are part of the
  sustainer; no build-up or tail-off; all the propellant is taken as burnable.
- The ascent's pitch programme is a stated law; no yaw steering; the azimuth is MA-5's.
- The structure's limits are not in the plan: the live Atlas does not break up.
- The posigrades are the separation's push only (the scene's); the escape and jettison motors are not flown (no abort is
  offered on a flight into orbit).
- The retrofire is one even burn of the three motors' whole impulse; the propellant they burned is not taken off.
- Taking the attitude in hand gives up the retrosequence's clock, and Space fires the retrorockets: on Friendship 7 the
  clock and the hand were independent.
- The retropack kept on is not drawn burning, and its drag in the entry is the capsule's alone.
- The capsule's ablation, the jets' fuel and the oxygen are taken off at the drogue (its landing weight), not as spent.
