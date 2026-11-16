# Vostok 6: the mission as data

The record of the flight is in [README.md](README.md); this is how that record becomes `orbital.ts`, what it rests on
and what the simulator makes of it. Sources in full: [docs/sources.md](../../../../../docs/sources.md), "Vostok 5 and
Vostok 6". Times are Moscow time (UTC+3), and seconds from liftoff at 12:29:52 on 16 June 1963.

## What there is, and what there is not

- **Documented for this flight**:
  - liftoff (Siddiqi, p. 369 and his launch log; McDowell);
  - the ship's 4,713 kg (Siddiqi, Table IB);
  - the orbit (180.9 by 231.1 km, 64.95°: Siddiqi; 88.3 min: TASS, at liftoff and at 22:00 that evening);
  - her orientation by hand on the last morning, 07:40 to 08:05 (the transcripts of her exchanges, as Siddiqi gives
    them in *Spaceflight*, 2009), held fifteen minutes (Kamanin);
  - **the ground's command for the automatic landing cycle at 09:39:40, to the second** (Kamanin; Siddiqi, p. 372),
    and her key's reports of the descent programme's first and second stages at 09:42 and 09:51 (the transcripts);
  - the landing at 11:20 (TASS), 400 m from the ball;
  - **her report to the State Commission of 20 June**, as Kamanin wrote it down and in the Commission's own typescript
    (RGANTD ф. 1, оп. 13-1, д. 11): loads under five, the third stage through the right porthole, the solar
    orientation in the Earth's shadow, the engine barely heard and «/39 секунд ТДУ работала/», the parting «через 10
    секунд», with a jerk, loads no more than eight, flakes of the burning cover past the porthole, the seat out
    smoothly, down on her back;
  - the descent's scheme in OKB-1's report on the flight (RGANTD ф. 24, оп. 1, д. 14, л. 27): hatch at 7,000 m, the
    cosmonaut out at 6,500 m, the landing system at 4,000 m.
- **Not found anywhere reached**:
  - a cyclogram, a flight task or a range report of the ascent, so **no ascent instant of this flight**;
  - the braking burn's minute (it is derived, below);
  - the ejection's time;
  - the descent module's landing;
  - the lock's code;
  - her weight.

## Each input, and its argument

| Input | Value | Confidence | Argument |
| --- | --- | --- | --- |
| Every ascent instant, the integrator's 2,283.52 m/s, the aiming azimuth | Vostok 1's | assumed | Vostok 1's record, documented for that vehicle, taken for this one |
| The last cutoff's target height | 183 km | estimated | TASS's first figures at liftoff, 183 by 233 km, taken as the orbit asked for, as Vostok 5's were |
| The orbit | 180.9 × 231.1 km, 64.95°, 88.3 min | documented | read as mean elements with a nodal period; the period only to a tenth of a minute (below) |
| The braking command | 10:50:40 | derived | the cycle's command and its about 71 minutes (below) |
| The burn | 3.7 s to thrust, then 39 s | derived; documented | Vostok 1's 3.7 s; her typescript's 39 s |
| The modules' parting | 10 s after the burn | derived | her typescript: «Через 10 секунд произошло разделение» |
| The ejection | 6,500 m | documented | this flight's report's scheme: the design, not a measurement. The model lets the hatches go with her |
| She in her suit | 85 kg | estimated | not found: the women were chosen at no more than 70 kg; 62 kg and the suit's 23 taken |
| Her orientation by hand | 07:40 to 08:05 on 19 June | documented | the transcripts; as flown the deck gives the hands the attitude then |
| Supplies | 3 days | documented | Kamanin, 4 June: «женщины — до 3 суток» |

## The braking burn

The ground's command for the automatic landing cycle went up at 09:39:40 and was seen to arrive (Kamanin: «В 9 часов 39 минут
40 секунд была выдана команда на включение автоматического цикла посадки корабля "Восток-6". Через несколько секунд мы
узнали, что команда прошла»). After that the control post heard nothing: she was sending each step by the telegraph key.
Kogutenko, of the team that made the «Гранит» programme timer, gives the cycle «приблизительно на 71-й минуте, если в течение
первой минуты сохранялась устойчивая ориентация корабля, — система управления ТДУ … через 10 секунд происходило
разделение». So the command is flown at **10:50:40, derived** from the command and the cycle, not from the landing.
Cross-checked against the landing it is close but not a match: Vostok 1's 27.9 minutes from command to pilot would put her
down at 11:18:34, against TASS's 11:20.

