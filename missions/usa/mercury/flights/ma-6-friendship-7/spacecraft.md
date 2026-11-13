# Mercury spacecraft No. 13, as flown on MA-6

What the capsule in [model/vehicle.py](model/vehicle.py) is built from, and how far to trust each
number. Station 0 is the heat shield's maximum-diameter plane and positive is toward the nose
(McDonnell's Z104.50). Angles are round the cone from the pilot's right as he lies: the periscope
is at 90°, under his feet, and the window at 270°, over his head. The drawings are in inches, so
the model is too. The script builds the capsule in that frame and then turns it 45° about its long
axis (`mercury_capsule.stand`), so that in the GLB the hatch is on +X, the side a launch site's
frame gives the hatch; `flight.ts` quotes its azimuths in the pilot's frame and adds the turn
(`STAND`).

**Confidence**: *documented* is a published figure; *derived* is computed from documented ones;
*estimated* was read off photographs or chosen to look right. The same labels are in
[flight.ts](flight.ts).

**The model is the capsule as launched**: retropack on, tower on, periscope in and its door shut.
That the retropack was still on when it came down is the flight's story, not the model's state.

No. 13 is built from three places, and from nothing copied:

- what every Mercury capsule so far shares (stations, the retropack, the recovery compartment, the
  antenna canister, the tower, the pressure vessel): [mercury_capsule.py](../../vehicles/mercury_capsule.py),
  recorded in [Freedom 7's spacecraft.md](../mr-3-freedom-7/spacecraft.md);
- what No. 11 was the first to have (the window, the explosive hatch, the shingles round them, the
  panel): Liberty Bell 7's own script and [mercury_cabin_11.py](../../vehicles/mercury_cabin_11.py),
  called from this flight's script and recorded in [Liberty Bell 7's spacecraft.md](../mr-4-liberty-bell-7/spacecraft.md);
- what the orbital capsules had (the ablation shield): [mercury_orbital.py](../../vehicles/mercury_orbital.py);
  and what was No. 13's own (its paint, seventy bolts, its words): this flight's script and
  [mercury_cabin_13.py](../../vehicles/mercury_cabin_13.py).

## What made No. 13 different from No. 7 and No. 11

| What | No. 7 (MR-3) | No. 11 (MR-4) | No. 13 (MA-6) | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- | --- |
| Heat shield | beryllium heat sink | the same | ablative: "a mixture of glass fibers and resin"; "fiberglass shingles, radially laminated" | documented | *Results of the First United States Manned Orbital Space Flight* (Results), p. 7; SEDR 104 (May 1962), 2-2 | yes: its material; its outside is the heat sink's |
| Landing bag | carried | carried | carried: about 4 ft of rubberised cloth; 24 straps and 24 cables | documented | Results, p. 29 and Figure 2-24; SEDR 104, 2-2 | as the others': a flat ring behind the shield |
| The shield's latch switches | | | two limit switches; one gave the false "Segment 51" signal | documented | Results, p. 29 and Figure 2-25; NASA SP-45, Figure 3-13 | no |
| View out | two 10 in ports | the centreline window | the same window; filters for it carried, a red one among them | documented | NASA SP-45, pp. 10 and 12; *This New Ocean*, p. 445 | the window as No. 11's; no filters |
| Side hatch | latched, 69 lb | explosive, 70 bolts; flew on 69 | explosive; all 70, refitted on the morning after one broke | documented | NASA SP-45, p. 10; *This New Ocean*, p. 423 | yes: 70 bolts |
| Retropack | fired as a test, dropped | the same | fired to come home; kept on through the entry | documented | Results, Table 6-II and p. 9 | as launched; the words on it are this flight's |
| Booster and adapter | Redstone | Redstone | Atlas 109-D; a titanium adapter and a clamp ring of three segments | documented | SEDR 104, 2-14 and 2-15 | yes: [atlas-lv3b.md](../../vehicles/atlas-lv3b.md) |
| Instrument panel | Postlaunch Report Figure 3.1-2 | rearranged; Earth-path indicator, not working | the report prints No. 11's drawing; this capsule added lights showing which inverter fed the bus and a heat-exchanger exhaust temperature gauge, and had an oxygen partial pressure gauge | documented (that the items were there); not established (where) | Results, Figure 2-4 (p. 8) and pp. 55 and 56; NASA SP-45, p. 12 | No. 11's panel: see "Cabin" |
| Earth-path indicator | none | fitted, not working | fitted, for the flight it was made for; left out of the next capsule as "moderately heavy" | documented | *This New Ocean*, p. 445; NASA SP-45, p. 12 | No. 11's, with this flight's words |
| Cameras | pilot and panel cameras | pilot camera, chest mirror | pilot and panel cameras, now with two speeds; a hand camera (35 mm Ansco Autoset) | documented | Results, pp. 7 and 55; NASA SP-45, p. 223 | the pilot camera's lens, as No. 11's |
| Couch, equipment | | more padding at the head | a new couch; a personal equipment container | documented | NASA SP-45, p. 12 | no: No. 7's couch |
| Horizon scanners | | | heater blankets added | documented | Results, p. 56 | no |
| Recovery aids | | | SOFAR bomb and radar chaff, carried on this flight and no later | documented | NASA SP-45, p. 12 | no |
| Control | automatic, fly-by-wire, manual | and rate command | all four; 18 thrusters, 12 automatic and 6 manual; 60.4 lb of fuel | documented | Results, p. 11 and Table 2-I; *This New Ocean*, p. 427 | the jets as No. 11's |
| Weight | | | 4,265 lb at launch; 2,987 in orbit; 2,970 at retrofire; 2,493 at landing; 2,422 recovered | documented | Results, p. 7 | not used |
| Paint | FREEDOM 7; UNITED STATES; flags | LIBERTY BELL 7; a crack; UNITED STATES; a flag | *Friendship 7* by hand, with a red 7; UNITED STATES twice, a flag under each | documented by photographs; every place estimated | see "Paint" | yes |
| Pilot's suit | gloves zipped on | wrist bearings, chest mirror | wrist bearings; red lights on two fingertips of each glove; a wrist pressure gauge; a chest mirror | documented (the mirror: by photograph) | Results, pp. 34 to 37; NASA GPN-2006-000027 in colour | the mirror only: see "The pilot" |

No. 13 was "essentially the same as spacecraft 9", the capsule of the chimpanzee's orbital flight
before it, but for "the couch, a personal equipment container, filters for the window, and some
minor instrumentation and equipment modifications" (NASA SP-45, p. 12); 255 changes were made to it
at the Cape (Results, p. 55). The table is what has been read, not all of them.

## What is assumed the same

Nothing read says these differed from the capsule named; nothing read says they did not.

| Item | Taken from | Why |
| --- | --- | --- |
| Where the window stands (its middle at station 35.8), its plate and rim | No. 11 | the pane's sizes are the orbital capsule's own drawing (NASA SP-45, Figure 19-1); the capsule as kept (NASM A19670176000) shows the same plate over the same shingle |
| Where the hatch is (its middle 45° from the window, stations 18.5 to 45.4) and its two shingles | No. 11 | the pad photographs and the capsule as kept have the hatch beside the window on the pilot's right; its stations are SEDR 104's thermocouples, as for No. 11 |
| The shingle layout (twelve columns, seams at stations 24.8 and 46.8, beads round the cone) | No. 11 | the capsule as kept shows beaded shingles in the same columns round the window and the hatch; the far side has not been compared |
| Where the periscope's door and the umbilical are | No. 11 | no photograph of that side of No. 13 has been read |
| The roll jets, low on the cone | No. 11 | as built for No. 11 "by judgement"; the capsule as kept has two round fittings low on the cone to the left of the window (marked J37 and J20), which are not modelled and may be something else |
| Recovery compartment, antenna canister, escape tower, retropack, pressure vessel | No. 7 | the Results draw the same shapes (Figure 4-11) and the same stations apply (SEDR 104, Figure 1-3) |
| The cabin's lining, couch, controllers, stowage, lights and panel | No. 11 (and through it No. 7) | below |

## Heat shield

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Material | glass fibre and resin, which chars and boils away; "only a few pounds of the shield were boiled away" | documented | Results, p. 7 |
| Diameter and curvature | 74.5 in; 80 in radius | documented for the capsule's mould line (NASA CR-649); assumed unchanged for this shield | the Results' Figure 4-11 draws the same capsule |
| Thickness, weight | not found | | not in anything read |
| Colour | a dark brown laminate | estimated | no colour photograph of this shield before the flight has been read |
| Temperatures | the surface about 3,000 °F; the air ahead of it about 9,500 °F | documented | Results, p. 9 and Figure 2-7 |

## Paint

All of it is placed from photographs; none of the places is dimensioned.

| Item | As modelled | Basis |
| --- | --- | --- |
| *Friendship* | white script 17.5 in long, climbing 11° to the right, its middle at 272° and station 18.6: on the shingle under the window | NASA GPN-2006-000027 (Glenn going aboard) and the same view in colour; NASA S62-00380; the capsule as kept, where its traces remain |
| The 7 | red, edged in white, 9 in tall, through the word between the n and the d, at 275° | the colour photograph. It looks nearer 10 in there; it is made to stand clear of the row of screws above it |
| The lettering's hand | a chancery typeface, made taller and heavier (`BRUSH`) | Cecelia Bibby lettered it by hand (*This New Ocean*, ch. 13 note 22; NASA's caption to her photograph): the typeface is not her hand |
| UNITED STATES, first | two lines 23 in long, letters 6 in tall, centred on 217° at stations 41.6 and 33.2: to the left of the window | the same photographs: the lines' right end stands 4 to 6 in from the window's plate |
| its flag | 12 by 6.3 in at 206°, station 23.5: under the first letters of STATES | NASA S62-00380; the colour photograph |
| UNITED STATES, second | the same size, centred on 24°: round to the right of the hatch | NASA GPN-2000-000686 (the liftoff, in colour), where it faces the camera with a vernier engine below it. Its place round the cone follows from where the Atlas's verniers are taken to stand, and is good to perhaps 15° |
| its flag | at 33°: under the last letters of STATES | the same photograph |

