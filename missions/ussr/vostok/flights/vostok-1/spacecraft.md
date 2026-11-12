# Vostok 3KA No. 3, as flown on 12 April 1961

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension, with its
confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 3 and to this flight, how the model
was checked, and where it still disagrees with what it was checked against.

It is shown **as in orbit**: antennas out, the four straps and the cable mast holding the two
modules together, the sphere under its foil-faced insulation. The charred brown ball in the RKK
Energia museum is the same sphere after entry, with the insulation and most of the shield gone.

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. The same labels are in
[flight.ts](flight.ts).

## The figures that matter most

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length without antennas | 4.4 m | documented | Siddiqi p. 195; the Soviet encyclopedia text. Built: 4.400 m |
| Greatest diameter | 2.43 m | documented | Siddiqi p. 195. Built: 2.430 m (2.47 m over the frame's flange) |
| Descent module | 2.3 m sphere; 2.2 m pressure hull | documented | as above |
| Instrument module length | 2.25 m | documented | built 2.13 m to the dish's rim, 2.23 m to the support ring's top |
| Hatches | three, 1 m in the clear | documented | Siddiqi p. 195 |
| Mass in orbit, this flight | 4,725 kg | documented, from a secondary source | Encyclopedia Astronautica and others; its origin has not been read. The type: 4.73 t (Siddiqi) |
| Descent module / instrument module mass | 2,460 kg / 2,270 kg | documented, for the type | Siddiqi p. 195. No. 3's own have not been found (No. 1's descent module: 2,452 kg, RussianSpaceWeb) |
| Seat with pilot | about 335 kg | derived | 7.1% of launch mass (the encyclopedia text). Siddiqi's "ejection seat weighing 800 kilograms" does not fit it and is not used |
| Braking engine | 1,614 kgf, 45 s at most, 280 kg of propellant | documented | Siddiqi p. 197. Other figures: 1,600 kgf; 275 kg |
| Attitude jets | 2 sets of 8, 1.5 kgf, nitrogen | documented | Siddiqi p. 197 |

## What is particular to No. 3 in the model

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pilot's height | 1.57 m | estimated | Gagarin is widely given as 157 cm; no primary record read |
| Helmet lettering | СССР, red, on the brow of a white helmet | documented (that it was there, and painted on that morning); estimated (size, place) | Siddiqi, The Space Review 2015, photograph caption |
| Suit | orange cover over the pressure suit | documented | Gagarin's report: "the orange and gray outer layer"; the pressure garment under it was light blue |
| Television | two cameras | documented (two); estimated (where) | Siddiqi p. 196. The report calls the system "Tral-T with Seliger cameras", Siddiqi "Topaz" |

Nothing else is known to us to have differed from the type on this flight; differences from the
later Vostoks will be recorded when those are built.

## How it was checked

Side by side with, in order of weight:

1. **RKK Energia's cutaway of the 3KA** (dimensions 5040, Ø2300, Ø2500). The model's stations were
   scaled from it: the sphere's centre, the frame, the forward cone's top, the aft cone's angle,
   the housing on the pole, the seat's tilt, the Vzor's place, the antennas on the instrument module.
2. **The full-size article at the Tsiolkovsky museum, Kaluga** (Wikimedia Commons, *Vostok-1
   Spacecraft 01* and *02*): the bottle ring with its gap at the cable mast, the support ring's
   lightening holes, the straps and their colour, the hairpin antennas, the mast's duct and plug,
   the covers and fittings on the forward cone, the shutters.
3. **The flown descent module** at the RKK Energia museum (Commons, *Vostok1 descent module*): the
   hatch opening and its ring of screw holes, the socket plate, the lining's colour.
4. **NASA's seating cutaway** (Commons, *Vostok cutaway crew seating*): the seat across the ball
   and the pilot's pose.
5. The 1:3 mock-up at the Memorial Museum of Cosmonautics and the model with its third stage shown
   in Frankfurt in 2002 (Commons): the general arrangement only; both are models.

## Where it still disagrees

- **The bottle ring.** Fourteen bottles in sixteen places, 330 mm each. The Energia drawing's
  bottles scale to about 300 mm and sit touching; Kaluga's look larger and nearly touch. Neither
  settles the count, and the sources say 12, 14 and 16.
- **The hairpin antennas.** Canes with a 380 mm return leg, as at Kaluga. The Energia drawing has
  closed loops of equal legs about 950 mm long and 150 mm wide, on the sphere and on the aft cone.
- **The antennas on the instrument module.** Ten of Siddiqi's eleven, placed from the one drawing:
  a side view, so their azimuths are ours.
- **The frame.** The drawing dimensions Ø2500 over the fittings at the frame; the model's fittings
  stand out to about 2.6 m (the jets' blocks).
- **The sphere's surface.** Smooth metal. The assembly photograph shows quilted, gored blankets
  with a band; Kaluga's is dull painted metal with rivet lines.
- **Portholes.** Sizes and places are estimated; the right porthole's most of all.
- **The housing on the pole** scales to about 250 mm in the drawing; 220 mm is built, to keep both
  the 4.4 m length and the frame's station.

What the model simplifies or leaves out as a type is listed in
[vostok-3ka.md](../../vehicles/vostok-3ka.md), "What the model gets wrong or leaves out". For this
flight in particular:

- **No launch configuration.** The fairing, Block E and its adapter are not built, and the
  antennas do not stow.
- **Nothing after separation of the modules.** The descent module's look during and after entry
  (insulation gone, shield charred, hatches off, the antennas burned away) is not modelled.
- **The seat does not leave as it flew.** On show it slides out along its rails; the flown
  sequence (hatch, then the seat on two rockets, a stabilising parachute, the pilot leaving the
  seat at 4 km) waits for the simulator.

## Level of detail

| Level | Triangles | Meshes |
| --- | --- | --- |
| Full (1.0) | 128,280 | 68 |
| 0.6 | 67,901 | 49 |
| 0.3 | 42,074 | 50 |

Freedom 7's capsule alone, for comparison, is about 265,000, 95,000 and 57,000. The clearance check
passes at all three.
