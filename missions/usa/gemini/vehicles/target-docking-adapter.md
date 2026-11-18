# Target Docking Adapter

McDonnell's docking collar: a cone on dampers in a short cylinder, which a Gemini's nose went into.
It was bolted to the front of each Gemini Agena Target Vehicle
([agena-target-vehicle.md](agena-target-vehicle.md)) and of the one Augmented Target Docking Adapter
([atda.md](atda.md)). Model: [target_docking_adapter.py](target_docking_adapter.py), which both of
those import; its flight data, said once, is in [gemini-targets.ts](gemini-targets.ts).

Heights in the model are inches forward of the adapter's aft face, where it is bolted to what carries
it: GATV station 229.50 on an Agena, the adapter's own station 0.030. Round it, angles are from its
top, where the cone's notch is and where the spacecraft's own top (TY, its index bar) comes when the
two are docked: the Agena's −Z, 0°, running "clockwise (looking forward)" through +Y at 90° (Gemini
VIII mission report, Figure 3.0-2(b); Lockheed's catalog, 5.1.3).

Sources, short: **GVIII**, *Gemini Program Mission Report, Gemini VIII* (MSC-G-R-66-4); **GIX**, the
same for Gemini IX-A (MSC-G-R-66-6); **LSFR**, *Gemini Program Launch Systems Final Report*
(Aerospace, January 1967), section III.C; **TS**, *Project Gemini: A Technical Summary* (NASA
CR-1106), pp. 323 to 336; **SEDR2**, SEDR 300 volume 2, Sections XIII to XV; the photographs
Gemini VIII's crew took of their Agena, **S66-25782** (side on) and **S66-25784** (into the cone).

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Diameter | 60.00 in | documented | Lockheed's Agena D catalog, Figure 13-10 (the rack it bolts to); LSFR, Figure III.C-2; SEDR2, p. 15-6 ("5 feet in diameter") |
| Shell, aft face to the plane the shroud is clamped at | 23.795 in | documented | GATV station 229.50 less 205.705 (GVIII, Figure 3.0-2(b); LSFR, Figure III.C-2) |
| Where the shroud's base comes | 22.17 in up the shell | derived | the shroud's nose at station 90.33 and its 117.00 in (GVIII, Figure 3.0-2(a)); TS, Figure 66, gives the same for the ATDA (44.40 less 22.23) |
| Cone's lip, run out | 47.625 in forward of the aft face | documented | station 181.875, "EXTENDED" (LSFR, Figure III.C-2). An Agena's is built so: it waited for its ship unrigidized |
| Cone's lip, drawn in | 41.625 in | documented; not built | station 187.875, "RETRACTED" (the same). GVIII's Figure 3.0-2(a) has 183.83 at launch |
| Cone's lip on the ATDA | 44.40 in | documented | TS, Figure 66 |
| Cone's travel | 6.000 in | documented | LSFR, Figure III.C-2 |
| Cone's mouth | 54 in across | estimated | not dimensioned in anything read. 52.6 in in S66-25782, scaled on the Agena's 60 in; about 55 in on LSFR Figure III.C-2 and TS Figure 66, which are schematic |
| Cone's depth and throat | 22 in deep to a throat 33.2 in across | derived, with a guess | docked and drawn in, the ship's forward face (Z233.97) is 19.53 in forward of the adapter's aft face (spacecraft Z253.50 is that face: GVIII, Figure 3.0-2(b)), which is 22.1 in inside the retracted lip; the ship's nose is 30.68 in across there. The clearance round it (1.3 in) is a guess |
| Cone | two skins, ring and rib stiffened; its inside a dark bronze, its lip pale | the form documented; the skins' spacing (1.3 in) a guess; the colours by photograph | TS, p. 323; S66-25784 |
| Cone's outside | black on an Agena; painted aluminium on the ATDA | documented | GIX, 5.8.1.2: "the black external docking cone surface being painted aluminum" |
| Notch | V-shaped, "with a slot at the bottom of the V", in the top of the cone: 9.2 in wide at the lip, narrowing over 9.5 in to a slot 1.7 in wide that runs on 7 in | the form documented; every size estimated | SEDR2, p. 14-5; TS, Figure 60; S66-25784 |
| Latch hooks | three, in the throat, at the bottom and 60° either side of the top | number documented; places derived from the ship's receptacles | TS, p. 326; SEDR2, p. 13-5 |
| Dampers | seven, three across and four along, in three sets 120° apart, the set behind the notch having two along | documented; their size and form estimated | SEDR2, pp. 14-3 and 14-5 |
| Status display | three panels over the notch, the middle one on a damper: nine lamps, two clocks, a dial | documented; the panels' size and form estimated | SEDR2, p. 14-7; TS, p. 323; LSFR, p. III.C-34 |
| Acquisition lights | two, "top left and bottom right of the docking cone", at the adapter's edge | documented; their angles (42° from the top and bottom) and form estimated | SEDR2, p. 15-20; TS, p. 326 |
| L-band antennas | two spirals in the skin, fed together, and a dipole on a boom | documented; the spirals' places (24° and 204°) scaled from TS Figure 60 and GVIII Figure 3.4-2 | TS, p. 332 |
| Dipole boom | about 85 in off the skin, from the adapter's top near its aft end | height documented; its foot's place and the elements' form by photograph | SEDR2, p. 15-20; S66-25782 has it about 80 in |
| Transponder cover | a white panel on the shell | documented that it was white; which side (the right) and its size a guess | GIX, 5.8.1.2 |
| Shell | bare Alclad aluminium | documented | GIX, 5.8.1.2: "The majority of the TDA was bare Alclad aluminum" |
| Static discharge fingers | three, standing in from the cone | number documented; places and length by photograph | SEDR2, p. 14-14; S66-25784 |
| Experiment S-10 | a hinged package under a fairing on the shell, "in line with the top acquisition light" | documented; its size (8 by 6 by 1.6 in) a guess | GVIII, 3.4.1.2; TS, p. 318 |

