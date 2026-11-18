# Vostok 6

**16 to 19 June 1963 · Valentina Tereshkova · callsign Чайка (Chayka, "Seagull") · Vostok 3KA No. 8 · Vostok-K 8K72K No. E103-25 · Site 1, Tyuratam**

The first woman in space, and the last flight of a Vostok. Forty-eight orbits in 2 days, 22 hours
and 50 minutes, longer than the six American flights to that day put together, in orbit with
[Vostok 5](../vostok-5/README.md), which had left the same pad 45 hours 31 minutes before. She was
26, a mill worker and parachutist, a junior lieutenant whose rank the announcement left out. It
ended as every Vostok did, with the pilot ejecting from the descent module and landing by
parachute. Backups: Irina Solovyeva and Valentina Ponomareva.

## What is built, and what is not

| | State |
| --- | --- |
| Spacecraft (3KA No. 8) | **built**: [spacecraft.md](spacecraft.md), [model/vehicle.py](model/vehicle.py). The type's model ([vostok-3ka.md](../../vehicles/vostok-3ka.md)) with what this flight is known to have had that can be drawn: its pilot in the suit made for her, the cabin's white lining as the flown article shows it, the two television cameras as the Seliger camera was photographed, and a hand-held film camera. **Apart from the pilot it cannot be told from Vostok 5's on the record read** |
| Launch vehicle (8K72K No. E103-25) | **built**, as the type ([vostok-8k72k.md](../../vehicles/vostok-8k72k.md)): nothing read says how this vehicle differed from Vostok 1's |
| Pilot in the seat | built: the figure of [sk-1.md](../../crew/sk-1.md) as a woman of her height in the SK-2, the SK-1 cut again for women, as the photographs of 16 June show it: white boots, the black breathing valve at the collar, "СССР" on the helmet |
| Launch site (Site 1 as it stood on 16 June 1963) | **built**: [model/pad.py](model/pad.py), the site's modules at that date, with the bus; the surroundings are those modelled for August 1961, nothing modelled having changed ([site-1.md](../../../places/tyuratam/site-1.md), "What stood when"). The morning in [pad.ts](pad.ts), below ("The morning at the pad") |
| Crew to be walked as | **built, as a labelled stand-in**: [model/crew.py](model/crew.py), [crew/sk_1.py](../../crew/sk_1.py)'s `TERESHKOVA`. The SK-2's differences that are sourced are built (narrower shoulders, wider hips, thinner gloves, the valve's black disc, no mirror), on the module's own man carried to her 1.64 m (read off a photograph: estimated), 1.715 m in helmet and boots. It is not a figure modelled as a woman's, and she walks with the one gait there is; the white covers over her boots are not built (issue #21). The model's own text says so |
| The day's weather (`weather.ts`) | **written**: Dzhusaly at 09:00 UTC, two oktas of cumulus at the 1,500 to 2,000 m class and an okta of high cloud, an east-north-east wind of 6 to 10 m/s, 34 °C; the press's rocket "shining in the Sun". ERA5's air over the pad in [aloft.ts](aloft.ts) |
| The flight as data, flown | **written**: [orbital.ts](orbital.ts), [mission.md](mission.md). The ascent is Vostok 1's (none of this flight's was found); the burn's instant is derived from the ground's command at 09:39:40 and the cycle's 71 minutes, not from the landing; her orientation by hand on the last morning is the record's period by hand. Fly is lit. What the run makes of it is below ("The flight as flown") |

So the flight has its Gallery, its Launch site and Fly.

## The morning at the pad

What the record gives of it ([pad.ts](pad.ts); Kamanin keeps the range's clock, Moscow's plus two, converted here):

