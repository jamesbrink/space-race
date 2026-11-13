# Mercury-Atlas launch vehicle (Atlas D, LV-3B)

The booster for the four orbital Mercury flights, MA-6 to MA-9. Model:
[atlas_lv3b.py](atlas_lv3b.py), imported by each flight's `model/vehicle.py`. Built for Atlas 109-D,
which flew MA-6, and for Atlas 107-D, which flew MA-7; another serial is another number painted on it
(`build(serial=...)`) and whatever its record shows to differ ("One vehicle from the next", below).

**It is a stage and a half.** All five engines are lit on the ground. About two minutes up the two
booster engines, their pumps and the skirt that carries them are dropped as one piece, the booster
section, and the sustainer burns on alone under the same tanks to orbit. Nothing else separates
until the capsule does.

**It has no frame.** The body is one welded stainless steel tank, kept in shape by the pressure
inside it. Everything that is not tank rides on the outside of it.

Convair's stations run in inches from the nose toward the tail; the model keeps them, and
`build(base_z)` places the booster engines' exit plane in the flight's coordinates.

## Dimensions

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Height with spacecraft and tower | 95 ft 4 in (29.06 m) | documented | *Results of the First United States Manned Orbital Space Flight* (Results), Figure 4-11, p. 49; model: 29.067 m (1,144.36 in: 808 in of Atlas and SEDR 104's stations above it) |
| Atlas, engine exits to the adapter's foot | 67 ft 4 in (808 in) | documented | Results, Figures 4-3 (p. 46) and 4-11 |
| Adapter | 50.75 in: the capsule's stations Z52.69 to Z103.44 | derived | SEDR 104, Figure 1-3. Results Figure 4-11 draws 4 ft 3 in; SEDR 104's text says "approximately 4 feet" |
| Adapter's top below the capsule's plane of maximum diameter | 1.06 in (Z103.44 against Z104.50) | derived | SEDR 104, Figure 1-3 |
| Tank diameter | 10 ft | documented | NASA SP-45, p. 85; Results Figure 4-11 |
| Tank's forward cone, upper diameter | "approximately 70 inches" | documented | NASA SP-45, p. 85 |
| Forward mating ring | station 502 | documented | NASA SP-45, p. 95: "the mating structure (Station 502 ring)" |
| Booster engines' exit plane | station 1310 | derived | 502 + 808 in, taking Figure 4-11's 67 ft 4 in to end at the mating ring |
| Where the cone reaches 10 ft | station 642 | estimated | scaled off NASA SP-45, Figure 5-4 (a three-view about 4 in tall), between stations 502 and 1310 |
| Intermediate bulkhead at the wall | station 958; it rises 45 in | estimated | the same figure; NASA TM X-1682, Figure 6 (a later Atlas D) draws it at 960 and 48 in. SP-45's text calls it hemispherical, which neither drawing shows |
| Staging plane (the tank's thrust ring) | station 1133 | estimated | set down from memory of Convair's station list, which has not been read; Figure 5-4 scales it between 1124 and 1141 |
| Thrust cone's apex, the sustainer's gimbal | station 1206 | estimated | scaled off Figure 5-4 |
| Booster section's foot | station 1283 | derived | the engines stand 2 ft 3 in below it: Results Figures 4-3 and 4-11 (whose 2 ft 3 in is read as that; the figure's leaders are not clear); Figure 5-4 scales 1284 |
| Booster section, ribbed above and plain below | ribbed to station 1212 | estimated | NASA GPN-2000-000686 (the liftoff) and Figure 5-4 |
| Width across the booster fairings | 16 ft documented; 16 ft 4 in in the model | documented; estimated | Results Figures 4-3 and 4-11; the model's fairings are scaled off Figure 5-4's end view: 35 in half width, crest 98 in from the axis |
| Booster engines' axes | 63 in from the vehicle's, on the pods' axis | estimated | Figure 5-4, side and end views |
| Nozzle exits | boosters 49 in, sustainer 48 in across | estimated | Figure 5-4's end view |
| Tank skin | stainless steel sheet, 0.048 in to 0.015 in | documented; not modelled as thickness | NASA SP-45, p. 85. The four forward skins were made thicker for Mercury after MA-1 (p. 95) |
| Ring welds | every 32 in | estimated | counted off NASA S62-00380 and the launch preparation photograph |
| Long pod | point at station 855, full by 885; 39 in wide, 14 in proud | estimated | Figure 5-4 ("upper equipment pod") and the photographs |
| Short pod | point at station 980, full by 1022 | estimated | Figure 5-4 ("lower (stub) pod"); it shows on the right limb of the liftoff photograph |
| Oxygen duct | leaves the tank at station 935; 10.6 in across | estimated | Figure 5-4 ("lox line") |
| Rate gyro package | station 686, on the wiring fairing | estimated | Figure 5-4 ("rate gyro"); a canister there in the launch preparation photograph |

## Which way round

| Item | Value | Confidence | Basis |
| --- | --- | --- | --- |
| Pods and booster engines | on one axis; the verniers on the axis square to it | documented | NASA SP-45, p. 85 ("90° around the tank from the verniers") and Figure 5-4 |
| That axis is the pitch axis | the boosters steer in pitch together and roll by yawing apart | derived | NASA SP-45, Figure 5-10 (booster 1: yaw and + roll; booster 2: yaw and - roll; verniers: pitch and roll) |
| The long pod | under the capsule's window | estimated | the fairing from the adapter to the pod's point lies under the name in the launch preparation photograph and in NASA S62-00380 |
| The vernier with the number beside it | 90° round from the long pod, toward the hatch | estimated | the same photographs, and the liftoff |
| The pressurisation line | up the tank from the other vernier | estimated (which side) | NASA S62-00380; that there is one is Figure 5-4's |
| The oxygen duct | 30° from that vernier toward the long pod | estimated | Figure 5-4's end view; the launch preparation photograph |
| On the pad | the pitch axis lay on 105° true; the flight's heading was about 75°, and the vehicle rolled to it between T+2 s and T+15 s | documented | Results, p. 46 |

## Mass and propulsion

| | | Confidence |
| --- | --- | --- |
| Engines | Rocketdyne MA-2: two booster chambers, a sustainer, two verniers, all lit on the ground | documented (NASA SP-45, pp. 85 and 88) |
| Thrust | boosters 154,000 lbf each, sustainer 57,000, verniers 1,000 each | documented, as ratings (the same pages). The press kit for MA-9 gives 150,000 and 60,000 |
| Thrust at liftoff | "approximately 360,000 pounds" | documented (Results, p. 45) |
| Propellants | RP-1 kerosene and liquid oxygen | documented (NASA SP-45, p. 88) |
| Gimbals | boosters 5°, sustainer 3°; verniers swivel 140° in pitch and 50° in yaw | documented (the same page) |
| Liftoff weight | about 260,000 lb | not established for 109-D: *This New Ocean* gives that figure for the missile. No weight is in the model or the flight's data |
| Cutoffs on MA-6 | boosters 00:02:09.6, sustainer 00:05:01.4 | documented (Results, Table 6-II) |

## One vehicle from the next

| | Atlas 109-D (MA-6) | Atlas 107-D (MA-7) | Confidence | Source | In the model |
| --- | --- | --- | --- | --- | --- |
| Number on the fuel tank | 109 D | 107 D, in the same place: either side of the slender fairing above one vernier | documented by photograph | NASA S62-05531, 62PC-52, S62-02849 (MA-7 on the stand and leaving it) | yes: `serial` |
| Insulation under the intermediate bulkhead, and the bulkhead that held it | cut out on the pad, after fuel was found in the insulation | retained | documented | NASA SP-45, pp. 12 and 13; NASA TN D-3814, p. 8; NASA SP-6, p. 13 | yes: `insulation_bulkhead`. Its depth under the intermediate bulkhead (2.5 in) and its material are estimated: nothing read gives either |
| Staging time, as set | 131.3 s; backup 136 s | 130.1 s; backup 132.2 s | documented | NASA TN D-3814, p. 7; *This New Ocean*, p. 446 | in the flight's data |
| Booster engines | | main oxidiser valves of stainless steel for aluminium; improved pneumatic regulators; servo stabilisation for their actuators | documented | NASA TN D-3814, p. 8 | no: inside |
| Tank and propellant utilisation | | the boil-off valve's spring rate, the oxygen tank regulator's range, the propellant utilisation system's calibration and telemetry changed; a fuel drain fitting moved clear of the structure | documented | the same page | no |
| Flight control | | its canisters replaced after the review of 16 May 1962 | documented | NASA TN D-3814, p. 16 | no |
| Markings elsewhere, pods, lines, fairings | as photographed | taken as 109-D's | estimated | the photographs of 107-D read are from further off and show nothing to the contrary: UNITED STATES down the oxygen tank beside the same vernier's line, the long pod and the short one | as 109-D |

Cutoffs on MA-7: boosters 00:02:08.6, sustainer 00:05:09.9 (NASA TN D-3814, Table XVI).

## What was changed for Mercury

From NASA SP-45, pp. 92 to 95 and Figure 5-13. None of these shows on the outside but the adapter;
they are here so that a later flight's model can tell what to look for.

- The abort sensing and implementation system: sensors, two to each, on the oxygen tank's pressure,
  the pressure across the intermediate bulkhead, the turning rates about all three axes, the engines'
  injector pressures, the sustainer's hydraulic pressure and the electrical power. Out of limits, it
  dropped the power to the capsule's abort relays, which fired the escape tower.
- A rate gyro package well forward of the missile's, because the long capsule and tower made the
  tank bend.
- The retrorockets the missile carried to back away from its warhead were taken off; the capsule's
  posigrade rockets did the job, and a fibreglass shield went over the oxygen tank's dome against
  their exhaust.
- No vernier solo: the verniers stop with the sustainer.
- A thinner boil-off valve on the dome; the insulation bulkhead under the intermediate bulkhead
  removed (not from every vehicle: "One vehicle from the next", above); lighter telemetry; a new
  autopilot; baffled injectors; a wet start.
- Thicker skins at the top of the oxygen tank and a stiffened adapter, after MA-1 broke up there.

## Sections

| Node | What it is |
| --- | --- |
| `AtlasAdapter` | the Mercury adapter: corrugated titanium over a titanium inner skin (SEDR 104, 2-14 and Figure 2-9: documented), the clamp ring of three segments and three explosive bolts with a fairing over each (2-15 and Figure 2-10: documented), the access door, the cup on three straps under the retropack. The clamp's band shows red in the liftoff photograph: its colour is that photograph's. The count of ribs (108) is off a photograph |
| `AtlasTank` | the tank from the mating ring to the thrust cone's apex: frost on the oxygen tank and bare stainless below, the ring welds, the two bulkheads (and under the intermediate one, on a vehicle that kept it, the insulation bulkhead), the fibreglass shield and the boil-off valve inside the adapter, the oxygen duct down the outside of the fuel tank, UNITED STATES and the vehicle's number |
| `AtlasPods` | the long pod, the short pod, the wiring fairing and the rate gyro package |
| `AtlasVerniers` | the two verniers, each under a hood; the slender fairing above one and the oxygen tank's pressurisation line above the other |
| `AtlasSustainer` | the sustainer's chamber and bell, its pump and its turbine's exhaust |
| `AtlasBoosterSection` | the skirt, ribbed above and plain below, the two engine fairings, the radiation shield across the foot, a ring beam and two thrust barrels inside |
| `AtlasBoosterEngines` | the two booster chambers and bells, their pumps and the gas generator's exhaust duct |

In the gallery the vehicle comes apart as it staged: the booster section and its engines first,
aft; then the capsule from the adapter.

## What the model gets wrong or leaves out

- **Most of its stations are scaled off one small drawing** (NASA SP-45, Figure 5-4, the "basic
  Atlas configuration") between two documented ones 808 in apart. Read to a pixel, that is good to
  about 5 in. The drawing is of the Atlas D, not of the Mercury vehicle, and Convair's own drawings
  and station list have not been read.
- **The staging plane's station is from memory.**
- **The frost and the lettering are both shown.** At liftoff the frost on the oxygen tank hid
  UNITED STATES (NASA GPN-2000-000686); it is plain on the bare tank in the photographs of the
  preparations. The frost's edge is a clean line at the bulkhead, and there is none on the
  pressurisation line or the oxygen duct.
- **UNITED STATES is on one side**, where the photographs show it. Whether it was repeated on the
  other is not established. The same is true of the number.
- **The pods are plain fairings**: no doors, stencils or maker's mark, which the photographs show.
  What each held is not established, and the cases inside are representative. Where the abort
  sensing system's units and Mercury's forward rate gyros were is not established: the one package
  modelled is where the Atlas D's drawing has a rate gyro.
- **The engines are representative.** Bells, chambers, pumps and ducts are there; their forms are
  not from a drawing, the bells' tubes are a count of ours, and the booster engines' cant is left out.
- **The booster section's ribs** (96), the fairings' exact section and the radiation shield's form
  are estimates. The jettison tracks, the latch, the helium bottles, the fill and drain fittings and
  the ground disconnects are left out.
- **A round mark on the oxygen tank** below the adapter (NASA S62-00380) is left out: what it was
  has not been read.
- **The slender fairing above one vernier** is from the photographs; what it covers is not established.
- **The adapter's vent port** is opposite its door (documented); where the door is round the vehicle
  is off one photograph, and the vent's fibreglass shield is left out. The six cables that keep the
  clamp ring's segments with the adapter, and the stretch fittings, are left out.
- **The tank's skins are one thickness, and its bulkheads' and domes' rises are estimates.** No
  baffles, no propellant utilisation system.
- **No mass properties, no thrust curve.** The flight cannot be flown yet.
- **Its levels of detail change at the viewer's own distances**: they have not been measured.

## Sources

[docs/sources.md](../../../../docs/sources.md), "Mercury-Atlas 6" and "Mercury-Atlas 7".
