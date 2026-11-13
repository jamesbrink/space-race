# Vostok 3KA No. 4, as flown on 6 and 7 August 1961

What the spacecraft in [model/vehicle.py](model/vehicle.py) is, and how far to trust it. The model
is the type's, [vostok_3ka.py](../../vehicles/vostok_3ka.py), and **every dimension of the type,
with its confidence and basis, is in the type's record: [vostok-3ka.md](../../vehicles/vostok-3ka.md)**
(one place per number). This file is what is particular to No. 4 and to this flight: what the
record says it differed from No. 3 in, which of that is modelled, and what is assumed the same
because nothing was found.

It is built as it rode under the fairing on 8K72K No. E103-17, the instrument module's ten
antennas drawn in; as the vehicle is taken apart they come out, and with the launch vehicle gone
it is as in orbit. The flown descent module no longer exists to be compared with: it was destroyed
in 1964 (Chertok, vol. 3, p. 494; Siddiqi, p. 412).

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off a drawing or photographs, or chosen to look right. **Assumed** below means
estimated in the plainest sense: taken to be as the type has it, for want of anything read.

## The figures of this ship and flight

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Spacecraft | 3KA No. 4 (also written Vostok-3A No. 4) | documented | Siddiqi, launch log: "3KA 4"; RussianSpaceWeb; Pervushin: «3КА №4» |
| Launch vehicle | 8K72K No. E103-17 | documented | Siddiqi, launch log; Pervushin. spacefacts.de prints Vostok 1's number |
| Third stage engine's number | | **not found** | Vostok 1's was RD-0109 No. 17 |
| Mass in orbit | 4,731 kg | documented | TASS, 6 August 1961: «без учета веса последней ступени ракеты-носителя, составляет 4.731 килограмм»; Siddiqi, Table IB. Encyclopedia Astronautica rounds to 4,730. Vostok 1: 4,725 |
| Descent module / instrument module mass | 2,460 kg / 2,270 kg | documented, for the type | Siddiqi p. 195. No. 4's own have not been found |
| Length, diameters, hatches | as the type | documented, for the type | [vostok-3ka.md](../../vehicles/vostok-3ka.md). Nothing read gives a dimension of No. 4 that differs |
| Supplies and power | for ten days | documented | Yazdovsky, 11 August 1961; RussianSpaceWeb |
| Cabin air in flight | one atmosphere; 10 to 22 °C; oxygen 25 to 27%; carbon dioxide 0.25 to 0.4%; humidity 55 to 75% | documented | Yazdovsky, 11 August 1961 (Pravda, 12 August) |
| Radio | voice on 15.765 and 20.006 MHz (short wave, one antenna) and 143.625 MHz (FM, its own antenna); Signal on 19.995 MHz | documented | Kotelnikov, 11 August 1961; TASS |
| Television | two systems, each with its own transmitter: 100 lines, as before, and 400 lines, new; both 10 frames a second | documented | Kotelnikov, 11 August 1961; Siddiqi p. 294 |
| Braking engine | 1,614 kgf, 45 s at most | documented, for the type | Siddiqi p. 197. Flown: 40 s (RussianSpaceWeb) or 45 s (Pervushin) |
| Attitude gas | 160 atm at first use, 135 after orienting, 120 when switched off; 110 before the second use, 102 after it; told not to go below 100 | documented, at second hand | Titov's report of 8 August 1961, as RussianSpaceWeb gives it |

## What differed from 3KA No. 3

