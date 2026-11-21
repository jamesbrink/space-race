# Lunar Roving Vehicles 1 and 2

Scott and Irwin drove LRV-1 from *Falcon* at Hadley–Apennine. Young and Duke drove LRV-2 from *Orion* at Descartes. The folded vehicle already in each lunar module represents the launch configuration. The separate Gallery exhibit shows the vehicle after the crew unfolded the chassis, raised the seats and fitted the equipment on the Moon. The drive view adds the two astronauts.

## Running gear and crew station

| Measurement | Value | Confidence and source |
| --- | --- | --- |
| Overall length, wheelbase, track | 122, 90, 72 in | Documented vehicle dimensions, Apollo 16 press kit pp. 106–107. Applied to LRV-1 as common hardware, corroborated by the Apollo 15 kit's 7.5-foot wheelbase. |
| Tire outside diameter, width, bump-stop diameter | 32.19, 9, 25.5 in | Documented in the wheel drawing, Apollo 16 press kit p. 110. The drawing gives greater precision than the descriptive text. |
| Ground clearance at rated load | 14 in | Documented, Apollo 16 press kit, vehicle dimensions. The exhibit fixes the centre frame's lower edge at this height. |
| Traction motor | ¼ hp per wheel | Documented, both press kits, mobility subsystem. |
| Battery pair | 36 V, 23 cells each | Documented in both press kits under “Power System.” The Apollo 15 kit gives 115 Ah per battery and the Apollo 16 kit gives 121 Ah. |

