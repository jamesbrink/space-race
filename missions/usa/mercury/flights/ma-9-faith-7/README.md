# Mercury-Atlas 9, *Faith 7*

The last Mercury, and the one that asked most of the capsule: twenty-two orbits in thirty-four
hours, in a spacecraft built for four and a half, flown home by hand after its autopilot lost its
power.

| | |
| --- | --- |
| Liftoff | 15 May 1963, 13:04:13 UTC (08:04:13 EST) |
| Site | Cape Canaveral, Launch Complex 14: [lc-14.ts](../../sites/lc-14.ts) (its place is not built) |
| Pilot | L. Gordon Cooper, Jr. (backup: Alan B. Shepard, Jr.) |
| Spacecraft | Mercury No. 20, McDonnell Aircraft: [spacecraft.md](spacecraft.md) |
| Launch vehicle | Mercury-Atlas, Atlas 130-D: [atlas-lv3b.md](../../vehicles/atlas-lv3b.md) |
| Orbit | 87.2 by 144.2 nautical miles (161 by 267 km); 32.55°; period 88 min 45 s; 22 orbits |
| Cutoff | 303.03 s, a second early; a few ft/s fast, 500 ft low, 0.005° low in path angle |
| Duration | 34 h 19 min 49 s |
| Landing | 27°22.6′ N 176°35.3′ W by the recovery ship, south-east of Midway; predicted 27°22′ N 176°29′ W |
| Recovery | capsule and pilot together, aboard USS *Kearsarge*, about 40 minutes after landing |

**In this repo: the vehicle, in the gallery.** Spacecraft No. 20 on Atlas 130-D as they left the
pad can be turned, taken apart as they staged, and cut open. Its launch site and the flight itself
are not built: see "What is not built" below.

## What happened

Schirra's six orbits had gone with hardly a fault. So the last Mercury was to stay up a day. For
that, 183 changes were made to capsule No. 20 at the Cape: more oxygen, more water, bigger
batteries, a third fuel tank, and, to pay for them in weight, no periscope, no rate control system
and no spare transmitters. It was called the Manned One-Day Mission. Cooper called the capsule
Faith 7, after some thought, and the publicity office worried about the headline if it were lost.

On 14 May he was sealed in at 6:36. A diesel engine that moved the gantry would not start, and
then a radar at Bermuda went wrong; after noon the launch was put off. He went fishing. The next
morning the count ran with one unplanned hold, of four minutes, and at 8:04:13 the Atlas left.

The launch was very nearly perfect. The booster engines had been set slightly out of line to
cancel the twist an Atlas leaves its launcher with, and the twist was small. Cutoff came a second
early and a few feet a second fast. "Smack dab in the middle of the go plot," Schirra told him
from the Cape. Cooper turned the capsule round and watched his booster for eight minutes,
"silvery as can be with a white frosty band right around the middle".

Then he drifted, with the jets off, for most of a day. On the third orbit he pitched down 20° by a
mark on his window and threw out a ten-pound ball with a flash lamp at each pole; he could not
find it that night, found it flashing the next, and again the night after, eight to eleven miles
off. On the
sixth he tried to put out a balloon on a line, and it would not come out of its can. He measured
the radiation left by a hydrogen bomb exploded over the Pacific the summer before, pumped urine
and condensate from bag to bag with a syringe that leaked, and took pictures: of Tibet, where he
said he could see roads, houses and the smoke from chimneys, of the airglow, of the horizon in
four directions. After thirteen and a half hours he slept, woke an hour later with his suit too
warm, and napped on and off for six hours more, surprised afterwards at how soundly.

On the nineteenth orbit a green light came on: 0.05 g, the sign that the capsule had begun to fall
into the air. It had not. The autopilot had latched itself into its entry mode. On the next orbit
he lost his attitude readings, and on the twenty-first a short circuit took the inverter that fed
the autopilot. The carbon dioxide in the suit and the cabin was climbing. "Things are beginning to
stack up a little," he said.

So he flew it home. John Glenn, on a ship off Japan, read him a new checklist and counted him
down. Cooper held the horizon on the lines of his window, 34° nose down, and fired the three
rockets by hand at 33:59:53. "Right on the old gazoo," said Glenn. He dropped the pack by hand,
held the capsule through the entry on the fly-by-wire jets, put the drogue out by hand at
42,000 ft, and came down four and a half miles from the carrier *Kearsarge*, as near as Schirra's
autopilot had put him. He stayed in the capsule until it stood on the deck, and blew the hatch
there.

There was no Mercury-Atlas 10.

## Timeline

Times from liftoff, hours, minutes and seconds. The launch vehicle's events are from NASA SP-45,
p. 103; what was said, and when, is from the air-ground transcript in the same book (pp. 385 to
441); the tower's release is from *The Triumph of Astronaut L. Gordon Cooper, Jr. and the Faith 7*,
p. 11. No table of events planned and flown, such as the earlier flights' reports print, has been
read for this one.

