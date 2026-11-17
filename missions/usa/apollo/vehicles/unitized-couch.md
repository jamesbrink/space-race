# Apollo 7 unitized crew couch

`unitized_couch.py` reconstructs the three-place assembly from the Apollo 7
flight-design photograph and CM-101 operating-position plate. **All dimensions
and installation coordinates are estimated for CM-101.** The configuration and
96° seat/back flight position are documented; that does not establish the sizes.
The measured CM-107 couch is **not a valid shared geometry donor for CM-101**.

Drexel and Hunter, *Apollo Experience Report—Command Module Crew-Couch/Restraint
and Load-Attenuation Systems*, NASA TN D-7440 (September 1973), printed pp. 5–6
(PDF pp. 11–12), identifies Apollo 7's **unitized** couch. The redesigned foldable
couch was used on every subsequent crewed Apollo mission. Printed pp. 9–10
(PDF pp. 15–16) describe Apollo 7's common three-person back-support platform,
separate headrests and seat/leg pans, six-point restraint harness and honeycomb
attenuators. Apollo 7 used honeycomb attenuators in all axes; later missions'
X/Z cyclic attenuators must not be copied as shared hardware. A passive heel
restraint replaced the earlier D-ring-operated instep strap just before Apollo 7.

The North American 1967 familiarization plate CS-2025C, June 1967, PDF p. 171
of APC-118, is explicitly labelled **SC 2TV-1 & 101**. Its launch/orbit/entry
seat angle is **96 degrees**. It also shows the 66-degree stowage-access,
170-degree centre-couch egress and 96-degree docking positions. These are couch
operating angles, not a reconstruction of individual astronauts' body poses.

## Earlier unitized-couch dimensions

The SC-012 operations handbook, SM2A-03-SC012, 12 November 1966, section 6.7.3,
printed pp. 6-17–6-19 (PDF pp. 963–965), supplies the following **SC-012** data:

| Component | Source inches | Use for CM-101 |
|---|---:|---|
| Backrest length | 32 | Estimated scale prior; unchanged use unverified |
| Backrest width | 22 | Estimated scale prior; unchanged use unverified |
| Main inboard side beam length | 56 | Estimated scale prior; unchanged use unverified |
| Headrest longitudinal adjustment | 3 | Not modelled; unchanged use unverified |

Figure 6-9, p. 6-15, references NAA V16-531501 for installation, and Figure
6-12, p. 6-20, references V16-531502 for couch operating mechanisms. These are
routes to the original drawings, not newly acquired dimensioned drawings.
The handbook's prefire padding, nylon covers, D-ring foot straps and earlier
configuration are not automatically valid for Apollo 7.

NASA CR-66277, Tewell and Murrish (March 1967), Figure 4, printed p. 107
(PDF p. 115), includes a dimensioned couch **ground-test mockup** for a crew-motion
experiment. It does not establish the flown couch's dimensions; those dimensions
are not adopted. Photographs of NAA V36-310005 mounting-framework sheets were
also inspected, but the available group photograph does not establish the
complete unitized-couch contours or their applicability to CM-101.

## Reconstruction and installation

NASA TN D-7440 Figure 4 (printed p. 5) is the **flight-design** photograph;
Figure 3 on that page is the prototype. The model uses the common box-beam
platform, three headrests, separate seat/leg units, eighteen harness suspension
paths and six passive heel restraints. The seat/leg pan is one continuous rigid
mesh with a knee bend, not a pair of folding pans. Four X, two Z and two Y
attenuator exteriors follow Figure 1's arrangement. Cases, rods and mounting
blocks do not simulate the honeycomb or claim a measured stroke or load.

Figure 1 places heads toward −Zc (the hatch) and feet toward +Zc. In the model's
Blender basis (−Zc, Yc, Xc), heads therefore point toward +X. The SC101 plate's
launch pose fixes the documented 96° angle; its installation pitch and stations
are inferred. The working estimates, retained in source inches, are:

| Quantity | Estimate | Basis/limitation |
|---|---:|---|
| Back pitch above the transverse plane | 12° | SC101 side-view illustration |
| Hip reference (−Zc, Xc) | −5, 32 in | Illustrated cabin installation; not a survey |
| Crew-position Yc centres | −23, 0, +23 in | Three-place photograph; SC012 width prior |
| Back pan / main beam | 32 × 22 / 56 in | SC012 priors above, **estimated for CM-101** |
| Seat support | 18 × 20 in | Flight-design photograph proportions |
| Lower-leg support | 20 × 18 in | Flight-design photograph proportions |
| Foot support | 10 × 16 in | Flight-design photograph proportions |
| Headrest | 9 × 10 in | Flight-design photograph proportions |
| Leg slope / foot slope | 18° down / 75° up | SC101 pose illustration |
| Common frame half-width | 34.5 in | Three-place assembly reconstruction |
| Pan / pad / harness thickness | .375 / 1 / .10 in | Display construction estimates |
| Harness width | 1.5 in | Photographic proportion, not material specification |

The smaller fittings, beam sections, mounting positions, rounded corners,
unoccupied webbing pose and colours are also estimates. The monochrome image
does not establish material colour. Source measurements were sought in the
flight-specific training plate, experience report, earlier handbook and drawing
references above before using photographic reconstruction. Do not transfer this
assembly's estimates into physics, strength, mass or crew-eye calculations.

`CrewCouches` is a separate interior part, whole in cutaway and translated with
the command module during the exploded exhibit. It is absent from the two
coarse LODs. Build checks evaluate the actual vertices against the nominal cabin
wall and spherical floor, and edge intersections against the main-console mesh.
Only finite wall-mount blocks intentionally cross the wall's reference surface;
their dimensions do not imply a reconstructed pressure-wall fitting. The normal
1 mm clearance gate applies to all couch meshes.

## Simplifications and omissions

- Complete manufactured contours, tolerances, joints, fasteners and structural
  sections are unresolved. This is an estimated visual reconstruction.
- The frame is simplified to closed beams; the flight photo's finer brackets,
  perforations, covers and ancillary equipment are incomplete.
- Harness paths show an unoccupied display pose without sewn detailing, complete
  adjusters or a functioning release mechanism.
- Heel-restraint shapes are approximate; no preflight D-ring instep system is used.
- Attenuator internals, passive lockout details, certified travel and dynamics
  are omitted. Later cyclic X/Z attenuators and crew-operated lockouts are excluded.
- No couch-adjustment animation or crew-eye station is supplied.
- Later foldable couch geometry, knee pivots and pip-pin mechanisms are excluded.
