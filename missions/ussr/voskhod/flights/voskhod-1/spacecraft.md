# Voskhod 3KV No. 3, as flown on 12 and 13 October 1964

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the Voskhod's, [voskhod.py](../../vehicles/voskhod.py), built as the 3KV, and **every dimension of
it, with its confidence and basis, is in [voskhod.md](../../vehicles/voskhod.md)**, which in turn
sends the reader to [vostok-3ka.md](../../../vostok/vehicles/vostok-3ka.md) for what was the
Vostok's (one place per number). This file is what is particular to No. 3 and to this flight.

**No. 3 was the only 3KV to carry a crew, so the type and the flight are nearly one thing.** What
is the flight's own in the model is the three men in the couches and the order they lie in.

It is built as it rode under the fairing on 11A57 No. R15000-04, the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone it
is as in orbit.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** means taken
to be as the Vostok had it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KV No. 3 (11F63) | documented | Siddiqi p. 423: "The Voskhod spacecraft, 3KV no. 3"; his launch log; Kamanin, 9 October 1964, with the editor's note «заводской № 3» |
| Launch vehicle | 11A57 No. R15000-04 | documented, tertiary | McDowell's launch log (GCAT); spacefacts.de. **Siddiqi's launch log gives no number.** R15000-02 was Kosmos 47's |
| Mass in orbit | 5,320 kg | documented | Siddiqi p. 412 and Table IB. Chertok: "5.7 metric tons" |
| Descent module mass | 2,900 kg | documented | Siddiqi p. 412 |
| Length | "five meters"; 5.48 m in the model | documented (the round figure); estimated (the model's) | [voskhod.md](../../vehicles/voskhod.md), "Length" |
| Reserve engine | 143 kg; 12,000 kgf for about 2 s; not fired | documented | Siddiqi p. 411 |
| Braking engine | TDU-1: 1,614 kgf, 45 s at most | documented, for the type | Siddiqi pp. 411 and 197. **Its burn on this flight was not found** |
| Cabin air in flight | 15 °C rising to 21 °C over the first six orbits; pressure, humidity and carbon dioxide "within limits" at the start of the seventh | documented | Kamanin, 12 October 1964 |
| Leak, as forecast | 180 litres a minute | documented | Siddiqi p. 411 |
| Stores and air | for one day's flight; two or three days at most | documented, disputed | Kamanin, 13 October; Chertok, p. 237 |
| Food | 2,700 to 2,800 kcal a day: 120 g protein, 100 g fat, 300 g carbohydrate | documented | the press conference of 21 October (*Заря Востока*, No. 249) |
| Radio | voice on 143.625, 17.365 and 18.035 MHz; the Signal beacon on 19.9944 MHz | documented | TASS, 12 October 1964 |
| Television | 25 frames a second; one camera in the cabin, one outside worked by the crew; seen on the sixth and seventh orbits | documented | Siddiqi p. 411; Kamanin |
| Experiments | ion engines outside the ship, run on the sixth and seventh orbits; a sextant; the Polinom medical set; cell cultures, seeds, fruit flies | documented | Siddiqi pp. 423 and 424 |

## Who lay where

| Couch | Man | Basis |
| --- | --- | --- |
| Right, next to hatch No. 1 | Komarov, commander | he was the last aboard (Kamanin, 12 October: «Первым в корабль сел Егоров, потом — Феоктистов, последним — Комаров»); "Komarov, who was sitting next to the hatch" (Zak, from Feoktistov) |
| Centre, set forward | Feoktistov | "the middle seat" (Zak); Siddiqi p. 412: "the middle one raised forward" |
| Left, next to the board and the Vzor | Yegorov | "The first to take his place in the cabin was the flight doctor - his seat was farthest from the entrance" (the crew's own account, in English) |

**Derived, not stated**: that the entry hatch was at the crew's right. Siddiqi has the board and the
Vzor at the crew's left; the Vzor looks through hatch No. 3, which is opposite hatch No. 1; and the
flown cabin, photographed from its entry hatch, has the board and the Vzor on the far wall with
"seat 1" nearest the camera. No source read says "right".

## The crew's figures

The three are [flight_suit.py](../../crew/flight_suit.py)'s figure
([flight-suit.md](../../crew/flight-suit.md)): a grey wool suit, bare hands, soft shoes, the
headset's white cap. **All three are one build of 1.70 m**: no height was found for any of them,
and the estimate rests on photographs of them standing together and beside Belyayev.

## How it was checked

The stills of the build were set beside: OKB-1's general drawing of the 3KV (the reserve engine's
steps, the hairpin antennas beside it, the hatches, the fairing's line); the photographs of a test
article of the 3KV and of this ship in assembly, under its fairing half and being joined to its
third stage (the stepped drum on the pole, the foil on the sphere); the photograph of the flown
cabin from its entry hatch (the board over the Vzor on the far wall, the white cloth lining); the
photographs taken in a Voskhod cabin (the caps, the grey tops, the men shoulder to shoulder with
their knees up); and the flight costume at Kaluga.

What does not match: the flown cabin has a television camera in a grey box at the right of the
hatch and large cloth bags along the wall, none built; the couches themselves are not in the flown
ball as photographed, and the model's are drawn from a 3KD's; the men in the photographs are held
by straps, and the model's are not.

## What is simplified, for this flight in particular

Everything in [voskhod.md](../../vehicles/voskhod.md) and, through it,
[vostok-3ka.md](../../../vostok/vehicles/vostok-3ka.md). Besides those:

- **One figure three times**, in a suit of a kind and not known to be theirs.
- **Nothing of the experiments**: the ion engines, the sextant, the Polinom set, the cameras.
- **The reserve engine is white**, as one photograph of this ship has it; another shows it bare.
- **The couches' places are what fits**, not what was measured: [voskhod.md](../../vehicles/voskhod.md),
  "The fit", has the room each man is left and the three things the photographs of this ship and of the trainer
  say against it (the middle couch's displacement, the container's depth, the couches' height).
- **The pilot's panel and the hand controller**, which this ship still has across the cabin just inside hatch
  No. 1 (Pillet's photographs), are not built.

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 717,053 | 211 |
| 0.6 | 231,275 | 142 |
| 0.3 | 110,154 | 143 |

The crew, the couches and the rest of the cabin's contents are left out below detail 0.75. The
clearance check passes at all three.
