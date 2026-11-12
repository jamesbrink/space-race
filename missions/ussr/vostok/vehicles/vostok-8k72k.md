# Vostok-K (8K72K)

The launch vehicle of the crewed Vostoks: Korolev's R-7 with a third stage. Model:
[vostok_8k72k.py](vostok_8k72k.py), imported by a flight's `model/vehicle.py`. Vostok 1's was
No. E103-16, with RD-0109 No. 17 on its third stage (Siddiqi, launch log; RussianSpaceWeb).

**Five rockets and a sixth.** A core, Block A, burns for five minutes. Four tapered boosters,
Blocks B, V, G and D, hang round it and burn for two. All five light on the ground, because in 1957
nobody had started a big engine in flight and a start that failed on the pad could be called off.
Each booster pushes on the core through a ball at its tip and is tied to it at the foot; when its
thrust dies it falls away by itself. On top, joined to the core by an open lattice, is Block E, whose
one small engine lights while the core is still burning under it and takes the ship to orbit.

The model is in **millimetres**. Its stations are heights above the plane of the main nozzles'
exits, the lowest point of the vehicle, and it is built about the spacecraft's own frame (station 0
at the braking engine's nozzle, [vostok-3ka.md](vostok-3ka.md)), which stands at height 30,530.

**Confidence**: *documented* is a published figure, with where it was read; *derived* is computed
from documented ones; *estimated* was scaled off a drawing or photographs, or chosen to make the
documented figures fit together. **No OKB-1 drawing or table of the launcher has been read.** The
documented figures are overall sizes and masses from printed secondary sources; every station
between them is estimated, and says so.

## Sources, in short

Keys used below; full entries in [docs/sources.md](../../../../docs/sources.md), "Vostok", "The
launch vehicle".

- **M**: V. Minakov, «Ракета, поднявшая в космос Ю. Гагарина», *Modelist-Konstruktor* (text as
  carried by the magazine's own site; its drawings were not on the page). An engineer's article with
  a table of the 8K72's figures. The best single source found.
- **E**: Semenov (ed.), *RKK Energia 1946–1996*, the chapters on the R-7 and the 8K72 (text read in
  full; it gives no stage dimensions).
- **S**: Siddiqi, *Challenge to Apollo*, table of launch vehicles and pp. 273 to 281.
- **B**: Brügge's tables (b14643.eu), which reproduce NPO Energomash's published engine table and
  compile stage figures from Varfolomeyev's articles in *Spaceflight*. Secondary, and uncited figure
  by figure.
- **A**: Encyclopedia Astronautica's stage data.
- **Z**: Zak, RussianSpaceWeb, the Vostok launcher and the launch of 12 April.
- **N**: NASA's outline drawing of the Vostok launcher (Portree, *Mir Hardware Heritage*, NASA
  RP-1357), measured by pixel: 13.4 mm a pixel against the 38.36 m length.
- **K**: photographs of the vehicle standing at the Tsiolkovsky museum, Kaluga, described there as
  the flight's spare. **V**: photographs of the article at VDNKh, Moscow, from below. Both wear a
  later museum paint and lettering.
