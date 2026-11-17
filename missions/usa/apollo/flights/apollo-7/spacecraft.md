# CSM-101 — Apollo 7 exterior study

Source: NASA *Apollo 7 press kit*, 68-168K, pp. 25–27, Figures 25b and 25d.
The source uses feet and inches. `vehicles/apollo_csm.py` retains inches and multiplies by
`IN` once when producing geometry; `flight.ts` quotes the same published envelopes.

| Figure | Source units | Confidence / source |
|---|---:|---|
| Command module base diameter | 154 in | documented, p. 25, 12 ft 10 in |
| Command module height | 144 in | documented, p. 25, rounded 12 ft |
| Service module diameter | 154 in | documented, p. 25 |
| Service module length | 264 in | documented, p. 25, rounded 22 ft |
| SM barrel length within that envelope | 154 in | estimated from Figure 25b |
| CM top radius | 17 in | estimated from Figure 25d |
| SPS exit radius | 29 in | estimated from Figure 25b |

The origin remains the provisional service-engine exit plane; CM base is Z264 in
and the provisional forward deck Z408 in. The earlier extra 0.7-inch hatch has
been removed; its geometry was not sourced. The resulting CSM study is 408 in
long, **estimated**, and is not an engineering overall station.

The lower CM now uses a nominal aft spherical surface, rounded shoulder and
33° conical wall. See [the shared reconstruction](../../vehicles/command-module.md)
for its sources, calculations and limits. The upper forward cover remains the
original provisional envelope, so the entire capsule must not be described as
an accurate outer mould line yet.

Four side/rendezvous openings use Smithsonian's measured CM-107 outlines,
**assumed shared Block II hardware**, with provenance and limitations in
[the survey record](../../vehicles/reference/README.md). Their reveals are derived
projections between the survey and nominal skin. The hatch's rectangular aperture
is still the original estimate and is explicitly excluded from that survey claim.
The SM still has four external RCS quads of four chambers, with hollow nozzle bells.
Panel colouring, SM stations, seams, nozzle profiles and brackets remain estimated.

## Simplifications and things still wrong

- No cabin, glazing, couches, instruments, astronaut figures or internal equipment.
- Four measured openings have temporary dark closures, not glass. The hatch window
  still has the initial rectangular opening and must be reconstructed as a circular port.
- The side hatch is not yet delineated, without its real sill, hinge or handle; no opening motion.
- No CM attitude-control ports, umbilical fittings, antennas, recovery system or detailed thermal tape.
- No SM tanks, fuel cells, plumbing, gimbal or engine injector.
- Radiator panel layout and barrel/engine split are estimated and need dimensioned drawings.
- No lunar docking probe, lunar module or deployed lunar high-gain antenna is added.
- No mass, thrust or aerodynamic data has been assigned for simulation.

## Launch assembly

The full stack is recorded in `../../vehicles/saturn-ib.md`. The CSM origin in the assembled
model is raised by 1925.2 in so that its barrel meets the adapter at Z2035.2 in.
The boost protective cover remains a provisional fit envelope. Its lower contour now
follows the corrected nominal body, retaining the original estimated 1.4-inch radial
stand-off to prevent interference. This is not a sourced construction thickness or mould line.
The escape tower has four legs, three braced bays, four simplified motor nozzles and a
motor ending at the 224-foot full-stack envelope. Its structure and motor stations are estimates
from Figures 25a–25c. The tower and cover lift as one assembly in the exploded exhibit,
as the cover did with the tower during jettison. The RCS quads stay attached to the SM:
sliding them axially along its skin made their mounts pass through the wall.

The exhibit offsets are chosen presentation distances in metres, not spacecraft dimensions
or a simulation of historical separation trajectories. The tower's provisional lower bay
intersects the provisional CM skin at assembly; this remains a geometry defect to resolve
against dimensioned drawings, not an accurate attachment reconstruction.

Additional omissions: cover windows and access hatch, penetrations, thermal seals,
canards, pitch-control and jettison nozzles, detailed tower attachment fittings and abort motion.

## Shell correction

The SM now has an inward-facing wall and annular edges at the published one-inch shell
thickness (Apollo 7 press kit, p. 26; also Apollo Operations Handbook, Block II, volume 1,
p. 1-49). This replaces the single surface which disappeared from behind in the first
exploded preview. Tankage and internal structure are still pending.
