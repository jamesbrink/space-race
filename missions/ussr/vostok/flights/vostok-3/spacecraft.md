# Vostok 3KA No. 5, as flown from 11 to 15 August 1962

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension of the type,
with its confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 5 and to this flight: what the
record says it differed from No. 4 (Vostok 2) in, which of that is modelled, and what is assumed
the same because nothing was found.

It is built as it rode under the fairing on 8K72K No. E103-23, the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone
it is as in orbit.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** below means
estimated in the plainest sense: taken to be as the type has it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KA No. 5 | documented | Siddiqi, launch log: "3KA 5"; Kamanin, 3 August 1962: «Пятый корабль … уже прошел комплексные испытания» (the editor: «заводской №5»); RussianSpaceWeb |
| Launch vehicle | 8K72K No. E103-23 | documented, tertiary | McDowell's launch log (GCAT, citing Varfolomeyev); spacefacts.de ("Ye10323"). **Siddiqi's launch log gives no number.** The lower number, E103-22, flew a day later under Vostok 4 |
| Third stage engine's number | | **not found** | |
| Mass in orbit | 4,722 kg | documented | Siddiqi, Table IB. Not announced in 1962 ("about five tons": Keldysh and Popovich, 21 August). Vostok 2: 4,731 |
| Descent module / instrument module mass | 2,460 kg / 2,270 kg | documented, for the type | Siddiqi p. 195. No. 5's own have not been found |
| Length, diameters, hatches | as the type | documented, for the type | [vostok-3ka.md](../../vehicles/vostok-3ka.md). Keldysh, 21 August 1962: the ship "coincides approximately with Vostok 1 and Vostok 2 in weight and dimensions". Nikolayev: "no fundamental differences in the structure" |
| Power | for seven days; ten if saved | documented | Chertok, vol. 3, p. 205 (what he told Korolev before the flight) |
| Life support | "a double margin" on the three days planned | documented | Bushuyev, as Chertok has it, p. 205 |
| Cabin air in flight | 27 °C at liftoff (26 °C and 50% at the check before it); 13 °C from orbit 29 to orbit 36; 12 °C, 1.1 atm and 70% on the morning of 14 August | documented | Kamanin, 13 and 14 August 1962 |
| Radiation dose | about 50 millirad | documented | Yazdovsky, 21 August 1962 |
| Radio | short-wave and VHF receivers and transmitters; a broadcast receiver; the frequencies | documented (the kinds); **the frequencies were not found** | Nikolayev, 21 August 1962. Vostok 2's were 15.765, 20.006 and 143.625 MHz, with Signal on 19.995 |
| Television | two Seliger cameras, 400 lines of 400 elements, 10 frames a second; video band 800 kHz | documented (the band tertiary) | Efimov, 1996 and 2007; the band from Russian Wikipedia, citing the institute's history (2017), not seen |
| Braking engine | 1,614 kgf, 45 s at most; flown 42 s by the pilot's ear | documented | Siddiqi p. 197; Nikolayev's report of 16 August, as Kamanin wrote it down |
| Orienting store | 2 to 3 hours of turning; drift 0.06°/s when left | documented | Kamanin, 26 July and 4 August 1962 |

## What differed from 3KA No. 4

