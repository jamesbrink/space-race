# Vostok 3KA No. 6, as flown from 12 to 15 August 1962

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension of the type,
with its confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 6 and to this flight.

**No. 6 and No. 5 cannot be told apart on the record read.** They were built and tested as a pair,
the people who spoke of them in 1962 spoke of both at once, and nothing was found that one carried
and the other did not, except its pilot, six kilograms and a history of trouble in testing. So this
model is the same geometry as [Vostok 3's](../vostok-3/spacecraft.md), built by the same call, and
what that file says of the television cameras, the film camera and everything assumed holds here
word for word. What follows is only what is this ship's own.

It is built as it rode under the fairing on 8K72K No. E103-22, the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone
it is as in orbit.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** means taken
to be as the type has it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KA No. 6 | documented | Siddiqi, launch log: "3KA 6"; Kamanin, 3 and 5 August 1962 (the editor: «заводской №6»); RussianSpaceWeb |
| Launch vehicle | 8K72K No. E103-22 | documented, tertiary | McDowell's launch log (GCAT, citing Varfolomeyev); spacefacts.de ("Ye10322"). **Siddiqi's launch log gives no number.** The higher number, E103-23, had flown the day before under Vostok 3 |
| Third stage engine's number | | **not found** | |
| Mass in orbit | 4,728 kg | documented | Siddiqi, Table IB. Not announced in 1962. Vostok 3: 4,722 |
| Descent module / instrument module mass | 2,460 kg / 2,270 kg | documented, for the type | Siddiqi p. 195. No. 6's own have not been found, nor where its 6 kg over No. 5 lay |
| Length, diameters, hatches | as the type | documented, for the type | [vostok-3ka.md](../../vehicles/vostok-3ka.md); Keldysh, 21 August 1962 |
| Integrated tests | three rounds; the third passed by the morning of 8 August, its films read that afternoon | documented | Kamanin, 3, 5 and 8 August 1962. What failed in the first two was not found |
| Cabin air in flight | 11 to 12 °C on the evening of 14 August; 10 °C and 35% humidity by 07:00 on the 15th, the lower limits | documented | Kamanin, 18 August 1962; Chertok, vol. 3, p. 207. **Why it fell was not found** |
| Radiation dose | about 36 millirad | documented | Yazdovsky, 21 August 1962 |
| Radio | as Vostok 3's; the VHF set came on by itself with much noise before each session | documented | Popovich's report of 16 August, as Kamanin wrote it down: «УКВ-режим не нужно включать автоматически» |
| Television | as Vostok 3's: two Seliger cameras, 400 lines of 400 elements, 10 frames a second | documented | Efimov, 1996: the camera in the ground rig was "the same as on board Vostok 3 and Vostok 4" |
| Braking engine | 1,614 kgf, 45 s at most | documented, for the type | Siddiqi p. 197. **Its burn on this flight was not found** |

## What differed from 3KA No. 5

| Difference | In the record | Confidence | Source, and what the model does |
| --- | --- | --- | --- |
| The pilot | Pavel Popovich, in the SK-1, orange, the helmet lettered СССР | documented | the film *Звёздные братья* (1962): the letters show as he is helped from the bus. **Modelled**: the SK-1 figure in the seat, lettered |
| His height | | **not found** | The figure is the suit module's own, built to Gagarin's documented 1.65 m: **assumed** |
| Mass | 6 kg more | documented | nothing to draw |
| A vacuum cleaner, paper napkins | "I took out the vacuum cleaner and switched it on" | documented (aboard this ship; whether No. 5 had them too is not said) | Popovich, 21 August 1962. **Not modelled**: no picture was found |
| A flask of water | two-thirds full, shaken to watch the air in it | documented, at second hand | Siddiqi p. 359, from Gatland. Not modelled |
| His filming | the horizon and the terminator, where Nikolayev had the Earth's surface | documented | RKK Energia 1946–1996, p. 116; Siddiqi p. 358. The camera is the same model, on the same assumption |
| The cabin's cold | 10 °C where No. 5 held 12 to 13 °C (which Nikolayev said he chose) | documented | Kamanin. Nothing to draw: the cause was not found |

**Everything else is assumed the same as No. 5**, and through it as the type.

## How it was checked

As Vostok 3's. The flown descent module is said by English Wikipedia, without a source, to be at
the museum of NPP Zvezda, refitted to represent Voskhod 2's; that was not confirmed, and no
photograph of it was found.

## What is simplified, for this flight in particular

Everything listed in [Vostok 3's spacecraft.md](../vostok-3/spacecraft.md#what-is-simplified-for-this-flight-in-particular)
applies here unchanged: the cameras that hang in the air and are sized off one photograph, the
second camera's guessed place, no television lamps, loudspeakers, microphones or fixed film cameras, the film
camera assumed to be Vostok 2's, the type's cabin and launcher. Besides those:

- **The pilot is Gagarin's figure with Popovich's name**: the same stature, the same suit, visor
  down, strapped in.
- **The model is Vostok 3's.** If No. 6 differed from No. 5 in anything that showed, it is not here.
- **No vacuum cleaner, napkins or flask.**

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 528,088 | 190 |
| 0.6 | 215,273 | 132 |
| 0.3 | 106,426 | 133 |

The same as Vostok 3's to the triangle: the two GLBs are the same bytes. The clearance check
passes at all three.
