# Voskhod launch vehicle (11A57)

The launch vehicle of the two crewed Voskhods: the R-7's core and four strap-on boosters under the
third stage built for the planetary probes, Block I. Model: [voskhod_11a57/](voskhod_11a57/),
imported by a flight's `model/vehicle.py`. Voskhod 1's was No. R15000-04 and Voskhod 2's
No. R15000-05 (McDowell's launch log; Siddiqi's launch log gives no number for either).

**What is the Vostok launcher's, and what is not.** The core (Block A), the four boosters, their
engines, the lattice and the builder of the fairing are imported from
[../../vostok/vehicles/vostok_8k72k/](../../vostok/vehicles/vostok_8k72k/) and built by it, to this
vehicle's stations; everything [vostok-8k72k.md](../../vostok/vehicles/vostok-8k72k.md) says of them,
their confidence and what is wrong with them holds here and is not repeated. That the 11A57's core
and boosters were to look at what the 8K72K's were is **assumed**: its engines were of a later issue
(Brügge calls them RD-107M and RD-108M, Encyclopedia Astronautica 8D74K and 8D75K), and nothing read
says what else differed. What is this vehicle's own, and is built here
([upper.py](voskhod_11a57/upper.py)): Block I and its RD-0108, the aft section it sheds, the adapter
the spacecraft stands on, the fairing's lengths and its conical nose, and for Voskhod 2 the blister
over the folded airlock.

The model is in **millimetres**. Stations are heights above the plane of the main nozzles' exits;
the spacecraft's own frame (station 0 at its braking engine's nozzle) stands at height 36,600.

**Confidence**: *documented* is a published figure, with where it was read; *derived* is computed
from documented ones; *estimated* was scaled off a drawing or photographs, or chosen to make the
documented figures fit together. **No OKB-1 drawing or table of the launcher has been read.** Two
of OKB-1's general drawings of the spacecraft show the fairing's outline round it.

## Sources, in short

Keys used below; full entries in [docs/sources.md](../../../../docs/sources.md), "Voskhod".

- **S**: Siddiqi, *Challenge to Apollo*: p. 410 and its note 4 (the engine), Table VI, p. 921 (the
  vehicle), pp. 411 and 423 (the ascent).
- **Z**: Zak, RussianSpaceWeb: "Voskhod launch vehicle (11A57)"; "Third stage of the Soyuz rocket"
  (the stage as it flies today, from the maker's manual); the RD-0110.
- **B**: Brügge's table for the 11A57 (b14643.eu). Secondary, and uncited figure by figure; it
  names the third stage's engine RD-0110, which is the later one.
- **A**: Encyclopedia Astronautica, "Voskhod 11A57" and "RD-0108". Tertiary.
- **K**: Kamanin's diary, 6 and 12 October 1964 (the ascent's times).
- **D-KV**, **D-KD**: OKB-1's general drawings of the 3KV (17 April 1964) and the 3KD (April 1965),
  RGANTD, as reproduced by Pillet and by Zak: each draws the fairing round the ship. Read at 6.5 and
  7.4 mm to a pixel, scaled by the sphere's 2,300 mm.
- **P**: photographs of Voskhod 1's vehicle in assembly, at rollout and on the pad, and of the
  spacecraft being joined to the stage (RKK Energia, as reproduced by Zak). 200 to 730 pixels wide.
