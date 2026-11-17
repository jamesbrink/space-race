# Apollo 7 — CSM-101 / SA-205

Walter M. Schirra Jr., Donn F. Eisele and Walter Cunningham launched from Cape Kennedy’s
Launch Complex 34 at 15:02:45 UTC on 11 October 1968. The first crewed Apollo flight tested
the redesigned Block II command and service modules in Earth orbit. It carried no lunar module.

## Model status

The Gallery presents CSM-101 on Saturn IB SA-205. Open Cutaway on the whole stack to see the H-1 engines and tank cluster, the J-2, S-IVB common bulkhead, instrument racks, service-module power and propulsion equipment, the three crew couches and the packed parachutes under the apex shield. The adapter carried no lunar module. Its four hinged panels open during the exploded exhibit and remain attached to the stage.

Use **Sit in the cabin** or **C** to visit Schirra’s, Eisele’s and Cunningham’s positions. The five windows, console and unpowered DSKY can be inspected at full detail. The three eye positions and lighting are estimates. The model is a gallery exhibit. The launch site, crew figures, weather reconstruction and flight simulation remain future work.

- [Saturn IB and instrument unit](../../vehicles/saturn-ib.md)
- [Service-module tanks, fuel cells, radiators and engine](../../vehicles/service-tanks.md)
- [CSM stations, exterior and cabin](spacecraft.md)

## Sources read

- NASA, *Apollo 7 press kit*, release 68-168K, 6 October 1968, pp. 25–33 and
  illustrations 25a–25d: spacecraft and Saturn IB dimensions and exterior configuration.
  https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A07_PressKit.pdf
- NASA’s *Apollo by the Numbers*, Apollo 7 chapter, already cited by `missions/history.ts`,
  provides the existing mission story; that file’s history is reused by the Gallery.
  The launch timestamp and hardware identity are checked against NASA’s Apollo 7 summary
  in *Apollo by the Numbers* (NASA SP-4029).

The press kit is a preflight document. Its planned orbital events are not substituted for
the flown record. No flight timeline or simulator plan has been created from it.

## Assembly milestone

The Gallery now includes the full SA-205 stack: S-IB, eight H-1 engines, aft interstage,
S-IVB and its J-2, instrument unit, closed spacecraft adapter, CSM-101, boost protective
cover and launch escape system. The gallery groups selectable hardware by spacecraft, launch escape system and launch vehicle.
The adapter and cover come away in an **exhibit arrangement**, not a timed separation sequence.
The three couches can be occupied in the gallery. The source model can also produce
standalone CSM and CM stills with `pnpm model apollo-7 --preview <directory>`.

## Structural-station milestone

The aft and forward heat shields now split at the Block II stations in NAA
A-512S ST-428A. The CSM barrel, datum chain, RCS axial station and nominal SPS
extension bounds replace initial estimates; the CM/SM fairing closes the external
connection. See `spacecraft.md` for source units, assumptions and remaining defects.
The internal structures and equipment use the same station datum.

## Pressure-vessel milestone

The bare cabin sidewall now has two source-derived tapers and four measured fixed
window interfaces. Its outer hatch-frame contour is retained as curved data,
without guessing a door from it. The structural cutaway uses the Gallery's existing
shell system. [Pressure-vessel notes](../../vehicles/pressure-vessel.md) describe the
calculations, checks and limits. The nominal aft bulkhead is now a separate spherical
reference surface. The flat forward bulkhead now joins a measured tunnel-entry
interface with an explicitly derived transition. The fitted cabin and forward-compartment estimates are described in the spacecraft notes.
Its 173-inch radius is explicitly assumed common primary geometry from NASA
TN D-6979, Figure 8, whose inner-wall points independently match the Block II wall.

## Main-console reference milestone

