# Gemini Agena Target Vehicle

Lockheed's Agena D fitted out to be met and docked with: its own engine restartable, two small
rocket packs added at its tail, and McDonnell's docking adapter
([target-docking-adapter.md](target-docking-adapter.md)) on its nose. Six were launched on Atlases
from Complex 14; four reached orbit and were docked with (Gemini VIII, X, XI and XII). Model:
[agena_target_vehicle.py](agena_target_vehicle.py), built by a flight's `model/vehicle.py` through
[gemini_stack.py](gemini_stack.py). **A flight chooses its vehicle**, as it chooses what stood at a
pad: `target=GATV_5003`, a `Unit` that records what that vehicle had ("One vehicle from the next",
below). Its flight data, said once, is in [gemini-targets.ts](gemini-targets.ts): where each part
goes, the words of the parts that were the same on every vehicle, its dimensions and engines.
First built for GATV-5003, Gemini VIII's ([the flight](../flights/gt-8/README.md)).

**It is built as it was in orbit**, without the shroud over its docking adapter or the adapter that
joined it to its Atlas, and **standing on its engine's nozzle beside the launch vehicle**, 20 ft
from the Titan's axis. That is an exhibit's arrangement: it went up from another pad, and never
stood on anything but an Atlas.

Stations are Lockheed's GATV stations, in inches, running aft: the docking adapter is bolted on at
229.50 and the nozzle ends at 495.02. Round the vehicle, angles run from −Z, its top in orbit,
"clockwise (looking forward)" through +Y at 90°; +Z is the Earth side.

