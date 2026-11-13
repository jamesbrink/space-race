# Mercury-Redstone 4, *Liberty Bell 7*

The second American in space, in the first Mercury capsule with a window in front of its pilot and
a hatch he could blow off himself.

| | |
| --- | --- |
| Liftoff | 21 July 1961, 12:20:36 UTC (07:20:36 EST) |
| Site | Cape Canaveral, Launch Complex 5: [lc-5.md](../../sites/lc-5.md) |
| Pilot | Virgil I. "Gus" Grissom (backup: John Glenn) |
| Spacecraft | Mercury No. 11, McDonnell Aircraft: [spacecraft.md](spacecraft.md) |
| Launch vehicle | Mercury-Redstone MRLV, MR-8: [redstone-mrlv.md](../../vehicles/redstone-mrlv.md) |
| Trajectory | suborbital on an azimuth of 100°; apogee 190.4 km (102.8 nmi), range 486.2 km (262.5 nmi) |
| Velocity at cutoff | 7,580 ft/s inertial (8,317 km/h); 6,618 ft/s relative to the ground |
| Loads | 6.3 g at booster cutoff, 11.1 g on entry; greatest dynamic pressure 605.5 lb/ft² |
| Weightless | 5 min 0 s |
| Duration | 15 min 37 s |
| Recovery | the pilot by helicopter to USS *Randolph*; the spacecraft sank |

**In this repo: the vehicle, in the gallery and at its launch site, and its pilot.** The spacecraft
and its launch vehicle are modelled and can be turned, taken apart and cut open, and stand on Launch
Complex 5 as it stood that morning, from the pilot going aboard at 03:58 to the pad standing empty.
Grissom stands on the hardstand where NASA's photograph 61-MR4-83 has him, walking to the lift with
his ventilator in his right hand, in the suit of that morning
([mark-iv-suit.md](../../crew/mark-iv-suit.md), "5 May and 21 July 1961": the wrist rings, the chest
mirror, the parachute harness, the new microphones, and his own legs), and can be walked as. The
flight itself is not built: see "What is not built" below.

## What happened

Shepard had flown eleven weeks earlier and reported on everything: the capsule shook on the way
up, the panel was awkward to read, there was too much to do in five minutes, and he could not see
out. Grissom's capsule was the answer to most of it. It had a window in front of his face where
Freedom 7 had two portholes to the side; a panel rearranged for the eye; more damping in the
booster and more padding under his head; a flight plan with less in it. It also had the hatch the
orbital flights would need, held by seventy bolts and a fuse that broke them all at once.

The count was twice put off for weather. On the third morning a hatch bolt would not go in, and
after half an hour it was decided that sixty-nine would hold. The searchlights were put out
because they upset the telemetry, forty-one minutes more went by waiting for the cloud to open,
and at 07:20 the Redstone left the pad.

Grissom watched the sky go black, saw a star that was Venus, and saw the escape tower climb away
to his right. He took all three axes by hand at once, where Shepard had taken them one at a time,
and found the controls sluggish; he fell behind the plan because he kept looking out of the
window. He fired the retrorockets himself. Coming down he tried the new rate command system, which
held whatever rate of turn he asked for, and saw both parachutes open through the window.

The landing was mild. The capsule lay over on its side with the window under water, then righted
itself. Grissom made ready to leave: he took the knife off the door, and took the cover and the
safety pin off the hatch's plunger. He was lying on his back waiting for the helicopter to say it
had hold when the hatch blew. Water came over the sill. He was out in a moment, and in the sea for
three or four minutes, his suit filling through an oxygen inlet he had left open, while the first
helicopter hooked on to a capsule that was now heavier than it could lift. It let go. The capsule
sank where the sea is about 2,800 fathoms deep.

He said he had not touched the plunger. Tests afterwards could not make a hatch fire by itself,
and no explanation was found.

## Timeline

Times from liftoff, as *Results of the Second U.S. Manned Suborbital Space Flight* gives them
(pp. 6 and 7), to the second. Apogee is derived: the retro sequence began "30 seconds prior".