Apollo 7's own panel layout is now identified in NAA V36-976018 revision D,
12 March 1968. A [blank structural reference](../../vehicles/main-console.md)
uses the shared contour from the Smithsonian's processed CM-107 derivative,
explicitly assumed for CM-101. It retains the central notch and stays with the
CM during explosion. Two fixed FDAI interface contours are now retained from the
same processed survey, with their corresponding positions verified against the
CM-101 layout. Separate estimated instrument fronts now occupy those interfaces. It is not an operable console:
individual panel joints, other instrument openings, thickness, supports, controls
and side consoles are unresolved.
Neither Apollo 11's later equipment nor its different couches are imported.

## Common-datum correction

The nominal outer aft apex is now registered at Xc **−1.30 in**, from NASA
TN D-3888, Figure 2, p. 27, rather than being conflated with the heat-shield
structural datum. The same source-backed offset applies to the nominal outer
profile, fixed openings, side hatch, inner interfaces and console. It removes
the console's former overlap with the nominal pressure wall without trimming
or independently moving the console. Absolute survey accuracy and as-built
installation clearance are not established; this remains an assumed common datum.

## DSKY component work

A [standalone front-housing reference](../../vehicles/dsky-housing.md) now builds
from the dimensioned 2004968E drawing transcription, with all nineteen switch-bore
positions checked against the drawing. It has three rebuilt mesh levels and can
produce native Blender stills. It is not installed in the flight model: the
available parent-assembly drawing predates the required -041 configuration, and
the exact cabin mounting pose is unresolved. Keys, indicators and labels are not
guessed or copied from later DSKY revisions.

A separate [shared front-web reference](../../vehicles/dsky-front.md) is now
installed on the main console. Both flight DSKY parts lists identify cover
2004739-001. Its nominal front sheet is built from the drawing transcription,
with older nominal CAD display openings; the separately extracted shared E/L
contour conflicts with the nominal outer contour and remains uninstalled.
The .050-inch web is derived from the stock drawing's .04–.06-inch section.
The shared CM-107 metal plane supplies a rigid, unscaled reference pose; the
blank console is masked beneath it. Nineteen keys, two display windows, unpowered legends and an estimated enclosure follow the preserved Apollo 7 instrument. Rear ribs, mounting pockets and electronics remain unresolved.


## Lettering correction

SA-205's markings now use painted capital bounds, rather than a font's em size.
UNITED STATES follows the individual black fuel tanks, on white painted fields;
USA has a taller, narrower layout. The estimates and uncertainty from actual
SA-205 NASA photographs are explicit in the gallery and
[hardware notes](../../vehicles/saturn-ib.md#photographic-marking-reconstruction).
These photo-derived dimensions carry estimated confidence and are used only for the exhibit.

## Unitized couch reconstruction

The cabin now contains the common three-person platform, headrests, fixed
seat/leg assemblies, six-point harnesses, passive heel restraints and eight
attenuator exteriors. NASA TN D-7440 documents the Apollo 7 configuration;
the 96° flight angle, from a North American plate for SC101 not yet located, is estimated. Complete manufactured
sizes and mounting drawings were not located, so these dimensions and positions
are **estimated** from the flight-design photograph and illustrated installation.
Earlier SC012 back-pan and beam dimensions are scale priors, **not verified
shared CM-101 measurements**. No later foldable couch is used.
[The hardware record](../../vehicles/unitized-couch.md) lists the estimates,
sources and omissions. The assembly remains whole in cutaway, moves with the
CM in the exploded exhibit, and is omitted at distant levels of detail.
The three gallery seats use estimated eye offsets from the headrests.

## Main-panel equipment study

The main console now has two estimated FDAI front reconstructions, a partial EMS
facade, meter fronts, control rows, warning lenses and the timer window, following
CM-101's own V36-976018 revision D. [The equipment record](../../vehicles/console-equipment.md)
distinguishes the estimated layout registration from the unchanged shared structure.
All controls and displays are static exhibit references. Exact scales, individual
control mechanisms and fine panel legends remain simplified. The fronts remain whole in cutaway and move rigidly with the CM.