The free mesh tire surrounds a spring bump stop. Separate nodes carry the chevrons, rims, drive gear housings and brakes, fenders and stays. Both axles steer and each wheel has independent suspension. Gyro and wheel odometer signals supplied the heading and distance displays. From the left seat the commander worked the T-handle between the two astronauts. Both stations in the exhibit have their own eye point. [Apollo 15 press kit](https://science.nasa.gov/wp-content/uploads/2023/09/Apollo_15-1.pdf) · [Apollo 16 press kit](https://science.nasa.gov/wp-content/uploads/2023/09/Apollo_16.pdf)

LRV-2 carried stiffened seat belts with over-center tightening mechanisms and loops to stow the belts. Covers protected the stowage bags under the seats. The mission report also describes changes to the battery dust covers and the television camera's elevation clutch after Apollo 15. [Apollo 16 Mission Report, Appendix A §A.3.2](https://www.nasa.gov/wp-content/uploads/static/history/alsj/a16/A16_MissionReport.pdf)

## Radio, cameras and geology equipment

| Equipment | Evidence used in the models |
| --- | --- |
| Lunar Communications Relay Unit | The front rack carries the 22 × 16 × 6 in enclosure with its thermal blanket, radiators and connections. The low-gain helical antenna worked during traverses. At a stop the crew aimed the 3 ft high-gain reflector at Earth by sight. The Apollo 16 press kit gives a conflicting metric equivalent. The model uses the imperial dimension, also recorded by the Apollo 15 kit. |
| Ground-Commanded Television Assembly | The color camera head sits on a driven tilt yoke and azimuth pedestal. The nominal camera envelope is 18 × 6.7 × 10 in. The small 16 mm data acquisition camera on the passenger side is a separate film camera. |
| Geology tools | The rear pallet and hand-tool carrier retain the rock rake, tongs, scoop, hammer, extension and core tubes. The 32 in tongs and rake head with 10 in handle follow the geology equipment descriptions. The folded gnomon has a 12 in staff above its gimbal. The self-recording soil penetrometer has a 30 in penetration shaft. |
| Sample collection bags | Irwin identified bag 4 on the right of the LRV-1 carrier while loading it, at 121:08:52. LRV-2 follows the EVA-1 load diagram for the rear bags. The bags and tools changed hands throughout each EVA. |
| LRV-2 portable magnetometer | Its rear equipment includes the three-axis readout, folded sensor tripod and spool for the 50 ft cable. For a reading the sensor stood at least 46 ft from the readout and the rover. |

The mission kits give the camera, antenna and tool dimensions. The flight stowage lists and EVA diagrams give the rack arrangement, camera positions and placement of removable equipment. [Apollo 15 press kit, pp. 69–72 and 97–99](https://science.nasa.gov/wp-content/uploads/2023/09/Apollo_15-1.pdf) · [Apollo 16 press kit, pp. 68 and 119–121](https://science.nasa.gov/wp-content/uploads/2023/09/Apollo_16.pdf) · [Apollo 15 rover stowage list](https://apollojournals.org/alsj/a15/a15.lrvstw.html) · [Apollo 15 loading transcript](https://apollojournals.org/alsj/a15/a15.lrvload.html) · [Apollo 16 Lunar Surface Procedures, fig. 3.5-1](https://www.apollojournals.org/alsj/a16/a16.lsp201.jpg) · [Fig. 3.5-7d, rear stowage](https://www.apollojournals.org/alsj/a16/a16.lsp212.jpg)

## Deployment

Each rover rode folded in quadrant I of its descent stage, its centre frame upright with its forward end down and its underside outboard, both end frames folded back over its seats and its four suspensions turned in. At the landing site it is there to be taken out by hand, on foot, in the handbook's five phases (LRV Operations Handbook, Boeing LS006-002-2H, 19 April 1971, section 1.9.3 and figure 1-39):

| Phase | What the astronaut does | What the rover does | In the model |
| --- | --- | --- | --- |
| I | Takes the insulation blanket off, frees the operating tapes | | The blanket is already off at the site (`unloaded`) |
| II | Pulls the D-handle on the porch | The release pins pull; the push-off spring turns it out about 4 degrees | The start of "Outer tapes" |
| III | Pays out the double braked reel's tape | Turns out on the apex fittings to 15 degrees, then on the walking hinge; the aft frame unlatches and unfolds and its wheels spring out once it is open to some 170 degrees; the forward frame unfolds on its torsion spring and its wheels spring out; the rear wheels come down on the ground | "Outer tapes: let it out" (`LRV_Tilt`, `LRV_Aft`, `LRV_Fore` and the four `LRV_Corner_*`) |
| IV | Pays out the centre braked reel's tape | The forward frame is let down until all four wheels are on the ground, the rear ones on their brakes | "Centre tape: let its front down" (`LRV_Lower`) |
| V | Pulls the saddle release cable | The saddle, the telescopic tubes and the wheel struts let go | "Saddle release" (`LRV_SaddleRelease`'s handle) |

Each is worked by hand from the wheel (Operate), held with W, and each waits for the one before it. Once the saddle is let go the rover stands on its own suspension on the ground under it, and it can be got onto and driven. The record took two to six minutes over phases II to IV, with its stops: Apollo 15 from Irwin's "Released" at 120:14:15 to the forward frame locking at 120:18:34 and the saddle freed at 120:26:44 after it stuck; Apollo 16 from the D-ring at 119:19:15 to "It's on the ground" at 119:25:29; Apollo 17 from 117:26:29 to the rear wheels down at 117:28:15 ([ALSJ: Apollo 15](https://apollojournals.org/alsj/a15/a15.lrvdep.html), [16](https://apollojournals.org/alsj/a16/a16.lrvdep.html), [17](https://apollojournals.org/alsj/a17/a17.lrvdep.html)). Held, the outer tapes take 90 s and the centre tape 40 s: estimated, for a hand on a key.

| Figure | Value | Confidence and source |
| --- | --- | --- |
| Rotation on the apex fittings, then on the walking hinge | 4 degrees by the push-off spring, to 15 on the apex fittings | Documented, LS006-002-2H §1.9.3.2 and .3 |
| Suspension folding | About 135 degrees | Documented, LS006-002-2H §1.3.3 |
| End frames' fold axes | 31 in (forward) and 37 in (aft) over the ground, above the 18.16 in hinge pins | Estimated, so a folded frame lies over the centre one: the hinges' linkage is not modelled |
| Suspension fold pivot | 20 in out from the middle, 18.5 in up | Estimated |
| Where it stands once deployed | Its middle 154.5 in out from the LM's axis along quadrant I's diagonal, its forward end toward the LM | Estimated: its nose a foot outboard of the bay's face (`lrv_deploy.py` `OUT`, quoted as `LANDER_PLACE` in rover-gallery.ts) |
| Its front held up at the end of phase III | 25 degrees | Estimated |
| The angles between phases, and the pivot's path | | Estimated: the handbook gives the stops, not the motion between them |

## Driving

The rover is built to the vehicle contract (tools/blender/vehicles.py): one node, `LRV`, its origin on the ground under the middle of its wheelbase, and its figures in its extras; on foot at the site it is got onto at the driver's seat, on the left, and driven as any vehicle there is (viewer/onfoot/drive.ts), its four wheels steering and riding on their wishbones (viewer/onfoot/suspension.ts) under the Moon's gravity.

| Figure | Value | Confidence and source |
| --- | --- | --- |
| Mass, deployed and empty | 462 lb with its batteries and payload supports | Documented, LS006-002-2H figure 1-1 |
| Payload | 970 lb, its crew among it | Documented, LS006-002-2H §5.1. It is driven as fully loaded |
| Ground clearance | 14 in loaded, 17 in empty | Documented, LS006-002-2H §1.3.3 |
| Spring rate, a wheel | 2,340 N/m | Derived: the 970 lb payload's weight in the Moon's gravity, shared by four wheels, over the 3 in it sat the rover down |
| Dampers | 0.3 of critical | Estimated |
| Bump stop | 10 cm past where it rides | Estimated |
| Steering | Ackermann at both ends, opposed; inner wheel 50 degrees, outer 22; lock to lock 5.5 s; 122 in wall to wall | Documented, LS006-002-2H §1.3.4 |
| Speed | 0 to 14 km/h | Documented, LS006-002-2H §7.1.1 (the nominal sortie's profile) |
| Traction motors | ¼ hp a wheel | Documented, LS006-002-2H §1.3.2 |
| Grip of the wire wheels in the soil | 0.6 of its weight | Estimated: the mobility reports (docs/sources.md) were not read for a figure |
| Rolling loss | 0.08 of its weight | Estimated |
| Hand controller throw | 14 degrees forward, about 12 to the side | Documented forward, LS006-002-2H §1.3.5.1 and figure 1-12; the side read off figure 1-13, estimated |

In a sixth of a g the ground gives its tyres a sixth of what it would on the Earth: it gathers speed and stops in about a metre a second each second, and at speed it cannot turn tighter than the ground holds it across, past which it slides wide of where its wheels point. On its springs, a little over half a cycle a second loaded, it pitches over a crater's rim and leaves the ground over a bump at speed, a wheel or all four, and comes down again on its springs.

## Reconstruction limits

- The stowage is representative of an equipped rover. Sample loads, bags and camera pointing changed from stop to stop. The exhibit's separation directions give access to the hardware and do not reproduce a deployment sequence.
- The driving rig swings each upper and lower wishbone at fixed length and lets the two damper sections telescope. The four-bar radii come from the reconstructed pickup positions. The steering tie changes span at its actuator to follow the knuckle; the actuator travel is estimated.
- Frame sections, hinges, wishbone pickups, dampers, seat and footrest placement, wire counts and gauges, fastener heads, tread thicknesses and panel relief are estimated from the diagrams. The model displays fewer wire strands at lower detail.
- Mesh and boresight, foil seams, cable routes, tool-retention clips and the individual bags' shapes are reconstructed. The radio and camera enclosures have exterior fittings only. The exhibit does not reproduce every interchangeable tool, film magazine or sample bag.
- The deployment's hinges are not the real linkage: the end frames fold about axes put above their hinge pins, the suspensions about a pivot inboard of their wishbones, and the motion between the handbook's stops is a smooth estimate. Folded, the end frames and the wheels pass through the seats and the console, which in the real stowage were folded flat; it shows only inside the bay and while they swing out.
- The saddle, the telescopic tubes, the braked reels and their tapes, the deployment cable and the wheel struts are not modelled: phase V is the release handle's pull. The insulation blanket is already off.
- At the site it is deployed bare: the payload the crew then put on it (the relay unit, the television, the antennas, the tools and the pallet) is not loaded, and is not on it there.
- Its frame heaves, pitches and rolls on four springs as one rigid body, its wheels without mass; its centre of mass is taken at its origin, and nothing tips it over. It is driven fully loaded whoever is aboard, and only the driver sits in it: the passenger's seat is not taken.
- The two seated EVA suits have helmet covers, gold sun visors, chest controls, life-support and oxygen-purge packs. Body placement, equipment outlines, glove posture and commanders' stripes are estimated. The figures carry simplified hoses and overshoes. Their static poses represent riding.