Not established: what was painted between 60° and 190°. No photograph read shows that side.

## Cabin

Built by [mercury_cabin_13.py](../../vehicles/mercury_cabin_13.py), which calls
[mercury_cabin_11.py](../../vehicles/mercury_cabin_11.py) for the whole fit and changes what the
record changes.

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Panel layout | No. 11's | documented as a drawing; estimated as this capsule's | Results, Figure 2-4 (p. 8), "Instrument panels", is the drawing Hammack and Heberlig printed as the MR-4 panel, with its groups named: primary events, cabin pressure control, control systems controls, flight control displays, environmental, voltage, communications. Looked over at 300 to the inch it is the same artwork |
| What this capsule's panel had that the drawing has not | lights showing which inverter fed the bus; a heat-exchanger exhaust temperature gauge; an oxygen partial pressure gauge | documented (that they were there); not modelled | Results, pp. 55 and 56; NASA SP-45, p. 12. Where they stood is in no figure read; photographs of the panel as it is kept (NASM) have not been read against the model |
| Earth-path indicator | as No. 11's: case, window, two dials, three knobs; the globe a bare graticule | derived (layout); estimated (the rest) | as No. 11's; it worked on this flight |
| Hatch | 70 bolts: No. 11's 69 and the seventieth in the place No. 11's model leaves empty | documented | *This New Ocean*, p. 423 |
| Chest mirror | 5.2 in across its rim, laid on the chest by the cabin (`mercury_cabin_11.chest_mirror`, `mirror=True`): the pilot is Shepard's figure, whose suit has none. Grissom's own is now his suit's, hung on his parachute harness | documented by photograph (that he wore one); estimated (its size and how it was held) | the colour photograph of Glenn going aboard |
| Cabin lights, couch, restraints, controllers, stowage | as No. 11's, which are No. 7's | estimated | nothing read; the new couch and the personal equipment container are not modelled |