Sources, short: **LSFR**, *Gemini Program Launch Systems Final Report* (Aerospace, January 1967),
section III.C and Figure III.C-2; **catalog**, Lockheed's *NASA Agena D Mission Capabilities and
Restraints Catalog*, vol. II (LMSC-A604166-2, 8 October 1965), sections 13, 14 and 16; **GVIII**,
the Gemini VIII mission report (MSC-G-R-66-4), Figures 3.0-2 and 3.4-2 and section 3.4, which
lists only what GATV-5003 changed from GATV-5002; **kit**, NASA release 66-52; **S66-25781** and
**S66-25782**, NASA photographs of GATV-5003 taken from Gemini VIII before the docking. The
baseline description of the vehicle is in the Gemini VI mission report, which was not found.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Diameter | 60 in (1.524 m) | documented | LSFR, Figure III.C-2 |
| Length in orbit, cone run out | 313.145 in (7.954 m): station 181.875 to 495.02 | derived | LSFR, Figure III.C-2; GVIII, Figure 3.0-2(a). The kit has "LENGTH (orbit) 26 feet, minus shroud and adapter" (p. 80) |
| Docking adapter / auxiliary forward rack | station 229.50 | documented | GVIII, Figure 3.0-2 |
| Auxiliary forward rack | 17.5 in, to station 247.00, "the standard Agena payload interface" | documented | LSFR, p. III.C-3; catalog, Figure 13-10 |
| Forward section | 40.5 in, station 247 to 287.5 | documented | catalog, 13.2.1 |
| Tank section | station 287.5 to 384 | documented | LSFR, Figure III.C-2; catalog, 13.2.3 (383.84) |
| Tanks, over their ends | 129.08 in, "including the hemispherical ends" | documented; the bulkhead between fuel and oxidiser (station 330) a guess | LSFR, p. III.C-7. Each end stands 16.3 in beyond the section |
| Where it parted from the Atlas's adapter | station 385.4 | documented | LSFR, Figure III.C-2 ("pyro separation plane"; the catalog's Figure 13-2 has 384.966) |
| Aft equipment rack | station 411.86 to the aft bulkhead at 462.5 | documented | catalog, Figures 13-9 and 14-6 |
| Rack, across | 30 in between the faces the secondary modules hang on, 46 in the other way; 54 in over the modules | estimated | the catalog writes "APP 32" and "APP 54" on Figure 13-9; the 46 is scaled from Figure 14-6 and S66-25782 |
| Nozzle exit | station 495.02 | documented | GVIII, Figure 3.0-2(a); catalog, Figure 13-2 |
| Nozzle, across the exit | 32.6 in | estimated | 33 in on the catalog's Figure 14-6, 30 in in S66-25782 |
| Nozzle extension | radiation-cooled titanium, from about station 470; 45 to 1 | material and ratio documented; where it begins estimated | catalog, 14.2.1 |
| Engine | Bell 8247, 16,000 lb, pump fed, restartable from start tanks | documented | LSFR, p. III.C-13; catalog, 14.3.1 |
| Secondary propulsion | two modules "on opposite sides", each a 200 lb chamber and a 16 lb one, firing aft; on the +Y module the small one toward the top, on the −Y the large one | documented; a module's size scaled from the catalog's Figures 14-5 and 14-6 | LSFR, p. III.C-15 |
| Attitude jets | six of 10 lb, in two clusters at 0° and 180° on the aft bulkhead | documented; their form estimated | catalog, 16.3.2.2 and Figure 13-2 |
| Nitrogen spheres | two of 2,200 cu in (16.1 in across inside) and an auxiliary; the two on the −Z face at stations 426 and 448, the auxiliary opposite at 441, five inches of each standing proud of the rack | volume documented, size derived; places scaled from the catalog's Figure 14-6 | LSFR, Figure III.C-6 ("NITROGEN TANK (3)") |
| Horizon sensors | two heads, either side of +Z, low on the forward section | documented; drawn as two dark blisters at 150° and 210°, station 260, by S66-25782 | catalog, 16.3.1 and Figure 13-2 |
| Running lights | green toward +Y and red toward −Y, 35° either side of the top | documented; their station (234.5) estimated | GVIII, Figure 3.4-2 |
| Antennas | C-band, two S-band, a telemetry blade and two range safety antennas on the forward section; a telemetry stub at the tank's aft end; stubs on the rack | which there were documented; every place and size estimated | GVIII, Figure 3.4-2, which is a sketch without dimensions; LSFR, Figure III.C-6 |
| Tank fairings | two along the tank section; the upper dark, with a row of square openings | number documented; the rest by photograph | LSFR, p. III.C-7; S66-25782 |
| Finish | tank bare polished aluminium; forward section and rack white with a bare band, black panels and a flag 19 in long; thrust cone under a white shield; secondary modules under dark ribbed shields | estimated | S66-25782, the +Y side; the other side is taken to match. Nothing read states the finish |
| Weight | 18,097 lb at launch, 17,686 lb at separation, 7,116 lb in orbit (GATV-5003) | documented | GVIII, 3.6, p. 3-51 |

## Parts

Each a top-level node, a part of the flight's parts list under "Docking target", with its own words;
the first six are the docking adapter's ([target-docking-adapter.md](target-docking-adapter.md)).

| Node | What it is |
| --- | --- |
| `DockingCone` | the cone's two skins, its lip and notch, the three discharge fingers |
| `MooringLatches` | the three hooks in the throat |
| `StatusDisplay` | the three panels over the notch |
| `AcquisitionLights` | the two flashing lights at the adapter's edge |
| `TargetDockingAdapter` | the adapter's shell and structure, the dampers, the mooring drive, experiment S-10's package |
| `TargetTransponder` | the L-band transponder's cover, its two spiral antennas and the dipole on its boom |
| `AgenaRunningLights` | the green and the red lamp on the forward section |
| `AgenaForwardSection` | the forward auxiliary rack and the forward section: skin, paint, horizon sensors, antennas; inside, the guidance and the batteries |
| `AgenaTankSection` | the tank wall, its fairings, the three bulkheads |
| `AgenaAftSection` | the thrust cone under its shield, the aft rack, the nitrogen spheres, the attitude jets |
| `AgenaSecondaryPropulsion` | the two modules on the rack's sides, each with a 200 lb and a 16 lb chamber, under their shields |
| `AgenaEngine` | the Bell 8247: chamber, nozzle extension, turbopump, start tanks |

## One vehicle from the next