| Difference | In the record | Confidence | Source, and what the model does |
| --- | --- | --- | --- |
| The pilot | Gherman Titov, in the SK-1, orange, "a helmet with the inscription СССР" | documented | *Komsomolskaya Pravda*, 8 August 1961 (TASS's Romanov at the pad); the film of the morning. **Modelled**: the SK-1 figure in the seat, lettered |
| His height | | **not found** | 163 cm is printed on biography pages that cite nothing (24smi.org and others). The figure in the seat is the suit module's own, built to Gagarin's documented 1.65 m: **assumed** |
| A film camera | a Konvas "reporter's movie camera" (Titov, 11 August), "modified for space flight" (RussianSpaceWeb); about ten minutes of film, black-and-white and colour | documented (that it was carried, and what kind) | **Modelled**: `FilmCamera`. Its size is the type's as published; its form is estimated off photographs; its place in the cabin is estimated |
| An optical instrument | "an optical instrument which magnified three and five times" (TASS); Siddiqi calls it *Zritel*; Pervushin *Vizir* | documented (that it was carried) | **Not modelled**: no picture or dimension of it was found, and a stand-in is not built |
| Television | a second, wide-band system of 400 lines beside the old one of 100 | documented | **Assumed as the type**: two cameras where vostok_3ka.py has them. Which was the new one, and whether it looked different, is not known |
| The air system | "a new cabin atmosphere regeneration system" (Siddiqi p. 294, from Kamanin); "an upgraded air-conditioning system, which went through a 12-day laboratory testing" (RussianSpaceWeb). Before Vostok 1 the drier had failed its long trials and the old one flew (Kamanin, March and April 1961) | documented (that it changed) | **Assumed as the type**: the cabin's cases and canisters are not told apart in the model |
| Radio | "modifications that increased the reliability and operational ease of radio communications" (Chertok); a broadcast receiver for short and medium wave (Titov's report in the record file; Kotelnikov) | documented | **Assumed as the type**: no antenna is known to have been added or moved |
| A radiation counter in the cabin, and biological specimens | RussianSpaceWeb; TASS | documented | not modelled |
| The log book | "Log Journal of the Spaceship Vostok II", a pencil on a string | documented | not modelled (Vostok 1's tablet is not either) |
| Mass | 6 kg more | documented | nothing to draw |

**Everything else is assumed the same as No. 3**, and so as the type: the hull, the hatches and
portholes, the seat, the straps, the cable mast, the bottle ring, the antennas, the radiator, the
braking engine, paint and lettering (none), the fairing, Block E and the launcher under it. For
none of these was a statement found either way. Chertok says only that Bushuyev and Feoktistov
"developed a list of modifications for the spacecraft based on the experience of the previous
flight, allowing it to remain in orbit for at least a week"; the list itself was not found.

Two things are worth saying about what did not change. The separation of the modules failed
again, by a different fault from Vostok 1's and the same one as the two unmanned ships of March:
the cable mast was as it had been. And the Signal transmitter, which RussianSpaceWeb and Chertok
list among what was added, flew on Vostok 1 already (Gagarin's report has it working, and Siddiqi
counts its three antennas on the type); what was new about it on this flight is not clear from
anything read.

## The film camera

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Kind | Konvas-Avtomat (1KSR), hand-held 35 mm reflex, three lenses on a turret, 60 m magazines, electric motor | documented | Titov, 11 August 1961: "a simple reporter's movie camera 'Konvas'"; the camera's own published description |
| Overall size | 290 × 260 × 240 mm; 5.7 kg | documented, tertiary, for the type | Russian Wikipedia's table for the 1KSR, which cites *Sovetskaya kinosyomochnaya apparatura* (1974), not seen. The model is 290 mm over the longest lens and the eyecup and 260 mm over the magazine and the motor, as that has it, and 138 mm wide: what makes up 240 is not known to us |
| Form | body, turret and three lenses of three sizes, a drum magazine on edge behind the top, a viewfinder tube along the left side, the motor below | estimated | the photograph of the camera shown as Titov's (as reproduced by Terekhov on Habr) and of Titov holding one (FotoSoyuz, as reproduced by *Air & Space*) |
| What was altered for the flight | | **not found** | |
| Colour | black | estimated | the camera shown as his. The 1KSR was usually light grey |
| Place in the cabin | at the pilot's right hand, lenses toward the right porthole, top toward his head | estimated | nowhere recorded. Russian Wikipedia says a regular place was kept for a Konvas in every Vostok's cabin, citing two magazine articles not seen; *Air & Space* says Gagarin carried none. Titov closed the right porthole's blind against the Sun, so it was in his reach |

## How it was checked

The type was checked against RKK Energia's cutaway, the Kaluga article and the flown descent
module of Vostok 1 ([Vostok 1's spacecraft.md](../../vostok-1/spacecraft.md)). For this flight
there is nothing of No. 4 left to check against, and no photograph of its cabin was found. The
television frames received from orbit (as RussianSpaceWeb reproduces them) show Titov's helmet,
collar and hand with the camera, and nothing of the cabin behind him that can be placed.

## What is simplified, for this flight in particular

What the model simplifies as a type is in [vostok-3ka.md](../../vehicles/vostok-3ka.md), "What the
model gets wrong or leaves out", and for the launcher in
[vostok-8k72k.md](../../vehicles/vostok-8k72k.md). Besides those:

- **The camera hangs in the air.** What held it for the launch (a bracket, a pocket, a strap) is
  not known, and nothing is drawn. It has no strap, no cable and no exposure meter beside it.
- **The camera is the type as sold**, not as altered. Its lenses are three plain barrels of
  different lengths: which lenses he had is not known.
- **The pilot is Gagarin's figure with Titov's name**: the same stature, the same suit, visor
  down. The suit is assumed to have been the same SK-1; the string he tied to his visor so that he
  could open it quickly in his sleep (Siddiqi) is not drawn.
- **The cabin is the type's.** The new air system, the second television system, the broadcast
  receiver, the optical instrument, the radiation counter, the specimens and the log book are not
  there, or are not told apart from the boxes that stand for the type's equipment.
- **The launch vehicle is Vostok 1's model**, number for number. Whether No. E103-17 differed
  from E103-16 in anything that shows was not found.
- **Nothing after separation.** As for Vostok 1, the descent module's look during and after entry
  is not modelled, nor the modules hanging together on the cable bundle.

## Level of detail

| Level | Triangles (whole vehicle) | Meshes |
| --- | --- | --- |
| Full (1.0) | 523,936 | 185 |
| 0.6 | 215,273 | 132 |
| 0.3 | 106,426 | 133 |

The camera is 2,096 triangles, at full detail only: with the seat, the pilot and the rest of the
cabin's contents it is left out below detail 0.75. The clearance check passes at all three.
