# Saturn IB SA-205 — exterior study

This build is **SA-205 on Apollo 7**, not an early Saturn I or a later Skylab launcher.
Source: NASA *Apollo 7 press kit*, 68-168K, pp. 31–33 and Figure 25a (printed p. 25a),
and NASA photograph S68-48788, the Apollo 7 launch, viewed at NASA’s Apollo 50th photo gallery.

The script `saturn_ib.py` keeps inches; published feet are multiplied by 12 before geometry
is converted once with `IN`. `flight.ts` quotes the same dimensions with confidence.

| Figure | Source units | Confidence / source |
|---|---:|---|
| Full Apollo 7 stack, engine exit to Q-ball | 224 ft | documented, Figure 25a, rounded |
| S-IB stage length | 80.2 ft | documented, p. 32, rounded |
| Outer tanks | 8 × 70 in diameter | documented, p. 32 |
| Centre oxygen tank | 105 in diameter | documented, p. 32 |
| Tank cluster pitch radius | 93 in | estimated, not a documented tank station |
| S-IVB stage envelope | 58.4 ft | documented, p. 32, rounded |
| S-IVB separation plane, vehicle station | 1187 in | documented, AS-205 flight evaluation Figure A-1, p. 206; rounded |
| Interstage span in this reconstruction | 224.6 in | derived: rounded STA1187 minus rounded S-IB top962.4; not an as-built measurement |
| H-1 nozzle exit inside diameter | 46 in | documented nominal, 1968 Saturn IB News Reference, H-1 fact sheet (PDF p. 45) |
| J-2 nozzle exit inside diameter | 77 in | documented nominal, same reference, J-2 fact sheet (PDF p. 69) |
| IU height / diameter | 36 / 260 in | documented, p. 33 |
| Spacecraft adapter length | 28 ft | documented, p. 26 |
| Adapter aft / forward diameter | 260 / 154 in | documented, p. 26 |

The source describes the S-IB stage as 21.5 ft across while the instrument unit is 260 in;
the first stage’s tank cluster here is 256 in across (2 × (93 + 35)), with its forward ring
at the 260-inch interface. This approximate clustering is **estimated**, not a reconciliation
of the rounded source dimensions. The fins reach beyond the body.

S-IB top is Z962.4 in, S-IVB top Z1663.2, IU top Z1699.2 and adapter top Z2035.2.
These are arithmetic sums of rounded envelopes, not independently documented interface stations.
The S-IVB upper separation plane is now Z1187 in from the mission-specific reference below;
the lower end of the interstage remains at Z962.4 in. Its resulting 224.6-inch span
combines rounded references and must not be read as a tenth-inch inspection measurement.
The SM barrel stands at the adapter’s top; its engine projects inside it. The command-module
base is Z2197.2 in and its nominal forward heat-shield top Z2309.45. The escape motor ends at Z2688 (224 ft).
Its remaining height is allocated within that envelope by estimate. **Closing the overall
length does not validate the individual hardware stations.**

The studio’s exploded view is an illustration. Nothing here claims the timing or trajectories
of the hardware’s departure. No simulator or launch site is provided.

## Simplifications and things still wrong

- Fin profiles, nozzle contours, tank domes, pitch radii and structural stations other than
  the cited separation plane are estimated.
- No tank interior, common bulkhead, detailed feed pipes, turbopumps, H-1 exhaust ducts,
  ullage rockets, vents, detailed APS engines, hold-downs or separation mechanisms.
- Stiffener count and size are estimated. Paint boundaries and lettering locations are estimated
  from S68-48788; the fin paint and small markings still need closer photographic reconstruction.
- IU has no internal electronics, antennas or access fittings.
- Adapter is one closed shell; no hinged forward panels, internal structure or rendezvous target yet.
- No LC-34 pedestal, umbilical tower, service structure or site scenery.
- No mass, thrust, aerodynamic or flight sequence data; the stack cannot be flown yet.

## Corrections after the first preview

The initial four S-IVB conduits were unsourced and lay directly over the USA lettering.
They have been removed, not moved to another guessed azimuth. The actual main and auxiliary
tunnels await their documented layout. The exploded exhibit now separates along the vehicle
axis, with higher parts moving first and farther, so the cover and adjacent modules clear
one another rather than crossing skins on diagonal paths. These offsets are an exhibit
layout, not historical dimensions or separation trajectories.


## Mission-specific fuel-tank paint

SA-205 retains black fuel tanks alternating with white oxygen tanks. The
*Skylab Saturn IB Flight Manual*, MSFC-MAN-206 (30 September 1972), printed
p. 4-4 (PDF p. 60), explicitly says the fuel tanks changed from black to white
on **SA-206 and subsequent** vehicles for thermal reasons. The same page identifies
the alternating outer fuel/oxygen tank arrangement. NASA S68-48788 independently
shows Apollo 7's alternating dark and light tank barrels. The model previously
used the later all-white tank treatment; that is corrected at all detail levels.

This verifies the tank colour assignment, not colourimetry, an exact paint-edge
survey, tank end stations, or absolute clocking relative to the spacecraft.
Those geometric and marking limitations above remain. No Skylab engine thrust
rating or late-vehicle configuration is silently applied to SA-205.

## Mission separation plane and engine exits

The MSFC *Results of the Fifth Saturn IB Launch Vehicle Test Flight AS-205
(Apollo 7 Mission)*, MPR-SAT-FE-68-4, 25 January 1969, Figure A-1, printed
p. 206 (PDF p. 226), explicitly locates the S-IVB separation plane at **vehicle
station 1187 inches**. The drawing prints whole-inch stations. This replaces
the initial unsourced 220-inch interstage partition; it is a station from the
vehicle datum, not 1187 inches above the first stage. The *Saturn IB News
Reference*, changed September 1968, p. 5-1, confirms that the aft interstage
remained attached to the first stage after separation. The gallery's slider
shows individual parts as an exhibit, not a flight sequence.

The same period News Reference has separate engine fact sheets, both marked
changed December 1967. The H-1 sheet (PDF p. 45) gives a **3 ft 10 in ID**
nozzle exit; the J-2 sheet (PDF p. 69) gives **6 ft 5 in ID**. These are inside
diameters, now built as 46 and 77 inches at all detail levels. The original
H-1 opening was only 35.4 inches across and was substantially undersized.

`apollo_csm.BELL_RIM` retains the initial estimated 0.3-inch display rim. The
outer reference radius is derived by adding this inherited rim to the documented
inside radius; no manufactured wall thickness is claimed. Bell contours, nozzle
lengths, throat sizes, chamber shapes, mounting coordinates and engine cant
remain provisional. The published **overall engine** lengths, 102 inches for
H-1 and 133 inches for J-2, are not substituted for nozzle lengths. Source
thrust ratings are not assigned to a simulator.

The H-1 fact sheet explicitly dates the engine uprating to SA-206 and later,
so its pre-uprating hardware reference is appropriate to SA-205. These are
nominal period design figures, not measurements of the individual engines flown.
