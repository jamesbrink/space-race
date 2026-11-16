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

The origin is the service-engine exit plane; CM base is Z264 in and the forward deck Z408 in.
The forward hatch adds 0.7 in above the deck: an estimated detail, not a more precise published height.
The CM afterbody is a conical first study, with five actual openings in its skin, black recesses
and raised frames. The SM has four external RCS quads of four chambers, with hollow nozzle bells.
Panel colouring, window and hatch outlines, stations, seams, nozzle profiles and brackets are all
**estimated**, not dimensioned engineering reconstructions. Overall envelope precision is limited
by the press kit’s rounded dimensions.

## Simplifications and things still wrong

- No cabin, glazing, couches, instruments, astronaut figures or internal equipment.
- CM window shapes are rectangular conical patches, not the finished as-built outlines.
- The side hatch is a patch of skin, without its real sill, hinge or handle; no opening motion.
- No CM attitude-control ports, umbilical fittings, antennas, recovery system or detailed thermal tape.
- No SM tanks, fuel cells, plumbing, gimbal or engine injector.
- Radiator panel layout and barrel/engine split are estimated and need dimensioned drawings.
- No lunar docking probe, lunar module or deployed lunar high-gain antenna is added.
- No mass, thrust or aerodynamic data has been assigned for simulation.

## Launch assembly

The full stack is recorded in `../../vehicles/saturn-ib.md`. The CSM origin in the assembled
model is raised by 1925.2 in so that its barrel meets the adapter at Z2035.2 in.
The boost protective cover is a separate white shell over the CM; its estimated 1.4-inch
radial stand-off prevents coincident surfaces and is not a sourced construction thickness.
The escape tower has four legs, three braced bays, four simplified motor nozzles and a
motor ending at the 224-foot full-stack envelope. Its structure and motor stations are estimates
from Figures 25a–25c. The cover comes aside in the exploded exhibit to reveal the CM.

Additional omissions: cover windows and access hatch, penetrations, thermal seals,
canards, pitch-control and jettison nozzles, detailed tower attachment fittings and abort motion.
