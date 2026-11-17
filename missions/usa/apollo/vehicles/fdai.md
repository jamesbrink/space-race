# Apollo 7 flight director attitude indicators — source record

Two **estimated front reconstructions** are now installed at the unchanged fixed
interfaces in [the main-console reference](main-console.md). Their actual round
cases, spherical balls, finite panes, seals, roll scales and paired rate/error
indices are separate geometry. This is not a measured or operable CM-101 instrument.

## Flight-specific arrangement

NAA *Apollo Training: Guidance and Control Systems—Block II, S/C 101*,
**15 September 1967**, printed p. 76, SCS-2100D,
[primary scan](https://www.ibiblio.org/apollo/Documents/ApolloTrainingGuidanceAndControl_09-67.pdf),
shows the round front arrangement, attitude ball, roll ring, pitch/yaw reference
marks and three error/rate scales. Its illustrated attitude is an explanatory
example, not a flight state to reproduce. CM-101 drawing **V36-976018 revision D,
12 March 1968**, identifies the two locations on panels 1 and 2. Neither source supplies a complete dimensioned instrument. The new estimated
layout registration is distinguished from manufactured dimensions below.

## Supplier reference and its applicability limit

R. F. Schuster's Honeywell *SCS Block II Training Manual*, **30 August 1968**,
[primary scan](https://www.ibiblio.org/apollo/Documents/apollo_scs_training_manual_block_ii.pdf),
printed pp. 3-11 and 3-13, identifies two identical **JG264** instruments and a
**4.5-inch ball diameter**. Its preface explicitly says it most closely describes
**spacecraft 103 and subsequent** and that it is not under revision control.
That is documented later type information. Its 4.5-inch diameter is now used as
an **estimated CM-101 scale prior**, cross-checked against the flight-specific
layout proportions; unchanged applicability is not verified.
The cited JG264 technical data sheet TDS 1008 and a flight-applicable mechanical
drawing have not been acquired. A complete instrument cannot be reconstructed
from its ball diameter alone.

## Processed CM-107 source rejected as an instrument model

The Smithsonian panel derivative used for the structural reference also contains
instrument components 535 and 787 after the recorded exact-position weld. The
candidate component does not unambiguously separate ball, glazing, case and
visualization filler. A direct self-clearance check of component 535 reported
224 close/overlapping samples; that is a mesh diagnostic, not a count of actual
hardware defects. It is not imported as a flight instrument, and no sphere fit
or guessed glazing depth is substituted for a manufacturing reference.

## Estimated reconstruction

`console_equipment.py` keeps the ball diameter at 4.5 inches, front envelope at
7 inches and schematic case back at −4.5 inches relative to the console plane.
All three are **estimated for CM-101**. The case section is a visual enclosure
around the ball volume, not a dimensioned mechanical drawing. The ball centre is
−1.5 inches behind the plane; the sphere's rear is −3.75, clear of the schematic
case floor at −4.25. The 2.7-inch rear barrel clears both shared fixed interfaces.
The larger flange begins .1 inch in front of the plane. These dimensions do not
establish the manufactured case, mounting, drives or gimbal clearances.

The front annulus ends at 1.2 inches; the crystal occupies .94–1.00, captured by
an estimated seal between radii 2.25–2.39 at stations .88–1.10. These finite
sections are estimates. The roll scale runs through 360°, with 5° ticks and
30° numbered divisions. The SC101 arrangement supplies three rate/error bars,
with separate opposed indices. All indices are centred for an exhibit reference.
The black/white spherical grid is simplified; its detailed pitch/yaw numbering
and exact printed pattern are not reconstructed. It is not the training plate's
illustrated 14°/34°/330° attitude and is not a recorded Apollo 7 attitude.

No CM-107 instrument mesh, inferred sphere fit, later control markings or texture
is imported. Only the previously verified shared fixed structural interfaces
supply the centres. [Console-equipment notes](console-equipment.md) record the
flight-specific drawing registration, source, confidence and integration checks.

## What is missing

- Verified CM-101 instrument identity/effectivity and mechanical installation drawing.
- Ball centre, case, mounting, glazing, bezel and scale geometry with source units.
- Flight-applicable markings, index/needle arrangement details, materials and lighting.
- Fine ball artwork, calibrated rate/error scales, attitude animation and simulated instrument signals.