| T+ | Event |
| --- | --- |
| 0:00 | Liftoff, 07:20 EST |
| 2:23 | Booster cutoff; escape tower released and fired clear |
| 2:33 | Spacecraft separates: posigrade rockets; periscope out; five seconds of rate damping, then the turnaround |
| 3:05 | Grissom takes manual control |
| 4:46 | Retro sequence begun by the timer |
| 5:10 | He fires the retrorockets |
| 5:16 | Apogee, 190.4 km |
| 5:43 | Rate command control, kept through the entry |
| 6:07 | Retropack jettisoned |
| 9:41 | Drogue parachute, 21,000 ft |
| 10:14 | Main parachute, 12,300 ft |
| 15:37 | Landing |

The same events, in seconds, are `timeline` in [flight.ts](flight.ts).

On the pad (the same report, p. 6; TM X-53107, 8.3.2): the first half of the split count began at
06:00 EST on 20 July; liquid oxygen went aboard from T-180, at 03:00 on the 21st after a planned
hour's hold for the weather; the pilot was in the spacecraft at 03:58, 3 hours 22 minutes before
launch; holds of 30 minutes at T-45 (the hatch bolt), 9 minutes at T-30 (the searchlights) and 41
minutes at T-15 (cloud). The whole morning on the clock, and what stood on the pad through it, is in
[lc-5.md](../../sites/lc-5.md), "Where things stood, and when (MR-4, 21 July 1961)"; the same as
data is `MORNING` in [flight.ts](flight.ts). (The report prints "2:30 a.m. e.s.t. on July 20" for
the start of the count's second half, which cannot be: T-180 was reached at 02:00 on the 21st.)

## The sky at liftoff

Computed, not placed: `src/world/ephemeris.ts` from the pad's position (`sites/lc-5.ts`) and the
launch instant, 12:20:36 UTC. All `derived`. Elevations are geometric.

| Body | Azimuth (true) | Elevation | Note |
| --- | --- | --- | --- |
| Sun | 077.2° | 20.6° | Low in the east-north-east, an hour and a half up |
| Venus | 099.5° | 60.8° | Magnitude −3.7, high over the flight path. Two minutes after liftoff, with the sky gone black, Grissom saw "one rather faint star in the center of the window": it was Venus |
| Mercury | 085.1° | 39.6° | Lost in daylight |
| Moon | | −68.7° | Below the horizon; a day past first quarter |

Mars, Jupiter, Saturn, Uranus and Neptune were below the horizon. Sunrise was at about 05:38 EST: the
pilot went aboard in the dark, the structure rolled back in the first light (the Sun 7° under the
horizon at T-55 by the count) and the searchlights were put out with the Sun 3.8° up.

**The weather, as recorded, and as shown.** At 07:00 EST, twenty minutes before liftoff, the Cape's
weather station (the Skid Strip) reported the sky covered and no ceiling: one okta of cloud at 510 m
(coded cumulonimbus), two of altocumulus at 5,400 m, and a whole sky of thin cirrostratus above;
wind from 200° at 2.1 m/s; visibility at the station's 16 km limit; 25.5 °C. An hour earlier it had a
ceiling at 3,000 m. Patrick, 23 km south, had five oktas of altocumulus at 4,500 m at 07:00. That
is the "existing overcast" the count was held 41 minutes for (*Results*, p. 50). From 190 km the
pilot found that "high cirrus blotted out everything except an area from about Daytona Beach back
inland to Orlando and Lakeland to Lake Okeechobee and down to the tip of Florida. Beyond this the
Gulf of Mexico was visible" (*Results*, p. 37); he picked out the Cape and the Banana River through
it, and the Gulf coast between Apalachicola and Mobile, "both a hazy blue" (p. 52), and never saw
Cuba. *This New Ocean* (p. 369) has the outlook the launch was decided on: northern Florida under
"high cirrus and lower patches of cumulus", southern Florida and Cuba "splotched by scattered
cumulus". Documented: NOAA's Integrated Surface Database, stations 74794012868 and 74795012867.

**The viewer shows it**, from [weather.ts](weather.ts) beside this file (`Flight.weather`: every
figure with its confidence and source). The launch site stands under that morning's sky: an eighth
of cumulus on a light wind from 200°, patches of altocumulus high over them, and over the whole sky
the veil, milky, with the Sun's disc and a glow in it. The light is that day's: under the veil the
Sun's is a little over half of what a clear sky would give at that height, the shadows are softer
and the sky's own light is more; before sunrise the veil is lit while the pad is still dark. From
height the veil is a white sheet over everything but the two stretches the pilot named. What is
ours in it, all estimated and said so where it is set: the veil's height (not recorded; 10.5 km)
and how thick it is (an optical depth of 0.4: thin, by the station's report of no ceiling under
eight oktas), what that does to the light (`src/viewer/day.ts`), the cumulus's depth and size, how
far past the stations' limits one could see (40 km), the bounds of each stretch of country the
record names and the cover its words are taken to mean, and everything beyond what the record
speaks of. It is the 07:00 sky throughout: the thicker cloud of an hour earlier, which the count
was held for, is not shown thicker (lc-5.md, "What the model gets wrong or leaves out").

## What is not built

**The launch site is built** ([lc-5.md](../../sites/lc-5.md), "5 May and 21 July 1961", has what
differs from Freedom 7's morning and how sure each difference is). What it still lacks:

- **Grissom on the couch**: the pilot in the cabin's cutaway is still Shepard's figure with the name
  changed and a mirror laid on him. The standing figure's suit can be seated in his place
  (mark-iv-suit.md, "On the couch", says what would change and what has not been looked at);
- **a cabin to sit in**: the capsule's inside is modelled and cannot be boarded;
- what July's photographs show and the pad does not have: the tail heater, the LOX trailers, the
  M-113, the covers (lc-5.md, the same section). The two cable masts now stand where those
  photographs put them, on the launcher against the vehicle; the same photographs say the vehicle
  itself stood turned about 60° on the pad from how it is modelled, which is left open (lc-5.md, "An
  open question: which way round the vehicle stood").

**The flight.** To be flown it needs what Freedom 7 has in `flight.ts`: the booster's measured
thrust and cutoff for MR-8, the tilt programme on 100°, the capsule's weights at each stage (the
MR-4 postlaunch memorandum report has them; it has not been found), and `flies` for what is shed
and when. The rate command system would be a new control mode for the flight deck. After landing,
the simulator would have to let the capsule fill and sink.

## Where sources disagree

- **The hatch bolt.** *Results* (p. 6) and TM X-53107 call the hold at T-45 one "to install a
  misalined hatch bolt" or "to complete capsule work"; *This New Ocean* (p. 370) says the engineers
  "decided that the remaining 69 bolts were sufficient". The model follows the history: 69.
- **The launch azimuth.** TM X-53107 gives 100° for MR-4 and 102° for MR-3 in one place (8.3.2)
  and 105° as the original in another (7.4.3); *This New Ocean* says the azimuth was "changed by
  three degrees". 100° is not in doubt.
- **Cutoff velocity.** *Results* and TM X-53107 give 7,580 ft/s space-fixed; Hammack and Heberlig's
  table gives 7,516.
- **The seconds of liftoff.** *Results* gives 7:20 a.m. in its text and 7:20:36 in the medical
  countdown's table (Table 5-II, p. 31); TM X-53107 gives 0720.
- **When the structure rolled back.** By the count, at T-55; *This New Ocean* has "a gantry
  technician" finding the hatch bolt at T-45. The model follows the count (lc-5.md).

## Where the spacecraft is now

On the floor of the Atlantic for thirty-eight years. It was raised on 20 July 1999, without its
hatch, and is kept at the Cosmosphere in Hutchinson, Kansas, where it was cleaned and put on show
(secondary sources: the museum's own record has not been read). Its paint survived well enough to place UNITED STATES and the periscope's door on the
model.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
