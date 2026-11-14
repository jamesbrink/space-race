# Voskhod: the 3KV and the 3KD

What [voskhod.py](voskhod.py) builds, and how far to trust each number. One module with two builds:
`build("3KV")`, three couches, flown as Voskhod 1; `build("3KD")`, two couches and the Volga airlock,
flown as Voskhod 2. A flight's `model/vehicle.py` chooses the build and puts its crew in the couches.

**A Voskhod is a Vostok 3KA altered, and so is the model.** What was the Vostok's is imported from
[../../vostok/vehicles/vostok_3ka.py](../../vostok/vehicles/vostok_3ka.py) and built by it, unchanged:
the sphere and its three hatches, the pressure hull and its lining, the instrument board and the
Vzor, the parachute container, the four straps and their lock, the cable mast, the instrument
module with its antennas, the bottle ring, the braking engine. **Every dimension of those, with its
confidence and what is wrong with it, is in [vostok-3ka.md](../../vostok/vehicles/vostok-3ka.md)**
and is not repeated here. The Vostok's module was given five options for this, each defaulting to
what it did before (`pole`, `technological`, `rails`, `stores`, `controls`), and the Vostoks' built
models are the same bytes as before. What is built here is what a Voskhod had instead of the
ejection seat and on top of the sphere.

That the shared parts *were* the same is partly documented and partly assumed:

| Part | Standing | Basis |
| --- | --- | --- |
| Sphere, 2.3 m | documented by drawing | OKB-1's general drawings of the 3KV and 3KD draw the Vostok's outline; the mass rose to 2.9 t |
| Three hatches, in the Vostok's places | documented by drawing | the same drawings show hatch No. 2 and No. 3 a quarter turn apart, in the forward half; the latitudes read off them (15° to 20°) are within the reading's error of the Vostok model's estimates |
| Instrument board and Vzor where the Vostok's were | documented | Siddiqi p. 412; the flown Voskhod 1 cabin, photographed from its entry hatch, has the board over the Vzor on the far wall |
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
| Couches' plane | the Vostok seat's, a quarter turn in it: the board and Vzor at the crew's left, hatch No. 1 at their right, their heads toward hatch No. 2 | documented (the quarter turn; the board at the left); derived (the rest) | Z: "rotated 90 degrees around the vertical axis of the spacecraft relative to the previous position of the ejection seat"; S p. 412: "The main instrument panel and the Vzor optical sight were located to the left side of the three couches instead of in front". The seat's plane (its 24° tilt) is the Vostok model's estimate, kept |
| Couches' places, 3KV | hip points 530 mm either side of the middle; the centre couch 160 mm forward of the others (toward the crew's chests) and 80 mm toward their feet | **estimated** | S p. 412: "side by side in a triangular shape, with the middle one raised forward". The amounts are what lets three figures of 1.70 m lie in a ball 2.17 m across inside its lining without touching each other, the lining or the parachute container |
| Couch | a pan 1.53 m long shaped to a man lying with his thighs raised 68° and his shins laid over at 88°, 430 mm wide under his trunk, lined; a sledge of two tubes under it; four sprung struts to the hull | **estimated** | no drawing or dimension of an Elbrus couch was found. Z's photograph of a 3KD cabin shows pads covered in grey-green cloth in pans of riveted aluminium; the line of the pan is the under side of the model's own seated figure |
| Couch travel | 200 to 300 mm | documented, disputed | S p. 412; K has 20 to 40 mm. Not modelled: the struts do not move |
| Pose | hips 68°, knees 88° | estimated | chosen to fit the ball |

