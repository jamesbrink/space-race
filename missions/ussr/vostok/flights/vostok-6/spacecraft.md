# Vostok 3KA No. 8, as flown from 16 to 19 June 1963

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension of the type,
with its confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 8 and to this flight.

**As hardware, No. 8 and No. 7 cannot be told apart on the record read, except by who sat in them.**
They were built together in 1962, both at first for women, tested as a pair in the spring of 1963,
and spoken of together by everyone who wrote about them. One figure of equipment differs (the
beacon's frequency), one of mass, and the stores were for three days where No. 7's were for eight;
none of that can be drawn. So the ship is the same geometry as
[Vostok 5's](../vostok-5/spacecraft.md), built by the same call, and what that file says of the
lining, the television cameras, the film camera and everything assumed holds here. **What differs
in the model is the pilot**, and she differs in everything the record allows: her size, her build,
her suit.

It is built as it rode under the fairing on 8K72K No. E103-25, the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone
it is as in orbit.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** means taken
to be as the type has it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KA No. 8 | documented | Siddiqi, launch log: "3KA 8"; Kamanin, 11 May 1963: «по кораблям №7 и №8»; the plate at RKK Energia's museum: «спускаемый аппарат №8» (McDowell's photograph); Siddiqi (2009): "vehicle 3KA no. 8" |
| Launch vehicle | 8K72K No. E103-25 | documented, tertiary | McDowell's launch log (GCAT). **Siddiqi's launch log gives no number** |
| Third stage engine's number | | **not found** | |
| Mass in orbit | 4,713 kg | documented | Siddiqi, Table IB: the lightest of the six. Vostok 5: 4,720 |
| Descent module / instrument module mass | 2,460 kg / 2,270 kg | documented, for the type | Siddiqi p. 195. No. 8's own have not been found, nor where its 7 kg under No. 7 lay |
| Length, diameters, hatches | as the type | documented, for the type | [vostok-3ka.md](../../vehicles/vostok-3ka.md) |
| Stores | for up to three days | documented | Kamanin, 4 June 1963. She ate "not less than 60 per cent" of them by her own account (Kamanin, early July) |
| Tests on the pad | 15 June: "no remarks" | documented | Kamanin, 15 June 1963 |
| Cabin air in flight | 30 °C at liftoff, 23 °C at the end of the first day, 12 °C from the start of the second | documented | her report of 20 June, as Kamanin wrote it down |
| Radiation | the dosimeters "stood at zero" | documented | her report |
| Radio | voice on 20.006 and 143.625 MHz; the Signal beacon on 19.995 MHz; reports of the descent by telegraph key | documented | TASS, 16 June 1963 (*Заря Востока*, 17 June); her report. Vostok 5's beacon: 19.948 MHz |
| Television | two cameras, one seen from in front and one from the side; switched on from the ground | documented (that it had television, the two views, the switching); assumed (the kind) | Kamanin, 18 June; the received frames (RussianSpaceWeb); Efimov captions her frame «"Селигер" (после модернизации)» |
| Braking engine | 1,614 kgf, 45 s at most | documented, for the type | Siddiqi p. 197. **Its burn on this flight was not found** |
| Orbit's nominal life | 7.1 days | documented | Kamanin, 17 June 1963 |

## What differed from 3KA No. 7

| Difference | In the record | Confidence | Source, and what the model does |
| --- | --- | --- | --- |
| The pilot | Valentina Tereshkova, in the SK-2 | documented | Abramov and Skoog, *Russian Spacesuits*, p. 58; the photographs and film of 16 June. **Modelled**: see "The pilot and her suit" |
| The seat | one of the two made for women; fitted to her, with the harness, on 3 June | documented | Kamanin, 4 May and 3 June 1963. **Nothing to draw**: what a woman's seat differed in was not found. The seat is the type's slabs |
| The suit's sanitary fitting | "the required changes were also introduced in the design of the receptacle of the waste management system" | documented | Abramov and Skoog, p. 58. Not modelled |
| Reach | "I could not reach the Globus or other instruments. I had to undo part of the harness"; the biological samples out of reach altogether | documented | her report. **The model shows it as far as a model can**: the figure is hers and the cabin is the type's, and the board is no nearer her than it was to him. No measurement of the reach was found |
| Stores | three days' where No. 7 had eight | documented | not modelled, as on No. 7 |
| A photometer | "two measurements by the photometer" | documented | her report. Not modelled: nothing was found of it |
| Light filters, marked film | observations "with light filters"; "photography on marked film" in her flight plan | documented | her report; Zak, from the flight plan. Not modelled |
| A spyglass | tried in this cabin on 31 May and left out: the ship "overloaded and filled to the limit" | documented | Kamanin, 31 May 1963. Correctly absent |
| The beacon's frequency | 19.995 MHz against 19.948 | documented | TASS. Nothing to draw |
| Mass | 7 kg less | documented | nothing to draw |

**Everything else is assumed the same as No. 7**, and through it as the type: the hull, the
lining, the cameras, the straps, the cable mast, the bottle ring, the antennas, the radiator, the
braking engine, paint and lettering (none), the fairing, Block E and the launcher under it.

## The pilot and her suit

The figure is [sk_1.py](../../crew/sk_1.py)'s, worn by `TERESHKOVA`
([sk-1.md](../../crew/sk-1.md), "The SK-2, and the suits of June 1963").

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Height | 1.64 m | **estimated** | **no document with her height was found.** Read off the colour photograph of her reporting at the pad on 16 June (collectSPACE): sole to the top of the helmet is 5.6 times the helmet's width, as it is on the module's figure of 1.65 m. The helmet's own size is an estimate, so this is good to some 8 cm. The women were chosen to be no taller than 170 cm (popular accounts; no document seen). 164 cm is what is printed about, without a source |
| Build | shoulders 0.95 and hips 1.06 of what her breadth alone would give; breadth 0.93 and girth 0.94 beside the shared figure | **estimated** (the amounts); documented (the direction) | Abramov and Skoog, p. 58: the SK-2's enclosure "featured a decreased shoulder breadth, an increased hip girth and a decreased opening in the neck partition" |
| Suit | SK-2: eight made in 1962 | documented | the same |
| Helmet | white, lettered СССР in red | documented, by photograph | five photographs and film stills of 16 June: at the bus, reporting at the pad, on the gantry, at the hatch |
| Breathing valve | a disc some 8 cm across at the right front of the collar: a black rim round a pale cap with three slots | estimated | the photograph at the hatch; the received television frames, in which it is the plainest thing after her face |
| Elbow and hose at the right of the collar | an angled metal fitting and a black hose | estimated | the photograph at the hatch |
| Neck piece under the helmet's ring | pale | estimated | the same |
| Gloves | black leather, on metal wrist rings; a little smaller than her hand's own scale | estimated (black: a colour film still of her parachute exercise in the suit, and the SK-1 at Zvezda's museum); documented (thinner) | Abramov and Skoog, p. 58: "the thickness of the thermal protection layer was decreased and mobility of the thumb improved". At the pad and on the gantry her hands are bare |
| Mirror on the right sleeve | none | documented, by photograph | her right forearm is in plain view as she salutes at the pad. A bright disc on a dark band on her left forearm (a watch, or a strapped mirror) is not built: it could not be made out |
| Boots | black laced, as the module's | **assumed** | what she walked to the pad in were loose white cloth covers to mid-calf, over whatever was under them; Abramov and Skoog say only that the boots were leather, with buckles |
| Cover | orange, as the module's | documented, by photograph | the colour photographs of 16 June |
| The helmet's cord | "moved down from the breast" on the SK-2 | documented | Abramov and Skoog, p. 58. **Not modelled**: the photograph at the hatch shows pale cord lying on her left chest much as the module has it, and where its lower end went cannot be seen |
| Hair | none shows: the white cap covers it | documented, by photograph | |
| The emblem of a dove on her undergarment | under the suit | documented | collectSPACE. Out of sight; not built |

