# Voskhod: the 3KV and the 3KD

What [voskhod.py](voskhod.py) builds, and how far to trust each number. One module with two builds:
`build("3KV")`, three couches, flown as Voskhod 1; `build("3KD")`, two couches and the Volga airlock,
flown as Voskhod 2. A flight's `model/vehicle.py` chooses the build and puts its crew in the couches.

**A Voskhod is a Vostok 3KA altered, and so is the model.** What was the Vostok's is imported from
[../../vostok/vehicles/vostok_3ka.py](../../vostok/vehicles/vostok_3ka.py) and built by it, unchanged:
the sphere and its three hatches, the pressure hull and its lining, the plain instrument board and
Vzor, the four straps and their lock, the cable mast, the instrument
module with its antennas, the bottle ring, the braking engine. **Every dimension of those, with its
confidence and what is wrong with it, is in [vostok-3ka.md](../../vostok/vehicles/vostok-3ka.md)**
and is not repeated here. The Vostok's module was given nine options for this, each defaulting to
what it did before (`pole`, `technological`, `rails`, `stores`, `controls`; and, for the cabins as
re-laid, `hatches`, `board`, `vzor`, `container`), and the Vostoks' built models are the same bytes
as before. What is built here is what a Voskhod had instead of the
ejection seat and on top of the sphere.

That the shared parts *were* the same is partly documented and partly assumed:

| Part | Standing | Basis |
| --- | --- | --- |
| Sphere, 2.3 m | documented by drawing | OKB-1's general drawings of the 3KV and 3KD draw the Vostok's outline; the mass rose to 2.9 t |
| Three hatches | documented by drawing (Nos. 2 and 3); the Vostok model's estimate (No. 1) | "The hatches", below: the azimuths are the Vostok model's, the latitudes of Nos. 2 and 3 are read off the same drawings and are **not** the Vostok model's |
| Instrument board and Vzor where the Vostok's were | documented | Siddiqi p. 412; the flown Voskhod 1 cabin, photographed from its entry hatch, has the board over the Vzor on the far wall. The board is put where the Vostoks' own cabin has theirs (`vostok_cabin.BOARD_AT`, `BOARD_TILT`) |
| Instrument module, bottle ring, straps with their hairpin antennas, ribbon antennas | documented by drawing | the same drawings |
| TDU-1 | documented | Siddiqi p. 411: "the standard TDU-1 liquid-propellant engine" |
| Cable mast, attitude jets, the antennas' number | **assumed** | nothing read says they differed. The radio was new |
| Cabin lining, white cloth | estimated | the flown Voskhod 1 cabin (Zak's photograph) |

The model is in **millimetres**; stations, azimuths and latitudes are the 3KA's.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right.

## Sources, in short

Keys used below; full entries are in [docs/sources.md](../../../../docs/sources.md), "Voskhod".

- **S**: Siddiqi, *Challenge to Apollo*, pp. 409 to 412 (the 3KV), 448 to 451 (the 3KD, the airlock,
  the suit), from Korolev's draft plans as published in 1980.
- **D-KV**: OKB-1's general drawing «ЗКВ 0000-0», 1:10, signed 17 April 1964 (RGANTD, as reproduced
  by Pillet, 1,123 pixels wide: 7.4 mm to a pixel).
- **D-KD**: the same for the 3KD, April 1965 (RGANTD, as reproduced by Pillet and by Zak, 1,440
  pixels wide: 6.5 mm to a pixel).
- **Z**: Zak, RussianSpaceWeb, "Designing Voskhod" and "Design of Voskhod-2", and his photographs of
  the flown Voskhod 1 cabin and of a 3KD cabin "equivalent" (2011, 2013).
- **T**: photographs of test articles of the 3KV (Zak) and of Voskhod 1 in assembly (RKK Energia).
- **K**: Kamanin's diary, 1964 and 1965.
- **A**: Abramov and Skoog, *Russian Spacesuits*, pp. 60 to 74, read as search snippets joined end
  to end, never as a page.
