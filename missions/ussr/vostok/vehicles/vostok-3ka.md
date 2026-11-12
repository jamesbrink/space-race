# Vostok 3KA

What [vostok_3ka.py](vostok_3ka.py) builds, and how far to trust each number. The spacecraft type
shared by the six crewed Vostoks; a flight's `model/vehicle.py` chooses what its own carried (today:
the pilot's height and what is painted on his helmet).

The model is in **millimetres**, the unit of every Soviet figure quoted. Station 0 is the exit plane
of the braking engine's nozzle and +Z is toward the descent module, which rode forward under the
fairing. Azimuths are about +Z from the model's +X; latitudes are on the sphere, above the plane
square to the long axis through its centre. The azimuth origin is ours: the entry hatch is put at
135° so that the viewer's cutaway shows the pilot side on.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. Almost everything about
this spacecraft's shape beyond five published dimensions is estimated: no dimensioned drawing of
OKB-1's has been read, only RKK Energia's published cutaway, which carries three dimensions.

## Sources, in short

Keys used below; full entries are in [docs/sources.md](../../../../docs/sources.md), "Vostok".

- **S**: Siddiqi, *Challenge to Apollo*, NASA SP-2000-4408 (pp. 195 to 197 for the design).
- **K**: the Soviet encyclopedia text «Космические корабли "Восток"» as carried by sovkos.ru.
- **E**: bibliotekar.ru's unsourced text of the same kind: tertiary, used only where nothing else speaks.
- **D**: RKK Energia's cutaway of the 3KA with dimensions 5040, Ø2300 and Ø2500.
- **N**: NASA's seating cutaway (Wikimedia Commons, *Vostok cutaway crew seating*).
- **Ka**: photographs of the full-size article at the Tsiolkovsky museum, Kaluga.
- **F**: the flown descent module of Vostok 1 at the RKK Energia museum, photographed.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Descent module, outer diameter | 2,300 mm | documented | S p. 195; K: «включая теплозащиту ... диаметром 2,3 м»; D: Ø2300. (E prints 2,430, which is the spacecraft's greatest diameter) |
| Pressure hull diameter | 2,200 mm | documented | K: «(диаметр 2,2 м)»; E |
| Heat shield thickness | 50 mm all round in the model | estimated | the difference of the two diameters. Really uneven: 30 to 180 mm (E), or "just over three and eleven centimeters" (S), thickest on the side that meets the air |
| Instrument module, greatest diameter | 2,430 mm | documented | S p. 195; K |
| Instrument module length | 2,250 mm | documented | K, E, S. The model's hull is 2,130 mm from the nozzle to the rim of its forward dish and 2,234 mm to the top of the support ring: which the figure measures is not stated |
| Length without antennas | 4,400 mm | documented | S p. 195; K: «длина (без антенн) 4,4 м». Taken as nozzle exit to the top of the housing on the forward pole, which is what D scales to |
| Housing on the forward pole | 220 mm tall, 460 mm across its base | estimated | D (scales to about 250 mm) |
| Sphere's centre | station 3,030 | derived | 4,400 less the housing and the radius. D scales to about 3,050 |
| Frame at the greatest diameter | stations 1,200 to 1,280 | estimated | D (about 1,180 from the aft end) |
| Forward cone | 2,430 mm down to 1,980 mm across over 600 mm (20.6° from the axis) | estimated | D and Ka: its top is about 0.8 of the greatest diameter, 0.6 to 0.7 m above the frame |
| Aft cone | 2,430 mm down to 600 mm across over 950 mm (43.9° from the axis) | estimated | D (about 43°) |
| Forward end | a dish of 1,300 mm radius under the sphere | estimated | K: «вогнутую сферическую оболочку» (that it is a dish); its radius is ours |
| Support ring | lightening holes; meets the sphere 1,660 mm across | estimated | Ka |
| Gas bottles | 14, in 16 places on a ring 2,080 mm across; each 330 mm | estimated | **Count disputed**: 14 (E), 16 (a snippet only), 12 (Wikipedia, uncited). Ka and D show 14 to 16. The gap for the cable mast is from Ka; the second gap is put opposite it. Size off D (about 300 mm) and Ka |
| Hatches | three, 1,000 mm in the clear | documented | S p. 195; K: «три люка диаметром "в свету" 1 м» |
| Hatch No. 1's bolts | 30 | documented | S, on the launch morning: "removed all thirty screws in the hatch". The same number is drawn on the other two |
| Hatch places | No. 1 over the pilot's head on the rails' line; No. 3 opposite, beyond his feet; No. 2 between them at his left | documented, as to which is where | E: «Входной люк (N1) находится "над головой" космонавта, а технологический (N3) - "под ногами"», «Слева от кресла расположен парашютный контейнер (люк N2)» |
| Hatch latitudes | No. 1: 24°; No. 2: 30°; No. 3: 15° | estimated | K says only that all three are in the upper part of the hull. No. 1's is the rails'; No. 3's puts the Vzor where D has it (about 19°) |
| Portholes | three; clear glass 200 mm | documented (three, two of them in hatch covers); estimated (size, places) | K: «три иллюминатора, два из которых размещены на крышках люков»; S. Encyclopedia Astronautica says two. Gagarin names "the porthole opening of hatch Nº 1" and "the right porthole" |
| Seat rails | 24° above the cross plane (the seat's back 66° from the long axis) | estimated | N and D |
| Retaining straps | four, meeting in one lock at the forward pole; 70 mm wide | documented (four, one lock); estimated (width, colour) | S p. 279: "four metal strips that came together in a single lock". Olive as on Ka |
| Antennas on the straps | four hairpins, 900 mm, standing along the axis | documented (that the command link's antennas are on the straps); estimated (shape, size) | K: «антенны командной радиолинии (установлены на металлических лентах ...)». Shape from Ka; D draws them as closed loops of equal legs |
| Cable mast | a duct from the forward cone to a plate of sockets at 40° latitude | estimated | Ka; the socket plate from F |
| Radiator shutters | 16 bays of 14 slats | estimated | D and Ka show bays of shutters; the counts are ours |
| Attitude jets | 16: eight blocks of two on the frame | documented (two sets of eight, 1.5 kgf); estimated (where) | S p. 197; K |
| Antennas on the instrument module | ten modelled: a fan of three by the frame, three long whips from beside the engine, four ribbon antennas standing aft | estimated | S p. 197 counts eleven (3 Signal, 4 Zarya, 2 telemetry, 2 command link); D shows these ten and which system each serves is not known to us |
| Sun sensor | one, on the forward cone | documented (one); estimated (where, its shape) | Gagarin: "the central sensor" |
| Braking engine | nozzle exit 280 mm across; four steering nozzles | estimated (sizes); documented (one chamber and four) | Encyclopedia Astronautica: "Chambers: 1 + 4"; the installation 1.13 m tall and 0.95 m across |
| Propellant tank | a torus 950 mm across round the chamber | estimated | drawn to the installation's stated diameter; its real form has not been read |
| Pilot | 1,570 mm | estimated | the flight's script |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in a flight's `flight.ts`.

| Node | Contains | Moves |
| --- | --- | --- |
| `DescentModule` | the sphere under its insulation, hatch No. 3 with the Vzor's porthole and hood, the right porthole, the three hatch coamings, the cable mast's socket plate, the strap lock and the housing on the pole with its three rods | |
| `EntryHatch` | hatch No. 1: shield, pressure skin, rim, 30 bolts, porthole | slides out along the rails' line |
| `ParachuteHatch` | hatch No. 2 | slides out along its own axis |
| `Cabin` | pressure hull; and for the cutaway its lining, the seat's guides, instrument board with the Globus, left panel, hand controller, Vzor, two television cameras, equipment, the parachute container | |
| `EjectionSeat` | seat, firing mechanisms, parachute and survival packs, oxygen bottles, and the pilot (built at detail 0.75 and above) | slides out along the rails |
| `RetainingStraps` | `Strap_1` to `Strap_4`, each a node hinged at its foot on the support ring, with its tensioner, lock fitting and antenna | each swings outward about its foot |
| `CableMast` | `CableMast_Arm`, hinged on the forward cone: duct, cables, plug | swings outward about its foot |
| `InstrumentModule` | both cones, the frame, support ring, shutters and their frames, jets, valves, covers, Sun sensor; the instrument frame inside | |
| `Antennas` | `Antenna_1` to `Antenna_10`, each a node with its origin at its root: the fan of three (1 to 3), the long whips (4 to 6), the ribbons (7 to 10) | built out, or with `stowed` each drawn back into the hull by `STOWED`'s vector, for a flight to slide out |
| `GasBottles` | 14 bottles with their bands, cradles, valves and the main that joins them | |
| `RetroEngine` | skirt, chamber, nozzle, four steering nozzles; the tank, its pressure bottle and the turbopump inside | |

## What the model gets wrong or leaves out

- **The shape of the instrument module is scaled off one published cutaway and photographs.** Its
  two diameters and overall lengths are documented; every station between them is not.
- **The heat shield is the same thickness everywhere** and is not modelled as a solid: between the
  insulation and the pressure hull the cutaway shows a gap. The real shield was thickest on the
  side that met the air, which is also why the ball's weight was not at its centre.
- **The sphere's surface is plain.** In orbit it wore blankets of insulation faced with foil, laid
  in gores with seams and a band round it (photographs of assembly); none of that is drawn. The
  colour and gloss are judged from the Kaluga article.
- **Hatch latitudes, porthole places and sizes are estimated**, as the table says. The right
  porthole in particular is placed only by Gagarin's calling it "right", "rear" and "far away".
- **Fourteen bottles is one source's count.** Which hold nitrogen and which oxygen is not modelled.
- **One antenna of the eleven is missing**, and those drawn are placed from one drawing and two
  sets of photographs that do not wholly agree: the hairpins are canes with a short return leg
  (Kaluga), where RKK Energia's drawing has closed loops.
- **The antennas do not fold.** Under the fairing they were folded against the hull; how has not
  been found. `build(stowed=True)` draws the instrument module's ten withdrawn into the hull along
  their own lines (the ribbons straight forward), by distances chosen only so that each stays
  inside the hull or the adapter under it, and a flight slides them out. The two whips and the rod
  on the forward pole, and the hairpins on the straps, fit under the fairing as they are and are
  left out.
- **The pilot is a plain figure**: lofted limbs, a ball of a helmet with a dark visor and no face,
  no harness, hoses or communications cap. He is not built to the jointed-figure contract
  (`srlib.FIGURE`), so he cannot be walked as. The SK-1's own record (`crew/`) is not written.
- **The seat is a few slabs and tubes.** Its real structure, its two solid rockets, the stabilising
  parachute and the survival pack are stood in for by boxes in about the right places.
- **Cabin equipment is boxes.** The board has a globe and five dials; the left panel, the hand
  controller, the Vzor, the cameras and the parachute container are in the places the sources
  give or imply. The food locker, radio, regeneration unit and sanitary system are not told apart.
- **Inside the instrument module** the instrument frame, the tank and the turbopump are
  representative: the right kinds of thing, not a survey.
- **The straps' travel and the cable mast's swing are ours.** That the straps let go at one lock
  and stay with the instrument module is documented; how far they sprang is not.
- **Lightening holes in the support ring are square.**
- **No lettering or markings.** None has been found for the flown article.