## How it was checked

The flown descent module, RKK Energia's, was looked at in the photographs taken while it was on
loan to the Science Museum in London (September 2015 to March 2016; Wikimedia Commons), which show
the cabin through the open hatch: the lining white, the board with the Globus in its middle over a
row of four dials and a block of lamps to one side, a column of switches at its left. The lining
is followed. The board is not: the type's has its Globus to one side, and that was left as it is
for every flight. The seat is not in the ball; it is shown beside it at the museum, crushed, as it
landed. The figure's stills were set beside the photographs of 16 June.

## What is simplified, for this flight in particular

Everything listed in [Vostok 5's spacecraft.md](../vostok-5/spacecraft.md#what-is-simplified-for-this-flight-in-particular)
applies here: the cameras that hang in the air, the film camera assumed to be Vostok 2's, no stores
or instruments of the experiments, the type's seat, board and launcher, the lining as one flat
colour. Besides those:

- **Her height is an estimate from one photograph**, and her build is a direction from a book with
  amounts of ours.
- **The face is nobody's**, as on every figure here ([sk-1.md](../../crew/sk-1.md)): the shared
  head, not a likeness of her, and not a woman's head either.
- **The SK-2 is the SK-1's model recut**, not a survey of an SK-2: no photograph of one on display
  was found, and the photographs of 16 June show it from the front only. The lowered cord, the
  changed shoulder restraint, the lever of the valve and the visor's handles are not drawn.
- **The boots are assumed.**
- **Nothing shows what she could not reach.** The seat was not moved toward the board or away from
  it, since neither her place in it nor the board's distance is recorded.
- **No photometer, filters or pencils.**

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 528,628 | 190 |
| 0.6 | 215,273 | 132 |
| 0.3 | 106,426 | 133 |

The pilot, the seat, the cameras and the rest of the cabin's contents are left out below detail
0.75, so the two lower levels are Vostok 5's to the triangle. The clearance check passes at all
three.
