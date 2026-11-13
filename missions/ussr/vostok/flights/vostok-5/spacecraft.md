# Vostok 3KA No. 7, as flown from 14 to 19 June 1963

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension of the type,
with its confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 7 and to this flight: what the
record says it differed from No. 5 and No. 6 (Vostok 3 and 4) in, which of that is modelled, and
what is assumed the same because nothing was found.

It is built as it rode under the fairing on 8K72K No. E103-24, the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone
it is as in orbit.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** below means
estimated in the plainest sense: taken to be as the type has it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KA No. 7 | documented | Kamanin, 11 May 1963: «по кораблям №7 и №8 и их носителям»; Siddiqi, p. 363 ("3KA no. 7"); McDowell ("Vostok-3A No. 7"); RussianSpaceWeb. In Siddiqi's launch log the figure is illegible in the copy read. Built in 1962 with No. 8: Kamanin, 31 May 1963, speaks of a spyglass that could be fitted "only on the Vostoks built in 1963" |
| Launch vehicle | 8K72K No. E103-24 | documented, tertiary | McDowell's launch log (GCAT). **Siddiqi's launch log gives no number** |
| Third stage engine's number | | **not found** | |
| Mass in orbit | 4,720 kg | documented | Siddiqi, Table IB. Vostok 4: 4,728; Vostok 6: 4,713 |
| Descent module / instrument module mass | 2,460 kg / 2,270 kg | documented, for the type | Siddiqi p. 195. No. 7's own have not been found |
| Length, diameters, hatches | as the type | documented, for the type | [vostok-3ka.md](../../vehicles/vostok-3ka.md). Nothing read says the hull differed |
| Stores | for eight days; air and oxygen reckoned for ten, with five days' waiting on the pad | documented | Kamanin, 13 April, 28 May and 4 June 1963 |
| Weight margin | none: OKB-1 "in great difficulty keeping to the greatest permitted weight" after "some additional equipment" | documented | Kamanin, 7 May 1963. **What the additional equipment was is not said** |
| Pilot in his suit | 90.7 kg | documented | Kamanin, 7 May 1963 |
| Cabin air in flight | 30 °C at liftoff, 15 °C after the first day; 14 °C on 17 June, when he was ordered to hold 10 °C | documented | his report of 20 June, as Kamanin wrote it down; Kamanin, 17 June |
| Radiation | the dosimeters "without movement" | documented | his report |
| Radio | voice on 20.006 and 143.625 MHz; the Signal beacon on 19.948 MHz | documented | TASS, 14 June 1963 (*Заря Востока*, 15 June). **The beacon's frequency is the one figure of equipment that differs from Vostok 6's** (19.995 MHz) |
| Television | two cameras, one seen from in front and one from the side; no change from Vostok 3's recorded | documented (that it had television, and the two views); assumed (the kind) | Kamanin, 14 and 16 June; the received frames (RussianSpaceWeb); Efimov, 1996 |
| Braking engine | 1,614 kgf, 45 s at most; flown 39 s | documented | Siddiqi p. 197; his report |
| Orienting store | 10 atm for ten minutes by hand; 5 atm for the descent attitude; one turn in 8 minutes when set rolling | documented | his report. He calls the bottles "air" |
| For the suit | three bottles "in the control compartment", two of air and one of oxygen: 3 to 3.5 hours if the cabin leaked | documented | Kamanin, 28 May 1963. Where they were is not understood, and nothing is built for them |

## What differed from 3KA No. 5 and No. 6

| Difference | In the record | Confidence | Source, and what the model does |
| --- | --- | --- | --- |
| The pilot | Valeriy Bykovskiy, in "the last units of the SK-1 suit", which had the SK-2's changes that were not for a woman | documented | Abramov and Skoog, *Russian Spacesuits*, p. 58, which does not list them. **Modelled**: the SK-1 figure with what the film and photographs of 14 June show: the breathing valve as a pale disc at the collar, a pale neck piece, black gloves ([sk-1.md](../../crew/sk-1.md)); СССР on the helmet, as at the pad |
| His height | | **not found** | The figure is the suit module's own, built to Gagarin's documented 1.65 m: **assumed**. His 90.7 kg in the suit, less the 23 kg Abramov and Skoog give the suit with its kit, is Gagarin's 68 kg |
| The seat | one of two made for women, balanced again for him; it could not then take Volynov at 104.5 kg | documented | Kamanin, 4 and 7 May 1963. **Nothing to draw**: what a woman's seat differed in was not found. The seat is the type's slabs |
| The cabin's lining | white | estimated, off photographs of the flown article | the descent module at the Tsiolkovsky museum, Kaluga, labelled «Спускаемый аппарат космического корабля "Восток-5" (подлинник)», seen through the covers over its hatch openings (Wikimedia Commons). **Modelled**: `lining="white"`, where the type has Vostok 1's yellow. Whether No. 5 and No. 6 were white too is not known: the film of 1962 showed "a pale quilted lining" ([Vostok 3](../vostok-3/spacecraft.md)) |
| Stores for eight days | food, water, the air regenerator's charge; "the rations were stowed in the wrong order", "empty tubes and wrappers get in the way" | documented | Kamanin; his report. **Not modelled**: no picture, list or weight was found |
| The sanitary device (АСУ) | used in orbit for the first time | documented | his report: «На третий день принял слабительное и воспользовался АСУ»; Kamanin, 18 June. Not modelled |
| A film camera in the hand | black-and-white film in cassettes; one jammed, one was empty | documented | his report. RKK Energia's history: colour film too on these two flights. **Modelled**: `FilmCamera`, **as Vostok 2's Konvas: the kind is an assumption** |
| Binoculars | "give nothing, hard to adjust" | documented | his report; Siddiqi, p. 369. **Not modelled**: nothing was found of their kind |
| Light filters | a yellow one "takes off the haze" | documented | his report. Not modelled |
| Experiments | sprouting peas; a tube of liquid with a bubble of air; by Siddiqi (from a Western handbook) cells, frog spawn, fruit flies, seeds, chlorella and bacteria | documented | his report; Siddiqi, p. 369. **Not modelled**: no container is described anywhere read |
| A first-aid kit | "placed far off, cannot be used without unstrapping" | documented | his report. Not modelled |
| The clock | the one thing in the cabin "inconveniently placed" | documented | his report. The type's board has none |
| Fixed film cameras | on record for Vostok 3 and 4; **nothing for this flight** | not found | RKK Energia 1946–1996 |
| Mass | 8 kg less than No. 6, 2 kg less than No. 5 | documented | nothing to draw |

