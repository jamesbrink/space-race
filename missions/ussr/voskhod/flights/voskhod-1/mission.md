# Voskhod 1: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on and
what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Voskhod". Times are
Moscow time (UTC+3), and seconds from liftoff at 10:30:01 on 12 October 1964.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff to the second (Siddiqi, p. 423 and his launch log; McDowell);
  - the third stage's cutoff at 523 s (Kamanin, 12 October: «Томительные 523 секунды»; Siddiqi, p. 423) and the ship's
    separation at 525 s (Chertok, vol. 3, p. 239);
  - the ship's 5,320 kg and the descent module's 2,900 (Siddiqi, p. 412);
  - the orbit: 177.5 by 408 km at 64.9° (Siddiqi, p. 423, "exactly as planned"; the Soviet encyclopedia), and TASS's
    178 by 409 km and 90.1 min "by preliminary data" (*Заря Востока*, 13 October);
  - the orientation for the burn from 09:55:39 and the braking engine at 10:18:58 (Zak, citing Baturin, which was not
    read: one secondary account);
  - the ball's beacon heard at 10:22:30 (Kamanin) and the touchdown at 10:47 (TASS), 10:47:04 by the duration of
    24 h 17 min 3 s (Siddiqi, p. 425);
  - "312 km north-east of Kustanay" (the encyclopedia; Siddiqi, p. 425);
  - the landing system as designed: the parachute container's cover shot off at 5,000 m (OKB-1's prospectus of
    February 1964), "an exhaust, a braking, and two primary parachutes", a probe of 1.2 m and a solid rocket in the
    lines taking the ball "from about eight to ten meters per second to a bearable two-tenths" (Siddiqi, p. 411);
    7 to 8 m/s should the rocket fail (Kamanin, 13 October).
- **Not found anywhere reached**:
  - any other instant of the ascent (the strap-ons, the fairing, the core's cutoff and Block I's start are Kosmos 47's,
    six days before: Kamanin, 6 October);
  - an aiming azimuth;
  - Block I's mass as it flew in 1964 (McDowell's catalogue, Encyclopedia Astronautica and Brügge disagree by 2.3 t);
  - the braking burn's length, its impulse, and when the modules parted;
  - the heights of the braking and main parachutes, the parachutes' areas, and anything of the soft-landing rocket but
    its probe;
  - a surveyed landing point, and the ground's height there;
  - how the reserve braking engine would have been used, or whether it was let go before entry;
  - the crew's weights and heights.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| The strap-ons' and core's blocks | the Vostok-K's | assumed | the same blocks (voskhod-11a57.md) |
