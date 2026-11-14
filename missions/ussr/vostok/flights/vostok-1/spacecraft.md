# Vostok 3KA No. 3, as flown on 12 April 1961

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension, with its
confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 3 and to this flight, how the model
was checked, and where it still disagrees with what it was checked against.

It is built as it rode under the fairing, on Block E's adapter, with the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone
and before anything of its own moves it is **as in orbit**: antennas out, the four straps and the
cable mast holding the two modules together, the sphere under its foil-faced insulation. The charred brown ball in the RKK
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
| Pilot's height | 1.65 m | documented | 165 cm in his service record of 1960, published by the Russian Ministry of Defence (Komsomolskaya Pravda, 12 April 2024). 157 cm is widely printed, with no document behind it that was found |
| Helmet lettering | СССР, red, on the brow of a white helmet | documented (that it was there, and painted on that morning); estimated (size, place) | Siddiqi, The Space Review 2015, photograph caption |
| Suit | orange cover over the pressure suit | documented | Gagarin's report: "the orange and gray outer layer"; the pressure garment under it was light blue |
| Television | two cameras | documented (two); estimated (where) | Siddiqi p. 196. The report calls the system "Tral-T with Seliger cameras", Siddiqi "Topaz" |

Nothing else is known to us to have differed from the type on this flight; differences from the
later Vostoks will be recorded when those are built.

## Cabin

What [vostok_cabin.py](../../vehicles/vostok_cabin.py) fits in the cabin (`vostok_3ka.build(fit="1961")`), in place
of the plain board, panel, grip and sight the type has otherwise: the pilot's information display system SIS-1-3KA
of the Flight Research Institute's laboratory 47 (Darevsky), delivered for this ship in December 1960. Places are
given from the sphere's centre as (left, head, up), millimetres: toward the pilot's left, level toward hatch No. 1
over his head, and up the long axis.

