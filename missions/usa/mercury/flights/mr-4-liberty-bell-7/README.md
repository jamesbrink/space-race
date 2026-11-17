# Mercury-Redstone 4, *Liberty Bell 7*

The second American in space, in the first Mercury capsule with a window in front of its pilot and
a hatch he could blow off himself.

| | |
| --- | --- |
| Liftoff | 21 July 1961, 12:20:36 UTC (07:20:36 EST) |
| Site | Cape Canaveral, Launch Complex 5: [lc-5.md](../../../places/cape-canaveral/lc-5.md) |
| Pilot | Virgil I. "Gus" Grissom (backup: John Glenn) |
| Spacecraft | Mercury No. 11, McDonnell Aircraft: [spacecraft.md](spacecraft.md) |
| Launch vehicle | Mercury-Redstone MRLV, MR-8: [redstone-mrlv.md](../../vehicles/redstone-mrlv.md) |
| Trajectory | suborbital on an azimuth of 100°; apogee 190.4 km (102.8 nmi), range 486.2 km (262.5 nmi) |
| Velocity at cutoff | 7,580 ft/s inertial (8,317 km/h); 6,618 ft/s relative to the ground |
| Loads | 6.3 g at booster cutoff, 11.1 g on entry; greatest dynamic pressure 605.5 lb/ft² |
| Weightless | 5 min 0 s |
| Duration | 15 min 37 s |
| Recovery | the pilot by helicopter to USS *Randolph*; the spacecraft sank |