## Parts

The adapter is built as six top-level nodes, each a part of its flight's parts list with words of its
own ([gemini-targets.ts](gemini-targets.ts) says the type's once; a flight says what was its own):

| Node | What it is |
| --- | --- |
| `DockingCone` | the cone's two skins, its lip, the notch, the static discharge fingers where carried, the stowed tether hardware on XI and XII, and XII’s handrail receptacle |
| `MooringLatches` | the three latch hooks in the throat |
| `StatusDisplay` | the three panels over the notch: DOCK, RIGID, PWR, MAIN (red and green), ARMED, SEC HI, SEC LO among its nine lamps, two clocks and a dial (SEDR 300 vol. 2, pp. 13-22 and 13-23) |
| `AcquisitionLights` | the two flashing lights and their housings |
| `TargetDockingAdapter` | the shell, its inner face and rings, the dampers, the mooring drive and the transponder's box inside, experiment S-10’s package where carried, the S026 sensors on X and XI, and XII’s EVA station |
| `TargetTransponder` | the transponder's white cover, the two spiral antennas in the skin, the dipole on its boom |

Which adapter a vehicle carried, and what differed from one to the next, is with the vehicles:
[agena-target-vehicle.md](agena-target-vehicle.md), "One vehicle from the next" (adapters 3, 1A, 6
and 7A), and [atda.md](atda.md) (adapter 5).

## Rendezvous and EVA fittings on the later targets

| Adapter | Model | Source and confidence |
| --- | --- | --- |
| 1A, Gemini X | S026's inboard and outboard ion detectors and electron detector on the adapter rim, with programmer under the skin | Gemini X mission report §8.14 and Fig. 8.14-1. Three heads and their roles documented. Azimuth, mounting height and envelopes estimated from the oblique view |
| 6, Gemini XI | S026 and a fibreglass tether canister on the cone, with two fixed grips and a rotary-knob clamp shown stowed. The Dacron tether was 100 ft long | Gemini XI mission report §§3.4, 5.1.10.5.4, 7.1.2, 8.10 and Fig. 3.1-2. Canister, grips, retained webbing and clamp placement within the cone are estimated |
| 7A, Gemini XII | Longer exposed loop, open-sided retainer with one-handed grip, tools and fasteners at the EVA station, portable handles, sixteen pip-pin sockets, six waist-tether eyes, two handles at the shroud ring and the handrail opening through the cone | Gemini XII mission report §§3.1.2.5.1 and 3.4, Figs. 3.1-7 and 3.4-1–2. The arrangement and counts are documented. Model envelopes, clip geometry, individual placements and mounting points are estimated |

The XII target's station carries the Apollo torque wrench and bolt, three stored pip-pins, a
push-turn electrical connector, a hose with a push-pull fluid fitting and the wrench's lanyard.
It is mounted left of the notch on the cone's exterior. The handrail's receptacle is on the
mooring side and is separate from the stowed handle set. The target is shown ready for rendezvous,
before the flight crew moves the portable grips or pays out the tether.

## What the model gets wrong or leaves out

- **The cone's size is not from a drawing.** Its mouth is scaled from one photograph and its depth
  worked from where the ship's nose ends up; a dimensioned drawing of the docking cone would replace
  both.
- **A bulkhead across the adapter's aft end is assumed.** Something closes the adapter behind the
  cone (S66-25784 shows bare metal through the throat); nothing read draws it.
- **The mooring drive, the latch release, the rigidizing linkage, the two approach lights and the
  transponder are boxes and tubes** in roughly the right places. Their forms are guesses.
- **The cone does not move.** It is built at one lip height; the six inches of travel are not a
  motion of the model.
- **Which side the transponder's cover is on** is not resolvable from the drawings read.
- **The status display's lamps do not light** and its dials are not drawn.
- The umbilical plug in the cone and the early three hook-and-loop patches are omitted. XI's
  docking-bar mirror and X's electric charge monitor are also omitted.
- The tether remains folded, with only its outer webbing visible. The clamp, the EVA tools and
  hoses stay where they were stowed. The board omits concealed fastener and pin mechanisms.

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 8 and Gemini-Titan 9A".