Six vehicles were built; four reached orbit and were docked with. What is known to have differed
between those four, from each flight's mission report (section 3.4, which lists a vehicle's changes
from the one before), the Launch Systems Final Report and McDonnell's Technical Summary. The
[Gemini XI mission report](https://tothemoon.im-ldi.com/download_document?file_name=gemini_11_mission_report.pdf&project=GEMINI)
documents the tether hardware and confirms the discharge-finger deletion.

| | GATV-5003 (Gemini VIII) | GATV-5005 (Gemini X) | GATV-5006 (Gemini XI) | GATV-5001, rebuilt (Gemini XII) | Source | In the model |
| --- | --- | --- | --- | --- | --- | --- |
| Docking adapter | TDA 3 | TDA 1A | TDA 6 | TDA 7A | Technical Summary, pp. 333 to 336 | `Unit.tda` |
| Launched | 16 March 1966, 15:00:03.127 G.m.t., on Atlas 5302 | 18 July 1966, 20:39:46.131, on 5305 | 12 September 1966, 13:05:01.725, on 5306 | 11 November 1966, 19:07:58.688, on 5307 | each report, 4.1; Launch Systems report, Table IV.D-2 and Figure III.G-1 | the flight's data |
| Orbit at insertion, nautical miles | 158.8 by 161.3 | 156.6 by 162.0 | 156 by 166 | 156.4 by 162.7 | each report, 4.1 | the flight's data |
| Weight at launch; in orbit | 18,097 lb; 7,116 lb | 18,074 lb; 7,184 lb | 18,105 lb with the shroud; 7,198 lb | 18,071 lb with the shroud; 7,114 lb | each report, 3.6 | the flight's data |
| Experiment S-10, the micrometeorite package on the adapter | fitted; not opened, there being no walk | fitted | not fitted | fitted; opened at 43 h 11 min and "left on the GATV" | Technical Summary, pp. 318 and 334 (adapters 1A, 3, 5, 7A); Gemini XII report, 8.8 | `Unit.s10` |
| Static discharge fingers in the cone | three | three, and a monitor of the charge | removed, as recorded in §3.4 | removed | Gemini X report, 3.4.1.2; Gemini XI report, 3.4(f); Gemini XII report, 3.4(g) | `Unit.discharge_fingers` |
| Mooring | two hardline umbilicals and two limit switches added; unrigidizing and unlatching made separate sequences | not found | no change found | not found | Gemini VIII report, 3.4.1.2 | no |
| Acquisition lights | flash rate "changed from 65 to 55 flashes per minute and a reflector was added to the lower light" | not found | not found | not found | Gemini VIII report, 3.4.1.2 | no |
| Running lights | two batteries for them; the aft green light did not light in flight | one of the batteries removed; on the timer "only the forward three running lights will illuminate" | not found | not found | Launch Systems report, pp. III.C-19 and III.E-4; Gemini X report, 3.4.2.2 | no: see below |
| Velcro on the adapter | three patches in line with the top acquisition light | the same | the same | and more, "at different locations on the TDA cylindrical section" | Technical Summary; Gemini XII report, 3.4(c) | late hook-and-loop patches, positions estimated |
| Experiment S-26, the ion wake | none | sensors and a programmer in the adapter | fitted | none | Gemini X report, 3.4.1.2 and Fig. 8.14-1; Gemini XI report, 8.10 | three analyzer heads and internal programmer |
| Tether | none | none | 100 ft of Dacron stowed on the adapter, one end hooked to a fitting on the cone | the same, "modified to provide a large tether loop"; a clamp for the ship's docking bar on its container | Gemini XI report, 3.4 and Fig. 3.1-2; Gemini XII report, 3.4(a), (f), and Fig. 3.4-1 | two stowed configurations |
| For a man outside | Velcro only | no added restraints documented | two handholds beside the tether container and stowage for a docking-bar mirror | a work station on the cone (a torque wrench and bolt, a fluid disconnect, an electrical connector); two portable handholds; sixteen pip-pin receptacles; four tether rings on the cone's lip and two on the shroud's ring, with two handholds | Gemini XI report, 3.4(c–d); Gemini XII report, 3.4 and Figure 3.4-2 | handholds and EVA work station, with mirror stowage on XI omitted |
| Docking cone | as built | "essentially the same" | the tether's fitting | "modified to include the funnel hole for the telescoping handrail" | Gemini X report, 3.4.1.2; Gemini XII report, 3.4(h) | funnel opening through the cone |
| Balance | full batteries | one primary and one running-light battery out; about 150 lb of lead in the forward auxiliary rack; a stainless steel door in place of a magnesium one | assumed same as GATV-5005 from §3.4 | assumed same as GATV-5006 from §3.4 | Gemini X report, 3.4.1.1; Gemini XI and XII reports, 3.4; Launch Systems report, p. III.E-4 | replacement door, lead block and fewer battery boxes | |
| Finish | not stated: by photograph ("Dimensions", above) | aluminium tape over about 15 per cent of the forward auxiliary rack's and the forward section's skins; "No paint removal, additional painting, or other surface preparation was performed" | assumed tape retained | reflective finish and flag on tank visible in S66-62755 | Gemini X report, 3.4.1.1; NASA S66-62755 | estimated tape pattern and late flag layout |
| Main engine's start | the oxidiser led again, by two pressure switches, after the loss of GATV-5002 | as 5003 | as 5003 | as 5003; "Modified PPS installed" | Gemini VIII report, 3.4.2.1; Launch Systems report, Figure III.G-1 | no (inside) |
| Main engine in flight | a yaw error from the centre of gravity's offset | nothing listed | "Yaw heading error greater than expected during PPS burns" | chamber pressure fell in the ascent burn; the burns with a ship docked were cancelled | Launch Systems report, p. III.E-4; Gemini XII report, 5.4.2 | the flight's words |
| Telemetry antenna for orbit | as Figure 3.4-2 | its receptacle "rotated 90 degrees" | assumed same as GATV-5005 | assumed same as GATV-5006 | Gemini X report, 3.4.2.4; Gemini XI and XII reports, 3.4 | rotated mounting plate with estimated dimensions |

No document read calls the last vehicle "5001A": they write 5001 or 5001R, and its adapter 7A.

## What the model gets wrong or leaves out

- **The Atlas, the booster adapter and the ascent shroud are not built.** The vehicle is shown as it
  was after it had left all three.
- **It stands on its nozzle**, which is thin titanium. It never did.
- **The aft rack is our frame.** Its stations are Lockheed's; its members, the hydraulic package
  and what else hangs in it are placed by guess, and the engine's chamber, turbopump and start
  tanks are representative forms.
- **Everything inside the forward section is a guess**: which box is the guidance module, the
  batteries, the programmer, and where each hangs.
- The shared finish starts from Gemini VIII's photo. The position and widths of the reflective tape
  strips are estimates, with their total area derived from the 15 percent specified for GATV-5005.
  [Gemini XII flight photograph S66-62755](https://www.nasa.gov/image-detail/amf-s66-62755/)
  places its flag on the tank skin, estimated at 28 in wide and centred at station 328. The
  far-side flag is assumed. The remaining far-side finish and fine markings are incomplete.
- **The antennas are placed from a sketch.** A dimensioned antenna drawing would move most of them.
- **GATV-5003's own changes do not show**: a spring mount altered so the shroud could not catch on
  it, the engine's start sequence, a nine-hour reset timer.
- **Two running lights, where the reports speak of more.** The Gemini VIII report's drawing shows a green
  and a red lamp on the forward section, which are built. The same report says the aft green
  light did not come on in flight, and Gemini X's speaks of "the forward three": there were
  lights aft, and a third forward, which no drawing read places.
- **GATV-5003's own fittings are partly built.** Its S-10 package and its discharge fingers are;
  the three Velcro patches on its adapter, the reflector on its lower acquisition light and the
  hardline umbilicals in its cone are not.
- **Nothing moves or burns.** The engine's gimbal, the attitude jets and the docking cone are fixed,
  and the vehicle has no place in a simulated flight.

## Sources

[docs/sources.md](../../../../docs/sources.md), "Gemini-Titan 8 and Gemini-Titan 9A".