| T+ | Event |
| --- | --- |
| 0:00:00 | Liftoff, 08:04:13 EST |
| 0:00:02 to 0:00:15 | Roll programme, to a heading of 72° |
| 0:02:12.5 | Booster engine cutoff |
| 0:02:15.4 | The booster section is dropped |
| 0:02:34 | Escape tower released |
| 0:05:03.03 | Sustainer engine cutoff |
| 0:05:04 | "I have SECO, sep cap" |
| 3:25 | The flashing beacon is thrown out |
| 9:00:20 | The balloon's squib is fired, and again a few minutes later; it does not deploy |
| 13:34 | Told to sleep |
| 19th orbit | The 0.05 g light comes on |
| 21st orbit | The autopilot's inverter fails |
| 33:59:53 | Retrofire, by hand |
| 34:01:01 | Retropack dropped, by hand |
| 34:09:19 | 0.05 g (as the ground predicted it) |
| 34:14:31 | "I got a drogue": by hand, at 42,000 ft |
| 34:16:03 | "I have a good main" |
| 34:19:49 | Landing |

The same events, in seconds, are `timeline` in [flight.ts](flight.ts).

## The sky at liftoff

Computed, not placed: `src/world/ephemeris.ts` from the pad's position (`sites/lc-14.ts`) and the
launch instant, 13:04:13 UTC. All `derived`. Elevations are geometric.

| Body | Azimuth (true) | Elevation | Note |
| --- | --- | --- | --- |
| Sun | 84.5° | 31.6° | In the east, two and a half hours up |
| Moon | 218.4° | 31.6° | In the south-west, going down; 62% lit, a day before last quarter |
| Jupiter | 138.7° | 57.4° | Magnitude −1.7, high in the south-east |
| Venus | 113.2° | 50.2° | Magnitude −3.3 |
| Saturn | 209.5° | 41.6° | 12° from the Moon |
| Mercury | 81.9° | 28.3° | 4° from the Sun |

The Moon was up in daylight, as high as the Sun and on the other side of the sky from the way the
Atlas went. Mars, Uranus and Neptune were below the horizon.

**The weather.** No record of the weather at the pad that morning, with figures, is in anything
read. *This New Ocean* has the operations director say the night before that "the weather is
good" (p. 494) and quotes a report that "the sun literally smiled on MA-9" (p. 503). In the landing area the ground told the
pilot, at 34:13:58: cloud tops near 36,000 ft, half the sky covered at 1,500 ft, waves 5 to 6 ft,
wind 15 knots (NASA SP-45, p. 441). No `weather.ts` is written for this flight: it has no site
model for a sky to stand over, and no record to write one from.

## What is not built

- **The launch site.** Complex 14 is [a site as numbers](../../sites/lc-14.ts): where it was, and
  which way the vehicle faced on it.
- **The pilot, standing**, and **a cabin to sit in**: the capsule's inside is modelled and cannot
  be boarded. The figure on the couch is the Mercury suit as modelled, to Cooper's height and with
  three things his photographs show ([spacecraft.md](spacecraft.md), "The pilot").
- **The flight.** Nothing here can be flown. It wants the Atlas's weights, thrust and pitch
  programme, an orbit and an entry as data, and for this flight above all a capsule that can be
  flown by hand through both with nothing but a window to steer by.
- **Nothing is seen to leave.** The flashing beacon is in its canister, the balloon in its can and
  the aerial's two tapes on their reels, as at liftoff. The umbilical's door is shut.
- **No periscope**, because there was none: this is the one Mercury flight here with no periscope
  to play on a clock.

## Where sources disagree

- **How many changes.** 183 (*This New Ocean*, p. 490); NASA SP-45's Table 3-II (p. 52) lists
  twenty.
- **What the periscope weighed.** 76 lb with its ballast (SP-45, Table 3-II; *This New Ocean*);
  75 lb (the press kit, p. 36).
- **The television.** *This New Ocean* has Cooper explain "the new slow-scan television monitor"
  (p. 490) and adjust "his television monitor" in orbit (p. 500). SP-45's photograph of the system
  (Figure 3-12) shows a camera, a control unit, a transmitter and two lenses, and the press kit
  puts every monitor on the ground (p. 21). The model has the camera.
- **What the television weighed.** "The ten-pound camera" (the press kit, p. 20); 10 lb, and "an
  additional 7 pounds ... for cabling, bracket and ballast" (*The Triumph*, p. 20).
- **The fuel.** Fifteen pounds more peroxide (*This New Ocean*, p. 490); a tank of 15 lb capacity
  "intentionally serviced to only 10 lb" (SP-45, Table 3-II); "an additional 10 pounds ... bringing
  the total fuel weight to 66 pounds" (the press kit, p. 30).
- **The batteries.** Two 1,500 watt-hour batteries replaced by two of 3,000 (SP-45, Table 3-II);
  "one 1,500 watt-hour battery and five 3,000 watt-hour batteries" in all (the press kit, p. 31).
- **The apogee.** 144.2 nautical miles (SP-45, p. 13); 144.6 as the Canary Islands read it to the
  pilot on the first pass; 166 statute miles (*This New Ocean*, p. 496).
- **When the Atlas was accepted.** 15 March 1963 (*This New Ocean*, p. 491); SP-45 prints "March
  15, 1962" (p. 102), a year before it was built.
- **How far from the ship.** 4½ miles (SP-45, Table 3-I, p. 51); "less than four miles" (NASA's
  caption to photograph KSC-63-MA9-174).
- **The duration.** 34:19:49 (SP-45, Table 3-I); 34:03:30 in *This New Ocean*'s table of flights
  (p. 644); "34 hours and 20 minutes" (*The Triumph*, p. 1).

## Where the spacecraft is now

At Space Center Houston, hung nose down with its hatch off (Wikimedia Commons, *Category:Faith 7 at
Space Center Houston*). Those photographs were read for where UNITED STATES stands beside the
hatch, and for nothing that a restorer could have changed.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Mercury-Atlas 9".