- **L**: the Block E cutaway from RIA Novosti (the Luna version of the stage).
- **F**: colour film stills of Vostok launches, as reproduced by RussianSpaceWeb.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Length on the pad, with fairing | 38,360 mm | documented | M (table); S; the Soviet encyclopedia text as carried by Russian Wikipedia. Z also quotes 41 m from another source; Russian Wikipedia's box says 38.2 |
| Greatest width, over the air rudders | 10,300 mm | documented | M; S. The model's rudders are drawn to reach it |
| Core with the lattice | 28,750 mm | documented | M: «Длина 2-й ступени с переходной фермой 28,75». Taken from the nozzle exits to the top of the lattice, because M's 28.75 and 9.61 (third stage with fairing) sum to 38.36 exactly |
| Lattice between core and Block E | 1,260 mm | documented | M: «ферму-переходник длиной 1,26 м». N scales to about 1,100 |
| Core, greatest diameter | 2,950 mm | documented | M; Z; B |
| Core, tail diameter | 2,050 mm | documented, secondary | B: "2.05-2.95-2.57". The CIA's account of the vehicle shown at Paris in 1967 says only that the lower tank was plainly narrower than the upper |
| Core, top diameter | 2,580 mm | estimated | B has 2.57; N scales to 2.58; M gives the third stage, which stands on it, as 2.58 |
| Core, where it is widest | height 19,760 | derived | where the boosters' tips come: see "How the stations were set" |
| Core, where the taper begins | height 6,200 | estimated | level with the boosters' shoulders, so that core and booster lie parallel 48 mm apart: see below. Not seen in any photograph: the boosters hide it |
| Core tanks | fuel 5,400 to 14,300; oxygen 15,200 to 25,600 | estimated | oxygen above fuel (M; E: «с передним расположением бака окислителя»), the oxygen tank two cones joined at their wide ends on the frame the boosters push on (M). Stations chosen to hold the documented propellant: 32 m³ of kerosene and 56 m³ of oxygen |
| Strap-on, without the nozzles | 19,200 mm | documented | M (given for the 8K71's block and in the 8K72 table) |
| Strap-on, with the nozzles | 19,800 mm | documented | Z; B; the Soviet encyclopedia text. A has 19.0 m |
| Nozzles below the tail's rim | 600 mm | derived | the difference of the two. Used for the core as well, which is estimated |
| Strap-on, greatest diameter | 2,680 mm | documented | M; Z; B. (A machine translation of another Russian text has "3 m") |
| Strap-on, cylinder | 5,600 mm from the rim | estimated | K, seen side on while lying on its transporter, has about 38% of the block cylindrical; N draws 17%. Chosen between them so that the block holds its documented 39 t of propellant above a tail 2.7 m long, and clears the core |
| Strap-on tanks | fuel 2,700 to 5,150 from the rim, in the cylinder; oxygen 5,600 to 17,400: the whole cone | estimated | the layout is M's (a load-bearing cone above the tanks, oxygen over fuel, the two ring tanks and the tail below). Stations chosen to hold 13.6 m³ of kerosene and 24.4 m³ of oxygen |
| Strap-on, cone | 13,600 mm to the tip: 5.63° half angle | derived | from the three lengths above |
| Strap-on base, from the core's axis | 2,780 mm | estimated | V from below and N both scale to about 2,700; 2,780 is what lets a 5.6 m cylinder clear the core's tail |
| Strap-on's lean | 3.76° | derived | tip 1,520 mm from the axis (on its bracket on the core's frame), base 2,780, over 19,200 |
| Air rudder | a triangle 1,030 mm out from the skin, 1,500 mm root | derived (span, from the 10.3 m); estimated (chord, sweep) | K, V |
| Block E, with its adapter | 2,980 mm | documented | M: for Vostok «удлинили переходный отсек, и ее длина составила 2,98 м». B has 2.86 or 2.87; A 2.84 |
| Block E diameter | 2,580 mm | documented | M. B has 2.47; A 2.56 |
| Block E's tanks | two rings, one above the other, joined by a cylinder, the engine in the hole | documented (the arrangement); estimated (their sizes, and which holds what) | M: «с тороидальными баками, соединенными между собой цилиндрической вставкой. Двигатель РО-7 размещался внутри "баранки"». Sizes off L |
| Fairing | 6,630 mm long, 2,700 mm across | documented | M: «диаметром 2,7 и длиной 6,6 м»; 9.61 less 2.98 is 6.63. B has 6.74 m by 2.58; Z has 2.7 across and 0.8 t |
| Fairing's nose | a cone of 20° half angle with a rounded tip, over a cylinder 3,090 mm tall | estimated | N scales to a cone 3.6 m long. K's nose is a blunter, curved one: K's fairing may not be the 1961 one |
| Fairing's opening | round, 1,150 mm across, over hatch No. 1 | documented (that it is there, and why); estimated (size) | M; Z: for boarding and for ejection on the pad. Size off N and K |
| Spacecraft's place | its frame (station 1,200 of the 3KA) on the adapter's top | documented (what rests on what); derived (the height) | M: «На ступень опирался шпангоут приборного отсека». N puts the opening's centre 34.07 m up, which is the same to 0.04 m |
| Main nozzle exit | 720 mm | estimated | V scales to about 740. No published figure was read |
| Main chambers | four to an engine, on a 630 mm radius, in a square whose sides lie along and across the line to the core | estimated | V |
| Steering chambers | two on each strap-on, either side of the rudder, 24° from it, 1,500 mm from the block's axis; four on the core, in line with the boosters, 1,250 mm from its axis | documented (the counts); estimated (the places) | counts: M; E. Places: V |