**In this repo: the vehicle, in the gallery and at its launch site, its pilot, and the flight, to fly.** The spacecraft
and its launch vehicle are modelled and can be turned, taken apart and cut open, and stand on Launch
Complex 5 as it stood that morning, from the pilot going aboard at 03:58 to the pad standing empty.
Grissom stands on the hardstand where NASA's photograph 61-MR4-83 has him, walking to the lift with
his ventilator in his right hand, in the suit of that morning
([mark-iv-suit.md](../../crew/mark-iv-suit.md), "5 May and 21 July 1961": the wrist rings, the chest
mirror, the parachute harness, the new microphones, and his own legs), and can be walked as. The
flight is flown by the simulator from the record: "The flight as flown", below.

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
[lc-5.md](../../../places/cape-canaveral/lc-5.md), "Where things stood, and when (MR-4, 21 July 1961)"; the same as
data is `MORNING` in [flight.ts](flight.ts). (The report prints "2:30 a.m. e.s.t. on July 20" for
the start of the count's second half, which cannot be: T-180 was reached at 02:00 on the 21st.)

## The sky at liftoff

Computed, not placed: `src/world/ephemeris.ts` from the pad's position (`places/cape-canaveral/lc-5.ts`) and the
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

**The launch site is built** ([lc-5.md](../../../places/cape-canaveral/lc-5.md), "5 May and 21 July 1961", has what
differs from Freedom 7's morning and how sure each difference is). What it still lacks:

- **Grissom on the couch**: the pilot in the cabin's cutaway is still Shepard's figure with the name
  changed and a mirror laid on him. The standing figure's suit can be seated in his place
  (mark-iv-suit.md, "On the couch", says what would change and what has not been looked at);
- **a cabin to sit in**: the capsule's inside is modelled and cannot be boarded;
- what July's photographs show and the pad does not have: the tail heater, the LOX trailers, the
  M-113, the covers (lc-5.md, the same section). The two cable masts stand where those
  photographs put them, on the launcher against the vehicle, and the vehicle stands as the same
  photographs and the launcher's rule have it: turned to its 100° azimuth, the hatch 60° round from
  the cherry picker's side and bearing 235° true (lc-5.md, "Which way round the vehicle stood"). The
  blast screens and their tanks are probably on the wrong side of the pad (the same section).

**The flight** is flown on the stack's own hardware, as Freedom 7's is: see "The flight as flown" below.

## The flight as flown

**Fly it** (the third place, or L at the launch site): the flight deck Freedom 7 has, on this flight's data
and no code of its own. By default the flight is the record's: the gyros fly the tilt programme on 100°,
the sequencer sets off cutoff and the tower at 02:23, separation at 02:33, retrofire at 05:10, the pack at
06:07, and the spacecraft's own sequence lets the parachutes out at 21,000 and 12,300 ft. Every part of it
is open to the hand: G gives up the platform (W S A D Q E then are the vanes and, on the spacecraft
alone, the manual jets), B the sequencer (Space then sets off each event in turn, whenever it is
pressed), a right click on a part offers what that part can do, and the cabin's rings and buttons do it
from the couch. What No. 11 had that Freedom 7 did not is offered too: the **Rate command** switch (on the
spacecraft alone the stick asks for a rate of turn and the manual jets hold it within ±3 degrees a second,
as Grissom flew the entry from 05:43), the **window** (1 from the couch, or through it from the chase
camera), and the panel rearranged, its needles and sequence lights reading the flight. What a hand does has its consequences in the same physics: pitched hard over at T+40
with the platform off, the stack breaks up at T+42 on its bending limit and the escape rocket pulls the
spacecraft clear.

`src/sim/fly.ts` integrates the flight from its plan, written from `DAY` in [flight.ts](flight.ts), which is this
flight's own day and figures on the Mercury-Redstone's hardware
([mercury-redstone.ts](../../vehicles/mercury-redstone.ts): the A-7's nozzle, the tilt programme's
curve, the drag curves, the escape rocket, the jets, the parachutes, how the weight lies along the
stack, each with its confidence and source, the same for Freedom 7). Nothing is fitted;
`tests/sim.test.mjs` holds the run to `checks`, which were set from the record before anything was
flown, and keeps each miss with its cause in `src/sim/misses.ts`.

What is MR-4's own: the winds aloft of the 07:00 balloon (IGRA, 21 July 1961 12Z, fourteen levels to
31.4 km: light, southerly low down, easterly high up); the 100° azimuth; MR-8's 79,220 lbf, 217.4 s
and 65,976 lb at liftoff (TM X-53107, Table 8-1); cutoff and the tower at 02:23, separation at 02:33,
retrofire by the pilot at 05:10 and five seconds apart, held at 34°, the retropack at 06:07, the drogue
at 21,000 ft and the main at 12,300 ft (*This New Ocean*, p. 372). **What the record read does not give**:
No. 11's weights (in its Postlaunch Memorandum Report, not found), taken as No. 7's less the 46 lb its
hatch saved, `estimated`; the posigrades' push, Freedom 7's 30 ft/s, `estimated`; the conditions at
separation (height, climb, heading).

| Check (*Results*, Table 2-I and p. 6) | Record | Flown whole | From the record's speed at separation |
| --- | --- | --- | --- |
| Greatest height | 102.8 nmi | +10.6 % | +5.8 % |
| Its time | 05:16 | 05:21.6, holds | 05:16.0, holds |
| Range | 262.5 nmi | +15.0 % | +7.9 % |
| Space-fixed speed at separation | 7,580 ft/s | +3.9 % | (input) |
| Earth-fixed speed at separation | 6,618 ft/s | +4.0 % | (input) |
| Greatest pressure going up | 605.5 lb/sq ft | −1.1 %, holds | |
| Greatest load going up | 6.3 g | 6.39 g, holds | |
| Greatest load coming down | 11.1 g | +9.1 % | +3.4 %, holds |
| Drogue | 09:41 | +24 s | +11 s |
| Main | 10:14 | +19 s | +5 s, holds |
| Landing | 15:37 | +69 s | +59 s |

The powered flight ends 4 % too fast, as Freedom 7's does and for the same reason: off the pad at
1.20 g, one per cent in thrust or weight is three or four in speed, and the engine is two figures
from a summary table held steady from liftoff to cutoff. Everything after follows from it. The load
going up holds here, where on Freedom 7 it cannot be a check (the A-7's nozzle is derived from
MR-3's 6.3 g). The greatest pressure going up holds, 1.1 % low, flown through the day's air (ERA5's column over
the pad at the hour nearest liftoff, `FlightPlan.aloft`: a July morning's, 4 to 15 per cent denser than the 1976 standard
from 10 to 15 km, through which the greatest pressure is met). In the standard atmosphere it was 6.7 % low, the two
flights' runs nearly the same where the record has MR-4's 3 % above MR-3's (issue #12): the day's air is what was
missing: through each day's own air the run has MR-4's 3.5 % above MR-3's, the record 3.3 %. The landing is a minute late for a reason of its own:
the history has the main out at 12,300 ft, and from there the record's 5 min 23 s to the sea is
11.6 m/s on the average, where the canopy (derived on Freedom 7) gives 8.8 and Grissom read 30 to 32
ft/s. Flown from the record's speed at separation the capsule comes to its top on the record's
second; it is still high, because the height and climb it starts from are the run's own.

## The end of the flight

Down in the sea the spacecraft is a body afloat (`src/sim/afloat.ts`; its hull and spaces every Mercury
capsule's, [vehicles/mercury-afloat.ts](../../vehicles/mercury-afloat.ts); what is this one's, [afloat.ts](afloat.ts)).
It floats on the day's sea (ERA5's at the landing, `weather.ts` `sea`: a swell of 0.80 m from 106° at
6.4 s and a wind sea of 0.30 m from 146° at 2.5 s; "the mild swells we were having", *Results*, p. 55), rising and
falling on it with the four-foot landing bag hanging under it full of the sea, and heeling in the plane of its hatch:
the sea's slope there tips it, and what is aboard and the water in it turn it about its centre of mass. That centre and
its inertia are No. 7's flotation figures (MR-3 Postlaunch Report, 3.1: 2,316.03 lb at Z 119.77 in, 15.27 in over the
greatest diameter; 332 and 347 slug ft² in pitch and yaw), less No. 11's 46 lb hatch saving at the hatch, with the
beryllium shield (140 kg, estimated) let down four feet on the bag; Grissom (at station 18 in, estimated) and the hatch
are masses at their places. Upright it is stiff: the bag's water turns with it, and it rolls a few degrees on the
wind sea. The record's run goes on past the landing to the end:

| T+ | | Confidence |
| --- | --- | --- |
| 15:37 | down; it comes upright over 58 s ("slowly coming vertical" at 16:35) | documented |
| 26:09 | the last words, "Ah, roger" | documented |
| 26:20 | the hatch blows, flies off (23 lb, thrown at 3.7 m/s: what lands it "about five feet from the hatch") and lies on the sea; the sea spills over the sill at the next wave | the instant estimated; the throw derived |
| 26:21 to 26:25 | Grissom goes out over the sill: his weight at the hatch heels it toward the hatch, and the sea pours in | estimated |
| 26:28 | 22° over toward the hatch, the cabin half full: its water, standing level, has run to the low side, and with no surface stiffening it the capsule lies over | flown |
| 26:30 | the cabin full, it comes nearly upright and goes down; its top under 16 s after the hatch | flown |
| 26:50 | the helicopter's line comes taut on a capsule 9 m down; it pulls its 4,000 lbf and cannot get it out: the cabin drains to the sill and the bag slowly, and the shield stays 1.3 m under at best | taut and cast estimated; the capacity derived |
| 30:05 | it lets go; the capsule floods again and is out of sight 44 s later | flown |

Against the record (tests/afloat.test.mjs, `misses` under `afloat`): under 16 s after the hatch, where the history
has it "sinking fast" and gone from sight as the line came taut, within a minute; the sea first over the sill within
two seconds of the hatch ("water start to spill over the doorsill", *Results*, p. 55); flooded it weighs 6,200 lb,
"over 5000 pounds" as the history says and 12.7 per cent past the 5,000 to 6,000 it was read as before the run (a
recorded miss: the cabin's free volume is ours); and 22° over at the most before its top went under, where NASA's
photograph S61-02921 ("the top of the capsule before it sinks") shows it 30 to 40° off the plumb line (a recorded miss:
the photograph is read by eye, and what it leans to rests on the estimates above). The sea in the cabin is drawn where
the run has it (`viewer/flooding.ts`), level as the capsule heels round it: from the seat it comes up over the right
console and the sill.

On the deck it is the same physics: **Blow the hatch** (Space once it is down, a right click on the hatch, or the
plunger by the pilot's right arm from the couch; `flies.hatch` in [flight.ts](flight.ts)), and the hatch flies off as a
body of its own and the sea comes in; there is no helicopter, and the clock runs on at life's pace until the capsule is
out of sight. Left on, the capsule floats and the card says what happened to the real one. Blown in flight the hatch
leaves at the same 3.7 m/s and comes down on its own; the flight is flown on as if the cabin were closed (what an entry
with a hole in the side does is not in anything read, and the card says so), and down in the sea the open sill takes
the sea at once. Which of the plunger, a stray lanyard or static fired the hatch on the day is disputed and nothing here
takes a side: on the deck it blows when it is told to.

**What the ending lacks**: the capsule heels only in the plane of its hatch (it does not drift or turn, and the sea's
slope across that plane does not tip it; the hatch faces south-west, ours); the water in it stands level at once (no
slosh, no jet through the sill), and water with a surface is a weight and not a mass that turns; no added mass of the sea;
before the hatch it rolls a few degrees on the wind sea, where the history has it "rolling badly with the swells" (This
New Ocean, p. 372); the landing bag is let down at 10:26 as rigid nested bands, not cloth, and never
bellies or swings (spacecraft.md); nothing is drawn under the sea (the camera stays on the surface and watches it go);
the hatch lies on the swell rather than skipping (below); the water in the cabin is a flat surface, and nothing is drawn under
it. The sea round it is the day's
(ERA5's swell and wind sea, weather.ts), the same sea the simulator floats it on, with short waves for the light
only. Hunt Club 1 (recovery.ts) is flown on the record's order of events: 2 miles south-west as the capsule came
down, circling it by 18:23, in over it as the hatch went, its wheels in the water as it hooked the sinking capsule,
held over it by its line while it pulled, and away when it let go; its track between those, its heights, the way it
faced and its line's length are ours. It is heard (sound/model.ts `rotorcraftTimbres`): its blades passing at 17.2 a second, its tail rotor's hum, its nine cylinders firing, from the chase view, and through the cabin's wall from the seat until the hatch goes; their levels and timbres are estimated. **The hatch does not skip.** The one account of it is Reinhard's, from Hunt Club 1 on its final approach: he "saw
the hatch cover fly off, strike the water at a distance of about five feet from the hatch, and then go skipping over
the waves" (*This New Ocean*, p. 373). Nothing else read describes it (*Results*, pp. 4, 7 and 53 to 55; Hammack and
Heberlig; SEDR 104; SP-45; the 1999 recovery, which raised the capsule without it): no count of skips, no distance, no
fate. Whether a 23 lb plate skips turns on how it lies and spins as it meets the sea; thrown off along its outward normal
(sim/loose.ts) it meets the sea edge first, and nothing records its tumbling. A skip built here would be chosen to match
the words, so the hatch strikes the sea five feet off, as he saw, and lies there.

**Grissom in the sea** (`recovery.ts` `GRISSOM`, viewer/swimmer.ts) is the crew figure, his
helmet left in the cabin ("I lifted the helmet from my head and dropped it"), from the instant he is out through the
hatch to Hunt Club 3's hoist: out on the hatch's side and free of the dye marker's line, his shoulders above the water;
back the four or five feet to the capsule as Hunt Club 1 hooked it; then away from it, caught in the rotorwash between the
two helicopters, his armpits at the water as his suit filled; into the horse collar backwards, and drawn up the cable to
the door, his right hand on it over his head and his left arm down, as NASA 61-MR4-82 shows him (*Results*, pp. 7 and
55; *This New Ocean*, p. 375). He rides the day's sea that is drawn, the same function the capsule floats on. Three and a
half minutes in the water, where the record has three to four. His places between those events, which way he faced and
his pose in the water are ours; he wears the comm cap he had under the helmet. On a run flown by hand he is gone from
the couch once out, and is not drawn in the sea: his places are the record's.

**Hunt Club 3** (model/hunt-club-3.py: the same HUS-1 as Hunt Club 1 in its own markings, 30 on the nose and the door
and RESCUE twice aft of it, as 61-MR4-82 shows it; ET, the squadron's code, as MSFC-6116429 and S61-02819 give it) is
flown on the record's order of events: sent at 24:03 to look at the dye marker's line three quarters of a mile out at
160°, back as the hatch went, low near Grissom with the collar swinging in the water from its door, over him with its
hoist out, and away. **Its bureau number is not legible in any photograph read** (61-MR4-82 does not show its tail;
MSFC-6116429 and S61-02819 are too coarse), so none is painted: *This Day in Aviation* gives 148754 with no source, and it
is not used. Its track between the record's events, its heights and the way it faced are ours, and it is heard as Hunt
Club 1 is.

## Where sources disagree

- **The hatch bolt.** *Results* (p. 6) and TM X-53107 call the hold at T-45 one "to install a
  misalined hatch bolt" or "to complete capsule work"; *This New Ocean* (p. 370) says the engineers
  "decided that the remaining 69 bolts were sufficient". The model follows the history: 69.
- **The launch azimuth.** TM X-53107 gives 100° for MR-4 and 102° for MR-3 in one place (8.3.2)
  and 105° as the original in another (7.4.3); *This New Ocean* says the azimuth was "changed by
  three degrees". 100° is not in doubt.
- **The seconds of liftoff.** *Results* gives 7:20 a.m. in its text and 7:20:36 in the medical
  countdown's table (Table 5-II, p. 31); TM X-53107 gives 0720.
- **How long he was in the water.** *Results* (p. 7) and Hammack and Heberlig say three or four
  minutes; *This New Ocean* (p. 375) four or five.
- **The main's height.** *This New Ocean* (p. 372) has 12,300 ft, "about 1000 feet higher than the
  design nominal"; Hammack and Heberlig's design figure is 10,000 ft, 2,300 lower, and the record's times
  (10:14 to 15:37 under it) fit 10,000 better than 12,300 ("The flight as flown").
- **Cutoff velocity and the Earth-fixed velocity.** *Results* and TM X-53107 give 7,580 and 6,618 ft/s;
  Hammack and Heberlig's Figure 20 gives 7,516 and 6,561. The checks take *Results*'.
- **When the structure rolled back.** By the count, at T-55; *This New Ocean* has "a gantry
  technician" finding the hatch bolt at T-45. The model follows the count (lc-5.md).

## Where the spacecraft is now

On the floor of the Atlantic for thirty-eight years. It was raised on 20 July 1999, without its
hatch, and is kept at the Cosmosphere in Hutchinson, Kansas, where it was cleaned and put on show
(secondary sources: the museum's own record has not been read). Its paint survived well enough to place UNITED STATES and the periscope's door on the
model.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