**Everything else is assumed the same as No. 5 and No. 6**, and so as the type: the hull, the
hatches and portholes, the seat, the straps, the cable mast, the bottle ring, the antennas, the
radiator, the braking engine, paint and lettering (none), the fairing, Block E and the launcher
under it. For none of these was a statement found either way.

Looked for without result: what "some additional equipment" of May 1963 was; any change to the
third stage after it left this ship low; any marking on the ship or the rocket.

## The pilot's suit

What the photographs and film of 14 June show, against the suit module's Gagarin
([sk-1.md](../../crew/sk-1.md), "The SK-2, and the suits of June 1963"):

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Helmet | white, lettered СССР | documented, by photograph | Bykovskiy with Korolev at the pad, 14 June (RGANTD, as RussianSpaceWeb reproduces it): the first letters legible |
| Breathing valve | a disc some 8 cm across at the right front of the collar, pale, with a bright cap | estimated | the colour film still of him strapped in (Roskosmos, as RussianSpaceWeb reproduces it); the SK-1 at Zvezda's museum has the same disc |
| Neck piece under the helmet's ring | pale | estimated | the same still |
| Gloves | black leather | assumed | the SK-1 at Zvezda's museum; not seen on him. At the pad his hands are bare |
| Harness | grey webbing with metal fittings over the chest | documented, by the same still | **not modelled**: the type's pilot wears no harness |

## The television and film cameras

As [Vostok 3's](../vostok-3/spacecraft.md#the-television-cameras): the same two Seliger cameras in
the same places and the same Konvas, by the same call. The received frames of Bykovskiy show him
full face from in front and, in others, from his side, which is what the two placements give.

## How it was checked

The type was checked against RKK Energia's cutaway, the Kaluga article and the flown descent module
of Vostok 1 ([Vostok 1's spacecraft.md](../../vostok-1/spacecraft.md)). For this flight the flown
descent module at Kaluga was looked at in a dozen photographs (Wikimedia Commons): scorched brown
and black, the honeycomb under the insulation showing round the pole, two hatch openings glazed
over, the lining pale. The model's stills were set beside the film still of him in the seat.

## What is simplified, for this flight in particular

What the model simplifies as a type is in [vostok-3ka.md](../../vehicles/vostok-3ka.md), "What the
model gets wrong or leaves out", and for the launcher in
[vostok-8k72k.md](../../vehicles/vostok-8k72k.md). Besides those:

- **The pilot's height is Gagarin's.** No document with Bykovskiy's was found.
- **The television cameras hang in the air**, are sized off one small photograph, and the second
  one's place is a guess, as on Vostok 3.
- **The film camera is Vostok 2's**, by assumption, and hangs unsupported as there.
- **No binoculars, filters, peas, test tube, dosimeters, first-aid kit or clock**, though each is in
  his own report: nothing was found to draw them from.
- **No stores.** Eight days of food and water are not told apart from the boxes that stand for the
  type's equipment.
- **The seat is the type's**, not a woman's seat rebalanced, whatever that changed.
- **The lining is one flat colour.** The flown cabin's is cloth, in panels.
- **The instrument board is the type's.**
- **The launch vehicle is Vostok 1's model**, number for number. A third stage that left its ship
  low looks the same as one that did not.
- **Nothing after separation.** The descent module's look during and after entry is not modelled.

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 529,228 | 192 |
| 0.6 | 215,273 | 132 |
| 0.3 | 106,426 | 133 |

The pilot, the seat, the cameras and the rest of the cabin's contents are left out below detail
0.75. The clearance check passes at all three.