### How the stations were set

Nothing read gives a station along either block, so they were found from what must be true at once:

1. The boosters' tips rest on the frame where the core is widest (M). A tip 1,520 mm from the axis
   and a base 2,780 mm from it, 19,200 mm apart, put the tip 19,760 mm up and the block 3.76° off
   vertical.
2. A booster's inner side then runs up at 1.9° to the axis. The core's taper is drawn parallel to
   it, 48 mm away, from 2,050 mm across at the boosters' shoulders to 2,950 at their tips. That the
   two do lie along each other is what K and V show; the gap is ours.
3. Each block must hold its propellant. At 0.83 t/m³ for kerosene and 1.14 for oxygen, and the
   mixture ratios of the engines, a booster's 39.2 t is 38 m³ and the core's 90.1 t is 88 m³. The
   booster's cylinder length and every tank station were chosen so that these fit with room for
   the domes. N's outline, with a 3.3 m cylinder, would not hold a booster's load.

So the profile is consistent with the documented sizes and loads, and is not a survey.

## Masses

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Liftoff mass | 287 t | documented | E, of this flight: «ракетой-носителем 8К72 ... со стартовой массой 287 т»; M; S. Also in print: 290.5 t (Z), 291.15 t (B), 281.4 t (A) |
| Dry mass, whole vehicle | 29 t | documented | M. Z has 28.76 t |
| Strap-on, dry | 3.75 t each | documented | M. A has 3.71 t |
| Strap-on, at liftoff | 43.3 t each | documented, secondary | A. M's table has 170 t for the four; B 177.65 t |
| Strap-on propellant | 39.16 t each | documented, secondary | B, which counts 1.47 t of that as peroxide and nitrogen |
| Core, dry | 7 to 8 t | documented | M: 7 t for the 8K71's, 8 t in the 8K72 table. A has 6.8 t |
| Core, at liftoff | 100 t | documented, secondary | A 100.4 t; B 99.76 t; M 102 t |
| Core propellant | 90.1 t | documented, secondary | B, of which 3.12 t peroxide and nitrogen |
| Block E, fuelled | 7,984 kg | documented | M, of the 8K72's stage; A has 7,775 kg; E says 8 t; B 8.36 t |
| Block E, burnt out | 1,472 kg | documented | M. A has 1,440 kg; Z 1.34 t dry |
| Block E propellant | 6.93 t | documented, secondary | B. M's two figures differ by 6.51 t |
| Fairing | 0.8 t | documented, secondary | Z. B has 0.64 t |
| Spacecraft | 4,725 kg | documented | E, of this flight |

The stage figures do not sum to any one liftoff mass: four boosters, the core, Block E, the fairing
and the ship come to 286.9 t with A's and M's figures, which is as close as these sources allow.

## Engines

All three burn kerosene (T-1) in liquid oxygen. The RD-107 and RD-108 are one design, by Glushko's
OKB-456: four fixed chambers fed by one turbopump, which is driven by steam from hydrogen peroxide;
the steering chambers, by Melnikov's group at OKB-1, are fed from the same pump and turn on
trunnions through which their propellants arrive (E).

| | RD-107 (8D74), each strap-on | RD-108 (8D75), core | RD-0109 (8D719), Block E |
| --- | --- | --- | --- |
| Main chambers | 4 | 4 | 1 |
| Steering | 2 chambers | 4 chambers | 4 nozzles on the turbine's exhaust |
| Thrust at sea level | 815.9 kN | 744.3 kN | |
| Thrust in vacuum | 997.7 kN | 945.4 kN | 54.5 kN |
| Specific impulse, sea level | 2,510 N·s/kg (256 s) | 2,432 (248 s) | |
| Specific impulse, vacuum | 3,069 N·s/kg (313 s) | 3,089 (315 s) | 3,172 (323.5 s) |
| Chamber pressure | 5.85 MPa | 5.10 MPa | 5.0 MPa (A); 5.85 (Russian Wikipedia) |
| Burn | 118 to 120.5 s | 290 to 301 s | 365 to 440 s in print |
| Dry mass | | | 121 kg |

