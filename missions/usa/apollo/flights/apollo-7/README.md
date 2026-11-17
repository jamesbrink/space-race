# Apollo 7 — CSM-101 / SA-205

Walter M. Schirra Jr., Donn F. Eisele and Walter Cunningham launched from Cape Kennedy’s
Launch Complex 34 at 15:02:45 UTC on 11 October 1968. The first crewed Apollo flight tested
the redesigned Block II command and service modules in Earth orbit. It carried no lunar module.

## Model status

An exterior study of CSM-101 on SA-205 is available in the Gallery. The launch site,
walkable structures, furnished cabin, suits, weather and flight physics are not built yet.
The five window openings have opaque dark recesses until the cabin and glazing are modelled.
Published rounded envelopes, nominal Block II stations and remaining estimates are
distinguished in `spacecraft.md`.
A structural cutaway exposes the pressure-vessel sidewall and both nominal bulkheads
inside the thermal shell, with a main-console structural reference and a nominal DSKY front-web subset;
the full tunnel and furnishings are unbuilt.
No seat control is offered yet.

The launcher now uses the AS-205 flight evaluation's rounded S-IVB separation
station and the period Saturn IB News Reference's H-1 and J-2 **inside** nozzle
exit diameters. The August 1968 Saturn IB checklist now supplies the H-1 gimbal
plane, mounting radii, outward cants and relative engine/fin clocking. Bell profiles,
exit and chamber stations, and absolute clocking relative to the CSM remain provisional;
[the hardware notes](../../vehicles/saturn-ib.md) distinguish each published
dimension from the inherited display geometry.

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
cover and launch escape system. All twenty parts can be selected and taken apart.
The adapter and cover come away in an **exhibit arrangement**, not a timed separation sequence.
The launch site, furnished cabin, suits and simulator remain unbuilt. The source model can also produce
standalone CSM and CM stills with `pnpm model apollo-7 --preview <directory>`.

## Structural-station milestone

The aft and forward heat shields now split at the Block II stations in NAA
A-512S ST-428A. The CSM barrel, datum chain, RCS axial station and nominal SPS
extension bounds replace initial estimates; the CM/SM fairing closes the external
connection. See `spacecraft.md` for source units, assumptions and remaining defects.
This is still an exterior reconstruction, with no claim of a completed cabin.

## Pressure-vessel milestone

The bare cabin sidewall now has two source-derived tapers and four measured fixed
window interfaces. Its outer hatch-frame contour is retained as curved data,
without guessing a door from it. The structural cutaway uses the Gallery's existing
shell system. [Pressure-vessel notes](../../vehicles/pressure-vessel.md) describe the
calculations, checks and limits. The nominal aft bulkhead is now a separate spherical
reference surface. The flat forward bulkhead now joins a measured tunnel-entry
interface with an explicitly derived transition. The full tunnel, glazing and
furnishings remain pending.
Its 173-inch radius is explicitly assumed common primary geometry from NASA
TN D-6979, Figure 8, whose inner-wall points independently match the Block II wall.

## Main-console reference milestone

Apollo 7's own panel layout is now identified in NAA V36-976018 revision D,
12 March 1968. A [blank structural reference](../../vehicles/main-console.md)
uses the shared contour from the Smithsonian's processed CM-107 derivative,
explicitly assumed for CM-101. It retains the central notch and stays with the
CM during explosion. Two fixed FDAI interface contours are now retained from the
same processed survey, with their corresponding positions verified against the
CM-101 layout. The instruments remain unbuilt. This is not an equipped console:
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
blank console is masked beneath it. Rear ribs, mounting pockets, keys, display
covers, glazing, labels and electronics remain unbuilt. This is not the complete
machined cover or an equipped DSKY, and does not install the unresolved bare
housing described above.