- The rocket and ship on the pad since the morning of the 15th; the State Commission set 12:30 the afternoon before.
- 10:15 exactly, the bus at the pad; her report to the chairman, «космонавт Терешкова к полету готова»; flowers, handed
  to Korolev; up to the lift "rather heavily", into the ship with a pulse of 140; the radio up ten or fifteen minutes
  later. "The preparation of the rocket, the ship and every operation went exceptionally cleanly": Kamanin thought it
  Gagarin's morning again. Four minutes before liftoff her pulse was 84 (Golovanov).
- **Estimated, and said so**: the erector, the trusses and the cable mast at Vostok 1's intervals before its liftoff,
  put before this one; the minutes she was seated and the hatch closed; when the bus left. No filler is built: none is
  recorded. The people are not built: the figures have no summer dress.

## The flight as flown

From [mission.md](mission.md). The ascent on the type's figures falls short of an orbit, as Vostok 1's does: what is
shown from the separation is the published orbit begun where the ascent left the ship. Its period holds (88.3 min, not
independent), its apogee holds (232.0 km), the orbit two days on holds against TASS's (176.5 by 220.3 km and 88.15 min
where TASS has 174 by 218 and 88.1), the load in the entry holds (8.70 g against her "no more than 8"), and the ball
lands 251 m from her where she put it at 400. The burn is derived from the ground's command at 09:39:40 and the cycle's
"approximately" 71 minutes, not from the landing, so the landing is a check of it: **it comes down 2,726 km short and
176 km across**, over Iran, and she is down at 11:16:37, three minutes before TASS's 11:20. What owns it is not
established: the period published to a tenth of a minute is worth some 1,000 km either way over 48 revolutions, the
burn's minute 400 km a minute (mission.md, "Three days in the air"). Before the drag was corrected it came down 3,757 km
short.

## What happened

All times are Moscow time (UTC+3) unless they say otherwise. Kamanin's diary keeps the range's
clock, two hours ahead of Moscow, and says so only now and then: his times are converted here.

Five women had been chosen in March 1962 from the parachutists of the flying clubs: under 30,
no taller than 170 cm, no heavier than 70 kg. Four had passed their examinations by November. The
suits set the date as much as anything: Alekseev's works could not have three SK-2s ready before
that month, and the flight slid into 1963. For most of that time both remaining ships, No. 7 and
No. 8, were to carry women, a day apart; what was approved in March and April 1963 was one woman,
for up to three days, beside a man flying for eight. Kamanin had settled on Tereshkova by November;
Keldysh and Rudenko still preferred Ponomareva in May.

The cosmonauts flew to Tyuratam on 1 June. On the 3rd Tereshkova, Solovyeva and Ponomareva tried
their suits and had the harness and the seat adjusted; on the 4th the State Commission named
Tereshkova, with both the others as her backups. On the 8th she sat in her ship and went over it
with its lead engineer. Then came the week of Vostok 5's delays. On the 15th, with Bykovskiy a day
in orbit, word came from Brezhnev that the first announcement was not to call her an officer, and
the women were sent to change out of uniform before the meeting at the pad. The rocket had stood
there since 09:00. The launch was set for 12:30 on the 16th, to put her as near as could be to the
orbit Vostok 5 was then in.

Nothing went wrong. The bus reached the pad at 10:15; she reported to the chairman, was given
flowers and handed them to Korolev, climbed to the lift "rather heavily", and went aboard with a
pulse of 140. Her ship and rocket had passed their tests on the pad without a remark, and Kamanin
thought the morning as clean as Gagarin's. Liftoff was at 12:29:52. The loads were light, under
five g. She saw the third stage through the right porthole, and in the Earth's shadow a star three
times as bright as Vega, which she took for Vostok 5: the two ships were about five kilometres
apart just then, and never so near again. By 13:00 she was talking to Bykovskiy; within three hours
Moscow television was showing her; at 16:55, on the fourth orbit, Khrushchev spoke to her.