**How it was laid out.** Zak's photograph of the flown cabin through hatch No. 1 (RussianSpaceWeb, *sa_interior*)
is taken square to the long axis: the opening's ellipse is 0.87 as tall as wide, which is the cosine of 30°, and the
hatch's line is 24° up in the model. Read so, the Vzor's middle is some 200 mm lower than the hatch's, which is
where a porthole at 15° has it; the board's middle is 490 mm higher than the Vzor's; the black panel's raked side
stands 275 to 420 mm to the left, from 70 to 520 mm higher than the Vzor; the hand controller 430 mm to the right
and 120 mm higher. Depth along the line of sight is not in one photograph, so every place below is **estimated**,
and each was then held to what else is in the cabin (the lining, the parachute container, the pilot's reach). A
period photograph over the pilot's helmet (vostoksupersite, uncaptioned: flight or trainer unknown) has the same
order down the forward wall: board, camera with its lamp at the left, Vzor.

| Thing | What is built | Confidence | Basis |
| --- | --- | --- | --- |
| Instrument board PD-1-3KA | 400 × 350 mm, 86 mm deep, its lower edge notched between the clock and the lowest gauge; middle at (0, −520, 720), face at 45° to the long axis | estimated (size, place); documented, second hand (45°, "within 1,000 mm of the pilot": the model has it 1,064 mm from his eyes) | Tyapchenko, fig. 12 (the factory's photograph, numbered) and fig. 1; size "approximately 40 by 38 cm" (vostoksupersite), 40 by 33 scaled off a museum board square on: between the two; the angle from the installation drawing as vostoksupersite quotes it |
| Globus (IMP) | plate 232 × 215 mm; a globe 127 mm across standing in a window 100 mm across under a crystal with a cross; correction window reading 510; the switch С, П, Л «КОРРЕКЦИЯ»; knobs Э and О; a window over the globe | documented (what is on it, by Tyapchenko's photograph; 510 by the transcript: «В окне коррекции цифра 510»); estimated (every size; the globe's 127 mm is the Voskhod instrument's) | Tyapchenko figs 12 and 16; the transcript of 12 April. **No latitude and longitude drum and no orbit counter**: those are later ships' (Tyapchenko), and Gagarin read 63° N, 97° E off the globe itself. The model's globe is plain sea with a graticule every 30°; the viewer paints the land on it from the globe's map |
| Clock (IVK) | 78 mm face, twelve hours with hour, minute and second hands that run on Moscow time; crowns at three and six o'clock | documented (that it is there, twelve hours, the crowns); estimated (size, face) | Tyapchenko fig. 15; vostoksupersite. Its ring of flight time, its dial of days and its descent index are strokes that do not run |
| Three gauges of three needles | 62 mm faces: cabin air (pressure 0 to 1.5 atm, humidity 30 to 90 %, temperature 0 to 40 °C); cabin gas (carbon dioxide 0 to 4 %, oxygen 0 to 40 %, the instrument module's pressure 0 to 2 atm); pressures (manual orientation 0 to 200 atm, the TDU's bottle 0 to 360, automatic orientation 0 to 200) | documented (which nine quantities, the ranges, by the board of a later Vostok at the Armed Forces Museum: Commons, *Vostokpanel.jpg*); estimated (size, where each scale's ends stand) | Each needle is built at what Gagarin read before launch where the transcript has it: 1.0, 65 %, 19 °C; 1.2; 155, 320, 155. Carbon dioxide and oxygen have no reading in the record and stand at 0 and 21. Tyapchenko's caption calls the gas gauge's third needle the oxygen bottle's pressure; the transcript's "отсек 1,2" is followed |
| Signal lamps | three blocks down the right side, two columns: 10, 10 and 4 lenses, each its own node; red and amber in the first, amber and green in the second, green in the third | documented (three blocks, 5 × 2, 5 × 2, 2 × 2); **estimated** (colours); the legends are not lettered | Tyapchenko fig. 12. The words are a reconstruction (vostoksupersite, from RGANTD's 2011 volume, with doubts of its own) and which lens says which is not established: the flight's data gives each block's words and no lens its own |
| Radiation and voltage indicators | none | | none is on the board in any source or photograph read |
| Vzor | on hatch No. 3's porthole: bezel 300 mm, a ring of eight ports, a screen 160 mm across ruled with seven lines and three arrows | documented (a ring that shows the horizon and a ruled, arrowed screen: Tyapchenko; eight ports: Encyclopedia Astronautica, tertiary); estimated (sizes, off Zak's photograph, give or take 15 %; the rulings) | The screen is `Vzor_Screen` and the ring `Vzor_Ring`: the viewer draws the outside on them ("The cabin in flight") |
| Control panel PU-1-3KA | black, 330 × 470 × 75 mm, its face to the middle of the cabin at (270, −558, 460), its side toward the pilot's head raked 30° | documented, second hand (size "47 × 33 × 7.5 cm", the rake: vostoksupersite); estimated (place) | Tyapchenko figs 5 and 7. As far toward the pilot as the parachute container lets it come; its raked side is 760 mm from his left shoulder, which is a full reach |
| its face | six rows as the factory's photograph reads: ТЕПЛЕЕ–ХОЛОДНЕЕ, ГАЗОАНАЛИЗАТОР; ГЛОБУС, ДАВЛЕНИЕ ОРИЕНТАЦИИ; КОНТРОЛЬ ЛАМП, ПОДСВЕТ, ШТОРКИ; ПЕРЕДАТЧИКИ, ЗВУК, СВЕТ ТЕЛЕВИД., ОСВЕЩЕНИЕ; МАГНИТОФОН, ТЕЛЕФОНЫ; ЛАРИНГ./МИКРОФОН, ГРОМКОСТЬ | documented (the groups and their order); estimated (each control's place within its row, and its kind where the photograph is too small: 14 tumblers, 3 buttons, 6 knobs and a lever are built; another count of the same photograph gives 11 tumblers, 3 rotary switches and 4 knobs) | Tyapchenko fig. 5. `Ctl_Lighting` is the lamps' tumbler |
| its raked side | a slot for the code's plug, six keys in one column (`Ctl_Code1` to `6`), and under a clear cover manual orientation, descent III, the braking engine's start (red), oxygen and the alarm | documented (what is there; six keys, not nine); estimated (places; the keys in one column as the photograph has them, where the drawing staggers them) | Tyapchenko figs 4, 5, 7. The code: 1-2-5 (Gallay), 1-4-5 (Kamanin) |
| Hand controller RU-1A | a domed box 95 mm square, a stalk on a ball, a ribbed grip 110 mm long across it; at (−400, −150, 330) | documented (its form, by the factory's photograph; "two-axis"); estimated (sizes, off a later RU-1B; place: 546 mm from his right shoulder) | Tyapchenko fig. 1 |
| Television | a plain case with a lens under the board's lower edge, a round lamp at its left; a plain barrel at his right | documented (two cameras; one under the board with a lamp beside it, by the period photograph); estimated (every size and form) | Siddiqi p. 196; the period photograph |
| Cabin lamps | two round fittings high on either side, worked by ОСВЕЩЕНИЕ: off, duty, working | documented (the switch and its three positions); **estimated** (that there were two, and where) | Tyapchenko fig. 5 |
| Receiver | a case with a tuning scale, two knobs and a round clock, at (−455, −455, 470) | documented ("at the right": a broadcast receiver, an electric clock); estimated (its form and place) | Siddiqi p. 196; vostoksupersite names the ZB-17 and the AChS-1 |

### The cabin in flight

What the instruments do on the flight deck and in the scene (flight.ts `vehicle.cabin`; viewer/cabin.ts):

| Thing | What it does | Confidence | Basis |
| --- | --- | --- | --- |
| Globus | turns so the point under the ship stands under the cross and its way over the ground runs up the board; land and sea from the globe's own map in two tones | documented (that it turned all the time to show the present place under a fixed cross, started at the separation, read to some 300 km; two knobs in the planes of the equator and the orbit; a three-figure period setting); **derived** (the turn, from the run's own place and motion); estimated (that the track runs up the board; the map's tones) | Ponomareva; Tyapchenko fig. 16; Gagarin's report and the transcript («Первый пилотируемый полёт», 2011, vol. 1). The real one ran from its setting and drifted; this one is the instrument working perfectly. Not here: the landing-place mode (the tumbler «Глобус» on the panel threw the globe on to where a burn now would land): no node for the tumbler. The window reads 510 (one print of the transcript); the archive's print has 710 |
| Vzor | the centre shows the outside along the porthole's axis over a field of 7°; the ring shows what lies 70° to 79° off the axis, angle growing outward, each port at its own bearing, so the horizon stands in every port alike only with the axis on the Earth's centre; the ground runs toward the arrows with the long axis along the track, nose back (the braking attitude); the deck's predicted path is not seen in it | documented (a mirror ring showing the horizon from 150 to 350 km up, a centre of direct sight with arrows for the ground's run in the braking attitude: Tyapchenko; eight windows, the even ring, the arrows: Ponomareva, Gagarin; the centre's 7°: Gagarin); derived (the horizon 71.4° to 77.7° off the nadir over those heights); estimated (the ring's margins a degree and a half beyond them; the straight map of angle to radius; which way the arrows point) | The axis is the model's porthole's, square to the hull 15° toward the nose (that latitude is estimated: vostok-3ka.md), so with the axis on the Earth's centre the long axis is 15° off level and the braking engine's push 15° below the horizontal: the deck's "Off retrograde" reads 15. Not drawn: the mirrors' own optics (two ring reflectors, a filter and a ruled glass, an inner ring at 5° to 7°, parallax when the head moves: Titov), the filter and blind, and the arrows lit for the jets in manual control |
| Signal lamps | three light on the record's events, each on a lens of its colour: «Приготовиться к катапультированию» (red, TS1_6) from the modules' parting to the ejection; «Ориентация по Солнцу» (amber, TS2_1) from the solar orientation to the braking command; «Спуск-I» (green, TS2_5) from the timer's first descent command (56 minutes after the separation) to the modules' parting. The other 21 stay dark and say so | documented (the legends, their colours and when Gagarin saw each lit: his report, the transcript; the plan's 32 and 56 minutes); **estimated** (which lens carried which legend: not in anything read; when the Sun's went out) | Gagarin's report and the transcript; vostoksupersite's list of 19 legends (red, amber, green). A burn by hand moves the burn's and the parting's events, and the lamps with them |
| Gauges | cabin pressure held at 1 and the manual system's gas at 155; humidity, temperature, the TDU's bottle and the automatic system's gas follow Gagarin's readings by the clock, straight between them (humidity 65 to 71 % and temperature 20 to 21.5 °C through the burn, the bottle 320 to nothing, the gas 155, 150 at 10:09, 110 at 10:23, nothing by the burn's end); carbon dioxide, oxygen and the instrument module's pressure (his readings 1 to 1.25, not consistent) stand where they were built and say "not simulated" | documented (the readings and their times); estimated (straight between them; the shape of each change in the burn) | the transcript, the onboard tape and his report («Первый пилотируемый полёт», 2011, vol. 1); the telemetry's 750 to 770 mm and 62 to 71 % (vol. 2, doc. 159) |
| Clock | runs on Moscow time | documented | |
| Controls | the code keys type the lock's digits; manual orientation stands thrown while the deck's hands are free and says so when worked; the braking engine's button fires by hand once free; the hand controller moves with W S A D Q E while free; the lamps' tumbler throws the cabin's lights | documented (what each was); estimated (that the code alone throws the switch) | orbitdeck.ts `ask`, its news to the cabin (viewer/cabin.ts `DeckNews`) |

Left out or wrong: **the cabin is not shaded** (no shadow is baked at its vertices, as the Mercury cabin's is, so
with its lamps off it is lit evenly); the Vzor's and the Globus's simplifications above; 21 of the 24 lenses are
blank and dark; the porthole blinds, the loudspeaker, the tape recorder, the food
container, the water, the sanitary device and the log are not told apart from the type's plain cases; the telegraph
key is not built; the seat is still the type's slabs, where the real one is a riveted tub with rollers.

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

- **The launch configuration is approximate.** The fairing, Block E and its adapter are built
  ([vostok-8k72k.md](../../vehicles/vostok-8k72k.md)), but the antennas are withdrawn, not folded,
  and nothing joins the ship to the adapter but four pushers.
- **Nothing after separation of the modules.** The descent module's look during and after entry
  (insulation gone, shield charred, hatches off, the antennas burned away) is not modelled.
- **The seat does not leave as it flew.** On show it slides out along its rails; the flown
  sequence (hatch, then the seat on two rockets, a stabilising parachute, the pilot leaving the
  seat at 4 km) waits for the simulator.

## Level of detail

| Level | Triangles | Meshes |
| --- | --- | --- |
| Full (1.0) | 128,640 | 68 |
| 0.6 | 67,901 | 49 |
| 0.3 | 42,074 | 50 |

Freedom 7's capsule alone, for comparison, is about 265,000, 95,000 and 57,000. The clearance check
passes at all three.