Thrusts and impulses for the first two are B's copy of NPO Energomash's table, row "8K72K"
(*documented, secondary*: Energomash's own page was not reached). They include the steering
chambers. M's table gives 82 tf (804 kN) and 81.2 tf at the ground; S gives 409.8 tf for all five
at liftoff, which is 4,019 kN where the table's figures sum to 4,008. A steering chamber gave
2.5 tf (E). The burns are M's (118, 290, 440 s), A's (118, 301, 365 or 430 s) and B's, computed
from propellant and flow (120.5, 294.4, 405 s): **the RD-0109's burn time is not settled by
anything read**, and on this flight it ran from about 300 to 676 s, 376 s.

Counted at the base: twenty main nozzles and twelve small ones, thirty-two chambers lit on the
ground, each by its own pyrotechnic igniter on a wooden stand pushed up the nozzle (E: «в каждой из
32 камер сгорания»).

## Staging

| Event | Time from liftoff | How |
| --- | --- | --- |
| Strap-ons separate | 119 s (S; Z) | Engines throttled back, steering chambers off; the ties at the foot let go and the blocks swing out on their tip balls under their own remaining thrust, come off the brackets as the core pulls ahead, and vent their oxygen tanks through nozzles in the nose cone to push the tips clear (M). Seen from the ground the four make a cross |
| Fairing | 150 s (Gagarin); 154 s (Z); 156 s (S's figure) | Two halves, during the core's burn |
| Block E lights, core shuts down | about 300 s (S: cutoff 300; Z: 299) | Hot staging: the upper engine starts through the open lattice onto a deflector on the core's top (M), then the core is cut loose. Gagarin felt 10 to 15 s of weightlessness between the two (Z), which the hot-staging account does not explain |
| Block E shuts down | 676 s (S) | |
| Spacecraft separates | 688 s, 09:18:28 Moscow time (OKB-1 report) | |

**Why the orbit was high.** The apogee was 327 km where 230 was planned. Zak has the core's
engine running about half a second long before its cutoff; Siddiqi (2015), from the documents
published in 2011, has a faulty valve on the third stage's engine letting it burn long. The OKB-1
report read here gives the orbit and not the cause. Both are recorded; neither is taken.

## What a staged trajectory will need

This will be the simulator's first orbit. What was found, for `Flight.trajectory` when it is
written:

| Input | Found | Confidence |
| --- | --- | --- |
| Liftoff mass | 287 t | documented |
| Stage masses and propellant | as "Masses" above | documented, with spreads of 1 to 4 % between sources |
| Thrust and specific impulse, sea level and vacuum | as "Engines" above | documented, secondary |
| Nozzle exit areas | none published was read; 20 exits of 720 mm scaled off a photograph | estimated. Better derived from the two thrusts: (vacuum less sea level) over one atmosphere |
| Burn times | spreads above; flown: 119, 300, 676 s | documented (flown) |
| Throttling | the boosters throttled before separation (E: after the third satellite's failure it was decided to throttle at the end of the first stage's flight); no profile | not found |
| Fairing | 0.8 t, off at 150 to 156 s | documented, secondary |
| Pitch programme | nothing | **not found** |
| Launch azimuth as flown | nothing published was read. For 64.95° from 45.92° N: 37.5° east of north before the Earth's turning is allowed for | derived |
| Drag | nothing | not found |
| Orbit to hit | 181 by 327 km, 64°57′, 89.44 min | documented (OKB-1 report) |
| Speed at core cutoff | about 5.5 km/s | Z, round |
| Loads felt | 3 to 4 g a minute after liftoff (Z, from Gagarin) | documented, loose |

## Paint and markings

The museum vehicles are light grey or white with СССР and ВОСТОК in red. That is display paint;
nothing read says the vehicle of April 1961 carried any lettering, and none is modelled.

| Item | In the model | Confidence | Basis |
| --- | --- | --- | --- |
| Skin | a grey-green lacquer | estimated | F: where the film shows the vehicle climbing, the boosters' lower halves are dark grey-green and their upper halves white |
| Frost | white over each oxygen tank: the boosters' cones above their fuel tanks, the core from its intertank up | estimated | F. The oxygen tanks were bare metal walls at −183 °C. How far the frost reached and how even it was are ours |
| Fairing and Block E | pale grey | estimated | F: lighter than the bare lacquer, darker than the frost |
| Tail shields | polished steel | documented (that they were) | M: «из листов полированной стали, под которыми положили слой асбеста», on the side toward the core and across the end |

The film is of Vostok launches, and not certainly of this one: Zak notes that footage shown as
Gagarin's liftoff is of the launch of 28 July 1960.

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in a flight's `flight.ts`.

| Node | Contains | Leaves as |
| --- | --- | --- |
| `Fairing_Left`, `Fairing_Right` | the two halves; the hatch opening is in the right-hand one's edge | slide apart and fall back |
| `BlockE` | the stage: tanks, adapter the spacecraft stands on, engine, steering nozzles | lifts off the lattice |
| `Interstage` | the lattice and the deflector cone | stays on the core |
| `CoreStage` | Block A's airframe and tanks | |
| `CoreEngine` | the RD-108: four chambers, four steering chambers in their fairings, turbopump | |
| `Booster_B`, `_V`, `_G`, `_D` | each strap-on whole, with its RD-107 and air rudder; the node's origin is on its tip ball | swings out about its tip, then falls away |

## What the model gets wrong or leaves out

- **Every station along the core and the boosters is estimated**, as set out above. The overall
  lengths, the three diameters and the lattice's length are the only documented dimensions in it.
- **The core's shape below the boosters' tips has not been seen.** It is drawn as a straight taper
  to a short cylinder, parallel to the boosters.
- **The fairing is the outline in NASA's drawing**, a plain cone on a cylinder. The Kaluga article
  has a curved nose. Its split line is put square to the hatch opening, and its fittings are ours.
- **Block E is the Luna stage's layout with a longer adapter.** Which ring holds the oxygen is not
  known to us: the upper is drawn as the oxygen's, being the larger. Its steering nozzles are four
  in pairs at the foot, as in the drawings; M describes two fixed pairs for pitch and yaw and four
  turning ones for roll, eight in all, and the other four are not modelled.
- **Engines are representative.** Chambers are real bells with throats and can be looked up; the
  turbopumps, gas generators, frames and pipes are the right kinds of thing in about the right
  places, built from photographs of museum engines, not from a drawing. Nozzle sizes are scaled
  off one photograph.
- **Steering chambers do not turn**, and the air rudders do not move.
- **The ties at the boosters' feet are plain struts.** The real ones are tubes in pneumatic locks,
  with a sliding dovetail joint beside them (M).
- **The tip joint is a ball in a cup.** The bracket's real form, the oxygen vent nozzles in the
  nose cone and the separation switches are not drawn.
- **Nothing holds it up.** On the pad the vehicle hangs by the boosters' load-bearing fittings in
  the four arms of the launch system; the pad is not built, so in the viewer it stands on nothing.
- **Frost is a clean white band** with a straight edge.
- **Cable ducts, hatches and the scalloped doublers at the tail are placed from the Kaluga
  photographs**, which are of a vehicle said to be this flight's spare; which of its fittings the
  flown one shared has not been checked.
- **Under the fairing the spacecraft's long antennas were folded.** They are not modelled folded:
  ten of them are drawn withdrawn into the instrument module and slide out as the vehicle is taken
  apart ([vostok-3ka.md](vostok-3ka.md)).
- **Inside**, tanks have their domes and the fuel tanks their oxygen feed pipes through them; the
  peroxide and nitrogen rings are in their places. Baffles, level sensors, the tank-emptying system
  and all wiring are left out.

## Discrepancies seen against photographs

Recorded as the model was compared with K, V, F and N; see the flight's README for the views.