She was not well on the first orbits, by a Soviet account of 1988, and bringing her down early
was talked of; she asked the chairman of the State Commission that the flight go on. When she first switched on
the orientation by hand there was "a clap, like a blow on an empty milk churn", and "the first
orientation did not come off". Nor did the second. On the evening of the 18th the Leningrad station
called and she did not reply; the control post switched on the television camera and saw her
asleep. Woken, she said plainly that pitch had beaten her twice. It mattered: if the automatic
descent failed and she could not point the engine by hand, the ship would stay up. "Don't worry, I
will do it all in the morning." Gagarin, Titov, Nikolayev and Rauschenbach wrote out what to tell
her, and on the last morning she turned the ship to the attitude for descent, engine first, in
twenty minutes, and held it for fifteen. "I do not think the orientation system had failed," she
told the Commission.

The rest was the cabin. She could not reach the Globus or other instruments from the seat and had
to undo part of the harness; she could not get at the biological samples at all, and did none of
those experiments. Both her pencils broke. The helmet pressed on her shoulder, the headset on her
left ear, the sensor on her head itched and hurt, and from the second day her right shin ached
inside the suit. The bread was too dry to eat; she wanted black bread, potatoes and onions. She was
sick once, on the third morning, and blamed the food. The cabin was 30 °C at liftoff, 23 at the end
of the first day and 12 from the start of the second. She filmed cities, clouds and the Moon, and
looked at the horizon through coloured filters.

On the 19th the command to begin the automatic descent went up at 09:39:40 and was seen to arrive.
After that the control post heard nothing: no report of the solar orientation, of the engine, of
separation. She was sending each by the telegraph key. She rode down back first; the modules
parted with a jerk; flakes of the burning shield went past the porthole, and the load was no more
than eight g. The seat left smoothly. Under the parachute she saw the ball below her, and a lake;
she had no way to steer, and landed on her back at 11:20, 400 m from the ball and beside her seat,
in the Altai, 620 km north-east of Karaganda and two degrees of latitude beyond the aiming point.
She gave what was left of her rations to the people who ran up, which left the doctors nothing to
weigh. An aircraft found her an hour later and two parachutists jumped; three hours after landing
she reported to Khrushchev by telephone, and told him she had no injuries. The bruise on her nose
was still plain two days later. "A deserved bruise," said Brezhnev.

The argument began before she was back in Moscow. Yazdovsky's draft for the press conference had a
paragraph on how badly she had felt, how tired she was and how little she could do, and Keldysh,
Korolev, Tyulin and Kamanin struck it out. Korolev saw her alone in July, and she came
out in tears (Chertok). She did not fly again. No woman did for nineteen years.

## Timeline

