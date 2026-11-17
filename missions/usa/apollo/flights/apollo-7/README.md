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
A structural cutaway exposes the pressure-vessel sidewall inside the thermal shell;
bulkheads and furnishings are unbuilt. No seat control is offered yet.

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
cover and launch escape system. All sixteen parts can be selected and taken apart.
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
calculations, checks and limits. Bulkheads, glazing and furnishings remain pending.