## The pilot

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Weight | 171 lb 7 oz at 3:15 on the morning; 166 lb 2 oz that evening, on another scale | documented | Results, p. 85 and Table 8-III |
| Height | not found in anything read | | |
| The figure | the Mark IV suit as modelled for Shepard (5 ft 11 in), on the couch, with the tag reading J. H. GLENN | estimated | `crew/mark_iv_suit.py`, unchanged but for the name; the tag's initials are taken as given like Shepard's |
| What his suit had that the model has not | a ball-bearing lock and wrist bearing at each glove; red lights on the index and middle fingers of both gloves, with a battery and switch on the back; a pressure gauge on the left wrist; a blood-pressure cuff's connector; boots of aluminised nylon with tennis-shoe soles | documented; not modelled | Results, pp. 34 to 37 |

## Parts in the model

Top-level nodes in the GLB. These names are the `node` fields in `flight.ts`.

| Node | Contains |
| --- | --- |
| `HeatShield` | the ablation shield (`HeatShield_Ablator`) and its ring of fasteners |
| `Retropack`, `RecoveryCompartment`, `AntennaCanister`, `EscapeTower` | as Freedom 7's |
| `Afterbody` | No. 11's shingles, plates, structure, attach ring, periscope, door, umbilical and roll jets; this capsule's lettering, flags, name and 7 |
| `Window` | as No. 11's |
| `Hatch` | as No. 11's, with seventy bolts |
| `CrewCabin` | as No. 11's, with Glenn's name on the suit |