- **M**: Minakov's figures for the Vostok launcher, by way of the Vostok's record.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| From the core's top to the fairing's tip, with a Voskhod | 16,665 mm | documented, secondary | Z: "the cylindrical section of its payload assembly was streched by 2,710 millimeters to 16,665 millimeters versus 13,955 millimeters on the 8K78 variant". **What the figure spans is not stated.** It is taken from the core's top, lattice included, because that makes the vehicle 44.155 m, which is B's 44.13 m to 25 mm, and leaves a fairing that D-KV and D-KD agree with |
| Length on the pad | 44,155 mm | derived | the core's 27,490 (M's 28,750 less his lattice of 1,260) and the 16,665. In print: 44.13 m (B); "43.5–45.22" for the type (S, Table VI); 44,628 mm (Russian Wikipedia, uncited) |
| Greatest width, over the air rudders | 10,300 mm | documented | S, Table VI: 10.303; B: 10.30 |
| Core and strap-ons | as the 8K72K's | assumed | see above |
| Lattice | 1,260 mm, ending 28,750 up | assumed | the 8K72K's (M). **No figure for the 11A57’s was found.** B gives this vehicle’s Block A as 28.44 m, without saying what that spans |
| Block I with its adapter | 9,050 mm | documented, secondary | B: "Length (+adapter) 9.05" |
| Block I alone | 6,745 mm | documented, of the stage as it flies today | Z, from the maker's manual for the Soyuz: 6.745 m. That the stage of 1964 was the same length is assumed; A prints 2.84 m, which is Block E's |
| Adapter | 2,305 mm | derived | the difference |
| Block I diameter | 2,660 mm | documented, secondary | Z; B |
| Fairing | 6,355 mm long | derived | 16,665 less the lattice and the stage with its adapter. B prints 6.74 m by 2.58, the same figures as he gives the Vostok's |
| Fairing diameter | 2,700 mm outside | assumed | the 8K72K's (M). D-KV and D-KD draw its inside 2.59 to 2.64 m across |
| Fairing's nose | a straight cone, 22° from the axis, ending in a cap of 290 mm radius; 2,857 mm long | estimated | D-KV and D-KD: 21.5 to 22.8° by three readings; the cap's radius is chosen. P shows a cone on a cylinder, white |
| Fairing's cylinder | 3,498 mm | derived | what is left. It puts the shoulder 518 mm above the sphere's pole; D-KV and D-KD have it 605 to 643 mm above |
| Fairing's opening | round, 1,150 mm across, over hatch No. 1 | estimated | the 8K72K's. P (the vehicle being raised) shows a long dark opening high on the cylinder; its shape was not made out |
| Blister (Voskhod 2) | over a hole 1,620 mm across in the half opposite the opening; 1,720 mm wide, 3,450 mm long, standing 620 mm out | documented (that there was one); estimated (every size) | Z, of Kosmos 57: "the protruding airlock visible on the right side of the payload fairing". D-KD has the folded airlock reaching 1.66 m from the axis, 0.36 m beyond the fairing's wall as it draws it; the model's airlock, on the Vostok's hatch latitude, needs more. See [voskhod.md](voskhod.md), "What the model gets wrong" |
| Aft section | 1,950 mm, in three pieces | documented (three pieces, of the stage today); estimated (its length, where the cuts lie) | Z: "the aft section also separates from the third stage and splits into three segments ... six pyrotechnic locks ... three spring pushers ... and three pairs of spring pushers" |
| Tanks | kerosene above oxygen, each two domes and a cylinder, 2,600 mm across, an instrument bay between | documented (the arrangement, of the stage today); estimated (every station) | Z. Stations chosen to hold 15.7 t of oxygen and 7.1 t of kerosene (Z's figures for the Soyuz-U) with domes 0.9 m deep |
| Gas bottles in the stage | five, 500 mm across | documented, of the stage today | Z: "Five spherical tanks with a diameter of 500 millimeters" |
| RD-0108's main nozzles | four, exits 750 mm across, 455 mm from the axis along both of the stage's axes | estimated | derived loosely from 7.5 tf a chamber at 68 bar (A) and an area ratio of about 70; no figure or photograph of the engine of 1964 was read |
| Steering nozzles | four, 1,085 mm from the axis, in line with the boosters | documented (four, of the RD-0110); estimated (the places) | Z |

### How the lengths were set

Three published lengths and two drawings had to agree. Taking Z's 16,665 from the core's top gives
B's overall length. Taking it from the lattice's top gives 45.4 m, which is 0.2 m more than the
upper end of S's range and leaves a fairing of 7.6 m, a metre longer than the drawings allow: with
its shoulder where D-KV and D-KD put it and their cone, the fairing is 6.2 to 6.5 m long whatever
the cap. So the first reading is taken. It is a reading, not a statement of the source.

## Masses and engines

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Liftoff thrust | 413.3 tf (4,053 kN) | documented | S, Table VI. B's table sums to 4,054.2 kN |
| Liftoff mass | not settled | | 298.4 t (Russian Wikipedia; A: both uncited); 309.8 t (B). The cell is illegible in the copy of S read. Not used |
| Payload | "c. 7.5 to LEO" | documented | S, Table VI. A: 5.9 t |
| Strap-on's engine | 819.1 kN each at the ground | documented, secondary | B: 3,276.4 kN for the four; burn 120.5 s |
| Core's engine | 777.8 kN at the ground | documented, secondary | B; burn 287.4 s |
| RD-0108 | 30.4 tf in vacuum (298 kN) | documented | S, p. 410, note 4, from Varfolomeyev: "The new engine, the RD-0108 developed by Chief Designer Kosberg's OKB-154, had a vacuum thrust of 30.4 tons", made from the R-9A's second stage engine. **S contradicts himself** on p. 469: "RD-0110 instead of the earlier RD-0108, thus increasing thrust from 30.0 tons to 30.4". A: 297.9 kN, 326 s, 250 s, 410 kg, four chambers. Chertok (vol. 3, p. 123, note 24) names the version 8D715P |
| Block I's propellant | 22.5 to 22.98 t | documented, of the stage today, and secondary | Z; B |

## Ascent

| Event | Time from liftoff | Source |
| --- | --- | --- |
| Strap-ons separate | 120 s (Kosmos 47); 118 s (Voskhod 2) | K, 6 October 1964; Belyayev's report |
| Fairing | 150 s (Kosmos 47); 153 s (Voskhod 2) | the same |
| Block I lights, core cut loose | 290 s (Kosmos 47); 292 s (Voskhod 2) | the same |
| Block I shuts down | 523 s (Voskhod 1; Voskhod 2) | K, 12 October 1964: «Томительные 523 секунды»; S p. 423; Belyayev's report |
| Spacecraft separates | 527 s (Voskhod 2: 528.1 s by OKB-1's report) | Belyayev's report; OKB-1, 6 June 1965 |

Voskhod 1's own times other than the 523 s were not found. On Kosmos 47 the third stage's thrust
fell by a tenth for three seconds and recovered (K, 7 October 1964).

**No escape system.** S, p. 411: "it was clear that Plant No. 81 would not have a working version of
a tower-equipped launch escape system ready ... OKB-1 merely stated that it would be 'difficult' to
rescue the cosmonauts up to the first twenty-five to forty-four seconds of a launch; a more accurate
term might have been 'impossible.'" After that the ship would be cut loose and come down by its own
parachutes. K, 14 September 1964, has "in fact impossible" to the 27th second and "difficult but
possible" from the 27th to the 44th.

## Paint

| Item | In the model | Confidence | Basis |
| --- | --- | --- | --- |
| Core and strap-ons | the 8K72K's grey-green lacquer and frost | assumed | [vostok-8k72k.md](../../vostok/vehicles/vostok-8k72k.md) |
| Block I | the same lacquer on the aft section, the instrument bay, the kerosene tank and the adapter; frost over the oxygen tank | estimated | P (the vehicle being raised, in black and white): under the white fairing a dark length, then a white one, then a dark one above the lattice |
| Fairing | pale | estimated | P: white in the colour photographs of the pad |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in a flight's `flight.ts`.

| Node | Contains | Leaves as |
| --- | --- | --- |
| `Fairing` | `Fairing_Left`, the half with the round opening, and `Fairing_Right` (which on Voskhod 2 carries the blister), each a node with its origin at its foot | each tips outward about its foot and falls away |
| `BlockI` | the stage: skin, frost, the adapter and its stringers, the instrument bay's hatches, the shield under the engine, the RD-0108's four chambers and four steering nozzles; inside, the two tanks, the cone that carries the engine, the turbopump, five gas bottles, instruments | lifts off the lattice |
| `AftSection` | `AftSection_1` to `_3`, each a third of the skirt with its inner wall, a node with its origin at the middle of its foot | each is pushed off sideways and falls behind |
| `Interstage` | the lattice and the deflector cone (the 8K72K's, to this vehicle's station) | stays on the core |
| `CoreStage`, `CoreEngine`, `Booster_B`, `_V`, `_G`, `_D` | the 8K72K's | as the 8K72K's |

## What the model gets wrong or leaves out

Everything listed in [vostok-8k72k.md](../../vostok/vehicles/vostok-8k72k.md) for the core, the
boosters, their engines and the lattice, and besides:

- **The core and boosters are the Vostok launcher's.** What the 11A57's differed in, beyond their
  engines' issue, is not known to us.
- **The lattice is the Vostok launcher's**, though it carried a stage three times as heavy on four
  chambers where the other had one.
- **Block I is the stage as it is described today**, to lengths published for it today and for this
  vehicle at second hand. Every station inside it is estimated; its tanks' domes are drawn 0.9 m
  deep where the description says hemispheres, because hemispheres of that radius do not fit the
  stage's length with the engine under them.
- **The RD-0108 is the right kind of thing**: four bells with throats, four small nozzles on
  trunnions, a turbopump between the chambers. No photograph or drawing of it was read; the
  steering nozzles do not turn.
- **The shield under the engine stays with the stage**, where the description has thermal
  protection on the bottom of the aft section, which leaves.
- **The aft section's cuts, locks and stiffeners are ours.**
- **The fairing's opening is the Vostok's round one**, and its fittings the Vostok's.
- **The blister is a faired shape of our own** over a round hole: its real outline, how it was
  fastened and how far along the fairing it ran were not found. The one description is "protruding".
- **Frost is one clean white** with a wandering lower edge, as on the core.
- **A latent fault in the Vostok launcher's core was found while building this one**: under each of
  the four brackets the boosters' tips push into, the two webs' lower edges lie in the plane of the
  bracket's foot, two faces in one place. The clearance check passes it at the 8K72K's stations by
  rounding and fails it at this vehicle's. It is put right here (`core.build(web_foot=...)`) and
  left as it is there, so that the Vostoks' built models do not change.
