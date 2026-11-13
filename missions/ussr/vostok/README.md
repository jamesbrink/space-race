# Vostok (USSR, 1960–1963)

The first spacecraft to carry a person: OKB-1's "Object K", designed under Sergei Korolev alongside
a reconnaissance satellite that shared its hull. Six crewed flights, all one-man, all from Site 1 at
Tyuratam on the R-7 with a third stage, each ending with the pilot ejecting and landing by his own
parachute.

## Crewed flights

| Flight | Spacecraft | Pilot | Launch | In this repo |
| --- | --- | --- | --- | --- |
| Vostok 1 | 3KA No. 3 | Yuri Gagarin | 12 April 1961 | [flight](flights/vostok-1/README.md): vehicle, launch site and crew built |
| Vostok 2 | 3KA No. 4 | Gherman Titov | 6 August 1961 | [flight](flights/vostok-2/README.md): vehicle built (in the Gallery) |
| Vostok 3 | 3KA No. 5 | Andriyan Nikolayev | 11 August 1962 | [flight](flights/vostok-3/README.md): vehicle built (in the Gallery) |
| Vostok 4 | 3KA No. 6 | Pavel Popovich | 12 August 1962 | [flight](flights/vostok-4/README.md): vehicle built (in the Gallery) |
| Vostok 5 | 3KA | Valery Bykovsky | 14 June 1963 | |
| Vostok 6 | 3KA | Valentina Tereshkova | 16 June 1963 | |

The rows of Vostok 1 to 4 have been checked against sources read for this repo (Vostok 2's, 3's
and 4's: the spacecraft's numbers in Siddiqi's launch log, the dates and pilots in the TASS
reports of the days; each README has where the sources disagree); the others are the
programme's well-known dates and are to be checked when each flight is built. Before them flew the
prototypes (1K) and two full rehearsals of the crewed ship with a dog and a dummy, 3KA No. 1 and
No. 2, in March 1961.

## The spacecraft, in general

Two modules. Forward, the **descent module**: a ball 2.3 m across, covered all over in heat shield,
with the pilot on an ejection seat that lies across it. Aft, the **instrument module**: two cones
base to base, 2.43 m at the joint, carrying the batteries, radios, the orientation system and the
one braking engine. A ring of gas bottles sits round the joint. Four steel straps meeting in one
lock hold the ball on, and a mast of cables joins the two. 4.4 m long and about 4.73 t in orbit.

Why a ball: it needs no attitude control to survive entry, and in 1959 nobody had flown a lifting
entry. Its weight is put off-centre so that it settles heavy side first by itself. What that costs
is a ballistic entry of about ten g and a landing too hard for the pilot, who therefore left at
7 km. What differed from flight to flight (the seat, the suit, the cabin's equipment, the cameras)
is recorded with each flight as it is built: each flight's `spacecraft.md` has a table of what its
ship differed from the one before in, what of that is modelled and what is assumed the same.

## Hardware

| | In this repo |
| --- | --- |
| Vostok 3KA spacecraft | [vostok-3ka.md](vehicles/vostok-3ka.md): built |
| Vostok-K launch vehicle (8K72K), with Block E | [vostok-8k72k.md](vehicles/vostok-8k72k.md): built (core, four strap-ons, lattice, Block E, fairing), every station estimated |
| Site 1, Tyuratam | [site-1.md](sites/site-1.md): built as it stood on 12 April 1961: the platform over its flame pit, the launch system, what served the rocket that morning, and the place round the pad |
| The SK-1 suit | [sk-1.md](crew/sk-1.md): built, standing (the flight's crew model) and in the spacecraft's seat (`sk_1.build_seated`) |

## Sources

[docs/sources.md](../../../docs/sources.md), "Vostok".