| Moscow time | T+ | Event | Source |
| --- | --- | --- | --- |
| 15 June, 09:00 | | Rocket and ship on the pad | Kamanin ("since 11:00") |
| about 15:00 | | State Commission: launch at 12:30 on the 16th | Kamanin |
| 16 June, 10:15 | | Bus at the pad; she goes aboard with a pulse of 140 | Kamanin ("exactly 12:15"). Siddiqi (2009): 09:15 Moscow time |
| 12:29:52 | 0 | Liftoff | Siddiqi, p. 369 and launch log; McDowell. TASS: 12:30 |
| | | Strap-ons, fairing, core cutoff, third stage cutoff, separation | **not found for this flight** |
| by 13:00 | 30 min | Talking to Vostok 5 | Siddiqi, p. 370; her report ("in the Earth's shadow") |
| within three hours | | Moscow television shows her | Siddiqi, p. 370 |
| 16:55 | 4 h 25 | Khrushchev speaks to her, on the fourth orbit | TASS, in *Заря Востока*, 18 June. Siddiqi (2009) puts it on the 17th |
| 22:00 | | TASS: 181 by 231 km, 88.3 min, on the seventh orbit | *Заря Востока*, 18 June |
| 17 June, 09:30 to 11:00 | | The technical leadership: her flight to run its three days | Kamanin (11:30 to 13:00) |
| 20:07 | | Watched from the cosmonauts' cottage at Tyuratam, zenith to 45°, for a minute | Kamanin ("22:07 local time") |
| 18 June, 15:00 | | TASS: 174 by 218 km, 88.1 min | *Заря Востока*, 19 June |
| evening | | Seen asleep on television; landing set for the 49th orbit | Kamanin |
| 19 June, 07:40 to 08:05 | | The ship turned by hand to the attitude for descent, and held | the transcript of her exchanges, as Siddiqi (2009) gives it: on the 47th orbit. Her report: the 45th, twenty minutes. Kamanin: held fifteen |
| 09:39:40 | 2 d 21 h 9 min 48 s | Command for the automatic descent | Kamanin; Siddiqi, p. 372 |
| 09:42, 09:51 | | By her key: the first and second stages of the descent programme on | the same transcript |
| about 10:50:40 | about 2 d 22 h 21 min | Braking engine, 39 s; the modules part ten seconds after it, with a jerk. **The minute is derived**, not found: the cycle's command and its about 71 minutes to the engine's control | her report in the State Commission's typescript (RGANTD), p. 53: «/39 секунд ТДУ работала/ … Через 10 секунд произошло разделение»; Kogutenko (2013) for the 71 minutes |
| 11:10:40 | 2 d 22 h 40 min 48 s | The flight's end as the FAI's record has it | Siddiqi, p. 372, note 65, from Glushko's encyclopedia: the descent module's landing. See [Vostok 5](../vostok-5/README.md#where-the-sources-disagree) for what it may measure instead |
| 11:20 | 2 d 22 h 50 min | Tereshkova lands, about 53°16′ N 80°28′ E | TASS; Siddiqi, Table IB (02:22:50:08). The place: spacefacts.de and RussianSpaceWeb |

## The orbit

| | As printed since | TASS at liftoff | TASS at 22:00 on 16 June | TASS at 15:00 on 18 June |
| --- | --- | --- | --- | --- |
| Perigee | 180.9 km | 183 km | 181 km | 174 km |
| Apogee | 231.1 km | 233 km | 231 km | 218 km |
| Inclination | 64.95° | "about 65°" | | |
| Period | 88.3 min | 88.3 min | 88.3 min | 88.1 min |

"As printed since" is Siddiqi's text (p. 369) and Table IB, with the period as RussianSpaceWeb's
table has it. The orbit's plane lay about thirty degrees from Vostok 5's, so that the two ships
came near each other for a few minutes twice an orbit and were about five kilometres apart only
once, as she reached orbit (Siddiqi, p. 369). Kamanin gives the orbit a nominal life of 7.1 days.
**No OKB-1 report of this flight has been read.** `flight.ts` quotes 180.9, 231.1, 64.95° and 88.3;
those heights over a sphere of 6,371 km give 88.5 min by Kepler's third law.

## Where the sources disagree

- **Whether she ever turned the ship by hand.** Kamanin, on the day, and her own report: yes, on
  the last morning, and held it fifteen minutes. The transcript has it from 07:40 to 08:05. Siddiqi
  notes that Golovanov and the Russian text of Chertok suggest she never managed it; the English
  Chertok has her reporting that she "had gotten through" it.
- **Which orbit that was.** The 45th (her report; Kamanin's plan) or the 47th (the transcript).
- **Why the first attempts failed.** Her report: "I do not think the orientation system had
  failed." Forty years later she said the ship had been set to raise its orbit instead of lowering
  it, that she found it on the first day and that Korolev asked her to say nothing (interviews of
  2007). Kogutenko, of RKK Energia, called that "a complete invention" in 2013: a pilot could enter
  nothing into the descent's settings, and the one real fault of the kind, rate sensors mounted the
  wrong way round, was found in ground tests and put right before the flight. Chertok, who designed
  the system, tells no such story. Nothing in the record of 1963 supports the later account.
- **How she was.** "Excellent", in every report from orbit. Yazdovsky's report: unwell on the 32nd
  and 42nd orbits, sick, a poor appetite. Skopinskiy, in 1988: unwell on the first orbits,
  and an early landing discussed with Tyulin. Kamanin: tired at the end of the first and second days, a little sick, and "she
  found the strength to carry out the whole programme", on a task that had been one day with two
  more at her own wish.
- **The second of liftoff.** 12:29:52 (Siddiqi, 2000; McDowell) or 12:29:51 (Borisenko; Siddiqi,
  2009; spacefacts.de).
- **The bruise.** None, in what she told Khrushchev that day (TASS). She stumbled, running (the
  press conference of 25 June, as *Aviation Week* reported it). A piece of metal struck her as she
  looked up at the canopy against instructions (Tyulin, as Siddiqi has him). The wind dragged her
  before she could free the parachute (her account of 2007 and 2013). Kamanin records only the
  bruise, on 21 June.
- **Where she landed.** 53°16′18″ N 80°27′34″ E (spacefacts.de; RussianSpaceWeb; McDowell to a
  hundredth of a degree), or 53.209° N 80.804° E, the roadside monument near Bayevo, which is
  23 km away. Neither has a stated survey.
- **Who heard her on the way down.** The control post at the range heard nothing (Kamanin) and
  for two hours did not know where she was. Her telegraph reports exist in the transcript.
  Siddiqi, p. 372, puts the control centre at NII-4 near Moscow; Kamanin was at the range's.
- **What 70 h 40 min 48 s measures.** As for [Vostok 5](../vostok-5/README.md#where-the-sources-disagree):
  the ball's landing, or her leaving it.
- **A re-enactment of the landing filmed on 20 June.** RussianSpaceWeb, "according to some
  reports". Kamanin has her flying from Karaganda to Kuybyshev that morning. Not verified.

## The sky at liftoff

Computed by `src/world` from [site-1.ts](../../../places/tyuratam/site-1.ts) and the launch instant
(09:29:52 UTC), and held to these figures by `tests/world.test.mjs`:

| | Azimuth | Elevation |
| --- | --- | --- |
| Sun | 231.3° | 59.3° |
| Moon | 273.7° | 3.2° below the horizon, 34% lit: waning, five days before new |

Early afternoon by the Sun, high in the south-west five days before the solstice. The Moon had
just set. The one she filmed from orbit, and by whose light she found the Earth and its cloud
"very beautiful", was a waning crescent that rose in the small hours.

## Sources

In order of weight; full entries in [docs/sources.md](../../../../../docs/sources.md), "Vostok 5
and Vostok 6".

1. Kamanin's diary, 13 April to 5 July 1963: the choice, the days at the range, the launch, the
   shifts at the control post, his record of both pilots' reports to the State Commission of
   20 June, and the argument over her condition afterwards.
2. The TASS reports of 16 to 20 June 1963 as the Tbilisi daily *Заря Востока* printed them.
3. Siddiqi, *Challenge to Apollo*, pp. 362 to 373, the launch log and Table IB; and his two
   articles in *Spaceflight* (2009) on the transcripts of her exchanges with the ground.
4. Chertok, *Rockets and People*, vol. 3, pp. 223 to 228: the control post, the manual control
   question, the meeting with Korolev.
5. Abramov and Skoog, *Russian Spacesuits*, on the SK-2, as RussianSpaceWeb gives it.
6. The photographs and film of 16 June 1963 (collectSPACE; RussianSpaceWeb; Wikimedia Commons): the
   suit, the helmet, the boots.
7. The flown descent module, RKK Energia's, as photographed at the Science Museum in 2015 and 2016:
   the lining.
8. The later accounts: *Kommersant*, 2 March 2007; Kogutenko in *Novaya Gazeta*, 18 September 2013.

The walking figure starts on the west side of the launch deck, on the approach to the erector stair. The standing mark (site X/Z −19.5/6.5 m) and heading toward the rocket are estimated.
