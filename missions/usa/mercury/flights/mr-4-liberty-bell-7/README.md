# Mercury-Redstone 4, *Liberty Bell 7*

The second American in space, in the first Mercury capsule with a window in front of its pilot and
a hatch he could blow off himself.

| | |
| --- | --- |
| Liftoff | 21 July 1961, 12:20 UTC (07:20 EST) |
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

**In this repo: the vehicle, in the gallery.** The spacecraft and its launch vehicle are modelled
and can be turned, taken apart and cut open. Its launch site as it stood that day and its flight
are not built: see "What is not built" below.

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
06:00 EST on 20 July; the pilot was in the spacecraft at 03:58 on the 21st, 3 hours 22 minutes
before launch; holds of 30 minutes at T-45 (the hatch bolt), 9 minutes at T-30 (the searchlights)
and 41 minutes at T-15 (cloud).

## The sky at liftoff

Computed, not placed: `src/world/ephemeris.ts` from the pad's position (`sites/lc-5.ts`) and the
launch instant, 12:20:36 UTC. All `derived`. Elevations are geometric.

| Body | Azimuth (true) | Elevation | Note |
| --- | --- | --- | --- |
| Sun | 077.2° | 20.6° | Low in the east-north-east, an hour and a half up |
| Venus | 099.5° | 60.8° | Magnitude −3.7, high over the flight path. Two minutes after liftoff, with the sky gone black, Grissom saw "one rather faint star in the center of the window": it was Venus |
| Mercury | 085.1° | 39.6° | Lost in daylight |
| Moon | | −68.7° | Below the horizon; a day past first quarter |

Mars, Jupiter, Saturn, Uranus and Neptune were below the horizon.

## What is not built

**The launch site.** Launch Complex 5 is modelled as it stood on 5 May 1961
([lc-5.md](../../sites/lc-5.md)), and a site is built once and dated. For 21 July it needs:

- its sky and Sun for 07:20 EST in July (computed above), and the day's weather: a broken deck
  that held the count 41 minutes for the cameras;
- the count as flown: liquid oxygen from T-180, not T-305; the three holds above; the pilot aboard
  at 03:58, in the dark; the searchlights on until T-30 and then put out;
- what `lc-5.md` already lists as known to differ and not built: pad 6 had flown its last Redstone
  on 27 June;
- the things photographed in July that the May model was built from (the Fort Hays State
  collection is of MR-4's preparation): each to be checked for whether it stood there in May too,
  and dated in the site's record;
- the white room on level 3 round a capsule whose hatch and window are where this model has them:
  the cherry picker's cab and the platform's opening are placed for Freedom 7's hatch, 45° round
  from this one (spacecraft.md, "Open questions");
- Grissom, standing: the suit with its wrist rings, chest mirror and new harness.

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
- **The seconds of liftoff.** 12:20:36 UTC is in secondary sources only.

## Where the spacecraft is now

On the floor of the Atlantic for thirty-eight years. It was raised on 20 July 1999, without its
hatch, and is kept at the Cosmosphere in Hutchinson, Kansas, where it was cleaned and put on show
(secondary sources: the museum's own record has not been read). Its paint survived well enough to place UNITED STATES and the periscope's door on the
model.

## Sources

[docs/sources.md](../../../../../docs/sources.md).