**The later story is not flown.** In 2007 Tereshkova said the ship had been set to raise its orbit and that new data were
put in on the second day. Kogutenko in 2013 called it «полная выдумка»: a pilot could put nothing into the descent's
settings, and the one fault of the kind, rate sensors mounted 180° round, was found in ground tests and put right
before the flight. Her report of 1963 says «Думаю, что отказа системы ориентации не было». No document of 1963 has the
programme set wrong or put right from the ground (README, "Where the sources disagree").

## What the run gives

On the type's ascent, then the published orbit from where it left the ship, then the descent; and the coast from the
estimated injection. Tolerances were set before anything was flown.

| Check | Record | Run | Within | Why, if not |
| --- | --- | --- | --- | --- |
| Greatest load, first stage | under five, 4.5 ± 1 | 4.72 g | yes | |
| Perigee at the last cutoff | 180.9 km ± 5 | −189.0 km | **miss** (−370 km) | the type's ascent falls short of an orbit (`SHORT_V6`, as Vostok 1's) |
| Apogee at the last cutoff | 231.1 km ± 10 | 183.0 km | **miss** (−48 km) | the same |
| Inclination | 64.95° ± 0.05 | 64.99° | yes | |
| Period at the last cutoff | 88.3 min ± 15 s | 84.13 min | **miss** (−250 s) | the same |
| Period, node to node, of the orbit begun | 88.3 min ± 2 s | 88.30 | yes | not independent |
| Apogee as flown round (coast; shown) | 231.1 km ± 5 | 229.7; 226.2 km | yes | |
| Greatest load in the entry | no more than 8, 8 ± 2 | 8.88 g | yes | |
| Landing across the track (coast; shown) | 0 ± 25 km | −305; −228 km | **miss** | three days in the air: below |
| Landing along the track (coast; shown) | 0 ± 100 km | −3,757; −3,668 km | **miss** | three days in the air: below |
| Tereshkova down | 11:20 ± 2 min | 11:17:34 | **miss** (−146 s) | the burn's derived minute: she takes 26.9 min from it to the ground |
| Descent module down | 11:13 ± 5 min (derived) | 11:11:26 | yes | |
| The two landings apart | 400 m ± 3 km | 251 m | yes | no wind is flown |

## Three days in the air

Forty-eight revolutions are flown, on the coast of Vostok 5's: RK4 at 10 s above 150 km, J2, the 1976 standard
atmosphere. The record's run comes down at 23° N 53° E, over Oman, 3,757 km short of the Altai. What owns it is **not
established**. These are reported, not checked (no check of the orbit at an instant exists yet), and each is a diagnosis
made by changing one thing, not an input:

| | Run | Record |
| --- | --- | --- |
| T+10.5 h (22:00, 16 June) | 178.6 to 231.3 km over the sea, 88.29 min node to node | TASS: 181 × 231 km, 88.3 min |
| T+24 h | 178.1 to 230.4 km, 88.28 min | |
| T+50.5 h (15:00, 18 June) | 177.1 to 228.7 km, 88.25 min | TASS: 174 × 218 km, 88.1 min |

- **The published period is to a tenth of a minute.** 0.05 min less brings the landing 760 km nearer, and 0.05 min more
  puts it 590 km further short. Over 48 revolutions the last digit is worth more than the tolerance several times over.
- **The burn's minute.** It is derived from an "approximately". A minute later lands 300 km nearer, and five minutes
  later 1,800 km nearer.
- **The coast's drag.** This is the same as Vostok 5's (its mission.md): the ball's disc on its continuum coefficient,
  and the 1976 air.
  - With four times the drag area the orbit at T+50.5 h is 171.3 to 217.5 km and 88.09 min, which matches TASS's.
  - That gives back 1,370 km of the miss, not all of it.

## What is simplified

- The ascent is Vostok 1's, not this flight's.
- The coast drags the ball's disc on its continuum coefficient for three days; the day's air is not modelled.
- The hatches leave with the seat at 6,500 m, not 500 m before it.
- Her two orientations by hand that failed in pitch on 17 and 18 June are not in the record's periods: their times
  were not found.