| Their engines | the 8D728's and the 8D727K's figures | documented (secondary) | NPO Energomash's table as Brügge copies it; Varfolomeyev has the 8D728 on the Voskhods, and the 8D727K's 79.3 tf is Brügge's 777.8 kN for this core |
| Block I's engine | 298 kN, 326 s, 6.8 MPa | documented | its maker's table (KBKhA): the type's, not this unit's |
| Block I's load | 22.98 t | documented (secondary) | Brügge, uncited; it burns 246 s at the maker's flow, his own 247 s |
| Block I's mass | 25.81 t without its aft section | derived | Brügge's 26.06 t less the aft section's 250 kg, estimated |
| The strap-ons off, the fairing, Block I lit | 120, 150, 290 s | assumed | Kosmos 47's (Kamanin) |
| The cutoff, the separation | 523 s, 525 s | documented | Kamanin; Siddiqi; Chertok |
| The launch plane | solved for 64.9° | | no azimuth was found |
| The orbit | 177.5 × 408 km, 64.9°, 90.1 min | documented | read as mean elements with a nodal period: the heights and the period agree only over a ball of 6,363 km, as the Vostoks' do |
| The burn | from 10:18:58, 45 s, 136 m/s, aimed from the Sun | documented; estimated; assumed; assumed | the start is one account's; the TDU-1's longest burn; the Vostok's integrator; the Vostok's solar orientation (the 3KV's ion sensors may have aimed it instead) |
| The modules' parting | 10 s after the burn | estimated | the type's |
| The cover off | 5,000 m | documented | the design (the prospectus); Voskhod 2's record has the landing system on at 5,000 m |
| The parachutes | the Vostok ball's: 1.5 and 18 m², two of 574 | assumed | the 3KV's are not found; under the two mains the ball falls 7.4 m/s at the ground, where Kamanin has the design's 7 to 8 |
| The soft-landing rocket | 95 kN for 0.31 s at 1.2 m | estimated | worked from Kamanin's 7 to 8 m/s, Siddiqi's 0.2 and the probe's 1.2 m at an even deceleration, which is ours |
| The landing point | 54°02′ N 68°08′ E | estimated | spacefacts.de, with no survey; it may be worked from "312 km" |
| The ground | 165 m | estimated | ETOPO 2022 at that point |

## What the run gives

On the 11A57's figures in the day's air over the pad (ERA5, `aloft`), then the published orbit from where the ascent left
the ship, then the descent; and the coast from the estimated injection, in the thermosphere of the day's Sun (Jacchia 1971).
Tolerances were set before anything was flown.

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Perigee at the last cutoff | 177.5 km ± 5 | −520.6 km | **miss** (−698 km) | the ascent falls short of an orbit (`SHORT_VK1`) |
| Apogee at the last cutoff | 408 km ± 15 | 177.5 km | **miss** (−230.5 km) | the same: 177.5 km is the top of the orbit it reaches |
| Inclination | 64.9° ± 0.1 | 64.90° | yes | not independent: the plane is solved for it |
| Period at the last cutoff | 90.1 min ± 15 s | 80.81 min | **miss** (−558 s) | the same |
| Period, node to node, of the orbit begun | 90.1 min ± 2 s | 90.10 | yes | not independent |
| Apogee as flown round (coast; shown) | 408 km ± 5 | 409.1; 410.3 km | yes | |
| Landing across the track (coast; shown) | 0 ± 60 km | −106; −53 km | **miss**; yes | below |
| Landing along the track (coast; shown) | 0 ± 100 km | −1,066; −1,198 km | **miss** | below |
| Touchdown | 10:47:04 ± 2 min | 10:43:17 | **miss** (−227 s) | where it comes down is the burn's (below) |
| Touchdown speed | 0.2 m/s ± 1 | 2.1 m/s | **miss** | the rocket and the parachutes are each an estimate (below) |

At the last cutoff the stack has 7,583 m/s where 177.5 by 408 km needs some 8,000, with 1.2 t left in Block I: the
shortfall is in the first two stages, as on every Vostok here, and in a third stage whose 1964 mass is not known.

## The day round, and the landing

Sixteen revolutions are flown to the burn. The Sun stands 31° out of the orbit's plane then, so a push aimed against it is
69° off the line of flight and the perigee after it is 15 km. The ball is at 5 km over 47.1° N 57.5° E, in the steppe
north-west of the Aral Sea, and lands 1,066 km short of the record's place and 106 km to its left. As diagnoses, not
inputs:

| Changed | Along the track | Across |
| --- | --- | --- |
| nothing | −1,066 km | −106 km |
| the period 0.05 min shorter (it is published to a tenth) | −712 | −85 |
| the period 0.05 min longer | −1,393 | −128 |
| the burn a minute later | −475 | −88 |
| the burn five minutes later | +4,146 | −35 |
| the burn at Chertok's programmed 10:08:56 | −4,367 | −295 |
| aimed straight against the motion | −1,419 | −52 |
| 100 m/s | +1,084 | −42 |
| 155 m/s (Encyclopedia Astronautica's) | −1,725 | −139 |

The burn's length and impulse are not known, and its start rests on one account: the record cannot hold the landing to a
hundred kilometres. Nothing is adjusted.

## The last metres

Under two main canopies taken as the Vostok's, the ball comes down at 7.4 m/s, inside Kamanin's 7 to 8. The rocket is
worked from his 7.5 to Siddiqi's 0.2 over the probe's 1.2 m: so at 7.4 m/s it stops the ball a little above the ground,
and the ball touches down at 2.1 m/s. The crew are held to 3 m/s aboard (estimated: no limit was found), so the landing
is lived through. Feoktistov later recalled sparks before their eyes and the ball rolling over; the press conference
called it soft.

## What is simplified

- The ascent's instants are Kosmos 47's but for the cutoff and the separation.
- The launch plane is solved for the inclination; no aiming azimuth was found.
- Block I is today's stage in its outline and the 11A57's in Brügge's figures; its aft section's mass is ours.
- The burn's length, impulse and aim, and the modules' parting, are the Vostok's.
- The parachutes are the Vostok ball's; the two mains are drawn as one canopy of their whole area.
- The soft-landing rocket is one motor along the lines, at an even thrust: Zak has "a small cluster".
- The reserve braking engine is not in the plan: it was not fired, and nothing read says how it would have been, or when
  it left the ship. It stays on the ball in the scene.
- Komarov's orientation by hand is given the whole of the sixth orbit: its minutes were not found.
- Nothing ejects: the couches do not move.
