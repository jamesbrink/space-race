# Mercury spacecraft No. 20, as flown on MA-9

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. Station 0 is the heat shield's maximum-diameter plane and positive is toward the nose
(McDonnell's Z104.50). Angles are round the cone from the pilot's right as he lies: his feet are at
90°, where every earlier capsule had its periscope, and the window at 270°, over his head. The
drawings are in inches, so the model is too. The script builds the capsule in that frame and then
turns it 45° about its long axis (`mercury_capsule.stand`), so that in the GLB the hatch is on +X;
`flight.ts` quotes its azimuths in the pilot's frame and adds the turn (`STAND`).

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts).

**The model is the capsule as launched**: retropack on, tower on, the umbilical's door shut, the
flashing beacon in its canister, the balloon in its can.

No. 20 is built from the same places as No. 18, and from nothing copied:

- what every Mercury capsule so far shares: [mercury_capsule.py](../../vehicles/mercury_capsule.py),
  recorded in [Freedom 7's spacecraft.md](../mr-3-freedom-7/spacecraft.md);
- what No. 11 was the first to have (the window, the explosive hatch, the shingles round them, the
  panel): Liberty Bell 7's own script and [mercury_cabin_11.py](../../vehicles/mercury_cabin_11.py),
  called from this flight's script with no periscope and with what No. 20 had otherwise
  ([Liberty Bell 7's spacecraft.md](../mr-4-liberty-bell-7/spacecraft.md));
- what the orbital capsules had (the ablation shield; the balloon's container; the high-frequency dipole
  antenna on the retropack, which No. 16 was the first to carry):
  [mercury_orbital.py](../../vehicles/mercury_orbital.py);
- the hand-held camera in its kit, as built for No. 16: [mercury_cabin_16.py](../../vehicles/mercury_cabin_16.py);
- what was No. 20's own: this flight's script and [mercury_cabin_20.py](../../vehicles/mercury_cabin_20.py).

## What made No. 20 different

No report of this flight in the manner of the earlier ones (a postlaunch memorandum report, with
its list of differences from the capsule before and a dated table of changes) has been read: none
was found on NASA's report server. What follows is from the programme's own summary, which is also
this flight's report (NASA SP-45), its press kit, NASA's illustrated account (*The Triumph of
Astronaut L. Gordon Cooper, Jr. and the Faith 7*), *This New Ocean*, and photographs. *This New
Ocean* counts 183 changes (p. 490); SP-45's Table 3-II (p. 52) lists twenty, all of them here.
The capsule before it was No. 16, whose own report lists eighty-one changes from No. 18
([Sigma 7's spacecraft.md](../ma-8-sigma-7/spacecraft.md)): what No. 20 kept of those is taken as
kept where this table is silent.

| What | Before | No. 20 (MA-9) | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| **Periscope** | fitted, on every capsule | deleted: "Reduce weight by 76 lb; unnecessary for attitude reference" | documented | SP-45, Table 3-II and p. 285; *This New Ocean*, p. 490; the press kit, p. 36 (75 lb "including associated ballast") | yes: no door, objective, housing, tube or display |
| Umbilical door | the umbilical plugged in under the periscope's lens, inside its door | "a spring-loaded mechanism ... for the closing of the spacecraft umbilical door"; an UMBILICAL DOOR light | documented (that it had one); estimated (where, and its size) | the press kit, p. 33; SP-45, Figure 17-7(b) | yes: see "The umbilical's door" |
| Rate stabilization control system | fitted from MR-4 on | removed: "Not necessary; reduced weight by 12 lb" | documented | SP-45, Table 3-II and p. 54 | no: its place is not established for any capsule |
| Fuel | two tanks | a third, of 15 lb capacity, filled with 10; an interconnect valve between the systems | documented | SP-45, Table 3-II, p. 55 and Figure 3-11; the press kit, p. 30 | no: under the pressure bulkhead |
| 1 lb and 6 lb thrust chambers | | a new design | documented | SP-45, p. 54 and Figure 3-10 | no: inside |
| Backup UHF voice transmitter | fitted | removed, 3 lb | documented | SP-45, Table 3-II and p. 56 | not built in any |
| Backup telemetry transmitter | two | one deleted, 2 lb | documented | SP-45, Table 3-II and p. 57 | not built in any |
| Low-level commutator | on MA-7 and MA-8 | deleted: "served its purpose" | documented | SP-45, Table 3-II and p. 57 | not built |
| Tape recorder | 1 7/8 in/s | 15/16 in/s, and programmed | documented | SP-45, Table 3-II | a PROGRAM switch and a RECORDING light on the panel |
| **Slow-scan television** | none | a camera, control unit and transmitter: one frame in two seconds | documented | SP-45, p. 56 and Figure 3-12; the press kit, pp. 20 to 22 | the camera: see "Television" |
| Oxygen | one bottle | a second, in parallel: 4 lb more | documented | SP-45, Table 3-II; the press kit, p. 35 | no: `oxygen_and_bag` is the type's |
| Suit coolant valve | one | a second in parallel, after MA-8's blocked one | documented | SP-45, Table 3-II | no |
| Condensate, urine | | an inline condensate trap; transfer systems worked by hand | documented | SP-45, Table 3-II; *This New Ocean*, p. 496 | no |
| Water | | 9 lb more for cooling, 4.5 lb more to drink | documented | SP-45, Table 3-II | no |
| Carbon dioxide absorber | | 0.8 lb more | documented | SP-45, Table 3-II | no |
| Batteries | | two of the 1,500 Wh replaced by 3,000 Wh: one of 1,500 and five of 3,000 in all | documented | SP-45, Table 3-II; the press kit, p. 31 | no: not built in any |
| Inverters | three | two replaced | documented | SP-45, Table 3-II | no |
| **Flashing beacon** | none | a 5.75 in ball with two xenon lamps, in a canister on the retropack | documented; estimated (the canister, and where on the pack) | SP-45, pp. 218 to 220, Figures 12-2 and 12-5; the press kit, pp. 9 and 10 | yes: see "Retropack" |
| **Geiger tubes** | (MA-8: emulsion packs) | two Geiger-Mueller tubes in a package on the retropack | documented; estimated (the package and its place) | SP-45, p. 226 and Figure 12-14; the press kit, p. 15 | yes |
| HF dipole antenna | first on MA-8's retropack | "this special dipole antenna" tested again: 28 ft, by the two together | documented; the units and their places estimated | SP-45, p. 57; *The Triumph*, p. 21; NASA TN D-4807, p. 61, for the antenna itself | yes, rolled up: `mercury_orbital.hf_dipole`, as built for No. 16 |
| Hand-held camera | MA-8's Hasselblad 500C | "A Hasselblad camera with 70 mm film and 80 mm lens"; also a 35 mm camera for the zodiacal light and a 16 mm camera | documented; the kit's place estimated | the press kit, pp. 13 and 20; *The Triumph*, pp. 17 to 19; SP-45, p. 223 | the Hasselblad in its kit, where No. 16's is: nothing read places No. 20's |
| Ablation panels on the cylinder | on MA-8, for that flight | none recorded | documented (that they were MA-8's experiment) | SP-45, p. 227 | none |
| Retropack stripes | No. 16's pack striped dark on light | not established: no photograph of No. 20's retropack has been read | | | no |
| **Balloon** | MA-7's, which tore | made again; in a 3 in container "in the antenna canister under the destabilizing flap"; orange | documented; estimated (its depth and place) | SP-45, p. 227 and Figure 12-16; the press kit, pp. 16 to 19 | yes: the can |
| **White paint patches** | one 6 in patch on MA-7 and on MA-8 | three 6 in squares of three coatings on one shingle at the small end of the cone | documented; estimated (where) | *The Triumph*, p. 21; NASA S63-06259 | yes: see "Paint" |
| **Instrument panel** | No. 11's, with deletions | a new centre section in the periscope's place; more instruments at the right; a different left console | documented as a small drawing | SP-45, Figure 17-7(b), p. 291 | in part: see "Cabin" |
| Helmet microphones | MA-8's more sensitive pair | modified against noise | documented | SP-45, p. 56 | two microphones on the figure |
| Suit | | boots made one with the suit; new shoulders; new glove wrists and an extra locking dog; the life vest in a pocket on the lower left leg; a self-sealing vent fitting; a mechanical visor seal | documented | *The Triumph*, p. 22 | in part: see "The pilot" |
| Couch | fibre glass | kept: a hammock 17 lb lighter was considered and not fitted | documented | *This New Ocean*, p. 490 | as No. 11's |
| Pilot's desk, map | | "a work table assembly located in front of the main panel pedestal", and a map in it | documented | the press kit, p. 34 | no |
| Weight | | "an estimated weight of 3026.3 pounds in orbit" | documented | *This New Ocean*, p. 490 | not used |
| Paint | | FAITH 7 on a white field; UNITED STATES twice; the three white squares | documented by photographs; every place estimated | see "Paint" | yes |

## What is assumed the same

Nothing read says these differed from the capsule named; nothing read says they did not.

| Item | Taken from | Why |
| --- | --- | --- |
| Where the window stands, its plate and rim | No. 11 | **against this capsule's photographs**: S63-06259 and S63-09676-E show the window's cover between UNITED STATES and the hatch with the emblem directly under it, as the model has them; but S63-07701 (on the carrier's deck, from the window's side) and S63-07521 show the window level with the first UNITED STATES, between about stations 20 and 40, where the model's is between 25 and 46. See "What the model gets wrong" |
| Where the hatch is and its two shingles | No. 11 | the same photographs, and GPN-2000-001335: the seams at the hatch's head and foot run on under UNITED STATES beside it |
| The shingle layout to the right of the hatch (columns of 30°, seams at stations 24.8 and 46.8) | No. 11 | GPN-2000-001335 agrees with it: the seams run on from the hatch's head and foot under UNITED STATES. From the pilot's feet round to the window it is this capsule's own: see "Shingles" |
| Two stacks of beads on the shingle under the window | No. 18 | no photograph of No. 20's read shows it square on |
| The roll jets, low on the cone | No. 11 | as built for No. 11 "by judgement" |
| Heat shield, retropack housing and rockets, recovery compartment, antenna canister, escape tower, pressure vessel | No. 13 and No. 7 | nothing read |
| The couch without knee and chest straps | No. 18 | the last capsule whose record says |
| The cabin's lining, controllers, stowage and lights; the panel but for its centre and the left console's lights | No. 11 | below |

## Shingles

| Item | As modelled | Confidence | Basis |
| --- | --- | --- | --- |
| Seams from 75° to 255° | at stations 20.8 and 38.5, where No. 11's are at 24.8 and 46.8: one tall row of shingles above the upper seam to the top of the cone | documented by photograph (that they are not No. 11's); estimated (the stations) | KSC-63-MA9-174, from above with the capsule in its collar: one seam round that side just above UNITED, and a single row above it carrying the three white squares on one shingle, as *The Triumph* says (p. 21). S63-09676-E: a row of fasteners at the foot of STATES |
| The plate at the pilot's feet | plain, 75° to 105°, between those seams | estimated | KSC-63-MA9-174 shows a plain plate at the cone's limb there, under the upper seam; how wide it is and how far down it goes cannot be told |
| Columns | twelve of 30°, two stacks of beads each | estimated | No. 11's; the same photograph shows columns of about that width with two stacks |

## Paint

All of it is placed from photographs; none of the places is dimensioned.

| Item | As modelled | Basis |
| --- | --- | --- |
| The emblem | a white five-pointed star, one point toward the nose, its points 7.6 in from its middle, at 270°, station 16.9: filling the shingle under the window | NASA S63-06259 and S63-09676-E (the insertions of 14 and 15 May): a white field with straight edges, pointed toward the nose and toward the base, broad between, lying from the window's foot most of the way to the base. Both see it at the cone's limb, almost edge on. That it was a star is taken from the flight's later insignia (Commons: *Faith 7 insignia.jpg*); a shield or a diamond would look the same in them |
| its lettering | FAITH in dark capitals 8.6 in long and 1.75 in tall across the star above its middle, and a 7 of 3.9 in under it | the same two photographs, in which dark letters and a 7 with a long sloping stem can be made out; their arrangement is the insignia's. A typeface of ours. Whether the dark is black paint or the shingle left bare is not established: black |
| UNITED STATES, first | two lines 27 in long, letters 6.9 in tall, centred on 208° at stations 33.85 and 24.55: low on the cone, under the white squares, ending 7 in from the window's plate | S63-06259, S63-09676-E; S63-07521 (close and square on: the lettering ends one stack of beads from the window's cover); KSC-63-MA9-174 (in the water, from above) |
| its flag | 12 by 6.3 in at 209°, station 16.8 | the same |
| UNITED STATES, second | the same size, centred on 28° at stations 42.4 and 31.9: beside the hatch and level with it, beginning 4.5 in from its border | GPN-2000-001335 (the egress on the carrier's deck, square on and close); the capsule as it hangs at Space Center Houston |
| its flag | at 30°, station 18.6: under the seam at the hatch's foot | the same |
| White paint patches | three 6 in squares 0.7 in apart in a column at 185°, the top one's upper edge at station 57.4: on one shingle, over the U and N of the first UNITED | documented: their number, their size, that they were on one shingle at the small end of the cone (*The Triumph*, p. 21). Their places and the gaps are read off S63-06259 and S63-09676-E. Each has a dark spot at its middle in the photographs, taken as its thermocouple's fastening: not modelled |

Not modelled: the stencils low on the cone (S63-09676-E: "AUTO ... R/V VENT" and others) and
CAUTION THERMOCOUPLE at the seams beside the window (S63-07521); a small louvred panel beside the S
of the first STATES (S63-09676-E); a round fitting about four
inches across high on the cone at about 150° (KSC-63-MA9-174). Not established: what was painted
between 60° and 170°. No photograph read shows that side before the flight; KSC-63-MA9-174 shows
no paint from about 100° to 170° after it.

## The umbilical's door

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| That there was one | a sprung door over the umbilical's receptacle, and a light to say it had shut | documented | the press kit, p. 33; SP-45, Figure 17-7(b) |
| Place | at 90°, station 32.5, in the plain plate at the pilot's feet | estimated | where the umbilical was on No. 11 (NASA S61-03705). Nothing read places No. 20's; the one photograph read that reaches this side (KSC-63-MA9-174) shows the plate at the cone's limb and nothing in it |
| Size | 13° round the cone by 6.4 in of stations: about 5.8 by 6.8 in | estimated | what the receptacle as modelled needs |
| Hinge | on the edge toward the nose | estimated | ours |

## Retropack

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Beacon | a sphere 5.75 in across, about 10 lb, a xenon lamp at each of two poles, flashing about once a second; mercury-cell batteries | documented | SP-45, p. 218 |
| Ejection | by "a compressed spring acting against a piston when the canister covers were released", at 10 ft/s | documented | the same page and Figure 12-2 |
| Its line | 68° from the capsule's long axis, toward the pilot's feet | derived | 88° below the horizon with the capsule pitched 20° down (SP-45, p. 219 and Figure 12-5) |
| Canister | 6.5 in across and 9.6 in long, with a cover in two halves | estimated | drawn round the ball, the piston and the spring squeezed; Figure 12-2 shows a can, a spring, a piston and conical covers with no scale |
| Its place | at the pack's outer corner at 90°, held by two straps | estimated | scaled off Figure 12-5's sketch, which draws a small circle there |
| Geiger tubes | two, in one package: one looking along the roll axis through a collimator of about 0.8 steradian, one shielded and looking 40° off it | documented | SP-45, p. 226 |
| The package | a box 4.2 by 3.0 by 2.2 in on the pack's lower end at 270°, 10.2 in out | estimated | Figure 12-14 draws a box near the middle of the pack's end; its size is ours |
| HF dipole antenna | two units on the pack's wall, at 90° and 270°, each a tape 14 ft long rolled on its reel | documented (two, on the pack, the tape); estimated (the units, and where) | as [Sigma 7's](../ma-8-sigma-7/spacecraft.md), "Retropack". At 90° the unit stands just above the beacon's canister: both places are estimates, and one of them is wrong |

## Balloon

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Balloon | 30 in across inflated; two plies of 0.6 mil Mylar, orange; on 100 ft of 5 lb nylon line | documented; not modelled | the press kit, p. 17 |
| Container | "a three-inch-diameter cylindrical container located in the antenna canister under the destabilizing flap" | documented | the same page; SP-45, p. 227 |
| As modelled | 3.5 in across outside and 6.9 in deep, toward one end of the flap | estimated (the depth and the place) | as built for MA-7 (`mercury_orbital.balloon_canister`), without that flight's balsa liners, which nothing read gives this one |

## Television

Built by [mercury_cabin_20.py](../../vehicles/mercury_cabin_20.py).

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| That it was aboard | a camera, a control unit, a transmitter of its own; one frame in two seconds | documented | SP-45, p. 56 and Figure 3-12; the press kit, pp. 20 to 22 |
| Weight | 10 lb for the camera; 7 lb more for cabling, bracket and ballast | documented | *The Triumph*, p. 20 |
| Where | "hand-held or mounted on a bracket to the right of the pilot's hand controller", where "the camera is normally directed at the pilot" | documented | the press kit, pp. 20 and 22 |
| As modelled | a tube 2.7 in across and 7.4 in long with a lens on its end, on a post from the hand controller's box, aimed at the pilot's face | estimated | Figure 3-12 shows the camera on a bench with nothing to scale it by |

## Cabin

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| The centre of the panel | a section in the periscope display's place with a temperature indicator and two rotary switches (SENSOR TEMP SELECT), two instruments with two needles each, and twelve toggle switches and a RECORDING light | documented as a drawing; estimated as built | SP-45, Figure 17-7(b), p. 291: about four inches across on the page, no dimensions. Places are fractions of the section's width and height, laid over the opening No. 11's drawing has for the display |
| what the temperature switches chose | pitch up and down, yaw left and right, roll each way, the retropack; the three peroxide tanks, the cabin outlet, the inverters | estimated | read off the figure at the limit of what it shows; the pilot read thruster, peroxide tank and retropack temperatures to the ground (SP-45, pp. 406 and 413) |
| the two-needle instruments | one built as the control fuel gauge (automatic and manual), one a plain face | estimated | their legends cannot be read; No. 11's panel had control fuel in the left column, where this figure has nothing |
| legends | PROGRAM, ASCS CONTL, MODE SELECT, GYRO, ATTITUDE, RAD EXPER, TV CONTL, TELEMETRY, RECORDING | documented where given | as read from the figure; the others are left off |
| Sequence lights | UMBILICAL DOOR, JETT TOWER, SEP CAPSULE, RETRO SEQ, RETRO ATT, FIRE RETRO, JETT RETRO, .05G, DROGUE, SNORKEL, MAIN, RESERVE, LANDING BAG | documented (the first eight and MAIN and LANDING BAG can be read; three are dark in the figure and are taken in No. 11's order) | the same figure. No RETRACT SCOPE |
| Blank plates | over the Earth-path indicator's place and the control fuel gauge's old place | estimated | the figure draws a hinged plate with a latch where the Earth-path indicator had been |
| The rest of the main panel and the consoles | No. 11's | estimated | see "What the model gets wrong" |
| Straps | shoulder and lap straps and toe caps; no knee strap, no chest strap | estimated | as No. 18's |
| Hatch | 70 bolts | estimated | the type's; nothing read counts this capsule's |

## The pilot

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| The figure | the Mark IV suit as modelled (`crew/mark_iv_suit.py`), on the couch, with the tag reading L. G. COOPER | estimated | |
| Stature | 5 ft 9 in (175.3 cm) | documented | "Cooper is 5 feet 9 inches tall, weighs 148 pounds" (*The Triumph*, p. 1) |
| Wrist rings, two microphones, a round port on the right thigh | as built for Grissom's suit of July 1961 | documented by photograph | NASA S63-01922 (Cooper suited beside the capsule during preflight testing); the microphones also SP-45, p. 56 |
| What his suit had that the model has not | boots made one with the suit, closed by a zip up the back in place of laces; new shoulders; the life vest in a pocket on the lower left leg; a harness of webbing over the shoulders and across the chest | documented; not modelled | *The Triumph*, p. 22; S63-01922. The model's boots are the earlier laced ones |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `HeatShield` | the ablation shield (`HeatShield_Ablator`) and its ring of fasteners |
| `Retropack` | as Freedom 7's, and the beacon's canister with its cover and straps (`Retropack_Beacon*`: the ball, its lamps, the piston and spring are inside it), the Geiger tubes (`Retropack_GeigerTubes`), and the dipole antenna's two units (`Retropack_Dipole_*`) |
| `RecoveryCompartment`, `EscapeTower` | as Freedom 7's |
| `AntennaCanister` | as Freedom 7's, and the balloon's container (`Antenna_BalloonCanister`) |
| `Afterbody` | No. 11's shingles, plates, structure, attach ring and roll jets, with no periscope, this capsule's seams from 75° to 255° and two stacks of beads under the window; the umbilical's door, well and receptacle (`Umbilical_*`); this capsule's lettering, flags, white squares (`Afterbody_Patches`) and emblem (`Afterbody_Star`, `Afterbody_Name`) |
| `Window` | as No. 11's |
| `Hatch` | as No. 11's, with seventy bolts |
| `CrewCabin` | as No. 11's with no periscope: the centre panel (`CrewCabin_CentrePanel`) and what stands on it, this capsule's sequence lights, the television camera (`TV_*`), the hand-held camera in its kit (`Camera_*`), Cooper's name on the suit |

The same GLB holds the launch vehicle's seven nodes: [atlas-lv3b.md](../../vehicles/atlas-lv3b.md).

## What the model gets wrong or leaves out

- **The outside is No. 11's with No. 20's paint and without its periscope.** Its window's and
  hatch's places and its roll jets are Liberty Bell 7's.
- **The window stands about five inches too near the nose, and the emblem with it.** On the
  carrier's deck (S63-07701) the window is level with the first UNITED STATES and no higher,
  the hatch beside it reaches a little above it, and the emblem under it comes down nearly to
  the base; in the model, which keeps Liberty Bell 7's place for the window as Friendship 7's,
  Aurora 7's and Sigma 7's do, the window's top is level with the middle of the white squares.
  Whether Liberty Bell 7's own window is placed right has not been looked at again. Moving it
  means moving the window, its well, the opening in the pressure vessel and the cabin's shroud
  together, for all five capsules or for this one: not done here.
- **The shingles are laid out from three photographs.** From the pilot's feet round to the window
  the seams are where KSC-63-MA9-174 and S63-09676-E have them, to an inch or two; to the right of
  the hatch they are No. 11's, which GPN-2000-001335 bears out; between 345° and 75° on the far
  side of that, and under the window and the hatch, they are No. 11's untested.
- **The emblem is a guess at a shape seen edge on.** That it was white, pointed and lettered FAITH
  over a 7 is in the photographs; that it was a five-pointed star is the later insignia's. Its
  paint stands 0.1 to 0.17 in off the skin, in two layers.
- **The umbilical's door is where the umbilical was before**, under the periscope. Nothing read
  says so of No. 20. The plain plate round it is in one photograph, at the cone's limb.
- **The beacon's canister and the Geiger tubes are placed off two sketches** and sized by what
  they held. How the canister was fixed to the pack is ours.
- **The retropack is crowded by guesswork.** The dipole antenna's units are where Sigma 7's model
  has them, which is an estimate, and the beacon's canister is where a sketch puts it: the two
  nearly touch at the pilot's feet, and the real pack cannot have had them so. No stripes are
  painted on the pack, as Sigma 7's has: no photograph of No. 20's retropack has been read.
- **The third peroxide tank, the second oxygen bottle, the bigger batteries, the water and waste
  tanks** are not modelled: they are what the flight was about, and none shows from outside.
- **The panel is No. 11's drawing with a new centre.** Figure 17-7(b) shows more than that: nine
  round instruments in the right section where the model has No. 11's, a WATER SEPARATOR pair of
  lights, three small lamps beside FIRE RETRO, a left console with balloon and beacon switches and
  two handles under CLOSE VISOR, and a hinged plate with a latch where the Earth-path indicator had
  been. None of that is built. The pilot's desk and map are not built.
- **The television is a camera on a post.** Its control unit, transmitter, lenses and cable are
  not modelled, and its bracket is ours.
- **The pilot's suit is the earlier one** in boots, shoulders and harness, on a figure of Cooper's
  height. There is no model of him standing.
- **Little of the flight's hand-held equipment**: the Hasselblad is in its kit, where Sigma 7's
  was; its film packs and filters, the 35 mm zodiacal-light camera, the 16 mm camera, the
  photometer, the dosimeters and emulsion packs and the food are not modelled.
- **The heat shield is the heat sink's shape in another material.**
- **No mass properties are used**; none has been read for this capsule.
- Everything listed in [Aurora 7's spacecraft.md](../ma-7-aurora-7/spacecraft.md),
  [Friendship 7's](../ma-6-friendship-7/spacecraft.md),
  [Liberty Bell 7's](../mr-4-liberty-bell-7/spacecraft.md) and
  [Freedom 7's](../mr-3-freedom-7/spacecraft.md) for the parts shared with them.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Mercury-Atlas 9".