| Difference | In the record | Confidence | Source, and what the model does |
| --- | --- | --- | --- |
| The pilot | Andriyan Nikolayev, in the SK-1, orange, the helmet lettered СССР | documented | the film *Звёздные братья* (1962), the morning at the bus and at the lift. **Modelled**: the SK-1 figure in the seat, lettered |
| His height | | **not found** | The figure in the seat is the suit module's own, built to Gagarin's documented 1.65 m: **assumed** |
| Television that could be broadcast | the Seliger system rebuilt (the work was called *Yastreb*): a new vidicon, video amplifier and scanning, 400 × 400 in place of 100 × 100, new transmitters and synchronising; received at three stations and re-scanned to the broadcast standard | documented | Efimov (who built the ground receivers' new scanning), *Tele-Sputnik* 1996 No. 5. **Modelled**: `TelevisionCameras`, two cameras built as the Seliger camera in his photograph, in place of the type's two plain barrels. See below |
| Lamps for the television | "the cabin of the spaceship would be floodlit for the television sessions" | documented | Nikolayev, 21 August 1962. **Not modelled**: no picture of them was found |
| Talking off the seat | "a special system of cabin loudspeakers and microphones", so that a man floating was heard and could hear "from any point of the cabin" | documented | Keldysh, 21 August 1962. **Not modelled**: no picture or count was found |
| Leaving the seat | the harness undone in ten operations, in order; done four times in flight | documented | Kamanin, 27 July 1962; Nikolayev's report. **Nothing to draw**: whether the harness or the seat was altered for it was not found. The pilot is built strapped in, as at launch |
| The ejection seat's washers | a rejected small washer replaced by a larger one in both seats; this ship's seat drawn out and checked on 9 August | documented | Kamanin, 10 August 1962; Chertok p. 206. Nothing to draw |
| A film camera in the hand | "the cosmonauts filmed the Earth's surface … Nikolayev the surface, Popovich the horizon and the terminator"; he filmed while out of the seat | documented (that one was carried and used) | RKK Energia 1946–1996, p. 116; Kamanin's record of his report: «в отвязанном положении вел связь и киносъемку». **Modelled**: `FilmCamera`, **as Vostok 2's Konvas: the kind is an assumption** (Siddiqi p. 358: "similar instruments") |
| Film cameras fixed in the cabin | «на борту были установлены кинокамеры для регистрации действий космонавтов во время полета» | documented (that they were there) | RKK Energia 1946–1996, p. 116. **Not modelled**: no kind, count, place or picture was found, and a stand-in is not built |
| Food | natural meat, vegetables, fruit, juices, pies: "for the first time, not packed in tubes"; four meals a day | documented | Kamanin, 9 August 1962; Siddiqi p. 357. Not modelled |
| The instrument board | «приборную доску, разработанную Даревским» shown to Smirnov, Korolev and Keldysh on 9 August; the Globus "easy and useful to work with (thanks to Darevsky)" | documented (that it was shown and praised); whether it had changed since No. 4 is **not known** | Kamanin, 9 and 16 August 1962. **Assumed as the type** |
| More sensors on the pilot | electrodes at the outer corners of the eyes and on the right shin, beside the heart and breathing | documented | Siddiqi p. 357. Not modelled |
| Mass | 9 kg less | documented | nothing to draw |

**Everything else is assumed the same as No. 4**, and so as the type: the hull, the hatches and
portholes, the seat, the straps, the cable mast, the bottle ring, the antennas, the radiator, the
braking engine, paint and lettering (none), the fairing, Block E and the launcher under it. For
none of these was a statement found either way. Kamanin records that on 10 August Korolev spent
half an hour in the ship going over "the alterations made" with Nikolayev, who knew them all
already; the list itself was not found.

Two things that might have been expected to show and were looked for without result: any change
to the cable mast after its plate failed to come away on both earlier flights, and any antenna
added for the link between the two ships.

## The television cameras

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Number | two | documented | Efimov; Siddiqi p. 357 ("the two cameras mounted in the cabin") |
| Mass, power | 3 kg, 12 W each | documented | Efimov, 2007 |
| Tube | one-inch vidicon, LI-23 | documented, for the first Seliger camera | Efimov, 2007. The rebuilt camera had a different vidicon; which is not stated |
| Duty | 15 minutes on, an hour and a half off | documented | Efimov, 1996 |
| Case | 104 × 118 × 226 mm, its long edges rounded, a pressed rim and cross on each long side | **estimated** | the one photograph of a Seliger camera (Efimov, 1996 and 2007), scaled by the one-inch tube inside it and by its plug. No dimension was found |
| Front | a black plate, a bracket across its top with four screws, a lens of 52 mm barrel with a focusing ring and lever below the middle | estimated | the same photograph |
| Cable and plug | a cable in a violet braid from the back to a round plug | estimated | the same photograph, where the cable leaves beside the lens: it is taken from the back here |
| Colour | grey-blue enamel | estimated | the same photograph |
| Whether the 400-line camera kept this case | | **assumed** | the photograph is not dated; Efimov says the camera used in the ground rig in 1962 was "the same as on board Vostok 3 and Vostok 4" and captions the one picture "Камера «Селигер»" |
| The first camera's place | 760 mm in front of the seat's plane over his waist, 160 mm to his left, looking at his face from about 35° toward his feet | estimated | the frames received from both ships (in *Звёздные братья* and as RussianSpaceWeb reproduces them) show the pilot full face, the helmet's ring nearly round: the camera was in front of him, not beyond his feet. Its distance and side are ours |
| The second camera's place | at his right, level with his head | **assumed** | not in anything read. For the dogs one camera looked from the side and one from in front (Efimov, 2007) |

## The film camera

As [Vostok 2's](../vostok-2/spacecraft.md#the-film-camera): the same model of a Konvas-Avtomat in
the same place. On this flight both its kind and its place are assumptions.

## How it was checked

The type was checked against RKK Energia's cutaway, the Kaluga article and the flown descent
module of Vostok 1 ([Vostok 1's spacecraft.md](../../vostok-1/spacecraft.md)). For this flight
the film *Звёздные братья* was gone through frame by frame: its cabin scenes were shot on the
ground on 9 August (Kamanin: the two "work for the cinema" in their suits at the seat) and show a
pale quilted lining and little else that can be placed; its received television frames gave the
first camera's view. The flown descent module is said to be at the memorial complex in Shorshely
(a museum listing); no photograph of its cabin was found.

## What is simplified, for this flight in particular

What the model simplifies as a type is in [vostok-3ka.md](../../vehicles/vostok-3ka.md), "What the
model gets wrong or leaves out", and for the launcher in
[vostok-8k72k.md](../../vehicles/vostok-8k72k.md). Besides those:

- **The television cameras hang in the air.** Their brackets hold nothing: what they were fixed to
  is not known. Their cables end at their plugs.
- **Every size of the cameras is read off one small photograph.** The second camera's place is a
  guess; so are the first's distance and side.
- **No lamps, loudspeakers or microphones**, though all three are on record for this flight.
- **No fixed film cameras**, though they are on record.
- **The film camera is Vostok 2's**, by assumption, and hangs unsupported as there.
- **The pilot is Gagarin's figure with Nikolayev's name**: the same stature, the same suit, visor
  down, strapped in. He is not shown out of the seat.
- **The cabin is otherwise the type's.** The food lockers, the broadcast receiver and the
  instrument board are not told apart from the boxes that stand for the type's equipment. The film
  shows a pale lining; the type's is yellow, from Vostok 1's flown cabin, and is left so.
- **The launch vehicle is Vostok 1's model**, number for number.
- **Nothing after separation.** The descent module's look during and after entry is not modelled.

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 528,088 | 190 |
| 0.6 | 215,273 | 132 |
| 0.3 | 106,426 | 133 |

The two television cameras are 4,344 triangles, at full detail only: with the seat, the pilot,
the film camera and the rest of the cabin's contents they are left out below detail 0.75. The
clearance check passes at all three.