### The Volga airlock (3KD)

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Where | on hatch No. 3, which on a Vostok was the technological hatch with the Vzor's porthole | documented | S p. 448: "The Volga airlock on hatch no. 3 on the descent apparatus"; Z: "mounted on the exterior of hatch No. 3 ... the Vzor navigation window was built into the new hatch" |
| Its line | along hatch No. 3's: azimuth 315°, 15° toward the nose from square to the long axis | **estimated** | the Vostok model's hatch, which is an estimate. D-KD, read twice, has the folded airlock leaning 20 to 27°; Woods's drawing and the Soviet poster show a like lean. The hatch was left where the Vostok's model has it |
| Length | 700 mm folded, 2,500 mm out | documented | S p. 449. Z: 740 mm; Pillet 73 cm; Wikipedia and Encyclopedia Astronautica 770 mm |
| Diameter | 1,200 mm outside, 1,000 mm inside | documented | S pp. 449 and 450. In the model the bands step in 6 mm each: 1,200 at the foot, 1,104 under the head; inside 904 to 1,000 |
| Hatches | 650 mm (S) or 700 mm (Z; Woods), both opening inward | documented, disputed | the model's outer hatch is 700 mm; the hatch into the cabin is the Vostok's 1 m cover |
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
| `DescentModule`, `EntryHatch`, `ParachuteHatch`, `Cabin`, `RetainingStraps`, `CableMast`, `InstrumentModule`, `Antennas`, `GasBottles`, `RetroEngine` | the Vostok's ([vostok-3ka.md](../../vostok/vehicles/vostok-3ka.md)), less the housing on the pole and its three rods, the seat's rails, the cases laid out round the seat, the left-hand panel and the hand controller | as the Vostok's |
| `ReserveEngine` | collar and gussets, case, bands and bolts, the hatch, duct, boss and stubs | |
| `CouchLeft`, `CouchCentre`, `CouchRight` (3KV); `CouchLeft`, `CouchRight` (3KD) | each: liner, pan, sledge and posts, struts; and the man the flight puts in it (`Crew_<place>_...`), built at detail 0.75 and above | |
| `Airlock` (3KD) | `Airlock_Body` (the lower ring, four bottles, their cradles and pipes); `Airlock_Tube_1` to `_9` (the soft tube's bands: cover, bladder, hoop); `Airlock_Head` (the ribbed ring, the rail, the camera) and under it `Airlock_OuterHatch`, hinged at its rim. Each a node with its origin where the airlock is made fast to the hull | built folded: a flight slides each band out 225 mm further than the one below and the head 1,800 mm, swings the outer hatch inward, and later slides the whole away along its line |
| `AirlockRing` (3KD) | the ring it stood on | stays |
| `AirlockHatch` (3KD) | the cover of hatch No. 3, with the Vzor's porthole | |

## What the model gets wrong or leaves out

Everything [vostok-3ka.md](../../vostok/vehicles/vostok-3ka.md) lists for the shared parts, and:

- **The reserve engine is an outline.** How its gas left it is in nothing read. D-KV draws two
  nozzle-like bodies lying forward along it, canted out from the axis with their mouths toward the
  nose, and no text read explains them; none of the photographs shows them. They are not built, and
  the face carries the six stubs the test article's photograph shows.
- **The couches are designed, not surveyed**: their line is the model figure's own under side, their
  frame and struts are the right kind of thing, and the struts stand square to the couches' plane
  for want of anything better. No harness is built.
- **The couches' plane is tilted 24°**, because the Vostok seat's was, and that is an estimate of
  the Vostok model's. D-KV and D-KD do not show the couches.
- **The controls that were moved to the crew are not built**: "The communications console was moved
  to a new position and a 'joy stick' for the attitude control was also moved" (Z). Where to was
  not found. The Vostok's left-hand panel and hand controller are left out with the seat they
  belonged to.
- **Not built, for want of their form or their place**: the ion sensors of the new orientation
  system; the ion engines tried on Voskhod 1; the television camera outside the ship (S: "one on the
  outside of the vehicle that could be controlled by the crew"; Z: "on the exterior of the service
  module") and the one in the cabin (a grey box at the right of the entry hatch in Z's photograph);
  the survival kits; the landing probe; the braking rocket in the parachute lines and the second
  parachute, which are inside the container.
- **The parachute container is the Vostok's**, though it now held two main parachutes and the rocket.
- **The sphere is the Vostok's foil**: Voskhod 1 under its fairing shows crinkled foil; the test
  articles are painted or in a cloth cover.
- **The airlock does not unfold; it is drawn out.** The real one was folded rubber and cloth that
  straightened as its air beams filled. The model's soft tube is nine bands that stand inside one
  another when it is folded and slide out one from the next, so that it tapers by 96 mm from foot
  to head and shows a step and a hoop every 235 mm; the museum's cover has three or four hoops.
- **The airlock leans too little.** It stands on the Vostok model's hatch No. 3, 15° toward the
  nose; OKB-1's drawing has 20 to 27°. So the folded airlock reaches 1.84 m from the long axis
  where the drawing has 1.66, and the fairing's blister is larger than it need have been.
- **The hatch into the cabin is the Vostok's cover**, a metre across: the real opening was 0.65 or
  0.7 m in a new cover that swung inward, and its hinge and drive were not found.
- **Not built on the airlock**: its lamps, the two cine cameras and the panel inside it, the
  television cameras, the line and its three fastenings, the drives of its hatches, the locks that
  held it folded, the mechanism that shot it off.
- **The 3KD's extra air bottles** on the outside of the instrument module are not built: neither
  their number nor their place was found.
- **Which couch the 3KD lost** is from a NASA diagram and from where the hatch's cover swung.
- **The antennas** are the Vostok model's ten, withdrawn into the hull when stowed.
- **Cabin equipment**: the Vostok's board, Vzor and parachute container only.
- **No seat to sit in.** The couches and the men in them are modelled, but no couch has an eye-point node, so the
  gallery offers no seat (it does not make one up). What is wanted, for each man, is a `Seat_<Left|Centre|Right>` node at
  his eyes (between `Crew_<side>_Helmet_Eyes`), its +Z the way he looks and +Y the top of his head, as
  vehicles/gemini_cabin.py does; then `seats` (with `hide`: his `Crew_<side>_Helmet_*`) and a `cabin` (`within`, the
  portholes, the Vzor if the fit has one, the lamp) in each flight's flight.ts.