The same GLB holds the launch vehicle's seven nodes: [atlas-lv3b.md](../../vehicles/atlas-lv3b.md).

## What the model gets wrong or leaves out

- **The outside is No. 11's with No. 13's paint.** Its shingles, its window's and hatch's places,
  its periscope door and its roll jets are Liberty Bell 7's ("What is assumed the same"). What the
  capsule as kept shows and the model has not: the small plates with round fittings above the
  window, and the two round fittings low on the cone.
- **The name is a typeface**, not Cecelia Bibby's lettering, and the 7 is an inch shorter than
  it looks in the photograph. Paint stands 0.1 in and more off the skin it follows.
- **The heat shield is the heat sink's shape in another material.** Its thickness, its laminations
  and its centre plug are not modelled; its colour is a guess.
- **The panel is No. 11's drawing**, and three instruments known to be on this capsule are not on
  it. Its faces are capsule 7's, as on No. 11's model.
- **The pilot is Shepard's figure with Glenn's name.** His gloves, their lights, his wrist gauge
  and his boots are not modelled; his height has not been found. There is no model of Glenn
  standing: the gallery's figure for scale is an outline.
- **Nothing of the orbit's own equipment**: the window's filters, the hand camera, the personal
  equipment container, the new couch, the horizon scanners' blankets.
- **The retropack's straps do not meet under the pack**, as on the other two capsules, and their
  fittings to the adapter's ring (slots every 120°, three striker brackets: SEDR 104, p. 2-23) are
  not modelled.
- **The periscope's works are No. 11's**: the door on its piano hinge, the cartridge, the link between
  them, the well and the housing through the pressure vessel are `mercury_capsule.ScopeWorks` with
  Liberty Bell 7's door, station and tube ([its spacecraft.md](../mr-4-liberty-bell-7/spacecraft.md),
  "Periscope and umbilical": the linkage is estimated there, and how far the door opens is derived
  from it). Nothing read shows this side of No. 13. When it moved on this flight is in `flight.ts`
  (`PERISCOPE_EVENTS`), from the report; that it took five seconds each way when pumped by hand is
  estimated. In the gallery there is no clock, so it stands shut.
- **No mass properties, no orbit, no entry.** The flight cannot be flown: see the flight's README.
- Everything listed in [Liberty Bell 7's spacecraft.md](../mr-4-liberty-bell-7/spacecraft.md) and
  [Freedom 7's](../mr-3-freedom-7/spacecraft.md) for the parts shared with them.

## Sources

[docs/sources.md](../../../../../docs/sources.md), "Mercury-Atlas 6".