- **G**: Altunin, Verba and others, «60 лет внекорабельной деятельности», *Пилотируемые полёты в
  космос*, 2(55), 2025.
- **PR**: OKB-1's prospectus for the ship, signed by Korolev on 12 February 1964, with its Фиг. 1.
- **GK**, **CR**: the State Commission's transcript of 22 March 1965 and the crew's report of April 1965.
- **F**: Feoktistov, «Траектория жизни».
- **R**: Rabinovich's monograph on landing impact (the Elbrus couch on a test base, figs. 2.8 and 6.9).
- **P**: Pillet's photographs inside the flown Voskhod 1 and of the trainer at Zvezda (kosmonavtika.com).
- **GA**: the trainer at Zvezda and the flown Voskhod 1 on Google Arts & Culture.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length | "five meters" in print; **5,480 mm in the model** | documented (the round figure); estimated (the model's) | S p. 412: "a length of five meters and maximum diameter of 2.43 meters". D-KV scales to 5.43 to 5.49 m from the braking nozzle to the reserve engine's face. The model is the Vostok's 4,180 mm to the sphere's pole plus the reserve engine. See "Length" |
| Greatest diameter | 2,430 mm | documented | S p. 412 |
| Descent module mass | 2,900 kg | documented | S p. 412 |
| Mass in orbit | 5,320 kg (3KV No. 3); 5,682 or 5,685 kg (3KD No. 4) | documented | S p. 412 and Table IB; the Soviet poster of Voskhod 2: «Вес корабля на орбите 5685 кг» |
| Reserve engine | 143 kg, 87 kg of it solid propellant; 12,000 kgf for about 2 s | documented | S p. 411. Zak: 145 kg |
| Reserve engine's form | a collar 190 mm tall on the strap lock; a rear drum 860 mm across at its foot and 824 at its top, to 770 mm above the pole; a front drum 740 mm across, its flat face 1,300 mm above the pole; six stubs and a boss on the face | **estimated** | D-KV, D-KD and T, three readings: face 1.27 to 1.33 m above the pole, rear drum 0.82 to 0.91 m, front drum 0.73 to 0.76 m. The hatch on the front drum, the cable duct and the stubs are T's |
| Reserve engine's colour | white | estimated | T: white on Voskhod 1 under its fairing half; bare metal in the photograph of the ship being joined to its stage; grey-green on the test articles |
| Couches' line | the Vostok seat's, turned a quarter turn about the ship's long axis: the crew lie as a Vostok pilot lay, heads raised 24°, toward hatch No. 2 and the parachute container; the board and Vzor at their left, hatch No. 1 at their right | documented (the quarter turn about the long axis; heads toward the container; the board at the left); estimated (the 24°) | Z: "rotated 90 degrees around the vertical axis of the spacecraft relative to the previous position of the ejection seat"; PR Фиг. 1; S p. 412. The 24° is the Vostok model's estimate of its seat's rails, kept |
| Couches' places, 3KV | hip points 565 mm either side of the middle and 10 mm toward the heads; the middle couch 260 mm toward the feet of the others and 100 mm proud of them | **estimated**, by the fit | "The fit", below. PR Фиг. 1 draws the middle couch half a trunk toward the feet; S p. 412: "with the middle one raised forward" |
| Couches' places, 3KD | Belyayev's where the 3KV's right-hand couch is; Leonov's 25 mm left of the middle, 302 mm toward the feet of Belyayev's and 40 mm lower | **estimated**, by the fit | "The fit". That the place by hatch No. 3 is the empty one: RKK Energia's film frame and OKB-1's section (Z); Leonov, 2005, on the lid and his liner |
| Couch | a trough of riveted sheet 1.43 m long over all, 0.43 m wide under the trunk (0.48 m for a suited man), with a cup for the head (a shallow dish under a helmet), side walls 130 mm deep with four round stampings, a maker's plate, a raised rest for the calves on two stays; pads in grey-green cloth; two beams painted red under it; four struts | the form documented by photograph; every size **estimated** | P fig. 6g (the flown Voskhod 1: beam, stampings, domed head end, leg rest, «Изд. ЭЛЬБРУС», the red beams); R fig. 2.8; Z's and GA's photographs of the trainer. The pad's line is the under side of the model's own seated figure |
| Couch travel | 200 to 300 mm at the shoulders (PR p. 5, February 1964); 240 mm (R); "from 20 to 40 mm" (K, 20 June 1964) | documented, disputed | Not modelled: the struts do not move. On the 3KD the couches flew low and were fired up after the main parachutes opened (CR; GK) |
| Pose | hips 68°, knees 88°; in the 3KV the elbows drawn 30 mm in toward the sides | estimated | chosen to fit the ball. The elbows: `ELBOWS_IN` in crew/flight_suit.py |
| Parachute container | a drum 0.75 m across behind hatch No. 2, reaching 380 mm in from the hatch's plane on the pressure hull | **estimated**, by the fit | where it is: PR Фиг. 1 and Фиг. 3, P and Z (the cloth-covered mass at the head end). Its size is the fit's; "The fit" says what contradicts it |

### The hatches

| Hatch | Azimuth | Latitude | Confidence | Basis |
| --- | --- | --- | --- | --- |
| No. 1, entry | 135° | 24° | estimated | the Vostok model's (its seat's rails). Neither general drawing shows that side of the ball; an OKB-1 section suggests about 25° |
| No. 2, parachute | 45° | 21° | estimated, off a drawing | D-KD: 20.9° by an ellipse fitted to the sheet (centre 113 px from the sphere's, which is 194 px in radius; its minor axis 30.4° from the upright; b/a 0.66). D-KV: 21.2°. The Vostok model has 30° |
| No. 3, technological; the airlock's on the 3KD | 315° | 21° | estimated, off a drawing | D-KD: the airlock's base ring is centred 59 px toward the nose and 102 px out from the sphere's centre, seen 45° off the sheet: 20.8°. D-KV: 21.2°. The Vostok model has 15°. The two are 86° apart round the long axis by the same reading (90° in the model) |

**The Vostok model was not changed.** Its hatches Nos. 2 and 3 stand at 30° and 15° by its own estimate, which these
two drawings of the same ball contradict; that is for whoever next works on the Vostoks.

### What the record fixes in the cabin

| Fact | Source | Confidence |
| --- | --- | --- |
| Three couches abreast, heads toward the parachute container, the middle one displaced toward the feet by about half a trunk, the outer two toed in a little; a harness of four straps to a round buckle | PR Фиг. 1 (a painting, undimensioned, five months before the ship) | documented in arrangement; no dimension |
| "Side by side in a triangular shape, with the middle one raised forward"; board and Vzor "to the left side of the three couches instead of in front" | S p. 412 (no footnote) | documented (secondary) |
| The couches turned 90° about the ship's "vertical" (long) axis from the ejection seat's line | Z, "Designing Voskhod" | documented (secondary); no primary gives the angle or the axis |
| Voskhod 1: Komarov nearest hatch No. 1, Feoktistov in the middle, Yegorov at the far end by a porthole; Feoktistov and Yegorov changed places at 19:00 | F; Komarov's journal p. 45; K, 12 October 1964 (the boarding order) | documented |
| Voskhod 2: Belyayev by hatch No. 1, Leonov at the hatch No. 3 end; Leonov aboard first | CR (Belyayev pp. 4, 19); GK pp. 7 to 8, 21 | documented (Belyayev's place); derived (Leonov's) |
| The 3KD's empty place is the one by hatch No. 3 | RKK Energia's film frame and OKB-1's section, as Z reproduces them | documented by drawing |
| The couches lie across the line to the Vzor: Belyayev, to steer by it, lay «поперек корабля, поперек кресел, т.е. вдоль от "Взора"», Leonov «почти ко "Взору" … вне кресла вниз туда» | GK pp. 7 to 8; K, 22 April and 8 May 1965 | documented |
| The Vzor is in the lid of the hatch into the airlock, with a cover over its glass on the airlock's side | Z; GK pp. 14, 16, 20, 22; CR (Leonov p. 6) | documented |
| That hatch opens inward, by an electric drive from a panel or by a hand wheel in the cabin; its cams draw back and the lid «лег на свою плиту»; "toward the parachute container" | the FAI dossier (in Borisenko); GK pp. 3, 14 to 15; Z | documented; the hinge's side is Z's alone |
| Its opening: 650 mm (S p. 450; Z's table) or 700 mm (Z's text; Woods). Leonov: it was made smaller so that the lid would clear his couch's liner, leaving 20 mm at each shoulder | as given; Leonov in «Российская газета», 2005 | documented, in conflict; no primary gives the figure |
| The instrument board is within reach of a man passing that hatch | GK p. 16 | documented |
| The pilot's panel lies across the cabin just inside hatch No. 1's rim on the side toward the nose, the hand controller in a recess at its end | P figs. 6a, 6l (the flown Voskhod 1); GA (the trainer has the same) | documented by photograph; not built |
| The couch: individually moulded liners; a head rest; bolted to the ship's side; hung on two shock absorbers | Yegorov (TASS, 21 October 1964); K, 20 July and 29 September 1964; R | documented |
| The airlock stands on hatch No. 3, opposite No. 1 | S p. 448; Z | documented (secondary) |
| Nothing found: any dimension inside the cabin; the middle couch's displacement as a figure; the couches' tilt; the container's size; where the airlock's panel, the pack's mount, the survival kits and the television cameras were | | |

### The fit

**The cabin is fitted round the seated men, not drawn**, as Gemini 3's crew station is. What fixes it is above: the
sphere, the three hatches, the couches' line and their order, the container beyond the heads, the board and Vzor.
Within that, each couch is put where a man of known stature in what he wore (crew/flight-suit.md, crew/berkut.md)
passes through nothing, and every figure here is `estimated`. With the crews aboard, at full detail, the least room
between surfaces (measured on the built meshes: the tool is in the scratch folder named in the commit):

| | Voskhod 1 (3KV) | Voskhod 2 (3KD) |
| --- | --- | --- |
| Right-hand man: head to the container's side | 92 mm | 17 mm (the helmet's pivot) |
| Right-hand man: head to the lining | 75 mm | 23 mm |
| Right-hand man: toes to the lining | 16 mm | 16 mm |
| Middle man (3KV), Leonov (3KD): crown to the container's end | 45 mm | 29 mm |
| The same: toes to the lining | 18 mm | 17 mm |
| Left-hand man (3KV): head to the container, to the lining; toes | 92, 75, 16 mm | |
| Man to man, at the arms | 13 to 14 mm | 5 to 8 mm |
| Left-hand man to the board, to the Vzor (3KV); Leonov to the pack (3KD) | over 250, 117 mm | 167 mm |
| A man and a neighbour's couch | 48 mm | 14 mm |

