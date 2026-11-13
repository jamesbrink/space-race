# Mercury spacecraft No. 18, as flown on MA-7

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. Station 0 is the heat shield's maximum-diameter plane and positive is toward the nose
(McDonnell's Z104.50). Angles are round the cone from the pilot's right as he lies: the periscope
is at 90°, under his feet, and the window at 270°, over his head. The drawings are in inches, so
the model is too. The script builds the capsule in that frame and then turns it 45° about its long
axis (`mercury_capsule.stand`), so that in the GLB the hatch is on +X; `flight.ts` quotes its
azimuths in the pilot's frame and adds the turn (`STAND`).

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts).

**The model is the capsule as launched**: retropack on, tower on, periscope in and its door shut,
the balloon in its can.

No. 18 is built from the same places as No. 13, and from nothing copied:

- what every Mercury capsule so far shares: [mercury_capsule.py](../../vehicles/mercury_capsule.py),
  recorded in [Freedom 7's spacecraft.md](../mr-3-freedom-7/spacecraft.md);
- what No. 11 was the first to have (the window, the explosive hatch, the shingles round them, the
  panel): Liberty Bell 7's own script and [mercury_cabin_11.py](../../vehicles/mercury_cabin_11.py),
  called from this flight's script with what No. 18 had otherwise
  ([Liberty Bell 7's spacecraft.md](../mr-4-liberty-bell-7/spacecraft.md));
- what the orbital capsules had (the ablation shield; the balloon's container):
  [mercury_orbital.py](../../vehicles/mercury_orbital.py);
- what was No. 18's own: this flight's script and [mercury_cabin_18.py](../../vehicles/mercury_cabin_18.py).

## What made No. 18 different from No. 13

The report of the flight lists twenty-one differences (NASA TN D-3814, pp. 5 and 6) and dates each
change (Table IV, pp. 31 and 32). All of them are here; the last column says which reach the model.

| What | No. 13 (MA-6) | No. 18 (MA-7) | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Recovery aids | SOFAR bombs and radar chaff | deleted, 14 February 1962: "not considered necessary" | documented | TN D-3814, p. 5 and Table IV; NASA SP-45, p. 12 | neither capsule's model has them |
| Earth-path indicator | fitted | deleted: "moderately heavy" | documented | TN D-3814, p. 5; *This New Ocean*, p. 445 | yes: a blank plate in its place (the plate is estimated) |
| Humidity and coolant-quantity indicators | on the panel | deleted, 14 February: "marginal" | documented | TN D-3814, p. 5 and Table IV | yes: blank plates |
| Oxygen partial-pressure indicator, oxygen-quantity telelight | fitted | indicator deleted 10 January; the light disconnected | documented | TN D-3814, pp. 5 and 61 | no: neither is on No. 11's drawing |
| Instrument-observer (panel) camera | carried | removed, 9 April | documented | TN D-3814, p. 5 and Table IV | not built in either |
| Zero-gravity experiment | none | a glass sphere of liquid "in the position formerly occupied by the instrument-panel camera", 4 May | documented (what and that); estimated (where) | TN D-3814, pp. 32 and 73, Figure 30 | yes: see "Zero-gravity experiment" |
| Balloon | none | a 30 in balloon and its bottle in a container "in the antenna canister under the destabilizer flap", 19 April | documented; estimated (its size and place) | TN D-3814, pp. 70 to 72 and Figure 29 | yes: see "Balloon" |
| Knee and chest straps | on the couch | removed | documented | TN D-3814, p. 5; *This New Ocean*, p. 445 | yes |
| Couch liner | | "a new and more resilient liner" | documented | *This New Ocean*, p. 445 | no |
| Window filter | a red filter | removed | documented | TN D-3814, p. 6 | neither model has one |
| "Maneuver" switch | none | on the panel, 2 April: stops the gyros' slaving and the pitch precession | documented; where not established | TN D-3814, p. 6; NASA SP-6, p. 4 | no |
| Steam-vent temperatures | | a dual indicator on the panel, 12 April | documented; where not established | TN D-3814, p. 6 | no |
| Temperature survey | | a low-level commutator and pickups at 28 points; **a white paint patch on one shingle** | documented | TN D-3814, pp. 6 and 66; *This New Ocean*, pp. 445 and 446 | the patch: see "Paint" |
| Landing-bag switches | either could signal | rewired, 3 March: both must close | documented | TN D-3814, pp. 6 and 61 | no |
| Parachute barostat | two | a third, in the cabin, 19 May: no deployment above 11,200 ft | documented | TN D-3814, pp. 6, 32 and 66 | no |
| Emergency drogue switch | | also puts the periscope out and blows the snorkel doors | documented | TN D-3814, p. 61 | in the periscope's times (`flight.ts`) |
| 1 lb and 6 lb thrusters | stainless screens | platinum screens, a distribution plate, 18 April | documented | TN D-3814, p. 6; NASA SP-6, pp. 4 and 5 and Figure 1-4 | no: inside |
| Blood pressure | by hand | semi-automatic, 24 January | documented | TN D-3814, p. 6 | no |
| Telemetry, sequencing, cooling | | low-frequency telemetry up 500 kc; the ¼ g relay locked in at cutoff; the inverter cold-plate check valve and the suit's constant-bleed orifice deleted; HF on at tower separation | documented | TN D-3814, pp. 6 and 61 | no |
| Weight | 4,265 lb at launch | 4,244.09 lb at launch; 2,974.56 in orbit; 2,663.36 at entry; 2,557.70 at main parachute; 2,407.83 afloat | documented | TN D-3814, p. 7 | not used |
| Hatch | 70 bolts, refitted | 70 bolts, "aligned properly"; never blown | documented | *This New Ocean*, p. 447; TN D-3814, p. 67 | yes: 70 bolts |
| Shingle under the window | (taken as No. 11's: one stack of beads) | two stacks of beads side by side | documented by photograph | NASA S62-03907; the colour photograph of the emblem | yes |
| Paint | *Friendship 7* by hand; UNITED STATES twice | the Aurora 7 emblem; UNITED STATES twice; the white patch | documented by photographs; every place estimated | see "Paint" | yes |

## What is assumed the same

Nothing read says these differed from the capsule named; nothing read says they did not.

| Item | Taken from | Why |
| --- | --- | --- |
| Where the window stands, its plate and rim | No. 11 | NASA S62-03907 shows the same plate, the pane's foot just above the seam the emblem's shingle begins at |
| Where the hatch is and its two shingles | No. 11 | the same photograph and S62-04018 have the hatch beside the window on the pilot's right; the emblem's last letter ends at its edge |
| The shingle layout elsewhere (twelve columns, seams at stations 24.8 and 46.8) | No. 11 | 62-MA7-73 shows the seam at 24.8 running on to the left of the window under UNITED STATES; the far side has not been compared |
| Where the periscope's door and the umbilical are | No. 11 | no photograph of that side of No. 18 has been read |
| The roll jets, low on the cone | No. 11 | as built for No. 11 "by judgement"; 62-MA7-73 shows a round fitting marked J37 below the emblem, not modelled |
| Heat shield, retropack, recovery compartment, antenna canister, escape tower, pressure vessel | No. 13 and No. 7 | "essentially identical to that of spacecraft 13" (TN D-3814, p. 5) |
| The cabin's lining, couch, controllers, stowage, lights and panel | No. 11 | below |

## Paint

All of it is placed from photographs; none of the places is dimensioned.

| Item | As modelled | Basis |
| --- | --- | --- |
| The emblem | on the shingle under the window, laid out from the shingle's upper left corner (255°, station 24.8) in inches right and down (`RINGS`, `SEVEN`, `AURORA`) | a colour photograph taken square on (Commons: *Aurora 7 insignia proper.jpg*), scaled by taking the shingle as the model's 16.3 in wide; NASA S62-03907 and 62-MA7-73 for where it sits |
| its 7 | blue with a pale edge, 7.5 in wide and 9.75 in tall, its bar beginning at the shingle's edge and its foot under the word | the same. The figure is a chancery typeface's 7 stretched to that box, not her brush |
| its rings | four circles of rays in one layer: cream, 6.8 in across; orange, 4.6 and 2.6 in; pale blue, 5.2 in. Where two cross, one is broken | the same photograph. The colours are read off it; how many rings there were and which lay over which is not certain in it |
| AURORA | white capitals 16.4 in long and 3.4 in tall at station 16.95, ending at 287°, the hatch's edge; their sides waver by rule | the same, and S62-03907, where the last A touches the hatch's sill. The model's shingle ends at 285°, so the last letter lies on the hatch's border |
| UNITED STATES, first | two lines 23 in long, letters 6 in tall, centred on 212° at stations 38.4 and 31.3: its right end 6 in from the window's plate | TN D-3814, Figure 25 (square on, after the flight); 62-MA7-73; S62-03907 |
| its flag | 12 by 6.3 in at 208°, station 20.2: below the seam at 24.8, under the middle of the lines and a little to the left | the same |
| UNITED STATES, second | the same size, centred on 20°: round to the right of the hatch | NASA 62PC-52 (the liftoff, in colour), where it faces the camera above "107 D". Good to perhaps 15° round the cone |
| its flag | at 28°: under the last letters | the same photograph, in which it is a few pixels |
| White paint patch | 4 in square, its middle at 188.6°, station 44.2: over the U of the first UNITED | documented that it was there and what it was for (TN D-3814, p. 66: "shown in fig. 25, upper left of spacecraft"); its size and place read off Figure 25, where it measures about 4.4 by 4.8 in. It is drawn a little smaller to lie on one shingle of the model's layout |

Not modelled: the stencils "CAUTION THERMOCOUPLE" beside the window and "J37" below the emblem
(62-MA7-73). Not established: what was painted between 60° and 180°. No photograph read shows that
side.

## Balloon

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Balloon | 30 in across inflated; two plies of half-mil mylar and aluminium foil; five lunes: bare aluminium, Day-Glo yellow, Day-Glo orange, flat white, a phosphorescent coating | documented; not modelled inflated | TN D-3814, pp. 70 and 71 and Figure 29 |
| Line | 100 ft of 6 lb nylon from a reel, to a strain gauge in the bottom of the container | documented; not modelled | p. 71 |
| Liners | two half-cylinders of balsa "about 6 inches long and 3 inches wide", one orange and black, one yellow and black | documented | p. 71. Modelled 6 in long, 3 in across together, one orange and one yellow |
| Container | 3.5 in across and 6.9 in deep, let into the canister's top under the flap, toward one end of it | estimated | drawn round the liners; "under the destabilizer flap" is the report's, where under it is not: it is put where the viewer's cutaway passes through it |
| Weight | balloon and bottle about 0.5 lb; the installation about 5 lb | documented | p. 71 |

## Zero-gravity experiment

Built by [mercury_cabin_18.py](../../vehicles/mercury_cabin_18.py).

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Sphere | glass, 3⅜ in across | documented | TN D-3814, p. 73 |
| Standpipe | a capillary tube 2 in long and 1¼ in across, with three half-round holes of 5/16 in at its foot | documented (the holes are not modelled) | the same page |
| Liquid | 60 ml, a fifth of the sphere: distilled water, green dye, aerosol solution and silicone; 32 dyne/cm | documented | the same page |
| Case | an aluminium half and a plexiglass half, the sphere hung between them on four plexiglass tabs | documented; the tabs not modelled | the same page |
| Mounting plate | 4.7 in square | estimated | scaled against the sphere in Figure 30's two photographs |
| Place | beside the pilot's helmet on his right, facing the camera on the panel | estimated | Figure 30's sketch of what that camera saw; "the position formerly occupied by the instrument-panel camera" (p. 32), which is not placed for this capsule by anything read. In No. 7 that camera was at the left of the head |

## Cabin

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Panel layout | No. 11's, with three instruments blanked | documented as a drawing of No. 11's; estimated as this capsule's | no figure of No. 18's panel has been read. NASA SP-6 gives none |
| Blank plates | over the Earth-path indicator, the humidity gauge and the coolant gauge | documented (that each was deleted); estimated (the plates) | TN D-3814, p. 5. The new dual steam-temperature indicator may have stood in one of these places |
| Chest mirror | 5.2 in across its rim, laid on the chest by the cabin, as for No. 13's pilot | documented (that he wore one: "the parabolic mirror on his chest", *This New Ocean*, p. 447; the life vest was "on the chest beneath" it, p. 445); estimated (its size and how it was held) | |
| Straps | shoulder and lap straps and toe caps; no knee strap, no chest strap | documented | TN D-3814, p. 5 |
| Hatch | 70 bolts | documented | *This New Ocean*, p. 447 |
| Cabin lights, couch, controllers, stowage | as No. 11's, which are No. 7's | estimated | nothing read |

## The pilot

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| The figure | the Mark IV suit as modelled for Shepard (5 ft 11 in), on the couch, with the tag reading M. S. CARPENTER | estimated | `crew/mark_iv_suit.py`, unchanged but for the name. Carpenter's height has not been found in anything read |
| What his suit had that the model has not | pockets on the upper sleeves and lower legs; a life vest on the chest under the mirror | documented; not modelled | *This New Ocean*, p. 445 |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `HeatShield` | the ablation shield (`HeatShield_Ablator`) and its ring of fasteners |
| `Retropack`, `RecoveryCompartment`, `EscapeTower` | as Freedom 7's |
| `AntennaCanister` | as Freedom 7's, and the balloon's container (`Antenna_BalloonCanister`) with its two liners |
| `Afterbody` | No. 11's shingles, plates, structure, attach ring, periscope, door, umbilical and roll jets, with two stacks of beads under the window; this capsule's lettering, flags, white patch and emblem (`Afterbody_Emblem*`, `Afterbody_Seven*`, `Afterbody_Name`) |
| `Window` | as No. 11's |
| `Hatch` | as No. 11's, with seventy bolts |
| `CrewCabin` | as No. 11's less three instruments and two straps; the zero-gravity experiment (`ZeroG_*`); Carpenter's name on the suit |

The same GLB holds the launch vehicle's seven nodes: [atlas-lv3b.md](../../vehicles/atlas-lv3b.md).

## What the model gets wrong or leaves out

- **The outside is No. 11's with No. 18's paint**, but for the shingle under the window. Its
  window's and hatch's places, its periscope door and its roll jets are Liberty Bell 7's. In this
  capsule's photographs the hatch's lower edge comes further down beside the emblem than the
  model's does.
- **The emblem is a reading of one photograph.** The 7 is a typeface's; the rings are four where
  the photograph may show more, drawn as even circles with rays by rule; where two rings cross, one
  is broken to keep them in one layer. Its paint stands 0.1 to 0.31 in off the skin, in four layers.
- **The white patch is smaller than it measures in the report's figure**, to lie on one shingle of
  a shingle layout that is No. 11's.
- **The balloon's container is drawn round its liners** and its place under the flap is a guess;
  the reel, the strain gauge, the squibs, the nitrogen bottle and the folded balloon are not
  modelled. Under the flap it is hidden until the canister is cut open.
- **The zero-gravity experiment's place is read off a sketch**, and its bracket is ours. On the
  pad its liquid lies in the half behind the plate, where it cannot be seen.
- **The panel is No. 11's drawing with three blanks.** The "maneuver" switch, the dual steam-vent
  indicator, the voice switch's record position, the missing oxygen-quantity light are not on it.
- **The pilot is Shepard's figure with Carpenter's name.** His pockets and life vest are not
  modelled; his height has not been found. There is no model of him standing.
- **Nothing of the flight's hand-held equipment**: the camera and its filters, the photometers,
  the binoculars, the airglow filter (TN D-3814, pp. 88 to 89).
- **The heat shield is the heat sink's shape in another material.** Its centre plug, which this
  flight lost, is not modelled.
- **The periscope's works are No. 11's.** When it moved on this flight is in `flight.ts`
  (`PERISCOPE_EVENTS`): that it drew in at the umbilical's release and went out at separation is
  documented; the instants of its going in after the retropack and out with the drogue are
  derived from the programme, and the second of its going in on the pad is estimated.
- **No mass properties are used**, though this report gives them (p. 7).
- Everything listed in [Friendship 7's spacecraft.md](../ma-6-friendship-7/spacecraft.md),
  [Liberty Bell 7's](../mr-4-liberty-bell-7/spacecraft.md) and
  [Freedom 7's](../mr-3-freedom-7/spacecraft.md) for the parts shared with them.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Mercury-Atlas 7".