What the fit had to give, and what contradicts it:

- **Three figures do not lie abreast with their arms as figurelib's man holds them** (elbows 8 cm outside the
  shoulder joints, 0.65 m over the sleeves): at any pitch the ball allows, a middle man's shoulders pass through his
  neighbours' arms. So the 3KV's men have their elbows drawn in 30 mm (0.59 m over the sleeves), and the middle couch
  stands 100 mm proud of the others, which carries its man's shoulders over their forearms. "Raised forward" is
  Siddiqi's; the amount is the fit's.
- **The middle couch is 260 mm toward the feet**, which is what leaves its man's crown short of the container with
  his toes clear of the lining. PR Фиг. 1 draws about half a trunk. The photographs of the flown Voskhod 1 (Z; P fig.
  6g) show the middle head rest only some 0.1 to 0.15 m footward of the others': **a misfit of about 0.1 m, recorded.**
- **The container is smaller than the Vostok model's** (0.75 m by 380 mm against 0.8 m by 440 mm) so that a suited
  man's helmet passes beside it and the middle man's crown stops short of it. The trainer at Zvezda has a mock
  container that reaches to 0.25 or 0.3 m from the cabin's middle, its under side above the head rests: **if the real
  one was so, the heads lay under it and not beside it, and this fit is wrong there.** No photograph found shows a
  container over a man's face, its depth under the cloth in the flown Voskhod 1 cannot be seen, and none is built so.
- **The couches lie lower than the trainer's.** As built, the right-hand couch's rim is 40 mm below the lower edge of
  hatch No. 1's opening. On the trainer, whose couches are in their raised position, the side beam's top is some 0.3 m
  above that edge (read off GA's photograph, good to a quarter), which with R's 240 mm of travel would put the flight
  position about 0.1 m above where it is built. Raised by that much, the outer men's toes and heads do not clear the
  lining at this pitch.
- **Leonov's couch is 40 mm lower than Belyayev's**, not level with it: two men in Berkut suits do not lie abreast
  at 590 mm either, and one's shoulder goes under the other's arm. Nothing read says so.

### The Volga airlock (3KD)

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Where | on hatch No. 3, opposite hatch No. 1, which on a Vostok was the technological hatch with the Vzor's porthole | documented | S p. 448: "The Volga airlock on hatch no. 3 on the descent apparatus"; Z: "mounted on the exterior of hatch No. 3 ... the Vzor navigation window was built into the new hatch" |
| Its line | along hatch No. 3's: azimuth 315°, 21° toward the nose from square to the long axis | **estimated**, off a drawing | "The hatches", above: D-KD has that hatch at 20.8°, and Z's section has the folded ring square to it at 20°; RKK Energia's film frame has the airlock out at about 22°. **D-KD draws the folded airlock's own rings canted back from that line** (their axes 11.5° from the cross plane, by the same fitted ellipses, while their centres step out along the hatch's radial): not modelled, and whether it was packed so is not known. The pass before this one stood it on the Vostok model's hatch, at 15° |
| Length | 700 mm folded, 2,500 mm out | documented | S p. 449. Z: 740 mm; Pillet 73 cm; Wikipedia and Encyclopedia Astronautica 770 mm |
| Diameter | 1,200 mm outside, 1,000 mm inside | documented | S pp. 449 and 450. In the model the bands step in 6 mm each: 1,200 at the foot, 1,104 under the head; inside 904 to 1,000 |
| Hatches | 650 mm (S p. 450; Z's table) or 700 mm (Z's text; Woods), both opening inward | documented, disputed | the model's outer hatch is 700 mm and the hatchway from the cabin 650 mm: no source says they differed. "What the record fixes in the cabin" has the rest |
| Mass | 250 kg | documented | S p. 450 |
| Wall | a rubber bladder inside a cloth cover, with air beams running its length between them | documented | A p. 62: "longitudinal air beams in the form of inflatable rubber cylinders with a cover made of a high-strength fabric"; S p. 450 |
| Air beams | 40 drawn, as flutes 3 mm deep in the cover and the bladder | documented (40, in three sets); estimated (how they show) | S p. 450: "forty full-length partitions ... three independent sections; two were enough". G has 36. A photograph of an airlock without its cover shows the bladder fluted; the cover over it hangs in folds |
| Lower ring | 120 mm tall, 1,280 mm across its flange | estimated | A's section; the museum's article |
| Head | a ribbed aluminium ring 260 mm tall and 1,244 mm across, 24 ribs; the outer hatch's domed cover; a rail on six posts | documented (a rigid upper part with the hatch; a rail); estimated (every size, the ribs' number) | A p. 62: "an upper rigid portion with an EVA hatch"; Z: "crowned with a railing structure"; the museum's and the works' photographs |
| Bottles | four spheres 330 mm across at its foot | documented (four); estimated (their size and places) | S p. 450: "Four tanks at the base of the Volga carried pressurized air"; the museum's article. They are put round the side toward the nose, which is where the model's fairing has room for them |
| Camera | a cine camera in a white cover on a bracket at the head's rim, on the side toward the nose | documented (that there was one, on the rim, and that he took it in); estimated (its form and place) | S p. 450: "a third sixteen-millimeter camera was on a boom outward from the airlock"; Leonov's report; a photograph of an airlock without its cover |
| Ring left on the hull | 34 mm proud | documented | Kamanin, 26 February 1965: «Кольцо выступает над поверхностью корабля на 27 миллиметров»; 3 March: 27 to 40 mm after a normal firing |
| Colour | the cover a pale tan, the bladder cream, the head bare aluminium, the hatch's cover grey | estimated | the museum's article (tan cover with darker hoops); the works' photograph (cream). **What it looked like in orbit was not established** |

### Length

The published length is a round five metres and the drawings say more. D-KV is to scale (1:10) and
shows the whole ship; scaled by its sphere (313 pixels for 2,300 mm) it is 5.43 m from the braking
engine's nozzle to the reserve engine's face by one reading and 5.49 by another, and its sphere's
pole is 4.16 m from the nozzle, where the Vostok model has 4.18. So the Vostok's part of it agrees
with the drawing to half a per cent, and the rest is the reserve engine, which stands 1.3 m above
the pole and not the 0.6 that five metres would leave. The model follows the drawing and says so
wherever it quotes a length.

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in a flight's `flight.ts`.

| Node | Contains | Moves |
| --- | --- | --- |
| `DescentModule`, `EntryHatch`, `ParachuteHatch`, `Cabin`, `RetainingStraps`, `CableMast`, `InstrumentModule`, `Antennas`, `GasBottles`, `RetroEngine` | the Vostok's ([vostok-3ka.md](../../vostok/vehicles/vostok-3ka.md)), with hatches Nos. 2 and 3 at their own latitudes, less the housing on the pole and its three rods, the seat's rails, the cases laid out round the seat, the left-hand panel and the hand controller; in `Cabin`, the board where the 1961 fit has it and `ParachuteContainer`, this ship's own drum, a node with its origin in the middle of its mouth | as the Vostok's |
| `ReserveEngine` | collar and gussets, case, bands and bolts, the hatch, duct, boss and stubs | |
| `CouchLeft`, `CouchCentre`, `CouchRight` (3KV); `CouchLeft`, `CouchRight` (3KD) | each: `_Liner` (the pads), `_Pan` (the trough, its box and stampings), `_Frame` (rivets, the calf rest's rails and stays, the struts' rods), `_Struts`, `_Cradle` (the red beams), `_Belt`, `_Plate`; and the man the flight puts in it (`Crew_<place>_...`) with `Seat_<place>`, an empty at his eyes ("The couches as seats", below), built at detail 0.75 and above. On the 3KD `CouchLeft` is Leonov's, the middle one of the 3KV's three | |
| `Airlock` (3KD) | `Airlock_Body` (the lower ring, four bottles, their cradles and pipes); `Airlock_Tube_1` to `_9` (the soft tube's bands: cover, bladder, hoop); `Airlock_Head` (the ribbed ring, the rail, the camera) and under it `Airlock_OuterHatch`, hinged at its rim. Each a node with its origin where the airlock is made fast to the hull | built folded: a flight slides each band out 225 mm further than the one below and the head 1,800 mm, swings the outer hatch inward, and later slides the whole away along its line |
| `AirlockRing` (3KD) | the ring it stood on | stays |
| `AirlockHatch` (3KD) | the plate that closes hatch No. 3's opening down to the hatchway, its coaming and bolts; and `AirlockHatch_Lid`, a node with its origin on its hinge (the side toward hatch No. 2): the lid, its six cams, the Vzor's glass through it and the Vzor's body on its inner face | built shut: a flight swings the lid 100° into the cabin about the hinge's line (the ball's north at the hatch) |

## What the model gets wrong or leaves out

Everything [vostok-3ka.md](../../vostok/vehicles/vostok-3ka.md) lists for the shared parts, and:

- **The reserve engine is an outline.** How its gas left it is in nothing read. D-KV draws two
  nozzle-like bodies lying forward along it, canted out from the axis with their mouths toward the
  nose, and no text read explains them; none of the photographs shows them. They are not built, and
  the face carries the six stubs the test article's photograph shows.
- **The cabin is fitted, not drawn** ("The fit", above, which lists what contradicts it: the middle couch's
  displacement, the container's depth, the couches' height).
- **The couches are designed to the photographs, not surveyed**: no dimension of an Elbrus couch was found. The
  pad's line is the model figure's own under side. **They stand on struts where the real ones hung** on two shock
  absorbers, at the head and at the legs, tied by an equalising linkage (R): the struts are the right kind of thing
  in the wrong place, they do not move, and on the 3KD the couches are built in one position where the real ones flew
  low and were fired up under the parachutes.
- **No harness is built**, only the ends of a waist belt at each couch's sides. PR Фиг. 1 draws four straps to a
  round buckle; Belyayev's report has a harness that tightened easily.
- **The couches' line is tilted 24°**, because the Vostok seat's was, and that is an estimate of the Vostok
  model's. Neither general drawing shows the couches. PR Фиг. 1 has the outer two toed in; they are built parallel.
- **A suited man's helmet overhangs his couch's head end** by some 100 mm, there being no room beyond it.
- **The pilot's panel and the hand controller are not built.** The flown Voskhod 1 has the panel across the cabin
  just inside hatch No. 1's rim, toward the nose, with the controller in a recess at its end (P): in the model that
  place is empty. Nor are the 3KD's airlock panel, the television cameras and monitor (the monitor's frame trapped
  Leonov's leg when his couch rose), the three cine cameras' brackets by the inner hatch, the fans, the load strap.
- **Not built, for want of their form or their place**: the ion sensors of the new orientation
  system; the ion engines tried on Voskhod 1; the television camera outside the ship (S: "one on the
  outside of the vehicle that could be controlled by the crew"; Z: "on the exterior of the service
  module") and the one in the cabin (a grey box at the right of the entry hatch in Z's photograph);
  the survival kits; the landing probe; the braking rocket in the parachute lines and the second
  parachute, which are inside the container.
- **The parachute container is a plain drum**, though the real one was a walled compartment with a rescue manhole in its face (P) holding two main parachutes and the braking rocket, under white cloth inside the cabin. Its size is the fit's.
- **The sphere is the Vostok's foil**: Voskhod 1 under its fairing shows crinkled foil; the test
  articles are painted or in a cloth cover.
- **The airlock does not unfold; it is drawn out.** The real one was folded rubber and cloth that
  straightened as its air beams filled. The model's soft tube is nine bands that stand inside one
  another when it is folded and slide out one from the next, so that it tapers by 96 mm from foot
  to head and shows a step and a hoop every 235 mm; the museum's cover has three or four hoops.
- **The hatch into the cabin** is 650 mm in a plate of our own, its lid hinged on the side toward the container
  on Zak's one sentence. Its drive, the hand wheel, the oxygen hose and tether stowed on it and the cover over the
  Vzor's glass are not built. The lid opened with Leonov out of his couch; in the model it swings with both men lying
  in theirs, and clears Leonov's helmet by some 0.1 m.
- **The folded airlock is square to its hatch**, where OKB-1's drawing cants its rings back by 9° ("Its line").
- **Not built on the airlock**: its lamps, the two cine cameras and the panel inside it, the
  television cameras, the line and its three fastenings, the drives of its hatches, the locks that
  held it folded, the mechanism that shot it off.
- **The 3KD's extra air bottles** on the outside of the instrument module are not built: neither
  their number nor their place was found.
- **The Vzor on the 3KD is the 3KV's plain one made shorter** to stand on the lid: its real mounting was not seen (the trainer's lid is a plain disc).
- **The pack's place** in the 3KD is ours: the crew's report has it on a fastening in the cabin, and where is not found.
- **The antennas** are the Vostok model's ten, withdrawn into the hull when stowed.
- **Cabin equipment**: the Vostok's board, Vzor and parachute container only.
- **Sat in, the cabin is the plain one.** Each couch has an eye point (`Seat_Left`, `Seat_Centre`, `Seat_Right`: "The
  couches as seats", below) and the flights declare them with a cabin (`cabin.ts`): the lining, the two portholes of the
  hull to lean to, one lamp switched from the page. The board, the Globus and the Vzor are the Vostok's plain shapes,
  so nothing on them reads, lights or works, and the lamp has no switch of its own.

## The couches as seats

Each couch's node carries an empty at its man's eyes, `Seat_<Left|Centre|Right>`, for the gallery's "Sit in the cabin"
(the names are the couches' own, as `CouchLeft` and `Crew_Left_…` are: which man lay where is the flight's to say). It
is built from the seated figure and not from the cabin (`voskhod.seat_view`, from `figurelib.head_view`):

| What | Value | Confidence |
| --- | --- | --- |
| Where | midway between the figure's irises, as the flight's suit builds him in that couch (in the file's axes, metres, the 3KV: left 0.858, 3.304, −0.059; centre 0.262, 3.289, −0.262; right 0.059, 3.304, −0.858; the 3KD: left 0.301, 3.161, −0.266; right 0.062, 3.316, −0.861) | **derived** from the figure and the couch's place, which are both estimated |
| Which way it looks (the node's +Z in the file) | the way his own face is turned. The figure lies with his head straight on his shoulders, so that is out of his chest, square to the couches' line: -0.288, 0.914, 0.288 in the file's axes, which is toward the forward pole and 24° off the long axis, away from hatch No. 2 | **derived** from the figure's pose; the 24° is the couches' tilt, itself the Vostok seat's estimate |
| The top of his head (the node's +Y) | along the couch toward hatch No. 2, raised 24°: 0.646, 0.407, -0.646 | derived, as above |

What each man has before him, lying with his head at rest (stills taken from each eye point with the crew aboard;
distances and angles from his eyes to the middle of the board's face and of the Vzor's, off the way he looks):

- **By the entry hatch** (the right couch: Komarov on Voskhod 1, Belyayev on Voskhod 2): the lining over him; at the
  left edge of what he sees, the side of the parachute container, beside his left temple (92 mm from Komarov's cap,
  17 mm from the pivot of Belyayev's visor); low at his right, close, the ring of hatch No. 1 and its porthole. The
  board is 1.34 m off and 60° from where he looks, toward his feet and to his left, its face turned toward him:
  he reads it past the container with his head turned. The Vzor is 1.5 m off and 79° round: out of his sight without
  leaving the couch, which is what Belyayev found.
- **In the middle** (Feoktistov, Voskhod 1): the lining over him and nothing between; the board low at his left,
  0.79 m off and 43° from where he looks, its face square on to him as to nobody else; the ring of hatch No. 1 at his
  right. The container is behind his crown, out of sight. The Vzor is 77° round at his left, 0.9 m off, beyond the
  left-hand man.
- **By hatch No. 3** (the left couch of Voskhod 1: Yegorov): the lining over him; the board 0.79 m over his chest,
  32° from where he looks toward his feet, seen from under its lower edge, so that he reads it at a slant; the
  Vzor's body beside his left hip, 0.69 m off and 65° round; the container's side at the right edge of his view.
- **Leonov** (Voskhod 2, the couch that was the middle one): the lining over him; the board low at his left, 0.87 m
  off and 36° from where he looks; beyond it the lid of the hatch into the airlock with the Vzor on it, 0.82 m off
  and 69° round; Belyayev's shoulder at his right, a little above his own. The container is behind his helmet.

**So the board is at the crew's left**, as Siddiqi has it, and it is the middle and right-hand men it faces: it
hangs where the Vostok pilot's did, over what is now the left-hand man. The Vzor is at their left and square to
the way they lie, where none of them can put an eye to it from his couch.
